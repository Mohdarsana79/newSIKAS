<?php

namespace App\Services;

use Carbon\Carbon;
use Exception;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

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
        $assetPattern = (string) config('updater.github.asset_pattern', '/^newSIKAS_Installer_.*\.exe$/i');

        $headers = $this->buildGithubHeaders('application/vnd.github+json');

        try {
            $url = "https://api.github.com/repos/{$owner}/{$repo}/releases/latest";
            $response = Http::withHeaders($headers)->timeout(15)->get($url);

            if ($response->status() === 404) {
                return $this->buildFallbackResult(
                    $currentVersion,
                    "Belum ada rilis pembaharuan yang dipublikasikan pada GitHub Releases ({$owner}/{$repo})."
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

            // Cari file installer .exe pada daftar assets rilis
            $matchedAsset = null;
            foreach (($release['assets'] ?? []) as $asset) {
                $assetName = (string) ($asset['name'] ?? '');
                if (preg_match($assetPattern, $assetName)) {
                    $matchedAsset = $asset;
                    break;
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
     * Mengunduh asset installer .exe dari GitHub Releases (mendukung Private Repo via API URL).
     */
    public function downloadReleaseAsset(string $assetApiUrl, string $destinationPath, callable $onProgress): void
    {
        $parentDir = dirname($destinationPath);
        if (! is_dir($parentDir)) {
            @mkdir($parentDir, 0755, true);
        }

        $headers = $this->buildGithubHeaders('application/octet-stream');

        $lastReportedTime = 0.0;

        $response = Http::withHeaders($headers)
            ->withOptions([
                'sink' => $destinationPath,
                'progress' => function (int $downloadTotal, int $downloadedBytes) use ($onProgress, &$lastReportedTime) {
                    $now = microtime(true);
                    if ($downloadTotal > 0 && (($now - $lastReportedTime) >= 0.35 || $downloadedBytes === $downloadTotal)) {
                        $lastReportedTime = $now;
                        $ratio = min(1.0, $downloadedBytes / $downloadTotal);
                        $onProgress($ratio, $downloadedBytes, $downloadTotal);
                    }
                },
            ])
            ->timeout(1800)
            ->get($assetApiUrl);

        if (! $response->successful()) {
            @unlink($destinationPath);
            throw new Exception('Gagal mengunduh paket installer dari GitHub (HTTP '.$response->status().').');
        }

        if (! $this->validateExecutableFile($destinationPath)) {
            @unlink($destinationPath);
            throw new Exception('Berkas yang diunduh tidak valid atau rusak (bukan installer Windows .exe yang sah).');
        }
    }

    /**
     * Memvalidasi bahwa berkas adalah executable Windows (.exe) yang memiliki header PE "MZ".
     */
    public function validateExecutableFile(string $filePath): bool
    {
        if (! file_exists($filePath) || filesize($filePath) < 10240) {
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
     * Meluncurkan installer Inno Setup secara silent pada proses terpisah (detached process)
     * agar tetap berjalan meskipun Apache (newsikas_server) di-restart oleh installer.
     */
    public function launchDetachedInstaller(string $installerPath, string $updateId, string $targetVersion): void
    {
        $safeId = $this->sanitizeId($updateId);
        $tempSysDir = rtrim(sys_get_temp_dir(), '\\/');
        $doneFlagPath = $this->getDoneFlagPath($safeId);
        $logPath = $tempSysDir.DIRECTORY_SEPARATOR."sikas_update_{$safeId}.log";
        $batPath = $tempSysDir.DIRECTORY_SEPARATOR."sikas_run_update_{$safeId}.bat";

        if (file_exists($doneFlagPath)) {
            @unlink($doneFlagPath);
        }

        // Salin installer ke folder temp sistem Windows agar tidak berada di dalam folder wwwroot yang sedang di-update
        $externalInstallerPath = $tempSysDir.DIRECTORY_SEPARATOR."newSIKAS_Update_{$safeId}.exe";
        if (! @copy($installerPath, $externalInstallerPath)) {
            $externalInstallerPath = $installerPath;
        } else {
            @unlink($installerPath);
        }

        $batContent = "@echo off\r\n"
            ."timeout /t 2 /nobreak > NUL\r\n"
            ."\"{$externalInstallerPath}\" /VERYSILENT /SUPPRESSMSGBOXES /NORESTART /CLOSEAPPLICATIONS /UPDATE /LOG=\"{$logPath}\"\r\n"
            ."echo {$targetVersion} > \"{$doneFlagPath}\"\r\n"
            ."del /f /q \"{$externalInstallerPath}\" > NUL 2>&1\r\n"
            ."del \"%~f0\" > NUL 2>&1\r\n";

        file_put_contents($batPath, $batContent);

        if (PHP_OS_FAMILY === 'Windows') {
            $cmd = 'start "" /B cmd /c "'.$batPath.'"';
            @pclose(@popen($cmd, 'r'));
        }
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
     * Membaca progres eksekusi update dan mendeteksi otomatis jika versi baru sudah aktif.
     */
    public function getProgress(string $updateId): array
    {
        $safeId = $this->sanitizeId($updateId);
        $progressFile = $this->getProgressFilePath($safeId);
        $doneFlagPath = $this->getDoneFlagPath($safeId);
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

        $initialVersion = ! empty($data['initial_version'])
            ? $this->normalizeVersion((string) $data['initial_version'])
            : null;

        // Selesai apabila flag selesai dari batch installer sudah terbuat, atau versi aplikasi sudah naik dibanding initial_version
        $versionIncreased = $initialVersion !== null && version_compare($currentVersion, $initialVersion, '>');
        if (file_exists($doneFlagPath) || ($versionIncreased && ($data['phase'] ?? '') === 'installing')) {
            $data['percent'] = 100;
            $data['phase'] = 'completed';
            $data['message'] = "Pembaharuan berhasil dipasang! Aplikasi kini berjalan pada versi v{$currentVersion}.";
            @file_put_contents($progressFile, json_encode($data));
        }

        return $data;
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

    protected function getDoneFlagPath(string $safeId): string
    {
        return rtrim(sys_get_temp_dir(), '\\/').DIRECTORY_SEPARATOR."sikas_update_done_{$safeId}.flag";
    }

    protected function sanitizeId(string $id): string
    {
        return preg_replace('/[^a-zA-Z0-9_-]/', '', $id) ?: 'default';
    }
}
