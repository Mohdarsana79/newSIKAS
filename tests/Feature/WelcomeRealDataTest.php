<?php

namespace Tests\Feature;

use App\Models\BukuKasUmum;
use App\Models\KinerjaBukuKasUmum;
use App\Models\KinerjaPenganggaran;
use App\Models\KodeKegiatan;
use App\Models\Penganggaran;
use App\Models\RekeningBelanja;
use App\Models\SekolahProfile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class WelcomeRealDataTest extends TestCase
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

    public function test_welcome_handles_empty_database_gracefully_with_zero_real_metrics(): void
    {
        $this->withoutVite();

        $this->get('/')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Welcome')
                ->where('welcomeData.school', null)
                ->where('welcomeData.stats.has_data', false)
                ->where('welcomeData.stats.total_transaksi_bku', 0)
                ->where('welcomeData.stats.total_pagu', 0)
                ->where('welcomeData.stats.total_realisasi', 0)
                ->where('welcomeData.stats.persentase_serapan', 0)
                ->has('welcomeData.variants', 4)
                ->where('welcomeData.variants.0.key', 'reguler')
                ->where('welcomeData.variants.0.has_data', false)
                ->where('welcomeData.variants.0.pagu_anggaran', 0)
                ->where('welcomeData.variants.0.status_persetujuan', 'kosong')
                ->where('welcomeData.variants.1.key', 'kinerja')
                ->where('welcomeData.variants.1.has_data', false)
                ->where('welcomeData.variants.1.pagu_anggaran', 0)
                ->where('welcomeData.variants.2.key', 'silpa')
                ->where('welcomeData.variants.2.has_data', false)
                ->where('welcomeData.variants.2.pagu_anggaran', 0)
                ->where('welcomeData.variants.3.key', 'kinerja_silpa')
                ->where('welcomeData.variants.3.has_data', false)
                ->where('welcomeData.variants.3.pagu_anggaran', 0)
                ->has('welcomeData.variants.0.monthly_cumulative', 12)
            );
    }

    public function test_welcome_serves_latest_year_multi_variant_real_data_excluding_bunga_and_nip(): void
    {
        $this->withoutVite();

        $sekolah = $this->createSekolah();

        $kode = KodeKegiatan::create([
            'kode' => '01.01.01',
            'program' => 'Pengembangan Kompetensi Lulusan',
            'sub_program' => 'Kegiatan Pembelajaran',
            'uraian' => 'Pengadaan Bahan',
        ]);

        $rekening = RekeningBelanja::create([
            'kode_rekening' => '5.1.02.01.01.0024',
            'rincian_objek' => 'Belanja Alat Tulis Kantor',
            'kategori' => 'Operasi',
        ]);

        // Tahun lama (2025) - tidak boleh masuk agregat tahun aktif (2026)
        Penganggaran::create([
            'sekolah_id' => $sekolah->id,
            'pagu_anggaran' => 50000000,
            'tahun_anggaran' => 2025,
            'kepala_sekolah' => 'Kepala Sekolah Lama',
            'nip_kepala_sekolah' => '197001012000011001',
            'sk_kepala_sekolah' => 'SK-OLD',
            'tanggal_sk_kepala_sekolah' => '2025-01-01',
            'bendahara' => 'Bendahara Lama',
            'nip_bendahara' => '198001012005012001',
            'sk_bendahara' => 'SK-OLD-B',
            'tanggal_sk_bendahara' => '2025-01-01',
            'komite' => 'Komite Lama',
        ]);

        // Tahun terbaru (2026) - BOSP Reguler
        $reg2026 = Penganggaran::create([
            'sekolah_id' => $sekolah->id,
            'pagu_anggaran' => 30000000,
            'tahun_anggaran' => 2026,
            'kepala_sekolah' => 'Dra. Masitah Abdullah',
            'nip_kepala_sekolah' => '196909172007012017',
            'sk_kepala_sekolah' => 'SK-KS-2026',
            'tanggal_sk_kepala_sekolah' => '2026-01-02',
            'bendahara' => 'Siti Aminah',
            'nip_bendahara' => '198505052010012099',
            'sk_bendahara' => 'SK-BEND-2026',
            'tanggal_sk_bendahara' => '2026-01-02',
            'komite' => 'Sapri Hi Sabe',
            'status_persetujuan' => 'disetujui',
            'tanggal_persetujuan' => now(),
        ]);

        BukuKasUmum::create([
            'penganggaran_id' => $reg2026->id,
            'kode_kegiatan_id' => $kode->id,
            'kode_rekening_id' => $rekening->id,
            'tanggal_transaksi' => '2026-03-15',
            'jenis_transaksi' => 'tunai',
            'uraian' => 'Belanja ATK Maret',
            'total_transaksi_kotor' => 10000000,
            'is_bunga_record' => false,
        ]);

        BukuKasUmum::create([
            'penganggaran_id' => $reg2026->id,
            'kode_kegiatan_id' => $kode->id,
            'kode_rekening_id' => $rekening->id,
            'tanggal_transaksi' => '2026-06-20',
            'jenis_transaksi' => 'non-tunai',
            'uraian' => 'Belanja ATK Juni',
            'total_transaksi_kotor' => 5000000,
            'is_bunga_record' => false,
        ]);

        // Record bunga bank - harus dikecualikan dari realisasi & jumlah transaksi
        BukuKasUmum::create([
            'penganggaran_id' => $reg2026->id,
            'kode_kegiatan_id' => $kode->id,
            'kode_rekening_id' => $rekening->id,
            'tanggal_transaksi' => '2026-06-30',
            'jenis_transaksi' => 'non-tunai',
            'uraian' => 'Bunga Bank Juni',
            'total_transaksi_kotor' => 250000,
            'is_bunga_record' => true,
        ]);

        // Tahun terbaru (2026) - BOSP Kinerja
        $kin2026 = KinerjaPenganggaran::create([
            'sekolah_id' => $sekolah->id,
            'pagu_anggaran' => 20000000,
            'tahun_anggaran' => 2026,
            'kepala_sekolah' => 'Dra. Masitah Abdullah',
            'nip_kepala_sekolah' => '196909172007012017',
            'sk_kepala_sekolah' => 'SK-KS-2026',
            'tanggal_sk_kepala_sekolah' => '2026-01-02',
            'bendahara' => 'Siti Aminah',
            'nip_bendahara' => '198505052010012099',
            'sk_bendahara' => 'SK-BEND-2026',
            'tanggal_sk_bendahara' => '2026-01-02',
            'komite' => 'Sapri Hi Sabe',
            'status_persetujuan' => 'draft',
        ]);

        KinerjaBukuKasUmum::create([
            'kinerja_penganggaran_id' => $kin2026->id,
            'kode_kegiatan_id' => $kode->id,
            'kode_rekening_id' => $rekening->id,
            'tanggal_transaksi' => '2026-04-10',
            'jenis_transaksi' => 'non-tunai',
            'uraian' => 'Pelatihan Guru',
            'total_transaksi_kotor' => 10000000,
            'is_bunga_record' => false,
        ]);

        $response = $this->get('/')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Welcome')
                ->where('welcomeData.tahun', 2026)
                ->where('welcomeData.school.nama_sekolah', 'SMP Muhammadiyah Soni')
                ->where('welcomeData.school.npsn', '40202255')
                // Agregat lintas 4 varian TA 2026: Pagu 30jt + 20jt = 50jt, Realisasi 15jt + 10jt = 25jt (50%), 3 transaksi
                ->where('welcomeData.stats.has_data', true)
                ->where('welcomeData.stats.tahun', 2026)
                ->where('welcomeData.stats.total_transaksi_bku', 3)
                ->where('welcomeData.stats.total_pagu', 50000000)
                ->where('welcomeData.stats.total_realisasi', 25000000)
                ->where('welcomeData.stats.persentase_serapan', 50)
                // Reguler TA 2026
                ->where('welcomeData.variants.0.key', 'reguler')
                ->where('welcomeData.variants.0.has_data', true)
                ->where('welcomeData.variants.0.pagu_anggaran', 30000000)
                ->where('welcomeData.variants.0.total_realisasi', 15000000)
                ->where('welcomeData.variants.0.persentase_serapan', 50)
                ->where('welcomeData.variants.0.jumlah_transaksi', 2)
                ->where('welcomeData.variants.0.status_persetujuan', 'disetujui')
                ->where('welcomeData.variants.0.last_active_month_index', 5) // Juni (0-based)
                ->where('welcomeData.variants.0.monthly_cumulative', [
                    0, 0, 10000000, 10000000, 10000000, 15000000,
                    15000000, 15000000, 15000000, 15000000, 15000000, 15000000,
                ])
                // Kinerja TA 2026
                ->where('welcomeData.variants.1.key', 'kinerja')
                ->where('welcomeData.variants.1.has_data', true)
                ->where('welcomeData.variants.1.pagu_anggaran', 20000000)
                ->where('welcomeData.variants.1.total_realisasi', 10000000)
                ->where('welcomeData.variants.1.jumlah_transaksi', 1)
                ->where('welcomeData.variants.1.status_persetujuan', 'draft')
                ->where('welcomeData.variants.1.last_active_month_index', 3) // April (0-based)
                ->where('welcomeData.variants.1.monthly_cumulative', [
                    0, 0, 0, 10000000, 10000000, 10000000,
                    10000000, 10000000, 10000000, 10000000, 10000000, 10000000,
                ])
                // SiLPA & SiLPA Kinerja kosong pada TA 2026
                ->where('welcomeData.variants.2.key', 'silpa')
                ->where('welcomeData.variants.2.has_data', false)
                ->where('welcomeData.variants.2.pagu_anggaran', 0)
                ->where('welcomeData.variants.2.status_persetujuan', 'kosong')
                ->where('welcomeData.variants.3.key', 'kinerja_silpa')
                ->where('welcomeData.variants.3.has_data', false)
                ->where('welcomeData.variants.3.pagu_anggaran', 0)
                ->where('welcomeData.variants.3.status_persetujuan', 'kosong')
            );

        // Pastikan tidak ada kebocoran NIP di payload halaman publik `/`
        $html = $response->getContent();
        $this->assertStringNotContainsString('196909172007012017', $html);
        $this->assertStringNotContainsString('198505052010012099', $html);
    }
}
