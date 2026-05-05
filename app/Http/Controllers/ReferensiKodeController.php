<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\Process\Process;
use Illuminate\Support\Facades\Log;

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

        if (!in_array($tipe, ['kegiatan', 'rekening'])) {
            return response()->json(['status' => 'error', 'message' => 'Tipe referensi tidak valid']);
        }

        $pythonPath = storage_path('app/arkas_engine/python.exe');
        $scriptPath = storage_path('app/arkas_engine/dump_reference.py');
        
        if (!file_exists($pythonPath) || !file_exists($scriptPath)) {
             return response()->json(['status' => 'error', 'message' => 'Arkas Engine tidak ditemukan.']);
        }

        $env = $_SERVER;
        unset($env['OPENSSL_CONF']);

        $appdata = $env['APPDATA'] ?? null;
        $userprofile = $env['USERPROFILE'] ?? null;

        if (empty($appdata)) {
            $appdata = trim(shell_exec("powershell -Command \"[Environment]::GetFolderPath('ApplicationData')\""));
        }

        if (empty($userprofile)) {
            $userprofile = trim(shell_exec("powershell -Command \"[Environment]::GetFolderPath('UserProfile')\""));
        }

        if (empty($userprofile) && !empty($appdata)) {
            $userprofile = dirname(dirname($appdata));
        }

        if (empty($appdata) && !empty($userprofile)) {
            $appdata = $userprofile . '\\AppData\\Roaming';
        }

        $env['SystemRoot']    = $env['SystemRoot']    ?? 'C:\\Windows';
        $env['SystemDrive']   = $env['SystemDrive']   ?? 'C:';
        $env['USERPROFILE']   = $userprofile ?: ($env['USERPROFILE'] ?? 'C:\\Users\\Digitalisasi');
        $env['APPDATA']       = $appdata     ?: ($env['APPDATA']     ?? 'C:\\Users\\Digitalisasi\\AppData\\Roaming');
        $env['LOCALAPPDATA']  = $env['LOCALAPPDATA']  ?? ($userprofile ? $userprofile . '\\AppData\\Local' : '');
        $env['TEMP']          = $env['TEMP']           ?? ($userprofile ? $userprofile . '\\AppData\\Local\\Temp' : '');
        $env['TMP']           = $env['TMP']            ?? $env['TEMP'];

        // Pastikan path dasar Windows tersedia (Sangat Penting untuk Python & SQLCipher)
        $env['SystemRoot']    = $env['SystemRoot']    ?? 'C:\\Windows';
        $env['SystemDrive']   = $env['SystemDrive']   ?? 'C:';
        $env['USERPROFILE']   = !empty($userprofile) ? $userprofile : ($env['USERPROFILE'] ?? 'C:\\Users\\Digitalisasi');
        $env['APPDATA']       = !empty($appdata)     ? $appdata     : ($env['APPDATA']     ?? 'C:\\Users\\Digitalisasi\\AppData\\Roaming');
        $env['LOCALAPPDATA']  = $env['LOCALAPPDATA']  ?? (empty($userprofile) ? '' : $userprofile . '\\AppData\\Local');
        $env['TEMP']          = $env['TEMP']           ?? (empty($userprofile) ? '' : $userprofile . '\\AppData\\Local\\Temp');
        $env['TMP']           = $env['TMP']            ?? $env['TEMP'];

        Log::info('Arkas Referensi Fetch ENV Final', [
            'APPDATA'    => $env['APPDATA'],
            'USERPROFILE'=> $env['USERPROFILE'],
            'SystemDrive'=> $env['SystemDrive']
        ]);

        $dbPathManual = env('ARKAS_DB_PATH', '');
        $dbPathManual = trim($dbPathManual, '"\' ');
        $dbPathManual = str_replace('\\', '/', $dbPathManual);

        $process = new Process([$pythonPath, $scriptPath, $tipe, $year, $dbPathManual], null, $env);
        // Bisa memakan waktu lebih lama karena data > 5000 baris
        $process->setTimeout(60); 
        $process->run();

        if (!$process->isSuccessful()) {
             return response()->json(['status' => 'error', 'message' => 'Gagal mengeksekusi engine ARKAS. ' . $process->getErrorOutput()]);
        }

        $output = $process->getOutput();
        $result = json_decode($output, true);

        if (isset($result['error'])) {
            return response()->json(['status' => 'error', 'message' => $result['error']]);
        }

        $data = $result['data'] ?? [];
        
        $existingRekening = [];
        if ($tipe === 'kegiatan') {
            $existing = \App\Models\KodeKegiatan::query()->pluck('kode')->toArray();
        } else {
            // Untuk rekening: ambil seluruh data beserta nilai pajaknya
            $existingRekening = \App\Models\RekeningBelanja::query()
                ->select(['kode_rekening', 'kategori', 'is_ppn', 'is_pph21', 'is_pph22', 'is_pph23', 'is_pph4'])
                ->get()
                ->keyBy('kode_rekening')
                ->toArray();
            $existing = array_keys($existingRekening);
        }

        foreach ($data as &$row) {
            if ($tipe === 'kegiatan') {
                $row['status'] = in_array($row['id_kode'], $existing) ? 'Sudah Ada' : 'Data Baru';
            } else {
                $kode = $row['kode_rekening'];
                if (!isset($existingRekening[$kode])) {
                    $row['status'] = 'Data Baru';
                } else {
                    // Deteksi perubahan kategori / pajak
                    $ex = $existingRekening[$kode];
                    $prefix = substr($kode, 0, 6);
                    if ($prefix === '5.2.02') $kat = 'Modal Peralatan dan Mesin';
                    elseif ($prefix === '5.2.04') $kat = 'Modal Jalan, Jaringan, dan Irigasi';
                    elseif ($prefix === '5.2.05') $kat = 'Modal Aset Tetap Lainnya';
                    else $kat = 'Operasi';

                    $newPpn  = isset($row['is_ppn'])   && $row['is_ppn']   ? 1 : 0;
                    $newPph21 = isset($row['is_pph21']) && $row['is_pph21'] ? 1 : 0;
                    $newPph22 = isset($row['is_pph22']) && $row['is_pph22'] ? 1 : 0;
                    $newPph23 = isset($row['is_pph23']) && $row['is_pph23'] ? 1 : 0;
                    $newPph4  = isset($row['is_pph4'])  && $row['is_pph4']  ? 1 : 0;

                    $changed = (
                        (int)$ex['is_ppn']   !== $newPpn  ||
                        (int)$ex['is_pph21'] !== $newPph21 ||
                        (int)$ex['is_pph22'] !== $newPph22 ||
                        (int)$ex['is_pph23'] !== $newPph23 ||
                        (int)$ex['is_pph4']  !== $newPph4  ||
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

        if (!in_array($tipe, ['kegiatan', 'rekening'])) {
            return response()->json(['status' => 'error', 'message' => 'Tipe referensi tidak valid']);
        }

        $pythonPath = storage_path('app/arkas_engine/python.exe');
        $scriptPath = storage_path('app/arkas_engine/dump_reference.py');
        
        if (!file_exists($pythonPath) || !file_exists($scriptPath)) {
             return response()->json(['status' => 'error', 'message' => 'Arkas Engine tidak ditemukan.']);
        }

        $env = $_SERVER;
        unset($env['OPENSSL_CONF']);

        $appdata = $env['APPDATA'] ?? null;
        $userprofile = $env['USERPROFILE'] ?? null;

        if (empty($appdata)) {
            $appdata = trim(shell_exec("powershell -Command \"[Environment]::GetFolderPath('ApplicationData')\""));
        }

        if (empty($userprofile)) {
            $userprofile = trim(shell_exec("powershell -Command \"[Environment]::GetFolderPath('UserProfile')\""));
        }

        if (empty($userprofile) && !empty($appdata)) {
            $userprofile = dirname(dirname($appdata));
        }

        if (empty($appdata) && !empty($userprofile)) {
            $appdata = $userprofile . '\\AppData\\Roaming';
        }

        // Pastikan path dasar Windows tersedia (Sangat Penting untuk Python & SQLCipher)
        $env['SystemRoot']    = $env['SystemRoot']    ?? 'C:\\Windows';
        $env['SystemDrive']   = $env['SystemDrive']   ?? 'C:';
        $env['USERPROFILE']   = !empty($userprofile) ? $userprofile : ($env['USERPROFILE'] ?? 'C:\\Users\\Digitalisasi');
        $env['APPDATA']       = !empty($appdata)     ? $appdata     : ($env['APPDATA']     ?? 'C:\\Users\\Digitalisasi\\AppData\\Roaming');
        $env['LOCALAPPDATA']  = $env['LOCALAPPDATA']  ?? (empty($userprofile) ? '' : $userprofile . '\\AppData\\Local');
        $env['TEMP']          = $env['TEMP']           ?? (empty($userprofile) ? '' : $userprofile . '\\AppData\\Local\\Temp');
        $env['TMP']           = $env['TMP']            ?? $env['TEMP'];

        Log::info('Arkas Referensi Sync ENV Final', [
            'APPDATA'    => $env['APPDATA'],
            'USERPROFILE'=> $env['USERPROFILE'],
            'SystemDrive'=> $env['SystemDrive']
        ]);

        $dbPathManual = env('ARKAS_DB_PATH', '');
        $dbPathManual = trim($dbPathManual, '"\' ');
        $dbPathManual = str_replace('\\', '/', $dbPathManual);

        $process = new Process([$pythonPath, $scriptPath, $tipe, $year, $dbPathManual], null, $env);
        $process->setTimeout(120); 
        $process->run();

        if (!$process->isSuccessful()) {
             return response()->json(['status' => 'error', 'message' => 'Gagal mengeksekusi engine ARKAS. ' . $process->getErrorOutput()]);
        }

        $output = $process->getOutput();
        $result = json_decode($output, true);

        if (isset($result['error'])) {
            return response()->json(['status' => 'error', 'message' => $result['error']]);
        }

        $data = $result['data'] ?? [];
        $syncedCount = 0;

        // Menggunakan array untuk mempercepat pengecekan
        if ($tipe === 'kegiatan') {
            $existing = \App\Models\KodeKegiatan::query()->pluck('kode')->toArray();
            
            $inserts = [];
            foreach ($data as $row) {
                if (!in_array($row['id_kode'], $existing)) {
                    $inserts[] = [
                        'kode' => $row['id_kode'],
                        'program' => $row['program'] ?? '',
                        'sub_program' => $row['sub_program'] ?? '',
                        'uraian' => $row['uraian_kode'] ?? '',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                    $syncedCount++;
                }
            }
            if (count($inserts) > 0) {
                // Chunk insert untuk performa (karena bisa ribuan data)
                foreach (array_chunk($inserts, 500) as $chunk) {
                    \App\Models\KodeKegiatan::insert($chunk);
                }
            }

        } else {
            // Ambil semua data yang sudah ada, beserta nilai pajaknya
            $existingMap = \App\Models\RekeningBelanja::query()
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

                $newIsppn  = isset($row['is_ppn'])   && $row['is_ppn']   ? 1 : 0;
                $newIspph21 = isset($row['is_pph21']) && $row['is_pph21'] ? 1 : 0;
                $newIspph22 = isset($row['is_pph22']) && $row['is_pph22'] ? 1 : 0;
                $newIspph23 = isset($row['is_pph23']) && $row['is_pph23'] ? 1 : 0;
                $newIspph4  = isset($row['is_pph4'])  && $row['is_pph4']  ? 1 : 0;

                if (!isset($existingMap[$row['kode_rekening']])) {
                    // Data baru: insert
                    $inserts[] = [
                        'kode_rekening' => $row['kode_rekening'],
                        'rincian_objek' => $row['rekening'] ?? '',
                        'kategori'      => $kategori,
                        'is_ppn'        => $newIsppn,
                        'is_pph21'      => $newIspph21,
                        'is_pph22'      => $newIspph22,
                        'is_pph23'      => $newIspph23,
                        'is_pph4'       => $newIspph4,
                        'created_at'    => now(),
                        'updated_at'    => now(),
                    ];
                    $syncedCount++;
                } else {
                    // Data sudah ada: cek apakah pajak atau kategori berbeda
                    $existing = $existingMap[$row['kode_rekening']];
                    $changed = (
                        (int)$existing['is_ppn']   !== $newIsppn   ||
                        (int)$existing['is_pph21'] !== $newIspph21 ||
                        (int)$existing['is_pph22'] !== $newIspph22 ||
                        (int)$existing['is_pph23'] !== $newIspph23 ||
                        (int)$existing['is_pph4']  !== $newIspph4  ||
                        $existing['kategori'] !== $kategori
                    );

                    if ($changed) {
                        \App\Models\RekeningBelanja::query()
                            ->where('kode_rekening', $row['kode_rekening'])
                            ->update([
                                'kategori'   => $kategori,
                                'is_ppn'     => $newIsppn,
                                'is_pph21'   => $newIspph21,
                                'is_pph22'   => $newIspph22,
                                'is_pph23'   => $newIspph23,
                                'is_pph4'    => $newIspph4,
                                'updated_at' => now(),
                            ]);
                        $updatedCount++;
                    }
                }
            }

            if (count($inserts) > 0) {
                foreach (array_chunk($inserts, 500) as $chunk) {
                    \App\Models\RekeningBelanja::insert($chunk);
                }
            }

            $message = "Berhasil sinkronisasi $syncedCount data baru";
            if ($updatedCount > 0) {
                $message .= " dan memperbarui $updatedCount data yang berubah";
            }
            $message .= '.';

            return response()->json([
                'status'  => 'success',
                'message' => $message,
                'synced'  => $syncedCount,
                'updated' => $updatedCount,
            ]);
        }

        return response()->json(['status' => 'success', 'message' => "Berhasil sinkronisasi $syncedCount data baru.", 'synced' => $syncedCount]);
    }
}
