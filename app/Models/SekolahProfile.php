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
        'kop_border',
        'kop_dokumen',
        'kop_teks_html',
        'kop_jenis',
        'website_sync_url',
        'website_sync_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'kop_dokumen' => 'array',
    ];

    /**
     * Check if a specific document is configured to use Kop Surat.
     */
    public function hasKopForDoc(string $docKey): bool
    {
        if (empty($this->kop_surat) && empty($this->kop_teks_html)) {
            return false;
        }

        $docs = $this->kop_dokumen;

        return is_array($docs) && ! empty($docs[$docKey]);
    }
}
