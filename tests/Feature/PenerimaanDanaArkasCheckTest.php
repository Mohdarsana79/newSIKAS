<?php

namespace Tests\Feature;

use App\Config\PermissionCatalog;
use App\Models\KinerjaPenganggaran;
use App\Models\PenerimaanDana;
use App\Models\Penganggaran;
use App\Models\Role;
use App\Models\SekolahProfile;
use App\Models\SilpaPenganggaran;
use App\Models\User;
use App\Services\ArkasEngineService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Mockery;
use Tests\TestCase;

class PenerimaanDanaArkasCheckTest extends TestCase
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

    private function createPenganggaran(string $modelClass, SekolahProfile $sekolah, int $tahun = 2026)
    {
        return $modelClass::create([
            'sekolah_id' => $sekolah->id,
            'pagu_anggaran' => 29000000,
            'tahun_anggaran' => $tahun,
            'kepala_sekolah' => 'Dra. Masitah Abdullah',
            'nip_kepala_sekolah' => '196909172007012017',
            'sk_kepala_sekolah' => 'SK-KS-2026',
            'tanggal_sk_kepala_sekolah' => "{$tahun}-01-02",
            'bendahara' => 'Siti Aminah',
            'nip_bendahara' => '198001012005012001',
            'sk_bendahara' => 'SK-BEND-2026',
            'tanggal_sk_bendahara' => "{$tahun}-01-02",
            'komite' => 'Sapri Hi Sabe',
        ]);
    }

    public function test_check_arkas_maps_stages_saldo_awal_and_already_recorded_flag_for_reguler(): void
    {
        $bendahara = User::factory()->create(['role' => 'bendahara']);
        $sekolah = $this->createSekolah();
        $penganggaran = $this->createPenganggaran(Penganggaran::class, $sekolah, 2026);

        // Tahap 1 sudah tercatat di SIKAS, Tahap 2 belum tercatat
        PenerimaanDana::create([
            'penganggaran_id' => $penganggaran->id,
            'sumber_dana' => 'Bosp Reguler Tahap 1',
            'tanggal_terima' => '2026-01-20',
            'jumlah_dana' => 14500000,
        ]);

        $mock = Mockery::mock(ArkasEngineService::class);
        $mock->shouldReceive('runScriptRaw')
            ->once()
            ->with('check_penerimaan.py', ['2026', '1'], 30)
            ->andReturn([
                'status' => 'success',
                'exists' => true,
                'tahun' => 2026,
                'sumber_dana_id' => 1,
                'sumber_dana' => 'BOS Reguler',
                'saldo_awal' => 1250000,
                'tanggal_saldo_awal' => '2026-01-01',
                'items' => [
                    [
                        'tahap' => 1,
                        'tanggal_terima' => '2026-01-20',
                        'jumlah_dana' => 14500000,
                        'uraian' => 'Terima Dana BOSP Tahap 1 2026',
                        'source' => 'bku',
                    ],
                    [
                        'tahap' => 2,
                        'tanggal_terima' => '2026-08-06',
                        'jumlah_dana' => 14500000,
                        'uraian' => 'Salur BOS Reguler Tahap 2 2026',
                        'source' => 'salur',
                    ],
                ],
            ]);
        $this->app->instance(ArkasEngineService::class, $mock);

        $this->actingAs($bendahara)
            ->getJson("/penerimaan-dana/check-arkas/{$penganggaran->id}")
            ->assertOk()
            ->assertJson([
                'status' => 'success',
                'exists' => true,
                'tahun' => 2026,
                'sumber_dana_label' => 'BOS Reguler',
                'items' => [
                    [
                        'tahap' => 1,
                        'sumber_dana' => 'Bosp Reguler Tahap 1',
                        'tanggal_terima' => '2026-01-20',
                        'jumlah_dana' => 14500000,
                        'saldo_awal' => 1250000,
                        'tanggal_saldo_awal' => '2026-01-01',
                        'source' => 'bku',
                        'already_recorded' => true,
                    ],
                    [
                        'tahap' => 2,
                        'sumber_dana' => 'Bosp Reguler Tahap 2',
                        'tanggal_terima' => '2026-08-06',
                        'jumlah_dana' => 14500000,
                        'saldo_awal' => null,
                        'tanggal_saldo_awal' => null,
                        'source' => 'salur',
                        'already_recorded' => false,
                    ],
                ],
            ]);
    }

    public function test_check_arkas_supports_kinerja_and_silpa_variants(): void
    {
        $bendahara = User::factory()->create(['role' => 'bendahara']);
        $sekolah = $this->createSekolah();
        $kinerja = $this->createPenganggaran(KinerjaPenganggaran::class, $sekolah, 2026);
        $silpa = $this->createPenganggaran(SilpaPenganggaran::class, $sekolah, 2026);

        $mock = Mockery::mock(ArkasEngineService::class);
        $mock->shouldReceive('runScriptRaw')
            ->once()
            ->with('check_penerimaan.py', ['2026', '12'], 30)
            ->andReturn([
                'status' => 'success',
                'exists' => true,
                'tahun' => 2026,
                'sumber_dana_id' => 12,
                'sumber_dana' => 'BOS Kinerja',
                'saldo_awal' => 0,
                'tanggal_saldo_awal' => null,
                'items' => [
                    [
                        'tahap' => 1,
                        'tanggal_terima' => '2026-05-10',
                        'jumlah_dana' => 45000000,
                        'uraian' => 'Terima Dana BOSP Kinerja Tahap 1',
                        'source' => 'bku',
                    ],
                ],
            ]);

        $mock->shouldReceive('runScriptRaw')
            ->once()
            ->with('check_penerimaan.py', ['2026', '33'], 30)
            ->andReturn([
                'status' => 'success',
                'exists' => true,
                'tahun' => 2026,
                'sumber_dana_id' => 33,
                'sumber_dana' => 'SiLPA BOS Reguler',
                'saldo_awal' => 500000,
                'tanggal_saldo_awal' => '2026-01-01',
                'items' => [
                    [
                        'tahap' => null,
                        'tanggal_terima' => '2026-01-05',
                        'jumlah_dana' => 5000000,
                        'uraian' => 'Penerimaan SiLPA Reguler',
                        'source' => 'bku',
                    ],
                ],
            ]);
        $this->app->instance(ArkasEngineService::class, $mock);

        $this->actingAs($bendahara)
            ->getJson("/kinerja/penerimaan-dana/check-arkas/{$kinerja->id}")
            ->assertOk()
            ->assertJsonPath('items.0.sumber_dana', 'Bosp Kinerja Tahap 1')
            ->assertJsonPath('items.0.already_recorded', false);

        $this->actingAs($bendahara)
            ->getJson("/silpa/penerimaan-dana/check-arkas/{$silpa->id}")
            ->assertOk()
            ->assertJsonPath('items.0.sumber_dana', 'SiLPA BOSP Reguler')
            ->assertJsonPath('items.0.saldo_awal', null)
            ->assertJsonPath('items.0.already_recorded', false);
    }

    public function test_check_arkas_handles_empty_result_and_engine_error(): void
    {
        $bendahara = User::factory()->create(['role' => 'bendahara']);
        $sekolah = $this->createSekolah();
        $penganggaran = $this->createPenganggaran(Penganggaran::class, $sekolah, 2026);

        $mock = Mockery::mock(ArkasEngineService::class);
        $mock->shouldReceive('runScriptRaw')
            ->once()
            ->with('check_penerimaan.py', ['2026', '1'], 30)
            ->andReturn([
                'status' => 'success',
                'exists' => false,
                'tahun' => 2026,
                'sumber_dana_id' => 1,
                'sumber_dana' => 'BOS Reguler',
                'items' => [],
                'message' => 'Tidak ditemukan data penerimaan dana BOS Reguler di ARKAS untuk Tahun 2026.',
            ]);

        $mock->shouldReceive('runScriptRaw')
            ->once()
            ->with('check_penerimaan.py', ['2026', '1'], 30)
            ->andReturn([
                'status' => 'error',
                'error_type' => 'DB_NOT_FOUND',
                'message' => 'Database arkas.db tidak ditemukan.',
            ]);
        $this->app->instance(ArkasEngineService::class, $mock);

        $this->actingAs($bendahara)
            ->getJson("/penerimaan-dana/check-arkas/{$penganggaran->id}")
            ->assertOk()
            ->assertJson([
                'status' => 'success',
                'exists' => false,
                'items' => [],
            ]);

        $this->actingAs($bendahara)
            ->getJson("/penerimaan-dana/check-arkas/{$penganggaran->id}")
            ->assertStatus(422)
            ->assertJson([
                'status' => 'error',
                'error_type' => 'DB_NOT_FOUND',
            ]);
    }

    public function test_check_arkas_blocks_unauthorized_role_via_rbac(): void
    {
        $sekolah = $this->createSekolah();
        $penganggaran = $this->createPenganggaran(Penganggaran::class, $sekolah, 2026);

        Role::create([
            'slug' => 'tanpa_penatausahaan',
            'name' => 'Tanpa Penatausahaan',
            'is_system' => false,
            'permissions' => PermissionCatalog::defaultPermissionsForRole('tanpa_penatausahaan'),
        ]);
        $limited = User::factory()->create(['role' => 'tanpa_penatausahaan']);

        $this->actingAs($limited)
            ->getJson("/penerimaan-dana/check-arkas/{$penganggaran->id}")
            ->assertForbidden();
    }

    public function test_penatausahaan_index_exposes_sumber_dana_tahap_2_prop_per_variant(): void
    {
        $this->withoutVite();
        $bendahara = User::factory()->create(['role' => 'bendahara']);

        $this->actingAs($bendahara)
            ->get('/penatausahaan')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Penatausahaan/Index')
                ->where('sumberDanaTahap2', 'Bosp Reguler Tahap 2')
            );

        $this->actingAs($bendahara)
            ->get('/silpa/penatausahaan')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Penatausahaan/Index')
                ->where('sumberDanaTahap2', null)
            );
    }
}
