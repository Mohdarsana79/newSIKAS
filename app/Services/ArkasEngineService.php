<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Symfony\Component\Process\Process;

class ArkasEngineService
{
    public function __construct(
        protected ?ArkasStateStore $stateStore = null
    ) {
        $this->stateStore = $stateStore ?? new ArkasStateStore;
    }

    /**
     * Cache per-request environment variables resolved via PowerShell so we don't spawn PowerShell repeatedly.
     *
     * @var array<string, string>|null
     */
    protected ?array $cachedWindowsEnv = null;

    public function stateStore(): ArkasStateStore
    {
        return $this->stateStore;
    }

    /**
     * Normalize a configured or submitted file path.
     */
    public function normalizePath(?string $path): string
    {
        $clean = trim((string) $path, "\"' \t\n\r\0\x0B");

        return str_replace('\\', '/', $clean);
    }

    /**
     * Get the absolute path to the uploaded arkas.db file (for cloud/VPS mode).
     */
    public function getUploadedDbPath(): string
    {
        return $this->normalizePath((string) config('arkas.upload_path', storage_path('app/arkas_uploads/arkas.db')));
    }

    /**
     * Resolve the effective arkas.db path and source strictly according to active_mode ('local' vs 'online').
     *
     * @return array{path: string, source: 'manual'|'uploaded'|'manual_missing'|'uploaded_missing'|'auto'|'none', active_mode: 'local'|'online', exists: bool}
     */
    public function resolveDatabaseSource(?string $overridePath = null): array
    {
        $activeMode = $this->stateStore->getActiveMode();

        if ($overridePath !== null) {
            $normalizedOverride = $this->normalizePath($overridePath);
            if ($normalizedOverride !== '' && is_file($normalizedOverride)) {
                return [
                    'path' => $normalizedOverride,
                    'source' => 'manual',
                    'active_mode' => $activeMode,
                    'exists' => true,
                ];
            }

            return [
                'path' => $normalizedOverride,
                'source' => $normalizedOverride !== '' ? 'manual_missing' : 'none',
                'active_mode' => $activeMode,
                'exists' => false,
            ];
        }

        if ($activeMode === ArkasStateStore::MODE_ONLINE) {
            $uploadPath = $this->getUploadedDbPath();
            if ($uploadPath !== '' && is_file($uploadPath)) {
                return [
                    'path' => $uploadPath,
                    'source' => 'uploaded',
                    'active_mode' => ArkasStateStore::MODE_ONLINE,
                    'exists' => true,
                ];
            }

            return [
                'path' => $uploadPath,
                'source' => 'uploaded_missing',
                'active_mode' => ArkasStateStore::MODE_ONLINE,
                'exists' => false,
            ];
        }

        $manualPath = $this->normalizePath((string) config('arkas.db_path', ''));

        if ($manualPath !== '' && is_file($manualPath)) {
            return [
                'path' => $manualPath,
                'source' => 'manual',
                'active_mode' => ArkasStateStore::MODE_LOCAL,
                'exists' => true,
            ];
        }

        if ($manualPath !== '') {
            return [
                'path' => $manualPath,
                'source' => 'manual_missing',
                'active_mode' => ArkasStateStore::MODE_LOCAL,
                'exists' => false,
            ];
        }

        $autoDetected = $this->autoDetectWindowsDatabasePath();
        if ($autoDetected !== null) {
            return [
                'path' => $autoDetected,
                'source' => 'auto',
                'active_mode' => ArkasStateStore::MODE_LOCAL,
                'exists' => true,
            ];
        }

        return [
            'path' => '',
            'source' => 'none',
            'active_mode' => ArkasStateStore::MODE_LOCAL,
            'exists' => false,
        ];
    }

    /**
     * Lightweight status summary safe to share via HandleInertiaRequests (no Python process spawned).
     *
     * @return array{active_mode: 'local'|'online', source: string, exists: bool}
     */
    public function getSharedStatusSummary(): array
    {
        $activeMode = $this->stateStore->getActiveMode();

        if ($activeMode === ArkasStateStore::MODE_ONLINE) {
            $uploadPath = $this->getUploadedDbPath();
            $exists = $uploadPath !== '' && is_file($uploadPath);

            return [
                'active_mode' => ArkasStateStore::MODE_ONLINE,
                'source' => $exists ? 'uploaded' : 'uploaded_missing',
                'exists' => $exists,
            ];
        }

        $manualPath = $this->normalizePath((string) config('arkas.db_path', ''));
        if ($manualPath !== '') {
            $exists = is_file($manualPath);

            return [
                'active_mode' => ArkasStateStore::MODE_LOCAL,
                'source' => $exists ? 'manual' : 'manual_missing',
                'exists' => $exists,
            ];
        }

        $autoDetected = $this->autoDetectWindowsDatabasePathFast();

        return [
            'active_mode' => ArkasStateStore::MODE_LOCAL,
            'source' => $autoDetected !== null ? 'auto' : 'none',
            'exists' => $autoDetected !== null,
        ];
    }

