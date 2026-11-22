<?php

namespace App\Services;

use App\Config\VariantConfig;
use App\Exceptions\KwitansiTemplateException;
use App\Models\KwitansiTemplate;
use App\Models\SekolahProfile;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpWord\PhpWord;
use PhpOffice\PhpWord\Settings as PhpWordSettings;
use PhpOffice\PhpWord\SimpleType\Jc;
use PhpOffice\PhpWord\TemplateProcessor;

class KwitansiTemplateService
{
    private const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

    private const R_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

    private const REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';

    private const CT_NS = 'http://schemas.openxmlformats.org/package/2006/content-types';

    private const VML_NS = 'urn:schemas-microsoft-com:vml';

    private const OFFICE_NS = 'urn:schemas-microsoft-com:office:office';

    /** @var array<int, string> */
    public const ITEM_TABLE_VARIABLES = [
        'item_no',
        'item_nama',
        'item_volume',
        'item_satuan',
        'item_harga',
        'item_harga_rupiah',
        'item_subtotal',
        'item_subtotal_rupiah',
    ];

    private const MAX_ZIP_ENTRIES = 500;

    private const MAX_UNCOMPRESSED_XML_BYTES = 20 * 1024 * 1024; // 20 MB

    /** @var array<string, array{width: string, height: string, ratio: bool, fit_margin: bool}> */
    public const IMAGE_VARIABLES = [
        'kop_surat' => ['width' => '482pt', 'height' => '', 'ratio' => true, 'fit_margin' => true],
        'logo_sekolah' => ['width' => '55pt', 'height' => '', 'ratio' => true, 'fit_margin' => false],
        'logo_daerah' => ['width' => '55pt', 'height' => '', 'ratio' => true, 'fit_margin' => false],
    ];

    public function __construct(
        protected SkSuratService $skSuratService,
    ) {}

    /**
     * Katalog lengkap variabel yang didukung oleh template Kwitansi kustom.
     *
     * @return array<int, array{group: string, type: string, description: string, items: array<int, array{key: string, tag: string, label: string, example: string}>}>
     */
    public function variableCatalog(): array
    {
        return [
            [
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
            ],
            [
                'group' => 'Anggaran & Kode',
                'type' => 'text',
                'description' => 'Menyesuaikan varian BOSP (Reguler / Kinerja / SiLPA) & penganggaran aktif.',
                'items' => [
                    ['key' => 'tahun_anggaran', 'tag' => '${tahun_anggaran}', 'label' => 'Tahun Anggaran', 'example' => '2026'],
                    ['key' => 'sumber_dana', 'tag' => '${sumber_dana}', 'label' => 'Sumber Dana (Varian)', 'example' => 'BOSP Reguler'],
                    ['key' => 'tahap', 'tag' => '${tahap}', 'label' => 'Tahap Penyaluran', 'example' => 'THP-I'],
                    ['key' => 'no_bukti', 'tag' => '${no_bukti}', 'label' => 'Nomor Bukti / ID Transaksi', 'example' => 'BNU01'],
                    ['key' => 'kode_kegiatan', 'tag' => '${kode_kegiatan}', 'label' => 'Kode Kegiatan Lengkap', 'example' => '06.05.01'],
                    ['key' => 'kode_program', 'tag' => '${kode_program}', 'label' => 'Kode Program', 'example' => '06'],
                    ['key' => 'program', 'tag' => '${program}', 'label' => 'Nama Program', 'example' => 'Pengembangan Standar Pengelolaan'],
                    ['key' => 'kode_sub_program', 'tag' => '${kode_sub_program}', 'label' => 'Kode Sub Program', 'example' => '06.05'],
                    ['key' => 'sub_program', 'tag' => '${sub_program}', 'label' => 'Nama Sub Program', 'example' => 'Pelaksanaan Administrasi Kegiatan Sekolah'],
                    ['key' => 'uraian_kegiatan', 'tag' => '${uraian_kegiatan}', 'label' => 'Uraian Kegiatan', 'example' => 'Pembelian ATK'],
                    ['key' => 'kode_rekening', 'tag' => '${kode_rekening}', 'label' => 'Kode Rekening Belanja', 'example' => '5.1.02.01.01.0024'],
                    ['key' => 'rincian_objek', 'tag' => '${rincian_objek}', 'label' => 'Rincian Objek Rekening', 'example' => 'Belanja Alat/Bahan untuk Kegiatan Kantor'],
                ],
            ],
            [
                'group' => 'Transaksi & Nominal',
                'type' => 'text',
                'description' => 'Nominal total, teks terbilang, uraian, dan tanggal transaksi.',
                'items' => [
                    ['key' => 'uraian', 'tag' => '${uraian}', 'label' => 'Uraian Pembayaran (Utama)', 'example' => 'Pembelian Kertas HVS dan Tinta Printer'],
                    ['key' => 'uraian_bku', 'tag' => '${uraian_bku}', 'label' => 'Uraian BKU Asli', 'example' => 'Belanja ATK Bulan Maret'],
                    ['key' => 'jumlah_angka', 'tag' => '${jumlah_angka}', 'label' => 'Jumlah (Angka Saja)', 'example' => '1.500.000'],
                    ['key' => 'jumlah_rupiah', 'tag' => '${jumlah_rupiah}', 'label' => 'Jumlah (Dengan Rp)', 'example' => 'Rp 1.500.000'],
                    ['key' => 'terbilang', 'tag' => '${terbilang}', 'label' => 'Terbilang (Kalimat)', 'example' => 'Satu juta lima ratus ribu rupiah'],
                    ['key' => 'terbilang_title', 'tag' => '${terbilang_title}', 'label' => 'Terbilang (Kapital Awal Kata)', 'example' => 'Satu Juta Lima Ratus Ribu Rupiah'],
                    ['key' => 'tanggal_transaksi', 'tag' => '${tanggal_transaksi}', 'label' => 'Tanggal Transaksi', 'example' => '15 Maret 2026'],
                    ['key' => 'tanggal_lunas', 'tag' => '${tanggal_lunas}', 'label' => 'Tanggal Lunas Bayar', 'example' => 'Lunas Bayar, 15 Maret 2026'],
                    ['key' => 'bulan_transaksi', 'tag' => '${bulan_transaksi}', 'label' => 'Nama Bulan Transaksi', 'example' => 'Maret'],
                ],
            ],
            [
                'group' => 'Pajak',
                'type' => 'text',
                'description' => 'Klasifikasi PPn, PPh, PB1, dan jumlah bersih setelah pajak.',
                'items' => [
                    ['key' => 'ppn', 'tag' => '${ppn}', 'label' => 'PPn (Dengan Rp)', 'example' => 'Rp 150.000'],
                    ['key' => 'ppn_angka', 'tag' => '${ppn_angka}', 'label' => 'PPn (Angka Saja)', 'example' => '150.000'],
                    ['key' => 'pph', 'tag' => '${pph}', 'label' => 'PPh (Dengan Rp)', 'example' => 'Rp 30.000'],
                    ['key' => 'pph_angka', 'tag' => '${pph_angka}', 'label' => 'PPh (Angka Saja)', 'example' => '30.000'],
                    ['key' => 'pb1', 'tag' => '${pb1}', 'label' => 'PB1 / Pajak Daerah (Dengan Rp)', 'example' => 'Rp 0'],
                    ['key' => 'pb1_angka', 'tag' => '${pb1_angka}', 'label' => 'PB1 / Pajak Daerah (Angka)', 'example' => '0'],
                    ['key' => 'total_pajak', 'tag' => '${total_pajak}', 'label' => 'Total Pajak (Dengan Rp)', 'example' => 'Rp 180.000'],
                    ['key' => 'total_pajak_angka', 'tag' => '${total_pajak_angka}', 'label' => 'Total Pajak (Angka)', 'example' => '180.000'],
                    ['key' => 'jumlah_bersih', 'tag' => '${jumlah_bersih}', 'label' => 'Jumlah Bersih (Angka)', 'example' => '1.320.000'],
                    ['key' => 'jumlah_bersih_rupiah', 'tag' => '${jumlah_bersih_rupiah}', 'label' => 'Jumlah Bersih (Dengan Rp)', 'example' => 'Rp 1.320.000'],
                ],
            ],
            [
                'group' => 'Penanggung Jawab & Penerima',
                'type' => 'text',
                'description' => 'Kepala Sekolah, Bendahara, Komite (dari Penganggaran) dan Penerima (dari BKU).',
                'items' => [
                    ['key' => 'kepala_sekolah', 'tag' => '${kepala_sekolah}', 'label' => 'Nama Kepala Sekolah', 'example' => 'Dra. Siti Aminah'],
                    ['key' => 'nip_kepala_sekolah', 'tag' => '${nip_kepala_sekolah}', 'label' => 'NIP Kepala Sekolah', 'example' => '197001011998022001'],
                    ['key' => 'bendahara', 'tag' => '${bendahara}', 'label' => 'Nama Bendahara', 'example' => 'Budi Santoso, S.Pd'],
                    ['key' => 'nip_bendahara', 'tag' => '${nip_bendahara}', 'label' => 'NIP Bendahara', 'example' => '198505122010011005'],
                    ['key' => 'komite', 'tag' => '${komite}', 'label' => 'Nama Ketua Komite', 'example' => 'H. Ahmad Fauzi'],
                    ['key' => 'penerima', 'tag' => '${penerima}', 'label' => 'Nama Penerima Pembayaran', 'example' => 'Toko Jaya Makmur'],
                ],
            ],
            [
                'group' => 'Tabel Rincian Barang (Baris Dinamis)',
                'type' => 'table',
                'description' => 'Letakkan 1 baris contoh di dalam tabel Word; baris otomatis digandakan sesuai jumlah item belanja.',
                'items' => [
                    ['key' => 'item_no', 'tag' => '${item_no}', 'label' => 'Nomor Urut Baris', 'example' => '1'],
                    ['key' => 'item_nama', 'tag' => '${item_nama}', 'label' => 'Nama / Uraian Barang', 'example' => 'Kertas HVS A4 70gr'],
                    ['key' => 'item_volume', 'tag' => '${item_volume}', 'label' => 'Jumlah / Volume', 'example' => '10'],
                    ['key' => 'item_satuan', 'tag' => '${item_satuan}', 'label' => 'Satuan', 'example' => 'Rim'],
                    ['key' => 'item_harga', 'tag' => '${item_harga}', 'label' => 'Harga Satuan (Angka)', 'example' => '55.000'],
                    ['key' => 'item_harga_rupiah', 'tag' => '${item_harga_rupiah}', 'label' => 'Harga Satuan (Rp)', 'example' => 'Rp 55.000'],
                    ['key' => 'item_subtotal', 'tag' => '${item_subtotal}', 'label' => 'Subtotal Baris (Angka)', 'example' => '550.000'],
                    ['key' => 'item_subtotal_rupiah', 'tag' => '${item_subtotal_rupiah}', 'label' => 'Subtotal Baris (Rp)', 'example' => 'Rp 550.000'],
                ],
            ],
            [
                'group' => 'Gambar & Kop Surat',
                'type' => 'image',
                'description' => 'Otomatis menarik gambar dari Profil Sekolah (atau bisa langsung ditempel manual di file Word).',
                'items' => [
                    ['key' => 'kop_surat', 'tag' => '${kop_surat}', 'label' => 'Gambar Kop Surat Sekolah', 'example' => 'Otomatis selebar margin (atau ${kop_surat:16cm})'],
                    ['key' => 'logo_sekolah', 'tag' => '${logo_sekolah}', 'label' => 'Logo Sekolah', 'example' => 'Lebar ~2 cm (atau ${logo_sekolah:2.5cm})'],
                    ['key' => 'logo_daerah', 'tag' => '${logo_daerah}', 'label' => 'Logo Daerah / Pemda', 'example' => 'Lebar ~2 cm (atau ${logo_daerah:2.5cm})'],
                ],
            ],
        ];
    }

