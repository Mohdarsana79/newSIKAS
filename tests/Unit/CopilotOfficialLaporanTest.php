<?php

namespace Tests\Unit;

use App\Models\Lph;
use App\Models\Penganggaran;
use App\Models\SekolahProfile;
use App\Models\Sp2b;
use App\Models\Spmth;
use App\Models\Sptj;
use App\Services\Ai\CopilotService;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class CopilotOfficialLaporanTest extends TestCase
{
    protected CopilotService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = $this->app->make(CopilotService::class);
        $this->setUpInMemoryTables();
    }

    protected function setUpInMemoryTables(): void
    {
        if (! Schema::hasTable('penganggarans')) {
            Schema::create('penganggarans', function ($table) {
                $table->id();
                $table->integer('tahun_anggaran')->default(2026);
                $table->decimal('pagu_anggaran', 15, 2)->default(50000000);
                $table->string('kepala_sekolah')->nullable();
                $table->string('nip_kepala_sekolah')->nullable();
                $table->string('bendahara')->nullable();
                $table->string('nip_bendahara')->nullable();
                $table->unsignedBigInteger('sekolah_id')->default(1);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('sekolahs')) {
            Schema::create('sekolahs', function ($table) {
                $table->id();
                $table->string('nama_sekolah')->default('SMP MUHAMMADIYAH SONI');
                $table->string('npsn')->default('40202255');
                $table->string('alamat')->default('Jl. Pendidikan No. 1');
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('sptjs')) {
            Schema::create('sptjs', function ($table) {
                $table->id();
                $table->unsignedBigInteger('penganggaran_id');
                $table->string('nomor_sptj');
                $table->date('tanggal_sptj')->nullable();
                $table->integer('tahap')->default(1);
                $table->decimal('tahap_satu', 15, 2)->default(0);
                $table->decimal('tahap_dua', 15, 2)->default(0);
                $table->decimal('jenis_belanja_pegawai', 15, 2)->default(0);
                $table->decimal('jenis_belanja_barang_jasa', 15, 2)->default(0);
                $table->decimal('jenis_belanja_modal', 15, 2)->default(0);
                $table->decimal('sisa_kas_tunai', 15, 2)->default(0);
                $table->decimal('sisa_dana_di_bank', 15, 2)->default(0);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('spmths')) {
            Schema::create('spmths', function ($table) {
                $table->id();
                $table->unsignedBigInteger('penganggaran_id');
                $table->string('nomor_surat');
                $table->date('tanggal_spmth')->nullable();
                $table->integer('tahap')->default(1);
                $table->decimal('realisasi_lalu', 15, 2)->default(0);
                $table->decimal('realisasi_ini', 15, 2)->default(0);
                $table->decimal('sisa', 15, 2)->default(0);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('sp2bs')) {
            Schema::create('sp2bs', function ($table) {
                $table->id();
                $table->unsignedBigInteger('penganggaran_id');
                $table->string('nomor_sp2b');
                $table->date('tanggal_sp2b')->nullable();
                $table->string('jenis_periode')->default('tahap');
                $table->integer('tahap')->nullable();
                $table->integer('bulan')->nullable();
                $table->decimal('saldo_awal', 15, 2)->default(0);
                $table->decimal('pendapatan', 15, 2)->default(0);
                $table->decimal('belanja', 15, 2)->default(0);
                $table->decimal('belanja_pegawai', 15, 2)->default(0);
                $table->decimal('belanja_barang_jasa', 15, 2)->default(0);
                $table->decimal('belanja_modal', 15, 2)->default(0);
                $table->decimal('belanja_modal_peralatan_mesin', 15, 2)->default(0);
                $table->decimal('belanja_modal_aset_tetap_lainnya', 15, 2)->default(0);
                $table->decimal('belanja_modal_tanah_bangunan', 15, 2)->default(0);
                $table->decimal('saldo_akhir', 15, 2)->default(0);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('lphs')) {
            Schema::create('lphs', function ($table) {
                $table->id();
                $table->unsignedBigInteger('penganggaran_id');
                $table->string('nomor_lph')->nullable();
                $table->date('tanggal_lph')->nullable();
                $table->integer('semester')->default(1);
                $table->decimal('penerimaan_anggaran', 15, 2)->default(0);
                $table->decimal('penerimaan_realisasi', 15, 2)->default(0);
                $table->decimal('belanja_operasi_anggaran', 15, 2)->default(0);
                $table->decimal('belanja_operasi_realisasi', 15, 2)->default(0);
                $table->decimal('belanja_modal_peralatan_anggaran', 15, 2)->default(0);
                $table->decimal('belanja_modal_peralatan_realisasi', 15, 2)->default(0);
                $table->decimal('belanja_modal_aset_anggaran', 15, 2)->default(0);
                $table->decimal('belanja_modal_aset_realisasi', 15, 2)->default(0);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('buku_kas_umums')) {
            Schema::create('buku_kas_umums', function ($table) {
                $table->id();
                $table->unsignedBigInteger('penganggaran_id');
                $table->date('tanggal_transaksi')->nullable();
                $table->decimal('total_transaksi_kotor', 15, 2)->default(0);
                $table->decimal('pengeluaran', 15, 2)->default(0);
                $table->unsignedBigInteger('rekening_belanja_id')->nullable();
                $table->unsignedBigInteger('kode_kegiatan_id')->nullable();
                $table->boolean('is_bunga_record')->default(false);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('penerimaan_danas')) {
            Schema::create('penerimaan_danas', function ($table) {
                $table->id();
                $table->unsignedBigInteger('penganggaran_id');
                $table->string('sumber_dana')->nullable();
                $table->decimal('jumlah_dana', 15, 2)->default(0);
                $table->decimal('saldo_awal', 15, 2)->default(0);
                $table->date('tanggal_terima')->nullable();
                $table->timestamps();
            });
        }

        // Pastikan default penganggaran & sekolah selalu ada
        Penganggaran::firstOrCreate(
            ['tahun_anggaran' => 2026],
            [
                'pagu_anggaran' => 60000000,
                'kepala_sekolah' => 'Dr. H. Ahmad, M.Pd.',
                'nip_kepala_sekolah' => '197001011995011001',
                'bendahara' => 'Moh Gian Darsana',
                'nip_bendahara' => '198505052010011002',
            ]
        );

        SekolahProfile::firstOrCreate(
            ['id' => 1],
            [
                'nama_sekolah' => 'SMP MUHAMMADIYAH SONI',
                'npsn' => '40202255',
                'alamat' => 'Soni',
            ]
        );
    }

    public function test_get_available_tools_includes_get_official_laporan_data(): void
    {
        $tools = $this->service->getAvailableTools();

        $laporanTool = null;
        foreach ($tools as $t) {
            if (($t['function']['name'] ?? '') === 'get_official_laporan_data') {
                $laporanTool = $t;
                break;
            }
        }

        $this->assertNotNull($laporanTool, 'Tool get_official_laporan_data harus terdaftar di getAvailableTools()');
        $params = $laporanTool['function']['parameters']['properties'] ?? [];
        $this->assertArrayHasKey('jenis_laporan', $params);
        $this->assertArrayHasKey('tahap', $params);
        $this->assertArrayHasKey('bulan', $params);
        $this->assertArrayHasKey('tahun', $params);
        $this->assertEquals(['sptj', 'spmth', 'sp2b', 'lph', 'semua'], $params['jenis_laporan']['enum']);
    }

    public function test_system_prompt_includes_dokumen_laporan_pertanggungjawaban_resmi_guidelines(): void
    {
        $prompt = $this->service->buildSystemPrompt('reguler', 2026);

        $this->assertStringContainsString('DOKUMEN LAPORAN PERTANGGUNGJAWABAN RESMI DINAS (SPTJ, SPMTH, SP2B, DAN LPH)', $prompt);
        $this->assertStringContainsString('get_official_laporan_data', $prompt);
        $this->assertStringContainsString('SURAT PERNYATAAN TANGGUNG JAWAB BELANJA (SPTJ)', $prompt);
        $this->assertStringContainsString('SURAT PERNYATAAN MUTLAK TANGGUNG JAWAB HIBAH (SPMTH)', $prompt);
        $this->assertStringContainsString('SURAT PERMINTAAN PENGESAHAN PENDAPATAN & BELANJA (SP2B)', $prompt);
        $this->assertStringContainsString('LAPORAN PENGGUNAAN DANA HIBAH (LPH) BOSP', $prompt);
        $this->assertStringContainsString('DASHBOARD STATUS LAPORAN PERTANGGUNGJAWABAN BOSP', $prompt);
    }

    public function test_get_official_laporan_data_sptj_structure(): void
    {
        $penganggaran = Penganggaran::where('tahun_anggaran', 2026)->first();

        Sptj::create([
            'penganggaran_id' => $penganggaran->id,
            'nomor_sptj' => '045.2/001/SPTJ/2026',
            'tanggal_sptj' => '2026-06-30',
            'tahap' => 1,
            'tahap_satu' => 25000000,
            'tahap_dua' => 0,
            'jenis_belanja_pegawai' => 5000000,
            'jenis_belanja_barang_jasa' => 10000000,
            'jenis_belanja_modal' => 3000000,
            'sisa_kas_tunai' => 2000000,
            'sisa_dana_di_bank' => 5000000,
        ]);

        $result = $this->service->getOfficialLaporanData('sptj', 1, null, 2026, 'reguler');

        $this->assertEquals('tersimpan', $result['status']);
        $this->assertEquals('SPTJ', $result['jenis_laporan']);
        $this->assertEquals('045.2/001/SPTJ/2026', $result['nomor_surat']);
        $this->assertEquals(18000000, $result['realisasi_belanja']['total_belanja']);
        $this->assertEquals('Delapan Belas Juta Rupiah', $result['realisasi_belanja']['terbilang_total_belanja']);
        $this->assertEquals(7000000, $result['posisi_kas']['total_sisa_kas']);
        $this->assertEquals('Dr. H. Ahmad, M.Pd.', $result['tanda_tangan']['kepala_sekolah']);
    }

    public function test_get_official_laporan_data_spmth_structure(): void
    {
        $penganggaran = Penganggaran::where('tahun_anggaran', 2026)->first();

        Spmth::create([
            'penganggaran_id' => $penganggaran->id,
            'nomor_surat' => '045.2/001/SPMTH/2026',
            'tanggal_spmth' => '2026-06-30',
            'tahap' => 1,
            'realisasi_lalu' => 0,
            'realisasi_ini' => 18000000,
            'sisa' => 42000000,
        ]);

        $result = $this->service->getOfficialLaporanData('spmth', 1, null, 2026, 'reguler');

        $this->assertEquals('tersimpan', $result['status']);
        $this->assertEquals('SPMTH', $result['jenis_laporan']);
        $this->assertEquals('045.2/001/SPMTH/2026', $result['nomor_surat']);
        $this->assertEquals(18000000, $result['realisasi_ini']);
        $this->assertEquals(42000000, $result['sisa_dana']);
    }

    public function test_get_official_laporan_data_sp2b_structure(): void
    {
        $penganggaran = Penganggaran::where('tahun_anggaran', 2026)->first();

        // Tahap
        Sp2b::create([
            'penganggaran_id' => $penganggaran->id,
            'nomor_sp2b' => '045.2/001/SP2B/2026',
            'tanggal_sp2b' => '2026-06-30',
            'jenis_periode' => 'tahap',
            'tahap' => 1,
            'saldo_awal' => 0,
            'pendapatan' => 25000000,
            'belanja' => 18000000,
            'belanja_pegawai' => 5000000,
            'belanja_barang_jasa' => 10000000,
            'belanja_modal' => 3000000,
            'belanja_modal_peralatan_mesin' => 2000000,
            'belanja_modal_aset_tetap_lainnya' => 1000000,
            'belanja_modal_tanah_bangunan' => 0,
            'saldo_akhir' => 7000000,
        ]);

        // Bulan
        Sp2b::create([
            'penganggaran_id' => $penganggaran->id,
            'nomor_sp2b' => '045.2/009/SP2B/2026',
            'tanggal_sp2b' => '2026-09-30',
            'jenis_periode' => 'bulan',
            'bulan' => 9,
            'saldo_awal' => 15000000,
            'pendapatan' => 0,
            'belanja' => 6610000,
            'belanja_pegawai' => 1449000,
            'belanja_barang_jasa' => 5161000,
            'belanja_modal' => 0,
            'belanja_modal_peralatan_mesin' => 0,
            'belanja_modal_aset_tetap_lainnya' => 0,
            'belanja_modal_tanah_bangunan' => 0,
            'saldo_akhir' => 8390000,
        ]);

        $resTahap = $this->service->getOfficialLaporanData('sp2b', 1, null, 2026, 'reguler');
        $this->assertEquals('tersimpan', $resTahap['status']);
        $this->assertEquals('SP2B', $resTahap['jenis_laporan']);
        $this->assertEquals('045.2/001/SP2B/2026', $resTahap['nomor_surat']);
        $this->assertEquals(7000000, $resTahap['ringkasan_kas']['saldo_akhir']);

        $resBulan = $this->service->getOfficialLaporanData('sp2b', null, 'September', 2026, 'reguler');
        $this->assertEquals('tersimpan', $resBulan['status']);
        $this->assertEquals('SP2B', $resBulan['jenis_laporan']);
        $this->assertEquals('045.2/009/SP2B/2026', $resBulan['nomor_surat']);
        $this->assertEquals(6610000, $resBulan['ringkasan_kas']['belanja']);
    }

    public function test_get_official_laporan_data_lph_structure(): void
    {
        $penganggaran = Penganggaran::where('tahun_anggaran', 2026)->first();

        Lph::create([
            'penganggaran_id' => $penganggaran->id,
            'nomor_lph' => 'LPH/SEM-1/2026',
            'tanggal_lph' => '2026-06-30',
            'semester' => 1,
            'penerimaan_anggaran' => 25000000,
            'penerimaan_realisasi' => 18000000,
            'belanja_operasi_anggaran' => 20000000,
            'belanja_operasi_realisasi' => 15000000,
            'belanja_modal_peralatan_anggaran' => 3000000,
            'belanja_modal_peralatan_realisasi' => 2000000,
            'belanja_modal_aset_anggaran' => 2000000,
            'belanja_modal_aset_realisasi' => 1000000,
        ]);

        $result = $this->service->getOfficialLaporanData('lph', 1, null, 2026, 'reguler');

        $this->assertEquals('tersimpan', $result['status']);
        $this->assertEquals('LPH', $result['jenis_laporan']);
        $this->assertEquals('LPH/SEM-1/2026', $result['nomor_surat']);
        $this->assertEquals(18000000, $result['komparasi']['total_belanja']['realisasi']);
        $this->assertEquals(7000000, $result['komparasi']['sisa_dana']);
    }

    public function test_get_official_laporan_data_semua_summary_matrix(): void
    {
        $result = $this->service->getOfficialLaporanData('semua', null, null, 2026, 'reguler');

        $this->assertEquals('success', $result['status']);
        $this->assertEquals('SEMUA', $result['jenis_laporan']);
        $this->assertArrayHasKey('matriks_laporan', $result);
        $this->assertCount(4, $result['matriks_laporan']);
        $this->assertArrayHasKey('sp2b_bulanan_tersimpan', $result);
        $this->assertArrayHasKey('sekolah', $result);
    }

    public function test_get_official_laporan_data_invalid_type_returns_error(): void
    {
        $result = $this->service->getOfficialLaporanData('invalid_type', 1, null, 2026, 'reguler');

        $this->assertEquals('error', $result['status']);
        $this->assertStringContainsString('tidak dikenali', $result['pesan']);
    }
}
