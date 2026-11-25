<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SpjExternalAttachment extends Model
{
    public const KATEGORI_SK_TIM = 'sk_tim';

    public const KATEGORI_REKENING_KORAN = 'rekening_koran';

    public const KATEGORI_PAJAK = 'pajak';

    public const KATEGORI_LAINNYA = 'lainnya';

    public const KATEGORI_LIST = [
        self::KATEGORI_SK_TIM,
        self::KATEGORI_REKENING_KORAN,
        self::KATEGORI_PAJAK,
        self::KATEGORI_LAINNYA,
    ];

    public const PERIODE_TAGS = [
        'umum',
        'tahap_1',
        'tahap_2',
        'tahunan',
    ];

    protected $table = 'spj_external_attachments';

    protected $fillable = [
        'variant',
        'tahun_anggaran',
        'periode_tag',
        'judul',
        'kategori',
        'file_path',
        'original_filename',
        'file_size',
        'sort_order',
        'uploaded_by',
    ];

    protected $casts = [
        'tahun_anggaran' => 'integer',
        'file_size' => 'integer',
        'sort_order' => 'integer',
    ];

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
