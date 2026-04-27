<?php

namespace App\Http\Controllers;

use App\Models\SekolahProfile;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Services\BospSyncService;

class IntegrasiController extends Controller
{
    protected $syncService;

    public function __construct(BospSyncService $syncService)
    {
        $this->syncService = $syncService;
    }

    /**
     * Display API settings.
     */
    public function apiIndex()
    {
        $sekolah = SekolahProfile::first();
        return Inertia::render('Integrasi/Api', [
            'sekolah' => $sekolah
        ]);
    }

    /**
     * Update API settings.
     */
    public function apiUpdate(Request $request)
    {
        $sekolah = SekolahProfile::first();
        
        if (!$sekolah) {
            return redirect()->back()->with('error', 'Silakan lengkapi Profil Sekolah terlebih dahulu.');
        }

        $request->validate([
            'website_sync_url' => 'nullable|url',
            'website_sync_token' => 'nullable|string',
        ]);

        $sekolah->update([
            'website_sync_url' => $request->website_sync_url,
            'website_sync_token' => $request->website_sync_token,
        ]);

        return redirect()->back()->with('success', 'Pengaturan API berhasil diperbarui.');
    }

    /**
     * Test connection to the school website.
     */
    public function testConnection(Request $request)
    {
        $request->validate([
            'url' => 'required|url',
            'token' => 'nullable|string',
        ]);

        try {
            $response = \Illuminate\Support\Facades\Http::withHeaders([
                'X-SIMS-Token' => $request->token
            ])->timeout(10)->post($request->url, [
                'type' => 'bosp',
                'data' => [
                    'tahun' => (int)date('Y'),
                    'summary' => [
                        'pagu_anggaran' => 0,
                        'total_realisasi' => 0,
                        'tahap_1_realisasi' => 0,
                        'tahap_2_realisasi' => 0,
                        'tahap_3_realisasi' => 0,
                    ],
                    'details' => [
                        [
                            'nama_kegiatan' => 'Test Connection',
                            'anggaran' => 0,
                            'realisasi' => 0
                        ]
                    ],
                    'reports' => [],
                    'is_test' => true
                ]
            ]);

            if ($response->successful()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Koneksi Berhasil! Website merespon dengan status: ' . $response->status()
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Gagal terhubung. Status: ' . $response->status() . '. ' . $response->body()
            ], 400);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Kesalahan koneksi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display Sync page.
     */
    public function syncIndex()
    {
        $sekolah = SekolahProfile::first();
        $availableYears = \App\Models\Penganggaran::distinct()
            ->orderBy('tahun_anggaran', 'desc')
            ->pluck('tahun_anggaran')
            ->toArray();

        $syncLogs = \App\Models\SyncLog::orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('Integrasi/Sync', [
            'sekolah' => $sekolah,
            'availableYears' => $availableYears,
            'syncLogs' => $syncLogs
        ]);
    }

    /**
     * Preview data to be synced.
     */
    public function previewSyncData(Request $request)
    {
        $request->validate([
            'tahun' => 'required|integer',
        ]);

        $sekolah = SekolahProfile::first();
        if (!$sekolah) {
            return response()->json(['error' => 'Profil Sekolah belum diatur.'], 400);
        }

        $result = $this->syncService->getPayloadPreview($request->tahun, $sekolah->id);

        return response()->json($result);
    }

    /**
     * Trigger synchronization.
     */
    public function syncStore(Request $request)
    {
        $request->validate([
            'tahun' => 'required|integer',
        ]);

        $sekolah = SekolahProfile::first();
        
        if (!$sekolah || !$sekolah->website_sync_url) {
            $msg = 'Konfigurasi API belum diatur. Silakan atur di menu API.';
            return $request->wantsJson() 
                ? response()->json(['success' => false, 'message' => $msg], 400)
                : redirect()->back()->with('error', $msg);
        }

        $result = $this->syncService->syncData($request->tahun, $sekolah->id);

        // Save Log
        \App\Models\SyncLog::create([
            'sekolah_id' => $sekolah->id,
            'tahun' => $request->tahun,
            'status' => $result['success'] ? 'success' : 'failed',
            'message' => $result['message'],
            'payload' => $result['payload'] ?? null
        ]);

        if ($request->wantsJson()) {
            return response()->json($result);
        }

        if ($result['success']) {
            return redirect()->back()->with('success', $result['message']);
        }

        return redirect()->back()->with('error', $result['message']);
    }
}
