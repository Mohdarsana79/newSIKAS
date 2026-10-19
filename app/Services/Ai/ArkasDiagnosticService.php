<?php

namespace App\Services\Ai;

use App\Config\VariantConfig;
use App\Models\RefBarang;
use App\Models\SekolahProfile;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\Process\Process;

class ArkasDiagnosticService
{
    protected DeepSeekService $deepSeekService;

    public function __construct(DeepSeekService $deepSeekService)
    {
        $this->deepSeekService = $deepSeekService;
    }

    /**
     * Menjalankan diagnosa sistem komprehensif antara ARKAS dan SIKAS.
     */
    public function runComprehensiveDiagnostic(User $user, string $variant, int $tahun): array
    {
        $sumberDanaId = $this->getArkasSumberDanaId($variant);
        $manualPath = env('ARKAS_DB_PATH', '');

        // 1. Eksekusi scanner ARKAS
        $arkasScan = $this->runArkasEngineScanner($tahun, $sumberDanaId, $manualPath);
        if (isset($arkasScan['status']) && $arkasScan['status'] === 'error') {
            return [
                'overall_status' => 'ERROR_CONNECTIVITY',
                'headline' => 'Koneksi ke Database ARKAS Gagal',
                'connection_health' => [
                    'is_connected' => false,
                    'db_path' => $manualPath ?: 'Auto-detect (Tidak Ditemukan)',
                    'notes' => $arkasScan['message'] ?? 'Database arkas.db tidak dapat diakses atau gagal didekripsi.',
                    'error_type' => $arkasScan['error_type'] ?? 'UNKNOWN_ERROR',
                ],
                'diff_summary' => null,
                'ai_analysis' => [
                    'headline' => 'Koneksi Database Desktop ARKAS Terputus',
                    'root_causes' => [
                        'File arkas.db mungkin berada di folder pengguna lain atau aplikasi ARKAS belum terpasang di komputer ini.',
                        'Jika ARKAS sedang terbuka, kemungkinan file terkunci (file lock) oleh proses desktop.',
                    ],
                    'overwrite_risks' => [],
                    'action_checklist' => [
                        [
                            'step' => 1,
                            'system' => 'WINDOWS',
                            'action' => 'Tutup aplikasi ARKAS desktop jika sedang dibuka.',
                        ],
                        [
                            'step' => 2,
                            'system' => 'SIKAS',
                            'action' => 'Buka menu Pengaturan Path Arkas dan sesuaikan lokasi file arkas.db Anda.',
                        ],
                    ],
                ],
            ];
        }

        // 2. Kumpulkan data SIKAS
        $sikasData = $this->gatherSikasData($variant, $tahun);

        // 3. Hitung perbandingan diff
        $diff = $this->computeDiff($arkasScan, $sikasData, $variant, $tahun);

        // 4. Analisis AI (DeepSeek-V3)
        $aiAnalysis = $this->generateAiDiagnostic($user, $diff, 'comprehensive');

        return [
            'overall_status' => $aiAnalysis['overall_status'] ?? $diff['heuristic_status'],
            'headline' => $aiAnalysis['headline'] ?? $diff['heuristic_headline'],
            'connection_health' => $arkasScan['connection'] ?? [
                'is_connected' => true,
                'db_path' => 'arkas.db',
            ],
            'tahun' => $tahun,
            'variant' => $variant,
            'variant_title' => VariantConfig::title($variant),
            'diff_summary' => $diff,
            'ai_analysis' => $aiAnalysis,
        ];
    }

