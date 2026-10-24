<?php

namespace Tests\Unit;

use Illuminate\Support\Facades\File;
use Tests\TestCase;

class SecureEnvCommandTest extends TestCase
{
    protected string $testTargetDir;

    protected function setUp(): void
    {
        parent::setUp();
        $this->testTargetDir = storage_path('framework/testing/secure_env_test');
        File::ensureDirectoryExists($this->testTargetDir);
    }

    protected function tearDown(): void
    {
        if (File::exists($this->testTargetDir)) {
            File::deleteDirectory($this->testTargetDir);
        }
        parent::tearDown();
    }

    public function test_status_option_runs_successfully(): void
    {
        $this->artisan('sikas:secure-env', ['--status' => true])
            ->assertSuccessful();
    }

    public function test_restore_fails_gracefully_when_target_file_missing(): void
    {
        $this->artisan('sikas:secure-env', [
            '--restore' => true,
            '--target' => $this->testTargetDir,
        ])
            ->expectsOutputToContain('tidak ditemukan')
            ->assertFailed();
    }
}
