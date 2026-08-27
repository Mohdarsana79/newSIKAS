<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KinerjaBukuKasUmumUraianDetail extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    public function kinerjaBukuKasUmum()
    {
        return $this->belongsTo(KinerjaBukuKasUmum::class, 'kinerja_buku_kas_umum_id');
    }


    public function kodeKegiatan()
    {
        return $this->belongsTo(KodeKegiatan::class);
    }


    public function rekeningBelanja()
    {
        return $this->belongsTo(RekeningBelanja::class);
    }


    public function kinerjaRkas()
    {
        return $this->belongsTo(KinerjaRkas::class, 'kinerja_rkas_id');
    }


    public function bukuKasUmum() { return $this->kinerjaBukuKasUmum(); }
}

