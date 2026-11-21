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

        foreach (['bendahara', 'kepala_sekolah'] as $slug) {
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
            if (! array_key_exists('poster_transparansi', $modules)) {
                $modules['poster_transparansi'] = PermissionCatalog::LEVEL_READ;
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

            if (array_key_exists('poster_transparansi', $permissions['modules'])) {
                unset($permissions['modules']['poster_transparansi']);

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
