<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PenerimaanDana extends Model
{
    protected $fillable = [
        'penganggaran_id',
        'sumber_dana',
        'tanggal_terima',
        'jumlah_dana',
        'saldo_awal',
        'tanggal_saldo_awal'
    ];

    protected $casts = [
        'tanggal_terima' => 'date',
        'jumlah_dana' => 'decimal:2',
        'saldo_awal' => 'decimal:2',
        'tanggal_saldo_awal' => 'date'
    ];

    /**
     * Get the penganggaran that owns the PenerimaanDana
     */
    public function penganggaran(): BelongsTo
    {
        return $this->belongsTo(Penganggaran::class, 'penganggaran_id');
    }

    // public function tandaTerima()
    // {
    //     return $this->hasMany(TandaTerima::class);
    // }
}
