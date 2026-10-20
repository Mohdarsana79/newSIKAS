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
