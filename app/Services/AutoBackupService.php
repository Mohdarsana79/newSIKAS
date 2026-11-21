<?php

namespace App\Services;

use App\Http\Controllers\DatabaseController;
use App\Models\ActivityLog;
use App\Models\BackupRun;
use App\Models\BackupSetting;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

class AutoBackupService
{
    public const AUTO_BACKUP_PREFIX = 'auto_backup';

    private const AUTO_FILE_REGEX = '/^auto_backup_[A-Za-z0-9_-]+\.rsv$/';

    private const LOCK_KEY = 'sikas:auto-backup:running';

    public function __construct(
        private readonly GoogleDriveSyncService $googleDrive,
        private readonly ActivityLogger $activityLogger,
    ) {}

    /**
     * Mengecek apakah jadwal auto-backup saat ini sudah jatuh tempo dan belum dijalankan pada slot tersebut.
     */
    public function isDue(BackupSetting $setting, ?Carbon $now = null): bool
    {
        if (! $setting->is_enabled) {
            return false;
        }

        $tz = (string) config('app.timezone', 'UTC');
        $current = ($now ? $now->copy() : now())->timezone($tz);
        $slot = $this->resolveLatestScheduledSlot($setting, $current);

        if ($current->lt($slot)) {
            return false;
        }

        if ($setting->last_run_at === null) {
            if ($setting->updated_at !== null && $setting->updated_at->copy()->timezone($tz)->gte($slot)) {
                return false;
            }

            return true;
        }

        $lastRun = $setting->last_run_at->copy()->timezone($tz);

        return $lastRun->lt($slot);
    }

    /**
     * Menghitung slot jadwal paling baru yang sudah/sedang terjadi relatif terhadap waktu $now.
     */
    public function resolveLatestScheduledSlot(BackupSetting $setting, Carbon $now): Carbon
    {
        [$hour, $minute] = $this->parseTime((string) ($setting->scheduled_time ?: '22:00'));

        if ($setting->frequency === BackupSetting::FREQUENCY_WEEKLY) {
            $targetDow = max(0, min(6, (int) ($setting->day_of_week ?? 0)));
            $candidate = $now->copy()->setTime($hour, $minute, 0);
            $diffDays = ($now->dayOfWeek - $targetDow + 7) % 7;
            $candidate->subDays($diffDays);

            if ($candidate->gt($now)) {
                $candidate->subWeek();
            }

            return $candidate;
        }

        if ($setting->frequency === BackupSetting::FREQUENCY_MONTHLY) {
            $targetDay = max(1, min(28, (int) ($setting->day_of_month ?? 1)));
            $candidate = $now->copy()->day($targetDay)->setTime($hour, $minute, 0);

            if ($candidate->gt($now)) {
                $candidate->subMonthNoOverflow()->day($targetDay)->setTime($hour, $minute, 0);
            }

            return $candidate;
        }

        // Default: daily
        $candidate = $now->copy()->setTime($hour, $minute, 0);
        if ($candidate->gt($now)) {
            $candidate->subDay();
        }

        return $candidate;
    }

    /**
     * Menjalankan retensi otomatis HANYA pada berkas `auto_backup_*.rsv` di direktori tertentu.
     * Berkas backup manual milik Bendahara tidak pernah dihapus.
     *
     * @param  string|list<string>|null  $protectFileNames
     */
    public function applyRetention(
        string $directory,
        int $maxFiles,
        ?int $maxDays = null,
        string|array|null $protectFileNames = null,
    ): int {
        if (! is_dir($directory)) {
            return 0;
        }

        $entries = @scandir($directory);
        if (! is_array($entries)) {
            return 0;
        }

        $protected = array_values(array_filter(
            array_map(
                static fn ($name): string => is_string($name) ? basename($name) : '',
                is_array($protectFileNames) ? $protectFileNames : ($protectFileNames !== null ? [$protectFileNames] : []),
            ),
            static fn (string $name): bool => $name !== ''
        ));

        $autoFiles = [];
        foreach ($entries as $entry) {
            if (preg_match(self::AUTO_FILE_REGEX, $entry) !== 1) {
                continue;
            }
            $fullPath = rtrim($directory, '\\/').DIRECTORY_SEPARATOR.$entry;
            if (is_link($fullPath) || ! is_file($fullPath)) {
                continue;
            }
            $autoFiles[] = [
                'name' => $entry,
                'path' => $fullPath,
                'mtime' => (int) (@filemtime($fullPath) ?: 0),
            ];
        }

        if (count($autoFiles) <= 1) {
            return 0;
        }

        // Urutkan terbaru -> terlama
        usort($autoFiles, static function (array $a, array $b): int {
            if ($a['mtime'] === $b['mtime']) {
                return strcmp($b['name'], $a['name']);
            }

            return $b['mtime'] <=> $a['mtime'];
        });

        $safeMaxFiles = max(1, $maxFiles);
        $cutoffTimestamp = $maxDays !== null && $maxDays > 0
            ? now()->subDays($maxDays)->timestamp
            : null;

        $pruned = 0;
        foreach ($autoFiles as $index => $file) {
            // Selalu lindungi minimal 1 file terbaru & berkas yang baru dibuat / menunggu upload cloud
            if ($index === 0 || in_array($file['name'], $protected, true)) {
                continue;
            }

            $exceedsCount = $index >= $safeMaxFiles;
            $exceedsAge = $cutoffTimestamp !== null && $file['mtime'] > 0 && $file['mtime'] < $cutoffTimestamp;

            if ($exceedsCount || $exceedsAge) {
                if (@unlink($file['path'])) {
                    $pruned++;
                }
            }
        }

        return $pruned;
    }

