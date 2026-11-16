<?php

namespace Tests\Feature;

use App\Models\SekolahProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Blade;
use Tests\TestCase;

class KopSuratDokumenTest extends TestCase
{
    use RefreshDatabase;

    public function test_has_kop_for_doc_helper(): void
    {
        $sekolah = SekolahProfile::create([
            'nama_sekolah' => 'SMP Negeri 1 Testing',
            'npsn' => '12345678',
            'status_sekolah' => 'Negeri',
            'jenjang_sekolah' => 'SMP',
            'kelurahan_desa' => 'Desa Testing',
            'kecamatan' => 'Kecamatan Testing',
            'kabupaten_kota' => 'Kabupaten Testing',
            'provinsi' => 'Provinsi Testing',
            'alamat' => 'Jl. Pendidikan No. 1',
            'kop_surat' => 'kop_surat/test.png',
            'kop_dokumen' => [
                'rkas_alur_kas' => true,
                'bku_bkp_bank' => true,
                'rkas_perubahan_rka_rekap' => false,
            ],
        ]);

        $this->assertTrue($sekolah->hasKopForDoc('rkas_alur_kas'));
        $this->assertTrue($sekolah->hasKopForDoc('bku_bkp_bank'));
        $this->assertFalse($sekolah->hasKopForDoc('rkas_perubahan_rka_rekap'));
        $this->assertFalse($sekolah->hasKopForDoc('unknown_doc'));

        // If kop_surat is empty, it should return false even if toggled true
        $sekolah->kop_surat = null;
        $sekolah->save();
        $this->assertFalse($sekolah->hasKopForDoc('rkas_alur_kas'));
    }

    public function test_authenticated_user_can_update_kop_dokumen(): void
    {
        $user = User::factory()->create([
            'role' => 'bendahara',
        ]);

        $sekolah = SekolahProfile::create([
            'nama_sekolah' => 'SMP Negeri 1 Testing',
            'npsn' => '12345678',
            'status_sekolah' => 'Negeri',
            'jenjang_sekolah' => 'SMP',
            'kelurahan_desa' => 'Desa Testing',
            'kecamatan' => 'Kecamatan Testing',
            'kabupaten_kota' => 'Kabupaten Testing',
            'provinsi' => 'Provinsi Testing',
            'alamat' => 'Jl. Pendidikan No. 1',
            'kop_surat' => 'kop_surat/test.png',
            'kop_dokumen' => [],
        ]);

        $response = $this->actingAs($user)->postJson(route('sekolah-profile.update-kop-dokumen', $sekolah->id), [
            'kop_dokumen' => [
                'rkas_alur_kas' => true,
                'rkas_lembar_kerja_221' => true,
                'bku_bkp_umum' => true,
            ],
        ]);

        $response->assertOk();
        $response->assertJson(['success' => true]);

        $sekolah->refresh();
        $this->assertTrue($sekolah->hasKopForDoc('rkas_alur_kas'));
        $this->assertTrue($sekolah->hasKopForDoc('rkas_lembar_kerja_221'));
        $this->assertTrue($sekolah->hasKopForDoc('bku_bkp_umum'));
        $this->assertFalse($sekolah->hasKopForDoc('bku_rob'));
    }

    public function test_guest_cannot_update_kop_dokumen(): void
    {
        $sekolah = SekolahProfile::create([
            'nama_sekolah' => 'SMP Negeri 1 Testing',
            'npsn' => '12345678',
            'status_sekolah' => 'Negeri',
            'jenjang_sekolah' => 'SMP',
            'kelurahan_desa' => 'Desa Testing',
            'kecamatan' => 'Kecamatan Testing',
            'kabupaten_kota' => 'Kabupaten Testing',
            'provinsi' => 'Provinsi Testing',
            'alamat' => 'Jl. Pendidikan No. 1',
            'kop_surat' => 'kop_surat/test.png',
            'kop_dokumen' => [],
        ]);

        $response = $this->postJson(route('sekolah-profile.update-kop-dokumen', $sekolah->id), [
            'kop_dokumen' => [
                'rkas_alur_kas' => true,
            ],
        ]);

        $response->assertUnauthorized();
    }

