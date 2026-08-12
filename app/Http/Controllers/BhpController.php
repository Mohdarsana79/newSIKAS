<?php

namespace App\Http\Controllers;

use App\Models\BukuKasUmum;
use App\Models\Penganggaran;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class BhpController extends Controller
{
    /**
     * Get BHP (Barang Habis Pakai) data for the frontend table
     */
    public function getData(Request $request)
    {
        try {
            $tahun = $request->get('tahun');
            if (!$tahun) {
                $penganggaranAktif = Penganggaran::orderBy('tahun_anggaran', 'desc')->first();
                $tahun = $penganggaranAktif ? $penganggaranAktif->tahun_anggaran : date('Y');
            }

            $periode = $request->get('periode', 'Januari');
            $jenisLaporan = $request->get('jenis_laporan', 'bulanan');

            $penganggaran = Penganggaran::where('tahun_anggaran', $tahun)->first();

            if (!$penganggaran) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data penganggaran untuk tahun ' . $tahun . ' tidak ditemukan',
                ], 404);
            }

            $bulanTarget = $this->tentukanBulanDariPeriode($periode, $jenisLaporan);
            $bhpData = $this->getBhpTransactions($penganggaran->id, $tahun, $bulanTarget);
            $tanggalPeriode = $this->tentukanTanggalPeriode($periode, $tahun, $jenisLaporan);

            return response()->json([
                'success' => true,
                'data' => $bhpData,
                'tahun_used' => $tahun,
                'periode_info' => $tanggalPeriode,
            ]);
        } catch (\Exception $e) {
            Log::error('Error get BHP data: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Gagal memuat data BHP: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Generate PDF for BHP Report
     */
    public function generatePdf(Request $request)
    {
        try {
            $tahun = $request->get('tahun');
            $periode = $request->get('periode');
            $jenisLaporan = $request->get('jenis_laporan', 'bulanan');

            if (!$tahun) {
                $penganggaranAktif = Penganggaran::orderBy('tahun_anggaran', 'desc')->first();
                $tahun = $penganggaranAktif ? $penganggaranAktif->tahun_anggaran : date('Y');
            }

            $penganggaran = Penganggaran::where('tahun_anggaran', $tahun)->first();
            if (!$penganggaran) {
                return redirect()->back()->with('error', 'Data tahun ' . $tahun . ' tidak ditemukan.');
            }
            $sekolah = \App\Models\SekolahProfile::first();

            $bulanTarget = $this->tentukanBulanDariPeriode($periode, $jenisLaporan);
            $bhpData = $this->getBhpTransactions($penganggaran->id, $tahun, $bulanTarget);
            
            $periodeInfo = $this->tentukanTanggalPeriode($periode, $tahun, $jenisLaporan);
            if ($jenisLaporan === 'tahunan') {
                $periodeInfo['label'] = 'TAHUNAN';
            } elseif ($jenisLaporan === 'tahap') {
                $periodeInfo['label'] = strtoupper($periode);
            } else {
                 $periodeInfo['label'] = 'BULAN : ' . strtoupper($periode);
            }

            // Tentukan tanggal cetak
            $tanggalCetakObj = now();
            if ($jenisLaporan === 'bulanan') {
                $bulanNum = $this->convertBulanToNumber($periode);
                $tanggalCetakObj = Carbon::createFromDate($tahun, $bulanNum, 1)->endOfMonth();
            } elseif ($jenisLaporan === 'tahap') {
                if ($periode === 'Tahap 1') {
                    $tanggalCetakObj = Carbon::createFromDate($tahun, 6, 30);
                } else {
                    $tanggalCetakObj = Carbon::createFromDate($tahun, 12, 31);
                }
            } elseif ($jenisLaporan === 'tahunan') {
                $tanggalCetakObj = Carbon::createFromDate($tahun, 12, 31);
            }

            $paperSize = $request->get('paperSize', 'legal');
            $orientation = $request->get('orientation', 'landscape');
            $fontSize = $request->get('fontSize', '10pt');

            $data = [
                'tahun' => $tahun,
                'periode' => $periode,
                'periodeInfo' => $periodeInfo,
                'penganggaran' => $penganggaran,
                'sekolah' => $sekolah,
                'bhpData' => $bhpData,
                'tanggal_cetak' => $tanggalCetakObj->locale('id')->translatedFormat('d F Y'),
                'printSettings' => [
                    'paperSize' => $paperSize,
                    'orientation' => $orientation,
                    'fontSize' => $fontSize,
                ],
            ];

            $pdf = Pdf::loadView('laporan.bhp_pdf', $data);
            $pdf->setPaper($paperSize, $orientation);
            $pdf->setOptions([
                'defaultFont' => 'Arial',
                'isHtml5ParserEnabled' => true,
                'isRemoteEnabled' => true,
            ]);

            return $pdf->stream("Rekapitulasi_BHP_{$periode}_{$tahun}.pdf");
        } catch (\Exception $e) {
            Log::error('Error generate BHP PDF: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Gagal mencetak PDF BHP: ' . $e->getMessage());
        }
    }

    /**
     * Fetch transactions and map to flat list for BHP
     */
    private function getBhpTransactions($penganggaranId, $tahun, $bulanTarget)
    {
        // Get BKU with '5.1.02.01.01' code (Barang Habis Pakai)
        $transaksis = BukuKasUmum::where('penganggaran_id', $penganggaranId)
            ->whereYear('tanggal_transaksi', $tahun)
            ->whereIn(DB::raw('EXTRACT(MONTH FROM tanggal_transaksi)'), $bulanTarget)
            ->where('is_bunga_record', false)
            ->whereHas('rekeningBelanja', function($q) {
                $q->where('kode_rekening', 'like', '5.1.02.01.01%');
            })
            ->with(['kodeKegiatan', 'rekeningBelanja', 'uraianDetails'])
            ->orderBy('tanggal_transaksi', 'asc')
            ->get();

        $flattened = [];

        foreach ($transaksis as $bku) {
            foreach ($bku->uraianDetails as $detail) {
                // Determine code, fallback to parent if detail is empty
                $kegiatan = $detail->kodeKegiatan ?? $bku->kodeKegiatan;
                $rekening = $detail->rekeningBelanja ?? $bku->rekeningBelanja;

                $flattened[] = [
                    'tanggal' => Carbon::parse($bku->tanggal_transaksi)->format('d-m-Y'),
                    'kode_kegiatan' => $kegiatan ? $kegiatan->kode : '-',
                    'kode_rekening' => $rekening ? $rekening->kode_rekening : '-',
                    'no_bukti' => $bku->id_transaksi,
                    'uraian' => $detail->uraian,
                    'volume' => (int)$detail->volume,
                    'satuan' => $detail->satuan,
                    'harga_satuan' => $detail->harga_satuan,
                    'jumlah' => $detail->jumlah, // Realisasi
                ];
            }
        }

        return $flattened;
    }

    private function tentukanBulanDariPeriode($periode, $jenisLaporan)
    {
        $bulanList = [
            'januari' => 1, 'februari' => 2, 'maret' => 3, 'april' => 4,
            'mei' => 5, 'juni' => 6, 'juli' => 7, 'agustus' => 8,
            'september' => 9, 'oktober' => 10, 'november' => 11, 'desember' => 12,
        ];
        
        $periode = strtolower($periode);

        if ($jenisLaporan === 'tahunan') {
            return array_values($bulanList);
        } elseif ($jenisLaporan === 'tahap') {
            if ($periode === 'tahap 1') {
                return [1, 2, 3, 4, 5, 6];
            } elseif ($periode === 'tahap 2') {
                return [7, 8, 9, 10, 11, 12];
            }
        }

        return [$bulanList[$periode] ?? 1];
    }

    private function convertBulanToNumber($bulan)
    {
        $bulan = ucfirst(strtolower($bulan));
        $bulanList = [
            'Januari' => 1, 'Februari' => 2, 'Maret' => 3, 'April' => 4,
            'Mei' => 5, 'Juni' => 6, 'Juli' => 7, 'Agustus' => 8,
            'September' => 9, 'Oktober' => 10, 'November' => 11, 'Desember' => 12,
        ];
        return $bulanList[$bulan] ?? 1;
    }

    private function tentukanTanggalPeriode($periode, $tahun, $jenisLaporan)
    {
        if ($jenisLaporan === 'tahunan') {
            return ['periode_awal' => '01 Januari ' . $tahun, 'periode_akhir' => '31 Desember ' . $tahun];
        } elseif ($jenisLaporan === 'tahap') {
            if (strtolower($periode) === 'tahap 1') {
                return ['periode_awal' => '01 Januari ' . $tahun, 'periode_akhir' => '30 Juni ' . $tahun];
            } else {
                return ['periode_awal' => '01 Juli ' . $tahun, 'periode_akhir' => '31 Desember ' . $tahun];
            }
        } else {
            $bulan = $this->convertBulanToNumber($periode);
            $tanggalAwal = '01 ' . $this->convertNumberToBulan($bulan) . ' ' . $tahun;
            $tanggalAkhirBulan = Carbon::create($tahun, $bulan, 1)->endOfMonth()->format('d');
            $tanggalAkhir = $tanggalAkhirBulan . ' ' . $this->convertNumberToBulan($bulan) . ' ' . $tahun;
            
            return ['periode_awal' => $tanggalAwal, 'periode_akhir' => $tanggalAkhir];
        }
    }

    private function convertNumberToBulan($number) {
        $bulan = [
            1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
            5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
            9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember',
        ];
        return $bulan[$number] ?? 'Januari';
    }
}
