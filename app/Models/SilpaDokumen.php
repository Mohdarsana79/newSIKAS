<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SilpaDokumen extends Model
{
    protected $guarded = ['id'];

    public function silpaPenganggaran()
    {
        return $this->belongsTo(SilpaPenganggaran::class);
    }


    public function silpaBukuKasUmum()
    {
        return $this->belongsTo(SilpaBukuKasUmum::class);
    }


    public function penganggaran() { return $this->silpaPenganggaran(); }

    public function bukuKasUmum() { return $this->silpaBukuKasUmum(); }
}

