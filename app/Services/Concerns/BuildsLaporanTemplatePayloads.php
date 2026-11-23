<?php

namespace App\Services\Concerns;

use App\Config\VariantConfig;
use App\Models\SekolahProfile;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use PhpOffice\PhpWord\PhpWord;
use PhpOffice\PhpWord\SimpleType\Jc;

trait BuildsLaporanTemplatePayloads
{
    /**
     * @return array<int, array{group: string, type: string, description: string, items: array<int, array{key: string, tag: string, label: string, example: string}>}>
     */
    protected function spmthCatalog(): array
    {
        return [
            $this->schoolIdentityCatalogGroup(),
            [
                'group' => 'Identitas & Periode SPMTH',
                'type' => 'text',
                'description' => 'Nomor surat, tanggal cetak, tahap/semester, tahun anggaran, dan sumber dana.',
                'items' => [
                    ['key' => 'nomor_surat', 'tag' => '${nomor_surat}', 'label' => 'Nomor Surat SPMTH', 'example' => '421/015/SPMTH/2026'],
                    ['key' => 'tanggal_spmth', 'tag' => '${tanggal_spmth}', 'label' => 'Tanggal SPMTH', 'example' => '30 Juni 2026'],
                    ['key' => 'tahap', 'tag' => '${tahap}', 'label' => 'Tahap (Angka)', 'example' => '1'],
                    ['key' => 'tahap_romawi', 'tag' => '${tahap_romawi}', 'label' => 'Tahap (Romawi)', 'example' => 'I'],
                    ['key' => 'semester_text', 'tag' => '${semester_text}', 'label' => 'Teks Semester', 'example' => 'Semester I'],
                    ['key' => 'tahun_anggaran', 'tag' => '${tahun_anggaran}', 'label' => 'Tahun Anggaran', 'example' => '2026'],
                    ['key' => 'sumber_dana', 'tag' => '${sumber_dana}', 'label' => 'Sumber Dana (Varian)', 'example' => 'BOSP Reguler'],
                    ['key' => 'sumber_dana_upper', 'tag' => '${sumber_dana_upper}', 'label' => 'Sumber Dana (KAPITAL)', 'example' => 'BOSP REGULER'],
                ],
            ],
            [
                'group' => 'Nominal Pagu & Realisasi SPMTH',
                'type' => 'text',
                'description' => 'Angka pagu, realisasi semester lalu, semester ini, total realisasi, dan sisa dana.',
                'items' => [
                    ['key' => 'pagu', 'tag' => '${pagu}', 'label' => 'Pagu Anggaran (Angka)', 'example' => '150.000.000'],
                    ['key' => 'pagu_rupiah', 'tag' => '${pagu_rupiah}', 'label' => 'Pagu Anggaran (Rp)', 'example' => 'Rp 150.000.000'],
                    ['key' => 'realisasi_lalu', 'tag' => '${realisasi_lalu}', 'label' => 'Realisasi s.d. Semester Lalu (Angka)', 'example' => '0'],
                    ['key' => 'realisasi_lalu_rupiah', 'tag' => '${realisasi_lalu_rupiah}', 'label' => 'Realisasi s.d. Semester Lalu (Rp)', 'example' => 'Rp 0'],
                    ['key' => 'realisasi_ini', 'tag' => '${realisasi_ini}', 'label' => 'Realisasi Semester Ini (Angka)', 'example' => '75.000.000'],
                    ['key' => 'realisasi_ini_rupiah', 'tag' => '${realisasi_ini_rupiah}', 'label' => 'Realisasi Semester Ini (Rp)', 'example' => 'Rp 75.000.000'],
                    ['key' => 'total_realisasi', 'tag' => '${total_realisasi}', 'label' => 'Total Realisasi (Angka)', 'example' => '75.000.000'],
                    ['key' => 'total_realisasi_rupiah', 'tag' => '${total_realisasi_rupiah}', 'label' => 'Total Realisasi (Rp)', 'example' => 'Rp 75.000.000'],
                    ['key' => 'sisa', 'tag' => '${sisa}', 'label' => 'Sisa Dana (Angka)', 'example' => '75.000.000'],
                    ['key' => 'sisa_rupiah', 'tag' => '${sisa_rupiah}', 'label' => 'Sisa Dana (Rp)', 'example' => 'Rp 75.000.000'],
                    ['key' => 'terbilang_sisa', 'tag' => '${terbilang_sisa}', 'label' => 'Terbilang Sisa Dana', 'example' => 'Tujuh Puluh Lima Juta Rupiah'],
                ],
            ],
            $this->laporanSignatoriesCatalogGroup(),
            $this->imageVariableCatalogGroup(),
        ];
    }

    /**
     * @return array<int, array{group: string, type: string, description: string, items: array<int, array{key: string, tag: string, label: string, example: string}>}>
     */
    protected function sptjCatalog(): array
    {
        return [
            $this->schoolIdentityCatalogGroup(),
            [
                'group' => 'Identitas & Periode SPTJ',
                'type' => 'text',
                'description' => 'Nomor SPTJ, tanggal, tahap/semester, tahun anggaran, dan sumber dana.',
                'items' => [
                    ['key' => 'nomor_sptj', 'tag' => '${nomor_sptj}', 'label' => 'Nomor SPTJ', 'example' => '421/010/SPTJ/2026'],
                    ['key' => 'tanggal_sptj', 'tag' => '${tanggal_sptj}', 'label' => 'Tanggal SPTJ', 'example' => '30 Juni 2026'],
                    ['key' => 'tahap', 'tag' => '${tahap}', 'label' => 'Tahap / Semester (Angka)', 'example' => '1'],
                    ['key' => 'tahap_romawi', 'tag' => '${tahap_romawi}', 'label' => 'Tahap (Romawi)', 'example' => 'I'],
                    ['key' => 'semester_text', 'tag' => '${semester_text}', 'label' => 'Teks Semester', 'example' => 'Semester I'],
                    ['key' => 'tahun_anggaran', 'tag' => '${tahun_anggaran}', 'label' => 'Tahun Anggaran', 'example' => '2026'],
                    ['key' => 'sumber_dana', 'tag' => '${sumber_dana}', 'label' => 'Sumber Dana (Varian)', 'example' => 'BOSP Reguler'],
                    ['key' => 'sumber_dana_upper', 'tag' => '${sumber_dana_upper}', 'label' => 'Sumber Dana (KAPITAL)', 'example' => 'BOSP REGULER'],
                ],
            ],
            [
                'group' => 'Penerimaan, Pengeluaran & Sisa Dana SPTJ',
                'type' => 'text',
                'description' => 'Rincian penerimaan Tahap I/II, jenis belanja operasi & modal, serta sisa kas tunai dan bank.',
                'items' => [
                    ['key' => 'tahap_satu', 'tag' => '${tahap_satu}', 'label' => 'Penerimaan Tahap I (Angka)', 'example' => '75.000.000'],
                    ['key' => 'tahap_satu_rupiah', 'tag' => '${tahap_satu_rupiah}', 'label' => 'Penerimaan Tahap I (Rp)', 'example' => 'Rp 75.000.000'],
                    ['key' => 'tahap_dua', 'tag' => '${tahap_dua}', 'label' => 'Penerimaan Tahap II (Angka)', 'example' => '0'],
                    ['key' => 'tahap_dua_rupiah', 'tag' => '${tahap_dua_rupiah}', 'label' => 'Penerimaan Tahap II (Rp)', 'example' => 'Rp 0'],
                    ['key' => 'jumlah_penerimaan', 'tag' => '${jumlah_penerimaan}', 'label' => 'Jumlah Penerimaan (Angka)', 'example' => '75.000.000'],
                    ['key' => 'jumlah_penerimaan_rupiah', 'tag' => '${jumlah_penerimaan_rupiah}', 'label' => 'Jumlah Penerimaan (Rp)', 'example' => 'Rp 75.000.000'],
                    ['key' => 'belanja_pegawai', 'tag' => '${belanja_pegawai}', 'label' => 'Belanja Pegawai (Angka)', 'example' => '15.000.000'],
                    ['key' => 'belanja_pegawai_rupiah', 'tag' => '${belanja_pegawai_rupiah}', 'label' => 'Belanja Pegawai (Rp)', 'example' => 'Rp 15.000.000'],
                    ['key' => 'belanja_barang_jasa', 'tag' => '${belanja_barang_jasa}', 'label' => 'Belanja Barang & Jasa (Angka)', 'example' => '40.000.000'],
                    ['key' => 'belanja_barang_jasa_rupiah', 'tag' => '${belanja_barang_jasa_rupiah}', 'label' => 'Belanja Barang & Jasa (Rp)', 'example' => 'Rp 40.000.000'],
                    ['key' => 'belanja_operasi', 'tag' => '${belanja_operasi}', 'label' => 'Belanja Operasi (Angka)', 'example' => '55.000.000'],
                    ['key' => 'belanja_operasi_rupiah', 'tag' => '${belanja_operasi_rupiah}', 'label' => 'Belanja Operasi (Rp)', 'example' => 'Rp 55.000.000'],
                    ['key' => 'belanja_modal', 'tag' => '${belanja_modal}', 'label' => 'Belanja Modal (Angka)', 'example' => '15.000.000'],
                    ['key' => 'belanja_modal_rupiah', 'tag' => '${belanja_modal_rupiah}', 'label' => 'Belanja Modal (Rp)', 'example' => 'Rp 15.000.000'],
                    ['key' => 'jumlah_pengeluaran', 'tag' => '${jumlah_pengeluaran}', 'label' => 'Jumlah Pengeluaran (Angka)', 'example' => '70.000.000'],
                    ['key' => 'jumlah_pengeluaran_rupiah', 'tag' => '${jumlah_pengeluaran_rupiah}', 'label' => 'Jumlah Pengeluaran (Rp)', 'example' => 'Rp 70.000.000'],
                    ['key' => 'sisa_kas_tunai', 'tag' => '${sisa_kas_tunai}', 'label' => 'Sisa Kas Tunai (Angka)', 'example' => '1.000.000'],
                    ['key' => 'sisa_kas_tunai_rupiah', 'tag' => '${sisa_kas_tunai_rupiah}', 'label' => 'Sisa Kas Tunai (Rp)', 'example' => 'Rp 1.000.000'],
                    ['key' => 'sisa_dana_di_bank', 'tag' => '${sisa_dana_di_bank}', 'label' => 'Sisa Dana di Bank (Angka)', 'example' => '4.000.000'],
                    ['key' => 'sisa_dana_di_bank_rupiah', 'tag' => '${sisa_dana_di_bank_rupiah}', 'label' => 'Sisa Dana di Bank (Rp)', 'example' => 'Rp 4.000.000'],
                    ['key' => 'total_sisa_dana', 'tag' => '${total_sisa_dana}', 'label' => 'Total Sisa Dana (Angka)', 'example' => '5.000.000'],
                    ['key' => 'total_sisa_dana_rupiah', 'tag' => '${total_sisa_dana_rupiah}', 'label' => 'Total Sisa Dana (Rp)', 'example' => 'Rp 5.000.000'],
                ],
            ],
            $this->laporanSignatoriesCatalogGroup(),
            $this->imageVariableCatalogGroup(),
        ];
    }