    /**
     * Menjalankan diagnosa kontekstual tertarget (misal saat modal Tarik BKU atau Tarik RKAS dibuka).
     */
    public function runContextualDiagnostic(User $user, string $variant, int $tahun, string $scope, array $context): array
    {
        $sumberDanaId = $this->getArkasSumberDanaId($variant);
        $manualPath = env('ARKAS_DB_PATH', '');

        $arkasScan = $this->runArkasEngineScanner($tahun, $sumberDanaId, $manualPath);
        if (isset($arkasScan['status']) && $arkasScan['status'] === 'error') {
            return [
                'overall_status' => 'ERROR_CONNECTIVITY',
                'headline' => 'Koneksi ke Database ARKAS Gagal',
                'connection_health' => [
                    'is_connected' => false,
                    'notes' => $arkasScan['message'] ?? 'Database arkas.db tidak dapat diakses.',
                ],
                'scope' => $scope,
                'context' => $context,
                'ai_analysis' => [
                    'headline' => 'Database ARKAS Tidak Dapat Dibaca',
                    'root_causes' => [$arkasScan['message'] ?? 'File database tidak ditemukan atau terkunci.'],
                    'overwrite_risks' => [],
                    'action_checklist' => [
                        ['step' => 1, 'system' => 'WINDOWS', 'action' => 'Pastikan aplikasi ARKAS tidak sedang terkunci.'],
                    ],
                ],
            ];
        }

        $sikasData = $this->gatherSikasData($variant, $tahun);
        $diff = $this->computeDiff($arkasScan, $sikasData, $variant, $tahun);

        // Filter diff khusus scope tertentu
        $contextualDiff = [
            'scope' => $scope,
            'context' => $context,
            'connection' => $arkasScan['connection'] ?? null,
            'full_diff' => $diff,
        ];

        if ($scope === 'bku_month') {
            $bulanAngka = (int) ($context['bulan_angka'] ?? 1);
            $monthDiff = collect($diff['months'])->firstWhere('bulan', $bulanAngka);
            $contextualDiff['target_month'] = $monthDiff;
        }

        $aiAnalysis = $this->generateAiDiagnostic($user, $contextualDiff, $scope);

        return [
            'overall_status' => $aiAnalysis['overall_status'] ?? $diff['heuristic_status'],
            'headline' => $aiAnalysis['headline'] ?? $diff['heuristic_headline'],
            'scope' => $scope,
            'context' => $context,
            'diff_summary' => $contextualDiff,
            'ai_analysis' => $aiAnalysis,
        ];
    }

    /**
     * Memanggil skrip python diagnose_arkas.py
     */
    protected function runArkasEngineScanner(int $tahun, int $sumberDanaId, ?string $manualPath = null): array
    {
        $pythonPath = storage_path('app/arkas_engine/python.exe');
        $scriptPath = storage_path('app/arkas_engine/diagnose_arkas.py');

        if (! file_exists($pythonPath) || ! file_exists($scriptPath)) {
            return [
                'status' => 'error',
                'error_type' => 'ENGINE_NOT_FOUND',
                'message' => 'Engine python ARKAS tidak ditemukan di direktori storage/app/arkas_engine.',
            ];
        }

        $env = $_SERVER;
        unset($env['OPENSSL_CONF']);

        $appdata = $env['APPDATA'] ?? null;
        $userprofile = $env['USERPROFILE'] ?? null;

        if (empty($appdata)) {
            $appdata = trim(shell_exec("powershell -Command \"[Environment]::GetFolderPath('ApplicationData')\""));
        }
        if (empty($userprofile)) {
            $userprofile = trim(shell_exec("powershell -Command \"[Environment]::GetFolderPath('UserProfile')\""));
        }
        if (empty($userprofile) && ! empty($appdata)) {
            $userprofile = dirname(dirname($appdata));
        }
        if (empty($appdata) && ! empty($userprofile)) {
            $appdata = $userprofile.'\\AppData\\Roaming';
        }

        $env['SystemRoot'] = $env['SystemRoot'] ?? 'C:\\Windows';
        $env['SystemDrive'] = $env['SystemDrive'] ?? 'C:';
        $env['USERPROFILE'] = $userprofile ?: ($env['USERPROFILE'] ?? 'C:\\Users\\Digitalisasi');
        $env['APPDATA'] = $appdata ?: ($env['APPDATA'] ?? 'C:\\Users\\Digitalisasi\\AppData\\Roaming');
        $env['LOCALAPPDATA'] = $env['LOCALAPPDATA'] ?? ($userprofile ? $userprofile.'\\AppData\\Local' : '');
        $env['TEMP'] = $env['TEMP'] ?? ($userprofile ? $userprofile.'\\AppData\\Local\\Temp' : '');
        $env['TMP'] = $env['TMP'] ?? $env['TEMP'];

        $command = [$pythonPath, $scriptPath, (string) $tahun, (string) $sumberDanaId];
        if (! empty($manualPath)) {
            $cleanPath = str_replace('\\', '/', trim($manualPath, '"\' '));
            $command[] = $cleanPath;
        }

        $process = new Process($command, null, $env);
        $process->setTimeout(60);
        $process->run();

        if (! $process->isSuccessful()) {
            Log::error('Arkas diagnostic script failed: '.$process->getErrorOutput());
            return [
                'status' => 'error',
                'error_type' => 'PROCESS_EXECUTION_FAILED',
                'message' => 'Gagal menjalankan proses Python: ' . $process->getErrorOutput(),
            ];
        }

        $output = trim($process->getOutput());
        $decoded = json_decode($output, true);

        if (! $decoded) {
            Log::error('Arkas diagnostic script returned non-JSON: '.$output);
            return [
                'status' => 'error',
                'error_type' => 'INVALID_JSON_OUTPUT',
                'message' => 'Format keluaran dari engine ARKAS tidak valid.',
            ];
        }

        return $decoded;
    }

