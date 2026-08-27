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
        Schema::create('silpa_spmths', function (Blueprint $table) {
                        $table->id();
            $table->string('nomor_surat');
            $table->foreignId('silpa_penganggaran_id')->constrained('silpa_penganggarans')->onDelete('cascade');
            $table->foreignId('sekolah_id')->constrained('sekolahs')->onDelete('cascade');
            $table->foreignId('silpa_buku_kas_umum_id')->nullable()->constrained('silpa_buku_kas_umums')->onDelete('cascade');
            $table->foreignId('silpa_penerimaan_dana_id')->nullable()->constrained('silpa_penerimaan_danas')->onDelete('cascade');
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
        Schema::dropIfExists('silpa_spmths');
    }
};
