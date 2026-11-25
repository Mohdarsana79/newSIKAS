<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;

class ArkasChunkUploadService
{
    public function __construct(
        protected ArkasEngineService $arkasEngine,
        protected ArkasStateStore $stateStore
    ) {}

    public function getChunkTempDir(): string
    {
        return rtrim(str_replace('\\', '/', (string) config('arkas.chunk_temp_dir', storage_path('app/temp/arkas_chunks'))), '/');
    }

    public function getMaxUploadMb(): int
    {
        return max(1, (int) config('arkas.max_upload_mb', 500));
    }

    public function getMaxUploadBytes(): int
    {
        return $this->getMaxUploadMb() * 1024 * 1024;
    }

    public function getChunkSizeMb(): int
    {
        return max(1, min(4, (int) config('arkas.chunk_size_mb', 2)));
    }

    public function getChunkSizeBytes(): int
    {
        return $this->getChunkSizeMb() * 1024 * 1024;
    }

    /**
     * Initialize a chunked upload session or short-circuit if server already holds the exact SHA-256.
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function initUpload(array $payload): array
    {
        $filename = trim((string) ($payload['filename'] ?? 'arkas.db'));
        $ext = strtolower((string) pathinfo($filename, PATHINFO_EXTENSION));
        if (! in_array($ext, ['db', 'sqlite', 'sqlite3'], true)) {
            return [
                'ok' => false,
                'http_status' => 422,
                'message' => 'Format file tidak valid. Harap unggah file database ARKAS (.db, .sqlite, atau .sqlite3).',
            ];
        }

        $totalSize = (int) ($payload['total_size'] ?? 0);
        if ($totalSize <= 0) {
            return [
                'ok' => false,
                'http_status' => 422,
                'message' => 'Ukuran file arkas.db tidak valid (0 byte).',
            ];
        }

        $maxBytes = $this->getMaxUploadBytes();
        if ($totalSize > $maxBytes) {
            return [
                'ok' => false,
                'http_status' => 422,
                'message' => "Ukuran file melebihi batas maksimal ({$this->getMaxUploadMb()} MB).",
            ];
        }

        $defaultChunkSize = $this->getChunkSizeBytes();
        $chunkSize = isset($payload['chunk_size']) ? (int) $payload['chunk_size'] : $defaultChunkSize;
        if ($chunkSize < 65536 || $chunkSize > (4 * 1024 * 1024)) {
            return [
                'ok' => false,
                'http_status' => 422,
                'message' => 'Ukuran potongan (chunk_size) harus antara 64 KB hingga 4 MB.',
            ];
        }

        $expectedChunks = (int) ceil($totalSize / $chunkSize);
        $totalChunks = isset($payload['total_chunks']) ? (int) $payload['total_chunks'] : $expectedChunks;
        if ($totalChunks !== $expectedChunks || $totalChunks <= 0) {
            return [
                'ok' => false,
                'http_status' => 422,
                'message' => 'Jumlah potongan (total_chunks) tidak sesuai dengan ukuran file.',
            ];
        }

        $sha256 = null;
        if (isset($payload['sha256']) && is_string($payload['sha256']) && trim($payload['sha256']) !== '') {
            $candidate = strtolower(trim($payload['sha256']));
            if (preg_match('/^[a-f0-9]{64}$/', $candidate) !== 1) {
                return [
                    'ok' => false,
                    'http_status' => 422,
                    'message' => 'Format checksum SHA-256 tidak valid.',
                ];
            }
            $sha256 = $candidate;
        }

        $lastUpload = $this->stateStore->getLastUpload();
        $existingUploadPath = $this->arkasEngine->getUploadedDbPath();
        if (
            $sha256 !== null
            && is_array($lastUpload)
            && ($lastUpload['sha256'] ?? null) === $sha256
            && $existingUploadPath !== ''
            && is_file($existingUploadPath)
        ) {
            return [
                'ok' => true,
                'http_status' => 200,
                'status' => 'up_to_date',
                'already_up_to_date' => true,
                'message' => 'Database arkas.db di server sudah identik dengan file terbaru Anda.',
                'active_mode' => $this->stateStore->getActiveMode(),
                'last_upload' => $lastUpload,
            ];
        }

        $this->cleanupExpiredSessions();

        $uploadId = (string) Str::uuid();
        $sessionDir = $this->sessionDir($uploadId);
        if (! is_dir($sessionDir) && ! @mkdir($sessionDir, 0755, true)) {
            return [
                'ok' => false,
                'http_status' => 500,
                'message' => 'Gagal membuat direktori sementara upload chunk di server.',
            ];
        }

        $meta = [
            'upload_id' => $uploadId,
            'filename' => basename($filename),
            'total_size' => $totalSize,
            'chunk_size' => $chunkSize,
            'total_chunks' => $totalChunks,
            'sha256' => $sha256,
            'device_name' => isset($payload['device_name']) && is_string($payload['device_name'])
                ? mb_substr(trim($payload['device_name']), 0, 120)
                : null,
            'created_at' => Carbon::now()->toIso8601String(),
        ];

        file_put_contents($sessionDir.'/meta.json', (string) json_encode($meta, JSON_PRETTY_PRINT));

        return [
            'ok' => true,
            'http_status' => 200,
            'status' => 'ready',
            'already_up_to_date' => false,
            'upload_id' => $uploadId,
            'chunk_size' => $chunkSize,
            'total_chunks' => $totalChunks,
            'max_upload_mb' => $this->getMaxUploadMb(),
        ];
    }

    /**
     * Store a single chunk idempotently (safe for client retries).
     *
     * @return array<string, mixed>
     */
    public function storeChunk(string $uploadId, int $chunkIndex, UploadedFile $chunkFile): array
    {
        $meta = $this->readSessionMeta($uploadId);
        if ($meta === null) {
            return [
                'ok' => false,
                'http_status' => 404,
                'message' => 'Sesi unggahan tidak ditemukan atau sudah kedaluwarsa. Silakan mulai unggah ulang.',
            ];
        }

        $totalChunks = (int) ($meta['total_chunks'] ?? 0);
        if ($chunkIndex < 0 || $chunkIndex >= $totalChunks) {
            return [
                'ok' => false,
                'http_status' => 422,
                'message' => "Indeks potongan ({$chunkIndex}) di luar rentang 0..".max(0, $totalChunks - 1).'.',
            ];
        }

        $maxChunkBytes = ((int) ($meta['chunk_size'] ?? $this->getChunkSizeBytes())) + 1024;
        $receivedSize = (int) ($chunkFile->getSize() ?: 0);
        if ($receivedSize <= 0 || $receivedSize > $maxChunkBytes) {
            return [
                'ok' => false,
                'http_status' => 422,
                'message' => 'Ukuran potongan file tidak valid atau melebihi batas chunk.',
            ];
        }

        $sessionDir = $this->sessionDir($uploadId);
        $partName = sprintf('chunk_%06d.part', $chunkIndex);
        $partPath = $sessionDir.'/'.$partName;

        try {
            $sourcePath = $chunkFile->getRealPath();
            if ($sourcePath === false || ! is_file($sourcePath)) {
                throw new \RuntimeException('File sementara potongan tidak dapat dibaca.');
            }

            $in = @fopen($sourcePath, 'rb');
            $out = @fopen($partPath, 'wb');
            if (! $in || ! $out) {
                if (is_resource($in)) {
                    fclose($in);
                }
                if (is_resource($out)) {
                    fclose($out);
                }
                throw new \RuntimeException('Gagal membuka berkas potongan di direktori sementara.');
            }

            stream_copy_to_stream($in, $out);
            fclose($in);
            fclose($out);
        } catch (\Throwable $e) {
            return [
                'ok' => false,
                'http_status' => 500,
                'message' => 'Gagal menyimpan potongan file di server: '.$e->getMessage(),
            ];
        }

        $uploadedCount = count(glob($sessionDir.'/chunk_*.part') ?: []);
        $percent = $totalChunks > 0 ? min(100, (int) round(($uploadedCount / $totalChunks) * 100)) : 0;

        return [
            'ok' => true,
            'http_status' => 200,
            'status' => 'chunk_received',
            'upload_id' => $uploadId,
            'chunk_index' => $chunkIndex,
            'received_chunks' => $uploadedCount,
            'total_chunks' => $totalChunks,
            'percent' => $percent,
        ];
    }

