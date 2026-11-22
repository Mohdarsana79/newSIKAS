<?php

namespace App\Services;

use App\Config\VariantConfig;
use App\Exceptions\KwitansiTemplateException;
use App\Models\KwitansiTemplate;
use App\Models\SekolahProfile;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use PhpOffice\PhpWord\PhpWord;
use PhpOffice\PhpWord\SimpleType\Jc;

class KwitansiTemplateService extends SpjDocxTemplateEngine
{
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
                    ['key' => 'sub_program', 'tag' => '${sub_program}', 'label' => 'Nama Sub Program', 'example' => 'Pelaksanaan Administrasi Kegiatan'],
                    ['key' => 'uraian_kegiatan', 'tag' => '${uraian_kegiatan}', 'label' => 'Uraian Kegiatan', 'example' => 'Pembelian ATK'],
                    ['key' => 'kode_rekening', 'tag' => '${kode_rekening}', 'label' => 'Kode Rekening Belanja', 'example' => '5.1.02.01.01.0024'],
                    ['key' => 'rincian_objek', 'tag' => '${rincian_objek}', 'label' => 'Rincian Objek Belanja', 'example' => 'Belanja Alat/Bahan Kantor'],
                ],
            ],
            [
                'group' => 'Transaksi & Nominal',
                'type' => 'text',
                'description' => 'Data transaksi BKU, jumlah bruto, terbilang, dan tanggal.',
                'items' => [
                    ['key' => 'uraian', 'tag' => '${uraian}', 'label' => 'Uraian Pembayaran (Opsional / Utama)', 'example' => 'Pembelian ATK Bulanan'],
                    ['key' => 'uraian_bku', 'tag' => '${uraian_bku}', 'label' => 'Uraian BKU Asli', 'example' => 'Belanja Kertas HVS'],
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
            $this->imageVariableCatalogGroup(),
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
     * @throws KwitansiTemplateException
     */
    public function analyzeTemplateFile(string $fullPath): array
    {
        return $this->analyzeTemplateFileAgainstKeys(
            $fullPath,
            $this->recognizedVariableKeys(),
            self::ITEM_TABLE_VARIABLES
        );
    }

    /**
     * Kompilasi 1 dokumen kwitansi menjadi file .docx temporer.
     *
     * @throws KwitansiTemplateException
     */
    public function compileSingleDocx(KwitansiTemplate $template, Model $kwitansi, string $variant): string
    {
        $payload = $this->buildKwitansiVariables($kwitansi, $variant);

        return $this->compileDocxFromPayload(
            $template->file_path,
            $payload,
            self::ITEM_TABLE_VARIABLES,
            'kwitansi_custom_',
            'File template kwitansi tidak ditemukan di penyimpanan.'
        );
    }

    /**
     * Kompilasi banyak kwitansi menjadi 1 file .docx multipage (dipisah section/page break).
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
     * Petakan model Kwitansi + relasinya ke payload text, items, images, dan kop_border.
     *
     * @return array{text: array<string, string>, items: array<int, array<string, string>>, images: array<string, ?string>, kop_border: string}
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
            'kop_border' => $this->resolveKopBorder($sekolah),
        ];
    }
}
