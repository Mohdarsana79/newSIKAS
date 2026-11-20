<?php

namespace App\Console\Commands;

use App\Models\RefBarang;
use App\Services\ArkasEngineService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class SyncArkasCatalogCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'arkas:sync-catalog {--year=ALL : Tahun anggaran acuan ARKAS (ALL atau 2026)}';

    /**
     * The console command description.
     */
    protected $description = 'Menyinkronkan data katalog acuan barang dan SSH resmi dari database ARKAS desktop (arkas.db) ke PostgreSQL ref_barangs';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $year = (string) $this->option('year');
        $this->info("Memulai sinkronisasi katalog ARKAS (Tahun: {$year})...");

        $this->info('Mengeksekusi engine query ARKAS SQLite...');
        $result = app(ArkasEngineService::class)->runScriptRaw('query.py', ['__ALL__', $year], 300);

        if (! $result || ! isset($result['data'])) {
            $this->error('Format data dari engine ARKAS tidak valid atau error: '.($result['error'] ?? $result['message'] ?? 'Unknown error'));

            return 1;
        }

        $items = $result['data'];
        $totalItems = count($items);
        $this->info("Ditemukan {$totalItems} barang dari database ARKAS ({$result['db_path']}).");

        if ($totalItems === 0) {
            $this->warn('Tidak ada data yang perlu disinkronkan.');

            return 0;
        }

        $now = now();
        $records = [];
        foreach ($items as $item) {
            $records[] = [
                'id_barang' => (string) $item['id_barang'],
                'nama_barang' => (string) ($item['nama_barang'] ?? ''),
                'kode_rekening' => ! empty($item['kode_rekening']) ? (string) $item['kode_rekening'] : null,
                'rekening' => ! empty($item['rekening']) ? (string) $item['rekening'] : null,
                'satuan' => ! empty($item['satuan']) ? (string) $item['satuan'] : null,
                'batas_atas' => (float) ($item['batas_atas'] ?? 0),
                'tahun' => (int) ($item['tahun'] ?? 2026),
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        $this->info('Menyimpan ke PostgreSQL ref_barangs dengan batch upsert...');
        $progressBar = $this->output->createProgressBar(count($records));
        $progressBar->start();

        $chunks = array_chunk($records, 5000);
        foreach ($chunks as $chunk) {
            DB::transaction(function () use ($chunk) {
                RefBarang::upsert(
                    $chunk,
                    ['id_barang', 'tahun'],
                    ['nama_barang', 'kode_rekening', 'rekening', 'satuan', 'batas_atas', 'updated_at']
                );
            });
            $progressBar->advance(count($chunk));
        }

        $progressBar->finish();
        $this->newLine();
        $totalInDb = RefBarang::count();
        $this->info("✅ Berhasil menyinkronkan {$totalItems} data acuan barang ARKAS. Total data di ref_barangs sekarang: {$totalInDb}.");

        return 0;
    }
}