    /**
     * Daftar seluruh key variabel yang dikenal sistem.
     *
     * @return array<int, string>
     */
    public function recognizedVariableKeys(): array
    {
        $keys = [];
        foreach ($this->variableCatalog() as $group) {
            foreach ($group['items'] as $item) {
                $keys[] = $item['key'];
            }
        }

        return $keys;
    }

    /**
     * Pindai & klasifikasikan variabel di file .docx template.
     *
     * @return array{recognized: array<int, string>, unrecognized: array<int, string>, unclosed: array<int, string>, item_table_vars: array<int, string>, image_vars: array<int, string>, has_item_table: bool}
     *
     * @throws \RuntimeException
     */
    public function analyzeTemplateFile(string $fullPath): array
    {
        $this->assertSafeDocxArchive($fullPath);

        try {
            $report = $this->skSuratService->extractVariableReport($fullPath);
        } catch (\RuntimeException $e) {
            throw new KwitansiTemplateException($e->getMessage(), 0, $e);
        }

        $knownLookup = array_fill_keys($this->recognizedVariableKeys(), true);
        $itemLookup = array_fill_keys(self::ITEM_TABLE_VARIABLES, true);

        $recognized = [];
        $unrecognized = [];
        $itemTableVars = [];
        $imageVars = [];

        foreach ($report['variables'] as $var) {
            $imageBaseKey = $this->resolveImageVariableBaseKey($var);
            if ($imageBaseKey !== null) {
                $recognized[$imageBaseKey] = true;
                $imageVars[$imageBaseKey] = true;
            } elseif (isset($knownLookup[$var])) {
                $recognized[$var] = true;
                if (isset($itemLookup[$var])) {
                    $itemTableVars[$var] = true;
                }
            } else {
                $unrecognized[$var] = true;
            }
        }

        return [
            'recognized' => array_keys($recognized),
            'unrecognized' => array_keys($unrecognized),
            'unclosed' => $report['unclosed'],
            'item_table_vars' => array_keys($itemTableVars),
            'image_vars' => array_keys($imageVars),
            'has_item_table' => $itemTableVars !== [],
        ];
    }

    /**
     * Validasi keamanan arsip .docx: tolak file bermakro (.docm yang diubah ekstensi) & ZIP bomb XML.
     *
     * @throws KwitansiTemplateException
     */
    public function assertSafeDocxArchive(string $fullPath): void
    {
        if (! is_file($fullPath) || ! is_readable($fullPath)) {
            throw new KwitansiTemplateException('Berkas template tidak ditemukan atau tidak dapat dibaca.');
        }

        $zip = new \ZipArchive;
        if ($zip->open($fullPath) !== true) {
            throw new KwitansiTemplateException('Berkas bukan dokumen Word (.docx) yang valid.');
        }

        try {
            if ($zip->numFiles <= 0 || $zip->numFiles > self::MAX_ZIP_ENTRIES) {
                throw new KwitansiTemplateException('Struktur arsip .docx tidak valid atau melebihi batas keamanan.');
            }

            $hasMainDocument = false;
            $totalXmlUncompressed = 0;

            for ($i = 0; $i < $zip->numFiles; $i++) {
                $stat = $zip->statIndex($i);
                if (! is_array($stat)) {
                    continue;
                }

                $name = (string) ($stat['name'] ?? '');
                $lowerName = strtolower(str_replace('\\', '/', $name));
                $uncompressedSize = (int) ($stat['size'] ?? 0);

                if (str_contains($lowerName, 'vbaproject.bin') || str_contains($lowerName, 'vbadata.xml')) {
                    throw new KwitansiTemplateException('File Word bermakro (.docm / VBA) tidak diizinkan demi keamanan.');
                }

                if (preg_match('#^word/document\d*\.xml$#i', $lowerName)) {
                    $hasMainDocument = true;
                }

                if (str_ends_with($lowerName, '.xml') || str_ends_with($lowerName, '.rels')) {
                    $totalXmlUncompressed += $uncompressedSize;
                    if ($totalXmlUncompressed > self::MAX_UNCOMPRESSED_XML_BYTES) {
                        throw new KwitansiTemplateException('Ukuran konten XML di dalam file .docx melebihi batas aman (20 MB).');
                    }
                }
            }

            if (! $hasMainDocument) {
                throw new KwitansiTemplateException('Struktur berkas tidak valid. Pastikan file benar-benar berformat .docx (bukan .doc lama).');
            }

            $contentTypes = $zip->getFromName('[Content_Types].xml');
            if (is_string($contentTypes) && str_contains(strtolower($contentTypes), 'macroenabled')) {
                throw new KwitansiTemplateException('File Word bermakro (.docm) tidak diizinkan demi keamanan.');
            }
        } finally {
            $zip->close();
        }
    }

    public function isLibreOfficeAvailable(): bool
    {
        return $this->skSuratService->resolveLibreOfficePath() !== null;
    }

    public function convertDocxToPdf(string $docxPath): string
    {
        try {
            return $this->skSuratService->convertDocxToPdf($docxPath);
        } catch (\RuntimeException $e) {
            throw new KwitansiTemplateException($e->getMessage(), 0, $e);
        }
    }

    /**
     * Kompilasi 1 dokumen kwitansi menjadi file .docx temporer.
     *
     * @throws KwitansiTemplateException
     */
    public function compileSingleDocx(KwitansiTemplate $template, Model $kwitansi, string $variant): string
    {
        $localDisk = Storage::disk('local');
        if (! $template->file_path || ! $localDisk->exists($template->file_path)) {
            throw new KwitansiTemplateException('File template kwitansi tidak ditemukan di penyimpanan.');
        }

        $templatePath = $localDisk->path($template->file_path);
        $tempDir = $this->ensureTempDir();
        $outputPath = $tempDir.DIRECTORY_SEPARATOR.'kwitansi_custom_'.uniqid('', true).'.docx';

        $normalizedPath = $this->skSuratService->createNormalizedTemplateIfNeeded($templatePath, $tempDir);

        $previousEscaping = PhpWordSettings::isOutputEscapingEnabled();
        PhpWordSettings::setOutputEscapingEnabled(true);
        $processorTempFile = null;
        $saved = false;

        try {
            $sourceDocxPath = $normalizedPath ?? $templatePath;
            $processor = new TemplateProcessor($sourceDocxPath);
            $processorTempFile = $this->extractProcessorTempFilename($processor);
            $rawTemplateVars = $processor->getVariables();

            $payload = $this->buildKwitansiVariables($kwitansi, $variant);

            // 1. Proses tabel rincian barang dinamis (cloneRow) terlebih dahulu
            $this->applyItemTableRows($processor, $rawTemplateVars, $payload['items']);

            // 2. Proses placeholder gambar (kop_surat, logo_sekolah, logo_daerah) dengan satuan fisik absolut (pt) & auto-fit margin
            $this->applyImagePlaceholders($processor, $rawTemplateVars, $payload['images'], $sourceDocxPath);

            // 3. Proses seluruh variabel teks (termasuk varian tag dengan spasi di XML)
            foreach ($payload['text'] as $key => $value) {
                $replacement = $this->formatReplacementValue((string) $value);
                $processor->setValue($key, $replacement);

                foreach ($rawTemplateVars as $rawVar) {
                    if ($rawVar !== $key && trim($rawVar) === $key) {
                        $processor->setValue($rawVar, $replacement);
                    }
                }
            }

            $processor->saveAs($outputPath);
            $saved = true;
        } finally {
            PhpWordSettings::setOutputEscapingEnabled($previousEscaping);
            if ($normalizedPath !== null && is_file($normalizedPath)) {
                @unlink($normalizedPath);
            }
            if (! $saved && $processorTempFile !== null && is_file($processorTempFile)) {
                @unlink($processorTempFile);
            }
        }

        return $outputPath;
    }

