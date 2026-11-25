<?php

namespace App\Services;

use App\Config\VariantConfig;
use App\Models\Penganggaran;
use App\Models\RefPtk;
use App\Models\SekolahProfile;
use App\Models\SkDokumen;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpWord\Settings as PhpWordSettings;
use PhpOffice\PhpWord\TemplateProcessor;

class SkSuratTagService extends SpjDocxTemplateEngine
{
    /** @var array<string, array<int, string>> */
    public const TABLE_GROUP_KEYS = [
        'item' => [
            'item_no',
            'item_nama',
            'item_volume',
            'item_satuan',
            'item_kondisi',
            'item_harga',
            'item_harga_rupiah',
            'item_subtotal',
            'item_subtotal_rupiah',
        ],
        'ptk' => [
            'ptk_no',
            'ptk_nama_row',
            'ptk_nuptk_row',
            'ptk_uraian_arkas_row',
            'ptk_jenis_row',
            'ptk_jk_row',
            'ptk_masa_kerja_row',
            'ptk_sertifikasi_row',
        ],
        'belanja' => [
            'belanja_no',
            'belanja_tanggal',
            'belanja_no_bukti',
            'belanja_uraian',
            'belanja_toko',
            'belanja_penerima',
            'belanja_kode_kegiatan',
            'belanja_kode_rekening',
            'belanja_jumlah',
            'belanja_jumlah_rupiah',
            'belanja_pajak_rupiah',
            'belanja_bersih_rupiah',
        ],
    ];

    /**
     * Alias ramah pengguna (termasuk nama lama dari SkSuratService & Kwitansi/TandaTerima)
     * yang dipetakan ke canonical key agar tetap terisi otomatis.
     *
     * @var array<string, string>
     */
    public const TAG_ALIASES = [
        'alamat' => 'alamat_sekolah',
        'desa' => 'kelurahan_desa',
        'kelurahan' => 'kelurahan_desa',
        'kabupaten' => 'kabupaten_kota',
        'kota' => 'kabupaten_kota',
        'nama_kepala_sekolah' => 'kepala_sekolah',
        'nip_kepsek' => 'nip_kepala_sekolah',
        'nama_bendahara' => 'bendahara',
        'nama_komite' => 'komite',
        'tahun' => 'tahun_anggaran',
        'banyaknya' => 'volume',
        'qty' => 'volume',
        'kuantitas' => 'volume',
        'no_surat' => 'nomor_surat',
        'nomor' => 'nomor_surat',
        'tgl_surat' => 'tanggal_surat',
        'potongan_pajak' => 'total_pajak',
        'potongan_pajak_angka' => 'total_pajak_angka',
        'jumlah_diterima' => 'jumlah_bersih',
        'jumlah_diterima_rupiah' => 'jumlah_bersih_rupiah',
        'terbilang_diterima' => 'terbilang_bersih',
        'terbilang_diterima_title' => 'terbilang_bersih_title',
    ];

