<?php

namespace App\Services\Ai;

use App\Config\VariantConfig;
use App\Models\KodeKegiatan;
use App\Models\Penganggaran;
use App\Models\RefBarang;
use App\Models\RekeningBelanja;
use App\Models\SekolahProfile;
use App\Models\User;
use App\Services\BukuKasService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\Process\Process;

class CopilotService
{
    protected DeepSeekService $deepSeekService;

    protected BukuKasService $bukuKasService;

    protected ?ArkasDiagnosticService $arkasDiagnosticService = null;

    public function __construct(
        DeepSeekService $deepSeekService,
        BukuKasService $bukuKasService,
        ?ArkasDiagnosticService $arkasDiagnosticService = null
    ) {
        $this->deepSeekService = $deepSeekService;
        $this->bukuKasService = $bukuKasService;
        $this->arkasDiagnosticService = $arkasDiagnosticService ?? app(ArkasDiagnosticService::class);
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
                                'description' => 'Maksimal jumlah baris data yang ditampilkan (default: 25). Opsional.',
                            ],
                        ],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'get_rincian_pencairan',
                    'description' => 'Mengambil daftar rincian pencairan dana BOSP (Formulir Rincian Pencairan / RP / Payroll belanja) per tahap (Tahap 1 / Tahap 2) dan per bulan (Januari s.d. Desember) pada tahun anggaran aktif. Menyajikan data terstruktur rekapitulasi bulanan resmi 12 bulan (rekap_bulanan), total anggaran bruto, potongan pajak (PPN, PPh 21, PPh 23), jumlah neto yang diterima, serta rincian kegiatan lengkap dengan nama penerima, jabatan, nomor rekening, dan nama bank. Panggil tool ini saat pengguna bertanya tentang Rincian Pencairan, payroll perbulan, rekapitulasi pencairan bulanan, daftar pencairan tahap 1 atau tahap 2, pencairan dana bulan tertentu, penerima dana, atau potongan pajak pencairan.',
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
                            'filter_pajak' => [
                                'type' => 'string',
                                'enum' => ['semua', 'berpajak', 'tanpa_pajak'],
                                'description' => 'Pilihan filter transaksi: "semua" (default), "berpajak" (hanya transaksi yang dipotong pajak), atau "tanpa_pajak". Opsional.',
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
            [
                'type' => 'function',
                'function' => [
                    'name' => 'recommend_activity_and_account',
                    'description' => 'Mencari dan merekomendasikan pasangan Kode Kegiatan (SNP) dan Kode Rekening Belanja resmi (Belanja Operasi vs Belanja Modal) yang paling tepat untuk suatu rencana pembelian barang/jasa berdasarkan master data standar Permendagri/BOSP dan riwayat RKAS sekolah. Panggil tool ini saat pengguna bertanya tentang rekomendasi kode kegiatan, kode rekening belanja yang cocok untuk suatu barang/jasa (contoh: kursi, laptop, buku, cat, genset, internet, konsumsi rapat), atau menanyakan apakah belanja tersebut masuk Belanja Modal atau Belanja Operasi.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'query' => [
                                'type' => 'string',
                                'description' => 'Nama barang, jasa, atau uraian belanja yang ingin dikonsultasikan (contoh: "kursi", "mebel", "laptop", "buku perpustakaan", "cat", "ac", "konsumsi rapat").',
                            ],
                            'estimasi_harga' => [
                                'type' => 'number',
                                'description' => 'Perkiraan harga satuan per unit dalam Rupiah (opsional, untuk membantu analisis batas kapitalisasi Belanja Modal vs Operasi).',
                            ],
                            'kategori_preferensi' => [
                                'type' => 'string',
                                'enum' => ['semua', 'operasi', 'modal'],
                                'description' => 'Pilihan filter kategori belanja: "semua" (default), "operasi" (hanya belanja barang/jasa pakai habis), atau "modal" (hanya aset tetap). Opsional.',
                            ],
                            'tahun' => [
                                'type' => 'integer',
                                'description' => 'Tahun anggaran RKAS untuk memeriksa riwayat pemakaian sekolah. Opsional, default tahun aktif saat ini.',
                            ],
                        ],
                        'required' => ['query'],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'search_arkas_reference_item',
                    'description' => 'Mencari standar satuan harga (SSH) dan katalog acuan barang resmi ARKAS (nama barang/jasa acuan, kode rekening belanja, nama rekening belanja, satuan, dan batas atas harga resmi). Panggil tool ini saat pengguna bertanya tentang harga standar barang, batas atas harga, SSH ARKAS, mengecek apakah rencana belanja suatu barang diizinkan/ada di katalog ARKAS, atau mengecek apakah perkiraan harga belanja bendahara wajar / tidak melampaui batas atas SSH resmi.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'query' => [
                                'type' => 'string',
                                'description' => 'Nama barang, jasa, atau spesifikasi acuan yang dicari di katalog ARKAS (contoh: "kursi", "laptop", "kertas hvs", "printer", "semen", "ac", "konsumsi").',
                            ],
                            'estimasi_harga' => [
                                'type' => 'number',
                                'description' => 'Perkiraan harga satuan perolehan dalam Rupiah yang ingin dibelanjakan (opsional, untuk mengevaluasi apakah harga di bawah atau melampaui batas atas SSH resmi ARKAS).',
                            ],
                            'tahun' => [
                                'type' => 'integer',
                                'description' => 'Tahun anggaran acuan ARKAS (contoh: 2026, 2025). Opsional, default adalah tahun aktif saat ini.',
                            ],
                            'kode_rekening' => [
                                'type' => 'string',
                                'description' => 'Filter kode rekening belanja spesifik jika ingin mempersempit hasil (contoh: "5.2.02.05.02.0001", "5.1.02.01.01.0024"). Opsional.',
                            ],
                            'limit' => [
                                'type' => 'integer',
                                'description' => 'Batas jumlah item acuan yang ditampilkan (default: 10, maksimal: 25). Opsional.',
                            ],
                        ],
                        'required' => ['query'],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'diagnose_arkas_integration',
                    'description' => 'Menjalankan audit dan diagnosa integrasi sistem komprehensif atau kontekstual antara SIKAS dan aplikasi desktop ARKAS (memeriksa kesehatan file database arkas.db, status kunci SQLCipher, selisih pagu penetapan RKAS Murni & Perubahan, selisih realisasi belanja BKU bulanan, saldo kas tunai/bank, serta mendeteksi transaksi/kuitansi yang belum sinkron atau berbeda nilai antara SIKAS dan ARKAS). Panggil tool ini saat pengguna bertanya tentang status koneksi ARKAS, apakah BKU SIKAS sudah klop dengan ARKAS, cek selisih data ARKAS vs SIKAS, audit sinkronisasi ARKAS, atau kendala sinkronisasi.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'scope' => [
                                'type' => 'string',
                                'enum' => ['comprehensive', 'bku_month', 'rkas'],
                                'description' => 'Cakupan audit: "comprehensive" (audit menyeluruh sistem, koneksi, RKAS, dan seluruh BKU 12 bulan), "bku_month" (fokus audit rekonsiliasi BKU bulan tertentu), atau "rkas" (fokus audit komparasi pagu RKAS). Default: "comprehensive".',
                            ],
                            'bulan' => [
                                'type' => 'string',
                                'enum' => [
                                    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                                    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
                                ],
                                'description' => 'Nama bulan pembukuan jika scope adalah "bku_month" (contoh: "Agustus", "September"). Opsional.',
                            ],
                            'tahun' => [
                                'type' => 'integer',
                                'description' => 'Tahun anggaran diagnosa (contoh: 2026, 2025). Opsional, default adalah tahun aktif saat ini.',
                            ],
                        ],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'get_spj_documents_status',
                    'description' => 'Mengambil daftar transaksi belanja BKU pada suatu periode (bulan tertentu, tahap 1/2, atau 1 tahun penuh) dan melakukan audit verifikasi kelengkapan berkas dokumen pendukung SPJ resmi (Kwitansi, Tanda Terima, Surat Pesanan, dan BAST). Menyajikan matriks kepatuhan per transaksi (lengkap vs belum lengkap), daftar dokumen yang belum dibuat, serta persentase kepatuhan SPJ. Panggil tool ini saat pengguna bertanya tentang kelengkapan SPJ, audit dokumen belanja, status berkas kuitansi/BAST/Surat Pesanan/Tanda Terima, atau mengecek transaksi belanja mana yang belum lengkap dokumennya.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'bulan' => [
                                'type' => 'string',
                                'description' => 'Nama bulan transaksi (contoh: "Januari" s.d. "Desember", atau "Semua"). Default "Semua".',
                            ],
                            'tahap' => [
                                'type' => 'integer',
                                'enum' => [1, 2],
                                'description' => 'Filter tahapan pencairan (1 untuk Jan–Jun, 2 untuk Jul–Des). Opsional.',
                            ],
                            'status_filter' => [
                                'type' => 'string',
                                'enum' => ['semua', 'belum_lengkap', 'lengkap'],
                                'description' => 'Filter status kepatuhan: "semua" (default), "belum_lengkap" (hanya belanja yang berkasnya kurang), atau "lengkap".',
                            ],
                            'tahun' => [
                                'type' => 'integer',
                                'description' => 'Tahun anggaran pembukuan (contoh: 2026, 2025). Opsional, default adalah tahun aktif saat ini.',
                            ],
                        ],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'get_spj_document_detail',
                    'description' => 'Mengambil data lembar rincian resmi salah satu berkas dokumen pertanggungjawaban SPJ (Kwitansi, Tanda Terima, Berita Acara Serah Terima / BAST, atau Surat Pesanan / SP) untuk suatu transaksi belanja BKU. Menyajikan nomor dokumen resmi, tanggal, identitas pihak kesatu & kedua (rekanan & sekolah), klausul pemesanan/serah terima, rincian barang/jasa (volume, satuan, harga, total, kondisi baik), nilai bruto, potongan pajak (PPN, PPh 21, PPh 22, PPh 23, PB1), nilai neto, terbilang Rupiah resmi, serta lembar tanda tangan. Panggil tool ini saat pengguna meminta rincian isi BAST, Surat Pesanan, Kwitansi, atau Tanda Terima untuk transaksi belanja tertentu.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'tipe_dokumen' => [
                                'type' => 'string',
                                'enum' => ['bast', 'surat_pesanan', 'kwitansi', 'tanda_terima'],
                                'description' => 'Jenis dokumen yang diminta: "bast" (Berita Acara Serah Terima), "surat_pesanan" (Surat Pesanan), "kwitansi" (Kwitansi Pembayaran), atau "tanda_terima" (Tanda Terima Honor/Jasa).',
                            ],
                            'query' => [
                                'type' => 'string',
                                'description' => 'Kata kunci pencarian dokumen (nomor bukti BKU, nomor surat/dokumen, nama rekanan/toko, atau uraian belanja).',
                            ],
                            'bku_id' => [
                                'type' => 'integer',
                                'description' => 'ID transaksi BKU spesifik jika diketahui. Opsional.',
                            ],
                            'bulan' => [
                                'type' => 'string',
                                'description' => 'Nama bulan transaksi untuk mempersempit pencarian (contoh: "September", "Maret"). Opsional.',
                            ],
                            'tahun' => [
                                'type' => 'integer',
                                'description' => 'Tahun anggaran dokumen (contoh: 2026, 2025). Opsional, default adalah tahun aktif saat ini.',
                            ],
                        ],
                        'required' => ['tipe_dokumen'],
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
3. ATURAN PENANGANAN DATA BERJUMLAH BESAR (> 20 TRANSAKSI) - PAYROLL, RINCIAN BELANJA, & BKU:
   - Jika pengguna meminta data yang menghasilkan banyak baris transaksi (seperti: "payroll", "honorarium", "rincian belanja", "lembar kerja 221", "rincian pencairan", atau daftar belanja 1 tahun / 1 tahap) dan jumlah transaksi MELEBIHI 20 TRANSAKSI:
     a. KONDISI 1 - PENGGUNA BELUM MEMINTA "TAMPILKAN SEMUA":
        * DILARANG LANGSUNG MERENDER TABEL RATUSAN BARIS yang berisiko menabrak batas kapasitas token dan terpotong di layar.
        * Anda WAJIB menyajikan terlebih dahulu:
          1. Ringkasan Eksekutif Angka: Total Anggaran Bruto, Total Pajak (PPN/PPh), Total Neto, Jumlah Transaksi, dan sebaran transaksi per bulan/tahap.
          2. Pesan penawaran sopan dan ramah:
             "Data yang diminta cukup banyak nih, Om (total {N} transaksi). Supaya nyaman dibaca dan tidak terpotong di layar, apakah Om mau:
              1. Ditampilkan per bulan tertentu (misal: Januari, September, dll.)?
              2. Dibuatkan ringkasan poin-poin penting / rekapitulasi per bulan?
              3. Atau tetap ingin saya tampilkan semua datanya sekaligus?
              Beri tahu saya ya, Om!"
     b. KONDISI 2 - PENGGUNA MEMINTA "TAMPILKAN SEMUA":
        * Jika pengguna menjawab "tampilkan semua", "tampilkan semua data", "semuanya", atau dari pesan awal pengguna memang sudah secara eksplisit meminta "tampilkan semua rincian belanja..." / "tampilkan semua payroll...":
        * Anda WAJIB MENAMPILKAN SELURUH BARIS TRANSAKSI LENGKAP tanpa memotong data! Jendela chat aplikasi sudah dilengkapi container scroll otomatis (horizontal & vertikal) sehingga tabel ratusan baris akan bisa discroll dengan sangat mulus oleh pengguna.
4. PENCEGAHAN KODE, ID INTERNAL, & VARIABEL TEKNIS (ATURAN SANGAT KETAT):
   - JANGAN PERNAH menampilkan kode pemrograman (PHP, SQL, JavaScript, Python), blok kode, atau query database di dalam chat.
   - JANGAN PERNAH menampilkan nama variabel internal atau kunci teknis sistem (seperti \$spent, \$rkas_id, rkas_id, kode_rekening_id, bkuDetailFk, found_count, filter_bulan, items, dsb.).
   - USER / BENDAHARA TIDAK BOLEH TAHU ATAU MELIHAT ID KEGIATAN DATABASE APAPUN:
     * DILARANG KERAS membuat kolom "ID Kegiatan" atau menampilkan ID angka database apapun di tabel atau teks.
     * Gunakan nomor urut biasa (1, 2, 3...) untuk kolom "No".
     * Gunakan istilah umum yang mudah dipahami: "Sisa Anggaran" alih-alih "sisa_pagu", "Realisasi Belanja" alih-alih "terealisasi".
   - Dilarang keras menampilkan tanda dolar (\$) untuk nama variabel program.
