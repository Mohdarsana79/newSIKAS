<?php

namespace App\Services\Ai\Audit;

use App\Config\VariantConfig;
use App\Models\BkuAuditLog;
use App\Models\SekolahProfile;
use App\Models\User;
use App\Services\Ai\Audit\Scanners\BhmAuditScanner;
use App\Services\Ai\Audit\Scanners\BhpAuditScanner;
use App\Services\Ai\Audit\Scanners\BkpBaAuditScanner;
use App\Services\Ai\Audit\Scanners\BkpBankAuditScanner;
use App\Services\Ai\Audit\Scanners\BkpPajakAuditScanner;
use App\Services\Ai\Audit\Scanners\BkpPembantuAuditScanner;
use App\Services\Ai\Audit\Scanners\BkpRegAuditScanner;
use App\Services\Ai\Audit\Scanners\BkpRobAuditScanner;
use App\Services\Ai\Audit\Scanners\BkpUmumAuditScanner;
use App\Services\Ai\Audit\Scanners\RealisasiAuditScanner;
use App\Services\Ai\Audit\Scanners\RekRealisasiAuditScanner;
use App\Services\Ai\DeepSeekService;
use App\Services\BukuKasService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class BkuAuditOrchestrator
{
    protected DeepSeekService $deepSeekService;

    protected BukuKasService $bukuKasService;

    protected array $scanners = [];

    public function __construct(DeepSeekService $deepSeekService, BukuKasService $bukuKasService)
    {
        $this->deepSeekService = $deepSeekService;
        $this->bukuKasService = $bukuKasService;

        // Inisialisasi scanner registry untuk 11 tab
        $this->scanners = [
            'bkp_bank' => new BkpBankAuditScanner($bukuKasService),
            'bkp_pembantu' => new BkpPembantuAuditScanner($bukuKasService),
            'bkp_umum' => new BkpUmumAuditScanner($bukuKasService),
            'bkp_pajak' => new BkpPajakAuditScanner($bukuKasService),
            'rob' => new BkpRobAuditScanner($bukuKasService),
            'reg' => new BkpRegAuditScanner($bukuKasService),
            'ba' => new BkpBaAuditScanner($bukuKasService),
            'realisasi' => new RealisasiAuditScanner($bukuKasService),
            'rek_realisasi' => new RekRealisasiAuditScanner($bukuKasService),
            'bhp' => new BhpAuditScanner($bukuKasService),
            'bhm' => new BhmAuditScanner($bukuKasService),
        ];
    }

    /**
     * Mengambil scanner yang sesuai dengan jenis tab
     */
    public function getScanner(string $tabType): TabAuditScannerInterface
    {
        $key = strtolower(trim($tabType));

        return $this->scanners[$key] ?? $this->scanners['reg'];
    }

    /**
     * Memeriksa apakah scanner terdaftar untuk tab tersebut
     */
    public function hasScanner(string $tabType): bool
    {
        return isset($this->scanners[strtolower(trim($tabType))]);
    }

    /**
     * Mengambil daftar tab yang terdaftar
     */
    public function getRegisteredTabs(): array
    {
        return array_keys($this->scanners);
    }

    /**
     * Mengambil status audit terakhir tersimpan untuk tab dan periode tertentu
     */
    public function getStatus(User $user, string $variant, int $tahun, string $tabType, string $periodeType, string $periodeKey)
    {
        VariantConfig::validateVariant($variant);
        $tabType = strtolower(trim($tabType ?: 'reg'));
        $periodeType = strtolower(trim($periodeType ?: 'bulanan'));
        $periodeKey = strtolower(trim($periodeKey ?: 'januari'));

        return BkuAuditLog::where('user_id', $user->id)
            ->where('variant', $variant)
            ->where('tahun', $tahun)
            ->where('tab_type', $tabType)
            ->where('periode_type', $periodeType)
            ->where('periode_key', $periodeKey)
            ->latest()
            ->first();
    }

    /**
     * Menjalankan pemindaian audit forensik multi-tab dan multi-periode
     */
    public function scan(
        User $user,
        string $variant,
        int $tahun,
        string $tabType = 'reg',
        string $periodeType = 'bulanan',
        string $periodeKey = 'januari',
        bool $forceRefresh = false
    ): array {
        VariantConfig::validateVariant($variant);
        $tabType = strtolower(trim($tabType ?: 'reg'));
        $periodeType = strtolower(trim($periodeType ?: 'bulanan'));
        $periodeKey = strtolower(trim($periodeKey ?: 'januari'));

        $penganggaranClass = VariantConfig::getModelClass('penganggaran', $variant);
        $penganggaran = $penganggaranClass::where('tahun_anggaran', $tahun)->first();

        if (! $penganggaran) {
            return [
                'success' => false,
                'message' => "Data penganggaran untuk tahun {$tahun} ({$variant}) tidak ditemukan.",
            ];
        }

        $scanner = $this->getScanner($tabType);
        $tabTitle = $scanner->getTabTitle();

        // 1. Cek Timestamp BKU Terbaru untuk Penentuan Cache
        $bkuClass = VariantConfig::getModelClass('bku', $variant);
        $bkuFk = VariantConfig::penganggaranFk($variant);

        $latestBkuUpdate = $bkuClass::where($bkuFk, $penganggaran->id)
            ->whereYear('tanggal_transaksi', $tahun)
            ->max('updated_at');

        if (! $forceRefresh) {
            $cachedLog = $this->getStatus($user, $variant, $tahun, $tabType, $periodeType, $periodeKey);

            if ($cachedLog) {
                $cachedAt = $cachedLog->last_bku_updated_at;
                if (! $latestBkuUpdate || ($cachedAt && Carbon::parse($cachedAt)->gte(Carbon::parse($latestBkuUpdate)))) {
                    return [
                        'success' => true,
                        'is_cached' => true,
                        'data' => $cachedLog,
                        'tab_title' => $tabTitle,
                        'message' => "Hasil audit {$tabTitle} dimuat dari riwayat tersimpan (data pembukuan belum berubah).",
                    ];
                }
            }
        }

        // 2. Pemindaian Deterministik Internal
        $preScan = $scanner->scanDeterministic($user, $variant, $tahun, $periodeType, $periodeKey, $penganggaran);
        $systemFindings = $preScan['pre_findings'] ?? [];
        $deterministicScore = $preScan['compliance_score'] ?? $scanner->calculateComplianceScore($systemFindings);
        $rulesChecked = $preScan['rules_checked'] ?? [];
        $periodeLabel = $preScan['summary']['periode_label'] ?? $periodeKey;

        // Siapkan Ringkasan Default Deterministik Sistem
        $dangerCount = count(array_filter($systemFindings, fn ($f) => strtolower($f['severity'] ?? '') === 'danger'));
        $warningCount = count(array_filter($systemFindings, fn ($f) => strtolower($f['severity'] ?? '') === 'warning'));
        $infoCount = count(array_filter($systemFindings, fn ($f) => strtolower($f['severity'] ?? '') === 'info'));

        if (count($systemFindings) === 0) {
            $defaultSummary = "Berdasarkan hasil penelaahan audit forensik pada {$tabTitle} ({$periodeLabel}), pembukuan dinyatakan TERTIB dan MEMATUHI seluruh standar penatausahaan BOSP yang diuji. Tidak ditemukan indikasi ketidakpatuhan, selisih kas, atau anomali transaksi pembukuan. Skor kepatuhan sempurna ditetapkan sebesar 100 dari 100.";
        } else {
            $rincianTemuan = [];
            if ($dangerCount > 0) {
                $rincianTemuan[] = "{$dangerCount} temuan berisiko tinggi (bahaya)";
            }
            if ($warningCount > 0) {
                $rincianTemuan[] = "{$warningCount} catatan peringatan administratif";
            }
            if ($infoCount > 0) {
                $rincianTemuan[] = "{$infoCount} catatan saran penguatan";
            }
            $strRincian = implode(', ', $rincianTemuan);
            $defaultSummary = "Berdasarkan hasil penelaahan audit forensik pada {$tabTitle} ({$periodeLabel}), ditemukan {$strRincian} yang memerlukan tindak lanjut perbaikan sebelum pemeriksaan BPK RI / Inspektorat Daerah. Skor kepatuhan ditetapkan secara deterministik sebesar {$deterministicScore} dari 100.";
        }

        // 3. Periksa Kunci API DeepSeek Pengguna & Panggil AI Narrator
        $apiKey = $user->deepseek_api_key;
        $sekolah = SekolahProfile::first();
        $model = $user->deepseek_model_reasoner ?: 'deepseek-reasoner';

        $finalScore = $deterministicScore; // SELALU TERKUNCI DARI SISTEM (ANTI-FLUKTUASI)
        $finalSummary = $defaultSummary;
        $finalFindings = $systemFindings;
        $reasoningTrace = null;

        if (empty($apiKey)) {
            $reasoningTrace = 'Hasil audit dihitung menggunakan mesin deterministik sistem internal (Kunci API DeepSeek belum dikonfigurasi).';
        } else {
            // Panggil DeepSeek Reasoner sebagai Auditor Narrator / Konsultan
            $reasoningResult = $this->callDeepSeekReasoning(
                $apiKey,
                $model,
                $scanner,
                $preScan,
                $penganggaran,
                $variant,
                $tahun,
                $tabTitle,
                $deterministicScore
            );

            if ($reasoningResult['success']) {
                $aiData = $reasoningResult['data'];
                $reasoningTrace = $reasoningResult['reasoning_trace'] ?? null;

                // 1. Gunakan Executive Summary dari AI jika tersedia
                if (! empty($aiData['executive_summary']) && is_string($aiData['executive_summary'])) {
                    $finalSummary = trim($aiData['executive_summary']);
                }

                // 2. Merge Guard: Perkaya deskripsi & rekomendasi pada temuan sistem yang cocok (1-to-1 match)
                $aiFindings = $aiData['findings'] ?? ($aiData['enriched_findings'] ?? []);
                $aiFindingMap = [];
                if (is_array($aiFindings)) {
                    foreach ($aiFindings as $af) {
                        if (! empty($af['id'])) {
                            $aiFindingMap[$af['id']] = $af;
                        }
                    }
                }

                $mergedFindings = [];
                foreach ($systemFindings as $sf) {
                    $match = $aiFindingMap[$sf['id']] ?? null;
                    $mergedFindings[] = [
                        'id' => $sf['id'],
                        'category' => $sf['category'] ?? 'kepatuhan',
                        'severity' => $sf['severity'] ?? 'warning',
                        'title' => $sf['title'] ?? 'Temuan Audit',
                        'description' => ! empty($match['description']) ? trim($match['description']) : ($sf['description'] ?? '-'),
                        'recommendation' => ! empty($match['recommendation']) ? trim($match['recommendation']) : ($sf['recommendation'] ?? '-'),
                        'transaction_ref' => $sf['transaction_ref'] ?? null,
                        'amount' => $sf['amount'] ?? 0,
                    ];
                }
                $finalFindings = $mergedFindings;
            } else {
                // Fallback jika API AI timeout / error
                $reasoningTrace = 'Fallback narasi deterministik digunakan karena respon AI tidak tersedia: '.($reasoningResult['message'] ?? '');
            }
        }

        // 4. Simpan Log Hasil Audit ke Database (`bku_audit_logs`)
        $bulanAngka = ($periodeType === 'bulanan') ? $this->bukuKasService->convertBulanToNumber(ucfirst($periodeKey)) : null;

        $auditLog = BkuAuditLog::create([
            'user_id' => $user->id,
            'sekolah_id' => $sekolah?->id,
            'variant' => $variant,
            'tab_type' => $tabType,
            'tahun' => $tahun,
            'periode_type' => $periodeType,
            'periode_key' => $periodeKey,
            'bulan' => ($periodeType === 'bulanan') ? ucfirst($periodeKey) : null,
            'bulan_angka' => $bulanAngka,
            'penganggaran_id' => $penganggaran->id,
            'compliance_score' => $finalScore,
            'executive_summary' => $finalSummary,
            'findings' => $finalFindings,
            'rules_checked' => $rulesChecked,
            'last_bku_updated_at' => $latestBkuUpdate ?: now(),
            'metadata' => [
                'tab_type' => $tabType,
                'tab_title' => $tabTitle,
                'periode_label' => $periodeLabel,
                'total_transaksi' => count($preScan['transactions'] ?? []),
                'summary_financial' => $preScan['summary'] ?? [],
                'model_used' => ! empty($apiKey) ? $model : 'deterministic-engine',
                'reasoning_trace' => $reasoningTrace,
            ],
        ]);

        return [
            'success' => true,
            'is_cached' => false,
            'tab_title' => $tabTitle,
            'data' => $auditLog,
            'message' => "Pra-audit forensik {$tabTitle} berhasil diselesaikan.",
        ];
    }

    /**
     * Memanggil DeepSeek Reasoning Engine dengan payload spesifik tab
     */
    protected function callDeepSeekReasoning(
        string $apiKey,
        string $model,
        TabAuditScannerInterface $scanner,
        array $preScan,
        $penganggaran,
        string $variant,
        int $tahun,
        string $tabTitle,
        int $deterministicScore = 100
    ): array {
        $systemPrompt = $scanner->getSystemPrompt($variant, $tahun, $preScan['metadata']['periode_type'], $preScan['metadata']['periode_key']);

        $userPayload = [
            'informasi_sekolah' => [
                'nama_sekolah' => $penganggaran->sekolah?->nama_sekolah ?? 'Satuan Pendidikan',
                'tahun_anggaran' => $tahun,
                'varian_anggaran' => VariantConfig::title($variant),
                'objek_pemeriksaan' => $tabTitle,
                'rentang_periode' => $preScan['summary']['periode_label'] ?? 'Periode Berjalan',
            ],
            'ringkasan_keuangan' => $preScan['summary'],
            'skor_kepatuhan_sistem' => $deterministicScore,
            'temuan_resmi_sistem' => $preScan['pre_findings'],
            'sampel_data_pembukuan' => $preScan['transactions'],
        ];

        $messages = [
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user', 'content' => "Berikut data {$tabTitle} untuk diaudit forensik:\n".json_encode($userPayload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)],
        ];

        $response = $this->deepSeekService->callReasoner($apiKey, $messages, [
            'model' => $model,
            'timeout' => 90,
        ]);

        if (! $response['success']) {
            Log::warning("DeepSeek call failed for tab {$tabTitle}: ".($response['message'] ?? ''));

            return [
                'success' => false,
                'message' => $response['message'] ?? 'Koneksi AI gagal.',
            ];
        }

        $rawContent = trim($response['content'] ?? '');
        if (preg_match('/```(?:json)?\s*([\s\S]*?)\s*```/', $rawContent, $matches)) {
            $rawContent = trim($matches[1]);
        }

        $parsedJson = json_decode($rawContent, true);

        if (! is_array($parsedJson) || (! isset($parsedJson['executive_summary']) && ! isset($parsedJson['findings']) && ! isset($parsedJson['enriched_findings']))) {
            Log::error("Failed to parse DeepSeek JSON for {$tabTitle}: ".$rawContent);

            return [
                'success' => false,
                'message' => 'Format output penalaran AI tidak valid.',
            ];
        }

        return [
            'success' => true,
            'data' => $parsedJson,
            'reasoning_trace' => $response['reasoning_content'] ?? null,
        ];
    }
}
