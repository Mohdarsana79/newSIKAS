<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SpjTemplate extends Model
{
    use HasFactory;

    public const TYPE_TANDA_TERIMA = 'tanda_terima';

    public const TYPE_BAST = 'bast';

    public const TYPE_SURAT_PESANAN = 'surat_pesanan';

    public const TYPE_SPMTH = 'spmth';

    public const TYPE_SPTJ = 'sptj';

    public const TYPE_SP2B = 'sp2b';

    public const TYPE_LPH = 'lph';

    /** @var array<int, string> */
    public const LAPORAN_TYPES = [
        self::TYPE_SPMTH,
        self::TYPE_SPTJ,
        self::TYPE_SP2B,
        self::TYPE_LPH,
    ];

    /** @var array<int, string> */
    public const CUSTOM_FORM_TYPES = [
        self::TYPE_BAST,
        self::TYPE_SURAT_PESANAN,
        self::TYPE_SPMTH,
        self::TYPE_SPTJ,
        self::TYPE_SP2B,
        self::TYPE_LPH,
    ];

    /** @var array<int, string> */
    public const TYPES = [
        self::TYPE_TANDA_TERIMA,
        self::TYPE_BAST,
        self::TYPE_SURAT_PESANAN,
        self::TYPE_SPMTH,
        self::TYPE_SPTJ,
        self::TYPE_SP2B,
        self::TYPE_LPH,
    ];

    protected $table = 'spj_templates';

    protected $fillable = [
        'document_type',
        'nama',
        'deskripsi',
        'file_path',
        'original_filename',
        'file_size',
        'detected_variables',
        'has_item_table',
        'created_by',
    ];

    protected $casts = [
        'file_size' => 'integer',
        'detected_variables' => 'array',
        'has_item_table' => 'boolean',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopeForType(Builder $query, string $type): Builder
    {
        return $query->where('document_type', $type);
    }

    public static function labelForType(string $type): string
    {
        return match ($type) {
            self::TYPE_TANDA_TERIMA => 'Tanda Terima',
            self::TYPE_BAST => 'BAST',
            self::TYPE_SURAT_PESANAN => 'Surat Pesanan',
            self::TYPE_SPMTH => 'SPMTH',
            self::TYPE_SPTJ => 'SPTJ',
            self::TYPE_SP2B => 'SP2B',
            self::TYPE_LPH => 'LPH',
            default => strtoupper($type),
        };
    }

    public static function storageDirectoryForType(string $type): string
    {
        return 'spj_templates/'.$type;
    }
}
