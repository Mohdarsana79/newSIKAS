<?php

namespace Tests\Feature;

use App\Config\PermissionCatalog;
use App\Models\ActivityLog;
use App\Models\Role;
use App\Models\User;
use App\Services\ArkasEngineService;
use App\Services\ArkasStateStore;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class ArkasChunkUploadAndAgentTest extends TestCase
{
    use RefreshDatabase;

    private string $tempRoot;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tempRoot = storage_path('app/temp/test_arkas_suite_'.uniqid());
        @mkdir($this->tempRoot, 0755, true);

        Config::set('arkas.db_path', '');
        Config::set('arkas.upload_path', $this->tempRoot.'/uploads/arkas.db');
        Config::set('arkas.state_path', $this->tempRoot.'/uploads/state.json');
        Config::set('arkas.chunk_temp_dir', $this->tempRoot.'/chunks');
        // Gunakan fallback header SQLite agar tes berjalan cepat & deterministik di semua OS/CI
        Config::set('arkas.engine_dir', $this->tempRoot.'/missing_engine');
        Config::set('arkas.max_upload_mb', 50);
        Config::set('arkas.chunk_size_mb', 2);

        RateLimiter::clear('arkas-agent-auth:127.0.0.1');
    }

    protected function tearDown(): void
    {
        RateLimiter::clear('arkas-agent-auth:127.0.0.1');
        $this->deleteDir($this->tempRoot);

        parent::tearDown();
    }

    private function deleteDir(string $dir): void
    {
        if (! is_dir($dir)) {
            return;
        }
        foreach (scandir($dir) ?: [] as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            $path = $dir.'/'.$item;
            if (is_dir($path)) {
                $this->deleteDir($path);
            } else {
                @unlink($path);
            }
        }
        @rmdir($dir);
    }

    private function makeValidSqlitePayload(int $sizeBytes = 140000): string
    {
        $header = "SQLite format 3\0";

        return $header.str_repeat('A', max(4096, $sizeBytes - strlen($header)));
    }

    public function test_active_mode_strictly_isolates_local_and_online_sources(): void
    {
        $localDb = $this->tempRoot.'/local_manual.db';
        $uploadedDb = $this->tempRoot.'/uploads/arkas.db';
        @mkdir(dirname($uploadedDb), 0755, true);

        file_put_contents($localDb, $this->makeValidSqlitePayload(8192));
        Config::set('arkas.db_path', $localDb);

        $stateStore = app(ArkasStateStore::class);
        $engine = app(ArkasEngineService::class);

        // Mode online aktif, tetapi belum ada file unggahan -> TIDAK boleh jatuh ke path lokal server
        $stateStore->setActiveMode(ArkasStateStore::MODE_ONLINE);
        $resolvedMissing = $engine->resolveDatabaseSource();
        $this->assertSame('online', $resolvedMissing['active_mode']);
        $this->assertSame('uploaded_missing', $resolvedMissing['source']);
        $this->assertFalse($resolvedMissing['exists']);

        // Setelah file unggahan ada -> Mode online membaca file unggahan (bukan path lokal)
        file_put_contents($uploadedDb, $this->makeValidSqlitePayload(8192));
        $resolvedOnline = $engine->resolveDatabaseSource();
        $this->assertSame('online', $resolvedOnline['active_mode']);
        $this->assertSame('uploaded', $resolvedOnline['source']);
        $this->assertTrue($resolvedOnline['exists']);
        $this->assertSame(str_replace('\\', '/', $uploadedDb), $resolvedOnline['path']);

        // Pindah eksplisit ke Mode lokal -> membaca path lokal, tidak membaca unggahan
        $stateStore->setActiveMode(ArkasStateStore::MODE_LOCAL);
        $resolvedLocal = $engine->resolveDatabaseSource();
        $this->assertSame('local', $resolvedLocal['active_mode']);
        $this->assertSame('manual', $resolvedLocal['source']);
        $this->assertTrue($resolvedLocal['exists']);
        $this->assertSame(str_replace('\\', '/', $localDb), $resolvedLocal['path']);

        // Jika path lokal hilang pada Mode lokal -> tetap manual_missing (tidak jatuh ke unggahan)
        @unlink($localDb);
        $resolvedLocalMissing = $engine->resolveDatabaseSource();
        $this->assertSame('local', $resolvedLocalMissing['active_mode']);
        $this->assertSame('manual_missing', $resolvedLocalMissing['source']);
        $this->assertFalse($resolvedLocalMissing['exists']);
    }

    public function test_browser_chunked_upload_full_flow_with_retry_and_sha256_dedup(): void
    {
        $bendahara = User::factory()->create([
            'username' => 'bendahara_chunk',
            'role' => 'bendahara',
        ]);

        $payload = $this->makeValidSqlitePayload(150000);
        $totalSize = strlen($payload);
        $chunkSize = 65536; // 64 KB (minimum valid chunk size for fast test)
        $totalChunks = (int) ceil($totalSize / $chunkSize);
        $sha256 = hash('sha256', $payload);

        // Aktifkan mode online dulu
        $this->actingAs($bendahara)
            ->postJson('/arkas-tools/mode', ['mode' => 'online'])
            ->assertOk()
            ->assertJsonPath('active_mode', 'online');

        // 1. Init
        $initRes = $this->actingAs($bendahara)
            ->postJson('/arkas-tools/upload/init', [
                'filename' => 'arkas.db',
                'total_size' => $totalSize,
                'chunk_size' => $chunkSize,
                'total_chunks' => $totalChunks,
                'sha256' => $sha256,
            ])
            ->assertOk()
            ->assertJsonPath('already_up_to_date', false);

        $uploadId = (string) $initRes->json('upload_id');
        $this->assertNotEmpty($uploadId);

        // 2. Upload semua chunk (+ uji retry idempoten chunk 0 dua kali)
        for ($i = 0; $i < $totalChunks; $i++) {
            $slice = substr($payload, $i * $chunkSize, $chunkSize);
            $chunkFile = UploadedFile::fake()->createWithContent("chunk_{$i}.part", $slice);

            $this->actingAs($bendahara)
                ->post('/arkas-tools/upload/chunk', [
                    'upload_id' => $uploadId,
                    'chunk_index' => $i,
                    'chunk' => $chunkFile,
                ], ['Accept' => 'application/json'])
                ->assertOk()
                ->assertJsonPath('status', 'chunk_received');

            if ($i === 0) {
                $retryFile = UploadedFile::fake()->createWithContent('chunk_0_retry.part', $slice);
                $this->actingAs($bendahara)
                    ->post('/arkas-tools/upload/chunk', [
                        'upload_id' => $uploadId,
                        'chunk_index' => 0,
                        'chunk' => $retryFile,
                    ], ['Accept' => 'application/json'])
                    ->assertOk();
            }
        }

        // 3. Finalize
        $this->actingAs($bendahara)
            ->postJson('/arkas-tools/upload/finalize', ['upload_id' => $uploadId])
            ->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('sha256', $sha256)
            ->assertJsonPath('size_bytes', $totalSize);

        $this->assertFileExists($this->tempRoot.'/uploads/arkas.db');
        $this->assertSame($sha256, hash_file('sha256', $this->tempRoot.'/uploads/arkas.db'));

        // 4. Init ulang dengan SHA-256 yang sama -> langsung up_to_date tanpa upload ulang
        $this->actingAs($bendahara)
            ->postJson('/arkas-tools/upload/init', [
                'filename' => 'arkas.db',
                'total_size' => $totalSize,
                'chunk_size' => $chunkSize,
                'total_chunks' => $totalChunks,
                'sha256' => $sha256,
            ])
            ->assertOk()
            ->assertJsonPath('already_up_to_date', true);
    }

    public function test_chunked_upload_rejects_invalid_extension_missing_chunks_and_corrupt_payload(): void
    {
        $bendahara = User::factory()->create([
            'username' => 'bendahara_val',
            'role' => 'bendahara',
        ]);

        // Ekstensi salah
        $this->actingAs($bendahara)
            ->postJson('/arkas-tools/upload/init', [
                'filename' => 'dokumen.pdf',
                'total_size' => 100000,
                'chunk_size' => 65536,
                'total_chunks' => 2,
            ])
            ->assertStatus(422);

        // Finalize saat chunk belum lengkap
        $initRes = $this->actingAs($bendahara)
            ->postJson('/arkas-tools/upload/init', [
                'filename' => 'arkas.db',
                'total_size' => 131072,
                'chunk_size' => 65536,
                'total_chunks' => 2,
            ])
            ->assertOk();

        $uploadId = (string) $initRes->json('upload_id');
        $this->actingAs($bendahara)
            ->post('/arkas-tools/upload/chunk', [
                'upload_id' => $uploadId,
                'chunk_index' => 0,
                'chunk' => UploadedFile::fake()->createWithContent('c0.part', str_repeat('X', 65536)),
            ], ['Accept' => 'application/json'])
            ->assertOk();

        $this->actingAs($bendahara)
            ->postJson('/arkas-tools/upload/finalize', ['upload_id' => $uploadId])
            ->assertStatus(422);

        // File korup / bukan SQLite
        $corrupt = 'THIS_IS_NOT_SQLITE_AT_ALL_'.str_repeat('Z', 300);
        $corruptInit = $this->actingAs($bendahara)
            ->postJson('/arkas-tools/upload/init', [
                'filename' => 'arkas.db',
                'total_size' => strlen($corrupt),
                'chunk_size' => 65536,
                'total_chunks' => 1,
            ])
            ->assertOk();

        $corruptId = (string) $corruptInit->json('upload_id');
        $this->actingAs($bendahara)
            ->post('/arkas-tools/upload/chunk', [
                'upload_id' => $corruptId,
                'chunk_index' => 0,
                'chunk' => UploadedFile::fake()->createWithContent('bad.part', $corrupt),
            ], ['Accept' => 'application/json'])
            ->assertOk();

        $this->actingAs($bendahara)
            ->postJson('/arkas-tools/upload/finalize', ['upload_id' => $corruptId])
            ->assertStatus(422);
    }

    public function test_custom_operator_role_with_path_arkas_write_is_allowed_while_readonly_and_kepsek_are_blocked(): void
    {
        $operatorRole = Role::create([
            'slug' => 'operator_arkas',
            'name' => 'Operator ARKAS',
            'description' => 'Operator pemegang aplikasi ARKAS',
            'is_system' => false,
            'permissions' => [
                'modules' => [
                    'dashboard' => PermissionCatalog::LEVEL_READ,
                    'path_arkas' => PermissionCatalog::LEVEL_WRITE,
                ],
                'abilities' => [
                    'rkas_review' => false,
                    'rkas_approve' => false,
                ],
            ],
        ]);

        $viewerRole = Role::create([
            'slug' => 'viewer_arkas',
            'name' => 'Pemantau ARKAS',
            'description' => 'Hanya baca status ARKAS',
            'is_system' => false,
            'permissions' => [
                'modules' => [
                    'dashboard' => PermissionCatalog::LEVEL_READ,
                    'path_arkas' => PermissionCatalog::LEVEL_READ,
                ],
                'abilities' => [
                    'rkas_review' => false,
                    'rkas_approve' => false,
                ],
            ],
        ]);

        $operator = User::factory()->create(['username' => 'op_arkas', 'role' => $operatorRole->slug]);
        $viewer = User::factory()->create(['username' => 'view_arkas', 'role' => $viewerRole->slug]);
        $kepsek = User::factory()->create(['username' => 'kepsek_arkas', 'role' => 'kepala_sekolah']);

        // Operator ARKAS (path_arkas = write) diizinkan penuh
        $this->actingAs($operator)->postJson('/arkas-tools/mode', ['mode' => 'online'])->assertOk();
        $this->actingAs($operator)->postJson('/arkas-tools/agent/pin', ['pin' => '482910'])->assertOk();

        // Viewer (path_arkas = read) hanya boleh get-path, ditolak pada semua mutasi
        $this->actingAs($viewer)->getJson('/arkas-tools/path')->assertOk();
        $this->actingAs($viewer)->postJson('/arkas-tools/mode', ['mode' => 'local'])->assertForbidden();
        $this->actingAs($viewer)->postJson('/arkas-tools/agent/pin', ['pin' => '1234'])->assertForbidden();

        // Kepala Sekolah ditolak pada semua endpoint path_arkas
        $this->actingAs($kepsek)->getJson('/arkas-tools/path')->assertForbidden();
        $this->actingAs($kepsek)->postJson('/arkas-tools/mode', ['mode' => 'online'])->assertForbidden();
        $this->actingAs($kepsek)->postJson('/arkas-tools/agent/download')->assertForbidden();
    }

    public function test_agent_pin_token_download_rate_limit_chunked_sync_and_revoke(): void
    {
        $bendahara = User::factory()->create([
            'username' => 'bendahara_agent',
            'role' => 'bendahara',
        ]);

        // Belum atur PIN -> download .bat ditolak 422
        $this->actingAs($bendahara)
            ->postJson('/arkas-tools/agent/download')
            ->assertStatus(422);

        // Simpan PIN 6 digit
        $this->actingAs($bendahara)
            ->postJson('/arkas-tools/agent/pin', ['pin' => '654321'])
            ->assertOk()
            ->assertJsonPath('agent.has_pin', true);

        // Download .bat (membuat token baru)
        $downloadRes = $this->actingAs($bendahara)
            ->post('/arkas-tools/agent/download')
            ->assertOk();

        $script = (string) $downloadRes->getContent();
        $this->assertStringContainsString('#__SIKAS_PS_START__', $script);
        $this->assertStringContainsString('/arkas-agent/ping', $script);

        preg_match("/\\\$SyncToken\s*=\s*'([a-f0-9]{64})'/", $script, $matches);
        $this->assertCount(2, $matches, 'Token 64-hex harus tertanam di file .bat.');
        $plainToken = $matches[1];

        // Uji rate limit 5x salah PIN -> percobaan ke-6 dikunci 429
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/arkas-agent/ping', [], [
                'X-Arkas-Sync-Token' => $plainToken,
                'X-Arkas-Sync-Pin' => '000000',
            ])->assertStatus(401);
        }

        $this->postJson('/arkas-agent/ping', [], [
            'X-Arkas-Sync-Token' => $plainToken,
            'X-Arkas-Sync-Pin' => '654321',
        ])->assertStatus(429);

        // Bersihkan rate limiter untuk uji alur valid Agent Sync
        RateLimiter::clear('arkas-agent-auth:127.0.0.1');

        $headers = [
            'X-Arkas-Sync-Token' => $plainToken,
            'X-Arkas-Sync-Pin' => '654321',
        ];

        // Ping valid
        $this->postJson('/arkas-agent/ping', ['device_name' => 'LAPTOP-OP-01'], $headers)
            ->assertOk()
            ->assertJsonPath('status', 'ok');

        // Upload chunked end-to-end via Agent (tanpa session/CSRF)
        $payload = $this->makeValidSqlitePayload(140000);
        $chunkSize = 65536;
        $totalChunks = (int) ceil(strlen($payload) / $chunkSize);
        $sha256 = hash('sha256', $payload);

        $initRes = $this->postJson('/arkas-agent/upload/init', [
            'filename' => 'arkas.db',
            'total_size' => strlen($payload),
            'chunk_size' => $chunkSize,
            'total_chunks' => $totalChunks,
            'sha256' => $sha256,
            'device_name' => 'LAPTOP-OP-01',
        ], $headers)->assertOk();

        $uploadId = (string) $initRes->json('upload_id');
        for ($i = 0; $i < $totalChunks; $i++) {
            $slice = substr($payload, $i * $chunkSize, $chunkSize);
            $this->post('/arkas-agent/upload/chunk', [
                'upload_id' => $uploadId,
                'chunk_index' => $i,
                'chunk' => UploadedFile::fake()->createWithContent("a_{$i}.part", $slice),
            ], array_merge($headers, ['Accept' => 'application/json']))->assertOk();
        }

        $this->postJson('/arkas-agent/upload/finalize', [
            'upload_id' => $uploadId,
            'device_name' => 'LAPTOP-OP-01',
        ], $headers)
            ->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('last_upload.via', 'agent')
            ->assertJsonPath('last_upload.device_name', 'LAPTOP-OP-01');

        $this->assertTrue(
            ActivityLog::where('route_name', 'arkas-agent.upload-finalize')->exists(),
            'Sync Agent harus tercatat di ActivityLog.'
        );

        // Cabut token -> kredensial lama langsung ditolak 401
        $this->actingAs($bendahara)
            ->deleteJson('/arkas-tools/agent/token')
            ->assertOk()
            ->assertJsonPath('agent.has_token', false);

        $this->postJson('/arkas-agent/ping', [], $headers)->assertStatus(401);
    }
}
