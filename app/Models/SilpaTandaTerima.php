<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SilpaTandaTerima extends Model
{
    use HasFactory;

    protected $fillable = [
        'sekolah_id',
        'silpa_penganggaran_id',
        'kode_kegiatan_id',
        'kode_rekening_id',
        'silpa_penerimaan_dana_id',
        'silpa_buku_kas_umum_id',
    ];

    public function sekolah()
    {
        return $this->belongsTo(SekolahProfile::class, 'sekolah_id');
    }

    public function silpaPenganggaran()
    {
        return $this->belongsTo(SilpaPenganggaran::class, 'silpa_penganggaran_id');
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
        return $this->belongsTo(SilpaPenerimaanDana::class, 'silpa_penerimaan_dana_id');
    }

    public function silpaBukuKasUmum()
    {
        return $this->belongsTo(SilpaBukuKasUmum::class, 'silpa_buku_kas_umum_id');
    }

    // Standardized Aliases for Variant Support
    public function penganggaran() { return $this->silpaPenganggaran(); }
    public function penerimaanDana() { return $this->silpaPenerimaanDana(); }
    public function bukuKasUmum() { return $this->silpaBukuKasUmum(); }
}
