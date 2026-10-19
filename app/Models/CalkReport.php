<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CalkReport extends Model
{
    protected $table = 'calk_reports';

    protected $fillable = [
        'variant',
        'tahun_anggaran',
        'periode',
        'judul_laporan',
        'metrics_snapshot',
        'bab_1_pendahuluan',
        'bab_2_kebijakan_akuntansi',
        'bab_3_analisis_realisasi',
        'bab_4_penjelasan_pos_keuangan',
        'bab_5_penutup',
        'user_id',
        'is_finalized',
    ];

    protected $casts = [
        'metrics_snapshot' => 'array',
        'is_finalized' => 'boolean',
        'tahun_anggaran' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
