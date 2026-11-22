<?php

namespace Tests\Feature;

use App\Config\PermissionCatalog;
use App\Models\KinerjaPenganggaran;
use App\Models\Penganggaran;
use App\Models\Role;
use App\Models\SekolahProfile;
use App\Models\User;
use App\Services\ArkasEngineService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Mockery;
use Tests\TestCase;

class PenganggaranArkasCheckTest extends TestCase
{
    use RefreshDatabase;

    private function createSekolah(): SekolahProfile
    {
        return SekolahProfile::create([
            'nama_sekolah' => 'SMP Muhammadiyah Soni',
            'npsn' => '40202255',
            'status_sekolah' => 'Swasta',
            'jenjang_sekolah' => 'SMP',
            'kelurahan_desa' => 'Paddumpu',
            'kecamatan' => 'Dampal Selatan',
            'kabupaten_kota' => 'Tolitoli',
            'provinsi' => 'Sulawesi Tengah',
            'alamat' => 'Jl. Santa No. 150',
        ]);
    }

    public function test_check_arkas_returns_budget_and_officials_for_reguler_and_kinerja_variants(): void
    {
        $bendahara = User::factory()->create(['role' => 'bendahara']);

        $mock = Mockery::mock(ArkasEngineService::class);
        $mock->shouldReceive('runScriptRaw')
            ->once()
            ->with('check_anggaran.py', ['2026', '1'], 30)
            ->andReturn([
                'status' => 'success',
                'exists' => true,
                'id_anggaran' => 'ang-reg-2026',
                'tahun' => 2026,
                'sumber_dana_id' => 1,
                'sumber_dana' => 'BOS Reguler',
                'pagu' => 29000000,
                'is_approve' => 1,
                'is_revisi' => 0,
                'penanggung_jawab' => [
                    'kepala_sekolah' => 'Dra. Masitah Abdullah',
                    'nip_kepala_sekolah' => '196909172007012017',
                    'bendahara' => 'Siti Aminah',
                    'nip_bendahara' => '198001012005012001',
                    'komite' => 'Sapri Hi Sabe',
                ],
                'available_years' => [2027, 2026, 2025],
            ]);

        $mock->shouldReceive('runScriptRaw')
            ->once()
            ->with('check_anggaran.py', ['2026', '12'], 30)
            ->andReturn([
                'status' => 'success',
                'exists' => true,
                'id_anggaran' => 'ang-kin-2026',
                'tahun' => 2026,
                'sumber_dana_id' => 12,
                'sumber_dana' => 'BOS Kinerja',
                'pagu' => 45000000,
                'is_approve' => 1,
                'is_revisi' => 0,
                'penanggung_jawab' => [
                    'kepala_sekolah' => 'Dra. Masitah Abdullah',
                    'nip_kepala_sekolah' => '196909172007012017',
                    'bendahara' => 'Siti Aminah',
                    'nip_bendahara' => '198001012005012001',
                    'komite' => 'Sapri Hi Sabe',
                ],
                'available_years' => [2026],
            ]);

        $this->app->instance(ArkasEngineService::class, $mock);

        $this->actingAs($bendahara)
            ->getJson('/penganggaran/check-arkas?tahun=2026')
            ->assertOk()
            ->assertJson([
                'status' => 'success',
                'exists' => true,
                'tahun' => 2026,
                'sumber_dana_id' => 1,
                'sumber_dana' => 'BOS Reguler',
                'pagu' => 29000000,
                'penanggung_jawab' => [
                    'kepala_sekolah' => 'Dra. Masitah Abdullah',
                    'nip_kepala_sekolah' => '196909172007012017',
                    'bendahara' => 'Siti Aminah',
                    'nip_bendahara' => '198001012005012001',
                    'komite' => 'Sapri Hi Sabe',
                ],
                'available_years' => [2027, 2026, 2025],
            ]);

        $this->actingAs($bendahara)
            ->getJson('/kinerja/penganggaran/check-arkas?tahun=2026')
            ->assertOk()
            ->assertJson([
                'status' => 'success',
                'exists' => true,
                'sumber_dana_id' => 12,
                'pagu' => 45000000,
            ]);
    }