    /**
     * @return array<int, array{group: string, type: string, description: string, items: array<int, array{key: string, tag: string, label: string, example: string}>}>
     */
    protected function sp2bCatalog(): array
    {
        return [
            $this->schoolIdentityCatalogGroup(),
            [
                'group' => 'Identitas & Periode SP2B',
                'type' => 'text',
                'description' => 'Nomor SP2B, tanggal, jenis periode (Bulan / Tahap), teks periode, dan sumber dana.',
                'items' => [
                    ['key' => 'nomor_sp2b', 'tag' => '${nomor_sp2b}', 'label' => 'Nomor SP2B', 'example' => '900/005/SP2B/2026'],
                    ['key' => 'tanggal_sp2b', 'tag' => '${tanggal_sp2b}', 'label' => 'Tanggal SP2B', 'example' => '30 Juni 2026'],
                    ['key' => 'jenis_periode', 'tag' => '${jenis_periode}', 'label' => 'Jenis Periode', 'example' => 'Tahap'],
                    ['key' => 'tahap', 'tag' => '${tahap}', 'label' => 'Tahap (Angka)', 'example' => '1'],
                    ['key' => 'tahap_romawi', 'tag' => '${tahap_romawi}', 'label' => 'Tahap (Romawi)', 'example' => 'I'],
                    ['key' => 'bulan', 'tag' => '${bulan}', 'label' => 'Bulan (Angka)', 'example' => '6'],
                    ['key' => 'bulan_nama', 'tag' => '${bulan_nama}', 'label' => 'Nama Bulan', 'example' => 'Juni'],
                    ['key' => 'periode_text', 'tag' => '${periode_text}', 'label' => 'Teks Periode Lengkap', 'example' => 'Januari s.d Juni Tahun Anggaran 2026'],
                    ['key' => 'tahun_anggaran', 'tag' => '${tahun_anggaran}', 'label' => 'Tahun Anggaran', 'example' => '2026'],
                    ['key' => 'sumber_dana', 'tag' => '${sumber_dana}', 'label' => 'Sumber Dana (Varian)', 'example' => 'BOSP Reguler'],
                    ['key' => 'sumber_dana_upper', 'tag' => '${sumber_dana_upper}', 'label' => 'Sumber Dana (KAPITAL)', 'example' => 'BOSP REGULER'],
                ],
            ],
            [
                'group' => 'Ringkasan Saldo, Pendapatan & Belanja SP2B',
                'type' => 'text',
                'description' => 'Saldo awal, pendapatan, total belanja, rincian belanja pegawai/barang-jasa/modal, dan saldo akhir.',
                'items' => [
                    ['key' => 'saldo_awal', 'tag' => '${saldo_awal}', 'label' => 'Saldo Awal (Angka)', 'example' => '0'],
                    ['key' => 'saldo_awal_rupiah', 'tag' => '${saldo_awal_rupiah}', 'label' => 'Saldo Awal (Rp)', 'example' => 'Rp 0'],
                    ['key' => 'pendapatan', 'tag' => '${pendapatan}', 'label' => 'Pendapatan (Angka)', 'example' => '75.000.000'],
                    ['key' => 'pendapatan_rupiah', 'tag' => '${pendapatan_rupiah}', 'label' => 'Pendapatan (Rp)', 'example' => 'Rp 75.000.000'],
                    ['key' => 'belanja', 'tag' => '${belanja}', 'label' => 'Jumlah Belanja (Angka)', 'example' => '70.000.000'],
                    ['key' => 'belanja_rupiah', 'tag' => '${belanja_rupiah}', 'label' => 'Jumlah Belanja (Rp)', 'example' => 'Rp 70.000.000'],
                    ['key' => 'belanja_pegawai', 'tag' => '${belanja_pegawai}', 'label' => 'Belanja Pegawai (Angka)', 'example' => '15.000.000'],
                    ['key' => 'belanja_pegawai_rupiah', 'tag' => '${belanja_pegawai_rupiah}', 'label' => 'Belanja Pegawai (Rp)', 'example' => 'Rp 15.000.000'],
                    ['key' => 'belanja_barang_jasa', 'tag' => '${belanja_barang_jasa}', 'label' => 'Belanja Barang & Jasa (Angka)', 'example' => '40.000.000'],
                    ['key' => 'belanja_barang_jasa_rupiah', 'tag' => '${belanja_barang_jasa_rupiah}', 'label' => 'Belanja Barang & Jasa (Rp)', 'example' => 'Rp 40.000.000'],
                    ['key' => 'belanja_modal', 'tag' => '${belanja_modal}', 'label' => 'Belanja Modal (Angka)', 'example' => '15.000.000'],
                    ['key' => 'belanja_modal_rupiah', 'tag' => '${belanja_modal_rupiah}', 'label' => 'Belanja Modal (Rp)', 'example' => 'Rp 15.000.000'],
                    ['key' => 'belanja_modal_peralatan_mesin', 'tag' => '${belanja_modal_peralatan_mesin}', 'label' => 'Belanja Modal Peralatan & Mesin (Angka)', 'example' => '10.000.000'],
                    ['key' => 'belanja_modal_peralatan_mesin_rupiah', 'tag' => '${belanja_modal_peralatan_mesin_rupiah}', 'label' => 'Belanja Modal Peralatan & Mesin (Rp)', 'example' => 'Rp 10.000.000'],
                    ['key' => 'belanja_modal_aset_tetap_lainnya', 'tag' => '${belanja_modal_aset_tetap_lainnya}', 'label' => 'Belanja Modal Aset Tetap Lainnya (Angka)', 'example' => '5.000.000'],
                    ['key' => 'belanja_modal_aset_tetap_lainnya_rupiah', 'tag' => '${belanja_modal_aset_tetap_lainnya_rupiah}', 'label' => 'Belanja Modal Aset Tetap Lainnya (Rp)', 'example' => 'Rp 5.000.000'],
                    ['key' => 'belanja_modal_tanah_bangunan', 'tag' => '${belanja_modal_tanah_bangunan}', 'label' => 'Belanja Modal Tanah & Bangunan (Angka)', 'example' => '0'],
                    ['key' => 'belanja_modal_tanah_bangunan_rupiah', 'tag' => '${belanja_modal_tanah_bangunan_rupiah}', 'label' => 'Belanja Modal Tanah & Bangunan (Rp)', 'example' => 'Rp 0'],
                    ['key' => 'saldo_akhir', 'tag' => '${saldo_akhir}', 'label' => 'Saldo Akhir (Angka)', 'example' => '5.000.000'],
                    ['key' => 'saldo_akhir_rupiah', 'tag' => '${saldo_akhir_rupiah}', 'label' => 'Saldo Akhir (Rp)', 'example' => 'Rp 5.000.000'],
                ],
            ],
            $this->laporanSignatoriesCatalogGroup(),
            $this->imageVariableCatalogGroup(),
        ];
    }

