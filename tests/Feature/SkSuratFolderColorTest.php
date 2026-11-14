<?php

namespace Tests\Feature;

use App\Http\Controllers\SkSuratController;
use App\Models\SkFolder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Validator;
use Tests\TestCase;

class SkSuratFolderColorTest extends TestCase
{
    use RefreshDatabase;

    public function test_folder_validation_accepts_presets_and_hex_colors_and_rejects_invalid_values(): void
    {
        $rules = SkSuratController::folderValidationRules();

        foreach (['indigo', 'sky', 'emerald', '#A1B2C3', '#abc', null, ''] as $validColor) {
            $validator = Validator::make([
                'nama_folder' => 'Folder Contoh',
                'warna' => $validColor,
            ], $rules);

            $this->assertFalse($validator->fails(), 'Expected valid warna: '.var_export($validColor, true));
        }

        foreach (['red;background:url(x)', 'not-a-color', '#12345', '#gggggg', 'rgb(0,0,0)'] as $invalidColor) {
            $validator = Validator::make([
                'nama_folder' => 'Folder Contoh',
                'warna' => $invalidColor,
            ], $rules);

            $this->assertTrue($validator->fails(), 'Expected invalid warna to fail: '.$invalidColor);
            $this->assertArrayHasKey('warna', $validator->errors()->toArray());
        }
    }

    public function test_folder_color_normalization_and_persistence_work_for_custom_hex_and_presets(): void
    {
        $user = User::factory()->create();

        $this->assertSame('#aabbcc', SkSuratController::normalizeFolderColor('#AbC'));
        $this->assertSame('#12ef34', SkSuratController::normalizeFolderColor('#12EF34'));
        $this->assertSame('sky', SkSuratController::normalizeFolderColor('sky'));
        $this->assertSame('indigo', SkSuratController::normalizeFolderColor(null));
        $this->assertSame('indigo', SkSuratController::normalizeFolderColor(''));

        $folder = SkFolder::create([
            'nama_folder' => 'Surat Keterangan',
            'warna' => SkSuratController::normalizeFolderColor('#FF6B00'),
            'created_by' => $user->id,
        ]);

        $this->assertSame('#ff6b00', $folder->fresh()->warna);

        $folder->update([
            'warna' => SkSuratController::normalizeFolderColor('#09a'),
        ]);

        $this->assertSame('#0099aa', $folder->fresh()->warna);
    }
}
