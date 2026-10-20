<?php

namespace App\Console\Commands;

use App\Models\RefBarang;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Symfony\Component\Process\Process;

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

        $pythonPath = storage_path('app/arkas_engine/python.exe');
        $scriptPath = storage_path('app/arkas_engine/query.py');

        if (! file_exists($pythonPath) || ! file_exists($scriptPath)) {
            $this->error('Engine python ARKAS tidak ditemukan di direktori storage/app/arkas_engine.');

            return 1;
        }

        $env = $_SERVER;
        unset($env['OPENSSL_CONF']);

        $appdata = $env['APPDATA'] ?? null;
        $userprofile = $env['USERPROFILE'] ?? null;

        if (empty($appdata)) {
            $appdata = trim(shell_exec("powershell -Command \"[Environment]::GetFolderPath('ApplicationData')\""));
        }
        if (empty($userprofile)) {
            $userprofile = trim(shell_exec("powershell -Command \"[Environment]::GetFolderPath('UserProfile')\""));
        }
        if (empty($userprofile) && ! empty($appdata)) {
            $userprofile = dirname(dirname($appdata));
        }
        if (empty($appdata) && ! empty($userprofile)) {
            $appdata = $userprofile.'\\AppData\\Roaming';
        }

        $env['SystemRoot'] = $env['SystemRoot'] ?? 'C:\\Windows';
        $env['SystemDrive'] = $env['SystemDrive'] ?? 'C:';
        $env['USERPROFILE'] = ! empty($userprofile) ? $userprofile : ($env['USERPROFILE'] ?? 'C:\\Users\\Digitalisasi');
        $env['APPDATA'] = ! empty($appdata) ? $appdata : ($env['APPDATA'] ?? 'C:\\Users\\Digitalisasi\\AppData\\Roaming');

        $dbPathManual = env('ARKAS_DB_PATH', '');
        $dbPathManual = trim($dbPathManual, '"\' ');
        $dbPathManual = str_replace('\\', '/', $dbPathManual);

        $this->info('Mengeksekusi engine query ARKAS SQLite...');
        $process = new Process([$pythonPath, $scriptPath, '__ALL__', $year, $dbPathManual], null, $env);
        $process->setTimeout(300); // 5 menit untuk dump besar
        $process->run();

        if (! $process->isSuccessful()) {
            $this->error('Gagal mengeksekusi engine ARKAS: '.$process->getErrorOutput());

            return 1;
        }

        $output = $process->getOutput();
        $result = json_decode($output, true);

        if (! $result || ! isset($result['data'])) {
            $this->error('Format data dari engine ARKAS tidak valid atau error: '.($result['error'] ?? 'Unknown error'));

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
