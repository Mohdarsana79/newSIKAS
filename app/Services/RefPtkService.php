<?php

namespace App\Services;

use App\Models\RefPtk;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RefPtkService
{
    /**
     * Kode kegiatan pembayaran honor guru/pendidik yang memakai dropdown PTK di ARKAS Desktop.
     */
    public const HONOR_GURU_KEGIATAN_CODE = '07.12.01.';

    /**
     * Kode kegiatan pembayaran honor tendik/administrasi/penunjang yang memakai input manual bebas di ARKAS Desktop.
     *
     * @var array<int, string>
     */
    public const HONOR_MANUAL_KEGIATAN_CODES = [
        '07.12.02.',
        '07.12.03.',
        '07.12.04.',
    ];

    /**
     * Rekening belanja honor guru/pendidik (jenis_ptk_arkas = 10).
     *
     * @var array<int, string>
     */
    public const GURU_REKENING_CODES = [
        '5.1.02.02.01.0013',
    ];

    public function __construct(
        protected ArkasEngineService $arkasEngine
    ) {}

    /**
     * Normalisasi kode kegiatan agar konsisten memiliki titik akhir (mis. "07.12.01" -> "07.12.01.").
     */
    public static function normalizeKegiatanCode(?string $kodeKegiatan): string
    {
        $keg = trim((string) $kodeKegiatan);
        if ($keg === '') {
            return '';
        }

        return str_ends_with($keg, '.') ? $keg : $keg.'.';
    }

    /**
     * Mendeteksi mode Uraian Arkas untuk kegiatan honor sesuai perilaku asli ARKAS Desktop:
     * - 07.12.01. + 5.1.02.02.01.0013 => mode 'ptk' (hanya dropdown PTK Guru aktif, tanpa SSH)
     * - 07.12.02. s.d. 07.12.04.       => mode 'manual' (ketik uraian sendiri, tanpa dropdown PTK/SSH & tanpa batas atas)
     * - lainnya                         => mode 'ssh' (katalog SSH / buku reguler)
     *
     * @return array{mode: 'ptk'|'manual'|'ssh', is_ptk: bool, is_honor_manual: bool, role_filter: 'guru'|null, preferred_jenis: int|null}
     */
    public function detectPtkContext(?string $kodeKegiatan, ?string $kodeRekening): array
    {
        $keg = self::normalizeKegiatanCode($kodeKegiatan);
        $rek = trim((string) $kodeRekening);

        if ($keg !== '' && in_array($keg, self::HONOR_MANUAL_KEGIATAN_CODES, true)) {
            return [
                'mode' => 'manual',
                'is_ptk' => false,
                'is_honor_manual' => true,
                'role_filter' => null,
                'preferred_jenis' => null,
            ];
        }

        if ($keg === self::HONOR_GURU_KEGIATAN_CODE && in_array($rek, self::GURU_REKENING_CODES, true)) {
            return [
                'mode' => 'ptk',
                'is_ptk' => true,
                'is_honor_manual' => false,
                'role_filter' => 'guru',
                'preferred_jenis' => RefPtk::JENIS_GURU,
            ];
        }

        return [
            'mode' => 'ssh',
            'is_ptk' => false,
            'is_honor_manual' => false,
            'role_filter' => null,
            'preferred_jenis' => null,
        ];
    }

    /**
     * Mendeteksi daftar tahun yang tersedia pada tabel ptk di arkas.db + database lokal ref_ptks.
     *
     * @return array<int, string>
     */
    public function resolveActiveYears(bool $includeArkas = true): array
    {
        $localYears = RefPtk::query()
            ->select('tahun')
            ->distinct()
            ->pluck('tahun')
            ->map(static fn ($y) => (string) $y)
            ->all();

        $arkasYears = [];
        if ($includeArkas) {
            $res = $this->arkasEngine->runScriptRaw('dump_reference.py', ['years', '0'], 20);
            if (($res['status'] ?? null) === 'success' && is_array($res['years'] ?? null)) {
                $arkasYears = array_map('strval', $res['years']);
            }
        }

        $merged = array_values(array_filter(
            array_unique(array_merge($arkasYears, $localYears, [(string) date('Y')])),
            static fn ($y) => preg_match('/^\d{4}$/', (string) $y) === 1
        ));

        usort($merged, static fn ($a, $b) => (int) $b <=> (int) $a);

        return $merged;
    }

    /**
     * Ringkasan jumlah PTK per tahun anggaran.
     *
     * @return array<string, array{total: int, guru: int, tendik: int, asn: int, active_honorer: int}>
     */
    public function getStatsPerYear(): array
    {
        $rows = RefPtk::query()
            ->select('tahun', 'jenis_ptk_arkas', 'is_active', DB::raw('COUNT(*) as total'))
            ->groupBy('tahun', 'jenis_ptk_arkas', 'is_active')
            ->get();

        $stats = [];
        foreach ($rows as $row) {
            $yr = (string) $row->tahun;
            if (! isset($stats[$yr])) {
                $stats[$yr] = [
                    'total' => 0,
                    'guru' => 0,
                    'tendik' => 0,
                    'asn' => 0,
                    'active_honorer' => 0,
                ];
            }

            $cnt = (int) $row->total;
            $jenis = (int) $row->jenis_ptk_arkas;
            $active = (bool) $row->is_active;

            $stats[$yr]['total'] += $cnt;
            if ($jenis === RefPtk::JENIS_GURU && $active) {
                $stats[$yr]['guru'] += $cnt;
                $stats[$yr]['active_honorer'] += $cnt;
            } elseif ($jenis === RefPtk::JENIS_TENDIK && $active) {
                $stats[$yr]['tendik'] += $cnt;
                $stats[$yr]['active_honorer'] += $cnt;
            } elseif ($jenis === RefPtk::JENIS_ASN) {
                $stats[$yr]['asn'] += $cnt;
            }
        }

        krsort($stats);

        return $stats;
    }

    /**
     * Sinkronisasi data PTK dari tabel ptk di arkas.db untuk 1 tahun anggaran (atau ALL).
     * Tidak menyentuh baris manual (sumber = 'manual') dan tidak menyentuh tahun lain.
     *
     * @return array{status: string, message: string, inserted?: int, updated?: int, total?: int, year?: string}
     */
    public function syncFromArkas(int|string $year): array
    {
        $yearArg = strtoupper(trim((string) $year)) === 'ALL' ? 'ALL' : (string) (int) $year;
        $pythonResult = $this->arkasEngine->runScriptRaw('dump_reference.py', ['ptk', $yearArg], 60);

        if (isset($pythonResult['error'])) {
            return [
                'status' => 'error',
                'message' => (string) $pythonResult['error'],
            ];
        }

        $rows = is_array($pythonResult['data'] ?? null) ? $pythonResult['data'] : [];
        if (empty($rows)) {
            $label = $yearArg === 'ALL' ? 'semua tahun' : "Tahun {$yearArg}";

            return [
                'status' => 'success',
                'message' => "Tidak ditemukan data PTK pada database ARKAS untuk {$label}.",
                'inserted' => 0,
                'updated' => 0,
                'total' => 0,
                'year' => $yearArg,
            ];
        }

        $inserted = 0;
        $updated = 0;

        DB::transaction(function () use ($rows, &$inserted, &$updated) {
            foreach ($rows as $row) {
                $ptkId = trim((string) ($row['ptk_id'] ?? ''));
                $tahun = (int) ($row['tahun'] ?? 0);
                $nama = trim((string) ($row['nama'] ?? ''));

                if ($ptkId === '' || $tahun < 2000 || $nama === '') {
                    continue;
                }

                $nuptkRaw = trim((string) ($row['nuptk'] ?? ''));
                $payload = [
                    'nuptk' => $nuptkRaw !== '' ? $nuptkRaw : null,
                    'nama' => $nama,
                    'jenis_kelamin' => trim((string) ($row['jenis_kelamin'] ?? '')) ?: null,
                    'jenis_ptk_arkas' => (int) ($row['jenis_ptk_arkas'] ?? RefPtk::JENIS_GURU),
                    'masa_kerja_tahun' => max(0, (int) ($row['masa_kerja_tahun'] ?? 0)),
                    'masa_kerja_bulan' => max(0, (int) ($row['masa_kerja_bulan'] ?? 0)),
                    'pernah_sertifikasi' => (bool) ($row['pernah_sertifikasi'] ?? false),
                    'is_active' => (bool) ($row['is_active'] ?? true),
                    'sumber' => RefPtk::SUMBER_ARKAS,
                ];

                $existing = RefPtk::where('tahun', $tahun)
                    ->where('ptk_id', $ptkId)
                    ->first();

                if ($existing) {
                    $existing->fill($payload);
                    if ($existing->isDirty()) {
                        $existing->save();
                        $updated++;
                    }
                } else {
                    RefPtk::create(array_merge([
                        'tahun' => $tahun,
                        'ptk_id' => $ptkId,
                    ], $payload));
                    $inserted++;
                }
            }
        });

        $label = $yearArg === 'ALL' ? 'semua tahun' : "Tahun {$yearArg}";

        return [
            'status' => 'success',
            'message' => "Sinkronisasi PTK {$label} selesai: {$inserted} baru, {$updated} diperbarui.",
            'inserted' => $inserted,
            'updated' => $updated,
            'total' => count($rows),
            'year' => $yearArg,
        ];
    }

    /**
     * Versi fail-safe untuk dipanggil otomatis saat sync Arkas Tools / Referensi Kode.
     */
    public function syncFromArkasSilently(int|string $year): ?array
    {
        try {
            return $this->syncFromArkas($year);
        } catch (\Throwable $e) {
            Log::warning('Silent PTK sync skipped: '.$e->getMessage());

            return null;
        }
    }

    /**
     * Salin data PTK aktif (Guru & Tendik) dari tahun sumber ke tahun tujuan tanpa menimpa data yang sudah ada.
     *
     * @return array{status: string, message: string, copied?: int}
     */
    public function copyFromYear(int $sourceYear, int $targetYear): array
    {
        if ($sourceYear === $targetYear) {
            return [
                'status' => 'error',
                'message' => 'Tahun sumber dan tahun tujuan harus berbeda.',
            ];
        }

        $sources = RefPtk::forYear($sourceYear)
            ->orderBy('nama')
            ->get();

        if ($sources->isEmpty()) {
            return [
                'status' => 'error',
                'message' => "Tidak ada data PTK pada Tahun {$sourceYear} untuk disalin.",
            ];
        }

        $copied = 0;

        DB::transaction(function () use ($sources, $targetYear, &$copied) {
            foreach ($sources as $src) {
                $existsQuery = RefPtk::forYear($targetYear);

                if ($src->ptk_id) {
                    $exists = (clone $existsQuery)->where('ptk_id', $src->ptk_id)->exists();
                } elseif ($src->nuptk) {
                    $exists = (clone $existsQuery)->where('nuptk', $src->nuptk)->exists();
                } else {
                    $exists = (clone $existsQuery)
                        ->whereRaw('LOWER(TRIM(nama)) = LOWER(TRIM(?))', [$src->nama])
                        ->exists();
                }

                if ($exists) {
                    continue;
                }

                RefPtk::create([
                    'tahun' => $targetYear,
                    'ptk_id' => $src->ptk_id,
                    'nuptk' => $src->nuptk,
                    'nama' => $src->nama,
                    'jenis_kelamin' => $src->jenis_kelamin,
                    'jenis_ptk_arkas' => $src->jenis_ptk_arkas,
                    'masa_kerja_tahun' => $src->masa_kerja_tahun,
                    'masa_kerja_bulan' => $src->masa_kerja_bulan,
                    'pernah_sertifikasi' => $src->pernah_sertifikasi,
                    'is_active' => $src->is_active,
                    'sumber' => RefPtk::SUMBER_MANUAL,
                ]);
                $copied++;
            }
        });

        return [
            'status' => 'success',
            'message' => "Berhasil menyalin {$copied} data PTK dari Tahun {$sourceYear} ke Tahun {$targetYear}.",
            'copied' => $copied,
        ];
    }
}
