<?php

namespace App\Http\Controllers;

use App\Imports\RekeningBelanjaImport;
use App\Models\RekeningBelanja;
use App\Services\ReferensiKodeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

class RekeningBelanjaController extends Controller
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

        $rekening_belanja = RekeningBelanja::forYear($selectedYear)
            ->orderBy('kode_rekening', 'asc')
            ->get();

        return Inertia::render('DataMaster/RekeningBelanja/Index', [
            'rekening_belanja' => $rekening_belanja,
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
            'kode_rekening' => [
                'required',
                'string',
                Rule::unique('rekening_belanjas', 'kode_rekening')->where(fn ($q) => $q->where('tahun', $tahun)),
            ],
            'rincian_objek' => 'required|string',
            'kategori' => 'required|string',
            'is_ppn' => 'boolean',
            'is_pph21' => 'boolean',
            'is_pph22' => 'boolean',
            'is_pph23' => 'boolean',
            'is_pph4' => 'boolean',
        ]);

        RekeningBelanja::create([
            'tahun' => $tahun,
            'kode_rekening' => trim((string) $validated['kode_rekening']),
            'rincian_objek' => trim((string) $validated['rincian_objek']),
            'kategori' => trim((string) $validated['kategori']),
            'is_ppn' => (bool) ($validated['is_ppn'] ?? false),
            'is_pph21' => (bool) ($validated['is_pph21'] ?? false),
            'is_pph22' => (bool) ($validated['is_pph22'] ?? false),
            'is_pph23' => (bool) ($validated['is_pph23'] ?? false),
            'is_pph4' => (bool) ($validated['is_pph4'] ?? false),
        ]);

        return redirect()->back()->with('success', "Rekening Belanja tahun {$tahun} berhasil ditambahkan.");
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $rekeningBelanja = RekeningBelanja::findOrFail($id);
        $tahun = (int) ($request->input('tahun') ?: $rekeningBelanja->tahun);

        $validated = $request->validate([
            'tahun' => 'nullable|digits:4|integer|min:2000|max:2100',
            'kode_rekening' => [
                'required',
                'string',
                Rule::unique('rekening_belanjas', 'kode_rekening')
                    ->where(fn ($q) => $q->where('tahun', $tahun))
                    ->ignore($rekeningBelanja->id),
            ],
            'rincian_objek' => 'required|string',
            'kategori' => 'required|string',
            'is_ppn' => 'boolean',
            'is_pph21' => 'boolean',
            'is_pph22' => 'boolean',
            'is_pph23' => 'boolean',
            'is_pph4' => 'boolean',
        ]);

        $rekeningBelanja->update([
            'tahun' => $tahun,
            'kode_rekening' => trim((string) $validated['kode_rekening']),
            'rincian_objek' => trim((string) $validated['rincian_objek']),
            'kategori' => trim((string) $validated['kategori']),
            'is_ppn' => (bool) ($validated['is_ppn'] ?? false),
            'is_pph21' => (bool) ($validated['is_pph21'] ?? false),
            'is_pph22' => (bool) ($validated['is_pph22'] ?? false),
            'is_pph23' => (bool) ($validated['is_pph23'] ?? false),
            'is_pph4' => (bool) ($validated['is_pph4'] ?? false),
        ]);

        return redirect()->back()->with('success', "Rekening Belanja tahun {$tahun} berhasil diperbarui.");
    }

    /**
     * Remove the specified resource from storage (dilindungi jika masih dipakai transaksi).
     */
    public function destroy(string $id)
    {
        $rekeningBelanja = RekeningBelanja::findOrFail($id);
        $usageCount = $this->referensiService->countUsage('rekening', (int) $rekeningBelanja->id);

        if ($usageCount > 0) {
            return redirect()->back()->with(
                'error',
                "Rekening Belanja {$rekeningBelanja->kode_rekening} (Tahun {$rekeningBelanja->tahun}) tidak dapat dihapus karena masih digunakan oleh {$usageCount} data RKAS/BKU/Kwitansi/Tanda Terima."
            );
        }

        $rekeningBelanja->delete();

        return redirect()->back()->with('success', 'Rekening Belanja berhasil dihapus.');
    }

    /**
     * Download Template
     */
    public function downloadTemplate()
    {
        $path = 'templates/template_rekening_belanja.xlsx';
        if (Storage::disk('public')->exists($path)) {
            return response()->download(storage_path('app/public/'.$path));
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
        $import = new RekeningBelanjaImport($tahun);
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
     * Salin seluruh Rekening Belanja dari tahun sumber ke tahun tujuan (mode offline/manual).
     */
    public function copyYear(Request $request)
    {
        $validated = $request->validate([
            'source_year' => 'required|digits:4|integer|min:2000|max:2100',
            'target_year' => 'required|digits:4|integer|min:2000|max:2100|different:source_year',
        ]);

        $result = $this->referensiService->copyFromYear(
            'rekening',
            (int) $validated['source_year'],
            (int) $validated['target_year']
        );

        if (($result['status'] ?? null) !== 'success') {
            return redirect()->back()->with('error', $result['message'] ?? 'Gagal menyalin data.');
        }

        return redirect()->back()->with('success', $result['message']);
    }
}
