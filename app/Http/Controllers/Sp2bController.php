<?php

namespace App\Http\Controllers;

use App\Models\Sp2b;
use App\Models\Penganggaran;
use App\Models\BukuKasUmum;
use App\Models\PenerimaanDana;
use Illuminate\Http\Request;
use App\Config\VariantConfig;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

use Illuminate\Validation\Rule;

class Sp2bController extends Controller
{
    protected string $variant;
    protected string $Penganggaran;
    protected string $PenerimaanDana;
    protected string $BukuKasUmum;
    protected string $Sp2b;

    public function __construct()
    {
        $this->middleware(function ($request, $next) {
            $this->variant = app()->bound('variant') ? app('variant') : 'reguler';
            $this->Penganggaran = VariantConfig::getModelClass('penganggaran', $this->variant);
            $this->PenerimaanDana = VariantConfig::getModelClass('penerimaan_dana', $this->variant);
            $this->BukuKasUmum = VariantConfig::getModelClass('bku', $this->variant);
            $this->Sp2b = VariantConfig::getModelClass('sp2b', $this->variant);

            return $next($request);
        });
    }
    public function index(Request $request)
    {
        $query = ($this->Sp2b)::with(['penganggaran']);

        if ($request->has('search')) {
            $search = $request->search;
            $query->where('nomor_sp2b', 'like', "%{$search}%");
        }

        $perPage = $request->input('per_page', 10);
        return response()->json($query->latest()->paginate($perPage));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            VariantConfig::penganggaranFk($this->variant) => 'required|exists:' . (new $this->Penganggaran)->getTable() . ',id',
            'jenis_periode' => 'required|in:bulan,tahap',
            'bulan' => 'required_if:jenis_periode,bulan',
            'nomor_sp2b' => [
                'required',
                'string',
                Rule::unique((new $this->Sp2b)->getTable())->where(function ($query) use ($request) {
                    $q = $query->where(VariantConfig::penganggaranFk($this->variant), $request->{VariantConfig::penganggaranFk($this->variant)})
                               ->where('jenis_periode', $request->jenis_periode);
                    if ($request->jenis_periode == 'bulan') {
                        return $q->where('bulan', $request->bulan);
                    }
                    return $q->where('tahap', $request->tahap);
                })
            ],
            'tanggal_sp2b' => 'required|date',
            'tahap' => 'required_if:jenis_periode,tahap|in:1,2',
            'saldo_awal' => 'required|numeric',
            'pendapatan' => 'required|numeric',
            'belanja' => 'required|numeric',
            'belanja_pegawai' => 'required|numeric',
            'belanja_barang_jasa' => 'required|numeric',
            'belanja_modal' => 'required|numeric',
            'belanja_modal_peralatan_mesin' => 'required|numeric',
            'belanja_modal_aset_tetap_lainnya' => 'required|numeric',
            'belanja_modal_tanah_bangunan' => 'required|numeric',
            'saldo_akhir' => 'required|numeric',
        ], [
            'nomor_sp2b.unique' => 'SP2B Tahap Tersebut Sudah Ada',
        ]);

        ($this->Sp2b)::create($validated);

        return response()->json(['success' => true]);
    }

    public function update(Request $request, $id)
    {
        $sp2b = ($this->Sp2b)::findOrFail($id);
        
        $validated = $request->validate([
            VariantConfig::penganggaranFk($this->variant) => 'required|exists:' . (new $this->Penganggaran)->getTable() . ',id',
            'jenis_periode' => 'required|in:bulan,tahap',
            'bulan' => 'required_if:jenis_periode,bulan',
            'nomor_sp2b' => [
                'required',
                'string',
                Rule::unique((new $this->Sp2b)->getTable())->ignore($id)->where(function ($query) use ($request) {
                    $q = $query->where(VariantConfig::penganggaranFk($this->variant), $request->{VariantConfig::penganggaranFk($this->variant)})
                               ->where('jenis_periode', $request->jenis_periode);
                    if ($request->jenis_periode == 'bulan') {
                        return $q->where('bulan', $request->bulan);
                    }
                    return $q->where('tahap', $request->tahap);
                })
            ],
            'tanggal_sp2b' => 'required|date',
            'tahap' => 'required_if:jenis_periode,tahap|in:1,2',
            'saldo_awal' => 'required|numeric',
            'pendapatan' => 'required|numeric',
            'belanja' => 'required|numeric',
            'belanja_pegawai' => 'required|numeric',
            'belanja_barang_jasa' => 'required|numeric',
            'belanja_modal' => 'required|numeric',
            'belanja_modal_peralatan_mesin' => 'required|numeric',
            'belanja_modal_aset_tetap_lainnya' => 'required|numeric',
            'belanja_modal_tanah_bangunan' => 'required|numeric',
            'saldo_akhir' => 'required|numeric',
        ], [
            'nomor_sp2b.unique' => 'SP2B Tahap Tersebut Sudah Ada',
        ]);

        $sp2b->update($validated);

        return response()->json(['success' => true]);
    }

    public function destroy($id)
    {
        ($this->Sp2b)::findOrFail($id)->delete();
        return response()->json(['success' => true]);
    }

    public function getTahunAnggaran()
    {
        $sekolahId = auth()->user()->sekolah_id ?? 1;
        $tahuns = ($this->Penganggaran)::where('sekolah_id', $sekolahId)
            ->select('id', 'tahun_anggaran')
            ->orderBy('tahun_anggaran', 'desc')
            ->get();

        return response()->json($tahuns);
    }

    public function calculate(Request $request)
    {
        try {
            $tahun = $request->tahun_anggaran;
            $jenisPeriode = $request->jenis_periode ?? 'tahap';
            $tahap = $request->tahap;
            $bulan = $request->bulan;
            $sekolahId = auth()->user()->sekolah_id ?? 1;

            $penganggaran = ($this->Penganggaran)::where('sekolah_id', $sekolahId)
                ->where('tahun_anggaran', $tahun)
                ->first();

            if (!$penganggaran) {
                return response()->json(['error' => "Data Penganggaran tidak ditemukan untuk tahun $tahun"], 404);
            }

            $bukuKasService = app(\App\Services\BukuKasService::class);
            $saldoAwal = 0;
            $pendapatan = 0;

            if ($jenisPeriode === 'bulan') {
                $startDate = Carbon::create($tahun, $bulan, 1)->format('Y-m-d');
                $endDate = Carbon::create($tahun, $bulan, 1)->endOfMonth()->format('Y-m-d');

                $sisaTunaiSebelum = $bukuKasService->hitungSaldoTunaiSebelumBulan($penganggaran->id, $bulan);
                $sisaBankSebelum = $bukuKasService->hitungSaldoBankSebelumBulan($penganggaran->id, $bulan);
                $saldoAwal = $sisaTunaiSebelum + $sisaBankSebelum;

                // Tambahkan saldo awal dari penerimaan dana jika bulan 1
                if ($bulan == 1) {
                    $tahap1Option = \App\Config\VariantConfig::sumberDanaTahap1($this->variant);
                    if ($tahap1Option) {
                        $penerimaanAwal = ($this->PenerimaanDana)::where(\App\Config\VariantConfig::penganggaranFk($this->variant), $penganggaran->id)
                            ->where('sumber_dana', $tahap1Option)
                            ->first();
                        if ($penerimaanAwal && $penerimaanAwal->saldo_awal) {
                            $saldoAwal += $penerimaanAwal->saldo_awal;
                        }
                    }
                }

                $pendapatan = ($this->PenerimaanDana)::where(VariantConfig::penganggaranFk($this->variant), $penganggaran->id)
                    ->whereMonth('tanggal_terima', $bulan)
                    ->sum('jumlah_dana');

            } else {
                // Define dates based on Tahap
                $startDate = $tahap == '1' ? "$tahun-01-01" : "$tahun-07-01";
                $endDate = $tahap == '1' ? "$tahun-06-30" : "$tahun-12-31";

                $startMonth = $tahap == '1' ? 1 : 7;
                
                // Getting previous balance
                $sisaTunaiSebelum = $bukuKasService->hitungSaldoTunaiSebelumBulan($penganggaran->id, $startMonth);
                $sisaBankSebelum = $bukuKasService->hitungSaldoBankSebelumBulan($penganggaran->id, $startMonth);
                $saldoAwal = $sisaTunaiSebelum + $sisaBankSebelum;

                // Tambahkan Saldo Awal (Luncuran) jika Tahap 1
                if ($tahap == '1') {
                    $tahap1Option = \App\Config\VariantConfig::sumberDanaTahap1($this->variant);
                    if ($tahap1Option) {
                        $penerimaanAwal = ($this->PenerimaanDana)::where(\App\Config\VariantConfig::penganggaranFk($this->variant), $penganggaran->id)
                            ->where('sumber_dana', $tahap1Option)
                            ->first();
                        if ($penerimaanAwal && $penerimaanAwal->saldo_awal) {
                            $saldoAwal += $penerimaanAwal->saldo_awal;
                        }
                    }
                }

                // Pendapatan during this Tahap
                $pendapatan = ($this->PenerimaanDana)::where(\App\Config\VariantConfig::penganggaranFk($this->variant), $penganggaran->id)
                    ->where(function($q) use ($tahap) {
                        if (in_array($this->variant, ['silpa', 'kinerja_silpa'])) {
                            // Untuk SiLPA, pendapatan masuk ke periode saat tanggal_terimanya berada
                            // SP2B/LPH biasanya mengecek berdasar nama tahap untuk Reguler, 
                            // tapi untuk SiLPA cukup kita izinkan semua (karena cuma 1 pencairan).
                            // Tapi agar tidak double di tahap 2, kita bisa memfilter berdasarkan tanggal jika dibutuhkan
                            // Namun dalam prakteknya untuk SP2B, filter by name adalah standar yang dibuat sebelumnya.
                            // Kita terima saja semua SiLPA jika tahap 1 (kebanyakan SiLPA dicatat di awal tahun).
                            if ($tahap == '1') {
                                $q->whereNotNull('sumber_dana'); // Terima semua untuk SiLPA di Tahap 1
                            } else {
                                // Tahap 2: Bisa saja dicatat di Juli ke atas.
                                $q->whereMonth('tanggal_terima', '>=', 7);
                            }
                        } else {
                            if ($tahap == '1') {
                                $q->where('sumber_dana', 'like', '%Tahap 1%')->orWhere('sumber_dana', 'like', '%Tahap I%');
                            } else {
                                $q->where('sumber_dana', 'like', '%Tahap 2%')->orWhere('sumber_dana', 'like', '%Tahap II%');
                            }
                        }
                    })->sum('jumlah_dana');
            }

            // Pengeluaran
            $bkuExpenses = ($this->BukuKasUmum)::where(VariantConfig::penganggaranFk($this->variant), $penganggaran->id)
                ->whereDate('tanggal_transaksi', '>=', $startDate)
                ->whereDate('tanggal_transaksi', '<=', $endDate)
                ->whereNotNull('rekening_belanja_id')
                ->with(['rekeningBelanja', 'kodeKegiatan'])
                ->get();

            $b_pegawai = 0;
            $b_barang = 0;
            $b_modal = 0;
            $bm_peralatan = 0;
            $bm_aset = 0;
            $bm_tanah = 0;

            foreach ($bkuExpenses as $bku) {
                $amount = $bku->pengeluaran ?? $bku->total_transaksi_kotor;
                $kode = $bku->rekeningBelanja->kode_rekening ?? '';
                $kodeKeg = $bku->kodeKegiatan->kode ?? '';

                if (str_starts_with(trim($kodeKeg), '07.12')) {
                    $b_pegawai += $amount;
                } elseif (str_starts_with($kode, '5.1.02.')) {
                    $b_barang += $amount;
                } elseif (str_starts_with($kode, '5.2')) {
                    $b_modal += $amount;
                    if (str_starts_with($kode, '5.2.02')) {
                        $bm_peralatan += $amount;
                    } elseif (str_starts_with($kode, '5.2.04')) {
                        $bm_aset += $amount;
                    } elseif (str_starts_with($kode, '5.2.05')) {
                        $bm_tanah += $amount;
                    }
                }
            }

            $totalBelanja = $b_pegawai + $b_barang + $b_modal;
            $saldoAkhir = $saldoAwal + $pendapatan - $totalBelanja;

            return response()->json([
                'saldo_awal' => $saldoAwal,
                'pendapatan' => $pendapatan,
                'belanja' => $totalBelanja,
                'belanja_pegawai' => $b_pegawai,
                'belanja_barang_jasa' => $b_barang,
                'belanja_modal' => $b_modal,
                'belanja_modal_peralatan_mesin' => $bm_peralatan,
                'belanja_modal_aset_tetap_lainnya' => $bm_aset,
                'belanja_modal_tanah_bangunan' => $bm_tanah,
                'saldo_akhir' => $saldoAkhir,
                VariantConfig::penganggaranFk($this->variant) => $penganggaran->id
            ]);

        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage() . ' Line: ' . $e->getLine()], 500);
        }
    }

    public function generatePdf($id)
    {
        $sp2b = ($this->Sp2b)::with(['penganggaran'])->findOrFail($id);
        $penganggaran = $sp2b->penganggaran;
        $sekolah = \App\Models\SekolahProfile::find($penganggaran->sekolah_id);

        $paperSize = request()->input('paper_size', 'A4');
        $fontSize = request()->input('font_size', '12pt');
        
        $periode_text = '';
        if ($sp2b->jenis_periode === 'bulan' && $sp2b->bulan) {
            $months = [
                1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April', 5 => 'Mei', 6 => 'Juni',
                7 => 'Juli', 8 => 'Agustus', 9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember'
            ];
            $periode_text = ($months[(int)$sp2b->bulan] ?? '') . ' ';
        } else {
            $semester_text = $sp2b->tahap == '1' ? 'Januari s.d Juni' : 'Juli s.d Desember';
            $periode_text = $semester_text . ' ';
        }

        $data = [
                'sumberDana' => \App\Config\VariantConfig::title($this->variant),
            'sp2b' => $sp2b,
            'sekolah' => $sekolah,
            'penganggaran' => $penganggaran,
            'kepala_sekolah' => (object) [
                'nama' => $penganggaran->kepala_sekolah,
                'nip' => $penganggaran->nip_kepala_sekolah
            ],
            'tanggal_cetak' => Carbon::parse($sp2b->tanggal_sp2b)->locale('id')->isoFormat('D MMMM Y'),
            'periode_text' => $periode_text . 'Tahun Anggaran ' . $penganggaran->tahun_anggaran,
            'fontSize' => $fontSize,
        ];

        $pdf = Pdf::loadView('laporan.sp2b_pdf', $data);

        if (strtolower($paperSize) === 'folio') {
            $pdf->setPaper([0, 0, 595.28, 935.43], 'portrait');
        } else {
            $pdf->setPaper($paperSize, 'portrait');
        }

        return $pdf->stream('sp2b.pdf');
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
