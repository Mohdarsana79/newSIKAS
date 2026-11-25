<?php

use App\Config\PermissionCatalog;
use App\Models\Role;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('roles')) {
            return;
        }

        Role::all()->each(function (Role $role) {
            $permissions = is_array($role->permissions) ? $role->permissions : [];
            $modules = is_array($permissions['modules'] ?? null) ? $permissions['modules'] : [];

            if (array_key_exists('data_ptk', $modules)) {
                return;
            }

            if ($role->slug === 'bendahara') {
                $modules['data_ptk'] = PermissionCatalog::LEVEL_WRITE;
            } elseif ($role->slug === 'kepala_sekolah') {
                $modules['data_ptk'] = PermissionCatalog::LEVEL_READ;
            } else {
                $modules['data_ptk'] = $modules['rekening_belanja']
                    ?? $modules['kode_kegiatan']
                    ?? PermissionCatalog::LEVEL_NONE;
            }

            $permissions['modules'] = $modules;
            $role->permissions = $permissions;
            $role->save();
        });
    }

    public function down(): void
    {
        // Tidak menghapus izin agar tidak merusak konfigurasi role yang sudah disesuaikan pengguna.
    }
};