    /**
     * Check quickly if an ARKAS database file is discoverable on disk (manual, uploaded, or Windows profile).
     */
    public function hasDiscoverableDatabase(?string $overridePath = null): bool
    {
        return $this->resolveDatabaseSource($overridePath)['exists'];
    }

    /**
     * Build environment variables required by Python + SQLCipher on Windows without hardcoded developer usernames.
     *
     * @return array<string, string>
     */
    public function buildExecutionEnvironment(): array
    {
        if ($this->cachedWindowsEnv !== null) {
            return $this->cachedWindowsEnv;
        }

        $env = [];
        foreach ($_SERVER as $key => $value) {
            if (is_string($key) && (is_string($value) || is_numeric($value))) {
                $env[$key] = (string) $value;
            }
        }
        unset($env['OPENSSL_CONF']);

        $appdata = $env['APPDATA'] ?? '';
        $userprofile = $env['USERPROFILE'] ?? '';

        if (PHP_OS_FAMILY === 'Windows') {
            if ($appdata === '') {
                $appdata = trim((string) @shell_exec("powershell -NoProfile -NonInteractive -Command \"[Environment]::GetFolderPath('ApplicationData')\""));
            }
            if ($userprofile === '') {
                $userprofile = trim((string) @shell_exec("powershell -NoProfile -NonInteractive -Command \"[Environment]::GetFolderPath('UserProfile')\""));
            }
            if ($userprofile === '' && $appdata !== '') {
                $userprofile = dirname(dirname($appdata));
            }
            if ($appdata === '' && $userprofile !== '') {
                $appdata = rtrim($userprofile, '\\/').'\\AppData\\Roaming';
            }

            $env['SystemRoot'] = $env['SystemRoot'] ?? (getenv('SystemRoot') ?: 'C:\\Windows');
            $env['SystemDrive'] = $env['SystemDrive'] ?? (getenv('SystemDrive') ?: 'C:');
            if ($userprofile !== '') {
                $env['USERPROFILE'] = $userprofile;
            }
            if ($appdata !== '') {
                $env['APPDATA'] = $appdata;
            }
            if (empty($env['LOCALAPPDATA']) && $userprofile !== '') {
                $env['LOCALAPPDATA'] = rtrim($userprofile, '\\/').'\\AppData\\Local';
            }
            $fallbackTemp = sys_get_temp_dir();
            $env['TEMP'] = ! empty($env['TEMP']) ? $env['TEMP'] : $fallbackTemp;
            $env['TMP'] = ! empty($env['TMP']) ? $env['TMP'] : $env['TEMP'];
        }

        $this->cachedWindowsEnv = $env;

        return $env;
    }

