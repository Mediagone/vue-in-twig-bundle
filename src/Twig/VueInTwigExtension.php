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

    public function __construct(
        private readonly UrlGeneratorInterface $urlGenerator,
        private readonly string $defaultNamespace = '@VueInTwig',
    ) {}

    public function getTokenParsers(): array
    {
        return [new VueAppTokenParser()];
    }

    public function getFilters(): array
    {
        return [
            new TwigFilter('vue_props_encode', $this->vuePropsEncode(...), ['is_safe' => ['html']]),
        ];
    }

    public function getFunctions(): array
    {
        return [
            new TwigFunction('vue_use', $this->vueUse(...)),
            new TwigFunction('vue_path', $this->vuePath(...), ['is_safe' => ['html']]),
        ];
    }

    public function vuePropsEncode(mixed $data): string
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

    public function resetQueue(): void
    {
        $this->queue = [];
    }

    public function getQueue(): array
    {
        return $this->queue;
    }
}