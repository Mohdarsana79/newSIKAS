<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\SystemUpdaterService;
use GuzzleHttp\Psr7\Response as Psr7Response;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SystemUpdateTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $cacheFile = storage_path('app/temp/update_check_cache.json');
        if (file_exists($cacheFile)) {
            @unlink($cacheFile);
        }
    }

    public function test_bendahara_can_access_system_update_page(): void
    {
        Http::fake([
            'api.github.com/*' => Http::response([
                'tag_name' => 'v2026.29',
                'name' => 'newSIKAS 2026.29',
                'body' => 'Rilis stabil.',
                'published_at' => '2026-11-15T10:00:00Z',
                'assets' => [],
            ], 200),
        ]);

        $bendahara = User::factory()->create(['role' => 'bendahara']);

        $response = $this->actingAs($bendahara)->get(route('system-update.index'));

        $response->assertStatus(200);
    }

    public function test_kepala_sekolah_cannot_access_system_update_page_or_actions(): void
    {
        $kepalaSekolah = User::factory()->create(['role' => 'kepala_sekolah']);

        $this->actingAs($kepalaSekolah)
            ->get(route('system-update.index'))
            ->assertStatus(403);

        $this->actingAs($kepalaSekolah)
            ->postJson(route('system-update.check'))
            ->assertStatus(403);
    }

    public function test_check_update_detects_newer_github_release_and_updates_shared_cache(): void
    {
        Http::fake([
            'api.github.com/*' => Http::response([
                'tag_name' => 'v2099.10',
                'name' => 'newSIKAS 2099.10',
                'body' => "- Penambahan fitur pembaharuan otomatis\n- Perbaikan laporan BKU",
                'published_at' => '2026-11-15T12:00:00Z',
                'assets' => [
                    [
                        'name' => 'newSIKAS_Installer_2099_10.exe',
                        'size' => 157286400,
                        'url' => 'https://api.github.com/repos/Mohdarsana79/newSIKAS/releases/assets/12345',
                        'browser_download_url' => 'https://github.com/Mohdarsana79/newSIKAS/releases/download/v2099.10/newSIKAS_Installer_2099_10.exe',
                    ],
                ],
            ], 200),
        ]);

        $bendahara = User::factory()->create(['role' => 'bendahara']);

        $response = $this->actingAs($bendahara)->postJson(route('system-update.check'));

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('updateInfo.has_update', true)
            ->assertJsonPath('updateInfo.latest_version', '2099.10')
            ->assertJsonPath('updateInfo.asset.name', 'newSIKAS_Installer_2099_10.exe');

        $summary = app(SystemUpdaterService::class)->getSharedUpdateSummary();
        $this->assertTrue($summary['hasUpdate']);
        $this->assertSame('2099.10', $summary['latestVersion']);
    }

    public function test_check_update_prioritizes_patch_installer_when_available(): void
    {
        Http::fake([
            'api.github.com/*' => Http::response([
                'tag_name' => 'v2099.11',
                'name' => 'newSIKAS 2099.11',
                'body' => 'Rilis patch ringan.',
                'published_at' => '2026-11-17T08:00:00Z',
                'assets' => [
                    [
                        'name' => 'newSIKAS_Installer_2099_11.exe',
                        'size' => 322961408,
                        'url' => 'https://api.github.com/repos/Mohdarsana79/newSIKAS-releases/releases/assets/1001',
                        'browser_download_url' => 'https://github.com/Mohdarsana79/newSIKAS-releases/releases/download/v2099.11/newSIKAS_Installer_2099_11.exe',
                    ],
                    [
                        'name' => 'newSIKAS_Patch_2099_11.exe',
                        'size' => 18874368,
                        'url' => 'https://api.github.com/repos/Mohdarsana79/newSIKAS-releases/releases/assets/1002',
                        'browser_download_url' => 'https://github.com/Mohdarsana79/newSIKAS-releases/releases/download/v2099.11/newSIKAS_Patch_2099_11.exe',
                    ],
                ],
            ], 200),
        ]);

        try {
            $result = app(SystemUpdaterService::class)->fetchLatestGithubRelease();

            $this->assertSame('ok', $result['status']);
            $this->assertTrue($result['has_update']);
            $this->assertSame('2099.11', $result['latest_version']);
            $this->assertSame('newSIKAS_Patch_2099_11.exe', $result['asset']['name']);
            $this->assertSame(18874368, $result['asset']['size']);
        } finally {
            @unlink(storage_path('app/temp/update_check_cache.json'));
        }
    }

    public function test_progress_endpoint_returns_json_without_auth(): void
    {
        $service = app(SystemUpdaterService::class);
        $service->setProgress('test_upd_123', 55, 'downloading', 'Mengunduh installer...');

        $response = $this->getJson(route('system-update.progress', ['updateId' => 'test_upd_123']));

        $response->assertStatus(200)
            ->assertJsonPath('percent', 55)
            ->assertJsonPath('phase', 'downloading');

        @unlink(storage_path('app/temp/update_progress_test_upd_123.json'));
    }

    public function test_build_update_batch_script_uses_ping_nocloseapplications_and_restarts_services(): void
    {
        $service = app(SystemUpdaterService::class);
        $script = $service->buildUpdateBatchScript(
            'C:\\Temp\\newSIKAS_Update_test.exe',
            'C:\\Temp\\sikas_update_test.log',
            'C:\\Temp\\sikas_update_done_test.flag',
            'C:\\Temp\\sikas_update_failed_test.flag',
            '2099.10'
        );

        $this->assertStringContainsString('cd /d "%TEMP%"', $script);
        $this->assertStringContainsString('ping 127.0.0.1 -n 4 > NUL', $script);
        $this->assertStringNotContainsString('timeout /t', $script);
        $this->assertStringContainsString('/NOCLOSEAPPLICATIONS', $script);
        $this->assertStringNotContainsString(' /CLOSEAPPLICATIONS', $script);
        $this->assertStringContainsString('net stop newsikas_server > NUL 2>&1', $script);
        $this->assertStringContainsString('taskkill /F /IM httpd.exe > NUL 2>&1', $script);
        $this->assertStringNotContainsString('taskkill /F /IM httpd.exe /T', $script);
        $this->assertStringContainsString('> "C:\\Temp\\sikas_update_done_test.flag" echo 2099.10', $script);
        $this->assertStringContainsString('> "C:\\Temp\\sikas_update_failed_test.flag" echo %EXIT_CODE%', $script);

        $installerPos = strpos($script, '"C:\\Temp\\newSIKAS_Update_test.exe"');
        $startDbPos = strpos($script, 'net start newsikas_DB > NUL 2>&1');
        $startApachePos = strpos($script, 'net start newsikas_server > NUL 2>&1');

        $this->assertNotFalse($installerPos);
        $this->assertNotFalse($startDbPos);
        $this->assertNotFalse($startApachePos);
        $this->assertGreaterThan($installerPos, $startDbPos);
        $this->assertGreaterThan($startDbPos, $startApachePos);
    }

    public function test_get_progress_detects_done_and_failed_flags(): void
    {
        $service = app(SystemUpdaterService::class);
        $doneId = 'test_upd_done_'.uniqid();
        $failedId = 'test_upd_fail_'.uniqid();

        try {
            $service->setProgress($doneId, 88, 'installing', 'Memasang pembaharuan...');
            file_put_contents($service->getDoneFlagPath($doneId), "2099.10\n");

            $doneProgress = $service->getProgress($doneId);
            $this->assertSame('completed', $doneProgress['phase']);
            $this->assertSame(100, $doneProgress['percent']);

            $service->setProgress($failedId, 88, 'installing', 'Memasang pembaharuan...');
            file_put_contents($service->getLogFilePath($failedId), "Line 1\nError extracting file\nInstaller aborted\n");
            file_put_contents($service->getFailedFlagPath($failedId), "5\n");

            $failedProgress = $service->getProgress($failedId);
            $this->assertSame('error', $failedProgress['phase']);
            $this->assertSame(3, $failedProgress['failed_step']);
            $this->assertStringContainsString('Kode keluar: 5', $failedProgress['message']);
            $this->assertStringContainsString('Installer aborted', $failedProgress['message']);
            $this->assertFileDoesNotExist($service->getFailedFlagPath($failedId));
        } finally {
            @unlink(storage_path("app/temp/update_progress_{$doneId}.json"));
            @unlink($service->getDoneFlagPath($doneId));
            @unlink(storage_path("app/temp/update_progress_{$failedId}.json"));
            @unlink($service->getFailedFlagPath($failedId));
            @unlink($service->getLogFilePath($failedId));
        }
    }

    public function test_download_release_asset_resumes_from_partial_file_on_retry(): void
    {
        $firstChunk = 'MZ'.str_repeat('A', 6000);
        $secondChunk = str_repeat('B', 6000);
        $expectedSize = strlen($firstChunk) + strlen($secondChunk);
        $destinationPath = storage_path('app/temp/test_resume_'.uniqid().'.exe');
        $attemptCounter = 0;
        $retryEvents = [];

        Http::fake(function ($request, $options) use (&$attemptCounter, $firstChunk, $secondChunk) {
            $attemptCounter++;

            if ($attemptCounter === 1) {
                $this->assertFalse($request->hasHeader('Range'));
                if (isset($options['on_headers'])) {
                    $options['on_headers'](new Psr7Response(200));
                }
                file_put_contents($options['sink'], $firstChunk);
                throw new ConnectionException('cURL error 56: Recv failure');
            }

            $this->assertTrue($request->hasHeader('Range'));
            $this->assertSame('bytes='.strlen($firstChunk).'-', $request->header('Range')[0]);

            return Http::response($secondChunk, 206);
        });

        try {
            $service = app(SystemUpdaterService::class);
            $service->downloadReleaseAsset(
                'https://github.com/Mohdarsana79/newSIKAS-releases/releases/download/v2099.10/newSIKAS_Installer_2099_10.exe',
                $destinationPath,
                static function () {},
                $expectedSize,
                static function (int $nextAttempt, int $maxAttempts, int $savedBytes, int $totalBytes) use (&$retryEvents): void {
                    $retryEvents[] = [$nextAttempt, $maxAttempts, $savedBytes, $totalBytes];
                }
            );

            $this->assertSame(2, $attemptCounter);
            $this->assertCount(1, $retryEvents);
            $this->assertSame([2, 6, strlen($firstChunk), $expectedSize], $retryEvents[0]);
            $this->assertFileExists($destinationPath);
            $this->assertSame($firstChunk.$secondChunk, file_get_contents($destinationPath));
            $this->assertFileDoesNotExist($destinationPath.'.part');
            $this->assertFileDoesNotExist($destinationPath.'.chunk');
        } finally {
            @unlink($destinationPath);
            @unlink($destinationPath.'.part');
            @unlink($destinationPath.'.chunk');
        }
    }

    public function test_start_online_reuses_existing_backup_file_and_returns_structured_failure_on_download_error(): void
    {
        Http::fake([
            'api.github.com/*' => Http::response([
                'tag_name' => 'v2099.10',
                'name' => 'newSIKAS 2099.10',
                'body' => 'Rilis baru.',
                'published_at' => '2026-11-16T10:00:00Z',
                'assets' => [
                    [
                        'name' => 'newSIKAS_Installer_2099_10.exe',
                        'size' => 20480,
                        'url' => 'https://api.github.com/repos/Mohdarsana79/newSIKAS-releases/releases/assets/999',
                        'browser_download_url' => 'https://github.com/Mohdarsana79/newSIKAS-releases/releases/download/v2099.10/newSIKAS_Installer_2099_10.exe',
                    ],
                ],
            ], 200),
            'github.com/*' => Http::response('Server Error', 503),
        ]);

        $backupDir = storage_path('app/backups');
        if (! is_dir($backupDir)) {
            @mkdir($backupDir, 0755, true);
        }

        $backupFileName = 'pre_update_test_'.uniqid().'.rsv';
        $backupPath = $backupDir.DIRECTORY_SEPARATOR.$backupFileName;
        file_put_contents($backupPath, 'dummy-backup-archive');
        $updateId = 'test_reuse_'.uniqid();
        $downloadedExe = storage_path('app/temp/update/newSIKAS_Installer_2099_10.exe');

        try {
            $bendahara = User::factory()->create(['role' => 'bendahara']);

            $response = $this->actingAs($bendahara)->postJson(route('system-update.start-online'), [
                'update_id' => $updateId,
                'reuse_backup_file' => $backupFileName,
            ]);

            $response->assertStatus(200)
                ->assertJsonPath('success', false)
                ->assertJsonPath('phase', 'error')
                ->assertJsonPath('failed_step', 2)
                ->assertJsonPath('backup_file', $backupFileName);
        } finally {
            @unlink($backupPath);
            @unlink(storage_path("app/temp/update_progress_{$updateId}.json"));
            @unlink($downloadedExe);
            @unlink($downloadedExe.'.part');
            @unlink($downloadedExe.'.chunk');
        }
    }
}
