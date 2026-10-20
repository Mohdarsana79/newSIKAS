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
        if (Schema::hasTable('ref_barangs')) {
            Schema::table('ref_barangs', function (Blueprint $table) {
                $table->index('nama_barang', 'ref_barangs_nama_barang_idx');
                $table->index(['tahun', 'nama_barang'], 'ref_barangs_tahun_nama_idx');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('ref_barangs')) {
            Schema::table('ref_barangs', function (Blueprint $table) {
                $table->dropIndex('ref_barangs_nama_barang_idx');
                $table->dropIndex('ref_barangs_tahun_nama_idx');
            });
        }
    }
};