    /**
     * Memvalidasi format jalur folder lokal (tanpa menyentuh filesystem — aman untuk validasi saat simpan).
     * Menolak path relatif, segmen `..`, null-byte, UNC/SMB (`\\host\share`), serta folder di dalam
     * direktori aplikasi/webroot/storage (mencegah kebocoran webroot & recursive zip-bomb).
     *
     * @return array{success: bool, normalized_path?: string, message: string}
     */
    public function validateLocalSyncPathFormat(?string $rawPath): array
    {
        if (! is_string($rawPath) || trim($rawPath) === '' || str_contains($rawPath, "\0")) {
            return [
                'success' => false,
                'message' => 'Jalur folder sinkronisasi lokal wajib diisi.',
            ];
        }

        $trimmed = trim($rawPath);

        if (str_starts_with($trimmed, '\\\\') || str_starts_with($trimmed, '//')) {
            return [
                'success' => false,
                'message' => 'Jalur jaringan UNC/SMB tidak diizinkan demi keamanan. Gunakan drive lokal yang terpasang (mis. D:\Backup-SIKAS atau G:\My Drive\Backup).',
            ];
        }

        if (str_contains($trimmed, '..')) {
            return [
                'success' => false,
                'message' => 'Jalur folder tidak boleh mengandung segmen relatif (..).',
            ];
        }

        if (preg_match('/^([a-zA-Z]:[\\\\\/]|\/)/', $trimmed) !== 1) {
            return [
                'success' => false,
                'message' => 'Jalur folder harus berupa path absolut (contoh: D:\Backup-SIKAS atau /mnt/backup-sikas).',
            ];
        }

        if ($this->conflictsWithForbiddenRoots($trimmed)) {
            return [
                'success' => false,
                'message' => 'Folder sinkronisasi tidak boleh berada di dalam direktori aplikasi, public webroot, atau storage internal.',
            ];
        }

        return [
            'success' => true,
            'normalized_path' => $trimmed,
            'message' => 'Format jalur folder valid.',
        ];
    }

    /**
     * Memvalidasi folder tujuan lokal / Google Drive Desktop (termasuk keberadaan & izin tulis).
     *
     * @return array{success: bool, resolved_path?: string, message: string}
     */
    public function validateLocalSyncFolder(?string $rawPath): array
    {
        $formatCheck = $this->validateLocalSyncPathFormat($rawPath);
        if (! $formatCheck['success']) {
            return [
                'success' => false,
                'message' => $formatCheck['message'],
            ];
        }

        $trimmed = $formatCheck['normalized_path'];
        $realTarget = realpath($trimmed);
        if ($realTarget === false || ! is_dir($realTarget)) {
            return [
                'success' => false,
                'message' => "Folder tidak ditemukan: {$trimmed}. Pastikan folder sudah dibuat (mis. folder Google Drive Desktop).",
            ];
        }

        // Re-validasi setelah resolve symlink agar symlink tidak mengarah ke webroot/storage aplikasi
        if ($this->conflictsWithForbiddenRoots($realTarget)) {
            return [
                'success' => false,
                'message' => 'Folder tujuan (termasuk target symlink) tidak boleh berada di dalam direktori aplikasi, public webroot, atau storage internal.',
            ];
        }

        if (! is_writable($realTarget)) {
            return [
                'success' => false,
                'message' => "Folder tidak memiliki izin tulis: {$realTarget}.",
            ];
        }

        return [
            'success' => true,
            'resolved_path' => $realTarget,
            'message' => "Folder sinkronisasi valid & siap tulis: {$realTarget}",
        ];
    }