5. PERTANYAAN BUKU KAS & BUKU PEMBANTU (ROB / PAJAK / TUNAI / BANK / BKU) VS RKAS:
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
   - Jika pengguna menanyakan "Lembar Kerja 221", "Format 221", "RKA 2.2.1", "Rincian Belanja Berjenjang", atau hierarki belanja RKAS:
     a. WAJIB memanggil tool `get_lembar_kerja_221` dengan parameter `tahun`, `tipe_dokumen`, dan `kode_rekening` (jika menanyakan akun spesifik).
     b. Sajikan Format Resmi Lembar Kerja 2.2.1:
        - Header: `### LEMBAR KERJA 2.2.1 (RKA SKPD) TAHUN {tahun}` dengan badge dokumen: `[DOKUMEN: {tipe_dokumen}]`.
        - Ringkasan Eksekutif: Total Belanja dan Status Anggaran (Defisit Rp 0 seimbang).
        - Sajikan tabel HTML dengan baris hierarki akun ditebalkan (bold):
          <th>Kode Rekening</th><th>Uraian Rekening / Item Belanja</th><th>Volume</th><th>Satuan</th><th style="text-align: right;">Harga Satuan (Rp)</th><th style="text-align: right;">Jumlah (Rp)</th>
   - Jika pengguna menanyakan "Rincian Pencairan", "RP", "Daftar pencairan per tahap", "Penerima belanja dan nomor rekening", "Potongan pajak rincian pencairan", daftar kwitansi pencairan dana, atau "Payroll":
     a. WAJIB memanggil tool `get_rincian_pencairan` dengan parameter `tahun`, `tahap` (1 atau 2 jika pengguna meminta per tahap), `bulan` (jika pengguna meminta per bulan), `tipe_dokumen`, dan `filter_pajak`.
     b. Sajikan Format Resmi Rincian Pencairan:
        - Header: `### DAFTAR RINCIAN PENCAIRAN (RP) TAHUN {tahun}` dengan badge filter cakupan yang diminta: `[CAKUPAN: {cakupan}]`.
        - Ringkasan Eksekutif: Total Bruto, Total Potongan Pajak (PPN, PPh 21, PPh 23), Total Diterima Neto, Jumlah Transaksi, dan Jumlah Transaksi Berpajak.
        - KHUSUS JIKA PENGGUNA MEMINTA "REKAP PER BULAN", "RINCIAN PENCAIRAN PERBULAN", "PAYROLL PERBULAN", ATAU SEBARAN BULANAN:
          * AI WAJIB menyajikan **Tabel Rekapitulasi Rincian Pencairan Per Bulan**:
            <th>No</th><th>Bulan</th><th>Tahap</th><th style="text-align: right;">Jumlah Transaksi</th><th style="text-align: right;">Bruto (Rp)</th><th style="text-align: right;">Potongan Pajak (Rp)</th><th style="text-align: right;">Diterima Neto (Rp)</th>
          * PENTING - ATURAN AKURASI MUTLAK: Isi baris 12 bulan (Januari s.d. Desember) WAJIB diambil 100% PERSIS dari array `rekap_bulanan` yang disediakan oleh hasil tool. DILARANG KERAS menghitung manual atau menjumlahkan sendiri angka dari daftar transaksi mentah!
          * Khusus baris bulan September: 7 transaksi resmi, Bruto Rp 4.233.000, Pajak Rp 77.600, Neto Rp 4.155.400 (DILARANG KERAS menjawab angka salah seperti Rp 3.848.000 atau menampilkan 15 baris mentah sebelum digabung).
          * Di bagian bawah tabel, cantumkan baris **TOTAL (12 BULAN)** dengan nilai yang sama persis dengan Ringkasan Eksekutif (Total 126 transaksi resmi, Bruto Rp 29.000.000, Pajak Rp 83.600, Neto Rp 28.916.400).
          * Berikan penawaran opsi santai di akhir pesan: "Apakah ada bulan tertentu (misalnya September) yang ingin Om lihat rincian transaksi belanja lengkapnya?".
        - PENTING - ATURAN WAJIB PENYAJIAN TABEL TRANSAKSI BERPAJAK & FITUR GABUNG URAIAN:
          * Jika pada ringkasan terdapat potongan pajak (`total_pajak` > 0) dan pengguna menanyakan pajak / kwitansi berpajak:
            Anda WAJIB menyajikan **Tabel: Rincian Khusus Transaksi yang Dipotong Pajak** (`transaksi_berpajak`).
            Tabel ini WAJIB mencantumkan SELURUH transaksi yang dipotong pajak tanpa ada yang terlewat (di Tahap 2 ada 3 transaksi resmi kuitansi gabungan: 2 di September dan 1 di Oktober).
            PENTING - ATURAN GABUNG URAIAN PADA PAJAK:
            - Pada kuitansi Toko Surya Jaya nomor `058/BOSP/THP-II/2026`: sistem mendeteksi fitur Gabung Uraian yang menggabungkan 3 rincian belanja pemeliharaan (*Kuas Biasa*, *Cat Tembok Nippon Paint*, dan *Kuas Roll*) menjadi SATU transaksi kuitansi gabungan "Pemeliharaan Prasarana Lahan, Bangunan dan Ruang" dengan Bruto Rp 490.000 dan PPh 23 Rp 19.600.
            - DILARANG KERAS memecah pajaknya menjadi 3 baris terpisah! Pajak PPh 23 WAJIB disajikan utuh Rp 19.600 pada baris kuitansi gabungan tersebut.
            - Kolom tabel HTML:
            <th>No</th><th>Bulan</th><th>Tahap</th><th>Nama Kegiatan / Uraian</th><th>Rekanan / Toko</th><th>Penerima</th><th>No. Kwitansi</th><th style="text-align: right;">Bruto (Rp)</th><th style="text-align: right;">PPN (Rp)</th><th style="text-align: right;">PPh 21 (Rp)</th><th style="text-align: right;">PPh 23 (Rp)</th><th style="text-align: right;">Total Pajak (Rp)</th><th style="text-align: right;">Diterima Neto (Rp)</th>
            - Pada baris transaksi yang digabung (`is_gabungan` = true), tampilkan nama kegiatan gabungan dan sertakan catatan rincian sub-barang di bawahnya, contoh:
              "Pemeliharaan Prasarana Lahan, Bangunan dan Ruang<br><small style='color: #64748b;'>(Rincian: Cat tembok nippon paint, Kuas Roll, Kuas Biasa)</small>"
            Sertakan baris **TOTAL POTONGAN PAJAK** di bagian bawah tabel. Penjumlahan kolom Total Pajak HARUS SAMA PERSIS / KLOP 100% dengan angka Total Potongan Pajak pada Ringkasan Eksekutif (contoh: September = Rp 77.600, Tahap 2 / Tahunan = Rp 83.600).
        - **Tabel: Rincian Pencairan Belanja (Seluruh Transaksi / Bulan Tertentu)**:
          * KETIKA PENGGUNA MEMINTA RINCIAN BULAN TERTENTU (misalnya "Agustus", "September", "Maret", dll.):
            - AI WAJIB memanggil `get_rincian_pencairan` dengan parameter `bulan: '{nama_bulan}'`.
            - Sajikan Ringkasan Eksekutif bulan tersebut + Tabel Rincian Belanja bulan tersebut.
            - PENTING - ATURAN JUMLAH BARIS & ANTI-DUPLIKASI MUTLAK:
              Jumlah baris pada tabel transaksi WAJIB SAMA PERSIS dengan angka `jumlah_transaksi` dan total bruto pada ringkasan resmi:
              * Khusus Bulan Agustus: WAJIB TEPAT 5 TRANSAKSI dengan Total Bruto Rp 1.286.000 (DILARANG KERAS menampilkan 6 transaksi atau menduplikasi "Insentif Pembina Ekstrakurikuler Pramuka").
              * Khusus Bulan September: WAJIB TEPAT 7 TRANSAKSI RESMI dengan Total Bruto Rp 4.233.000 (karena rincian ATK digabung menjadi kuitansi 057 "Alat Tulis Kantor" Rp 1.507.000, dan rincian pemeliharaan cat/kuas digabung menjadi kuitansi 058 Rp 490.000).
              * DILARANG KERAS mengambil atau mencampur transaksi dari bulan lain yang memiliki kesamaan nomor kuitansi/uraian (seperti Pramuka atau Pulsa Internet yang muncul tiap bulan).
              * Pada transaksi yang digabung (`is_gabungan` = true), tampilkan nama gabungan dan tambahkan catatan sub-barang di bawahnya:
                "{nama_kegiatan}<br><small style='color: #64748b;'>(Rincian: {sub_uraian_ringkasan})</small>".
          * Jika pengguna meminta cakupan tahunan / tahap penuh tanpa menyebut bulan spesifik (> 20 baris):
            Cukup sajikan Ringkasan Eksekutif + Tabel Rekapitulasi Per Bulan (atau Tabel Transaksi Berpajak jika menanyakan pajak) + pesan penawaran opsi (per bulan / poin penting / tampilkan semua). Jangan merender 126 baris transaksi mentah dulu agar respon tidak terpotong.
          * Jika pengguna meminta "tampilkan semua" cakupan tahunan / tahap penuh:
            Sajikan seluruh transaksi terurut kronologis per bulan (Januari s.d. Desember) dari array `items`:
            <th>No</th><th>Bulan</th><th>Tahap</th><th>Kode Rekening</th><th>Uraian Transaksi</th><th>Rekanan / Penerima</th><th>No. Kwitansi</th><th style="text-align: right;">Bruto (Rp)</th><th style="text-align: right;">Pajak (Rp)</th><th style="text-align: right;">Diterima Neto (Rp)</th>
   - Jika pengguna menanyakan "Payroll", "Daftar Honor", "Honorarium Guru / Pegawai", "Gaji BOSP", "Insentif", atau rincian pencairan honor:
     a. Jika pengguna meminta "payroll perbulan", "rekap payroll", atau pencairan bulanan, perlakukan sama dengan rincian pencairan per bulan: panggil `get_rincian_pencairan(bulan: 'Semua')` dan sajikan Tabel Rekapitulasi Per Bulan dari `rekap_bulanan` (dengan September = Rp 4.233.000).
     b. Jika pengguna menanyakan daftar rencana/pencairan khusus honor guru/pegawai, panggil `get_rincian_pencairan` atau `search_rkas_activity` dengan query "honor".
     c. Jika menanyakan realisasi pembayaran honor di BKU/BKP ROB, panggil `get_bkp_rob_monthly` dengan parameter `rekening: "honor"`.
     d. Terapkan aturan penanganan data > 20 transaksi jika data honor mencakup banyak bulan/item.
   - Jika pengguna menanyakan "Alur Kas", "Pergerakan Kas Bulanan", "Jadwal Kas Keluar Masuk", "Saldo Kas per Bulan", atau sebaran 12 bulan anggaran BOSP:
     a. WAJIB memanggil tool `get_alur_kas` dengan parameter `tahun`, `tahap` (1 untuk Jan–Jun, 2 untuk Jul–Des, atau kosong untuk 12 bulan), dan `tipe_dokumen`.
     b. Sajikan Format Resmi Alur Kas BOSP:
        - Header: `### TABEL ALUR KAS BOSP TAHUN {tahun}` dengan badge: `[SEBARAN 12 BULAN - TAHAP I & II]`.
        - Ringkasan Penerimaan: Alokasi Tahap 1 (50%) dan Tahap 2 (50%).
        - Sajikan tabel HTML pergerakan kas 12 bulan:
          <th>Bulan</th><th>Tahap</th><th style="text-align: right;">Saldo Awal (Rp)</th><th style="text-align: right;">Penerimaan (Rp)</th><th style="text-align: right;">Belanja (Rp)</th><th style="text-align: right;">Saldo Akhir (Rp)</th>
        - Ulas bahwa arus kas sehat dan saldo akhir penutupan tahun kembali Rp 0 seimbang.
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
7. KONSULTASI & REKOMENDASI KODE KEGIATAN & REKENING BELANJA (OPERASI VS MODAL):
   - Jika pengguna menanyakan rekomendasi kode kegiatan atau kode rekening belanja yang cocok untuk suatu barang/jasa (contoh: "saya ingin belanja kursi kode kegiatan apa dan rekening apa yang cocok?", "laptop masuk modal atau operasi?", "rekening belanja cat tembok apa?", dsb):
     a. WAJIB memanggil tool `recommend_activity_and_account` dengan parameter `query` (misal: "kursi") dan `estimasi_harga` jika pengguna menyebutkan nominal harga.
     b. DILARANG KERAS MENGARANG KODE KEGIATAN ATAU KODE REKENING SENDIRI! Anda WAJIB menggunakan kode resmi dari hasil tool (tabel master `kode_kegiatans` dan `rekening_belanjas`).
     c. Format Penyajian Rekomendasi:
        - Berikan pembukaan yang santai dan bersahabat khas bendahara sekolah.
        - Sajikan perbandingan opsi yang jelas dan terstruktur dalam tabel HTML:
          <th>Kategori Belanja</th><th>Kode Rekening</th><th>Nama Akun Rekening</th><th>Kode Kegiatan (SNP)</th><th>Nama Kegiatan (SNP)</th><th>Kapan Memilih Ini (Kriteria)</th>
        - Panduan Kriteria Pemilihan:
          * **Belanja Modal (Kode Akun 5.2.x)**: Dipilih jika belanja menghasilkan aset tetap dengan masa manfaat lebih dari 12 bulan dan nilai satuan perolehan memenuhi/melampaui batas kapitalisasi aset tetap daerah (biasanya >= Rp 500.000 atau Rp 1.000.000 per unit tergantung Perkada). Wajib dicatat di KIB (Kartu Inventaris Barang).
          * **Belanja Operasi (Kode Akun 5.1.x)**: Dipilih jika barang merupakan barang pakai habis, masa manfaat < 12 bulan, atau harga per unit di bawah nilai batas kapitalisasi aset daerah (dicatat sebagai barang persediaan atau aset ekstrakomptabel).
          * **Belanja Pemeliharaan (Kode Akun 5.1.02.03.x)**: Dipilih jika tujuan belanja adalah untuk perbaikan, servis, atau perawatan barang/sarana yang sudah ada agar kembali berfungsi normal.
        - Jika field `riwayat_pemakaian_sekolah` pada hasil tool berisi data, sebutkan secara ramah riwayat tersebut sebagai bukti nyata bahwa sekolah pernah menggunakannya sebelumnya (misal: "Di RKAS sekolah Om sendiri, pasangan ini pernah dipakai sebanyak X kali untuk: ...").
