<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SilpaKwitansi extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    public function sekolah()
    {
        return $this->belongsTo(SekolahProfile::class);
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

    public function silpaUraianDetail()
    {
        return $this->belongsTo(SilpaBukuKasUmumUraianDetail::class, 'silpa_bku_uraian_detail_id');
    }

    // Standardized Aliases for Variant Support
    public function penganggaran() { return $this->silpaPenganggaran(); }
    public function penerimaanDana() { return $this->silpaPenerimaanDana(); }
    public function bukuKasUmum() { return $this->silpaBukuKasUmum(); }
    public function bkuUraianDetail() { return $this->silpaUraianDetail(); }


    public function uraianDetail() { return $this->silpaUraianDetail(); }
}