    /**
     * @return array<int, array{group: string, type: string, description: string, items: array<int, array{key: string, tag: string, label: string, example: string}>}>
     */
    protected function lphCatalog(): array
    {
        return [
            $this->schoolIdentityCatalogGroup(),
            [
                'group' => 'Identitas & Periode LPH',
                'type' => 'text',
                'description' => 'Semester, tanggal laporan, tahun anggaran, dan sumber dana.',
                'items' => [
                    ['key' => 'semester', 'tag' => '${semester}', 'label' => 'Semester (Angka)', 'example' => '1'],
                    ['key' => 'semester_romawi', 'tag' => '${semester_romawi}', 'label' => 'Semester (Romawi)', 'example' => 'I'],
                    ['key' => 'semester_text', 'tag' => '${semester_text}', 'label' => 'Teks Semester', 'example' => 'Semester I (Ganjil)'],
                    ['key' => 'tanggal_lph', 'tag' => '${tanggal_lph}', 'label' => 'Tanggal LPH', 'example' => '30 Juni 2026'],
                    ['key' => 'tahun_anggaran', 'tag' => '${tahun_anggaran}', 'label' => 'Tahun Anggaran', 'example' => '2026'],
                    ['key' => 'sumber_dana', 'tag' => '${sumber_dana}', 'label' => 'Sumber Dana (Varian)', 'example' => 'BOSP Reguler'],
                    ['key' => 'sumber_dana_upper', 'tag' => '${sumber_dana_upper}', 'label' => 'Sumber Dana (KAPITAL)', 'example' => 'BOSP REGULER'],
                ],
            ],
            [
                'group' => 'Anggaran, Realisasi & Selisih LPH',
                'type' => 'text',
                'description' => 'Rincian penerimaan dan pengeluaran (Operasional, Modal Peralatan & Mesin, Modal Aset Tetap Lainnya, serta Total Pengeluaran).',
                'items' => [
                    ['key' => 'penerimaan_anggaran', 'tag' => '${penerimaan_anggaran}', 'label' => 'Penerimaan Anggaran (Angka)', 'example' => '75.000.000'],
                    ['key' => 'penerimaan_anggaran_rupiah', 'tag' => '${penerimaan_anggaran_rupiah}', 'label' => 'Penerimaan Anggaran (Rp)', 'example' => 'Rp 75.000.000'],
                    ['key' => 'penerimaan_realisasi', 'tag' => '${penerimaan_realisasi}', 'label' => 'Penerimaan Realisasi (Angka)', 'example' => '70.000.000'],
                    ['key' => 'penerimaan_realisasi_rupiah', 'tag' => '${penerimaan_realisasi_rupiah}', 'label' => 'Penerimaan Realisasi (Rp)', 'example' => 'Rp 70.000.000'],
                    ['key' => 'penerimaan_selisih', 'tag' => '${penerimaan_selisih}', 'label' => 'Penerimaan Selisih (Angka)', 'example' => '5.000.000'],
                    ['key' => 'penerimaan_selisih_rupiah', 'tag' => '${penerimaan_selisih_rupiah}', 'label' => 'Penerimaan Selisih (Rp)', 'example' => 'Rp 5.000.000'],

                    ['key' => 'belanja_operasi_anggaran', 'tag' => '${belanja_operasi_anggaran}', 'label' => 'Belanja Operasi Anggaran (Angka)', 'example' => '55.000.000'],
                    ['key' => 'belanja_operasi_anggaran_rupiah', 'tag' => '${belanja_operasi_anggaran_rupiah}', 'label' => 'Belanja Operasi Anggaran (Rp)', 'example' => 'Rp 55.000.000'],
                    ['key' => 'belanja_operasi_realisasi', 'tag' => '${belanja_operasi_realisasi}', 'label' => 'Belanja Operasi Realisasi (Angka)', 'example' => '52.000.000'],
                    ['key' => 'belanja_operasi_realisasi_rupiah', 'tag' => '${belanja_operasi_realisasi_rupiah}', 'label' => 'Belanja Operasi Realisasi (Rp)', 'example' => 'Rp 52.000.000'],
                    ['key' => 'belanja_operasi_selisih', 'tag' => '${belanja_operasi_selisih}', 'label' => 'Belanja Operasi Selisih (Angka)', 'example' => '3.000.000'],
                    ['key' => 'belanja_operasi_selisih_rupiah', 'tag' => '${belanja_operasi_selisih_rupiah}', 'label' => 'Belanja Operasi Selisih (Rp)', 'example' => 'Rp 3.000.000'],

                    ['key' => 'belanja_modal_peralatan_anggaran', 'tag' => '${belanja_modal_peralatan_anggaran}', 'label' => 'Modal Peralatan & Mesin Anggaran (Angka)', 'example' => '12.000.000'],
                    ['key' => 'belanja_modal_peralatan_anggaran_rupiah', 'tag' => '${belanja_modal_peralatan_anggaran_rupiah}', 'label' => 'Modal Peralatan & Mesin Anggaran (Rp)', 'example' => 'Rp 12.000.000'],
                    ['key' => 'belanja_modal_peralatan_realisasi', 'tag' => '${belanja_modal_peralatan_realisasi}', 'label' => 'Modal Peralatan & Mesin Realisasi (Angka)', 'example' => '11.000.000'],
                    ['key' => 'belanja_modal_peralatan_realisasi_rupiah', 'tag' => '${belanja_modal_peralatan_realisasi_rupiah}', 'label' => 'Modal Peralatan & Mesin Realisasi (Rp)', 'example' => 'Rp 11.000.000'],
                    ['key' => 'belanja_modal_peralatan_selisih', 'tag' => '${belanja_modal_peralatan_selisih}', 'label' => 'Modal Peralatan & Mesin Selisih (Angka)', 'example' => '1.000.000'],
                    ['key' => 'belanja_modal_peralatan_selisih_rupiah', 'tag' => '${belanja_modal_peralatan_selisih_rupiah}', 'label' => 'Modal Peralatan & Mesin Selisih (Rp)', 'example' => 'Rp 1.000.000'],

                    ['key' => 'belanja_modal_aset_anggaran', 'tag' => '${belanja_modal_aset_anggaran}', 'label' => 'Modal Aset Tetap Lainnya Anggaran (Angka)', 'example' => '8.000.000'],
                    ['key' => 'belanja_modal_aset_anggaran_rupiah', 'tag' => '${belanja_modal_aset_anggaran_rupiah}', 'label' => 'Modal Aset Tetap Lainnya Anggaran (Rp)', 'example' => 'Rp 8.000.000'],
                    ['key' => 'belanja_modal_aset_realisasi', 'tag' => '${belanja_modal_aset_realisasi}', 'label' => 'Modal Aset Tetap Lainnya Realisasi (Angka)', 'example' => '7.000.000'],
                    ['key' => 'belanja_modal_aset_realisasi_rupiah', 'tag' => '${belanja_modal_aset_realisasi_rupiah}', 'label' => 'Modal Aset Tetap Lainnya Realisasi (Rp)', 'example' => 'Rp 7.000.000'],
                    ['key' => 'belanja_modal_aset_selisih', 'tag' => '${belanja_modal_aset_selisih}', 'label' => 'Modal Aset Tetap Lainnya Selisih (Angka)', 'example' => '1.000.000'],
                    ['key' => 'belanja_modal_aset_selisih_rupiah', 'tag' => '${belanja_modal_aset_selisih_rupiah}', 'label' => 'Modal Aset Tetap Lainnya Selisih (Rp)', 'example' => 'Rp 1.000.000'],

                    ['key' => 'total_pengeluaran_anggaran', 'tag' => '${total_pengeluaran_anggaran}', 'label' => 'Total Pengeluaran Anggaran (Angka)', 'example' => '75.000.000'],
                    ['key' => 'total_pengeluaran_anggaran_rupiah', 'tag' => '${total_pengeluaran_anggaran_rupiah}', 'label' => 'Total Pengeluaran Anggaran (Rp)', 'example' => 'Rp 75.000.000'],
                    ['key' => 'total_pengeluaran_realisasi', 'tag' => '${total_pengeluaran_realisasi}', 'label' => 'Total Pengeluaran Realisasi (Angka)', 'example' => '70.000.000'],
                    ['key' => 'total_pengeluaran_realisasi_rupiah', 'tag' => '${total_pengeluaran_realisasi_rupiah}', 'label' => 'Total Pengeluaran Realisasi (Rp)', 'example' => 'Rp 70.000.000'],
                    ['key' => 'total_pengeluaran_selisih', 'tag' => '${total_pengeluaran_selisih}', 'label' => 'Total Pengeluaran Selisih (Angka)', 'example' => '5.000.000'],
                    ['key' => 'total_pengeluaran_selisih_rupiah', 'tag' => '${total_pengeluaran_selisih_rupiah}', 'label' => 'Total Pengeluaran Selisih (Rp)', 'example' => 'Rp 5.000.000'],
                ],
            ],
            [
                'group' => 'Tabel Rekap per Kode Rekening (Opsional — Baris Dinamis)',
                'type' => 'table',
                'description' => 'Letakkan 1 baris contoh di dalam tabel Word untuk menampilkan rincian realisasi per kode rekening BKU.',
                'items' => [
                    ['key' => 'item_no', 'tag' => '${item_no}', 'label' => 'Nomor Urut', 'example' => '1'],
                    ['key' => 'item_kode_rekening', 'tag' => '${item_kode_rekening}', 'label' => 'Kode Rekening', 'example' => '5.1.02.01.01.0024'],
                    ['key' => 'item_nama_rekening', 'tag' => '${item_nama_rekening}', 'label' => 'Nama / Rincian Rekening', 'example' => 'Belanja Alat/Bahan ATK'],
                    ['key' => 'item_uraian', 'tag' => '${item_uraian}', 'label' => 'Uraian', 'example' => 'Pembelian ATK Semester I'],
                    ['key' => 'item_realisasi', 'tag' => '${item_realisasi}', 'label' => 'Realisasi (Angka)', 'example' => '5.000.000'],
                    ['key' => 'item_realisasi_rupiah', 'tag' => '${item_realisasi_rupiah}', 'label' => 'Realisasi (Rp)', 'example' => 'Rp 5.000.000'],
                ],
            ],
            $this->laporanSignatoriesCatalogGroup(),
            $this->imageVariableCatalogGroup(),
        ];
    }

