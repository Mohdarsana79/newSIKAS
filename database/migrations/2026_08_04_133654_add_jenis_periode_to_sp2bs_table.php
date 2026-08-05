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
        Schema::table('sp2bs', function (Blueprint $table) {
            $table->string('jenis_periode')->default('tahap')->after('tanggal_sp2b');
            $table->integer('bulan')->nullable()->after('jenis_periode');
            
            // Note: If you need to drop the existing unique constraint and re-add it, do it here.
            // Currently, 'sp2bs_tahap_penganggaran_id_unique' might exist but it's handled in application validation.
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sp2bs', function (Blueprint $table) {
            $table->dropColumn('bulan');
            $table->dropColumn('jenis_periode');
        });
    }
};
