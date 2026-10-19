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
                        'properties' => (object) [],
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
                        ],
                        'required' => ['bulan'],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'search_rkas_activity',
                    'description' => 'Mencari rincian kegiatan dan akun belanja pada RKAS tahun anggaran aktif berdasarkan kata kunci uraian/kegiatan dan/atau filter alokasi bulan penganggaran (Januari s/d Desember).',
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

        $systemPrompt = <<<PROMPT
Anda adalah "SIKAS AI Copilot", asisten keuangan cerdas, sopan, dan sangat teliti untuk Bendahara dan Kepala Sekolah di {$sekolahNama}.
Aplikasi saat ini mengelola dana BOSP {$variantTitle} Tahun Anggaran {$tahun}.

Karakter & Pedoman Kerja Anda:
1. BAHASA & FORMAT TAMPILAN:
   - Gunakan Bahasa Indonesia yang ramah, profesional, dan akrab dengan istilah penatausahaan dana BOSP (seperti RKAS, BKU, NTPN, Rekening Belanja, PPN, PPh, BAST).
   - FORMAT TABEL HTML: Setiap kali menyajikan data tabular, perbandingan data, ringkasan pagu, daftar kegiatan, atau rincian pajak/belanja, Anda WAJIB menyajikannya dalam tabel HTML terstruktur rapi (gunakan tag <table>, <thead>, <tbody>, <tr>, <th>, <td>).
   - Format nominal uang selalu gunakan format Rupiah resmi (contoh: Rp 29.000.000) dan atur rata kanan (align="right" atau style="text-align: right;").
   - Jangan menyajikan data angka dalam baris teks panjang tanpa tabel jika ada 2 baris data atau lebih. Gunakan tabel HTML agar jelas bagi Bendahara.
2. PENCEGAHAN KODE, ID INTERNAL, & VARIABEL TEKNIS (ATURAN SANGAT KETAT):
   - JANGAN PERNAH menampilkan kode pemrograman (PHP, SQL, JavaScript, Python), blok kode, atau query database di dalam chat bubble.
   - JANGAN PERNAH menampilkan nama variabel internal atau kunci teknis sistem (seperti \$spent, \$rkas_id, rkas_id, kode_rekening_id, bkuDetailFk, found_count, filter_bulan, items, dsb.).
   - USER / BENDAHARA TIDAK BOLEH TAHU ATAU MELIHAT ID KEGIATAN DATABASE APAPUN:
     * DILARANG KERAS membuat kolom "ID Kegiatan" atau menampilkan ID angka database apapun di tabel atau teks.
     * Gunakan nomor urut biasa (1, 2, 3...) untuk kolom "No".
     * Gunakan "Sisa Anggaran" alih-alih "sisa_pagu" atau "\$remaining".
     * Gunakan "Realisasi Belanja" alih-alih "terealisasi" atau "\$spent".
     * Gunakan "Kode Rekening" dan "Nama Rekening" secara resmi.
   - JANGAN PERNAH menyalin atau mengulang nama variabel sistem seperti "found_count" atau "filter_bulan". Tuliskan informasi secara naratif dalam Bahasa Indonesia yang alami (contoh: "Berikut adalah daftar 54 kegiatan belanja pada bulan Maret:").
   - Dilarang keras menampilkan tanda dolar (\$) untuk nama variabel program.