    /**
     * @return array{group: string, type: string, description: string, items: array<int, array{key: string, tag: string, label: string, example: string}>}
     */
    protected function laporanSignatoriesCatalogGroup(): array
    {
        return [
            'group' => 'Penanggung Jawab',
            'type' => 'text',
            'description' => 'Data Kepala Sekolah, Bendahara, dan Komite dari Penganggaran aktif.',
            'items' => [
                ['key' => 'kepala_sekolah', 'tag' => '${kepala_sekolah}', 'label' => 'Nama Kepala Sekolah', 'example' => 'Dra. Siti Aminah'],
                ['key' => 'nip_kepala_sekolah', 'tag' => '${nip_kepala_sekolah}', 'label' => 'NIP Kepala Sekolah', 'example' => '197001011998022001'],
                ['key' => 'bendahara', 'tag' => '${bendahara}', 'label' => 'Nama Bendahara', 'example' => 'Budi Santoso, S.Pd'],
                ['key' => 'nip_bendahara', 'tag' => '${nip_bendahara}', 'label' => 'NIP Bendahara', 'example' => '198505122010011005'],
                ['key' => 'komite', 'tag' => '${komite}', 'label' => 'Nama Ketua Komite', 'example' => 'H. Ahmad Fauzi'],
            ],
        ];
    }

    // -------------------------------------------------------------------------
    // Variable Payload Builders
    // -------------------------------------------------------------------------

    /**
     * @return array{text: array<string, string>, items: array<int, array<string, string>>, images: array<string, ?string>, kop_border: string}
     */
    protected function buildSpmthVariables(Model $spmth, string $variant): array
    {
        $penganggaran = $spmth->penganggaran;
        $sekolah = $spmth->sekolah ?? ($penganggaran?->sekolah_id ? SekolahProfile::find($penganggaran->sekolah_id) : null) ?? SekolahProfile::first();

        $tahap = (string) ($spmth->tahap ?? '1');
        $tahapRomawi = $tahap === '2' ? 'II' : 'I';
        $semesterText = $tahap === '2' ? 'Semester II' : 'Semester I';

        $tanggalObj = $spmth->tanggal_spmth ? Carbon::parse($spmth->tanggal_spmth) : Carbon::now();
        $tanggalFormatted = $this->formatIndonesianDate($tanggalObj);

        $pagu = (float) ($penganggaran?->pagu_anggaran ?? 0);
        $realisasiLalu = (float) ($spmth->realisasi_lalu ?? 0);
        $realisasiIni = (float) ($spmth->realisasi_ini ?? 0);
        $totalRealisasi = $realisasiLalu + $realisasiIni;
        $sisa = (float) ($spmth->sisa ?? ($pagu - $totalRealisasi));
        $terbilangSisa = ucwords(strtolower($this->convertToText(abs($sisa))));

        $sumberDana = VariantConfig::title($variant);

        $text = array_merge($this->extractRecordCustomVariables($spmth), $this->baseSchoolText($sekolah), [
            'nomor_surat' => (string) ($spmth->nomor_surat ?: '-'),
            'tanggal_spmth' => $tanggalFormatted,
            'tahap' => $tahap,
            'tahap_romawi' => $tahapRomawi,
            'semester_text' => $semesterText,
            'tahun_anggaran' => (string) ($penganggaran?->tahun_anggaran ?? '-'),
            'sumber_dana' => $sumberDana,
            'sumber_dana_upper' => strtoupper($sumberDana),

            'pagu' => $this->formatNumber($pagu),
            'pagu_rupiah' => $this->formatRupiah($pagu),
            'realisasi_lalu' => $this->formatNumber($realisasiLalu),
            'realisasi_lalu_rupiah' => $this->formatRupiah($realisasiLalu),
            'realisasi_ini' => $this->formatNumber($realisasiIni),
            'realisasi_ini_rupiah' => $this->formatRupiah($realisasiIni),
            'total_realisasi' => $this->formatNumber($totalRealisasi),
            'total_realisasi_rupiah' => $this->formatRupiah($totalRealisasi),
            'sisa' => $this->formatNumber($sisa),
            'sisa_rupiah' => $this->formatRupiah($sisa),
            'terbilang_sisa' => $terbilangSisa,

            'kepala_sekolah' => (string) ($penganggaran?->kepala_sekolah ?? '-'),
            'nip_kepala_sekolah' => (string) ($penganggaran?->nip_kepala_sekolah ?? '-'),
            'bendahara' => (string) ($penganggaran?->bendahara ?? '-'),
            'nip_bendahara' => (string) ($penganggaran?->nip_bendahara ?? '-'),
            'komite' => (string) ($penganggaran?->komite ?? '-'),
        ]);

        return [
            'text' => $text,
            'items' => [],
            'images' => $this->baseSchoolImages($sekolah),
            'kop_border' => $this->resolveKopBorder($sekolah),
        ];
    }

