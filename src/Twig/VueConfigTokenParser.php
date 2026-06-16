<?php

declare(strict_types=1);

namespace Mediagone\VueInTwigBundle\Twig;

use Twig\Node\Node;
use Twig\Token;
use Twig\TokenParser\AbstractTokenParser;

final class VueConfigTokenParser extends AbstractTokenParser
{
    public function parse(Token $token): Node
    {
        $lineno = $token->getLine();
        $stream = $this->parser->getStream();

        $path = $this->parser->parseExpression();
        $stream->expect(Token::BLOCK_END_TYPE);

        $body = $this->parser->subparse([$this, 'decideEnd']);
        $stream->expect(Token::NAME_TYPE, 'endvue_config');
        $stream->expect(Token::BLOCK_END_TYPE);

        return new VueConfigNode($path, $body, $lineno);
    }

    public function decideEnd(Token $token): bool
    {
        return $token->test('endvue_config');
    }

    public function getTag(): string
    {
        return 'vue_config';
    }
}
