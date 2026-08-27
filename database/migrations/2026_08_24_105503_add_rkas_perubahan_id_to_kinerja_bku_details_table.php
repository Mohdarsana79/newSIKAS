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
        Schema::table('kinerja_buku_kas_umum_uraian_details', function (Blueprint $table) {
            $table->unsignedBigInteger('kinerja_rkas_perubahan_id')->nullable()->after('kinerja_rkas_id');
        });

        // Data Migration: Pindahkan ID Tahap 2 dari kinerja_rkas_id ke kinerja_rkas_perubahan_id
        // berdasarkan tanggal transaksi BKU (Bulan Juli ke atas).
        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement("
                UPDATE kinerja_buku_kas_umum_uraian_details d
                SET kinerja_rkas_perubahan_id = d.kinerja_rkas_id,
                    kinerja_rkas_id = NULL
                FROM kinerja_buku_kas_umums b
                WHERE d.kinerja_buku_kas_umum_id = b.id
                  AND EXTRACT(MONTH FROM b.tanggal_transaksi) >= 7
                  AND d.kinerja_rkas_id IS NOT NULL
            ");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('kinerja_buku_kas_umum_uraian_details', function (Blueprint $table) {
            $table->dropColumn('kinerja_rkas_perubahan_id');
        });
    }
};
