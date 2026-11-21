<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('backup_settings', function (Blueprint $table) {
            $table->string('pending_cloud_file', 255)->nullable()->after('last_backup_file');
            $table->string('pending_cloud_path', 500)->nullable()->after('pending_cloud_file');
            $table->unsignedBigInteger('pending_cloud_run_id')->nullable()->after('pending_cloud_path');
            $table->timestamp('pending_cloud_retry_at')->nullable()->after('pending_cloud_run_id');
        });
    }

    public function down(): void
    {
        Schema::table('backup_settings', function (Blueprint $table) {
            $table->dropColumn([
                'pending_cloud_file',
                'pending_cloud_path',
                'pending_cloud_run_id',
                'pending_cloud_retry_at',
            ]);
        });
    }
};
