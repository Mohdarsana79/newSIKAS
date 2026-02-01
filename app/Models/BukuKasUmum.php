<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BukuKasUmum extends Model
{
    use HasFactory;

    protected $guarded = ['id'];
    
    protected $casts = [
        'tanggal_transaksi' => 'date',
        'is_bunga_record' => 'boolean',
        'anggaran' => 'decimal:2',
        'total_transaksi_kotor' => 'decimal:2',
        'total_pajak' => 'decimal:2',
        'total_pajak_daerah' => 'decimal:2',
        'bunga_bank' => 'decimal:2',
        'pajak_bunga_bank' => 'decimal:2',
    ];

    public function kodeKegiatan()
    {
        return $this->belongsTo(KodeKegiatan::class);
    }

    public function rekeningBelanja()
    {
        return $this->belongsTo(RekeningBelanja::class);
    }
    
    public function uraianDetails()
    {
        return $this->hasMany(BukuKasUmumUraianDetail::class);
    }

    public function penganggaran()
    {
        return $this->belongsTo(Penganggaran::class);
    }

    public function kwitansi()
    {
        return $this->hasOne(Kwitansi::class);
    }

    public function tandaTerima()
    {
        return $this->hasOne(TandaTerima::class);
    }

    public function dokumen()
    {
        return $this->hasOne(Dokumen::class);
    }

}
