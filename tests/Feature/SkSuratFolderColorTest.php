<?php

namespace Tests\Feature;

use App\Models\SkFolder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SkSuratFolderColorTest extends TestCase
{
    use RefreshDatabase;

    protected User $bendahara;

    protected User $kepalaSekolah;

    protected function setUp(): void
    {
        parent::setUp();

        $this->bendahara = User::factory()->create([
            'username' => 'bendahara_folder_color',
            'role' => 'bendahara',
        ]);

        $this->kepalaSekolah = User::factory()->create([
            'username' => 'kepsek_folder_color',
            'role' => 'kepala_sekolah',
        ]);
    }

    public function test_bendahara_can_create_and_update_folder_with_custom_hex_and_preset_colors(): void
    {
        $createHexResponse = $this->actingAs($this->bendahara)->post('/sk-surat/folder', [
            'nama_folder' => 'Folder Hex Custom',
            'deskripsi' => 'Uji warna custom hex',
            'warna' => '#FF6B00',
        ]);

        $hexFolder = SkFolder::where('nama_folder', 'Folder Hex Custom')->firstOrFail();
        $createHexResponse->assertRedirect(route('sk-surat.show', $hexFolder->id));
        $this->assertSame('#ff6b00', $hexFolder->warna);

        $updateShortHexResponse = $this->actingAs($this->bendahara)->put("/sk-surat/folder/{$hexFolder->id}", [
            'nama_folder' => 'Folder Hex Custom',
            'deskripsi' => 'Uji normalisasi 3 digit',
            'warna' => '#09A',
        ]);

        $updateShortHexResponse->assertRedirect();
        $this->assertSame('#0099aa', $hexFolder->fresh()->warna);

        $createPresetResponse = $this->actingAs($this->bendahara)->post('/sk-surat/folder', [
            'nama_folder' => 'Folder Preset Sky',
            'warna' => 'sky',
        ]);

        $presetFolder = SkFolder::where('nama_folder', 'Folder Preset Sky')->firstOrFail();
        $createPresetResponse->assertRedirect(route('sk-surat.show', $presetFolder->id));
        $this->assertSame('sky', $presetFolder->warna);
    }

    public function test_invalid_folder_color_is_rejected_and_kepala_sekolah_is_forbidden(): void
    {
        $invalidResponse = $this->actingAs($this->bendahara)->postJson('/sk-surat/folder', [
            'nama_folder' => 'Folder Invalid',
            'warna' => 'red;background:url(x)',
        ]);

        $invalidResponse->assertUnprocessable()->assertJsonValidationErrors(['warna']);
        $this->assertDatabaseMissing('sk_folders', [
            'nama_folder' => 'Folder Invalid',
        ]);

        $forbiddenResponse = $this->actingAs($this->kepalaSekolah)->post('/sk-surat/folder', [
            'nama_folder' => 'Folder Kepsek',
            'warna' => '#7c5cff',
        ]);

        $forbiddenResponse->assertForbidden();
    }
}
