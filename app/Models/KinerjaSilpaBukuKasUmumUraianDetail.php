<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KinerjaSilpaBukuKasUmumUraianDetail extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    public function silpaBukuKasUmum()
    {
        return $this->belongsTo(KinerjaSilpaBukuKasUmum::class, 'kinerja_silpa_buku_kas_umum_id');
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
        return $this->belongsTo(KinerjaSilpaRkas::class, 'kinerja_silpa_rkas_id');
    }


    public function bukuKasUmum() { return $this->silpaBukuKasUmum(); }
}


