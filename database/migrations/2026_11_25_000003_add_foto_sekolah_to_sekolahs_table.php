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
        if (! Schema::hasColumn('sekolahs', 'foto_sekolah')) {
            Schema::table('sekolahs', function (Blueprint $table) {
                $table->string('foto_sekolah', 255)->nullable()->after('logo_sekolah');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('sekolahs', 'foto_sekolah')) {
            Schema::table('sekolahs', function (Blueprint $table) {
                $table->dropColumn('foto_sekolah');
            });
        }
    }
};
