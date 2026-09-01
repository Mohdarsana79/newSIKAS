<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The tables to modify.
     *
     * @var array
     */
    protected $tables = [
        'rkas',
        'kinerja_rkas',
        'silpa_rkas',
        'kinerja_silpa_rkas',
        'rkas_perubahans',
        'kinerja_rkas_perubahans',
        'silpa_rkas_perubahans',
        'kinerja_silpa_rkas_perubahans'
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        foreach ($this->tables as $table) {
            if (Schema::hasTable($table)) {
                Schema::table($table, function (Blueprint $table) {
                    $table->string('uraian_gabungan')->nullable()->after('uraian');
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        foreach ($this->tables as $table) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'uraian_gabungan')) {
                Schema::table($table, function (Blueprint $table) {
                    $table->dropColumn('uraian_gabungan');
                });
            }
        }
    }
};
