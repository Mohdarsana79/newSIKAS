<?php

namespace Tests\Unit;

use App\Models\Penganggaran;
use App\Models\RefBarang;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ArkasToolTest extends TestCase
{
    use RefreshDatabase;

    public function test_arkas_tool_index_page_loads_and_queries_ref_barang()
    {
        $user = User::factory()->create([
            'username' => 'testuser',
        ]);

        RefBarang::create([
            'id_barang' => 'BRG-001',
            'nama_barang' => 'Buku Tulis Sinar Dunia',
            'kode_rekening' => '5.1.02.01.01.0024',
            'rekening' => 'Belanja Alat Tulis Kantor',
            'satuan' => 'Pcs',
            'batas_atas' => 5000,
            'tahun' => 2026,
        ]);

        $response = $this->actingAs($user)->get('/arkas-tools');

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('ArkasTools/Index')
            ->has('initialData')
            ->has('defaultYear')
            ->has('activeYears')
            ->has('localStats')
        );
    }

    public function test_arkas_tool_index_uses_active_penganggaran_years_and_defaults_to_latest()
    {
        $user = User::factory()->create([
            'username' => 'testuser',
        ]);

        foreach ([2025, 2027] as $tahun) {
            Penganggaran::create([
                'pagu_anggaran' => 50000000,
                'tahun_anggaran' => $tahun,
                'kepala_sekolah' => 'Nama Kepsek',
                'sk_kepala_sekolah' => 'SK-001',
                'bendahara' => 'Nama Bendahara',
                'sk_bendahara' => 'SK-002',
                'komite' => 'Nama Komite',
                'nip_kepala_sekolah' => '198001012005011001',
                'nip_bendahara' => '198501012010012002',
                'tanggal_sk_kepala_sekolah' => "{$tahun}-01-02",
                'tanggal_sk_bendahara' => "{$tahun}-01-02",
            ]);
        }

        $response = $this->actingAs($user)->get('/arkas-tools');

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('ArkasTools/Index')
            ->where('defaultYear', '2027')
            ->where('activeYears', ['2027', '2025'])
        );
    }

    public function test_arkas_tool_search_returns_json()
    {
        $user = User::factory()->create([
            'username' => 'testuser',
        ]);

        RefBarang::create([
            'id_barang' => 'BRG-002',
            'nama_barang' => 'Kertas HVS A4 70gr',
            'kode_rekening' => '5.1.02.01.01.0024',
            'rekening' => 'Belanja Alat Tulis Kantor',
            'satuan' => 'Rim',
            'batas_atas' => 55000,
            'tahun' => 2026,
        ]);

        $response = $this->actingAs($user)->getJson('/arkas-tools/search?keyword=Kertas&year=2026');

        $response->assertStatus(200);
        $response->assertJson([
            'status' => 'success',
            'source' => 'local_database',
        ]);
        $response->assertJsonFragment([
            'nama_barang' => 'Kertas HVS A4 70gr',
        ]);
    }
}
