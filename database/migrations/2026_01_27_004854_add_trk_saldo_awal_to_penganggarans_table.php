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
        Schema::table('penganggarans', function (Blueprint $table) {
            $table->boolean('is_trk_saldo_awal')->default(false)->after('sekolah_id');
            $table->date('tanggal_trk_saldo_awal')->nullable()->after('is_trk_saldo_awal');
            $table->decimal('jumlah_trk_saldo_awal', 15, 2)->nullable()->after('tanggal_trk_saldo_awal');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('penganggarans', function (Blueprint $table) {
            $table->dropColumn(['is_trk_saldo_awal', 'tanggal_trk_saldo_awal', 'jumlah_trk_saldo_awal']);
        });
    }
};
