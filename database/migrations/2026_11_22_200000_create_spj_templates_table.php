<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('spj_templates', function (Blueprint $table) {
            $table->id();
            $table->string('document_type', 32)->index();
            $table->string('nama', 120);
            $table->string('deskripsi', 255)->nullable();
            $table->string('file_path', 255);
            $table->string('original_filename', 255);
            $table->unsignedBigInteger('file_size')->default(0);
            $table->json('detected_variables')->nullable();
            $table->boolean('has_item_table')->default(false);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['document_type', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('spj_templates');
    }
};
