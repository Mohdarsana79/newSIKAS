<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('bku_audit_logs')) {
            Schema::table('bku_audit_logs', function (Blueprint $table) {
                if (! Schema::hasColumn('bku_audit_logs', 'tab_type')) {
                    $table->string('tab_type', 30)->default('reg')->after('variant');
                }
                if (! Schema::hasColumn('bku_audit_logs', 'periode_type')) {
                    $table->string('periode_type', 20)->default('bulanan')->after('tahun');
                }
                if (! Schema::hasColumn('bku_audit_logs', 'periode_key')) {
                    $table->string('periode_key', 30)->default('januari')->after('periode_type');
                }
                if (Schema::hasColumn('bku_audit_logs', 'bulan_angka')) {
                    $table->smallInteger('bulan_angka')->nullable()->change();
                }
                if (Schema::hasColumn('bku_audit_logs', 'bulan')) {
                    $table->string('bulan', 20)->nullable()->change();
                }

                $table->index(['variant', 'tahun', 'tab_type', 'periode_type', 'periode_key', 'penganggaran_id'], 'idx_bku_audit_logs_tab_scope');
            });

            // Update existing rows so periode_key matches their lowercased bulan
            DB::table('bku_audit_logs')->where('tab_type', 'reg')->update([
                'periode_key' => DB::raw("LOWER(COALESCE(bulan, 'januari'))"),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('bku_audit_logs')) {
            Schema::table('bku_audit_logs', function (Blueprint $table) {
                $table->dropIndex('idx_bku_audit_logs_tab_scope');
                $table->dropColumn(['tab_type', 'periode_type', 'periode_key']);
            });
        }
    }
};