    /**
     * Mengumpulkan data riil newSIKAS dari PostgreSQL.
     */
    protected function gatherSikasData(string $variant, int $tahun): array
    {
        $penganggaranClass = VariantConfig::getModelClass('penganggaran', $variant);
        $rkasClass = VariantConfig::getModelClass('rkas', $variant);
        $bkuClass = VariantConfig::getModelClass('bku', $variant);
        $penerimaanClass = VariantConfig::getModelClass('penerimaan_dana', $variant);
        $penarikanClass = VariantConfig::getModelClass('penarikan_tunai', $variant);
        $setorClass = VariantConfig::getModelClass('setor_tunai', $variant);
        $fk = VariantConfig::penganggaranFk($variant);

        $sekolah = SekolahProfile::query()->first(['*']);
        $penganggaran = $penganggaranClass::where('tahun_anggaran', $tahun)->first();

        $rkasCount = 0;
        $paguSikas = 0.0;
        $monthsData = [];

        if ($penganggaran) {
            $paguSikas = (float) ($penganggaran->total_anggaran ?? $penganggaran->pendapatan ?? 0);
            $rkasCount = $rkasClass::where($fk, $penganggaran->id)->count();

            for ($m = 1; $m <= 12; $m++) {
                // Belanja
                $belanjaQuery = $bkuClass::where($fk, $penganggaran->id)
                    ->whereYear('tanggal_transaksi', $tahun)
                    ->whereMonth('tanggal_transaksi', $m)
                    ->where('is_bunga_record', false);

                $belanjaCount = (clone $belanjaQuery)->count();
                $belanjaNominal = (float) (clone $belanjaQuery)->sum('nominal_transaksi');

                // Penerimaan
                $terimaQuery = $penerimaanClass::where($fk, $penganggaran->id)
                    ->whereYear('tanggal_terima', $tahun)
                    ->whereMonth('tanggal_terima', $m);
                $terimaCount = (clone $terimaQuery)->count();
                $terimaNominal = (float) (clone $terimaQuery)->sum('jumlah_dana');

                // Penarikan
                $tarikQuery = $penarikanClass::where($fk, $penganggaran->id)
                    ->whereYear('tanggal_penarikan', $tahun)
                    ->whereMonth('tanggal_penarikan', $m);
                $tarikCount = (clone $tarikQuery)->count();
                $tarikNominal = (float) (clone $tarikQuery)->sum('jumlah_penarikan');

                // Setor
                $setorQuery = $setorClass::where($fk, $penganggaran->id)
                    ->whereYear('tanggal_setor', $tahun)
                    ->whereMonth('tanggal_setor', $m);
                $setorCount = (clone $setorQuery)->count();
                $setorNominal = (float) (clone $setorQuery)->sum('jumlah_setor');

                $monthsData[$m] = [
                    'bulan' => $m,
                    'belanja_count' => $belanjaCount,
                    'belanja_nominal' => $belanjaNominal,
                    'penerimaan_count' => $terimaCount,
                    'penerimaan_nominal' => $terimaNominal,
                    'penarikan_count' => $tarikCount,
                    'penarikan_nominal' => $tarikNominal,
                    'setor_count' => $setorCount,
                    'setor_nominal' => $setorNominal,
                    'total_transaksi' => $belanjaCount + $terimaCount + $tarikCount + $setorCount,
                ];
            }
        }

        $refBarangTotal = RefBarang::where('tahun', $tahun)->count();

        return [
            'sekolah' => [
                'npsn' => $sekolah->npsn ?? null,
                'nama_sekolah' => $sekolah->nama_sekolah ?? null,
            ],
            'penganggaran_id' => $penganggaran->id ?? null,
            'pagu' => $paguSikas,
            'rkas_count' => $rkasCount,
            'months' => $monthsData,
            'ref_barang_total' => $refBarangTotal,
        ];
    }

