<?php

namespace Tests\Feature;

use App\Models\Bast;
use App\Models\BukuKasUmum;
use App\Models\BukuKasUmumUraianDetail;
use App\Models\KinerjaBast;
use App\Models\KinerjaBukuKasUmum;
use App\Models\KinerjaBukuKasUmumUraianDetail;
use App\Models\KinerjaPenerimaanDana;
use App\Models\KinerjaPenganggaran;
use App\Models\KinerjaSuratPesanan;
use App\Models\KinerjaTandaTerima;
use App\Models\KodeKegiatan;
use App\Models\PenerimaanDana;
use App\Models\Penganggaran;
use App\Models\RekeningBelanja;
use App\Models\SekolahProfile;
use App\Models\SpjTemplate;
use App\Models\SuratPesanan;
use App\Models\TandaTerima;
use App\Models\User;
use App\Services\SkSuratService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpWord\PhpWord;
use Tests\TestCase;

class SpjCustomTemplateTest extends TestCase
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
            'username' => 'bendahara_spj',
            'role' => 'bendahara',
        ]);

        $this->kepsek = User::factory()->create([
            'username' => 'kepsek_spj',
            'role' => 'kepala_sekolah',
        ]);

        $this->sekolah = SekolahProfile::create([
            'nama_sekolah' => 'SMPN 2 Nusantara',
            'npsn' => config('app.npsn_code') ?: '20254321',
            'status_sekolah' => 'Negeri',
            'jenjang_sekolah' => 'SMP',
            'kelurahan_desa' => 'Mekarjaya',
            'kecamatan' => 'Coblong',
            'kabupaten_kota' => 'Kota Bandung',
            'provinsi' => 'Jawa Barat',
            'alamat' => 'Jl. Merdeka No. 25',
            'kop_border' => 'double',
        ]);

        $this->penganggaran = Penganggaran::create([
            'pagu_anggaran' => 200000000,
            'tahun_anggaran' => 2026,
            'kepala_sekolah' => 'Drs. Hendra Kusuma',
            'sk_kepala_sekolah' => 'SK-KS-02',
            'bendahara' => 'Rina Kartika, S.Pd',
            'sk_bendahara' => 'SK-BD-02',
            'komite' => 'H. Agus Salim',
            'nip_kepala_sekolah' => '196905101995121001',
            'nip_bendahara' => '198608142010012008',
            'tanggal_sk_kepala_sekolah' => '2026-01-03',
            'tanggal_sk_bendahara' => '2026-01-03',
            'sekolah_id' => $this->sekolah->id,
        ]);

        $this->kodeKegiatan = KodeKegiatan::create([
            'kode' => '07.12.01',
            'program' => 'Pengembangan Standar Pembiayaan',
            'sub_program' => 'Pembayaran Honor',
            'uraian' => 'Pembayaran Honor Guru Honorer',
        ]);

        $this->rekeningBelanja = RekeningBelanja::create([
            'kode_rekening' => '5.1.02.02.01.0013',
            'rincian_objek' => 'Belanja Jasa Tenaga Pendidikan',
            'kategori' => 'Operasional',
        ]);

        $this->penerimaanDana = PenerimaanDana::create([
            'penganggaran_id' => $this->penganggaran->id,
            'sumber_dana' => 'BOSP Reguler Tahap 1',
            'jumlah_dana' => 100000000,
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

    public function test_crud_and_type_isolation_across_tanda_terima_bast_and_surat_pesanan(): void
    {
        $bastDocx = $this->createDocxFile([
            'Nomor: ${nomor_bast}',
            'Tanggal: ${tanggal_bast_lengkap}',
            'Pihak I: ${pihak_pertama_nama} | ${tag_tidak_dikenal}',
        ], itemColumns: ['${item_no}', '${item_nama}', '${item_kondisi}', '${item_subtotal_rupiah}']);

        $storeResp = $this->actingAs($this->bendahara)
            ->post(route('api.spj-templates.store', ['type' => 'bast']), [
                'nama' => 'BAST Dinas Pendidikan',
                'deskripsi' => 'Format resmi kabupaten',
                'file' => $this->makeUploadedDocx($bastDocx, 'bast_dinas.docx'),
            ]);

        $storeResp->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.document_type', 'bast')
            ->assertJsonPath('data.has_item_table', true);

        $bastTemplateId = (int) $storeResp->json('data.id');
        $this->assertContains('nomor_bast', $storeResp->json('data.detected_variables.recognized'));
        $this->assertContains('tanggal_bast_lengkap', $storeResp->json('data.detected_variables.recognized'));
        $this->assertContains('item_kondisi', $storeResp->json('data.detected_variables.item_table_vars'));
        $this->assertContains('tag_tidak_dikenal', $storeResp->json('data.detected_variables.unrecognized'));

        // Daftar BAST menampilkan 1 template, sedangkan Surat Pesanan & Tanda Terima menampilkan 0 (isolasi ketat)
        $this->actingAs($this->bendahara)
            ->getJson(route('api.spj-templates.index', ['type' => 'bast']))
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->actingAs($this->bendahara)
            ->getJson(route('api.spj-templates.index', ['type' => 'surat_pesanan']))
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->actingAs($this->bendahara)
            ->getJson(route('api.spj-templates.index', ['type' => 'tanda_terima']))
            ->assertOk()
            ->assertJsonCount(0, 'data');

        // Akses lintas jenis dokumen (mengedit/hapus/unduh sumber template BAST lewat endpoint surat_pesanan) -> 404
        $this->actingAs($this->bendahara)
            ->postJson(route('api.spj-templates.update', ['type' => 'surat_pesanan', 'template' => $bastTemplateId]), [
                'nama' => 'Lintas Modul',
            ])
            ->assertNotFound();

        $this->actingAs($this->bendahara)
            ->deleteJson(route('api.spj-templates.destroy', ['type' => 'tanda_terima', 'template' => $bastTemplateId]))
            ->assertNotFound();

        $this->actingAs($this->bendahara)
            ->getJson(route('api.spj-templates.download', ['type' => 'surat_pesanan', 'template' => $bastTemplateId]))
            ->assertNotFound();

        // Update & ganti file di modul yang benar -> 200 & file lama terhapus
        $tpl = SpjTemplate::findOrFail($bastTemplateId);
        $oldPath = $tpl->file_path;
        Storage::disk('local')->assertExists($oldPath);

        $newBastDocx = $this->createDocxFile(['Ringkas: ${nomor_bast} ${jumlah_rupiah}']);
        $this->actingAs($this->bendahara)
            ->post(route('api.spj-templates.update', ['type' => 'bast', 'template' => $bastTemplateId]), [
                'nama' => 'BAST Ringkas V2',
                'deskripsi' => 'Tanpa tabel rincian',
                'file' => $this->makeUploadedDocx($newBastDocx, 'bast_v2.docx'),
            ])
            ->assertOk()
            ->assertJsonPath('data.nama', 'BAST Ringkas V2')
            ->assertJsonPath('data.has_item_table', false);

        $tpl->refresh();
        Storage::disk('local')->assertMissing($oldPath);
        Storage::disk('local')->assertExists($tpl->file_path);

        // Unduh sumber asli
        $srcResp = $this->actingAs($this->bendahara)
            ->get(route('api.spj-templates.download', ['type' => 'bast', 'template' => $bastTemplateId]));
        $srcResp->assertOk();

        // Hapus template
        $newPath = $tpl->file_path;
        $this->actingAs($this->bendahara)
            ->deleteJson(route('api.spj-templates.destroy', ['type' => 'bast', 'template' => $bastTemplateId]))
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('spj_templates', ['id' => $bastTemplateId]);
        Storage::disk('local')->assertMissing($newPath);
    }

    public function test_upload_security_rejects_macros_and_kepala_sekolah_is_read_only(): void
    {
        // Tolak .docm
        $this->actingAs($this->bendahara)
            ->post(route('api.spj-templates.store', ['type' => 'tanda_terima']), [
                'nama' => 'Macro File',
                'file' => UploadedFile::fake()->create('bad.docm', 10),
            ])
            ->assertStatus(422);

        // Tolak .docx disamarkan berisi vbaProject.bin
        $macroPath = $this->createDocxFile(['${uraian}']);
        $zip = new \ZipArchive;
        $zip->open($macroPath);
        $zip->addFromString('word/vbaProject.bin', 'FAKE_MACRO');
        $zip->close();

        $this->actingAs($this->bendahara)
            ->post(route('api.spj-templates.store', ['type' => 'surat_pesanan']), [
                'nama' => 'Disguised Macro',
                'file' => $this->makeUploadedDocx($macroPath, 'evil.docx'),
            ])
            ->assertStatus(422);

        // RBAC Kepala Sekolah: boleh baca/sample/download sumber/ekspor dokumen, dilarang store/update/delete
        $tpl = $this->storeTemplateRecord('bast', ['Nomor: ${nomor_bast}']);
        $bkuRo = $this->createBkuWithDetails('BNU-RO', 'Uji Read Only', '2026-03-01', 'Toko RO', items: [
            ['uraian' => 'Barang RO', 'volume' => 1, 'satuan' => 'Unit', 'harga_satuan' => 100000, 'subtotal' => 100000],
        ]);
        $bastRo = Bast::create([
            'sekolah_id' => $this->sekolah->id,
            'penganggaran_id' => $this->penganggaran->id,
            'buku_kas_umum_id' => $bkuRo->id,
            'nomor_bast' => 'RO-BAST-01',
            'tanggal_bast' => '2026-03-01',
        ]);

        $this->actingAs($this->kepsek)
            ->getJson(route('api.spj-templates.index', ['type' => 'bast']))
            ->assertOk();

        $sampleResp = $this->actingAs($this->kepsek)
            ->get(route('api.spj-templates.sample', ['type' => 'bast']));
        $sampleResp->assertOk();
        $this->tempFilesToClean[] = $sampleResp->getFile()->getPathname();

        $this->actingAs($this->kepsek)
            ->get(route('api.spj-templates.download', ['type' => 'bast', 'template' => $tpl->id]))
            ->assertOk();

        $roDocxResp = $this->actingAs($this->kepsek)
            ->get(route('bast.custom.docx', [$bastRo->id, $tpl->id]));
        $roDocxResp->assertOk();
        $this->tempFilesToClean[] = $roDocxResp->getFile()->getPathname();

        $validPath = $this->createDocxFile(['${nomor_bast}']);
        $this->actingAs($this->kepsek)
            ->post(route('api.spj-templates.store', ['type' => 'bast']), [
                'nama' => 'Forbidden',
                'file' => $this->makeUploadedDocx($validPath, 'ro.docx'),
            ])
            ->assertForbidden();

        $this->actingAs($this->kepsek)
            ->post(route('api.spj-templates.update', ['type' => 'bast', 'template' => $tpl->id]), [
                'nama' => 'Forbidden Edit',
            ])
            ->assertForbidden();

        $this->actingAs($this->kepsek)
            ->deleteJson(route('api.spj-templates.destroy', ['type' => 'bast', 'template' => $tpl->id]))
            ->assertForbidden();

        // Granular RBAC per modul: user dengan bast=write, tanda_terima=read, surat_pesanan=none
        $operator = User::factory()->create([
            'username' => 'operator_bast_only',
            'role' => 'operator_custom',
            'custom_permissions' => [
                'modules' => [
                    'bast' => 'write',
                    'tanda_terima' => 'read',
                    'surat_pesanan' => 'none',
                ],
                'abilities' => [],
            ],
        ]);

        $this->actingAs($operator)
            ->post(route('api.spj-templates.store', ['type' => 'bast']), [
                'nama' => 'Allowed BAST',
                'file' => $this->makeUploadedDocx($this->createDocxFile(['${nomor_bast}']), 'ok_bast.docx'),
            ])
            ->assertCreated();

        $this->actingAs($operator)
            ->getJson(route('api.spj-templates.index', ['type' => 'tanda_terima']))
            ->assertOk();

        $this->actingAs($operator)
            ->post(route('api.spj-templates.store', ['type' => 'tanda_terima']), [
                'nama' => 'Denied TT Write',
                'file' => $this->makeUploadedDocx($this->createDocxFile(['${uraian}']), 'no_tt.docx'),
            ])
            ->assertForbidden();

        $this->actingAs($operator)
            ->getJson(route('api.spj-templates.index', ['type' => 'surat_pesanan']))
            ->assertForbidden();
    }

    public function test_download_sample_docx_works_for_all_three_spj_document_types(): void
    {
        $expectedTags = [
            'tanda_terima' => ['${kop_surat}', '${item_penerima}', '${jumlah_diterima_rupiah}', '${kepala_sekolah}'],
            'bast' => ['${kop_surat}', '${nomor_bast}', '${tanggal_bast_lengkap}', '${item_kondisi}', '${pihak_pertama_nama}'],
            'surat_pesanan' => ['${kop_surat}', '${nomor_sp}', '${pihak_kesatu_nip}', '${pihak_kedua_nama_perusahaan}', '${waktu_pengiriman}'],
        ];

        foreach ($expectedTags as $type => $tags) {
            $resp = $this->actingAs($this->bendahara)
                ->get(route('api.spj-templates.sample', ['type' => $type]));
            $resp->assertOk();

            $path = $resp->getFile()->getPathname();
            $this->tempFilesToClean[] = $path;
            $xml = $this->readDocumentXml($path);

            foreach ($tags as $tag) {
                $this->assertStringContainsString($tag, $xml, "Sample {$type} harus memuat tag {$tag}.");
            }
        }
    }

    public function test_generate_single_and_bulk_custom_tanda_terima_docx_with_kop_border_and_filters(): void
    {
        $kopRel = 'test_tt_kop_'.uniqid().'.png';
        $kopFull = storage_path('app/public/'.$kopRel);
        File::ensureDirectoryExists(dirname($kopFull));
        $this->tempFilesToClean[] = $kopFull;
        file_put_contents($kopFull, $this->buildMinimalPngBytes(500, 100));
        $this->sekolah->update(['kop_surat' => $kopRel, 'kop_border' => 'double']);

        $template = $this->storeTemplateRecord('tanda_terima', [
            '${kop_surat}',
            'Sumber: ${sumber_dana} | Bukti: ${no_bukti} | Uraian: ${uraian}',
            'Penerima: ${penerima} | Bruto: ${jumlah_rupiah} | Pajak: ${potongan_pajak} | Bersih: ${jumlah_diterima_rupiah}',
            'Terbilang Bersih: ${terbilang_diterima}',
            'KS: ${kepala_sekolah} | Bendahara: ${bendahara}',
        ], itemColumns: ['${item_no}', '${item_penerima}', '${item_nama}', '${item_subtotal_rupiah}', '${item_pajak_rupiah}', '${item_bersih_rupiah}']);

        $tt1 = $this->createRegulerTandaTerima(
            idTransaksi: 'TT-101',
            uraian: 'Honor Guru Honorer Februari',
            tanggal: '2026-02-15',
            penerima: 'Ahmad Hidayat, S.Pd',
            pajak: 'PPh 21 5%',
            totalPajak: 50000,
            totalPajakDaerah: 20000,
            items: [
                ['uraian' => 'Honor Mengajar Kelas 7', 'volume' => 1, 'satuan' => 'OB', 'harga_satuan' => 600000, 'subtotal' => 600000],
                ['uraian' => 'Honor Mengajar Kelas 8', 'volume' => 1, 'satuan' => 'OB', 'harga_satuan' => 400000, 'subtotal' => 400000],
            ]
        );

        $this->createRegulerTandaTerima(
            idTransaksi: 'TT-102',
            uraian: 'Honor Operator Sekolah April',
            tanggal: '2026-04-20',
            penerima: 'Siti Rahma',
            pajak: '',
            totalPajak: 0,
            items: [
                ['uraian' => 'Honor Operator', 'volume' => 1, 'satuan' => 'OB', 'harga_satuan' => 750000, 'subtotal' => 750000],
            ]
        );

        // Single DOCX
        $singleResp = $this->actingAs($this->bendahara)
            ->get(route('tanda-terima.custom.docx', [$tt1->id, $template->id]));
        $singleResp->assertOk();
        $singlePath = $singleResp->getFile()->getPathname();
        $this->tempFilesToClean[] = $singlePath;

        $xml = $this->readDocumentXml($singlePath);
        $this->assertStringContainsString('TT-101', $xml);
        $this->assertStringContainsString('Ahmad Hidayat, S.Pd', $xml);
        $this->assertStringContainsString('Rp 1.000.000', $xml);
        // Total potongan pajak = PPh 50.000 + PB1 20.000 = 70.000 -> Bersih 930.000 (proporsional 42.000 + 28.000)
        $this->assertStringContainsString('Rp 70.000', $xml);
        $this->assertStringContainsString('Rp 930.000', $xml);
        $this->assertStringContainsString('Rp 42.000', $xml);
        $this->assertStringContainsString('Rp 28.000', $xml);
        $this->assertStringContainsString('Sembilan ratus tiga puluh ribu rupiah', $xml);
        $this->assertStringContainsString('w:val="thickThinSmallGap"', $xml);

        // Download All Custom DOCX tanpa filter -> kedua Tanda Terima masuk + nextPage + 2 garis kop
        $bulkResp = $this->actingAs($this->bendahara)
            ->get(route('tanda-terima.custom.download-all', [$template->id, 'output' => 'docx']));
        $bulkResp->assertOk();
        $bulkPath = $bulkResp->getFile()->getPathname();
        $this->tempFilesToClean[] = $bulkPath;
        $bulkXml = $this->readDocumentXml($bulkPath);

        $this->assertStringContainsString('TT-101', $bulkXml);
        $this->assertStringContainsString('TT-102', $bulkXml);
        $this->assertStringContainsString('w:val="nextPage"', $bulkXml);
        $this->assertSame(2, substr_count($bulkXml, 'w:val="thickThinSmallGap"'));

        // Filter search + rentang tanggal
        $filteredResp = $this->actingAs($this->bendahara)
            ->get(route('tanda-terima.custom.download-all', [
                $template->id,
                'output' => 'docx',
                'search' => 'operator',
                'start_date' => '2026-04-01',
                'end_date' => '2026-04-30',
            ]));
        $filteredResp->assertOk();
        $filteredPath = $filteredResp->getFile()->getPathname();
        $this->tempFilesToClean[] = $filteredPath;
        $filteredXml = $this->readDocumentXml($filteredPath);
        $this->assertStringContainsString('TT-102', $filteredXml);
        $this->assertStringNotContainsString('TT-101', $filteredXml);

        // Filter kosong -> 404 JSON
        $this->actingAs($this->bendahara)
            ->getJson(route('tanda-terima.custom.download-all', [
                $template->id,
                'output' => 'docx',
                'search' => 'tidak-ada-xyz',
            ]))
            ->assertNotFound()
            ->assertJsonPath('success', false);
    }

    public function test_generate_custom_bast_and_surat_pesanan_docx_populates_all_fields_and_blocks_cross_type(): void
    {
        $bku = $this->createBkuWithDetails(
            idTransaksi: 'BNU-SPB-01',
            uraian: 'Pengadaan ATK & Perlengkapan Kelas',
            tanggal: '2026-03-15',
            penerima: 'CV. Sumber Makmur',
            items: [
                ['uraian' => 'Kertas HVS A4', 'volume' => 10, 'satuan' => 'Rim', 'harga_satuan' => 55000, 'subtotal' => 550000, 'kondisi' => 'Baik'],
                ['uraian' => 'Spidol Whiteboard', 'volume' => 20, 'satuan' => 'Pcs', 'harga_satuan' => 10000, 'subtotal' => 200000, 'kondisi' => 'Baru & Baik'],
            ]
        );

        $bast = Bast::create([
            'sekolah_id' => $this->sekolah->id,
            'penganggaran_id' => $this->penganggaran->id,
            'buku_kas_umum_id' => $bku->id,
            'nomor_bast' => '012/BAST/BOSP/2026',
            'tanggal_bast' => '2026-03-15',
            'pihak_pertama_nama' => 'Hendra Wijaya',
            'pihak_pertama_jabatan' => 'Direktur',
            'pihak_pertama_instansi' => 'CV. Sumber Makmur',
            'pihak_pertama_alamat' => 'Jl. Asia Afrika No. 99',
            'pihak_kedua_nama' => 'Drs. Hendra Kusuma',
            'pihak_kedua_jabatan' => 'Kepala Sekolah',
            'pihak_kedua_instansi' => 'SMPN 2 Nusantara',
            'pihak_kedua_alamat' => 'Jl. Merdeka No. 25',
        ]);

        $sp = SuratPesanan::create([
            'sekolah_id' => $this->sekolah->id,
            'penganggaran_id' => $this->penganggaran->id,
            'buku_kas_umum_id' => $bku->id,
            'nomor_sp' => '012/SP/BOSP/2026',
            'tanggal_sp' => '2026-03-10',
            'pihak_kesatu_nama' => 'Drs. Hendra Kusuma',
            'pihak_kesatu_nip' => '196905101995121001',
            'pihak_kesatu_jabatan' => 'Kepala Sekolah',
            'pihak_kesatu_instansi' => 'SMPN 2 Nusantara',
            'pihak_kesatu_alamat' => 'Jl. Merdeka No. 25',
            'pihak_kedua_nama_perusahaan' => 'CV. Sumber Makmur',
            'pihak_kedua_penanggung_jawab' => 'Hendra Wijaya',
            'pihak_kedua_alamat' => 'Jl. Asia Afrika No. 99',
            'pihak_kedua_npwp' => '01.234.567.8-901.000',
            'pihak_kedua_platform' => 'SIPLah Blibli',
            'waktu_pengiriman' => 'Maksimal 5 hari kerja',
            'kondisi_barang' => 'Baru dan bergaransi resmi',
            'ketentuan_pembayaran' => 'Transfer non-tunai setelah BAST',
            'sumber_dana' => 'Dana BOSP Reguler Tahap 1 TA 2026',
        ]);

        $bastTpl = $this->storeTemplateRecord('bast', [
            'No: ${nomor_bast} | Kalimat: ${tanggal_bast_lengkap}',
            'P1: ${pihak_pertama_nama} (${pihak_pertama_instansi}) | P2: ${pihak_kedua_nama}',
            'Total: ${jumlah_rupiah} (${terbilang})',
        ], itemColumns: ['${item_no}', '${item_nama}', '${item_kondisi}', '${item_subtotal_rupiah}']);

        $spTpl = $this->storeTemplateRecord('surat_pesanan', [
            'No SP: ${nomor_sp} | Tgl: ${tanggal_sp} | Platform: ${pihak_kedua_platform}',
            'Pemesan: ${pihak_kesatu_nama} (NIP ${pihak_kesatu_nip})',
            'Penyedia: ${pihak_kedua_nama_perusahaan} | NPWP: ${pihak_kedua_npwp}',
            'Syarat: ${waktu_pengiriman} | ${kondisi_barang} | ${ketentuan_pembayaran} | ${sumber_dana_sp}',
            'Total: ${jumlah_rupiah}',
        ], itemColumns: ['${item_no}', '${item_nama}', '${item_volume}', '${item_subtotal_rupiah}']);

        // Kompilasi BAST
        $bastResp = $this->actingAs($this->bendahara)
            ->get(route('bast.custom.docx', [$bast->id, $bastTpl->id]));
        $bastResp->assertOk();
        $bastPath = $bastResp->getFile()->getPathname();
        $this->tempFilesToClean[] = $bastPath;
        $bastXml = $this->readDocumentXml($bastPath);

        $this->assertStringContainsString('012/BAST/BOSP/2026', $bastXml);
        $this->assertStringContainsString('Minggu tanggal lima belas bulan Maret tahun dua ribu dua puluh enam', $bastXml);
        $this->assertStringContainsString('Hendra Wijaya', $bastXml);
        $this->assertStringContainsString('CV. Sumber Makmur', $bastXml);
        $this->assertStringContainsString('Baru &amp; Baik', $bastXml);
        $this->assertStringContainsString('Rp 750.000', $bastXml);
        $this->assertStringContainsString('Tujuh ratus lima puluh ribu rupiah', $bastXml);

        // Kompilasi Surat Pesanan
        $spResp = $this->actingAs($this->bendahara)
            ->get(route('surat-pesanan.custom.docx', [$sp->id, $spTpl->id]));
        $spResp->assertOk();
        $spPath = $spResp->getFile()->getPathname();
        $this->tempFilesToClean[] = $spPath;
        $spXml = $this->readDocumentXml($spPath);

        $this->assertStringContainsString('012/SP/BOSP/2026', $spXml);
        $this->assertStringContainsString('10 Maret 2026', $spXml);
        $this->assertStringContainsString('SIPLah Blibli', $spXml);
        $this->assertStringContainsString('01.234.567.8-901.000', $spXml);
        $this->assertStringContainsString('Maksimal 5 hari kerja', $spXml);
        $this->assertStringContainsString('Kertas HVS A4', $spXml);
        $this->assertStringContainsString('Spidol Whiteboard', $spXml);

        // Blokir pemakaian template lintas jenis dokumen & ID dokumen hilang -> 404
        $this->actingAs($this->bendahara)
            ->getJson(route('bast.custom.docx', [$bast->id, $spTpl->id]))
            ->assertNotFound();

        $this->actingAs($this->bendahara)
            ->getJson(route('surat-pesanan.custom.docx', [$sp->id, $bastTpl->id]))
            ->assertNotFound();

        $this->actingAs($this->bendahara)
            ->getJson(route('bast.custom.docx', [999999, $bastTpl->id]))
            ->assertNotFound()
            ->assertJsonPath('success', false);
    }

    public function test_custom_templates_work_on_kinerja_variant_and_handle_missing_libreoffice(): void
    {
        $kinerjaPenganggaran = KinerjaPenganggaran::create([
            'pagu_anggaran' => 50000000,
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

        $kinerjaPenerimaan = KinerjaPenerimaanDana::create([
            'kinerja_penganggaran_id' => $kinerjaPenganggaran->id,
            'sumber_dana' => 'BOSP Kinerja',
            'jumlah_dana' => 50000000,
            'tanggal_terima' => '2026-06-01',
        ]);

        $kinerjaBku = KinerjaBukuKasUmum::create([
            'kinerja_penganggaran_id' => $kinerjaPenganggaran->id,
            'kode_kegiatan_id' => $this->kodeKegiatan->id,
            'rekening_belanja_id' => $this->rekeningBelanja->id,
            'id_transaksi' => 'KIN-SPJ-01',
            'tanggal_transaksi' => '2026-07-12',
            'uraian' => 'Pengadaan Perangkat Pelatihan',
            'uraian_opsional' => 'Pengadaan Perangkat Pelatihan',
            'jenis_transaksi' => 'non-tunai',
            'anggaran' => 3000000,
            'dibelanjakan' => 3000000,
            'total_transaksi_kotor' => 3000000,
            'nama_penerima_pembayaran' => 'PT. Edu Tech',
        ]);

        KinerjaBukuKasUmumUraianDetail::create([
            'kinerja_buku_kas_umum_id' => $kinerjaBku->id,
            'kode_kegiatan_id' => $this->kodeKegiatan->id,
            'rekening_belanja_id' => $this->rekeningBelanja->id,
            'uraian' => 'Modul Pelatihan Digital',
            'volume' => 2,
            'satuan' => 'Paket',
            'harga_satuan' => 1500000,
            'jumlah' => 3000000,
        ]);

        $kTt = KinerjaTandaTerima::create([
            'sekolah_id' => $this->sekolah->id,
            'kinerja_penganggaran_id' => $kinerjaPenganggaran->id,
            'kode_kegiatan_id' => $this->kodeKegiatan->id,
            'kode_rekening_id' => $this->rekeningBelanja->id,
            'kinerja_penerimaan_dana_id' => $kinerjaPenerimaan->id,
            'kinerja_buku_kas_umum_id' => $kinerjaBku->id,
        ]);

        $kBast = KinerjaBast::create([
            'sekolah_id' => $this->sekolah->id,
            'kinerja_penganggaran_id' => $kinerjaPenganggaran->id,
            'kinerja_buku_kas_umum_id' => $kinerjaBku->id,
            'nomor_bast' => 'KIN-BAST-01',
            'tanggal_bast' => '2026-07-12',
            'pihak_pertama_nama' => 'PT. Edu Tech',
            'pihak_kedua_nama' => 'Drs. Hendra Kusuma',
        ]);

        $kSp = KinerjaSuratPesanan::create([
            'sekolah_id' => $this->sekolah->id,
            'kinerja_penganggaran_id' => $kinerjaPenganggaran->id,
            'kinerja_buku_kas_umum_id' => $kinerjaBku->id,
            'nomor_sp' => 'KIN-SP-01',
            'tanggal_sp' => '2026-07-10',
            'pihak_kesatu_nama' => 'Drs. Hendra Kusuma',
            'pihak_kedua_nama_perusahaan' => 'PT. Edu Tech',
        ]);

        $ttTpl = $this->storeTemplateRecord('tanda_terima', ['Sumber: ${sumber_dana} | Bukti: ${no_bukti}']);
        $bastTpl = $this->storeTemplateRecord('bast', ['Sumber: ${sumber_dana} | BAST: ${nomor_bast}']);
        $spTpl = $this->storeTemplateRecord('surat_pesanan', ['Sumber: ${sumber_dana} | SP: ${nomor_sp}']);

        $ttResp = $this->actingAs($this->bendahara)->get(route('kinerja-tanda-terima.custom.docx', [$kTt->id, $ttTpl->id]));
        $ttResp->assertOk();
        $ttPath = $ttResp->getFile()->getPathname();
        $this->tempFilesToClean[] = $ttPath;
        $this->assertStringContainsString('BOSP Kinerja', $this->readDocumentXml($ttPath));

        $bastResp = $this->actingAs($this->bendahara)->get(route('kinerja-bast.custom.docx', [$kBast->id, $bastTpl->id]));
        $bastResp->assertOk();
        $bastPath = $bastResp->getFile()->getPathname();
        $this->tempFilesToClean[] = $bastPath;
        $this->assertStringContainsString('BOSP Kinerja', $this->readDocumentXml($bastPath));

        $spResp = $this->actingAs($this->bendahara)->get(route('kinerja-surat-pesanan.custom.docx', [$kSp->id, $spTpl->id]));
        $spResp->assertOk();
        $spPath = $spResp->getFile()->getPathname();
        $this->tempFilesToClean[] = $spPath;
        $this->assertStringContainsString('BOSP Kinerja', $this->readDocumentXml($spPath));

        // Simulasikan LibreOffice tidak tersedia -> 422 ramah pada PDF single & bulk
        $skMock = $this->createPartialMock(SkSuratService::class, ['resolveLibreOfficePath']);
        $skMock->method('resolveLibreOfficePath')->willReturn(null);
        $this->app->instance(SkSuratService::class, $skMock);

        $this->actingAs($this->bendahara)
            ->getJson(route('kinerja-tanda-terima.custom.pdf', [$kTt->id, $ttTpl->id]))
            ->assertStatus(422)
            ->assertJsonPath('success', false);

        $this->actingAs($this->bendahara)
            ->getJson(route('kinerja-tanda-terima.custom.download-all', [$ttTpl->id, 'output' => 'pdf']))
            ->assertStatus(422)
            ->assertJsonPath('success', false);

        $this->actingAs($this->bendahara)
            ->getJson(route('kinerja-bast.custom.pdf', [$kBast->id, $bastTpl->id]))
            ->assertStatus(422)
            ->assertJsonPath('success', false);

        $this->actingAs($this->bendahara)
            ->getJson(route('kinerja-surat-pesanan.custom.pdf', [$kSp->id, $spTpl->id]))
            ->assertStatus(422)
            ->assertJsonPath('success', false);
    }

    public function test_cloned_row_non_item_tags_and_landscape_kop_surat_cap(): void
    {
        $kopRel = 'test_tt_land_kop_'.uniqid().'.png';
        $kopFull = storage_path('app/public/'.$kopRel);
        File::ensureDirectoryExists(dirname($kopFull));
        $this->tempFilesToClean[] = $kopFull;
        // Rasio 5:1 -> pada Landscape Folio (857.6pt), cap 60%/510pt dan max height 99.21pt -> 496.05pt x 99.21pt
        file_put_contents($kopFull, $this->buildMinimalPngBytes(500, 100));
        $this->sekolah->update(['kop_surat' => $kopRel, 'kop_border' => 'double']);

        // Template Folio Landscape (18710 x 12250 twips, margin 779 twips -> usable 857.6pt)
        // Paragraf kop tanpa <w:jc> eksplisit -> wajib otomatis diratakan tengah
        // Tabel mencampur ${item_no}/${item_penerima}/${item_volume} dengan tag non-item_* (${satuan}, ${harga_satuan_rupiah}, ${jumlah_rupiah}, ${potongan_pajak}, ${jumlah_diterima_rupiah}, ${no_bukti})
        $phpWord = new PhpWord;
        $section = $phpWord->addSection([
            'orientation' => 'landscape',
            'pageSizeW' => 18710,
            'pageSizeH' => 12250,
            'marginLeft' => 779,
            'marginRight' => 779,
        ]);
        $section->addText('${kop_surat}');
        $section->addText('${kop_surat:24cm}');

        $table = $section->addTable();
        $table->addRow();
        foreach (['No', 'Nama', 'Vol', 'Satuan', 'Harga', 'Jumlah', 'Pajak', 'Bersih', 'Bukti'] as $hdr) {
            $table->addCell(1500)->addText($hdr);
        }
        $table->addRow();
        foreach ([
            '${item_no}',
            '${item_penerima}',
            '${item_volume}',
            '${satuan}',
            '${harga_satuan_rupiah}',
            '${jumlah_rupiah}',
            '${potongan_pajak}',
            '${jumlah_diterima_rupiah}',
            '${no_bukti}',
        ] as $tag) {
            $table->addCell(1500)->addText($tag);
        }

        $baseTmp = tempnam(sys_get_temp_dir(), 'spj_land_');
        if ($baseTmp !== false && is_file($baseTmp)) {
            @unlink($baseTmp);
        }
        $srcPath = ($baseTmp ?: sys_get_temp_dir().DIRECTORY_SEPARATOR.'spj_land_'.uniqid('', true)).'.docx';
        $phpWord->save($srcPath, 'Word2007');
        $this->tempFilesToClean[] = $srcPath;

        $storedRel = SpjTemplate::storageDirectoryForType('tanda_terima').'/'.uniqid('land_').'.docx';
        Storage::disk('local')->put($storedRel, file_get_contents($srcPath));
        $template = SpjTemplate::create([
            'document_type' => SpjTemplate::TYPE_TANDA_TERIMA,
            'nama' => 'Tanda Terima Landscape Mixed Tags',
            'file_path' => $storedRel,
            'original_filename' => 'tt_landscape.docx',
            'file_size' => filesize($srcPath) ?: 0,
            'detected_variables' => [],
            'has_item_table' => true,
            'created_by' => $this->bendahara->id,
        ]);

        $tt = $this->createRegulerTandaTerima(
            idTransaksi: 'TT-MIX-01',
            uraian: 'Insentif Operator',
            tanggal: '2026-06-30',
            penerima: 'Selpianti',
            pajak: 'PPh 21',
            totalPajak: 50000,
            items: [
                ['uraian' => 'Insentif Bulan Mei', 'volume' => 1, 'satuan' => 'orang / kegiatan', 'harga_satuan' => 600000, 'subtotal' => 600000],
                ['uraian' => 'Insentif Bulan Juni', 'volume' => 1, 'satuan' => 'OB', 'harga_satuan' => 400000, 'subtotal' => 400000],
            ]
        );

        $resp = $this->actingAs($this->bendahara)
            ->get(route('tanda-terima.custom.docx', [$tt->id, $template->id]));
        $resp->assertOk();
        $outPath = $resp->getFile()->getPathname();
        $this->tempFilesToClean[] = $outPath;

        $xml = $this->readDocumentXml($outPath);

        // 1. Tidak ada satupun tag mentah ${...#1} / ${...#2} yang tersisa
        $this->assertDoesNotMatchRegularExpression('/\$\{[^}]+\}/', strip_tags($xml));
        $this->assertStringContainsString('Selpianti', $xml);
        $this->assertStringContainsString('orang / kegiatan', $xml);
        $this->assertStringContainsString('OB', $xml);
        $this->assertStringContainsString('Rp 600.000', $xml);
        $this->assertStringContainsString('Rp 400.000', $xml);
        $this->assertStringContainsString('Rp 30.000', $xml);
        $this->assertStringContainsString('Rp 20.000', $xml);
        $this->assertStringContainsString('Rp 570.000', $xml);
        $this->assertStringContainsString('Rp 380.000', $xml);
        $this->assertStringContainsString('TT-MIX-01', $xml);

        // 2. Pada Landscape, ${kop_surat} polos dibatasi proporsional (496.05pt x 99.21pt, bukan 857.6pt),
        //    sedangkan override manual ${kop_surat:24cm} tetap 24cm x 4.8cm
        preg_match_all('/<v:shape[^>]*style="([^"]+)"/', $xml, $styleMatches);
        $styles = $styleMatches[1] ?? [];
        $this->assertCount(2, $styles);
        $this->assertSame('width:496.05pt;height:99.21pt', $styles[0]);
        $this->assertSame('width:24cm;height:4.8cm', $styles[1]);

        // 3. Paragraf kop landscape otomatis diratakan tengah (<w:jc w:val="center"/>) dan tetap punya garis 2
        $dom = new \DOMDocument;
        $this->assertTrue($dom->loadXML($xml));
        $xp = new \DOMXPath($dom);
        $xp->registerNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main');
        $kopPPr = $xp->query('//w:p[descendant::*[local-name()="imagedata"]][1]/w:pPr')->item(0);
        $this->assertInstanceOf(\DOMElement::class, $kopPPr);
        $this->assertSame(1, $xp->query('./w:jc[@w:val="center"]', $kopPPr)?->length);
        $this->assertSame(1, $xp->query('./w:pBdr/w:bottom[@w:val="thickThinSmallGap"]', $kopPPr)?->length);
    }

    public function test_bast_template_reusing_item_subtotal_in_footer_row_and_body_resolves_grand_total(): void
    {
        $phpWord = new PhpWord;
        $section = $phpWord->addSection();
        $section->addText('BERITA ACARA SERAH TERIMA (BAST) BARANG/JASA');

        $table = $section->addTable();
        $table->addRow();
        foreach (['No', 'Nama Barang', 'Jumlah', 'Satuan', 'Kondisi', 'Harga Satuan (Rp)', 'Total Harga (Rp)'] as $h) {
            $table->addCell(1200)->addText($h);
        }

        // Baris detail item (di-clone menjadi 3 baris)
        $table->addRow();
        foreach (['${item_no}', '${item_nama}', '${item_volume}', '${item_satuan}', '${item_kondisi}', '${item_harga}', '${item_subtotal}'] as $tag) {
            $table->addCell(1200)->addText($tag);
        }

        // Baris footer Total Keseluruhan yang juga memakai ${item_subtotal}
        $table->addRow();
        $table->addCell(7200, ['gridSpan' => 6])->addText('Total Keseluruhan');
        $table->addCell(1200)->addText('${item_subtotal}');

        // Paragraf Ketentuan Tambahan di luar tabel yang juga memakai ${item_subtotal}
        $section->addText('3. Nilai total barang yang diserah terimakan adalah sebesar Rp ${item_subtotal} (${terbilang_title})');

        $baseTmp = tempnam(sys_get_temp_dir(), 'spj_bast_');
        if ($baseTmp !== false && is_file($baseTmp)) {
            @unlink($baseTmp);
        }
        $srcPath = ($baseTmp ?: sys_get_temp_dir().DIRECTORY_SEPARATOR.'spj_bast_'.uniqid('', true)).'.docx';
        $phpWord->save($srcPath, 'Word2007');
        $this->tempFilesToClean[] = $srcPath;

        $storedRel = SpjTemplate::storageDirectoryForType('bast').'/'.uniqid('bast_dinas_').'.docx';
        Storage::disk('local')->put($storedRel, file_get_contents($srcPath));
        $template = SpjTemplate::create([
            'document_type' => SpjTemplate::TYPE_BAST,
            'nama' => 'BAST DINAS Footer Item Subtotal',
            'file_path' => $storedRel,
            'original_filename' => 'BAST_1.docx',
            'file_size' => filesize($srcPath) ?: 0,
            'detected_variables' => [],
            'has_item_table' => true,
            'created_by' => $this->bendahara->id,
        ]);

        $bku = $this->createBkuWithDetails(
            idTransaksi: 'BKU-BUKU-01',
            uraian: 'Lunas bayar belanja modal buku agama',
            tanggal: '2026-06-29',
            penerima: 'Penyedia Buku',
            items: [
                ['uraian' => 'Buku Panduan Guru Pendidikan Agama Islam', 'volume' => 1, 'satuan' => 'exemplar', 'harga_satuan' => 93900, 'subtotal' => 93900, 'kondisi' => 'Baik'],
                ['uraian' => 'Pendidikan Agama Islam dan Budi Pekerti Kelas VIII', 'volume' => 1, 'satuan' => 'exemplar', 'harga_satuan' => 24400, 'subtotal' => 24400, 'kondisi' => 'Baik'],
                ['uraian' => 'Pendidikan Agama Islam dan Budi Pekerti Kelas IX', 'volume' => 1, 'satuan' => 'exemplar', 'harga_satuan' => 111800, 'subtotal' => 111800, 'kondisi' => 'Baik'],
            ]
        );

        $bast = Bast::create([
            'sekolah_id' => $this->sekolah->id,
            'penganggaran_id' => $this->penganggaran->id,
            'buku_kas_umum_id' => $bku->id,
            'nomor_bast' => '015/BAST/BOSP/2026',
            'tanggal_bast' => '2026-06-29',
            'pihak_pertama_nama' => 'CV. Buku Nusantara',
            'pihak_pertama_jabatan' => 'Direktur',
            'pihak_pertama_instansi' => 'CV. Buku Nusantara',
            'pihak_pertama_alamat' => 'Jl. Buku No. 1',
            'pihak_kedua_nama' => 'SMP MUHAMMADIYAH SONI',
            'pihak_kedua_jabatan' => 'Kepala Sekolah',
            'pihak_kedua_instansi' => 'SMP MUHAMMADIYAH SONI',
            'pihak_kedua_alamat' => 'Jl. Santa No. 150',
        ]);

        $resp = $this->actingAs($this->bendahara)
            ->get(route('bast.custom.docx', [$bast->id, $template->id]));
        $resp->assertOk();
        $outPath = $resp->getFile()->getPathname();
        $this->tempFilesToClean[] = $outPath;

        $xml = $this->readDocumentXml($outPath);
        $plainText = strip_tags($xml);

        $this->assertDoesNotMatchRegularExpression('/\$\{[^}]+\}/', $plainText);
        $this->assertStringContainsString('93.900', $plainText);
        $this->assertStringContainsString('24.400', $plainText);
        $this->assertStringContainsString('111.800', $plainText);
        $this->assertStringContainsString('Total Keseluruhan230.100', $plainText);
        $this->assertStringContainsString('sebesar Rp 230.100 (Dua Ratus Tiga Puluh Ribu Seratus Rupiah)', $plainText);
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
        $section = $phpWord->addSection([
            'pageSizeW' => 11905,
            'marginLeft' => 900,
            'marginRight' => 900,
        ]);

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

        $baseTmp = tempnam(sys_get_temp_dir(), 'spj_tpl_');
        if ($baseTmp !== false && is_file($baseTmp)) {
            @unlink($baseTmp);
        }
        $path = ($baseTmp ?: sys_get_temp_dir().DIRECTORY_SEPARATOR.'spj_tpl_'.uniqid('', true)).'.docx';
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
            'nama' => 'Template Uji '.SpjTemplate::labelForType($type),
            'deskripsi' => 'Untuk pengujian',
            'file_path' => $storedRel,
            'original_filename' => "{$type}_uji.docx",
            'file_size' => filesize($srcPath) ?: 0,
            'detected_variables' => [
                'recognized' => [],
                'unrecognized' => [],
                'unclosed' => [],
                'item_table_vars' => [],
                'image_vars' => [],
            ],
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

    /**
     * @param  array<int, array{uraian: string, volume: int|float, satuan: string, harga_satuan: int|float, subtotal: int|float, kondisi?: string}>  $items
     */
    protected function createBkuWithDetails(
        string $idTransaksi,
        string $uraian,
        string $tanggal,
        string $penerima,
        string $pajak = '',
        float $totalPajak = 0,
        array $items = [],
        float $totalPajakDaerah = 0
    ): BukuKasUmum {
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
            'total_pajak_daerah' => $totalPajakDaerah,
        ]);

        foreach ($items as $item) {
            BukuKasUmumUraianDetail::create([
                'buku_kas_umum_id' => $bku->id,
                'kode_kegiatan_id' => $this->kodeKegiatan->id,
                'rekening_belanja_id' => $this->rekeningBelanja->id,
                'uraian' => $item['uraian'],
                'volume' => $item['volume'],
                'satuan' => $item['satuan'],
                'harga_satuan' => $item['harga_satuan'],
                'jumlah' => $item['subtotal'],
                'kondisi' => $item['kondisi'] ?? 'Baik',
            ]);
        }

        return $bku;
    }

    /**
     * @param  array<int, array{uraian: string, volume: int|float, satuan: string, harga_satuan: int|float, subtotal: int|float}>  $items
     */
    protected function createRegulerTandaTerima(
        string $idTransaksi,
        string $uraian,
        string $tanggal,
        string $penerima,
        string $pajak = '',
        float $totalPajak = 0,
        array $items = [],
        float $totalPajakDaerah = 0
    ): TandaTerima {
        $bku = $this->createBkuWithDetails($idTransaksi, $uraian, $tanggal, $penerima, $pajak, $totalPajak, $items, $totalPajakDaerah);

        return TandaTerima::create([
            'sekolah_id' => $this->sekolah->id,
            'penganggaran_id' => $this->penganggaran->id,
            'kode_kegiatan_id' => $this->kodeKegiatan->id,
            'kode_rekening_id' => $this->rekeningBelanja->id,
            'penerimaan_dana_id' => $this->penerimaanDana->id,
            'buku_kas_umum_id' => $bku->id,
        ]);
    }

    protected function buildMinimalPngBytes(int $width, int $height): string
    {
        $chunk = static function (string $type, string $data): string {
            return pack('N', strlen($data)).$type.$data.pack('N', crc32($type.$data));
        };

        $ihdr = pack('NNCCCCC', $width, $height, 8, 2, 0, 0, 0);
        $scanline = "\x00".str_repeat("\xFF\xFF\xFF", $width);
        $raw = str_repeat($scanline, $height);
        $idat = gzcompress($raw, 9) ?: '';

        return "\x89PNG\r\n\x1A\n"
            .$chunk('IHDR', $ihdr)
            .$chunk('IDAT', $idat)
            .$chunk('IEND', '');
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
