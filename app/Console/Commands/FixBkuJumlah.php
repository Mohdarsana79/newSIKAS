<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class FixBkuJumlah extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'bku:fix-jumlah';

    /**
     * The console command description.
     */
    protected $description = 'Memperbaiki kolom jumlah pada buku_kas_umum_uraian_details yang masih 0 dengan menghitung volume * harga_satuan';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Memeriksa data buku_kas_umum_uraian_details...');

        $totalBermasalah = DB::table('buku_kas_umum_uraian_details')
            ->where('jumlah', 0)
            ->where('volume', '>', 0)
            ->where('harga_satuan', '>', 0)
            ->count();

        if ($totalBermasalah === 0) {
            $this->info('Tidak ada data yang perlu diperbaiki. Semua kolom jumlah sudah benar.');
            return 0;
        }

        $this->warn("Ditemukan {$totalBermasalah} record dengan jumlah = 0. Memulai perbaikan...");

        $diperbaiki = DB::table('buku_kas_umum_uraian_details')
            ->where('jumlah', 0)
            ->where('volume', '>', 0)
            ->where('harga_satuan', '>', 0)
            ->update([
                'jumlah' => DB::raw('volume * harga_satuan'),
                'updated_at' => now(),
            ]);

        $this->info("✅ Berhasil memperbaiki {$diperbaiki} record.");

        // Laporan akhir
        $masihNol = DB::table('buku_kas_umum_uraian_details')
            ->where('jumlah', 0)
            ->where('volume', '>', 0)
            ->count();

        if ($masihNol > 0) {
            $this->warn("{$masihNol} record masih bernilai 0 (kemungkinan harga_satuan = 0, perlu diperiksa manual).");
        } else {
            $this->info('Semua data sudah diperbaiki dengan sempurna.');
        }

        return 0;
    }
}
