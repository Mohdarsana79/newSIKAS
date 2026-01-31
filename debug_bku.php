<?php

use App\Models\BukuKasUmum;
use App\Models\Penganggaran;
use Illuminate\Support\Facades\DB;

// Ambil tahun aktif
$tahun = 2025; // Sesuai request user
$penganggaran = Penganggaran::where('tahun_anggaran', $tahun)->first();

if (!$penganggaran) {
    echo "Penganggaran tahun $tahun tidak ditemukan.\n";
    exit;
}

echo "Penganggaran ID: " . $penganggaran->id . "\n";

// Cek total data BKU
$countTotal = BukuKasUmum::count();
echo "Total Rows di BukuKasUmum: $countTotal\n";

// Cek data untuk penganggaran ini
$countPenganggaran = BukuKasUmum::where('penganggaran_id', $penganggaran->id)->count();
echo "Total Rows untuk Penganggaran ID {$penganggaran->id}: $countPenganggaran\n";

// Cek sampel data
$sample = BukuKasUmum::where('penganggaran_id', $penganggaran->id)->first();
if ($sample) {
    echo "Sampel Tanggal Transaksi: " . $sample->tanggal_transaksi . " (Tipe: " . gettype($sample->tanggal_transaksi) . ")\n";
    echo "Kode Kegiatan ID: " . $sample->kode_kegiatan_id . "\n";
    
    // Cek relasi
    if ($sample->kodeKegiatan) {
        echo "Kode Kegiatan: " . $sample->kodeKegiatan->kode . " - " . $sample->kodeKegiatan->uraian . "\n";
    } else {
        echo "Relasi kodeKegiatan NULL\n";
    }
} else {
    echo "Tidak ada data BKU untuk penganggaran ini.\n";
}

// Cek Query Month Extraction
$bulan = 1; // Januari
$queryCount = BukuKasUmum::where('penganggaran_id', $penganggaran->id)
    ->whereYear('tanggal_transaksi', $tahun)
    ->whereMonth('tanggal_transaksi', $bulan)
    ->count();

echo "Query whereMonth result: $queryCount\n";

// Cek Query Raw Extract (yang dipakai di controller)
// Note: Syntax might vary by DB (MySQL vs SQLite)
try {
    $rawCount = BukuKasUmum::where('penganggaran_id', $penganggaran->id)
        ->whereYear('tanggal_transaksi', $tahun)
        ->whereIn(DB::raw('MONTH(tanggal_transaksi)'), [$bulan])
        ->count();
    echo "Query raw MONTH() result: $rawCount\n";
} catch (\Exception $e) {
    echo "Query raw MONTH() error: " . $e->getMessage() . "\n";
}

try {
    $rawCountPg = BukuKasUmum::where('penganggaran_id', $penganggaran->id)
        ->whereYear('tanggal_transaksi', $tahun)
        ->whereIn(DB::raw('EXTRACT(MONTH FROM tanggal_transaksi)'), [$bulan])
        ->count();
    echo "Query raw EXTRACT result: $rawCountPg\n";
} catch (\Exception $e) {
    echo "Query raw EXTRACT error: " . $e->getMessage() . "\n";
}
