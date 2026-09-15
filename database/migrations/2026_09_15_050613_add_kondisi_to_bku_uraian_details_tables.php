<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $tables = [
            'buku_kas_umum_uraian_details',
            'kinerja_buku_kas_umum_uraian_details',
            'silpa_buku_kas_umum_uraian_details',
            'kinerja_silpa_buku_kas_umum_uraian_details'
        ];

        foreach ($tables as $table) {
            if (Schema::hasTable($table)) {
                Schema::table($table, function (Blueprint $table) {
                    $table->string('kondisi')->nullable()->default('Baik');
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $tables = [
            'buku_kas_umum_uraian_details',
            'kinerja_buku_kas_umum_uraian_details',
            'silpa_buku_kas_umum_uraian_details',
            'kinerja_silpa_buku_kas_umum_uraian_details'
        ];

        foreach ($tables as $table) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'kondisi')) {
                Schema::table($table, function (Blueprint $table) {
                    $table->dropColumn('kondisi');
                });
            }
        }
    }
};
