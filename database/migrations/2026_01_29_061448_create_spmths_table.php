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
        Schema::create('spmths', function (Blueprint $table) {
            $table->id();
            $table->string('nomor_surat');
            $table->foreignId('penganggaran_id')->constrained('penganggarans')->onDelete('cascade');
            $table->foreignId('sekolah_id')->constrained('sekolahs')->onDelete('cascade');
            $table->foreignId('buku_kas_umum_id')->nullable()->constrained('buku_kas_umums')->onDelete('cascade');
            $table->foreignId('penerimaan_dana_id')->nullable()->constrained('penerimaan_danas')->onDelete('cascade');
            
            // Additional necessary columns for logic
            $table->enum('tahap', ['1', '2']); // 1 = Semester I, 2 = Semester II
            $table->decimal('realisasi_lalu', 15, 2)->default(0);
            $table->decimal('realisasi_ini', 15, 2)->default(0);
            $table->decimal('sisa', 15, 2)->default(0);

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('spmths');
    }
};
