<?php

namespace Tests\Feature;

use App\Models\BukuKasUmum;
use App\Models\KinerjaPenganggaran;
use App\Models\KinerjaSpmth;
use App\Models\KodeKegiatan;
use App\Models\Lph;
use App\Models\Penganggaran;
use App\Models\RekeningBelanja;
use App\Models\SekolahProfile;
use App\Models\Sp2b;
use App\Models\SpjTemplate;
use App\Models\Spmth;
use App\Models\Sptj;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpWord\PhpWord;
use Tests\TestCase;

class LaporanCustomTemplateTest extends TestCase
{
    use RefreshDatabase;

    private User $bendahara;

    private User $kepalaSekolah;

    private SekolahProfile $sekolah;

    private Penganggaran $penganggaran;

    private KodeKegiatan $kodeKegiatan;

    private RekeningBelanja $rekeningBelanja;

    /** @var array<int, string> */
    private array $tempFilesToClean = [];

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');
        Storage::fake('public');

        $this->sekolah = SekolahProfile::create([
            'nama_sekolah' => 'SDN 1 Nusantara',
            'npsn' => '20212345',
            'alamat' => 'Jl. Pendidikan No. 10',
            'kelurahan_desa' => 'Sukamaju',
            'kecamatan' => 'Cibeunying',
            'kabupaten_kota' => 'Kab. Bandung',
            'provinsi' => 'Jawa Barat',
            'status_sekolah' => 'Negeri',
            'jenjang_sekolah' => 'SD',
        ]);

        $this->bendahara = User::factory()->create([
            'role' => 'bendahara',
        ]);

        $this->kepalaSekolah = User::factory()->create([
            'role' => 'kepala_sekolah',
        ]);

        $this->penganggaran = Penganggaran::create([
            'pagu_anggaran' => 150000000,
            'tahun_anggaran' => 2026,
            'kepala_sekolah' => 'Dra. Siti Aminah',
            'sk_kepala_sekolah' => 'SK-KS-01',
            'bendahara' => 'Budi Santoso, S.Pd',
            'sk_bendahara' => 'SK-BD-01',
            'komite' => 'H. Ahmad Fauzi',
            'nip_kepala_sekolah' => '197001011998022001',
            'nip_bendahara' => '198505122010011005',
            'tanggal_sk_kepala_sekolah' => '2026-01-02',
            'tanggal_sk_bendahara' => '2026-01-02',
            'sekolah_id' => $this->sekolah->id,
        ]);

        $this->kodeKegiatan = KodeKegiatan::create([
            'kode' => '06.05.01',
            'program' => 'Pengembangan Standar Pengelolaan',
            'sub_program' => 'Kegiatan Administrasi Sekolah',
            'uraian' => 'Pembelian ATK',
        ]);

