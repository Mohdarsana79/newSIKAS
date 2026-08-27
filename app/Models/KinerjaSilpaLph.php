<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KinerjaSilpaLph extends Model
{
    use HasFactory;

    protected $fillable = [
        'sekolah_id',
        'kinerja_silpa_penganggaran_id',
        'semester',
        'tanggal_lph',
        'nomor_lph',
        'penerimaan_anggaran',
        'penerimaan_realisasi',
        'penerimaan_selisih',
        'belanja_operasi_anggaran',
        'belanja_operasi_realisasi',
        'belanja_operasi_selisih',
        'belanja_modal_peralatan_anggaran',
        'belanja_modal_peralatan_realisasi',
        'belanja_modal_peralatan_selisih',
        'belanja_modal_aset_anggaran',
        'belanja_modal_aset_realisasi',
        'belanja_modal_aset_selisih',
    ];

    public function sekolah()
    {
        return $this->belongsTo(SekolahProfile::class, 'sekolah_id');
    }


    public function silpaPenganggaran()
    {
        return $this->belongsTo(KinerjaSilpaPenganggaran::class, 'kinerja_silpa_penganggaran_id');
    }


    public function penganggaran() { return $this->silpaPenganggaran(); }
}



