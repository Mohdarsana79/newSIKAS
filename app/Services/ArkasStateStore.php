<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\Hash;

class ArkasStateStore
{
    public const MODE_LOCAL = 'local';

    public const MODE_ONLINE = 'online';

    public function getStatePath(): string
    {
        return str_replace('\\', '/', trim((string) config('arkas.state_path', storage_path('app/arkas_uploads/state.json'))));
    }

    /**
     * Read full state JSON or empty array if not yet initialized.
     *
     * @return array<string, mixed>
     */
    public function read(): array
    {
        $path = $this->getStatePath();
        if ($path === '' || ! is_file($path)) {
            return [];
        }

        $raw = @file_get_contents($path);
        if (! is_string($raw) || trim($raw) === '') {
            return [];
        }

        $decoded = json_decode($raw, true);

        return is_array($decoded) ? $decoded : [];
    }

    /**
     * Resolve effective active mode ('local' or 'online') with backward-compatible default
     * when state.json has not yet been explicitly saved.
     *
     * @return 'local'|'online'
     */
    public function getActiveMode(): string
    {
        $state = $this->read();
        $explicit = $state['active_mode'] ?? null;

        if ($explicit === self::MODE_LOCAL || $explicit === self::MODE_ONLINE) {
            return $explicit;
        }

        $manualPath = trim((string) config('arkas.db_path', ''), "\"' \t\n\r\0\x0B");
        $uploadPath = str_replace('\\', '/', trim((string) config('arkas.upload_path', storage_path('app/arkas_uploads/arkas.db'))));

        if ($manualPath === '' && $uploadPath !== '' && is_file($uploadPath)) {
            return self::MODE_ONLINE;
        }

        return self::MODE_LOCAL;
    }

    /**
     * Explicitly set active mode ('local' or 'online').
     */
    public function setActiveMode(string $mode): string
    {
        $normalized = $mode === self::MODE_ONLINE ? self::MODE_ONLINE : self::MODE_LOCAL;
        $state = $this->read();
        $state['active_mode'] = $normalized;
        $this->writeAtomically($state);

        return $normalized;
    }

    /**
     * Store hashed 4-6 digit synchronization PIN for the Agent Tool.
     */
    public function setAgentPin(string $pin): void
    {
        $state = $this->read();
        $agent = is_array($state['agent'] ?? null) ? $state['agent'] : [];

        $agent['pin_hash'] = Hash::make($pin);
        $agent['pin_updated_at'] = Carbon::now()->toIso8601String();
        $state['agent'] = $agent;

        $this->writeAtomically($state);
    }

    /**
     * Generate a fresh 64-character hex token, store its SHA-256 hash, and return plaintext once.
     */
    public function rotateAgentToken(): string
    {
        $plainToken = bin2hex(random_bytes(32));
        $state = $this->read();
        $agent = is_array($state['agent'] ?? null) ? $state['agent'] : [];

        $agent['token_hash'] = hash('sha256', $plainToken);
        $agent['token_created_at'] = Carbon::now()->toIso8601String();
        $state['agent'] = $agent;

        $this->writeAtomically($state);

        return $plainToken;
    }

    /**
     * Immediately revoke the active Agent Sync token.
     */
    public function revokeAgentToken(): void
    {
        $state = $this->read();
        $agent = is_array($state['agent'] ?? null) ? $state['agent'] : [];

        $agent['token_hash'] = null;
        $agent['token_created_at'] = null;
        $state['agent'] = $agent;

        $this->writeAtomically($state);
    }

    public function hasAgentToken(): bool
    {
        $state = $this->read();
        $hash = $state['agent']['token_hash'] ?? null;

        return is_string($hash) && strlen($hash) === 64;
    }

    public function hasAgentPin(): bool
    {
        $state = $this->read();
        $hash = $state['agent']['pin_hash'] ?? null;

        return is_string($hash) && $hash !== '';
    }

    /**
     * Verify both Sync Token and PIN in constant time.
     */
    public function verifyAgentCredentials(string $plainToken, string $plainPin): bool
    {
        if ($plainToken === '' || $plainPin === '') {
            return false;
        }

        $state = $this->read();
        $storedTokenHash = $state['agent']['token_hash'] ?? null;
        $storedPinHash = $state['agent']['pin_hash'] ?? null;

        if (! is_string($storedTokenHash) || $storedTokenHash === '' || ! is_string($storedPinHash) || $storedPinHash === '') {
            return false;
        }

        $incomingHash = hash('sha256', $plainToken);
        if (! hash_equals($storedTokenHash, $incomingHash)) {
            return false;
        }

        return Hash::check($plainPin, $storedPinHash);
    }

