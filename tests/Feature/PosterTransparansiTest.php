<?php

namespace Tests\Feature;

use App\Config\PermissionCatalog;
use App\Models\BukuKasUmum;
use App\Models\KinerjaBukuKasUmum;
use App\Models\KinerjaPenerimaanDana;
use App\Models\KinerjaPenganggaran;
use App\Models\KodeKegiatan;
use App\Models\PenerimaanDana;
use App\Models\Penganggaran;
use App\Models\RekeningBelanja;
use App\Models\Role;
use App\Models\SekolahProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PosterTransparansiTest extends TestCase
{
    use RefreshDatabase;

    private function createSekolah(): SekolahProfile
    {
        return SekolahProfile::create([
            'nama_sekolah' => 'SDN 1 Transparansi',
            'npsn' => '10102020',
            'status_sekolah' => 'Negeri',
            'jenjang_sekolah' => 'SD',
            'kelurahan_desa' => 'Sukamaju',
            'kecamatan' => 'Cibadak',
            'kabupaten_kota' => 'Kab. Sukabumi',
            'provinsi' => 'Jawa Barat',
            'alamat' => 'Jl. Pendidikan No. 1',
        ]);
    }

    public function test_rbac_allows_bendahara_and_kepala_sekolah_across_variants_but_blocks_unauthorized_role(): void
    {
        $this->withoutVite();

        $bendahara = User::factory()->create(['role' => 'bendahara']);
        $kepsek = User::factory()->create(['role' => 'kepala_sekolah']);

        Role::create([
            'slug' => 'tanpa_poster',
            'name' => 'Tanpa Poster',
            'is_system' => false,
            'permissions' => PermissionCatalog::defaultPermissionsForRole('tanpa_poster'),
        ]);
        $limited = User::factory()->create(['role' => 'tanpa_poster']);

        // Bendahara & Kepala Sekolah boleh membuka seluruh 4 varian (reguler, kinerja, silpa, kinerja_silpa)
        $this->actingAs($bendahara)->get('/poster-transparansi')->assertOk();
        $this->actingAs($bendahara)->get('/kinerja/poster-transparansi')->assertOk();
        $this->actingAs($bendahara)->get('/kinerja-silpa/poster-transparansi')->assertOk();
        $this->actingAs($kepsek)->get('/poster-transparansi')->assertOk();
        $this->actingAs($kepsek)->get('/silpa/api/poster-transparansi/data')->assertOk();
        $this->actingAs($kepsek)->get('/kinerja-silpa/api/poster-transparansi/data')->assertOk();

        // Role tanpa izin poster_transparansi ditolak (403)
        $this->actingAs($limited)->get('/poster-transparansi')->assertForbidden();
        $this->actingAs($limited)->get('/api/poster-transparansi/data')->assertForbidden();
    }

    public function test_poster_aggregates_periodes_and_excludes_bunga_records_accurately(): void
    {
        $bendahara = User::factory()->create(['role' => 'bendahara']);
        $sekolah = $this->createSekolah();

        $penganggaran = Penganggaran::create([
            'sekolah_id' => $sekolah->id,
            'pagu_anggaran' => 100000000,
            'tahun_anggaran' => 2026,
            'kepala_sekolah' => 'Drs. Ahmad',
            'nip_kepala_sekolah' => '197001012000011001',
            'sk_kepala_sekolah' => 'SK-01',
            'tanggal_sk_kepala_sekolah' => '2026-01-02',
            'bendahara' => 'Siti Aminah',
            'nip_bendahara' => '198001012005012001',
            'sk_bendahara' => 'SK-02',
            'tanggal_sk_bendahara' => '2026-01-02',
            'komite' => 'Budi Santoso',
            'status_persetujuan' => 'disetujui',
            'tanggal_persetujuan' => now(),
        ]);

        PenerimaanDana::create([
            'penganggaran_id' => $penganggaran->id,
            'sumber_dana' => 'Bosp Reguler Tahap 1',
            'tanggal_terima' => '2026-02-10',
            'jumlah_dana' => 50000000,
            'saldo_awal' => 0,
        ]);

        PenerimaanDana::create([
            'penganggaran_id' => $penganggaran->id,
            'sumber_dana' => 'Bosp Reguler Tahap 2',
            'tanggal_terima' => '2026-08-10',
            'jumlah_dana' => 50000000,
            'saldo_awal' => 0,
        ]);

        $kegA = KodeKegiatan::create([
            'kode' => '01.01.01',
            'program' => 'Pengembangan Standar Isi',
            'sub_program' => 'Kurikulum',
            'uraian' => 'Penyusunan Kurikulum',
        ]);
        $kegB = KodeKegiatan::create([
            'kode' => '05.05.01',
            'program' => 'Pengembangan Sarana dan Prasarana',
            'sub_program' => 'Pemeliharaan',
            'uraian' => 'Pengadaan Laptop',
        ]);

        $rekHabis = RekeningBelanja::create([
            'kode_rekening' => '5.1.02.01.01.0024',
            'rincian_objek' => 'Belanja ATK',
            'kategori' => 'Operasi',
        ]);
        $rekJasa = RekeningBelanja::create([
            'kode_rekening' => '5.1.02.02.01.0013',
            'rincian_objek' => 'Honorarium Guru',
            'kategori' => 'Operasi',
        ]);
        $rekModal = RekeningBelanja::create([
            'kode_rekening' => '5.2.02.10.01.0002',
            'rincian_objek' => 'Laptop Sekolah',
            'kategori' => 'Modal',
        ]);

        // Tahap 1 (Maret)
        BukuKasUmum::create([
            'penganggaran_id' => $penganggaran->id,
            'kode_kegiatan_id' => $kegA->id,
            'rekening_belanja_id' => $rekHabis->id,
            'tanggal_transaksi' => '2026-03-15',
            'jenis_transaksi' => 'tunai',
            'uraian' => 'Belanja ATK Maret',
            'total_transaksi_kotor' => 10000000,
            'is_bunga_record' => false,
        ]);

        // Record bunga bank (HARUS dikecualikan dari realisasi!)
        BukuKasUmum::create([
            'penganggaran_id' => $penganggaran->id,
            'tanggal_transaksi' => '2026-03-31',
            'jenis_transaksi' => 'non-tunai',
            'uraian' => 'Bunga Bank Maret',
            'total_transaksi_kotor' => 9999999,
            'is_bunga_record' => true,
        ]);

        // Tahap 2 (September)
        BukuKasUmum::create([
            'penganggaran_id' => $penganggaran->id,
            'kode_kegiatan_id' => $kegB->id,
            'rekening_belanja_id' => $rekModal->id,
            'tanggal_transaksi' => '2026-09-10',
            'jenis_transaksi' => 'non-tunai',
            'uraian' => 'Pengadaan Laptop',
            'total_transaksi_kotor' => 25000000,
            'is_bunga_record' => false,
        ]);
        BukuKasUmum::create([
            'penganggaran_id' => $penganggaran->id,
            'kode_kegiatan_id' => $kegA->id,
            'rekening_belanja_id' => $rekJasa->id,
            'tanggal_transaksi' => '2026-09-20',
            'jenis_transaksi' => 'non-tunai',
            'uraian' => 'Honorarium',
            'total_transaksi_kotor' => 5000000,
            'is_bunga_record' => false,
        ]);

        // 1. Cek Tahap 1 (hanya Maret = 10jt, dana diterima = 50jt, bunga dikecualikan)
        $t1 = $this->actingAs($bendahara)
            ->getJson('/api/poster-transparansi/data?tahun=2026&periode=tahap_1')
            ->assertOk()
            ->json('data');

        $this->assertTrue($t1['meta']['has_data']);
        $this->assertEquals(50000000, $t1['ringkasan']['dana_diterima']);
        $this->assertEquals(10000000, $t1['ringkasan']['total_realisasi']);
        $this->assertSame(1, $t1['ringkasan']['jumlah_transaksi']);
        $this->assertCount(6, $t1['tren_bulanan']);

        // 2. Cek Tahap 2 (hanya September = 30jt, dana diterima = 50jt)
        $t2 = $this->actingAs($bendahara)
            ->getJson('/api/poster-transparansi/data?tahun=2026&periode=tahap_2')
            ->assertOk()
            ->json('data');

        $this->assertEquals(50000000, $t2['ringkasan']['dana_diterima']);
        $this->assertEquals(30000000, $t2['ringkasan']['total_realisasi']);
        $this->assertSame(2, $t2['ringkasan']['jumlah_transaksi']);

        // 3. Cek Tahunan (total = 40jt dari 100jt = 40.0%, program SNP terurut terbesar)
        $annual = $this->actingAs($bendahara)
            ->getJson('/api/poster-transparansi/data?tahun=2026&periode=tahunan')
            ->assertOk()
            ->json('data');

        $this->assertEquals(100000000, $annual['ringkasan']['dana_diterima']);
        $this->assertEquals(40000000, $annual['ringkasan']['total_realisasi']);
        $this->assertEquals(40.0, $annual['ringkasan']['persentase_serapan']);
        $this->assertSame('disetujui', $annual['ringkasan']['status_persetujuan']);
        $this->assertCount(12, $annual['tren_bulanan']);

        // Klasifikasi Jenis Belanja
        $jenisMap = collect($annual['jenis_belanja'])->keyBy('key');
        $this->assertEquals(10000000, $jenisMap['pakai_habis']['nominal']);
        $this->assertEquals(5000000, $jenisMap['barang_jasa']['nominal']);
        $this->assertEquals(25000000, $jenisMap['modal_peralatan']['nominal']);

        // Program SNP terurut dari nominal terbesar (25jt > 15jt)
        $this->assertSame('Pengembangan Sarana dan Prasarana', $annual['program_snp'][0]['program']);
        $this->assertEquals(25000000, $annual['program_snp'][0]['nominal']);
        $this->assertSame('Pengembangan Standar Isi', $annual['program_snp'][1]['program']);
        $this->assertEquals(15000000, $annual['program_snp'][1]['nominal']);
    }

    public function test_poster_handles_variant_kinerja_empty_data_and_invalid_periode_safely(): void
    {
        $bendahara = User::factory()->create(['role' => 'bendahara']);

        // Belum ada data kinerja -> tetap 200 dengan has_data = false dan periode fallback ke tahunan
        $empty = $this->actingAs($bendahara)
            ->getJson('/kinerja/api/poster-transparansi/data?tahun=2026&periode=tidak_valid')
            ->assertOk()
            ->json('data');

        $this->assertSame('kinerja', $empty['meta']['variant']);
        $this->assertSame('tahunan', $empty['meta']['periode']);
        $this->assertFalse($empty['meta']['has_data']);
        $this->assertEquals(0, $empty['ringkasan']['total_realisasi']);

        // Tambah data BOSP Kinerja dan verifikasi teragregasi
        $kp = KinerjaPenganggaran::create([
            'pagu_anggaran' => 35000000,
            'tahun_anggaran' => 2026,
            'kepala_sekolah' => 'Kepala Kinerja',
            'nip_kepala_sekolah' => '197001012000011001',
            'sk_kepala_sekolah' => 'SK-K1',
            'tanggal_sk_kepala_sekolah' => '2026-01-02',
            'bendahara' => 'Bendahara Kinerja',
            'nip_bendahara' => '198001012005012001',
            'sk_bendahara' => 'SK-K2',
            'tanggal_sk_bendahara' => '2026-01-02',
            'komite' => 'Komite Kinerja',
        ]);

        KinerjaPenerimaanDana::create([
            'kinerja_penganggaran_id' => $kp->id,
            'sumber_dana' => 'Bosp Kinerja Tahap 1',
            'tanggal_terima' => '2026-04-01',
            'jumlah_dana' => 35000000,
            'saldo_awal' => 0,
        ]);

        KinerjaBukuKasUmum::create([
            'kinerja_penganggaran_id' => $kp->id,
            'tanggal_transaksi' => '2026-05-05',
            'jenis_transaksi' => 'non-tunai',
            'uraian' => 'Pelatihan Kinerja',
            'total_transaksi_kotor' => 17500000,
            'is_bunga_record' => false,
        ]);

        $filled = $this->actingAs($bendahara)
            ->getJson('/kinerja/api/poster-transparansi/data?tahun=2026&periode=tahunan')
            ->assertOk()
            ->json('data');

        $this->assertTrue($filled['meta']['has_data']);
        $this->assertSame('BOSP Kinerja', $filled['meta']['variant_label']);
        $this->assertEquals(17500000, $filled['ringkasan']['total_realisasi']);
        $this->assertEquals(50.0, $filled['ringkasan']['persentase_serapan']);
    }

    public function test_poster_handles_end_of_period_boundaries_aset_lain_program_cap_and_array_query(): void
    {
        $bendahara = User::factory()->create(['role' => 'bendahara']);
        $sekolah = $this->createSekolah();

        $penganggaran = Penganggaran::create([
            'sekolah_id' => $sekolah->id,
            'pagu_anggaran' => 90000000,
            'tahun_anggaran' => 2026,
            'kepala_sekolah' => 'Kepala Uji',
            'nip_kepala_sekolah' => '197001012000011001',
            'sk_kepala_sekolah' => 'SK-1',
            'tanggal_sk_kepala_sekolah' => '2026-01-02',
            'bendahara' => 'Bendahara Uji',
            'nip_bendahara' => '198001012005012001',
            'sk_bendahara' => 'SK-2',
            'tanggal_sk_bendahara' => '2026-01-02',
            'komite' => 'Komite Uji',
        ]);

        $rekAsetLain = RekeningBelanja::create([
            'kode_rekening' => '5.2.05.01.01.0001',
            'rincian_objek' => 'Buku Perpustakaan',
            'kategori' => 'Modal',
        ]);

        // Buat 9 program berbeda (termasuk transaksi tepat di 30 Juni & 31 Desember) untuk menguji batas tanggal + cap 8 program
        for ($i = 1; $i <= 9; $i++) {
            $keg = KodeKegiatan::create([
                'kode' => sprintf('0%d.01.01', $i),
                'program' => "Program SNP {$i}",
                'sub_program' => 'Sub',
                'uraian' => "Uraian {$i}",
            ]);

            $tanggal = match ($i) {
                1 => '2026-06-30',
                2 => '2026-12-31',
                default => sprintf('2026-0%d-10', min(9, $i)),
            };

            BukuKasUmum::create([
                'penganggaran_id' => $penganggaran->id,
                'kode_kegiatan_id' => $keg->id,
                'rekening_belanja_id' => $rekAsetLain->id,
                'tanggal_transaksi' => $tanggal,
                'jenis_transaksi' => 'non-tunai',
                'uraian' => "Belanja Buku {$i}",
                'total_transaksi_kotor' => $i * 1000000,
                'is_bunga_record' => false,
            ]);
        }

        // 1. Query array malformed (?periode[]=x) TIDAK boleh melempar 500
        $malformed = $this->actingAs($bendahara)
            ->getJson('/api/poster-transparansi/data?tahun=2026&periode[]=x')
            ->assertOk()
            ->json('data');

        $this->assertSame('tahunan', $malformed['meta']['periode']);
        // 9 program -> diringkas menjadi 7 teratas + 1 baris "Program Lainnya (2 program)" = 8 entri
        $this->assertCount(8, $malformed['program_snp']);
        $this->assertStringContainsString('Program Lainnya (2 program)', $malformed['program_snp'][7]['program']);

        // Klasifikasi 5.2.05.* masuk modal_aset_lain (total 1..9 jt = 45 jt)
        $jenisMap = collect($malformed['jenis_belanja'])->keyBy('key');
        $this->assertEquals(45000000, $jenisMap['modal_aset_lain']['nominal']);

        // 2. Transaksi 30 Juni masuk Tahap 1, transaksi 31 Desember masuk Tahap 2
        $t1 = $this->actingAs($bendahara)
            ->getJson('/api/poster-transparansi/data?tahun=2026&periode=tahap_1')
            ->assertOk()
            ->json('data');
        // Bulan <= 6: i=1 (Jun 30: 1jt), i=3 (Mar: 3jt), i=4 (Apr: 4jt), i=5 (Mei: 5jt), i=6 (Jun: 6jt) = 19jt
        $this->assertEquals(19000000, $t1['ringkasan']['total_realisasi']);

        $t2 = $this->actingAs($bendahara)
            ->getJson('/api/poster-transparansi/data?tahun=2026&periode=tahap_2')
            ->assertOk()
            ->json('data');
        // Bulan >= 7: i=2 (Des 31: 2jt), i=7 (Jul: 7jt), i=8 (Agu: 8jt), i=9 (Sep: 9jt) = 26jt
        $this->assertEquals(26000000, $t2['ringkasan']['total_realisasi']);
    }
}
