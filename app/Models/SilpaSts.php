<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SilpaSts extends Model
{
    use HasFactory;

    protected $table = 'silpa_status_sts_giros';

    protected $fillable = [
        'silpa_penganggaran_id',
        'nomor_sts',
        'jumlah_sts',
        'tanggal_bayar',
        'jumlah_bayar',
        'is_bkp',
    ];

    protected $casts = [
        'tanggal_bayar' => 'date',
        'is_bkp' => 'boolean',
        'jumlah_sts' => 'decimal:2',
        'jumlah_bayar' => 'decimal:2',
    ];

    public function silpaPenganggaran()
    {
        return $this->belongsTo(SilpaPenganggaran::class, 'silpa_penganggaran_id');
    }


    public function penganggaran() { return $this->silpaPenganggaran(); }
}

