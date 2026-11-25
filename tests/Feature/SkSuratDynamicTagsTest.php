<?php

namespace Tests\Feature;

use App\Models\BukuKasUmum;
use App\Models\BukuKasUmumUraianDetail;
use App\Models\KinerjaBukuKasUmum;
use App\Models\KinerjaPenganggaran;
use App\Models\KodeKegiatan;
use App\Models\PenerimaanDana;
use App\Models\Penganggaran;
use App\Models\RefPtk;
use App\Models\RekeningBelanja;
use App\Models\SekolahProfile;
use App\Models\SkDokumen;
use App\Models\SkFolder;
use App\Models\SkTemplate;
use App\Models\User;
use App\Services\SkSuratService;
use App\Services\SkSuratTagService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpWord\PhpWord;
use Tests\TestCase;

class SkSuratDynamicTagsTest extends TestCase
{
    use RefreshDatabase;

    protected User $bendahara;

    protected SekolahProfile $sekolah;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');

        $this->bendahara = User::factory()->create([
            'username' => 'bendahara_tags',
            'role' => 'bendahara',
        ]);

        $this->sekolah = SekolahProfile::create([
            'nama_sekolah' => 'SDN 1 Nusantara',
            'npsn' => config('app.npsn_code') ?: '20212345',
            'status_sekolah' => 'Negeri',
            'jenjang_sekolah' => 'SD',
            'alamat' => 'Jl. Pendidikan No. 10',
            'kelurahan_desa' => 'Sukamaju',
            'kecamatan' => 'Cibeunying',
            'kabupaten_kota' => 'Kab. Bandung',
            'provinsi' => 'Jawa Barat',
        ]);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    protected function penganggaranAttributes(array $overrides = []): array
    {
        return array_merge([
            'sekolah_id' => $this->sekolah->id,
            'tahun_anggaran' => 2026,
            'pagu_anggaran' => 150000000,
            'kepala_sekolah' => 'Dra. Siti Aminah',
            'sk_kepala_sekolah' => '821/01/2025',
            'tanggal_sk_kepala_sekolah' => '2025-01-02',
            'nip_kepala_sekolah' => '197001011998022001',
            'bendahara' => 'Budi Santoso, S.Pd',
            'sk_bendahara' => '421/02/2026',
            'tanggal_sk_bendahara' => '2026-01-05',
            'nip_bendahara' => '198505122010011005',
            'komite' => 'H. Ahmad Fauzi',
        ], $overrides);
    }

    public function test_school_autofill_fixes_kepala_sekolah_and_bendahara_columns(): void
    {
        Penganggaran::create($this->penganggaranAttributes());

        $autoFill = app(SkSuratService::class)->getSchoolAutoFillData();

        $this->assertSame('SDN 1 Nusantara', $autoFill['nama_sekolah']);
        $this->assertSame('Dra. Siti Aminah', $autoFill['kepala_sekolah']);
        $this->assertSame('Dra. Siti Aminah', $autoFill['nama_kepala_sekolah']);
        $this->assertSame('Budi Santoso, S.Pd', $autoFill['bendahara']);
        $this->assertSame('Budi Santoso, S.Pd', $autoFill['nama_bendahara']);
        $this->assertSame('H. Ahmad Fauzi', $autoFill['komite']);
        $this->assertSame('2026', $autoFill['tahun_anggaran']);
    }

    public function test_tag_catalog_endpoint_returns_all_categories_with_live_examples(): void
    {
        Penganggaran::create($this->penganggaranAttributes(['pagu_anggaran' => 125000000]));

        $response = $this->actingAs($this->bendahara)->getJson('/sk-surat/tag-catalog');

        $response->assertOk();
        $catalog = $response->json('catalog');
        $groupIds = array_column($catalog, 'id');

        foreach (['sekolah', 'gambar', 'penganggaran', 'bku', 'penerimaan', 'ptk', 'surat', 'tabel_item', 'tabel_ptk', 'tabel_belanja'] as $expectedId) {
            $this->assertContains($expectedId, $groupIds);
        }

        $sekolahGroup = collect($catalog)->firstWhere('id', 'sekolah');
        $namaSekolahItem = collect($sekolahGroup['items'])->firstWhere('key', 'nama_sekolah');
        $this->assertSame('SDN 1 Nusantara', $namaSekolahItem['example']);
    }

