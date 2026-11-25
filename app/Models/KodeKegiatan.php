<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KodeKegiatan extends Model
{
    use HasFactory;

    public const SUMBER_REGULER = 'reguler';

    public const SUMBER_KINERJA = 'kinerja';

    public const SUMBER_SEMUA = 'semua';

    public const VALID_SUMBER_DANA = [
        self::SUMBER_REGULER,
        self::SUMBER_KINERJA,
        self::SUMBER_SEMUA,
    ];

    protected $table = 'kode_kegiatans';

    protected $fillable = [
        'tahun',
        'sumber_dana',
        'kode',
        'program',
        'sub_program',
        'uraian',
    ];

    protected $casts = [
        'tahun' => 'integer',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $model) {
            if (empty($model->tahun)) {
                $model->tahun = (int) date('Y');
            }
            if (empty($model->sumber_dana)) {
                $model->sumber_dana = self::SUMBER_REGULER;
            }
        });
    }

    public function scopeForYear(Builder $query, int $tahun): Builder
    {
        return $query->where('tahun', $tahun);
    }

    /**
     * Filter Kode Kegiatan sesuai varian BOSP aktif (sesuai sumber_dana_id pada ARKAS):
     * - reguler / silpa        => sumber_dana IN ('reguler', 'semua')
     * - kinerja / kinerja_silpa => sumber_dana IN ('kinerja', 'semua')
     *
     * @param  array<int, int>  $preserveIds  ID lama yang sudah terpakai transaksi pada penganggaran ini agar tetap terbaca
     */
    public function scopeForVariant(Builder $query, string $variant, array $preserveIds = []): Builder
    {
        $isKinerja = in_array($variant, ['kinerja', 'kinerja_silpa'], true);
        $allowed = $isKinerja
            ? [self::SUMBER_KINERJA, self::SUMBER_SEMUA]
            : [self::SUMBER_REGULER, self::SUMBER_SEMUA];

        return $query->where(function (Builder $q) use ($allowed, $preserveIds) {
            $q->whereIn('sumber_dana', $allowed);
            if (! empty($preserveIds)) {
                $q->orWhereIn('id', $preserveIds);
            }
        });
    }
}
