<?php

namespace App\Http\Controllers;

use App\Config\VariantConfig;
use App\Models\SekolahProfile; // CHANGED FROM Sekolah
use App\Services\BkuArkasDisplayService;
use App\Services\BukuKasService;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class BukuRobController extends Controller
{
    protected $bukuKasService;

    protected string $variant;

    protected string $Penganggaran;

    protected string $BukuKasUmum;

    public function __construct(BukuKasService $bukuKasService)
    {

        $this->bukuKasService = $bukuKasService;

        $this->middleware(function ($request, $next) {
            $this->variant = app()->bound('variant') ? app('variant') : 'reguler';
            $this->Penganggaran = VariantConfig::getModelClass('penganggaran', $this->variant);
            $this->BukuKasUmum = VariantConfig::getModelClass('bku', $this->variant);

            return $next($request);
        });
    }

    /**
     * Get data ROB (Rincian Objek Belanja)
     */
    public function getBkpRobData(Request $request)
    {
        $tahun = $request->input('tahun');
        $bulan = $request->input('bulan');
        try {
            $penganggaran = ($this->Penganggaran)::where('tahun_anggaran', $tahun)
                ->with('sekolah')
                ->first();

            if (! $penganggaran) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data penganggaran tidak ditemukan',
                ], 404);
            }

            // Fix case sensitivity for month
            $bulan = ucfirst(strtolower($bulan));
            $bulanAngka = $this->convertBulanToNumber($bulan);
            $saldoAwal = $this->hitungSaldoAwalRob($penganggaran->id, $tahun, $bulan);
            $isArkasMode = app(BkuArkasDisplayService::class)->isArkasMode($request);

            [$robData, $totalRealisasi] = $this->buildRobDataForMonth(
                $penganggaran->id,
                $tahun,
                $bulanAngka,
                $saldoAwal,
                $isArkasMode
            );

            // HTML return is kept empty if view doesn't exist, to prevent error.
            // If user has the view, they can uncomment or I can wrap in try-catch
            $html = '';
            try {
                // $html = view('laporan.partials.bkp-rob-table', ...)->render();
            } catch (\Exception $e) {
            }

            // Ambil tanggal tutup BKU jika ada
            $bungaRecord = ($this->BukuKasUmum)::where(VariantConfig::penganggaranFk($this->variant), $penganggaran->id)
                ->whereMonth('tanggal_transaksi', $bulanAngka)
                ->whereYear('tanggal_transaksi', $tahun)
                ->where('is_bunga_record', true)
                ->first();

            $tanggalTutup = ($bungaRecord && $bungaRecord->tanggal_tutup)
                ? Carbon::parse($bungaRecord->tanggal_tutup)
                : Carbon::create($tahun, $bulanAngka, 1)->endOfMonth();

            return response()->json([
                'success' => true,
                'html' => $html,
                'rob_data' => $robData,
                'data' => [
                    'saldo_awal' => $saldoAwal,
                    'total_realisasi' => $totalRealisasi,
                    'sisa_anggaran' => $saldoAwal - $totalRealisasi,
                    'sekolah' => $penganggaran->sekolah,
                    'kepala_sekolah' => $penganggaran->kepala_sekolah,
                    'nip_kepala_sekolah' => $penganggaran->nip_kepala_sekolah,
                    'bendahara' => $penganggaran->bendahara,
                    'nip_bendahara' => $penganggaran->nip_bendahara,
                    'tanggal_penutupan' => $tanggalTutup->locale('id')->translatedFormat('d F Y'),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error get BKP ROB data: '.$e->getMessage());

            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function generateBkpRobPdf(Request $request)
    {
        try {
            $tahun = $request->query('tahun');
            $bulanInput = $request->query('bulan');

            $penganggaran = ($this->Penganggaran)::where('tahun_anggaran', $tahun)->first();
            if (! $penganggaran) {
                return response()->json(['error' => 'Data penganggaran tidak ditemukan'], 404);
            }

            $sekolah = SekolahProfile::first();

            $monthsToProcess = [];
            // Determine months based on input
            if ($bulanInput === 'Tahap 1') {
                $monthsToProcess = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
            } elseif ($bulanInput === 'Tahap 2') {
                $monthsToProcess = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
            } elseif ($bulanInput === 'Tahunan') {
                $monthsToProcess = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
            } else {
                // Single month
                $monthsToProcess = [ucfirst(strtolower($bulanInput))];
            }

            $reports = [];
            $isArkasMode = app(BkuArkasDisplayService::class)->isArkasMode($request);

            foreach ($monthsToProcess as $bulan) {
                $bulanAngka = $this->convertBulanToNumber($bulan);
                $saldoAwal = $this->hitungSaldoAwalRob($penganggaran->id, $tahun, $bulan);

                [$robData, $totalRealisasi] = $this->buildRobDataForMonth(
                    $penganggaran->id,
                    $tahun,
                    $bulanAngka,
                    $saldoAwal,
                    $isArkasMode
                );

                // Ambil tanggal tutup BKU jika ada
                $bungaRecord = ($this->BukuKasUmum)::where(VariantConfig::penganggaranFk($this->variant), $penganggaran->id)
                    ->whereMonth('tanggal_transaksi', $bulanAngka)
                    ->whereYear('tanggal_transaksi', $tahun)
                    ->where('is_bunga_record', true)
                    ->first();

                $tanggalTutup = ($bungaRecord && $bungaRecord->tanggal_tutup)
                    ? Carbon::parse($bungaRecord->tanggal_tutup)
                    : Carbon::create($tahun, $bulanAngka, 1)->endOfMonth();

                $reports[] = [
                    'tahun' => $tahun,
                    'bulan' => $bulan,
                    'bulanAngka' => $bulanAngka,
                    'penganggaran' => $penganggaran,
                    'sekolah' => $sekolah,
                    'saldoAwal' => $saldoAwal,
                    'robData' => $robData,
                    'totalRealisasi' => $totalRealisasi,
                    'sisaAnggaran' => $saldoAwal - $totalRealisasi,
                    'tanggal_penutupan' => $tanggalTutup->locale('id')->translatedFormat('d F Y'),
                ];
            }

            $printSettings = [
                'ukuran_kertas' => request()->input('paperSize', 'A4'),
                'orientasi' => request()->input('orientation', 'landscape'),
                'font_size' => request()->input('fontSize', '10pt'),
            ];

            $data = [
                'reports' => $reports,
                'printSettings' => $printSettings,
                // Pass these for fallback or if needed by view global logic, though reports loop handles it
                'convertNumberToBulan' => function ($angka) {
                    return $this->convertNumberToBulan($angka);
                },
            ];

            $pdf = Pdf::loadView('laporan.rob_pdf', $data);
            $pdf->setPaper($printSettings['ukuran_kertas'], $printSettings['orientasi']);
            $pdf->setOptions([
                'defaultFont' => 'Arial',
                'isHtml5ParserEnabled' => true,
                'isRemoteEnabled' => true,
                'isPhpEnabled' => true,
                'chroot' => realpath(base_path()),
            ]);
            $filename = "BKP_ROB_{$bulanInput}_{$tahun}.pdf";

            return $pdf->stream($filename);

        } catch (\Exception $e) {
            Log::error('Error generating BKP ROB PDF: '.$e->getMessage());

            return response()->json(['error' => 'Gagal generate PDF: '.$e->getMessage()], 500);
        }
    }

    public function generateRobHtml($penganggaran, $tahun, $bulan, $bulanAngka)
    {
        // Placeholder implementation if needed, aligning with above fixes
        return '';
    }

    /**
     * Hitung saldo awal ROB untuk bulan tertentu (sisa dari bulan sebelumnya)
     */
    private function hitungSaldoAwalRob($penganggaran_id, $tahun, $bulan)
    {
        try {
            $bulanAngka = $this->convertBulanToNumber($bulan);

            // Jika bulan Januari, saldo awal adalah total penerimaan dana
            if ($bulanAngka == 1) {
                return $this->bukuKasService->hitungTotalDanaTersedia($penganggaran_id);
            }

            // Hitung total penerimaan dana sampai saat ini
            $totalPenerimaan = $this->bukuKasService->hitungTotalDanaTersedia($penganggaran_id);

            // Hitung total realisasi sampai bulan sebelumnya
            $totalRealisasiSampaiBulanSebelumnya = ($this->BukuKasUmum)::where(VariantConfig::penganggaranFk($this->variant), $penganggaran_id)
                ->where(function ($query) {
                    $query->where('is_bunga_record', false)->orWhereNull('is_bunga_record');
                })
                ->where(function ($query) use ($tahun, $bulanAngka) {
                    // Transaksi dari Januari sampai bulan sebelumnya
                    $query->whereYear('tanggal_transaksi', $tahun)
                        ->whereMonth('tanggal_transaksi', '<', $bulanAngka);
                })
                ->sum('total_transaksi_kotor');

            // Saldo awal = Total Penerimaan - Total Realisasi sampai bulan sebelumnya
            $saldoAwal = $totalPenerimaan - $totalRealisasiSampaiBulanSebelumnya;

            return max(0, $saldoAwal);
        } catch (\Exception $e) {
            Log::error('Error hitungSaldoAwalRob: '.$e->getMessage());

            return 0;
        }
    }

    /**
     * Bangun data transaksi BKP ROB untuk satu bulan dalam mode SIKAS atau ARKAS.
     *
     * @return array{0: array<string, mixed>, 1: float}
     */
    private function buildRobDataForMonth(int $penganggaranId, int|string $tahun, int $bulanAngka, float $saldoAwal, bool $isArkasMode = false): array
    {
        $displayService = app(BkuArkasDisplayService::class);
        $rkasMaps = $isArkasMode ? $displayService->loadRkasArkasMaps($this->variant, $penganggaranId) : null;

        $bkuData = ($this->BukuKasUmum)::where(VariantConfig::penganggaranFk($this->variant), $penganggaranId)
            ->whereMonth('tanggal_transaksi', $bulanAngka)
            ->whereYear('tanggal_transaksi', $tahun)
            ->where(function ($query) {
                $query->where('is_bunga_record', false)->orWhereNull('is_bunga_record');
            })
            ->with(['rekeningBelanja', 'kodeKegiatan', 'uraianDetails.kodeKegiatan', 'uraianDetails.rekeningBelanja'])
            ->orderBy('rekening_belanja_id')
            ->orderBy('tanggal_transaksi')
            ->get();

        $robData = [];
        $totalRealisasi = 0.0;
        $runningTotal = 0.0;

        foreach ($bkuData as $transaksi) {
            $kodeRekening = $transaksi->rekeningBelanja?->kode_rekening ?? 'N/A';
            $namaRekening = $transaksi->rekeningBelanja?->rincian_objek ?? 'N/A';

            if ($kodeRekening === 'N/A') {
                Log::warning("Skipping transaction ID {$transaksi->id} due to missing Rekening Belanja");

                continue;
            }

            if (! isset($robData[$kodeRekening])) {
                $robData[$kodeRekening] = [
                    'kode' => $kodeRekening,
                    'nama_rekening' => $namaRekening,
                    'transaksi' => [],
                    'total_realisasi' => 0,
                ];
            }

            $noBukti = $displayService->resolveNoBukti($transaksi, $isArkasMode, (string) $transaksi->id);

            if ($isArkasMode) {
                $expandedItems = $displayService->expandArkasItems($transaksi, $rkasMaps);
                foreach ($expandedItems as $expItem) {
                    $realisasi = (float) $expItem['jumlah'];
                    $runningTotal += $realisasi;
                    $totalRealisasi += $realisasi;
                    $robData[$kodeRekening]['total_realisasi'] += $realisasi;

                    $robData[$kodeRekening]['transaksi'][] = [
                        'tanggal' => $transaksi->tanggal_transaksi->format('d-m-Y'),
                        'no_bukti' => $noBukti,
                        'uraian' => $expItem['uraian'],
                        'realisasi' => $realisasi,
                        'jumlah' => $runningTotal,
                        'sisa_anggaran' => $saldoAwal - $runningTotal,
                    ];
                }
            } else {
                $realisasi = (float) $transaksi->total_transaksi_kotor;
                $runningTotal += $realisasi;
                $totalRealisasi += $realisasi;
                $robData[$kodeRekening]['total_realisasi'] += $realisasi;

                $robData[$kodeRekening]['transaksi'][] = [
                    'tanggal' => $transaksi->tanggal_transaksi->format('d-m-Y'),
                    'no_bukti' => $noBukti,
                    'uraian' => $transaksi->uraian_opsional ?? $transaksi->uraian,
                    'realisasi' => $realisasi,
                    'jumlah' => $runningTotal,
                    'sisa_anggaran' => $saldoAwal - $runningTotal,
                ];
            }
        }

        return [$robData, $totalRealisasi];
    }

    // Helper methods (proxies to service)
    private function convertBulanToNumber($bulan)
    {
        return $this->bukuKasService->convertBulanToNumber($bulan);
    }

    private function convertNumberToBulan($angka)
    {
        return $this->bukuKasService->convertNumberToBulan($angka);
    }

    protected function renderVariant($component, $props = [])
    {
        $var = $this->variant ?? (request()->route() ? (request()->route()->parameter('variant') ?? request()->get('_variant', 'reguler')) : 'reguler');
        if (app()->bound('variant')) {
            $var = app('variant');
        }

        return Inertia::render(VariantConfig::pagePrefix($var).$component, array_merge($props, [
            'variant' => $var,
            'routePrefix' => VariantConfig::routePrefix($var),
        ]));
    }
}
