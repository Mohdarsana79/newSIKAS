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
        Schema::create('lphs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sekolah_id')->constrained();
            $table->foreignId('penganggaran_id')->constrained();
            $table->enum('semester', ['1', '2']);
            $table->date('tanggal_lph')->nullable();
            
            // Penerimaan
            $table->decimal('penerimaan_anggaran', 15, 2)->default(0);
            $table->decimal('penerimaan_realisasi', 15, 2)->default(0);
            $table->decimal('penerimaan_selisih', 15, 2)->default(0);
            
            // Pengeluaran Operasional
            $table->decimal('belanja_operasi_anggaran', 15, 2)->default(0);
            $table->decimal('belanja_operasi_realisasi', 15, 2)->default(0);
            $table->decimal('belanja_operasi_selisih', 15, 2)->default(0);
            
            // Belanja Modal Peralatan dan Mesin
            $table->decimal('belanja_modal_peralatan_anggaran', 15, 2)->default(0);
            $table->decimal('belanja_modal_peralatan_realisasi', 15, 2)->default(0);
            $table->decimal('belanja_modal_peralatan_selisih', 15, 2)->default(0);
            
            // Belanja Modal Aset Tetap Lainnya
            $table->decimal('belanja_modal_aset_anggaran', 15, 2)->default(0);
            $table->decimal('belanja_modal_aset_realisasi', 15, 2)->default(0);
            $table->decimal('belanja_modal_aset_selisih', 15, 2)->default(0);
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lphs');
    }
};
