<?php

namespace App\Models\Traits;

use App\Models\KodeKegiatan;
use App\Models\RekeningBelanja;

/**
 * Shared behavior for all BukuKasUmum model variants.
 * 
 * Used by: BukuKasUmum, KinerjaBukuKasUmum, SilpaBukuKasUmum, KinerjaSilpaBukuKasUmum
 */
trait HasBukuKasUmumBehavior
{
    // ─── Abstract methods: each model MUST override ────────────────

    abstract protected function penganggaranModelClass(): string;
    abstract protected function penganggaranForeignKey(): string;
    
    abstract protected function uraianDetailModelClass(): string;
    abstract protected function bkuForeignKey(): string; // foreign key on uraian, kwitansi, etc pointing to this BKU
    
    abstract protected function kwitansiModelClass(): string;
    abstract protected function tandaTerimaModelClass(): string;
    abstract protected function dokumenModelClass(): string;
    abstract protected function bastModelClass(): string;
    abstract protected function suratPesananModelClass(): string;

    // ─── Fillable & Casts ──────────────────────────────────────────

    public function initializeHasBukuKasUmumBehavior(): void
    {
        // Many variants just use $guarded = ['id'] which is fine, 
        // we'll just merge casts.
        $this->casts = array_merge($this->casts ?? [], [
            'tanggal_transaksi' => 'date',
            'is_bunga_record' => 'boolean',
            'anggaran' => 'decimal:2',
            'total_transaksi_kotor' => 'decimal:2',
            'total_pajak' => 'decimal:2',
            'total_pajak_daerah' => 'decimal:2',
            'bunga_bank' => 'decimal:2',
            'pajak_bunga_bank' => 'decimal:2',
        ]);
    }

    // ─── Shared Relationships ──────────────────────────────────────

    public function kodeKegiatan()
    {
        return $this->belongsTo(KodeKegiatan::class);
    }

    public function rekeningBelanja()
    {
        return $this->belongsTo(RekeningBelanja::class);
    }
    
    // ─── Variant-Aware Relationships ───────────────────────────────
    
    public function uraianDetails()
    {
        return $this->hasMany($this->uraianDetailModelClass(), $this->bkuForeignKey());
    }

    // Standardized name across variants
    public function penganggaran()
    {
        return $this->belongsTo($this->penganggaranModelClass(), $this->penganggaranForeignKey());
    }

    // Standardized name across variants
    public function kwitansi()
    {
        return $this->hasOne($this->kwitansiModelClass(), $this->bkuForeignKey());
    }

    // Standardized name across variants
    public function tandaTerima()
    {
        return $this->hasOne($this->tandaTerimaModelClass(), $this->bkuForeignKey());
    }

    // Standardized name across variants
    public function dokumen()
    {
        return $this->hasOne($this->dokumenModelClass(), $this->bkuForeignKey());
    }

    // Standardized name across variants
    public function bast()
    {
        return $this->hasOne($this->bastModelClass(), $this->bkuForeignKey());
    }

    // Standardized name across variants
    public function suratPesanan()
    {
        return $this->hasOne($this->suratPesananModelClass(), $this->bkuForeignKey());
    }
}