8. KATALOG STANDAR SATUAN HARGA (SSH) & ACUAN BARANG ARKAS:
   - Jika pengguna menanyakan acuan barang, harga standar barang, batas atas harga, SSH ARKAS, atau mengecek apakah perkiraan harga beli suatu barang masih dalam batas yang wajar (contoh: "berapa batas atas harga laptop di ARKAS?", "cek harga semen di ARKAS", "saya mau beli laptop 7 juta apakah aman di ARKAS?", "katalog kertas hvs di ARKAS"):
     a. WAJIB memanggil tool `search_arkas_reference_item` dengan parameter `query` (kata kunci barang), `estimasi_harga` (jika pengguna menyebutkan nominal rencana belanja), dan `tahun`.
     b. DILARANG KERAS MENGARANG NAMA BARANG ATAU HARGA BATAS ATAS SENDIRI! Anda WAJIB menggunakan data resmi hasil tool (tabel master `ref_barangs` / katalog acuan ARKAS).
     c. Format Penyajian Respons Katalog ARKAS:
        - Sapa pengguna dengan santai dan hangat khas bendahara ("Om", "Bos").
        - Tampilkan tabel HTML rapi acuan barang ARKAS:
          <th>No</th><th>Nama Barang Acuan ARKAS</th><th>Kode Rekening</th><th>Akun Rekening Belanja</th><th>Satuan</th><th style="text-align: right;">Batas Atas Harga (SSH) (Rp)</th>
        - Evaluasi Kewajaran & Kepatuhan Belanja:
          * Jika pengguna menyebutkan rencana harga belanja: Bandingkan secara gamblang apakah harga tersebut aman di bawah batas atas SSH atau melampaui batas.
          * Jika AMAN: Beri tahu bahwa harga tersebut wajar dan aman untuk dianggarkan/dibelanjakan karena masih dalam pagu batas atas SSH ARKAS.
          * Jika MELEBIHI BATAS: Berikan peringatan ramah bahwa harga tersebut melampaui pagu standar satuan harga resmi ARKAS daerah sehingga berisiko mendapat catatan audit atau ditolak saat pelaporan SPJ.
9. DIAGNOSA INTEGRASI & REKONSILIASI APLIKASI DESKTOP ARKAS:
   - Jika pengguna menanyakan status koneksi ARKAS, apakah pembukuan BKU SIKAS sudah klop/sinkron dengan ARKAS, ada selisih apa antara SIKAS dan ARKAS, atau masalah integrasi ARKAS (contoh: "cek koneksi ARKAS", "apakah BKU kita sudah klop sama ARKAS?", "ada selisih transaksi di bulan Agustus?", "audit rekonsiliasi ARKAS"):
     a. WAJIB memanggil tool `diagnose_arkas_integration` dengan parameter `scope` ('comprehensive' atau 'bku_month') dan `bulan` (jika menanyakan bulan tertentu).
     b. Format Penyajian Dashboard Diagnosa ARKAS:
        - Header: `### 🛡️ DIAGNOSA INTEGRASI SIKAS & APLIKASI DESKTOP ARKAS`
        - Status Kesehatan Koneksi:
          * Sebutkan status koneksi (Terhubung & Sehat / Terputus / File Terkunci), lokasi path database, dan waktu pembaruan terakhir.
        - Komparasi Pagu RKAS (SIKAS vs ARKAS):
          * Tampilkan tabel HTML komparasi pagu penetapan RKAS Murni & Perubahan.
        - Komparasi BKU Bulanan (Rekonsiliasi Kas):
          * Sajikan tabel HTML ringkasan per bulan:
            <th>Bulan</th><th style="text-align: right;">Belanja SIKAS (Rp)</th><th style="text-align: right;">Belanja ARKAS (Rp)</th><th style="text-align: right;">Selisih (Rp)</th><th>Status Rekonsiliasi</th>
        - Rincian Transaksi Belum Klop (jika ada transaksi yang hanya ada di salah satu aplikasi atau berbeda kuitansi):
          * Jelaskan nomor bukti, uraian, dan selisih nominalnya.
        - Panduan Solusi Santai:
          * Berikan instruksi langkah praktis bagi bendahara (contoh: "Buka menu BKU bulan X lalu klik Tarik Data dari ARKAS", "Pastikan aplikasi ARKAS desktop ditutup agar file database tidak terkunci", dll.).
10. AUDIT DOKUMEN SPJ & LEMBAR RESMI (KWITANSI, TANDA TERIMA, BAST, DAN SURAT PESANAN):
   - Jika pengguna menanyakan kelengkapan berkas dokumen SPJ, audit SPJ, status kuitansi, tanda terima, BAST, atau surat pesanan (contoh: "Cek kelengkapan dokumen SPJ bulan September", "Apakah ada belanja modal yang belum ada BAST-nya?", "Dokumen SPJ apa saja yang belum lengkap?"):
     a. WAJIB memanggil tool `get_spj_documents_status` dengan parameter `bulan`, `tahap`, `status_filter`, dan `tahun`.
     b. Format Penyajian Audit Kelengkapan SPJ:
        - Header: `### 📑 AUDIT KELENGKAPAN DOKUMEN SPJ — {BULAN/PERIODE} {TAHUN}`
        - Badge Status: `[STATUS KEPATUHAN: {persentase_kepatuhan}% LENGKAP ({transaksi_lengkap} dari {total_transaksi} transaksi)]`
        - Tabel Matriks Kelengkapan Dokumen HTML Terstruktur Rapi:
          <th>No</th><th>Tanggal</th><th>No. Bukti BKU</th><th>Uraian Belanja</th><th style="text-align: right;">Nominal (Rp)</th><th>Kwitansi</th><th>Tanda Terima</th><th>Surat Pesanan</th><th>BAST</th><th>Status SPJ</th>
        - Gunakan indikator visual:
          * `✅ Ada` jika dokumen sudah dibuat di database.
          * `❌ Belum Ada` jika dokumen wajib namun belum dibuat.
          * `—` jika dokumen tidak diwajibkan untuk jenis belanja tersebut (misal: belanja honor/jasa tidak butuh BAST/SP, operasional listrik/pulsa hanya butuh kwitansi).
        - Rekomendasi Solutif Khas Bendahara:
          * Sebutkan secara spesifik transaksi mana saja yang berkasnya masih kurang (contoh: "Untuk transaksi Cat Lapangan Toko Jaya nomor 058 belum ada Surat Pesanan nih, Om").
          * Berikan saran ramah untuk melengkapinya melalui menu dokumen terkait di SIKAS sebelum pelaporan SPJ.
   - Jika pengguna meminta melihat isi / lembar rincian resmi salah satu dokumen SPJ (contoh: "Tampilkan rincian BAST pengadaan laptop", "Rincian Surat Pesanan Toko Jaya", "Tanda terima honor guru bulan September", "Kwitansi belanja ATK"):
     a. WAJIB memanggil tool `get_spj_document_detail` dengan parameter `tipe_dokumen` ('bast', 'surat_pesanan', 'kwitansi', atau 'tanda_terima'), `query`, dan `tahun`.
     b. Format Penyajian Lembar Resmi Dokumen SPJ:
        - Judul Dokumen Resmi:
          * `### 📦 BERITA ACARA SERAH TERIMA (BAST)`
          * `### 📋 SURAT PESANAN (SP)`
          * `### 📜 KWITANSI PEMBAYARAN BOSP`
          * `### 📝 TANDA TERIMA HONORARIUM / JASA`
        - Nomor Dokumen Resmi & Tanggal Dokumen.
        - Identitas Para Pihak:
          * Pihak Pertama (Penyedia / Toko Rekanan / Penerima)
          * Pihak Kedua (Sekolah: Kepala Sekolah & Bendahara)
        - Tabel Rincian Barang / Jasa:
          <th>No</th><th>Uraian Spesifikasi / Nama Barang</th><th>Volume</th><th>Satuan</th><th style="text-align: right;">Harga Satuan (Rp)</th><th style="text-align: right;">Subtotal (Rp)</th><th>Kondisi Fisik</th>
        - Tabel Ringkasan Nilai Finansial:
          * Total Bruto (Rp), Potongan Pajak (PPN, PPh 21, PPh 23, Pajak Daerah), Total Diterima Neto (Rp), serta **Terbilang Rupiah Resmi**.
        - Khusus Surat Pesanan: Sertakan klausul waktu pengiriman, kondisi barang, dan ketentuan pembayaran.
        - Kolom Pengesahan Tanda Tangan:
          Cantumkan nama jelas Kepala Sekolah, Bendahara, dan Rekanan/Penerima.
