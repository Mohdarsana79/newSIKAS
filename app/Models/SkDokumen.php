<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SkDokumen extends Model
{
    use HasFactory;

    protected $table = 'sk_dokumens';

    protected $fillable = [
        'folder_id',
        'template_id',
        'tipe',
        'nomor_surat',
        'perihal',
        'tanggal_surat',
        'data_isian',
        'file_path',
        'file_name_original',
        'keterangan',
        'created_by',
    ];

    protected $casts = [
        'data_isian' => 'array',
        'tanggal_surat' => 'date',
    ];

    public function folder(): BelongsTo
    {
        return $this->belongsTo(SkFolder::class, 'folder_id');
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(SkTemplate::class, 'template_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
