<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\BackupRun;
use App\Models\BackupSetting;
use App\Models\Role;
use App\Models\User;
use App\Services\AutoBackupService;
use App\Services\GoogleDriveSyncService;
use App\Services\WindowsTaskSchedulerService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as HttpClientRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AutoBackupTest extends TestCase
{
    use RefreshDatabase;

    private function createBendahara(): User
    {
        return User::factory()->create([
            'role' => 'bendahara',
            'username' => 'bendahara_autobackup',
            'email' => 'bendahara_autobackup@example.test',
        ]);
    }

    private function createKepalaSekolah(): User
    {
        return User::factory()->create([
            'role' => 'kepala_sekolah',
            'username' => 'kepsek_autobackup',
            'email' => 'kepsek_autobackup@example.test',
        ]);
    }

    private function makeTempDir(string $prefix): string
    {
        $dir = sys_get_temp_dir().DIRECTORY_SEPARATOR.$prefix.'_'.uniqid('', true);
        mkdir($dir, 0777, true);

        return $dir;
    }

    private function removeDir(string $dir): void
    {
        if (! is_dir($dir)) {
            return;
        }
        foreach (scandir($dir) ?: [] as $entry) {
            if ($entry === '.' || $entry === '..') {
                continue;
            }
            $path = $dir.DIRECTORY_SEPARATOR.$entry;
            if (is_dir($path)) {
                $this->removeDir($path);
            } else {
                @unlink($path);
            }
        }
        @rmdir($dir);
    }

    public function test_settings_persistence_encryption_and_secret_preservation(): void
    {
        $this->withoutVite();
        $bendahara = $this->createBendahara();

        $response = $this->actingAs($bendahara)->post(route('backup.auto-settings.update'), [
            'is_enabled' => true,
            'frequency' => BackupSetting::FREQUENCY_WEEKLY,
            'scheduled_time' => '23:15',
            'day_of_week' => 5,
            'day_of_month' => 1,
            'retention_enabled' => true,
            'retention_max_files' => 10,
            'retention_max_days' => 45,
            'sync_mode' => BackupSetting::SYNC_GOOGLE_DRIVE_API,
            'local_sync_path' => '',
            'sync_apply_retention' => true,
            'gdrive_folder_id' => 'folder_abc_123',
            'gdrive_client_id' => 'client_id_xyz.apps.googleusercontent.com',
            'gdrive_client_secret' => 'SUPER-SECRET-CLIENT-KEY',
            'gdrive_refresh_token' => 'SUPER-SECRET-REFRESH-TOKEN',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        // Verifikasi tersimpan terenkripsi di DB (raw value bukan plaintext)
        $rawRow = DB::table('backup_settings')->first();
        $this->assertNotNull($rawRow);
        $this->assertNotSame('SUPER-SECRET-CLIENT-KEY', $rawRow->gdrive_client_secret);
        $this->assertNotSame('SUPER-SECRET-REFRESH-TOKEN', $rawRow->gdrive_refresh_token);

        // Verifikasi decrypted via model
        $setting = BackupSetting::current();
        $this->assertSame('SUPER-SECRET-CLIENT-KEY', $setting->gdrive_client_secret);
        $this->assertSame('SUPER-SECRET-REFRESH-TOKEN', $setting->gdrive_refresh_token);

        // Verifikasi tidak bocor ke array frontend & Inertia props
        $safe = $setting->toSafeFrontendArray();
        $this->assertArrayNotHasKey('gdrive_client_secret', $safe);
        $this->assertArrayNotHasKey('gdrive_refresh_token', $safe);
        $this->assertTrue($safe['has_gdrive_client_secret']);
        $this->assertTrue($safe['has_gdrive_refresh_token']);

        $this->actingAs($bendahara)
            ->get(route('backup.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Backup/Index')
                ->where('autoBackupSetting.is_enabled', true)
                ->where('autoBackupSetting.frequency', 'weekly')
                ->where('autoBackupSetting.scheduled_time', '23:15')
                ->where('autoBackupSetting.has_gdrive_client_secret', true)
                ->where('autoBackupSetting.has_gdrive_refresh_token', true)
                ->missing('autoBackupSetting.gdrive_client_secret')
                ->missing('autoBackupSetting.gdrive_refresh_token')
                ->where('schedulerCommands.os', PHP_OS_FAMILY === 'Windows' ? 'windows' : 'linux')
                ->where('schedulerCommands.windows', fn ($val) => PHP_OS_FAMILY === 'Windows' ? is_string($val) && $val !== '' : $val === null)
                ->where('schedulerCommands.linux', fn ($val) => PHP_OS_FAMILY === 'Windows' ? $val === null : is_string($val) && $val !== '')
            );

        // Simpan ulang dengan secret kosong -> rahasia lama wajib tetap dipertahankan
        $this->actingAs($bendahara)->post(route('backup.auto-settings.update'), [
            'is_enabled' => true,
            'frequency' => BackupSetting::FREQUENCY_DAILY,
            'scheduled_time' => '21:30',
            'day_of_week' => 5,
            'day_of_month' => 1,
            'retention_enabled' => true,
            'retention_max_files' => 7,
            'retention_max_days' => null,
            'sync_mode' => BackupSetting::SYNC_GOOGLE_DRIVE_API,
            'local_sync_path' => '',
            'sync_apply_retention' => true,
            'gdrive_folder_id' => 'folder_abc_123',
            'gdrive_client_id' => 'client_id_xyz.apps.googleusercontent.com',
            'gdrive_client_secret' => '',
            'gdrive_refresh_token' => '',
        ])->assertRedirect()->assertSessionHas('success');

        $reloaded = BackupSetting::current();
        $this->assertSame('daily', $reloaded->frequency);
        $this->assertNull($reloaded->retention_max_days);
        $this->assertSame('SUPER-SECRET-CLIENT-KEY', $reloaded->gdrive_client_secret);
        $this->assertSame('SUPER-SECRET-REFRESH-TOKEN', $reloaded->gdrive_refresh_token);
    }

    public function test_non_bendahara_cannot_access_auto_backup_endpoints(): void
    {
        $kepsek = $this->createKepalaSekolah();

        $this->actingAs($kepsek)
            ->post(route('backup.auto-settings.update'), [
                'is_enabled' => true,
                'frequency' => 'daily',
                'scheduled_time' => '22:00',
                'day_of_week' => 0,
                'day_of_month' => 1,
                'retention_enabled' => true,
                'retention_max_files' => 14,
                'sync_mode' => 'none',
                'sync_apply_retention' => true,
            ])
            ->assertForbidden();

        $this->actingAs($kepsek)
            ->post(route('backup.auto-run'))
            ->assertForbidden();

        $this->actingAs($kepsek)
            ->postJson(route('backup.auto-test-sync'), [
                'sync_mode' => 'local_folder',
                'local_sync_path' => sys_get_temp_dir(),
            ])
            ->assertForbidden();
    }

    public function test_schedule_is_due_logic_for_daily_weekly_monthly_and_anti_double_run(): void
    {
        $service = app(AutoBackupService::class);
        $tz = (string) config('app.timezone', 'UTC');

        // Disabled -> selalu false
        $disabled = new BackupSetting(['is_enabled' => false, 'frequency' => 'daily', 'scheduled_time' => '22:00']);
        $this->assertFalse($service->isDue($disabled, Carbon::create(2026, 11, 21, 22, 5, 0, $tz)));

        // Daily: sebelum jam jadwal (last_run kemarin 22:01) -> false
        $daily = new BackupSetting([
            'is_enabled' => true,
            'frequency' => 'daily',
            'scheduled_time' => '22:00',
        ]);
        $daily->last_run_at = Carbon::create(2026, 11, 20, 22, 1, 0, $tz);
        $this->assertFalse($service->isDue($daily, Carbon::create(2026, 11, 21, 21, 59, 0, $tz)));
        // Sudah melewati jam jadwal -> true
        $this->assertTrue($service->isDue($daily, Carbon::create(2026, 11, 21, 22, 2, 0, $tz)));
        // Sudah berjalan pada slot hari ini -> false (anti double-run)
        $daily->last_run_at = Carbon::create(2026, 11, 21, 22, 0, 30, $tz);
        $this->assertFalse($service->isDue($daily, Carbon::create(2026, 11, 21, 23, 30, 0, $tz)));

        // Weekly: setiap Minggu (day_of_week = 0) jam 20:00
        // 2026-11-22 adalah Minggu
        $weekly = new BackupSetting([
            'is_enabled' => true,
            'frequency' => 'weekly',
            'scheduled_time' => '20:00',
            'day_of_week' => 0,
        ]);
        $weekly->last_run_at = Carbon::create(2026, 11, 15, 20, 5, 0, $tz);
        $this->assertFalse($service->isDue($weekly, Carbon::create(2026, 11, 22, 19, 30, 0, $tz)));
        $this->assertTrue($service->isDue($weekly, Carbon::create(2026, 11, 22, 20, 10, 0, $tz)));
        $weekly->last_run_at = Carbon::create(2026, 11, 22, 20, 12, 0, $tz);
        $this->assertFalse($service->isDue($weekly, Carbon::create(2026, 11, 24, 10, 0, 0, $tz)));

        // Monthly: setiap tanggal 15 jam 08:00
        $monthly = new BackupSetting([
            'is_enabled' => true,
            'frequency' => 'monthly',
            'scheduled_time' => '08:00',
            'day_of_month' => 15,
        ]);
        $monthly->last_run_at = Carbon::create(2026, 10, 15, 8, 5, 0, $tz);
        $this->assertFalse($service->isDue($monthly, Carbon::create(2026, 11, 15, 7, 55, 0, $tz)));
        $this->assertTrue($service->isDue($monthly, Carbon::create(2026, 11, 15, 8, 5, 0, $tz)));
        $monthly->last_run_at = Carbon::create(2026, 11, 15, 8, 6, 0, $tz);
        $this->assertFalse($service->isDue($monthly, Carbon::create(2026, 11, 28, 12, 0, 0, $tz)));
    }

    public function test_apply_retention_prunes_only_auto_backups_and_never_touches_manual_files(): void
    {
        $service = app(AutoBackupService::class);
        $tempDir = $this->makeTempDir('sikas_retention');

        try {
            $nowTs = time();
            $autoFiles = [
                'auto_backup_2026-10-01_00-00-00.rsv' => $nowTs - (50 * 86400),
                'auto_backup_2026-10-10_00-00-00.rsv' => $nowTs - (40 * 86400),
                'auto_backup_2026-11-10_00-00-00.rsv' => $nowTs - (10 * 86400),
                'auto_backup_2026-11-19_00-00-00.rsv' => $nowTs - (2 * 86400),
                'auto_backup_2026-11-21_00-00-00.rsv' => $nowTs - 60,
            ];
            $manualFiles = [
                'backup_manual_2026.rsv' => $nowTs - (90 * 86400),
                'arsip_bendahara.rsv' => $nowTs - (120 * 86400),
            ];

            foreach ($autoFiles + $manualFiles as $name => $mtime) {
                $path = $tempDir.DIRECTORY_SEPARATOR.$name;
                file_put_contents($path, 'dummy-rsv-content');
                touch($path, $mtime);
            }

            $pruned = $service->applyRetention($tempDir, 2, 30, 'auto_backup_2026-11-21_00-00-00.rsv');

            $this->assertSame(3, $pruned);
            // 3 auto-backup terlama terhapus
            $this->assertFileDoesNotExist($tempDir.DIRECTORY_SEPARATOR.'auto_backup_2026-10-01_00-00-00.rsv');
            $this->assertFileDoesNotExist($tempDir.DIRECTORY_SEPARATOR.'auto_backup_2026-10-10_00-00-00.rsv');
            $this->assertFileDoesNotExist($tempDir.DIRECTORY_SEPARATOR.'auto_backup_2026-11-10_00-00-00.rsv');
            // 2 auto-backup terbaru tetap ada
            $this->assertFileExists($tempDir.DIRECTORY_SEPARATOR.'auto_backup_2026-11-19_00-00-00.rsv');
            $this->assertFileExists($tempDir.DIRECTORY_SEPARATOR.'auto_backup_2026-11-21_00-00-00.rsv');
            // Kedua backup manual 100% utuh walau berumur > 90 hari!
            $this->assertFileExists($tempDir.DIRECTORY_SEPARATOR.'backup_manual_2026.rsv');
            $this->assertFileExists($tempDir.DIRECTORY_SEPARATOR.'arsip_bendahara.rsv');
        } finally {
            $this->removeDir($tempDir);
        }
    }

    public function test_local_folder_sync_and_target_retention(): void
    {
        $sourceDir = $this->makeTempDir('sikas_src');
        $targetDir = $this->makeTempDir('sikas_dst');

        try {
            // Buat 2 auto-backup lama + 1 manual di folder tujuan
            $oldAuto1 = $targetDir.DIRECTORY_SEPARATOR.'auto_backup_old_1.rsv';
            $oldAuto2 = $targetDir.DIRECTORY_SEPARATOR.'auto_backup_old_2.rsv';
            $manualDst = $targetDir.DIRECTORY_SEPARATOR.'manual_keep.rsv';
            file_put_contents($oldAuto1, 'old1');
            file_put_contents($oldAuto2, 'old2');
            file_put_contents($manualDst, 'manual');
            touch($oldAuto1, time() - 300);
            touch($oldAuto2, time() - 200);
            touch($manualDst, time() - 999999);

            BackupSetting::query()->create([
                'is_enabled' => true,
                'frequency' => 'daily',
                'scheduled_time' => '22:00',
                'retention_enabled' => true,
                'retention_max_files' => 2,
                'retention_max_days' => null,
                'sync_mode' => BackupSetting::SYNC_LOCAL_FOLDER,
                'local_sync_path' => $targetDir,
                'sync_apply_retention' => true,
            ]);

            $service = app(AutoBackupService::class);
            $result = $service->execute('manual_auto', true, function (string $prefix) use ($sourceDir): array {
                $fileName = $prefix.'_2026-11-21_22-00-00.rsv';
                $fullPath = $sourceDir.DIRECTORY_SEPARATOR.$fileName;
                file_put_contents($fullPath, 'payload-all-in-one-rsv');

                return [
                    'success' => true,
                    'file_name' => $fileName,
                    'full_path' => $fullPath,
                    'message' => 'OK',
                ];
            });

            $this->assertTrue($result['success']);
            $this->assertSame(BackupRun::STATUS_SUCCESS, $result['status']);
            $this->assertFileExists($targetDir.DIRECTORY_SEPARATOR.'auto_backup_2026-11-21_22-00-00.rsv');
            $this->assertFileExists($oldAuto2);
            $this->assertFileDoesNotExist($oldAuto1);
            $this->assertFileExists($manualDst);

            $run = BackupRun::query()->latest('id')->first();
            $this->assertNotNull($run);
            $this->assertSame('success', $run->status);
            $this->assertSame('success', $run->sync_status);
        } finally {
            $this->removeDir($sourceDir);
            $this->removeDir($targetDir);
        }
    }

    public function test_google_drive_api_test_connection_upload_success_and_partial_failure(): void
    {
        $sourceDir = $this->makeTempDir('sikas_gdrive');
        $bendahara = $this->createBendahara();

        try {
            // 1. Uji koneksi Google Drive API sukses via endpoint controller
            Http::fake([
                'https://oauth2.googleapis.com/token' => Http::response([
                    'access_token' => 'fake_access_token_123',
                    'expires_in' => 3600,
                ], 200),
                'https://www.googleapis.com/drive/v3/files/folder_xyz*' => Http::response([
                    'id' => 'folder_xyz',
                    'name' => 'Arsip Backup SIKAS',
                    'mimeType' => 'application/vnd.google-apps.folder',
                    'trashed' => false,
                ], 200),
                'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true' => Http::response('', 200, [
                    'Location' => 'https://www.googleapis.com/upload/drive/v3/files?upload_id=abc',
                ]),
                'https://www.googleapis.com/upload/drive/v3/files?upload_id=abc' => Http::response([
                    'id' => 'uploaded_file_999',
                    'name' => 'auto_backup_2026-11-21_22-00-00.rsv',
                ], 200),
            ]);

            // 1. Uji koneksi Google Drive API sukses via endpoint controller
            $this->actingAs($bendahara)
                ->postJson(route('backup.auto-test-sync'), [
                    'sync_mode' => BackupSetting::SYNC_GOOGLE_DRIVE_API,
                    'gdrive_folder_id' => 'folder_xyz',
                    'gdrive_client_id' => 'cid',
                    'gdrive_client_secret' => 'csec',
                    'gdrive_refresh_token' => 'rtok',
                ])
                ->assertOk()
                ->assertJson([
                    'success' => true,
                    'folder_name' => 'Arsip Backup SIKAS',
                ]);

            Http::assertSent(fn (HttpClientRequest $req) => $req->url() === 'https://oauth2.googleapis.com/token'
                && ($req->data()['grant_type'] ?? null) === 'refresh_token'
            );

            // 2. Jalankan execute() dengan Google Drive sukses (resumable upload PUT ke Location)
            BackupSetting::query()->create([
                'is_enabled' => true,
                'frequency' => 'daily',
                'scheduled_time' => '22:00',
                'retention_enabled' => true,
                'retention_max_files' => 14,
                'sync_mode' => BackupSetting::SYNC_GOOGLE_DRIVE_API,
                'gdrive_folder_id' => 'folder_xyz',
                'gdrive_client_id' => 'cid',
                'gdrive_client_secret' => 'csec',
                'gdrive_refresh_token' => 'rtok',
            ]);

            $service = app(AutoBackupService::class);
            $okRes = $service->execute('scheduled', true, function (string $prefix) use ($sourceDir): array {
                $fileName = $prefix.'_2026-11-21_22-00-00.rsv';
                $fullPath = $sourceDir.DIRECTORY_SEPARATOR.$fileName;
                file_put_contents($fullPath, 'binary-backup-payload');

                return [
                    'success' => true,
                    'file_name' => $fileName,
                    'full_path' => $fullPath,
                    'message' => 'OK',
                ];
            });

            $this->assertTrue($okRes['success']);
            $this->assertSame(BackupRun::STATUS_SUCCESS, $okRes['status']);
            $this->assertSame('success', $okRes['run']->sync_status);

            Http::assertSent(fn (HttpClientRequest $req) => $req->method() === 'PUT'
                && str_contains($req->url(), 'upload_id=abc')
                && $req->hasHeader('Content-Range', 'bytes 0-20/21')
            );
        } finally {
            $this->removeDir($sourceDir);
        }
    }

    public function test_google_drive_api_upload_failure_marks_run_partial_and_keeps_local_file(): void
    {
        $sourceDir = $this->makeTempDir('sikas_gdrive_fail');

        try {
            Http::fake([
                'https://oauth2.googleapis.com/token' => Http::response([
                    'error' => 'invalid_grant',
                    'error_description' => 'Token has been expired or revoked.',
                ], 400),
            ]);

            BackupSetting::query()->create([
                'is_enabled' => true,
                'frequency' => 'daily',
                'scheduled_time' => '22:00',
                'retention_enabled' => true,
                'retention_max_files' => 14,
                'sync_mode' => BackupSetting::SYNC_GOOGLE_DRIVE_API,
                'gdrive_folder_id' => 'folder_xyz',
                'gdrive_client_id' => 'cid',
                'gdrive_client_secret' => 'csec',
                'gdrive_refresh_token' => 'rtok',
            ]);

            $service = app(AutoBackupService::class);
            $partialRes = $service->execute('scheduled', true, function (string $prefix) use ($sourceDir): array {
                $fileName = $prefix.'_2026-11-21_23-00-00.rsv';
                $fullPath = $sourceDir.DIRECTORY_SEPARATOR.$fileName;
                file_put_contents($fullPath, 'binary-backup-payload-2');

                return [
                    'success' => true,
                    'file_name' => $fileName,
                    'full_path' => $fullPath,
                    'message' => 'OK',
                ];
            });

            $this->assertTrue($partialRes['success']);
            $this->assertSame(BackupRun::STATUS_PARTIAL, $partialRes['status']);
            $this->assertSame('failed', $partialRes['run']->sync_status);
            $this->assertFileExists($sourceDir.DIRECTORY_SEPARATOR.'auto_backup_2026-11-21_23-00-00.rsv');
        } finally {
            $this->removeDir($sourceDir);
        }
    }

    public function test_audit_trail_automatically_redacts_gdrive_secrets_on_settings_update(): void
    {
        $bendahara = $this->createBendahara();

        $this->actingAs($bendahara)
            ->post(route('backup.auto-settings.update'), [
                'is_enabled' => true,
                'frequency' => 'daily',
                'scheduled_time' => '22:00',
                'day_of_week' => 0,
                'day_of_month' => 1,
                'retention_enabled' => true,
                'retention_max_files' => 14,
                'retention_max_days' => 30,
                'sync_mode' => BackupSetting::SYNC_GOOGLE_DRIVE_API,
                'local_sync_path' => '',
                'sync_apply_retention' => true,
                'gdrive_folder_id' => 'folder_audit_1',
                'gdrive_client_id' => 'client_audit_1',
                'gdrive_client_secret' => 'TOP-SECRET-VALUE-999',
                'gdrive_refresh_token' => 'TOP-REFRESH-TOKEN-888',
            ])
            ->assertRedirect();

        $log = ActivityLog::query()
            ->where('route_name', 'backup.auto-settings.update')
            ->latest('id')
            ->first();

        $this->assertNotNull($log);
        $this->assertSame('backup', $log->module);
        $this->assertSame(ActivityLog::SEVERITY_WARNING, $log->severity);
        $this->assertSame('[DISENSOR]', $log->metadata['payload']['gdrive_client_secret'] ?? null);
        $this->assertSame('[DISENSOR]', $log->metadata['payload']['gdrive_refresh_token'] ?? null);
        $this->assertStringNotContainsString('TOP-SECRET-VALUE-999', json_encode($log->metadata));
        $this->assertStringNotContainsString('TOP-REFRESH-TOKEN-888', json_encode($log->metadata));
    }

    public function test_artisan_command_skips_when_not_due(): void
    {
        BackupSetting::query()->create([
            'is_enabled' => false,
            'frequency' => 'daily',
            'scheduled_time' => '22:00',
        ]);

        $this->artisan('backup:auto-run')
            ->expectsOutputToContain('belum jatuh tempo')
            ->assertSuccessful();
    }

    public function test_local_sync_path_rejects_webroot_storage_relative_and_unc_paths(): void
    {
        $service = app(AutoBackupService::class);

        $this->assertFalse($service->validateLocalSyncFolder('\\\\attacker-host\\share')['success']);
        $this->assertFalse($service->validateLocalSyncFolder('storage/app')['success']);
        $this->assertFalse($service->validateLocalSyncFolder(public_path())['success']);
        $this->assertFalse($service->validateLocalSyncFolder(storage_path('app/public'))['success']);
        $this->assertFalse($service->validateLocalSyncFolder(storage_path('app/backups'))['success']);
        $this->assertFalse($service->validateLocalSyncFolder(base_path())['success']);
    }

    public function test_gdrive_upload_rejects_untrusted_location_host(): void
    {
        $tempDir = $this->makeTempDir('sikas_gdrive_host');

        try {
            $file = $tempDir.DIRECTORY_SEPARATOR.'auto_backup_test.rsv';
            file_put_contents($file, 'backup-bytes-data');

            Http::fake([
                'https://oauth2.googleapis.com/token' => Http::response(['access_token' => 'tok'], 200),
                'https://www.googleapis.com/upload/drive/v3/files*' => Http::response('', 200, [
                    'Location' => 'https://evil.example.com/steal-token',
                ]),
            ]);

            $drive = app(GoogleDriveSyncService::class);
            $evilRes = $drive->uploadFile($file, 'auto_backup_test.rsv', 'cid', 'csec', 'rtok', 'folder_xyz');
            $this->assertFalse($evilRes['success']);
        } finally {
            $this->removeDir($tempDir);
        }
    }

    public function test_gdrive_upload_rejects_terminal_308_without_completion(): void
    {
        $tempDir = $this->makeTempDir('sikas_gdrive_308');

        try {
            $file = $tempDir.DIRECTORY_SEPARATOR.'auto_backup_test.rsv';
            file_put_contents($file, 'backup-bytes-data');

            Http::fake([
                'https://oauth2.googleapis.com/token' => Http::response(['access_token' => 'tok'], 200),
                'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true' => Http::response('', 200, [
                    'Location' => 'https://www.googleapis.com/upload/drive/v3/files?upload_id=incomplete',
                ]),
                'https://www.googleapis.com/upload/drive/v3/files?upload_id=incomplete' => Http::response('', 308),
            ]);

            $drive = app(GoogleDriveSyncService::class);
            $incompleteRes = $drive->uploadFile($file, 'auto_backup_test.rsv', 'cid', 'csec', 'rtok', 'folder_xyz');
            $this->assertFalse($incompleteRes['success']);
        } finally {
            $this->removeDir($tempDir);
        }
    }

    public function test_newly_enabled_schedule_waits_for_next_slot_and_max_days_only_retention_works(): void
    {
        $service = app(AutoBackupService::class);
        $tz = (string) config('app.timezone', 'UTC');

        // Baru diaktifkan pukul 09:00 untuk jadwal harian 22:00 -> tidak langsung jalan pukul 09:01
        $newlyEnabled = new BackupSetting([
            'is_enabled' => true,
            'frequency' => 'daily',
            'scheduled_time' => '22:00',
        ]);
        $newlyEnabled->updated_at = Carbon::create(2026, 11, 21, 9, 0, 0, $tz);
        $this->assertFalse($service->isDue($newlyEnabled, Carbon::create(2026, 11, 21, 9, 1, 0, $tz)));
        // Saat jam 22:01 hari yang sama -> jatuh tempo
        $this->assertTrue($service->isDue($newlyEnabled, Carbon::create(2026, 11, 21, 22, 1, 0, $tz)));

        // Retensi berbasis umur (max_files besar = 100, max_days = 30)
        $tempDir = $this->makeTempDir('sikas_age_only');
        try {
            $nowTs = time();
            $oldAuto = $tempDir.DIRECTORY_SEPARATOR.'auto_backup_old.rsv';
            $freshAuto = $tempDir.DIRECTORY_SEPARATOR.'auto_backup_fresh.rsv';
            file_put_contents($oldAuto, 'old');
            file_put_contents($freshAuto, 'fresh');
            touch($oldAuto, $nowTs - (45 * 86400));
            touch($freshAuto, $nowTs - 60);

            $pruned = $service->applyRetention($tempDir, 100, 30, 'auto_backup_fresh.rsv');
            $this->assertSame(1, $pruned);
            $this->assertFileDoesNotExist($oldAuto);
            $this->assertFileExists($freshAuto);
        } finally {
            $this->removeDir($tempDir);
        }
    }

    public function test_manual_backup_cannot_use_auto_backup_prefix_and_clear_gdrive_secrets_works(): void
    {
        $bendahara = $this->createBendahara();

        $this->actingAs($bendahara)
            ->post(route('backup.create'), ['backup_name' => 'auto_backup_manual'])
            ->assertSessionHasErrors('backup_name');

        // Simpan rahasia lalu hapus saat beralih ke mode none
        BackupSetting::query()->create([
            'sync_mode' => BackupSetting::SYNC_GOOGLE_DRIVE_API,
            'gdrive_folder_id' => 'folder_12345',
            'gdrive_client_id' => 'client_123',
            'gdrive_client_secret' => 'sec_abc',
            'gdrive_refresh_token' => 'tok_xyz',
        ]);

        $this->actingAs($bendahara)
            ->post(route('backup.auto-settings.update'), [
                'is_enabled' => false,
                'frequency' => 'daily',
                'scheduled_time' => '22:00',
                'day_of_week' => 0,
                'day_of_month' => 1,
                'retention_enabled' => true,
                'retention_max_files' => 14,
                'sync_mode' => BackupSetting::SYNC_NONE,
                'sync_apply_retention' => true,
                'clear_gdrive_secrets' => true,
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $reloaded = BackupSetting::current();
        $this->assertNull($reloaded->gdrive_client_secret);
        $this->assertNull($reloaded->gdrive_refresh_token);
    }

    public function test_custom_role_rbac_enforces_backup_read_vs_write(): void
    {
        $this->withoutVite();

        Role::query()->create([
            'slug' => 'auditor_backup_read',
            'name' => 'Auditor Backup Read',
            'permissions' => [
                'modules' => ['backup' => 'read'],
                'abilities' => [],
            ],
        ]);
        Role::query()->create([
            'slug' => 'operator_backup_write',
            'name' => 'Operator Backup Write',
            'permissions' => [
                'modules' => ['backup' => 'write'],
                'abilities' => [],
            ],
        ]);

        $reader = User::factory()->create([
            'role' => 'auditor_backup_read',
            'username' => 'auditor_read',
            'email' => 'auditor_read@example.test',
        ]);
        $writer = User::factory()->create([
            'role' => 'operator_backup_write',
            'username' => 'operator_write',
            'email' => 'operator_write@example.test',
        ]);

        // Read-only boleh buka halaman backup, tapi tidak mendapat schedulerCommands & diblokir saat POST
        $this->actingAs($reader)
            ->get(route('backup.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('canWriteBackup', false)
                ->where('schedulerCommands', null)
            );

        $this->actingAs($reader)
            ->post(route('backup.auto-settings.update'), [
                'is_enabled' => false,
                'frequency' => 'daily',
                'scheduled_time' => '22:00',
                'day_of_week' => 0,
                'day_of_month' => 1,
                'retention_enabled' => true,
                'retention_max_files' => 14,
                'sync_mode' => 'none',
                'sync_apply_retention' => true,
            ])
            ->assertForbidden();

        // Custom role dengan backup: write diizinkan menyimpan pengaturan
        $this->actingAs($writer)
            ->post(route('backup.auto-settings.update'), [
                'is_enabled' => false,
                'frequency' => 'daily',
                'scheduled_time' => '22:00',
                'day_of_week' => 0,
                'day_of_month' => 1,
                'retention_enabled' => true,
                'retention_max_files' => 14,
                'sync_mode' => 'none',
                'sync_apply_retention' => true,
            ])
            ->assertRedirect()
            ->assertSessionHas('success');
    }

    public function test_offline_cloud_failure_queues_pending_retry_and_auto_retries_on_reconnect(): void
    {
        $sourceDir = $this->makeTempDir('sikas_offline_retry');

        try {
            $setting = BackupSetting::query()->create([
                'is_enabled' => true,
                'frequency' => 'daily',
                'scheduled_time' => '22:00',
                'retention_enabled' => true,
                'retention_max_files' => 1,
                'sync_mode' => BackupSetting::SYNC_GOOGLE_DRIVE_API,
                'gdrive_folder_id' => 'folder_xyz',
                'gdrive_client_id' => 'cid',
                'gdrive_client_secret' => 'csec',
                'gdrive_refresh_token' => 'rtok',
            ]);

            $fileName = 'auto_backup_2026-11-21_22-00-00.rsv';
            $fullPath = $sourceDir.DIRECTORY_SEPARATOR.$fileName;
            $service = app(AutoBackupService::class);

            // 1. Eksekusi saat offline (clientOnline=false) -> langsung antre pending_cloud_* tanpa hang HTTP
            $offlineRes = $service->execute(
                'scheduled',
                true,
                function () use ($fileName, $fullPath): array {
                    file_put_contents($fullPath, 'offline-backup-payload');

                    return [
                        'success' => true,
                        'file_name' => $fileName,
                        'full_path' => $fullPath,
                        'message' => 'OK',
                    ];
                },
                null,
                null,
                false,
            );

            $this->assertTrue($offlineRes['success']);
            $this->assertSame(BackupRun::STATUS_PARTIAL, $offlineRes['status']);

            $setting->refresh();
            $this->assertSame($fileName, $setting->pending_cloud_file);
            $this->assertSame($fullPath, $setting->pending_cloud_path);
            $this->assertSame($offlineRes['run']->id, $setting->pending_cloud_run_id);
            $this->assertNotNull($setting->pending_cloud_retry_at);

            // Verifikasi pending_cloud_path tidak bocor ke frontend
            $safe = $setting->toSafeFrontendArray();
            $this->assertTrue($safe['has_pending_cloud_sync']);
            $this->assertSame($fileName, $safe['pending_cloud_file']);
            $this->assertArrayNotHasKey('pending_cloud_path', $safe);

            // Pastikan retensi melindungi berkas pending_cloud_file (meski bukan file terbaru & max_files=1)
            $newerFile = $sourceDir.DIRECTORY_SEPARATOR.'auto_backup_2026-11-22_22-00-00.rsv';
            file_put_contents($newerFile, 'newer');
            touch($fullPath, time() - 500);
            touch($newerFile, time() - 10);
            $pruned = $service->applyRetention($sourceDir, 1, null, [basename($newerFile), $fileName]);
            $this->assertSame(0, $pruned);
            $this->assertFileExists($fullPath);

            // 2. Saat cooldown selesai dan internet kembali online -> retry sukses & status BackupRun berubah ke success
            $setting->forceFill(['pending_cloud_retry_at' => now()->subMinute()])->save();

            Http::fake([
                'https://oauth2.googleapis.com/token' => Http::response(['access_token' => 'tok_ok'], 200),
                'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true' => Http::response('', 200, [
                    'Location' => 'https://www.googleapis.com/upload/drive/v3/files?upload_id=retry_1',
                ]),
                'https://www.googleapis.com/upload/drive/v3/files?upload_id=retry_1' => Http::response([
                    'id' => 'retried_file_123',
                ], 200),
            ]);

            $bendahara = $this->createBendahara();
            $retryRes = $service->handleHeartbeat(true, $bendahara, null, false, null, $sourceDir);
            $this->assertSame('retry_cloud', $retryRes['action']);
            $this->assertTrue($retryRes['success']);

            $run = BackupRun::query()->find($offlineRes['run']->id);
            $setting->refresh();
            $this->assertSame(BackupRun::STATUS_SUCCESS, $run->status);
            $this->assertSame('success', $run->sync_status);
            $this->assertNull($setting->pending_cloud_file);
            $this->assertSame(BackupRun::STATUS_SUCCESS, $setting->last_run_status);

            // 3. Heartbeat setelah tidak ada tugas -> idle
            $this->actingAs($bendahara)
                ->postJson(route('backup.auto-heartbeat'), ['online' => true])
                ->assertOk()
                ->assertJson(['action' => 'idle', 'success' => true]);
        } finally {
            $this->removeDir($sourceDir);
        }
    }

    public function test_heartbeat_executes_due_backup_and_retry_rejects_arbitrary_file_path(): void
    {
        $sourceDir = $this->makeTempDir('sikas_hb_due');

        try {
            $setting = BackupSetting::query()->create([
                'is_enabled' => true,
                'frequency' => 'daily',
                'scheduled_time' => '00:01',
                'retention_enabled' => true,
                'retention_max_files' => 14,
                'sync_mode' => BackupSetting::SYNC_NONE,
            ]);
            // Simulasikan sudah lama diaktifkan & belum pernah jalan -> jatuh tempo
            $setting->forceFill([
                'updated_at' => now()->subDays(2),
                'last_run_at' => null,
            ])->save();

            $service = app(AutoBackupService::class);
            $hbRes = $service->handleHeartbeat(true, null, null, false, function (string $prefix) use ($sourceDir): array {
                $name = $prefix.'_hb_due.rsv';
                $path = $sourceDir.DIRECTORY_SEPARATOR.$name;
                file_put_contents($path, 'hb-payload');

                return ['success' => true, 'file_name' => $name, 'full_path' => $path, 'message' => 'OK'];
            });

            $this->assertSame('backup', $hbRes['action']);
            $this->assertTrue($hbRes['success']);

            // Uji keamanan: pending_cloud_path yang menunjuk file di luar folder backup resmi (mis. base_path('.env') / composer.json) WAJIB ditolak
            $setting->forceFill([
                'sync_mode' => BackupSetting::SYNC_GOOGLE_DRIVE_API,
                'gdrive_folder_id' => 'folder_sec_1',
                'gdrive_client_id' => 'cid',
                'gdrive_client_secret' => 'csec',
                'gdrive_refresh_token' => 'rtok',
                'pending_cloud_file' => 'auto_backup_fake.rsv',
                'pending_cloud_path' => base_path('composer.json'),
                'pending_cloud_retry_at' => now()->subMinute(),
            ])->save();

            $blocked = $service->retryPendingCloudSync(true);
            $this->assertFalse($blocked['success']);
            $setting->refresh();
            $this->assertNull($setting->pending_cloud_file);
        } finally {
            $this->removeDir($sourceDir);
        }
    }

    public function test_cloud_mode_also_copies_to_optional_local_folder_and_heartbeat_rbac(): void
    {
        $sourceDir = $this->makeTempDir('sikas_dual_src');
        $targetDir = $this->makeTempDir('sikas_dual_dst');

        try {
            Http::fake([
                'https://oauth2.googleapis.com/token' => Http::response(['access_token' => 'tok_dual'], 200),
                'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true' => Http::response('', 200, [
                    'Location' => 'https://www.googleapis.com/upload/drive/v3/files?upload_id=dual_1',
                ]),
                'https://www.googleapis.com/upload/drive/v3/files?upload_id=dual_1' => Http::response([
                    'id' => 'dual_cloud_id',
                ], 200),
            ]);

            BackupSetting::query()->create([
                'is_enabled' => true,
                'frequency' => 'daily',
                'scheduled_time' => '22:00',
                'retention_enabled' => true,
                'retention_max_files' => 14,
                'sync_mode' => BackupSetting::SYNC_GOOGLE_DRIVE_API,
                'local_sync_path' => $targetDir,
                'sync_apply_retention' => true,
                'gdrive_folder_id' => 'folder_dual_1',
                'gdrive_client_id' => 'cid',
                'gdrive_client_secret' => 'csec',
                'gdrive_refresh_token' => 'rtok',
            ]);

            $service = app(AutoBackupService::class);
            $res = $service->execute('manual_auto', true, function (string $prefix) use ($sourceDir): array {
                $fileName = $prefix.'_dual_2026-11-21.rsv';
                $fullPath = $sourceDir.DIRECTORY_SEPARATOR.$fileName;
                file_put_contents($fullPath, 'dual-payload');

                return [
                    'success' => true,
                    'file_name' => $fileName,
                    'full_path' => $fullPath,
                    'message' => 'OK',
                ];
            });

            $this->assertTrue($res['success']);
            $this->assertSame(BackupRun::STATUS_SUCCESS, $res['status']);
            $this->assertFileExists($targetDir.DIRECTORY_SEPARATOR.'auto_backup_dual_2026-11-21.rsv');

            // Kepala Sekolah tidak boleh memicu heartbeat
            $kepsek = $this->createKepalaSekolah();
            $this->actingAs($kepsek)
                ->postJson(route('backup.auto-heartbeat'), ['online' => true])
                ->assertForbidden();
        } finally {
            $this->removeDir($sourceDir);
            $this->removeDir($targetDir);
        }
    }

    public function test_folder_browser_and_create_folder_enforce_security_and_rbac(): void
    {
        $tempDir = $this->makeTempDir('sikas_browse');
        $bendahara = $this->createBendahara();

        Role::query()->create([
            'slug' => 'browse_reader_only',
            'name' => 'Browse Reader Only',
            'permissions' => [
                'modules' => ['backup' => 'read'],
                'abilities' => [],
            ],
        ]);
        $reader = User::factory()->create([
            'role' => 'browse_reader_only',
            'username' => 'browse_reader',
            'email' => 'browse_reader@example.test',
        ]);

        try {
            // Read-only diblokir dari browsing filesystem server
            $this->actingAs($reader)
                ->getJson(route('backup.browse-folders', ['path' => $tempDir]))
                ->assertForbidden();

            // Bendahara dapat menjelajah & membuat sub-folder aman
            $this->actingAs($bendahara)
                ->getJson(route('backup.browse-folders', ['path' => $tempDir]))
                ->assertOk()
                ->assertJson([
                    'success' => true,
                    'selectable' => true,
                ]);

            $this->actingAs($bendahara)
                ->postJson(route('backup.create-folder'), [
                    'parent_path' => $tempDir,
                    'folder_name' => 'Backup-SIKAS-2026',
                ])
                ->assertOk()
                ->assertJson(['success' => true]);

            $this->assertDirectoryExists($tempDir.DIRECTORY_SEPARATOR.'Backup-SIKAS-2026');

            // Tolak nama berbahaya, nama reserved Windows, titik tunggal, & direktori terlarang (webroot/storage/UNC/relatif)
            foreach (['../evil', '.', 'CON', 'NUL.bak', 'Backup.'] as $badName) {
                $this->actingAs($bendahara)
                    ->postJson(route('backup.create-folder'), [
                        'parent_path' => $tempDir,
                        'folder_name' => $badName,
                    ])
                    ->assertStatus(422);
            }

            $this->actingAs($bendahara)
                ->getJson(route('backup.browse-folders', ['path' => public_path()]))
                ->assertOk()
                ->assertJson([
                    'selectable' => false,
                    'can_create_subfolder' => false,
                    'folders' => [],
                ]);

            $this->actingAs($bendahara)
                ->getJson(route('backup.browse-folders', ['path' => 'storage']))
                ->assertStatus(422);

            $this->actingAs($bendahara)
                ->getJson(route('backup.browse-folders', ['path' => '\\\\attacker\\share']))
                ->assertStatus(422);
        } finally {
            $this->removeDir($tempDir);
        }
    }

    public function test_windows_task_scheduler_builds_dynamic_silent_vbs_and_rejects_injection(): void
    {
        $service = app(WindowsTaskSchedulerService::class);
        $vbs = $service->buildSilentVbsContent('D:\\Apps\\SIKAS App\\php\\php.exe', 'D:\\Apps\\SIKAS App\\artisan');

        $this->assertStringContainsString('CreateObject("WScript.Shell")', $vbs);
        $this->assertStringContainsString('D:\\Apps\\SIKAS App\\php\\php.exe', $vbs);
        $this->assertStringContainsString('D:\\Apps\\SIKAS App\\artisan', $vbs);
        $this->assertStringContainsString('schedule:run", 0, False', $vbs);

        // Karakter injeksi (\r\n, %, ", &) wajib ditolak
        foreach (["C:\\php.exe\r\nMsgBox 1", 'C:\\%TEMP%\\php.exe', 'C:\\"evil"\\php.exe', 'C:\\a&b\\php.exe'] as $evilPath) {
            try {
                $service->buildSilentVbsContent($evilPath, 'C:\\app\\artisan');
                $this->fail("Seharusnya menolak path berbahaya: {$evilPath}");
            } catch (\InvalidArgumentException) {
                $this->assertTrue(true);
            }
        }
    }

    public function test_sync_mode_none_never_persists_unvalidated_local_sync_path(): void
    {
        $bendahara = $this->createBendahara();

        $this->actingAs($bendahara)
            ->post(route('backup.auto-settings.update'), [
                'is_enabled' => false,
                'frequency' => 'daily',
                'scheduled_time' => '22:00',
                'day_of_week' => 0,
                'day_of_month' => 1,
                'retention_enabled' => true,
                'retention_max_files' => 14,
                'sync_mode' => BackupSetting::SYNC_NONE,
                'local_sync_path' => public_path(),
                'sync_apply_retention' => true,
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertNull(BackupSetting::current()->local_sync_path);
    }
}
