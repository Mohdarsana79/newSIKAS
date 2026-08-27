<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Config\VariantConfig;

class DokumenController extends Controller
{
    protected string $variant;
    protected string $Penganggaran;
    protected string $BukuKasUmum;
    protected string $Dokumen;

    public function __construct()
    {
        $this->middleware(function ($request, $next) {
            $this->variant = app()->bound('variant') ? app('variant') : 'reguler';
            $this->Penganggaran = VariantConfig::getModelClass('penganggaran', $this->variant);
            $this->BukuKasUmum = VariantConfig::getModelClass('bku', $this->variant);
            $this->Dokumen = VariantConfig::getModelClass('dokumen', $this->variant);

            return $next($request);
        });
    }
    public function index()
    {
        $penganggarans = ($this->Penganggaran)::select('id', 'tahun_anggaran')->get();
        return $this->renderVariant('Penatausahaan/Dokumen/Index', [
            'penganggarans' => $penganggarans
        ]);
    }

    public function getData(Request $request)
    {
        $request->validate([
            VariantConfig::penganggaranFk($this->variant) => 'required',
            'bulan' => 'required|integer|min:1|max:12',
        ]);

        $query = ($this->BukuKasUmum)::query()
            ->with(['dokumen'])
            ->where(VariantConfig::penganggaranFk($this->variant), $request->{VariantConfig::penganggaranFk($this->variant)})
            ->whereMonth('tanggal_transaksi', $request->bulan)
            ->where(function ($q) {
                $q->where(function ($q1) {
                    $q1->whereNotNull('uraian')->where('uraian', '!=', '');
                })->orWhere(function ($q2) {
                    $q2->whereNotNull('uraian_opsional')->where('uraian_opsional', '!=', '');
                });
            });

        if ($request->search) {
            $search = strtolower($request->search);
            $query->where(function($q) use ($search) {
                $q->whereHas('dokumen', function($subQ) use ($search) {
                    $subQ->whereRaw('LOWER(nama_dokumen) LIKE ?', ['%' . $search . '%']);
                })->orWhereRaw('LOWER(uraian) LIKE ?', ['%' . $search . '%'])
                  ->orWhereRaw('LOWER(uraian_opsional) LIKE ?', ['%' . $search . '%']);
            });
        }

        $bkus = $query->latest('tanggal_transaksi')->paginate(10);

        return response()->json($bkus);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            VariantConfig::penganggaranFk($this->variant) => 'required|exists:' . (new $this->Penganggaran)->getTable() . ',id',
            VariantConfig::bkuFk($this->variant) => 'required|exists:' . (new $this->BukuKasUmum)->getTable() . ',id',
            'nama_dokumen' => 'required|string|max:255',
            'link_drive' => 'required|url',
        ]);

        ($this->Dokumen)::create($validated);

        return redirect()->back()->with('success', 'Dokumen berhasil ditambahkan');
    }

    public function destroy($id)
    {
        $dokumen = ($this->Dokumen)::findOrFail($id);
        $dokumen->delete();

        return redirect()->back()->with('success', 'Dokumen berhasil dihapus');
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
