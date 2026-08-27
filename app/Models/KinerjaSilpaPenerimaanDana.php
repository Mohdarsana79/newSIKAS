<?php

namespace App\Models;

use App\Models\Traits\HasPenerimaanDanaBehavior;
use Illuminate\Database\Eloquent\Model;

class KinerjaSilpaPenerimaanDana extends Model
{
    use HasPenerimaanDanaBehavior;
    protected $table = 'kinerja_silpa_penerimaan_danas';
    protected function penganggaranModelClass(): string { return KinerjaSilpaPenganggaran::class; }
    protected function penganggaranForeignKey(): string { return 'kinerja_silpa_penganggaran_id'; }
}
