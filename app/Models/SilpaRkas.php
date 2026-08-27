<?php

namespace App\Models;

use App\Models\Traits\HasRkasBehavior;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SilpaRkas extends Model
{
    use HasFactory, HasRkasBehavior;

    protected $table = 'silpa_rkas';

    protected function penganggaranModelClass(): string { return SilpaPenganggaran::class; }
    public function penganggaranForeignKey(): string { return 'silpa_penganggaran_id'; }
    protected function bkuUraianDetailModelClass(): string { return SilpaBukuKasUmumUraianDetail::class; }
    public function rkasForeignKey(): string { return 'silpa_rkas_id'; }
}
