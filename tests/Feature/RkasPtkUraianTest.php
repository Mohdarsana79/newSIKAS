<?php

namespace Tests\Feature;

use App\Config\PermissionCatalog;
use App\Models\KodeKegiatan;
use App\Models\Penganggaran;
use App\Models\RefBarang;
use App\Models\RefPtk;
use App\Models\RefSatuan;
use App\Models\RekeningBelanja;
use App\Models\Role;
use App\Models\User;
use App\Services\ArkasEngineService;
use App\Services\RefPtkService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RkasPtkUraianTest extends TestCase
{
    use RefreshDatabase;

    private function createBendahara(): User
    {
        return User::factory()->create([
            'role' => 'bendahara',
        ]);
    }

    public function test_by_rekening_uses_ptk_mode_strictly_for_07_12_and_honor_guru_rekening(): void
    {
        $user = $this->createBendahara();

        RefBarang::create([
            'id_barang' => '8.1.02.02.01.0013.00001',
            'nama_barang' => 'Belanja Jasa Tenaga Pendidikan-Honorarium Pelatih Paskibraka',
            'kode_rekening' => '5.1.02.02.01.0013',
            'rekening' => 'Belanja Jasa Tenaga Pendidikan / Honorarium Guru',
            'satuan' => 'OH',
            'batas_atas' => 75000,
            'tahun' => 2027,
        ]);

        // Guru aktif dengan NUPTK
        RefPtk::create([
            'tahun' => 2027,
            'ptk_id' => 'ptk-1',
            'nuptk' => '0938767668130252',
            'nama' => 'HUSNI',
            'jenis_ptk_arkas' => RefPtk::JENIS_GURU,
            'is_active' => true,
            'sumber' => RefPtk::SUMBER_ARKAS,
        ]);

        // Guru aktif tanpa NUPTK
        RefPtk::create([
            'tahun' => 2027,
            'ptk_id' => 'ptk-2',
            'nuptk' => null,
            'nama' => 'SELPIANTI',
            'jenis_ptk_arkas' => RefPtk::JENIS_GURU,
            'is_active' => true,
            'sumber' => RefPtk::SUMBER_ARKAS,
        ]);

        // Guru nonaktif (soft_delete = 1) -> harus dikecualikan
        RefPtk::create([
            'tahun' => 2027,
            'ptk_id' => 'ptk-3',
            'nuptk' => '1111222233334444',
            'nama' => 'GURU NONAKTIF',
            'jenis_ptk_arkas' => RefPtk::JENIS_GURU,
            'is_active' => false,
            'sumber' => RefPtk::SUMBER_ARKAS,
        ]);

        // ASN / PNS / Kepsek (jenis 90) walau is_active=true -> harus dikecualikan
        RefPtk::create([
            'tahun' => 2027,
            'ptk_id' => 'ptk-asn',
            'nuptk' => '9999888877776666',
            'nama' => 'MASITAH ABDULLAH',
            'jenis_ptk_arkas' => RefPtk::JENIS_ASN,
            'is_active' => true,
            'sumber' => RefPtk::SUMBER_ARKAS,
        ]);

        // Barang SSH pada rekening tendik (0026) -> pada 07.12.02-04 tetap harus mode manual, bukan SSH!
        RefBarang::create([
            'id_barang' => '8.1.02.02.01.0026.00001',
            'nama_barang' => 'Belanja Jasa Tenaga Administrasi-Honor',
            'kode_rekening' => '5.1.02.02.01.0026',
            'rekening' => 'Belanja Jasa Tenaga Administrasi',
            'satuan' => 'OB',
            'batas_atas' => 500000,
            'tahun' => 2027,
        ]);

        // 1. Kegiatan 07.12.01. + Rekening Honor Guru -> HANYA mode PTK Guru (tanpa switch SSH)
        $resPtk = $this->actingAs($user)->getJson(route('arkas-tools.by-rekening', [
            'year' => 2027,
            'kode_kegiatan' => '07.12.01.',
            'kode_rekening' => '5.1.02.02.01.0013',
        ]));

        $resPtk->assertOk()
            ->assertJsonPath('catalog_mode', 'ptk')
            ->assertJsonPath('supports_ptk', true)
            ->assertJsonPath('has_ssh_fallback', false)
            ->assertJsonPath('ssh_count', 0)
            ->assertJsonPath('ptk_count', 2)
            ->assertJsonCount(2, 'ptk_items');

        $formatted = collect($resPtk->json('ptk_items'))->pluck('formatted_uraian')->all();
        $this->assertEqualsCanonicalizing(['HUSNI (0938767668130252)', 'SELPIANTI'], $formatted);

        // 2. Kegiatan 07.12.02. s.d. 07.12.04. -> mode manual (ketik sendiri, tanpa dropdown PTK maupun SSH)
        foreach (['07.12.02.', '07.12.03.', '07.12.04.'] as $manualKeg) {
            $resManual = $this->actingAs($user)->getJson(route('arkas-tools.by-rekening', [
                'year' => 2027,
                'kode_kegiatan' => $manualKeg,
                'kode_rekening' => '5.1.02.02.01.0026',
            ]));

            $resManual->assertOk()
                ->assertJsonPath('catalog_mode', 'manual')
                ->assertJsonPath('is_honor_manual', true)
                ->assertJsonPath('supports_ptk', false)
                ->assertJsonPath('has_rekening_catalog', false)
                ->assertJsonCount(0, 'data')
                ->assertJsonCount(0, 'ptk_items');
        }

        // 3. Kegiatan non-07.12.* (mis. 06.07.12.) + Rekening 0013 -> tetap mode SSH!
        $resSshAuto = $this->actingAs($user)->getJson(route('arkas-tools.by-rekening', [
            'year' => 2027,
            'kode_kegiatan' => '06.07.12.',
            'kode_rekening' => '5.1.02.02.01.0013',
        ]));

        $resSshAuto->assertOk()
            ->assertJsonPath('catalog_mode', 'ssh')
            ->assertJsonPath('supports_ptk', false)
            ->assertJsonCount(1, 'data');
    }

    public function test_rkas_store_allows_honor_ptk_price_above_ssh_cap(): void
    {
        $user = $this->createBendahara();

        $penganggaran = Penganggaran::create([
            'pagu_anggaran' => 50000000,
            'tahun_anggaran' => 2027,
            'kepala_sekolah' => 'Kepsek',
            'sk_kepala_sekolah' => 'SK-KS-2027',
            'nip_kepala_sekolah' => '123456',
            'tanggal_sk_kepala_sekolah' => '2027-01-02',
            'bendahara' => 'Bendahara',
            'sk_bendahara' => 'SK-B-2027',
            'nip_bendahara' => '654321',
            'tanggal_sk_bendahara' => '2027-01-02',
            'komite' => 'Komite',
        ]);

        $kegiatan = KodeKegiatan::create([
            'tahun' => 2027,
            'kode' => '07.12.01.',
            'program' => 'Pengembangan profesi pendidik',
            'sub_program' => 'Pembayaran Honor',
            'uraian' => 'Pembayaran Honor Guru/Pendidik',
        ]);

        $rekening = RekeningBelanja::create([
            'tahun' => 2027,
            'kode_rekening' => '5.1.02.02.01.0013',
            'rincian_objek' => 'Belanja Jasa Tenaga Pendidikan / Honorarium Guru',
            'kategori' => 'Jasa',
        ]);

        // SSH Paskibraka memiliki batas atas Rp 75.000
        RefBarang::create([
            'id_barang' => '8.1.02.02.01.0013.00001',
            'nama_barang' => 'Belanja Jasa Tenaga Pendidikan-Honorarium Pelatih Paskibraka',
            'kode_rekening' => '5.1.02.02.01.0013',
            'rekening' => 'Belanja Jasa Tenaga Pendidikan / Honorarium Guru',
            'satuan' => 'OH',
            'batas_atas' => 75000,
            'tahun' => 2027,
        ]);

        // Simpan RKAS honor guru Rp 1.200.000 (jauh di atas 75.000) dengan id_barang_arkas kosong
        $response = $this->actingAs($user)->post(route('rkas.store', $penganggaran->id), [
            'kegiatan_id' => $kegiatan->id,
            'rekening_id' => $rekening->id,
            'uraian' => 'HUSNI (0938767668130252)',
            'uraian_arkas' => 'HUSNI (0938767668130252)',
            'id_barang_arkas' => '',
            'harga_satuan' => 1200000,
            'alokasi' => [
                ['month' => 'Januari', 'quantity' => 1, 'unit' => 'OB'],
            ],
        ]);

        $response->assertSessionHasNoErrors();
        $this->assertDatabaseHas('rkas', [
            'penganggaran_id' => $penganggaran->id,
            'uraian_arkas' => 'HUSNI (0938767668130252)',
            'harga_satuan' => 1200000,
        ]);
    }

    public function test_sync_from_arkas_preserves_manual_ptk_and_other_years(): void
    {
        // PTK manual di 2027
        RefPtk::create([
            'tahun' => 2027,
            'ptk_id' => null,
            'nuptk' => '1234567890123456',
            'nama' => 'GURU BARU MANUAL',
            'jenis_ptk_arkas' => RefPtk::JENIS_GURU,
            'is_active' => true,
            'sumber' => RefPtk::SUMBER_MANUAL,
        ]);

        // PTK tahun 2026 tidak boleh berubah
        RefPtk::create([
            'tahun' => 2026,
            'ptk_id' => 'ptk-2026',
            'nuptk' => null,
            'nama' => 'GURU 2026',
            'jenis_ptk_arkas' => RefPtk::JENIS_GURU,
            'is_active' => true,
            'sumber' => RefPtk::SUMBER_ARKAS,
        ]);

        $mockEngine = $this->createMock(ArkasEngineService::class);
        $mockEngine->method('runScriptRaw')->willReturn([
            'status' => 'success',
            'data' => [
                [
                    'ptk_id' => 'ptk-arkas-1',
                    'tahun' => 2027,
                    'nuptk' => '0938767668130252',
                    'nama' => 'HUSNI',
                    'jenis_kelamin' => 'P',
                    'jenis_ptk_arkas' => 10,
                    'masa_kerja_tahun' => 5,
                    'masa_kerja_bulan' => 2,
                    'pernah_sertifikasi' => false,
                    'is_active' => true,
                ],
            ],
        ]);

        $service = new RefPtkService($mockEngine);
        $result = $service->syncFromArkas(2027);

        $this->assertSame('success', $result['status']);
        $this->assertSame(1, $result['inserted']);

        $this->assertDatabaseHas('ref_ptks', ['tahun' => 2027, 'nama' => 'HUSNI', 'sumber' => 'arkas']);
        $this->assertDatabaseHas('ref_ptks', ['tahun' => 2027, 'nama' => 'GURU BARU MANUAL', 'sumber' => 'manual']);
        $this->assertDatabaseHas('ref_ptks', ['tahun' => 2026, 'nama' => 'GURU 2026']);
    }

    public function test_data_ptk_crud_and_copy_year(): void
    {
        $user = $this->createBendahara();

        // Store manual PTK
        $this->actingAs($user)
            ->post(route('data-ptk.store'), [
                'tahun' => 2027,
                'nama' => 'AHMAD HONORER',
                'nuptk' => '5555666677778888',
                'jenis_ptk_arkas' => RefPtk::JENIS_GURU,
                'jenis_kelamin' => 'L',
                'is_active' => true,
            ])
            ->assertSessionHasNoErrors();

        $ptk = RefPtk::where('nama', 'AHMAD HONORER')->firstOrFail();
        $this->assertSame('AHMAD HONORER (5555666677778888)', $ptk->formatted_uraian_arkas);
        $this->assertSame(RefPtk::SUMBER_MANUAL, $ptk->sumber);

        // Update PTK
        $this->actingAs($user)
            ->put(route('data-ptk.update', $ptk->id), [
                'nama' => 'AHMAD HONORER UPDATED',
                'nuptk' => '',
                'jenis_ptk_arkas' => RefPtk::JENIS_TENDIK,
                'jenis_kelamin' => 'L',
                'is_active' => true,
            ])
            ->assertSessionHasNoErrors();

        $ptk->refresh();
        $this->assertSame('AHMAD HONORER UPDATED', $ptk->formatted_uraian_arkas);
        $this->assertSame(RefPtk::JENIS_TENDIK, $ptk->jenis_ptk_arkas);

        // Copy year 2027 -> 2028
        $this->actingAs($user)
            ->post(route('data-ptk.copy-year'), [
                'source_year' => '2027',
                'target_year' => '2028',
            ])
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('ref_ptks', [
            'tahun' => 2028,
            'nama' => 'AHMAD HONORER UPDATED',
        ]);

        // Delete PTK
        $this->actingAs($user)
            ->delete(route('data-ptk.destroy', $ptk->id))
            ->assertSessionHasNoErrors();

        $this->assertDatabaseMissing('ref_ptks', ['id' => $ptk->id]);
    }

    public function test_existing_bendahara_role_without_data_ptk_key_still_gets_write_access(): void
    {
        $defaults = PermissionCatalog::defaultPermissionsForRole('bendahara');
        unset($defaults['modules']['data_ptk']);

        Role::updateOrCreate(
            ['slug' => 'bendahara'],
            [
                'name' => 'Bendahara / Admin',
                'description' => 'Role sistem',
                'is_system' => true,
                'permissions' => $defaults,
            ]
        );

        $user = $this->createBendahara();

        $this->assertTrue($user->canAccessModule('data_ptk', PermissionCatalog::LEVEL_WRITE));
        $this->actingAs($user)->get(route('data-ptk.index'))->assertOk();
    }

    public function test_by_rekening_links_rbm_buku_catalog_and_hides_expired_items(): void
    {
        $user = $this->createBendahara();

        // Buku aktif RBM (kode_rekening = NULL, blok_id = '5.2.3', kode_belanja = 'RBM')
        RefBarang::create([
            'id_barang' => '05.02.4730',
            'nama_barang' => 'Buku Panduan Guru Matematika untuk SMP/MTs Kelas IX',
            'kode_rekening' => null,
            'rekening' => null,
            'satuan' => 'exemplar',
            'blok_id' => '5.2.3',
            'kode_belanja' => 'RBM',
            'is_expired' => false,
            'batas_atas' => 94200,
            'tahun' => 2026,
        ]);

        // Buku expired -> harus tersembunyi dari byRekening
        RefBarang::create([
            'id_barang' => '05.02.4946',
            'nama_barang' => 'Buku Prakarya Expired',
            'kode_rekening' => null,
            'rekening' => null,
            'satuan' => 'exemplar',
            'blok_id' => '5.2.3',
            'kode_belanja' => 'RBM',
            'is_expired' => true,
            'batas_atas' => 0,
            'tahun' => 2026,
        ]);

        // Barang ATK aktif & expired pada 5.1.02.01.01.0024
        RefBarang::create([
            'id_barang' => 'atk-1',
            'nama_barang' => 'Kertas HVS A4 Aktif',
            'kode_rekening' => '5.1.02.01.01.0024',
            'rekening' => 'Alat Tulis Kantor',
            'satuan' => 'Rim',
            'is_expired' => false,
            'batas_atas' => 65000,
            'tahun' => 2026,
        ]);

        RefBarang::create([
            'id_barang' => 'atk-exp',
            'nama_barang' => 'Kertas HVS Kedaluwarsa',
            'kode_rekening' => '5.1.02.01.01.0024',
            'rekening' => 'Alat Tulis Kantor',
            'satuan' => 'Rim',
            'is_expired' => true,
            'batas_atas' => 50000,
            'tahun' => 2026,
        ]);

        // 1. Rekening Modal Buku 5.2.05.01.01.0006 -> otomatis memuat buku RBM aktif & menyembunyikan yang expired
        $resBuku = $this->actingAs($user)->getJson(route('arkas-tools.by-rekening', [
            'year' => 2026,
            'kode_kegiatan' => '05.02.04.',
            'kode_rekening' => '5.2.05.01.01.0006',
        ]));

        $resBuku->assertOk()
            ->assertJsonPath('is_buku_catalog', true)
            ->assertJsonPath('has_rekening_catalog', true)
            ->assertJsonPath('total_rekening_items', 1)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id_barang', '05.02.4730');

        // 2. Rekening ATK 5.1.02.01.01.0024 -> menyembunyikan item expired
        $resAtk = $this->actingAs($user)->getJson(route('arkas-tools.by-rekening', [
            'year' => 2026,
            'kode_rekening' => '5.1.02.01.01.0024',
        ]));

        $resAtk->assertOk()
            ->assertJsonPath('is_buku_catalog', false)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id_barang', 'atk-1');

        // 3. Buku tahun 2027 (belum ada RBM 2027) -> TIDAK boleh fallback ke 2026 (terisolasi ketat per tahun)
        RefBarang::create([
            'id_barang' => 'atk-2027',
            'nama_barang' => 'Kertas HVS 2027',
            'kode_rekening' => '5.1.02.01.01.0024',
            'rekening' => 'Alat Tulis Kantor',
            'satuan' => 'Rim',
            'is_expired' => false,
            'batas_atas' => 65000,
            'tahun' => 2027,
        ]);

        $resBuku2027 = $this->actingAs($user)->getJson(route('arkas-tools.by-rekening', [
            'year' => 2027,
            'kode_kegiatan' => '05.02.04.',
            'kode_rekening' => '5.2.05.01.01.0006',
        ]));

        $resBuku2027->assertOk()
            ->assertJsonPath('is_buku_catalog', true)
            ->assertJsonPath('has_rekening_catalog', false)
            ->assertJsonPath('total_rekening_items', 0)
            ->assertJsonCount(0, 'data');

        // 4. RefSatuan fallback & activeOptions
        $this->assertContains('eksemplar', RefSatuan::activeOptions());
        RefSatuan::create([
            'ref_satuan_id' => 'sat-1',
            'satuan' => 'eksemplar',
            'unit' => 'eksemplar',
            'is_active' => true,
        ]);
        $this->assertSame(['eksemplar'], RefSatuan::activeOptions());
    }

    public function test_kode_kegiatan_for_variant_separates_reguler_and_kinerja(): void
    {
        $kegReg = KodeKegiatan::create([
            'tahun' => 2026,
            'sumber_dana' => KodeKegiatan::SUMBER_REGULER,
            'kode' => '03.01.01.',
            'program' => 'Program Reguler',
            'sub_program' => 'Sub Reguler',
            'uraian' => 'Kegiatan Khusus Reguler',
        ]);

        $kegKin = KodeKegiatan::create([
            'tahun' => 2026,
            'sumber_dana' => KodeKegiatan::SUMBER_KINERJA,
            'kode' => '03.17.01.',
            'program' => 'Program Kinerja',
            'sub_program' => 'Sub Kinerja',
            'uraian' => 'Penyelenggaraan Asesmen Talenta Peserta Didik',
        ]);

        $kegAll = KodeKegiatan::create([
            'tahun' => 2026,
            'sumber_dana' => KodeKegiatan::SUMBER_SEMUA,
            'kode' => '08.01.01.',
            'program' => 'Program Umum',
            'sub_program' => 'Sub Umum',
            'uraian' => 'Kegiatan Lintas Sumber Dana',
        ]);

        $regulerIds = KodeKegiatan::forYear(2026)->forVariant('reguler')->pluck('id')->all();
        $silpaIds = KodeKegiatan::forYear(2026)->forVariant('silpa')->pluck('id')->all();
        $kinerjaIds = KodeKegiatan::forYear(2026)->forVariant('kinerja')->pluck('id')->all();
        $kinerjaSilpaIds = KodeKegiatan::forYear(2026)->forVariant('kinerja_silpa')->pluck('id')->all();

        $this->assertEqualsCanonicalizing([$kegReg->id, $kegAll->id], $regulerIds);
        $this->assertEqualsCanonicalizing([$kegReg->id, $kegAll->id], $silpaIds);
        $this->assertEqualsCanonicalizing([$kegKin->id, $kegAll->id], $kinerjaIds);
        $this->assertEqualsCanonicalizing([$kegKin->id, $kegAll->id], $kinerjaSilpaIds);

        // Preserve ID transaksi lama tetap ikut terbaca saat edit
        $preservedIds = KodeKegiatan::forYear(2026)->forVariant('reguler', [$kegKin->id])->pluck('id')->all();
        $this->assertEqualsCanonicalizing([$kegReg->id, $kegKin->id, $kegAll->id], $preservedIds);
    }
}
