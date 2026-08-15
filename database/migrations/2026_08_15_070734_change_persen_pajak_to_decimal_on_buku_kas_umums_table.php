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
        Schema::table('buku_kas_umums', function (Blueprint $table) {
            $table->decimal('persen_pajak', 5, 2)->nullable()->change();
            $table->decimal('persen_pajak_daerah', 5, 2)->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('buku_kas_umums', function (Blueprint $table) {
            $table->integer('persen_pajak')->nullable()->change();
            $table->integer('persen_pajak_daerah')->nullable()->change();
        });
    }
};
