<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RefPtk extends Model
{
    use HasFactory;

    public const JENIS_GURU = 10;

    public const JENIS_TENDIK = 11;

    public const JENIS_ASN = 90;

    public const SUMBER_ARKAS = 'arkas';

    public const SUMBER_MANUAL = 'manual';

    protected $table = 'ref_ptks';

    protected $fillable = [
        'tahun',
        'ptk_id',
        'nuptk',
        'nama',
        'jenis_kelamin',
        'jenis_ptk_arkas',
        'masa_kerja_tahun',
        'masa_kerja_bulan',
        'pernah_sertifikasi',
        'is_active',
        'sumber',
    ];

    protected function casts(): array
    {
        return [
            'tahun' => 'integer',
            'jenis_ptk_arkas' => 'integer',
            'masa_kerja_tahun' => 'integer',
            'masa_kerja_bulan' => 'integer',
            'pernah_sertifikasi' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function scopeForYear(Builder $query, int|string $year): Builder
    {
        return $query->where('tahun', (int) $year);
    }

    public function scopeHonorEligible(Builder $query): Builder
    {
        return $query->where('is_active', true)
            ->whereIn('jenis_ptk_arkas', [self::JENIS_GURU, self::JENIS_TENDIK]);
    }

    /**
     * Format standar Uraian Arkas: "NAMA (NUPTK)" bila NUPTK terisi, atau "NAMA" saja.
     */
    public function getFormattedUraianArkasAttribute(): string
    {
        $nama = trim((string) $this->nama);
        $nuptk = trim((string) ($this->nuptk ?? ''));

        if ($nuptk !== '') {
            return "{$nama} ({$nuptk})";
        }

        return $nama;
    }

    public function getJenisLabelAttribute(): string
    {
        return match ((int) $this->jenis_ptk_arkas) {
            self::JENIS_GURU => 'Guru / Pendidik',
            self::JENIS_TENDIK => 'Tenaga Kependidikan',
            self::JENIS_ASN => 'ASN / PNS / Kepsek',
            default => 'PTK Lainnya',
        };
    }
}
