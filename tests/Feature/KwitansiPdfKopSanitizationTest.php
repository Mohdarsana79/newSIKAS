<?php

namespace Tests\Feature;

use App\Models\BukuKasUmum;
use App\Models\BukuKasUmumUraianDetail;
use App\Models\KodeKegiatan;
use App\Models\Kwitansi;
use App\Models\PenerimaanDana;
use App\Models\Penganggaran;
use App\Models\RekeningBelanja;
use App\Models\SekolahProfile;
use App\Models\User;
use App\Support\PdfHtmlSanitizer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class KwitansiPdfKopSanitizationTest extends TestCase
{
    use RefreshDatabase;

    protected User $bendahara;

    protected SekolahProfile $sekolah;

    protected Penganggaran $penganggaran;

    protected Kwitansi $kwitansi;

    /** @var array<int, string> */
    protected array $tempFilesToClean = [];

    protected function setUp(): void
    {
        parent::setUp();

        $this->bendahara = User::factory()->create([
            'username' => 'bendahara_pdf_kop',
            'role' => 'bendahara',
        ]);

        $this->sekolah = SekolahProfile::create([
            'nama_sekolah' => 'SMP Muhammadiyah Soni',
            'npsn' => config('license.npsn_code') ?: '40202255',
            'status_sekolah' => 'Swasta',
            'jenjang_sekolah' => 'SMP',
            'kelurahan_desa' => 'Paddumpu',
            'kecamatan' => 'Damsel',
            'kabupaten_kota' => 'Kabupaten Tolitoli',
            'provinsi' => 'Sulawesi Tengah',
            'alamat' => 'Jl. Santa No. 150',
            'kop_mode' => '2_logo',
            'kop_border' => 'double',
            'kop_jenis' => 'builder',
            'kop_teks_html' => "<p><span style=\"font-size: 12pt;\">\u{200B}<br class=\"ProseMirror-trailingBreak\"></span></p>\u{FEFF}<p style=\"text-align: center;\"><strong>PEMERINTAH KABUPATEN TOLITOLI</strong></p><p style=\"text-align: center;\">SMP MUHAMMADIYAH SONI \u{2212} NPSN 40202255</p><p>&nbsp;</p><p><strong>\u{200B}</strong></p>",
            'kop_dokumen' => [
                'pelengkap_kwitansi' => true,
            ],
        ]);

        $this->penganggaran = Penganggaran::create([
            'pagu_anggaran' => 100000000,
            'tahun_anggaran' => 2026,
            'kepala_sekolah' => 'Dra. Masitah Abdullah',
            'sk_kepala_sekolah' => 'SK-KS-01',
            'bendahara' => 'Dra. Masitah Abdullah',
            'sk_bendahara' => 'SK-BD-01',
            'komite' => 'Sapri Hi Sabe',
            'nip_kepala_sekolah' => '196909172007012017',
            'nip_bendahara' => '196909172007012017',
            'tanggal_sk_kepala_sekolah' => '2026-01-02',
            'tanggal_sk_bendahara' => '2026-01-02',
            'sekolah_id' => $this->sekolah->id,
        ]);

        $kodeKegiatan = KodeKegiatan::create([
            'kode' => '06.05.08',
            'program' => 'Standar Pengelolaan',
            'sub_program' => 'Pelaksanaan Administrasi Kegiatan Sekolah',
            'uraian' => 'Pembelian Bahan Habis Pakai',
        ]);

        $rekening = RekeningBelanja::create([
            'kode_rekening' => '5.1.02.01.01.0024',
            'rincian_objek' => 'Belanja Alat Tulis Kantor',
            'kategori' => 'Operasional',
        ]);

        $penerimaan = PenerimaanDana::create([
            'penganggaran_id' => $this->penganggaran->id,
            'sumber_dana' => 'BOSP Reguler Tahap 2',
            'jumlah_dana' => 50000000,
            'tanggal_terima' => '2026-08-01',
        ]);

        $bku = BukuKasUmum::create([
            'penganggaran_id' => $this->penganggaran->id,
            'kode_kegiatan_id' => $kodeKegiatan->id,
            'rekening_belanja_id' => $rekening->id,
            'id_transaksi' => '082/BOSP/THP-II/2026',
            'tanggal_transaksi' => '2026-11-10',
            'uraian' => "Lunas bayar belanja alat tulis kantor\u{200B}",
            'uraian_opsional' => "Lunas bayar belanja alat tulis kantor\u{200B}",
            'jenis_transaksi' => 'non-tunai',
            'anggaran' => 879000,
            'dibelanjakan' => 879000,
            'total_transaksi_kotor' => 879000,
        ]);

        $detail = BukuKasUmumUraianDetail::create([
            'buku_kas_umum_id' => $bku->id,
            'kode_kegiatan_id' => $kodeKegiatan->id,
            'rekening_belanja_id' => $rekening->id,
            'uraian' => 'Stofmap Kertas',
            'volume' => 1,
            'satuan' => 'paket',
            'harga_satuan' => 879000,
            'jumlah' => 879000,
        ]);

        $this->kwitansi = Kwitansi::create([
            'sekolah_id' => $this->sekolah->id,
            'penganggaran_id' => $this->penganggaran->id,
            'kode_kegiatan_id' => $kodeKegiatan->id,
            'kode_rekening_id' => $rekening->id,
            'penerimaan_dana_id' => $penerimaan->id,
            'buku_kas_umum_id' => $bku->id,
            'bku_uraian_detail_id' => $detail->id,
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

    public function test_pdf_html_sanitizer_handles_bom_zero_width_nested_empty_blocks_xss_redos_and_attributes(): void
    {
        // 1. Nested empty Tiptap paragraphs, BOM, ZWSP, minus entity, and XSS stripping
        $dirtyKop = "\xEF\xBB\xBF<p><span style=\"font-size: 12pt;\">\u{200B}<br class=\"ProseMirror-trailingBreak\"></span></p>"
            .'<script>alert(1)</script>'
            .'<p onclick="evil()" style="text-align: center; color: #000; background: url(javascript:alert(1));"><strong>KOP &#8203;&ZeroWidthSpace;RESMI &minus; 2026</strong></p>'
            .'<p><strong>&nbsp;</strong></p><p>&#65279;</p>';

        $cleanKop = PdfHtmlSanitizer::sanitizeKopHtml($dirtyKop);

        $this->assertStringContainsString('KOP RESMI - 2026', $cleanKop);
        $this->assertStringContainsString('text-align: center; color: #000', $cleanKop);
        $this->assertStringNotContainsString('<script', $cleanKop);
        $this->assertStringNotContainsString('onclick', $cleanKop);
        $this->assertStringNotContainsString('javascript:', $cleanKop);
        $this->assertStringNotContainsString('<br', $cleanKop);
        $this->assertStringNotContainsString("\u{200B}", $cleanKop);
        $this->assertStringNotContainsString("\u{FEFF}", $cleanKop);

        // 2. ReDoS regression: 40 consecutive NBSP chars inside <p> must not hit PCRE backtrack limit
        $manyNbsp = '<p>'.str_repeat("\u{00A0}", 40).'</p><p>ISI KOP</p><p>'.str_repeat("\u{00A0}", 40).'X</p>';
        $cleanNbsp = PdfHtmlSanitizer::sanitizeKopHtml($manyNbsp);
        $this->assertStringStartsWith('<p>ISI KOP</p>', $cleanNbsp);
        $this->assertStringContainsString('X</p>', $cleanNbsp);

        // 3. Curly quotes inside HTML attributes must NOT be turned into raw ASCII quotes that break attributes
        $attrHtml = "<img src=\"logo.png\" alt=\"Logo \u{201C}Resmi\u{201D}\">\u{200B}\xC3\x28";
        $cleanAttr = PdfHtmlSanitizer::sanitizeHtml($attrHtml);
        $this->assertStringContainsString("alt=\"Logo \u{201C}Resmi\u{201D}\"", $cleanAttr);
        $this->assertStringNotContainsString("\u{200B}", $cleanAttr);
    }

    public function test_format_3_and_4_pdfs_render_without_question_marks_or_double_rupiah(): void
    {
        $routes = [
            route('kwitansi.pdf3', [$this->kwitansi->id, 'paper_size' => '']),
            route('kwitansi.preview3', $this->kwitansi->id),
            route('kwitansi.download-all3'),
            route('kwitansi.pdf4', $this->kwitansi->id),
            route('kwitansi.preview4', $this->kwitansi->id),
            route('kwitansi.download-all4'),
        ];

        foreach ($routes as $url) {
            $response = $this->actingAs($this->bendahara)->get($url);
            $response->assertOk();
            $this->assertStringContainsString('application/pdf', (string) $response->headers->get('Content-Type'));

            $pdfText = $this->extractDecodedPdfStreams($response->getContent());

            $this->assertStringNotContainsString('?', $pdfText, "Ditemukan tanda tanya '?' liar pada PDF {$url}");
            $this->assertStringNotContainsString('RUPIAH RUPIAH', $pdfText, "Ditemukan dobel 'RUPIAH RUPIAH' pada PDF {$url}");
            $this->assertStringContainsString('DELAPAN RATUS TUJUH PULUH SEMBILAN RIBU RUPIAH', $pdfText, "Teks terbilang hilang pada PDF {$url}");
            $this->assertStringContainsString('Lunas bayar belanja alat tulis kantor', $pdfText);
        }
    }

    public function test_doc_kop_surat_respects_upload_mode_and_does_not_resurrect_stale_builder_html(): void
    {
        $relPath = 'kop_surat/test_upload_priority_'.Str::uuid().'.png';
        $fullPath = storage_path('app/public/'.$relPath);
        File::ensureDirectoryExists(dirname($fullPath));
        $this->tempFilesToClean[] = $fullPath;
        file_put_contents(
            $fullPath,
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==')
        );

        // 1. kop_jenis = upload dengan gambar valid -> tampilkan gambar, abaikan kop_teks_html lama
        $this->sekolah->update([
            'kop_surat' => $relPath,
            'kop_jenis' => 'upload',
            'kop_teks_html' => '<p>HTML LAMA YANG TIDAK BOLEH MUNCUL</p>',
        ]);

        $renderedUpload = view('partials.doc_kop_surat', [
            'docKey' => 'pelengkap_kwitansi',
            'sekolah' => $this->sekolah->fresh(),
        ])->render();

        $this->assertStringNotContainsString('doc-kop-table', $renderedUpload);
        $this->assertStringNotContainsString('HTML LAMA YANG TIDAK BOLEH MUNCUL', $renderedUpload);
        $this->assertStringContainsString('data:image/png;base64,', $renderedUpload);

        // 2. kop_jenis = upload tetapi gambar hilang/dihapus -> jangan bangkitkan kop_teks_html lama
        $this->sekolah->update(['kop_surat' => 'kop_surat/tidak_ada_di_disk.png']);
        $renderedMissingUpload = view('partials.doc_kop_surat', [
            'docKey' => 'pelengkap_kwitansi',
            'sekolah' => $this->sekolah->fresh(),
        ])->render();
        $this->assertSame('', trim($renderedMissingUpload));

        // 3. kop_jenis = builder (dan array tanpa key kop_jenis) -> tetap render HTML kop tersanitasi
        $this->sekolah->update(['kop_jenis' => 'builder']);
        $renderedBuilder = view('partials.doc_kop_surat', [
            'docKey' => 'pelengkap_kwitansi',
            'sekolah' => $this->sekolah->fresh(),
        ])->render();
        $this->assertStringContainsString('doc-kop-table', $renderedBuilder);
        $this->assertStringContainsString('HTML LAMA YANG TIDAK BOLEH MUNCUL', $renderedBuilder);

        $legacyArray = $this->sekolah->fresh()->toArray();
        unset($legacyArray['kop_jenis']);
        $renderedLegacy = view('partials.doc_kop_surat', [
            'docKey' => 'pelengkap_kwitansi',
            'sekolah' => $legacyArray,
        ])->render();
        $this->assertStringContainsString('doc-kop-table', $renderedLegacy);
    }

    public function test_save_builder_kop_sanitizes_html_and_rejects_empty_after_sanitization(): void
    {
        Storage::fake('public');

        // Valid HTML dengan BOM & paragraf kosong -> disanitasi bersih
        $response = $this->actingAs($this->bendahara)
            ->post(route('sekolah-profile.save-builder-kop', $this->sekolah->id), [
                'generated_kop' => UploadedFile::fake()->image('kop.png', 200, 60),
                'kop_mode' => '2_logo',
                'kop_border' => 'double',
                'kop_teks_html' => "<p>\u{200B}</p>\u{FEFF}<p>PEMERINTAH KABUPATEN TOLITOLI</p><p><br></p>",
            ]);

        $response->assertRedirect();
        $response->assertSessionHasNoErrors();
        $this->sekolah->refresh();
        $this->assertSame('<p>PEMERINTAH KABUPATEN TOLITOLI</p>', $this->sekolah->kop_teks_html);

        // HTML yang kosong setelah sanitasi -> ditolak dengan error validasi
        $emptyResponse = $this->actingAs($this->bendahara)
            ->post(route('sekolah-profile.save-builder-kop', $this->sekolah->id), [
                'generated_kop' => UploadedFile::fake()->image('kop2.png', 200, 60),
                'kop_mode' => '2_logo',
                'kop_border' => 'double',
                'kop_teks_html' => "<p>\u{200B}</p><p><br></p>",
            ]);

        $emptyResponse->assertSessionHasErrors('kop_teks_html');
    }

    protected function extractDecodedPdfStreams(string $pdfBytes): string
    {
        preg_match_all('/stream\r?\n(.*?)\r?\nendstream/s', $pdfBytes, $matches);
        $decoded = [];
        foreach ($matches[1] ?? [] as $stream) {
            $content = @gzuncompress($stream);
            if ($content === false) {
                $content = @gzinflate($stream);
            }
            $decoded[] = is_string($content) ? $content : $stream;
        }

        return implode("\n", $decoded);
    }
}
