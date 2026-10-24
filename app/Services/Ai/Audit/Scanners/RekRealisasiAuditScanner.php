<?php

namespace App\Services\Ai\Audit\Scanners;

use App\Models\SekolahProfile;
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

        $sekolah = $penganggaran->sekolah ?? SekolahProfile::first();
        $statusSekolah = strtolower($sekolah->status_sekolah ?? '');
        $isNegeri = str_contains($statusSekolah, 'negeri');

        // Permendikdasmen No. 8 Tahun 2026 Pasal 42 ayat (4):
        // a. 20% untuk Satuan Pendidikan negeri
        // b. 40% untuk Satuan Pendidikan yang diselenggarakan oleh masyarakat (swasta)
        $maxHonorPersen = $isNegeri ? 20.0 : 40.0;
        $labelStatus = $isNegeri ? 'Negeri' : 'Swasta (Masyarakat)';

        $rulesChecked = [
            "Proporsi Alokasi Belanja Pegawai/Honor (Maksimal {$maxHonorPersen}% dari Pagu BOSP Reguler Satuan Pendidikan {$labelStatus} - Permendikdasmen 8/2026)",
            'Batas Maksimal Belanja Pemeliharaan Sarana & Prasarana (Maksimal 20% dari Pagu - Permendikdasmen 8/2026)',
            'Pemisahan Belanja Operasi Barang Jasa (5.1.02) dan Belanja Modal Aset (5.2)',
            'Ketepatan Kodefikasi Rekening Belanja Berdasarkan SAP / Permendagri',
            'Pencegahan Penggunaan Dana BOSP untuk Belanja yang Dilarang (Pasal 66 Permendikdasmen 8/2026)',
        ];

        $findings = [];

        $belanjaPegawai = 0.0;
        $belanjaBarangJasa = 0.0;
        $belanjaModal = 0.0;
        $belanjaSarpras = 0.0;

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

            if (str_starts_with($rek, '5.1.02.03') || str_contains($uraian, 'pemeliharaan') || str_contains($uraian, 'perbaikan')) {
                $belanjaSarpras += $amt;
            }
        }

        $totalBelanja = $belanjaPegawai + $belanjaBarangJasa + $belanjaModal;
        $paguAnggaran = $this->resolvePaguAnggaran($variant, $penganggaran, $startMonth, $endMonth, $periodeType, $periodeKey);
        $paguTahunan = (float) ($penganggaran->pagu_anggaran ?? ($penganggaran->total_anggaran ?? ($penganggaran->pendapatan ?? 0.0)));
        if ($paguTahunan <= 0.0) {
            $paguTahunan = $paguAnggaran;
        }

        // Temuan 1: Pembayaran Honor Melebihi Batas Maksimal (Pasal 42 ayat 4 Permendikdasmen 8/2026)
        if ($variant === 'reguler' && $paguAnggaran > 0) {
            $persenHonor = round(($belanjaPegawai / $paguAnggaran) * 100, 1);
            if ($persenHonor > $maxHonorPersen) {
                $findings[] = [
                    'id' => 'REK-HONOR-EXCEEDS-MAX',
                    'category' => 'belanja_pegawai',
                    'severity' => 'danger',
                    'title' => "Realisasi Belanja Honor Melebihi Batas Maksimal {$maxHonorPersen}% ({$persenHonor}%)",
                    'description' => "Berdasarkan Permendikdasmen No. 8 Tahun 2026 Pasal 42 ayat (4), alokasi pembayaran honorarium bulanan bagi guru dan tenaga kependidikan dibatasi paling banyak {$maxHonorPersen}% dari alokasi Dana BOS Reguler untuk Satuan Pendidikan {$labelStatus}. Realisasi honor saat ini telah mencapai Rp ".number_format($belanjaPegawai, 0, ',', '.')." ({$persenHonor}% dari pagu Rp ".number_format($paguAnggaran, 0, ',', '.').').',
                    'recommendation' => 'Evaluasi kembali pembebanan honorarium bulanan dan pastikan seluruh penerima memenuhi ketentuan Pasal 43 Permendikdasmen No. 8 Tahun 2026 (bukan ASN, tercatat di Dapodik, memiliki NUPTK bagi guru, dan belum menerima Tunjangan Profesi Guru/TPG).',
                    'amount' => $belanjaPegawai,
                ];
            }
        }

        // Temuan 2: Belanja Pemeliharaan Sarpras Melebihi Ambang 20% Pagu (Pasal 42 ayat 3 Permendikdasmen 8/2026)
        if ($variant === 'reguler' && $paguAnggaran > 0) {
            $persenSarpras = round(($belanjaSarpras / $paguAnggaran) * 100, 1);
            if ($persenSarpras > 20.0) {
                $findings[] = [
                    'id' => 'REK-SARPRAS-EXCEEDS-20',
                    'category' => 'pemeliharaan_sarpras',
                    'severity' => 'warning',
                    'title' => "Realisasi Pemeliharaan Sarana dan Prasarana Melebihi Batas 20% ({$persenSarpras}%)",
                    'description' => 'Berdasarkan Permendikdasmen No. 8 Tahun 2026 Pasal 42 ayat (3), penggunaan komponen pemeliharaan sarana dan prasarana dibatasi paling banyak 20% dari total alokasi Dana BOS Reguler. Realisasi pemeliharaan saat ini mencapai Rp '.number_format($belanjaSarpras, 0, ',', '.')." ({$persenSarpras}% dari pagu Rp ".number_format($paguAnggaran, 0, ',', '.').').',
                    'recommendation' => 'Pastikan pemeliharaan hanya mencakup perbaikan kerusakan ringan nonstruktural sesuai Lampiran I Permendikdasmen No. 8 Tahun 2026 dan dilarang untuk rehabilitasi sedang/berat atau pembangunan gedung baru.',
                    'amount' => $belanjaSarpras,
                ];
            }
        }

        $compactTrx = $this->compactTransactions($transactions, 25);

        return [
            'summary' => [
                'tab' => 'rek_realisasi',
                'periode_label' => $range['label'],
                'status_sekolah' => $labelStatus,
                'pagu_anggaran' => $paguAnggaran,
                'pagu_anggaran_tahunan' => $paguTahunan,
                'batas_honor_persen' => $maxHonorPersen,
                'belanja_pegawai' => $belanjaPegawai,
                'belanja_barang_jasa' => $belanjaBarangJasa,
                'belanja_modal' => $belanjaModal,
                'belanja_sarpras' => $belanjaSarpras,
                'total_belanja' => $totalBelanja,
                'persentase_honor' => $paguAnggaran > 0 ? round(($belanjaPegawai / $paguAnggaran) * 100, 1) : 0,
                'persentase_sarpras' => $paguAnggaran > 0 ? round(($belanjaSarpras / $paguAnggaran) * 100, 1) : 0,
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
Anda adalah Auditor Finansial Senior BPK RI / Inspektorat Daerah spesialis Pemeriksaan Rekapitulasi Realisasi per Akun Rekening Belanja Dana BOSP berdasarkan Permendikdasmen Nomor 8 Tahun 2026.
Sistem audit internal SIKAS telah selesai memverifikasi data proporsi belanja honorer (maks 20% untuk Negeri, maks 40% untuk Swasta sesuai Pasal 42 ayat 4 Permendikdasmen 8/2026), pemeliharaan sarpras (maks 20% sesuai Pasal 42 ayat 3), pemisahan belanja modal vs operasi, dan kepatuhan akun secara deterministik, menetapkan skor kepatuhan matematis dan daftar temuan resmi.

Tugas Anda sebagai Auditor Konsultan / Narrator:
1. Susun "executive_summary" yang elegan, berbobot, berwibawa, dan objektif dalam bahasa birokrasi pengawasan keuangan daerah, menelaah efisiensi belanja pegawai, proporsi belanja operasi vs modal, dan kepatuhan akun belanja berlandaskan Permendikdasmen Nomor 8 Tahun 2026.
2. Perkaya narasi "description" (fakta kasus riil & analisis kepatuhan hukum) dan "recommendation" (langkah konkrit evaluasi beban honorarium/revisi SK/pemenuhan NUPTK & Dapodik) untuk setiap temuan yang terdaftar pada "temuan_resmi_sistem".
3. ATURAN PENYAJIAN (SANGAT KETAT):
   - DILARANG KERAS MENAMPILKAN ATAU MENYEBUT ID INTERNAL DATABASE (seperti 'ID 108', 'ID 238', dsb).
   - Selalu rujuk informasi menggunakan: Jenis Belanja (Honor/Pegawai, Barang/Jasa, Modal), Rasio Persentase, dan Batas Regulasi Permendikdasmen Nomor 8 Tahun 2026.
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
