<?php

namespace Tests\Feature;

use App\Models\User;
use App\Providers\AppServiceProvider;
use App\Services\ArkasEngineService;
use App\Services\NetworkAccessService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Vite;
use Tests\TestCase;

class OnlineOfflineReadinessTest extends TestCase
{
    use RefreshDatabase;

    public function test_pgsql_config_respects_environment_variables(): void
    {
        $prevHost = getenv('DB_HOST');
        $prevDb = getenv('DB_DATABASE');
        $prevUser = getenv('DB_USERNAME');
        $prevEnvDb = $_ENV['DB_DATABASE'] ?? null;
        $prevServerDb = $_SERVER['DB_DATABASE'] ?? null;

        putenv('DB_HOST=10.20.30.40');
        putenv('DB_DATABASE=sikas_vps_prod');
        putenv('DB_USERNAME=sikas_admin');
        $_ENV['DB_DATABASE'] = 'sikas_vps_prod';
        $_SERVER['DB_DATABASE'] = 'sikas_vps_prod';

        try {
            $dbConfig = require config_path('database.php');
            $pgsql = $dbConfig['connections']['pgsql'];

            $this->assertSame('10.20.30.40', $pgsql['host']);
            $this->assertSame('sikas_vps_prod', $pgsql['database']);
            $this->assertSame('sikas_admin', $pgsql['username']);
        } finally {
            putenv($prevHost === false ? 'DB_HOST' : "DB_HOST={$prevHost}");
            putenv($prevDb === false ? 'DB_DATABASE' : "DB_DATABASE={$prevDb}");
            putenv($prevUser === false ? 'DB_USERNAME' : "DB_USERNAME={$prevUser}");
            if ($prevEnvDb === null) {
                unset($_ENV['DB_DATABASE']);
            } else {
                $_ENV['DB_DATABASE'] = $prevEnvDb;
            }
            if ($prevServerDb === null) {
                unset($_SERVER['DB_DATABASE']);
            } else {
                $_SERVER['DB_DATABASE'] = $prevServerDb;
            }
        }
    }

    public function test_welcome_route_does_not_crash_even_when_users_table_is_missing(): void
    {
        Schema::dropIfExists('users');

        $response = $this->get('/');

        $response->assertStatus(200);
    }

    public function test_reverse_proxy_https_headers_generate_https_urls(): void
    {
        Config::set('trustedproxy.proxies', '*');

        $response = $this->withHeaders([
            'X-Forwarded-Proto' => 'https',
            'X-Forwarded-Host' => 'sikas.sekolah.sch.id',
            'X-Forwarded-Port' => '443',
            'X-Forwarded-For' => '203.0.113.10',
        ])->get('http://sikas.sekolah.sch.id/');

        $response->assertStatus(200);
        $this->assertTrue(request()->isSecure());
        $this->assertSame('https://sikas.sekolah.sch.id/dashboard', url('/dashboard'));
    }

    public function test_arkas_engine_service_returns_graceful_error_when_database_missing(): void
    {
        $missingFile = sys_get_temp_dir().DIRECTORY_SEPARATOR.'non_existent_arkas_'.uniqid().'.db';
        Config::set('arkas.db_path', $missingFile);
        Config::set('arkas.upload_path', $missingFile.'_upload');

        $service = app(ArkasEngineService::class);
        $resolved = $service->resolveDatabaseSource();

        $this->assertFalse($resolved['exists']);
        $this->assertSame('manual_missing', $resolved['source']);

        $result = $service->runScriptRaw('query.py', ['__YEARS__', 'ALL'], 10);
        $this->assertSame('error', $result['status'] ?? null);
        $this->assertSame('DB_NOT_FOUND', $result['error_type'] ?? null);
    }

