<?php

namespace App\Http\Controllers;

use App\Models\PenarikanTunai;
use App\Models\SetorTunai;
use App\Models\BukuKasUmum;
use App\Models\Penganggaran;
use App\Models\SekolahProfile as Sekolah;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\BkpPembantuTunaiExport;

class BukuKasPembantuTunaiController extends Controller
{
    /**
     * Get tanggal penarikan tunai terakhir untuk penganggaran tertentu
     */
    public function getTanggalPenarikanTunai($penganggaran_id)
    {
        try {
            Log::info('Getting tanggal penarikan for penganggaran:', ['penganggaran_id' => $penganggaran_id]);

            // Validasi penganggaran_id
            if (!is_numeric($penganggaran_id)) {
                return response()->json([
                    'success' => false,
                    'message' => 'ID penganggaran tidak valid',
                ], 400);
            }

            $penarikanTerakhir = PenarikanTunai::where('penganggaran_id', $penganggaran_id)
                ->orderBy('tanggal_penarikan', 'desc')
                ->first();

            Log::info('Penarikan terakhir found:', [
                'exists' => !is_null($penarikanTerakhir),
                'tanggal' => $penarikanTerakhir ? $penarikanTerakhir->tanggal_penarikan : null,
            ]);

            if ($penarikanTerakhir && $penarikanTerakhir->tanggal_penarikan) {
                return response()->json([
                    'success' => true,
                    'tanggal_penarikan' => $penarikanTerakhir->tanggal_penarikan->format('Y-m-d'),
                    'formatted_date' => $penarikanTerakhir->tanggal_penarikan->format('d F Y'),
                    'debug' => [
                        'penganggaran_id' => $penganggaran_id,
                        'found' => true,
                    ],
                ]);
            }

            return response()->json([
                'success' => true,
                'tanggal_penarikan' => null,
                'formatted_date' => null,
                'debug' => [
                    'penganggaran_id' => $penganggaran_id,
                    'found' => false,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error getting tanggal penarikan: ' . $e->getMessage());
            Log::error('Error trace: ' . $e->getTraceAsString());

            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil data tanggal penarikan: ' . $e->getMessage(),
                'debug' => [
                    'penganggaran_id' => $penganggaran_id,
                    'error' => $e->getMessage(),
                ],
            ], 500);
        }
    }

    /**
     * Get data BKP Pembantu untuk tampilan web - METHOD BARU
     */
    public function getBkpPembantuData(Request $request)
    {
        $data = $this->getBkpPembantuDataInternal($request->input('tahun'), $request->input('bulan'));
        
        if (!$data) {
            return response()->json([
                'success' => false,
                'message' => 'Data tidak ditemukan',
            ], 404);
        }

        return response()->json(array_merge(['success' => true], $data));
    }

    /**
     * Generate PDF BKP Pembantu Tunai - VERSI DIPERBAIKI
     */
    /**
     * Generate PDF BKP Pembantu Tunai - VERSI DIPERBAIKI FULL FEATURE
     */
    public function generateBkuPembantuTunaiPdf(Request $request)
    {
        try {
            // Get Parameters from Request
            $tahun = $request->query('tahun');
            $bulan = $request->query('bulan');

            // Get Settings
            $paperSize = $request->input('paperSize', 'F4');
            $orientation = $request->input('orientation', 'landscape'); // Default landscape for this wide table
            $fontSize = $request->input('fontSize', '10pt');

            Carbon::setLocale('id');

             // List of months to process
            $monthsToProcess = [];
            
            if ($bulan === 'Tahap 1') {
                $monthsToProcess = ['januari', 'februari', 'maret', 'april', 'mei', 'juni'];
            } elseif ($bulan === 'Tahap 2') {
                $monthsToProcess = ['juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
            } elseif ($bulan === 'Tahunan') {
                $monthsToProcess = [
                    'januari', 'februari', 'maret', 'april', 'mei', 'juni',
                    'juli', 'agustus', 'september', 'oktober', 'november', 'desember'
                ];
            } else {
                $monthsToProcess = [$bulan];
            }

            $reportData = [];

            foreach ($monthsToProcess as $m) {
                // Reuse existing getBkpPembantuData logic but we need the internal data array, not JSON response.
                // Since getBkpPembantuData returns JSON response, we should refactor or call an internal method.
                // For simplicity, let's extract the logic to internal method like BKU Bank.
                
                $data = $this->getBkpPembantuDataInternal($tahun, $m);
                
                if ($data) {
                    $bulanAngka = $this->convertBulanToNumber($m);
                    $bulanAngkaStr = str_pad($bulanAngka, 2, '0', STR_PAD_LEFT);

                    $reportData[] = [
                        'tahun' => $tahun,
                        'bulan' => $m,
                        'bulanAngkaStr' => $bulanAngkaStr,
                        'items' => $data['items'],
                        'data' => $data['data'],
                        'sekolah' => $data['sekolah'],
                        'kepala_sekolah' => $data['kepala_sekolah'],
                        'bendahara' => $data['bendahara'],
                        'formatAkhirBulanLengkapHari' => $this->formatAkhirBulanLengkapHari($tahun, $m),
                        'formatTanggalAkhirBulanLengkap' => $this->formatTanggalAkhirBulanLengkap($tahun, $m),
                    ];
                }
            }

            if (empty($reportData)) {
                 return response('Data tidak ditemukan', 404);
            }

            $pdf = Pdf::loadView('laporan.bkp_pembantu_tunai_pdf', [
                'reportData' => $reportData,
                'paperSize' => $paperSize,
                'orientation' => $orientation,
                'fontSize' => $fontSize
            ]);

            $pdf->setPaper($paperSize, $orientation);

            return $pdf->stream("BKP_Pembantu_Tunai_{$bulan}_{$tahun}.pdf");
        } catch (\Exception $e) {
            Log::error('Error generating BKP Pembantu Tunai PDF: ' . $e->getMessage());
            return response('Gagal generate PDF: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Generate Excel BKP Pembantu Tunai
     */
    public function generateBkuPembantuTunaiExcel(Request $request)
    {
        try {
            $tahun = $request->query('tahun');
            $bulan = $request->query('bulan');

            Carbon::setLocale('id');

             // List of months to process
            $monthsToProcess = [];
            
            if ($bulan === 'Tahap 1') {
                $monthsToProcess = ['januari', 'februari', 'maret', 'april', 'mei', 'juni'];
            } elseif ($bulan === 'Tahap 2') {
                $monthsToProcess = ['juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
            } elseif ($bulan === 'Tahunan') {
                $monthsToProcess = [
                    'januari', 'februari', 'maret', 'april', 'mei', 'juni',
                    'juli', 'agustus', 'september', 'oktober', 'november', 'desember'
                ];
            } else {
                $monthsToProcess = [$bulan];
            }

            $reportData = [];

            foreach ($monthsToProcess as $m) {
                $data = $this->getBkpPembantuDataInternal($tahun, $m);
                
                if ($data) {
                    $bulanAngka = $this->convertBulanToNumber($m);
                    $bulanAngkaStr = str_pad($bulanAngka, 2, '0', STR_PAD_LEFT);

                    $reportData[] = [
                        'tahun' => $tahun,
                        'bulan' => $m,
                        'bulanAngkaStr' => $bulanAngkaStr,
                        'items' => $data['items'],
                        'data' => $data['data'],
                        'sekolah' => $data['sekolah'],
                        'kepala_sekolah' => $data['kepala_sekolah'],
                        'bendahara' => $data['bendahara'],
                        'formatAkhirBulanLengkapHari' => $this->formatAkhirBulanLengkapHari($tahun, $m),
                        'formatTanggalAkhirBulanLengkap' => $this->formatTanggalAkhirBulanLengkap($tahun, $m),
                    ];
                }
            }

            if (empty($reportData)) {
                 return response('Data tidak ditemukan', 404);
            }

            return Excel::download(new BkpPembantuTunaiExport($reportData), "BKP_Pembantu_Tunai_{$bulan}_{$tahun}.xlsx");

        } catch (\Exception $e) {
            Log::error('Error generating BKP Pembantu Tunai Excel: ' . $e->getMessage());
            return response('Gagal generate Excel: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Internal helper specific for logic extraction
     */
    public function getBkpPembantuDataInternal($tahun, $bulan) 
    {
         $penganggaran = Penganggaran::where('tahun_anggaran', $tahun)->first();
         if (!$penganggaran) return null;

         $bulanAngka = $this->convertBulanToNumber($bulan);
         
         // Reuse the logic from getBkpPembantuData but return array
         // Copying essential parts
         $penarikanTunais = PenarikanTunai::where('penganggaran_id', $penganggaran->id)
                ->whereMonth('tanggal_penarikan', $bulanAngka)
                ->whereYear('tanggal_penarikan', $tahun)
                ->orderBy('tanggal_penarikan', 'asc')
                ->get();

        $setorTunais = SetorTunai::where('penganggaran_id', $penganggaran->id)
            ->whereMonth('tanggal_setor', $bulanAngka)
            ->whereYear('tanggal_setor', $tahun)
            ->orderBy('tanggal_setor', 'asc')
            ->get();

        $bkuDataTunai = BukuKasUmum::where('penganggaran_id', $penganggaran->id)
            ->whereMonth('tanggal_transaksi', $bulanAngka)
            ->whereYear('tanggal_transaksi', $tahun)
            ->where('is_bunga_record', false)
            ->where('jenis_transaksi', 'tunai')
            ->with(['kodeKegiatan', 'rekeningBelanja'])
            ->orderBy('tanggal_transaksi', 'asc')
            ->get();

        $saldoAwalTunai = $this->hitungSaldoTunaiSebelumBulan($penganggaran->id, $bulanAngka);
        $totalPenerimaan = $saldoAwalTunai + $penarikanTunais->sum('jumlah_penarikan');

        $pajakPenerimaan = 0;
        $pajakPengeluaran = 0;
        $pajakDaerahPenerimaan = 0;
        $pajakDaerahPengeluaran = 0;

        foreach ($bkuDataTunai as $transaksi) {
            if ($transaksi->total_pajak > 0) {
                $pajakPenerimaan += $transaksi->total_pajak;
                if (!empty($transaksi->ntpn)) {
                    $pajakPengeluaran += $transaksi->total_pajak;
                }
            }
            if ($transaksi->total_pajak_daerah > 0) {
                $pajakDaerahPenerimaan += $transaksi->total_pajak_daerah;
                if (!empty($transaksi->ntpn)) {
                    $pajakDaerahPengeluaran += $transaksi->total_pajak_daerah;
                }
            }
        }

        $totalPenerimaan += $pajakPenerimaan + $pajakDaerahPenerimaan;
        $totalPengeluaran = $setorTunais->sum('jumlah_setor')
            + $bkuDataTunai->sum('total_transaksi_kotor')
            + $pajakPengeluaran + $pajakDaerahPengeluaran;

        $currentSaldo = $totalPenerimaan - $totalPengeluaran;
        
        $items = [];
        
        // Hitung total penarikan tunai
        $totalPenarikanTunai = $penarikanTunais->sum('jumlah_penarikan');

        // Penarikan Tunai - Skip adding to items, handled via summary
        // foreach ($penarikanTunais as $p) { ... }
        foreach ($setorTunais as $s) {
            $items[] = [
                'tanggal' => $s->tanggal_setor,
                'uraian' => 'Setor Tunai',
                'no_bukti' => '',
                'kode_rekening' => '-',
                'penerimaan' => 0,
                'pengeluaran' => $s->jumlah_setor,
            ];
        }
        foreach ($bkuDataTunai as $bku) {
            $items[] = [
                'tanggal' => $bku->tanggal_transaksi,
                'uraian' => $bku->uraian_opsional ? $bku->uraian_opsional : $bku->uraian,
                'no_bukti' => $bku->id_transaksi,
                'kode_rekening' => $bku->rekeningBelanja ? $bku->rekeningBelanja->kode_rekening : '-',
                'penerimaan' => 0,
                'pengeluaran' => $bku->total_transaksi_kotor,
            ];
            
            if ($bku->total_pajak > 0) {
                 $items[] = [
                     'tanggal' => $bku->tanggal_transaksi,
                     'uraian' => 'Terima Pajak ' . $bku->pajak . ' ' . $bku->persen_pajak . '%' . ' ' . $bku->uraian_opsional,
                     'no_bukti' => $bku->kode_masa_pajak,
                     'kode_rekening' => '-',
                     'penerimaan' => $bku->total_pajak,
                     'pengeluaran' => 0,
                 ];
                 if (!empty($bku->ntpn)) {
                     $items[] = [
                         'tanggal' => $bku->tanggal_transaksi,
                         'uraian' => 'Setor Pajak ' . $bku->pajak . ' ' . $bku->persen_pajak . '%' . ' ' . $bku->uraian_opsional,
                         'no_bukti' => $bku->kode_masa_pajak, // Changed to correct mapping if needed
                         'kode_rekening' => '-',
                         'penerimaan' => 0,
                         'pengeluaran' => $bku->total_pajak,
                     ];
                 }
            }
            if ($bku->total_pajak_daerah > 0) {
                 $items[] = [
                     'tanggal' => $bku->tanggal_transaksi,
                     'uraian' => 'Terima Pajak ' . $bku->pajak_daerah . ' ' . $bku->persen_pajak_daerah . '%' . ' ' . $bku->uraian_opsional,
                     'no_bukti' => $bku->kode_masa_pajak,
                     'kode_rekening' => '-',
                     'penerimaan' => $bku->total_pajak_daerah,
                     'pengeluaran' => 0,
                 ];
                 if (!empty($bku->ntpn)) {
                     $items[] = [
                         'tanggal' => $bku->tanggal_transaksi,
                         'uraian' => 'Setor Pajak ' . $bku->pajak_daerah . ' ' . $bku->persen_pajak_daerah . '%' . ' ' . $bku->uraian_opsional,
                         'no_bukti' => $bku->kode_masa_pajak,
                         'kode_rekening' => '-',
                         'penerimaan' => 0,
                         'pengeluaran' => $bku->total_pajak_daerah,
                     ];
                 }
            }
        }
        
        usort($items, function($a, $b) {
            return strtotime($a['tanggal']) - strtotime($b['tanggal']);
        });

        return [
            'items' => $items,
            'data' => [
                'saldoAwalTunai' => $saldoAwalTunai,
                'totalPenerimaan' => $totalPenerimaan,
                'totalPengeluaran' => $totalPengeluaran,
                'totalPengeluaran' => $totalPengeluaran,
                'currentSaldo' => $currentSaldo,
                'totalPenarikan' => $totalPenarikanTunai
            ],
            'sekolah' => [
                'nama_sekolah' => $penganggaran->sekolah->nama_sekolah,
                'npsn' => $penganggaran->sekolah->npsn,
                'kelurahan_desa' => $penganggaran->sekolah->kelurahan_desa,
                'kecamatan' => $penganggaran->sekolah->kecamatan,
                'kabupaten' => $penganggaran->sekolah->kabupaten_kota,
                'provinsi' => $penganggaran->sekolah->provinsi,
            ],
            'kepala_sekolah' => [
                'nama' => $penganggaran->kepala_sekolah ?? $penganggaran->sekolah->nama_kepala_sekolah,
                'nip' => $penganggaran->nip_kepala_sekolah ?? $penganggaran->sekolah->nip_kepala_sekolah,
            ],
            'bendahara' => [
                'nama' => $penganggaran->bendahara ?? $penganggaran->sekolah->nama_bendahara,
                'nip' => $penganggaran->nip_bendahara ?? $penganggaran->sekolah->nip_bendahara,
            ],
        ];
    }

    /**
     * Hitung saldo tunai sebelum bulan tertentu - DIPERBAIKI
     */
    private function hitungSaldoTunaiSebelumBulan($penganggaran_id, $bulanTarget)
    {
        try {
            // Jika bulan target adalah Januari (1), maka saldo awal adalah 0
            if ($bulanTarget == 1) {
                return 0;
            }

            // Hitung total penarikan tunai sampai bulan sebelumnya
            $totalPenarikanSampaiBulanSebelumnya = PenarikanTunai::where('penganggaran_id', $penganggaran_id)
                ->whereRaw('EXTRACT(MONTH FROM tanggal_penarikan) < ?', [$bulanTarget])
                ->sum('jumlah_penarikan');

            // Hitung total setor tunai sampai bulan sebelumnya
            $totalSetorSampaiBulanSebelumnya = SetorTunai::where('penganggaran_id', $penganggaran_id)
                ->whereRaw('EXTRACT(MONTH FROM tanggal_setor) < ?', [$bulanTarget])
                ->sum('jumlah_setor');

            // Hitung total belanja tunai sampai bulan sebelumnya
            $belanjaTunaiSampaiBulanSebelumnya = BukuKasUmum::where('penganggaran_id', $penganggaran_id)
                ->where('jenis_transaksi', 'tunai')
                ->whereRaw('EXTRACT(MONTH FROM tanggal_transaksi) < ?', [$bulanTarget])
                ->sum('total_transaksi_kotor');

            // Pajak Logic for Previous Months (Important!)
            // Currently controller's logic: Tunai = (Penarikan - Setor) - Belanja.
            // Does it include Taxes?
            // Usually Tax Pungut adds to cash, Tax Setor reduces it.
            // If they cancel out, net is 0. But if outstanding tax, it might affect balance.
            
            // Re-checking calculation formula:
            // $saldoTunai = ($totalPenarikanSampaiBulanSebelumnya - $totalSetorSampaiBulanSebelumnya) - $belanjaTunaiSampaiBulanSebelumnya;
            // It seems simple.
            
            // Let's check taxes for previous balance
            // Pungut Pajak (+), Setor Pajak (-)
            // $pajakTerima = BKU::... sum(total_pajak + total_pajak_daerah)
            // $pajakSetor = BKU::... where not null ntpn ... sum(total_pajak + total_pajak_daerah)
            
             $bkuPrev = BukuKasUmum::where('penganggaran_id', $penganggaran_id)
                ->where('jenis_transaksi', 'tunai')
                ->whereRaw('EXTRACT(MONTH FROM tanggal_transaksi) < ?', [$bulanTarget])
                ->get();
            
            $pajakNet = 0;
            foreach($bkuPrev as $b) {
                // Pungut (+)
                $pajakNet += ($b->total_pajak + $b->total_pajak_daerah);
                // Setor (-)
                if (!empty($b->ntpn)) {
                    $pajakNet -= ($b->total_pajak + $b->total_pajak_daerah);
                }
            }

            $saldoTunai = ($totalPenarikanSampaiBulanSebelumnya - $totalSetorSampaiBulanSebelumnya) - $belanjaTunaiSampaiBulanSebelumnya + $pajakNet;

            Log::info('Perhitungan Saldo Tunai Sebelum Bulan - DIPERBAIKI', [
                'penganggaran_id' => $penganggaran_id,
                'bulan_target' => $bulanTarget,
                'total_penarikan' => $totalPenarikanSampaiBulanSebelumnya,
                'total_setor' => $totalSetorSampaiBulanSebelumnya,
                'belanja_tunai' => $belanjaTunaiSampaiBulanSebelumnya,
                'pajak_net' => $pajakNet,
                'saldo_tunai' => $saldoTunai
            ]);

            return max(0, $saldoTunai);
        } catch (\Exception $e) {
            Log::error('Error hitungSaldoTunaiSebelumBulan: ' . $e->getMessage());
            return 0;
        }
    }

    // Helper methods
    private function convertBulanToNumber($bulan)
    {
        $bulanList = [
            'januari' => 1, 'februari' => 2, 'maret' => 3, 'april' => 4,
            'mei' => 5, 'juni' => 6, 'juli' => 7, 'agustus' => 8,
            'september' => 9, 'oktober' => 10, 'november' => 11, 'desember' => 12,
            // Capitalized
            'Januari' => 1, 'Februari' => 2, 'Maret' => 3, 'April' => 4,
            'Mei' => 5, 'Juni' => 6, 'Juli' => 7, 'Agustus' => 8,
            'September' => 9, 'Oktober' => 10, 'November' => 11, 'Desember' => 12,
        ];

        return $bulanList[$bulan] ?? 1;
    }

    private function convertNumberToBulan($angka)
    {
        $bulanList = [
            1 => 'Januari',
            2 => 'Februari',
            3 => 'Maret',
            4 => 'April',
            5 => 'Mei',
            6 => 'Juni',
            7 => 'Juli',
            8 => 'Agustus',
            9 => 'September',
            10 => 'Oktober',
            11 => 'November',
            12 => 'Desember',
        ];

        return $bulanList[$angka] ?? 'Januari';
    }

    private function getTanggalAkhirBulan($tahun, $bulan)
    {
        $bulanAngka = $this->convertBulanToNumber($bulan);
        return Carbon::create($tahun, $bulanAngka, 1)->endOfMonth();
    }

    private function getHariAkhirBulan($tahun, $bulan)
    {
        $tanggalAkhirBulan = $this->getTanggalAkhirBulan($tahun, $bulan);
        return $tanggalAkhirBulan->locale('id')->dayName;
    }

    private function formatAkhirBulanLengkapHari($tahun, $bulan)
    {
        $tanggalAkhirBulan = $this->getTanggalAkhirBulan($tahun, $bulan);
        return $tanggalAkhirBulan->locale('id')->translatedFormat('l, j F Y');
    }

    private function formatAkhirBulanSingkat($tahun, $bulan)
    {
        $tanggalAkhirBulan = $this->getTanggalAkhirBulan($tahun, $bulan);
        return $tanggalAkhirBulan->format('d/m/Y');
    }

    private function formatTanggalAkhirBulanLengkap($tahun, $bulan)
    {
        $tanggalAkhirBulan = $this->getTanggalAkhirBulan($tahun, $bulan);
        return $tanggalAkhirBulan->locale('id')->translatedFormat('j F Y');
    }
}
