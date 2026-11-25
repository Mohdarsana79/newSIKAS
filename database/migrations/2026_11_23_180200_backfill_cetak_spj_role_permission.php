<?php

use App\Config\PermissionCatalog;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('roles')) {
            return;
        }

        $defaults = [
            'bendahara' => PermissionCatalog::LEVEL_WRITE,
            'kepala_sekolah' => PermissionCatalog::LEVEL_READ,
        ];

        foreach ($defaults as $slug => $level) {
            $role = DB::table('roles')->where('slug', $slug)->first();
            if (! $role) {
                continue;
            }

            $permissions = is_string($role->permissions)
                ? json_decode($role->permissions, true)
                : (is_array($role->permissions) ? $role->permissions : []);

            if (! is_array($permissions)) {
                $permissions = [];
            }

            $modules = is_array($permissions['modules'] ?? null) ? $permissions['modules'] : [];
            if (! array_key_exists('cetak_spj', $modules)) {
                $modules['cetak_spj'] = $level;
                $permissions['modules'] = $modules;

                DB::table('roles')
                    ->where('id', $role->id)
                    ->update([
                        'permissions' => json_encode($permissions),
                        'updated_at' => now(),
                    ]);
            }
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('roles')) {
            return;
        }

        foreach (['bendahara', 'kepala_sekolah'] as $slug) {
            $role = DB::table('roles')->where('slug', $slug)->first();
            if (! $role) {
                continue;
            }

            $permissions = is_string($role->permissions)
                ? json_decode($role->permissions, true)
                : (is_array($role->permissions) ? $role->permissions : []);

            if (! is_array($permissions) || ! is_array($permissions['modules'] ?? null)) {
                continue;
            }

            if (array_key_exists('cetak_spj', $permissions['modules'])) {
                unset($permissions['modules']['cetak_spj']);

                DB::table('roles')
                    ->where('id', $role->id)
                    ->update([
                        'permissions' => json_encode($permissions),
                        'updated_at' => now(),
                    ]);
            }
        }
    }
};
