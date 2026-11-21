<?php

namespace App\Http\Controllers;

use App\Config\PermissionCatalog;
use App\Models\ActivityLog;
use App\Models\User;
use App\Services\ActivityLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ActivityLogController extends Controller
{
    private const ALLOWED_PER_PAGE = [15, 25, 50];

    private const MAX_EXPORT_ROWS = 10000;

    private const SECURITY_ACTIONS = [
        'login_failed',
        'access_denied',
        'password_reset',
        'reset',
        'restore',
    ];

    /**
     * Tampilkan halaman utama Audit Trail / Log Aktivitas Pengguna.
     */
    public function index(Request $request): InertiaResponse
    {
        $filters = $this->extractFilters($request);
        $perPage = (int) $request->input('per_page', 25);
        if (! in_array($perPage, self::ALLOWED_PER_PAGE, true)) {
            $perPage = 25;
        }

        $moduleLabels = ActivityLogger::moduleLabels();
        $actionLabels = ActivityLogger::actionLabels();
        $variantLabels = ActivityLogger::variantLabels();
        $severityLabels = ActivityLogger::severityLabels();

        $paginator = ActivityLog::query()
            ->filter($filters)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString()
            ->through(function (ActivityLog $log) use ($moduleLabels, $actionLabels, $variantLabels, $severityLabels) {
                $createdAt = $log->created_at;

                return [
                    'id' => $log->id,
                    'user_id' => $log->user_id,
                    'actor_name' => $log->actor_name,
                    'actor_username' => $log->actor_username,
                    'actor_role' => $log->actor_role,
                    'module' => $log->module,
                    'module_label' => $moduleLabels[$log->module] ?? ucfirst(str_replace('_', ' ', $log->module)),
                    'variant' => $log->variant,
                    'variant_label' => $log->variant ? ($variantLabels[$log->variant] ?? $log->variant) : null,
                    'action' => $log->action,
                    'action_label' => $actionLabels[$log->action] ?? ucfirst(str_replace('_', ' ', $log->action)),
                    'severity' => $log->severity,
                    'severity_label' => $severityLabels[$log->severity] ?? ucfirst($log->severity),
                    'description' => $log->description,
                    'route_name' => $log->route_name,
                    'http_method' => $log->http_method,
                    'url_path' => $log->url_path,
                    'status_code' => $log->status_code,
                    'ip_address' => $log->ip_address,
                    'user_agent' => $log->user_agent,
                    'created_at_formatted' => $createdAt?->timezone(config('app.timezone'))->format('d M Y, H:i:s'),
                    'created_at_human' => $createdAt?->copy()->locale('id')->diffForHumans(),
                ];
            });

        $stats = [
            'total' => ActivityLog::query()->count(),
            'today' => ActivityLog::query()
                ->where('created_at', '>=', now()->startOfDay())
                ->count(),
            'critical_or_security' => ActivityLog::query()
                ->where('created_at', '>=', now()->subDays(30))
                ->where(function ($query) {
                    $query->where('severity', ActivityLog::SEVERITY_CRITICAL)
                        ->orWhereIn('action', self::SECURITY_ACTIONS);
                })
                ->count(),
            'active_users_7d' => (int) ActivityLog::query()
                ->where('created_at', '>=', now()->subDays(7))
                ->whereNotNull('user_id')
                ->distinct('user_id')
                ->count('user_id'),
        ];

        $users = User::query()
            ->orderBy('name')
            ->get(['id', 'name', 'username', 'role'])
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'username' => $u->username,
                'role' => $u->role,
            ])
            ->values();

        return Inertia::render('ActivityLogs/Index', [
            'logs' => $paginator,
            'filters' => [
                ...$filters,
                'per_page' => $perPage,
            ],
            'stats' => $stats,
            'filterOptions' => [
                'users' => $users,
                'modules' => $this->toOptionList($moduleLabels),
                'variants' => $this->toOptionList($variantLabels),
                'actions' => $this->toOptionList($actionLabels),
                'severities' => $this->toOptionList($severityLabels),
            ],
            'canPrune' => $request->user()?->canAccessModule('activity_logs', PermissionCatalog::LEVEL_WRITE) ?? false,
        ]);
    }

    /**
     * Ekspor hasil filter Log Aktivitas ke CSV (UTF-8 BOM, siap buka di Microsoft Excel).
     */
    public function export(Request $request): StreamedResponse
    {
        $filters = $this->extractFilters($request);
        $moduleLabels = ActivityLogger::moduleLabels();
        $actionLabels = ActivityLogger::actionLabels();
        $variantLabels = ActivityLogger::variantLabels();
        $severityLabels = ActivityLogger::severityLabels();

        $filename = 'audit-trail-sikas-'.now()->format('Ymd-His').'.csv';

        return response()->streamDownload(function () use ($filters, $moduleLabels, $actionLabels, $variantLabels, $severityLabels) {
            $handle = fopen('php://output', 'w');
            if ($handle === false) {
                return;
            }

            // UTF-8 BOM agar Excel Windows membaca karakter Indonesia & kolom dengan benar.
            fwrite($handle, "\xEF\xBB\xBF");

            fputcsv($handle, [
                'Waktu',
                'Pengguna',
                'Username',
                'Role',
                'Modul',
                'Varian BOSP',
                'Aksi',
                'Tingkat',
                'Deskripsi',
                'Metode',
                'Route',
                'Status HTTP',
                'IP Address',
            ]);

            $query = ActivityLog::query()
                ->filter($filters)
                ->orderByDesc('created_at')
                ->orderByDesc('id')
                ->limit(self::MAX_EXPORT_ROWS);

            foreach ($query->cursor() as $log) {
                $variantText = $log->variant
                    ? ($variantLabels[$log->variant] ?? $log->variant)
                    : 'Global / Sistem';

                fputcsv($handle, [
                    $log->created_at?->timezone(config('app.timezone'))->format('Y-m-d H:i:s') ?? '',
                    $this->escapeCsvCell($log->actor_name),
                    $this->escapeCsvCell((string) ($log->actor_username ?? '')),
                    $this->escapeCsvCell((string) ($log->actor_role ?? '')),
                    $this->escapeCsvCell($moduleLabels[$log->module] ?? $log->module),
                    $this->escapeCsvCell($variantText),
                    $this->escapeCsvCell($actionLabels[$log->action] ?? $log->action),
                    $this->escapeCsvCell($severityLabels[$log->severity] ?? $log->severity),
                    $this->escapeCsvCell($log->description),
                    (string) ($log->http_method ?? ''),
                    $this->escapeCsvCell((string) ($log->route_name ?? '')),
                    $log->status_code !== null ? (string) $log->status_code : '',
                    (string) ($log->ip_address ?? ''),
                ]);
            }

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Cache-Control' => 'no-store, private',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    /**
     * Bersihkan log lama sesuai kebijakan retensi (khusus izin tulis) dan catat aksi pembersihan itu sendiri.
     */
    public function prune(Request $request, ActivityLogger $logger): RedirectResponse
    {
        $user = $request->user();
        if (! $user || ! $user->canAccessModule('activity_logs', PermissionCatalog::LEVEL_WRITE)) {
            abort(403, 'Akses ditolak. Akun Anda tidak memiliki izin untuk membersihkan log aktivitas.');
        }

        $validated = $request->validate([
            'retention_days' => ['required', 'integer', 'in:90,180,365'],
        ]);

        $retentionDays = (int) $validated['retention_days'];
        $cutoff = now()->subDays($retentionDays);

        $deletedCount = ActivityLog::query()
            ->where('created_at', '<', $cutoff)
            ->delete();

        $logger->log([
            'user_id' => $user->id,
            'actor_name' => $user->name,
            'actor_username' => $user->username ?: $user->email,
            'actor_role' => $user->role ?: 'bendahara',
            'module' => 'activity_logs',
            'variant' => null,
            'action' => 'prune',
            'severity' => ActivityLog::SEVERITY_CRITICAL,
            'description' => "Membersihkan {$deletedCount} entri log aktivitas yang lebih tua dari {$retentionDays} hari",
            'route_name' => $request->route()?->getName(),
            'http_method' => strtoupper($request->method()),
            'url_path' => '/'.ltrim($request->path(), '/'),
            'status_code' => 302,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'metadata' => [
                'retention_days' => $retentionDays,
                'cutoff_date' => $cutoff->toIso8601String(),
                'deleted_count' => $deletedCount,
            ],
        ]);

        $message = $deletedCount > 0
            ? "Berhasil membersihkan {$deletedCount} entri log yang lebih tua dari {$retentionDays} hari."
            : "Tidak ada entri log yang lebih tua dari {$retentionDays} hari untuk dibersihkan.";

        return redirect()->back()->with('success', $message);
    }

    /**
     * @return array{search: string, user_id: string, module: string, variant: string, action: string, severity: string, date_from: string, date_to: string}
     */
    protected function extractFilters(Request $request): array
    {
        return [
            'search' => trim((string) $request->input('search', '')),
            'user_id' => trim((string) $request->input('user_id', '')),
            'module' => trim((string) $request->input('module', '')),
            'variant' => trim((string) $request->input('variant', '')),
            'action' => trim((string) $request->input('action', '')),
            'severity' => trim((string) $request->input('severity', '')),
            'date_from' => trim((string) $request->input('date_from', '')),
            'date_to' => trim((string) $request->input('date_to', '')),
        ];
    }

    /**
     * @param  array<string, string>  $map
     * @return list<array{value: string, label: string}>
     */
    protected function toOptionList(array $map): array
    {
        $options = [];
        foreach ($map as $value => $label) {
            $options[] = ['value' => $value, 'label' => $label];
        }

        return $options;
    }

    /**
     * Lindungi sel CSV dari formula injection saat dibuka di Excel (termasuk spasi/newline di awal).
     */
    protected function escapeCsvCell(string $value): string
    {
        if ($value !== '' && preg_match('/^[\s\t\r\n]*[=+\-@]|^[\t\r\n]/', $value) === 1) {
            return "'".$value;
        }

        return $value;
    }
}
