<?php

namespace App\Http\Controllers;

use App\Services\ArkasEngineService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class ArkasSettingController extends Controller
{
    /**
     * Mengambil path & status sumber database ARKAS saat ini.
     */
    public function getPath(ArkasEngineService $arkasEngine): JsonResponse
    {
        $resolved = $arkasEngine->resolveDatabaseSource();
        $uploadedPath = $arkasEngine->getUploadedDbPath();
        $meta = $this->uploadedFileMetadata($uploadedPath);

        return response()->json([
            'path' => (string) config('arkas.db_path', ''),
            'active_path' => $resolved['path'],
            'source' => $resolved['source'],
            'exists' => $resolved['exists'],
            'uploaded_exists' => $meta['exists'],
            'uploaded_at' => $meta['uploaded_at'],
            'uploaded_size' => $meta['uploaded_size'],
            'max_upload_mb' => (int) config('arkas.max_upload_mb', 100),
        ]);
    }

    /**
     * Menyimpan path arkas baru ke .env dan menyinkronkan config cache bila aktif.
     */
    public function savePath(Request $request, ArkasEngineService $arkasEngine): JsonResponse
    {
        $request->validate([
            'path' => 'nullable|string',
        ]);

        $path = $arkasEngine->normalizePath($request->input('path', ''));

        try {
            $this->updateDotEnv('ARKAS_DB_PATH', $path);
            Config::set('arkas.db_path', $path);

            if (app()->configurationIsCached()) {
                Artisan::call('config:clear');
            }

            $resolved = $arkasEngine->resolveDatabaseSource();

            return response()->json([
                'status' => 'success',
                'message' => 'Path Arkas berhasil diperbarui.',
                'path' => $path,
                'source' => $resolved['source'],
                'exists' => $resolved['exists'],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Gagal memperbarui file konfigurasi: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Mengunggah file arkas.db langsung melalui browser (untuk mode VPS / online tanpa akses folder lokal klien).
     */
    public function uploadDb(Request $request, ArkasEngineService $arkasEngine): JsonResponse
    {
        $maxKb = max(1, (int) config('arkas.max_upload_mb', 100)) * 1024;

        $request->validate([
            'arkas_db' => ['required', 'file', 'max:'.$maxKb],
        ], [
            'arkas_db.required' => 'Pilih file arkas.db terlebih dahulu.',
            'arkas_db.max' => 'Ukuran file melebihi batas maksimal ('.config('arkas.max_upload_mb', 100).' MB).',
        ]);

        $uploadedFile = $request->file('arkas_db');
        $ext = strtolower((string) $uploadedFile->getClientOriginalExtension());
        if (! in_array($ext, ['db', 'sqlite', 'sqlite3'], true)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Format file tidak valid. Harap unggah file database ARKAS (.db).',
            ], 422);
        }

        $tempDir = storage_path('app/temp');
        if (! is_dir($tempDir)) {
            @mkdir($tempDir, 0755, true);
        }

        $tempFileName = 'arkas_upload_'.Str::random(12).'.db';
        $tempPath = $tempDir.DIRECTORY_SEPARATOR.$tempFileName;

        try {
            $uploadedFile->move($tempDir, $tempFileName);

            // Verifikasi bahwa file benar-benar SQLite/SQLCipher ARKAS yang dapat didekripsi (jika engine tersedia)
            $verification = $arkasEngine->verifyDatabaseFile($tempPath);
            if (! $verification['valid']) {
                @unlink($tempPath);

                return response()->json([
                    'status' => 'error',
                    'message' => $verification['message'] ?? 'File arkas.db tidak valid atau gagal didekripsi.',
                ], 422);
            }

            $destinationPath = $arkasEngine->getUploadedDbPath();
            $destinationDir = dirname($destinationPath);
            if (! is_dir($destinationDir)) {
                @mkdir($destinationDir, 0755, true);
            }

            if (is_file($destinationPath)) {
                @unlink($destinationPath);
            }

            if (! @rename($tempPath, $destinationPath)) {
                if (! @copy($tempPath, $destinationPath)) {
                    @unlink($tempPath);

                    return response()->json([
                        'status' => 'error',
                        'message' => 'Gagal menyimpan file arkas.db ke direktori penyimpanan server.',
                    ], 500);
                }
                @unlink($tempPath);
            }

            $meta = $this->uploadedFileMetadata($destinationPath);

            return response()->json([
                'status' => 'success',
                'message' => 'Database arkas.db berhasil diunggah dan diverifikasi.',
                'years' => $verification['years'] ?? [],
                'uploaded_exists' => $meta['exists'],
                'uploaded_at' => $meta['uploaded_at'],
                'uploaded_size' => $meta['uploaded_size'],
            ]);
        } catch (\Throwable $e) {
            if (is_file($tempPath)) {
                @unlink($tempPath);
            }

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal memproses file arkas.db: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Menghapus file arkas.db hasil unggahan di server.
     */
    public function removeUploadedDb(ArkasEngineService $arkasEngine): JsonResponse
    {
        $uploadedPath = $arkasEngine->getUploadedDbPath();

        if ($uploadedPath !== '' && is_file($uploadedPath)) {
            if (! @unlink($uploadedPath)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Gagal menghapus file arkas.db di server.',
                ], 500);
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => 'File unggahan arkas.db di server berhasil dihapus.',
            'uploaded_exists' => false,
        ]);
    }

    /**
     * Helper untuk memperbarui nilai di file .env secara aman.
     */
    protected function updateDotEnv(string $key, string $value): void
    {
        $envPath = app()->environmentFilePath();

        if (! File::exists($envPath)) {
            return;
        }

        $lines = file($envPath, FILE_IGNORE_NEW_LINES);
        if (! is_array($lines)) {
            return;
        }

        $keyExists = false;

        if (strpos($value, ' ') !== false) {
            $value = '"'.$value.'"';
        }

        foreach ($lines as $i => $line) {
            if (strpos($line, "{$key}=") === 0) {
                $lines[$i] = "{$key}={$value}";
                $keyExists = true;
                break;
            }
        }

        if (! $keyExists) {
            $lines[] = "{$key}={$value}";
        }

        File::put($envPath, implode("\n", $lines)."\n");
    }

    /**
     * Collect formatted metadata for an uploaded arkas.db file.
     *
     * @return array{exists: bool, uploaded_at: string|null, uploaded_size: string|null}
     */
    protected function uploadedFileMetadata(string $path): array
    {
        if ($path === '' || ! is_file($path)) {
            return [
                'exists' => false,
                'uploaded_at' => null,
                'uploaded_size' => null,
            ];
        }

        return [
            'exists' => true,
            'uploaded_at' => Carbon::createFromTimestamp((int) filemtime($path))->format('d M Y, H:i'),
            'uploaded_size' => $this->formatBytes((int) filesize($path)),
        ];
    }

    protected function formatBytes(int $bytes): string
    {
        if ($bytes <= 0) {
            return '0 B';
        }

        $units = ['B', 'KB', 'MB', 'GB'];
        $power = min((int) floor(log($bytes, 1024)), count($units) - 1);

        return round($bytes / (1024 ** $power), 2).' '.$units[$power];
    }
}
