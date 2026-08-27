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
        Schema::create('kinerja_silpa_tanda_terimas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sekolah_id')->constrained('sekolahs')->onDelete('cascade');
            $table->foreignId('kinerja_silpa_penganggaran_id')->constrained('kinerja_silpa_penganggarans')->onDelete('cascade');
            $table->foreignId('kode_kegiatan_id')->constrained('kode_kegiatans')->onDelete('cascade');
            $table->foreignId('kode_rekening_id')->constrained('rekening_belanjas')->onDelete('cascade');
            $table->foreignId('kinerja_silpa_penerimaan_dana_id')->constrained('kinerja_silpa_penerimaan_danas')->onDelete('cascade');
            $table->foreignId('kinerja_silpa_buku_kas_umum_id')->constrained('kinerja_silpa_buku_kas_umums')->onDelete('cascade');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kinerja_silpa_tanda_terimas');
    }
};

