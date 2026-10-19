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
        Schema::table('users', function (Blueprint $table) {
            $table->text('deepseek_api_key')->nullable()->after('remember_token');
            $table->string('deepseek_model_reasoner', 50)->default('deepseek-reasoner')->after('deepseek_api_key');
            $table->string('deepseek_model_chat', 50)->default('deepseek-chat')->after('deepseek_model_reasoner');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'deepseek_api_key',
                'deepseek_model_reasoner',
                'deepseek_model_chat',
            ]);
        });
    }
};
