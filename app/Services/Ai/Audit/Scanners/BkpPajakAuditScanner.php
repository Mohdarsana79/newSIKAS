<?php

namespace App\Services\Ai\Audit\Scanners;

use App\Models\User;
use App\Services\Ai\Audit\BaseTabAuditScanner;

class BkpPajakAuditScanner extends BaseTabAuditScanner
{
    public function getTabTitle(): string
    {
        return 'Buku Kas Pembantu Pajak (BKP Pajak)';
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
            'Kelengkapan Bukti Setor Nomor Transaksi Penerimaan Negara (NTPN)',
            'Rekonsiliasi Pemotongan vs Penyetoran Pajak (Kepatuhan Saldo Nihil)',
            'Kewajiban Pungutan Pajak pada Belanja di Atas Rp 2.000.000',
            'Ketepatan Penerapan Tarif PPh 21, PPh 22, PPh 23, PPN 11%, dan Pajak Daerah',
            'Pencegahan Pengendapan Uang Pajak Negara di Rekening/Brankas Sekolah',
        ];

        $findings = [];
        $pajakTanpaNtpn = [];
        $belanjaBesarTanpaPajak = [];
        $totalPajakDipungut = 0.0;
        $totalPajakDisetor = 0.0;

        foreach ($transactions as $t) {
            if ($t->is_bunga_record) {
                continue;
            }

            $amount = (float) ($t->dibelanjakan ?? $t->nominal_transaksi ?? 0);
            $pajakPusat = (float) ($t->total_pajak ?? 0);
            $pajakDaerah = (float) ($t->total_pajak_daerah ?? 0);
            $totPajak = $pajakPusat + $pajakDaerah;

            if ($totPajak > 0) {
                $totalPajakDipungut += $totPajak;

                // Cek apakah ada NTPN
                if (empty($t->ntpn)) {
                    $pajakTanpaNtpn[] = [
                        'id' => $t->id,
                        'tanggal' => $t->tanggal_transaksi,
                        'uraian' => $t->uraian,
                        'pajak' => $totPajak,
                        'jenis_pajak' => $t->pajak ?: 'Pajak',
                    ];
                } else {
                    $totalPajakDisetor += $totPajak;
                }
            }

            // Belanja >= 2 Juta tanpa pajak
            if ($amount >= 2000000 && $totPajak == 0 && ! $t->bebas_pajak) {
                $belanjaBesarTanpaPajak[] = [
                    'id' => $t->id,
                    'tanggal' => $t->tanggal_transaksi,
                    'uraian' => $t->uraian,
                    'amount' => $amount,
                ];
            }
        }

        // Temuan 1: Pajak Dipungut Belum Memiliki Kode NTPN (DANGER)
        if (! empty($pajakTanpaNtpn)) {
            $totalBelumSetor = array_sum(array_column($pajakTanpaNtpn, 'pajak'));
            $findings[] = [
                'id' => 'PAJAK-NO-NTPN',
                'category' => 'kepatuhan_pajak',
                'severity' => 'danger',
                'title' => count($pajakTanpaNtpn).' Transaksi Potongan Pajak Belum Mencantumkan Kode NTPN',
                'description' => 'Terdapat potongan pajak senilai total Rp '.number_format($totalBelumSetor, 0, ',', '.').' yang belum memiliki Nomor Transaksi Penerimaan Negara (NTPN). Berdasarkan ketentuan BPK dan Ditjen Pajak, pajak yang telah dipungut wajib segera disetorkan ke kas negara via e-Billing bank persepsi.',
                'recommendation' => 'Segera setorkan pajak tersebut dan input kode valid NTPN pada menu Lapor Pajak di BKU/Buku Pembantu Pajak sebelum pemeriksaan.',
                'amount' => $totalBelumSetor,
            ];
        }

        // Temuan 2: Belanja >= 2 Juta Tanpa Pungutan PPN/PPh (WARNING)
        if (! empty($belanjaBesarTanpaPajak)) {
            $totalBelanjaNoTax = array_sum(array_column($belanjaBesarTanpaPajak, 'amount'));
            $findings[] = [
                'id' => 'PAJAK-BELANJA-TANPA-PAJAK',
                'category' => 'tarif_pajak',
                'severity' => 'warning',
                'title' => count($belanjaBesarTanpaPajak).' Transaksi Belanja ≥ Rp 2.000.000 Tanpa Pungutan Pajak',
                'description' => 'Ditemukan transaksi belanja di atas ambang batas perpajakan Rp 2.000.000 (total nilai belanja Rp '.number_format($totalBelanjaNoTax, 0, ',', '.').') yang tidak mencatat potongan PPN maupun PPh.',
                'recommendation' => 'Pastikan rekanan/toko memiliki Surat Keterangan Bebas Pajak (SKB) atau faktur pajak resmi. Jika bukan belanja bebas pajak, kenakan PPN 11% dan PPh sesuai regulasi perpajakan yang berlaku.',
                'amount' => $totalBelanjaNoTax,
            ];
        }

        $compactTrx = $transactions->where('total_pajak', '>', 0)->take(30)->map(function ($t) {
            return [
                'id' => $t->id,
                'tgl' => $t->tanggal_transaksi,
                'uraian' => $t->uraian,
                'belanja' => (float) $t->dibelanjakan,
                'jenis_pajak' => $t->pajak,
                'persen' => $t->persen_pajak,
                'total_pajak' => (float) $t->total_pajak,
                'ntpn' => $t->ntpn,
            ];
        })->values()->all();

        return [
            'summary' => [
                'tab' => 'bkp_pajak',
                'periode_label' => $range['label'],
                'total_pajak_dipungut' => $totalPajakDipungut,
                'total_pajak_disetor' => $totalPajakDisetor,
                'saldo_pajak_mengendap' => max(0, $totalPajakDipungut - $totalPajakDisetor),
                'transaksi_pajak_count' => count($compactTrx),
                'pajak_tanpa_ntpn_count' => count($pajakTanpaNtpn),
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
Anda adalah Auditor Pajak Pemerintah Senior BPK RI / Inspektorat Daerah spesialis Pemeriksaan Kepatuhan Perpajakan Dana BOSP Satuan Pendidikan.
Sistem audit internal SIKAS telah selesai memverifikasi data transaksi perpajakan secara deterministik, menetapkan skor kepatuhan matematis dan daftar temuan resmi.

Tugas Anda sebagai Auditor Konsultan / Narrator:
1. Susun "executive_summary" yang elegan, berbobot, berwibawa, dan objektif dalam bahasa birokrasi pengawasan keuangan daerah, mengulas status penyetoran pajak negara/daerah (NTPN), kepatuhan pemotongan PPN/PPh, serta pencegahan saldo pajak mengendap.
2. Perkaya narasi "description" (fakta kasus riil & potensi sanksi pajak) dan "recommendation" (langkah konkrit operasional e-Billing/NTPN untuk bendahara) untuk setiap temuan yang terdaftar pada "temuan_resmi_sistem".
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
