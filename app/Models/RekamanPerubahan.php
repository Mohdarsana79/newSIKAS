<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RekamanPerubahan extends Model
{
    use HasFactory;

    protected $fillable = [
        'penganggaran_id',
        'action',
        'description',
        'old_data',
        'new_data'
    ];

    protected $casts = [
        'old_data' => 'array',
        'new_data' => 'array',
    ];

    public function penganggaran()
    {
        return $this->belongsTo(Penganggaran::class);
    }
}
