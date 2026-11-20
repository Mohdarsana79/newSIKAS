<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Symfony\Component\Process\Process;

class ArkasEngineService
{
    /**
     * Cache per-request environment variables resolved via PowerShell so we don't spawn PowerShell repeatedly.
     *
     * @var array<string, string>|null
     */
    protected ?array $cachedWindowsEnv = null;

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
     * Resolve the effective arkas.db path and source without throwing.
     *
     * Priority:
     * 1. Explicit override / configured ARKAS_DB_PATH (if file exists)
     * 2. Uploaded arkas.db in storage/app/arkas_uploads/arkas.db (VPS mode)
     * 3. Configured ARKAS_DB_PATH even if missing (so user receives explicit invalid-path feedback)
     * 4. Local Windows auto-detection (%APPDATA%\Arkas\arkas.db or C:\Users\*\AppData\...\Arkas\arkas.db)
     *
     * @return array{path: string, source: 'manual'|'uploaded'|'manual_missing'|'auto'|'none', exists: bool}
     */
    public function resolveDatabaseSource(?string $overridePath = null): array
    {
        $manualPath = $this->normalizePath($overridePath !== null ? $overridePath : (string) config('arkas.db_path', ''));

        if ($manualPath !== '' && is_file($manualPath)) {
            return [
                'path' => $manualPath,
                'source' => 'manual',
                'exists' => true,
            ];
        }

        $uploadPath = $this->getUploadedDbPath();
        if ($uploadPath !== '' && is_file($uploadPath)) {
            return [
                'path' => $uploadPath,
                'source' => 'uploaded',
                'exists' => true,
            ];
        }

        if ($manualPath !== '') {
            return [
                'path' => $manualPath,
                'source' => 'manual_missing',
                'exists' => false,
            ];
        }

        $autoDetected = $this->autoDetectWindowsDatabasePath();
        if ($autoDetected !== null) {
            return [
                'path' => $autoDetected,
                'source' => 'auto',
                'exists' => true,
            ];
        }

        return [
            'path' => '',
            'source' => 'none',
            'exists' => false,
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
     * @return array<string, mixed>
     */
    public function runScriptRaw(
        string $scriptName,
        array $args = [],
        int $timeout = 60,
        ?string $overridePath = null
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
            $missingMsg = $resolved['source'] === 'manual_missing'
                ? "Database arkas.db tidak ditemukan pada jalur manual: {$resolved['path']}. Silakan periksa jalur file atau unggah file arkas.db melalui menu Path Arkas."
                : 'Database arkas.db tidak ditemukan di server ini. Jika berjalan di VPS/server online, silakan unggah file arkas.db melalui menu Path Arkas.';

            return [
                'status' => 'error',
                'error_type' => 'DB_NOT_FOUND',
                'error' => $missingMsg,
                'message' => $missingMsg,
            ];
        }

        $command = array_merge([$pythonPath, $scriptPath], $args, [$resolved['path']]);

        $process = new Process($command, null, $this->buildExecutionEnvironment());
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

        $result = $this->runScriptRaw('query.py', ['__YEARS__', 'ALL'], 20, $normalized);

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
