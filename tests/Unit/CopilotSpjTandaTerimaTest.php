<?php

namespace Tests\Unit;

use App\Models\BukuKasUmum;
use App\Models\BukuKasUmumUraianDetail;
use App\Models\KodeKegiatan;
use App\Models\RekeningBelanja;
use App\Models\TandaTerima;
use App\Services\Ai\CopilotService;
use Tests\TestCase;

class CopilotSpjTandaTerimaTest extends TestCase
{
    protected CopilotService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = $this->app->make(CopilotService::class);
    }

    public function test_get_spj_document_detail_tanda_terima_structure(): void
    {
        // Mock data structure verification
        $bku = new BukuKasUmum([
            'id' => 999,
            'id_transaksi' => '063/BOSP/THP-II/2026',
            'tanggal_transaksi' => '2026-09-08',
            'uraian' => 'Lunas Bayar Belanja Jasa Tenaga Pendidikan / Honorarium Guru',
            'uraian_opsional' => 'Lunas Bayar Honor Guru Selpianti',
            'nama_penerima_pembayaran' => 'Selpianti',
            'total_transaksi_kotor' => 1449000,
            'total_pajak' => 0,
        ]);

        $rek = new RekeningBelanja([
            'kode_rekening' => '5.1.02.02.01.0013',
            'rincian_objek' => 'Belanja Jasa Tenaga Pendidikan / Honorarium Guru',
        ]);
        $keg = new KodeKegiatan([
            'kode' => '07.12.01',
            'uraian' => 'Pembayaran Honor Guru',
        ]);
        $bku->setRelation('rekeningBelanja', $rek);
        $bku->setRelation('kodeKegiatan', $keg);

        $detail = new BukuKasUmumUraianDetail([
            'uraian' => 'Selpianti',
            'volume' => 207,
            'satuan' => 'JP',
            'harga_satuan' => 7000,
            'jumlah' => 1449000,
        ]);
        $bku->setRelation('uraianDetails', collect([$detail]));

        $tt = new TandaTerima([
            'id' => 99,
            'buku_kas_umum_id' => 999,
        ]);
        $tt->setRelation('bukuKasUmum', $bku);

        $this->assertEquals('Selpianti', $bku->nama_penerima_pembayaran);
        $this->assertEquals(1449000, $bku->total_transaksi_kotor);
        $this->assertEquals('Pembayaran Honor Guru Selpianti', $this->service->formatUraianPembayaranReal($bku));
    }

    public function test_system_prompt_allows_flexible_greetings_and_forbids_personal_name(): void
    {
        $prompt = $this->service->buildSystemPrompt('reguler', 2026);

        $this->assertStringContainsString('DILARANG MENGGUNAKAN NAMA PRIBADI', $prompt);
        $this->assertStringContainsString('SEBUTAN & SAPAAN FLEKSIBEL', $prompt);
        $this->assertStringContainsString('DILARANG KERAS MENYATAKAN TAHAP 1 KOSONG DARI TANDA TERIMA!', $prompt);
        $this->assertStringContainsString('27 DOKUMEN TANDA TERIMA SAH', $prompt);
        $this->assertStringContainsString('LANGSUNG TAMPILKAN SELURUH 27 BARIS DOKUMEN TANDA TERIMA', $prompt);
    }

    public function test_get_available_tools_includes_tahap_parameter_in_get_spj_document_detail(): void
    {
        $tools = $this->service->getAvailableTools();

        $detailTool = null;
        foreach ($tools as $t) {
            if (($t['function']['name'] ?? '') === 'get_spj_document_detail') {
                $detailTool = $t;
                break;
            }
        }

        $this->assertNotNull($detailTool, 'Tool get_spj_document_detail harus terdaftar');
        $params = $detailTool['function']['parameters']['properties'] ?? [];
        $this->assertArrayHasKey('tahap', $params, 'Parameter tahap harus ada pada get_spj_document_detail');
        $this->assertEquals([1, 2], $params['tahap']['enum']);
    }

    public function test_system_prompt_includes_strict_zero_raw_json_rule(): void
    {
        $prompt = $this->service->buildSystemPrompt('reguler', 2026);

        $this->assertStringContainsString('STRICT ZERO RAW JSON RULE', $prompt);
        $this->assertStringContainsString('DILARANG KERAS mengembalikan atau mencetak teks berformat raw JSON', $prompt);
    }

    public function test_format_spj_document_html_renders_official_tanda_terima_table(): void
    {
        $mockJson = [
            'status' => 'success',
            'tipe_dokumen' => 'TANDA_TERIMA',
            'judul' => 'TANDA TERIMA PEMBAYARAN HONORARIUM / JASA',
            'nomor_dokumen' => '079/THP-II/BOSP/2026',
            'tanggal_dokumen' => '14 September 2026',
            'sekolah' => 'SD Negeri Gellengnge',
            'keperluan' => 'Pembayaran Belanja Transportasi kegiatan dalam kabupaten pergi pulang (PP)',
            'rekening' => '5.1.02.04.01.0003 - Belanja Perjalanan Dinas Dalam Kota / Dalam Daerah',
            'kegiatan' => '03.03.07. - Pelaksanaan Kegiatan Ekstrakurikuler (diluar Kepramukaan)',
            'daftar_penerima' => [
                [
                    'no' => 1,
                    'nama_penerima' => 'SUDARMIN',
                    'uraian' => 'Transportasi kegiatan dalam kabupaten pergi pulang (PP)',
                    'volume' => 3,
                    'satuan' => 'kegiatan',
                    'harga_satuan' => 150000,
                    'jumlah_bruto' => 450000,
                    'potongan_pajak' => 0,
                    'jumlah_diterima' => 450000,
                    'tanda_tangan' => '........................',
                ],
            ],
            'transaksi_lain_terkait' => [],
            'keuangan' => [
                'total_bruto' => 450000,
                'total_pajak' => 0,
                'total_neto' => 450000,
                'terbilang_bruto' => 'Empat Ratus Lima Puluh Ribu Rupiah',
                'terbilang_neto' => 'Empat Ratus Lima Puluh Ribu Rupiah',
            ],
            'tanda_tangan' => [
                'yang_menyerahkan' => 'RAHMI, A.Ma',
                'nip_bendahara' => '198105062007012012',
                'mengetahui' => 'SUDARMIN, S.Pd.I',
                'nip_kepala_sekolah' => '197205052011012001',
                'penerima' => 'SUDARMIN',
            ],
        ];

        $html = $this->service->formatSpjDocumentHtml($mockJson, 'reguler');

        $this->assertStringContainsString('TANDA TERIMA PEMBAYARAN HONORARIUM / JASA', $html);
        $this->assertStringContainsString('079/THP-II/BOSP/2026', $html);
        $this->assertStringContainsString('SD Negeri Gellengnge', $html);
        $this->assertStringContainsString('SUDARMIN', $html);
        $this->assertStringContainsString('Rp 450.000', $html);
        $this->assertStringContainsString('Empat Ratus Lima Puluh Ribu Rupiah', $html);
        $this->assertStringContainsString('RAHMI, A.Ma', $html);
        $this->assertStringContainsString('198105062007012012', $html);
        $this->assertStringContainsString('Fitur Pelengkap -> Tanda Terima', $html);
    }

    public function test_ensure_formatted_spj_content_intercepts_raw_json_string(): void
    {
        $rawJsonString = '{"status":"success","tipe_dokumen":"TANDA_TERIMA","judul":"TANDA TERIMA PEMBAYARAN HONORARIUM \/ JASA","nomor_dokumen":"079\/THP-II\/BOSP\/2026","tanggal_dokumen":"14 September 2026","sekolah":"SD Negeri Gellengnge","keperluan":"Pembayaran Belanja Transportasi kegiatan dalam kabupaten pergi pulang (PP)","rekening":"5.1.02.04.01.0003 - Belanja Perjalanan Dinas Dalam Kota \/ Dalam Daerah","kegiatan":"03.03.07. - Pelaksanaan Kegiatan Ekstrakurikuler (diluar Kepramukaan)","daftar_penerima":[{"no":1,"nama_penerima":"SUDARMIN","uraian":"Transportasi kegiatan dalam kabupaten pergi pulang (PP)","volume":3,"satuan":"kegiatan","harga_satuan":150000,"jumlah_bruto":450000,"potongan_pajak":0,"jumlah_diterima":450000,"tanda_tangan":"........................"}],"transaksi_lain_terkait":[],"keuangan":{"total_bruto":450000,"total_pajak":0,"total_neto":450000,"terbilang_bruto":"Empat Ratus Lima Puluh Ribu Rupiah","terbilang_neto":"Empat Ratus Lima Puluh Ribu Rupiah"},"tanda_tangan":{"yang_menyerahkan":"RAHMI, A.Ma","nip_bendahara":"198105062007012012","mengetahui":"SUDARMIN, S.Pd.I","nip_kepala_sekolah":"197205052011012001","penerima":"SUDARMIN"}}';

        $result = $this->service->ensureFormattedSpjContent($rawJsonString, 'reguler');

        $this->assertFalse(str_starts_with(trim($result), '{'), 'Hasil tidak boleh berupa JSON mentah diawali {');
        $this->assertStringContainsString('### 📝 TANDA TERIMA PEMBAYARAN HONORARIUM / JASA', $result);
        $this->assertStringContainsString('079/THP-II/BOSP/2026', $result);
        $this->assertStringContainsString('SUDARMIN', $result);
    }

    public function test_system_prompt_forbids_internal_url_paths(): void
    {
        $prompt = $this->service->buildSystemPrompt('reguler', 2026);

        $this->assertStringContainsString('STRICT ZERO INTERNAL URL PATH RULE', $prompt);
        $this->assertStringNotContainsString('menu `/penganggaran`', $prompt);
        $this->assertStringContainsString('Menu "Penganggaran" di sidebar', $prompt);
    }

    public function test_sanitize_response_text_sterilizes_internal_url_paths(): void
    {
        $raw = 'Om bisa buka `/penganggaran` lalu cek `/penatausahaan/bku/2026/Maret` untuk melihat rincian.';
        $sanitized = $this->service->sanitizeResponseText($raw);

        $this->assertStringNotContainsString('/penganggaran', $sanitized);
        $this->assertStringNotContainsString('/penatausahaan/bku', $sanitized);
        $this->assertStringContainsString('menu Penganggaran (RKAS)', $sanitized);
        $this->assertStringContainsString('menu Buku Kas Umum (BKU)', $sanitized);

        $rawRkas = 'Buka `/rkas-perubahan` atau `/rkas` untuk mengubah pagu.';
        $sanitizedRkas = $this->service->sanitizeResponseText($rawRkas);
        $this->assertStringNotContainsString('/rkas-perubahan', $sanitizedRkas);
        $this->assertStringNotContainsString('/rkas', $sanitizedRkas);
        $this->assertStringContainsString('menu RKAS Perubahan', $sanitizedRkas);
        $this->assertStringContainsString('menu RKAS', $sanitizedRkas);

        $rawBku = 'Buka `/bku` untuk input belanja.';
        $sanitizedBku = $this->service->sanitizeResponseText($rawBku);
        $this->assertStringNotContainsString('/bku', $sanitizedBku);
        $this->assertStringContainsString('menu Buku Kas Umum (BKU)', $sanitizedBku);
    }

    public function test_extract_action_buttons_always_returns_empty_array(): void
    {
        $content = 'Ini panduan [ACTION_BUTTON: {"label": "Buka", "url": "/penganggaran"}] silakan dicoba.';
        $buttons = $this->service->extractActionButtons($content, 'reguler', 2026);

        $this->assertEmpty($buttons, 'Action buttons harus kosong');
        $this->assertStringNotContainsString('ACTION_BUTTON', $content, 'Tag ACTION_BUTTON harus dibersihkan dari konten');
    }

    public function test_system_prompt_includes_detailed_school_profile_guide(): void
    {
        $prompt = $this->service->buildSystemPrompt('reguler', 2026);

        $this->assertStringContainsString('PANDUAN KHUSUS PENGISIAN PROFILE SEKOLAH', $prompt);
        $this->assertStringContainsString('Langkah ke 1 : Klik Fitur Profile sekolah di sidebar sebelah kiri', $prompt);
        $this->assertStringContainsString('Langkah ke 2 : input semua form yang di minta yaitu : Nama sekolah, NPSN, Status sekolah (Negeri atau swasta), Jenjang (SD, SMP, SMA, SMK), Provinsi, Kabupaten Kota, Kecamatan, kelurahan desa, alamat sekolah, upload kop sekolah', $prompt);
        $this->assertStringContainsString('2480 px', $prompt);
        $this->assertStringContainsString('588 px', $prompt);
        $this->assertStringContainsString('.jpg, .jpeg, .png', $prompt);
        $this->assertStringContainsString('Langkah ke 3 : klik simpan maka data akan tersimpan', $prompt);
        $this->assertStringContainsString('profile sekolah adalah langkah pertama wajib yang perlu di lakukan sebelum mengisi data lain', $prompt);
        $this->assertStringContainsString('seperti `/sekolah-profile`', $prompt);
    }

    public function test_system_prompt_includes_detailed_penganggaran_guide(): void
    {
        $prompt = $this->service->buildSystemPrompt('reguler', 2026);

        $this->assertStringContainsString('PANDUAN KHUSUS FITUR PENGANGGARAN', $prompt);
        $this->assertStringContainsString('BOSP Reguler, BOSP Kinerja, SiLPA BOSP Reguler, dan SiLPA BOSP Kinerja', $prompt);
        $this->assertStringContainsString('Langkah ke 1 : Klik fitur penganggaran di sisi sebelah kiri sidebar', $prompt);
        $this->assertStringContainsString('Langkah ke 2 : Pilih tab BOSP yang ingin di tambahkan Pagu Anggaran', $prompt);
        $this->assertStringContainsString('Langkah ke 3 : Di bagian atas kanan ada tombol buat anggaran baru', $prompt);
        $this->assertStringContainsString('Langkah ke 4 : Isi semua form yang di minta', $prompt);
        $this->assertStringContainsString('Langkah ke 5 : Klik simpan', $prompt);
        $this->assertStringContainsString('card rkas awal / murni yang menampilkan informasi rkas tahun anggaran dan pagu anggaran', $prompt);
        $this->assertStringContainsString('Menu edit : Berfungsi untuk melakukan pengeditan data anggaran', $prompt);
        $this->assertStringContainsString('Menu detail Rkas : Menu ini berfungsi untuk masuk kehalaman rkas', $prompt);
        $this->assertStringContainsString('Menu ringkasan & Cetak : Berfungsi untuk masuk ke halaman cetak', $prompt);
        $this->assertStringContainsString('Menu hapus : Berfungsi untuk menghapus data penganggaran rkas', $prompt);
        $this->assertStringContainsString('Harap berhati-hati saat menghapus karena semua data rkas yang di input akan ikut terhapus', $prompt);
    }

    public function test_system_prompt_includes_detailed_rkas_awal_murni_guide(): void
    {
        $prompt = $this->service->buildSystemPrompt('reguler', 2026);

        $this->assertStringContainsString('PANDUAN KHUSUS RKAS AWAL / MURNI & REKAPAN CETAK', $prompt);
        $this->assertStringContainsString('Rkas Awal / Murni', $prompt);
        $this->assertStringContainsString('pembagian anggaran tahap 1 50% dan tahap 2 50%', $prompt);
        $this->assertStringContainsString('Tambah Kegiatan', $prompt);
        $this->assertStringContainsString('Salin', $prompt);
        $this->assertStringContainsString('Tarik dari arkas online', $prompt);
        $this->assertStringContainsString('Buat perubahan', $prompt);
        $this->assertStringContainsString('Tombol cetak', $prompt);
        $this->assertStringContainsString('kegiatan perencanaan kalian', $prompt);
        $this->assertStringContainsString('kertas hvs', $prompt);
        $this->assertStringContainsString('80.000', $prompt);
        $this->assertStringContainsString('tambah bulan', $prompt);
        $this->assertStringContainsString('tombol titik tiga yang berisi menu edit, detail, dan sisipkan uraian', $prompt);
        $this->assertStringContainsString('hapus semua di bagian atas kotak tombol berwarna merah', $prompt);
        $this->assertStringContainsString('icon tong sampah atau icon x berwarna merah', $prompt);
        $this->assertStringContainsString('Kalian tidak bisa menghapus data atau mengedit uraian jika perencanaan belanja sudah di realisasikan pada BKU', $prompt);
        $this->assertStringContainsString('Menu sisipkan uraian', $prompt);
        $this->assertStringContainsString('Menu tanggal cetak', $prompt);
        $this->assertStringContainsString('Rka tahapan', $prompt);
        $this->assertStringContainsString('Rka Tahapan V.1', $prompt);
        $this->assertStringContainsString('Rka Rekap', $prompt);
        $this->assertStringContainsString('Lembar Kerja 221', $prompt);
        $this->assertStringContainsString('Rka Bulanan', $prompt);
        $this->assertStringContainsString('permendikdasmen nomor 8 tahun 2026', $prompt);
        $this->assertStringContainsString('RP (Rincian Pencairan / Payroll)', $prompt);
        $this->assertStringContainsString('Gabung Kegiatan', $prompt);
        $this->assertStringContainsString('Alur kas', $prompt);
    }

    public function test_system_prompt_includes_detailed_rkas_perubahan_guide(): void
    {
        $prompt = $this->service->buildSystemPrompt('reguler', 2026);

        $this->assertStringContainsString('PANDUAN KHUSUS RKAS PERUBAHAN & REKAPAN CETAK (LENGKAP 3 PILAR)', $prompt);
        $this->assertStringContainsString('Rkas Perubahan', $prompt);
        $this->assertStringContainsString('pembagian anggaran tahap 1 50% dan tahap 2 50%', $prompt);
        $this->assertStringContainsString('Tambah Kegiatan', $prompt);
        $this->assertStringContainsString('Tarik dari arkas online', $prompt);
        $this->assertStringContainsString('Rekaman perubahan', $prompt);
        $this->assertStringContainsString('riwayat perubahan yang telah di lakukan', $prompt);
        $this->assertStringContainsString('Tombol cetak', $prompt);
        $this->assertStringContainsString('kegiatan perencanaan kalian', $prompt);
        $this->assertStringContainsString('kertas hvs', $prompt);
        $this->assertStringContainsString('80.000', $prompt);
        $this->assertStringContainsString('tambah bulan', $prompt);
        $this->assertStringContainsString('tombol titik tiga yang berisi menu edit, detail, dan sisipkan uraian', $prompt);
        $this->assertStringContainsString('hapus semua di bagian atas kotak tombol berwarna merah', $prompt);
        $this->assertStringContainsString('icon tong sampah atau icon x berwarna merah', $prompt);
        $this->assertStringContainsString('Kalian tidak bisa menghapus data atau mengedit uraian jika perencanaan belanja sudah di realisasikan pada BKU', $prompt);
        $this->assertStringContainsString('Menu sisipkan uraian', $prompt);
        $this->assertStringContainsString('menu tanggal cetak perubahan', $prompt);
        $this->assertStringContainsString('Rka tahapan perubahan menampilkan rincian kegiatan sebelum perubahan, rincian kegiatan sesudah perubahan, bertambah dan berkurang', $prompt);
        $this->assertStringContainsString('Jumlah yang berkurang dan bertambah akan tampil dengan nilai yang sama (seimbang)', $prompt);
        $this->assertStringContainsString('Rka Tahapan V.1', $prompt);
        $this->assertStringContainsString('rka tahapan v.2', $prompt);
        $this->assertStringContainsString('Rka Rekap', $prompt);
        $this->assertStringContainsString('Lembar Kerja 221', $prompt);
        $this->assertStringContainsString('Rka Bulanan', $prompt);
        $this->assertStringContainsString('permendikdasmen nomor 8 tahun 2026', $prompt);
        $this->assertStringContainsString('RP (Rincian Pencairan / Payroll)', $prompt);
        $this->assertStringContainsString('Gabung Kegiatan', $prompt);
        $this->assertStringContainsString('Alur kas', $prompt);
    }

    public function test_system_prompt_includes_detailed_penatausahaan_guide(): void
    {
        $prompt = $this->service->buildSystemPrompt('reguler', 2026);

        $this->assertStringContainsString('PANDUAN KHUSUS FITUR PENATAUSAHAAN (AKTIVASI BKU, PENERIMAAN DANA, & KARTU BULAN)', $prompt);
        $this->assertStringContainsString('Penatausahaan', $prompt);
        $this->assertStringContainsString('Kartu bulan BKU akan terbuka jika RKAS sudah dibuat pada fitur Penganggaran', $prompt);
        $this->assertStringContainsString('BOSP Reguler, BOSP Kinerja, SiLPA BOSP Reguler, dan SiLPA BOSP Kinerja', $prompt);
        $this->assertStringContainsString('Tarik dari ARKAS', $prompt);
        $this->assertStringContainsString('Pastikan sebelum tarik data BKU dari ARKAS, data RKAS sudah ditarik terlebih dahulu dari ARKAS ke SIKAS', $prompt);
        $this->assertStringContainsString('Tambah Penerimaan Dana', $prompt);
        $this->assertStringContainsString('rekening koran bank sekolah', $prompt);
        $this->assertStringContainsString('portal BOSP Kemendikbudristek', $prompt);
        $this->assertStringContainsString('Saldo Awal', $prompt);
        $this->assertStringContainsString('Tombol Cetak', $prompt);
        $this->assertStringContainsString('Rekapitulasi Penutupan Kas', $prompt);
        $this->assertStringContainsString('Mekanisme Penguncian Berurutan (Rantai Buka-Kunci)', $prompt);
        $this->assertStringContainsString('Jika penerimaan dana Tahap 1 sudah diinput, maka kartu bulan Januari akan terbuka', $prompt);
        $this->assertStringContainsString('Syarat Wajib Bulan Juli (Tahap 2)', $prompt);
        $this->assertStringContainsString('Penerimaan Dana Tahap 2 Belum Ada', $prompt);
        $this->assertStringContainsString('5 Status Indikator pada Kartu Bulan', $prompt);
        $this->assertStringContainsString('Terkunci', $prompt);
        $this->assertStringContainsString('Belum di isi', $prompt);
        $this->assertStringContainsString('Draft', $prompt);
        $this->assertStringContainsString('Belum Lapor Pajak', $prompt);
        $this->assertStringContainsString('Selesai', $prompt);
    }

    public function test_system_prompt_includes_detailed_penginputan_bku_guide(): void
    {
        $prompt = $this->service->buildSystemPrompt('reguler', 2026);

        $this->assertStringContainsString('PANDUAN KHUSUS PENGINPUTAN BKU & HALAMAN CETAK LPJ (LENGKAP 3 PILAR)', $prompt);
        $this->assertStringContainsString('Penginputan BKU', $prompt);
        $this->assertStringContainsString('Total dana tersedia', $prompt);
        $this->assertStringContainsString('Bisa di belanjakan', $prompt);
        $this->assertStringContainsString('Sudah di belanjakan', $prompt);
        $this->assertStringContainsString('Bisa di anggarkan ulang', $prompt);
        $this->assertStringContainsString('Tarik tunai', $prompt);
        $this->assertStringContainsString('Setor tunai', $prompt);
        $this->assertStringContainsString('Hapus BKU', $prompt);
        $this->assertStringContainsString('Tarik dari arkas', $prompt);
        $this->assertStringContainsString('Analisis selisih AI', $prompt);
        $this->assertStringContainsString('Tutup BKU', $prompt);
        $this->assertStringContainsString('Tambah Pembelanjaan', $prompt);
        $this->assertStringContainsString('Bukan Toko / Perusahaan', $prompt);
        $this->assertStringContainsString('Asisten AI', $prompt);
        $this->assertStringContainsString('BPU-001', $prompt);
        $this->assertStringContainsString('Lapor Pajak', $prompt);
        $this->assertStringContainsString('NTPN', $prompt);
        $this->assertStringContainsString('Buku Kas Bank (BKP Bank)', $prompt);
        $this->assertStringContainsString('Pra audit', $prompt);
        $this->assertStringContainsString('Check Saldo Awal', $prompt);
        $this->assertStringContainsString('Check STS', $prompt);
        $this->assertStringContainsString('Buku Kas Pembantu Tunai', $prompt);
        $this->assertStringContainsString('Buku Kas Umum (BKU)', $prompt);
        $this->assertStringContainsString('Buku Kas Pajak (BKP Pajak)', $prompt);
        $this->assertStringContainsString('ROB (Rincian Objek Belanja)', $prompt);
        $this->assertStringContainsString('Registrasi Penutupan Kas', $prompt);
        $this->assertStringContainsString('Berita Acara Penutupan Kas', $prompt);
        $this->assertStringContainsString('Realisasi', $prompt);
        $this->assertStringContainsString('Rek. Realisasi', $prompt);
        $this->assertStringContainsString('BHP (Belanja Habis Pakai)', $prompt);
        $this->assertStringContainsString('BHM (Belanja Modal)', $prompt);
    }
}
