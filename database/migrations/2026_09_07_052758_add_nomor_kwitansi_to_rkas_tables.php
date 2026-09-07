<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $tables = [
        'rkas', 'kinerja_rkas', 'silpa_rkas', 'kinerja_silpa_rkas',
        'rkas_perubahans', 'kinerja_rkas_perubahans'
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        foreach ($this->tables as $table) {
            Schema::table($table, function (Blueprint $table) {
                $table->text('nomor_kwitansi')->nullable();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rkas_tables', function (Blueprint $table) {
            //
        });
    }
};
