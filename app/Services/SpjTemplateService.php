<?php

namespace App\Services;

use App\Config\VariantConfig;
use App\Exceptions\KwitansiTemplateException;
use App\Models\SekolahProfile;
use App\Models\SpjTemplate;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use PhpOffice\PhpWord\PhpWord;
use PhpOffice\PhpWord\SimpleType\Jc;

class SpjTemplateService extends SpjDocxTemplateEngine
{
    /** @var array<string, array<int, string>> */
    public const ITEM_TABLE_VARIABLES_BY_TYPE = [
        SpjTemplate::TYPE_TANDA_TERIMA => [
            'item_no',
            'item_nama',
            'item_penerima',
            'item_volume',
            'item_satuan',
            'item_harga',
            'item_harga_rupiah',
            'item_subtotal',
            'item_subtotal_rupiah',
            'item_pajak',
            'item_pajak_rupiah',
            'item_bersih',
            'item_bersih_rupiah',
        ],
        SpjTemplate::TYPE_BAST => [
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
        SpjTemplate::TYPE_SURAT_PESANAN => [
            'item_no',
            'item_nama',
            'item_volume',
            'item_satuan',
            'item_harga',
            'item_harga_rupiah',
            'item_subtotal',
            'item_subtotal_rupiah',
        ],
    ];

    public function assertValidType(string $type): void
    {
        if (! in_array($type, SpjTemplate::TYPES, true)) {
            throw new KwitansiTemplateException('Jenis dokumen template tidak dikenali.');
        }
    }

    /**
     * Katalog variabel lengkap per jenis dokumen SPJ.
     *
     * @return array<int, array{group: string, type: string, description: string, items: array<int, array{key: string, tag: string, label: string, example: string}>}>
     */
    public function variableCatalog(string $type): array
    {
        $this->assertValidType($type);

        return match ($type) {
            SpjTemplate::TYPE_TANDA_TERIMA => $this->tandaTerimaCatalog(),
            SpjTemplate::TYPE_BAST => $this->bastCatalog(),
            SpjTemplate::TYPE_SURAT_PESANAN => $this->suratPesananCatalog(),
        };
    }

    /**
     * @return array<int, string>
     */
    public function recognizedVariableKeys(string $type): array
    {
        $keys = [];
        foreach ($this->variableCatalog($type) as $group) {
            foreach ($group['items'] as $item) {
                $keys[] = $item['key'];
            }
        }

        return $keys;
    }

    /**
     * @return array<int, string>
     */
    public function itemTableKeysForType(string $type): array
    {
        $this->assertValidType($type);

        return self::ITEM_TABLE_VARIABLES_BY_TYPE[$type];
    }

    /**
     * @return array{recognized: array<int, string>, unrecognized: array<int, string>, unclosed: array<int, string>, item_table_vars: array<int, string>, image_vars: array<int, string>, has_item_table: bool}
     *
     * @throws KwitansiTemplateException
     */
    public function analyzeTemplateFile(string $fullPath, string $type): array
    {
        $this->assertValidType($type);

        return $this->analyzeTemplateFileAgainstKeys(
            $fullPath,
            $this->recognizedVariableKeys($type),
            $this->itemTableKeysForType($type)
        );
    }

    /**
     * Kompilasi 1 dokumen SPJ menjadi file .docx temporer.
     *
     * @throws KwitansiTemplateException
     */
    public function compileSingleDocx(SpjTemplate $template, Model $record, string $variant): string
    {
        $type = (string) $template->document_type;
        $this->assertValidType($type);

        $payload = $this->buildDocumentVariables($type, $record, $variant);

        return $this->compileDocxFromPayload(
            $template->file_path,
            $payload,
            $this->itemTableKeysForType($type),
            $type.'_custom_',
            'File template '.SpjTemplate::labelForType($type).' tidak ditemukan di penyimpanan.'
        );
    }

    /**
     * Kompilasi banyak dokumen SPJ (mis. Download All Tanda Terima) menjadi 1 file .docx multipage.
     *
     * @param  Collection<int, Model>  $records
     *
     * @throws KwitansiTemplateException
     */
    public function compileBulkDocx(SpjTemplate $template, Collection $records, string $variant): string
    {
        $type = (string) $template->document_type;
        $this->assertValidType($type);

        if ($records->isEmpty()) {
            throw new KwitansiTemplateException('Tidak ada data '.SpjTemplate::labelForType($type).' untuk dikompilasi.');
        }

        if ($records->count() === 1) {
            return $this->compileSingleDocx($template, $records->first(), $variant);
        }

        $compiledPaths = [];
        try {
            foreach ($records as $record) {
                $compiledPaths[] = $this->compileSingleDocx($template, $record, $variant);
            }

            return $this->mergeCompiledDocxFiles($compiledPaths);
        } finally {
            foreach ($compiledPaths as $path) {
                if (is_file($path)) {
                    @unlink($path);
                }
            }
        }
    }

    /**
     * Petakan model dokumen (TandaTerima / Bast / SuratPesanan) ke payload text, items, images, kop_border.
     *
     * @return array{text: array<string, string>, items: array<int, array<string, string>>, images: array<string, ?string>, kop_border: string}
     */
    public function buildDocumentVariables(string $type, Model $record, string $variant): array
    {
        $this->assertValidType($type);

        return match ($type) {
            SpjTemplate::TYPE_TANDA_TERIMA => $this->buildTandaTerimaVariables($record, $variant),
            SpjTemplate::TYPE_BAST => $this->buildBastVariables($record, $variant),
            SpjTemplate::TYPE_SURAT_PESANAN => $this->buildSuratPesananVariables($record, $variant),
        };
    }

    /**
     * Buat contoh file template .docx siap edit untuk jenis dokumen tertentu.
     */
    public function generateSampleDocx(string $type): string
    {
        $this->assertValidType($type);

        return match ($type) {
            SpjTemplate::TYPE_TANDA_TERIMA => $this->generateTandaTerimaSampleDocx(),
            SpjTemplate::TYPE_BAST => $this->generateBastSampleDocx(),
            SpjTemplate::TYPE_SURAT_PESANAN => $this->generateSuratPesananSampleDocx(),
        };
    }

    // -------------------------------------------------------------------------
    // Variable Catalogs
    // -------------------------------------------------------------------------

    /**
     * @return array{group: string, type: string, description: string, items: array<int, array{key: string, tag: string, label: string, example: string}>}
     */
    protected function schoolIdentityCatalogGroup(): array
    {
        return [
            'group' => 'Identitas Sekolah',
            'type' => 'text',
            'description' => 'Diambil otomatis dari Profil Sekolah.',
            'items' => [
                ['key' => 'nama_sekolah', 'tag' => '${nama_sekolah}', 'label' => 'Nama Sekolah', 'example' => 'SDN 1 Nusantara'],
                ['key' => 'npsn', 'tag' => '${npsn}', 'label' => 'NPSN', 'example' => '20212345'],
                ['key' => 'alamat_sekolah', 'tag' => '${alamat_sekolah}', 'label' => 'Alamat Sekolah', 'example' => 'Jl. Pendidikan No. 10'],
                ['key' => 'kelurahan_desa', 'tag' => '${kelurahan_desa}', 'label' => 'Kelurahan / Desa', 'example' => 'Sukamaju'],
                ['key' => 'kecamatan', 'tag' => '${kecamatan}', 'label' => 'Kecamatan', 'example' => 'Cibeunying'],
                ['key' => 'kabupaten_kota', 'tag' => '${kabupaten_kota}', 'label' => 'Kabupaten / Kota', 'example' => 'Kab. Bandung'],
                ['key' => 'provinsi', 'tag' => '${provinsi}', 'label' => 'Provinsi', 'example' => 'Jawa Barat'],
                ['key' => 'status_sekolah', 'tag' => '${status_sekolah}', 'label' => 'Status Sekolah', 'example' => 'Negeri'],
                ['key' => 'jenjang_sekolah', 'tag' => '${jenjang_sekolah}', 'label' => 'Jenjang Sekolah', 'example' => 'SD'],
            ],
        ];
    }

    /**
     * @return array<int, array{group: string, type: string, description: string, items: array<int, array{key: string, tag: string, label: string, example: string}>}>
     */
    protected function tandaTerimaCatalog(): array
    {
        return [
            $this->schoolIdentityCatalogGroup(),
            [
                'group' => 'Anggaran & Kode',
                'type' => 'text',
                'description' => 'Menyesuaikan varian BOSP (Reguler / Kinerja / SiLPA) & penganggaran aktif.',
                'items' => [
                    ['key' => 'tahun_anggaran', 'tag' => '${tahun_anggaran}', 'label' => 'Tahun Anggaran', 'example' => '2026'],
                    ['key' => 'sumber_dana', 'tag' => '${sumber_dana}', 'label' => 'Sumber Dana (Varian)', 'example' => 'BOSP Reguler'],
                    ['key' => 'tahap', 'tag' => '${tahap}', 'label' => 'Tahap Penyaluran', 'example' => 'THP-I'],
                    ['key' => 'no_bukti', 'tag' => '${no_bukti}', 'label' => 'Nomor Bukti / ID Transaksi', 'example' => 'BNU01'],
                    ['key' => 'kode_kegiatan', 'tag' => '${kode_kegiatan}', 'label' => 'Kode Kegiatan Lengkap', 'example' => '07.12.01'],
                    ['key' => 'kode_program', 'tag' => '${kode_program}', 'label' => 'Kode Program', 'example' => '07'],
                    ['key' => 'program', 'tag' => '${program}', 'label' => 'Nama Program', 'example' => 'Pengembangan Standar Pembiayaan'],
                    ['key' => 'kode_sub_program', 'tag' => '${kode_sub_program}', 'label' => 'Kode Sub Program', 'example' => '07.12'],
                    ['key' => 'sub_program', 'tag' => '${sub_program}', 'label' => 'Nama Sub Program', 'example' => 'Pembayaran Honor'],
                    ['key' => 'uraian_kegiatan', 'tag' => '${uraian_kegiatan}', 'label' => 'Uraian Kegiatan', 'example' => 'Pembayaran Honor Guru'],
                    ['key' => 'kode_rekening', 'tag' => '${kode_rekening}', 'label' => 'Kode Rekening Belanja', 'example' => '5.1.02.02.01.0013'],
                    ['key' => 'rincian_objek', 'tag' => '${rincian_objek}', 'label' => 'Rincian Objek Belanja', 'example' => 'Belanja Jasa Tenaga Pendidikan'],
                ],
            ],
            [
                'group' => 'Transaksi, Honor & Pajak',
                'type' => 'text',
                'description' => 'Data penerima, volume/satuan utama, jumlah bruto, potongan pajak, dan jumlah diterima bersih.',
                'items' => [
                    ['key' => 'uraian', 'tag' => '${uraian}', 'label' => 'Uraian Pembayaran', 'example' => 'Honor Guru Honorer Bulan Maret'],
                    ['key' => 'uraian_bku', 'tag' => '${uraian_bku}', 'label' => 'Uraian BKU Asli', 'example' => 'Pembayaran Honor'],
                    ['key' => 'penerima', 'tag' => '${penerima}', 'label' => 'Nama Penerima', 'example' => 'Ahmad Hidayat, S.Pd'],
                    ['key' => 'volume', 'tag' => '${volume}', 'label' => 'Volume Utama', 'example' => '1'],
                    ['key' => 'satuan', 'tag' => '${satuan}', 'label' => 'Satuan Utama', 'example' => 'OB'],
                    ['key' => 'harga_satuan', 'tag' => '${harga_satuan}', 'label' => 'Harga Satuan Utama (Angka)', 'example' => '1.000.000'],
                    ['key' => 'harga_satuan_rupiah', 'tag' => '${harga_satuan_rupiah}', 'label' => 'Harga Satuan Utama (Rp)', 'example' => 'Rp 1.000.000'],
                    ['key' => 'jumlah_angka', 'tag' => '${jumlah_angka}', 'label' => 'Jumlah Bruto (Angka)', 'example' => '1.000.000'],
                    ['key' => 'jumlah_rupiah', 'tag' => '${jumlah_rupiah}', 'label' => 'Jumlah Bruto (Rp)', 'example' => 'Rp 1.000.000'],
                    ['key' => 'ppn', 'tag' => '${ppn}', 'label' => 'PPn (Rp)', 'example' => 'Rp 0'],
                    ['key' => 'pph', 'tag' => '${pph}', 'label' => 'PPh (Rp)', 'example' => 'Rp 50.000'],
                    ['key' => 'pb1', 'tag' => '${pb1}', 'label' => 'PB1 / Pajak Daerah (Rp)', 'example' => 'Rp 0'],
                    ['key' => 'potongan_pajak', 'tag' => '${potongan_pajak}', 'label' => 'Potongan Pajak (Rp)', 'example' => 'Rp 50.000'],
                    ['key' => 'potongan_pajak_angka', 'tag' => '${potongan_pajak_angka}', 'label' => 'Potongan Pajak (Angka)', 'example' => '50.000'],
                    ['key' => 'jumlah_diterima', 'tag' => '${jumlah_diterima}', 'label' => 'Jumlah Diterima Bersih (Angka)', 'example' => '950.000'],
                    ['key' => 'jumlah_diterima_rupiah', 'tag' => '${jumlah_diterima_rupiah}', 'label' => 'Jumlah Diterima Bersih (Rp)', 'example' => 'Rp 950.000'],
                    ['key' => 'terbilang', 'tag' => '${terbilang}', 'label' => 'Terbilang Jumlah Bruto', 'example' => 'Satu juta rupiah'],
                    ['key' => 'terbilang_title', 'tag' => '${terbilang_title}', 'label' => 'Terbilang Bruto (Kapital Awal)', 'example' => 'Satu Juta Rupiah'],
                    ['key' => 'terbilang_diterima', 'tag' => '${terbilang_diterima}', 'label' => 'Terbilang Jumlah Diterima', 'example' => 'Sembilan ratus lima puluh ribu rupiah'],
                    ['key' => 'terbilang_diterima_title', 'tag' => '${terbilang_diterima_title}', 'label' => 'Terbilang Diterima (Kapital Awal)', 'example' => 'Sembilan Ratus Lima Puluh Ribu Rupiah'],
                    ['key' => 'tanggal_transaksi', 'tag' => '${tanggal_transaksi}', 'label' => 'Tanggal Transaksi', 'example' => '15 Maret 2026'],
                    ['key' => 'tanggal_lunas', 'tag' => '${tanggal_lunas}', 'label' => 'Tanggal Lunas Bayar', 'example' => 'Lunas Bayar, 15 Maret 2026'],
                    ['key' => 'bulan_transaksi', 'tag' => '${bulan_transaksi}', 'label' => 'Bulan Transaksi', 'example' => 'Maret'],
                ],
            ],
            [
                'group' => 'Penanggung Jawab',
                'type' => 'text',
                'description' => 'Data Kepala Sekolah, Bendahara, dan Komite dari Penganggaran.',
                'items' => [
                    ['key' => 'kepala_sekolah', 'tag' => '${kepala_sekolah}', 'label' => 'Nama Kepala Sekolah', 'example' => 'Dra. Siti Aminah'],
                    ['key' => 'nip_kepala_sekolah', 'tag' => '${nip_kepala_sekolah}', 'label' => 'NIP Kepala Sekolah', 'example' => '197001011998022001'],
                    ['key' => 'bendahara', 'tag' => '${bendahara}', 'label' => 'Nama Bendahara', 'example' => 'Budi Santoso, S.Pd'],
                    ['key' => 'nip_bendahara', 'tag' => '${nip_bendahara}', 'label' => 'NIP Bendahara', 'example' => '198505122010011005'],
                    ['key' => 'komite', 'tag' => '${komite}', 'label' => 'Nama Ketua Komite', 'example' => 'H. Ahmad Fauzi'],
                ],
            ],
            [
                'group' => 'Tabel Daftar Penerima / Rincian (Baris Dinamis)',
                'type' => 'table',
                'description' => 'Letakkan 1 baris contoh di dalam tabel Word; otomatis digandakan sesuai jumlah baris rincian BKU.',
                'items' => [
                    ['key' => 'item_no', 'tag' => '${item_no}', 'label' => 'Nomor Urut Baris', 'example' => '1'],
                    ['key' => 'item_penerima', 'tag' => '${item_penerima}', 'label' => 'Nama Penerima', 'example' => 'Ahmad Hidayat, S.Pd'],
                    ['key' => 'item_nama', 'tag' => '${item_nama}', 'label' => 'Uraian / Nama Item', 'example' => 'Honor Guru Honorer'],
                    ['key' => 'item_volume', 'tag' => '${item_volume}', 'label' => 'Volume', 'example' => '1'],
                    ['key' => 'item_satuan', 'tag' => '${item_satuan}', 'label' => 'Satuan', 'example' => 'OB'],
                    ['key' => 'item_harga', 'tag' => '${item_harga}', 'label' => 'Harga Satuan (Angka)', 'example' => '1.000.000'],
                    ['key' => 'item_harga_rupiah', 'tag' => '${item_harga_rupiah}', 'label' => 'Harga Satuan (Rp)', 'example' => 'Rp 1.000.000'],
                    ['key' => 'item_subtotal', 'tag' => '${item_subtotal}', 'label' => 'Jumlah Bruto Baris (Angka)', 'example' => '1.000.000'],
                    ['key' => 'item_subtotal_rupiah', 'tag' => '${item_subtotal_rupiah}', 'label' => 'Jumlah Bruto Baris (Rp)', 'example' => 'Rp 1.000.000'],
                    ['key' => 'item_pajak', 'tag' => '${item_pajak}', 'label' => 'Potongan Pajak Baris (Angka)', 'example' => '50.000'],
                    ['key' => 'item_pajak_rupiah', 'tag' => '${item_pajak_rupiah}', 'label' => 'Potongan Pajak Baris (Rp)', 'example' => 'Rp 50.000'],
                    ['key' => 'item_bersih', 'tag' => '${item_bersih}', 'label' => 'Jumlah Diterima Baris (Angka)', 'example' => '950.000'],
                    ['key' => 'item_bersih_rupiah', 'tag' => '${item_bersih_rupiah}', 'label' => 'Jumlah Diterima Baris (Rp)', 'example' => 'Rp 950.000'],
                ],
            ],
            $this->imageVariableCatalogGroup(),
        ];
    }

    /**
     * @return array<int, array{group: string, type: string, description: string, items: array<int, array{key: string, tag: string, label: string, example: string}>}>
     */
    protected function bastCatalog(): array
    {
        return [
            $this->schoolIdentityCatalogGroup(),
            [
                'group' => 'Nomor & Tanggal Berita Acara',
                'type' => 'text',
                'description' => 'Nomor BAST beserta format tanggal biasa maupun ejaan huruf untuk kalimat pembuka berita acara.',
                'items' => [
                    ['key' => 'nomor_bast', 'tag' => '${nomor_bast}', 'label' => 'Nomor BAST', 'example' => '001/BAST/BOSP/2026'],
                    ['key' => 'tanggal_bast', 'tag' => '${tanggal_bast}', 'label' => 'Tanggal BAST', 'example' => '15 Maret 2026'],
                    ['key' => 'hari_bast', 'tag' => '${hari_bast}', 'label' => 'Nama Hari BAST', 'example' => 'Minggu'],
                    ['key' => 'tanggal_bast_angka', 'tag' => '${tanggal_bast_angka}', 'label' => 'Tanggal BAST (Angka Hari)', 'example' => '15'],
                    ['key' => 'tanggal_bast_terbilang', 'tag' => '${tanggal_bast_terbilang}', 'label' => 'Tanggal BAST (Ejaan Huruf)', 'example' => 'lima belas'],
                    ['key' => 'bulan_bast', 'tag' => '${bulan_bast}', 'label' => 'Nama Bulan BAST', 'example' => 'Maret'],
                    ['key' => 'tahun_bast', 'tag' => '${tahun_bast}', 'label' => 'Tahun BAST (Angka)', 'example' => '2026'],
                    ['key' => 'tahun_bast_terbilang', 'tag' => '${tahun_bast_terbilang}', 'label' => 'Tahun BAST (Ejaan Huruf)', 'example' => 'dua ribu dua puluh enam'],
                    ['key' => 'tanggal_bast_lengkap', 'tag' => '${tanggal_bast_lengkap}', 'label' => 'Kalimat Tanggal Berita Acara', 'example' => 'Minggu tanggal lima belas bulan Maret tahun dua ribu dua puluh enam'],
                    ['key' => 'tahun_anggaran', 'tag' => '${tahun_anggaran}', 'label' => 'Tahun Anggaran', 'example' => '2026'],
                    ['key' => 'sumber_dana', 'tag' => '${sumber_dana}', 'label' => 'Sumber Dana (Varian)', 'example' => 'BOSP Reguler'],
                    ['key' => 'no_bukti', 'tag' => '${no_bukti}', 'label' => 'Nomor Bukti BKU', 'example' => 'BNU01'],
                    ['key' => 'uraian', 'tag' => '${uraian}', 'label' => 'Uraian Transaksi BKU', 'example' => 'Pengadaan ATK Sekolah'],
                ],
            ],
            [
                'group' => 'Pihak Pertama (Yang Menyerahkan)',
                'type' => 'text',
                'description' => 'Identitas penyedia / pihak yang menyerahkan barang.',
                'items' => [
                    ['key' => 'pihak_pertama_nama', 'tag' => '${pihak_pertama_nama}', 'label' => 'Nama Pihak Pertama', 'example' => 'Hendra Wijaya'],
                    ['key' => 'pihak_pertama_jabatan', 'tag' => '${pihak_pertama_jabatan}', 'label' => 'Jabatan Pihak Pertama', 'example' => 'Direktur / Pemilik'],
                    ['key' => 'pihak_pertama_instansi', 'tag' => '${pihak_pertama_instansi}', 'label' => 'Perusahaan / Instansi Pihak Pertama', 'example' => 'CV. Sumber Makmur'],
                    ['key' => 'pihak_pertama_alamat', 'tag' => '${pihak_pertama_alamat}', 'label' => 'Alamat Pihak Pertama', 'example' => 'Jl. Merdeka No. 45'],
                ],
            ],
            [
                'group' => 'Pihak Kedua (Yang Menerima) & Pengelola Sekolah',
                'type' => 'text',
                'description' => 'Identitas penerima barang beserta data Kepala Sekolah, Bendahara, dan Komite.',
                'items' => [
                    ['key' => 'pihak_kedua_nama', 'tag' => '${pihak_kedua_nama}', 'label' => 'Nama Pihak Kedua', 'example' => 'Dra. Siti Aminah'],
                    ['key' => 'pihak_kedua_jabatan', 'tag' => '${pihak_kedua_jabatan}', 'label' => 'Jabatan Pihak Kedua', 'example' => 'Kepala Sekolah'],
                    ['key' => 'pihak_kedua_instansi', 'tag' => '${pihak_kedua_instansi}', 'label' => 'Instansi Pihak Kedua', 'example' => 'SDN 1 Nusantara'],
                    ['key' => 'pihak_kedua_alamat', 'tag' => '${pihak_kedua_alamat}', 'label' => 'Alamat Pihak Kedua', 'example' => 'Jl. Pendidikan No. 10'],
                    ['key' => 'kepala_sekolah', 'tag' => '${kepala_sekolah}', 'label' => 'Nama Kepala Sekolah', 'example' => 'Dra. Siti Aminah'],
                    ['key' => 'nip_kepala_sekolah', 'tag' => '${nip_kepala_sekolah}', 'label' => 'NIP Kepala Sekolah', 'example' => '197001011998022001'],
                    ['key' => 'bendahara', 'tag' => '${bendahara}', 'label' => 'Nama Bendahara', 'example' => 'Budi Santoso, S.Pd'],
                    ['key' => 'nip_bendahara', 'tag' => '${nip_bendahara}', 'label' => 'NIP Bendahara', 'example' => '198505122010011005'],
                    ['key' => 'komite', 'tag' => '${komite}', 'label' => 'Nama Ketua Komite', 'example' => 'H. Ahmad Fauzi'],
                ],
            ],
            [
                'group' => 'Total Nilai & Terbilang',
                'type' => 'text',
                'description' => 'Nilai keseluruhan barang yang diserahterimakan.',
                'items' => [
                    ['key' => 'jumlah_angka', 'tag' => '${jumlah_angka}', 'label' => 'Total Keseluruhan (Angka)', 'example' => '1.500.000'],
                    ['key' => 'jumlah_rupiah', 'tag' => '${jumlah_rupiah}', 'label' => 'Total Keseluruhan (Rp)', 'example' => 'Rp 1.500.000'],
                    ['key' => 'terbilang', 'tag' => '${terbilang}', 'label' => 'Terbilang (Kalimat)', 'example' => 'Satu juta lima ratus ribu rupiah'],
                    ['key' => 'terbilang_title', 'tag' => '${terbilang_title}', 'label' => 'Terbilang (Kapital Awal Kata)', 'example' => 'Satu Juta Lima Ratus Ribu Rupiah'],
                ],
            ],
            [
                'group' => 'Tabel Rincian Barang (Baris Dinamis)',
                'type' => 'table',
                'description' => 'Letakkan 1 baris contoh di dalam tabel Word; otomatis digandakan sesuai jumlah barang pada BAST.',
                'items' => [
                    ['key' => 'item_no', 'tag' => '${item_no}', 'label' => 'Nomor Urut', 'example' => '1'],
                    ['key' => 'item_nama', 'tag' => '${item_nama}', 'label' => 'Nama Barang', 'example' => 'Kertas HVS A4 70gr'],
                    ['key' => 'item_volume', 'tag' => '${item_volume}', 'label' => 'Jumlah / Volume', 'example' => '10'],
                    ['key' => 'item_satuan', 'tag' => '${item_satuan}', 'label' => 'Satuan', 'example' => 'Rim'],
                    ['key' => 'item_kondisi', 'tag' => '${item_kondisi}', 'label' => 'Kondisi Barang', 'example' => 'Baik'],
                    ['key' => 'item_harga', 'tag' => '${item_harga}', 'label' => 'Harga Satuan (Angka)', 'example' => '55.000'],
                    ['key' => 'item_harga_rupiah', 'tag' => '${item_harga_rupiah}', 'label' => 'Harga Satuan (Rp)', 'example' => 'Rp 55.000'],
                    ['key' => 'item_subtotal', 'tag' => '${item_subtotal}', 'label' => 'Total Harga Baris (Angka)', 'example' => '550.000'],
                    ['key' => 'item_subtotal_rupiah', 'tag' => '${item_subtotal_rupiah}', 'label' => 'Total Harga Baris (Rp)', 'example' => 'Rp 550.000'],
                ],
            ],
            $this->imageVariableCatalogGroup(),
        ];
    }

    /**
     * @return array<int, array{group: string, type: string, description: string, items: array<int, array{key: string, tag: string, label: string, example: string}>}>
     */
    protected function suratPesananCatalog(): array
    {
        return [
            $this->schoolIdentityCatalogGroup(),
            [
                'group' => 'Nomor & Tanggal Surat Pesanan',
                'type' => 'text',
                'description' => 'Nomor SP, tanggal pesanan, sumber dana varian, dan uraian transaksi.',
                'items' => [
                    ['key' => 'nomor_sp', 'tag' => '${nomor_sp}', 'label' => 'Nomor Surat Pesanan', 'example' => '001/SP/BOSP/2026'],
                    ['key' => 'tanggal_sp', 'tag' => '${tanggal_sp}', 'label' => 'Tanggal Surat Pesanan', 'example' => '15 Maret 2026'],
                    ['key' => 'hari_sp', 'tag' => '${hari_sp}', 'label' => 'Nama Hari SP', 'example' => 'Minggu'],
                    ['key' => 'tanggal_sp_terbilang', 'tag' => '${tanggal_sp_terbilang}', 'label' => 'Tanggal SP (Ejaan Huruf)', 'example' => 'lima belas'],
                    ['key' => 'bulan_sp', 'tag' => '${bulan_sp}', 'label' => 'Nama Bulan SP', 'example' => 'Maret'],
                    ['key' => 'tahun_sp', 'tag' => '${tahun_sp}', 'label' => 'Tahun SP (Angka)', 'example' => '2026'],
                    ['key' => 'tahun_sp_terbilang', 'tag' => '${tahun_sp_terbilang}', 'label' => 'Tahun SP (Ejaan Huruf)', 'example' => 'dua ribu dua puluh enam'],
                    ['key' => 'tahun_anggaran', 'tag' => '${tahun_anggaran}', 'label' => 'Tahun Anggaran', 'example' => '2026'],
                    ['key' => 'sumber_dana', 'tag' => '${sumber_dana}', 'label' => 'Sumber Dana (Varian)', 'example' => 'BOSP Reguler'],
                    ['key' => 'no_bukti', 'tag' => '${no_bukti}', 'label' => 'Nomor Bukti BKU', 'example' => 'BNU01'],
                    ['key' => 'uraian', 'tag' => '${uraian}', 'label' => 'Uraian Transaksi BKU', 'example' => 'Pengadaan ATK Sekolah'],
                ],
            ],
            [
                'group' => 'Pihak Kesatu (Pemesan) & Pengelola Sekolah',
                'type' => 'text',
                'description' => 'Identitas pemesan dari pihak sekolah.',
                'items' => [
                    ['key' => 'pihak_kesatu_nama', 'tag' => '${pihak_kesatu_nama}', 'label' => 'Nama Pihak Kesatu', 'example' => 'Dra. Siti Aminah'],
                    ['key' => 'pihak_kesatu_nip', 'tag' => '${pihak_kesatu_nip}', 'label' => 'NIP Pihak Kesatu', 'example' => '197001011998022001'],
                    ['key' => 'pihak_kesatu_jabatan', 'tag' => '${pihak_kesatu_jabatan}', 'label' => 'Jabatan Pihak Kesatu', 'example' => 'Kepala Sekolah'],
                    ['key' => 'pihak_kesatu_instansi', 'tag' => '${pihak_kesatu_instansi}', 'label' => 'Instansi Pihak Kesatu', 'example' => 'SDN 1 Nusantara'],
                    ['key' => 'pihak_kesatu_alamat', 'tag' => '${pihak_kesatu_alamat}', 'label' => 'Alamat Pihak Kesatu', 'example' => 'Jl. Pendidikan No. 10'],
                    ['key' => 'kepala_sekolah', 'tag' => '${kepala_sekolah}', 'label' => 'Nama Kepala Sekolah', 'example' => 'Dra. Siti Aminah'],
                    ['key' => 'nip_kepala_sekolah', 'tag' => '${nip_kepala_sekolah}', 'label' => 'NIP Kepala Sekolah', 'example' => '197001011998022001'],
                    ['key' => 'bendahara', 'tag' => '${bendahara}', 'label' => 'Nama Bendahara', 'example' => 'Budi Santoso, S.Pd'],
                    ['key' => 'nip_bendahara', 'tag' => '${nip_bendahara}', 'label' => 'NIP Bendahara', 'example' => '198505122010011005'],
                    ['key' => 'komite', 'tag' => '${komite}', 'label' => 'Nama Ketua Komite', 'example' => 'H. Ahmad Fauzi'],
                ],
            ],
            [
                'group' => 'Pihak Kedua (Penyedia / Toko)',
                'type' => 'text',
                'description' => 'Identitas perusahaan / toko penyedia barang atau jasa.',
                'items' => [
                    ['key' => 'pihak_kedua_nama_perusahaan', 'tag' => '${pihak_kedua_nama_perusahaan}', 'label' => 'Nama Perusahaan / Toko', 'example' => 'CV. Sumber Makmur'],
                    ['key' => 'pihak_kedua_penanggung_jawab', 'tag' => '${pihak_kedua_penanggung_jawab}', 'label' => 'Penanggung Jawab Penyedia', 'example' => 'Hendra Wijaya'],
                    ['key' => 'pihak_kedua_alamat', 'tag' => '${pihak_kedua_alamat}', 'label' => 'Alamat Perusahaan / Toko', 'example' => 'Jl. Merdeka No. 45'],
                    ['key' => 'pihak_kedua_npwp', 'tag' => '${pihak_kedua_npwp}', 'label' => 'NPWP Penyedia', 'example' => '01.234.567.8-901.000'],
                    ['key' => 'pihak_kedua_platform', 'tag' => '${pihak_kedua_platform}', 'label' => 'Platform Pengadaan (SIPLah dll.)', 'example' => 'SIPLah Blibli'],
                ],
            ],
            [
                'group' => 'Syarat, Ketentuan & Total',
                'type' => 'text',
                'description' => 'Ketentuan pengiriman, kondisi barang, pembayaran, dan total nilai pesanan.',
                'items' => [
                    ['key' => 'waktu_pengiriman', 'tag' => '${waktu_pengiriman}', 'label' => 'Waktu Pengiriman', 'example' => 'Maksimal 7 hari kerja setelah SP diterima'],
                    ['key' => 'kondisi_barang', 'tag' => '${kondisi_barang}', 'label' => 'Kondisi Barang', 'example' => 'Baru, tidak cacat, dan sesuai spesifikasi'],
                    ['key' => 'ketentuan_pembayaran', 'tag' => '${ketentuan_pembayaran}', 'label' => 'Ketentuan Pembayaran', 'example' => 'Transfer setelah BAST ditandatangani'],
                    ['key' => 'sumber_dana_sp', 'tag' => '${sumber_dana_sp}', 'label' => 'Keterangan Sumber Dana SP', 'example' => 'Dibebankan pada dana BOSP Reguler TA 2026'],
                    ['key' => 'jumlah_angka', 'tag' => '${jumlah_angka}', 'label' => 'Total Harga (Angka)', 'example' => '1.500.000'],
                    ['key' => 'jumlah_rupiah', 'tag' => '${jumlah_rupiah}', 'label' => 'Total Harga (Rp)', 'example' => 'Rp 1.500.000'],
                    ['key' => 'terbilang', 'tag' => '${terbilang}', 'label' => 'Terbilang (Kalimat)', 'example' => 'Satu juta lima ratus ribu rupiah'],
                    ['key' => 'terbilang_title', 'tag' => '${terbilang_title}', 'label' => 'Terbilang (Kapital Awal Kata)', 'example' => 'Satu Juta Lima Ratus Ribu Rupiah'],
                ],
            ],
            [
                'group' => 'Tabel Rincian Pesanan (Baris Dinamis)',
                'type' => 'table',
                'description' => 'Letakkan 1 baris contoh di dalam tabel Word; otomatis digandakan sesuai jumlah barang pesanan.',
                'items' => [
                    ['key' => 'item_no', 'tag' => '${item_no}', 'label' => 'Nomor Urut', 'example' => '1'],
                    ['key' => 'item_nama', 'tag' => '${item_nama}', 'label' => 'Nama Barang / Jasa', 'example' => 'Kertas HVS A4 70gr'],
                    ['key' => 'item_volume', 'tag' => '${item_volume}', 'label' => 'Jumlah / Volume', 'example' => '10'],
                    ['key' => 'item_satuan', 'tag' => '${item_satuan}', 'label' => 'Satuan', 'example' => 'Rim'],
                    ['key' => 'item_harga', 'tag' => '${item_harga}', 'label' => 'Harga Satuan (Angka)', 'example' => '55.000'],
                    ['key' => 'item_harga_rupiah', 'tag' => '${item_harga_rupiah}', 'label' => 'Harga Satuan (Rp)', 'example' => 'Rp 55.000'],
                    ['key' => 'item_subtotal', 'tag' => '${item_subtotal}', 'label' => 'Total Harga Baris (Angka)', 'example' => '550.000'],
                    ['key' => 'item_subtotal_rupiah', 'tag' => '${item_subtotal_rupiah}', 'label' => 'Total Harga Baris (Rp)', 'example' => 'Rp 550.000'],
                ],
            ],
            $this->imageVariableCatalogGroup(),
        ];
    }

    // -------------------------------------------------------------------------
    // Payload Builders
    // -------------------------------------------------------------------------

    /**
     * @return array<string, string>
     */
    protected function baseSchoolText(?object $sekolah): array
    {
        return [
            'nama_sekolah' => (string) ($sekolah?->nama_sekolah ?? '-'),
            'npsn' => (string) ($sekolah?->npsn ?? '-'),
            'alamat_sekolah' => (string) ($sekolah?->alamat ?? '-'),
            'kelurahan_desa' => (string) ($sekolah?->kelurahan_desa ?? '-'),
            'kecamatan' => (string) ($sekolah?->kecamatan ?? '-'),
            'kabupaten_kota' => (string) ($sekolah?->kabupaten_kota ?? '-'),
            'provinsi' => (string) ($sekolah?->provinsi ?? '-'),
            'status_sekolah' => (string) ($sekolah?->status_sekolah ?? '-'),
            'jenjang_sekolah' => (string) ($sekolah?->jenjang_sekolah ?? '-'),
        ];
    }

    /**
     * @return array<string, ?string>
     */
    protected function baseSchoolImages(?object $sekolah): array
    {
        return [
            'kop_surat' => $this->resolvePublicImagePath($sekolah?->kop_surat),
            'logo_sekolah' => $this->resolvePublicImagePath($sekolah?->logo_sekolah),
            'logo_daerah' => $this->resolvePublicImagePath($sekolah?->logo_daerah),
        ];
    }

    /**
     * @return array{text: array<string, string>, items: array<int, array<string, string>>, images: array<string, ?string>, kop_border: string}
     */
    protected function buildTandaTerimaVariables(Model $tandaTerima, string $variant): array
    {
        $sekolah = $tandaTerima->sekolah ?? $tandaTerima->penganggaran?->sekolah ?? SekolahProfile::first();
        $penganggaran = $tandaTerima->penganggaran;
        $bku = $tandaTerima->bukuKasUmum;
        $kodeKegiatan = $tandaTerima->kodeKegiatan;
        $rekening = $tandaTerima->rekeningBelanja;

        $parsedKode = $this->parseKodeKegiatan($kodeKegiatan);
        $totalAmount = (float) ($bku?->total_transaksi_kotor ?? 0);
        if ($totalAmount <= 0) {
            $totalAmount = $this->calculateTotalFromUraianDetails($bku);
        }

        $pajakData = $this->klasifikasiPajak($bku, $totalAmount);
        $ppn = (float) ($pajakData['ppn'] ?? 0);
        $pph = (float) ($pajakData['pph'] ?? 0);
        $pb1 = (float) ($pajakData['pb1'] ?? 0);
        $potonganPajak = $ppn + $pph + $pb1;
        $jumlahDiterima = max(0, $totalAmount - $potonganPajak);

        $terbilangBruto = $this->convertToText($totalAmount);
        $terbilangDiterima = $this->convertToText($jumlahDiterima);

        $tanggalRaw = $bku?->tanggal_transaksi;
        $tanggalObj = $tanggalRaw ? Carbon::parse($tanggalRaw) : null;
        $bulanIndo = $tanggalObj ? $this->formatBulanIndonesia($tanggalObj->format('F')) : '-';
        $tanggalTransaksi = $tanggalObj ? "{$tanggalObj->format('d')} {$bulanIndo} {$tanggalObj->format('Y')}" : '-';
        $tanggalLunas = $tanggalObj ? "Lunas Bayar, {$tanggalTransaksi}" : '-';
        $tahap = $tanggalObj ? ($tanggalObj->month <= 6 ? 'THP-I' : 'THP-II') : '-';

        $uraianUtama = trim((string) ($bku?->uraian_opsional ?? '')) !== ''
            ? (string) $bku->uraian_opsional
            : (string) ($bku?->uraian ?? '-');

        $penerima = trim((string) (
            $bku?->nama_penerima_pembayaran
            ?: $bku?->nama_toko
            ?: $bku?->penerima
            ?: ''
        ));
        if ($penerima === '') {
            $penerima = '-';
        }

        $uraianDetails = $bku?->uraianDetails ?? collect();
        $firstDetail = $uraianDetails->first();
        $mainVolume = $firstDetail ? $this->formatVolume((float) ($firstDetail->volume ?? 1)) : '1';
        $mainSatuan = (string) ($firstDetail?->satuan ?: '-');
        $mainHarga = (float) ($firstDetail?->harga_satuan ?? $totalAmount);

        $text = array_merge($this->baseSchoolText($sekolah), [
            // Anggaran & Kode
            'tahun_anggaran' => (string) ($penganggaran?->tahun_anggaran ?? '-'),
            'sumber_dana' => VariantConfig::title($variant),
            'tahap' => $tahap,
            'no_bukti' => (string) ($bku?->id_transaksi ?: 'TT-'.$tandaTerima->getKey()),
            'kode_kegiatan' => (string) $parsedKode['kode_full'],
            'kode_program' => (string) $parsedKode['kode_program'],
            'program' => (string) $parsedKode['program'],
            'kode_sub_program' => (string) $parsedKode['kode_sub_program'],
            'sub_program' => (string) $parsedKode['sub_program'],
            'uraian_kegiatan' => (string) $parsedKode['uraian'],
            'kode_rekening' => (string) ($rekening?->kode_rekening ?? '-'),
            'rincian_objek' => (string) ($rekening?->rincian_objek ?? '-'),

            // Transaksi, Honor & Pajak
            'uraian' => $uraianUtama,
            'uraian_bku' => (string) ($bku?->uraian ?? '-'),
            'penerima' => $penerima,
            'volume' => $mainVolume,
            'satuan' => $mainSatuan,
            'harga_satuan' => $this->formatNumber($mainHarga),
            'harga_satuan_rupiah' => $this->formatRupiah($mainHarga),
            'jumlah_angka' => $this->formatNumber($totalAmount),
            'jumlah_rupiah' => $this->formatRupiah($totalAmount),
            'ppn' => $this->formatRupiah($ppn),
            'pph' => $this->formatRupiah($pph),
            'pb1' => $this->formatRupiah($pb1),
            'potongan_pajak' => $potonganPajak > 0 ? $this->formatRupiah($potonganPajak) : '-',
            'potongan_pajak_angka' => $this->formatNumber($potonganPajak),
            'jumlah_diterima' => $this->formatNumber($jumlahDiterima),
            'jumlah_diterima_rupiah' => $this->formatRupiah($jumlahDiterima),
            'terbilang' => $terbilangBruto,
            'terbilang_title' => ucwords(strtolower($terbilangBruto)),
            'terbilang_diterima' => $terbilangDiterima,
            'terbilang_diterima_title' => ucwords(strtolower($terbilangDiterima)),
            'tanggal_transaksi' => $tanggalTransaksi,
            'tanggal_lunas' => $tanggalLunas,
            'bulan_transaksi' => $bulanIndo,

            // Penanggung Jawab
            'kepala_sekolah' => (string) ($penganggaran?->kepala_sekolah ?? '-'),
            'nip_kepala_sekolah' => (string) ($penganggaran?->nip_kepala_sekolah ?? '-'),
            'bendahara' => (string) ($penganggaran?->bendahara ?? '-'),
            'nip_bendahara' => (string) ($penganggaran?->nip_bendahara ?? '-'),
            'komite' => (string) ($penganggaran?->komite ?? '-'),
        ]);

        // Baris dinamis (jika >1 uraianDetail, distribusi pajak proporsional atau 100% di baris tunggal)
        $items = [];
        if ($uraianDetails->count() > 0) {
            $detailCount = $uraianDetails->count();
            $sumSubtotals = (float) $uraianDetails->sum(function ($detail) {
                $vol = (float) ($detail->volume ?? 0);
                $harga = (float) ($detail->harga_satuan ?? 0);

                return $this->resolveDetailSubtotal($detail, $vol, $harga);
            });
            $allocatedPajak = 0.0;

            foreach ($uraianDetails->values() as $idx => $detail) {
                $vol = (float) ($detail->volume ?? 0);
                $harga = (float) ($detail->harga_satuan ?? 0);
                $subtotal = $this->resolveDetailSubtotal($detail, $vol, $harga);

                if ($detailCount === 1) {
                    $rowPajak = $potonganPajak;
                } elseif ($idx === $detailCount - 1) {
                    $rowPajak = max(0, $potonganPajak - $allocatedPajak);
                } elseif ($sumSubtotals > 0) {
                    $rowPajak = round(($subtotal / $sumSubtotals) * $potonganPajak);
                    $allocatedPajak += $rowPajak;
                } else {
                    $rowPajak = 0.0;
                }

                $rowBersih = max(0, $subtotal - $rowPajak);

                $items[] = [
                    'item_no' => (string) ($idx + 1),
                    'item_penerima' => $penerima,
                    'item_nama' => (string) ($detail->uraian ?? $uraianUtama),
                    'item_volume' => $this->formatVolume($vol),
                    'item_satuan' => (string) ($detail->satuan ?? '-'),
                    'item_harga' => $this->formatNumber($harga),
                    'item_harga_rupiah' => $this->formatRupiah($harga),
                    'item_subtotal' => $this->formatNumber($subtotal),
                    'item_subtotal_rupiah' => $this->formatRupiah($subtotal),
                    'item_pajak' => $this->formatNumber($rowPajak),
                    'item_pajak_rupiah' => $rowPajak > 0 ? $this->formatRupiah($rowPajak) : '-',
                    'item_bersih' => $this->formatNumber($rowBersih),
                    'item_bersih_rupiah' => $this->formatRupiah($rowBersih),
                ];
            }
        } else {
            $items[] = [
                'item_no' => '1',
                'item_penerima' => $penerima,
                'item_nama' => $uraianUtama,
                'item_volume' => '1',
                'item_satuan' => '-',
                'item_harga' => $this->formatNumber($totalAmount),
                'item_harga_rupiah' => $this->formatRupiah($totalAmount),
                'item_subtotal' => $this->formatNumber($totalAmount),
                'item_subtotal_rupiah' => $this->formatRupiah($totalAmount),
                'item_pajak' => $this->formatNumber($potonganPajak),
                'item_pajak_rupiah' => $potonganPajak > 0 ? $this->formatRupiah($potonganPajak) : '-',
                'item_bersih' => $this->formatNumber($jumlahDiterima),
                'item_bersih_rupiah' => $this->formatRupiah($jumlahDiterima),
            ];
        }

        return [
            'text' => $text,
            'items' => $items,
            'images' => $this->baseSchoolImages($sekolah),
            'kop_border' => $this->resolveKopBorder($sekolah),
        ];
    }

    /**
     * @return array{text: array<string, string>, items: array<int, array<string, string>>, images: array<string, ?string>, kop_border: string}
     */
    protected function buildBastVariables(Model $bast, string $variant): array
    {
        $sekolah = $bast->sekolah ?? $bast->penganggaran?->sekolah ?? SekolahProfile::first();
        $penganggaran = $bast->penganggaran;
        $bku = $bast->bukuKasUmum;

        $totalAmount = $this->calculateTotalFromUraianDetails($bku);
        $terbilang = $this->convertToText($totalAmount);

        $tanggalRaw = $bast->tanggal_bast ?: $bku?->tanggal_transaksi;
        $tanggalObj = $tanggalRaw ? Carbon::parse($tanggalRaw) : null;
        $hariIndo = $tanggalObj ? $this->formatHariIndonesia($tanggalObj->format('l')) : '________';
        $tglAngka = $tanggalObj ? (int) $tanggalObj->format('j') : 0;
        $tglTerbilang = $tanggalObj ? $this->convertNumberToWords($tglAngka) : '________';
        $bulanIndo = $tanggalObj ? $this->formatBulanIndonesia($tanggalObj->format('F')) : '________';
        $tahunAngka = $tanggalObj ? (int) $tanggalObj->format('Y') : 0;
        $tahunTerbilang = $tanggalObj ? $this->convertNumberToWords($tahunAngka) : '________';
        $tanggalBast = $tanggalObj ? "{$tanggalObj->format('d')} {$bulanIndo} {$tanggalObj->format('Y')}" : '-';
        $tanggalLengkap = $tanggalObj
            ? "{$hariIndo} tanggal {$tglTerbilang} bulan {$bulanIndo} tahun {$tahunTerbilang}"
            : '________ tanggal ________ bulan ________ tahun ________';

        $uraianUtama = trim((string) ($bku?->uraian_opsional ?? '')) !== ''
            ? (string) $bku->uraian_opsional
            : (string) ($bku?->uraian ?? '-');

        $text = array_merge($this->baseSchoolText($sekolah), [
            'nomor_bast' => (string) ($bast->nomor_bast ?: '-'),
            'tanggal_bast' => $tanggalBast,
            'hari_bast' => $hariIndo,
            'tanggal_bast_angka' => $tanggalObj ? (string) $tglAngka : '-',
            'tanggal_bast_terbilang' => $tglTerbilang,
            'bulan_bast' => $bulanIndo,
            'tahun_bast' => $tanggalObj ? (string) $tahunAngka : '-',
            'tahun_bast_terbilang' => $tahunTerbilang,
            'tanggal_bast_lengkap' => $tanggalLengkap,
            'tahun_anggaran' => (string) ($penganggaran?->tahun_anggaran ?? '-'),
            'sumber_dana' => VariantConfig::title($variant),
            'no_bukti' => (string) ($bku?->id_transaksi ?: 'BAST-'.$bast->getKey()),
            'uraian' => $uraianUtama,

            'pihak_pertama_nama' => (string) ($bast->pihak_pertama_nama ?: '-'),
            'pihak_pertama_jabatan' => (string) ($bast->pihak_pertama_jabatan ?: '-'),
            'pihak_pertama_instansi' => (string) ($bast->pihak_pertama_instansi ?: '-'),
            'pihak_pertama_alamat' => (string) ($bast->pihak_pertama_alamat ?: '-'),

            'pihak_kedua_nama' => (string) ($bast->pihak_kedua_nama ?: '-'),
            'pihak_kedua_jabatan' => (string) ($bast->pihak_kedua_jabatan ?: '-'),
            'pihak_kedua_instansi' => (string) ($bast->pihak_kedua_instansi ?: '-'),
            'pihak_kedua_alamat' => (string) ($bast->pihak_kedua_alamat ?: '-'),

            'kepala_sekolah' => (string) ($penganggaran?->kepala_sekolah ?? '-'),
            'nip_kepala_sekolah' => (string) ($penganggaran?->nip_kepala_sekolah ?? '-'),
            'bendahara' => (string) ($penganggaran?->bendahara ?? '-'),
            'nip_bendahara' => (string) ($penganggaran?->nip_bendahara ?? '-'),
            'komite' => (string) ($penganggaran?->komite ?? '-'),

            'jumlah_angka' => $this->formatNumber($totalAmount),
            'jumlah_rupiah' => $this->formatRupiah($totalAmount),
            'terbilang' => $terbilang,
            'terbilang_title' => ucwords(strtolower($terbilang)),
        ]);

        $items = [];
        $uraianDetails = $bku?->uraianDetails ?? collect();
        if ($uraianDetails->count() > 0) {
            foreach ($uraianDetails->values() as $idx => $detail) {
                $vol = (float) ($detail->volume ?? 0);
                $harga = (float) ($detail->harga_satuan ?? 0);
                $subtotal = $this->resolveDetailSubtotal($detail, $vol, $harga);

                $items[] = [
                    'item_no' => (string) ($idx + 1),
                    'item_nama' => (string) ($detail->uraian ?? '-'),
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
                'item_satuan' => 'Paket',
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
            'images' => $this->baseSchoolImages($sekolah),
            'kop_border' => $this->resolveKopBorder($sekolah),
        ];
    }

    /**
     * @return array{text: array<string, string>, items: array<int, array<string, string>>, images: array<string, ?string>, kop_border: string}
     */
    protected function buildSuratPesananVariables(Model $sp, string $variant): array
    {
        $sekolah = $sp->sekolah ?? $sp->penganggaran?->sekolah ?? SekolahProfile::first();
        $penganggaran = $sp->penganggaran;
        $bku = $sp->bukuKasUmum;

        $totalAmount = $this->calculateTotalFromUraianDetails($bku);
        $terbilang = $this->convertToText($totalAmount);

        $tanggalRaw = $sp->tanggal_sp ?: $bku?->tanggal_transaksi;
        $tanggalObj = $tanggalRaw ? Carbon::parse($tanggalRaw) : null;
        $hariIndo = $tanggalObj ? $this->formatHariIndonesia($tanggalObj->format('l')) : '-';
        $tglTerbilang = $tanggalObj ? $this->convertNumberToWords((int) $tanggalObj->format('j')) : '-';
        $bulanIndo = $tanggalObj ? $this->formatBulanIndonesia($tanggalObj->format('F')) : '-';
        $tahunAngka = $tanggalObj ? (int) $tanggalObj->format('Y') : 0;
        $tahunTerbilang = $tanggalObj ? $this->convertNumberToWords($tahunAngka) : '-';
        $tanggalSp = $tanggalObj ? "{$tanggalObj->format('d')} {$bulanIndo} {$tanggalObj->format('Y')}" : '-';

        $uraianUtama = trim((string) ($bku?->uraian_opsional ?? '')) !== ''
            ? (string) $bku->uraian_opsional
            : (string) ($bku?->uraian ?? '-');

        $sumberDanaVariant = VariantConfig::title($variant);

        $text = array_merge($this->baseSchoolText($sekolah), [
            'nomor_sp' => (string) ($sp->nomor_sp ?: '-'),
            'tanggal_sp' => $tanggalSp,
            'hari_sp' => $hariIndo,
            'tanggal_sp_terbilang' => $tglTerbilang,
            'bulan_sp' => $bulanIndo,
            'tahun_sp' => $tanggalObj ? (string) $tahunAngka : '-',
            'tahun_sp_terbilang' => $tahunTerbilang,
            'tahun_anggaran' => (string) ($penganggaran?->tahun_anggaran ?? '-'),
            'sumber_dana' => $sumberDanaVariant,
            'no_bukti' => (string) ($bku?->id_transaksi ?: 'SP-'.$sp->getKey()),
            'uraian' => $uraianUtama,

            'pihak_kesatu_nama' => (string) ($sp->pihak_kesatu_nama ?: '-'),
            'pihak_kesatu_nip' => (string) ($sp->pihak_kesatu_nip ?: '-'),
            'pihak_kesatu_jabatan' => (string) ($sp->pihak_kesatu_jabatan ?: '-'),
            'pihak_kesatu_instansi' => (string) ($sp->pihak_kesatu_instansi ?: '-'),
            'pihak_kesatu_alamat' => (string) ($sp->pihak_kesatu_alamat ?: '-'),

            'pihak_kedua_nama_perusahaan' => (string) ($sp->pihak_kedua_nama_perusahaan ?: '-'),
            'pihak_kedua_penanggung_jawab' => (string) ($sp->pihak_kedua_penanggung_jawab ?: '-'),
            'pihak_kedua_alamat' => (string) ($sp->pihak_kedua_alamat ?: '-'),
            'pihak_kedua_npwp' => (string) ($sp->pihak_kedua_npwp ?: '-'),
            'pihak_kedua_platform' => (string) ($sp->pihak_kedua_platform ?: '-'),

            'waktu_pengiriman' => (string) ($sp->waktu_pengiriman ?: 'Barang harus dikirimkan selambat-lambatnya setelah Surat Pesanan ini disetujui.'),
            'kondisi_barang' => (string) ($sp->kondisi_barang ?: 'Barang yang dikirim harus dalam keadaan baru, tidak cacat, dan sesuai dengan spesifikasi yang tertera. PIHAK KESATU berhak menolak barang yang tidak sesuai.'),
            'ketentuan_pembayaran' => (string) ($sp->ketentuan_pembayaran ?: 'Pembayaran akan ditransfer ke rekening PIHAK KEDUA setelah seluruh barang diterima dengan baik yang dibuktikan dengan penandatanganan Berita Acara Serah Terima (BAST).'),
            'sumber_dana_sp' => (string) ($sp->sumber_dana ?: "Pembiayaan pengadaan barang ini dibebankan pada dana {$sumberDanaVariant}."),

            'kepala_sekolah' => (string) ($penganggaran?->kepala_sekolah ?? '-'),
            'nip_kepala_sekolah' => (string) ($penganggaran?->nip_kepala_sekolah ?? '-'),
            'bendahara' => (string) ($penganggaran?->bendahara ?? '-'),
            'nip_bendahara' => (string) ($penganggaran?->nip_bendahara ?? '-'),
            'komite' => (string) ($penganggaran?->komite ?? '-'),

            'jumlah_angka' => $this->formatNumber($totalAmount),
            'jumlah_rupiah' => $this->formatRupiah($totalAmount),
            'terbilang' => $terbilang,
            'terbilang_title' => ucwords(strtolower($terbilang)),
        ]);

        $items = [];
        $uraianDetails = $bku?->uraianDetails ?? collect();
        if ($uraianDetails->count() > 0) {
            foreach ($uraianDetails->values() as $idx => $detail) {
                $vol = (float) ($detail->volume ?? 0);
                $harga = (float) ($detail->harga_satuan ?? 0);
                $subtotal = $this->resolveDetailSubtotal($detail, $vol, $harga);

                $items[] = [
                    'item_no' => (string) ($idx + 1),
                    'item_nama' => (string) ($detail->uraian ?? '-'),
                    'item_volume' => $this->formatVolume($vol),
                    'item_satuan' => (string) ($detail->satuan ?? '-'),
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
                'item_satuan' => 'Paket',
                'item_harga' => $this->formatNumber($totalAmount),
                'item_harga_rupiah' => $this->formatRupiah($totalAmount),
                'item_subtotal' => $this->formatNumber($totalAmount),
                'item_subtotal_rupiah' => $this->formatRupiah($totalAmount),
            ];
        }

        return [
            'text' => $text,
            'items' => $items,
            'images' => $this->baseSchoolImages($sekolah),
            'kop_border' => $this->resolveKopBorder($sekolah),
        ];
    }

    // -------------------------------------------------------------------------
    // Sample .docx Generators
    // -------------------------------------------------------------------------

    protected function generateTandaTerimaSampleDocx(): string
    {
        $phpWord = new PhpWord;
        $phpWord->setDefaultFontName('Calibri');
        $phpWord->setDefaultFontSize(10);

        $section = $phpWord->addSection([
            'orientation' => 'landscape',
            'marginTop' => 700,
            'marginBottom' => 700,
            'marginLeft' => 850,
            'marginRight' => 850,
        ]);

        $section->addText('${kop_surat}', ['size' => 9, 'color' => '64748B'], ['alignment' => Jc::CENTER, 'spaceAfter' => 120]);
        $section->addText('DAFTAR TANDA TERIMA PEMBAYARAN', ['bold' => true, 'size' => 14], ['alignment' => Jc::CENTER, 'spaceAfter' => 40]);
        $section->addText('${sumber_dana} Tahun Anggaran ${tahun_anggaran} (${tahap})', ['size' => 10, 'color' => '334155'], ['alignment' => Jc::CENTER, 'spaceAfter' => 160]);

        $metaTable = $section->addTable([
            'borderSize' => 0,
            'borderColor' => 'FFFFFF',
            'cellMargin' => 35,
            'width' => 100 * 50,
            'unit' => 'pct',
        ]);
        foreach ([
            ['Kode Kegiatan', '${kode_kegiatan} - ${sub_program}'],
            ['Kode Rekening', '${kode_rekening} - ${rincian_objek}'],
            ['Uraian', '${uraian}'],
            ['Sumber Dana', '${sumber_dana}'],
        ] as [$label, $val]) {
            $metaTable->addRow();
            $metaTable->addCell(2200)->addText($label, ['bold' => true]);
            $metaTable->addCell(250)->addText(':');
            $metaTable->addCell(11000)->addText($val);
        }

        $section->addTextBreak(1);

        $table = $section->addTable([
            'borderSize' => 6,
            'borderColor' => '334155',
            'cellMargin' => 55,
            'width' => 100 * 50,
            'unit' => 'pct',
        ]);
        $hdrStyle = ['bold' => true, 'size' => 9];
        $hdrCell = ['bgColor' => 'F1F5F9', 'valign' => 'center'];

        $table->addRow();
        $table->addCell(550, $hdrCell)->addText('No', $hdrStyle, ['alignment' => Jc::CENTER]);
        $table->addCell(2600, $hdrCell)->addText('Nama Penerima', $hdrStyle, ['alignment' => Jc::CENTER]);
        $table->addCell(2500, $hdrCell)->addText('Uraian', $hdrStyle, ['alignment' => Jc::CENTER]);
        $table->addCell(750, $hdrCell)->addText('Vol', $hdrStyle, ['alignment' => Jc::CENTER]);
        $table->addCell(900, $hdrCell)->addText('Satuan', $hdrStyle, ['alignment' => Jc::CENTER]);
        $table->addCell(1400, $hdrCell)->addText('Harga Satuan', $hdrStyle, ['alignment' => Jc::CENTER]);
        $table->addCell(1400, $hdrCell)->addText('Jumlah Bruto', $hdrStyle, ['alignment' => Jc::CENTER]);
        $table->addCell(1250, $hdrCell)->addText('Potongan Pajak', $hdrStyle, ['alignment' => Jc::CENTER]);
        $table->addCell(1500, $hdrCell)->addText('Jumlah Diterima', $hdrStyle, ['alignment' => Jc::CENTER]);
        $table->addCell(1350, $hdrCell)->addText('Tanda Tangan', $hdrStyle, ['alignment' => Jc::CENTER]);

        // 1 baris cloneRow
        $table->addRow();
        $table->addCell(550)->addText('${item_no}', null, ['alignment' => Jc::CENTER]);
        $table->addCell(2600)->addText('${item_penerima}');
        $table->addCell(2500)->addText('${item_nama}');
        $table->addCell(750)->addText('${item_volume}', null, ['alignment' => Jc::CENTER]);
        $table->addCell(900)->addText('${item_satuan}', null, ['alignment' => Jc::CENTER]);
        $table->addCell(1400)->addText('${item_harga_rupiah}', null, ['alignment' => Jc::END]);
        $table->addCell(1400)->addText('${item_subtotal_rupiah}', null, ['alignment' => Jc::END]);
        $table->addCell(1250)->addText('${item_pajak_rupiah}', null, ['alignment' => Jc::END]);
        $table->addCell(1500)->addText('${item_bersih_rupiah}', null, ['alignment' => Jc::END]);
        $table->addCell(1350)->addText(' ', null, ['alignment' => Jc::CENTER]);

        // Baris Total
        $table->addRow();
        $table->addCell(8700, ['gridSpan' => 6, 'bgColor' => 'F8FAFC'])->addText('JUMLAH TOTAL', ['bold' => true], ['alignment' => Jc::END]);
        $table->addCell(1400, ['bgColor' => 'F8FAFC'])->addText('${jumlah_rupiah}', ['bold' => true], ['alignment' => Jc::END]);
        $table->addCell(1250, ['bgColor' => 'F8FAFC'])->addText('${potongan_pajak}', ['bold' => true], ['alignment' => Jc::END]);
        $table->addCell(1500, ['bgColor' => 'F8FAFC'])->addText('${jumlah_diterima_rupiah}', ['bold' => true], ['alignment' => Jc::END]);
        $table->addCell(1350, ['bgColor' => 'F8FAFC'])->addText(' ');

        $section->addTextBreak(1);
        $section->addText('Terbilang: ${terbilang_diterima_title}', ['italic' => true, 'size' => 9.5]);
        $section->addTextBreak(1);

        $sigTable = $section->addTable([
            'borderSize' => 0,
            'borderColor' => 'FFFFFF',
            'width' => 100 * 50,
            'unit' => 'pct',
        ]);
        $center = ['alignment' => Jc::CENTER, 'spaceAfter' => 20];
        $sigTable->addRow();

        $left = $sigTable->addCell(7000);
        $left->addText('Mengetahui,', null, $center);
        $left->addText('Kepala Sekolah', ['bold' => true], $center);
        $left->addTextBreak(3);
        $left->addText('${kepala_sekolah}', ['bold' => true, 'underline' => 'single'], $center);
        $left->addText('NIP. ${nip_kepala_sekolah}', ['size' => 9], $center);

        $right = $sigTable->addCell(7000);
        $right->addText('${tanggal_lunas}', null, $center);
        $right->addText('Bendahara ${sumber_dana}', ['bold' => true], $center);
        $right->addTextBreak(3);
        $right->addText('${bendahara}', ['bold' => true, 'underline' => 'single'], $center);
        $right->addText('NIP. ${nip_bendahara}', ['size' => 9], $center);

        $tempDir = $this->ensureTempDir();
        $path = $tempDir.DIRECTORY_SEPARATOR.'contoh_template_tanda_terima_'.uniqid('', true).'.docx';
        $phpWord->save($path, 'Word2007');

        return $path;
    }

    protected function generateBastSampleDocx(): string
    {
        $phpWord = new PhpWord;
        $phpWord->setDefaultFontName('Calibri');
        $phpWord->setDefaultFontSize(10.5);

        $section = $phpWord->addSection([
            'marginTop' => 700,
            'marginBottom' => 700,
            'marginLeft' => 900,
            'marginRight' => 900,
        ]);

        $section->addText('${kop_surat}', ['size' => 9, 'color' => '64748B'], ['alignment' => Jc::CENTER, 'spaceAfter' => 120]);
        $section->addText('BERITA ACARA SERAH TERIMA BARANG', ['bold' => true, 'underline' => 'single', 'size' => 13], ['alignment' => Jc::CENTER, 'spaceAfter' => 40]);
        $section->addText('Nomor: ${nomor_bast}', ['size' => 10], ['alignment' => Jc::CENTER, 'spaceAfter' => 160]);

        $section->addText(
            'Pada hari ini, ${tanggal_bast_lengkap}, yang bertanda tangan di bawah ini:',
            null,
            ['alignment' => Jc::BOTH, 'spaceAfter' => 100]
        );

        $section->addText('1. PIHAK PERTAMA (Yang Menyerahkan)', ['bold' => true], ['spaceAfter' => 40]);
        $p1Table = $section->addTable(['borderSize' => 0, 'borderColor' => 'FFFFFF', 'cellMargin' => 30, 'width' => 100 * 50, 'unit' => 'pct']);
        foreach ([
            ['Nama', '${pihak_pertama_nama}'],
            ['Jabatan', '${pihak_pertama_jabatan}'],
            ['Perusahaan / Instansi', '${pihak_pertama_instansi}'],
            ['Alamat', '${pihak_pertama_alamat}'],
        ] as [$lbl, $val]) {
            $p1Table->addRow();
            $p1Table->addCell(2600)->addText($lbl);
            $p1Table->addCell(250)->addText(':');
            $p1Table->addCell(7200)->addText($val);
        }
        $section->addText('Selanjutnya disebut sebagai PIHAK PERTAMA.', ['italic' => true, 'size' => 9.5], ['spaceAfter' => 100]);

        $section->addText('2. PIHAK KEDUA (Yang Menerima)', ['bold' => true], ['spaceAfter' => 40]);
        $p2Table = $section->addTable(['borderSize' => 0, 'borderColor' => 'FFFFFF', 'cellMargin' => 30, 'width' => 100 * 50, 'unit' => 'pct']);
        foreach ([
            ['Nama', '${pihak_kedua_nama}'],
            ['Jabatan', '${pihak_kedua_jabatan}'],
            ['Instansi', '${pihak_kedua_instansi}'],
            ['Alamat', '${pihak_kedua_alamat}'],
        ] as [$lbl, $val]) {
            $p2Table->addRow();
            $p2Table->addCell(2600)->addText($lbl);
            $p2Table->addCell(250)->addText(':');
            $p2Table->addCell(7200)->addText($val);
        }
        $section->addText('Selanjutnya disebut sebagai PIHAK KEDUA.', ['italic' => true, 'size' => 9.5], ['spaceAfter' => 120]);

        $section->addText(
            'PIHAK PERTAMA dengan ini menyerahkan barang kepada PIHAK KEDUA, dan PIHAK KEDUA menyatakan telah menerima barang dalam kondisi baik dengan rincian sebagai berikut:',
            null,
            ['alignment' => Jc::BOTH, 'spaceAfter' => 100]
        );

        $table = $section->addTable([
            'borderSize' => 6,
            'borderColor' => '334155',
            'cellMargin' => 55,
            'width' => 100 * 50,
            'unit' => 'pct',
        ]);
        $hdrStyle = ['bold' => true, 'size' => 9.5];
        $hdrCell = ['bgColor' => 'F1F5F9', 'valign' => 'center'];

        $table->addRow();
        $table->addCell(550, $hdrCell)->addText('No', $hdrStyle, ['alignment' => Jc::CENTER]);
        $table->addCell(3350, $hdrCell)->addText('Nama Barang', $hdrStyle, ['alignment' => Jc::CENTER]);
        $table->addCell(800, $hdrCell)->addText('Jumlah', $hdrStyle, ['alignment' => Jc::CENTER]);
        $table->addCell(1000, $hdrCell)->addText('Satuan', $hdrStyle, ['alignment' => Jc::CENTER]);
        $table->addCell(1100, $hdrCell)->addText('Kondisi', $hdrStyle, ['alignment' => Jc::CENTER]);
        $table->addCell(1600, $hdrCell)->addText('Harga Satuan', $hdrStyle, ['alignment' => Jc::CENTER]);
        $table->addCell(1600, $hdrCell)->addText('Total Harga', $hdrStyle, ['alignment' => Jc::CENTER]);

        $table->addRow();
        $table->addCell(550)->addText('${item_no}', null, ['alignment' => Jc::CENTER]);
        $table->addCell(3350)->addText('${item_nama}');
        $table->addCell(800)->addText('${item_volume}', null, ['alignment' => Jc::CENTER]);
        $table->addCell(1000)->addText('${item_satuan}', null, ['alignment' => Jc::CENTER]);
        $table->addCell(1100)->addText('${item_kondisi}', null, ['alignment' => Jc::CENTER]);
        $table->addCell(1600)->addText('${item_harga_rupiah}', null, ['alignment' => Jc::END]);
        $table->addCell(1600)->addText('${item_subtotal_rupiah}', null, ['alignment' => Jc::END]);

        $table->addRow();
        $table->addCell(8400, ['gridSpan' => 6, 'bgColor' => 'F8FAFC'])->addText('TOTAL KESELURUHAN', ['bold' => true], ['alignment' => Jc::END]);
        $table->addCell(1600, ['bgColor' => 'F8FAFC'])->addText('${jumlah_rupiah}', ['bold' => true], ['alignment' => Jc::END]);

        $section->addTextBreak(1);
        $section->addText(
            'Nilai total barang yang diserahterimakan sebesar ${jumlah_rupiah} (${terbilang_title}) bersumber dari dana ${sumber_dana} Tahun Anggaran ${tahun_anggaran}.',
            null,
            ['alignment' => Jc::BOTH, 'spaceAfter' => 100]
        );
        $section->addText(
            'Demikian Berita Acara Serah Terima Barang ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.',
            null,
            ['alignment' => Jc::BOTH, 'spaceAfter' => 160]
        );

        $sigTable = $section->addTable(['borderSize' => 0, 'borderColor' => 'FFFFFF', 'width' => 100 * 50, 'unit' => 'pct']);
        $center = ['alignment' => Jc::CENTER, 'spaceAfter' => 20];
        $sigTable->addRow();

        $left = $sigTable->addCell(5000);
        $left->addText('Yang Menyerahkan,', null, $center);
        $left->addText('PIHAK PERTAMA', ['bold' => true], $center);
        $left->addTextBreak(3);
        $left->addText('${pihak_pertama_nama}', ['bold' => true, 'underline' => 'single'], $center);
        $left->addText('${pihak_pertama_jabatan}', ['size' => 9], $center);

        $right = $sigTable->addCell(5000);
        $right->addText('${kabupaten_kota}, ${tanggal_bast}', null, $center);
        $right->addText('PIHAK KEDUA', ['bold' => true], $center);
        $right->addTextBreak(3);
        $right->addText('${pihak_kedua_nama}', ['bold' => true, 'underline' => 'single'], $center);
        $right->addText('${pihak_kedua_jabatan}', ['size' => 9], $center);

        $tempDir = $this->ensureTempDir();
        $path = $tempDir.DIRECTORY_SEPARATOR.'contoh_template_bast_'.uniqid('', true).'.docx';
        $phpWord->save($path, 'Word2007');

        return $path;
    }

    protected function generateSuratPesananSampleDocx(): string
    {
        $phpWord = new PhpWord;
        $phpWord->setDefaultFontName('Calibri');
        $phpWord->setDefaultFontSize(10.5);

        $section = $phpWord->addSection([
            'marginTop' => 700,
            'marginBottom' => 700,
            'marginLeft' => 900,
            'marginRight' => 900,
        ]);

        $section->addText('${kop_surat}', ['size' => 9, 'color' => '64748B'], ['alignment' => Jc::CENTER, 'spaceAfter' => 120]);
        $section->addText('SURAT PESANAN (SP) BARANG / JASA', ['bold' => true, 'underline' => 'single', 'size' => 13], ['alignment' => Jc::CENTER, 'spaceAfter' => 40]);
        $section->addText('Nomor: ${nomor_sp}', ['size' => 10], ['alignment' => Jc::CENTER, 'spaceAfter' => 160]);

        $section->addText('Yang bertanda tangan di bawah ini (PIHAK KESATU / Pemesan):', ['bold' => true], ['spaceAfter' => 40]);
        $p1Table = $section->addTable(['borderSize' => 0, 'borderColor' => 'FFFFFF', 'cellMargin' => 30, 'width' => 100 * 50, 'unit' => 'pct']);
        foreach ([
            ['Nama', '${pihak_kesatu_nama}'],
            ['NIP', '${pihak_kesatu_nip}'],
            ['Jabatan', '${pihak_kesatu_jabatan}'],
            ['Instansi', '${pihak_kesatu_instansi}'],
            ['Alamat', '${pihak_kesatu_alamat}'],
        ] as [$lbl, $val]) {
            $p1Table->addRow();
            $p1Table->addCell(2600)->addText($lbl);
            $p1Table->addCell(250)->addText(':');
            $p1Table->addCell(7200)->addText($val);
        }

        $section->addTextBreak(1);
        $section->addText('Dengan ini memesan barang/jasa kepada (PIHAK KEDUA / Penyedia):', ['bold' => true], ['spaceAfter' => 40]);
        $p2Table = $section->addTable(['borderSize' => 0, 'borderColor' => 'FFFFFF', 'cellMargin' => 30, 'width' => 100 * 50, 'unit' => 'pct']);
        foreach ([
            ['Nama Perusahaan / Toko', '${pihak_kedua_nama_perusahaan}'],
            ['Penanggung Jawab', '${pihak_kedua_penanggung_jawab}'],
            ['Alamat Perusahaan', '${pihak_kedua_alamat}'],
            ['NPWP', '${pihak_kedua_npwp}'],
        ] as [$lbl, $val]) {
            $p2Table->addRow();
            $p2Table->addCell(2600)->addText($lbl);
            $p2Table->addCell(250)->addText(':');
            $p2Table->addCell(7200)->addText($val);
        }

        $section->addTextBreak(1);
        $section->addText('Rincian Pesanan:', ['bold' => true], ['spaceAfter' => 60]);

        $table = $section->addTable([
            'borderSize' => 6,
            'borderColor' => '334155',
            'cellMargin' => 55,
            'width' => 100 * 50,
            'unit' => 'pct',
        ]);
        $hdrStyle = ['bold' => true, 'size' => 9.5];
        $hdrCell = ['bgColor' => 'F1F5F9', 'valign' => 'center'];

        $table->addRow();
        $table->addCell(600, $hdrCell)->addText('No', $hdrStyle, ['alignment' => Jc::CENTER]);
        $table->addCell(4200, $hdrCell)->addText('Nama Barang / Jasa', $hdrStyle, ['alignment' => Jc::CENTER]);
        $table->addCell(900, $hdrCell)->addText('Vol', $hdrStyle, ['alignment' => Jc::CENTER]);
        $table->addCell(1100, $hdrCell)->addText('Satuan', $hdrStyle, ['alignment' => Jc::CENTER]);
        $table->addCell(1600, $hdrCell)->addText('Harga Satuan', $hdrStyle, ['alignment' => Jc::CENTER]);
        $table->addCell(1600, $hdrCell)->addText('Total Harga', $hdrStyle, ['alignment' => Jc::CENTER]);

        $table->addRow();
        $table->addCell(600)->addText('${item_no}', null, ['alignment' => Jc::CENTER]);
        $table->addCell(4200)->addText('${item_nama}');
        $table->addCell(900)->addText('${item_volume}', null, ['alignment' => Jc::CENTER]);
        $table->addCell(1100)->addText('${item_satuan}', null, ['alignment' => Jc::CENTER]);
        $table->addCell(1600)->addText('${item_harga_rupiah}', null, ['alignment' => Jc::END]);
        $table->addCell(1600)->addText('${item_subtotal_rupiah}', null, ['alignment' => Jc::END]);

        $table->addRow();
        $table->addCell(8400, ['gridSpan' => 5, 'bgColor' => 'F8FAFC'])->addText('TOTAL HARGA', ['bold' => true], ['alignment' => Jc::END]);
        $table->addCell(1600, ['bgColor' => 'F8FAFC'])->addText('${jumlah_rupiah}', ['bold' => true], ['alignment' => Jc::END]);

        $section->addTextBreak(1);
        $section->addText('Terbilang: ${terbilang_title}', ['italic' => true, 'size' => 9.5], ['spaceAfter' => 100]);

        $section->addText('Syarat dan Ketentuan:', ['bold' => true], ['spaceAfter' => 40]);
        $section->addText('1. Waktu Pengiriman: ${waktu_pengiriman}', null, ['spaceAfter' => 30]);
        $section->addText('2. Kondisi Barang: ${kondisi_barang}', null, ['spaceAfter' => 30]);
        $section->addText('3. Ketentuan Pembayaran: ${ketentuan_pembayaran}', null, ['spaceAfter' => 30]);
        $section->addText('4. Sumber Dana: ${sumber_dana_sp}', null, ['spaceAfter' => 160]);

        $sigTable = $section->addTable(['borderSize' => 0, 'borderColor' => 'FFFFFF', 'width' => 100 * 50, 'unit' => 'pct']);
        $center = ['alignment' => Jc::CENTER, 'spaceAfter' => 20];
        $sigTable->addRow();

        $left = $sigTable->addCell(5000);
        $left->addText('Menyetujui,', null, $center);
        $left->addText('PIHAK KEDUA (Penyedia)', ['bold' => true], $center);
        $left->addTextBreak(3);
        $left->addText('${pihak_kedua_penanggung_jawab}', ['bold' => true, 'underline' => 'single'], $center);
        $left->addText('${pihak_kedua_nama_perusahaan}', ['size' => 9], $center);

        $right = $sigTable->addCell(5000);
        $right->addText('${kabupaten_kota}, ${tanggal_sp}', null, $center);
        $right->addText('PIHAK KESATU (Pemesan)', ['bold' => true], $center);
        $right->addTextBreak(3);
        $right->addText('${pihak_kesatu_nama}', ['bold' => true, 'underline' => 'single'], $center);
        $right->addText('NIP. ${pihak_kesatu_nip}', ['size' => 9], $center);

        $tempDir = $this->ensureTempDir();
        $path = $tempDir.DIRECTORY_SEPARATOR.'contoh_template_surat_pesanan_'.uniqid('', true).'.docx';
        $phpWord->save($path, 'Word2007');

        return $path;
    }
}
