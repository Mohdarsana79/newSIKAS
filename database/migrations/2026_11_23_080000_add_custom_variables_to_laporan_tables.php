<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** @var array<int, string> */
    private array $tables = [
        'spmths',
        'kinerja_spmths',
        'silpa_spmths',
        'kinerja_silpa_spmths',
        'sptjs',
        'kinerja_sptjs',
        'silpa_sptjs',
        'kinerja_silpa_sptjs',
        'sp2bs',
        'kinerja_sp2bs',
        'silpa_sp2bs',
        'kinerja_silpa_sp2bs',
        'lphs',
        'kinerja_lphs',
        'silpa_lphs',
        'kinerja_silpa_lphs',
    ];

    public function up(): void
    {
        foreach ($this->tables as $tableName) {
            if (Schema::hasTable($tableName) && ! Schema::hasColumn($tableName, 'custom_variables')) {
                Schema::table($tableName, function (Blueprint $table): void {
                    $table->json('custom_variables')->nullable();
                });
            }
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $tableName) {
            if (Schema::hasTable($tableName) && Schema::hasColumn($tableName, 'custom_variables')) {
                Schema::table($tableName, function (Blueprint $table): void {
                    $table->dropColumn('custom_variables');
                });
            }
        }
    }
};
