<?php

namespace App\Http\Controllers;

use App\Config\VariantConfig;
use App\Models\KodeKegiatan;
use App\Models\RefBarang;
use App\Models\RekeningBelanja;
use App\Models\Rkas;
use App\Models\RkasPerubahan;
use App\Services\ArkasEngineService;
use App\Services\ArkasRkasSyncService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request; // Added Log
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Symfony\Component\Process\Process;

class RkasPerubahanController extends Controller
{
    protected ?string $variant;

    protected ?string $Penganggaran;

    protected ?string $Rkas;

    protected ?string $RkasPerubahan;

    protected ?string $BukuKasUmum;

    protected ?string $BukuKasUmumUraianDetail;

    protected ?string $RekamanPerubahan;

    protected function initVariantModels(): void
    {
        $this->variant = app()->bound('variant') ? app('variant') : ($this->variant ?? 'reguler');
        $this->Penganggaran = VariantConfig::getModelClass('penganggaran', $this->variant);
        $this->Rkas = VariantConfig::getModelClass('rkas', $this->variant);
        $this->RkasPerubahan = VariantConfig::getModelClass('rkas_perubahan', $this->variant);
        $this->BukuKasUmum = VariantConfig::getModelClass('bku', $this->variant);
        $this->BukuKasUmumUraianDetail = VariantConfig::getModelClass('bku_uraian_detail', $this->variant);
        $this->RekamanPerubahan = VariantConfig::getModelClass('rekaman_perubahan', $this->variant);
    }

    public function __construct()
    {
        $this->initVariantModels();

        $this->middleware(function ($request, $next) {
            $this->initVariantModels();

            return $next($request);
        });
    }

    public function index(Request $request, $id)
    {
        $penganggaran = ($this->Penganggaran)::with('persetujuanUser:id,name,role')->findOrFail($id);
        $penganggaran->setAttribute('sumber_dana', VariantConfig::title($this->variant));

        $kodeKegiatans = KodeKegiatan::all();
        $rekeningBelanjas = RekeningBelanja::all();

        // Get all RKAS Perubahan items
        $itemsRaw = ($this->RkasPerubahan)::with(['kodeKegiatan', 'rekeningBelanja', 'review.user:id,name,role'])
            ->where(VariantConfig::penganggaranFk($this->variant), $penganggaran->id)
            ->get();

        // Calculate Totals for Perubahan
        $totalTahap1 = ($this->RkasPerubahan)::getTotalTahap1($penganggaran->id);
        $totalTahap2 = ($this->RkasPerubahan)::getTotalTahap2($penganggaran->id);

        $paguAnggaran = $penganggaran->pagu_anggaran;
        $paguHalf = $paguAnggaran / 2;

        $monthMap = array_flip(($this->RkasPerubahan)::getBulanList());

        $bkuDetailTable = app($this->BukuKasUmumUraianDetail)->getTable();
        $bkuTable = app($this->BukuKasUmum)->getTable();
        $bkuFk = VariantConfig::bkuFk($this->variant);
        $penganggaranFk = VariantConfig::penganggaranFk($this->variant);

        // Get total spent from BKU directly grouped by unique signature
        $bkuSpents = ($this->BukuKasUmumUraianDetail)::selectRaw("{$bkuDetailTable}.kode_kegiatan_id, {$bkuDetailTable}.rekening_belanja_id, LOWER(TRIM({$bkuDetailTable}.uraian)) as uraian_clean, {$bkuDetailTable}.harga_satuan, SUM({$bkuDetailTable}.volume) as total_volume")
            ->join($bkuTable, "{$bkuTable}.id", '=', "{$bkuDetailTable}.{$bkuFk}")
            ->where("{$bkuTable}.{$penganggaranFk}", $penganggaran->id)
            ->groupBy("{$bkuDetailTable}.kode_kegiatan_id", "{$bkuDetailTable}.rekening_belanja_id", 'uraian_clean', "{$bkuDetailTable}.harga_satuan")
            ->get()
            ->keyBy(function ($item) {
                return $item->kode_kegiatan_id.'|'.$item->rekening_belanja_id.'|'.$item->uraian_clean.'|'.(float) $item->harga_satuan;
            });

        // Group by identical items to distribute BKU spending (FIFO)
        $groupedRaw = $itemsRaw->groupBy(function ($item) {
            return $item->kode_id.'|'.$item->kode_rekening_id.'|'.strtolower(trim($item->uraian)).'|'.(float) $item->harga_satuan;
        });

        foreach ($groupedRaw as $key => $group) {
            // Sort by month index to process earliest month first
            $sortedGroup = $group->sortBy(function ($item) use ($monthMap) {
                return $monthMap[$item->bulan] ?? 99;
            });

            // Total spent for this group in BKU (sum Uraian SIKAS and Uraian Arkas if different)
            $totalSpent = isset($bkuSpents[$key]) ? $bkuSpents[$key]->total_volume : 0;
            $firstInGroup = $sortedGroup->first();
            if ($firstInGroup && ! empty($firstInGroup->uraian_arkas)) {
                $arkasKey = $firstInGroup->kode_id.'|'.$firstInGroup->kode_rekening_id.'|'.strtolower(trim($firstInGroup->uraian_arkas)).'|'.(float) $firstInGroup->harga_satuan;
                if ($arkasKey !== $key && isset($bkuSpents[$arkasKey])) {
                    $totalSpent += $bkuSpents[$arkasKey]->total_volume;
                }
            }

            foreach ($sortedGroup as $item) {
                if ($totalSpent > 0) {
                    $allocate = min($totalSpent, $item->jumlah);
                    $item->dibelanjakan_calc = $allocate;
                    $totalSpent -= $allocate;
                } else {
                    $item->dibelanjakan_calc = 0;
                }
            }
        }

        $reviewableType = $this->RkasPerubahan;

        // Transform items for frontend
        $items = $itemsRaw->map(function ($item) use ($reviewableType) {
            return [
                'id' => $item->id,
                'program' => $item->kodeKegiatan->program ?? '-',
                'kegiatan' => $item->kodeKegiatan->sub_program ?? '-',
                'rekening' => $item->rekeningBelanja ? ($item->rekeningBelanja->kode_rekening.' - '.$item->rekeningBelanja->rincian_objek) : '-',
                'uraian' => $item->uraian,
                'uraian_arkas' => $item->uraian_arkas,
                'id_barang_arkas' => $item->id_barang_arkas,
                'dianggaran' => $item->jumlah,
                'dibelanjakan' => $item->dibelanjakan_calc ?? 0,
                'satuan' => $item->satuan,
                'harga' => number_format($item->harga_satuan, 0, ',', '.'),
                'harga_satuan_raw' => $item->harga_satuan, // Added for frontend edit
                'total' => number_format($item->jumlah * $item->harga_satuan, 0, ',', '.'),
                'bulan' => $item->bulan,
                'kode_id' => $item->kode_id, // For Edit
                'kode_rekening_id' => $item->kode_rekening_id, // For Edit
                'reviewable_type' => $reviewableType,
                'review' => $item->review ? [
                    'id' => $item->review->id,
                    'status' => $item->review->status,
                    'catatan' => $item->review->catatan,
                    'tanggapan_bendahara' => $item->review->tanggapan_bendahara,
                    'revisi_diajukan_at' => $item->review->revisi_diajukan_at?->format('d/m/Y H:i'),
                    'user_name' => $item->review->user?->name ?? 'Kepala Sekolah',
                    'created_at' => $item->review->updated_at?->format('d/m/Y H:i'),
                ] : null,
            ];
        });

        // Calculate Month Filters
        $monthsList = ($this->RkasPerubahan)::getBulanList();
        $months = collect($monthsList)->map(function ($month) use ($itemsRaw) {
            return [
                'name' => $month,
                'count' => $itemsRaw->where('bulan', $month)->count(),
                'active' => false,
            ];
        });

        $isArkasYearSynced = RefBarang::where('tahun', (int) $penganggaran->tahun_anggaran)->exists();

        return $this->renderVariant('Penganggaran/RkasPerubahan/Index', [
            'anggaran' => [
                'id' => $penganggaran->id,
                'is_arkas_year_synced' => $isArkasYearSynced,
                'tahun' => (string) $penganggaran->tahun_anggaran,
                'pagu_total' => number_format($paguAnggaran, 0, ',', '.'),
                'sumber_dana' => VariantConfig::title($this->variant).' (Perubahan)',
                'status' => 'Aktif',
                'status_persetujuan' => $penganggaran->status_persetujuan ?? 'draft',
                'persetujuan_user' => $penganggaran->persetujuanUser ? [
                    'id' => $penganggaran->persetujuanUser->id,
                    'name' => $penganggaran->persetujuanUser->name,
                ] : null,
                'tanggal_persetujuan' => $penganggaran->tanggal_persetujuan?->format('d/m/Y H:i'),
                'catatan_persetujuan' => $penganggaran->catatan_persetujuan,
                'tahap_1' => [
                    'periode' => 'Januari - Juni',
                    'persen' => $paguAnggaran > 0 ? number_format(($totalTahap1 / $paguAnggaran) * 100, 2).'%' : '0.00%',
                    'sisa' => number_format($paguHalf - $totalTahap1, 0, ',', '.'),
                ],
                'tahap_2' => [
                    'periode' => 'Juli - Desember',
                    'persen' => $paguAnggaran > 0 ? number_format(($totalTahap2 / $paguAnggaran) * 100, 2).'%' : '0.00%',
                    'sisa' => number_format($paguHalf - $totalTahap2, 0, ',', '.'),
                ],
            ],
            'items' => $items,
            'months' => $months,
            'kegiatanOptions' => $kodeKegiatans->map(fn ($k) => [
                'id' => $k->id,
                'kode' => $k->kode,
                'program' => $k->program,
                'sub_program' => $k->sub_program,
                'uraian' => $k->uraian,
            ]),
            'rekeningOptions' => $rekeningBelanjas->map(fn ($r) => [
                'id' => $r->id,
                'kode_rekening' => $r->kode_rekening,
                'rincian_objek' => $r->rincian_objek,
                'kategori' => $r->kategori,
            ]),
        ]);
    }

    public function salinDariRkas(Request $request)
    {
        $request->validate([
            'penganggaran_id' => 'required|exists:'.(new $this->Penganggaran)->getTable().',id',
        ]);

        $penganggaranId = $request->penganggaran_id;

        // Cek jika sudah ada data perubahan
        $count = ($this->RkasPerubahan)::where(VariantConfig::penganggaranFk($this->variant), $penganggaranId)->count();
        if ($count > 0) {
            return redirect()->back()->withErrors(['message' => 'Data RKAS Perubahan sudah ada.']);
        }

        DB::beginTransaction();
        try {
            $rkasAwal = ($this->Rkas)::where(VariantConfig::penganggaranFk($this->variant), $penganggaranId)->get();

            foreach ($rkasAwal as $rkas) {
                ($this->RkasPerubahan)::create([
                    VariantConfig::penganggaranFk($this->variant) => $rkas->{VariantConfig::penganggaranFk($this->variant)},
                    'kode_id' => $rkas->kode_id,
                    'kode_rekening_id' => $rkas->kode_rekening_id,
                    'uraian' => $rkas->uraian,
                    'uraian_arkas' => $rkas->uraian_arkas,
                    'id_barang_arkas' => $rkas->id_barang_arkas,
                    'harga_satuan' => $rkas->harga_satuan,
                    'bulan' => $rkas->bulan,
                    'jumlah' => $rkas->jumlah,
                    'satuan' => $rkas->satuan,
                ]);
            }

            DB::commit();

            $this->logAction($penganggaranId, 'copy', 'Menyalin data dari RKAS Awal ke RKAS Perubahan');

            return redirect()->back()->with('success', 'Data RKAS Awal berhasil disalin ke RKAS Perubahan.');
        } catch (\Exception $e) {
            DB::rollBack();

            return redirect()->back()->withErrors(['message' => 'Gagal menyalin data: '.$e->getMessage()]);
        }
    }

    public function checkStatusPerubahan($id)
    {
        $exists = ($this->RkasPerubahan)::where(VariantConfig::penganggaranFk($this->variant), $id)->exists();

        return response()->json(['exists' => $exists]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'kode_id' => 'required|exists:kode_kegiatans,id',
            'kode_rekening_id' => 'required|exists:rekening_belanjas,id',
            'uraian' => 'required|string',
            'uraian_arkas' => 'nullable|string',
            'id_barang_arkas' => 'nullable|string|max:100',
            'harga_satuan' => 'required|numeric|min:0',
            'bulan' => 'required|array',
            'jumlah' => 'required|array',
            'satuan' => 'required|array',
            'tahun_anggaran' => 'required', // Passed from frontend usually
        ]);

        // We need `penganggaran_id`. Let's find it using tahun_anggaran
        $penganggaran = ($this->Penganggaran)::where('tahun_anggaran', $request->tahun_anggaran)->firstOrFail();

        $this->validateArkasBatasAtas(
            (int) $penganggaran->tahun_anggaran,
            (int) $request->kode_rekening_id,
            $request->input('id_barang_arkas'),
            $request->input('uraian_arkas'),
            (float) $request->harga_satuan
        );

        $uraianArkas = $request->filled('uraian_arkas') ? trim((string) $request->uraian_arkas) : null;
        $idBarangArkas = $request->filled('id_barang_arkas') ? trim((string) $request->id_barang_arkas) : null;

