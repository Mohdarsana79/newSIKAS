<?php

namespace App\Http\Controllers;

use App\Config\VariantConfig;
use App\Models\Penganggaran;
use App\Models\SekolahProfile;
use App\Services\ArkasEngineService;
use App\Services\ReferensiKodeService;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;

class PenganggaranController extends Controller
{
    protected string $variant;

    protected string $Penganggaran;

    protected string $Rkas;

    protected ?string $RkasPerubahan = null;

    protected string $BukuKasUmum;

    protected ?string $Spmth = null;

    protected ?string $Sptj = null;

    protected ?string $Sp2b = null;

    protected ?string $Lph = null;

    public function __construct()
    {
        $this->middleware(function ($request, $next) {
            $this->variant = app()->bound('variant') ? app('variant') : 'reguler';
            $this->Penganggaran = VariantConfig::getModelClass('penganggaran', $this->variant);
            $this->Rkas = VariantConfig::getModelClass('rkas', $this->variant);
            try {
                $this->RkasPerubahan = VariantConfig::getModelClass('rkas_perubahan', $this->variant);
            } catch (\InvalidArgumentException $e) {
                $this->RkasPerubahan = null;
            }
            $this->BukuKasUmum = VariantConfig::getModelClass('bku', $this->variant);
            $this->Spmth = VariantConfig::getModelClass('spmth', $this->variant);
            $this->Sptj = VariantConfig::getModelClass('sptj', $this->variant);
            $this->Sp2b = VariantConfig::getModelClass('sp2b', $this->variant);
            $this->Lph = VariantConfig::getModelClass('lph', $this->variant);

            return $next($request);
        });
    }

    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $anggarans = ($this->Penganggaran)::orderBy('tahun_anggaran', 'desc')->get();
        // $availableYears = ($this->Penganggaran)::select('tahun_anggaran')->distinct()->orderBy('tahun_anggaran', 'desc')->pluck('tahun_anggaran');

        $items = collect();
        $variantTitle = VariantConfig::title($this->variant);

        foreach ($anggarans as $anggaran) {
            // Check existence
            $fk = VariantConfig::penganggaranFk($this->variant);
            $hasPerubahan = $this->RkasPerubahan ? ($this->RkasPerubahan)::where($fk, $anggaran->id)->exists() : false;
            $hasBkuReguler = ($this->BukuKasUmum)::where($fk, $anggaran->id)->exists();
            $hasBkuPerubahan = ($this->BukuKasUmum)::where($fk, $anggaran->id)
                ->whereMonth('tanggal_transaksi', '>=', 7)
                ->exists();

            $reports = [];
            if ($this->Spmth && ($this->Spmth)::where($fk, $anggaran->id)->exists()) {
                $reports[] = 'SPMTH';
            }
            if ($this->Sptj && ($this->Sptj)::where($fk, $anggaran->id)->exists()) {
                $reports[] = 'SPTJ';
            }
            if ($this->Sp2b && ($this->Sp2b)::where($fk, $anggaran->id)->exists()) {
                $reports[] = 'SP2B';
            }
            if ($this->Lph && ($this->Lph)::where($fk, $anggaran->id)->exists()) {
                $reports[] = 'LPH';
            }

            // 1. Add Regular Item
            $items->push([
                'id' => $anggaran->id,
                'title' => "RKAS {$variantTitle} ".$anggaran->tahun_anggaran,
                'pagu' => 'Rp '.number_format($anggaran->pagu_anggaran, 0, ',', '.'),
                'status' => 'regular',
                'status_persetujuan' => $anggaran->status_persetujuan ?? 'draft',
                'has_perubahan' => $hasPerubahan, // Flag to disable button / hide edit
                'has_bku' => $hasBkuReguler,
                'reports' => $reports,
                'tahun' => $anggaran->tahun_anggaran,
            ]);

            // 2. Add Perubahan Item if exists
            if ($hasPerubahan) {
                $items->push([
                    'id' => $anggaran->id, // Same ID, will use status to change route
                    'title' => "RKAS Perubahan {$variantTitle} ".$anggaran->tahun_anggaran,
                    'pagu' => 'Rp '.number_format($anggaran->pagu_anggaran, 0, ',', '.'),
                    'status' => 'perubahan',
                    'status_persetujuan' => $anggaran->status_persetujuan ?? 'draft',
                    'has_perubahan' => true,
                    'has_bku' => $hasBkuPerubahan,
                    'tahun' => $anggaran->tahun_anggaran,
                ]);
            }
        }

