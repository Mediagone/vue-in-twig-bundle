<?php

declare(strict_types=1);

namespace Mediagone\VueInTwigBundle\Twig;

use Symfony\Component\Routing\Generator\UrlGeneratorInterface;
use Twig\Extension\AbstractExtension;
use Twig\TwigFilter;
use Twig\TwigFunction;

final class VueInTwigExtension extends AbstractExtension
{
    /** @var string[] */
    private array $queue = [];

    /** @var array<string, array<string, array{type: string, value: string}>> */
    private array $configBuffer = [];

    public function __construct(
        private readonly UrlGeneratorInterface $urlGenerator,
        private readonly string $defaultNamespace = '@VueInTwig',
    ) {}

    public function getTokenParsers(): array
    {
        return [
            new VueAppTokenParser(),
            new VueConfigTokenParser(),
        ];
    }

    public function getFilters(): array
    {
        return [
            new TwigFilter('vue_json_encode', $this->vueJsonEncode(...), ['is_safe' => ['html']]),
        ];
    }

    public function getFunctions(): array
    {
        return [
            new TwigFunction('vue_use', $this->vueUse(...)),
            new TwigFunction('vue_path', $this->vuePath(...), ['is_safe' => ['html']]),
            new TwigFunction('vue_config', $this->vueConfig(...)),
        ];
    }

    public function vueJsonEncode(mixed $data): string
    {
        return json_encode(
            $data,
            JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT | JSON_THROW_ON_ERROR
        );
    }

    public function vueUse(string $component): string
    {
        // Explicit namespace (@VueInTwig/…, @App/…) else use the default namespace specified by the app.
        if (!str_starts_with($component, '@')) {
            $component = rtrim($this->defaultNamespace, '/') . '/' . $component;
        }
        if (!in_array($component, $this->queue, true)) {
            $this->queue[] = $component;
        }

        return '';
    }

    public function vuePath(string $route, array $staticParams = [], array $dynamicParams = []): string
    {
        $placeholders = [];
        foreach ($dynamicParams as $key => $_) {
            $placeholders[$key] = '__' . strtoupper($key) . '__';
        }

        $url = $this->urlGenerator->generate($route, array_merge($staticParams, $placeholders));

        $js = "'" . $url . "'";
        foreach ($dynamicParams as $key => $expression) {
            $js .= ".replace('" . $placeholders[$key] . "', " . $expression . ')';
        }

        return $js;
    }

    public function vueConfig(string $path, mixed $data): string
    {
        $json = json_encode($data, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT | JSON_THROW_ON_ERROR);
        [$root, $key] = str_contains($path, '.') ? explode('.', $path, 2) : [$path, ''];
        $this->configBuffer[$root][$key] = ['type' => 'json', 'value' => $json];
        return '';
    }

    public function addConfigRaw(string $path, string $js): void
    {
        [$root, $key] = str_contains($path, '.') ? explode('.', $path, 2) : [$path, ''];
        $this->configBuffer[$root][$key] = ['type' => 'raw', 'value' => $js];
    }

    public function flushConfigs(): string
    {
        if (empty($this->configBuffer)) {
            return '';
        }

        $output = "<script>\n";
        foreach ($this->configBuffer as $root => $entries) {
            if (array_key_exists('', $entries)) {
                $entry = $entries[''];
                $output .= "VUE_CONFIG.{$root} = {$entry['value']};\n";
            } else {
                $output .= "VUE_CONFIG.{$root} = {\n";
                $keys = array_keys($entries);
                $lastKey = end($keys);
                foreach ($entries as $key => $entry) {
                    $comma = ($key !== $lastKey) ? ',' : '';
                    $output .= "    {$key}: {$entry['value']}{$comma}\n";
                }
                $output .= "};\n";
            }
        }
        $output .= '</script>';

        $this->configBuffer = [];
        return $output;
    }

    public function resetQueue(): void
    {
        $this->queue = [];
        $this->configBuffer = [];
    }

    public function getQueue(): array
    {
        return $this->queue;
    }
}