3. PERTANYAAN REALISASI BKU VS PERENCANAAN RKAS (ATURAN SANGAT KETAT):
   - Jika pengguna menanyakan "Realisasi BKU", "Berapa realisasi belanja bulan X?", "Tampilkan belanja BKU bulan X", atau daftar kuitansi yang dibukukan:
     a. WAJIB memanggil tool `get_bku_monthly_realization` dengan parameter `bulan` yang diminta (contoh: bulan: "Maret").
     b. JANGAN memanggil `search_rkas_activity` untuk menjawab realisasi belanja kas BKU! Realisasi kas riil sekolah tercatat resmi di Buku Kas Umum (BKU), bukan di dokumen perencanaan RKAS.
     c. Tampilkan ringkasan eksekutif di atas tabel:
        - Total Realisasi Belanja BKU Bulan Ini (format Rp, contoh: Rp 8.348.000)
        - Total Belanja Kumulatif s.d. Bulan Ini (format Rp)
        - Jumlah Transaksi Kuitansi Belanja
     d. Sajikan seluruh transaksi kuitansi belanja dalam tabel HTML terstruktur rapi dengan kolom WAJIB:
        <th>No</th><th>Tanggal Transaksi</th><th>No. Bukti / Nota</th><th>Uraian Belanja BKU</th><th>Rekanan / Toko</th><th>Rekening Belanja</th><th>Nominal Belanja (Rp)</th>
   - Jika pengguna menanyakan "Berapa pagu anggaran saya?", "Berapa total dana BOSP tahun ini?", atau ringkasan penetapan anggaran:
     a. Panggil tool `get_budget_pagu_summary`.
     b. JANGAN memanggil `query_realization_comparison` kecuali pengguna secara eksplisit meminta data realisasi antar triwulan.
     c. Sajikan tabel HTML ringkas: Pagu Total Penetapan, Penerimaan Tahap 1 & 2, serta Alokasi Rencana Belanja per Kelompok.
   - Jika pengguna menanyakan performa belanja, grafik serapan triwulan atau kelompok belanja:
     a. Panggil tool `query_realization_comparison`.
4. PENCARIAN RENCANA KEGIATAN RKAS:
   - Jika pengguna menanyakan rencana kegiatan atau alokasi anggaran di dokumen perencanaan RKAS (contoh: "Apa saja rencana anggaran di RKAS bulan Maret?", "Cari kegiatan sarpras di RKAS", "Tampilkan RKAS bulan Januari"):
     a. Panggil tool `search_rkas_activity` dengan parameter `bulan` atau `query`.
     b. Tampilkan seluruh baris kegiatan dalam tabel HTML terstruktur rapi dengan kolom WAJIB:
        <th>No</th><th>Bulan</th><th>Uraian Kegiatan / Barang</th><th>Kode Rekening</th><th>Nama Rekening</th><th>Total Anggaran</th><th>Realisasi Bulan Ini</th><th>Sisa Anggaran</th><th>Status Realisasi BKU</th>
     c. DILARANG KERAS membuat kolom "ID Kegiatan" atau menampilkan angka ID database apapun di tabel. Cukup gunakan nomor urut urutan baris (1, 2, 3...) di kolom "No".
     d. Berikan Catatan Naratif Analisis Penatausahaan BKU:
        - Jika pengguna menanyakan data RKAS bulan tertentu di mana kas belum keluar (contoh: bulan Januari dengan Realisasi Bulan Ini = Rp 0), jelaskan secara ramah dan profesional bahwa pada bulan tersebut kas belum dibelanjakan (Realisasi Rp 0), namun sistem mendeteksi bahwa kegiatan tersebut telah direalisasikan pada bulan berikutnya (merujuk pada kolom `Status Realisasi BKU`, contoh: Honorarium pengajar baru dibayarkan pada BKU bulan Maret 2026), serta sebutkan kegiatan mana saja yang masih berstatus Belum Direalisasikan.
5. DRAFTING TRANSAKSI BKU:
   - Jika pengguna meminta mencatat belanja atau kuitansi (contoh: "Catat belanja ATK...", "Bayar katering..."):
     a. Panggil tool `search_rkas_activity` untuk mencari rincian kegiatan dan akun rekening yang relevan di RKAS {$tahun}.
     b. Panggil tool `calculate_tax_recommendation` untuk menghitung pajak resmi yang berlaku.
     c. Panggil tool `prepare_bku_transaction_draft` untuk menghasilkan Draf Staging Card transaksi.
     d. Beri tahu bendahara bahwa Anda telah menyiapkan Draf Kartu Transaksi di layar, dan mintalah mereka menekan tombol konfirmasi untuk menyimpannya ke BKU.
