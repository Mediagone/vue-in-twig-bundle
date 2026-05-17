<?php

declare(strict_types=1);

namespace Mediagone\VueInTwigBundle;

use Mediagone\VueInTwigBundle\Twig\VueInTwigExtension;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\DependencyInjection\Extension\PrependExtensionInterface;
use Symfony\Component\DependencyInjection\Loader\Configurator\ContainerConfigurator;
use Symfony\Component\HttpKernel\Bundle\AbstractBundle;

final class VueInTwigBundle extends AbstractBundle implements PrependExtensionInterface
{
    public function prepend(ContainerBuilder $container): void
    {
        $container->prependExtensionConfig('twig', [
            'paths' => [__DIR__ . '/../templates' => 'VueInTwig'],
        ]);
    }

    public function loadExtension(array $config, ContainerConfigurator $container, ContainerBuilder $builder): void
    {
        $container->services()
            ->set(VueInTwigExtension::class)
            ->autowire()
            ->tag('twig.extension');
    }
}