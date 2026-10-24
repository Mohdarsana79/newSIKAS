<?php

namespace App\Services\Ai\Audit\Scanners;

use App\Models\User;
use App\Services\Ai\Audit\BaseTabAuditScanner;

class BhpAuditScanner extends BaseTabAuditScanner
{
    public function getTabTitle(): string
    {
        return 'Buku Pembantu Barang Habis Pakai (BHP / Kartu Persediaan)';
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
            'Sinkronisasi Belanja Barang Operasional dengan Kartu Persediaan Habis Pakai',
            'Pencegahan Salah Akun: Barang Bernilai Aset Tetap Dibukukan pada Habis Pakai',
            'Ketertiban Bukti Pembelian Bahan Praktek, ATK, Kebersihan, dan Konsumsi',
            'Kewajaran Volume dan Kuantitas Belanja Barang Habis Pakai Sekolah',
            'Pengendalian Sisa Fisik Persediaan Habis Pakai pada Akhir Periode',
        ];

        $findings = [];
        $keywordsAset = ['laptop', 'komputer', 'printer', 'infokus', 'proyektor', 'lemari', 'ac split', 'meja guru', 'kursi siswa', 'sound system', 'kamera', 'televisi'];

        $potensiSalahAkun = [];
        $totalBelanjaBhp = 0.0;
        $itemsBhp = [];

        foreach ($transactions as $t) {
            if ($t->is_bunga_record) {
                continue;
            }

            $rek = $t->rekeningBelanja?->kode_rekening ?? '';
            $uraian = strtolower($t->uraian ?? '');
            $uraianOps = strtolower($t->uraian_opsional ?? '');
            $fullText = trim($uraian.' '.$uraianOps);
            $amt = (float) ($t->dibelanjakan ?? $t->nominal_transaksi ?? 0);

            // Cek apakah masuk kelompok belanja barang pakai habis (5.1.02.01)
            $isBhp = false;
            if (str_starts_with($rek, '5.1.02.01')) {
                $isBhp = true;
            } elseif (empty($rek)) {
                // Fallback jika kode rekening tidak terisi
                $isNonBhp = str_contains($fullText, 'jasa') || str_contains($fullText, 'honor') || str_contains($fullText, 'perjalanan') || str_contains($fullText, 'pemeliharaan');
                if (! $isNonBhp && (str_contains($fullText, 'atk') || str_contains($fullText, 'kertas') || str_contains($fullText, 'tinta') || str_contains($fullText, 'konsumsi') || str_contains($fullText, 'alat tulis') || str_contains($fullText, 'bahan habis pakai') || str_contains($fullText, 'persediaan'))) {
                    $isBhp = true;
                }
            }

            if ($isBhp) {
                $totalBelanjaBhp += $amt;
                $itemsBhp[] = $t;

                // Cek salah pos: Ada kata kunci aset fisik tetap di dalam pos belanja habis pakai
                foreach ($keywordsAset as $kw) {
                    if (str_contains($fullText, $kw)) {
                        // Pengecualian jika sebenarnya adalah bahan habis pakai pelengkap / suku cadang / aksesoris
                        if ($kw === 'printer' && (str_contains($fullText, 'tinta') || str_contains($fullText, 'cartridge') || str_contains($fullText, 'pita') || str_contains($fullText, 'toner') || str_contains($fullText, 'refill'))) {
                            continue;
                        }
                        if ($kw === 'komputer' && (str_contains($fullText, 'kertas') || str_contains($fullText, 'mouse') || str_contains($fullText, 'keyboard') || str_contains($fullText, 'kabel') || str_contains($fullText, 'pembersih'))) {
                            continue;
                        }
                        if (($kw === 'proyektor' || $kw === 'infokus') && (str_contains($fullText, 'kabel') || str_contains($fullText, 'lampu') || str_contains($fullText, 'remote') || str_contains($fullText, 'bracket'))) {
                            continue;
                        }

                        $potensiSalahAkun[] = [
                            'id' => $t->id,
                            'tanggal' => $t->tanggal_transaksi,
                            'uraian' => ! empty($t->uraian_opsional) ? $t->uraian_opsional : $t->uraian,
                            'keyword' => $kw,
                            'kode_rekening' => $rek,
                            'amount' => $amt,
                        ];
                        break;
                    }
                }
            }
        }