    /**
     * Daftar direktori terlarang (aplikasi, webroot, storage internal, folder .env Inno Setup, dan direktori sistem OS).
     *
     * @return list<string>
     */
    protected function forbiddenRoots(): array
    {
        $roots = [
            base_path(),
            realpath(base_path()) ?: null,
            public_path(),
            realpath(public_path()) ?: null,
            storage_path(),
            realpath(storage_path()) ?: null,
            storage_path('app/backups'),
            realpath(storage_path('app/backups')) ?: null,
            app()->environmentPath(),
            realpath(app()->environmentPath()) ?: null,
        ];

        if (PHP_OS_FAMILY === 'Windows') {
            $systemDrive = (string) (getenv('SystemDrive') ?: 'C:');
            $roots = array_merge($roots, [
                $systemDrive.'\\Windows',
                $systemDrive.'\\ProgramData',
                $systemDrive.'\\Program Files',
                $systemDrive.'\\Program Files (x86)',
            ]);
        }

        return array_values(array_unique(array_filter($roots, static fn ($r): bool => is_string($r) && trim($r) !== '')));
    }

    /**
     * Mengecek apakah path sama dengan atau berada DI DALAM root terlarang (digunakan untuk memblokir browsing/create).
     */
    public function isInsideOrEqualForbiddenRoot(string $candidatePath): bool
    {
        $normalizedCandidate = $this->normalizePathForComparison($candidatePath);
        if ($normalizedCandidate === '') {
            return true;
        }

        foreach ($this->forbiddenRoots() as $root) {
            $normalizedRoot = $this->normalizePathForComparison($root);
            if ($normalizedRoot === '') {
                continue;
            }

            if ($normalizedCandidate === $normalizedRoot || str_starts_with($normalizedCandidate, $normalizedRoot.'/')) {
                return true;
            }
        }

        return false;
    }

    protected function conflictsWithForbiddenRoots(string $candidatePath): bool
    {
        $normalizedCandidate = $this->normalizePathForComparison($candidatePath);
        if ($normalizedCandidate === '') {
            return true;
        }

        foreach ($this->forbiddenRoots() as $root) {
            $normalizedRoot = $this->normalizePathForComparison($root);
            if ($normalizedRoot === '') {
                continue;
            }

            // Tolak jika sama persis, berada di dalam root terlarang, atau membungkus root terlarang (mis. C:\)
            if (
                $normalizedCandidate === $normalizedRoot
                || str_starts_with($normalizedCandidate, $normalizedRoot.'/')
                || str_starts_with($normalizedRoot, $normalizedCandidate.'/')
            ) {
                return true;
            }
        }

        return false;
    }

    protected function normalizePathForComparison(string $path): string
    {
        $normalized = str_replace('\\', '/', trim($path));
        $normalized = preg_replace('#/+#', '/', $normalized) ?? $normalized;
        $normalized = rtrim($normalized, '/');

        return DIRECTORY_SEPARATOR === '\\' ? strtolower($normalized) : $normalized;
    }

    /**
     * Menyalin berkas .rsv secara atomik ke folder lokal / Google Drive Desktop + opsional retensi.
     *
     * @return array{success: bool, target?: string, message: string}
     */
    public function syncToLocalFolder(string $sourceFullPath, string $fileName, BackupSetting $setting): array
    {
        $check = $this->validateLocalSyncFolder($setting->local_sync_path);
        if (! $check['success']) {
            return [
                'success' => false,
                'message' => $check['message'],
            ];
        }

        $targetDir = $check['resolved_path'];
        $safeName = basename($fileName);
        $destPath = $targetDir.DIRECTORY_SEPARATOR.$safeName;
        $tmpPath = $destPath.'.'.uniqid('tmp_', true);

        try {
            if (! @copy($sourceFullPath, $tmpPath)) {
                return [
                    'success' => false,
                    'target' => $targetDir,
                    'message' => "Gagal menyalin berkas backup ke folder: {$targetDir}",
                ];
            }

            if (! @rename($tmpPath, $destPath)) {
                @unlink($tmpPath);

                return [
                    'success' => false,
                    'target' => $targetDir,
                    'message' => "Gagal menyelesaikan penulisan berkas pada folder: {$targetDir}",
                ];
            }

            $prunedSync = 0;
            if ($setting->sync_apply_retention) {
                $prunedSync = $this->applyRetention(
                    $targetDir,
                    (int) ($setting->retention_max_files ?: 14),
                    $setting->retention_max_days,
                    $safeName,
                );
            }

            $suffix = $prunedSync > 0 ? " ({$prunedSync} auto-backup lama di folder tujuan dibersihkan)" : '';

            return [
                'success' => true,
                'target' => $targetDir,
                'message' => "Berhasil disalin ke {$targetDir}{$suffix}.",
            ];
        } catch (Throwable $e) {
            @unlink($tmpPath);

            return [
                'success' => false,
                'target' => $targetDir,
                'message' => 'Gagal menyalin ke folder lokal: '.$e->getMessage(),
            ];
        }
    }

