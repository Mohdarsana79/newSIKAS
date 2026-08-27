<?php

namespace App\Models\Traits;

use App\Models\SekolahProfile;
use Carbon\Carbon;

/**
 * Shared behavior for all Penganggaran model variants.
 * 
 * Used by: Penganggaran, KinerjaPenganggaran, SilpaPenganggaran, KinerjaSilpaPenganggaran
 * 
 * Each model using this trait MUST define:
 *   - protected $table (Eloquent table name)
 *   - abstract methods for variant-specific relationships:
 *     - rkasForeignKey(), rkasModelClass()
 *     - penerimaanDanaModelClass(), penerimaanDanaForeignKey()
 *     - bukuKasUmumModelClass(), bukuKasUmumForeignKey()
 */
trait HasPenganggaranBehavior
{
    // ─── Abstract methods: each model MUST override ────────────────

    /** @return string The model class for RKAS (e.g. Rkas::class, KinerjaRkas::class) */
    abstract protected function rkasModelClass(): string;

    /** @return string The FK column on the rkas table pointing to this penganggaran */
    abstract protected function rkasForeignKey(): string;

    /** @return string The model class for PenerimaanDana variant */
    abstract protected function penerimaanDanaModelClass(): string;

    /** @return string The FK column on penerimaan_danas pointing to this penganggaran */
    abstract protected function penerimaanDanaForeignKey(): string;

    /** @return string The model class for BukuKasUmum variant */
    abstract protected function bukuKasUmumModelClass(): string;

    /** @return string The FK column on buku_kas_umums pointing to this penganggaran */
    abstract protected function bukuKasUmumForeignKey(): string;

    // ─── Boot hook ─────────────────────────────────────────────────

    protected static function bootHasPenganggaranBehavior(): void
    {
        static::retrieved(function ($penganggaran) {
            if (empty($penganggaran->sekolah_id)) {
                $sekolah = SekolahProfile::first();
                if ($sekolah) {
                    $penganggaran->sekolah_id = $sekolah->id;
                    $penganggaran->setRelation('sekolah', $sekolah);
                }
            }
        });
    }

    // ─── Fillable & Casts ──────────────────────────────────────────

    public function initializeHasPenganggaranBehavior(): void
    {
        $this->fillable = array_unique(array_merge($this->fillable ?? [], [
            'pagu_anggaran',
            'tahun_anggaran',
            'kepala_sekolah',
            'sk_kepala_sekolah',
            'bendahara',
            'sk_bendahara',
            'komite',
            'nip_kepala_sekolah',
            'nip_bendahara',
            'tanggal_cetak',
            'tanggal_perubahan',
            'tanggal_sk_kepala_sekolah',
            'tanggal_sk_bendahara',
            'sekolah_id',
            'is_trk_saldo_awal',
            'tanggal_trk_saldo_awal',
            'jumlah_trk_saldo_awal',
        ]));

        $this->casts = array_merge($this->casts ?? [], [
            'pagu_anggaran' => 'decimal:2',
            'tahun_anggaran' => 'integer',
            'tanggal_sk_kepala_sekolah' => 'date',
            'tanggal_sk_bendahara' => 'date',
            'is_trk_saldo_awal' => 'boolean',
            'tanggal_trk_saldo_awal' => 'date',
            'jumlah_trk_saldo_awal' => 'decimal:2',
        ]);
    }

    // ─── Relationships ─────────────────────────────────────────────

    public function sekolah()
    {
        return $this->belongsTo(SekolahProfile::class, 'sekolah_id');
    }

    public function rkas()
    {
        return $this->hasMany($this->rkasModelClass(), $this->rkasForeignKey());
    }

    public function penerimaanDanas()
    {
        return $this->hasMany($this->penerimaanDanaModelClass(), $this->penerimaanDanaForeignKey());
    }

    public function bukuKasUmums()
    {
        return $this->hasMany($this->bukuKasUmumModelClass(), $this->bukuKasUmumForeignKey());
    }

    // ─── Accessors ─────────────────────────────────────────────────

    public function getFormatTanggalCetakAttribute()
    {
        if ($this->tanggal_cetak) {
            return $this->formatTanggalIndonesia($this->tanggal_cetak);
        }
        return 'Belum diisi';
    }

    public function getFormatTanggalPerubahanAttribute()
    {
        if ($this->tanggal_perubahan) {
            return $this->formatTanggalIndonesia($this->tanggal_perubahan);
        }
        return 'Belum diisi';
    }

    public function getFormatTanggalSkKepsekAttribute()
    {
        return $this->tanggal_sk_kepala_sekolah
            ? $this->formatTanggalIndonesia($this->tanggal_sk_kepala_sekolah)
            : null;
    }

    public function getFormatTanggalSkBendaharaAttribute()
    {
        return $this->tanggal_sk_bendahara
            ? $this->formatTanggalIndonesia($this->tanggal_sk_bendahara)
            : null;
    }

    // ─── Business Logic ────────────────────────────────────────────

    public function getBulanStatus()
    {
        $months = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];

        $monthsMap = array_flip($months);

        // Get all BKU records grouped by month index (0-11)
        $bkuRecords = $this->bukuKasUmums()
            ->select('tanggal_transaksi', 'is_bunga_record', 'total_pajak', 'total_pajak_daerah', 'tanggal_lapor')
            ->get()
            ->groupBy(function ($item) {
                return Carbon::parse($item->tanggal_transaksi)->month - 1;
            });

        // Check if there is any Penerimaan Dana
        $hasPenerimaan = $this->penerimaanDanas()->exists();

        $status = [];
        $previousMonthClosed = $hasPenerimaan;

        foreach ($months as $index => $month) {
            // Special case for January if no penerimaan
            if ($index === 0 && !$hasPenerimaan) {
                $status[$month] = 'disabled';
                $previousMonthClosed = false;
                continue;
            }

            // If previous month is not closed, this month is disabled
            if ($index > 0 && !$previousMonthClosed) {
                $status[$month] = 'disabled';
                continue;
            }

            // Check records for this month
            $monthRecords = $bkuRecords->get($index);

            $isClosed = false;
            $hasData = false;

            if ($monthRecords && $monthRecords->count() > 0) {
                $hasData = true;
                $isClosed = $monthRecords->contains('is_bunga_record', true);
            }

            if ($isClosed) {
                // Check if any record has tax but not reported yet
                $hasUnreportedTax = $monthRecords->contains(function ($record) {
                    $hasTax = ($record->total_pajak > 0) || ($record->total_pajak_daerah > 0);
                    $isReported = !is_null($record->tanggal_lapor);
                    return $hasTax && !$isReported;
                });

                if ($hasUnreportedTax) {
                    $status[$month] = 'lapor_pajak';
                } else {
                    $status[$month] = 'closed';
                }
                $previousMonthClosed = true;
            } elseif ($hasData) {
                $status[$month] = 'draft';
                $previousMonthClosed = false;
            } else {
                $status[$month] = 'empty';
                $previousMonthClosed = false;
            }
        }

        return $status;
    }

    // ─── Helpers ────────────────────────────────────────────────────

    private function formatTanggalIndonesia($date)
    {
        $bulan = [
            1 => 'Januari',
            2 => 'Februari',
            3 => 'Maret',
            4 => 'April',
            5 => 'Mei',
            6 => 'Juni',
            7 => 'Juli',
            8 => 'Agustus',
            9 => 'September',
            10 => 'Oktober',
            11 => 'November',
            12 => 'Desember'
        ];

        $date = Carbon::parse($date);
        return $date->day . ' ' . $bulan[$date->month] . ' ' . $date->year;
    }
}
