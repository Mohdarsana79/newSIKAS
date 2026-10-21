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
            'Kepatuhan Ambang Minimal Serapan Belanja sebagai Syarat Salur Tahap Berikutnya',
            'Pencegahan Defisit / Realisasi Belanja Melampaui Plafon Anggaran Total',
            'Identifikasi Pos Program Kegiatan Prioritas yang Belum Terealisasi',
            'Kewajaran Sisa Pagu Anggaran Kas Sekolah di Akhir Periode',
        ];

        $findings = [];

        // 1. Pagu Anggaran
        $paguAnggaran = (float) ($penganggaran->total_anggaran ?? ($penganggaran->pendapatan ?? 0.0));
        if ($paguAnggaran <= 0.0) {
            $rkasPerubahanClass = VariantConfig::getModelClass('rkas_perubahan', $variant);
            $hasPerubahan = $rkasPerubahanClass && class_exists($rkasPerubahanClass) && $rkasPerubahanClass::where($fk, $penganggaran->id)->exists();
            $targetRkasClass = ($hasPerubahan && ($periodeKey === 'tahap_2' || $periodeKey === 'tahunan' || $endMonth > 6))
                ? $rkasPerubahanClass
                : $rkasClass;

            $paguAnggaran = (float) $targetRkasClass::where($fk, $penganggaran->id)->sum(DB::raw('harga_satuan * jumlah'));
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
                    'title' => 'Tingkat Serapan Belanja Belum Memenuhi Ambang Batas Rekomendasi Tahap 1 (50%)',
                    'description' => 'Realisasi belanja baru mencapai Rp '.number_format($totalBelanja, 0, ',', '.').' dari dana masuk Rp '.number_format($totalPenerimaan, 0, ',', '.').' (Kurang Rp '.number_format($kurang, 0, ',', '.').' untuk mencapai 50%). Regulasi penyaluran BOSP mensyaratkan pelaporan serapan minimal 50% dari Tahap 1 agar dana Tahap 2 dapat disalurkan.',
                    'recommendation' => 'Segera percepat realisasi kegiatan pembelajaran dan input SPJ sebelum batas cut-off pelaporan ARKAS/Kemenkeu.',
                    'amount' => $kurang,
                ];
            }
        }

        // Temuan 3: Sisa Anggaran Menjelang Akhir Tahun (Tahunan)
        if (($periodeType === 'tahunan' || $periodeKey === 'tahap_2') && $sisaAnggaran > 0) {
            $findings[] = [
                'id' => 'REALISASI-SISA-ANGGARAN',
                'category' => 'efektivitas_belanja',
                'severity' => 'info',
                'title' => 'Terdapat Sisa Pagu Anggaran Sebesar Rp '.number_format($sisaAnggaran, 0, ',', '.').' ('.(100 - $persentaseSerapan).'%)',
                'description' => "Tingkat serapan anggaran periode pelaporan adalah {$persentaseSerapan}%. Sisa anggaran yang tidak terserap akan diperhitungkan sebagai SiLPA (Sisa Lebih Perhitungan Anggaran) untuk tahun berikutnya.",
                'recommendation' => 'Laporkan sisa dana kas dan buku ini secara akurat pada laporan pertanggungjawaban akhir tahun.',
                'amount' => $sisaAnggaran,
            ];
        }

        $compactTrx = $this->compactTransactions($transactions, 25);

        return [
            'summary' => [
                'tab' => 'realisasi',
                'periode_label' => $range['label'],
                'pagu_anggaran' => $paguAnggaran,
                'total_penerimaan' => $totalPenerimaan,
                'total_belanja' => $totalBelanja,
                'sisa_anggaran' => $sisaAnggaran,
                'persentase_serapan' => $persentaseSerapan,
                'transaksi_count' => $transactions->count(),
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
Anda adalah Auditor Evaluasi Kinerja Anggaran BPK RI / Inspektorat Daerah spesialis Laporan Realisasi Anggaran (LRA) Dana BOSP Satuan Pendidikan.
Tugas Anda adalah menilai efektivitas penyerapan anggaran, kepatuhan batas minimal serapan syarat penyaluran tahap berikutnya, serta pengendalian defisit pagu.

Aturan Evaluasi:
1. Hitung compliance_score (0-100). Berikan penalti berat (-20 poin) untuk realisasi melebihi pagu total, penalti sedang (-10 poin) untuk serapan rendah menjelang batas waktu.
2. Buat executive_summary profesional dalam bahasa Indonesia formal birokrasi pengawasan keuangan daerah.
3. ATURAN PENYAJIAN TRANSAKSI (SANGAT KETAT):
   - DILARANG KERAS MENAMPILKAN ATAU MENYEBUT ID INTERNAL DATABASE (seperti 'ID 108', 'ID 238', dsb).
   - Selalu rujuk informasi menggunakan: Program/Kegiatan, Uraian Belanja, Kode/Nama Rekening Belanja, dan Pagu vs Realisasi.
   - Sertakan properti "transaction_ref" pada setiap objek temuan (contoh: "Rek: 5.1.02.01 | Serapan: 45%").
4. Respon WAJIB dalam format JSON murni:
{
  "compliance_score": 90,
  "executive_summary": "Teks analisis eksekutif profesional tanpa menyebut ID internal...",
  "findings": [
    {
      "id": "REAL-FINDING-KODE",
      "category": "serapan_anggaran|efektivitas_belanja",
      "severity": "danger|warning|info",
      "title": "Judul Temuan Spesifik",
      "description": "Deskripsi fakta menyebut persentase serapan, pagu anggaran, rincian rekening belanja...",
      "recommendation": "Rekomendasi konkrit operasional untuk bendahara...",
      "transaction_ref": "Program / Rekening: ...",
      "amount": 0
    }
  ],
  "rules_checked": ["Daftar aturan yang dievaluasi..."]
}
PROMPT;
    }
}
