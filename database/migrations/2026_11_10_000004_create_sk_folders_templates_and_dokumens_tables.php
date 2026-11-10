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
        Schema::create('sk_folders', function (Blueprint $table) {
            $table->id();
            $table->string('nama_folder');
            $table->text('deskripsi')->nullable();
            $table->string('warna')->default('indigo');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('sk_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('folder_id')->constrained('sk_folders')->cascadeOnDelete();
            $table->string('judul');
            $table->string('file_path');
            $table->string('file_name_original');
            $table->json('detected_variables')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('sk_dokumens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('folder_id')->constrained('sk_folders')->cascadeOnDelete();
            $table->foreignId('template_id')->nullable()->constrained('sk_templates')->nullOnDelete();
            $table->enum('tipe', ['generated', 'uploaded'])->default('generated');
            $table->string('nomor_surat')->nullable();
            $table->string('perihal');
            $table->date('tanggal_surat')->nullable();
            $table->json('data_isian')->nullable();
            $table->string('file_path')->nullable();
            $table->string('file_name_original')->nullable();
            $table->text('keterangan')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sk_dokumens');
        Schema::dropIfExists('sk_templates');
        Schema::dropIfExists('sk_folders');
    }
};
