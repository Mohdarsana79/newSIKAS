<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KinerjaSilpaTandaTerima extends Model
{
    use HasFactory;

    protected $fillable = [
        'sekolah_id',
        'kinerja_silpa_penganggaran_id',
        'kode_kegiatan_id',
        'kode_rekening_id',
        'kinerja_silpa_penerimaan_dana_id',
        'kinerja_silpa_buku_kas_umum_id',
    ];

    public function sekolah()
    {
        return $this->belongsTo(SekolahProfile::class, 'sekolah_id');
    }

    public function silpaPenganggaran()
    {
        return $this->belongsTo(KinerjaSilpaPenganggaran::class, 'kinerja_silpa_penganggaran_id');
    }

    public function kodeKegiatan()
    {
        return $this->belongsTo(KodeKegiatan::class);
    }

    public function rekeningBelanja()
    {
        return $this->belongsTo(RekeningBelanja::class, 'kode_rekening_id');
    }

    public function silpaPenerimaanDana()
    {
        return $this->belongsTo(KinerjaSilpaPenerimaanDana::class, 'kinerja_silpa_penerimaan_dana_id');
    }

    public function silpaBukuKasUmum()
    {
        return $this->belongsTo(KinerjaSilpaBukuKasUmum::class, 'kinerja_silpa_buku_kas_umum_id');
    }

    // Standardized Aliases for Variant Support
    public function penganggaran() { return $this->silpaPenganggaran(); }
    public function penerimaanDana() { return $this->silpaPenerimaanDana(); }
    public function bukuKasUmum() { return $this->silpaBukuKasUmum(); }
}

