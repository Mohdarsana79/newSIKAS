<?php

namespace App\Models\Traits;

use App\Models\KodeKegiatan;
use App\Models\RekeningBelanja;
use Illuminate\Support\Facades\DB;

/**
 * Shared behavior for all Rkas model variants.
 * 
 * Used by: Rkas, KinerjaRkas, SilpaRkas, KinerjaSilpaRkas
 */
trait HasRkasBehavior
{
    // ─── Abstract methods: each model MUST override ────────────────

    abstract protected function penganggaranModelClass(): string;
    abstract public function penganggaranForeignKey(): string;
    abstract protected function bkuUraianDetailModelClass(): string;
    abstract public function rkasForeignKey(): string;

    // ─── Fillable & Casts ──────────────────────────────────────────

    public function initializeHasRkasBehavior(): void
    {
        $this->fillable = array_unique(array_merge($this->fillable ?? [], [
            $this->penganggaranForeignKey(),
            'kode_id',
            'kode_rekening_id',
            'uraian',
            'harga_satuan',
            'bulan',
            'jumlah',
            'satuan',
            'nama_penerima',
            'jabatan',
            'nomor_rekening',
            'bank',
            'ada_npwp',
            'pot_ppn',
            'pot_pph23',
            'pot_pph21',
            'pot_pph21_narasumber',
            'status_penerima',
            'golongan',
            'nomor_kwitansi'
        ]));

        $this->casts = array_merge($this->casts ?? [], [
            'harga_satuan' => 'decimal:2',
            'jumlah' => 'integer',
        ]);
    }

    // ─── Shared Relationships ──────────────────────────────────────

    public function kodeKegiatan()
    {
        return $this->belongsTo(KodeKegiatan::class, 'kode_id')->withDefault([
            'program' => '-',
            'sub_program' => '-',
            'uraian' => '-'
        ]);
    }

    public function rekeningBelanja()
    {
        return $this->belongsTo(RekeningBelanja::class, 'kode_rekening_id')->withDefault([
            'kode_rekening' => '-',
            'rincian_objek' => '-'
        ]);
    }
    
    // ─── Variant-Aware Relationships ───────────────────────────────

    public function penganggaran()
    {
        return $this->belongsTo($this->penganggaranModelClass(), $this->penganggaranForeignKey());
    }

    public function bkuUraianDetails()
    {
        return $this->hasMany($this->bkuUraianDetailModelClass(), $this->rkasForeignKey());
    }

    // ─── Accessors ─────────────────────────────────────────────────

    public function getTotalAnggaranAttribute()
    {
        return $this->harga_satuan * $this->jumlah;
    }

    public function getHargaSatuanFormattedAttribute()
    {
        return 'Rp ' . number_format($this->harga_satuan, 0, ',', '.');
    }

    public function getTotalAnggaranFormattedAttribute()
    {
        return 'Rp ' . number_format($this->total_anggaran, 0, ',', '.');
    }

    // ─── Scopes ────────────────────────────────────────────────────

    public function scopeByBulan($query, $bulan)
    {
        return $query->where('bulan', $bulan);
    }

    public function scopeByKegiatan($query, $kodeId)
    {
        return $query->where('kode_id', $kodeId);
    }

    public function scopeByRekening($query, $rekeningId)
    {
        return $query->where('kode_rekening_id', $rekeningId);
    }

    public function scopeByTahap($query, $tahap, $penganggaranId = null)
    {
        $bulanTahap1 = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
        $bulanTahap2 = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

        $query->whereIn('bulan', $tahap == 1 ? $bulanTahap1 : $bulanTahap2);

        if ($penganggaranId) {
            $query->where((new static)->penganggaranForeignKey(), $penganggaranId);
        }

        return $query;
    }

    // ─── Static Methods ────────────────────────────────────────────

    public static function getBulanList()
    {
        return [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
    }

    public static function getBulanTahap1()
    {
        return ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
    }

    public static function getBulanTahap2()
    {
        return ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    }

    public static function getTotalPerBulan($bulan = null)
    {
        $query = self::selectRaw('bulan, SUM(harga_satuan * jumlah) as total')
            ->groupBy('bulan');

        if ($bulan) {
            $query->where('bulan', $bulan);
        }

        return $query->get()->pluck('total', 'bulan');
    }

    public static function getTotalKeseluruhan()
    {
        return self::selectRaw('SUM(harga_satuan * jumlah) as total')->value('total') ?? 0;
    }

    public static function getTotalTahap1($penganggaranId = null)
    {
        $query = self::whereIn('bulan', self::getBulanTahap1());

        if ($penganggaranId) {
            $query->where((new static)->penganggaranForeignKey(), $penganggaranId);
        }

        return $query->sum(DB::raw('jumlah * harga_satuan'));
    }

    public static function getTotalTahap2($penganggaranId = null)
    {
        $query = self::whereIn('bulan', self::getBulanTahap2());

        if ($penganggaranId) {
            $query->where((new static)->penganggaranForeignKey(), $penganggaranId);
        }

        return $query->sum(DB::raw('jumlah * harga_satuan'));
    }
}
