<?php

namespace Tests\Feature;

use App\Models\BukuKasUmum;
use App\Models\BukuKasUmumUraianDetail;
use App\Models\KinerjaBukuKasUmum;
use App\Models\KinerjaBukuKasUmumUraianDetail;
use App\Models\KinerjaPenganggaran;
use App\Models\KinerjaRkas;
use App\Models\KinerjaRkasPerubahan;
use App\Models\KodeKegiatan;
use App\Models\Penganggaran;
use App\Models\RefBarang;
use App\Models\RekeningBelanja;
use App\Models\Rkas;
use App\Models\RkasPerubahan;
use App\Models\SekolahProfile;
use App\Models\User;
use App\Services\ArkasEngineService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Mockery;
use Tests\TestCase;

class RkasUraianArkasTest extends TestCase
{
    use RefreshDatabase;

    protected User $bendahara;

    protected Penganggaran $penganggaran;

    protected KodeKegiatan $kegiatan;

    protected RekeningBelanja $rekeningCatalog;

    protected RekeningBelanja $rekeningManual;

    protected function setUp(): void
    {
        parent::setUp();

        $this->bendahara = User::factory()->create([
            'username' => 'bendahara_arkas',
            'role' => 'bendahara',
        ]);

        $this->penganggaran = Penganggaran::create([
            'pagu_anggaran' => 100000000,
            'tahun_anggaran' => 2027,
            'kepala_sekolah' => 'Nama Kepsek',
            'sk_kepala_sekolah' => 'SK-001',
            'bendahara' => 'Nama Bendahara',
            'sk_bendahara' => 'SK-002',
            'komite' => 'Nama Komite',
            'nip_kepala_sekolah' => '198001012005011001',
            'nip_bendahara' => '198501012010012002',
            'tanggal_sk_kepala_sekolah' => '2027-01-02',
            'tanggal_sk_bendahara' => '2027-01-02',
        ]);

        $this->kegiatan = KodeKegiatan::create([
            'kode' => '03.03.06.',
            'program' => 'Pengembangan Standar Proses',
            'sub_program' => 'Pelaksanaan Kegiatan Pembelajaran',
            'uraian' => 'Penyediaan Alat Praktik',
        ]);

        $this->rekeningCatalog = RekeningBelanja::create([
            'kode_rekening' => '5.2.02.05.02.0005',
            'rincian_objek' => 'Belanja Modal Alat Dapur',
            'kategori' => 'Modal Peralatan dan Mesin',
        ]);

        $this->rekeningManual = RekeningBelanja::create([
            'kode_rekening' => '5.1.02.02.01.0013',
            'rincian_objek' => 'Belanja Jasa Tenaga Pendidikan',
            'kategori' => 'Belanja Jasa',
        ]);
    }

    public function test_by_rekening_returns_unsynced_when_active_year_not_in_ref_barangs(): void
    {
        // Only year 2026 exists in ref_barangs, not 2027
        RefBarang::create([
            'id_barang' => '1.3.02.05.02.0005.00189-1-520205020005',
            'nama_barang' => 'Alat Dapur-',
            'kode_rekening' => '5.2.02.05.02.0005',
            'rekening' => 'Belanja Modal Alat Dapur',
            'satuan' => 'Buah',
            'batas_atas' => 300000,
            'tahun' => 2026,
        ]);

        $response = $this
            ->actingAs($this->bendahara)
            ->getJson('/arkas-tools/by-rekening?year=2027&kode_rekening=5.2.02.05.02.0005');

        $response->assertOk()
            ->assertJson([
                'status' => 'success',
                'year' => 2027,
                'year_synced' => false,
                'has_rekening_catalog' => false,
                'total_rekening_items' => 0,
            ]);
    }

    public function test_by_rekening_returns_catalog_items_for_synced_year_and_rekening(): void
    {
        RefBarang::create([
            'id_barang' => '1.3.02.05.02.0005.00189-1-520205020005',
            'nama_barang' => 'Alat Dapur-',
            'kode_rekening' => '5.2.02.05.02.0005',
            'rekening' => 'Belanja Modal Alat Dapur',
            'satuan' => 'Buah',
            'batas_atas' => 300000,
            'tahun' => 2027,
        ]);

        RefBarang::create([
            'id_barang' => '1.3.02.05.02.0005.00195-1-520205020005',
            'nama_barang' => 'Belanja Modal Alat Dapur-Alat Pemanggang',
            'kode_rekening' => '5.2.02.05.02.0005',
            'rekening' => 'Belanja Modal Alat Dapur',
            'satuan' => 'Unit',
            'batas_atas' => 1500000,
            'tahun' => 2027,
        ]);

        // Rekening with catalog
        $response = $this
            ->actingAs($this->bendahara)
            ->getJson('/arkas-tools/by-rekening?year=2027&kode_rekening=5.2.02.05.02.0005&keyword=Pemanggang');

        $response->assertOk()
            ->assertJson([
                'status' => 'success',
                'year' => 2027,
                'year_synced' => true,
                'has_rekening_catalog' => true,
                'total_rekening_items' => 2,
            ])
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.nama_barang', 'Belanja Modal Alat Dapur-Alat Pemanggang')
            ->assertJsonPath('data.0.batas_atas', 1500000);

        // Rekening without catalog in the same synced year
        $manualResponse = $this
            ->actingAs($this->bendahara)
            ->getJson('/arkas-tools/by-rekening?year=2027&kode_rekening=5.1.02.02.01.0013');

        $manualResponse->assertOk()
            ->assertJson([
                'status' => 'success',
                'year' => 2027,
                'year_synced' => true,
                'has_rekening_catalog' => false,
                'total_rekening_items' => 0,
            ]);
    }

