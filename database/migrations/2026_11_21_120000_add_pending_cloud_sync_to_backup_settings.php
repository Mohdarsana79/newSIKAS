<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('backup_settings')) {
            return;
        }

        Schema::table('backup_settings', function (Blueprint $table) {
            if (! Schema::hasColumn('backup_settings', 'pending_cloud_file')) {
                $table->string('pending_cloud_file', 255)->nullable()->after('last_backup_file');
            }
            if (! Schema::hasColumn('backup_settings', 'pending_cloud_path')) {
                $table->string('pending_cloud_path', 500)->nullable()->after('pending_cloud_file');
            }
            if (! Schema::hasColumn('backup_settings', 'pending_cloud_run_id')) {
                $table->unsignedBigInteger('pending_cloud_run_id')->nullable()->after('pending_cloud_path');
            }
            if (! Schema::hasColumn('backup_settings', 'pending_cloud_retry_at')) {
                $table->timestamp('pending_cloud_retry_at')->nullable()->after('pending_cloud_run_id');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('backup_settings')) {
            return;
        }

        $columns = array_values(array_filter([
            'pending_cloud_file',
            'pending_cloud_path',
            'pending_cloud_run_id',
            'pending_cloud_retry_at',
        ], fn (string $col): bool => Schema::hasColumn('backup_settings', $col)));

        if ($columns !== []) {
            Schema::table('backup_settings', function (Blueprint $table) use ($columns) {
                $table->dropColumn($columns);
            });
        }
    }
};