    /**
     * Katalog lengkap tag SK & Surat terstruktur per kategori.
     * Contoh nilai otomatis diperkaya dari data sekolah/penganggaran yang ada di DB.
     *
     * @return array<int, array{
     *   id: string,
     *   group: string,
     *   source: string,
     *   source_label: string,
     *   type: string,
     *   table_group?: string,
     *   description: string,
     *   items: array<int, array{key: string, tag: string, label: string, example: string, aliases?: array<int, string>}>
     * }>
     */
    public function variableCatalog(bool $withLiveExamples = true): array
    {
        $live = $withLiveExamples ? $this->buildLiveExampleValues() : [];

        $ex = static fn (string $key, string $fallback): string => isset($live[$key]) && trim((string) $live[$key]) !== '' && $live[$key] !== '-'
            ? (string) $live[$key]
            : $fallback;

        return [
            [
                'id' => 'sekolah',
                'group' => 'Identitas Sekolah',
                'source' => 'sekolah',
                'source_label' => 'Profil Sekolah',
                'type' => 'text',
                'description' => 'Terisi otomatis dari menu Profil Sekolah.',
                'items' => [
                    ['key' => 'nama_sekolah', 'tag' => '${nama_sekolah}', 'label' => 'Nama Sekolah', 'example' => $ex('nama_sekolah', 'SDN 1 Nusantara')],
                    ['key' => 'npsn', 'tag' => '${npsn}', 'label' => 'NPSN', 'example' => $ex('npsn', '20212345')],
                    ['key' => 'alamat_sekolah', 'tag' => '${alamat_sekolah}', 'label' => 'Alamat Sekolah', 'example' => $ex('alamat_sekolah', 'Jl. Pendidikan No. 10'), 'aliases' => ['alamat']],
                    ['key' => 'kelurahan_desa', 'tag' => '${kelurahan_desa}', 'label' => 'Kelurahan / Desa', 'example' => $ex('kelurahan_desa', 'Sukamaju'), 'aliases' => ['desa', 'kelurahan']],
                    ['key' => 'kecamatan', 'tag' => '${kecamatan}', 'label' => 'Kecamatan', 'example' => $ex('kecamatan', 'Cibeunying')],
                    ['key' => 'kabupaten_kota', 'tag' => '${kabupaten_kota}', 'label' => 'Kabupaten / Kota', 'example' => $ex('kabupaten_kota', 'Kab. Bandung'), 'aliases' => ['kabupaten', 'kota']],
                    ['key' => 'provinsi', 'tag' => '${provinsi}', 'label' => 'Provinsi', 'example' => $ex('provinsi', 'Jawa Barat')],
                    ['key' => 'status_sekolah', 'tag' => '${status_sekolah}', 'label' => 'Status Sekolah', 'example' => $ex('status_sekolah', 'Negeri')],
                    ['key' => 'jenjang_sekolah', 'tag' => '${jenjang_sekolah}', 'label' => 'Jenjang Sekolah', 'example' => $ex('jenjang_sekolah', 'SD')],
                ],
            ],
            [
                'id' => 'gambar',
                'group' => 'Gambar & Kop Surat',
                'source' => 'sekolah',
                'source_label' => 'Profil Sekolah (Gambar)',
                'type' => 'image',
                'description' => 'Disisipkan otomatis sebagai gambar dari Profil Sekolah. Bisa diberi ukuran manual mis. ${kop_surat:16cm} atau ${logo_sekolah:2.2cm:2.2cm}.',
                'items' => [
                    ['key' => 'kop_surat', 'tag' => '${kop_surat}', 'label' => 'Gambar Kop Surat Sekolah (lebar penuh)', 'example' => 'Gambar Kop Surat'],
                    ['key' => 'logo_sekolah', 'tag' => '${logo_sekolah}', 'label' => 'Logo Sekolah', 'example' => 'Gambar Logo Sekolah'],
                    ['key' => 'logo_daerah', 'tag' => '${logo_daerah}', 'label' => 'Logo Daerah / Dinas', 'example' => 'Gambar Logo Daerah'],
                ],
            ],
            [
                'id' => 'penganggaran',
                'group' => 'Penganggaran & Pengelola BOSP',
                'source' => 'penganggaran',
                'source_label' => 'Penganggaran BOSP',
                'type' => 'text',
                'description' => 'Menyesuaikan Varian BOSP (Reguler / Kinerja / SiLPA) & Tahun Anggaran yang dipilih saat membuat surat.',
                'items' => [
                    ['key' => 'sumber_dana', 'tag' => '${sumber_dana}', 'label' => 'Sumber Dana (Varian BOSP)', 'example' => $ex('sumber_dana', 'BOSP Reguler')],
                    ['key' => 'tahun_anggaran', 'tag' => '${tahun_anggaran}', 'label' => 'Tahun Anggaran', 'example' => $ex('tahun_anggaran', date('Y')), 'aliases' => ['tahun']],
                    ['key' => 'pagu_anggaran', 'tag' => '${pagu_anggaran}', 'label' => 'Pagu Anggaran (Angka)', 'example' => $ex('pagu_anggaran', '150.000.000')],
                    ['key' => 'pagu_anggaran_rupiah', 'tag' => '${pagu_anggaran_rupiah}', 'label' => 'Pagu Anggaran (Rp)', 'example' => $ex('pagu_anggaran_rupiah', 'Rp 150.000.000')],
                    ['key' => 'terbilang_pagu', 'tag' => '${terbilang_pagu}', 'label' => 'Terbilang Pagu Anggaran', 'example' => $ex('terbilang_pagu', 'Seratus lima puluh juta rupiah')],
                    ['key' => 'terbilang_pagu_title', 'tag' => '${terbilang_pagu_title}', 'label' => 'Terbilang Pagu (Kapital Awal)', 'example' => $ex('terbilang_pagu_title', 'Seratus Lima Puluh Juta Rupiah')],
                    ['key' => 'kepala_sekolah', 'tag' => '${kepala_sekolah}', 'label' => 'Nama Kepala Sekolah', 'example' => $ex('kepala_sekolah', 'Dra. Siti Aminah'), 'aliases' => ['nama_kepala_sekolah']],
                    ['key' => 'nip_kepala_sekolah', 'tag' => '${nip_kepala_sekolah}', 'label' => 'NIP Kepala Sekolah', 'example' => $ex('nip_kepala_sekolah', '197001011998022001'), 'aliases' => ['nip_kepsek']],
                    ['key' => 'sk_kepala_sekolah', 'tag' => '${sk_kepala_sekolah}', 'label' => 'Nomor SK Kepala Sekolah', 'example' => $ex('sk_kepala_sekolah', '821/01/2025')],
                    ['key' => 'tanggal_sk_kepala_sekolah', 'tag' => '${tanggal_sk_kepala_sekolah}', 'label' => 'Tanggal SK Kepala Sekolah', 'example' => $ex('tanggal_sk_kepala_sekolah', '02 Januari 2025')],
                    ['key' => 'bendahara', 'tag' => '${bendahara}', 'label' => 'Nama Bendahara', 'example' => $ex('bendahara', 'Budi Santoso, S.Pd'), 'aliases' => ['nama_bendahara']],
                    ['key' => 'nip_bendahara', 'tag' => '${nip_bendahara}', 'label' => 'NIP Bendahara', 'example' => $ex('nip_bendahara', '198505122010011005')],
                    ['key' => 'sk_bendahara', 'tag' => '${sk_bendahara}', 'label' => 'Nomor SK Bendahara', 'example' => $ex('sk_bendahara', '421/02/2026')],
                    ['key' => 'tanggal_sk_bendahara', 'tag' => '${tanggal_sk_bendahara}', 'label' => 'Tanggal SK Bendahara', 'example' => $ex('tanggal_sk_bendahara', '05 Januari 2026')],
                    ['key' => 'komite', 'tag' => '${komite}', 'label' => 'Nama Ketua Komite', 'example' => $ex('komite', 'H. Ahmad Fauzi'), 'aliases' => ['nama_komite']],
                ],
            ],
            [
                'id' => 'bku',
                'group' => 'Transaksi Belanja BKU (Tunggal)',
                'source' => 'bku',
                'source_label' => 'Belanja BKU',
                'type' => 'text',
                'description' => 'Terisi otomatis dari 1 transaksi belanja BKU yang dipilih (uraian, toko/penerima, kode kegiatan/rekening, nominal, pajak, & terbilang).',
                'items' => [
                    ['key' => 'no_bukti', 'tag' => '${no_bukti}', 'label' => 'Nomor Bukti / ID Transaksi', 'example' => 'BNU01'],
                    ['key' => 'tahap', 'tag' => '${tahap}', 'label' => 'Tahap Penyaluran', 'example' => 'THP-I'],
                    ['key' => 'uraian', 'tag' => '${uraian}', 'label' => 'Uraian Belanja Utama', 'example' => 'Pembelian ATK Bulanan'],
                    ['key' => 'uraian_bku', 'tag' => '${uraian_bku}', 'label' => 'Uraian BKU Asli', 'example' => 'Belanja Kertas HVS'],
                    ['key' => 'volume', 'tag' => '${volume}', 'label' => 'Volume / Banyaknya Utama', 'example' => '10', 'aliases' => ['banyaknya', 'qty', 'kuantitas']],
                    ['key' => 'satuan', 'tag' => '${satuan}', 'label' => 'Satuan Utama', 'example' => 'Rim'],
                    ['key' => 'harga_satuan', 'tag' => '${harga_satuan}', 'label' => 'Harga Satuan Utama (Angka)', 'example' => '150.000'],
                    ['key' => 'harga_satuan_rupiah', 'tag' => '${harga_satuan_rupiah}', 'label' => 'Harga Satuan Utama (Rp)', 'example' => 'Rp 150.000'],
                    ['key' => 'penerima', 'tag' => '${penerima}', 'label' => 'Nama Penerima Pembayaran', 'example' => 'CV. Sumber Makmur'],
                    ['key' => 'nama_toko', 'tag' => '${nama_toko}', 'label' => 'Nama Toko / Penyedia', 'example' => 'CV. Sumber Makmur'],
                    ['key' => 'alamat_toko', 'tag' => '${alamat_toko}', 'label' => 'Alamat Toko / Penyedia', 'example' => 'Jl. Merdeka No. 45'],
                    ['key' => 'npwp_toko', 'tag' => '${npwp_toko}', 'label' => 'NPWP Toko / Penyedia', 'example' => '01.234.567.8-901.000'],
                    ['key' => 'kode_kegiatan', 'tag' => '${kode_kegiatan}', 'label' => 'Kode Kegiatan Lengkap', 'example' => '06.05.01'],
                    ['key' => 'kode_program', 'tag' => '${kode_program}', 'label' => 'Kode Program', 'example' => '06'],
                    ['key' => 'program', 'tag' => '${program}', 'label' => 'Nama Program', 'example' => 'Pengembangan Standar Pengelolaan'],
                    ['key' => 'kode_sub_program', 'tag' => '${kode_sub_program}', 'label' => 'Kode Sub Program', 'example' => '06.05'],
                    ['key' => 'sub_program', 'tag' => '${sub_program}', 'label' => 'Nama Sub Program', 'example' => 'Pelaksanaan Administrasi Kegiatan'],
                    ['key' => 'uraian_kegiatan', 'tag' => '${uraian_kegiatan}', 'label' => 'Uraian Kegiatan', 'example' => 'Pembelian ATK'],
                    ['key' => 'kode_rekening', 'tag' => '${kode_rekening}', 'label' => 'Kode Rekening Belanja', 'example' => '5.1.02.01.01.0024'],
                    ['key' => 'rincian_objek', 'tag' => '${rincian_objek}', 'label' => 'Rincian Objek Belanja', 'example' => 'Belanja Alat/Bahan Kantor'],
                    ['key' => 'tanggal_transaksi', 'tag' => '${tanggal_transaksi}', 'label' => 'Tanggal Transaksi', 'example' => '15 Maret 2026'],
                    ['key' => 'bulan_transaksi', 'tag' => '${bulan_transaksi}', 'label' => 'Bulan Transaksi', 'example' => 'Maret'],
                    ['key' => 'tanggal_lunas', 'tag' => '${tanggal_lunas}', 'label' => 'Tanggal Lunas Bayar', 'example' => 'Lunas Bayar, 15 Maret 2026'],
                    ['key' => 'jumlah_angka', 'tag' => '${jumlah_angka}', 'label' => 'Jumlah Bruto (Angka)', 'example' => '1.500.000'],
                    ['key' => 'jumlah_rupiah', 'tag' => '${jumlah_rupiah}', 'label' => 'Jumlah Bruto (Rp)', 'example' => 'Rp 1.500.000'],
                    ['key' => 'terbilang', 'tag' => '${terbilang}', 'label' => 'Terbilang Jumlah Bruto', 'example' => 'Satu juta lima ratus ribu rupiah'],
                    ['key' => 'terbilang_title', 'tag' => '${terbilang_title}', 'label' => 'Terbilang Bruto (Kapital Awal)', 'example' => 'Satu Juta Lima Ratus Ribu Rupiah'],
                    ['key' => 'ppn', 'tag' => '${ppn}', 'label' => 'PPn (Rp)', 'example' => 'Rp 150.000'],
                    ['key' => 'ppn_angka', 'tag' => '${ppn_angka}', 'label' => 'PPn (Angka)', 'example' => '150.000'],
                    ['key' => 'pph', 'tag' => '${pph}', 'label' => 'PPh (Rp)', 'example' => 'Rp 30.000'],
                    ['key' => 'pph_angka', 'tag' => '${pph_angka}', 'label' => 'PPh (Angka)', 'example' => '30.000'],
                    ['key' => 'pb1', 'tag' => '${pb1}', 'label' => 'PB1 / Pajak Daerah (Rp)', 'example' => 'Rp 0'],
                    ['key' => 'pb1_angka', 'tag' => '${pb1_angka}', 'label' => 'PB1 / Pajak Daerah (Angka)', 'example' => '0'],
                    ['key' => 'total_pajak', 'tag' => '${total_pajak}', 'label' => 'Total Potongan Pajak (Rp)', 'example' => 'Rp 180.000', 'aliases' => ['potongan_pajak']],
                    ['key' => 'total_pajak_angka', 'tag' => '${total_pajak_angka}', 'label' => 'Total Potongan Pajak (Angka)', 'example' => '180.000', 'aliases' => ['potongan_pajak_angka']],
                    ['key' => 'jumlah_bersih', 'tag' => '${jumlah_bersih}', 'label' => 'Jumlah Bersih / Diterima (Angka)', 'example' => '1.320.000', 'aliases' => ['jumlah_diterima']],
                    ['key' => 'jumlah_bersih_rupiah', 'tag' => '${jumlah_bersih_rupiah}', 'label' => 'Jumlah Bersih / Diterima (Rp)', 'example' => 'Rp 1.320.000', 'aliases' => ['jumlah_diterima_rupiah']],
                    ['key' => 'terbilang_bersih', 'tag' => '${terbilang_bersih}', 'label' => 'Terbilang Jumlah Bersih', 'example' => 'Satu juta tiga ratus dua puluh ribu rupiah', 'aliases' => ['terbilang_diterima']],
                    ['key' => 'terbilang_bersih_title', 'tag' => '${terbilang_bersih_title}', 'label' => 'Terbilang Bersih (Kapital Awal)', 'example' => 'Satu Juta Tiga Ratus Dua Puluh Ribu Rupiah', 'aliases' => ['terbilang_diterima_title']],
                ],
            ],
            [
                'id' => 'penerimaan',
                'group' => 'Penerimaan Dana',
                'source' => 'penerimaan',
                'source_label' => 'Penerimaan Dana',
                'type' => 'text',
                'description' => 'Data penyaluran / penerimaan dana BOSP yang dipilih pada varian & tahun anggaran aktif.',
                'items' => [
                    ['key' => 'penerimaan_sumber', 'tag' => '${penerimaan_sumber}', 'label' => 'Keterangan Sumber Penerimaan', 'example' => 'BOSP Reguler Tahap 1'],
                    ['key' => 'penerimaan_tanggal', 'tag' => '${penerimaan_tanggal}', 'label' => 'Tanggal Terima Dana', 'example' => '20 Januari 2026'],
                    ['key' => 'penerimaan_jumlah', 'tag' => '${penerimaan_jumlah}', 'label' => 'Jumlah Dana Diterima (Angka)', 'example' => '75.000.000'],
                    ['key' => 'penerimaan_jumlah_rupiah', 'tag' => '${penerimaan_jumlah_rupiah}', 'label' => 'Jumlah Dana Diterima (Rp)', 'example' => 'Rp 75.000.000'],
                    ['key' => 'penerimaan_terbilang', 'tag' => '${penerimaan_terbilang}', 'label' => 'Terbilang Dana Diterima', 'example' => 'Tujuh puluh lima juta rupiah'],
                    ['key' => 'penerimaan_terbilang_title', 'tag' => '${penerimaan_terbilang_title}', 'label' => 'Terbilang Dana (Kapital Awal)', 'example' => 'Tujuh Puluh Lima Juta Rupiah'],
                    ['key' => 'penerimaan_saldo_awal', 'tag' => '${penerimaan_saldo_awal}', 'label' => 'Saldo Awal (Angka)', 'example' => '0'],
                    ['key' => 'penerimaan_saldo_awal_rupiah', 'tag' => '${penerimaan_saldo_awal_rupiah}', 'label' => 'Saldo Awal (Rp)', 'example' => 'Rp 0'],
                    ['key' => 'total_penerimaan_tahun', 'tag' => '${total_penerimaan_tahun}', 'label' => 'Total Penerimaan Tahun Ini (Angka)', 'example' => '150.000.000'],
                    ['key' => 'total_penerimaan_tahun_rupiah', 'tag' => '${total_penerimaan_tahun_rupiah}', 'label' => 'Total Penerimaan Tahun Ini (Rp)', 'example' => 'Rp 150.000.000'],
                ],
            ],
            [
                'id' => 'ptk',
                'group' => 'Data PTK / Guru & Tendik (Tunggal)',
                'source' => 'ptk',
                'source_label' => 'Data PTK',
                'type' => 'text',
                'description' => 'Terisi otomatis dari 1 orang PTK (Guru / Tendik / ASN) yang dipilih dari Master Data PTK.',
                'items' => [
                    ['key' => 'ptk_nama', 'tag' => '${ptk_nama}', 'label' => 'Nama Lengkap PTK', 'example' => 'Ahmad Hidayat, S.Pd'],
                    ['key' => 'ptk_nuptk', 'tag' => '${ptk_nuptk}', 'label' => 'NUPTK PTK', 'example' => '1234567890123456'],
                    ['key' => 'ptk_uraian_arkas', 'tag' => '${ptk_uraian_arkas}', 'label' => 'Format Nama (NUPTK)', 'example' => 'Ahmad Hidayat, S.Pd (1234567890123456)'],
                    ['key' => 'ptk_jenis', 'tag' => '${ptk_jenis}', 'label' => 'Jenis PTK', 'example' => 'Guru / Pendidik'],
                    ['key' => 'ptk_jenis_kelamin', 'tag' => '${ptk_jenis_kelamin}', 'label' => 'Jenis Kelamin', 'example' => 'Laki-laki'],
                    ['key' => 'ptk_masa_kerja', 'tag' => '${ptk_masa_kerja}', 'label' => 'Masa Kerja', 'example' => '5 Tahun 3 Bulan'],
                    ['key' => 'ptk_sertifikasi', 'tag' => '${ptk_sertifikasi}', 'label' => 'Status Sertifikasi', 'example' => 'Sudah Sertifikasi'],
                    ['key' => 'ptk_tahun', 'tag' => '${ptk_tahun}', 'label' => 'Tahun Data PTK', 'example' => date('Y')],
                ],
            ],
            [
                'id' => 'surat',
                'group' => 'Tanggal & Metadata Surat',
                'source' => 'surat',
                'source_label' => 'Metadata Surat',
                'type' => 'text',
                'description' => 'Terisi otomatis mengikuti Nomor Surat, Perihal, dan Tanggal Surat yang Anda pilih di bagian atas form.',
                'items' => [
                    ['key' => 'nomor_surat', 'tag' => '${nomor_surat}', 'label' => 'Nomor Surat', 'example' => '421/015/BOSP/2026'],
                    ['key' => 'perihal', 'tag' => '${perihal}', 'label' => 'Perihal / Judul Surat', 'example' => 'SK Tim Manajemen BOSP'],
                    ['key' => 'tanggal_surat', 'tag' => '${tanggal_surat}', 'label' => 'Tanggal Surat', 'example' => '25 November 2026'],
                    ['key' => 'hari_surat', 'tag' => '${hari_surat}', 'label' => 'Nama Hari Surat', 'example' => 'Rabu'],
                    ['key' => 'tanggal_surat_angka', 'tag' => '${tanggal_surat_angka}', 'label' => 'Tanggal (Angka Hari)', 'example' => '25'],
                    ['key' => 'tanggal_surat_terbilang', 'tag' => '${tanggal_surat_terbilang}', 'label' => 'Tanggal (Ejaan Huruf)', 'example' => 'dua puluh lima'],
                    ['key' => 'bulan_surat', 'tag' => '${bulan_surat}', 'label' => 'Nama Bulan Surat', 'example' => 'November'],
                    ['key' => 'tahun_surat', 'tag' => '${tahun_surat}', 'label' => 'Tahun Surat (Angka)', 'example' => '2026'],
                    ['key' => 'tahun_surat_terbilang', 'tag' => '${tahun_surat_terbilang}', 'label' => 'Tahun Surat (Ejaan Huruf)', 'example' => 'dua ribu dua puluh enam'],
                    ['key' => 'tanggal_surat_lengkap', 'tag' => '${tanggal_surat_lengkap}', 'label' => 'Kalimat Tanggal Berita Acara', 'example' => 'Rabu tanggal dua puluh lima bulan November tahun dua ribu dua puluh enam'],
                    ['key' => 'tempat_tanggal_surat', 'tag' => '${tempat_tanggal_surat}', 'label' => 'Tempat & Tanggal Surat', 'example' => $ex('kabupaten_kota', 'Bandung').', 25 November 2026'],
                ],
            ],
            [
                'id' => 'tabel_item',
                'group' => 'Tabel Rincian Barang BKU (Baris Dinamis)',
                'source' => 'bku',
                'source_label' => 'Belanja BKU (Tabel Item)',
                'type' => 'table',
                'table_group' => 'item',
                'description' => 'Letakkan 1 baris contoh di dalam tabel Word; baris otomatis digandakan sesuai rincian barang pada 1 transaksi BKU yang dipilih.',
                'items' => [
                    ['key' => 'item_no', 'tag' => '${item_no}', 'label' => 'Nomor Urut Item', 'example' => '1'],
                    ['key' => 'item_nama', 'tag' => '${item_nama}', 'label' => 'Nama / Uraian Barang', 'example' => 'Kertas HVS A4 70gr'],
                    ['key' => 'item_volume', 'tag' => '${item_volume}', 'label' => 'Volume / Qty', 'example' => '10'],
                    ['key' => 'item_satuan', 'tag' => '${item_satuan}', 'label' => 'Satuan', 'example' => 'Rim'],
                    ['key' => 'item_kondisi', 'tag' => '${item_kondisi}', 'label' => 'Kondisi Barang', 'example' => 'Baik'],
                    ['key' => 'item_harga', 'tag' => '${item_harga}', 'label' => 'Harga Satuan (Angka)', 'example' => '55.000'],
                    ['key' => 'item_harga_rupiah', 'tag' => '${item_harga_rupiah}', 'label' => 'Harga Satuan (Rp)', 'example' => 'Rp 55.000'],
                    ['key' => 'item_subtotal', 'tag' => '${item_subtotal}', 'label' => 'Subtotal Baris (Angka)', 'example' => '550.000'],
                    ['key' => 'item_subtotal_rupiah', 'tag' => '${item_subtotal_rupiah}', 'label' => 'Subtotal Baris (Rp)', 'example' => 'Rp 550.000'],
                ],
            ],
            [
                'id' => 'tabel_ptk',
                'group' => 'Tabel Daftar PTK Terpilih (Baris Dinamis)',
                'source' => 'ptk_list',
                'source_label' => 'Daftar PTK (Tabel)',
                'type' => 'table',
                'table_group' => 'ptk',
                'description' => 'Letakkan 1 baris contoh di dalam tabel Word (mis. lampiran SK Tim/Pembagian Tugas); otomatis digandakan sesuai daftar PTK yang dipilih.',
                'items' => [
                    ['key' => 'ptk_no', 'tag' => '${ptk_no}', 'label' => 'Nomor Urut PTK', 'example' => '1'],
                    ['key' => 'ptk_nama_row', 'tag' => '${ptk_nama_row}', 'label' => 'Nama PTK (Baris Tabel)', 'example' => 'Ahmad Hidayat, S.Pd'],
                    ['key' => 'ptk_nuptk_row', 'tag' => '${ptk_nuptk_row}', 'label' => 'NUPTK (Baris Tabel)', 'example' => '1234567890123456'],
                    ['key' => 'ptk_uraian_arkas_row', 'tag' => '${ptk_uraian_arkas_row}', 'label' => 'Nama (NUPTK) (Baris Tabel)', 'example' => 'Ahmad Hidayat, S.Pd (1234567890123456)'],
                    ['key' => 'ptk_jenis_row', 'tag' => '${ptk_jenis_row}', 'label' => 'Jenis PTK (Baris Tabel)', 'example' => 'Guru / Pendidik'],
                    ['key' => 'ptk_jk_row', 'tag' => '${ptk_jk_row}', 'label' => 'Jenis Kelamin (Baris Tabel)', 'example' => 'L'],
                    ['key' => 'ptk_masa_kerja_row', 'tag' => '${ptk_masa_kerja_row}', 'label' => 'Masa Kerja (Baris Tabel)', 'example' => '5 Thn 3 Bln'],
                    ['key' => 'ptk_sertifikasi_row', 'tag' => '${ptk_sertifikasi_row}', 'label' => 'Sertifikasi (Baris Tabel)', 'example' => 'Sudah'],
                ],
            ],
            [
                'id' => 'tabel_belanja',
                'group' => 'Tabel Daftar Beberapa Belanja BKU (Baris Dinamis)',
                'source' => 'bku_list',
                'source_label' => 'Daftar Belanja BKU (Tabel)',
                'type' => 'table',
                'table_group' => 'belanja',
                'description' => 'Letakkan 1 baris contoh di dalam tabel Word (mis. lampiran rekap beberapa nota belanja dalam 1 bulan/periode); otomatis digandakan sesuai transaksi yang dipilih.',
                'items' => [
                    ['key' => 'belanja_no', 'tag' => '${belanja_no}', 'label' => 'Nomor Urut Transaksi', 'example' => '1'],
                    ['key' => 'belanja_tanggal', 'tag' => '${belanja_tanggal}', 'label' => 'Tanggal Transaksi', 'example' => '15 Maret 2026'],
                    ['key' => 'belanja_no_bukti', 'tag' => '${belanja_no_bukti}', 'label' => 'No. Bukti', 'example' => 'BNU01'],
                    ['key' => 'belanja_uraian', 'tag' => '${belanja_uraian}', 'label' => 'Uraian Belanja', 'example' => 'Pembelian ATK Bulanan'],
                    ['key' => 'belanja_toko', 'tag' => '${belanja_toko}', 'label' => 'Toko / Penyedia', 'example' => 'CV. Sumber Makmur'],
                    ['key' => 'belanja_penerima', 'tag' => '${belanja_penerima}', 'label' => 'Penerima Pembayaran', 'example' => 'CV. Sumber Makmur'],
                    ['key' => 'belanja_kode_kegiatan', 'tag' => '${belanja_kode_kegiatan}', 'label' => 'Kode Kegiatan', 'example' => '06.05.01'],
                    ['key' => 'belanja_kode_rekening', 'tag' => '${belanja_kode_rekening}', 'label' => 'Kode Rekening', 'example' => '5.1.02.01.01.0024'],
                    ['key' => 'belanja_jumlah', 'tag' => '${belanja_jumlah}', 'label' => 'Jumlah Bruto (Angka)', 'example' => '1.500.000'],
                    ['key' => 'belanja_jumlah_rupiah', 'tag' => '${belanja_jumlah_rupiah}', 'label' => 'Jumlah Bruto (Rp)', 'example' => 'Rp 1.500.000'],
                    ['key' => 'belanja_pajak_rupiah', 'tag' => '${belanja_pajak_rupiah}', 'label' => 'Pajak (Rp)', 'example' => 'Rp 180.000'],
                    ['key' => 'belanja_bersih_rupiah', 'tag' => '${belanja_bersih_rupiah}', 'label' => 'Jumlah Bersih (Rp)', 'example' => 'Rp 1.320.000'],
                    ['key' => 'belanja_total_angka', 'tag' => '${belanja_total_angka}', 'label' => 'Total Semua Belanja Terpilih (Angka)', 'example' => '4.500.000'],
                    ['key' => 'belanja_total_rupiah', 'tag' => '${belanja_total_rupiah}', 'label' => 'Total Semua Belanja Terpilih (Rp)', 'example' => 'Rp 4.500.000'],
                    ['key' => 'belanja_total_terbilang', 'tag' => '${belanja_total_terbilang}', 'label' => 'Terbilang Total Belanja Terpilih', 'example' => 'Empat juta lima ratus ribu rupiah'],
                    ['key' => 'belanja_jumlah_transaksi', 'tag' => '${belanja_jumlah_transaksi}', 'label' => 'Banyaknya Transaksi Terpilih', 'example' => '3'],
                ],
            ],
        ];
    }

