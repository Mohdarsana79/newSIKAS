<?php

namespace Tests\Unit;

use App\Models\User;
use App\Services\Ai\DeepSeekService;
use Mockery;
use Tests\TestCase;

class BkuAiUraianAssistantTest extends TestCase
{
    public function test_generate_ai_uraian_requires_authenticated_user()
    {
        $response = $this->postJson(route('api.bku.ai-generate-uraian'), []);
        // Karena route dilindungi auth, akan redirect atau return 401
        $this->assertTrue(in_array($response->status(), [401, 302]));
    }

    public function test_generate_ai_uraian_returns_403_if_no_deepseek_api_key()
    {
        $user = new User;
        $user->id = 1;
        $user->name = 'Bendahara SIKAS';
        $user->email = 'bendahara@sekolah.id';
        $user->deepseek_api_key = null;

        $this->actingAs($user);

        $response = $this->postJson(route('api.bku.ai-generate-uraian'), [
            'nama_rekanan' => 'Toko Sahabat Edukasi',
            'kegiatan' => '03.01 - Pelaksanaan KBM',
            'rekening' => '5.1.02.01.01.0024 - Belanja ATK',
        ]);

        $response->assertStatus(403);
        $response->assertJson([
            'success' => false,
            'error_type' => 'NO_API_KEY',
        ]);
    }

    public function test_generate_ai_uraian_success_with_mock_deepseek()
    {
        $user = new User;
        $user->id = 1;
        $user->name = 'Bendahara SIKAS';
        $user->email = 'bendahara@sekolah.id';
        $user->deepseek_api_key = 'sk-mock-key-12345';

        $this->actingAs($user);

        $mockDeepSeek = Mockery::mock(DeepSeekService::class);
        $mockDeepSeek->shouldReceive('callChat')
            ->once()
            ->andReturn([
                'success' => true,
                'content' => '"Pembayaran belanja alat tulis kantor berupa Kertas HVS A4 untuk keperluan Kegiatan KBM pada Toko Sahabat Edukasi"',
            ]);

        $this->app->instance(DeepSeekService::class, $mockDeepSeek);

        $response = $this->postJson(route('api.bku.ai-generate-uraian'), [
            'nama_rekanan' => 'Toko Sahabat Edukasi',
            'kegiatan' => '03.01 - Pelaksanaan KBM',
            'rekening' => '5.1.02.01.01.0024 - Belanja ATK',
            'items' => [
                ['uraian' => 'Kertas HVS A4', 'volume' => 5, 'satuan' => 'Rim'],
            ],
            'jenis_transaksi' => 'tunai',
            'variant_index' => 0,
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'uraian' => 'Pembayaran belanja alat tulis kantor berupa Kertas HVS A4 untuk keperluan Kegiatan KBM pada Toko Sahabat Edukasi',
            'variant_index' => 0,
        ]);
    }
}