6. Jangan pernah mengarang kode rekening atau ID kegiatan secara sembarangan, selalu gunakan hasil dari tool.
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
        return match ($name) {
            'get_budget_pagu_summary' => $this->getBudgetPaguSummary($tahun, $variant),
            'get_bku_monthly_realization' => $this->getBkuMonthlyRealization($tahun, $args['bulan'] ?? 'Maret', $variant),
            'search_rkas_activity' => $this->searchRkasActivity($tahun, $args['query'] ?? '', $variant, $args['bulan'] ?? null),
            'calculate_tax_recommendation' => $this->calculateTaxRecommendation(
                (float) ($args['amount'] ?? 0),
                $args['item_type'] ?? 'barang',
                (bool) ($args['is_pkp'] ?? true),
                (bool) ($args['has_npwp'] ?? true)
            ),
            'prepare_bku_transaction_draft' => $this->prepareBkuDraft($args, $variant, $tahun),
            'query_realization_comparison' => $this->queryRealizationComparison($tahun, $variant, $args['group_by'] ?? 'triwulan'),
            default => ['error' => "Unknown tool: {$name}"],
        };
    }

    /**
     * Tool: Ringkasan resmi Pagu Anggaran BOSP tahun aktif (penetapan, penerimaan, dan RKAS)
     */
    protected function getBudgetPaguSummary(int $tahun, string $variant): array
    {
        $penganggaranClass = VariantConfig::getModelClass('penganggaran', $variant);
        $penerimaanClass = VariantConfig::getModelClass('penerimaan_dana', $variant);
        $rkasClass = VariantConfig::getModelClass('rkas', $variant);
        $penganggaranFk = VariantConfig::penganggaranFk($variant);

        $penganggaran = $penganggaranClass::where('tahun_anggaran', $tahun)->first();
        if (! $penganggaran) {
            return [
                'error' => "Data penganggaran untuk tahun {$tahun} ({$variant}) belum ditemukan.",
            ];
        }

        $paguAnggaran = (float) ($penganggaran->pagu_anggaran ?? 0);

        // Penerimaan per tahap
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

        // Hitung rincian rencana belanja RKAS per kelompok rekening
        $rkasItems = $rkasClass::with('rekeningBelanja')
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
            'pagu_total_penetapan' => $paguAnggaran > 0 ? $paguAnggaran : $totalRencanaRkas,
            'total_rencana_rkas' => $totalRencanaRkas,
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
     * Tool: Pencarian kegiatan dan sisa pagu RKAS dengan filter kata kunci dan alokasi bulan
     */
    protected function searchRkasActivity(int $tahun, ?string $query, string $variant, ?string $bulan = null): array
    {
        $penganggaranClass = VariantConfig::getModelClass('penganggaran', $variant);
        $rkasClass = VariantConfig::getModelClass('rkas', $variant);
        $bkuDetailClass = VariantConfig::getModelClass('bku_uraian_detail', $variant);
        $bkuDetailFk = VariantConfig::uraianDetailRkasFk($variant);

        $penganggaran = $penganggaranClass::where('tahun_anggaran', $tahun)->first();
        if (! $penganggaran) {
            return ['error' => 'Data penganggaran tidak ditemukan'];
        }

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

        $builder = $rkasClass::with(['kodeKegiatan', 'rekeningBelanja'])
            ->where(VariantConfig::penganggaranFk($variant), (int) $penganggaran->id);

        if ($targetMonth) {
            $builder->where('bulan', $targetMonth);
        }

        if (! empty($queryClean)) {
            // Escape wildcard SQL (% dan _) untuk mencegah manipulasi query pattern
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

        // Ambil seluruh data kegiatan (hingga 250 baris agar seluruh kegiatan bulan bersangkutan tampil penuh)
        $limit = $targetMonth ? 250 : 30;
        $items = $builder->take($limit)->get();

        $itemIds = $items->pluck('id')->all();
        $allBkuDetails = empty($itemIds) ? collect() : $bkuDetailClass::whereIn($bkuDetailFk, $itemIds)
            ->whereHas('bukuKasUmum', function ($bq) use ($penganggaran, $tahun, $variant) {
                $bq->where(VariantConfig::penganggaranFk($variant), (int) $penganggaran->id)
                    ->where('is_bunga_record', false)
                    ->whereYear('tanggal_transaksi', $tahun);
            })
            ->with(['bukuKasUmum' => function ($bq) {
                $bq->select('id', 'tanggal_transaksi', 'nomor_nota', 'id_transaksi');
            }])
            ->get()
            ->groupBy($bkuDetailFk);

        $monthNames = [
            1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
            5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
            9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember',
        ];

        $results = [];
        foreach ($items as $item) {
            $budget = (float) $item->harga_satuan * (float) $item->jumlah;
            $details = $allBkuDetails->get($item->id, collect());

            // 1. Realisasi s.d. periode bulan yang diminta (jika ada filter bulan) dan tahun aktif
            $filteredDetails = $details->filter(function ($d) use ($targetMonthIndex) {
                if (! $targetMonthIndex) {
                    return true;
                }
                if (! $d->bukuKasUmum?->tanggal_transaksi) {
                    return false;
                }
                $m = (int) Carbon::parse($d->bukuKasUmum->tanggal_transaksi)->format('n');

                return $m <= $targetMonthIndex;
            });

            $rawSpent = (float) $filteredDetails->sum('jumlah');

            // Audit capping: realisasi untuk baris kegiatan ini tidak boleh melampaui pagu anggarannya
            $spent = min($budget, $rawSpent);
            $remaining = max(0, $budget - $spent);

            // 2. Deteksi bulan realisasi riil pada BKU sepanjang tahun
            $totalRealizedAllYear = min($budget, (float) $details->sum('jumlah'));

            if ($details->isEmpty() || $totalRealizedAllYear <= 0) {
                $statusRealisasi = 'Belum Direalisasikan';
                $bulanRealisasiRiil = 'Belum Realisasi';
            } else {
                $firstMonth = null;
                $sortedDetails = $details->sortBy(function ($d) {
                    return $d->bukuKasUmum?->tanggal_transaksi ?? '9999-99-99';
                });

                foreach ($sortedDetails as $d) {
                    if ($d->bukuKasUmum?->tanggal_transaksi) {
                        $m = (int) Carbon::parse($d->bukuKasUmum->tanggal_transaksi)->format('n');
                        if (isset($monthNames[$m])) {
                            $firstMonth = $monthNames[$m];
                            break;
                        }
                    }
                }

                $bulanRealisasiRiil = $firstMonth ?: 'Belum Realisasi';

                if ($firstMonth && $firstMonth === $item->bulan) {
                    $statusRealisasi = "Sesuai Jadwal ({$firstMonth} {$tahun})";
                } elseif ($firstMonth) {
                    $statusRealisasi = "Direalisasikan pd {$firstMonth} {$tahun} (Rp ".number_format($totalRealizedAllYear, 0, ',', '.').')';
                } else {
                    $statusRealisasi = 'Belum Direalisasikan';
                }
            }

            $results[] = [
                'rkas_id' => (int) $item->id, // Disimpan internal untuk kebutuhan drafting transaksi BKU
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
        $rkasClass = VariantConfig::getModelClass('rkas', $variant);
        $rkas = $rkasClass::with(['kodeKegiatan', 'rekeningBelanja'])->find($params['rkas_id']);

        if (! $rkas) {
            return ['error' => 'Data RKAS tidak ditemukan.'];
        }

        $amount = (float) ($params['nominal'] ?? 0);
        $pajakInfo = $params['pajak_info'] ?? [];
        $totalPajak = (float) ($pajakInfo['total_pajak'] ?? 0);

        // Periksa sisa pagu
        $budget = (float) $rkas->harga_satuan * (float) $rkas->jumlah;
        $bkuDetailFk = VariantConfig::uraianDetailRkasFk($variant);
        $bkuDetailClass = VariantConfig::getModelClass('bku_uraian_detail', $variant);
        $rawSpent = (float) $bkuDetailClass::where($bkuDetailFk, $rkas->id)->sum('jumlah');
        $spent = min($budget, $rawSpent);
        $remainingBefore = max(0, $budget - $spent);
        $remainingAfter = $remainingBefore - $amount;

        $stagingCard = [
            'type' => 'bku_transaction_draft',
            'variant' => $variant,
            'tahun' => $tahun,
            'tanggal' => $params['tanggal'] ?? now()->format('Y-m-d'),
            'jenis_transaksi' => $params['jenis_transaksi'] ?? 'tunai',
            'rkas_id' => $rkas->id,
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
        $rkasFk = VariantConfig::uraianDetailRkasFk($variant);

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
