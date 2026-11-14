<?php

namespace Tests\Feature;

use App\Models\BukuKasUmum;
use App\Models\Penganggaran;
use App\Models\SekolahProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SuratPesananTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected SekolahProfile $sekolah;

    protected Penganggaran $penganggaran;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create([
            'role' => 'bendahara',
        ]);

        $this->sekolah = SekolahProfile::create([
            'nama_sekolah' => 'SDN 1 Contoh',
            'npsn' => config('app.npsn_code') ?: '12345678',
            'status_sekolah' => 'Negeri',
            'jenjang_sekolah' => 'SD',
            'kelurahan_desa' => 'Sukamaju',
            'kecamatan' => 'Cibeber',
            'kabupaten_kota' => 'Cianjur',
            'provinsi' => 'Jawa Barat',
            'alamat' => 'Jl. Pendidikan No. 1',
        ]);

        $this->penganggaran = Penganggaran::create([
            'pagu_anggaran' => 100000000,
            'tahun_anggaran' => 2026,
            'kepala_sekolah' => 'Drs. Budi Santoso',
            'sk_kepala_sekolah' => 'SK-KS-01',
            'bendahara' => 'Siti Aminah',
            'sk_bendahara' => 'SK-BD-01',
            'komite' => 'Ahmad Komite',
            'nip_kepala_sekolah' => '197001011995121001',
            'nip_bendahara' => '198202022010012002',
            'tanggal_sk_kepala_sekolah' => '2026-01-02',
            'tanggal_sk_bendahara' => '2026-01-02',
            'sekolah_id' => $this->sekolah->id,
        ]);
    }

    public function test_get_available_bku_returns_pihak_kesatu_nip_from_penganggaran(): void
    {
        $bku = BukuKasUmum::create([
            'penganggaran_id' => $this->penganggaran->id,
            'tanggal_transaksi' => '2026-03-10',
            'uraian' => 'Belanja ATK',
            'jenis_transaksi' => 'non-tunai',
            'anggaran' => 500000,
            'dibelanjakan' => 500000,
            'total_transaksi_kotor' => 500000,
        ]);

        $response = $this
            ->actingAs($this->user)
            ->getJson(route('api.surat-pesanan.bku-available', ['tahun' => '2026']));

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.0.id', $bku->id)
            ->assertJsonPath('data.0.pihak_kesatu_nama', 'Drs. Budi Santoso')
            ->assertJsonPath('data.0.pihak_kesatu_nip', '197001011995121001');
    }

    public function test_store_falls_back_to_penganggaran_nip_when_omitted_and_preserves_explicit_blank(): void
    {
        $bkuOmitted = BukuKasUmum::create([
            'penganggaran_id' => $this->penganggaran->id,
            'tanggal_transaksi' => '2026-03-11',
            'uraian' => 'Belanja Printer',
            'jenis_transaksi' => 'non-tunai',
            'anggaran' => 1500000,
            'dibelanjakan' => 1500000,
            'total_transaksi_kotor' => 1500000,
        ]);

        $this->actingAs($this->user)
            ->postJson(route('surat-pesanan.store'), [
                'buku_kas_umum_id' => $bkuOmitted->id,
                'tanggal_sp' => '2026-03-11',
                'pihak_kesatu_nama' => 'Drs. Budi Santoso',
            ])
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.pihak_kesatu_nip', '197001011995121001');

        $bkuExplicitBlank = BukuKasUmum::create([
            'penganggaran_id' => $this->penganggaran->id,
            'tanggal_transaksi' => '2026-03-12',
            'uraian' => 'Belanja Kertas',
            'jenis_transaksi' => 'non-tunai',
            'anggaran' => 250000,
            'dibelanjakan' => 250000,
            'total_transaksi_kotor' => 250000,
        ]);

        $this->actingAs($this->user)
            ->postJson(route('surat-pesanan.store'), [
                'buku_kas_umum_id' => $bkuExplicitBlank->id,
                'tanggal_sp' => '2026-03-12',
                'pihak_kesatu_nama' => 'Drs. Budi Santoso',
                'pihak_kesatu_nip' => '',
            ])
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.pihak_kesatu_nip', null);
    }
}