    public function test_arkas_engine_service_prefers_valid_manual_path_and_falls_back_to_uploaded_db(): void
    {
        $tempDir = storage_path('app/temp/test_arkas_'.uniqid());
        @mkdir($tempDir, 0755, true);
        $manualDb = $tempDir.DIRECTORY_SEPARATOR.'manual.db';
        $uploadDb = $tempDir.DIRECTORY_SEPARATOR.'uploaded.db';
        file_put_contents($manualDb, 'SQLite format 3');
        file_put_contents($uploadDb, 'SQLite format 3');

        try {
            Config::set('arkas.db_path', $manualDb);
            Config::set('arkas.upload_path', $uploadDb);

            $service = app(ArkasEngineService::class);

            $manualResolved = $service->resolveDatabaseSource();
            $this->assertTrue($manualResolved['exists']);
            $this->assertSame('manual', $manualResolved['source']);

            Config::set('arkas.db_path', '');
            $uploadResolved = $service->resolveDatabaseSource();
            $this->assertTrue($uploadResolved['exists']);
            $this->assertSame('uploaded', $uploadResolved['source']);
        } finally {
            @unlink($manualDb);
            @unlink($uploadDb);
            @rmdir($tempDir);
        }
    }

    public function test_sekolah_profile_allows_custom_npsn_when_license_disabled(): void
    {
        $bendahara = User::factory()->create([
            'username' => 'bendahara_vps',
            'role' => 'bendahara',
        ]);

        Config::set('license.enabled', false);
        Config::set('license.npsn_code', '');

        $response = $this->actingAs($bendahara)->post('/sekolah-profile', [
            'nama_sekolah' => 'SDN Uji Online',
            'npsn' => '12345678',
            'status_sekolah' => 'Negeri',
            'jenjang_sekolah' => 'SD',
            'kelurahan_desa' => 'Kelurahan Test',
            'kecamatan' => 'Kecamatan Test',
            'kabupaten_kota' => 'Kota Test',
            'provinsi' => 'Provinsi Test',
            'alamat' => 'Jl. Pendidikan No. 1',
        ]);

        $response->assertSessionHasNoErrors();
        $this->assertDatabaseHas('sekolahs', [
            'npsn' => '12345678',
            'nama_sekolah' => 'SDN Uji Online',
        ]);
    }

    public function test_kepala_sekolah_is_blocked_from_admin_server_endpoints(): void
    {
        $kepsek = User::factory()->create([
            'username' => 'kepsek_online',
            'role' => 'kepala_sekolah',
        ]);

        $this->actingAs($kepsek)->get('/backup')->assertForbidden();
        $this->actingAs($kepsek)->get('/pembaharuan')->assertForbidden();
        $this->actingAs($kepsek)->postJson('/arkas-tools/path', ['path' => 'C:/test.db'])->assertForbidden();
        $this->actingAs($kepsek)->postJson('/arkas-tools/upload-db', [
            'arkas_db' => UploadedFile::fake()->create('arkas.db', 10),
        ])->assertForbidden();
    }

    public function test_upload_arkas_db_rejects_non_db_extensions(): void
    {
        $bendahara = User::factory()->create([
            'username' => 'bendahara_upload',
            'role' => 'bendahara',
        ]);

        $response = $this->actingAs($bendahara)->postJson('/arkas-tools/upload-db', [
            'arkas_db' => UploadedFile::fake()->create('not_a_db.txt', 10),
        ]);

        $response->assertStatus(422);
    }

    public function test_verify_database_file_falls_back_to_sqlite_header_when_python_engine_absent(): void
    {
        $tempDir = storage_path('app/temp/test_verify_'.uniqid());
        @mkdir($tempDir, 0755, true);
        $validSqlite = $tempDir.DIRECTORY_SEPARATOR.'valid.db';
        $invalidFile = $tempDir.DIRECTORY_SEPARATOR.'corrupt.db';

        file_put_contents($validSqlite, "SQLite format 3\0".str_repeat("\0", 2048));
        file_put_contents($invalidFile, 'NOT_A_DATABASE_PAYLOAD');

        try {
            Config::set('arkas.engine_dir', $tempDir.DIRECTORY_SEPARATOR.'missing_engine');
            $service = app(ArkasEngineService::class);

            $validRes = $service->verifyDatabaseFile($validSqlite);
            $invalidRes = $service->verifyDatabaseFile($invalidFile);

            $this->assertTrue($validRes['valid']);
            $this->assertFalse($invalidRes['valid']);
        } finally {
            @unlink($validSqlite);
            @unlink($invalidFile);
            @rmdir($tempDir);
        }
    }

