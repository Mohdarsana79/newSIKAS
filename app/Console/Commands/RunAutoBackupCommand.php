<?php

namespace App\Console\Commands;

use App\Services\AutoBackupService;
use Illuminate\Console\Command;

class RunAutoBackupCommand extends Command
{
    protected $signature = 'backup:auto-run {--force : Jalankan langsung tanpa menunggu jadwal}';

    protected $description = 'Menjalankan auto-backup database & berkas (.rsv), retensi otomatis, dan sinkronisasi opsional sesuai jadwal.';

    public function handle(AutoBackupService $autoBackup): int
    {
        $force = (bool) $this->option('force');
        $result = $autoBackup->execute('scheduled', $force);

        if (! empty($result['skipped'])) {
            // Meski jadwal belum jatuh tempo, cek apakah ada unggahan Google Drive tertunda yang siap dicoba ulang
            $retry = $autoBackup->retryPendingCloudSync(false);
            if (empty($retry['skipped'])) {
                if ($retry['success']) {
                    $this->info($retry['message']);

                    return self::SUCCESS;
                }
                $this->warn($retry['message']);

                return self::SUCCESS;
            }

            $this->line($result['message']);

            return self::SUCCESS;
        }

        if ($result['success']) {
            $this->info($result['message']);

            return self::SUCCESS;
        }

        $this->error($result['message']);

        return self::FAILURE;
    }
}
