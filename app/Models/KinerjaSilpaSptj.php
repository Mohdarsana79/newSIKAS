<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KinerjaSilpaSptj extends Model
{
    protected $guarded = ['id'];

    public function silpaPenganggaran()
    {
        return $this->belongsTo(KinerjaSilpaPenganggaran::class, 'kinerja_silpa_penganggaran_id');
    }


    public function silpaPenerimaanDana()
    {
        return $this->belongsTo(KinerjaSilpaPenerimaanDana::class, 'kinerja_silpa_penerimaan_dana_id');
    }


    public function silpaBukuKasUmum()
    {
        return $this->belongsTo(KinerjaSilpaBukuKasUmum::class, 'kinerja_silpa_buku_kas_umum_id');
    }


    public function penganggaran() { return $this->silpaPenganggaran(); }

    public function penerimaanDana() { return $this->silpaPenerimaanDana(); }

    public function bukuKasUmum() { return $this->silpaBukuKasUmum(); }
}