    /**
     * Kompilasi banyak kwitansi menjadi 1 file .docx multipage (dipisah page break).
     *
     * @param  Collection<int, Model>  $kwitansis
     *
     * @throws KwitansiTemplateException
     */
    public function compileBulkDocx(KwitansiTemplate $template, Collection $kwitansis, string $variant): string
    {
        if ($kwitansis->isEmpty()) {
            throw new KwitansiTemplateException('Tidak ada data kwitansi untuk dikompilasi.');
        }

        if ($kwitansis->count() === 1) {
            return $this->compileSingleDocx($template, $kwitansis->first(), $variant);
        }

        $compiledPaths = [];
        try {
            foreach ($kwitansis as $kwitansi) {
                $compiledPaths[] = $this->compileSingleDocx($template, $kwitansi, $variant);
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
     * Gabungkan beberapa file .docx hasil kompilasi template menjadi 1 file .docx multipage.
     *
     * @param  array<int, string>  $docxPaths
     *
     * @throws KwitansiTemplateException
     */
    public function mergeCompiledDocxFiles(array $docxPaths): string
    {
        $docxPaths = array_values(array_filter($docxPaths, fn ($p) => is_string($p) && is_file($p)));
        if ($docxPaths === []) {
            throw new KwitansiTemplateException('Tidak ada file DOCX untuk digabungkan.');
        }

        $tempDir = $this->ensureTempDir();
        $mergedPath = $tempDir.DIRECTORY_SEPARATOR.'kwitansi_bulk_'.uniqid('', true).'.docx';

        if (! @copy($docxPaths[0], $mergedPath)) {
            throw new KwitansiTemplateException('Gagal membuat arsip DOCX gabungan.');
        }

        if (count($docxPaths) === 1) {
            return $mergedPath;
        }

        $baseZip = new \ZipArchive;
        if ($baseZip->open($mergedPath) !== true) {
            @unlink($mergedPath);
            throw new KwitansiTemplateException('Gagal membuka arsip DOCX basis untuk penggabungan.');
        }

        $succeeded = false;
        try {
            $baseMainPart = $this->resolveMainDocumentPartName($baseZip);
            if ($baseMainPart === null) {
                throw new KwitansiTemplateException('Dokumen basis tidak memiliki bagian utama word/document.xml.');
            }
            $baseRelsPart = $this->resolveRelsPartName($baseMainPart);

            $baseDocXml = $baseZip->getFromName($baseMainPart);
            if (! is_string($baseDocXml) || $baseDocXml === '') {
                throw new KwitansiTemplateException('Konten dokumen basis tidak dapat dibaca.');
            }

            $baseDom = $this->loadXml($baseDocXml);
            $baseXpath = new \DOMXPath($baseDom);
            $baseXpath->registerNamespace('w', self::W_NS);
            $baseBody = $baseXpath->query('/w:document/w:body')->item(0);
            if (! $baseBody instanceof \DOMElement) {
                throw new KwitansiTemplateException('Struktur w:body tidak ditemukan pada dokumen basis.');
            }

            // Cari <w:sectPr> terakhir di w:body agar seluruh konten baru disisipkan sebelum sectPr
            $baseSectPr = null;
            foreach ($baseBody->childNodes as $child) {
                if ($child instanceof \DOMElement && $child->localName === 'sectPr') {
                    $baseSectPr = $child;
                }
            }

            // Baca relasi dokumen basis, indeks hash media untuk deduplikasi, & nomor rId tertinggi
            $baseRelsXml = $baseZip->getFromName($baseRelsPart);
            $baseRelsDom = is_string($baseRelsXml) && $baseRelsXml !== '' ? $this->loadXml($baseRelsXml) : null;
            $nextRelNum = $this->findMaxRelNumber($baseRelsDom) + 1;
            $baseMediaHashToRelId = $this->indexBaseMediaHashes($baseZip, $baseRelsDom);

            $baseContentTypesXml = $baseZip->getFromName('[Content_Types].xml');
            $baseContentTypesDom = is_string($baseContentTypesXml) && $baseContentTypesXml !== '' ? $this->loadXml($baseContentTypesXml) : null;
            $relsModified = false;
            $contentTypesModified = false;
            $usedDrawingIds = $this->collectDrawingIds($baseDom);
            $drawingIdCounter = $this->computeNextSafeDrawingId($usedDrawingIds);
            $baseVmlShapeTypes = $this->collectVmlShapeTypeIds($baseDom);
            $bookmarkIdCounter = $this->findMaxBookmarkId($baseDom) + 1;

            // Simpan clone sectPr penutup dokumen sebelumnya agar konfigurasi kolom (mis. TTD 3 kolom) tetap utuh
            $pendingClosingSectPr = $baseSectPr instanceof \DOMElement ? $baseSectPr->cloneNode(true) : null;
            $mergedAnyAppend = false;

            for ($i = 1; $i < count($docxPaths); $i++) {
                $appendZip = new \ZipArchive;
                if ($appendZip->open($docxPaths[$i]) !== true) {
                    continue;
                }

                try {
                    $appendMainPart = $this->resolveMainDocumentPartName($appendZip);
                    if ($appendMainPart === null) {
                        continue;
                    }
                    $appendDocXml = $appendZip->getFromName($appendMainPart);
                    if (! is_string($appendDocXml) || $appendDocXml === '') {
                        continue;
                    }

                    $appendDom = $this->loadXml($appendDocXml);
                    $appendXpath = new \DOMXPath($appendDom);
                    $appendXpath->registerNamespace('w', self::W_NS);
                    $appendBody = $appendXpath->query('/w:document/w:body')->item(0);
                    if (! $appendBody instanceof \DOMElement) {
                        continue;
                    }

                    // Remap relasi media (gambar) sambil deduplikasi berdasarkan sha1 agar ukuran arsip tetap efisien
                    $rIdMap = [];
                    $appendRelsXml = $appendZip->getFromName($this->resolveRelsPartName($appendMainPart));
                    if (is_string($appendRelsXml) && $appendRelsXml !== '' && $baseRelsDom !== null) {
                        $appendRelsDom = $this->loadXml($appendRelsXml);
                        $relMapResult = $this->mergeMediaRelationships(
                            $baseZip,
                            $baseRelsDom,
                            $baseContentTypesDom,
                            $appendZip,
                            $appendRelsDom,
                            $baseMediaHashToRelId,
                            $i,
                            $nextRelNum
                        );
                        $rIdMap = $relMapResult['map'];
                        $nextRelNum = $relMapResult['nextRelNum'];
                        $baseMediaHashToRelId = $relMapResult['mediaHashToRelId'];
                        if ($relMapResult['relsChanged']) {
                            $relsModified = true;
                        }
                        if ($relMapResult['contentTypesChanged']) {
                            $contentTypesModified = true;
                        }
                    }

                    if ($rIdMap !== []) {
                        $this->remapRelationshipIds($appendDom, $rIdMap);
                    }

                    // Deduplikasi seluruh ID drawing/shape/bookmark agar Word & LibreOffice tidak memperingatkan konten duplikat
                    $drawingIdCounter = $this->deduplicateDrawingIds($appendDom, $drawingIdCounter, $usedDrawingIds);
                    $this->deduplicateVmlShapes($appendDom, $i, $baseVmlShapeTypes);
                    $bookmarkIdCounter = $this->deduplicateBookmarkIds($appendDom, $bookmarkIdCounter, $i);

                    // 1. Tutup seksi akhir kwitansi sebelumnya dengan paragraf section-break agar layout kolom (mis. TTD 3 kolom) tidak rusak
                    if ($pendingClosingSectPr instanceof \DOMElement) {
                        $sectionBreakPara = $this->createSectionBreakParagraph($baseDom, $pendingClosingSectPr);
                        if ($baseSectPr !== null) {
                            $baseBody->insertBefore($sectionBreakPara, $baseSectPr);
                        } else {
                            $baseBody->appendChild($sectionBreakPara);
                        }
                    } else {
                        $pageBreakNode = $this->createPageBreakNode($baseDom);
                        if ($baseSectPr !== null) {
                            $baseBody->insertBefore($pageBreakNode, $baseSectPr);
                        } else {
                            $baseBody->appendChild($pageBreakNode);
                        }
                    }

                    // 2. Temukan sectPr penutup milik kwitansi ini serta sectPr internal (jika template multi-seksi)
                    $appendTrailingSectPr = null;
                    foreach ($appendBody->childNodes as $child) {
                        if ($child instanceof \DOMElement && $child->localName === 'sectPr') {
                            $appendTrailingSectPr = $child;
                        }
                    }

                    $firstInternalSectPr = $appendXpath->query('.//w:pPr/w:sectPr', $appendBody)->item(0);
                    $isMultiSection = $firstInternalSectPr instanceof \DOMElement;

                    if ($isMultiSection) {
                        // Seksi pertama kwitansi baru wajib mulai di halaman baru, sedangkan seksi penutup (mis. TTD 3 kolom) tetap continuous
                        $this->setSectionTypeNextPage($appendDom, $firstInternalSectPr);
                    }

                    foreach ($appendBody->childNodes as $child) {
                        if ($child instanceof \DOMElement && $child->localName === 'sectPr') {
                            continue;
                        }
                        $imported = $baseDom->importNode($child, true);
                        if ($baseSectPr !== null) {
                            $baseBody->insertBefore($imported, $baseSectPr);
                        } else {
                            $baseBody->appendChild($imported);
                        }
                    }

                    // Siapkan sectPr penutup untuk kwitansi ini (dipakai jika ada kwitansi berikutnya atau menjadi sectPr akhir dokumen)
                    if ($appendTrailingSectPr instanceof \DOMElement) {
                        $nextClosingSectPr = $baseDom->importNode($appendTrailingSectPr, true);
                    } elseif ($baseSectPr instanceof \DOMElement) {
                        $nextClosingSectPr = $baseSectPr->cloneNode(true);
                    } else {
                        $nextClosingSectPr = null;
                    }

                    if (! $isMultiSection && $nextClosingSectPr instanceof \DOMElement) {
                        // Template 1-seksi: seksi tunggal ini sekaligus seksi pertama kwitansi baru -> mulai di halaman baru
                        $this->setSectionTypeNextPage($baseDom, $nextClosingSectPr);
                    }

                    $pendingClosingSectPr = $nextClosingSectPr;
                    $mergedAnyAppend = true;
                } finally {
                    $appendZip->close();
                }
            }

            // Pasang sectPr penutup kwitansi terakhir sebagai <w:sectPr> akhir dokumen
            if ($mergedAnyAppend && $pendingClosingSectPr instanceof \DOMElement) {
                if ($baseSectPr instanceof \DOMElement) {
                    $baseBody->replaceChild($pendingClosingSectPr, $baseSectPr);
                } else {
                    $baseBody->appendChild($pendingClosingSectPr);
                }
            }

            $baseZip->addFromString($baseMainPart, $baseDom->saveXML() ?: $baseDocXml);

            if ($relsModified && $baseRelsDom !== null) {
                $baseZip->addFromString($baseRelsPart, $baseRelsDom->saveXML() ?: (string) $baseRelsXml);
            }

            if ($contentTypesModified && $baseContentTypesDom !== null) {
                $baseZip->addFromString('[Content_Types].xml', $baseContentTypesDom->saveXML() ?: (string) $baseContentTypesXml);
            }

            $succeeded = true;
        } finally {
            $baseZip->close();
            if (! $succeeded && is_file($mergedPath)) {
                @unlink($mergedPath);
            }
        }

        return $mergedPath;
    }

    /**
     * Buat file contoh template kwitansi .docx yang siap diedit pengguna di Microsoft Word.
     */
    public function generateSampleDocx(): string
    {
        $phpWord = new PhpWord;
        $phpWord->setDefaultFontName('Calibri');
        $phpWord->setDefaultFontSize(10);

        $section = $phpWord->addSection([
            'marginTop' => 700,
            'marginBottom' => 700,
            'marginLeft' => 900,
            'marginRight' => 900,
        ]);

        // Placeholder Kop Surat (bisa dihapus atau diganti kop buatan sendiri di Word)
        $section->addText('${kop_surat}', ['size' => 9, 'color' => '64748B'], ['alignment' => Jc::CENTER, 'spaceAfter' => 120]);

        // Judul
        $section->addText('KWITANSI PEMBAYARAN', ['bold' => true, 'size' => 15], ['alignment' => Jc::CENTER, 'spaceAfter' => 40]);
        $section->addText('No. Bukti: ${no_bukti}  |  ${sumber_dana} Tahun ${tahun_anggaran} (${tahap})', ['size' => 9.5, 'color' => '334155'], ['alignment' => Jc::CENTER, 'spaceAfter' => 180]);

        // Metadata Anggaran & Pembayaran
        $metaTable = $section->addTable([
            'borderSize' => 0,
            'borderColor' => 'FFFFFF',
            'cellMargin' => 45,
            'width' => 100 * 50,
            'unit' => 'pct',
        ]);

        $metaRows = [
            ['Sudah Terima Dari', 'Bendahara ${sumber_dana} ${nama_sekolah}'],
            ['Uang Sebanyak', '${terbilang_title}'],
            ['Untuk Pembayaran', '${uraian}'],
            ['Kode Kegiatan', '${kode_kegiatan} - ${uraian_kegiatan}'],
            ['Kode Rekening', '${kode_rekening} - ${rincian_objek}'],
        ];

        foreach ($metaRows as [$label, $val]) {
            $metaTable->addRow();
            $metaTable->addCell(2600)->addText($label, ['bold' => true]);
            $metaTable->addCell(250)->addText(':');
            $metaTable->addCell(7200)->addText($val);
        }

        $section->addTextBreak(1);
        $section->addText('Rincian Belanja:', ['bold' => true, 'size' => 10], ['spaceAfter' => 60]);

        // Tabel Rincian Barang Dinamis (cloneRow)
        $itemTable = $section->addTable([
            'borderSize' => 6,
            'borderColor' => '334155',
            'cellMargin' => 60,
            'width' => 100 * 50,
            'unit' => 'pct',
        ]);

        $headerStyle = ['bold' => true, 'size' => 9.5];
        $headerCell = ['bgColor' => 'F1F5F9', 'valign' => 'center'];
        $itemTable->addRow();
        $itemTable->addCell(600, $headerCell)->addText('No', $headerStyle, ['alignment' => Jc::CENTER]);
        $itemTable->addCell(4200, $headerCell)->addText('Uraian Barang / Jasa', $headerStyle, ['alignment' => Jc::CENTER]);
        $itemTable->addCell(900, $headerCell)->addText('Vol', $headerStyle, ['alignment' => Jc::CENTER]);
        $itemTable->addCell(1100, $headerCell)->addText('Satuan', $headerStyle, ['alignment' => Jc::CENTER]);
        $itemTable->addCell(1600, $headerCell)->addText('Harga Satuan', $headerStyle, ['alignment' => Jc::CENTER]);
        $itemTable->addCell(1600, $headerCell)->addText('Subtotal', $headerStyle, ['alignment' => Jc::CENTER]);

        // 1 baris contoh cloneRow
        $itemTable->addRow();
        $itemTable->addCell(600)->addText('${item_no}', null, ['alignment' => Jc::CENTER]);
        $itemTable->addCell(4200)->addText('${item_nama}');
        $itemTable->addCell(900)->addText('${item_volume}', null, ['alignment' => Jc::CENTER]);
        $itemTable->addCell(1100)->addText('${item_satuan}', null, ['alignment' => Jc::CENTER]);
        $itemTable->addCell(1600)->addText('${item_harga_rupiah}', null, ['alignment' => Jc::END]);
        $itemTable->addCell(1600)->addText('${item_subtotal_rupiah}', null, ['alignment' => Jc::END]);

        // Baris Total
        $itemTable->addRow();
        $itemTable->addCell(8400, ['gridSpan' => 5, 'bgColor' => 'F8FAFC'])->addText('JUMLAH TOTAL', ['bold' => true], ['alignment' => Jc::END]);
        $itemTable->addCell(1600, ['bgColor' => 'F8FAFC'])->addText('${jumlah_rupiah}', ['bold' => true], ['alignment' => Jc::END]);

        $section->addTextBreak(1);
        $section->addText('Rincian Pajak:  PPn = ${ppn}  |  PPh = ${pph}  |  PB1 = ${pb1}  |  Jumlah Bersih = ${jumlah_bersih_rupiah}', ['size' => 9, 'italic' => true]);

        $section->addTextBreak(1);

        // Blok Tanda Tangan 3 Kolom
        $sigTable = $section->addTable([
            'borderSize' => 0,
            'borderColor' => 'FFFFFF',
            'cellMargin' => 50,
            'width' => 100 * 50,
            'unit' => 'pct',
        ]);

        $center = ['alignment' => Jc::CENTER, 'spaceAfter' => 20];
        $sigTable->addRow();

        $cellKepsek = $sigTable->addCell(3350);
        $cellKepsek->addText('Mengetahui / Setuju Bayar,', null, $center);
        $cellKepsek->addText('Kepala Sekolah', ['bold' => true], $center);
        $cellKepsek->addTextBreak(3);
        $cellKepsek->addText('${kepala_sekolah}', ['bold' => true, 'underline' => 'single'], $center);
        $cellKepsek->addText('NIP. ${nip_kepala_sekolah}', ['size' => 9], $center);

        $cellBendahara = $sigTable->addCell(3350);
        $cellBendahara->addText('${tanggal_lunas}', null, $center);
        $cellBendahara->addText('Bendahara ${sumber_dana}', ['bold' => true], $center);
        $cellBendahara->addTextBreak(3);
        $cellBendahara->addText('${bendahara}', ['bold' => true, 'underline' => 'single'], $center);
        $cellBendahara->addText('NIP. ${nip_bendahara}', ['size' => 9], $center);

        $cellPenerima = $sigTable->addCell(3350);
        $cellPenerima->addText('${kabupaten_kota}, ${tanggal_transaksi}', null, $center);
        $cellPenerima->addText('Yang Menerima', ['bold' => true], $center);
        $cellPenerima->addTextBreak(3);
        $cellPenerima->addText('${penerima}', ['bold' => true, 'underline' => 'single'], $center);
        $cellPenerima->addText(' ', ['size' => 9], $center);

        $tempDir = $this->ensureTempDir();
        $samplePath = $tempDir.DIRECTORY_SEPARATOR.'contoh_template_kwitansi_'.uniqid('', true).'.docx';
        $phpWord->save($samplePath, 'Word2007');

        return $samplePath;
    }

    /**
     * Petakan model Kwitansi + relasinya ke payload text, items, dan images.
     *
     * @return array{text: array<string, string>, items: array<int, array<string, string>>, images: array<string, ?string>}
     */
    public function buildKwitansiVariables(Model $kwitansi, string $variant): array
    {
        $sekolah = $kwitansi->sekolah ?? SekolahProfile::first();
        $penganggaran = $kwitansi->penganggaran;
        $bku = $kwitansi->bukuKasUmum;
        $kodeKegiatan = $kwitansi->kodeKegiatan;
        $rekening = $kwitansi->rekeningBelanja;

        $parsedKode = $this->parseKodeKegiatan($kodeKegiatan);
        $totalAmount = $this->calculateTotalFromUraianDetails($bku);
        $terbilang = $this->convertToText($totalAmount);
        $pajakData = $this->klasifikasiPajak($bku, $totalAmount);

        $ppn = (float) ($pajakData['ppn'] ?? 0);
        $pph = (float) ($pajakData['pph'] ?? 0);
        $pb1 = (float) ($pajakData['pb1'] ?? 0);
        $totalPajak = $ppn + $pph + $pb1;
        $jumlahBersih = max(0, $totalAmount - $totalPajak);

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
            $penerima = '.....................................';
        }

        $text = [
            // Identitas Sekolah
            'nama_sekolah' => (string) ($sekolah?->nama_sekolah ?? '-'),
            'npsn' => (string) ($sekolah?->npsn ?? '-'),
            'alamat_sekolah' => (string) ($sekolah?->alamat ?? '-'),
            'kelurahan_desa' => (string) ($sekolah?->kelurahan_desa ?? '-'),
            'kecamatan' => (string) ($sekolah?->kecamatan ?? '-'),
            'kabupaten_kota' => (string) ($sekolah?->kabupaten_kota ?? '-'),
            'provinsi' => (string) ($sekolah?->provinsi ?? '-'),
            'status_sekolah' => (string) ($sekolah?->status_sekolah ?? '-'),
            'jenjang_sekolah' => (string) ($sekolah?->jenjang_sekolah ?? '-'),

            // Anggaran & Kode
            'tahun_anggaran' => (string) ($penganggaran?->tahun_anggaran ?? '-'),
            'sumber_dana' => VariantConfig::title($variant),
            'tahap' => $tahap,
            'no_bukti' => (string) ($bku?->id_transaksi ?: 'KW-'.$kwitansi->getKey()),
            'kode_kegiatan' => (string) $parsedKode['kode_full'],
            'kode_program' => (string) $parsedKode['kode_program'],
            'program' => (string) $parsedKode['program'],
            'kode_sub_program' => (string) $parsedKode['kode_sub_program'],
            'sub_program' => (string) $parsedKode['sub_program'],
            'uraian_kegiatan' => (string) $parsedKode['uraian'],
            'kode_rekening' => (string) ($rekening?->kode_rekening ?? '-'),
            'rincian_objek' => (string) ($rekening?->rincian_objek ?? '-'),

            // Transaksi & Nominal
            'uraian' => $uraianUtama,
            'uraian_bku' => (string) ($bku?->uraian ?? '-'),
            'jumlah_angka' => $this->formatNumber($totalAmount),
            'jumlah_rupiah' => $this->formatRupiah($totalAmount),
            'terbilang' => $terbilang,
            'terbilang_title' => ucwords(strtolower($terbilang)),
            'tanggal_transaksi' => $tanggalTransaksi,
            'tanggal_lunas' => $tanggalLunas,
            'bulan_transaksi' => $bulanIndo,

            // Pajak
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

            // Penanggung Jawab & Penerima
            'kepala_sekolah' => (string) ($penganggaran?->kepala_sekolah ?? '-'),
            'nip_kepala_sekolah' => (string) ($penganggaran?->nip_kepala_sekolah ?? '-'),
            'bendahara' => (string) ($penganggaran?->bendahara ?? '-'),
            'nip_bendahara' => (string) ($penganggaran?->nip_bendahara ?? '-'),
            'komite' => (string) ($penganggaran?->komite ?? '-'),
            'penerima' => $penerima,
        ];

        // Rincian Barang
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
                'item_satuan' => '-',
                'item_harga' => $this->formatNumber($totalAmount),
                'item_harga_rupiah' => $this->formatRupiah($totalAmount),
                'item_subtotal' => $this->formatNumber($totalAmount),
                'item_subtotal_rupiah' => $this->formatRupiah($totalAmount),
            ];
        }

        // Gambar dari Profil Sekolah
        $images = [
            'kop_surat' => $this->resolvePublicImagePath($sekolah?->kop_surat),
            'logo_sekolah' => $this->resolvePublicImagePath($sekolah?->logo_sekolah),
            'logo_daerah' => $this->resolvePublicImagePath($sekolah?->logo_daerah),
        ];

        return [
            'text' => $text,
            'items' => $items,
            'images' => $images,
        ];
    }

