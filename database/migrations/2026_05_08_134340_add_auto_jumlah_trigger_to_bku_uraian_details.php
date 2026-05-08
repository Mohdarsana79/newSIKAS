<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Buat fungsi trigger yang menghitung jumlah = volume * harga_satuan
        //    ketika jumlah = 0 atau NULL saat INSERT/UPDATE
        DB::unprepared("
            CREATE OR REPLACE FUNCTION auto_hitung_jumlah_bku()
            RETURNS TRIGGER AS \$\$
            BEGIN
                IF (NEW.jumlah IS NULL OR NEW.jumlah = 0) AND NEW.volume > 0 AND NEW.harga_satuan > 0 THEN
                    NEW.jumlah := NEW.volume * NEW.harga_satuan;
                END IF;
                RETURN NEW;
            END;
            \$\$ LANGUAGE plpgsql;
        ");

        // 2. Pasang trigger BEFORE INSERT OR UPDATE pada tabel buku_kas_umum_uraian_details
        DB::unprepared("
            DROP TRIGGER IF EXISTS trg_auto_hitung_jumlah ON buku_kas_umum_uraian_details;
        ");
        DB::unprepared("
            CREATE TRIGGER trg_auto_hitung_jumlah
            BEFORE INSERT OR UPDATE ON buku_kas_umum_uraian_details
            FOR EACH ROW
            EXECUTE FUNCTION auto_hitung_jumlah_bku();
        ");

        // 3. Perbaiki data yang sudah ada sekarang
        DB::statement("
            UPDATE buku_kas_umum_uraian_details
            SET jumlah = volume * harga_satuan
            WHERE (jumlah IS NULL OR jumlah = 0)
              AND volume > 0
              AND harga_satuan > 0
        ");
    }

    public function down(): void
    {
        DB::unprepared("DROP TRIGGER IF EXISTS trg_auto_hitung_jumlah ON buku_kas_umum_uraian_details;");
        DB::unprepared("DROP FUNCTION IF EXISTS auto_hitung_jumlah_bku();");
    }
};
