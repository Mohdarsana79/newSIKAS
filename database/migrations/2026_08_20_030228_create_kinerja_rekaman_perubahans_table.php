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
        Schema::create("kinerja_rekaman_perubahans", function (Blueprint $table) {
            $table->id();
            $table->foreignId("kinerja_penganggaran_id")->constrained("kinerja_penganggarans")->onDelete("cascade");
            $table->string("action"); // "create", "update", "delete", "copy"
            $table->text("description");
            $table->json("old_data")->nullable(); // Store previous state if needed
            $table->json("new_data")->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists("kinerja_rekaman_perubahans");
    }
};

