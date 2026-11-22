<?php

namespace App\Http\Middleware;

use App\Config\PermissionCatalog;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnforceModulePermissions
{
    /**
     * Menegakkan hak akses modul dan kemampuan khusus per pengguna secara terpusat.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        $route = $request->route();
        $routeName = $route?->getName();
        $spjTemplateType = is_string($route?->parameter('type')) ? $route->parameter('type') : null;
        $requirement = PermissionCatalog::resolveRouteRequirement($routeName, $request->method(), $spjTemplateType);

        if ($requirement === null) {
            return $next($request);
        }

        if (isset($requirement['ability'])) {
            $ability = $requirement['ability'];
            $allowed = match ($ability) {
                'rkas_review_or_penganggaran_write' => $user->hasFeatureAbility('rkas_review')
                    || $user->canAccessModule('penganggaran', PermissionCatalog::LEVEL_WRITE),
                default => $user->hasFeatureAbility($ability),
            };

            if (! $allowed) {
                abort(403, 'Akses ditolak. Peran Anda tidak memiliki izin untuk aksi khusus ini.');
            }

            return $next($request);
        }

        $module = $requirement['module'] ?? '';
        $level = $requirement['level'] ?? PermissionCatalog::LEVEL_READ;

        if ($module !== '' && ! $user->canAccessModule($module, $level)) {
            $message = $level === PermissionCatalog::LEVEL_WRITE
                ? 'Akses ditolak. Akun Anda tidak memiliki hak kelola (tulis) untuk fitur ini.'
                : 'Akses ditolak. Akun Anda tidak memiliki izin untuk membuka fitur ini.';

            abort(403, $message);
        }

        return $next($request);
    }
}
