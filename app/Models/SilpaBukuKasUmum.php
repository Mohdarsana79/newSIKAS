<?php

namespace App\Models;

use App\Models\Traits\HasBukuKasUmumBehavior;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SilpaBukuKasUmum extends Model
{
    use HasFactory, HasBukuKasUmumBehavior;

    protected $guarded = ['id'];

    protected function penganggaranModelClass(): string { return SilpaPenganggaran::class; }

    protected function penganggaranForeignKey(): string { return 'silpa_penganggaran_id'; }

    
    protected function uraianDetailModelClass(): string { return SilpaBukuKasUmumUraianDetail::class; }

    protected function bkuForeignKey(): string { return 'silpa_buku_kas_umum_id'; }

    
    protected function kwitansiModelClass(): string { return SilpaKwitansi::class; }

    protected function tandaTerimaModelClass(): string { return SilpaTandaTerima::class; }

    protected function dokumenModelClass(): string { return SilpaDokumen::class; }

    protected function bastModelClass(): string { return SilpaBast::class; }

    protected function suratPesananModelClass(): string { return SilpaSuratPesanan::class; }


    // ─── Backward Compatibility Aliases ───────────────────────────
    public function silpaPenganggaran() { return $this->penganggaran(); }

    public function silpaKwitansi() { return $this->kwitansi(); }

    public function silpaTandaTerima() { return $this->tandaTerima(); }
}