    public function test_rkas_store_and_update_validate_batas_atas_and_persist_uraian_arkas(): void
    {
        RefBarang::create([
            'id_barang' => '1.3.02.05.02.0005.00189-1-520205020005',
            'nama_barang' => 'Alat Dapur-',
            'kode_rekening' => '5.2.02.05.02.0005',
            'rekening' => 'Belanja Modal Alat Dapur',
            'satuan' => 'Buah',
            'batas_atas' => 300000,
            'tahun' => 2027,
        ]);

        // 1. Exceeding batas_atas (350,000 > 300,000) should fail with harga_satuan validation error
        $failResponse = $this
            ->actingAs($this->bendahara)
            ->from("/rkas/{$this->penganggaran->id}")
            ->post("/rkas/{$this->penganggaran->id}", [
                'kegiatan_id' => $this->kegiatan->id,
                'rekening_id' => $this->rekeningCatalog->id,
                'uraian' => 'Wajan Penggorengan Praktik Tata Boga',
                'uraian_arkas' => 'Alat Dapur-',
                'id_barang_arkas' => '1.3.02.05.02.0005.00189-1-520205020005',
                'harga_satuan' => 350000,
                'alokasi' => [
                    ['month' => 'Januari', 'quantity' => 2, 'unit' => 'Buah'],
                ],
            ]);

        $failResponse->assertSessionHasErrors(['harga_satuan']);
        $this->assertDatabaseCount('rkas', 0);

        // 2. Within batas_atas (250,000 <= 300,000) should succeed
        $okResponse = $this
            ->actingAs($this->bendahara)
            ->from("/rkas/{$this->penganggaran->id}")
            ->post("/rkas/{$this->penganggaran->id}", [
                'kegiatan_id' => $this->kegiatan->id,
                'rekening_id' => $this->rekeningCatalog->id,
                'uraian' => 'Wajan Penggorengan Praktik Tata Boga',
                'uraian_arkas' => 'Alat Dapur-',
                'id_barang_arkas' => '1.3.02.05.02.0005.00189-1-520205020005',
                'harga_satuan' => 250000,
                'alokasi' => [
                    ['month' => 'Januari', 'quantity' => 2, 'unit' => 'Buah'],
                ],
            ]);

        $okResponse->assertSessionHasNoErrors();
        $this->assertDatabaseHas('rkas', [
            'penganggaran_id' => $this->penganggaran->id,
            'uraian' => 'Wajan Penggorengan Praktik Tata Boga',
            'uraian_arkas' => 'Alat Dapur-',
            'id_barang_arkas' => '1.3.02.05.02.0005.00189-1-520205020005',
            'harga_satuan' => 250000,
        ]);

        $rkasItem = Rkas::firstOrFail();

        // 3. getEditData returns uraian_arkas, id_barang_arkas, and batas_atas_arkas
        $editDataResponse = $this
            ->actingAs($this->bendahara)
            ->getJson("/rkas/{$rkasItem->id}/edit-data");

        $editDataResponse->assertOk()
            ->assertJson([
                'uraian' => 'Wajan Penggorengan Praktik Tata Boga',
                'uraian_arkas' => 'Alat Dapur-',
                'id_barang_arkas' => '1.3.02.05.02.0005.00189-1-520205020005',
                'batas_atas_arkas' => 300000,
            ]);

        // 4. Rkas index passes is_arkas_year_synced and uraian_arkas in items
        $indexResponse = $this
            ->actingAs($this->bendahara)
            ->get("/rkas/{$this->penganggaran->id}");

        $indexResponse->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Penganggaran/Rkas/Index')
                ->where('anggaran.is_arkas_year_synced', true)
                ->where('items.0.uraian', 'Wajan Penggorengan Praktik Tata Boga')
                ->where('items.0.uraian_arkas', 'Alat Dapur-')
            );
    }

    public function test_rkas_perubahan_copies_and_validates_uraian_arkas(): void
    {
        RefBarang::create([
            'id_barang' => '1.3.02.05.02.0005.00189-1-520205020005',
            'nama_barang' => 'Alat Dapur-',
            'kode_rekening' => '5.2.02.05.02.0005',
            'rekening' => 'Belanja Modal Alat Dapur',
            'satuan' => 'Buah',
            'batas_atas' => 300000,
            'tahun' => 2027,
        ]);

        Rkas::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningCatalog->id,
            'uraian' => 'Wajan Penggorengan Praktik Tata Boga',
            'uraian_arkas' => 'Alat Dapur-',
            'id_barang_arkas' => '1.3.02.05.02.0005.00189-1-520205020005',
            'harga_satuan' => 250000,
            'bulan' => 'Januari',
            'jumlah' => 2,
            'satuan' => 'Buah',
        ]);

        // Copy from RKAS Awal to RKAS Perubahan
        $copyResponse = $this
            ->actingAs($this->bendahara)
            ->post('/rkas-perubahan/salin', [
                'penganggaran_id' => $this->penganggaran->id,
            ]);

        $copyResponse->assertSessionHasNoErrors();
        $this->assertDatabaseHas('rkas_perubahans', [
            'penganggaran_id' => $this->penganggaran->id,
            'uraian' => 'Wajan Penggorengan Praktik Tata Boga',
            'uraian_arkas' => 'Alat Dapur-',
            'id_barang_arkas' => '1.3.02.05.02.0005.00189-1-520205020005',
        ]);

        $perubahanItem = RkasPerubahan::firstOrFail();

        // Update RKAS Perubahan exceeding batas_atas should fail
        $failUpdate = $this
            ->actingAs($this->bendahara)
            ->from("/rkas-perubahan/{$this->penganggaran->id}")
            ->put("/rkas-perubahan/{$perubahanItem->id}", [
                'kode_id' => $this->kegiatan->id,
                'kode_rekening_id' => $this->rekeningCatalog->id,
                'uraian' => 'Wajan Penggorengan Praktik Tata Boga',
                'uraian_arkas' => 'Alat Dapur-',
                'id_barang_arkas' => '1.3.02.05.02.0005.00189-1-520205020005',
                'harga_satuan' => 450000,
                'bulan' => ['Januari'],
                'jumlah' => [2],
                'satuan' => ['Buah'],
                'tahun_anggaran' => 2027,
            ]);

        $failUpdate->assertSessionHasErrors(['harga_satuan']);
    }

    public function test_bku_spent_volume_matches_via_uraian_arkas_fallback(): void
    {
        $rkas = Rkas::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningCatalog->id,
            'uraian' => 'Wajan Penggorengan Praktik Tata Boga',
            'uraian_arkas' => 'Alat Dapur-',
            'id_barang_arkas' => '1.3.02.05.02.0005.00189-1-520205020005',
            'harga_satuan' => 250000,
            'bulan' => 'Januari',
            'jumlah' => 4,
            'satuan' => 'Buah',
        ]);

        $bku = BukuKasUmum::create([
            'penganggaran_id' => $this->penganggaran->id,
            'id_transaksi' => 'BPU-01',
            'tanggal_transaksi' => '2027-01-15',
            'kode_kegiatan_id' => $this->kegiatan->id,
            'rekening_belanja_id' => $this->rekeningCatalog->id,
            'uraian' => 'Alat Dapur-',
            'jenis_transaksi' => 'tunai',
            'total_transaksi_kotor' => 500000,
            'dibelanjakan' => 500000,
            'is_bunga_record' => false,
        ]);

        BukuKasUmumUraianDetail::create([
            'buku_kas_umum_id' => $bku->id,
            'rkas_id' => $rkas->id,
            'kode_kegiatan_id' => $this->kegiatan->id,
            'rekening_belanja_id' => $this->rekeningCatalog->id,
            'uraian' => 'Alat Dapur-',
            'volume' => 2,
            'satuan' => 'Buah',
            'harga_satuan' => 250000,
            'jumlah' => 500000,
            'kondisi' => 'Baik',
        ]);

        $indexResponse = $this
            ->actingAs($this->bendahara)
            ->get("/rkas/{$this->penganggaran->id}");

        $indexResponse->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('items.0.dianggaran', 4)
                ->where('items.0.dibelanjakan', 2)
            );
    }

    public function test_pull_arkas_bku_matches_uraian_arkas_and_stores_sikas_uraian(): void
    {
        $rkas = Rkas::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningCatalog->id,
            'uraian' => 'Wajan Penggorengan Praktik Tata Boga',
            'uraian_arkas' => 'Alat Dapur-',
            'id_barang_arkas' => '1.3.02.05.02.0005.00189-1-520205020005',
            'harga_satuan' => 250000,
            'bulan' => 'Januari',
            'jumlah' => 4,
            'satuan' => 'Buah',
        ]);

        $mockEngine = Mockery::mock(ArkasEngineService::class);
        $mockEngine->shouldReceive('runScriptOrThrow')
            ->once()
            ->with('dump_bku.py', ['dump', '2027', '1'], 120)
            ->andReturn([
                'status' => 'success',
                'penerimaan_dana' => [],
                'penarikan_tunai' => [],
                'setor_tunai' => [],
                'transaksi_belanja' => [
                    [
                        'no_bukti' => 'BPU-2027-01',
                        'no_nota' => 'NOTA-01',
                        'nomor_nota' => 'BPU-2027-01',
                        'tanggal_transaksi' => '2027-01-20',
                        'jenis_transaksi' => 'tunai',
                        'nama_toko' => 'Toko Dapur Jaya',
                        'alamat_toko' => 'Jl. Merdeka 1',
                        'npwp' => '',
                        'kode_kegiatan' => '03.03.06.',
                        'kode_rekening' => '5.2.02.05.02.0005',
                        'uraian' => 'Alat Dapur-',
                        'total_transaksi_kotor' => 500000,
                        'dibelanjakan' => 500000,
                        'pajak' => 'Tanpa Pajak',
                        'persen_pajak' => 0,
                        'total_pajak' => 0,
                        'ntpn' => '',
                        'tanggal_lapor' => '',
                        'items' => [
                            [
                                'uraian' => 'Alat Dapur-',
                                'rapbs_uraian' => 'Alat Dapur-',
                                'volume' => 2,
                                'satuan' => 'Buah',
                                'harga_satuan' => 250000,
                                'item_total' => 500000,
                                'kode_kegiatan' => '03.03.06.',
                                'kode_rekening' => '5.2.02.05.02.0005',
                            ],
                        ],
                    ],
                ],
                'penutupan_bulan' => [],
            ]);

        $this->app->instance(ArkasEngineService::class, $mockEngine);

        $pullResponse = $this
            ->actingAs($this->bendahara)
            ->from('/penatausahaan')
            ->post("/penatausahaan/pull-arkas-bku/{$this->penganggaran->id}", [
                'overwrite' => true,
            ]);

        $pullResponse->assertSessionHasNoErrors();

        $this->assertDatabaseHas('buku_kas_umum_uraian_details', [
            'rkas_id' => $rkas->id,
            'uraian' => 'Wajan Penggorengan Praktik Tata Boga',
            'volume' => 2,
            'harga_satuan' => 250000,
        ]);
    }

    public function test_pull_arkas_rkas_awal_safe_sync_preserves_sikas_uraian_even_when_uraian_arkas_was_null_and_bku_exists(): void
    {
        RefBarang::create([
            'id_barang' => '1.3.02.05.02.0005.00189-1-520205020005',
            'nama_barang' => 'Alat Dapur-',
            'kode_rekening' => '5.2.02.05.02.0005',
            'rekening' => 'Belanja Modal Alat Dapur',
            'satuan' => 'Buah',
            'batas_atas' => 300000,
            'tahun' => 2027,
        ]);

        // Existing SIKAS row where uraian_arkas is STILL NULL (before pairing)
        $existingRkas = Rkas::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningCatalog->id,
            'uraian' => 'Wajan Penggorengan Praktik Tata Boga',
            'uraian_arkas' => null,
            'id_barang_arkas' => null,
            'harga_satuan' => 250000,
            'bulan' => 'Januari',
            'jumlah' => 2,
            'satuan' => 'Buah',
        ]);

        // Existing BKU transaction — safe sync must STILL succeed without deleting existing RKAS row
        BukuKasUmum::create([
            'penganggaran_id' => $this->penganggaran->id,
            'id_transaksi' => 'BPU-EXIST-01',
            'tanggal_transaksi' => '2027-01-15',
            'kode_kegiatan_id' => $this->kegiatan->id,
            'rekening_belanja_id' => $this->rekeningCatalog->id,
            'uraian' => 'Wajan Penggorengan Praktik Tata Boga',
            'jenis_transaksi' => 'tunai',
            'total_transaksi_kotor' => 500000,
            'dibelanjakan' => 500000,
            'is_bunga_record' => false,
        ]);

        $mockEngine = Mockery::mock(ArkasEngineService::class);
        $mockEngine->shouldReceive('runScriptOrThrow')
            ->twice()
            ->with('dump_rkas.py', ['dump', '2027', '1'], 60)
            ->andReturn([
                'status' => 'success',
                'exists' => true,
                'is_revisi' => 0,
                'pagu' => 120000000,
                'data' => [
                    [
                        // Matches existing SIKAS row by kode_id + kode_rekening_id + bulan + harga
                        'kode_kegiatan' => '03.03.06.',
                        'kode_rekening' => '5.2.02.05.02.0005',
                        'uraian' => 'Alat Dapur-',
                        'harga_satuan' => 250000,
                        'bulan' => 'Januari',
                        'volume' => 2,
                        'satuan' => 'Buah',
                    ],
                    [
                        // Unmatched ARKAS item -> previewed in check-arkas, MUST NOT be auto-inserted in Mode B (match_only)
                        'kode_kegiatan' => '03.03.06.',
                        'kode_rekening' => '5.1.02.02.01.0013',
                        'uraian' => 'Honorarium Guru Honorer',
                        'harga_satuan' => 500000,
                        'bulan' => 'Januari',
                        'volume' => 1,
                        'satuan' => 'OB',
                    ],
                ],
            ]);

        $this->app->instance(ArkasEngineService::class, $mockEngine);

        $checkResponse = $this
            ->actingAs($this->bendahara)
            ->getJson("/rkas/{$this->penganggaran->id}/check-arkas");

        $checkResponse->assertOk()
            ->assertJson([
                'status' => 'success',
                'exists' => true,
                'is_revisi' => 0,
                'current_rkas_count' => 1,
                'has_bku' => true,
                'can_pull' => true,
                'diff_preview' => [
                    'has_differences' => true,
                ],
            ])
            ->assertJsonPath('diff_preview.will_insert.0.uraian', 'Honorarium Guru Honorer');

        // Dry-run check-arkas MUST NOT mutate database
        $this->assertDatabaseCount('rkas', 1);
        $this->assertDatabaseHas('rkas', [
            'id' => $existingRkas->id,
            'uraian_arkas' => null,
        ]);

        $pullResponse = $this
            ->actingAs($this->bendahara)
            ->from("/rkas/{$this->penganggaran->id}")
            ->post("/rkas/{$this->penganggaran->id}/pull-arkas");

        $pullResponse->assertSessionHasNoErrors();
        $pullResponse->assertSessionHas('warning');
        $pullResponse->assertSessionHas('arkas_sync_report', function (array $report) {
            return $report['mode'] === 'match_only'
                && $report['matched'] === 1
                && $report['inserted'] === 0
                && $report['is_budget_mismatch'] === true
                && $report['has_warnings'] === true
                && count($report['unmatched_arkas']) === 1
                && $report['unmatched_arkas'][0]['uraian'] === 'Honorarium Guru Honorer'
                && count($report['unpaired_sikas']) === 0;
        });

        // Existing SIKAS row keeps its ID, uraian SIKAS, and jumlah; ONLY uraian_arkas & id_barang_arkas are filled!
        $this->assertDatabaseHas('rkas', [
            'id' => $existingRkas->id,
            'penganggaran_id' => $this->penganggaran->id,
            'uraian' => 'Wajan Penggorengan Praktik Tata Boga',
            'uraian_arkas' => 'Alat Dapur-',
            'id_barang_arkas' => '1.3.02.05.02.0005.00189-1-520205020005',
            'jumlah' => 2,
        ]);

        // Strict Match-Only: unmatched ARKAS item MUST NOT be auto-inserted, and pagu_anggaran stays untouched!
        $this->assertDatabaseCount('rkas', 1);
        $this->assertDatabaseMissing('rkas', [
            'uraian' => 'Honorarium Guru Honorer',
        ]);
        $this->assertEquals(100000000, (float) $this->penganggaran->fresh()->pagu_anggaran);
    }

    public function test_rkas_awal_check_diff_preview_and_reconcile_shifts_splits_and_protects_bku_volume(): void
    {
        // 1. Unprotected row shifted September -> Desember (must update bulan & preserve SIKAS uraian)
        $shiftedRow = Rkas::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningCatalog->id,
            'uraian' => 'Lakban Bening Sedang SIKAS',
            'uraian_arkas' => null,
            'harga_satuan' => 23000,
            'bulan' => 'September',
            'jumlah' => 5,
            'satuan' => 'buah',
        ]);

        // 2. Partial BKU row (April vol 2, spent = 1) -> ARKAS Pergeseran 1 splits into April 1 + Maret 1!
        // Safe to reduce April 2 -> 1 (since 1 >= spent 1) and insert Maret 1 inheriting SIKAS uraian!
        $splitRow = Rkas::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningManual->id,
            'uraian' => 'Honor Operator Sekolah SIKAS',
            'uraian_arkas' => 'Honor Operator Komputer ARKAS',
            'harga_satuan' => 300000,
            'bulan' => 'April',
            'jumlah' => 2,
            'satuan' => 'orang / kegiatan',
        ]);

        // 3. Fully spent BKU row (Maret vol 2, spent = 2) -> ARKAS splits into Maret 1 + April 1!
        // Cannot reduce below spent 2 -> Pass 6 pairs both ARKAS halves to this row without inserting duplicates!
        $fullSpentRow = Rkas::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningManual->id,
            'uraian' => 'Pulsa Internet TKA SIKAS',
            'uraian_arkas' => 'Tagihan Internet ARKAS',
            'harga_satuan' => 150000,
            'bulan' => 'Maret',
            'jumlah' => 2,
            'satuan' => 'kegiatan',
        ]);

        // 4. Unprotected cancelled row (no BKU) -> MUST be auto-deleted
        $cancelledRow = Rkas::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningCatalog->id,
            'uraian' => 'Item Dibatalkan Pergeseran',
            'uraian_arkas' => 'Item Dibatalkan Pergeseran',
            'harga_satuan' => 45000,
            'bulan' => 'Mei',
            'jumlah' => 2,
            'satuan' => 'buah',
        ]);

        // 5. BKU-protected row cancelled in ARKAS -> MUST NOT be deleted & reported in protected_bku
        $protectedCancelledRow = Rkas::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningCatalog->id,
            'uraian' => 'Belanja Sudah Terpakai BKU',
            'uraian_arkas' => 'Belanja Sudah Terpakai BKU',
            'harga_satuan' => 80000,
            'bulan' => 'Februari',
            'jumlah' => 1,
            'satuan' => 'buah',
        ]);

        $bku = BukuKasUmum::create([
            'penganggaran_id' => $this->penganggaran->id,
            'id_transaksi' => 'BPU-AWAL-01',
            'tanggal_transaksi' => '2027-04-10',
            'kode_kegiatan_id' => $this->kegiatan->id,
            'rekening_belanja_id' => $this->rekeningManual->id,
            'uraian' => 'Belanja Awal',
            'jenis_transaksi' => 'tunai',
            'total_transaksi_kotor' => 680000,
            'dibelanjakan' => 680000,
            'is_bunga_record' => false,
        ]);

        BukuKasUmumUraianDetail::create([
            'buku_kas_umum_id' => $bku->id,
            'rkas_id' => $splitRow->id,
            'kode_kegiatan_id' => $this->kegiatan->id,
            'rekening_belanja_id' => $this->rekeningManual->id,
            'uraian' => 'Honor Operator Sekolah SIKAS',
            'volume' => 1,
            'satuan' => 'orang / kegiatan',
            'harga_satuan' => 300000,
            'jumlah' => 300000,
            'kondisi' => 'Baik',
        ]);

        BukuKasUmumUraianDetail::create([
            'buku_kas_umum_id' => $bku->id,
            'rkas_id' => $fullSpentRow->id,
            'kode_kegiatan_id' => $this->kegiatan->id,
            'rekening_belanja_id' => $this->rekeningManual->id,
            'uraian' => 'Pulsa Internet TKA SIKAS',
            'volume' => 2,
            'satuan' => 'kegiatan',
            'harga_satuan' => 150000,
            'jumlah' => 300000,
            'kondisi' => 'Baik',
        ]);

        BukuKasUmumUraianDetail::create([
            'buku_kas_umum_id' => $bku->id,
            'rkas_id' => $protectedCancelledRow->id,
            'kode_kegiatan_id' => $this->kegiatan->id,
            'rekening_belanja_id' => $this->rekeningCatalog->id,
            'uraian' => 'Belanja Sudah Terpakai BKU',
            'volume' => 1,
            'satuan' => 'buah',
            'harga_satuan' => 80000,
            'jumlah' => 80000,
            'kondisi' => 'Baik',
        ]);

        $arkasDump = [
            'status' => 'success',
            'exists' => true,
            'is_revisi' => 1,
            'pagu' => 100000000,
            'data' => [
                // 1. Shifted September -> Desember
                [
                    'kode_kegiatan' => '03.03.06.',
                    'kode_rekening' => '5.2.02.05.02.0005',
                    'uraian' => 'Isolasi Double Tape',
                    'harga_satuan' => 23000,
                    'bulan' => 'Desember',
                    'volume' => 5,
                    'satuan' => 'buah',
                ],
                // 2. Split April 2 -> April 1 + Maret 1 (spent=1 in April)
                [
                    'kode_kegiatan' => '03.03.06.',
                    'kode_rekening' => '5.1.02.02.01.0013',
                    'uraian' => 'Honor Operator Komputer ARKAS',
                    'harga_satuan' => 300000,
                    'bulan' => 'April',
                    'volume' => 1,
                    'satuan' => 'orang / kegiatan',
                ],
                [
                    'kode_kegiatan' => '03.03.06.',
                    'kode_rekening' => '5.1.02.02.01.0013',
                    'uraian' => 'Honor Operator Komputer ARKAS',
                    'harga_satuan' => 300000,
                    'bulan' => 'Maret',
                    'volume' => 1,
                    'satuan' => 'orang / kegiatan',
                ],
                // 3. Split Maret 2 -> Maret 1 + April 1 (spent=2 in Maret -> Pass 6 protects without double insert)
                [
                    'kode_kegiatan' => '03.03.06.',
                    'kode_rekening' => '5.1.02.02.01.0013',
                    'uraian' => 'Tagihan Internet ARKAS',
                    'harga_satuan' => 150000,
                    'bulan' => 'Maret',
                    'volume' => 1,
                    'satuan' => 'kegiatan',
                ],
                [
                    'kode_kegiatan' => '03.03.06.',
                    'kode_rekening' => '5.1.02.02.01.0013',
                    'uraian' => 'Tagihan Internet ARKAS',
                    'harga_satuan' => 150000,
                    'bulan' => 'April',
                    'volume' => 1,
                    'satuan' => 'kegiatan',
                ],
                // 4. Brand-new item added in Pergeseran 1
                [
                    'kode_kegiatan' => '03.03.06.',
                    'kode_rekening' => '5.2.02.05.02.0005',
                    'uraian' => 'Spidol Papan Tulis Baru',
                    'harga_satuan' => 15000,
                    'bulan' => 'Juni',
                    'volume' => 6,
                    'satuan' => 'buah',
                ],
            ],
        ];

        $mockEngine = Mockery::mock(ArkasEngineService::class);
        $mockEngine->shouldReceive('runScriptOrThrow')
            ->twice()
            ->with('dump_rkas.py', ['dump', '2027', '1'], 60)
            ->andReturn($arkasDump);
        $this->app->instance(ArkasEngineService::class, $mockEngine);

        // Step 1: check-arkas returns accurate diff_preview WITHOUT mutating database
        $checkResponse = $this
            ->actingAs($this->bendahara)
            ->getJson("/rkas/{$this->penganggaran->id}/check-arkas");

        $checkResponse->assertOk()
            ->assertJson([
                'status' => 'success',
                'exists' => true,
                'is_revisi' => 1,
                'diff_preview' => [
                    'has_differences' => true,
                ],
            ])
            ->assertJsonCount(2, 'diff_preview.will_update')
            ->assertJsonCount(2, 'diff_preview.will_insert')
            ->assertJsonCount(1, 'diff_preview.will_delete')
            ->assertJsonCount(1, 'diff_preview.protected_bku');

        // Confirm dry-run left DB completely untouched
        $this->assertDatabaseHas('rkas', ['id' => $shiftedRow->id, 'bulan' => 'September']);
        $this->assertDatabaseHas('rkas', ['id' => $splitRow->id, 'jumlah' => 2]);
        $this->assertDatabaseHas('rkas', ['id' => $cancelledRow->id]);
        $this->assertDatabaseCount('rkas', 5);

        // Step 2: User approves reconciliation -> POST pull-arkas with mode = 'reconcile'
        $pullResponse = $this
            ->actingAs($this->bendahara)
            ->from("/rkas/{$this->penganggaran->id}")
            ->post("/rkas/{$this->penganggaran->id}/pull-arkas", [
                'mode' => 'reconcile',
            ]);

        $pullResponse->assertSessionHasNoErrors();
        $pullResponse->assertSessionHas('arkas_sync_report', function (array $report) use ($protectedCancelledRow) {
            $unpairedIds = array_column($report['unpaired_sikas'], 'id');

            return $report['mode'] === 'awal_reconcile'
                && $report['updated_perubahan'] === 2
                && $report['inserted'] === 2
                && $report['deleted_perubahan'] === 1
                && count($report['unmatched_arkas']) === 0
                && in_array($protectedCancelledRow->id, $unpairedIds, true);
        });

        // Verify shifted row updated to Desember while preserving SIKAS uraian
        $this->assertDatabaseHas('rkas', [
            'id' => $shiftedRow->id,
            'bulan' => 'Desember',
            'uraian' => 'Lakban Bening Sedang SIKAS',
            'uraian_arkas' => 'Isolasi Double Tape',
        ]);

        // Verify partial-BKU row reduced April 2 -> 1 and Maret 1 inserted inheriting SIKAS uraian
        $this->assertDatabaseHas('rkas', [
            'id' => $splitRow->id,
            'bulan' => 'April',
            'jumlah' => 1,
            'uraian' => 'Honor Operator Sekolah SIKAS',
        ]);
        $this->assertDatabaseHas('rkas', [
            'penganggaran_id' => $this->penganggaran->id,
            'bulan' => 'Maret',
            'jumlah' => 1,
            'uraian' => 'Honor Operator Sekolah SIKAS',
            'uraian_arkas' => 'Honor Operator Komputer ARKAS',
        ]);

        // Verify fully-spent row kept at vol 2 without inserting extra Tagihan Internet rows
        $this->assertDatabaseHas('rkas', [
            'id' => $fullSpentRow->id,
            'bulan' => 'Maret',
            'jumlah' => 2,
        ]);
        $this->assertEquals(1, Rkas::where('penganggaran_id', $this->penganggaran->id)
            ->where('uraian_arkas', 'Tagihan Internet ARKAS')
            ->count());

        // Verify brand-new item inserted & unprotected cancelled row deleted & BKU-protected row kept
        $this->assertDatabaseHas('rkas', [
            'penganggaran_id' => $this->penganggaran->id,
            'bulan' => 'Juni',
            'uraian' => 'Spidol Papan Tulis Baru',
            'jumlah' => 6,
        ]);
        $this->assertDatabaseMissing('rkas', ['id' => $cancelledRow->id]);
        $this->assertDatabaseHas('rkas', ['id' => $protectedCancelledRow->id]);
    }

    public function test_rkas_awal_reconcile_blocks_bku_conflicts_without_duplicate_inserts_protects_legacy_bku_and_supports_kinerja(): void
    {
        // 1. BKU-protected row (April vol 2, spent=2) -> ARKAS reduces below BKU (April vol 1)
        $volConflictRow = Rkas::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningCatalog->id,
            'uraian' => 'Kertas HVS Terpakai BKU',
            'uraian_arkas' => 'Kertas HVS Terpakai BKU',
            'harga_satuan' => 60000,
            'bulan' => 'April',
            'jumlah' => 2,
            'satuan' => 'rim',
        ]);

        // 2. BKU-protected row (Mei vol 1, spent=1 via legacy NULL rkas_id) -> ARKAS shifts to Juni
        $legacyShiftRow = Rkas::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningCatalog->id,
            'uraian' => 'Tinta Printer Legacy BKU',
            'uraian_arkas' => 'Tinta Printer Legacy BKU',
            'harga_satuan' => 95000,
            'bulan' => 'Mei',
            'jumlah' => 1,
            'satuan' => 'botol',
        ]);

        $bkuApril = BukuKasUmum::create([
            'penganggaran_id' => $this->penganggaran->id,
            'id_transaksi' => 'BPU-CONF-1',
            'tanggal_transaksi' => '2027-04-12',
            'kode_kegiatan_id' => $this->kegiatan->id,
            'rekening_belanja_id' => $this->rekeningCatalog->id,
            'uraian' => 'Belanja ATK',
            'jenis_transaksi' => 'tunai',
            'total_transaksi_kotor' => 120000,
            'dibelanjakan' => 120000,
            'is_bunga_record' => false,
        ]);

        BukuKasUmumUraianDetail::create([
            'buku_kas_umum_id' => $bkuApril->id,
            'rkas_id' => $volConflictRow->id,
            'kode_kegiatan_id' => $this->kegiatan->id,
            'rekening_belanja_id' => $this->rekeningCatalog->id,
            'uraian' => 'Kertas HVS Terpakai BKU',
            'volume' => 2,
            'satuan' => 'rim',
            'harga_satuan' => 60000,
            'jumlah' => 120000,
            'kondisi' => 'Baik',
        ]);

        $bkuMei = BukuKasUmum::create([
            'penganggaran_id' => $this->penganggaran->id,
            'id_transaksi' => 'BPU-CONF-2',
            'tanggal_transaksi' => '2027-05-15',
            'kode_kegiatan_id' => $this->kegiatan->id,
            'rekening_belanja_id' => $this->rekeningCatalog->id,
            'uraian' => 'Belanja Tinta',
            'jenis_transaksi' => 'tunai',
            'total_transaksi_kotor' => 95000,
            'dibelanjakan' => 95000,
            'is_bunga_record' => false,
        ]);

        // Legacy detail with rkas_id = NULL!
        BukuKasUmumUraianDetail::create([
            'buku_kas_umum_id' => $bkuMei->id,
            'rkas_id' => null,
            'kode_kegiatan_id' => $this->kegiatan->id,
            'rekening_belanja_id' => $this->rekeningCatalog->id,
            'uraian' => 'Tinta Printer Legacy BKU',
            'volume' => 1,
            'satuan' => 'botol',
            'harga_satuan' => 95000,
            'jumlah' => 95000,
            'kondisi' => 'Baik',
        ]);

        $arkasConflictDump = [
            'status' => 'success',
            'exists' => true,
            'is_revisi' => 1,
            'pagu' => 100000000,
            'data' => [
                [
                    // Below spent volume (1 < 2) -> MUST NOT update row AND MUST NOT insert duplicate!
                    'kode_kegiatan' => '03.03.06.',
                    'kode_rekening' => '5.2.02.05.02.0005',
                    'uraian' => 'Kertas HVS Terpakai BKU',
                    'harga_satuan' => 60000,
                    'bulan' => 'April',
                    'volume' => 1,
                    'satuan' => 'rim',
                ],
                [
                    // Cross-month shift of legacy BKU row (Mei -> Juni) -> MUST surface in protected_bku & NOT duplicate!
                    'kode_kegiatan' => '03.03.06.',
                    'kode_rekening' => '5.2.02.05.02.0005',
                    'uraian' => 'Tinta Printer Legacy BKU',
                    'harga_satuan' => 95000,
                    'bulan' => 'Juni',
                    'volume' => 1,
                    'satuan' => 'botol',
                ],
            ],
        ];

        $mockEngine = Mockery::mock(ArkasEngineService::class);
        $mockEngine->shouldReceive('runScriptOrThrow')
            ->twice()
            ->with('dump_rkas.py', ['dump', '2027', '1'], 60)
            ->andReturn($arkasConflictDump);
        $this->app->instance(ArkasEngineService::class, $mockEngine);

        $checkResp = $this->actingAs($this->bendahara)->getJson("/rkas/{$this->penganggaran->id}/check-arkas");
        $checkResp->assertOk()
            ->assertJsonPath('diff_preview.has_differences', true)
            ->assertJsonCount(0, 'diff_preview.will_insert')
            ->assertJsonCount(2, 'diff_preview.protected_bku')
            ->assertJsonCount(2, 'diff_preview.unmatched_arkas');

        $pullResp = $this->actingAs($this->bendahara)
            ->from("/rkas/{$this->penganggaran->id}")
            ->post("/rkas/{$this->penganggaran->id}/pull-arkas", ['mode' => 'reconcile']);

        $pullResp->assertSessionHasNoErrors();
        // Zero duplicate inserts — still exactly 2 rows with original values intact!
        $this->assertDatabaseCount('rkas', 2);
        $this->assertDatabaseHas('rkas', ['id' => $volConflictRow->id, 'jumlah' => 2, 'bulan' => 'April']);
        $this->assertDatabaseHas('rkas', ['id' => $legacyShiftRow->id, 'jumlah' => 1, 'bulan' => 'Mei']);

        // Guard: when RkasPerubahan exists, mode=reconcile on RKAS Awal must be blocked
        RkasPerubahan::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningCatalog->id,
            'uraian' => 'Baris Perubahan Aktif',
            'harga_satuan' => 50000,
            'bulan' => 'Juli',
            'jumlah' => 1,
            'satuan' => 'buah',
        ]);
        $blockedResp = $this->actingAs($this->bendahara)
            ->from("/rkas/{$this->penganggaran->id}")
            ->post("/rkas/{$this->penganggaran->id}/pull-arkas", ['mode' => 'reconcile']);
        $blockedResp->assertSessionHasErrors(['message']);

        // Kinerja variant balanced Mode D reconcile syncs pagu_anggaran cleanly
        $kinerjaPenganggaran = KinerjaPenganggaran::create([
            'tahun_anggaran' => 2027,
            'pagu_anggaran' => 30000000,
            'kepala_sekolah' => 'Kepala Sekolah',
            'sk_kepala_sekolah' => 'SK-K-001',
            'nip_kepala_sekolah' => '198001012005011001',
            'bendahara' => 'Bendahara Kinerja',
            'sk_bendahara' => 'SK-K-002',
            'nip_bendahara' => '198501012010012002',
            'komite' => 'Ketua Komite',
            'tanggal_sk_kepala_sekolah' => '2027-01-02',
            'tanggal_sk_bendahara' => '2027-01-02',
        ]);

        $kinerjaRow = KinerjaRkas::create([
            'kinerja_penganggaran_id' => $kinerjaPenganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningCatalog->id,
            'uraian' => 'Pelatihan Guru Kinerja SIKAS',
            'uraian_arkas' => null,
            'harga_satuan' => 250000,
            'bulan' => 'Maret',
            'jumlah' => 4,
            'satuan' => 'paket',
        ]);

        $mockKinerjaEngine = Mockery::mock(ArkasEngineService::class);
        $mockKinerjaEngine->shouldReceive('runScriptOrThrow')
            ->once()
            ->with('dump_rkas.py', ['dump', '2027', '12'], 60)
            ->andReturn([
                'status' => 'success',
                'exists' => true,
                'is_revisi' => 1,
                'pagu' => 35000000,
                'data' => [
                    [
                        'kode_kegiatan' => '03.03.06.',
                        'kode_rekening' => '5.2.02.05.02.0005',
                        'uraian' => 'Paket Pelatihan ARKAS',
                        'harga_satuan' => 250000,
                        'bulan' => 'Mei',
                        'volume' => 4,
                        'satuan' => 'paket',
                    ],
                ],
            ]);
        $this->app->instance(ArkasEngineService::class, $mockKinerjaEngine);

        $kinerjaResp = $this->actingAs($this->bendahara)
            ->from("/kinerja/rkas/{$kinerjaPenganggaran->id}")
            ->post("/kinerja/rkas/{$kinerjaPenganggaran->id}/pull-arkas", ['mode' => 'reconcile']);

        $kinerjaResp->assertSessionHasNoErrors();
        $kinerjaResp->assertSessionHas('success');
        $this->assertDatabaseHas('kinerja_rkas', [
            'id' => $kinerjaRow->id,
            'bulan' => 'Mei',
            'uraian' => 'Pelatihan Guru Kinerja SIKAS',
            'uraian_arkas' => 'Paket Pelatihan ARKAS',
        ]);
        $this->assertEquals(35000000, (float) $kinerjaPenganggaran->fresh()->pagu_anggaran);
    }

    public function test_pull_arkas_smart_matching_handles_normalized_kegiatan_1_to_many_cross_month_and_split_month(): void
    {
        // Duplicate kode_kegiatans: one WITHOUT trailing dot (used by SIKAS) and one WITH trailing dot
        $kegNoDot = KodeKegiatan::create([
            'kode' => '08.04.13',
            'program' => 'Pengembangan Standar Penilaian',
            'sub_program' => 'Pelaksanaan Asesmen',
            'uraian' => 'Pelaksanaan TKA',
        ]);
        KodeKegiatan::create([
            'kode' => '08.04.13.',
            'program' => 'Pengembangan Standar Penilaian',
            'sub_program' => 'Pelaksanaan Asesmen',
            'uraian' => 'Pelaksanaan TKA',
        ]);

        $rekAtk = RekeningBelanja::create([
            'kode_rekening' => '5.1.02.01.01.0024',
            'rincian_objek' => 'Belanja ATK',
            'kategori' => 'Belanja Bahan',
        ]);
        $rekCetak = RekeningBelanja::create([
            'kode_rekening' => '5.1.02.01.01.0026',
            'rincian_objek' => 'Belanja Bahan Cetak',
            'kategori' => 'Belanja Bahan',
        ]);
        $rekInternet = RekeningBelanja::create([
            'kode_rekening' => '5.1.02.02.01.0063',
            'rincian_objek' => 'Belanja Kawat/Internet',
            'kategori' => 'Belanja Jasa',
        ]);

        // 1. 1-to-Many same month with mixed-case satuan (Botol vs botol): 1+1+1 = 3
        $tintaRed = Rkas::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $rekAtk->id,
            'uraian' => 'Tinta Printer EPSON Red',
            'uraian_arkas' => 'Tinta Printer Warna-', // already paired previously — must NOT break Blue & Yellow!
            'harga_satuan' => 150000,
            'bulan' => 'Maret',
            'jumlah' => 1,
            'satuan' => 'Botol',
        ]);
        $tintaBlue = Rkas::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $rekAtk->id,
            'uraian' => 'Tinta Printer EPSON Blue',
            'uraian_arkas' => null,
            'harga_satuan' => 150000,
            'bulan' => 'Maret',
            'jumlah' => 1,
            'satuan' => 'Botol',
        ]);
        $tintaYellow = Rkas::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $rekAtk->id,
            'uraian' => 'Tinta Printer EPSON Yellow',
            'uraian_arkas' => null,
            'harga_satuan' => 150000,
            'bulan' => 'Maret',
            'jumlah' => 1,
            'satuan' => 'botol',
        ]);

        // 2. 1-to-Many same month uneven volumes: 36 + 55 + 49 = 140
        $fc7 = Rkas::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $rekCetak->id,
            'uraian' => 'Fotocopy Soal Kelas VII',
            'uraian_arkas' => null,
            'harga_satuan' => 500,
            'bulan' => 'Juni',
            'jumlah' => 36,
            'satuan' => 'lembar',
        ]);
        $fc8 = Rkas::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $rekCetak->id,
            'uraian' => 'Fotocopy Soal Kelas VIII',
            'uraian_arkas' => null,
            'harga_satuan' => 500,
            'bulan' => 'Juni',
            'jumlah' => 55,
            'satuan' => 'lembar',
        ]);
        $fc9 = Rkas::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $rekCetak->id,
            'uraian' => 'Fotocopy Soal Kelas IX',
            'uraian_arkas' => null,
            'harga_satuan' => 500,
            'bulan' => 'Juni',
            'jumlah' => 49,
            'satuan' => 'lembar',
        ]);

        // 3. Cross-month 1-to-1: September vs Desember
        $lakban = Rkas::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $rekAtk->id,
            'uraian' => 'Lakban Bening Sedang',
            'uraian_arkas' => null,
            'harga_satuan' => 23000,
            'bulan' => 'September',
            'jumlah' => 5,
            'satuan' => 'buah',
        ]);

        // 4. Normalized kode_kegiatan (08.04.13 vs 08.04.13.) + Cross-month 1-to-1
        $pulsa = Rkas::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $kegNoDot->id,
            'kode_rekening_id' => $rekInternet->id,
            'uraian' => 'Pulsa Internet TKA',
            'uraian_arkas' => null,
            'harga_satuan' => 150000,
            'bulan' => 'Maret',
            'jumlah' => 2,
            'satuan' => 'kegiatan',
        ]);

        // 5. Normalized kode_kegiatan + Split-month 1-to-Many (Proktor 1 Mar + 1 Apr = 2 Apr; Teknisi 1 Mar + 1 Apr = 2 Apr)
        $proktorMar = Rkas::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $kegNoDot->id,
            'kode_rekening_id' => $this->rekeningManual->id,
            'uraian' => 'Insentif Proktor TKA',
            'uraian_arkas' => null,
            'harga_satuan' => 300000,
            'bulan' => 'Maret',
            'jumlah' => 1,
            'satuan' => 'orang',
        ]);
        $proktorApr = Rkas::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $kegNoDot->id,
            'kode_rekening_id' => $this->rekeningManual->id,
            'uraian' => 'Insentif Proktor TKA',
            'uraian_arkas' => null,
            'harga_satuan' => 300000,
            'bulan' => 'April',
            'jumlah' => 1,
            'satuan' => 'orang',
        ]);
        $teknisiMar = Rkas::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $kegNoDot->id,
            'kode_rekening_id' => $this->rekeningManual->id,
            'uraian' => 'Insentif Teknisi TKA',
            'uraian_arkas' => null,
            'harga_satuan' => 300000,
            'bulan' => 'Maret',
            'jumlah' => 1,
            'satuan' => 'orang',
        ]);
        $teknisiApr = Rkas::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $kegNoDot->id,
            'kode_rekening_id' => $this->rekeningManual->id,
            'uraian' => 'Insentif Teknisi TKA',
            'uraian_arkas' => null,
            'harga_satuan' => 300000,
            'bulan' => 'April',
            'jumlah' => 1,
            'satuan' => 'orang',
        ]);

        // 6. Many-to-1: 2 ARKAS items (1 Mei + 1 Juni) -> 1 SIKAS row (2 Mei)
        $konsumsi = Rkas::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $kegNoDot->id,
            'kode_rekening_id' => $this->rekeningCatalog->id,
            'uraian' => 'Konsumsi Rapat Persiapan',
            'uraian_arkas' => null,
            'harga_satuan' => 50000,
            'bulan' => 'Mei',
            'jumlah' => 2,
            'satuan' => 'paket',
        ]);

        $mockEngine = Mockery::mock(ArkasEngineService::class);
        $mockEngine->shouldReceive('runScriptOrThrow')
            ->once()
            ->with('dump_rkas.py', ['dump', '2027', '1'], 60)
            ->andReturn([
                'status' => 'success',
                'pagu' => 2235000,
                'data' => [
                    [
                        'kode_kegiatan' => '03.03.06.',
                        'kode_rekening' => '5.1.02.01.01.0024',
                        'uraian' => 'Tinta Printer Warna-',
                        'harga_satuan' => 150000,
                        'bulan' => 'Maret',
                        'volume' => 3,
                        'satuan' => 'botol',
                    ],
                    [
                        'kode_kegiatan' => '03.03.06.',
                        'kode_rekening' => '5.1.02.01.01.0026',
                        'uraian' => 'Photo Copy-Folio/Kwarto',
                        'harga_satuan' => 500,
                        'bulan' => 'Juni',
                        'volume' => 140,
                        'satuan' => 'lembar',
                    ],
                    [
                        'kode_kegiatan' => '03.03.06.',
                        'kode_rekening' => '5.1.02.01.01.0024',
                        'uraian' => 'Isolasi Double Tape-Ukuran 5 Cm Besar',
                        'harga_satuan' => 23000,
                        'bulan' => 'Desember',
                        'volume' => 5,
                        'satuan' => 'buah',
                    ],
                    [
                        'kode_kegiatan' => '08.04.13.',
                        'kode_rekening' => '5.1.02.02.01.0063',
                        'uraian' => 'Belanja Tagihan Internet-Tagihan Internet',
                        'harga_satuan' => 150000,
                        'bulan' => 'April',
                        'volume' => 2,
                        'satuan' => 'kegiatan',
                    ],
                    [
                        'kode_kegiatan' => '08.04.13.',
                        'kode_rekening' => '5.1.02.02.01.0013',
                        'uraian' => 'Honorarium Proktor Pelaksanaan TKA',
                        'harga_satuan' => 300000,
                        'bulan' => 'April',
                        'volume' => 2,
                        'satuan' => 'orang',
                    ],
                    [
                        'kode_kegiatan' => '08.04.13.',
                        'kode_rekening' => '5.1.02.02.01.0013',
                        'uraian' => 'Honorarium Teknisi Pelaksanaan TKA',
                        'harga_satuan' => 300000,
                        'bulan' => 'April',
                        'volume' => 2,
                        'satuan' => 'orang',
                    ],
                    [
                        'kode_kegiatan' => '08.04.13.',
                        'kode_rekening' => '5.2.02.05.02.0005',
                        'uraian' => 'Konsumsi Rapat ARKAS',
                        'harga_satuan' => 50000,
                        'bulan' => 'Mei',
                        'volume' => 1,
                        'satuan' => 'paket',
                    ],
                    [
                        'kode_kegiatan' => '08.04.13.',
                        'kode_rekening' => '5.2.02.05.02.0005',
                        'uraian' => 'Konsumsi Rapat ARKAS',
                        'harga_satuan' => 50000,
                        'bulan' => 'Juni',
                        'volume' => 1,
                        'satuan' => 'paket',
                    ],
                ],
            ]);

        $this->app->instance(ArkasEngineService::class, $mockEngine);

        $response = $this
            ->actingAs($this->bendahara)
            ->from("/rkas/{$this->penganggaran->id}")
            ->post("/rkas/{$this->penganggaran->id}/pull-arkas");

        $response->assertSessionHasNoErrors();
        $response->assertSessionHas('success');
        $response->assertSessionHas('arkas_sync_report', function (array $report) {
            return $report['mode'] === 'match_only'
                && $report['matched'] === 13
                && $report['cross_month_matched'] === 5
                && $report['inserted'] === 0
                && $report['is_budget_mismatch'] === false
                && $report['has_warnings'] === false
                && count($report['unmatched_arkas']) === 0
                && count($report['unpaired_sikas']) === 0;
        });

        // Zero rows inserted — total rows stay exactly 13
        $this->assertDatabaseCount('rkas', 13);

        // Verify all 1-to-many, cross-month, normalized-kode, split-month, and many-to-1 pairings!
        $this->assertEquals('Tinta Printer Warna-', $tintaRed->fresh()->uraian_arkas);
        $this->assertEquals('Tinta Printer Warna-', $tintaBlue->fresh()->uraian_arkas);
        $this->assertEquals('Tinta Printer Warna-', $tintaYellow->fresh()->uraian_arkas);
        $this->assertEquals('Photo Copy-Folio/Kwarto', $fc7->fresh()->uraian_arkas);
        $this->assertEquals('Photo Copy-Folio/Kwarto', $fc8->fresh()->uraian_arkas);
        $this->assertEquals('Photo Copy-Folio/Kwarto', $fc9->fresh()->uraian_arkas);
        $this->assertEquals('Isolasi Double Tape-Ukuran 5 Cm Besar', $lakban->fresh()->uraian_arkas);
        $this->assertEquals('Belanja Tagihan Internet-Tagihan Internet', $pulsa->fresh()->uraian_arkas);
        $this->assertEquals('Honorarium Proktor Pelaksanaan TKA', $proktorMar->fresh()->uraian_arkas);
        $this->assertEquals('Honorarium Proktor Pelaksanaan TKA', $proktorApr->fresh()->uraian_arkas);
        $this->assertEquals('Honorarium Teknisi Pelaksanaan TKA', $teknisiMar->fresh()->uraian_arkas);
        $this->assertEquals('Honorarium Teknisi Pelaksanaan TKA', $teknisiApr->fresh()->uraian_arkas);
        $this->assertEquals('Konsumsi Rapat ARKAS', $konsumsi->fresh()->uraian_arkas);

        // Uraian SIKAS preserved everywhere
        $this->assertEquals('Tinta Printer EPSON Blue', $tintaBlue->fresh()->uraian);
        $this->assertEquals('Lakban Bening Sedang', $lakban->fresh()->uraian);
        $this->assertEquals('Insentif Proktor TKA', $proktorMar->fresh()->uraian);
    }

    public function test_pull_arkas_reports_unpaired_sikas_and_unmatched_arkas_when_price_or_volume_differs(): void
    {
        $unmatchedSikas = Rkas::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningCatalog->id,
            'uraian' => 'Kompor Gas Praktik',
            'uraian_arkas' => null,
            'harga_satuan' => 400000,
            'bulan' => 'Februari',
            'jumlah' => 2,
            'satuan' => 'Unit',
        ]);

        $extraDuplicateSikas = Rkas::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningManual->id,
            'uraian' => 'Baris Berlebih SIKAS',
            'uraian_arkas' => 'Uraian Lama ARKAS',
            'harga_satuan' => 100000,
            'bulan' => 'Februari',
            'jumlah' => 1,
            'satuan' => 'Paket',
        ]);

        $mockEngine = Mockery::mock(ArkasEngineService::class);
        $mockEngine->shouldReceive('runScriptOrThrow')
            ->once()
            ->with('dump_rkas.py', ['dump', '2027', '1'], 60)
            ->andReturn([
                'status' => 'success',
                'pagu' => 900000,
                'data' => [
                    [
                        // Harga berbeda (450.000 vs 400.000) -> tidak boleh dipaksakan cocok dan tidak boleh auto-insert!
                        'kode_kegiatan' => '03.03.06.',
                        'kode_rekening' => '5.2.02.05.02.0005',
                        'uraian' => 'Kompor Gas 2 Tungku',
                        'harga_satuan' => 450000,
                        'bulan' => 'Februari',
                        'volume' => 2,
                        'satuan' => 'Unit',
                    ],
                ],
            ]);

        $this->app->instance(ArkasEngineService::class, $mockEngine);

        $response = $this
            ->actingAs($this->bendahara)
            ->from("/rkas/{$this->penganggaran->id}")
            ->post("/rkas/{$this->penganggaran->id}/pull-arkas");

        $response->assertSessionHasNoErrors();
        $response->assertSessionHas('warning');
        $response->assertSessionHas('arkas_sync_report', function (array $report) use ($unmatchedSikas, $extraDuplicateSikas) {
            $unpairedIds = array_column($report['unpaired_sikas'], 'id');
            $statusesById = array_column($report['unpaired_sikas'], 'status', 'id');

            return $report['matched'] === 0
                && $report['inserted'] === 0
                && $report['has_warnings'] === true
                && count($report['unmatched_arkas']) === 1
                && str_contains($report['unmatched_arkas'][0]['reason'], 'Harga satuan tidak cocok')
                && in_array($unmatchedSikas->id, $unpairedIds, true)
                && in_array($extraDuplicateSikas->id, $unpairedIds, true)
                && $statusesById[$unmatchedSikas->id] === 'belum_disandingkan'
                && $statusesById[$extraDuplicateSikas->id] === 'tidak_ada_di_arkas';
        });

        $this->assertDatabaseCount('rkas', 2);
        $this->assertNull($unmatchedSikas->fresh()->uraian_arkas);
    }

    public function test_pull_arkas_rkas_awal_when_empty_populates_both_uraian_sikas_and_uraian_arkas(): void
    {
        $mockEngine = Mockery::mock(ArkasEngineService::class);
        $mockEngine->shouldReceive('runScriptOrThrow')
            ->once()
            ->with('dump_rkas.py', ['dump', '2027', '1'], 60)
            ->andReturn([
                'status' => 'success',
                'pagu' => 120000000,
                'data' => [
                    [
                        'kode_kegiatan' => '03.03.06.',
                        'kode_rekening' => '5.2.02.05.02.0005',
                        'uraian' => 'Alat Dapur-',
                        'harga_satuan' => 250000,
                        'bulan' => 'Januari',
                        'volume' => 2,
                        'satuan' => 'Buah',
                    ],
                ],
            ]);

        $this->app->instance(ArkasEngineService::class, $mockEngine);

        $pullResponse = $this
            ->actingAs($this->bendahara)
            ->from("/rkas/{$this->penganggaran->id}")
            ->post("/rkas/{$this->penganggaran->id}/pull-arkas");

        $pullResponse->assertSessionHasNoErrors();
        $pullResponse->assertSessionHas('arkas_sync_report', function (array $report) {
            return $report['mode'] === 'initial_import'
                && $report['inserted'] === 1
                && $report['has_warnings'] === false
                && $report['selisih_rp'] === 0.0;
        });

        $this->assertEquals(120000000, (float) $this->penganggaran->fresh()->pagu_anggaran);

        $this->assertDatabaseHas('rkas', [
            'penganggaran_id' => $this->penganggaran->id,
            'uraian' => 'Alat Dapur-',
            'uraian_arkas' => 'Alat Dapur-',
        ]);
    }

    public function test_pull_arkas_supports_satuan_synonyms_subset_sum_and_kinerja_variant(): void
    {
        $kinerjaPenganggaran = KinerjaPenganggaran::create([
            'pagu_anggaran' => 50000000,
            'tahun_anggaran' => 2027,
            'kepala_sekolah' => 'Nama Kepsek',
            'sk_kepala_sekolah' => 'SK-K-001',
            'bendahara' => 'Nama Bendahara',
            'sk_bendahara' => 'SK-K-002',
            'komite' => 'Nama Komite',
            'nip_kepala_sekolah' => '198001012005011001',
            'nip_bendahara' => '198501012010012002',
            'tanggal_sk_kepala_sekolah' => '2027-01-02',
            'tanggal_sk_bendahara' => '2027-01-02',
        ]);

        // 1. Satuan synonym: SIKAS "dus" vs ARKAS "dos"
        $amplop = KinerjaRkas::create([
            'kinerja_penganggaran_id' => $kinerjaPenganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningCatalog->id,
            'uraian' => 'Amplop Putih Besar',
            'uraian_arkas' => null,
            'harga_satuan' => 35000,
            'bulan' => 'Maret',
            'jumlah' => 2,
            'satuan' => 'dus',
        ]);

        // 2. Bounded subset-sum when eligible total > target volume (2 + 3 = 5, leaving extra row 10 unpaired)
        $subA = KinerjaRkas::create([
            'kinerja_penganggaran_id' => $kinerjaPenganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningManual->id,
            'uraian' => 'Kertas HVS A4',
            'uraian_arkas' => null,
            'harga_satuan' => 60000,
            'bulan' => 'April',
            'jumlah' => 2,
            'satuan' => 'rim',
        ]);
        $subB = KinerjaRkas::create([
            'kinerja_penganggaran_id' => $kinerjaPenganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningManual->id,
            'uraian' => 'Kertas HVS F4',
            'uraian_arkas' => null,
            'harga_satuan' => 60000,
            'bulan' => 'April',
            'jumlah' => 3,
            'satuan' => 'rim',
        ]);
        $extraUnmatched = KinerjaRkas::create([
            'kinerja_penganggaran_id' => $kinerjaPenganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningManual->id,
            'uraian' => 'Kertas HVS Cadangan Berlebih',
            'uraian_arkas' => null,
            'harga_satuan' => 60000,
            'bulan' => 'April',
            'jumlah' => 4,
            'satuan' => 'rim',
        ]);

        $mockEngine = Mockery::mock(ArkasEngineService::class);
        $mockEngine->shouldReceive('runScriptOrThrow')
            ->once()
            ->with('dump_rkas.py', ['dump', '2027', '12'], 60)
            ->andReturn([
                'status' => 'success',
                'pagu' => 370000,
                'data' => [
                    [
                        'kode_kegiatan' => '03.03.06.',
                        'kode_rekening' => '5.2.02.05.02.0005',
                        'uraian' => 'Amplop Putih-Ukuran 11x 23Cm',
                        'harga_satuan' => 35000,
                        'bulan' => 'Maret',
                        'volume' => 2,
                        'satuan' => 'dos',
                    ],
                    [
                        'kode_kegiatan' => '03.03.06.',
                        'kode_rekening' => '5.1.02.02.01.0013',
                        'uraian' => 'Kertas HVS',
                        'harga_satuan' => 60000,
                        'bulan' => 'April',
                        'volume' => 5,
                        'satuan' => 'rim',
                    ],
                ],
            ]);

        $this->app->instance(ArkasEngineService::class, $mockEngine);

        $response = $this
            ->actingAs($this->bendahara)
            ->from("/kinerja/rkas/{$kinerjaPenganggaran->id}")
            ->post("/kinerja/rkas/{$kinerjaPenganggaran->id}/pull-arkas");

        $response->assertSessionHasNoErrors();
        $response->assertSessionHas('warning');
        $response->assertSessionHas('arkas_sync_report', function (array $report) use ($extraUnmatched) {
            return $report['mode'] === 'match_only'
                && $report['matched'] === 3
                && $report['cross_month_matched'] === 0
                && $report['inserted'] === 0
                && $report['is_budget_mismatch'] === true
                && count($report['unmatched_arkas']) === 0
                && count($report['unpaired_sikas']) === 1
                && $report['unpaired_sikas'][0]['id'] === $extraUnmatched->id;
        });

        $this->assertEquals('Amplop Putih-Ukuran 11x 23Cm', $amplop->fresh()->uraian_arkas);
        $this->assertEquals('Kertas HVS', $subA->fresh()->uraian_arkas);
        $this->assertEquals('Kertas HVS', $subB->fresh()->uraian_arkas);
        $this->assertNull($extraUnmatched->fresh()->uraian_arkas);
        $this->assertEquals(50000000, (float) $kinerjaPenganggaran->fresh()->pagu_anggaran);
    }

    public function test_pull_arkas_rkas_perubahan_safe_sync_preserves_sikas_uraian_even_with_bku_tahap2(): void
    {
        $existingPerubahan = RkasPerubahan::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningCatalog->id,
            'uraian' => 'Wajan Penggorengan Praktik Tata Boga',
            'uraian_arkas' => null,
            'id_barang_arkas' => null,
            'harga_satuan' => 250000,
            'bulan' => 'Agustus',
            'jumlah' => 2,
            'satuan' => 'Buah',
        ]);

        // BKU Tahap 2 exists
        BukuKasUmum::create([
            'penganggaran_id' => $this->penganggaran->id,
            'id_transaksi' => 'BPU-T2-01',
            'tanggal_transaksi' => '2027-08-15',
            'kode_kegiatan_id' => $this->kegiatan->id,
            'rekening_belanja_id' => $this->rekeningCatalog->id,
            'uraian' => 'Wajan Penggorengan Praktik Tata Boga',
            'jenis_transaksi' => 'tunai',
            'total_transaksi_kotor' => 500000,
            'dibelanjakan' => 500000,
            'is_bunga_record' => false,
        ]);

        $mockEngine = Mockery::mock(ArkasEngineService::class);
        $mockEngine->shouldReceive('runScriptOrThrow')
            ->twice()
            ->with('dump_rkas_perubahan.py', ['dump', '2027', '1'], 60)
            ->andReturn([
                'status' => 'success',
                'exists' => true,
                'is_revisi' => 100,
                'pagu' => 125000000,
                'data' => [
                    [
                        'kode_kegiatan' => '03.03.06.',
                        'kode_rekening' => '5.2.02.05.02.0005',
                        'uraian' => 'Belanja Modal Alat Dapur-Alat Pemanggang',
                        'harga_satuan' => 250000,
                        'bulan' => 'Agustus',
                        'volume' => 2,
                        'satuan' => 'Buah',
                    ],
                ],
            ]);

        $this->app->instance(ArkasEngineService::class, $mockEngine);

        $checkResponse = $this
            ->actingAs($this->bendahara)
            ->getJson("/rkas-perubahan/{$this->penganggaran->id}/check-arkas");

        $checkResponse->assertOk()
            ->assertJson([
                'status' => 'success',
                'exists' => true,
                'has_bku_tahap2' => true,
                'can_pull' => true,
                'diff_preview' => [
                    'has_differences' => false,
                ],
            ]);

        // Dry-run check-arkas MUST NOT mutate uraian_arkas
        $this->assertDatabaseHas('rkas_perubahans', [
            'id' => $existingPerubahan->id,
            'uraian_arkas' => null,
        ]);

        $pullResponse = $this
            ->actingAs($this->bendahara)
            ->from("/rkas-perubahan/{$this->penganggaran->id}")
            ->post("/rkas-perubahan/{$this->penganggaran->id}/pull-arkas");

        $pullResponse->assertSessionHasNoErrors();
        $pullResponse->assertSessionHas('success');
        $pullResponse->assertSessionHas('arkas_sync_report', function (array $report) {
            return $report['mode'] === 'perubahan_reconcile'
                && $report['matched'] === 1
                && $report['updated_perubahan'] === 0
                && $report['inserted'] === 0
                && $report['deleted_perubahan'] === 0
                && $report['has_warnings'] === false;
        });

        // Mode C syncs pagu_anggaran when reconciled with Rp 0 selisih
        $this->assertEquals(125000000, (float) $this->penganggaran->fresh()->pagu_anggaran);

        $this->assertDatabaseHas('rkas_perubahans', [
            'id' => $existingPerubahan->id,
            'uraian' => 'Wajan Penggorengan Praktik Tata Boga',
            'uraian_arkas' => 'Belanja Modal Alat Dapur-Alat Pemanggang',
        ]);
    }

    public function test_rkas_perubahan_check_diff_preview_supports_tahap1_bku_volume_protection_and_match_only_mode(): void
    {
        // 1. Tahap 1 row missing in ARKAS -> must appear in diff_preview.protected_tahap1 and stay untouched
        $tahap1Row = RkasPerubahan::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningCatalog->id,
            'uraian' => 'Belanja Tahap 1 Terkunci',
            'uraian_arkas' => 'Belanja Tahap 1 Terkunci',
            'harga_satuan' => 100000,
            'bulan' => 'Maret',
            'jumlah' => 1,
            'satuan' => 'buah',
        ]);

        // 2. Partial BKU Tahap 2 row (Agustus vol 3, spent = 2) -> ARKAS reduces to vol 2 (safe: 2 >= spent 2!)
        $partialBkuRow = RkasPerubahan::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningCatalog->id,
            'uraian' => 'Kertas HVS Tahap 2 SIKAS',
            'uraian_arkas' => 'Kertas HVS ARKAS',
            'harga_satuan' => 60000,
            'bulan' => 'Agustus',
            'jumlah' => 3,
            'satuan' => 'rim',
        ]);

        // 3. Legacy BKU Tahap 2 row (rkas_perubahan_id = NULL, September vol 2, spent = 2) -> ARKAS reduces below spent (vol 1) -> BLOCKED & NO DUPLICATE!
        $legacyBkuRow = RkasPerubahan::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningCatalog->id,
            'uraian' => 'Tinta Printer Legacy Tahap 2',
            'uraian_arkas' => 'Tinta Printer Legacy Tahap 2',
            'harga_satuan' => 90000,
            'bulan' => 'September',
            'jumlah' => 2,
            'satuan' => 'botol',
        ]);

        // 4. Unprotected Tahap 2 cancelled row -> will_delete
        $cancelledRow = RkasPerubahan::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningCatalog->id,
            'uraian' => 'Item Tahap 2 Dibatalkan',
            'uraian_arkas' => 'Item Tahap 2 Dibatalkan',
            'harga_satuan' => 50000,
            'bulan' => 'November',
            'jumlah' => 1,
            'satuan' => 'buah',
        ]);

        $bkuAgustus = BukuKasUmum::create([
            'penganggaran_id' => $this->penganggaran->id,
            'id_transaksi' => 'BPU-T2-AGU',
            'tanggal_transaksi' => '2027-08-15',
            'kode_kegiatan_id' => $this->kegiatan->id,
            'rekening_belanja_id' => $this->rekeningCatalog->id,
            'uraian' => 'Belanja ATK',
            'jenis_transaksi' => 'tunai',
            'total_transaksi_kotor' => 120000,
            'dibelanjakan' => 120000,
            'is_bunga_record' => false,
        ]);

        BukuKasUmumUraianDetail::create([
            'buku_kas_umum_id' => $bkuAgustus->id,
            'rkas_perubahan_id' => $partialBkuRow->id,
            'kode_kegiatan_id' => $this->kegiatan->id,
            'rekening_belanja_id' => $this->rekeningCatalog->id,
            'uraian' => 'Kertas HVS Tahap 2 SIKAS',
            'volume' => 2,
            'satuan' => 'rim',
            'harga_satuan' => 60000,
            'jumlah' => 120000,
            'kondisi' => 'Baik',
        ]);

        $bkuSeptember = BukuKasUmum::create([
            'penganggaran_id' => $this->penganggaran->id,
            'id_transaksi' => 'BPU-T2-SEP',
            'tanggal_transaksi' => '2027-09-10',
            'kode_kegiatan_id' => $this->kegiatan->id,
            'rekening_belanja_id' => $this->rekeningCatalog->id,
            'uraian' => 'Belanja Tinta',
            'jenis_transaksi' => 'tunai',
            'total_transaksi_kotor' => 180000,
            'dibelanjakan' => 180000,
            'is_bunga_record' => false,
        ]);

        // Legacy Tahap 2 BKU detail with rkas_perubahan_id = NULL!
        BukuKasUmumUraianDetail::create([
            'buku_kas_umum_id' => $bkuSeptember->id,
            'rkas_perubahan_id' => null,
            'kode_kegiatan_id' => $this->kegiatan->id,
            'rekening_belanja_id' => $this->rekeningCatalog->id,
            'uraian' => 'Tinta Printer Legacy Tahap 2',
            'volume' => 2,
            'satuan' => 'botol',
            'harga_satuan' => 90000,
            'jumlah' => 180000,
            'kondisi' => 'Baik',
        ]);

        $arkasDump = [
            'status' => 'success',
            'exists' => true,
            'is_revisi' => 101,
            'pagu' => 100000000,
            'data' => [
                // Safe reduction on partial BKU row: 3 -> 2 (spent = 2)
                [
                    'kode_kegiatan' => '03.03.06.',
                    'kode_rekening' => '5.2.02.05.02.0005',
                    'uraian' => 'Kertas HVS ARKAS',
                    'harga_satuan' => 60000,
                    'bulan' => 'Agustus',
                    'volume' => 2,
                    'satuan' => 'rim',
                ],
                // Unsafe reduction on legacy BKU row: 2 -> 1 (spent = 2) -> BLOCKED & NO DUPLICATE INSERT!
                [
                    'kode_kegiatan' => '03.03.06.',
                    'kode_rekening' => '5.2.02.05.02.0005',
                    'uraian' => 'Tinta Printer Legacy Tahap 2',
                    'harga_satuan' => 90000,
                    'bulan' => 'September',
                    'volume' => 1,
                    'satuan' => 'botol',
                ],
                // Brand-new Tahap 2 item -> will_insert
                [
                    'kode_kegiatan' => '03.03.06.',
                    'kode_rekening' => '5.1.02.02.01.0013',
                    'uraian' => 'Honor Penyusun LPJ Perubahan',
                    'harga_satuan' => 500000,
                    'bulan' => 'Desember',
                    'volume' => 1,
                    'satuan' => 'orang / kegiatan',
                ],
            ],
        ];

        $mockEngine = Mockery::mock(ArkasEngineService::class);
        $mockEngine->shouldReceive('runScriptOrThrow')
            ->times(3)
            ->with('dump_rkas_perubahan.py', ['dump', '2027', '1'], 60)
            ->andReturn($arkasDump);
        $this->app->instance(ArkasEngineService::class, $mockEngine);

        // 1. Dry-run check-arkas returns full diff_preview WITHOUT modifying DB
        $checkResponse = $this
            ->actingAs($this->bendahara)
            ->getJson("/rkas-perubahan/{$this->penganggaran->id}/check-arkas");

        $checkResponse->assertOk()
            ->assertJson([
                'status' => 'success',
                'exists' => true,
                'is_revisi' => 101,
                'diff_preview' => [
                    'has_differences' => true,
                ],
            ])
            ->assertJsonCount(1, 'diff_preview.will_update')
            ->assertJsonCount(1, 'diff_preview.will_insert')
            ->assertJsonCount(1, 'diff_preview.will_delete')
            ->assertJsonCount(1, 'diff_preview.protected_bku')
            ->assertJsonCount(1, 'diff_preview.protected_tahap1')
            ->assertJsonCount(1, 'diff_preview.unmatched_arkas');

        // Confirm dry-run did not mutate DB
        $this->assertDatabaseCount('rkas_perubahans', 4);
        $this->assertDatabaseHas('rkas_perubahans', ['id' => $partialBkuRow->id, 'jumlah' => 3]);
        $this->assertDatabaseHas('rkas_perubahans', ['id' => $cancelledRow->id]);

        // 2. Secondary option: mode = 'match_only' does NOT modify/insert/delete any row
        $matchOnlyResp = $this
            ->actingAs($this->bendahara)
            ->from("/rkas-perubahan/{$this->penganggaran->id}")
            ->post("/rkas-perubahan/{$this->penganggaran->id}/pull-arkas", ['mode' => 'match_only']);

        $matchOnlyResp->assertSessionHasNoErrors();
        $matchOnlyResp->assertSessionHas('arkas_sync_report', fn (array $r) => $r['mode'] === 'match_only' && $r['inserted'] === 0);
        $this->assertDatabaseCount('rkas_perubahans', 4);
        $this->assertDatabaseHas('rkas_perubahans', ['id' => $partialBkuRow->id, 'jumlah' => 3]);
        $this->assertDatabaseHas('rkas_perubahans', ['id' => $cancelledRow->id]);

        // 3. User approves reconciliation: mode = 'reconcile'
        $reconcileResp = $this
            ->actingAs($this->bendahara)
            ->from("/rkas-perubahan/{$this->penganggaran->id}")
            ->post("/rkas-perubahan/{$this->penganggaran->id}/pull-arkas", ['mode' => 'reconcile']);

        $reconcileResp->assertSessionHasNoErrors();
        $reconcileResp->assertSessionHas('arkas_sync_report', fn (array $r) => $r['mode'] === 'perubahan_reconcile'
            && $r['updated_perubahan'] === 1
            && $r['inserted'] === 1
            && $r['deleted_perubahan'] === 1
            && count($r['unmatched_arkas']) === 1);

        // Partial BKU row safely reduced 3 -> 2 while keeping SIKAS uraian
        $this->assertDatabaseHas('rkas_perubahans', [
            'id' => $partialBkuRow->id,
            'jumlah' => 2,
            'uraian' => 'Kertas HVS Tahap 2 SIKAS',
        ]);
        // Legacy BKU row protected at vol 2 & NO duplicate inserted
        $this->assertDatabaseHas('rkas_perubahans', ['id' => $legacyBkuRow->id, 'jumlah' => 2]);
        $this->assertEquals(1, RkasPerubahan::where('penganggaran_id', $this->penganggaran->id)
            ->where('uraian', 'Tinta Printer Legacy Tahap 2')
            ->count());
        // Tahap 1 untouched, cancelled Tahap 2 deleted, new Tahap 2 item inserted
        $this->assertDatabaseHas('rkas_perubahans', ['id' => $tahap1Row->id, 'bulan' => 'Maret']);
        $this->assertDatabaseMissing('rkas_perubahans', ['id' => $cancelledRow->id]);
        $this->assertDatabaseHas('rkas_perubahans', [
            'penganggaran_id' => $this->penganggaran->id,
            'uraian' => 'Honor Penyusun LPJ Perubahan',
            'bulan' => 'Desember',
        ]);
    }

    public function test_rkas_perubahan_split_month_tahap2_tahap1_fk_label_and_validation_guards(): void
    {
        // 1. Tahap 1 row WITH rkas_perubahan_id BKU FK -> must route to protected_tahap1 (NOT protected_bku Tahap 2)
        $tahap1WithFk = RkasPerubahan::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningCatalog->id,
            'uraian' => 'Belanja Tahap 1 Ber-FK',
            'uraian_arkas' => 'Belanja Tahap 1 Ber-FK',
            'harga_satuan' => 100000,
            'bulan' => 'Maret',
            'jumlah' => 1,
            'satuan' => 'buah',
        ]);

        // 2. Tahap 2 partial-BKU row (Agustus vol 2, spent=1) -> ARKAS splits into Agustus 1 + September 1!
        // Must split cleanly (NOT swallowed by Pass 6) and inherit SIKAS uraian in September!
        $tahap2SplitRow = RkasPerubahan::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningManual->id,
            'uraian' => 'Honor Operator Tahap 2 SIKAS',
            'uraian_arkas' => 'Honor Operator Tahap 2 ARKAS',
            'harga_satuan' => 300000,
            'bulan' => 'Agustus',
            'jumlah' => 2,
            'satuan' => 'orang / kegiatan',
        ]);

        $bku = BukuKasUmum::create([
            'penganggaran_id' => $this->penganggaran->id,
            'id_transaksi' => 'BPU-SPLIT-T2',
            'tanggal_transaksi' => '2027-08-10',
            'kode_kegiatan_id' => $this->kegiatan->id,
            'rekening_belanja_id' => $this->rekeningManual->id,
            'uraian' => 'Belanja Split',
            'jenis_transaksi' => 'tunai',
            'total_transaksi_kotor' => 400000,
            'dibelanjakan' => 400000,
            'is_bunga_record' => false,
        ]);

        BukuKasUmumUraianDetail::create([
            'buku_kas_umum_id' => $bku->id,
            'rkas_perubahan_id' => $tahap1WithFk->id,
            'kode_kegiatan_id' => $this->kegiatan->id,
            'rekening_belanja_id' => $this->rekeningCatalog->id,
            'uraian' => 'Belanja Tahap 1 Ber-FK',
            'volume' => 1,
            'satuan' => 'buah',
            'harga_satuan' => 100000,
            'jumlah' => 100000,
            'kondisi' => 'Baik',
        ]);

        BukuKasUmumUraianDetail::create([
            'buku_kas_umum_id' => $bku->id,
            'rkas_perubahan_id' => $tahap2SplitRow->id,
            'kode_kegiatan_id' => $this->kegiatan->id,
            'rekening_belanja_id' => $this->rekeningManual->id,
            'uraian' => 'Honor Operator Tahap 2 SIKAS',
            'volume' => 1,
            'satuan' => 'orang / kegiatan',
            'harga_satuan' => 300000,
            'jumlah' => 300000,
            'kondisi' => 'Baik',
        ]);

        $arkasDump = [
            'status' => 'success',
            'exists' => true,
            'is_revisi' => 102,
            'pagu' => 100000000,
            'data' => [
                [
                    'kode_kegiatan' => '03.03.06.',
                    'kode_rekening' => '5.1.02.02.01.0013',
                    'uraian' => 'Honor Operator Tahap 2 ARKAS',
                    'harga_satuan' => 300000,
                    'bulan' => 'Agustus',
                    'volume' => 1,
                    'satuan' => 'orang / kegiatan',
                ],
                [
                    'kode_kegiatan' => '03.03.06.',
                    'kode_rekening' => '5.1.02.02.01.0013',
                    'uraian' => 'Honor Operator Tahap 2 ARKAS',
                    'harga_satuan' => 300000,
                    'bulan' => 'September',
                    'volume' => 1,
                    'satuan' => 'orang / kegiatan',
                ],
            ],
        ];

        $mockEngine = Mockery::mock(ArkasEngineService::class);
        $mockEngine->shouldReceive('runScriptOrThrow')
            ->twice()
            ->with('dump_rkas_perubahan.py', ['dump', '2027', '1'], 60)
            ->andReturn($arkasDump);
        $this->app->instance(ArkasEngineService::class, $mockEngine);

        // 1. Dry-run preview detects split-month (1 update + 1 insert) AND routes Tahap 1 to protected_tahap1 (0 protected_bku)
        $checkResp = $this->actingAs($this->bendahara)->getJson("/rkas-perubahan/{$this->penganggaran->id}/check-arkas");
        $checkResp->assertOk()
            ->assertJsonCount(1, 'diff_preview.will_update')
            ->assertJsonCount(1, 'diff_preview.will_insert')
            ->assertJsonCount(0, 'diff_preview.protected_bku')
            ->assertJsonCount(1, 'diff_preview.protected_tahap1')
            ->assertJsonPath('diff_preview.will_insert.0.inherited_from_sikas', true);

        // 2. Reconcile applies split-month cleanly & inherits SIKAS uraian
        $pullResp = $this->actingAs($this->bendahara)
            ->from("/rkas-perubahan/{$this->penganggaran->id}")
            ->post("/rkas-perubahan/{$this->penganggaran->id}/pull-arkas", ['mode' => 'reconcile']);
        $pullResp->assertSessionHasNoErrors();

        $this->assertDatabaseHas('rkas_perubahans', [
            'id' => $tahap2SplitRow->id,
            'bulan' => 'Agustus',
            'jumlah' => 1,
            'uraian' => 'Honor Operator Tahap 2 SIKAS',
        ]);
        $this->assertDatabaseHas('rkas_perubahans', [
            'penganggaran_id' => $this->penganggaran->id,
            'bulan' => 'September',
            'jumlah' => 1,
            'uraian' => 'Honor Operator Tahap 2 SIKAS',
            'uraian_arkas' => 'Honor Operator Tahap 2 ARKAS',
        ]);

        // 3. Invalid mode validation & silpa variant 422 guard
        $invalidMode = $this->actingAs($this->bendahara)
            ->from("/rkas-perubahan/{$this->penganggaran->id}")
            ->post("/rkas-perubahan/{$this->penganggaran->id}/pull-arkas", ['mode' => 'invalid_mode']);
        $invalidMode->assertSessionHasErrors(['mode']);

        $silpaGuard = $this->actingAs($this->bendahara)
            ->getJson("/silpa/rkas-perubahan/{$this->penganggaran->id}/check-arkas");
        $silpaGuard->assertStatus(422);
    }

    public function test_pull_arkas_rkas_perubahan_reconciles_tahap2_shifts_inserts_deletes_while_protecting_tahap1_and_bku(): void
    {
        // 1. Tahap 1 row (Maret) — missing from ARKAS, MUST be protected (never deleted/mutated)
        $tahap1Row = RkasPerubahan::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningCatalog->id,
            'uraian' => 'Belanja Tahap 1 Terkunci',
            'uraian_arkas' => 'Alat Dapur-Terkunci',
            'harga_satuan' => 100000,
            'bulan' => 'Maret',
            'jumlah' => 1,
            'satuan' => 'Buah',
        ]);

        // 2. Tahap 2 book row (November buah) -> shifted in ARKAS to Oktober exemplar (Pass A1/A2)
        $shiftedBookRow = RkasPerubahan::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningCatalog->id,
            'uraian' => 'Buku Panduan Guru Matematika Kelas IX SIKAS',
            'uraian_arkas' => null,
            'harga_satuan' => 94200,
            'bulan' => 'November',
            'jumlah' => 1,
            'satuan' => 'buah',
        ]);

        // 3. Tahap 2 same-satuan shift (September buah -> Desember buah) handled via Pass 4 cross-month
        $shiftedSameSatuanRow = RkasPerubahan::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningCatalog->id,
            'uraian' => 'Lakban Bening Sedang SIKAS',
            'uraian_arkas' => null,
            'harga_satuan' => 23000,
            'bulan' => 'September',
            'jumlah' => 5,
            'satuan' => 'buah',
        ]);

        // 4. Tahap 2 volume increase (September 2 dus -> September 4 dos)
        $volumeEditedRow = RkasPerubahan::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningCatalog->id,
            'uraian' => 'Amplop Kabinet Putih SIKAS',
            'uraian_arkas' => 'Amplop Putih-Ukuran 11x23',
            'harga_satuan' => 35000,
            'bulan' => 'September',
            'jumlah' => 2,
            'satuan' => 'dus',
        ]);

        // 5. Tahap 2 cancelled item WITHOUT BKU -> MUST be auto-deleted
        $cancelledFreeRow = RkasPerubahan::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningCatalog->id,
            'uraian' => 'Item Dibatalkan Tanpa BKU',
            'uraian_arkas' => 'Item Dibatalkan Tanpa BKU',
            'harga_satuan' => 50000,
            'bulan' => 'Oktober',
            'jumlah' => 2,
            'satuan' => 'buah',
        ]);

        // 6. Tahap 2 cancelled item WITH BKU detail -> MUST be protected from deletion
        $cancelledProtectedRow = RkasPerubahan::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningCatalog->id,
            'uraian' => 'Item Sudah Terpakai BKU Tahap 2',
            'uraian_arkas' => 'Item Sudah Terpakai BKU Tahap 2',
            'harga_satuan' => 75000,
            'bulan' => 'Agustus',
            'jumlah' => 1,
            'satuan' => 'buah',
        ]);

        $bkuTahap2 = BukuKasUmum::create([
            'penganggaran_id' => $this->penganggaran->id,
            'id_transaksi' => 'BPU-T2-PROT',
            'tanggal_transaksi' => '2027-08-18',
            'kode_kegiatan_id' => $this->kegiatan->id,
            'rekening_belanja_id' => $this->rekeningCatalog->id,
            'uraian' => 'Belanja Modal Alat Dapur',
            'jenis_transaksi' => 'tunai',
            'total_transaksi_kotor' => 75000,
            'dibelanjakan' => 75000,
            'is_bunga_record' => false,
        ]);

        BukuKasUmumUraianDetail::create([
            'buku_kas_umum_id' => $bkuTahap2->id,
            'rkas_perubahan_id' => $cancelledProtectedRow->id,
            'kode_kegiatan_id' => $this->kegiatan->id,
            'rekening_belanja_id' => $this->rekeningCatalog->id,
            'uraian' => 'Item Sudah Terpakai BKU Tahap 2',
            'volume' => 1,
            'satuan' => 'buah',
            'harga_satuan' => 75000,
            'jumlah' => 75000,
            'kondisi' => 'Baik',
        ]);

        $mockEngine = Mockery::mock(ArkasEngineService::class);
        $mockEngine->shouldReceive('runScriptOrThrow')
            ->once()
            ->with('dump_rkas_perubahan.py', ['dump', '2027', '1'], 60)
            ->andReturn([
                'status' => 'success',
                'is_revisi' => 100,
                'pagu' => 100000000,
                'data' => [
                    // Matches Tahap 1 row untouched? Intentionally omitted to test Tahap 1 protection!
                    // Book shifted to Oktober + exemplar + shortened ARKAS title
                    [
                        'kode_kegiatan' => '03.03.06.',
                        'kode_rekening' => '5.2.02.05.02.0005',
                        'uraian' => 'Buku Guru Matematika',
                        'harga_satuan' => 94200,
                        'bulan' => 'Oktober',
                        'volume' => 1,
                        'satuan' => 'exemplar',
                    ],
                    // Same-satuan shift September -> Desember
                    [
                        'kode_kegiatan' => '03.03.06.',
                        'kode_rekening' => '5.2.02.05.02.0005',
                        'uraian' => 'Isolasi Double Tape',
                        'harga_satuan' => 23000,
                        'bulan' => 'Desember',
                        'volume' => 5,
                        'satuan' => 'buah',
                    ],
                    // Volume increased 2 -> 4 & satuan dus -> dos
                    [
                        'kode_kegiatan' => '03.03.06.',
                        'kode_rekening' => '5.2.02.05.02.0005',
                        'uraian' => 'Amplop Putih-Ukuran 11x23',
                        'harga_satuan' => 35000,
                        'bulan' => 'September',
                        'volume' => 4,
                        'satuan' => 'dos',
                    ],
                    // Brand-new Tahap 2 item -> auto-inserted
                    [
                        'kode_kegiatan' => '03.03.06.',
                        'kode_rekening' => '5.1.02.02.01.0013',
                        'uraian' => 'Insentif Penyusun LPJ',
                        'harga_satuan' => 750000,
                        'bulan' => 'Desember',
                        'volume' => 1,
                        'satuan' => 'orang / kegiatan',
                    ],
                ],
            ]);

        $this->app->instance(ArkasEngineService::class, $mockEngine);

        $pullResponse = $this
            ->actingAs($this->bendahara)
            ->from("/rkas-perubahan/{$this->penganggaran->id}")
            ->post("/rkas-perubahan/{$this->penganggaran->id}/pull-arkas");

        $pullResponse->assertSessionHasNoErrors();
        $pullResponse->assertSessionHas('warning');
        $pullResponse->assertSessionHas('arkas_sync_report', function (array $report) use ($cancelledProtectedRow) {
            $unpairedIds = array_column($report['unpaired_sikas'], 'id');

            return $report['mode'] === 'perubahan_reconcile'
                && $report['matched'] === 3
                && $report['updated_perubahan'] === 3
                && $report['inserted'] === 1
                && $report['deleted_perubahan'] === 1
                && count($report['unmatched_arkas']) === 0
                && in_array($cancelledProtectedRow->id, $unpairedIds, true);
        });

        // 1. Tahap 1 row protected & untouched
        $this->assertDatabaseHas('rkas_perubahans', [
            'id' => $tahap1Row->id,
            'bulan' => 'Maret',
            'uraian' => 'Belanja Tahap 1 Terkunci',
        ]);

        // 2. Shifted book updated to Oktober + exemplar while PRESERVING SIKAS uraian
        $this->assertDatabaseHas('rkas_perubahans', [
            'id' => $shiftedBookRow->id,
            'bulan' => 'Oktober',
            'satuan' => 'exemplar',
            'jumlah' => 1,
            'uraian' => 'Buku Panduan Guru Matematika Kelas IX SIKAS',
            'uraian_arkas' => 'Buku Guru Matematika',
        ]);

        // 3. Same-satuan row shifted September -> Desember while PRESERVING SIKAS uraian
        $this->assertDatabaseHas('rkas_perubahans', [
            'id' => $shiftedSameSatuanRow->id,
            'bulan' => 'Desember',
            'satuan' => 'buah',
            'jumlah' => 5,
            'uraian' => 'Lakban Bening Sedang SIKAS',
            'uraian_arkas' => 'Isolasi Double Tape',
        ]);

        // 4. Volume-edited row updated to 4 dos while PRESERVING SIKAS uraian
        $this->assertDatabaseHas('rkas_perubahans', [
            'id' => $volumeEditedRow->id,
            'bulan' => 'September',
            'satuan' => 'dos',
            'jumlah' => 4,
            'uraian' => 'Amplop Kabinet Putih SIKAS',
            'uraian_arkas' => 'Amplop Putih-Ukuran 11x23',
        ]);

        // 5. Brand-new Tahap 2 ARKAS item inserted
        $this->assertDatabaseHas('rkas_perubahans', [
            'penganggaran_id' => $this->penganggaran->id,
            'bulan' => 'Desember',
            'uraian' => 'Insentif Penyusun LPJ',
            'uraian_arkas' => 'Insentif Penyusun LPJ',
            'jumlah' => 1,
            'harga_satuan' => 750000,
        ]);

        // 6. Cancelled row WITHOUT BKU deleted
        $this->assertDatabaseMissing('rkas_perubahans', [
            'id' => $cancelledFreeRow->id,
        ]);

        // 7. Cancelled row WITH BKU protected (still in DB)
        $this->assertDatabaseHas('rkas_perubahans', [
            'id' => $cancelledProtectedRow->id,
            'bulan' => 'Agustus',
            'uraian' => 'Item Sudah Terpakai BKU Tahap 2',
        ]);
    }

    public function test_pull_arkas_rkas_perubahan_protects_bku_price_isolates_tahap_and_supports_kinerja_variant(): void
    {
        $kinerjaPenganggaran = KinerjaPenganggaran::create([
            'tahun_anggaran' => 2027,
            'pagu_anggaran' => 35000000,
            'kepala_sekolah' => 'Kepala Sekolah',
            'sk_kepala_sekolah' => 'SK-K-001',
            'nip_kepala_sekolah' => '198001012005011001',
            'bendahara' => 'Bendahara Kinerja',
            'sk_bendahara' => 'SK-K-002',
            'nip_bendahara' => '198501012010012002',
            'komite' => 'Ketua Komite',
            'tanggal_sk_kepala_sekolah' => '2027-01-02',
            'tanggal_sk_bendahara' => '2027-01-02',
        ]);

        // 1. Tahap 1 row (Mei) with identical harga/satuan/volume as a NEW Tahap 2 ARKAS item (Oktober)
        // Must NOT be claimed cross-Tahap!
        $tahap1Row = KinerjaRkasPerubahan::create([
            'kinerja_penganggaran_id' => $kinerjaPenganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningCatalog->id,
            'uraian' => 'Belanja Tahap 1 Mei',
            'uraian_arkas' => 'Belanja Tahap 1 Mei',
            'harga_satuan' => 150000,
            'bulan' => 'Mei',
            'jumlah' => 2,
            'satuan' => 'buah',
        ]);

        // 2. Tahap 2 row WITH BKU detail — ARKAS tries to change harga_satuan (Pass A3) -> MUST be protected!
        $bkuProtectedPriceRow = KinerjaRkasPerubahan::create([
            'kinerja_penganggaran_id' => $kinerjaPenganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningCatalog->id,
            'uraian' => 'Alat Praktik Terpakai BKU',
            'uraian_arkas' => 'Alat Praktik Terpakai BKU',
            'harga_satuan' => 200000,
            'bulan' => 'Agustus',
            'jumlah' => 2,
            'satuan' => 'buah',
        ]);

        $kinerjaBku = KinerjaBukuKasUmum::create([
            'kinerja_penganggaran_id' => $kinerjaPenganggaran->id,
            'id_transaksi' => 'BPU-KIN-T2',
            'tanggal_transaksi' => '2027-08-20',
            'kode_kegiatan_id' => $this->kegiatan->id,
            'rekening_belanja_id' => $this->rekeningCatalog->id,
            'uraian' => 'Alat Praktik Terpakai BKU',
            'jenis_transaksi' => 'tunai',
            'total_transaksi_kotor' => 400000,
            'dibelanjakan' => 400000,
            'is_bunga_record' => false,
        ]);

        KinerjaBukuKasUmumUraianDetail::create([
            'kinerja_buku_kas_umum_id' => $kinerjaBku->id,
            'kinerja_rkas_perubahan_id' => $bkuProtectedPriceRow->id,
            'kode_kegiatan_id' => $this->kegiatan->id,
            'rekening_belanja_id' => $this->rekeningCatalog->id,
            'uraian' => 'Alat Praktik Terpakai BKU',
            'volume' => 2,
            'satuan' => 'buah',
            'harga_satuan' => 200000,
            'jumlah' => 400000,
            'kondisi' => 'Baik',
        ]);

        // 3. Unprotected Tahap 2 row shifted month with lowercase bulan from ARKAS -> canonicalized to Title Case
        $shiftRow = KinerjaRkasPerubahan::create([
            'kinerja_penganggaran_id' => $kinerjaPenganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningCatalog->id,
            'uraian' => 'Modul Pelatihan Guru SIKAS',
            'uraian_arkas' => null,
            'harga_satuan' => 85000,
            'bulan' => 'November',
            'jumlah' => 3,
            'satuan' => 'buah',
        ]);

        $mockEngine = Mockery::mock(ArkasEngineService::class);
        $mockEngine->shouldReceive('runScriptOrThrow')
            ->once()
            ->with('dump_rkas_perubahan.py', ['dump', '2027', '12'], 60)
            ->andReturn([
                'status' => 'success',
                'is_revisi' => 100,
                'pagu' => 35000000,
                'data' => [
                    // New Tahap 2 item with same harga/satuan/volume as Tahap 1 Mei row -> MUST be inserted, NOT paired to Mei!
                    [
                        'kode_kegiatan' => '03.03.06.',
                        'kode_rekening' => '5.2.02.05.02.0005',
                        'uraian' => 'Belanja Baru Tahap 2 Oktober',
                        'harga_satuan' => 150000,
                        'bulan' => 'Oktober',
                        'volume' => 2,
                        'satuan' => 'buah',
                    ],
                    // Same uraian & month as BKU-protected row, but DIFFERENT harga_satuan -> MUST NOT mutate protected row!
                    [
                        'kode_kegiatan' => '03.03.06.',
                        'kode_rekening' => '5.2.02.05.02.0005',
                        'uraian' => 'Alat Praktik Terpakai BKU',
                        'harga_satuan' => 250000,
                        'bulan' => 'Agustus',
                        'volume' => 2,
                        'satuan' => 'buah',
                    ],
                    // Shifted month with lowercase 'oktober' -> canonicalized to 'Oktober' while preserving SIKAS uraian
                    [
                        'kode_kegiatan' => '03.03.06.',
                        'kode_rekening' => '5.2.02.05.02.0005',
                        'uraian' => 'Modul Pelatihan ARKAS',
                        'harga_satuan' => 85000,
                        'bulan' => 'oktober',
                        'volume' => 3,
                        'satuan' => 'exemplar',
                    ],
                ],
            ]);

        $this->app->instance(ArkasEngineService::class, $mockEngine);

        $pullResponse = $this
            ->actingAs($this->bendahara)
            ->from("/kinerja/rkas-perubahan/{$kinerjaPenganggaran->id}")
            ->post("/kinerja/rkas-perubahan/{$kinerjaPenganggaran->id}/pull-arkas");

        $pullResponse->assertSessionHasNoErrors();

        // 1. Tahap 1 row untouched in Mei; Tahap 2 Oktober item inserted separately (strict Tahap isolation)
        $this->assertDatabaseHas('kinerja_rkas_perubahans', [
            'id' => $tahap1Row->id,
            'bulan' => 'Mei',
            'uraian' => 'Belanja Tahap 1 Mei',
        ]);
        $this->assertDatabaseHas('kinerja_rkas_perubahans', [
            'kinerja_penganggaran_id' => $kinerjaPenganggaran->id,
            'bulan' => 'Oktober',
            'uraian' => 'Belanja Baru Tahap 2 Oktober',
            'harga_satuan' => 150000,
        ]);

        // 2. BKU-protected row MUST keep original harga_satuan = 200000 (not overwritten to 250000)
        $this->assertDatabaseHas('kinerja_rkas_perubahans', [
            'id' => $bkuProtectedPriceRow->id,
            'bulan' => 'Agustus',
            'harga_satuan' => 200000,
            'jumlah' => 2,
        ]);

        // 3. Lowercase 'oktober' canonicalized to 'Oktober' and SIKAS uraian preserved
        $this->assertDatabaseHas('kinerja_rkas_perubahans', [
            'id' => $shiftRow->id,
            'bulan' => 'Oktober',
            'satuan' => 'exemplar',
            'uraian' => 'Modul Pelatihan Guru SIKAS',
            'uraian_arkas' => 'Modul Pelatihan ARKAS',
        ]);
    }

    public function test_rkas_summary_and_exports_support_uraian_arkas_toggle_with_clean_fallback_and_kinerja_variant(): void
    {
        // Paired item (has uraian_arkas)
        Rkas::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningCatalog->id,
            'uraian' => 'Wajan Praktik SIKAS',
            'uraian_arkas' => 'Alat Dapur-Wajan ARKAS',
            'harga_satuan' => 250000,
            'bulan' => 'Januari',
            'jumlah' => 2,
            'satuan' => 'Buah',
        ]);

        // Unpaired item (uraian_arkas is null -> must fall back cleanly to SIKAS uraian)
        Rkas::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningManual->id,
            'uraian' => 'Honorarium Pelatih SIKAS',
            'uraian_arkas' => null,
            'harga_satuan' => 300000,
            'bulan' => 'Januari',
            'jumlah' => 1,
            'satuan' => 'OB',
        ]);

        // 1. Summary Inertia props expose uraian_arkas across tahapanData, rkaBulananData, lembarData, and rincianData
        $summaryResponse = $this
            ->actingAs($this->bendahara)
            ->get("/rkas/{$this->penganggaran->id}/summary");

        $summaryResponse->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Penganggaran/Rkas/Summary')
                ->where('tahapanData', function ($data) {
                    $items = $data['03']['sub_programs']['03.03']['uraian_programs']['03.03.06.']['items'] ?? [];
                    $first = collect($items)->firstWhere('uraian', 'Wajan Praktik SIKAS');

                    return is_array($first) && ($first['uraian_arkas'] ?? null) === 'Alat Dapur-Wajan ARKAS';
                })
                ->where('rkaBulananData', function ($data) {
                    $items = $data['03']['sub_programs']['03.03']['uraian_programs']['03.03.06.']['items'] ?? [];
                    $first = collect($items)->firstWhere('uraian', 'Wajan Praktik SIKAS');

                    return is_array($first) && ($first['uraian_arkas'] ?? null) === 'Alat Dapur-Wajan ARKAS';
                })
                ->where('rincianData.0.items.0.uraian_arkas', 'Alat Dapur-Wajan ARKAS')
                ->where('lembarData', function ($rows) {
                    $item = collect($rows)->firstWhere('uraian', 'Wajan Praktik SIKAS');

                    return is_array($item) && ($item['uraian_arkas'] ?? null) === 'Alat Dapur-Wajan ARKAS';
                })
            );

        // 2. Default Excel export renders SIKAS uraian
        $defaultExcel = $this
            ->actingAs($this->bendahara)
            ->get("/rkas/{$this->penganggaran->id}/export-tahapan-excel");

        $defaultExcel->assertOk();
        $defaultExcel->assertSee('Wajan Praktik SIKAS');
        $defaultExcel->assertDontSee('Alat Dapur-Wajan ARKAS');

        // 3. Excel exports with ?uraian_mode=arkas render ARKAS uraian + clean SIKAS fallback (no "Belum disandingkan")
        foreach ([
            "/rkas/{$this->penganggaran->id}/export-tahapan-excel?uraian_mode=arkas",
            "/rkas/{$this->penganggaran->id}/export-tahapan-v1-excel?uraian_mode=arkas",
            "/rkas/{$this->penganggaran->id}/export-rincian-excel?uraian_mode=arkas",
            "/rkas/{$this->penganggaran->id}/export-rp-excel?tahap=1&uraian_mode=arkas",
        ] as $exportUrl) {
            $arkasExport = $this->actingAs($this->bendahara)->get($exportUrl);
            $arkasExport->assertOk();
            $arkasExport->assertSee('Alat Dapur-Wajan ARKAS');
            $arkasExport->assertSee('Honorarium Pelatih SIKAS');
            $arkasExport->assertDontSee('Belum disandingkan');
        }

        // 4. Non-reguler variant (kinerja) works identically
        $kinerjaPenganggaran = KinerjaPenganggaran::create([
            'pagu_anggaran' => 50000000,
            'tahun_anggaran' => 2027,
            'kepala_sekolah' => 'Nama Kepsek',
            'sk_kepala_sekolah' => 'SK-K-001',
            'bendahara' => 'Nama Bendahara',
            'sk_bendahara' => 'SK-K-002',
            'komite' => 'Nama Komite',
            'nip_kepala_sekolah' => '198001012005011001',
            'nip_bendahara' => '198501012010012002',
            'tanggal_sk_kepala_sekolah' => '2027-01-02',
            'tanggal_sk_bendahara' => '2027-01-02',
        ]);

        KinerjaRkas::create([
            'kinerja_penganggaran_id' => $kinerjaPenganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningCatalog->id,
            'uraian' => 'Kinerja SIKAS Item',
            'uraian_arkas' => 'Kinerja ARKAS Item',
            'harga_satuan' => 150000,
            'bulan' => 'Februari',
            'jumlah' => 2,
            'satuan' => 'Buah',
        ]);

        $kinerjaExport = $this
            ->actingAs($this->bendahara)
            ->get("/kinerja/rkas/{$kinerjaPenganggaran->id}/export-tahapan-excel?uraian_mode=arkas");

        $kinerjaExport->assertOk();
        $kinerjaExport->assertSee('Kinerja ARKAS Item');
        $kinerjaExport->assertDontSee('Kinerja SIKAS Item');
    }

    public function test_rkas_perubahan_summary_and_exports_support_uraian_arkas_without_splitting_murni_perubahan(): void
    {
        // Murni row has uraian_arkas = null; Perubahan row has uraian_arkas filled -> MUST stay paired as 1 row!
        Rkas::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningCatalog->id,
            'uraian' => 'Wajan Praktik Perubahan SIKAS',
            'uraian_arkas' => null,
            'harga_satuan' => 250000,
            'bulan' => 'Januari',
            'jumlah' => 2,
            'satuan' => 'Buah',
        ]);

        RkasPerubahan::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningCatalog->id,
            'uraian' => 'Wajan Praktik Perubahan SIKAS',
            'uraian_arkas' => 'Alat Dapur-Wajan Perubahan ARKAS',
            'harga_satuan' => 250000,
            'bulan' => 'Agustus',
            'jumlah' => 3,
            'satuan' => 'Buah',
        ]);

        // 1. Summary exposes uraian_arkas and keeps Murni + Perubahan combined in 1 single item
        $summaryResponse = $this
            ->actingAs($this->bendahara)
            ->get("/rkas-perubahan/{$this->penganggaran->id}/summary");

        $summaryResponse->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Penganggaran/RkasPerubahan/Summary')
                ->where('tahapanData', function ($data) {
                    $items = $data['03']['sub_programs']['03.03']['uraian_programs']['03.03.06.']['items'] ?? [];
                    if (count($items) !== 1) {
                        return false;
                    }

                    $first = $items[0];

                    return ($first['uraian'] ?? null) === 'Wajan Praktik Perubahan SIKAS'
                        && ($first['uraian_arkas'] ?? null) === 'Alat Dapur-Wajan Perubahan ARKAS'
                        && (int) ($first['volume_murni'] ?? 0) === 2
                        && (int) ($first['volume'] ?? 0) === 3;
                })
            );

        // 2. Perubahan Excel exports honor ?uraian_mode=arkas (and keep Murni+Perubahan paired)
        foreach ([
            "/rkas-perubahan/{$this->penganggaran->id}/export-tahapan-excel?uraian_mode=arkas",
            "/rkas-perubahan/{$this->penganggaran->id}/export-tahapan-v1-excel?uraian_mode=arkas",
            "/rkas-perubahan/{$this->penganggaran->id}/export-tahapan-v2-excel?uraian_mode=arkas",
            "/rkas-perubahan/{$this->penganggaran->id}/export-rincian-excel?uraian_mode=arkas",
            "/rkas-perubahan/{$this->penganggaran->id}/export-rp-excel?tahap=2&uraian_mode=arkas",
        ] as $exportUrl) {
            $arkasExport = $this->actingAs($this->bendahara)->get($exportUrl);
            $arkasExport->assertOk();
            $arkasExport->assertSee('Alat Dapur-Wajan Perubahan ARKAS');
            $arkasExport->assertDontSee('Belum disandingkan');
        }
    }

    public function test_rp_export_does_not_collide_distinct_sikas_items_sharing_uraian_arkas_and_preserves_uraian_gabungan_and_pdfs(): void
    {
        $sekolah = SekolahProfile::create([
            'nama_sekolah' => 'SMP Uji Coba',
            'npsn' => config('app.npsn_code') ?: '12345678',
            'status_sekolah' => 'Swasta',
            'jenjang_sekolah' => 'SMP',
            'kelurahan_desa' => 'Soni',
            'kecamatan' => 'Dampal Selatan',
            'kabupaten_kota' => 'Tolitoli',
            'provinsi' => 'Sulawesi Tengah',
            'alamat' => 'Jl. Pendidikan No. 1',
        ]);
        $this->penganggaran->update(['sekolah_id' => $sekolah->id]);

        // Two distinct SIKAS items on the SAME kode_rekening_id sharing identical uraian_arkas
        Rkas::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningCatalog->id,
            'uraian' => 'Tinta Printer EPSON Red',
            'uraian_arkas' => 'Tinta Printer Warna-',
            'harga_satuan' => 150000,
            'bulan' => 'Maret',
            'jumlah' => 1,
            'satuan' => 'Botol',
            'nama_penerima' => 'Toko Tinta Merah',
        ]);

        Rkas::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningCatalog->id,
            'uraian' => 'Tinta Printer EPSON Blue',
            'uraian_arkas' => 'Tinta Printer Warna-',
            'harga_satuan' => 150000,
            'bulan' => 'Maret',
            'jumlah' => 1,
            'satuan' => 'Botol',
            'nama_penerima' => 'Toko Tinta Biru',
        ]);

        // Merged item with explicit uraian_gabungan -> must keep uraian_gabungan even in ARKAS mode
        $mergedRow = Rkas::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningManual->id,
            'uraian' => 'Honorarium Guru A',
            'uraian_arkas' => 'Honorarium ARKAS A',
            'harga_satuan' => 500000,
            'bulan' => 'Maret',
            'jumlah' => 1,
            'satuan' => 'OB',
            'nama_penerima' => 'Bendahara Honor',
        ]);
        Rkas::where('id', $mergedRow->id)->update(['uraian_gabungan' => 'Paket Honorarium Gabungan']);

        // 1. RP Excel in ARKAS mode keeps BOTH distinct rows & both nama_penerima (no grouping collision!)
        $rpExcel = $this
            ->actingAs($this->bendahara)
            ->get("/rkas/{$this->penganggaran->id}/export-rp-excel?tahap=1&uraian_mode=arkas");

        $rpExcel->assertOk();
        $rpExcel->assertSee('Tinta Printer Warna-');
        $rpExcel->assertSee('Toko Tinta Merah');
        $rpExcel->assertSee('Toko Tinta Biru');
        $rpExcel->assertSee('Paket Honorarium Gabungan');
        $this->assertSame(2, substr_count((string) $rpExcel->getContent(), 'Tinta Printer Warna-'));

        // 2. Rincian Excel in ARKAS mode preserves uraian_gabungan for merged item
        $rincianExcel = $this
            ->actingAs($this->bendahara)
            ->get("/rkas/{$this->penganggaran->id}/export-rincian-excel?uraian_mode=arkas");

        $rincianExcel->assertOk();
        $rincianExcel->assertSee('Paket Honorarium Gabungan');
        $rincianExcel->assertSee('Tinta Printer Warna-');

        // 3. PDF endpoints (LK-221 & Bulanan) succeed with ?uraian_mode=arkas on RKAS Awal and Perubahan
        RkasPerubahan::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningCatalog->id,
            'uraian' => 'Tinta Printer EPSON Red',
            'uraian_arkas' => 'Tinta Printer Warna-',
            'harga_satuan' => 150000,
            'bulan' => 'Agustus',
            'jumlah' => 2,
            'satuan' => 'Botol',
        ]);

        foreach ([
            "/rkas/{$this->penganggaran->id}/export-lembar-kerja-pdf?uraian_mode=arkas",
            "/rkas/{$this->penganggaran->id}/export-bulanan-pdf?month=Maret&uraian_mode=arkas",
            "/rkas-perubahan/{$this->penganggaran->id}/export-lembar-kerja-pdf?uraian_mode=arkas",
            "/rkas-perubahan/{$this->penganggaran->id}/export-bulanan-pdf?month=Agustus&uraian_mode=arkas",
        ] as $pdfUrl) {
            $pdfRes = $this->actingAs($this->bendahara)->get($pdfUrl);
            $pdfRes->assertOk();
            $this->assertStringContainsString('application/pdf', (string) $pdfRes->headers->get('Content-Type'));
        }
    }

    public function test_pull_arkas_bku_mode1_preserves_existing_sikas_bku_id_nota_and_uraian_while_pairing_arkas_fields(): void
    {
        $rkasMaret = Rkas::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningCatalog->id,
            'uraian' => 'Wajan Penggorengan Praktik Tata Boga',
            'uraian_arkas' => 'Alat Dapur-',
            'harga_satuan' => 250000,
            'bulan' => 'Maret',
            'jumlah' => 2,
            'satuan' => 'Buah',
        ]);

        $rkasSeptember = Rkas::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningCatalog->id,
            'uraian' => 'Kompor Gas Praktik Tata Boga',
            'uraian_arkas' => 'Alat Dapur-',
            'harga_satuan' => 450000,
            'bulan' => 'September',
            'jumlah' => 1,
            'satuan' => 'Buah',
        ]);

        // Existing SIKAS BKU row in Maret (Mode 1 month)
        $existingBku = BukuKasUmum::create([
            'penganggaran_id' => $this->penganggaran->id,
            'id_transaksi' => '001/BOSP/THP-I/2027',
            'nomor_nota' => 'NOTA-SIKAS-001',
            'tanggal_transaksi' => '2027-03-10',
            'kode_kegiatan_id' => $this->kegiatan->id,
            'rekening_belanja_id' => $this->rekeningCatalog->id,
            'uraian' => 'Lunas Bayar Belanja Modal Alat Dapur',
            'uraian_opsional' => 'Lunas bayar belanja wajan praktik tata boga',
            'jenis_transaksi' => 'tunai',
            'anggaran' => 500000,
            'dibelanjakan' => 500000,
            'total_transaksi_kotor' => 500000,
            'nama_toko' => 'Toko Dapur Jaya',
            'is_bunga_record' => false,
        ]);

        $existingDetail = BukuKasUmumUraianDetail::create([
            'buku_kas_umum_id' => $existingBku->id,
            'kode_kegiatan_id' => $this->kegiatan->id,
            'rekening_belanja_id' => $this->rekeningCatalog->id,
            'rkas_id' => $rkasMaret->id,
            'uraian' => 'Wajan Penggorengan Praktik Tata Boga',
            'volume' => 2,
            'satuan' => 'Buah',
            'harga_satuan' => 250000,
            'jumlah' => 500000,
        ]);

        $mockEngine = Mockery::mock(ArkasEngineService::class);
        $mockEngine->shouldReceive('runScriptOrThrow')
            ->once()
            ->with('dump_bku.py', ['dump', '2027', '1'], 120)
            ->andReturn([
                'status' => 'success',
                'penerimaan_dana' => [],
                'penarikan_tunai' => [],
                'setor_tunai' => [],
                'transaksi_belanja' => [
                    // Maret transaction (Mode 1: already exists in SIKAS)
                    [
                        'no_bukti' => 'BPU01',
                        'no_nota' => 'ARKAS-NOTA-01',
                        'nomor_nota' => 'BPU01',
                        'tanggal_transaksi' => '2027-03-10',
                        'jenis_transaksi' => 'tunai',
                        'nama_toko' => 'Toko Dapur Jaya',
                        'alamat_toko' => 'Jl. Merdeka 1',
                        'npwp' => '',
                        'kode_kegiatan' => '03.03.06', // without trailing dot to verify normalization
                        'kode_rekening' => '5.2.02.05.02.0005',
                        'uraian' => 'Alat Dapur-',
                        'total_transaksi_kotor' => 500000,
                        'dibelanjakan' => 500000,
                        'pajak' => 'Tanpa Pajak',
                        'persen_pajak' => 0,
                        'total_pajak' => 0,
                        'ntpn' => '',
                        'tanggal_lapor' => '',
                        'items' => [
                            [
                                'uraian' => 'Alat Dapur-',
                                'rapbs_uraian' => 'Alat Dapur-',
                                'volume' => 2,
                                'satuan' => 'Buah',
                                'harga_satuan' => 250000,
                                'item_total' => 500000,
                                'kode_kegiatan' => '03.03.06',
                                'kode_rekening' => '5.2.02.05.02.0005',
                            ],
                        ],
                    ],
                    // September transaction (Mode 2: empty month in SIKAS)
                    [
                        'no_bukti' => 'BNU01',
                        'no_nota' => 'ARKAS-NOTA-02',
                        'nomor_nota' => 'BNU01',
                        'tanggal_transaksi' => '2027-09-15',
                        'jenis_transaksi' => 'non-tunai',
                        'nama_toko' => 'Toko Dapur Jaya',
                        'alamat_toko' => 'Jl. Merdeka 1',
                        'npwp' => '',
                        'kode_kegiatan' => '03.03.06.',
                        'kode_rekening' => '5.2.02.05.02.0005',
                        'uraian' => 'Alat Dapur-',
                        'total_transaksi_kotor' => 450000,
                        'dibelanjakan' => 450000,
                        'pajak' => 'Tanpa Pajak',
                        'persen_pajak' => 0,
                        'total_pajak' => 0,
                        'ntpn' => '',
                        'tanggal_lapor' => '',
                        'items' => [
                            [
                                'uraian' => 'Alat Dapur-',
                                'rapbs_uraian' => 'Alat Dapur-',
                                'volume' => 1,
                                'satuan' => 'Buah',
                                'harga_satuan' => 450000,
                                'item_total' => 450000,
                                'kode_kegiatan' => '03.03.06.',
                                'kode_rekening' => '5.2.02.05.02.0005',
                            ],
                        ],
                    ],
                ],
                'penutupan_bulan' => [],
            ]);

        $this->app->instance(ArkasEngineService::class, $mockEngine);

        // Even with overwrite=false, Mode 1 pairs existing month safely and Mode 2 imports empty month
        $response = $this
            ->actingAs($this->bendahara)
            ->from('/penatausahaan')
            ->post("/penatausahaan/pull-arkas-bku/{$this->penganggaran->id}", [
                'overwrite' => false,
            ]);

        $response->assertSessionHasNoErrors();

        // 1. Verify Mode 1 (Maret) row was NOT deleted and SIKAS fields were NOT overwritten
        $existingBku->refresh();
        $this->assertSame('001/BOSP/THP-I/2027', $existingBku->id_transaksi);
        $this->assertSame('NOTA-SIKAS-001', $existingBku->nomor_nota);
        $this->assertSame('Lunas Bayar Belanja Modal Alat Dapur', $existingBku->uraian);
        $this->assertSame('Lunas bayar belanja wajan praktik tata boga', $existingBku->uraian_opsional);
        // While ARKAS fields were paired (header uraian_arkas = nama rekening belanja, detail uraian_arkas = item ARKAS)
        $this->assertSame('BPU01', $existingBku->id_transaksi_arkas);
        $this->assertSame('ARKAS-NOTA-01', $existingBku->nomor_nota_arkas);
        $this->assertSame('Belanja Modal Alat Dapur', $existingBku->uraian_arkas);

        $existingDetail->refresh();
        $this->assertSame('Wajan Penggorengan Praktik Tata Boga', $existingDetail->uraian);
        $this->assertSame('Alat Dapur-', $existingDetail->uraian_arkas);

        // 2. Verify Mode 2 (September) row was imported with sequential SIKAS id_transaksi & ARKAS dual fields
        $septBku = BukuKasUmum::where('penganggaran_id', $this->penganggaran->id)
            ->where('id_transaksi_arkas', 'BNU01')
            ->with('uraianDetails')
            ->first();

        $this->assertNotNull($septBku);
        $this->assertSame('002/BOSP/THP-II/2027', $septBku->id_transaksi);
        $this->assertSame('BNU01', $septBku->id_transaksi_arkas);
        $this->assertSame('ARKAS-NOTA-02', $septBku->nomor_nota_arkas);
        $this->assertSame('Lunas Bayar Belanja Modal Alat Dapur', $septBku->uraian);
        $this->assertSame('Lunas bayar belanja kompor Gas Praktik Tata Boga', $septBku->uraian_opsional);
        $this->assertSame('Belanja Modal Alat Dapur', $septBku->uraian_arkas);
        $this->assertCount(1, $septBku->uraianDetails);
        $this->assertSame($rkasSeptember->id, $septBku->uraianDetails[0]->rkas_id);
        $this->assertSame('Kompor Gas Praktik Tata Boga', $septBku->uraianDetails[0]->uraian);
        $this->assertSame('Alat Dapur-', $septBku->uraianDetails[0]->uraian_arkas);
    }

    public function test_pull_arkas_bku_mode2_auto_splits_aggregated_arkas_item_across_multiple_sikas_rkas_rows(): void
    {
        $rkasRed = Rkas::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningCatalog->id,
            'uraian' => 'Tinta Printer EPSON Red',
            'uraian_arkas' => 'Tinta Printer Warna-',
            'harga_satuan' => 150000,
            'bulan' => 'Maret',
            'jumlah' => 1,
            'satuan' => 'Botol',
        ]);

        $rkasBlue = Rkas::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningCatalog->id,
            'uraian' => 'Tinta Printer EPSON Blue',
            'uraian_arkas' => 'Tinta Printer Warna-',
            'harga_satuan' => 150000,
            'bulan' => 'Maret',
            'jumlah' => 1,
            'satuan' => 'Botol',
        ]);

        $rkasYellow = Rkas::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningCatalog->id,
            'uraian' => 'Tinta Printer EPSON Yellow',
            'uraian_arkas' => 'Tinta Printer Warna-',
            'harga_satuan' => 150000,
            'bulan' => 'Maret',
            'jumlah' => 1,
            'satuan' => 'Botol',
        ]);

        $mockEngine = Mockery::mock(ArkasEngineService::class);
        $mockEngine->shouldReceive('runScriptOrThrow')
            ->once()
            ->with('dump_bku.py', ['dump', '2027', '1'], 120)
            ->andReturn([
                'status' => 'success',
                'penerimaan_dana' => [],
                'penarikan_tunai' => [],
                'setor_tunai' => [],
                'transaksi_belanja' => [
                    [
                        'no_bukti' => 'BPU02',
                        'no_nota' => '',
                        'nomor_nota' => 'BPU02',
                        'tanggal_transaksi' => '2027-03-02',
                        'jenis_transaksi' => 'tunai',
                        'nama_toko' => 'Toko Naufal',
                        'alamat_toko' => 'Jl. Pendidikan',
                        'npwp' => '',
                        'kode_kegiatan' => '03.03.06',
                        'kode_rekening' => '5.2.02.05.02.0005',
                        'uraian' => 'Tinta Printer Warna-',
                        'total_transaksi_kotor' => 450000,
                        'dibelanjakan' => 450000,
                        'pajak' => 'Tanpa Pajak',
                        'persen_pajak' => 0,
                        'total_pajak' => 0,
                        'ntpn' => '',
                        'tanggal_lapor' => '',
                        'items' => [
                            [
                                'uraian' => 'Tinta Printer Warna-',
                                'rapbs_uraian' => 'Tinta Printer Warna-',
                                'volume' => 3,
                                'satuan' => 'Botol',
                                'harga_satuan' => 150000,
                                'item_total' => 450000,
                                'kode_kegiatan' => '03.03.06',
                                'kode_rekening' => '5.2.02.05.02.0005',
                            ],
                        ],
                    ],
                ],
                'penutupan_bulan' => [],
            ]);

        $this->app->instance(ArkasEngineService::class, $mockEngine);

        $response = $this
            ->actingAs($this->bendahara)
            ->from('/penatausahaan')
            ->post("/penatausahaan/pull-arkas-bku/{$this->penganggaran->id}");

        $response->assertSessionHasNoErrors();

        $bku = BukuKasUmum::where('penganggaran_id', $this->penganggaran->id)->with('uraianDetails')->first();
        $this->assertNotNull($bku);
        $this->assertSame('001/BOSP/THP-I/2027', $bku->id_transaksi);
        $this->assertSame('BPU02', $bku->id_transaksi_arkas);
        $this->assertCount(3, $bku->uraianDetails);

        $this->assertDatabaseHas('buku_kas_umum_uraian_details', [
            'buku_kas_umum_id' => $bku->id,
            'rkas_id' => $rkasRed->id,
            'uraian' => 'Tinta Printer EPSON Red',
            'uraian_arkas' => 'Tinta Printer Warna-',
            'volume' => 1,
            'jumlah' => 150000,
        ]);
        $this->assertDatabaseHas('buku_kas_umum_uraian_details', [
            'buku_kas_umum_id' => $bku->id,
            'rkas_id' => $rkasBlue->id,
            'uraian' => 'Tinta Printer EPSON Blue',
            'uraian_arkas' => 'Tinta Printer Warna-',
            'volume' => 1,
            'jumlah' => 150000,
        ]);
        $this->assertDatabaseHas('buku_kas_umum_uraian_details', [
            'buku_kas_umum_id' => $bku->id,
            'rkas_id' => $rkasYellow->id,
            'uraian' => 'Tinta Printer EPSON Yellow',
            'uraian_arkas' => 'Tinta Printer Warna-',
            'volume' => 1,
            'jumlah' => 150000,
        ]);
    }

    public function test_rekapitulasi_bku_mode_arkas_expands_and_aggregates_items_across_all_tabs_and_exports(): void
    {
        $sekolah = SekolahProfile::create([
            'nama_sekolah' => 'SMP Negeri 1 Uji',
            'npsn' => config('app.npsn_code') ?: '12345678',
            'status_sekolah' => 'Swasta',
            'jenjang_sekolah' => 'SMP',
            'alamat' => 'Jl. Pendidikan No. 1',
            'kelurahan_desa' => 'Sukamaju',
            'kecamatan' => 'Kecamatan Uji',
            'kabupaten_kota' => 'Kabupaten Uji',
            'provinsi' => 'Provinsi Uji',
        ]);

        $this->penganggaran->update(['sekolah_id' => $sekolah->id]);

        $rekeningBhp = RekeningBelanja::create([
            'kode_rekening' => '5.1.02.01.01.0024',
            'rincian_objek' => 'Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor',
            'kategori' => 'Operasi',
        ]);

        // 1. Transaksi TUNAI (BHP) dengan 4 detail (3 item share uraian_arkas 'Tinta Printer Warna-' @ 150.000 + 1 'Tinta Printer Hitam-' @ 120.000)
        $bkuTunai = BukuKasUmum::create([
            'penganggaran_id' => $this->penganggaran->id,
            'id_transaksi' => '002/BOSP/THP-I/2027',
            'id_transaksi_arkas' => 'BPU02',
            'nomor_nota' => 'NOTA-SIKAS-02',
            'nomor_nota_arkas' => 'BPU02',
            'tanggal_transaksi' => '2027-03-02',
            'kode_kegiatan_id' => $this->kegiatan->id,
            'rekening_belanja_id' => $rekeningBhp->id,
            'uraian' => 'Lunas Bayar Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor',
            'uraian_opsional' => 'Lunas bayar belanja bahan habis pakai ATK',
            'uraian_arkas' => 'Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor',
            'jenis_transaksi' => 'tunai',
            'anggaran' => 570000,
            'dibelanjakan' => 570000,
            'total_transaksi_kotor' => 570000,
            'total_pajak' => 0,
            'is_bunga_record' => false,
        ]);

        foreach (['Tinta Printer EPSON Red', 'Tinta Printer EPSON Blue', 'Tinta Printer EPSON Yellow'] as $sikasName) {
            BukuKasUmumUraianDetail::create([
                'buku_kas_umum_id' => $bkuTunai->id,
                'kode_kegiatan_id' => $this->kegiatan->id,
                'rekening_belanja_id' => $rekeningBhp->id,
                'uraian' => $sikasName,
                'uraian_arkas' => 'Tinta Printer Warna-',
                'volume' => 1,
                'satuan' => 'Botol',
                'harga_satuan' => 150000,
                'jumlah' => 150000,
            ]);
        }

        BukuKasUmumUraianDetail::create([
            'buku_kas_umum_id' => $bkuTunai->id,
            'kode_kegiatan_id' => $this->kegiatan->id,
            'rekening_belanja_id' => $rekeningBhp->id,
            'uraian' => 'Tinta Printer EPSON Black',
            'uraian_arkas' => 'Tinta Printer Hitam-',
            'volume' => 1,
            'satuan' => 'Botol',
            'harga_satuan' => 120000,
            'jumlah' => 120000,
        ]);

        // 2. Transaksi NON-TUNAI (BHM) dengan pajak
        $bkuNonTunai = BukuKasUmum::create([
            'penganggaran_id' => $this->penganggaran->id,
            'id_transaksi' => '003/BOSP/THP-I/2027',
            'id_transaksi_arkas' => 'BNU01',
            'nomor_nota' => 'NOTA-SIKAS-03',
            'nomor_nota_arkas' => 'BNU01',
            'tanggal_transaksi' => '2027-03-05',
            'kode_kegiatan_id' => $this->kegiatan->id,
            'rekening_belanja_id' => $this->rekeningCatalog->id,
            'uraian' => 'Lunas Bayar Belanja Modal Alat Dapur',
            'uraian_opsional' => 'Lunas bayar belanja wajan tata boga',
            'uraian_arkas' => 'Belanja Modal Alat Dapur',
            'jenis_transaksi' => 'non-tunai',
            'anggaran' => 500000,
            'dibelanjakan' => 500000,
            'total_transaksi_kotor' => 500000,
            'pajak' => 'PPN',
            'persen_pajak' => 11,
            'total_pajak' => 55000,
            'is_bunga_record' => false,
        ]);

        BukuKasUmumUraianDetail::create([
            'buku_kas_umum_id' => $bkuNonTunai->id,
            'kode_kegiatan_id' => $this->kegiatan->id,
            'rekening_belanja_id' => $this->rekeningCatalog->id,
            'uraian' => 'Wajan Penggorengan Praktik Tata Boga',
            'uraian_arkas' => 'Alat Dapur-',
            'volume' => 2,
            'satuan' => 'Buah',
            'harga_satuan' => 250000,
            'jumlah' => 500000,
        ]);

        // --- A. BKU UMUM: SIKAS vs ARKAS ---
        $umumSikas = $this->actingAs($this->bendahara)
            ->getJson('/api/bkp-umum/data?tahun=2027&bulan=maret&bku_mode=sikas')
            ->assertOk()
            ->json();

        $umumArkas = $this->actingAs($this->bendahara)
            ->getJson('/api/bkp-umum/data?tahun=2027&bulan=maret&bku_mode=arkas')
            ->assertOk()
            ->json();

        // Saldo akhir & total pengeluaran HARUS identik antara SIKAS dan ARKAS
        $this->assertEquals(
            (float) $umumSikas['data']['total_pengeluaran'],
            (float) $umumArkas['data']['total_pengeluaran']
        );
        $this->assertEquals(
            (float) $umumSikas['data']['saldo_akhir'],
            (float) $umumArkas['data']['saldo_akhir']
        );

        // Pada SIKAS: 1 baris nota 002/BOSP/THP-I/2027 senilai 570.000
        $sikasBpu02 = collect($umumSikas['items'])->where('no_bukti', '002/BOSP/THP-I/2027')->values();
        $this->assertCount(1, $sikasBpu02);
        $this->assertSame('Lunas bayar belanja bahan habis pakai ATK', $sikasBpu02[0]['uraian']);

        // Pada ARKAS: BPU02 dipecah jadi 2 baris (Tinta Printer Warna- 450.000 + Tinta Printer Hitam- 120.000)
        $arkasBpu02 = collect($umumArkas['items'])->where('no_bukti', 'BPU02')->values();
        $this->assertCount(2, $arkasBpu02);
        $this->assertSame('Tinta Printer Warna-', $arkasBpu02[0]['uraian']);
        $this->assertEquals(450000, (float) $arkasBpu02[0]['pengeluaran']);
        $this->assertSame('Tinta Printer Hitam-', $arkasBpu02[1]['uraian']);
        $this->assertEquals(120000, (float) $arkasBpu02[1]['pengeluaran']);

        // --- B. BKP BANK (Non-Tunai) ---
        $bankArkas = $this->actingAs($this->bendahara)
            ->getJson('/api/bkp-bank/data?tahun=2027&bulan=maret&bku_mode=arkas')
            ->assertOk()
            ->json();

        $bankBnu01 = collect($bankArkas['items'])->firstWhere('type', 'belanja_non_tunai');
        $this->assertNotNull($bankBnu01);
        $this->assertSame('BNU01', $bankBnu01['no_bukti']);
        $this->assertSame('Alat Dapur-', $bankBnu01['uraian']);
        $this->assertEquals(500000, (float) $bankBnu01['pengeluaran']);

        // --- C. BKP PEMBANTU TUNAI ---
        $tunaiArkas = $this->actingAs($this->bendahara)
            ->getJson('/api/bkp-pembantu/data?tahun=2027&bulan=maret&bku_mode=arkas')
            ->assertOk()
            ->json();

        $tunaiBpu02 = collect($tunaiArkas['items'])->where('no_bukti', 'BPU02')->values();
        $this->assertCount(2, $tunaiBpu02);
        $this->assertSame('Tinta Printer Warna-', $tunaiBpu02[0]['uraian']);
        $this->assertEquals(450000, (float) $tunaiBpu02[0]['pengeluaran']);

        // --- D. BKP ROB ---
        $robArkas = $this->actingAs($this->bendahara)
            ->getJson('/api/bkp-rob/data?tahun=2027&bulan=maret&bku_mode=arkas')
            ->assertOk()
            ->json();

        $robAtkRows = $robArkas['rob_data']['5.1.02.01.01.0024']['transaksi'] ?? [];
        $this->assertCount(2, $robAtkRows);
        $this->assertSame('BPU02', $robAtkRows[0]['no_bukti']);
        $this->assertSame('Tinta Printer Warna-', $robAtkRows[0]['uraian']);
        $this->assertEquals(450000, (float) $robAtkRows[0]['realisasi']);

        // --- E. BKP PAJAK ---
        $pajakArkas = $this->actingAs($this->bendahara)
            ->getJson('/api/bkp-pajak/data?tahun=2027&bulan=maret&bku_mode=arkas')
            ->assertOk()
            ->json();

        $this->assertCount(1, $pajakArkas['items']);
        $this->assertSame('BNU01', $pajakArkas['items'][0]['no_buku']);
        $this->assertStringContainsString('Belanja Modal Alat Dapur', $pajakArkas['items'][0]['uraian']);

        // --- F. BHP & BHM ---
        $bhpArkas = $this->actingAs($this->bendahara)
            ->getJson('/api/bhp/data?tahun=2027&periode=Maret&jenis_laporan=bulanan&bku_mode=arkas')
            ->assertOk()
            ->json();

        $this->assertCount(2, $bhpArkas['data']);
        $this->assertSame('BPU02', $bhpArkas['data'][0]['no_bukti']);
        $this->assertSame('Tinta Printer Warna-', $bhpArkas['data'][0]['uraian']);
        $this->assertSame(3, $bhpArkas['data'][0]['volume']);

        $bhmArkas = $this->actingAs($this->bendahara)
            ->getJson('/api/bhm/data?tahun=2027&periode=Maret&jenis_laporan=bulanan&bku_mode=arkas')
            ->assertOk()
            ->json();

        $this->assertCount(1, $bhmArkas['data']);
        $this->assertSame('BNU01', $bhmArkas['data'][0]['no_bukti']);
        $this->assertSame('Alat Dapur-', $bhmArkas['data'][0]['uraian']);

        // --- G. Seluruh endpoint PDF & Excel dengan bku_mode=arkas sukses 200 OK ---
        foreach ([
            '/bkp-umum/cetak/2027/maret?bku_mode=arkas',
            '/bkp-bank/cetak?tahun=2027&bulan=maret&bku_mode=arkas',
            '/bkp-pembantu/cetak?tahun=2027&bulan=maret&bku_mode=arkas',
            '/bkp-pajak/cetak?tahun=2027&bulan=maret&bku_mode=arkas',
            '/bkp-rob/cetak?tahun=2027&bulan=maret&bku_mode=arkas',
            '/bhp/cetak?tahun=2027&periode=Maret&jenis_laporan=bulanan&bku_mode=arkas',
            '/bhm/cetak?tahun=2027&periode=Maret&jenis_laporan=bulanan&bku_mode=arkas',
        ] as $pdfUrl) {
            $res = $this->actingAs($this->bendahara)->get($pdfUrl);
            $res->assertOk();
            $this->assertStringContainsString('application/pdf', (string) $res->headers->get('Content-Type'));
        }

        foreach ([
            '/bkp-umum/excel/2027/maret?bku_mode=arkas',
            '/bkp-bank/excel?tahun=2027&bulan=maret&bku_mode=arkas',
            '/bkp-pembantu/excel?tahun=2027&bulan=maret&bku_mode=arkas',
            '/bkp-pajak/excel?tahun=2027&bulan=maret&bku_mode=arkas',
        ] as $excelUrl) {
            $res = $this->actingAs($this->bendahara)->get($excelUrl);
            $res->assertOk();
        }
    }

    public function test_bku_edit_modal_uraian_api_returns_uraian_arkas_and_rkas_ids_and_store_update_preserve_arkas_fields(): void
    {
        // Multi-month Tahap 2 RKAS Perubahan items sharing same uraian + satuan + harga
        $rpJuli = RkasPerubahan::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningCatalog->id,
            'uraian' => 'Pembelian Pulsa Data Internet',
            'uraian_arkas' => 'Beban Kawat/Faksimili/Internet/TV Berlangganan',
            'harga_satuan' => 300000,
            'bulan' => 'Juli',
            'jumlah' => 1,
            'satuan' => 'Bulan',
        ]);
        $rpAgustus = RkasPerubahan::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningCatalog->id,
            'uraian' => 'Pembelian Pulsa Data Internet',
            'uraian_arkas' => 'Beban Kawat/Faksimili/Internet/TV Berlangganan',
            'harga_satuan' => 300000,
            'bulan' => 'Agustus',
            'jumlah' => 1,
            'satuan' => 'Bulan',
        ]);

        // 1. Store BKU (verifies no bogus penganggaran_id column crash & persists uraian_arkas on header + detail)
        $storeResp = $this->actingAs($this->bendahara)
            ->from("/bku/{$this->penganggaran->id}/agustus")
            ->post('/bku/store', [
                'penganggaran_id' => $this->penganggaran->id,
                'bulan' => 'Agustus',
                'tanggal_nota' => '2027-08-15',
                'jenis_transaksi' => 'non-tunai',
                'nomor_nota' => '055/BOSP/THP-II/2027',
                'nama_toko' => 'Telkomsel',
                'nama_penerima_pembayaran' => null,
                'alamat_toko' => 'Jl. Raya',
                'npwp' => '-',
                'uraian_opsional' => 'Lunas bayar pulsa internet',
                'kode_kegiatan_id' => [$this->kegiatan->id],
                'kode_rekening_id' => [$this->rekeningCatalog->id],
                'uraian_items' => [
                    [
                        'id' => $rpJuli->id,
                        'uraian_text' => 'Pembelian Pulsa Data Internet',
                        'uraian_arkas' => 'Beban Kawat/Faksimili/Internet/TV Berlangganan',
                        'satuan' => 'Bulan',
                        'volume' => 1,
                        'harga_satuan' => 300000,
                        'jumlah_belanja' => 300000,
                        'kegiatan_id' => $this->kegiatan->id,
                        'rekening_id' => $this->rekeningCatalog->id,
                    ],
                    [
                        'id' => $rpAgustus->id,
                        'uraian_text' => 'Pembelian Pulsa Data Internet',
                        'uraian_arkas' => 'Beban Kawat/Faksimili/Internet/TV Berlangganan',
                        'satuan' => 'Bulan',
                        'volume' => 1,
                        'harga_satuan' => 300000,
                        'jumlah_belanja' => 300000,
                        'kegiatan_id' => $this->kegiatan->id,
                        'rekening_id' => $this->rekeningCatalog->id,
                    ],
                ],
            ]);

        $storeResp->assertSessionHasNoErrors();
        $storeResp->assertSessionHas('success');

        $bku = BukuKasUmum::where('penganggaran_id', $this->penganggaran->id)
            ->where('id_transaksi', '055/BOSP/THP-II/2027')
            ->firstOrFail();

        $this->assertSame('Belanja Modal Alat Dapur', $bku->uraian_arkas);
        $this->assertDatabaseHas('buku_kas_umum_uraian_details', [
            'buku_kas_umum_id' => $bku->id,
            'rkas_perubahan_id' => $rpJuli->id,
            'uraian' => 'Pembelian Pulsa Data Internet',
            'uraian_arkas' => 'Beban Kawat/Faksimili/Internet/TV Berlangganan',
        ]);

        // 2. api.bku.uraian in Edit Mode (exclude_bku_id) returns uraian_arkas + all grouped rkas_ids + full sisa_volume = 2
        $apiResp = $this->actingAs($this->bendahara)
            ->getJson("/api/bku/uraian?tahun=2027&bulan=Agustus&rekeningId={$this->rekeningCatalog->id}&kegiatan_id={$this->kegiatan->id}&exclude_bku_id={$bku->id}");

        $apiResp->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.0.id', $rpAgustus->id)
            ->assertJsonPath('data.0.uraian', 'Pembelian Pulsa Data Internet')
            ->assertJsonPath('data.0.uraian_arkas', 'Beban Kawat/Faksimili/Internet/TV Berlangganan')
            ->assertJsonPath('data.0.sisa_volume', 2);

        $returnedRkasIds = $apiResp->json('data.0.rkas_ids');
        $this->assertEqualsCanonicalizing([$rpJuli->id, $rpAgustus->id], $returnedRkasIds);

        // 3. Update BKU preserves uraian_arkas on detail & header without error
        $updateResp = $this->actingAs($this->bendahara)
            ->from("/bku/{$this->penganggaran->id}/agustus")
            ->put("/bku/{$bku->id}", [
                'penganggaran_id' => $this->penganggaran->id,
                'bulan' => 'Agustus',
                'tanggal_nota' => '2027-08-18',
                'jenis_transaksi' => 'non-tunai',
                'nomor_nota' => '055/BOSP/THP-II/2027',
                'nama_toko' => 'Telkomsel Updated',
                'nama_penerima_pembayaran' => null,
                'alamat_toko' => 'Jl. Raya',
                'npwp' => '-',
                'uraian_opsional' => 'Lunas bayar pulsa internet 2 bulan',
                'kode_kegiatan_id' => [$this->kegiatan->id],
                'kode_rekening_id' => [$this->rekeningCatalog->id],
                'uraian_items' => [
                    [
                        'id' => $rpAgustus->id,
                        'uraian_text' => 'Pembelian Pulsa Data Internet',
                        'satuan' => 'Bulan',
                        'volume' => 2,
                        'harga_satuan' => 300000,
                        'jumlah_belanja' => 600000,
                        'kegiatan_id' => $this->kegiatan->id,
                        'rekening_id' => $this->rekeningCatalog->id,
                    ],
                ],
            ]);

        $updateResp->assertSessionHasNoErrors();
        $updateResp->assertSessionHas('success');

        // FIFO lintas bulan mempertahankan tautan rpJuli (vol=1) & rpAgustus (vol=1)
        $this->assertDatabaseHas('buku_kas_umum_uraian_details', [
            'buku_kas_umum_id' => $bku->id,
            'rkas_perubahan_id' => $rpJuli->id,
            'volume' => 1,
            'jumlah' => 300000,
            'uraian' => 'Pembelian Pulsa Data Internet',
            'uraian_arkas' => 'Beban Kawat/Faksimili/Internet/TV Berlangganan',
        ]);
        $this->assertDatabaseHas('buku_kas_umum_uraian_details', [
            'buku_kas_umum_id' => $bku->id,
            'rkas_perubahan_id' => $rpAgustus->id,
            'volume' => 1,
            'jumlah' => 300000,
            'uraian' => 'Pembelian Pulsa Data Internet',
            'uraian_arkas' => 'Beban Kawat/Faksimili/Internet/TV Berlangganan',
        ]);

        // Bulan Juli tidak muncul kembali (tidak overspend) setelah edit transaksi di Agustus
        $juliAfterUpdate = $this->actingAs($this->bendahara)
            ->getJson("/api/bku/uraian?tahun=2027&bulan=Juli&rekeningId={$this->rekeningCatalog->id}&kegiatan_id={$this->kegiatan->id}");
        $juliAfterUpdate->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(0, 'data');
    }

    public function test_bku_tahap2_falls_back_to_rkas_when_rkas_perubahan_empty_and_handles_whitespace_uraian_arkas(): void
    {
        // Tahap 2 (Juli) tanpa baris RkasPerubahan sama sekali -> fallback ke Rkas
        // Rkas memiliki uraian_arkas whitespace-only sehingga fallback payload/detail lama harus dipakai
        $rkasJuli = Rkas::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningCatalog->id,
            'uraian' => 'Kertas HVS A4',
            'uraian_arkas' => '   ',
            'harga_satuan' => 60000,
            'bulan' => 'Juli',
            'jumlah' => 5,
            'satuan' => 'Rim',
        ]);

        $kegRekResp = $this->actingAs($this->bendahara)
            ->getJson('/api/bku/kegiatan-rekening?tahun=2027&bulan=Juli');
        $kegRekResp->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('kegiatan_list.0.id', $this->kegiatan->id)
            ->assertJsonPath('rekening_list.0.id', $this->rekeningCatalog->id);

        $uraianResp = $this->actingAs($this->bendahara)
            ->getJson("/api/bku/uraian?tahun=2027&bulan=Juli&rekeningId={$this->rekeningCatalog->id}&kegiatan_id={$this->kegiatan->id}");
        $uraianResp->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.0.id', $rkasJuli->id)
            ->assertJsonPath('data.0.is_perubahan', false)
            ->assertJsonPath('data.0.sisa_volume', 5);

        // Store dengan payload uraian_arkas non-kosong meski RKAS whitespace -> tetap tersimpan
        $storeResp = $this->actingAs($this->bendahara)
            ->from("/bku/{$this->penganggaran->id}/juli")
            ->post('/bku/store', [
                'penganggaran_id' => $this->penganggaran->id,
                'bulan' => 'Juli',
                'tanggal_nota' => '2027-07-10',
                'jenis_transaksi' => 'tunai',
                'nomor_nota' => '056/BOSP/THP-II/2027',
                'nama_toko' => 'Toko ATK',
                'nama_penerima_pembayaran' => null,
                'alamat_toko' => 'Jl. Melati',
                'npwp' => '-',
                'uraian_opsional' => 'Belanja kertas',
                'kode_kegiatan_id' => [$this->kegiatan->id],
                'kode_rekening_id' => [$this->rekeningCatalog->id],
                'uraian_items' => [
                    [
                        'id' => $rkasJuli->id,
                        'uraian_text' => 'Kertas HVS A4',
                        'uraian_arkas' => 'Kertas HVS A4 70gr ARKAS',
                        'satuan' => 'Rim',
                        'volume' => 2,
                        'harga_satuan' => 60000,
                        'jumlah_belanja' => 120000,
                        'kegiatan_id' => $this->kegiatan->id,
                        'rekening_id' => $this->rekeningCatalog->id,
                    ],
                ],
            ]);

        $storeResp->assertSessionHasNoErrors();
        $bku = BukuKasUmum::where('id_transaksi', '056/BOSP/THP-II/2027')->firstOrFail();

        $this->assertDatabaseHas('buku_kas_umum_uraian_details', [
            'buku_kas_umum_id' => $bku->id,
            'rkas_id' => $rkasJuli->id,
            'uraian_arkas' => 'Kertas HVS A4 70gr ARKAS',
        ]);

        // Update dengan payload uraian_arkas whitespace -> fallback ke detail lama tetap terjaga
        $updateResp = $this->actingAs($this->bendahara)
            ->from("/bku/{$this->penganggaran->id}/juli")
            ->put("/bku/{$bku->id}", [
                'penganggaran_id' => $this->penganggaran->id,
                'bulan' => 'Juli',
                'tanggal_nota' => '2027-07-12',
                'jenis_transaksi' => 'tunai',
                'nomor_nota' => '056/BOSP/THP-II/2027',
                'nama_toko' => 'Toko ATK Baru',
                'nama_penerima_pembayaran' => null,
                'alamat_toko' => 'Jl. Melati',
                'npwp' => '-',
                'uraian_opsional' => 'Belanja kertas revisi',
                'kode_kegiatan_id' => [$this->kegiatan->id],
                'kode_rekening_id' => [$this->rekeningCatalog->id],
                'uraian_items' => [
                    [
                        'id' => $rkasJuli->id,
                        'uraian_text' => 'Kertas HVS A4',
                        'uraian_arkas' => '   ',
                        'satuan' => 'Rim',
                        'volume' => 3,
                        'harga_satuan' => 60000,
                        'jumlah_belanja' => 180000,
                        'kegiatan_id' => $this->kegiatan->id,
                        'rekening_id' => $this->rekeningCatalog->id,
                    ],
                ],
            ]);

        $updateResp->assertSessionHasNoErrors();
        $this->assertDatabaseHas('buku_kas_umum_uraian_details', [
            'buku_kas_umum_id' => $bku->id,
            'rkas_id' => $rkasJuli->id,
            'volume' => 3,
            'uraian_arkas' => 'Kertas HVS A4 70gr ARKAS',
        ]);
    }

    public function test_kinerja_variant_bku_edit_modal_uraian_api_and_store_update(): void
    {
        $kinerjaPenganggaran = KinerjaPenganggaran::create([
            'pagu_anggaran' => 25000000,
            'tahun_anggaran' => 2027,
            'kepala_sekolah' => 'Kepala Sekolah',
            'sk_kepala_sekolah' => 'SK-K-001',
            'nip_kepala_sekolah' => '197001012000011001',
            'bendahara' => 'Bendahara',
            'sk_bendahara' => 'SK-K-002',
            'nip_bendahara' => '198001012005012001',
            'komite' => 'Ketua Komite',
            'tanggal_sk_kepala_sekolah' => '2027-01-02',
            'tanggal_sk_bendahara' => '2027-01-02',
        ]);

        $kinerjaRkas = KinerjaRkas::create([
            'kinerja_penganggaran_id' => $kinerjaPenganggaran->id,
            'kode_id' => $this->kegiatan->id,
            'kode_rekening_id' => $this->rekeningCatalog->id,
            'uraian' => 'Pelatihan Guru Kinerja',
            'uraian_arkas' => 'Jasa Narasumber Pelatihan Kinerja',
            'harga_satuan' => 500000,
            'bulan' => 'April',
            'jumlah' => 2,
            'satuan' => 'OJ',
        ]);

        $storeResp = $this->actingAs($this->bendahara)
            ->from("/kinerja/bku/{$kinerjaPenganggaran->id}/april")
            ->post('/kinerja/bku/store', [
                'kinerja_penganggaran_id' => $kinerjaPenganggaran->id,
                'bulan' => 'April',
                'tanggal_nota' => '2027-04-14',
                'jenis_transaksi' => 'non-tunai',
                'nomor_nota' => 'KIN-001/2027',
                'nama_toko' => null,
                'nama_penerima_pembayaran' => 'Dr. Narasumber',
                'alamat_toko' => 'Jl. Pendidikan',
                'npwp' => '-',
                'uraian_opsional' => 'Honor narasumber',
                'kode_kegiatan_id' => [$this->kegiatan->id],
                'kode_rekening_id' => [$this->rekeningCatalog->id],
                'uraian_items' => [
                    [
                        'id' => $kinerjaRkas->id,
                        'uraian_text' => 'Pelatihan Guru Kinerja',
                        'satuan' => 'OJ',
                        'volume' => 2,
                        'harga_satuan' => 500000,
                        'jumlah_belanja' => 1000000,
                        'kegiatan_id' => $this->kegiatan->id,
                        'rekening_id' => $this->rekeningCatalog->id,
                    ],
                ],
            ]);

        $storeResp->assertSessionHasNoErrors();
        $kinerjaBku = KinerjaBukuKasUmum::where('id_transaksi', 'KIN-001/2027')->firstOrFail();

        $this->assertDatabaseHas('kinerja_buku_kas_umum_uraian_details', [
            'kinerja_buku_kas_umum_id' => $kinerjaBku->id,
            'kinerja_rkas_id' => $kinerjaRkas->id,
            'uraian_arkas' => 'Jasa Narasumber Pelatihan Kinerja',
        ]);

        $apiResp = $this->actingAs($this->bendahara)
            ->getJson("/kinerja/api/bku/uraian?tahun=2027&bulan=April&rekeningId={$this->rekeningCatalog->id}&kegiatan_id={$this->kegiatan->id}&exclude_bku_id={$kinerjaBku->id}");

        $apiResp->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.0.id', $kinerjaRkas->id)
            ->assertJsonPath('data.0.uraian_arkas', 'Jasa Narasumber Pelatihan Kinerja')
            ->assertJsonPath('data.0.sisa_volume', 2);

        $updateResp = $this->actingAs($this->bendahara)
            ->from("/kinerja/bku/{$kinerjaPenganggaran->id}/april")
            ->put("/kinerja/bku/{$kinerjaBku->id}", [
                'kinerja_penganggaran_id' => $kinerjaPenganggaran->id,
                'bulan' => 'April',
                'tanggal_nota' => '2027-04-15',
                'jenis_transaksi' => 'non-tunai',
                'nomor_nota' => 'KIN-001/2027',
                'nama_toko' => null,
                'nama_penerima_pembayaran' => 'Dr. Narasumber Updated',
                'alamat_toko' => 'Jl. Pendidikan',
                'npwp' => '-',
                'uraian_opsional' => 'Honor narasumber revisi',
                'kode_kegiatan_id' => [$this->kegiatan->id],
                'kode_rekening_id' => [$this->rekeningCatalog->id],
                'uraian_items' => [
                    [
                        'id' => $kinerjaRkas->id,
                        'uraian_text' => 'Pelatihan Guru Kinerja',
                        'satuan' => 'OJ',
                        'volume' => 1,
                        'harga_satuan' => 500000,
                        'jumlah_belanja' => 500000,
                        'kegiatan_id' => $this->kegiatan->id,
                        'rekening_id' => $this->rekeningCatalog->id,
                    ],
                ],
            ]);

        $updateResp->assertSessionHasNoErrors();
        $this->assertDatabaseHas('kinerja_buku_kas_umum_uraian_details', [
            'kinerja_buku_kas_umum_id' => $kinerjaBku->id,
            'kinerja_rkas_id' => $kinerjaRkas->id,
            'volume' => 1,
            'uraian_arkas' => 'Jasa Narasumber Pelatihan Kinerja',
        ]);
    }
}