    /**
     * Peta cepat key (termasuk alias) -> metadata katalog.
     *
     * @return array<string, array{canonical: string, label: string, source: string, source_label: string, type: string, table_group: ?string}>
     */
    public function catalogIndex(): array
    {
        $index = [];
        foreach ($this->variableCatalog(false) as $group) {
            foreach ($group['items'] as $item) {
                $tableGroup = null;
                if (($group['type'] ?? '') === 'table') {
                    $tg = (string) ($group['table_group'] ?? '');
                    if ($tg !== '' && in_array($item['key'], self::TABLE_GROUP_KEYS[$tg] ?? [], true)) {
                        $tableGroup = $tg;
                    }
                }

                $entry = [
                    'canonical' => $item['key'],
                    'label' => $item['label'],
                    'source' => $group['source'],
                    'source_label' => $group['source_label'],
                    'type' => $tableGroup !== null ? 'table' : ($group['type'] === 'image' ? 'image' : 'text'),
                    'table_group' => $tableGroup,
                ];

                $index[$item['key']] = $entry;
                foreach ($item['aliases'] ?? [] as $alias) {
                    $index[$alias] = $entry;
                }
            }
        }

        foreach (self::TAG_ALIASES as $alias => $canonical) {
            if (! isset($index[$alias]) && isset($index[$canonical])) {
                $index[$alias] = $index[$canonical];
            }
        }

        return $index;
    }

