<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$kernel->handle(Illuminate\Http\Request::capture());

use App\Models\BukuKasUmumUraianDetail;

$penganggaranId = 1;
$details = BukuKasUmumUraianDetail::whereHas('bukuKasUmum', function($q) use ($penganggaranId) {
    $q->where('penganggaran_id', $penganggaranId);
})->get();

foreach ($details as $detail) {
    echo "ID: " . $detail->id . " | Vol: " . $detail->volume . " | Harga: " . $detail->harga_satuan . " | Jumlah: " . $detail->jumlah . "\n";
}
