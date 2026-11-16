<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\SystemUpdaterService;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
}
