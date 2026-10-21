<?php

namespace App\Http\Controllers;

use App\Config\VariantConfig;
use App\Models\BkuAuditLog;
use App\Models\SekolahProfile;
use App\Services\Ai\Audit\BkuAuditOrchestrator;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class BkuAuditController extends Controller
{
    protected string $variant;

    protected BkuAuditOrchestrator $orchestrator;

    public function __construct(BkuAuditOrchestrator $orchestrator)
    {
        $this->orchestrator = $orchestrator;

        $this->middleware(function ($request, $next) {
            $this->variant = app()->bound('variant') ? app('variant') : 'reguler';

            return $next($request);
        });
    }

    /**
     * Mengambil status audit terakhir untuk tab dan rentang periode tertentu
     */
    public function getStatus(Request $request)
    {
        $tahun = (int) $request->input('tahun');
        $tabType = $request->input('tab_type', 'reg');
        $periodeType = $request->input('periode_type', 'bulanan');
        $periodeKey = $request->input('periode_key');

        if (! $periodeKey) {
            $bulan = $request->input('bulan');
            $periodeKey = $bulan ? strtolower(trim($bulan)) : 'januari';
        }

        if (! $tahun) {
            return response()->json([
                'success' => false,
                'message' => 'Parameter tahun wajib diisi.',
            ], 422);
        }

        $user = Auth::user();
        $hasKey = $user && $user->hasDeepSeekKey();

        $audit = $this->orchestrator->getStatus($user, $this->variant, $tahun, $tabType, $periodeType, $periodeKey);
        $scanner = $this->orchestrator->getScanner($tabType);

        return response()->json([
            'success' => true,
            'has_api_key' => $hasKey,
            'tab_type' => $tabType,
            'tab_title' => $scanner->getTabTitle(),
            'periode_type' => $periodeType,
            'periode_key' => $periodeKey,
            'audit' => $audit,
        ]);
    }

    /**
     * Menjalankan pemindaian Pra-Audit AI (DeepSeek-R1) multi-tab & multi-periode
     */
    public function runAudit(Request $request)
    {
        $request->validate([
            'tahun' => 'required|integer',
            'tab_type' => 'nullable|string',
            'periode_type' => 'nullable|string',
            'periode_key' => 'nullable|string',
            'bulan' => 'nullable|string',
            'force_refresh' => 'nullable|boolean',
        ]);

        $user = Auth::user();
        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Sesi pengguna tidak valid.',
            ], 401);
        }

        $tahun = (int) $request->input('tahun');
        $tabType = $request->input('tab_type', 'reg');
        $periodeType = $request->input('periode_type', 'bulanan');
        $periodeKey = $request->input('periode_key');

        if (! $periodeKey) {
            $bulan = $request->input('bulan');
            $periodeKey = $bulan ? strtolower(trim($bulan)) : 'januari';
        }

        $forceRefresh = $request->boolean('force_refresh', false);

        try {
            $result = $this->orchestrator->scan(
                $user,
                $this->variant,
                $tahun,
                $tabType,
                $periodeType,
                $periodeKey,
                $forceRefresh
            );

            $statusCode = $result['success'] ? 200 : 422;

            return response()->json($result, $statusCode);
        } catch (\Throwable $e) {
            Log::error('Error executing Multi-Tab BKU Audit: '.$e->getMessage());
            Log::error($e->getTraceAsString());

            return response()->json([
                'success' => false,
                'message' => 'Gagal menjalankan audit: '.$e->getMessage(),
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

        $tabTitle = $audit->metadata['tab_title'] ?? $this->orchestrator->getScanner($audit->tab_type ?? 'reg')->getTabTitle();
        $periodeLabel = $audit->metadata['periode_label'] ?? ($audit->bulan ?: ucfirst($audit->periode_key));

        $pdf = Pdf::loadView('pdf.bku-audit-report', [
            'audit' => $audit,
            'sekolah' => $sekolah,
            'penganggaran' => $penganggaran,
            'tabTitle' => $tabTitle,
            'periodeLabel' => $periodeLabel,
            'variantTitle' => VariantConfig::title($audit->variant),
        ])->setPaper('a4', 'portrait');

        $fileName = sprintf(
            'Lembar_Pra_Audit_AI_%s_%s_%s_%s.pdf',
            strtoupper($audit->variant),
            strtoupper($audit->tab_type ?? 'REG'),
            str_replace(' ', '_', $audit->periode_key ?? 'periode'),
            $audit->tahun
        );

        return $pdf->download($fileName);
    }
}
