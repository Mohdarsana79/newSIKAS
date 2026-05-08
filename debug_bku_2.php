<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$kernel->handle(Illuminate\Http\Request::capture());

use App\Models\BukuKasUmum;

$penganggaranId = 1;
$records = BukuKasUmum::where('penganggaran_id', $penganggaranId)
    ->whereHas('kodeKegiatan', function($q) {
        $q->where('kode', 'like', '05.08.01%')
          ->orWhere('kode', 'like', '05.08.03%')
          ->orWhere('kode', 'like', '05.08.05%')
          ->orWhere('kode', 'like', '05.08.10%');
    })->get();

echo "Found " . $records->count() . " records.\n";
foreach ($records as $r) {
    echo "ID: " . $r->id . " | Uraian: " . $r->uraian . " | Dibelanjakan: " . $r->dibelanjakan . " | Pajak: " . $r->total_pajak . "\n";
    $details = $r->uraianDetails; // assuming relationship exists
    if ($details) {
        foreach ($details as $d) {
            echo "  -> Detail: " . $d->uraian . " | Jumlah: " . $d->jumlah . "\n";
        }
    }
}
