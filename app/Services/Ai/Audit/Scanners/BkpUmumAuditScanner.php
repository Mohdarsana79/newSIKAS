<?php

namespace App\Services\Ai\Audit\Scanners;

use App\Config\VariantConfig;
use App\Models\User;
use App\Services\Ai\Audit\BaseTabAuditScanner;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class BkpUmumAuditScanner extends BaseTabAuditScanner
{
    public function getTabTitle(): string
    {
        return 'Buku Kas Umum (BKU)';
    }

    public function scanDeterministic(
        User $user,
        string $variant,
        int $tahun,
        string $periodeType,
        string $periodeKey,
        $penganggaran
    ): array {
        $range = $this->resolveMonthRange($periodeType, $periodeKey);
        $startMonth = $range['start'];
        $endMonth = $range['end'];
        $fk = VariantConfig::penganggaranFk($variant);

        $transactions = $this->getPeriodTransactions($variant, $penganggaran, $tahun, $startMonth, $endMonth);

        $rulesChecked = [
            'Ketertiban Kronologi Tanggal Transaksi & Nomor Bukti Pembukuan (BPU)',
            'Pencegahan dan Deteksi Duplikasi Transaksi Belanja (Input Ganda)',
            'Deteksi Pola Pemecahan Belanja Berulang (Split-Bill / Smurfing)',
            'Kelengkapan Rekanan / Toko Penyedia dan Penerima Pembayaran',
            'Ketepatan Perhitungan Pengeluaran Riil BKU',
            'Pengendalian dan Pengawasan Sisa Dana Kas Belum Direalisasikan (SiLPA Berjalan)',
        ];

        $findings = [];

        // 1. Cek Duplikasi Transaksi (Input Ganda)
        $seen = [];
        $duplicates = [];

        foreach ($transactions as $t) {
            if ($t->is_bunga_record) {
                continue;
            }

            $amount = (float) ($t->dibelanjakan ?? $t->nominal_transaksi ?? 0);

            // Gunakan uraian_opsional jika ada untuk membedakan transaksi riil dengan rekening sama
            $uraianSpesifik = ! empty(trim($t->uraian_opsional ?? ''))
                ? trim($t->uraian_opsional)
                : trim($t->uraian ?? '');

            $rekanan = trim((string) ($t->nama_penerima_pembayaran ?: ($t->nama_toko ?: '')));
            $nomorBukti = trim((string) ($t->nomor_nota ?: ($t->no_bukti ?: ($t->id_transaksi ?: ''))));
            $tgl = ! empty($t->tanggal_transaksi) ? Carbon::parse($t->tanggal_transaksi)->format('Y-m-d') : '';

            // Kunci unik duplikasi mencakup tanggal, nominal, uraian spesifik, dan rekanan/nomor bukti
            $key = $tgl.'|'.strtolower($uraianSpesifik).'|'.strtolower($rekanan).'|'.$amount;
            if (! empty($nomorBukti)) {
                $key .= '|'.strtolower($nomorBukti);
            }

            if (isset($seen[$key])) {
                $duplicates[] = [
                    'original_id' => $seen[$key]['id'],
                    'duplicate_id' => $t->id,
                    'tanggal' => $t->tanggal_transaksi,
                    'uraian' => $uraianSpesifik,
                    'rekanan' => $rekanan ?: '-',
                    'nomor_bukti' => $nomorBukti ?: '-',
                    'amount' => $amount,
                ];
            } else {
                $seen[$key] = ['id' => $t->id, 'tgl' => $t->tanggal_transaksi];
            }
        }

        if (! empty($duplicates)) {
            $totalDup = array_sum(array_column($duplicates, 'amount'));
            $firstDup = $duplicates[0];
            $findings[] = [
                'id' => 'BKU-DUPLICATE-TRX',
                'category' => 'duplikasi_transaksi',
                'severity' => 'danger',
                'title' => count($duplicates).' Indikasi Duplikasi / Input Transaksi Belanja Ganda',
                'description' => 'Ditemukan transaksi dengan tanggal, uraian opsional, dan nominal yang sama persis (total Rp '.number_format($totalDup, 0, ',', '.')."). Contoh: '{$firstDup['uraian']}' senilai Rp ".number_format($firstDup['amount'], 0, ',', '.').'.',
                'recommendation' => 'Periksa apakah terjadi salah input ganda oleh bendahara atau sinkronisasi ganda. Hapus salah satu transaksi jika memang duplikat.',
                'amount' => $totalDup,
            ];
        }

        // 2. Analisis Indikasi Pemecahan Belanja Menghindari Pajak (Split-Bill)
        // Kriteria pemecahan transaksi yang sah:
        // - Rekanan toko penyedia yang sama
        // - Sub-kegiatan RKAS yang sama
        // - Kode rekening belanja yang sama
        // - Bulan pelaksanaan yang sama (belanja di bulan berbeda adalah kebutuhan rutin/berkala wajar)
        // - Bukan belanja rutin bulanan (langganan internet, pulsa, listrik, air) atau jasa perorangan/honor/transport
        // - Transaksi masing-masing bernilai < Rp 2.000.000, namun jika diakumulasikan dalam paket/bulan tersebut mencapai/melebihi Rp 2.000.000 (ambang batas kena pajak PPh 22 / PPN)
        $vendorGroups = [];
        foreach ($transactions as $t) {
            if ($t->is_bunga_record) {
                continue;
            }

            $rek = $t->rekeningBelanja?->kode_rekening ?? '';
            $keg = $t->kodeKegiatan?->kode_kegiatan ?? ($t->kodeKegiatan?->kode ?? '');
            $uraian = strtolower($t->uraian ?? '');
            $uraianOpsional = strtolower($t->uraian_opsional ?? '');
            $fullText = trim($uraian.' '.$uraianOpsional);

            // Pengecualian mutlak: honorarium, gaji, jasa tenaga perorangan, perjalanan dinas, langganan daya/jasa berkala bulanan
            $isExcluded = str_starts_with($rek, '5.1.01')
                || str_starts_with($rek, '5.1.02.02.01') // Belanja Jasa Tenaga / Honorarium
                || str_starts_with($rek, '5.1.02.04')    // Belanja Perjalanan Dinas
                || str_starts_with($rek, '5.1.02.02.01.0063') // Internet/Kawat/Faksimili/TV/Pulsa Berlangganan Rutin
                || str_contains($fullText, 'honor')
                || str_contains($fullText, 'gaji')
                || str_contains($fullText, 'insentif')
                || str_contains($fullText, 'jasa tenaga')
                || str_contains($fullText, 'perjalanan dinas')
                || str_contains($fullText, 'pulsa')
                || str_contains($fullText, 'internet')
                || str_contains($fullText, 'listrik')
                || str_contains($fullText, 'air bersih')
                || str_contains($fullText, 'iuran')
                || str_contains($fullText, 'berlangganan');

            if ($isExcluded) {
                continue;
            }

            // Split-bill hanya relevan untuk penyedia barang/jasa atau rekanan toko
            $vendor = trim((string) ($t->nama_toko ?: $t->nama_penerima_pembayaran));
            $amount = (float) ($t->dibelanjakan ?? $t->nominal_transaksi ?? 0);

            // Transaksi per nota di bawah ambang batas pajak Rp 2.000.000
            if (! empty($vendor) && $amount > 0 && $amount < 2000000) {
                // Kelompokkan berdasarkan: Rekanan Toko + Kode Kegiatan + Kode Rekening + Bulan Transaksi
                $bulan = ! empty($t->tanggal_transaksi) ? Carbon::parse($t->tanggal_transaksi)->format('Y-m') : 'periode';
                $groupKey = strtolower($vendor).'|'.strtolower($keg).'|'.strtolower($rek).'|'.$bulan;

                $vendorGroups[$groupKey][] = [
                    'id' => $t->id,
                    'tanggal' => $t->tanggal_transaksi,
                    'vendor' => $vendor,
                    'kode_kegiatan' => $keg,
                    'kode_rekening' => $rek,
                    'amount' => $amount,
                    'uraian' => ! empty($t->uraian_opsional) ? $t->uraian_opsional : $t->uraian,
                ];
            }
        }

        $splitFindings = [];
        foreach ($vendorGroups as $groupKey => $items) {
            // Indikasi pemecahan transaksi jika ada 2 atau lebih transaksi pada rekanan, kegiatan, rekening, dan bulan yang sama
            // DAN total akumulasinya mencapai/melebihi ambang batas pemungutan pajak Rp 2.000.000
            if (count($items) >= 2) {
                $totalGroup = array_sum(array_column($items, 'amount'));
                if ($totalGroup >= 2000000) {
                    $splitFindings[] = [
                        'vendor' => $items[0]['vendor'],
                        'kode_kegiatan' => $items[0]['kode_kegiatan'],
                        'kode_rekening' => $items[0]['kode_rekening'],
                        'count' => count($items),
                        'total' => $totalGroup,
                        'items' => $items,
                    ];
                }
            }
        }

        if (! empty($splitFindings)) {
            $totalSplitAll = array_sum(array_column($splitFindings, 'total'));
            $topFinding = $splitFindings[0];
            $findings[] = [
                'id' => 'BKU-SPLIT-BILL',
                'category' => 'split_bill',
                'severity' => 'warning',
                'title' => count($splitFindings).' Paket Belanja Terindikasi Pemecahan Transaksi untuk Menghindari Batas Pajak/Pengadaan',
                'description' => "Ditemukan transaksi berulang di bawah Rp 2.000.000 pada rekanan toko yang sama, kode kegiatan yang sama, dan kode rekening belanja yang sama dalam bulan yang sama dengan akumulasi mencapai/melebihi Rp 2.000.000 (contoh rekanan '{$topFinding['vendor']}' pada rekening {$topFinding['kode_rekening']} sebanyak {$topFinding['count']} transaksi dengan total Rp ".number_format($topFinding['total'], 0, ',', '.').'). Total nilai transaksi: Rp '.number_format($totalSplitAll, 0, ',', '.').'.',
                'recommendation' => 'Pastikan pemecahan transaksi bukan disengaja untuk memecah pengadaan agar terhindar dari pemungutan PPh Pasal 22 / PPN atau batas pengadaan langsung/SIPLah. Jika merupakan satu kesatuan paket kebutuhan, satukan SPJ dan lakukan pemungutan pajak sesuai ketentuan.',
                'amount' => $totalSplitAll,
            ];
        }

        // 3. Kronologi Tanggal Transaksi (Deteksi Tanggal Mundur Anomali)
        $prevDate = null;
        $tanggalMundur = [];
        foreach ($transactions as $t) {
            if (! $t->tanggal_transaksi) {
                continue;
            }
            $currDate = Carbon::parse($t->tanggal_transaksi);
            if ($prevDate && $currDate->lt($prevDate)) {
                $tanggalMundur[] = [
                    'id' => $t->id,
                    'uraian' => $t->uraian,
                    'tgl_sekarang' => $currDate->toDateString(),
                    'tgl_sebelumnya' => $prevDate->toDateString(),
                ];
            }
            $prevDate = $currDate;
        }

        if (! empty($tanggalMundur)) {
            $findings[] = [
                'id' => 'BKU-ANOMALI-TANGGAL',
                'category' => 'kronologi_bku',
                'severity' => 'warning',
                'title' => count($tanggalMundur).' Transaksi Tercatat dengan Tanggal Tidak Berurutan (Mundur)',
                'description' => "Terdapat transaksi yang diinput dengan tanggal transaksi mendahului transaksi sebelumnya (misal transaksi '{$tanggalMundur[0]['uraian']}' tanggal {$tanggalMundur[0]['tgl_sekarang']} setelah tanggal {$tanggalMundur[0]['tgl_sebelumnya']}).",
                'recommendation' => 'Urutkan pencatatan transaksi BKU secara kronologis tanggal per tanggal agar buku kas umum tertib dan runtut.',
                'amount' => 0,
            ];
        }

        // 4. Analisis Sisa Dana Kas BKU Belum Direalisasikan
        $saldoAwalBank = (float) $this->bukuKasService->hitungSaldoBankSebelumBulan($penganggaran->id, $startMonth);
        $saldoAwalTunai = (float) $this->bukuKasService->hitungSaldoTunaiSebelumBulan($penganggaran->id, $startMonth);
        $saldoAwalTotal = $saldoAwalBank + $saldoAwalTunai;

        $penerimaanClass = VariantConfig::getModelClass('penerimaan_dana', $variant);
        $totalPenerimaan = 0.0;
        try {
            if ($penerimaanClass && class_exists($penerimaanClass)) {
                $totalPenerimaan = (float) $penerimaanClass::where($fk, $penganggaran->id)
                    ->whereYear('tanggal_terima', $tahun)
                    ->whereBetween(DB::raw('EXTRACT(MONTH FROM tanggal_terima)'), [$startMonth, $endMonth])
                    ->sum('jumlah_dana');
            }
        } catch (\Throwable $e) {
            $totalPenerimaan = 0.0;
        }

        $totalDanaTersedia = $saldoAwalTotal + $totalPenerimaan;
        $totalPengeluaran = (float) $transactions->where('is_bunga_record', false)->sum('dibelanjakan');
        $sisaDanaBku = max(0, $totalDanaTersedia - $totalPengeluaran);

        $isAkhirTahun = ($endMonth === 12 || $periodeKey === 'tahap_2' || $periodeType === 'tahunan');

        if ($sisaDanaBku > 0) {
            if ($isAkhirTahun) {
                $findings[] = [
                    'id' => 'BKU-SISA-DANA-BELUM-REALISASI',
                    'category' => 'realisasi_anggaran',
                    'severity' => 'info',
                    'title' => 'Terdapat Sisa Dana Kas BKU Belum Direalisasikan Sebesar Rp '.number_format($sisaDanaBku, 0, ',', '.'),
                    'description' => "Pada akhir periode pembukuan {$range['label']} Tahun Anggaran {$tahun}, Buku Kas Umum mencatat sisa dana kas yang belum direalisasikan sebesar Rp ".number_format($sisaDanaBku, 0, ',', '.').' (Total Dana Tersedia Rp '.number_format($totalDanaTersedia, 0, ',', '.').' dikurangi Realisasi Belanja Rp '.number_format($totalPengeluaran, 0, ',', '.').'). Berdasarkan Pasal 54 Permendikdasmen Nomor 8 Tahun 2026, sisa dana BOSP tahun berkenaan dapat digunakan pada tahun anggaran berikutnya setelah dicatatkan dalam RKAS sebagai SiLPA (Sisa Lebih Perhitungan Anggaran).',
                    'recommendation' => 'Pastikan sisa dana kas (baik kas di rekening bank maupun kas tunai) dicatat secara akurat pada berita acara penutupan kas per 31 Desember, dilaporkan ke dinas pendidikan, dan dianggarkan kembali pada RKAS tahun berikutnya sebagai penerimaan SiLPA.',
                    'amount' => $sisaDanaBku,
                ];
            } else {
                $findings[] = [
                    'id' => 'BKU-SISA-DANA-BERJALAN',
                    'category' => 'realisasi_anggaran',
                    'severity' => 'info',
                    'title' => 'Terdapat Sisa Saldo Kas Belum Direalisasikan Sebesar Rp '.number_format($sisaDanaBku, 0, ',', '.'),
                    'description' => "Pada penutupan pembukuan {$range['label']}, terdapat saldo kas tersedia sebesar Rp ".number_format($sisaDanaBku, 0, ',', '.').' yang belum direalisasikan (Realisasi Belanja: Rp '.number_format($totalPengeluaran, 0, ',', '.').' dari Total Dana Tersedia Rp '.number_format($totalDanaTersedia, 0, ',', '.').').',
                    'recommendation' => 'Optimalkan penyerapan belanja secara terencana sesuai jadwal kegiatan pada RKAS untuk mendukung pemenuhan kebutuhan operasional sekolah dan kelancaran program.',
                    'amount' => $sisaDanaBku,
                ];
            }
        }

        $compactTrx = $this->compactTransactions($transactions, 40);

        return [
            'summary' => [
                'tab' => 'bkp_umum',
                'periode_label' => $range['label'],
                'saldo_awal_kas' => $saldoAwalTotal,
                'total_penerimaan' => $totalPenerimaan,
                'total_dana_tersedia' => $totalDanaTersedia,
                'total_pengeluaran' => $totalPengeluaran,
                'sisa_dana_belum_realisasi' => $sisaDanaBku,
                'total_transaksi' => $transactions->count(),
                'total_pajak_dipotong' => (float) $transactions->sum('total_pajak') + (float) $transactions->sum('total_pajak_daerah'),
                'transaksi_tunai' => $transactions->where('jenis_transaksi', 'tunai')->count(),
                'transaksi_nontunai' => $transactions->where('jenis_transaksi', 'non-tunai')->count(),
            ],
            'compliance_score' => $this->calculateComplianceScore($findings),
            'rules_checked' => $rulesChecked,
            'pre_findings' => $findings,
            'transactions' => $compactTrx,
            'metadata' => [
                'periode_type' => $periodeType,
                'periode_key' => $periodeKey,
                'range_month' => [$startMonth, $endMonth],
            ],
        ];
    }

    public function getSystemPrompt(string $variant, int $tahun, string $periodeType, string $periodeKey): string
    {
        return <<<'PROMPT'
Anda adalah Auditor Finansial Senior BPK RI / Inspektorat Daerah spesialis Pengujian Buku Kas Umum (BKU) Satuan Pendidikan.
Sistem audit internal SIKAS telah selesai memverifikasi data transaksi pembukuan BKU, ketertiban nomor bukti, pencegahan transaksi ganda/pemecahan belanja, serta posisi sisa dana kas yang belum direalisasikan secara deterministik, menetapkan skor kepatuhan matematis dan daftar temuan resmi.

Tugas Anda sebagai Auditor Konsultan / Narrator:
1. Susun "executive_summary" yang elegan, berbobot, berwibawa, dan objektif dalam bahasa birokrasi pengawasan keuangan daerah, menelaah ketertiban kronologi, integritas input bukti belanja, kepatuhan administrasi BKU, serta memberikan catatan evaluasi atas sisa dana kas yang belum direalisasikan (apakah untuk SiLPA tahun berikutnya sesuai Pasal 54 Permendikdasmen Nomor 8 Tahun 2026 atau penyerapan kegiatan RKAS).
2. Perkaya narasi "description" (fakta kasus riil & potensi risiko pemeriksaan) dan "recommendation" (langkah konkrit operasional untuk bendahara/kepala sekolah) untuk setiap temuan yang terdaftar pada "temuan_resmi_sistem".
3. ATURAN PENYAJIAN (SANGAT KETAT):
   - DILARANG KERAS MENAMPILKAN ATAU MENYEBUT ID INTERNAL DATABASE (seperti 'ID 108', 'ID 238', dsb).
   - Selalu rujuk transaksi menggunakan: Tanggal Transaksi, Nomor Bukti, Uraian Belanja, dan Kode/Nama Rekening Belanja.
   - Jangan menambah temuan fiktif baru di luar "temuan_resmi_sistem".

Format Output WAJIB berupa JSON murni:
{
  "executive_summary": "Teks analisis eksekutif profesional...",
  "findings": [
    {
      "id": "ID_DARI_TEMUAN_RESMI_SISTEM",
      "description": "Uraian fakta kasus mendalam...",
      "recommendation": "Rekomendasi konkrit operasional..."
    }
  ]
}
PROMPT;
    }
}
