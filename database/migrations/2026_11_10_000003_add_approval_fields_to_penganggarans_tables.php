<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tables for the 4 budget variants.
     */
    protected array $tables = [
        'penganggarans',
        'kinerja_penganggarans',
        'silpa_penganggarans',
        'kinerja_silpa_penganggarans',
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        foreach ($this->tables as $tableName) {
            if (Schema::hasTable($tableName)) {
                Schema::table($tableName, function (Blueprint $table) {
                    $table->string('status_persetujuan')->default('draft')->index();
                    $table->foreignId('persetujuan_oleh')->nullable()->constrained('users')->nullOnDelete();
                    $table->timestamp('tanggal_persetujuan')->nullable();
                    $table->text('catatan_persetujuan')->nullable();
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        foreach ($this->tables as $tableName) {
            if (Schema::hasTable($tableName)) {
                Schema::table($tableName, function (Blueprint $table) {
                    $table->dropForeign(['persetujuan_oleh']);
                    $table->dropIndex(['status_persetujuan']);
                    $table->dropColumn([
                        'status_persetujuan',
                        'persetujuan_oleh',
                        'tanggal_persetujuan',
                        'catatan_persetujuan',
                    ]);
                });
            }
        }
    }
};
