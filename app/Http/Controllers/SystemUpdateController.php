<?php

namespace App\Http\Controllers;

use App\Services\SystemUpdaterService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class SystemUpdateController extends Controller
{
    public function __construct(
        protected SystemUpdaterService $updaterService,
        protected DatabaseController $databaseController
    ) {}

    /**
     * Menampilkan halaman Pembaharuan Sistem.
     */
    public function index(Request $request): Response
    {
        $this->ensureAuthorized($request);

        $updateInfo = $this->updaterService->getUpdateDetails(false);
        $backupSummary = $this->databaseController->getLatestBackupSummary();

        return Inertia::render('SystemUpdate/Index', [
            'updateInfo' => $updateInfo,
            'backupSummary' => $backupSummary,
        ]);
    }

    /**
     * Memeriksa ketersediaan versi terbaru secara langsung ke GitHub Releases API.
     */
    public function check(Request $request): JsonResponse
    {
        $this->ensureAuthorized($request);

        $updateInfo = $this->updaterService->getUpdateDetails(true);

        return response()->json([
            'success' => ($updateInfo['status'] ?? '') === 'ok',
            'updateInfo' => $updateInfo,
        ]);
    }

    /**
     * Memulai proses pembaharuan online otomatis:
     * 1. Auto-backup database (.rsv)
     * 2. Download installer .exe dari GitHub Releases
     * 3. Eksekusi Silent Installer secara detached
     */
    public function startOnline(Request $request): JsonResponse
    {
        $this->ensureAuthorized($request);

        $request->validate([
            'update_id' => ['required', 'string', 'max:100'],
            'reuse_backup_file' => ['nullable', 'string', 'max:255'],
        ]);

        $this->prepareLongRunningExecution($request);

        $updateId = (string) $request->input('update_id');
        $reuseBackupFile = $request->input('reuse_backup_file');
        $currentVersion = $this->updaterService->getCurrentVersion();
        $backupFileName = null;
        $currentStep = 2;

        try {
            $updateInfo = $this->updaterService->getUpdateDetails(false);
            if (empty($updateInfo['has_update']) || empty($updateInfo['asset'])) {
                $updateInfo = $this->updaterService->getUpdateDetails(true);
            }

            $token = trim((string) config('updater.github.token', ''));
            $downloadUrl = $token !== ''
                ? (string) ($updateInfo['asset']['api_url'] ?? '')
                : (string) ($updateInfo['asset']['download_url'] ?: ($updateInfo['asset']['api_url'] ?? ''));

            if ($downloadUrl === '') {
                $msg = $updateInfo['error_message'] ?: 'Berkas installer (.exe) tidak ditemukan pada rilis GitHub terbaru.';
                $this->updaterService->setProgress($updateId, 100, 'error', $msg, ['failed_step' => 2]);

                return response()->json([
                    'success' => false,
                    'message' => $msg,
                ], 422);
            }

            $targetVersion = (string) ($updateInfo['latest_version'] ?? $currentVersion);
            $assetSize = (int) ($updateInfo['asset']['size'] ?? 0);
            $assetName = preg_replace('/[^a-zA-Z0-9._-]/', '_', (string) ($updateInfo['asset']['name'] ?? "newSIKAS_Installer_{$targetVersion}.exe"));

            // Tahap 1: Wajib Auto-Backup Database sebelum update (gunakan ulang backup jika Coba Lagi dari Tahap 2)
            $currentStep = 1;
            if (is_string($reuseBackupFile) && $this->canReuseBackupFile($reuseBackupFile)) {
                $backupFileName = $reuseBackupFile;
            } else {
                $backupResult = $this->performPreUpdateBackup($updateId, $currentVersion, $targetVersion);
                if (! $backupResult['success']) {
                    return response()->json([
                        'success' => false,
                        'message' => $backupResult['message'],
                    ], 500);
                }

                $backupFileName = $backupResult['file_name'] ?? null;
            }

            // Tahap 2: Mengunduh installer .exe dari GitHub Releases (resumable + auto-retry)
            $currentStep = 2;
            $this->updaterService->setProgress(
                $updateId,
                25,
                'downloading',
                "Tahap 2/3: Mengunduh paket installer {$assetName}...",
                [
                    'initial_version' => $currentVersion,
                    'target_version' => $targetVersion,
                    'backup_file' => $backupFileName,
                ]
            );

            $downloadDir = $this->ensureUpdateTempDirectory();
            $destinationPath = $downloadDir.DIRECTORY_SEPARATOR.$assetName;

            $this->updaterService->downloadReleaseAsset(
                $downloadUrl,
                $destinationPath,
                function (float $ratio, int $downloadedBytes, int $totalBytes) use ($updateId, $currentVersion, $targetVersion, $backupFileName): void {
                    $dlFormatted = $this->updaterService->formatBytes($downloadedBytes);
                    $totalFormatted = $this->updaterService->formatBytes($totalBytes);
                    $this->reportDownloadProgress(
                        $updateId,
                        $ratio,
                        "Tahap 2/3: Mengunduh installer ({$dlFormatted} dari {$totalFormatted})...",
                        $downloadedBytes,
                        $totalBytes,
                        $currentVersion,
                        $targetVersion,
                        $backupFileName
                    );
                },
                $assetSize,
                function (int $nextAttempt, int $maxAttempts, int $savedBytes, int $totalBytes) use ($updateId, $currentVersion, $targetVersion, $backupFileName): void {
                    $savedFormatted = $this->updaterService->formatBytes($savedBytes);
                    $ratio = $totalBytes > 0 ? ($savedBytes / $totalBytes) : 0.0;
                    $this->reportDownloadProgress(
                        $updateId,
                        $ratio,
                        "Tahap 2/3: Koneksi sempat terputus pada {$savedFormatted}. Melanjutkan unduhan otomatis (percobaan {$nextAttempt}/{$maxAttempts})...",
                        $savedBytes,
                        $totalBytes,
                        $currentVersion,
                        $targetVersion,
                        $backupFileName
                    );
                }
            );

            // Tahap 3: Meluncurkan Silent Installer secara detached
            $currentStep = 3;

            return $this->finalizeAndLaunchInstaller($updateId, $destinationPath, $currentVersion, $targetVersion, $backupFileName);
        } catch (Exception $e) {
            return $this->handleUpdateException($updateId, $e, 'Pembaharuan gagal', $backupFileName, $currentStep);
        }
    }

    /**
     * Memproses pembaharuan manual melalui unggahan berkas installer (.exe):
     * 1. Validasi header PE executable (.exe)
     * 2. Auto-backup database (.rsv)
     * 3. Eksekusi Silent Installer secara detached
     */
    public function uploadManual(Request $request): JsonResponse
    {
        $this->ensureAuthorized($request);

        $request->validate([
            'update_id' => ['required', 'string', 'max:100'],
            'installer_file' => ['required', 'file', 'max:5242880'], // Maksimal 5 GB
        ]);

        $this->prepareLongRunningExecution($request);

        $updateId = (string) $request->input('update_id');
        $currentVersion = $this->updaterService->getCurrentVersion();
        $file = $request->file('installer_file');

        $originalName = $file ? $file->getClientOriginalName() : '';
        if (! $file || strtolower($file->getClientOriginalExtension()) !== 'exe') {
            return response()->json([
                'success' => false,
                'message' => 'Berkas yang diunggah harus berformat installer Windows (.exe).',
            ], 422);
        }

        if (! $this->updaterService->validateExecutableFile($file->getRealPath())) {
            return response()->json([
                'success' => false,
                'message' => 'Berkas .exe tidak valid atau rusak (header aplikasi Windows tidak dikenali).',
            ], 422);
        }

        $targetVersion = $currentVersion;
        if (preg_match('/(\d{4})[._](\d+)/', $originalName, $matches)) {
            $targetVersion = $matches[1].'.'.$matches[2];
        }

        $backupFileName = null;
        $currentStep = 1;

        try {
            // Tahap 1: Wajib Auto-Backup Database sebelum update manual
            $backupResult = $this->performPreUpdateBackup($updateId, $currentVersion, $targetVersion);
            if (! $backupResult['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $backupResult['message'],
                ], 500);
            }

            $backupFileName = $backupResult['file_name'] ?? null;

            // Tahap 2: Simpan berkas .exe ke direktori sementara
            $currentStep = 2;
            $this->updaterService->setProgress(
                $updateId,
                65,
                'verifying',
                'Tahap 2/3: Memverifikasi paket installer yang diunggah...',
                [
                    'initial_version' => $currentVersion,
                    'target_version' => $targetVersion,
                    'backup_file' => $backupFileName,
                ]
            );

            $uploadDir = $this->ensureUpdateTempDirectory();
            $safeFileName = 'manual_update_'.preg_replace('/[^a-zA-Z0-9._-]/', '_', $originalName);
            $storedPath = $uploadDir.DIRECTORY_SEPARATOR.$safeFileName;
            $file->move($uploadDir, $safeFileName);

            // Tahap 3: Jalankan Silent Installer secara detached
            $currentStep = 3;

            return $this->finalizeAndLaunchInstaller($updateId, $storedPath, $currentVersion, $targetVersion, $backupFileName);
        } catch (Exception $e) {
            return $this->handleUpdateException($updateId, $e, 'Pembaharuan manual gagal', $backupFileName, $currentStep);
        }
    }

    /**
     * Endpoint ringan (tanpa middleware session/DB) untuk memantau progres instalasi
     * dan mendeteksi kapan server Apache kembali aktif setelah restart.
     */
    public function progress(string $updateId): JsonResponse
    {
        return response()->json($this->updaterService->getProgress($updateId));
    }

    protected function prepareLongRunningExecution(Request $request): void
    {
        if ($request->hasSession()) {
            $request->session()->save();
        }

        @set_time_limit(0);
        @ini_set('max_execution_time', '0');
        @ini_set('memory_limit', '1024M');
        @ignore_user_abort(true);
    }

    protected function canReuseBackupFile(?string $fileName): bool
    {
        if (! is_string($fileName) || $fileName === '' || basename($fileName) !== $fileName) {
            return false;
        }

        if (! preg_match('/\.(rsv|sql)$/i', $fileName)) {
            return false;
        }

        $backupPath = storage_path('app/backups'.DIRECTORY_SEPARATOR.$fileName);

        return file_exists($backupPath) && (int) @filesize($backupPath) > 0;
    }

    protected function ensureUpdateTempDirectory(): string
    {
        $dir = storage_path('app/temp/update');
        if (! is_dir($dir) && ! @mkdir($dir, 0755, true) && ! is_dir($dir)) {
            throw new Exception("Gagal membuat direktori sementara pembaharuan ({$dir}). Periksa izin tulis server.");
        }

        if (! is_writable($dir)) {
            throw new Exception("Direktori sementara pembaharuan ({$dir}) tidak memiliki izin tulis (write permission).");
        }

        return $dir;
    }

    /**
     * Menjalankan Tahap 1 (Auto-Backup Database) sebelum pembaharuan.
     *
     * @return array{success: bool, file_name?: string, message: string}
     */
    protected function performPreUpdateBackup(string $updateId, string $currentVersion, string $targetVersion): array
    {
        $this->updaterService->setProgress(
            $updateId,
            15,
            'backing_up',
            'Tahap 1/3: Membuat cadangan (auto-backup) database & berkas sebelum pembaharuan...',
            [
                'initial_version' => $currentVersion,
                'target_version' => $targetVersion,
            ]
        );

        $backupPrefix = 'pre_update_v'.str_replace('.', '_', $currentVersion);
        $backupResult = $this->databaseController->createBackupArchive($backupPrefix);

        if (! $backupResult['success']) {
            $errMsg = 'Pembaharuan dibatalkan karena gagal membuat auto-backup pengaman: '.$backupResult['message'];
            $this->updaterService->setProgress($updateId, 100, 'error', $errMsg, [
                'initial_version' => $currentVersion,
                'target_version' => $targetVersion,
                'failed_step' => 1,
            ]);

            return [
                'success' => false,
                'message' => $errMsg,
            ];
        }

        return $backupResult;
    }

    /**
     * Menjalankan Tahap 3 (Meluncurkan Silent Installer di background).
     */
    protected function finalizeAndLaunchInstaller(
        string $updateId,
        string $installerPath,
        string $currentVersion,
        string $targetVersion,
        ?string $backupFileName
    ): JsonResponse {
        $this->updaterService->setProgress(
            $updateId,
            88,
            'installing',
            'Tahap 3/3: Memasang pembaharuan & memulai ulang layanan server. Mohon tunggu 15–30 detik...',
            [
                'initial_version' => $currentVersion,
                'target_version' => $targetVersion,
                'backup_file' => $backupFileName,
            ]
        );

        $this->updaterService->launchDetachedInstaller($installerPath, $updateId, $targetVersion);

        return response()->json([
            'success' => true,
            'phase' => 'installing',
            'target_version' => $targetVersion,
            'backup_file' => $backupFileName,
            'message' => 'Installer pembaharuan telah dijalankan di latar belakang.',
        ]);
    }

    protected function reportDownloadProgress(
        string $updateId,
        float $ratio,
        string $message,
        int $downloadedBytes,
        int $totalBytes,
        string $currentVersion,
        string $targetVersion,
        ?string $backupFileName
    ): void {
        $scaledPercent = min(83, max(25, (int) round(25 + ($ratio * 58))));
        $this->updaterService->setProgress(
            $updateId,
            $scaledPercent,
            'downloading',
            $message,
            [
                'initial_version' => $currentVersion,
                'target_version' => $targetVersion,
                'backup_file' => $backupFileName,
                'downloaded_bytes' => $downloadedBytes,
                'total_bytes' => $totalBytes,
            ]
        );
    }

    protected function handleUpdateException(
        string $updateId,
        Exception $e,
        string $prefix,
        ?string $backupFileName = null,
        int $failedStep = 2
    ): JsonResponse {
        Log::error("{$prefix}: ".$e->getMessage());
        $this->updaterService->setProgress($updateId, 100, 'error', "{$prefix}: ".$e->getMessage(), [
            'failed_step' => $failedStep,
            'backup_file' => $backupFileName,
        ]);

        return response()->json([
            'success' => false,
            'phase' => 'error',
            'failed_step' => $failedStep,
            'backup_file' => $backupFileName,
            'message' => "{$prefix}: ".$e->getMessage(),
        ], 200);
    }

    /**
     * Pastikan hanya Bendahara / Operator (bukan Kepala Sekolah) yang dapat mengakses fitur sistem ini.
     */
    protected function ensureAuthorized(Request $request): void
    {
        $user = $request->user();
        $requiredLevel = $request->isMethod('GET') ? 'read' : 'write';
        if (! $user || ! $user->canAccessModule('system_update', $requiredLevel)) {
            abort(403, 'Akses ditolak. Akun Anda tidak memiliki izin untuk fitur Pembaharuan Sistem.');
        }
    }
}