    /**
     * @return array{text: array<string, string>, items: array<int, array<string, string>>, images: array<string, ?string>, kop_border: string}
     */
    protected function buildSptjVariables(Model $sptj, string $variant): array
    {
        $penganggaran = $sptj->penganggaran;
        $sekolah = ($penganggaran?->sekolah_id ? SekolahProfile::find($penganggaran->sekolah_id) : null) ?? SekolahProfile::first();

        $tahap = (string) ($sptj->tahap ?? '1');
        $tahapRomawi = $tahap === '2' ? 'II' : 'I';
        $semesterText = $tahap === '2' ? 'Semester II' : 'Semester I';

        $tanggalObj = $sptj->tanggal_sptj ? Carbon::parse($sptj->tanggal_sptj) : Carbon::now();
        $tanggalFormatted = $this->formatIndonesianDate($tanggalObj);

        $tahapSatu = (float) ($sptj->tahap_satu ?? 0);
        $tahapDua = (float) ($sptj->tahap_dua ?? 0);
        $jumlahPenerimaan = $tahapSatu + $tahapDua;

        $belanjaPegawai = (float) ($sptj->jenis_belanja_pegawai ?? 0);
        $belanjaBarangJasa = (float) ($sptj->jenis_belanja_barang_jasa ?? 0);
        $belanjaOperasi = $belanjaPegawai + $belanjaBarangJasa;
        $belanjaModal = (float) ($sptj->jenis_belanja_modal ?? 0);
        $jumlahPengeluaran = $belanjaOperasi + $belanjaModal;

        $sisaKasTunai = (float) ($sptj->sisa_kas_tunai ?? 0);
        $sisaDanaBank = (float) ($sptj->sisa_dana_di_bank ?? 0);
        $totalSisaDana = $sisaKasTunai + $sisaDanaBank;

        $sumberDana = VariantConfig::title($variant);

        $text = array_merge($this->extractRecordCustomVariables($sptj), $this->baseSchoolText($sekolah), [
            'nomor_sptj' => (string) ($sptj->nomor_sptj ?: '-'),
            'tanggal_sptj' => $tanggalFormatted,
            'tahap' => $tahap,
            'tahap_romawi' => $tahapRomawi,
            'semester_text' => $semesterText,
            'tahun_anggaran' => (string) ($penganggaran?->tahun_anggaran ?? '-'),
            'sumber_dana' => $sumberDana,
            'sumber_dana_upper' => strtoupper($sumberDana),

            'tahap_satu' => $this->formatNumber($tahapSatu),
            'tahap_satu_rupiah' => $this->formatRupiah($tahapSatu),
            'tahap_dua' => $this->formatNumber($tahapDua),
            'tahap_dua_rupiah' => $this->formatRupiah($tahapDua),
            'jumlah_penerimaan' => $this->formatNumber($jumlahPenerimaan),
            'jumlah_penerimaan_rupiah' => $this->formatRupiah($jumlahPenerimaan),

            'belanja_pegawai' => $this->formatNumber($belanjaPegawai),
            'belanja_pegawai_rupiah' => $this->formatRupiah($belanjaPegawai),
            'belanja_barang_jasa' => $this->formatNumber($belanjaBarangJasa),
            'belanja_barang_jasa_rupiah' => $this->formatRupiah($belanjaBarangJasa),
            'belanja_operasi' => $this->formatNumber($belanjaOperasi),
            'belanja_operasi_rupiah' => $this->formatRupiah($belanjaOperasi),
            'belanja_modal' => $this->formatNumber($belanjaModal),
            'belanja_modal_rupiah' => $this->formatRupiah($belanjaModal),
            'jumlah_pengeluaran' => $this->formatNumber($jumlahPengeluaran),
            'jumlah_pengeluaran_rupiah' => $this->formatRupiah($jumlahPengeluaran),

            'sisa_kas_tunai' => $this->formatNumber($sisaKasTunai),
            'sisa_kas_tunai_rupiah' => $this->formatRupiah($sisaKasTunai),
            'sisa_dana_di_bank' => $this->formatNumber($sisaDanaBank),
            'sisa_dana_di_bank_rupiah' => $this->formatRupiah($sisaDanaBank),
            'total_sisa_dana' => $this->formatNumber($totalSisaDana),
            'total_sisa_dana_rupiah' => $this->formatRupiah($totalSisaDana),

            'kepala_sekolah' => (string) ($penganggaran?->kepala_sekolah ?? '-'),
            'nip_kepala_sekolah' => (string) ($penganggaran?->nip_kepala_sekolah ?? '-'),
            'bendahara' => (string) ($penganggaran?->bendahara ?? '-'),
            'nip_bendahara' => (string) ($penganggaran?->nip_bendahara ?? '-'),
            'komite' => (string) ($penganggaran?->komite ?? '-'),
        ]);

        return [
            'text' => $text,
            'items' => [],
            'images' => $this->baseSchoolImages($sekolah),
            'kop_border' => $this->resolveKopBorder($sekolah),
        ];
    }

    /**
     * @return array{text: array<string, string>, items: array<int, array<string, string>>, images: array<string, ?string>, kop_border: string}
     */
    protected function buildSp2bVariables(Model $sp2b, string $variant): array
    {
        $penganggaran = $sp2b->penganggaran;
        $sekolah = ($penganggaran?->sekolah_id ? SekolahProfile::find($penganggaran->sekolah_id) : null) ?? SekolahProfile::first();

        $months = [
            1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
            5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
            9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember',
        ];
        $jenisPeriode = (string) ($sp2b->jenis_periode ?? 'tahap');
        $tahap = (string) ($sp2b->tahap ?? '1');
        $tahapRomawi = $tahap === '2' ? 'II' : 'I';
        $bulanNum = $sp2b->bulan ? (int) $sp2b->bulan : null;
        $bulanNama = $bulanNum ? ($months[$bulanNum] ?? '-') : '-';
        $tahunAnggaran = (string) ($penganggaran?->tahun_anggaran ?? '-');

        if ($jenisPeriode === 'bulan' && $bulanNum) {
            $periodeText = "{$bulanNama} Tahun Anggaran {$tahunAnggaran}";
        } else {
            $semesterText = $tahap === '2' ? 'Juli s.d Desember' : 'Januari s.d Juni';
            $periodeText = "{$semesterText} Tahun Anggaran {$tahunAnggaran}";
        }

        $tanggalObj = $sp2b->tanggal_sp2b ? Carbon::parse($sp2b->tanggal_sp2b) : Carbon::now();
        $tanggalFormatted = $this->formatIndonesianDate($tanggalObj);

        $saldoAwal = (float) ($sp2b->saldo_awal ?? 0);
        $pendapatan = (float) ($sp2b->pendapatan ?? 0);
        $belanja = (float) ($sp2b->belanja ?? 0);
        $belanjaPegawai = (float) ($sp2b->belanja_pegawai ?? 0);
        $belanjaBarangJasa = (float) ($sp2b->belanja_barang_jasa ?? 0);
        $belanjaModal = (float) ($sp2b->belanja_modal ?? 0);
        $bmPeralatan = (float) ($sp2b->belanja_modal_peralatan_mesin ?? 0);
        $bmAset = (float) ($sp2b->belanja_modal_aset_tetap_lainnya ?? 0);
        $bmTanah = (float) ($sp2b->belanja_modal_tanah_bangunan ?? 0);
        $saldoAkhir = (float) ($sp2b->saldo_akhir ?? 0);

        $sumberDana = VariantConfig::title($variant);

        $text = array_merge($this->extractRecordCustomVariables($sp2b), $this->baseSchoolText($sekolah), [
            'nomor_sp2b' => (string) ($sp2b->nomor_sp2b ?: '-'),
            'tanggal_sp2b' => $tanggalFormatted,
            'jenis_periode' => $jenisPeriode === 'bulan' ? 'Bulanan' : 'Tahap',
            'tahap' => $tahap,
            'tahap_romawi' => $tahapRomawi,
            'bulan' => $bulanNum ? (string) $bulanNum : '-',
            'bulan_nama' => $bulanNama,
            'periode_text' => $periodeText,
            'tahun_anggaran' => $tahunAnggaran,
            'sumber_dana' => $sumberDana,
            'sumber_dana_upper' => strtoupper($sumberDana),

            'saldo_awal' => $this->formatNumber($saldoAwal),
            'saldo_awal_rupiah' => $this->formatRupiah($saldoAwal),
            'pendapatan' => $this->formatNumber($pendapatan),
            'pendapatan_rupiah' => $this->formatRupiah($pendapatan),
            'belanja' => $this->formatNumber($belanja),
            'belanja_rupiah' => $this->formatRupiah($belanja),
            'belanja_pegawai' => $this->formatNumber($belanjaPegawai),
            'belanja_pegawai_rupiah' => $this->formatRupiah($belanjaPegawai),
            'belanja_barang_jasa' => $this->formatNumber($belanjaBarangJasa),
            'belanja_barang_jasa_rupiah' => $this->formatRupiah($belanjaBarangJasa),
            'belanja_modal' => $this->formatNumber($belanjaModal),
            'belanja_modal_rupiah' => $this->formatRupiah($belanjaModal),
            'belanja_modal_peralatan_mesin' => $this->formatNumber($bmPeralatan),
            'belanja_modal_peralatan_mesin_rupiah' => $this->formatRupiah($bmPeralatan),
            'belanja_modal_aset_tetap_lainnya' => $this->formatNumber($bmAset),
            'belanja_modal_aset_tetap_lainnya_rupiah' => $this->formatRupiah($bmAset),
            'belanja_modal_tanah_bangunan' => $this->formatNumber($bmTanah),
            'belanja_modal_tanah_bangunan_rupiah' => $this->formatRupiah($bmTanah),
            'saldo_akhir' => $this->formatNumber($saldoAkhir),
            'saldo_akhir_rupiah' => $this->formatRupiah($saldoAkhir),

            'kepala_sekolah' => (string) ($penganggaran?->kepala_sekolah ?? '-'),
            'nip_kepala_sekolah' => (string) ($penganggaran?->nip_kepala_sekolah ?? '-'),
            'bendahara' => (string) ($penganggaran?->bendahara ?? '-'),
            'nip_bendahara' => (string) ($penganggaran?->nip_bendahara ?? '-'),
            'komite' => (string) ($penganggaran?->komite ?? '-'),
        ]);

        return [
            'text' => $text,
            'items' => [],
            'images' => $this->baseSchoolImages($sekolah),
            'kop_border' => $this->resolveKopBorder($sekolah),
        ];
    }

