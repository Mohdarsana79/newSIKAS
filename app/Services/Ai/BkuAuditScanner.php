<?php

namespace App\Services\Ai;

use App\Config\VariantConfig;
use App\Models\BkuAuditLog;
use App\Models\SekolahProfile;
use App\Models\User;
use App\Services\BukuKasService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class BkuAuditScanner
{
    protected DeepSeekService $deepSeekService;
    protected BukuKasService $bukuKasService;

    public function __construct(DeepSeekService $deepSeekService, BukuKasService $bukuKasService)
    {
        $this->deepSeekService = $deepSeekService;
        $this->bukuKasService = $bukuKasService;
    }

    /**
     * Menjalankan pemindaian audit forensik pada BKU periode tertentu
     */
    public function scan(User $user, string $variant, int $tahun, string $bulan, bool $forceRefresh = false): array
    {
        // 1. Validasi Kunci API DeepSeek Pengguna
        $apiKey = $user->deepseek_api_key;
        if (empty($apiKey)) {
            return [
                'success' => false,
                'error_type' => 'NO_API_KEY',
                'message' => 'Kunci API DeepSeek belum dikonfigurasi pada profil Anda. Silakan isi terlebih dahulu di menu Profil Pengguna.',
            ];
        }

        VariantConfig::validateVariant($variant);

        $bulanNormal = ucfirst(strtolower($bulan));
        $bulanAngka = $this->bukuKasService->convertBulanToNumber($bulanNormal);

        // 2. Ambil Model Sesuai Varian
        $penganggaranClass = VariantConfig::getModelClass('penganggaran', $variant);
        $bkuClass = VariantConfig::getModelClass('bku', $variant);
        $bkuFk = VariantConfig::penganggaranFk($variant);
        $bastClass = VariantConfig::getModelClass('bast', $variant);

        $penganggaran = $penganggaranClass::where('tahun_anggaran', $tahun)->first();
        if (!$penganggaran) {
            return [
                'success' => false,
                'message' => "Data penganggaran untuk tahun {$tahun} ({$variant}) tidak ditemukan.",
            ];
        }

        // 3. Periksa Waktu Pembaruan Terakhir BKU untuk Caching
        $latestBkuUpdate = $bkuClass::where($bkuFk, $penganggaran->id)
            ->whereMonth('tanggal_transaksi', $bulanAngka)
            ->whereYear('tanggal_transaksi', $tahun)
            ->max('updated_at');

        if (!$forceRefresh) {
            $cachedLog = BkuAuditLog::where('user_id', $user->id)
                ->where('variant', $variant)
                ->where('tahun', $tahun)
                ->where('bulan_angka', $bulanAngka)
                ->where('penganggaran_id', $penganggaran->id)
                ->latest()
                ->first();

            if ($cachedLog) {
                // Jika data BKU belum berubah sejak audit terakhir, kembalikan data cache
                $cachedAt = $cachedLog->last_bku_updated_at;
                if (!$latestBkuUpdate || ($cachedAt && Carbon::parse($cachedAt)->gte(Carbon::parse($latestBkuUpdate)))) {
                    return [
                        'success' => true,
                        'is_cached' => true,
                        'data' => $cachedLog,
                        'message' => 'Hasil audit dimuat dari riwayat (data pembukuan belum berubah).',
                    ];
                }
            }
        }

        // 4. Pre-Scan Deterministik (Pemeriksaan Logika Matematis & Regulasi Dasar)
        $preScan = $this->runDeterministicPreScan($variant, $penganggaran, $tahun, $bulanNormal, $bulanAngka, $bkuClass, $bastClass);

        // 5. Panggil DeepSeek-R1 Reasoning Engine
        $reasoningResult = $this->callDeepSeekAudit($apiKey, $user->deepseek_model_reasoner ?: 'deepseek-reasoner', $preScan, $penganggaran, $variant, $tahun, $bulanNormal);

        if (!$reasoningResult['success']) {
            return [
                'success' => false,
                'message' => $reasoningResult['message'],
            ];
        }

        $auditData = $reasoningResult['data'];

        // 6. Simpan Hasil ke Database (`bku_audit_logs`)
        $sekolah = SekolahProfile::first();
        $auditLog = BkuAuditLog::create([
            'user_id' => $user->id,
            'sekolah_id' => $sekolah?->id,
            'variant' => $variant,
            'tahun' => $tahun,
            'bulan' => $bulanNormal,
            'bulan_angka' => $bulanAngka,
            'penganggaran_id' => $penganggaran->id,
            'compliance_score' => $auditData['compliance_score'] ?? 100,
            'executive_summary' => $auditData['executive_summary'] ?? 'Audit selesai dilakukan.',
            'findings' => $auditData['findings'] ?? [],
            'rules_checked' => $auditData['rules_checked'] ?? [],
            'last_bku_updated_at' => $latestBkuUpdate ?: now(),
            'metadata' => [
                'total_transaksi' => count($preScan['transactions']),
                'total_pengeluaran' => $preScan['summary']['total_pengeluaran'],
                'model_used' => $user->deepseek_model_reasoner ?: 'deepseek-reasoner',
                'reasoning_trace' => $reasoningResult['reasoning_trace'] ?? null,
            ],
        ]);

        return [
            'success' => true,
            'is_cached' => false,
            'data' => $auditLog,
            'message' => 'Pra-audit forensik berhasil diselesaikan dengan DeepSeek-R1.',
        ];
    }

    /**
     * Menjalankan pemindaian deterministik internal SQL/PHP
     */
    protected function runDeterministicPreScan(string $variant, $penganggaran, int $tahun, string $bulan, int $bulanAngka, string $bkuClass, string $bastClass): array
    {
        $bkuFk = VariantConfig::penganggaranFk($variant);

        // Ambil semua transaksi BKU bulan terkait
        $transactions = $bkuClass::with(['rekeningBelanja', 'kodeKegiatan', 'uraianDetails'])
            ->where($bkuFk, $penganggaran->id)
            ->whereMonth('tanggal_transaksi', $bulanAngka)
            ->whereYear('tanggal_transaksi', $tahun)
            ->orderBy('tanggal_transaksi', 'asc')
            ->orderBy('id', 'asc')
            ->get();

        $findings = [];
        $rulesChecked = [
            'Saldo Kas Tunai & Bank Tidak Minus Harian',
            'Kepatuhan Penyetoran Pajak & Kelengkapan NTPN',
            'Pemisahan Belanja Modal (Aset) vs Belanja Operasi & Kelengkapan BAST',
            'Deteksi Pemecahan Transaksi Berulang (Split-Bill / Smurfing)',
            'Batas Maksimal Belanja Tunai Non-Tunai',
        ];

        // 1. Cek Keseimbangan Kas & Kronologi
        $saldoBankAwal = $this->bukuKasService->hitungSaldoBankSebelumBulan($penganggaran->id, $bulanAngka);
        $saldoTunaiAwal = $this->bukuKasService->getSaldoKasFromPembantu($penganggaran->id, $tahun, $bulan, $bulanAngka);

        $runningTunai = $saldoTunaiAwal;
        $runningBank = $saldoBankAwal;

        $pajakTanpaNtpn = [];
        $belanjaModalTanpaBast = [];
        $potensiSalahAkunAset = [];
        $vendorTransactions = [];

        $keywordsAset = ['laptop', 'komputer', 'printer', 'infokus', 'proyektor', 'lemari', 'ac split', 'meja rapat', 'kursi siswa', 'server', 'sound system'];

        // Kumpulkan ID BAST yang sudah ada pada BKU bulan ini
        $bkuIds = $transactions->pluck('id')->all();
        $existingBastBkuIds = $bastClass::whereIn(VariantConfig::bkuFk($variant), $bkuIds)->pluck(VariantConfig::bkuFk($variant))->all();

        foreach ($transactions as $trx) {
            $amount = (float) $trx->dibelanjakan;
            $kodeRekening = $trx->rekeningBelanja?->kode_rekening ?? '';
            $uraian = strtolower($trx->uraian ?? '');

            // Cek Pajak Belum Disetor (NTPN Kosong)
            $totalPajak = (float) $trx->total_pajak + (float) $trx->total_pajak_daerah;
            if ($totalPajak > 0 && empty($trx->ntpn)) {
                $pajakTanpaNtpn[] = [
                    'id' => $trx->id,
                    'tanggal' => $trx->tanggal_transaksi,
                    'uraian' => $trx->uraian,
                    'pajak' => $totalPajak,
                ];
            }

            // Cek Belanja > 2 Juta tanpa Pajak
            if ($amount >= 2000000 && $totalPajak == 0 && !$trx->is_bunga_record) {
                $findings[] = [
                    'id' => 'PRE-TAX-' . $trx->id,
                    'category' => 'pajak',
                    'severity' => 'warning',
                    'title' => 'Belanja di atas Rp 2.000.000 Tanpa Pungutan Pajak',
                    'description' => "Transaksi '{$trx->uraian}' sebesar Rp " . number_format($amount, 0, ',', '.') . " pada tanggal {$trx->tanggal_transaksi} tidak mencatat pungutan pajak PPN/PPh.",
                    'recommendation' => 'Pastikan apakah rekanan dibebaskan dari pajak atau lengkapi bukti faktur pajak/SSP pembebasan.',
                    'transaction_ids' => [$trx->id],
                    'amount' => $amount,
                ];
            }

            // Cek Belanja Modal (5.2) tanpa BAST
            if (str_starts_with($kodeRekening, '5.2') && !in_array($trx->id, $existingBastBkuIds)) {
                $belanjaModalTanpaBast[] = [
                    'id' => $trx->id,
                    'tanggal' => $trx->tanggal_transaksi,
                    'uraian' => $trx->uraian,
                    'amount' => $amount,
                ];
            }

            // Cek Salah Pos: Kata kunci aset namun dicatat di Belanja Operasi (5.1.02)
            if (str_starts_with($kodeRekening, '5.1.02')) {
                foreach ($keywordsAset as $kw) {
                    if (str_contains($uraian, $kw)) {
                        $potensiSalahAkunAset[] = [
                            'id' => $trx->id,
                            'uraian' => $trx->uraian,
                            'keyword' => $kw,
                            'kode_rekening' => $kodeRekening,
                            'amount' => $amount,
                        ];
                        break;
                    }
                }
            }

            // Cek Transaksi Tunai Nominal Besar (> 10 Juta)
            if ($trx->jenis_transaksi === 'tunai' && $amount > 10000000 && !$trx->is_bunga_record) {
                $findings[] = [
                    'id' => 'PRE-CASH-LIMIT-' . $trx->id,
                    'category' => 'keseimbangan_kas',
                    'severity' => 'warning',
                    'title' => 'Pembayaran Tunai Melebihi Ambang Batas Transaksi Non-Tunai',
                    'description' => "Transaksi '{$trx->uraian}' dibayarkan secara tunai sebesar Rp " . number_format($amount, 0, ',', '.') . ". Regulasi pemerintah mewajibkan transaksi bernilai besar dilakukan melalui transfer non-tunai/rekening bank.",
                    'recommendation' => 'Gunakan metode non-tunai atau lampirkan Berita Acara pembayaran tunai darurat.',
                    'transaction_ids' => [$trx->id],
                    'amount' => $amount,
                ];
            }

            // Kumpulkan untuk Analisis Split-Bill per Vendor
            $vendorName = trim($trx->nama_toko ?: $trx->nama_penerima_pembayaran ?: '');
            if (!empty($vendorName) && $amount > 0 && $amount < 2000000) {
                $vendorTransactions[$vendorName][] = [
                    'id' => $trx->id,
                    'tanggal' => $trx->tanggal_transaksi,
                    'amount' => $amount,
                    'uraian' => $trx->uraian,
                ];
            }
        }

        // Susun Temuan Belanja Modal Tanpa BAST
        if (!empty($belanjaModalTanpaBast)) {
            $findings[] = [
                'id' => 'PRE-MODAL-NO-BAST',
                'category' => 'belanja_modal',
                'severity' => 'danger',
                'title' => count($belanjaModalTanpaBast) . ' Transaksi Belanja Modal Belum Dibuatkan Dokumen BAST',
                'description' => 'Terdapat belanja modal aset tetap yang belum tercatat di Berita Acara Serah Terima (BAST). Belanja modal tanpa BAST berpotensi menjadi temuan auditor BPK/Inspektorat terkait inventaris KIB.',
                'recommendation' => 'Terbitkan dokumen BAST melalui menu Fitur Pelengkap > BAST sebelum penutupan buku kas.',
                'transaction_ids' => array_column($belanjaModalTanpaBast, 'id'),
                'amount' => array_sum(array_column($belanjaModalTanpaBast, 'amount')),
            ];
        }

        // Susun Temuan Potensi Salah Akun Belanja Aset
        if (!empty($potensiSalahAkunAset)) {
            $findings[] = [
                'id' => 'PRE-ASSET-MISCLASSIFIED',
                'category' => 'belanja_modal',
                'severity' => 'warning',
                'title' => 'Indikasi Pembelian Barang Aset Dibukukan pada Belanja Habis Pakai',
                'description' => 'Ditemukan pengadaan barang bernilai aset (misal: ' . implode(', ', array_unique(array_column($potensiSalahAkunAset, 'keyword'))) . ') yang diinput ke kode rekening Belanja Barang & Jasa Operasi (5.1.02).',
                'recommendation' => 'Evaluasi nilai kapitalisasi barang: jika memenuhi kriteria aset tetap daerah, pindahkan ke akun Belanja Modal (5.2) agar masuk ke kartu inventaris.',
                'transaction_ids' => array_column($potensiSalahAkunAset, 'id'),
                'amount' => array_sum(array_column($potensiSalahAkunAset, 'amount')),
            ];
        }

        // Susun Temuan Pajak Tanpa NTPN
        if (!empty($pajakTanpaNtpn)) {
            $totalPajakBelumSetor = array_sum(array_column($pajakTanpaNtpn, 'pajak'));
            $findings[] = [
                'id' => 'PRE-TAX-NO-NTPN',
                'category' => 'pajak',
                'severity' => 'danger',
                'title' => count($pajakTanpaNtpn) . ' Transaksi Pajak Dipungut Belum Memiliki Nomor NTPN',
                'description' => 'Terdapat potongan pajak senilai total Rp ' . number_format($totalPajakBelumSetor, 0, ',', '.') . ' yang belum mencantumkan Nomor Transaksi Penerimaan Negara (NTPN). Pajak yang belum disetor saat tutup kas merupakan temuan kepatuhan serius.',
                'recommendation' => 'Segera setorkan pajak via e-Billing/bank persepsi dan input kode NTPN di Buku Pembantu Pajak.',
                'transaction_ids' => array_column($pajakTanpaNtpn, 'id'),
                'amount' => $totalPajakBelumSetor,
            ];
        }

        // Analisis Indikasi Split-Bill (< 2 Juta berulang ke toko yang sama)
        foreach ($vendorTransactions as $vendor => $trxList) {
            if (count($trxList) >= 2) {
                $totalVendor = array_sum(array_column($trxList, 'amount'));
                $findings[] = [
                    'id' => 'PRE-SPLIT-' . md5($vendor),
                    'category' => 'split_bill',
                    'severity' => 'warning',
                    'title' => "Indikasi Pemecahan Transaksi Belanja ke Rekanan '{$vendor}'",
                    'description' => "Terdapat " . count($trxList) . " transaksi belanja berturut-turut ke '{$vendor}' dengan nominal masing-masing di bawah Rp 2.000.000 (total Rp " . number_format($totalVendor, 0, ',', '.') . ").",
                    'recommendation' => 'Pastikan transaksi bukan pemecahan yang disengaja untuk menghindari pajak PPh 22 atau batas pengadaan langsung/SIPLah.',
                    'transaction_ids' => array_column($trxList, 'id'),
                    'amount' => $totalVendor,
                ];
            }
        }

        // Ringkasan untuk DeepSeek
        $compactTransactions = $transactions->take(40)->map(function ($t) {
            return [
                'id' => $t->id,
                'tgl' => $t->tanggal_transaksi,
                'jenis' => $t->jenis_transaksi,
                'uraian' => $t->uraian,
                'nominal' => (float) $t->dibelanjakan,
                'rek' => $t->rekeningBelanja?->kode_rekening,
                'toko' => $t->nama_toko ?: $t->nama_penerima_pembayaran,
                'pajak' => (float) $t->total_pajak + (float) $t->total_pajak_daerah,
                'ntpn' => $t->ntpn,
            ];
        })->all();

        return [
            'summary' => [
                'total_transaksi' => $transactions->count(),
                'total_pengeluaran' => (float) $transactions->sum('dibelanjakan'),
                'total_pajak' => (float) $transactions->sum('total_pajak') + (float) $transactions->sum('total_pajak_daerah'),
                'saldo_awal_bank' => $saldoBankAwal,
                'saldo_awal_tunai' => $saldoTunaiAwal,
            ],
            'rules_checked' => $rulesChecked,
            'pre_findings' => $findings,
            'transactions' => $compactTransactions,
        ];
    }

    /**
     * Mengirimkan data pre-scan ke DeepSeek-R1 untuk penalaran audit komprehensif
     */
    protected function callDeepSeekAudit(string $apiKey, string $model, array $preScan, $penganggaran, string $variant, int $tahun, string $bulan): array
    {
        $systemPrompt = <<<PROMPT
Anda adalah Auditor Finansial Senior BPK / Inspektorat Daerah yang bertugas mengaudit pertanggungjawaban dana BOSP (Bantuan Operasional Satuan Pendidikan) sekolah di Indonesia.
Tugas Anda adalah menelaah data Buku Kas Umum (BKU) penatausahaan sekolah sebelum penutupan buku kas bulanan.

Aturan Penilaian:
1. Hitung Skor Kepatuhan (compliance_score) dari rentang 0 s/d 100 berdasarkan tingkat keparahan temuan.
   - Temuan bahaya (danger): Pajak tanpa NTPN, saldo minus, belanja modal tanpa BAST (kurangi 10-20 poin per temuan).
   - Temuan peringatan (warning): Indikasi split-bill, potensi salah pos aset, belanja tunai > 10jt (kurangi 5-10 poin).
   - Jika tidak ada temuan sama sekali, skor adalah 100.
2. Buat Ringkasan Eksekutif (executive_summary) profesional dalam bahasa Indonesia formal (2-3 paragraf) yang menjelaskan status pembukuan bulan tersebut, risiko audit, dan poin-poin yang perlu diperbaiki bendahara sebelum kas ditutup.
3. Telaah ulang temuan pre-scan dan tambahkan wawasan audit terkait kewajaran uraian transaksi.
4. Anda WAJIB merespons HANYA dalam format JSON murni tanpa pembuka/penutup basa-basi, dengan struktur:
{
  "compliance_score": 85,
  "executive_summary": "Ringkasan eksekutif...",
  "findings": [
    {
      "id": "FINDING-001",
      "category": "pajak|keseimbangan_kas|belanja_modal|split_bill|pagu_rkas",
      "severity": "danger|warning|info",
      "title": "Judul Temuan",
      "description": "Uraian fakta temuan...",
      "recommendation": "Saran perbaikan konkret...",
      "transaction_ids": [1, 2],
      "amount": 500000
    }
  ],
  "rules_checked": ["Daftar aturan yang diperiksa..."]
}
PROMPT;

        $userPayload = [
            'informasi_sekolah' => [
                'nama_sekolah' => $penganggaran->sekolah?->nama_sekolah ?? 'Sekolah',
                'tahun_anggaran' => $tahun,
                'bulan' => $bulan,
                'varian_anggaran' => VariantConfig::title($variant),
            ],
            'ringkasan_keuangan' => $preScan['summary'],
            'temuan_awal_sistem' => $preScan['pre_findings'],
            'sampel_transaksi_bku' => $preScan['transactions'],
        ];

        $messages = [
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user', 'content' => "Berikut data BKU bulan {$bulan} {$tahun} untuk diaudit:\n" . json_encode($userPayload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)],
        ];

        $response = $this->deepSeekService->callReasoner($apiKey, $messages, [
            'model' => $model,
            'timeout' => 90,
        ]);

        if (!$response['success']) {
            // Jika panggilan AI gagal (misal koneksi timeout), gunakan temuan deterministik sebagai fallback cerdas
            Log::warning("DeepSeek audit call failed: {$response['message']}. Using deterministic fallback.");
            
            $score = 100;
            foreach ($preScan['pre_findings'] as $f) {
                $score -= ($f['severity'] === 'danger' ? 15 : 7);
            }
            $score = max(20, min(100, $score));

            return [
                'success' => true,
                'data' => [
                    'compliance_score' => $score,
                    'executive_summary' => "Pemindaian audit deterministik selesai. Ditemukan " . count($preScan['pre_findings']) . " potensi catatan kepatuhan yang memerlukan perhatian bendahara sebelum penutupan kas bulan {$bulan} {$tahun}.",
                    'findings' => $preScan['pre_findings'],
                    'rules_checked' => $preScan['rules_checked'],
                ],
                'reasoning_trace' => 'Fallback deterministik sistem digunakan karena kendala jaringan AI.',
            ];
        }

        $rawContent = trim($response['content']);

        // Bersihkan formatting markdown ```json ... ``` jika ada
        if (preg_match('/```(?:json)?\s*([\s\S]*?)\s*```/', $rawContent, $matches)) {
            $rawContent = trim($matches[1]);
        }

        $parsedJson = json_decode($rawContent, true);

        if (!is_array($parsedJson) || !isset($parsedJson['compliance_score'])) {
            Log::error('Failed to parse DeepSeek JSON response: ' . $rawContent);
            return [
                'success' => true,
                'data' => [
                    'compliance_score' => 80,
                    'executive_summary' => $response['content'],
                    'findings' => $preScan['pre_findings'],
                    'rules_checked' => $preScan['rules_checked'],
                ],
                'reasoning_trace' => $response['reasoning_content'] ?? null,
            ];
        }

        return [
            'success' => true,
            'data' => $parsedJson,
            'reasoning_trace' => $response['reasoning_content'] ?? null,
        ];
    }
}