    /**
     * Menjalankan proses Auto-Backup -> Retensi -> Sinkronisasi Opsional secara atomik & tercatat.
     *
     * @param  (callable(string): array{success: bool, file_name?: string, full_path?: string, message: string})|null  $archiveFactory
     * @return array{success: bool, skipped?: bool, status?: string, run?: BackupRun, message: string}
     */
    public function execute(
        string $trigger = 'scheduled',
        bool $force = false,
        ?callable $archiveFactory = null,
        ?User $actor = null,
        ?Request $request = null,
        bool $clientOnline = true,
    ): array {
        $lock = Cache::lock(self::LOCK_KEY, 900);
        if (! $lock->get()) {
            return [
                'success' => false,
                'skipped' => true,
                'message' => 'Proses auto-backup lain sedang berjalan. Silakan tunggu hingga selesai.',
            ];
        }

        $startedAt = now();
        $setting = BackupSetting::current();

        try {
            if (! $force && ! $this->isDue($setting)) {
                return [
                    'success' => true,
                    'skipped' => true,
                    'message' => 'Auto-backup belum jatuh tempo.',
                ];
            }

            if (! $setting->exists) {
                $setting->save();
            }

            $archiveResult = $archiveFactory !== null
                ? $archiveFactory(self::AUTO_BACKUP_PREFIX)
                : app(DatabaseController::class)->createBackupArchive(self::AUTO_BACKUP_PREFIX);

            if (! ($archiveResult['success'] ?? false)) {
                $errorMsg = (string) ($archiveResult['message'] ?? 'Gagal membuat arsip backup.');
                $run = $this->recordRun($setting, [
                    'trigger' => $trigger,
                    'status' => BackupRun::STATUS_FAILED,
                    'sync_mode' => $setting->sync_mode ?: BackupSetting::SYNC_NONE,
                    'sync_status' => 'skipped',
                    'message' => $errorMsg,
                    'started_at' => $startedAt,
                    'finished_at' => now(),
                ]);

                $this->logAudit($actor, $trigger, BackupRun::STATUS_FAILED, $errorMsg, [], $request);

                return [
                    'success' => false,
                    'status' => BackupRun::STATUS_FAILED,
                    'run' => $run,
                    'message' => $errorMsg,
                ];
            }

            $fileName = (string) ($archiveResult['file_name'] ?? '');
            $fullPath = (string) ($archiveResult['full_path'] ?? '');
            $fileSize = ($fullPath !== '' && is_file($fullPath)) ? (int) filesize($fullPath) : null;

            // 1. Jalankan retensi lokal (khusus auto_backup_*.rsv; lindungi berkas baru & berkas tertunda cloud)
            $prunedCount = 0;
            if ($setting->retention_enabled) {
                $backupDir = $fullPath !== '' ? dirname($fullPath) : storage_path('app/backups');
                $protectedFiles = array_values(array_filter([$fileName, $setting->pending_cloud_file]));
                $prunedCount = $this->applyRetention(
                    $backupDir,
                    (int) ($setting->retention_max_files ?: 14),
                    $setting->retention_max_days,
                    $protectedFiles,
                );
            }

            // 2. Jalankan sinkronisasi opsional (salinan lokal pilihan + opsional Google Drive API)
            $syncMode = (string) ($setting->sync_mode ?: BackupSetting::SYNC_NONE);
            $syncStatus = 'skipped';
            $syncTarget = null;
            $syncMessage = '';
            $localCopyMessage = '';
            $localCopyFailed = false;
            $cloudUploadFailed = false;

            if ($syncMode === BackupSetting::SYNC_LOCAL_FOLDER) {
                $syncRes = $this->syncToLocalFolder($fullPath, $fileName, $setting);
                $syncStatus = $syncRes['success'] ? 'success' : 'failed';
                $syncTarget = $syncRes['target'] ?? $setting->local_sync_path;
                $syncMessage = $syncRes['message'];
            } elseif ($syncMode === BackupSetting::SYNC_GOOGLE_DRIVE_API) {
                // Jika pengguna juga memilih folder lokal pilihan, simpan salinan lokal terlebih dahulu (jalan 100% offline!)
                if (filled($setting->local_sync_path)) {
                    $localRes = $this->syncToLocalFolder($fullPath, $fileName, $setting);
                    $localCopyFailed = ! ($localRes['success'] ?? false);
                    $localCopyMessage = $localRes['message'];
                }

                $clientId = (string) ($setting->gdrive_client_id ?? '');
                $folderId = (string) ($setting->gdrive_folder_id ?? '');
                $syncTarget = $folderId !== '' ? "Google Drive ({$folderId})" : 'Google Drive';

                if (! $clientOnline) {
                    $syncStatus = 'failed';
                    $cloudUploadFailed = true;
                    $syncMessage = 'Perangkat sedang offline; unggahan ke Google Drive ditunda otomatis.';
                } else {
                    $decryptionFailed = false;
                    $clientSecret = '';
                    $refreshToken = '';
                    try {
                        $clientSecret = (string) ($setting->gdrive_client_secret ?? '');
                        $refreshToken = (string) ($setting->gdrive_refresh_token ?? '');
                    } catch (Throwable $decryptException) {
                        Log::warning('AutoBackupService gagal mendekripsi kredensial Google Drive.', [
                            'error' => $decryptException->getMessage(),
                        ]);
                        $decryptionFailed = true;
                    }

                    if ($decryptionFailed) {
                        $syncStatus = 'failed';
                        $cloudUploadFailed = true;
                        $syncMessage = 'Kredensial Google Drive tidak dapat didekripsi. Silakan masukkan ulang Client Secret & Refresh Token pada pengaturan.';
                    } elseif ($clientId === '' || $clientSecret === '' || $refreshToken === '' || $folderId === '') {
                        $syncStatus = 'failed';
                        $cloudUploadFailed = true;
                        $syncMessage = 'Kredensial Google Drive API belum lengkap.';
                    } else {
                        $driveRes = $this->googleDrive->uploadFile(
                            $fullPath,
                            $fileName,
                            $clientId,
                            $clientSecret,
                            $refreshToken,
                            $folderId,
                        );
                        $syncStatus = $driveRes['success'] ? 'success' : 'failed';
                        $cloudUploadFailed = ! $driveRes['success'];
                        $syncMessage = $driveRes['message'];
                    }
                }
            }

            $overallStatus = ($syncStatus === 'failed' || $localCopyFailed)
                ? BackupRun::STATUS_PARTIAL
                : BackupRun::STATUS_SUCCESS;

            $parts = ["Auto-backup {$fileName} berhasil dibuat."];
            if ($prunedCount > 0) {
                $parts[] = "{$prunedCount} auto-backup lama dibersihkan.";
            }
            if ($localCopyMessage !== '') {
                $parts[] = $localCopyMessage;
            }
            if ($syncMessage !== '') {
                $parts[] = $syncMessage;
            }
            if ($cloudUploadFailed) {
                $parts[] = 'Berkas lokal aman dan akan otomatis diunggah ulang saat internet kembali tersambung.';
            }
            $summaryMessage = implode(' ', $parts);

            $run = $this->recordRun($setting, [
                'trigger' => $trigger,
                'status' => $overallStatus,
                'file_name' => Str::limit($fileName, 255, ''),
                'file_size_bytes' => $fileSize,
                'pruned_count' => $prunedCount,
                'sync_mode' => $syncMode,
                'sync_status' => $syncStatus,
                'sync_target' => $syncTarget !== null ? Str::limit($syncTarget, 512, '') : null,
                'message' => $summaryMessage,
                'started_at' => $startedAt,
                'finished_at' => now(),
            ]);

            // Kelola antrean pending cloud sync (offline-first auto-retry)
            if ($syncMode === BackupSetting::SYNC_GOOGLE_DRIVE_API && $cloudUploadFailed && $fullPath !== '' && is_file($fullPath)) {
                $setting->forceFill([
                    'pending_cloud_file' => Str::limit(basename($fileName), 255, ''),
                    'pending_cloud_path' => strlen($fullPath) <= 500 ? $fullPath : null,
                    'pending_cloud_run_id' => $run->id,
                    'pending_cloud_retry_at' => now()->addMinutes(5),
                ])->save();
            } else {
                $this->clearPendingCloudState($setting);
            }

            $this->logAudit($actor, $trigger, $overallStatus, $summaryMessage, [
                'file_name' => $fileName,
                'pruned_count' => $prunedCount,
                'sync_mode' => $syncMode,
                'sync_status' => $syncStatus,
            ], $request);

            return [
                'success' => true,
                'status' => $overallStatus,
                'run' => $run,
                'message' => $summaryMessage,
            ];
        } catch (Throwable $e) {
            Log::error('AutoBackupService execute exception.', ['error' => $e->getMessage()]);
            $errorMsg = 'Auto-backup gagal karena kesalahan tak terduga. Periksa log aplikasi untuk detail teknis.';

            $run = $this->recordRun($setting, [
                'trigger' => $trigger,
                'status' => BackupRun::STATUS_FAILED,
                'sync_mode' => $setting->sync_mode ?: BackupSetting::SYNC_NONE,
                'sync_status' => 'skipped',
                'message' => $errorMsg,
                'started_at' => $startedAt,
                'finished_at' => now(),
            ]);

            $this->logAudit($actor, $trigger, BackupRun::STATUS_FAILED, $errorMsg, [], $request);

            return [
                'success' => false,
                'status' => BackupRun::STATUS_FAILED,
                'run' => $run,
                'message' => $errorMsg,
            ];
        } finally {
            $lock->release();
        }
    }

