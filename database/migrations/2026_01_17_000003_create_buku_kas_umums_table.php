<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('buku_kas_umums', function (Blueprint $table) {
            $table->id();
            // Alias for id to match controller expectation 'id_transaksi' if needed directly in DB,
            // OR we can just rely on 'id' and map it in model/controller?
            // Controller uses 'orderBy('id_transaksi')'. To be safe, I'll add 'id_transaksi' logic or rename 'id'.
            // Eloquent defaults to 'id'. I will stick to 'id' as PK, and maybe add 'id_transaksi' string for display?
            // Or maybe 'id_transaksi' IS the 'id'.
            // Let's assume 'id' is sufficient for now but BKU usually has a specific formatted ID.
            // I'll add 'id_transaksi' as a string column for formatted ID.
            $table->string('id_transaksi')->nullable(); 

            $table->foreignId('penganggaran_id')->constrained('penganggarans')->onDelete('cascade');
            $table->date('tanggal_transaksi');
            
            // Relasi (nullable allowed for some record types?)
            $table->foreignId('kode_kegiatan_id')->nullable()->constrained('kode_kegiatans')->nullOnDelete();
            $table->foreignId('rekening_belanja_id')->nullable()->constrained('rekening_belanjas')->nullOnDelete();
            $table->text('uraian')->nullable();
            
            $table->enum('jenis_transaksi', ['tunai', 'non-tunai']);

            
            $table->decimal('anggaran', 20, 2)->default(0);
            $table->decimal('dibelanjakan', 20, 2)->default(0);
            $table->decimal('total_transaksi_kotor', 20, 2)->default(0);
            $table->string('pajak')->nullable();
            $table->integer('persen_pajak')->nullable();
            $table->decimal('total_pajak', 20, 2)->default(0);
            $table->string('pajak_daerah')->nullable();
            $table->integer('persen_pajak_daerah')->nullable();
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

            $table->timestamps();
        });

        Schema::create('buku_kas_umum_uraian_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('buku_kas_umum_id')->constrained('buku_kas_umums')->onDelete('cascade');
            $table->text('uraian');
            $table->integer('volume')->default(0);
            $table->string('satuan')->nullable();
            $table->decimal('harga_satuan', 20, 2)->default(0);
            $table->decimal('jumlah', 20, 2)->default(0);
            
            // Relasi per item if needed (kegiatan/rekening might vary per item?)
            // Controller store method had 'uraian_items.*.kegiatan_id' logic showing items can have different codes.
            $table->foreignId('kode_kegiatan_id')->nullable()->constrained('kode_kegiatans');
            $table->foreignId('rekening_belanja_id')->nullable()->constrained('rekening_belanjas');
            
            // Link ke RKAS
            $table->unsignedBigInteger('rkas_id')->nullable();
            $table->unsignedBigInteger('rkas_perubahan_id')->nullable();

            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('buku_kas_umum_uraian_details');
        Schema::dropIfExists('buku_kas_umums');
    }
};
