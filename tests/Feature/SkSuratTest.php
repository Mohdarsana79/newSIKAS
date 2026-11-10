<?php

namespace Tests\Feature;

use App\Models\SkDokumen;
use App\Models\SkFolder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
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
}
