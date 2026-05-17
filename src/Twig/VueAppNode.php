<?php

declare(strict_types=1);

namespace Mediagone\VueInTwigBundle\Twig;

use Twig\Compiler;
use Twig\Node\Node;

final class VueAppNode extends Node
{
    public function __construct(Node $selector, Node $body, int $lineno)
    {
        parent::__construct(['selector' => $selector, 'body' => $body], [], $lineno);
    }

    public function compile(Compiler $compiler): void
    {
        $extFqcn = '\\' . VueInTwigExtension::class;

        $compiler
            ->addDebugInfo($this)
            ->raw('$_vue_ext = $this->env->getExtension(' . $extFqcn . '::class);' . "\n")
            ->raw('$_vue_ext->resetQueue();' . "\n")
            ->raw('$_vue_selector = ')
            ->subcompile($this->getNode('selector'))
            ->raw(";\n")
            ->raw("yield '<script>window.VUE_APP = Vue.createApp({});</script>';\n")
            ->raw("yield \$this->env->render('@VueInTwig/setup.js', \$context);\n")
        ;

        $compiler->subcompile($this->getNode('body'));

        $compiler
            ->raw("foreach (\$_vue_ext->getQueue() as \$_vue_component) {\n")
            ->raw("    \$_vue_twig = '@VueInTwig/' . \$_vue_component . '.vue.twig';\n")
            ->raw("    \$_vue_js   = '@VueInTwig/' . \$_vue_component . '.vue.js';\n")
            ->raw("    if (\$this->env->getLoader()->exists(\$_vue_twig)) {\n")
            ->raw("        yield \$this->env->render(\$_vue_twig, \$context);\n")
            ->raw("    }\n")
            ->raw("    if (\$this->env->getLoader()->exists(\$_vue_js)) {\n")
            ->raw("        yield '<script>' . \$this->env->render(\$_vue_js, \$context) . '</script>';\n")
            ->raw("    }\n")
            ->raw("}\n")
            ->raw("yield '<script>VUE_APP.mount(\"' . \$_vue_selector . '\");</script>';\n")
        ;
    }
}