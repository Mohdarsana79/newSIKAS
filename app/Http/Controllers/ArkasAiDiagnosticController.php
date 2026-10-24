<?php

namespace App\Http\Controllers;

use App\Services\Ai\ArkasDiagnosticService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ArkasAiDiagnosticController extends Controller
{
    protected string $variant;

    public function __construct()
    {
        $this->variant = app()->bound('variant') ? app('variant') : 'reguler';
    }

    /**
     * Menjalankan diagnosa komprehensif sistem antara ARKAS dan SIKAS.
     */
    public function diagnoseSystem(Request $request, ArkasDiagnosticService $diagnosticService): JsonResponse
    {
        try {
            $user = $request->user();
            $tahun = (int) $request->input('tahun', 2026);

            $result = $diagnosticService->runComprehensiveDiagnostic($user, $this->variant, $tahun);

            return response()->json([
                'status' => 'success',
                'data' => $result,
            ]);
        } catch (\Throwable $e) {
            Log::error('❌ [ARKAS AI DIAGNOSE SYSTEM] Error: '.$e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Terjadi kesalahan saat menjalankan diagnosa sistem: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Menjalankan diagnosa kontekstual (misal sebelum penarikan BKU bulanan).
     */
    public function diagnoseContext(Request $request, ArkasDiagnosticService $diagnosticService): JsonResponse
    {
        try {
            $request->validate([
                'scope' => 'required|string|in:bku_month,rkas',
                'tahun' => 'nullable|integer',
                'context' => 'nullable|array',
            ]);

            $user = $request->user();
            $tahun = (int) $request->input('tahun', 2026);
            $scope = $request->input('scope');
            $context = $request->input('context', []);

            $result = $diagnosticService->runContextualDiagnostic($user, $this->variant, $tahun, $scope, $context);

            return response()->json([
                'status' => 'success',
                'data' => $result,
            ]);
        } catch (\Throwable $e) {
            Log::error('❌ [ARKAS AI DIAGNOSE CONTEXT] Error: '.$e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Terjadi kesalahan saat menjalankan diagnosa kontekstual: '.$e->getMessage(),
            ], 500);
        }
    }
}
