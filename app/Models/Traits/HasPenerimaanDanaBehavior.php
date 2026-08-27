<?php

namespace App\Models\Traits;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Shared behavior for all PenerimaanDana model variants.
 */
trait HasPenerimaanDanaBehavior
{
    abstract protected function penganggaranModelClass(): string;
    abstract protected function penganggaranForeignKey(): string;

    public function initializeHasPenerimaanDanaBehavior(): void
    {
        $this->fillable = array_unique(array_merge($this->fillable ?? [], [
            $this->penganggaranForeignKey(),
            'sumber_dana',
            'tanggal_terima',
            'jumlah_dana',
            'saldo_awal',
            'tanggal_saldo_awal'
        ]));

        $this->casts = array_merge($this->casts ?? [], [
            'tanggal_terima' => 'date',
            'jumlah_dana' => 'decimal:2',
            'saldo_awal' => 'decimal:2',
            'tanggal_saldo_awal' => 'date'
        ]);
    }

    public function penganggaran(): BelongsTo
    {
        return $this->belongsTo($this->penganggaranModelClass(), $this->penganggaranForeignKey());
    }
}
