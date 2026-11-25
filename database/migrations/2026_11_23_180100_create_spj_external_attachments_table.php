<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('spj_external_attachments', function (Blueprint $table) {
            $table->id();
            $table->string('variant', 32)->index();
            $table->unsignedSmallInteger('tahun_anggaran')->index();
            $table->string('periode_tag', 24)->default('umum');
            $table->string('judul', 180);
            $table->string('kategori', 32)->default('lainnya');
            $table->string('file_path', 255);
            $table->string('original_filename', 255);
            $table->unsignedBigInteger('file_size')->default(0);
            $table->unsignedInteger('sort_order')->default(0);
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['variant', 'tahun_anggaran', 'periode_tag'], 'spj_ext_att_lookup_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('spj_external_attachments');
    }
};