    public function test_template_variable_classification_separates_system_table_image_and_manual_tags(): void
    {
        $service = app(SkSuratTagService::class);

        $result = $service->classifyTemplateVariables([
            'kop_surat:16cm',
            'nama_sekolah',
            'nama_kepala_sekolah', // alias -> kepala_sekolah (penganggaran)
            'uraian', // bku
            'item_no', // tabel_item
            'item_nama',
            'ptk_no', // tabel_ptk
            'ptk_nama_row',
            'lokasi_rapat', // manual custom
            'catatan_khusus', // manual custom
        ]);

        $this->assertSame(['kop_surat'], $result['image_vars']);
        $this->assertSame(['lokasi_rapat', 'catatan_khusus'], $result['manual_vars']);
        $this->assertArrayHasKey('item', $result['table_groups']);
        $this->assertArrayHasKey('ptk', $result['table_groups']);
        $this->assertContains('penganggaran', $result['required_sources']);
        $this->assertContains('bku', $result['required_sources']);
        $this->assertContains('ptk_list', $result['required_sources']);

        $sysKeys = array_column($result['system_text'], 'raw');
        $this->assertSame(['nama_sekolah', 'nama_kepala_sekolah', 'uraian'], $sysKeys);
    }

    public function test_data_source_options_and_resolve_work_across_variants_bku_penerimaan_and_ptk(): void
    {
        $pengReguler = Penganggaran::create($this->penganggaranAttributes(['pagu_anggaran' => 100000000]));

        $pengKinerja = KinerjaPenganggaran::create($this->penganggaranAttributes(['pagu_anggaran' => 45000000]));

        $kodeKegiatan = KodeKegiatan::create([
            'tahun' => 2026,
            'kode' => '06.05.01',
            'program' => 'Pengembangan Standar Pengelolaan',
            'sub_program' => 'Administrasi Kegiatan Sekolah',
            'uraian' => 'Pembelian ATK',
            'sumber_dana' => 'reguler',
        ]);

        $rekening = RekeningBelanja::create([
            'tahun' => 2026,
            'kode_rekening' => '5.1.02.01.01.0024',
            'rincian_objek' => 'Belanja Alat/Bahan untuk Kegiatan Kantor',
            'kategori' => 'Operasional',
        ]);

        $bkuReg = BukuKasUmum::create([
            'penganggaran_id' => $pengReguler->id,
            'kode_kegiatan_id' => $kodeKegiatan->id,
            'rekening_belanja_id' => $rekening->id,
            'id_transaksi' => 'BNU01',
            'tanggal_transaksi' => '2026-03-15',
            'jenis_transaksi' => 'non-tunai',
            'uraian' => 'Belanja ATK Kantor',
            'uraian_opsional' => 'Pembelian Kertas & Spidol Maret',
            'nama_toko' => 'CV. Sumber Makmur',
            'alamat_toko' => 'Jl. Merdeka No. 45',
            'npwp' => '01.234.567.8-901.000',
            'anggaran' => 1000000,
            'dibelanjakan' => 1000000,
            'total_transaksi_kotor' => 1000000,
            'pajak' => 'PPn 11%',
            'total_pajak' => 100000,
            'is_bunga_record' => false,
        ]);

        BukuKasUmumUraianDetail::create([
            'buku_kas_umum_id' => $bkuReg->id,
            'kode_kegiatan_id' => $kodeKegiatan->id,
            'rekening_belanja_id' => $rekening->id,
            'uraian' => 'Kertas HVS A4 70gr',
            'volume' => 10,
            'satuan' => 'Rim',
            'harga_satuan' => 60000,
            'jumlah' => 600000,
            'kondisi' => 'Baik',
        ]);

        BukuKasUmumUraianDetail::create([
            'buku_kas_umum_id' => $bkuReg->id,
            'kode_kegiatan_id' => $kodeKegiatan->id,
            'rekening_belanja_id' => $rekening->id,
            'uraian' => 'Spidol Whiteboard',
            'volume' => 40,
            'satuan' => 'Buah',
            'harga_satuan' => 10000,
            'jumlah' => 400000,
            'kondisi' => 'Baik',
        ]);

        KinerjaBukuKasUmum::create([
            'kinerja_penganggaran_id' => $pengKinerja->id,
            'kode_kegiatan_id' => $kodeKegiatan->id,
            'rekening_belanja_id' => $rekening->id,
            'id_transaksi' => 'KIN01',
            'tanggal_transaksi' => '2026-04-10',
            'jenis_transaksi' => 'non-tunai',
            'uraian' => 'Pelatihan Guru Penggerak',
            'anggaran' => 2500000,
            'dibelanjakan' => 2500000,
            'total_transaksi_kotor' => 2500000,
            'is_bunga_record' => false,
        ]);

        $penerimaan = PenerimaanDana::create([
            'penganggaran_id' => $pengReguler->id,
            'sumber_dana' => 'BOSP Reguler Tahap 1',
            'tanggal_terima' => '2026-01-20',
            'jumlah_dana' => 50000000,
            'saldo_awal' => 0,
        ]);

        $ptk1 = RefPtk::create([
            'tahun' => 2026,
            'nuptk' => '1234567890123456',
            'nama' => 'Ahmad Hidayat, S.Pd',
            'jenis_kelamin' => 'L',
            'jenis_ptk_arkas' => RefPtk::JENIS_GURU,
            'masa_kerja_tahun' => 5,
            'masa_kerja_bulan' => 2,
            'pernah_sertifikasi' => true,
            'is_active' => true,
            'sumber' => RefPtk::SUMBER_MANUAL,
        ]);

        // 1. Cek options varian Reguler
        $optReg = $this->actingAs($this->bendahara)
            ->getJson('/sk-surat/data-sources/options?variant=reguler')
            ->assertOk()
            ->json();

        $this->assertSame('reguler', $optReg['active_variant']);
        $this->assertCount(1, $optReg['bku_items']);
        $this->assertSame('BNU01', $optReg['bku_items'][0]['no_bukti']);
        $this->assertCount(1, $optReg['penerimaans']);
        $this->assertCount(1, $optReg['ptks']);

        // 2. Cek options varian Kinerja (isolasi 4 varian BOSP)
        $optKin = $this->actingAs($this->bendahara)
            ->getJson('/sk-surat/data-sources/options?variant=kinerja')
            ->assertOk()
            ->json();

        $this->assertSame('kinerja', $optKin['active_variant']);
        $this->assertCount(1, $optKin['bku_items']);
        $this->assertSame('KIN01', $optKin['bku_items'][0]['no_bukti']);

        // 3. Cek resolve nilai otomatis
        $resolved = $this->actingAs($this->bendahara)
            ->postJson('/sk-surat/data-sources/resolve', [
                'variant' => 'reguler',
                'penganggaran_id' => $pengReguler->id,
                'bku_id' => $bkuReg->id,
                'bku_ids' => [$bkuReg->id],
                'penerimaan_id' => $penerimaan->id,
                'ptk_id' => $ptk1->id,
                'ptk_ids' => [$ptk1->id],
                'tanggal_surat' => '2026-03-20',
                'nomor_surat' => '421/010/BOSP/2026',
                'perihal' => 'Surat Keterangan Belanja',
            ])
            ->assertOk()
            ->json();

        $text = $resolved['text'];
        $this->assertSame('SDN 1 Nusantara', $text['nama_sekolah']);
        $this->assertSame('Dra. Siti Aminah', $text['kepala_sekolah']);
        $this->assertSame('Rp 100.000.000', $text['pagu_anggaran_rupiah']);
        $this->assertSame('BNU01', $text['no_bukti']);
        $this->assertSame('Pembelian Kertas & Spidol Maret', $text['uraian']);
        $this->assertSame('CV. Sumber Makmur', $text['nama_toko']);
        $this->assertSame('06.05.01', $text['kode_kegiatan']);
        $this->assertSame('5.1.02.01.01.0024', $text['kode_rekening']);
        $this->assertSame('Rp 1.000.000', $text['jumlah_rupiah']);
        $this->assertSame('Rp 100.000', $text['ppn']);
        $this->assertSame('Rp 900.000', $text['jumlah_bersih_rupiah']);
        $this->assertSame('Rp 50.000.000', $text['penerimaan_jumlah_rupiah']);
        $this->assertSame('Ahmad Hidayat, S.Pd', $text['ptk_nama']);
        $this->assertSame('1234567890123456', $text['ptk_nuptk']);
        $this->assertSame('20 Maret 2026', $text['tanggal_surat']);
        $this->assertSame('Kab. Bandung, 20 Maret 2026', $text['tempat_tanggal_surat']);
        $this->assertSame('1', $text['belanja_jumlah_transaksi']);
        $this->assertSame('Rp 1.000.000', $text['belanja_total_rupiah']);

        // Verifikasi 3 grup tabel baris dinamis
        $this->assertCount(2, $resolved['table_rows']['item']);
        $this->assertSame('Kertas HVS A4 70gr', $resolved['table_rows']['item'][0]['item_nama']);
        $this->assertSame('Spidol Whiteboard', $resolved['table_rows']['item'][1]['item_nama']);
        $this->assertCount(1, $resolved['table_rows']['ptk']);
        $this->assertSame('Ahmad Hidayat, S.Pd', $resolved['table_rows']['ptk'][0]['ptk_nama_row']);
        $this->assertCount(1, $resolved['table_rows']['belanja']);
        $this->assertSame('BNU01', $resolved['table_rows']['belanja'][0]['belanja_no_bukti']);
    }

