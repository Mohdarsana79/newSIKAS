<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class KinerjaRkasPerubahan extends Model
{
    use HasFactory;

    protected $table = 'kinerja_rkas_perubahans';

    protected $fillable = [
        'kinerja_penganggaran_id',
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
        'uraian_gabungan'
    ];

    protected $casts = [
        'harga_satuan' => 'decimal:2',
        'jumlah' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function kinerjaPenganggaran()
    {
        return $this->belongsTo(KinerjaPenganggaran::class, 'kinerja_penganggaran_id');
    }

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

    public static function getBulanList()
    {
        return [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
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
        $tahap1Months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
        $query = self::whereIn('bulan', $tahap1Months);

        if ($penganggaranId) {
            $query->where('kinerja_penganggaran_id', $penganggaranId);
        }

        return $query->sum(DB::raw('jumlah * harga_satuan'));
    }

    public static function getTotalTahap2($penganggaranId = null)
    {
        $tahap2Months = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        $query = self::whereIn('bulan', $tahap2Months);

        if ($penganggaranId) {
            $query->where('kinerja_penganggaran_id', $penganggaranId);
        }

        return $query->sum(DB::raw('jumlah * harga_satuan'));
    }

    public static function getBulanTahap1()
    {
        return ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
    }

    public static function getBulanTahap2()
    {
        return ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    }

    public function scopeByTahap($query, $tahap, $penganggaranId = null)
    {
        $bulanTahap1 = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
        $bulanTahap2 = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

        $query->whereIn('bulan', $tahap == 1 ? $bulanTahap1 : $bulanTahap2);

        if ($penganggaranId) {
            $query->where('kinerja_penganggaran_id', $penganggaranId);
        }

        return $query;
    }
}