    /**
     * Execute an ARKAS Python script and return its decoded JSON response (never throws on missing DB/engine).
     *
     * @param  array<int, string>  $args
     * @param  array<string, string>  $extraEnv
     * @return array<string, mixed>
     */
    public function runScriptRaw(
        string $scriptName,
        array $args = [],
        int $timeout = 60,
        ?string $overridePath = null,
        array $extraEnv = []
    ): array {
        $engineDir = rtrim((string) config('arkas.engine_dir', storage_path('app/arkas_engine')), '\\/');
        $pythonExe = PHP_OS_FAMILY === 'Windows' ? 'python.exe' : 'python3';
        $pythonPath = $engineDir.DIRECTORY_SEPARATOR.$pythonExe;
        $scriptPath = $engineDir.DIRECTORY_SEPARATOR.$scriptName;

        if (! is_file($pythonPath) || ! is_file($scriptPath)) {
            return [
                'status' => 'error',
                'error_type' => 'ENGINE_NOT_FOUND',
                'error' => 'Arkas Engine tidak ditemukan di direktori storage/app/arkas_engine.',
                'message' => 'Engine python ARKAS tidak ditemukan di direktori storage/app/arkas_engine.',
            ];
        }

        $resolved = $this->resolveDatabaseSource($overridePath);
        if (! $resolved['exists']) {
            $missingMsg = match ($resolved['source']) {
                'manual_missing' => "Database arkas.db tidak ditemukan pada jalur manual: {$resolved['path']}. Silakan periksa jalur file pada tab Mode PC Lokal di menu Path Arkas.",
                'uploaded_missing' => 'Mode Online / VPS sedang aktif, tetapi belum ada file arkas.db yang diunggah ke server. Silakan unggah file arkas.db atau jalankan Agent Sync pada menu Path Arkas.',
                default => 'Database arkas.db tidak ditemukan di server ini. Atur jalur lokal pada tab Mode PC Lokal atau aktifkan Mode Online / VPS dan unggah file arkas.db di menu Path Arkas.',
            };

            return [
                'status' => 'error',
                'error_type' => 'DB_NOT_FOUND',
                'error' => $missingMsg,
                'message' => $missingMsg,
            ];
        }

        $command = array_merge([$pythonPath, $scriptPath], $args, [$resolved['path']]);
        $env = array_merge($this->buildExecutionEnvironment(), $extraEnv);

        $process = new Process($command, null, $env);
        $process->setTimeout($timeout);
        $process->run();

        $output = trim($process->getOutput());
        $decoded = $output !== '' ? json_decode($output, true) : null;

        if (is_array($decoded)) {
            return $decoded;
        }

        if (! $process->isSuccessful()) {
            $errOut = trim($process->getErrorOutput());
            Log::warning("ArkasEngineService [{$scriptName}] failed", [
                'exit_code' => $process->getExitCode(),
                'stderr' => $errOut,
            ]);

            return [
                'status' => 'error',
                'error_type' => 'PROCESS_EXECUTION_FAILED',
                'error' => 'Gagal mengeksekusi engine ARKAS. '.$errOut,
                'message' => 'Gagal mengeksekusi engine ARKAS: '.$errOut,
            ];
        }

        Log::warning("ArkasEngineService [{$scriptName}] returned non-JSON", ['output' => $output]);

        return [
            'status' => 'error',
            'error_type' => 'INVALID_JSON_OUTPUT',
            'error' => 'Format output dari engine ARKAS tidak valid.',
            'message' => 'Format respons engine ARKAS tidak valid: '.$output,
        ];
    }

    /**
     * Execute an ARKAS Python script and throw \Exception when the engine reports an error.
     *
     * @param  array<int, string>  $args
     * @return array<string, mixed>
     *
     * @throws \Exception
     */
    public function runScriptOrThrow(
        string $scriptName,
        array $args = [],
        int $timeout = 60,
        ?string $overridePath = null
    ): array {
        $result = $this->runScriptRaw($scriptName, $args, $timeout, $overridePath);

        if (($result['status'] ?? null) === 'error' || isset($result['error'])) {
            throw new \Exception((string) ($result['message'] ?? $result['error'] ?? 'Terjadi kesalahan pada engine ARKAS.'));
        }

        return $result;
    }

    /**
     * Verify that an uploaded SQLite/SQLCipher file is a readable ARKAS database.
     *
     * @return array{valid: bool, years?: array<int, string>, message?: string}
     */
    public function verifyDatabaseFile(string $filePath): array
    {
        $normalized = $this->normalizePath($filePath);
        if (! is_file($normalized)) {
            return [
                'valid' => false,
                'message' => 'Berkas yang diunggah tidak ditemukan di server.',
            ];
        }

        $result = $this->runScriptRaw(
            'query.py',
            ['__VERIFY__', 'ALL'],
            60,
            $normalized,
            ['ARKAS_STRICT_PATH' => '1']
        );

        if (($result['status'] ?? null) === 'success') {
            return [
                'valid' => true,
                'years' => array_values(array_map('strval', $result['years'] ?? [])),
            ];
        }

        if (($result['error_type'] ?? null) === 'ENGINE_NOT_FOUND') {
            return $this->verifySqliteOrCipherHeaderFallback($normalized);
        }

        return [
            'valid' => false,
            'message' => (string) ($result['message'] ?? $result['error'] ?? 'Berkas bukan database ARKAS (arkas.db) yang valid.'),
        ];
    }

