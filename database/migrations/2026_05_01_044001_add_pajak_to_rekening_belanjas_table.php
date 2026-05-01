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
        Schema::table('rekening_belanjas', function (Blueprint $table) {
            $table->boolean('is_ppn')->default(false)->after('kategori');
            $table->boolean('is_pph21')->default(false)->after('is_ppn');
            $table->boolean('is_pph22')->default(false)->after('is_pph21');
            $table->boolean('is_pph23')->default(false)->after('is_pph22');
            $table->boolean('is_pph4')->default(false)->after('is_pph23');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rekening_belanjas', function (Blueprint $table) {
            $table->dropColumn(['is_ppn', 'is_pph21', 'is_pph22', 'is_pph23', 'is_pph4']);
        });
    }
};