    /**
     * Assemble all uploaded chunks, verify checksum + SQLCipher integrity, and atomically publish arkas.db.
     *
     * @param  array<string, mixed>  $context
     * @return array<string, mixed>
     */
    public function finalizeUpload(string $uploadId, array $context = []): array
    {
        $meta = $this->readSessionMeta($uploadId);
        if ($meta === null) {
            return [
                'ok' => false,
                'http_status' => 404,
                'message' => 'Sesi unggahan tidak ditemukan atau sudah kedaluwarsa.',
            ];
        }

        $sessionDir = $this->sessionDir($uploadId);
        $totalChunks = (int) ($meta['total_chunks'] ?? 0);
        $expectedSize = (int) ($meta['total_size'] ?? 0);

        for ($i = 0; $i < $totalChunks; $i++) {
            $partPath = $sessionDir.'/'.sprintf('chunk_%06d.part', $i);
            if (! is_file($partPath)) {
                return [
                    'ok' => false,
                    'http_status' => 422,
                    'message' => 'Potongan file belum lengkap (potongan ke-'.($i + 1)." dari {$totalChunks} hilang).",
                ];
            }
        }

        $assembledPath = $sessionDir.'/assembled.db';
        $out = @fopen($assembledPath, 'wb');
        if (! $out) {
            return [
                'ok' => false,
                'http_status' => 500,
                'message' => 'Gagal membuat berkas gabungan arkas.db sementara di server.',
            ];
        }

        try {
            for ($i = 0; $i < $totalChunks; $i++) {
                $partPath = $sessionDir.'/'.sprintf('chunk_%06d.part', $i);
                $in = @fopen($partPath, 'rb');
                if (! $in) {
                    throw new \RuntimeException('Gagal membaca potongan ke-'.($i + 1).'.');
                }
                stream_copy_to_stream($in, $out);
                fclose($in);
            }
            fclose($out);
            $out = null;

            $actualSize = (int) @filesize($assembledPath);
            if ($actualSize !== $expectedSize) {
                $this->removeDirectory($sessionDir);

                return [
                    'ok' => false,
                    'http_status' => 422,
                    'message' => "Ukuran file hasil penggabungan tidak cocok ({$actualSize} vs {$expectedSize} byte). Silakan unggah ulang.",
                ];
            }

            $actualSha256 = strtolower((string) hash_file('sha256', $assembledPath));
            $expectedSha256 = is_string($meta['sha256'] ?? null) ? strtolower($meta['sha256']) : null;
            if ($expectedSha256 !== null && $expectedSha256 !== '' && ! hash_equals($expectedSha256, $actualSha256)) {
                $this->removeDirectory($sessionDir);

                return [
                    'ok' => false,
                    'http_status' => 422,
                    'message' => 'Checksum SHA-256 file tidak cocok setelah penggabungan. Kemungkinan file berubah saat unggah (pastikan ARKAS ditutup).',
                ];
            }

            $verification = $this->arkasEngine->verifyDatabaseFile($assembledPath);
            if (! ($verification['valid'] ?? false)) {
                $this->removeDirectory($sessionDir);

                return [
                    'ok' => false,
                    'http_status' => 422,
                    'message' => (string) ($verification['message'] ?? 'File arkas.db tidak valid atau gagal didekripsi.'),
                ];
            }

            $destinationPath = $this->arkasEngine->getUploadedDbPath();
            $destinationDir = dirname($destinationPath);
            if (! is_dir($destinationDir)) {
                @mkdir($destinationDir, 0755, true);
            }

            if (is_file($destinationPath)) {
                @unlink($destinationPath);
            }

            if (! @rename($assembledPath, $destinationPath)) {
                if (! @copy($assembledPath, $destinationPath)) {
                    $this->removeDirectory($sessionDir);

                    return [
                        'ok' => false,
                        'http_status' => 500,
                        'message' => 'Gagal memindahkan file arkas.db terverifikasi ke penyimpanan server.',
                    ];
                }
                @unlink($assembledPath);
            }

            $this->removeDirectory($sessionDir);

            $years = array_values(array_map('strval', $verification['years'] ?? []));
            $via = ($context['via'] ?? 'browser') === 'agent' ? 'agent' : 'browser';
            $deviceName = $context['device_name'] ?? $meta['device_name'] ?? null;
            $uploadedBy = $context['uploaded_by'] ?? ($via === 'agent'
                ? 'Agent Sync'.($deviceName ? " ({$deviceName})" : '')
                : 'Browser');

            $this->stateStore->recordUpload([
                'uploaded_at' => Carbon::now()->toIso8601String(),
                'size_bytes' => $actualSize,
                'sha256' => $actualSha256,
                'via' => $via,
                'device_name' => $deviceName,
                'uploaded_by' => $uploadedBy,
                'years' => $years,
            ]);

            $activeMode = $this->stateStore->getActiveMode();
            $lastUpload = $this->stateStore->getLastUpload();

            return [
                'ok' => true,
                'http_status' => 200,
                'status' => 'success',
                'message' => $activeMode === ArkasStateStore::MODE_ONLINE
                    ? 'Database arkas.db berhasil diunggah, diverifikasi, dan langsung aktif dipakai.'
                    : 'Database arkas.db berhasil diunggah dan diverifikasi. Aktifkan "Mode Online / VPS" untuk mulai menggunakannya.',
                'active_mode' => $activeMode,
                'years' => $years,
                'sha256' => $actualSha256,
                'size_bytes' => $actualSize,
                'last_upload' => $lastUpload,
            ];
        } catch (\Throwable $e) {
            if (is_resource($out)) {
                fclose($out);
            }
            $this->removeDirectory($sessionDir);

            return [
                'ok' => false,
                'http_status' => 500,
                'message' => 'Gagal memproses penggabungan file arkas.db: '.$e->getMessage(),
            ];
        }
    }

