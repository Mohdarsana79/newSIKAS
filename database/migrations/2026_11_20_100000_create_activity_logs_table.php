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
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->string('actor_name', 150);
            $table->string('actor_username', 150)->nullable();
            $table->string('actor_role', 64)->nullable();
            $table->string('module', 64);
            $table->string('variant', 32)->nullable();
            $table->string('action', 64);
            $table->string('severity', 16)->default('info');
            $table->text('description');
            $table->string('route_name', 150)->nullable();
            $table->string('http_method', 12)->nullable();
            $table->string('url_path', 255)->nullable();
            $table->unsignedSmallInteger('status_code')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 512)->nullable();
            $table->jsonb('metadata')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['created_at'], 'activity_logs_created_at_idx');
            $table->index(['module', 'created_at'], 'activity_logs_module_created_idx');
            $table->index(['user_id', 'created_at'], 'activity_logs_user_created_idx');
            $table->index(['action', 'created_at'], 'activity_logs_action_created_idx');
            $table->index(['variant', 'created_at'], 'activity_logs_variant_created_idx');
            $table->index(['severity', 'created_at'], 'activity_logs_severity_created_idx');
        });

        // Backfill izin modul activity_logs untuk role sistem yang sudah ada di database.
        if (Schema::hasTable('roles')) {
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
                if (! array_key_exists('activity_logs', $modules)) {
                    $modules['activity_logs'] = $level;
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
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