    /**
     * Klasifikasikan seluruh tag terdeteksi dari sebuah template Word.
     *
     * @param  array<int, string>  $variables
     * @return array{
     *   system_text: array<int, array{raw: string, canonical: string, label: string, source: string, source_label: string}>,
     *   table_groups: array<string, array<int, string>>,
     *   image_vars: array<int, string>,
     *   manual_vars: array<int, string>,
     *   required_sources: array<int, string>
     * }
     */
    public function classifyTemplateVariables(array $variables): array
    {
        $index = $this->catalogIndex();
        $systemText = [];
        $tableGroups = [];
        $imageVars = [];
        $manualVars = [];
        $requiredSources = [];

        foreach ($variables as $rawVar) {
            $trimmed = trim((string) $rawVar);
            if ($trimmed === '') {
                continue;
            }

            $imageBase = $this->resolveImageVariableBaseKey($trimmed);
            if ($imageBase !== null) {
                $imageVars[$imageBase] = true;

                continue;
            }

            $normalized = $this->normalizeTagKey($trimmed);
            $meta = $index[$trimmed] ?? $index[$normalized] ?? null;

            if ($meta === null) {
                $manualVars[$trimmed] = true;

                continue;
            }

            if ($meta['type'] === 'table' && $meta['table_group'] !== null) {
                $tg = $meta['table_group'];
                $tableGroups[$tg][$trimmed] = true;
                $this->registerRequiredSource($requiredSources, $meta['source']);

                continue;
            }

            $systemText[] = [
                'raw' => $trimmed,
                'canonical' => $meta['canonical'],
                'label' => $meta['label'],
                'source' => $meta['source'],
                'source_label' => $meta['source_label'],
            ];
            $this->registerRequiredSource($requiredSources, $meta['source']);
        }

        $formattedTables = [];
        foreach ($tableGroups as $tg => $cols) {
            $formattedTables[$tg] = array_keys($cols);
        }

        return [
            'system_text' => $systemText,
            'table_groups' => $formattedTables,
            'image_vars' => array_keys($imageVars),
            'manual_vars' => array_keys($manualVars),
            'required_sources' => array_keys($requiredSources),
        ];
    }

    /**
     * Ambil opsi sumber data lintas 4 varian BOSP untuk picker di modal Buat/Edit Surat.
     *
     * @param  array<string, mixed>  $params
     * @return array<string, mixed>
     */
    public function getSourceOptions(array $params = []): array
    {
        $rawVariant = (string) ($params['variant'] ?? '');
        $variant = in_array($rawVariant, VariantConfig::VARIANTS, true)
            ? $rawVariant
            : VariantConfig::REGULER;

        $penganggaranClass = VariantConfig::getModelClass('penganggaran', $variant);
        $bkuClass = VariantConfig::getModelClass('bku', $variant);
        $penerimaanClass = VariantConfig::getModelClass('penerimaan_dana', $variant);
        $penganggaranFk = VariantConfig::penganggaranFk($variant);

        $penganggarans = $penganggaranClass::query()
            ->withCount([
                'bukuKasUmums as bku_count' => function ($q) {
                    $q->where(function ($sub) {
                        $sub->where('is_bunga_record', false)->orWhereNull('is_bunga_record');
                    })->where(function ($sub) {
                        $sub->where('total_transaksi_kotor', '>', 0)->orWhereHas('uraianDetails');
                    });
                },
                'penerimaanDanas as penerimaan_count',
            ])
            ->orderByDesc('tahun_anggaran')
            ->get([
                'id',
                'tahun_anggaran',
                'pagu_anggaran',
                'kepala_sekolah',
                'bendahara',
                'komite',
            ]);

        $selectedPenganggaranId = isset($params['penganggaran_id']) && is_numeric($params['penganggaran_id'])
            ? (int) $params['penganggaran_id']
            : null;

        $activePenganggaran = $selectedPenganggaranId !== null
            ? $penganggarans->firstWhere('id', $selectedPenganggaranId)
            : $this->pickSmartDefaultPenganggaran($penganggarans);

        $activePenganggaranId = $activePenganggaran?->id;
        $activeTahun = (int) ($params['tahun'] ?? $activePenganggaran?->tahun_anggaran ?? date('Y'));

        // Daftar Transaksi Belanja BKU (kecualikan catatan bunga bank & non-belanja nominal 0 tanpa detail)
        $bulanFilter = isset($params['bulan']) && is_numeric($params['bulan']) ? (int) $params['bulan'] : null;
        $search = trim((string) ($params['search'] ?? ''));

        $bkuList = [];
        if ($activePenganggaranId !== null) {
            $bkuQuery = $bkuClass::query()
                ->with(['kodeKegiatan', 'rekeningBelanja', 'uraianDetails'])
                ->where($penganggaranFk, $activePenganggaranId)
                ->where(function ($q) {
                    $q->where('is_bunga_record', false)->orWhereNull('is_bunga_record');
                })
                ->where(function ($q) {
                    $q->where('total_transaksi_kotor', '>', 0)
                        ->orWhereHas('uraianDetails');
                });

            if ($bulanFilter !== null && $bulanFilter >= 1 && $bulanFilter <= 12) {
                $bkuQuery->whereMonth('tanggal_transaksi', $bulanFilter);
            }

            if ($search !== '') {
                $like = '%'.strtolower($search).'%';
                $bkuQuery->where(function ($q) use ($like) {
                    $q->whereRaw('LOWER(COALESCE(uraian, \'\')) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(COALESCE(uraian_opsional, \'\')) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(COALESCE(id_transaksi, \'\')) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(COALESCE(nama_toko, \'\')) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(COALESCE(nama_penerima_pembayaran, \'\')) LIKE ?', [$like]);
                });
            }

            $bkuRows = $bkuQuery
                ->orderByDesc('tanggal_transaksi')
                ->orderByDesc('id')
                ->limit(150)
                ->get();

            foreach ($bkuRows as $bku) {
                $total = $this->resolveBkuTotalAmount($bku);
                $tgl = $bku->tanggal_transaksi ? Carbon::parse($bku->tanggal_transaksi) : null;
                $tglLabel = $tgl ? $tgl->format('d').' '.$this->formatBulanIndonesia($tgl->format('F')).' '.$tgl->format('Y') : '-';
                $uraian = trim((string) ($bku->uraian_opsional ?: $bku->uraian ?: '-'));
                $toko = trim((string) ($bku->nama_toko ?: $bku->nama_penerima_pembayaran ?: ''));
                $noBukti = trim((string) ($bku->id_transaksi ?: 'BKU-'.$bku->getKey()));

                $bkuList[] = [
                    'id' => $bku->getKey(),
                    'no_bukti' => $noBukti,
                    'tanggal' => $tglLabel,
                    'bulan' => $tgl ? (int) $tgl->month : null,
                    'uraian' => $uraian,
                    'toko' => $toko !== '' ? $toko : '-',
                    'kode_kegiatan' => (string) ($bku->kodeKegiatan?->kode ?? '-'),
                    'kode_rekening' => (string) ($bku->rekeningBelanja?->kode_rekening ?? '-'),
                    'total' => $total,
                    'total_rupiah' => $this->formatRupiah($total),
                    'items_count' => $bku->uraianDetails->count(),
                    'label' => "{$noBukti} | {$tglLabel} | {$uraian}".($toko !== '' ? " ({$toko})" : '').' — '.$this->formatRupiah($total),
                ];
            }
        }

        // Daftar Penerimaan Dana
        $penerimaanList = [];
        if ($activePenganggaranId !== null) {
            $penerimaans = $penerimaanClass::query()
                ->where($penganggaranFk, $activePenganggaranId)
                ->orderBy('tanggal_terima')
                ->get();

            foreach ($penerimaans as $p) {
                $tgl = $p->tanggal_terima ? Carbon::parse($p->tanggal_terima) : null;
                $tglLabel = $tgl ? $tgl->format('d').' '.$this->formatBulanIndonesia($tgl->format('F')).' '.$tgl->format('Y') : '-';
                $jumlah = (float) ($p->jumlah_dana ?? 0);
                $sumber = trim((string) ($p->sumber_dana ?: 'Penerimaan Dana'));

                $penerimaanList[] = [
                    'id' => $p->getKey(),
                    'sumber_dana' => $sumber,
                    'tanggal' => $tglLabel,
                    'jumlah' => $jumlah,
                    'jumlah_rupiah' => $this->formatRupiah($jumlah),
                    'label' => "{$sumber} ({$tglLabel}) — ".$this->formatRupiah($jumlah),
                ];
            }
        }

        // Daftar PTK (utamakan tahun aktif; jika kosong, fallback ke tahun terbaru yg tersedia di ref_ptks)
        $ptkYears = RefPtk::query()
            ->select('tahun')
            ->distinct()
            ->orderByDesc('tahun')
            ->pluck('tahun')
            ->map(fn ($y) => (int) $y)
            ->values()
            ->all();

        $ptkTahun = isset($params['ptk_tahun']) && is_numeric($params['ptk_tahun'])
            ? (int) $params['ptk_tahun']
            : (in_array($activeTahun, $ptkYears, true) ? $activeTahun : ($ptkYears[0] ?? $activeTahun));

        $ptkList = RefPtk::query()
            ->forYear($ptkTahun)
            ->where('is_active', true)
            ->orderBy('nama')
            ->get()
            ->map(fn (RefPtk $ptk) => [
                'id' => $ptk->id,
                'tahun' => $ptk->tahun,
                'nama' => $ptk->nama,
                'nuptk' => $ptk->nuptk ?: '-',
                'jenis' => $ptk->jenis_label,
                'jenis_ptk_arkas' => $ptk->jenis_ptk_arkas,
                'jenis_kelamin' => $ptk->jenis_kelamin ?: '-',
                'label' => $ptk->formatted_uraian_arkas.' — '.$ptk->jenis_label,
            ])
            ->values()
            ->all();

        $variants = [];
        foreach (VariantConfig::VARIANTS as $v) {
            $variants[] = [
                'value' => $v,
                'label' => VariantConfig::title($v),
            ];
        }

        return [
            'variants' => $variants,
            'active_variant' => $variant,
            'penganggarans' => $penganggarans->map(fn ($p) => [
                'id' => $p->getKey(),
                'tahun_anggaran' => (int) $p->tahun_anggaran,
                'pagu_anggaran' => (float) ($p->pagu_anggaran ?? 0),
                'pagu_anggaran_rupiah' => $this->formatRupiah((float) ($p->pagu_anggaran ?? 0)),
                'kepala_sekolah' => (string) ($p->kepala_sekolah ?? ''),
                'bendahara' => (string) ($p->bendahara ?? ''),
                'bku_count' => (int) ($p->bku_count ?? 0),
                'penerimaan_count' => (int) ($p->penerimaan_count ?? 0),
                'label' => 'TA '.$p->tahun_anggaran.' — '.$this->formatRupiah((float) ($p->pagu_anggaran ?? 0)).((int) ($p->bku_count ?? 0) > 0 ? ' ('.(int) $p->bku_count.' BKU)' : ''),
            ])->values()->all(),
            'active_penganggaran_id' => $activePenganggaranId,
            'bku_items' => $bkuList,
            'penerimaans' => $penerimaanList,
            'ptk_years' => $ptkYears,
            'active_ptk_tahun' => $ptkTahun,
            'ptks' => $ptkList,
        ];
    }

