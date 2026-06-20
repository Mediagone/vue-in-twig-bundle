<?php

declare(strict_types=1);

namespace Mediagone\VueInTwigBundle\Twig;

use Twig\Compiler;
use Twig\Node\Node;

final class VueUseNode extends Node
{
    public function __construct(Node $path, int $lineno)
    {
        parent::__construct(['path' => $path], [], $lineno);
    }

    public function compile(Compiler $compiler): void
    {
        $extFqcn = '\\' . VueInTwigExtension::class;

        $compiler
            ->addDebugInfo($this)
            ->raw('$this->env->getExtension(' . $extFqcn . '::class)->vueUse(')
            ->subcompile($this->getNode('path'))
            ->raw(");\n")
        ;
    }
}
