<?php

namespace App\Models;

use App\Models\Traits\HasRkasBehavior;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KinerjaSilpaRkas extends Model
{
    use HasFactory, HasRkasBehavior;

    protected $table = 'kinerja_silpa_rkas';

    protected function penganggaranModelClass(): string { return KinerjaSilpaPenganggaran::class; }
    public function penganggaranForeignKey(): string { return 'kinerja_silpa_penganggaran_id'; }
    protected function bkuUraianDetailModelClass(): string { return KinerjaSilpaBukuKasUmumUraianDetail::class; }
    public function rkasForeignKey(): string { return 'kinerja_silpa_rkas_id'; }
}
