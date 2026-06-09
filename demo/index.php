<?php

declare(strict_types=1);

$autoload = __DIR__ . '/../vendor/autoload.php';
if (!file_exists($autoload)) {
    http_response_code(500);
    echo '<pre>ERROR: vendor/autoload.php not found. Run: composer install</pre>';
    exit(1);
}
require_once $autoload;

use Mediagone\VueInTwigBundle\Twig\VueInTwigExtension;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;
use Symfony\Component\Routing\RequestContext;
use Twig\Environment;
use Twig\Loader\FilesystemLoader;

$urlGenerator = new class implements UrlGeneratorInterface {
    public function setContext(RequestContext $context): void {}
    public function getContext(): RequestContext { return new RequestContext(); }
    public function generate(string $name, array $parameters = [], int $referenceType = self::ABSOLUTE_PATH): string {
        $query = !empty($parameters) ? '?' . http_build_query($parameters) : '';
        return '/demo/' . $name . $query;
    }
};

// Placeholder image for ImageCropper demo (requires a data URL, not a regular URL)
$cropperDataUrl = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; // 1x1 fallback
if (function_exists('imagecreatetruecolor')) {
    $img = imagecreatetruecolor(300, 150);
    imagefill($img, 0, 0, imagecolorallocate($img, 100, 149, 237));
    ob_start(); imagepng($img); imagedestroy($img);
    $cropperDataUrl = 'data:image/png;base64,' . base64_encode(ob_get_clean());
}

// Serve static files (CSS, images, etc.) directly when using php -S
if (PHP_SAPI === 'cli-server') {
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
    $file = getcwd() . $path;
    if (is_file($file) && !str_ends_with($file, '.php')) {
        return false;
    }
}

$loader = new FilesystemLoader([__DIR__]);
$loader->addPath(__DIR__ . '/../templates', 'VueInTwig');

$twig = new Environment($loader, ['cache' => false, 'debug' => true]);
$twig->addExtension(new VueInTwigExtension($urlGenerator));

try {
    echo $twig->render('demo.html.twig', ['cropperDataUrl' => $cropperDataUrl]);
} catch (\Throwable $e) {
    http_response_code(500);
    echo '<pre style="color:red;padding:1rem">' . htmlspecialchars($e::class . ': ' . $e->getMessage() . "\n\n" . $e->getTraceAsString()) . '</pre>';
}
