<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KwitansiTemplate extends Model
{
    use HasFactory;

    protected $table = 'kwitansi_templates';

    protected $fillable = [
        'nama',
        'deskripsi',
        'file_path',
        'original_filename',
        'file_size',
        'detected_variables',
        'has_item_table',
        'created_by',
    ];

    protected $casts = [
        'file_size' => 'integer',
        'detected_variables' => 'array',
        'has_item_table' => 'boolean',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
