<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * @var array<int, string>
     */
    protected array $bkuTables = [
        'buku_kas_umums',
        'kinerja_buku_kas_umums',
        'silpa_buku_kas_umums',
        'kinerja_silpa_buku_kas_umums',
    ];

    /**
     * @var array<int, string>
     */
    protected array $detailTables = [
        'buku_kas_umum_uraian_details',
        'kinerja_buku_kas_umum_uraian_details',
        'silpa_buku_kas_umum_uraian_details',
        'kinerja_silpa_buku_kas_umum_uraian_details',
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        foreach ($this->bkuTables as $tableName) {
            if (! Schema::hasTable($tableName)) {
                continue;
            }

            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                if (! Schema::hasColumn($tableName, 'id_transaksi_arkas')) {
                    $table->string('id_transaksi_arkas')->nullable();
                }
                if (! Schema::hasColumn($tableName, 'nomor_nota_arkas')) {
                    $table->string('nomor_nota_arkas')->nullable();
                }
                if (! Schema::hasColumn($tableName, 'uraian_arkas')) {
                    $table->text('uraian_arkas')->nullable();
                }
            });
        }

        foreach ($this->detailTables as $tableName) {
            if (! Schema::hasTable($tableName)) {
                continue;
            }

            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                if (! Schema::hasColumn($tableName, 'uraian_arkas')) {
                    $table->text('uraian_arkas')->nullable();
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        foreach ($this->bkuTables as $tableName) {
            if (! Schema::hasTable($tableName)) {
                continue;
            }

            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                $columnsToDrop = [];
                foreach (['id_transaksi_arkas', 'nomor_nota_arkas', 'uraian_arkas'] as $col) {
                    if (Schema::hasColumn($tableName, $col)) {
                        $columnsToDrop[] = $col;
                    }
                }
                if (! empty($columnsToDrop)) {
                    $table->dropColumn($columnsToDrop);
                }
            });
        }

        foreach ($this->detailTables as $tableName) {
            if (! Schema::hasTable($tableName)) {
                continue;
            }

            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                if (Schema::hasColumn($tableName, 'uraian_arkas')) {
                    $table->dropColumn('uraian_arkas');
                }
            });
        }
    }
};