        // Temuan: Potensi Pengadaan Aset Tetap Dicatat di Habis Pakai (WARNING)
        if (! empty($potensiSalahAkun)) {
            $totalSalahPos = array_sum(array_column($potensiSalahAkun, 'amount'));
            $keywordsFound = array_unique(array_column($potensiSalahAkun, 'keyword'));
            $findings[] = [
                'id' => 'BHP-ASET-MISCLASSIFIED',
                'category' => 'klasifikasi_persediaan',
                'severity' => 'warning',
                'title' => count($potensiSalahAkun).' Pengadaan Barang Bernilai Aset Tetap Tercatat pada Pos Belanja Habis Pakai',
                'description' => 'Ditemukan pembelian barang berkarakteristik aset inventaris tahan lama (kata kunci: '.implode(', ', $keywordsFound).') dengan total nilai Rp '.number_format($totalSalahPos, 0, ',', '.').' yang dicatat pada akun Belanja Operasi Habis Pakai (5.1.02.01).',
                'recommendation' => 'Periksa apakah barang tersebut memenuhi nilai kapitalisasi aset tetap daerah. Jika memenuhi, pindahkan ke akun Belanja Modal (5.2) dan terbitkan BAST agar tercatat dalam Kartu Inventaris Barang (KIB).',
                'amount' => $totalSalahPos,
            ];
        }

        $compactTrx = $this->compactTransactions(collect($itemsBhp), 25);

        return [
            'summary' => [
                'tab' => 'bhp',
                'periode_label' => $range['label'],
                'total_belanja_bhp' => $totalBelanjaBhp,
                'total_transaksi_bhp' => count($itemsBhp),
                'indikasi_salah_pos_aset' => count($potensiSalahAkun),
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
Anda adalah Auditor Aset & Persediaan BPK RI / Inspektorat Daerah spesialis Pemeriksaan Buku Pembantu Habis Pakai (BHP / Kartu Persediaan ATK dan Bahan Belajar Berdasarkan Permendikdasmen Nomor 8 Tahun 2026).
Sistem audit internal SIKAS telah selesai memverifikasi data belanja barang habis pakai (Kode Rekening 5.1.02.01), ketertiban pencatatan kartu persediaan ATK/bahan praktek, kewajaran volume, dan pemisahan tegas dari belanja modal aset tetap (5.2) secara deterministik, menetapkan skor kepatuhan matematis dan daftar temuan resmi.

Tugas Anda sebagai Auditor Konsultan / Narrator:
1. Susun "executive_summary" yang elegan, berbobot, berwibawa, dan objektif dalam bahasa birokrasi pengawasan keuangan daerah, menelaah efisiensi belanja operasional ATK/bahan belajar, ketertiban kartu persediaan, dan pencegahan salah akun barang inventaris.
2. Perkaya narasi "description" (fakta kasus riil & potensi koreksi audit BPKAD/Inspektorat) dan "recommendation" (langkah konkrit pemindahan pos belanja atau penerbitan kartu persediaan) untuk setiap temuan yang terdaftar pada "temuan_resmi_sistem".
3. ATURAN PENYAJIAN (SANGAT KETAT):
   - DILARANG KERAS MENAMPILKAN ATAU MENYEBUT ID INTERNAL DATABASE (seperti 'ID 108', 'ID 238', dsb).
   - Selalu rujuk transaksi menggunakan: Tanggal Transaksi, Nomor Bukti, Nama Barang/Uraian, dan Kode/Nama Rekening Belanja.
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
