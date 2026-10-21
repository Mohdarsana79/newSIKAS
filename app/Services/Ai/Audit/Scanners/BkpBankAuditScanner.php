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
                'no_bukti' => $p->nomor_bukti ?: 'TRANSFER-MASUK',
                'jenis' => 'Penerimaan Transfer Bank',
                'uraian' => 'Penerimaan Dana '.($p->sumber_dana ?? 'BOSP'),
                'kode_rekening' => '4.1.01.01',
                'nama_rekening' => 'Pendapatan BOSP Transfer APBN',
                'masuk' => (float) $p->jumlah_dana,
                'keluar' => 0.0,
            ]);
        }
        foreach ($setors as $s) {
            $allEvents->push([
                'tgl' => $s->tanggal_setor,
                'no_bukti' => $s->nomor_bukti ?: 'SETOR-TUNAI',
                'jenis' => 'Setor Tunai ke Bank',
                'uraian' => 'Setor Tunai Kas ke Rekening Bank',
                'kode_rekening' => '1.1.01.02',
                'nama_rekening' => 'Kas di Bank',
                'masuk' => (float) $s->jumlah_setor,
                'keluar' => 0.0,
            ]);
        }
        foreach ($penarikans as $t) {
            $allEvents->push([
                'tgl' => $t->tanggal_penarikan,
                'no_bukti' => $t->nomor_bukti ?: 'TARIK-TUNAI',
                'jenis' => 'Penarikan Kas Tunai',
                'uraian' => 'Penarikan Kas Tunai dari Bank untuk Kas Operasional Sekolah',
                'kode_rekening' => '1.1.01.01',
                'nama_rekening' => 'Kas Tunai / Brankas Sekolah',
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
                        'no_bukti' => 'TUTUP-KAS-GIRO',
                        'jenis' => 'Bunga Bank / Jasa Giro',
                        'uraian' => 'Pendapatan Bunga Bank (Jasa Giro Rekening)',
                        'kode_rekening' => '4.3.1.01.01',
                        'nama_rekening' => 'Pendapatan Jasa Giro Kas Bank',
                        'masuk' => $bunga,
                        'keluar' => 0.0,
                    ]);
                }
                if ($pajakBunga > 0) {
                    $allEvents->push([
                        'tgl' => $b->tanggal_transaksi,
                        'no_bukti' => 'TUTUP-KAS-PAJAK',
                        'jenis' => 'Pajak Bunga Bank PPh 4(2)',
                        'uraian' => 'Pemotongan Pajak Bunga Bank (PPh Pasal 4 ayat 2)',
                        'kode_rekening' => '5.1.02.04.01',
                        'nama_rekening' => 'Belanja Pajak Penghasilan Bunga Bank',
                        'masuk' => 0.0,
                        'keluar' => $pajakBunga,
                    ]);
                }
            } else {
                $allEvents->push([
                    'tgl' => $b->tanggal_transaksi,
                    'no_bukti' => $b->nomor_nota ?: ($b->id_transaksi ? 'TRX-'.$b->id_transaksi : '-'),
                    'jenis' => 'Belanja Non-Tunai Transfer',
                    'uraian' => $b->uraian ?: 'Belanja Non-Tunai',
                    'kode_rekening' => $b->rekeningBelanja?->kode_rekening ?: '-',
                    'nama_rekening' => $b->rekeningBelanja?->nama_rekening ?: '-',
                    'masuk' => 0.0,
                    'keluar' => (float) $b->dibelanjakan,
                ]);
            }
        }

        $sortedEvents = $allEvents->sortBy('tgl');
        $tanggalMinus = [];
        $bankMutations = [];

        foreach ($sortedEvents as $evt) {
            $runningBank = $runningBank + $evt['masuk'] - $evt['keluar'];
            if ($runningBank < -100) { // Toleransi pembulatan kecil
                $tanggalMinus[] = [
                    'tanggal' => $evt['tgl'] ? Carbon::parse($evt['tgl'])->format('Y-m-d') : '-',
                    'uraian' => $evt['uraian'],
                    'saldo' => $runningBank,
                ];
            }

            $bankMutations[] = [
                'tanggal' => $evt['tgl'] ? Carbon::parse($evt['tgl'])->format('Y-m-d') : '-',
                'nomor_bukti' => $evt['no_bukti'] ?? '-',
                'jenis_mutasi' => $evt['jenis'],
                'uraian' => $evt['uraian'],
                'kode_rekening' => $evt['kode_rekening'] ?? '-',
                'nama_rekening' => $evt['nama_rekening'] ?? '-',
                'penerimaan_masuk' => $evt['masuk'],
                'pengeluaran_keluar' => $evt['keluar'],
                'saldo_berjalan' => $runningBank,
            ];
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
                'transaction_ref' => "Tgl: {$firstMinus['tanggal']} | Uraian: {$firstMinus['uraian']}",
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
                'transaction_ref' => 'Periode: '.implode(', ', $bulanTanpaBunga),
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
                'transaction_ref' => 'Saldo Akhir Bank: Rp '.number_format($saldoAkhirBank, 0, ',', '.'),
                'amount' => $saldoAkhirBank,
            ];
        }

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
                'total_mutasi_transaksi' => count($bankMutations),
            ],
            'rules_checked' => $rulesChecked,
            'pre_findings' => $findings,
            'transactions' => array_slice($bankMutations, 0, 50),
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
Tugas Anda adalah menelaah kesesuaian Buku Kas Pembantu Bank dengan mutasi rekening koran, penerimaan transfer dana APBN, penarikan kas tunai, serta kewajiban pencatatan jasa giro dan pajak bunga bank.

