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
        Schema::table('sekolahs', function (Blueprint $table) {
            $table->string('logo_daerah')->nullable()->after('kop_surat');
            $table->string('logo_sekolah')->nullable()->after('logo_daerah');
            $table->string('kop_mode', 20)->default('2_logo')->after('logo_sekolah');
            $table->longText('kop_teks_html')->nullable()->after('kop_mode');
            $table->string('kop_jenis', 20)->default('builder')->after('kop_teks_html');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sekolahs', function (Blueprint $table) {
            $table->dropColumn([
                'logo_daerah',
                'logo_sekolah',
                'kop_mode',
                'kop_teks_html',
                'kop_jenis',
            ]);
        });
    }
};