    public function test_lan_ip_request_does_not_force_https_even_when_app_url_is_https(): void
    {
        Config::set('app.force_https', false);
        Config::set('app.url', 'https://sikas.sekolah.sch.id');

        $provider = new AppServiceProvider($this->app);
        $method = new \ReflectionMethod($provider, 'isLocalOrLanHost');
        $method->setAccessible(true);

        $this->assertTrue($method->invoke($provider, 'localhost'));
        $this->assertTrue($method->invoke($provider, '127.0.0.1'));
        $this->assertTrue($method->invoke($provider, '192.168.1.50'));
        $this->assertTrue($method->invoke($provider, '10.0.0.5'));
        $this->assertFalse($method->invoke($provider, 'sikas.sekolah.sch.id'));
    }

    public function test_network_access_service_builds_lan_urls_without_loopback(): void
    {
        $service = app(NetworkAccessService::class);
        $ips = $service->getLocalLanIps();

        foreach ($ips as $ip) {
            $this->assertNotSame('127.0.0.1', $ip);
            $this->assertNotSame('0.0.0.0', $ip);
            $this->assertNotFalse(filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4));
        }
    }

    public function test_bendahara_can_update_network_settings_and_kepala_sekolah_is_blocked(): void
    {
        $bendahara = User::factory()->create([
            'username' => 'bendahara_net',
            'role' => 'bendahara',
        ]);
        $kepsek = User::factory()->create([
            'username' => 'kepsek_net',
            'role' => 'kepala_sekolah',
        ]);

        // Kepala sekolah blocked
        $this->actingAs($kepsek)->get('/pengaturan-jaringan')->assertForbidden();

        $this->actingAs($kepsek)->postJson('/pengaturan-jaringan', [
            'app_url' => 'https://sikas.sekolah.sch.id',
            'force_https' => false,
        ])->assertForbidden();

        $this->actingAs($kepsek)->postJson('/pengaturan-jaringan/firewall-open')->assertForbidden();

        // Bendahara can access Pengaturan Jaringan page (Inertia props) and Backup page stays focused without networkAccess prop
        $this->actingAs($bendahara)
            ->get('/pengaturan-jaringan')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('NetworkSettings/Index')
                ->has('networkAccess.port')
                ->has('networkAccess.firewall')
            );

        $this->actingAs($bendahara)
            ->get('/backup')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Backup/Index')
                ->missing('networkAccess')
            );

        // Legacy backup network endpoints removed
        $this->actingAs($bendahara)->postJson('/backup/network-settings', [
            'app_url' => 'https://sikas.sekolah.sch.id',
            'force_https' => false,
        ])->assertNotFound();

        // Test writing to an isolated temporary .env file so we don't mutate the repo .env
        $tempEnvDir = storage_path('app/temp/test_env_'.uniqid());
        @mkdir($tempEnvDir, 0755, true);
        $tempEnvPath = $tempEnvDir.DIRECTORY_SEPARATOR.'.env';
        file_put_contents($tempEnvPath, "APP_URL=http://localhost\nFORCE_HTTPS=false\nTRUSTED_PROXIES=*\n");

        $origEnvPath = $this->app->environmentPath();
        $origEnvFile = $this->app->environmentFile();

        try {
            $this->app->useEnvironmentPath($tempEnvDir);

            $response = $this->actingAs($bendahara)->postJson('/pengaturan-jaringan', [
                'app_url' => 'https://sikas.sekolah.sch.id/',
                'force_https' => true,
            ]);

            $response->assertOk()->assertJson([
                'status' => 'success',
            ]);

            $savedEnv = file_get_contents($tempEnvPath);
            $this->assertStringContainsString('APP_URL=https://sikas.sekolah.sch.id', $savedEnv);
            $this->assertStringContainsString('FORCE_HTTPS=true', $savedEnv);
            $this->assertStringContainsString('TRUSTED_PROXIES=*', $savedEnv);

            // Repeated saves must not accumulate trailing blank lines
            $this->actingAs($bendahara)->postJson('/pengaturan-jaringan', [
                'app_url' => 'https://sikas.sekolah.sch.id',
                'force_https' => false,
            ])->assertOk();
            $savedAgain = file_get_contents($tempEnvPath);
            $this->assertStringEndsNotWith("\n\n", $savedAgain);

            // Custom TRUSTED_PROXIES configured for hardened VPS must be preserved
            file_put_contents($tempEnvPath, "APP_URL=http://localhost\nFORCE_HTTPS=false\nTRUSTED_PROXIES=127.0.0.1\n");
            $this->actingAs($bendahara)->postJson('/pengaturan-jaringan', [
                'app_url' => 'https://vps.sekolah.sch.id',
                'force_https' => true,
            ])->assertOk();
            $this->assertStringContainsString('TRUSTED_PROXIES=127.0.0.1', file_get_contents($tempEnvPath));

            // Non-HTTP URL schemes must be rejected
            $this->actingAs($bendahara)->postJson('/pengaturan-jaringan', [
                'app_url' => 'ftp://sikas.sekolah.sch.id',
                'force_https' => false,
            ])->assertStatus(422);

            // Missing .env must fail cleanly with 422 instead of false 200 success
            @unlink($tempEnvPath);
            $this->actingAs($bendahara)->postJson('/pengaturan-jaringan', [
                'app_url' => 'https://sikas.sekolah.sch.id',
                'force_https' => true,
            ])->assertStatus(422)->assertJson([
                'status' => 'error',
            ]);
        } finally {
            $this->app->useEnvironmentPath($origEnvPath);
            $this->app->loadEnvironmentFrom($origEnvFile);
            @unlink($tempEnvPath);
            @rmdir($tempEnvDir);
        }
    }

    public function test_remote_or_https_requests_bypass_vite_hot_file_when_build_manifest_exists(): void
    {
        $hotPath = public_path('hot');
        $manifestPath = public_path('build/manifest.json');
        $hotExisted = is_file($hotPath);
        $origHotContent = $hotExisted ? file_get_contents($hotPath) : null;
        $manifestExisted = is_file($manifestPath);
        $origEnv = $this->app['env'];

        if (! $hotExisted) {
            file_put_contents($hotPath, 'http://[::1]:5173');
        }
        if (! $manifestExisted) {
            @mkdir(dirname($manifestPath), 0755, true);
            file_put_contents($manifestPath, '{}');
        }

        try {
            $this->app['env'] = 'local';

            // Remote HTTPS ngrok request must bypass public/hot to avoid CORS / Mixed Content
            $ngrokResponse = $this->flushHeaders()->withHeaders([
                'Host' => 'demo.ngrok-free.app',
                'X-Forwarded-Proto' => 'https',
            ])->get('/');

            $ngrokResponse->assertOk();
            $this->assertFalse(Vite::isRunningHot());
            $this->assertStringNotContainsString('[::1]:5173', $ngrokResponse->getContent());

            // LAN HTTP request must also bypass public/hot
            $lanResponse = $this->flushHeaders()->get('http://192.168.1.50:8000/');

            $lanResponse->assertOk();
            $this->assertFalse(Vite::isRunningHot());
            $this->assertStringNotContainsString('[::1]:5173', $lanResponse->getContent());

            // Local HTTP loopback request keeps Vite hot file active in local env
            $localResponse = $this->flushHeaders()->get('http://localhost:8000/');

            $localResponse->assertOk();
            $this->assertTrue(Vite::isRunningHot());

            // Production env always bypasses public/hot even on localhost
            $this->app['env'] = 'production';
            $prodLocalResponse = $this->flushHeaders()->get('http://localhost:8000/');

            $prodLocalResponse->assertOk();
            $this->assertFalse(Vite::isRunningHot());
            $this->assertStringNotContainsString('[::1]:5173', $prodLocalResponse->getContent());
        } finally {
            $this->app['env'] = $origEnv;
            Vite::useHotFile($hotPath);

            if ($hotExisted && is_string($origHotContent)) {
                file_put_contents($hotPath, $origHotContent);
            } elseif (! $hotExisted) {
                @unlink($hotPath);
            }

            if (! $manifestExisted) {
                @unlink($manifestPath);
            }
        }
    }
}
