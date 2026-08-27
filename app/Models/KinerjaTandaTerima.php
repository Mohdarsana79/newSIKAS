<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KinerjaTandaTerima extends Model
{
    use HasFactory;

    protected $fillable = [
        'sekolah_id',
        'kinerja_penganggaran_id',
        'kode_kegiatan_id',
        'kode_rekening_id',
        'kinerja_penerimaan_dana_id',
        'kinerja_buku_kas_umum_id',
    ];

    public function sekolah()
    {
        return $this->belongsTo(SekolahProfile::class, 'sekolah_id');
    }

    public function kinerjaPenganggaran()
    {
        return $this->belongsTo(KinerjaPenganggaran::class, 'kinerja_penganggaran_id');
    }

    public function kodeKegiatan()
    {
        return $this->belongsTo(KodeKegiatan::class);
    }

    public function rekeningBelanja()
    {
        return $this->belongsTo(RekeningBelanja::class, 'kode_rekening_id');
    }

    public function kinerjaPenerimaanDana()
    {
        return $this->belongsTo(KinerjaPenerimaanDana::class, 'kinerja_penerimaan_dana_id');
    }

    public function kinerjaBukuKasUmum()
    {
        return $this->belongsTo(KinerjaBukuKasUmum::class, 'kinerja_buku_kas_umum_id');
    }

    // Standardized Aliases for Variant Support
    public function penganggaran() { return $this->kinerjaPenganggaran(); }
    public function penerimaanDana() { return $this->kinerjaPenerimaanDana(); }
    public function bukuKasUmum() { return $this->kinerjaBukuKasUmum(); }
}