        $this->rekeningBelanja = RekeningBelanja::create([
            'kode_rekening' => '5.1.02.01.01.0024',
            'rincian_objek' => 'Belanja Alat/Bahan ATK',
            'kategori' => 'Belanja Operasi',
        ]);
    }

    protected function tearDown(): void
    {
        foreach ($this->tempFilesToClean as $path) {
            if (is_file($path)) {
                @unlink($path);
            }
        }
        parent::tearDown();
    }

    public function test_crud_isolation_sample_downloads_and_rbac_for_laporan_templates(): void
    {
        foreach (SpjTemplate::LAPORAN_TYPES as $type) {
            $sampleResp = $this->actingAs($this->bendahara)
                ->get(route('api.spj-templates.sample', ['type' => $type]));
            $sampleResp->assertOk();
            $samplePath = $sampleResp->getFile()->getPathname();
            $this->tempFilesToClean[] = $samplePath;
            $sampleXml = $this->readDocumentXml($samplePath);
            $this->assertStringContainsString('${kop_surat}', $sampleXml);
            $this->assertStringContainsString('${kepala_sekolah}', $sampleXml);

            $docxPath = $this->createDocxFile([
                "Template {$type}",
                'Sekolah: ${nama_sekolah}',
                'Tag Custom: ${nomor_dpa_skpd}',
            ]);

            $storeResp = $this->actingAs($this->bendahara)
                ->postJson(route('api.spj-templates.store', ['type' => $type]), [
                    'nama' => 'Format '.strtoupper($type).' Daerah',
                    'file' => $this->makeUploadedDocx($docxPath, "{$type}.docx"),
                ]);
            $storeResp->assertCreated()
                ->assertJsonPath('success', true)
                ->assertJsonPath('data.document_type', $type);
            $this->assertContains('nomor_dpa_skpd', $storeResp->json('data.detected_variables.unrecognized'));

            // Kepala sekolah hanya read-only pada modul laporan
            $this->actingAs($this->kepalaSekolah)
                ->getJson(route('api.spj-templates.index', ['type' => $type]))
                ->assertOk()
                ->assertJsonCount(1, 'data');

            $this->actingAs($this->kepalaSekolah)
                ->postJson(route('api.spj-templates.store', ['type' => $type]), [
                    'nama' => 'Harus Ditolak',
                    'file' => $this->makeUploadedDocx($docxPath, 'blocked.docx'),
                ])
                ->assertForbidden();
        }
    }

    public function test_spmth_sptj_sp2b_and_lph_custom_templates_compile_with_custom_form_variables(): void
    {
        // 1. SPMTH
        $this->actingAs($this->bendahara)
            ->postJson(route('api.spmth.store'), [
                'penganggaran_id' => $this->penganggaran->id,
                'nomor_surat' => '421/001/SPMTH/2026',
                'tanggal_spmth' => '2026-06-30',
                'tahap' => '1',
                'realisasi_lalu' => 0,
                'realisasi_ini' => 75000000,
                'sisa' => 75000000,
                'custom_variables' => [
                    'nomor_dpa_skpd' => 'DPA-01/DISDIK/2026',
                ],
            ])
            ->assertOk();
        $spmth = Spmth::firstOrFail();

        $spmthTpl = $this->storeTemplateRecord('spmth', [
            'No: ${nomor_surat} | ${semester_text} | ${sumber_dana}',
            'Pagu: ${pagu_rupiah} | Realisasi: ${realisasi_ini_rupiah} | Sisa: ${sisa_rupiah}',
            'DPA: ${nomor_dpa_skpd} | Kosong: [${catatan_spmth_kosong}]',
        ]);

        $spmthResp = $this->actingAs($this->bendahara)
            ->get(route('laporan.spmth.custom.docx', [$spmth->id, $spmthTpl->id]));
        $spmthResp->assertOk();
        $spmthPath = $spmthResp->getFile()->getPathname();
        $this->tempFilesToClean[] = $spmthPath;
        $spmthText = strip_tags($this->readDocumentXml($spmthPath));

        $this->assertDoesNotMatchRegularExpression('/\$\{[^}]+\}/', $spmthText);
        $this->assertStringContainsString('421/001/SPMTH/2026', $spmthText);
        $this->assertStringContainsString('Rp 150.000.000', $spmthText);
        $this->assertStringContainsString('Rp 75.000.000', $spmthText);
        $this->assertStringContainsString('DPA-01/DISDIK/2026', $spmthText);
        $this->assertStringContainsString('Kosong: []', $spmthText);

        // 2. SPTJ
        $this->actingAs($this->bendahara)
            ->postJson(route('api.sptj.store'), [
                'penganggaran_id' => $this->penganggaran->id,
                'nomor_sptj' => '421/002/SPTJ/2026',
                'tanggal_sptj' => '2026-06-30',
                'tahap' => '1',
                'tahap_satu' => 75000000,
                'tahap_dua' => 0,
                'jenis_belanja_pegawai' => 10000000,
                'jenis_belanja_barang_jasa' => 45000000,
                'jenis_belanja_modal' => 15000000,
                'sisa_kas_tunai' => 1000000,
                'sisa_dana_di_bank' => 4000000,
                'custom_variables' => [
                    'kode_sekolah' => 'SEK-20212345',
                    'nomor_dpa_skpd' => 'DPA-02/DISDIK/2026',
                ],
            ])
            ->assertOk();
        $sptj = Sptj::firstOrFail();

        $sptjTpl = $this->storeTemplateRecord('sptj', [
            'SPTJ: ${nomor_sptj} | Kode Sekolah: ${kode_sekolah} | DPA: ${nomor_dpa_skpd}',
            'Penerimaan: ${jumlah_penerimaan_rupiah} | Operasi: ${belanja_operasi_rupiah} | Pengeluaran: ${jumlah_pengeluaran_rupiah}',
            'Sisa Total: ${total_sisa_dana_rupiah}',
        ]);

        $sptjResp = $this->actingAs($this->bendahara)
            ->get(route('laporan.sptj.custom.docx', [$sptj->id, $sptjTpl->id]));
        $sptjResp->assertOk();
        $sptjPath = $sptjResp->getFile()->getPathname();
        $this->tempFilesToClean[] = $sptjPath;
        $sptjText = strip_tags($this->readDocumentXml($sptjPath));

        $this->assertDoesNotMatchRegularExpression('/\$\{[^}]+\}/', $sptjText);
        $this->assertStringContainsString('421/002/SPTJ/2026', $sptjText);
        $this->assertStringContainsString('SEK-20212345', $sptjText);
        $this->assertStringContainsString('DPA-02/DISDIK/2026', $sptjText);
        $this->assertStringContainsString('Rp 55.000.000', $sptjText);
        $this->assertStringContainsString('Rp 70.000.000', $sptjText);
        $this->assertStringContainsString('Rp 5.000.000', $sptjText);

        // 3. SP2B
        $this->actingAs($this->bendahara)
            ->postJson(route('api.sp2b.store'), [
                'penganggaran_id' => $this->penganggaran->id,
                'jenis_periode' => 'tahap',
                'tahap' => '1',
                'nomor_sp2b' => '900/003/SP2B/2026',
                'tanggal_sp2b' => '2026-06-30',
                'saldo_awal' => 0,
                'pendapatan' => 75000000,
                'belanja' => 70000000,
                'belanja_pegawai' => 10000000,
                'belanja_barang_jasa' => 45000000,
                'belanja_modal' => 15000000,
                'belanja_modal_peralatan_mesin' => 10000000,
                'belanja_modal_aset_tetap_lainnya' => 5000000,
                'belanja_modal_tanah_bangunan' => 0,
                'saldo_akhir' => 5000000,
                'custom_variables' => [
                    'dasar_pengesahan' => 'SKB-2026/01',
                ],
            ])
            ->assertOk();
        $sp2b = Sp2b::firstOrFail();

        $sp2bTpl = $this->storeTemplateRecord('sp2b', [
            'SP2B: ${nomor_sp2b} | Periode: ${periode_text} | Dasar: ${dasar_pengesahan}',
            'Belanja: ${belanja_rupiah} | Saldo Akhir: ${saldo_akhir_rupiah}',
        ]);

        $sp2bResp = $this->actingAs($this->bendahara)
            ->get(route('laporan.sp2b.custom.docx', [$sp2b->id, $sp2bTpl->id]));
        $sp2bResp->assertOk();
        $sp2bPath = $sp2bResp->getFile()->getPathname();
        $this->tempFilesToClean[] = $sp2bPath;
        $sp2bText = strip_tags($this->readDocumentXml($sp2bPath));

        $this->assertDoesNotMatchRegularExpression('/\$\{[^}]+\}/', $sp2bText);
        $this->assertStringContainsString('900/003/SP2B/2026', $sp2bText);
        $this->assertStringContainsString('Januari s.d Juni Tahun Anggaran 2026', $sp2bText);
        $this->assertStringContainsString('SKB-2026/01', $sp2bText);
        $this->assertStringContainsString('Rp 70.000.000', $sp2bText);
        $this->assertStringContainsString('Rp 5.000.000', $sp2bText);

        // 4. LPH + tabel dinamis rekap per kode rekening
        BukuKasUmum::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_kegiatan_id' => $this->kodeKegiatan->id,
            'rekening_belanja_id' => $this->rekeningBelanja->id,
            'id_transaksi' => 'BKU-LPH-01',
            'tanggal_transaksi' => '2026-03-15',
            'uraian' => 'Belanja ATK Semester I',
            'jenis_transaksi' => 'non-tunai',
            'anggaran' => 3500000,
            'dibelanjakan' => 3500000,
            'total_transaksi_kotor' => 3500000,
        ]);

        $this->actingAs($this->bendahara)
            ->postJson(route('api.lph.store'), [
                'penganggaran_id' => $this->penganggaran->id,
                'semester' => '1',
                'tanggal_lph' => '2026-06-30',
                'penerimaan_anggaran' => 75000000,
                'penerimaan_realisasi' => 3500000,
                'belanja_operasi_anggaran' => 55000000,
                'belanja_operasi_realisasi' => 3500000,
                'belanja_modal_peralatan_anggaran' => 10000000,
                'belanja_modal_peralatan_realisasi' => 0,
                'belanja_modal_aset_anggaran' => 10000000,
                'belanja_modal_aset_realisasi' => 0,
                'custom_variables' => [
                    'nama_pengawas' => 'Drs. Wahyu Pratama',
                ],
            ])
            ->assertOk();
        $lph = Lph::firstOrFail();

        $lphTpl = $this->storeTemplateRecord('lph', [
            'LPH ${semester_text} ${tahun_anggaran} | Pengawas: ${nama_pengawas}',
            'Total Realisasi: ${total_pengeluaran_realisasi_rupiah}',
        ], itemColumns: ['${item_no}', '${item_kode_rekening}', '${item_nama_rekening}', '${item_realisasi_rupiah}']);

        $lphResp = $this->actingAs($this->bendahara)
            ->get(route('laporan.lph.custom.docx', [$lph->id, $lphTpl->id]));
        $lphResp->assertOk();
        $lphPath = $lphResp->getFile()->getPathname();
        $this->tempFilesToClean[] = $lphPath;
        $lphText = strip_tags($this->readDocumentXml($lphPath));

        $this->assertDoesNotMatchRegularExpression('/\$\{[^}]+\}/', $lphText);
        $this->assertStringContainsString('Semester I (Ganjil)', $lphText);
        $this->assertStringContainsString('Drs. Wahyu Pratama', $lphText);
        $this->assertStringContainsString('5.1.02.01.01.0024', $lphText);
        $this->assertStringContainsString('Belanja Alat/Bahan ATK', $lphText);
        $this->assertStringContainsString('Rp 3.500.000', $lphText);

        // Cross-type isolation: template SPTJ tidak bisa dipakai pada endpoint SPMTH -> 404
        $this->actingAs($this->bendahara)
            ->getJson(route('laporan.spmth.custom.docx', [$spmth->id, $sptjTpl->id]))
            ->assertNotFound();
    }

    public function test_laporan_custom_template_works_on_kinerja_variant(): void
    {
        $kinerjaPenganggaran = KinerjaPenganggaran::create([
            'pagu_anggaran' => 45000000,
            'tahun_anggaran' => 2026,
            'kepala_sekolah' => 'Drs. Hendra Kusuma',
            'sk_kepala_sekolah' => 'SK-KS-K1',
            'bendahara' => 'Rina Kartika, S.Pd',
            'sk_bendahara' => 'SK-BD-K1',
            'komite' => 'H. Agus Salim',
            'nip_kepala_sekolah' => '196905101995121001',
            'nip_bendahara' => '198608142010012008',
            'tanggal_sk_kepala_sekolah' => '2026-01-03',
            'tanggal_sk_bendahara' => '2026-01-03',
            'sekolah_id' => $this->sekolah->id,
        ]);

        $this->actingAs($this->bendahara)
            ->postJson(route('kinerja-api.spmth.store'), [
                'kinerja_penganggaran_id' => $kinerjaPenganggaran->id,
                'nomor_surat' => 'KIN/001/SPMTH/2026',
                'tanggal_spmth' => '2026-06-30',
                'tahap' => '1',
                'realisasi_lalu' => 0,
                'realisasi_ini' => 20000000,
                'sisa' => 25000000,
                'custom_variables' => [
                    'kode_dinas' => 'DISDIK-KINERJA',
                ],
            ])
            ->assertOk();

        $kSpmth = KinerjaSpmth::firstOrFail();
        $tpl = $this->storeTemplateRecord('spmth', [
            'Sumber: ${sumber_dana} | No: ${nomor_surat} | Kode: ${kode_dinas} | Pagu: ${pagu_rupiah}',
        ]);

        $resp = $this->actingAs($this->bendahara)
            ->get(route('kinerja-laporan.spmth.custom.docx', [$kSpmth->id, $tpl->id]));
        $resp->assertOk();
        $outPath = $resp->getFile()->getPathname();
        $this->tempFilesToClean[] = $outPath;
        $plain = strip_tags($this->readDocumentXml($outPath));

        $this->assertDoesNotMatchRegularExpression('/\$\{[^}]+\}/', $plain);
        $this->assertStringContainsString('BOSP Kinerja', $plain);
        $this->assertStringContainsString('KIN/001/SPMTH/2026', $plain);
        $this->assertStringContainsString('DISDIK-KINERJA', $plain);
        $this->assertStringContainsString('Rp 45.000.000', $plain);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * @param  array<int, string>  $lines
     * @param  array<int, string>  $itemColumns
     */
    protected function createDocxFile(array $lines, array $itemColumns = []): string
    {
        $phpWord = new PhpWord;
        $section = $phpWord->addSection();
        foreach ($lines as $line) {
            $section->addText($line);
        }
        if ($itemColumns !== []) {
            $table = $section->addTable();
            $table->addRow();
            foreach ($itemColumns as $idx => $_col) {
                $table->addCell(1500)->addText('Col '.($idx + 1));
            }
            $table->addRow();
            foreach ($itemColumns as $colTag) {
                $table->addCell(1500)->addText($colTag);
            }
        }

        $baseTmp = tempnam(sys_get_temp_dir(), 'lap_tpl_');
        if ($baseTmp !== false && is_file($baseTmp)) {
            @unlink($baseTmp);
        }
        $path = ($baseTmp ?: sys_get_temp_dir().DIRECTORY_SEPARATOR.'lap_tpl_'.uniqid('', true)).'.docx';
        $phpWord->save($path, 'Word2007');
        $this->tempFilesToClean[] = $path;

        return $path;
    }

    /**
     * @param  array<int, string>  $lines
     * @param  array<int, string>  $itemColumns
     */
    protected function storeTemplateRecord(string $type, array $lines, array $itemColumns = []): SpjTemplate
    {
        $srcPath = $this->createDocxFile($lines, $itemColumns);
        $storedRel = SpjTemplate::storageDirectoryForType($type).'/'.uniqid('tpl_').'.docx';
        Storage::disk('local')->put($storedRel, file_get_contents($srcPath));

        return SpjTemplate::create([
            'document_type' => $type,
            'nama' => 'Template Uji '.strtoupper($type),
            'file_path' => $storedRel,
            'original_filename' => "{$type}_uji.docx",
            'file_size' => filesize($srcPath) ?: 0,
            'detected_variables' => [],
            'has_item_table' => $itemColumns !== [],
            'created_by' => $this->bendahara->id,
        ]);
    }

    protected function makeUploadedDocx(string $path, string $originalName): UploadedFile
    {
        return new UploadedFile(
            $path,
            $originalName,
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            null,
            true
        );
    }

    protected function readDocumentXml(string $docxPath): string
    {
        $zip = new \ZipArchive;
        $this->assertTrue($zip->open($docxPath) === true);
        $xml = $zip->getFromName('word/document.xml');
        $zip->close();
        $this->assertIsString($xml);

        return $xml;
    }
}
