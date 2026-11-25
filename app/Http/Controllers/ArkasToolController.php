<?php

namespace App\Http\Controllers;

use App\Models\RefBarang;
use App\Models\RefPtk;
use App\Services\ArkasEngineService;
use App\Services\RefPtkService;
use App\Services\RefSatuanService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class ArkasToolController extends Controller
{
    /**
     * Halaman Utama Arkas Tools
     * Langsung memuat data awal (auto-load) dari database lokal PostgreSQL dengan paginasi
     */
    public function index(Request $request)
    {
        $perPage = (int) $request->input('per_page', 50);
        if ($perPage <= 0 || $perPage > 200) {
            $perPage = 50;
        }

        $localCount = RefBarang::count();
        $yearsCount = RefBarang::query()
            ->select('tahun', DB::raw('count(*) as total'))
            ->groupBy('tahun')
            ->orderBy('tahun', 'desc')
            ->pluck('total', 'tahun')
            ->toArray();

        $arkasYears = $this->detectArkasYears();
        $localYears = array_map('strval', array_keys($yearsCount));

        $activeYears = array_values(array_filter(
            array_unique(array_merge($arkasYears, $localYears)),
            fn ($y) => preg_match('/^\d{4}$/', (string) $y) === 1
        ));

        usort($activeYears, fn ($a, $b) => (int) $b <=> (int) $a);

        if (empty($activeYears)) {
            $activeYears = [(string) date('Y')];
        }

        $year = $request->filled('year')
            ? (string) $request->input('year')
            : $activeYears[0];

        // Query data awal untuk tahun aktif (default 2026)
        $query = RefBarang::query();
        if ($year && strtoupper($year) !== 'ALL') {
            $query->where('tahun', (int) $year);
        }

        $paginated = $query->orderBy('nama_barang')
            ->orderBy('tahun')
            ->paginate($perPage)
            ->withQueryString();

        // Transform item agar menyertakan status 'Sudah Ada' & flag kedaluwarsa
        $paginated->getCollection()->transform(function ($item) {
            return [
                'id_barang' => $item->id_barang,
                'nama_barang' => $item->nama_barang,
                'kode_rekening' => $item->kode_rekening,
                'rekening' => $item->rekening,
                'satuan' => $item->satuan,
                'blok_id' => $item->blok_id,
                'kode_belanja' => $item->kode_belanja,
                'is_expired' => (bool) $item->is_expired,
                'batas_atas' => (float) $item->batas_atas,
                'tahun' => (int) $item->tahun,
                'status' => 'Sudah Ada',
            ];
        });

        return Inertia::render('ArkasTools/Index', [
            'initialData' => $paginated,
            'defaultYear' => $year,
            'activeYears' => $activeYears,
            'localStats' => [
                'total' => $localCount,
                'perYear' => $yearsCount,
            ],
        ]);
    }

    /**
     * Pencarian cepat & paginasi di database lokal PostgreSQL SIKAS
     */
    public function search(Request $request)
    {
        $keyword = trim($request->input('keyword', ''));
        $year = $request->input('year', '2026');
        $isExport = $request->boolean('export', false);
        $perPage = (int) $request->input('per_page', 50);
        if ($perPage <= 0 || $perPage > 200) {
            $perPage = 50;
        }

        $query = RefBarang::query();

        if ($year && strtoupper($year) !== 'ALL') {
            $query->where('tahun', (int) $year);
        }

        if ($keyword !== '' && $keyword !== '__ALL__') {
            $operator = DB::connection()->getDriverName() === 'pgsql' ? 'ILIKE' : 'LIKE';
            $query->where('nama_barang', $operator, "%{$keyword}%");
        }

        $totalLocal = RefBarang::count();

        // Jika request khusus export, kembalikan seluruh data tanpa limit
        if ($isExport) {
            $results = $query->orderBy('nama_barang')
                ->orderBy('tahun')
                ->get();

            $data = $results->map(function ($item) {
                return [
                    'id_barang' => $item->id_barang,
                    'nama_barang' => $item->nama_barang,
                    'kode_rekening' => $item->kode_rekening,
                    'rekening' => $item->rekening,
                    'satuan' => $item->satuan,
                    'blok_id' => $item->blok_id,
                    'kode_belanja' => $item->kode_belanja,
                    'is_expired' => (bool) $item->is_expired,
                    'batas_atas' => (float) $item->batas_atas,
                    'tahun' => (int) $item->tahun,
                    'status' => 'Sudah Ada',
                ];
            });

            return response()->json([
                'status' => 'success',
                'data' => $data,
            ]);
        }

        // Paginasi standar
        $page = (int) $request->input('page', 1);
        $paginated = $query->orderBy('nama_barang')
            ->orderBy('tahun')
            ->paginate($perPage, ['*'], 'page', $page);

        $transformedData = $paginated->getCollection()->map(function ($item) {
            return [
                'id_barang' => $item->id_barang,
                'nama_barang' => $item->nama_barang,
                'kode_rekening' => $item->kode_rekening,
                'rekening' => $item->rekening,
                'satuan' => $item->satuan,
                'blok_id' => $item->blok_id,
                'kode_belanja' => $item->kode_belanja,
                'is_expired' => (bool) $item->is_expired,
                'batas_atas' => (float) $item->batas_atas,
                'tahun' => (int) $item->tahun,
                'status' => 'Sudah Ada',
            ];
        });

        return response()->json([
            'status' => 'success',
            'data' => $transformedData,
            'current_page' => $paginated->currentPage(),
            'last_page' => $paginated->lastPage(),
            'per_page' => $paginated->perPage(),
            'total' => $paginated->total(),
            'from' => $paginated->firstItem(),
            'to' => $paginated->lastItem(),
            'source' => 'local_database',
            'total_db' => $totalLocal,
            'is_empty_db' => ($totalLocal === 0),
        ]);
    }

    /**
     * Pencarian katalog Uraian Arkas berdasarkan tahun anggaran, kode kegiatan, & kode rekening untuk form RKAS / RKAS Perubahan.
     * Otomatis beralih ke daftar PTK (Guru/Tendik) untuk kombinasi kegiatan 07.12.* + rekening honor PTK, dengan switch cepat ke Katalog SSH.
     */
    public function byRekening(Request $request)
    {
        $year = (int) $request->input('year', date('Y'));
        $kodeKegiatan = trim((string) $request->input('kode_kegiatan', ''));
        $kodeRekening = trim((string) $request->input('kode_rekening', ''));
        $keyword = trim((string) $request->input('keyword', ''));
        $idBarang = trim((string) $request->input('id_barang', ''));
        $uraianArkas = trim((string) $request->input('uraian_arkas', ''));
        $source = strtolower(trim((string) $request->input('source', 'auto')));
        $includeAllPtk = $request->boolean('include_all_ptk', false);

        if (! in_array($source, ['auto', 'ptk', 'ssh'], true)) {
            $source = 'auto';
        }

        $yearSynced = RefBarang::where('tahun', $year)->exists();
        $ptkService = app(RefPtkService::class);
        $ptkContext = $ptkService->detectPtkContext($kodeKegiatan, $kodeRekening);
        $supportsPtk = $ptkContext['is_ptk'];
        $isHonorManual = $ptkContext['is_honor_manual'];

        if ($kodeRekening === '') {
            return response()->json([
                'status' => 'success',
                'year' => $year,
                'kode_kegiatan' => $kodeKegiatan,
                'kode_rekening' => $kodeRekening,
                'year_synced' => $yearSynced,
                'catalog_mode' => 'ssh',
                'is_honor_manual' => $isHonorManual,
                'supports_ptk' => false,
                'ptk_role_filter' => null,
                'ptk_synced_year' => false,
                'ptk_count' => 0,
                'ptk_total_honorer' => 0,
                'ssh_count' => 0,
                'has_ssh_fallback' => false,
                'has_rekening_catalog' => false,
                'total_rekening_items' => 0,
                'data' => [],
                'ptk_items' => [],
                'selected_item' => null,
                'selected_ptk' => null,
            ]);
        }

        // Kegiatan 07.12.02. - 07.12.04. di ARKAS Desktop menggunakan ketik manual bebas (tanpa dropdown PTK / SSH)
        if ($isHonorManual) {
            return response()->json([
                'status' => 'success',
                'year' => $year,
                'kode_kegiatan' => $kodeKegiatan,
                'kode_rekening' => $kodeRekening,
                'year_synced' => $yearSynced,
                'catalog_mode' => 'manual',
                'is_honor_manual' => true,
                'is_buku_catalog' => false,
                'supports_ptk' => false,
                'ptk_role_filter' => null,
                'ptk_synced_year' => false,
                'ptk_count' => 0,
                'ptk_total_honorer' => 0,
                'ssh_count' => 0,
                'has_ssh_fallback' => false,
                'has_rekening_catalog' => false,
                'total_rekening_items' => 0,
                'data' => [],
                'ptk_items' => [],
                'selected_item' => null,
                'selected_ptk' => null,
            ]);
        }

        $isBukuCatalog = RefBarang::isBukuRekening($kodeRekening);
        $sshBaseQuery = RefBarang::forRekeningCatalog($year, $kodeRekening, onlyActive: true);
        $sshCount = $yearSynced ? (clone $sshBaseQuery)->count() : 0;

        $ptkYearExists = RefPtk::forYear($year)->exists();
        $ptkHonorerBase = RefPtk::forYear($year)->honorEligible();
        $ptkTotalHonorer = (clone $ptkHonorerBase)->count();
        $preferredJenis = $ptkContext['preferred_jenis'];

        $ptkFilteredBase = clone $ptkHonorerBase;
        if ($supportsPtk && ! $includeAllPtk && $preferredJenis !== null) {
            $ptkFilteredBase->where('jenis_ptk_arkas', $preferredJenis);
        }
        $ptkCount = $supportsPtk ? (clone $ptkFilteredBase)->count() : 0;

        // Untuk 07.12.01. + 5.1.02.02.01.0013, ARKAS Desktop HANYA menampilkan daftar PTK Guru (tanpa switch SSH)
        if ($supportsPtk) {
            $ptkQuery = clone $ptkFilteredBase;
            if ($keyword !== '') {
                $operator = DB::connection()->getDriverName() === 'pgsql' ? 'ILIKE' : 'LIKE';
                $ptkQuery->where(function ($q) use ($operator, $keyword) {
                    $q->where('nama', $operator, "%{$keyword}%")
                        ->orWhere('nuptk', $operator, "%{$keyword}%");
                });
            }

            $ptkItems = $ptkQuery
                ->orderBy('nama')
                ->orderBy('nuptk')
                ->limit(150)
                ->get()
                ->map(static fn (RefPtk $ptk) => [
                    'id' => $ptk->id,
                    'ptk_id' => $ptk->ptk_id,
                    'nuptk' => $ptk->nuptk,
                    'nama' => $ptk->nama,
                    'jenis_ptk_arkas' => $ptk->jenis_ptk_arkas,
                    'jenis_label' => $ptk->jenis_label,
                    'formatted_uraian' => $ptk->formatted_uraian_arkas,
                    'sumber' => $ptk->sumber,
                ])
                ->values();

            $selectedPtk = null;
            if ($uraianArkas !== '') {
                $needle = mb_strtolower($uraianArkas);
                $matched = $ptkItems->first(function (array $row) use ($needle) {
                    return mb_strtolower($row['formatted_uraian']) === $needle
                        || mb_strtolower($row['nama']) === $needle;
                });
                $selectedPtk = $matched ?: null;
            }

            return response()->json([
                'status' => 'success',
                'year' => $year,
                'kode_kegiatan' => $kodeKegiatan,
                'kode_rekening' => $kodeRekening,
                'year_synced' => $yearSynced,
                'catalog_mode' => 'ptk',
                'is_honor_manual' => false,
                'is_buku_catalog' => false,
                'supports_ptk' => true,
                'ptk_role_filter' => 'guru',
                'ptk_synced_year' => $ptkYearExists,
                'ptk_count' => $ptkCount,
                'ptk_total_honorer' => $ptkTotalHonorer,
                'ssh_count' => 0,
                'has_ssh_fallback' => false,
                'has_rekening_catalog' => true,
                'total_rekening_items' => $ptkCount,
                'data' => [],
                'ptk_items' => $ptkItems,
                'selected_item' => null,
                'selected_ptk' => $selectedPtk,
            ]);
        }

        if (! $yearSynced) {
            return response()->json([
                'status' => 'success',
                'year' => $year,
                'kode_kegiatan' => $kodeKegiatan,
                'kode_rekening' => $kodeRekening,
                'year_synced' => false,
                'catalog_mode' => 'ssh',
                'is_buku_catalog' => $isBukuCatalog,
                'supports_ptk' => $supportsPtk,
                'ptk_role_filter' => $ptkContext['role_filter'],
                'ptk_synced_year' => $ptkYearExists,
                'ptk_count' => $ptkCount,
                'ptk_total_honorer' => $ptkTotalHonorer,
                'ssh_count' => 0,
                'has_ssh_fallback' => false,
                'has_rekening_catalog' => false,
                'total_rekening_items' => 0,
                'data' => [],
                'ptk_items' => [],
                'selected_item' => null,
                'selected_ptk' => null,
            ]);
        }

        $totalRekeningItems = $sshCount;
        $hasRekeningCatalog = $totalRekeningItems > 0;

        if (! $hasRekeningCatalog) {
            return response()->json([
                'status' => 'success',
                'year' => $year,
                'kode_kegiatan' => $kodeKegiatan,
                'kode_rekening' => $kodeRekening,
                'year_synced' => true,
                'catalog_mode' => 'ssh',
                'is_buku_catalog' => $isBukuCatalog,
                'supports_ptk' => $supportsPtk,
                'ptk_role_filter' => $ptkContext['role_filter'],
                'ptk_synced_year' => $ptkYearExists,
                'ptk_count' => $ptkCount,
                'ptk_total_honorer' => $ptkTotalHonorer,
                'ssh_count' => 0,
                'has_ssh_fallback' => false,
                'has_rekening_catalog' => false,
                'total_rekening_items' => 0,
                'data' => [],
                'ptk_items' => [],
                'selected_item' => null,
                'selected_ptk' => null,
            ]);
        }

        $itemsQuery = clone $sshBaseQuery;
        if ($keyword !== '') {
            $operator = DB::connection()->getDriverName() === 'pgsql' ? 'ILIKE' : 'LIKE';
            $itemsQuery->where(function ($q) use ($operator, $keyword) {
                $q->where('nama_barang', $operator, "%{$keyword}%")
                    ->orWhere('id_barang', $operator, "%{$keyword}%");
            });
        }

        $items = $itemsQuery->orderBy('nama_barang')
            ->orderBy('id_barang')
            ->limit(150)
            ->get()
            ->map(fn ($item) => [
                'id_barang' => $item->id_barang,
                'nama_barang' => $item->nama_barang,
                'kode_rekening' => $item->kode_rekening,
                'rekening' => $item->rekening,
                'satuan' => $item->satuan,
                'blok_id' => $item->blok_id,
                'kode_belanja' => $item->kode_belanja,
                'batas_atas' => (float) $item->batas_atas,
                'tahun' => (int) $item->tahun,
            ])
            ->values();

        $selectedModel = null;
        if ($idBarang !== '') {
            $selectedModel = (clone $sshBaseQuery)->where('id_barang', $idBarang)->first();
        }
        if (! $selectedModel && $uraianArkas !== '') {
            $selectedModel = (clone $sshBaseQuery)
                ->whereRaw('LOWER(TRIM(nama_barang)) = LOWER(TRIM(?))', [$uraianArkas])
                ->first();
        }

        $selectedItem = $selectedModel ? [
            'id_barang' => $selectedModel->id_barang,
            'nama_barang' => $selectedModel->nama_barang,
            'kode_rekening' => $selectedModel->kode_rekening,
            'rekening' => $selectedModel->rekening,
            'satuan' => $selectedModel->satuan,
            'blok_id' => $selectedModel->blok_id,
            'kode_belanja' => $selectedModel->kode_belanja,
            'batas_atas' => (float) $selectedModel->batas_atas,
            'tahun' => (int) $selectedModel->tahun,
        ] : null;

        return response()->json([
            'status' => 'success',
            'year' => $year,
            'kode_kegiatan' => $kodeKegiatan,
            'kode_rekening' => $kodeRekening,
            'year_synced' => true,
            'catalog_mode' => 'ssh',
            'is_buku_catalog' => $isBukuCatalog,
            'supports_ptk' => $supportsPtk,
            'ptk_role_filter' => $ptkContext['role_filter'],
            'ptk_synced_year' => $ptkYearExists,
            'ptk_count' => $ptkCount,
            'ptk_total_honorer' => $ptkTotalHonorer,
            'ssh_count' => $sshCount,
            'has_ssh_fallback' => $sshCount > 0,
            'has_rekening_catalog' => true,
            'total_rekening_items' => $totalRekeningItems,
            'data' => $items,
            'ptk_items' => [],
            'selected_item' => $selectedItem,
            'selected_ptk' => null,
        ]);
    }

    /**
     * Menarik data langsung dari file SQLite arkas.db via Python
     * dan membandingkannya dengan database lokal untuk menentukan status
     */
    public function fetchArkas(Request $request)
    {
        $keyword = trim($request->input('keyword', '__ALL__'));
        $year = $request->input('year', 'ALL');

        if ($keyword !== '__ALL__' && strlen($keyword) < 3) {
            return response()->json(['status' => 'error', 'message' => 'Keyword minimal 3 karakter']);
        }

        $pythonResult = $this->runPythonQuery($keyword, $year);
        if (isset($pythonResult['error'])) {
            return response()->json(['status' => 'error', 'message' => $pythonResult['error']]);
        }

        $arkasData = $pythonResult['data'] ?? [];

        // Ambil data lokal untuk perbandingan status
        $localQuery = RefBarang::query();
        if ($year && strtoupper($year) !== 'ALL') {
            $localQuery->where('tahun', (int) $year);
        }

        // Ambil data referensi yang diperlukan saja untuk efisiensi memori
        $existingMap = [];
        $localQuery->select(['id_barang', 'tahun', 'nama_barang', 'kode_rekening', 'rekening', 'satuan', 'blok_id', 'kode_belanja', 'is_expired', 'batas_atas'])
            ->chunk(5000, function ($chunk) use (&$existingMap) {
                foreach ($chunk as $row) {
                    $key = $row->id_barang.'_'.$row->tahun;
                    $existingMap[$key] = [
                        'nama_barang' => $row->nama_barang,
                        'kode_rekening' => $row->kode_rekening ?? '',
                        'rekening' => $row->rekening ?? '',
                        'satuan' => $row->satuan ?? '',
                        'blok_id' => $row->blok_id ?? '',
                        'kode_belanja' => $row->kode_belanja ?? '',
                        'is_expired' => (bool) $row->is_expired,
                        'batas_atas' => (float) $row->batas_atas,
                    ];
                }
            });

        $countBaru = 0;
        $countUpdate = 0;
        $countAda = 0;

        $priorityData = [];
        $sampleData = [];

        foreach ($arkasData as &$item) {
            $key = $item['id_barang'].'_'.$item['tahun'];
            $itemBatasAtas = (float) ($item['batas_atas'] ?? 0);

            // Normalisasi nilai string untuk perbandingan presisi
            $arkasNama = trim((string) ($item['nama_barang'] ?? ''));
            $arkasKode = ($item['kode_rekening'] !== null && $item['kode_rekening'] !== '') ? trim((string) $item['kode_rekening']) : '';
            $arkasRek = ($item['rekening'] !== null && $item['rekening'] !== '') ? trim((string) $item['rekening']) : '';
            $arkasSat = ($item['satuan'] !== null && $item['satuan'] !== '') ? trim((string) $item['satuan']) : '';
            $arkasBlok = trim((string) ($item['blok_id'] ?? ''));
            $arkasKodeBelanja = trim((string) ($item['kode_belanja'] ?? ''));
            $arkasExpired = (bool) ($item['is_expired'] ?? false);

            if (! isset($existingMap[$key])) {
                $item['status'] = 'Data Baru';
                $countBaru++;
                $priorityData[] = $item;
            } else {
                $ex = $existingMap[$key];
                $lokalNama = trim((string) ($ex['nama_barang'] ?? ''));
                $lokalKode = trim((string) ($ex['kode_rekening'] ?? ''));
                $lokalRek = trim((string) ($ex['rekening'] ?? ''));
                $lokalSat = trim((string) ($ex['satuan'] ?? ''));
                $lokalBlok = trim((string) ($ex['blok_id'] ?? ''));
                $lokalKodeBelanja = trim((string) ($ex['kode_belanja'] ?? ''));
                $lokalExpired = (bool) ($ex['is_expired'] ?? false);
                $lokalBatas = (float) ($ex['batas_atas'] ?? 0);

                $isChanged = (
                    $lokalNama !== $arkasNama ||
                    $lokalKode !== $arkasKode ||
                    $lokalRek !== $arkasRek ||
                    $lokalSat !== $arkasSat ||
                    $lokalBlok !== $arkasBlok ||
                    $lokalKodeBelanja !== $arkasKodeBelanja ||
                    $lokalExpired !== $arkasExpired ||
                    abs($lokalBatas - $itemBatasAtas) > 0.01
                );

                if ($isChanged) {
                    $item['status'] = 'Perlu Update';
                    $countUpdate++;
                    $priorityData[] = $item;
                } else {
                    $item['status'] = 'Sudah Ada';
                    $countAda++;
                    if (count($sampleData) < 100) {
                        $sampleData[] = $item;
                    }
                }
            }
        }
        unset($item);

        // Gabungkan: jika ada data baru/update, kirimkan semuanya; jika tidak ada, kirim 100 sampel pertama
        $displayData = array_merge($priorityData, $sampleData);

        return response()->json([
            'status' => 'success',
            'data' => $displayData,
            'source' => 'arkas_engine',
            'summary' => [
                'total' => count($arkasData),
                'data_baru' => $countBaru,
                'perlu_update' => $countUpdate,
                'sudah_ada' => $countAda,
            ],
            'can_sync' => ($countBaru > 0 || $countUpdate > 0),
        ]);
    }

    /**
     * Menyinkronkan data ARKAS ke tabel database lokal ref_barangs
     */
    public function sync(Request $request)
    {
        // Default sync mengambil tahun yang diminta atau seluruh tahun
        $year = $request->input('year', 'ALL');

        // Tarik seluruh data dari ARKAS
        $pythonResult = $this->runPythonQuery('__ALL__', $year);
        if (isset($pythonResult['error'])) {
            return response()->json(['status' => 'error', 'message' => $pythonResult['error']]);
        }

        $arkasData = $pythonResult['data'] ?? [];
        if (empty($arkasData)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Tidak ada data barang yang ditemukan di database ARKAS.',
            ]);
        }

        // Ambil existing map untuk menghitung berapa yang baru vs update
        $existingMap = [];
        $localQuery = RefBarang::query();
        if ($year && strtoupper($year) !== 'ALL') {
            $localQuery->where('tahun', (int) $year);
        }

        $localQuery->select(['id_barang', 'tahun', 'nama_barang', 'kode_rekening', 'rekening', 'satuan', 'blok_id', 'kode_belanja', 'is_expired', 'batas_atas'])
            ->chunk(5000, function ($chunk) use (&$existingMap) {
                foreach ($chunk as $row) {
                    $key = $row->id_barang.'_'.$row->tahun;
                    $existingMap[$key] = [
                        'nama_barang' => $row->nama_barang,
                        'kode_rekening' => $row->kode_rekening ?? '',
                        'rekening' => $row->rekening ?? '',
                        'satuan' => $row->satuan ?? '',
                        'blok_id' => $row->blok_id ?? '',
                        'kode_belanja' => $row->kode_belanja ?? '',
                        'is_expired' => (bool) $row->is_expired,
                        'batas_atas' => (float) $row->batas_atas,
                    ];
                }
            });

        $now = now();
        $recordsToUpsert = [];
        $syncedNewCount = 0;
        $syncedUpdatedCount = 0;

        foreach ($arkasData as $item) {
            $key = $item['id_barang'].'_'.$item['tahun'];
            $itemBatasAtas = (float) ($item['batas_atas'] ?? 0);

            // Perbaiki penanganan string non-null termasuk "0"
            $satuanVal = ($item['satuan'] !== null && $item['satuan'] !== '') ? (string) $item['satuan'] : null;
            $kodeRekVal = ($item['kode_rekening'] !== null && $item['kode_rekening'] !== '') ? (string) $item['kode_rekening'] : null;
            $rekeningVal = ($item['rekening'] !== null && $item['rekening'] !== '') ? (string) $item['rekening'] : null;
            $blokIdVal = (isset($item['blok_id']) && trim((string) $item['blok_id']) !== '') ? trim((string) $item['blok_id']) : null;
            $kodeBelanjaVal = (isset($item['kode_belanja']) && trim((string) $item['kode_belanja']) !== '') ? trim((string) $item['kode_belanja']) : null;
            $isExpiredVal = (bool) ($item['is_expired'] ?? false);

            $arkasNama = trim((string) ($item['nama_barang'] ?? ''));
            $arkasKode = ($kodeRekVal !== null) ? trim($kodeRekVal) : '';
            $arkasRek = ($rekeningVal !== null) ? trim($rekeningVal) : '';
            $arkasSat = ($satuanVal !== null) ? trim($satuanVal) : '';
            $arkasBlok = $blokIdVal ?? '';
            $arkasKodeBelanja = $kodeBelanjaVal ?? '';

            if (! isset($existingMap[$key])) {
                // Data Baru
                $recordsToUpsert[] = [
                    'id_barang' => (string) $item['id_barang'],
                    'nama_barang' => (string) ($item['nama_barang'] ?? ''),
                    'kode_rekening' => $kodeRekVal,
                    'rekening' => $rekeningVal,
                    'satuan' => $satuanVal,
                    'blok_id' => $blokIdVal,
                    'kode_belanja' => $kodeBelanjaVal,
                    'is_expired' => $isExpiredVal,
                    'batas_atas' => $itemBatasAtas,
                    'tahun' => (int) $item['tahun'],
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
                $syncedNewCount++;
            } else {
                // Cek apakah ada perubahan
                $ex = $existingMap[$key];
                $lokalNama = trim((string) ($ex['nama_barang'] ?? ''));
                $lokalKode = trim((string) ($ex['kode_rekening'] ?? ''));
                $lokalRek = trim((string) ($ex['rekening'] ?? ''));
                $lokalSat = trim((string) ($ex['satuan'] ?? ''));
                $lokalBlok = trim((string) ($ex['blok_id'] ?? ''));
                $lokalKodeBelanja = trim((string) ($ex['kode_belanja'] ?? ''));
                $lokalExpired = (bool) ($ex['is_expired'] ?? false);
                $lokalBatas = (float) ($ex['batas_atas'] ?? 0);

                $isChanged = (
                    $lokalNama !== $arkasNama ||
                    $lokalKode !== $arkasKode ||
                    $lokalRek !== $arkasRek ||
                    $lokalSat !== $arkasSat ||
                    $lokalBlok !== $arkasBlok ||
                    $lokalKodeBelanja !== $arkasKodeBelanja ||
                    $lokalExpired !== $isExpiredVal ||
                    abs($lokalBatas - $itemBatasAtas) > 0.01
                );

                if ($isChanged) {
                    $recordsToUpsert[] = [
                        'id_barang' => (string) $item['id_barang'],
                        'nama_barang' => (string) ($item['nama_barang'] ?? ''),
                        'kode_rekening' => $kodeRekVal,
                        'rekening' => $rekeningVal,
                        'satuan' => $satuanVal,
                        'blok_id' => $blokIdVal,
                        'kode_belanja' => $kodeBelanjaVal,
                        'is_expired' => $isExpiredVal,
                        'batas_atas' => $itemBatasAtas,
                        'tahun' => (int) $item['tahun'],
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                    $syncedUpdatedCount++;
                }
            }
        }

        // Jalankan batch upsert ke PostgreSQL per chunk 2.000 data
        if (! empty($recordsToUpsert)) {
            DB::beginTransaction();
            try {
                foreach (array_chunk($recordsToUpsert, 2000) as $chunk) {
                    DB::table('ref_barangs')->upsert(
                        $chunk,
                        ['id_barang', 'tahun'], // Unique constraint
                        ['nama_barang', 'kode_rekening', 'rekening', 'satuan', 'blok_id', 'kode_belanja', 'is_expired', 'batas_atas', 'updated_at'] // Kolom yang diupdate
                    );
                }
                DB::commit();
            } catch (\Exception $e) {
                DB::rollBack();
                Log::error('Error sync ref_barangs: '.$e->getMessage());

                return response()->json([
                    'status' => 'error',
                    'message' => 'Gagal menyimpan ke database: '.$e->getMessage(),
                ], 500);
            }
        }

        // Ikut sinkronkan data PTK (Guru & Tendik) serta satuan baku ARKAS secara aman
        $ptkSync = app(RefPtkService::class)->syncFromArkasSilently($year);
        app(RefSatuanService::class)->syncFromArkasSilently();

        $msg = "Berhasil menyinkronkan $syncedNewCount data baru";
        if ($syncedUpdatedCount > 0) {
            $msg .= " dan memperbarui $syncedUpdatedCount data yang berubah";
        }
        $msg .= ' ke database lokal.';
        if (($ptkSync['status'] ?? null) === 'success' && ((int) ($ptkSync['inserted'] ?? 0) + (int) ($ptkSync['updated'] ?? 0)) > 0) {
            $msg .= " (PTK: {$ptkSync['inserted']} baru, {$ptkSync['updated']} diperbarui)";
        }

        return response()->json([
            'status' => 'success',
            'message' => $msg,
            'synced' => $syncedNewCount,
            'updated' => $syncedUpdatedCount,
            'ptk_sync' => $ptkSync,
        ]);
    }

    /**
     * Deteksi cepat daftar tahun referensi barang yang tersedia pada file arkas.db
     *
     * @return array<int, string>
     */
    protected function detectArkasYears(): array
    {
        $pythonResult = $this->runPythonQuery('__YEARS__', 'ALL');

        if (($pythonResult['status'] ?? null) !== 'success' || ! is_array($pythonResult['years'] ?? null)) {
            return [];
        }

        return array_values(array_filter(
            array_map('strval', $pythonResult['years']),
            fn ($y) => preg_match('/^\d{4}$/', $y) === 1
        ));
    }

    /**
     * Helper privat untuk menjalankan script Python query.py
     */
    private function runPythonQuery($keyword, $year = 'ALL')
    {
        $timeout = $keyword === '__YEARS__' ? 15 : 180;

        return app(ArkasEngineService::class)->runScriptRaw(
            'query.py',
            [(string) $keyword, (string) $year],
            $timeout
        );
    }
}
