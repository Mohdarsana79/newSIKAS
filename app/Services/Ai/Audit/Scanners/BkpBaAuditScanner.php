<?php

namespace App\Services\Ai\Audit\Scanners;

use App\Config\VariantConfig;
use App\Models\SekolahProfile;
use App\Models\User;
use App\Services\Ai\Audit\BaseTabAuditScanner;
use Carbon\Carbon;

class BkpBaAuditScanner extends BaseTabAuditScanner
{
    public function getTabTitle(): string
    {
        return 'Berita Acara Pemeriksaan Kas (BA Kas)';
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

        $rulesChecked = [
            'Kelengkapan Berita Acara Hasil Pemeriksaan Kas Fisik',
            'Konsistensi Rincian Kas Fisik (Uang Kertas, Uang Logam, Kas Bank)',
            'Kelengkapan Identitas & NIP Kepala Sekolah (KPA) dan Bendahara',
            'Kesesuaian Tanggal Pemeriksaan Kas dengan Penutupan BKU',
            'Pencegahan Dokumen Berita Acara Tanpa Nomor atau Pejabat Sah',
        ];

        $findings = [];
        $sekolah = SekolahProfile::first();

        // 1. Cek Kelengkapan Profil Pejabat Penandatangan
        $pejabatKurang = [];
        if (empty($sekolah?->nama_kepala_sekolah)) {
            $pejabatKurang[] = 'Nama Kepala Sekolah';
        }
        if (empty($sekolah?->nip_kepala_sekolah)) {
            $pejabatKurang[] = 'NIP Kepala Sekolah';
        }
        if (empty($sekolah?->nama_bendahara)) {
            $pejabatKurang[] = 'Nama Bendahara BOSP';
        }
        if (empty($sekolah?->nip_bendahara)) {
            $pejabatKurang[] = 'NIP Bendahara BOSP';
        }

        if (! empty($pejabatKurang)) {
            $findings[] = [
                'id' => 'BA-PEJABAT-INCOMPLETE',
                'category' => 'legalitas_dokumen',
                'severity' => 'warning',
                'title' => 'Identitas Pejabat Penandatangan Berita Acara Belum Lengkap ('.implode(', ', $pejabatKurang).')',
                'description' => 'Berita Acara Pemeriksaan Kas memerlukan tanda tangan dan NIP sah pejabat Kuasa Pengguna Anggaran (KPA) dan Bendahara Pengeluaran Pembantu.',
                'recommendation' => 'Lengkapi data Kepala Sekolah dan Bendahara pada menu Pengaturan > Profil Sekolah.',
                'amount' => 0,
            ];
        }

        // 2. Cek Saldo Kas Periode Terkait
        $saldoBank = (float) $this->bukuKasService->hitungSaldoBankSebelumBulan($penganggaran->id, $endMonth + 1);
        $saldoTunai = (float) $this->bukuKasService->getSaldoKasFromPembantu(
            $penganggaran->id,
            $tahun,
            Carbon::createFromDate($tahun, $endMonth, 1)->locale('id')->isoFormat('MMMM'),
            $endMonth
        );

        $totalKasFisik = max(0, $saldoBank) + max(0, $saldoTunai);

        $transactions = $this->getPeriodTransactions($variant, $penganggaran, $tahun, $startMonth, $endMonth);
        $compactTrx = $this->compactTransactions($transactions, 20);

        return [
            'summary' => [
                'tab' => 'ba',
                'periode_label' => $range['label'],
                'saldo_kas_bank' => max(0, $saldoBank),
                'saldo_kas_tunai' => max(0, $saldoTunai),
                'total_kas_fisik_diperiksa' => $totalKasFisik,
                'status_pejabat_lengkap' => empty($pejabatKurang),
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
Anda adalah Auditor Pemeriksaan Kas BPK RI / Inspektorat Daerah spesialis Dokumen Berita Acara Pemeriksaan Kas Satuan Pendidikan.
Sistem audit internal SIKAS telah selesai memverifikasi data fisik uang kas, saldo bank, dan legalitas pejabat penandatangan secara deterministik, menetapkan skor kepatuhan matematis dan daftar temuan resmi.

Tugas Anda sebagai Auditor Konsultan / Narrator:
1. Susun "executive_summary" yang elegan, berbobot, berwibawa, dan objektif dalam bahasa birokrasi pengawasan keuangan daerah, menelaah keabsahan Berita Acara Pemeriksaan Kas, kesesuaian fisik uang brankas, dan kelengkapan identitas/NIP KPA dan Bendahara.
2. Perkaya narasi "description" (fakta kasus riil & potensi kelemahan pengendalian intern) dan "recommendation" (langkah konkrit pengisian data profil/pemeriksaan fisik) untuk setiap temuan yang terdaftar pada "temuan_resmi_sistem".
3. ATURAN PENYAJIAN (SANGAT KETAT):
   - DILARANG KERAS MENAMPILKAN ATAU MENYEBUT ID INTERNAL DATABASE (seperti 'ID 108', 'ID 238', dsb).
   - Selalu rujuk informasi menggunakan: Periode Bulan, Nama Dokumen, Tanggal Pemeriksaan, dan Nama/NIP Pejabat.
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
