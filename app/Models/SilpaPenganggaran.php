<?php

namespace App\Models;

use App\Models\Traits\HasPenganggaranBehavior;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SilpaPenganggaran extends Model
{
    use HasFactory, HasPenganggaranBehavior;

    protected $table = 'silpa_penganggarans';

    protected function rkasModelClass(): string { return SilpaRkas::class; }
    protected function rkasForeignKey(): string { return 'silpa_penganggaran_id'; }
    protected function penerimaanDanaModelClass(): string { return SilpaPenerimaanDana::class; }
    protected function penerimaanDanaForeignKey(): string { return 'silpa_penganggaran_id'; }
    protected function bukuKasUmumModelClass(): string { return SilpaBukuKasUmum::class; }
    protected function bukuKasUmumForeignKey(): string { return 'silpa_penganggaran_id'; }
}