    /**
     * Resolusi seluruh nilai tag teks, baris tabel dinamis, dan gambar berdasarkan konteks sumber data.
     *
     * @param  array<string, mixed>  $context
     * @return array{
     *   text: array<string, string>,
     *   table_rows: array{item: array<int, array<string, string>>, ptk: array<int, array<string, string>>, belanja: array<int, array<string, string>>},
     *   images: array<string, ?string>,
     *   kop_border: string,
     *   resolved_context: array<string, mixed>
     * }
     */
    public function resolveTagValues(array $context = []): array
    {
        $sekolah = SekolahProfile::first();

        $rawVariant = (string) ($context['variant'] ?? '');
        $variant = in_array($rawVariant, VariantConfig::VARIANTS, true)
            ? $rawVariant
            : VariantConfig::REGULER;

        $penganggaranClass = VariantConfig::getModelClass('penganggaran', $variant);
        $bkuClass = VariantConfig::getModelClass('bku', $variant);
        $penerimaanClass = VariantConfig::getModelClass('penerimaan_dana', $variant);
        $penganggaranFk = VariantConfig::penganggaranFk($variant);

        $penganggaran = null;
        if (! empty($context['penganggaran_id']) && is_numeric($context['penganggaran_id'])) {
            $penganggaran = $penganggaranClass::find((int) $context['penganggaran_id']);
        }
        if (! $penganggaran) {
            $candidates = $penganggaranClass::query()
                ->withCount([
                    'bukuKasUmums as bku_count' => function ($q) {
                        $q->where(function ($sub) {
                            $sub->where('is_bunga_record', false)->orWhereNull('is_bunga_record');
                        })->where(function ($sub) {
                            $sub->where('total_transaksi_kotor', '>', 0)->orWhereHas('uraianDetails');
                        });
                    },
                    'penerimaanDanas as penerimaan_count',
                ])
                ->orderByDesc('tahun_anggaran')
                ->get();
            $penganggaran = $this->pickSmartDefaultPenganggaran($candidates);
        }

        $autoDefault = ! empty($context['auto_default']);
        $activeSources = is_array($context['required_sources'] ?? null)
            ? array_fill_keys(array_map('strval', $context['required_sources']), true)
            : [];

        // 1. Sekolah
        $text = [
            'nama_sekolah' => (string) ($sekolah?->nama_sekolah ?? ''),
            'npsn' => (string) ($sekolah?->npsn ?? ''),
            'alamat_sekolah' => (string) ($sekolah?->alamat ?? ''),
            'kelurahan_desa' => (string) ($sekolah?->kelurahan_desa ?? ''),
            'kecamatan' => (string) ($sekolah?->kecamatan ?? ''),
            'kabupaten_kota' => (string) ($sekolah?->kabupaten_kota ?? ''),
            'provinsi' => (string) ($sekolah?->provinsi ?? ''),
            'status_sekolah' => (string) ($sekolah?->status_sekolah ?? ''),
            'jenjang_sekolah' => (string) ($sekolah?->jenjang_sekolah ?? ''),
        ];

        // 2. Penganggaran & Pengelola BOSP
        $pagu = (float) ($penganggaran?->pagu_anggaran ?? 0);
        $terbilangPagu = $pagu > 0 ? $this->convertToText($pagu) : '';
        $tglSkKepsek = $penganggaran?->tanggal_sk_kepala_sekolah
            ? $this->formatDateIndonesia(Carbon::parse($penganggaran->tanggal_sk_kepala_sekolah))
            : '';
        $tglSkBendahara = $penganggaran?->tanggal_sk_bendahara
            ? $this->formatDateIndonesia(Carbon::parse($penganggaran->tanggal_sk_bendahara))
            : '';

        $text = array_merge($text, [
            'sumber_dana' => VariantConfig::title($variant),
            'tahun_anggaran' => (string) ($penganggaran?->tahun_anggaran ?? date('Y')),
            'pagu_anggaran' => $pagu > 0 ? $this->formatNumber($pagu) : '',
            'pagu_anggaran_rupiah' => $pagu > 0 ? $this->formatRupiah($pagu) : '',
            'terbilang_pagu' => $terbilangPagu,
            'terbilang_pagu_title' => $terbilangPagu !== '' ? ucwords(strtolower($terbilangPagu)) : '',
            'kepala_sekolah' => (string) ($penganggaran?->kepala_sekolah ?? ''),
            'nip_kepala_sekolah' => (string) ($penganggaran?->nip_kepala_sekolah ?? ''),
            'sk_kepala_sekolah' => (string) ($penganggaran?->sk_kepala_sekolah ?? ''),
            'tanggal_sk_kepala_sekolah' => $tglSkKepsek,
            'bendahara' => (string) ($penganggaran?->bendahara ?? ''),
            'nip_bendahara' => (string) ($penganggaran?->nip_bendahara ?? ''),
            'sk_bendahara' => (string) ($penganggaran?->sk_bendahara ?? ''),
            'tanggal_sk_bendahara' => $tglSkBendahara,
            'komite' => (string) ($penganggaran?->komite ?? ''),
        ]);

        // 3. Tanggal & Metadata Surat
        $tanggalSuratRaw = trim((string) ($context['tanggal_surat'] ?? ''));
        $tanggalSuratObj = null;
        if ($tanggalSuratRaw !== '') {
            try {
                $tanggalSuratObj = Carbon::parse($tanggalSuratRaw);
            } catch (\Throwable) {
                $tanggalSuratObj = null;
            }
        }
        $hariSurat = $tanggalSuratObj ? $this->formatHariIndonesia($tanggalSuratObj->format('l')) : '';
        $tglSuratAngka = $tanggalSuratObj ? (int) $tanggalSuratObj->format('j') : 0;
        $tglSuratTerbilang = $tanggalSuratObj ? trim($this->convertNumberToWords($tglSuratAngka)) : '';
        $bulanSurat = $tanggalSuratObj ? $this->formatBulanIndonesia($tanggalSuratObj->format('F')) : '';
        $tahunSuratAngka = $tanggalSuratObj ? (int) $tanggalSuratObj->format('Y') : 0;
        $tahunSuratTerbilang = $tanggalSuratObj ? trim($this->convertNumberToWords($tahunSuratAngka)) : '';
        $tanggalSuratStr = $tanggalSuratObj ? $this->formatDateIndonesia($tanggalSuratObj) : '';
        $tanggalSuratLengkap = $tanggalSuratObj
            ? "{$hariSurat} tanggal {$tglSuratTerbilang} bulan {$bulanSurat} tahun {$tahunSuratTerbilang}"
            : '';
        $tempat = trim((string) ($sekolah?->kabupaten_kota ?? ''));
        $tempatTanggalSurat = $tanggalSuratStr !== ''
            ? ($tempat !== '' ? "{$tempat}, {$tanggalSuratStr}" : $tanggalSuratStr)
            : '';

        if (array_key_exists('nomor_surat', $context) && trim((string) $context['nomor_surat']) !== '') {
            $text['nomor_surat'] = trim((string) $context['nomor_surat']);
        }
        if (array_key_exists('perihal', $context) && trim((string) $context['perihal']) !== '') {
            $text['perihal'] = trim((string) $context['perihal']);
        }
        if ($tanggalSuratObj !== null) {
            $text = array_merge($text, [
                'tanggal_surat' => $tanggalSuratStr,
                'hari_surat' => $hariSurat,
                'tanggal_surat_angka' => (string) $tglSuratAngka,
                'tanggal_surat_terbilang' => $tglSuratTerbilang,
                'bulan_surat' => $bulanSurat,
                'tahun_surat' => (string) $tahunSuratAngka,
                'tahun_surat_terbilang' => $tahunSuratTerbilang,
                'tanggal_surat_lengkap' => $tanggalSuratLengkap,
                'tempat_tanggal_surat' => $tempatTanggalSurat,
            ]);
        }

        // 4. Transaksi Belanja BKU (Tunggal + Tabel Item)
        $itemRows = [];
        $bkuId = ! empty($context['bku_id']) && is_numeric($context['bku_id']) ? (int) $context['bku_id'] : null;
        if ($bkuId === null && $autoDefault && isset($activeSources['bku']) && $penganggaran) {
            $defaultBku = $bkuClass::query()
                ->where($penganggaranFk, $penganggaran->getKey())
                ->where(function ($q) {
                    $q->where('is_bunga_record', false)->orWhereNull('is_bunga_record');
                })
                ->where(function ($q) {
                    $q->where('total_transaksi_kotor', '>', 0)->orWhereHas('uraianDetails');
                })
                ->orderByDesc('tanggal_transaksi')
                ->orderByDesc('id')
                ->first();
            $bkuId = $defaultBku?->getKey();
        }
        if ($bkuId !== null) {
            $bku = $bkuClass::with(['kodeKegiatan', 'rekeningBelanja', 'uraianDetails'])->find($bkuId);
            if ($bku) {
                $bkuPayload = $this->buildSingleBkuTagPayload($bku);
                $text = array_merge($text, $bkuPayload['text']);
                $itemRows = $bkuPayload['items'];
            }
        }

        // 5. Tabel Daftar Beberapa Transaksi Belanja BKU (Multi-BKU)
        $belanjaRows = [];
        $bkuIds = is_array($context['bku_ids'] ?? null)
            ? array_values(array_unique(array_filter(array_map('intval', $context['bku_ids']), fn ($id) => $id > 0)))
            : [];
        if ($bkuIds !== []) {
            $bkuRecords = $bkuClass::with(['kodeKegiatan', 'rekeningBelanja', 'uraianDetails'])
                ->whereIn('id', $bkuIds)
                ->orderBy('tanggal_transaksi')
                ->orderBy('id')
                ->get();

            $grandTotal = 0.0;
            foreach ($bkuRecords->values() as $idx => $rec) {
                $amount = $this->resolveBkuTotalAmount($rec);
                $pajakData = $this->klasifikasiPajak($rec, $amount);
                $totalPajak = (float) ($pajakData['total'] ?? 0);
                $bersih = max(0, $amount - $totalPajak);
                $grandTotal += $amount;

                $tglObj = $rec->tanggal_transaksi ? Carbon::parse($rec->tanggal_transaksi) : null;
                $uraian = trim((string) ($rec->uraian_opsional ?: $rec->uraian ?: '-'));
                $toko = trim((string) ($rec->nama_toko ?: '-'));
                $penerima = trim((string) ($rec->nama_penerima_pembayaran ?: $rec->nama_toko ?: '-'));

                $belanjaRows[] = [
                    'belanja_no' => (string) ($idx + 1),
                    'belanja_tanggal' => $tglObj ? $this->formatDateIndonesia($tglObj) : '-',
                    'belanja_no_bukti' => (string) ($rec->id_transaksi ?: 'BKU-'.$rec->getKey()),
                    'belanja_uraian' => $uraian,
                    'belanja_toko' => $toko,
                    'belanja_penerima' => $penerima,
                    'belanja_kode_kegiatan' => (string) ($rec->kodeKegiatan?->kode ?? '-'),
                    'belanja_kode_rekening' => (string) ($rec->rekeningBelanja?->kode_rekening ?? '-'),
                    'belanja_jumlah' => $this->formatNumber($amount),
                    'belanja_jumlah_rupiah' => $this->formatRupiah($amount),
                    'belanja_pajak_rupiah' => $totalPajak > 0 ? $this->formatRupiah($totalPajak) : '-',
                    'belanja_bersih_rupiah' => $this->formatRupiah($bersih),
                ];
            }

            $text = array_merge($text, [
                'belanja_total_angka' => $this->formatNumber($grandTotal),
                'belanja_total_rupiah' => $this->formatRupiah($grandTotal),
                'belanja_total_terbilang' => $this->convertToText($grandTotal),
                'belanja_jumlah_transaksi' => (string) count($belanjaRows),
            ]);
        }

        // 6. Penerimaan Dana
        if ($penganggaran) {
            $totalPenerimaanTahun = (float) $penerimaanClass::query()
                ->where($penganggaranFk, $penganggaran->getKey())
                ->sum('jumlah_dana');
            $text['total_penerimaan_tahun'] = $this->formatNumber($totalPenerimaanTahun);
            $text['total_penerimaan_tahun_rupiah'] = $this->formatRupiah($totalPenerimaanTahun);
        }

        $penerimaanId = ! empty($context['penerimaan_id']) && is_numeric($context['penerimaan_id'])
            ? (int) $context['penerimaan_id']
            : null;
        if ($penerimaanId === null && $autoDefault && isset($activeSources['penerimaan']) && $penganggaran) {
            $defaultPen = $penerimaanClass::query()
                ->where($penganggaranFk, $penganggaran->getKey())
                ->orderBy('tanggal_terima')
                ->first();
            $penerimaanId = $defaultPen?->getKey();
        }
        if ($penerimaanId !== null) {
            $penerimaan = $penerimaanClass::find($penerimaanId);
            if ($penerimaan) {
                $jml = (float) ($penerimaan->jumlah_dana ?? 0);
                $saldoAwal = (float) ($penerimaan->saldo_awal ?? 0);
                $terb = $this->convertToText($jml);
                $tglTerima = $penerimaan->tanggal_terima
                    ? $this->formatDateIndonesia(Carbon::parse($penerimaan->tanggal_terima))
                    : '-';

                $text = array_merge($text, [
                    'penerimaan_sumber' => (string) ($penerimaan->sumber_dana ?? '-'),
                    'penerimaan_tanggal' => $tglTerima,
                    'penerimaan_jumlah' => $this->formatNumber($jml),
                    'penerimaan_jumlah_rupiah' => $this->formatRupiah($jml),
                    'penerimaan_terbilang' => $terb,
                    'penerimaan_terbilang_title' => ucwords(strtolower($terb)),
                    'penerimaan_saldo_awal' => $this->formatNumber($saldoAwal),
                    'penerimaan_saldo_awal_rupiah' => $this->formatRupiah($saldoAwal),
                ]);
            }
        }

        // 7. Data PTK Tunggal
        $ptkId = ! empty($context['ptk_id']) && is_numeric($context['ptk_id']) ? (int) $context['ptk_id'] : null;
        if ($ptkId === null && $autoDefault && isset($activeSources['ptk'])) {
            $targetTahun = (int) ($penganggaran?->tahun_anggaran ?? date('Y'));
            $defaultPtk = RefPtk::query()
                ->forYear($targetTahun)
                ->where('is_active', true)
                ->orderBy('nama')
                ->first()
                ?? RefPtk::query()->where('is_active', true)->orderByDesc('tahun')->orderBy('nama')->first();
            $ptkId = $defaultPtk?->id;
        }
        if ($ptkId !== null) {
            $ptk = RefPtk::find($ptkId);
            if ($ptk) {
                $text = array_merge($text, [
                    'ptk_nama' => (string) $ptk->nama,
                    'ptk_nuptk' => (string) ($ptk->nuptk ?: '-'),
                    'ptk_uraian_arkas' => $ptk->formatted_uraian_arkas,
                    'ptk_jenis' => $ptk->jenis_label,
                    'ptk_jenis_kelamin' => $this->formatJenisKelamin($ptk->jenis_kelamin),
                    'ptk_masa_kerja' => $this->formatMasaKerja($ptk->masa_kerja_tahun, $ptk->masa_kerja_bulan),
                    'ptk_sertifikasi' => $ptk->pernah_sertifikasi ? 'Sudah Sertifikasi' : 'Belum Sertifikasi',
                    'ptk_tahun' => (string) $ptk->tahun,
                ]);
            }
        }

        // 8. Tabel Daftar PTK Terpilih (Multi-PTK)
        $ptkRows = [];
        $ptkIds = is_array($context['ptk_ids'] ?? null)
            ? array_values(array_unique(array_filter(array_map('intval', $context['ptk_ids']), fn ($id) => $id > 0)))
            : [];
        if ($ptkIds !== []) {
            $ptkMap = RefPtk::query()->whereIn('id', $ptkIds)->get()->keyBy('id');
            $orderedPtks = collect($ptkIds)->map(fn ($id) => $ptkMap->get($id))->filter()->values();

            foreach ($orderedPtks as $idx => $ptk) {
                $ptkRows[] = [
                    'ptk_no' => (string) ($idx + 1),
                    'ptk_nama_row' => (string) $ptk->nama,
                    'ptk_nuptk_row' => (string) ($ptk->nuptk ?: '-'),
                    'ptk_uraian_arkas_row' => $ptk->formatted_uraian_arkas,
                    'ptk_jenis_row' => $ptk->jenis_label,
                    'ptk_jk_row' => (string) ($ptk->jenis_kelamin ?: '-'),
                    'ptk_masa_kerja_row' => $this->formatMasaKerja($ptk->masa_kerja_tahun, $ptk->masa_kerja_bulan),
                    'ptk_sertifikasi_row' => $ptk->pernah_sertifikasi ? 'Sudah' : 'Belum',
                ];
            }
        }

        // 9. Populate semua alias agar key alias ikut terisi otomatis
        foreach (self::TAG_ALIASES as $alias => $canonical) {
            if (array_key_exists($canonical, $text) && ! array_key_exists($alias, $text)) {
                $text[$alias] = $text[$canonical];
            }
        }

        return [
            'text' => $text,
            'table_rows' => [
                'item' => $itemRows,
                'ptk' => $ptkRows,
                'belanja' => $belanjaRows,
            ],
            'images' => [
                'kop_surat' => $this->resolvePublicImagePath($sekolah?->kop_surat),
                'logo_sekolah' => $this->resolvePublicImagePath($sekolah?->logo_sekolah),
                'logo_daerah' => $this->resolvePublicImagePath($sekolah?->logo_daerah),
            ],
            'kop_border' => $this->resolveKopBorder($sekolah),
            'resolved_context' => [
                'variant' => $variant,
                'penganggaran_id' => $penganggaran?->getKey(),
                'bku_id' => $bkuId,
                'bku_ids' => $bkuIds,
                'penerimaan_id' => $penerimaanId,
                'ptk_id' => $ptkId,
                'ptk_ids' => $ptkIds,
            ],
        ];
    }

