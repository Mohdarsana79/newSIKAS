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
        Schema::create('ref_barangs', function (Blueprint $table) {
            $table->id();
            $table->string('id_barang', 50)->index();
            $table->string('nama_barang', 255);
            $table->string('kode_rekening', 50)->nullable()->index();
            $table->text('rekening')->nullable();
            $table->string('satuan', 50)->nullable();
            $table->decimal('batas_atas', 15, 2)->default(0);
            $table->integer('tahun')->index();
            $table->timestamps();

            $table->unique(['id_barang', 'tahun'], 'ref_barangs_id_tahun_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ref_barangs');
    }
};
