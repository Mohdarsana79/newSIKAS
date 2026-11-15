<?php

namespace Tests\Feature;

use App\Models\SkDokumen;
use App\Models\SkFolder;
use App\Models\SkTemplate;
use App\Models\User;
use App\Services\SkSuratService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SkSuratTest extends TestCase
{
    use RefreshDatabase;

    protected User $bendahara;

    protected User $kepsek;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');

        $this->bendahara = User::factory()->create([
            'username' => 'bendahara_sikas',
            'role' => 'bendahara',
        ]);

        $this->kepsek = User::factory()->create([
            'username' => 'kepsek_sikas',
            'role' => 'kepala_sekolah',
        ]);
    }

    public function test_guest_cannot_access_sk_surat(): void
    {
        $response = $this->get('/sk-surat');
        $response->assertRedirect('/login');
    }

    public function test_bendahara_can_view_folder_index(): void
    {
        $response = $this->actingAs($this->bendahara)->get('/sk-surat');
        $response->assertOk();
    }

    public function test_bendahara_can_create_folder(): void
    {
        $response = $this->actingAs($this->bendahara)->post('/sk-surat/folder', [
            'nama_folder' => 'SK Penetapan BOSP 2026',
            'deskripsi' => 'Kumpulan SK dan Surat Penetapan',
            'warna' => 'indigo',
        ]);

        $this->assertDatabaseHas('sk_folders', [
            'nama_folder' => 'SK Penetapan BOSP 2026',
            'warna' => 'indigo',
            'created_by' => $this->bendahara->id,
        ]);
    }

    public function test_bendahara_can_update_folder(): void
    {
        $folder = SkFolder::create([
            'nama_folder' => 'Folder Lama',
            'deskripsi' => 'Deskripsi lama',
            'warna' => 'indigo',
            'created_by' => $this->bendahara->id,
        ]);

        $response = $this->actingAs($this->bendahara)->put("/sk-surat/folder/{$folder->id}", [
            'nama_folder' => 'Folder Baru',
            'deskripsi' => 'Deskripsi baru',
            'warna' => 'emerald',
        ]);

        $this->assertDatabaseHas('sk_folders', [
            'id' => $folder->id,
            'nama_folder' => 'Folder Baru',
            'warna' => 'emerald',
        ]);
    }

    public function test_bendahara_can_delete_folder(): void
    {
        $folder = SkFolder::create([
            'nama_folder' => 'Folder Dihapus',
            'created_by' => $this->bendahara->id,
        ]);

        $response = $this->actingAs($this->bendahara)->delete("/sk-surat/folder/{$folder->id}");
        $response->assertRedirect('/sk-surat');

        $this->assertDatabaseMissing('sk_folders', [
            'id' => $folder->id,
        ]);
    }

    public function test_kepala_sekolah_can_view_folder_show(): void
    {
        $folder = SkFolder::create([
            'nama_folder' => 'SK Tim Manajemen',
            'created_by' => $this->bendahara->id,
        ]);

        $response = $this->actingAs($this->kepsek)->get("/sk-surat/folder/{$folder->id}");
        $response->assertOk();
    }

    public function test_kepala_sekolah_cannot_create_or_mutate_folder(): void
    {
        // Block Create
        $response = $this->actingAs($this->kepsek)->post('/sk-surat/folder', [
            'nama_folder' => 'Folder Kepsek',
        ]);
        $response->assertForbidden();

        // Block Delete
        $folder = SkFolder::create([
            'nama_folder' => 'Folder Uji',
            'created_by' => $this->bendahara->id,
        ]);

        $response = $this->actingAs($this->kepsek)->delete("/sk-surat/folder/{$folder->id}");
        $response->assertForbidden();
    }

    public function test_kepala_sekolah_cannot_upload_template_or_dokumen(): void
    {
        $folder = SkFolder::create([
            'nama_folder' => 'Folder Uji',
            'created_by' => $this->bendahara->id,
        ]);

        $response = $this->actingAs($this->kepsek)->post("/sk-surat/folder/{$folder->id}/template", [
            'judul' => 'Template Dilarang',
            'file' => UploadedFile::fake()->create('template.docx', 100),
        ]);
        $response->assertForbidden();

        $response = $this->actingAs($this->kepsek)->post("/sk-surat/folder/{$folder->id}/dokumen", [
            'template_id' => 1,
            'perihal' => 'Dokumen Dilarang',
        ]);
        $response->assertForbidden();
    }

    public function test_bendahara_can_upload_arsip_fisik(): void
    {
        $folder = SkFolder::create([
            'nama_folder' => 'Folder Arsip',
            'created_by' => $this->bendahara->id,
        ]);

        $file = UploadedFile::fake()->create('scan_sk.pdf', 500, 'application/pdf');

        $response = $this->actingAs($this->bendahara)->post("/sk-surat/folder/{$folder->id}/upload-arsip", [
            'perihal' => 'Scan SK Pembagian Tugas',
            'nomor_surat' => '421/01/2026',
            'tanggal_surat' => '2026-01-10',
            'file' => $file,
        ]);

        $this->assertDatabaseHas('sk_dokumens', [
            'folder_id' => $folder->id,
            'tipe' => 'uploaded',
            'perihal' => 'Scan SK Pembagian Tugas',
            'nomor_surat' => '421/01/2026',
        ]);

        $dokumen = SkDokumen::where('perihal', 'Scan SK Pembagian Tugas')->first();
        $this->assertNotNull($dokumen->file_path);
        Storage::disk('local')->assertExists($dokumen->file_path);

        // Kepala sekolah can download the archive
        $downloadResponse = $this->actingAs($this->kepsek)->get("/sk-surat/dokumen/{$dokumen->id}/download-archive");
        $downloadResponse->assertOk();
    }

    public function test_bendahara_can_create_dokumen_with_auto_extracted_variables(): void
    {
        $folder = SkFolder::create([
            'nama_folder' => 'Folder SK Baru',
            'created_by' => $this->bendahara->id,
        ]);

        $template = SkTemplate::create([
            'folder_id' => $folder->id,
            'judul' => 'Template SK BOS',
            'file_path' => 'sk_surat/templates/test.docx',
            'file_name_original' => 'test.docx',
            'detected_variables' => ['nomor_surat', 'nama_kegiatan', 'tanggal_surat'],
            'created_by' => $this->bendahara->id,
        ]);

        $response = $this->actingAs($this->bendahara)->post("/sk-surat/folder/{$folder->id}/dokumen", [
            'template_id' => $template->id,
            'perihal' => 'SK Tim BOS 2026',
            'data_isian' => [
                'nomor_surat' => '421/005/BOSP/2026',
                'nama_kegiatan' => 'Pengadaan Buku Pelajaran',
                'tanggal_surat' => '2026-02-15',
            ],
        ]);

        $this->assertDatabaseHas('sk_dokumens', [
            'folder_id' => $folder->id,
            'template_id' => $template->id,
            'perihal' => 'SK Tim BOS 2026',
            'nomor_surat' => '421/005/BOSP/2026',
            'tanggal_surat' => '2026-02-15 00:00:00',
        ]);
    }

    public function test_bendahara_can_upload_docx_template_with_split_and_textbox_variables(): void
    {
        $folder = SkFolder::create([
            'nama_folder' => 'Folder Template Word',
            'created_by' => $this->bendahara->id,
        ]);

        $docxPath = $this->createSampleDocxFile();
        $uploadedFile = new UploadedFile(
            $docxPath,
            'surat_pengantar.docx',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            null,
            true
        );

        $response = $this->actingAs($this->bendahara)->post("/sk-surat/folder/{$folder->id}/template", [
            'judul' => 'Surat Pengantar BOSP',
            'file' => $uploadedFile,
        ]);

        $response->assertSessionHasNoErrors();

        $template = SkTemplate::where('judul', 'Surat Pengantar BOSP')->firstOrFail();
        $vars = $template->detected_variables ?? [];

        $this->assertContains('nomor_surat', $vars);
        $this->assertContains('kepala_sekolah', $vars);
        $this->assertContains('nama_kegiatan', $vars);
        $this->assertContains('catatan_kotak', $vars);
        $this->assertContains('header_instansi', $vars);

        @unlink($docxPath);
    }

    public function test_uploading_corrupt_docx_returns_error_and_does_not_save_template(): void
    {
        $folder = SkFolder::create([
            'nama_folder' => 'Folder Invalid',
            'created_by' => $this->bendahara->id,
        ]);

        $fakeDocx = UploadedFile::fake()->createWithContent('rusak.docx', 'bukan file zip docx');

        $response = $this->actingAs($this->bendahara)->post("/sk-surat/folder/{$folder->id}/template", [
            'judul' => 'Template Rusak',
            'file' => $fakeDocx,
        ]);

        $response->assertSessionHasErrors('file');
        $this->assertDatabaseMissing('sk_templates', [
            'judul' => 'Template Rusak',
        ]);
        $this->assertCount(0, Storage::disk('local')->files('sk_surat/templates'));
    }

    public function test_bendahara_can_rescan_template_and_kepala_sekolah_is_forbidden(): void
    {
        $folder = SkFolder::create([
            'nama_folder' => 'Folder Rescan',
            'created_by' => $this->bendahara->id,
        ]);

        $docxPath = $this->createSampleDocxFile();
        $storedPath = 'sk_surat/templates/rescan_test.docx';
        Storage::disk('local')->put($storedPath, file_get_contents($docxPath));
        @unlink($docxPath);

        $template = SkTemplate::create([
            'folder_id' => $folder->id,
            'judul' => 'Template Lama Kosong',
            'file_path' => $storedPath,
            'file_name_original' => 'rescan_test.docx',
            'detected_variables' => [],
            'created_by' => $this->bendahara->id,
        ]);

        $this->actingAs($this->kepsek)
            ->post("/sk-surat/template/{$template->id}/rescan")
            ->assertForbidden();

        $this->actingAs($this->bendahara)
            ->post("/sk-surat/template/{$template->id}/rescan")
            ->assertSessionHasNoErrors();

        $template->refresh();
        $this->assertContains('nomor_surat', $template->detected_variables ?? []);
        $this->assertContains('kepala_sekolah', $template->detected_variables ?? []);
        $this->assertContains('catatan_kotak', $template->detected_variables ?? []);
    }

    public function test_libreoffice_path_resolution_supports_config_override_and_portable_project_binary(): void
    {
        $service = app(SkSuratService::class);

        $portableCom = storage_path('app/libreoffice/program/soffice.com');
        $portableExe = storage_path('app/libreoffice/program/soffice.exe');
        if (is_file($portableCom)) {
            $this->assertSame($portableCom, $service->resolveLibreOfficePath());
        } elseif (is_file($portableExe)) {
            $this->assertSame($portableExe, $service->resolveLibreOfficePath());
        }

        $dummyExec = tempnam(sys_get_temp_dir(), 'lo_cfg_');
        config(['services.libreoffice.path' => $dummyExec]);

        try {
            $this->assertSame($dummyExec, $service->resolveLibreOfficePath());
        } finally {
            config(['services.libreoffice.path' => null]);
            @unlink($dummyExec);
        }
    }

    public function test_convert_docx_to_pdf_throws_without_dompdf_fallback_when_libreoffice_missing(): void
    {
        $docxPath = $this->createSampleDocxFile();

        $service = new class extends SkSuratService
        {
            public function resolveLibreOfficePath(): ?string
            {
                return null;
            }
        };

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('LibreOffice');

        try {
            $service->convertDocxToPdf($docxPath);
        } finally {
            @unlink($docxPath);
        }
    }

    public function test_bendahara_can_export_pdf_with_portable_libreoffice(): void
    {
        $portablePath = storage_path('app/libreoffice/program/soffice.exe');
        if (! is_file($portablePath)) {
            $this->markTestSkipped('Portable LibreOffice tidak tersedia di environment ini.');
        }

        $folder = SkFolder::create([
            'nama_folder' => 'Folder Export PDF',
            'created_by' => $this->bendahara->id,
        ]);

        $docxPath = $this->createSampleDocxFile();
        $storedPath = 'sk_surat/templates/pdf_test.docx';
        Storage::disk('local')->put($storedPath, file_get_contents($docxPath));
        @unlink($docxPath);

        $template = SkTemplate::create([
            'folder_id' => $folder->id,
            'judul' => 'Template Uji PDF',
            'file_path' => $storedPath,
            'file_name_original' => 'pdf_test.docx',
            'detected_variables' => ['nomor_surat', 'kepala_sekolah', 'nama_kegiatan', 'catatan_kotak', 'header_instansi'],
            'created_by' => $this->bendahara->id,
        ]);

        $dokumen = SkDokumen::create([
            'folder_id' => $folder->id,
            'template_id' => $template->id,
            'tipe' => 'generated',
            'perihal' => 'SK Uji Export PDF',
            'nomor_surat' => '421/099/2026',
            'data_isian' => [
                'nomor_surat' => '421/099/2026',
                'kepala_sekolah' => 'Budi Santoso, S.Pd',
                'nama_kegiatan' => 'Pengadaan Sarana',
                'catatan_kotak' => 'Penting',
                'header_instansi' => 'SDN 1 Contoh',
            ],
            'created_by' => $this->bendahara->id,
        ]);

        $response = $this->actingAs($this->bendahara)->get("/sk-surat/dokumen/{$dokumen->id}/export-pdf");
        $response->assertOk();

        $file = $response->baseResponse->getFile();
        $pdfPath = $file->getPathname();
        $this->assertFileExists($pdfPath);
        $header = file_get_contents($pdfPath, false, null, 0, 5);
        $this->assertSame('%PDF-', $header);

        @unlink($pdfPath);
    }

    public function test_convert_docx_to_pdf_succeeds_even_when_host_user_and_temp_env_vars_are_stripped(): void
    {
        $portablePath = storage_path('app/libreoffice/program/soffice.com');
        if (! is_file($portablePath) && ! is_file(storage_path('app/libreoffice/program/soffice.exe'))) {
            $this->markTestSkipped('Portable LibreOffice tidak tersedia di environment ini.');
        }

        $docxPath = $this->createSampleDocxFile();
        $service = app(SkSuratService::class);

        $strippedKeys = ['TEMP', 'TMP', 'HOME', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'WINDIR', 'SystemDrive', 'ProgramData', 'COMSPEC'];
        $originalEnv = [];
        foreach ($strippedKeys as $key) {
            $originalEnv[$key] = getenv($key);
            putenv($key);
            unset($_ENV[$key], $_SERVER[$key]);
        }

        $pdfPath = null;
        try {
            $pdfPath = $service->convertDocxToPdf($docxPath);
            $this->assertFileExists($pdfPath);
            $this->assertSame('%PDF-', file_get_contents($pdfPath, false, null, 0, 5));
        } finally {
            foreach ($originalEnv as $key => $value) {
                if ($value !== false) {
                    putenv("{$key}={$value}");
                    $_ENV[$key] = $value;
                    $_SERVER[$key] = $value;
                }
            }
            @unlink($docxPath);
            if ($pdfPath && file_exists($pdfPath)) {
                @unlink($pdfPath);
            }
        }
    }

    public function test_sync_docx_fonts_copies_missing_cloud_fonts_into_libreoffice_truetype_dir(): void
    {
        $tempRoot = sys_get_temp_dir().DIRECTORY_SEPARATOR.'sikas_font_sync_'.uniqid('', true);
        $loProgram = $tempRoot.DIRECTORY_SEPARATOR.'libreoffice'.DIRECTORY_SEPARATOR.'program';
        $loShare = $tempRoot.DIRECTORY_SEPARATOR.'libreoffice'.DIRECTORY_SEPARATOR.'share';
        $cloudRoot = $tempRoot.DIRECTORY_SEPARATOR.'CloudFonts';
        $cloudFamilyDir = $cloudRoot.DIRECTORY_SEPARATOR.'Aptos Display';

        mkdir($loProgram, 0755, true);
        mkdir($loShare, 0755, true);
        mkdir($cloudFamilyDir, 0755, true);

        $fakeSoffice = $loProgram.DIRECTORY_SEPARATOR.'soffice.com';
        file_put_contents($fakeSoffice, '');
        file_put_contents($cloudFamilyDir.DIRECTORY_SEPARATOR.'aptos-display.ttf', 'dummy-ttf-data');

        $docxPath = $this->createSampleDocxFile(includeAptosFonts: true);
        $service = app(SkSuratService::class);

        try {
            $copiedFirst = $service->syncDocxFontsToLibreOffice($docxPath, $fakeSoffice, [$cloudRoot]);
            $this->assertSame(1, $copiedFirst);
            $this->assertFileExists($loShare.DIRECTORY_SEPARATOR.'fonts'.DIRECTORY_SEPARATOR.'truetype'.DIRECTORY_SEPARATOR.'AptosDisplay_aptos-display.ttf');

            // Subsequent run should be idempotent and skip existing files
            $copiedSecond = $service->syncDocxFontsToLibreOffice($docxPath, $fakeSoffice, [$cloudRoot]);
            $this->assertSame(0, $copiedSecond);
        } finally {
            @unlink($docxPath);
            File::deleteDirectory($tempRoot);
        }
    }

    public function test_portable_libreoffice_embeds_aptos_fonts_when_present_in_docx(): void
    {
        $portableCom = storage_path('app/libreoffice/program/soffice.com');
        $portableExe = storage_path('app/libreoffice/program/soffice.exe');
        if (! is_file($portableCom) && ! is_file($portableExe)) {
            $this->markTestSkipped('Portable LibreOffice tidak tersedia di environment ini.');
        }

        $truetypeDir = storage_path('app/libreoffice/share/fonts/truetype');
        if (empty(glob($truetypeDir.DIRECTORY_SEPARATOR.'Aptos*'))) {
            $this->markTestSkipped('Font Aptos belum tersedia di truetype portable.');
        }

        $docxPath = $this->createSampleDocxFile(includeAptosFonts: true);
        $service = app(SkSuratService::class);
        $pdfPath = null;

        try {
            $pdfPath = $service->convertDocxToPdf($docxPath);
            $this->assertFileExists($pdfPath);
            $rawPdf = file_get_contents($pdfPath);
            $this->assertNotFalse($rawPdf);
            $this->assertStringContainsString('Aptos', $rawPdf);
            $this->assertStringContainsString('AptosDisplay', $rawPdf);
        } finally {
            @unlink($docxPath);
            if ($pdfPath && file_exists($pdfPath)) {
                @unlink($pdfPath);
            }
        }
    }

    public function test_extract_and_generate_support_parenthesized_and_unclosed_variable_tags(): void
    {
        $extraBodyXml = '<w:p><w:r><w:t xml:space="preserve">Sebesar Rp. ${pagu_tahap} (${nominal_valid}) dan </w:t></w:r><w:r><w:t xml:space="preserve">(</w:t></w:r><w:r><w:t>${terbilang</w:t></w:r><w:r><w:t>)</w:t></w:r></w:p><w:p><w:r><w:t xml:space="preserve">Serta (${split_</w:t></w:r><w:r><w:t>unclosed</w:t></w:r><w:r><w:t>) oleh ${nama kepsek}</w:t></w:r></w:p>';

        $docxPath = $this->createSampleDocxFile(extraBodyXml: $extraBodyXml);
        $service = app(SkSuratService::class);
        $generatedPath = null;

        try {
            $report = $service->extractVariableReport($docxPath);

            $this->assertContains('pagu_tahap', $report['variables']);
            $this->assertContains('nominal_valid', $report['variables']);
            $this->assertContains('terbilang', $report['variables']);
            $this->assertContains('split_unclosed', $report['variables']);
            $this->assertContains('nama kepsek', $report['variables']);

            $this->assertSame(['terbilang', 'split_unclosed'], $report['unclosed']);

            $folder = SkFolder::create([
                'nama_folder' => 'Folder Tag Kurung',
                'created_by' => $this->bendahara->id,
            ]);

            $storedPath = 'sk_surat/templates/paren_unclosed.docx';
            $originalBytes = file_get_contents($docxPath);
            Storage::disk('local')->put($storedPath, $originalBytes);

            $template = SkTemplate::create([
                'folder_id' => $folder->id,
                'judul' => 'Template Kurung',
                'file_path' => $storedPath,
                'file_name_original' => 'paren_unclosed.docx',
                'detected_variables' => $report['variables'],
                'created_by' => $this->bendahara->id,
            ]);

            $dokumen = SkDokumen::create([
                'folder_id' => $folder->id,
                'template_id' => $template->id,
                'tipe' => 'generated',
                'perihal' => 'Uji Tag Kurung',
                'data_isian' => [
                    'pagu_tahap' => '100.000',
                    'nominal_valid' => 'seratus',
                    'terbilang' => 'seratus ribu rupiah',
                    'split_unclosed' => 'nilai split',
                    'nama kepsek' => 'Budi Santoso',
                ],
                'created_by' => $this->bendahara->id,
            ]);

            $generatedPath = $service->generateDocx($dokumen);
            $this->assertFileExists($generatedPath);

            $zip = new \ZipArchive;
            $this->assertTrue($zip->open($generatedPath) === true);
            $outXml = $zip->getFromName('word/document.xml');
            $zip->close();

            $dom = new \DOMDocument;
            $this->assertTrue($dom->loadXML((string) $outXml));
            $xpath = new \DOMXPath($dom);
            $xpath->registerNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main');
            $paragraphTexts = [];
            foreach ($xpath->query('//w:p') as $paragraph) {
                $line = '';
                foreach ($xpath->query('.//w:t', $paragraph) as $textNode) {
                    $line .= $textNode->textContent;
                }
                $paragraphTexts[] = $line;
            }
            $plain = implode("\n", $paragraphTexts);

            $this->assertStringContainsString('Rp. 100.000 (seratus) dan (seratus ribu rupiah)', $plain);
            $this->assertStringContainsString('Serta (nilai split) oleh Budi Santoso', $plain);
            $this->assertSame($originalBytes, Storage::disk('local')->get($storedPath));
        } finally {
            @unlink($docxPath);
            if ($generatedPath && file_exists($generatedPath)) {
                @unlink($generatedPath);
            }
        }
    }

    public function test_uploading_and_rescanning_template_with_unclosed_tag_sets_warning_flash(): void
    {
        $folder = SkFolder::create([
            'nama_folder' => 'Folder Peringatan Tag',
            'created_by' => $this->bendahara->id,
        ]);

        $docxPath = $this->createSampleDocxFile(
            extraBodyXml: '<w:p><w:r><w:t xml:space="preserve">Sebesar Rp. ${pagu_tahap} (</w:t></w:r><w:r><w:t>${terbilang</w:t></w:r><w:r><w:t>)</w:t></w:r></w:p>'
        );

        try {
            $uploadedFile = new UploadedFile(
                $docxPath,
                'surat_terbilang.docx',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                null,
                true
            );

            $uploadResponse = $this->actingAs($this->bendahara)->post("/sk-surat/folder/{$folder->id}/template", [
                'judul' => 'Surat Terbilang',
                'file' => $uploadedFile,
            ]);

            $uploadResponse->assertSessionHasNoErrors();
            $uploadResponse->assertSessionHas('warning', fn (string $msg) => str_contains($msg, '${terbilang}'));

            $template = SkTemplate::where('judul', 'Surat Terbilang')->firstOrFail();
            $this->assertContains('pagu_tahap', $template->detected_variables ?? []);
            $this->assertContains('terbilang', $template->detected_variables ?? []);

            $rescanResponse = $this->actingAs($this->bendahara)->post("/sk-surat/template/{$template->id}/rescan");
            $rescanResponse->assertSessionHasNoErrors();
            $rescanResponse->assertSessionHas('warning', fn (string $msg) => str_contains($msg, '${terbilang}'));
        } finally {
            @unlink($docxPath);
        }
    }

    private function createSampleDocxFile(bool $includeAptosFonts = false, ?string $extraBodyXml = null): string
    {
        $tmpPath = tempnam(sys_get_temp_dir(), 'test_tpl_').'.docx';

        $zip = new \ZipArchive;
        $zip->open($tmpPath, \ZipArchive::CREATE | \ZipArchive::OVERWRITE);

        $zip->addFromString('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?>
            <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
                <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
                <Default Extension="xml" ContentType="application/xml"/>
                <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
                <Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
            </Types>');

        $zip->addFromString('_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?>
            <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
                <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
            </Relationships>');

        $zip->addFromString('word/_rels/document.xml.rels', '<?xml version="1.0" encoding="UTF-8"?>
            <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
                <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>
            </Relationships>');

        $zip->addFromString('word/header1.xml', '<?xml version="1.0" encoding="UTF-8"?>
            <w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
                <w:p><w:r><w:t>${header_instansi}</w:t></w:r></w:p>
            </w:hdr>');

        if ($includeAptosFonts) {
            $zip->addFromString('word/fontTable.xml', '<?xml version="1.0" encoding="UTF-8"?>
                <w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
                    <w:font w:name="Aptos"/>
                    <w:font w:name="Aptos Display"/>
                </w:fonts>');
        }

        $aptosRunPr = $includeAptosFonts ? '<w:rPr><w:rFonts w:ascii="Aptos Display" w:hAnsi="Aptos Display"/></w:rPr>' : '';
        $aptosBodyRunPr = $includeAptosFonts ? '<w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/></w:rPr>' : '';

        $zip->addFromString('word/document.xml', '<?xml version="1.0" encoding="UTF-8"?>
            <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
                <w:body>
                    <w:p><w:r>'.$aptosRunPr.'<w:t>Nomor: ${nomor_surat}</w:t></w:r></w:p>
                    <w:p>
                        <w:r>'.$aptosBodyRunPr.'<w:t>${kepala</w:t></w:r>
                        <w:proofErr w:type="spellStart"/>
                        <w:r>'.$aptosBodyRunPr.'<w:t>_sekolah}</w:t></w:r>
                        <w:proofErr w:type="spellEnd"/>
                    </w:p>
                    <w:p><w:r><w:t xml:space="preserve">${ nama_kegiatan }</w:t></w:r></w:p>
                    <w:p>
                        <w:r>
                            <w:pict>
                                <w:txbxContent>
                                    <w:p><w:r><w:t>${catatan_kotak}</w:t></w:r></w:p>
                                </w:txbxContent>
                            </w:pict>
                        </w:r>
                    </w:p>
                    '.($extraBodyXml ?? '').'
                </w:body>
            </w:document>');

        $zip->close();

        return $tmpPath;
    }
}
