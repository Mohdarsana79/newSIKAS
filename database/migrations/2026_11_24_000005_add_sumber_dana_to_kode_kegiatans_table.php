<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('kode_kegiatans', function (Blueprint $table) {
            if (! Schema::hasColumn('kode_kegiatans', 'sumber_dana')) {
                $table->string('sumber_dana', 16)->default('reguler')->after('tahun');
                $table->index(['tahun', 'sumber_dana'], 'kode_kegiatans_tahun_sumber_dana_idx');
            }
        });
    }

    public function down(): void
    {
        Schema::table('kode_kegiatans', function (Blueprint $table) {
            if (Schema::hasColumn('kode_kegiatans', 'sumber_dana')) {
                $table->dropIndex('kode_kegiatans_tahun_sumber_dana_idx');
                $table->dropColumn('sumber_dana');
            }
        });
    }
};