    /**
     * Fallback structural validation when the Python SQLCipher engine is unavailable.
     *
     * @return array{valid: bool, years?: array<int, string>, message?: string}
     */
    protected function verifySqliteOrCipherHeaderFallback(string $filePath): array
    {
        $size = (int) @filesize($filePath);
        if ($size < 1024) {
            return [
                'valid' => false,
                'message' => 'Ukuran file database ARKAS terlalu kecil atau corrupt.',
            ];
        }

        $handle = @fopen($filePath, 'rb');
        if (! $handle) {
            return [
                'valid' => false,
                'message' => 'Gagal membaca header file database yang diunggah.',
            ];
        }

        $header = (string) fread($handle, 16);
        fclose($handle);

        // Plain SQLite begins with "SQLite format 3\0"; SQLCipher encrypted files are 1024/4096-byte page-aligned.
        $isPlainSqlite = $header === "SQLite format 3\0";
        $isCipherAligned = ($size >= 4096) && ($size % 1024 === 0);

        if (! $isPlainSqlite && ! $isCipherAligned) {
            return [
                'valid' => false,
                'message' => 'File tidak dikenali sebagai database SQLite/SQLCipher ARKAS yang valid.',
            ];
        }

        return [
            'valid' => true,
            'years' => [],
        ];
    }

    /**
     * Ultra-fast Windows filesystem check without spawning PowerShell (safe for every Inertia request).
     */
    protected function autoDetectWindowsDatabasePathFast(): ?string
    {
        if (PHP_OS_FAMILY !== 'Windows') {
            return null;
        }

        $candidates = [];
        $appdata = (string) ($_SERVER['APPDATA'] ?? getenv('APPDATA') ?: '');
        $userprofile = (string) ($_SERVER['USERPROFILE'] ?? getenv('USERPROFILE') ?: '');

        if ($appdata !== '') {
            $candidates[] = rtrim($appdata, '\\/').DIRECTORY_SEPARATOR.'Arkas'.DIRECTORY_SEPARATOR.'arkas.db';
        }
        if ($userprofile !== '') {
            $candidates[] = rtrim($userprofile, '\\/').DIRECTORY_SEPARATOR.'AppData'.DIRECTORY_SEPARATOR.'Roaming'.DIRECTORY_SEPARATOR.'Arkas'.DIRECTORY_SEPARATOR.'arkas.db';
        }

        foreach ($candidates as $candidate) {
            if (is_file($candidate)) {
                return $this->normalizePath($candidate);
            }
        }

        $systemDrive = rtrim((string) ($_SERVER['SystemDrive'] ?? getenv('SystemDrive') ?: 'C:'), '\\/');
        foreach ([
            $systemDrive.'/Users/*/AppData/Roaming/Arkas/arkas.db',
            $systemDrive.'/Users/*/AppData/Local/Arkas/arkas.db',
        ] as $pattern) {
            $matches = glob($pattern);
            if (is_array($matches) && ! empty($matches[0]) && is_file($matches[0])) {
                return $this->normalizePath($matches[0]);
            }
        }

        return null;
    }

    /**
     * Attempt quick Windows filesystem discovery without spawning Python.
     */
    protected function autoDetectWindowsDatabasePath(): ?string
    {
        if (PHP_OS_FAMILY !== 'Windows') {
            return null;
        }

        $env = $this->buildExecutionEnvironment();

        $candidates = [];
        if (! empty($env['APPDATA'])) {
            $candidates[] = rtrim($env['APPDATA'], '\\/').DIRECTORY_SEPARATOR.'Arkas'.DIRECTORY_SEPARATOR.'arkas.db';
        }
        if (! empty($env['USERPROFILE'])) {
            $candidates[] = rtrim($env['USERPROFILE'], '\\/').DIRECTORY_SEPARATOR.'AppData'.DIRECTORY_SEPARATOR.'Roaming'.DIRECTORY_SEPARATOR.'Arkas'.DIRECTORY_SEPARATOR.'arkas.db';
        }

        foreach ($candidates as $candidate) {
            if (is_file($candidate)) {
                return $this->normalizePath($candidate);
            }
        }

        $systemDrive = rtrim($env['SystemDrive'] ?? 'C:', '\\/');
        foreach ([
            $systemDrive.'/Users/*/AppData/Roaming/Arkas/arkas.db',
            $systemDrive.'/Users/*/AppData/Local/Arkas/arkas.db',
        ] as $pattern) {
            $matches = glob($pattern);
            if (is_array($matches) && ! empty($matches[0]) && is_file($matches[0])) {
                return $this->normalizePath($matches[0]);
            }
        }

        return null;
    }
}
