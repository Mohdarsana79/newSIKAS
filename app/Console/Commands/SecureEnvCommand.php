<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class SecureEnvCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'sikas:secure-env
                            {--restore : Kembalikan file .env dari ProgramData ke root project}
                            {--status : Periksa lokasi file .env yang aktif saat ini}
                            {--target= : Direktori kustom untuk pengamanan (opsional)}';

    /**
     * The console command description.
     */
    protected $description = 'Amankan file .env ke folder C:\ProgramData\SIKAS untuk mencegah modifikasi oleh pengguna di komputer klien';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $programData = getenv('ProgramData') ?: ($_SERVER['ProgramData'] ?? 'C:\ProgramData');
        $targetDir = $this->option('target') ?: rtrim($programData, '\\/').DIRECTORY_SEPARATOR.'SIKAS';
        $secureEnvPath = $targetDir.DIRECTORY_SEPARATOR.'.env';
        $rootEnvPath = base_path('.env');

        // Mode Status
        if ($this->option('status')) {
            $activePath = app()->environmentFilePath();
            $this->info("Lokasi file .env yang aktif: {$activePath}");

            if (file_exists($secureEnvPath) && ! file_exists($rootEnvPath)) {
                $this->info('Status Keamanan: [TERKUNCI DI PROGRAMDATA] File .env aman dan tidak ada di root web.');
            } elseif (file_exists($rootEnvPath) && ! file_exists($secureEnvPath)) {
                $this->warn('Status Keamanan: [MODE PENGEMBANGAN / ROOT] File .env berada di root project.');
            } elseif (file_exists($rootEnvPath) && file_exists($secureEnvPath)) {
                $this->warn('Status Keamanan: [PERINGATAN] File .env ditemukan di kedua lokasi (root dan ProgramData).');
            } else {
                $this->error('Status Keamanan: File .env tidak ditemukan di root maupun ProgramData.');
            }

            return Command::SUCCESS;
        }

        // Mode Restore (Kembalikan ke Root)
        if ($this->option('restore')) {
            if (! file_exists($secureEnvPath)) {
                $this->error("File konfigurasi di {$secureEnvPath} tidak ditemukan.");

                return Command::FAILURE;
            }

            $this->info("Mengembalikan file .env dari {$secureEnvPath} ke {$rootEnvPath}...");
            File::copy($secureEnvPath, $rootEnvPath);
            File::delete($secureEnvPath);

            $this->info("Berhasil! File .env telah dikembalikan ke {$rootEnvPath}.");

            return Command::SUCCESS;
        }

        // Mode Secure Default: Pindahkan dari root ke ProgramData
        if (! file_exists($rootEnvPath)) {
            if (file_exists($secureEnvPath)) {
                $this->info("File .env sudah berada di folder aman ({$secureEnvPath}) dan tidak ada file di root.");

                return Command::SUCCESS;
            }

            $this->error("File .env tidak ditemukan di root ({$rootEnvPath}). Tidak ada yang bisa dipindahkan.");

            return Command::FAILURE;
        }

        $this->info("Memindahkan file .env ke {$secureEnvPath}...");
        File::ensureDirectoryExists($targetDir);
        File::copy($rootEnvPath, $secureEnvPath);
        File::delete($rootEnvPath);

        $this->info("Berhasil! File .env telah dipindahkan ke {$secureEnvPath} dan dihapus dari root project.");

        return Command::SUCCESS;
    }
}
