<?php

namespace App\Models;

use App\Models\Traits\HasRkasBehavior;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Rkas extends Model
{
    use HasFactory, HasRkasBehavior;

    protected $table = 'rkas';

    protected function penganggaranModelClass(): string { return Penganggaran::class; }
    public function penganggaranForeignKey(): string { return 'penganggaran_id'; }
    protected function bkuUraianDetailModelClass(): string { return BukuKasUmumUraianDetail::class; }
    public function rkasForeignKey(): string { return 'rkas_id'; }
}
