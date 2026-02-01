<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Dokumen extends Model
{
    protected $guarded = ['id'];

    public function penganggaran()
    {
        return $this->belongsTo(Penganggaran::class);
    }

    public function bukuKasUmum()
    {
        return $this->belongsTo(BukuKasUmum::class);
    }
}