    /**
     * Safe metadata summary for UI (never exposes hashes or secrets).
     *
     * @return array{has_token: bool, has_pin: bool, token_created_at: string|null, pin_updated_at: string|null}
     */
    public function getAgentSummary(): array
    {
        $state = $this->read();
        $agent = is_array($state['agent'] ?? null) ? $state['agent'] : [];

        return [
            'has_token' => $this->hasAgentToken(),
            'has_pin' => $this->hasAgentPin(),
            'token_created_at' => $this->formatIsoDate($agent['token_created_at'] ?? null),
            'pin_updated_at' => $this->formatIsoDate($agent['pin_updated_at'] ?? null),
        ];
    }

    /**
     * Record metadata of the latest verified arkas.db upload.
     *
     * @param  array<string, mixed>  $meta
     */
    public function recordUpload(array $meta): void
    {
        $state = $this->read();
        $state['last_upload'] = [
            'uploaded_at' => (string) ($meta['uploaded_at'] ?? Carbon::now()->toIso8601String()),
            'size_bytes' => (int) ($meta['size_bytes'] ?? 0),
            'sha256' => isset($meta['sha256']) && is_string($meta['sha256']) ? strtolower($meta['sha256']) : null,
            'via' => ($meta['via'] ?? 'browser') === 'agent' ? 'agent' : 'browser',
            'device_name' => isset($meta['device_name']) && is_string($meta['device_name']) && trim($meta['device_name']) !== ''
                ? mb_substr(trim($meta['device_name']), 0, 120)
                : null,
            'uploaded_by' => isset($meta['uploaded_by']) && is_string($meta['uploaded_by']) && trim($meta['uploaded_by']) !== ''
                ? mb_substr(trim($meta['uploaded_by']), 0, 120)
                : null,
            'years' => array_values(array_map('strval', is_array($meta['years'] ?? null) ? $meta['years'] : [])),
        ];

        $this->writeAtomically($state);
    }

    /**
     * Clear metadata of the uploaded file when removed from server.
     */
    public function clearLastUpload(): void
    {
        $state = $this->read();
        unset($state['last_upload']);
        $this->writeAtomically($state);
    }

    /**
     * @return array{uploaded_at: string|null, uploaded_at_iso: string|null, size_bytes: int|null, sha256: string|null, via: string|null, device_name: string|null, uploaded_by: string|null, years: array<int, string>}|null
     */
    public function getLastUpload(): ?array
    {
        $state = $this->read();
        $last = $state['last_upload'] ?? null;
        if (! is_array($last)) {
            return null;
        }

        $iso = is_string($last['uploaded_at'] ?? null) ? $last['uploaded_at'] : null;

        return [
            'uploaded_at' => $this->formatIsoDate($iso),
            'uploaded_at_iso' => $iso,
            'size_bytes' => isset($last['size_bytes']) ? (int) $last['size_bytes'] : null,
            'sha256' => is_string($last['sha256'] ?? null) ? $last['sha256'] : null,
            'via' => is_string($last['via'] ?? null) ? $last['via'] : null,
            'device_name' => is_string($last['device_name'] ?? null) ? $last['device_name'] : null,
            'uploaded_by' => is_string($last['uploaded_by'] ?? null) ? $last['uploaded_by'] : null,
            'years' => array_values(array_map('strval', is_array($last['years'] ?? null) ? $last['years'] : [])),
        ];
    }

    /**
     * @param  array<string, mixed>  $state
     */
    protected function writeAtomically(array $state): void
    {
        $path = $this->getStatePath();
        $dir = dirname($path);
        if (! is_dir($dir)) {
            @mkdir($dir, 0755, true);
        }

        $encoded = json_encode($state, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        if (! is_string($encoded)) {
            throw new \RuntimeException('Gagal menyerialisasi state konfigurasi ARKAS.');
        }

        $tmpPath = $path.'.'.bin2hex(random_bytes(6)).'.tmp';
        if (file_put_contents($tmpPath, $encoded, LOCK_EX) === false) {
            throw new \RuntimeException('Gagal menulis file sementara konfigurasi ARKAS.');
        }

        if (! @rename($tmpPath, $path)) {
            if (! @copy($tmpPath, $path)) {
                @unlink($tmpPath);
                throw new \RuntimeException('Gagal menyimpan file konfigurasi ARKAS.');
            }
            @unlink($tmpPath);
        }
    }

    protected function formatIsoDate(mixed $iso): ?string
    {
        if (! is_string($iso) || trim($iso) === '') {
            return null;
        }

        try {
            return Carbon::parse($iso)->format('d M Y, H:i');
        } catch (\Throwable) {
            return $iso;
        }
    }
}