    /**
     * @param  array<int, string>  $rawTemplateVars
     * @param  array<int, array<string, string>>  $items
     */
    protected function applyItemTableRows(TemplateProcessor $processor, array $rawTemplateVars, array $items): void
    {
        if ($items === []) {
            return;
        }

        $itemVarLookup = array_fill_keys(self::ITEM_TABLE_VARIABLES, true);
        $rawByKey = [];
        $anchorCandidates = [];

        foreach ($rawTemplateVars as $rawVar) {
            $trimmed = trim($rawVar);
            if (isset($itemVarLookup[$trimmed])) {
                $rawByKey[$trimmed][] = $rawVar;
                $anchorCandidates[] = $rawVar;
            }
        }

        if ($anchorCandidates === []) {
            return;
        }

        $rowCount = count($items);
        $cloned = false;
        foreach (array_unique($anchorCandidates) as $anchorRawVar) {
            try {
                $processor->cloneRow($anchorRawVar, $rowCount);
                $cloned = true;
                break;
            } catch (\Throwable) {
                // Coba kandidat item_* berikutnya jika variabel ini berada di luar tabel Word
            }
        }

        if (! $cloned) {
            // Fallback aman jika seluruh placeholder item_* ditaruh di luar tabel Word
            $firstRow = $items[0];
            foreach ($firstRow as $key => $val) {
                $replacement = $this->formatReplacementValue($val);
                $processor->setValue($key, $replacement);
                foreach ($rawByKey[$key] ?? [] as $rawVar) {
                    if ($rawVar !== $key) {
                        $processor->setValue($rawVar, $replacement);
                    }
                }
            }

            return;
        }

        foreach ($items as $idx => $row) {
            $rowNumber = $idx + 1;
            foreach ($row as $key => $val) {
                $replacement = $this->formatReplacementValue($val);
                $processor->setValue("{$key}#{$rowNumber}", $replacement);
                foreach ($rawByKey[$key] ?? [] as $rawVar) {
                    if ($rawVar !== $key) {
                        $processor->setValue("{$rawVar}#{$rowNumber}", $replacement);
                    }
                }
            }
        }
    }

    /**
     * @param  array<int, string>  $rawTemplateVars
     * @param  array<string, ?string>  $images
     */
    protected function applyImagePlaceholders(
        TemplateProcessor $processor,
        array $rawTemplateVars,
        array $images,
        ?string $sourceDocxPath = null
    ): void {
        foreach (self::IMAGE_VARIABLES as $key => $config) {
            $matchingRawVars = [];
            foreach ($rawTemplateVars as $rawVar) {
                if ($this->resolveImageVariableBaseKey($rawVar) === $key) {
                    $matchingRawVars[] = $rawVar;
                }
            }

            if ($matchingRawVars === []) {
                continue;
            }

            // Urutkan dari terpanjang agar tag berargumen (mis. kop_surat:15cm:3cm) diproses sebelum kop_surat
            $matchingRawVars = array_values(array_unique($matchingRawVars));
            usort($matchingRawVars, static fn (string $a, string $b): int => strlen($b) <=> strlen($a));

            $imagePath = $images[$key] ?? null;
            if ($imagePath !== null && is_file($imagePath)) {
                $needsAutoFitWidth = $config['fit_margin']
                    && $sourceDocxPath !== null
                    && $this->hasTagRequiringDefaultWidth($matchingRawVars);

                $defaultWidth = $config['width'];
                if ($needsAutoFitWidth) {
                    $resolvedPt = $this->resolveTemplateContentWidthPt($sourceDocxPath, $key);
                    if ($resolvedPt !== null) {
                        $defaultWidth = number_format($resolvedPt, 2, '.', '').'pt';
                    }
                }

                foreach ($matchingRawVars as $rawVar) {
                    $dims = $this->parseInlineImageOptions($rawVar, $defaultWidth, $config['height'], $config['ratio']);
                    try {
                        $processor->setImageValue($rawVar, [
                            'path' => $imagePath,
                            'width' => $dims['width'],
                            'height' => $dims['height'],
                            'ratio' => $dims['ratio'] ? 'true' : 'false',
                        ]);
                    } catch (\Throwable) {
                        $processor->setValue($rawVar, '');
                    }
                }

                continue;
            }

            foreach ($matchingRawVars as $rawVar) {
                $processor->setValue($rawVar, '');
            }
        }
    }

    /**
     * @param  array<int, string>  $matchingRawVars
     */
    protected function hasTagRequiringDefaultWidth(array $matchingRawVars): bool
    {
        foreach ($matchingRawVars as $rawVar) {
            $parsed = $this->parseRawInlineImageArgs($rawVar);
            if ($parsed['width'] === null && $parsed['height'] === null) {
                return true;
            }
        }

        return false;
    }

