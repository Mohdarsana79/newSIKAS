<?php

namespace App\Http\Controllers;

use App\Models\CalkReport;
use App\Services\Ai\CalkAiGenerator;
use App\Services\Ai\CalkDataAggregator;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class CalkReportController extends Controller
{
    protected string $variant;

    public function __construct()
    {
        $this->variant = app()->bound('variant') ? app('variant') : 'reguler';
    }

    /**
     * Memuat data laporan CaLK dan ringkasan finansial live.
     */
    public function index(Request $request, CalkDataAggregator $aggregator): JsonResponse
    {
        try {
            $tahun = (int) $request->input('tahun', 2026);
            $periode = $request->input('periode', 'tahunan');

            $metrics = $aggregator->aggregate($this->variant, $tahun, $periode);
            $report = CalkReport::where('variant', $this->variant)
                ->where('tahun_anggaran', $tahun)
                ->where('periode', $periode)
                ->first();

            return response()->json([
                'status' => 'success',
                'data' => [
                    'metrics' => $metrics,
                    'report' => $report,
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('❌ [CALK INDEX] Error: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Gagal memuat data CaLK: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Memicu generasi teks narasi CaLK berbasis DeepSeek-V3.
     */
    public function generate(
        Request $request,
        CalkDataAggregator $aggregator,
        CalkAiGenerator $generator
    ): JsonResponse {
        try {
            $request->validate([
                'tahun' => 'required|integer',
                'periode' => 'required|string|in:tahap_1,tahap_2,tahunan',
            ]);

            $user = $request->user();
            $tahun = (int) $request->input('tahun');
            $periode = $request->input('periode');

            // 1. Agregasi angka riil
            $metrics = $aggregator->aggregate($this->variant, $tahun, $periode);

            // 2. Generate narasi dengan DeepSeek AI
            $narrative = $generator->generate($user, $metrics);

            // 3. Simpan ke database
            $report = CalkReport::updateOrCreate(
                [
                    'variant' => $this->variant,
                    'tahun_anggaran' => $tahun,
                    'periode' => $periode,
                ],
                [
                    'judul_laporan' => "Catatan Atas Laporan Keuangan (CaLK) {$metrics['periode_label']} {$tahun}",
                    'metrics_snapshot' => $metrics,
                    'bab_1_pendahuluan' => $narrative['bab_1_pendahuluan'] ?? null,
                    'bab_2_kebijakan_akuntansi' => $narrative['bab_2_kebijakan_akuntansi'] ?? null,
                    'bab_3_analisis_realisasi' => $narrative['bab_3_analisis_realisasi'] ?? null,
                    'bab_4_penjelasan_pos_keuangan' => $narrative['bab_4_penjelasan_pos_keuangan'] ?? null,
                    'bab_5_penutup' => $narrative['bab_5_penutup'] ?? null,
                    'user_id' => $user->id,
                ]
            );

            return response()->json([
                'status' => 'success',
                'message' => 'Narasi CaLK berhasil disusun oleh DeepSeek AI.',
                'data' => [
                    'metrics' => $metrics,
                    'report' => $report,
                    'is_ai_generated' => $narrative['is_ai_generated'] ?? false,
                    'warning' => $narrative['warning'] ?? null,
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('❌ [CALK GENERATE] Error: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Gagal menyusun narasi CaLK: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Menyimpan suntingan teks manual yang diketik oleh bendahara.
     */
    public function save(Request $request, CalkDataAggregator $aggregator): JsonResponse
    {
        try {
            $request->validate([
                'tahun' => 'required|integer',
                'periode' => 'required|string|in:tahap_1,tahap_2,tahunan',
                'bab_1_pendahuluan' => 'nullable|string',
                'bab_2_kebijakan_akuntansi' => 'nullable|string',
                'bab_3_analisis_realisasi' => 'nullable|string',
                'bab_4_penjelasan_pos_keuangan' => 'nullable|string',
                'bab_5_penutup' => 'nullable|string',
            ]);

            $user = $request->user();
            $tahun = (int) $request->input('tahun');
            $periode = $request->input('periode');

            $existing = CalkReport::where('variant', $this->variant)
                ->where('tahun_anggaran', $tahun)
                ->where('periode', $periode)
                ->first();

            $metrics = $existing ? $existing->metrics_snapshot : $aggregator->aggregate($this->variant, $tahun, $periode);

            $report = CalkReport::updateOrCreate(
                [
                    'variant' => $this->variant,
                    'tahun_anggaran' => $tahun,
                    'periode' => $periode,
                ],
                [
                    'judul_laporan' => "Catatan Atas Laporan Keuangan (CaLK) {$periode} {$tahun}",
                    'metrics_snapshot' => $metrics,
                    'bab_1_pendahuluan' => $request->input('bab_1_pendahuluan'),
                    'bab_2_kebijakan_akuntansi' => $request->input('bab_2_kebijakan_akuntansi'),
                    'bab_3_analisis_realisasi' => $request->input('bab_3_analisis_realisasi'),
                    'bab_4_penjelasan_pos_keuangan' => $request->input('bab_4_penjelasan_pos_keuangan'),
                    'bab_5_penutup' => $request->input('bab_5_penutup'),
                    'user_id' => $user->id,
                ]
            );

            return response()->json([
                'status' => 'success',
                'message' => 'Perubahan dokumen CaLK berhasil disimpan.',
                'data' => [
                    'report' => $report,
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('❌ [CALK SAVE] Error: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Gagal menyimpan perubahan CaLK: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Mengekspor dokumen CaLK ke format PDF resmi siap cetak / tanda tangan.
     */
    public function exportPdf(Request $request, $id)
    {
        $report = CalkReport::findOrFail($id);
        $metrics = $report->metrics_snapshot;

        $pdf = Pdf::loadView('pdf.calk-report', [
            'report' => $report,
            'metrics' => $metrics,
            'sekolah' => $metrics['sekolah'] ?? [],
            'finansial' => $metrics['finansial'] ?? [],
            'tanggalCetak' => now()->translatedFormat('d F Y'),
        ]);

        $pdf->setPaper('a4', 'portrait');

        $safeName = "CaLK_BOSP_{$report->tahun_anggaran}_{$report->periode}.pdf";

        return $pdf->stream($safeName);
    }
}
