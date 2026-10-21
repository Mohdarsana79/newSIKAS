<?php

namespace App\Services\Ai\Audit\Scanners;

use App\Models\User;
use App\Services\Ai\Audit\BaseTabAuditScanner;
use Carbon\Carbon;

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

        $transactions = $this->getPeriodTransactions($variant, $penganggaran, $tahun, $startMonth, $endMonth);

        $rulesChecked = [
            'Ketertiban Kronologi Tanggal Transaksi & Nomor Bukti Pembukuan (BPU)',
            'Pencegahan dan Deteksi Duplikasi Transaksi Belanja (Input Ganda)',
            'Deteksi Pola Pemecahan Belanja Berulang (Split-Bill / Smurfing)',
            'Kelengkapan Rekanan / Toko Penyedia dan Penerima Pembayaran',
            'Ketepatan Perhitungan Pengeluaran Riil BKU',
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
            $key = $t->tanggal_transaksi.'|'.trim(strtolower($t->uraian ?? '')).'|'.$amount;

            if (isset($seen[$key])) {
                $duplicates[] = [
                    'original_id' => $seen[$key]['id'],
                    'duplicate_id' => $t->id,
                    'tanggal' => $t->tanggal_transaksi,
                    'uraian' => $t->uraian,
                    'amount' => $amount,
                ];
            } else {
                $seen[$key] = ['id' => $t->id, 'tgl' => $t->tanggal_transaksi];
            }
        }

        if (! empty($duplicates)) {
            $totalDup = array_sum(array_column($duplicates, 'amount'));
            $findings[] = [
                'id' => 'BKU-DUPLICATE-TRX',
                'category' => 'duplikasi_transaksi',
                'severity' => 'danger',
                'title' => count($duplicates).' Indikasi Duplikasi / Input Transaksi Belanja Ganda',
                'description' => 'Ditemukan transaksi dengan tanggal, uraian, dan nominal yang sama persis (total Rp '.number_format($totalDup, 0, ',', '.')."). Salah satu contoh: '{$duplicates[0]['uraian']}' senilai Rp ".number_format($duplicates[0]['amount'], 0, ',', '.').'.',
                'recommendation' => 'Periksa apakah terjadi salah input ganda oleh bendahara atau sinkronisasi ganda. Hapus salah satu transaksi jika memang duplikat.',
                'amount' => $totalDup,
            ];
        }

        // 2. Analisis Indikasi Split-Bill (< 2 Juta berulang ke rekanan sama)
        $vendorGroups = [];
        foreach ($transactions as $t) {
            if ($t->is_bunga_record) {
                continue;
            }
            $vendor = trim($t->nama_toko ?: $t->nama_penerima_pembayaran ?: '');
            $amount = (float) ($t->dibelanjakan ?? $t->nominal_transaksi ?? 0);

            if (! empty($vendor) && $amount > 0 && $amount < 2000000) {
                $vendorGroups[$vendor][] = [
                    'id' => $t->id,
                    'tanggal' => $t->tanggal_transaksi,
                    'amount' => $amount,
                    'uraian' => $t->uraian,
                ];
            }
        }

        $splitFindings = [];
        foreach ($vendorGroups as $vendor => $items) {
            if (count($items) >= 2) {
                $totalVendor = array_sum(array_column($items, 'amount'));
                $splitFindings[] = [
                    'vendor' => $vendor,
                    'count' => count($items),
                    'total' => $totalVendor,
                ];
            }
        }

        if (! empty($splitFindings)) {
            $totalSplitAll = array_sum(array_column($splitFindings, 'total'));
            $topVendor = $splitFindings[0];
            $findings[] = [
                'id' => 'BKU-SPLIT-BILL',
                'category' => 'split_bill',
                'severity' => 'warning',
                'title' => count($splitFindings).' Rekanan Memiliki Indikasi Pemecahan Transaksi (Split-Bill)',
                'description' => "Terdapat belanja berulang di bawah Rp 2.000.000 ke rekanan yang sama (contoh rekanan '{$topVendor['vendor']}' sebanyak {$topVendor['count']} transaksi dengan total Rp ".number_format($topVendor['total'], 0, ',', '.').'). Total indikasi pemecahan belanja: Rp '.number_format($totalSplitAll, 0, ',', '.').'.',
                'recommendation' => 'Pastikan pemecahan transaksi bukan disengaja untuk menghindari kewajiban PPN/PPh atau menghindari batas pengadaan langsung/SIPLah.',
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

        $compactTrx = $this->compactTransactions($transactions, 40);

        return [
            'summary' => [
                'tab' => 'bkp_umum',
                'periode_label' => $range['label'],
                'total_transaksi' => $transactions->count(),
                'total_pengeluaran' => (float) $transactions->sum('dibelanjakan'),
                'total_pajak_dipotong' => (float) $transactions->sum('total_pajak') + (float) $transactions->sum('total_pajak_daerah'),
                'transaksi_tunai' => $transactions->where('jenis_transaksi', 'tunai')->count(),
                'transaksi_nontunai' => $transactions->where('jenis_transaksi', 'non-tunai')->count(),
            ],
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
Tugas Anda adalah menelaah ketertiban kronologi pembukuan, mendeteksi potensi input ganda / fiktif, serta mendeteksi modus pemecahan belanja (split-bill/smurfing) untuk menghindari ambang batas pengadaan langsung atau perpajakan.

Aturan Evaluasi:
1. Hitung compliance_score (0-100). Berikan penalti berat (-20 poin) untuk duplikasi transaksi, penalti sedang (-10 poin) untuk split-bill dan anomali tanggal.
2. Buat executive_summary profesional dalam bahasa Indonesia formal birokrasi pengawasan keuangan daerah.
3. Respon WAJIB dalam format JSON murni:
{
  "compliance_score": 85,
  "executive_summary": "Teks analisis eksekutif...",
  "findings": [
    {
      "id": "FINDING-ID",
      "category": "duplikasi_transaksi|split_bill|kronologi_bku",
      "severity": "danger|warning|info",
      "title": "Judul Temuan",
      "description": "Uraian fakta...",
      "recommendation": "Rekomendasi konkrit...",
      "amount": 0
    }
  ],
  "rules_checked": ["Daftar aturan..."]
}
PROMPT;
    }
}
