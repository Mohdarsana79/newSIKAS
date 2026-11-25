<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RekeningBelanja extends Model
{
    use HasFactory;

    protected $table = 'rekening_belanjas';

    protected $fillable = [
        'tahun',
        'kode_rekening',
        'rincian_objek',
        'kategori',
        'is_ppn',
        'is_pph21',
        'is_pph22',
        'is_pph23',
        'is_pph4',
    ];

    protected $casts = [
        'tahun' => 'integer',
        'is_ppn' => 'boolean',
        'is_pph21' => 'boolean',
        'is_pph22' => 'boolean',
        'is_pph23' => 'boolean',
        'is_pph4' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $model) {
            if (empty($model->tahun)) {
                $model->tahun = (int) date('Y');
            }
        });
    }

    public function scopeForYear($query, int $tahun)
    {
        return $query->where('tahun', $tahun);
    }
}
