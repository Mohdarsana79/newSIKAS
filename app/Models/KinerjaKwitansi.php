<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KinerjaKwitansi extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    public function sekolah()
    {
        return $this->belongsTo(SekolahProfile::class);
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

    public function kinerjaUraianDetail()
    {
        return $this->belongsTo(KinerjaBukuKasUmumUraianDetail::class, 'kinerja_bku_uraian_detail_id');
    }

    // Standardized Aliases for Variant Support
    public function penganggaran() { return $this->kinerjaPenganggaran(); }
    public function penerimaanDana() { return $this->kinerjaPenerimaanDana(); }
    public function bukuKasUmum() { return $this->kinerjaBukuKasUmum(); }
    public function bkuUraianDetail() { return $this->kinerjaUraianDetail(); }


    public function uraianDetail() { return $this->kinerjaUraianDetail(); }
}
