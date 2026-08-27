<?php

namespace App\Http\Controllers;

use App\Config\VariantConfig;
use App\Models\PenerimaanDana;
use App\Models\Penganggaran;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class PenerimaanDanaController extends Controller
{
    protected string $variant;

    protected string $Penganggaran;

    protected string $PenerimaanDana;

    public function __construct()
    {
        $this->middleware(function ($request, $next) {
            $this->variant = app()->bound('variant') ? app('variant') : 'reguler';
            $this->Penganggaran = VariantConfig::getModelClass('penganggaran', $this->variant);
            $this->PenerimaanDana = VariantConfig::getModelClass('penerimaan_dana', $this->variant);

            return $next($request);
        });
    }

    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        Log::info('Store Request Data:', $request->all());

        $fk = VariantConfig::penganggaranFk($this->variant);
        $penganggaranId = $request->input($fk) ?? $request->input('penganggaran_id');

        $validationRules = [
            'penganggaran_id' => 'required|exists:'.(new $this->Penganggaran)->getTable().',id',
            'sumber_dana' => 'required|string|in:'.implode(',', VariantConfig::sumberDanaOptions($this->variant)),
            'tanggal_terima' => 'required|date',
            'jumlah_dana' => 'required|numeric',
        ];

        // Hanya validasi saldo_awal untuk varian yang punya konsep Tahap 1 (reguler/kinerja)
        if (VariantConfig::sumberDanaTahap1($this->variant) !== null) {
            $validationRules['saldo_awal'] = 'nullable|numeric';
            $validationRules['tanggal_saldo_awal'] = 'nullable|date';
        }

        // Sanitize currency inputs before validation
        $request->merge([
            'penganggaran_id' => $penganggaranId,
            'jumlah_dana' => $request->jumlah_dana ? (float) str_replace(['Rp', '.', ',', ' '], '', $request->jumlah_dana) : null,
            'saldo_awal' => $request->has('saldo_awal') && $request->saldo_awal ? (float) str_replace(['Rp', '.', ',', ' '], '', $request->saldo_awal) : null,
            'tanggal_saldo_awal' => $request->tanggal_saldo_awal ?: null,
        ]);

        $validated = $request->validate($validationRules);

        try {
            // Validasi tahun anggaran - pastikan sesuai dengan penganggaran_id
            $penganggaran = ($this->Penganggaran)::find($penganggaranId);
            if (! $penganggaran) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data penganggaran tidak ditemukan',
                ], 422);
            }

            // Cek apakah sudah ada penerimaan dana untuk sumber dana ini
            $existingPenerimaan = ($this->PenerimaanDana)::where($fk, $penganggaranId)
                ->where('sumber_dana', $validated['sumber_dana'])
                ->first();

            if ($existingPenerimaan) {
                return response()->json([
                    'success' => false,
                    'message' => 'Sumber dana ini sudah pernah ditambahkan',
                ], 422);
            }

            // saldo_awal hanya berlaku untuk Tahap 1 (reguler/kinerja); selain itu null
            if ($validated['sumber_dana'] !== VariantConfig::sumberDanaTahap1($this->variant)) {
                $validated['saldo_awal'] = null;
                $validated['tanggal_saldo_awal'] = null;
            }

            ($this->PenerimaanDana)::create([
                $fk => $penganggaranId,
                'sumber_dana' => $validated['sumber_dana'],
                'tanggal_terima' => $validated['tanggal_terima'],
                'jumlah_dana' => $validated['jumlah_dana'],
                'saldo_awal' => $validated['saldo_awal'] ?? null,
                'tanggal_saldo_awal' => $validated['tanggal_saldo_awal'] ?? null,
            ]);

            return redirect()->back()->with('success', 'Penerimaan dana berhasil disimpan');
        } catch (\Exception $e) {
            Log::error('Error storing penerimaan dana: '.$e->getMessage());

            return redirect()->back()->with('error', 'Gagal menyimpan penerimaan dana: '.$e->getMessage());
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(PenerimaanDana $penerimaanDana)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(PenerimaanDana $penerimaanDana)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, PenerimaanDana $penerimaanDana)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        try {
            $penerimaanDana = ($this->PenerimaanDana)::findOrFail($id);
            $penerimaanDana->delete();

            // Always redirect back for Inertia requests
            return redirect()->back()->with('success', 'Penerimaan Dana berhasil dihapus');
        } catch (\Exception $e) {
            Log::error('Error deleting penerimaan dana: '.$e->getMessage());

            // Always redirect back with error for Inertia requests
            return redirect()->back()->with('error', 'Gagal menghapus penerimaan dana: '.$e->getMessage());
        }
    }

    public function destroySaldoAwal($id)
    {
        try {
            $penerimaanDana = ($this->PenerimaanDana)::findOrFail($id);
            $penerimaanDana->delete();

            // Always redirect back for Inertia requests
            return redirect()->back()->with('success', 'Penerimaan Dana berhasil dihapus');
        } catch (\Exception $e) {
            Log::error('Error deleting penerimaan dana: '.$e->getMessage());

            // Always redirect back with error for Inertia requests
            return redirect()->back()->with('error', 'Gagal menghapus penerimaan dana: '.$e->getMessage());
        }
    }

    /**
     * Get penerimaan dana by penganggaran ID
     */
    public function getByPenganggaran($penganggaran_id)
    {
        try {
            // Pastikan penganggaran_id adalah angka dan valid
            if (! is_numeric($penganggaran_id) || $penganggaran_id <= 0) {
                return response()->json([
                    'error' => 'Invalid penganggaran ID',
                ], 400);
            }

            $penerimaanDanas = ($this->PenerimaanDana)::where(VariantConfig::penganggaranFk($this->variant), $penganggaran_id)
                ->orderBy('tanggal_terima', 'asc')
                ->get();

            return response()->json($penerimaanDanas);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to load data: '.$e->getMessage(),
            ], 500);
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
