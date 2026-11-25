<?php

namespace App\Services;

use App\Config\PermissionCatalog;
use App\Config\VariantConfig;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class ActivityLogger
{
    /**
     * Kunci input yang wajib disensor otomatis sebelum disimpan ke metadata.
     *
     * @var list<string>
     */
    private const SENSITIVE_KEY_TOKENS = [
        'password',
        'security_code',
        'deepseek_api_key',
        'api_key',
        'token',
        'secret',
        'otp',
        'pin',
        'npsn',
        'authorization',
        'cookie',
    ];

    /**
     * Label modul ramah baca untuk UI dan ekspor CSV.
     *
     * @return array<string, string>
     */
    public static function moduleLabels(): array
    {
        $labels = [
            'auth' => 'Autentikasi & Keamanan',
            'profile' => 'Profil & Akun',
            'system' => 'Sistem',
        ];

        foreach (PermissionCatalog::modules() as $mod) {
            $labels[$mod['key']] = $mod['label'];
        }

        return $labels;
    }

    /**
     * Label aksi standar untuk UI dan ekspor CSV.
     *
     * @return array<string, string>
     */
    public static function actionLabels(): array
    {
        return [
            'login' => 'Login',
            'logout' => 'Logout',
            'login_failed' => 'Gagal Login',
            'password_reset' => 'Reset Kata Sandi',
            'create' => 'Tambah Data',
            'update' => 'Ubah Data',
            'delete' => 'Hapus Data',
            'approve' => 'Pengesahan RKAS',
            'unapprove' => 'Batal Pengesahan',
            'review' => 'Telaah RKAS',
            'import' => 'Impor / Sinkronisasi',
            'backup' => 'Backup Database',
            'restore' => 'Restore Database',
            'reset' => 'Reset Database',
            'prune' => 'Pembersihan Log',
            'access_denied' => 'Akses Ditolak (403)',
            'action' => 'Aksi Sistem',
        ];
    }

    /**
     * Label varian BOSP untuk UI dan ekspor CSV.
     *
     * @return array<string, string>
     */
    public static function variantLabels(): array
    {
        return [
            VariantConfig::REGULER => 'BOSP Reguler',
            VariantConfig::KINERJA => 'BOSP Kinerja',
            VariantConfig::SILPA => 'SiLPA BOSP Reguler',
            VariantConfig::KINERJA_SILPA => 'SiLPA BOSP Kinerja',
            'global' => 'Global / Sistem',
        ];
    }

    /**
     * Label tingkat keparahan.
     *
     * @return array<string, string>
     */
    public static function severityLabels(): array
    {
        return [
            ActivityLog::SEVERITY_INFO => 'Info',
            ActivityLog::SEVERITY_WARNING => 'Peringatan',
            ActivityLog::SEVERITY_CRITICAL => 'Kritis',
        ];
    }

    /**
     * Tulis satu entri log secara fail-safe (tidak pernah menggagalkan alur utama).
     *
     * @param  array<string, mixed>  $attributes
     */
    public function log(array $attributes): ?ActivityLog
    {
        try {
            $data = [
                'user_id' => $attributes['user_id'] ?? null,
                'actor_name' => Str::limit((string) ($attributes['actor_name'] ?? 'Sistem'), 150, ''),
                'actor_username' => isset($attributes['actor_username'])
                    ? Str::limit((string) $attributes['actor_username'], 150, '')
                    : null,
                'actor_role' => isset($attributes['actor_role'])
                    ? Str::limit((string) $attributes['actor_role'], 64, '')
                    : null,
                'module' => Str::limit((string) ($attributes['module'] ?? 'system'), 64, ''),
                'variant' => $attributes['variant'] ?? null,
                'action' => Str::limit((string) ($attributes['action'] ?? 'action'), 64, ''),
                'severity' => in_array($attributes['severity'] ?? '', [
                    ActivityLog::SEVERITY_INFO,
                    ActivityLog::SEVERITY_WARNING,
                    ActivityLog::SEVERITY_CRITICAL,
                ], true)
                    ? $attributes['severity']
                    : ActivityLog::SEVERITY_INFO,
                'description' => (string) ($attributes['description'] ?? 'Menjalankan aksi pada aplikasi'),
                'route_name' => isset($attributes['route_name'])
                    ? Str::limit((string) $attributes['route_name'], 150, '')
                    : null,
                'http_method' => isset($attributes['http_method'])
                    ? Str::limit(strtoupper((string) $attributes['http_method']), 12, '')
                    : null,
                'url_path' => isset($attributes['url_path'])
                    ? Str::limit((string) $attributes['url_path'], 255, '')
                    : null,
                'status_code' => isset($attributes['status_code']) ? (int) $attributes['status_code'] : null,
                'ip_address' => isset($attributes['ip_address'])
                    ? Str::limit((string) $attributes['ip_address'], 45, '')
                    : null,
                'user_agent' => isset($attributes['user_agent'])
                    ? Str::limit((string) $attributes['user_agent'], 512, '')
                    : null,
                'metadata' => $attributes['metadata'] ?? null,
            ];

            return ActivityLog::create($data);
        } catch (Throwable $e) {
            Log::warning('ActivityLogger gagal mencatat aktivitas.', [
                'module' => $attributes['module'] ?? null,
                'action' => $attributes['action'] ?? null,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Catat peristiwa autentikasi (login, logout, gagal login, reset password).
     *
     * @param  array<string, mixed>  $extraMetadata
     */
    public function logAuthEvent(
        Request $request,
        string $action,
        string $description,
        ?User $user = null,
        string $severity = ActivityLog::SEVERITY_INFO,
        array $extraMetadata = [],
        ?string $actorUsername = null,
    ): ?ActivityLog {
        $resolvedUsername = $actorUsername
            ?? $user?->username
            ?? $user?->email
            ?? trim((string) $request->input('username', $request->input('email', '')));

        $metadata = array_filter([
            ...$extraMetadata,
        ], static fn ($value) => $value !== null && $value !== '');

        $statusCode = match (true) {
            $action === 'login_failed' && ($extraMetadata['reason'] ?? null) === 'rate_limited' => 429,
            $action === 'login_failed' => 401,
            default => 200,
        };

        return $this->log([
            'user_id' => $user?->id,
            'actor_name' => $user?->name ?? ($resolvedUsername !== '' ? $resolvedUsername : 'Tamu / Tidak Dikenal'),
            'actor_username' => $resolvedUsername !== '' ? $resolvedUsername : null,
            'actor_role' => $user?->role,
            'module' => 'auth',
            'variant' => null,
            'action' => $action,
            'severity' => $severity,
            'description' => $description,
            'route_name' => $request->route()?->getName(),
            'http_method' => strtoupper($request->method()),
            'url_path' => '/'.ltrim($request->path(), '/'),
            'status_code' => $statusCode,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'metadata' => $metadata !== [] ? $metadata : null,
        ]);
    }

    /**
     * Catat mutasi HTTP atau percobaan akses 403 secara otomatis dari middleware global.
     */
    public function logHttpMutation(
        Request $request,
        ?Response $response = null,
        ?User $actor = null,
        ?int $overrideStatusCode = null,
    ): ?ActivityLog {
        $user = $actor ?? $request->user();
        if (! $user) {
            return null;
        }

        $routeName = $request->route()?->getName();
        $method = strtoupper($request->method());
        $statusCode = $overrideStatusCode ?? $response?->getStatusCode() ?? 200;

        $normalizedRoute = is_string($routeName) ? PermissionCatalog::stripVariantPrefix($routeName) : '';
        $module = $this->resolveModule($routeName, $normalizedRoute, $method);
        $variant = $this->resolveVariant($request, $routeName, $module);
        $action = $this->resolveAction($normalizedRoute, $method, $statusCode);
        $severity = $this->resolveSeverity($normalizedRoute, $action, $statusCode);
        $description = $this->buildDescription($normalizedRoute, $action, $module, $variant, $statusCode);

        $routeParams = $this->extractSafeRouteParameters($request);
        $payload = $this->sanitizePayload($request->except(['_method', '_variant']), $request->allFiles());

        $metadata = [];
        if ($routeParams !== []) {
            $metadata['route_params'] = $routeParams;
        }
        if ($payload !== []) {
            $metadata['payload'] = $payload;
        }

        return $this->log([
            'user_id' => $user->id,
            'actor_name' => $user->name,
            'actor_username' => $user->username ?: $user->email,
            'actor_role' => $user->role ?: 'bendahara',
            'module' => $module,
            'variant' => $variant,
            'action' => $action,
            'severity' => $severity,
            'description' => $description,
            'route_name' => $routeName,
            'http_method' => $method,
            'url_path' => '/'.ltrim($request->path(), '/'),
            'status_code' => $statusCode,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'metadata' => $metadata !== [] ? $metadata : null,
        ]);
    }

    /**
     * Sanitasi payload input dan unggahan berkas sebelum disimpan.
     *
     * @param  array<string, mixed>  $input
     * @param  array<string, mixed>  $files
     * @return array<string, mixed>
     */
    public function sanitizePayload(array $input, array $files = [], int $depth = 0): array
    {
        if ($depth >= 4) {
            return ['_truncated' => true];
        }

        $sanitized = [];
        $count = 0;

        foreach ($input as $key => $value) {
            if ($count >= 40) {
                $sanitized['_truncated_keys'] = true;
                break;
            }
            $count++;

            $keyStr = (string) $key;
            if ($keyStr === '_method') {
                continue;
            }

            if ($this->isSensitiveKey($keyStr)) {
                $sanitized[$keyStr] = '[DISENSOR]';

                continue;
            }

            if ($value instanceof UploadedFile) {
                $sanitized[$keyStr] = $this->describeUploadedFile($value);

                continue;
            }

            if (is_array($value)) {
                $sanitized[$keyStr] = $this->sanitizePayload($value, [], $depth + 1);

                continue;
            }

            if (is_string($value)) {
                $sanitized[$keyStr] = Str::limit($value, 500, '...');

                continue;
            }

            if (is_scalar($value) || $value === null) {
                $sanitized[$keyStr] = $value;
            }
        }

        foreach ($files as $fileKey => $fileValue) {
            $keyStr = (string) $fileKey;
            if ($this->isSensitiveKey($keyStr)) {
                $sanitized[$keyStr] = '[DISENSOR]';

                continue;
            }
            if ($fileValue instanceof UploadedFile) {
                $sanitized[$keyStr] = $this->describeUploadedFile($fileValue);
            } elseif (is_array($fileValue)) {
                $sanitized[$keyStr] = array_map(
                    fn ($item) => $item instanceof UploadedFile ? $this->describeUploadedFile($item) : '[FILE]',
                    array_slice($fileValue, 0, 10)
                );
            }
        }

        return $sanitized;
    }

    protected function isSensitiveKey(string $key): bool
    {
        $lower = Str::lower($key);

        foreach (self::SENSITIVE_KEY_TOKENS as $token) {
            if (str_contains($lower, $token)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return array{file: string, size_kb: float, mime: string|null}
     */
    protected function describeUploadedFile(UploadedFile $file): array
    {
        return [
            'file' => Str::limit($file->getClientOriginalName(), 180, ''),
            'size_kb' => round(($file->getSize() ?: 0) / 1024, 2),
            'mime' => $file->getClientMimeType(),
        ];
    }

    /**
     * @return array<string, scalar>
     */
    protected function extractSafeRouteParameters(Request $request): array
    {
        $params = $request->route()?->parameters() ?? [];
        $safe = [];

        foreach ($params as $key => $value) {
            if ($this->isSensitiveKey((string) $key)) {
                continue;
            }

            if (is_object($value) && method_exists($value, 'getKey')) {
                $keyVal = $value->getKey();
                if (is_scalar($keyVal)) {
                    $safe[(string) $key] = $keyVal;
                }
            } elseif (is_scalar($value)) {
                $safe[(string) $key] = Str::limit((string) $value, 120, '');
            }
        }

        return $safe;
    }

    protected function resolveModule(?string $routeName, string $normalizedRoute, string $method): string
    {
        if (str_starts_with($normalizedRoute, 'profile.')) {
            return 'profile';
        }

        if (str_starts_with($normalizedRoute, 'password.') || in_array($normalizedRoute, ['login', 'logout', 'register'], true)) {
            return 'auth';
        }

        if (str_starts_with($normalizedRoute, 'activity-logs.')) {
            return 'activity_logs';
        }

        if ($normalizedRoute === 'api.ai.copilot.commit') {
            return 'penatausahaan';
        }

        $requirement = PermissionCatalog::resolveRouteRequirement($routeName, $method);
        if (is_array($requirement)) {
            if (! empty($requirement['module'])) {
                return (string) $requirement['module'];
            }
            if (! empty($requirement['ability'])) {
                return str_starts_with((string) $requirement['ability'], 'rkas_') ? 'penganggaran' : 'system';
            }
        }

        return 'system';
    }

    protected function resolveVariant(Request $request, ?string $routeName, string $module): ?string
    {
        // Modul global/sistem tidak terikat varian BOSP.
        $globalModules = [
            'auth',
            'profile',
            'backup',
            'network_settings',
            'system_update',
            'user_management',
            'activity_logs',
            'sk_surat',
            'sekolah_profile',
            'kode_kegiatan',
            'rekening_belanja',
            'path_arkas',
            'system',
        ];

        if (in_array($module, $globalModules, true)) {
            return null;
        }

        if (is_string($routeName)) {
            if (Str::startsWith($routeName, 'kinerja-silpa-')) {
                return VariantConfig::KINERJA_SILPA;
            }
            if (Str::startsWith($routeName, 'kinerja-')) {
                return VariantConfig::KINERJA;
            }
            if (Str::startsWith($routeName, 'silpa-')) {
                return VariantConfig::SILPA;
            }
        }

        $boundVariant = app()->bound('variant') ? app('variant') : null;
        if (is_string($boundVariant) && in_array($boundVariant, VariantConfig::VARIANTS, true)) {
            return $boundVariant;
        }

        $path = ltrim($request->path(), '/');
        if (Str::startsWith($path, 'kinerja-silpa/')) {
            return VariantConfig::KINERJA_SILPA;
        }
        if (Str::startsWith($path, 'kinerja/')) {
            return VariantConfig::KINERJA;
        }
        if (Str::startsWith($path, 'silpa/')) {
            return VariantConfig::SILPA;
        }

        return VariantConfig::REGULER;
    }

    protected function resolveAction(string $normalizedRoute, string $method, int $statusCode): string
    {
        if ($statusCode === 403) {
            return 'access_denied';
        }

        if ($normalizedRoute === 'penganggaran.approve') {
            return 'approve';
        }
        if ($normalizedRoute === 'penganggaran.unapprove') {
            return 'unapprove';
        }
        if (str_starts_with($normalizedRoute, 'rkas-review.')) {
            return 'review';
        }
        if ($normalizedRoute === 'backup.create') {
            return 'backup';
        }
        if ($normalizedRoute === 'backup.restore') {
            return 'restore';
        }
        if ($normalizedRoute === 'backup.reset') {
            return 'reset';
        }
        if ($normalizedRoute === 'activity-logs.prune') {
            return 'prune';
        }
        if (
            str_contains($normalizedRoute, 'import')
            || str_contains($normalizedRoute, 'sync')
            || str_contains($normalizedRoute, 'pull-arkas')
        ) {
            return 'import';
        }

        if (
            $method === 'DELETE'
            || str_ends_with($normalizedRoute, '.destroy')
            || str_ends_with($normalizedRoute, '.delete')
            || str_ends_with($normalizedRoute, '.remove')
            || str_contains($normalizedRoute, '.destroy-')
        ) {
            return 'delete';
        }
        if (in_array($method, ['PUT', 'PATCH'], true) || str_contains($normalizedRoute, '.update')) {
            return 'update';
        }
        if ($method === 'POST' && (str_contains($normalizedRoute, '.store') || str_contains($normalizedRoute, '.create'))) {
            return 'create';
        }

        return match ($method) {
            'POST' => 'create',
            'PUT', 'PATCH' => 'update',
            'DELETE' => 'delete',
            default => 'action',
        };
    }

    protected function resolveSeverity(string $normalizedRoute, string $action, int $statusCode): string
    {
        if ($action === 'access_denied' || $statusCode === 403) {
            return ActivityLog::SEVERITY_WARNING;
        }

        $criticalRoutes = [
            'backup.restore',
            'backup.reset',
            'backup.update-npsn',
            'bku.destroy-period',
            'penganggaran.unapprove',
            'user-management.destroy',
            'user-management.permissions',
            'management-role.roles.update',
            'management-role.roles.destroy',
            'activity-logs.prune',
        ];

        if (in_array($normalizedRoute, $criticalRoutes, true) || in_array($action, ['restore', 'reset', 'prune', 'unapprove'], true)) {
            return ActivityLog::SEVERITY_CRITICAL;
        }

        $warningRoutes = [
            'password.update',
            'profile.toggle-security',
            'profile.generate-security-code',
            'system-update.start-online',
            'system-update.upload-manual',
            'backup.auto-settings.update',
            'backup.auto-scheduler.install',
            'backup.auto-scheduler.remove',
        ];

        if (
            $statusCode >= 400
            || $action === 'delete'
            || in_array($normalizedRoute, $warningRoutes, true)
        ) {
            return ActivityLog::SEVERITY_WARNING;
        }

        return ActivityLog::SEVERITY_INFO;
    }

    protected function buildDescription(
        string $normalizedRoute,
        string $action,
        string $module,
        ?string $variant,
        int $statusCode,
    ): string {
        $variantSuffix = $variant !== null && isset(self::variantLabels()[$variant])
            ? ' pada '.self::variantLabels()[$variant]
            : '';

        if ($statusCode === 403) {
            $modLabel = self::moduleLabels()[$module] ?? $module;

            return "Percobaan akses ditolak (403) pada modul {$modLabel}{$variantSuffix}";
        }

        $exactMap = [
            'penganggaran.approve' => 'Mengesahkan penganggaran RKAS',
            'penganggaran.unapprove' => 'Membatalkan pengesahan penganggaran RKAS',
            'rkas-review.store' => 'Menyimpan catatan telaah item belanja RKAS',
            'rkas-review.destroy' => 'Menghapus catatan telaah item belanja RKAS',
            'rkas-review.resubmit' => 'Mengajukan ulang item belanja RKAS setelah revisi',
            'backup.create' => 'Membuat file backup database',
            'backup.restore' => 'Memulihkan database dari file backup',
            'backup.delete' => 'Menghapus file backup database',
            'backup.reset' => 'Menjalankan reset database aplikasi',
            'backup.update-npsn' => 'Memperbarui konfigurasi NPSN aplikasi',
            'backup.auto-settings.update' => 'Memperbarui pengaturan Auto-Backup, Retensi & Sinkronisasi',
            'backup.create-folder' => 'Membuat folder tujuan baru untuk Auto-Backup',
            'backup.auto-scheduler.install' => 'Mengaktifkan Background Windows Task Scheduler untuk Auto-Backup',
            'backup.auto-scheduler.remove' => 'Menonaktifkan Background Windows Task Scheduler untuk Auto-Backup',
            'bku.destroy-period' => 'Menghapus seluruh transaksi BKU satu periode',
            'api.ai.copilot.commit' => 'Menyimpan transaksi BKU melalui AI Copilot',
            'user-management.store' => 'Menambahkan akun pengguna baru',
            'user-management.update' => 'Memperbarui data akun pengguna',
            'user-management.permissions' => 'Mengubah override hak akses pengguna',
            'user-management.destroy' => 'Menghapus akun pengguna',
            'management-role.roles.store' => 'Membuat role custom baru',
            'management-role.roles.update' => 'Memperbarui konfigurasi & izin role',
            'management-role.roles.destroy' => 'Menghapus role custom',
            'profile.update' => 'Memperbarui informasi profil akun',
            'profile.toggle-security' => 'Mengubah status kode keamanan 2FA akun',
            'profile.generate-security-code' => 'Membuat ulang kode keamanan 2FA akun',
            'profile.deepseek-settings' => 'Memperbarui pengaturan AI DeepSeek',
            'profile.deepseek-test' => 'Menguji koneksi AI DeepSeek',
            'password.update' => 'Mengubah kata sandi akun',
            'network-settings.update' => 'Memperbarui pengaturan jaringan aplikasi',
            'network-settings.firewall-open' => 'Membuka aturan Windows Firewall untuk jaringan LAN',
            'system-update.check' => 'Memeriksa pembaruan versi aplikasi',
            'system-update.start-online' => 'Menjalankan pembaruan aplikasi secara online',
            'system-update.upload-manual' => 'Menjalankan pembaruan aplikasi via unggah manual',
            'arkas-tools.save-path' => 'Menyimpan jalur folder database ARKAS',
            'arkas-tools.set-mode' => 'Mengubah mode aktif sumber database ARKAS',
            'arkas-tools.upload-db' => 'Mengunggah file database arkas.db',
            'arkas-tools.upload-finalize' => 'Menyelesaikan unggahan chunked database arkas.db',
            'arkas-tools.remove-uploaded-db' => 'Menghapus file database arkas.db unggahan',
            'arkas-tools.agent-pin' => 'Memperbarui PIN Sinkronisasi Agent ARKAS',
            'arkas-tools.agent-download' => 'Membuat token baru & mengunduh Agent Sync ARKAS (.bat)',
            'arkas-tools.agent-revoke' => 'Mencabut akses token Agent Sync ARKAS',
        ];

        if (isset($exactMap[$normalizedRoute])) {
            return $exactMap[$normalizedRoute].$variantSuffix;
        }

        $modLabel = self::moduleLabels()[$module] ?? ucfirst(str_replace('_', ' ', $module));

        $verb = match ($action) {
            'create' => 'Menambahkan data',
            'update' => 'Memperbarui data',
            'delete' => 'Menghapus data',
            'import' => 'Mengimpor / menyinkronkan data',
            'review' => 'Menelaah data',
            'approve' => 'Mengesahkan data',
            'unapprove' => 'Membatalkan pengesahan',
            default => 'Menjalankan aksi',
        };

        return "{$verb} pada {$modLabel}{$variantSuffix}";
    }
}
