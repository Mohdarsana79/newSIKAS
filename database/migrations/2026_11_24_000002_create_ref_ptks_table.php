<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ref_ptks', function (Blueprint $table) {
            $table->id();
            $table->unsignedSmallInteger('tahun');
            $table->string('ptk_id', 64)->nullable();
            $table->string('nuptk', 32)->nullable();
            $table->string('nama', 120);
            $table->string('jenis_kelamin', 2)->nullable();
            $table->unsignedSmallInteger('jenis_ptk_arkas')->default(10);
            $table->unsignedSmallInteger('masa_kerja_tahun')->default(0);
            $table->unsignedSmallInteger('masa_kerja_bulan')->default(0);
            $table->boolean('pernah_sertifikasi')->default(false);
            $table->boolean('is_active')->default(true);
            $table->string('sumber', 16)->default('arkas');
            $table->timestamps();

            $table->unique(['tahun', 'ptk_id'], 'ref_ptks_tahun_ptk_id_unique');
            $table->index(['tahun', 'jenis_ptk_arkas', 'is_active'], 'ref_ptks_tahun_jenis_active_idx');
            $table->index(['tahun', 'nama'], 'ref_ptks_tahun_nama_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ref_ptks');
    }
};
