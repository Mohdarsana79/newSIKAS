<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                ->constrained('users')
                ->cascadeOnDelete();
            $table->foreignId('actor_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->string('actor_name', 150);
            $table->string('category', 32)->default('workflow');
            $table->string('type', 64);
            $table->string('variant', 32)->default('reguler');
            $table->string('title', 180);
            $table->text('message');
            $table->string('action_url', 255)->nullable();
            $table->string('dedup_key', 160)->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'read_at', 'updated_at'], 'user_notifications_user_read_updated_idx');
            $table->unique(['user_id', 'dedup_key'], 'user_notifications_user_dedup_unique');
        });

        Schema::create('notification_dismissals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                ->constrained('users')
                ->cascadeOnDelete();
            $table->string('notification_key', 140);
            $table->timestamp('dismissed_at')->useCurrent();

            $table->unique(['user_id', 'notification_key'], 'notification_dismissals_user_key_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_dismissals');
        Schema::dropIfExists('user_notifications');
    }
};
