<?php

namespace App\Models;

use App\Models\Traits\HasBukuKasUmumBehavior;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BukuKasUmum extends Model
{
    use HasFactory, HasBukuKasUmumBehavior;

    protected $guarded = ['id'];

    protected function penganggaranModelClass(): string { return Penganggaran::class; }
    protected function penganggaranForeignKey(): string { return 'penganggaran_id'; }
    
    protected function uraianDetailModelClass(): string { return BukuKasUmumUraianDetail::class; }
    protected function bkuForeignKey(): string { return 'buku_kas_umum_id'; }
    
    protected function kwitansiModelClass(): string { return Kwitansi::class; }
    protected function tandaTerimaModelClass(): string { return TandaTerima::class; }
    protected function dokumenModelClass(): string { return Dokumen::class; }
    protected function bastModelClass(): string { return Bast::class; }
    protected function suratPesananModelClass(): string { return SuratPesanan::class; }
}
