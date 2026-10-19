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
        Schema::create('calk_reports', function (Blueprint $table) {
            $table->id();
            $table->string('variant', 30)->default('reguler'); // reguler, kinerja, silpa, kinerja_silpa
            $table->integer('tahun_anggaran');
            $table->string('periode', 20); // 'tahap_1', 'tahap_2', 'tahunan'
            $table->string('judul_laporan', 255);

            // Snapshot angka riil akuntansi
            $table->jsonb('metrics_snapshot');

            // Naskah Bab CaLK (Disusun AI & Dapat Disunting Bendahara)
            $table->text('bab_1_pendahuluan')->nullable();
            $table->text('bab_2_kebijakan_akuntansi')->nullable();
            $table->text('bab_3_analisis_realisasi')->nullable();
            $table->text('bab_4_penjelasan_pos_keuangan')->nullable();
            $table->text('bab_5_penutup')->nullable();

            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('is_finalized')->default(false);
            $table->timestamps();

            $table->unique(['variant', 'tahun_anggaran', 'periode'], 'calk_variant_tahun_periode_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('calk_reports');
    }
};