    public function test_check_arkas_returns_exists_false_with_available_years(): void
    {
        $bendahara = User::factory()->create(['role' => 'bendahara']);

        $mock = Mockery::mock(ArkasEngineService::class);
        $mock->shouldReceive('runScriptRaw')
            ->once()
            ->with('check_anggaran.py', ['2028', '1'], 30)
            ->andReturn([
                'status' => 'success',
                'exists' => false,
                'tahun' => 2028,
                'sumber_dana_id' => 1,
                'sumber_dana' => 'BOS Reguler',
                'available_years' => [2027, 2026, 2025],
                'message' => 'Tidak ditemukan data anggaran BOS Reguler di ARKAS untuk Tahun 2028.',
            ]);
        $this->app->instance(ArkasEngineService::class, $mock);

        $this->actingAs($bendahara)
            ->getJson('/penganggaran/check-arkas?tahun=2028')
            ->assertOk()
            ->assertJson([
                'status' => 'success',
                'exists' => false,
                'available_years' => [2027, 2026, 2025],
            ]);
    }

    public function test_check_arkas_returns_422_when_arkas_database_is_missing_or_tahun_invalid(): void
    {
        $bendahara = User::factory()->create(['role' => 'bendahara']);

        $this->actingAs($bendahara)
            ->getJson('/penganggaran/check-arkas?tahun=abc')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['tahun']);

        $mock = Mockery::mock(ArkasEngineService::class);
        $mock->shouldReceive('runScriptRaw')
            ->once()
            ->with('check_anggaran.py', ['2026', '1'], 30)
            ->andReturn([
                'status' => 'error',
                'error_type' => 'DB_NOT_FOUND',
                'message' => 'Database arkas.db tidak ditemukan.',
            ]);
        $this->app->instance(ArkasEngineService::class, $mock);

        $this->actingAs($bendahara)
            ->getJson('/penganggaran/check-arkas?tahun=2026')
            ->assertStatus(422)
            ->assertJson([
                'status' => 'error',
                'error_type' => 'DB_NOT_FOUND',
            ]);
    }

    public function test_check_arkas_blocks_unauthorized_role_via_rbac(): void
    {
        Role::create([
            'slug' => 'tanpa_penganggaran',
            'name' => 'Tanpa Penganggaran',
            'is_system' => false,
            'permissions' => PermissionCatalog::defaultPermissionsForRole('tanpa_penganggaran'),
        ]);
        $limitedUser = User::factory()->create(['role' => 'tanpa_penganggaran']);

        $this->actingAs($limitedUser)
            ->getJson('/penganggaran/check-arkas?tahun=2026')
            ->assertForbidden();
    }

    public function test_penganggaran_index_passes_official_history_with_reguler_fallback_for_non_reguler_variant(): void
    {
        $this->withoutVite();

        $bendahara = User::factory()->create(['role' => 'bendahara']);
        $sekolah = $this->createSekolah();

        Penganggaran::create([
            'sekolah_id' => $sekolah->id,
            'pagu_anggaran' => 31320000,
            'tahun_anggaran' => '2025',
            'kepala_sekolah' => 'Drs. Ahmad Reguler',
            'nip_kepala_sekolah' => '197001012000011001',
            'sk_kepala_sekolah' => 'SK-KS-2025',
            'tanggal_sk_kepala_sekolah' => '2025-01-05',
            'bendahara' => 'Budi Bendahara',
            'nip_bendahara' => '198501012010011002',
            'sk_bendahara' => 'SK-BEND-2025',
            'tanggal_sk_bendahara' => '2025-01-06',
            'komite' => 'H. Sapri Komite',
        ]);

        KinerjaPenganggaran::create([
            'sekolah_id' => $sekolah->id,
            'pagu_anggaran' => 45000000,
            'tahun_anggaran' => '2024',
            'kepala_sekolah' => 'Drs. Ahmad Kinerja',
            'nip_kepala_sekolah' => '197001012000011001',
            'sk_kepala_sekolah' => 'SK-KS-2024',
            'tanggal_sk_kepala_sekolah' => '2024-01-05',
            'bendahara' => 'Ani Bendahara',
            'nip_bendahara' => '198801012010012003',
            'sk_bendahara' => 'SK-BEND-2024',
            'tanggal_sk_bendahara' => '2024-01-06',
            'komite' => 'H. Sapri Lama',
        ]);

        $this->actingAs($bendahara)
            ->get('/kinerja/penganggaran')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Penganggaran/Index')
                ->where('variant', 'kinerja')
                ->has('official_history', 2)
                ->where('official_history.0.source_variant', 'kinerja')
                ->where('official_history.0.tahun_anggaran', '2024')
                ->where('official_history.0.sk_kepala_sekolah', 'SK-KS-2024')
                ->where('official_history.1.source_variant', 'reguler')
                ->where('official_history.1.tahun_anggaran', '2025')
                ->where('official_history.1.sk_bendahara', 'SK-BEND-2025')
            );
    }
}