    /**
     * Kompilasi DOCX untuk SkDokumen dengan dukungan penuh:
     * - Keamanan arsip (.docm/ZIP bomb)
     * - Normalisasi tag lupa tutup (${terbilang)
     * - Multi-tabel baris dinamis (cloneRow) untuk item_*, ptk_*, belanja_*
     * - Injeksi gambar ${kop_surat}, ${logo_sekolah}, ${logo_daerah} + auto-fit margin & kop border
     * - Substitusi seluruh data_isian (sistem + override + manual)
     */
    public function compileSkDokumenDocx(SkDokumen $dokumen): string
    {
        $template = $dokumen->template;
        if (! $template) {
            throw new \RuntimeException('Dokumen tidak memiliki master template.');
        }

        $localDisk = Storage::disk('local');
        if (! $template->file_path || ! $localDisk->exists($template->file_path)) {
            throw new \RuntimeException('File master template tidak ditemukan di storage: '.$template->file_path);
        }

        $templatePath = $localDisk->path($template->file_path);

        try {
            $this->assertSafeDocxArchive($templatePath);
        } catch (\Throwable $e) {
            throw new \RuntimeException($e->getMessage(), 0, $e);
        }

        $tempDir = $this->ensureTempDir();
        $tempFilePath = $tempDir.DIRECTORY_SEPARATOR.'surat_'.uniqid('', true).'.docx';
        $normalizedTemplatePath = $this->skSuratService->createNormalizedTemplateIfNeeded($templatePath, $tempDir);

        $sumberData = is_array($dokumen->sumber_data) ? $dokumen->sumber_data : [];
        $tableRows = $this->resolveTableRowsForCompile($sumberData);

        // Jika dokumen menyimpan daftar enabled_tables secara eksplisit, hanya clone grup tabel yang diaktifkan pengguna
        if (array_key_exists('enabled_tables', $sumberData) && is_array($sumberData['enabled_tables'])) {
            $allowedTables = array_flip(array_map('strval', $sumberData['enabled_tables']));
            foreach (array_keys($tableRows) as $groupKey) {
                if (! isset($allowedTables[$groupKey])) {
                    $tableRows[$groupKey] = [];
                }
            }
        }

        $sekolah = SekolahProfile::first();
        $images = [
            'kop_surat' => $this->resolvePublicImagePath($sekolah?->kop_surat),
            'logo_sekolah' => $this->resolvePublicImagePath($sekolah?->logo_sekolah),
            'logo_daerah' => $this->resolvePublicImagePath($sekolah?->logo_daerah),
        ];

        // Jika dokumen menyimpan daftar enabled_images secara eksplisit, hanya sisipkan gambar yang diaktifkan pengguna
        if (array_key_exists('enabled_images', $sumberData) && is_array($sumberData['enabled_images'])) {
            $allowedImages = array_flip(array_map('strval', $sumberData['enabled_images']));
            foreach (array_keys($images) as $imgKey) {
                if (! isset($allowedImages[$imgKey])) {
                    $images[$imgKey] = null;
                }
            }
        }

        $kopBorder = $this->resolveKopBorder($sekolah);

        $previousEscaping = PhpWordSettings::isOutputEscapingEnabled();
        PhpWordSettings::setOutputEscapingEnabled(true);
        $processorTempFile = null;
        $saved = false;

        try {
            $sourceDocxPath = $normalizedTemplatePath ?? $templatePath;
            $processor = new TemplateProcessor($sourceDocxPath);
            $processorTempFile = $this->extractProcessorTempFilename($processor);
            $rawTemplateVars = $processor->getVariables();

            // 1. Proses ketiga jenis tabel baris dinamis secara independen (item_*, ptk_*, belanja_*)
            foreach (self::TABLE_GROUP_KEYS as $groupName => $groupKeys) {
                $rows = $tableRows[$groupName] ?? [];
                if (is_array($rows) && $rows !== []) {
                    $currentVars = $processor->getVariables();
                    $this->applyItemTableRows($processor, $currentVars, $rows, $groupKeys);
                }
            }

            // 2. Proses placeholder gambar (kop_surat, logo_sekolah, logo_daerah)
            $imageResult = $this->applyImagePlaceholders($processor, $processor->getVariables(), $images, $sourceDocxPath);
            $injectedImageKeys = $imageResult['injected_keys'];
            $centerKopParagraph = $imageResult['kop_landscape_capped'];

            // 3. Substitusi seluruh data_isian (sistem + override + manual)
            $dataIsian = is_array($dokumen->data_isian) ? $dokumen->data_isian : [];
            $postCloneVars = $processor->getVariables();

            foreach ($dataIsian as $key => $value) {
                $val = str_replace(["\r\n", "\r"], "\n", (string) ($value ?? ''));
                $processor->setValue((string) $key, $val);

                foreach ($rawTemplateVars as $rawVar) {
                    if ($rawVar !== $key && trim($rawVar) === trim((string) $key)) {
                        $processor->setValue($rawVar, $val);
                    }
                }
            }

            // Isi juga tag non-tabel yang ikut ter-clone menjadi tag#1, tag#2, dst.
            $primaryItems = $tableRows['item'] ?? [];
            if ($dataIsian !== []) {
                $stringMap = [];
                foreach ($dataIsian as $k => $v) {
                    $stringMap[(string) $k] = (string) ($v ?? '');
                }
                $this->applyClonedRowTextFallbacks($processor, $postCloneVars, $stringMap, $primaryItems);
            }

            $processor->saveAs($tempFilePath);

            // 4. Post-process VML namespace, kop landscape centering, dan garis kop_border
            if ($injectedImageKeys !== []) {
                $hasKopImage = in_array('kop_surat', $injectedImageKeys, true)
                    && is_string($images['kop_surat'] ?? null);
                $applyKopBorder = $hasKopImage
                    && in_array($kopBorder, ['double', 'single'], true);

                $this->postProcessInjectedImagesInDocx(
                    $tempFilePath,
                    $hasKopImage ? $images['kop_surat'] : null,
                    $applyKopBorder ? $kopBorder : 'none',
                    $centerKopParagraph
                );
            }

            $saved = true;
        } finally {
            PhpWordSettings::setOutputEscapingEnabled($previousEscaping);
            if ($normalizedTemplatePath !== null && is_file($normalizedTemplatePath)) {
                @unlink($normalizedTemplatePath);
            }
            if (! $saved) {
                if ($processorTempFile !== null && is_file($processorTempFile)) {
                    @unlink($processorTempFile);
                }
                if (is_file($tempFilePath)) {
                    @unlink($tempFilePath);
                }
            }
        }

        return $tempFilePath;
    }

