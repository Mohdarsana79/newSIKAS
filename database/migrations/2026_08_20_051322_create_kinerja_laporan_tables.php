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
        Schema::create('kinerja_spmths', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sekolah_id')->constrained('sekolahs')->onDelete('cascade');
            $table->foreignId('kinerja_penganggaran_id')->constrained('kinerja_penganggarans')->onDelete('cascade');
            $table->string('nomor_surat');
            $table->integer('tahap');
            $table->decimal('realisasi_lalu', 20, 2)->default(0);
            $table->decimal('realisasi_ini', 20, 2)->default(0);
            $table->decimal('sisa', 20, 2)->default(0);
            $table->date('tanggal_spmth')->nullable();
            $table->timestamps();
        });

        Schema::create('kinerja_sptjs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('kinerja_penganggaran_id')->constrained('kinerja_penganggarans')->onDelete('cascade');
            $table->foreignId('kinerja_penerimaan_dana_id')->nullable()->constrained('kinerja_penerimaan_danas')->onDelete('set null');
            $table->foreignId('kinerja_buku_kas_umum_id')->nullable()->constrained('kinerja_buku_kas_umums')->onDelete('set null');
            $table->string('nomor_sptj');
            $table->date('tanggal_sptj');
            $table->integer('tahap');
            $table->decimal('tahap_satu', 20, 2)->default(0);
            $table->decimal('tahap_dua', 20, 2)->default(0);
            $table->decimal('jenis_belanja_pegawai', 20, 2)->default(0);
            $table->decimal('jenis_belanja_barang_jasa', 20, 2)->default(0);
            $table->decimal('jenis_belanja_modal', 20, 2)->default(0);
            $table->decimal('sisa_kas_tunai', 20, 2)->default(0);
            $table->decimal('sisa_dana_di_bank', 20, 2)->default(0);
            $table->timestamps();
        });

        Schema::create('kinerja_sp2bs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('kinerja_penganggaran_id')->constrained('kinerja_penganggarans')->onDelete('cascade');
            $table->string('nomor_sp2b');
            $table->date('tanggal_sp2b');
            $table->enum('jenis_periode', ['bulan', 'tahap']);
            $table->integer('bulan')->nullable();
            $table->integer('tahap')->nullable();
            $table->decimal('saldo_awal', 20, 2)->default(0);
            $table->decimal('pendapatan', 20, 2)->default(0);
            $table->decimal('belanja', 20, 2)->default(0);
            $table->decimal('belanja_pegawai', 20, 2)->default(0);
            $table->decimal('belanja_barang_jasa', 20, 2)->default(0);
            $table->decimal('belanja_modal', 20, 2)->default(0);
            $table->decimal('belanja_modal_peralatan_mesin', 20, 2)->default(0);
            $table->decimal('belanja_modal_aset_tetap_lainnya', 20, 2)->default(0);
            $table->decimal('belanja_modal_tanah_bangunan', 20, 2)->default(0);
            $table->decimal('saldo_akhir', 20, 2)->default(0);
            $table->timestamps();
        });

        Schema::create('kinerja_lphs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sekolah_id')->constrained('sekolahs')->onDelete('cascade');
            $table->foreignId('kinerja_penganggaran_id')->constrained('kinerja_penganggarans')->onDelete('cascade');
            $table->date('tanggal_lph')->nullable();
            $table->integer('semester');
            $table->decimal('penerimaan_anggaran', 20, 2)->default(0);
            $table->decimal('penerimaan_realisasi', 20, 2)->default(0);
            $table->decimal('penerimaan_selisih', 20, 2)->default(0);
            $table->decimal('belanja_operasi_anggaran', 20, 2)->default(0);
            $table->decimal('belanja_operasi_realisasi', 20, 2)->default(0);
            $table->decimal('belanja_operasi_selisih', 20, 2)->default(0);
            $table->decimal('belanja_modal_peralatan_anggaran', 20, 2)->default(0);
            $table->decimal('belanja_modal_peralatan_realisasi', 20, 2)->default(0);
            $table->decimal('belanja_modal_peralatan_selisih', 20, 2)->default(0);
            $table->decimal('belanja_modal_aset_anggaran', 20, 2)->default(0);
            $table->decimal('belanja_modal_aset_realisasi', 20, 2)->default(0);
            $table->decimal('belanja_modal_aset_selisih', 20, 2)->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kinerja_lphs');
        Schema::dropIfExists('kinerja_sp2bs');
        Schema::dropIfExists('kinerja_sptjs');
        Schema::dropIfExists('kinerja_spmths');
    }
};
