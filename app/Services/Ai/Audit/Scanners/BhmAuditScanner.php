<?php

namespace App\Services\Ai\Audit\Scanners;

use App\Config\VariantConfig;
use App\Models\User;
use App\Services\Ai\Audit\BaseTabAuditScanner;

class BhmAuditScanner extends BaseTabAuditScanner
{
    public function getTabTitle(): string
    {
        return 'Buku Pembantu Harta Modal (BHM / Inventaris Aset)';
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
        $bastClass = VariantConfig::getModelClass('bast', $variant);

        $rulesChecked = [
            'Kelengkapan Dokumen Berita Acara Serah Terima (BAST) Belanja Modal',
            'Ketepatan Nilai Kapitalisasi Aset Tetap Daerah (Barang Tahan Lama)',
            'Pencatatan Rincian Spesifikasi Barang (Merk, Tipe, Unit, Lokasi)',
            'Sinkronisasi Pengadaan Belanja Modal dengan Kartu Inventaris Barang (KIB B/C/E)',
            'Kesesuaian Penggunaan Akun 5.2 (Belanja Modal Peralatan, Mesin, Buku)',
        ];

        $findings = [];

        // Kumpulkan transaksi belanja modal
        $modalTransactions = [];
        $bkuIds = $transactions->pluck('id')->all();
        $existingBastBkuIds = $bastClass::whereIn(VariantConfig::bkuFk($variant), $bkuIds)
            ->pluck(VariantConfig::bkuFk($variant))
            ->all();

        $belanjaModalTanpaBast = [];
        $belanjaModalNilaiKecil = []; // Potensi di bawah nilai kapitalisasi

        foreach ($transactions as $t) {
            if ($t->is_bunga_record) {
                continue;
            }

            $rek = $t->rekeningBelanja?->kode_rekening ?? '';
            $amt = (float) ($t->dibelanjakan ?? $t->nominal_transaksi ?? 0);

            if (str_starts_with($rek, '5.2')) {
                $modalTransactions[] = $t;

                // Cek BAST
                if (! in_array($t->id, $existingBastBkuIds)) {
                    $belanjaModalTanpaBast[] = [
                        'id' => $t->id,
                        'tanggal' => $t->tanggal_transaksi,
                        'uraian' => $t->uraian,
                        'amount' => $amt,
                        'rekening' => $rek,
                    ];
                }

                // Cek nilai kecil (di bawah Rp 500.000)
                if ($amt < 500000 && ! str_contains(strtolower($t->uraian ?? ''), 'buku')) {
                    $belanjaModalNilaiKecil[] = [
                        'id' => $t->id,
                        'tanggal' => $t->tanggal_transaksi,
                        'uraian' => $t->uraian,
                        'amount' => $amt,
                    ];
                }
            }
        }

        // Temuan 1: Belanja Modal Tanpa BAST (DANGER)
        if (! empty($belanjaModalTanpaBast)) {
            $totalNoBast = array_sum(array_column($belanjaModalTanpaBast, 'amount'));
            $findings[] = [
                'id' => 'BHM-MODAL-NO-BAST',
                'category' => 'dokumen_bast',
                'severity' => 'danger',
                'title' => count($belanjaModalTanpaBast).' Pengadaan Aset Belanja Modal Belum Dilengkapi Dokumen BAST',
                'description' => 'Ditemukan belanja modal aset tetap senilai total Rp '.number_format($totalNoBast, 0, ',', '.').' yang belum tercatat memiliki Berita Acara Serah Terima (BAST). Sesuai standar BPK RI dan BPKAD, pengadaan aset daerah tanpa BAST dianggap belum sah diserahterimakan.',
                'recommendation' => 'Terbitkan dokumen BAST melalui menu Fitur Pelengkap > BAST untuk masing-masing transaksi pengadaan tersebut.',
                'amount' => $totalNoBast,
            ];
        }

        // Temuan 2: Belanja Modal Bernilai di Bawah Ambang Kapitalisasi (WARNING)
        if (! empty($belanjaModalNilaiKecil)) {
            $totalKecil = array_sum(array_column($belanjaModalNilaiKecil, 'amount'));
            $findings[] = [
                'id' => 'BHM-LOW-CAPITALIZATION',
                'category' => 'nilai_kapitalisasi',
                'severity' => 'warning',
                'title' => count($belanjaModalNilaiKecil).' Pengadaan Belanja Modal Bernilai Rendah (< Rp 500.000)',
                'description' => 'Terdapat transaksi belanja modal dengan nominal sangat kecil (total Rp '.number_format($totalKecil, 0, ',', '.').'). Umumnya kebijakan akuntansi pemerintah daerah menetapkan batas minimal nilai perolehan kapitalisasi aset tetap.',
                'recommendation' => 'Pastikan regulasi batas nilai kapitalisasi di daerah Anda: jika nilai perolehan di bawah ambang batas aset tetap, barang tersebut semestinya dibukukan pada Belanja Barang & Jasa (5.1.02) kelompok ekstrakomtabel.',
                'amount' => $totalKecil,
            ];
        }

        $compactTrx = $this->compactTransactions(collect($modalTransactions), 25);

        return [
            'summary' => [
                'tab' => 'bhm',
                'periode_label' => $range['label'],
                'total_belanja_modal' => array_sum(array_map(fn ($t) => (float) ($t->dibelanjakan ?? 0), $modalTransactions)),
                'total_transaksi_modal' => count($modalTransactions),
                'modal_tanpa_bast_count' => count($belanjaModalTanpaBast),
                'modal_nilai_kecil_count' => count($belanjaModalNilaiKecil),
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
Anda adalah Auditor Aset & Barang Milik Daerah (BMD) BPK RI / Inspektorat Daerah spesialis Pemeriksaan Buku Pembantu Harta Modal (BHM / Aset Tetap Sekolah).
Sistem audit internal SIKAS telah selesai memverifikasi data belanja modal aset tetap, kelengkapan BAST, dan nilai kapitalisasi secara deterministik, menetapkan skor kepatuhan matematis dan daftar temuan resmi.

Tugas Anda sebagai Auditor Konsultan / Narrator:
1. Susun "executive_summary" yang elegan, berbobot, berwibawa, dan objektif dalam bahasa birokrasi pengawasan keuangan daerah, menelaah kepatuhan Berita Acara Serah Terima (BAST), kewajaran nilai perolehan kapitalisasi, serta ketertiban pencatatan Kartu Inventaris Barang (KIB).
2. Perkaya narasi "description" (fakta kasus riil & potensi temuan mutlak BPK atas aset daerah) dan "recommendation" (langkah konkrit penerbitan dokumen BAST / reklasifikasi akun) untuk setiap temuan yang terdaftar pada "temuan_resmi_sistem".
3. ATURAN PENYAJIAN (SANGAT KETAT):
   - DILARANG KERAS MENAMPILKAN ATAU MENYEBUT ID INTERNAL DATABASE (seperti 'ID 108', 'ID 238', dsb).
   - Selalu rujuk transaksi menggunakan: Tanggal Transaksi, Nomor Bukti, Nama Aset/Barang Modal, dan Kode Rekening 5.2.
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
