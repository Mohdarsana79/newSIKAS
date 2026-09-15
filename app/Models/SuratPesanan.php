<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SuratPesanan extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    public function sekolah()
    {
        return $this->belongsTo(SekolahProfile::class, 'sekolah_id');
    }

    public function penganggaran()
    {
        return $this->belongsTo(Penganggaran::class);
    }

    public function bukuKasUmum()
    {
        return $this->belongsTo(BukuKasUmum::class);
    }
}
