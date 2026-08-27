<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SilpaPenarikanTunai extends Model
{
    use HasFactory;

    protected $guarded = ['id'];
    
    protected $casts = [
        'tanggal_penarikan' => 'date',
        'jumlah_penarikan' => 'decimal:2',
    ];

    public function silpaPenganggaran()
    {
        return $this->belongsTo(SilpaPenganggaran::class, 'silpa_penganggaran_id');
    }


    public function penganggaran() { return $this->silpaPenganggaran(); }
}

