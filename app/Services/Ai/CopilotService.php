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
                    'name' => 'search_rkas_activity',
                    'description' => 'Mencari rincian kegiatan dan akun belanja pada RKAS tahun anggaran aktif beserta sisa pagunya.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'query' => [
                                'type' => 'string',
                                'description' => 'Kata kunci nama kegiatan, jenis belanja, atau uraian barang (misal: ATK, asesmen, konsumsi, pemeliharaan).',
                            ],
                        ],
                        'required' => ['query'],
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
        $sekolah = SekolahProfile::first();
        $sekolahNama = $sekolah?->nama_sekolah ?? 'Satuan Pendidikan';
        $variantTitle = VariantConfig::title($variant);

        $systemPrompt = <<<PROMPT
Anda adalah "SIKAS AI Copilot", asisten keuangan cerdas, sopan, dan sangat teliti untuk Bendahara dan Kepala Sekolah di {$sekolahNama}.
Aplikasi saat ini mengelola dana BOSP {$variantTitle} Tahun Anggaran {$tahun}.

Karakter & Pedoman Kerja Anda:
1. BAHASA: Gunakan Bahasa Indonesia yang ramah, profesional, dan akrab dengan istilah penatausahaan dana BOSP (seperti RKAS, BKU, NTPN, Rekening Belanja, PPN, PPh, BAST).
2. DRAFTING TRANSAKSI:
   - Jika pengguna meminta mencatat belanja atau kuitansi (contoh: "Catat belanja ATK...", "Bayar katering..."):
     a. Panggil tool `search_rkas_activity` untuk mencari rincian kegiatan dan akun rekening yang relevan di RKAS {$tahun}.
     b. Panggil tool `calculate_tax_recommendation` untuk menghitung pajak resmi yang berlaku.
     c. Panggil tool `prepare_bku_transaction_draft` untuk menghasilkan Draf Staging Card transaksi.
     d. Beri tahu bendahara bahwa Anda telah menyiapkan Draf Kartu Transaksi di layar, dan mintalah mereka menekan tombol konfirmasi untuk menyimpannya ke BKU.
3. ANALITIK & PERTANYAAN KEUANGAN:
   - Jika pengguna menanyakan performa belanja, sisa pagu, atau perbandingan serapan (contoh: "Berapa sisa pagu sarpras?", "Bandingkan serapan triwulan 1 vs 2"):
     a. Panggil tool `query_realization_comparison` atau `search_rkas_activity`.
     b. Berikan ulasan eksekutif yang tajam, menyebutkan angka nominal dengan format rupiah (Rp), dan berikan rekomendasi serapan.
