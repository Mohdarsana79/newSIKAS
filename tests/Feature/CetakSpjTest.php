<?php

namespace Tests\Feature;

use App\Config\PermissionCatalog;
use App\Models\BukuKasUmum;
use App\Models\BukuKasUmumUraianDetail;
use App\Models\KodeKegiatan;
use App\Models\Kwitansi;
use App\Models\PenerimaanDana;
use App\Models\Penganggaran;
use App\Models\RekeningBelanja;
use App\Models\Rkas;
use App\Models\RkasPerubahan;
use App\Models\Role;
use App\Models\SekolahProfile;
use App\Models\Sp2b;
use App\Models\SpjExternalAttachment;
use App\Models\SpjPrintPreset;
use App\Models\User;
use App\Support\PdfPaperHelper;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CetakSpjTest extends TestCase
{
    use RefreshDatabase;

    private function createSekolah(): SekolahProfile
    {
        return SekolahProfile::create([
            'nama_sekolah' => 'SDN 1 Cetak SPJ',
            'npsn' => '20203030',
            'status_sekolah' => 'Negeri',
            'jenjang_sekolah' => 'SD',
            'kelurahan_desa' => 'Sukamaju',
            'kecamatan' => 'Cibadak',
            'kabupaten_kota' => 'Kab. Sukabumi',
            'provinsi' => 'Jawa Barat',
            'alamat' => 'Jl. Pendidikan No. 7',
        ]);
    }

    private function createPenganggaran(SekolahProfile $sekolah, int $tahun = 2026): Penganggaran
    {
        return Penganggaran::create([
            'sekolah_id' => $sekolah->id,
            'pagu_anggaran' => 120000000,
            'tahun_anggaran' => $tahun,
            'kepala_sekolah' => 'Drs. Ahmad',
            'nip_kepala_sekolah' => '197001012000011001',
            'sk_kepala_sekolah' => 'SK-01',
            'tanggal_sk_kepala_sekolah' => "{$tahun}-01-02",
            'bendahara' => 'Siti Aminah',
            'nip_bendahara' => '198001012005012001',
            'sk_bendahara' => 'SK-02',
            'tanggal_sk_bendahara' => "{$tahun}-01-02",
            'komite' => 'Budi Santoso',
            'status_persetujuan' => 'disetujui',
            'tanggal_persetujuan' => now(),
        ]);
    }

    public function test_rbac_allows_bendahara_write_kepsek_read_only_and_blocks_unauthorized_role(): void
    {
        $this->withoutVite();

        $bendahara = User::factory()->create(['role' => 'bendahara']);
        $kepsek = User::factory()->create(['role' => 'kepala_sekolah']);

        Role::create([
            'slug' => 'tanpa_cetak_spj',
            'name' => 'Tanpa Cetak SPJ',
            'is_system' => false,
            'permissions' => PermissionCatalog::defaultPermissionsForRole('tanpa_cetak_spj'),
        ]);
        $limited = User::factory()->create(['role' => 'tanpa_cetak_spj']);

        // Read akses lintas 4 varian
        $this->actingAs($bendahara)->get('/cetak-spj')->assertOk();
        $this->actingAs($bendahara)->get('/kinerja/cetak-spj')->assertOk();
        $this->actingAs($bendahara)->get('/silpa/cetak-spj')->assertOk();
        $this->actingAs($bendahara)->get('/kinerja-silpa/cetak-spj')->assertOk();

        $this->actingAs($kepsek)->get('/cetak-spj')->assertOk();
        $this->actingAs($kepsek)->get('/api/cetak-spj/manifest')->assertOk();

        // Kepala sekolah bersifat read-only (mutasi ditolak 403)
        $this->actingAs($kepsek)->postJson('/api/cetak-spj/preset', [
            'tahun_anggaran' => 2026,
            'cover_config' => ['layout' => 'editorial'],
            'bundle_config' => ['include_cover' => true],
        ])->assertForbidden();

        // Role tanpa izin cetak_spj ditolak (403)
        $this->actingAs($limited)->get('/cetak-spj')->assertForbidden();
        $this->actingAs($limited)->get('/api/cetak-spj/manifest')->assertForbidden();
    }

    public function test_manifest_supports_periodes_grouping_modes_and_uses_penganggaran_id_for_kwitansi(): void
    {
        $bendahara = User::factory()->create(['role' => 'bendahara']);
        $sekolah = $this->createSekolah();
        $penganggaran = $this->createPenganggaran($sekolah, 2026);

        $penerimaan1 = PenerimaanDana::create([
            'penganggaran_id' => $penganggaran->id,
            'sumber_dana' => 'Bosp Reguler Tahap 1',
            'tanggal_terima' => '2026-02-10',
            'jumlah_dana' => 60000000,
            'saldo_awal' => 0,
        ]);

        $keg = KodeKegiatan::create([
            'kode' => '01.01.01',
            'program' => 'Pengembangan Standar Isi',
            'sub_program' => 'Kurikulum',
            'uraian' => 'Penyusunan Kurikulum',
        ]);

        $rek = RekeningBelanja::create([
            'kode_rekening' => '5.1.02.01.01.0024',
            'rincian_objek' => 'Belanja ATK',
            'kategori' => 'Belanja Operasi',
        ]);

        $bkuMar = BukuKasUmum::create([
            'penganggaran_id' => $penganggaran->id,
            'kode_kegiatan_id' => $keg->id,
            'rekening_belanja_id' => $rek->id,
            'tanggal_transaksi' => '2026-03-15',
            'jenis_transaksi' => 'tunai',
            'uraian' => 'Pembelian Kertas HVS',
            'total_transaksi_kotor' => 2500000,
            'is_bunga_record' => false,
        ]);

        BukuKasUmum::create([
            'penganggaran_id' => $penganggaran->id,
            'kode_kegiatan_id' => $keg->id,
            'rekening_belanja_id' => $rek->id,
            'tanggal_transaksi' => '2026-09-10',
            'jenis_transaksi' => 'non-tunai',
            'uraian' => 'Pembelian Tinta Printer',
            'total_transaksi_kotor' => 1500000,
            'is_bunga_record' => false,
        ]);

        $detailMar = BukuKasUmumUraianDetail::create([
            'buku_kas_umum_id' => $bkuMar->id,
            'kode_kegiatan_id' => $keg->id,
            'rekening_belanja_id' => $rek->id,
            'uraian' => 'Kertas HVS A4',
            'volume' => 10,
            'satuan' => 'Rim',
            'harga_satuan' => 250000,
            'jumlah' => 2500000,
        ]);

        Kwitansi::create([
            'sekolah_id' => $sekolah->id,
            'penganggaran_id' => $penganggaran->id,
            'kode_kegiatan_id' => $keg->id,
            'kode_rekening_id' => $rek->id,
            'penerimaan_dana_id' => $penerimaan1->id,
            'buku_kas_umum_id' => $bkuMar->id,
            'bku_uraian_detail_id' => $detailMar->id,
        ]);

        Sp2b::create([
            'penganggaran_id' => $penganggaran->id,
            'nomor_sp2b' => 'SP2B-001/2026',
            'tanggal_sp2b' => '2026-06-30',
            'jenis_periode' => 'tahap',
            'tahap' => '1',
            'saldo_awal' => 0,
            'pendapatan' => 60000000,
            'belanja' => 2500000,
            'saldo_akhir' => 57500000,
        ]);

        // 1. Tahap 1 (per_jenis)
        $resT1 = $this->actingAs($bendahara)
            ->getJson('/api/cetak-spj/manifest?tahun=2026&periode_type=tahap_1&grouping_mode=per_jenis')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.meta.periode_type', 'tahap_1')
            ->assertJsonPath('data.ringkasan_keuangan.total_realisasi', 2500000)
            ->assertJsonPath('data.ringkasan_keuangan.jumlah_transaksi', 1);

        $chapters = collect($resT1->json('data.chapters'));
        $bukti = $chapters->firstWhere('key', 'bukti_transaksi');
        $kwitansiItem = collect($bukti['items'])->firstWhere('key', 'kwitansi');
        $this->assertEquals('ready', $kwitansiItem['status']);
        $this->assertEquals(1, $kwitansiItem['count']);
        $this->assertStringContainsString('tahun='.$penganggaran->id, $kwitansiItem['chunks'][0]['url']);

        // SP2B tahap 1 masuk di tahap_1
        $laporan = $chapters->firstWhere('key', 'laporan');
        $sp2bItem = collect($laporan['items'])->firstWhere('key', 'sp2b');
        $this->assertEquals(1, $sp2bItem['count']);

        // 2. Tahap 2 hanya menghitung transaksi Juli-Desember
        $this->actingAs($bendahara)
            ->getJson('/api/cetak-spj/manifest?tahun=2026&periode_type=tahap_2')
            ->assertOk()
            ->assertJsonPath('data.ringkasan_keuangan.total_realisasi', 1500000)
            ->assertJsonPath('data.ringkasan_keuangan.jumlah_transaksi', 1);

        // 3. Mode susun per_bulan mengelompokkan penatausahaan per bulan
        $resPerBulan = $this->actingAs($bendahara)
            ->getJson('/api/cetak-spj/manifest?tahun=2026&periode_type=bulan&bulan_awal=3&grouping_mode=per_bulan')
            ->assertOk();

        $penatausahaan = collect($resPerBulan->json('data.chapters'))->firstWhere('key', 'penatausahaan');
        $maretItem = collect($penatausahaan['items'])->firstWhere('key', 'penatausahaan_bulan_3');
        $this->assertNotNull($maretItem);
        $this->assertEquals('ready', $maretItem['status']);
        $this->assertCount(7, $maretItem['chunks']);

        // 4. Tahunan menjumlahkan keduanya
        $this->actingAs($bendahara)
            ->getJson('/api/cetak-spj/manifest?tahun=2026&periode_type=tahunan')
            ->assertOk()
            ->assertJsonPath('data.ringkasan_keuangan.total_realisasi', 4000000);

        // 5. Rentang bulan (Maret - September) menjumlahkan keduanya
        $this->actingAs($bendahara)
            ->getJson('/api/cetak-spj/manifest?tahun=2026&periode_type=rentang_bulan&bulan_awal=3&bulan_akhir=9')
            ->assertOk()
            ->assertJsonPath('data.meta.bulan_awal', 3)
            ->assertJsonPath('data.meta.bulan_akhir', 9)
            ->assertJsonPath('data.ringkasan_keuangan.total_realisasi', 4000000);

        // 6. Varian SiLPA kosong mengembalikan 200 dengan status empty aman
        $resEmpty = $this->actingAs($bendahara)
            ->getJson('/silpa/api/cetak-spj/manifest?tahun=2026')
            ->assertOk()
            ->assertJsonPath('data.meta.is_silpa', true)
            ->assertJsonPath('data.meta.has_penganggaran', false);

        $this->assertGreaterThan(0, (int) $resEmpty->json('data.readiness_summary.empty'));
    }

    public function test_preset_cover_save_strips_unsafe_photo_path_and_supports_photo_lifecycle(): void
    {
        Storage::fake('public');
        $bendahara = User::factory()->create(['role' => 'bendahara']);

        // Simpan preset dengan photo_path berbahaya (path traversal / folder lain) harus dibuang
        $this->actingAs($bendahara)
            ->postJson('/api/cetak-spj/preset', [
                'tahun_anggaran' => 2026,
                'nama_preset' => 'Default',
                'cover_config' => [
                    'layout' => 'neo_bento',
                    'palette' => 'indigo_sikas',
                    'ink_saver' => true,
                    'judul_utama' => 'SPJ BOSP REGULER 2026',
                    'nama_sekolah_override' => '',
                    'subjudul_override' => null,
                    'photo_path' => 'logos/secret_logo.png',
                ],
                'bundle_config' => [
                    'include_cover' => true,
                    'include_toc' => true,
                    'include_dividers' => true,
                    'include_page_numbers' => true,
                ],
            ])
            ->assertOk()
            ->assertJsonPath('success', true);

        $savedPreset = SpjPrintPreset::firstOrFail();
        $this->assertArrayNotHasKey('photo_path', $savedPreset->cover_config ?? []);
        $this->assertSame('', $savedPreset->cover_config['nama_sekolah_override'] ?? null);
        $this->assertSame('', $savedPreset->cover_config['subjudul_override'] ?? null);

        $this->assertDatabaseHas('spj_print_presets', [
            'variant' => 'reguler',
            'tahun_anggaran' => 2026,
            'nama_preset' => 'Default',
        ]);

        // Upload cover photo
        $photo = UploadedFile::fake()->image('gedung-sekolah.png', 400, 300);
        $uploadRes = $this->actingAs($bendahara)
            ->postJson('/api/cetak-spj/cover-photo', [
                'photo' => $photo,
                'tahun_anggaran' => 2026,
            ])
            ->assertOk()
            ->assertJsonPath('success', true);

        $photoPath = (string) $uploadRes->json('data.photo_path');
        $this->assertTrue(Storage::disk('public')->exists($photoPath));
        $this->assertStringStartsWith('data:image/png;base64,', (string) $uploadRes->json('data.photo_data_uri'));

        // Delete cover photo
        $this->actingAs($bendahara)
            ->deleteJson('/api/cetak-spj/cover-photo', [
                'photo_path' => $photoPath,
                'tahun_anggaran' => 2026,
            ])
            ->assertOk();

        $this->assertFalse(Storage::disk('public')->exists($photoPath));
        $preset = SpjPrintPreset::first();
        $this->assertArrayNotHasKey('photo_path', $preset->cover_config ?? []);
    }

    public function test_external_pdf_attachment_validates_magic_bytes_streams_and_isolates_variants(): void
    {
        Storage::fake('local');
        $bendahara = User::factory()->create(['role' => 'bendahara']);

        // 1. Tolak file .pdf palsu tanpa header %PDF-
        $spoofedPdf = UploadedFile::fake()->createWithContent('palsu.pdf', 'BUKAN FILE PDF ASLI');
        $this->actingAs($bendahara)
            ->postJson('/api/cetak-spj/attachments', [
                'file' => $spoofedPdf,
                'judul' => 'File Palsu',
                'kategori' => 'lainnya',
                'tahun_anggaran' => 2026,
                'periode_tag' => 'tahap_1',
            ])
            ->assertUnprocessable();

        // 2. Terima file PDF valid (%PDF-1.4)
        $validPdfBytes = "%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n%%EOF";
        $validPdf = UploadedFile::fake()->createWithContent('rekening-koran.pdf', $validPdfBytes);

        $createRes = $this->actingAs($bendahara)
            ->postJson('/api/cetak-spj/attachments', [
                'file' => $validPdf,
                'judul' => 'Rekening Koran Bank Tahap 1',
                'kategori' => 'rekening_koran',
                'tahun_anggaran' => 2026,
                'periode_tag' => 'tahap_1',
            ])
            ->assertCreated()
            ->assertJsonPath('success', true);

        $attachmentId = (int) $createRes->json('data.id');
        $attachment = SpjExternalAttachment::findOrFail($attachmentId);
        $this->assertTrue(Storage::disk('local')->exists($attachment->file_path));

        // 3. Perbarui metadata lampiran (PATCH)
        $this->actingAs($bendahara)
            ->patchJson("/api/cetak-spj/attachments/{$attachmentId}", [
                'judul' => 'Rekening Koran Bank Tahap 1 (Revisi)',
                'kategori' => 'rekening_koran',
                'periode_tag' => 'umum',
            ])
            ->assertOk()
            ->assertJsonPath('data.judul', 'Rekening Koran Bank Tahap 1 (Revisi)');

        // 4. Stream PDF dari varian reguler sukses
        $this->actingAs($bendahara)
            ->get("/api/cetak-spj/attachments/{$attachmentId}/stream")
            ->assertOk()
            ->assertHeader('Content-Type', 'application/pdf');

        // 4. Isolasi varian: akses dari varian kinerja harus 404
        $this->actingAs($bendahara)
            ->get("/kinerja/api/cetak-spj/attachments/{$attachmentId}/stream")
            ->assertNotFound();

        // 5. Hapus lampiran membersihkan file dan database
        $this->actingAs($bendahara)
            ->deleteJson("/api/cetak-spj/attachments/{$attachmentId}")
            ->assertOk();

        $this->assertDatabaseMissing('spj_external_attachments', ['id' => $attachmentId]);
        $this->assertFalse(Storage::disk('local')->exists($attachment->file_path));
    }

    public function test_manifest_exposes_per_item_print_defaults_supports_letter_and_pdf_paper_helper(): void
    {
        $bendahara = User::factory()->create(['role' => 'bendahara']);

        // PdfPaperHelper unit assertions
        $this->assertSame(PdfPaperHelper::F4_PAPER_POINTS, PdfPaperHelper::resolvePaper('F4'));
        $this->assertSame(PdfPaperHelper::F4_PAPER_POINTS, PdfPaperHelper::resolvePaper('Folio'));
        $this->assertSame('a4', PdfPaperHelper::resolvePaper('A4'));
        $this->assertSame('legal', PdfPaperHelper::resolvePaper('Legal'));
        $this->assertSame('letter', PdfPaperHelper::resolvePaper('Letter'));
        $this->assertSame('210mm 330mm', PdfPaperHelper::resolveCssPaperSize('F4'));
        $this->assertSame('Letter', PdfPaperHelper::resolveCssPaperSize('Letter'));
        $this->assertSame('landscape', PdfPaperHelper::resolveOrientation('LANDSCAPE', 'portrait'));
        $this->assertSame('portrait', PdfPaperHelper::resolveOrientation('invalid', 'portrait'));
        $this->assertSame('9pt', PdfPaperHelper::resolveFontSize('9pt', '10pt'));
        $this->assertSame('8pt', PdfPaperHelper::resolveFontSize('8', '10pt'));

        // Manifest mendukung Letter dan mengirim print_param_schema + default_font_size pada setiap item
        $res = $this->actingAs($bendahara)
            ->getJson('/api/cetak-spj/manifest?tahun=2026&paper_size=Letter')
            ->assertOk()
            ->assertJsonPath('data.meta.paper_size', 'Letter');

        $chapters = collect($res->json('data.chapters'));
        $penganggaranChapter = $chapters->firstWhere('key', 'penganggaran');
        $rkasTahapan = collect($penganggaranChapter['items'])->firstWhere('key', 'rkas_tahapan');
        $this->assertSame('Letter', $rkasTahapan['default_paper_size']);
        $this->assertSame('landscape', $rkasTahapan['default_orientation']);
        $this->assertSame('10pt', $rkasTahapan['default_font_size']);
        $this->assertSame('snake', $rkasTahapan['print_param_schema']);

        $penatausahaanChapter = $chapters->firstWhere('key', 'penatausahaan');
        $rekapRealisasi = collect($penatausahaanChapter['items'])->firstWhere('key', 'rekap_realisasi');
        $this->assertSame('realisasi', $rekapRealisasi['print_param_schema']);

        // Preset menyimpan item_print_settings dan memuatnya kembali di manifest
        $this->actingAs($bendahara)
            ->postJson('/api/cetak-spj/preset', [
                'tahun_anggaran' => 2026,
                'cover_config' => ['layout' => 'editorial'],
                'bundle_config' => [
                    'include_cover' => true,
                    'item_print_settings' => [
                        'rkas_tahapan' => [
                            'paper_size' => 'Letter',
                            'orientation' => 'portrait',
                            'font_size' => '8pt',
                        ],
                    ],
                ],
            ])
            ->assertOk();

        $this->actingAs($bendahara)
            ->getJson('/api/cetak-spj/manifest?tahun=2026')
            ->assertOk()
            ->assertJsonPath('data.preset.bundle_config.item_print_settings.rkas_tahapan.paper_size', 'Letter')
            ->assertJsonPath('data.preset.bundle_config.item_print_settings.rkas_tahapan.orientation', 'portrait')
            ->assertJsonPath('data.preset.bundle_config.item_print_settings.rkas_tahapan.font_size', '8pt');

        // Verifikasi langsung endpoint PDF (SP2B & RKAS Rincian) menerima F4/Letter + orientation + font_size
        $sekolah = $this->createSekolah();
        $penganggaran = $this->createPenganggaran($sekolah, 2026);
        $sp2b = Sp2b::create([
            'penganggaran_id' => $penganggaran->id,
            'nomor_sp2b' => 'SP2B-TEST/2026',
            'tanggal_sp2b' => '2026-06-30',
            'jenis_periode' => 'tahap',
            'tahap' => '1',
            'saldo_awal' => 0,
            'pendapatan' => 50000000,
            'belanja' => 10000000,
            'saldo_akhir' => 40000000,
        ]);

        $sp2bPdfRes = $this->actingAs($bendahara)
            ->get("/laporan/sp2b/{$sp2b->id}/pdf?paper_size=Letter&orientation=landscape&font_size=9pt")
            ->assertOk();
        $this->assertStringStartsWith('%PDF-', (string) $sp2bPdfRes->getContent());

        $rincianPdfRes = $this->actingAs($bendahara)
            ->get("/rkas/{$penganggaran->id}/export-rincian-pdf?paper_size=F4&orientation=landscape&font_size=8pt")
            ->assertOk();
        $this->assertStringStartsWith('%PDF-', (string) $rincianPdfRes->getContent());

        // Verifikasi semua 4 model Kwitansi download-all mendukung tahun=penganggaran_id maupun tahun_anggaran
        $penerimaan = PenerimaanDana::create([
            'penganggaran_id' => $penganggaran->id,
            'sumber_dana' => 'Bosp Reguler Tahap 1',
            'tanggal_terima' => '2026-02-10',
            'jumlah_dana' => 50000000,
            'saldo_awal' => 0,
        ]);
        $keg = KodeKegiatan::create([
            'kode' => '01.01.02',
            'program' => 'Pengembangan Standar Proses',
            'sub_program' => 'Pembelajaran',
            'uraian' => 'ATK Pembelajaran',
        ]);
        $rek = RekeningBelanja::create([
            'kode_rekening' => '5.1.02.01.01.0025',
            'rincian_objek' => 'Belanja Kertas',
            'kategori' => 'Operasi',
        ]);
        $bku = BukuKasUmum::create([
            'penganggaran_id' => $penganggaran->id,
            'kode_kegiatan_id' => $keg->id,
            'rekening_belanja_id' => $rek->id,
            'tanggal_transaksi' => '2026-03-10',
            'jenis_transaksi' => 'tunai',
            'uraian' => 'Beli Kertas',
            'total_transaksi_kotor' => 500000,
            'is_bunga_record' => false,
        ]);
        $detail = BukuKasUmumUraianDetail::create([
            'buku_kas_umum_id' => $bku->id,
            'kode_kegiatan_id' => $keg->id,
            'rekening_belanja_id' => $rek->id,
            'uraian' => 'Kertas A4',
            'volume' => 5,
            'satuan' => 'Rim',
            'harga_satuan' => 100000,
            'jumlah' => 500000,
        ]);
        Kwitansi::create([
            'sekolah_id' => $sekolah->id,
            'penganggaran_id' => $penganggaran->id,
            'kode_kegiatan_id' => $keg->id,
            'kode_rekening_id' => $rek->id,
            'penerimaan_dana_id' => $penerimaan->id,
            'buku_kas_umum_id' => $bku->id,
            'bku_uraian_detail_id' => $detail->id,
        ]);

        foreach (['download-all', 'download-all2', 'download-all3', 'download-all4'] as $endpoint) {
            $kwRes = $this->actingAs($bendahara)
                ->get("/kwitansi/{$endpoint}?tahun={$penganggaran->id}&start_date=2026-03-01&end_date=2026-03-31&paper_size=F4")
                ->assertOk();
            $this->assertStringStartsWith('%PDF-', (string) $kwRes->getContent(), "Endpoint {$endpoint} harus menghasilkan PDF valid");
        }
    }

    public function test_rkas_tahapan_exposes_all_murni_and_perubahan_versions_and_generates_valid_pdfs(): void
    {
        $bendahara = User::factory()->create(['role' => 'bendahara']);
        $sekolah = $this->createSekolah();
        $penganggaran = $this->createPenganggaran($sekolah, 2026);

        $keg = KodeKegiatan::create([
            'kode' => '01.01.01',
            'program' => 'Pengembangan Standar Isi',
            'sub_program' => 'Kurikulum',
            'uraian' => 'Penyusunan Kurikulum',
        ]);

        $rek = RekeningBelanja::create([
            'kode_rekening' => '5.1.02.01.01.0024',
            'rincian_objek' => 'Belanja ATK',
            'kategori' => 'Belanja Operasi',
        ]);

        Rkas::create([
            'penganggaran_id' => $penganggaran->id,
            'kode_id' => $keg->id,
            'kode_rekening_id' => $rek->id,
            'uraian' => 'Kertas HVS Murni',
            'harga_satuan' => 60000,
            'bulan' => 'Januari',
            'jumlah' => 10,
            'satuan' => 'Rim',
        ]);

        // 1. Saat baru ada RKAS Murni: Tahap 1 & Tahap 2 (fallback Murni) keduanya tampil 2 versi Murni
        $resMurniOnly = $this->actingAs($bendahara)
            ->getJson('/api/cetak-spj/manifest?tahun=2026&periode_type=tahap_1&paper_size=F4')
            ->assertOk();

        $penganggaranCh = collect($resMurniOnly->json('data.chapters'))->firstWhere('key', 'penganggaran');
        $tahapanItem = collect($penganggaranCh['items'])->firstWhere('key', 'rkas_tahapan');

        $this->assertSame('murni', $tahapanItem['default_template']);
        $this->assertSame(
            ['murni_tahapan', 'murni'],
            collect($tahapanItem['available_templates'])->pluck('id')->all(),
        );

        // Tahap 2 saat belum ada Perubahan otomatis fallback ke Murni
        $resT2Fallback = $this->actingAs($bendahara)
            ->getJson('/api/cetak-spj/manifest?tahun=2026&periode_type=tahap_2&paper_size=F4')
            ->assertOk();
        $tahapanT2Fallback = collect(collect($resT2Fallback->json('data.chapters'))->firstWhere('key', 'penganggaran')['items'])
            ->firstWhere('key', 'rkas_tahapan');
        $this->assertSame('murni', $tahapanT2Fallback['default_template']);
        $this->assertSame(
            ['murni_tahapan', 'murni'],
            collect($tahapanT2Fallback['available_templates'])->pluck('id')->all(),
        );

        // 2. Tambahkan RKAS Perubahan:
        //    - Tahap 1 hanya tampil opsi Murni di semua 7 item RKAS
        //    - Tahap 2 hanya tampil opsi Perubahan di semua 7 item RKAS
        //    - Tahunan tampil seluruh 5 versi pada RKAS Tahapan
        RkasPerubahan::create([
            'penganggaran_id' => $penganggaran->id,
            'kode_id' => $keg->id,
            'kode_rekening_id' => $rek->id,
            'uraian' => 'Kertas HVS Perubahan',
            'harga_satuan' => 65000,
            'bulan' => 'Juli',
            'jumlah' => 12,
            'satuan' => 'Rim',
        ]);

        $resT1 = $this->actingAs($bendahara)
            ->getJson('/api/cetak-spj/manifest?tahun=2026&periode_type=tahap_1&paper_size=F4')
            ->assertOk();
        $penganggaranT1Items = collect(collect($resT1->json('data.chapters'))->firstWhere('key', 'penganggaran')['items']);
        $tahapanT1 = $penganggaranT1Items->firstWhere('key', 'rkas_tahapan');

        $this->assertSame('murni', $tahapanT1['default_template']);
        $this->assertSame(
            ['murni_tahapan', 'murni'],
            collect($tahapanT1['available_templates'])->pluck('id')->all(),
        );
        foreach (['rkas_rekap', 'rkas_lembar_kerja', 'rkas_bulanan', 'rkas_rincian', 'rkas_alur_kas', 'rkas_rp'] as $otherRkasKey) {
            $item = $penganggaranT1Items->firstWhere('key', $otherRkasKey);
            $this->assertSame(['murni'], collect($item['available_templates'])->pluck('id')->all(), "Tahap 1 {$otherRkasKey} hanya boleh tampil Murni");
        }

        $resT2 = $this->actingAs($bendahara)
            ->getJson('/api/cetak-spj/manifest?tahun=2026&periode_type=tahap_2&paper_size=Letter')
            ->assertOk();
        $penganggaranT2Items = collect(collect($resT2->json('data.chapters'))->firstWhere('key', 'penganggaran')['items']);
        $tahapanT2 = $penganggaranT2Items->firstWhere('key', 'rkas_tahapan');

        $this->assertSame('perubahan', $tahapanT2['default_template']);
        $this->assertSame(
            ['perubahan', 'perubahan_v1', 'perubahan_v2'],
            collect($tahapanT2['available_templates'])->pluck('id')->all(),
        );
        foreach (['rkas_rekap', 'rkas_lembar_kerja', 'rkas_bulanan', 'rkas_rincian', 'rkas_alur_kas', 'rkas_rp'] as $otherRkasKey) {
            $item = $penganggaranT2Items->firstWhere('key', $otherRkasKey);
            $this->assertSame(['perubahan'], collect($item['available_templates'])->pluck('id')->all(), "Tahap 2 {$otherRkasKey} hanya boleh tampil Perubahan");
        }

        // Tahunan menampilkan seluruh 5 versi (2 Murni + 3 Perubahan)
        $resTahunan = $this->actingAs($bendahara)
            ->getJson('/api/cetak-spj/manifest?tahun=2026&periode_type=tahunan&paper_size=Letter')
            ->assertOk();
        $tahapanTahunan = collect(collect($resTahunan->json('data.chapters'))->firstWhere('key', 'penganggaran')['items'])
            ->firstWhere('key', 'rkas_tahapan');
        $this->assertSame('perubahan', $tahapanTahunan['default_template']);
        $this->assertSame(
            ['murni_tahapan', 'murni', 'perubahan', 'perubahan_v1', 'perubahan_v2'],
            collect($tahapanTahunan['available_templates'])->pluck('id')->all(),
        );
        $urlsByTemplate = $tahapanTahunan['chunks'][0]['urls_by_template'];

        // 3. Semua 5 endpoint PDF menghasilkan %PDF- valid dengan paper_size/orientation/font_size
        foreach (['murni_tahapan', 'murni', 'perubahan', 'perubahan_v1', 'perubahan_v2'] as $tplId) {
            $this->assertArrayHasKey($tplId, $urlsByTemplate);
            $pdfRes = $this->actingAs($bendahara)
                ->get($urlsByTemplate[$tplId])
                ->assertOk();
            $this->assertStringStartsWith(
                '%PDF-',
                (string) $pdfRes->getContent(),
                "Versi RKAS Tahapan '{$tplId}' harus menghasilkan PDF valid",
            );
        }

        // 4. Verifikasi override kertas F4 + portrait + 8pt pada Perubahan V.1 & V.2 dan round-trip preset perubahan_v2
        foreach (['export-tahapan-v1-pdf', 'export-tahapan-v2-pdf'] as $endpoint) {
            $customPdfRes = $this->actingAs($bendahara)
                ->get("/rkas-perubahan/{$penganggaran->id}/{$endpoint}?paper_size=F4&orientation=portrait&font_size=8pt")
                ->assertOk();
            $this->assertStringStartsWith('%PDF-', (string) $customPdfRes->getContent());
        }

        $this->actingAs($bendahara)
            ->postJson('/api/cetak-spj/preset', [
                'tahun_anggaran' => 2026,
                'cover_config' => ['layout' => 'editorial'],
                'bundle_config' => [
                    'include_cover' => true,
                    'selected_templates' => [
                        'rkas_tahapan' => 'perubahan_v2',
                    ],
                ],
            ])
            ->assertOk();

        $this->actingAs($bendahara)
            ->getJson('/api/cetak-spj/manifest?tahun=2026&periode_type=tahap_2')
            ->assertOk()
            ->assertJsonPath('data.preset.bundle_config.selected_templates.rkas_tahapan', 'perubahan_v2');

        // 5. Edge case: hanya ada RKAS Perubahan (Murni kosong) pada tahap_2 tetap konsisten count & default_template
        Rkas::query()->where('penganggaran_id', $penganggaran->id)->delete();
        $resPerubahanOnly = $this->actingAs($bendahara)
            ->getJson('/api/cetak-spj/manifest?tahun=2026&periode_type=tahap_2')
            ->assertOk();
        $tahapanPerubahanOnly = collect(collect($resPerubahanOnly->json('data.chapters'))->firstWhere('key', 'penganggaran')['items'])
            ->firstWhere('key', 'rkas_tahapan');

        $this->assertSame('perubahan', $tahapanPerubahanOnly['default_template']);
        $this->assertSame(1, $tahapanPerubahanOnly['count']);
        $this->assertSame(
            ['perubahan', 'perubahan_v1', 'perubahan_v2'],
            collect($tahapanPerubahanOnly['available_templates'])->pluck('id')->all(),
        );
    }

    public function test_sp2b_supports_per_tahap_and_per_bulan_mode_selection(): void
    {
        $bendahara = User::factory()->create(['role' => 'bendahara']);
        $sekolah = $this->createSekolah();
        $penganggaran = $this->createPenganggaran($sekolah, 2026);

        // Buat 1 SP2B Per Tahap (Tahap 1) dan 3 SP2B Per Bulan (Januari, Maret, Agustus)
        Sp2b::create([
            'penganggaran_id' => $penganggaran->id,
            'nomor_sp2b' => 'SP2B-T1/2026',
            'tanggal_sp2b' => '2026-06-30',
            'jenis_periode' => 'tahap',
            'tahap' => '1',
            'saldo_awal' => 0,
            'pendapatan' => 60000000,
            'belanja' => 20000000,
            'saldo_akhir' => 40000000,
        ]);

        foreach ([['bulan' => 3, 'nomor' => 'SP2B-MAR/2026'], ['bulan' => 1, 'nomor' => 'SP2B-JAN/2026'], ['bulan' => 8, 'nomor' => 'SP2B-AGS/2026']] as $row) {
            Sp2b::create([
                'penganggaran_id' => $penganggaran->id,
                'nomor_sp2b' => $row['nomor'],
                'tanggal_sp2b' => sprintf('2026-%02d-28', $row['bulan']),
                'jenis_periode' => 'bulan',
                'bulan' => $row['bulan'],
                'tahap' => $row['bulan'] <= 6 ? '1' : '2',
                'saldo_awal' => 0,
                'pendapatan' => 10000000,
                'belanja' => 5000000,
                'saldo_akhir' => 5000000,
            ]);
        }

        // 1. Tahap 1 default auto = Per Tahap (1 dok), tetapi sp2b_mode_options menampilkan Tahap (1) & Bulan (2: Jan & Mar)
        $resTahap = $this->actingAs($bendahara)
            ->getJson('/api/cetak-spj/manifest?tahun=2026&periode_type=tahap_1&sp2b_mode=auto')
            ->assertOk()
            ->assertJsonPath('data.meta.sp2b_mode', 'tahap');

        $sp2bTahap = collect(collect($resTahap->json('data.chapters'))->firstWhere('key', 'laporan')['items'])
            ->firstWhere('key', 'sp2b');
        $this->assertSame('tahap', $sp2bTahap['sp2b_active_mode']);
        $this->assertSame(1, $sp2bTahap['count']);
        $this->assertSame(1, $sp2bTahap['sp2b_mode_options'][0]['count']);
        $this->assertSame(2, $sp2bTahap['sp2b_mode_options'][1]['count']);

        // 2. Pilih sp2b_mode=bulan pada Tahap 1: mengembalikan 2 SP2B bulanan urut kronologis (Januari lalu Maret)
        $resBulan = $this->actingAs($bendahara)
            ->getJson('/api/cetak-spj/manifest?tahun=2026&periode_type=tahap_1&sp2b_mode=bulan')
            ->assertOk()
            ->assertJsonPath('data.meta.sp2b_mode', 'bulan');

        $sp2bBulan = collect(collect($resBulan->json('data.chapters'))->firstWhere('key', 'laporan')['items'])
            ->firstWhere('key', 'sp2b');
        $this->assertSame('bulan', $sp2bBulan['sp2b_active_mode']);
        $this->assertSame(2, $sp2bBulan['count']);
        $this->assertStringContainsString('Januari', $sp2bBulan['chunks'][0]['label']);
        $this->assertStringContainsString('Maret', $sp2bBulan['chunks'][1]['label']);

        // 3. Periode Per Bulan (Maret) dengan auto otomatis memilih mode bulan (1 dok)
        $resSingleMonth = $this->actingAs($bendahara)
            ->getJson('/api/cetak-spj/manifest?tahun=2026&periode_type=bulan&bulan_awal=3&sp2b_mode=auto')
            ->assertOk()
            ->assertJsonPath('data.meta.sp2b_mode', 'bulan');

        $sp2bMarch = collect(collect($resSingleMonth->json('data.chapters'))->firstWhere('key', 'laporan')['items'])
            ->firstWhere('key', 'sp2b');
        $this->assertSame(1, $sp2bMarch['count']);
        $this->assertStringContainsString('Maret', $sp2bMarch['chunks'][0]['label']);

        // 4. Simpan preset sp2b_mode=bulan dan muat manifest tanpa query sp2b_mode -> menghormati preset
        $this->actingAs($bendahara)
            ->postJson('/api/cetak-spj/preset', [
                'tahun_anggaran' => 2026,
                'cover_config' => ['layout' => 'editorial'],
                'bundle_config' => [
                    'include_cover' => true,
                    'sp2b_mode' => 'bulan',
                ],
            ])
            ->assertOk();

        $this->actingAs($bendahara)
            ->getJson('/api/cetak-spj/manifest?tahun=2026&periode_type=tahap_1')
            ->assertOk()
            ->assertJsonPath('data.meta.sp2b_mode', 'bulan');

        // 5. sp2b_mode=auto tetap mengabaikan preset dan memilih mode cerdas (tahap pada tahap_1),
        //    dan jatuh ke bulan ketika tidak ada SP2B tahap (mis. tahap_2 hanya punya Agustus)
        $this->actingAs($bendahara)
            ->getJson('/api/cetak-spj/manifest?tahun=2026&periode_type=tahap_1&sp2b_mode=auto')
            ->assertOk()
            ->assertJsonPath('data.meta.sp2b_mode', 'tahap');

        $resT2Auto = $this->actingAs($bendahara)
            ->getJson('/api/cetak-spj/manifest?tahun=2026&periode_type=tahap_2&sp2b_mode=auto')
            ->assertOk()
            ->assertJsonPath('data.meta.sp2b_mode', 'bulan');
        $sp2bT2Auto = collect(collect($resT2Auto->json('data.chapters'))->firstWhere('key', 'laporan')['items'])
            ->firstWhere('key', 'sp2b');
        $this->assertSame(1, $sp2bT2Auto['count']);
        $this->assertStringContainsString('Agustus', $sp2bT2Auto['chunks'][0]['label']);
    }

    public function test_shared_school_photo_persists_across_variants_and_saves_modern_cover_options(): void
    {
        Storage::fake('public');
        $bendahara = User::factory()->create(['role' => 'bendahara']);
        $sekolah = $this->createSekolah();
        $this->createPenganggaran($sekolah, 2026);

        // 1. Unggah foto sekolah di varian reguler -> otomatis tersimpan di profil sekolah & lintas varian
        $photo = UploadedFile::fake()->image('gedung-utama.png', 640, 420);
        $uploadRes = $this->actingAs($bendahara)
            ->postJson('/api/cetak-spj/cover-photo', [
                'photo' => $photo,
                'tahun_anggaran' => 2026,
            ])
            ->assertOk()
            ->assertJsonPath('success', true);

        $photoPath = (string) $uploadRes->json('data.photo_path');
        $this->assertStringStartsWith('spj_cover_photos/shared/', $photoPath);
        $this->assertTrue(Storage::disk('public')->exists($photoPath));
        $this->assertSame($photoPath, $sekolah->fresh()->foto_sekolah);

        // 2. Manifest di varian Kinerja & SiLPA langsung menerima foto_sekolah_data_uri tanpa upload ulang
        foreach (['/api/cetak-spj/manifest', '/kinerja/api/cetak-spj/manifest', '/silpa/api/cetak-spj/manifest'] as $endpoint) {
            $manifestRes = $this->actingAs($bendahara)->getJson($endpoint.'?tahun=2026')->assertOk();
            $this->assertStringStartsWith(
                'data:image/png;base64,',
                (string) $manifestRes->json('data.sekolah.foto_sekolah_data_uri'),
            );
        }

        // 3. Simpan konfigurasi cover modern baru (bosp_wave + opsi foto & kontak) + sanitasi nilai tidak valid
        $this->actingAs($bendahara)
            ->postJson('/api/cetak-spj/preset', [
                'tahun_anggaran' => 2026,
                'nama_preset' => 'Default',
                'cover_config' => [
                    'layout' => 'bosp_wave',
                    'palette' => 'royal_bosp',
                    'show_foto_sekolah' => true,
                    'photo_focus' => 'top',
                    'photo_blend' => 'invalid_blend',
                    'show_logo_bosp' => true,
                    'kontak_sekolah_override' => 'sdn1@gmail.com',
                    'photo_path' => $photoPath,
                ],
                'bundle_config' => [
                    'include_cover' => true,
                ],
            ])
            ->assertOk();

        $savedManifest = $this->actingAs($bendahara)
            ->getJson('/api/cetak-spj/manifest?tahun=2026')
            ->assertOk();

        $this->assertSame('bosp_wave', $savedManifest->json('data.preset.cover_config.layout'));
        $this->assertSame('royal_bosp', $savedManifest->json('data.preset.cover_config.palette'));
        $this->assertSame(true, $savedManifest->json('data.preset.cover_config.show_foto_sekolah'));
        $this->assertSame('top', $savedManifest->json('data.preset.cover_config.photo_focus'));
        $this->assertNull($savedManifest->json('data.preset.cover_config.photo_blend'));
        $this->assertSame('sdn1@gmail.com', $savedManifest->json('data.preset.cover_config.kontak_sekolah_override'));

        // 4. Hapus foto sekolah membersihkannya dari storage, profil sekolah, dan seluruh varian
        $this->actingAs($bendahara)
            ->deleteJson('/api/cetak-spj/cover-photo', [
                'photo_path' => $photoPath,
                'tahun_anggaran' => 2026,
            ])
            ->assertOk();

        $this->assertFalse(Storage::disk('public')->exists($photoPath));
        $this->assertNull($sekolah->fresh()->foto_sekolah);

        $afterDelete = $this->actingAs($bendahara)
            ->getJson('/kinerja/api/cetak-spj/manifest?tahun=2026')
            ->assertOk();
        $this->assertNull($afterDelete->json('data.sekolah.foto_sekolah_data_uri'));
    }
}
