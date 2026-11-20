<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Vite;
use Symfony\Component\HttpFoundation\Response;

class ResolveViteHotAssetMode
{
    /**
     * Memastikan akses melalui ngrok, domain publik, IP LAN, atau environment produksi
     * otomatis memakai aset terkompilasi (public/build) ketika tersedia, meskipun
     * file public/hot dari `npm run dev` sedang ada di mesin pengembang.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $buildManifest = public_path('build/manifest.json');
        $defaultHotFile = public_path('hot');

        if (is_file($buildManifest) && is_file($defaultHotFile) && $this->shouldBypassHotFile($request)) {
            Vite::useHotFile(storage_path('framework/vite.hot.disabled'));
        } else {
            Vite::useHotFile($defaultHotFile);
        }

        return $next($request);
    }

    protected function shouldBypassHotFile(Request $request): bool
    {
        if (! app()->environment('local')) {
            return true;
        }

        if ($request->isSecure()) {
            return true;
        }

        $host = strtolower(trim((string) $request->getHost(), '[]'));

        return ! in_array($host, ['localhost', '127.0.0.1', '::1'], true);
    }
}
