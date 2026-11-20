<?php

namespace App\Services;

use Carbon\Carbon;
use Exception;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class SystemUpdaterService
{
    /**
     * Mendapatkan versi aplikasi yang sedang terpasang saat ini.
     * Membandingkan nilai di config('updater.version') dengan ../configapp/install.ini (jika ada)
     * dan mengambil versi tertinggi agar akurat di lingkungan dev maupun produksi Inno Setup.
     */
    public function getCurrentVersion(): string
    {
        $configVersion = $this->normalizeVersion((string) config('updater.version', '2026.29'));
        $iniPath = dirname(base_path()).DIRECTORY_SEPARATOR.'configapp'.DIRECTORY_SEPARATOR.'install.ini';

        if (file_exists($iniPath)) {
            $iniContent = @file_get_contents($iniPath);
            if (is_string($iniContent) && preg_match('/^version\s*=\s*(.+)$/mi', $iniContent, $matches)) {
                $iniVersion = $this->normalizeVersion(trim($matches[1]));
                if ($iniVersion !== '' && $iniVersion !== '2026.0') {
                    if (version_compare($iniVersion, $configVersion, '>')) {
                        return $iniVersion;
                    }
                }
            }
        }

        return $configVersion;
    }

    /**
     * Normalisasi string versi (contoh: "v2026.30" -> "2026.30")
     */
    public function normalizeVersion(string $version): string
    {
        $cleaned = trim($version);
        $cleaned = preg_replace('/^(newSIKAS\s*|v)/i', '', $cleaned) ?? $cleaned;

        return trim($cleaned);
    }

    /**
     * Ringkasan cepat dari cache lokal untuk dibagikan melalui HandleInertiaRequests
     * (tanpa melakukan request HTTP keluar agar navigasi halaman tetap instan).
     */
    public function getSharedUpdateSummary(): array
    {
        $currentVersion = $this->getCurrentVersion();
        $cacheFile = $this->getCacheFilePath();

        if (! file_exists($cacheFile)) {
            return [
                'currentVersion' => $currentVersion,
                'latestVersion' => $currentVersion,
                'hasUpdate' => false,
                'checkedAt' => null,
            ];
        }

        $cached = json_decode((string) @file_get_contents($cacheFile), true);
        if (! is_array($cached) || empty($cached['latest_version'])) {
            return [
                'currentVersion' => $currentVersion,
                'latestVersion' => $currentVersion,
                'hasUpdate' => false,
                'checkedAt' => null,
            ];
        }

        $latestVersion = $this->normalizeVersion((string) $cached['latest_version']);
        $hasUpdate = version_compare($latestVersion, $currentVersion, '>');

        return [
            'currentVersion' => $currentVersion,
            'latestVersion' => $latestVersion,
            'hasUpdate' => $hasUpdate,
            'checkedAt' => $cached['checked_at'] ?? null,
        ];
    }

    /**
     * Mengambil detail lengkap status pembaharuan (dari cache jika masih valid, atau dari GitHub API).
     */
    public function getUpdateDetails(bool $forceRefresh = false): array
    {
        $currentVersion = $this->getCurrentVersion();
        $cacheFile = $this->getCacheFilePath();
        $ttl = (int) config('updater.cache_ttl', 86400);

        if (! $forceRefresh && file_exists($cacheFile)) {
            $cached = json_decode((string) @file_get_contents($cacheFile), true);
            if (is_array($cached) && isset($cached['timestamp']) && (time() - (int) $cached['timestamp']) < $ttl) {
                $latestVersion = $this->normalizeVersion((string) ($cached['latest_version'] ?? $currentVersion));
                $cached['current_version'] = $currentVersion;
                $cached['has_update'] = version_compare($latestVersion, $currentVersion, '>');

                return $cached;
            }
        }

        return $this->fetchLatestGithubRelease();
    }

    /**
     * Menghubungi GitHub Releases API untuk memeriksa versi terbaru.
     */
    public function fetchLatestGithubRelease(): array
    {
        $currentVersion = $this->getCurrentVersion();
        $owner = trim((string) config('updater.github.owner', 'Mohdarsana79'));
        $repo = trim((string) config('updater.github.repo', 'newSIKAS-releases'));
        $token = trim((string) config('updater.github.token', ''));
        $assetPattern = (string) config('updater.github.asset_pattern', '/^newSIKAS_(Installer|Patch|Update)_.*\.exe$/i');

        $headers = $this->buildGithubHeaders('application/vnd.github+json');

        try {
            $url = "https://api.github.com/repos/{$owner}/{$repo}/releases/latest";
            $response = Http::withHeaders($headers)->timeout(15)->get($url);

            if ($response->status() === 404) {
                return $this->buildFallbackResult(
                    $currentVersion,
                    'Belum ada rilis pembaharuan terbaru.'
                );
            }

            if ($response->status() === 401 || $response->status() === 403) {
                return $this->buildFallbackResult(
                    $currentVersion,
                    'Autentikasi ke GitHub Releases ditolak (HTTP '.$response->status().'). Periksa kembali Fine-Grained Token pada config/updater.php.'
                );
            }

            if (! $response->successful()) {
                return $this->buildFallbackResult(
                    $currentVersion,
                    'Gagal memeriksa pembaruan dari server GitHub (HTTP '.$response->status().').'
                );
            }

            $release = $response->json();
            $tagName = (string) ($release['tag_name'] ?? $currentVersion);
            $latestVersion = $this->normalizeVersion($tagName);
            $hasUpdate = version_compare($latestVersion, $currentVersion, '>');

            // Cari file installer/patch .exe pada daftar assets rilis (prioritaskan paket Patch/Update ringan jika tersedia)
            $matchedAsset = null;
            $assets = is_array($release['assets'] ?? null) ? $release['assets'] : [];
            foreach (['/^newSIKAS_(Patch|Update)_.*\.exe$/i', $assetPattern] as $pattern) {
                foreach ($assets as $asset) {
                    $assetName = (string) ($asset['name'] ?? '');
                    if (preg_match($pattern, $assetName)) {
                        $matchedAsset = $asset;
                        break 2;
                    }
                }
            }

            $assetSize = (int) ($matchedAsset['size'] ?? 0);
            $publishedAt = ! empty($release['published_at'])
                ? Carbon::parse($release['published_at'])->translatedFormat('d F Y, H:i')
                : '-';

            $result = [
                'status' => 'ok',
                'error_message' => null,
                'current_version' => $currentVersion,
                'latest_version' => $latestVersion,
                'tag_name' => $tagName,
                'release_name' => (string) ($release['name'] ?? "newSIKAS v{$latestVersion}"),
                'changelog' => trim((string) ($release['body'] ?? 'Tidak ada catatan perubahan rilis.')),
                'published_at' => $publishedAt,
                'has_update' => $hasUpdate,
                'asset' => $matchedAsset ? [
                    'name' => (string) $matchedAsset['name'],
                    'size' => $assetSize,
                    'size_formatted' => $this->formatBytes($assetSize),
                    'api_url' => (string) ($matchedAsset['url'] ?? ''),
                    'download_url' => (string) ($matchedAsset['browser_download_url'] ?? ''),
                ] : null,
                'checked_at' => Carbon::now()->format('d/m/Y H:i:s'),
                'timestamp' => time(),
            ];

            $this->saveCache($result);

            return $result;
        } catch (Exception $e) {
            Log::warning('SystemUpdate check failed: '.$e->getMessage());

            return $this->buildFallbackResult(
                $currentVersion,
                'Tidak dapat terhubung ke server pembaharuan. Pastikan perangkat terhubung ke internet, atau gunakan fitur Upload Installer Manual (.exe).'
            );
        }
    }

    /**
     * Mengunduh asset installer .exe dari GitHub Releases dengan dukungan auto-resume (.part + Range)
     * dan auto-retry hingga 6 kali agar unduhan berukuran besar (>300 MB) tahan putus koneksi.
     */
    public function downloadReleaseAsset(
        string $assetApiUrl,
        string $destinationPath,
        callable $onProgress,
        int $expectedSize = 0,
        ?callable $onRetry = null
    ): void {
        $parentDir = dirname($destinationPath);
        if (! is_dir($parentDir)) {
            @mkdir($parentDir, 0755, true);
        }

        if ($this->hasCompleteExecutable($destinationPath, $expectedSize)) {
            $onProgress(1.0, $expectedSize, $expectedSize);

            return;
        }

        $partPath = $destinationPath.'.part';
        $chunkPath = $destinationPath.'.chunk';
        $baseHeaders = $this->buildAssetDownloadHeaders($assetApiUrl);
        $maxAttempts = 6;
        $lastError = 'Koneksi terputus sebelum unduhan selesai.';

        for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
            if (file_exists($chunkPath)) {
                @unlink($chunkPath);
            }

            clearstatcache(true, $partPath);
            $existingBytes = file_exists($partPath) ? (int) @filesize($partPath) : 0;

            // Pastikan sisa file .part benar-benar berawalan executable "MZ" dan tidak melebihi ukuran target
            if ($existingBytes > 0 && (! $this->hasMzHeader($partPath) || ($expectedSize > 0 && $existingBytes > $expectedSize))) {
                @unlink($partPath);
                $existingBytes = 0;
            }

            if ($this->hasCompleteExecutable($partPath, $expectedSize)) {
                if (@rename($partPath, $destinationPath)) {
                    $onProgress(1.0, $expectedSize, $expectedSize);

                    return;
                }
            }

            $requestHeaders = $baseHeaders;
            if ($existingBytes > 0) {
                $requestHeaders['Range'] = "bytes={$existingBytes}-";
            }

            $lastReportedTime = 0.0;
            $finalStatusCode = null;
            $attemptSucceeded = false;
            $curlOptions = [
                \CURLOPT_HTTP_VERSION => \CURL_HTTP_VERSION_1_1,
                \CURLOPT_TCP_KEEPALIVE => 1,
                \CURLOPT_LOW_SPEED_LIMIT => 1024,
                \CURLOPT_LOW_SPEED_TIME => 45,
            ];

            try {
                $response = Http::withHeaders($requestHeaders)
                    ->connectTimeout(30)
                    ->timeout(0)
                    ->withOptions([
                        'sink' => $chunkPath,
                        'curl' => $curlOptions,
                        'on_headers' => static function ($res) use (&$finalStatusCode): void {
                            $finalStatusCode = $res->getStatusCode();
                        },
                        'progress' => function (int $downloadTotal, int $downloadedBytes) use ($onProgress, &$lastReportedTime, $existingBytes, $expectedSize): void {
                            $totalBytes = $expectedSize > 0
                                ? $expectedSize
                                : ($downloadTotal > 0 ? $existingBytes + $downloadTotal : 0);
                            $currentBytes = $existingBytes + $downloadedBytes;
                            $now = microtime(true);

                            if ($totalBytes > 0 && (($now - $lastReportedTime) >= 0.35 || $currentBytes >= $totalBytes)) {
                                $lastReportedTime = $now;
                                $ratio = min(1.0, $currentBytes / $totalBytes);
                                $onProgress($ratio, $currentBytes, $totalBytes);
                            }
                        },
                    ])
                    ->get($assetApiUrl);

                if ($finalStatusCode === null) {
                    $finalStatusCode = $response->status();
                }

                if ($response->successful()) {
                    $attemptSucceeded = true;
                } else {
                    $lastError = 'HTTP '.$response->status();
                }
            } catch (Throwable $e) {
                $lastError = $e->getMessage();
                Log::warning("SystemUpdate download attempt {$attempt}/{$maxAttempts} interrupted: {$lastError}");
            }

            $this->mergeDownloadedChunk($chunkPath, $partPath, $finalStatusCode, $existingBytes);

            if ($finalStatusCode === 416) {
                $lastError = 'HTTP 416 (Range tidak valid)';
            }

            clearstatcache(true, $partPath);
            $partSize = file_exists($partPath) ? (int) @filesize($partPath) : 0;

            $isComplete = $expectedSize > 0
                ? $this->hasCompleteExecutable($partPath, $expectedSize)
                : ($attemptSucceeded && $this->validateExecutableFile($partPath));

            if ($isComplete) {
                if (@rename($partPath, $destinationPath)) {
                    $finalTotal = $expectedSize > 0 ? $expectedSize : $partSize;
                    $onProgress(1.0, $finalTotal, $finalTotal);

                    return;
                }

                throw new Exception('Gagal memindahkan paket installer yang telah selesai diunduh.');
            }

            if ($attemptSucceeded && $expectedSize <= 0 && ! $this->validateExecutableFile($partPath)) {
                @unlink($partPath);
                throw new Exception('Berkas yang diunduh tidak valid atau rusak (bukan installer Windows .exe yang sah).');
            }

            if ($attempt < $maxAttempts) {
                if ($onRetry !== null) {
                    $onRetry($attempt + 1, $maxAttempts, $partSize, $expectedSize);
                }

                if (! app()->runningUnitTests()) {
                    usleep(1500000);
                }
            }
        }

        clearstatcache(true, $partPath);
        $savedBytes = file_exists($partPath) ? (int) @filesize($partPath) : 0;
        $savedLabel = $this->formatBytes($savedBytes);
        $targetLabel = $expectedSize > 0 ? ' dari '.$this->formatBytes($expectedSize) : '';

        throw new Exception(
            "Unduhan terputus setelah {$maxAttempts} percobaan otomatis ({$savedLabel}{$targetLabel} tersimpan sementara). Klik \"Coba Lagi\" untuk melanjutkan unduhan. Detail: {$lastError}"
        );
    }

    /**
     * Memeriksa apakah file target sudah berukuran lengkap ($expectedSize > 0) dan valid sebagai executable.
     */
    protected function hasCompleteExecutable(string $filePath, int $expectedSize): bool
    {
        if ($expectedSize <= 0) {
            return false;
        }

        clearstatcache(true, $filePath);

        return file_exists($filePath)
            && (int) @filesize($filePath) === $expectedSize
            && $this->validateExecutableFile($filePath);
    }

    /**
     * Menggabungkan potongan unduhan (.chunk) ke berkas sementara (.part) sesuai status HTTP.
     */
    protected function mergeDownloadedChunk(string $chunkPath, string $partPath, ?int $statusCode, int $existingBytes): void
    {
        if ($statusCode === 416) {
            @unlink($chunkPath);
            @unlink($partPath);

            return;
        }

        clearstatcache(true, $chunkPath);
        if (! file_exists($chunkPath)) {
            return;
        }

        $chunkSize = (int) @filesize($chunkPath);
        if ($chunkSize <= 0) {
            @unlink($chunkPath);

            return;
        }

        if ($statusCode === 206) {
            $source = @fopen($chunkPath, 'rb');
            $target = @fopen($partPath, 'ab');
            if ($source && $target) {
                @stream_copy_to_stream($source, $target);
            }
            if ($source) {
                @fclose($source);
            }
            if ($target) {
                @fclose($target);
            }
            @unlink($chunkPath);

            return;
        }

        if ($statusCode === 200 && $this->hasMzHeader($chunkPath) && $chunkSize > $existingBytes) {
            if (file_exists($partPath)) {
                @unlink($partPath);
            }
            if (! @rename($chunkPath, $partPath)) {
                @unlink($chunkPath);
            }

            return;
        }

        @unlink($chunkPath);
    }

    /**
     * Memvalidasi header download sesuai endpoint (GitHub API asset URL vs direct download URL).
     */
    protected function buildAssetDownloadHeaders(string $assetUrl): array
    {
        if (str_contains($assetUrl, '//api.github.com/')) {
            return $this->buildGithubHeaders('application/octet-stream');
        }

        $headers = [
            'Accept' => '*/*',
            'User-Agent' => 'newSIKAS-Updater/1.0',
        ];

        $token = trim((string) config('updater.github.token', ''));
        if ($token !== '' && str_contains($assetUrl, '//github.com/')) {
            $headers['Authorization'] = 'Bearer '.$token;
        }

        return $headers;
    }

    /**
     * Memvalidasi bahwa berkas adalah executable Windows (.exe) yang memiliki header PE "MZ".
     */
    public function validateExecutableFile(string $filePath): bool
    {
        clearstatcache(true, $filePath);
        if (! file_exists($filePath) || (int) @filesize($filePath) < 10240) {
            return false;
        }

        return $this->hasMzHeader($filePath);
    }

    /**
     * Memeriksa 2 byte pertama berkas memiliki signature PE Executable "MZ".
     */
    protected function hasMzHeader(string $filePath): bool
    {
        if (! file_exists($filePath)) {
            return false;
        }

        $handle = @fopen($filePath, 'rb');
        if (! $handle) {
            return false;
        }

        $magic = @fread($handle, 2);
        @fclose($handle);

        return $magic === 'MZ';
    }

    /**
     * Menghasilkan isi script batch Windows untuk menjalankan silent update terisolasi.
     */
    public function buildUpdateBatchScript(
        string $externalInstallerPath,
        string $logPath,
        string $doneFlagPath,
        string $failedFlagPath,
        string $targetVersion
    ): string {
        return "@echo off\r\n"
            ."setlocal EnableExtensions\r\n"
            ."cd /d \"%TEMP%\"\r\n"
            ."ping 127.0.0.1 -n 4 > NUL\r\n"
            ."net stop newsikas_server > NUL 2>&1\r\n"
            ."taskkill /F /IM httpd.exe > NUL 2>&1\r\n"
            ."\"{$externalInstallerPath}\" /VERYSILENT /SUPPRESSMSGBOXES /NORESTART /NOCLOSEAPPLICATIONS /UPDATE /LOG=\"{$logPath}\"\r\n"
            ."set \"EXIT_CODE=%ERRORLEVEL%\"\r\n"
            ."net start newsikas_DB > NUL 2>&1\r\n"
            ."net start newsikas_server > NUL 2>&1\r\n"
            ."if \"%EXIT_CODE%\"==\"0\" (\r\n"
            ."    > \"{$doneFlagPath}\" echo {$targetVersion}\r\n"
            .") else (\r\n"
            ."    > \"{$failedFlagPath}\" echo %EXIT_CODE%\r\n"
            .")\r\n"
            ."del /f /q \"{$externalInstallerPath}\" > NUL 2>&1\r\n"
            ."del \"%~f0\" > NUL 2>&1\r\n";
    }

    /**
     * Meluncurkan installer Inno Setup secara silent pada proses terpisah (detached process)
     * agar tidak mewarisi handle socket port 8773 milik Apache dan tetap berjalan saat server di-restart.
     */
    public function launchDetachedInstaller(string $installerPath, string $updateId, string $targetVersion): void
    {
        $safeId = $this->sanitizeId($updateId);
        $tempSysDir = rtrim(sys_get_temp_dir(), '\\/');
        $doneFlagPath = $this->getDoneFlagPath($safeId);
        $failedFlagPath = $this->getFailedFlagPath($safeId);
        $logPath = $this->getLogFilePath($safeId);
        $batPath = $this->getBatchFilePath($safeId);

        foreach ([$doneFlagPath, $failedFlagPath] as $staleFlag) {
            if (file_exists($staleFlag)) {
                @unlink($staleFlag);
            }
        }

        // Salin installer ke folder temp sistem Windows agar tidak berada di dalam folder wwwroot yang sedang di-update
        $externalInstallerPath = $tempSysDir.DIRECTORY_SEPARATOR."newSIKAS_Update_{$safeId}.exe";
        if (! @copy($installerPath, $externalInstallerPath)) {
            $externalInstallerPath = $installerPath;
        } else {
            @unlink($installerPath);
        }

        $batContent = $this->buildUpdateBatchScript(
            $externalInstallerPath,
            $logPath,
            $doneFlagPath,
            $failedFlagPath,
            $targetVersion
        );

        file_put_contents($batPath, $batContent);

        if (PHP_OS_FAMILY === 'Windows') {
            $this->spawnDetachedWindowsBatch($batPath, $tempSysDir);
        }
    }

    /**
     * Menjalankan file batch Windows via WMI (Win32_Process.Create) agar proses terpisah total
     * dari Apache/PHP dan tidak mewarisi socket port 8773 maupun file handle layanan.
     */
    protected function spawnDetachedWindowsBatch(string $batPath, string $workingDir): void
    {
        $commandLine = 'cmd.exe /c ""'.$batPath.'""';
        $psCommand = str_replace("'", "''", $commandLine);
        $psDir = str_replace("'", "''", $workingDir);

        $systemRoot = getenv('SystemRoot') ?: 'C:\\Windows';
        $psExe = rtrim($systemRoot, '\\/').'\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
        if (! file_exists($psExe)) {
            $psExe = 'powershell';
        }

        $psScript = "\$ProgressPreference='SilentlyContinue'; try { "
            ."\$si = ([wmiclass]'Win32_ProcessStartup').CreateInstance(); "
            .'$si.ShowWindow = 0; '
            ."\$r = ([wmiclass]'Win32_Process').Create('{$psCommand}', '{$psDir}', \$si); "
            .'if ($null -eq $r -or $null -eq $r.ReturnValue) { exit 1 }; '
            .'exit [int]$r.ReturnValue } catch { exit 1 }';

        $encoded = base64_encode(mb_convert_encoding($psScript, 'UTF-16LE', 'UTF-8'));
        $psOutput = [];
        $psExit = 1;
        @exec('"'.$psExe.'" -NoProfile -NonInteractive -WindowStyle Hidden -EncodedCommand '.$encoded.' 2> NUL', $psOutput, $psExit);

        if ($psExit === 0) {
            return;
        }

        // Fallback terakhir bila WMI PowerShell tidak tersedia
        @pclose(@popen('start "" /B cmd /c "'.$batPath.'"', 'r'));
    }

    /**
     * Menyimpan progres eksekusi update ke berkas JSON sementara.
     */
    public function setProgress(string $updateId, int $percent, string $phase, string $message, array $extra = []): void
    {
        $safeId = $this->sanitizeId($updateId);
        $tempDir = storage_path('app/temp');
        if (! is_dir($tempDir)) {
            @mkdir($tempDir, 0755, true);
        }

        $progressFile = $this->getProgressFilePath($safeId);
        $payload = array_merge([
            'percent' => $percent,
            'phase' => $phase,
            'message' => $message,
            'current_version' => $this->getCurrentVersion(),
            'updated_at' => microtime(true),
        ], $extra);

        @file_put_contents($progressFile, json_encode($payload));
    }

    /**
     * Membaca progres eksekusi update dan mendeteksi otomatis jika versi baru sudah aktif
     * atau installer selesai / gagal.
     */
    public function getProgress(string $updateId): array
    {
        $safeId = $this->sanitizeId($updateId);
        $progressFile = $this->getProgressFilePath($safeId);
        $doneFlagPath = $this->getDoneFlagPath($safeId);
        $failedFlagPath = $this->getFailedFlagPath($safeId);
        $logPath = $this->getLogFilePath($safeId);
        $currentVersion = $this->getCurrentVersion();

        $data = [
            'percent' => 10,
            'phase' => 'preparing',
            'message' => 'Menyiapkan proses pembaharuan...',
            'current_version' => $currentVersion,
        ];

        if (file_exists($progressFile)) {
            $decoded = json_decode((string) @file_get_contents($progressFile), true);
            if (is_array($decoded)) {
                $data = array_merge($data, $decoded);
                $data['current_version'] = $currentVersion;
            }
        }

        if (file_exists($failedFlagPath)) {
            $exitCode = trim((string) @file_get_contents($failedFlagPath));
            $exitCode = $exitCode !== '' ? $exitCode : 'tidak diketahui';
            $logTail = $this->readLogTail($logPath, 4);
            @unlink($failedFlagPath);

            $data['percent'] = 100;
            $data['phase'] = 'error';
            $data['failed_step'] = 3;
            $data['message'] = "Installer gagal dijalankan (Kode keluar: {$exitCode}).".($logTail !== '' ? " Log: {$logTail}" : '');
            @file_put_contents($progressFile, json_encode($data));

            return $data;
        }

        $initialVersion = ! empty($data['initial_version'])
            ? $this->normalizeVersion((string) $data['initial_version'])
            : null;

        // Selesai apabila flag selesai dari batch installer sudah terbuat, atau versi aplikasi sudah naik dibanding initial_version
        $versionIncreased = $initialVersion !== null && version_compare($currentVersion, $initialVersion, '>');
        if (($data['phase'] ?? '') !== 'error' && (file_exists($doneFlagPath) || ($versionIncreased && ($data['phase'] ?? '') === 'installing'))) {
            $data['percent'] = 100;
            $data['phase'] = 'completed';
            $data['message'] = "Pembaharuan berhasil dipasang! Aplikasi kini berjalan pada versi v{$currentVersion}.";
            @file_put_contents($progressFile, json_encode($data));
        }

        return $data;
    }

    /**
     * Membaca beberapa baris terakhir log Inno Setup secara efisien untuk diagnosa error.
     */
    protected function readLogTail(string $logPath, int $maxLines = 4): string
    {
        if (! file_exists($logPath) || ! is_readable($logPath)) {
            return '';
        }

        $size = @filesize($logPath);
        if (! is_int($size) || $size <= 0) {
            return '';
        }

        $handle = @fopen($logPath, 'rb');
        if (! $handle) {
            return '';
        }

        $chunkSize = min($size, 8192);
        @fseek($handle, -$chunkSize, SEEK_END);
        $content = (string) @fread($handle, $chunkSize);
        @fclose($handle);

        $lines = preg_split('/\r\n|\r|\n/', trim($content)) ?: [];
        $lines = array_values(array_filter(array_map('trim', $lines), static fn (string $line): bool => $line !== ''));
        if ($lines === []) {
            return '';
        }

        return implode(' | ', array_slice($lines, -max(1, $maxLines)));
    }

    /**
     * Membuat header standar GitHub API beserta Bearer token (jika tersedia).
     */
    protected function buildGithubHeaders(string $accept = 'application/vnd.github+json'): array
    {
        $token = trim((string) config('updater.github.token', ''));
        $headers = [
            'Accept' => $accept,
            'X-GitHub-Api-Version' => '2022-11-28',
            'User-Agent' => 'newSIKAS-Updater/1.0',
        ];

        if ($token !== '') {
            $headers['Authorization'] = 'Bearer '.$token;
        }

        return $headers;
    }

    /**
     * Format ukuran byte menjadi KB / MB / GB yang mudah dibaca.
     */
    public function formatBytes(int $size, int $precision = 2): string
    {
        if ($size <= 0) {
            return '0 B';
        }

        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $val = (float) $size;
        $i = 0;

        while ($val > 1024 && $i < count($units) - 1) {
            $val /= 1024;
            $i++;
        }

        return round($val, $precision).' '.$units[$i];
    }

    protected function buildFallbackResult(string $currentVersion, string $errorMessage): array
    {
        return [
            'status' => 'error',
            'error_message' => $errorMessage,
            'current_version' => $currentVersion,
            'latest_version' => $currentVersion,
            'tag_name' => "v{$currentVersion}",
            'release_name' => "newSIKAS v{$currentVersion}",
            'changelog' => '',
            'published_at' => '-',
            'has_update' => false,
            'asset' => null,
            'checked_at' => Carbon::now()->format('d/m/Y H:i:s'),
            'timestamp' => time(),
        ];
    }

    protected function saveCache(array $payload): void
    {
        $cacheFile = $this->getCacheFilePath();
        $dir = dirname($cacheFile);
        if (! is_dir($dir)) {
            @mkdir($dir, 0755, true);
        }

        @file_put_contents($cacheFile, json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    }

    protected function getCacheFilePath(): string
    {
        return storage_path('app/temp/update_check_cache.json');
    }

    protected function getProgressFilePath(string $safeId): string
    {
        return storage_path("app/temp/update_progress_{$safeId}.json");
    }

    public function getDoneFlagPath(string $safeId): string
    {
        return $this->tempSystemPath('sikas_update_done_'.$this->sanitizeId($safeId).'.flag');
    }

    public function getFailedFlagPath(string $safeId): string
    {
        return $this->tempSystemPath('sikas_update_failed_'.$this->sanitizeId($safeId).'.flag');
    }

    public function getLogFilePath(string $safeId): string
    {
        return $this->tempSystemPath('sikas_update_'.$this->sanitizeId($safeId).'.log');
    }

    public function getBatchFilePath(string $safeId): string
    {
        return $this->tempSystemPath('sikas_run_update_'.$this->sanitizeId($safeId).'.bat');
    }

    protected function tempSystemPath(string $filename): string
    {
        return rtrim(sys_get_temp_dir(), '\\/').DIRECTORY_SEPARATOR.$filename;
    }

    protected function sanitizeId(string $id): string
    {
        return preg_replace('/[^a-zA-Z0-9_-]/', '', $id) ?: 'default';
    }
}
