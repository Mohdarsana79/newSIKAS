<?php

namespace App\Services\Ai\Audit\Scanners;

use App\Config\VariantConfig;
use App\Models\User;
use App\Services\Ai\Audit\BaseTabAuditScanner;
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
            'Pengawasan Sisa Fisik Kas Tunai di Brankas pada Akhir Periode',
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

        // Saldo Awal Kas Tunai Sebelum Bulan Tersebut (Posisi per 1 bulan berjalan)
        $saldoAwalTunai = (float) $this->bukuKasService->hitungSaldoTunaiSebelumBulan(
            $penganggaran->id,
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

        // Temuan 2: Saldo Tunai Brankas Terlalu Besar Saat Penutupan ATAU Pengingat Sisa Kas Tunai Belum Direalisasikan
        $saldoAkhirTunai = max(0, $runningTunai);
        $batasMaksimalBrankas = 10000000.0; // Batas regulasi kas tunai brankas 10 juta
        if ($saldoAkhirTunai > $batasMaksimalBrankas) {
            $findings[] = [
                'id' => 'TUNAI-LIMIT-BRANKAS',
                'category' => 'pengelolaan_kas',
                'severity' => 'warning',
                'title' => 'Sisa Uang Tunai di Brankas Melebihi Ambang Batas Wajar (Rp '.number_format($saldoAkhirTunai, 0, ',', '.').')',
                'description' => 'Berdasarkan prinsip kehati-hatian penatausahaan kas sekolah dan tata kelola dana BOSP (Permendikdasmen No. 8 Tahun 2026 jo. Permendagri 12/2019), penyimpanan uang tunai dalam jumlah besar di brankas sekolah (> Rp 10.000.000) memiliki risiko keamanan tinggi dan berpotensi menjadi catatan pemeriksaan BPK.',
                'recommendation' => 'Segera setorkan sisa kas tunai kembali ke rekening bank sekolah (Setor Tunai) jika belum ada rencana pembelanjaan dalam waktu dekat.',
                'amount' => $saldoAkhirTunai,
            ];
        } elseif ($saldoAkhirTunai > 0) {
            $isAkhirTahun = in_array($periodeType, ['tahunan', 'tahap']) || ($periodeType === 'bulan' && (int) $periodeKey === 12);
            $findings[] = [
                'id' => 'TUNAI-SISA-KAS-BRANKAS',
                'category' => 'pengelolaan_kas',
                'severity' => 'info',
                'title' => 'Terdapat Sisa Kas Tunai di Brankas yang Belum Direalisasikan (Rp '.number_format($saldoAkhirTunai, 0, ',', '.').')',
                'description' => $isAkhirTahun
                    ? "Pada penutupan buku periode {$range['label']}, masih terdapat saldo kas fisik di brankas sebesar Rp ".number_format($saldoAkhirTunai, 0, ',', '.').' yang belum direalisasikan. Sesuai Permendikdasmen No. 8 Tahun 2026 Pasal 54, sisa dana kas BOSP pada akhir tahun anggaran harus dipertanggungjawabkan dan dicatatkan sebagai SiLPA pada RKAS tahun anggaran berikutnya.'
                    : "Pada akhir periode {$range['label']}, tercatat saldo kas fisik di brankas sebesar Rp ".number_format($saldoAkhirTunai, 0, ',', '.').' yang belum direalisasikan untuk belanja kegiatan. Pastikan sisa kas tunai ini aman dalam brankas atau segera direalisasikan sesuai rencana kegiatan belanja operasional.',
                'recommendation' => $isAkhirTahun
                    ? 'Lakukan penyetoran sisa kas tunai ke rekening bank sekolah sebelum tutup buku tahunan atau catatkan secara tertib dalam Berita Acara Pemeriksaan Kas dan pembukuan SiLPA tahun berikutnya.'
                    : 'Gunakan sisa kas tunai sesuai perencanaan belanja RKAS yang telah ditetapkan atau setorkan kembali ke bank jika kegiatan belum akan dilaksanakan.',
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
                'sisa_dana_tunai_belum_realisasi' => $saldoAkhirTunai,
                'total_transaksi_tunai' => $bkuTunai->count(),
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
Anda adalah Auditor Finansial Senior BPK RI / Inspektorat Daerah spesialis Pengawasan Kas Fisik Brankas dan Buku Kas Pembantu Kas Tunai Dana BOSP.
Sistem audit internal SIKAS telah selesai memverifikasi data transaksi kas tunai dan brankas secara deterministik, menetapkan skor kepatuhan matematis dan daftar temuan resmi.

Tugas Anda sebagai Auditor Konsultan / Narrator:
1. Susun "executive_summary" yang elegan, berbobot, berwibawa, dan objektif dalam bahasa birokrasi pengawasan keuangan daerah, menelaah kepatuhan bendahara terhadap batas simpan brankas, pencegahan saldo minus, keberadaan sisa kas tunai yang belum direalisasikan, serta efektivitas pengelolaan uang tunai.
2. Perkaya narasi "description" (fakta kasus riil & risiko pemeriksaan) dan "recommendation" (langkah konkrit operasional untuk bendahara/kepala sekolah) untuk setiap temuan yang terdaftar pada "temuan_resmi_sistem".
3. Jika terdapat temuan sisa kas tunai di brankas (TUNAI-SISA-KAS-BRANKAS), ingatkan pentingnya penyetoran kembali sisa kas tunai ke rekening bank menjelang akhir tahun anggaran atau pencatatan SiLPA sesuai Permendikdasmen Nomor 8 Tahun 2026.
4. ATURAN PENYAJIAN (SANGAT KETAT):
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
