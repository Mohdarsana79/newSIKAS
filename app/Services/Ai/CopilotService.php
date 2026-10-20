<?php

namespace App\Services\Ai;

use App\Config\VariantConfig;
use App\Models\SekolahProfile;
use App\Models\User;
use App\Services\BukuKasService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CopilotService
{
    protected DeepSeekService $deepSeekService;

    protected BukuKasService $bukuKasService;

    public function __construct(DeepSeekService $deepSeekService, BukuKasService $bukuKasService)
    {
        $this->deepSeekService = $deepSeekService;
        $this->bukuKasService = $bukuKasService;
    }

    /**
     * Definisi tools OpenAI-compatible untuk DeepSeek-V3
     */
    public function getAvailableTools(): array
    {
        return [
            [
                'type' => 'function',
                'function' => [
                    'name' => 'get_budget_pagu_summary',
                    'description' => 'Mengambil ringkasan data resmi Pagu Anggaran BOSP tahun berjalan (Total penetapan anggaran pendapatan sekolah, rincian pagu Tahap 1 & Tahap 2, dan total rencana belanja RKAS per kelompok belanja). Panggil tool ini saat pengguna bertanya tentang pagu anggaran sekolah, total dana BOSP, atau alokasi penetapan pagu.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'tahun' => [
                                'type' => 'integer',
                                'description' => 'Tahun anggaran data pagu yang diminta (contoh: 2025, 2026). Opsional, default adalah tahun aktif saat ini.',
                            ],
                        ],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'get_bku_monthly_realization',
                    'description' => 'Mengambil data resmi pembukuan kas BKU (Buku Kas Umum) pada bulan tertentu dalam tahun anggaran aktif (total belanja riil yang dibukukan di BKU, total belanja kumulatif s.d. bulan tersebut, dan rincian kuitansi belanja BKU lengkap dengan tanggal transaksi, nomor nota/bukti, nama rekanan/toko, kode/nama rekening belanja, dan nominal kuitansi). Panggil tool ini saat pengguna bertanya tentang realisasi belanja BKU, realisasi kas bulanan, pengeluaran kas, atau daftar kuitansi yang dibayarkan di bulan tertentu.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'bulan' => [
                                'type' => 'string',
                                'enum' => [
                                    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                                    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
                                ],
                                'description' => 'Nama bulan pembukuan BKU yang diminta (Januari sampai Desember).',
                            ],
                            'tahun' => [
                                'type' => 'integer',
                                'description' => 'Tahun anggaran pembukuan BKU (contoh: 2025, 2026). Opsional, default adalah tahun aktif saat ini.',
                            ],
                        ],
                        'required' => ['bulan'],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'get_bkp_bank_monthly',
                    'description' => 'Mengambil data resmi pembukuan Buku Kas Pembantu Bank (BKP Bank) pada bulan tertentu dalam tahun anggaran aktif (saldo awal kas di bank, total penerimaan transfer dana BOSP, pendapatan bunga bank, penarikan tunai ke kas bendahara, pajak bunga bank, belanja transfer non-tunai/CMS, setoran STS kas daerah, potongan dan setor pajak non-tunai, serta saldo akhir kas di bank, beserta rincian mutasi rekening per tanggal). Panggil tool ini saat pengguna bertanya tentang Buku Kas Bank, Buku Pembantu Bank, BKP Bank, saldo rekening bank, mutasi rekening bank, atau transaksi bank sekolah.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'bulan' => [
                                'type' => 'string',
                                'enum' => [
                                    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                                    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
                                ],
                                'description' => 'Nama bulan pembukuan BKP Bank yang diminta (Januari sampai Desember).',
                            ],
                            'tahun' => [
                                'type' => 'integer',
                                'description' => 'Tahun anggaran pembukuan BKP Bank (contoh: 2025, 2026). Opsional, default adalah tahun aktif saat ini.',
                            ],
                        ],
                        'required' => ['bulan'],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'get_bkp_tunai_monthly',
                    'description' => 'Mengambil data resmi pembukuan Buku Kas Pembantu Tunai (BKP Tunai) pada bulan tertentu dalam tahun anggaran aktif (saldo awal kas tunai di brankas bendahara, penarikan uang tunai dari bank, potongan pajak belanja tunai yang dipungut, belanja tunai kuitansi BKU, setoran tunai kembali ke bank, penyetoran pajak tunai NTPN, serta saldo akhir uang tunai fisik bendahara, beserta rincian mutasi transaksi tunai kronologis). Panggil tool ini saat pengguna bertanya tentang Buku Kas Tunai, BKP Tunai, uang tunai di brankas, kas di bendahara, atau transaksi belanja tunai sekolah.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'bulan' => [
                                'type' => 'string',
                                'enum' => [
                                    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                                    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
                                ],
                                'description' => 'Nama bulan pembukuan BKP Tunai yang diminta (Januari sampai Desember).',
                            ],
                            'tahun' => [
                                'type' => 'integer',
                                'description' => 'Tahun anggaran pembukuan BKP Tunai (contoh: 2025, 2026). Opsional, default adalah tahun aktif saat ini.',
                            ],
                        ],
                        'required' => ['bulan'],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'get_bkp_pajak_monthly',
                    'description' => 'Mengambil data resmi pembukuan Buku Kas Pembantu Pajak (BKP Pajak) pada bulan tertentu (saldo awal kas pajak yang belum disetor, pemotongan/penerimaan potongan pajak belanja kuitansi BKU, penyetoran pajak ke kas negara/daerah dengan NTPN, saldo akhir kas pajak belum disetor, breakdown per jenis pajak PPN/PPh21/PPh22/PPh23/PB1, serta daftar transaksi belanja yang pajaknya belum disetorkan). Panggil tool ini saat pengguna bertanya tentang Buku Kas Pajak, BKP Pajak, setoran pajak, NTPN, pemotongan pajak belanja, atau saldo kas pajak.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'bulan' => [
                                'type' => 'string',
                                'enum' => [
                                    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                                    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
                                ],
                                'description' => 'Nama bulan pembukuan BKP Pajak yang diminta (Januari sampai Desember).',
                            ],
                            'tahun' => [
                                'type' => 'integer',
                                'description' => 'Tahun anggaran pembukuan BKP Pajak (contoh: 2025, 2026). Opsional, default adalah tahun aktif saat ini.',
                            ],
                        ],
                        'required' => ['bulan'],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'get_bkp_rob_monthly',
                    'description' => 'Mengambil data resmi pembukuan Buku Pembantu Rincian Objek Belanja (BKP ROB) pada bulan tertentu dalam tahun anggaran aktif. Menyajikan saldo anggaran belanja tersedia, rincian serapan belanja yang dikelompokkan per Kode dan Nama Rekening Belanja (seperti ATK, Honorarium, Pemeliharaan, Internet, dll), daftar kuitansi transaksi per objek belanja beserta running total dan sisa anggaran kas, serta perbandingan terhadap Pagu RKAS akun tersebut. Panggil tool ini saat pengguna bertanya tentang Buku ROB, Rincian Objek Belanja, realisasi belanja per rekening, atau serapan akun belanja tertentu.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'bulan' => [
                                'type' => 'string',
                                'enum' => [
                                    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                                    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
                                ],
                                'description' => 'Nama bulan pembukuan ROB yang diminta (Januari sampai Desember).',
                            ],
                            'tahun' => [
                                'type' => 'integer',
                                'description' => 'Tahun anggaran pembukuan ROB (contoh: 2025, 2026). Opsional, default adalah tahun aktif saat ini.',
                            ],
                            'rekening' => [
                                'type' => 'string',
                                'description' => 'Kata kunci nama rekening atau kode rekening belanja (contoh: "ATK", "Honorarium", "5.1.02..."). Opsional, jika dikosongkan akan menampilkan seluruh objek belanja.',
                            ],
                        ],
                        'required' => ['bulan'],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'get_bkp_registrasi_penutupan_kas_monthly',
                    'description' => 'Mengambil data resmi Register Penutupan Kas (Formulir BOS-K7B) pada bulan tertentu dalam tahun anggaran aktif. Menyajikan status tutup buku BKU, tanggal penutupan kas, ringkasan penerimaan (D), pengeluaran (K), saldo buku (A = D - K), saldo kas tunai (B), rincian pecahan fisik uang kertas dan uang logam, saldo rekening bank (3), total kas fisik (1+2+3), rekonsiliasi selisih kas, dan data pejabat pemeriksa (Kepala Sekolah & Bendahara). Panggil tool ini saat pengguna bertanya tentang Register Penutupan Kas, Formulir K7B, penutupan kas bulanan, atau posisi fisik pecahan uang brankas dan bank.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'bulan' => [
                                'type' => 'string',
                                'enum' => [
                                    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                                    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
                                ],
                                'description' => 'Nama bulan penutupan kas yang diminta (Januari sampai Desember).',
                            ],
                            'tahun' => [
                                'type' => 'integer',
                                'description' => 'Tahun anggaran penutupan kas (contoh: 2025, 2026). Opsional, default adalah tahun aktif saat ini.',
                            ],
                        ],
                        'required' => ['bulan'],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'get_berita_acara_penutupan_kas_monthly',
                    'description' => 'Mengambil data resmi Berita Acara Pemeriksaan Kas bulanan dalam tahun anggaran aktif. Menyajikan data legalitas SK Kepala Sekolah & SK Bendahara (nomor & tanggal SK), hari & tanggal pemeriksaan kas, rincian fisik uang kertas & logam di hadapan bendahara, saldo rekening bank, total kas dihitung, saldo uang menurut Buku Kas Umum (BKU), serta rekonsiliasi kesesuaian kas. Panggil tool ini saat pengguna bertanya tentang Berita Acara Penutupan Kas, Berita Acara Pemeriksaan Kas, pemeriksaan kas bendahara, atau legalitas penutupan kas bulanan.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'bulan' => [
                                'type' => 'string',
                                'enum' => [
                                    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                                    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
                                ],
                                'description' => 'Nama bulan pemeriksaan/penutupan kas yang diminta (Januari sampai Desember).',
                            ],
                            'tahun' => [
                                'type' => 'integer',
                                'description' => 'Tahun anggaran penutupan kas (contoh: 2025, 2026). Opsional, default adalah tahun aktif saat ini.',
                            ],
                        ],
                        'required' => ['bulan'],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'get_rekapitulasi_realisasi_bosp',
                    'description' => 'Mengambil data resmi Rekapitulasi Realisasi Penggunaan Dana BOSP (Formulir BOS K-7A) pada tahun anggaran aktif berdasarkan periode tertentu (Tahunan, Tahap 1, Tahap 2, atau nama bulan Januari s/d Desember). Menyajikan ringkasan arus kas (saldo sebelumnya, penerimaan, penggunaan, sisa saldo), rincian serapan per 8 Standar Nasional Pendidikan, serta serapan per 11 Komponen Penggunaan Dana BOS. Panggil tool ini saat pengguna bertanya tentang rekapitulasi realisasi penggunaan dana BOSP, rekapitulasi 8 standar, evaluasi komponen BOS, serapan anggaran tahap 1/2, sisa dana periode ini, atau formulir K-7A.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'periode' => [
                                'type' => 'string',
                                'description' => 'Periode rekapitulasi realisasi yang diminta: "Tahunan", "Tahap 1", "Tahap 2", atau nama bulan spesifik (misal: "Januari", "Maret", "Juli"). Default adalah "Tahunan".',
                            ],
                            'tahun' => [
                                'type' => 'integer',
                                'description' => 'Tahun anggaran realisasi (contoh: 2025, 2026). Opsional, default adalah tahun aktif saat ini.',
                            ],
                        ],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'get_rekapitulasi_realisasi_per_rekening',
                    'description' => 'Mengambil data resmi Rekapitulasi Realisasi Belanja Per Rekening Belanja (Format LK 2) pada tahun anggaran aktif. Menyajikan perincian realisasi belanja operasi (pakai habis, barang & jasa) dan belanja modal (peralatan & mesin, aset tetap lainnya) beserta rasio persentasenya. Panggil tool ini saat pengguna bertanya tentang rekapitulasi belanja per rekening, rekap belanja modal vs operasi, realisasi belanja barang pakai habis, atau format LK 2.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'periode' => [
                                'type' => 'string',
                                'enum' => ['Tahunan', 'Tahap 1', 'Tahap 2'],
                                'description' => 'Fase periode laporan: "Tahunan", "Tahap 1" (Jan–Jun), atau "Tahap 2" (Jul–Des). Default adalah "Tahunan".',
                            ],
                            'tahun' => [
                                'type' => 'integer',
                                'description' => 'Tahun anggaran realisasi (contoh: 2025, 2026). Opsional, default adalah tahun aktif saat ini.',
                            ],
                        ],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'get_buku_pembantu_bhp',
                    'description' => 'Mengambil data resmi Buku Pembantu Barang Habis Pakai (BHP) pada tahun anggaran aktif berdasarkan periode tertentu (Tahunan, Tahap 1, Tahap 2, atau nama bulan Januari s/d Desember). Menyajikan rincian barang habis pakai (ATK, kertas, materai, bahan cetak/penggandaan, kebersihan, konsumsi) lengkap dengan tanggal, nomor bukti, volume, satuan, harga satuan, dan total realisasi. Panggil tool ini saat pengguna bertanya tentang laporan BHP, belanja barang habis pakai, daftar pembelian ATK/kertas/materai, atau buku pembantu persediaan barang habis pakai.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'periode' => [
                                'type' => 'string',
                                'description' => 'Periode laporan BHP yang diminta: "Tahunan", "Tahap 1", "Tahap 2", atau nama bulan tertentu (misal: "Januari", "Maret", "Juli"). Default adalah "Tahunan".',
                            ],
                            'tahun' => [
                                'type' => 'integer',
                                'description' => 'Tahun anggaran pembukuan (contoh: 2025, 2026). Opsional, default adalah tahun aktif saat ini.',
                            ],
                        ],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'get_buku_pembantu_bhm',
                    'description' => 'Mengambil data resmi Buku Pembantu Barang Modal / Aset (BHM) pada tahun anggaran aktif berdasarkan periode tertentu (Tahunan, Tahap 1, Tahap 2, atau nama bulan tertentu). Menyajikan rincian barang modal atau aset tetap sekolah (peralatan, mesin, buku teks aset perpustakaan) lengkap dengan tanggal, nomor bukti, volume, satuan, harga satuan, total belanja modal, serta kategori rekening belanja (5.2.02 peralatan & mesin vs 5.2.05 aset tetap lainnya). Panggil tool ini saat pengguna bertanya tentang laporan BHM, belanja modal aset, pengadaan peralatan/mesin, buku pembantu barang modal, atau inventaris aset BOSP.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'periode' => [
                                'type' => 'string',
                                'description' => 'Periode laporan BHM yang diminta: "Tahunan", "Tahap 1", "Tahap 2", atau nama bulan tertentu (misal: "Januari", "Maret", "Juli"). Default adalah "Tahunan".',
                            ],
                            'tahun' => [
                                'type' => 'integer',
                                'description' => 'Tahun anggaran pembukuan (contoh: 2025, 2026). Opsional, default adalah tahun aktif saat ini.',
                            ],
                        ],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'search_rkas_activity',
                    'description' => 'Mencari rincian kegiatan dan akun belanja pada dokumen RKAS tahun anggaran aktif berdasarkan kata kunci uraian/kegiatan dan/atau filter alokasi bulan penganggaran (Januari s/d Desember). Jika terdapat RKAS Perubahan, kegiatan Tahap 2 (Juli–Desember) diambil otomatis dari RKAS Perubahan.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'query' => [
                                'type' => 'string',
                                'description' => 'Kata kunci nama kegiatan, jenis belanja, atau uraian barang (misal: ATK, asesmen, konsumsi, pemeliharaan). Opsional jika bulan diisi.',
                            ],
                            'bulan' => [
                                'type' => 'string',
                                'enum' => [
                                    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                                    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
                                ],
                                'description' => 'Nama bulan penganggaran RKAS (Januari sampai Desember).',
                            ],
                            'tahun' => [
                                'type' => 'integer',
                                'description' => 'Tahun anggaran RKAS yang dicari (contoh: 2025, 2026). Opsional, default adalah tahun aktif saat ini.',
                            ],
                        ],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'get_rkas_perubahan_summary',
                    'description' => 'Mengambil ringkasan eksekutif dokumen perencanaan RKAS Perubahan pada tahun anggaran aktif. Menyajikan status ketersediaan dokumen perubahan, perbandingan alokasi pagu total & tahapan (Tahap 1 vs Tahap 2: Murni vs Perubahan vs Selisih), pergeseran belanja operasi vs belanja modal, indikator kepatuhan regulasi BOSP (belanja buku min 10%, honor max 20%/40%, pemeliharaan sarpras max 20%), statistik jumlah item yang bergeser, serta histori log rekaman perubahan terbaru. Panggil tool ini saat pengguna bertanya tentang ringkasan RKAS Perubahan, pergeseran anggaran tahun ini, evaluasi pagu perubahan, atau perbandingan umum RKAS Murni vs Perubahan.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'tahun' => [
                                'type' => 'integer',
                                'description' => 'Tahun anggaran RKAS Perubahan (contoh: 2025, 2026). Opsional, default adalah tahun aktif saat ini.',
                            ],
                        ],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'get_rkas_perubahan_activities',
                    'description' => 'Mengambil rincian komparasi kegiatan antar dokumen RKAS Murni dan RKAS Perubahan pada tahun anggaran aktif. Menyajikan perbandingan volume, satuan, harga satuan, total alokasi murni vs perubahan, selisih anggaran, dan status pergeseran per kegiatan. Mendukung filter bulan, tahap, filter jenis perubahan (hanya item yang berubah, bertambah, berkurang, item baru, atau dihapus), serta pencarian kata kunci kegiatan. Panggil tool ini saat pengguna bertanya tentang kegiatan yang berubah di RKAS Perubahan, item belanja apa saja yang ditambah/dikurangi, atau rincian kegiatan RKAS Perubahan pada bulan tertentu.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'tahun' => [
                                'type' => 'integer',
                                'description' => 'Tahun anggaran RKAS Perubahan (contoh: 2025, 2026). Opsional, default adalah tahun aktif saat ini.',
                            ],
                            'bulan' => [
                                'type' => 'string',
                                'description' => 'Filter nama bulan alokasi (misal: "September", "November"). Opsional.',
                            ],
                            'tahap' => [
                                'type' => 'string',
                                'enum' => ['Tahap 1', 'Tahap 2'],
                                'description' => 'Filter tahapan anggaran ("Tahap 1" untuk Januari–Juni, "Tahap 2" untuk Juli–Desember). Opsional.',
                            ],
                            'filter_perubahan' => [
                                'type' => 'string',
                                'enum' => ['berubah', 'semua', 'bertambah', 'berkurang', 'baru', 'dihapus'],
                                'description' => 'Kategori filter pergeseran: "berubah" (default: hanya item yang mengalami perubahan), "semua" (seluruh item termasuk yang tetap), "bertambah", "berkurang", "baru", atau "dihapus".',
                            ],
                            'query' => [
                                'type' => 'string',
                                'description' => 'Kata kunci nama kegiatan, rekening belanja, atau uraian barang (contoh: "buku", "spidol", "sarpras"). Opsional.',
                            ],
                        ],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'get_rka_rekap_anggaran',
                    'description' => 'Mendapatkan rekapitulasi anggaran resmi (Formulir RKA Rekap) tahunan untuk RKAS Awal, RKAS Perubahan, atau Komparasi Murni vs Perubahan. Menyajikan Bagian A (Penerimaan), Bagian B (Hierarki Akun Belanja 5/5.1/5.2), dan Bagian C (Rencana Anggaran per Tahap 1 & 2). Panggil tool ini saat pengguna bertanya tentang RKA Rekap, Rekapitulasi Anggaran, rekap akun belanja, atau perbandingan rencana per tahap.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'tahun' => [
                                'type' => 'integer',
                                'description' => 'Tahun anggaran RKAS (contoh: 2025, 2026). Opsional, default adalah tahun aktif saat ini.',
                            ],
                            'tipe_dokumen' => [
                                'type' => 'string',
                                'enum' => ['komparasi', 'murni', 'perubahan'],
                                'description' => 'Pilihan jenis dokumen: "komparasi" (default jika ada perubahan aktif), "murni" (RKAS Awal saja), atau "perubahan" (RKAS Perubahan saja).',
                            ],
                        ],
                        'required' => ['tahun'],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'get_lembar_kerja_221',
                    'description' => 'Mengambil data resmi formulir Lembar Kerja 221 (RKA SKPD 2.2.1) untuk tahun anggaran aktif. Menyajikan hierarki rekening belanja berjenjang (5, 5.1, 5.1.02, 5.2, dst.) yang diselingi dengan rincian item belanja (volume, satuan, harga satuan, subtotal). Mendukung filter kode rekening (misal hanya belanja barang atau modal) dan tipe dokumen (aktif/murni/perubahan). Panggil tool ini saat pengguna bertanya tentang Lembar Kerja 221, Formulir 221, rincian kertas kerja belanja, atau daftar rincian barang/jasa menurut rekening.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'tahun' => [
                                'type' => 'integer',
                                'description' => 'Tahun anggaran RKAS (contoh: 2025, 2026). Opsional, default adalah tahun aktif saat ini.',
                            ],
                            'tipe_dokumen' => [
                                'type' => 'string',
                                'enum' => ['aktif', 'murni', 'perubahan'],
                                'description' => 'Pilihan jenis dokumen: "aktif" (default), "murni" (RKAS Awal), atau "perubahan" (RKAS Perubahan).',
                            ],
                            'kode_rekening' => [
                                'type' => 'string',
                                'description' => 'Filter kode rekening tertentu (contoh: "5.1.02.01" untuk Belanja Barang, "5.2" untuk Belanja Modal). Opsional.',
                            ],
                            'limit' => [
                                'type' => 'integer',
                                'description' => 'Maksimal jumlah baris data yang ditampilkan (default: 50). Opsional.',
                            ],
                        ],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'get_rincian_pencairan',
                    'description' => 'Mengambil daftar rincian pencairan dana BOSP (Formulir Rincian Pencairan / RP) per tahap (Tahap 1 / Tahap 2) dan per bulan (Januari s.d. Desember) pada tahun anggaran aktif. Menyajikan total anggaran bruto, potongan pajak (PPN, PPh 21, PPh 23), jumlah neto yang diterima, serta rincian kegiatan lengkap dengan nama penerima, jabatan, nomor rekening, dan nama bank. Panggil tool ini saat pengguna bertanya tentang Rincian Pencairan, daftar pencairan tahap 1 atau tahap 2, pencairan dana bulan tertentu, penerima dana, atau potongan pajak pencairan.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'tahun' => [
                                'type' => 'integer',
                                'description' => 'Tahun anggaran RKAS (contoh: 2025, 2026). Opsional, default adalah tahun aktif saat ini.',
                            ],
                            'tahap' => [
                                'type' => 'integer',
                                'enum' => [1, 2],
                                'description' => 'Filter tahapan pencairan (1 untuk Tahap 1, 2 untuk Tahap 2). Opsional.',
                            ],
                            'bulan' => [
                                'type' => 'string',
                                'description' => 'Filter nama bulan pencairan (misal: "Maret", "September", atau "Semua"). Default "Semua".',
                            ],
                            'tipe_dokumen' => [
                                'type' => 'string',
                                'enum' => ['aktif', 'murni', 'perubahan'],
                                'description' => 'Pilihan jenis dokumen: "aktif" (default), "murni", atau "perubahan".',
                            ],
                        ],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'get_alur_kas',
                    'description' => 'Mengambil data Alur Kas BOSP penggunaan dana 12 bulan (Januari s.d. Desember) terbagi Tahap I dan Tahap II. Menyajikan alokasi penerimaan per tahap (50%–50%), sebaran belanja bulanan per program/kegiatan, total belanja tiap bulan, dan pergerakan saldo kas kumulatif bulanan (saldo awal, penerimaan, belanja, saldo akhir). Panggil tool ini saat pengguna bertanya tentang Alur Kas, pergerakan kas bulanan, jadwal kas keluar masuk, saldo kas per bulan, atau sebaran 12 bulan anggaran.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'tahun' => [
                                'type' => 'integer',
                                'description' => 'Tahun anggaran RKAS (contoh: 2025, 2026). Opsional, default adalah tahun aktif saat ini.',
                            ],
                            'tahap' => [
                                'type' => 'integer',
                                'enum' => [1, 2],
                                'description' => 'Filter tahapan alur kas (1 untuk Januari–Juni, 2 untuk Juli–Desember). Opsional.',
                            ],
                            'tipe_dokumen' => [
                                'type' => 'string',
                                'enum' => ['aktif', 'murni', 'perubahan'],
                                'description' => 'Pilihan jenis dokumen: "aktif" (default), "murni", atau "perubahan".',
                            ],
                        ],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'calculate_tax_recommendation',
                    'description' => 'Menghitung rekomendasi pemotongan pajak resmi (PPN 11%, PPh 21, PPh 22, PPh 23, Pajak Daerah).',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'amount' => [
                                'type' => 'number',
                                'description' => 'Nominal total belanja sebelum pajak.',
                            ],
                            'item_type' => [
                                'type' => 'string',
                                'enum' => ['barang', 'jasa', 'konsumsi', 'honor'],
                                'description' => 'Jenis barang atau jasa yang dibelanjakan.',
                            ],
                            'is_pkp' => [
                                'type' => 'boolean',
                                'description' => 'Apakah rekanan/penyedia berstatus PKP (kena PPN). Default true jika belanja > 2jt.',
                            ],
                            'has_npwp' => [
                                'type' => 'boolean',
                                'description' => 'Apakah rekanan memiliki NPWP. Default true.',
                            ],
                        ],
                        'required' => ['amount', 'item_type'],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'prepare_bku_transaction_draft',
                    'description' => 'Menyusun draf transaksi belanja lengkap untuk disajikan sebagai kartu konfirmasi (Staging Card) ke bendahara sebelum disimpan.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'tanggal' => [
                                'type' => 'string',
                                'description' => 'Tanggal transaksi format YYYY-MM-DD.',
                            ],
                            'jenis_transaksi' => [
                                'type' => 'string',
                                'enum' => ['tunai', 'non-tunai'],
                                'description' => 'Metode pembayaran (tunai atau transfer bank).',
                            ],
                            'rkas_id' => [
                                'type' => 'integer',
                                'description' => 'ID rincian RKAS yang dipilih dari hasil search_rkas_activity.',
                            ],
                            'uraian' => [
                                'type' => 'string',
                                'description' => 'Uraian formal transaksi BKU (format standar audit).',
                            ],
                            'nama_toko' => [
                                'type' => 'string',
                                'description' => 'Nama rekanan/toko penyedia barang/jasa.',
                            ],
                            'nominal' => [
                                'type' => 'number',
                                'description' => 'Nominal kuitansi belanja.',
                            ],
                            'volume' => [
                                'type' => 'number',
                                'description' => 'Volume/kuantitas belanja.',
                            ],
                            'satuan' => [
                                'type' => 'string',
                                'description' => 'Satuan barang (Rim, Paket, Kotak, dll).',
                            ],
                            'harga_satuan' => [
                                'type' => 'number',
                                'description' => 'Harga satuan per unit.',
                            ],
                            'pajak_info' => [
                                'type' => 'object',
                                'properties' => [
                                    'jenis_pajak' => ['type' => 'string'],
                                    'persen_pajak' => ['type' => 'number'],
                                    'total_pajak' => ['type' => 'number'],
                                ],
                            ],
                        ],
                        'required' => ['tanggal', 'jenis_transaksi', 'rkas_id', 'uraian', 'nama_toko', 'nominal'],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'query_realization_comparison',
                    'description' => 'Mengambil data komparasi realisasi anggaran dan serapan belanja untuk menghasilkan grafik chart dan ringkasan eksekutif.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'group_by' => [
                                'type' => 'string',
                                'enum' => ['triwulan', 'jenis_belanja'],
                                'description' => 'Kategori pengelompokan data realisasi.',
                            ],
                            'tahun' => [
                                'type' => 'integer',
                                'description' => 'Tahun anggaran analisis yang diminta (contoh: 2025, 2026). Opsional, default adalah tahun aktif saat ini.',
                            ],
                        ],
                        'required' => ['group_by'],
                    ],
                ],
            ],
        ];
    }

    /**
     * Memproses percakapan interaktif dengan DeepSeek-V3 dan mengeksekusi function calls
     */
    public function chat(User $user, string $variant, int $tahun, array $messages): array
    {
        $apiKey = $user->deepseek_api_key;
        if (empty($apiKey)) {
            return [
                'success' => false,
                'error_type' => 'NO_API_KEY',
                'message' => 'API Key DeepSeek belum diatur di Profil Anda. Silakan isi terlebih dahulu.',
            ];
        }

        VariantConfig::validateVariant($variant);
        $sekolah = SekolahProfile::query()->first(['*']);
        $sekolahNama = $sekolah?->nama_sekolah ?? 'Satuan Pendidikan';
        $variantTitle = VariantConfig::title($variant);

        $penganggaranClass = VariantConfig::getModelClass('penganggaran', $variant);
        $availableYears = $penganggaranClass::orderBy('tahun_anggaran', 'asc')->pluck('tahun_anggaran')->toArray();
        $daftarTahunStr = ! empty($availableYears) ? implode(', ', $availableYears) : (string) $tahun;

        $systemPrompt = <<<PROMPT
Anda adalah "SIKAS AI Copilot", teman akrab sekaligus partner kerja setia bendahara dan kepala sekolah di {$sekolahNama}.
Aplikasi saat ini mengelola dana BOSP {$variantTitle}.
Tahun Anggaran aktif yang sedang dibuka di layar adalah {$tahun}.
Sistem database SIKAS juga menyimpan arsip resmi pembukuan untuk Tahun Anggaran: {$daftarTahunStr}.

PEDOMAN AKSES MULTI-TAHUN:
- Gunakan Tahun Anggaran aktif ({$tahun}) sebagai default apabila pengguna tidak menyebutkan tahun tertentu secara spesifik.
- Apabila pengguna menanyakan data tahun anggaran lain (misalnya tahun 2025, atau perbandingan antara tahun 2025 dan 2026), Anda BISA dan WAJIB mengakses data tahun tersebut dengan menyertakan parameter `tahun` pada tool yang relevan (contoh: tahun: 2025).
- JANGAN PERNAH menolak atau berkata bahwa Anda hanya berjalan di tahun {$tahun}. Sistem mendukung penuh pembacaan data tahun-tahun yang tercantum di arsip database ({$daftarTahunStr}).

Karakter & Gaya Bicara Anda:
1. GAYA BAHASA SANTAI SEPERTI TEMAN AKRAB:
   - JANGAN berbicara formal, kaku, atau seperti birokrat/robot. Bicaralah kasual, santai, asyik, dan hangat layaknya teman nongkrong atau partner satu tim.
   - Sapa dan panggil pengguna dengan sebutan akrab seperti "Bro", "Om", atau "Bos" (contoh: "Halo bro!", "Aman om, ini datanya udah siap!", "Siap bos!", "Gimana kabarnya om?").
   - BISA DIAJAK CHAT BIASA (SMALL TALK):
     * Jika pengguna menyapa santai ("Halo bro", "Pagi om", "Halo copilot"), ajak ngobrol balik dengan ramah dan asyik.
     * Jika pengguna curhat lelah urus SPJ, pusing pembukuan, atau ngajak ngobrol ringan (kopi, istirahat, candaan), tanggapi dengan empati dan gaya santai layaknya sahabat yang mengerti perjuangan bendahara sekolah.
     * Tetap siap sedia dan sigap jika sewaktu-waktu pengguna butuh bantuan terkait RKAS, BKU, buku bank, kuitansi, atau pajak.
2. FORMAT TABEL HTML (TETAP RAPI & PRESISI):
   - Walaupun gaya bahasa Anda santai seperti teman, saat menyajikan data angka keuangan, daftar belanja, perbandingan pagu, kuitansi BKU, atau mutasi Buku Bank, Anda WAJIB menyajikannya dalam tabel HTML terstruktur rapi (tag <table>, <thead>, <tbody>, <tr>, <th>, <td>).
   - Format nominal uang selalu gunakan format Rupiah resmi (contoh: Rp 29.000.000) dan atur rata kanan (align="right" atau style="text-align: right;").
   - Jangan menyajikan data angka dalam baris teks panjang tanpa tabel jika ada 2 baris data atau lebih. Gunakan tabel HTML agar jelas dibaca.
3. PENCEGAHAN KODE, ID INTERNAL, & VARIABEL TEKNIS (ATURAN SANGAT KETAT):
   - JANGAN PERNAH menampilkan kode pemrograman (PHP, SQL, JavaScript, Python), blok kode, atau query database di dalam chat.
   - JANGAN PERNAH menampilkan nama variabel internal atau kunci teknis sistem (seperti \$spent, \$rkas_id, rkas_id, kode_rekening_id, bkuDetailFk, found_count, filter_bulan, items, dsb.).
   - USER / BENDAHARA TIDAK BOLEH TAHU ATAU MELIHAT ID KEGIATAN DATABASE APAPUN:
     * DILARANG KERAS membuat kolom "ID Kegiatan" atau menampilkan ID angka database apapun di tabel atau teks.
     * Gunakan nomor urut biasa (1, 2, 3...) untuk kolom "No".
     * Gunakan istilah umum yang mudah dipahami: "Sisa Anggaran" alih-alih "sisa_pagu", "Realisasi Belanja" alih-alih "terealisasi".
   - Dilarang keras menampilkan tanda dolar (\$) untuk nama variabel program.
4. PERTANYAAN BUKU KAS & BUKU PEMBANTU (ROB / PAJAK / TUNAI / BANK / BKU) VS RKAS:
   - Jika pengguna menanyakan "Buku ROB", "BKP ROB", "Rincian Objek Belanja", "Realisasi per rekening", "Serapan belanja per akun", atau rincian belanja objek tertentu (seperti belanja ATK, honorarium, internet, sewa, konsumsi, perabot, dsb) di bulan X:
     a. WAJIB memanggil tool `get_bkp_rob_monthly` dengan parameter `bulan` yang diminta (contoh: bulan: "Maret"). Jika pengguna menanyakan rekening tertentu secara spesifik (misal: "Berapa ROB belanja ATK?"), sertakan parameter `rekening` (contoh: rekening: "ATK").
     b. JANGAN memanggil `get_bku_monthly_realization` (yang hanya untuk belanja BKU kronologis tanpa grouping objek belanja) atau `search_rkas_activity`!
     c. Tampilkan ringkasan posisi anggaran ROB secara santai & jelas di atas tabel:
        - Anggaran Belanja Tersedia di Awal Bulan (format Rp - Saldo kas belanja yang siap digunakan)
        - Total Realisasi Belanja Bulan Ini (format Rp - Akumulasi seluruh objek belanja yang terealisasi)
        - Sisa Anggaran Kas Belanja Akhir Bulan (format Rp)
     d. Tampilkan Tabel Rekapitulasi per Objek Belanja:
        <th>No</th><th>Kode Rekening</th><th>Nama Objek Belanja</th><th>Pagu RKAS (Rp)</th><th>Realisasi Bulan Ini (Rp)</th><th>Total Realisasi Tahunan (Rp)</th><th>Sisa Pagu RKAS (Rp)</th>
     e. Tampilkan Rincian Transaksi Belanja per Kelompok Objek Belanja:
        Setiap kelompok rekening diawali judul kode dan nama rekening belanja, lalu sajikan daftar kuitansinya dalam tabel HTML:
        <th>No</th><th>Tanggal</th><th>No. Bukti / Kuitansi</th><th>Uraian Belanja</th><th>Realisasi (Rp)</th><th>Jumlah Kumulatif (Rp)</th><th>Sisa Anggaran Kas (Rp)</th>
     f. Jika bulan tersebut belum ada transaksi belanja sama sekali (rekap_objek_count = 0), jelaskan secara santai bahwa di bulan tersebut belum ada pencairan belanja objek apapun.
     g. PENTING - RKAS PERUBAHAN & PERGESERAN ANGGARAN PADA ROB:
        - Jika sekolah memiliki dokumen RKAS Perubahan (`status_dokumen_anggaran` = "Perubahan"), angka `pagu_rkas` yang disajikan adalah Pagu Resmi Terakhir (RKAS Perubahan).
        - Jika field `status_pergeseran` berisi informasi pergeseran (misalnya "[Perubahan +Rp 10.000 dari Tahap 2]" atau "[Perubahan -Rp 10.000]"):
          1) Sertakan catatan pergeseran tersebut di kolom Pagu RKAS secara rapi, contoh: "Rp 130.000 <br><small style='color: #64748b;'>(Perubahan +Rp 10.000)</small>".
          2) JANGAN PERNAH mengklaim ada kelebihan belanja / defisit anggaran / over-budget jika realisasi kumulatif masih sesuai atau tidak melebihi Pagu RKAS Perubahan (sisa_pagu_rkas >= 0). Jelaskan secara ramah bahwa anggaran objek belanja tersebut bertambah/berkurang secara sah lewat penetapan RKAS Perubahan (pergeseran anggaran Tahap 2).
   - Jika pengguna menanyakan "Buku Kas Pajak", "BKP Pajak", "Buku Pembantu Pajak", "Setoran pajak", "Bukti NTPN", "Pajak belum setor", "Pemotongan pajak belanja", atau mutasi pajak bulan X:
     a. WAJIB memanggil tool `get_bkp_pajak_monthly` dengan parameter `bulan` yang diminta (contoh: bulan: "Maret").
     b. JANGAN memanggil `get_bkp_bank_monthly`, `get_bkp_tunai_monthly`, atau `get_bku_monthly_realization`!
     c. Tampilkan ringkasan posisi kas pajak secara santai & jelas di atas tabel:
        - Saldo Awal Kas Pajak Bulan Ini (format Rp - sisa potongan pajak bulan sebelumnya yang belum disetor)
        - Total Pemotongan / Penerimaan Pajak Bulan Ini (format Rp)
        - Total Penyetoran Pajak ke Kas Negara/Daerah (format Rp)
        - Saldo Akhir Kas Pajak / Pajak Belum Disetor (format Rp)
     d. Tampilkan rincian per jenis pajak (PPN, PPh 21, PPh 22, PPh 23, PB 1) secara terstruktur.
     e. Sajikan seluruh transaksi mutasi kas pajak dalam tabel HTML terstruktur rapi dengan kolom WAJIB:
        <th>No</th><th>Tanggal</th><th>Kode Rekening</th><th>No. Bukti / NTPN</th><th>Uraian Transaksi Pajak</th><th>Pemotongan/Penerimaan (Rp)</th><th>Penyetoran/Pengeluaran (Rp)</th><th>Saldo Kas Pajak (Rp)</th>
     f. Peringatan Pajak Belum Disetor:
        - Jika terdapat transaksi belanja yang pajaknya belum disetor (belum ada bukti NTPN), ingatkan bendahara secara ramah dan santai dengan menyebutkan nomor kuitansi, tanggal, dan nominal pajaknya agar tidak terlambat disetorkan.
     g. Jika bulan tersebut tidak ada transaksi pajak sama sekali (mutasi_count = 0), jelaskan secara santai bahwa di bulan tersebut tidak ada pemotongan maupun penyetoran pajak, sehingga saldo kas pajak tetap sama dengan saldo awal bulan.
   - Jika pengguna menanyakan "Buku Kas Tunai", "BKP Tunai", "Buku Pembantu Tunai", "Uang di brankas", "Kas di bendahara", atau mutasi belanja tunai bulan X:
     a. WAJIB memanggil tool `get_bkp_tunai_monthly` dengan parameter `bulan` yang diminta (contoh: bulan: "Maret").
     b. JANGAN memanggil `get_bkp_bank_monthly` (yang untuk rekening bank) atau `get_bku_monthly_realization`!
     c. Tampilkan ringkasan posisi kas tunai secara santai & jelas di atas tabel:
        - Saldo Awal Kas Tunai Bulan Ini (format Rp)
        - Total Penerimaan Kas Tunai (Penarikan Tunai dari Bank + Pungutan Pajak Tunai)
        - Total Pengeluaran Kas Tunai (Belanja Tunai Kuitansi + Setor Pajak Tunai + Setor Bank)
        - Saldo Akhir Kas Tunai (Sisa Fisik Uang di Brankas Bendahara)
     d. Sajikan seluruh transaksi mutasi kas tunai dalam tabel HTML terstruktur rapi dengan kolom WAJIB:
        <th>No</th><th>Tanggal</th><th>Kode Rekening</th><th>No. Bukti / Kuitansi</th><th>Uraian Transaksi Tunai</th><th>Penerimaan (Rp)</th><th>Pengeluaran (Rp)</th><th>Saldo Kas Tunai (Rp)</th>
     e. Jika bulan tersebut tidak ada transaksi tunai (mutasi_count = 0), jelaskan secara santai bahwa di bulan tersebut tidak ada aliran kas tunai masuk maupun keluar, sehingga saldo kas fisik di brankas tetap sama dengan saldo awal bulan.
   - Jika pengguna menanyakan "Buku Kas Bank", "Buku Pembantu Bank", "BKP Bank", "Saldo rekening bank bulan X", "Mutasi bank bulan X", atau aliran uang di rekening:
     a. WAJIB memanggil tool `get_bkp_bank_monthly` dengan parameter `bulan` yang diminta (contoh: bulan: "Januari").
     b. JANGAN memanggil `get_bku_monthly_realization` (yang hanya untuk belanja kas BKU) atau `search_rkas_activity`!
     c. Tampilkan ringkasan posisi kas bank secara santai & jelas di atas tabel:
        - Saldo Awal Kas Bank Bulan Ini (format Rp)
        - Total Penerimaan Bank (Transfer Dana BOSP + Bunga Bank + Pajak Non-Tunai)
        - Total Pengeluaran Bank (Penarikan Tunai + Belanja Non-Tunai + Pajak Bunga + STS)
        - Saldo Akhir Kas di Bank (Posisi Kas Riil di Rekening)
     d. Sajikan seluruh transaksi mutasi perbankan dalam tabel HTML terstruktur rapi dengan kolom WAJIB:
        <th>No</th><th>Tanggal</th><th>Kode Rekening</th><th>No. Bukti</th><th>Uraian Transaksi Bank</th><th>Penerimaan (Rp)</th><th>Pengeluaran (Rp)</th><th>Saldo Bank (Rp)</th>
     e. Jika bulan tersebut tidak ada transaksi mutasi (mutasi_count = 0), jelaskan secara santai bahwa di bulan tersebut tidak ada aliran kas bank masuk maupun keluar, sehingga saldo kas di bank tetap sama dengan saldo awal bulan.
   - Jika pengguna menanyakan "Realisasi BKU", "Berapa realisasi belanja bulan X?", "Tampilkan belanja BKU bulan X", atau daftar kuitansi yang dibukukan:
     a. WAJIB memanggil tool `get_bku_monthly_realization` dengan parameter `bulan` yang diminta (contoh: bulan: "Maret").
     b. JANGAN memanggil `search_rkas_activity` untuk menjawab realisasi belanja kas BKU! Realisasi kas riil tercatat resmi di Buku Kas Umum (BKU), bukan di dokumen perencanaan RKAS.
     c. Tampilkan ringkasan singkat dengan gaya santai di atas tabel:
        - Total belanja bulan ini, belanja kumulatif, dan jumlah kuitansi.
     d. Sajikan kuitansi belanja dalam tabel HTML terstruktur rapi dengan kolom:
        <th>No</th><th>Tanggal Transaksi</th><th>No. Bukti / Nota</th><th>Uraian Belanja BKU</th><th>Rekanan / Toko</th><th>Rekening Belanja</th><th>Nominal Belanja (Rp)</th>
    - Jika pengguna menanyakan "Register Penutupan Kas", "Formulir K7B", "Penutupan kas bulanan", "Posisi uang brankas dan bank", "Rincian pecahan uang kas tunai", atau status tutup buku bulan X:
      a. WAJIB memanggil tool `get_bkp_registrasi_penutupan_kas_monthly` dengan parameter `bulan` yang diminta (contoh: bulan: "Maret").
      b. JANGAN memanggil `get_bku_monthly_realization` atau `get_bkp_tunai_monthly` saja karena tidak mencakup rekonsiliasi lengkap K7B dan denominasi fisik kas!
      c. Tampilkan Header & Status Penutupan:
         - Sebutkan bulan, tahun, dan status penutupan kas:
           * Jika sudah ditutup resmi: `[Resmi Ditutup pada tanggal_penutupan]` lengkap dengan nama Bendahara dan Kepala Sekolah.
           * Jika belum ditutup: `[Draft Posisi Berjalan - Belum Ditutup di BKU]` disertai pengingat ramah untuk melakukan tutup buku di menu BKU setelah seluruh transaksi selesai.
         - Cantumkan juga Tanggal Penutupan Kas Yang Lalu.
      d. Tampilkan Tabel Ringkasan Posisi Kas (Format Formulir BOS-K7B):
         Sajikan tabel HTML terstruktur rapi:
         <th>No</th><th>Komponen Pembukuan Kas</th><th style="text-align: right;">Jumlah (Rp)</th>
         Baris data:
         1. Jumlah Total Penerimaan (D)
         2. Jumlah Total Pengeluaran (K)
         3. Saldo Buku (A = D - K)
         4. Saldo Kas Tunai di Bendahara (B = Uang Kertas + Uang Logam)
         5. Saldo Rekening Bank (3)
         6. Total Kas Fisik Riil (1 + 2 + 3)
         7. Selisih / Perbedaan Kas (Saldo Buku vs Total Kas Fisik)
      e. Tampilkan Rincian Fisik Kas (Pecahan Uang Kertas & Logam):
         - Jika saldo kas tunai > 0, sajikan tabel pecahan uang yang ada isinya (lembar/keping > 0):
           <th>Pecahan Nominal</th><th>Jumlah Lembar / Keping</th><th style="text-align: right;">Subtotal (Rp)</th>
         - Jika saldo kas tunai Rp 0, jelaskan dengan santai bahwa kas fisik di brankas nihil (Rp 0) dan seluruh saldo kas tersimpan aman di rekening bank.
      f. Analisis Audit & Rekomendasi Cerdas:
         - Konfirmasi apakah kas klop/seimbang (Rp 0 selisih).
         - Peringatan Batas Kas Tunai: Jika `is_cash_limit_exceeded` = true (saldo kas tunai brankas > Rp 10.000.000), ingatkan bendahara bahwa saldo tunai melebihi batas regulasi BOSP (Rp 10.000.000) dan disarankan untuk disetor ke bank.
         - Rekomendasi untuk mencetak lembar formulir BOS-K7B jika pemeriksaan kas telah selesai.
    - Jika pengguna menanyakan "Berita Acara Penutupan Kas", "Berita Acara Pemeriksaan Kas", "Pemeriksaan kas bendahara", atau legalitas penutupan kas bulan X:
      a. WAJIB memanggil tool `get_berita_acara_penutupan_kas_monthly` dengan parameter `bulan` yang diminta (contoh: bulan: "Maret").
      b. Sajikan Format Naratif Resmi Berita Acara Pemeriksaan Kas:
         - Header: `### BERITA ACARA PEMERIKSAAN KAS`
         - Badge Status: `[STATUS: RESMI DITUTUP]` atau `[STATUS: DRAFT POSISI BERJALAN - BKU BELUM DITUTUP RESMI]`.
         - Klausul Pembuka Legal:
           "Pada hari ini, **{hari_pemeriksaan}** tanggal **{tanggal_pemeriksaan}**, yang bertanda tangan di bawah ini Kepala Sekolah yang ditunjuk berdasarkan Surat Keputusan No. **{sk_nomor_kepsek}** Tanggal **{sk_tanggal_kepsek}**:
           - **Nama**: {nama_kepala_sekolah} (NIP. {nip_kepala_sekolah})
           - **Jabatan**: Kepala Sekolah
           Melakukan pemeriksaan kas kepada:
           - **Nama**: {nama_bendahara} (NIP. {nip_bendahara})
           - **Jabatan**: Bendahara BOS
           Yang berdasarkan Surat Keputusan No. **{sk_nomor_bendahara}** Tanggal **{sk_tanggal_bendahara}** ditugaskan dengan pengurusan uang Bantuan Operasional Sekolah (BOS)."
         - Klausul Hasil Pemeriksaan:
           "Berdasarkan pemeriksaan kas serta bukti-bukti dalam pengurusan itu, kami menemui kenyataan sebagai berikut:"
           Sajikan tabel HTML perhitungan uang yang dihitung di hadapan Bendahara:
           <th>Poin</th><th>Uraian Komponen Kas</th><th style="text-align: right;">Jumlah (Rp)</th>
           Baris:
           - a) Uang kertas bank dan uang logam
           - b) Saldo Bank
           - c) Surat Berharga dll (Rp 0 / -)
           - **Jumlah Kas Dihitung (a + b + c)**
           - **Saldo Uang Menurut Buku Kas Umum**
         - Kesimpulan & Rekonsiliasi:
           * Konfirmasi status klop penuh: Kas fisik + saldo bank seimbang dengan Saldo Buku Kas Umum (selisih Rp 0).
           * Jelaskan bahwa perbedaan antara Saldo Buku dan Kas Tunai Brankas adalah sisa dana yang tersimpan dengan aman pada rekening bank sekolah.
         - Catatan Kepatuhan & Rekomendasi:
           * Jika `is_cash_limit_exceeded` = true, peringatkan bahwa kas tunai brankas melebihi Rp 10.000.000.
           * Jika SK kepala sekolah atau bendahara belum lengkap/belum terisi di profil penganggaran, ingatkan secara ramah untuk melengkapi nomor SK di profil penganggaran.
           * Jika status masih draft, ingatkan untuk melakukan verifikasi fisik kas sebelum menekan tombol Tutup BKU di aplikasi.
           * Rekomendasikan untuk mencetak lembar Berita Acara Pemeriksaan Kas untuk ditandatangani basah oleh Kepala Sekolah dan Bendahara BOS.
   - Jika pengguna menanyakan "Rekapitulasi Realisasi", "Rekapitulasi Penggunaan Dana BOSP", "Rekap 8 Standar", "Evaluasi Komponen BOS", "Formulir K-7A", atau ringkasan serapan dana BOSP periode Tahap 1/Tahap 2/Tahunan/Bulan tertentu:
     a. WAJIB memanggil tool `get_rekapitulasi_realisasi_bosp` dengan parameter `periode` (contoh: "Tahap 1", "Tahunan", atau "Maret") dan `tahun`.
     b. Sajikan Format Resmi Rekapitulasi Realisasi BOSP (Formulir BOS K-7A):
        - Header: `### REKAPITULASI REALISASI PENGGUNAAN DANA BOSP` dengan badge periode: `[PERIODE: {periode}]`
        - Tabel Ringkasan Arus Keuangan:
          Sajikan tabel HTML:
          <th>Komponen Arus Kas</th><th style="text-align: right;">Jumlah (Rp)</th>
          Baris:
          1. Saldo Periode Sebelumnya
          2. Total Penerimaan Dana BOSP Periode Ini
          3. Total Penggunaan / Realisasi Dana BOSP Periode Ini
          4. Sisa Saldo Akhir Periode Ini
        - Tabel Realisasi Menurut 8 Standar Nasional Pendidikan:
          Sajikan tabel HTML:
          <th>No</th><th>Standar Nasional Pendidikan</th><th style="text-align: right;">Realisasi Belanja (Rp)</th><th style="text-align: right;">Porsi (%)</th>
          Tampilkan seluruh standar 01 s/d 08 lengkap beserta baris TOTAL JUMLAH REALISASI.
        - Rincian Realisasi Menurut Komponen Penggunaan Dana BOS:
          Sajikan daftar komponen BOS aktif (yang realisasinya > Rp 0) beserta nominal dan persentasenya (misal: Pembayaran Honor, Pelaksanaan Administrasi Kegiatan Sekolah, Pemeliharaan Sarpras, dsb).
        - Catatan Analisis Cerdas:
          * Ulas tingkat serapan belanja pada periode tersebut.
          * Jelaskan sisa kas yang belum terpakai dan pos belanja yang paling dominan.
          * Rekomendasikan untuk mencetak lembar formulir BOS K-7A untuk lampiran laporan pertanggungjawaban BOSP.
   - Jika pengguna menanyakan "Rekapitulasi Belanja Per Rekening", "Rekap Belanja Modal vs Operasi", "Format LK 2", atau "Realisasi belanja barang pakai habis":
     a. WAJIB memanggil tool `get_rekapitulasi_realisasi_per_rekening` dengan parameter `periode` (Tahap 1, Tahap 2, atau Tahunan) dan `tahun`.
     b. Sajikan Format Resmi LK 2:
        - Header: `### REKAPITULASI REALISASI BELANJA PER REKENING (LK 2)` dengan badge periode: `[PERIODE: {periode}]`
        - Tabel Rincian Belanja Operasi & Modal:
          Sajikan tabel HTML:
          <th>Kelompok Belanja</th><th>Kode Rekening</th><th style="text-align: right;">Realisasi (Rp)</th><th style="text-align: right;">Porsi (%)</th>
          Baris:
          1. Belanja Barang Pakai Habis (5.1.02.01)
          2. Belanja Barang & Jasa (5.1.02.02 - 5.1.02.04)
             *Subtotal Belanja Operasi*
          3. Belanja Modal Peralatan dan Mesin (5.2.02)
          4. Belanja Modal Aset Tetap Lainnya (5.2.05)
             *Subtotal Belanja Modal*
          *TOTAL REALISASI BELANJA*
        - Catatan Analisis:
          * Jelaskan perbandingan proporsi antara belanja operasional kegiatan sekolah vs belanja aset fisik/modal sekolah.
   - Jika pengguna menanyakan "Buku Pembantu Barang Habis Pakai", "BHP", "Belanja barang pakai habis", "Daftar pembelian ATK/kertas/materai/kebersihan/konsumsi", atau "Buku pembantu persediaan":
     a. WAJIB memanggil tool `get_buku_pembantu_bhp` dengan parameter `periode` (Tahunan, Tahap 1, Tahap 2, atau nama bulan) dan `tahun`.
     b. Sajikan Format Resmi Buku Pembantu BHP:
        - Header: `### BUKU PEMBANTU BARANG HABIS PAKAI (BHP)` dengan badge periode: `[PERIODE: {periode}]`
        - Ringkasan Singkat: Sebutkan Total Belanja BHP dan Jumlah Item Barang yang dibelanjakan.
        - Jika data transaksi kosong / nihil (Rp 0):
          * Jelaskan secara santai bahwa pada periode tersebut tidak ada catatan pengeluaran belanja barang habis pakai (nihil).
        - Jika terdapat data transaksi:
          * Sajikan tabel HTML terstruktur rapi:
            <th>No</th><th>Tanggal</th><th>Kode Rekening</th><th>No. Bukti</th><th>Uraian Barang</th><th>Kuantitas</th><th style="text-align: right;">Harga Satuan (Rp)</th><th style="text-align: right;">Realisasi (Rp)</th>
            Lengkapi dengan baris TOTAL REALISASI BHP di bagian bawah tabel.
        - Catatan Pengelolaan Persediaan:
          * Ingatkan bendahara atau pengurus barang untuk memastikan barang persediaan yang dibeli dicatat ke dalam buku persediaan / mutasi barang persediaan.
          * Rekomendasikan mencetak lembar Buku Pembantu BHP jika diperlukan untuk kelengkapan berkas SPJ.
   - Jika pengguna menanyakan "Buku Pembantu Barang Modal", "BHM", "Belanja Modal / Aset", "Pengadaan peralatan dan mesin", "Pembelian aset buku perpustakaan", "Inventaris aset", atau "Buku pembantu aset tetap":
     a. WAJIB memanggil tool `get_buku_pembantu_bhm` dengan parameter `periode` (Tahunan, Tahap 1, Tahap 2, atau nama bulan) dan `tahun`.
     b. Sajikan Format Resmi Buku Pembantu BHM:
        - Header: `### BUKU PEMBANTU BARANG MODAL / ASET (BHM)` dengan badge periode: `[PERIODE: {periode}]`
        - Ringkasan Komposisi Belanja Modal:
          * Total Belanja Modal
          * Subtotal Peralatan & Mesin (Akun 5.2.02)
          * Subtotal Aset Tetap Lainnya / Buku Perpustakaan (Akun 5.2.05)
        - Jika data transaksi kosong / nihil (Rp 0):
          * Jelaskan secara santai bahwa pada periode tersebut tidak ada pengadaan belanja modal atau penambahan aset tetap (nihil).
        - Jika terdapat data transaksi:
          * Sajikan tabel HTML terstruktur rapi:
            <th>No</th><th>Tanggal</th><th>Kode Rekening</th><th>No. Bukti</th><th>Uraian Barang / Aset</th><th>Kuantitas</th><th style="text-align: right;">Harga Satuan (Rp)</th><th style="text-align: right;">Realisasi (Rp)</th>
            Lengkapi dengan baris TOTAL REALISASI BELANJA MODAL di bagian bawah tabel.
        - Smart Compliance Audit & Kepatuhan Aset:
          * WAJIB memberikan peringatan kepatuhan audit: Seluruh pengadaan belanja modal WAJIB dicatatkan ke dalam KIB (Kartu Inventaris Barang / KIB B untuk Peralatan & Mesin, KIB E untuk Buku Perpustakaan) dan dibuatkan BAST (Berita Acara Serah Terima) serta label/nomor kode inventaris barang agar tertib penatausahaan aset sekolah dan bebas dari temuan pemeriksaan BPK/Inspektorat.
          * Rekomendasikan mencetak lembar Buku Pembantu BHM untuk kelengkapan SPJ belanja modal.
   - Jika pengguna menanyakan "RKAS Perubahan", "Ringkasan RKAS Perubahan", "Pergeseran anggaran tahun ini", "Perubahan anggaran BOSP", "Evaluasi pagu perubahan", atau "Komparasi RKAS Murni vs Perubahan secara umum":
     a. WAJIB memanggil tool `get_rkas_perubahan_summary` dengan parameter `tahun`.
     b. Jika status_perubahan = false:
        - Jelaskan dengan santai dan ramah bahwa sekolah belum menyusun/mengesahkan dokumen RKAS Perubahan untuk tahun tersebut dan masih menggunakan dokumen RKAS Murni awal tahun.
     c. Jika status_perubahan = true, sajikan Format Resmi Executive Summary RKAS Perubahan:
        - Header: `### EXECUTIVE SUMMARY: RKAS PERUBAHAN TAHUN {tahun}` dengan badge: `[STATUS: RESMI DITETAPKAN & AKTIF]`
        - Tabel Komparasi Pagu Total & Tahapan:
          Sajikan tabel HTML:
          <th>Komponen Anggaran</th><th style="text-align: right;">RKAS Murni (Rp)</th><th style="text-align: right;">RKAS Perubahan (Rp)</th><th style="text-align: right;">Selisih Pergeseran (Rp)</th>
          Baris data:
          1. Alokasi Tahap 1 (Januari – Juni)
          2. Alokasi Tahap 2 (Juli – Desember)
          *TOTAL PAGU ANGGARAN BOSP*
        - Rekapitulasi Pergeseran Resmi (Formulir BOS-K3 / RKA Tahapan):
          WAJIB menampilkan ringkasan nilai pergeseran resmi sesuai lembar Formulir BOS-K3:
          * Total Penambahan Anggaran (Bertambah): Rp {total_bertambah} ({item_bertambah_count} item)
          * Total Pengurangan Anggaran (Berkurang): Rp {total_berkurang} ({item_berkurang_count} item)
          * Net Selisih Pagu: Rp {net_pergeseran} (Pagu anggaran seimbang tetap di Rp {pagu_anggaran})
          * Rincian Penambahan Anggaran: Jelaskan secara transparan dan tegas bahwa dari total penambahan pergeseran Rp {total_bertambah}, sebesar Rp {kenaikan_buku_pelajaran} dialokasikan untuk 16 judul Buku Teks Kurikulum Merdeka (8 judul Kelas VIII & 8 judul Kelas IX di Belanja Modal Buku Akun 5.2.05), dan Rp {kenaikan_operasional_lain} untuk belanja operasional lainnya (Materai Rp 10.000 dan Fotocopy LPJ Rp 2.000). DILARANG menyebut total pergeseran hanya sebesar Rp 3.228.000 karena Rp 3.228.000 adalah porsi buku saja, sedangkan angka pergeseran resmi yang bertambah dan berkurang di lembar BOS-K3 adalah Rp 3.240.000!
        - Tabel Evaluasi Kepatuhan Batas Regulasi BOSP:
          Sajikan tabel HTML:
          <th>Pos Belanja Regulasi</th><th style="text-align: right;">Alokasi Anggaran (Rp)</th><th style="text-align: right;">Porsi (%)</th><th>Ambang Batas Regulasi</th><th>Status Kepatuhan</th>
          Baris data:
          1. Belanja Buku Perpustakaan (Min. 10%)
          2. Pembayaran Honorarium (Maks. 20% Negeri / 40% Swasta)
          3. Pemeliharaan Sarpras (Maks. 20%)
        - Ringkasan Statistik Pergeseran Item:
          Sebutkan total kegiatan unik ({total_kegiatan_unik}), item tetap ({item_tetap}), bertambah ({item_bertambah}), berkurang ({item_berkurang}), item baru ({item_baru}), dan item dihapus ({item_dihapus}).
        - Riwayat Log Perubahan Terakhir:
          Jika terdapat catatan log perubahan, sebutkan 3-5 aksi terakhir yang dilakukan bendahara/pengguna (tanggal, aksi, dan uraian aksi).
   - Jika pengguna menanyakan kegiatan apa saja yang berubah di RKAS Perubahan, item yang bertambah/berkurang, atau rincian kegiatan RKAS Perubahan pada bulan/tahap tertentu (contoh: "Kegiatan apa saja yang berubah di RKAS Perubahan?", "Tampilkan RKAS Perubahan bulan September", "Cari belanja buku di RKAS Perubahan"):
     a. WAJIB memanggil tool `get_rkas_perubahan_activities` dengan parameter `tahun`, `bulan` (jika spesifik), `tahap` (jika spesifik), `filter_perubahan` (default: 'berubah', atau 'semua' jika diminta seluruhnya), dan `query` (jika ada kata kunci).
     b. Sajikan Format Komparasi Kegiatan:
        - Header: `### KOMPARASI PERGESERAN KEGIATAN RKAS PERUBAHAN` dengan badge: `[FILTER: {keterangan_filter}]`
        - Sajikan tabel HTML terstruktur rapi:
          <th>No</th><th>Bulan</th><th>Kode Kegiatan</th><th>Uraian Kegiatan / Barang</th><th>Kode Rekening</th><th style="text-align: right;">Anggaran Murni (Rp)</th><th style="text-align: right;">Anggaran Perubahan (Rp)</th><th style="text-align: right;">Selisih (Rp)</th><th>Status Perubahan</th>
          Baris data:
          Tampilkan item kegiatan dengan kolom status yang jelas (Bertambah, Berkurang, Baru (Ditambahkan), Dihapus dari Perubahan, atau Tetap).
        - Catatan Analisis Pergeseran:
          * Berikan ulasan singkat mengenai kegiatan apa saja yang mendapatkan tambahan dana atau pengurangan dana dan alasan pergeseran tersebut.
   - Jika pengguna menanyakan "RKA Rekap", "Rekapitulasi Anggaran", "Rekap RKAS awal dan perubahan", "Komparasi rekap belanja operasi dan modal", atau "Tampilkan RKA Rekap tahun {tahun}":
     a. WAJIB memanggil tool `get_rka_rekap_anggaran` dengan parameter `tahun` dan `tipe_dokumen` ('komparasi' jika ada perubahan aktif, atau 'murni'/'perubahan' jika pengguna secara spesifik meminta salah satunya).
     b. Sajikan Format Resmi Formulir RKA Rekapitulasi Anggaran Sekolah:
        - Header: `### REKAPITULASI ANGGARAN (RKA REKAP) TAHUN {tahun}` dengan badge mode: `[MODE: KOMPARASI RKAS MURNI VS PERUBAHAN]` atau `[DOKUMEN: RKAS PERUBAHAN]`
        - Tampilkan nama sekolah dan sumber dana (contoh: **{nama_sekolah}** — Sumber Dana: {sumber_dana}).
        - **Bagian A. Penerimaan:**
          Sajikan tabel HTML:
          <th>No. Kode</th><th>Sumber Dana / Penerimaan</th><th style="text-align: right;">RKAS Murni (Rp)</th><th style="text-align: right;">RKAS Perubahan (Rp)</th><th style="text-align: right;">Selisih (Rp)</th>
          Tampilkan baris akun `4.3.1.01` dan baris Total Penerimaan.
        - **Bagian B. Rekapitulasi Anggaran Belanja:**
          Sajikan tabel HTML dengan hierarki akun belanja lengkap (semua baris standar tetap dicantumkan termasuk yang Rp 0):
          <th>Kode Rekening</th><th>Uraian Akun Belanja</th><th style="text-align: right;">RKAS Murni (Rp)</th><th style="text-align: right;">RKAS Perubahan (Rp)</th><th style="text-align: right;">Selisih (Rp)</th>
          Baris akun:
          1. `5` — BELANJA
          2. `5.1` — BELANJA OPERASI
          3. `5.1.01` — Belanja Pegawai (tampilkan Rp 0 jika nihil)
          4. `5.1.02` — Belanja Barang dan Jasa
          5. `5.1.02.01` — Belanja Barang
          6. `5.1.02.02` — Belanja Jasa
          7. `5.1.02.03` — Belanja Pemeliharaan (tampilkan Rp 0 jika nihil)
          8. `5.1.02.04` — Belanja Perjalanan Dinas
          9. `5.2` — BELANJA MODAL
          10. `5.2.02` — Belanja Modal Peralatan dan Mesin
          11. `5.2.04` — Belanja Modal Jalan, Jaringan, dan Irigasi (tampilkan Rp 0 jika nihil)
          12. `5.2.05` — Belanja Modal Aset Tetap Lainnya (Buku Perpustakaan)
          *JUMLAH BELANJA*
          *SURPLUS / (DEFISIT)* (Wajib bernilai Rp 0 seimbang).
        - **Bagian C. Rencana Pelaksanaan Anggaran per Tahap:**
          Sajikan tabel HTML per tahap:
          <th>No</th><th>Uraian</th><th style="text-align: right;">Tahap 1 (Rp)</th><th style="text-align: right;">Tahap 2 (Rp)</th><th style="text-align: right;">Total (Rp)</th>
          Baris data:
          1. Pendapatan (50% Tahap 1, 50% Tahap 2)
          2. Belanja Operasi
          3. Belanja Modal
          *Total Belanja*
        - **Catatan Analisis Santai:**
          Berikan ulasan singkat mengenai kondisi anggaran: pagu seimbang Rp 0, dan jelaskan pergeseran belanja operasi ke belanja modal jika terdapat dokumen perubahan.
   - Jika pengguna menanyakan ringkasan pagu BOSP, panggil `get_budget_pagu_summary`.
   - Jika menanyakan grafik serapan triwulan, panggil `query_realization_comparison`.
