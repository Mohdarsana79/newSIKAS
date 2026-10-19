<?php

namespace App\Http\Controllers;

use App\Config\VariantConfig;
use App\Services\Ai\CopilotService;
use App\Services\BukuKasService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class AiCopilotController extends Controller
{
    protected string $variant;
    protected CopilotService $copilotService;
    protected BukuKasService $bukuKasService;

    public function __construct(CopilotService $copilotService, BukuKasService $bukuKasService)
    {
        $this->copilotService = $copilotService;
        $this->bukuKasService = $bukuKasService;

        $this->middleware(function ($request, $next) {
            $this->variant = app()->bound('variant') ? app('variant') : 'reguler';
            return $next($request);
        });
    }

    /**
     * Endpoint percakapan interaktif AI Copilot (DeepSeek-V3 dengan Tool Calling)
     */
    public function chat(Request $request)
    {
        $request->validate([
            'tahun' => 'required|integer',
            'messages' => 'required|array',
        ]);

        $user = Auth::user();
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Sesi pengguna tidak valid.',
            ], 401);
        }

        $tahun = (int) $request->input('tahun');
        $messages = $request->input('messages', []);

        try {
            $result = $this->copilotService->chat($user, $this->variant, $tahun, $messages);

            $statusCode = $result['success'] ? 200 : (isset($result['error_type']) && $result['error_type'] === 'NO_API_KEY' ? 403 : 422);

            return response()->json($result, $statusCode);
        } catch (\Throwable $e) {
            Log::error('AiCopilotController chat exception: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan pada AI Copilot: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Menyimpan transaksi BKU yang telah dikonfirmasi pengguna dari Staging Card
     */
    public function commitTransaction(Request $request)
    {
        $request->validate([
            'tahun' => 'required|integer',
            'draft' => 'required|array',
        ]);

        $user = Auth::user();
        $tahun = (int) $request->input('tahun');
        $draft = $request->input('draft');

        $result = $this->copilotService->commitBkuTransaction($user, $this->variant, $tahun, $draft);

        return response()->json($result, $result['success'] ? 200 : 422);
    }

    /**
     * Mengambil ringkasan pagu dan saldo kas untuk rekomendasi prompt awal
     */
    public function getQuickContext(Request $request)
    {
        $tahun = (int) $request->input('tahun', now()->year);
        $user = Auth::user();

        $penganggaranClass = VariantConfig::getModelClass('penganggaran', $this->variant);
        $penganggaran = $penganggaranClass::where('tahun_anggaran', $tahun)->first();

        if (!$penganggaran) {
            return response()->json([
                'success' => false,
                'has_api_key' => $user?->hasDeepSeekKey() ?? false,
                'message' => 'Data penganggaran belum tersedia.',
            ]);
        }

        $bkuClass = VariantConfig::getModelClass('bku', $this->variant);
        $bkuFk = VariantConfig::penganggaranFk($this->variant);

        $totalBelanja = (float) $bkuClass::where($bkuFk, $penganggaran->id)->sum('dibelanjakan');
        $saldoBank = $this->bukuKasService->hitungSaldoAkhirBkpBank($penganggaran->id, $tahun, now()->locale('id')->translatedFormat('F'));

        return response()->json([
            'success' => true,
            'has_api_key' => $user?->hasDeepSeekKey() ?? false,
            'variant' => $this->variant,
            'variant_title' => VariantConfig::title($this->variant),
            'tahun' => $tahun,
            'total_belanja' => $totalBelanja,
            'saldo_bank' => $saldoBank,
        ]);
    }
}
