<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RefSatuan extends Model
{
    use HasFactory;

    /**
     * Fallback 43 satuan baku ARKAS jika belum sinkron / mode offline.
     *
     * @var array<int, string>
     */
    public const DEFAULT_SATUANS = [
        'Jam pelajaran',
        'batang',
        'botol',
        'buah',
        'bulan',
        'bungkus',
        'cm',
        'dump truck',
        'dus',
        'ekor',
        'eksemplar',
        'galon',
        'gelas',
        'hari',
        'jam',
        'kaleng',
        'kg',
        'kotak',
        'lembar',
        'liter',
        'lusin',
        'm2',
        'm3',
        'materi ajar',
        'meter',
        'orang',
        'pak',
        'paket',
        'pasang',
        'polybag',
        'porsi',
        'rim',
        'rit',
        'rol',
        'sak',
        'saset',
        'set',
        'strip',
        'tablet',
        'tabung',
        'tahap',
        'truk colt',
        'unit',
    ];

    protected $table = 'ref_satuans';

    protected $fillable = [
        'ref_satuan_id',
        'satuan',
        'unit',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    /**
     * Mengambil daftar nama satuan aktif dari DB lokal (fallback 43 satuan baku ARKAS).
     *
     * @return array<int, string>
     */
    public static function activeOptions(): array
    {
        try {
            $rows = self::where('is_active', true)
                ->orderBy('satuan')
                ->pluck('satuan')
                ->filter(static fn ($s) => is_string($s) && trim($s) !== '')
                ->values()
                ->all();

            if (! empty($rows)) {
                return $rows;
            }
        } catch (\Throwable) {
            // Fallback aman bila tabel belum dimigrasi
        }

        return self::DEFAULT_SATUANS;
    }
}