    /**
     * Memastikan berkas yang diunggah ulang pada antrean pending cloud benar-benar arsip `auto_backup_*.rsv`
     * yang berada di dalam folder backup resmi (bukan symlink / file arbitrary seperti .env).
     */
    protected function resolveSafePendingBackupFile(BackupSetting $setting, ?string $allowedRootOverride = null): ?string
    {
        $fileName = basename((string) ($setting->pending_cloud_file ?? ''));
        if ($fileName === '' || preg_match(self::AUTO_FILE_REGEX, $fileName) !== 1) {
            return null;
        }

        $allowedRoots = array_values(array_filter([
            realpath(storage_path('app/backups')) ?: null,
            $allowedRootOverride !== null ? (realpath($allowedRootOverride) ?: null) : null,
        ]));

        // Prioritaskan folder backup aktif saat ini (tetap jalan meski folder instalasi Inno Setup dipindah)
        $candidates = [
            storage_path('app/backups').DIRECTORY_SEPARATOR.$fileName,
        ];
        if (filled($setting->pending_cloud_path)) {
            $candidates[] = (string) $setting->pending_cloud_path;
        }

        foreach ($candidates as $candidate) {
            if (@is_link($candidate) || ! is_file($candidate) || ! is_readable($candidate)) {
                continue;
            }

            $realFile = @realpath($candidate);
            if ($realFile === false || basename($realFile) !== $fileName) {
                continue;
            }

            $normFile = $this->normalizePathForComparison($realFile);
            foreach ($allowedRoots as $root) {
                $normRoot = $this->normalizePathForComparison($root);
                if ($normRoot !== '' && str_starts_with($normFile, $normRoot.'/')) {
                    return $realFile;
                }
            }
        }

        return null;
    }

