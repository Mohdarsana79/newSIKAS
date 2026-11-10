<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SkTemplate extends Model
{
    use HasFactory;

    protected $table = 'sk_templates';

    protected $fillable = [
        'folder_id',
        'judul',
        'file_path',
        'file_name_original',
        'detected_variables',
        'created_by',
    ];

    protected $casts = [
        'detected_variables' => 'array',
    ];

    public function folder(): BelongsTo
    {
        return $this->belongsTo(SkFolder::class, 'folder_id');
    }

    public function dokumens(): HasMany
    {
        return $this->hasMany(SkDokumen::class, 'template_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