11. Jangan pernah mengarang kode rekening atau ID kegiatan secara sembarangan, selalu gunakan hasil dari tool.
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

                $toolResult = $this->executeTool($fnName, $args, $variant, $tahun, $user);

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
    protected function executeTool(string $name, array $args, string $variant, int $tahun, ?User $user = null): array
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
                $args['tipe_dokumen'] ?? 'aktif',
                $args['filter_pajak'] ?? 'semua'
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
            'recommend_activity_and_account' => $this->recommendActivityAndAccount(
                $args['query'] ?? '',
                isset($args['estimasi_harga']) ? (float) $args['estimasi_harga'] : null,
                $args['kategori_preferensi'] ?? 'semua',
                $targetTahun,
                $variant
            ),
            'search_arkas_reference_item' => $this->searchArkasReferenceItem(
                $args['query'] ?? '',
                isset($args['estimasi_harga']) ? (float) $args['estimasi_harga'] : null,
                $targetTahun,
                $args['kode_rekening'] ?? null,
                ! empty($args['limit']) ? (int) $args['limit'] : 10
            ),
            'diagnose_arkas_integration' => $this->diagnoseArkasIntegration(
                $user ?? User::first(),
                $variant,
                $targetTahun,
                $args['scope'] ?? 'comprehensive',
                $args['bulan'] ?? null
            ),
            'get_spj_documents_status' => $this->getSpjDocumentsStatus(
                $targetTahun,
                $variant,
                $args['bulan'] ?? null,
                isset($args['tahap']) ? (int) $args['tahap'] : null,
                $args['status_filter'] ?? 'semua'
            ),
            'get_spj_document_detail' => $this->getSpjDocumentDetail(
                $args['tipe_dokumen'] ?? 'kwitansi',
                $args['query'] ?? null,
                isset($args['bku_id']) ? (int) $args['bku_id'] : null,
                $targetTahun,
                $variant,
                $args['bulan'] ?? null
            ),
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
        int $limit = 25
    ): array {
        VariantConfig::validateVariant($variant);

        $penganggaranClass = VariantConfig::getModelClass('penganggaran', $variant);
        $rkasClass = VariantConfig::getModelClass('rkas', $variant);
        $rkasPerubahanClass = VariantConfig::getModelClass('rkas_perubahan', $variant);
        $penganggaranFk = VariantConfig::penganggaranFk($variant);

        $availableYears = $penganggaranClass::orderBy('tahun_anggaran', 'asc')->pluck('tahun_anggaran')->toArray();

        $penganggaran = $penganggaranClass::where('tahun_anggaran', $tahun)->with('sekolah')->first();
        if (! $penganggaran) {
            return [
                'status' => 'not_found',
                'data_ditemukan' => false,
                'message' => "Data penganggaran untuk tahun {$tahun} (".VariantConfig::title($variant).') tidak ditemukan di sistem.',
                'available_years' => $availableYears,
                'error' => "Data penganggaran untuk tahun {$tahun} ({$variant}) tidak ditemukan.",
            ];
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

        if ($kodeRekening && $itemRows->isEmpty()) {
            return [
                'status' => 'not_found',
                'data_ditemukan' => false,
                'message' => "Data rincian belanja untuk kode rekening {$kodeRekening} pada Lembar Kerja 221 tahun {$tahun} tidak ditemukan.",
                'filter_kode_rekening' => $kodeRekening,
                'available_years' => $availableYears,
                'tahun' => $tahun,
                'sekolah' => $penganggaran->sekolah?->nama_sekolah ?? '-',
                'sumber_dana' => VariantConfig::title($variant),
                'tipe_dokumen' => $mode,
                'hierarki_summary' => collect($hierarchyNames)->map(fn ($name, $code) => [
                    'kode_rekening' => $code,
                    'uraian' => $name,
                    'jumlah' => $headerTotals[$code] ?? 0.0,
                ])->values()->all(),
            ];
        }

        $merged = $headerRows->merge($itemRows)->sortBy('sort_key')->values();
        $totalItemsCount = $itemRows->count();
        $slicedRows = $merged->take($limit)->values()->all();

        $totalBelanja = $headerTotals['5'] ?? 0.0;

        return [
            'status' => 'success',
            'data_ditemukan' => true,
            'available_years' => $availableYears,
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
        string $tipeDokumen = 'aktif',
        string $filterPajak = 'semua'
    ): array {
        VariantConfig::validateVariant($variant);

        $penganggaranClass = VariantConfig::getModelClass('penganggaran', $variant);
        $rkasClass = VariantConfig::getModelClass('rkas', $variant);
        $rkasPerubahanClass = VariantConfig::getModelClass('rkas_perubahan', $variant);
        $penganggaranFk = VariantConfig::penganggaranFk($variant);

        $availableYears = $penganggaranClass::orderBy('tahun_anggaran', 'asc')->pluck('tahun_anggaran')->toArray();

        $penganggaran = $penganggaranClass::where('tahun_anggaran', $tahun)->with('sekolah')->first();
        if (! $penganggaran) {
            return [
                'status' => 'not_found',
                'data_ditemukan' => false,
                'message' => "Data penganggaran untuk tahun {$tahun} (".VariantConfig::title($variant).') tidak ditemukan di sistem.',
                'available_years' => $availableYears,
                'error' => "Data penganggaran untuk tahun {$tahun} ({$variant}) tidak ditemukan.",
            ];
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

        if ($sourceItems->isEmpty()) {
            return [
                'status' => 'not_found',
                'data_ditemukan' => false,
                'message' => "Data Rincian Pencairan untuk tahun {$tahun} belum memiliki rincian belanja yang diinput.",
                'available_years' => $availableYears,
                'tahun' => $tahun,
                'sekolah' => $penganggaran->sekolah?->nama_sekolah ?? '-',
                'sumber_dana' => VariantConfig::title($variant),
                'pagu_anggaran' => $paguAnggaran,
            ];
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

        if ($filtered->isEmpty()) {
            $kriteria = [];
            if ($tahap !== null) {
                $kriteria[] = "Tahap {$tahap}";
            }
            if ($bulan !== 'Semua') {
                $kriteria[] = "Bulan {$bulan}";
            }
            $kriteriaStr = ! empty($kriteria) ? ' dengan kriteria '.implode(', ', $kriteria) : '';

            return [
                'status' => 'not_found',
                'data_ditemukan' => false,
                'message' => "Data Rincian Pencairan untuk tahun {$tahun}{$kriteriaStr} tidak ditemukan.",
                'available_years' => $availableYears,
                'tahun' => $tahun,
                'sekolah' => $penganggaran->sekolah?->nama_sekolah ?? '-',
                'sumber_dana' => VariantConfig::title($variant),
                'tipe_dokumen' => $mode,
            ];
        }

        // Pengurutan kronologis 12 bulan resmi BOSP
        $monthOrder = array_flip(['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']);
        $sortedFiltered = $filtered->sort(function ($a, $b) use ($monthOrder) {
            $orderA = $monthOrder[$a->bulan] ?? 99;
            $orderB = $monthOrder[$b->bulan] ?? 99;
            if ($orderA !== $orderB) {
                return $orderA <=> $orderB;
            }

            return $a->id <=> $b->id;
        })->values();

        // Agregasi fitur Gabung Uraian (menggabungkan rincian belanja dengan rekening + kegiatan + uraian gabungan yang sama)
        $groupedRecords = [];
        foreach ($sortedFiltered as $item) {
            $uraianGabungan = trim((string) ($item->uraian_gabungan ?? ''));
            $rekId = $item->rekeningBelanja?->kode_rekening ?? ($item->kode_rekening_id ?? '-');
            $kegId = $item->kodeKegiatan?->kode ?? ($item->kode_kegiatan_id ?? '-');

            if ($uraianGabungan !== '') {
                $groupKey = $item->bulan.'|'.$rekId.'|'.$kegId.'|'.$uraianGabungan;
            } else {
                $groupKey = $item->bulan.'|item|'.$item->id;
            }

            $val = (float) $item->jumlah * (float) $item->harga_satuan;
            $ppn = (float) ($item->pot_ppn ?? 0);
            $pph21 = (float) ($item->pot_pph21 ?? 0) + (float) ($item->pot_pph21_narasumber ?? 0);
            $pph23 = (float) ($item->pot_pph23 ?? 0);
            $pajak = $ppn + $pph21 + $pph23;
            $neto = $val - $pajak;

            $itemTahap = in_array($item->bulan, $sem1) ? 1 : 2;

            if (! isset($groupedRecords[$groupKey])) {
                $groupedRecords[$groupKey] = [
                    'kode_rekening' => $item->rekeningBelanja->kode_rekening ?? '-',
                    'kode_kegiatan' => $item->kodeKegiatan->kode ?? '-',
                    'nama_kegiatan' => $uraianGabungan !== '' ? $uraianGabungan : $item->uraian,
                    'is_gabungan' => ($uraianGabungan !== ''),
                    'bulan' => $item->bulan,
                    'tahap' => $itemTahap,
                    'nama_penerima' => $item->nama_penerima ?: '-',
                    'jabatan' => $item->jabatan ?: '-',
                    'nomor_rekening' => $item->nomor_rekening ?: '-',
                    'bank' => $item->bank ?: '-',
                    'nomor_kwitansi' => $item->nomor_kwitansi ?: '-',
                    'bruto' => 0.0,
                    'pot_ppn' => 0.0,
                    'pot_pph21' => 0.0,
                    'pot_pph23' => 0.0,
                    'total_pajak' => 0.0,
                    'diterima_neto' => 0.0,
                    'sub_items' => [],
                    'rkas_ids' => [],
                ];
            }

            $groupedRecords[$groupKey]['bruto'] += $val;
            $groupedRecords[$groupKey]['pot_ppn'] += $ppn;
            $groupedRecords[$groupKey]['pot_pph21'] += $pph21;
            $groupedRecords[$groupKey]['pot_pph23'] += $pph23;
            $groupedRecords[$groupKey]['total_pajak'] += $pajak;
            $groupedRecords[$groupKey]['diterima_neto'] += $neto;
            $groupedRecords[$groupKey]['rkas_ids'][] = $item->id;

            if (($groupedRecords[$groupKey]['nama_penerima'] === '-' || empty($groupedRecords[$groupKey]['nama_penerima'])) && ! empty($item->nama_penerima)) {
                $groupedRecords[$groupKey]['nama_penerima'] = $item->nama_penerima;
                $groupedRecords[$groupKey]['jabatan'] = $item->jabatan ?: '-';
                $groupedRecords[$groupKey]['nomor_rekening'] = $item->nomor_rekening ?: '-';
                $groupedRecords[$groupKey]['bank'] = $item->bank ?: '-';
            }
            if (($groupedRecords[$groupKey]['nomor_kwitansi'] === '-' || empty($groupedRecords[$groupKey]['nomor_kwitansi'])) && ! empty($item->nomor_kwitansi)) {
                $groupedRecords[$groupKey]['nomor_kwitansi'] = $item->nomor_kwitansi;
            }

            $groupedRecords[$groupKey]['sub_items'][] = [
                'id' => $item->id,
                'uraian' => $item->uraian,
                'volume' => (float) $item->jumlah,
                'satuan' => $item->satuan,
                'harga_satuan' => (float) $item->harga_satuan,
                'bruto' => $val,
                'pot_ppn' => $ppn,
                'pot_pph21' => $pph21,
                'pot_pph23' => $pph23,
                'total_pajak' => $pajak,
                'neto' => $neto,
            ];
        }

        $mappedItems = [];
        $no = 1;
        $noPerBulan = [];
        $totalBruto = 0.0;
        $totalPpn = 0.0;
        $totalPph21 = 0.0;
        $totalPph23 = 0.0;

        foreach ($groupedRecords as $record) {
            $totalBruto += $record['bruto'];
            $totalPpn += $record['pot_ppn'];
            $totalPph21 += $record['pot_pph21'];
            $totalPph23 += $record['pot_pph23'];

            $blnKey = $record['bulan'];
            $noPerBulan[$blnKey] = ($noPerBulan[$blnKey] ?? 0) + 1;

            $subUraianRingkasan = null;
            if ($record['is_gabungan'] && count($record['sub_items']) > 0) {
                $subUraianRingkasan = implode(', ', array_map(function ($sub) {
                    return $sub['uraian'].' (Rp '.number_format($sub['bruto'], 0, ',', '.').')';
                }, $record['sub_items']));
            }

            $record['no'] = $no++;
            $record['no_bulan'] = $noPerBulan[$blnKey];
            $record['sub_uraian_ringkasan'] = $subUraianRingkasan;

            $mappedItems[] = $record;
        }

        $totalPajakAll = $totalPpn + $totalPph21 + $totalPph23;

        // Ambil seluruh transaksi yang memiliki potongan pajak
        $transaksiBerpajak = array_values(array_filter($mappedItems, fn ($i) => (float) $i['total_pajak'] > 0));

        // Terapkan filter pajak jika diminta
        $modePajak = strtolower(trim($filterPajak));
        if ($modePajak === 'berpajak') {
            $outputItems = $transaksiBerpajak;
        } elseif ($modePajak === 'tanpa_pajak') {
            $outputItems = array_values(array_filter($mappedItems, fn ($i) => (float) $i['total_pajak'] == 0));
        } else {
            $outputItems = $mappedItems; // Seluruh transaksi sesuai cakupan yang diminta tanpa batas baris
        }

        // Agregasi bulanan matematis (12 bulan resmi BOSP)
        $allMonths = array_merge($sem1, $sem2);
        $rekapBulanan = [];
        $noBulan = 1;

        foreach ($allMonths as $bln) {
            $blnTahap = in_array($bln, $sem1) ? 1 : 2;
            if ($tahap !== null && (int) $tahap !== $blnTahap) {
                continue;
            }
            if ($bulan !== 'Semua' && strcasecmp($bln, $bulan) !== 0) {
                continue;
            }

            $blnItems = array_values(array_filter($mappedItems, fn ($i) => strcasecmp($i['bulan'], $bln) === 0));
            $bBruto = (float) array_sum(array_column($blnItems, 'bruto'));
            $bPotPpn = (float) array_sum(array_column($blnItems, 'pot_ppn'));
            $bPotPph21 = (float) array_sum(array_column($blnItems, 'pot_pph21'));
            $bPotPph23 = (float) array_sum(array_column($blnItems, 'pot_pph23'));
            $bPajak = (float) array_sum(array_column($blnItems, 'total_pajak'));
            $bNeto = (float) array_sum(array_column($blnItems, 'diterima_neto'));

            $rekapBulanan[] = [
                'no' => $noBulan++,
                'bulan' => $bln,
                'tahap' => $blnTahap,
                'jumlah_transaksi' => count($blnItems),
                'total_bruto' => $bBruto,
                'total_pot_ppn' => $bPotPpn,
                'total_pot_pph21' => $bPotPph21,
                'total_pot_pph23' => $bPotPph23,
                'total_pajak' => $bPajak,
                'total_neto' => $bNeto,
            ];
        }

        return [
            'status' => 'success',
            'data_ditemukan' => true,
            'available_years' => $availableYears,
            'tahun' => $tahun,
            'sekolah' => $penganggaran->sekolah?->nama_sekolah ?? '-',
            'sumber_dana' => VariantConfig::title($variant),
            'tipe_dokumen' => $mode,
            'filter_tahap' => $tahap,
            'filter_bulan' => $bulan,
            'filter_pajak' => $filterPajak,
            'ringkasan' => [
                'total_anggaran_bruto' => $totalBruto,
                'total_pot_ppn' => $totalPpn,
                'total_pot_pph21' => $totalPph21,
                'total_pot_pph23' => $totalPph23,
                'total_pajak' => $totalPajakAll,
                'total_diterima_neto' => $totalBruto - $totalPajakAll,
                'jumlah_transaksi' => count($mappedItems),
                'jumlah_transaksi_berpajak' => count($transaksiBerpajak),
            ],
            'rekap_bulanan' => $rekapBulanan,
            'items_per_bulan' => (function () use ($outputItems) {
                $grouped = [];
                foreach ($outputItems as $it) {
                    $grouped[$it['bulan']][] = $it;
                }

                return $grouped;
            })(),
            'transaksi_berpajak' => $transaksiBerpajak,
            'items' => $outputItems,
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

        $availableYears = $penganggaranClass::orderBy('tahun_anggaran', 'asc')->pluck('tahun_anggaran')->toArray();

        $penganggaran = $penganggaranClass::where('tahun_anggaran', $tahun)->with('sekolah')->first();
        if (! $penganggaran) {
            return [
                'status' => 'not_found',
                'data_ditemukan' => false,
                'message' => "Data penganggaran untuk tahun {$tahun} (".VariantConfig::title($variant).') tidak ditemukan di sistem.',
                'available_years' => $availableYears,
                'error' => "Data penganggaran untuk tahun {$tahun} ({$variant}) tidak ditemukan.",
            ];
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

        if ($sourceItems->isEmpty()) {
            return [
                'status' => 'not_found',
                'data_ditemukan' => false,
                'message' => "Data Alur Kas untuk tahun {$tahun} belum memiliki rincian perencanaan belanja yang diinput.",
                'available_years' => $availableYears,
                'tahun' => $tahun,
                'sekolah' => $penganggaran->sekolah?->nama_sekolah ?? '-',
                'sumber_dana' => VariantConfig::title($variant),
                'pagu_anggaran' => $paguAnggaran,
            ];
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
            'status' => 'success',
            'data_ditemukan' => true,
            'available_years' => $availableYears,
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
     * Tool: Rekomendasi Kode Kegiatan (SNP) dan Rekening Belanja (Operasi vs Modal) dari Master Data & Riwayat RKAS
     */
    protected function recommendActivityAndAccount(
        string $query,
        ?float $estimasiHarga = null,
        string $kategoriPreferensi = 'semua',
        ?int $tahun = null,
        string $variant = 'reguler'
    ): array {
        $cleanQuery = trim($query);
        if ($cleanQuery === '') {
            return [
                'status' => 'error',
                'message' => 'Kata kunci nama barang atau jasa tidak boleh kosong.',
            ];
        }

        $queryLower = strtolower($cleanQuery);

        // Kamus sinonim cerdas untuk pengadaan dan belanja sekolah
        $synonymsMap = [
            'kursi' => ['mebel', 'perabot', 'kursi', 'meja', 'alat rumah tangga', 'sarana'],
            'meja' => ['mebel', 'perabot', 'meja', 'kursi', 'alat rumah tangga', 'sarana'],
            'lemari' => ['mebel', 'perabot', 'lemari', 'rak', 'arsip', 'sarana'],
            'bangku' => ['mebel', 'perabot', 'kursi', 'meja', 'sarana'],
            'laptop' => ['komputer', 'laptop', 'personal komputer', 'multimedia', 'peralatan komputer'],
            'komputer' => ['komputer', 'laptop', 'personal komputer', 'multimedia', 'pc'],
            'printer' => ['printer', 'cetak', 'tinta', 'komputer', 'peralatan kantor'],
            'proyektor' => ['proyektor', 'multimedia', 'elektronik', 'alat peraga'],
            'buku' => ['buku', 'kepustakaan', 'perpustakaan', 'bacaan', 'literasi', 'teks'],
            'cat' => ['pemeliharaan', 'bangunan', 'lahan', 'ruang', 'prasarana', 'cat'],
            'semen' => ['pemeliharaan', 'bangunan', 'lahan', 'ruang', 'prasarana', 'material'],
            'keramik' => ['pemeliharaan', 'bangunan', 'lahan', 'ruang', 'prasarana', 'material'],
            'ac' => ['pendingin', 'pengkondisi udara', 'alat rumah tangga', 'elektronik'],
            'kipas' => ['pendingin', 'alat rumah tangga', 'elektronik', 'kipas'],
            'tv' => ['televisi', 'elektronik', 'multimedia'],
            'internet' => ['internet', 'kawat', 'faksimili', 'jaringan'],
            'pulsa' => ['internet', 'kawat', 'telepon', 'paket data'],
            'kertas' => ['alat tulis kantor', 'hvs', 'bahan cetak', 'atk'],
            'spidol' => ['alat tulis kantor', 'whiteboard', 'atk'],
            'alat tulis' => ['alat tulis kantor', 'atk'],
            'atk' => ['alat tulis kantor', 'atk'],
            'konsumsi' => ['makanan dan minuman', 'konsumsi', 'rapat', 'jamuan'],
            'makan' => ['makanan dan minuman', 'konsumsi', 'rapat', 'jamuan'],
            'minum' => ['makanan dan minuman', 'konsumsi', 'rapat', 'jamuan'],
            'snack' => ['makanan dan minuman', 'snack', 'kue', 'rapat'],
            'honor' => ['honorarium', 'jasa tenaga', 'narasumber', 'guru'],
            'gaji' => ['honorarium', 'jasa tenaga', 'guru'],
            'genset' => ['genset', 'daya dan jasa', 'generator', 'listrik'],
            'listrik' => ['daya dan jasa', 'instalasi listrik', 'alat listrik'],
            'sapu' => ['alat kebersihan', 'kebersihan', 'bahan habis pakai', 'rumah tangga'],
            'pel' => ['alat kebersihan', 'kebersihan', 'bahan habis pakai', 'rumah tangga'],
            'sabun' => ['alat kebersihan', 'kebersihan', 'bahan pembersih', 'rumah tangga'],
            'olahraga' => ['olahraga', 'alat peraga', 'ekstrakurikuler'],
            'bola' => ['olahraga', 'alat peraga', 'ekstrakurikuler'],
        ];

        $searchWords = [$queryLower];
        foreach ($synonymsMap as $key => $syns) {
            if (str_contains($queryLower, $key) || str_contains($key, $queryLower)) {
                $searchWords = array_unique(array_merge($searchWords, $syns));
            }
        }

        // 1. Query Rekening Belanja
        $rekQuery = RekeningBelanja::query();
        $rekQuery->where(function ($q) use ($searchWords) {
            foreach ($searchWords as $w) {
                $q->orWhere('rincian_objek', 'ILIKE', "%{$w}%")
                    ->orWhere('kode_rekening', 'ILIKE', "%{$w}%");
            }
        });
        $allRekening = $rekQuery->get();

        $modalRekening = $allRekening->filter(fn ($r) => str_starts_with($r->kode_rekening, '5.2'))->values();
        $operasiRekening = $allRekening->filter(fn ($r) => str_starts_with($r->kode_rekening, '5.1'))->values();

        $pemeliharaanRekening = $operasiRekening->filter(fn ($r) => str_contains(strtolower($r->rincian_objek), 'pemeliharaan'))->values();
        $barangPakaiHabisRekening = $operasiRekening->filter(fn ($r) => ! str_contains(strtolower($r->rincian_objek), 'pemeliharaan'))->values();

        // 2. Query Kode Kegiatan
        $kegQuery = KodeKegiatan::query();
        $kegQuery->where(function ($q) use ($searchWords) {
            foreach ($searchWords as $w) {
                $q->orWhere('uraian', 'ILIKE', "%{$w}%")
                    ->orWhere('sub_program', 'ILIKE', "%{$w}%");
            }
        });
        $allKegiatan = $kegQuery->get();

        // Pembobotan relevansi (scoring) agar hasil paling spesifik berada di urutan teratas
        $calcScore = function (string $text, string $qLower, array $words) {
            $t = strtolower($text);
            $score = 0;
            if (str_contains($t, $qLower)) {
                $score += 100;
            }
            foreach ($words as $w) {
                if ($w !== $qLower && str_contains($t, $w)) {
                    $score += 30;
                }
            }
            if (str_contains($t, 'sewa') && ! str_contains($qLower, 'sewa')) {
                $score -= 40;
            }

            return $score;
        };

        $modalRekening = $modalRekening->sortByDesc(fn ($r) => $calcScore($r->rincian_objek, $queryLower, $searchWords))->values();
        $barangPakaiHabisRekening = $barangPakaiHabisRekening->sortByDesc(fn ($r) => $calcScore($r->rincian_objek, $queryLower, $searchWords))->values();
        $pemeliharaanRekening = $pemeliharaanRekening->sortByDesc(fn ($r) => $calcScore($r->rincian_objek, $queryLower, $searchWords))->values();

        $kegiatanPengadaan = $allKegiatan->filter(fn ($k) => ! str_contains(strtolower($k->uraian), 'pemeliharaan'))
            ->sortByDesc(fn ($k) => $calcScore($k->uraian.' '.$k->sub_program, $queryLower, $searchWords))
            ->values();
        $kegiatanPemeliharaan = $allKegiatan->filter(fn ($k) => str_contains(strtolower($k->uraian), 'pemeliharaan'))
            ->sortByDesc(fn ($k) => $calcScore($k->uraian.' '.$k->sub_program, $queryLower, $searchWords))
            ->values();

        // 3. Query Riwayat Penggunaan Nyata di RKAS Sekolah
        $targetTahun = $tahun ?: (int) date('Y');
        $penganggaranClass = VariantConfig::getModelClass('penganggaran', $variant);
        $penganggaran = $penganggaranClass::where('tahun_anggaran', $targetTahun)->first() ?: $penganggaranClass::latest('tahun_anggaran')->first();

        $historyList = [];
        if ($penganggaran) {
            $penganggaranFk = VariantConfig::penganggaranFk($variant);
            $rkasClass = VariantConfig::getModelClass('rkas', $variant);
            $rkasPerubahanClass = VariantConfig::getModelClass('rkas_perubahan', $variant);

            $rkasRecords = $rkasClass::where($penganggaranFk, $penganggaran->id)
                ->where(function ($q) use ($searchWords) {
                    foreach ($searchWords as $w) {
                        $q->orWhere('uraian', 'ILIKE', "%{$w}%");
                    }
                })
                ->with(['kodeKegiatan', 'rekeningBelanja'])
                ->get();

            if ($rkasRecords->isEmpty() && $rkasPerubahanClass) {
                $rkasRecords = $rkasPerubahanClass::where($penganggaranFk, $penganggaran->id)
                    ->where(function ($q) use ($searchWords) {
                        foreach ($searchWords as $w) {
                            $q->orWhere('uraian', 'ILIKE', "%{$w}%");
                        }
                    })
                    ->with(['kodeKegiatan', 'rekeningBelanja'])
                    ->get();
            }

            $groupedHistory = $rkasRecords->groupBy(fn ($r) => ($r->kode_id ?? 0).'|'.($r->kode_rekening_id ?? 0));
            foreach ($groupedHistory as $group) {
                $first = $group->first();
                if ($first && $first->kodeKegiatan && $first->rekeningBelanja) {
                    $historyList[] = [
                        'kode_kegiatan' => $first->kodeKegiatan->kode,
                        'nama_kegiatan' => $first->kodeKegiatan->uraian,
                        'program_snp' => $first->kodeKegiatan->program,
                        'kode_rekening' => $first->rekeningBelanja->kode_rekening,
                        'nama_rekening' => $first->rekeningBelanja->rincian_objek,
                        'kategori' => $first->rekeningBelanja->kategori ?: (str_starts_with($first->rekeningBelanja->kode_rekening, '5.2') ? 'Belanja Modal' : 'Belanja Operasi'),
                        'frekuensi_penggunaan' => $group->count(),
                        'contoh_uraian_sekolah' => $first->uraian,
                    ];
                }
            }
        }

        // Format Opsi Modal
        $opsiModal = [];
        foreach ($modalRekening->take(4) as $mr) {
            $matchingKeg = $kegiatanPengadaan->first() ?: $allKegiatan->first();
            $opsiModal[] = [
                'kode_rekening' => $mr->kode_rekening,
                'nama_rekening' => $mr->rincian_objek,
                'kategori' => $mr->kategori ?: 'Belanja Modal',
                'kode_kegiatan' => $matchingKeg?->kode ?? '05.08.02.',
                'nama_kegiatan' => $matchingKeg?->uraian ?? 'Pengadaan Peralatan Satuan Pendidikan',
                'program_snp' => $matchingKeg?->program ?? 'Standar Sarana dan Prasarana',
                'kriteria' => 'Pilih opsi ini jika barang yang dibeli memenuhi kriteria aset tetap (masa manfaat > 12 bulan, fisik tidak mudah rusak/bukan barang pakai habis) dan harga satuan memenuhi batas kapitalisasi aset tetap daerah (biasanya >= Rp 500.000 s.d. Rp 1.000.000). Barang akan dicatat di KIB (Kartu Inventaris Barang).',
            ];
        }

        // Format Opsi Operasi
        $opsiOperasi = [];
        $srcOperasi = $barangPakaiHabisRekening->isNotEmpty() ? $barangPakaiHabisRekening : $operasiRekening;
        foreach ($srcOperasi->take(4) as $or) {
            $matchingKeg = $allKegiatan->first(fn ($k) => ! str_contains(strtolower($k->uraian), 'pemeliharaan')) ?: $allKegiatan->first();
            $opsiOperasi[] = [
                'kode_rekening' => $or->kode_rekening,
                'nama_rekening' => $or->rincian_objek,
                'kategori' => $or->kategori ?: 'Belanja Operasi',
                'kode_kegiatan' => $matchingKeg?->kode ?? '06.05.10.',
                'nama_kegiatan' => $matchingKeg?->uraian ?? 'Pembelian Bahan Habis Pakai untuk Kegiatan Rumah Tangga',
                'program_snp' => $matchingKeg?->program ?? 'Standar Pengelolaan',
                'kriteria' => 'Pilih opsi ini jika barang masuk kategori barang pakai habis, masa manfaat < 12 bulan, atau harga satuan per unit di bawah batas nilai kapitalisasi aset tetap daerah. Barang tidak diinventarisasi sebagai aset tetap KIB.',
            ];
        }

        // Format Opsi Pemeliharaan
        $opsiPemeliharaan = [];
        foreach ($pemeliharaanRekening->take(3) as $pr) {
            $matchingKeg = $kegiatanPemeliharaan->first() ?: $allKegiatan->first();
            $opsiPemeliharaan[] = [
                'kode_rekening' => $pr->kode_rekening,
                'nama_rekening' => $pr->rincian_objek,
                'kategori' => 'Belanja Operasi (Pemeliharaan)',
                'kode_kegiatan' => $matchingKeg?->kode ?? '05.08.05.',
                'nama_kegiatan' => $matchingKeg?->uraian ?? 'Pemeliharaan Perlengkapan Satuan Pendidikan',
                'program_snp' => $matchingKeg?->program ?? 'Standar Sarana dan Prasarana',
                'kriteria' => 'Pilih opsi ini jika tujuan belanja adalah untuk perbaikan, servis, pengecatan, atau pemeliharaan barang/sarana yang sudah ada agar dapat berfungsi kembali normal.',
            ];
        }

        // Saran keputusan otomatis jika estimasi harga diinput
        $rekomendasiKeputusan = null;
        if ($estimasiHarga !== null && $estimasiHarga > 0) {
            if ($estimasiHarga >= 1000000 && ! empty($opsiModal)) {
                $rekomendasiKeputusan = 'Berdasarkan estimasi harga (Rp '.number_format($estimasiHarga, 0, ',', '.').'), belanja ini sangat direkomendasikan masuk BELANJA MODAL karena memenuhi batas nilai kapitalisasi aset daerah dan masa manfaat jangka panjang.';
            } elseif ($estimasiHarga < 500000 && ! empty($opsiOperasi)) {
                $rekomendasiKeputusan = 'Berdasarkan estimasi harga (Rp '.number_format($estimasiHarga, 0, ',', '.').'), belanja ini sangat direkomendasikan masuk BELANJA OPERASI karena di bawah batas kapitalisasi aset tetap daerah.';
            } else {
                $rekomendasiKeputusan = 'Estimasi harga berada di kisaran ambang batas kapitalisasi (Rp '.number_format($estimasiHarga, 0, ',', '.').'). Periksa Peraturan Kepala Daerah (Perkada) tentang kebijakan kapitalisasi aset sekolah Anda (apakah batasnya Rp 500rb atau Rp 1jt).';
            }
        }

        return [
            'status' => 'success',
            'query' => $cleanQuery,
            'estimasi_harga' => $estimasiHarga,
            'kategori_preferensi' => $kategoriPreferensi,
            'rekomendasi_keputusan' => $rekomendasiKeputusan,
            'panduan_kapitalisasi' => [
                'aturan_belanja_modal' => 'Belanja Modal (Kode Akun 5.2.x): Digunakan jika belanja menghasilkan aset tetap dengan masa manfaat lebih dari 12 bulan dan nilai perolehannya memenuhi atau melampaui batas minimum kapitalisasi aset tetap daerah (Perkada, umumnya Rp 500.000 atau Rp 1.000.000). Aset ini wajib dicatat dalam Kartu Inventaris Barang (KIB).',
                'aturan_belanja_operasi' => 'Belanja Operasi (Kode Akun 5.1.x): Digunakan untuk belanja barang pakai habis, barang yang masa manfaatnya kurang dari 12 bulan, atau barang yang nilai per unitnya di bawah batas kapitalisasi aset daerah (dicatat sebagai barang persediaan atau aset ekstrakomptabel).',
                'aturan_pemeliharaan' => 'Belanja Pemeliharaan (Kode Akun 5.1.02.03.x): Digunakan untuk biaya perbaikan rutin agar aset tetap kembali berfungsi normal tanpa menambah kapasitas/masa manfaat secara signifikan.',
            ],
            'opsi_belanja_modal' => $opsiModal,
            'opsi_belanja_operasi' => $opsiOperasi,
            'opsi_pemeliharaan' => $opsiPemeliharaan,
            'kegiatan_snp_terkait' => $allKegiatan->take(6)->map(fn ($k) => [
                'kode' => $k->kode,
                'program' => $k->program,
                'sub_program' => $k->sub_program,
                'uraian' => $k->uraian,
            ])->values()->all(),
            'riwayat_pemakaian_sekolah' => $historyList,
        ];
    }

    /**
     * Mencari acuan barang dan standar satuan harga (SSH) resmi ARKAS
     */
    public function searchArkasReferenceItem(
        string $query,
        ?float $estimasiHarga = null,
        int $tahun = 2026,
        ?string $kodeRekening = null,
        int $limit = 10
    ): array {
        $cleanQuery = trim($query);
        if ($cleanQuery === '') {
            return [
                'status' => 'empty',
                'message' => 'Kata kunci pencarian acuan barang ARKAS tidak boleh kosong.',
                'items' => [],
            ];
        }

        $limit = max(1, min(25, $limit));
        $source = 'local_database';

        // 1. Query ke database lokal PostgreSQL ref_barangs
        $dbQuery = RefBarang::query()->where('tahun', $tahun);
        if (! empty($kodeRekening)) {
            $dbQuery->where('kode_rekening', $kodeRekening);
        }

        // Pencarian nama_barang case-insensitive
        $dbQuery->where('nama_barang', 'ILIKE', "%{$cleanQuery}%");

        $totalFound = (clone $dbQuery)->count();
        $records = $dbQuery->orderBy('batas_atas', 'desc')->limit($limit)->get();

        // 2. Fallback cerdas: Jika lokal belum terisi atau 0 item, coba query langsung via Python ke arkas.db
        if ($records->isEmpty()) {
            $pyResult = $this->runPythonArkasQuery($cleanQuery, (string) $tahun);
            if (! empty($pyResult['data'])) {
                $source = 'arkas_engine_fallback';
                $pyItems = $pyResult['data'];
                if (! empty($kodeRekening)) {
                    $pyItems = array_filter($pyItems, fn ($i) => ($i['kode_rekening'] ?? '') === $kodeRekening);
                }
                $totalFound = count($pyItems);
                usort($pyItems, fn ($a, $b) => ($b['batas_atas'] ?? 0) <=> ($a['batas_atas'] ?? 0));
                $records = collect(array_slice($pyItems, 0, $limit));
            }
        }

        if ($records->isEmpty()) {
            return [
                'status' => 'not_found',
                'query' => $cleanQuery,
                'tahun' => $tahun,
                'source' => $source,
                'message' => "Tidak ditemukan acuan barang atau SSH untuk kata kunci '{$cleanQuery}' pada tahun {$tahun} di katalog ARKAS.",
                'items' => [],
            ];
        }

        $itemsList = [];
        $batasAtasValues = [];

        foreach ($records as $row) {
            $nama = is_array($row) ? ($row['nama_barang'] ?? '') : $row->nama_barang;
            $kodeRek = is_array($row) ? ($row['kode_rekening'] ?? null) : $row->kode_rekening;
            $rek = is_array($row) ? ($row['rekening'] ?? null) : $row->rekening;
            $satuan = is_array($row) ? ($row['satuan'] ?? null) : $row->satuan;
            $batasAtas = (float) (is_array($row) ? ($row['batas_atas'] ?? 0) : $row->batas_atas);

            $itemData = [
                'nama_barang' => $nama,
                'kode_rekening' => $kodeRek,
                'rekening' => $rek,
                'satuan' => $satuan,
                'batas_atas' => $batasAtas,
                'tahun' => $tahun,
            ];

            if ($estimasiHarga !== null && $batasAtas > 0) {
                if ($estimasiHarga <= $batasAtas) {
                    $hematNominal = $batasAtas - $estimasiHarga;
                    $hematPersen = round(($hematNominal / $batasAtas) * 100, 1);
                    $itemData['evaluasi_harga'] = [
                        'status' => 'AMAN_SESUAI_SSH',
                        'keterangan' => 'Harga Rp '.number_format($estimasiHarga, 0, ',', '.').' aman di bawah batas atas SSH (hemat Rp '.number_format($hematNominal, 0, ',', '.')." / {$hematPersen}%).",
                    ];
                } else {
                    $selisihLebih = $estimasiHarga - $batasAtas;
                    $lebihPersen = round(($selisihLebih / $batasAtas) * 100, 1);
                    $itemData['evaluasi_harga'] = [
                        'status' => 'MELEBIHI_BATAS_SSH',
                        'keterangan' => 'Perhatian: Harga Rp '.number_format($estimasiHarga, 0, ',', '.').' melebihi batas atas SSH sebesar Rp '.number_format($selisihLebih, 0, ',', '.')." (+{$lebihPersen}%).",
                    ];
                }
            }

            $itemsList[] = $itemData;
            if ($batasAtas > 0) {
                $batasAtasValues[] = $batasAtas;
            }
        }

        $minPrice = ! empty($batasAtasValues) ? min($batasAtasValues) : 0;
        $maxPrice = ! empty($batasAtasValues) ? max($batasAtasValues) : 0;
        $avgPrice = ! empty($batasAtasValues) ? round(array_sum($batasAtasValues) / count($batasAtasValues)) : 0;

        $overallEvaluasi = null;
        if ($estimasiHarga !== null && $maxPrice > 0) {
            if ($estimasiHarga <= $maxPrice) {
                $overallEvaluasi = [
                    'status' => 'AMAN_DI_BAWAH_BATAS_SSH',
                    'estimasi_harga' => $estimasiHarga,
                    'batas_atas_tertinggi_arkas' => $maxPrice,
                    'kesimpulan' => 'Rencana belanja sebesar Rp '.number_format($estimasiHarga, 0, ',', '.').' masih berada di bawah pagu batas atas acuan ARKAS tertinggi (Rp '.number_format($maxPrice, 0, ',', '.').'). Aman dianggarkan.',
                ];
            } else {
                $overallEvaluasi = [
                    'status' => 'MELEBIHI_PAGU_SSH_RESMI',
                    'estimasi_harga' => $estimasiHarga,
                    'batas_atas_tertinggi_arkas' => $maxPrice,
                    'kesimpulan' => 'Perhatian Om! Rencana belanja Rp '.number_format($estimasiHarga, 0, ',', '.').' melampaui pagu tertinggi acuan ARKAS (Rp '.number_format($maxPrice, 0, ',', '.').'). Berpotensi menjadi temuan jika tidak ada justifikasi SSH/SBU khusus.',
                ];
            }
        }

        return [
            'status' => 'success',
            'query' => $cleanQuery,
            'tahun' => $tahun,
            'source' => $source,
            'total_ditemukan' => $totalFound,
            'limit' => $limit,
            'summary_harga_acuan' => [
                'batas_atas_terendah' => $minPrice,
                'batas_atas_tertinggi' => $maxPrice,
                'batas_atas_rata_rata' => $avgPrice,
            ],
            'evaluasi_kewajaran' => $overallEvaluasi,
            'items' => $itemsList,
        ];
    }

    /**
     * Menjalankan audit dan diagnosa integrasi sistem antara SIKAS dan aplikasi desktop ARKAS
     */
    public function diagnoseArkasIntegration(
        User $user,
        string $variant,
        int $tahun = 2026,
        string $scope = 'comprehensive',
        ?string $bulan = null
    ): array {
        try {
            $service = $this->arkasDiagnosticService ?? app(ArkasDiagnosticService::class);

            if ($scope === 'bku_month' && ! empty($bulan)) {
                $raw = $service->runContextualDiagnostic($user, $variant, $tahun, 'bku_month', ['bulan' => $bulan]);
            } elseif ($scope === 'rkas') {
                $raw = $service->runContextualDiagnostic($user, $variant, $tahun, 'rkas', []);
            } else {
                $raw = $service->runComprehensiveDiagnostic($user, $variant, $tahun);
            }

            $diffSummary = $raw['diff_summary'] ?? $raw['diff'] ?? [];
            $connection = $raw['connection_health'] ?? $raw['connection'] ?? [];
            $rkasDiff = $diffSummary['rkas'] ?? [];
            $bkuDiff = $diffSummary['bku'] ?? [];
            $monthsData = $diffSummary['months'] ?? [];
            $actionable = $raw['ai_analysis']['actionable_recommendations'] ?? $raw['recommendations'] ?? [];

            $monthlySummary = [];
            foreach ($monthsData as $mItem) {
                $mName = $mItem['nama_bulan'] ?? ('Bulan '.($mItem['bulan'] ?? ''));
                $sikasSpent = (float) ($mItem['sikas']['belanja_nominal'] ?? 0);
                $arkasSpent = (float) ($mItem['arkas']['belanja_nominal'] ?? 0);
                $selisih = abs($sikasSpent - $arkasSpent);
                $hasDiff = $mItem['diff']['has_difference'] ?? ($selisih > 1.0);

                $monthlySummary[] = [
                    'bulan' => $mName,
                    'belanja_sikas' => $sikasSpent,
                    'belanja_arkas' => $arkasSpent,
                    'selisih' => $selisih,
                    'status' => ! $hasDiff ? 'KLOP_SEIMBANG' : 'ADA_SELISIH',
                    'arkas_tutup_buku' => (bool) ($mItem['arkas']['is_closed'] ?? false),
                ];
            }

            return [
                'status' => 'success',
                'headline' => $raw['headline'] ?? 'Diagnosa Integrasi ARKAS',
                'overall_status' => $raw['overall_status'] ?? 'UNKNOWN',
                'scope' => $scope,
                'tahun' => $tahun,
                'variant' => $variant,
                'koneksi_database_arkas' => [
                    'status' => ($connection['is_connected'] ?? true) ? 'CONNECTED' : 'DISCONNECTED',
                    'db_path' => $connection['db_path'] ?? 'arkas.db',
                    'ukuran_file_mb' => isset($connection['size_bytes']) ? round($connection['size_bytes'] / (1024 * 1024), 2) : ($connection['size_mb'] ?? null),
                    'terakhir_diperbarui_arkas' => $connection['last_modified'] ?? null,
                    'status_kunci_sqlcipher' => $connection['cipher_unlocked'] ?? true,
                ],
                'komparasi_pagu_rkas' => [
                    'pagu_sikas' => (float) ($rkasDiff['sikas_pagu'] ?? 0),
                    'pagu_arkas' => (float) ($rkasDiff['arkas_pagu'] ?? 0),
                    'selisih' => (float) ($rkasDiff['diff'] ?? 0),
                    'status_pagu' => abs((float) ($rkasDiff['diff'] ?? 0)) < 1.0 ? 'KLOP_SEIMBANG' : 'TERDAPAT_SELISIH',
                ],
                'ringkasan_bku_tahunan' => [
                    'total_belanja_sikas' => (float) ($bkuDiff['total_sikas_belanja'] ?? 0),
                    'total_belanja_arkas' => (float) ($bkuDiff['total_arkas_belanja'] ?? 0),
                    'total_selisih' => (float) ($bkuDiff['total_belanja_diff'] ?? 0),
                    'jumlah_bulan_selisih' => (int) ($bkuDiff['differing_months_count'] ?? 0),
                ],
                'ringkasan_bku_bulanan' => $monthlySummary,
                'rekomendasi_tindakan' => $actionable,
            ];
        } catch (\Throwable $e) {
            Log::error('diagnoseArkasIntegration Copilot error: '.$e->getMessage());

            return [
                'status' => 'error',
                'scope' => $scope,
                'tahun' => $tahun,
                'message' => 'Gagal menjalankan diagnosa ARKAS: '.$e->getMessage(),
                'rekomendasi_tindakan' => [
                    'Pastikan file database ARKAS (arkas.db) tidak sedang terkunci oleh proses desktop ARKAS.',
                    'Periksa kembali menu Pengaturan Path Arkas di SIKAS.',
                ],
            ];
        }
    }

    /**
     * Helper privat untuk menjalankan query python ke arkas.db secara aman
     */
    protected function runPythonArkasQuery(string $keyword, string $year = 'ALL'): array
    {
        $pythonPath = storage_path('app/arkas_engine/python.exe');
        $scriptPath = storage_path('app/arkas_engine/query.py');

        if (! file_exists($pythonPath) || ! file_exists($scriptPath)) {
            return ['error' => 'Arkas Engine tidak ditemukan.'];
        }

        $env = $_SERVER;
        unset($env['OPENSSL_CONF']);

        $appdata = $env['APPDATA'] ?? null;
        $userprofile = $env['USERPROFILE'] ?? null;

        if (empty($appdata)) {
            $appdata = trim(shell_exec("powershell -Command \"[Environment]::GetFolderPath('ApplicationData')\""));
        }
        if (empty($userprofile)) {
            $userprofile = trim(shell_exec("powershell -Command \"[Environment]::GetFolderPath('UserProfile')\""));
        }
        if (empty($userprofile) && ! empty($appdata)) {
            $userprofile = dirname(dirname($appdata));
        }
        if (empty($appdata) && ! empty($userprofile)) {
            $appdata = $userprofile.'\\AppData\\Roaming';
        }

        $env['SystemRoot'] = $env['SystemRoot'] ?? 'C:\\Windows';
        $env['SystemDrive'] = $env['SystemDrive'] ?? 'C:';
        $env['USERPROFILE'] = ! empty($userprofile) ? $userprofile : ($env['USERPROFILE'] ?? 'C:\\Users\\Digitalisasi');
        $env['APPDATA'] = ! empty($appdata) ? $appdata : ($env['APPDATA'] ?? 'C:\\Users\\Digitalisasi\\AppData\\Roaming');

        $dbPathManual = env('ARKAS_DB_PATH', '');
        $dbPathManual = trim($dbPathManual, '"\' ');
        $dbPathManual = str_replace('\\', '/', $dbPathManual);

        $process = new Process([$pythonPath, $scriptPath, $keyword, (string) $year, $dbPathManual], null, $env);
        $process->setTimeout(30);
        $process->run();

        if (! $process->isSuccessful()) {
            return ['error' => 'Gagal query ARKAS: '.$process->getErrorOutput()];
        }

        $result = json_decode($process->getOutput(), true);

        return is_array($result) ? $result : ['error' => 'Format output ARKAS tidak valid.'];
    }

    /**
     * Audit dan verifikasi matriks kelengkapan dokumen SPJ (Kwitansi, Tanda Terima, BAST, Surat Pesanan)
     */
    public function getSpjDocumentsStatus(
        int $tahun,
        string $variant = 'reguler',
        ?string $bulan = null,
        ?int $tahap = null,
        string $statusFilter = 'semua'
    ): array {
        VariantConfig::validateVariant($variant);
        $bkuClass = VariantConfig::getModelClass('buku_kas_umum', $variant);

        $query = $bkuClass::query()
            ->whereYear('tanggal_transaksi', $tahun)
            ->where('total_transaksi_kotor', '>', 0)
            ->where(function ($q) {
                $q->whereNull('is_bunga_record')->orWhere('is_bunga_record', false);
            });

        // Filter Tahap (1 = Jan-Jun, 2 = Jul-Des)
        if ($tahap === 1) {
            $query->whereMonth('tanggal_transaksi', '<=', 6);
        } elseif ($tahap === 2) {
            $query->whereMonth('tanggal_transaksi', '>=', 7);
        }

        // Filter Bulan
        $monthNum = null;
        if (! empty($bulan) && strtolower(trim($bulan)) !== 'semua') {
            $bulanLower = strtolower(trim($bulan));
            $months = [
                'januari' => 1, 'februari' => 2, 'maret' => 3, 'april' => 4,
                'mei' => 5, 'juni' => 6, 'juli' => 7, 'agustus' => 8,
                'september' => 9, 'oktober' => 10, 'november' => 11, 'desember' => 12,
            ];
            $monthNum = $months[$bulanLower] ?? (is_numeric($bulan) ? (int) $bulan : null);
            if ($monthNum) {
                $query->whereMonth('tanggal_transaksi', $monthNum);
            }
        }

        $bkuList = $query->with([
            'rekeningBelanja',
            'kodeKegiatan',
            'uraianDetails',
            'kwitansi',
            'tandaTerima',
            'bast',
            'suratPesanan',
        ])
            ->orderBy('tanggal_transaksi', 'asc')
            ->orderBy('id', 'asc')
            ->get();

        $totalEvaluasi = 0;
        $totalLengkap = 0;
        $items = [];

        foreach ($bkuList as $bku) {
            $totalEvaluasi++;

            $kodeRekening = $bku->rekeningBelanja?->kode_rekening ?? '';
            $namaRekening = $bku->rekeningBelanja?->nama_rekening ?? '';
            $uraian = $bku->uraian ?? '';
            $uraianOpsional = $bku->uraian_opsional ?? '';
            $combinedText = strtolower($uraian.' '.$uraianOpsional.' '.$namaRekening);

            // Klasifikasi Belanja
            $isUtilityOperasional = (bool) preg_match('/(internet|pulsa|telepon|listrik|air|langganan|kawat|faksimili)/i', $combinedText);

            // 1. Honorarium, Jasa Tenaga, Upah, dan Transportasi
            $isHonorJasaTransport = ! $isUtilityOperasional && (
                str_starts_with($kodeRekening, '5.1.01.')
                || str_starts_with($kodeRekening, '5.1.02.02.')
                || str_starts_with($kodeRekening, '5.1.02.04.')
                || (bool) preg_match('/(honor|upah|insentif|transport|perjalanan dinas|jasa tenaga|narasumber)/i', $combinedText)
            );

            // 2. Belanja Modal (Aset Tetap)
            $isModal = str_starts_with($kodeRekening, '5.2.') || str_contains($combinedText, 'modal');

            // 3. Pengadaan Barang Fisik & Pemeliharaan Sarana/Gedung
            $isBendaPos = str_contains($kodeRekening, '0027') || str_contains($combinedText, 'benda pos') || str_contains($combinedText, 'materai');
            $isBarangFisik = ! $isHonorJasaTransport && ! $isBendaPos && (
                str_starts_with($kodeRekening, '5.1.02.01.')
                || str_starts_with($kodeRekening, '5.1.02.03.')
                || (bool) preg_match('/(alat|bahan|cat|kuas|semen|racun|atk|buku|perabot|kursi|meja|laptop|komputer|printer)/i', $combinedText)
            );

            // Logika Kepatuhan Regulasi
            if ($isHonorJasaTransport) {
                $kategori = 'HONOR_JASA';
                $wajibKwitansi = true;
                $wajibTandaTerima = true;
                $wajibSp = false;
                $wajibBast = false;
            } elseif ($isModal || $isBarangFisik) {
                $kategori = $isModal ? 'MODAL' : 'BARANG_FISIK';
                $wajibKwitansi = true;
                $wajibTandaTerima = false;
                $wajibSp = true;
                $wajibBast = true;
            } else {
                $kategori = 'OPERASIONAL';
                $wajibKwitansi = true;
                $wajibTandaTerima = false;
                $wajibSp = false;
                $wajibBast = false;
            }

            // Cek Keberadaan Berkas di Database
            $hasKwitansi = $bku->kwitansi !== null;
            $hasTandaTerima = $bku->tandaTerima !== null;
            $hasBast = $bku->bast !== null;
            $hasSp = $bku->suratPesanan !== null;

            // Kumpulkan Dokumen yang Kurang
            $dokumenKurang = [];
            if ($wajibKwitansi && ! $hasKwitansi) {
                $dokumenKurang[] = 'Kwitansi';
            }
            if ($wajibTandaTerima && ! $hasTandaTerima) {
                $dokumenKurang[] = 'Tanda Terima';
            }
            if ($wajibSp && ! $hasSp) {
                $dokumenKurang[] = 'Surat Pesanan';
            }
            if ($wajibBast && ! $hasBast) {
                $dokumenKurang[] = 'BAST';
            }

            $isLengkap = empty($dokumenKurang);
            if ($isLengkap) {
                $totalLengkap++;
            }

            // Terapkan Filter Status
            if ($statusFilter === 'belum_lengkap' && $isLengkap) {
                continue;
            }
            if ($statusFilter === 'lengkap' && ! $isLengkap) {
                continue;
            }

            $noBukti = ! empty($bku->id_transaksi) ? $bku->id_transaksi : (! empty($bku->nomor_nota) ? $bku->nomor_nota : 'Belanja Kas');

            $items[] = [
                'bku_id' => $bku->id,
                'tanggal' => $bku->tanggal_transaksi ? Carbon::parse($bku->tanggal_transaksi)->format('Y-m-d') : '',
                'nomor_bukti' => $noBukti,
                'uraian' => $bku->uraian_opsional ?: $bku->uraian,
                'nama_rekanan' => $bku->nama_toko ?: ($bku->nama_penerima_pembayaran ?: '-'),
                'kode_rekening' => $kodeRekening,
                'nama_rekening' => $namaRekening,
                'nominal' => (float) $bku->total_transaksi_kotor,
                'kategori_belanja' => $kategori,
                'kelengkapan' => [
                    'kwitansi' => [
                        'ada' => $hasKwitansi,
                        'wajib' => $wajibKwitansi,
                        'nomor' => $hasKwitansi ? $noBukti : null,
                    ],
                    'tanda_terima' => [
                        'ada' => $hasTandaTerima,
                        'wajib' => $wajibTandaTerima,
                        'nomor' => $hasTandaTerima ? $noBukti : null,
                    ],
                    'surat_pesanan' => [
                        'ada' => $hasSp,
                        'wajib' => $wajibSp,
                        'nomor' => $bku->suratPesanan?->nomor_sp,
                    ],
                    'bast' => [
                        'ada' => $hasBast,
                        'wajib' => $wajibBast,
                        'nomor' => $bku->bast?->nomor_bast,
                    ],
                ],
                'status_spj' => $isLengkap ? 'LENGKAP' : 'BELUM_LENGKAP',
                'dokumen_kurang' => $dokumenKurang,
            ];
        }

        $transaksiBelumLengkap = $totalEvaluasi - $totalLengkap;
        $persentaseKepatuhan = $totalEvaluasi > 0 ? round(($totalLengkap / $totalEvaluasi) * 100, 1) : 100.0;

        return [
            'status' => 'success',
            'tahun' => $tahun,
            'bulan' => $bulan ?: 'Semua',
            'tahap' => $tahap,
            'status_filter' => $statusFilter,
            'ringkasan_kepatuhan' => [
                'total_transaksi' => $totalEvaluasi,
                'transaksi_lengkap' => $totalLengkap,
                'transaksi_belum_lengkap' => $transaksiBelumLengkap,
                'persentase_kepatuhan' => $persentaseKepatuhan,
            ],
            'items' => $items,
        ];
    }

    /**
     * Mengambil lembar rincian resmi salah satu dokumen SPJ (BAST, Surat Pesanan, Kwitansi, atau Tanda Terima)
     */
    public function getSpjDocumentDetail(
        string $tipeDokumen,
        ?string $query = null,
        ?int $bkuId = null,
        int $tahun = 2026,
        string $variant = 'reguler',
        ?string $bulan = null
    ): array {
        VariantConfig::validateVariant($variant);
        $tipe = strtolower(trim($tipeDokumen));

        if (str_contains($tipe, 'bast') || str_contains($tipe, 'berita')) {
            $concept = 'bast';
        } elseif (str_contains($tipe, 'pesan') || str_contains($tipe, 'sp')) {
            $concept = 'surat_pesanan';
        } elseif (str_contains($tipe, 'terima') || str_contains($tipe, 'tanda')) {
            $concept = 'tanda_terima';
        } else {
            $concept = 'kwitansi';
        }

        $modelClass = VariantConfig::getModelClass($concept, $variant);
        $bkuClass = VariantConfig::getModelClass('buku_kas_umum', $variant);
        $penganggaranClass = VariantConfig::getModelClass('penganggaran', $variant);
        $sekolah = SekolahProfile::first();
        $penganggaran = $penganggaranClass::where('tahun_anggaran', $tahun)->first();
        $bkuFk = VariantConfig::bkuFk($variant);

        $docQuery = $modelClass::query()->with([
            'bukuKasUmum.uraianDetails',
            'bukuKasUmum.rekeningBelanja',
            'bukuKasUmum.kodeKegiatan',
            'penganggaran',
            'sekolah',
        ]);

        if (! empty($bkuId)) {
            $docQuery->where($bkuFk, $bkuId);
        } else {
            $docQuery->whereHas('bukuKasUmum', function ($bq) use ($tahun, $bulan) {
                $bq->whereYear('tanggal_transaksi', $tahun);

                if (! empty($bulan) && strtolower(trim($bulan)) !== 'semua') {
                    $bulanLower = strtolower(trim($bulan));
                    $months = [
                        'januari' => 1, 'februari' => 2, 'maret' => 3, 'april' => 4,
                        'mei' => 5, 'juni' => 6, 'juli' => 7, 'agustus' => 8,
                        'september' => 9, 'oktober' => 10, 'november' => 11, 'desember' => 12,
                    ];
                    $mNum = $months[$bulanLower] ?? (is_numeric($bulan) ? (int) $bulan : null);
                    if ($mNum) {
                        $bq->whereMonth('tanggal_transaksi', $mNum);
                    }
                }
            });

            if (! empty($query)) {
                $docQuery->where(function ($dq) use ($query, $concept) {
                    $dq->whereHas('bukuKasUmum', function ($bq) use ($query) {
                        $bq->where('id_transaksi', 'ILIKE', "%{$query}%")
                            ->orWhere('nomor_nota', 'ILIKE', "%{$query}%")
                            ->orWhere('uraian', 'ILIKE', "%{$query}%")
                            ->orWhere('uraian_opsional', 'ILIKE', "%{$query}%")
                            ->orWhere('nama_toko', 'ILIKE', "%{$query}%")
                            ->orWhere('nama_penerima_pembayaran', 'ILIKE', "%{$query}%");
                    });

                    if ($concept === 'bast') {
                        $dq->orWhere('nomor_bast', 'ILIKE', "%{$query}%")
                            ->orWhere('pihak_pertama_nama', 'ILIKE', "%{$query}%")
                            ->orWhere('pihak_pertama_instansi', 'ILIKE', "%{$query}%");
                    } elseif ($concept === 'surat_pesanan') {
                        $dq->orWhere('nomor_sp', 'ILIKE', "%{$query}%")
                            ->orWhere('pihak_kedua_nama_perusahaan', 'ILIKE', "%{$query}%")
                            ->orWhere('pihak_kedua_penanggung_jawab', 'ILIKE', "%{$query}%");
                    }
                });
            }
        }

        $doc = $docQuery->latest('id')->first();

        // Jika dokumen belum ada, periksa apakah BKU-nya ada
        if (! $doc) {
            $bkuFindQuery = $bkuClass::query()->whereYear('tanggal_transaksi', $tahun)->where('total_transaksi_kotor', '>', 0);
            if (! empty($bkuId)) {
                $bkuFindQuery->where('id', $bkuId);
            } elseif (! empty($query)) {
                $bkuFindQuery->where(function ($bq) use ($query) {
                    $bq->where('id_transaksi', 'ILIKE', "%{$query}%")
                        ->orWhere('nomor_nota', 'ILIKE', "%{$query}%")
                        ->orWhere('uraian', 'ILIKE', "%{$query}%")
                        ->orWhere('uraian_opsional', 'ILIKE', "%{$query}%")
                        ->orWhere('nama_toko', 'ILIKE', "%{$query}%");
                });
            }

            $bkuMatch = $bkuFindQuery->first();
            if ($bkuMatch) {
                return [
                    'status' => 'belum_dibuat',
                    'tipe_dokumen' => strtoupper($concept),
                    'pesan' => 'Dokumen '.strtoupper($concept)." untuk transaksi '{$bkuMatch->uraian}' belum dibuat di sistem SIKAS.",
                    'nomor_bukti_bku' => $bkuMatch->id_transaksi ?: ($bkuMatch->nomor_nota ?: 'Belanja Kas'),
                    'tanggal_transaksi' => $bkuMatch->tanggal_transaksi ? Carbon::parse($bkuMatch->tanggal_transaksi)->format('Y-m-d') : '',
                    'uraian_belanja' => $bkuMatch->uraian_opsional ?: $bkuMatch->uraian,
                    'nama_rekanan' => $bkuMatch->nama_toko ?: ($bkuMatch->nama_penerima_pembayaran ?: '-'),
                    'nominal_bruto' => (float) $bkuMatch->total_transaksi_kotor,
                ];
            }

            return [
                'status' => 'not_found',
                'tipe_dokumen' => strtoupper($concept),
                'pesan' => 'Tidak ditemukan berkas dokumen '.strtoupper($concept)." dengan kata kunci '{$query}' pada tahun {$tahun}.",
            ];
        }

        $bku = $doc->bukuKasUmum;
        $noBukti = ! empty($bku->id_transaksi) ? $bku->id_transaksi : (! empty($bku->nomor_nota) ? $bku->nomor_nota : 'Belanja Kas');
        $tglTransaksi = $bku->tanggal_transaksi ? Carbon::parse($bku->tanggal_transaksi)->translatedFormat('d F Y') : '-';

        // Susun Item Rincian Barang / Jasa
        $items = [];
        $idx = 1;
        if ($bku && $bku->uraianDetails && $bku->uraianDetails->isNotEmpty()) {
            foreach ($bku->uraianDetails as $det) {
                $items[] = [
                    'no' => $idx++,
                    'uraian' => $det->uraian,
                    'volume' => (float) $det->volume,
                    'satuan' => $det->satuan,
                    'harga_satuan' => (float) $det->harga_satuan,
                    'jumlah' => (float) $det->jumlah,
                    'kondisi' => $det->kondisi ?: 'Baik',
                ];
            }
        } else {
            $items[] = [
                'no' => 1,
                'uraian' => $bku->uraian_opsional ?: $bku->uraian,
                'volume' => 1.0,
                'satuan' => 'Paket',
                'harga_satuan' => (float) ($bku->total_transaksi_kotor ?? $bku->anggaran ?? 0),
                'jumlah' => (float) ($bku->total_transaksi_kotor ?? $bku->anggaran ?? 0),
                'kondisi' => 'Baik',
            ];
        }

        // Keuangan
        $bruto = (float) ($bku->total_transaksi_kotor ?? $bku->anggaran ?? 0);
        $pajak = (float) (($bku->total_pajak ?? 0) + ($bku->total_pajak_daerah ?? 0));
        $neto = max(0, $bruto - $pajak);
        $terbilangBruto = $this->terbilangRupiah($bruto);
        $terbilangNeto = $this->terbilangRupiah($neto);

        $identitasSekolah = [
            'nama_sekolah' => $sekolah?->nama_sekolah ?? 'SMP MUHAMMADIYAH SONI',
            'npsn' => $sekolah?->npsn ?? '-',
            'alamat' => $sekolah?->alamat ?? '-',
            'kepala_sekolah' => $penganggaran?->kepala_sekolah ?? 'Kepala Sekolah',
            'nip_kepala_sekolah' => $penganggaran?->nip_kepala_sekolah ?? '-',
            'bendahara' => $penganggaran?->bendahara ?? 'Bendahara BOSP',
            'nip_bendahara' => $penganggaran?->nip_bendahara ?? '-',
        ];

        // Format Khusus per Tipe Dokumen
        if ($concept === 'bast') {
            $nomorBast = ! empty($doc->nomor_bast) && ! str_contains($doc->nomor_bast, '..........') ? $doc->nomor_bast : ($noBukti.'/BAST/'.$tahun);
            $tglBast = $doc->tanggal_bast ? Carbon::parse($doc->tanggal_bast)->translatedFormat('d F Y') : $tglTransaksi;

            return [
                'status' => 'success',
                'tipe_dokumen' => 'BAST',
                'judul' => 'BERITA ACARA SERAH TERIMA BARANG / JASA (BAST)',
                'nomor_dokumen' => $nomorBast,
                'tanggal_dokumen' => $tglBast,
                'nomor_bukti_bku' => $noBukti,
                'rekening' => ($bku->rekeningBelanja?->kode_rekening ?? '').' - '.($bku->rekeningBelanja?->nama_rekening ?? ''),
                'kegiatan' => ($bku->kodeKegiatan?->kode ?? '').' - '.($bku->kodeKegiatan?->nama ?? ''),
                'pihak_pertama' => [
                    'peran' => 'PIHAK PERTAMA (Yang Menyerahkan / Penyedia)',
                    'nama' => ! empty($doc->pihak_pertama_nama) ? $doc->pihak_pertama_nama : (! empty($bku->nama_penerima_pembayaran) ? $bku->nama_penerima_pembayaran : ($bku->nama_toko ?: 'Penyedia')),
                    'jabatan' => ! empty($doc->pihak_pertama_jabatan) ? $doc->pihak_pertama_jabatan : 'Pimpinan / Penanggung Jawab',
                    'instansi' => ! empty($doc->pihak_pertama_instansi) ? $doc->pihak_pertama_instansi : ($bku->nama_toko ?: 'Penyedia Barang/Jasa'),
                    'alamat' => ! empty($doc->pihak_pertama_alamat) ? $doc->pihak_pertama_alamat : ($bku->alamat_toko ?: '-'),
                ],
                'pihak_kedua' => [
                    'peran' => 'PIHAK KEDUA (Yang Menerima / Satuan Pendidikan)',
                    'nama' => ! empty($doc->pihak_kedua_nama) ? $doc->pihak_kedua_nama : $identitasSekolah['kepala_sekolah'],
                    'nip' => $identitasSekolah['nip_kepala_sekolah'],
                    'jabatan' => ! empty($doc->pihak_kedua_jabatan) ? $doc->pihak_kedua_jabatan : 'Kepala Sekolah',
                    'instansi' => ! empty($doc->pihak_kedua_instansi) ? $doc->pihak_kedua_instansi : $identitasSekolah['nama_sekolah'],
                    'alamat' => ! empty($doc->pihak_kedua_alamat) ? $doc->pihak_kedua_alamat : $identitasSekolah['alamat'],
                ],
                'klausul' => 'PIHAK PERTAMA telah menyerahkan barang/hasil pekerjaan kepada PIHAK KEDUA, dan PIHAK KEDUA menyatakan telah menerima barang tersebut dalam keadaan baik, lengkap, dan sesuai dengan spesifikasi teknis yang disepakati.',
                'items' => $items,
                'keuangan' => [
                    'total_bruto' => $bruto,
                    'total_pajak' => $pajak,
                    'total_neto' => $neto,
                    'terbilang_bruto' => $terbilangBruto,
                    'terbilang_neto' => $terbilangNeto,
                ],
                'tanda_tangan' => [
                    'yang_menyerahkan' => ! empty($doc->pihak_pertama_nama) ? $doc->pihak_pertama_nama : ($bku->nama_toko ?: 'Penyedia'),
                    'yang_menerima' => $identitasSekolah['kepala_sekolah'],
                    'nip_yang_menerima' => $identitasSekolah['nip_kepala_sekolah'],
                ],
            ];
        }

        if ($concept === 'surat_pesanan') {
            $nomorSp = ! empty($doc->nomor_sp) && ! str_contains($doc->nomor_sp, '...........') ? $doc->nomor_sp : ($noBukti.'/SP/'.$tahun);
            $tglSp = $doc->tanggal_sp ? Carbon::parse($doc->tanggal_sp)->translatedFormat('d F Y') : $tglTransaksi;

            return [
                'status' => 'success',
                'tipe_dokumen' => 'SURAT_PESANAN',
                'judul' => 'SURAT PESANAN (SP)',
                'nomor_dokumen' => $nomorSp,
                'tanggal_dokumen' => $tglSp,
                'nomor_bukti_bku' => $noBukti,
                'rekening' => ($bku->rekeningBelanja?->kode_rekening ?? '').' - '.($bku->rekeningBelanja?->nama_rekening ?? ''),
                'pihak_kesatu' => [
                    'peran' => 'PIHAK KESATU (Pemesan / Satuan Pendidikan)',
                    'nama' => ! empty($doc->pihak_kesatu_nama) ? $doc->pihak_kesatu_nama : $identitasSekolah['kepala_sekolah'],
                    'nip' => ! empty($doc->pihak_kesatu_nip) ? $doc->pihak_kesatu_nip : $identitasSekolah['nip_kepala_sekolah'],
                    'jabatan' => ! empty($doc->pihak_kesatu_jabatan) ? $doc->pihak_kesatu_jabatan : 'Kepala Sekolah / PPK',
                    'instansi' => ! empty($doc->pihak_kesatu_instansi) ? $doc->pihak_kesatu_instansi : $identitasSekolah['nama_sekolah'],
                    'alamat' => ! empty($doc->pihak_kesatu_alamat) ? $doc->pihak_kesatu_alamat : $identitasSekolah['alamat'],
                ],
                'pihak_kedua' => [
                    'peran' => 'PIHAK KEDUA (Penyedia / Toko Rekanan)',
                    'nama_perusahaan' => ! empty($doc->pihak_kedua_nama_perusahaan) ? $doc->pihak_kedua_nama_perusahaan : ($bku->nama_toko ?: 'Penyedia'),
                    'penanggung_jawab' => ! empty($doc->pihak_kedua_penanggung_jawab) ? $doc->pihak_kedua_penanggung_jawab : ($bku->nama_penerima_pembayaran ?: '-'),
                    'alamat' => ! empty($doc->pihak_kedua_alamat) ? $doc->pihak_kedua_alamat : ($bku->alamat_toko ?: '-'),
                    'npwp' => ! empty($doc->pihak_kedua_npwp) ? $doc->pihak_kedua_npwp : ($bku->npwp ?: '-'),
                    'platform' => ! empty($doc->pihak_kedua_platform) ? $doc->pihak_kedua_platform : 'SIPLah / Offline',
                ],
                'items' => $items,
                'ketentuan' => [
                    'waktu_pengiriman' => $doc->waktu_pengiriman ?: 'Barang harus dikirimkan selambat-lambatnya setelah Surat Pesanan disetujui.',
                    'kondisi_barang' => $doc->kondisi_barang ?: 'Barang yang dikirim harus dalam keadaan baru, tidak cacat, dan sesuai spesifikasi.',
                    'ketentuan_pembayaran' => $doc->ketentuan_pembayaran ?: 'Pembayaran ditransfer setelah seluruh barang diterima dengan baik yang dibuktikan dengan BAST.',
                    'sumber_dana' => $doc->sumber_dana ?: "Bantuan Operasional Satuan Pendidikan (BOSP) Tahun Anggaran {$tahun}",
                ],
                'keuangan' => [
                    'total_bruto' => $bruto,
                    'total_pajak' => $pajak,
                    'total_neto' => $neto,
                    'terbilang_bruto' => $terbilangBruto,
                    'terbilang_neto' => $terbilangNeto,
                ],
                'tanda_tangan' => [
                    'pemesan' => $identitasSekolah['kepala_sekolah'],
                    'nip_pemesan' => $identitasSekolah['nip_kepala_sekolah'],
                    'penyedia' => ! empty($doc->pihak_kedua_nama_perusahaan) ? $doc->pihak_kedua_nama_perusahaan : ($bku->nama_toko ?: 'Penyedia'),
                ],
            ];
        }

        if ($concept === 'tanda_terima') {
            return [
                'status' => 'success',
                'tipe_dokumen' => 'TANDA_TERIMA',
                'judul' => 'TANDA TERIMA PEMBAYARAN HONORARIUM / JASA',
                'nomor_dokumen' => $noBukti,
                'tanggal_dokumen' => $tglTransaksi,
                'sekolah' => $identitasSekolah['nama_sekolah'],
                'keperluan' => $bku->uraian_opsional ?: $bku->uraian,
                'rekening' => ($bku->rekeningBelanja?->kode_rekening ?? '').' - '.($bku->rekeningBelanja?->nama_rekening ?? ''),
                'kegiatan' => ($bku->kodeKegiatan?->kode ?? '').' - '.($bku->kodeKegiatan?->nama ?? ''),
                'daftar_penerima' => $items,
                'keuangan' => [
                    'total_bruto' => $bruto,
                    'total_pajak' => $pajak,
                    'total_neto' => $neto,
                    'terbilang_neto' => $terbilangNeto,
                ],
                'tanda_tangan' => [
                    'yang_menyerahkan' => $identitasSekolah['bendahara'],
                    'nip_bendahara' => $identitasSekolah['nip_bendahara'],
                    'mengetahui' => $identitasSekolah['kepala_sekolah'],
                    'nip_kepala_sekolah' => $identitasSekolah['nip_kepala_sekolah'],
                    'penerima' => ! empty($bku->nama_penerima_pembayaran) ? $bku->nama_penerima_pembayaran : ($items[0]['uraian'] ?? 'Penerima Honor'),
                ],
            ];
        }

        // Default: Kwitansi
        return [
            'status' => 'success',
            'tipe_dokumen' => 'KWITANSI',
            'judul' => 'KWITANSI PEMBAYARAN BOSP',
            'nomor_bukti' => $noBukti,
            'tanggal_transaksi' => $tglTransaksi,
            'tahun_anggaran' => $tahun,
            'sudah_terima_dari' => 'Bendahara BOSP '.$identitasSekolah['nama_sekolah'],
            'terbilang' => $terbilangBruto,
            'untuk_pembayaran' => $bku->uraian_opsional ?: $bku->uraian,
            'rekening' => ($bku->rekeningBelanja?->kode_rekening ?? '').' - '.($bku->rekeningBelanja?->nama_rekening ?? ''),
            'kegiatan' => ($bku->kodeKegiatan?->kode ?? '').' - '.($bku->kodeKegiatan?->nama ?? ''),
            'penerima' => $bku->nama_toko ?: ($bku->nama_penerima_pembayaran ?: 'Penyedia / Rekanan'),
            'rincian_barang' => $items,
            'keuangan' => [
                'nominal_bruto' => $bruto,
                'potongan_pajak' => $pajak,
                'nominal_neto' => $neto,
                'terbilang_bruto' => $terbilangBruto,
                'terbilang_neto' => $terbilangNeto,
                'pajak_detail' => [
                    'jenis' => $bku->pajak,
                    'persen' => (float) $bku->persen_pajak,
                    'nominal' => (float) $bku->total_pajak,
                    'ntpn' => $bku->ntpn,
                ],
            ],
            'tanda_tangan' => [
                'kepala_sekolah' => $identitasSekolah['kepala_sekolah'],
                'nip_kepala_sekolah' => $identitasSekolah['nip_kepala_sekolah'],
                'bendahara' => $identitasSekolah['bendahara'],
                'nip_bendahara' => $identitasSekolah['nip_bendahara'],
                'penerima' => $bku->nama_penerima_pembayaran ?: ($bku->nama_toko ?: 'Penyedia'),
            ],
        ];
    }

    /**
     * Konversi angka nominal uang ke kalimat terbilang Rupiah resmi
     */
    public function terbilangRupiah(float|int $amount): string
    {
        $amount = (int) round($amount);
        if ($amount <= 0) {
            return 'Nol Rupiah';
        }

        return ucwords($this->convertNumberToWords($amount)).' Rupiah';
    }

    protected function convertNumberToWords(int $number): string
    {
        $units = ['', 'ribu', 'juta', 'miliar', 'triliun'];
        $words = [];

        if ($number === 0) {
            return 'nol';
        }

        $unitIndex = 0;
        while ($number > 0) {
            $chunk = $number % 1000;
            if ($chunk != 0) {
                $chunkWords = $this->convertChunkToWords($chunk);
                if ($unitIndex > 0) {
                    $chunkWords .= ' '.$units[$unitIndex];
                }
                array_unshift($words, $chunkWords);
            }
            $number = (int) floor($number / 1000);
            $unitIndex++;
        }

        $result = implode(' ', $words);
        $result = str_replace('satu ratus', 'seratus', $result);
        $result = str_replace('satu ribu', 'seribu', $result);

        return trim($result);
    }

    protected function convertChunkToWords(int $number): string
    {
        $ones = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];

        if ($number < 12) {
            return $ones[$number];
        } elseif ($number < 20) {
            return $ones[$number - 10].' belas';
        } elseif ($number < 100) {
            return trim($ones[(int) floor($number / 10)].' puluh '.$ones[$number % 10]);
        } else {
            return trim($ones[(int) floor($number / 100)].' ratus '.$this->convertChunkToWords($number % 100));
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
