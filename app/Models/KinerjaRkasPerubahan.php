<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class KinerjaRkasPerubahan extends Model
{
    use HasFactory;

    protected $table = "kinerja_rkas_perubahans";

    protected $fillable = [
        "kinerja_penganggaran_id",
        "kode_id",
        "kode_rekening_id",
        "uraian",
        "harga_satuan",
        "bulan",
        "jumlah",
        "satuan"
    ];

    protected $casts = [
        "harga_satuan" => "decimal:2",
        "jumlah" => "integer",
        "created_at" => "datetime",
        "updated_at" => "datetime",
    ];

    public function kinerjaPenganggaran()
    {
        return $this->belongsTo(KinerjaPenganggaran::class, "kinerja_penganggaran_id");
    }


    public function kodeKegiatan()
    {
        return $this->belongsTo(KodeKegiatan::class, "kode_id")->withDefault([
            "program" => "-",
            "sub_program" => "-",
            "uraian" => "-"
        ]);
    }


    public function rekeningBelanja()
    {
        return $this->belongsTo(RekeningBelanja::class, "kode_rekening_id")->withDefault([
            "kode_rekening" => "-",
            "rincian_objek" => "-"
        ]);
    }


    public function getTotalAnggaranAttribute()
    {
        return $this->harga_satuan * $this->jumlah;
    }


    public function getHargaSatuanFormattedAttribute()
    {
        return "Rp " . number_format($this->harga_satuan, 0, ",", ".");
    }


    public function getTotalAnggaranFormattedAttribute()
    {
        return "Rp " . number_format($this->total_anggaran, 0, ",", ".");
    }


    public function scopeByBulan($query, $bulan)
    {
        return $query->where("bulan", $bulan);
    }


    public function scopeByKegiatan($query, $kodeId)
    {
        return $query->where("kode_id", $kodeId);
    }


    public function scopeByRekening($query, $rekeningId)
    {
        return $query->where("kode_rekening_id", $rekeningId);
    }


    public static function getBulanList()
    {
        return [
            "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
            "Juli", "Agustus", "September", "Oktober", "November", "Desember"
        ];
    }


    public static function getTotalPerBulan($bulan = null)
    {
        $query = self::selectRaw("bulan, SUM(harga_satuan * jumlah) as total")
            ->groupBy("bulan");

        if ($bulan) {
            $query->where("bulan", $bulan);
        }


        return $query->get()->pluck("total", "bulan");
    }


    public static function getTotalKeseluruhan()
    {
        return self::selectRaw("SUM(harga_satuan * jumlah) as total")->value("total") ?? 0;
    }


    public static function getTotalTahap1($penganggaranId = null)
    {
        $tahap1Months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni"];
        $query = self::whereIn("bulan", $tahap1Months);

        if ($penganggaranId) {
            $query->where("kinerja_penganggaran_id", $penganggaranId);
        }


        return $query->sum(DB::raw("jumlah * harga_satuan"));
    }


    public static function getTotalTahap2($penganggaranId = null)
    {
        $tahap2Months = ["Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        $query = self::whereIn("bulan", $tahap2Months);

        if ($penganggaranId) {
            $query->where("kinerja_penganggaran_id", $penganggaranId);
        }


        return $query->sum(DB::raw("jumlah * harga_satuan"));
    }


    public static function getBulanTahap1()
    {
        return ["Januari", "Februari", "Maret", "April", "Mei", "Juni"];
    }


    public static function getBulanTahap2()
    {
        return ["Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    }


    public function scopeByTahap($query, $tahap, $penganggaranId = null)
    {
        $bulanTahap1 = ["Januari", "Februari", "Maret", "April", "Mei", "Juni"];
        $bulanTahap2 = ["Juli", "Agustus", "September", "Oktober", "November", "Desember"];

        $query->whereIn("bulan", $tahap == 1 ? $bulanTahap1 : $bulanTahap2);

        if ($penganggaranId) {
            $query->where("kinerja_penganggaran_id", $penganggaranId);
        }


        return $query;
    }

    public function bkuUraianDetails()
    {
        return $this->hasMany(KinerjaBukuKasUmumUraianDetail::class, "kinerja_rkas_perubahan_id");
    }


    public function penganggaran() { return $this->kinerjaPenganggaran(); }
}