    /**
     * @return array{text: array<string, string>, items: array<int, array<string, string>>, images: array<string, ?string>, kop_border: string}
     */
    protected function buildLphVariables(Model $lph, string $variant): array
    {
        $penganggaran = $lph->penganggaran;
        $sekolah = $lph->sekolah ?? ($penganggaran?->sekolah_id ? SekolahProfile::find($penganggaran->sekolah_id) : null) ?? SekolahProfile::first();

        $semester = (string) ($lph->semester ?? '1');
        $semesterRomawi = $semester === '2' ? 'II' : 'I';
        $semesterText = $semester === '2' ? 'Semester II (Genap)' : 'Semester I (Ganjil)';

        $tanggalObj = $lph->tanggal_lph ? Carbon::parse($lph->tanggal_lph) : Carbon::now();
        $tanggalFormatted = $this->formatIndonesianDate($tanggalObj);

        $penAng = (float) ($lph->penerimaan_anggaran ?? 0);
        $penReal = (float) ($lph->penerimaan_realisasi ?? 0);
        $penSel = (float) ($lph->penerimaan_selisih ?? ($penAng - $penReal));

        $opAng = (float) ($lph->belanja_operasi_anggaran ?? 0);
        $opReal = (float) ($lph->belanja_operasi_realisasi ?? 0);
        $opSel = (float) ($lph->belanja_operasi_selisih ?? ($opAng - $opReal));

        $mpAng = (float) ($lph->belanja_modal_peralatan_anggaran ?? 0);
        $mpReal = (float) ($lph->belanja_modal_peralatan_realisasi ?? 0);
        $mpSel = (float) ($lph->belanja_modal_peralatan_selisih ?? ($mpAng - $mpReal));

        $maAng = (float) ($lph->belanja_modal_aset_anggaran ?? 0);
        $maReal = (float) ($lph->belanja_modal_aset_realisasi ?? 0);
        $maSel = (float) ($lph->belanja_modal_aset_selisih ?? ($maAng - $maReal));

        $totAng = $opAng + $mpAng + $maAng;
        $totReal = $opReal + $mpReal + $maReal;
        $totSel = $opSel + $mpSel + $maSel;

        $sumberDana = VariantConfig::title($variant);
        $tahunAnggaran = (string) ($penganggaran?->tahun_anggaran ?? '-');

        $text = array_merge($this->extractRecordCustomVariables($lph), $this->baseSchoolText($sekolah), [
            'semester' => $semester,
            'semester_romawi' => $semesterRomawi,
            'semester_text' => $semesterText,
            'tanggal_lph' => $tanggalFormatted,
            'tahun_anggaran' => $tahunAnggaran,
            'sumber_dana' => $sumberDana,
            'sumber_dana_upper' => strtoupper($sumberDana),

            'penerimaan_anggaran' => $this->formatNumber($penAng),
            'penerimaan_anggaran_rupiah' => $this->formatRupiah($penAng),
            'penerimaan_realisasi' => $this->formatNumber($penReal),
            'penerimaan_realisasi_rupiah' => $this->formatRupiah($penReal),
            'penerimaan_selisih' => $this->formatNumber($penSel),
            'penerimaan_selisih_rupiah' => $this->formatRupiah($penSel),

            'belanja_operasi_anggaran' => $this->formatNumber($opAng),
            'belanja_operasi_anggaran_rupiah' => $this->formatRupiah($opAng),
            'belanja_operasi_realisasi' => $this->formatNumber($opReal),
            'belanja_operasi_realisasi_rupiah' => $this->formatRupiah($opReal),
            'belanja_operasi_selisih' => $this->formatNumber($opSel),
            'belanja_operasi_selisih_rupiah' => $this->formatRupiah($opSel),

            'belanja_modal_peralatan_anggaran' => $this->formatNumber($mpAng),
            'belanja_modal_peralatan_anggaran_rupiah' => $this->formatRupiah($mpAng),
            'belanja_modal_peralatan_realisasi' => $this->formatNumber($mpReal),
            'belanja_modal_peralatan_realisasi_rupiah' => $this->formatRupiah($mpReal),
            'belanja_modal_peralatan_selisih' => $this->formatNumber($mpSel),
            'belanja_modal_peralatan_selisih_rupiah' => $this->formatRupiah($mpSel),

            'belanja_modal_aset_anggaran' => $this->formatNumber($maAng),
            'belanja_modal_aset_anggaran_rupiah' => $this->formatRupiah($maAng),
            'belanja_modal_aset_realisasi' => $this->formatNumber($maReal),
            'belanja_modal_aset_realisasi_rupiah' => $this->formatRupiah($maReal),
            'belanja_modal_aset_selisih' => $this->formatNumber($maSel),
            'belanja_modal_aset_selisih_rupiah' => $this->formatRupiah($maSel),

            'total_pengeluaran_anggaran' => $this->formatNumber($totAng),
            'total_pengeluaran_anggaran_rupiah' => $this->formatRupiah($totAng),
            'total_pengeluaran_realisasi' => $this->formatNumber($totReal),
            'total_pengeluaran_realisasi_rupiah' => $this->formatRupiah($totReal),
            'total_pengeluaran_selisih' => $this->formatNumber($totSel),
            'total_pengeluaran_selisih_rupiah' => $this->formatRupiah($totSel),

            'jumlah_angka' => $this->formatNumber($totReal),
            'jumlah_rupiah' => $this->formatRupiah($totReal),

            'kepala_sekolah' => (string) ($penganggaran?->kepala_sekolah ?? '-'),
            'nip_kepala_sekolah' => (string) ($penganggaran?->nip_kepala_sekolah ?? '-'),
            'bendahara' => (string) ($penganggaran?->bendahara ?? '-'),
            'nip_bendahara' => (string) ($penganggaran?->nip_bendahara ?? '-'),
            'komite' => (string) ($penganggaran?->komite ?? '-'),
        ]);

        // Rekap per rekening untuk tabel baris dinamis LPH (opsional jika template punya tabel item_*)
        $items = [];
        if ($penganggaran) {
            $bkuClass = VariantConfig::getModelClass('bku', $variant);
            $penganggaranFk = VariantConfig::penganggaranFk($variant);
            $tahunInt = (int) $penganggaran->tahun_anggaran;
            if ($bkuClass && $tahunInt > 0) {
                $startDate = $semester === '2' ? "{$tahunInt}-07-01" : "{$tahunInt}-01-01";
                $endDate = $semester === '2' ? "{$tahunInt}-12-31" : "{$tahunInt}-06-30";

                $bkuEntries = $bkuClass::where($penganggaranFk, $penganggaran->id)
                    ->whereDate('tanggal_transaksi', '>=', $startDate)
                    ->whereDate('tanggal_transaksi', '<=', $endDate)
                    ->whereNotNull('rekening_belanja_id')
                    ->with('rekeningBelanja')
                    ->get();

                $grouped = $bkuEntries->groupBy('rekening_belanja_id')->values();
                foreach ($grouped as $idx => $groupItems) {
                    $first = $groupItems->first();
                    $rekening = $first?->rekeningBelanja;
                    $sumRealisasi = (float) $groupItems->sum('total_transaksi_kotor');
                    $namaRek = (string) ($rekening?->rincian_objek ?? $rekening?->nama_rekening ?? '-');

                    $items[] = [
                        'item_no' => (string) ($idx + 1),
                        'item_kode_rekening' => (string) ($rekening?->kode_rekening ?? '-'),
                        'item_nama_rekening' => $namaRek,
                        'item_uraian' => (string) ($first?->uraian ?? $namaRek),
                        'item_realisasi' => $this->formatNumber($sumRealisasi),
                        'item_realisasi_rupiah' => $this->formatRupiah($sumRealisasi),
                    ];
                }
            }
        }

        if ($items === []) {
            $items[] = [
                'item_no' => '1',
                'item_kode_rekening' => '-',
                'item_nama_rekening' => 'Belum ada rincian realisasi',
                'item_uraian' => '-',
                'item_realisasi' => '0',
                'item_realisasi_rupiah' => 'Rp 0',
            ];
        }

        return [
            'text' => $text,
            'items' => $items,
            'images' => $this->baseSchoolImages($sekolah),
            'kop_border' => $this->resolveKopBorder($sekolah),
        ];
    }

