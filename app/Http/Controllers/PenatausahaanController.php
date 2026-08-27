<?php

namespace App\Http\Controllers;

use App\Config\VariantConfig;
use App\Models\Penganggaran;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class PenatausahaanController extends Controller
{
    protected string $variant;

    protected string $Penganggaran;

    protected string $Rkas;

    protected string $PenerimaanDana;

    public function __construct()
    {
        $this->middleware(function ($request, $next) {
            $this->variant = app()->bound('variant') ? app('variant') : 'reguler';
            $this->Penganggaran = VariantConfig::getModelClass('penganggaran', $this->variant);
            $this->Rkas = VariantConfig::getModelClass('rkas', $this->variant);
            $this->PenerimaanDana = VariantConfig::getModelClass('penerimaan_dana', $this->variant);

            return $next($request);
        });
    }

    public function bku($id, $bulan)
    {
        $penganggaran = ($this->Penganggaran)::findOrFail($id);

        return $this->renderVariant('Penatausahaan/Bku', [
            'bulan' => $bulan,
            'tahun' => $penganggaran->tahun_anggaran,
            'penganggaran' => $penganggaran,
        ]);
    }

    public function index(Request $request)
    {
        // Ambil semua tahun yang ada
        $tahunList = ($this->Penganggaran)::distinct()
            ->orderBy('tahun_anggaran', 'desc')
            ->pluck('tahun_anggaran')
            ->toArray();

        // Ambil semua data penganggaran dengan relasi yang diperlukan
        $penganggaranList = ($this->Penganggaran)::with(['penerimaanDanas']) // Pastikan relasi ini dimuat
            ->orderBy('tahun_anggaran', 'desc')
            ->get();

        // Siapkan data status untuk setiap tahun
        $statusPerTahun = [];
        $tahap2 = VariantConfig::sumberDanaTahap2($this->variant);
        foreach ($penganggaranList as $penganggaran) {
            $statusPerTahun[$penganggaran->tahun_anggaran] = $penganggaran->getBulanStatus();
            $penganggaran->has_tahap_2 = $tahap2 ? $penganggaran->penerimaanDanas->contains('sumber_dana', $tahap2) : true;
        }

        return $this->renderVariant('Penatausahaan/Index', [
            'tahunList' => $tahunList,
            'penganggaranList' => $penganggaranList,
            'statusPerTahun' => $statusPerTahun,
            'tahun' => ! empty($tahunList) ? $tahunList[0] : date('Y'),
        ]);
    }

    public function getPenganggaranId(Request $request)
    {
        $tahun = $request->query('tahun');

        Log::info('getPenganggaranId called with tahun: '.$tahun);

        if (! $tahun) {
            return response()->json([
                'error' => 'Parameter tahun diperlukan',
            ], 400);
        }

        try {
            // Cari penganggaran berdasarkan tahun
            $penganggaran = ($this->Penganggaran)::where('tahun_anggaran', $tahun)->first();

            if ($penganggaran) {
                return response()->json([
                    'penganggaran_id' => $penganggaran->id,
                    VariantConfig::penganggaranFk($this->variant) => $penganggaran->id,
                    'tahun_anggaran' => $penganggaran->tahun_anggaran,
                ]);
            }

            return response()->json([
                'penganggaran_id' => null,
                'tahun_anggaran' => $tahun,
            ]);
        } catch (\Exception $e) {
            Log::error('Error in getPenganggaranId: '.$e->getMessage());

            return response()->json([
                'error' => 'Terjadi kesalahan server: '.$e->getMessage(),
            ], 500);
        }
    }

    public function getByPenganggaran($penganggaran_id)
    {
        try {
            Log::info('getByPenganggaran called with ID: '.$penganggaran_id);

            // Pastikan penganggaran_id adalah angka dan valid
            if (! is_numeric($penganggaran_id) || $penganggaran_id <= 0) {
                return response()->json([
                    'error' => 'Invalid penganggaran ID',
                ], 400);
            }

            // Cek apakah penganggaran exists
            $penganggaran = ($this->Penganggaran)::find($penganggaran_id);
            if (! $penganggaran) {
                return response()->json([
                    'error' => 'Data penganggaran tidak ditemukan',
                ], 404);
            }

            $penerimaanDanas = ($this->PenerimaanDana)::where(VariantConfig::penganggaranFk($this->variant), $penganggaran_id)
                ->orderBy('tanggal_terima', 'asc')
                ->get();

            Log::info('Penerimaan dana found: '.$penerimaanDanas->count().' records for penganggaran ID: '.$penganggaran_id);

            return response()->json($penerimaanDanas);
        } catch (\Exception $e) {
            Log::error('Error getting penerimaan dana: '.$e->getMessage());

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
            'sumberDanaOptions' => VariantConfig::sumberDanaOptions($var),
            'sumberDanaTahap1' => VariantConfig::sumberDanaTahap1($var),
        ]));
    }
}
