<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KinerjaSetorTunai extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'tanggal_setor' => 'date',
        'jumlah_setor' => 'decimal:2',
    ];

    public function kinerjaPenganggaran()
    {
        return $this->belongsTo(KinerjaPenganggaran::class, 'kinerja_penganggaran_id');
    }


    public function penganggaran() { return $this->kinerjaPenganggaran(); }
}

