<?php

declare(strict_types=1);

namespace Mediagone\VueInTwigBundle\Twig;

use Twig\Node\Node;
use Twig\Token;
use Twig\TokenParser\AbstractTokenParser;

final class VueUseTokenParser extends AbstractTokenParser
{
    public function parse(Token $token): Node
    {
        $lineno = $token->getLine();
        $path = $this->parser->parseExpression();
        $this->parser->getStream()->expect(Token::BLOCK_END_TYPE);

        return new VueUseNode($path, $lineno);
    }

    public function getTag(): string
    {
        return 'vue_use';
    }
}
