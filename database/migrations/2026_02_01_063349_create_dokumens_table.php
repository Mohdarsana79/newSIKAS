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
        Schema::create('dokumens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('penganggaran_id')->constrained('penganggarans')->onDelete('cascade');
            $table->foreignId('buku_kas_umum_id')->constrained('buku_kas_umums')->onDelete('cascade');
            $table->string('nama_dokumen');
            $table->string('link_drive');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('dokumens');
    }
};
