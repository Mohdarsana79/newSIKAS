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
        // 1. Reguler
        Schema::create('basts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sekolah_id')->constrained('sekolahs')->onDelete('cascade');
            $table->foreignId('penganggaran_id')->constrained('penganggarans')->onDelete('cascade');
            $table->foreignId('buku_kas_umum_id')->constrained('buku_kas_umums')->onDelete('cascade');
            $table->string('nomor_bast')->nullable();
            $table->date('tanggal_bast')->nullable();
            $table->string('pihak_pertama_nama')->nullable();
            $table->string('pihak_pertama_jabatan')->nullable();
            $table->string('pihak_pertama_instansi')->nullable();
            $table->string('pihak_pertama_alamat')->nullable();
            $table->string('pihak_kedua_nama')->nullable();
            $table->string('pihak_kedua_jabatan')->nullable();
            $table->string('pihak_kedua_instansi')->nullable();
            $table->string('pihak_kedua_alamat')->nullable();
            $table->timestamps();
        });

        // 2. Kinerja
        Schema::create('kinerja_basts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sekolah_id')->constrained('sekolahs')->onDelete('cascade');
            $table->foreignId('kinerja_penganggaran_id')->constrained('kinerja_penganggarans')->onDelete('cascade');
            $table->foreignId('kinerja_buku_kas_umum_id')->constrained('kinerja_buku_kas_umums')->onDelete('cascade');
            $table->string('nomor_bast')->nullable();
            $table->date('tanggal_bast')->nullable();
            $table->string('pihak_pertama_nama')->nullable();
            $table->string('pihak_pertama_jabatan')->nullable();
            $table->string('pihak_pertama_instansi')->nullable();
            $table->string('pihak_pertama_alamat')->nullable();
            $table->string('pihak_kedua_nama')->nullable();
            $table->string('pihak_kedua_jabatan')->nullable();
            $table->string('pihak_kedua_instansi')->nullable();
            $table->string('pihak_kedua_alamat')->nullable();
            $table->timestamps();
        });

        // 3. SiLPA Reguler
        Schema::create('silpa_basts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sekolah_id')->constrained('sekolahs')->onDelete('cascade');
            $table->foreignId('silpa_penganggaran_id')->constrained('silpa_penganggarans')->onDelete('cascade');
            $table->foreignId('silpa_buku_kas_umum_id')->constrained('silpa_buku_kas_umums')->onDelete('cascade');
            $table->string('nomor_bast')->nullable();
            $table->date('tanggal_bast')->nullable();
            $table->string('pihak_pertama_nama')->nullable();
            $table->string('pihak_pertama_jabatan')->nullable();
            $table->string('pihak_pertama_instansi')->nullable();
            $table->string('pihak_pertama_alamat')->nullable();
            $table->string('pihak_kedua_nama')->nullable();
            $table->string('pihak_kedua_jabatan')->nullable();
            $table->string('pihak_kedua_instansi')->nullable();
            $table->string('pihak_kedua_alamat')->nullable();
            $table->timestamps();
        });

        // 4. SiLPA Kinerja
        Schema::create('kinerja_silpa_basts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sekolah_id')->constrained('sekolahs')->onDelete('cascade');
            $table->foreignId('kinerja_silpa_penganggaran_id')->constrained('kinerja_silpa_penganggarans')->onDelete('cascade');
            $table->foreignId('kinerja_silpa_buku_kas_umum_id')->constrained('kinerja_silpa_buku_kas_umums')->onDelete('cascade');
            $table->string('nomor_bast')->nullable();
            $table->date('tanggal_bast')->nullable();
            $table->string('pihak_pertama_nama')->nullable();
            $table->string('pihak_pertama_jabatan')->nullable();
            $table->string('pihak_pertama_instansi')->nullable();
            $table->string('pihak_pertama_alamat')->nullable();
            $table->string('pihak_kedua_nama')->nullable();
            $table->string('pihak_kedua_jabatan')->nullable();
            $table->string('pihak_kedua_instansi')->nullable();
            $table->string('pihak_kedua_alamat')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kinerja_silpa_basts');
        Schema::dropIfExists('silpa_basts');
        Schema::dropIfExists('kinerja_basts');
        Schema::dropIfExists('basts');
    }
};
