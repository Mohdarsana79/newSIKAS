<?php

namespace App\Http\Controllers;

use App\Models\RefPtk;
use App\Services\RefPtkService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class DataPtkController extends Controller
{
    public function __construct(
        protected RefPtkService $ptkService
    ) {}

    public function index(Request $request)
    {
        $availableYears = $this->ptkService->resolveActiveYears(includeArkas: true);
        $statsPerYear = $this->ptkService->getStatsPerYear();

        $requestedYear = $request->filled('year') ? (string) $request->input('year') : '';
        $selectedYear = preg_match('/^\d{4}$/', $requestedYear) === 1
            ? (int) $requestedYear
            : (int) ($availableYears[0] ?? date('Y'));

        if (! in_array((string) $selectedYear, $availableYears, true)) {
            array_unshift($availableYears, (string) $selectedYear);
            usort($availableYears, static fn ($a, $b) => (int) $b <=> (int) $a);
        }

        $ptks = RefPtk::forYear($selectedYear)
            ->orderByDesc('is_active')
            ->orderBy('jenis_ptk_arkas')
            ->orderBy('nama')
            ->get()
            ->map(static fn (RefPtk $ptk) => [
                'id' => $ptk->id,
                'tahun' => $ptk->tahun,
                'ptk_id' => $ptk->ptk_id,
                'nuptk' => $ptk->nuptk,
                'nama' => $ptk->nama,
                'jenis_kelamin' => $ptk->jenis_kelamin,
                'jenis_ptk_arkas' => $ptk->jenis_ptk_arkas,
                'jenis_label' => $ptk->jenis_label,
                'formatted_uraian_arkas' => $ptk->formatted_uraian_arkas,
                'masa_kerja_tahun' => $ptk->masa_kerja_tahun,
                'masa_kerja_bulan' => $ptk->masa_kerja_bulan,
                'pernah_sertifikasi' => $ptk->pernah_sertifikasi,
                'is_active' => $ptk->is_active,
                'sumber' => $ptk->sumber,
            ])
            ->values();

        return Inertia::render('DataMaster/DataPtk/Index', [
            'ptks' => $ptks,
            'selectedYear' => $selectedYear,
            'availableYears' => $availableYears,
            'statsPerYear' => $statsPerYear,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'tahun' => ['required', 'integer', 'min:2000', 'max:2100'],
            'nama' => ['required', 'string', 'max:120'],
            'nuptk' => [
                'nullable',
                'string',
                'max:32',
                Rule::unique('ref_ptks', 'nuptk')
                    ->where(fn ($q) => $q->where('tahun', (int) $request->input('tahun')))
                    ->whereNotNull('nuptk'),
            ],
            'jenis_ptk_arkas' => ['required', 'integer', Rule::in([RefPtk::JENIS_GURU, RefPtk::JENIS_TENDIK, RefPtk::JENIS_ASN])],
            'jenis_kelamin' => ['nullable', 'string', Rule::in(['L', 'P'])],
            'is_active' => ['nullable', 'boolean'],
        ], [
            'nuptk.unique' => 'NUPTK tersebut sudah terdaftar pada tahun anggaran ini.',
        ]);

        $nuptk = trim((string) ($validated['nuptk'] ?? ''));

        RefPtk::create([
            'tahun' => (int) $validated['tahun'],
            'ptk_id' => null,
            'nama' => trim((string) $validated['nama']),
            'nuptk' => $nuptk !== '' ? $nuptk : null,
            'jenis_ptk_arkas' => (int) $validated['jenis_ptk_arkas'],
            'jenis_kelamin' => $validated['jenis_kelamin'] ?? null,
            'is_active' => array_key_exists('is_active', $validated) ? (bool) $validated['is_active'] : true,
            'sumber' => RefPtk::SUMBER_MANUAL,
        ]);

        return redirect()->back()->with('success', 'Data PTK berhasil ditambahkan.');
    }

    public function update(Request $request, int $id)
    {
        $ptk = RefPtk::findOrFail($id);

        $validated = $request->validate([
            'nama' => ['required', 'string', 'max:120'],
            'nuptk' => [
                'nullable',
                'string',
                'max:32',
                Rule::unique('ref_ptks', 'nuptk')
                    ->where(fn ($q) => $q->where('tahun', $ptk->tahun))
                    ->whereNotNull('nuptk')
                    ->ignore($ptk->id),
            ],
            'jenis_ptk_arkas' => ['required', 'integer', Rule::in([RefPtk::JENIS_GURU, RefPtk::JENIS_TENDIK, RefPtk::JENIS_ASN])],
            'jenis_kelamin' => ['nullable', 'string', Rule::in(['L', 'P'])],
            'is_active' => ['required', 'boolean'],
        ], [
            'nuptk.unique' => 'NUPTK tersebut sudah terdaftar pada tahun anggaran ini.',
        ]);

        $nuptk = trim((string) ($validated['nuptk'] ?? ''));

        $ptk->update([
            'nama' => trim((string) $validated['nama']),
            'nuptk' => $nuptk !== '' ? $nuptk : null,
            'jenis_ptk_arkas' => (int) $validated['jenis_ptk_arkas'],
            'jenis_kelamin' => $validated['jenis_kelamin'] ?? null,
            'is_active' => (bool) $validated['is_active'],
        ]);

        return redirect()->back()->with('success', 'Data PTK berhasil diperbarui.');
    }

    public function destroy(int $id)
    {
        $ptk = RefPtk::findOrFail($id);
        $ptk->delete();

        return redirect()->back()->with('success', 'Data PTK berhasil dihapus.');
    }

    public function syncArkas(Request $request)
    {
        $validated = $request->validate([
            'year' => ['required', 'digits:4', 'integer', 'min:2000', 'max:2100'],
        ]);

        $result = $this->ptkService->syncFromArkas((int) $validated['year']);

        if ($request->expectsJson() && ! $request->header('X-Inertia')) {
            return response()->json($result, ($result['status'] ?? null) === 'success' ? 200 : 422);
        }

        if (($result['status'] ?? null) !== 'success') {
            return redirect()->back()->with('error', $result['message'] ?? 'Gagal menyinkronkan data PTK dari ARKAS.');
        }

        return redirect()->back()->with('success', $result['message'] ?? 'Sinkronisasi data PTK berhasil.');
    }

    public function copyYear(Request $request)
    {
        $validated = $request->validate([
            'source_year' => ['required', 'digits:4', 'integer', 'min:2000', 'max:2100'],
            'target_year' => ['required', 'digits:4', 'integer', 'min:2000', 'max:2100', 'different:source_year'],
        ]);

        $result = $this->ptkService->copyFromYear(
            (int) $validated['source_year'],
            (int) $validated['target_year']
        );

        if (($result['status'] ?? null) !== 'success') {
            return redirect()->back()->with('error', $result['message'] ?? 'Gagal menyalin data PTK.');
        }

        return redirect()->back()->with('success', $result['message']);
    }
}
