<?php

namespace App\Http\Controllers;

use App\Config\VariantConfig;
use App\Models\BkuAuditLog;
use App\Models\SekolahProfile;
use App\Services\Ai\BkuAuditScanner;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class BkuAuditController extends Controller
{
    protected string $variant;
    protected BkuAuditScanner $scanner;

    public function __construct(BkuAuditScanner $scanner)
    {
        $this->scanner = $scanner;

        $this->middleware(function ($request, $next) {
            $this->variant = app()->bound('variant') ? app('variant') : 'reguler';
            return $next($request);
        });
    }

    /**
     * Mengambil status audit terakhir untuk periode dan varian aktif
     */
    public function getStatus(Request $request)
    {
        $tahun = (int) $request->input('tahun');
        $bulan = $request->input('bulan');

        if (!$tahun || !$bulan) {
            return response()->json([
                'success' => false,
                'message' => 'Parameter tahun dan bulan wajib diisi.',
            ], 422);
        }

        $user = Auth::user();
        $hasKey = $user && $user->hasDeepSeekKey();

        $bulanNormal = ucfirst(strtolower($bulan));
        
        $audit = BkuAuditLog::where('user_id', $user->id)
            ->where('variant', $this->variant)
            ->where('tahun', $tahun)
            ->where('bulan', $bulanNormal)
            ->latest()
            ->first();

        return response()->json([
            'success' => true,
            'has_api_key' => $hasKey,
            'audit' => $audit,
        ]);
    }

    /**
     * Menjalankan pemindaian Pra-Audit AI (DeepSeek-R1)
     */
    public function runAudit(Request $request)
    {
        $request->validate([
            'tahun' => 'required|integer',
            'bulan' => 'required|string',
            'force_refresh' => 'nullable|boolean',
        ]);

        $user = Auth::user();
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Sesi pengguna tidak valid.',
            ], 401);
        }

        $tahun = (int) $request->input('tahun');
        $bulan = $request->input('bulan');
        $forceRefresh = $request->boolean('force_refresh', false);

        try {
            $result = $this->scanner->scan($user, $this->variant, $tahun, $bulan, $forceRefresh);

            $statusCode = $result['success'] ? 200 : (isset($result['error_type']) && $result['error_type'] === 'NO_API_KEY' ? 403 : 422);

            return response()->json($result, $statusCode);
        } catch (\Throwable $e) {
            Log::error("Error executing BKU Audit: " . $e->getMessage());
            Log::error($e->getTraceAsString());

            return response()->json([
                'success' => false,
                'message' => 'Gagal menjalankan audit: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Mengunduh dokumen Lembar Kerja Pra-Audit AI dalam format PDF
     */
    public function exportPdf(Request $request, $id)
    {
        $audit = BkuAuditLog::findOrFail($id);
        $sekolah = SekolahProfile::first();

        $penganggaranClass = VariantConfig::getModelClass('penganggaran', $audit->variant);
        $penganggaran = $penganggaranClass::find($audit->penganggaran_id);

        $pdf = Pdf::loadView('pdf.bku-audit-report', [
            'audit' => $audit,
            'sekolah' => $sekolah,
            'penganggaran' => $penganggaran,
            'variantTitle' => VariantConfig::title($audit->variant),
        ])->setPaper('a4', 'portrait');

        $fileName = sprintf(
            'Lembar_Pra_Audit_AI_%s_%s_%s.pdf',
            strtoupper($audit->variant),
            $audit->bulan,
            $audit->tahun
        );

        return $pdf->download($fileName);
    }
}
