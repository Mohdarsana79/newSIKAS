<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BukuKasUmumUraianDetail extends Model
{
    use HasFactory;

    protected $guarded = ['id'];
    
    public function bukuKasUmum()
    {
        return $this->belongsTo(BukuKasUmum::class);
    }

    public function kodeKegiatan()
    {
        return $this->belongsTo(KodeKegiatan::class);
    }

    public function rekeningBelanja()
    {
        return $this->belongsTo(RekeningBelanja::class);
    }
}
