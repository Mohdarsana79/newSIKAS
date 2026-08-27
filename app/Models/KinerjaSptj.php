<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KinerjaSptj extends Model
{
    protected $guarded = ['id'];

    public function kinerjaPenganggaran()
    {
        return $this->belongsTo(KinerjaPenganggaran::class);
    }


    public function kinerjaPenerimaanDana()
    {
        return $this->belongsTo(KinerjaPenerimaanDana::class);
    }


    public function kinerjaBukuKasUmum()
    {
        return $this->belongsTo(KinerjaBukuKasUmum::class);
    }


    public function penganggaran() { return $this->kinerjaPenganggaran(); }

    public function penerimaanDana() { return $this->kinerjaPenerimaanDana(); }

    public function bukuKasUmum() { return $this->kinerjaBukuKasUmum(); }
}

