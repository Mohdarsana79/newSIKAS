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
        $tables = ['rkas', 'rkas_perubahans', 'silpa_rkas'];

        foreach ($tables as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->enum('status_penerima', ['pns', 'non_asn'])->nullable()->after('pot_pph21_narasumber');
                $table->enum('golongan', ['I', 'II', 'III', 'IV'])->nullable()->after('status_penerima');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $tables = ['rkas', 'rkas_perubahans', 'silpa_rkas'];

        foreach ($tables as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->dropColumn(['status_penerima', 'golongan']);
            });
        }
    }
};
