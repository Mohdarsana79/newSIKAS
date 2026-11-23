<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Sptj extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'custom_variables' => 'array',
    ];

    public function penganggaran()
    {
        return $this->belongsTo(Penganggaran::class);
    }

    public function penerimaanDana()
    {
        return $this->belongsTo(PenerimaanDana::class);
    }

    public function bukuKasUmum()
    {
        return $this->belongsTo(BukuKasUmum::class);
    }
}
