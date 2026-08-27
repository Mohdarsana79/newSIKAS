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
        Schema::table('kinerja_rkas_perubahans', function (Blueprint $table) {
            $table->string('nama_penerima')->nullable()->after('satuan');
            $table->string('jabatan')->nullable()->after('nama_penerima');
            $table->string('nomor_rekening')->nullable()->after('jabatan');
            $table->string('bank')->nullable()->after('nomor_rekening');
            $table->boolean('ada_npwp')->default(false)->after('bank');
            $table->decimal('pot_ppn', 15, 2)->nullable()->after('ada_npwp');
            $table->decimal('pot_pph23', 15, 2)->nullable()->after('pot_ppn');
            $table->decimal('pot_pph21', 15, 2)->nullable()->after('pot_pph23');
            $table->decimal('pot_pph21_narasumber', 15, 2)->nullable()->after('pot_pph21');
            $table->enum('status_penerima', ['pns', 'non_asn'])->nullable()->after('pot_pph21_narasumber');
            $table->enum('golongan', ['I', 'II', 'III', 'IV'])->nullable()->after('status_penerima');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('kinerja_rkas_perubahans', function (Blueprint $table) {
            $table->dropColumn([
                'nama_penerima',
                'jabatan',
                'nomor_rekening',
                'bank',
                'ada_npwp',
                'pot_ppn',
                'pot_pph23',
                'pot_pph21',
                'pot_pph21_narasumber',
                'status_penerima',
                'golongan'
            ]);
        });
    }
};