    /**
     * Mengunggah ulang berkas .rsv terbaru yang tertunda ke Google Drive (saat internet kembali tersambung).
     *
     * @return array{success: bool, skipped?: bool, message: string}
     */
    public function retryPendingCloudSync(
        bool $force = false,
        ?User $actor = null,
        ?Request $request = null,
        string $trigger = 'scheduled',
        ?string $allowedRootOverride = null,
    ): array {
        $lock = Cache::lock(self::LOCK_KEY, 900);
        if (! $lock->get()) {
            return [
                'success' => false,
                'skipped' => true,
                'message' => 'Proses auto-backup atau sinkronisasi lain sedang berjalan.',
            ];
        }

        try {
            $setting = BackupSetting::current();

            if (! $setting->exists || $setting->sync_mode !== BackupSetting::SYNC_GOOGLE_DRIVE_API || ! filled($setting->pending_cloud_file)) {
                return [
                    'success' => true,
                    'skipped' => true,
                    'message' => 'Tidak ada berkas cadangan yang menunggu unggah ke Google Drive.',
                ];
            }

            if (! $force && $setting->pending_cloud_retry_at !== null && now()->lt($setting->pending_cloud_retry_at)) {
                return [
                    'success' => true,
                    'skipped' => true,
                    'message' => 'Menunggu jeda percobaan ulang berikutnya.',
                ];
            }

            $fileName = basename((string) $setting->pending_cloud_file);
            $fullPath = $this->resolveSafePendingBackupFile($setting, $allowedRootOverride);

            if ($fullPath === null) {
                $this->clearPendingCloudState($setting);

                return [
                    'success' => false,
                    'message' => "Berkas cadangan tertunda ({$fileName}) tidak ditemukan atau tidak valid pada direktori backup resmi.",
                ];
            }

            $clientId = (string) ($setting->gdrive_client_id ?? '');
            $folderId = (string) ($setting->gdrive_folder_id ?? '');
            try {
                $clientSecret = (string) ($setting->gdrive_client_secret ?? '');
                $refreshToken = (string) ($setting->gdrive_refresh_token ?? '');
            } catch (Throwable) {
                $setting->forceFill(['pending_cloud_retry_at' => now()->addMinutes(15)])->save();

                return [
                    'success' => false,
                    'message' => 'Kredensial Google Drive tidak dapat didekripsi. Silakan masukkan ulang di pengaturan.',
                ];
            }

            if ($clientId === '' || $clientSecret === '' || $refreshToken === '' || $folderId === '') {
                $setting->forceFill(['pending_cloud_retry_at' => now()->addMinutes(15)])->save();

                return [
                    'success' => false,
                    'message' => 'Kredensial Google Drive API belum lengkap.',
                ];
            }

            $driveRes = $this->googleDrive->uploadFile(
                $fullPath,
                $fileName,
                $clientId,
                $clientSecret,
                $refreshToken,
                $folderId,
            );

            if (! $driveRes['success']) {
                $setting->forceFill([
                    'pending_cloud_retry_at' => now()->addMinutes(5),
                ])->save();

                return [
                    'success' => false,
                    'message' => $driveRes['message'],
                ];
            }

            $runId = $setting->pending_cloud_run_id;
            $successMsg = "Berkas {$fileName} berhasil diunggah ulang ke Google Drive saat koneksi kembali aktif.";

            if ($runId !== null) {
                $run = BackupRun::query()->find($runId);
                if ($run) {
                    $run->forceFill([
                        'status' => BackupRun::STATUS_SUCCESS,
                        'sync_status' => 'success',
                        'message' => $successMsg,
                    ])->save();
                }
            }

            if ($setting->last_backup_file === $fileName) {
                $setting->forceFill([
                    'last_run_status' => BackupRun::STATUS_SUCCESS,
                    'last_run_message' => $successMsg,
                ])->save();
            }

            $this->clearPendingCloudState($setting);

            $this->logAudit($actor, $trigger, BackupRun::STATUS_SUCCESS, $successMsg, [
                'file_name' => $fileName,
                'sync_mode' => BackupSetting::SYNC_GOOGLE_DRIVE_API,
                'sync_status' => 'success',
                'retry_cloud' => true,
            ], $request);

            return [
                'success' => true,
                'message' => $successMsg,
            ];
        } finally {
            $lock->release();
        }
    }

