<?php

namespace App\Http\Controllers;

use App\Models\KodeKegiatan;
use App\Models\RekeningBelanja;
use App\Services\ArkasEngineService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ReferensiKodeController extends Controller
{
    public function index()
    {
        return Inertia::render('ArkasTools/ReferensiKode');
    }

    public function fetch(Request $request)
    {
        $tipe = $request->input('tipe'); // 'kegiatan' atau 'rekening'
        $year = $request->input('year', '2026');

        if (! in_array($tipe, ['kegiatan', 'rekening'])) {
            return response()->json(['status' => 'error', 'message' => 'Tipe referensi tidak valid']);
        }

        $result = app(ArkasEngineService::class)->runScriptRaw(
            'dump_reference.py',
            [(string) $tipe, (string) $year],
            60
        );

        if (isset($result['error'])) {
            return response()->json(['status' => 'error', 'message' => $result['error']]);
        }

        $data = $result['data'] ?? [];

        $existingRekening = [];
        $existingKegiatan = [];
        if ($tipe === 'kegiatan') {
            $existingKegiatan = KodeKegiatan::query()
                ->select(['kode', 'program', 'sub_program', 'uraian'])
                ->get()
                ->keyBy('kode')
                ->toArray();
            $existing = array_keys($existingKegiatan);
        } else {
            // Untuk rekening: ambil seluruh data beserta nilai pajaknya
            $existingRekening = RekeningBelanja::query()
                ->select(['kode_rekening', 'kategori', 'is_ppn', 'is_pph21', 'is_pph22', 'is_pph23', 'is_pph4'])
                ->get()
                ->keyBy('kode_rekening')
                ->toArray();
            $existing = array_keys($existingRekening);
        }

        foreach ($data as &$row) {
            if ($tipe === 'kegiatan') {
                $kode = $row['id_kode'];
                if (! isset($existingKegiatan[$kode])) {
                    $row['status'] = 'Data Baru';
                } else {
                    $ex = $existingKegiatan[$kode];
                    $changed = (
                        $ex['program'] !== ($row['program'] ?? '') ||
                        $ex['sub_program'] !== ($row['sub_program'] ?? '') ||
                        $ex['uraian'] !== ($row['uraian_kode'] ?? '')
                    );
                    $row['status'] = $changed ? 'Perlu Update' : 'Sudah Ada';
                }
            } else {
                $kode = $row['kode_rekening'];
                if (! isset($existingRekening[$kode])) {
                    $row['status'] = 'Data Baru';
                } else {
                    // Deteksi perubahan kategori / pajak
                    $ex = $existingRekening[$kode];
                    $prefix = substr($kode, 0, 6);
                    if ($prefix === '5.2.02') {
                        $kat = 'Modal Peralatan dan Mesin';
                    } elseif ($prefix === '5.2.04') {
                        $kat = 'Modal Jalan, Jaringan, dan Irigasi';
                    } elseif ($prefix === '5.2.05') {
                        $kat = 'Modal Aset Tetap Lainnya';
                    } else {
                        $kat = 'Operasi';
                    }

                    $newPpn = isset($row['is_ppn']) && $row['is_ppn'] ? 1 : 0;
                    $newPph21 = isset($row['is_pph21']) && $row['is_pph21'] ? 1 : 0;
                    $newPph22 = isset($row['is_pph22']) && $row['is_pph22'] ? 1 : 0;
                    $newPph23 = isset($row['is_pph23']) && $row['is_pph23'] ? 1 : 0;
                    $newPph4 = isset($row['is_pph4']) && $row['is_pph4'] ? 1 : 0;

                    $changed = (
                        (int) $ex['is_ppn'] !== $newPpn ||
                        (int) $ex['is_pph21'] !== $newPph21 ||
                        (int) $ex['is_pph22'] !== $newPph22 ||
                        (int) $ex['is_pph23'] !== $newPph23 ||
                        (int) $ex['is_pph4'] !== $newPph4 ||
                        $ex['kategori'] !== $kat
                    );

                    $row['status'] = $changed ? 'Perlu Update' : 'Sudah Ada';
                }
            }
        }

        return response()->json(['status' => 'success', 'data' => $data]);
    }

    public function sync(Request $request)
    {
        $tipe = $request->input('tipe');
        $year = $request->input('year', '2026');

        if (! in_array($tipe, ['kegiatan', 'rekening'])) {
            return response()->json(['status' => 'error', 'message' => 'Tipe referensi tidak valid']);
        }

        $result = app(ArkasEngineService::class)->runScriptRaw(
            'dump_reference.py',
            [(string) $tipe, (string) $year],
            120
        );

        if (isset($result['error'])) {
            return response()->json(['status' => 'error', 'message' => $result['error']]);
        }

        $data = $result['data'] ?? [];
        $syncedCount = 0;

        // Menggunakan array untuk mempercepat pengecekan
        if ($tipe === 'kegiatan') {
            $existingMap = KodeKegiatan::query()
                ->select(['kode', 'program', 'sub_program', 'uraian'])
                ->get()
                ->keyBy('kode')
                ->toArray();

            $inserts = [];
            $updatedCount = 0;

            foreach ($data as $row) {
                if (! isset($existingMap[$row['id_kode']])) {
                    $inserts[] = [
                        'kode' => $row['id_kode'],
                        'program' => $row['program'] ?? '',
                        'sub_program' => $row['sub_program'] ?? '',
                        'uraian' => $row['uraian_kode'] ?? '',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                    $syncedCount++;
                } else {
                    $ex = $existingMap[$row['id_kode']];
                    $changed = (
                        $ex['program'] !== ($row['program'] ?? '') ||
                        $ex['sub_program'] !== ($row['sub_program'] ?? '') ||
                        $ex['uraian'] !== ($row['uraian_kode'] ?? '')
                    );

                    if ($changed) {
                        KodeKegiatan::query()
                            ->where('kode', $row['id_kode'])
                            ->update([
                                'program' => $row['program'] ?? '',
                                'sub_program' => $row['sub_program'] ?? '',
                                'uraian' => $row['uraian_kode'] ?? '',
                                'updated_at' => now(),
                            ]);
                        $updatedCount++;
                    }
                }
            }
            if (count($inserts) > 0) {
                // Chunk insert untuk performa (karena bisa ribuan data)
                foreach (array_chunk($inserts, 500) as $chunk) {
                    KodeKegiatan::insert($chunk);
                }
            }

            $message = "Berhasil sinkronisasi $syncedCount data baru";
            if ($updatedCount > 0) {
                $message .= " dan memperbarui $updatedCount data yang berubah";
            }
            $message .= '.';

            return response()->json([
                'status' => 'success',
                'message' => $message,
                'synced' => $syncedCount,
                'updated' => $updatedCount,
            ]);

        } else {
            // Ambil semua data yang sudah ada, beserta nilai pajaknya
            $existingMap = RekeningBelanja::query()
                ->select(['kode_rekening', 'kategori', 'is_ppn', 'is_pph21', 'is_pph22', 'is_pph23', 'is_pph4'])
                ->get()
                ->keyBy('kode_rekening')
                ->toArray();

            $inserts = [];
            $updates = [];
            $updatedCount = 0;

            foreach ($data as $row) {
                $prefix = substr($row['kode_rekening'], 0, 6);
                if ($prefix === '5.2.02') {
                    $kategori = 'Modal Peralatan dan Mesin';
                } elseif ($prefix === '5.2.04') {
                    $kategori = 'Modal Jalan, Jaringan, dan Irigasi';
                } elseif ($prefix === '5.2.05') {
                    $kategori = 'Modal Aset Tetap Lainnya';
                } else {
                    $kategori = 'Operasi';
                }

                $newIsppn = isset($row['is_ppn']) && $row['is_ppn'] ? 1 : 0;
                $newIspph21 = isset($row['is_pph21']) && $row['is_pph21'] ? 1 : 0;
                $newIspph22 = isset($row['is_pph22']) && $row['is_pph22'] ? 1 : 0;
                $newIspph23 = isset($row['is_pph23']) && $row['is_pph23'] ? 1 : 0;
                $newIspph4 = isset($row['is_pph4']) && $row['is_pph4'] ? 1 : 0;

                if (! isset($existingMap[$row['kode_rekening']])) {
                    // Data baru: insert
                    $inserts[] = [
                        'kode_rekening' => $row['kode_rekening'],
                        'rincian_objek' => $row['rekening'] ?? '',
                        'kategori' => $kategori,
                        'is_ppn' => $newIsppn,
                        'is_pph21' => $newIspph21,
                        'is_pph22' => $newIspph22,
                        'is_pph23' => $newIspph23,
                        'is_pph4' => $newIspph4,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                    $syncedCount++;
                } else {
                    // Data sudah ada: cek apakah pajak atau kategori berbeda
                    $existing = $existingMap[$row['kode_rekening']];
                    $changed = (
                        (int) $existing['is_ppn'] !== $newIsppn ||
                        (int) $existing['is_pph21'] !== $newIspph21 ||
                        (int) $existing['is_pph22'] !== $newIspph22 ||
                        (int) $existing['is_pph23'] !== $newIspph23 ||
                        (int) $existing['is_pph4'] !== $newIspph4 ||
                        $existing['kategori'] !== $kategori
                    );

                    if ($changed) {
                        RekeningBelanja::query()
                            ->where('kode_rekening', $row['kode_rekening'])
                            ->update([
                                'kategori' => $kategori,
                                'is_ppn' => $newIsppn,
                                'is_pph21' => $newIspph21,
                                'is_pph22' => $newIspph22,
                                'is_pph23' => $newIspph23,
                                'is_pph4' => $newIspph4,
                                'updated_at' => now(),
                            ]);
                        $updatedCount++;
                    }
                }
            }

            if (count($inserts) > 0) {
                foreach (array_chunk($inserts, 500) as $chunk) {
                    RekeningBelanja::insert($chunk);
                }
            }

            $message = "Berhasil sinkronisasi $syncedCount data baru";
            if ($updatedCount > 0) {
                $message .= " dan memperbarui $updatedCount data yang berubah";
            }
            $message .= '.';

            return response()->json([
                'status' => 'success',
                'message' => $message,
                'synced' => $syncedCount,
                'updated' => $updatedCount,
            ]);
        }

        return response()->json(['status' => 'success', 'message' => "Berhasil sinkronisasi $syncedCount data baru.", 'synced' => $syncedCount]);
    }
}