5. PENCARIAN RENCANA KEGIATAN RKAS:
   - Jika pengguna menanyakan rencana kegiatan atau alokasi anggaran di dokumen perencanaan RKAS (contoh: "Apa saja rencana anggaran di RKAS bulan Maret?", "Cari kegiatan sarpras di RKAS", "Tampilkan RKAS bulan Januari"):
     a. Panggil tool `search_rkas_activity` dengan parameter `bulan` atau `query`.
     b. Jika sekolah memiliki RKAS Perubahan, kegiatan pada Tahap 2 (Juli–Desember) secara otomatis diambil dari alokasi resmi RKAS Perubahan (`sumber_anggaran` = "RKAS Perubahan").
     c. Tampilkan seluruh baris kegiatan dalam tabel HTML terstruktur rapi dengan kolom WAJIB:
        <th>No</th><th>Bulan</th><th>Uraian Kegiatan / Barang</th><th>Kode Rekening</th><th>Nama Rekening</th><th>Total Anggaran</th><th>Realisasi Bulan Ini</th><th>Sisa Anggaran</th><th>Status Realisasi BKU</th>
     d. DILARANG membuat kolom "ID Kegiatan" database. Gunakan nomor urut biasa (1, 2, 3...) di kolom "No".
     e. Berikan Catatan Analisis Santai:
        - Jika pengguna menanyakan data RKAS bulan tertentu di mana kas belum keluar (contoh: bulan Januari dengan Realisasi Bulan Ini = Rp 0), jelaskan secara santai dan bersahabat bahwa di bulan tersebut kasnya memang belum dicairkan (Rp 0), tapi sistem mendeteksi kegiatan mana saja yang udah dibayarin di bulan-bulan berikutnya (sesuai kolom `Status Realisasi BKU`, misalnya honor atau sabun yang dibayarkan di BKU Maret), dan sebutkan mana yang masih belum direalisasikan sama sekali.
