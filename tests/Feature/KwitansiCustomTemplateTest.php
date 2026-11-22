<?php

namespace Tests\Feature;

use App\Models\BukuKasUmum;
use App\Models\BukuKasUmumUraianDetail;
use App\Models\KinerjaBukuKasUmum;
use App\Models\KinerjaBukuKasUmumUraianDetail;
use App\Models\KinerjaKwitansi;
use App\Models\KinerjaPenerimaanDana;
use App\Models\KinerjaPenganggaran;
use App\Models\KodeKegiatan;
use App\Models\Kwitansi;
use App\Models\KwitansiTemplate;
use App\Models\PenerimaanDana;
use App\Models\Penganggaran;
use App\Models\RekeningBelanja;
use App\Models\SekolahProfile;
use App\Models\User;
use App\Services\SkSuratService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpWord\PhpWord;
use Tests\TestCase;

class KwitansiCustomTemplateTest extends TestCase
{
    use RefreshDatabase;

    protected User $bendahara;

    protected User $kepsek;

    protected SekolahProfile $sekolah;

    protected Penganggaran $penganggaran;

    protected KodeKegiatan $kodeKegiatan;

    protected RekeningBelanja $rekeningBelanja;

    protected PenerimaanDana $penerimaanDana;

    /** @var array<int, string> */
    protected array $tempFilesToClean = [];

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');

        $this->bendahara = User::factory()->create([
            'username' => 'bendahara_kwitansi',
            'role' => 'bendahara',
        ]);

        $this->kepsek = User::factory()->create([
            'username' => 'kepsek_kwitansi',
            'role' => 'kepala_sekolah',
        ]);

        $this->sekolah = SekolahProfile::create([
            'nama_sekolah' => 'SDN 1 Nusantara',
            'npsn' => config('app.npsn_code') ?: '20212345',
            'status_sekolah' => 'Negeri',
            'jenjang_sekolah' => 'SD',
            'kelurahan_desa' => 'Sukamaju',
            'kecamatan' => 'Cibeunying',
            'kabupaten_kota' => 'Kab. Bandung',
            'provinsi' => 'Jawa Barat',
            'alamat' => 'Jl. Pendidikan No. 10',
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
            'sub_program' => 'Pelaksanaan Administrasi Kegiatan Sekolah',
            'uraian' => 'Pembelian ATK',
        ]);

        $this->rekeningBelanja = RekeningBelanja::create([
            'kode_rekening' => '5.1.02.01.01.0024',
            'rincian_objek' => 'Belanja Alat/Bahan untuk Kegiatan Kantor',
            'kategori' => 'Operasional',
        ]);

