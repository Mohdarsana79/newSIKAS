<?php

namespace Tests\Unit;

use App\Http\Controllers\DatabaseController;
use Illuminate\Support\Facades\File;
use Tests\TestCase;
use ZipArchive;

class BackupStorageArchiveTest extends TestCase
{
    protected string $testPublicDir;

    protected string $testPrivateDir;

    protected string $testBackupZip;

    protected function setUp(): void
    {
        parent::setUp();

        $this->testPublicDir = storage_path('app/temp/test_public_'.uniqid());
        $this->testPrivateDir = storage_path('app/temp/test_private_'.uniqid());
        $this->testBackupZip = storage_path('app/temp/test_backup_'.uniqid().'.rsv');

        @mkdir($this->testPublicDir.'/kop_surat', 0755, true);
        @mkdir($this->testPrivateDir.'/sk_surat/templates', 0755, true);

        // Buat dummy files
        file_put_contents($this->testPublicDir.'/kop_surat/logo_test.png', 'DUMMY_PNG_DATA');
        file_put_contents($this->testPrivateDir.'/sk_surat/templates/template_test.docx', 'DUMMY_DOCX_DATA');
    }

    protected function tearDown(): void
    {
        if (file_exists($this->testBackupZip)) {
            @unlink($this->testBackupZip);
        }
        File::deleteDirectory($this->testPublicDir);
        File::deleteDirectory($this->testPrivateDir);

        parent::tearDown();
    }

    public function test_add_folder_to_zip_and_extract_subdirs()
    {
        $controller = new class extends DatabaseController
        {
            public function test_add_folder(ZipArchive $zip, string $source, string $prefix, array $excludes = []): int
            {
                return $this->addFolderToZip($zip, $source, $prefix, $excludes);
            }

            public function test_extract_subdir(ZipArchive $zip, string $prefix, string $dest): int
            {
                return $this->extractZipSubdir($zip, $prefix, $dest);
            }
        };

        // 1. Pack into zip
        $zip = new ZipArchive;
        $this->assertTrue($zip->open($this->testBackupZip, ZipArchive::CREATE | ZipArchive::OVERWRITE));

        $zip->addFromString('database.sql', 'CREATE TABLE dummy (id INT);');
        $publicCount = $controller->test_add_folder($zip, $this->testPublicDir, 'storage/public');
        $privateCount = $controller->test_add_folder($zip, $this->testPrivateDir, 'storage/private');

        $this->assertEquals(1, $publicCount);
        $this->assertEquals(1, $privateCount);

        $zip->close();

        // 2. Inspect ZIP contents
        $verifyZip = new ZipArchive;
        $this->assertTrue($verifyZip->open($this->testBackupZip));
        $this->assertNotFalse($verifyZip->locateName('database.sql'));
        $this->assertNotFalse($verifyZip->locateName('storage/public/kop_surat/logo_test.png'));
        $this->assertNotFalse($verifyZip->locateName('storage/private/sk_surat/templates/template_test.docx'));

        // 3. Test extraction
        $destPublic = storage_path('app/temp/dest_public_'.uniqid());
        $destPrivate = storage_path('app/temp/dest_private_'.uniqid());

        $extractedPub = $controller->test_extract_subdir($verifyZip, 'storage/public', $destPublic);
        $extractedPriv = $controller->test_extract_subdir($verifyZip, 'storage/private', $destPrivate);

        $this->assertEquals(1, $extractedPub);
        $this->assertEquals(1, $extractedPriv);

        $this->assertFileExists($destPublic.'/kop_surat/logo_test.png');
        $this->assertEquals('DUMMY_PNG_DATA', file_get_contents($destPublic.'/kop_surat/logo_test.png'));

        $this->assertFileExists($destPrivate.'/sk_surat/templates/template_test.docx');
        $this->assertEquals('DUMMY_DOCX_DATA', file_get_contents($destPrivate.'/sk_surat/templates/template_test.docx'));

        $verifyZip->close();

        // Cleanup
        File::deleteDirectory($destPublic);
        File::deleteDirectory($destPrivate);
    }
}
