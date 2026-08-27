<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SilpaBukuKasUmumUraianDetail extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    public function silpaBukuKasUmum()
    {
        return $this->belongsTo(SilpaBukuKasUmum::class, 'silpa_buku_kas_umum_id');
    }


    public function kodeKegiatan()
    {
        return $this->belongsTo(KodeKegiatan::class);
    }


    public function rekeningBelanja()
    {
        return $this->belongsTo(RekeningBelanja::class);
    }


    public function silpaRkas()
    {
        return $this->belongsTo(SilpaRkas::class, 'silpa_rkas_id');
    }


    public function bukuKasUmum() { return $this->silpaBukuKasUmum(); }
}

