<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('spj_print_presets', function (Blueprint $table) {
            $table->id();
            $table->string('variant', 32)->index();
            $table->unsignedSmallInteger('tahun_anggaran')->nullable();
            $table->string('nama_preset', 100)->default('Default');
            $table->json('cover_config')->nullable();
            $table->json('bundle_config')->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['variant', 'tahun_anggaran', 'nama_preset'], 'spj_print_presets_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('spj_print_presets');
    }
};
