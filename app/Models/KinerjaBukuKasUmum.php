<?php

namespace App\Models;

use App\Models\Traits\HasBukuKasUmumBehavior;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KinerjaBukuKasUmum extends Model
{
    use HasFactory, HasBukuKasUmumBehavior;

    protected $guarded = ['id'];

    protected function penganggaranModelClass(): string { return KinerjaPenganggaran::class; }

    protected function penganggaranForeignKey(): string { return 'kinerja_penganggaran_id'; }

    
    protected function uraianDetailModelClass(): string { return KinerjaBukuKasUmumUraianDetail::class; }

    protected function bkuForeignKey(): string { return 'kinerja_buku_kas_umum_id'; }

    
    protected function kwitansiModelClass(): string { return KinerjaKwitansi::class; }

    protected function tandaTerimaModelClass(): string { return KinerjaTandaTerima::class; }

    protected function dokumenModelClass(): string { return KinerjaDokumen::class; }

    protected function bastModelClass(): string { return KinerjaBast::class; }

    protected function suratPesananModelClass(): string { return KinerjaSuratPesanan::class; }


    // ─── Backward Compatibility Aliases ───────────────────────────
    public function kinerjaPenganggaran() { return $this->penganggaran(); }

    public function kinerjaKwitansi() { return $this->kwitansi(); }

    public function kinerjaTandaTerima() { return $this->tandaTerima(); }
}