    /**
     * Menghitung diff terperinci antara data ARKAS dan SIKAS.
     */
    protected function computeDiff(array $arkas, array $sikas, string $variant, int $tahun): array
    {
        $rkasArkas = $arkas['rkas']['murni'] ?? [];
        $paguArkas = (float) ($rkasArkas['pagu'] ?? 0);
        $paguSikas = (float) ($sikas['pagu'] ?? 0);
        $paguDiff = $paguArkas - $paguSikas;

        $hasConflict = false;
        $hasWarning = false;
        $differingMonthsCount = 0;
        $totalArkasBelanja = 0.0;
        $totalSikasBelanja = 0.0;

        $monthComparisons = [];
        $arkasMonths = collect($arkas['bku_monthly'] ?? [])->keyBy('bulan');

        for ($m = 1; $m <= 12; $m++) {
            $aM = $arkasMonths->get($m) ?? [
                'bulan' => $m,
                'nama_bulan' => $this->getNamaBulan($m),
                'belanja_count' => 0,
                'belanja_nominal' => 0.0,
                'penerimaan_count' => 0,
                'penerimaan_nominal' => 0.0,
                'is_closed' => false,
            ];
            $sM = $sikas['months'][$m] ?? [
                'bulan' => $m,
                'belanja_count' => 0,
                'belanja_nominal' => 0.0,
                'penerimaan_count' => 0,
                'penerimaan_nominal' => 0.0,
                'total_transaksi' => 0,
            ];

            $belanjaNomDiff = (float) $aM['belanja_nominal'] - (float) $sM['belanja_nominal'];
            $belanjaCntDiff = (int) $aM['belanja_count'] - (int) $sM['belanja_count'];

            $totalArkasBelanja += (float) $aM['belanja_nominal'];
            $totalSikasBelanja += (float) $sM['belanja_nominal'];

            $hasDiff = abs($belanjaNomDiff) > 1 || $belanjaCntDiff !== 0;
            if ($hasDiff) {
                $differingMonthsCount++;
            }

            // Cek potensi konflik overwrite
            $overwriteRisk = false;
            $overwriteDescription = null;
            if ($sM['total_transaksi'] > 0 && ((float) $aM['belanja_nominal'] > 0 || (int) $aM['belanja_count'] > 0)) {
                $overwriteRisk = true;
                $overwriteDescription = "newSIKAS memiliki {$sM['total_transaksi']} transaksi tercatat. Menarik data ARKAS akan menimpa seluruh transaksi bulan ini.";
            }

            // Warning jika ARKAS belum tutup buku tapi ada transaksi
            $draftWarning = false;
            if (! empty($aM['belanja_count']) && ! $aM['is_closed']) {
                $draftWarning = true;
                $hasWarning = true;
            }

            if ($overwriteRisk && $hasDiff) {
                $hasConflict = true;
            }

            $monthComparisons[] = [
                'bulan' => $m,
                'nama_bulan' => $aM['nama_bulan'] ?? $this->getNamaBulan($m),
                'arkas' => [
                    'belanja_nominal' => (float) $aM['belanja_nominal'],
                    'belanja_count' => (int) $aM['belanja_count'],
                    'penerimaan_nominal' => (float) $aM['penerimaan_nominal'],
                    'penerimaan_count' => (int) $aM['penerimaan_count'],
                    'is_closed' => (bool) $aM['is_closed'],
                    'tanggal_finish' => $aM['tanggal_finish'] ?? null,
                ],
                'sikas' => [
                    'belanja_nominal' => (float) $sM['belanja_nominal'],
                    'belanja_count' => (int) $sM['belanja_count'],
                    'penerimaan_nominal' => (float) $sM['penerimaan_nominal'],
                    'penerimaan_count' => (int) $sM['penerimaan_count'],
                    'total_transaksi' => (int) $sM['total_transaksi'],
                ],
                'diff' => [
                    'belanja_nominal' => $belanjaNomDiff,
                    'belanja_count' => $belanjaCntDiff,
                    'has_difference' => $hasDiff,
                ],
                'overwrite_risk' => $overwriteRisk,
                'overwrite_description' => $overwriteDescription,
                'draft_warning' => $draftWarning,
            ];
        }

        // Ref Barang diff
        $refBarangArkas = (int) ($arkas['ref_barang_total'] ?? 0);
        $refBarangSikas = (int) ($sikas['ref_barang_total'] ?? 0);
        $refBarangDiff = $refBarangArkas - $refBarangSikas;

        // Tentukan heuristic status
        $heuristicStatus = 'HEALTHY';
        $heuristicHeadline = 'Seluruh Data ARKAS dan SIKAS Selaras';

        if (abs($paguDiff) > 1 || $hasConflict) {
            $heuristicStatus = 'BLOCKED_CONFLICT';
            $heuristicHeadline = 'Terdeteksi Konflik Selisih Data & Risiko Timpa Transaksi';
        } elseif ($differingMonthsCount > 0 || $hasWarning || $refBarangDiff > 0) {
            $heuristicStatus = 'WARNING_DIFFERENCE';
            $heuristicHeadline = "Terdapat {$differingMonthsCount} Bulan dengan Selisih Transaksi atau Status Belum Tutup Buku";
        }

        return [
            'rkas' => [
                'arkas_pagu' => $paguArkas,
                'sikas_pagu' => $paguSikas,
                'diff' => $paguDiff,
                'arkas_kegiatan' => (int) ($rkasArkas['total_kegiatan'] ?? 0),
                'sikas_rkas_count' => (int) ($sikas['rkas_count'] ?? 0),
                'is_approved_arkas' => (int) ($rkasArkas['is_approve'] ?? 0),
            ],
            'bku' => [
                'total_arkas_belanja' => $totalArkasBelanja,
                'total_sikas_belanja' => $totalSikasBelanja,
                'total_belanja_diff' => $totalArkasBelanja - $totalSikasBelanja,
                'differing_months_count' => $differingMonthsCount,
            ],
            'ref_barang' => [
                'arkas_count' => $refBarangArkas,
                'sikas_count' => $refBarangSikas,
                'diff' => $refBarangDiff,
            ],
            'months' => $monthComparisons,
            'heuristic_status' => $heuristicStatus,
            'heuristic_headline' => $heuristicHeadline,
        ];
    }