    /**
     * @param  array<string, mixed>  $sumberData
     * @return array{item: array<int, array<string, string>>, ptk: array<int, array<string, string>>, belanja: array<int, array<string, string>>}
     */
    protected function resolveTableRowsForCompile(array $sumberData): array
    {
        $snapshot = is_array($sumberData['table_rows'] ?? null) ? $sumberData['table_rows'] : [];
        $hasSnapshot = ! empty($snapshot['item']) || ! empty($snapshot['ptk']) || ! empty($snapshot['belanja']);

        if ($hasSnapshot) {
            return [
                'item' => is_array($snapshot['item'] ?? null) ? $snapshot['item'] : [],
                'ptk' => is_array($snapshot['ptk'] ?? null) ? $snapshot['ptk'] : [],
                'belanja' => is_array($snapshot['belanja'] ?? null) ? $snapshot['belanja'] : [],
            ];
        }

        if (! empty($sumberData['bku_id']) || ! empty($sumberData['bku_ids']) || ! empty($sumberData['ptk_ids'])) {
            return $this->resolveTagValues($sumberData)['table_rows'];
        }

        return ['item' => [], 'ptk' => [], 'belanja' => []];
    }

    /**
     * @return array{text: array<string, string>, items: array<int, array<string, string>>}
     */
    protected function buildSingleBkuTagPayload(object $bku): array
    {
        $kodeKegiatan = $bku->kodeKegiatan;
        $rekening = $bku->rekeningBelanja;
        $parsedKode = $this->parseKodeKegiatan($kodeKegiatan);

        $totalAmount = $this->resolveBkuTotalAmount($bku);
        $pajakData = $this->klasifikasiPajak($bku, $totalAmount);
        $ppn = (float) ($pajakData['ppn'] ?? 0);
        $pph = (float) ($pajakData['pph'] ?? 0);
        $pb1 = (float) ($pajakData['pb1'] ?? 0);
        $totalPajak = $ppn + $pph + $pb1;
        $jumlahBersih = max(0, $totalAmount - $totalPajak);

        $terbilangBruto = $this->convertToText($totalAmount);
        $terbilangBersih = $this->convertToText($jumlahBersih);

        $tanggalObj = $bku->tanggal_transaksi ? Carbon::parse($bku->tanggal_transaksi) : null;
        $bulanIndo = $tanggalObj ? $this->formatBulanIndonesia($tanggalObj->format('F')) : '-';
        $tanggalTransaksi = $tanggalObj ? $this->formatDateIndonesia($tanggalObj) : '-';
        $tanggalLunas = $tanggalObj ? "Lunas Bayar, {$tanggalTransaksi}" : '-';
        $tahap = $tanggalObj ? ($tanggalObj->month <= 6 ? 'THP-I' : 'THP-II') : '-';

        $uraianUtama = trim((string) ($bku->uraian_opsional ?? '')) !== ''
            ? (string) $bku->uraian_opsional
            : (string) ($bku->uraian ?? '-');

        $penerima = trim((string) (
            $bku->nama_penerima_pembayaran
            ?: $bku->nama_toko
            ?: $bku->penerima
            ?: '-'
        ));

        $uraianDetails = $bku->uraianDetails ?? collect();
        $firstDetail = $uraianDetails->first();
        $mainVolume = $firstDetail ? $this->formatVolume((float) ($firstDetail->volume ?? 1)) : '1';
        $mainSatuan = (string) ($firstDetail?->satuan ?: 'Paket');
        $mainHarga = (float) ($firstDetail?->harga_satuan ?? $totalAmount);

        $text = [
            'no_bukti' => (string) ($bku->id_transaksi ?: 'BKU-'.$bku->getKey()),
            'tahap' => $tahap,
            'uraian' => $uraianUtama,
            'uraian_bku' => (string) ($bku->uraian ?? '-'),
            'volume' => $mainVolume,
            'satuan' => $mainSatuan,
            'harga_satuan' => $this->formatNumber($mainHarga),
            'harga_satuan_rupiah' => $this->formatRupiah($mainHarga),
            'penerima' => $penerima,
            'nama_toko' => (string) ($bku->nama_toko ?: '-'),
            'alamat_toko' => (string) ($bku->alamat_toko ?: '-'),
            'npwp_toko' => (string) ($bku->npwp ?: '-'),
            'kode_kegiatan' => (string) $parsedKode['kode_full'],
            'kode_program' => (string) $parsedKode['kode_program'],
            'program' => (string) $parsedKode['program'],
            'kode_sub_program' => (string) $parsedKode['kode_sub_program'],
            'sub_program' => (string) $parsedKode['sub_program'],
            'uraian_kegiatan' => (string) $parsedKode['uraian'],
            'kode_rekening' => (string) ($rekening?->kode_rekening ?? '-'),
            'rincian_objek' => (string) ($rekening?->rincian_objek ?? '-'),
            'tanggal_transaksi' => $tanggalTransaksi,
            'bulan_transaksi' => $bulanIndo,
            'tanggal_lunas' => $tanggalLunas,
            'jumlah_angka' => $this->formatNumber($totalAmount),
            'jumlah_rupiah' => $this->formatRupiah($totalAmount),
            'terbilang' => $terbilangBruto,
            'terbilang_title' => ucwords(strtolower($terbilangBruto)),
            'ppn' => $this->formatRupiah($ppn),
            'ppn_angka' => $this->formatNumber($ppn),
            'pph' => $this->formatRupiah($pph),
            'pph_angka' => $this->formatNumber($pph),
            'pb1' => $this->formatRupiah($pb1),
            'pb1_angka' => $this->formatNumber($pb1),
            'total_pajak' => $this->formatRupiah($totalPajak),
            'total_pajak_angka' => $this->formatNumber($totalPajak),
            'jumlah_bersih' => $this->formatNumber($jumlahBersih),
            'jumlah_bersih_rupiah' => $this->formatRupiah($jumlahBersih),
            'terbilang_bersih' => $terbilangBersih,
            'terbilang_bersih_title' => ucwords(strtolower($terbilangBersih)),
        ];

        $items = [];
        if ($uraianDetails->count() > 0) {
            foreach ($uraianDetails->values() as $idx => $detail) {
                $vol = (float) ($detail->volume ?? 0);
                $harga = (float) ($detail->harga_satuan ?? 0);
                $subtotal = $this->resolveDetailSubtotal($detail, $vol, $harga);

                $items[] = [
                    'item_no' => (string) ($idx + 1),
                    'item_nama' => (string) ($detail->uraian ?? $uraianUtama),
                    'item_volume' => $this->formatVolume($vol),
                    'item_satuan' => (string) ($detail->satuan ?? '-'),
                    'item_kondisi' => (string) ($detail->kondisi ?: 'Baik'),
                    'item_harga' => $this->formatNumber($harga),
                    'item_harga_rupiah' => $this->formatRupiah($harga),
                    'item_subtotal' => $this->formatNumber($subtotal),
                    'item_subtotal_rupiah' => $this->formatRupiah($subtotal),
                ];
            }
        } else {
            $items[] = [
                'item_no' => '1',
                'item_nama' => $uraianUtama,
                'item_volume' => '1',
                'item_satuan' => '-',
                'item_kondisi' => 'Baik',
                'item_harga' => $this->formatNumber($totalAmount),
                'item_harga_rupiah' => $this->formatRupiah($totalAmount),
                'item_subtotal' => $this->formatNumber($totalAmount),
                'item_subtotal_rupiah' => $this->formatRupiah($totalAmount),
            ];
        }

        return [
            'text' => $text,
            'items' => $items,
        ];
    }

