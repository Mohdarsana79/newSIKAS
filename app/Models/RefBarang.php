<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RefBarang extends Model
{
    use HasFactory;

    /**
     * Rekening Belanja Modal Buku (5.2.05.01.01.0001 s.d. 0009) yang di ARKAS
     * juga memuat katalog buku Kemendikbud (kode_rekening = NULL, kode_belanja = 'RBM', blok_id = '5.2.3').
     *
     * @var array<int, string>
     */
    public const BUKU_REKENING_CODES = [
        '5.2.05.01.01.0001',
        '5.2.05.01.01.0002',
        '5.2.05.01.01.0003',
        '5.2.05.01.01.0004',
        '5.2.05.01.01.0005',
        '5.2.05.01.01.0006',
        '5.2.05.01.01.0007',
        '5.2.05.01.01.0008',
        '5.2.05.01.01.0009',
        '5.2.05.01.01.0010',
    ];

    protected $table = 'ref_barangs';

    protected $fillable = [
        'id_barang',
        'nama_barang',
        'kode_rekening',
        'rekening',
        'satuan',
        'blok_id',
        'kode_belanja',
        'is_expired',
        'batas_atas',
        'tahun',
    ];

    protected $casts = [
        'batas_atas' => 'float',
        'tahun' => 'integer',
        'is_expired' => 'boolean',
    ];

    public static function isBukuRekening(?string $kodeRekening): bool
    {
        return in_array(trim((string) $kodeRekening), self::BUKU_REKENING_CODES, true);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_expired', false);
    }

    /**
     * Katalog barang aktif untuk 1 rekening belanja pada tahun tertentu (terisolasi ketat per tahun, tanpa fallback lintas tahun).
     * Untuk rekening Belanja Modal Buku (5.2.05.01.01.0001-0010), otomatis menggabungkan
     * katalog buku RBM Kemendikbud pada tahun yang sama (kode_rekening IS NULL, kode_belanja = 'RBM', blok_id LIKE '5.2.3%').
     */
    public function scopeForRekeningCatalog(Builder $query, int $tahun, string $kodeRekening, bool $onlyActive = true): Builder
    {
        $kode = trim($kodeRekening);
        $query->where('tahun', $tahun);

        if ($onlyActive) {
            $query->where('is_expired', false);
        }

        if (self::isBukuRekening($kode)) {
            $query->where(function (Builder $q) use ($kode) {
                $q->where('kode_rekening', $kode)
                    ->orWhere(function (Builder $rbm) {
                        $rbm->where(function (Builder $nullRek) {
                            $nullRek->whereNull('kode_rekening')
                                ->orWhere('kode_rekening', '');
                        })
                            ->where('kode_belanja', 'RBM')
                            ->where('blok_id', 'like', '5.2.3%');
                    });
            });
        } else {
            $query->where('kode_rekening', $kode);
        }

        return $query;
    }
}
