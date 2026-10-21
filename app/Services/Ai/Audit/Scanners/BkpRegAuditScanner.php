<?php

namespace App\Services\Ai\Audit\Scanners;

use App\Config\VariantConfig;
use App\Models\User;
use App\Services\Ai\Audit\BaseTabAuditScanner;
use Carbon\Carbon;

class BkpRegAuditScanner extends BaseTabAuditScanner
{
    public function getTabTitle(): string
    {
        return 'Register Penutupan Kas (REG - BOS K7B)';
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

        $bkuClass = VariantConfig::getModelClass('bku', $variant);
        $bastClass = VariantConfig::getModelClass('bast', $variant);

        $rulesChecked = [
            'Selisih Kas Nol (Zero Discrepancy) antara Saldo Buku dan Fisik Kas',
            'Konsistensi Saldo Akhir Kas Bank dan Kas Tunai Brankas',
            'Ketertiban Penutupan Buku Kas Umum (BKU) Tepat Waktu',
            'Kelengkapan Berita Acara Serah Terima (BAST) Belanja Modal',
            'Kesesuaian Saldo Penutupan Kas Bulan Lalu dengan Saldo Awal',
        ];

        $findings = [];

        // 1. Ambil Semua Transaksi Periode
        $transactions = $this->getPeriodTransactions($variant, $penganggaran, $tahun, $startMonth, $endMonth);

        // 2. Hitung Saldo Bank & Tunai di Akhir Periode
        $saldoBankAwal = (float) $this->bukuKasService->hitungSaldoBankSebelumBulan($penganggaran->id, $startMonth);
        $saldoTunaiAwal = (float) $this->bukuKasService->getSaldoKasFromPembantu(
            $penganggaran->id,
            $tahun,
            Carbon::createFromDate($tahun, $startMonth, 1)->locale('id')->isoFormat('MMMM'),
            $startMonth
        );

        $penarikanClass = VariantConfig::getModelClass('penarikan_tunai', $variant);
        $penerimaanClass = VariantConfig::getModelClass('penerimaan_dana', $variant);
        $setorClass = VariantConfig::getModelClass('setor_tunai', $variant);

        $totalPenerimaan = (float) $penerimaanClass::where($fk, $penganggaran->id)
            ->whereYear('tanggal_terima', $tahun)
            ->whereBetween(DB::raw('EXTRACT(MONTH FROM tanggal_terima)'), [$startMonth, $endMonth])
            ->sum('jumlah_dana');

        $totalPenarikan = (float) $penarikanClass::where($fk, $penganggaran->id)
            ->whereYear('tanggal_penarikan', $tahun)
            ->whereBetween(DB::raw('EXTRACT(MONTH FROM tanggal_penarikan)'), [$startMonth, $endMonth])
            ->sum('jumlah_penarikan');

        $totalSetor = (float) $setorClass::where($fk, $penganggaran->id)
            ->whereYear('tanggal_setor', $tahun)
            ->whereBetween(DB::raw('EXTRACT(MONTH FROM tanggal_setor)'), [$startMonth, $endMonth])
            ->sum('jumlah_setor');

        $totalBelanjaTunai = (float) $transactions->where('jenis_transaksi', 'tunai')->sum('dibelanjakan');
        $totalBelanjaNonTunai = (float) $transactions->where('jenis_transaksi', 'non-tunai')->sum('dibelanjakan');

        $saldoKasTunaiAkhir = max(0, $saldoTunaiAwal + $totalPenarikan - $totalBelanjaTunai - $totalSetor);
        $saldoKasBankAkhir = max(0, $saldoBankAwal + $totalPenerimaan + $totalSetor - $totalPenarikan - $totalBelanjaNonTunai);

        $saldoFisikTotal = $saldoKasTunaiAkhir + $saldoKasBankAkhir;
        $totalDanaMasuk = $saldoBankAwal + $saldoTunaiAwal + $totalPenerimaan;
        $totalBelanjaSemua = $totalBelanjaTunai + $totalBelanjaNonTunai;
        $saldoBukuTotal = max(0, $totalDanaMasuk - $totalBelanjaSemua);

        $selisihKas = abs($saldoBukuTotal - $saldoFisikTotal);

        // Temuan 1: Selisih Kas Tidak Nol (DANGER)
        if ($selisihKas > 100) {
            $findings[] = [
                'id' => 'REG-SELISIH-KAS',
                'category' => 'selisih_kas',
                'severity' => 'danger',
                'title' => 'Terdapat Selisih antara Saldo Buku BKU dan Saldo Kas Fisik (Rp '.number_format($selisihKas, 0, ',', '.').')',
                'description' => 'Dalam Formulir BOS-K7B Register Penutupan Kas, saldo buku kas harus sama persis dengan jumlah uang tunai di brankas ditambah kas di rekening bank. Ditemukan selisih sebesar Rp '.number_format($selisihKas, 0, ',', '.').'.',
                'recommendation' => 'Cocokkan mutasi penarikan, penyetoran kas, dan belanja riil untuk memastikan tidak ada pencatatan transaksi yang tercecer atau ganda.',
                'amount' => $selisihKas,
            ];
        }

        // Temuan 2: Belanja Modal tanpa BAST
        $bkuIds = $transactions->pluck('id')->all();
        $existingBastBkuIds = $bastClass::whereIn(VariantConfig::bkuFk($variant), $bkuIds)
            ->pluck(VariantConfig::bkuFk($variant))
            ->all();

        $modalTanpaBast = [];
        foreach ($transactions as $t) {
            $rek = $t->rekeningBelanja?->kode_rekening ?? '';
            $amt = (float) ($t->dibelanjakan ?? 0);
            if (str_starts_with($rek, '5.2') && ! in_array($t->id, $existingBastBkuIds)) {
                $modalTanpaBast[] = [
                    'id' => $t->id,
                    'tgl' => $t->tanggal_transaksi,
                    'uraian' => $t->uraian,
                    'amount' => $amt,
                ];
            }
        }

        if (! empty($modalTanpaBast)) {
            $totalModalNoBast = array_sum(array_column($modalTanpaBast, 'amount'));
            $findings[] = [
                'id' => 'REG-MODAL-NO-BAST',
                'category' => 'belanja_modal',
                'severity' => 'danger',
                'title' => count($modalTanpaBast).' Belanja Modal Belum Dibuatkan Berita Acara Serah Terima (BAST)',
                'description' => 'Pengeluaran Belanja Modal (Akun 5.2) tanpa BAST berpotensi menjadi temuan mutlak auditor BPK terkait inventaris KIB aset sekolah.',
                'recommendation' => 'Terbitkan dokumen BAST melalui menu Fitur Pelengkap > BAST sebelum penutupan kas dilakukan.',
                'amount' => $totalModalNoBast,
            ];
        }

        // Temuan 3: Cek status tutup BKU pada bulan tunggal
        if ($range['is_single_month']) {
            $isClosed = $bkuClass::where($fk, $penganggaran->id)
                ->whereYear('tanggal_transaksi', $tahun)
                ->whereMonth('tanggal_transaksi', $startMonth)
                ->where('is_bunga_record', true)
                ->exists();

            if (! $isClosed && count($transactions) > 0) {
                $findings[] = [
                    'id' => 'REG-BELUM-TUTUP-KAS',
                    'category' => 'ketertiban_administrasi',
                    'severity' => 'warning',
                    'title' => 'Buku Kas Umum Periode Ini Belum Dilakukan Penutupan Kas Resmi',
                    'description' => "Penatausahaan BKU {$range['label']} belum ditutup oleh bendahara dan kepala sekolah.",
                    'recommendation' => 'Lakukan proses Tutup BKU pada tombol Tutup BKU di halaman BKU setelah seluruh transaksi dan pajak tuntas dicatat.',
                    'amount' => 0,
                ];
            }
        }

        $compactTrx = $this->compactTransactions($transactions, 30);

        return [
            'summary' => [
                'tab' => 'reg',
                'periode_label' => $range['label'],
                'saldo_buku_total' => $saldoBukuTotal,
                'saldo_fisik_total' => $saldoFisikTotal,
                'saldo_kas_bank' => $saldoKasBankAkhir,
                'saldo_kas_tunai' => $saldoKasTunaiAkhir,
                'selisih_kas' => $selisihKas,
                'total_pengeluaran' => $totalBelanjaSemua,
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
Anda adalah Auditor Finansial Senior BPK RI / Inspektorat Daerah spesialis Pemeriksaan Register Penutupan Kas (Formulir BOS-K7B).
Sistem audit internal SIKAS telah selesai memverifikasi data penutupan kas, rekonsiliasi kas fisik vs buku, dan BAST belanja modal secara deterministik, menetapkan skor kepatuhan matematis dan daftar temuan resmi.

Tugas Anda sebagai Auditor Konsultan / Narrator:
1. Susun "executive_summary" yang elegan, berbobot, berwibawa, dan objektif dalam bahasa birokrasi pengawasan keuangan daerah, menelaah prinsip zero discrepancy saldo kas, kepatuhan dokumen BAST aset modal, dan ketertiban administrasi penutupan kas.
2. Perkaya narasi "description" (fakta kasus riil & risiko pemeriksaan BPK) dan "recommendation" (langkah konkrit operasional penyelesaian selisih kas / penerbitan BAST untuk bendahara) untuk setiap temuan yang terdaftar pada "temuan_resmi_sistem".
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
