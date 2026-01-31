<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
    {
        Schema::table('buku_kas_umums', function (Blueprint $table) {
            $table->text('uraian_opsional')->nullable()->after('uraian');
        });
    }

    public function down()
    {
        Schema::table('buku_kas_umums', function (Blueprint $table) {
            $table->dropColumn('uraian_opsional');
        });
    }
};
