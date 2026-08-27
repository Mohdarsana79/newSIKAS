<?php

namespace App\Http\Controllers;

use App\Models\Penganggaran;
use Illuminate\Http\Request;
use App\Config\VariantConfig;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use App\Models\Rkas;
use App\Models\RkasPerubahan;
use App\Models\SekolahProfile;
use App\Models\KodeKegiatan;
use App\Models\RekeningBelanja;

class PenganggaranController extends Controller
{
    protected string $variant;
    protected string $Penganggaran;
    protected string $Rkas;
    protected ?string $RkasPerubahan = null;
    protected string $BukuKasUmum;

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
            $hasPerubahan = $this->RkasPerubahan ? ($this->RkasPerubahan)::where(VariantConfig::penganggaranFk($this->variant), $anggaran->id)->exists() : false;
            $hasBkuReguler = ($this->BukuKasUmum)::where(VariantConfig::penganggaranFk($this->variant), $anggaran->id)->exists();
            $hasBkuPerubahan = ($this->BukuKasUmum)::where(VariantConfig::penganggaranFk($this->variant), $anggaran->id)
                ->whereMonth('tanggal_transaksi', '>=', 7)
                ->exists();

            // 1. Add Regular Item
            $items->push([
                'id' => $anggaran->id,
                'title' => "RKAS {$variantTitle} " . $anggaran->tahun_anggaran,
                'pagu' => 'Rp ' . number_format($anggaran->pagu_anggaran, 0, ',', '.'),
                'status' => 'regular',
                'has_perubahan' => $hasPerubahan, // Flag to disable button / hide edit
                'has_bku' => $hasBkuReguler,
                'tahun' => $anggaran->tahun_anggaran,
            ]);

            // 2. Add Perubahan Item if exists
            if ($hasPerubahan) {
                $items->push([
                    'id' => $anggaran->id, // Same ID, will use status to change route
                    'title' => "RKAS Perubahan {$variantTitle} " . $anggaran->tahun_anggaran,
                    'pagu' => 'Rp ' . number_format($anggaran->pagu_anggaran, 0, ',', '.'),
                    'status' => 'perubahan',
                    'has_perubahan' => true,
                    'has_bku' => $hasBkuPerubahan,
                    'tahun' => $anggaran->tahun_anggaran,
                ]);
            }
        }

        $canCreate = SekolahProfile::exists() && KodeKegiatan::exists() && RekeningBelanja::exists();

        return $this->renderVariant('Penganggaran/Index', [
             'items' => $items,
             'anggarans' => $anggarans, // passing raw data too if needed
             'can_create' => $canCreate
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'pagu_anggaran' => 'required',
            'tahun_anggaran' => 'required|digits:4|integer|min:2000|max:' . (date('Y') + 5),
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
            'sekolah_id' => \App\Models\SekolahProfile::query()->first()->id ?? null,
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
            'tahun_anggaran' => 'required|digits:4|integer|min:2000|max:' . (date('Y') + 5),
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

        // Format angka sebelum disimpan
        $pagu = preg_replace('/[^\d]/', '', $request->pagu_anggaran);

        $penganggaran->update([
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
        ]);

        return redirect()->back()->with('success', 'Data anggaran berhasil diperbarui');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $penganggaran = ($this->Penganggaran)::findOrFail($id);

        // Validasi BKU
        $hasBku = ($this->BukuKasUmum)::where(VariantConfig::penganggaranFk($this->variant), $id)->exists();
        if ($hasBku) {
            return redirect()->back()->with('error', 'Penganggaran tidak dapat di hapus karena sudah ada data belanja pada BKU, anda perlu menghapus data bku pada penganggaran ini untuk dapat menghapus penganggaran ini');
        }

        $penganggaran->delete();

        return redirect()->back()->with('success', 'Data anggaran berhasil dihapus');
    }

    public function updateTanggalCetak(Request $request, $id)
    {
        $request->validate([
            'tanggal_cetak' => 'required|date',
        ]);

        $penganggaran = ($this->Penganggaran)::findOrFail($id);
        $penganggaran->update([
            'tanggal_cetak' => $request->tanggal_cetak
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
            'tanggal_perubahan' => $request->tanggal_perubahan
        ]);

        return redirect()->back()->with('success', 'Tanggal perubahan berhasil diperbarui');
    }

    protected function renderVariant($component, $props = [])
    {
        $var = $this->variant ?? (request()->route() ? (request()->route()->parameter('variant') ?? request()->get('_variant', 'reguler')) : 'reguler');
        if (app()->bound('variant')) {
            $var = app('variant');
        }
        return \Inertia\Inertia::render(VariantConfig::pagePrefix($var) . $component, array_merge($props, [
            'variant' => $var,
            'routePrefix' => VariantConfig::routePrefix($var)
        ]));
    }
}
