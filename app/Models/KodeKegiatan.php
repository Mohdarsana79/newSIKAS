<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KodeKegiatan extends Model
{
    use HasFactory;

    protected $table = 'kode_kegiatans';

    protected $fillable = [
        'kode',
        'program',
        'sub_program',
        'uraian',
    ];
}
