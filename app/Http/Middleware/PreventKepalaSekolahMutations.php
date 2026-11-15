<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PreventKepalaSekolahMutations
{
    /**
     * Whitelist of route names or name patterns that Kepala Sekolah is permitted to execute (mutations).
     */
    protected array $allowedRouteNames = [
        'logout',
        'password.update',
        'profile.update',
        'rkas-review.store',
        'rkas-review.destroy',
        'penganggaran.approve',
        'penganggaran.unapprove',
        'rkas.ai-executive-review',
    ];

    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->isKepalaSekolah()) {
            $method = strtoupper($request->method());

            if (in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
                $routeName = $request->route() ? $request->route()->getName() : '';

                // Check if route matches any allowed pattern (supporting variant prefixes like 'kinerja-')
                $isAllowed = false;
                foreach ($this->allowedRouteNames as $allowed) {
                    if ($routeName === $allowed || str_ends_with($routeName, '.'.$allowed) || str_ends_with($routeName, '-'.$allowed)) {
                        $isAllowed = true;
                        break;
                    }
                }

                if (! $isAllowed) {
                    abort(403, 'Akses ditolak. Akun Kepala Sekolah hanya memiliki akses Baca (Read-Only) dan tidak dapat memodifikasi data operasional.');
                }
            }
        }

        return $next($request);
    }
}
