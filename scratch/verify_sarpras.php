<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Rkas;
use App\Models\Penganggaran;

$p = Penganggaran::orderBy('id', 'desc')->first();
if ($p) {
    $sum = Rkas::where('penganggaran_id', $p->id)
        ->whereHas('kodeKegiatan', function ($q) {
            $q->where('kode', 'like', '05.08.01%');
        })
        ->get()
        ->sum(function ($item) {
            return $item->jumlah * $item->harga_satuan;
        });
    echo "Sum for ID {$p->id} (Year {$p->tahun_anggaran}): " . number_format($sum, 2) . "\n";
} else {
    echo "No Penganggaran found.\n";
}
