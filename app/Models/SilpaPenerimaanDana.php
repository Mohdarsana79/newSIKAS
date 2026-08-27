<?php

namespace App\Models;

use App\Models\Traits\HasPenerimaanDanaBehavior;
use Illuminate\Database\Eloquent\Model;

class SilpaPenerimaanDana extends Model
{
    use HasPenerimaanDanaBehavior;
    protected $table = 'silpa_penerimaan_danas';
    protected function penganggaranModelClass(): string { return SilpaPenganggaran::class; }
    protected function penganggaranForeignKey(): string { return 'silpa_penganggaran_id'; }
}
