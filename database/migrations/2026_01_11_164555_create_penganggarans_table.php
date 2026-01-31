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
        Schema::create('penganggarans', function (Blueprint $table) {
            $table->id();
            $table->bigInteger('pagu_anggaran');
            $table->year('tahun_anggaran');
            $table->string('kepala_sekolah');
            $table->string('sk_kepala_sekolah');
            $table->string('bendahara');
            $table->string('sk_bendahara');
            $table->string('komite');
            $table->string('nip_kepala_sekolah');
            $table->string('nip_bendahara');
            $table->date('tanggal_sk_kepala_sekolah');
            $table->date('tanggal_sk_bendahara');
            $table->date('tanggal_cetak')->nullable();
            $table->date('tanggal_perubahan')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('penganggarans');
    }
};