    protected function formatIndonesianDate(Carbon $date): string
    {
        $bulanIndo = $this->formatBulanIndonesia($date->format('F'));

        return "{$date->format('d')} {$bulanIndo} {$date->format('Y')}";
    }

    // -------------------------------------------------------------------------
    // Sample .docx Generators (Laporan)
    // -------------------------------------------------------------------------

    protected function generateSpmthSampleDocx(): string
    {
        $phpWord = new PhpWord;
        $phpWord->setDefaultFontName('Calibri');
        $phpWord->setDefaultFontSize(10.5);

        $section = $phpWord->addSection([
            'marginTop' => 750,
            'marginBottom' => 750,
            'marginLeft' => 950,
            'marginRight' => 950,
        ]);

        $section->addText('${kop_surat}', ['size' => 9, 'color' => '64748B'], ['alignment' => Jc::CENTER, 'spaceAfter' => 120]);
        $section->addText('SURAT PERNYATAAN TELAH MENERIMA HIBAH (SPMTH)', ['bold' => true, 'size' => 12.5, 'underline' => 'single'], ['alignment' => Jc::CENTER, 'spaceAfter' => 40]);
        $section->addText('NOMOR : ${nomor_surat}', ['size' => 10.5], ['alignment' => Jc::CENTER, 'spaceAfter' => 180]);

        $section->addText('Menyatakan bahwa saya atas nama :', null, ['spaceAfter' => 60]);

        $infoTable = $section->addTable(['borderSize' => 0, 'borderColor' => 'FFFFFF', 'cellMargin' => 30, 'width' => 100 * 50, 'unit' => 'pct']);
        foreach ([
            ['Nama Sekolah', '${nama_sekolah}'],
            ['NPSN', '${npsn}'],
            ['Alamat', '${alamat_sekolah}'],
            ['Kecamatan', '${kecamatan}'],
            ['Kabupaten / Kota', '${kabupaten_kota}'],
            ['Provinsi', '${provinsi}'],
        ] as [$lbl, $val]) {
            $infoTable->addRow();
            $infoTable->addCell(2400)->addText($lbl);
            $infoTable->addCell(250)->addText(':');
            $infoTable->addCell(7350)->addText($val);
        }

        $section->addTextBreak(1);
        $section->addText(
            'Bertanggung jawab penuh atas segala penerimaan hibah berupa uang Dana ${sumber_dana} Tahun Anggaran ${tahun_anggaran} yang diterima langsung pada ${semester_text}, dengan rincian sebagai berikut:',
            null,
            ['alignment' => Jc::BOTH, 'spaceAfter' => 120]
        );

        $table = $section->addTable(['borderSize' => 6, 'borderColor' => '334155', 'cellMargin' => 60, 'width' => 100 * 50, 'unit' => 'pct']);
        $hdr = ['bold' => true, 'size' => 9.5];
        $hdrCell = ['bgColor' => 'F1F5F9', 'valign' => 'center'];

        $table->addRow();
        $table->addCell(1600, $hdrCell)->addText('Kode Rekening', $hdr, ['alignment' => Jc::CENTER]);
        $table->addCell(2100, $hdrCell)->addText('Pagu', $hdr, ['alignment' => Jc::CENTER]);
        $table->addCell(2100, $hdrCell)->addText('Realisasi s.d. Semester Lalu', $hdr, ['alignment' => Jc::CENTER]);
        $table->addCell(2100, $hdrCell)->addText('Realisasi Semester Ini', $hdr, ['alignment' => Jc::CENTER]);
        $table->addCell(2100, $hdrCell)->addText('Sisa', $hdr, ['alignment' => Jc::CENTER]);

        $table->addRow();
        $table->addCell(1600)->addText('4.3.4.1.1', null, ['alignment' => Jc::CENTER]);
        $table->addCell(2100)->addText('${pagu_rupiah}', null, ['alignment' => Jc::END]);
        $table->addCell(2100)->addText('${realisasi_lalu_rupiah}', null, ['alignment' => Jc::END]);
        $table->addCell(2100)->addText('${realisasi_ini_rupiah}', null, ['alignment' => Jc::END]);
        $table->addCell(2100)->addText('${sisa_rupiah}', null, ['alignment' => Jc::END]);

        $section->addTextBreak(1);
        $section->addText('Demikian Surat Pernyataan ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.', null, ['spaceAfter' => 240]);

        $this->appendSinglePrincipalSignature($section, '${kecamatan}, ${tanggal_spmth}', 'Kepala Sekolah');

        $tempDir = $this->ensureTempDir();
        $path = $tempDir.DIRECTORY_SEPARATOR.'contoh_template_spmth_'.uniqid('', true).'.docx';
        $phpWord->save($path, 'Word2007');

        return $path;
    }

    protected function generateSptjSampleDocx(): string
    {
        $phpWord = new PhpWord;
        $phpWord->setDefaultFontName('Calibri');
        $phpWord->setDefaultFontSize(10.5);

        $section = $phpWord->addSection([
            'marginTop' => 750,
            'marginBottom' => 750,
            'marginLeft' => 950,
            'marginRight' => 950,
        ]);

        $section->addText('${kop_surat}', ['size' => 9, 'color' => '64748B'], ['alignment' => Jc::CENTER, 'spaceAfter' => 120]);
        $section->addText('SURAT PERNYATAAN TANGGUNG JAWAB MUTLAK (SPTJ)', ['bold' => true, 'size' => 12.5, 'underline' => 'single'], ['alignment' => Jc::CENTER, 'spaceAfter' => 40]);
        $section->addText('Nomor : ${nomor_sptj}', ['size' => 10.5], ['alignment' => Jc::CENTER, 'spaceAfter' => 160]);

        $section->addText(
            'Saya yang bertanda tangan di bawah ini menyatakan bahwa bertanggung jawab secara formal dan material atas kebenaran realisasi penerimaan dan pengeluaran Dana ${sumber_dana} pada ${semester_text} Tahun Anggaran ${tahun_anggaran} dengan rincian sebagai berikut:',
            null,
            ['alignment' => Jc::BOTH, 'spaceAfter' => 120]
        );

        $infoTable = $section->addTable(['borderSize' => 0, 'borderColor' => 'FFFFFF', 'cellMargin' => 30, 'width' => 100 * 50, 'unit' => 'pct']);
        foreach ([
            ['NPSN', '${npsn}'],
            ['Nama Sekolah', '${nama_sekolah}'],
            ['Kegiatan Dana BOSP', '${sumber_dana}'],
        ] as [$lbl, $val]) {
            $infoTable->addRow();
            $infoTable->addCell(2800)->addText($lbl);
            $infoTable->addCell(250)->addText(':');
            $infoTable->addCell(6950)->addText($val);
        }

        $section->addTextBreak(1);

        $finTable = $section->addTable(['borderSize' => 6, 'borderColor' => 'CBD5E1', 'cellMargin' => 55, 'width' => 100 * 50, 'unit' => 'pct']);
        foreach ([
            ['A. Penerimaan Tahap I', '${tahap_satu_rupiah}', false],
            ['   Penerimaan Tahap II', '${tahap_dua_rupiah}', false],
            ['   Jumlah Penerimaan', '${jumlah_penerimaan_rupiah}', true],
            ['B. Belanja Operasi (Pegawai + Barang/Jasa)', '${belanja_operasi_rupiah}', false],
            ['   Belanja Modal', '${belanja_modal_rupiah}', false],
            ['   Jumlah Pengeluaran', '${jumlah_pengeluaran_rupiah}', true],
            ['C. Sisa Kas Tunai', '${sisa_kas_tunai_rupiah}', false],
            ['   Sisa Dana di Bank', '${sisa_dana_di_bank_rupiah}', false],
            ['   Total Sisa Dana', '${total_sisa_dana_rupiah}', true],
        ] as [$lbl, $val, $bold]) {
            $finTable->addRow();
            $style = $bold ? ['bold' => true] : null;
            $finTable->addCell(6800)->addText($lbl, $style);
            $finTable->addCell(3200)->addText($val, $style, ['alignment' => Jc::END]);
        }

        $section->addTextBreak(1);
        $section->addText('Demikian Surat Pernyataan Tanggung Jawab Mutlak ini dibuat dengan sebenarnya.', null, ['spaceAfter' => 220]);

        $this->appendSinglePrincipalSignature($section, '${kecamatan}, ${tanggal_sptj}', 'Kepala Sekolah');

        $tempDir = $this->ensureTempDir();
        $path = $tempDir.DIRECTORY_SEPARATOR.'contoh_template_sptj_'.uniqid('', true).'.docx';
        $phpWord->save($path, 'Word2007');

        return $path;
    }

