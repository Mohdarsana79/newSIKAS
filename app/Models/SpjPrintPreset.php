<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SpjPrintPreset extends Model
{
    protected $table = 'spj_print_presets';

    protected $fillable = [
        'variant',
        'tahun_anggaran',
        'nama_preset',
        'cover_config',
        'bundle_config',
        'updated_by',
    ];

    protected $casts = [
        'tahun_anggaran' => 'integer',
        'cover_config' => 'array',
        'bundle_config' => 'array',
    ];

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
