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
        Schema::create('surat_pesanans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sekolah_id')->constrained('sekolahs')->onDelete('cascade');
            $table->foreignId('penganggaran_id')->constrained('penganggarans')->onDelete('cascade');
            $table->foreignId('buku_kas_umum_id')->constrained('buku_kas_umums')->onDelete('cascade');
            $table->string('nomor_sp')->nullable();
            $table->date('tanggal_sp')->nullable();
            
            // Pihak Kesatu
            $table->string('pihak_kesatu_nama')->nullable();
            $table->string('pihak_kesatu_nip')->nullable();
            $table->string('pihak_kesatu_jabatan')->nullable();
            $table->string('pihak_kesatu_instansi')->nullable();
            $table->string('pihak_kesatu_alamat')->nullable();
            
            // Pihak Kedua
            $table->string('pihak_kedua_nama_perusahaan')->nullable();
            $table->string('pihak_kedua_penanggung_jawab')->nullable();
            $table->string('pihak_kedua_alamat')->nullable();
            $table->string('pihak_kedua_npwp')->nullable();
            $table->string('pihak_kedua_platform')->nullable();
            
            // Ketentuan
            $table->text('waktu_pengiriman')->nullable();
            $table->text('kondisi_barang')->nullable();
            $table->text('ketentuan_pembayaran')->nullable();
            $table->string('sumber_dana')->nullable();
            
            $table->timestamps();
        });

        // 2. Kinerja
        Schema::create('kinerja_surat_pesanans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sekolah_id')->constrained('sekolahs')->onDelete('cascade');
            $table->foreignId('kinerja_penganggaran_id')->constrained('kinerja_penganggarans')->onDelete('cascade');
            $table->foreignId('kinerja_buku_kas_umum_id')->constrained('kinerja_buku_kas_umums')->onDelete('cascade');
            $table->string('nomor_sp')->nullable();
            $table->date('tanggal_sp')->nullable();
            
            $table->string('pihak_kesatu_nama')->nullable();
            $table->string('pihak_kesatu_nip')->nullable();
            $table->string('pihak_kesatu_jabatan')->nullable();
            $table->string('pihak_kesatu_instansi')->nullable();
            $table->string('pihak_kesatu_alamat')->nullable();
            
            $table->string('pihak_kedua_nama_perusahaan')->nullable();
            $table->string('pihak_kedua_penanggung_jawab')->nullable();
            $table->string('pihak_kedua_alamat')->nullable();
            $table->string('pihak_kedua_npwp')->nullable();
            $table->string('pihak_kedua_platform')->nullable();
            
            $table->text('waktu_pengiriman')->nullable();
            $table->text('kondisi_barang')->nullable();
            $table->text('ketentuan_pembayaran')->nullable();
            $table->string('sumber_dana')->nullable();
            
            $table->timestamps();
        });

        // 3. SiLPA Reguler
        Schema::create('silpa_surat_pesanans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sekolah_id')->constrained('sekolahs')->onDelete('cascade');
            $table->foreignId('silpa_penganggaran_id')->constrained('silpa_penganggarans')->onDelete('cascade');
            $table->foreignId('silpa_buku_kas_umum_id')->constrained('silpa_buku_kas_umums')->onDelete('cascade');
            $table->string('nomor_sp')->nullable();
            $table->date('tanggal_sp')->nullable();
            
            $table->string('pihak_kesatu_nama')->nullable();
            $table->string('pihak_kesatu_nip')->nullable();
            $table->string('pihak_kesatu_jabatan')->nullable();
            $table->string('pihak_kesatu_instansi')->nullable();
            $table->string('pihak_kesatu_alamat')->nullable();
            
            $table->string('pihak_kedua_nama_perusahaan')->nullable();
            $table->string('pihak_kedua_penanggung_jawab')->nullable();
            $table->string('pihak_kedua_alamat')->nullable();
            $table->string('pihak_kedua_npwp')->nullable();
            $table->string('pihak_kedua_platform')->nullable();
            
            $table->text('waktu_pengiriman')->nullable();
            $table->text('kondisi_barang')->nullable();
            $table->text('ketentuan_pembayaran')->nullable();
            $table->string('sumber_dana')->nullable();
            
            $table->timestamps();
        });

        // 4. SiLPA Kinerja
        Schema::create('kinerja_silpa_surat_pesanans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sekolah_id')->constrained('sekolahs')->onDelete('cascade');
            $table->foreignId('kinerja_silpa_penganggaran_id')->constrained('kinerja_silpa_penganggarans')->onDelete('cascade');
            $table->foreignId('kinerja_silpa_buku_kas_umum_id')->constrained('kinerja_silpa_buku_kas_umums')->onDelete('cascade');
            $table->string('nomor_sp')->nullable();
            $table->date('tanggal_sp')->nullable();
            
            $table->string('pihak_kesatu_nama')->nullable();
            $table->string('pihak_kesatu_nip')->nullable();
            $table->string('pihak_kesatu_jabatan')->nullable();
            $table->string('pihak_kesatu_instansi')->nullable();
            $table->string('pihak_kesatu_alamat')->nullable();
            
            $table->string('pihak_kedua_nama_perusahaan')->nullable();
            $table->string('pihak_kedua_penanggung_jawab')->nullable();
            $table->string('pihak_kedua_alamat')->nullable();
            $table->string('pihak_kedua_npwp')->nullable();
            $table->string('pihak_kedua_platform')->nullable();
            
            $table->text('waktu_pengiriman')->nullable();
            $table->text('kondisi_barang')->nullable();
            $table->text('ketentuan_pembayaran')->nullable();
            $table->string('sumber_dana')->nullable();
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kinerja_silpa_surat_pesanans');
        Schema::dropIfExists('silpa_surat_pesanans');
        Schema::dropIfExists('kinerja_surat_pesanans');
        Schema::dropIfExists('surat_pesanans');
    }
};
