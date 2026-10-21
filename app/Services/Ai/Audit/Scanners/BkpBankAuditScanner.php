<?php

namespace App\Services\Ai\Audit\Scanners;

use App\Config\VariantConfig;
use App\Models\User;
use App\Services\Ai\Audit\BaseTabAuditScanner;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class BkpBankAuditScanner extends BaseTabAuditScanner
{
    public function getTabTitle(): string
    {
        return 'Buku Kas Pembantu Bank (BKP Bank)';
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

        $penerimaanClass = VariantConfig::getModelClass('penerimaan_dana', $variant);
        $penarikanClass = VariantConfig::getModelClass('penarikan_tunai', $variant);
        $setorClass = VariantConfig::getModelClass('setor_tunai', $variant);
        $bkuClass = VariantConfig::getModelClass('bku', $variant);

        $rulesChecked = [
            'Rekonsiliasi Mutasi Saldo Kas Bank vs Rekening Koran',
            'Pencatatan Bunga Bank & Pemotongan Pajak Bunga Bank (PPh Pasal 4 ayat 2)',
            'Pencegahan Saldo Bank Negatif / Defisit Mutasi Harian',
            'Kewajaran Sisa Dana Kas Bank Mengendap di Akhir Periode',
            'Kesesuaian Pengeluaran Belanja Non-Tunai / Transfer Perbankan',
        ];

        $findings = [];

        // 1. Ambil Data Mutasi Bank dalam Periode
        $penerimaans = $penerimaanClass::where($fk, $penganggaran->id)
            ->whereYear('tanggal_terima', $tahun)
            ->whereBetween(DB::raw('EXTRACT(MONTH FROM tanggal_terima)'), [$startMonth, $endMonth])
            ->orderBy('tanggal_terima', 'asc')
            ->get();

        $penarikans = $penarikanClass::where($fk, $penganggaran->id)
            ->whereYear('tanggal_penarikan', $tahun)
            ->whereBetween(DB::raw('EXTRACT(MONTH FROM tanggal_penarikan)'), [$startMonth, $endMonth])
            ->orderBy('tanggal_penarikan', 'asc')
            ->get();

        $setors = $setorClass::where($fk, $penganggaran->id)
            ->whereYear('tanggal_setor', $tahun)
            ->whereBetween(DB::raw('EXTRACT(MONTH FROM tanggal_setor)'), [$startMonth, $endMonth])
            ->orderBy('tanggal_setor', 'asc')
            ->get();

        $bkuNonTunai = $bkuClass::where($fk, $penganggaran->id)
            ->whereYear('tanggal_transaksi', $tahun)
            ->whereBetween(DB::raw('EXTRACT(MONTH FROM tanggal_transaksi)'), [$startMonth, $endMonth])
            ->where(function ($q) {
                $q->whereIn('jenis_transaksi', ['non-tunai', 'nontunai', 'Non-Tunai', 'Nontunai'])
                    ->orWhere('is_bunga_record', true);
            })
            ->orderBy('tanggal_transaksi', 'asc')
            ->get();

        $totalPenerimaan = (float) $penerimaans->sum('jumlah_dana');
        $totalPenarikan = (float) $penarikans->sum('jumlah_penarikan');
        $totalSetor = (float) $setors->sum('jumlah_setor');
        $totalBelanjaNonTunai = (float) $bkuNonTunai->where('is_bunga_record', false)->sum('dibelanjakan');

        // 2. Saldo Awal Bank Sebelum Periode
        $saldoAwalBank = (float) $this->bukuKasService->hitungSaldoBankSebelumBulan($penganggaran->id, $startMonth);

        // 3. Kronologi Mutasi & Deteksi Saldo Bank Minus
        $runningBank = $saldoAwalBank;
        $allEvents = collect();

        foreach ($penerimaans as $p) {
            $allEvents->push([
                'tgl' => $p->tanggal_terima,
                'jenis' => 'terima',
                'uraian' => 'Penerimaan Dana '.($p->sumber_dana ?? 'BOSP'),
                'masuk' => (float) $p->jumlah_dana,
                'keluar' => 0.0,
            ]);
        }
        foreach ($setors as $s) {
            $allEvents->push([
                'tgl' => $s->tanggal_setor,
                'jenis' => 'setor',
                'uraian' => 'Setor Tunai ke Bank',
                'masuk' => (float) $s->jumlah_setor,
                'keluar' => 0.0,
            ]);
        }
        foreach ($penarikans as $t) {
            $allEvents->push([
                'tgl' => $t->tanggal_penarikan,
                'jenis' => 'tarik',
                'uraian' => 'Penarikan Tunai Kas',
                'masuk' => 0.0,
                'keluar' => (float) $t->jumlah_penarikan,
            ]);
        }
        foreach ($bkuNonTunai as $b) {
            if ($b->is_bunga_record) {
                // Bunga bank menambah saldo bank, pajak bunga mengurangi
                $bunga = (float) ($b->bunga_bank ?? 0);
                $pajakBunga = (float) ($b->pajak_bunga_bank ?? 0);
                if ($bunga > 0) {
                    $allEvents->push([
                        'tgl' => $b->tanggal_transaksi,
                        'jenis' => 'bunga',
                        'uraian' => 'Pendapatan Bunga Bank (Giro)',
                        'masuk' => $bunga,
                        'keluar' => 0.0,
                    ]);
                }
                if ($pajakBunga > 0) {
                    $allEvents->push([
                        'tgl' => $b->tanggal_transaksi,
                        'jenis' => 'pajak_bunga',
                        'uraian' => 'Pajak Bunga Bank (PPh Pasal 4 ayat 2)',
                        'masuk' => 0.0,
                        'keluar' => $pajakBunga,
                    ]);
                }
            } else {
                $allEvents->push([
                    'tgl' => $b->tanggal_transaksi,
                    'jenis' => 'belanja_nontunai',
                    'uraian' => $b->uraian,
                    'masuk' => 0.0,
                    'keluar' => (float) $b->dibelanjakan,
                ]);
            }
        }

        $sortedEvents = $allEvents->sortBy('tgl');
        $tanggalMinus = [];

        foreach ($sortedEvents as $evt) {
            $runningBank = $runningBank + $evt['masuk'] - $evt['keluar'];
            if ($runningBank < -100) { // Toleransi pembulatan kecil
                $tanggalMinus[] = [
                    'tanggal' => $evt['tgl'],
                    'uraian' => $evt['uraian'],
                    'saldo' => $runningBank,
                ];
            }
        }

        if (! empty($tanggalMinus)) {
            $firstMinus = $tanggalMinus[0];
            $findings[] = [
                'id' => 'BANK-SALDO-MINUS',
                'category' => 'keseimbangan_bank',
                'severity' => 'danger',
                'title' => 'Terjadi Saldo Kas Bank Minus / Defisit pada Mutasi Harian',
                'description' => "Pada tanggal {$firstMinus['tanggal']}, saldo kas di bank tercatat minus sebesar Rp ".number_format(abs($firstMinus['saldo']), 0, ',', '.')." setelah transaksi '{$firstMinus['uraian']}'. Hal ini menunjukkan penarikan/belanja mendahului pencairan dana kas.",
                'recommendation' => 'Periksa kembali kronologi tanggal penarikan dan tanggal penerimaan dana BOSP agar tidak terjadi tanggal transaksi yang mendahului saldo masuk.',
                'amount' => abs($firstMinus['saldo']),
            ];
        }

        // 4. Periksa Pencatatan Bunga Bank & Pajak Bunga per Bulan
        $bulanTanpaBunga = [];
        for ($m = $startMonth; $m <= $endMonth; $m++) {
            $hasBunga = $bkuClass::where($fk, $penganggaran->id)
                ->whereYear('tanggal_transaksi', $tahun)
                ->whereMonth('tanggal_transaksi', $m)
                ->where('is_bunga_record', true)
                ->exists();

            if (! $hasBunga && $totalPenerimaan > 0) {
                $namaBulan = Carbon::createFromDate($tahun, $m, 1)->locale('id')->isoFormat('MMMM');
                $bulanTanpaBunga[] = $namaBulan;
            }
        }

        if (! empty($bulanTanpaBunga)) {
            $findings[] = [
                'id' => 'BANK-NO-BUNGA',
                'category' => 'bunga_bank',
                'severity' => 'warning',
                'title' => 'Catatan Jasa Giro / Bunga Bank Belum Lengkap ('.implode(', ', $bulanTanpaBunga).')',
                'description' => 'Rekening koran bank satuan pendidikan umumnya menghasilkan bunga bank (jasa giro) dan pajak bunga bulanan. Periode: '.implode(', ', $bulanTanpaBunga).' belum mencatat transaksi bunga bank saat tutup kas.',
                'recommendation' => 'Cetak rekening koran dari bank persepsi dan input nilai bunga bank serta pajak bunga pada menu Tutup BKU bulan terkait.',
                'amount' => 0,
            ];
        }

        // 5. Analisis Sisa Dana Kas Bank Mengendap
        $saldoAkhirBank = max(0, $runningBank);
        if ($saldoAkhirBank > 50000000 && ($totalBelanjaNonTunai + $totalPenarikan) === 0.0) {
            $findings[] = [
                'id' => 'BANK-DANA-MENGENDAP',
                'category' => 'efektivitas_dana',
                'severity' => 'info',
                'title' => 'Saldo Kas Bank Mengendap Cukup Besar (Rp '.number_format($saldoAkhirBank, 0, ',', '.').')',
                'description' => 'Terdapat saldo kas bank yang belum direalisasikan atau ditarik tunai untuk operasional pembelajaran sekolah pada periode ini.',
                'recommendation' => 'Rencanakan pelaksanaan program kegiatan sekolah sesuai tahapan RKAS agar serapan dana BOSP optimal dan terhindar dari sanksi keterlambatan penyaluran tahap berikutnya.',
                'amount' => $saldoAkhirBank,
            ];
        }

        $compactTrx = $this->compactTransactions($bkuNonTunai, 30);

        return [
            'summary' => [
                'tab' => 'bkp_bank',
                'periode_label' => $range['label'],
                'saldo_awal_bank' => $saldoAwalBank,
                'total_penerimaan_dana' => $totalPenerimaan,
                'total_setor_tunai' => $totalSetor,
                'total_penarikan_tunai' => $totalPenarikan,
                'total_belanja_nontunai' => $totalBelanjaNonTunai,
                'saldo_akhir_bank' => $saldoAkhirBank,
                'total_mutasi_transaksi' => $allEvents->count(),
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
Anda adalah Auditor Finansial Senior BPK RI / Inspektorat Daerah spesialis Rekonsiliasi Rekening Kas Bank Satuan Pendidikan (Buku Kas Pembantu Bank BOSP).
Tugas Anda adalah menelaah kesesuaian Buku Pembantu Bank dengan mutasi rekening koran, penerimaan transfer dana APBN, penarikan kas tunai, serta kewajiban pencatatan jasa giro dan pajak bunga bank.

Aturan Evaluasi:
1. Hitung compliance_score (0-100). Berikan penalti berat (-20 poin) jika terjadi saldo bank minus/defisit tanggal transaksi, penalti sedang (-10 poin) jika bunga bank belum dibukukan.
2. Buat executive_summary profesional dalam bahasa Indonesia formal birokrasi pengawasan keuangan daerah.
3. Telaah ulang temuan pre-scan dan berikan saran solusi operasional untuk bendahara sekolah.
4. Respon WAJIB dalam format JSON murni:
{
  "compliance_score": 90,
  "executive_summary": "Teks analisis eksekutif...",
  "findings": [
    {
      "id": "FINDING-ID",
      "category": "keseimbangan_bank|bunga_bank|efektivitas_dana",
      "severity": "danger|warning|info",
      "title": "Judul Temuan",
      "description": "Uraian fakta...",
      "recommendation": "Rekomendasi konkrit...",
      "amount": 0
    }
  ],
  "rules_checked": ["Daftar aturan..."]
}
PROMPT;
    }
}
