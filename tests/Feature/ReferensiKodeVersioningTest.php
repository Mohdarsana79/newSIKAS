<?php

namespace Tests\Feature;

use App\Models\BukuKasUmum;
use App\Models\KodeKegiatan;
use App\Models\Penganggaran;
use App\Models\RekeningBelanja;
use App\Models\Rkas;
use App\Models\SekolahProfile;
use App\Models\User;
use App\Services\ArkasEngineService;
use App\Services\ArkasRkasSyncService;
use App\Services\ReferensiKodeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReferensiKodeVersioningTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected SekolahProfile $sekolah;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create(['role' => 'bendahara']);
        $this->sekolah = SekolahProfile::create([
            'nama_sekolah' => 'SMP Negeri Uji',
            'npsn' => '12345678',
            'status_sekolah' => 'Negeri',
            'jenjang_sekolah' => 'SMP',
            'kelurahan_desa' => 'Desa Uji',
            'kecamatan' => 'Kecamatan Uji',
            'kabupaten_kota' => 'Kabupaten Uji',
            'provinsi' => 'Provinsi Uji',
            'alamat' => 'Jl. Pendidikan No. 1',
            'kepala_sekolah' => 'Kepala Sekolah',
            'nip_kepala_sekolah' => '197001012000011001',
            'bendahara' => 'Bendahara',
            'nip_bendahara' => '198001012005012002',
        ]);
    }

    public function test_same_kode_can_exist_across_different_years_and_updating_2026_does_not_affect_2025_rkas(): void
    {
        $keg2025 = KodeKegiatan::create([
            'tahun' => 2025,
            'kode' => '03.01.01.',
            'program' => 'Standar Proses',
            'sub_program' => 'Penerimaan Peserta Didik Baru',
            'uraian' => 'Pelaksanaan Pendaftaran Peserta Didik Baru (PPDB)',
        ]);
        $keg2026 = KodeKegiatan::create([
            'tahun' => 2026,
            'kode' => '03.01.01.',
            'program' => 'Standar Proses',
            'sub_program' => 'Penerimaan Murid Baru',
            'uraian' => 'Pelaksanaan Pendaftaran Murid Baru (PMB)',
        ]);

        $rek2025 = RekeningBelanja::create([
            'tahun' => 2025,
            'kode_rekening' => '5.1.02.01.01.0024',
            'rincian_objek' => 'Belanja ATK Lama 2025',
            'kategori' => 'Operasi',
        ]);
        $rek2026 = RekeningBelanja::create([
            'tahun' => 2026,
            'kode_rekening' => '5.1.02.01.01.0024',
            'rincian_objek' => 'Belanja ATK Baru 2026',
            'kategori' => 'Operasi',
        ]);

        $p2025 = $this->createPenganggaran(2025);
        $p2026 = $this->createPenganggaran(2026);

        $rkas2025 = Rkas::create([
            'penganggaran_id' => $p2025->id,
            'kode_id' => $keg2025->id,
            'kode_rekening_id' => $rek2025->id,
            'uraian' => 'Spanduk PPDB 2025',
            'harga_satuan' => 100000,
            'bulan' => 'Juni',
            'jumlah' => 2,
            'satuan' => 'buah',
        ]);
        $rkas2026 = Rkas::create([
            'penganggaran_id' => $p2026->id,
            'kode_id' => $keg2026->id,
            'kode_rekening_id' => $rek2026->id,
            'uraian' => 'Spanduk PMB 2026',
            'harga_satuan' => 120000,
            'bulan' => 'Juni',
            'jumlah' => 2,
            'satuan' => 'buah',
        ]);

        // Perbarui master 2026 via controller
        $this->actingAs($this->user)
            ->put(route('kode-kegiatan.update', $keg2026->id), [
                'tahun' => 2026,
                'kode' => '03.01.01.',
                'program' => 'Standar Proses',
                'sub_program' => 'Penerimaan Murid Baru Revisi',
                'uraian' => 'Pelaksanaan PMB Revisi 2026',
            ])
            ->assertRedirect();

        $this->actingAs($this->user)
            ->put(route('rekening-belanja.update', $rek2026->id), [
                'tahun' => 2026,
                'kode_rekening' => '5.1.02.01.01.0024',
                'rincian_objek' => 'Belanja ATK Revisi 2026',
                'kategori' => 'Operasi',
            ])
            ->assertRedirect();

        $rkas2025->refresh();
        $rkas2026->refresh();

        $this->assertSame('Pelaksanaan Pendaftaran Peserta Didik Baru (PPDB)', $rkas2025->kodeKegiatan->uraian);
        $this->assertSame('Belanja ATK Lama 2025', $rkas2025->rekeningBelanja->rincian_objek);
        $this->assertSame('Pelaksanaan PMB Revisi 2026', $rkas2026->kodeKegiatan->uraian);
        $this->assertSame('Belanja ATK Revisi 2026', $rkas2026->rekeningBelanja->rincian_objek);
    }

    public function test_destroy_blocks_deleting_kode_or_rekening_used_in_rkas_or_bku_and_allows_unused(): void
    {
        $kegUsed = KodeKegiatan::create([
            'tahun' => 2025,
            'kode' => '03.03.06.',
            'program' => 'Standar Proses',
            'sub_program' => 'Pembelajaran',
            'uraian' => 'Pramuka',
        ]);
        $kegUnused = KodeKegiatan::create([
            'tahun' => 2025,
            'kode' => '03.03.99.',
            'program' => 'Standar Proses',
            'sub_program' => 'Pembelajaran',
            'uraian' => 'Tidak Terpakai',
        ]);
        $rekUsed = RekeningBelanja::create([
            'tahun' => 2025,
            'kode_rekening' => '5.1.02.01.01.0024',
            'rincian_objek' => 'Belanja ATK',
            'kategori' => 'Operasi',
        ]);
        $rekUnused = RekeningBelanja::create([
            'tahun' => 2025,
            'kode_rekening' => '5.1.02.01.01.0099',
            'rincian_objek' => 'Belanja Tidak Terpakai',
            'kategori' => 'Operasi',
        ]);

        $p2025 = $this->createPenganggaran(2025);
        Rkas::create([
            'penganggaran_id' => $p2025->id,
            'kode_id' => $kegUsed->id,
            'kode_rekening_id' => $rekUsed->id,
            'uraian' => 'Kertas HVS',
            'harga_satuan' => 50000,
            'bulan' => 'Januari',
            'jumlah' => 2,
            'satuan' => 'rim',
        ]);

        $this->actingAs($this->user)
            ->delete(route('kode-kegiatan.destroy', $kegUsed->id))
            ->assertRedirect()
            ->assertSessionHas('error');

        $this->assertDatabaseHas('kode_kegiatans', ['id' => $kegUsed->id]);

        $this->actingAs($this->user)
            ->delete(route('rekening-belanja.destroy', $rekUsed->id))
            ->assertRedirect()
            ->assertSessionHas('error');

        $this->assertDatabaseHas('rekening_belanjas', ['id' => $rekUsed->id]);

        // Yang tidak terpakai boleh dihapus
        $this->actingAs($this->user)
            ->delete(route('kode-kegiatan.destroy', $kegUnused->id))
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertDatabaseMissing('kode_kegiatans', ['id' => $kegUnused->id]);

        $this->actingAs($this->user)
            ->delete(route('rekening-belanja.destroy', $rekUnused->id))
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertDatabaseMissing('rekening_belanjas', ['id' => $rekUnused->id]);
    }

    public function test_referensi_sync_only_modifies_target_year_and_updates_rekening_rincian_objek(): void
    {
        $keg2025 = KodeKegiatan::create([
            'tahun' => 2025,
            'kode' => '03.01.01.',
            'program' => 'Standar Proses',
            'sub_program' => 'PPDB 2025',
            'uraian' => 'Uraian 2025',
        ]);
        $keg2026NoDot = KodeKegiatan::create([
            'tahun' => 2026,
            'kode' => '03.01.01',
            'program' => 'Lama',
            'sub_program' => 'Lama',
            'uraian' => 'Lama',
        ]);
        $rek2025 = RekeningBelanja::create([
            'tahun' => 2025,
            'kode_rekening' => '5.1.02.01.01.0024',
            'rincian_objek' => 'Nama Rekening 2025',
            'kategori' => 'Operasi',
        ]);
        $rek2026 = RekeningBelanja::create([
            'tahun' => 2026,
            'kode_rekening' => '5.1.02.01.01.0024',
            'rincian_objek' => 'Nama Rekening Lama 2026',
            'kategori' => 'Operasi',
        ]);

        $mockEngine = $this->createMock(ArkasEngineService::class);
        $mockEngine->method('runScriptRaw')
            ->willReturnCallback(function (string $script, array $args) {
                if ($args[0] === 'kegiatan' && $args[1] === '2026') {
                    return [
                        'status' => 'success',
                        'data' => [
                            [
                                'id_kode' => '03.01.01.',
                                'program' => 'Standar Proses',
                                'sub_program' => 'Penerimaan Murid Baru',
                                'uraian_kode' => 'Pelaksanaan PMB 2026',
                            ],
                            [
                                'id_kode' => '03.01.04.',
                                'program' => 'Standar Proses',
                                'sub_program' => 'Penerimaan Murid Baru',
                                'uraian_kode' => 'Kode Baru 2026',
                            ],
                        ],
                    ];
                }

                if ($args[0] === 'rekening' && $args[1] === '2026') {
                    return [
                        'status' => 'success',
                        'data' => [
                            [
                                'kode_rekening' => '5.1.02.01.01.0024',
                                'rekening' => 'Nama Rekening Baru 2026',
                                'is_ppn' => true,
                                'is_pph21' => false,
                                'is_pph22' => false,
                                'is_pph23' => false,
                                'is_pph4' => false,
                            ],
                        ],
                    ];
                }

                return ['status' => 'success', 'data' => []];
            });

        $this->app->instance(ArkasEngineService::class, $mockEngine);

        // Sync 2026 via syncAll endpoint
        $res = $this->actingAs($this->user)
            ->postJson(route('referensi-kode.sync-all'), ['year' => 2026]);

        $res->assertOk()->assertJsonPath('status', 'success');

        // Tahun 2025 100% tidak berubah
        $keg2025->refresh();
        $rek2025->refresh();
        $this->assertSame('Uraian 2025', $keg2025->uraian);
        $this->assertSame('Nama Rekening 2025', $rek2025->rincian_objek);

        // Tahun 2026 diperbarui in-place (tanpa duplikasi 03.01.01 vs 03.01.01.) + insert kode baru
        $keg2026NoDot->refresh();
        $rek2026->refresh();
        $this->assertSame('Pelaksanaan PMB 2026', $keg2026NoDot->uraian);
        $this->assertSame(2, KodeKegiatan::forYear(2026)->count());
        $this->assertSame('Nama Rekening Baru 2026', $rek2026->rincian_objek);
        $this->assertTrue($rek2026->is_ppn);
    }

    public function test_copy_from_year_is_idempotent_and_isolated(): void
    {
        KodeKegiatan::create([
            'tahun' => 2026,
            'kode' => '05.08.01.',
            'program' => 'Standar Sarpras',
            'sub_program' => 'Pemeliharaan',
            'uraian' => 'Pemeliharaan Lahan',
        ]);
        RekeningBelanja::create([
            'tahun' => 2026,
            'kode_rekening' => '5.1.02.01.01.0001',
            'rincian_objek' => 'Belanja Bahan Bangunan',
            'kategori' => 'Operasi',
            'is_ppn' => true,
        ]);

        $this->actingAs($this->user)
            ->postJson(route('referensi-kode.copy-year'), [
                'source_year' => 2026,
                'target_year' => 2027,
                'tipe' => 'both',
            ])
            ->assertOk()
            ->assertJsonPath('copied_kegiatan', 1)
            ->assertJsonPath('copied_rekening', 1);

        // Panggil ulang — harus idempoten (0 copied, 1 skipped)
        $this->actingAs($this->user)
            ->postJson(route('referensi-kode.copy-year'), [
                'source_year' => 2026,
                'target_year' => 2027,
                'tipe' => 'both',
            ])
            ->assertOk()
            ->assertJsonPath('copied_kegiatan', 0)
            ->assertJsonPath('copied_rekening', 0)
            ->assertJsonPath('skipped_kegiatan', 1)
            ->assertJsonPath('skipped_rekening', 1);

        $this->assertSame(1, KodeKegiatan::forYear(2027)->count());
        $this->assertSame(1, RekeningBelanja::forYear(2027)->count());
    }

    public function test_rkas_store_rejects_cross_year_kode_and_arkas_sync_service_loads_per_year(): void
    {
        $keg2025 = KodeKegiatan::create([
            'tahun' => 2025,
            'kode' => '06.05.03.',
            'program' => 'Standar Pengelolaan',
            'sub_program' => 'Administrasi',
            'uraian' => 'Dapodik 2025',
        ]);
        $keg2026 = KodeKegiatan::create([
            'tahun' => 2026,
            'kode' => '06.05.03.',
            'program' => 'Standar Pengelolaan',
            'sub_program' => 'Administrasi',
            'uraian' => 'Dapodik 2026',
        ]);
        $rek2025 = RekeningBelanja::create([
            'tahun' => 2025,
            'kode_rekening' => '5.1.02.01.01.0024',
            'rincian_objek' => 'ATK 2025',
            'kategori' => 'Operasi',
        ]);
        $rek2026 = RekeningBelanja::create([
            'tahun' => 2026,
            'kode_rekening' => '5.1.02.01.01.0024',
            'rincian_objek' => 'ATK 2026',
            'kategori' => 'Operasi',
        ]);

        $p2026 = $this->createPenganggaran(2026);

        // Mengirim kode_id milik 2025 ke RKAS 2026 harus ditolak validasi
        $this->actingAs($this->user)
            ->post(route('rkas.store', $p2026->id), [
                'kegiatan_id' => $keg2025->id,
                'rekening_id' => $rek2025->id,
                'uraian' => 'Tes lintas tahun',
                'harga_satuan' => 10000,
                'alokasi' => [
                    ['month' => 'Januari', 'quantity' => 1, 'unit' => 'buah'],
                ],
            ])
            ->assertSessionHasErrors(['kegiatan_id', 'rekening_id']);

        // ArkasRkasSyncService::loadMasterMaps($tahun) mengembalikan ID sesuai tahun
        $syncService = app(ArkasRkasSyncService::class);
        $maps2025 = $syncService->loadMasterMaps(2025);
        $maps2026 = $syncService->loadMasterMaps(2026);

        $this->assertSame($keg2025->id, $maps2025['kegiatanMap']['06.05.03.']);
        $this->assertSame($keg2026->id, $maps2026['kegiatanMap']['06.05.03.']);
        $this->assertSame($rek2025->id, $maps2025['rekenings']['5.1.02.01.01.0024']->id);
        $this->assertSame($rek2026->id, $maps2026['rekenings']['5.1.02.01.01.0024']->id);
    }

    public function test_penganggaran_soft_guard_allows_create_even_without_master_and_reports_years_with_transactions(): void
    {
        $p2025 = $this->createPenganggaran(2025);
        $keg2025 = KodeKegiatan::create([
            'tahun' => 2025,
            'kode' => '06.07.05.',
            'program' => 'Standar Pengelolaan',
            'sub_program' => 'Daya Jasa',
            'uraian' => 'Internet',
        ]);
        $rek2025 = RekeningBelanja::create([
            'tahun' => 2025,
            'kode_rekening' => '5.1.02.02.01.0063',
            'rincian_objek' => 'Belanja Kawat/Faksimili/Internet',
            'kategori' => 'Operasi',
        ]);
        BukuKasUmum::create([
            'penganggaran_id' => $p2025->id,
            'tanggal_transaksi' => '2025-02-15',
            'kode_kegiatan_id' => $keg2025->id,
            'rekening_belanja_id' => $rek2025->id,
            'uraian' => 'Internet Februari',
            'jenis_transaksi' => 'non-tunai',
            'anggaran' => 300000,
            'total_transaksi_kotor' => 300000,
            'dibelanjakan' => 300000,
            'total_pajak' => 0,
            'is_bunga_record' => false,
        ]);

        $service = app(ReferensiKodeService::class);
        $this->assertContains('2025', $service->getYearsWithTransactions());
        $this->assertSame(1, $service->countUsage('kegiatan', $keg2025->id));
        $this->assertSame(1, $service->countUsage('rekening', $rek2025->id));

        // Soft-guard: can_create tetap true walau tahun baru belum punya referensi
        $this->actingAs($this->user)
            ->get(route('penganggaran.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('can_create', true)
                ->where('referensi_stats_per_year.2025.kegiatan', 1)
                ->where('referensi_stats_per_year.2025.rekening', 1)
            );
    }

    protected function createPenganggaran(int $tahun): Penganggaran
    {
        return Penganggaran::create([
            'sekolah_id' => $this->sekolah->id,
            'pagu_anggaran' => 50000000,
            'tahun_anggaran' => $tahun,
            'kepala_sekolah' => 'Kepala Sekolah',
            'sk_kepala_sekolah' => 'SK-KS-01',
            'nip_kepala_sekolah' => '197001012000011001',
            'tanggal_sk_kepala_sekolah' => "{$tahun}-01-02",
            'bendahara' => 'Bendahara',
            'sk_bendahara' => 'SK-B-01',
            'nip_bendahara' => '198001012005012002',
            'tanggal_sk_bendahara' => "{$tahun}-01-02",
            'komite' => 'Ketua Komite',
        ]);
    }
}
