<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('backup_runs') && Schema::hasColumn('backup_runs', 'sync_target')) {
            Schema::table('backup_runs', function (Blueprint $table) {
                $table->string('sync_target', 512)->nullable()->change();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('backup_runs') && Schema::hasColumn('backup_runs', 'sync_target')) {
            Schema::table('backup_runs', function (Blueprint $table) {
                $table->string('sync_target', 255)->nullable()->change();
            });
        }
    }
};
