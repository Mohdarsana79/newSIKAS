<?php

namespace App\Services\Ai\Audit\Scanners;

use App\Config\VariantConfig;
use App\Models\User;
use App\Services\Ai\Audit\BaseTabAuditScanner;
use Illuminate\Support\Facades\DB;

class BkpRobAuditScanner extends BaseTabAuditScanner
{
    public function getTabTitle(): string
    {
        return 'Rincian Objek Belanja (ROB)';
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

        $rkasClass = VariantConfig::getModelClass('rkas', $variant);
        $bkuClass = VariantConfig::getModelClass('bku', $variant);

        $rulesChecked = [
            'Pengendalian Plafon Anggaran RKAS per Kode Rekening (Anti Over-Budget)',
            'Pencegahan Pembelanjaan pada Kode Rekening yang Tidak Memiliki Pagu RKAS',
            'Ketepatan Pemisahan Belanja Operasi (5.1) vs Belanja Modal (5.2)',
            'Konsistensi Rincian Objek Belanja dengan Kategori Rekening Akuntansi',
            'Evaluasi Tingkat Penyerapan Pagu Belanja per Objek',
        ];

        $findings = [];

        // 1. Ambil Pagu RKAS per Rekening
        $rkasBudgets = $rkasClass::where($fk, $penganggaran->id)
            ->select('rekening_belanja_id', DB::raw('SUM(total) as pagu_rekening'))
            ->groupBy('rekening_belanja_id')
            ->pluck('pagu_rekening', 'rekening_belanja_id')
            ->all();

        // 2. Ambil Realisasi Belanja BKU dalam Periode per Rekening
        $bkuItems = $bkuClass::with(['rekeningBelanja'])
            ->where($fk, $penganggaran->id)
            ->whereYear('tanggal_transaksi', $tahun)
            ->whereBetween(DB::raw('EXTRACT(MONTH FROM tanggal_transaksi)'), [$startMonth, $endMonth])
            ->where('is_bunga_record', false)
            ->get();

        $realisasiPerRekening = [];
        $rekeningInfo = [];

        foreach ($bkuItems as $item) {
            $rekId = $item->rekening_belanja_id;
            $nom = (float) ($item->dibelanjakan ?? $item->nominal_transaksi ?? 0);
            if (! $rekId) {
                continue;
            }

            if (! isset($realisasiPerRekening[$rekId])) {
                $realisasiPerRekening[$rekId] = 0.0;
                $rekeningInfo[$rekId] = [
                    'kode' => $item->rekeningBelanja?->kode_rekening ?? 'Rekening '.$rekId,
                    'nama' => $item->rekeningBelanja?->rincian_objek ?? 'Rincian Objek '.$rekId,
                ];
            }
            $realisasiPerRekening[$rekId] += $nom;
        }

        // 3. Evaluasi Over-Budget dan Belanja Tanpa Pagu
        $overBudgetItems = [];
        $tanpaPaguItems = [];

        foreach ($realisasiPerRekening as $rekId => $realisasi) {
            $pagu = $rkasBudgets[$rekId] ?? 0.0;
            $info = $rekeningInfo[$rekId] ?? ['kode' => 'Rekening '.$rekId, 'nama' => '-'];

            if ($pagu <= 0.0 && $realisasi > 0) {
                $tanpaPaguItems[] = [
                    'kode' => $info['kode'],
                    'nama' => $info['nama'],
                    'realisasi' => $realisasi,
                ];
            } elseif ($realisasi > $pagu && $pagu > 0) {
                $selisihLebih = $realisasi - $pagu;
                $overBudgetItems[] = [
                    'kode' => $info['kode'],
                    'nama' => $info['nama'],
                    'pagu' => $pagu,
                    'realisasi' => $realisasi,
                    'selisih' => $selisihLebih,
                    'persen' => round(($realisasi / $pagu) * 100, 1),
                ];
            }
        }

        // Temuan 1: Realisasi Melebihi Pagu RKAS (DANGER)
        if (! empty($overBudgetItems)) {
            $totalOver = array_sum(array_column($overBudgetItems, 'selisih'));
            $first = $overBudgetItems[0];
            $findings[] = [
                'id' => 'ROB-OVER-BUDGET',
                'category' => 'pagu_anggaran',
                'severity' => 'danger',
                'title' => count($overBudgetItems).' Rekening Belanja Realisasinya Melebihi Pagu Anggaran RKAS (Over-Budget)',
                'description' => 'Ditemukan belanja yang melampaui alokasi pagu RKAS dengan total kelebihan Rp '.number_format($totalOver, 0, ',', '.').". Contoh: Rekening {$first['kode']} ({$first['nama']}) memiliki pagu Rp ".number_format($first['pagu'], 0, ',', '.').' namun realisasinya mencapai Rp '.number_format($first['realisasi'], 0, ',', '.')." ({$first['persen']}%).",
                'recommendation' => 'Segera lakukan penyesuaian melalui pengesahan dokumen RKAS Perubahan sebelum audit akhir BPK / Inspektorat untuk melegalkan pergeseran anggaran.',
                'amount' => $totalOver,
            ];
        }

        // Temuan 2: Belanja pada Rekening Tanpa Pagu Anggaran (WARNING)
        if (! empty($tanpaPaguItems)) {
            $totalTanpaPagu = array_sum(array_column($tanpaPaguItems, 'realisasi'));
            $first = $tanpaPaguItems[0];
            $findings[] = [
                'id' => 'ROB-NO-PAGU',
                'category' => 'pagu_anggaran',
                'severity' => 'warning',
                'title' => count($tanpaPaguItems).' Rekening Belanja Terealisasi Tanpa Adanya Alokasi Anggaran di RKAS',
                'description' => 'Terdapat realisasi belanja pada rekening yang tidak dianggarkan sama sekali dalam RKAS (total Rp '.number_format($totalTanpaPagu, 0, ',', '.')."). Contoh: Rekening {$first['kode']} ({$first['nama']}) senilai Rp ".number_format($first['realisasi'], 0, ',', '.').'.',
                'recommendation' => 'Pindahkan pos belanja ke rekening yang telah dianggarkan di RKAS atau masukkan rekening ini dalam usulan RKAS Perubahan.',
                'amount' => $totalTanpaPagu,
            ];
        }

        $compactTrx = $this->compactTransactions($bkuItems, 30);

        return [
            'summary' => [
                'tab' => 'rob',
                'periode_label' => $range['label'],
                'total_rekening_terealisasi' => count($realisasiPerRekening),
                'total_belanja_rob' => array_sum($realisasiPerRekening),
                'jumlah_rekening_over_budget' => count($overBudgetItems),
                'jumlah_rekening_tanpa_pagu' => count($tanpaPaguItems),
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
Anda adalah Auditor Anggaran Senior BPK RI / Inspektorat Daerah spesialis Pengujian Rincian Objek Belanja (ROB) dan Kepatuhan Pagu RKAS Satuan Pendidikan.
Tugas Anda adalah menelaah kesesuaian belanja dengan pagu anggaran RKAS, mendeteksi over-budget, serta mengidentifikasi pembelanjaan tanpa pos anggaran sah.

Aturan Evaluasi:
1. Hitung compliance_score (0-100). Berikan penalti berat (-20 poin) untuk rekening over-budget dan belanja tanpa pagu.
2. Buat executive_summary profesional dalam bahasa Indonesia formal birokrasi pengawasan keuangan daerah.
3. ATURAN PENYAJIAN TRANSAKSI (SANGAT KETAT):
   - DILARANG KERAS MENAMPILKAN ATAU MENYEBUT ID INTERNAL DATABASE (seperti 'ID 108', 'ID 238', dsb).
   - Selalu rujuk rekening atau transaksi menggunakan: Kode Rekening, Nama Rekening Belanja, Tanggal Transaksi, dan Uraian.
   - Sertakan properti "transaction_ref" pada setiap objek temuan (contoh: "Rek: 5.1.02.01.01.0024 - Belanja ATK").
4. Respon WAJIB dalam format JSON murni:
{
  "compliance_score": 85,
  "executive_summary": "Teks analisis eksekutif profesional tanpa menyebut ID internal...",
  "findings": [
    {
      "id": "ROB-FINDING-KODE",
      "category": "pagu_anggaran|klasifikasi_belanja",
      "severity": "danger|warning|info",
      "title": "Judul Temuan Spesifik",
      "description": "Deskripsi fakta menyebut kode rekening, nama rekening belanja, pagu vs realisasi...",
      "recommendation": "Rekomendasi konkrit operasional untuk bendahara...",
      "transaction_ref": "Rek: Kode - Nama Rekening | Pagu: Rp ...",
      "amount": 0
    }
  ],
  "rules_checked": ["Daftar aturan yang dievaluasi..."]
}
PROMPT;
    }
}
