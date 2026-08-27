<?php

namespace App\Models;

use App\Models\Traits\HasPenerimaanDanaBehavior;
use Illuminate\Database\Eloquent\Model;

class PenerimaanDana extends Model
{
    use HasPenerimaanDanaBehavior;
    protected $table = 'penerimaan_danas';
    protected function penganggaranModelClass(): string { return Penganggaran::class; }
    protected function penganggaranForeignKey(): string { return 'penganggaran_id'; }
}
