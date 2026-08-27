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
        Schema::create('kinerja_silpa_spmths', function (Blueprint $table) {
                        $table->id();
            $table->string('nomor_surat');
            $table->foreignId('kinerja_silpa_penganggaran_id')->constrained('kinerja_silpa_penganggarans')->onDelete('cascade');
            $table->foreignId('sekolah_id')->constrained('sekolahs')->onDelete('cascade');
            $table->foreignId('kinerja_silpa_buku_kas_umum_id')->nullable()->constrained('kinerja_silpa_buku_kas_umums')->onDelete('cascade');
            $table->foreignId('kinerja_silpa_penerimaan_dana_id')->nullable()->constrained('kinerja_silpa_penerimaan_danas')->onDelete('cascade');
            $table->enum('tahap', ['1', '2']); 
            $table->decimal('realisasi_lalu', 15, 2)->default(0);
            $table->decimal('realisasi_ini', 15, 2)->default(0);
            $table->decimal('sisa', 15, 2)->default(0);
            $table->date('tanggal_spmth')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kinerja_silpa_spmths');
    }
};