PETUNJUK AUDIT KHUSUS BKP BANK:
1. Aliran Kas Penarikan Tunai: Apabila dana diterima (misal Rp 14.500.000) lalu ditarik tunai untuk operasional sekolah sehingga saldo kas bank menjadi nihil (Rp 0), ini adalah praktik yang lazim dalam tata kelola BOSP asalkan penarikan kas tersebut dicatat pada BKP Pembantu Kas Tunai dan saldo bank tidak pernah mengalami defisit/minus harian. JANGAN memberi penalti jika saldo akhir bank Rp 0 akibat penarikan tunai yang sah.
2. Jasa Giro & Pajak Bunga Bank: Jika terdapat transaksi jasa giro dan pajak bunga PPh 4(2) yang tercatat pada penutupan kas bulanan, akui hal tersebut sebagai bukti kepatuhan pencatatan rekening koran bank yang baik.
3. ATURAN PENYAJIAN TRANSAKSI (SANGAT KETAT):
   - DILARANG KERAS MENAMPILKAN ATAU MENYEBUT ID INTERNAL DATABASE (seperti 'ID 108', 'ID 238', dsb). Pengguna TIDAK MEMAHAMI ID database tersebut.
   - Jika merujuk pada transaksi tertentu, WAJIB sebutkan: Tanggal Transaksi, Nomor Bukti, Uraian Transaksi, dan Kode/Nama Rekening Belanja.
   - Sertakan properti "transaction_ref" pada setiap objek temuan (contoh: "Tgl: 2026-03-31 | Jasa Giro Bank").

Format Output WAJIB berupa JSON murni:
{
  "compliance_score": 90,
  "executive_summary": "Teks analisis eksekutif profesional tanpa menyebut ID internal...",
  "findings": [
    {
      "id": "BANK-FINDING-KODE",
      "category": "keseimbangan_bank|bunga_bank|efektivitas_dana",
      "severity": "danger|warning|info",
      "title": "Judul Temuan Spesifik",
      "description": "Deskripsi fakta menyebut tanggal, nomor bukti, uraian transaksi, dan rekening belanja...",
      "recommendation": "Rekomendasi konkrit operasional untuk bendahara...",
      "transaction_ref": "Tgl: YYYY-MM-DD | Bukti: ... | Uraian: ...",
      "amount": 0
    }
  ],
  "rules_checked": ["Daftar aturan yang dievaluasi..."]
}
PROMPT;
    }
}
