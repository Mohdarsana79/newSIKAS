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
        Schema::table('rkas_item_reviews', function (Blueprint $table) {
            if (! Schema::hasColumn('rkas_item_reviews', 'tanggapan_bendahara')) {
                $table->text('tanggapan_bendahara')->nullable()->after('catatan');
            }
            if (! Schema::hasColumn('rkas_item_reviews', 'revisi_diajukan_at')) {
                $table->timestamp('revisi_diajukan_at')->nullable()->after('tanggapan_bendahara');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rkas_item_reviews', function (Blueprint $table) {
            $columns = [];
            if (Schema::hasColumn('rkas_item_reviews', 'tanggapan_bendahara')) {
                $columns[] = 'tanggapan_bendahara';
            }
            if (Schema::hasColumn('rkas_item_reviews', 'revisi_diajukan_at')) {
                $columns[] = 'revisi_diajukan_at';
            }
            if (! empty($columns)) {
                $table->dropColumn($columns);
            }
        });
    }
};
