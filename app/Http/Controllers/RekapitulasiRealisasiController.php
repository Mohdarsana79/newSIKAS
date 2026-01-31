<?php

namespace App\Http\Controllers;

use App\Models\BukuKasUmum;
use App\Models\PenerimaanDana;
use App\Models\Penganggaran;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RekapitulasiRealisasiController extends Controller
{
    /**
     * Hitung realisasi dengan mapping kode - VERSI PUBLIC untuk dashboard
     */
    public function hitungRealisasiUntukDashboard($penganggaranId, $tahun, $bulanTarget, $jenisLaporan)
    {
        return $this->hitungRealisasiDenganMappingKode($penganggaranId, $tahun, $bulanTarget, $jenisLaporan);
    }

    /**
     * Struktur program utama yang FIX sesuai PDF
     */
    private function getStrukturProgramTetap()
    {
        return [
            '01' => [
                'nama' => 'Pengembangan Kompetensi Lulusan',
                'kode_prefix' => ['01.'],
            ],
            '02' => [
                'nama' => 'Pengembangan Standar Isi',
                'kode_prefix' => ['02.'],
            ],
            '03' => [
                'nama' => 'Pengembangan Standar Proses',
                'kode_prefix' => ['03.'],
            ],
            '04' => [
                'nama' => 'Pengembangan Pendidik dan Tenaga Kependidikan',
                'kode_prefix' => ['04.'],
            ],
            '05' => [
                'nama' => 'Pengembangan Sarana dan Prasarana Sekolah',
                'kode_prefix' => ['05.'],
            ],
            '06' => [
                'nama' => 'Pengembangan Standar Pengelolaan',
                'kode_prefix' => ['06.'],
            ],
            '07' => [
                'nama' => 'Pengembangan Standar Pembiayaan',
                'kode_prefix' => ['07.'],
            ],
            '08' => [
                'nama' => 'Pengembangan dan Implementasi Sistem Penilaian',
                'kode_prefix' => ['08.'],
            ],
        ];
    }

    /**
     * Mapping komponen BOS berdasarkan kode kegiatan
     */
    private function getMappingKomponenBos()
    {
        return [
            // Komponen 1: Penerimaan Peserta Didik Baru
            1 => [
                'nama' => 'Penerimaan Peserta Didik Baru',
                'kode_prefix' => ['03.01.'], // PPDB
            ],
            // Komponen 2: Pengembangan Perpustakaan
            2 => [
                'nama' => 'Pengembangan Perpustakaan',
                'kode_prefix' => ['02.02.', '03.02.', '05.02.'], // Semua kode perpustakaan
            ],
            // Komponen 3: Pelaksanaan Kegiatan Pembelajaran dan Ekstrakurikuler
            3 => [
                'nama' => 'Pelaksanaan Kegiatan Pembelajaran dan Ekstrakurikuler',
                'kode_prefix' => ['02.03.', '03.03.', '08.03.'], // Kegiatan pembelajaran
            ],
            // Komponen 4: Pelaksanaan Kegiatan Asesmen/Evaluasi Pembelajaran
            4 => [
                'nama' => 'Pelaksanaan Kegiatan Asesmen/Evaluasi Pembelajaran',
                'kode_prefix' => ['03.04.', '08.04.'], // Asesmen dan evaluasi
            ],
            // Komponen 5: Pelaksanaan Administrasi Kegiatan Sekolah
            5 => [
                'nama' => 'Pelaksanaan Administrasi Kegiatan Sekolah',
                'kode_prefix' => ['03.05.', '06.05.', '07.05.'], // Administrasi
            ],
            // Komponen 6: Pengembangan Profesi Pendidik dan Tenaga Kependidikan
            6 => [
                'nama' => 'Pengembangan Profesi Pendidik dan Tenaga Kependidikan',
                'kode_prefix' => ['02.06.', '04.06.', '06.06.', '08.06.'], // Pengembangan profesi
            ],
            // Komponen 7: Pembiayaan Langganan Daya dan Jasa
            7 => [
                'nama' => 'Pembiayaan Langganan Daya dan Jasa',
                'kode_prefix' => ['06.07.'], // Langganan daya dan jasa
            ],
            // Komponen 8: Pemeliharaan Sarana dan Prasarana Sekolah
            8 => [
                'nama' => 'Pemeliharaan Sarana dan Prasarana Sekolah',
                'kode_prefix' => ['05.08.'], // Pemeliharaan sarpras
            ],
            // Komponen 9: Penyediaan Alat Multi Media Pembelajaran
            9 => [
                'nama' => 'Penyediaan Alat Multi Media Pembelajaran',
                'kode_prefix' => ['05.09.'], // Multimedia
            ],
            // Komponen 10: Penyelenggaraan Bursa Kerja Khusus, Praktik Kerja Industri, Praktik Uji Kompetensi
            10 => [
                'nama' => 'Penyelenggaraan Bursa Kerja Khusus, Praktik Kerja Industri, Praktik Uji Kompetensi',
                'kode_prefix' => [], // Khusus untuk SMK, bisa diabaikan untuk SMP
            ],
            // Komponen 11: Pembayaran Honor
            11 => [
                'nama' => 'Pembayaran Honor',
                'kode_prefix' => ['07.12.'], // Honor
            ],
        ];
    }

    /**
     * Tentukan tanggal awal dan akhir periode
     */
    private function tentukanTanggalPeriode($periode, $tahun, $jenisLaporan)
    {
        $bulanList = [
            'januari' => 1,
            'februari' => 2,
            'maret' => 3,
            'april' => 4,
            'mei' => 5,
            'juni' => 6,
            'juli' => 7,
            'agustus' => 8,
            'september' => 9,
            'oktober' => 10,
            'november' => 11,
            'desember' => 12,
        ];

        $periode = strtolower($periode);

        if ($jenisLaporan === 'tahunan') {
            return [
                'periode_awal' => '01 Januari ' . $tahun,
                'periode_akhir' => '31 Desember ' . $tahun,
                'tahap' => 'Tahunan'
            ];
        } elseif ($jenisLaporan === 'tahap') {
            if ($periode === 'tahap 1') {
                return [
                    'periode_awal' => '01 Januari ' . $tahun,
                    'periode_akhir' => '30 Juni ' . $tahun,
                    'tahap' => '1'
                ];
            } elseif ($periode === 'tahap 2') {
                return [
                    'periode_awal' => '01 Juli ' . $tahun,
                    'periode_akhir' => '31 Desember ' . $tahun,
                    'tahap' => '2'
                ];
            }
        } else {
            // Laporan bulanan
            $bulan = $bulanList[$periode] ?? 1;
            // Format tanggal awal: 01 [Bulan Indonesia] [Tahun]
            $tanggalAwal = '01 ' . $this->convertNumberToBulan($bulan) . ' ' . $tahun;

            // Format tanggal akhir: [tanggal akhir] [Bulan Indonesia] [Tahun]
            $tanggalAkhirBulan = Carbon::create($tahun, $bulan, 1)->endOfMonth()->format('d');

            $tanggalAkhir = $tanggalAkhirBulan . ' ' . $this->convertNumberToBulan($bulan) . ' ' . $tahun;

            return [
                'periode_awal' => $tanggalAwal,
                'periode_akhir' => $tanggalAkhir,
                'tahap' => $this->tentukanTahapDariBulan($bulan)
            ];
        }

        // Fallback default
        return [
            'periode_awal' => '01 Januari ' . $tahun,
            'periode_akhir' => '31 Desember ' . $tahun,
            'tahap' => 'Tahunan'
        ];
    }

    /**
     * Tentukan tahap berdasarkan bulan
     */
    private function tentukanTahapDariBulan($bulan)
    {
        return $bulan <= 6 ? '1' : '2';
    }

    // Dalam RekapitulasiRealisasiController.php

    /**
     * Get realisasi data for AJAX request - VERSI DIPERBAIKI DENGAN TAHUN OTOMATIS
     */
    public function getRealisasiData(Request $request)
    {
        try {
            // Ambil tahun dari request atau gunakan tahun dari penganggaran aktif
            $tahun = $request->get('tahun');

            // Jika tahun tidak ada di request, cari dari penganggaran aktif
            if (! $tahun) {
                $penganggaranAktif = Penganggaran::orderBy('tahun_anggaran', 'desc')->first();
                if ($penganggaranAktif) {
                    $tahun = $penganggaranAktif->tahun_anggaran;
                } else {
                    $tahun = date('Y');
                }
            }

            $periode = $request->get('periode', 'Januari');
            $jenisLaporan = $request->get('jenis_laporan', 'bulanan');

            Log::info('=== GET REALISASI DATA DENGAN TAHUN OTOMATIS ===', [
                'tahun' => $tahun,
                'periode' => $periode,
                'jenis_laporan' => $jenisLaporan,
                'source' => $request->has('tahun') ? 'request' : 'auto',
            ]);

            $penganggaran = Penganggaran::where('tahun_anggaran', $tahun)->first();

            if (! $penganggaran) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data penganggaran untuk tahun ' . $tahun . ' tidak ditemukan',
                ], 404);
            }

            // Tentukan bulan yang akan dihitung berdasarkan periode
            $bulanTarget = $this->tentukanBulanDariPeriode($periode, $jenisLaporan);

            // Hitung realisasi dengan mapping baru berdasarkan kode
            $realisasiData = $this->hitungRealisasiDenganMappingKode($penganggaran->id, $tahun, $bulanTarget, $jenisLaporan);

            // $html = view('laporan.partials.tabel-realisasi', [ ... ])->render();
            $html = ''; // Placeholder just in case it's referenced, though JSON response is key.

            $tanggalPeriode = $this->tentukanTanggalPeriode($periode, $tahun, $jenisLaporan);

            $response = [
                'success' => true,
                'html' => $html,
                'tahun_used' => $tahun,
                'periode_info' => $tanggalPeriode,
                'penganggaran' => $penganggaran,
                'sekolah' => $penganggaran->sekolah
            ];

            // Merge calculation results (realisasi_data, realisasi_per_komponen, etc) into root response
            $response = array_merge($response, $realisasiData);

            return response()->json($response);
        } catch (\Exception $e) {
            Log::error('Error get realisasi data: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Gagal memuat data realisasi: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Hitung saldo periode sebelumnya
     */
    private function hitungSaldoPeriodeSebelumnya($penganggaranId, $tahun, $bulanTarget)
    {
        try {
            // Jika periode adalah Tahunan atau Tahap 1, saldo sebelumnya adalah 0
            if ($this->isPeriodeAwal($bulanTarget)) {
                return 0;
            }

            // Hitung bulan-bulan sebelumnya
            $bulanSebelumnya = $this->getBulanSebelumnya($bulanTarget);

            if (empty($bulanSebelumnya)) {
                return 0;
            }

            // Hitung total penerimaan sampai bulan sebelumnya
            $totalPenerimaanSebelumnya = PenerimaanDana::where('penganggaran_id', $penganggaranId)
                ->whereYear('tanggal_terima', $tahun)
                ->whereIn(DB::raw('EXTRACT(MONTH FROM tanggal_terima)'), $bulanSebelumnya)
                ->get()
                ->sum(function ($penerimaan) {
                    $total = $penerimaan->jumlah_dana;
                    if ($penerimaan->sumber_dana === 'Bosp Reguler Tahap 1' && $penerimaan->saldo_awal) {
                        $total += $penerimaan->saldo_awal;
                    }

                    return $total;
                });

            // Hitung total realisasi sampai bulan sebelumnya
            $totalRealisasiSebelumnya = BukuKasUmum::where('penganggaran_id', $penganggaranId)
                ->whereIn(DB::raw('EXTRACT(MONTH FROM tanggal_transaksi)'), $bulanSebelumnya)
                ->whereYear('tanggal_transaksi', $tahun)
                ->where('is_bunga_record', false)
                ->sum('total_transaksi_kotor');

            // Hitung STS sampai bulan sebelumnya
            $totalStsSebelumnya = \App\Models\Sts::where('penganggaran_id', $penganggaranId)
                ->whereYear('tanggal_bayar', $tahun)
                ->whereIn(DB::raw('EXTRACT(MONTH FROM tanggal_bayar)'), $bulanSebelumnya)
                ->where('is_bkp', true)
                ->sum('jumlah_bayar');

            // Hitung TRK Saldo Awal (jika ada di bulan sebelumnya)
            $totalTrkSebelumnya = 0;
            $penganggaran = Penganggaran::find($penganggaranId);
            if ($penganggaran && $penganggaran->is_trk_saldo_awal && $penganggaran->tanggal_trk_saldo_awal) {
                 $tglTrk = Carbon::parse($penganggaran->tanggal_trk_saldo_awal);
                 if ($tglTrk->year == $tahun && in_array($tglTrk->month, $bulanSebelumnya)) {
                     $totalTrkSebelumnya = $penganggaran->jumlah_trk_saldo_awal;
                 }
            }

            $saldoSebelumnya = $totalPenerimaanSebelumnya - $totalRealisasiSebelumnya - $totalStsSebelumnya - $totalTrkSebelumnya;

            Log::info('Perhitungan saldo periode sebelumnya:', [
                'bulan_sebelumnya' => $bulanSebelumnya,
                'total_penerimaan' => $totalPenerimaanSebelumnya,
                'total_realisasi' => $totalRealisasiSebelumnya,
                'saldo_sebelumnya' => $saldoSebelumnya,
            ]);

            return max(0, $saldoSebelumnya); // Pastikan tidak negatif

        } catch (\Exception $e) {
            Log::error('Error hitung saldo periode sebelumnya: ' . $e->getMessage());

            return 0;
        }
    }

    /**
     * Cek apakah periode awal (Tahunan atau Tahap 1)
     */
    private function isPeriodeAwal($bulanTarget)
    {
        // Jika semua bulan dari 1-12 (Tahunan) atau bulan 1-6 (Tahap 1)
        if (count($bulanTarget) === 12 || $bulanTarget === [1, 2, 3, 4, 5, 6]) {
            return true;
        }

        // Jika hanya bulan 1
        if ($bulanTarget === [1]) {
            return true;
        }

        return false;
    }

    /**
     * Dapatkan bulan-bulan sebelumnya dari bulan target
     */
    private function getBulanSebelumnya($bulanTarget)
    {
        if (empty($bulanTarget)) {
            return [];
        }

        $bulanTerkecil = min($bulanTarget);

        if ($bulanTerkecil <= 1) {
            return []; // Tidak ada bulan sebelumnya
        }

        $bulanSebelumnya = [];
        for ($i = 1; $i < $bulanTerkecil; $i++) {
            $bulanSebelumnya[] = $i;
        }

        return $bulanSebelumnya;
    }

    /**
     * Hitung total penerimaan dana BOSP periode ini
     */
    private function hitungTotalPenerimaanPeriodeIni($penganggaranId, $tahun, $bulanTarget)
    {
        try {
            $penerimaanDanas = PenerimaanDana::where('penganggaran_id', $penganggaranId)
                ->whereYear('tanggal_terima', $tahun)
                ->whereIn(DB::raw('EXTRACT(MONTH FROM tanggal_terima)'), $bulanTarget)
                ->get();

            $totalPenerimaan = $penerimaanDanas->sum(function ($penerimaan) {
                $total = $penerimaan->jumlah_dana;
                // Hanya tambah saldo awal jika ini adalah penerimaan pertama
                if ($penerimaan->sumber_dana === 'Bosp Reguler Tahap 1' && $penerimaan->saldo_awal) {
                    $total += $penerimaan->saldo_awal;
                }

                return $total;
            });



            // Hitung STS periode ini
            $totalSts = \App\Models\Sts::where('penganggaran_id', $penganggaranId)
                ->whereYear('tanggal_bayar', $tahun)
                ->whereIn(DB::raw('EXTRACT(MONTH FROM tanggal_bayar)'), $bulanTarget)
                ->where('is_bkp', true)
                ->sum('jumlah_bayar');

            // Hitung TRK Saldo Awal (jika ada di periode ini)
            $totalTrk = 0;
            $penganggaran = Penganggaran::find($penganggaranId);
            if ($penganggaran && $penganggaran->is_trk_saldo_awal && $penganggaran->tanggal_trk_saldo_awal) {
                 $tglTrk = Carbon::parse($penganggaran->tanggal_trk_saldo_awal);
                 if ($tglTrk->year == $tahun && in_array($tglTrk->month, $bulanTarget)) {
                     $totalTrk = $penganggaran->jumlah_trk_saldo_awal;
                 }
            }

            return $totalPenerimaan - $totalSts - $totalTrk;
        } catch (\Exception $e) {
            Log::error('Error hitung total penerimaan periode ini: ' . $e->getMessage());

            return 0;
        }
    }

    private function hitungRealisasiDenganMappingKode($penganggaranId, $tahun, $bulanTarget, $jenisLaporan)
    {
        try {
            Log::info('=== HITUNG REALISASI DENGAN MAPPING KODE ===', [
                'penganggaran_id' => $penganggaranId,
                'tahun' => $tahun,
                'bulan_target' => $bulanTarget,
            ]);

            $strukturProgram = $this->getStrukturProgramTetap();
            $mappingKomponen = $this->getMappingKomponenBos();

            // Komponen BOS untuk display
            $komponenBosDisplay = [];
            foreach ($mappingKomponen as $id => $data) {
                $komponenBosDisplay[$id] = $data['nama'];
            }

            // Inisialisasi data
            $realisasiData = [];
            $totalRealisasi = 0;
            $realisasiPerKomponen = array_fill_keys(array_keys($komponenBosDisplay), 0);
            
            // Temporary array untuk menyimpan data realisasi yang terorganisir per program
            $tempRealisasi = [];
             foreach ($strukturProgram as $noUrut => $programData) {
                $tempRealisasi[$noUrut] = [
                    'realisasi_komponen' => array_fill_keys(array_keys($komponenBosDisplay), 0)
                ];
            }

            // Ambil data transaksi BKU
            $transaksiBku = BukuKasUmum::where('penganggaran_id', $penganggaranId)
                ->whereIn(DB::raw('EXTRACT(MONTH FROM tanggal_transaksi)'), $bulanTarget)
                ->whereYear('tanggal_transaksi', $tahun)
                ->where('is_bunga_record', false)
                ->with(['kodeKegiatan', 'rekeningBelanja'])
                ->get();

            Log::info('Total transaksi BKU ditemukan:', ['count' => $transaksiBku->count()]);

            $debugMapping = [];

            foreach ($transaksiBku as $transaksi) {
                $kegiatan = $transaksi->kodeKegiatan;
                if (! $kegiatan) {
                    continue;
                }

                $kodeKegiatan = trim($kegiatan->kode); // Add trim for safety
                $nilaiTransaksi = $transaksi->total_transaksi_kotor;

                // Cari program berdasarkan kode (Strict check)
                $programTerkait = $this->cariProgramDariKode($kodeKegiatan, $strukturProgram);

                // Cari komponen berdasarkan kode (Strict check)
                $komponenTerkait = $this->cariKomponenDariKode($kodeKegiatan, $mappingKomponen);

                if ($programTerkait && $komponenTerkait) {
                    // Update realisasi per komponen (Total)
                    $realisasiPerKomponen[$komponenTerkait] += $nilaiTransaksi;

                    // Update realisasi per program spesifik
                    if (isset($tempRealisasi[$programTerkait])) {
                        $tempRealisasi[$programTerkait]['realisasi_komponen'][$komponenTerkait] += $nilaiTransaksi;
                    }

                    $totalRealisasi += $nilaiTransaksi;
                } else {
                    // Log fail match for debugging
                     Log::warning('Mapping failed for:', ['kode' => $kodeKegiatan, 'program' => $programTerkait, 'komponen' => $komponenTerkait]);
                }
            }

            // Format data untuk view
            foreach ($strukturProgram as $noUrut => $programData) {
                 // Gunakan data dari $tempRealisasi yang sudah diisi
                $realisasiKomponen = $tempRealisasi[$noUrut]['realisasi_komponen'];

                $realisasiData[] = [
                    'no_urut' => $noUrut,
                    'program_kegiatan' => $programData['nama'],
                    'realisasi_komponen' => $realisasiKomponen,
                    'total_kegiatan' => array_sum($realisasiKomponen),
                ];
            }

            // Hitung total dana tersedia
            $danaTersedia = $this->hitungTotalDanaTersedia($penganggaranId, $tahun, $bulanTarget);

            Log::info('=== HASIL REALISASI DENGAN MAPPING KODE ===', [
                'total_transaksi' => $transaksiBku->count(),
                'total_realisasi' => $totalRealisasi,
                'dana_tersedia' => $danaTersedia,
                'realisasi_per_komponen' => $realisasiPerKomponen,
                'debug_mapping_count' => count($debugMapping),
            ]);

            Log::info('Detail mapping:', $debugMapping);

            // Hitung komponen ringkasan keuangan
            $saldoSebelumnya = $this->hitungSaldoPeriodeSebelumnya($penganggaranId, $tahun, $bulanTarget);
            $totalPenerimaan = $this->hitungTotalPenerimaanPeriodeIni($penganggaranId, $tahun, $bulanTarget);
            $akhirSaldo = $saldoSebelumnya + $totalPenerimaan - $totalRealisasi;

            Log::info('=== RINGKASAN KEUANGAN ===', [
                'saldo_sebelumnya' => $saldoSebelumnya,
                'total_penerimaan' => $totalPenerimaan,
                'total_realisasi' => $totalRealisasi,
                'akhir_saldo' => $akhirSaldo,
            ]);

            return [
                'realisasi_data' => $realisasiData,
                'realisasi_per_komponen' => $realisasiPerKomponen,
                'total_realisasi' => $totalRealisasi,
                'dana_tersedia' => $totalPenerimaan, // Untuk kompatibilitas
                'komponen_bos' => $komponenBosDisplay,
                'debug_mapping' => $debugMapping,
                // Data ringkasan keuangan baru
                'ringkasan_keuangan' => [
                    'saldo_periode_sebelumnya' => $saldoSebelumnya,
                    'total_penerimaan_periode_ini' => $totalPenerimaan,
                    'total_penggunaan_periode_ini' => $totalRealisasi,
                    'akhir_saldo_periode_ini' => $akhirSaldo,
                ],
            ];
        } catch (\Exception $e) {
            Log::error('Error hitung realisasi dengan mapping kode: ' . $e->getMessage());

            return [
                'realisasi_data' => [],
                'realisasi_per_komponen' => [],
                'total_realisasi' => 0,
                'dana_tersedia' => 0,
                'komponen_bos' => [],
            ];
        }
    }

    /**
     * Cari program berdasarkan kode kegiatan
     */
    private function cariProgramDariKode($kodeKegiatan, $strukturProgram)
    {
        foreach ($strukturProgram as $noUrut => $programData) {
            foreach ($programData['kode_prefix'] as $prefix) {
                if (strpos($kodeKegiatan, $prefix) === 0) {
                    return $noUrut;
                }
            }
        }

        return null;
    }

    /**
     * Cari komponen berdasarkan kode kegiatan
     */
    private function cariKomponenDariKode($kodeKegiatan, $mappingKomponen)
    {
        foreach ($mappingKomponen as $komponenId => $komponenData) {
            foreach ($komponenData['kode_prefix'] as $prefix) {
                if (strpos($kodeKegiatan, $prefix) === 0) {
                    return $komponenId;
                }
            }
        }

        return null;
    }

    /**
     * Tentukan bulan yang akan dihitung berdasarkan periode
     */
    private function tentukanBulanDariPeriode($periode, $jenisLaporan)
    {
        $bulanList = [
            'januari' => 1,
            'februari' => 2,
            'maret' => 3,
            'april' => 4,
            'mei' => 5,
            'juni' => 6,
            'juli' => 7,
            'agustus' => 8,
            'september' => 9,
            'oktober' => 10,
            'november' => 11,
            'desember' => 12,
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

    /**
     * Hitung realisasi HANYA dari data aktual - VERSI SIMPLE
     */
    private function hitungRealisasiSesuaiPDF($penganggaranId, $tahun, $bulanTarget, $jenisLaporan)
    {
        try {
            Log::info('=== HITUNG REALISASI DARI DATA AKTUAL ===', [
                'penganggaran_id' => $penganggaranId,
                'tahun' => $tahun,
                'bulan_target' => $bulanTarget,
            ]);

            // Struktur program tetap
            $strukturProgram = $this->getStrukturProgramTetap();

            // Komponen BOS sesuai PDF
            $komponenBos = [
                1 => 'Penerimaan Peserta Didik Baru',
                2 => 'Pengembangan Perpustakaan',
                3 => 'Pelaksanaan Kegiatan Pembelajaran dan Ekstrakurikuler',
                4 => 'Pelaksanaan Kegiatan Asesmen/Evaluasi Pembelajaran',
                5 => 'Pelaksanaan Administrasi Kegiatan Sekolah',
                6 => 'Pengembangan Profesi Pendidik dan Tenaga Kependidikan',
                7 => 'Pembiayaan Langganan Daya dan Jasa',
                8 => 'Pemeliharaan Sarana dan Prasarana Sekolah',
                9 => 'Penyediaan Alat Multi Media Pembelajaran',
                10 => 'Penyelenggaraan Bursa Kerja Khusu, Praktik Uji Komp',
                11 => 'Pembayaran Honor',
            ];

            // Inisialisasi data
            $realisasiData = [];
            $totalRealisasi = 0;
            $realisasiPerKomponen = array_fill_keys(array_keys($komponenBos), 0);

            // HANYA gunakan data aktual dari database
            $dataAktual = $this->hitungRealisasiAktual($penganggaranId, $tahun, $bulanTarget, $strukturProgram);

            Log::info('Data aktual dari database:', $dataAktual);

            // Format data untuk view - TETAP tampilkan semua program
            foreach ($strukturProgram as $noUrut => $programNama) {
                $realisasiKomponen = array_fill_keys(array_keys($komponenBos), 0);

                // Jika ada data realisasi untuk program ini
                if (isset($dataAktual[$noUrut])) {
                    foreach ($dataAktual[$noUrut] as $komponenId => $nilai) {
                        if (isset($realisasiKomponen[$komponenId])) {
                            $realisasiKomponen[$komponenId] = $nilai;
                            $realisasiPerKomponen[$komponenId] += $nilai;
                            $totalRealisasi += $nilai;
                        }
                    }
                }

                $realisasiData[] = [
                    'no_urut' => $noUrut,
                    'program_kegiatan' => $programNama,
                    'realisasi_komponen' => $realisasiKomponen,
                    'total_kegiatan' => array_sum($realisasiKomponen),
                ];
            }

            // Hitung total dana tersedia
            $danaTersedia = $this->hitungTotalDanaTersedia($penganggaranId, $tahun, $bulanTarget);

            Log::info('=== HASIL REALISASI DARI DATA AKTUAL ===', [
                'total_program' => count($realisasiData),
                'total_realisasi' => $totalRealisasi,
                'dana_tersedia' => $danaTersedia,
                'realisasi_per_komponen' => $realisasiPerKomponen,
            ]);

            return [
                'realisasi_data' => $realisasiData,
                'realisasi_per_komponen' => $realisasiPerKomponen,
                'total_realisasi' => $totalRealisasi,
                'dana_tersedia' => $danaTersedia,
                'komponen_bos' => $komponenBos,
            ];
        } catch (\Exception $e) {
            Log::error('Error hitung realisasi dari data aktual: ' . $e->getMessage());

            return [
                'realisasi_data' => [],
                'realisasi_per_komponen' => [],
                'total_realisasi' => 0,
                'dana_tersedia' => 0,
                'komponen_bos' => [],
            ];
        }
    }

    /**
     * Hitung realisasi aktual dari database - DENGAN DEBUG
     */
    private function hitungRealisasiAktual($penganggaranId, $tahun, $bulanTarget, $strukturProgram)
    {
        $realisasiAktual = [];

        try {
            // Mapping program ke keyword untuk pencarian
            $programMapping = [
                '01' => ['kompetensi', 'lulusan', 'hasil', 'kelulusan'],
                '02' => ['standar isi', 'kurikulum', 'materi', 'silabus'],
                '03' => ['standar proses', 'pembelajaran', 'kegiatan belajar', 'proses belajar'],
                '04' => ['pendidik', 'guru', 'tenaga kependidikan', 'ptk', 'karyawan'],
                '05' => ['sarana', 'prasarana', 'fasilitas', 'bangunan', 'ruang', 'alat'],
                '06' => ['standar pengelolaan', 'manajemen', 'administrasi', 'pengelolaan'],
                '07' => ['standar pembiayaan', 'anggaran', 'keuangan', 'pembiayaan', 'dana'],
                '08' => ['sistem penilaian', 'evaluasi', 'asesmen', 'penilaian', 'ujian', 'tes'],
            ];

            // Ambil semua transaksi BKU untuk periode target
            $transaksiBku = BukuKasUmum::where('penganggaran_id', $penganggaranId)
                ->whereIn(DB::raw('EXTRACT(MONTH FROM tanggal_transaksi)'), $bulanTarget)
                ->whereYear('tanggal_transaksi', $tahun)
                ->where('is_bunga_record', false)
                ->with(['kodeKegiatan', 'rekeningBelanja'])
                ->get();

            Log::info('Total transaksi BKU ditemukan:', ['count' => $transaksiBku->count()]);

            $mappingDetails = [];

            foreach ($transaksiBku as $transaksi) {
                $kegiatan = $transaksi->kodeKegiatan;
                if (! $kegiatan) {
                    Log::warning('Transaksi tanpa kegiatan:', ['id' => $transaksi->id]);

                    continue;
                }

                // Cari program yang sesuai berdasarkan kegiatan
                $programTerkait = null;
                $kegiatanProgram = strtolower($kegiatan->program ?? '');
                $kegiatanSubProgram = strtolower($kegiatan->sub_program ?? '');
                $kegiatanUraian = strtolower($kegiatan->uraian ?? '');

                foreach ($programMapping as $noUrut => $keywords) {
                    foreach ($keywords as $keyword) {
                        $keyword = strtolower($keyword);
                        if (
                            str_contains($kegiatanProgram, $keyword) ||
                            str_contains($kegiatanSubProgram, $keyword) ||
                            str_contains($kegiatanUraian, $keyword)
                        ) {
                            $programTerkait = $noUrut;

                            // Log mapping detail
                            $mappingDetails[] = [
                                'program' => $noUrut . ' - ' . $strukturProgram[$noUrut]['nama'], // FIX: structure is array with 'nama'
                                'kegiatan' => $kegiatan->kode . ' - ' . $kegiatan->sub_program,
                                'keyword' => $keyword,
                                'nilai' => $transaksi->total_transaksi_kotor,
                            ];

                            break 2;
                        }
                    }
                }

                if ($programTerkait) {
                    // Tentukan komponen BOS
                    $komponenId = $this->tentukanKomponenBos(
                        $transaksi->rekeningBelanja,
                        $transaksi->uraian
                    );

                    if ($komponenId) {
                        if (! isset($realisasiAktual[$programTerkait])) {
                            $realisasiAktual[$programTerkait] = [];
                        }
                        if (! isset($realisasiAktual[$programTerkait][$komponenId])) {
                            $realisasiAktual[$programTerkait][$komponenId] = 0;
                        }
                        $realisasiAktual[$programTerkait][$komponenId] += $transaksi->total_transaksi_kotor;
                    }
                } else {
                    Log::warning('Tidak ditemukan mapping untuk transaksi:', [
                        'kegiatan_id' => $kegiatan->id,
                        'program' => $kegiatan->program,
                        'sub_program' => $kegiatan->sub_program,
                        'uraian' => $kegiatan->uraian,
                        'nilai' => $transaksi->total_transaksi_kotor,
                    ]);
                }
            }

            // Log detail mapping
            Log::info('Detail mapping transaksi:', $mappingDetails);
            Log::info('Realisasi aktual setelah mapping:', $realisasiAktual);
        } catch (\Exception $e) {
            Log::error('Error hitung realisasi aktual: ' . $e->getMessage());
        }

        return $realisasiAktual;
    }

    /**
     * Tentukan komponen BOS
     */
    private function tentukanKomponenBos($rekeningBelanja, $uraian)
    {
        if (! $rekeningBelanja) {
            return 3; // Default ke Kegiatan Pembelajaran
        }

        $rincianObjek = strtolower($rekeningBelanja->rincian_objek ?? '');
        $uraian = strtolower($uraian);

        // Logica pemetaan berdasarkan aturan BOS
        if (str_contains($rincianObjek, 'penerimaan') || str_contains($uraian, 'penerimaan') || str_contains($uraian, 'psb')) {
            return 1;
        } elseif (str_contains($rincianObjek, 'perpustakaan') || str_contains($uraian, 'perpustakaan') || str_contains($uraian, 'buku')) {
            return 2;
        } elseif (
            str_contains($rincianObjek, 'pembelajaran') || str_contains($uraian, 'pembelajaran') ||
            str_contains($uraian, 'kegiatan') || str_contains($uraian, 'belajar') || str_contains($uraian, 'ekstrakurikuler')
        ) {
            return 3;
        } elseif (
            str_contains($rincianObjek, 'asesmen') || str_contains($uraian, 'asesmen') ||
            str_contains($uraian, 'evaluasi') || str_contains($uraian, 'ujian') || str_contains($uraian, 'tes')
        ) {
            return 4;
        } elseif (str_contains($rincianObjek, 'administrasi') || str_contains($uraian, 'administrasi') || str_contains($uraian, 'tata usaha')) {
            return 5;
        } elseif (
            str_contains($rincianObjek, 'profesi') || str_contains($uraian, 'guru') ||
            str_contains($uraian, 'pelatihan') || str_contains($uraian, 'workshop') || str_contains($uraian, 'seminar')
        ) {
            return 6;
        } elseif (
            str_contains($rincianObjek, 'langganan') || str_contains($uraian, 'listrik') ||
            str_contains($uraian, 'air') || str_contains($uraian, 'telepon') || str_contains($uraian, 'internet')
        ) {
            return 7;
        } elseif (
            str_contains($rincianObjek, 'pemeliharaan') || str_contains($uraian, 'pemeliharaan') ||
            str_contains($uraian, 'perbaikan') || str_contains($uraian, 'maintenance')
        ) {
            return 8;
        } elseif (
            str_contains($rincianObjek, 'multimedia') || str_contains($uraian, 'proyektor') ||
            str_contains($uraian, 'laptop') || str_contains($uraian, 'komputer') || str_contains($uraian, 'printer')
        ) {
            return 9;
        } elseif (
            str_contains($rincianObjek, 'bursa kerja') || str_contains($uraian, 'prakerin') ||
            str_contains($uraian, 'praktek') || str_contains($uraian, 'industri')
        ) {
            return 10;
        } elseif (
            str_contains($rincianObjek, 'honor') || str_contains($uraian, 'honor') ||
            str_contains($uraian, 'gaji') || str_contains($uraian, 'upah')
        ) {
            return 11;
        }

        return 3; // Default ke Kegiatan Pembelajaran
    }

    /**
     * Hitung total dana tersedia
     */
    private function hitungTotalDanaTersedia($penganggaranId, $tahun, $bulanTarget)
    {
        try {
            $penerimaanDanas = PenerimaanDana::where('penganggaran_id', $penganggaranId)
                ->whereYear('tanggal_terima', $tahun)
                ->whereIn(DB::raw('EXTRACT(MONTH FROM tanggal_terima)'), $bulanTarget)
                ->get();

            $totalDana = $penerimaanDanas->sum(function ($penerimaan) {
                $total = $penerimaan->jumlah_dana;
                if ($penerimaan->sumber_dana === 'Bosp Reguler Tahap 1' && $penerimaan->saldo_awal) {
                    $total += $penerimaan->saldo_awal;
                }

                return $total;
            });

            return $totalDana;
        } catch (\Exception $e) {
            Log::error('Error hitung total dana tersedia: ' . $e->getMessage());

            return 0;
        }
    }

    /**
     * Generate PDF untuk rekapitulasi realisasi - VERSI DIPERBAIKI
     */
    public function generateRealisasiPdf(Request $request, $tahun, $periode = null)
    {
        try {
            $periode = $periode ?: $request->get('periode', 'Januari');
            $jenisLaporan = $request->get('jenis_laporan', 'bulanan');
            $debug = $request->get('debug', false);

            Log::info('=== GENERATE REALISASI PDF ===', [
                'tahun' => $tahun,
                'periode' => $periode,
                'jenis_laporan' => $jenisLaporan,
            ]);

            $penganggaran = Penganggaran::where('tahun_anggaran', $tahun)->first();

            if (! $penganggaran) {
                return response()->json(['error' => 'Data penganggaran tidak ditemukan'], 404);
            }

            $sekolah = \App\Models\SekolahProfile::first();

            $bulanTarget = $this->tentukanBulanDariPeriode($periode, $jenisLaporan);
            $realisasiData = $this->hitungRealisasiDenganMappingKode($penganggaran->id, $tahun, $bulanTarget, $jenisLaporan);

            $printSettings = [
                'ukuran_kertas' => $request->input('ukuran_kertas', 'Legal'),
                'orientasi' => $request->input('orientasi', 'landscape'),
                'font_size' => $request->input('font_size', '9pt'),
            ];

            // Tentukan tanggal periode untuk PDF
            $periodeInfo = $this->tentukanTanggalPeriode($periode, $tahun, $jenisLaporan);
            
            // Tambahkan label tahap untuk header
            if ($jenisLaporan === 'tahunan') {
                $periodeInfo['tahap_label'] = 'TAHUNAN';
            } elseif ($jenisLaporan === 'tahap') {
                $periodeInfo['tahap_label'] = strtoupper($periode);
            } else {
                 $periodeInfo['tahap_label'] = 'BULAN ' . strtoupper($periode);
            }

            // Siapkan komponen BOS
            $mappingKomponen = $this->getMappingKomponenBos();
            $komponenBosDisplay = [];
            foreach ($mappingKomponen as $id => $d) {
                $komponenBosDisplay[$id] = $d['nama'];
            }

            // Hitung ringkasan keuangan
            $saldoSebelumnya = $this->hitungSaldoPeriodeSebelumnya($penganggaran->id, $tahun, $bulanTarget);
            $totalPenerimaan = $this->hitungTotalPenerimaanPeriodeIni($penganggaran->id, $tahun, $bulanTarget);
            $totalRealisasi = $realisasiData['total_realisasi'] ?? 0;
            $akhirSaldo = $saldoSebelumnya + $totalPenerimaan - $totalRealisasi;
            
            $ringkasanKeuangan = [
                 'saldo_periode_sebelumnya' => $saldoSebelumnya,
                 'total_penerimaan_periode_ini' => $totalPenerimaan,
                 'total_penggunaan_periode_ini' => $totalRealisasi,
                 'akhir_saldo_periode_ini' => $akhirSaldo
            ];

            // Tentukan tanggal cetak
            $tanggalCetakObj = now();
            if ($jenisLaporan === 'bulanan') {
                $bulanNum = $this->convertBulanToNumber($periode);
                $tanggalCetakObj = \Carbon\Carbon::createFromDate($tahun, $bulanNum, 1)->endOfMonth();
            } elseif ($jenisLaporan === 'tahap') {
                if ($periode === 'Tahap 1') {
                    $tanggalCetakObj = \Carbon\Carbon::createFromDate($tahun, 6, 30);
                } else {
                    $tanggalCetakObj = \Carbon\Carbon::createFromDate($tahun, 12, 31);
                }
            } elseif ($jenisLaporan === 'tahunan') {
                $tanggalCetakObj = \Carbon\Carbon::createFromDate($tahun, 12, 31);
            }

            $data = [
                'tahun' => $tahun,
                'periode' => $periode,
                'jenisLaporan' => $jenisLaporan,
                'penganggaran' => $penganggaran,
                'sekolah' => $sekolah,
                
                'realisasi_data' => $realisasiData['realisasi_data'] ?? [],
                'komponen_bos' => $komponenBosDisplay,
                'ringkasan_keuangan' => $ringkasanKeuangan,
                
                'printSettings' => $printSettings,
                'tanggal_cetak' => $tanggalCetakObj->locale('id')->translatedFormat('d F Y'),
                'debug' => $debug,
                'periode_info' => $periodeInfo
            ];

            // Log data untuk debugging
            Log::info('Data PDF Realisasi:', [
                'total_realisasi' => $realisasiData['total_realisasi'] ?? 0,
                'dana_tersedia' => $realisasiData['dana_tersedia'] ?? 0,
                'jumlah_komponen' => count($realisasiData['komponen_bos'] ?? []),
                'jumlah_program' => count($realisasiData['realisasi_data'] ?? []),
            ]);

            $pdf = PDF::loadView('laporan.rekapitulasi_realisasi_pdf', $data);

            // Set paper configuration
            $pdf->setPaper($printSettings['ukuran_kertas'], $printSettings['orientasi']);

            // PDF options untuk hasil yang lebih baik
            $pdf->setOptions([
                'defaultFont' => 'Arial',
                'isHtml5ParserEnabled' => true,
                'isRemoteEnabled' => true,
                'dpi' => 150,
                'fontHeightRatio' => 0.7,
            ]);

            $filename = "Rekapitulasi_Realisasi_{$periode}_{$tahun}.pdf";

            return $pdf->stream($filename);
        } catch (\Exception $e) {
            Log::error('Error generate realisasi PDF: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());

            return response()->json([
                'error' => 'Gagal generate PDF: ' . $e->getMessage(),
                'trace' => env('APP_DEBUG') ? $e->getTraceAsString() : null,
            ], 500);
        }
    }

    /**
     * Generate PDF untuk rekapan BKU (kompatibilitas)
     */
    public function generateRealisasiPdfForRekapan($tahun, $bulan)
    {
        try {
            $penganggaran = Penganggaran::where('tahun_anggaran', $tahun)->first();

            if (! $penganggaran) {
                return response()->json(['error' => 'Data penganggaran tidak ditemukan'], 404);
            }

            $sekolah = \App\Models\SekolahProfile::first();

            $bulanTarget = [$this->convertBulanToNumber($bulan)];
            $realisasiData = $this->hitungRealisasiDenganMappingKode($penganggaran->id, $tahun, $bulanTarget, 'bulanan');

            $printSettings = [
                'ukuran_kertas' => 'A4',
                'orientasi' => 'landscape',
                'font_size' => '9pt',
            ];

            $data = [
                'tahun' => $tahun,
                'periode' => $bulan,
                'jenisLaporan' => 'bulanan',
                'penganggaran' => $penganggaran,
                'sekolah' => $sekolah,
                'realisasiData' => $realisasiData,
                'totalRealisasi' => $realisasiData['total_realisasi'] ?? 0,
                'danaTersedia' => $realisasiData['dana_tersedia'] ?? 0,
                'printSettings' => $printSettings,
                'tanggal_cetak' => now()->format('d/m/Y'),
            ];

            $pdf = PDF::loadView('laporan.realisasi-pdf', $data);
            $pdf->setPaper($printSettings['ukuran_kertas'], $printSettings['orientasi']);
            $pdf->setOptions(['defaultFont' => 'Arial']);

            $filename = "Rekapitulasi_Realisasi_{$bulan}_{$tahun}.pdf";

            return $pdf->stream($filename);
        } catch (\Exception $e) {
            Log::error('Error generate realisasi PDF for rekapan: ' . $e->getMessage());

            return response()->json(['error' => 'Gagal generate PDF'], 500);
        }
    }

    private function convertBulanToNumber($bulan)
    {
        $bulan = ucfirst(strtolower($bulan));
        $bulanList = [
            'Januari' => 1,
            'Februari' => 2,
            'Maret' => 3,
            'April' => 4,
            'Mei' => 5,
            'Juni' => 6,
            'Juli' => 7,
            'Agustus' => 8,
            'September' => 9,
            'Oktober' => 10,
            'November' => 11,
            'Desember' => 12,
        ];

        return $bulanList[$bulan] ?? 1;
    }

    /**
     * Helper function untuk konversi number ke bulan
     */
    private function convertNumberToBulan($number) {
        $bulan = [
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

        return $bulan[$number] ?? 'Januari';
    }
    public function generatePdf(Request $request)
    {
         $tahun = $request->input('tahun');
         $periode = $request->input('periode') ?? $request->input('bulan');
         return $this->generateRealisasiPdf($request, $tahun, $periode);
    }
}
