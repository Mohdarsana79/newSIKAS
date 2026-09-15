<?php

namespace App\Models;

use App\Models\Traits\HasBukuKasUmumBehavior;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KinerjaSilpaBukuKasUmum extends Model
{
    use HasFactory, HasBukuKasUmumBehavior;

    protected $guarded = ['id'];

    protected function penganggaranModelClass(): string { return KinerjaSilpaPenganggaran::class; }

    protected function penganggaranForeignKey(): string { return 'kinerja_silpa_penganggaran_id'; }

    
    protected function uraianDetailModelClass(): string { return KinerjaSilpaBukuKasUmumUraianDetail::class; }

    protected function bkuForeignKey(): string { return 'kinerja_silpa_buku_kas_umum_id'; }

    
    protected function kwitansiModelClass(): string { return KinerjaSilpaKwitansi::class; }

    protected function tandaTerimaModelClass(): string { return KinerjaSilpaTandaTerima::class; }

    protected function dokumenModelClass(): string { return KinerjaSilpaDokumen::class; }

    protected function bastModelClass(): string { return KinerjaSilpaBast::class; }

    protected function suratPesananModelClass(): string { return KinerjaSilpaSuratPesanan::class; }


    // ─── Backward Compatibility Aliases ───────────────────────────
    public function kinerjaSilpaPenganggaran() { return $this->penganggaran(); }

    public function kinerjaSilpaKwitansi() { return $this->kwitansi(); }

    public function kinerjaSilpaTandaTerima() { return $this->tandaTerima(); }
}
