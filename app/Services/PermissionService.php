<?php

namespace App\Services;

use App\Config\PermissionCatalog;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;

class PermissionService
{
    /**
     * Cache sederhana per request untuk menghindari kueri berulang ke tabel roles.
     *
     * @var Collection<string, Role>|null
     */
    protected ?Collection $cachedRolesBySlug = null;

    public function clearCache(): void
    {
        $this->cachedRolesBySlug = null;
    }

    /**
     * Pastikan role sistem bawaan tersedia (aman dipanggil kapan saja).
     */
    public function ensureDefaultRolesExist(): void
    {
        if (! $this->rolesTableReady()) {
            return;
        }

        $defaults = [
            'bendahara' => [
                'name' => 'Bendahara / Admin',
                'description' => 'Pengelola utama anggaran, penatausahaan, sistem, serta manajemen pengguna & role.',
            ],
            'kepala_sekolah' => [
                'name' => 'Kepala Sekolah',
                'description' => 'Akses baca anggaran & laporan serta kewenangan menelaah dan mengesahkan RKAS.',
            ],
        ];

        $inserted = false;
        foreach ($defaults as $slug => $meta) {
            if (! Role::where('slug', $slug)->exists()) {
                Role::create([
                    'slug' => $slug,
                    'name' => $meta['name'],
                    'description' => $meta['description'],
                    'is_system' => true,
                    'permissions' => PermissionCatalog::defaultPermissionsForRole($slug),
                ]);
                $inserted = true;
            }
        }

        if ($inserted) {
            $this->clearCache();
        }
    }

    /**
     * @return Collection<int, Role>
     */
    public function getAllRoles(): Collection
    {
        if (! $this->rolesTableReady()) {
            return collect();
        }

        $this->ensureDefaultRolesExist();

        return Role::orderByDesc('is_system')->orderBy('id')->get();
    }

    public function getRoleBySlug(string $slug): ?Role
    {
        if (! $this->rolesTableReady()) {
            return null;
        }

        if ($this->cachedRolesBySlug === null) {
            $this->ensureDefaultRolesExist();
            $this->cachedRolesBySlug = Role::all()->keyBy('slug');
        }

        return $this->cachedRolesBySlug->get($slug);
    }

    /**
     * Resolusi hak akses efektif untuk seorang pengguna (izin role + override khusus per user).
     *
     * @return array{
     *   role_slug: string,
     *   role_name: string,
     *   has_custom_override: bool,
     *   modules: array<string, string>,
     *   abilities: array<string, bool>
     * }
     */
    public function resolveForUser(User $user): array
    {
        $slug = $user->role ?: 'bendahara';
        $roleModel = $this->getRoleBySlug($slug);

        $basePermissions = $roleModel && is_array($roleModel->permissions)
            ? $roleModel->permissions
            : PermissionCatalog::defaultPermissionsForRole($slug);

        $normalized = PermissionCatalog::normalizePermissions(
            $basePermissions,
            $slug === 'bendahara'
        );

        $roleName = $roleModel?->name ?? ($slug === 'kepala_sekolah' ? 'Kepala Sekolah' : 'Bendahara / Admin');

        $custom = is_array($user->custom_permissions) ? $user->custom_permissions : null;
        $hasOverride = false;

        if ($custom !== null) {
            if (is_array($custom['modules'] ?? null)) {
                foreach ($custom['modules'] as $modKey => $level) {
                    if (array_key_exists($modKey, $normalized['modules'])
                        && in_array($level, [PermissionCatalog::LEVEL_NONE, PermissionCatalog::LEVEL_READ, PermissionCatalog::LEVEL_WRITE], true)) {
                        $normalized['modules'][$modKey] = $level;
                        $hasOverride = true;
                    }
                }
            }
            if (is_array($custom['abilities'] ?? null)) {
                foreach ($custom['abilities'] as $abilityKey => $allowed) {
                    if (array_key_exists($abilityKey, $normalized['abilities'])) {
                        $normalized['abilities'][$abilityKey] = (bool) $allowed;
                        $hasOverride = true;
                    }
                }
            }

            if ($slug === 'bendahara') {
                $normalized['modules']['user_management'] = PermissionCatalog::LEVEL_WRITE;
            }
        }

        return [
            'role_slug' => $slug,
            'role_name' => $roleName,
            'has_custom_override' => $hasOverride,
            'modules' => $normalized['modules'],
            'abilities' => $normalized['abilities'],
        ];
    }

    public function canAccessModule(User $user, string $module, string $requiredLevel = PermissionCatalog::LEVEL_READ): bool
    {
        $resolved = $this->resolveForUser($user);
        $userLevel = $resolved['modules'][$module] ?? PermissionCatalog::LEVEL_NONE;

        return $this->levelRank($userLevel) >= $this->levelRank($requiredLevel);
    }

    public function hasAbility(User $user, string $ability): bool
    {
        $resolved = $this->resolveForUser($user);

        return (bool) ($resolved['abilities'][$ability] ?? false);
    }

    protected function levelRank(string $level): int
    {
        return match ($level) {
            PermissionCatalog::LEVEL_WRITE => 2,
            PermissionCatalog::LEVEL_READ => 1,
            default => 0,
        };
    }

    protected function rolesTableReady(): bool
    {
        try {
            return Schema::hasTable('roles');
        } catch (\Throwable) {
            return false;
        }
    }
}