    /**
     * Ambil base key variabel gambar (mis. "kop_surat:15cm" -> "kop_surat"), atau null jika bukan variabel gambar
     * atau argumen inline-nya tidak valid (sehingga typo seperti ${kop_surat:15meter} tetap dilaporkan unrecognized).
     */
    protected function resolveImageVariableBaseKey(string $rawVar): ?string
    {
        $trimmed = trim($rawVar);
        if ($trimmed === '' || str_contains($trimmed, '/')) {
            return null;
        }

        $segments = explode(':', $trimmed, 2);
        $base = trim($segments[0]);
        if (! array_key_exists($base, self::IMAGE_VARIABLES)) {
            return null;
        }

        if (! isset($segments[1])) {
            return $base;
        }

        $parsed = $this->parseRawInlineImageArgs($trimmed);

        return $parsed['valid'] ? $base : null;
    }

    /**
     * Parsing argumen ukuran inline opsional pada tag gambar (mis. ${kop_surat:15cm}, ${kop_surat:15cm:3cm:f},
     * ${kop_surat:15cmx3cm:f}, ${kop_surat:width=15cm}, ${kop_surat:height=3cm}) dengan satuan fisik aman.
     *
     * @return array{width: string, height: string, ratio: bool}
     */
    protected function parseInlineImageOptions(
        string $rawVar,
        string $defaultWidth,
        string $defaultHeight,
        bool $defaultRatio
    ): array {
        $parsed = $this->parseRawInlineImageArgs($rawVar);
        $inlineWidth = $parsed['width'];
        $inlineHeight = $parsed['height'];
        $inlineRatio = $parsed['ratio'];

        if ($inlineWidth === null && $inlineHeight === null) {
            return [
                'width' => $defaultWidth,
                'height' => $defaultHeight,
                'ratio' => true,
            ];
        }

        // Bila hanya satu sisi (width atau height) diisi, wajib ratio=true agar PHPWord menghitung sisi lainnya
        // dan tidak memproduksi VML rusak seperti style="width:15cm;height:"
        $singleDimensionOnly = ($inlineWidth === null) !== ($inlineHeight === null);

        return [
            'width' => $inlineWidth ?? '',
            'height' => $inlineHeight ?? '',
            'ratio' => $singleDimensionOnly ? true : ($inlineRatio ?? $defaultRatio),
        ];
    }

    /**
     * @return array{width: ?string, height: ?string, ratio: ?bool, valid: bool}
     */
    protected function parseRawInlineImageArgs(string $rawVar): array
    {
        $trimmed = trim($rawVar);
        $parts = explode(':', $trimmed);
        array_shift($parts);

        if ($parts === []) {
            return ['width' => null, 'height' => null, 'ratio' => null, 'valid' => true];
        }

        $dimPairPattern = '/^([0-9]+(?:\.[0-9]+)?(?:cm|mm|in|pt|pc|px|%|em|ex)?|auto)x([0-9]+(?:\.[0-9]+)?(?:cm|mm|in|pt|pc|px|%|em|ex)?|auto)$/i';
        $inlineWidth = null;
        $inlineHeight = null;
        $inlineRatio = null;
        $recognizedCount = 0;
        $sizePairSeen = false;

        foreach ($parts as $idx => $part) {
            $arg = trim($part);
            if ($arg === '') {
                continue;
            }

            if (str_contains($arg, '=')) {
                [$name, $val] = explode('=', $arg, 2);
                $name = strtolower(trim($name));
                $val = trim($val);
                if ($name === 'size' && preg_match($dimPairPattern, $val, $m)) {
                    $w = $this->normalizeImageDimension($m[1]);
                    $h = $this->normalizeImageDimension($m[2]);
                    if (($w === null && strtolower($m[1]) !== 'auto') || ($h === null && strtolower($m[2]) !== 'auto')) {
                        return ['width' => null, 'height' => null, 'ratio' => null, 'valid' => false];
                    }
                    $inlineWidth = $w;
                    $inlineHeight = $h;
                    $sizePairSeen = true;
                    $recognizedCount++;
                } elseif ($name === 'width') {
                    $w = $this->normalizeImageDimension($val);
                    if ($w === null && strtolower($val) !== 'auto') {
                        return ['width' => null, 'height' => null, 'ratio' => null, 'valid' => false];
                    }
                    $inlineWidth = $w;
                    $recognizedCount++;
                } elseif ($name === 'height') {
                    $h = $this->normalizeImageDimension($val);
                    if ($h === null && strtolower($val) !== 'auto') {
                        return ['width' => null, 'height' => null, 'ratio' => null, 'valid' => false];
                    }
                    $inlineHeight = $h;
                    $recognizedCount++;
                } elseif ($name === 'ratio') {
                    $ratioVal = $this->parseRatioFlag($val);
                    if ($ratioVal === null) {
                        return ['width' => null, 'height' => null, 'ratio' => null, 'valid' => false];
                    }
                    $inlineRatio = $ratioVal;
                    $recognizedCount++;
                } else {
                    return ['width' => null, 'height' => null, 'ratio' => null, 'valid' => false];
                }
            } elseif (preg_match($dimPairPattern, $arg, $m)) {
                $w = $this->normalizeImageDimension($m[1]);
                $h = $this->normalizeImageDimension($m[2]);
                if (($w === null && strtolower($m[1]) !== 'auto') || ($h === null && strtolower($m[2]) !== 'auto')) {
                    return ['width' => null, 'height' => null, 'ratio' => null, 'valid' => false];
                }
                $inlineWidth = $w;
                $inlineHeight = $h;
                $sizePairSeen = true;
                $recognizedCount++;
            } elseif ($sizePairSeen) {
                $ratioVal = $this->parseRatioFlag($arg);
                if ($ratioVal === null) {
                    return ['width' => null, 'height' => null, 'ratio' => null, 'valid' => false];
                }
                $inlineRatio = $ratioVal;
                $recognizedCount++;
            } elseif ($idx === 0) {
                $w = $this->normalizeImageDimension($arg);
                if ($w === null && strtolower($arg) !== 'auto') {
                    return ['width' => null, 'height' => null, 'ratio' => null, 'valid' => false];
                }
                $inlineWidth = $w;
                $recognizedCount++;
            } elseif ($idx === 1) {
                $h = $this->normalizeImageDimension($arg);
                if ($h === null && strtolower($arg) !== 'auto') {
                    return ['width' => null, 'height' => null, 'ratio' => null, 'valid' => false];
                }
                $inlineHeight = $h;
                $recognizedCount++;
            } elseif ($idx === 2) {
                $ratioVal = $this->parseRatioFlag($arg);
                if ($ratioVal === null) {
                    return ['width' => null, 'height' => null, 'ratio' => null, 'valid' => false];
                }
                $inlineRatio = $ratioVal;
                $recognizedCount++;
            } else {
                return ['width' => null, 'height' => null, 'ratio' => null, 'valid' => false];
            }
        }

        return [
            'width' => $inlineWidth,
            'height' => $inlineHeight,
            'ratio' => $inlineRatio,
            'valid' => $recognizedCount > 0,
        ];
    }

    protected function parseRatioFlag(string $raw): ?bool
    {
        $lower = strtolower(trim($raw));
        if (in_array($lower, ['-', '0', 'f', 'false', 'no'], true)) {
            return false;
        }
        if (in_array($lower, ['1', 't', 'true', 'yes'], true)) {
            return true;
        }

        return null;
    }

    protected function normalizeImageDimension(string $raw): ?string
    {
        $val = trim($raw);
        if ($val === '' || strtolower($val) === 'auto') {
            return null;
        }
        if (! preg_match('/^([0-9]+(?:\.[0-9]+)?)(cm|mm|in|pt|pc|px|%|em|ex)?$/i', $val, $m)) {
            return null;
        }
        $num = (float) $m[1];
        if ($num <= 0) {
            return null;
        }
        $unit = isset($m[2]) && $m[2] !== '' ? strtolower($m[2]) : 'pt';

        return $m[1].$unit;
    }

    /**
     * Hitung lebar area cetak (dalam satuan fisik pt) langsung dari <w:pgSz> & <w:pgMar> template .docx,
     * serta otomatis menyempit mengikuti lebar sel tabel / indentasi paragraf bila placeholder berada di dalamnya.
     */
    protected function resolveTemplateContentWidthPt(string $docxPath, string $placeholderKey): ?float
    {
        if (! is_file($docxPath)) {
            return null;
        }

        $zip = new \ZipArchive;
        if ($zip->open($docxPath) !== true) {
            return null;
        }

        try {
            $mainPart = $this->resolveMainDocumentPartName($zip);
            if ($mainPart === null) {
                return null;
            }
            $mainXml = $zip->getFromName($mainPart);
            if (! is_string($mainXml) || $mainXml === '') {
                return null;
            }

            $mainDom = $this->loadXml($mainXml);
            $pageUsableTwips = $this->resolvePageUsableTwips($mainDom);
            if ($pageUsableTwips === null) {
                return null;
            }

            // Periksa apakah placeholder polos (${kop_surat}) ditaruh di dalam sel tabel atau paragraf ber-indentasi (body maupun header)
            $containerTwips = $this->resolveContainerUsableTwips($mainDom, $placeholderKey, $pageUsableTwips);
            if ($containerTwips === null) {
                for ($i = 0; $i < $zip->numFiles; $i++) {
                    $name = (string) $zip->getNameIndex($i);
                    if (preg_match('#^word/header\d+\.xml$#i', str_replace('\\', '/', $name))) {
                        $headerXml = $zip->getFromName($name);
                        if (is_string($headerXml) && $headerXml !== '') {
                            $headerDom = $this->loadXml($headerXml);
                            $containerTwips = $this->resolveContainerUsableTwips($headerDom, $placeholderKey, $pageUsableTwips);
                            if ($containerTwips !== null) {
                                break;
                            }
                        }
                    }
                }
            }

            $targetTwips = ($containerTwips !== null && $containerTwips >= 800)
                ? min($pageUsableTwips, $containerTwips)
                : $pageUsableTwips;

            return round($targetTwips / 20.0, 2);
        } finally {
            $zip->close();
        }
    }

    /**
     * Hitung lebar area cetak halaman (pgSz/@w - pgMar/@left - pgMar/@right - pgMar/@gutter) dalam twips.
     */
    protected function resolvePageUsableTwips(\DOMDocument $dom): ?int
    {
        $xpath = new \DOMXPath($dom);
        $xpath->registerNamespace('w', self::W_NS);

        // Seksi pertama (bagian atas dokumen) diprioritaskan; fallback ke sectPr penutup w:body
        $sectNodes = [];
        $firstInternal = $xpath->query('(//w:pPr/w:sectPr)[1]')->item(0);
        if ($firstInternal instanceof \DOMElement) {
            $sectNodes[] = $firstInternal;
        }
        $bodySect = $xpath->query('/w:document/w:body/w:sectPr')->item(0);
        if ($bodySect instanceof \DOMElement) {
            $sectNodes[] = $bodySect;
        }

        if ($sectNodes === []) {
            return null;
        }

        $pageW = null;
        $pgMarNode = null;

        foreach ($sectNodes as $sectPr) {
            if ($pageW === null) {
                $pgSz = $xpath->query('./w:pgSz', $sectPr)->item(0);
                if ($pgSz instanceof \DOMElement) {
                    $rawW = $pgSz->getAttributeNS(self::W_NS, 'w');
                    if ($rawW !== '' && is_numeric($rawW) && (int) $rawW > 0) {
                        $pageW = (int) $rawW;
                    }
                }
            }

            if ($pgMarNode === null) {
                $candidateMar = $xpath->query('./w:pgMar', $sectPr)->item(0);
                if ($candidateMar instanceof \DOMElement) {
                    $pgMarNode = $candidateMar;
                }
            }
        }

        $pageW ??= 11906; // A4 default (210mm)
        $marginLeft = 1440; // 1 inch default
        $marginRight = 1440;
        $gutter = 0;

        // Baca seluruh atribut margin dari satu elemen <w:pgMar> agar tidak mencampur margin lintas seksi
        if ($pgMarNode instanceof \DOMElement) {
            $rawL = $pgMarNode->getAttributeNS(self::W_NS, 'left');
            if ($rawL !== '' && is_numeric($rawL)) {
                $marginLeft = max(0, (int) $rawL);
            }
            $rawR = $pgMarNode->getAttributeNS(self::W_NS, 'right');
            if ($rawR !== '' && is_numeric($rawR)) {
                $marginRight = max(0, (int) $rawR);
            }
            $rawG = $pgMarNode->getAttributeNS(self::W_NS, 'gutter');
            if ($rawG !== '' && is_numeric($rawG)) {
                $gutter = max(0, (int) $rawG);
            }
        }

        $usable = $pageW - $marginLeft - $marginRight - $gutter;

        return $usable >= 2000 ? $usable : null;
    }