    public function test_store_dokumen_snapshots_sumber_data_and_compiles_docx_with_clone_rows_and_manual_tags(): void
    {
        $peng = Penganggaran::create($this->penganggaranAttributes(['pagu_anggaran' => 80000000]));

        $kodeKegiatan = KodeKegiatan::create([
            'tahun' => 2026,
            'kode' => '06.05.01',
            'program' => 'Pengembangan Standar Pengelolaan',
            'sub_program' => 'Administrasi Kegiatan Sekolah',
            'uraian' => 'Pengadaan Peralatan Kelas',
            'sumber_dana' => 'reguler',
        ]);

        $rekening = RekeningBelanja::create([
            'tahun' => 2026,
            'kode_rekening' => '5.1.02.01.01.0024',
            'rincian_objek' => 'Belanja Alat/Bahan Kantor',
            'kategori' => 'Operasional',
        ]);

        $bku = BukuKasUmum::create([
            'penganggaran_id' => $peng->id,
            'kode_kegiatan_id' => $kodeKegiatan->id,
            'rekening_belanja_id' => $rekening->id,
            'id_transaksi' => 'BNU77',
            'tanggal_transaksi' => '2026-05-12',
            'jenis_transaksi' => 'non-tunai',
            'uraian' => 'Pengadaan Peralatan Kelas',
            'nama_toko' => 'Toko Cahaya Ilmu',
            'anggaran' => 750000,
            'dibelanjakan' => 750000,
            'total_transaksi_kotor' => 750000,
            'is_bunga_record' => false,
        ]);

        BukuKasUmumUraianDetail::create([
            'buku_kas_umum_id' => $bku->id,
            'kode_kegiatan_id' => $kodeKegiatan->id,
            'rekening_belanja_id' => $rekening->id,
            'uraian' => 'Papan Tulis Whiteboard',
            'volume' => 2,
            'satuan' => 'Unit',
            'harga_satuan' => 250000,
            'jumlah' => 500000,
        ]);

        BukuKasUmumUraianDetail::create([
            'buku_kas_umum_id' => $bku->id,
            'kode_kegiatan_id' => $kodeKegiatan->id,
            'rekening_belanja_id' => $rekening->id,
            'uraian' => 'Penghapus Papan Tulis',
            'volume' => 10,
            'satuan' => 'Buah',
            'harga_satuan' => 25000,
            'jumlah' => 250000,
        ]);

        $ptk1 = RefPtk::create([
            'tahun' => 2026,
            'nuptk' => '1111222233334444',
            'nama' => 'Siti Rahmawati, S.Pd',
            'jenis_kelamin' => 'P',
            'jenis_ptk_arkas' => RefPtk::JENIS_GURU,
            'is_active' => true,
            'sumber' => RefPtk::SUMBER_MANUAL,
        ]);

        $ptk2 = RefPtk::create([
            'tahun' => 2026,
            'nuptk' => '5555666677778888',
            'nama' => 'Dedi Kurniawan, S.Pd',
            'jenis_kelamin' => 'L',
            'jenis_ptk_arkas' => RefPtk::JENIS_TENDIK,
            'is_active' => true,
            'sumber' => RefPtk::SUMBER_MANUAL,
        ]);

        // Buat file Word (.docx) dengan tag sistem, tag manual, tabel item_*, dan tabel ptk_*
        $phpWord = new PhpWord;
        $section = $phpWord->addSection();
        $section->addText('Sekolah: ${nama_sekolah} | Kepsek: ${kepala_sekolah}');
        $section->addText('Belanja: ${uraian} (${jumlah_rupiah}) di ${nama_toko}');
        $section->addText('Catatan Manual: ${catatan_khusus}');

        $itemTable = $section->addTable();
        $itemTable->addRow();
        $itemTable->addCell(800)->addText('No');
        $itemTable->addCell(3000)->addText('Barang');
        $itemTable->addCell(1500)->addText('Subtotal');
        $itemTable->addRow();
        $itemTable->addCell(800)->addText('${item_no}');
        $itemTable->addCell(3000)->addText('${item_nama}');
        $itemTable->addCell(1500)->addText('${item_subtotal_rupiah}');

        $section->addTextBreak(1);

        $ptkTable = $section->addTable();
        $ptkTable->addRow();
        $ptkTable->addCell(800)->addText('No');
        $ptkTable->addCell(3000)->addText('Nama PTK');
        $ptkTable->addCell(2000)->addText('NUPTK');
        $ptkTable->addRow();
        $ptkTable->addCell(800)->addText('${ptk_no}');
        $ptkTable->addCell(3000)->addText('${ptk_nama_row}');
        $ptkTable->addCell(2000)->addText('${ptk_nuptk_row}');

        $tmpTemplatePath = tempnam(sys_get_temp_dir(), 'sk_dyn_tpl_').'.docx';
        $phpWord->save($tmpTemplatePath, 'Word2007');

        $storedPath = 'sk_surat/templates/dynamic_multi_table.docx';
        Storage::disk('local')->put($storedPath, file_get_contents($tmpTemplatePath));
        @unlink($tmpTemplatePath);

        $folder = SkFolder::create([
            'nama_folder' => 'Folder Pengadaan',
            'created_by' => $this->bendahara->id,
        ]);

        $template = SkTemplate::create([
            'folder_id' => $folder->id,
            'judul' => 'Surat Pengadaan & Tim Penerima',
            'file_path' => $storedPath,
            'file_name_original' => 'dynamic_multi_table.docx',
            'detected_variables' => [
                'nama_sekolah', 'kepala_sekolah', 'uraian', 'jumlah_rupiah', 'nama_toko',
                'catatan_khusus', 'item_no', 'item_nama', 'item_subtotal_rupiah',
                'ptk_no', 'ptk_nama_row', 'ptk_nuptk_row',
            ],
            'created_by' => $this->bendahara->id,
        ]);

        $response = $this->actingAs($this->bendahara)->post("/sk-surat/folder/{$folder->id}/dokumen", [
            'template_id' => $template->id,
            'perihal' => 'Berita Acara Pemeriksaan Peralatan Kelas',
            'nomor_surat' => '421/077/2026',
            'tanggal_surat' => '2026-05-12',
            'data_isian' => [
                'nama_sekolah' => 'SDN 1 Nusantara',
                'kepala_sekolah' => 'Dra. Siti Aminah',
                'uraian' => 'Pengadaan Peralatan Kelas',
                'jumlah_rupiah' => 'Rp 750.000',
                'nama_toko' => 'Toko Cahaya Ilmu',
                'catatan_khusus' => 'Diperiksa dalam kondisi baik di Ruang Guru',
            ],
            'sumber_data' => [
                'variant' => 'reguler',
                'penganggaran_id' => $peng->id,
                'bku_id' => $bku->id,
                'ptk_ids' => [$ptk1->id, $ptk2->id],
            ],
        ]);

        $response->assertSessionHasNoErrors();

        $dokumen = SkDokumen::where('perihal', 'Berita Acara Pemeriksaan Peralatan Kelas')->firstOrFail();
        $this->assertIsArray($dokumen->sumber_data);
        $this->assertCount(2, $dokumen->sumber_data['table_rows']['item']);
        $this->assertCount(2, $dokumen->sumber_data['table_rows']['ptk']);

        $compiledPath = app(SkSuratService::class)->generateDocx($dokumen);
        try {
            $this->assertFileExists($compiledPath);
            $zip = new \ZipArchive;
            $this->assertTrue($zip->open($compiledPath) === true);
            $xml = (string) $zip->getFromName('word/document.xml');
            $zip->close();

            $plain = html_entity_decode(strip_tags($xml), ENT_QUOTES | ENT_XML1, 'UTF-8');

            // Cek teks sistem + tag manual
            $this->assertStringContainsString('SDN 1 Nusantara', $plain);
            $this->assertStringContainsString('Dra. Siti Aminah', $plain);
            $this->assertStringContainsString('Pengadaan Peralatan Kelas', $plain);
            $this->assertStringContainsString('Rp 750.000', $plain);
            $this->assertStringContainsString('Toko Cahaya Ilmu', $plain);
            $this->assertStringContainsString('Diperiksa dalam kondisi baik di Ruang Guru', $plain);

            // Cek kedua baris tabel item BKU yang di-clone
            $this->assertStringContainsString('Papan Tulis Whiteboard', $plain);
            $this->assertStringContainsString('Rp 500.000', $plain);
            $this->assertStringContainsString('Penghapus Papan Tulis', $plain);
            $this->assertStringContainsString('Rp 250.000', $plain);

            // Cek kedua baris tabel PTK yang di-clone
            $this->assertStringContainsString('Siti Rahmawati, S.Pd', $plain);
            $this->assertStringContainsString('1111222233334444', $plain);
            $this->assertStringContainsString('Dedi Kurniawan, S.Pd', $plain);
            $this->assertStringContainsString('5555666677778888', $plain);
        } finally {
            if (is_file($compiledPath)) {
                @unlink($compiledPath);
            }
        }
    }

