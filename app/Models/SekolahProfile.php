<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SekolahProfile extends Model
{
    use HasFactory;

    protected $table = 'sekolahs';

    protected $fillable = [
        'nama_sekolah',
        'npsn',
        'status_sekolah',
        'jenjang_sekolah',
        'kelurahan_desa',
        'kecamatan',
        'kabupaten_kota',
        'provinsi',
        'alamat',
        'kop_surat',
        'logo_daerah',
        'logo_sekolah',
        'kop_mode',
        'kop_teks_html',
        'kop_jenis',
        'website_sync_url',
        'website_sync_token',
    ];
}
