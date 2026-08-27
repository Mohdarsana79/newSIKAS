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
        Schema::create("kinerja_rkas_perubahans", function (Blueprint $table) {
            $table->id();
            $table->foreignId("kode_id")->constrained("kode_kegiatans")->onDelete("cascade");
            $table->foreignId("kode_rekening_id")->constrained("rekening_belanjas")->onDelete("cascade");
            $table->foreignId("kinerja_penganggaran_id")->constrained("kinerja_penganggarans")->onDelete("cascade");
            $table->string("uraian");
            $table->decimal("harga_satuan", 15, 2);
            $table->enum("bulan", ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]);
            $table->integer("jumlah");
            $table->string("satuan");
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists("kinerja_rkas_perubahans");
    }
};

