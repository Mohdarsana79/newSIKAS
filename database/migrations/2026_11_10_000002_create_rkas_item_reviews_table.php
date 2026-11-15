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
        Schema::create('rkas_item_reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('reviewable_type');
            $table->unsignedBigInteger('reviewable_id');
            $table->string('status')->default('disetujui'); // 'disetujui', 'perlu_revisi'
            $table->text('catatan')->nullable();
            $table->timestamps();

            $table->index(['reviewable_type', 'reviewable_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rkas_item_reviews');
    }
};
