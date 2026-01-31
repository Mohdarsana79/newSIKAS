<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('penarikan_tunais', function (Blueprint $table) {
            $table->id();
            $table->foreignId('penganggaran_id')->constrained('penganggarans')->onDelete('cascade');
            $table->date('tanggal_penarikan');
            $table->decimal('jumlah_penarikan', 20, 2); // 20 digit to support trillions
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('penarikan_tunais');
    }
};