    /**
     * Pemicu otomatis ringan dari dalam aplikasi (Zero-Setup Inno Setup — jalan online maupun offline).
     *
     * @return array{action: string, success: bool, message: string}
     */
    public function handleHeartbeat(
        bool $clientOnline = true,
        ?User $actor = null,
        ?Request $request = null,
        bool $allowAsyncSpawn = false,
        ?callable $archiveFactory = null,
        ?string $allowedRootOverride = null,
    ): array {
        $setting = BackupSetting::current();

        $dueNow = $this->isDue($setting);
        $retryReady = ! $dueNow
            && $clientOnline
            && $setting->exists
            && $setting->sync_mode === BackupSetting::SYNC_GOOGLE_DRIVE_API
            && filled($setting->pending_cloud_file)
            && ($setting->pending_cloud_retry_at === null || now()->gte($setting->pending_cloud_retry_at));

        if (! $dueNow && ! $retryReady) {
            return [
                'action' => 'idle',
                'success' => true,
                'message' => 'Tidak ada tugas auto-backup yang perlu dijalankan saat ini.',
            ];
        }

        // Pada produksi/desktop HTTP, jalankan secara detached di proses CLI terpisah agar tidak memblokir worker web atau session
        if ($allowAsyncSpawn && ! app()->runningUnitTests() && $archiveFactory === null) {
            if (app(WindowsTaskSchedulerService::class)->spawnBackgroundAutoRun()) {
                return [
                    'action' => $dueNow ? 'backup_dispatched' : 'retry_dispatched',
                    'success' => true,
                    'message' => 'Proses auto-backup sedang dijalankan di latar belakang.',
                ];
            }
        }

        if ($dueNow) {
            $res = $this->execute('scheduled', false, $archiveFactory, $actor, $request, $clientOnline);
            if (! empty($res['skipped'])) {
                return ['action' => 'idle', 'success' => true, 'message' => $res['message']];
            }

            return [
                'action' => 'backup',
                'success' => (bool) ($res['success'] ?? false),
                'message' => (string) ($res['message'] ?? ''),
            ];
        }

        $retryRes = $this->retryPendingCloudSync(false, $actor, $request, 'scheduled', $allowedRootOverride);
        if (! empty($retryRes['skipped'])) {
            return ['action' => 'idle', 'success' => true, 'message' => $retryRes['message']];
        }

        return [
            'action' => 'retry_cloud',
            'success' => (bool) ($retryRes['success'] ?? false),
            'message' => (string) ($retryRes['message'] ?? ''),
        ];
    }

