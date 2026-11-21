<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NotificationDismissal extends Model
{
    public $timestamps = false;

    protected $table = 'notification_dismissals';

    protected $fillable = [
        'user_id',
        'notification_key',
        'dismissed_at',
    ];

    protected function casts(): array
    {
        return [
            'user_id' => 'integer',
            'dismissed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
