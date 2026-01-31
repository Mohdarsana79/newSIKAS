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
        Schema::create('sptjs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('penganggaran_id')->constrained('penganggarans')->onDelete('cascade');
            $table->foreignId('penerimaan_dana_id')->nullable()->constrained('penerimaan_danas')->onDelete('cascade');
            $table->foreignId('buku_kas_umum_id')->nullable()->constrained('buku_kas_umums')->onDelete('cascade');
            $table->string('nomor_sptj')->unique();
            $table->date('tanggal_sptj');
            $table->enum('tahap', ['1', '2']);
            $table->decimal('tahap_satu', 15, 2)->default(0);
            $table->decimal('tahap_dua', 15, 2)->default(0);
            $table->decimal('jenis_belanja_pegawai', 15, 2)->default(0);
            $table->decimal('jenis_belanja_barang_jasa', 15, 2)->default(0);
            $table->decimal('jenis_belanja_modal', 15, 2)->default(0);
            $table->decimal('sisa_kas_tunai', 15, 2)->default(0);
            $table->decimal('sisa_dana_di_bank', 15, 2)->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sptjs');
    }
};
