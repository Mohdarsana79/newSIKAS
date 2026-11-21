<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BackupRun extends Model
{
    public const UPDATED_AT = null;

    public const STATUS_SUCCESS = 'success';

    public const STATUS_PARTIAL = 'partial';

    public const STATUS_FAILED = 'failed';

    protected $table = 'backup_runs';

    protected $fillable = [
        'trigger',
        'status',
        'file_name',
        'file_size_bytes',
        'pruned_count',
        'sync_mode',
        'sync_status',
        'sync_target',
        'message',
        'started_at',
        'finished_at',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'file_size_bytes' => 'integer',
            'pruned_count' => 'integer',
            'started_at' => 'datetime',
            'finished_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }
}
