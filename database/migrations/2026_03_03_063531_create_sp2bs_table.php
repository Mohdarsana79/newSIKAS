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
        Schema::create('sp2bs', function (Blueprint $table) {
            $table->id();
            $table->string('nomor_sp2b');
            $table->date('tanggal_sp2b')->nullable();
            $table->enum('tahap', ['1', '2']);
            $table->foreignId('penganggaran_id')->constrained('penganggarans')->onDelete('cascade');
            $table->decimal('saldo_awal', 15, 2)->default(0);
            $table->decimal('pendapatan', 15, 2)->default(0);
            $table->decimal('belanja', 15, 2)->default(0);
            $table->decimal('belanja_pegawai', 15, 2)->default(0);
            $table->decimal('belanja_barang_jasa', 15, 2)->default(0);
            $table->decimal('belanja_modal', 15, 2)->default(0);
            $table->decimal('belanja_modal_peralatan_mesin', 15, 2)->default(0);
            $table->decimal('belanja_modal_aset_tetap_lainnya', 15, 2)->default(0);
            $table->decimal('belanja_modal_tanah_bangunan', 15, 2)->default(0);
            $table->decimal('saldo_akhir', 15, 2)->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sp2bs');
    }
};