    public function test_doc_kop_surat_blade_renders_dynamic_html_table(): void
    {
        $storageDir = storage_path('app/public/kop_surat');
        if (! file_exists($storageDir)) {
            mkdir($storageDir, 0755, true);
        }
        $dummyImagePath = $storageDir.'/blade_test.png';
        file_put_contents($dummyImagePath, base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='));

        try {
            $sekolah = SekolahProfile::create([
                'nama_sekolah' => 'SMP Negeri 1 Testing',
                'npsn' => '12345678',
                'status_sekolah' => 'Negeri',
                'jenjang_sekolah' => 'SMP',
                'kelurahan_desa' => 'Desa Testing',
                'kecamatan' => 'Kecamatan Testing',
                'kabupaten_kota' => 'Kabupaten Testing',
                'provinsi' => 'Provinsi Testing',
                'alamat' => 'Jl. Pendidikan No. 1',
                'logo_daerah' => 'kop_surat/blade_test.png',
                'logo_sekolah' => 'kop_surat/blade_test.png',
                'kop_mode' => '2_logo',
                'kop_teks_html' => '<p><strong>PEMERINTAH KABUPATEN TESTING</strong></p><p>SMP NEGERI 1 TESTING</p>',
                'kop_surat' => 'kop_surat/blade_test.png',
                'kop_border' => 'double',
                'kop_dokumen' => [
                    'bku_realisasi' => true,
                ],
            ]);

            // Test 1: Dynamic HTML Table render
            $rendered = view('partials.doc_kop_surat', [
                'docKey' => 'bku_realisasi',
                'sekolah' => $sekolah,
            ])->render();

            $this->assertStringContainsString('doc-kop-table', $rendered);
            $this->assertStringContainsString('PEMERINTAH KABUPATEN TESTING', $rendered);
            $this->assertStringContainsString('SMP NEGERI 1 TESTING', $rendered);
            $this->assertStringContainsString('data:image/png;base64,', $rendered);

            // Test 2: Fallback to single image when kop_teks_html is null
            $sekolah->kop_teks_html = null;
            $sekolah->save();

            $renderedFallback = view('partials.doc_kop_surat', [
                'docKey' => 'bku_realisasi',
                'sekolah' => $sekolah,
            ])->render();

            $this->assertStringContainsString('max-height: 95px;', $renderedFallback);
            $this->assertStringContainsString('data:image/png;base64,', $renderedFallback);
        } finally {
            if (file_exists($dummyImagePath)) {
                unlink($dummyImagePath);
            }
        }
    }

    public function test_pelengkap_and_laporan_kop_dokumen_keys_and_loop_once_style(): void
    {
        $pelengkapKeys = [
            'pelengkap_kwitansi',
            'pelengkap_tanda_terima',
            'laporan_sptj',
            'laporan_spmth',
            'laporan_sp2b',
            'laporan_lph',
        ];

        $sekolah = SekolahProfile::create([
            'nama_sekolah' => 'SMP Negeri 1 Testing',
            'npsn' => '12345678',
            'status_sekolah' => 'Negeri',
            'jenjang_sekolah' => 'SMP',
            'kelurahan_desa' => 'Desa Testing',
            'kecamatan' => 'Kecamatan Testing',
            'kabupaten_kota' => 'Kabupaten Testing',
            'provinsi' => 'Provinsi Testing',
            'alamat' => 'Jl. Pendidikan No. 1',
            'kop_teks_html' => '<p><strong>PEMERINTAH KABUPATEN TESTING</strong></p>',
            'kop_dokumen' => array_fill_keys($pelengkapKeys, true),
        ]);

        foreach ($pelengkapKeys as $key) {
            $this->assertTrue($sekolah->hasKopForDoc($key));
            $renderedEnabled = view('partials.doc_kop_surat', [
                'docKey' => $key,
                'sekolah' => $sekolah,
            ])->render();
            $this->assertStringContainsString('doc-kop-table', $renderedEnabled);
        }

        // Disable SPTJ and verify doc_kop_surat renders completely empty (no fallback header)
        $docs = $sekolah->kop_dokumen;
        $docs['laporan_sptj'] = false;
        $sekolah->kop_dokumen = $docs;
        $sekolah->save();

        $this->assertFalse($sekolah->hasKopForDoc('laporan_sptj'));
        $this->assertSame('', trim(view('partials.doc_kop_surat', [
            'docKey' => 'laporan_sptj',
            'sekolah' => $sekolah,
        ])->render()));
        $this->assertTrue($sekolah->hasKopForDoc('pelengkap_kwitansi'));

        // Verify @once suppresses duplicate <style> blocks inside @foreach loops
        $loopHtml = Blade::render(
            '@foreach([1, 2, 3] as $i) @include("partials.doc_kop_surat", ["docKey" => "pelengkap_kwitansi", "sekolah" => $sekolah]) @endforeach',
            ['sekolah' => $sekolah]
        );

        $this->assertSame(1, substr_count($loopHtml, '<style>'));
        $this->assertSame(3, substr_count($loopHtml, '<table class="doc-kop-table">'));
    }
}
