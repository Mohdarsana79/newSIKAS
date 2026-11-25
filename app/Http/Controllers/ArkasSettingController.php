<?php

namespace App\Http\Controllers;

use App\Services\ArkasAgentScriptGenerator;
use App\Services\ArkasChunkUploadService;
use App\Services\ArkasEngineService;
use App\Services\ArkasStateStore;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class ArkasSettingController extends Controller
{
    /**
     * Mengambil path, mode aktif, status sumber database ARKAS, metadata upload & status Agent Sync.
     */
    public function getPath(
        ArkasEngineService $arkasEngine,
        ArkasStateStore $stateStore,
        ArkasChunkUploadService $chunkService
    ): JsonResponse {
        $resolved = $arkasEngine->resolveDatabaseSource();
        $uploadedPath = $arkasEngine->getUploadedDbPath();
        $meta = $this->uploadedFileMetadata($uploadedPath);
        $lastUpload = $stateStore->getLastUpload();

        return response()->json([
            'path' => (string) config('arkas.db_path', ''),
            'active_mode' => $resolved['active_mode'],
            'active_path' => $resolved['path'],
            'source' => $resolved['source'],
            'exists' => $resolved['exists'],
            'uploaded_exists' => $meta['exists'],
            'uploaded_at' => $lastUpload['uploaded_at'] ?? $meta['uploaded_at'],
            'uploaded_size' => $meta['uploaded_size'],
            'last_upload' => $meta['exists'] ? $lastUpload : null,
            'agent' => $stateStore->getAgentSummary(),
            'max_upload_mb' => $chunkService->getMaxUploadMb(),
            'chunk_size_mb' => $chunkService->getChunkSizeMb(),
        ]);
    }

    /**
     * Mengubah mode aktif sumber database ARKAS secara eksplisit ('local' atau 'online').
     */
    public function setMode(
        Request $request,
        ArkasEngineService $arkasEngine,
        ArkasStateStore $stateStore
    ): JsonResponse {
        $validated = $request->validate([
            'mode' => ['required', 'in:local,online'],
        ]);

        $mode = $stateStore->setActiveMode((string) $validated['mode']);
        $resolved = $arkasEngine->resolveDatabaseSource();

        return response()->json([
            'status' => 'success',
            'message' => $mode === ArkasStateStore::MODE_ONLINE
                ? 'Mode Online / VPS berhasil diaktifkan.'
                : 'Mode PC Lokal berhasil diaktifkan.',
            'active_mode' => $mode,
            'source' => $resolved['source'],
            'exists' => $resolved['exists'],
            'active_path' => $resolved['path'],
        ]);
    }

    /**
     * Menyimpan path arkas lokal ke .env, mengaktifkan Mode PC Lokal (default), dan menyinkronkan config cache bila aktif.
     */
    public function savePath(
        Request $request,
        ArkasEngineService $arkasEngine,
        ArkasStateStore $stateStore
    ): JsonResponse {
        $request->validate([
            'path' => 'nullable|string',
            'activate_local' => 'nullable|boolean',
        ]);

        $path = $arkasEngine->normalizePath($request->input('path', ''));
        $activateLocal = $request->boolean('activate_local', true);

        try {
            $this->updateDotEnv('ARKAS_DB_PATH', $path);
            Config::set('arkas.db_path', $path);

            if (app()->configurationIsCached()) {
                Artisan::call('config:clear');
            }

            if ($activateLocal) {
                $stateStore->setActiveMode(ArkasStateStore::MODE_LOCAL);
            }

            $resolved = $arkasEngine->resolveDatabaseSource();

            return response()->json([
                'status' => 'success',
                'message' => $activateLocal
                    ? 'Mode PC Lokal diaktifkan & path Arkas berhasil diperbarui.'
                    : 'Path Arkas berhasil diperbarui.',
                'path' => $path,
                'active_mode' => $resolved['active_mode'],
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
     * Inisialisasi sesi unggah chunked arkas.db dari browser.
     */
    public function uploadInit(Request $request, ArkasChunkUploadService $chunkService): JsonResponse
    {
        $validated = $request->validate([
            'filename' => ['required', 'string', 'max:255'],
            'total_size' => ['required', 'integer', 'min:1'],
            'chunk_size' => ['required', 'integer', 'min:65536'],
            'total_chunks' => ['required', 'integer', 'min:1'],
            'sha256' => ['nullable', 'string', 'size:64'],
        ]);

        $result = $chunkService->initUpload($validated);

        return response()->json($result, (int) ($result['http_status'] ?? 200));
    }

    /**
     * Menerima satu potongan (chunk) arkas.db dari browser.
     */
    public function uploadChunk(Request $request, ArkasChunkUploadService $chunkService): JsonResponse
    {
        $validated = $request->validate([
            'upload_id' => ['required', 'string', 'max:64'],
            'chunk_index' => ['required', 'integer', 'min:0'],
            'chunk' => ['required', 'file'],
        ]);

        $result = $chunkService->storeChunk(
            (string) $validated['upload_id'],
            (int) $validated['chunk_index'],
            $request->file('chunk')
        );

        return response()->json($result, (int) ($result['http_status'] ?? 200));
    }

    /**
     * Menggabungkan seluruh potongan dan memverifikasi arkas.db dari browser.
     */
    public function uploadFinalize(Request $request, ArkasChunkUploadService $chunkService): JsonResponse
    {
        $validated = $request->validate([
            'upload_id' => ['required', 'string', 'max:64'],
        ]);

        $userName = $request->user()?->name ?: ($request->user()?->username ?: 'Browser');
        $result = $chunkService->finalizeUpload((string) $validated['upload_id'], [
            'via' => 'browser',
            'device_name' => 'Browser Web',
            'uploaded_by' => $userName,
        ]);

        return response()->json($result, (int) ($result['http_status'] ?? 200));
    }

    /**
     * Legacy single-request upload arkas.db (dipertahankan untuk backward-compatibility).
     */
    public function uploadDb(
        Request $request,
        ArkasEngineService $arkasEngine,
        ArkasStateStore $stateStore
    ): JsonResponse {
        $maxKb = max(1, (int) config('arkas.max_upload_mb', 500)) * 1024;

        $request->validate([
            'arkas_db' => ['required', 'file', 'max:'.$maxKb],
        ], [
            'arkas_db.required' => 'Pilih file arkas.db terlebih dahulu.',
            'arkas_db.max' => 'Ukuran file melebihi batas maksimal ('.config('arkas.max_upload_mb', 500).' MB).',
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

            $sha256 = strtolower((string) hash_file('sha256', $destinationPath));
            $userName = $request->user()?->name ?: ($request->user()?->username ?: 'Browser');
            $stateStore->recordUpload([
                'uploaded_at' => Carbon::now()->toIso8601String(),
                'size_bytes' => (int) filesize($destinationPath),
                'sha256' => $sha256,
                'via' => 'browser',
                'device_name' => 'Browser Web',
                'uploaded_by' => $userName,
                'years' => $verification['years'] ?? [],
            ]);

            $meta = $this->uploadedFileMetadata($destinationPath);

            return response()->json([
                'status' => 'success',
                'message' => 'Database arkas.db berhasil diunggah dan diverifikasi.',
                'years' => $verification['years'] ?? [],
                'active_mode' => $stateStore->getActiveMode(),
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
    public function removeUploadedDb(ArkasEngineService $arkasEngine, ArkasStateStore $stateStore): JsonResponse
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

        $stateStore->clearLastUpload();

        return response()->json([
            'status' => 'success',
            'message' => 'File unggahan arkas.db di server berhasil dihapus.',
            'uploaded_exists' => false,
        ]);
    }

    /**
     * Mengatur atau memperbarui PIN Sinkronisasi (4-6 digit angka) untuk Agent Tool.
     */
    public function saveAgentPin(Request $request, ArkasStateStore $stateStore): JsonResponse
    {
        $validated = $request->validate([
            'pin' => ['required', 'string', 'regex:/^\d{4,6}$/'],
        ], [
            'pin.required' => 'PIN Sinkronisasi wajib diisi.',
            'pin.regex' => 'PIN Sinkronisasi harus terdiri dari 4 sampai 6 digit angka.',
        ]);

        $stateStore->setAgentPin((string) $validated['pin']);

        return response()->json([
            'status' => 'success',
            'message' => 'PIN Sinkronisasi Agent berhasil disimpan.',
            'agent' => $stateStore->getAgentSummary(),
        ]);
    }

    /**
     * Menghasilkan Sync Token baru (menonaktifkan file .bat lama) dan mengunduh SIKAS-Arkas-Sync.bat.
     */
    public function downloadAgentScript(
        Request $request,
        ArkasStateStore $stateStore,
        ArkasChunkUploadService $chunkService,
        ArkasAgentScriptGenerator $generator
    ): Response|JsonResponse {
        if (! $stateStore->hasAgentPin()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Atur PIN Sinkronisasi (4-6 digit) terlebih dahulu sebelum mengunduh Agent Tool.',
            ], 422);
        }

        $plainToken = $stateStore->rotateAgentToken();
        $serverBaseUrl = $request->getSchemeAndHttpHost();
        $script = $generator->generateBatScript($serverBaseUrl, $plainToken, $chunkService->getChunkSizeMb());

        return response($script, 200, [
            'Content-Type' => 'application/octet-stream',
            'Content-Disposition' => 'attachment; filename="SIKAS-Arkas-Sync.bat"',
            'Cache-Control' => 'no-store, no-cache, must-revalidate',
        ]);
    }

    /**
     * Mencabut Sync Token Agent seketika sehingga file .bat lama tidak lagi dapat mengakses server.
     */
    public function revokeAgentToken(ArkasStateStore $stateStore): JsonResponse
    {
        $stateStore->revokeAgentToken();

        return response()->json([
            'status' => 'success',
            'message' => 'Akses Agent Sync berhasil dicabut. File SIKAS-Arkas-Sync.bat sebelumnya tidak lagi berlaku.',
            'agent' => $stateStore->getAgentSummary(),
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
