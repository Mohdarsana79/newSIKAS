<?php

use App\Http\Middleware\CheckNpsnLicense;
use App\Http\Middleware\DetectVariant;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;

$app = Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',

    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
            CheckNpsnLicense::class,
        ]);

        $middleware->alias([
            'variant' => DetectVariant::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();

// Deteksi folder konfigurasi aman (C:\ProgramData\SIKAS\.env)
if (! $app->runningUnitTests()) {
    $programData = getenv('ProgramData') ?: ($_SERVER['ProgramData'] ?? 'C:\ProgramData');
    $secureDir = rtrim($programData, '\\/').DIRECTORY_SEPARATOR.'SIKAS';

    if (file_exists($secureDir.DIRECTORY_SEPARATOR.'.env')) {
        $app->useEnvironmentPath($secureDir);
    }
}

return $app;
