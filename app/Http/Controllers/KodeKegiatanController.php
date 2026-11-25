<?php

namespace App\Http\Controllers;

use App\Imports\KodeKegiatanImport;
use App\Models\KodeKegiatan;
use App\Services\ReferensiKodeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

class KodeKegiatanController extends Controller
{
    public function __construct(
        protected ReferensiKodeService $referensiService
    ) {}

    /**
     * Display a listing of the resource scoped by tahun.
     */
    public function index(Request $request)
    {
        $availableYears = $this->referensiService->resolveActiveYears(includeArkas: false);
        $statsPerYear = $this->referensiService->getStatsPerYear();

        $requestedYear = $request->filled('year') ? (int) $request->input('year') : 0;
        $selectedYear = ($requestedYear >= 2000 && $requestedYear <= 2100)
            ? $requestedYear
            : (int) ($availableYears[0] ?? date('Y'));

        if (! in_array((string) $selectedYear, $availableYears, true)) {
            $availableYears[] = (string) $selectedYear;
            usort($availableYears, static fn ($a, $b) => (int) $b <=> (int) $a);
        }

        $kode_kegiatan = KodeKegiatan::forYear($selectedYear)
            ->orderBy('kode', 'asc')
            ->get();

        return Inertia::render('DataMaster/KodeKegiatan/Index', [
            'kode_kegiatan' => $kode_kegiatan,
            'selectedYear' => $selectedYear,
            'availableYears' => $availableYears,
            'statsPerYear' => $statsPerYear,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $tahun = (int) $request->input('tahun', date('Y'));

        $validated = $request->validate([
            'tahun' => 'nullable|digits:4|integer|min:2000|max:2100',
            'sumber_dana' => ['nullable', Rule::in(KodeKegiatan::VALID_SUMBER_DANA)],
            'kode' => [
                'required',
                'string',
                Rule::unique('kode_kegiatans', 'kode')->where(fn ($q) => $q->where('tahun', $tahun)),
            ],
            'program' => 'required|string',
            'sub_program' => 'required|string',
            'uraian' => 'required|string',
        ]);

        KodeKegiatan::create([
            'tahun' => $tahun,
            'sumber_dana' => $validated['sumber_dana'] ?? KodeKegiatan::SUMBER_REGULER,
            'kode' => trim((string) $validated['kode']),
            'program' => trim((string) $validated['program']),
            'sub_program' => trim((string) $validated['sub_program']),
            'uraian' => trim((string) $validated['uraian']),
        ]);

        return redirect()->back()->with('success', "Kode Kegiatan tahun {$tahun} berhasil ditambahkan.");
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $kodeKegiatan = KodeKegiatan::findOrFail($id);
        $tahun = (int) ($request->input('tahun') ?: $kodeKegiatan->tahun);

        $validated = $request->validate([
            'tahun' => 'nullable|digits:4|integer|min:2000|max:2100',
            'sumber_dana' => ['nullable', Rule::in(KodeKegiatan::VALID_SUMBER_DANA)],
            'kode' => [
                'required',
                'string',
                Rule::unique('kode_kegiatans', 'kode')
                    ->where(fn ($q) => $q->where('tahun', $tahun))
                    ->ignore($kodeKegiatan->id),
            ],
            'program' => 'required|string',
            'sub_program' => 'required|string',
            'uraian' => 'required|string',
        ]);

        $kodeKegiatan->update([
            'tahun' => $tahun,
            'sumber_dana' => $validated['sumber_dana'] ?? ($kodeKegiatan->sumber_dana ?: KodeKegiatan::SUMBER_REGULER),
            'kode' => trim((string) $validated['kode']),
            'program' => trim((string) $validated['program']),
            'sub_program' => trim((string) $validated['sub_program']),
            'uraian' => trim((string) $validated['uraian']),
        ]);

        return redirect()->back()->with('success', "Kode Kegiatan tahun {$tahun} berhasil diperbarui.");
    }

    /**
     * Remove the specified resource from storage (dilindungi jika masih dipakai transaksi).
     */
    public function destroy(string $id)
    {
        $kodeKegiatan = KodeKegiatan::findOrFail($id);
        $usageCount = $this->referensiService->countUsage('kegiatan', (int) $kodeKegiatan->id);

        if ($usageCount > 0) {
            return redirect()->back()->with(
                'error',
                "Kode Kegiatan {$kodeKegiatan->kode} (Tahun {$kodeKegiatan->tahun}) tidak dapat dihapus karena masih digunakan oleh {$usageCount} data RKAS/BKU/Kwitansi/Tanda Terima."
            );
        }

        $kodeKegiatan->delete();

        return redirect()->back()->with('success', 'Kode Kegiatan berhasil dihapus.');
    }

    /**
     * Download Template
     */
    public function downloadTemplate()
    {
        $path = 'templates/template_kode_kegiatan.xlsx';
        if (Storage::disk('public')->exists($path)) {
            return Storage::disk('public')->download($path);
        }

        return redirect()->back()->with('error', 'File template tidak ditemukan.');
    }

    /**
     * Import Data untuk tahun terpilih.
     */
    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|mimes:xlsx,xls',
            'tahun' => 'nullable|digits:4|integer|min:2000|max:2100',
        ]);

        $tahun = (int) $request->input('tahun', date('Y'));
        $import = new KodeKegiatanImport($tahun);
        Excel::import($import, $request->file('file'));

        $count = $import->getRowCount();
        $duplicates = $import->getDuplicates();
        $failures = $import->failures();

        $message = "Berhasil mengimport {$count} data untuk tahun {$tahun}.";

        if (count($duplicates) > 0) {
            $message .= ' Ditemukan '.count($duplicates).' data duplikat (dilewati).';
        }

        if ($failures->count() > 0) {
            $message .= ' Gagal mengimport '.$failures->count().' baris karena validasi.';
        }

        return redirect()->back()->with('success', $message);
    }

    /**
     * Salin seluruh Kode Kegiatan dari tahun sumber ke tahun tujuan (mode offline/manual).
     */
    public function copyYear(Request $request)
    {
        $validated = $request->validate([
            'source_year' => 'required|digits:4|integer|min:2000|max:2100',
            'target_year' => 'required|digits:4|integer|min:2000|max:2100|different:source_year',
        ]);

        $result = $this->referensiService->copyFromYear(
            'kegiatan',
            (int) $validated['source_year'],
            (int) $validated['target_year']
        );

        if (($result['status'] ?? null) !== 'success') {
            return redirect()->back()->with('error', $result['message'] ?? 'Gagal menyalin data.');
        }

        return redirect()->back()->with('success', $result['message']);
    }
}
