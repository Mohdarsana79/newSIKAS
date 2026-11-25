<?php

namespace App\Http\Controllers;

use App\Models\RefSatuan;
use App\Services\ReferensiKodeService;
use App\Services\RefPtkService;
use App\Services\RefSatuanService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ReferensiKodeController extends Controller
{
    public function __construct(
        protected ReferensiKodeService $referensiService
    ) {}

    public function index(Request $request)
    {
        $activeYears = $this->referensiService->resolveActiveYears(includeArkas: true);
        $statsPerYear = $this->referensiService->getStatsPerYear();
        $yearsWithTransactions = $this->referensiService->getYearsWithTransactions();

        $requestedYear = $request->filled('year') ? (string) $request->input('year') : '';
        $defaultYear = preg_match('/^\d{4}$/', $requestedYear) === 1
            ? $requestedYear
            : ($activeYears[0] ?? (string) date('Y'));

        if (! in_array($defaultYear, $activeYears, true)) {
            array_unshift($activeYears, $defaultYear);
            usort($activeYears, static fn ($a, $b) => (int) $b <=> (int) $a);
        }

        return Inertia::render('ArkasTools/ReferensiKode', [
            'activeYears' => $activeYears,
            'defaultYear' => $defaultYear,
            'localStats' => [
                'perYear' => $statsPerYear,
                'satuan' => RefSatuan::where('is_active', true)->count(),
            ],
            'yearsWithTransactions' => $yearsWithTransactions,
        ]);
    }

    public function fetch(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tipe' => 'required|in:kegiatan,rekening,satuan',
            'year' => 'required_unless:tipe,satuan|nullable|digits:4|integer|min:2000|max:2100',
        ]);

        if ($validated['tipe'] === 'satuan') {
            return response()->json(app(RefSatuanService::class)->fetchArkasComparison());
        }

        $result = $this->referensiService->fetchArkasComparison(
            (string) $validated['tipe'],
            (int) $validated['year']
        );

        return response()->json($result);
    }

    public function sync(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tipe' => 'required|in:kegiatan,rekening,satuan',
            'year' => 'required_unless:tipe,satuan|nullable|digits:4|integer|min:2000|max:2100',
        ]);

        if ($validated['tipe'] === 'satuan') {
            $result = app(RefSatuanService::class)->syncFromArkas();
            if (($result['status'] ?? null) === 'success') {
                $result['satuan_count'] = RefSatuan::where('is_active', true)->count();
            }

            return response()->json($result);
        }

        $result = $this->referensiService->syncFromArkas(
            (string) $validated['tipe'],
            (int) $validated['year']
        );

        if (($result['status'] ?? null) === 'success') {
            $result['stats_per_year'] = $this->referensiService->getStatsPerYear();
        }

        return response()->json($result);
    }

    /**
     * Sinkronisasi sekaligus Kode Kegiatan dan Rekening Belanja dari ARKAS untuk 1 tahun anggaran
     * (dipakai oleh tombol aksi cepat pada modal Tambah Penganggaran & banner RKAS).
     */
    public function syncAll(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'year' => 'required|digits:4|integer|min:2000|max:2100',
        ]);

        $year = (int) $validated['year'];

        $kegRes = $this->referensiService->syncFromArkas('kegiatan', $year);
        if (($kegRes['status'] ?? null) !== 'success') {
            return response()->json($kegRes, 422);
        }

        $rekRes = $this->referensiService->syncFromArkas('rekening', $year);
        if (($rekRes['status'] ?? null) !== 'success') {
            return response()->json($rekRes, 422);
        }

        // Ikut sinkronkan data PTK & satuan baku ARKAS secara fail-safe
        $ptkRes = app(RefPtkService::class)->syncFromArkasSilently($year);
        app(RefSatuanService::class)->syncFromArkasSilently();

        $stats = $this->referensiService->getStatsPerYear();
        $yrStats = $stats[(string) $year] ?? ['kegiatan' => 0, 'rekening' => 0];

        return response()->json([
            'status' => 'success',
            'year' => $year,
            'kegiatan' => $kegRes,
            'rekening' => $rekRes,
            'ptk' => $ptkRes,
            'stats_per_year' => $stats,
            'message' => "Referensi Tahun {$year} berhasil disinkronkan dari ARKAS ({$yrStats['kegiatan']} Kode Kegiatan, {$yrStats['rekening']} Rekening Belanja).",
        ]);
    }

    /**
     * Salin sekaligus Kode Kegiatan dan Rekening Belanja dari tahun sumber ke tahun tujuan
     * (untuk sekolah mode offline/manual pada modal Tambah Penganggaran & banner RKAS).
     */
    public function copyYear(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'source_year' => 'required|digits:4|integer|min:2000|max:2100',
            'target_year' => 'required|digits:4|integer|min:2000|max:2100|different:source_year',
            'tipe' => 'nullable|in:kegiatan,rekening,both',
        ]);

        $result = $this->referensiService->copyFromYear(
            (string) ($validated['tipe'] ?? 'both'),
            (int) $validated['source_year'],
            (int) $validated['target_year']
        );

        if (($result['status'] ?? null) !== 'success') {
            return response()->json($result, 422);
        }

        $result['stats_per_year'] = $this->referensiService->getStatsPerYear();

        return response()->json($result);
    }
}
