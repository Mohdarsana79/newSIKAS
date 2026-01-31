<?php

namespace App\Http\Controllers;

use App\Models\KodeKegiatan;
use App\Models\Penganggaran;
use App\Models\RekeningBelanja;
use App\Models\Rkas;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Barryvdh\DomPDF\Facade\Pdf;
use App\Models\RkasPerubahan;

class RkasController extends Controller
{
    public function index(Request $request, $id)
    {
        $penganggaran = Penganggaran::findOrFail($id);
        
        $kodeKegiatans = KodeKegiatan::all();
        $rekeningBelanjas = RekeningBelanja::all();

        // Get all RKAS items
        $itemsRaw = Rkas::with(['kodeKegiatan', 'rekeningBelanja'])
            ->where('penganggaran_id', $penganggaran->id)
            ->get();

        // Calculate Totals
        // $totalBudget = $itemsRaw->sum(fn($i) => $i->jumlah * $i->harga_satuan);
        $totalTahap1 = Rkas::getTotalTahap1($penganggaran->id);
        $totalTahap2 = Rkas::getTotalTahap2($penganggaran->id);
        
        $paguAnggaran = $penganggaran->pagu_anggaran;
        $paguHalf = $paguAnggaran / 2;

        // Transform items for frontend
        $items = $itemsRaw->map(function($item) {
             return [
                'id' => $item->id,
                'program' => $item->kodeKegiatan->program ?? '-',
                'kegiatan' => $item->kodeKegiatan->sub_program ?? '-',
                'rekening' => $item->rekeningBelanja ? ($item->rekeningBelanja->kode_rekening . ' - ' . $item->rekeningBelanja->rincian_objek) : '-',
                'uraian' => $item->uraian,
                'dianggaran' => $item->jumlah,
                'dibelanjakan' => 0, // Placeholder
                'satuan' => $item->satuan,
                'harga' => number_format($item->harga_satuan, 0, ',', '.'),
                'total' => number_format($item->jumlah * $item->harga_satuan, 0, ',', '.'),
                'bulan' => $item->bulan,
             ];
        });

        // Calculate Month Filters
        $monthsList = Rkas::getBulanList();
        $months = collect($monthsList)->map(function($month) use ($itemsRaw) {
            return [
                'name' => $month,
                'count' => $itemsRaw->where('bulan', $month)->count(),
                'active' => false 
            ];
        });

        $hasPerubahan = RkasPerubahan::where('penganggaran_id', $id)->exists();

        return Inertia::render('Penganggaran/Rkas/Index', [
            'anggaran' => [
                'id' => $penganggaran->id,
                'has_perubahan' => $hasPerubahan,
                'tahun' => (string)$penganggaran->tahun_anggaran,
                'pagu_total' => number_format($paguAnggaran, 0, ',', '.'),
                'sumber_dana' => 'BOSP Reguler',
                'status' => 'Aktif',
                'tahap_1' => [
                    'periode' => 'Januari - Juni', 
                    'persen' => $paguHalf > 0 ? number_format(($totalTahap1 / $paguHalf) * 100, 2) . '%' : '0.00%',
                    'sisa' => number_format($paguHalf - $totalTahap1, 0, ',', '.')
                ],
                'tahap_2' => [
                    'periode' => 'Juli - Desember',
                    'persen' => $paguHalf > 0 ? number_format(($totalTahap2 / $paguHalf) * 100, 2) . '%' : '0.00%',
                    'sisa' => number_format($paguHalf - $totalTahap2, 0, ',', '.')
                ]
            ],
            'items' => $items,
            'months' => $months,
            'kegiatanOptions' => $kodeKegiatans->map(fn($k) => [
                'id' => $k->id, 
                'kode' => $k->kode,
                'program' => $k->program,
                'sub_program' => $k->sub_program,
                'uraian' => $k->uraian
            ]), 
            'rekeningOptions' => $rekeningBelanjas->map(fn($r) => [
                'id' => $r->id, 
                'kode_rekening' => $r->kode_rekening,
                'rincian_objek' => $r->rincian_objek,
                'kategori' => $r->kategori
            ]),
        ]);
    }

