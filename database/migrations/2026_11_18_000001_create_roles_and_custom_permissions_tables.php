<?php

use App\Config\PermissionCatalog;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->boolean('is_system')->default(false);
            $table->json('permissions');
            $table->timestamps();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->json('custom_permissions')->nullable()->after('role');
        });

        $now = now();
        DB::table('roles')->insert([
            [
                'slug' => 'bendahara',
                'name' => 'Bendahara / Admin',
                'description' => 'Pengelola utama anggaran, penatausahaan, sistem, serta manajemen pengguna & role.',
                'is_system' => true,
                'permissions' => json_encode(PermissionCatalog::defaultPermissionsForRole('bendahara')),
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'slug' => 'kepala_sekolah',
                'name' => 'Kepala Sekolah',
                'description' => 'Akses baca anggaran & laporan serta kewenangan menelaah dan mengesahkan RKAS.',
                'is_system' => true,
                'permissions' => json_encode(PermissionCatalog::defaultPermissionsForRole('kepala_sekolah')),
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('custom_permissions');
        });

        Schema::dropIfExists('roles');
    }
};
