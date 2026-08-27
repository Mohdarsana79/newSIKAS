<?php
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\KinerjaBukuKasUmum;
use App\Models\KinerjaPenganggaran;

$penganggaran = KinerjaPenganggaran::where('tahun_anggaran', '2027')->first();
if (!$penganggaran) {
    echo "Penganggaran Kinerja 2027 not found.\n";
    exit;
}

$transaksi = KinerjaBukuKasUmum::where('kinerja_penganggaran_id', $penganggaran->id)
    ->whereYear('tanggal_transaksi', '2027')
    ->where('is_bunga_record', false)
    ->whereHas('rekeningBelanja')
    ->with('rekeningBelanja')
    ->get();

$total_semua = 0;
$total_terhitung = 0;
echo "Transaksi BKU Kinerja 2027:\n";
foreach ($transaksi as $trx) {
    $kode = $trx->rekeningBelanja->kode_rekening;
    $jumlah = $trx->total_transaksi_kotor;
    $total_semua += $jumlah;

    $masuk = false;
    if (strpos($kode, '5.1.02.01') === 0) {
        $masuk = true;
    } elseif (strpos($kode, '5.1.02.02') === 0 || strpos($kode, '5.1.02.04') === 0) {
        $masuk = true;
    } elseif (strpos($kode, '5.2.02') === 0) {
        $masuk = true;
    } elseif (strpos($kode, '5.2.05') === 0) {
        $masuk = true;
    }

    if ($masuk) {
        $total_terhitung += $jumlah;
    }
    
    echo "- Kode: $kode | Jumlah: $jumlah | Terhitung: " . ($masuk ? 'Ya' : 'Tidak') . "\n";
}

echo "\nTotal Semua: $total_semua\n";
echo "Total Terhitung: $total_terhitung\n";
