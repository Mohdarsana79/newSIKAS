<?php

namespace App\Services;

use App\Config\VariantConfig;
use App\Models\KodeKegiatan;
use App\Models\RekeningBelanja;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ReferensiKodeService
{
    public function __construct(
        protected ?ArkasEngineService $arkasEngine = null
    ) {
        $this->arkasEngine = $arkasEngine ?? app(ArkasEngineService::class);
    }

    /**
     * Normalisasi kode kegiatan dengan menghapus spasi & titik di akhir
     * agar '08.04.13' dan '08.04.13.' selalu cocok saat sinkronisasi.
     */
    public function normalizeKodeKegiatan(?string $kode): string
    {
        return rtrim(trim((string) $kode), '.');
    }

    /**
     * Tentukan kategori standar dari prefix kode rekening belanja.
     */
    public function resolveKategoriRekening(string $kodeRekening): string
    {
        $prefix = substr(trim($kodeRekening), 0, 6);

        return match ($prefix) {
            '5.2.02' => 'Modal Peralatan dan Mesin',
            '5.2.04' => 'Modal Jalan, Jaringan, dan Irigasi',
            '5.2.05' => 'Modal Aset Tetap Lainnya',
            default => 'Operasi',
        };
    }

    /**
     * Deteksi cepat daftar tahun referensi yang tersedia di arkas.db.
     *
     * @return array<int, string>
     */
    public function detectArkasYears(): array
    {
        $result = $this->arkasEngine->runScriptRaw('dump_reference.py', ['years', 'ALL'], 15);
        if (($result['status'] ?? null) !== 'success' || ! is_array($result['years'] ?? null)) {
            return [];
        }

        return array_values(array_filter(
            array_map('strval', $result['years']),
            static fn ($y) => preg_match('/^\d{4}$/', $y) === 1
        ));
    }

    /**
     * Kumpulkan daftar tahun aktif (gabungan master lokal, 4 tabel penganggaran, tahun berjalan, dan opsional ARKAS).
     *
     * @return array<int, string>
     */
    public function resolveActiveYears(bool $includeArkas = false): array
    {
        $years = [(string) date('Y')];

        if (Schema::hasTable('kode_kegiatans')) {
            $kegYears = KodeKegiatan::query()->select('tahun')->distinct()->pluck('tahun')->map(fn ($y) => (string) $y)->all();
            $years = array_merge($years, $kegYears);
        }

        if (Schema::hasTable('rekening_belanjas')) {
            $rekYears = RekeningBelanja::query()->select('tahun')->distinct()->pluck('tahun')->map(fn ($y) => (string) $y)->all();
            $years = array_merge($years, $rekYears);
        }

        foreach (VariantConfig::VARIANTS as $variant) {
            $modelClass = VariantConfig::getModelClass('penganggaran', $variant);
            if (! $modelClass || ! class_exists($modelClass)) {
                continue;
            }
            $table = (new $modelClass)->getTable();
            if (! Schema::hasTable($table)) {
                continue;
            }
            $pYears = DB::table($table)->select('tahun_anggaran')->distinct()->pluck('tahun_anggaran')->map(fn ($y) => (string) $y)->all();
            $years = array_merge($years, $pYears);
        }

        if ($includeArkas) {
            $years = array_merge($years, $this->detectArkasYears());
        }

        $unique = array_values(array_filter(
            array_unique($years),
            static fn ($y) => preg_match('/^\d{4}$/', (string) $y) === 1
        ));

        usort($unique, static fn ($a, $b) => (int) $b <=> (int) $a);

        return $unique;
    }

    /**
     * Ringkasan jumlah kode kegiatan & rekening belanja lokal per tahun.
     *
     * @return array<string, array{kegiatan: int, rekening: int}>
     */
    public function getStatsPerYear(): array
    {
        $stats = [];

        if (Schema::hasTable('kode_kegiatans')) {
            $kegCounts = KodeKegiatan::query()
                ->select('tahun', DB::raw('count(*) as total'))
                ->groupBy('tahun')
                ->pluck('total', 'tahun');

            foreach ($kegCounts as $yr => $total) {
                $key = (string) $yr;
                $stats[$key] = [
                    'kegiatan' => (int) $total,
                    'rekening' => $stats[$key]['rekening'] ?? 0,
                ];
            }
        }

        if (Schema::hasTable('rekening_belanjas')) {
            $rekCounts = RekeningBelanja::query()
                ->select('tahun', DB::raw('count(*) as total'))
                ->groupBy('tahun')
                ->pluck('total', 'tahun');

            foreach ($rekCounts as $yr => $total) {
                $key = (string) $yr;
                $stats[$key] = [
                    'kegiatan' => $stats[$key]['kegiatan'] ?? 0,
                    'rekening' => (int) $total,
                ];
            }
        }

        krsort($stats);

        return $stats;
    }

    /**
     * Cari tahun terdekat sebelum $targetYear yang memiliki data referensi lengkap (atau sebagian).
     */
    public function findPreviousYearWithReference(int $targetYear, string $tipe = 'both'): ?int
    {
        $stats = $this->getStatsPerYear();
        $candidates = [];

        foreach ($stats as $yrStr => $counts) {
            $yr = (int) $yrStr;
            if ($yr >= $targetYear) {
                continue;
            }
            $hasData = match ($tipe) {
                'kegiatan' => ($counts['kegiatan'] ?? 0) > 0,
                'rekening' => ($counts['rekening'] ?? 0) > 0,
                default => ($counts['kegiatan'] ?? 0) > 0 || ($counts['rekening'] ?? 0) > 0,
            };
            if ($hasData) {
                $candidates[] = $yr;
            }
        }

        if (empty($candidates)) {
            return null;
        }

        rsort($candidates);

        return $candidates[0];
    }

    /**
     * Daftar tahun anggaran yang sudah memiliki transaksi (RKAS, RKAS Perubahan, atau BKU) di salah satu dari 4 varian.
     *
     * @return array<int, string>
     */
    public function getYearsWithTransactions(): array
    {
        $years = [];

        foreach (VariantConfig::VARIANTS as $variant) {
            $pClass = VariantConfig::getModelClass('penganggaran', $variant);
            if (! $pClass || ! class_exists($pClass)) {
                continue;
            }
            $pTable = (new $pClass)->getTable();
            if (! Schema::hasTable($pTable)) {
                continue;
            }

            $pFk = VariantConfig::penganggaranFk($variant);
            $penganggarans = DB::table($pTable)->select('id', 'tahun_anggaran')->get();
            if ($penganggarans->isEmpty()) {
                continue;
            }

            $txModels = array_filter([
                VariantConfig::getModelClass('rkas', $variant),
                VariantConfig::getModelClass('rkas_perubahan', $variant),
                VariantConfig::getModelClass('bku', $variant),
            ]);

            foreach ($penganggarans as $p) {
                $yrStr = (string) $p->tahun_anggaran;
                if (isset($years[$yrStr])) {
                    continue;
                }
                foreach ($txModels as $mClass) {
                    if (! class_exists($mClass)) {
                        continue;
                    }
                    $tName = (new $mClass)->getTable();
                    if (Schema::hasTable($tName) && DB::table($tName)->where($pFk, $p->id)->exists()) {
                        $years[$yrStr] = true;
                        break;
                    }
                }
            }
        }

        $result = array_map('strval', array_keys($years));
        usort($result, static fn ($a, $b) => (int) $b <=> (int) $a);

        return $result;
    }

    /**
     * Hitung total baris transaksi di seluruh 4 varian (20 tabel) yang masih menggunakan ID master ini.
     */
    public function countUsage(string $tipe, int $id): int
    {
        $total = 0;

        $conceptColumns = $tipe === 'kegiatan'
            ? [
                'rkas' => 'kode_id',
                'rkas_perubahan' => 'kode_id',
                'bku' => 'kode_kegiatan_id',
                'bku_uraian_detail' => 'kode_kegiatan_id',
                'kwitansi' => 'kode_kegiatan_id',
                'tanda_terima' => 'kode_kegiatan_id',
            ]
            : [
                'rkas' => 'kode_rekening_id',
                'rkas_perubahan' => 'kode_rekening_id',
                'bku' => 'rekening_belanja_id',
                'bku_uraian_detail' => 'rekening_belanja_id',
                'kwitansi' => 'kode_rekening_id',
                'tanda_terima' => 'kode_rekening_id',
            ];

        foreach ($conceptColumns as $concept => $column) {
            foreach (VariantConfig::VARIANTS as $variant) {
                $modelClass = VariantConfig::getModelClass($concept, $variant);
                if (! $modelClass || ! class_exists($modelClass)) {
                    continue;
                }
                $table = (new $modelClass)->getTable();
                if (! Schema::hasTable($table) || ! Schema::hasColumn($table, $column)) {
                    continue;
                }
                $total += DB::table($table)->where($column, $id)->count();
            }
        }

        return $total;
    }

    /**
     * Tarik referensi dari ARKAS untuk tahun tertentu dan bandingkan ketat dengan data lokal tahun tersebut.
     *
     * @return array<string, mixed>
     */
    public function fetchArkasComparison(string $tipe, int $year): array
    {
        if (! in_array($tipe, ['kegiatan', 'rekening'], true)) {
            return ['status' => 'error', 'message' => 'Tipe referensi tidak valid.'];
        }

        $result = $this->arkasEngine->runScriptRaw('dump_reference.py', [$tipe, (string) $year], 60);
        if (isset($result['error']) || ($result['status'] ?? null) === 'error') {
            return [
                'status' => 'error',
                'message' => (string) ($result['error'] ?? $result['message'] ?? 'Gagal menarik data dari ARKAS.'),
            ];
        }

        $data = $result['data'] ?? [];

        if ($tipe === 'kegiatan') {
            $existingByNorm = [];
            foreach (KodeKegiatan::forYear($year)->select(['kode', 'sumber_dana', 'program', 'sub_program', 'uraian'])->get() as $row) {
                $norm = $this->normalizeKodeKegiatan($row->kode);
                if ($norm !== '') {
                    $existingByNorm[$norm] = [
                        'kode' => $row->kode,
                        'sumber_dana' => (string) ($row->sumber_dana ?: KodeKegiatan::SUMBER_REGULER),
                        'program' => (string) $row->program,
                        'sub_program' => (string) $row->sub_program,
                        'uraian' => (string) $row->uraian,
                    ];
                }
            }

            foreach ($data as &$row) {
                $norm = $this->normalizeKodeKegiatan((string) ($row['id_kode'] ?? ''));
                $sumberDana = in_array($row['sumber_dana'] ?? '', KodeKegiatan::VALID_SUMBER_DANA, true)
                    ? (string) $row['sumber_dana']
                    : KodeKegiatan::SUMBER_REGULER;
                $row['sumber_dana'] = $sumberDana;

                if (! isset($existingByNorm[$norm])) {
                    $row['status'] = 'Data Baru';
                } else {
                    $ex = $existingByNorm[$norm];
                    $changed = (
                        $ex['sumber_dana'] !== $sumberDana ||
                        $ex['program'] !== trim((string) ($row['program'] ?? '')) ||
                        $ex['sub_program'] !== trim((string) ($row['sub_program'] ?? '')) ||
                        $ex['uraian'] !== trim((string) ($row['uraian_kode'] ?? ''))
                    );
                    $row['status'] = $changed ? 'Perlu Update' : 'Sudah Ada';
                }
            }
            unset($row);
        } else {
            $existingByKode = RekeningBelanja::forYear($year)
                ->select(['kode_rekening', 'rincian_objek', 'kategori', 'is_ppn', 'is_pph21', 'is_pph22', 'is_pph23', 'is_pph4'])
                ->get()
                ->keyBy(fn ($r) => trim((string) $r->kode_rekening))
                ->toArray();

            foreach ($data as &$row) {
                $kode = trim((string) ($row['kode_rekening'] ?? ''));
                if (! isset($existingByKode[$kode])) {
                    $row['status'] = 'Data Baru';
                } else {
                    $ex = $existingByKode[$kode];
                    $kat = $this->resolveKategoriRekening($kode);
                    $newRincian = trim((string) ($row['rekening'] ?? ''));
                    $newPpn = ! empty($row['is_ppn']) ? 1 : 0;
                    $newPph21 = ! empty($row['is_pph21']) ? 1 : 0;
                    $newPph22 = ! empty($row['is_pph22']) ? 1 : 0;
                    $newPph23 = ! empty($row['is_pph23']) ? 1 : 0;
                    $newPph4 = ! empty($row['is_pph4']) ? 1 : 0;

                    $changed = (
                        trim((string) ($ex['rincian_objek'] ?? '')) !== $newRincian ||
                        (string) ($ex['kategori'] ?? '') !== $kat ||
                        (int) ($ex['is_ppn'] ?? 0) !== $newPpn ||
                        (int) ($ex['is_pph21'] ?? 0) !== $newPph21 ||
                        (int) ($ex['is_pph22'] ?? 0) !== $newPph22 ||
                        (int) ($ex['is_pph23'] ?? 0) !== $newPph23 ||
                        (int) ($ex['is_pph4'] ?? 0) !== $newPph4
                    );
                    $row['status'] = $changed ? 'Perlu Update' : 'Sudah Ada';
                }
            }
            unset($row);
        }

        return [
            'status' => 'success',
            'year' => $year,
            'bentuk_pendidikan_id' => $result['bentuk_pendidikan_id'] ?? null,
            'data' => $data,
        ];
    }

    /**
     * Sinkronisasi referensi dari ARKAS ketat untuk 1 tahun tertentu tanpa menyentuh tahun lain.
     *
     * @return array<string, mixed>
     */
    public function syncFromArkas(string $tipe, int $year): array
    {
        if (! in_array($tipe, ['kegiatan', 'rekening'], true)) {
            return ['status' => 'error', 'message' => 'Tipe referensi tidak valid.'];
        }

        $result = $this->arkasEngine->runScriptRaw('dump_reference.py', [$tipe, (string) $year], 120);
        if (isset($result['error']) || ($result['status'] ?? null) === 'error') {
            return [
                'status' => 'error',
                'message' => (string) ($result['error'] ?? $result['message'] ?? 'Gagal menarik data dari ARKAS.'),
            ];
        }

        $data = $result['data'] ?? [];
        $syncedCount = 0;
        $updatedCount = 0;
        $now = now();

        if ($tipe === 'kegiatan') {
            $existingByNorm = [];
            foreach (KodeKegiatan::forYear($year)->select(['id', 'kode', 'sumber_dana', 'program', 'sub_program', 'uraian'])->get() as $row) {
                $norm = $this->normalizeKodeKegiatan($row->kode);
                if ($norm !== '' && ! isset($existingByNorm[$norm])) {
                    $existingByNorm[$norm] = $row;
                }
            }

            $inserts = [];
            $seenNewNorm = [];

            DB::transaction(function () use ($data, $year, $now, $existingByNorm, &$inserts, &$seenNewNorm, &$syncedCount, &$updatedCount) {
                foreach ($data as $row) {
                    $kode = trim((string) ($row['id_kode'] ?? ''));
                    $norm = $this->normalizeKodeKegiatan($kode);
                    if ($norm === '') {
                        continue;
                    }

                    $sumberDana = in_array($row['sumber_dana'] ?? '', KodeKegiatan::VALID_SUMBER_DANA, true)
                        ? (string) $row['sumber_dana']
                        : KodeKegiatan::SUMBER_REGULER;
                    $program = trim((string) ($row['program'] ?? ''));
                    $subProgram = trim((string) ($row['sub_program'] ?? ''));
                    $uraian = trim((string) ($row['uraian_kode'] ?? ''));

                    if (! isset($existingByNorm[$norm])) {
                        if (isset($seenNewNorm[$norm])) {
                            continue;
                        }
                        $seenNewNorm[$norm] = true;
                        $inserts[] = [
                            'tahun' => $year,
                            'sumber_dana' => $sumberDana,
                            'kode' => $kode,
                            'program' => $program,
                            'sub_program' => $subProgram,
                            'uraian' => $uraian,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ];
                        $syncedCount++;
                    } else {
                        $ex = $existingByNorm[$norm];
                        $changed = (
                            (string) ($ex->sumber_dana ?: KodeKegiatan::SUMBER_REGULER) !== $sumberDana ||
                            (string) $ex->program !== $program ||
                            (string) $ex->sub_program !== $subProgram ||
                            (string) $ex->uraian !== $uraian
                        );

                        if ($changed) {
                            KodeKegiatan::query()
                                ->where('id', $ex->id)
                                ->update([
                                    'sumber_dana' => $sumberDana,
                                    'program' => $program,
                                    'sub_program' => $subProgram,
                                    'uraian' => $uraian,
                                    'updated_at' => $now,
                                ]);
                            $updatedCount++;
                        }
                    }
                }

                if (! empty($inserts)) {
                    foreach (array_chunk($inserts, 500) as $chunk) {
                        KodeKegiatan::insert($chunk);
                    }
                }
            });
        } else {
            $existingMap = RekeningBelanja::forYear($year)
                ->select(['id', 'kode_rekening', 'rincian_objek', 'kategori', 'is_ppn', 'is_pph21', 'is_pph22', 'is_pph23', 'is_pph4'])
                ->get()
                ->keyBy(fn ($r) => trim((string) $r->kode_rekening));

            $inserts = [];
            $seenNewKode = [];

            DB::transaction(function () use ($data, $year, $now, $existingMap, &$inserts, &$seenNewKode, &$syncedCount, &$updatedCount) {
                foreach ($data as $row) {
                    $kode = trim((string) ($row['kode_rekening'] ?? ''));
                    if ($kode === '') {
                        continue;
                    }

                    $rincianObjek = trim((string) ($row['rekening'] ?? ''));
                    $kategori = $this->resolveKategoriRekening($kode);
                    $newPpn = ! empty($row['is_ppn']) ? 1 : 0;
                    $newPph21 = ! empty($row['is_pph21']) ? 1 : 0;
                    $newPph22 = ! empty($row['is_pph22']) ? 1 : 0;
                    $newPph23 = ! empty($row['is_pph23']) ? 1 : 0;
                    $newPph4 = ! empty($row['is_pph4']) ? 1 : 0;

                    if (! $existingMap->has($kode)) {
                        if (isset($seenNewKode[$kode])) {
                            continue;
                        }
                        $seenNewKode[$kode] = true;
                        $inserts[] = [
                            'tahun' => $year,
                            'kode_rekening' => $kode,
                            'rincian_objek' => $rincianObjek,
                            'kategori' => $kategori,
                            'is_ppn' => $newPpn,
                            'is_pph21' => $newPph21,
                            'is_pph22' => $newPph22,
                            'is_pph23' => $newPph23,
                            'is_pph4' => $newPph4,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ];
                        $syncedCount++;
                    } else {
                        $ex = $existingMap->get($kode);
                        $changed = (
                            trim((string) $ex->rincian_objek) !== $rincianObjek ||
                            (string) $ex->kategori !== $kategori ||
                            (int) $ex->is_ppn !== $newPpn ||
                            (int) $ex->is_pph21 !== $newPph21 ||
                            (int) $ex->is_pph22 !== $newPph22 ||
                            (int) $ex->is_pph23 !== $newPph23 ||
                            (int) $ex->is_pph4 !== $newPph4
                        );

                        if ($changed) {
                            RekeningBelanja::query()
                                ->where('id', $ex->id)
                                ->update([
                                    'rincian_objek' => $rincianObjek,
                                    'kategori' => $kategori,
                                    'is_ppn' => $newPpn,
                                    'is_pph21' => $newPph21,
                                    'is_pph22' => $newPph22,
                                    'is_pph23' => $newPph23,
                                    'is_pph4' => $newPph4,
                                    'updated_at' => $now,
                                ]);
                            $updatedCount++;
                        }
                    }
                }

                if (! empty($inserts)) {
                    foreach (array_chunk($inserts, 500) as $chunk) {
                        RekeningBelanja::insert($chunk);
                    }
                }
            });
        }

        $label = $tipe === 'kegiatan' ? 'Kode Kegiatan' : 'Rekening Belanja';
        $message = "Berhasil sinkronisasi {$label} tahun {$year}: {$syncedCount} data baru";
        if ($updatedCount > 0) {
            $message .= " dan {$updatedCount} data diperbarui";
        }
        $message .= '.';

        return [
            'status' => 'success',
            'year' => $year,
            'message' => $message,
            'synced' => $syncedCount,
            'updated' => $updatedCount,
        ];
    }

    /**
     * Salin referensi kode kegiatan dan/atau rekening belanja dari satu tahun ke tahun lain secara idempoten.
     *
     * @return array<string, mixed>
     */
    public function copyFromYear(string $tipe, int $sourceYear, int $targetYear): array
    {
        if (! in_array($tipe, ['kegiatan', 'rekening', 'both'], true)) {
            return ['status' => 'error', 'message' => 'Tipe penyalinan tidak valid.'];
        }

        if ($sourceYear === $targetYear) {
            return ['status' => 'error', 'message' => 'Tahun sumber dan tahun tujuan tidak boleh sama.'];
        }

        $copiedKegiatan = 0;
        $copiedRekening = 0;
        $skippedKegiatan = 0;
        $skippedRekening = 0;
        $now = now();

        DB::transaction(function () use (
            $tipe,
            $sourceYear,
            $targetYear,
            $now,
            &$copiedKegiatan,
            &$copiedRekening,
            &$skippedKegiatan,
            &$skippedRekening
        ) {
            if ($tipe === 'kegiatan' || $tipe === 'both') {
                $existingNorms = [];
                foreach (KodeKegiatan::forYear($targetYear)->pluck('kode') as $k) {
                    $existingNorms[$this->normalizeKodeKegiatan((string) $k)] = true;
                }

                $sourceRows = KodeKegiatan::forYear($sourceYear)->orderBy('id')->get();
                $inserts = [];
                foreach ($sourceRows as $row) {
                    $norm = $this->normalizeKodeKegiatan($row->kode);
                    if (isset($existingNorms[$norm])) {
                        $skippedKegiatan++;

                        continue;
                    }
                    $existingNorms[$norm] = true;
                    $inserts[] = [
                        'tahun' => $targetYear,
                        'sumber_dana' => $row->sumber_dana ?: KodeKegiatan::SUMBER_REGULER,
                        'kode' => $row->kode,
                        'program' => $row->program,
                        'sub_program' => $row->sub_program,
                        'uraian' => $row->uraian,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                    $copiedKegiatan++;
                }

                foreach (array_chunk($inserts, 500) as $chunk) {
                    KodeKegiatan::insert($chunk);
                }
            }

            if ($tipe === 'rekening' || $tipe === 'both') {
                $existingKodes = RekeningBelanja::forYear($targetYear)
                    ->pluck('kode_rekening')
                    ->map(fn ($k) => trim((string) $k))
                    ->flip()
                    ->all();

                $sourceRows = RekeningBelanja::forYear($sourceYear)->orderBy('id')->get();
                $inserts = [];
                foreach ($sourceRows as $row) {
                    $kode = trim((string) $row->kode_rekening);
                    if (isset($existingKodes[$kode])) {
                        $skippedRekening++;

                        continue;
                    }
                    $existingKodes[$kode] = true;
                    $inserts[] = [
                        'tahun' => $targetYear,
                        'kode_rekening' => $kode,
                        'rincian_objek' => $row->rincian_objek,
                        'kategori' => $row->kategori,
                        'is_ppn' => (bool) $row->is_ppn,
                        'is_pph21' => (bool) $row->is_pph21,
                        'is_pph22' => (bool) $row->is_pph22,
                        'is_pph23' => (bool) $row->is_pph23,
                        'is_pph4' => (bool) $row->is_pph4,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                    $copiedRekening++;
                }

                foreach (array_chunk($inserts, 500) as $chunk) {
                    RekeningBelanja::insert($chunk);
                }
            }
        });

        $parts = [];
        if ($tipe === 'kegiatan' || $tipe === 'both') {
            $parts[] = "{$copiedKegiatan} Kode Kegiatan";
        }
        if ($tipe === 'rekening' || $tipe === 'both') {
            $parts[] = "{$copiedRekening} Rekening Belanja";
        }

        return [
            'status' => 'success',
            'source_year' => $sourceYear,
            'target_year' => $targetYear,
            'copied_kegiatan' => $copiedKegiatan,
            'copied_rekening' => $copiedRekening,
            'skipped_kegiatan' => $skippedKegiatan,
            'skipped_rekening' => $skippedRekening,
            'message' => 'Berhasil menyalin '.implode(' dan ', $parts)." dari tahun {$sourceYear} ke tahun {$targetYear}.",
        ];
    }
}
