<?php

namespace App\Http\Middleware;

use App\Config\VariantConfig;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware that detects the budget variant from the route parameter
 * and makes it available throughout the request lifecycle.
 * 
 * Usage in routes:
 *   Route::middleware('variant:kinerja')->group(function () { ... });
 *   Route::middleware('variant:silpa')->group(function () { ... });
 * 
 * Access in controllers:
 *   $variant = app('variant');  // Returns 'reguler', 'kinerja', 'silpa', or 'kinerja_silpa'
 */
class DetectVariant
{
    public function handle(Request $request, Closure $next, string $variant = 'reguler'): Response
    {
        VariantConfig::validateVariant($variant);

        // Make variant available via service container
        app()->instance('variant', $variant);

        // Also merge into request for convenience
        $request->merge(['_variant' => $variant]);

        return $next($request);
    }
}
