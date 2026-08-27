<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SilpaSp2b extends Model
{
    protected $fillable = [
        'nomor_sp2b', 'tanggal_sp2b', 'jenis_periode', 'bulan', 'tahap', 'silpa_penganggaran_id',
        'saldo_awal', 'pendapatan', 'belanja', 'belanja_pegawai',
        'belanja_barang_jasa', 'belanja_modal', 
        'belanja_modal_peralatan_mesin', 'belanja_modal_aset_tetap_lainnya',
        'belanja_modal_tanah_bangunan', 'saldo_akhir'
    ];

    public function silpaPenganggaran()
    {
        return $this->belongsTo(SilpaPenganggaran::class, 'silpa_penganggaran_id');
    }

    public function penganggaran() { return $this->silpaPenganggaran(); }
}
