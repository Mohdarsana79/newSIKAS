<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class GoogleDriveSyncService
{
    private const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';

    private const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';

    private const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';

    private const CHUNK_SIZE_BYTES = 4 * 1024 * 1024; // 4 MB (kelipatan 256 KB sesuai aturan Resumable Upload Google Drive)

    /**
     * Menukar OAuth2 Refresh Token menjadi Access Token Google Drive.
     *
     * @return array{success: bool, access_token?: string, message: string}
     */
    public function fetchAccessToken(string $clientId, string $clientSecret, string $refreshToken): array
    {
        try {
            $response = Http::asForm()
                ->timeout(20)
                ->post(self::OAUTH_TOKEN_URL, [
                    'client_id' => trim($clientId),
                    'client_secret' => trim($clientSecret),
                    'refresh_token' => trim($refreshToken),
                    'grant_type' => 'refresh_token',
                ]);

            if (! $response->successful()) {
                $errDesc = (string) ($response->json('error_description') ?? $response->json('error') ?? 'HTTP '.$response->status());

                return [
                    'success' => false,
                    'message' => 'Otorisasi Google Drive gagal: '.$errDesc,
                ];
            }

            $token = (string) ($response->json('access_token') ?? '');
            if ($token === '') {
                return [
                    'success' => false,
                    'message' => 'Google OAuth tidak mengembalikan access token yang valid.',
                ];
            }

            return [
                'success' => true,
                'access_token' => $token,
                'message' => 'Access token Google Drive berhasil diperoleh.',
            ];
        } catch (Throwable $e) {
            Log::warning('GoogleDriveSyncService fetchAccessToken gagal.', ['error' => $e->getMessage()]);

            return [
                'success' => false,
                'message' => 'Tidak dapat menghubungi server Google OAuth. Pastikan koneksi internet aktif.',
            ];
        }
    }

    /**
     * Menguji koneksi & memverifikasi bahwa Folder ID Google Drive valid dan tidak berada di Trash.
     *
     * @return array{success: bool, folder_name?: string, message: string}
     */
    public function testConnection(
        string $clientId,
        string $clientSecret,
        string $refreshToken,
        string $folderId,
    ): array {
        $cleanFolderId = trim($folderId);
        if ($cleanFolderId === '' || ! preg_match('/^[a-zA-Z0-9_-]{5,200}$/', $cleanFolderId)) {
            return [
                'success' => false,
                'message' => 'Format Folder ID Google Drive tidak valid.',
            ];
        }

        $tokenResult = $this->fetchAccessToken($clientId, $clientSecret, $refreshToken);
        if (! $tokenResult['success']) {
            return [
                'success' => false,
                'message' => $tokenResult['message'],
            ];
        }

        try {
            $response = Http::withToken($tokenResult['access_token'])
                ->timeout(20)
                ->get(self::DRIVE_FILES_URL.'/'.rawurlencode($cleanFolderId), [
                    'fields' => 'id,name,mimeType,trashed',
                    'supportsAllDrives' => 'true',
                ]);

            if (! $response->successful()) {
                $errMsg = (string) ($response->json('error.message') ?? 'Folder tidak ditemukan atau tidak memiliki akses (HTTP '.$response->status().')');

                return [
                    'success' => false,
                    'message' => 'Gagal mengakses folder Google Drive: '.$errMsg,
                ];
            }

            $mimeType = (string) ($response->json('mimeType') ?? '');
            $trashed = (bool) ($response->json('trashed') ?? false);
            $folderName = (string) ($response->json('name') ?? $cleanFolderId);

            if ($mimeType !== 'application/vnd.google-apps.folder') {
                return [
                    'success' => false,
                    'message' => 'ID yang dimasukkan bukan merupakan folder Google Drive.',
                ];
            }

            if ($trashed) {
                return [
                    'success' => false,
                    'message' => "Folder \"{$folderName}\" berada di Trash Google Drive. Pulihkan terlebih dahulu.",
                ];
            }

            return [
                'success' => true,
                'folder_name' => $folderName,
                'message' => "Koneksi Google Drive berhasil! Folder tujuan: \"{$folderName}\".",
            ];
        } catch (Throwable $e) {
            Log::warning('GoogleDriveSyncService testConnection gagal.', ['error' => $e->getMessage()]);

            return [
                'success' => false,
                'message' => 'Tidak dapat menghubungi layanan Google Drive untuk memverifikasi folder. Periksa koneksi internet dan coba lagi.',
            ];
        }
    }

    /**
     * Mengunggah file backup .rsv ke folder Google Drive menggunakan Resumable Upload API v3 (hemat memori).
     *
     * @return array{success: bool, file_id?: string, message: string}
     */
    public function uploadFile(
        string $fullPath,
        string $fileName,
        string $clientId,
        string $clientSecret,
        string $refreshToken,
        string $folderId,
    ): array {
        if (! is_file($fullPath) || ! is_readable($fullPath)) {
            return [
                'success' => false,
                'message' => 'Berkas backup sumber tidak ditemukan atau tidak dapat dibaca.',
            ];
        }

        $fileSize = filesize($fullPath);
        if ($fileSize === false || $fileSize <= 0) {
            return [
                'success' => false,
                'message' => 'Berkas backup kosong sehingga tidak dapat diunggah ke Google Drive.',
            ];
        }

        $cleanFolderId = trim($folderId);
        if ($cleanFolderId === '' || ! preg_match('/^[a-zA-Z0-9_-]{5,200}$/', $cleanFolderId)) {
            return [
                'success' => false,
                'message' => 'Folder ID Google Drive tidak valid.',
            ];
        }

        $tokenResult = $this->fetchAccessToken($clientId, $clientSecret, $refreshToken);
        if (! $tokenResult['success']) {
            return [
                'success' => false,
                'message' => $tokenResult['message'],
            ];
        }

        $accessToken = $tokenResult['access_token'];

        try {
            // 1. Inisiasi sesi Resumable Upload
            $initResponse = Http::withToken($accessToken)
                ->timeout(30)
                ->withHeaders([
                    'X-Upload-Content-Type' => 'application/octet-stream',
                    'X-Upload-Content-Length' => (string) $fileSize,
                ])
                ->post(self::DRIVE_UPLOAD_URL.'?uploadType=resumable&supportsAllDrives=true', [
                    'name' => $fileName,
                    'parents' => [$cleanFolderId],
                ]);

            if (! $initResponse->successful()) {
                $errMsg = (string) ($initResponse->json('error.message') ?? 'HTTP '.$initResponse->status());

                return [
                    'success' => false,
                    'message' => 'Gagal memulai upload Google Drive: '.$errMsg,
                ];
            }

            $uploadUri = (string) $initResponse->header('Location');
            $uploadHost = strtolower((string) parse_url($uploadUri, PHP_URL_HOST));
            $isGoogleApiHost = $uploadHost === 'googleapis.com' || str_ends_with($uploadHost, '.googleapis.com');
            if ($uploadUri === '' || ! str_starts_with($uploadUri, 'https://') || ! $isGoogleApiHost) {
                return [
                    'success' => false,
                    'message' => 'Google Drive tidak mengembalikan URI sesi upload yang valid.',
                ];
            }

            // 2. Unggah konten secara bertahap per chunk 4 MB
            $handle = fopen($fullPath, 'rb');
            if ($handle === false) {
                return [
                    'success' => false,
                    'message' => 'Gagal membuka berkas backup untuk dibaca.',
                ];
            }

            $offset = 0;
            $uploadedFileId = null;
            $completed = false;

            try {
                while ($offset < $fileSize) {
                    $chunk = fread($handle, self::CHUNK_SIZE_BYTES);
                    if ($chunk === false || $chunk === '') {
                        break;
                    }

                    $chunkLen = strlen($chunk);
                    $rangeEnd = $offset + $chunkLen - 1;

                    $chunkResponse = Http::withToken($accessToken)
                        ->timeout(120)
                        ->withHeaders([
                            'Content-Type' => 'application/octet-stream',
                            'Content-Length' => (string) $chunkLen,
                            'Content-Range' => "bytes {$offset}-{$rangeEnd}/{$fileSize}",
                        ])
                        ->withBody($chunk, 'application/octet-stream')
                        ->put($uploadUri);

                    $status = $chunkResponse->status();

                    if ($status === 200 || $status === 201) {
                        $uploadedFileId = (string) ($chunkResponse->json('id') ?? '');
                        $offset += $chunkLen;
                        $completed = true;
                        break;
                    }

                    if ($status === 308) {
                        $rangeHeader = (string) $chunkResponse->header('Range');
                        $nextOffset = $offset + $chunkLen;

                        if ($rangeHeader !== '' && preg_match('/bytes=0-(\d+)/i', $rangeHeader, $rangeMatches) === 1) {
                            $nextOffset = (int) $rangeMatches[1] + 1;
                        }

                        // Cegah loop tak berujung atau false-positive 308 pada byte terakhir tanpa 200/201
                        if ($nextOffset <= $offset || $nextOffset >= $fileSize) {
                            break;
                        }

                        if ($nextOffset !== $offset + $chunkLen) {
                            if (fseek($handle, $nextOffset) !== 0) {
                                break;
                            }
                        }

                        $offset = $nextOffset;

                        continue;
                    }

                    $errMsg = (string) ($chunkResponse->json('error.message') ?? "HTTP {$status}");

                    return [
                        'success' => false,
                        'message' => 'Upload ke Google Drive terhenti: '.$errMsg,
                    ];
                }
            } finally {
                fclose($handle);
            }

            if (! $completed || $offset < $fileSize) {
                return [
                    'success' => false,
                    'message' => 'Upload ke Google Drive tidak selesai sepenuhnya.',
                ];
            }

            return [
                'success' => true,
                'file_id' => $uploadedFileId ?: '',
                'message' => "Berhasil mengunggah {$fileName} ke Google Drive.",
            ];
        } catch (Throwable $e) {
            Log::warning('GoogleDriveSyncService uploadFile gagal.', [
                'file_name' => $fileName,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'message' => 'Terjadi gangguan jaringan saat mengunggah berkas ke Google Drive. Berkas lokal tetap tersimpan aman.',
            ];
        }
    }
}
