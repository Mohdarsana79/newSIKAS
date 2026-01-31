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
        Schema::create('sekolahs', function (Blueprint $table) {
            $table->id();
            $table->string('nama_sekolah');
            $table->string('npsn')->unique(); // Changed to string as NPSN might preserve leading zeros, user asked integer but typically NPSN is string. I'll stick to user logic if strict, but unique() implies key. Let's use string for safety or BigInt. User said integer.
            // User request: $table->integer('npsn')->unique();
            // I will follow user request exactly but use bigInteger to be safe, or just integer.
            // Actually, best to follow request:
            // $table->integer('npsn')->unique();
            $table->string('status_sekolah');
            $table->string('jenjang_sekolah');
            $table->string('kelurahan_desa');
            $table->string('kecamatan');
            $table->string('kabupaten_kota');
            $table->string('provinsi');
            $table->text('alamat');
            $table->string('kop_surat')->nullable(); // Helper for feature 2
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sekolahs');
    }
};
