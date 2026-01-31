<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PenarikanTunai extends Model
{
    use HasFactory;

    protected $guarded = ['id'];
    
    protected $casts = [
        'tanggal_penarikan' => 'date',
        'jumlah_penarikan' => 'decimal:2',
    ];

    public function penganggaran()
    {
        return $this->belongsTo(Penganggaran::class);
    }
}
