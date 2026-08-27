<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KinerjaSilpaDokumen extends Model
{
    protected $guarded = ['id'];

    public function silpaPenganggaran()
    {
        return $this->belongsTo(KinerjaSilpaPenganggaran::class, 'kinerja_silpa_penganggaran_id');
    }


    public function silpaBukuKasUmum()
    {
        return $this->belongsTo(KinerjaSilpaBukuKasUmum::class, 'kinerja_silpa_buku_kas_umum_id');
    }


    public function penganggaran() { return $this->silpaPenganggaran(); }

    public function bukuKasUmum() { return $this->silpaBukuKasUmum(); }
}



