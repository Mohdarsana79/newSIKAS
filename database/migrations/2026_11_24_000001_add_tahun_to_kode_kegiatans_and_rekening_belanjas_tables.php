<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $defaultYear = (int) date('Y');

        if (! Schema::hasColumn('kode_kegiatans', 'tahun')) {
            Schema::table('kode_kegiatans', function (Blueprint $table) use ($defaultYear) {
                $table->unsignedSmallInteger('tahun')->default($defaultYear)->after('id');
                $table->index('tahun', 'kode_kegiatans_tahun_index');
            });

            Schema::table('kode_kegiatans', function (Blueprint $table) {
                $table->dropUnique('kode_kegiatans_kode_unique');
                $table->unique(['kode', 'tahun'], 'kode_kegiatans_kode_tahun_unique');
            });
        }

        if (! Schema::hasColumn('rekening_belanjas', 'tahun')) {
            Schema::table('rekening_belanjas', function (Blueprint $table) use ($defaultYear) {
                $table->unsignedSmallInteger('tahun')->default($defaultYear)->after('id');
                $table->index('tahun', 'rekening_belanjas_tahun_index');
            });

            Schema::table('rekening_belanjas', function (Blueprint $table) {
                $table->dropUnique('rekening_belanjas_kode_rekening_unique');
                $table->unique(['kode_rekening', 'tahun'], 'rekening_belanjas_kode_rekening_tahun_unique');
            });
        }

        $this->backfillAndCloneExistingMasterData($defaultYear);
        $this->hardenPostgresForeignKeys();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('kode_kegiatans', 'tahun')) {
            Schema::table('kode_kegiatans', function (Blueprint $table) {
                $table->dropUnique('kode_kegiatans_kode_tahun_unique');
                $table->dropIndex('kode_kegiatans_tahun_index');
                $table->dropColumn('tahun');
                $table->unique('kode', 'kode_kegiatans_kode_unique');
            });
        }

        if (Schema::hasColumn('rekening_belanjas', 'tahun')) {
            Schema::table('rekening_belanjas', function (Blueprint $table) {
                $table->dropUnique('rekening_belanjas_kode_rekening_tahun_unique');
                $table->dropIndex('rekening_belanjas_tahun_index');
                $table->dropColumn('tahun');
                $table->unique('kode_rekening', 'rekening_belanjas_kode_rekening_unique');
            });
        }
    }

    /**
     * Memisahkan data master existing (kode_kegiatans & rekening_belanjas) berdasarkan
     * seluruh tahun anggaran yang tercatat pada 4 varian penganggaran, lalu mengarahkan
     * ulang seluruh FK tabel transaksi milik tahun-tahun sebelumnya ke ID master tahunnya.
     */
    protected function backfillAndCloneExistingMasterData(int $fallbackYear): void
    {
        $variantConfigs = [
            [
                'penganggaran_table' => 'penganggarans',
                'penganggaran_fk' => 'penganggaran_id',
                'bku_table' => 'buku_kas_umums',
                'bku_fk' => 'buku_kas_umum_id',
                'bku_detail_table' => 'buku_kas_umum_uraian_details',
                'direct_tables' => [
                    ['table' => 'rkas', 'keg_col' => 'kode_id', 'rek_col' => 'kode_rekening_id'],
                    ['table' => 'rkas_perubahans', 'keg_col' => 'kode_id', 'rek_col' => 'kode_rekening_id'],
                    ['table' => 'buku_kas_umums', 'keg_col' => 'kode_kegiatan_id', 'rek_col' => 'rekening_belanja_id'],
                    ['table' => 'kwitansis', 'keg_col' => 'kode_kegiatan_id', 'rek_col' => 'kode_rekening_id'],
                    ['table' => 'tanda_terimas', 'keg_col' => 'kode_kegiatan_id', 'rek_col' => 'kode_rekening_id'],
                ],
            ],
            [
                'penganggaran_table' => 'kinerja_penganggarans',
                'penganggaran_fk' => 'kinerja_penganggaran_id',
                'bku_table' => 'kinerja_buku_kas_umums',
                'bku_fk' => 'kinerja_buku_kas_umum_id',
                'bku_detail_table' => 'kinerja_buku_kas_umum_uraian_details',
                'direct_tables' => [
                    ['table' => 'kinerja_rkas', 'keg_col' => 'kode_id', 'rek_col' => 'kode_rekening_id'],
                    ['table' => 'kinerja_rkas_perubahans', 'keg_col' => 'kode_id', 'rek_col' => 'kode_rekening_id'],
                    ['table' => 'kinerja_buku_kas_umums', 'keg_col' => 'kode_kegiatan_id', 'rek_col' => 'rekening_belanja_id'],
                    ['table' => 'kinerja_kwitansis', 'keg_col' => 'kode_kegiatan_id', 'rek_col' => 'kode_rekening_id'],
                    ['table' => 'kinerja_tanda_terimas', 'keg_col' => 'kode_kegiatan_id', 'rek_col' => 'kode_rekening_id'],
                ],
            ],
            [
                'penganggaran_table' => 'silpa_penganggarans',
                'penganggaran_fk' => 'silpa_penganggaran_id',
                'bku_table' => 'silpa_buku_kas_umums',
                'bku_fk' => 'silpa_buku_kas_umum_id',
                'bku_detail_table' => 'silpa_buku_kas_umum_uraian_details',
                'direct_tables' => [
                    ['table' => 'silpa_rkas', 'keg_col' => 'kode_id', 'rek_col' => 'kode_rekening_id'],
                    ['table' => 'silpa_buku_kas_umums', 'keg_col' => 'kode_kegiatan_id', 'rek_col' => 'rekening_belanja_id'],
                    ['table' => 'silpa_kwitansis', 'keg_col' => 'kode_kegiatan_id', 'rek_col' => 'kode_rekening_id'],
                    ['table' => 'silpa_tanda_terimas', 'keg_col' => 'kode_kegiatan_id', 'rek_col' => 'kode_rekening_id'],
                ],
            ],
            [
                'penganggaran_table' => 'kinerja_silpa_penganggarans',
                'penganggaran_fk' => 'kinerja_silpa_penganggaran_id',
                'bku_table' => 'kinerja_silpa_buku_kas_umums',
                'bku_fk' => 'kinerja_silpa_buku_kas_umum_id',
                'bku_detail_table' => 'kinerja_silpa_buku_kas_umum_uraian_details',
                'direct_tables' => [
                    ['table' => 'kinerja_silpa_rkas', 'keg_col' => 'kode_id', 'rek_col' => 'kode_rekening_id'],
                    ['table' => 'kinerja_silpa_buku_kas_umums', 'keg_col' => 'kode_kegiatan_id', 'rek_col' => 'rekening_belanja_id'],
                    ['table' => 'kinerja_silpa_kwitansis', 'keg_col' => 'kode_kegiatan_id', 'rek_col' => 'kode_rekening_id'],
                    ['table' => 'kinerja_silpa_tanda_terimas', 'keg_col' => 'kode_kegiatan_id', 'rek_col' => 'kode_rekening_id'],
                ],
            ],
        ];

        $allYears = [];
        foreach ($variantConfigs as $cfg) {
            if (! Schema::hasTable($cfg['penganggaran_table'])) {
                continue;
            }
            $years = DB::table($cfg['penganggaran_table'])
                ->select('tahun_anggaran')
                ->distinct()
                ->pluck('tahun_anggaran');
            foreach ($years as $y) {
                $yInt = (int) $y;
                if ($yInt >= 2000 && $yInt <= 2100) {
                    $allYears[$yInt] = true;
                }
            }
        }

        $sortedYears = array_keys($allYears);
        rsort($sortedYears);

        $latestYear = ! empty($sortedYears) ? $sortedYears[0] : $fallbackYear;

        DB::transaction(function () use ($sortedYears, $latestYear, $variantConfigs) {
            // Tahun terbaru mempertahankan baris master existing (ID tetap).
            DB::table('kode_kegiatans')->update(['tahun' => $latestYear]);
            DB::table('rekening_belanjas')->update(['tahun' => $latestYear]);

            if (count($sortedYears) <= 1) {
                return;
            }

            $baseKegiatans = DB::table('kode_kegiatans')
                ->where('tahun', $latestYear)
                ->orderBy('id')
                ->get();

            $hasPajakCols = Schema::hasColumn('rekening_belanjas', 'is_ppn');
            $baseRekenings = DB::table('rekening_belanjas')
                ->where('tahun', $latestYear)
                ->orderBy('id')
                ->get();

            $now = now();

            foreach (array_slice($sortedYears, 1) as $targetYear) {
                // 1. Kloning master kode_kegiatans ke $targetYear
                $kegIdMap = [];
                foreach ($baseKegiatans as $row) {
                    $newId = DB::table('kode_kegiatans')->insertGetId([
                        'tahun' => $targetYear,
                        'kode' => $row->kode,
                        'program' => $row->program,
                        'sub_program' => $row->sub_program,
                        'uraian' => $row->uraian,
                        'created_at' => $row->created_at ?? $now,
                        'updated_at' => $row->updated_at ?? $now,
                    ]);
                    $kegIdMap[(int) $row->id] = (int) $newId;
                }

                // 2. Kloning master rekening_belanjas ke $targetYear
                $rekIdMap = [];
                foreach ($baseRekenings as $row) {
                    $payload = [
                        'tahun' => $targetYear,
                        'kode_rekening' => $row->kode_rekening,
                        'rincian_objek' => $row->rincian_objek,
                        'kategori' => $row->kategori,
                        'created_at' => $row->created_at ?? $now,
                        'updated_at' => $row->updated_at ?? $now,
                    ];
                    if ($hasPajakCols) {
                        $payload['is_ppn'] = (bool) ($row->is_ppn ?? false);
                        $payload['is_pph21'] = (bool) ($row->is_pph21 ?? false);
                        $payload['is_pph22'] = (bool) ($row->is_pph22 ?? false);
                        $payload['is_pph23'] = (bool) ($row->is_pph23 ?? false);
                        $payload['is_pph4'] = (bool) ($row->is_pph4 ?? false);
                    }
                    $newId = DB::table('rekening_belanjas')->insertGetId($payload);
                    $rekIdMap[(int) $row->id] = (int) $newId;
                }

                // 3. Remap seluruh FK tabel transaksi milik penganggaran bertahun $targetYear
                foreach ($variantConfigs as $cfg) {
                    if (! Schema::hasTable($cfg['penganggaran_table'])) {
                        continue;
                    }

                    $penganggaranIds = DB::table($cfg['penganggaran_table'])
                        ->where('tahun_anggaran', $targetYear)
                        ->pluck('id')
                        ->all();

                    if (empty($penganggaranIds)) {
                        continue;
                    }

                    $pFk = $cfg['penganggaran_fk'];

                    foreach ($cfg['direct_tables'] as $tInfo) {
                        $tableName = $tInfo['table'];
                        if (! Schema::hasTable($tableName)) {
                            continue;
                        }

                        $this->remapColumnByScope($tableName, $pFk, $penganggaranIds, $tInfo['keg_col'], $kegIdMap);
                        $this->remapColumnByScope($tableName, $pFk, $penganggaranIds, $tInfo['rek_col'], $rekIdMap);
                    }

                    // Remap BKU Uraian Details via daftar BKU ID tahun $targetYear
                    if (Schema::hasTable($cfg['bku_table']) && Schema::hasTable($cfg['bku_detail_table'])) {
                        $bkuIds = DB::table($cfg['bku_table'])
                            ->whereIn($pFk, $penganggaranIds)
                            ->pluck('id')
                            ->all();

                        if (! empty($bkuIds)) {
                            $this->remapColumnByScope($cfg['bku_detail_table'], $cfg['bku_fk'], $bkuIds, 'kode_kegiatan_id', $kegIdMap);
                            $this->remapColumnByScope($cfg['bku_detail_table'], $cfg['bku_fk'], $bkuIds, 'rekening_belanja_id', $rekIdMap);
                        }
                    }
                }
            }
        });
    }

    /**
     * Remap satu kolom FK hanya untuk ID lama yang benar-benar muncul pada scope baris target.
     *
     * @param  array<int, int>  $scopeIds
     * @param  array<int, int>  $idMap
     */
    protected function remapColumnByScope(string $table, string $scopeCol, array $scopeIds, string $fkCol, array $idMap): void
    {
        if (empty($scopeIds) || empty($idMap) || ! Schema::hasColumn($table, $fkCol)) {
            return;
        }

        $usedOldIds = DB::table($table)
            ->whereIn($scopeCol, $scopeIds)
            ->whereNotNull($fkCol)
            ->distinct()
            ->pluck($fkCol)
            ->all();

        foreach ($usedOldIds as $oldId) {
            $oldIdInt = (int) $oldId;
            if (! isset($idMap[$oldIdInt])) {
                continue;
            }
            DB::table($table)
                ->whereIn($scopeCol, $scopeIds)
                ->where($fkCol, $oldIdInt)
                ->update([$fkCol => $idMap[$oldIdInt]]);
        }
    }

    /**
     * Mengubah constraint FK ON DELETE CASCADE menjadi ON DELETE RESTRICT pada PostgreSQL
     * agar penghapusan master tidak pernah menghapus transaksi historis secara diam-diam.
     */
    protected function hardenPostgresForeignKeys(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        $cascadingFks = DB::select("
            SELECT
                con.conname AS constraint_name,
                rel.relname AS table_name,
                att.attname AS column_name,
                frel.relname AS foreign_table_name,
                fatt.attname AS foreign_column_name
            FROM pg_constraint con
            JOIN pg_class rel ON rel.oid = con.conrelid
            JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
            JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
            JOIN pg_class frel ON frel.oid = con.confrelid
            JOIN pg_attribute fatt ON fatt.attrelid = con.confrelid AND fatt.attnum = ANY(con.confkey)
            WHERE con.contype = 'f'
              AND con.confdeltype = 'c'
              AND frel.relname IN ('kode_kegiatans', 'rekening_belanjas')
              AND nsp.nspname = current_schema()
        ");

        foreach ($cascadingFks as $fk) {
            $table = '"'.str_replace('"', '""', $fk->table_name).'"';
            $constraint = '"'.str_replace('"', '""', $fk->constraint_name).'"';
            $col = '"'.str_replace('"', '""', $fk->column_name).'"';
            $fTable = '"'.str_replace('"', '""', $fk->foreign_table_name).'"';
            $fCol = '"'.str_replace('"', '""', $fk->foreign_column_name).'"';

            DB::statement("ALTER TABLE {$table} DROP CONSTRAINT {$constraint}");
            DB::statement("ALTER TABLE {$table} ADD CONSTRAINT {$constraint} FOREIGN KEY ({$col}) REFERENCES {$fTable} ({$fCol}) ON DELETE RESTRICT");
        }
    }
};
