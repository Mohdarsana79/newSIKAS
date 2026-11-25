<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ref_barangs', function (Blueprint $table) {
            if (! Schema::hasColumn('ref_barangs', 'blok_id')) {
                $table->string('blok_id', 16)->nullable()->after('satuan');
            }
            if (! Schema::hasColumn('ref_barangs', 'kode_belanja')) {
                $table->string('kode_belanja', 16)->nullable()->after('blok_id');
            }
            if (! Schema::hasColumn('ref_barangs', 'is_expired')) {
                $table->boolean('is_expired')->default(false)->after('kode_belanja');
            }

            $table->index(['tahun', 'is_expired', 'kode_rekening'], 'ref_barangs_tahun_expired_rek_idx');
            $table->index(['tahun', 'is_expired', 'kode_belanja', 'blok_id'], 'ref_barangs_tahun_expired_rbm_idx');
        });

        if (! Schema::hasTable('ref_satuans')) {
            Schema::create('ref_satuans', function (Blueprint $table) {
                $table->id();
                $table->string('ref_satuan_id', 64)->unique();
                $table->string('satuan', 60);
                $table->string('unit', 60)->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();

                $table->index(['is_active', 'satuan'], 'ref_satuans_active_satuan_idx');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('ref_satuans');

        Schema::table('ref_barangs', function (Blueprint $table) {
            $table->dropIndex('ref_barangs_tahun_expired_rek_idx');
            $table->dropIndex('ref_barangs_tahun_expired_rbm_idx');
            foreach (['blok_id', 'kode_belanja', 'is_expired'] as $col) {
                if (Schema::hasColumn('ref_barangs', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
