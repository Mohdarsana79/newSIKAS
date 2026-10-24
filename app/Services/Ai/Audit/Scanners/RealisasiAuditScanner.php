<?php

namespace App\Services\Ai\Audit\Scanners;

use App\Config\VariantConfig;
use App\Models\User;
use App\Services\Ai\Audit\BaseTabAuditScanner;
use Illuminate\Support\Facades\DB;

class RealisasiAuditScanner extends BaseTabAuditScanner
{
    public function getTabTitle(): string
    {
        return 'Laporan Realisasi Anggaran (Realisasi BOSP)';
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
        $penerimaanClass = VariantConfig::getModelClass('penerimaan_dana', $variant);

        $rulesChecked = [
            'Evaluasi Tingkat Penyerapan Anggaran (Kesesuaian Target Pagu RKAS)',
            'Kepatuhan Ambang Minimal Serapan Belanja 50% Syarat Salur Tahap II (Pasal 58 Permendikdasmen 8/2026)',
            'Ketepatan Waktu Pelaporan Realisasi Tahap 1 Paling Lambat 31 Juli (Pasal 56 Permendikdasmen 8/2026)',
            'Pencegahan Defisit / Realisasi Belanja Melampaui Plafon Anggaran Total (Over-Budget)',
            'Kewajaran Sisa Pagu Anggaran Kas Sekolah di Akhir Periode (SiLPA Berjalan)',
        ];

        $findings = [];

        // 1. Pagu Anggaran
        $paguAnggaran = $this->resolvePaguAnggaran($variant, $penganggaran, $startMonth, $endMonth, $periodeType, $periodeKey);
        $paguTahunan = (float) ($penganggaran->pagu_anggaran ?? ($penganggaran->total_anggaran ?? ($penganggaran->pendapatan ?? 0.0)));
        if ($paguTahunan <= 0.0) {
            $paguTahunan = $paguAnggaran;
        }

        // 2. Realisasi Belanja
        $transactions = $this->getPeriodTransactions($variant, $penganggaran, $tahun, $startMonth, $endMonth);
        $totalBelanja = (float) $transactions->where('is_bunga_record', false)->sum('dibelanjakan');

        // Total Penerimaan
        $totalPenerimaan = (float) $penerimaanClass::where($fk, $penganggaran->id)
            ->whereYear('tanggal_terima', $tahun)
            ->whereBetween(DB::raw('EXTRACT(MONTH FROM tanggal_terima)'), [$startMonth, $endMonth])
            ->sum('jumlah_dana');

        $persentaseSerapan = $paguAnggaran > 0 ? round(($totalBelanja / $paguAnggaran) * 100, 2) : 0.0;
        $sisaAnggaran = max(0, $paguAnggaran - $totalBelanja);

        // Temuan 1: Realisasi Melampaui Pagu Total (DANGER)
        if ($totalBelanja > $paguAnggaran && $paguAnggaran > 0) {
            $selisih = $totalBelanja - $paguAnggaran;
            $findings[] = [
                'id' => 'REALISASI-OVER-PAGU',
                'category' => 'serapan_anggaran',
                'severity' => 'danger',
                'title' => 'Realisasi Belanja Total Melebihi Plafon Pagu Anggaran RKAS (Over-Budget)',
                'description' => 'Total realisasi belanja mencapai Rp '.number_format($totalBelanja, 0, ',', '.').' melampaui pagu anggaran yang disahkan sebesar Rp '.number_format($paguAnggaran, 0, ',', '.').' (Defisit: Rp '.number_format($selisih, 0, ',', '.').').',
                'recommendation' => 'Evaluasi kembali input BKU dan pastikan sudah ada pengesahan RKAS Perubahan dari dinas pendidikan.',
                'amount' => $selisih,
            ];
        }

        // Temuan 2: Evaluasi Syarat Serapan Tahap 1
        if ($periodeKey === 'tahap_1' || ($periodeType === 'bulanan' && $startMonth <= 6)) {
            if ($totalPenerimaan > 0 && $totalBelanja < ($totalPenerimaan * 0.5)) {
                $kurang = ($totalPenerimaan * 0.5) - $totalBelanja;
                $findings[] = [
                    'id' => 'REALISASI-SYARAT-SALUR',
                    'category' => 'serapan_anggaran',
                    'severity' => 'warning',
                    'title' => 'Tingkat Serapan Belanja Belum Memenuhi Ambang Batas Syarat Salur Tahap II (Minimal 50%)',
                    'description' => 'Realisasi belanja baru mencapai Rp '.number_format($totalBelanja, 0, ',', '.').' dari dana masuk Rp '.number_format($totalPenerimaan, 0, ',', '.').' (Kurang Rp '.number_format($kurang, 0, ',', '.').' untuk mencapai 50%). Berdasarkan Permendikdasmen No. 8 Tahun 2026 Pasal 56 ayat (2) dan Pasal 58 ayat (2), pelaporan realisasi minimal 50% dari alokasi Tahap I paling lambat 31 Juli menjadi syarat mutlak penyaluran Dana BOSP Tahap II.',
                    'recommendation' => 'Segera percepat realisasi kegiatan pembelajaran dan input SPJ pada sistem aplikasi kementerian sebelum batas 31 Juli untuk menghindari pemotongan alokasi (Pasal 59) atau penghentian salur Tahap II (Pasal 60 Permendikdasmen No. 8/2026).',
                    'amount' => $kurang,
                ];
            }
        }

        // Temuan 3: Sisa Anggaran Menjelang Akhir Tahun (Tahunan / Tahap 2)
        if (($periodeType === 'tahunan' || $periodeKey === 'tahap_2') && $sisaAnggaran > 0) {
            $persenSisa = round(100 - $persentaseSerapan, 2);
            $findings[] = [
                'id' => 'REALISASI-SISA-ANGGARAN',
                'category' => 'efektivitas_belanja',
                'severity' => 'info',
                'title' => 'Terdapat Sisa Pagu Anggaran Sebesar Rp '.number_format($sisaAnggaran, 0, ',', '.').' ('.$persenSisa.'%)',
                'description' => "Tingkat serapan anggaran periode pelaporan adalah {$persentaseSerapan}% dari alokasi pagu Rp ".number_format($paguAnggaran, 0, ',', '.').'. Berdasarkan Pasal 54 Permendikdasmen No. 8 Tahun 2026, sisa dana BOSP tahun berkenaan dapat digunakan pada tahun anggaran berikutnya setelah dicatatkan dalam RKAS (SiLPA).',
                'recommendation' => 'Pastikan pencatatan sisa kas dan sisa dana diinput secara akurat untuk diverifikasi dinas pendidikan dan diperhitungkan pada penyaluran tahun berikutnya.',
                'amount' => $sisaAnggaran,
            ];
        }

        $compactTrx = $this->compactTransactions($transactions, 25);

        return [
            'summary' => [
                'tab' => 'realisasi',
                'periode_label' => $range['label'],
                'pagu_anggaran' => $paguAnggaran,
                'pagu_anggaran_tahunan' => $paguTahunan,
                'total_penerimaan' => $totalPenerimaan,
                'total_belanja' => $totalBelanja,
                'sisa_anggaran' => $sisaAnggaran,
                'persentase_serapan' => $persentaseSerapan,
                'transaksi_count' => $transactions->count(),
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
Anda adalah Auditor Evaluasi Kinerja Anggaran BPK RI / Inspektorat Daerah spesialis Laporan Realisasi Anggaran (LRA) Dana BOSP Satuan Pendidikan berdasarkan Permendikdasmen Nomor 8 Tahun 2026.
Sistem audit internal SIKAS telah selesai memverifikasi data penyerapan anggaran, kepatuhan syarat salur minimal 50% Tahap 1 (Pasal 58 Permendikdasmen 8/2026), batas waktu pelaporan 31 Juli (Pasal 56), dan plafon belanja secara deterministik, menetapkan skor kepatuhan matematis dan daftar temuan resmi.

Tugas Anda sebagai Auditor Konsultan / Narrator:
1. Susun "executive_summary" yang elegan, berbobot, berwibawa, dan objektif dalam bahasa birokrasi pengawasan keuangan daerah, menelaah efektivitas serapan belanja, kepatuhan batas 50% syarat salur tahap berikutnya berlandaskan Permendikdasmen Nomor 8 Tahun 2026, dan kewajaran sisa kas.
2. Perkaya narasi "description" (fakta kasus riil & analisis performa serapan) dan "recommendation" (langkah konkrit operasional percepatan SPJ / pelaporan ARKAS) untuk setiap temuan yang terdaftar pada "temuan_resmi_sistem".
3. ATURAN PENYAJIAN (SANGAT KETAT):
   - DILARANG KERAS MENAMPILKAN ATAU MENYEBUT ID INTERNAL DATABASE (seperti 'ID 108', 'ID 238', dsb).
   - Selalu rujuk informasi menggunakan: Program/Kegiatan, Uraian Belanja, Kode/Nama Rekening Belanja, Regulasi Permendikdasmen No. 8 Tahun 2026, dan Pagu vs Realisasi.
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