4. Jangan pernah mengarang kode rekening atau RKAS ID secara sembarangan, selalu gunakan hasil dari tool.
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

            if (!$response['success']) {
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
                    'content' => $response['content'] ?? '',
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
            'content' => $conversation[count($conversation) - 1]['content'] ?? 'Selesai memproses instruksi Anda.',
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
            'search_rkas_activity' => $this->searchRkasActivity($tahun, $args['query'] ?? '', $variant),
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
     * Tool: Pencarian kegiatan dan sisa pagu RKAS
     */
    protected function searchRkasActivity(int $tahun, string $query, string $variant): array
    {
        $penganggaranClass = VariantConfig::getModelClass('penganggaran', $variant);
        $rkasClass = VariantConfig::getModelClass('rkas', $variant);
        $bkuClass = VariantConfig::getModelClass('bku', $variant);
        $bkuDetailFk = VariantConfig::uraianDetailRkasFk($variant);

        $penganggaran = $penganggaranClass::where('tahun_anggaran', $tahun)->first();
        if (!$penganggaran) {
            return ['error' => 'Data penganggaran tidak ditemukan'];
        }

        $queryClean = strtolower(trim($query));

        $items = $rkasClass::with(['kodeKegiatan', 'rekeningBelanja'])
            ->where(VariantConfig::penganggaranFk($variant), $penganggaran->id)
            ->where(function ($q) use ($queryClean) {
                $q->whereRaw('LOWER(uraian) LIKE ?', ["%{$queryClean}%"])
                  ->orWhereHas('kodeKegiatan', function ($kq) use ($queryClean) {
                      $kq->whereRaw('LOWER(uraian) LIKE ?', ["%{$queryClean}%"])
                         ->orWhereRaw('LOWER(sub_program) LIKE ?', ["%{$queryClean}%"]);
                  })
                  ->orWhereHas('rekeningBelanja', function ($rq) use ($queryClean) {
                      $rq->whereRaw('LOWER(rincian_objek) LIKE ?', ["%{$queryClean}%"]);
                  });
            })
            ->take(8)
            ->get();

        $results = [];
        foreach ($items as $item) {
            $budget = (float) $item->harga_satuan * (float) $item->jumlah;
            
            // Hitung realisasi belanja yang telah dibukukan untuk RKAS ID ini
            $spent = (float) DB::table(VariantConfig::getModelClass('bku_uraian_detail', $variant)->getTable())
                ->where($bkuDetailFk, $item->id)
                ->sum('jumlah');

            $remaining = max(0, $budget - $spent);

            $results[] = [
                'rkas_id' => $item->id,
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
            ];
        }

        return [
            'found_count' => count($results),
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

        if (!$rkas) {
            return ['error' => 'Data RKAS tidak ditemukan.'];
        }

        $amount = (float) ($params['nominal'] ?? 0);
        $pajakInfo = $params['pajak_info'] ?? [];
        $totalPajak = (float) ($pajakInfo['total_pajak'] ?? 0);

        // Periksa sisa pagu
        $budget = (float) $rkas->harga_satuan * (float) $rkas->jumlah;
        $bkuDetailFk = VariantConfig::uraianDetailRkasFk($variant);
        $spent = (float) DB::table(VariantConfig::getModelClass('bku_uraian_detail', $variant)->getTable())
            ->where($bkuDetailFk, $rkas->id)
            ->sum('jumlah');
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
        if (!$penganggaran) {
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
                    'triwulan_tertinggi' => 'Triwulan ' . (array_search(max($q1, $q2, $q3, $q4), [$q1, $q2, $q3, $q4]) + 1),
                ],
            ];

            return [
                'group_by' => 'triwulan',
                'chart_data' => $chartData,
            ];
        }

        // Default: Kategori Belanja (Barang Jasa vs Modal)
        $barangJasa = (float) $bkuClass::where($bkuFk, $penganggaran->id)
            ->whereHas('rekeningBelanja', fn($q) => $q->where('kode_rekening', 'like', '5.1.02%'))
            ->sum('dibelanjakan');

        $modal = (float) $bkuClass::where($bkuFk, $penganggaran->id)
            ->whereHas('rekeningBelanja', fn($q) => $q->where('kode_rekening', 'like', '5.2%'))
            ->sum('dibelanjakan');

        $pegawai = (float) $bkuClass::where($bkuFk, $penganggaran->id)
            ->whereHas('rekeningBelanja', fn($q) => $q->where('kode_rekening', 'like', '5.1.01%'))
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
        if (!$penganggaran) {
            return ['success' => false, 'message' => 'Penganggaran tahun aktif tidak ditemukan.'];
        }

        $bkuFk = VariantConfig::penganggaranFk($variant);
        $rkasFk = VariantConfig::uraianDetailRkasFk($variant);

        try {
            return DB::transaction(function () use ($variant, $penganggaran, $bkuClass, $bkuDetailClass, $bkuFk, $rkasFk, $payload) {
                $amount = (float) ($payload['nominal'] ?? 0);
                $totalPajak = (float) ($payload['total_pajak'] ?? 0);

                // Buat entri BKU Utama
                $bku = new $bkuClass();
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
                $detail = new $bkuDetailClass();
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
            Log::error('Commit BKU Transaction failed: ' . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Gagal menyimpan transaksi: ' . $e->getMessage(),
            ];
        }
    }
}
