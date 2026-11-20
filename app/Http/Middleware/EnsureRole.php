<?php

namespace App\Http\Middleware;

use App\Config\PermissionCatalog;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRole
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     * @param  string  ...$roles
     */
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            return redirect()->route('login');
        }

        $routeName = $request->route()?->getName();
        $requirement = PermissionCatalog::resolveRouteRequirement($routeName, $request->method());

        if ($requirement !== null && isset($requirement['module'])) {
            $level = $requirement['level'] ?? PermissionCatalog::LEVEL_READ;
            if ($user->canAccessModule($requirement['module'], $level)) {
                return $next($request);
            }

            if ($request->expectsJson() || $request->header('X-Inertia')) {
                abort(403, 'Akses ditolak. Akun Anda tidak memiliki izin untuk fitur ini.');
            }

            abort(403, 'Akses ditolak. Anda tidak memiliki izin untuk mengakses halaman ini.');
        }

        $userRole = $user->role ?? 'bendahara';

        if (! in_array($userRole, $roles, true)) {
            if ($request->expectsJson() || $request->header('X-Inertia')) {
                abort(403, 'Akses ditolak. Peran Anda ('.ucwords(str_replace('_', ' ', $userRole)).') tidak memiliki izin untuk aksi ini.');
            }

            abort(403, 'Akses ditolak. Anda tidak memiliki izin untuk mengakses halaman ini.');
        }

        return $next($request);
    }
}