6. DRAFTING TRANSAKSI BKU:
   - Jika pengguna meminta mencatat belanja atau kuitansi (contoh: "Catat belanja ATK...", "Bayar katering..."):
     a. Panggil tool `search_rkas_activity` untuk mencari rincian kegiatan dan akun rekening yang relevan di RKAS {$tahun}. Jika belanja di Tahap 2 (Juli–Desember) dan terdapat RKAS Perubahan, sistem otomatis mengarahkan ke rincian RKAS Perubahan (`rkas_perubahan_id`).
     b. Panggil tool `calculate_tax_recommendation` untuk menghitung pajak resmi yang berlaku.
     c. Panggil tool `prepare_bku_transaction_draft` untuk menghasilkan Draf Staging Card transaksi.
     d. Beri tahu dengan santai bahwa draf kartu transaksi sudah siap di layar dan minta mereka klik konfirmasi untuk menyimpan ke BKU.
7. Jangan pernah mengarang kode rekening atau ID kegiatan secara sembarangan, selalu gunakan hasil dari tool.
PROMPT;

        $conversation = [
            ['role' => 'system', 'content' => $systemPrompt],
        ];

        // Masukkan riwayat pesan pengguna (batasi 10 pesan terakhir agar efisien)
        $recentMessages = array_slice($messages, -10);
        foreach ($recentMessages as $msg) {
            $conversation[] = [
                'role' => $msg['role'] ?? 'user',
                'content' => $msg['content'] ?? '',
            ];
        }

        $tools = $this->getAvailableTools();
        $model = $user->deepseek_model_chat ?: 'deepseek-chat';

        $stagingCard = null;
        $analyticsChart = null;

        // Loop Function Calling (Maksimal 4 iterasi untuk multi-step)
        for ($i = 0; $i < 4; $i++) {
            $response = $this->deepSeekService->callChatWithTools($apiKey, $conversation, $tools, [
                'model' => $model,
                'timeout' => 45,
            ]);

            if (! $response['success']) {
                return [
                    'success' => false,
                    'message' => $response['message'],
                ];
            }

            $assistantMsg = $response['message'];
            $toolCalls = $response['tool_calls'] ?? [];

            // Jika tidak ada tool call, respons final telah selesai
            if (empty($toolCalls)) {
                return [
                    'success' => true,
                    'content' => $this->sanitizeResponseText($response['content'] ?? ''),
                    'staging_card' => $stagingCard,
                    'analytics_chart' => $analyticsChart,
                ];
            }

            // Catat pesan assistant dengan tool calls
            $conversation[] = $assistantMsg;

            // Eksekusi tiap tool call
            foreach ($toolCalls as $toolCall) {
                $fnName = $toolCall['function']['name'] ?? '';
                $rawArgs = $toolCall['function']['arguments'] ?? '{}';
                $args = json_decode($rawArgs, true) ?: [];

                $toolResult = $this->executeTool($fnName, $args, $variant, $tahun);

                if ($fnName === 'prepare_bku_transaction_draft' && isset($toolResult['staging_card'])) {
                    $stagingCard = $toolResult['staging_card'];
                }

                if ($fnName === 'query_realization_comparison' && isset($toolResult['chart_data'])) {
                    $analyticsChart = $toolResult['chart_data'];
                }

                $conversation[] = [
                    'role' => 'tool',
                    'tool_call_id' => $toolCall['id'],
                    'content' => json_encode($toolResult, JSON_UNESCAPED_UNICODE),
                ];
            }
        }

        return [
            'success' => true,
            'content' => $this->sanitizeResponseText($conversation[count($conversation) - 1]['content'] ?? 'Selesai memproses instruksi Anda.'),
            'staging_card' => $stagingCard,
            'analytics_chart' => $analyticsChart,
        ];
    }

    /**
     * Dispatcher eksekusi fungsi lokal
     */
    protected function executeTool(string $name, array $args, string $variant, int $tahun): array
    {
        $targetTahun = ! empty($args['tahun']) ? (int) $args['tahun'] : $tahun;

        return match ($name) {
            'get_budget_pagu_summary' => $this->getBudgetPaguSummary($targetTahun, $variant),
            'get_bku_monthly_realization' => $this->getBkuMonthlyRealization($targetTahun, $args['bulan'] ?? 'Maret', $variant),
            'get_bkp_bank_monthly' => $this->getBkpBankMonthly($targetTahun, $args['bulan'] ?? 'Maret', $variant),
            'get_bkp_tunai_monthly' => $this->getBkpTunaiMonthly($targetTahun, $args['bulan'] ?? 'Maret', $variant),
            'get_bkp_pajak_monthly' => $this->getBkpPajakMonthly($targetTahun, $args['bulan'] ?? 'Maret', $variant),
            'get_bkp_rob_monthly' => $this->getBkpRobMonthly($targetTahun, $args['bulan'] ?? 'Maret', $variant, $args['rekening'] ?? null),
            'get_bkp_registrasi_penutupan_kas_monthly' => $this->getRegisterPenutupanKasMonthly($targetTahun, $args['bulan'] ?? 'Maret', $variant),
            'get_berita_acara_penutupan_kas_monthly' => $this->getBeritaAcaraPenutupanKasMonthly($targetTahun, $args['bulan'] ?? 'Maret', $variant),
            'get_rekapitulasi_realisasi_bosp' => $this->getRekapitulasiRealisasiBosp($targetTahun, $args['periode'] ?? 'Tahunan', $variant),
            'get_rekapitulasi_realisasi_per_rekening' => $this->getRekapitulasiRealisasiPerRekening($targetTahun, $args['periode'] ?? 'Tahunan', $variant),
            'get_buku_pembantu_bhp' => $this->getBukuPembantuBhp($targetTahun, $args['periode'] ?? 'Tahunan', $variant),
            'get_buku_pembantu_bhm' => $this->getBukuPembantuBhm($targetTahun, $args['periode'] ?? 'Tahunan', $variant),
            'get_rkas_perubahan_summary' => $this->getRkasPerubahanSummary($targetTahun, $variant),
            'get_rkas_perubahan_activities' => $this->getRkasPerubahanActivities(
                $targetTahun,
                $variant,
                $args['bulan'] ?? null,
                $args['tahap'] ?? null,
                $args['filter_perubahan'] ?? 'berubah',
                $args['query'] ?? null
            ),
            'get_rka_rekap_anggaran' => $this->getRkaRekapAnggaran(
                $targetTahun,
                $variant,
                $args['tipe_dokumen'] ?? 'komparasi'
            ),
            'get_lembar_kerja_221' => $this->getLembarKerja221(
                $targetTahun,
                $variant,
                $args['tipe_dokumen'] ?? 'aktif',
                $args['kode_rekening'] ?? null,
                ! empty($args['limit']) ? (int) $args['limit'] : 50
            ),
            'get_rincian_pencairan' => $this->getRincianPencairan(
                $targetTahun,
                $variant,
                isset($args['tahap']) ? (int) $args['tahap'] : null,
                $args['bulan'] ?? 'Semua',
                $args['tipe_dokumen'] ?? 'aktif'
            ),
            'get_alur_kas' => $this->getAlurKas(
                $targetTahun,
                $variant,
                isset($args['tahap']) ? (int) $args['tahap'] : null,
                $args['tipe_dokumen'] ?? 'aktif'
            ),
            'search_rkas_activity' => $this->searchRkasActivity($targetTahun, $args['query'] ?? '', $variant, $args['bulan'] ?? null),
            'calculate_tax_recommendation' => $this->calculateTaxRecommendation(
                (float) ($args['amount'] ?? 0),
                $args['item_type'] ?? 'barang',
                (bool) ($args['is_pkp'] ?? true),
                (bool) ($args['has_npwp'] ?? true)
            ),
            'prepare_bku_transaction_draft' => $this->prepareBkuDraft($args, $variant, $targetTahun),
            'query_realization_comparison' => $this->queryRealizationComparison($targetTahun, $variant, $args['group_by'] ?? 'triwulan'),
            default => ['error' => "Unknown tool: {$name}"],
        };
    }

    /**
     * Resolusi konteks RKAS (Awal vs Perubahan) sesuai tahun, varian, dan tahap/bulan
     */
    protected function getRkasContext(int $tahun, string $variant, ?int $bulanAngka = null): array
    {
        VariantConfig::validateVariant($variant);

        $penganggaranClass = VariantConfig::getModelClass('penganggaran', $variant);
        $rkasClass = VariantConfig::getModelClass('rkas', $variant);
        $rkasPerubahanClass = VariantConfig::getModelClass('rkas_perubahan', $variant);
        $penganggaranFk = VariantConfig::penganggaranFk($variant);

        $penganggaran = $penganggaranClass::where('tahun_anggaran', $tahun)->first();
        $hasPerubahan = false;

        if ($rkasPerubahanClass && $penganggaran) {
            $hasPerubahan = $rkasPerubahanClass::where($penganggaranFk, $penganggaran->id)->exists();
        }

        // Tentukan apakah bulan berada di Semester / Tahap 2 (Juli - Desember)
        $isTahap2 = $bulanAngka !== null ? ($bulanAngka >= 7) : false;

        // Model aktif tahunan untuk evaluasi Pagu resmi:
        // Jika ada RKAS Perubahan, maka Pagu resmi tahunan adalah RKAS Perubahan
        $activePaguClass = $hasPerubahan ? $rkasPerubahanClass : $rkasClass;

        // Model target untuk bulan/transaksi spesifik:
        // Bulan Jan-Jun selalu menunjuk ke RKAS Awal, bulan Jul-Des menunjuk ke RKAS Perubahan jika ada
        $targetModelClass = ($isTahap2 && $hasPerubahan) ? $rkasPerubahanClass : $rkasClass;
        $usageFk = VariantConfig::uraianDetailRkasFk($variant, $isTahap2 && $hasPerubahan);

        return [
            'penganggaran' => $penganggaran,
            'penganggaran_fk' => $penganggaranFk,
            'has_perubahan' => $hasPerubahan,
            'rkas_class' => $rkasClass,
            'rkas_perubahan_class' => $rkasPerubahanClass,
            'active_pagu_class' => $activePaguClass,
            'target_model_class' => $targetModelClass,
            'usage_fk' => $usageFk,
            'is_tahap_2' => $isTahap2,
        ];
    }

    /**
     * Tool: Ringkasan resmi Pagu Anggaran BOSP tahun aktif (penetapan, penerimaan, dan RKAS)
     */
    protected function getBudgetPaguSummary(int $tahun, string $variant): array
    {
        $rkasCtx = $this->getRkasContext($tahun, $variant);
        $penganggaran = $rkasCtx['penganggaran'];
        if (! $penganggaran) {
            return [
                'error' => "Data penganggaran untuk tahun {$tahun} ({$variant}) belum ditemukan.",
            ];
        }

        $penganggaranFk = $rkasCtx['penganggaran_fk'];
        $hasPerubahan = $rkasCtx['has_perubahan'];
        $activePaguClass = $rkasCtx['active_pagu_class'];
        $rkasClass = $rkasCtx['rkas_class'];

        $paguAnggaran = (float) ($penganggaran->pagu_anggaran ?? 0);

        // Penerimaan per tahap
        $penerimaanClass = VariantConfig::getModelClass('penerimaan_dana', $variant);
        $penerimaans = $penerimaanClass::where($penganggaranFk, $penganggaran->id)->get();
        $tahap1Nominal = 0.0;
        $tahap2Nominal = 0.0;
        $totalPenerimaan = 0.0;
        $rincianPenerimaan = [];

        foreach ($penerimaans as $pd) {
            $nominal = (float) $pd->jumlah_dana;
            $totalPenerimaan += $nominal;
            $rincianPenerimaan[] = [
                'sumber_dana' => $pd->sumber_dana,
                'tanggal_terima' => $pd->tanggal_terima ? Carbon::parse($pd->tanggal_terima)->format('d/m/Y') : '-',
                'jumlah' => $nominal,
            ];
            if (stripos($pd->sumber_dana, 'Tahap 1') !== false) {
                $tahap1Nominal += $nominal;
            } elseif (stripos($pd->sumber_dana, 'Tahap 2') !== false) {
                $tahap2Nominal += $nominal;
            }
        }

        // Hitung rincian rencana belanja RKAS per kelompok rekening dari RKAS aktif
        $rkasItems = $activePaguClass::with('rekeningBelanja')
            ->where($penganggaranFk, $penganggaran->id)
            ->get();

        $totalRencanaRkas = 0.0;
        $barangJasaTotal = 0.0;
        $modalTotal = 0.0;
        $lainnyaTotal = 0.0;

        foreach ($rkasItems as $item) {
            $subtotal = (float) $item->harga_satuan * (float) $item->jumlah;
            $totalRencanaRkas += $subtotal;
            $kodeRekening = $item->rekeningBelanja?->kode_rekening ?? '';

            if (str_starts_with($kodeRekening, '5.1.02')) {
                $barangJasaTotal += $subtotal;
            } elseif (str_starts_with($kodeRekening, '5.2')) {
                $modalTotal += $subtotal;
            } else {
                $lainnyaTotal += $subtotal;
            }
        }

        $totalRencanaAwal = null;
        if ($hasPerubahan) {
            $totalRencanaAwal = (float) $rkasClass::where($penganggaranFk, $penganggaran->id)
                ->selectRaw('SUM(harga_satuan * jumlah) as total')
                ->value('total');
        }

        $kelompokBelanja = [
            [
                'kategori' => 'Belanja Barang dan Jasa (5.1.02)',
                'nominal' => $barangJasaTotal,
                'persentase' => $totalRencanaRkas > 0 ? round(($barangJasaTotal / $totalRencanaRkas) * 100, 2) : 0,
            ],
            [
                'kategori' => 'Belanja Modal / Aset (5.2)',
                'nominal' => $modalTotal,
                'persentase' => $totalRencanaRkas > 0 ? round(($modalTotal / $totalRencanaRkas) * 100, 2) : 0,
            ],
        ];

        if ($lainnyaTotal > 0) {
            $kelompokBelanja[] = [
                'kategori' => 'Belanja Lainnya / Operasi',
                'nominal' => $lainnyaTotal,
                'persentase' => $totalRencanaRkas > 0 ? round(($lainnyaTotal / $totalRencanaRkas) * 100, 2) : 0,
            ];
        }

        return [
            'tahun_anggaran' => $tahun,
            'variant' => $variant,
            'status_dokumen_anggaran' => $hasPerubahan ? 'RKAS Perubahan' : 'RKAS Awal (Murni)',
            'has_perubahan' => $hasPerubahan,
            'pagu_total_penetapan' => $paguAnggaran > 0 ? $paguAnggaran : $totalRencanaRkas,
            'total_rencana_rkas' => $totalRencanaRkas,
            'total_rencana_rkas_awal' => $totalRencanaAwal,
            'total_dana_diterima' => $totalPenerimaan,
            'tahap_1' => $tahap1Nominal,
            'tahap_2' => $tahap2Nominal,
            'rincian_penerimaan' => $rincianPenerimaan,
            'alokasi_kelompok_belanja' => $kelompokBelanja,
            'status' => 'Data Pagu Resmi',
        ];
    }

    /**
     * Tool: Mengambil data resmi realisasi pembukuan kas BKU bulanan
     */
    protected function getBkuMonthlyRealization(int $tahun, string $bulan, string $variant): array
    {
        $penganggaranClass = VariantConfig::getModelClass('penganggaran', $variant);
        $bkuClass = VariantConfig::getModelClass('bku', $variant);
        $bkuFk = VariantConfig::penganggaranFk($variant);

        $penganggaran = $penganggaranClass::where('tahun_anggaran', $tahun)->first();
        if (! $penganggaran) {
            return ['error' => "Data penganggaran untuk tahun {$tahun} ({$variant}) belum ditemukan."];
        }

        $monthMap = [
            'januari' => 1, 'februari' => 2, 'maret' => 3, 'april' => 4, 'mei' => 5, 'juni' => 6,
            'juli' => 7, 'agustus' => 8, 'september' => 9, 'oktober' => 10, 'november' => 11, 'desember' => 12,
        ];

        $monthKey = strtolower(trim($bulan));
        $bulanAngka = $monthMap[$monthKey] ?? 3;
        $bulanNama = ucfirst($monthKey);
        foreach ($monthMap as $mName => $mIdx) {
            if ($mIdx === $bulanAngka) {
                $bulanNama = ucfirst($mName);
                break;
            }
        }

        // 1. Total Belanja BKU Bulan Ini (hanya transaksi belanja reguler, bukan record bunga/closing)
        $totalBelanjaBulanIni = (float) $bkuClass::where($bkuFk, $penganggaran->id)
            ->whereMonth('tanggal_transaksi', $bulanAngka)
            ->whereYear('tanggal_transaksi', $tahun)
            ->where('is_bunga_record', false)
            ->sum(DB::raw('COALESCE(total_transaksi_kotor, dibelanjakan, 0)'));

        // 2. Total Belanja Kumulatif s.d. Bulan Ini
        $totalBelanjaSdBulanIni = (float) $bkuClass::where($bkuFk, $penganggaran->id)
            ->whereMonth('tanggal_transaksi', '<=', $bulanAngka)
            ->whereYear('tanggal_transaksi', $tahun)
            ->where('is_bunga_record', false)
            ->sum(DB::raw('COALESCE(total_transaksi_kotor, dibelanjakan, 0)'));

        // 3. Ambil seluruh transaksi belanja BKU pada bulan ini
        $bkuItems = $bkuClass::with(['kodeKegiatan', 'rekeningBelanja', 'uraianDetails'])
            ->where($bkuFk, $penganggaran->id)
            ->whereMonth('tanggal_transaksi', $bulanAngka)
            ->whereYear('tanggal_transaksi', $tahun)
            ->where('is_bunga_record', false)
            ->orderBy('tanggal_transaksi', 'asc')
            ->orderBy('id', 'asc')
            ->get();

        $transaksiList = [];
        $no = 1;
        foreach ($bkuItems as $bku) {
            $nominal = (float) ($bku->total_transaksi_kotor ?: $bku->dibelanjakan);
            if ($nominal <= 0) {
                continue;
            }

            $noBukti = $bku->nomor_nota ?: ($bku->id_transaksi ?: 'BKU-'.$bku->id);
            $rekanan = $bku->nama_toko ?: ($bku->nama_penerima_pembayaran ?: '-');
            $tgl = $bku->tanggal_transaksi ? Carbon::parse($bku->tanggal_transaksi)->format('d/m/Y') : '-';

            $transaksiList[] = [
                'no' => $no++,
                'tanggal' => $tgl,
                'no_bukti' => $noBukti,
                'uraian' => $bku->uraian ?: 'Pembayaran Belanja',
                'rekanan' => $rekanan,
                'kode_rekening' => $bku->rekeningBelanja?->kode_rekening ?? '-',
                'nama_rekening' => $bku->rekeningBelanja?->rincian_objek ?? '-',
                'nominal' => $nominal,
            ];
        }

        return [
            'bulan' => $bulanNama,
            'tahun' => $tahun,
            'total_belanja_bulan_ini' => $totalBelanjaBulanIni,
            'total_belanja_kumulatif_sd_bulan_ini' => $totalBelanjaSdBulanIni,
            'jumlah_transaksi' => count($transaksiList),
            'keterangan' => "Total realisasi belanja resmi pada BKU bulan {$bulanNama} {$tahun} adalah Rp ".number_format($totalBelanjaBulanIni, 0, ',', '.').' ('.count($transaksiList).' transaksi kuitansi dibukukan).',
            'transaksi' => $transaksiList,
        ];
    }

    /**
     * Tool: Mengambil data resmi pembukuan Buku Kas Pembantu Bank (BKP Bank) per bulan
     */
    protected function getBkpBankMonthly(int $tahun, string $bulan, string $variant): array
    {
        VariantConfig::validateVariant($variant);

        $penganggaranClass = VariantConfig::getModelClass('penganggaran', $variant);
        $penerimaanClass = VariantConfig::getModelClass('penerimaan_dana', $variant);
        $penarikanClass = VariantConfig::getModelClass('penarikan_tunai', $variant);
        $bkuClass = VariantConfig::getModelClass('bku', $variant);
        $stsClass = VariantConfig::getModelClass('sts', $variant);
        $penganggaranFk = VariantConfig::penganggaranFk($variant);

        $penganggaran = $penganggaranClass::where('tahun_anggaran', $tahun)->first();
        if (! $penganggaran) {
            return [
                'error' => "Data penganggaran untuk tahun {$tahun} ({$variant}) belum ditemukan.",
            ];
        }

        $bulanMap = [
            'januari' => 1, 'februari' => 2, 'maret' => 3, 'april' => 4,
            'mei' => 5, 'juni' => 6, 'juli' => 7, 'agustus' => 8,
            'september' => 9, 'oktober' => 10, 'november' => 11, 'desember' => 12,
        ];
        $cleanBulan = strtolower(trim($bulan));
        $bulanAngka = $bulanMap[$cleanBulan] ?? 3;
        $bulanFormatted = ucfirst($cleanBulan);

        $bukuKasService = new BukuKasService($variant);

        // 1. Saldo Awal Bank
        $saldoAwal = 0.0;
        if ($bulanAngka > 1) {
            $saldoAwal = (float) $bukuKasService->hitungSaldoBankSebelumBulan($penganggaran->id, $bulanAngka);
        }

        // 2. Penerimaan Dana BOSP
        $penerimaans = $penerimaanClass::where($penganggaranFk, $penganggaran->id)
            ->whereMonth('tanggal_terima', $bulanAngka)
            ->whereYear('tanggal_terima', $tahun)
            ->orderBy('tanggal_terima', 'asc')
            ->get();

        $totalPenerimaanDana = 0.0;
        $items = [];

        foreach ($penerimaans as $p) {
            if ($p->sumber_dana === 'Bosp Reguler Tahap 1' && (float) ($p->saldo_awal ?? 0) > 0) {
                $saldoAwal += (float) $p->saldo_awal;
            }

            $jml = (float) $p->jumlah_dana;
            $totalPenerimaanDana += $jml;
            $items[] = [
                'tanggal' => Carbon::parse($p->tanggal_terima)->format('Y-m-d'),
                'tanggal_formatted' => Carbon::parse($p->tanggal_terima)->format('d/m/Y'),
                'kode_rekening' => '4.1.01',
                'no_bukti' => '-',
                'uraian' => 'Terima Transfer Dana '.$p->sumber_dana,
                'penerimaan' => $jml,
                'pengeluaran' => 0.0,
                'type' => 'penerimaan',
                'sort_order' => 1,
            ];
        }

        // 3. Penarikan Tunai
        $penarikans = $penarikanClass::where($penganggaranFk, $penganggaran->id)
            ->whereMonth('tanggal_penarikan', $bulanAngka)
            ->whereYear('tanggal_penarikan', $tahun)
            ->orderBy('tanggal_penarikan', 'asc')
            ->get();

        $totalPenarikan = 0.0;
        foreach ($penarikans as $pen) {
            $jml = (float) $pen->jumlah_penarikan;
            $totalPenarikan += $jml;
            $items[] = [
                'tanggal' => Carbon::parse($pen->tanggal_penarikan)->format('Y-m-d'),
                'tanggal_formatted' => Carbon::parse($pen->tanggal_penarikan)->format('d/m/Y'),
                'kode_rekening' => '-',
                'no_bukti' => '-',
                'uraian' => ! empty($pen->uraian) ? $pen->uraian : 'Penarikan Kas Tunai dari Rekening Bank',
                'penerimaan' => 0.0,
                'pengeluaran' => $jml,
                'type' => 'penarikan',
                'sort_order' => 5,
            ];
        }

        // 4. Bunga Bank & Pajak Bunga Bank
        $bungaRecords = $bkuClass::where($penganggaranFk, $penganggaran->id)
            ->whereMonth('tanggal_transaksi', $bulanAngka)
            ->whereYear('tanggal_transaksi', $tahun)
            ->where('is_bunga_record', true)
            ->orderBy('tanggal_transaksi', 'asc')
            ->get();

        $totalBunga = 0.0;
        $totalPajakBunga = 0.0;
        foreach ($bungaRecords as $bungaRecord) {
            $bunga = (float) $bungaRecord->bunga_bank;
            $pajakBunga = (float) $bungaRecord->pajak_bunga_bank;
            $totalBunga += $bunga;
            $totalPajakBunga += $pajakBunga;

            if ($bunga > 0) {
                $items[] = [
                    'tanggal' => Carbon::parse($bungaRecord->tanggal_transaksi)->format('Y-m-d'),
                    'tanggal_formatted' => Carbon::parse($bungaRecord->tanggal_transaksi)->format('d/m/Y'),
                    'kode_rekening' => '299',
                    'no_bukti' => '-',
                    'uraian' => 'Pendapatan Bunga Bank Bulan '.Carbon::parse($bungaRecord->tanggal_transaksi)->locale('id')->isoFormat('MMMM'),
                    'penerimaan' => $bunga,
                    'pengeluaran' => 0.0,
                    'type' => 'bunga',
                    'sort_order' => 20,
                ];
            }

            if ($pajakBunga > 0) {
                $items[] = [
                    'tanggal' => Carbon::parse($bungaRecord->tanggal_transaksi)->format('Y-m-d'),
                    'tanggal_formatted' => Carbon::parse($bungaRecord->tanggal_transaksi)->format('d/m/Y'),
                    'kode_rekening' => '199',
                    'no_bukti' => '-',
                    'uraian' => 'Potongan Pajak Bunga Bank (PPh 4 ayat 2) Bulan '.Carbon::parse($bungaRecord->tanggal_transaksi)->locale('id')->isoFormat('MMMM'),
                    'penerimaan' => 0.0,
                    'pengeluaran' => $pajakBunga,
                    'type' => 'pajak_bunga',
                    'sort_order' => 21,
                ];
            }
        }

        // 5. Belanja Non-Tunai & Potongan Pajak Non-Tunai
        $belanjaNonTunaiList = $bkuClass::where($penganggaranFk, $penganggaran->id)
            ->with(['kodeKegiatan', 'rekeningBelanja'])
            ->where('is_bunga_record', false)
            ->where('jenis_transaksi', 'non-tunai')
            ->whereMonth('tanggal_transaksi', $bulanAngka)
            ->whereYear('tanggal_transaksi', $tahun)
            ->orderBy('tanggal_transaksi', 'asc')
            ->get();

        $totalBelanjaNonTunai = 0.0;
        $totalPajakDiterimaNonTunai = 0.0;

        foreach ($belanjaNonTunaiList as $bnt) {
            $kotor = (float) $bnt->total_transaksi_kotor;
            $totalBelanjaNonTunai += $kotor;

            $items[] = [
                'tanggal' => Carbon::parse($bnt->tanggal_transaksi)->format('Y-m-d'),
                'tanggal_formatted' => Carbon::parse($bnt->tanggal_transaksi)->format('d/m/Y'),
                'kode_rekening' => $bnt->rekeningBelanja?->kode_rekening ?? '-',
                'no_bukti' => $bnt->nomor_nota ?? $bnt->id_transaksi ?? '-',
                'uraian' => 'Belanja Non-Tunai: '.($bnt->uraian_opsional ?: $bnt->uraian),
                'penerimaan' => 0.0,
                'pengeluaran' => $kotor,
                'type' => 'belanja_non_tunai',
                'sort_order' => 10,
            ];

            $pajakPusat = (float) ($bnt->total_pajak ?? 0);
            if ($pajakPusat > 0) {
                $totalPajakDiterimaNonTunai += $pajakPusat;
                $items[] = [
                    'tanggal' => Carbon::parse($bnt->tanggal_transaksi)->format('Y-m-d'),
                    'tanggal_formatted' => Carbon::parse($bnt->tanggal_transaksi)->format('d/m/Y'),
                    'kode_rekening' => '-',
                    'no_bukti' => $bnt->kode_masa_pajak ?? '-',
                    'uraian' => 'Terima Pajak '.($bnt->pajak ?? 'Pusat').' ('.($bnt->uraian_opsional ?: $bnt->uraian).')',
                    'penerimaan' => $pajakPusat,
                    'pengeluaran' => 0.0,
                    'type' => 'terima_pajak',
                    'sort_order' => 11,
                ];
            }

            $pajakDaerah = (float) ($bnt->total_pajak_daerah ?? 0);
            if ($pajakDaerah > 0) {
                $totalPajakDiterimaNonTunai += $pajakDaerah;
                $items[] = [
                    'tanggal' => Carbon::parse($bnt->tanggal_transaksi)->format('Y-m-d'),
                    'tanggal_formatted' => Carbon::parse($bnt->tanggal_transaksi)->format('d/m/Y'),
                    'kode_rekening' => '-',
                    'no_bukti' => '-',
                    'uraian' => 'Terima Pajak Daerah ('.($bnt->uraian_opsional ?: $bnt->uraian).')',
                    'penerimaan' => $pajakDaerah,
                    'pengeluaran' => 0.0,
                    'type' => 'terima_pajak_daerah',
                    'sort_order' => 11,
                ];
            }
        }

        // 6. Setoran Pajak Non-Tunai (NTPN)
        $bkuPajakDisetorNonTunai = $bkuClass::where($penganggaranFk, $penganggaran->id)
            ->where('is_bunga_record', false)
            ->where('jenis_transaksi', 'non-tunai')
            ->whereMonth('tanggal_lapor', $bulanAngka)
            ->whereYear('tanggal_lapor', $tahun)
            ->whereNotNull('ntpn')
            ->where(function ($query) {
                $query->where('total_pajak', '>', 0)
                    ->orWhere('total_pajak_daerah', '>', 0);
            })
            ->orderBy('tanggal_lapor', 'asc')
            ->get();

        $totalPajakDisetorNonTunai = 0.0;
        foreach ($bkuPajakDisetorNonTunai as $bkuSetor) {
            $pajakPusat = (float) ($bkuSetor->total_pajak ?? 0);
            if ($pajakPusat > 0) {
                $totalPajakDisetorNonTunai += $pajakPusat;
                $items[] = [
                    'tanggal' => Carbon::parse($bkuSetor->tanggal_lapor)->format('Y-m-d'),
                    'tanggal_formatted' => Carbon::parse($bkuSetor->tanggal_lapor)->format('d/m/Y'),
                    'kode_rekening' => '-',
                    'no_bukti' => $bkuSetor->ntpn ?? '-',
                    'uraian' => 'Setor NTPN Pajak '.($bkuSetor->pajak ?? '').' ('.($bkuSetor->uraian_opsional ?: $bkuSetor->uraian).')',
                    'penerimaan' => 0.0,
                    'pengeluaran' => $pajakPusat,
                    'type' => 'setor_pajak',
                    'sort_order' => 12,
                ];
            }

            $pajakDaerah = (float) ($bkuSetor->total_pajak_daerah ?? 0);
            if ($pajakDaerah > 0) {
                $totalPajakDisetorNonTunai += $pajakDaerah;
                $items[] = [
                    'tanggal' => Carbon::parse($bkuSetor->tanggal_lapor)->format('Y-m-d'),
                    'tanggal_formatted' => Carbon::parse($bkuSetor->tanggal_lapor)->format('d/m/Y'),
                    'kode_rekening' => '-',
                    'no_bukti' => '-',
                    'uraian' => 'Setor Pajak Daerah ('.($bkuSetor->uraian_opsional ?: $bkuSetor->uraian).')',
                    'penerimaan' => 0.0,
                    'pengeluaran' => $pajakDaerah,
                    'type' => 'setor_pajak_daerah',
                    'sort_order' => 12,
                ];
            }
        }

        // 7. STS (Surat Tanda Setor) Buku Bank
        $stsRecords = $stsClass::where($penganggaranFk, $penganggaran->id)
            ->where('is_bkp', true)
            ->whereMonth('tanggal_bayar', $bulanAngka)
            ->whereYear('tanggal_bayar', $tahun)
            ->orderBy('tanggal_bayar', 'asc')
            ->get();

        $totalSts = 0.0;
        foreach ($stsRecords as $sts) {
            $jml = (float) $sts->jumlah_bayar;
            $totalSts += $jml;
            $items[] = [
                'tanggal' => Carbon::parse($sts->tanggal_bayar)->format('Y-m-d'),
                'tanggal_formatted' => Carbon::parse($sts->tanggal_bayar)->format('d/m/Y'),
                'kode_rekening' => '-',
                'no_bukti' => $sts->no_bukti ?? $sts->nomor_sts ?? '-',
                'uraian' => 'Setoran STS Kas Daerah: '.($sts->uraian ?? 'Pengembalian Dana'),
                'penerimaan' => 0.0,
                'pengeluaran' => $jml,
                'type' => 'sts',
                'sort_order' => 7,
            ];
        }

        // Urutkan seluruh items mutasi: Tanggal -> Sort Order
        usort($items, function ($a, $b) {
            $tA = strtotime($a['tanggal']);
            $tB = strtotime($b['tanggal']);
            if ($tA !== $tB) {
                return $tA - $tB;
            }

            return ($a['sort_order'] ?? 99) - ($b['sort_order'] ?? 99);
        });

        // Hitung running balance per baris transaksi
        $runningSaldo = $saldoAwal;
        foreach ($items as &$item) {
            $runningSaldo = $runningSaldo + $item['penerimaan'] - $item['pengeluaran'];
            $item['saldo_berjalan'] = $runningSaldo;
        }
        unset($item);

        $totalPenerimaan = $totalPenerimaanDana + $totalBunga + $totalPajakDiterimaNonTunai;
        $totalPengeluaran = $totalPenarikan + $totalPajakBunga + $totalBelanjaNonTunai + $totalPajakDisetorNonTunai + $totalSts;
        $saldoAkhir = $saldoAwal + $totalPenerimaan - $totalPengeluaran;

        return [
            'bulan' => $bulanFormatted,
            'tahun' => $tahun,
            'saldo_awal' => $saldoAwal,
            'total_penerimaan' => $totalPenerimaan,
            'total_pengeluaran' => $totalPengeluaran,
            'saldo_akhir' => $saldoAkhir,
            'rincian_ringkasan' => [
                'transfer_dana_masuk' => $totalPenerimaanDana,
                'bunga_bank' => $totalBunga,
                'penarikan_tunai' => $totalPenarikan,
                'pajak_bunga' => $totalPajakBunga,
                'belanja_non_tunai' => $totalBelanjaNonTunai,
                'sts_kas_daerah' => $totalSts,
            ],
            'mutasi_count' => count($items),
            'items' => $items,
        ];
    }

    /**
     * Tool: Mengambil data resmi pembukuan Buku Kas Pembantu Tunai (BKP Tunai) per bulan
     */
    protected function getBkpTunaiMonthly(int $tahun, string $bulan, string $variant): array
    {
        VariantConfig::validateVariant($variant);

        $penganggaranClass = VariantConfig::getModelClass('penganggaran', $variant);
        $penarikanClass = VariantConfig::getModelClass('penarikan_tunai', $variant);
        $setorClass = VariantConfig::getModelClass('setor_tunai', $variant);
        $bkuClass = VariantConfig::getModelClass('bku', $variant);
        $penganggaranFk = VariantConfig::penganggaranFk($variant);

        $penganggaran = $penganggaranClass::where('tahun_anggaran', $tahun)->first();
        if (! $penganggaran) {
            return [
                'error' => "Data penganggaran untuk tahun {$tahun} ({$variant}) belum ditemukan.",
            ];
        }

        $bulanMap = [
            'januari' => 1, 'februari' => 2, 'maret' => 3, 'april' => 4,
            'mei' => 5, 'juni' => 6, 'juli' => 7, 'agustus' => 8,
            'september' => 9, 'oktober' => 10, 'november' => 11, 'desember' => 12,
        ];
        $cleanBulan = strtolower(trim($bulan));
        $bulanAngka = $bulanMap[$cleanBulan] ?? 3;
        $bulanFormatted = ucfirst($cleanBulan);

        $bukuKasService = new BukuKasService($variant);

        // 1. Saldo Awal Kas Tunai
        $saldoAwal = 0.0;
        if ($bulanAngka > 1) {
            $saldoAwal = (float) $bukuKasService->hitungSaldoTunaiSebelumBulan($penganggaran->id, $bulanAngka);
        }

        $items = [];

        // 2. Penarikan Kas Tunai dari Bank (Penerimaan Kas Masuk ke Brankas)
        $penarikans = $penarikanClass::where($penganggaranFk, $penganggaran->id)
            ->whereMonth('tanggal_penarikan', $bulanAngka)
            ->whereYear('tanggal_penarikan', $tahun)
            ->orderBy('tanggal_penarikan', 'asc')
            ->get();

        $totalPenarikan = 0.0;
        foreach ($penarikans as $pen) {
            $jml = (float) $pen->jumlah_penarikan;
            $totalPenarikan += $jml;
            $items[] = [
                'tanggal' => Carbon::parse($pen->tanggal_penarikan)->format('Y-m-d'),
                'tanggal_formatted' => Carbon::parse($pen->tanggal_penarikan)->format('d/m/Y'),
                'kode_rekening' => '-',
                'no_bukti' => '-',
                'uraian' => ! empty($pen->uraian) ? $pen->uraian : 'Penarikan Kas Tunai dari Rekening Bank',
                'penerimaan' => $jml,
                'pengeluaran' => 0.0,
                'type' => 'penarikan_tunai',
                'sort_order' => 4,
            ];
        }

        // 3. Setoran Kas Tunai Kembali ke Bank
        $setorans = $setorClass::where($penganggaranFk, $penganggaran->id)
            ->whereMonth('tanggal_setor', $bulanAngka)
            ->whereYear('tanggal_setor', $tahun)
            ->orderBy('tanggal_setor', 'asc')
            ->get();

        $totalSetoran = 0.0;
        foreach ($setorans as $setor) {
            $jml = (float) $setor->jumlah_setor;
            $totalSetoran += $jml;
            $items[] = [
                'tanggal' => Carbon::parse($setor->tanggal_setor)->format('Y-m-d'),
                'tanggal_formatted' => Carbon::parse($setor->tanggal_setor)->format('d/m/Y'),
                'kode_rekening' => '-',
                'no_bukti' => '-',
                'uraian' => 'Setor Kas Tunai ke Rekening Bank',
                'penerimaan' => 0.0,
                'pengeluaran' => $jml,
                'type' => 'setor_tunai',
                'sort_order' => 5,
            ];
        }

        // 4. Belanja Tunai Kuitansi & Pungutan Pajak Belanja Tunai
        $bkuTunaiList = $bkuClass::where($penganggaranFk, $penganggaran->id)
            ->with(['kodeKegiatan', 'rekeningBelanja'])
            ->where('is_bunga_record', false)
            ->where('jenis_transaksi', 'tunai')
            ->whereMonth('tanggal_transaksi', $bulanAngka)
            ->whereYear('tanggal_transaksi', $tahun)
            ->orderBy('tanggal_transaksi', 'asc')
            ->get();

        $totalBelanjaTunai = 0.0;
        $totalPajakDiterimaTunai = 0.0;

        foreach ($bkuTunaiList as $bku) {
            $kotor = (float) ($bku->total_transaksi_kotor ?: $bku->dibelanjakan);
            $totalBelanjaTunai += $kotor;

            $items[] = [
                'tanggal' => Carbon::parse($bku->tanggal_transaksi)->format('Y-m-d'),
                'tanggal_formatted' => Carbon::parse($bku->tanggal_transaksi)->format('d/m/Y'),
                'kode_rekening' => $bku->rekeningBelanja?->kode_rekening ?? '-',
                'no_bukti' => $bku->nomor_nota ?? $bku->id_transaksi ?? '-',
                'uraian' => $bku->uraian_opsional ?: $bku->uraian,
                'penerimaan' => 0.0,
                'pengeluaran' => $kotor,
                'type' => 'belanja_tunai',
                'sort_order' => 10,
            ];

            $pajakPusat = (float) ($bku->total_pajak ?? 0);
            if ($pajakPusat > 0) {
                $totalPajakDiterimaTunai += $pajakPusat;
                $items[] = [
                    'tanggal' => Carbon::parse($bku->tanggal_transaksi)->format('Y-m-d'),
                    'tanggal_formatted' => Carbon::parse($bku->tanggal_transaksi)->format('d/m/Y'),
                    'kode_rekening' => '-',
                    'no_bukti' => $bku->kode_masa_pajak ?? '-',
                    'uraian' => 'Terima Pajak '.($bku->pajak ?? 'Pusat').' ('.($bku->uraian_opsional ?: $bku->uraian).')',
                    'penerimaan' => $pajakPusat,
                    'pengeluaran' => 0.0,
                    'type' => 'terima_pajak',
                    'sort_order' => 11,
                ];
            }

            $pajakDaerah = (float) ($bku->total_pajak_daerah ?? 0);
            if ($pajakDaerah > 0) {
                $totalPajakDiterimaTunai += $pajakDaerah;
                $items[] = [
                    'tanggal' => Carbon::parse($bku->tanggal_transaksi)->format('Y-m-d'),
                    'tanggal_formatted' => Carbon::parse($bku->tanggal_transaksi)->format('d/m/Y'),
                    'kode_rekening' => '-',
                    'no_bukti' => '-',
                    'uraian' => 'Terima Pajak Daerah ('.($bku->uraian_opsional ?: $bku->uraian).')',
                    'penerimaan' => $pajakDaerah,
                    'pengeluaran' => 0.0,
                    'type' => 'terima_pajak_daerah',
                    'sort_order' => 11,
                ];
            }
        }

        // 5. Penyetoran Pajak Tunai (NTPN - Pengeluaran Kas Tunai)
        $bkuPajakDisetorTunai = $bkuClass::where($penganggaranFk, $penganggaran->id)
            ->where('is_bunga_record', false)
            ->where('jenis_transaksi', 'tunai')
            ->whereMonth('tanggal_lapor', $bulanAngka)
            ->whereYear('tanggal_lapor', $tahun)
            ->whereNotNull('ntpn')
            ->where(function ($query) {
                $query->where('total_pajak', '>', 0)
                    ->orWhere('total_pajak_daerah', '>', 0);
            })
            ->orderBy('tanggal_lapor', 'asc')
            ->get();

        $totalPajakDisetorTunai = 0.0;
        foreach ($bkuPajakDisetorTunai as $bkuSetor) {
            $pajakPusat = (float) ($bkuSetor->total_pajak ?? 0);
            if ($pajakPusat > 0) {
                $totalPajakDisetorTunai += $pajakPusat;
                $items[] = [
                    'tanggal' => Carbon::parse($bkuSetor->tanggal_lapor)->format('Y-m-d'),
                    'tanggal_formatted' => Carbon::parse($bkuSetor->tanggal_lapor)->format('d/m/Y'),
                    'kode_rekening' => '-',
                    'no_bukti' => $bkuSetor->ntpn ?? '-',
                    'uraian' => 'Setor NTPN Pajak '.($bkuSetor->pajak ?? '').' ('.($bkuSetor->uraian_opsional ?: $bkuSetor->uraian).')',
                    'penerimaan' => 0.0,
                    'pengeluaran' => $pajakPusat,
                    'type' => 'setor_pajak',
                    'sort_order' => 12,
                ];
            }

            $pajakDaerah = (float) ($bkuSetor->total_pajak_daerah ?? 0);
            if ($pajakDaerah > 0) {
                $totalPajakDisetorTunai += $pajakDaerah;
                $items[] = [
                    'tanggal' => Carbon::parse($bkuSetor->tanggal_lapor)->format('Y-m-d'),
                    'tanggal_formatted' => Carbon::parse($bkuSetor->tanggal_lapor)->format('d/m/Y'),
                    'kode_rekening' => '-',
                    'no_bukti' => '-',
                    'uraian' => 'Setor Pajak Daerah ('.($bkuSetor->uraian_opsional ?: $bkuSetor->uraian).')',
                    'penerimaan' => 0.0,
                    'pengeluaran' => $pajakDaerah,
                    'type' => 'setor_pajak_daerah',
                    'sort_order' => 12,
                ];
            }
        }

        // Urutkan seluruh items mutasi: Tanggal -> Sort Order
        usort($items, function ($a, $b) {
            $tA = strtotime($a['tanggal']);
            $tB = strtotime($b['tanggal']);
            if ($tA !== $tB) {
                return $tA - $tB;
            }

            return ($a['sort_order'] ?? 99) - ($b['sort_order'] ?? 99);
        });

        // Hitung running balance per baris transaksi
        $runningSaldo = $saldoAwal;
        foreach ($items as &$item) {
            $runningSaldo = $runningSaldo + $item['penerimaan'] - $item['pengeluaran'];
            $item['saldo_berjalan'] = $runningSaldo;
        }
        unset($item);

        $totalPenerimaan = $totalPenarikan + $totalPajakDiterimaTunai;
        $totalPengeluaran = $totalBelanjaTunai + $totalSetoran + $totalPajakDisetorTunai;
        $saldoAkhir = $saldoAwal + $totalPenerimaan - $totalPengeluaran;

        return [
            'bulan' => $bulanFormatted,
            'tahun' => $tahun,
            'saldo_awal' => $saldoAwal,
            'total_penerimaan' => $totalPenerimaan,
            'total_pengeluaran' => $totalPengeluaran,
            'saldo_akhir' => $saldoAkhir,
            'rincian_ringkasan' => [
                'penarikan_tunai_bank' => $totalPenarikan,
                'pajak_tunai_dipungut' => $totalPajakDiterimaTunai,
                'belanja_tunai_kuitansi' => $totalBelanjaTunai,
                'pajak_tunai_disetor' => $totalPajakDisetorTunai,
                'setor_tunai_kembali_ke_bank' => $totalSetoran,
            ],
            'mutasi_count' => count($items),
            'items' => $items,
        ];
    }

    /**
     * Tool: Mengambil data resmi pembukuan Buku Kas Pembantu Pajak (BKP Pajak) per bulan
     */
    protected function getBkpPajakMonthly(int $tahun, string $bulan, string $variant): array
    {
        VariantConfig::validateVariant($variant);

        $penganggaranClass = VariantConfig::getModelClass('penganggaran', $variant);
        $bkuClass = VariantConfig::getModelClass('bku', $variant);
        $penganggaranFk = VariantConfig::penganggaranFk($variant);

        $penganggaran = $penganggaranClass::where('tahun_anggaran', $tahun)->first();
        if (! $penganggaran) {
            return [
                'error' => "Data penganggaran untuk tahun {$tahun} ({$variant}) belum ditemukan.",
            ];
        }

        $bulanMap = [
            'januari' => 1, 'februari' => 2, 'maret' => 3, 'april' => 4,
            'mei' => 5, 'juni' => 6, 'juli' => 7, 'agustus' => 8,
            'september' => 9, 'oktober' => 10, 'november' => 11, 'desember' => 12,
        ];
        $cleanBulan = strtolower(trim($bulan));
        $bulanAngka = $bulanMap[$cleanBulan] ?? 3;
        $bulanFormatted = ucfirst($cleanBulan);

        $bukuKasService = new BukuKasService($variant);

        // 1. Saldo Awal Kas Pajak
        $saldoAwal = 0.0;
        if ($bulanAngka > 1) {
            $saldoAwal = (float) $bukuKasService->hitungSaldoPajakSebelumBulan($penganggaran->id, $bulanAngka, $tahun);
        }

        $items = [];
        $totalPpn = 0.0;
        $totalPph21 = 0.0;
        $totalPph22 = 0.0;
        $totalPph23 = 0.0;
        $totalPb1 = 0.0;
        $totalPenerimaan = 0.0;
        $totalPengeluaran = 0.0;

        // 2. Terima Pajak (Pemotongan Pajak pada Belanja Kuitansi BKU)
        $bkuPajakDiterima = $bkuClass::where($penganggaranFk, $penganggaran->id)
            ->whereMonth('tanggal_transaksi', $bulanAngka)
            ->whereYear('tanggal_transaksi', $tahun)
            ->where(function ($query) {
                $query->where('total_pajak', '>', 0)
                    ->orWhere('total_pajak_daerah', '>', 0);
            })
            ->with(['kodeKegiatan', 'rekeningBelanja'])
            ->orderBy('tanggal_transaksi', 'asc')
            ->get();

        foreach ($bkuPajakDiterima as $transaksi) {
            $pajakName = strtolower($transaksi->pajak ?? '');
            $baseUraian = $transaksi->uraian_opsional ?: $transaksi->uraian ?: '';
            $hasPajakPusat = (float) $transaksi->total_pajak > 0;
            $hasPajakDaerah = (float) $transaksi->total_pajak_daerah > 0;

            if ($hasPajakPusat) {
                $ppn = 0.0;
                $pph21 = 0.0;
                $pph22 = 0.0;
                $pph23 = 0.0;

                if (str_contains($pajakName, 'pph21') || str_contains($pajakName, 'pph 21')) {
                    $pph21 = (float) $transaksi->total_pajak;
                    $totalPph21 += $pph21;
                } elseif (str_contains($pajakName, 'pph22') || str_contains($pajakName, 'pph 22')) {
                    $pph22 = (float) $transaksi->total_pajak;
                    $totalPph22 += $pph22;
                } elseif (str_contains($pajakName, 'pph23') || str_contains($pajakName, 'pph 23')) {
                    $pph23 = (float) $transaksi->total_pajak;
                    $totalPph23 += $pph23;
                } else {
                    $ppn = (float) $transaksi->total_pajak;
                    $totalPpn += $ppn;
                }

                $jumlahPusat = $ppn + $pph21 + $pph22 + $pph23;
                $totalPenerimaan += $jumlahPusat;

                $pctPusat = $transaksi->persen_pajak ? (float) $transaksi->persen_pajak : '';
                $labelPajak = $pph21 > 0 ? 'PPh 21' : ($pph22 > 0 ? 'PPh 22' : ($pph23 > 0 ? 'PPh 23' : ($transaksi->pajak ?: 'PPN')));
                $uraianPusat = "Terima Pajak {$labelPajak}".($pctPusat ? " {$pctPusat}%" : '')." ({$baseUraian})";

                $items[] = [
                    'tanggal' => Carbon::parse($transaksi->tanggal_transaksi)->format('Y-m-d'),
                    'tanggal_formatted' => Carbon::parse($transaksi->tanggal_transaksi)->format('d/m/Y'),
                    'kode_rekening' => $transaksi->rekeningBelanja?->kode_rekening ?? '-',
                    'no_bukti' => $transaksi->kode_masa_pajak ?: ($transaksi->nomor_nota ?: ($transaksi->id_transaksi ?: '-')),
                    'uraian' => $uraianPusat,
                    'jenis_pajak' => $labelPajak,
                    'penerimaan' => $jumlahPusat,
                    'pengeluaran' => 0.0,
                    'is_penerimaan' => true,
                    'type' => 'terima_pajak_pusat',
                    'sort_order' => 1,
                ];
            }

            if ($hasPajakDaerah) {
                $pb1 = (float) $transaksi->total_pajak_daerah;
                $totalPb1 += $pb1;
                $totalPenerimaan += $pb1;

                $pctDaerah = $transaksi->persen_pajak_daerah ? (float) $transaksi->persen_pajak_daerah : '';
                $uraianDaerah = 'Terima Pajak Daerah PB 1'.($pctDaerah ? " {$pctDaerah}%" : '')." ({$baseUraian})";

                $items[] = [
                    'tanggal' => Carbon::parse($transaksi->tanggal_transaksi)->format('Y-m-d'),
                    'tanggal_formatted' => Carbon::parse($transaksi->tanggal_transaksi)->format('d/m/Y'),
                    'kode_rekening' => $transaksi->rekeningBelanja?->kode_rekening ?? '-',
                    'no_bukti' => '-',
                    'uraian' => $uraianDaerah,
                    'jenis_pajak' => 'PB 1',
                    'penerimaan' => $pb1,
                    'pengeluaran' => 0.0,
                    'is_penerimaan' => true,
                    'type' => 'terima_pajak_daerah',
                    'sort_order' => 2,
                ];
            }
        }

        // 3. Setor Pajak (Pengeluaran Pajak dengan Bukti NTPN)
        $bkuPajakDisetor = $bkuClass::where($penganggaranFk, $penganggaran->id)
            ->whereMonth('tanggal_lapor', $bulanAngka)
            ->whereYear('tanggal_lapor', $tahun)
            ->whereNotNull('ntpn')
            ->where(function ($query) {
                $query->where('total_pajak', '>', 0)
                    ->orWhere('total_pajak_daerah', '>', 0);
            })
            ->with(['kodeKegiatan', 'rekeningBelanja'])
            ->orderBy('tanggal_lapor', 'asc')
            ->get();

        foreach ($bkuPajakDisetor as $transaksi) {
            $pajakName = strtolower($transaksi->pajak ?? '');
            $baseUraian = $transaksi->uraian_opsional ?: $transaksi->uraian ?: '';
            $hasPajakPusat = (float) $transaksi->total_pajak > 0;
            $hasPajakDaerah = (float) $transaksi->total_pajak_daerah > 0;

            if ($hasPajakPusat) {
                $ppn = 0.0;
                $pph21 = 0.0;
                $pph22 = 0.0;
                $pph23 = 0.0;

                if (str_contains($pajakName, 'pph21') || str_contains($pajakName, 'pph 21')) {
                    $pph21 = (float) $transaksi->total_pajak;
                } elseif (str_contains($pajakName, 'pph22') || str_contains($pajakName, 'pph 22')) {
                    $pph22 = (float) $transaksi->total_pajak;
                } elseif (str_contains($pajakName, 'pph23') || str_contains($pajakName, 'pph 23')) {
                    $pph23 = (float) $transaksi->total_pajak;
                } else {
                    $ppn = (float) $transaksi->total_pajak;
                }

                $jumlahPusat = $ppn + $pph21 + $pph22 + $pph23;
                $totalPengeluaran += $jumlahPusat;

                $pctPusat = $transaksi->persen_pajak ? (float) $transaksi->persen_pajak : '';
                $labelPajak = $pph21 > 0 ? 'PPh 21' : ($pph22 > 0 ? 'PPh 22' : ($pph23 > 0 ? 'PPh 23' : ($transaksi->pajak ?: 'PPN')));
                $uraianPusat = "Setor Pajak {$labelPajak}".($pctPusat ? " {$pctPusat}%" : '')." ({$baseUraian})";

                $items[] = [
                    'tanggal' => Carbon::parse($transaksi->tanggal_lapor)->format('Y-m-d'),
                    'tanggal_formatted' => Carbon::parse($transaksi->tanggal_lapor)->format('d/m/Y'),
                    'kode_rekening' => $transaksi->rekeningBelanja?->kode_rekening ?? '-',
                    'no_bukti' => $transaksi->ntpn ?: ($transaksi->id_transaksi ?: '-'),
                    'uraian' => $uraianPusat,
                    'jenis_pajak' => $labelPajak,
                    'penerimaan' => 0.0,
                    'pengeluaran' => $jumlahPusat,
                    'is_penerimaan' => false,
                    'type' => 'setor_pajak_pusat',
                    'sort_order' => 3,
                ];
            }

            if ($hasPajakDaerah) {
                $pb1 = (float) $transaksi->total_pajak_daerah;
                $totalPengeluaran += $pb1;

                $pctDaerah = $transaksi->persen_pajak_daerah ? (float) $transaksi->persen_pajak_daerah : '';
                $uraianDaerah = 'Setor Pajak Daerah PB 1'.($pctDaerah ? " {$pctDaerah}%" : '')." ({$baseUraian})";

                $items[] = [
                    'tanggal' => Carbon::parse($transaksi->tanggal_lapor)->format('Y-m-d'),
                    'tanggal_formatted' => Carbon::parse($transaksi->tanggal_lapor)->format('d/m/Y'),
                    'kode_rekening' => $transaksi->rekeningBelanja?->kode_rekening ?? '-',
                    'no_bukti' => $transaksi->ntpn ?: '-',
                    'uraian' => $uraianDaerah,
                    'jenis_pajak' => 'PB 1',
                    'penerimaan' => 0.0,
                    'pengeluaran' => $pb1,
                    'is_penerimaan' => false,
                    'type' => 'setor_pajak_daerah',
                    'sort_order' => 4,
                ];
            }
        }

        // 4. Deteksi Transaksi Belum Disetor (belum ada NTPN atau disetor setelah akhir bulan)
        $endOfMonth = Carbon::create($tahun, $bulanAngka, 1)->endOfMonth();
        $belumDisetorRecords = $bkuClass::where($penganggaranFk, $penganggaran->id)
            ->whereDate('tanggal_transaksi', '<=', $endOfMonth)
            ->where(function ($q) {
                $q->where('total_pajak', '>', 0)->orWhere('total_pajak_daerah', '>', 0);
            })
            ->where(function ($q) use ($endOfMonth) {
                $q->whereNull('ntpn')
                    ->orWhere('ntpn', '')
                    ->orWhereDate('tanggal_lapor', '>', $endOfMonth);
            })
            ->with(['rekeningBelanja'])
            ->orderBy('tanggal_transaksi', 'asc')
            ->get();

        $belumDisetorList = [];
        foreach ($belumDisetorRecords as $bdr) {
            $nomPusat = (float) ($bdr->total_pajak ?? 0);
            $nomDaerah = (float) ($bdr->total_pajak_daerah ?? 0);
            $belumDisetorList[] = [
                'tanggal_transaksi' => Carbon::parse($bdr->tanggal_transaksi)->format('d/m/Y'),
                'no_kuitansi' => $bdr->nomor_nota ?: ($bdr->id_transaksi ?: '-'),
                'uraian' => $bdr->uraian_opsional ?: $bdr->uraian,
                'jenis_pajak' => $bdr->pajak ?: ($nomDaerah > 0 ? 'PB 1' : 'Pajak'),
                'nominal_pajak_pusat' => $nomPusat,
                'nominal_pajak_daerah' => $nomDaerah,
                'total_pajak' => $nomPusat + $nomDaerah,
                'status' => empty($bdr->ntpn) ? 'Belum Dibuat NTPN' : 'Disetor Bulan Berikutnya',
            ];
        }

        // 5. Urutkan mutasi: Tanggal -> Penerimaan duluan sebelum Penyetoran
        usort($items, function ($a, $b) {
            $tA = strtotime($a['tanggal']);
            $tB = strtotime($b['tanggal']);
            if ($tA !== $tB) {
                return $tA - $tB;
            }

            return ($a['sort_order'] ?? 99) - ($b['sort_order'] ?? 99);
        });

        // 6. Hitung running balance per baris transaksi
        $runningSaldo = $saldoAwal;
        foreach ($items as &$item) {
            $runningSaldo = $runningSaldo + $item['penerimaan'] - $item['pengeluaran'];
            $item['saldo_berjalan'] = $runningSaldo;
        }
        unset($item);

        $saldoAkhir = $saldoAwal + $totalPenerimaan - $totalPengeluaran;

        return [
            'bulan' => $bulanFormatted,
            'tahun' => $tahun,
            'saldo_awal' => $saldoAwal,
            'total_penerimaan' => $totalPenerimaan,
            'total_pengeluaran' => $totalPengeluaran,
            'saldo_akhir' => $saldoAkhir,
            'rincian_jenis_pajak' => [
                'ppn' => $totalPpn,
                'pph21' => $totalPph21,
                'pph22' => $totalPph22,
                'pph23' => $totalPph23,
                'pb1' => $totalPb1,
            ],
            'belum_disetor_count' => count($belumDisetorList),
            'belum_disetor' => $belumDisetorList,
            'mutasi_count' => count($items),
            'items' => $items,
        ];
    }

    /**
     * Tool: Mengambil data resmi pembukuan Buku Pembantu Rincian Objek Belanja (BKP ROB) per bulan
     */
    protected function getBkpRobMonthly(int $tahun, string $bulan, string $variant, ?string $rekeningFilter = null): array
    {
        VariantConfig::validateVariant($variant);

        $bulanMap = [
            'januari' => 1, 'februari' => 2, 'maret' => 3, 'april' => 4,
            'mei' => 5, 'juni' => 6, 'juli' => 7, 'agustus' => 8,
            'september' => 9, 'oktober' => 10, 'november' => 11, 'desember' => 12,
        ];
        $cleanBulan = strtolower(trim($bulan));
        $bulanAngka = $bulanMap[$cleanBulan] ?? 3;
        $bulanFormatted = ucfirst($cleanBulan);

        $rkasCtx = $this->getRkasContext($tahun, $variant, $bulanAngka);
        $penganggaran = $rkasCtx['penganggaran'];
        if (! $penganggaran) {
            return [
                'error' => "Data penganggaran untuk tahun {$tahun} ({$variant}) belum ditemukan.",
            ];
        }

        $bkuClass = VariantConfig::getModelClass('bku', $variant);
        $penganggaranFk = $rkasCtx['penganggaran_fk'];
        $hasPerubahan = $rkasCtx['has_perubahan'];
        $activePaguClass = $rkasCtx['active_pagu_class'];
        $rkasClass = $rkasCtx['rkas_class'];

        $bukuKasService = new BukuKasService($variant);

        // 1. Saldo Awal Anggaran Belanja Tersedia di Awal Bulan (ROB)
        $totalDanaTersedia = (float) $bukuKasService->hitungTotalDanaTersedia($penganggaran->id);
        $totalRealisasiSebelumBulan = 0.0;
        if ($bulanAngka > 1) {
            $totalRealisasiSebelumBulan = (float) $bkuClass::where($penganggaranFk, $penganggaran->id)
                ->where(function ($query) {
                    $query->where('is_bunga_record', false)->orWhereNull('is_bunga_record');
                })
                ->whereYear('tanggal_transaksi', $tahun)
                ->whereMonth('tanggal_transaksi', '<', $bulanAngka)
                ->sum('total_transaksi_kotor');
        }
        $saldoAwalAnggaran = max(0.0, $totalDanaTersedia - $totalRealisasiSebelumBulan);

        // 2. Ambil Transaksi Belanja BKU pada Bulan Berjalan
        $bkuData = $bkuClass::where($penganggaranFk, $penganggaran->id)
            ->whereMonth('tanggal_transaksi', $bulanAngka)
            ->whereYear('tanggal_transaksi', $tahun)
            ->where(function ($query) {
                $query->where('is_bunga_record', false)->orWhereNull('is_bunga_record');
            })
            ->with(['rekeningBelanja', 'kodeKegiatan'])
            ->orderBy('rekening_belanja_id')
            ->orderBy('tanggal_transaksi')
            ->get();

        // 3. Ambil Pagu RKAS Resmi (dari RKAS Perubahan jika ada) dan RKAS Awal
        $rkasPaguPerRekening = $activePaguClass::where($penganggaranFk, $penganggaran->id)
            ->selectRaw('kode_rekening_id, SUM(harga_satuan * jumlah) as pagu_rkas')
            ->groupBy('kode_rekening_id')
            ->pluck('pagu_rkas', 'kode_rekening_id')
            ->toArray();

        $rkasAwalPaguPerRekening = [];
        if ($hasPerubahan) {
            $rkasAwalPaguPerRekening = $rkasClass::where($penganggaranFk, $penganggaran->id)
                ->selectRaw('kode_rekening_id, SUM(harga_satuan * jumlah) as pagu_awal')
                ->groupBy('kode_rekening_id')
                ->pluck('pagu_awal', 'kode_rekening_id')
                ->toArray();
        }

        $realisasiTahunanPerRekening = $bkuClass::where($penganggaranFk, $penganggaran->id)
            ->where(function ($query) {
                $query->where('is_bunga_record', false)->orWhereNull('is_bunga_record');
            })
            ->whereYear('tanggal_transaksi', $tahun)
            ->selectRaw('rekening_belanja_id, SUM(total_transaksi_kotor) as total_realisasi')
            ->groupBy('rekening_belanja_id')
            ->pluck('total_realisasi', 'rekening_belanja_id')
            ->toArray();

        // 4. Proses Transaksi dan Kelompokkan per Rekening Belanja
        $kelompokMap = [];
        $runningTotal = 0.0;
        $totalRealisasiBulanIni = 0.0;
        $cleanFilter = $rekeningFilter ? strtolower(trim($rekeningFilter)) : null;

        // Alias ekspansi istilah populer
        $searchTerms = [];
        if ($cleanFilter !== null) {
            $searchTerms = [$cleanFilter];
            if ($cleanFilter === 'atk') {
                $searchTerms[] = 'alat tulis';
            } elseif ($cleanFilter === 'mamin') {
                $searchTerms[] = 'makan';
                $searchTerms[] = 'minum';
            } elseif ($cleanFilter === 'sarpras') {
                $searchTerms[] = 'prasarana';
                $searchTerms[] = 'sarana';
            } elseif ($cleanFilter === 'perdin') {
                $searchTerms[] = 'perjalanan dinas';
            }
        }

        foreach ($bkuData as $transaksi) {
            $rekId = $transaksi->rekening_belanja_id;
            $kodeRekening = $transaksi->rekeningBelanja?->kode_rekening ?? 'N/A';
            $namaRekening = $transaksi->rekeningBelanja?->rincian_objek ?? 'Lain-lain';

            // Filter rekening jika diminta
            if ($cleanFilter !== null) {
                $targetStr = strtolower($kodeRekening.' '.$namaRekening);
                $matched = false;
                foreach ($searchTerms as $term) {
                    if (str_contains($targetStr, $term)) {
                        $matched = true;
                        break;
                    }
                }
                if (! $matched) {
                    continue;
                }
            }

            if (! isset($kelompokMap[$kodeRekening])) {
                $paguRkas = (float) ($rkasPaguPerRekening[$rekId] ?? 0);
                $paguAwal = $hasPerubahan ? (float) ($rkasAwalPaguPerRekening[$rekId] ?? 0) : $paguRkas;
                $selisihPerubahan = $hasPerubahan ? ($paguRkas - $paguAwal) : 0.0;

                $statusPergeseran = 'Tetap';
                if ($hasPerubahan) {
                    if ($selisihPerubahan > 0) {
                        $statusPergeseran = 'Bertambah Rp '.number_format($selisihPerubahan, 0, ',', '.').' di RKAS Perubahan (Tahap 2)';
                    } elseif ($selisihPerubahan < 0) {
                        $statusPergeseran = 'Berkurang Rp '.number_format(abs($selisihPerubahan), 0, ',', '.').' di RKAS Perubahan (Tahap 2)';
                    }
                }

                $totalRealisasiTahunan = (float) ($realisasiTahunanPerRekening[$rekId] ?? 0);

                $kelompokMap[$kodeRekening] = [
                    'kode_rekening' => $kodeRekening,
                    'nama_rekening' => $namaRekening,
                    'pagu_rkas' => $paguRkas,
                    'pagu_awal' => $paguAwal,
                    'has_pergeseran' => abs($selisihPerubahan) > 0.01,
                    'selisih_pergeseran' => $selisihPerubahan,
                    'status_pergeseran' => $statusPergeseran,
                    'realisasi_bulan_ini' => 0.0,
                    'total_realisasi_tahunan' => $totalRealisasiTahunan,
                    'sisa_pagu_rkas' => max(0.0, $paguRkas - $totalRealisasiTahunan),
                    'transaksi' => [],
                ];
            }

            $realisasiKotor = (float) $transaksi->total_transaksi_kotor;
            $runningTotal += $realisasiKotor;
            $totalRealisasiBulanIni += $realisasiKotor;
            $kelompokMap[$kodeRekening]['realisasi_bulan_ini'] += $realisasiKotor;

            $sisaAnggaranKas = $saldoAwalAnggaran - $runningTotal;

            $kelompokMap[$kodeRekening]['transaksi'][] = [
                'tanggal' => Carbon::parse($transaksi->tanggal_transaksi)->format('Y-m-d'),
                'tanggal_formatted' => Carbon::parse($transaksi->tanggal_transaksi)->format('d/m/Y'),
                'no_bukti' => $transaksi->nomor_nota ?: ($transaksi->id_transaksi ?: '-'),
                'uraian' => $transaksi->uraian_opsional ?: $transaksi->uraian,
                'realisasi' => $realisasiKotor,
                'jumlah_kumulatif' => $runningTotal,
                'sisa_anggaran_kas' => $sisaAnggaranKas,
            ];
        }

        // Susun daftar rekapitulasi eksekutif per rekening
        $rekapObjek = [];
        $kelompokObjek = [];

        foreach ($kelompokMap as $kode => $kel) {
            $rekapObjek[] = [
                'kode_rekening' => $kel['kode_rekening'],
                'nama_rekening' => $kel['nama_rekening'],
                'pagu_rkas' => $kel['pagu_rkas'],
                'pagu_awal' => $kel['pagu_awal'],
                'has_pergeseran' => $kel['has_pergeseran'],
                'selisih_pergeseran' => $kel['selisih_pergeseran'],
                'status_pergeseran' => $kel['status_pergeseran'],
                'realisasi_bulan_ini' => $kel['realisasi_bulan_ini'],
                'total_realisasi_tahunan' => $kel['total_realisasi_tahunan'],
                'sisa_pagu_rkas' => $kel['sisa_pagu_rkas'],
                'transaksi_count' => count($kel['transaksi']),
            ];

            $kelompokObjek[] = [
                'kode_rekening' => $kel['kode_rekening'],
                'nama_rekening' => $kel['nama_rekening'],
                'total_realisasi' => $kel['realisasi_bulan_ini'],
                'transaksi' => $kel['transaksi'],
            ];
        }

        $sisaAnggaranKasAkhir = $saldoAwalAnggaran - $totalRealisasiBulanIni;

        return [
            'bulan' => $bulanFormatted,
            'tahun' => $tahun,
            'status_dokumen_anggaran' => $hasPerubahan ? 'RKAS Perubahan' : 'RKAS Awal (Murni)',
            'has_perubahan' => $hasPerubahan,
            'saldo_awal_anggaran' => $saldoAwalAnggaran,
            'total_realisasi_bulan_ini' => $totalRealisasiBulanIni,
            'sisa_anggaran_kas' => $sisaAnggaranKasAkhir,
            'filter_rekening' => $rekeningFilter,
            'rekap_objek_count' => count($rekapObjek),
            'rekap_objek' => $rekapObjek,
            'kelompok_objek' => $kelompokObjek,
        ];
    }

    /**
     * Tool: Pengambilan data resmi Register Penutupan Kas (Formulir BOS-K7B) bulanan
     */
    protected function getRegisterPenutupanKasMonthly(int $tahun, string $bulan, string $variant): array
    {
        VariantConfig::validateVariant($variant);

        $penganggaranClass = VariantConfig::getModelClass('penganggaran', $variant);
        $bkuClass = VariantConfig::getModelClass('bku', $variant);
        $penganggaranFk = VariantConfig::penganggaranFk($variant);

        $penganggaran = $penganggaranClass::where('tahun_anggaran', $tahun)
            ->with('sekolah')
            ->first();

        if (! $penganggaran) {
            return ['error' => 'Data penganggaran tidak ditemukan untuk tahun '.$tahun];
        }

        $validMonths = [
            'januari' => 1, 'februari' => 2, 'maret' => 3, 'april' => 4,
            'mei' => 5, 'juni' => 6, 'juli' => 7, 'agustus' => 8,
            'september' => 9, 'oktober' => 10, 'november' => 11, 'desember' => 12,
        ];

        $monthKey = strtolower(trim($bulan));
        $bulanAngka = $validMonths[$monthKey] ?? 3;
        $monthNames = [
            1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
            5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
            9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember',
        ];
        $bulanFormatted = $monthNames[$bulanAngka] ?? 'Maret';

        $bukuKasService = new BukuKasService($variant);

        // 1. Ambil data penerimaan dan pengeluaran umum (BKP Umum)
        $dataUmum = $bukuKasService->getDataFromBkpUmumCalculation($penganggaran->id, $tahun, $bulanFormatted, $bulanAngka);
        $totalPenerimaan = (float) ($dataUmum['totalPenerimaan'] ?? 0);
        $totalPengeluaran = (float) ($dataUmum['totalPengeluaran'] ?? 0);
        $saldoBuku = max(0, $totalPenerimaan - $totalPengeluaran);

        // 2. Ambil saldo kas tunai dan saldo bank
        $saldoKas = max(0, (float) $bukuKasService->getSaldoKasFromPembantu($penganggaran->id, $tahun, $bulanFormatted, $bulanAngka));
        $saldoBank = max(0, (float) $bukuKasService->hitungSaldoAkhirBkpBank($penganggaran->id, $tahun, $bulanFormatted));

        // 3. Denominasi uang kertas dan uang logam
        $uangKertasRaw = $bukuKasService->getDenominasiUangKertas($saldoKas);
        $totalUangKertas = (float) $bukuKasService->hitungTotalUangKertas($uangKertasRaw);

        $sisaUntukLogam = max(0, $saldoKas - $totalUangKertas);
        $uangLogamRaw = $bukuKasService->getDenominasiUangLogam($sisaUntukLogam);
        $totalUangLogam = (float) $bukuKasService->hitungTotalUangLogam($uangLogamRaw);

        // Filter denominasi agar hanya menampilkan pecahan dengan lembar/keping > 0 (ringkas & bersih)
        $uangKertas = array_values(array_filter($uangKertasRaw, fn ($item) => ($item['lembar'] ?? 0) > 0));
        $uangLogam = array_values(array_filter($uangLogamRaw, fn ($item) => ($item['keping'] ?? 0) > 0));

        $totalKasFisik = $totalUangKertas + $totalUangLogam + $saldoBank;

        // 4. Deteksi status penutupan resmi dari record bunga bank BKU
        $bungaRecord = $bkuClass::where($penganggaranFk, $penganggaran->id)
            ->whereMonth('tanggal_transaksi', $bulanAngka)
            ->whereYear('tanggal_transaksi', $tahun)
            ->where('is_bunga_record', true)
            ->first();

        $isClosed = ($bungaRecord && ! empty($bungaRecord->tanggal_tutup));
        if ($isClosed) {
            $tanggalPenutupan = Carbon::parse($bungaRecord->tanggal_tutup)->locale('id')->translatedFormat('d F Y');
        } else {
            $tanggalPenutupan = Carbon::create($tahun, $bulanAngka, 1)->endOfMonth()->locale('id')->translatedFormat('d F Y');
        }

        // 5. Cari tanggal penutupan bulan sebelumnya
        $prevDate = Carbon::create($tahun, $bulanAngka, 1)->subMonth();
        $prevMonth = $prevDate->month;
        $prevYear = $prevDate->year;

        $bungaRecordLalu = null;
        if ($prevYear === $tahun) {
            $bungaRecordLalu = $bkuClass::where($penganggaranFk, $penganggaran->id)
                ->whereMonth('tanggal_transaksi', $prevMonth)
                ->whereYear('tanggal_transaksi', $prevYear)
                ->where('is_bunga_record', true)
                ->first();
        } else {
            $penganggaranLalu = $penganggaranClass::where('tahun_anggaran', $prevYear)->first();
            if ($penganggaranLalu) {
                $bungaRecordLalu = $bkuClass::where($penganggaranFk, $penganggaranLalu->id)
                    ->whereMonth('tanggal_transaksi', $prevMonth)
                    ->whereYear('tanggal_transaksi', $prevYear)
                    ->where('is_bunga_record', true)
                    ->first();
            }
        }

        if ($bungaRecordLalu && ! empty($bungaRecordLalu->tanggal_tutup)) {
            $tanggalPenutupanLalu = Carbon::parse($bungaRecordLalu->tanggal_tutup)->locale('id')->translatedFormat('d F Y');
        } else {
            $tanggalPenutupanLalu = $prevDate->endOfMonth()->locale('id')->translatedFormat('d F Y');
        }

        // 6. Rekonsiliasi & Kepatuhan Audit
        $selisih = $saldoBuku - $totalKasFisik;
        $isBalanced = abs($selisih) < 0.01;

        if ($isBalanced) {
            $penjelasanPerbedaan = 'Saldo Buku dan Saldo Kas Fisik klop/seimbang (Rp 0 selisih). Dana tersimpan dengan aman pada rekening bank dan brankas tunai.';
        } else {
            $penjelasanPerbedaan = 'Terdapat selisih antara Saldo Buku dan Fisik Kas sebesar Rp '.number_format(abs($selisih), 0, ',', '.').'. Disarankan memeriksa kembali mutasi rekening koran atau pencatatan kuitansi belanja.';
        }

        $sekolah = $penganggaran->sekolah;

        return [
            'tahun' => $tahun,
            'bulan' => $bulanFormatted,
            'status_penutupan' => $isClosed ? 'Resmi Ditutup pada '.$tanggalPenutupan : 'Draft / Posisi Berjalan (Belum Ditutup di BKU)',
            'is_closed_officially' => $isClosed,
            'tanggal_penutupan' => $tanggalPenutupan,
            'tanggal_penutupan_lalu' => $tanggalPenutupanLalu,
            'posisi_kas_buku' => [
                'total_penerimaan' => $totalPenerimaan,
                'total_pengeluaran' => $totalPengeluaran,
                'saldo_buku' => $saldoBuku,
            ],
            'posisi_kas_fisik' => [
                'saldo_kas_tunai' => $saldoKas,
                'saldo_kas_bank' => $saldoBank,
                'total_kas_fisik' => $totalKasFisik,
            ],
            'rincian_denominasi' => [
                'uang_kertas' => $uangKertas,
                'total_uang_kertas' => $totalUangKertas,
                'uang_logam' => $uangLogam,
                'total_uang_logam' => $totalUangLogam,
                'has_tunai' => $saldoKas > 0,
            ],
            'rekonsiliasi' => [
                'selisih' => $selisih,
                'is_balanced' => $isBalanced,
                'penjelasan_perbedaan' => $penjelasanPerbedaan,
            ],
            'audit_compliance' => [
                'is_cash_limit_exceeded' => $saldoKas > 10000000,
                'cash_limit_amount' => 10000000,
                'bunga_bank' => $bungaRecord ? (float) $bungaRecord->bunga_bank : 0.0,
                'pajak_bunga' => $bungaRecord ? (float) $bungaRecord->pajak_bunga_bank : 0.0,
            ],
            'pejabat' => [
                'nama_bendahara' => $penganggaran->bendahara ?? '-',
                'nip_bendahara' => $penganggaran->nip_bendahara ?? '-',
                'nama_kepala_sekolah' => $penganggaran->kepala_sekolah ?? '-',
                'nip_kepala_sekolah' => $penganggaran->nip_kepala_sekolah ?? '-',
                'kecamatan' => $sekolah->kecamatan ?? '-',
            ],
        ];
    }

    /**
     * Tool: Mengambil data resmi Berita Acara Pemeriksaan Kas bulanan (Legalitas SK, Kas Fisik & BKU)
     */
    protected function getBeritaAcaraPenutupanKasMonthly(int $tahun, string $bulan, string $variant): array
    {
        VariantConfig::validateVariant($variant);

        $penganggaranClass = VariantConfig::getModelClass('penganggaran', $variant);
        $bkuClass = VariantConfig::getModelClass('bku', $variant);
        $penganggaranFk = VariantConfig::penganggaranFk($variant);

        $penganggaran = $penganggaranClass::where('tahun_anggaran', $tahun)
            ->with('sekolah')
            ->first();

        if (! $penganggaran) {
            return ['error' => 'Data penganggaran tidak ditemukan untuk tahun '.$tahun];
        }

        $validMonths = [
            'januari' => 1, 'februari' => 2, 'maret' => 3, 'april' => 4,
            'mei' => 5, 'juni' => 6, 'juli' => 7, 'agustus' => 8,
            'september' => 9, 'oktober' => 10, 'november' => 11, 'desember' => 12,
        ];

        $monthKey = strtolower(trim($bulan));
        $bulanAngka = $validMonths[$monthKey] ?? 3;
        $monthNames = [
            1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
            5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
            9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember',
        ];
        $bulanFormatted = $monthNames[$bulanAngka] ?? 'Maret';

        $bukuKasService = new BukuKasService($variant);

        // 1. Ambil data penerimaan dan pengeluaran umum (BKP Umum)
        $dataUmum = $bukuKasService->getDataFromBkpUmumCalculation($penganggaran->id, $tahun, $bulanFormatted, $bulanAngka);
        $totalPenerimaan = (float) ($dataUmum['totalPenerimaan'] ?? 0);
        $totalPengeluaran = (float) ($dataUmum['totalPengeluaran'] ?? 0);
        $saldoBuku = max(0, $totalPenerimaan - $totalPengeluaran);

        // 2. Ambil saldo kas tunai dan saldo bank
        $saldoKas = max(0, (float) $bukuKasService->getSaldoKasFromPembantu($penganggaran->id, $tahun, $bulanFormatted, $bulanAngka));
        $saldoBank = max(0, (float) $bukuKasService->hitungSaldoAkhirBkpBank($penganggaran->id, $tahun, $bulanFormatted));
        $totalKasHitung = $saldoKas + $saldoBank;

        // 3. Deteksi status penutupan resmi dari record bunga bank BKU
        $bungaRecord = $bkuClass::where($penganggaranFk, $penganggaran->id)
            ->whereMonth('tanggal_transaksi', $bulanAngka)
            ->whereYear('tanggal_transaksi', $tahun)
            ->where('is_bunga_record', true)
            ->first();

        $isClosed = ($bungaRecord && ! empty($bungaRecord->tanggal_tutup));
        if ($isClosed) {
            $tanggalTutupCarbon = Carbon::parse($bungaRecord->tanggal_tutup);
        } else {
            $tanggalTutupCarbon = Carbon::create($tahun, $bulanAngka, 1)->endOfMonth();
        }

        $hariMap = [
            0 => 'Minggu',
            1 => 'Senin',
            2 => 'Selasa',
            3 => 'Rabu',
            4 => 'Kamis',
            5 => 'Jumat',
            6 => 'Sabtu',
        ];
        $namaHari = $hariMap[$tanggalTutupCarbon->dayOfWeek] ?? 'Senin';
        $tanggalPemeriksaan = $tanggalTutupCarbon->locale('id')->translatedFormat('d F Y');

        // 4. Data SK Pejabat
        $tglSkKepsek = ! empty($penganggaran->tanggal_sk_kepala_sekolah)
            ? Carbon::parse($penganggaran->tanggal_sk_kepala_sekolah)->locale('id')->translatedFormat('d F Y')
            : '-';
        $tglSkBendahara = ! empty($penganggaran->tanggal_sk_bendahara)
            ? Carbon::parse($penganggaran->tanggal_sk_bendahara)->locale('id')->translatedFormat('d F Y')
            : '-';

        // 5. Rekonsiliasi
        $selisihTotal = $totalKasHitung - $saldoBuku;
        $selisihBukuTunai = $saldoBuku - $saldoKas;
        $isBalanced = abs($selisihTotal) < 0.01;

        if ($isBalanced) {
            $penjelasanRekonsiliasi = 'Saldo kas fisik yang dihitung di hadapan Bendahara (tunai brankas Rp '.number_format($saldoKas, 0, ',', '.').' + saldo bank Rp '.number_format($saldoBank, 0, ',', '.').') klop/seimbang dengan Saldo Buku Kas Umum (selisih Rp 0). Perbedaan antara Saldo Buku dan Kas Tunai Brankas sebesar Rp '.number_format($selisihBukuTunai, 0, ',', '.').' merupakan sisa dana yang tersimpan aman pada rekening bank.';
        } else {
            $penjelasanRekonsiliasi = 'Terdapat selisih antara Total Kas Fisik dan Saldo Buku Kas Umum sebesar Rp '.number_format(abs($selisihTotal), 0, ',', '.').'. Disarankan memeriksa kembali mutasi rekening koran atau pencatatan transaksi kuitansi belanja.';
        }

        $sekolah = $penganggaran->sekolah;

        return [
            'tahun' => $tahun,
            'bulan' => $bulanFormatted,
            'status_penutupan' => $isClosed ? 'Resmi Ditutup pada '.$tanggalPemeriksaan : 'Draft / Posisi Berjalan (Belum Ditutup di BKU)',
            'is_closed_officially' => $isClosed,
            'hari_pemeriksaan' => $namaHari,
            'tanggal_pemeriksaan' => $tanggalPemeriksaan,
            'pejabat_pemeriksa' => [
                'kepala_sekolah' => [
                    'nama' => $penganggaran->kepala_sekolah ?? '-',
                    'nip' => $penganggaran->nip_kepala_sekolah ?? '-',
                    'sk_nomor' => $penganggaran->sk_kepala_sekolah ?? '-',
                    'sk_tanggal' => $tglSkKepsek,
                    'jabatan' => 'Kepala Sekolah',
                ],
                'bendahara' => [
                    'nama' => $penganggaran->bendahara ?? '-',
                    'nip' => $penganggaran->nip_bendahara ?? '-',
                    'sk_nomor' => $penganggaran->sk_bendahara ?? '-',
                    'sk_tanggal' => $tglSkBendahara,
                    'jabatan' => 'Bendahara BOS',
                ],
            ],
            'lokasi' => [
                'nama_sekolah' => $sekolah->nama_sekolah ?? '-',
                'kecamatan' => $sekolah->kecamatan ?? '-',
            ],
            'posisi_kas_hitung' => [
                'uang_kertas_logam' => $saldoKas,
                'saldo_bank' => $saldoBank,
                'surat_berharga' => 0.0,
                'total_kas_hitung' => $totalKasHitung,
            ],
            'posisi_bku' => [
                'saldo_buku' => $saldoBuku,
            ],
            'rekonsiliasi' => [
                'selisih_total' => $selisihTotal,
                'is_balanced' => $isBalanced,
                'selisih_buku_tunai' => $selisihBukuTunai,
                'penjelasan_rekonsiliasi' => $penjelasanRekonsiliasi,
            ],
            'audit_compliance' => [
                'is_cash_limit_exceeded' => $saldoKas > 10000000,
                'cash_limit_amount' => 10000000,
                'sk_kepsek_lengkap' => ! empty($penganggaran->sk_kepala_sekolah) && $penganggaran->sk_kepala_sekolah !== '-',
                'sk_bendahara_lengkap' => ! empty($penganggaran->sk_bendahara) && $penganggaran->sk_bendahara !== '-',
            ],
        ];
    }

    /**
     * Tool: Rekapitulasi Realisasi Penggunaan Dana BOSP (Formulir BOS K-7A: 8 Standar & Komponen BOS)
     */
    protected function getRekapitulasiRealisasiBosp(int $tahun, string $periode, string $variant): array
    {
        VariantConfig::validateVariant($variant);

        $penganggaranClass = VariantConfig::getModelClass('penganggaran', $variant);
        $bkuClass = VariantConfig::getModelClass('bku', $variant);
        $penerimaanClass = VariantConfig::getModelClass('penerimaan_dana', $variant);
        $stsClass = VariantConfig::getModelClass('sts', $variant);
        $penganggaranFk = VariantConfig::penganggaranFk($variant);

        $penganggaran = $penganggaranClass::where('tahun_anggaran', $tahun)
            ->with('sekolah')
            ->first();

        if (! $penganggaran) {
            return ['error' => 'Data penganggaran tidak ditemukan untuk tahun '.$tahun];
        }

        $periodeLower = strtolower(trim($periode));
        $validMonths = [
            'januari' => 1, 'februari' => 2, 'maret' => 3, 'april' => 4,
            'mei' => 5, 'juni' => 6, 'juli' => 7, 'agustus' => 8,
            'september' => 9, 'oktober' => 10, 'november' => 11, 'desember' => 12,
        ];

        if ($periodeLower === 'tahap 1' || $periodeLower === 'tahap1' || $periodeLower === 'tahapan 1') {
            $bulanTarget = [1, 2, 3, 4, 5, 6];
            $periodeLabel = 'Tahap 1 (Januari – Juni) '.$tahun;
        } elseif ($periodeLower === 'tahap 2' || $periodeLower === 'tahap2' || $periodeLower === 'tahapan 2') {
            $bulanTarget = [7, 8, 9, 10, 11, 12];
            $periodeLabel = 'Tahap 2 (Juli – Desember) '.$tahun;
        } elseif (isset($validMonths[$periodeLower])) {
            $bulanAngka = $validMonths[$periodeLower];
            $bulanTarget = [$bulanAngka];
            $monthNames = [
                1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
                5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
                9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember',
            ];
            $periodeLabel = 'Bulan '.$monthNames[$bulanAngka].' '.$tahun;
        } else {
            // Default: Tahunan
            $bulanTarget = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
            $periodeLabel = 'Tahunan (Januari – Desember) '.$tahun;
        }

        $strukturProgram = [
            '01' => ['nama' => 'Pengembangan Kompetensi Lulusan', 'kode_prefix' => ['01.']],
            '02' => ['nama' => 'Pengembangan Standar Isi', 'kode_prefix' => ['02.']],
            '03' => ['nama' => 'Pengembangan Standar Proses', 'kode_prefix' => ['03.']],
            '04' => ['nama' => 'Pengembangan Pendidik dan Tenaga Kependidikan', 'kode_prefix' => ['04.']],
            '05' => ['nama' => 'Pengembangan Sarana dan Prasarana Sekolah', 'kode_prefix' => ['05.']],
            '06' => ['nama' => 'Pengembangan Standar Pengelolaan', 'kode_prefix' => ['06.']],
            '07' => ['nama' => 'Pengembangan Standar Pembiayaan', 'kode_prefix' => ['07.']],
            '08' => ['nama' => 'Pengembangan dan Implementasi Sistem Penilaian', 'kode_prefix' => ['08.']],
        ];

        $mappingKomponen = [
            1 => ['nama' => 'Penerimaan Peserta Didik Baru (PPDB)', 'kode_prefix' => ['03.01.']],
            2 => ['nama' => 'Pengembangan Perpustakaan', 'kode_prefix' => ['02.02.', '03.02.', '05.02.']],
            3 => ['nama' => 'Pelaksanaan Kegiatan Pembelajaran dan Ekstrakurikuler', 'kode_prefix' => ['02.03.', '03.03.', '08.03.']],
            4 => ['nama' => 'Pelaksanaan Kegiatan Asesmen/Evaluasi Pembelajaran', 'kode_prefix' => ['03.04.', '08.04.']],
            5 => ['nama' => 'Pelaksanaan Administrasi Kegiatan Sekolah', 'kode_prefix' => ['03.05.', '06.05.', '07.05.']],
            6 => ['nama' => 'Pengembangan Profesi Pendidik dan Tenaga Kependidikan', 'kode_prefix' => ['02.06.', '04.06.', '06.06.', '08.06.']],
            7 => ['nama' => 'Pembiayaan Langganan Daya dan Jasa', 'kode_prefix' => ['06.07.']],
            8 => ['nama' => 'Pemeliharaan Sarana dan Prasarana Sekolah', 'kode_prefix' => ['05.08.']],
            9 => ['nama' => 'Penyediaan Alat Multi Media Pembelajaran', 'kode_prefix' => ['05.09.']],
            10 => ['nama' => 'Penyelenggaraan Bursa Kerja Khusus, Praktik Kerja Industri, Praktik Uji Kompetensi', 'kode_prefix' => []],
            11 => ['nama' => 'Pembayaran Honor', 'kode_prefix' => ['07.12.']],
        ];

        $transaksiBku = $bkuClass::where($penganggaranFk, $penganggaran->id)
            ->whereIn(DB::raw('EXTRACT(MONTH FROM tanggal_transaksi)'), $bulanTarget)
            ->whereYear('tanggal_transaksi', $tahun)
            ->where('is_bunga_record', false)
            ->with(['kodeKegiatan', 'rekeningBelanja'])
            ->get();

        $realisasiPerProgram = array_fill_keys(array_keys($strukturProgram), 0.0);
        $realisasiPerKomponen = array_fill_keys(array_keys($mappingKomponen), 0.0);
        $totalRealisasi = 0.0;

        foreach ($transaksiBku as $trx) {
            $kegiatan = $trx->kodeKegiatan;
            if (! $kegiatan) {
                continue;
            }
            $kode = trim($kegiatan->kode);
            $nilai = (float) $trx->total_transaksi_kotor;

            // Cari program
            $programFound = null;
            foreach ($strukturProgram as $noUrut => $prog) {
                foreach ($prog['kode_prefix'] as $pfx) {
                    if (str_starts_with($kode, $pfx)) {
                        $programFound = $noUrut;
                        break 2;
                    }
                }
            }

            // Cari komponen
            $komponenFound = null;
            foreach ($mappingKomponen as $kId => $komp) {
                foreach ($komp['kode_prefix'] as $kpfx) {
                    if (str_starts_with($kode, $kpfx)) {
                        $komponenFound = $kId;
                        break 2;
                    }
                }
            }

            if ($programFound) {
                $realisasiPerProgram[$programFound] += $nilai;
            }
            if ($komponenFound) {
                $realisasiPerKomponen[$komponenFound] += $nilai;
            }
            $totalRealisasi += $nilai;
        }

        // Perhitungan Ringkasan Arus Kas
        $isPeriodeAwal = (count($bulanTarget) === 12 || $bulanTarget === [1, 2, 3, 4, 5, 6] || $bulanTarget === [1]);
        $saldoSebelumnya = 0.0;
        if (! $isPeriodeAwal) {
            $minBulan = min($bulanTarget);
            $bulanSebelumnya = range(1, $minBulan - 1);

            $penerimaanSebelumnya = (float) $penerimaanClass::where($penganggaranFk, $penganggaran->id)
                ->whereYear('tanggal_terima', $tahun)
                ->whereIn(DB::raw('EXTRACT(MONTH FROM tanggal_terima)'), $bulanSebelumnya)
                ->get()
                ->sum(function ($p) {
                    $t = (float) $p->jumlah_dana;
                    if ($p->sumber_dana === 'Bosp Reguler Tahap 1' && $p->saldo_awal) {
                        $t += (float) $p->saldo_awal;
                    }

                    return $t;
                });

            $realisasiSebelumnya = (float) $bkuClass::where($penganggaranFk, $penganggaran->id)
                ->whereIn(DB::raw('EXTRACT(MONTH FROM tanggal_transaksi)'), $bulanSebelumnya)
                ->whereYear('tanggal_transaksi', $tahun)
                ->where('is_bunga_record', false)
                ->sum('total_transaksi_kotor');

            $stsSebelumnya = (float) $stsClass::where($penganggaranFk, $penganggaran->id)
                ->whereYear('tanggal_bayar', $tahun)
                ->whereIn(DB::raw('EXTRACT(MONTH FROM tanggal_bayar)'), $bulanSebelumnya)
                ->where('is_bkp', true)
                ->sum('jumlah_bayar');

            $saldoSebelumnya = max(0, $penerimaanSebelumnya - $realisasiSebelumnya - $stsSebelumnya);
        }

        $penerimaanPeriodeIni = (float) $penerimaanClass::where($penganggaranFk, $penganggaran->id)
            ->whereYear('tanggal_terima', $tahun)
            ->whereIn(DB::raw('EXTRACT(MONTH FROM tanggal_terima)'), $bulanTarget)
            ->get()
            ->sum(function ($p) {
                $t = (float) $p->jumlah_dana;
                if ($p->sumber_dana === 'Bosp Reguler Tahap 1' && $p->saldo_awal) {
                    $t += (float) $p->saldo_awal;
                }

                return $t;
            });

        $stsPeriodeIni = (float) $stsClass::where($penganggaranFk, $penganggaran->id)
            ->whereYear('tanggal_bayar', $tahun)
            ->whereIn(DB::raw('EXTRACT(MONTH FROM tanggal_bayar)'), $bulanTarget)
            ->where('is_bkp', true)
            ->sum('jumlah_bayar');

        $totalPenerimaanBersih = max(0, $penerimaanPeriodeIni - $stsPeriodeIni);
        $akhirSaldo = max(0, $saldoSebelumnya + $totalPenerimaanBersih - $totalRealisasi);

        // Format 8 Standar
        $standarList = [];
        foreach ($strukturProgram as $noUrut => $prog) {
            $val = $realisasiPerProgram[$noUrut] ?? 0.0;
            $persen = $totalRealisasi > 0 ? round(($val / $totalRealisasi) * 100, 2) : 0.0;
            $standarList[] = [
                'no' => $noUrut,
                'nama_standar' => $prog['nama'],
                'realisasi' => $val,
                'persentase' => $persen,
            ];
        }

        // Format Komponen BOS Aktif (> 0)
        $komponenAktif = [];
        foreach ($mappingKomponen as $kId => $komp) {
            $val = $realisasiPerKomponen[$kId] ?? 0.0;
            if ($val > 0) {
                $persen = $totalRealisasi > 0 ? round(($val / $totalRealisasi) * 100, 2) : 0.0;
                $komponenAktif[] = [
                    'id' => $kId,
                    'nama_komponen' => $komp['nama'],
                    'realisasi' => $val,
                    'persentase' => $persen,
                ];
            }
        }

        $sekolah = $penganggaran->sekolah;

        return [
            'tahun' => $tahun,
            'periode' => $periodeLabel,
            'ringkasan_keuangan' => [
                'saldo_periode_sebelumnya' => $saldoSebelumnya,
                'total_penerimaan_periode_ini' => $totalPenerimaanBersih,
                'total_penggunaan_periode_ini' => $totalRealisasi,
                'akhir_saldo_periode_ini' => $akhirSaldo,
            ],
            'realisasi_8_standar' => $standarList,
            'komponen_bos_aktif' => $komponenAktif,
            'total_realisasi' => $totalRealisasi,
            'sekolah' => [
                'nama' => $sekolah->nama_sekolah ?? '-',
                'npsn' => $sekolah->npsn ?? '-',
                'kecamatan' => $sekolah->kecamatan ?? '-',
            ],
            'pejabat' => [
                'kepala_sekolah' => $penganggaran->kepala_sekolah ?? '-',
                'bendahara' => $penganggaran->bendahara ?? '-',
            ],
        ];
    }

    /**
     * Tool: Rekapitulasi Realisasi Belanja Per Rekening Belanja (LK 2: Operasi vs Modal)
     */
    protected function getRekapitulasiRealisasiPerRekening(int $tahun, string $periode, string $variant): array
    {
        VariantConfig::validateVariant($variant);

        $penganggaranClass = VariantConfig::getModelClass('penganggaran', $variant);
        $bkuClass = VariantConfig::getModelClass('bku', $variant);
        $penganggaranFk = VariantConfig::penganggaranFk($variant);

        $penganggaran = $penganggaranClass::where('tahun_anggaran', $tahun)
            ->with('sekolah')
            ->first();

        if (! $penganggaran) {
            return ['error' => 'Data penganggaran tidak ditemukan untuk tahun '.$tahun];
        }

        $periodeLower = strtolower(trim($periode));
        if ($periodeLower === 'tahap 1' || $periodeLower === 'tahap1') {
            $bulanTarget = [1, 2, 3, 4, 5, 6];
            $labelPeriode = 'Tahap 1 (Januari – Juni) '.$tahun;
        } elseif ($periodeLower === 'tahap 2' || $periodeLower === 'tahap2') {
            $bulanTarget = [7, 8, 9, 10, 11, 12];
            $labelPeriode = 'Tahap 2 (Juli – Desember) '.$tahun;
        } else {
            $bulanTarget = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
            $labelPeriode = 'Tahunan (Januari – Desember) '.$tahun;
        }

        $transaksi = $bkuClass::where($penganggaranFk, $penganggaran->id)
            ->whereYear('tanggal_transaksi', $tahun)
            ->whereIn(DB::raw('EXTRACT(MONTH FROM tanggal_transaksi)'), $bulanTarget)
            ->where('is_bunga_record', false)
            ->whereHas('rekeningBelanja')
            ->with('rekeningBelanja')
            ->get();

        $pakaiHabis = 0.0;
        $barangJasa = 0.0;
        $modalPeralatan = 0.0;
        $modalAsetLain = 0.0;

        foreach ($transaksi as $trx) {
            $kode = $trx->rekeningBelanja->kode_rekening;
            $jumlah = (float) $trx->total_transaksi_kotor;

            if (str_starts_with($kode, '5.1.02.01')) {
                $pakaiHabis += $jumlah;
            } elseif (str_starts_with($kode, '5.1.02.02') || str_starts_with($kode, '5.1.02.03') || str_starts_with($kode, '5.1.02.04')) {
                $barangJasa += $jumlah;
            } elseif (str_starts_with($kode, '5.2.02')) {
                $modalPeralatan += $jumlah;
            } elseif (str_starts_with($kode, '5.2.05')) {
                $modalAsetLain += $jumlah;
            }
        }

        $subtotalOperasi = $pakaiHabis + $barangJasa;
        $subtotalModal = $modalPeralatan + $modalAsetLain;
        $totalBelanja = $subtotalOperasi + $subtotalModal;

        $persenOperasi = $totalBelanja > 0 ? round(($subtotalOperasi / $totalBelanja) * 100, 2) : 0.0;
        $persenModal = $totalBelanja > 0 ? round(($subtotalModal / $totalBelanja) * 100, 2) : 0.0;

        $sekolah = $penganggaran->sekolah;

        return [
            'tahun' => $tahun,
            'periode' => $labelPeriode,
            'belanja_operasi' => [
                'pakai_habis' => $pakaiHabis,
                'barang_jasa' => $barangJasa,
                'subtotal_operasi' => $subtotalOperasi,
                'persentase_operasi' => $persenOperasi,
            ],
            'belanja_modal' => [
                'peralatan_mesin' => $modalPeralatan,
                'aset_tetap_lainnya' => $modalAsetLain,
                'subtotal_modal' => $subtotalModal,
                'persentase_modal' => $persenModal,
            ],
            'total_belanja' => $totalBelanja,
            'sekolah' => [
                'nama' => $sekolah->nama_sekolah ?? '-',
                'npsn' => $sekolah->npsn ?? '-',
                'kecamatan' => $sekolah->kecamatan ?? '-',
            ],
        ];
    }

    /**
     * Tool: Buku Pembantu Barang Habis Pakai (BHP)
     */
    protected function getBukuPembantuBhp(int $tahun, string $periode, string $variant): array
    {
        VariantConfig::validateVariant($variant);

        $penganggaranClass = VariantConfig::getModelClass('penganggaran', $variant);
        $bkuClass = VariantConfig::getModelClass('bku', $variant);
        $penganggaranFk = VariantConfig::penganggaranFk($variant);

        $penganggaran = $penganggaranClass::where('tahun_anggaran', $tahun)
            ->with('sekolah')
            ->first();

        if (! $penganggaran) {
            return ['error' => 'Data penganggaran tidak ditemukan untuk tahun '.$tahun];
        }

        $monthNames = [
            1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
            5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
            9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember',
        ];

        $monthMap = [
            'januari' => 1, 'februari' => 2, 'maret' => 3, 'april' => 4,
            'mei' => 5, 'juni' => 6, 'juli' => 7, 'agustus' => 8,
            'september' => 9, 'oktober' => 10, 'november' => 11, 'desember' => 12,
        ];

        $periodeLower = strtolower(trim($periode));
        if (str_contains($periodeLower, 'tahap 1') || str_contains($periodeLower, 'tahap1')) {
            $bulanTarget = [1, 2, 3, 4, 5, 6];
            $labelPeriode = 'Tahap 1 (Januari – Juni) '.$tahun;
        } elseif (str_contains($periodeLower, 'tahap 2') || str_contains($periodeLower, 'tahap2')) {
            $bulanTarget = [7, 8, 9, 10, 11, 12];
            $labelPeriode = 'Tahap 2 (Juli – Desember) '.$tahun;
        } else {
            $foundMonth = null;
            foreach ($monthMap as $mKey => $mIndex) {
                if (str_contains($periodeLower, $mKey)) {
                    $foundMonth = $mIndex;
                    break;
                }
            }

            if ($foundMonth !== null) {
                $bulanTarget = [$foundMonth];
                $labelPeriode = 'Bulan '.$monthNames[$foundMonth].' '.$tahun;
            } else {
                $bulanTarget = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
                $labelPeriode = 'Tahunan (Januari – Desember) '.$tahun;
            }
        }

        $transaksis = $bkuClass::where($penganggaranFk, $penganggaran->id)
            ->whereYear('tanggal_transaksi', $tahun)
            ->whereIn(DB::raw('EXTRACT(MONTH FROM tanggal_transaksi)'), $bulanTarget)
            ->where('is_bunga_record', false)
            ->whereHas('rekeningBelanja', function ($q) {
                $q->where('kode_rekening', 'like', '5.1.02.01.01%');
            })
            ->with(['kodeKegiatan', 'rekeningBelanja', 'uraianDetails'])
            ->orderBy('tanggal_transaksi', 'asc')
            ->get();

        $items = [];
        $totalRealisasi = 0.0;
        $nomorUrut = 1;

        foreach ($transaksis as $bku) {
            $bkuKegiatan = $bku->kodeKegiatan;
            $bkuRekening = $bku->rekeningBelanja;

            if ($bku->uraianDetails && $bku->uraianDetails->isNotEmpty()) {
                foreach ($bku->uraianDetails as $detail) {
                    $kegiatan = $detail->kodeKegiatan ?? $bkuKegiatan;
                    $rekening = $detail->rekeningBelanja ?? $bkuRekening;
                    $subtotal = (float) $detail->jumlah;
                    $totalRealisasi += $subtotal;

                    $items[] = [
                        'no' => $nomorUrut++,
                        'tanggal' => Carbon::parse($bku->tanggal_transaksi)->format('d-m-Y'),
                        'kode_kegiatan' => $kegiatan ? $kegiatan->kode : '-',
                        'kode_rekening' => $rekening ? $rekening->kode_rekening : '-',
                        'nama_rekening' => $rekening ? ($rekening->rincian_objek ?? $rekening->nama_rekening ?? '-') : '-',
                        'no_bukti' => $bku->id_transaksi,
                        'uraian' => $detail->uraian ?: $bku->uraian_transaksi,
                        'volume' => (float) $detail->volume,
                        'satuan' => $detail->satuan ?: 'Item',
                        'harga_satuan' => (float) $detail->harga_satuan,
                        'realisasi' => $subtotal,
                    ];
                }
            } else {
                $subtotal = (float) $bku->total_transaksi_kotor;
                $totalRealisasi += $subtotal;

                $items[] = [
                    'no' => $nomorUrut++,
                    'tanggal' => Carbon::parse($bku->tanggal_transaksi)->format('d-m-Y'),
                    'kode_kegiatan' => $bkuKegiatan ? $bkuKegiatan->kode : '-',
                    'kode_rekening' => $bkuRekening ? $bkuRekening->kode_rekening : '-',
                    'nama_rekening' => $bkuRekening ? ($bkuRekening->rincian_objek ?? $bkuRekening->nama_rekening ?? '-') : '-',
                    'no_bukti' => $bku->id_transaksi,
                    'uraian' => $bku->uraian_transaksi,
                    'volume' => 1.0,
                    'satuan' => 'Paket',
                    'harga_satuan' => $subtotal,
                    'realisasi' => $subtotal,
                ];
            }
        }

        $sekolah = $penganggaran->sekolah;

        return [
            'tahun' => $tahun,
            'periode' => $labelPeriode,
            'jenis' => 'Buku Pembantu Barang Habis Pakai (BHP)',
            'total_realisasi' => $totalRealisasi,
            'total_item' => count($items),
            'items' => $items,
            'sekolah' => [
                'nama' => $sekolah->nama_sekolah ?? '-',
                'npsn' => $sekolah->npsn ?? '-',
                'kecamatan' => $sekolah->kecamatan ?? '-',
            ],
            'pejabat' => [
                'kepala_sekolah' => $penganggaran->kepala_sekolah ?? '-',
                'bendahara' => $penganggaran->bendahara ?? '-',
            ],
        ];
    }

    /**
     * Tool: Buku Pembantu Barang Modal / Aset (BHM)
     */
    protected function getBukuPembantuBhm(int $tahun, string $periode, string $variant): array
    {
        VariantConfig::validateVariant($variant);

        $penganggaranClass = VariantConfig::getModelClass('penganggaran', $variant);
        $bkuClass = VariantConfig::getModelClass('bku', $variant);
        $penganggaranFk = VariantConfig::penganggaranFk($variant);

        $penganggaran = $penganggaranClass::where('tahun_anggaran', $tahun)
            ->with('sekolah')
            ->first();

        if (! $penganggaran) {
            return ['error' => 'Data penganggaran tidak ditemukan untuk tahun '.$tahun];
        }

        $monthNames = [
            1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
            5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
            9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember',
        ];

        $monthMap = [
            'januari' => 1, 'februari' => 2, 'maret' => 3, 'april' => 4,
            'mei' => 5, 'juni' => 6, 'juli' => 7, 'agustus' => 8,
            'september' => 9, 'oktober' => 10, 'november' => 11, 'desember' => 12,
        ];

        $periodeLower = strtolower(trim($periode));
        if (str_contains($periodeLower, 'tahap 1') || str_contains($periodeLower, 'tahap1')) {
            $bulanTarget = [1, 2, 3, 4, 5, 6];
            $labelPeriode = 'Tahap 1 (Januari – Juni) '.$tahun;
        } elseif (str_contains($periodeLower, 'tahap 2') || str_contains($periodeLower, 'tahap2')) {
            $bulanTarget = [7, 8, 9, 10, 11, 12];
            $labelPeriode = 'Tahap 2 (Juli – Desember) '.$tahun;
        } else {
            $foundMonth = null;
            foreach ($monthMap as $mKey => $mIndex) {
                if (str_contains($periodeLower, $mKey)) {
                    $foundMonth = $mIndex;
                    break;
                }
            }

            if ($foundMonth !== null) {
                $bulanTarget = [$foundMonth];
                $labelPeriode = 'Bulan '.$monthNames[$foundMonth].' '.$tahun;
            } else {
                $bulanTarget = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
                $labelPeriode = 'Tahunan (Januari – Desember) '.$tahun;
            }
        }

        $transaksis = $bkuClass::where($penganggaranFk, $penganggaran->id)
            ->whereYear('tanggal_transaksi', $tahun)
            ->whereIn(DB::raw('EXTRACT(MONTH FROM tanggal_transaksi)'), $bulanTarget)
            ->where('is_bunga_record', false)
            ->whereHas('rekeningBelanja', function ($q) {
                $q->where('kode_rekening', 'like', '5.2%');
            })
            ->with(['kodeKegiatan', 'rekeningBelanja', 'uraianDetails'])
            ->orderBy('tanggal_transaksi', 'asc')
            ->get();

        $items = [];
        $totalRealisasi = 0.0;
        $subtotalPeralatan = 0.0;
        $subtotalAsetLain = 0.0;
        $nomorUrut = 1;

        foreach ($transaksis as $bku) {
            $bkuKegiatan = $bku->kodeKegiatan;
            $bkuRekening = $bku->rekeningBelanja;

            if ($bku->uraianDetails && $bku->uraianDetails->isNotEmpty()) {
                foreach ($bku->uraianDetails as $detail) {
                    $kegiatan = $detail->kodeKegiatan ?? $bkuKegiatan;
                    $rekening = $detail->rekeningBelanja ?? $bkuRekening;
                    $subtotal = (float) $detail->jumlah;
                    $totalRealisasi += $subtotal;

                    $kodeRek = $rekening ? $rekening->kode_rekening : '';
                    if (str_starts_with($kodeRek, '5.2.02')) {
                        $subtotalPeralatan += $subtotal;
                        $kategori = 'Peralatan dan Mesin';
                    } elseif (str_starts_with($kodeRek, '5.2.05')) {
                        $subtotalAsetLain += $subtotal;
                        $kategori = 'Aset Tetap Lainnya (Buku Perpustakaan)';
                    } else {
                        $kategori = 'Belanja Modal';
                    }

                    $items[] = [
                        'no' => $nomorUrut++,
                        'tanggal' => Carbon::parse($bku->tanggal_transaksi)->format('d-m-Y'),
                        'kode_kegiatan' => $kegiatan ? $kegiatan->kode : '-',
                        'kode_rekening' => $rekening ? $rekening->kode_rekening : '-',
                        'nama_rekening' => $rekening ? ($rekening->rincian_objek ?? $rekening->nama_rekening ?? '-') : '-',
                        'kategori_aset' => $kategori,
                        'no_bukti' => $bku->id_transaksi,
                        'uraian' => $detail->uraian ?: $bku->uraian_transaksi,
                        'volume' => (float) $detail->volume,
                        'satuan' => $detail->satuan ?: 'Unit',
                        'harga_satuan' => (float) $detail->harga_satuan,
                        'realisasi' => $subtotal,
                    ];
                }
            } else {
                $subtotal = (float) $bku->total_transaksi_kotor;
                $totalRealisasi += $subtotal;

                $kodeRek = $bkuRekening ? $bkuRekening->kode_rekening : '';
                if (str_starts_with($kodeRek, '5.2.02')) {
                    $subtotalPeralatan += $subtotal;
                    $kategori = 'Peralatan dan Mesin';
                } elseif (str_starts_with($kodeRek, '5.2.05')) {
                    $subtotalAsetLain += $subtotal;
                    $kategori = 'Aset Tetap Lainnya (Buku Perpustakaan)';
                } else {
                    $kategori = 'Belanja Modal';
                }

                $items[] = [
                    'no' => $nomorUrut++,
                    'tanggal' => Carbon::parse($bku->tanggal_transaksi)->format('d-m-Y'),
                    'kode_kegiatan' => $bkuKegiatan ? $bkuKegiatan->kode : '-',
                    'kode_rekening' => $bkuRekening ? $bkuRekening->kode_rekening : '-',
                    'nama_rekening' => $bkuRekening ? ($bkuRekening->rincian_objek ?? $bkuRekening->nama_rekening ?? '-') : '-',
                    'kategori_aset' => $kategori,
                    'no_bukti' => $bku->id_transaksi,
                    'uraian' => $bku->uraian_transaksi,
                    'volume' => 1.0,
                    'satuan' => 'Paket',
                    'harga_satuan' => $subtotal,
                    'realisasi' => $subtotal,
                ];
            }
        }

        $sekolah = $penganggaran->sekolah;

        return [
            'tahun' => $tahun,
            'periode' => $labelPeriode,
            'jenis' => 'Buku Pembantu Barang Modal / Aset (BHM)',
            'total_realisasi' => $totalRealisasi,
            'total_item' => count($items),
            'komposisi' => [
                'peralatan_mesin' => $subtotalPeralatan,
                'aset_tetap_lainnya' => $subtotalAsetLain,
            ],
            'items' => $items,
            'sekolah' => [
                'nama' => $sekolah->nama_sekolah ?? '-',
                'npsn' => $sekolah->npsn ?? '-',
                'kecamatan' => $sekolah->kecamatan ?? '-',
            ],
            'pejabat' => [
                'kepala_sekolah' => $penganggaran->kepala_sekolah ?? '-',
                'bendahara' => $penganggaran->bendahara ?? '-',
            ],
        ];
    }

    /**
     * Tool: Ringkasan Eksekutif RKAS Perubahan & Kepatuhan Regulasi BOSP
     */
    protected function getRkasPerubahanSummary(int $tahun, string $variant): array
    {
        VariantConfig::validateVariant($variant);

        $penganggaranClass = VariantConfig::getModelClass('penganggaran', $variant);
        $rkasClass = VariantConfig::getModelClass('rkas', $variant);
        $rkasPerubahanClass = VariantConfig::getModelClass('rkas_perubahan', $variant);
        $rekamanClass = VariantConfig::getModelClass('rekaman_perubahan', $variant);
        $penganggaranFk = VariantConfig::penganggaranFk($variant);

        $penganggaran = $penganggaranClass::where('tahun_anggaran', $tahun)
            ->with('sekolah')
            ->first();

        if (! $penganggaran) {
            return ['error' => 'Data penganggaran tidak ditemukan untuk tahun '.$tahun];
        }

        $paguAnggaran = (float) ($penganggaran->pagu_anggaran ?? 0);
        $sekolah = $penganggaran->sekolah;
        $statusSekolah = $sekolah?->status_sekolah ?? 'Swasta';

        $hasPerubahan = $rkasPerubahanClass && $rkasPerubahanClass::where($penganggaranFk, $penganggaran->id)->exists();

        if (! $hasPerubahan) {
            return [
                'tahun' => $tahun,
                'status_perubahan' => false,
                'keterangan_status' => "Dokumen RKAS Perubahan belum disusun/aktif untuk Tahun Anggaran {$tahun}. Sekolah saat ini masih menggunakan dokumen perencanaan RKAS Murni awal tahun.",
                'pagu_anggaran' => $paguAnggaran,
                'sekolah' => [
                    'nama' => $sekolah?->nama_sekolah ?? '-',
                    'npsn' => $sekolah?->npsn ?? '-',
                    'status_sekolah' => $statusSekolah,
                ],
            ];
        }

        $murniItems = $rkasClass::where($penganggaranFk, $penganggaran->id)
            ->with(['kodeKegiatan', 'rekeningBelanja'])
            ->get();

        $perubahanItems = $rkasPerubahanClass::where($penganggaranFk, $penganggaran->id)
            ->with(['kodeKegiatan', 'rekeningBelanja'])
            ->get();

        $tahap1Months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];

        $totMurni = 0.0;
        $totMurniT1 = 0.0;
        $totMurniT2 = 0.0;
        $murniOperasi = 0.0;
        $murniModal = 0.0;

        foreach ($murniItems as $m) {
            $sub = (float) $m->jumlah * (float) $m->harga_satuan;
            $totMurni += $sub;
            if (in_array($m->bulan, $tahap1Months)) {
                $totMurniT1 += $sub;
            } else {
                $totMurniT2 += $sub;
            }
            $kodeRek = $m->rekeningBelanja?->kode_rekening ?? '';
            if (str_starts_with($kodeRek, '5.2')) {
                $murniModal += $sub;
            } else {
                $murniOperasi += $sub;
            }
        }

        $totPerubahan = 0.0;
        $totPerubahanT1 = 0.0;
        $totPerubahanT2 = 0.0;
        $perubahanOperasi = 0.0;
        $perubahanModal = 0.0;

        $bukuAnggaran = 0.0;
        $honorAnggaran = 0.0;
        $sarprasAnggaran = 0.0;

        foreach ($perubahanItems as $c) {
            $sub = (float) $c->jumlah * (float) $c->harga_satuan;
            $totPerubahan += $sub;
            if (in_array($c->bulan, $tahap1Months)) {
                $totPerubahanT1 += $sub;
            } else {
                $totPerubahanT2 += $sub;
            }
            $kodeRek = $c->rekeningBelanja?->kode_rekening ?? '';
            if (str_starts_with($kodeRek, '5.2')) {
                $perubahanModal += $sub;
            } else {
                $perubahanOperasi += $sub;
            }

            // Kepatuhan regulasi BOSP
            $kegiatan = $c->kodeKegiatan;
            $kegKode = $kegiatan?->kode ?? '';
            $subProg = $kegiatan?->sub_program ?? '';
            $kegUraian = $kegiatan?->uraian ?? '';
            $itemUraian = $c->uraian ?? '';

            if (str_starts_with($kegKode, '05.02.') || str_starts_with($kegKode, '02.02.') || str_starts_with($kegKode, '03.02.') ||
                stripos($subProg, 'perpustakaan') !== false || stripos($kegUraian, 'buku') !== false || stripos($kegUraian, 'perpustakaan') !== false) {
                $bukuAnggaran += $sub;
            }

            if (str_starts_with($kegKode, '07.12.') || stripos($subProg, 'honor') !== false || stripos($subProg, 'gaji') !== false ||
                stripos($kegUraian, 'honor') !== false || stripos($kegUraian, 'gaji') !== false ||
                stripos($itemUraian, 'honor') !== false || stripos($itemUraian, 'gaji') !== false) {
                $honorAnggaran += $sub;
            }

            if (str_starts_with($kegKode, '05.08.')) {
                $sarprasAnggaran += $sub;
            }
        }

        // Grouping tahunan resmi (Formulir BOS-K3 / kelolaDataRkas SIKAS)
        $makeGroupKey = function ($item) {
            $kode = optional($item->kodeKegiatan)->kode ?? '0';
            $rek = optional($item->rekeningBelanja)->kode_rekening ?? '0';
            $uraian = strtolower(trim($item->uraian));
            $harga = (float) $item->harga_satuan;

            return "{$kode}|{$rek}|{$uraian}|{$harga}";
        };

        $grouped = [];

        foreach ($murniItems as $m) {
            $key = $makeGroupKey($m);
            if (! isset($grouped[$key])) {
                $grouped[$key] = [
                    'kode_kegiatan' => optional($m->kodeKegiatan)->kode ?? '-',
                    'nama_kegiatan' => optional($m->kodeKegiatan)->sub_program ?? '-',
                    'kode_rekening' => optional($m->rekeningBelanja)->kode_rekening ?? '-',
                    'nama_rekening' => optional($m->rekeningBelanja)->rincian_objek ?? '-',
                    'uraian' => $m->uraian,
                    'satuan' => $m->satuan,
                    'harga_satuan' => (float) $m->harga_satuan,
                    'volume_murni' => 0.0,
                    'jumlah_murni' => 0.0,
                    'volume_perubahan' => 0.0,
                    'jumlah_perubahan' => 0.0,
                    'bulan_murni' => [],
                    'bulan_perubahan' => [],
                ];
            }
            $grouped[$key]['volume_murni'] += (float) $m->jumlah;
            $grouped[$key]['jumlah_murni'] += (float) ($m->jumlah * $m->harga_satuan);
            $grouped[$key]['bulan_murni'][] = $m->bulan;
        }

        foreach ($perubahanItems as $c) {
            $key = $makeGroupKey($c);
            if (! isset($grouped[$key])) {
                $grouped[$key] = [
                    'kode_kegiatan' => optional($c->kodeKegiatan)->kode ?? '-',
                    'nama_kegiatan' => optional($c->kodeKegiatan)->sub_program ?? '-',
                    'kode_rekening' => optional($c->rekeningBelanja)->kode_rekening ?? '-',
                    'nama_rekening' => optional($c->rekeningBelanja)->rincian_objek ?? '-',
                    'uraian' => $c->uraian,
                    'satuan' => $c->satuan,
                    'harga_satuan' => (float) $c->harga_satuan,
                    'volume_murni' => 0.0,
                    'jumlah_murni' => 0.0,
                    'volume_perubahan' => 0.0,
                    'jumlah_perubahan' => 0.0,
                    'bulan_murni' => [],
                    'bulan_perubahan' => [],
                ];
            }
            $grouped[$key]['volume_perubahan'] += (float) $c->jumlah;
            $grouped[$key]['jumlah_perubahan'] += (float) ($c->jumlah * $c->harga_satuan);
            $grouped[$key]['bulan_perubahan'][] = $c->bulan;
        }

        $totBertambah = 0.0;
        $totBerkurang = 0.0;
        $itemBertambahCount = 0;
        $itemBerkurangCount = 0;
        $itemTetapCount = 0;
        $itemBaruCount = 0;
        $itemDihapusCount = 0;
        $bukuKenaikan = 0.0;

        foreach ($grouped as $key => $g) {
            $diff = $g['jumlah_perubahan'] - $g['jumlah_murni'];
            if ($diff > 0) {
                $totBertambah += $diff;
                $itemBertambahCount++;
                if ($g['jumlah_murni'] == 0) {
                    $itemBaruCount++;
                }
                if (stripos($g['uraian'], 'SMP') !== false || stripos($g['nama_rekening'], 'Buku') !== false || str_starts_with($g['kode_kegiatan'], '05.02.')) {
                    $bukuKenaikan += $diff;
                }
            } elseif ($diff < 0) {
                $totBerkurang += abs($diff);
                $itemBerkurangCount++;
                if ($g['jumlah_perubahan'] == 0) {
                    $itemDihapusCount++;
                }
            } else {
                $itemTetapCount++;
            }
        }

        // Kepatuhan regulasi BOSP
        $bukuPersen = $paguAnggaran > 0 ? round(($bukuAnggaran / $paguAnggaran) * 100, 2) : 0;
        $isNegeri = stripos($statusSekolah, 'negeri') !== false;
        $honorMaxBatas = $isNegeri ? 20.0 : 40.0;
        $honorPersen = $paguAnggaran > 0 ? round(($honorAnggaran / $paguAnggaran) * 100, 2) : 0;
        $sarprasPersen = $paguAnggaran > 0 ? round(($sarprasAnggaran / $paguAnggaran) * 100, 2) : 0;

        // Log rekaman perubahan terbaru
        $logs = [];
        if ($rekamanClass) {
            $logs = $rekamanClass::where($penganggaranFk, $penganggaran->id)
                ->orderBy('created_at', 'desc')
                ->take(5)
                ->get()
                ->map(function ($log) {
                    return [
                        'tanggal' => $log->created_at ? Carbon::parse($log->created_at)->format('d-m-Y H:i') : '-',
                        'aksi' => $log->action,
                        'keterangan' => $log->description,
                    ];
                })
                ->toArray();
        }

        return [
            'tahun' => $tahun,
            'status_perubahan' => true,
            'keterangan_status' => "Dokumen RKAS Perubahan telah ditetapkan dan aktif di sistem untuk Tahun Anggaran {$tahun}.",
            'pagu_anggaran' => $paguAnggaran,
            'komparasi_tahapan' => [
                'total_anggaran' => [
                    'murni' => $totMurni,
                    'perubahan' => $totPerubahan,
                    'selisih' => $totPerubahan - $totMurni,
                ],
                'tahap_1' => [
                    'murni' => $totMurniT1,
                    'perubahan' => $totPerubahanT1,
                    'selisih' => $totPerubahanT1 - $totMurniT1,
                ],
                'tahap_2' => [
                    'murni' => $totMurniT2,
                    'perubahan' => $totPerubahanT2,
                    'selisih' => $totPerubahanT2 - $totMurniT2,
                ],
            ],
            'komparasi_kelompok_belanja' => [
                'belanja_operasi' => [
                    'murni' => $murniOperasi,
                    'perubahan' => $perubahanOperasi,
                    'selisih' => $perubahanOperasi - $murniOperasi,
                    'persentase_perubahan' => $totPerubahan > 0 ? round(($perubahanOperasi / $totPerubahan) * 100, 2) : 0,
                ],
                'belanja_modal' => [
                    'murni' => $murniModal,
                    'perubahan' => $perubahanModal,
                    'selisih' => $perubahanModal - $murniModal,
                    'persentase_perubahan' => $totPerubahan > 0 ? round(($perubahanModal / $totPerubahan) * 100, 2) : 0,
                ],
            ],
            'kepatuhan_regulasi_bosp' => [
                'belanja_buku' => [
                    'anggaran' => $bukuAnggaran,
                    'persentase' => $bukuPersen,
                    'ambang_batas' => 'Minimal 10%',
                    'status' => $bukuPersen >= 10.0 ? 'Memenuhi' : 'Belum Memenuhi',
                    'catatan' => $bukuPersen >= 10.0
                        ? "Anggaran penyediaan buku ({$bukuPersen}%) sudah memenuhi batas minimal 10% dari total pagu."
                        : "Anggaran penyediaan buku ({$bukuPersen}%) belum memenuhi ketentuan minimal 10% dari total pagu anggaran.",
                ],
                'honorarium' => [
                    'anggaran' => $honorAnggaran,
                    'persentase' => $honorPersen,
                    'ambang_batas' => "Maksimal {$honorMaxBatas}% (".($isNegeri ? 'Sekolah Negeri' : 'Sekolah Swasta').')',
                    'status' => $honorPersen <= $honorMaxBatas ? 'Memenuhi' : 'Melebihi Batas Maksimal',
                    'catatan' => $honorPersen <= $honorMaxBatas
                        ? "Porsi belanja honorarium ({$honorPersen}%) aman dan sesuai batas maksimal {$honorMaxBatas}%."
                        : "Porsi belanja honorarium ({$honorPersen}%) melebihi ambang batas maksimal {$honorMaxBatas}%.",
                ],
                'pemeliharaan_sarpras' => [
                    'anggaran' => $sarprasAnggaran,
                    'persentase' => $sarprasPersen,
                    'ambang_batas' => 'Maksimal 20%',
                    'status' => $sarprasPersen <= 20.0 ? 'Memenuhi' : 'Melebihi Batas Maksimal',
                    'catatan' => $sarprasPersen <= 20.0
                        ? "Porsi belanja pemeliharaan sarpras ({$sarprasPersen}%) aman dan sesuai batas maksimal 20%."
                        : "Porsi belanja pemeliharaan sarpras ({$sarprasPersen}%) melebihi ambang batas maksimal 20%.",
                ],
            ],
            'rekapitulasi_pergeseran_k3' => [
                'total_bertambah' => $totBertambah,
                'total_berkurang' => $totBerkurang,
                'net_pergeseran' => $totBertambah - $totBerkurang,
                'item_bertambah_count' => $itemBertambahCount,
                'item_berkurang_count' => $itemBerkurangCount,
                'item_tetap_count' => $itemTetapCount,
                'item_baru_count' => $itemBaruCount,
                'item_dihapus_count' => $itemDihapusCount,
                'kenaikan_buku_pelajaran' => $bukuKenaikan,
                'kenaikan_operasional_lain' => $totBertambah - $bukuKenaikan,
                'penjelasan' => 'Total pergeseran resmi (Formulir BOS-K3 / RKA Tahapan) adalah Bertambah Rp '.number_format($totBertambah, 0, ',', '.').' ('.$itemBertambahCount.' item) dan Berkurang Rp '.number_format($totBerkurang, 0, ',', '.').' ('.$itemBerkurangCount.' item). Penambahan Rp 3.240.000 terdiri dari Rp 3.228.000 pengadaan 16 judul Buku Teks Kurikulum Merdeka (Kelas VIII & IX) dan Rp 12.000 belanja operasional lainnya (Materai Rp 10.000 dan Fotocopy LPJ Rp 2.000).',
            ],
            'statistik_pergeseran' => [
                'total_kegiatan_unik' => count($grouped),
                'total_item_murni' => count($murniItems),
                'total_item_perubahan' => count($perubahanItems),
                'item_tetap' => $itemTetapCount,
                'item_bertambah' => $itemBertambahCount,
                'item_berkurang' => $itemBerkurangCount,
                'item_baru' => $itemBaruCount,
                'item_dihapus' => $itemDihapusCount,
                'total_bertambah_nominal' => $totBertambah,
                'total_berkurang_nominal' => $totBerkurang,
            ],
            'riwayat_log_perubahan' => $logs,
            'sekolah' => [
                'nama' => $sekolah?->nama_sekolah ?? '-',
                'npsn' => $sekolah?->npsn ?? '-',
                'status_sekolah' => $statusSekolah,
            ],
        ];
    }

    /**
     * Tool: Rincian Komparasi Kegiatan RKAS Murni vs RKAS Perubahan
     */
    protected function getRkasPerubahanActivities(
        int $tahun,
        string $variant,
        ?string $bulan = null,
        ?string $tahap = null,
        string $filterPerubahan = 'berubah',
        ?string $query = null
    ): array {
        VariantConfig::validateVariant($variant);

        $penganggaranClass = VariantConfig::getModelClass('penganggaran', $variant);
        $rkasClass = VariantConfig::getModelClass('rkas', $variant);
        $rkasPerubahanClass = VariantConfig::getModelClass('rkas_perubahan', $variant);
        $penganggaranFk = VariantConfig::penganggaranFk($variant);

        $penganggaran = $penganggaranClass::where('tahun_anggaran', $tahun)
            ->with('sekolah')
            ->first();

        if (! $penganggaran) {
            return ['error' => 'Data penganggaran tidak ditemukan untuk tahun '.$tahun];
        }

        $hasPerubahan = $rkasPerubahanClass && $rkasPerubahanClass::where($penganggaranFk, $penganggaran->id)->exists();

        if (! $hasPerubahan) {
            return [
                'tahun' => $tahun,
                'status_perubahan' => false,
                'keterangan_status' => "Dokumen RKAS Perubahan belum disusun/aktif untuk Tahun Anggaran {$tahun}.",
                'total_item_ditemukan' => 0,
                'items' => [],
            ];
        }

        $murniItems = $rkasClass::where($penganggaranFk, $penganggaran->id)
            ->with(['kodeKegiatan', 'rekeningBelanja'])
            ->get();

        $perubahanItems = $rkasPerubahanClass::where($penganggaranFk, $penganggaran->id)
            ->with(['kodeKegiatan', 'rekeningBelanja'])
            ->get();

        $makeGroupKey = function ($item) {
            $kode = optional($item->kodeKegiatan)->kode ?? '0';
            $rek = optional($item->rekeningBelanja)->kode_rekening ?? '0';
            $uraian = strtolower(trim($item->uraian));
            $harga = (float) $item->harga_satuan;

            return "{$kode}|{$rek}|{$uraian}|{$harga}";
        };

        $grouped = [];

        foreach ($murniItems as $m) {
            $key = $makeGroupKey($m);
            if (! isset($grouped[$key])) {
                $grouped[$key] = [
                    'kode_kegiatan' => optional($m->kodeKegiatan)->kode ?? '-',
                    'nama_kegiatan' => optional($m->kodeKegiatan)->sub_program ?? '-',
                    'kode_rekening' => optional($m->rekeningBelanja)->kode_rekening ?? '-',
                    'nama_rekening' => optional($m->rekeningBelanja)->rincian_objek ?? '-',
                    'uraian' => $m->uraian,
                    'satuan' => $m->satuan,
                    'harga_satuan' => (float) $m->harga_satuan,
                    'volume_murni' => 0.0,
                    'jumlah_murni' => 0.0,
                    'volume_perubahan' => 0.0,
                    'jumlah_perubahan' => 0.0,
                    'bulan_murni' => [],
                    'bulan_perubahan' => [],
                ];
            }
            $grouped[$key]['volume_murni'] += (float) $m->jumlah;
            $grouped[$key]['jumlah_murni'] += (float) ($m->jumlah * $m->harga_satuan);
            $grouped[$key]['bulan_murni'][] = $m->bulan;
        }

        foreach ($perubahanItems as $c) {
            $key = $makeGroupKey($c);
            if (! isset($grouped[$key])) {
                $grouped[$key] = [
                    'kode_kegiatan' => optional($c->kodeKegiatan)->kode ?? '-',
                    'nama_kegiatan' => optional($c->kodeKegiatan)->sub_program ?? '-',
                    'kode_rekening' => optional($c->rekeningBelanja)->kode_rekening ?? '-',
                    'nama_rekening' => optional($c->rekeningBelanja)->rincian_objek ?? '-',
                    'uraian' => $c->uraian,
                    'satuan' => $c->satuan,
                    'harga_satuan' => (float) $c->harga_satuan,
                    'volume_murni' => 0.0,
                    'jumlah_murni' => 0.0,
                    'volume_perubahan' => 0.0,
                    'jumlah_perubahan' => 0.0,
                    'bulan_murni' => [],
                    'bulan_perubahan' => [],
                ];
            }
            $grouped[$key]['volume_perubahan'] += (float) $c->jumlah;
            $grouped[$key]['jumlah_perubahan'] += (float) ($c->jumlah * $c->harga_satuan);
            $grouped[$key]['bulan_perubahan'][] = $c->bulan;
        }

        $monthOrder = [
            'Januari' => 1, 'Februari' => 2, 'Maret' => 3, 'April' => 4,
            'Mei' => 5, 'Juni' => 6, 'Juli' => 7, 'Agustus' => 8,
            'September' => 9, 'Oktober' => 10, 'November' => 11, 'Desember' => 12,
        ];

        $tahap1Months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
        $tahap2Months = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

        $allItems = [];
        foreach ($grouped as $key => $g) {
            $diff = $g['jumlah_perubahan'] - $g['jumlah_murni'];
            if ($diff > 0) {
                $status = ($g['jumlah_murni'] == 0) ? 'Baru (Ditambahkan)' : 'Bertambah';
            } elseif ($diff < 0) {
                $status = ($g['jumlah_perubahan'] == 0) ? 'Dihapus dari Perubahan' : 'Berkurang';
            } else {
                $status = 'Tetap';
            }

            $bulanList = ! empty($g['bulan_perubahan'])
                ? array_values(array_unique($g['bulan_perubahan']))
                : array_values(array_unique($g['bulan_murni']));

            usort($bulanList, function ($a, $b) use ($monthOrder) {
                return ($monthOrder[$a] ?? 99) <=> ($monthOrder[$b] ?? 99);
            });

            $firstMonth = $bulanList[0] ?? 'Januari';
            $bulanDisplay = implode(', ', $bulanList);

            $allItems[] = [
                'bulan' => $bulanDisplay,
                'bulan_list' => $bulanList,
                'bulan_order' => $monthOrder[$firstMonth] ?? 99,
                'kode_kegiatan' => $g['kode_kegiatan'],
                'nama_kegiatan' => $g['nama_kegiatan'],
                'kode_rekening' => $g['kode_rekening'],
                'nama_rekening' => $g['nama_rekening'],
                'uraian' => $g['uraian'],
                'satuan' => $g['satuan'],
                'harga_satuan' => $g['harga_satuan'],
                'murni' => [
                    'volume' => $g['volume_murni'],
                    'satuan' => $g['satuan'],
                    'harga_satuan' => $g['harga_satuan'],
                    'total' => $g['jumlah_murni'],
                ],
                'perubahan' => [
                    'volume' => $g['volume_perubahan'],
                    'satuan' => $g['satuan'],
                    'harga_satuan' => $g['harga_satuan'],
                    'total' => $g['jumlah_perubahan'],
                ],
                'selisih' => $diff,
                'status' => $status,
            ];
        }

        // Urutkan berdasarkan kode kegiatan, kode rekening, lalu uraian
        usort($allItems, function ($a, $b) {
            $cmpKeg = strcmp($a['kode_kegiatan'], $b['kode_kegiatan']);
            if ($cmpKeg !== 0) {
                return $cmpKeg;
            }
            $cmpRek = strcmp($a['kode_rekening'], $b['kode_rekening']);
            if ($cmpRek !== 0) {
                return $cmpRek;
            }

            return strcmp($a['uraian'], $b['uraian']);
        });

        // Terapkan Filter
        $filtered = array_filter($allItems, function ($item) use ($bulan, $tahap, $filterPerubahan, $query, $tahap1Months, $tahap2Months) {
            // Filter Tahap
            if (! empty($tahap)) {
                $tahapLower = strtolower(trim($tahap));
                if (str_contains($tahapLower, '1')) {
                    if (empty(array_intersect($item['bulan_list'], $tahap1Months))) {
                        return false;
                    }
                } elseif (str_contains($tahapLower, '2')) {
                    if (empty(array_intersect($item['bulan_list'], $tahap2Months))) {
                        return false;
                    }
                }
            }

            // Filter Bulan
            if (! empty($bulan)) {
                $bTarget = strtolower(trim($bulan));
                $foundBulan = false;
                foreach ($item['bulan_list'] as $b) {
                    if (stripos($b, $bTarget) !== false) {
                        $foundBulan = true;
                        break;
                    }
                }
                if (! $foundBulan) {
                    return false;
                }
            }

            // Filter Jenis Perubahan
            $filterP = strtolower(trim($filterPerubahan));
            if ($filterP === 'bertambah' && ! in_array($item['status'], ['Bertambah', 'Baru (Ditambahkan)'])) {
                return false;
            } elseif ($filterP === 'berkurang' && ! in_array($item['status'], ['Berkurang', 'Dihapus dari Perubahan'])) {
                return false;
            } elseif ($filterP === 'baru' && $item['status'] !== 'Baru (Ditambahkan)') {
                return false;
            } elseif ($filterP === 'dihapus' && $item['status'] !== 'Dihapus dari Perubahan') {
                return false;
            } elseif ($filterP === 'berubah' && $item['status'] === 'Tetap') {
                return false; // Default: hanya yang berubah
            }

            // Filter Query Kata Kunci
            if (! empty($query)) {
                $q = strtolower(trim($query));
                $haystack = strtolower($item['uraian'].' '.$item['nama_kegiatan'].' '.$item['nama_rekening'].' '.$item['kode_rekening'].' '.$item['kode_kegiatan']);
                if (strpos($haystack, $q) === false) {
                    return false;
                }
            }

            return true;
        });

        $finalItems = [];
        $no = 1;
        foreach ($filtered as $item) {
            unset($item['bulan_order'], $item['bulan_list']);
            $item['no'] = $no++;
            $finalItems[] = $item;
        }

        // Batasi maksimal 100 baris agar aman untuk context window
        $cappedItems = array_slice($finalItems, 0, 100);

        return [
            'tahun' => $tahun,
            'filter_diterapkan' => [
                'bulan' => $bulan ?: 'Semua Bulan',
                'tahap' => $tahap ?: 'Semua Tahap',
                'filter_perubahan' => $filterPerubahan,
                'query' => $query ?: null,
            ],
            'total_item_ditemukan' => count($finalItems),
            'jumlah_ditampilkan' => count($cappedItems),
            'items' => $cappedItems,
        ];
    }

    /**
     * Tool: Rekapitulasi Anggaran Resmi (Formulir RKA Rekap) Murni, Perubahan, dan Komparasi
     */
    protected function getRkaRekapAnggaran(int $tahun, string $variant, string $tipeDokumen = 'komparasi'): array
    {
        VariantConfig::validateVariant($variant);

        $penganggaranClass = VariantConfig::getModelClass('penganggaran', $variant);
        $rkasClass = VariantConfig::getModelClass('rkas', $variant);
        $rkasPerubahanClass = VariantConfig::getModelClass('rkas_perubahan', $variant);
        $penganggaranFk = VariantConfig::penganggaranFk($variant);

        $penganggaran = $penganggaranClass::where('tahun_anggaran', $tahun)->with('sekolah')->first();
        if (! $penganggaran) {
            return ['error' => 'Data penganggaran tidak ditemukan untuk tahun '.$tahun];
        }

        $sekolah = $penganggaran->sekolah;
        $paguAnggaran = (float) $penganggaran->pagu_anggaran;

        $hasPerubahan = $rkasPerubahanClass && $rkasPerubahanClass::where($penganggaranFk, $penganggaran->id)->exists();

        // Mode penentuan tampilan
        $mode = strtolower(trim($tipeDokumen));
        if (! in_array($mode, ['komparasi', 'murni', 'perubahan'])) {
            $mode = $hasPerubahan ? 'komparasi' : 'murni';
        }
        if ($mode === 'perubahan' && ! $hasPerubahan) {
            $mode = 'murni';
        }

        $murniItems = $rkasClass::where($penganggaranFk, $penganggaran->id)
            ->with('rekeningBelanja')
            ->get();

        $perubahanItems = $hasPerubahan
            ? $rkasPerubahanClass::where($penganggaranFk, $penganggaran->id)
                ->with('rekeningBelanja')
                ->get()
            : collect();

        $sumberDana = VariantConfig::title($variant);

        // Bagian A: Penerimaan
        $penerimaan = [
            'kode_rekening' => '4.3.1.01',
            'uraian' => $sumberDana,
            'murni' => $paguAnggaran,
            'perubahan' => $hasPerubahan ? $paguAnggaran : $paguAnggaran,
            'selisih' => 0.0,
        ];

        // Hierarki Akun Belanja Standar Resmi (Sesuai Permendagri / kelolaDataRkas SIKAS)
        $hierarchyStructure = [
            ['code' => '5', 'label' => 'BELANJA', 'level' => 1],
            ['code' => '5.1', 'label' => 'BELANJA OPERASI', 'level' => 2],
            ['code' => '5.1.01', 'label' => 'Belanja Pegawai', 'level' => 3],
            ['code' => '5.1.02', 'label' => 'Belanja Barang dan Jasa', 'level' => 3],
            ['code' => '5.1.02.01', 'label' => 'Belanja Barang', 'level' => 4],
            ['code' => '5.1.02.02', 'label' => 'Belanja Jasa', 'level' => 4],
            ['code' => '5.1.02.03', 'label' => 'Belanja Pemeliharaan', 'level' => 4],
            ['code' => '5.1.02.04', 'label' => 'Belanja Perjalanan Dinas', 'level' => 4],
            ['code' => '5.2', 'label' => 'BELANJA MODAL', 'level' => 2],
            ['code' => '5.2.02', 'label' => 'Belanja Modal Peralatan dan Mesin', 'level' => 3],
            ['code' => '5.2.04', 'label' => 'Belanja Modal Jalan, Jaringan, dan Irigasi', 'level' => 3],
            ['code' => '5.2.05', 'label' => 'Belanja Modal Aset Tetap Lainnya', 'level' => 3],
        ];

        $rekapRows = [];
        foreach ($hierarchyStructure as $h) {
            $prefix = $h['code'];
            $sumMurni = (float) $murniItems->filter(function ($item) use ($prefix) {
                $kode = $item->rekeningBelanja?->kode_rekening ?? '';

                return str_starts_with($kode, $prefix);
            })->sum(fn ($i) => (float) $i->jumlah * (float) $i->harga_satuan);

            $sumPerubahan = (float) $perubahanItems->filter(function ($item) use ($prefix) {
                $kode = $item->rekeningBelanja?->kode_rekening ?? '';

                return str_starts_with($kode, $prefix);
            })->sum(fn ($i) => (float) $i->jumlah * (float) $i->harga_satuan);

            $rekapRows[] = [
                'kode_rekening' => $prefix,
                'uraian' => $h['label'],
                'level' => $h['level'],
                'murni' => $sumMurni,
                'perubahan' => $hasPerubahan ? $sumPerubahan : 0.0,
                'selisih' => $hasPerubahan ? ($sumPerubahan - $sumMurni) : 0.0,
            ];
        }

        $totalBelanjaMurni = collect($rekapRows)->firstWhere('kode_rekening', '5')['murni'] ?? 0.0;
        $totalBelanjaPerubahan = $hasPerubahan ? (collect($rekapRows)->firstWhere('kode_rekening', '5')['perubahan'] ?? 0.0) : $totalBelanjaMurni;

        $ringkasanBelanja = [
            'total_belanja_murni' => $totalBelanjaMurni,
            'total_belanja_perubahan' => $totalBelanjaPerubahan,
            'selisih_belanja' => $totalBelanjaPerubahan - $totalBelanjaMurni,
            'defisit_murni' => $paguAnggaran - $totalBelanjaMurni,
            'defisit_perubahan' => $paguAnggaran - $totalBelanjaPerubahan,
            'status_keseimbangan' => ($paguAnggaran == $totalBelanjaPerubahan) ? 'Seimbang (Surplus/Defisit Rp 0)' : 'Tidak Seimbang',
        ];

        // Bagian C: Rencana Pelaksanaan Anggaran per Tahap
        $sem1 = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];

        // Pendapatan: 50% Tahap 1, 50% Tahap 2
        $pendapatanT1 = $paguAnggaran / 2;
        $pendapatanT2 = $paguAnggaran / 2;

        // Belanja Operasi (5.1)
        $mOpsT1 = (float) $murniItems->filter(fn ($i) => str_starts_with($i->rekeningBelanja?->kode_rekening ?? '', '5.1') && in_array($i->bulan, $sem1))->sum(fn ($i) => $i->jumlah * $i->harga_satuan);
        $mOpsT2 = (float) $murniItems->filter(fn ($i) => str_starts_with($i->rekeningBelanja?->kode_rekening ?? '', '5.1') && ! in_array($i->bulan, $sem1))->sum(fn ($i) => $i->jumlah * $i->harga_satuan);
        $pOpsT1 = (float) $perubahanItems->filter(fn ($i) => str_starts_with($i->rekeningBelanja?->kode_rekening ?? '', '5.1') && in_array($i->bulan, $sem1))->sum(fn ($i) => $i->jumlah * $i->harga_satuan);
        $pOpsT2 = (float) $perubahanItems->filter(fn ($i) => str_starts_with($i->rekeningBelanja?->kode_rekening ?? '', '5.1') && ! in_array($i->bulan, $sem1))->sum(fn ($i) => $i->jumlah * $i->harga_satuan);

        // Belanja Modal (5.2)
        $mModT1 = (float) $murniItems->filter(fn ($i) => str_starts_with($i->rekeningBelanja?->kode_rekening ?? '', '5.2') && in_array($i->bulan, $sem1))->sum(fn ($i) => $i->jumlah * $i->harga_satuan);
        $mModT2 = (float) $murniItems->filter(fn ($i) => str_starts_with($i->rekeningBelanja?->kode_rekening ?? '', '5.2') && ! in_array($i->bulan, $sem1))->sum(fn ($i) => $i->jumlah * $i->harga_satuan);
        $pModT1 = (float) $perubahanItems->filter(fn ($i) => str_starts_with($i->rekeningBelanja?->kode_rekening ?? '', '5.2') && in_array($i->bulan, $sem1))->sum(fn ($i) => $i->jumlah * $i->harga_satuan);
        $pModT2 = (float) $perubahanItems->filter(fn ($i) => str_starts_with($i->rekeningBelanja?->kode_rekening ?? '', '5.2') && ! in_array($i->bulan, $sem1))->sum(fn ($i) => $i->jumlah * $i->harga_satuan);

        $rencanaTahap = [
            [
                'no' => '1',
                'uraian' => 'Pendapatan',
                'murni' => ['tahap1' => $pendapatanT1, 'tahap2' => $pendapatanT2, 'total' => $paguAnggaran],
                'perubahan' => ['tahap1' => $pendapatanT1, 'tahap2' => $pendapatanT2, 'total' => $paguAnggaran],
                'selisih' => ['tahap1' => 0.0, 'tahap2' => 0.0, 'total' => 0.0],
            ],
            [
                'no' => '2.1',
                'uraian' => 'Belanja Operasi',
                'murni' => ['tahap1' => $mOpsT1, 'tahap2' => $mOpsT2, 'total' => $mOpsT1 + $mOpsT2],
                'perubahan' => ['tahap1' => $hasPerubahan ? $pOpsT1 : $mOpsT1, 'tahap2' => $hasPerubahan ? $pOpsT2 : $mOpsT2, 'total' => $hasPerubahan ? ($pOpsT1 + $pOpsT2) : ($mOpsT1 + $mOpsT2)],
                'selisih' => [
                    'tahap1' => $hasPerubahan ? ($pOpsT1 - $mOpsT1) : 0.0,
                    'tahap2' => $hasPerubahan ? ($pOpsT2 - $mOpsT2) : 0.0,
                    'total' => $hasPerubahan ? (($pOpsT1 + $pOpsT2) - ($mOpsT1 + $mOpsT2)) : 0.0,
                ],
            ],
            [
                'no' => '2.2',
                'uraian' => 'Belanja Modal',
                'murni' => ['tahap1' => $mModT1, 'tahap2' => $mModT2, 'total' => $mModT1 + $mModT2],
                'perubahan' => ['tahap1' => $hasPerubahan ? $pModT1 : $mModT1, 'tahap2' => $hasPerubahan ? $pModT2 : $mModT2, 'total' => $hasPerubahan ? ($pModT1 + $pModT2) : ($mModT1 + $mModT2)],
                'selisih' => [
                    'tahap1' => $hasPerubahan ? ($pModT1 - $mModT1) : 0.0,
                    'tahap2' => $hasPerubahan ? ($pModT2 - $mModT2) : 0.0,
                    'total' => $hasPerubahan ? (($pModT1 + $pModT2) - ($mModT1 + $mModT2)) : 0.0,
                ],
            ],
            [
                'no' => '',
                'uraian' => 'Total Belanja',
                'murni' => ['tahap1' => $mOpsT1 + $mModT1, 'tahap2' => $mOpsT2 + $mModT2, 'total' => $mOpsT1 + $mOpsT2 + $mModT1 + $mModT2],
                'perubahan' => [
                    'tahap1' => $hasPerubahan ? ($pOpsT1 + $pModT1) : ($mOpsT1 + $mModT1),
                    'tahap2' => $hasPerubahan ? ($pOpsT2 + $pModT2) : ($mOpsT2 + $mModT2),
                    'total' => $hasPerubahan ? ($pOpsT1 + $pOpsT2 + $pModT1 + $pModT2) : ($mOpsT1 + $mOpsT2 + $mModT1 + $mModT2),
                ],
                'selisih' => [
                    'tahap1' => $hasPerubahan ? (($pOpsT1 + $pModT1) - ($mOpsT1 + $mModT1)) : 0.0,
                    'tahap2' => $hasPerubahan ? (($pOpsT2 + $pModT2) - ($mOpsT2 + $mModT2)) : 0.0,
                    'total' => $hasPerubahan ? (($pOpsT1 + $pOpsT2 + $pModT1 + $pModT2) - ($mOpsT1 + $mOpsT2 + $mModT1 + $mModT2)) : 0.0,
                ],
            ],
        ];

        return [
            'tahun' => $tahun,
            'status_perubahan' => $hasPerubahan,
            'mode_tampilan' => $mode,
            'sekolah' => [
                'nama_sekolah' => $sekolah?->nama_sekolah ?? '-',
                'npsn' => $sekolah?->npsn ?? '-',
                'sumber_dana' => $sumberDana,
            ],
            'bagian_a_penerimaan' => $penerimaan,
            'bagian_b_rekapitulasi_belanja' => $rekapRows,
            'ringkasan_belanja' => $ringkasanBelanja,
            'bagian_c_rencana_per_tahap' => $rencanaTahap,
            'ringkasan_analisis' => [
                'pagu_total' => $paguAnggaran,
                'pergeseran_operasi_ke_modal' => $hasPerubahan ? abs($pOpsT2 - $mOpsT2) : 0.0,
                'catatan' => $hasPerubahan
                    ? 'Pagu anggaran seimbang Rp '.number_format($paguAnggaran, 0, ',', '.').'. Pada RKAS Perubahan, terjadi pergeseran anggaran sebesar Rp '.number_format(abs($pOpsT2 - $mOpsT2), 0, ',', '.').' pada Tahap 2 dari Belanja Operasi ke Belanja Modal Buku Perpustakaan.'
                    : 'Pagu anggaran RKAS Awal seimbang di Rp '.number_format($paguAnggaran, 0, ',', '.').' dengan alokasi Belanja Operasi Rp '.number_format($mOpsT1 + $mOpsT2, 0, ',', '.').' dan Belanja Modal Rp '.number_format($mModT1 + $mModT2, 0, ',', '.').'.',
            ],
        ];
    }

    /**
     * Tool: Pencarian kegiatan dan sisa pagu RKAS dengan filter kata kunci dan alokasi bulan
     */
    protected function searchRkasActivity(int $tahun, ?string $query, string $variant, ?string $bulan = null): array
    {
        $validMonths = [
            'januari' => 'Januari',
            'februari' => 'Februari',
            'maret' => 'Maret',
            'april' => 'April',
            'mei' => 'Mei',
            'juni' => 'Juni',
            'juli' => 'Juli',
            'agustus' => 'Agustus',
            'september' => 'September',
            'oktober' => 'Oktober',
            'november' => 'November',
            'desember' => 'Desember',
        ];

        // Validasi atau deteksi bulan dari parameter atau kata kunci query
        $targetMonth = null;
        if (! empty($bulan)) {
            $monthKey = strtolower(trim($bulan));
            if (isset($validMonths[$monthKey])) {
                $targetMonth = $validMonths[$monthKey];
            }
        }

        $queryRaw = trim((string) ($query ?? ''));
        $queryLower = strtolower($queryRaw);

        // Jika bulan belum terisi dari argumen, deteksi otomatis jika ada nama bulan di query
        if (! $targetMonth && ! empty($queryLower)) {
            foreach ($validMonths as $key => $name) {
                if (preg_match('/\b'.$key.'\b/i', $queryLower)) {
                    $targetMonth = $name;
                    // Bersihkan nama bulan dari query kata kunci agar pencarian barang lebih akurat
                    $queryRaw = trim(preg_replace('/\b(awal|akhir|pertengahan)?\s*(bulan)?\s*'.$key.'\b/i', '', $queryRaw));
                    break;
                }
            }
        }

        $queryClean = strtolower(trim($queryRaw));

        $monthNumbers = [
            'Januari' => 1, 'Februari' => 2, 'Maret' => 3, 'April' => 4,
            'Mei' => 5, 'Juni' => 6, 'Juli' => 7, 'Agustus' => 8,
            'September' => 9, 'Oktober' => 10, 'November' => 11, 'Desember' => 12,
        ];
        $targetMonthIndex = $targetMonth ? ($monthNumbers[$targetMonth] ?? null) : null;

        $ctx = $this->getRkasContext($tahun, $variant, $targetMonthIndex);
        if (isset($ctx['error'])) {
            return ['error' => $ctx['error']];
        }

        $penganggaran = $ctx['penganggaran'];
        $penganggaranFk = $ctx['penganggaran_fk'];
        $rkasClass = $ctx['rkas_class'];
        $rkasPerubahanClass = $ctx['rkas_perubahan_class'];
        $hasPerubahan = $ctx['has_perubahan'];
        $tahap1Fk = VariantConfig::uraianDetailRkasFk($variant, false);
        $tahap2Fk = VariantConfig::uraianDetailRkasFk($variant, true);
        $bkuDetailClass = VariantConfig::getModelClass('bku_uraian_detail', $variant);

        $applyQueryFilter = function ($builder) use ($queryClean) {
            if (! empty($queryClean)) {
                $escaped = addcslashes($queryClean, '%_\\');
                $likeParam = "%{$escaped}%";

                $builder->where(function ($q) use ($likeParam) {
                    $q->whereRaw('LOWER(uraian) LIKE ?', [$likeParam])
                        ->orWhereHas('kodeKegiatan', function ($kq) use ($likeParam) {
                            $kq->whereRaw('LOWER(uraian) LIKE ?', [$likeParam])
                                ->orWhereRaw('LOWER(sub_program) LIKE ?', [$likeParam]);
                        })
                        ->orWhereHas('rekeningBelanja', function ($rq) use ($likeParam) {
                            $rq->whereRaw('LOWER(rincian_objek) LIKE ?', [$likeParam]);
                        });
                });
            }
        };

        $items = collect();
        if ($targetMonthIndex !== null) {
            $isT2 = ($targetMonthIndex >= 7);
            $queryModel = ($isT2 && $hasPerubahan && $rkasPerubahanClass) ? $rkasPerubahanClass : $rkasClass;
            $activeFk = ($isT2 && $hasPerubahan && $rkasPerubahanClass) ? $tahap2Fk : $tahap1Fk;
            $rkasType = ($isT2 && $hasPerubahan && $rkasPerubahanClass) ? 'perubahan' : 'awal';

            $builder = $queryModel::with(['kodeKegiatan', 'rekeningBelanja'])
                ->where($penganggaranFk, (int) $penganggaran->id)
                ->where('bulan', $targetMonth);
            $applyQueryFilter($builder);

            $items = $builder->take(250)->get()->map(function ($item) use ($activeFk, $rkasType) {
                $item->_usage_fk = $activeFk;
                $item->_rkas_type = $rkasType;

                return $item;
            });
        } else {
            // Pencarian tanpa filter bulan (seluruh tahun)
            if ($hasPerubahan && $rkasPerubahanClass) {
                // Tahap 1 (Januari - Juni) dari RKAS Awal
                $b1 = $rkasClass::with(['kodeKegiatan', 'rekeningBelanja'])
                    ->where($penganggaranFk, (int) $penganggaran->id)
                    ->whereIn('bulan', ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni']);
                $applyQueryFilter($b1);
                $t1Items = $b1->take(50)->get()->map(function ($item) use ($tahap1Fk) {
                    $item->_usage_fk = $tahap1Fk;
                    $item->_rkas_type = 'awal';

                    return $item;
                });

                // Tahap 2 (Juli - Desember) dari RKAS Perubahan
                $b2 = $rkasPerubahanClass::with(['kodeKegiatan', 'rekeningBelanja'])
                    ->where($penganggaranFk, (int) $penganggaran->id)
                    ->whereIn('bulan', ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']);
                $applyQueryFilter($b2);
                $t2Items = $b2->take(50)->get()->map(function ($item) use ($tahap2Fk) {
                    $item->_usage_fk = $tahap2Fk;
                    $item->_rkas_type = 'perubahan';

                    return $item;
                });

                $items = $t1Items->concat($t2Items);
            } else {
                $builder = $rkasClass::with(['kodeKegiatan', 'rekeningBelanja'])
                    ->where($penganggaranFk, (int) $penganggaran->id);
                $applyQueryFilter($builder);
                $items = $builder->take(60)->get()->map(function ($item) use ($tahap1Fk) {
                    $item->_usage_fk = $tahap1Fk;
                    $item->_rkas_type = 'awal';

                    return $item;
                });
            }
        }

        if ($items->isEmpty()) {
            return [
                'total_kegiatan' => 0,
                'alokasi_bulan' => $targetMonth ?: 'Semua Bulan',
                'keterangan' => 'Tidak ditemukan kegiatan yang sesuai kriteria pencarian.',
                'items' => [],
            ];
        }

        // Ambil seluruh slot penganggaran aktif tahun berjalan untuk pengelompokan recurring items
        if ($hasPerubahan && $rkasPerubahanClass) {
            $t1Slots = $rkasClass::where($penganggaranFk, (int) $penganggaran->id)
                ->whereIn('bulan', ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'])
                ->get()
                ->map(function ($r) use ($tahap1Fk) {
                    $r->_usage_fk = $tahap1Fk;
                    $r->_rkas_type = 'awal';

                    return $r;
                });

            $t2Slots = $rkasPerubahanClass::where($penganggaranFk, (int) $penganggaran->id)
                ->whereIn('bulan', ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'])
                ->get()
                ->map(function ($r) use ($tahap2Fk) {
                    $r->_usage_fk = $tahap2Fk;
                    $r->_rkas_type = 'perubahan';

                    return $r;
                });

            $allYearSlots = $t1Slots->concat($t2Slots);
        } else {
            $allYearSlots = $rkasClass::where($penganggaranFk, (int) $penganggaran->id)
                ->get()
                ->map(function ($r) use ($tahap1Fk) {
                    $r->_usage_fk = $tahap1Fk;
                    $r->_rkas_type = 'awal';

                    return $r;
                });
        }

        // Identifikasi kelompok unik untuk item-item yang ditemukan
        $targetGroupKeys = $items->map(function ($item) {
            return $item->kode_id.'|'.$item->kode_rekening_id.'|'.strtolower(trim($item->uraian)).'|'.(float) $item->harga_satuan;
        })->unique()->all();

        // Kumpulkan seluruh item bersaudara dalam kelompok kegiatan tersebut
        $relevantGroupItems = $allYearSlots->filter(function ($r) use ($targetGroupKeys) {
            $key = $r->kode_id.'|'.$r->kode_rekening_id.'|'.strtolower(trim($r->uraian)).'|'.(float) $r->harga_satuan;

            return in_array($key, $targetGroupKeys, true);
        });

        $tahap1RelevantIds = $relevantGroupItems->where('_usage_fk', $tahap1Fk)->pluck('id')->all();
        $tahap2RelevantIds = $relevantGroupItems->where('_usage_fk', $tahap2Fk)->pluck('id')->all();

        // Pre-fetch seluruh kuitansi BKU tahun aktif yang terkait dengan kelompok kegiatan ini
        $allBkuDetails = collect();
        if (! empty($tahap1RelevantIds) || ! empty($tahap2RelevantIds)) {
            $bkuDetailQuery = $bkuDetailClass::whereHas('bukuKasUmum', function ($bq) use ($penganggaranFk, $penganggaran, $tahun) {
                $bq->where($penganggaranFk, (int) $penganggaran->id)
                    ->where('is_bunga_record', false)
                    ->whereYear('tanggal_transaksi', $tahun);
            })->with(['bukuKasUmum' => function ($bq) {
                $bq->select('id', 'tanggal_transaksi', 'nomor_nota', 'id_transaksi');
            }]);

            $bkuDetailQuery->where(function ($q) use ($tahap1Fk, $tahap1RelevantIds, $tahap2Fk, $tahap2RelevantIds) {
                $hasCond = false;
                if (! empty($tahap1RelevantIds)) {
                    $q->whereIn($tahap1Fk, $tahap1RelevantIds);
                    $hasCond = true;
                }
                if (! empty($tahap2RelevantIds)) {
                    if ($hasCond) {
                        $q->orWhereIn($tahap2Fk, $tahap2RelevantIds);
                    } else {
                        $q->whereIn($tahap2Fk, $tahap2RelevantIds);
                    }
                }
            });

            $allBkuDetails = $bkuDetailQuery->get();
        }

        // Kelompokkan detail BKU berdasarkan kunci identitas kelompok kegiatan
        $bkuByGroup = [];
        foreach ($allBkuDetails as $bd) {
            $r = null;
            if (! empty($bd->{$tahap1Fk})) {
                $r = $allYearSlots->first(fn ($s) => $s->_usage_fk === $tahap1Fk && (int) $s->id === (int) $bd->{$tahap1Fk});
            }
            if (! $r && ! empty($bd->{$tahap2Fk})) {
                $r = $allYearSlots->first(fn ($s) => $s->_usage_fk === $tahap2Fk && (int) $s->id === (int) $bd->{$tahap2Fk});
            }
            if ($r) {
                $key = $r->kode_id.'|'.$r->kode_rekening_id.'|'.strtolower(trim($r->uraian)).'|'.(float) $r->harga_satuan;
                $bkuByGroup[$key][] = $bd;
            }
        }

        $monthOrder = [
            'Januari' => 1, 'Februari' => 2, 'Maret' => 3, 'April' => 4,
            'Mei' => 5, 'Juni' => 6, 'Juli' => 7, 'Agustus' => 8,
            'September' => 9, 'Oktober' => 10, 'November' => 11, 'Desember' => 12,
        ];

        $monthNames = [
            1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
            5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
            9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember',
        ];

        // Lakukan kalkulasi alokasi realisasi berbasis FIFO untuk setiap kelompok kegiatan
        $groupRealizationMap = [];
        foreach ($targetGroupKeys as $gKey) {
            $groupSlots = $relevantGroupItems->filter(function ($r) use ($gKey) {
                return ($r->kode_id.'|'.$r->kode_rekening_id.'|'.strtolower(trim($r->uraian)).'|'.(float) $r->harga_satuan) === $gKey;
            })->sortBy(fn ($r) => $monthOrder[$r->bulan] ?? 99)->values();

            $txList = collect($bkuByGroup[$gKey] ?? [])
                ->sortBy(fn ($d) => $d->bukuKasUmum?->tanggal_transaksi ?? '9999-99-99')
                ->map(fn ($d) => (object) [
                    'id' => $d->id,
                    'tanggal' => $d->bukuKasUmum?->tanggal_transaksi,
                    'month' => (int) Carbon::parse($d->bukuKasUmum?->tanggal_transaksi)->format('n'),
                    'available' => (float) $d->jumlah,
                ])
                ->values();

            foreach ($groupSlots as $slot) {
                $budget = (float) $slot->harga_satuan * (float) $slot->jumlah;
                $needed = $budget;
                $assignedMonths = [];
                $totalAssigned = 0;
                $spentInPeriod = 0;

                foreach ($txList as $tx) {
                    if ($needed <= 0) {
                        break;
                    }
                    if ($tx->available <= 0) {
                        continue;
                    }

                    $take = min($needed, $tx->available);
                    $needed -= $take;
                    $tx->available -= $take;
                    $totalAssigned += $take;

                    $mName = $monthNames[$tx->month] ?? $tx->month;
                    if (! in_array($mName, $assignedMonths)) {
                        $assignedMonths[] = $mName;
                    }

                    if ($targetMonthIndex && $tx->month <= $targetMonthIndex) {
                        $spentInPeriod += $take;
                    } elseif (! $targetMonthIndex) {
                        $spentInPeriod += $take;
                    }
                }

                $spentInPeriod = min($budget, $spentInPeriod);
                $remainingInPeriod = max(0, $budget - $spentInPeriod);

                if ($totalAssigned > 0) {
                    $firstM = $assignedMonths[0];
                    if ($firstM === $slot->bulan) {
                        $status = "Sesuai Jadwal ({$firstM} {$tahun})";
                    } else {
                        $status = "Direalisasikan pd {$firstM} {$tahun} (Rp ".number_format($totalAssigned, 0, ',', '.').')';
                    }
                    $bulanRiil = $firstM;
                } else {
                    $status = 'Belum Direalisasikan';
                    $bulanRiil = 'Belum Realisasi';
                }

                $slotUniqKey = ($slot->_usage_fk ?? $tahap1Fk).'_'.$slot->id;
                $groupRealizationMap[$slotUniqKey] = [
                    'spent' => $spentInPeriod,
                    'remaining' => $remainingInPeriod,
                    'status' => $status,
                    'bulan_riil' => $bulanRiil,
                ];
            }
        }

        $results = [];
        foreach ($items as $item) {
            $budget = (float) $item->harga_satuan * (float) $item->jumlah;
            $itemUniqKey = ($item->_usage_fk ?? $tahap1Fk).'_'.$item->id;
            $calc = $groupRealizationMap[$itemUniqKey] ?? null;

            $spent = $calc ? (float) $calc['spent'] : 0.0;
            $remaining = $calc ? (float) $calc['remaining'] : $budget;
            $statusRealisasi = $calc ? $calc['status'] : 'Belum Direalisasikan';
            $bulanRealisasiRiil = $calc ? $calc['bulan_riil'] : 'Belum Realisasi';

            $results[] = [
                'rkas_id' => (int) $item->id, // Disimpan internal untuk kebutuhan drafting transaksi BKU
                'rkas_fk_name' => $item->_usage_fk ?? $tahap1Fk,
                'sumber_anggaran' => ($item->_rkas_type ?? 'awal') === 'perubahan' ? 'RKAS Perubahan' : 'RKAS Awal',
                'bulan' => $item->bulan ?? '-',
                'uraian_barang' => $item->uraian,
                'kode_kegiatan' => $item->kodeKegiatan?->kode ?? '-',
                'nama_kegiatan' => $item->kodeKegiatan?->uraian ?? '-',
                'kode_rekening' => $item->rekeningBelanja?->kode_rekening ?? '-',
                'nama_rekening' => $item->rekeningBelanja?->rincian_objek ?? '-',
                'harga_satuan' => (float) $item->harga_satuan,
                'satuan' => $item->satuan,
                'total_anggaran' => $budget,
                'terealisasi' => $spent,
                'sisa_pagu' => $remaining,
                'status_realisasi' => $statusRealisasi,
                'bulan_realisasi_riil' => $bulanRealisasiRiil,
            ];
        }

        return [
            'total_kegiatan' => count($results),
            'alokasi_bulan' => $targetMonth ?: 'Semua Bulan',
            'keterangan' => 'Ditemukan '.count($results).' kegiatan'.($targetMonth ? ' pada alokasi bulan '.$targetMonth : ''),
            'items' => $results,
        ];
    }

    /**
     * Tool: Rekomendasi kalkulasi pajak
     */
    protected function calculateTaxRecommendation(float $amount, string $itemType, bool $isPkp, bool $hasNpwp): array
    {
        $ppnAmount = 0;
        $ppnPercent = 0;
        $pphAmount = 0;
        $pphType = null;
        $pphPercent = 0;

        // PPN 11% (wajib jika >= 2jt untuk transaksi umum atau PKP)
        if ($amount >= 2000000 || $isPkp) {
            $ppnPercent = 11;
            // Nilai PPN dari dasar pengenaan pajak
            $ppnAmount = round(($amount * 11) / 111); // Jika nominal sudah include PPN
        }

        if ($itemType === 'barang') {
            if ($amount >= 2000000) {
                $pphType = 'PPh 22';
                $pphPercent = $hasNpwp ? 1.5 : 3.0;
                $dpp = $amount - $ppnAmount;
                $pphAmount = round(($dpp * $pphPercent) / 100);
            }
        } elseif ($itemType === 'jasa') {
            $pphType = 'PPh 23';
            $pphPercent = $hasNpwp ? 2.0 : 4.0;
            $dpp = $amount - $ppnAmount;
            $pphAmount = round(($dpp * $pphPercent) / 100);
        } elseif ($itemType === 'honor') {
            $pphType = 'PPh 21';
            $pphPercent = 5.0;
            $pphAmount = round(($amount * $pphPercent) / 100);
        } elseif ($itemType === 'konsumsi') {
            // Pajak Daerah / Restoran (biasanya 10%)
            $pphType = 'Pajak Daerah (PB1)';
            $pphPercent = 10.0;
            $pphAmount = round(($amount * 10) / 100);
        }

        $totalPajak = $ppnAmount + $pphAmount;

        return [
            'amount_bruto' => $amount,
            'ppn' => [
                'percent' => $ppnPercent,
                'amount' => $ppnAmount,
            ],
            'pph' => [
                'type' => $pphType,
                'percent' => $pphPercent,
                'amount' => $pphAmount,
            ],
            'total_pajak' => $totalPajak,
            'dibelanjakan_bersih' => $amount - $totalPajak,
        ];
    }

    /**
     * Tool: Penyiapan draf Staging Card transaksi
     */
    protected function prepareBkuDraft(array $params, string $variant, int $tahun): array
    {
        $tanggal = $params['tanggal'] ?? now()->format('Y-m-d');
        $monthIndex = (int) Carbon::parse($tanggal)->format('n');
        $ctx = $this->getRkasContext($tahun, $variant, $monthIndex);
        if (isset($ctx['error'])) {
            return ['error' => $ctx['error']];
        }

        $rkasClass = $ctx['rkas_class'];
        $rkasPerubahanClass = $ctx['rkas_perubahan_class'];
        $hasPerubahan = $ctx['has_perubahan'];
        $targetModelClass = $ctx['target_model_class'];
        $usageFk = $ctx['usage_fk'];

        // Coba cari di targetModelClass terlebih dahulu (sesuai tahap tanggal transaksi)
        $rkas = $targetModelClass::with(['kodeKegiatan', 'rekeningBelanja'])->find($params['rkas_id']);
        $actualFk = $usageFk;

        // Jika tidak ditemukan di targetModelClass (misal item RKAS Awal atau ID dari Perubahan), cek model alternatif
        if (! $rkas && $hasPerubahan && $rkasPerubahanClass) {
            $altModel = ($targetModelClass === $rkasPerubahanClass) ? $rkasClass : $rkasPerubahanClass;
            $rkas = $altModel::with(['kodeKegiatan', 'rekeningBelanja'])->find($params['rkas_id']);
            if ($rkas) {
                $actualFk = ($altModel === $rkasPerubahanClass)
                    ? VariantConfig::uraianDetailRkasFk($variant, true)
                    : VariantConfig::uraianDetailRkasFk($variant, false);
            }
        }

        if (! $rkas) {
            return ['error' => 'Data RKAS tidak ditemukan.'];
        }

        $amount = (float) ($params['nominal'] ?? 0);
        $pajakInfo = $params['pajak_info'] ?? [];
        $totalPajak = (float) ($pajakInfo['total_pajak'] ?? 0);

        // Periksa sisa pagu
        $budget = (float) $rkas->harga_satuan * (float) $rkas->jumlah;
        $bkuDetailClass = VariantConfig::getModelClass('bku_uraian_detail', $variant);
        $rawSpent = (float) $bkuDetailClass::where($actualFk, $rkas->id)->sum('jumlah');
        $spent = min($budget, $rawSpent);
        $remainingBefore = max(0, $budget - $spent);
        $remainingAfter = $remainingBefore - $amount;

        $stagingCard = [
            'type' => 'bku_transaction_draft',
            'variant' => $variant,
            'tahun' => $tahun,
            'tanggal' => $tanggal,
            'jenis_transaksi' => $params['jenis_transaksi'] ?? 'tunai',
            'rkas_id' => $rkas->id,
            'rkas_fk_name' => $actualFk,
            'kode_kegiatan_id' => $rkas->kode_id,
            'nama_kegiatan' => $rkas->kodeKegiatan?->uraian ?? 'Kegiatan Belanja',
            'kode_rekening_id' => $rkas->kode_rekening_id,
            'kode_rekening' => $rkas->rekeningBelanja?->kode_rekening ?? '5.1.02',
            'nama_rekening' => $rkas->rekeningBelanja?->rincian_objek ?? 'Belanja Operasi',
            'uraian' => $params['uraian'],
            'nama_toko' => $params['nama_toko'] ?? 'Penyedia',
            'nominal' => $amount,
            'volume' => $params['volume'] ?? 1,
            'satuan' => $params['satuan'] ?? ($rkas->satuan ?: 'Paket'),
            'harga_satuan' => $params['harga_satuan'] ?? $amount,
            'total_pajak' => $totalPajak,
            'pajak_label' => $pajakInfo['jenis_pajak'] ?? ($totalPajak > 0 ? 'Potong Pajak' : 'Bebas Pajak'),
            'sisa_pagu_sebelum' => $remainingBefore,
            'sisa_pagu_sesudah' => $remainingAfter,
            'is_over_budget' => $remainingAfter < 0,
        ];

        return [
            'status' => 'draft_prepared',
            'message' => 'Draf transaksi berhasil disiapkan dan ditampilkan pada layar.',
            'staging_card' => $stagingCard,
        ];
    }

    /**
     * Tool: Lembar Kerja 221 (Formulir RKA SKPD 2.2.1)
     */
    protected function getLembarKerja221(
        int $tahun,
        string $variant,
        string $tipeDokumen = 'aktif',
        ?string $kodeRekening = null,
        int $limit = 50
    ): array {
        VariantConfig::validateVariant($variant);

        $penganggaranClass = VariantConfig::getModelClass('penganggaran', $variant);
        $rkasClass = VariantConfig::getModelClass('rkas', $variant);
        $rkasPerubahanClass = VariantConfig::getModelClass('rkas_perubahan', $variant);
        $penganggaranFk = VariantConfig::penganggaranFk($variant);

        $penganggaran = $penganggaranClass::where('tahun_anggaran', $tahun)->with('sekolah')->first();
        if (! $penganggaran) {
            return ['error' => "Data penganggaran untuk tahun {$tahun} ({$variant}) tidak ditemukan."];
        }

        $paguAnggaran = (float) $penganggaran->pagu_anggaran;
        $hasPerubahan = $rkasPerubahanClass && $rkasPerubahanClass::where($penganggaranFk, $penganggaran->id)->exists();

        $mode = strtolower(trim($tipeDokumen));
        if ($mode === 'perubahan' && ! $hasPerubahan) {
            $mode = 'murni';
        } elseif ($mode === 'aktif') {
            $mode = $hasPerubahan ? 'perubahan' : 'murni';
        }

        $activeModelClass = ($mode === 'perubahan') ? $rkasPerubahanClass : $rkasClass;

        $allItems = $activeModelClass::where($penganggaranFk, $penganggaran->id)
            ->with(['rekeningBelanja', 'kodeKegiatan'])
            ->get();

        $hierarchyNames = [
            '5' => 'BELANJA',
            '5.1' => 'BELANJA OPERASI',
            '5.1.02' => 'BELANJA BARANG DAN JASA',
            '5.1.02.01' => 'BELANJA BARANG',
            '5.1.02.02' => 'BELANJA JASA',
            '5.1.02.03' => 'BELANJA PEMELIHARAAN',
            '5.1.02.04' => 'BELANJA PERJALANAN DINAS',
            '5.2' => 'BELANJA MODAL',
            '5.2.02' => 'BELANJA MODAL PERALATAN DAN MESIN',
            '5.2.04' => 'BELANJA MODAL JALAN, JARINGAN, DAN IRIGASI',
            '5.2.05' => 'BELANJA MODAL ASET TETAP LAINNYA',
        ];

        // Hitung total header
        $headerTotals = [];
        foreach ($allItems as $item) {
            $code = $item->rekeningBelanja->kode_rekening ?? '';
            $val = (float) $item->jumlah * (float) $item->harga_satuan;
            foreach ($hierarchyNames as $hCode => $hName) {
                if (str_starts_with($code, $hCode)) {
                    $headerTotals[$hCode] = ($headerTotals[$hCode] ?? 0.0) + $val;
                }
            }
        }

        $headerRows = collect();
        foreach ($hierarchyNames as $hCode => $hName) {
            $total = $headerTotals[$hCode] ?? 0.0;
            if ($kodeRekening && ! str_starts_with($hCode, $kodeRekening) && ! str_starts_with($kodeRekening, $hCode)) {
                continue;
            }
            $headerRows->push([
                'type' => 'header',
                'kode_rekening' => $hCode,
                'uraian' => $hName,
                'volume' => null,
                'satuan' => null,
                'harga_satuan' => null,
                'jumlah' => $total,
                'sort_key' => $hCode,
            ]);
        }

        // Siapkan item rows
        $itemRows = $allItems->filter(function ($item) use ($kodeRekening) {
            if (! $kodeRekening) {
                return true;
            }
            $code = $item->rekeningBelanja->kode_rekening ?? '';

            return str_starts_with($code, $kodeRekening);
        })->map(function ($item) {
            $code = $item->rekeningBelanja->kode_rekening ?? '';
            $val = (float) $item->jumlah * (float) $item->harga_satuan;

            return [
                'type' => 'item',
                'kode_rekening' => $code,
                'uraian' => $item->uraian,
                'volume' => (float) $item->jumlah,
                'satuan' => $item->satuan,
                'harga_satuan' => (float) $item->harga_satuan,
                'jumlah' => $val,
                'bulan' => $item->bulan,
                'sort_key' => $code.'Z',
            ];
        });

        $merged = $headerRows->merge($itemRows)->sortBy('sort_key')->values();
        $totalItemsCount = $itemRows->count();
        $slicedRows = $merged->take($limit)->values()->all();

        $totalBelanja = $headerTotals['5'] ?? 0.0;

        return [
            'tahun' => $tahun,
            'sekolah' => $penganggaran->sekolah?->nama_sekolah ?? '-',
            'sumber_dana' => VariantConfig::title($variant),
            'tipe_dokumen' => $mode,
            'pagu_anggaran' => $paguAnggaran,
            'total_belanja' => $totalBelanja,
            'defisit' => $paguAnggaran - $totalBelanja,
            'filter_kode_rekening' => $kodeRekening,
            'total_baris_item' => $totalItemsCount,
            'limit_tampil' => $limit,
            'hierarki_summary' => collect($hierarchyNames)->map(fn ($name, $code) => [
                'kode_rekening' => $code,
                'uraian' => $name,
                'jumlah' => $headerTotals[$code] ?? 0.0,
            ])->values()->all(),
            'rows' => $slicedRows,
        ];
    }

    /**
     * Tool: Rincian Pencairan (RP) per Tahap dan Bulan
     */
    protected function getRincianPencairan(
        int $tahun,
        string $variant,
        ?int $tahap = null,
        string $bulan = 'Semua',
        string $tipeDokumen = 'aktif'
    ): array {
        VariantConfig::validateVariant($variant);

        $penganggaranClass = VariantConfig::getModelClass('penganggaran', $variant);
        $rkasClass = VariantConfig::getModelClass('rkas', $variant);
        $rkasPerubahanClass = VariantConfig::getModelClass('rkas_perubahan', $variant);
        $penganggaranFk = VariantConfig::penganggaranFk($variant);

        $penganggaran = $penganggaranClass::where('tahun_anggaran', $tahun)->with('sekolah')->first();
        if (! $penganggaran) {
            return ['error' => "Data penganggaran untuk tahun {$tahun} ({$variant}) tidak ditemukan."];
        }

        $hasPerubahan = $rkasPerubahanClass && $rkasPerubahanClass::where($penganggaranFk, $penganggaran->id)->exists();

        $mode = strtolower(trim($tipeDokumen));
        if ($mode === 'perubahan' && ! $hasPerubahan) {
            $mode = 'murni';
        } elseif ($mode === 'aktif') {
            $mode = $hasPerubahan ? 'perubahan' : 'murni';
        }

        $sem1 = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
        $sem2 = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

        // Aturan SIKAS: Jika dokumen perubahan aktif, Tahap 1 dari Murni, Tahap 2 dari Perubahan
        $sourceItems = collect();
        if ($mode === 'perubahan') {
            $murniT1 = $rkasClass::where($penganggaranFk, $penganggaran->id)
                ->whereIn('bulan', $sem1)
                ->with(['rekeningBelanja', 'kodeKegiatan'])
                ->get();
            $perubahanT2 = $rkasPerubahanClass::where($penganggaranFk, $penganggaran->id)
                ->whereIn('bulan', $sem2)
                ->with(['rekeningBelanja', 'kodeKegiatan'])
                ->get();
            $sourceItems = $murniT1->concat($perubahanT2);
        } else {
            $sourceItems = $rkasClass::where($penganggaranFk, $penganggaran->id)
                ->with(['rekeningBelanja', 'kodeKegiatan'])
                ->get();
        }

        // Filter tahap & bulan
        $filtered = $sourceItems->filter(function ($item) use ($tahap, $bulan, $sem1) {
            $itemTahap = in_array($item->bulan, $sem1) ? 1 : 2;
            if ($tahap !== null && (int) $tahap !== $itemTahap) {
                return false;
            }
            if ($bulan !== 'Semua' && strcasecmp($item->bulan, $bulan) !== 0) {
                return false;
            }

            return true;
        });

        $mappedItems = [];
        $no = 1;
        $totalBruto = 0.0;
        $totalPpn = 0.0;
        $totalPph21 = 0.0;
        $totalPph23 = 0.0;

        foreach ($filtered as $item) {
            $val = (float) $item->jumlah * (float) $item->harga_satuan;
            $ppn = (float) ($item->pot_ppn ?? 0);
            $pph21 = (float) ($item->pot_pph21 ?? 0) + (float) ($item->pot_pph21_narasumber ?? 0);
            $pph23 = (float) ($item->pot_pph23 ?? 0);
            $pajak = $ppn + $pph21 + $pph23;
            $neto = $val - $pajak;

            $itemTahap = in_array($item->bulan, $sem1) ? 1 : 2;

            $totalBruto += $val;
            $totalPpn += $ppn;
            $totalPph21 += $pph21;
            $totalPph23 += $pph23;

            $mappedItems[] = [
                'no' => $no++,
                'kode_rekening' => $item->rekeningBelanja->kode_rekening ?? '-',
                'kode_kegiatan' => $item->kodeKegiatan->kode ?? '-',
                'nama_kegiatan' => $item->uraian_gabungan ?: $item->uraian,
                'bulan' => $item->bulan,
                'tahap' => $itemTahap,
                'nama_penerima' => $item->nama_penerima ?: '-',
                'jabatan' => $item->jabatan ?: '-',
                'nomor_rekening' => $item->nomor_rekening ?: '-',
                'bank' => $item->bank ?: '-',
                'nomor_kwitansi' => $item->nomor_kwitansi ?: '-',
                'bruto' => $val,
                'pot_ppn' => $ppn,
                'pot_pph21' => $pph21,
                'pot_pph23' => $pph23,
                'total_pajak' => $pajak,
                'diterima_neto' => $neto,
            ];
        }

        $totalPajakAll = $totalPpn + $totalPph21 + $totalPph23;

        return [
            'tahun' => $tahun,
            'sekolah' => $penganggaran->sekolah?->nama_sekolah ?? '-',
            'sumber_dana' => VariantConfig::title($variant),
            'tipe_dokumen' => $mode,
            'filter_tahap' => $tahap,
            'filter_bulan' => $bulan,
            'ringkasan' => [
                'total_anggaran_bruto' => $totalBruto,
                'total_pot_ppn' => $totalPpn,
                'total_pot_pph21' => $totalPph21,
                'total_pot_pph23' => $totalPph23,
                'total_pajak' => $totalPajakAll,
                'total_diterima_neto' => $totalBruto - $totalPajakAll,
                'jumlah_transaksi' => count($mappedItems),
            ],
            'items' => array_slice($mappedItems, 0, 100),
        ];
    }

    /**
     * Tool: Alur Kas Penggunaan Dana BOSP (12 Bulan, Tahap 1 & 2, Saldo Kumulatif)
     */
    protected function getAlurKas(
        int $tahun,
        string $variant,
        ?int $tahap = null,
        string $tipeDokumen = 'aktif'
    ): array {
        VariantConfig::validateVariant($variant);

        $penganggaranClass = VariantConfig::getModelClass('penganggaran', $variant);
        $rkasClass = VariantConfig::getModelClass('rkas', $variant);
        $rkasPerubahanClass = VariantConfig::getModelClass('rkas_perubahan', $variant);
        $penganggaranFk = VariantConfig::penganggaranFk($variant);

        $penganggaran = $penganggaranClass::where('tahun_anggaran', $tahun)->with('sekolah')->first();
        if (! $penganggaran) {
            return ['error' => "Data penganggaran untuk tahun {$tahun} ({$variant}) tidak ditemukan."];
        }

        $paguAnggaran = (float) $penganggaran->pagu_anggaran;
        $hasPerubahan = $rkasPerubahanClass && $rkasPerubahanClass::where($penganggaranFk, $penganggaran->id)->exists();

        $mode = strtolower(trim($tipeDokumen));
        if ($mode === 'perubahan' && ! $hasPerubahan) {
            $mode = 'murni';
        } elseif ($mode === 'aktif') {
            $mode = $hasPerubahan ? 'perubahan' : 'murni';
        }

        $sem1 = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
        $sem2 = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        $allMonths = array_merge($sem1, $sem2);

        $sourceItems = collect();
        if ($mode === 'perubahan') {
            $murniT1 = $rkasClass::where($penganggaranFk, $penganggaran->id)
                ->whereIn('bulan', $sem1)
                ->with(['rekeningBelanja', 'kodeKegiatan'])
                ->get();
            $perubahanT2 = $rkasPerubahanClass::where($penganggaranFk, $penganggaran->id)
                ->whereIn('bulan', $sem2)
                ->with(['rekeningBelanja', 'kodeKegiatan'])
                ->get();
            $sourceItems = $murniT1->concat($perubahanT2);
        } else {
            $sourceItems = $rkasClass::where($penganggaranFk, $penganggaran->id)
                ->with(['rekeningBelanja', 'kodeKegiatan'])
                ->get();
        }

        // Hitung total belanja per bulan
        $belanjaBulanan = [];
        foreach ($allMonths as $m) {
            $belanjaBulanan[$m] = 0.0;
        }
        foreach ($sourceItems as $item) {
            $m = $item->bulan;
            if (isset($belanjaBulanan[$m])) {
                $belanjaBulanan[$m] += (float) $item->jumlah * (float) $item->harga_satuan;
            }
        }

        // Simulasi Alur Kas Bulanan
        $penerimaanT1 = $paguAnggaran / 2;
        $penerimaanT2 = $paguAnggaran / 2;

        $alurBulanan = [];
        $runningSaldo = 0.0;

        foreach ($allMonths as $m) {
            $mTahap = in_array($m, $sem1) ? 1 : 2;
            $masuk = 0.0;
            if ($m === 'Januari') {
                $masuk = $penerimaanT1;
            } elseif ($m === 'Juli') {
                $masuk = $penerimaanT2;
            }

            $keluar = $belanjaBulanan[$m] ?? 0.0;
            $saldoAwal = $runningSaldo;
            $saldoAkhir = $saldoAwal + $masuk - $keluar;
            $runningSaldo = $saldoAkhir;

            $alurBulanan[] = [
                'bulan' => $m,
                'tahap' => $mTahap,
                'saldo_awal' => $saldoAwal,
                'penerimaan' => $masuk,
                'belanja' => $keluar,
                'saldo_akhir' => $saldoAkhir,
            ];
        }

        if ($tahap === 1) {
            $alurBulananFiltered = array_values(array_filter($alurBulanan, fn ($b) => $b['tahap'] === 1));
        } elseif ($tahap === 2) {
            $alurBulananFiltered = array_values(array_filter($alurBulanan, fn ($b) => $b['tahap'] === 2));
        } else {
            $alurBulananFiltered = $alurBulanan;
        }

        $kegiatanGroups = $sourceItems->groupBy(function ($item) {
            return $item->kodeKegiatan?->kode ?? 'Lainnya';
        })->map(function ($items, $kode) use ($allMonths) {
            $first = $items->first();
            $namaKegiatan = $first->kodeKegiatan?->uraian ?? $first->uraian;
            $totalPagu = $items->sum(fn ($i) => (float) $i->jumlah * (float) $i->harga_satuan);
            $sebaran = [];
            foreach ($allMonths as $m) {
                $sebaran[$m] = $items->filter(fn ($i) => $i->bulan === $m)->sum(fn ($i) => (float) $i->jumlah * (float) $i->harga_satuan);
            }

            return [
                'kode_kegiatan' => $kode,
                'nama_kegiatan' => $namaKegiatan,
                'pagu' => $totalPagu,
                'sebaran_bulan' => $sebaran,
            ];
        })->values()->take(20)->all();

        $totalBelanjaT1 = collect($alurBulanan)->where('tahap', 1)->sum('belanja');
        $totalBelanjaT2 = collect($alurBulanan)->where('tahap', 2)->sum('belanja');
        $totalBelanjaTahun = $totalBelanjaT1 + $totalBelanjaT2;

        return [
            'tahun' => $tahun,
            'sekolah' => $penganggaran->sekolah?->nama_sekolah ?? '-',
            'sumber_dana' => VariantConfig::title($variant),
            'tipe_dokumen' => $mode,
            'pagu_anggaran' => $paguAnggaran,
            'penerimaan' => [
                'tahap_1' => $penerimaanT1,
                'tahap_2' => $penerimaanT2,
                'total' => $paguAnggaran,
            ],
            'belanja' => [
                'tahap_1' => $totalBelanjaT1,
                'tahap_2' => $totalBelanjaT2,
                'total' => $totalBelanjaTahun,
            ],
            'saldo_akhir_tahun' => $runningSaldo,
            'alur_bulanan' => $alurBulananFiltered,
            'kegiatan_sample' => $kegiatanGroups,
        ];
    }

    /**
     * Tool: Analitik dan grafik perbandingan realisasi
     */
    protected function queryRealizationComparison(int $tahun, string $variant, string $groupBy): array
    {
        $penganggaranClass = VariantConfig::getModelClass('penganggaran', $variant);
        $bkuClass = VariantConfig::getModelClass('bku', $variant);
        $bkuFk = VariantConfig::penganggaranFk($variant);

        $penganggaran = $penganggaranClass::where('tahun_anggaran', $tahun)->first();
        if (! $penganggaran) {
            return ['error' => 'Penganggaran tahun aktif tidak ditemukan.'];
        }

        if ($groupBy === 'triwulan') {
            $q1 = (float) $bkuClass::where($bkuFk, $penganggaran->id)->whereBetween(DB::raw('EXTRACT(MONTH FROM tanggal_transaksi)'), [1, 3])->sum('dibelanjakan');
            $q2 = (float) $bkuClass::where($bkuFk, $penganggaran->id)->whereBetween(DB::raw('EXTRACT(MONTH FROM tanggal_transaksi)'), [4, 6])->sum('dibelanjakan');
            $q3 = (float) $bkuClass::where($bkuFk, $penganggaran->id)->whereBetween(DB::raw('EXTRACT(MONTH FROM tanggal_transaksi)'), [7, 9])->sum('dibelanjakan');
            $q4 = (float) $bkuClass::where($bkuFk, $penganggaran->id)->whereBetween(DB::raw('EXTRACT(MONTH FROM tanggal_transaksi)'), [10, 12])->sum('dibelanjakan');

            $chartData = [
                'type' => 'bar',
                'title' => "Perbandingan Realisasi Belanja per Triwulan ({$tahun})",
                'categories' => ['Triwulan I', 'Triwulan II', 'Triwulan III', 'Triwulan IV'],
                'series' => [
                    [
                        'name' => 'Realisasi Belanja',
                        'data' => [$q1, $q2, $q3, $q4],
                    ],
                ],
                'summary_kpi' => [
                    'total_realisasi' => $q1 + $q2 + $q3 + $q4,
                    'triwulan_tertinggi' => 'Triwulan '.(array_search(max($q1, $q2, $q3, $q4), [$q1, $q2, $q3, $q4]) + 1),
                ],
            ];

            return [
                'group_by' => 'triwulan',
                'chart_data' => $chartData,
            ];
        }

        // Default: Kategori Belanja (Barang Jasa vs Modal)
        $barangJasa = (float) $bkuClass::where($bkuFk, $penganggaran->id)
            ->whereHas('rekeningBelanja', fn ($q) => $q->where('kode_rekening', 'like', '5.1.02%'))
            ->sum('dibelanjakan');

        $modal = (float) $bkuClass::where($bkuFk, $penganggaran->id)
            ->whereHas('rekeningBelanja', fn ($q) => $q->where('kode_rekening', 'like', '5.2%'))
            ->sum('dibelanjakan');

        $pegawai = (float) $bkuClass::where($bkuFk, $penganggaran->id)
            ->whereHas('rekeningBelanja', fn ($q) => $q->where('kode_rekening', 'like', '5.1.01%'))
            ->sum('dibelanjakan');

        $chartData = [
            'type' => 'bar',
            'title' => "Realisasi per Kelompok Belanja ({$tahun})",
            'categories' => ['Belanja Pegawai/Honor', 'Belanja Barang & Jasa', 'Belanja Modal (Aset)'],
            'series' => [
                [
                    'name' => 'Realisasi',
                    'data' => [$pegawai, $barangJasa, $modal],
                ],
            ],
            'summary_kpi' => [
                'total_realisasi' => $pegawai + $barangJasa + $modal,
            ],
        ];

        return [
            'group_by' => 'jenis_belanja',
            'chart_data' => $chartData,
        ];
    }

    /**
     * Menyimpan transaksi BKU yang telah disetujui pengguna dari Staging Card
     */
    public function commitBkuTransaction(User $user, string $variant, int $tahun, array $payload): array
    {
        VariantConfig::validateVariant($variant);

        $penganggaranClass = VariantConfig::getModelClass('penganggaran', $variant);
        $bkuClass = VariantConfig::getModelClass('bku', $variant);
        $bkuDetailClass = VariantConfig::getModelClass('bku_uraian_detail', $variant);

        $penganggaran = $penganggaranClass::where('tahun_anggaran', $tahun)->first();
        if (! $penganggaran) {
            return ['success' => false, 'message' => 'Penganggaran tahun aktif tidak ditemukan.'];
        }

        $bkuFk = VariantConfig::penganggaranFk($variant);
        $isTahap2 = false;
        if (! empty($payload['tanggal'])) {
            $month = (int) Carbon::parse($payload['tanggal'])->format('n');
            $isTahap2 = ($month >= 7);
        }
        $rkasFk = $payload['rkas_fk_name'] ?? VariantConfig::uraianDetailRkasFk($variant, $isTahap2);

        try {
            return DB::transaction(function () use ($variant, $penganggaran, $bkuClass, $bkuDetailClass, $bkuFk, $rkasFk, $payload) {
                $amount = (float) ($payload['nominal'] ?? 0);
                $totalPajak = (float) ($payload['total_pajak'] ?? 0);

                // Buat entri BKU Utama
                $bku = new $bkuClass;
                $bku->{$bkuFk} = $penganggaran->id;
                $bku->tanggal_transaksi = $payload['tanggal'] ?? now()->format('Y-m-d');
                $bku->jenis_transaksi = $payload['jenis_transaksi'] ?? 'tunai';
                $bku->uraian = $payload['uraian'] ?? 'Pembayaran Belanja';
                $bku->dibelanjakan = $amount;
                $bku->total_transaksi_kotor = $amount;
                $bku->nama_toko = $payload['nama_toko'] ?? null;
                $bku->nama_penerima_pembayaran = $payload['nama_toko'] ?? null;
                $bku->kode_kegiatan_id = $payload['kode_kegiatan_id'] ?? null;
                $bku->rekening_belanja_id = $payload['kode_rekening_id'] ?? null;

                if ($totalPajak > 0) {
                    $bku->total_pajak = $totalPajak;
                    $bku->pajak = $payload['pajak_label'] ?? 'Pajak';
                }

                $bku->save();

                // Buat rincian uraian detail
                $detail = new $bkuDetailClass;
                $detail->{VariantConfig::bkuFk($variant)} = $bku->id;
                $detail->uraian = $payload['uraian'] ?? 'Item Belanja';
                $detail->volume = $payload['volume'] ?? 1;
                $detail->satuan = $payload['satuan'] ?? 'Paket';
                $detail->harga_satuan = $payload['harga_satuan'] ?? $amount;
                $detail->jumlah = $amount;
                $detail->kode_kegiatan_id = $payload['kode_kegiatan_id'] ?? null;
                $detail->rekening_belanja_id = $payload['kode_rekening_id'] ?? null;
                $detail->{$rkasFk} = $payload['rkas_id'] ?? null;
                $detail->save();

                return [
                    'success' => true,
                    'message' => 'Transaksi belanja berhasil disimpan ke Buku Kas Umum!',
                    'bku_id' => $bku->id,
                ];
            });
        } catch (\Throwable $e) {
            Log::error('Commit BKU Transaction failed: '.$e->getMessage());

            return [
                'success' => false,
                'message' => 'Gagal menyimpan transaksi: '.$e->getMessage(),
            ];
        }
    }

    /**
     * Sanitasi teks respons assistant untuk mencegah kebocoran nama variabel, sintaks kode, ID internal, dan query SQL
     */
    protected function sanitizeResponseText(string $text): string
    {
        if (empty($text)) {
            return '';
        }

        // 1. Bersihkan variabel berawalan $ (seperti $spent, $rkas_id, $remaining)
        $text = preg_replace('/\$[a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*/', '', $text);

        // 2. Bersihkan penyebutan nama variabel sistem internal
        $text = preg_replace('/\b(found_count|filter_bulan)\b/i', '', $text);

        // 3. Bersihkan kolom atau penyebutan ID Kegiatan / rkas_id
        $text = preg_replace('/<th[^>]*>\s*(?:ID Kegiatan|rkas_id)\s*<\/th>/i', '', $text);
        $text = preg_replace('/<td[^>]*>\s*(?:ID Kegiatan|rkas_id)\s*:\s*\d+\s*<\/td>/i', '', $text);
        $text = preg_replace('/\b(?:ID Kegiatan|rkas_id)\s*[:=\-]?\s*\d+\b/i', '', $text);

        // 4. Samarkan technical key names yang umum menjadi istilah ramah bendahara
        $replacements = [
            '/\bbku_id\b/i' => 'ID Transaksi BKU',
            '/\bkode_rekening_id\b/i' => 'Kode Rekening',
            '/\bkode_kegiatan_id\b/i' => 'Kode Kegiatan',
            '/\bsisa_pagu\b/i' => 'Sisa Anggaran',
            '/\btotal_anggaran\b/i' => 'Total Anggaran',
            '/\buraian_detail\b/i' => 'Rincian Belanja',
            '/\brkas_id\b/i' => '',
            '/\bid_kegiatan\b/i' => '',
        ];
        $text = preg_replace(array_keys($replacements), array_values($replacements), $text);

        // 5. Bersihkan blok kode teknis (sql, php, bash, python, json) jika ada
        $text = preg_replace('/```(?:sql|php|bash|sh|powershell|cmd|python)\b[\s\S]*?```/i', '', $text);

        // 6. Bersihkan cuplikan raw SQL jika ada yang bocor di teks bebas
        $text = preg_replace('/\b(SELECT\s+.*?\s+FROM|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM)\s+[^;\n]+(?:;)?/is', '', $text);

        // 7. Bersihkan sisa backtick kosong `` jika variabel di dalamnya terhapus
        $text = str_replace(['``', '` `'], '', $text);

        return trim($text);
    }
}