    public function summary(Request $request, $id)
    {
        $penganggaran = Penganggaran::with('sekolah')->findOrFail($id);
        
        // Fetch all RKAS data (for Recap and Tahapan - Full Year)
        $rkasData = Rkas::with(['kodeKegiatan', 'rekeningBelanja'])
            ->where('penganggaran_id', $id)
            ->get();

        // Fetch Monthly specific data (for Rka Bulanan - Filtered by DB)
        $selectedMonth = $request->input('month', 'Januari');
        $monthlyRkas = Rkas::with(['kodeKegiatan', 'rekeningBelanja'])
            ->where('penganggaran_id', $id)
            ->where('bulan', $selectedMonth)
            ->get();
            
        $groupedMonthly = $monthlyRkas->groupBy(function ($item) {
            return optional($item->kodeKegiatan)->kode;
        })->filter(fn($group, $key) => !is_null($key));
        
        $rkaBulananData = $this->kelolaDataRkas($groupedMonthly);

        // 1. Grouped Data for "Rka Bulanan"
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
                        'Juli' => 0, 'Agustus' => 0, 'September' => 0, 'Oktober' => 0, 'November' => 0, 'Desember' => 0
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
                        'total' => $total
                    ];
                })->values();
            });
        });

        // 2. Tahapan Data for "Rka Tahapan"
        $groupedRkas = $rkasData->groupBy(function ($item) {
            return optional($item->kodeKegiatan)->kode;
        })->filter(fn($group, $key) => !is_null($key));

        $tahapanData = $this->kelolaDataRkas($groupedRkas);

        // 3. Lembar Kerja 221 Data (Interleaved Hierarchy + Items)
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

        // Prepare Item Rows
        $allItems = $rkasData; // already fetched above
        $itemRows = $allItems->map(function($item) {
             return [
                 'type' => 'item',
                 'kode_rekening' => $item->rekeningBelanja->kode_rekening ?? '',
                 'uraian' => $item->uraian,
                 'volume' => $item->jumlah,
                 'satuan' => $item->satuan,
                 'harga_satuan' => $item->harga_satuan,
                 'jumlah' => $item->jumlah * $item->harga_satuan,
                 // For sorting, we want items to act as children of their code.
                 // The code usually is 5.1.02.01.01.0024
                 'sort_key' => ($item->rekeningBelanja->kode_rekening ?? '') . 'Z', // Append Z to ensure it comes after the header if codes match (though they shouldn't)
             ];
        });

        // Prepare Header Rows
        $headerRows = collect();
        $headerTotals = [];

        foreach ($allItems as $item) {
            $code = $item->rekeningBelanja->kode_rekening ?? '';
            $val = $item->jumlah * $item->harga_satuan;
            
            // Generate parent codes
            // Assuming standard format like 5.1.02.01...
            // We want to hit the keys in $hierarchyNames
            
            foreach ($hierarchyNames as $hCode => $hName) {
                if (str_starts_with($code, $hCode)) {
                    if (!isset($headerTotals[$hCode])) {
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

        // 3. Rekap Data for "Rka Rekap" (Hierarchical Sums based on Kode Rekening)
        // Define hierarchy levels to aggregate
        $hierarchyDefinitions = [
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
        // Flatten all items to iterate efficiently
        $allItems = $rkasData;

        // Calculate Totals for each Hierarchy Key
        foreach ($hierarchyNames as $prefix => $label) {
            $sum = $allItems->filter(function($item) use ($prefix) {
                // Check if kode_rekening starts with prefix
                return str_starts_with($item->rekeningBelanja->kode_rekening, $prefix);
            })->sum(fn($i) => $i->jumlah * $i->harga_satuan);

            $rekapData[] = [
                'kode_rekening' => $prefix,
                'uraian' => $label,
                'jumlah' => $sum
            ];
        }

        // Add Defisit row (Total Income - Total Expense)
        $totalBelanja = collect($rekapData)->firstWhere('kode_rekening', '5')['jumlah'] ?? 0;
        $totalPendapatan = (float) $penganggaran->pagu_anggaran;
        $defisit = $totalPendapatan - $totalBelanja;

        $rekapData[] = [
            'kode_rekening' => '',
            'uraian' => 'JUMLAH BELANJA',
            'jumlah' => $totalBelanja
        ];
        $rekapData[] = [
            'kode_rekening' => '',
            'uraian' => 'DEFISIT',
            'jumlah' => $defisit // Should be 0 ideally
        ];
        
        // 4. Per Tahap Summary Data
        // Calculates Totals for Pendapatan, Belanja Operasi, Belanja Modal split by Tahap
        $sem1 = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
        
        // Pendapatan Split (50% each usually, or based on rules, but user wants hardcoded or logic)
        // Since we don't have tanggal realisasi, we assume 50-50 for Pendapatan or based on what? 
        // The image shows 14.5m + 14.5m = 29m. Exactly 50%.
        $pendapatanTahap1 = $totalPendapatan / 2;
        $pendapatanTahap2 = $totalPendapatan / 2;

        // Belanja Operasi (5.1)
        $opsItems = $rkasData->filter(fn($i) => str_starts_with($i->rekeningBelanja->kode_rekening, '5.1'));
        $opsTotal = $opsItems->sum(fn($i) => $i->jumlah * $i->harga_satuan);
        $opsTahap1 = $opsItems->filter(fn($i) => in_array($i->bulan, $sem1))->sum(fn($i) => $i->jumlah * $i->harga_satuan);
        $opsTahap2 = $opsItems->filter(fn($i) => !in_array($i->bulan, $sem1))->sum(fn($i) => $i->jumlah * $i->harga_satuan);

        // Belanja Modal (5.2)
        $modalItems = $rkasData->filter(fn($i) => str_starts_with($i->rekeningBelanja->kode_rekening, '5.2'));
        $modalTotal = $modalItems->sum(fn($i) => $i->jumlah * $i->harga_satuan);
        $modalTahap1 = $modalItems->filter(fn($i) => in_array($i->bulan, $sem1))->sum(fn($i) => $i->jumlah * $i->harga_satuan);
        $modalTahap2 = $modalItems->filter(fn($i) => !in_array($i->bulan, $sem1))->sum(fn($i) => $i->jumlah * $i->harga_satuan);

        $perTahapData = [
            [
                'no' => '1',
                'uraian' => 'Pendapatan',
                'tahap1' => $pendapatanTahap1,
                'tahap2' => $pendapatanTahap2,
                'total' => $totalPendapatan
            ],
            [
                'no' => '2.1',
                'uraian' => 'Belanja Operasi',
                'tahap1' => $opsTahap1,
                'tahap2' => $opsTahap2,
                'total' => $opsTotal
            ],
            [
                'no' => '2.2',
                'uraian' => 'Belanja Modal',
                'tahap1' => $modalTahap1,
                'tahap2' => $modalTahap2,
                'total' => $modalTotal
            ]
        ];

        // 5. Grafik Data
        $grafikData = $this->getGrafikData($id);

        if (empty($grafikData)) {
            // Fallback empty structure if something goes wrong, though helper currently returns []
             $grafikData = [
                'total_pagu' => 0,
                'buku' => ['value' => 0, 'percentage' => 0, 'valid' => false, 'message' => ''],
                'honor' => ['value' => 0, 'percentage' => 0, 'valid' => false, 'message' => ''],
                'pemeliharaan' => ['value' => 0, 'percentage' => 0, 'valid' => false, 'message' => ''],
                'jenis_belanja' => []
            ];
        }

        // Map the helper result to the structure expected by the View/React
        // ensure getGrafikData return keys match what we need or map them here.
        // The helper returns: buku_anggaran, honor_anggaran, sarpras_anggaran, jenis_belanja, total_pagu
        
        // We need to reconstruct the rich response for the view manually if helper doesn't provide it, 
        // OR better, update getGrafikData to return the rich response.
        // Let's rely on the helper providing raw numbers and format them here for the View, 
        // effectively moving the business logic of "validity messages" here or to the helper.
        // To keep it clean, let's just map it here using the values from helper.

        // Actually, looking at the previous inline code, it had specific messages.
        // I should reconstruct those messages using the data from getGrafikData.
        
        $totalAnggaran = $grafikData['total_pagu'] ?? 0;
        $totalBuku = $grafikData['buku_anggaran'] ?? 0;
        $totalHonor = $grafikData['honor_anggaran'] ?? 0;
        $totalPemeliharaan = $grafikData['sarpras_anggaran'] ?? 0;

        // Honor Logic
        $honorPercent = $totalAnggaran > 0 ? ($totalHonor / $totalAnggaran) * 100 : 0;
        $statusSekolah = $penganggaran->sekolah->status_sekolah ?? 'Swasta';
        $isNegeri = stripos($statusSekolah, 'negeri') !== false;
        $maxHonor = $isNegeri ? 20 : 40;
        $honorValid = $honorPercent <= $maxHonor;

        $grafikDataResponse = [
            'total' => $totalAnggaran,
            'buku' => [
                'value' => $totalBuku,
                'percentage' => $totalAnggaran > 0 ? ($totalBuku / $totalAnggaran) * 100 : 0,
                'valid' => ($totalAnggaran > 0 && ($totalBuku / $totalAnggaran) * 100 >= 10) ? true : false,
                'message' => 'Anggaran penyediaan buku Anda adalah ' . number_format(($totalAnggaran > 0 ? ($totalBuku / $totalAnggaran) * 100 : 0), 2) . '% dan ' . (($totalAnggaran > 0 && ($totalBuku / $totalAnggaran) * 100 >= 10) ? 'sudah sesuai juknis' : 'tidak sesuai') . ' dengan proporsi minimal 10% dari total pagu anggaran.'
            ],
            'honor' => [
                'value' => $totalHonor,
                'percentage' => $honorPercent,
                'valid' => $honorValid,
                'message' => 'Anggaran honor Anda adalah ' . number_format($honorPercent, 2) . '% dari total pagu anggaran. Anggaran ' . ($honorValid ? 'sesuai' : 'tidak sesuai') . ' dengan juknis, proporsi maksimal ' . $maxHonor . '% untuk sekolah ' . ($isNegeri ? 'Negeri' : 'Swasta') . '.'
            ],
            'pemeliharaan' => [
                'value' => $totalPemeliharaan,
                'percentage' => $totalAnggaran > 0 ? ($totalPemeliharaan / $totalAnggaran) * 100 : 0,
                'valid' => ($totalAnggaran > 0 && ($totalPemeliharaan / $totalAnggaran) * 100 <= 20) ? true : false, 
                'message' => 'Anggaran pemeliharaan sarpras Anda adalah ' . number_format(($totalAnggaran > 0 ? ($totalPemeliharaan / $totalAnggaran) * 100 : 0), 2) . '% dan ' . (($totalAnggaran > 0 && ($totalPemeliharaan / $totalAnggaran) * 100 <= 20) ? 'sudah' : 'belum') . ' sesuai dengan proporsi maksimal 20% dari total pagu anggaran.'
            ],
            'jenis_belanja' => $grafikData['jenis_belanja'] ?? []
        ];

        return Inertia::render('Penganggaran/Rkas/Summary', [
            'anggaran' => $penganggaran,
            'groupedData' => $grouped,
            'tahapanData' => $tahapanData,
            'rkaBulananData' => $rkaBulananData,
            'rekapData' => $rekapData,
            'perTahapData' => $perTahapData,
            'lembarData' => $lembarData,
            'grafikData' => $grafikDataResponse
        ]);
    }

    public function store(Request $request, $id)
    {
        $penganggaran = Penganggaran::findOrFail($id);

        $request->validate([
            'kegiatan_id' => 'required|exists:kode_kegiatans,id',
            'rekening_id' => 'required|exists:rekening_belanjas,id',
            'uraian' => 'required|string',
            'harga_satuan' => 'required|numeric|min:0',
            'alokasi' => 'required|array|min:1',
            'alokasi.*.month' => 'required|string',
            'alokasi.*.quantity' => 'required|numeric|min:1',
            'alokasi.*.unit' => 'required|string',
        ]);

        DB::beginTransaction();
        try {
            foreach ($request->alokasi as $alloc) {
                // Check dupes
                $exists = Rkas::where('penganggaran_id', $penganggaran->id)
                    ->where('kode_id', $request->kegiatan_id)
                    ->where('kode_rekening_id', $request->rekening_id)
                    ->where('bulan', $alloc['month'])
                    ->where('uraian', $request->uraian)
                    ->exists();

                if ($exists) {
                    throw new \Exception("Data untuk bulan {$alloc['month']} sudah ada.");
                }

                Rkas::create([
                    'penganggaran_id' => $penganggaran->id,
                    'kode_id' => $request->kegiatan_id,
                    'kode_rekening_id' => $request->rekening_id,
                    'uraian' => $request->uraian,
                    'harga_satuan' => $request->harga_satuan,
                    'bulan' => $alloc['month'],
                    'jumlah' => $alloc['quantity'],
                    'satuan' => $alloc['unit'],
                ]);
            }
            DB::commit();
            return redirect()->back()->with('success', 'Data RKAS berhasil disimpan.');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->withErrors(['message' => $e->getMessage()]);
        }
    }

    public function getEditData($id)
    {
        $rkas = Rkas::with(['kodeKegiatan', 'rekeningBelanja'])->findOrFail($id);
        
        // Find all items in the same group (siblings)
        $siblings = Rkas::where('penganggaran_id', $rkas->penganggaran_id)
            ->where('kode_id', $rkas->kode_id)
            ->where('kode_rekening_id', $rkas->kode_rekening_id)
            ->where('uraian', $rkas->uraian)
            ->get();

        return response()->json([
            'kegiatan_id' => (string)$rkas->kode_id, // Cast to string for Select component
            'rekening_id' => (string)$rkas->kode_rekening_id,
            'uraian' => $rkas->uraian,
            'harga_satuan' => $rkas->harga_satuan,
            'program_nama' => $rkas->kodeKegiatan ? $rkas->kodeKegiatan->program : '-',
            'kegiatan_nama' => $rkas->kodeKegiatan ? $rkas->kodeKegiatan->uraian : '-',
            'rekening_nama' => $rkas->rekeningBelanja ? ($rkas->rekeningBelanja->kode_rekening . ' - ' . $rkas->rekeningBelanja->rincian_objek) : '-',
            'alokasi' => $siblings->map(function($item) {
                return [
                    'month' => $item->bulan,
                    'quantity' => $item->jumlah,
                    'unit' => $item->satuan,
                    // calculate amount for display if needed, but frontend calculates it from price * qty
                ];
            })->values()
        ]);
    }

    public function updateGroup(Request $request)
    {
        // Validation similar to store but we need an identifier to know WHAT to update.
        // We will accept an 'original_id' to find the original group.
        $request->validate([
            'original_id' => 'required|exists:rkas,id',
            'kegiatan_id' => 'required|exists:kode_kegiatans,id',
            'rekening_id' => 'required|exists:rekening_belanjas,id',
            'uraian' => 'required|string',
            'harga_satuan' => 'required|numeric|min:0',
            'alokasi' => 'required|array|min:1',
            'alokasi.*.month' => 'required|string',
            'alokasi.*.quantity' => 'required|numeric|min:1',
            'alokasi.*.unit' => 'required|string',
        ]);

        DB::beginTransaction();
        try {
            $original = Rkas::findOrFail($request->original_id);
            
            // 1. Delete the OLD group
            Rkas::where('penganggaran_id', $original->penganggaran_id)
                ->where('kode_id', $original->kode_id)
                ->where('kode_rekening_id', $original->kode_rekening_id)
                ->where('uraian', $original->uraian)
                ->delete();

            // 2. Create the NEW items (essentially replacing them)
            // Note: We use the original penganggaran_id
            foreach ($request->alokasi as $alloc) {
                Rkas::create([
                    'penganggaran_id' => $original->penganggaran_id,
                    'kode_id' => $request->kegiatan_id,
                    'kode_rekening_id' => $request->rekening_id,
                    'uraian' => $request->uraian,
                    'harga_satuan' => $request->harga_satuan,
                    'bulan' => $alloc['month'],
                    'jumlah' => $alloc['quantity'],
                    'satuan' => $alloc['unit'],
                ]);
            }

            DB::commit();
            return redirect()->back()->with('success', 'Data RKAS berhasil diupdate.');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->withErrors(['message' => 'Gagal update: ' . $e->getMessage()]);
        }
    }

    public function exportPdf(Request $request, $id)
    {
        $penganggaran = Penganggaran::with('sekolah')->findOrFail($id);
        
        $rkasData = Rkas::with(['kodeKegiatan', 'rekeningBelanja'])
            ->where('penganggaran_id', $id)
            ->orderBy('kode_id')
            ->get()
            ->groupBy(function ($item) {
                return optional($item->kodeKegiatan)->kode;
            })
            ->filter(fn($group, $key) => !is_null($key));
            
        // Use the proper centralized logic
        $tahapanData = $this->kelolaDataRkas($rkasData);
        $totalTahap1 = $this->calculateTotalTahap1($id);
        $totalTahap2 = $this->calculateTotalTahap2($id);

        $pdf = Pdf::loadView('rka_tahapan_pdf', [
            'anggaran' => $penganggaran->toArray(),
            'tahapanData' => $tahapanData, // Note: structure changed, view must be updated
            'totalTahap1' => $totalTahap1,
            'totalTahap2' => $totalTahap2,
            'paper_size' => $request->paper_size,
            'orientation' => $request->orientation,
            'font_size' => $request->font_size
        ]);

        return $pdf->stream('rka_tahapan.pdf');
    }

    public function exportRekapPdf(Request $request, $id)
    {
        $penganggaran = Penganggaran::with('sekolah')->findOrFail($id);
        
        $rekapData = $this->getRekapRkas($id);
        
        // Calculate per Tahapan for the summary part of Rekap
        $totalPendapatan = (float) $penganggaran->pagu_anggaran;
        $pendapatanTahap1 = $totalPendapatan / 2;
        $pendapatanTahap2 = $totalPendapatan / 2;
        
        // Need raw data for tahap calc
        $rkasData = Rkas::with(['rekeningBelanja']) ->where('penganggaran_id', $id)->get();
        $sem1 = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
        
        $opsItems = $rkasData->filter(fn($i) => str_starts_with($i->rekeningBelanja->kode_rekening ?? '', '5.1'));
        $opsTotal = $opsItems->sum(fn($i) => $i->jumlah * $i->harga_satuan);
        $opsTahap1 = $opsItems->filter(fn($i) => in_array($i->bulan, $sem1))->sum(fn($i) => $i->jumlah * $i->harga_satuan);
        $opsTahap2 = $opsItems->sum(fn($i) => $i->jumlah * $i->harga_satuan) - $opsTahap1;

        $modalItems = $rkasData->filter(fn($i) => str_starts_with($i->rekeningBelanja->kode_rekening ?? '', '5.2'));
        $modalTotal = $modalItems->sum(fn($i) => $i->jumlah * $i->harga_satuan);
        $modalTahap1 = $modalItems->filter(fn($i) => in_array($i->bulan, $sem1))->sum(fn($i) => $i->jumlah * $i->harga_satuan);
        $modalTahap2 = $modalItems->sum(fn($i) => $i->jumlah * $i->harga_satuan) - $modalTahap1;

        $perTahapData = [
            ['no' => '1', 'uraian' => 'Pendapatan', 'tahap1' => $pendapatanTahap1, 'tahap2' => $pendapatanTahap2, 'total' => $totalPendapatan],
            ['no' => '2.1', 'uraian' => 'Belanja Operasi', 'tahap1' => $opsTahap1, 'tahap2' => $opsTahap2, 'total' => $opsTotal],
            ['no' => '2.2', 'uraian' => 'Belanja Modal', 'tahap1' => $modalTahap1, 'tahap2' => $modalTahap2, 'total' => $modalTotal]
        ];

        $pdf = Pdf::loadView('rka_rekap_pdf', [
            'anggaran' => $penganggaran->toArray(),
            'rekapData' => $rekapData,
            'perTahapData' => $perTahapData,
            'paper_size' => $request->paper_size,
            'orientation' => $request->orientation,
            'font_size' => $request->font_size
        ]);

        return $pdf->stream('rka_rekap.pdf');
    }

    public function exportBulananPdf(Request $request, $id)
    {
        $penganggaran = Penganggaran::with('sekolah')->findOrFail($id);
        $month = $request->input('month', 'Januari');

        if ($month === 'all') {
            $months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
            $allData = [];

            // Fetch all data for this budget
            $allRkas = Rkas::with(['kodeKegiatan', 'rekeningBelanja'])
                ->where('penganggaran_id', $id)
                ->orderBy('kode_id')
                ->get();

            foreach ($months as $m) {
                // Filter by month and group by logic similar to single month
                $monthRkas = $allRkas->where('bulan', $m)
                    ->groupBy(function ($item) {
                        return optional($item->kodeKegiatan)->kode;
                    })
                    ->filter(fn($group, $key) => !is_null($key));
                
                $allData[$m] = $this->kelolaDataRkas($monthRkas);
            }

            $pdf = Pdf::loadView('rka_bulanan_all_pdf', [
                'anggaran' => $penganggaran->toArray(),
                'allData' => $allData,
                'paper_size' => $request->paper_size,
                'orientation' => $request->orientation,
                'font_size' => $request->font_size
            ]);

            return $pdf->stream('rka_bulanan_all.pdf');

        } else {
            $rkasData = Rkas::with(['kodeKegiatan', 'rekeningBelanja'])
                ->where('penganggaran_id', $id)
                ->where('bulan', $month)
                ->orderBy('kode_id')
                ->get()
                ->groupBy(function ($item) {
                    return optional($item->kodeKegiatan)->kode;
                })
                ->filter(fn($group, $key) => !is_null($key));

            $rkaBulananData = $this->kelolaDataRkas($rkasData);

            $pdf = Pdf::loadView('rka_bulanan_pdf', [
                'anggaran' => $penganggaran->toArray(),
                'rkaBulananData' => $rkaBulananData,
                'month' => $month,
                'paper_size' => $request->paper_size,
                'orientation' => $request->orientation,
                'font_size' => $request->font_size
            ]);

            return $pdf->stream('rka_bulanan.pdf');
        }
    }

    public function exportLembarKerjaPdf(Request $request, $id)
    {
        $penganggaran = Penganggaran::with('sekolah')->findOrFail($id);
        
        list($groupedItems, $totals) = $this->prepare221Data($id);

        $mainStructure = [
            '5' => 'BELANJA',
            '5.1' => 'BELANJA OPERASI',
            '5.1.02' => 'BELANJA BARANG DAN JASA',
            '5.2' => 'BELANJA MODAL',
            '5.2.02' => 'BELANJA MODAL PERALATAN DAN MESIN',
            '5.2.04' => 'BELANJA MODAL JALAN, JARINGAN, DAN IRIGASI',
            '5.2.05' => 'BELANJA MODAL ASET TETAP LAINNYA',
        ];
        
        $lembarData = collect();
        foreach ($mainStructure as $code => $uraian) {
            $lembarData->push([
                'type' => 'header',
                'kode_rekening' => $code,
                'uraian' => $uraian,
                'jumlah' => $totals[$code] ?? 0,
            ]);
            
            if (isset($groupedItems[$code])) {
                foreach ($groupedItems[$code] as $item) {
                     $lembarData->push([
                         'type' => 'item',
                         'kode_rekening' => $item['kode_rekening'],
                         'uraian' => $item['uraian'],
                         'volume' => $item['volume'],
                         'satuan' => $item['satuan'],
                         'harga_satuan' => $item['harga_satuan'],
                         'jumlah' => $item['jumlah']
                     ]);
                }
            }
        }

        $pdf = Pdf::loadView('rka_lembar_kerja_pdf', [
            'anggaran' => $penganggaran->toArray(),
            'lembarData' => $lembarData,
            'paper_size' => $request->paper_size,
            'orientation' => $request->orientation,
            'font_size' => $request->font_size
        ]);

        return $pdf->stream('rka_lembar_kerja.pdf');
    }



    public function destroyGroup(Request $request)
    {
         $request->validate([
            'id' => 'required|exists:rkas,id',
        ]);
        
        $target = Rkas::findOrFail($request->id);
        
        // Delete all matches
        Rkas::where('penganggaran_id', $target->penganggaran_id)
            ->where('kode_id', $target->kode_id)
            ->where('kode_rekening_id', $target->kode_rekening_id)
            ->where('uraian', $target->uraian)
            ->delete();
            
            
        return redirect()->back()->with('success', 'Data RKAS berhasil dihapus semua.');
    }

    // --- LOGIC HELPERS ---

    private function calculateTotalTahap1($penganggaranId)
    {
        return Rkas::where('penganggaran_id', $penganggaranId)
            ->whereIn('bulan', ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'])
            ->sum(DB::raw('jumlah * harga_satuan'));
    }

    private function calculateTotalTahap2($penganggaranId)
    {
        return Rkas::where('penganggaran_id', $penganggaranId)
            ->whereIn('bulan', ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'])
            ->sum(DB::raw('jumlah * harga_satuan'));
    }

    private function kelolaDataRkas($rkasData)
    {
        $terorganisir = [];

        foreach ($rkasData as $kode => $items) {
            if (empty($items) || $items->isEmpty()) {
                continue;
            }

            $bagian = explode('.', $kode);

            // Level program (contoh: "03")
            $kodeProgram = $bagian[0];
            if (! isset($terorganisir[$kodeProgram])) {
                $firstItem = $items->first();
                $terorganisir[$kodeProgram] = [
                    'uraian' => optional($firstItem->kodeKegiatan)->program ?? '-',
                    'sub_programs' => [],
                    'total' => 0,
                    'tahap1' => 0,
                    'tahap2' => 0,
                    'jumlah' => 0, 
                ];
            }

            // Level sub-program (contoh: "03.03")
            $kodeSubProgram = count($bagian) > 1 ? $bagian[0] . '.' . $bagian[1] : null;
            if ($kodeSubProgram && ! isset($terorganisir[$kodeProgram]['sub_programs'][$kodeSubProgram])) {
                $firstItem = $items->first();
                $terorganisir[$kodeProgram]['sub_programs'][$kodeSubProgram] = [
                    'uraian' => optional($firstItem->kodeKegiatan)->sub_program ?? '-',
                    'uraian_programs' => [],
                    'items' => [],
                    'total' => 0,
                    'tahap1' => 0,
                    'tahap2' => 0,
                    'jumlah' => 0, 
                ];
            }

            // Level uraian (contoh: "03.03.06")
            $kodeUraian = $kode;
            if ($kodeSubProgram && ! isset($terorganisir[$kodeProgram]['sub_programs'][$kodeSubProgram]['uraian_programs'][$kodeUraian])) {
                $firstItem = $items->first();
                $terorganisir[$kodeProgram]['sub_programs'][$kodeSubProgram]['uraian_programs'][$kodeUraian] = [
                    'uraian' => optional($firstItem->kodeKegiatan)->uraian ?? '-',
                    'items' => [],
                    'total' => 0,
                    'tahap1' => 0,
                    'tahap2' => 0,
                    'jumlah' => 0, 
                ];
            }

            // Kelompokkan item berdasarkan kode_rekening dan uraian
            $groupedItems = [];
            foreach ($items as $item) {
                if (! $item->rekeningBelanja) {
                    continue;
                }

                $key = $item->rekeningBelanja->kode_rekening . '-' . $item->uraian;
                if (! isset($groupedItems[$key])) {
                    $groupedItems[$key] = [
                        'kode_rekening' => $item->rekeningBelanja->kode_rekening,
                        'uraian' => $item->uraian,
                        'program_code' => $kodeSubProgram, // Added for frontend compatibility
                        'volume' => 0,
                        'satuan' => $item->satuan,
                        'harga_satuan' => $item->harga_satuan,
                        'jumlah' => 0,
                        'tahap1' => 0,
                        'tahap2' => 0,
                        'tarif' => $item->harga_satuan, // Added alias for frontend compatibility
                        'bulanan' => [], // Initialize monthly breakdown
                    ];
                }

                $jumlah = $item->jumlah * $item->harga_satuan;
                $isTahap1 = in_array($item->bulan, ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni']);
                $bulanName = $item->bulan;

                $groupedItems[$key]['volume'] += $item->jumlah;
                $groupedItems[$key]['jumlah'] += $jumlah;

                if ($isTahap1) {
                    $groupedItems[$key]['tahap1'] += $jumlah;
                } else {
                    $groupedItems[$key]['tahap2'] += $jumlah;
                }

                // Populate monthly data
                if (!isset($groupedItems[$key]['bulanan'][$bulanName])) {
                     $groupedItems[$key]['bulanan'][$bulanName] = [
                        'volume' => 0,
                        'total' => 0
                     ];
                }
                $groupedItems[$key]['bulanan'][$bulanName]['volume'] += $item->jumlah;
                $groupedItems[$key]['bulanan'][$bulanName]['total'] += $jumlah;
            }

            // Tambahkan item ke struktur data
            if ($kodeSubProgram) {
                foreach ($groupedItems as $item) {
                    // Update program
                    $terorganisir[$kodeProgram]['tahap1'] += $item['tahap1'];
                    $terorganisir[$kodeProgram]['tahap2'] += $item['tahap2'];
                    $terorganisir[$kodeProgram]['jumlah'] = $terorganisir[$kodeProgram]['tahap1'] + $terorganisir[$kodeProgram]['tahap2'];

                    // Update sub program
                    $terorganisir[$kodeProgram]['sub_programs'][$kodeSubProgram]['tahap1'] += $item['tahap1'];
                    $terorganisir[$kodeProgram]['sub_programs'][$kodeSubProgram]['tahap2'] += $item['tahap2'];
                    $terorganisir[$kodeProgram]['sub_programs'][$kodeSubProgram]['jumlah'] =
                        $terorganisir[$kodeProgram]['sub_programs'][$kodeSubProgram]['tahap1'] +
                        $terorganisir[$kodeProgram]['sub_programs'][$kodeSubProgram]['tahap2'];

                    // Update uraian program
                    $terorganisir[$kodeProgram]['sub_programs'][$kodeSubProgram]['uraian_programs'][$kodeUraian]['tahap1'] += $item['tahap1'];
                    $terorganisir[$kodeProgram]['sub_programs'][$kodeSubProgram]['uraian_programs'][$kodeUraian]['tahap2'] += $item['tahap2'];
                    $terorganisir[$kodeProgram]['sub_programs'][$kodeSubProgram]['uraian_programs'][$kodeUraian]['jumlah'] =
                        $terorganisir[$kodeProgram]['sub_programs'][$kodeSubProgram]['uraian_programs'][$kodeUraian]['tahap1'] +
                        $terorganisir[$kodeProgram]['sub_programs'][$kodeSubProgram]['uraian_programs'][$kodeUraian]['tahap2'];

                    // Tambahkan item detail
                    $terorganisir[$kodeProgram]['sub_programs'][$kodeSubProgram]['uraian_programs'][$kodeUraian]['items'][] = $item;
                }
            }
        }

        // Urutkan data
        ksort($terorganisir);
        foreach ($terorganisir as &$program) {
            if (! empty($program['sub_programs'])) {
                ksort($program['sub_programs']);
                foreach ($program['sub_programs'] as &$subProgram) {
                    if (! empty($subProgram['uraian_programs'])) {
                        ksort($subProgram['uraian_programs']);
                    }
                }
            }
        }

        return $terorganisir;
    }

    private function getRekapRkas($penganggaranId)
    {
        try {
            $penganggaran = Penganggaran::findOrFail($penganggaranId);
            $rkasData = Rkas::with(['rekeningBelanja'])
                ->where('penganggaran_id', $penganggaranId)
                ->get();

            // 1. Hitung semua jumlah berdasarkan kode rekening
            $belanjaTotal = 0;
            $belanjaOperasi = 0;
            $belanjaBarangJasa = 0;
            $belanjaBarang = 0;
            $belanjaJasa = 0;
            $belanjaPemeliharaan = 0;
            $belanjaPerjalanan = 0;
            $belanjaModal = 0;
            $belanjaModalPeralatan = 0;
            $belanjaModalJalan = 0;
            $belanjaModalAset = 0;

            foreach ($rkasData as $item) {
                if (!$item->rekeningBelanja) continue;
                $kode = $item->rekeningBelanja->kode_rekening;
                $jumlah = $item->jumlah * $item->harga_satuan;

                if (strpos($kode, '5') === 0) $belanjaTotal += $jumlah;
                if (strpos($kode, '5.1') === 0) $belanjaOperasi += $jumlah;
                if (strpos($kode, '5.1.02') === 0) $belanjaBarangJasa += $jumlah;
                if (strpos($kode, '5.1.02.01') === 0) $belanjaBarang += $jumlah;
                if (strpos($kode, '5.1.02.02') === 0) $belanjaJasa += $jumlah;
                if (strpos($kode, '5.1.02.03') === 0) $belanjaPemeliharaan += $jumlah;
                if (strpos($kode, '5.1.02.04') === 0) $belanjaPerjalanan += $jumlah;
                if (strpos($kode, '5.2') === 0) $belanjaModal += $jumlah;
                if (strpos($kode, '5.2.02') === 0) $belanjaModalPeralatan += $jumlah;
                if (strpos($kode, '5.2.04') === 0) $belanjaModalJalan += $jumlah;
                if (strpos($kode, '5.2.05') === 0) $belanjaModalAset += $jumlah;
            }

            $totalPendapatan = $penganggaran ? $penganggaran->pagu_anggaran : 0;
            $defisit = $totalPendapatan - $belanjaTotal;

            $rekapData = [];
            $rekapData[] = ['kode_rekening' => '', 'uraian' => 'JUMLAH PENDAPATAN', 'jumlah' => $totalPendapatan];
            $rekapData[] = ['kode_rekening' => '5', 'uraian' => 'BELANJA', 'jumlah' => $belanjaTotal > 0 ? $belanjaTotal : '-'];
            $rekapData[] = ['kode_rekening' => '5.1', 'uraian' => 'BELANJA OPERASI', 'jumlah' => $belanjaOperasi > 0 ? $belanjaOperasi : '-'];
            $rekapData[] = ['kode_rekening' => '5.1.02', 'uraian' => 'BELANJA BARANG DAN JASA', 'jumlah' => $belanjaBarangJasa > 0 ? $belanjaBarangJasa : '-'];
            $rekapData[] = ['kode_rekening' => '5.1.02.01', 'uraian' => 'BELANJA BARANG', 'jumlah' => $belanjaBarang > 0 ? $belanjaBarang : '-'];
            $rekapData[] = ['kode_rekening' => '5.1.02.02', 'uraian' => 'BELANJA JASA', 'jumlah' => $belanjaJasa > 0 ? $belanjaJasa : '-'];
            $rekapData[] = ['kode_rekening' => '5.1.02.03', 'uraian' => 'BELANJA PEMELIHARAAN', 'jumlah' => $belanjaPemeliharaan > 0 ? $belanjaPemeliharaan : '-'];
            $rekapData[] = ['kode_rekening' => '5.1.02.04', 'uraian' => 'BELANJA PERJALANAN DINAS', 'jumlah' => $belanjaPerjalanan > 0 ? $belanjaPerjalanan : '-'];
            $rekapData[] = ['kode_rekening' => '5.2', 'uraian' => 'BELANJA MODAL', 'jumlah' => $belanjaModal > 0 ? $belanjaModal : '-'];
            $rekapData[] = ['kode_rekening' => '5.2.02', 'uraian' => 'BELANJA MODAL PERALATAN DAN MESIN', 'jumlah' => $belanjaModalPeralatan > 0 ? $belanjaModalPeralatan : '-'];
            $rekapData[] = ['kode_rekening' => '5.2.04', 'uraian' => 'BELANJA MODAL JALAN, JARINGAN, DAN IRIGASI', 'jumlah' => $belanjaModalJalan > 0 ? $belanjaModalJalan : '-'];
            $rekapData[] = ['kode_rekening' => '5.2.05', 'uraian' => 'BELANJA MODAL ASET TETAP LAINNYA', 'jumlah' => $belanjaModalAset > 0 ? $belanjaModalAset : '-'];
            $rekapData[] = ['kode_rekening' => '', 'uraian' => 'JUMLAH BELANJA', 'jumlah' => $belanjaTotal];
            $rekapData[] = ['kode_rekening' => '', 'uraian' => 'DEFISIT', 'jumlah' => $defisit];

            return $rekapData;
        } catch (\Exception $e) {
            Log::error('Error getting rekap RKAS: ' . $e->getMessage());
            return [];
        }
    }

    private function prepare221Data($penganggaranId)
    {
        $mainStructure = [
            '5' => 'BELANJA',
            '5.1' => 'BELANJA OPERASI',
            '5.1.02' => 'BELANJA BARANG DAN JASA',
            '5.2' => 'BELANJA MODAL',
            '5.2.02' => 'BELANJA MODAL PERALATAN DAN MESIN',
            '5.2.04' => 'BELANJA MODAL JALAN, JARINGAN, DAN IRIGASI',
            '5.2.05' => 'BELANJA MODAL ASET TETAP LAINNYA',
        ];

        $rkasDetail = Rkas::with(['rekeningBelanja'])
            ->where('penganggaran_id', $penganggaranId)
            ->orderBy('kode_rekening_id')
            ->get();

        $groupedItems = [];
        $totals = [];

        foreach ($mainStructure as $kode => $uraian) {
            $totals[$kode] = 0;
        }

        foreach ($rkasDetail as $item) {
            $kode = $item->rekeningBelanja->kode_rekening ?? '';
            $mainCode = $this->findClosestMainCode($kode, array_keys($mainStructure));

            $key = $kode . '-' . $item->uraian . '-' . $item->harga_satuan;

            if (! isset($groupedItems[$mainCode][$key])) {
                $groupedItems[$mainCode][$key] = [
                    'kode_rekening' => $kode,
                    'uraian' => $item->uraian,
                    'volume' => $item->jumlah,
                    'satuan' => $item->satuan,
                    'harga_satuan' => $item->harga_satuan,
                    'jumlah' => $item->jumlah * $item->harga_satuan,
                ];
            } else {
                $groupedItems[$mainCode][$key]['volume'] += $item->jumlah;
                $groupedItems[$mainCode][$key]['jumlah'] = $groupedItems[$mainCode][$key]['volume'] * $item->harga_satuan;
            }
            
            if(isset($totals[$mainCode])) {
                $totals[$mainCode] += $item->jumlah * $item->harga_satuan;
            }
        }

        return [$groupedItems, $totals];
    }
    
    private function findClosestMainCode($kode, $mainCodes)
    {
        $closestCode = '';
        $maxLength = 0;
        foreach ($mainCodes as $mainCode) {
            if (strpos($kode, $mainCode) === 0 && strlen($mainCode) > $maxLength) {
                $maxLength = strlen($mainCode);
                $closestCode = $mainCode;
            }
        }
        return $closestCode;
    }

    private function kelolaDataRkasBulanan($rkasData, $bulan)
    {
        $terorganisir = [];

        // Jika tidak ada data untuk bulan tersebut
        if ($rkasData->isEmpty()) {
            return $terorganisir;
        }

        foreach ($rkasData as $kode => $items) {
            if (empty($items) || $items->isEmpty()) {
                continue;
            }

            $bagian = explode('.', $kode);
            $kodeProgram = $bagian[0] ?? '';

            if (! isset($terorganisir[$kodeProgram])) {
                $firstItem = $items->first();
                $terorganisir[$kodeProgram] = [
                    'uraian' => optional($firstItem->kodeKegiatan)->program ?? '-',
                    'sub_programs' => [],
                    'total' => 0,
                ];
            }

            $kodeSubProgram = count($bagian) > 1 ? $bagian[0] . '.' . $bagian[1] : null;
            if ($kodeSubProgram && ! isset($terorganisir[$kodeProgram]['sub_programs'][$kodeSubProgram])) {
                $firstItem = $items->first();
                $terorganisir[$kodeProgram]['sub_programs'][$kodeSubProgram] = [
                    'uraian' => optional($firstItem->kodeKegiatan)->sub_program ?? '-',
                    'uraian_programs' => [],
                    'items' => [],
                    'total' => 0,
                ];
            }

            $kodeUraian = $kode;
            if ($kodeSubProgram && ! isset($terorganisir[$kodeProgram]['sub_programs'][$kodeSubProgram]['uraian_programs'][$kodeUraian])) {
                $firstItem = $items->first();
                $terorganisir[$kodeProgram]['sub_programs'][$kodeSubProgram]['uraian_programs'][$kodeUraian] = [
                    'uraian' => optional($firstItem->kodeKegiatan)->uraian ?? '-',
                    'items' => [],
                    'total' => 0,
                ];
            }

            foreach ($items as $item) {
                if (! $item->rekeningBelanja) {
                    continue;
                }

                $jumlah = $item->jumlah * $item->harga_satuan;

                $itemData = [
                    'kode_rekening' => $item->rekeningBelanja->kode_rekening,
                    'uraian' => $item->uraian,
                    'volume' => $item->jumlah,
                    'satuan' => $item->satuan,
                    'harga_satuan' => $item->harga_satuan,
                    'jumlah' => $jumlah,
                    'bulan' => $item->bulan,
                ];

                $terorganisir[$kodeProgram]['total'] += $jumlah;
                $terorganisir[$kodeProgram]['sub_programs'][$kodeSubProgram]['total'] += $jumlah;
                $terorganisir[$kodeProgram]['sub_programs'][$kodeSubProgram]['uraian_programs'][$kodeUraian]['total'] += $jumlah;

                $terorganisir[$kodeProgram]['sub_programs'][$kodeSubProgram]['uraian_programs'][$kodeUraian]['items'][] = $itemData;
            }
        }

        ksort($terorganisir);
        foreach ($terorganisir as &$program) {
            if (! empty($program['sub_programs'])) {
                ksort($program['sub_programs']);
                foreach ($program['sub_programs'] as &$subProgram) {
                    if (! empty($subProgram['uraian_programs'])) {
                        ksort($subProgram['uraian_programs']);
                    }
                }
            }
        }

        return $terorganisir;
    }
    
    /**
     * Mendapatkan data untuk grafik proporsi anggaran - BERDASARKAN KODE KEGIATAN
     */
    private function getGrafikData($penganggaranId)
    {
        Log::info('🔍 [GRAFIK_DEBUG] Starting getGrafikData for penganggaran_id: ' . $penganggaranId);

        try {
            // Total pagu anggaran
            $penganggaran = Penganggaran::find($penganggaranId);
            $totalPagu = $penganggaran->pagu_anggaran ?? 0;

            Log::info('🔍 [GRAFIK_DEBUG] Total pagu anggaran: ' . number_format($totalPagu, 2));

            // 1. Hitung anggaran BUKU - BERDASARKAN KODE KEGIATAN
            $bukuAnggaran = Rkas::where('penganggaran_id', $penganggaranId)
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

            Log::info('📚 [GRAFIK_DEBUG] Buku anggaran calculated: ' . number_format($bukuAnggaran, 2));

            // 2. Hitung anggaran HONOR - BERDASARKAN KODE KEGIATAN
            $honorAnggaran = Rkas::where('penganggaran_id', $penganggaranId)
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

            Log::info('💰 [GRAFIK_DEBUG] Honor anggaran calculated: ' . number_format($honorAnggaran, 2));

            // PERBAIKAN: Hitung persentase honor dari 100% total pagu
            $honorPercentage = $totalPagu > 0 ? ($honorAnggaran / $totalPagu) * 100 : 0;
            Log::info('💰 [GRAFIK_DEBUG] Honor percentage dari 100% pagu: ' . number_format($honorPercentage, 2) . '%');

            // 3. Hitung anggaran SARPRAS - HANYA DARI KODE KEGIATAN 05.08
            $sarprasAnggaran = Rkas::where('penganggaran_id', $penganggaranId)
                ->whereHas('kodeKegiatan', function ($query) {
                    // HANYA kode kegiatan 05.08 - Pemeliharaan Sarana dan Prasarana Sekolah
                    $query->where('kode', 'like', '05.08.%');
                })
                ->get()
                ->sum(function ($item) {
                    return $item->jumlah * $item->harga_satuan;
                });

            Log::info('🏫 [GRAFIK_DEBUG] Sarpras anggaran calculated: ' . number_format($sarprasAnggaran, 2));
            Log::info('🏫 [GRAFIK_DEBUG] Sarpras percentage: ' . ($totalPagu > 0 ? number_format(($sarprasAnggaran / $totalPagu) * 100, 2) : 0) . '%');

            // 4. Data untuk grafik jenis belanja lainnya - BERDASARKAN REKENING BELANJA SAJA
            $jenisBelanjaData = Rkas::where('penganggaran_id', $penganggaranId)
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
                        '07.12.04.'
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
                        'percentage' => number_format($percentage, 2) . '%',
                        'color' => $this->getRandomColor(),
                        'total' => number_format($total, 2)
                    ];
                })
                ->sortByDesc('value')
                ->values();

            Log::info('📊 [GRAFIK_DEBUG] Jenis belanja data count: ' . $jenisBelanjaData->count());

            $grafikData = [
                'buku_anggaran' => $bukuAnggaran,
                'honor_anggaran' => $honorAnggaran,
                'sarpras_anggaran' => $sarprasAnggaran,
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
            Log::error('❌ [GRAFIK_DEBUG] Error in getGrafikData: ' . $e->getMessage());
            Log::error('❌ [GRAFIK_DEBUG] Stack trace: ' . $e->getTraceAsString());

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
            '#7986CB'
        ];

        return $colors[array_rand($colors)];
    }

    /**
     * Check if previous year RKAS Perubahan exists
     */
    public function checkPreviousYearPerubahan(Request $request)
    {
        try {
            Log::info('🔍 [CHECK PREVIOUS PERUBAHAN] Checking for year: ' . $request->input('tahun'));

            $currentYear = $request->input('tahun');

            if (!$currentYear) {
                Log::warning('❌ [CHECK PREVIOUS PERUBAHAN] Tahun parameter missing');
                return response()->json([
                    'success' => false,
                    'message' => 'Parameter tahun diperlukan'
                ], 400);
            }

            $previousYear = $currentYear - 1;

            Log::info('🔍 [CHECK PREVIOUS PERUBAHAN] Previous year: ' . $previousYear);

            // Cek apakah ada data penganggaran tahun sebelumnya
            $previousPenganggaran = Penganggaran::where('tahun_anggaran', $previousYear)->first();

            if (!$previousPenganggaran) {
                Log::info('🔍 [CHECK PREVIOUS PERUBAHAN] No penganggaran found for year: ' . $previousYear);
                return response()->json([
                    'success' => true, // Tetap success karena ini kondisi normal
                    'has_previous_perubahan' => false,
                    'message' => 'Data penganggaran tahun ' . $previousYear . ' tidak ditemukan'
                ]);
            }

            Log::info('🔍 [CHECK PREVIOUS PERUBAHAN] Penganggaran found, ID: ' . $previousPenganggaran->id);

            // Cek apakah ada RKAS Perubahan tahun sebelumnya
            $hasPreviousPerubahan = RkasPerubahan::where('penganggaran_id', $previousPenganggaran->id)->exists();

            Log::info('🔍 [CHECK PREVIOUS PERUBAHAN] Has previous perubahan: ' . ($hasPreviousPerubahan ? 'YES' : 'NO'));

            return response()->json([
                'success' => true,
                'has_previous_perubahan' => $hasPreviousPerubahan,
                'previous_year' => $previousYear,
                'current_year' => $currentYear,
                'message' => $hasPreviousPerubahan ?
                    'Data RKAS Perubahan tahun ' . $previousYear . ' tersedia' :
                    'Tidak ada data RKAS Perubahan tahun ' . $previousYear
            ]);
        } catch (\Exception $e) {
            Log::error('❌ [CHECK PREVIOUS PERUBAHAN] Error: ' . $e->getMessage());
            Log::error('❌ [CHECK PREVIOUS PERUBAHAN] Stack trace: ' . $e->getTraceAsString());

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan server: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Copy previous year RKAS Perubahan to current year
     */
    public function copyPreviousYearPerubahan(Request $request)
    {
        try {
            DB::beginTransaction();

            $currentYear = $request->input('tahun_anggaran');

            if (!$currentYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'Parameter tahun anggaran diperlukan'
                ], 400);
            }

            $previousYear = $currentYear - 1;

            // Dapatkan data penganggaran
            $previousPenganggaran = Penganggaran::where('tahun_anggaran', $previousYear)->first();
            $currentPenganggaran = Penganggaran::where('tahun_anggaran', $currentYear)->first();

            if (!$previousPenganggaran || !$currentPenganggaran) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data penganggaran tidak lengkap'
                ], 404);
            }

            // Ambil semua data RKAS Perubahan tahun sebelumnya
            $previousPerubahanData = RkasPerubahan::where('penganggaran_id', $previousPenganggaran->id)->get();

            if ($previousPerubahanData->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tidak ada data RKAS Perubahan tahun ' . $previousYear . ' untuk disalin'
                ], 404);
            }

            $copiedCount = 0;

            foreach ($previousPerubahanData as $previousData) {
                // Cek apakah data sudah ada di tahun ini (berdasarkan kriteria unik)
                $exists = Rkas::where('penganggaran_id', $currentPenganggaran->id)
                    ->where('kode_id', $previousData->kode_id)
                    ->where('kode_rekening_id', $previousData->kode_rekening_id)
                    ->where('uraian', $previousData->uraian)
                    ->where('bulan', $previousData->bulan)
                    ->exists();

                if (!$exists) {
                    // Salin data ke RKAS tahun berjalan
                    Rkas::create([
                        'penganggaran_id' => $currentPenganggaran->id,
                        'kode_id' => $previousData->kode_id,
                        'kode_rekening_id' => $previousData->kode_rekening_id,
                        'uraian' => $previousData->uraian,
                        'harga_satuan' => $previousData->harga_satuan,
                        'jumlah' => $previousData->jumlah,
                        'satuan' => $previousData->satuan,
                        'bulan' => $previousData->bulan,
                    ]);

                    $copiedCount++;
                }
            }

            DB::commit();

            // Simpan status di session
            session()->put('salin_data_done_' . $currentYear, true);

            return response()->json([
                'success' => true,
                'message' => 'Berhasil menyalin ' . $copiedCount . ' data dari RKAS Perubahan tahun ' . $previousYear,
                'copied_count' => $copiedCount,
                'previous_year' => $previousYear,
                'current_year' => $currentYear
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error copying previous year perubahan: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat menyalin data: ' . $e->getMessage()
            ], 500);
        }
    }
}
