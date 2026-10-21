<?php

namespace App\Services\Ai\Audit\Scanners;

use App\Models\User;
use App\Services\Ai\Audit\BaseTabAuditScanner;

class RekRealisasiAuditScanner extends BaseTabAuditScanner
{
    public function getTabTitle(): string
    {
        return 'Rekapitulasi Realisasi per Rekening Belanja';
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
            'Proporsi Alokasi Belanja Pegawai/Honor (Maksimal 50% dari Pagu BOSP Reguler)',
            'Pemisahan Belanja Operasi Barang Jasa (5.1.02) dan Belanja Modal Aset (5.2)',
            'Ketepatan Kodefikasi Rekening Belanja Berdasarkan SAP / Permendagri',
            'Kewajaran Realisasi Belanja Pemeliharaan Sarana & Prasarana',
            'Pencegahan Penggunaan Dana BOSP untuk Belanja yang Dilarang Juknis',
        ];

        $findings = [];

        $belanjaPegawai = 0.0;
        $belanjaBarangJasa = 0.0;
        $belanjaModal = 0.0;

        foreach ($transactions as $t) {
            if ($t->is_bunga_record) {
                continue;
            }

            $rek = $t->rekeningBelanja?->kode_rekening ?? '';
            $uraian = strtolower($t->uraian ?? '');
            $amt = (float) ($t->dibelanjakan ?? $t->nominal_transaksi ?? 0);

            if (str_starts_with($rek, '5.1.01') || str_contains($uraian, 'honor') || str_contains($uraian, 'gaji')) {
                $belanjaPegawai += $amt;
            } elseif (str_starts_with($rek, '5.2') || str_contains($uraian, 'modal')) {
                $belanjaModal += $amt;
            } else {
                $belanjaBarangJasa += $amt;
            }
        }

        $totalBelanja = $belanjaPegawai + $belanjaBarangJasa + $belanjaModal;
        $paguAnggaran = (float) ($penganggaran->total_anggaran ?? $penganggaran->pendapatan ?? 0.0);

        // Temuan: Pembayaran Honor Melebihi Ambang 50% Pagu
        if ($variant === 'reguler' && $paguAnggaran > 0) {
            $persenHonor = round(($belanjaPegawai / $paguAnggaran) * 100, 1);
            if ($persenHonor > 50.0) {
                $findings[] = [
                    'id' => 'REK-HONOR-EXCEEDS-50',
                    'category' => 'belanja_pegawai',
                    'severity' => 'danger',
                    'title' => "Realisasi Belanja Honor Guru/Tenaga Kependidikan Melebihi Batas 50% ({$persenHonor}%)",
                    'description' => 'Berdasarkan Permendikbudristek Petunjuk Teknis Pengelolaan Dana BOSP, alokasi pembayaran honorarium maksimal adalah 50% dari total pagu dana BOSP Reguler yang diterima. Realisasi honor saat ini telah mencapai Rp '.number_format($belanjaPegawai, 0, ',', '.')." ({$persenHonor}% dari pagu Rp ".number_format($paguAnggaran, 0, ',', '.').').',
                    'recommendation' => 'Evaluasi kembali pembebanan honorarium guru honorer dan pastikan sesuai dengan SK penugasan serta terdaftar di Dapodik.',
                    'amount' => $belanjaPegawai,
                ];
            }
        }

        $compactTrx = $this->compactTransactions($transactions, 25);

        return [
            'summary' => [
                'tab' => 'rek_realisasi',
                'periode_label' => $range['label'],
                'belanja_pegawai' => $belanjaPegawai,
                'belanja_barang_jasa' => $belanjaBarangJasa,
                'belanja_modal' => $belanjaModal,
                'total_belanja' => $totalBelanja,
                'persentase_honor' => $paguAnggaran > 0 ? round(($belanjaPegawai / $paguAnggaran) * 100, 1) : 0,
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
Anda adalah Auditor Finansial Senior BPK RI / Inspektorat Daerah spesialis Pemeriksaan Rekapitulasi Realisasi per Akun Rekening Belanja Dana BOSP.
Sistem audit internal SIKAS telah selesai memverifikasi data proporsi belanja honorer (maks 50%), pemisahan belanja modal vs operasi, dan kepatuhan akun secara deterministik, menetapkan skor kepatuhan matematis dan daftar temuan resmi.

Tugas Anda sebagai Auditor Konsultan / Narrator:
1. Susun "executive_summary" yang elegan, berbobot, berwibawa, dan objektif dalam bahasa birokrasi pengawasan keuangan daerah, menelaah efisiensi belanja pegawai, proporsi belanja operasi vs modal, dan kepatuhan akun belanja.
2. Perkaya narasi "description" (fakta kasus riil & potensi sanksi pemotongan salur BOSP) dan "recommendation" (langkah konkrit evaluasi beban honorarium/revisi SK) untuk setiap temuan yang terdaftar pada "temuan_resmi_sistem".
3. ATURAN PENYAJIAN (SANGAT KETAT):
   - DILARANG KERAS MENAMPILKAN ATAU MENYEBUT ID INTERNAL DATABASE (seperti 'ID 108', 'ID 238', dsb).
   - Selalu rujuk informasi menggunakan: Jenis Belanja (Honor/Pegawai, Barang/Jasa, Modal), Rasio Persentase, dan Batas Regulasi Permendikbudristek.
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
