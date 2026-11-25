<?php

namespace App\Services;

use App\Models\RefSatuan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RefSatuanService
{
    public function __construct(
        protected ArkasEngineService $arkasEngine
    ) {}

    /**
     * Menarik daftar satuan dari arkas.db dan membandingkannya dengan tabel lokal ref_satuans.
     *
     * @return array{status: string, data?: array<int, array<string, mixed>>, message?: string}
     */
    public function fetchArkasComparison(): array
    {
        $pythonResult = $this->arkasEngine->runScriptRaw('dump_reference.py', ['satuan', '0'], 30);

        if (isset($pythonResult['error'])) {
            return [
                'status' => 'error',
                'message' => (string) $pythonResult['error'],
            ];
        }

        $rows = is_array($pythonResult['data'] ?? null) ? $pythonResult['data'] : [];
        $existingMap = RefSatuan::all()->keyBy('ref_satuan_id');

        $data = [];
        foreach ($rows as $row) {
            $id = trim((string) ($row['ref_satuan_id'] ?? ''));
            $satuan = trim((string) ($row['satuan'] ?? ''));
            $unit = trim((string) ($row['unit'] ?? '')) ?: $satuan;
            $isActive = (bool) ($row['is_active'] ?? true);

            if ($id === '' || $satuan === '') {
                continue;
            }

            $existing = $existingMap->get($id);
            if (! $existing) {
                $status = 'Data Baru';
            } elseif (
                trim((string) $existing->satuan) !== $satuan ||
                trim((string) ($existing->unit ?? '')) !== $unit ||
                (bool) $existing->is_active !== $isActive
            ) {
                $status = 'Perlu Update';
            } else {
                $status = 'Sudah Ada';
            }

            $data[] = [
                'ref_satuan_id' => $id,
                'satuan' => $satuan,
                'unit' => $unit,
                'is_active' => $isActive,
                'status' => $status,
            ];
        }

        return [
            'status' => 'success',
            'data' => $data,
        ];
    }

    /**
     * Sinkronisasi daftar satuan baku dari tabel ref_satuan pada arkas.db.
     *
     * @return array{status: string, message: string, inserted?: int, updated?: int, total?: int}
     */
    public function syncFromArkas(): array
    {
        $pythonResult = $this->arkasEngine->runScriptRaw('dump_reference.py', ['satuan', '0'], 30);

        if (isset($pythonResult['error'])) {
            return [
                'status' => 'error',
                'message' => (string) $pythonResult['error'],
            ];
        }

        $rows = is_array($pythonResult['data'] ?? null) ? $pythonResult['data'] : [];
        if (empty($rows)) {
            return [
                'status' => 'success',
                'message' => 'Tidak ditemukan data satuan pada database ARKAS.',
                'inserted' => 0,
                'updated' => 0,
                'total' => 0,
            ];
        }

        $inserted = 0;
        $updated = 0;

        DB::transaction(function () use ($rows, &$inserted, &$updated) {
            foreach ($rows as $row) {
                $id = trim((string) ($row['ref_satuan_id'] ?? ''));
                $satuan = trim((string) ($row['satuan'] ?? ''));
                if ($id === '' || $satuan === '') {
                    continue;
                }

                $payload = [
                    'satuan' => $satuan,
                    'unit' => trim((string) ($row['unit'] ?? '')) ?: $satuan,
                    'is_active' => (bool) ($row['is_active'] ?? true),
                ];

                $existing = RefSatuan::where('ref_satuan_id', $id)->first();
                if ($existing) {
                    $existing->fill($payload);
                    if ($existing->isDirty()) {
                        $existing->save();
                        $updated++;
                    }
                } else {
                    RefSatuan::create(array_merge(['ref_satuan_id' => $id], $payload));
                    $inserted++;
                }
            }
        });

        return [
            'status' => 'success',
            'message' => "Sinkronisasi satuan baku ARKAS selesai: {$inserted} baru, {$updated} diperbarui.",
            'inserted' => $inserted,
            'updated' => $updated,
            'total' => count($rows),
        ];
    }

    public function syncFromArkasSilently(): ?array
    {
        try {
            return $this->syncFromArkas();
        } catch (\Throwable $e) {
            Log::warning('Silent ref_satuan sync skipped: '.$e->getMessage());

            return null;
        }
    }
}
