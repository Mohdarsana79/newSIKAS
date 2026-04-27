<?php

namespace App\Services;

use App\Models\Penganggaran;
use App\Models\Rkas;
use App\Models\BukuKasUmum;
use App\Models\SekolahProfile;
use App\Models\PenerimaanDana;
use App\Models\PenarikanTunai;
use App\Models\SetorTunai;
use App\Models\Spmth;
use App\Models\Sptj;
use App\Models\Sp2b;
use App\Models\Lph;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class BospSyncService
{
    /**
     * Sync BOSP data to the school's public website.
     * 
     * @param int $tahun
     * @param int|null $sekolahId
     * @return array
     */
    /**
     * Get the payload that will be sent to the website.
     */
    public function getPayloadPreview($tahun, $sekolahId = null)
    {
        $payloadResult = $this->buildPayload($tahun, $sekolahId);
        if (!$payloadResult['success']) {
            return $payloadResult;
        }

        return [
            'success' => true,
            'payload' => $payloadResult['payload']
        ];
    }

    /**
     * Build the payload for synchronization.
     */
    protected function buildPayload($tahun, $sekolahId = null)
    {
        // 1. Get School Profile
        $sekolah = $sekolahId 
            ? SekolahProfile::find($sekolahId) 
            : SekolahProfile::first();

        if (!$sekolah) {
            return ['success' => false, 'message' => 'Profil Sekolah tidak ditemukan.'];
        }

        // 2. Get Budgeting Record for the year
        $penganggaran = Penganggaran::where('tahun_anggaran', $tahun)
            ->where('sekolah_id', $sekolah->id)
            ->first();

        if (!$penganggaran) {
            return ['success' => false, 'message' => "Data penganggaran tahun $tahun tidak ditemukan."];
        }

        // 3. Aggregate Data per Program (Reliable version)
        $hasRevision = \App\Models\RkasPerubahan::where('penganggaran_id', $penganggaran->id)->exists();
        $rkasItems = $hasRevision 
            ? \App\Models\RkasPerubahan::where('penganggaran_id', $penganggaran->id)->with('kodeKegiatan')->get()
            : Rkas::where('penganggaran_id', $penganggaran->id)->with('kodeKegiatan')->get();

        $bkuItems = BukuKasUmum::where('penganggaran_id', $penganggaran->id)->with('kodeKegiatan')->get();

        // Group RKAS by Program
        $programBudgets = [];
        foreach ($rkasItems as $item) {
            $programName = $item->kodeKegiatan->program ?? 'Lainnya';
            if (!isset($programBudgets[$programName])) {
                $programBudgets[$programName] = 0;
            }
            $programBudgets[$programName] += ($item->jumlah * $item->harga_satuan);
        }

        // Group BKU by Program
        $programRealisasi = [];
        foreach ($bkuItems as $item) {
            $programName = $item->kodeKegiatan->program ?? 'Lainnya';
            if (!isset($programRealisasi[$programName])) {
                $programRealisasi[$programName] = 0;
            }
            $programRealisasi[$programName] += $item->dibelanjakan;
        }

        // 4. Map to summary details for program-level cards
        $details = [];
        $allPrograms = array_unique(array_merge(array_keys($programBudgets), array_keys($programRealisasi)));
        foreach ($allPrograms as $programName) {
            $details[] = [
                'nama_kegiatan' => $programName,
                'anggaran' => (float)($programBudgets[$programName] ?? 0),
                'realisasi' => (float)($programRealisasi[$programName] ?? 0)
            ];
        }

        // 5. Map Full RKAS Data (Prefer revision if exists)
        $hasRevision = \App\Models\RkasPerubahan::where('penganggaran_id', $penganggaran->id)->exists();
        $rkasItems = $hasRevision 
            ? \App\Models\RkasPerubahan::where('penganggaran_id', $penganggaran->id)->with('kodeKegiatan')->get()
            : Rkas::where('penganggaran_id', $penganggaran->id)->with('kodeKegiatan')->get();

        $rkasData = $rkasItems->map(function($item) {
            return [
                'kode_kegiatan' => $item->kodeKegiatan->kode ?? '-',
                'nama_kegiatan' => $item->kodeKegiatan->program ?? 'N/A',
                'sub_program' => $item->kodeKegiatan->sub_program ?? '-',
                'uraian_kegiatan' => $item->kodeKegiatan->uraian ?? '-',
                'kode_rekening' => $item->rekeningBelanja->kode_rekening ?? '-',
                'nama_rekening' => $item->rekeningBelanja->rincian_objek ?? '-',
                'uraian' => $item->uraian ?? 'Kegiatan BOSP',
                'anggaran' => (float)($item->jumlah * $item->harga_satuan),
                'volume' => (float)$item->jumlah,
                'satuan' => $item->satuan,
                'bulan' => $item->bulan ?? '-',
                'sumber_dana' => 'BOSP',
            ];
        });

        // 6. Map Full BKU Data
        $bkuData = BukuKasUmum::where('penganggaran_id', $penganggaran->id)
            ->with('kodeKegiatan')
            ->orderBy('tanggal_transaksi')
            ->orderBy('id')
            ->get()
            ->map(function($item) {
                return [
                    'tanggal' => $item->tanggal_transaksi,
                    'kode_kegiatan' => $item->kodeKegiatan->kode ?? '-',
                    'uraian' => $item->uraian ?? 'Transaksi BOSP',
                    'penerimaan' => (float)$item->anggaran,
                    'pengeluaran' => (float)$item->dibelanjakan,
                    'saldo' => 0, // Saldo calculated at receiver side if needed
                ];
            });

        // 7. Reports are now managed manually on the website side
        $reports = [];

        // 8. Build Final Payload
        $payload = [
            'type' => 'bosp',
            'data' => [
                'tahun' => (int)$tahun,
                'summary' => [
                    'npsn' => $sekolah->npsn,
                    'nama_sekolah' => $sekolah->nama_sekolah,
                    'alamat' => $sekolah->alamat,
                    'kabupaten' => $sekolah->kabupaten_kota,
                    'provinsi' => $sekolah->provinsi,
                    'pagu_anggaran' => (float)$penganggaran->pagu_anggaran,
                    'total_realisasi' => (float)BukuKasUmum::where('penganggaran_id', $penganggaran->id)->sum('dibelanjakan'),
                    'tahap_1_realisasi' => 0, 
                    'tahap_2_realisasi' => 0,
                    'tahap_3_realisasi' => 0,
                ],
                'details' => $details,
                'rkas_data' => $rkasData->toArray(),
                'bku_data' => $bkuData->toArray(),
                'reports' => $reports,
            ]
        ];

        return [
            'success' => true,
            'payload' => $payload,
            'sekolah' => $sekolah
        ];
    }

    /**
     * Sync BOSP data to the school's public website.
     * 
     * @param int $tahun
     * @param int|null $sekolahId
     * @return array
     */
    public function syncData($tahun, $sekolahId = null)
    {
        $payloadResult = $this->buildPayload($tahun, $sekolahId);
        
        if (!$payloadResult['success']) {
            return $payloadResult;
        }

        $payload = $payloadResult['payload'];
        $sekolah = $payloadResult['sekolah'];

        if (!$sekolah->website_sync_url) {
            return ['success' => false, 'message' => 'Konfigurasi website sekolah belum diatur.'];
        }

        // 6. Send via HTTP
        try {
            $response = Http::withHeaders([
                'X-SIMS-Token' => $sekolah->website_sync_token
            ])->timeout(30)->post($sekolah->website_sync_url, $payload);

            if ($response->successful()) {
                return [
                    'success' => true, 
                    'message' => 'Berhasil sinkronisasi ke website: ' . $sekolah->website_sync_url,
                    'payload' => $payload
                ];
            }

            return [
                'success' => false, 
                'message' => 'Gagal sinkron: ' . $response->status() . ' - ' . $response->body(),
                'payload' => $payload
            ];
        } catch (\Exception $e) {
            Log::error('BOSP Sync Error: ' . $e->getMessage());
            return [
                'success' => false, 
                'message' => 'Kesalahan koneksi: ' . $e->getMessage(),
                'payload' => $payload
            ];
        }
    }
}
