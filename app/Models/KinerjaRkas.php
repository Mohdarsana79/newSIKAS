<?php

namespace App\Models;

use App\Models\Traits\HasRkasBehavior;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KinerjaRkas extends Model
{
    use HasFactory, HasRkasBehavior;

    protected $table = 'kinerja_rkas';

    protected function penganggaranModelClass(): string { return KinerjaPenganggaran::class; }
    public function penganggaranForeignKey(): string { return 'kinerja_penganggaran_id'; }
    protected function bkuUraianDetailModelClass(): string { return KinerjaBukuKasUmumUraianDetail::class; }
    public function rkasForeignKey(): string { return 'kinerja_rkas_id'; }
}
