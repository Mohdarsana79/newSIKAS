<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SyncLog extends Model
{
    protected $fillable = [
        'sekolah_id',
        'tahun',
        'status',
        'message',
        'payload'
    ];

    protected $casts = [
        'payload' => 'array',
        'tahun' => 'integer',
    ];
}