        $this->penerimaanDana = PenerimaanDana::create([
            'penganggaran_id' => $this->penganggaran->id,
            'sumber_dana' => 'BOSP Reguler Tahap 1',
            'jumlah_dana' => 75000000,
            'tanggal_terima' => '2026-01-20',
        ]);
    }

    protected function tearDown(): void
    {
        foreach ($this->tempFilesToClean as $file) {
            if (is_file($file)) {
                @unlink($file);
            }
        }
        $this->tempFilesToClean = [];

        parent::tearDown();
    }

    public function test_bendahara_can_upload_list_update_and_delete_custom_template(): void
    {
        $docxPath = $this->createDocxFile([
            'Sekolah: ${nama_sekolah}',
            'Bukti: ${no_bukti} | ${tag_asing}',
            'Unclosed: (${terbilang)',
        ], withItemTable: true);

        $upload = new UploadedFile(
            $docxPath,
            'format_dinas.docx',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            null,
            true
        );

        $storeResp = $this->actingAs($this->bendahara)
            ->post('/api/kwitansi/templates', [
                'nama' => 'Format Dinas Kab. Bandung',
                'deskripsi' => 'Kertas F4 dengan tabel rincian',
                'file' => $upload,
            ]);

        $storeResp->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.nama', 'Format Dinas Kab. Bandung')
            ->assertJsonPath('data.has_item_table', true);

        $templateId = $storeResp->json('data.id');
        $recognized = $storeResp->json('data.detected_variables.recognized');
        $unrecognized = $storeResp->json('data.detected_variables.unrecognized');
        $unclosed = $storeResp->json('data.detected_variables.unclosed');

        $this->assertContains('nama_sekolah', $recognized);
        $this->assertContains('no_bukti', $recognized);
        $this->assertContains('item_nama', $recognized);
        $this->assertContains('tag_asing', $unrecognized);
        $this->assertContains('terbilang', $unclosed);

        $template = KwitansiTemplate::findOrFail($templateId);
        $oldPath = $template->file_path;
        Storage::disk('local')->assertExists($oldPath);

        // Index returns template + variable catalog
        $indexResp = $this->actingAs($this->bendahara)->getJson(route('api.kwitansi.templates.index'));
        $indexResp->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(1, 'data');
        $this->assertNotEmpty($indexResp->json('variable_catalog'));

        // Update metadata + replace .docx
        $newDocxPath = $this->createDocxFile(['Hanya teks: ${uraian} ${jumlah_rupiah}'], withItemTable: false);
        $newUpload = new UploadedFile(
            $newDocxPath,
            'format_v2.docx',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            null,
            true
        );

        $updateResp = $this->actingAs($this->bendahara)
            ->post(route('api.kwitansi.templates.update', $templateId), [
                'nama' => 'Format Dinas V2',
                'deskripsi' => 'Ringkas tanpa rincian',
                'file' => $newUpload,
            ]);

        $updateResp->assertOk()
            ->assertJsonPath('data.nama', 'Format Dinas V2')
            ->assertJsonPath('data.has_item_table', false);

        $template->refresh();
        Storage::disk('local')->assertMissing($oldPath);
        Storage::disk('local')->assertExists($template->file_path);

        // Delete removes DB record and physical file
        $newStoredPath = $template->file_path;
        $deleteResp = $this->actingAs($this->bendahara)
            ->deleteJson(route('api.kwitansi.templates.destroy', $templateId));

        $deleteResp->assertOk()->assertJsonPath('success', true);
        $this->assertDatabaseMissing('kwitansi_templates', ['id' => $templateId]);
        Storage::disk('local')->assertMissing($newStoredPath);
    }

    public function test_upload_rejects_non_docx_and_invalid_zip_structure(): void
    {
        // Reject .docm macro file
        $docmFile = UploadedFile::fake()->create('macro.docm', 10);
        $this->actingAs($this->bendahara)
            ->post('/api/kwitansi/templates', [
                'nama' => 'Macro File',
                'file' => $docmFile,
            ])
            ->assertStatus(422);

        // Reject fake .docx ZIP without word/document.xml
        $fakeZipPath = tempnam(sys_get_temp_dir(), 'fake_docx_');
        $this->tempFilesToClean[] = $fakeZipPath;
        $zip = new \ZipArchive;
        $zip->open($fakeZipPath, \ZipArchive::CREATE | \ZipArchive::OVERWRITE);
        $zip->addFromString('hello.txt', 'not a docx');
        $zip->close();

        $fakeDocx = new UploadedFile(
            $fakeZipPath,
            'palsu.docx',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            null,
            true
        );

        $this->actingAs($this->bendahara)
            ->post('/api/kwitansi/templates', [
                'nama' => 'ZIP Palsu',
                'file' => $fakeDocx,
            ])
            ->assertStatus(422);

        // Reject renamed .docm containing word/vbaProject.bin macro payload
        $macroDocxPath = $this->createDocxFile(['Macro test ${no_bukti}']);
        $macroZip = new \ZipArchive;
        $macroZip->open($macroDocxPath);
        $macroZip->addFromString('word/vbaProject.bin', 'FAKE_VBA_BINARY');
        $macroZip->close();

        $renamedMacro = new UploadedFile(
            $macroDocxPath,
            'disguised_macro.docx',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            null,
            true
        );

        $this->actingAs($this->bendahara)
            ->post('/api/kwitansi/templates', [
                'nama' => 'Disguised Macro',
                'file' => $renamedMacro,
            ])
            ->assertStatus(422);
    }

    public function test_download_sample_returns_valid_starter_docx(): void
    {
        $response = $this->actingAs($this->bendahara)
            ->get(route('api.kwitansi.templates.sample'));

        $response->assertOk();
        $downloadedPath = $response->getFile()->getPathname();
        $this->tempFilesToClean[] = $downloadedPath;

        $xml = $this->readDocumentXml($downloadedPath);
        $this->assertStringContainsString('${no_bukti}', $xml);
        $this->assertStringContainsString('${item_nama}', $xml);
        $this->assertStringContainsString('${kepala_sekolah}', $xml);
    }

    public function test_generate_single_custom_docx_populates_text_table_and_images(): void
    {
        // Buat 1x1 PNG valid di storage/app/public/test_logo_kw.png untuk logo_sekolah
        $publicLogoRel = 'test_logo_kw_'.uniqid().'.png';
        $publicLogoFull = storage_path('app/public/'.$publicLogoRel);
        File::ensureDirectoryExists(dirname($publicLogoFull));
        file_put_contents(
            $publicLogoFull,
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==')
        );
        $this->tempFilesToClean[] = $publicLogoFull;

        $this->sekolah->update([
            'alamat' => "Jl. Pendidikan No. 10\nGedung Utama",
            'logo_sekolah' => $publicLogoRel,
            'kop_surat' => null, // sengaja kosong agar diverifikasi bersih jadi ''
        ]);

        $template = $this->storeTemplateRecord([
            '${kop_surat}',
            'Logo: ${logo_sekolah}',
            'Sekolah: ${nama_sekolah} | Alamat: ${alamat_sekolah} | Sumber: ${sumber_dana}',
            'No: ${no_bukti} | Uraian: ${uraian}',
            'Jumlah: ${jumlah_rupiah} (${terbilang})',
            'Pajak PPn: ${ppn} | Bersih: ${jumlah_bersih_rupiah}',
            'KS: ${kepala_sekolah} | Bendahara: ${bendahara} | Penerima: ${penerima}',
        ], withItemTable: true);

        $kwitansi = $this->createRegulerKwitansi(
            idTransaksi: 'BNU-001',
            uraian: "Belanja ATK & Fotokopi\nTahap 1",
            tanggal: '2026-03-15',
            penerima: 'Toko Sinar & Jaya',
            pajak: 'PPN 11%',
            totalPajak: 110000,
            items: [
                ['uraian' => 'Kertas HVS A4', 'volume' => 10, 'satuan' => 'Rim', 'harga_satuan' => 55000, 'subtotal' => 550000],
                ['uraian' => 'Tinta Printer & Refill', 'volume' => 3, 'satuan' => 'Botol', 'harga_satuan' => 150000, 'subtotal' => 450000],
            ]
        );

        $response = $this->actingAs($this->bendahara)
            ->get(route('kwitansi.custom.docx', [$kwitansi->id, $template->id]));

        $response->assertOk();
        $compiledPath = $response->getFile()->getPathname();
        $this->tempFilesToClean[] = $compiledPath;

        $xml = $this->readDocumentXml($compiledPath);
        $this->assertStringContainsString('SDN 1 Nusantara', $xml);
        $this->assertStringContainsString('Gedung Utama', $xml);
        $this->assertStringContainsString('<w:br/>', $xml);
        $this->assertStringContainsString('BOSP Reguler', $xml);
        $this->assertStringContainsString('BNU-001', $xml);
        $this->assertStringContainsString('Belanja ATK &amp; Fotokopi', $xml);
        $this->assertStringContainsString('Rp 1.000.000', $xml);
        $this->assertStringContainsString('Satu juta rupiah', $xml);
        $this->assertStringContainsString('Rp 110.000', $xml);
        $this->assertStringContainsString('Rp 890.000', $xml);
        $this->assertStringContainsString('Dra. Siti Aminah', $xml);
        $this->assertStringContainsString('Budi Santoso, S.Pd', $xml);
        $this->assertStringContainsString('Toko Sinar &amp; Jaya', $xml);
        // cloneRow items
        $this->assertStringContainsString('Kertas HVS A4', $xml);
        $this->assertStringContainsString('Tinta Printer &amp; Refill', $xml);
        $this->assertStringContainsString('Rp 550.000', $xml);
        $this->assertStringContainsString('Rp 450.000', $xml);
        // kop_surat kosong dibersihkan, bukan teks mentah
        $this->assertStringNotContainsString('${kop_surat}', $xml);
        $this->assertStringNotContainsString('${logo_sekolah}', $xml);

        // Verifikasi gambar logo_sekolah benar-benar tertanam di arsip word/media/
        $zip = new \ZipArchive;
        $this->assertTrue($zip->open($compiledPath) === true);
        $hasMedia = false;
        for ($i = 0; $i < $zip->numFiles; $i++) {
            if (str_starts_with((string) $zip->getNameIndex($i), 'word/media/')) {
                $hasMedia = true;
                break;
            }
        }
        $zip->close();
        $this->assertTrue($hasMedia, 'Logo sekolah harus tertanam di word/media/.');
    }

    public function test_generate_single_docx_falls_back_to_one_row_when_uraian_details_empty_and_returns_404_for_missing_kwitansi(): void
    {
        $template = $this->storeTemplateRecord([
            'Bukti: ${no_bukti} | Total: ${jumlah_rupiah}',
        ], withItemTable: true);

        $bkuAnchor = BukuKasUmum::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_kegiatan_id' => $this->kodeKegiatan->id,
            'rekening_belanja_id' => $this->rekeningBelanja->id,
            'id_transaksi' => 'BNU-ANCHOR',
            'tanggal_transaksi' => '2026-03-19',
            'uraian' => 'Anchor',
            'jenis_transaksi' => 'non-tunai',
            'anggaran' => 1000,
            'dibelanjakan' => 1000,
            'total_transaksi_kotor' => 1000,
        ]);

        $anchorDetail = BukuKasUmumUraianDetail::create([
            'buku_kas_umum_id' => $bkuAnchor->id,
            'kode_kegiatan_id' => $this->kodeKegiatan->id,
            'rekening_belanja_id' => $this->rekeningBelanja->id,
            'uraian' => 'Anchor Detail',
            'volume' => 1,
            'satuan' => 'Unit',
            'harga_satuan' => 1000,
            'jumlah' => 1000,
        ]);

        $bkuEmpty = BukuKasUmum::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_kegiatan_id' => $this->kodeKegiatan->id,
            'rekening_belanja_id' => $this->rekeningBelanja->id,
            'id_transaksi' => 'BNU-EMPTY',
            'tanggal_transaksi' => '2026-03-20',
            'uraian' => 'Pembayaran Langganan Internet',
            'uraian_opsional' => 'Pembayaran Langganan Internet',
            'jenis_transaksi' => 'non-tunai',
            'anggaran' => 400000,
            'dibelanjakan' => 400000,
            'total_transaksi_kotor' => 400000,
        ]);

        $kwitansi = Kwitansi::create([
            'sekolah_id' => $this->sekolah->id,
            'penganggaran_id' => $this->penganggaran->id,
            'kode_kegiatan_id' => $this->kodeKegiatan->id,
            'kode_rekening_id' => $this->rekeningBelanja->id,
            'penerimaan_dana_id' => $this->penerimaanDana->id,
            'buku_kas_umum_id' => $bkuEmpty->id,
            'bku_uraian_detail_id' => $anchorDetail->id,
        ]);

        $resp = $this->actingAs($this->bendahara)
            ->get(route('kwitansi.custom.docx', [$kwitansi->id, $template->id]));

        $resp->assertOk();
        $compiledPath = $resp->getFile()->getPathname();
        $this->tempFilesToClean[] = $compiledPath;

        $xml = $this->readDocumentXml($compiledPath);
        $this->assertStringContainsString('Pembayaran Langganan Internet', $xml);
        $this->assertStringContainsString('Rp 400.000', $xml);
        $this->assertStringNotContainsString('${item_nama}', $xml);

        // Missing kwitansi ID returns 404 (not 422)
        $this->actingAs($this->bendahara)
            ->getJson(route('kwitansi.custom.docx', [999999, $template->id]))
            ->assertNotFound()
            ->assertJsonPath('success', false);
    }

    public function test_download_all_custom_merges_multiple_kwitansis_deduplicates_media_and_respects_filters(): void
    {
        // Siapkan logo sekolah agar bulk merge juga menguji deduplikasi gambar
        $publicLogoRel = 'test_logo_bulk_'.uniqid().'.png';
        $publicLogoFull = storage_path('app/public/'.$publicLogoRel);
        File::ensureDirectoryExists(dirname($publicLogoFull));
        file_put_contents(
            $publicLogoFull,
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==')
        );
        $this->tempFilesToClean[] = $publicLogoFull;
        $this->sekolah->update(['logo_sekolah' => $publicLogoRel]);

        $template = $this->storeTemplateRecord([
            '${logo_sekolah}',
            'Bukti: ${no_bukti}',
            'Uraian: ${uraian}',
            'Nominal: ${jumlah_rupiah}',
        ], withItemTable: false);

        $this->createRegulerKwitansi(
            idTransaksi: 'BNU-101',
            uraian: 'Belanja Spidol Papan Tulis',
            tanggal: '2026-02-10',
            penerima: 'Toko Alpha',
            items: [
                ['uraian' => 'Spidol Hitam', 'volume' => 20, 'satuan' => 'Pcs', 'harga_satuan' => 10000, 'subtotal' => 200000],
            ]
        );

        $this->createRegulerKwitansi(
            idTransaksi: 'BNU-102',
            uraian: 'Belanja Buku Perpustakaan',
            tanggal: '2026-04-20',
            penerima: 'Toko Beta',
            items: [
                ['uraian' => 'Buku Cerita', 'volume' => 10, 'satuan' => 'Eksemplar', 'harga_satuan' => 35000, 'subtotal' => 350000],
            ]
        );

        // Tanpa filter -> kedua kwitansi masuk + ada page break + logo dideduplikasi (hanya 1 file di word/media/)
        $allResp = $this->actingAs($this->bendahara)
            ->get(route('kwitansi.custom.download-all', [$template->id, 'output' => 'docx']));

        $allResp->assertOk();
        $mergedPath = $allResp->getFile()->getPathname();
        $this->tempFilesToClean[] = $mergedPath;

        $mergedXml = $this->readDocumentXml($mergedPath);
        $this->assertStringContainsString('BNU-101', $mergedXml);
        $this->assertStringContainsString('BNU-102', $mergedXml);
        $this->assertStringContainsString('Belanja Spidol Papan Tulis', $mergedXml);
        $this->assertStringContainsString('Belanja Buku Perpustakaan', $mergedXml);
        $this->assertStringContainsString('w:type="page"', $mergedXml);

        $dom = new \DOMDocument;
        $this->assertTrue($dom->loadXML($mergedXml));

        $zip = new \ZipArchive;
        $this->assertTrue($zip->open($mergedPath) === true);
        $mediaEntries = [];
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $name = (string) $zip->getNameIndex($i);
            if (str_starts_with($name, 'word/media/')) {
                $mediaEntries[] = $name;
            }
        }
        $zip->close();
        $this->assertCount(1, $mediaEntries, 'Gambar identik pada bulk merge harus dideduplikasi.');

        // Filter search
        $filteredResp = $this->actingAs($this->bendahara)
            ->get(route('kwitansi.custom.download-all', [
                $template->id,
                'output' => 'docx',
                'search' => 'perpustakaan',
            ]));

        $filteredResp->assertOk();
        $filteredPath = $filteredResp->getFile()->getPathname();
        $this->tempFilesToClean[] = $filteredPath;
        $filteredXml = $this->readDocumentXml($filteredPath);
        $this->assertStringContainsString('BNU-102', $filteredXml);
        $this->assertStringNotContainsString('BNU-101', $filteredXml);

        // Filter rentang tanggal & tahun
        $dateResp = $this->actingAs($this->bendahara)
            ->get(route('kwitansi.custom.download-all', [
                $template->id,
                'output' => 'docx',
                'tahun' => '2026',
                'start_date' => '2026-02-01',
                'end_date' => '2026-02-28',
            ]));

        $dateResp->assertOk();
        $datePath = $dateResp->getFile()->getPathname();
        $this->tempFilesToClean[] = $datePath;
        $dateXml = $this->readDocumentXml($datePath);
        $this->assertStringContainsString('BNU-101', $dateXml);
        $this->assertStringNotContainsString('BNU-102', $dateXml);

        // Filter kosong mengembalikan 404 JSON
        $this->actingAs($this->bendahara)
            ->getJson(route('kwitansi.custom.download-all', [
                $template->id,
                'output' => 'docx',
                'search' => 'tidak-akan-ketemu-xyz',
            ]))
            ->assertNotFound()
            ->assertJsonPath('success', false);
    }

    public function test_custom_template_works_on_kinerja_variant_with_dynamic_sumber_dana(): void
    {
        $template = $this->storeTemplateRecord([
            'Sumber: ${sumber_dana} | Bukti: ${no_bukti} | Nominal: ${jumlah_rupiah}',
        ], withItemTable: false);

        $kinerjaPenganggaran = KinerjaPenganggaran::create([
            'pagu_anggaran' => 45000000,
            'tahun_anggaran' => 2026,
            'kepala_sekolah' => 'Dra. Siti Aminah',
            'sk_kepala_sekolah' => 'SK-KS-K1',
            'bendahara' => 'Budi Santoso, S.Pd',
            'sk_bendahara' => 'SK-BD-K1',
            'komite' => 'H. Ahmad Fauzi',
            'nip_kepala_sekolah' => '197001011998022001',
            'nip_bendahara' => '198505122010011005',
            'tanggal_sk_kepala_sekolah' => '2026-01-02',
            'tanggal_sk_bendahara' => '2026-01-02',
            'sekolah_id' => $this->sekolah->id,
        ]);

        $kinerjaPenerimaan = KinerjaPenerimaanDana::create([
            'kinerja_penganggaran_id' => $kinerjaPenganggaran->id,
            'sumber_dana' => 'BOSP Kinerja',
            'jumlah_dana' => 45000000,
            'tanggal_terima' => '2026-06-01',
        ]);

        $kinerjaBku = KinerjaBukuKasUmum::create([
            'kinerja_penganggaran_id' => $kinerjaPenganggaran->id,
            'kode_kegiatan_id' => $this->kodeKegiatan->id,
            'rekening_belanja_id' => $this->rekeningBelanja->id,
            'id_transaksi' => 'KIN-09',
            'tanggal_transaksi' => '2026-07-10',
            'uraian' => 'Pelatihan Guru Penggerak',
            'uraian_opsional' => 'Pelatihan Guru Penggerak',
            'jenis_transaksi' => 'non-tunai',
            'anggaran' => 2500000,
            'dibelanjakan' => 2500000,
            'total_transaksi_kotor' => 2500000,
            'nama_penerima_pembayaran' => 'Narasumber Pendidikan',
        ]);

        $kinerjaDetail = KinerjaBukuKasUmumUraianDetail::create([
            'kinerja_buku_kas_umum_id' => $kinerjaBku->id,
            'kode_kegiatan_id' => $this->kodeKegiatan->id,
            'rekening_belanja_id' => $this->rekeningBelanja->id,
            'uraian' => 'Honor Narasumber',
            'volume' => 1,
            'satuan' => 'Paket',
            'harga_satuan' => 2500000,
            'jumlah' => 2500000,
        ]);

        $kinerjaKwitansi = KinerjaKwitansi::create([
            'sekolah_id' => $this->sekolah->id,
            'kinerja_penganggaran_id' => $kinerjaPenganggaran->id,
            'kode_kegiatan_id' => $this->kodeKegiatan->id,
            'kode_rekening_id' => $this->rekeningBelanja->id,
            'kinerja_penerimaan_dana_id' => $kinerjaPenerimaan->id,
            'kinerja_buku_kas_umum_id' => $kinerjaBku->id,
            'kinerja_bku_uraian_detail_id' => $kinerjaDetail->id,
        ]);

        $resp = $this->actingAs($this->bendahara)
            ->get(route('kinerja-kwitansi.custom.docx', [$kinerjaKwitansi->id, $template->id]));

        $resp->assertOk();
        $kinerjaPath = $resp->getFile()->getPathname();
        $this->tempFilesToClean[] = $kinerjaPath;
        $xml = $this->readDocumentXml($kinerjaPath);
        $this->assertStringContainsString('BOSP Kinerja', $xml);
        $this->assertStringContainsString('KIN-09', $xml);
        $this->assertStringContainsString('Rp 2.500.000', $xml);
    }

    public function test_kepala_sekolah_has_read_only_access_to_custom_templates(): void
    {
        $template = $this->storeTemplateRecord(['Bukti: ${no_bukti}'], withItemTable: false);
        $kwitansi = $this->createRegulerKwitansi(
            idTransaksi: 'BNU-RO1',
            uraian: 'Pembelian Kapur',
            tanggal: '2026-03-01',
            penerima: 'Toko C',
            items: [
                ['uraian' => 'Kapur Tulis', 'volume' => 5, 'satuan' => 'Kotak', 'harga_satuan' => 15000, 'subtotal' => 75000],
            ]
        );

        // Read allowed
        $this->actingAs($this->kepsek)
            ->getJson(route('api.kwitansi.templates.index'))
            ->assertOk();

        $roDocxResp = $this->actingAs($this->kepsek)
            ->get(route('kwitansi.custom.docx', [$kwitansi->id, $template->id]));
        $roDocxResp->assertOk();
        $this->tempFilesToClean[] = $roDocxResp->getFile()->getPathname();

        // Mutations forbidden (403)
        $docxPath = $this->createDocxFile(['Test ${no_bukti}'], withItemTable: false);
        $upload = new UploadedFile(
            $docxPath,
            'ro.docx',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            null,
            true
        );

        $this->actingAs($this->kepsek)
            ->post('/api/kwitansi/templates', ['nama' => 'Forbidden', 'file' => $upload])
            ->assertForbidden();

        $this->actingAs($this->kepsek)
            ->post(route('api.kwitansi.templates.update', $template->id), ['nama' => 'Forbidden Edit'])
            ->assertForbidden();

        $this->actingAs($this->kepsek)
            ->deleteJson(route('api.kwitansi.templates.destroy', $template->id))
            ->assertForbidden();
    }

    public function test_custom_pdf_returns_friendly_422_when_libreoffice_is_unavailable(): void
    {
        $skServiceMock = $this->createPartialMock(SkSuratService::class, ['resolveLibreOfficePath']);
        $skServiceMock->method('resolveLibreOfficePath')->willReturn(null);
        $this->app->instance(SkSuratService::class, $skServiceMock);

        $template = $this->storeTemplateRecord(['Bukti: ${no_bukti}'], withItemTable: false);
        $kwitansi = $this->createRegulerKwitansi(
            idTransaksi: 'BNU-LO1',
            uraian: 'Belanja Map',
            tanggal: '2026-05-05',
            penerima: 'Toko D',
            items: [
                ['uraian' => 'Map Snelhecter', 'volume' => 10, 'satuan' => 'Pcs', 'harga_satuan' => 5000, 'subtotal' => 50000],
            ]
        );

        $this->actingAs($this->bendahara)
            ->getJson(route('kwitansi.custom.pdf', [$kwitansi->id, $template->id]))
            ->assertStatus(422)
            ->assertJsonPath('success', false);

        $this->actingAs($this->bendahara)
            ->getJson(route('kwitansi.custom.download-all', [$template->id, 'output' => 'pdf']))
            ->assertStatus(422)
            ->assertJsonPath('success', false);
    }

    /**
     * @param  array<int, string>  $lines
     */
    protected function createDocxFile(array $lines, bool $withItemTable = false): string
    {
        $phpWord = new PhpWord;
        $section = $phpWord->addSection();

        foreach ($lines as $line) {
            $section->addText($line);
        }

        if ($withItemTable) {
            $table = $section->addTable();
            $table->addRow();
            $table->addCell(1000)->addText('No');
            $table->addCell(3000)->addText('Barang');
            $table->addCell(1500)->addText('Vol');
            $table->addCell(2000)->addText('Subtotal');

            $table->addRow();
            $table->addCell(1000)->addText('${item_no}');
            $table->addCell(3000)->addText('${item_nama}');
            $table->addCell(1500)->addText('${item_volume} ${item_satuan}');
            $table->addCell(2000)->addText('${item_subtotal_rupiah}');
        }

        $baseTmp = tempnam(sys_get_temp_dir(), 'kw_tpl_');
        if ($baseTmp !== false && is_file($baseTmp)) {
            @unlink($baseTmp);
        }
        $path = ($baseTmp ?: sys_get_temp_dir().DIRECTORY_SEPARATOR.'kw_tpl_'.uniqid('', true)).'.docx';
        $phpWord->save($path, 'Word2007');
        $this->tempFilesToClean[] = $path;

        return $path;
    }

    /**
     * @param  array<int, string>  $lines
     */
    protected function storeTemplateRecord(array $lines, bool $withItemTable = false): KwitansiTemplate
    {
        $srcPath = $this->createDocxFile($lines, $withItemTable);
        $storedRel = 'kwitansi_templates/'.uniqid('tpl_').'.docx';
        Storage::disk('local')->put($storedRel, file_get_contents($srcPath));

        return KwitansiTemplate::create([
            'nama' => 'Template Uji',
            'deskripsi' => 'Untuk pengujian',
            'file_path' => $storedRel,
            'original_filename' => 'template_uji.docx',
            'file_size' => filesize($srcPath) ?: 0,
            'detected_variables' => [
                'recognized' => ['no_bukti'],
                'unrecognized' => [],
                'unclosed' => [],
                'item_table_vars' => $withItemTable ? ['item_no', 'item_nama'] : [],
                'image_vars' => [],
            ],
            'has_item_table' => $withItemTable,
            'created_by' => $this->bendahara->id,
        ]);
    }

    /**
     * @param  array<int, array{uraian: string, volume: int|float, satuan: string, harga_satuan: int|float, subtotal: int|float}>  $items
     */
    protected function createRegulerKwitansi(
        string $idTransaksi,
        string $uraian,
        string $tanggal,
        string $penerima,
        string $pajak = '',
        float $totalPajak = 0,
        array $items = []
    ): Kwitansi {
        $total = array_sum(array_column($items, 'subtotal'));

        $bku = BukuKasUmum::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_kegiatan_id' => $this->kodeKegiatan->id,
            'rekening_belanja_id' => $this->rekeningBelanja->id,
            'id_transaksi' => $idTransaksi,
            'tanggal_transaksi' => $tanggal,
            'uraian' => $uraian,
            'uraian_opsional' => $uraian,
            'jenis_transaksi' => 'non-tunai',
            'anggaran' => $total,
            'dibelanjakan' => $total,
            'total_transaksi_kotor' => $total,
            'nama_penerima_pembayaran' => $penerima,
            'pajak' => $pajak !== '' ? $pajak : null,
            'total_pajak' => $totalPajak,
        ]);

        $firstDetailId = null;
        foreach ($items as $item) {
            $detail = BukuKasUmumUraianDetail::create([
                'buku_kas_umum_id' => $bku->id,
                'kode_kegiatan_id' => $this->kodeKegiatan->id,
                'rekening_belanja_id' => $this->rekeningBelanja->id,
                'uraian' => $item['uraian'],
                'volume' => $item['volume'],
                'satuan' => $item['satuan'],
                'harga_satuan' => $item['harga_satuan'],
                'jumlah' => $item['subtotal'],
            ]);
            $firstDetailId ??= $detail->id;
        }

        return Kwitansi::create([
            'sekolah_id' => $this->sekolah->id,
            'penganggaran_id' => $this->penganggaran->id,
            'kode_kegiatan_id' => $this->kodeKegiatan->id,
            'kode_rekening_id' => $this->rekeningBelanja->id,
            'penerimaan_dana_id' => $this->penerimaanDana->id,
            'buku_kas_umum_id' => $bku->id,
            'bku_uraian_detail_id' => $firstDetailId,
        ]);
    }

    protected function readDocumentXml(string $docxPath): string
    {
        $zip = new \ZipArchive;
        $this->assertTrue($zip->open($docxPath) === true, "Gagal membuka DOCX: {$docxPath}");
        $xml = $zip->getFromName('word/document.xml');
        $zip->close();

        $this->assertIsString($xml);

        return $xml;
    }
}