    /**
     * @return array<string, string>
     */
    protected function buildLiveExampleValues(): array
    {
        $sekolah = SekolahProfile::first();
        $penganggaran = Penganggaran::query()->orderByDesc('tahun_anggaran')->first();
        $pagu = (float) ($penganggaran?->pagu_anggaran ?? 0);
        $terbilangPagu = $pagu > 0 ? $this->convertToText($pagu) : '';

        return [
            'nama_sekolah' => (string) ($sekolah?->nama_sekolah ?? ''),
            'npsn' => (string) ($sekolah?->npsn ?? ''),
            'alamat_sekolah' => (string) ($sekolah?->alamat ?? ''),
            'kelurahan_desa' => (string) ($sekolah?->kelurahan_desa ?? ''),
            'kecamatan' => (string) ($sekolah?->kecamatan ?? ''),
            'kabupaten_kota' => (string) ($sekolah?->kabupaten_kota ?? ''),
            'provinsi' => (string) ($sekolah?->provinsi ?? ''),
            'status_sekolah' => (string) ($sekolah?->status_sekolah ?? ''),
            'jenjang_sekolah' => (string) ($sekolah?->jenjang_sekolah ?? ''),
            'sumber_dana' => VariantConfig::title(VariantConfig::REGULER),
            'tahun_anggaran' => (string) ($penganggaran?->tahun_anggaran ?? date('Y')),
            'pagu_anggaran' => $pagu > 0 ? $this->formatNumber($pagu) : '',
            'pagu_anggaran_rupiah' => $pagu > 0 ? $this->formatRupiah($pagu) : '',
            'terbilang_pagu' => $terbilangPagu,
            'terbilang_pagu_title' => $terbilangPagu !== '' ? ucwords(strtolower($terbilangPagu)) : '',
            'kepala_sekolah' => (string) ($penganggaran?->kepala_sekolah ?? ''),
            'nip_kepala_sekolah' => (string) ($penganggaran?->nip_kepala_sekolah ?? ''),
            'sk_kepala_sekolah' => (string) ($penganggaran?->sk_kepala_sekolah ?? ''),
            'tanggal_sk_kepala_sekolah' => $penganggaran?->tanggal_sk_kepala_sekolah
                ? $this->formatDateIndonesia(Carbon::parse($penganggaran->tanggal_sk_kepala_sekolah))
                : '',
            'bendahara' => (string) ($penganggaran?->bendahara ?? ''),
            'nip_bendahara' => (string) ($penganggaran?->nip_bendahara ?? ''),
            'sk_bendahara' => (string) ($penganggaran?->sk_bendahara ?? ''),
            'tanggal_sk_bendahara' => $penganggaran?->tanggal_sk_bendahara
                ? $this->formatDateIndonesia(Carbon::parse($penganggaran->tanggal_sk_bendahara))
                : '',
            'komite' => (string) ($penganggaran?->komite ?? ''),
        ];
    }

    /**
     * Pilih tahun penganggaran secara cerdas bila pengguna belum memilih:
     * 1) Tahun berjalan yang sudah memiliki transaksi BKU / penerimaan dana
     * 2) Tahun terbaru mana pun yang sudah memiliki transaksi BKU / penerimaan dana
     * 3) Fallback ke penganggaran tahun tertinggi yang tersedia
     *
     * @param  Collection<int, mixed>  $penganggarans
     */
    protected function pickSmartDefaultPenganggaran($penganggarans): mixed
    {
        if ($penganggarans->isEmpty()) {
            return null;
        }

        $currentYear = (int) date('Y');
        $currentWithData = $penganggarans->first(
            fn ($p) => (int) $p->tahun_anggaran === $currentYear
                && (((int) ($p->bku_count ?? 0)) > 0 || ((int) ($p->penerimaan_count ?? 0)) > 0)
        );
        if ($currentWithData !== null) {
            return $currentWithData;
        }

        $latestWithData = $penganggarans->first(
            fn ($p) => ((int) ($p->bku_count ?? 0)) > 0 || ((int) ($p->penerimaan_count ?? 0)) > 0
        );
        if ($latestWithData !== null) {
            return $latestWithData;
        }

        return $penganggarans->firstWhere('tahun_anggaran', $currentYear) ?? $penganggarans->first();
    }

    protected function resolveBkuTotalAmount(object $bku): float
    {
        $fromDetails = $this->calculateTotalFromUraianDetails($bku);
        if ($fromDetails > 0) {
            return $fromDetails;
        }

        return (float) ($bku->total_transaksi_kotor ?? 0);
    }

    protected function formatDateIndonesia(Carbon $date): string
    {
        return $date->format('d').' '.$this->formatBulanIndonesia($date->format('F')).' '.$date->format('Y');
    }

    protected function formatJenisKelamin(?string $jk): string
    {
        return match (strtoupper(trim((string) $jk))) {
            'L' => 'Laki-laki',
            'P' => 'Perempuan',
            default => trim((string) $jk) !== '' ? (string) $jk : '-',
        };
    }

    protected function formatMasaKerja(?int $tahun, ?int $bulan): string
    {
        $t = max(0, (int) ($tahun ?? 0));
        $b = max(0, (int) ($bulan ?? 0));
        if ($t === 0 && $b === 0) {
            return '-';
        }
        if ($b === 0) {
            return "{$t} Tahun";
        }

        return "{$t} Tahun {$b} Bulan";
    }

    protected function normalizeTagKey(string $raw): string
    {
        $normalized = strtolower(trim($raw));
        $normalized = preg_replace('/[\s\-]+/', '_', $normalized) ?? $normalized;
        $normalized = preg_replace('/_+/', '_', $normalized) ?? $normalized;

        return trim($normalized, '_');
    }

    /**
     * @param  array<string, bool>  $requiredSources
     */
    protected function registerRequiredSource(array &$requiredSources, string $source): void
    {
        if (in_array($source, ['penganggaran', 'bku', 'bku_list', 'penerimaan', 'ptk', 'ptk_list'], true)) {
            $requiredSources[$source] = true;
            if (in_array($source, ['bku', 'bku_list', 'penerimaan'], true)) {
                $requiredSources['penganggaran'] = true;
            }
        }
    }
}
