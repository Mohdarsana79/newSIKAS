<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SkFolder extends Model
{
    use HasFactory;

    protected $table = 'sk_folders';

    protected $fillable = [
        'nama_folder',
        'deskripsi',
        'warna',
        'created_by',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function templates(): HasMany
    {
        return $this->hasMany(SkTemplate::class, 'folder_id');
    }

    public function dokumens(): HasMany
    {
        return $this->hasMany(SkDokumen::class, 'folder_id');
    }
}
