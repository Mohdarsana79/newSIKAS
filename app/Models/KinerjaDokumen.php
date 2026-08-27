<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KinerjaDokumen extends Model
{
    protected $guarded = ['id'];

    public function kinerjaPenganggaran()
    {
        return $this->belongsTo(KinerjaPenganggaran::class);
    }


    public function kinerjaBukuKasUmum()
    {
        return $this->belongsTo(KinerjaBukuKasUmum::class);
    }


    public function penganggaran() { return $this->kinerjaPenganggaran(); }

    public function bukuKasUmum() { return $this->kinerjaBukuKasUmum(); }
}

