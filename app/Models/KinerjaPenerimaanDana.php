<?php

namespace App\Models;

use App\Models\Traits\HasPenerimaanDanaBehavior;
use Illuminate\Database\Eloquent\Model;

class KinerjaPenerimaanDana extends Model
{
    use HasPenerimaanDanaBehavior;
    protected $table = 'kinerja_penerimaan_danas';
    protected function penganggaranModelClass(): string { return KinerjaPenganggaran::class; }
    protected function penganggaranForeignKey(): string { return 'kinerja_penganggaran_id'; }
}
