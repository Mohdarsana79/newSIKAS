<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KinerjaBast extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    public function sekolah()
    {
        return $this->belongsTo(SekolahProfile::class, 'sekolah_id');
    }

    public function penganggaran()
    {
        return $this->belongsTo(KinerjaPenganggaran::class, 'kinerja_penganggaran_id');
    }

    public function bukuKasUmum()
    {
        return $this->belongsTo(KinerjaBukuKasUmum::class, 'kinerja_buku_kas_umum_id');
    }
}