    /**
     * Memanggil DeepSeek-V3 untuk penalaran kognitif dan pembentukan rekomendasi tindakan.
     */
    protected function generateAiDiagnostic(User $user, array $diffData, string $scope = 'comprehensive'): array
    {
        $apiKey = $user->deepseek_api_key;
        if (empty($apiKey)) {
            return [
                'overall_status' => $diffData['heuristic_status'] ?? 'WARNING_DIFFERENCE',
                'headline' => $diffData['heuristic_headline'] ?? 'Analisis Heuristik (API Key DeepSeek Belum Terpasang)',
                'root_causes' => [
                    'Sistem menyajikan perbandingan heuristik bawaan. Pasang API Key DeepSeek pada profil Anda untuk mengaktifkan penalaran mendalam dan deteksi anomali SPJ.',
                ],
                'overwrite_risks' => $this->extractOverwriteRisks($diffData),
                'action_checklist' => $this->generateDefaultChecklist($diffData),
                'is_ai_powered' => false,
            ];
        }

        $systemPrompt = <<<PROMPT
Anda adalah Auditor Ahli Sistem Keuangan Sekolah Indonesia & Rekonsiliasi Database ARKAS (Aplikasi Rencana Kegiatan dan Anggaran Sekolah - Kemendikbudristek) dan newSIKAS (Sistem Informasi Keuangan Sekolah).

TUGAS ANDA:
Menganalisis perbedaan (diff) antara database resmi desktop ARKAS (SQLite) dan database newSIKAS (PostgreSQL).
Berikan diagnosa yang presisi, jelas, ramah bendahara, dan utamakan keselamatan data (Mencegah timpa ulang / overwrite yang tidak disengaja).

ATURAN ANALISIS:
1. OVERALL STATUS harus salah satu dari:
   - "HEALTHY" (Semua data selaras dan aman)
   - "WARNING_DIFFERENCE" (Ada selisih wajar, belum tutup buku, atau barang belum disinkronkan)
   - "BLOCKED_CONFLICT" (Ada risiko penimpaan transaksi lokal yang berharga, selisih pagu RKAS, atau RKAS terkunci)
   - "ERROR_CONNECTIVITY" (Database tidak dapat dibaca/korup)
2. HEADLINE: Ringkas, tajam, maksimal 1 kalimat langsung ke inti persoalan (sebutkan nominal selisih jika ada).
3. ROOT_CAUSES: Analisis mengapa angka bisa berbeda (misal: belanja di ARKAS belum ditutup buku, ada nota lokal di SIKAS yang belum di-input ke ARKAS, ada pajak belum dipotong).
4. OVERWRITE_RISKS: Peringatan konkret apa dampak buruk jika tombol "Tarik Data" diklik saat ini (sebutkan berapa transaksi yang akan terhapus dan nilai rupiahnya).
5. ACTION_CHECKLIST: Daftar langkah aksi konkret terurut bernomor dengan penanda sistem ("ARKAS", "SIKAS", atau "WINDOWS") yang harus dilakukan bendahara.

FORMAT KELUARAN (HARUS JSON MURNI TANPA MARKDOWN BACKTICKS):
{
  "overall_status": "WARNING_DIFFERENCE",
  "headline": "...",
  "root_causes": ["...", "..."],
  "overwrite_risks": ["...", "..."],
  "action_checklist": [
    {"step": 1, "system": "ARKAS", "action": "..."},
    {"step": 2, "system": "SIKAS", "action": "..."}
  ]
}
PROMPT;

        $userPrompt = "Berikut adalah data ringkasan perbandingan ARKAS vs SIKAS (Scope: {$scope}):\n\n".json_encode($diffData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

        $messages = [
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user', 'content' => $userPrompt],
        ];

        $response = $this->deepSeekService->callChat($apiKey, $messages, [
            'temperature' => 0.2,
            'response_format' => ['type' => 'json_object'],
            'timeout' => 45,
        ]);

        if (! $response['success']) {
            Log::warning('DeepSeek diagnostic call failed: '.($response['message'] ?? 'Unknown error'));
            return [
                'overall_status' => $diffData['heuristic_status'] ?? 'WARNING_DIFFERENCE',
                'headline' => $diffData['heuristic_headline'] ?? 'Analisis Berdasarkan Pola Heuristik',
                'root_causes' => [
                    'Gagal memanggil penalaran DeepSeek: '.($response['message'] ?? 'Koneksi AI tidak merespons'),
                ],
                'overwrite_risks' => $this->extractOverwriteRisks($diffData),
                'action_checklist' => $this->generateDefaultChecklist($diffData),
                'is_ai_powered' => false,
            ];
        }

        $rawContent = trim($response['content'] ?? '');
        // Bersihkan triple backticks jika ada
        if (str_starts_with($rawContent, '```')) {
            $rawContent = preg_replace('/^```(?:json)?\s*/i', '', $rawContent);
            $rawContent = preg_replace('/\s*```$/', '', $rawContent);
        }

        $parsed = json_decode($rawContent, true);
        if (! is_array($parsed)) {
            Log::warning('DeepSeek diagnostic invalid JSON: '.$rawContent);
            return [
                'overall_status' => $diffData['heuristic_status'] ?? 'WARNING_DIFFERENCE',
                'headline' => 'Hasil Diagnosa Terdeteksi',
                'root_causes' => ['Respons AI tidak sesuai format.'],
                'overwrite_risks' => $this->extractOverwriteRisks($diffData),
                'action_checklist' => $this->generateDefaultChecklist($diffData),
                'is_ai_powered' => false,
            ];
        }

        $parsed['is_ai_powered'] = true;
        return $parsed;
    }

    protected function extractOverwriteRisks(array $diffData): array
    {
        $risks = [];
        $months = $diffData['months'] ?? ($diffData['full_diff']['months'] ?? []);

        foreach ($months as $m) {
            if (! empty($m['overwrite_risk']) && ! empty($m['overwrite_description'])) {
                $risks[] = "Bulan {$m['nama_bulan']}: {$m['overwrite_description']}";
            }
        }

        return $risks;
    }

    protected function generateDefaultChecklist(array $diffData): array
    {
        $checklist = [];
        $step = 1;

        if (isset($diffData['rkas']['diff']) && abs($diffData['rkas']['diff']) > 0) {
            $checklist[] = [
                'step' => $step++,
                'system' => 'ARKAS',
                'action' => 'Pastikan perubahan/pergeseran pagu RKAS di ARKAS sudah disetujui (Approved) oleh dinas pendidikan.',
            ];
        }

        $months = $diffData['months'] ?? ($diffData['full_diff']['months'] ?? []);
        $hasDraft = collect($months)->contains('draft_warning', true);
        if ($hasDraft) {
            $checklist[] = [
                'step' => $step++,
                'system' => 'ARKAS',
                'action' => 'Lakukan "Tutup Buku Kas" pada aplikasi desktop ARKAS untuk bulan yang telah selesai dibelanjakan sebelum melakukan penarikan.',
            ];
        }

        $checklist[] = [
            'step' => $step++,
            'system' => 'SIKAS',
            'action' => 'Cadangkan atau periksa nota transaksi lokal sebelum mencentang konfirmasi penimpaan (overwrite) data BKU.',
        ];

        return $checklist;
    }

    protected function getArkasSumberDanaId(string $variant): int
    {
        return match ($variant) {
            'kinerja' => 12,
            'silpa' => 33,
            'kinerja_silpa' => 35,
            default => 1, // reguler
        };
    }

    protected function getNamaBulan(int $m): string
    {
        $names = [
            1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
            5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
            9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember',
        ];
        return $names[$m] ?? "Bulan {$m}";
    }
}
