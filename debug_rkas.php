<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$kernel->handle(Illuminate\Http\Request::capture());

use App\Models\Rkas;
use App\Models\KodeKegiatan;

$penganggaranId = 1;
$rkas = Rkas::where('penganggaran_id', $penganggaranId)->get();

$grouped = [];
foreach ($rkas as $item) {
    $kode = $item->kodeKegiatan->kode ?? 'N/A';
    if (!isset($grouped[$kode])) {
        $grouped[$kode] = 0;
    }
    $grouped[$kode] += $item->jumlah * $item->harga_satuan;
}

arsort($grouped);
echo "RKAS Totals by Code for Penganggaran ID: $penganggaranId\n";
foreach ($grouped as $kode => $total) {
    echo "Kode: $kode | Total: " . number_format($total, 2) . "\n";
}
