<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** @var array<int, string> */
    private array $tables = [
        'basts',
        'kinerja_basts',
        'silpa_basts',
        'kinerja_silpa_basts',
        'surat_pesanans',
        'kinerja_surat_pesanans',
        'silpa_surat_pesanans',
        'kinerja_silpa_surat_pesanans',
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
