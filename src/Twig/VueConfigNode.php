<?php

declare(strict_types=1);

namespace Mediagone\VueInTwigBundle\Twig;

use Twig\Compiler;
use Twig\Node\Node;

final class VueConfigNode extends Node
{
    public function __construct(Node $path, Node $body, int $lineno)
    {
        parent::__construct(['path' => $path, 'body' => $body], [], $lineno);
    }

    public function compile(Compiler $compiler): void
    {
        $extFqcn = '\\' . VueInTwigExtension::class;

        $compiler
            ->addDebugInfo($this)
            ->raw('$_vue_ext = $this->env->getExtension(' . $extFqcn . '::class);' . "\n")
            ->raw('$_vue_config_path = ')
            ->subcompile($this->getNode('path'))
            ->raw(";\n")
            ->raw('$_vue_config_fn = function() use ($context, $blocks) {' . "\n")
        ;

        $compiler->subcompile($this->getNode('body'));

        $compiler
            ->raw('};' . "\n")
            ->raw('$_vue_config_parts = [];' . "\n")
            ->raw('foreach ($_vue_config_fn() as $_vue_config_piece) { $_vue_config_parts[] = $_vue_config_piece; }' . "\n")
            ->raw('$_vue_ext->addConfigRaw($_vue_config_path, trim(implode(\'\', $_vue_config_parts)));' . "\n")
        ;
    }
}
