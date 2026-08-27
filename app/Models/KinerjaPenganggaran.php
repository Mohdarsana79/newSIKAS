<?php

namespace App\Models;

use App\Models\Traits\HasPenganggaranBehavior;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KinerjaPenganggaran extends Model
{
    use HasFactory, HasPenganggaranBehavior;

    protected $table = 'kinerja_penganggarans';

    protected function rkasModelClass(): string { return KinerjaRkas::class; }
    protected function rkasForeignKey(): string { return 'kinerja_penganggaran_id'; }
    protected function penerimaanDanaModelClass(): string { return KinerjaPenerimaanDana::class; }
    protected function penerimaanDanaForeignKey(): string { return 'kinerja_penganggaran_id'; }
    protected function bukuKasUmumModelClass(): string { return KinerjaBukuKasUmum::class; }
    protected function bukuKasUmumForeignKey(): string { return 'kinerja_penganggaran_id'; }
}
