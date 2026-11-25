<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('backup_settings')) {
            Schema::create('backup_settings', function (Blueprint $table) {
                $table->id();
                $table->boolean('is_enabled')->default(false);
                $table->string('frequency', 20)->default('daily');
                $table->string('scheduled_time', 5)->default('22:00');
                $table->unsignedTinyInteger('day_of_week')->default(0);
                $table->unsignedTinyInteger('day_of_month')->default(1);

                $table->boolean('retention_enabled')->default(true);
                $table->unsignedSmallInteger('retention_max_files')->default(14);
                $table->unsignedSmallInteger('retention_max_days')->nullable()->default(30);

                $table->string('sync_mode', 32)->default('none');
                $table->string('local_sync_path', 500)->nullable();
                $table->boolean('sync_apply_retention')->default(true);
                $table->string('gdrive_folder_id', 255)->nullable();
                $table->string('gdrive_client_id', 255)->nullable();
                $table->text('gdrive_client_secret')->nullable();
                $table->text('gdrive_refresh_token')->nullable();

                $table->timestamp('last_run_at')->nullable();
                $table->string('last_run_status', 20)->nullable();
                $table->text('last_run_message')->nullable();
                $table->string('last_backup_file', 255)->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('backup_runs')) {
            Schema::create('backup_runs', function (Blueprint $table) {
                $table->id();
                $table->string('trigger', 32)->default('scheduled');
                $table->string('status', 20);
                $table->string('file_name', 255)->nullable();
                $table->unsignedBigInteger('file_size_bytes')->nullable();
                $table->unsignedInteger('pruned_count')->default(0);
                $table->string('sync_mode', 32)->default('none');
                $table->string('sync_status', 20)->default('skipped');
                $table->string('sync_target', 255)->nullable();
                $table->text('message');
                $table->timestamp('started_at')->nullable();
                $table->timestamp('finished_at')->nullable();
                $table->timestamp('created_at')->useCurrent();

                $table->index(['created_at'], 'backup_runs_created_at_idx');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('backup_runs');
        Schema::dropIfExists('backup_settings');
    }
};
