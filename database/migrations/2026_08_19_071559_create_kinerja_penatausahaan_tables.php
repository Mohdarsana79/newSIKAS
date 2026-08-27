<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. kinerja_penerimaan_danas
        Schema::create('kinerja_penerimaan_danas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('kinerja_penganggaran_id')->constrained('kinerja_penganggarans')->onDelete('cascade');
            $table->decimal('saldo_awal', 15, 2)->nullable();
            $table->date('tanggal_saldo_awal')->nullable();
            $table->string('sumber_dana');
            $table->decimal('jumlah_dana', 15, 2);
            $table->date('tanggal_terima')->nullable();
            $table->timestamps();
        });

        // 2. kinerja_penarikan_tunais
        Schema::create('kinerja_penarikan_tunais', function (Blueprint $table) {
            $table->id();
            $table->foreignId('kinerja_penganggaran_id')->constrained('kinerja_penganggarans')->onDelete('cascade');
            $table->date('tanggal_penarikan');
            $table->decimal('jumlah_penarikan', 20, 2);
            $table->timestamps();
        });

        // 3. kinerja_setor_tunais
        Schema::create('kinerja_setor_tunais', function (Blueprint $table) {
            $table->id();
            $table->foreignId('kinerja_penganggaran_id')->constrained('kinerja_penganggarans')->onDelete('cascade');
            $table->date('tanggal_setor');
            $table->decimal('jumlah_setor', 20, 2);
            $table->timestamps();
        });

        // 4. kinerja_status_sts_giros
        Schema::create('kinerja_status_sts_giros', function (Blueprint $table) {
            $table->id();
            $table->foreignId('kinerja_penganggaran_id')->constrained('kinerja_penganggarans')->onDelete('cascade');
            $table->string('nomor_sts');
            $table->decimal('jumlah_sts', 15, 2);
            $table->date('tanggal_bayar')->nullable();
            $table->boolean('is_bkp')->default(false);
            $table->decimal('jumlah_bayar', 15, 2)->default(0);
            $table->timestamps();
        });

        // 5. kinerja_buku_kas_umums
        Schema::create('kinerja_buku_kas_umums', function (Blueprint $table) {
            $table->id();
            $table->string('id_transaksi')->nullable();
            $table->foreignId('kinerja_penganggaran_id')->constrained('kinerja_penganggarans')->onDelete('cascade');
            $table->date('tanggal_transaksi');
            
            $table->foreignId('kode_kegiatan_id')->nullable()->constrained('kode_kegiatans')->nullOnDelete();
            $table->foreignId('rekening_belanja_id')->nullable()->constrained('rekening_belanjas')->nullOnDelete();
            $table->text('uraian')->nullable();
            
            $table->enum('jenis_transaksi', ['tunai', 'non-tunai']);

            $table->decimal('anggaran', 20, 2)->default(0);
            $table->decimal('dibelanjakan', 20, 2)->default(0);
            $table->decimal('total_transaksi_kotor', 20, 2)->default(0);
            $table->string('pajak')->nullable();
            $table->decimal('persen_pajak', 5, 2)->nullable();
            $table->decimal('total_pajak', 20, 2)->default(0);
            $table->string('pajak_daerah')->nullable();
            $table->decimal('persen_pajak_daerah', 5, 2)->nullable();
            $table->decimal('total_pajak_daerah', 20, 2)->default(0);
            $table->date('tanggal_lapor')->nullable();
            $table->string('kode_masa_pajak')->nullable();
            $table->string('ntpn')->nullable();
            $table->date('tanggal_tutup')->nullable();
            
            // Bunga Bank
            $table->boolean('is_bunga_record')->default(false);
            $table->decimal('bunga_bank', 20, 2)->default(0);
            $table->decimal('pajak_bunga_bank', 20, 2)->default(0);

            // Additional info
            $table->string('nama_toko')->nullable();
            $table->string('nama_penerima_pembayaran')->nullable();
            $table->string('alamat_toko')->nullable();
            $table->string('npwp')->nullable();
            $table->string('nomor_nota')->nullable();
            $table->text('uraian_opsional')->nullable();

            $table->timestamps();
        });

        // 6. kinerja_buku_kas_umum_uraian_details
        Schema::create('kinerja_buku_kas_umum_uraian_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('kinerja_buku_kas_umum_id')->constrained('kinerja_buku_kas_umums')->onDelete('cascade');
            $table->text('uraian');
            $table->integer('volume')->default(0);
            $table->string('satuan')->nullable();
            $table->decimal('harga_satuan', 20, 2)->default(0);
            $table->decimal('jumlah', 20, 2)->default(0);
            
            $table->foreignId('kode_kegiatan_id')->nullable()->constrained('kode_kegiatans');
            $table->foreignId('rekening_belanja_id')->nullable()->constrained('rekening_belanjas');
            
            // Link ke RKAS SiLPA
            $table->unsignedBigInteger('kinerja_rkas_id')->nullable();

            $table->timestamps();
        });

        // 7. kinerja_kwitansis
        Schema::create('kinerja_kwitansis', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sekolah_id')->constrained('sekolahs')->onDelete('cascade');
            $table->foreignId('kinerja_penganggaran_id')->constrained('kinerja_penganggarans')->onDelete('cascade');
            $table->foreignId('kode_kegiatan_id')->constrained('kode_kegiatans')->onDelete('cascade');
            $table->foreignId('kode_rekening_id')->constrained('rekening_belanjas')->onDelete('cascade');
            $table->foreignId('kinerja_penerimaan_dana_id')->constrained('kinerja_penerimaan_danas')->onDelete('cascade');
            $table->foreignId('kinerja_buku_kas_umum_id')->constrained('kinerja_buku_kas_umums')->onDelete('cascade');
            $table->foreignId('kinerja_bku_uraian_detail_id')->constrained('kinerja_buku_kas_umum_uraian_details')->onDelete('cascade');
            $table->timestamps();
        });

        // Trigger for kinerja_buku_kas_umum_uraian_details
        DB::unprepared("
            CREATE OR REPLACE FUNCTION kinerja_auto_hitung_jumlah_bku()
            RETURNS TRIGGER AS $$
            BEGIN
                IF (NEW.jumlah IS NULL OR NEW.jumlah = 0) AND NEW.volume > 0 AND NEW.harga_satuan > 0 THEN
                    NEW.jumlah := NEW.volume * NEW.harga_satuan;
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        ");

        DB::unprepared("
            CREATE TRIGGER trg_kinerja_auto_hitung_jumlah
            BEFORE INSERT OR UPDATE ON kinerja_buku_kas_umum_uraian_details
            FOR EACH ROW
            EXECUTE FUNCTION kinerja_auto_hitung_jumlah_bku();
        ");
    }

    public function down(): void
    {
        DB::unprepared("DROP TRIGGER IF EXISTS trg_kinerja_auto_hitung_jumlah ON kinerja_buku_kas_umum_uraian_details;");
        DB::unprepared("DROP FUNCTION IF EXISTS kinerja_auto_hitung_jumlah_bku();");

        Schema::dropIfExists('kinerja_kwitansis');
        Schema::dropIfExists('kinerja_buku_kas_umum_uraian_details');
        Schema::dropIfExists('kinerja_buku_kas_umums');
        Schema::dropIfExists('kinerja_status_sts_giros');
        Schema::dropIfExists('kinerja_setor_tunais');
        Schema::dropIfExists('kinerja_penarikan_tunais');
        Schema::dropIfExists('kinerja_penerimaan_danas');
    }
};