    /**
     * Hitung lebar bersih wadah (sel tabel / indentasi paragraf) yang memuat placeholder gambar polos (${key}), dalam twips.
     */
    protected function resolveContainerUsableTwips(\DOMDocument $dom, string $placeholderKey, int $pageUsableTwips): ?int
    {
        $xpath = new \DOMXPath($dom);
        $xpath->registerNamespace('w', self::W_NS);
        // Hanya cocokkan tag polos (${kop_surat}) agar tag berargumen manual (${kop_surat:5cm}) di sel sempit
        // tidak mengecilkan ukuran tag ${kop_surat} polos di bagian lain dokumen
        $pattern = '/\$\{\s*'.preg_quote($placeholderKey, '/').'\s*\}/u';

        $paragraphs = $xpath->query('//w:p');
        if ($paragraphs === false) {
            return null;
        }

        foreach ($paragraphs as $paragraph) {
            if (! $paragraph instanceof \DOMElement) {
                continue;
            }

            $text = '';
            $textNodes = $xpath->query('.//w:t', $paragraph);
            if ($textNodes !== false) {
                foreach ($textNodes as $t) {
                    $text .= $t->textContent;
                }
            }

            if ($text === '' || ! preg_match($pattern, $text)) {
                continue;
            }

            $containerTwips = $pageUsableTwips;

            // Jika paragraf berada di dalam sel tabel (<w:tc>), gunakan lebar sel dikurangi padding horizontal sel
            $cell = $xpath->query('ancestor::w:tc[1]', $paragraph)->item(0);
            if ($cell instanceof \DOMElement) {
                $tcW = $xpath->query('./w:tcPr/w:tcW', $cell)->item(0);
                if ($tcW instanceof \DOMElement) {
                    $rawW = $tcW->getAttributeNS(self::W_NS, 'w');
                    $type = strtolower($tcW->getAttributeNS(self::W_NS, 'type') ?: 'dxa');
                    $cellTwips = 0;
                    if ($rawW !== '' && is_numeric($rawW) && (int) $rawW > 0) {
                        if ($type === 'dxa') {
                            $cellTwips = (int) $rawW;
                        } elseif ($type === 'pct') {
                            $tableBaseTwips = $this->resolveEnclosingTableWidthTwips($xpath, $cell, $pageUsableTwips);
                            $cellTwips = (int) round(($tableBaseTwips * (int) $rawW) / 5000);
                        }
                    }

                    if ($cellTwips > 0) {
                        $padLeft = $this->readHorizontalCellMarginTwips($xpath, $cell, 'left', 108);
                        $padRight = $this->readHorizontalCellMarginTwips($xpath, $cell, 'right', 108);
                        $containerTwips = max(0, $cellTwips - $padLeft - $padRight);
                    }
                }
            }

            // Kurangi indentasi kiri/kanan positif dari paragraf bila ada (bedakan '' vs '0')
            $ind = $xpath->query('./w:pPr/w:ind', $paragraph)->item(0);
            if ($ind instanceof \DOMElement) {
                $indLeftAttr = $ind->getAttributeNS(self::W_NS, 'left');
                $indLeftRaw = $indLeftAttr !== '' ? $indLeftAttr : $ind->getAttributeNS(self::W_NS, 'start');
                $indRightAttr = $ind->getAttributeNS(self::W_NS, 'right');
                $indRightRaw = $indRightAttr !== '' ? $indRightAttr : $ind->getAttributeNS(self::W_NS, 'end');
                $indLeft = ($indLeftRaw !== '' && is_numeric($indLeftRaw)) ? max(0, (int) $indLeftRaw) : 0;
                $indRight = ($indRightRaw !== '' && is_numeric($indRightRaw)) ? max(0, (int) $indRightRaw) : 0;
                $containerTwips = max(0, $containerTwips - $indLeft - $indRight);
            }

            return $containerTwips;
        }

        return null;
    }

    protected function resolveEnclosingTableWidthTwips(\DOMXPath $xpath, \DOMElement $cell, int $pageUsableTwips): int
    {
        $tblW = $xpath->query('ancestor::w:tbl[1]/w:tblPr/w:tblW', $cell)->item(0);
        if (! $tblW instanceof \DOMElement) {
            return $pageUsableTwips;
        }

        $rawW = $tblW->getAttributeNS(self::W_NS, 'w');
        $type = strtolower($tblW->getAttributeNS(self::W_NS, 'type') ?: 'dxa');
        if ($rawW === '' || ! is_numeric($rawW) || (int) $rawW <= 0) {
            return $pageUsableTwips;
        }

        if ($type === 'dxa') {
            return min($pageUsableTwips, (int) $rawW);
        }
        if ($type === 'pct') {
            return min($pageUsableTwips, (int) round(($pageUsableTwips * (int) $rawW) / 5000));
        }

        return $pageUsableTwips;
    }

    protected function readHorizontalCellMarginTwips(\DOMXPath $xpath, \DOMElement $cell, string $side, int $defaultTwips): int
    {
        $altSide = $side === 'left' ? 'start' : 'end';
        $queries = [
            "./w:tcPr/w:tcMar/w:{$side}",
            "./w:tcPr/w:tcMar/w:{$altSide}",
            "ancestor::w:tbl[1]/w:tblPr/w:tblCellMar/w:{$side}",
            "ancestor::w:tbl[1]/w:tblPr/w:tblCellMar/w:{$altSide}",
        ];

        foreach ($queries as $q) {
            $node = $xpath->query($q, $cell)->item(0);
            if ($node instanceof \DOMElement) {
                $type = strtolower($node->getAttributeNS(self::W_NS, 'type') ?: 'dxa');
                if ($type === 'nil') {
                    return 0;
                }
                $raw = $node->getAttributeNS(self::W_NS, 'w');
                if ($type === 'dxa' && $raw !== '' && is_numeric($raw)) {
                    return max(0, (int) $raw);
                }
            }
        }

        return $defaultTwips;
    }

    protected function resolvePublicImagePath(?string $storedPath): ?string
    {
        if (! is_string($storedPath) || trim($storedPath) === '') {
            return null;
        }

        $normalized = str_replace('\\', '/', trim($storedPath));
        $clean = ltrim((string) preg_replace('#^public/#i', '', $normalized), '/');
        if ($clean === '' || str_contains($clean, '..')) {
            return null;
        }

        $baseCandidates = [
            storage_path('app/public'),
            public_path('storage'),
        ];

        foreach ($baseCandidates as $baseDir) {
            $realBase = realpath($baseDir);
            if ($realBase === false) {
                continue;
            }

            $candidate = $realBase.DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $clean);
            $realCandidate = realpath($candidate);
            if ($realCandidate === false || ! is_file($realCandidate) || ! is_readable($realCandidate)) {
                continue;
            }

            // Pastikan target symlink tidak keluar dari direktori public storage yang diizinkan
            $normalizedBase = rtrim(str_replace('\\', '/', $realBase), '/').'/';
            $normalizedCandidate = str_replace('\\', '/', $realCandidate);
            if (! str_starts_with($normalizedCandidate, $normalizedBase)) {
                continue;
            }

            $ext = strtolower(pathinfo($realCandidate, PATHINFO_EXTENSION));
            if (in_array($ext, ['png', 'jpg', 'jpeg', 'gif', 'bmp'], true)) {
                return $realCandidate;
            }
        }

