<?php

namespace App\Services\Ai\Audit\Scanners;

use App\Config\VariantConfig;
use App\Models\User;
use App\Services\Ai\Audit\BaseTabAuditScanner;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class BkpPembantuAuditScanner extends BaseTabAuditScanner
{
    public function getTabTitle(): string
    {
        return 'Buku Kas Pembantu Kas Tunai (BKP Pembantu)';
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

        $penarikanClass = VariantConfig::getModelClass('penarikan_tunai', $variant);
        $setorClass = VariantConfig::getModelClass('setor_tunai', $variant);
        $bkuClass = VariantConfig::getModelClass('bku', $variant);

        $rulesChecked = [
            'Pencegahan Saldo Brankas Kas Tunai Negatif Harian',
            'Kepatuhan Batas Maksimal Saldo Kas Tunai Mengendap di Brankas (Maks Rp 10 Juta)',
            'Kepatuhan Batas Maksimal Pengeluaran Tunai vs Regulasi Non-Tunai (> Rp 10 Juta)',
            'Kronologi Penarikan Kas Tunai Mendahului Belanja Tunai',
            'Pencatatan Penyetoran Sisa Kas Tunai ke Rekening Bank',
        ];

        $findings = [];

        // 1. Ambil Mutasi Kas Tunai
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

        $bkuTunai = $bkuClass::where($fk, $penganggaran->id)
            ->whereYear('tanggal_transaksi', $tahun)
            ->whereBetween(DB::raw('EXTRACT(MONTH FROM tanggal_transaksi)'), [$startMonth, $endMonth])
            ->where(function ($q) {
                $q->whereIn('jenis_transaksi', ['tunai', 'Tunai'])
                    ->where('is_bunga_record', false);
            })
            ->orderBy('tanggal_transaksi', 'asc')
            ->get();

        $totalPenarikan = (float) $penarikans->sum('jumlah_penarikan');
        $totalSetor = (float) $setors->sum('jumlah_setor');
        $totalBelanjaTunai = (float) $bkuTunai->sum('dibelanjakan');

        // Saldo Awal Kas Tunai Sebelum Bulan Tersebut
        $saldoAwalTunai = (float) $this->bukuKasService->getSaldoKasFromPembantu(
            $penganggaran->id,
            $tahun,
            Carbon::createFromDate($tahun, $startMonth, 1)->locale('id')->isoFormat('MMMM'),
            $startMonth
        );

        // 2. Simulasi Running Saldo Kas Tunai Harian
        $allEvents = collect();

        foreach ($penarikans as $p) {
            $allEvents->push([
                'tgl' => $p->tanggal_penarikan,
                'jenis' => 'tarik',
                'uraian' => 'Tarik Tunai dari Bank',
                'masuk' => (float) $p->jumlah_penarikan,
                'keluar' => 0.0,
                'trx_id' => null,
            ]);
        }
        foreach ($setors as $s) {
            $allEvents->push([
                'tgl' => $s->tanggal_setor,
                'jenis' => 'setor',
                'uraian' => 'Setor Tunai ke Bank',
                'masuk' => 0.0,
                'keluar' => (float) $s->jumlah_setor,
                'trx_id' => null,
            ]);
        }
        foreach ($bkuTunai as $b) {
            $allEvents->push([
                'tgl' => $b->tanggal_transaksi,
                'jenis' => 'belanja_tunai',
                'uraian' => $b->uraian,
                'masuk' => 0.0,
                'keluar' => (float) $b->dibelanjakan,
                'trx_id' => $b->id,
            ]);
        }

        $sortedEvents = $allEvents->sortBy('tgl');
        $runningTunai = $saldoAwalTunai;
        $tanggalMinus = [];
        $belanjaBesar = [];

        foreach ($sortedEvents as $evt) {
            $runningTunai = $runningTunai + $evt['masuk'] - $evt['keluar'];
            if ($runningTunai < -100) {
                $tanggalMinus[] = [
                    'tanggal' => $evt['tgl'],
                    'uraian' => $evt['uraian'],
                    'saldo' => $runningTunai,
                ];
            }

            if ($evt['jenis'] === 'belanja_tunai' && $evt['keluar'] > 10000000) {
                $belanjaBesar[] = [
                    'id' => $evt['trx_id'],
                    'tanggal' => $evt['tgl'],
                    'uraian' => $evt['uraian'],
                    'nominal' => $evt['keluar'],
                ];
            }
        }

        // Temuan 1: Saldo Tunai Minus
        if (! empty($tanggalMinus)) {
            $firstMinus = $tanggalMinus[0];
            $findings[] = [
                'id' => 'TUNAI-SALDO-MINUS',
                'category' => 'keseimbangan_kas',
                'severity' => 'danger',
                'title' => 'Terjadi Saldo Kas Tunai Minus / Uang Keluar Mendahului Penarikan',
                'description' => "Pada tanggal {$firstMinus['tanggal']}, saldo fisik brankas tunai bernilai negatif sebesar Rp ".number_format(abs($firstMinus['saldo']), 0, ',', '.')." setelah pembelanjaan '{$firstMinus['uraian']}'. Ini mengindikasikan bendahara mencatat pengeluaran sebelum kas tunai dicairkan dari bank.",
                'recommendation' => 'Koreksi tanggal bukti pengeluaran agar selalu setelah tanggal slip penarikan tunai dari bank persepsi.',
                'amount' => abs($firstMinus['saldo']),
            ];
        }

        // Temuan 2: Saldo Tunai Brankas Terlalu Besar Saat Penutupan
        $saldoAkhirTunai = max(0, $runningTunai);
        $batasMaksimalBrankas = 10000000.0; // Batas regulasi kas tunai brankas 10 juta
        if ($saldoAkhirTunai > $batasMaksimalBrankas) {
            $findings[] = [
                'id' => 'TUNAI-LIMIT-BRANKAS',
                'category' => 'pengelolaan_kas',
                'severity' => 'warning',
                'title' => 'Sisa Uang Tunai di Brankas Melebihi Ambang Batas Wajar (Rp '.number_format($saldoAkhirTunai, 0, ',', '.').')',
                'description' => 'Berdasarkan prinsip tertib kas dan regulasi juknis BOSP/Permendagri 12/2019, penyimpanan uang tunai dalam jumlah besar di brankas sekolah (> Rp 10.000.000) memiliki risiko keamanan tinggi dan berpotensi menjadi catatan pemeriksaan BPK.',
                'recommendation' => 'Segera setorkan sisa kas tunai kembali ke rekening bank sekolah (Setor Tunai) jika belum ada rencana pembelanjaan dalam waktu dekat.',
                'amount' => $saldoAkhirTunai,
            ];
        }

        // Temuan 3: Pembayaran Tunai Nominal Besar (> 10 Juta)
        if (! empty($belanjaBesar)) {
            $totalBesar = array_sum(array_column($belanjaBesar, 'nominal'));
            $findings[] = [
                'id' => 'TUNAI-LARGE-TRANSACTION',
                'category' => 'kepatuhan_nontunai',
                'severity' => 'warning',
                'title' => count($belanjaBesar).' Transaksi Pembayaran Tunai Melebihi Batas Transaksi Non-Tunai',
                'description' => 'Ditemukan transaksi tunai di atas Rp 10.000.000 dengan total Rp '.number_format($totalBesar, 0, ',', '.').'. Instruksi Presiden dan Pemerintah Daerah mewajibkan transaksi di atas ambang batas dilakukan melalui mekanisme CMS/transfer bank.',
                'recommendation' => 'Gunakan metode pembayaran transfer non-tunai atau lampirkan Berita Acara darurat pembayaran tunai.',
                'amount' => $totalBesar,
            ];
        }

        $compactTrx = $this->compactTransactions($bkuTunai, 30);

        return [
            'summary' => [
                'tab' => 'bkp_pembantu',
                'periode_label' => $range['label'],
                'saldo_awal_tunai' => $saldoAwalTunai,
                'total_penarikan_tunai' => $totalPenarikan,
                'total_setor_tunai' => $totalSetor,
                'total_belanja_tunai' => $totalBelanjaTunai,
                'saldo_akhir_tunai' => $saldoAkhirTunai,
                'total_transaksi_tunai' => $bkuTunai->count(),
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
Anda adalah Auditor Finansial Senior BPK RI / Inspektorat Daerah spesialis Pengawasan Kas Fisik Brankas dan Buku Kas Pembantu Kas Tunai Dana BOSP.
Tugas Anda adalah menelaah kepatuhan bendahara sekolah terhadap batas maksimal simpan brankas, pencegahan saldo tunai minus harian, serta kepatuhan kewajiban transaksi non-tunai.

Aturan Evaluasi:
1. Hitung compliance_score (0-100). Berikan penalti berat (-20 poin) untuk saldo tunai minus, penalti sedang (-10 poin) untuk saldo brankas melebihi batas simpan (> 10 juta) atau belanja tunai bernilai besar tanpa non-tunai.
2. Buat executive_summary profesional dalam bahasa Indonesia formal birokrasi pengawasan keuangan daerah.
3. Telaah ulang temuan pre-scan dan berikan rekomendasi konkrit bagi bendahara.
4. Respon WAJIB dalam format JSON murni:
{
  "compliance_score": 90,
  "executive_summary": "Teks analisis eksekutif...",
  "findings": [
    {
      "id": "FINDING-ID",
      "category": "keseimbangan_kas|pengelolaan_kas|kepatuhan_nontunai",
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
