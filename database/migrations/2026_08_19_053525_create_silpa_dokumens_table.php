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
        Schema::create('silpa_dokumens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('silpa_penganggaran_id')->constrained('silpa_penganggarans')->onDelete('cascade');
            $table->foreignId('silpa_buku_kas_umum_id')->constrained('silpa_buku_kas_umums')->onDelete('cascade');
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
        Schema::dropIfExists('silpa_dokumens');
    }
};
