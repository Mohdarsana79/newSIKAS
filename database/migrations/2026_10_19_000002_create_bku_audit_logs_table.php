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
        Schema::create('bku_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('sekolah_id')->nullable()->constrained('sekolahs')->nullOnDelete();
            $table->string('variant', 30)->default('reguler');
            $table->integer('tahun');
            $table->string('bulan', 20);
            $table->smallInteger('bulan_angka');
            $table->unsignedBigInteger('penganggaran_id');
            $table->smallInteger('compliance_score')->default(100);
            $table->text('executive_summary')->nullable();
            $table->json('findings')->default('[]');
            $table->json('rules_checked')->default('[]');
            $table->timestamp('last_bku_updated_at')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['variant', 'tahun', 'bulan_angka', 'penganggaran_id'], 'idx_bku_audit_logs_lookup');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bku_audit_logs');
    }
};
