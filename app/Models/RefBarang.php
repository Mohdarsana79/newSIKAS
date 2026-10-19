<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RefBarang extends Model
{
    use HasFactory;

    protected $table = 'ref_barangs';

    protected $fillable = [
        'id_barang',
        'nama_barang',
        'kode_rekening',
        'rekening',
        'satuan',
        'batas_atas',
        'tahun',
    ];

    protected $casts = [
        'batas_atas' => 'float',
        'tahun' => 'integer',
    ];
}
