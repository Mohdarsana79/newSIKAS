<?php

namespace App\Models;

use App\Models\Traits\HasPenganggaranBehavior;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KinerjaSilpaPenganggaran extends Model
{
    use HasFactory, HasPenganggaranBehavior;

    protected $table = 'kinerja_silpa_penganggarans';

    protected function rkasModelClass(): string { return KinerjaSilpaRkas::class; }
    protected function rkasForeignKey(): string { return 'kinerja_silpa_penganggaran_id'; }
    protected function penerimaanDanaModelClass(): string { return KinerjaSilpaPenerimaanDana::class; }
    protected function penerimaanDanaForeignKey(): string { return 'kinerja_silpa_penganggaran_id'; }
    protected function bukuKasUmumModelClass(): string { return KinerjaSilpaBukuKasUmum::class; }
    protected function bukuKasUmumForeignKey(): string { return 'kinerja_silpa_penganggaran_id'; }
}
