<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class Rkas extends Model
{
    use HasFactory;

    protected $table = 'rkas';

    protected $fillable = [
        'penganggaran_id',
        'kode_id',
        'kode_rekening_id',
        'uraian',
        'harga_satuan',
        'bulan',
        'jumlah',
        'satuan'
    ];

    protected $casts = [
        'harga_satuan' => 'decimal:2',
        'jumlah' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function penganggaran()
    {
        return $this->belongsTo(Penganggaran::class);
    }

    public function kodeKegiatan()
    {
        return $this->belongsTo(KodeKegiatan::class, 'kode_id')->withDefault([
            'program' => '-',
            'sub_program' => '-',
            'uraian' => '-'
        ]);
    }

    /**
     * Relasi dengan RekeningBelanja
     */
    public function rekeningBelanja()
    {
        return $this->belongsTo(RekeningBelanja::class, 'kode_rekening_id')->withDefault([
            'kode_rekening' => '-',
            'rincian_objek' => '-'
        ]);
    }

    /**
     * Accessor untuk menghitung total anggaran
     */
    public function getTotalAnggaranAttribute()
    {
        return $this->harga_satuan * $this->jumlah;
    }

    /**
     * Accessor untuk format harga satuan
     */
    public function getHargaSatuanFormattedAttribute()
    {
        return 'Rp ' . number_format($this->harga_satuan, 0, ',', '.');
    }

    /**
     * Accessor untuk format total anggaran
     */
    public function getTotalAnggaranFormattedAttribute()
    {
        return 'Rp ' . number_format($this->total_anggaran, 0, ',', '.');
    }

    /**
     * Scope untuk filter berdasarkan bulan
     */
    public function scopeByBulan($query, $bulan)
    {
        return $query->where('bulan', $bulan);
    }

    /**
     * Scope untuk filter berdasarkan kegiatan
     */
    public function scopeByKegiatan($query, $kodeId)
    {
        return $query->where('kode_id', $kodeId);
    }

    /**
     * Scope untuk filter berdasarkan rekening belanja
     */
    public function scopeByRekening($query, $rekeningId)
    {
        return $query->where('kode_rekening_id', $rekeningId);
    }

    /**
     * Static method untuk mendapatkan daftar bulan
     */
    public static function getBulanList()
    {
        return [
            'Januari',
            'Februari',
            'Maret',
            'April',
            'Mei',
            'Juni',
            'Juli',
            'Agustus',
            'September',
            'Oktober',
            'November',
            'Desember'
        ];
    }

    /**
     * Static method untuk menghitung total anggaran per bulan
     */
    public static function getTotalPerBulan($bulan = null)
    {
        $query = self::selectRaw('bulan, SUM(harga_satuan * jumlah) as total')
            ->groupBy('bulan');

        if ($bulan) {
            $query->where('bulan', $bulan);
        }

        return $query->get()->pluck('total', 'bulan');
    }

    /**
     * Static method untuk menghitung total keseluruhan anggaran
     */
    public static function getTotalKeseluruhan()
    {
        return self::selectRaw('SUM(harga_satuan * jumlah) as total')->value('total') ?? 0;
    }

    /**
     * Static method untuk menghitung total anggaran Tahap 1 (Januari-Juni)
     */
    public static function getTotalTahap1($penganggaranId = null)
    {
        $tahap1Months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
        $query = self::whereIn('bulan', $tahap1Months);

        if ($penganggaranId) {
            $query->where('penganggaran_id', $penganggaranId);
        }

        return $query->sum(DB::raw('jumlah * harga_satuan'));
    }

    /**
     * Static method untuk menghitung total anggaran Tahap 2 (Juli-Desember)
     */
    public static function getTotalTahap2($penganggaranId = null)
    {
        $tahap2Months = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        $query = self::whereIn('bulan', $tahap2Months);

        if ($penganggaranId) {
            $query->where('penganggaran_id', $penganggaranId);
        }

        return $query->sum(DB::raw('jumlah * harga_satuan'));
    }

    /**
     * Static method untuk mendapatkan daftar bulan Tahap 1
     */
    public static function getBulanTahap1()
    {
        return ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
    }

    /**
     * Static method untuk mendapatkan daftar bulan Tahap 2
     */
    public static function getBulanTahap2()
    {
        return ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    }

    /**
     * Scope untuk filter berdasarkan tahap (1 atau 2)
     */
    public function scopeByTahap($query, $tahap, $penganggaranId = null)
    {
        $bulanTahap1 = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
        $bulanTahap2 = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

        $query->whereIn('bulan', $tahap == 1 ? $bulanTahap1 : $bulanTahap2);

        if ($penganggaranId) {
            $query->where('penganggaran_id', $penganggaranId);
        }

        return $query;
    }

    public function bkuUraianDetails()
    {
        return $this->hasMany(BukuKasUmumUraianDetail::class, 'rkas_id');
    }
}
