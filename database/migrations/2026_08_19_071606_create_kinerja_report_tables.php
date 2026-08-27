<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {

    }

    public function down(): void
    {

        // From 2026_08_19_020810_create_silpa_tanda_terimas_table.php
Schema::dropIfExists('kinerja_tanda_terimas');

        // From 2026_08_19_024817_create_silpa_spmths_table.php
Schema::dropIfExists('kinerja_spmths');

        // From 2026_08_19_024817_create_silpa_sptjs_table.php
Schema::dropIfExists('kinerja_sptjs');

        // From 2026_08_19_024818_create_silpa_lphs_table.php
Schema::dropIfExists('kinerja_lphs');

        // From 2026_08_19_024818_create_silpa_sp2bs_table.php
Schema::dropIfExists('kinerja_sp2bs');

        // From 2026_08_19_053525_create_silpa_dokumens_table.php
Schema::dropIfExists('kinerja_dokumens');

    }
};