    /**
     * Validate UUID format and return session directory path.
     */
    protected function sessionDir(string $uploadId): string
    {
        return $this->getChunkTempDir().'/'.$uploadId;
    }

    /**
     * @return array<string, mixed>|null
     */
    protected function readSessionMeta(string $uploadId): ?array
    {
        if (preg_match('/^[a-f0-9-]{36}$/i', $uploadId) !== 1) {
            return null;
        }

        $metaPath = $this->sessionDir($uploadId).'/meta.json';
        if (! is_file($metaPath)) {
            return null;
        }

        $raw = @file_get_contents($metaPath);
        if (! is_string($raw) || trim($raw) === '') {
            return null;
        }

        $decoded = json_decode($raw, true);

        return is_array($decoded) ? $decoded : null;
    }

    /**
     * Remove orphaned chunk sessions older than chunk_ttl_seconds.
     */
    public function cleanupExpiredSessions(): void
    {
        $root = $this->getChunkTempDir();
        if (! is_dir($root)) {
            return;
        }

        $ttl = max(300, (int) config('arkas.chunk_ttl_seconds', 7200));
        $cutoff = time() - $ttl;

        foreach (glob($root.'/*', GLOB_ONLYDIR) ?: [] as $dir) {
            $mtime = (int) @filemtime($dir);
            if ($mtime > 0 && $mtime < $cutoff) {
                $this->removeDirectory($dir);
            }
        }
    }

    protected function removeDirectory(string $dir): void
    {
        if (! is_dir($dir)) {
            return;
        }

        foreach (scandir($dir) ?: [] as $entry) {
            if ($entry === '.' || $entry === '..') {
                continue;
            }
            $path = $dir.'/'.$entry;
            if (is_dir($path)) {
                $this->removeDirectory($path);
            } else {
                @unlink($path);
            }
        }

        @rmdir($dir);
    }
}
