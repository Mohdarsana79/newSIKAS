<?php

namespace App\Models;

use App\Models\Traits\HasPenganggaranBehavior;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Penganggaran extends Model
{
    use HasFactory, HasPenganggaranBehavior;

    protected $table = 'penganggarans';

    protected function rkasModelClass(): string { return Rkas::class; }
    protected function rkasForeignKey(): string { return 'penganggaran_id'; }
    protected function penerimaanDanaModelClass(): string { return PenerimaanDana::class; }
    protected function penerimaanDanaForeignKey(): string { return 'penganggaran_id'; }
    protected function bukuKasUmumModelClass(): string { return BukuKasUmum::class; }
    protected function bukuKasUmumForeignKey(): string { return 'penganggaran_id'; }
}
