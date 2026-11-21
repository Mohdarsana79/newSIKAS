<?php

namespace Tests\Feature;

use App\Models\BukuKasUmum;
use App\Models\KinerjaPenganggaran;
use App\Models\KinerjaRkas;
use App\Models\KinerjaRkasPerubahan;
use App\Models\KinerjaSilpaPenganggaran;
use App\Models\KinerjaSilpaRkas;
use App\Models\KodeKegiatan;
use App\Models\PenerimaanDana;
use App\Models\Penganggaran;
use App\Models\RekeningBelanja;
use App\Models\Rkas;
use App\Models\RkasPerubahan;
use App\Models\SekolahProfile;
use App\Models\SilpaPenganggaran;
use App\Models\SilpaRkas;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicTransparansiTest extends TestCase
{
    use RefreshDatabase;

    private function createSekolah(): SekolahProfile
    {
        return SekolahProfile::create([
            'nama_sekolah' => 'SDN 1 Transparansi Publik',
            'npsn' => '20203030',
            'status_sekolah' => 'Negeri',
            'jenjang_sekolah' => 'SD',
            'kelurahan_desa' => 'Mekarjaya',
            'kecamatan' => 'Sukaraja',
            'kabupaten_kota' => 'Kab. Sukabumi',
            'provinsi' => 'Jawa Barat',
            'alamat' => 'Jl. Merdeka No. 10',
            'website_sync_token' => 'SECRET-SYNC-TOKEN-999',
        ]);
    }

    public function test_public_guest_can_access_portal_and_api_endpoints_even_when_database_is_empty(): void
    {
        $this->withoutVite();

        $this->get('/transparansi')->assertOk();

        $this->getJson('/api/public/transparansi/data?variant=tidak_valid&periode=ngawur&tahun=9999')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.meta.variant', 'reguler')
            ->assertJsonPath('data.meta.periode', 'tahunan')
            ->assertJsonPath('data.active.meta.has_data', false);

        $this->getJson('/api/public/transparansi/rka-tahapan?variant=tidak_valid&jenis=acak')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.meta.variant', 'reguler')
            ->assertJsonPath('data.meta.jenis', 'awal')
            ->assertJsonPath('data.meta.has_data', false)
            ->assertJsonPath('data.meta.reason', 'not_found');
    }

    public function test_public_endpoints_never_leak_sensitive_fields_like_nip_bank_account_or_sync_token(): void
    {
        $this->withoutVite();

        $sekolah = $this->createSekolah();

        $penganggaran = Penganggaran::create([
            'sekolah_id' => $sekolah->id,
            'pagu_anggaran' => 120000000,
            'tahun_anggaran' => 2026,
            'kepala_sekolah' => 'Drs. Rahmat Hidayat',
            'nip_kepala_sekolah' => '197001011999031009',
            'sk_kepala_sekolah' => 'SK-KS-01',
            'tanggal_sk_kepala_sekolah' => '2026-01-02',
            'bendahara' => 'Sri Wahyuni',
            'nip_bendahara' => '198205122008012015',
            'sk_bendahara' => 'SK-B-02',
            'tanggal_sk_bendahara' => '2026-01-02',
            'komite' => 'H. Abdullah',
            'status_persetujuan' => 'disetujui',
            'tanggal_persetujuan' => now(),
        ]);

        $keg = KodeKegiatan::create([
            'kode' => '03.03.06',
            'program' => 'Pengembangan Standar Proses',
            'sub_program' => 'Pelaksanaan Pembelajaran',
            'uraian' => 'Pengadaan Bahan Habis Pakai',
        ]);

        $rek = RekeningBelanja::create([
            'kode_rekening' => '5.1.02.01.01.0024',
            'rincian_objek' => 'Belanja ATK',
            'kategori' => 'Operasi',
        ]);

        Rkas::create([
            'penganggaran_id' => $penganggaran->id,
            'kode_id' => $keg->id,
            'kode_rekening_id' => $rek->id,
            'uraian' => 'Kertas HVS A4',
            'satuan' => 'Rim',
            'jumlah' => 10,
            'harga_satuan' => 50000,
            'bulan' => 'Februari',
            'nama_penerima' => 'CV RAHASIA VENDOR',
            'nomor_rekening' => '1234567890123456',
            'bank' => 'BANK RAHASIA',
            'ada_npwp' => true,
            'pot_ppn' => 55000,
            'pot_pph21' => 25000,
            'pot_pph23' => 10000,
        ]);

        $pageResponse = $this->get('/transparansi?tahun=2026');
        $pageResponse->assertOk();
        $pageBody = $pageResponse->getContent();

        $overviewResponse = $this->getJson('/api/public/transparansi/data?variant=reguler&tahun=2026');
        $overviewResponse->assertOk();
        $overviewJson = $overviewResponse->getContent();

        $rkaResponse = $this->getJson('/api/public/transparansi/rka-tahapan?variant=reguler&tahun=2026&jenis=awal');
        $rkaResponse->assertOk();
        $rkaJson = $rkaResponse->getContent();

        $forbiddenStrings = [
            '197001011999031009',
            '198205122008012015',
            'nip_kepala_sekolah',
            'nip_bendahara',
            'CV RAHASIA VENDOR',
            '1234567890123456',
            'BANK RAHASIA',
            'SECRET-SYNC-TOKEN-999',
            'nomor_rekening',
            'nama_penerima',
            'ada_npwp',
            'pot_ppn',
            'pot_pph21',
            'pot_pph23',
        ];

        foreach ($forbiddenStrings as $secret) {
            $this->assertStringNotContainsString($secret, (string) $pageBody, "Halaman /transparansi membocorkan: {$secret}");
            $this->assertStringNotContainsString($secret, (string) $overviewJson, "API overview membocorkan: {$secret}");
            $this->assertStringNotContainsString($secret, (string) $rkaJson, "API rka-tahapan membocorkan: {$secret}");
        }
    }

    public function test_overview_aggregates_all_variants_and_excludes_bunga_records(): void
    {
        $sekolah = $this->createSekolah();

        $reguler = Penganggaran::create([
            'sekolah_id' => $sekolah->id,
            'pagu_anggaran' => 100000000,
            'tahun_anggaran' => 2026,
            'kepala_sekolah' => 'Kepala A',
            'nip_kepala_sekolah' => '111',
            'sk_kepala_sekolah' => 'SK-1',
            'tanggal_sk_kepala_sekolah' => '2026-01-01',
            'bendahara' => 'Bendahara A',
            'nip_bendahara' => '222',
            'sk_bendahara' => 'SK-2',
            'tanggal_sk_bendahara' => '2026-01-01',
            'komite' => 'Komite A',
            'status_persetujuan' => 'disetujui',
        ]);

        KinerjaPenganggaran::create([
            'sekolah_id' => $sekolah->id,
            'pagu_anggaran' => 45000000,
            'tahun_anggaran' => 2026,
            'kepala_sekolah' => 'Kepala A',
            'nip_kepala_sekolah' => '111',
            'sk_kepala_sekolah' => 'SK-1',
            'tanggal_sk_kepala_sekolah' => '2026-01-01',
            'bendahara' => 'Bendahara A',
            'nip_bendahara' => '222',
            'sk_bendahara' => 'SK-2',
            'tanggal_sk_bendahara' => '2026-01-01',
            'komite' => 'Komite A',
            'status_persetujuan' => 'draft',
        ]);

        SilpaPenganggaran::create([
            'sekolah_id' => $sekolah->id,
            'pagu_anggaran' => 10000000,
            'tahun_anggaran' => 2026,
            'kepala_sekolah' => 'Kepala A',
            'nip_kepala_sekolah' => '111',
            'sk_kepala_sekolah' => 'SK-1',
            'tanggal_sk_kepala_sekolah' => '2026-01-01',
            'bendahara' => 'Bendahara A',
            'nip_bendahara' => '222',
            'sk_bendahara' => 'SK-2',
            'tanggal_sk_bendahara' => '2026-01-01',
            'komite' => 'Komite A',
            'status_persetujuan' => 'disetujui',
        ]);

        KinerjaSilpaPenganggaran::create([
            'sekolah_id' => $sekolah->id,
            'pagu_anggaran' => 5000000,
            'tahun_anggaran' => 2026,
            'kepala_sekolah' => 'Kepala A',
            'nip_kepala_sekolah' => '111',
            'sk_kepala_sekolah' => 'SK-1',
            'tanggal_sk_kepala_sekolah' => '2026-01-01',
            'bendahara' => 'Bendahara A',
            'nip_bendahara' => '222',
            'sk_bendahara' => 'SK-2',
            'tanggal_sk_bendahara' => '2026-01-01',
            'komite' => 'Komite A',
            'status_persetujuan' => 'disetujui',
        ]);

        PenerimaanDana::create([
            'penganggaran_id' => $reguler->id,
            'sumber_dana' => 'Bosp Reguler Tahap 1',
            'tanggal_terima' => '2026-02-15',
            'jumlah_dana' => 50000000,
            'saldo_awal' => 0,
        ]);

        $keg = KodeKegiatan::create([
            'kode' => '02.02.01',
            'program' => 'Pengembangan Standar Isi',
            'sub_program' => 'Kurikulum',
            'uraian' => 'Pengembangan Kurikulum',
        ]);
        $rek = RekeningBelanja::create([
            'kode_rekening' => '5.1.02.01.01.0024',
            'rincian_objek' => 'ATK',
            'kategori' => 'Operasi',
        ]);

        BukuKasUmum::create([
            'penganggaran_id' => $reguler->id,
            'kode_kegiatan_id' => $keg->id,
            'rekening_belanja_id' => $rek->id,
            'tanggal_transaksi' => '2026-03-10',
            'jenis_transaksi' => 'tunai',
            'uraian' => 'Belanja ATK',
            'total_transaksi_kotor' => 20000000,
            'dibelanjakan' => 20000000,
            'is_bunga_record' => false,
        ]);

        // Bunga bank harus dikecualikan
        BukuKasUmum::create([
            'penganggaran_id' => $reguler->id,
            'kode_kegiatan_id' => $keg->id,
            'rekening_belanja_id' => $rek->id,
            'tanggal_transaksi' => '2026-03-31',
            'jenis_transaksi' => 'non-tunai',
            'uraian' => 'Bunga Bank',
            'total_transaksi_kotor' => 500000,
            'dibelanjakan' => 500000,
            'is_bunga_record' => true,
        ]);

        $res = $this->getJson('/api/public/transparansi/data?variant=reguler&tahun=2026&periode=tahunan')
            ->assertOk();

        $res->assertJsonPath('data.aggregate.total_pagu', 160000000)
            ->assertJsonPath('data.aggregate.total_realisasi', 20000000)
            ->assertJsonPath('data.aggregate.active_variants_count', 4)
            ->assertJsonPath('data.active.ringkasan.total_realisasi', 20000000)
            ->assertJsonPath('data.active.ringkasan.status_label', 'Disetujui')
            ->assertJsonPath('data.sekolah.provinsi', 'Jawa Barat')
            ->assertJsonPath('data.sekolah.kabupaten_kota', 'Kab. Sukabumi');
    }

    public function test_rka_tahapan_awal_and_perubahan_calculate_tahap_and_diff_accurately(): void
    {
        $sekolah = $this->createSekolah();

        $penganggaran = Penganggaran::create([
            'sekolah_id' => $sekolah->id,
            'pagu_anggaran' => 50000000,
            'tahun_anggaran' => 2026,
            'kepala_sekolah' => 'Kepala Sekolah',
            'nip_kepala_sekolah' => '111',
            'sk_kepala_sekolah' => 'SK-1',
            'tanggal_sk_kepala_sekolah' => '2026-01-01',
            'bendahara' => 'Bendahara',
            'nip_bendahara' => '222',
            'sk_bendahara' => 'SK-2',
            'tanggal_sk_bendahara' => '2026-01-01',
            'komite' => 'Ketua Komite',
            'status_persetujuan' => 'disetujui',
        ]);

        $keg = KodeKegiatan::create([
            'kode' => '03.03.06',
            'program' => 'Pengembangan Standar Proses',
            'sub_program' => 'Pembelajaran',
            'uraian' => 'Bahan Habis Pakai',
        ]);
        $rek = RekeningBelanja::create([
            'kode_rekening' => '5.1.02.01.01.0024',
            'rincian_objek' => 'ATK',
            'kategori' => 'Operasi',
        ]);

        // RKAS Awal: Kertas HVS di Februari (Tahap 1: 500rb) & Agustus (Tahap 2: 500rb) = 1.000.000
        Rkas::create([
            'penganggaran_id' => $penganggaran->id,
            'kode_id' => $keg->id,
            'kode_rekening_id' => $rek->id,
            'uraian' => 'Kertas HVS A4',
            'satuan' => 'Rim',
            'jumlah' => 10,
            'harga_satuan' => 50000,
            'bulan' => 'Februari',
        ]);
        Rkas::create([
            'penganggaran_id' => $penganggaran->id,
            'kode_id' => $keg->id,
            'kode_rekening_id' => $rek->id,
            'uraian' => 'Kertas HVS A4',
            'satuan' => 'Rim',
            'jumlah' => 10,
            'harga_satuan' => 50000,
            'bulan' => 'Agustus',
        ]);
        // Item yang akan dihapus di perubahan (300.000)
        Rkas::create([
            'penganggaran_id' => $penganggaran->id,
            'kode_id' => $keg->id,
            'kode_rekening_id' => $rek->id,
            'uraian' => 'Spidol Lama',
            'satuan' => 'Dus',
            'jumlah' => 3,
            'harga_satuan' => 100000,
            'bulan' => 'Maret',
        ]);
        // Item yang akan turun di perubahan (400.000 -> 200.000)
        Rkas::create([
            'penganggaran_id' => $penganggaran->id,
            'kode_id' => $keg->id,
            'kode_rekening_id' => $rek->id,
            'uraian' => 'Map Folder',
            'satuan' => 'Pak',
            'jumlah' => 4,
            'harga_satuan' => 100000,
            'bulan' => 'April',
        ]);

        // RKAS Perubahan: Kertas HVS naik jadi 25 Rim (T1 10 + T2 15 = 1.250.000 -> +250.000)
        RkasPerubahan::create([
            'penganggaran_id' => $penganggaran->id,
            'kode_id' => $keg->id,
            'kode_rekening_id' => $rek->id,
            'uraian' => 'Kertas HVS A4',
            'satuan' => 'Rim',
            'jumlah' => 10,
            'harga_satuan' => 50000,
            'bulan' => 'Februari',
        ]);
        RkasPerubahan::create([
            'penganggaran_id' => $penganggaran->id,
            'kode_id' => $keg->id,
            'kode_rekening_id' => $rek->id,
            'uraian' => 'Kertas HVS A4',
            'satuan' => 'Rim',
            'jumlah' => 15,
            'harga_satuan' => 50000,
            'bulan' => 'September',
        ]);
        // Item turun di perubahan (400.000 -> 200.000 = -200.000)
        RkasPerubahan::create([
            'penganggaran_id' => $penganggaran->id,
            'kode_id' => $keg->id,
            'kode_rekening_id' => $rek->id,
            'uraian' => 'Map Folder',
            'satuan' => 'Pak',
            'jumlah' => 2,
            'harga_satuan' => 100000,
            'bulan' => 'April',
        ]);
        // Item baru di perubahan (200.000)
        RkasPerubahan::create([
            'penganggaran_id' => $penganggaran->id,
            'kode_id' => $keg->id,
            'kode_rekening_id' => $rek->id,
            'uraian' => 'Tinta Printer',
            'satuan' => 'Botol',
            'jumlah' => 2,
            'harga_satuan' => 100000,
            'bulan' => 'Oktober',
        ]);

        // 1. Cek RKA Tahapan Awal
        $awal = $this->getJson('/api/public/transparansi/rka-tahapan?variant=reguler&tahun=2026&jenis=awal')
            ->assertOk();

        $awal->assertJsonPath('data.meta.has_data', true)
            ->assertJsonPath('data.totals.jumlah', 1700000)
            ->assertJsonPath('data.totals.tahap1', 1200000)
            ->assertJsonPath('data.totals.tahap2', 500000)
            ->assertJsonPath('data.totals.total_items', 3);

        // 2. Cek RKA Tahapan Perubahan
        $perubahan = $this->getJson('/api/public/transparansi/rka-tahapan?variant=reguler&tahun=2026&jenis=perubahan')
            ->assertOk();

        $perubahan->assertJsonPath('data.meta.has_data', true)
            ->assertJsonPath('data.totals.jumlah_murni', 1700000)
            ->assertJsonPath('data.totals.jumlah', 1650000)
            ->assertJsonPath('data.totals.bertambah', 450000) // +250k (HVS naik) + 200k (Tinta baru)
            ->assertJsonPath('data.totals.berkurang', 500000) // -300k (Spidol dihapus) - 200k (Map turun)
            ->assertJsonPath('data.totals.tahap1', 700000)
            ->assertJsonPath('data.totals.tahap2', 950000)
            ->assertJsonPath('data.totals.changed_items', 4);

        $itemsByName = collect($perubahan->json('data.programs.0.sub_programs.0.uraian_programs.0.items'))
            ->keyBy('uraian');
        $this->assertSame('naik', $itemsByName['Kertas HVS A4']['status_perubahan']);
        $this->assertSame('turun', $itemsByName['Map Folder']['status_perubahan']);
        $this->assertSame('dihapus', $itemsByName['Spidol Lama']['status_perubahan']);
        $this->assertSame('baru', $itemsByName['Tinta Printer']['status_perubahan']);

        // 3. Cek varian Kinerja juga mendukung RKAS Perubahan
        $kinerja = KinerjaPenganggaran::create([
            'sekolah_id' => $sekolah->id,
            'pagu_anggaran' => 25000000,
            'tahun_anggaran' => 2026,
            'kepala_sekolah' => 'Kepala',
            'nip_kepala_sekolah' => '1',
            'sk_kepala_sekolah' => 'S',
            'tanggal_sk_kepala_sekolah' => '2026-01-01',
            'bendahara' => 'Bendahara',
            'nip_bendahara' => '2',
            'sk_bendahara' => 'S',
            'tanggal_sk_bendahara' => '2026-01-01',
            'komite' => 'Komite',
        ]);
        KinerjaRkas::create([
            'kinerja_penganggaran_id' => $kinerja->id,
            'kode_id' => $keg->id,
            'kode_rekening_id' => $rek->id,
            'uraian' => 'Pelatihan Guru',
            'satuan' => 'Paket',
            'jumlah' => 1,
            'harga_satuan' => 2000000,
            'bulan' => 'April',
        ]);
        KinerjaRkasPerubahan::create([
            'kinerja_penganggaran_id' => $kinerja->id,
            'kode_id' => $keg->id,
            'kode_rekening_id' => $rek->id,
            'uraian' => 'Pelatihan Guru',
            'satuan' => 'Paket',
            'jumlah' => 2,
            'harga_satuan' => 2000000,
            'bulan' => 'Oktober',
        ]);

        $this->getJson('/api/public/transparansi/rka-tahapan?variant=kinerja&tahun=2026&jenis=perubahan')
            ->assertOk()
            ->assertJsonPath('data.meta.has_data', true)
            ->assertJsonPath('data.totals.jumlah_murni', 2000000)
            ->assertJsonPath('data.totals.jumlah', 4000000)
            ->assertJsonPath('data.totals.bertambah', 2000000);
    }

    public function test_silpa_variant_returns_graceful_unsupported_response_for_rkas_perubahan(): void
    {
        $sekolah = $this->createSekolah();

        $silpa = SilpaPenganggaran::create([
            'sekolah_id' => $sekolah->id,
            'pagu_anggaran' => 15000000,
            'tahun_anggaran' => 2026,
            'kepala_sekolah' => 'Kepala',
            'nip_kepala_sekolah' => '1',
            'sk_kepala_sekolah' => 'S',
            'tanggal_sk_kepala_sekolah' => '2026-01-01',
            'bendahara' => 'Bendahara',
            'nip_bendahara' => '2',
            'sk_bendahara' => 'S',
            'tanggal_sk_bendahara' => '2026-01-01',
            'komite' => 'Komite',
        ]);

        $keg = KodeKegiatan::create([
            'kode' => '05.05.01',
            'program' => 'Pengembangan Sarana dan Prasarana',
            'sub_program' => 'Pemeliharaan',
            'uraian' => 'Perbaikan Ruang Kelas',
        ]);
        $rek = RekeningBelanja::create([
            'kode_rekening' => '5.1.02.03.02.0001',
            'rincian_objek' => 'Pemeliharaan Gedung',
            'kategori' => 'Operasi',
        ]);

        SilpaRkas::create([
            'silpa_penganggaran_id' => $silpa->id,
            'kode_id' => $keg->id,
            'kode_rekening_id' => $rek->id,
            'uraian' => 'Cat Tembok',
            'satuan' => 'Kaleng',
            'jumlah' => 5,
            'harga_satuan' => 250000,
            'bulan' => 'Mei',
        ]);

        $this->getJson('/api/public/transparansi/rka-tahapan?variant=silpa&tahun=2026&jenis=awal')
            ->assertOk()
            ->assertJsonPath('data.meta.has_data', true)
            ->assertJsonPath('data.meta.supports_perubahan', false)
            ->assertJsonPath('data.totals.jumlah', 1250000);

        $this->getJson('/api/public/transparansi/rka-tahapan?variant=silpa&tahun=2026&jenis=perubahan')
            ->assertOk()
            ->assertJsonPath('data.meta.has_data', false)
            ->assertJsonPath('data.meta.supports_perubahan', false)
            ->assertJsonPath('data.meta.reason', 'unsupported_variant');

        // Verifikasi juga SiLPA Kinerja (kinerja_silpa)
        $kinerjaSilpa = KinerjaSilpaPenganggaran::create([
            'sekolah_id' => $sekolah->id,
            'pagu_anggaran' => 8000000,
            'tahun_anggaran' => 2026,
            'kepala_sekolah' => 'Kepala',
            'nip_kepala_sekolah' => '1',
            'sk_kepala_sekolah' => 'S',
            'tanggal_sk_kepala_sekolah' => '2026-01-01',
            'bendahara' => 'Bendahara',
            'nip_bendahara' => '2',
            'sk_bendahara' => 'S',
            'tanggal_sk_bendahara' => '2026-01-01',
            'komite' => 'Komite',
        ]);

        KinerjaSilpaRkas::create([
            'kinerja_silpa_penganggaran_id' => $kinerjaSilpa->id,
            'kode_id' => $keg->id,
            'kode_rekening_id' => $rek->id,
            'uraian' => 'Perbaikan Papan Tulis',
            'satuan' => 'Unit',
            'jumlah' => 2,
            'harga_satuan' => 500000,
            'bulan' => 'Juli',
        ]);

        $this->getJson('/api/public/transparansi/rka-tahapan?variant=kinerja_silpa&tahun=2026&jenis=awal')
            ->assertOk()
            ->assertJsonPath('data.meta.has_data', true)
            ->assertJsonPath('data.meta.supports_perubahan', false)
            ->assertJsonPath('data.totals.tahap2', 1000000);

        $this->getJson('/api/public/transparansi/rka-tahapan?variant=kinerja_silpa&tahun=2026&jenis=perubahan')
            ->assertOk()
            ->assertJsonPath('data.meta.has_data', false)
            ->assertJsonPath('data.meta.supports_perubahan', false)
            ->assertJsonPath('data.meta.reason', 'unsupported_variant');
    }

    public function test_rka_tahapan_prioritizes_sikas_uraian_and_falls_back_to_arkas_uraian_when_blank(): void
    {
        $sekolah = $this->createSekolah();

        $penganggaran = Penganggaran::create([
            'sekolah_id' => $sekolah->id,
            'pagu_anggaran' => 20000000,
            'tahun_anggaran' => 2026,
            'kepala_sekolah' => 'Kepala',
            'nip_kepala_sekolah' => '1',
            'sk_kepala_sekolah' => 'S',
            'tanggal_sk_kepala_sekolah' => '2026-01-01',
            'bendahara' => 'Bendahara',
            'nip_bendahara' => '2',
            'sk_bendahara' => 'S',
            'tanggal_sk_bendahara' => '2026-01-01',
            'komite' => 'Komite',
            'status_persetujuan' => 'disetujui',
        ]);

        $keg = KodeKegiatan::create([
            'kode' => '03.03.06',
            'program' => 'Pengembangan Standar Proses',
            'sub_program' => 'Pembelajaran',
            'uraian' => 'Bahan Habis Pakai',
        ]);
        $rek = RekeningBelanja::create([
            'kode_rekening' => '5.1.02.01.01.0024',
            'rincian_objek' => 'ATK',
            'kategori' => 'Operasi',
        ]);

        // 1. Item memiliki Uraian SIKAS & Uraian ARKAS (multi-bulan) -> WAJIB tampil Uraian SIKAS
        Rkas::create([
            'penganggaran_id' => $penganggaran->id,
            'kode_id' => $keg->id,
            'kode_rekening_id' => $rek->id,
            'uraian' => 'Kertas HVS SIKAS',
            'uraian_arkas' => 'Kertas HVS Versi ARKAS',
            'satuan' => 'Rim',
            'jumlah' => 5,
            'harga_satuan' => 50000,
            'bulan' => 'Februari',
        ]);
        Rkas::create([
            'penganggaran_id' => $penganggaran->id,
            'kode_id' => $keg->id,
            'kode_rekening_id' => $rek->id,
            'uraian' => 'Kertas HVS SIKAS',
            'uraian_arkas' => 'Kertas HVS Versi ARKAS Bulan 2',
            'satuan' => 'Rim',
            'jumlah' => 5,
            'harga_satuan' => 50000,
            'bulan' => 'Agustus',
        ]);

        // 2. Item dengan Uraian SIKAS kosong/spasi, hanya punya Uraian ARKAS -> fallback ke Uraian ARKAS
        Rkas::create([
            'penganggaran_id' => $penganggaran->id,
            'kode_id' => $keg->id,
            'kode_rekening_id' => $rek->id,
            'uraian' => '   ',
            'uraian_arkas' => 'Tinta Fallback ARKAS',
            'satuan' => 'Botol',
            'jumlah' => 2,
            'harga_satuan' => 80000,
            'bulan' => 'Maret',
        ]);

        // 3. RKAS Perubahan: kedua kasus juga konsisten mengutamakan Uraian SIKAS
        RkasPerubahan::create([
            'penganggaran_id' => $penganggaran->id,
            'kode_id' => $keg->id,
            'kode_rekening_id' => $rek->id,
            'uraian' => 'Kertas HVS SIKAS',
            'uraian_arkas' => 'Kertas HVS ARKAS Perubahan',
            'satuan' => 'Rim',
            'jumlah' => 12,
            'harga_satuan' => 50000,
            'bulan' => 'Februari',
        ]);
        RkasPerubahan::create([
            'penganggaran_id' => $penganggaran->id,
            'kode_id' => $keg->id,
            'kode_rekening_id' => $rek->id,
            'uraian' => '',
            'uraian_arkas' => 'Tinta Fallback ARKAS',
            'satuan' => 'Botol',
            'jumlah' => 3,
            'harga_satuan' => 80000,
            'bulan' => 'September',
        ]);

        $awal = $this->getJson('/api/public/transparansi/rka-tahapan?variant=reguler&tahun=2026&jenis=awal')
            ->assertOk();

        $awalUraians = collect($awal->json('data.programs.0.sub_programs.0.uraian_programs.0.items'))
            ->pluck('uraian')
            ->all();

        $this->assertContains('Kertas HVS SIKAS', $awalUraians);
        $this->assertContains('Tinta Fallback ARKAS', $awalUraians);
        $this->assertNotContains('Kertas HVS Versi ARKAS', $awalUraians);
        $this->assertNotContains('Kertas HVS Versi ARKAS Bulan 2', $awalUraians);

        $perubahan = $this->getJson('/api/public/transparansi/rka-tahapan?variant=reguler&tahun=2026&jenis=perubahan')
            ->assertOk();

        $perubahanUraians = collect($perubahan->json('data.programs.0.sub_programs.0.uraian_programs.0.items'))
            ->pluck('uraian')
            ->all();

        $this->assertContains('Kertas HVS SIKAS', $perubahanUraians);
        $this->assertContains('Tinta Fallback ARKAS', $perubahanUraians);
        $this->assertNotContains('Kertas HVS ARKAS Perubahan', $perubahanUraians);
    }
}