    protected function generateSp2bSampleDocx(): string
    {
        $phpWord = new PhpWord;
        $phpWord->setDefaultFontName('Calibri');
        $phpWord->setDefaultFontSize(10.5);

        $section = $phpWord->addSection([
            'marginTop' => 750,
            'marginBottom' => 750,
            'marginLeft' => 950,
            'marginRight' => 950,
        ]);

        $section->addText('${kop_surat}', ['size' => 9, 'color' => '64748B'], ['alignment' => Jc::CENTER, 'spaceAfter' => 120]);
        $section->addText('SURAT PERMINTAAN PENGESAHAN BELANJA (SP2B)', ['bold' => true, 'size' => 12.5, 'underline' => 'single'], ['alignment' => Jc::CENTER, 'spaceAfter' => 40]);
        $section->addText('Nomor : ${nomor_sp2b}', ['size' => 10.5], ['alignment' => Jc::CENTER, 'spaceAfter' => 40]);
        $section->addText('Periode : ${periode_text}', ['bold' => true, 'size' => 10], ['alignment' => Jc::CENTER, 'spaceAfter' => 160]);

        $section->addText(
            'Memohon pengesahan dan pembukuan Penerimaan dan Belanja Dana ${sumber_dana} pada ${nama_sekolah} (NPSN: ${npsn}) sejumlah:',
            null,
            ['alignment' => Jc::BOTH, 'spaceAfter' => 120]
        );

        $table = $section->addTable(['borderSize' => 6, 'borderColor' => '334155', 'cellMargin' => 55, 'width' => 100 * 50, 'unit' => 'pct']);
        foreach ([
            ['1. Saldo Awal', '${saldo_awal_rupiah}', false],
            ['2. Pendapatan', '${pendapatan_rupiah}', false],
            ['3. Jumlah Belanja', '${belanja_rupiah}', true],
            ['   a. Belanja Pegawai', '${belanja_pegawai_rupiah}', false],
            ['   b. Belanja Barang dan Jasa', '${belanja_barang_jasa_rupiah}', false],
            ['   c. Belanja Modal', '${belanja_modal_rupiah}', false],
            ['      - Peralatan dan Mesin', '${belanja_modal_peralatan_mesin_rupiah}', false],
            ['      - Aset Tetap Lainnya', '${belanja_modal_aset_tetap_lainnya_rupiah}', false],
            ['      - Tanah dan Bangunan', '${belanja_modal_tanah_bangunan_rupiah}', false],
            ['4. Saldo Akhir', '${saldo_akhir_rupiah}', true],
        ] as [$lbl, $val, $bold]) {
            $table->addRow();
            $style = $bold ? ['bold' => true] : null;
            $table->addCell(6800)->addText($lbl, $style);
            $table->addCell(3200)->addText($val, $style, ['alignment' => Jc::END]);
        }

        $section->addTextBreak(1);
        $this->appendSinglePrincipalSignature($section, '${kabupaten_kota}, ${tanggal_sp2b}', 'Kepala Sekolah');

        $tempDir = $this->ensureTempDir();
        $path = $tempDir.DIRECTORY_SEPARATOR.'contoh_template_sp2b_'.uniqid('', true).'.docx';
        $phpWord->save($path, 'Word2007');

        return $path;
    }

    protected function generateLphSampleDocx(): string
    {
        $phpWord = new PhpWord;
        $phpWord->setDefaultFontName('Calibri');
        $phpWord->setDefaultFontSize(10);

        $section = $phpWord->addSection([
            'marginTop' => 750,
            'marginBottom' => 750,
            'marginLeft' => 900,
            'marginRight' => 900,
        ]);

        $section->addText('${kop_surat}', ['size' => 9, 'color' => '64748B'], ['alignment' => Jc::CENTER, 'spaceAfter' => 100]);
        $section->addText('LAPORAN PENGGUNAAN HIBAH DANA ${sumber_dana_upper}', ['bold' => true, 'size' => 12], ['alignment' => Jc::CENTER, 'spaceAfter' => 30]);
        $section->addText('${semester_text} Tahun Anggaran ${tahun_anggaran}', ['size' => 10], ['alignment' => Jc::CENTER, 'spaceAfter' => 140]);

        $meta = $section->addTable(['borderSize' => 0, 'borderColor' => 'FFFFFF', 'cellMargin' => 25, 'width' => 100 * 50, 'unit' => 'pct']);
        foreach ([
            ['NPSN', '${npsn}'],
            ['Nama Sekolah', '${nama_sekolah}'],
            ['Kecamatan / Kab.', '${kecamatan}, ${kabupaten_kota}'],
            ['Provinsi', '${provinsi}'],
        ] as [$lbl, $val]) {
            $meta->addRow();
            $meta->addCell(2400)->addText($lbl, ['bold' => true]);
            $meta->addCell(250)->addText(':');
            $meta->addCell(7350)->addText($val);
        }

        $section->addTextBreak(1);

        $table = $section->addTable(['borderSize' => 6, 'borderColor' => '334155', 'cellMargin' => 50, 'width' => 100 * 50, 'unit' => 'pct']);
        $hdr = ['bold' => true, 'size' => 9.5];
        $hdrCell = ['bgColor' => 'F1F5F9', 'valign' => 'center'];

        $table->addRow();
        $table->addCell(4000, $hdrCell)->addText('Uraian', $hdr, ['alignment' => Jc::CENTER]);
        $table->addCell(2000, $hdrCell)->addText('Anggaran (Rp)', $hdr, ['alignment' => Jc::CENTER]);
        $table->addCell(2000, $hdrCell)->addText('Realisasi (Rp)', $hdr, ['alignment' => Jc::CENTER]);
        $table->addCell(2000, $hdrCell)->addText('Selisih (Rp)', $hdr, ['alignment' => Jc::CENTER]);

        foreach ([
            ['Penerimaan (${sumber_dana})', '${penerimaan_anggaran}', '${penerimaan_realisasi}', '${penerimaan_selisih}', true],
            ['Belanja Operasional', '${belanja_operasi_anggaran}', '${belanja_operasi_realisasi}', '${belanja_operasi_selisih}', false],
            ['Belanja Modal Peralatan & Mesin', '${belanja_modal_peralatan_anggaran}', '${belanja_modal_peralatan_realisasi}', '${belanja_modal_peralatan_selisih}', false],
            ['Belanja Modal Aset Tetap Lainnya', '${belanja_modal_aset_anggaran}', '${belanja_modal_aset_realisasi}', '${belanja_modal_aset_selisih}', false],
            ['Jumlah Pengeluaran', '${total_pengeluaran_anggaran}', '${total_pengeluaran_realisasi}', '${total_pengeluaran_selisih}', true],
        ] as [$uraian, $ang, $real, $sel, $bold]) {
            $table->addRow();
            $st = $bold ? ['bold' => true] : null;
            $table->addCell(4000)->addText($uraian, $st);
            $table->addCell(2000)->addText($ang, $st, ['alignment' => Jc::END]);
            $table->addCell(2000)->addText($real, $st, ['alignment' => Jc::END]);
            $table->addCell(2000)->addText($sel, $st, ['alignment' => Jc::END]);
        }

        $section->addTextBreak(1);
        $this->appendSinglePrincipalSignature($section, '${kecamatan}, ${tanggal_lph}', 'Kepala Sekolah');

        $tempDir = $this->ensureTempDir();
        $path = $tempDir.DIRECTORY_SEPARATOR.'contoh_template_lph_'.uniqid('', true).'.docx';
        $phpWord->save($path, 'Word2007');

        return $path;
    }

    /**
     * Helper blok tanda tangan Kepala Sekolah di kanan bawah starter template Laporan.
     *
     * @param  \PhpOffice\PhpWord\Element\Section  $section
     */
    protected function appendSinglePrincipalSignature($section, string $dateLine, string $roleTitle): void
    {
        $sigTable = $section->addTable(['borderSize' => 0, 'borderColor' => 'FFFFFF', 'width' => 100 * 50, 'unit' => 'pct']);
        $center = ['alignment' => Jc::CENTER, 'spaceAfter' => 20];
        $sigTable->addRow();
        $sigTable->addCell(5500)->addText('');
        $right = $sigTable->addCell(4500);
        $right->addText($dateLine, null, $center);
        $right->addText($roleTitle, ['bold' => true], $center);
        $right->addTextBreak(3);
        $right->addText('${kepala_sekolah}', ['bold' => true, 'underline' => 'single'], $center);
        $right->addText('NIP. ${nip_kepala_sekolah}', ['size' => 9], $center);
    }
}