    protected function clearPendingCloudState(BackupSetting $setting): void
    {
        if (
            $setting->pending_cloud_file === null
            && $setting->pending_cloud_path === null
            && $setting->pending_cloud_run_id === null
            && $setting->pending_cloud_retry_at === null
        ) {
            return;
        }

        $setting->forceFill([
            'pending_cloud_file' => null,
            'pending_cloud_path' => null,
            'pending_cloud_run_id' => null,
            'pending_cloud_retry_at' => null,
        ])->save();
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    protected function recordRun(BackupSetting $setting, array $attributes): BackupRun
    {
        $run = BackupRun::query()->create($attributes);

        $setting->forceFill([
            'last_run_at' => $attributes['finished_at'] ?? now(),
            'last_run_status' => $attributes['status'],
            'last_run_message' => $attributes['message'],
            'last_backup_file' => $attributes['file_name'] ?? $setting->last_backup_file,
        ])->save();

        return $run;
    }

    /**
     * @param  array<string, mixed>  $metadata
     */
    protected function logAudit(
        ?User $actor,
        string $trigger,
        string $status,
        string $message,
        array $metadata = [],
        ?Request $request = null,
    ): void {
        $severity = match ($status) {
            BackupRun::STATUS_FAILED => ActivityLog::SEVERITY_WARNING,
            BackupRun::STATUS_PARTIAL => ActivityLog::SEVERITY_WARNING,
            default => ActivityLog::SEVERITY_INFO,
        };

        $routeName = $request?->route()?->getName()
            ?? ($trigger === 'manual_auto' ? 'backup.auto-run' : 'artisan:backup:auto-run');
        $httpMethod = $request ? strtoupper($request->method()) : ($trigger === 'manual_auto' ? 'POST' : 'CLI');

        $this->activityLogger->log([
            'user_id' => $actor?->id,
            'actor_name' => $actor?->name ?? 'Scheduler Auto-Backup',
            'actor_username' => $actor?->username ?? 'system-scheduler',
            'actor_role' => $actor?->role ?? 'system',
            'module' => 'backup',
            'variant' => null,
            'action' => 'backup',
            'severity' => $severity,
            'description' => $message,
            'route_name' => $routeName,
            'http_method' => $httpMethod,
            'url_path' => $request ? '/'.ltrim($request->path(), '/') : null,
            'status_code' => $status === BackupRun::STATUS_FAILED ? 500 : 200,
            'ip_address' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
            'metadata' => array_merge(['trigger' => $trigger, 'status' => $status], $metadata),
        ]);
    }

    /**
     * @return array{0: int, 1: int}
     */
    protected function parseTime(string $time): array
    {
        if (preg_match('/^([01]\d|2[0-3]):([0-5]\d)$/', trim($time), $matches) === 1) {
            return [(int) $matches[1], (int) $matches[2]];
        }

        return [22, 0];
    }
}
