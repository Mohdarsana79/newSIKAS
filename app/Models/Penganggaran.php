<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Penganggaran extends Model
{
    use HasFactory;

    protected $table = 'penganggarans';

    protected $fillable = [
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
        'jumlah_trk_saldo_awal'
    ];

    protected $casts = [
        'pagu_anggaran' => 'decimal:2',
        'tahun_anggaran' => 'integer',
        'tanggal_sk_kepala_sekolah' => 'date',
        'tanggal_sk_bendahara' => 'date',
        'is_trk_saldo_awal' => 'boolean',
        'tanggal_trk_saldo_awal' => 'date',
        'jumlah_trk_saldo_awal' => 'decimal:2',
    ];

    // Remove relationships that might not exist yet to prevent errors
    public function sekolah() { return $this->belongsTo(SekolahProfile::class, 'sekolah_id'); }
    public function rkas() { return $this->hasMany(Rkas::class); }
    // public function rkasPerubahan() { return $this->hasMany(RkasPerubahan::class); }
    public function penerimaanDanas() { return $this->hasMany(PenerimaanDana::class, 'penganggaran_id'); }
    // public function penarikanTunai() { return $this->hasMany(PenarikanTunai::class, 'penganggaran_id'); }
    // public function setorTunai() { return $this->hasMany(SetorTunai::class, 'penganggaran_id'); }
    // public function tandaTerima() { return $this->hasMany(TandaTerima::class); }
    // public function sts() { return $this->hasMany(Sts::class); }

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
    public function bukuKasUmums() { return $this->hasMany(BukuKasUmum::class, 'penganggaran_id'); }

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
            ->groupBy(function($item) {
                return Carbon::parse($item->tanggal_transaksi)->month - 1; 
            });
        
        // Check if there is any Penerimaan Dana
        $hasPenerimaan = $this->penerimaanDanas()->exists();

        $status = [];
        // The first month (Januari) is open if there is Penerimaan Dana.
        // But the user said: "if detected in database receipt of funds exist then activate back card month january"
        // and "if not detected... all card disabled".
        
        $previousMonthClosed = $hasPenerimaan; 

        foreach ($months as $index => $month) {
            // Special case for January if no penerimaan
            if ($index === 0 && !$hasPenerimaan) {
                $status[$month] = 'disabled';
                $previousMonthClosed = false; 
                continue;
            }

            // If previous month is not closed, this month is disabled (unless it's Jan and hasPenerimaan, handled above)
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
                    $status[$month] = 'closed'; // Selesai
                }
                $previousMonthClosed = true;
            } elseif ($hasData) {
                $status[$month] = 'draft'; // Draft
                $previousMonthClosed = false; 
            } else {
                $status[$month] = 'empty'; // Belum diisi
                 $previousMonthClosed = false;
            }
        }
        
        return $status;
    }
}