        return null;
    }

    /**
     * Normalisasi line ending menjadi \n; PHPWord TemplateProcessor::setValue()
     * mengubah \n menjadi </w:t><w:br/><w:t> secara bawaan melalui replaceCarriageReturns().
     */
    protected function formatReplacementValue(string $value): string
    {
        return str_replace(["\r\n", "\r"], "\n", $value);
    }

    protected function extractProcessorTempFilename(TemplateProcessor $processor): ?string
    {
        try {
            $ref = new \ReflectionProperty($processor, 'tempDocumentFilename');
            $val = $ref->getValue($processor);

            return is_string($val) && $val !== '' ? $val : null;
        } catch (\Throwable) {
            return null;
        }
    }

    protected function resolveMainDocumentPartName(\ZipArchive $zip): ?string
    {
        if ($zip->locateName('word/document.xml') !== false) {
            return 'word/document.xml';
        }

        for ($i = 0; $i < $zip->numFiles; $i++) {
            $name = $zip->getNameIndex($i);
            if (is_string($name) && preg_match('#^word/document\d*\.xml$#i', str_replace('\\', '/', $name))) {
                return $name;
            }
        }

        return null;
    }

    protected function resolveRelsPartName(string $mainPartName): string
    {
        $fileName = basename(str_replace('\\', '/', $mainPartName));

        return "word/_rels/{$fileName}.rels";
    }

    /**
     * Indeks seluruh media gambar yang sudah ada di dokumen basis berdasarkan sha1
     * agar gambar identik (mis. kop_surat / logo_sekolah) tidak diduplikasi N kali saat bulk merge.
     *
     * @return array<string, string> Map sha1(bytes) => rId di basis
     */
    protected function indexBaseMediaHashes(\ZipArchive $baseZip, ?\DOMDocument $baseRelsDom): array
    {
        $map = [];
        if ($baseRelsDom === null) {
            return $map;
        }

        foreach ($baseRelsDom->getElementsByTagName('Relationship') as $rel) {
            if (! $rel instanceof \DOMElement) {
                continue;
            }

            $type = $rel->getAttribute('Type');
            $target = $rel->getAttribute('Target');
            $id = $rel->getAttribute('Id');
            if ($id === '' || $target === '' || ! str_contains($type, '/image')) {
                continue;
            }

            $normalizedTarget = ltrim(str_replace('\\', '/', $target), '/');
            $zipMediaPath = str_starts_with($normalizedTarget, 'word/')
                ? $normalizedTarget
                : 'word/'.$normalizedTarget;

            $bytes = $baseZip->getFromName($zipMediaPath);
            if (is_string($bytes) && $bytes !== '') {
                $map[sha1($bytes)] = $id;
            }
        }

        return $map;
    }

    protected function ensureTempDir(): string
    {
        $tempDir = storage_path('app/temp');
        if (! File::isDirectory($tempDir)) {
            File::makeDirectory($tempDir, 0755, true);
        }

        return $tempDir;
    }

    protected function loadXml(string $xmlContent): \DOMDocument
    {
        $dom = new \DOMDocument;
        $prevErrors = libxml_use_internal_errors(true);
        try {
            $dom->loadXML($xmlContent, LIBXML_NONET | LIBXML_NOERROR | LIBXML_NOWARNING);
        } finally {
            libxml_clear_errors();
            libxml_use_internal_errors($prevErrors);
        }

        return $dom;
    }

    protected function createPageBreakNode(\DOMDocument $dom): \DOMElement
    {
        $p = $dom->createElementNS(self::W_NS, 'w:p');
        $r = $dom->createElementNS(self::W_NS, 'w:r');
        $br = $dom->createElementNS(self::W_NS, 'w:br');
        $br->setAttributeNS(self::W_NS, 'w:type', 'page');
        $r->appendChild($br);
        $p->appendChild($r);

        return $p;
    }

    /**
     * Bungkus elemen <w:sectPr> menjadi paragraf section-break berjarak minimal (0pt)
     * agar konfigurasi kolom/margin/ukuran halaman seksi penutup tetap terjaga
     * tanpa mendorong baris terakhir ke halaman ekstra.
     */
    protected function createSectionBreakParagraph(\DOMDocument $dom, \DOMElement $sectPr): \DOMElement
    {
        $p = $dom->createElementNS(self::W_NS, 'w:p');
        $pPr = $dom->createElementNS(self::W_NS, 'w:pPr');

        $spacing = $dom->createElementNS(self::W_NS, 'w:spacing');
        $spacing->setAttributeNS(self::W_NS, 'w:before', '0');
        $spacing->setAttributeNS(self::W_NS, 'w:after', '0');
        $spacing->setAttributeNS(self::W_NS, 'w:line', '20');
        $spacing->setAttributeNS(self::W_NS, 'w:lineRule', 'exact');
        $pPr->appendChild($spacing);

        $rPr = $dom->createElementNS(self::W_NS, 'w:rPr');
        $sz = $dom->createElementNS(self::W_NS, 'w:sz');
        $sz->setAttributeNS(self::W_NS, 'w:val', '2');
        $szCs = $dom->createElementNS(self::W_NS, 'w:szCs');
        $szCs->setAttributeNS(self::W_NS, 'w:val', '2');
        $rPr->appendChild($sz);
        $rPr->appendChild($szCs);
        $pPr->appendChild($rPr);

        $sectClone = $sectPr->ownerDocument === $dom
            ? $sectPr->cloneNode(true)
            : $dom->importNode($sectPr, true);
        $pPr->appendChild($sectClone);
        $p->appendChild($pPr);

        return $p;
    }

    /**
     * Paksa <w:type w:val="nextPage"/> pada sebuah <w:sectPr> sesuai urutan skema ECMA-376 CT_SectPr
     * (setelah headerReference/footerReference/footnotePr/endnotePr, sebelum pgSz/cols/dll.).
     */
    protected function setSectionTypeNextPage(\DOMDocument $dom, \DOMElement $sectPr): void
    {
        $precedingElements = [
            'headerReference' => true,
            'footerReference' => true,
            'footnotePr' => true,
            'endnotePr' => true,
        ];

        $insertBeforeNode = null;
        foreach ($sectPr->childNodes as $child) {
            if (! $child instanceof \DOMElement) {
                continue;
            }
            if ($child->localName === 'type') {
                $child->setAttributeNS(self::W_NS, 'w:val', 'nextPage');

                return;
            }
            if ($insertBeforeNode === null && ! isset($precedingElements[$child->localName])) {
                $insertBeforeNode = $child;
            }
        }

        $typeNode = $dom->createElementNS(self::W_NS, 'w:type');
        $typeNode->setAttributeNS(self::W_NS, 'w:val', 'nextPage');

        if ($insertBeforeNode instanceof \DOMElement) {
            $sectPr->insertBefore($typeNode, $insertBeforeNode);
        } else {
            $sectPr->appendChild($typeNode);
        }
    }

    protected function findMaxRelNumber(?\DOMDocument $relsDom): int
    {
        if ($relsDom === null) {
            return 0;
        }

        $max = 0;
        foreach ($relsDom->getElementsByTagName('Relationship') as $rel) {
            if ($rel instanceof \DOMElement && preg_match('/^rId(\d+)$/i', $rel->getAttribute('Id'), $m)) {
                $max = max($max, (int) $m[1]);
            }
        }

        return $max;
    }

    /**
     * @param  array<string, string>  $mediaHashToRelId
     * @return array{map: array<string, string>, nextRelNum: int, mediaHashToRelId: array<string, string>, relsChanged: bool, contentTypesChanged: bool}
     */
    protected function mergeMediaRelationships(
        \ZipArchive $baseZip,
        \DOMDocument $baseRelsDom,
        ?\DOMDocument $baseContentTypesDom,
        \ZipArchive $appendZip,
        \DOMDocument $appendRelsDom,
        array $mediaHashToRelId,
        int $docIndex,
        int $nextRelNum
    ): array {
        $map = [];
        $relsChanged = false;
        $contentTypesChanged = false;
        $baseRelsRoot = $baseRelsDom->documentElement;
        if (! $baseRelsRoot instanceof \DOMElement) {
            return compact('map', 'nextRelNum', 'mediaHashToRelId', 'relsChanged', 'contentTypesChanged');
        }

        foreach ($appendRelsDom->getElementsByTagName('Relationship') as $rel) {
            if (! $rel instanceof \DOMElement) {
                continue;
            }

            $type = $rel->getAttribute('Type');
            $target = $rel->getAttribute('Target');
            $oldId = $rel->getAttribute('Id');
            $targetMode = $rel->getAttribute('TargetMode');

            if ($oldId === '' || $target === '' || strtolower($targetMode) === 'external') {
                continue;
            }

            if (! str_contains($type, '/image')) {
                continue;
            }

            $normalizedTarget = ltrim(str_replace('\\', '/', $target), '/');
            $zipMediaPath = str_starts_with($normalizedTarget, 'word/')
                ? $normalizedTarget
                : 'word/'.$normalizedTarget;

            $mediaBytes = $appendZip->getFromName($zipMediaPath);
            if (! is_string($mediaBytes)) {
                continue;
            }

            // Jika gambar identik sudah ada di arsip basis, gunakan ulang rId yang sama
            $hash = sha1($mediaBytes);
            if (isset($mediaHashToRelId[$hash])) {
                $map[$oldId] = $mediaHashToRelId[$hash];

                continue;
            }

            $ext = strtolower(pathinfo($zipMediaPath, PATHINFO_EXTENSION)) ?: 'png';
            $newFileName = "kw_merge_{$docIndex}_{$nextRelNum}.{$ext}";
            $newTarget = "media/{$newFileName}";
            $baseZip->addFromString("word/{$newTarget}", $mediaBytes);

            $newRelId = 'rId'.$nextRelNum;
            $nextRelNum++;

            $newRelNode = $baseRelsDom->createElementNS(self::REL_NS, 'Relationship');
            $newRelNode->setAttribute('Id', $newRelId);
            $newRelNode->setAttribute('Type', $type);
            $newRelNode->setAttribute('Target', $newTarget);
            $baseRelsRoot->appendChild($newRelNode);

            $mediaHashToRelId[$hash] = $newRelId;
            $map[$oldId] = $newRelId;
            $relsChanged = true;

            if ($baseContentTypesDom !== null && $this->ensureContentTypeExtension($baseContentTypesDom, $ext)) {
                $contentTypesChanged = true;
            }
        }

        return compact('map', 'nextRelNum', 'mediaHashToRelId', 'relsChanged', 'contentTypesChanged');
    }

    protected function ensureContentTypeExtension(\DOMDocument $contentTypesDom, string $extension): bool
    {
        $ext = strtolower(trim($extension));
        $mimeMap = [
            'png' => 'image/png',
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'gif' => 'image/gif',
            'bmp' => 'image/bmp',
            'webp' => 'image/webp',
            'emf' => 'image/x-emf',
            'wmf' => 'image/x-wmf',
            'tif' => 'image/tiff',
            'tiff' => 'image/tiff',
            'svg' => 'image/svg+xml',
        ];
        if (! isset($mimeMap[$ext])) {
            return false;
        }

        foreach ($contentTypesDom->getElementsByTagName('Default') as $defaultNode) {
            if ($defaultNode instanceof \DOMElement && strtolower($defaultNode->getAttribute('Extension')) === $ext) {
                return false;
            }
        }

        $root = $contentTypesDom->documentElement;
        if (! $root instanceof \DOMElement) {
            return false;
        }

        $node = $contentTypesDom->createElementNS(self::CT_NS, 'Default');
        $node->setAttribute('Extension', $ext);
        $node->setAttribute('ContentType', $mimeMap[$ext]);
        $root->appendChild($node);

        return true;
    }

    /**
     * @param  array<string, string>  $rIdMap
     */
    protected function remapRelationshipIds(\DOMDocument $dom, array $rIdMap): void
    {
        $xpath = new \DOMXPath($dom);
        $xpath->registerNamespace('r', self::R_NS);

        $nodes = $xpath->query('//*[@r:embed or @r:id or @r:link]');
        if ($nodes === false) {
            return;
        }

        foreach ($nodes as $node) {
            if (! $node instanceof \DOMElement) {
                continue;
            }
            foreach (['embed', 'id', 'link'] as $attr) {
                $current = $node->getAttributeNS(self::R_NS, $attr);
                if ($current !== '' && isset($rIdMap[$current])) {
                    $node->setAttributeNS(self::R_NS, 'r:'.$attr, $rIdMap[$current]);
                }
            }
        }
    }

    /**
     * @return array<int, true>
     */
    protected function collectDrawingIds(\DOMDocument $dom): array
    {
        $used = [];
        $xpath = new \DOMXPath($dom);
        $nodes = $xpath->query('//*[local-name()="docPr" or local-name()="cNvPr"][@id]');
        if ($nodes === false) {
            return $used;
        }

        foreach ($nodes as $node) {
            if ($node instanceof \DOMElement) {
                $raw = $node->getAttribute('id');
                if (ctype_digit($raw)) {
                    $used[(int) $raw] = true;
                }
            }
        }

        return $used;
    }

    /**
     * Hitung ID awal yang aman dalam rentang 32-bit signed int (<= 2.147.483.647) agar Microsoft Word
     * tidak menolak ID drawing akibat overflow 64-bit dari generator dokumen eksternal.
     *
     * @param  array<int, true>  $usedIds
     */
    protected function computeNextSafeDrawingId(array $usedIds): int
    {
        $maxSafe = 0;
        foreach (array_keys($usedIds) as $id) {
            if ($id > 0 && $id < 2000000000) {
                $maxSafe = max($maxSafe, $id);
            }
        }

        $candidate = $maxSafe + 1;
        while (isset($usedIds[$candidate])) {
            $candidate++;
        }

        return $candidate;
    }

    /**
     * @param  array<int, true>  $usedIds
     */
    protected function deduplicateDrawingIds(\DOMDocument $dom, int $nextId, array &$usedIds): int
    {
        $xpath = new \DOMXPath($dom);
        $nodes = $xpath->query('//*[local-name()="docPr" or local-name()="cNvPr"][@id]');
        if ($nodes === false) {
            return $nextId;
        }

        foreach ($nodes as $node) {
            if ($node instanceof \DOMElement) {
                while (isset($usedIds[$nextId]) || $nextId >= 2147483647) {
                    $nextId = $nextId >= 2147483647 ? 1 : $nextId + 1;
                }
                $node->setAttribute('id', (string) $nextId);
                $usedIds[$nextId] = true;
                $nextId++;
            }
        }

        return $nextId;
    }

    /**
     * @return array<string, true>
     */
    protected function collectVmlShapeTypeIds(\DOMDocument $dom): array
    {
        $ids = [];
        $xpath = new \DOMXPath($dom);
        $xpath->registerNamespace('v', self::VML_NS);
        $nodes = $xpath->query('//v:shapetype[@id]');
        if ($nodes === false) {
            return $ids;
        }

        foreach ($nodes as $node) {
            if ($node instanceof \DOMElement && $node->getAttribute('id') !== '') {
                $ids[$node->getAttribute('id')] = true;
            }
        }

        return $ids;
    }

    /**
     * Deduplikasi elemen VML (shape, rect, group, line, oval, roundrect, polyline, curve, arc, image),
     * atribut o:spid, serta hapus definisi v:shapetype duplikat yang sudah ada pada dokumen basis.
     *
     * @param  array<string, true>  $baseShapeTypeIds
     */
    protected function deduplicateVmlShapes(\DOMDocument $dom, int $docIndex, array &$baseShapeTypeIds): void
    {
        $xpath = new \DOMXPath($dom);
        $xpath->registerNamespace('v', self::VML_NS);
        $xpath->registerNamespace('o', self::OFFICE_NS);

        // Hapus v:shapetype duplikat yang sudah didefinisikan pada dokumen basis agar @id tetap unik
        $shapeTypes = $xpath->query('//v:shapetype[@id]');
        if ($shapeTypes !== false) {
            $toRemove = [];
            foreach ($shapeTypes as $st) {
                if (! $st instanceof \DOMElement) {
                    continue;
                }
                $stId = $st->getAttribute('id');
                if ($stId === '') {
                    continue;
                }
                if (isset($baseShapeTypeIds[$stId])) {
                    $toRemove[] = $st;
                } else {
                    $baseShapeTypeIds[$stId] = true;
                }
            }
            foreach ($toRemove as $st) {
                $st->parentNode?->removeChild($st);
            }
        }

        $vmlNodes = $xpath->query('//v:shape | //v:rect | //v:group | //v:line | //v:oval | //v:roundrect | //v:polyline | //v:curve | //v:arc | //v:image');
        if ($vmlNodes === false) {
            return;
        }

        $renamedIds = [];
        foreach ($vmlNodes as $idx => $node) {
            if (! $node instanceof \DOMElement) {
                continue;
            }
            $oldId = $node->getAttribute('id');
            if ($oldId !== '') {
                $newId = "{$oldId}_kw{$docIndex}_{$idx}";
                $node->setAttribute('id', $newId);
                $renamedIds['#'.$oldId] = '#'.$newId;
            }
            $oldSpid = $node->getAttributeNS(self::OFFICE_NS, 'spid');
            if ($oldSpid !== '') {
                $node->setAttributeNS(self::OFFICE_NS, 'o:spid', "{$oldSpid}_kw{$docIndex}_{$idx}");
            }
        }

        if ($renamedIds !== []) {
            $ruleRefs = $xpath->query('//*[@idref]');
            if ($ruleRefs !== false) {
                foreach ($ruleRefs as $refNode) {
                    if ($refNode instanceof \DOMElement) {
                        $idref = $refNode->getAttribute('idref');
                        if (isset($renamedIds[$idref])) {
                            $refNode->setAttribute('idref', $renamedIds[$idref]);
                        }
                    }
                }
            }
        }
    }

    protected function findMaxBookmarkId(\DOMDocument $dom): int
    {
        $max = 0;
        $xpath = new \DOMXPath($dom);
        $xpath->registerNamespace('w', self::W_NS);
        $nodes = $xpath->query('//w:bookmarkStart[@w:id] | //w:bookmarkEnd[@w:id]');
        if ($nodes === false) {
            return 0;
        }

        foreach ($nodes as $node) {
            if ($node instanceof \DOMElement) {
                $id = $node->getAttributeNS(self::W_NS, 'id');
                if (ctype_digit($id)) {
                    $max = max($max, (int) $id);
                }
            }
        }

        return $max;
    }

    protected function deduplicateBookmarkIds(\DOMDocument $dom, int $nextId, int $docIndex): int
    {
        $xpath = new \DOMXPath($dom);
        $xpath->registerNamespace('w', self::W_NS);
        $nodes = $xpath->query('//w:bookmarkStart[@w:id] | //w:bookmarkEnd[@w:id]');
        if ($nodes === false) {
            return $nextId;
        }

        $idMap = [];
        $nameMap = [];
        $suffix = "_kw{$docIndex}";
        $maxBaseLen = max(1, 40 - strlen($suffix));

        foreach ($nodes as $node) {
            if (! $node instanceof \DOMElement) {
                continue;
            }
            $oldId = $node->getAttributeNS(self::W_NS, 'id');
            if ($oldId === '') {
                continue;
            }
            if (! isset($idMap[$oldId])) {
                $idMap[$oldId] = (string) $nextId;
                $nextId++;
            }
            $node->setAttributeNS(self::W_NS, 'w:id', $idMap[$oldId]);

            if ($node->localName === 'bookmarkStart') {
                $oldName = $node->getAttributeNS(self::W_NS, 'name');
                if ($oldName !== '') {
                    // Batas maksimum nama bookmark di Microsoft Word adalah 40 karakter (MS-OI29500)
                    $newName = mb_substr($oldName, 0, $maxBaseLen).$suffix;
                    $node->setAttributeNS(self::W_NS, 'w:name', $newName);
                    $nameMap[$oldName] = $newName;
                }
            }
        }

        if ($nameMap !== []) {
            $hyperlinks = $xpath->query('//w:hyperlink[@w:anchor]');
            if ($hyperlinks !== false) {
                foreach ($hyperlinks as $link) {
                    if ($link instanceof \DOMElement) {
                        $anchor = $link->getAttributeNS(self::W_NS, 'anchor');
                        if (isset($nameMap[$anchor])) {
                            $link->setAttributeNS(self::W_NS, 'w:anchor', $nameMap[$anchor]);
                        }
                    }
                }
            }
        }

        return $nextId;
    }

    /**
     * @return array{kode_full: string, kode_program: string, kode_sub_program: string, kode_uraian: string, program: string, sub_program: string, uraian: string}
     */
    protected function parseKodeKegiatan(?object $kodeKegiatan): array
    {
        if (! $kodeKegiatan) {
            return [
                'kode_full' => '-',
                'kode_program' => '-',
                'kode_sub_program' => '-',
                'kode_uraian' => '-',
                'program' => '-',
                'sub_program' => '-',
                'uraian' => '-',
            ];
        }

        $kode = (string) ($kodeKegiatan->kode ?? '-');
        $parts = explode('.', $kode);
        $kodeProgram = $parts[0] ?? '-';
        $kodeSubProgram = ($parts[0] ?? '-').'.'.($parts[1] ?? '-');

        return [
            'kode_full' => $kode,
            'kode_program' => $kodeProgram,
            'kode_sub_program' => $kodeSubProgram,
            'kode_uraian' => $kode,
            'program' => (string) ($kodeKegiatan->program ?? '-'),
            'sub_program' => (string) ($kodeKegiatan->sub_program ?? '-'),
            'uraian' => (string) ($kodeKegiatan->uraian ?? '-'),
        ];
    }

    protected function calculateTotalFromUraianDetails(?object $bukuKasUmum): float
    {
        if (! $bukuKasUmum) {
            return 0.0;
        }

        $total = 0.0;
        if ($bukuKasUmum->uraianDetails && $bukuKasUmum->uraianDetails->count() > 0) {
            $total = (float) $bukuKasUmum->uraianDetails->sum(function ($detail) {
                $vol = (float) ($detail->volume ?? 0);
                $harga = (float) ($detail->harga_satuan ?? 0);

                return $this->resolveDetailSubtotal($detail, $vol, $harga);
            });
        }

        return $total > 0 ? $total : (float) ($bukuKasUmum->total_transaksi_kotor ?? 0);
    }

    protected function resolveDetailSubtotal(object $detail, float $vol, float $harga): float
    {
        $subtotal = (float) ($detail->subtotal ?? 0);
        if ($subtotal > 0) {
            return $subtotal;
        }

        $jumlah = (float) ($detail->jumlah ?? 0);
        if ($jumlah > 0) {
            return $jumlah;
        }

        return $vol * $harga;
    }

    /**
     * @return array{ppn: float, pph: float, pb1: float}
     */
    protected function klasifikasiPajak(?object $bukuKasUmum, float $totalAmount = 0): array
    {
        $pajakData = ['ppn' => 0.0, 'pph' => 0.0, 'pb1' => 0.0];
        if (! $bukuKasUmum) {
            return $pajakData;
        }

        $pajakName = strtolower((string) ($bukuKasUmum->pajak ?? ''));

        if ((float) ($bukuKasUmum->total_pajak ?? 0) > 0) {
            if (str_contains($pajakName, 'pph')) {
                $pajakData['pph'] = (float) $bukuKasUmum->total_pajak;
            } else {
                $pajakData['ppn'] = (float) $bukuKasUmum->total_pajak;
            }
        }

        if ((float) ($bukuKasUmum->total_pajak_daerah ?? 0) > 0) {
            $pajakData['pb1'] = (float) $bukuKasUmum->total_pajak_daerah;
        }

        if ((float) ($bukuKasUmum->total_pajak ?? 0) == 0.0 && $pajakName !== '') {
            $pajakValue = $this->extractPajakValueFromName($pajakName, $totalAmount);
            if ($pajakValue > 0) {
                if (str_contains($pajakName, 'pph')) {
                    $pajakData['pph'] = $pajakValue;
                } else {
                    $pajakData['ppn'] = $pajakValue;
                }
            }
        }

        return $pajakData;
    }

    protected function extractPajakValueFromName(string $pajakName, float $totalAmount = 0): float
    {
        $cleanName = (string) preg_replace('/(?:pph|pasal|pb)\s*\d+/i', '', $pajakName);

        if (preg_match('/(\d+(?:\.\d+)?)\s*%/', $cleanName, $percentMatches)) {
            return ((float) $percentMatches[1] / 100) * $totalAmount;
        }

        $cleanName = str_replace(['.', ','], '', $cleanName);
        preg_match_all('/\d+/', $cleanName, $matches);

        $maxVal = 0.0;
        foreach ($matches[0] ?? [] as $match) {
            $maxVal = max($maxVal, (float) $match);
        }

        return $maxVal;
    }

    protected function convertToText(float|int $number): string
    {
        $number = (int) round($number);
        $units = ['', 'ribu', 'juta', 'miliar', 'triliun'];
        $words = [];

        if ($number <= 0) {
            return 'Nol rupiah';
        }

        $unitIndex = 0;
        while ($number > 0) {
            $chunk = $number % 1000;
            if ($chunk !== 0) {
                if ($unitIndex === 1 && $chunk === 1) {
                    array_unshift($words, 'seribu');
                } else {
                    $chunkWords = $this->convertChunk($chunk);
                    if ($unitIndex > 0) {
                        $chunkWords .= ' '.$units[$unitIndex];
                    }
                    array_unshift($words, $chunkWords);
                }
            }
            $number = (int) floor($number / 1000);
            $unitIndex++;
        }

        return ucfirst(strtolower(implode(' ', $words).' rupiah'));
    }

    protected function convertChunk(int $number): string
    {
        $ones = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan'];
        $tens = ['', '', 'dua puluh', 'tiga puluh', 'empat puluh', 'lima puluh', 'enam puluh', 'tujuh puluh', 'delapan puluh', 'sembilan puluh'];
        $teens = ['sepuluh', 'sebelas', 'dua belas', 'tiga belas', 'empat belas', 'lima belas', 'enam belas', 'tujuh belas', 'delapan belas', 'sembilan belas'];

        $words = [];
        $hundreds = (int) floor($number / 100);
        if ($hundreds > 0) {
            $words[] = $hundreds === 1 ? 'seratus' : $ones[$hundreds].' ratus';
            $number %= 100;
        }

        if ($number >= 10 && $number <= 19) {
            $words[] = $teens[$number - 10];
        } else {
            $tensDigit = (int) floor($number / 10);
            $onesDigit = $number % 10;
            if ($tensDigit > 0) {
                $words[] = $tens[$tensDigit];
            }
            if ($onesDigit > 0) {
                $words[] = $ones[$onesDigit];
            }
        }

        return implode(' ', $words);
    }

    protected function formatBulanIndonesia(string $englishMonth): string
    {
        $map = [
            'January' => 'Januari',
            'February' => 'Februari',
            'March' => 'Maret',
            'April' => 'April',
            'May' => 'Mei',
            'June' => 'Juni',
            'July' => 'Juli',
            'August' => 'Agustus',
            'September' => 'September',
            'October' => 'Oktober',
            'November' => 'November',
            'December' => 'Desember',
        ];

        return $map[$englishMonth] ?? $englishMonth;
    }

    protected function formatNumber(float|int $amount): string
    {
        return number_format((float) $amount, 0, ',', '.');
    }

    protected function formatRupiah(float|int $amount): string
    {
        return 'Rp '.$this->formatNumber($amount);
    }

    protected function formatVolume(float $vol): string
    {
        if (abs($vol - round($vol)) < 0.00001) {
            return number_format(round($vol), 0, ',', '.');
        }

        return rtrim(rtrim(number_format($vol, 2, ',', '.'), '0'), ',');
    }
}
