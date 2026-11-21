<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActivityLog extends Model
{
    public const UPDATED_AT = null;

    public const SEVERITY_INFO = 'info';

    public const SEVERITY_WARNING = 'warning';

    public const SEVERITY_CRITICAL = 'critical';

    protected $table = 'activity_logs';

    protected $fillable = [
        'user_id',
        'actor_name',
        'actor_username',
        'actor_role',
        'module',
        'variant',
        'action',
        'severity',
        'description',
        'route_name',
        'http_method',
        'url_path',
        'status_code',
        'ip_address',
        'user_agent',
        'metadata',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'user_id' => 'integer',
            'status_code' => 'integer',
            'metadata' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Terapkan filter pencarian & multi-dimensi secara konsisten untuk halaman indeks & ekspor CSV.
     *
     * @param  Builder<ActivityLog>  $query
     * @param  array<string, mixed>  $filters
     * @return Builder<ActivityLog>
     */
    public function scopeFilter(Builder $query, array $filters): Builder
    {
        $search = trim((string) ($filters['search'] ?? ''));
        if ($search !== '') {
            $driver = $query->getConnection()->getDriverName();
            $operator = $driver === 'pgsql' ? 'ILIKE' : 'LIKE';
            $escaped = str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $search);
            $term = '%'.$escaped.'%';

            $query->where(function (Builder $sub) use ($operator, $term) {
                $columns = ['description', 'actor_name', 'actor_username', 'route_name', 'url_path', 'ip_address'];
                foreach ($columns as $index => $column) {
                    $method = $index === 0 ? 'whereRaw' : 'orWhereRaw';
                    $sub->{$method}("{$column} {$operator} ? ESCAPE '!'", [$term]);
                }
            });
        }

        if (! empty($filters['user_id']) && is_numeric($filters['user_id'])) {
            $query->where('user_id', (int) $filters['user_id']);
        }

        if (! empty($filters['module']) && is_string($filters['module'])) {
            $query->where('module', $filters['module']);
        }

        if (! empty($filters['variant']) && is_string($filters['variant'])) {
            if ($filters['variant'] === 'global') {
                $query->whereNull('variant');
            } else {
                $query->where('variant', $filters['variant']);
            }
        }

        if (! empty($filters['action']) && is_string($filters['action'])) {
            $query->where('action', $filters['action']);
        }

        if (! empty($filters['severity']) && is_string($filters['severity'])) {
            $query->where('severity', $filters['severity']);
        }

        if (! empty($filters['date_from']) && is_string($filters['date_from'])) {
            try {
                $from = Carbon::parse($filters['date_from'])->startOfDay();
                $query->where('created_at', '>=', $from);
            } catch (\Throwable) {
                // Abaikan format tanggal tidak valid
            }
        }

        if (! empty($filters['date_to']) && is_string($filters['date_to'])) {
            try {
                $to = Carbon::parse($filters['date_to'])->endOfDay();
                $query->where('created_at', '<=', $to);
            } catch (\Throwable) {
                // Abaikan format tanggal tidak valid
            }
        }

        return $query;
    }
}