        $canCreate = SekolahProfile::exists();
        $referensiStatsPerYear = app(ReferensiKodeService::class)->getStatsPerYear();

        return $this->renderVariant('Penganggaran/Index', [
            'items' => $items,
            'anggarans' => $anggarans, // passing raw data too if needed
            'official_history' => $this->buildOfficialHistory($anggarans),
            'can_create' => $canCreate,
            'referensi_stats_per_year' => $referensiStatsPerYear,
        ]);
    }

    /**
     * Memeriksa data pagu anggaran & penanggung jawab (KS, Bendahara, Komite) di database ARKAS
     * untuk tahun anggaran dan varian BOSP aktif.
     */
    public function checkArkas(Request $request, ArkasEngineService $arkasEngine): JsonResponse
    {
        $validated = $request->validate([
            'tahun' => 'required|digits:4|integer|min:2000|max:'.(date('Y') + 5),
        ]);

        $tahun = (int) $validated['tahun'];
        $sumberDanaId = VariantConfig::arkasSumberDanaId($this->variant);

        $result = $arkasEngine->runScriptRaw(
            'check_anggaran.py',
            [(string) $tahun, (string) $sumberDanaId],
            30
        );

        if (($result['status'] ?? null) === 'error' || isset($result['error'])) {
            return response()->json([
                'status' => 'error',
                'error_type' => (string) ($result['error_type'] ?? 'ARKAS_ERROR'),
                'message' => (string) ($result['message'] ?? $result['error'] ?? 'Gagal mengecek data anggaran di ARKAS.'),
            ], 422);
        }

        $availableYears = array_values(array_map(
            static fn ($y) => (int) $y,
            is_array($result['available_years'] ?? null) ? $result['available_years'] : []
        ));

        $exists = (bool) ($result['exists'] ?? false);
        if (! $exists) {
            return response()->json([
                'status' => 'success',
                'exists' => false,
                'tahun' => $tahun,
                'sumber_dana_id' => $sumberDanaId,
                'sumber_dana' => (string) ($result['sumber_dana'] ?? VariantConfig::title($this->variant)),
                'available_years' => $availableYears,
                'message' => (string) ($result['message'] ?? "Tidak ditemukan data anggaran di ARKAS untuk Tahun {$tahun}."),
            ]);
        }

        $penjab = is_array($result['penanggung_jawab'] ?? null) ? $result['penanggung_jawab'] : [];

        return response()->json([
            'status' => 'success',
            'exists' => true,
            'id_anggaran' => (string) ($result['id_anggaran'] ?? ''),
            'tahun' => (int) ($result['tahun'] ?? $tahun),
            'sumber_dana_id' => (int) ($result['sumber_dana_id'] ?? $sumberDanaId),
            'sumber_dana' => (string) ($result['sumber_dana'] ?? VariantConfig::title($this->variant)),
            'pagu' => (float) ($result['pagu'] ?? 0),
            'is_approve' => (int) ($result['is_approve'] ?? 0),
            'is_revisi' => (int) ($result['is_revisi'] ?? 0),
            'penanggung_jawab' => [
                'kepala_sekolah' => trim((string) ($penjab['kepala_sekolah'] ?? '')),
                'nip_kepala_sekolah' => trim((string) ($penjab['nip_kepala_sekolah'] ?? '')),
                'bendahara' => trim((string) ($penjab['bendahara'] ?? '')),
                'nip_bendahara' => trim((string) ($penjab['nip_bendahara'] ?? '')),
                'komite' => trim((string) ($penjab['komite'] ?? '')),
            ],
            'available_years' => $availableYears,
        ]);
    }

    /**
     * Menyusun riwayat penanggung jawab (KS, Bendahara, Komite beserta SK) dari varian aktif
     * dan fallback BOSP Reguler untuk fitur salin dari tahun sebelumnya.
     *
     * @param  Collection<int, mixed>  $activeAnggarans
     * @return array<int, array<string, string>>
     */
    private function buildOfficialHistory(Collection $activeAnggarans): array
    {
        $mapRecord = static function ($record, string $sourceVariant): array {
            $formatDate = static function ($value): string {
                if ($value instanceof \DateTimeInterface) {
                    return $value->format('Y-m-d');
                }

                return $value ? substr((string) $value, 0, 10) : '';
            };

            return [
                'tahun_anggaran' => (string) ($record->tahun_anggaran ?? ''),
                'source_variant' => $sourceVariant,
                'source_label' => VariantConfig::title($sourceVariant),
                'komite' => (string) ($record->komite ?? ''),
                'kepala_sekolah' => (string) ($record->kepala_sekolah ?? ''),
                'nip_kepala_sekolah' => (string) ($record->nip_kepala_sekolah ?? ''),
                'sk_kepala_sekolah' => (string) ($record->sk_kepala_sekolah ?? ''),
                'tanggal_sk_kepala_sekolah' => $formatDate($record->tanggal_sk_kepala_sekolah ?? null),
                'bendahara' => (string) ($record->bendahara ?? ''),
                'nip_bendahara' => (string) ($record->nip_bendahara ?? ''),
                'sk_bendahara' => (string) ($record->sk_bendahara ?? ''),
                'tanggal_sk_bendahara' => $formatDate($record->tanggal_sk_bendahara ?? null),
            ];
        };

        $history = $activeAnggarans
            ->map(fn ($record) => $mapRecord($record, $this->variant))
            ->values()
            ->all();

        if ($this->variant !== VariantConfig::REGULER) {
            $regulerModel = VariantConfig::getModelClass('penganggaran', VariantConfig::REGULER);
            $regulerRecords = $regulerModel::query()
                ->orderBy('tahun_anggaran', 'desc')
                ->get([
                    'tahun_anggaran',
                    'komite',
                    'kepala_sekolah',
                    'nip_kepala_sekolah',
                    'sk_kepala_sekolah',
                    'tanggal_sk_kepala_sekolah',
                    'bendahara',
                    'nip_bendahara',
                    'sk_bendahara',
                    'tanggal_sk_bendahara',
                ]);

            foreach ($regulerRecords as $record) {
                $history[] = $mapRecord($record, VariantConfig::REGULER);
            }
        }

        return $history;
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'pagu_anggaran' => 'required',
            'tahun_anggaran' => 'required|digits:4|integer|min:2000|max:'.(date('Y') + 5),
            'kepala_sekolah' => 'required|string|max:255',
            'sk_kepala_sekolah' => 'required|string|max:255',
            'bendahara' => 'required|string|max:255',
            'sk_bendahara' => 'required|string|max:255',
            'komite' => 'required|string|max:255',
            'nip_kepala_sekolah' => 'required|string|max:255',
            'nip_bendahara' => 'required|string|max:255',
            'tanggal_sk_kepala_sekolah' => 'required|date',
            'tanggal_sk_bendahara' => 'required|date',
        ]);

        // Format angka sebelum disimpan
        $pagu = preg_replace('/[^\d]/', '', $request->pagu_anggaran);

        ($this->Penganggaran)::create([
            'pagu_anggaran' => $pagu,
            'tahun_anggaran' => $request->tahun_anggaran,
            'kepala_sekolah' => $request->kepala_sekolah,
            'sk_kepala_sekolah' => $request->sk_kepala_sekolah,
            'nip_kepala_sekolah' => $request->nip_kepala_sekolah,
            'bendahara' => $request->bendahara,
            'sk_bendahara' => $request->sk_bendahara,
            'nip_bendahara' => $request->nip_bendahara,
            'komite' => $request->komite,
            'tanggal_sk_kepala_sekolah' => $request->tanggal_sk_kepala_sekolah,
            'tanggal_sk_bendahara' => $request->tanggal_sk_bendahara,
            'sekolah_id' => SekolahProfile::query()->first()->id ?? null,
        ]);

        return redirect()->back()->with('success', 'Data anggaran berhasil ditambahkan');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $request->validate([
            'pagu_anggaran' => 'required',
            'tahun_anggaran' => 'required|digits:4|integer|min:2000|max:'.(date('Y') + 5),
            'kepala_sekolah' => 'required|string|max:255',
            'sk_kepala_sekolah' => 'required|string|max:255',
            'bendahara' => 'required|string|max:255',
            'sk_bendahara' => 'required|string|max:255',
            'komite' => 'required|string|max:255',
            'nip_kepala_sekolah' => 'required|string|max:255',
            'nip_bendahara' => 'required|string|max:255',
            'tanggal_sk_kepala_sekolah' => 'required|date',
            'tanggal_sk_bendahara' => 'required|date',
        ]);

        $penganggaran = ($this->Penganggaran)::findOrFail($id);

        $hasPerubahan = $this->RkasPerubahan ? ($this->RkasPerubahan)::where(VariantConfig::penganggaranFk($this->variant), $penganggaran->id)->exists() : false;
        $tahunAnggaran = $hasPerubahan ? $penganggaran->tahun_anggaran : $request->tahun_anggaran;

        // Format angka sebelum disimpan (pertahankan pagu jika sudah ada RKAS Perubahan)
        $pagu = $hasPerubahan ? $penganggaran->pagu_anggaran : preg_replace('/[^\d]/', '', $request->pagu_anggaran);

        $penganggaran->update([
            'pagu_anggaran' => $pagu,
            'tahun_anggaran' => $tahunAnggaran,
            'kepala_sekolah' => $request->kepala_sekolah,
            'sk_kepala_sekolah' => $request->sk_kepala_sekolah,
            'nip_kepala_sekolah' => $request->nip_kepala_sekolah,
            'bendahara' => $request->bendahara,
            'sk_bendahara' => $request->sk_bendahara,
            'nip_bendahara' => $request->nip_bendahara,
            'komite' => $request->komite,
            'tanggal_sk_kepala_sekolah' => $request->tanggal_sk_kepala_sekolah,
            'tanggal_sk_bendahara' => $request->tanggal_sk_bendahara,
        ]);

        return redirect()->back()->with('success', 'Data anggaran berhasil diperbarui');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $penganggaran = ($this->Penganggaran)::findOrFail($id);
        $fk = VariantConfig::penganggaranFk($this->variant);

        // 1. Validasi RKAS Perubahan
        $hasPerubahan = $this->RkasPerubahan ? ($this->RkasPerubahan)::where($fk, $id)->exists() : false;
        if ($hasPerubahan) {
            return redirect()->back()->with('error', 'Penganggaran RKAS awal tidak dapat dihapus karena RKAS Perubahan masih ada. Anda perlu menghapus RKAS Perubahan terlebih dahulu.');
        }

        // 2. Validasi BKU
        $hasBku = ($this->BukuKasUmum)::where($fk, $id)->exists();
        if ($hasBku) {
            return redirect()->back()->with('error', 'Penganggaran tidak dapat di hapus karena sudah ada data belanja pada BKU, anda perlu menghapus data bku pada penganggaran ini untuk dapat menghapus penganggaran ini');
        }

        // 3. Validasi Dokumen Laporan (SP2B, SPTJ, SPMTH, LPH)
        $reports = [];
        if ($this->Spmth && ($this->Spmth)::where($fk, $id)->exists()) {
            $reports[] = 'SPMTH';
        }
        if ($this->Sptj && ($this->Sptj)::where($fk, $id)->exists()) {
            $reports[] = 'SPTJ';
        }
        if ($this->Sp2b && ($this->Sp2b)::where($fk, $id)->exists()) {
            $reports[] = 'SP2B';
        }
        if ($this->Lph && ($this->Lph)::where($fk, $id)->exists()) {
            $reports[] = 'LPH';
        }

        if (! empty($reports)) {
            $reportNames = implode(', ', $reports);

            return redirect()->back()->with('error', "Dokumen {$reportNames} telah dibuat. Tidak bisa menghapus penganggaran ini karena berisiko merusak data. Hapus {$reportNames} terlebih dahulu agar bisa menghapus penganggaran ini.");
        }

        try {
            $penganggaran->delete();
        } catch (QueryException $e) {
            return redirect()->back()->with('error', 'Gagal menghapus penganggaran karena masih terdapat relasi data lain yang terhubung.');
        }

        return redirect()->back()->with('success', 'Data anggaran berhasil dihapus');
    }

    public function updateTanggalCetak(Request $request, $id)
    {
        $request->validate([
            'tanggal_cetak' => 'required|date',
        ]);

        $penganggaran = ($this->Penganggaran)::findOrFail($id);
        $penganggaran->update([
            'tanggal_cetak' => $request->tanggal_cetak,
        ]);

        return redirect()->back()->with('success', 'Tanggal cetak berhasil diperbarui');
    }

    public function updateTanggalPerubahan(Request $request, $id)
    {
        $request->validate([
            'tanggal_perubahan' => 'required|date',
        ]);

        $penganggaran = ($this->Penganggaran)::findOrFail($id);
        $penganggaran->update([
            'tanggal_perubahan' => $request->tanggal_perubahan,
        ]);

        return redirect()->back()->with('success', 'Tanggal perubahan berhasil diperbarui');
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