        DB::beginTransaction();
        try {
            for ($i = 0; $i < count($request->bulan); $i++) {
                $bulan = $request->bulan[$i];

                ($this->RkasPerubahan)::create([
                    VariantConfig::penganggaranFk($this->variant) => $penganggaran->id,
                    'kode_id' => $request->kode_id,
                    'kode_rekening_id' => $request->kode_rekening_id,
                    'uraian' => $request->uraian,
                    'uraian_arkas' => $uraianArkas,
                    'id_barang_arkas' => $idBarangArkas,
                    'harga_satuan' => $request->harga_satuan,
                    'bulan' => $bulan,
                    'jumlah' => $request->jumlah[$i],
                    'satuan' => $request->satuan[$i],
                ]);
            }

            $this->logAction($penganggaran->id, 'create', 'Menambah data RKAS Perubahan: '.$request->uraian, null, $request->all());

            DB::commit();

            return redirect()->back()->with('success', 'Data RKAS Perubahan berhasil disimpan.');
        } catch (\Exception $e) {
            DB::rollBack();

            return redirect()->back()->withErrors(['message' => $e->getMessage()]);
        }
    }

    public function edit($id)
    {
        $rkas = ($this->RkasPerubahan)::with(['kodeKegiatan', 'rekeningBelanja'])->findOrFail($id);

        // Siblings logic
        $siblings = ($this->RkasPerubahan)::where(VariantConfig::penganggaranFk($this->variant), $rkas->{VariantConfig::penganggaranFk($this->variant)})
            ->where('kode_id', $rkas->kode_id)
            ->where('kode_rekening_id', $rkas->kode_rekening_id)
            ->where('uraian', $rkas->uraian)
            ->get();

        // Calculate FIFO spent per month for frontend validation
        $bkuSpentVolume = $this->getBkuSpentVolume($rkas);

        $monthMap = array_flip(($this->RkasPerubahan)::getBulanList());
        $sortedItems = $siblings->sortBy(function ($item) use ($monthMap) {
            return $monthMap[$item->bulan] ?? 99;
        });

        $remainingSpent = $bkuSpentVolume;
        $spentMap = [];

        foreach ($sortedItems as $item) {
            if ($remainingSpent > 0) {
                $allocate = min($remainingSpent, $item->jumlah);
                $spentMap[$item->id] = $allocate;
                $remainingSpent -= $allocate;
            } else {
                $spentMap[$item->id] = 0;
            }
        }

        $penganggaranFk = VariantConfig::penganggaranFk($this->variant);
        $penganggaran = ($this->Penganggaran)::find($rkas->{$penganggaranFk});
        $tahun = (int) ($penganggaran->tahun_anggaran ?? date('Y'));
        $batasAtasArkas = $this->resolveArkasBatasAtas(
            $tahun,
            (int) $rkas->kode_rekening_id,
            $rkas->id_barang_arkas,
            $rkas->uraian_arkas
        );

        return response()->json([
            'data' => [
                'id' => $rkas->id,
                'kode_id' => (string) $rkas->kode_id,
                'kode_rekening_id' => (string) $rkas->kode_rekening_id,
                'uraian' => $rkas->uraian,
                'uraian_arkas' => $rkas->uraian_arkas ?? '',
                'id_barang_arkas' => $rkas->id_barang_arkas ?? '',
                'batas_atas_arkas' => $batasAtasArkas,
                'harga_satuan' => $rkas->harga_satuan,
                'harga_satuan_raw' => $rkas->harga_satuan,
                'bulan_data' => $siblings->map(function ($item) use ($spentMap) {
                    return [
                        'bulan' => $item->bulan,
                        'jumlah' => $item->jumlah,
                        'total' => $item->jumlah * $item->harga_satuan,
                        'satuan' => $item->satuan,
                        'spent' => $spentMap[$item->id] ?? 0, // Injected for real-time validation
                    ];
                }),
            ],
        ]);
    }

    public function show($id)
    {
        $rkas = ($this->RkasPerubahan)::with(['kodeKegiatan', 'rekeningBelanja'])->findOrFail($id);
        $siblings = ($this->RkasPerubahan)::where(VariantConfig::penganggaranFk($this->variant), $rkas->{VariantConfig::penganggaranFk($this->variant)})
            ->where('kode_id', $rkas->kode_id)
            ->where('kode_rekening_id', $rkas->kode_rekening_id)
            ->where('uraian', $rkas->uraian)
            ->get();

        return response()->json([
            'data' => [
                'id' => $rkas->id,
                'kode_kegiatan' => $rkas->kodeKegiatan,
                'rekening_belanja' => $rkas->rekeningBelanja,
                'uraian' => $rkas->uraian,
                'uraian_arkas' => $rkas->uraian_arkas,
                'id_barang_arkas' => $rkas->id_barang_arkas,
                'harga_satuan' => $rkas->harga_satuan,
                'bulan_data' => $siblings->map(function ($item) {
                    return [
                        'bulan' => $item->bulan,
                        'jumlah' => $item->jumlah,
                        'total' => $item->jumlah * $item->harga_satuan,
                        'satuan' => $item->satuan,
                    ];
                }),
            ],
        ]);
    }

    public function update(Request $request, $id)
    {
        // Update Group logic similar to RkasController but we use $id as reference
        // Index.tsx uses 'update' with an ID.
        $target = ($this->RkasPerubahan)::findOrFail($id);

        $request->validate([
            // Validation same as store
            'kode_id' => 'required',
            'kode_rekening_id' => 'required',
            'uraian' => 'required',
            'uraian_arkas' => 'nullable|string',
            'id_barang_arkas' => 'nullable|string|max:100',
            'harga_satuan' => 'required',
            'bulan' => 'required|array',
        ]);

        $penganggaranFk = VariantConfig::penganggaranFk($this->variant);
        $penganggaran = ($this->Penganggaran)::find($target->{$penganggaranFk});
        $tahunAnggaran = (int) ($penganggaran->tahun_anggaran ?? $request->input('tahun_anggaran', date('Y')));

        $this->validateArkasBatasAtas(
            $tahunAnggaran,
            (int) $request->kode_rekening_id,
            $request->input('id_barang_arkas'),
            $request->input('uraian_arkas'),
            (float) $request->harga_satuan
        );

        $uraianArkas = $request->filled('uraian_arkas') ? trim((string) $request->uraian_arkas) : null;
        $idBarangArkas = $request->filled('id_barang_arkas') ? trim((string) $request->id_barang_arkas) : null;

        // Validasi BKU
        $bkuSpentVolume = $this->getBkuSpentVolume($target);

        if ($bkuSpentVolume > 0) {
            // Check if signature changed
            if ($request->kode_id != $target->kode_id ||
                $request->kode_rekening_id != $target->kode_rekening_id ||
                strtolower(trim($request->uraian)) != strtolower(trim($target->uraian)) ||
                $request->harga_satuan != $target->harga_satuan) {

                return redirect()->back()->withErrors(['message' => 'Tidak Dapat Melakukan Perubahan, Karena Sudah Dibelanjakan Pada BKU. Hapus Belanja Ini Pada BKU Terlebih Dahulu Agar Dapat Melakukan Update Data.']);
            }

            // Hitung FIFO per bulan untuk BKU spent
            $originalItems = ($this->RkasPerubahan)::where(VariantConfig::penganggaranFk($this->variant), $target->{VariantConfig::penganggaranFk($this->variant)})
                ->where('kode_id', $target->kode_id)
                ->where('kode_rekening_id', $target->kode_rekening_id)
                ->where('uraian', $target->uraian)
                ->get();

            $monthMap = array_flip(($this->RkasPerubahan)::getBulanList());
            $sortedItems = $originalItems->sortBy(function ($item) use ($monthMap) {
                return $monthMap[$item->bulan] ?? 99;
            });

            $remainingSpent = $bkuSpentVolume;
            $spentPerMonth = [];

            foreach ($sortedItems as $item) {
                if ($remainingSpent > 0) {
                    $allocate = min($remainingSpent, $item->jumlah);
                    $spentPerMonth[$item->bulan] = ($spentPerMonth[$item->bulan] ?? 0) + $allocate;
                    $remainingSpent -= $allocate;
                } else {
                    $spentPerMonth[$item->bulan] = ($spentPerMonth[$item->bulan] ?? 0);
                }
            }

            $proposedPerMonth = [];
            for ($i = 0; $i < count($request->bulan); $i++) {
                $month = $request->bulan[$i];
                $quantity = $request->jumlah[$i];
                $proposedPerMonth[$month] = ($proposedPerMonth[$month] ?? 0) + $quantity;
            }

            foreach ($spentPerMonth as $month => $spent) {
                if ($spent > 0) {
                    $proposed = $proposedPerMonth[$month] ?? 0;
                    if ($proposed < $spent) {
                        return redirect()->back()->withErrors(['message' => "Tidak Dapat Melakukan Perubahan. Anggaran bulan {$month} sudah terpakai sebanyak {$spent} di BKU!"]);
                    }
                }
            }
        }

        DB::beginTransaction();
        try {
            // Capture existing reviews before deleting old group rows
            $oldGroupQuery = ($this->RkasPerubahan)::where(VariantConfig::penganggaranFk($this->variant), $target->{VariantConfig::penganggaranFk($this->variant)})
                ->where('kode_id', $target->kode_id)
                ->where('kode_rekening_id', $target->kode_rekening_id)
                ->where('uraian', $target->uraian);

            $oldGroupItems = (clone $oldGroupQuery)->with('review')->get();
            $reviewsByMonth = [];
            foreach ($oldGroupItems as $oldRow) {
                if ($oldRow->review) {
                    $reviewsByMonth[$oldRow->bulan] = $oldRow->review;
                }
            }

            // Delete old group
            $oldGroupQuery->delete();

            // Create new
            $createdByMonth = [];
            $firstCreatedRow = null;
            for ($i = 0; $i < count($request->bulan); $i++) {
                $newRow = ($this->RkasPerubahan)::create([
                    VariantConfig::penganggaranFk($this->variant) => $target->{VariantConfig::penganggaranFk($this->variant)},
                    'kode_id' => $request->kode_id,
                    'kode_rekening_id' => $request->kode_rekening_id,
                    'uraian' => $request->uraian,
                    'uraian_arkas' => $uraianArkas,
                    'id_barang_arkas' => $idBarangArkas,
                    'harga_satuan' => $request->harga_satuan,
                    'bulan' => $request->bulan[$i],
                    'jumlah' => $request->jumlah[$i],
                    'satuan' => $request->satuan[$i],
                ]);
                $createdByMonth[$request->bulan[$i]] = $newRow;
                if (! $firstCreatedRow) {
                    $firstCreatedRow = $newRow;
                }
            }

            // Re-bind existing reviews to the newly created items
            $boundTargetIds = [];
            foreach ($reviewsByMonth as $month => $existingReview) {
                $targetRow = $createdByMonth[$month] ?? $firstCreatedRow;
                if ($targetRow && ! in_array($targetRow->id, $boundTargetIds, true)) {
                    $existingReview->update([
                        'reviewable_id' => $targetRow->id,
                    ]);
                    $boundTargetIds[] = $targetRow->id;
                }
            }

            $this->logAction($target->{VariantConfig::penganggaranFk($this->variant)}, 'update', 'Mengupdate data RKAS Perubahan: '.$request->uraian, ['old_uraian' => $target->uraian], $request->all());

            DB::commit();

            return redirect()->back()->with('success', 'Data RKAS Perubahan berhasil diupdate.');
        } catch (\Exception $e) {
            DB::rollBack();

            return redirect()->back()->withErrors(['message' => $e->getMessage()]);
        }
    }

    public function destroyPenganggaran($id)
    {
        // $id is penganggaran_id

        // Validasi BKU (Khusus Tahap 2 / Juli - Desember)
        $hasBkuPerubahan = ($this->BukuKasUmum)::where(VariantConfig::penganggaranFk($this->variant), $id)
            ->whereMonth('tanggal_transaksi', '>=', 7)
            ->exists();

        if ($hasBkuPerubahan) {
            return redirect()->back()->with('error', 'RKAS Perubahan tidak dapat dihapus karena sudah ada data belanja pada BKU bulan Juli - Desember. Anda perlu menghapus data BKU pada periode tersebut terlebih dahulu.');
        }

        ($this->RkasPerubahan)::where(VariantConfig::penganggaranFk($this->variant), $id)->delete();
        ($this->RekamanPerubahan)::where(VariantConfig::penganggaranFk($this->variant), $id)->delete(); // Also clean logs? Optional but good for clean start.

        return redirect()->back()->with('success', 'Semua data RKAS Perubahan berhasil dihapus');
    }

    public function deleteAll($id)
    {
        $target = ($this->RkasPerubahan)::findOrFail($id);

        // Validasi BKU
        $bkuSpentVolume = $this->getBkuSpentVolume($target);

        if ($bkuSpentVolume > 0) {
            return redirect()->back()->withErrors(['message' => 'Tidak Dapat Melakukan Perubahan, Karena Sudah Dibelanjakan Pada BKU. Hapus Belanja Ini Pada BKU Terlebih Dahulu Agar Dapat Melakukan Update Data.']);
        }

        ($this->RkasPerubahan)::where(VariantConfig::penganggaranFk($this->variant), $target->{VariantConfig::penganggaranFk($this->variant)})
            ->where('kode_id', $target->kode_id)
            ->where('kode_rekening_id', $target->kode_rekening_id)
            ->where('uraian', $target->uraian)
            ->delete();

        $this->logAction($target->{VariantConfig::penganggaranFk($this->variant)}, 'delete', 'Menghapus data RKAS Perubahan group: '.$target->uraian);

        return redirect()->back()->with('success', 'Data RKAS Perubahan berhasil dihapus.');
    }

    private function getBkuSpentVolume($rkasItem)
    {
        $bkuDetailTable = app($this->BukuKasUmumUraianDetail)->getTable();
        $bkuTable = app($this->BukuKasUmum)->getTable();
        $bkuFk = VariantConfig::bkuFk($this->variant);
        $penganggaranFk = VariantConfig::penganggaranFk($this->variant);

        $uraianCandidates = array_values(array_unique(array_filter([
            strtolower(trim((string) $rkasItem->uraian)),
            strtolower(trim((string) ($rkasItem->uraian_arkas ?? ''))),
        ])));

        return ($this->BukuKasUmumUraianDetail)::join($bkuTable, "{$bkuTable}.id", '=', "{$bkuDetailTable}.{$bkuFk}")
            ->where("{$bkuTable}.{$penganggaranFk}", $rkasItem->{$penganggaranFk})
            ->where("{$bkuDetailTable}.kode_kegiatan_id", $rkasItem->kode_id)
            ->where("{$bkuDetailTable}.rekening_belanja_id", $rkasItem->kode_rekening_id)
            ->where(function ($q) use ($bkuDetailTable, $uraianCandidates) {
                foreach ($uraianCandidates as $candidate) {
                    $q->orWhereRaw("LOWER(TRIM({$bkuDetailTable}.uraian)) = ?", [$candidate]);
                }
            })
            ->where("{$bkuDetailTable}.harga_satuan", $rkasItem->harga_satuan)
            ->sum("{$bkuDetailTable}.volume");
    }

    private function resolveArkasBatasAtas(int $tahun, int $rekeningId, ?string $idBarangArkas, ?string $uraianArkas): ?float
    {
        $idBarang = trim((string) $idBarangArkas);
        $uraian = trim((string) $uraianArkas);

        if ($idBarang === '' && $uraian === '') {
            return null;
        }

        $rekening = RekeningBelanja::find($rekeningId);
        if (! $rekening || empty($rekening->kode_rekening)) {
            return null;
        }

        $baseQuery = RefBarang::where('tahun', $tahun)
            ->where('kode_rekening', $rekening->kode_rekening);

        if (! (clone $baseQuery)->exists()) {
            return null;
        }

        $refBarang = null;
        if ($idBarang !== '') {
            $refBarang = (clone $baseQuery)->where('id_barang', $idBarang)->first();
        }
        if (! $refBarang && $uraian !== '') {
            $refBarang = (clone $baseQuery)
                ->whereRaw('LOWER(TRIM(nama_barang)) = LOWER(TRIM(?))', [$uraian])
                ->first();
        }

        if (! $refBarang) {
            return null;
        }

        return (float) $refBarang->batas_atas;
    }

    private function validateArkasBatasAtas(int $tahun, int $rekeningId, ?string $idBarangArkas, ?string $uraianArkas, float $hargaSatuan): void
    {
        $batasAtas = $this->resolveArkasBatasAtas($tahun, $rekeningId, $idBarangArkas, $uraianArkas);

        if ($batasAtas !== null && $batasAtas > 0 && $hargaSatuan > $batasAtas) {
            throw ValidationException::withMessages([
                'harga_satuan' => 'Harga satuan melebihi batas atas Arkas (Maks: Rp '.number_format($batasAtas, 0, ',', '.').').',
            ]);
        }
    }

    public function summary(Request $request, $id)
    {
        $penganggaran = ($this->Penganggaran)::with('sekolah')->findOrFail($id);
        $penganggaran->setAttribute('sumber_dana', VariantConfig::title($this->variant));

        // Fetch all RKAS Perubahan data
        $rkasData = ($this->RkasPerubahan)::with(['kodeKegiatan', 'rekeningBelanja'])
            ->where(VariantConfig::penganggaranFk($this->variant), $id)
            ->get();

        // Fetch all RKAS Murni data
        $rkasMurniData = ($this->Rkas)::with(['kodeKegiatan', 'rekeningBelanja'])
            ->where(VariantConfig::penganggaranFk($this->variant), $id)
            ->get();

        // Fetch Monthly specific data
        $selectedMonth = $request->input('month', 'Januari');
        $monthlyRkas = ($this->RkasPerubahan)::with(['kodeKegiatan', 'rekeningBelanja'])
            ->where(VariantConfig::penganggaranFk($this->variant), $id)
            ->where('bulan', $selectedMonth)
            ->get();

        $groupedMonthly = $monthlyRkas->groupBy(function ($item) {
            return optional($item->kodeKegiatan)->kode;
        })->filter(fn ($group, $key) => ! is_null($key));

        $rkaBulananData = $this->kelolaDataRkas($groupedMonthly);

        // 1. Grouped Data
        $grouped = $rkasData->groupBy(function ($item) {
            return $item->kodeKegiatan->program ?? 'Lainnya';
        })->map(function ($programGroup) {
            return $programGroup->groupBy(function ($item) {
                return $item->kodeKegiatan->sub_program ?? 'Lainnya';
            })->map(function ($kegiatanGroup) {
                return $kegiatanGroup->groupBy(function ($item) {
                    return $item->rekeningBelanja->kode_rekening ?? '000';
                })->map(function ($rekeningGroup) {
                    $first = $rekeningGroup->first();
                    $rekening = $first->rekeningBelanja;

                    $months = [
                        'Januari' => 0, 'Februari' => 0, 'Maret' => 0, 'April' => 0, 'Mei' => 0, 'Juni' => 0,
                        'Juli' => 0, 'Agustus' => 0, 'September' => 0, 'Oktober' => 0, 'November' => 0, 'Desember' => 0,
                    ];

                    $total = 0;
                    foreach ($rekeningGroup as $item) {
                        $val = $item->jumlah * $item->harga_satuan;
                        if (isset($months[$item->bulan])) {
                            $months[$item->bulan] += $val;
                        }
                        $total += $val;
                    }

                    return [
                        'kode_rekening' => $rekening->kode_rekening ?? '-',
                        'nama_rekening' => $rekening->rincian_objek ?? '-',
                        'months' => $months,
                        'total' => $total,
                    ];
                })->values();
            });
        });

        // 2. Tahapan Data
        $groupedRkas = $rkasData->groupBy(function ($item) {
            return optional($item->kodeKegiatan)->kode;
        })->filter(fn ($group, $key) => ! is_null($key));

        $groupedMurni = $rkasMurniData->groupBy(function ($item) {
            return optional($item->kodeKegiatan)->kode;
        })->filter(fn ($group, $key) => ! is_null($key));

        $tahapanData = $this->kelolaDataRkas($groupedRkas, $groupedMurni);
        $tahapanV1Data = $this->kelolaDataRkas($groupedRkas);

        // Data for "Rincian" Tab (Tahap 1 dari Murni, Tahap 2 dari Perubahan)
        $rincianGabungan = collect();
        $rincianGabungan = $rincianGabungan->merge(
            $rkasMurniData->filter(function ($item) {
                return in_array($item->bulan, ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni']);
            })
        );
        $rincianGabungan = $rincianGabungan->merge(
            $rkasData->filter(function ($item) {
                return in_array($item->bulan, ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']);
            })
        );
        $rincianData = $this->kelolaDataRincian($rincianGabungan);

        // 3. Lembar Kerja 221 Data
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

        $allItems = $rkasData;
        $itemRows = $allItems->map(function ($item) {
            return [
                'type' => 'item',
                'kode_rekening' => $item->rekeningBelanja->kode_rekening ?? '',
                'uraian' => $item->uraian,
                'uraian_arkas' => filled($item->uraian_arkas) ? trim((string) $item->uraian_arkas) : null,
                'volume' => $item->jumlah,
                'satuan' => $item->satuan,
                'harga_satuan' => $item->harga_satuan,
                'jumlah' => $item->jumlah * $item->harga_satuan,
                'sort_key' => ($item->rekeningBelanja->kode_rekening ?? '').'Z',
            ];
        });

        $headerRows = collect();
        $headerTotals = [];

        foreach ($allItems as $item) {
            $code = $item->rekeningBelanja->kode_rekening ?? '';
            $val = $item->jumlah * $item->harga_satuan;

            foreach ($hierarchyNames as $hCode => $hName) {
                if (str_starts_with($code, $hCode)) {
                    if (! isset($headerTotals[$hCode])) {
                        $headerTotals[$hCode] = 0;
                    }
                    $headerTotals[$hCode] += $val;
                }
            }
        }

        foreach ($headerTotals as $hCode => $total) {
            $headerRows->push([
                'type' => 'header',
                'kode_rekening' => $hCode,
                'uraian' => $hierarchyNames[$hCode] ?? $hCode,
                'volume' => null,
                'satuan' => null,
                'harga_satuan' => null,
                'jumlah' => $total,
                'sort_key' => $hCode,
            ]);
        }

        $lembarData = $headerRows->merge($itemRows)->sortBy('sort_key')->values();

        // 3. Rekap Data
        $rekapData = [];
        foreach ($hierarchyNames as $prefix => $label) {
            $sum = $allItems->filter(function ($item) use ($prefix) {
                return str_starts_with($item->rekeningBelanja->kode_rekening, $prefix);
            })->sum(fn ($i) => $i->jumlah * $i->harga_satuan);

            $rekapData[] = [
                'kode_rekening' => $prefix,
                'uraian' => $label,
                'jumlah' => $sum,
            ];
        }

        $totalBelanja = collect($rekapData)->firstWhere('kode_rekening', '5')['jumlah'] ?? 0;
        $totalPendapatan = (float) $penganggaran->pagu_anggaran;
        $defisit = $totalPendapatan - $totalBelanja;

        $rekapData[] = ['kode_rekening' => '', 'uraian' => 'JUMLAH BELANJA', 'jumlah' => $totalBelanja];
        $rekapData[] = ['kode_rekening' => '', 'uraian' => 'DEFISIT', 'jumlah' => $defisit];

        // 4. Per Tahap Summary Data
        $sem1 = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
        $pendapatanTahap1 = $totalPendapatan / 2;
        $pendapatanTahap2 = $totalPendapatan / 2;

        $opsItems = $rkasData->filter(fn ($i) => str_starts_with($i->rekeningBelanja->kode_rekening, '5.1'));
        $opsTotal = $opsItems->sum(fn ($i) => $i->jumlah * $i->harga_satuan);
        $opsTahap1 = $opsItems->filter(fn ($i) => in_array($i->bulan, $sem1))->sum(fn ($i) => $i->jumlah * $i->harga_satuan);
        $opsTahap2 = $opsItems->filter(fn ($i) => ! in_array($i->bulan, $sem1))->sum(fn ($i) => $i->jumlah * $i->harga_satuan);

        $modalItems = $rkasData->filter(fn ($i) => str_starts_with($i->rekeningBelanja->kode_rekening, '5.2'));
        $modalTotal = $modalItems->sum(fn ($i) => $i->jumlah * $i->harga_satuan);
        $modalTahap1 = $modalItems->filter(fn ($i) => in_array($i->bulan, $sem1))->sum(fn ($i) => $i->jumlah * $i->harga_satuan);
        $modalTahap2 = $modalItems->filter(fn ($i) => ! in_array($i->bulan, $sem1))->sum(fn ($i) => $i->jumlah * $i->harga_satuan);

        $perTahapData = [
            ['no' => '1', 'uraian' => 'Pendapatan', 'tahap1' => $pendapatanTahap1, 'tahap2' => $pendapatanTahap2, 'total' => $totalPendapatan],
            ['no' => '2.1', 'uraian' => 'Belanja Operasi', 'tahap1' => $opsTahap1, 'tahap2' => $opsTahap2, 'total' => $opsTotal],
            ['no' => '2.2', 'uraian' => 'Belanja Modal', 'tahap1' => $modalTahap1, 'tahap2' => $modalTahap2, 'total' => $modalTotal],
        ];

        // 5. Grafik Data
        $grafikData = $this->getGrafikData($id);
        $totalAnggaran = $grafikData['total_pagu'] ?? 0;
        $totalBuku = $grafikData['buku_anggaran'] ?? 0;
        $totalHonor = $grafikData['honor_anggaran'] ?? 0;
        $totalPemeliharaan = $grafikData['sarpras_anggaran'] ?? 0;
        $spentPemeliharaan = $grafikData['sarpras_spent'] ?? 0;

        $pemeliharaanPercent = $totalAnggaran > 0 ? ($totalPemeliharaan / $totalAnggaran) * 100 : 0;
        $spentPercent = $totalAnggaran > 0 ? ($spentPemeliharaan / $totalAnggaran) * 100 : 0;
        $pemeliharaanValid = $pemeliharaanPercent <= 20;

        $grafikDataResponse = [
            'total' => $totalAnggaran,
            'buku' => [
                'value' => $totalBuku,
                'percentage' => $totalAnggaran > 0 ? ($totalBuku / $totalAnggaran) * 100 : 0,
                'valid' => ($totalAnggaran > 0 && ($totalBuku / $totalAnggaran) * 100 >= 10) ? true : false,
                'message' => 'Anggaran penyediaan buku Anda adalah '.number_format(($totalAnggaran > 0 ? ($totalBuku / $totalAnggaran) * 100 : 0), 2).'% dan '.(($totalAnggaran > 0 && ($totalBuku / $totalAnggaran) * 100 >= 10) ? 'sudah' : 'belum').' sesuai dengan proporsi minimal 10% dari total pagu anggaran.',
            ],
            'honor' => [
                'value' => $totalHonor,
                'percentage' => $totalAnggaran > 0 ? ($totalHonor / $totalAnggaran) * 100 : 0,
                'valid' => ($totalAnggaran > 0 && ($totalHonor / $totalAnggaran) * 100 <= (stripos($penganggaran->sekolah->status_sekolah ?? '', 'negeri') !== false ? 20 : 40)) ? true : false,
                'message' => 'Anggaran honor Anda adalah '.number_format(($totalAnggaran > 0 ? ($totalHonor / $totalAnggaran) * 100 : 0), 2).'% dari total pagu anggaran. Anggaran '.(($totalAnggaran > 0 && ($totalHonor / $totalAnggaran) * 100 <= (stripos($penganggaran->sekolah->status_sekolah ?? '', 'negeri') !== false ? 20 : 40)) ? 'sudah' : 'belum').' sesuai dengan proporsi maksimal '.(stripos($penganggaran->sekolah->status_sekolah ?? '', 'negeri') !== false ? '20%' : '40%').' untuk sekolah '.(stripos($penganggaran->sekolah->status_sekolah ?? '', 'negeri') !== false ? 'Negeri' : 'Swasta').'.',
            ],
            'pemeliharaan' => [
                'value' => $totalPemeliharaan,
                'percentage' => $pemeliharaanPercent,
                'valid' => $pemeliharaanValid,
                'message' => 'Anggaran pemeliharaan sarpras Anda adalah '.number_format($pemeliharaanPercent, 2).'% dan sudah dilaporkan di BKU sebesar '.number_format($spentPercent, 2).'% dari total pagu anggaran. Anggaran '.($pemeliharaanValid ? 'sudah' : 'belum').' sesuai dengan proporsi maksimal 20% dari total pagu anggaran.',
            ],
            'jenis_belanja' => $grafikData['jenis_belanja'] ?? [],
        ];

        $kwitansiMap = $this->getKwitansiMap($id);

        return $this->renderVariant('Penganggaran/RkasPerubahan/Summary', [
            'anggaran' => $penganggaran,
            'groupedData' => $grouped,
            'tahapanData' => $tahapanData,
            'tahapanV1Data' => $tahapanV1Data,
            'rkaBulananData' => $rkaBulananData,
            'rekapData' => $rekapData,
            'perTahapData' => $perTahapData,
            'lembarData' => $lembarData,
            'rincianData' => $rincianData,
            'grafikData' => $grafikDataResponse,
            'kwitansiMap' => $kwitansiMap,
        ]);
    }

    /**
     * Membuat mapping rkas_id => [{ id_transaksi, bulan }, ...] dari kolom nomor_kwitansi.
     */
    private function getKwitansiMap($penganggaranId): array
    {
        $rkasTable = (new ($this->Rkas))->getTable();
        $rkasPerubahanTable = (new ($this->RkasPerubahan))->getTable();
        $penganggaranFk = VariantConfig::penganggaranFk($this->variant);

        $map = [];

        // Dapatkan data RKAS awal yang memiliki nomor_kwitansi
        $rkasRows = DB::table($rkasTable)
            ->where($penganggaranFk, $penganggaranId)
            ->whereNotNull('nomor_kwitansi')
            ->select('id', 'nomor_kwitansi', 'bulan')
            ->get();

        foreach ($rkasRows as $row) {
            if (! $row->nomor_kwitansi) {
                continue;
            }
            $kwitansis = array_map('trim', explode(',', $row->nomor_kwitansi));
            foreach ($kwitansis as $kwitansi) {
                if (! $kwitansi) {
                    continue;
                }
                $map['murni_'.$row->id][] = [
                    'id_transaksi' => $kwitansi,
                    'bulan' => $row->bulan,
                ];
            }
        }

        // Dapatkan data RKAS perubahan yang memiliki nomor_kwitansi
        $rkasPerubahanRows = DB::table($rkasPerubahanTable)
            ->where($penganggaranFk, $penganggaranId)
            ->whereNotNull('nomor_kwitansi')
            ->select('id', 'nomor_kwitansi', 'bulan')
            ->get();

        foreach ($rkasPerubahanRows as $row) {
            if (! $row->nomor_kwitansi) {
                continue;
            }
            $kwitansis = array_map('trim', explode(',', $row->nomor_kwitansi));
            foreach ($kwitansis as $kwitansi) {
                if (! $kwitansi) {
                    continue;
                }
                $map['perubahan_'.$row->id][] = [
                    'id_transaksi' => $kwitansi,
                    'bulan' => $row->bulan,
                ];
            }
        }

        // Deduplicate
        foreach ($map as $k => $entries) {
            $unique = [];
            $seen = [];
            foreach ($entries as $entry) {
                $sig = $entry['id_transaksi'].'|'.$entry['bulan'];
                if (! in_array($sig, $seen)) {
                    $seen[] = $sig;
                    $unique[] = $entry;
                }
            }
            $map[$k] = $unique;
        }

        return $map;
    }

    public function getAvailableKwitansi($id)
    {
        $bkuClass = $this->BukuKasUmum;
        $penganggaranFk = VariantConfig::penganggaranFk($this->variant);

        $bkuRows = $bkuClass::with('uraianDetails')
            ->where($penganggaranFk, $id)
            ->whereNotNull('id_transaksi')
            ->select('id', 'id_transaksi', 'tanggal_transaksi', 'uraian')
            ->get();

        $bulanNames = [
            1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
            5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
            9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember',
        ];

        $results = [];
        foreach ($bkuRows as $row) {
            $bulanName = '';
            if ($row->tanggal_transaksi) {
                $bulanNum = (int) date('n', strtotime($row->tanggal_transaksi));
                $bulanName = $bulanNames[$bulanNum] ?? '';
            }

            $uraianDetails = $row->uraianDetails->map(function ($detail) {
                return [
                    'uraian' => $detail->uraian,
                    'volume' => $detail->volume,
                    'satuan' => $detail->satuan,
                    'harga_satuan' => $detail->harga_satuan,
                    'jumlah' => $detail->jumlah,
                ];
            });

            $results[] = [
                'id_transaksi' => $row->id_transaksi,
                'bulan' => $bulanName,
                'uraian' => $row->uraian,
                'uraian_details' => $uraianDetails,
            ];
        }

        return response()->json($results);
    }

    public function updateKwitansi(Request $request, $id)
    {
        $request->validate([
            'rkas_ids' => 'nullable|array',
            'rkas_ids.*' => 'integer',
            'murni_rkas_ids' => 'nullable|array',
            'murni_rkas_ids.*' => 'integer',
            'nomor_kwitansi' => 'nullable|string',
            'is_perubahan' => 'nullable|boolean',
        ]);

        $isPerubahan = filter_var($request->is_perubahan, FILTER_VALIDATE_BOOLEAN);

        if ($isPerubahan) {
            if (! empty($request->rkas_ids)) {
                $this->RkasPerubahan::where(VariantConfig::penganggaranFk($this->variant), $id)
                    ->whereIn('id', $request->rkas_ids)
                    ->update(['nomor_kwitansi' => $request->nomor_kwitansi]);
            }
            if (! empty($request->murni_rkas_ids)) {
                $this->Rkas::where(VariantConfig::penganggaranFk($this->variant), $id)
                    ->whereIn('id', $request->murni_rkas_ids)
                    ->update(['nomor_kwitansi' => $request->nomor_kwitansi]);
            }
        } else {
            if (! empty($request->rkas_ids)) {
                $this->Rkas::where(VariantConfig::penganggaranFk($this->variant), $id)
                    ->whereIn('id', $request->rkas_ids)
                    ->update(['nomor_kwitansi' => $request->nomor_kwitansi]);
            }
        }

        return redirect()->back()->with('success', 'Nomor kwitansi berhasil disimpan.');
    }

    private function isArkasUraianMode(Request $request): bool
    {
        return $request->query('uraian_mode') === 'arkas';
    }

    private function resolveDisplayUraian($item, bool $useArkas): string
    {
        if ($useArkas && filled($item->uraian_arkas ?? null)) {
            return trim((string) $item->uraian_arkas);
        }

        return (string) ($item->uraian ?? '');
    }

    private function kelolaDataRincian($rkasData, bool $useArkas = false)
    {
        return $rkasData->groupBy(function ($item) {
            return optional($item->kodeKegiatan)->sub_program ?? 'Lainnya';
        })->map(function ($group) use ($useArkas) {
            $subProgram = optional($group->first()->kodeKegiatan)->sub_program ?? 'Lainnya';
            $total = $group->sum(function ($item) {
                return $item->jumlah * $item->harga_satuan;
            });

            $items = $group->groupBy(function ($item) {
                $tampil = $item->uraian_gabungan ?? $item->uraian;
                $tahap = in_array($item->bulan, ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni']) ? 1 : 2;

                return $tampil.'-'.$item->kode_rekening_id.'-Tahap'.$tahap;
            })->map(function ($uraianGroup) use ($useArkas) {
                $firstWithPenerima = $uraianGroup->firstWhere('nama_penerima', '!=', null) ?? $uraianGroup->first();
                $first = $uraianGroup->first();
                $firstWithArkas = $uraianGroup->first(fn ($i) => filled($i->uraian_arkas));
                $tahap = in_array($first->bulan, ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni']) ? 1 : 2;
                $mergedRow = $uraianGroup->first(fn ($i) => filled($i->uraian_gabungan));
                $isMerged = $mergedRow !== null;
                $displayUraian = $isMerged
                    ? $mergedRow->uraian_gabungan
                    : $this->resolveDisplayUraian($firstWithArkas ?? $first, $useArkas);

                return [
                    'uraian' => $displayUraian,
                    'uraian_arkas' => $isMerged ? null : ($firstWithArkas ? trim((string) $firstWithArkas->uraian_arkas) : null),
                    'kode_rekening_id' => $first->kode_rekening_id,
                    'kode_id' => $first->kode_id,
                    'kode_rekening' => optional($first->rekeningBelanja)->kode_rekening ?? '',
                    'kode_kegiatan' => optional($first->kodeKegiatan)->kode ?? '',
                    'tahap' => $tahap,
                    'jumlah' => $uraianGroup->sum(function ($item) {
                        return $item->jumlah * $item->harga_satuan;
                    }),
                    'original_items' => $uraianGroup->groupBy(function ($item) {
                        return $item->uraian.'-'.$item->kode_rekening_id.'-'.$item->kode_id;
                    })->map(function ($group) use ($useArkas) {
                        $first = $group->first();
                        $firstWithArkasOrig = $group->first(fn ($i) => filled($i->uraian_arkas));

                        return [
                            'uraian' => $this->resolveDisplayUraian($firstWithArkasOrig ?? $first, $useArkas),
                            'uraian_arkas' => $firstWithArkasOrig ? trim((string) $firstWithArkasOrig->uraian_arkas) : null,
                            'kode_rekening_id' => $first->kode_rekening_id,
                            'kode_id' => $first->kode_id,
                            'kode_rekening' => optional($first->rekeningBelanja)->kode_rekening ?? '',
                            'kode_kegiatan' => optional($first->kodeKegiatan)->kode ?? '',
                            'satuan' => $first->satuan,
                            'harga_satuan' => $first->harga_satuan,
                            'jumlah' => $group->sum('jumlah'),
                            'total' => $group->sum(function ($q) {
                                return $q->jumlah * $q->harga_satuan;
                            }),
                        ];
                    })->values()->all(),
                    'rkas_ids' => $uraianGroup->filter(function ($item) {
                        return get_class($item) === $this->RkasPerubahan;
                    })->pluck('id')->values()->all(),
                    'murni_rkas_ids' => $uraianGroup->filter(function ($item) {
                        return get_class($item) === $this->Rkas;
                    })->pluck('id')->values()->all(),
                    'bulan_list' => $uraianGroup->pluck('bulan')->filter()->unique()->values()->all(),
                    'bulan' => implode(', ', $uraianGroup->pluck('bulan')->filter()->unique()->values()->all()),
                    'nama_penerima' => $firstWithPenerima->nama_penerima ?? '-',
                    'jabatan' => $firstWithPenerima->jabatan ?? '-',
                    'nomor_rekening' => $firstWithPenerima->nomor_rekening ?? '-',
                    'bank' => $firstWithPenerima->bank ?? '-',
                ];
            })->values();

            return [
                'sub_program' => $subProgram,
                'items' => $items,
                'total' => $total,
            ];
        })->values();
    }

    public function getLogs($id)
    {
        $logs = ($this->RekamanPerubahan)::where(VariantConfig::penganggaranFk($this->variant), $id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'data' => $logs->map(function ($log) {
                return [
                    'id' => $log->id,
                    'action' => $log->action,
                    'description' => $log->description,
                    'user_name' => 'System', // User tracking not implemented in this log model yet
                    'created_at' => $log->created_at->format('d M Y H:i'),
                    'details' => [
                        'old' => $log->old_data,
                        'new' => $log->new_data,
                    ],
                ];
            }),
        ]);
    }

    public function exportTahapanV1Pdf(Request $request, $id)
    {
        $penganggaran = ($this->Penganggaran)::with('sekolah')->findOrFail($id);
        $penganggaran->setAttribute('sumber_dana', VariantConfig::title($this->variant));

        $rkasData = ($this->RkasPerubahan)::with(['kodeKegiatan', 'rekeningBelanja'])
            ->where(VariantConfig::penganggaranFk($this->variant), $id)
            ->get();

        $rkasMurniData = ($this->Rkas)::with(['kodeKegiatan', 'rekeningBelanja'])
            ->where(VariantConfig::penganggaranFk($this->variant), $id)
            ->get();

        $groupedRkas = $rkasData->groupBy(function ($item) {
            return optional($item->kodeKegiatan)->kode;
        })->filter(fn ($group, $key) => ! is_null($key));

        $tahapanData = $this->kelolaDataRkas($groupedRkas, null, $this->isArkasUraianMode($request));

        $totalTahap1 = ($this->RkasPerubahan)::getTotalTahap1($id);
        $totalTahap2 = ($this->RkasPerubahan)::getTotalTahap2($id);

        $pdf = Pdf::loadView('laporan.rka_tahapan_perubahan_v_1_pdf', [
            'anggaran' => $penganggaran->toArray(),
            'tahapanData' => $tahapanData,
            'totalTahap1' => $totalTahap1,
            'totalTahap2' => $totalTahap2,
            'paper_size' => $request->paper_size,
            'orientation' => $request->orientation,
            'font_size' => $request->font_size,
        ]);

        return $pdf->stream('rka_perubahan_tahapan_v1.pdf');
    }

    public function exportTahapanV1Excel(Request $request, $id)
    {
        $penganggaran = ($this->Penganggaran)::with('sekolah')->findOrFail($id);
        $penganggaran->setAttribute('sumber_dana', VariantConfig::title($this->variant));

        $rkasData = ($this->RkasPerubahan)::with(['kodeKegiatan', 'rekeningBelanja'])
            ->where(VariantConfig::penganggaranFk($this->variant), $id)
            ->get();

        $rkasMurniData = ($this->Rkas)::with(['kodeKegiatan', 'rekeningBelanja'])
            ->where(VariantConfig::penganggaranFk($this->variant), $id)
            ->get();

        $groupedRkas = $rkasData->groupBy(function ($item) {
            return optional($item->kodeKegiatan)->kode;
        })->filter(fn ($group, $key) => ! is_null($key));

        $tahapanData = $this->kelolaDataRkas($groupedRkas, null, $this->isArkasUraianMode($request));

        $totalTahap1 = ($this->RkasPerubahan)::getTotalTahap1($id);
        $totalTahap2 = ($this->RkasPerubahan)::getTotalTahap2($id);

        $html = view('laporan.rka_tahapan_perubahan_v_1_pdf', [
            'anggaran' => $penganggaran->toArray(),
            'tahapanData' => $tahapanData,
            'totalTahap1' => $totalTahap1,
            'totalTahap2' => $totalTahap2,
            'paper_size' => $request->paper_size ?? 'A4',
            'orientation' => $request->orientation ?? 'portrait',
            'font_size' => $request->font_size ?? '11pt',
            'is_excel' => true,
        ])->render();

        $sekolahNama = $penganggaran->sekolah->nama_sekolah ?? 'sekolah';
        $filename = 'rka_perubahan_tahapan_v1_'.str_replace(' ', '_', $sekolahNama).'.xls';

        return response($html)
            ->header('Content-Type', 'application/vnd.ms-excel')
            ->header('Content-Disposition', 'attachment; filename="'.$filename.'"');
    }

    public function exportTahapanV2Pdf(Request $request, $id)
    {
        $penganggaran = ($this->Penganggaran)::with('sekolah')->findOrFail($id);
        $penganggaran->setAttribute('sumber_dana', VariantConfig::title($this->variant));

        $rkasData = ($this->RkasPerubahan)::with(['kodeKegiatan', 'rekeningBelanja'])
            ->where(VariantConfig::penganggaranFk($this->variant), $id)
            ->get();

        $groupedRkas = $rkasData->groupBy(function ($item) {
            return optional($item->kodeKegiatan)->kode;
        })->filter(fn ($group, $key) => ! is_null($key));

        $tahapanData = $this->kelolaDataRkas($groupedRkas, null, $this->isArkasUraianMode($request));

        $totalTahap1 = ($this->RkasPerubahan)::getTotalTahap1($id);
        $totalTahap2 = ($this->RkasPerubahan)::getTotalTahap2($id);

        $pdf = Pdf::loadView('laporan.rka_tahapan_perubahan_v_2_pdf', [
            'anggaran' => $penganggaran->toArray(),
            'tahapanData' => $tahapanData,
            'totalTahap1' => $totalTahap1,
            'totalTahap2' => $totalTahap2,
            'paper_size' => $request->paper_size,
            'orientation' => $request->orientation,
            'font_size' => $request->font_size,
        ]);

        return $pdf->stream('rka_perubahan_tahapan_v2.pdf');
    }

    public function exportTahapanV2Excel(Request $request, $id)
    {
        $penganggaran = ($this->Penganggaran)::with('sekolah')->findOrFail($id);
        $penganggaran->setAttribute('sumber_dana', VariantConfig::title($this->variant));

        $rkasData = ($this->RkasPerubahan)::with(['kodeKegiatan', 'rekeningBelanja'])
            ->where(VariantConfig::penganggaranFk($this->variant), $id)
            ->get();

        $groupedRkas = $rkasData->groupBy(function ($item) {
            return optional($item->kodeKegiatan)->kode;
        })->filter(fn ($group, $key) => ! is_null($key));

        $tahapanData = $this->kelolaDataRkas($groupedRkas, null, $this->isArkasUraianMode($request));

        $totalTahap1 = ($this->RkasPerubahan)::getTotalTahap1($id);
        $totalTahap2 = ($this->RkasPerubahan)::getTotalTahap2($id);

        $html = view('laporan.rka_tahapan_perubahan_v_2_pdf', [
            'anggaran' => $penganggaran->toArray(),
            'tahapanData' => $tahapanData,
            'totalTahap1' => $totalTahap1,
            'totalTahap2' => $totalTahap2,
            'paper_size' => $request->paper_size ?? 'A4',
            'orientation' => $request->orientation ?? 'portrait',
            'font_size' => $request->font_size ?? '11pt',
            'is_excel' => true,
        ])->render();

        $sekolahNama = $penganggaran->sekolah->nama_sekolah ?? 'sekolah';
        $filename = 'rka_perubahan_tahapan_v2_'.str_replace(' ', '_', $sekolahNama).'.xls';

        return response($html)
            ->header('Content-Type', 'application/vnd.ms-excel')
            ->header('Content-Disposition', 'attachment; filename="'.$filename.'"');
    }

    // Helpers
    private function kelolaDataRkas($rkasPerubahan, $rkasMurni = null, bool $useArkas = false)
    {
        $terorganisir = [];

        $allKeys = $rkasPerubahan->keys()->merge($rkasMurni ? $rkasMurni->keys() : [])->unique();

        foreach ($allKeys as $kode) {
            $itemsPerubahan = $rkasPerubahan->get($kode) ?? collect();
            $itemsMurni = $rkasMurni ? ($rkasMurni->get($kode) ?? collect()) : collect();

            if ($itemsPerubahan->isEmpty() && $itemsMurni->isEmpty()) {
                continue;
            }

            $firstItem = $itemsPerubahan->first() ?? $itemsMurni->first();

            $bagian = explode('.', $kode);
            $kodeProgram = $bagian[0];

            if (! isset($terorganisir[$kodeProgram])) {
                $terorganisir[$kodeProgram] = [
                    'uraian' => optional($firstItem->kodeKegiatan)->program ?? '-',
                    'sub_programs' => [],
                    'jumlah' => 0,
                    'tahap1' => 0,
                    'tahap2' => 0,
                    'jumlah_murni' => 0,
                ];
            }

            $kodeSubProgram = count($bagian) > 1 ? $bagian[0].'.'.$bagian[1] : null;
            if ($kodeSubProgram && ! isset($terorganisir[$kodeProgram]['sub_programs'][$kodeSubProgram])) {
                $terorganisir[$kodeProgram]['sub_programs'][$kodeSubProgram] = [
                    'uraian' => optional($firstItem->kodeKegiatan)->sub_program ?? '-',
                    'uraian_programs' => [],
                    'jumlah' => 0,
                    'tahap1' => 0,
                    'tahap2' => 0,
                    'jumlah_murni' => 0,
                ];
            }

            $kodeUraian = $kode;
            if ($kodeSubProgram && ! isset($terorganisir[$kodeProgram]['sub_programs'][$kodeSubProgram]['uraian_programs'][$kodeUraian])) {
                $terorganisir[$kodeProgram]['sub_programs'][$kodeSubProgram]['uraian_programs'][$kodeUraian] = [
                    'uraian' => optional($firstItem->kodeKegiatan)->uraian ?? '-',
                    'items' => [],
                    'jumlah' => 0,
                    'tahap1' => 0,
                    'tahap2' => 0,
                    'jumlah_murni' => 0,
                ];
            }

            $groupedItems = [];
            $perubahanArkasAssigned = [];

            // Process Murni Items (sorted deterministically by id)
            foreach ($itemsMurni->sortBy('id') as $item) {
                // Key without ID because ID changes between Murni and Perubahan tables usually
                $key = ($item->rekeningBelanja->kode_rekening ?? '-').'-'.$item->uraian.'-'.(float) $item->harga_satuan;

                if (! isset($groupedItems[$key])) {
                    $groupedItems[$key] = [
                        'id' => null,
                        'kode_id' => $item->kode_id ?? null,
                        'kode_rekening' => $item->rekeningBelanja->kode_rekening ?? '-',
                        'kode_kegiatan' => $item->kodeKegiatan->kode ?? '-',
                        'program_code' => $item->kodeKegiatan->kode ?? '-',
                        'uraian' => $this->resolveDisplayUraian($item, $useArkas),
                        'uraian_sikas' => $item->uraian,
                        'uraian_arkas' => filled($item->uraian_arkas) ? trim((string) $item->uraian_arkas) : null,
                        'uraian_gabungan' => $item->uraian_gabungan,
                        'uraian_gabungan_t1' => null,
                        'uraian_gabungan_t2' => null,
                        'rkas_ids' => [],
                        'rkas_ids_per_bulan' => [], // Added for precise Gabung Kegiatan matching
                        'murni_rkas_ids' => [],
                        'murni_rkas_ids_per_bulan' => [],
                        'tarif' => $item->harga_satuan,
                        'harga_satuan' => $item->harga_satuan,
                        'satuan' => $item->satuan,
                        'volume' => 0,
                        'jumlah' => 0,
                        'tahap1' => 0,
                        'tahap2' => 0,
                        'volume_murni' => 0,
                        'jumlah_murni' => 0,
                        'bulanan' => [],
                        // RP Fields
                        'kode_rekening_id' => $item->rekeningBelanja->id ?? null,
                        'nama_penerima' => $item->nama_penerima,
                        'jabatan' => $item->jabatan,
                        'nomor_rekening' => $item->nomor_rekening,
                        'bank' => $item->bank,
                        'ada_npwp' => $item->ada_npwp,
                        'pot_ppn' => $item->pot_ppn,
                        'pot_pph23' => $item->pot_pph23,
                        'pot_pph21' => $item->pot_pph21,
                        'pot_pph21_narasumber' => $item->pot_pph21_narasumber,
                        'status_penerima' => $item->status_penerima,
                        'golongan' => $item->golongan,
                        'pot_ppn_t1' => 0,
                        'pot_ppn_t2' => 0,
                        'pot_pph23_t1' => 0,
                        'pot_pph23_t2' => 0,
                        'pot_pph21_t1' => 0,
                        'pot_pph21_t2' => 0,
                        'pot_pph21_narasumber_t1' => 0,
                        'pot_pph21_narasumber_t2' => 0,
                        'is_ppn' => (bool) ($item->rekeningBelanja->is_ppn ?? false),
                        'is_pph21' => (bool) ($item->rekeningBelanja->is_pph21 ?? false),
                        'is_pph22' => (bool) ($item->rekeningBelanja->is_pph22 ?? false),
                        'is_pph23' => (bool) ($item->rekeningBelanja->is_pph23 ?? false),
                        'is_pph4' => (bool) ($item->rekeningBelanja->is_pph4 ?? false),
                    ];
                } else {
                    if (empty($groupedItems[$key]['uraian_arkas']) && filled($item->uraian_arkas)) {
                        $trimmedArkas = trim((string) $item->uraian_arkas);
                        $groupedItems[$key]['uraian_arkas'] = $trimmedArkas;
                        if ($useArkas) {
                            $groupedItems[$key]['uraian'] = $trimmedArkas;
                        }
                    }
                    if (empty($groupedItems[$key]['nama_penerima']) && ! empty($item->nama_penerima)) {
                        $groupedItems[$key]['nama_penerima'] = $item->nama_penerima;
                        $groupedItems[$key]['jabatan'] = $item->jabatan;
                        $groupedItems[$key]['nomor_rekening'] = $item->nomor_rekening;
                        $groupedItems[$key]['bank'] = $item->bank;
                        $groupedItems[$key]['ada_npwp'] = $item->ada_npwp;
                        $groupedItems[$key]['status_penerima'] = $item->status_penerima;
                        $groupedItems[$key]['golongan'] = $item->golongan;
                    }
                    if (empty($groupedItems[$key]['pot_ppn']) && ! empty($item->pot_ppn)) {
                        $groupedItems[$key]['pot_ppn'] = $item->pot_ppn;
                    }
                    if (empty($groupedItems[$key]['pot_pph23']) && ! empty($item->pot_pph23)) {
                        $groupedItems[$key]['pot_pph23'] = $item->pot_pph23;
                    }
                    if (empty($groupedItems[$key]['pot_pph21']) && ! empty($item->pot_pph21)) {
                        $groupedItems[$key]['pot_pph21'] = $item->pot_pph21;
                    }
                }

                $groupedItems[$key]['murni_rkas_ids'][] = $item->id;
                if (! isset($groupedItems[$key]['murni_rkas_ids_per_bulan'][$item->bulan])) {
                    $groupedItems[$key]['murni_rkas_ids_per_bulan'][$item->bulan] = [];
                }
                $groupedItems[$key]['murni_rkas_ids_per_bulan'][$item->bulan][] = $item->id;

                $groupedItems[$key]['volume_murni'] += $item->jumlah;
                $groupedItems[$key]['jumlah_murni'] += ($item->jumlah * $item->harga_satuan);
            }

            // Process Perubahan Items (sorted deterministically by id)
            foreach ($itemsPerubahan->sortBy('id') as $item) {
                $key = ($item->rekeningBelanja->kode_rekening ?? '-').'-'.$item->uraian.'-'.(float) $item->harga_satuan;

                if (! isset($groupedItems[$key])) {
                    $groupedItems[$key] = [
                        'id' => $item->id,
                        'kode_id' => $item->kode_id ?? null,
                        'kode_rekening' => $item->rekeningBelanja->kode_rekening ?? '-',
                        'kode_kegiatan' => $item->kodeKegiatan->kode ?? '-',
                        'program_code' => $item->kodeKegiatan->kode ?? '-',
                        'uraian' => $this->resolveDisplayUraian($item, $useArkas),
                        'uraian_sikas' => $item->uraian,
                        'uraian_arkas' => filled($item->uraian_arkas) ? trim((string) $item->uraian_arkas) : null,
                        'uraian_gabungan' => $item->uraian_gabungan,
                        'uraian_gabungan_t1' => null,
                        'uraian_gabungan_t2' => null,
                        'rkas_ids' => [],
                        'rkas_ids_per_bulan' => [], // Added for precise Gabung Kegiatan matching
                        'murni_rkas_ids' => [],
                        'murni_rkas_ids_per_bulan' => [],
                        'tarif' => $item->harga_satuan,
                        'harga_satuan' => $item->harga_satuan,
                        'satuan' => $item->satuan,
                        'volume' => 0,
                        'jumlah' => 0,
                        'tahap1' => 0,
                        'tahap2' => 0,
                        'volume_murni' => 0,
                        'jumlah_murni' => 0,
                        'bulanan' => [],
                        // RP Fields
                        'kode_rekening_id' => $item->rekeningBelanja->id ?? null,
                        'nama_penerima' => $item->nama_penerima,
                        'jabatan' => $item->jabatan,
                        'nomor_rekening' => $item->nomor_rekening,
                        'bank' => $item->bank,
                        'ada_npwp' => $item->ada_npwp,
                        'pot_ppn' => $item->pot_ppn,
                        'pot_pph23' => $item->pot_pph23,
                        'pot_pph21' => $item->pot_pph21,
                        'pot_pph21_narasumber' => $item->pot_pph21_narasumber,
                        'status_penerima' => $item->status_penerima,
                        'golongan' => $item->golongan,
                        'pot_ppn_t1' => 0,
                        'pot_ppn_t2' => 0,
                        'pot_pph23_t1' => 0,
                        'pot_pph23_t2' => 0,
                        'pot_pph21_t1' => 0,
                        'pot_pph21_t2' => 0,
                        'pot_pph21_narasumber_t1' => 0,
                        'pot_pph21_narasumber_t2' => 0,
                        'is_ppn' => (bool) ($item->rekeningBelanja->is_ppn ?? false),
                        'is_pph21' => (bool) ($item->rekeningBelanja->is_pph21 ?? false),
                        'is_pph22' => (bool) ($item->rekeningBelanja->is_pph22 ?? false),
                        'is_pph23' => (bool) ($item->rekeningBelanja->is_pph23 ?? false),
                        'is_pph4' => (bool) ($item->rekeningBelanja->is_pph4 ?? false),
                    ];
                    if (filled($item->uraian_arkas)) {
                        $perubahanArkasAssigned[$key] = true;
                    }
                } else {
                    if (! isset($perubahanArkasAssigned[$key]) && filled($item->uraian_arkas)) {
                        $trimmedArkas = trim((string) $item->uraian_arkas);
                        $groupedItems[$key]['uraian_arkas'] = $trimmedArkas;
                        if ($useArkas) {
                            $groupedItems[$key]['uraian'] = $trimmedArkas;
                        }
                        $perubahanArkasAssigned[$key] = true;
                    }
                    if (empty($groupedItems[$key]['nama_penerima']) && ! empty($item->nama_penerima)) {
                        $groupedItems[$key]['nama_penerima'] = $item->nama_penerima;
                        $groupedItems[$key]['jabatan'] = $item->jabatan;
                        $groupedItems[$key]['nomor_rekening'] = $item->nomor_rekening;
                        $groupedItems[$key]['bank'] = $item->bank;
                        $groupedItems[$key]['ada_npwp'] = $item->ada_npwp;
                        $groupedItems[$key]['status_penerima'] = $item->status_penerima;
                        $groupedItems[$key]['golongan'] = $item->golongan;
                    }
                    if (empty($groupedItems[$key]['pot_ppn']) && ! empty($item->pot_ppn)) {
                        $groupedItems[$key]['pot_ppn'] = $item->pot_ppn;
                    }
                    if (empty($groupedItems[$key]['pot_pph23']) && ! empty($item->pot_pph23)) {
                        $groupedItems[$key]['pot_pph23'] = $item->pot_pph23;
                    }
                    if (empty($groupedItems[$key]['pot_pph21']) && ! empty($item->pot_pph21)) {
                        $groupedItems[$key]['pot_pph21'] = $item->pot_pph21;
                    }
                }

                $groupedItems[$key]['rkas_ids'][] = $item->id;
                if (! isset($groupedItems[$key]['rkas_ids_per_bulan'][$item->bulan])) {
                    $groupedItems[$key]['rkas_ids_per_bulan'][$item->bulan] = [];
                }
                $groupedItems[$key]['rkas_ids_per_bulan'][$item->bulan][] = $item->id;

                $jumlah = $item->jumlah * $item->harga_satuan;
                $isTahap1 = in_array($item->bulan, ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni']);
                $bulan = $item->bulan;

                $groupedItems[$key]['volume'] += $item->jumlah;
                $groupedItems[$key]['jumlah'] += $jumlah;

                if ($isTahap1) {
                    $groupedItems[$key]['pot_ppn_t1'] += $item->pot_ppn;
                    $groupedItems[$key]['pot_pph23_t1'] += $item->pot_pph23;
                    $groupedItems[$key]['pot_pph21_t1'] += $item->pot_pph21;
                    $groupedItems[$key]['pot_pph21_narasumber_t1'] += $item->pot_pph21_narasumber;
                    $groupedItems[$key]['tahap1'] += $jumlah;
                    if (! empty($item->uraian_gabungan)) {
                        $groupedItems[$key]['uraian_gabungan_t1'] = $item->uraian_gabungan;
                    }
                } else {
                    $groupedItems[$key]['pot_ppn_t2'] += $item->pot_ppn;
                    $groupedItems[$key]['pot_pph23_t2'] += $item->pot_pph23;
                    $groupedItems[$key]['pot_pph21_t2'] += $item->pot_pph21;
                    $groupedItems[$key]['pot_pph21_narasumber_t2'] += $item->pot_pph21_narasumber;
                    $groupedItems[$key]['tahap2'] += $jumlah;
                    if (! empty($item->uraian_gabungan)) {
                        $groupedItems[$key]['uraian_gabungan_t2'] = $item->uraian_gabungan;
                    }
                }

                if (! isset($groupedItems[$key]['bulanan'][$bulan])) {
                    $groupedItems[$key]['bulanan'][$bulan] = [
                        'volume' => 0,
                        'total' => 0,
                        'pot_ppn' => 0,
                        'pot_pph23' => 0,
                        'pot_pph21' => 0,
                        'pot_pph21_narasumber' => 0,
                        'nama_penerima' => $item->nama_penerima,
                        'jabatan' => $item->jabatan,
                        'nomor_rekening' => $item->nomor_rekening,
                        'bank' => $item->bank,
                        'ada_npwp' => $item->ada_npwp,
                        'status_penerima' => $item->status_penerima,
                        'golongan' => $item->golongan,
                    ];
                }

                $groupedItems[$key]['bulanan'][$bulan]['volume'] += $item->jumlah;
                $groupedItems[$key]['bulanan'][$bulan]['total'] += $jumlah;
                $groupedItems[$key]['bulanan'][$bulan]['pot_ppn'] += $item->pot_ppn;
                $groupedItems[$key]['bulanan'][$bulan]['pot_pph23'] += $item->pot_pph23;
                $groupedItems[$key]['bulanan'][$bulan]['pot_pph21'] += $item->pot_pph21;
                $groupedItems[$key]['bulanan'][$bulan]['pot_pph21_narasumber'] += $item->pot_pph21_narasumber;
            }

            $target = &$terorganisir[$kodeProgram]['sub_programs'][$kodeSubProgram]['uraian_programs'][$kodeUraian];
            $target['items'] = array_values($groupedItems);

            $target['jumlah'] = collect($target['items'])->sum('jumlah');
            $target['tahap1'] = collect($target['items'])->sum('tahap1');
            $target['tahap2'] = collect($target['items'])->sum('tahap2');
            $target['jumlah_murni'] = collect($target['items'])->sum('jumlah_murni');

            $subTarget = &$terorganisir[$kodeProgram]['sub_programs'][$kodeSubProgram];
            $subTarget['jumlah'] += $target['jumlah'];
            $subTarget['tahap1'] += $target['tahap1'];
            $subTarget['tahap2'] += $target['tahap2'];
            $subTarget['jumlah_murni'] += $target['jumlah_murni'];

            $progTarget = &$terorganisir[$kodeProgram];
            $progTarget['jumlah'] += $target['jumlah'];
            $progTarget['tahap1'] += $target['tahap1'];
            $progTarget['tahap2'] += $target['tahap2'];
            $progTarget['jumlah_murni'] += $target['jumlah_murni'];
        }

        return $terorganisir;
    }

    /**
     * Mendapatkan data untuk grafik proporsi anggaran - BERDASARKAN KODE KEGIATAN
     */
    private function getGrafikData($penganggaranId)
    {
        Log::info('?? [GRAFIK_DEBUG_NEW] Starting getGrafikData for penganggaran_id: '.$penganggaranId);

        try {
            // Total pagu anggaran
            $penganggaran = ($this->Penganggaran)::find($penganggaranId);
            $totalPagu = $penganggaran->pagu_anggaran ?? 0;

            Log::info('🔍 [GRAFIK_DEBUG] Total pagu anggaran: '.number_format($totalPagu, 2));

            // 1. Hitung anggaran BUKU - BERDASARKAN KODE KEGIATAN
            $bukuAnggaran = ($this->RkasPerubahan)::where(VariantConfig::penganggaranFk($this->variant), $penganggaranId)
                ->whereHas('kodeKegiatan', function ($query) {
                    // Kode kegiatan yang terkait dengan buku
                    $query->where('kode', 'like', '05.02.%') // Pengembangan Perpustakaan
                        ->orWhere('kode', 'like', '02.02.%') // Kegiatan pemberdayaan perpustakaan
                        ->orWhere('kode', 'like', '03.02.%') // Pengembangan Perpustakaan
                        ->orWhere('sub_program', 'ilike', '%perpustakaan%')
                        ->orWhere('uraian', 'ilike', '%buku%')
                        ->orWhere('uraian', 'ilike', '%perpustakaan%');
                })
                ->get()
                ->sum(function ($item) {
                    return $item->jumlah * $item->harga_satuan;
                });

            Log::info('📚 [GRAFIK_DEBUG] Buku anggaran calculated: '.number_format($bukuAnggaran, 2));

            // 2. Hitung anggaran HONOR - BERDASARKAN KODE KEGIATAN
            $honorAnggaran = ($this->RkasPerubahan)::where(VariantConfig::penganggaranFk($this->variant), $penganggaranId)
                ->whereHas('kodeKegiatan', function ($query) {
                    // Kode kegiatan yang terkait dengan honor/gaji
                    $query->where('kode', 'like', '07.12.%') // Pembayaran Honor
                        ->orWhere('sub_program', 'ilike', '%honor%')
                        ->orWhere('sub_program', 'ilike', '%gaji%')
                        ->orWhere('uraian', 'ilike', '%honor%')
                        ->orWhere('uraian', 'ilike', '%gaji%')
                        ->orWhere('uraian', 'ilike', '%pembayaran%guru%')
                        ->orWhere('uraian', 'ilike', '%pembayaran%tenaga%');
                })
                ->get()
                ->sum(function ($item) {
                    return $item->jumlah * $item->harga_satuan;
                });

            Log::info('💰 [GRAFIK_DEBUG] Honor anggaran calculated: '.number_format($honorAnggaran, 2));

            // PERBAIKAN: Hitung persentase honor dari 100% total pagu
            $honorPercentage = $totalPagu > 0 ? ($honorAnggaran / $totalPagu) * 100 : 0;
            Log::info('💰 [GRAFIK_DEBUG] Honor percentage dari 100% pagu: '.number_format($honorPercentage, 2).'%');

            // 3. Hitung anggaran SARPRAS - BERDASARKAN KODE KEGIATAN (05.08.01.)
            $sarprasAnggaran = ($this->RkasPerubahan)::where(VariantConfig::penganggaranFk($this->variant), $penganggaranId)
                ->whereHas('kodeKegiatan', function ($query) {
                    // Kode kegiatan Pemeliharaan Prasarana Lahan, Bangunan dan Ruang
                    $query->where('kode', 'like', '05.08.01%')
                        ->orWhere('kode', 'like', '05.08.03%')
                        ->orWhere('kode', 'like', '05.08.05%')
                        ->orWhere('kode', 'like', '05.08.10%');
                })
                ->get()
                ->sum(function ($item) {
                    return $item->jumlah * $item->harga_satuan;
                });

            $bkuDetailTable = app($this->BukuKasUmumUraianDetail)->getTable();
            $bkuTable = app($this->BukuKasUmum)->getTable();
            $bkuFk = VariantConfig::bkuFk($this->variant);
            $penganggaranFk = VariantConfig::penganggaranFk($this->variant);

            $sarprasSpent = \DB::table($bkuDetailTable)
                ->join($bkuTable, "{$bkuTable}.id", '=', "{$bkuDetailTable}.{$bkuFk}")
                ->join('kode_kegiatans', 'kode_kegiatans.id', '=', "{$bkuDetailTable}.kode_kegiatan_id")
                ->where("{$bkuTable}.{$penganggaranFk}", $penganggaranId)
                ->where(function ($q) {
                    $q->where('kode_kegiatans.kode', 'like', '05.08.01%')
                        ->orWhere('kode_kegiatans.kode', 'like', '05.08.03%')
                        ->orWhere('kode_kegiatans.kode', 'like', '05.08.05%')
                        ->orWhere('kode_kegiatans.kode', 'like', '05.08.10%');
                })
                ->sum("{$bkuDetailTable}.jumlah");

            Log::info('🏫 [GRAFIK_DEBUG] Sarpras anggaran calculated: '.number_format($sarprasAnggaran, 2));
            Log::info('🏫 [GRAFIK_DEBUG] Sarpras spent calculated: '.number_format($sarprasSpent, 2));
            Log::info('🏫 [GRAFIK_DEBUG] Sarpras percentage: '.($totalPagu > 0 ? number_format(($sarprasAnggaran / $totalPagu) * 100, 2) : 0).'%');

            // 4. Data untuk grafik jenis belanja lainnya - BERDASARKAN REKENING BELANJA SAJA
            $jenisBelanjaData = ($this->RkasPerubahan)::where(VariantConfig::penganggaranFk($this->variant), $penganggaranId)
                ->with(['kodeKegiatan', 'rekeningBelanja'])
                ->get()
                ->groupBy(function ($item) {
                    // Group by kombinasi kode kegiatan dan rekening belanja
                    $kodeKegiatan = $item->kodeKegiatan->kode ?? '';
                    $kodeRekening = $item->rekeningBelanja->kode_rekening ?? '';

                    // HONORARIUM - Ambil dari kode kegiatan spesifik
                    $honorariumKegiatanCodes = [
                        '07.12.01.',
                        '07.12.02.',
                        '07.12.03.',
                        '07.12.04.',
                    ];

                    // Cek apakah kode kegiatan termasuk honorarium
                    foreach ($honorariumKegiatanCodes as $honorCode) {
                        if (strpos($kodeKegiatan, $honorCode) === 0) {
                            return 'Honorarium';
                        }
                    }

                    // Kategorikan berdasarkan kode rekening
                    if (strpos($kodeRekening, '5.1.02.01') === 0) {
                        return 'Barang';
                    } elseif (strpos($kodeRekening, '5.1.02.02') === 0) {
                        return 'Jasa';
                    } elseif (strpos($kodeRekening, '5.1.02.03') === 0) {
                        return 'Pemeliharaan';
                    } elseif (strpos($kodeRekening, '5.1.02.04') === 0) {
                        return 'Perjalanan Dinas';
                    } elseif (strpos($kodeRekening, '5.2.02') === 0) {
                        return 'Modal Peralatan Mesin';
                    } elseif (strpos($kodeRekening, '5.2.05') === 0) {
                        return 'Modal Aset Tetap Lainnya';
                    } else {
                        return 'Belum di Anggarkan';
                    }
                })
                ->map(function ($group, $category) use ($totalPagu) {
                    $total = $group->sum(function ($item) {
                        return $item->jumlah * $item->harga_satuan;
                    });

                    $percentage = $totalPagu > 0 ? ($total / $totalPagu) * 100 : 0;

                    return [
                        'label' => $category,
                        'value' => $percentage,
                        'percentage' => number_format($percentage, 2).'%',
                        'color' => $this->getRandomColor(),
                        'total' => number_format($total, 2),
                    ];
                })
                ->sortByDesc('value')
                ->values();

            Log::info('📊 [GRAFIK_DEBUG] Jenis belanja data count: '.$jenisBelanjaData->count());

            $grafikData = [
                'buku_anggaran' => $bukuAnggaran,
                'honor_anggaran' => $honorAnggaran,
                'sarpras_anggaran' => $sarprasAnggaran,
                'sarpras_spent' => $sarprasSpent,
                'jenis_belanja' => $jenisBelanjaData,
                'total_pagu' => $totalPagu,
                'honor_percentage' => $honorPercentage,
            ];

            Log::info('✅ [GRAFIK_DEBUG] Final grafik data result: ', [
                'total_pagu' => $totalPagu,
                'buku_anggaran' => $bukuAnggaran,
                'buku_persentase' => $totalPagu > 0 ? ($bukuAnggaran / $totalPagu) * 100 : 0,
                'honor_anggaran' => $honorAnggaran,
                'honor_persentase_dari_100pagu' => $honorPercentage,
                'sarpras_anggaran' => $sarprasAnggaran,
                'sarpras_persentase' => $totalPagu > 0 ? ($sarprasAnggaran / $totalPagu) * 100 : 0,
            ]);

            return $grafikData;
        } catch (\Exception $e) {
            Log::error('❌ [GRAFIK_DEBUG] Error in getGrafikData: '.$e->getMessage());
            Log::error('❌ [GRAFIK_DEBUG] Stack trace: '.$e->getTraceAsString());

            return [
                'buku_anggaran' => 0,
                'honor_anggaran' => 0,
                'sarpras_anggaran' => 0,
                'jenis_belanja' => collect(),
                'total_pagu' => 0,
                'honor_percentage' => 0,
            ];
        }
    }

    /**
     * Generate random color for charts
     */
    private function getRandomColor()
    {
        $colors = [
            '#4DB6AC',
            '#F48FB1',
            '#EE82EE',
            '#9FA8DA',
            '#4FC3F7',
            '#BA68C8',
            '#4DD0E1',
            '#7986CB',
            '#81D4FA',
            '#FFB74D',
            '#9575CD',
            '#F48FB1',
            '#7986CB',
        ];

        return $colors[array_rand($colors)];
    }

    private function calculateTotalTahap1($penganggaranId)
    {
        return ($this->RkasPerubahan)::where(VariantConfig::penganggaranFk($this->variant), $penganggaranId)
            ->whereIn('bulan', ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'])
            ->sum(DB::raw('jumlah * harga_satuan'));
    }

    private function calculateTotalTahap2($penganggaranId)
    {
        return ($this->RkasPerubahan)::where(VariantConfig::penganggaranFk($this->variant), $penganggaranId)
            ->whereIn('bulan', ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'])
            ->sum(DB::raw('jumlah * harga_satuan'));
    }

    public function logs($id)
    {
        $logs = ($this->RekamanPerubahan)::where(VariantConfig::penganggaranFk($this->variant), $id)
            ->latest()
            ->get()
            ->map(function ($log) {
                return [
                    'id' => $log->id,
                    'action' => $log->action,
                    'description' => $log->description,
                    'created_at' => $log->created_at->format('d M Y H:i:s'),
                    'elapsed' => $log->created_at->diffForHumans(),
                ];
            });

        return response()->json(['data' => $logs]);
    }

    private function logAction($penganggaranId, $action, $description, $oldData = null, $newData = null)
    {
        if (! $this->RekamanPerubahan || ! class_exists($this->RekamanPerubahan)) {
            return;
        }

        ($this->RekamanPerubahan)::create([
            VariantConfig::penganggaranFk($this->variant) => $penganggaranId,
            'action' => $action,
            'description' => $description,
            'old_data' => $oldData,
            'new_data' => $newData,
        ]);
    }

    // PDF Exports
    public function generateTahapanPdf($id, Request $request)
    {
        $penganggaran = ($this->Penganggaran)::with('sekolah')->findOrFail($id);
        $penganggaran->setAttribute('sumber_dana', VariantConfig::title($this->variant));
        $rkasData = ($this->RkasPerubahan)::with(['kodeKegiatan', 'rekeningBelanja'])
            ->where(VariantConfig::penganggaranFk($this->variant), $id)
            ->get();

        $rkasMurniData = ($this->Rkas)::with(['kodeKegiatan', 'rekeningBelanja'])
            ->where(VariantConfig::penganggaranFk($this->variant), $id)
            ->get();

        $groupedRkas = $rkasData->groupBy(function ($item) {
            return optional($item->kodeKegiatan)->kode;
        })->filter(fn ($group, $key) => ! is_null($key));

        $groupedMurni = $rkasMurniData->groupBy(function ($item) {
            return optional($item->kodeKegiatan)->kode;
        })->filter(fn ($group, $key) => ! is_null($key));

        $tahapanData = $this->kelolaDataRkas($groupedRkas, $groupedMurni, $this->isArkasUraianMode($request));

        // Calculate Totals for Footer
        $totalTahap1 = $rkasData->whereIn('bulan', ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'])
            ->sum(fn ($i) => $i->jumlah * $i->harga_satuan);
        $totalTahap2 = $rkasData->whereIn('bulan', ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'])
            ->sum(fn ($i) => $i->jumlah * $i->harga_satuan);

        // Get Print Settings
        $paperSize = $request->input('paper_size', 'A4');
        $orientation = $request->input('orientation', 'portrait');
        $fontSize = $request->input('font_size', '12pt');

        $pdf = Pdf::loadView('rkas_perubahan_tahapan_pdf', [
            'anggaran' => $penganggaran,
            'tahapanData' => $tahapanData,
            'totalTahap1' => $totalTahap1,
            'totalTahap2' => $totalTahap2,
            'paper_size' => $paperSize,
            'orientation' => $orientation,
            'font_size' => $fontSize,
        ]);

        return $pdf->setPaper($paperSize, $orientation)->stream('rkas_perubahan_tahapan.pdf');
    }

    public function generateTahapanExcel($id, Request $request)
    {
        $penganggaran = ($this->Penganggaran)::with('sekolah')->findOrFail($id);
        $penganggaran->setAttribute('sumber_dana', VariantConfig::title($this->variant));
        $rkasData = ($this->RkasPerubahan)::with(['kodeKegiatan', 'rekeningBelanja'])
            ->where(VariantConfig::penganggaranFk($this->variant), $id)
            ->get();

        $rkasMurniData = ($this->Rkas)::with(['kodeKegiatan', 'rekeningBelanja'])
            ->where(VariantConfig::penganggaranFk($this->variant), $id)
            ->get();

        $groupedRkas = $rkasData->groupBy(function ($item) {
            return optional($item->kodeKegiatan)->kode;
        })->filter(fn ($group, $key) => ! is_null($key));

        $groupedMurni = $rkasMurniData->groupBy(function ($item) {
            return optional($item->kodeKegiatan)->kode;
        })->filter(fn ($group, $key) => ! is_null($key));

        $tahapanData = $this->kelolaDataRkas($groupedRkas, $groupedMurni, $this->isArkasUraianMode($request));

        // Calculate Totals for Footer
        $totalTahap1 = $rkasData->whereIn('bulan', ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'])
            ->sum(fn ($i) => $i->jumlah * $i->harga_satuan);
        $totalTahap2 = $rkasData->whereIn('bulan', ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'])
            ->sum(fn ($i) => $i->jumlah * $i->harga_satuan);

        $html = view('rkas_perubahan_tahapan_pdf', [
            'anggaran' => $penganggaran,
            'tahapanData' => $tahapanData,
            'totalTahap1' => $totalTahap1,
            'totalTahap2' => $totalTahap2,
            'paper_size' => 'A4',
            'orientation' => 'landscape', // Excel usually better in landscape implicitly
            'font_size' => '11pt',
            'is_excel' => true,
        ])->render();

        return response($html)
            ->header('Content-Type', 'application/vnd.ms-excel')
            ->header('Content-Disposition', 'attachment; filename="rkas_perubahan_tahapan_'.$penganggaran->tahun_anggaran.'.xls"');
    }

    public function exportAlurKasPdf(Request $request, $id)
    {
        $penganggaran = ($this->Penganggaran)::with('sekolah')->findOrFail($id);
        $penganggaran->setAttribute('sumber_dana', VariantConfig::title($this->variant));

        $rkasData = ($this->RkasPerubahan)::with(['kodeKegiatan', 'rekeningBelanja'])
            ->where(VariantConfig::penganggaranFk($this->variant), $id)
            ->get();

        $rkasMurniData = ($this->Rkas)::with(['kodeKegiatan', 'rekeningBelanja'])
            ->where(VariantConfig::penganggaranFk($this->variant), $id)
            ->get();

        $groupedRkas = $rkasData->groupBy(function ($item) {
            return optional($item->kodeKegiatan)->kode;
        })->filter(fn ($group, $key) => ! is_null($key));

        $groupedMurni = $rkasMurniData->groupBy(function ($item) {
            return optional($item->kodeKegiatan)->kode;
        })->filter(fn ($group, $key) => ! is_null($key));

        $tahapanData = $this->kelolaDataRkas($groupedRkas, $groupedMurni);
        $months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

        $pdf = Pdf::loadView('alur-kas-perubahan', [
            'anggaran' => $penganggaran,
            'tahapanData' => $tahapanData,
            'months' => $months,
            'paper_size' => $request->input('paper_size', 'F4'),
            'orientation' => $request->input('orientation', 'landscape'),
            'font_size' => $request->input('font_size', '11pt'),
            'is_excel' => false,
        ])->setPaper($request->input('paper_size', 'F4'), $request->input('orientation', 'landscape'));

        return $pdf->stream('alur_kas_perubahan_'.($penganggaran->sekolah->nama_sekolah ?? 'sekolah').'.pdf');
    }

    public function exportAlurKasExcel(Request $request, $id)
    {
        $penganggaran = ($this->Penganggaran)::with('sekolah')->findOrFail($id);
        $penganggaran->setAttribute('sumber_dana', VariantConfig::title($this->variant));

        $rkasData = ($this->RkasPerubahan)::with(['kodeKegiatan', 'rekeningBelanja'])
            ->where(VariantConfig::penganggaranFk($this->variant), $id)
            ->get();

        $rkasMurniData = ($this->Rkas)::with(['kodeKegiatan', 'rekeningBelanja'])
            ->where(VariantConfig::penganggaranFk($this->variant), $id)
            ->get();

        $groupedRkas = $rkasData->groupBy(function ($item) {
            return optional($item->kodeKegiatan)->kode;
        })->filter(fn ($group, $key) => ! is_null($key));

        $groupedMurni = $rkasMurniData->groupBy(function ($item) {
            return optional($item->kodeKegiatan)->kode;
        })->filter(fn ($group, $key) => ! is_null($key));

        $tahapanData = $this->kelolaDataRkas($groupedRkas, $groupedMurni);
        $months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

        $html = view('alur-kas-perubahan', [
            'anggaran' => $penganggaran,
            'tahapanData' => $tahapanData,
            'months' => $months,
            'paper_size' => $request->input('paper_size', 'A4'),
            'orientation' => 'landscape',
            'font_size' => '11pt',
            'is_excel' => true,
        ])->render();

        return response($html)
            ->header('Content-Type', 'application/vnd.ms-excel')
            ->header('Content-Disposition', 'attachment; filename="alur_kas_perubahan_'.($penganggaran->sekolah->nama_sekolah ?? 'sekolah').'.xls"');
    }

    public function exportRpPdf(Request $request, $id)
    {
        $penganggaran = ($this->Penganggaran)::with('sekolah')->findOrFail($id);
        $penganggaran->setAttribute('sumber_dana', VariantConfig::title($this->variant));

        $rkasData = ($this->RkasPerubahan)::with(['kodeKegiatan', 'rekeningBelanja'])
            ->where(VariantConfig::penganggaranFk($this->variant), $id)
            ->get();

        $rkasMurniData = ($this->Rkas)::with(['kodeKegiatan', 'rekeningBelanja'])
            ->where(VariantConfig::penganggaranFk($this->variant), $id)
            ->get();

        $groupedRkas = $rkasData->groupBy(function ($item) {
            return optional($item->kodeKegiatan)->kode;
        })->filter(fn ($group, $key) => ! is_null($key));

        $groupedMurni = $rkasMurniData->groupBy(function ($item) {
            return optional($item->kodeKegiatan)->kode;
        })->filter(fn ($group, $key) => ! is_null($key));

        $tahapanData = $this->kelolaDataRkas($groupedRkas, $groupedMurni, $this->isArkasUraianMode($request));

        $tahap = $request->tahap ?? 1;
        $bulan = $request->bulan ?? 'Semua';
        $kwitansiMap = $this->getKwitansiMap($id);

        $pdf = Pdf::loadView('laporan.rincian_pencairan', [
            'anggaran' => $penganggaran->toArray(),
            'tahapanData' => $tahapanData,
            'tahap' => $tahap,
            'bulan' => $bulan,
            'kwitansiMap' => $kwitansiMap,
            'is_perubahan' => true,
            'paper_size' => $request->paper_size ?? 'A4',
            'orientation' => $request->orientation ?? 'landscape',
            'font_size' => $request->font_size ?? '10pt',
            'is_excel' => false,
        ])->setPaper($request->paper_size ?? 'A4', $request->orientation ?? 'landscape');

        $filename_bulan = $bulan !== 'Semua' ? '_'.strtolower($bulan) : '';

        return $pdf->stream('rincian_pencairan_perubahan_tahap'.$tahap.$filename_bulan.'_'.$penganggaran->tahun_anggaran.'.pdf');
    }

    public function exportRpExcel(Request $request, $id)
    {
        $penganggaran = ($this->Penganggaran)::with('sekolah')->findOrFail($id);
        $penganggaran->setAttribute('sumber_dana', VariantConfig::title($this->variant));

        $rkasData = ($this->RkasPerubahan)::with(['kodeKegiatan', 'rekeningBelanja'])
            ->where(VariantConfig::penganggaranFk($this->variant), $id)
            ->get();

        $rkasMurniData = ($this->Rkas)::with(['kodeKegiatan', 'rekeningBelanja'])
            ->where(VariantConfig::penganggaranFk($this->variant), $id)
            ->get();

        $groupedRkas = $rkasData->groupBy(function ($item) {
            return optional($item->kodeKegiatan)->kode;
        })->filter(fn ($group, $key) => ! is_null($key));

        $groupedMurni = $rkasMurniData->groupBy(function ($item) {
            return optional($item->kodeKegiatan)->kode;
        })->filter(fn ($group, $key) => ! is_null($key));

        $tahapanData = $this->kelolaDataRkas($groupedRkas, $groupedMurni, $this->isArkasUraianMode($request));

        $tahap = $request->tahap ?? 1;
        $bulan = $request->bulan ?? 'Semua';
        $kwitansiMap = $this->getKwitansiMap($id);

        $html = view('laporan.rincian_pencairan_excel', [
            'anggaran' => $penganggaran->toArray(),
            'tahapanData' => $tahapanData,
            'tahap' => $tahap,
            'bulan' => $bulan,
            'kwitansiMap' => $kwitansiMap,
            'is_excel' => true,
            'is_perubahan' => true,
        ])->render();

        $filename_bulan = $bulan !== 'Semua' ? '_'.strtolower($bulan) : '';

        return response($html)
            ->header('Content-Type', 'application/vnd.ms-excel')
            ->header('Content-Disposition', 'attachment; filename="rincian_pencairan_perubahan_tahap'.$tahap.$filename_bulan.'_'.$penganggaran->tahun_anggaran.'.xls"');
    }

    public function generatePdfRkaRekap($id, Request $request)
    {
        $penganggaran = ($this->Penganggaran)::with('sekolah')->findOrFail($id);
        $penganggaran->setAttribute('sumber_dana', VariantConfig::title($this->variant));
        $rkasData = ($this->RkasPerubahan)::with(['kodeKegiatan', 'rekeningBelanja'])
            ->where(VariantConfig::penganggaranFk($this->variant), $id)
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

        $rekapData = [];
        foreach ($hierarchyNames as $prefix => $label) {
            $sum = $rkasData->filter(function ($item) use ($prefix) {
                return str_starts_with($item->rekeningBelanja->kode_rekening ?? '', $prefix);
            })->sum(fn ($i) => $i->jumlah * $i->harga_satuan);

            $rekapData[] = [
                'kode_rekening' => $prefix,
                'uraian' => $label,
                'jumlah' => $sum,
            ];
        }

        $totalBelanja = collect($rekapData)->firstWhere('kode_rekening', '5')['jumlah'] ?? 0;
        $totalPendapatan = (float) $penganggaran->pagu_anggaran;
        $defisit = $totalPendapatan - $totalBelanja;

        $rekapData[] = ['kode_rekening' => '', 'uraian' => 'JUMLAH BELANJA', 'jumlah' => $totalBelanja];
        $rekapData[] = ['kode_rekening' => '', 'uraian' => 'DEFISIT', 'jumlah' => $defisit];

        // 4. Per Tahap Summary Data
        $sem1 = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
        $pendapatanTahap1 = $totalPendapatan / 2;
        $pendapatanTahap2 = $totalPendapatan / 2;

        $opsItems = $rkasData->filter(fn ($i) => str_starts_with($i->rekeningBelanja->kode_rekening ?? '', '5.1'));
        $opsTotal = $opsItems->sum(fn ($i) => $i->jumlah * $i->harga_satuan);
        $opsTahap1 = $opsItems->filter(fn ($i) => in_array($i->bulan, $sem1))->sum(fn ($i) => $i->jumlah * $i->harga_satuan);
        $opsTahap2 = $opsItems->filter(fn ($i) => ! in_array($i->bulan, $sem1))->sum(fn ($i) => $i->jumlah * $i->harga_satuan);

        $modalItems = $rkasData->filter(fn ($i) => str_starts_with($i->rekeningBelanja->kode_rekening ?? '', '5.2'));
        $modalTotal = $modalItems->sum(fn ($i) => $i->jumlah * $i->harga_satuan);
        $modalTahap1 = $modalItems->filter(fn ($i) => in_array($i->bulan, $sem1))->sum(fn ($i) => $i->jumlah * $i->harga_satuan);
        $modalTahap2 = $modalItems->filter(fn ($i) => ! in_array($i->bulan, $sem1))->sum(fn ($i) => $i->jumlah * $i->harga_satuan);

        $perTahapData = [
            ['no' => '1', 'uraian' => 'Pendapatan', 'tahap1' => $pendapatanTahap1, 'tahap2' => $pendapatanTahap2, 'total' => $totalPendapatan],
            ['no' => '2.1', 'uraian' => 'Belanja Operasi', 'tahap1' => $opsTahap1, 'tahap2' => $opsTahap2, 'total' => $opsTotal],
            ['no' => '2.2', 'uraian' => 'Belanja Modal', 'tahap1' => $modalTahap1, 'tahap2' => $modalTahap2, 'total' => $modalTotal],
        ];

        // Get Print Settings
        $paperSize = $request->input('paper_size', 'A4');
        $orientation = $request->input('orientation', 'portrait');
        $fontSize = $request->input('font_size', '12pt');

        $pdf = Pdf::loadView('rkas_perubahan_rekap_pdf', [
            'anggaran' => $penganggaran,
            'rekapData' => $rekapData,
            'perTahapData' => $perTahapData,
            'paper_size' => $paperSize,
            'orientation' => $orientation,
            'font_size' => $fontSize,
        ]);

        return $pdf->setPaper($paperSize, $orientation)->stream('rkas_perubahan_rekap.pdf');
    }

    public function generateRkaDuaSatuPdf($id, Request $request)
    {
        $penganggaran = ($this->Penganggaran)::with('sekolah')->findOrFail($id);
        $penganggaran->setAttribute('sumber_dana', VariantConfig::title($this->variant));
        $rkasData = ($this->RkasPerubahan)::with(['kodeKegiatan', 'rekeningBelanja'])
            ->where(VariantConfig::penganggaranFk($this->variant), $id)
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

        $allItems = $rkasData;
        $useArkas = $this->isArkasUraianMode($request);
        $itemRows = $allItems->map(function ($item) use ($useArkas) {
            return [
                'type' => 'item',
                'kode_rekening' => $item->rekeningBelanja->kode_rekening ?? '',
                'uraian' => $this->resolveDisplayUraian($item, $useArkas),
                'uraian_arkas' => filled($item->uraian_arkas) ? trim((string) $item->uraian_arkas) : null,
                'volume' => $item->jumlah,
                'satuan' => $item->satuan,
                'harga_satuan' => $item->harga_satuan,
                'jumlah' => $item->jumlah * $item->harga_satuan,
                'sort_key' => ($item->rekeningBelanja->kode_rekening ?? '').'Z',
            ];
        });

        $headerRows = collect();
        $headerTotals = [];

        foreach ($allItems as $item) {
            $code = $item->rekeningBelanja->kode_rekening ?? '';
            $val = $item->jumlah * $item->harga_satuan;

            foreach ($hierarchyNames as $hCode => $hName) {
                if (str_starts_with($code, $hCode)) {
                    if (! isset($headerTotals[$hCode])) {
                        $headerTotals[$hCode] = 0;
                    }
                    $headerTotals[$hCode] += $val;
                }
            }
        }

        foreach ($headerTotals as $hCode => $total) {
            $headerRows->push([
                'type' => 'header',
                'kode_rekening' => $hCode,
                'uraian' => $hierarchyNames[$hCode] ?? $hCode,
                'volume' => null,
                'satuan' => null,
                'harga_satuan' => null,
                'jumlah' => $total,
                'sort_key' => $hCode,
            ]);
        }

        $lembarData = $headerRows->merge($itemRows)->sortBy('sort_key')->values();

        // Get Print Settings
        $paperSize = $request->input('paper_size', 'A4');
        $orientation = $request->input('orientation', 'portrait');
        $fontSize = $request->input('font_size', '12pt');

        $pdf = Pdf::loadView('rkas_perubahan_lembar_kerja_pdf', [
            'anggaran' => $penganggaran,
            'lembarData' => $lembarData,
            'paper_size' => $paperSize,
            'orientation' => $orientation,
            'font_size' => $fontSize,
        ]);

        return $pdf->setPaper($paperSize, $orientation)->stream('rkas_perubahan_lembar_kerja.pdf');
    }

    public function generatePdfBulanan($id, Request $request)
    {
        $penganggaran = ($this->Penganggaran)::with('sekolah')->findOrFail($id);
        $penganggaran->setAttribute('sumber_dana', VariantConfig::title($this->variant));

        $selectedMonth = $request->input('month', 'Januari');
        $useArkas = $this->isArkasUraianMode($request);
        $allMonths = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

        $dataByMonth = [];

        if ($selectedMonth === 'all') {
            $rkas = ($this->RkasPerubahan)::with(['kodeKegiatan', 'rekeningBelanja'])
                ->where(VariantConfig::penganggaranFk($this->variant), $id)
                ->get();

            // Populate all months, or just months with data?
            // Providing all months ensures "Januari sampai Desember" are visible even if empty,
            // but usually empty pages are not desired.
            // However, users often want a complete set.
            // Let's stick to months that have data OR if specifically requested.
            // But 'all' usually implies the full report set.
            // Let's iterate all known months to be safe and consistent with "Jan-Dec".

            foreach ($allMonths as $m) {
                $monthData = $rkas->where('bulan', $m);
                if ($monthData->isNotEmpty()) {
                    $grouped = $monthData->groupBy(function ($item) {
                        return optional($item->kodeKegiatan)->kode;
                    })->filter(fn ($group, $key) => ! is_null($key));

                    $dataByMonth[$m] = $this->kelolaDataRkas($grouped, null, $useArkas);
                }
            }
            $monthLabel = 'SEMUA BULAN';
        } else {
            $monthlyRkas = ($this->RkasPerubahan)::with(['kodeKegiatan', 'rekeningBelanja'])
                ->where(VariantConfig::penganggaranFk($this->variant), $id)
                ->where('bulan', $selectedMonth)
                ->get();

            if ($monthlyRkas->isNotEmpty()) {
                $groupedMonthly = $monthlyRkas->groupBy(function ($item) {
                    return optional($item->kodeKegiatan)->kode;
                })->filter(fn ($group, $key) => ! is_null($key));

                $dataByMonth[$selectedMonth] = $this->kelolaDataRkas($groupedMonthly, null, $useArkas);
            } else {
                $dataByMonth[$selectedMonth] = []; // Empty month
            }

            $monthLabel = strtoupper($selectedMonth);
        }

        // Get Print Settings
        $paperSize = $request->input('paper_size', 'A4');
        $orientation = $request->input('orientation', 'portrait');
        $fontSize = $request->input('font_size', '12pt');

        $pdf = Pdf::loadView('rkas_perubahan_bulanan_pdf', [
            'anggaran' => $penganggaran,
            'rkaBulananData' => $dataByMonth, // Now an array of ['Month' => data]
            'month' => $monthLabel,
            'paper_size' => $paperSize,
            'orientation' => $orientation,
            'font_size' => $fontSize,
        ]);

        return $pdf->setPaper($paperSize, $orientation)->stream('rkas_perubahan_bulanan.pdf');
    }

    public function exportRincianPdf(Request $request, $id)
    {
        $penganggaran = ($this->Penganggaran)::with('sekolah')->findOrFail($id);
        $penganggaran->setAttribute('sumber_dana', VariantConfig::title($this->variant));
        $tahap = $request->input('tahap', 'tahunan');

        $query = ($this->RkasPerubahan)::with(['kodeKegiatan', 'rekeningBelanja'])
            ->where(VariantConfig::penganggaranFk($this->variant), $id);

        $rkasData = $query->get();

        $rincianGabungan = collect();

        if ($tahap === '1' || $tahap === 'tahunan') {
            $rkasMurni = ($this->Rkas)::with(['kodeKegiatan', 'rekeningBelanja'])
                ->where(VariantConfig::penganggaranFk($this->variant), $id)
                ->whereIn('bulan', ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'])
                ->get();
            $rincianGabungan = $rincianGabungan->merge($rkasMurni);
        }

        if ($tahap === '2' || $tahap === 'tahunan') {
            $rkasPerubahan = ($this->RkasPerubahan)::with(['kodeKegiatan', 'rekeningBelanja'])
                ->where(VariantConfig::penganggaranFk($this->variant), $id)
                ->whereIn('bulan', ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'])
                ->get();
            $rincianGabungan = $rincianGabungan->merge($rkasPerubahan);
        }

        $rincianData = $this->kelolaDataRincian($rincianGabungan, $this->isArkasUraianMode($request));

        $pdf = Pdf::loadView('laporan.rka_rincian_pdf', [
            'anggaran' => $penganggaran->toArray(),
            'rincianData' => $rincianData,
            'tahap' => $tahap,
            'is_perubahan' => true,
            'paper_size' => $request->paper_size ?? 'A4',
            'orientation' => $request->orientation ?? 'portrait',
            'font_size' => $request->font_size ?? '12pt',
        ]);

        return $pdf->stream('rka_rincian_perubahan.pdf');
    }

    public function exportRincianExcel(Request $request, $id)
    {
        $penganggaran = ($this->Penganggaran)::with('sekolah')->findOrFail($id);
        $penganggaran->setAttribute('sumber_dana', VariantConfig::title($this->variant));
        $tahap = $request->input('tahap', 'tahunan');

        $query = ($this->RkasPerubahan)::with(['kodeKegiatan', 'rekeningBelanja'])
            ->where(VariantConfig::penganggaranFk($this->variant), $id);

        $rkasData = $query->get();

        $rincianGabungan = collect();

        if ($tahap === '1' || $tahap === 'tahunan') {
            $rkasMurni = ($this->Rkas)::with(['kodeKegiatan', 'rekeningBelanja'])
                ->where(VariantConfig::penganggaranFk($this->variant), $id)
                ->whereIn('bulan', ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'])
                ->get();
            $rincianGabungan = $rincianGabungan->merge($rkasMurni);
        }

        if ($tahap === '2' || $tahap === 'tahunan') {
            $rkasPerubahan = ($this->RkasPerubahan)::with(['kodeKegiatan', 'rekeningBelanja'])
                ->where(VariantConfig::penganggaranFk($this->variant), $id)
                ->whereIn('bulan', ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'])
                ->get();
            $rincianGabungan = $rincianGabungan->merge($rkasPerubahan);
        }

        $rincianData = $this->kelolaDataRincian($rincianGabungan, $this->isArkasUraianMode($request));

        $html = view('laporan.rka_rincian_exel', [
            'anggaran' => $penganggaran->toArray(),
            'rincianData' => $rincianData,
            'tahap' => $tahap,
            'paper_size' => $request->paper_size ?? 'A4',
            'orientation' => $request->orientation ?? 'portrait',
            'font_size' => $request->font_size ?? '11pt',
            'is_excel' => true,
        ])->render();

        return response($html)
            ->header('Content-Type', 'application/vnd.ms-excel')
            ->header('Content-Disposition', 'attachment; filename="rka_rincian_perubahan_'.$penganggaran->tahun_anggaran.'.xls"');
    }

    public function updateRincianPencairan(Request $request, $id)
    {
        $request->validate([
            'uraian' => 'required|string',
            'kode_rekening_id' => 'required|exists:rekening_belanjas,id',
            'nama_penerima' => 'nullable|string',
            'jabatan' => 'nullable|string',
            'nomor_rekening' => 'nullable|string',
            'bank' => 'nullable|string',
            'ada_npwp' => 'boolean',
            'pot_ppn' => 'nullable|numeric',
            'pot_pph23' => 'nullable|numeric',
            'pot_pph21' => 'nullable|numeric',
            'status_penerima' => 'nullable|in:pns,non_asn',
            'golongan' => 'nullable|in:I,II,III,IV',
        ]);

        $updateData = [
            'nama_penerima' => $request->nama_penerima,
            'jabatan' => $request->jabatan,
            'nomor_rekening' => $request->nomor_rekening,
            'bank' => $request->bank,
            'ada_npwp' => $request->ada_npwp ? 1 : 0,
            'pot_ppn' => $request->pot_ppn,
            'pot_pph23' => $request->pot_pph23,
            'pot_pph21' => $request->pot_pph21,
            'status_penerima' => $request->status_penerima,
            'golongan' => $request->golongan,
        ];

        // Tentukan bulan mana yang akan diupdate
        $monthsToUpdate = [];
        if ($request->filled('bulan') && $request->bulan !== 'Semua') {
            $monthsToUpdate = [$request->bulan];
        } else {
            $tahap = $request->input('tahap', 1);
            $monthsToUpdate = $tahap == 1
                ? ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni']
                : ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        }

        // 1 & 2. Tentukan baris yang akan diupdate (berdasarkan ID spesifik atau fallback teks uraian)
        $queryPerubahan = ($this->RkasPerubahan)::where(VariantConfig::penganggaranFk($this->variant), $id);

        if ($request->has('rkas_ids') && is_array($request->rkas_ids) && count($request->rkas_ids) > 0) {
            $queryPerubahan->whereIn('id', $request->rkas_ids)
                ->whereIn('bulan', $monthsToUpdate)
                ->orderBy('id', 'asc');
        } else {
            // Fallback ke pencocokan teks jika rkas_ids tidak dikirim dari frontend lama
            $originalUraiansPerubahan = ($this->RkasPerubahan)::where(VariantConfig::penganggaranFk($this->variant), $id)
                ->where('kode_rekening_id', $request->kode_rekening_id)
                ->where(function ($q) use ($request) {
                    $q->whereRaw('TRIM(uraian) = TRIM(?)', [$request->uraian])
                        ->orWhereRaw('TRIM(uraian_gabungan) = TRIM(?)', [$request->uraian]);
                })
                ->pluck('uraian')
                ->toArray();

            if (empty($originalUraiansPerubahan)) {
                // If not found in Perubahan, just return
                return redirect()->back();
            }

            $queryPerubahan->where('kode_rekening_id', $request->kode_rekening_id)
                ->whereIn('uraian', $originalUraiansPerubahan)
                ->whereIn('bulan', $monthsToUpdate)
                ->orderBy('id', 'asc');
        }

        $itemsToUpdate = $queryPerubahan->get();
        if ($itemsToUpdate->count() > 0) {
            // Calculate total pagu for these items to distribute taxes proportionally
            $totalPagu = $itemsToUpdate->sum(function ($item) {
                return $item->jumlah * $item->harga_satuan;
            });

            $totalPpn = $request->pot_ppn ?? 0;
            $totalPph23 = $request->pot_pph23 ?? 0;
            $totalPph21 = $request->pot_pph21 ?? 0;

            $distributedPpn = 0;
            $distributedPph23 = 0;
            $distributedPph21 = 0;

            $lastIndex = $itemsToUpdate->count() - 1;

            foreach ($itemsToUpdate as $index => $item) {
                $itemUpdate = $updateData; // Assign non-tax fields

                if ($totalPagu > 0) {
                    if ($index === $lastIndex) {
                        $itemUpdate['pot_ppn'] = $totalPpn - $distributedPpn;
                        $itemUpdate['pot_pph23'] = $totalPph23 - $distributedPph23;
                        $itemUpdate['pot_pph21'] = $totalPph21 - $distributedPph21;
                    } else {
                        $ratio = ($item->jumlah * $item->harga_satuan) / $totalPagu;
                        $itemUpdate['pot_ppn'] = round($totalPpn * $ratio);
                        $itemUpdate['pot_pph23'] = round($totalPph23 * $ratio);
                        $itemUpdate['pot_pph21'] = round($totalPph21 * $ratio);

                        $distributedPpn += $itemUpdate['pot_ppn'];
                        $distributedPph23 += $itemUpdate['pot_pph23'];
                        $distributedPph21 += $itemUpdate['pot_pph21'];
                    }
                } else {
                    if ($index > 0) {
                        $itemUpdate['pot_ppn'] = 0;
                        $itemUpdate['pot_pph23'] = 0;
                        $itemUpdate['pot_pph21'] = 0;
                    }
                }
                $item->update($itemUpdate);
            }
        }

        // 3. Lakukan hal yang sama untuk tabel Rkas (Murni)
        $originalUraiansMurni = ($this->Rkas)::where(VariantConfig::penganggaranFk($this->variant), $id)
            ->where('kode_rekening_id', $request->kode_rekening_id)
            ->where(function ($q) use ($request) {
                $q->whereRaw('TRIM(uraian) = TRIM(?)', [$request->uraian])
                    ->orWhereRaw('TRIM(uraian_gabungan) = TRIM(?)', [$request->uraian]);
            })
            ->pluck('uraian')
            ->toArray();

        if (! empty($originalUraiansMurni)) {
            $queryMurni = ($this->Rkas)::where(VariantConfig::penganggaranFk($this->variant), $id)
                ->where('kode_rekening_id', $request->kode_rekening_id)
                ->whereIn('uraian', $originalUraiansMurni)
                ->whereIn('bulan', $monthsToUpdate)
                ->orderBy('id', 'asc');

            $itemsMurniToUpdate = $queryMurni->get();
            if ($itemsMurniToUpdate->count() > 0) {
                $totalPaguMurni = $itemsMurniToUpdate->sum(function ($item) {
                    return $item->jumlah * $item->harga_satuan;
                });

                $totalPpnMurni = $request->pot_ppn ?? 0;
                $totalPph23Murni = $request->pot_pph23 ?? 0;
                $totalPph21Murni = $request->pot_pph21 ?? 0;

                $distributedPpnMurni = 0;
                $distributedPph23Murni = 0;
                $distributedPph21Murni = 0;

                $lastIndexMurni = $itemsMurniToUpdate->count() - 1;

                foreach ($itemsMurniToUpdate as $index => $item) {
                    $itemUpdate = $updateData;

                    if ($totalPaguMurni > 0) {
                        if ($index === $lastIndexMurni) {
                            $itemUpdate['pot_ppn'] = $totalPpnMurni - $distributedPpnMurni;
                            $itemUpdate['pot_pph23'] = $totalPph23Murni - $distributedPph23Murni;
                            $itemUpdate['pot_pph21'] = $totalPph21Murni - $distributedPph21Murni;
                        } else {
                            $ratio = ($item->jumlah * $item->harga_satuan) / $totalPaguMurni;
                            $itemUpdate['pot_ppn'] = round($totalPpnMurni * $ratio);
                            $itemUpdate['pot_pph23'] = round($totalPph23Murni * $ratio);
                            $itemUpdate['pot_pph21'] = round($totalPph21Murni * $ratio);

                            $distributedPpnMurni += $itemUpdate['pot_ppn'];
                            $distributedPph23Murni += $itemUpdate['pot_pph23'];
                            $distributedPph21Murni += $itemUpdate['pot_pph21'];
                        }
                    } else {
                        if ($index > 0) {
                            $itemUpdate['pot_ppn'] = 0;
                            $itemUpdate['pot_pph23'] = 0;
                            $itemUpdate['pot_pph21'] = 0;
                        }
                    }

                    $item->update($itemUpdate);
                }
            }
        }

        return redirect()->back()->with('success', 'Rincian pencairan berhasil disimpan.');
    }

    public function gabungRincian(Request $request, $id)
    {
        $request->validate([
            'new_uraian' => 'required|string|max:255',
            'rkas_ids' => 'required|array|min:1',
            'rkas_ids.*' => 'integer',
        ]);

        $penganggaran = ($this->Penganggaran)::findOrFail($id);

        $bkuDetailTable = app($this->BukuKasUmumUraianDetail)->getTable();
        $bkuTable = app($this->BukuKasUmum)->getTable();
        $bkuFk = VariantConfig::bkuFk($this->variant);
        $penganggaranFk = VariantConfig::penganggaranFk($this->variant);

        DB::beginTransaction();
        try {
            // Update uraian_gabungan ONLY for the exact selected records in Perubahan
            ($this->RkasPerubahan)::where(VariantConfig::penganggaranFk($this->variant), $penganggaran->id)
                ->whereIn('id', $request->rkas_ids)
                ->update(['uraian_gabungan' => $request->new_uraian]);

            DB::commit();

            return redirect()->back()->with('success', 'Kegiatan berhasil digabung.');
        } catch (\Exception $e) {
            DB::rollBack();

            return redirect()->back()->withErrors(['message' => 'Gagal menggabung kegiatan: '.$e->getMessage()]);
        }
    }

    public function editGabungRincian(Request $request, $id)
    {
        $request->validate([
            'new_uraian_gabungan' => 'required|string|max:255',
            'rkas_ids' => 'required|array|min:1',
            'rkas_ids.*' => 'integer',
        ]);

        $penganggaran = ($this->Penganggaran)::findOrFail($id);

        DB::beginTransaction();
        try {
            // Ambil item pertama untuk mendapatkan data referensi (kode rekening & nama lama)
            $firstItem = ($this->RkasPerubahan)::whereIn('id', $request->rkas_ids)->first();
            if (! $firstItem && $this->Rkas && class_exists($this->Rkas)) {
                $firstItem = ($this->Rkas)::whereIn('id', $request->rkas_ids)->first();
            }

            if ($firstItem && ! empty($firstItem->uraian_gabungan)) {
                $oldUraianGabungan = $firstItem->uraian_gabungan;
                $kodeRekeningId = $firstItem->kode_rekening_id;
                // Update in RkasPerubahan
                ($this->RkasPerubahan)::where(VariantConfig::penganggaranFk($this->variant), $penganggaran->id)
                    ->where('kode_rekening_id', $kodeRekeningId)
                    ->where('uraian_gabungan', $oldUraianGabungan)
                    ->update(['uraian_gabungan' => $request->new_uraian_gabungan]);

                // Update in Rkas
                if ($this->Rkas && class_exists($this->Rkas)) {
                    ($this->Rkas)::where(VariantConfig::penganggaranFk($this->variant), $penganggaran->id)
                        ->where('kode_rekening_id', $kodeRekeningId)
                        ->where('uraian_gabungan', $oldUraianGabungan)
                        ->update(['uraian_gabungan' => $request->new_uraian_gabungan]);
                }
            } else {
                // Update in RkasPerubahan
                ($this->RkasPerubahan)::where(VariantConfig::penganggaranFk($this->variant), $penganggaran->id)
                    ->where('kode_rekening_id', $kodeRekeningId)
                    ->where('uraian', $firstItem->uraian)
                    ->whereNull('uraian_gabungan')
                    ->update(['uraian_gabungan' => $request->new_uraian_gabungan]);

                // Update in Rkas
                if ($this->Rkas && class_exists($this->Rkas)) {
                    ($this->Rkas)::where(VariantConfig::penganggaranFk($this->variant), $penganggaran->id)
                        ->where('kode_rekening_id', $kodeRekeningId)
                        ->where('uraian', $firstItem->uraian)
                        ->whereNull('uraian_gabungan')
                        ->update(['uraian_gabungan' => $request->new_uraian_gabungan]);
                }
            }

            DB::commit();

            return redirect()->back()->with('success', 'Nama gabungan berhasil diubah.');
        } catch (\Exception $e) {
            DB::rollBack();

            return redirect()->back()->withErrors(['message' => 'Gagal mengubah nama gabungan: '.$e->getMessage()]);
        }
    }

    public function ungabungRincian(Request $request, $id)
    {
        $request->validate([
            'rkas_ids' => 'required|array|min:1',
            'rkas_ids.*' => 'integer',
        ]);

        $penganggaran = ($this->Penganggaran)::findOrFail($id);

        DB::beginTransaction();
        try {
            $firstItem = ($this->RkasPerubahan)::whereIn('id', $request->rkas_ids)->first();
            if (! $firstItem && $this->Rkas && class_exists($this->Rkas)) {
                $firstItem = ($this->Rkas)::whereIn('id', $request->rkas_ids)->first();
            }

            if ($firstItem && ! empty($firstItem->uraian_gabungan)) {
                $oldUraianGabungan = $firstItem->uraian_gabungan;
                $kodeRekeningId = $firstItem->kode_rekening_id;

                ($this->RkasPerubahan)::where(VariantConfig::penganggaranFk($this->variant), $penganggaran->id)
                    ->where('kode_rekening_id', $kodeRekeningId)
                    ->where('uraian_gabungan', $oldUraianGabungan)
                    ->update([
                        'uraian_gabungan' => null,
                        'pot_ppn' => null,
                        'pot_pph23' => null,
                        'pot_pph21' => null,
                        'pot_pph21_narasumber' => null,
                    ]);

                if ($this->Rkas && class_exists($this->Rkas)) {
                    ($this->Rkas)::where(VariantConfig::penganggaranFk($this->variant), $penganggaran->id)
                        ->where('kode_rekening_id', $kodeRekeningId)
                        ->where('uraian_gabungan', $oldUraianGabungan)
                        ->update([
                            'uraian_gabungan' => null,
                            'pot_ppn' => null,
                            'pot_pph23' => null,
                            'pot_pph21' => null,
                            'pot_pph21_narasumber' => null,
                        ]);
                }
            }

            DB::commit();

            return redirect()->back()->with('success', 'Gabungan kegiatan berhasil dipisahkan.');
        } catch (\Exception $e) {
            DB::rollBack();

            return redirect()->back()->withErrors(['message' => 'Gagal memisahkan kegiatan: '.$e->getMessage()]);
        }
    }

    /**
     * Mendapatkan ID sumber dana ARKAS berdasarkan varian aktif.
     */
    private function getArkasSumberDanaId(): int
    {
        return match ($this->variant) {
            'kinerja' => 12, // BOS Kinerja
            'silpa' => 33,
            'kinerja_silpa' => 35,
            default => 1, // reguler (BOS Reguler)
        };
    }

    /**
     * Menjalankan Python engine dump_rkas_perubahan.py dengan environment yang tepat.
     */
    private function runArkasEngine(array $args): array
    {
        return app(ArkasEngineService::class)->runScriptOrThrow(
            'dump_rkas_perubahan.py',
            $args,
            60
        );
    }

    /**
     * Memeriksa ketersediaan RKAS Perubahan di ARKAS serta mendeteksi perbedaan/perubahan Tahap 2 (dry-run tanpa mengubah DB).
     */
    public function checkArkasRkasPerubahan(Request $request, $id, ArkasRkasSyncService $syncService)
    {
        if (! $this->RkasPerubahan || ! class_exists($this->RkasPerubahan)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Fitur RKAS Perubahan tidak tersedia untuk varian ini.',
            ], 422);
        }

        $penganggaran = ($this->Penganggaran)::findOrFail($id);

        try {
            $tahun = (int) $penganggaran->tahun_anggaran;
            $sumberDanaId = $this->getArkasSumberDanaId();
            $penganggaranFk = VariantConfig::penganggaranFk($this->variant);

            $currentCount = ($this->RkasPerubahan)::where($penganggaranFk, $penganggaran->id)->count();

            // Cek apakah ada transaksi BKU pada Tahap 2 (Juli - Desember)
            $hasBkuTahap2 = false;
            if ($this->BukuKasUmum && class_exists($this->BukuKasUmum)) {
                $hasBkuTahap2 = ($this->BukuKasUmum)::where($penganggaranFk, $penganggaran->id)
                    ->where('is_bunga_record', false)
                    ->whereMonth('tanggal_transaksi', '>=', 7)
                    ->exists();
            }

            if ($currentCount === 0) {
                $result = $this->runArkasEngine(['check', (string) $tahun, (string) $sumberDanaId]);

                return response()->json([
                    'status' => 'success',
                    'exists' => $result['exists'] ?? false,
                    'is_revisi' => $result['is_revisi'] ?? null,
                    'tahun' => $tahun,
                    'sumber_dana' => $result['sumber_dana'] ?? VariantConfig::title($this->variant),
                    'pagu' => (float) ($result['pagu'] ?? 0),
                    'total_kegiatan' => (int) ($result['total_kegiatan'] ?? 0),
                    'total_alokasi' => (int) ($result['total_alokasi'] ?? 0),
                    'total_alokasi_rp' => (float) ($result['total_alokasi_rp'] ?? 0),
                    'current_rkas_count' => 0,
                    'has_bku_tahap2' => $hasBkuTahap2,
                    'can_pull' => ! empty($result['exists']),
                    'diff_preview' => null,
                    'message' => $result['message'] ?? null,
                ]);
            }

            // Saat RKAS Perubahan SIKAS sudah terisi: dump 1 kali lalu jalankan dry-run Mode C (tanpa mutasi DB)
            $result = $this->runArkasEngine(['dump', (string) $tahun, (string) $sumberDanaId]);
            $items = $result['data'] ?? [];
            $exists = array_key_exists('exists', $result) ? (bool) $result['exists'] : ! empty($items);

            if (! $exists || empty($items)) {
                return response()->json([
                    'status' => 'success',
                    'exists' => false,
                    'is_revisi' => $result['is_revisi'] ?? null,
                    'tahun' => $tahun,
                    'sumber_dana' => $result['sumber_dana'] ?? VariantConfig::title($this->variant),
                    'pagu' => (float) ($result['pagu'] ?? 0),
                    'total_kegiatan' => 0,
                    'total_alokasi' => 0,
                    'total_alokasi_rp' => 0.0,
                    'current_rkas_count' => $currentCount,
                    'has_bku_tahap2' => $hasBkuTahap2,
                    'can_pull' => false,
                    'diff_preview' => null,
                    'message' => $result['message'] ?? "Tidak ditemukan data RKAS Perubahan yang disetujui di ARKAS untuk Tahun {$tahun}.",
                ]);
            }

            ['kegiatanMap' => $kegiatanMap, 'rekenings' => $rekenings] = $syncService->loadMasterMaps();
            $bkuDetailClass = $this->BukuKasUmumUraianDetail ?: VariantConfig::getModelClass('bku_uraian_detail', $this->variant);
            $spentVolumeByRowId = $syncService->loadSpentVolumeByRkasId(
                $this->variant,
                $this->RkasPerubahan,
                $this->BukuKasUmum,
                $bkuDetailClass,
                $penganggaranFk,
                (int) $penganggaran->id,
                isPerubahan: true
            );

            $dryStats = $syncService->syncFromArkas(
                $this->RkasPerubahan,
                $penganggaranFk,
                (int) $penganggaran->id,
                $tahun,
                $items,
                $kegiatanMap,
                $rekenings,
                reconcilePerubahan: true,
                protectedRowIds: [],
                reconcileAwal: false,
                spentVolumeByRowId: $spentVolumeByRowId,
                dryRun: true
            );

            $previewPayload = $syncService->buildDiffPreview($dryStats, $items);

            return response()->json([
                'status' => 'success',
                'exists' => true,
                'is_revisi' => $result['is_revisi'] ?? 100,
                'tahun' => $tahun,
                'sumber_dana' => $result['sumber_dana'] ?? VariantConfig::title($this->variant),
                'pagu' => (float) ($result['pagu'] ?? 0),
                'total_kegiatan' => $previewPayload['total_kegiatan'],
                'total_alokasi' => $previewPayload['total_alokasi'],
                'total_alokasi_rp' => $previewPayload['total_alokasi_rp'],
                'current_rkas_count' => $currentCount,
                'has_bku_tahap2' => $hasBkuTahap2,
                'can_pull' => true,
                'diff_preview' => $previewPayload['diff_preview'],
                'message' => $result['message'] ?? null,
            ]);
        } catch (\Exception $e) {
            Log::error('❌ [CHECK ARKAS RKAS PERUBAHAN] Error: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal memeriksa data ARKAS Perubahan. Pastikan aplikasi/database ARKAS tersedia lalu coba kembali.',
            ], 500);
        }
    }

    /**
     * Menarik data alokasi bulanan RKAS Perubahan dari ARKAS.
     * - mode = 'reconcile' (default): Mode C (ARKAS-Authoritative Tahap 2) dengan proteksi Tahap 1 & volume BKU Tahap 2.
     * - mode = 'match_only': penyandingan aman tanpa mengubah/menambah/menghapus baris SIKAS.
     */
    public function pullArkasRkasPerubahan(Request $request, $id, ArkasRkasSyncService $syncService)
    {
        if (! $this->RkasPerubahan || ! class_exists($this->RkasPerubahan)) {
            return redirect()->back()->withErrors([
                'message' => 'Fitur RKAS Perubahan tidak tersedia untuk varian ini.',
            ]);
        }

        $validated = $request->validate([
            'mode' => 'nullable|in:reconcile,match_only',
        ]);
        $reconcilePerubahan = ($validated['mode'] ?? 'reconcile') === 'reconcile';

        $penganggaran = ($this->Penganggaran)::findOrFail($id);
        $penganggaranFk = VariantConfig::penganggaranFk($this->variant);
        $tahun = (int) $penganggaran->tahun_anggaran;
        $sumberDanaId = $this->getArkasSumberDanaId();

        try {
            $result = $this->runArkasEngine(['dump', (string) $tahun, (string) $sumberDanaId]);
            $items = $result['data'] ?? [];

            if (empty($items)) {
                return redirect()->back()->withErrors([
                    'message' => 'Tidak ada data alokasi RKAS Perubahan yang dapat ditarik dari ARKAS.',
                ]);
            }

            ['kegiatanMap' => $kegiatanMap, 'rekenings' => $rekenings] = $syncService->loadMasterMaps();
            $hasExistingRows = ($this->RkasPerubahan)::where($penganggaranFk, $penganggaran->id)->exists();

            // Validasi referensi master wajib saat Mode A (RKAS Perubahan masih kosong / initial import)
            if (! $hasExistingRows) {
                $missingError = $syncService->validateMasterReferences($items, $kegiatanMap, $rekenings);
                if ($missingError !== null) {
                    return redirect()->back()->withErrors(['message' => $missingError]);
                }
            }

            $paguArkas = (float) ($result['pagu'] ?? 0);
            $revisiNomor = $result['is_revisi'] ?? 100;
            $bkuDetailClass = $this->BukuKasUmumUraianDetail ?: VariantConfig::getModelClass('bku_uraian_detail', $this->variant);

            $stats = DB::transaction(function () use ($syncService, $penganggaran, $penganggaranFk, $tahun, $items, $kegiatanMap, $rekenings, $paguArkas, $revisiNomor, $bkuDetailClass, $reconcilePerubahan) {
                ($this->Penganggaran)::whereKey($penganggaran->id)->lockForUpdate()->first();

                $spentVolumeByRowId = $reconcilePerubahan
                    ? $syncService->loadSpentVolumeByRkasId(
                        $this->variant,
                        $this->RkasPerubahan,
                        $this->BukuKasUmum,
                        $bkuDetailClass,
                        $penganggaranFk,
                        (int) $penganggaran->id,
                        isPerubahan: true
                    )
                    : [];

                $syncStats = $syncService->syncFromArkas(
                    $this->RkasPerubahan,
                    $penganggaranFk,
                    (int) $penganggaran->id,
                    $tahun,
                    $items,
                    $kegiatanMap,
                    $rekenings,
                    reconcilePerubahan: $reconcilePerubahan,
                    protectedRowIds: [],
                    reconcileAwal: false,
                    spentVolumeByRowId: $spentVolumeByRowId,
                    dryRun: false
                );

                // Update pagu_anggaran saat initial import atau saat rekonsiliasi Perubahan 100% cocok
                if (($syncStats['mode'] === 'initial_import' || ($syncStats['mode'] === 'perubahan_reconcile' && ! $syncStats['is_budget_mismatch'])) && $paguArkas > 0) {
                    $penganggaran->pagu_anggaran = $paguArkas;
                    $penganggaran->save();
                }

                $this->logAction(
                    $penganggaran->id,
                    'pull_arkas',
                    "Sinkronisasi RKAS Perubahan dari ARKAS (Revisi {$revisiNomor}): {$syncStats['matched']} baris disandingkan, "
                    .($syncStats['updated_perubahan'] ?? 0).' disesuaikan, '
                    ."{$syncStats['inserted']} baris baru ditambahkan, "
                    .($syncStats['deleted_perubahan'] ?? 0).' baris Tahap 2 dibatalkan/dihapus, '
                    .count($syncStats['unpaired_sikas']).' SIKAS belum/tidak cocok, '
                    .count($syncStats['unmatched_arkas']).' ARKAS tidak cocok.'
                );

                return $syncStats;
            });

            $flash = $syncService->buildFlashResponse($stats, "RKAS Perubahan (Revisi {$revisiNomor})", $tahun, $paguArkas);

            return redirect()->back()
                ->with($flash['flash_type'], $flash['message'])
                ->with('arkas_sync_report', $flash['report']);
        } catch (\Exception $e) {
            Log::error('❌ [PULL ARKAS RKAS PERUBAHAN] Error: '.$e->getMessage().' | '.$e->getTraceAsString());

            return redirect()->back()->withErrors([
                'message' => 'Gagal menarik data RKAS Perubahan dari ARKAS. Pastikan aplikasi/database ARKAS tersedia lalu coba kembali.',
            ]);
        }
    }

    protected function renderVariant($component, $props = [])
    {
        $var = $this->variant ?? (request()->route() ? (request()->route()->parameter('variant') ?? request()->get('_variant', 'reguler')) : 'reguler');
        if (app()->bound('variant')) {
            $var = app('variant');
        }

        return Inertia::render(VariantConfig::pagePrefix($var).$component, array_merge($props, [
            'variant' => $var,
            'routePrefix' => VariantConfig::routePrefix($var),
        ]));
    }
}
