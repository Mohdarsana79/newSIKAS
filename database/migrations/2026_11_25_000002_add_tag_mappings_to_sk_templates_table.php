<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sk_templates', function (Blueprint $table) {
            $table->json('tag_mappings')->nullable()->after('detected_variables');
        });
    }

    public function down(): void
    {
        Schema::table('sk_templates', function (Blueprint $table) {
            $table->dropColumn('tag_mappings');
        });
    }
};