    public function test_bendahara_can_save_template_tag_mapping_and_enabled_tables_filter_is_respected(): void
    {
        $folder = SkFolder::create([
            'nama_folder' => 'Folder Mapping',
            'created_by' => $this->bendahara->id,
        ]);

        $template = SkTemplate::create([
            'folder_id' => $folder->id,
            'judul' => 'Template Bebas',
            'file_path' => 'sk_surat/templates/bebas.docx',
            'file_name_original' => 'bebas.docx',
            'detected_variables' => ['nominal', 'toko_penyedia', 'catatan_bebas'],
            'created_by' => $this->bendahara->id,
        ]);

        $response = $this->actingAs($this->bendahara)->putJson("/sk-surat/template/{$template->id}/tag-mapping", [
            'text_map' => [
                'nominal' => 'jumlah_rupiah',
                'toko_penyedia' => 'nama_toko',
            ],
            'enabled_tags' => ['nominal', 'toko_penyedia'],
            'enabled_tables' => ['item'],
            'enabled_images' => ['kop_surat'],
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('tag_mappings.text_map.nominal', 'jumlah_rupiah')
            ->assertJsonPath('tag_mappings.enabled_tables.0', 'item');

        $template->refresh();
        $this->assertSame('jumlah_rupiah', $template->tag_mappings['text_map']['nominal']);
        $this->assertSame(['item'], $template->tag_mappings['enabled_tables']);
        $this->assertSame(['kop_surat'], $template->tag_mappings['enabled_images']);

        // Kepala sekolah tidak boleh menyimpan mapping template
        $kepsek = User::factory()->create([
            'username' => 'kepsek_mapping',
            'role' => 'kepala_sekolah',
        ]);
        $this->actingAs($kepsek)
            ->putJson("/sk-surat/template/{$template->id}/tag-mapping", [
                'text_map' => ['nominal' => 'jumlah_angka'],
            ])
            ->assertForbidden();
    }

    public function test_smart_default_penganggaran_prefers_year_with_data_and_auto_defaults_bku_and_volume_alias(): void
    {
        $peng2026 = Penganggaran::create($this->penganggaranAttributes([
            'tahun_anggaran' => 2026,
            'pagu_anggaran' => 120000000,
        ]));

        // Tahun depan (2027) sudah dibuat tetapi belum punya transaksi BKU/penerimaan sama sekali
        Penganggaran::create($this->penganggaranAttributes([
            'tahun_anggaran' => 2027,
            'pagu_anggaran' => 130000000,
        ]));

        $kode = KodeKegiatan::create([
            'tahun' => 2026,
            'kode' => '06.05.01',
            'program' => 'Standar Pengelolaan',
            'sub_program' => 'Administrasi',
            'uraian' => 'Belanja ATK',
            'sumber_dana' => 'reguler',
        ]);

        $rek = RekeningBelanja::create([
            'tahun' => 2026,
            'kode_rekening' => '5.1.02.01.01.0024',
            'rincian_objek' => 'Belanja Alat/Bahan Kantor',
            'kategori' => 'Operasional',
        ]);

        $bku = BukuKasUmum::create([
            'penganggaran_id' => $peng2026->id,
            'kode_kegiatan_id' => $kode->id,
            'rekening_belanja_id' => $rek->id,
            'id_transaksi' => 'BNU-2026-01',
            'tanggal_transaksi' => '2026-06-10',
            'jenis_transaksi' => 'non-tunai',
            'uraian' => 'Pembelian Kertas HVS',
            'nama_toko' => 'Toko Berkah',
            'anggaran' => 600000,
            'dibelanjakan' => 600000,
            'total_transaksi_kotor' => 600000,
            'is_bunga_record' => false,
        ]);

        BukuKasUmumUraianDetail::create([
            'buku_kas_umum_id' => $bku->id,
            'kode_kegiatan_id' => $kode->id,
            'rekening_belanja_id' => $rek->id,
            'uraian' => 'Kertas HVS F4',
            'volume' => 12,
            'satuan' => 'Rim',
            'harga_satuan' => 50000,
            'jumlah' => 600000,
        ]);

        // Options otomatis memilih 2026 (yang memiliki BKU), bukan 2027 yang kosong
        $opts = $this->actingAs($this->bendahara)
            ->getJson('/sk-surat/data-sources/options?variant=reguler')
            ->assertOk()
            ->json();

        $this->assertSame($peng2026->id, $opts['active_penganggaran_id']);
        $this->assertCount(1, $opts['bku_items']);

        // Resolve dengan auto_default=true & required_sources=['bku'] langsung mengisi nilai tanpa bku_id manual
        $resolved = $this->actingAs($this->bendahara)
            ->postJson('/sk-surat/data-sources/resolve', [
                'variant' => 'reguler',
                'auto_default' => true,
                'required_sources' => ['bku'],
            ])
            ->assertOk()
            ->json();

        $this->assertSame($bku->id, $resolved['resolved_context']['bku_id']);
        $this->assertSame('Pembelian Kertas HVS', $resolved['text']['uraian']);
        $this->assertSame('12', $resolved['text']['volume']);
        $this->assertSame('12', $resolved['text']['banyaknya']);
        $this->assertSame('Rim', $resolved['text']['satuan']);
        $this->assertSame('Rp 50.000', $resolved['text']['harga_satuan_rupiah']);
    }
}
