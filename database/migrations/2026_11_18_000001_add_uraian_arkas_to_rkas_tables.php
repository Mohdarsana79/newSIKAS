<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * @var array<int, string>
     */
    protected array $tables = [
        'rkas',
        'kinerja_rkas',
        'silpa_rkas',
        'kinerja_silpa_rkas',
        'rkas_perubahans',
        'kinerja_rkas_perubahans',
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        foreach ($this->tables as $tableName) {
            if (! Schema::hasTable($tableName)) {
                continue;
            }

            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                if (! Schema::hasColumn($tableName, 'uraian_arkas')) {
                    $table->text('uraian_arkas')->nullable()->after('uraian');
                }
                if (! Schema::hasColumn($tableName, 'id_barang_arkas')) {
                    $table->string('id_barang_arkas', 100)->nullable()->after('uraian_arkas');
                }
            });
        }

        if (Schema::hasTable('ref_barangs')) {
            Schema::table('ref_barangs', function (Blueprint $table) {
                $table->index(['tahun', 'kode_rekening'], 'ref_barangs_tahun_kode_rekening_idx');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        foreach ($this->tables as $tableName) {
            if (! Schema::hasTable($tableName)) {
                continue;
            }

            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                $columnsToDrop = [];
                if (Schema::hasColumn($tableName, 'uraian_arkas')) {
                    $columnsToDrop[] = 'uraian_arkas';
                }
                if (Schema::hasColumn($tableName, 'id_barang_arkas')) {
                    $columnsToDrop[] = 'id_barang_arkas';
                }
                if (! empty($columnsToDrop)) {
                    $table->dropColumn($columnsToDrop);
                }
            });
        }

        if (Schema::hasTable('ref_barangs')) {
            Schema::table('ref_barangs', function (Blueprint $table) {
                $table->dropIndex('ref_barangs_tahun_kode_rekening_idx');
            });
        }
    }
};
