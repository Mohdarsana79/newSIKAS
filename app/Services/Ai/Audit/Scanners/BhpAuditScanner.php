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
            $amt = (float) ($t->dibelanjakan ?? $t->nominal_transaksi ?? 0);

            // Cek apakah masuk kelompok belanja barang pakai (5.1.02)
            if (str_starts_with($rek, '5.1.02') || str_contains($uraian, 'atk') || str_contains($uraian, 'kertas') || str_contains($uraian, 'tinta') || str_contains($uraian, 'konsumsi')) {
                $totalBelanjaBhp += $amt;
                $itemsBhp[] = $t;

                // Cek salah pos: Ada kata kunci aset di dalam belanja habis pakai
                foreach ($keywordsAset as $kw) {
                    if (str_contains($uraian, $kw)) {
                        $potensiSalahAkun[] = [
                            'id' => $t->id,
                            'tanggal' => $t->tanggal_transaksi,
                            'uraian' => $t->uraian,
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
                'description' => 'Ditemukan pembelian barang berkarakteristik aset inventaris tahan lama (kata kunci: '.implode(', ', $keywordsFound).') dengan total nilai Rp '.number_format($totalSalahPos, 0, ',', '.').' yang dicatat pada akun Belanja Operasi Habis Pakai (5.1.02).',
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
Anda adalah Auditor Aset & Persediaan BPK RI / Inspektorat Daerah spesialis Pemeriksaan Buku Pembantu Habis Pakai (BHP / Kartu Persediaan ATK dan Bahan Belajar).
Tugas Anda adalah membedakan barang habis pakai murni dengan barang aset tetap, mendeteksi pembebanan belanja aset pada pos habis pakai, dan memastikan ketertiban kartu persediaan.

Aturan Evaluasi:
1. Hitung compliance_score (0-100). Berikan penalti sedang (-10 poin) untuk aset yang salah masuk pos habis pakai.
2. Buat executive_summary profesional dalam bahasa Indonesia formal birokrasi pengawasan keuangan daerah.
3. ATURAN PENYAJIAN TRANSAKSI (SANGAT KETAT):
   - DILARANG KERAS MENAMPILKAN ATAU MENYEBUT ID INTERNAL DATABASE (seperti 'ID 108', 'ID 238', dsb).
   - Selalu rujuk transaksi menggunakan: Tanggal Transaksi, Nomor Bukti, Nama Barang/Uraian, dan Kode/Nama Rekening Belanja.
   - Sertakan properti "transaction_ref" pada setiap objek temuan (contoh: "Tgl: 2026-03-05 | Barang: Kertas HVS & Tinta Printer").
4. Respon WAJIB dalam format JSON murni:
{
  "compliance_score": 90,
  "executive_summary": "Teks analisis eksekutif profesional tanpa menyebut ID internal...",
  "findings": [
    {
      "id": "BHP-FINDING-KODE",
      "category": "klasifikasi_persediaan|kewajaran_belanja",
      "severity": "danger|warning|info",
      "title": "Judul Temuan Spesifik",
      "description": "Deskripsi fakta menyebut tanggal, nomor bukti, nama barang persediaan, dan rekening belanja...",
      "recommendation": "Rekomendasi konkrit operasional untuk bendahara...",
      "transaction_ref": "Tgl: YYYY-MM-DD | Bukti: ... | Barang: ...",
      "amount": 0
    }
  ],
  "rules_checked": ["Daftar aturan yang dievaluasi..."]
}
PROMPT;
    }
}
