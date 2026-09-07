<?php

namespace App\Http\Controllers;

use App\Models\BukuKasUmum;
use App\Models\BukuKasUmumUraianDetail;
use App\Models\KodeKegiatan;
use App\Models\Penganggaran;
use App\Models\RekeningBelanja;
use App\Models\Rkas;
use App\Models\RkasPerubahan;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use App\Config\VariantConfig;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class RkasController extends Controller
{
    protected ?string $variant;
    protected ?string $Penganggaran;
    protected ?string $Rkas;
    protected ?string $RkasPerubahan;
    protected ?string $BukuKasUmum;
    protected ?string $BukuKasUmumUraianDetail;

    public function __construct()
    {
        $this->middleware(function ($request, $next) {
            $this->variant = app()->bound('variant') ? app('variant') : 'reguler';
            $this->Penganggaran = VariantConfig::getModelClass('penganggaran', $this->variant);
            $this->Rkas = VariantConfig::getModelClass('rkas', $this->variant);
            $this->RkasPerubahan = VariantConfig::getModelClass('rkas_perubahan', $this->variant);
            $this->BukuKasUmum = VariantConfig::getModelClass('bku', $this->variant);
            $this->BukuKasUmumUraianDetail = VariantConfig::getModelClass('bku_uraian_detail', $this->variant);
            
            return $next($request);
        });
    }
    public function index(Request $request, $id)
    {
        $penganggaran = ($this->Penganggaran)::findOrFail($id);
        $penganggaran->setAttribute('sumber_dana', \App\Config\VariantConfig::title($this->variant));
        
        $kodeKegiatans = KodeKegiatan::all();
        $rekeningBelanjas = RekeningBelanja::all();

        // Get all RKAS items
        $itemsRaw = ($this->Rkas)::with(['kodeKegiatan', 'rekeningBelanja'])
            ->where(VariantConfig::penganggaranFk($this->variant), $penganggaran->id)
            ->get();

        // Calculate Totals
        // $totalBudget = $itemsRaw->sum(fn($i) => $i->jumlah * $i->harga_satuan);
        $totalTahap1 = ($this->Rkas)::getTotalTahap1($penganggaran->id);
        $totalTahap2 = ($this->Rkas)::getTotalTahap2($penganggaran->id);
        
        $paguAnggaran = $penganggaran->pagu_anggaran;
        $paguHalf = $paguAnggaran / 2;

        $monthMap = array_flip(($this->Rkas)::getBulanList());

        $bkuModel = new ($this->BukuKasUmum)();
        $bkuTable = $bkuModel->getTable();
        $bkuDetailModel = new ($this->BukuKasUmumUraianDetail)();
        $bkuDetailTable = $bkuDetailModel->getTable();
        $penganggaranFk = \App\Config\VariantConfig::penganggaranFk($this->variant);
        $bkuFk = \App\Config\VariantConfig::bkuFk($this->variant);

        // Get total spent from BKU directly grouped by unique signature
        $bkuSpents = ($this->BukuKasUmumUraianDetail)::selectRaw("{$bkuDetailTable}.kode_kegiatan_id, {$bkuDetailTable}.rekening_belanja_id, LOWER(TRIM({$bkuDetailTable}.uraian)) as uraian_clean, {$bkuDetailTable}.harga_satuan, SUM({$bkuDetailTable}.volume) as total_volume")
            ->join($bkuTable, "{$bkuTable}.id", '=', "{$bkuDetailTable}.{$bkuFk}")
            ->where("{$bkuTable}.{$penganggaranFk}", $penganggaran->id)
            ->groupBy("{$bkuDetailTable}.kode_kegiatan_id", "{$bkuDetailTable}.rekening_belanja_id", "uraian_clean", "{$bkuDetailTable}.harga_satuan")
            ->get()
            ->keyBy(function($item) {
                return $item->kode_kegiatan_id . '|' . $item->rekening_belanja_id . '|' . $item->uraian_clean . '|' . (float)$item->harga_satuan;
            });

        // Group by identical items to distribute BKU spending (FIFO)
        $groupedRaw = $itemsRaw->groupBy(function ($item) {
             return $item->kode_id . '|' . $item->kode_rekening_id . '|' . strtolower(trim($item->uraian)) . '|' . (float)$item->harga_satuan;
        });

        foreach ($groupedRaw as $key => $group) {
            // Sort by month index to process earliest month first
            $sortedGroup = $group->sortBy(function ($item) use ($monthMap) {
                return $monthMap[$item->bulan] ?? 99;
            });
            
            // Total spent for this group in BKU
            $totalSpent = isset($bkuSpents[$key]) ? $bkuSpents[$key]->total_volume : 0;
            
            foreach ($sortedGroup as $item) {
                if ($totalSpent > 0) {
                    $allocate = min($totalSpent, $item->jumlah);
                    $item->dibelanjakan_calc = $allocate;
                    $totalSpent -= $allocate;
                } else {
                    $item->dibelanjakan_calc = 0;
                }
            }
        }

        // Transform items for frontend
        $items = $itemsRaw->map(function($item) {
             return [
                'id' => $item->id,
                'program' => $item->kodeKegiatan->program ?? '-',
                'kegiatan' => $item->kodeKegiatan->sub_program ?? '-',
                'rekening' => $item->rekeningBelanja ? ($item->rekeningBelanja->kode_rekening . ' - ' . $item->rekeningBelanja->rincian_objek) : '-',
                'uraian' => $item->uraian,
                'dianggaran' => $item->jumlah,
                'dibelanjakan' => $item->dibelanjakan_calc ?? 0,
                'satuan' => $item->satuan,
                'harga' => number_format($item->harga_satuan, 0, ',', '.'),
                'total' => number_format($item->jumlah * $item->harga_satuan, 0, ',', '.'),
                'bulan' => $item->bulan,
             ];
        });

        // Calculate Month Filters
        $monthsList = ($this->Rkas)::getBulanList();
        $months = collect($monthsList)->map(function($month) use ($itemsRaw) {
            return [
                'name' => $month,
                'count' => $itemsRaw->where('bulan', $month)->count(),
                'active' => false 
            ];
        });

        $hasPerubahan = $this->RkasPerubahan ? ($this->RkasPerubahan)::where(VariantConfig::penganggaranFk($this->variant), $id)->exists() : false;
        $juniBkuClosed = ($this->BukuKasUmum)::where(VariantConfig::penganggaranFk($this->variant), $id)
            ->whereMonth('tanggal_transaksi', 6)
            ->where('is_bunga_record', true)
            ->whereNotNull('tanggal_tutup')
            ->exists();

        return $this->renderVariant('Penganggaran/Rkas/Index', [
            'anggaran' => [
                'id' => $penganggaran->id,
                'has_perubahan' => $hasPerubahan,
                'juni_bku_closed' => $juniBkuClosed,
                'tahun' => (string)$penganggaran->tahun_anggaran,
                'pagu_total' => number_format($paguAnggaran, 0, ',', '.'),
                'sumber_dana' => \App\Config\VariantConfig::title($this->variant),
                'status' => 'Aktif',
                'tahap_1' => [
                    'periode' => 'Januari - Juni', 
                    'persen' => $paguAnggaran > 0 ? number_format(($totalTahap1 / $paguAnggaran) * 100, 2) . '%' : '0.00%',
                    'sisa' => number_format($paguHalf - $totalTahap1, 0, ',', '.')
                ],
                'tahap_2' => [
                    'periode' => 'Juli - Desember',
                    'persen' => $paguAnggaran > 0 ? number_format(($totalTahap2 / $paguAnggaran) * 100, 2) . '%' : '0.00%',
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
        $penganggaran = ($this->Penganggaran)::with('sekolah')->findOrFail($id);
        $penganggaran->setAttribute('sumber_dana', \App\Config\VariantConfig::title($this->variant));
        
        // Fetch all RKAS data (for Recap and Tahapan - Full Year)
        $rkasData = ($this->Rkas)::with(['kodeKegiatan', 'rekeningBelanja'])
            ->where(VariantConfig::penganggaranFk($this->variant), $id)
            ->get();

        // Fetch Monthly specific data (for Rka Bulanan - Filtered by DB)
        $selectedMonth = $request->input('month', 'Januari');
        $monthlyRkas = ($this->Rkas)::with(['kodeKegiatan', 'rekeningBelanja'])
            ->where(VariantConfig::penganggaranFk($this->variant), $id)
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
        
        // Data for "Rincian" Tab
        $rincianData = $this->kelolaDataRincian($rkasData);

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
        $spentPemeliharaan = $grafikData['sarpras_spent'] ?? 0;

        // Honor Logic
        $honorPercent = $totalAnggaran > 0 ? ($totalHonor / $totalAnggaran) * 100 : 0;
        $statusSekolah = $penganggaran->sekolah->status_sekolah ?? 'Swasta';
        $isNegeri = stripos($statusSekolah, 'negeri') !== false;
        $maxHonor = $isNegeri ? 20 : 40;
        $honorValid = $honorPercent <= $maxHonor;

        $pemeliharaanPercent = $totalAnggaran > 0 ? ($totalPemeliharaan / $totalAnggaran) * 100 : 0;
        $spentPercent = $totalAnggaran > 0 ? ($spentPemeliharaan / $totalAnggaran) * 100 : 0;
        $pemeliharaanValid = $pemeliharaanPercent <= 20;

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
                'percentage' => $pemeliharaanPercent,
                'valid' => $pemeliharaanValid, 
                'message' => 'Anggaran pemeliharaan sarpras Anda adalah ' . number_format($pemeliharaanPercent, 2) . '% dan sudah dilaporkan di BKU sebesar ' . number_format($spentPercent, 2) . '% dari total pagu anggaran. Anggaran ' . ($pemeliharaanValid ? 'sudah' : 'belum') . ' sesuai dengan proporsi maksimal 20% dari total pagu anggaran.'
            ],
            'jenis_belanja' => $grafikData['jenis_belanja'] ?? []
        ];

        $kwitansiMap = $this->getKwitansiMap($id);

        return $this->renderVariant('Penganggaran/Rkas/Summary', [
            'anggaran' => $penganggaran,
            'groupedData' => $grouped,
            'tahapanData' => $tahapanData,
            'rkaBulananData' => $rkaBulananData,
            'rekapData' => $rekapData,
            'perTahapData' => $perTahapData,
            'lembarData' => $lembarData,
            'rincianData' => $rincianData,
            'grafikData' => $grafikDataResponse,
            'kwitansiMap' => $kwitansiMap,
        ]);
    }

    private function kelolaDataRincian($rkasData)
    {
        return $rkasData->groupBy(function ($item) {
            return optional($item->kodeKegiatan)->sub_program ?? 'Lainnya';
        })->map(function ($group) {
            $subProgram = optional($group->first()->kodeKegiatan)->sub_program ?? 'Lainnya';
            $total = $group->sum(function ($item) { return $item->jumlah * $item->harga_satuan; });
            
            $items = $group->groupBy(function ($item) {
                $tampil = $item->uraian_gabungan ?? $item->uraian;
                $tahap = in_array($item->bulan, ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni']) ? 1 : 2;
                return $item->kode_rekening_id . '-' . $tampil . '-Tahap' . $tahap;
            })->map(function ($uraianGroup) {
                $firstWithPenerima = $uraianGroup->firstWhere('nama_penerima', '!=', null) ?? $uraianGroup->first();
                $first = $uraianGroup->first();
                $tahap = in_array($first->bulan, ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni']) ? 1 : 2;
                return [
                    'uraian' => $first->uraian_gabungan ?? $first->uraian,
                    'kode_rekening_id' => $first->kode_rekening_id,
                    'kode_id' => $first->kode_id,
                    'kode_rekening' => optional($first->rekeningBelanja)->kode_rekening ?? '',
                    'kode_kegiatan' => optional($first->kodeKegiatan)->kode ?? '',
                    'tahap' => $tahap,
                    'jumlah' => $uraianGroup->sum(function ($item) { return $item->jumlah * $item->harga_satuan; }),
                    'original_items' => $uraianGroup->map(function($i) { return [
                        'uraian' => $i->uraian, 
                        'kode_rekening_id' => $i->kode_rekening_id, 
                        'kode_id' => $i->kode_id,
                        'kode_rekening' => optional($i->rekeningBelanja)->kode_rekening ?? '',
                        'kode_kegiatan' => optional($i->kodeKegiatan)->kode ?? ''
                    ]; })->unique(function($item) { return $item['uraian'] . '-' . $item['kode_rekening_id'] . '-' . $item['kode_id']; })->values()->all(),
                    'rkas_ids' => $uraianGroup->pluck('id')->values()->all(),
                    'bulan_list' => $uraianGroup->pluck('bulan')->filter()->unique()->values()->all(),
                    'bulan' => implode(', ', $uraianGroup->pluck('bulan')->filter()->unique()->values()->all()),
                    'nama_penerima' => $firstWithPenerima->nama_penerima ?? '-',
                    'jabatan' => $firstWithPenerima->jabatan ?? '-',
                    'nomor_rekening' => $firstWithPenerima->nomor_rekening ?? '-',
                    'bank' => $firstWithPenerima->bank ?? '-'
                ];
            })->values();

            return [
                'sub_program' => $subProgram,
                'items' => $items,
                'total' => $total,
            ];
        })->values();
    }

    public function store(Request $request, $id)
    {
        $penganggaran = ($this->Penganggaran)::findOrFail($id);
        $penganggaran->setAttribute('sumber_dana', \App\Config\VariantConfig::title($this->variant));

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
                $exists = ($this->Rkas)::where(VariantConfig::penganggaranFk($this->variant), $penganggaran->id)
                    ->where('kode_id', $request->kegiatan_id)
                    ->where('kode_rekening_id', $request->rekening_id)
                    ->where('bulan', $alloc['month'])
                    ->where('uraian', $request->uraian)
                    ->exists();

                if ($exists) {
                    throw new \Exception("Data untuk bulan {$alloc['month']} sudah ada.");
                }

                ($this->Rkas)::create([
                    VariantConfig::penganggaranFk($this->variant) => $penganggaran->id,
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
        $rkas = ($this->Rkas)::with(['kodeKegiatan', 'rekeningBelanja'])->findOrFail($id);
        
        // Find all items in the same group (siblings)
        $siblings = ($this->Rkas)::where(VariantConfig::penganggaranFk($this->variant), $rkas->{VariantConfig::penganggaranFk($this->variant)})
            ->where('kode_id', $rkas->kode_id)
            ->where('kode_rekening_id', $rkas->kode_rekening_id)
            ->where('uraian', $rkas->uraian)
            ->get();

        // Calculate FIFO spent per month for frontend validation
        $bkuSpentVolume = $this->getBkuSpentVolume($rkas);

        $monthMap = array_flip(($this->Rkas)::getBulanList());
        $sortedItems = $siblings->sortBy(function ($item) use ($monthMap) {
            return $monthMap[$item->bulan] ?? 99;
        });

        $remainingSpent = $bkuSpentVolume;
        $spentMap = [];

        foreach ($sortedItems as $item) {
            if ($remainingSpent > 0) {
                $allocate = min($remainingSpent, $item->jumlah);
                $spentMap[$item->id] = $allocate;
                $remainingSpent -= $allocate;
            } else {
                $spentMap[$item->id] = 0;
            }
        }

        return response()->json([
            'kegiatan_id' => (string)$rkas->kode_id, // Cast to string for Select component
            'rekening_id' => (string)$rkas->kode_rekening_id,
            'uraian' => $rkas->uraian,
            'harga_satuan' => $rkas->harga_satuan,
            'program_nama' => $rkas->kodeKegiatan ? $rkas->kodeKegiatan->program : '-',
            'kegiatan_nama' => $rkas->kodeKegiatan ? $rkas->kodeKegiatan->uraian : '-',
            'rekening_nama' => $rkas->rekeningBelanja ? ($rkas->rekeningBelanja->kode_rekening . ' - ' . $rkas->rekeningBelanja->rincian_objek) : '-',
            'alokasi' => $siblings->map(function($item) use ($spentMap) {
                return [
                    'month' => $item->bulan,
                    'quantity' => $item->jumlah,
                    'unit' => $item->satuan,
                    'spent' => $spentMap[$item->id] ?? 0, // Injected for real-time validation
                ];
            })->values()
        ]);
    }

    public function updateGroup(Request $request)
    {
        // Validation similar to store but we need an identifier to know WHAT to update.
        // We will accept an 'original_id' to find the original group.
        $request->validate([
            'original_id' => 'required|exists:' . (new ($this->Rkas))->getTable() . ',id',
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
            $original = ($this->Rkas)::findOrFail($request->original_id);
            // Validasi BKU
            $bkuSpentVolume = $this->getBkuSpentVolume($original);

            if ($bkuSpentVolume > 0) {
                // Check if signature changed
                if ($request->kegiatan_id != $original->kode_id || 
                    $request->rekening_id != $original->kode_rekening_id || 
                    strtolower(trim($request->uraian)) != strtolower(trim($original->uraian)) || 
                    $request->harga_satuan != $original->harga_satuan) {
                    
                    return redirect()->back()->withErrors(['message' => 'Tidak Dapat Melakukan Perubahan, Karena Sudah Dibelanjakan Pada BKU. Hapus Belanja Ini Pada BKU Terlebih Dahulu Agar Dapat Melakukan Update Data.']);
                }

                // Hitung FIFO per bulan untuk BKU spent
                $originalItems = ($this->Rkas)::where(VariantConfig::penganggaranFk($this->variant), $original->{VariantConfig::penganggaranFk($this->variant)})
                    ->where('kode_id', $original->kode_id)
                    ->where('kode_rekening_id', $original->kode_rekening_id)
                    ->where('uraian', $original->uraian)
                    ->get();

                $monthMap = array_flip(($this->Rkas)::getBulanList());
                $sortedItems = $originalItems->sortBy(function ($item) use ($monthMap) {
                    return $monthMap[$item->bulan] ?? 99;
                });

                $remainingSpent = $bkuSpentVolume;
                $spentPerMonth = [];

                foreach ($sortedItems as $item) {
                    if ($remainingSpent > 0) {
                        $allocate = min($remainingSpent, $item->jumlah);
                        $spentPerMonth[$item->bulan] = ($spentPerMonth[$item->bulan] ?? 0) + $allocate;
                        $remainingSpent -= $allocate;
                    } else {
                        $spentPerMonth[$item->bulan] = ($spentPerMonth[$item->bulan] ?? 0);
                    }
                }

                $proposedPerMonth = [];
                foreach ($request->alokasi as $alloc) {
                    $proposedPerMonth[$alloc['month']] = ($proposedPerMonth[$alloc['month']] ?? 0) + $alloc['quantity'];
                }

                foreach ($spentPerMonth as $month => $spent) {
                    if ($spent > 0) {
                        $proposed = $proposedPerMonth[$month] ?? 0;
                        if ($proposed < $spent) {
                            return redirect()->back()->withErrors(['message' => "Tidak Dapat Melakukan Perubahan. Anggaran bulan {$month} sudah terpakai sebanyak {$spent} di BKU!"]);
                        }
                    }
                }
            }
            
            // 1. Delete the OLD group
            ($this->Rkas)::where(VariantConfig::penganggaranFk($this->variant), $original->{VariantConfig::penganggaranFk($this->variant)})
                ->where('kode_id', $original->kode_id)
                ->where('kode_rekening_id', $original->kode_rekening_id)
                ->where('uraian', $original->uraian)
                ->delete();

            // 2. Create the NEW items (essentially replacing them)
            // Note: We use the original penganggaran_id
            foreach ($request->alokasi as $alloc) {
                ($this->Rkas)::create([
                    VariantConfig::penganggaranFk($this->variant) => $original->{VariantConfig::penganggaranFk($this->variant)},
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
        $penganggaran = ($this->Penganggaran)::with('sekolah')->findOrFail($id);
        $penganggaran->setAttribute('sumber_dana', \App\Config\VariantConfig::title($this->variant));
        
        $rkasData = ($this->Rkas)::with(['kodeKegiatan', 'rekeningBelanja'])
            ->where(VariantConfig::penganggaranFk($this->variant), $id)
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

    public function exportTahapanV1Pdf(Request $request, $id)
    {
        $penganggaran = ($this->Penganggaran)::with('sekolah')->findOrFail($id);
        $penganggaran->setAttribute('sumber_dana', \App\Config\VariantConfig::title($this->variant));
        
        $rkasData = ($this->Rkas)::with(['kodeKegiatan', 'rekeningBelanja'])
            ->where(VariantConfig::penganggaranFk($this->variant), $id)
            ->orderBy('kode_id')
            ->get()
            ->groupBy(function ($item) {
                return optional($item->kodeKegiatan)->kode;
            })
            ->filter(fn($group, $key) => !is_null($key));
            
        // Use the same logic as standard Tahapan, data includes 'bulanan' for T1/T2 split
        $tahapanData = $this->kelolaDataRkas($rkasData);
        $totalTahap1 = $this->calculateTotalTahap1($id);
        $totalTahap2 = $this->calculateTotalTahap2($id);

        $pdf = Pdf::loadView('laporan.rka_tahapan_v_1_pdf', [
            'anggaran' => $penganggaran->toArray(),
            'tahapanData' => $tahapanData,
            'totalTahap1' => $totalTahap1,
            'totalTahap2' => $totalTahap2,
            'paper_size' => $request->paper_size,
            'orientation' => $request->orientation,
            'font_size' => $request->font_size
        ]);

        return $pdf->stream('rka_tahapan_v1.pdf');
    }

    public function exportRekapPdf(Request $request, $id)
    {
        $penganggaran = ($this->Penganggaran)::with('sekolah')->findOrFail($id);
        $penganggaran->setAttribute('sumber_dana', \App\Config\VariantConfig::title($this->variant));
        
        $rekapData = $this->getRekapRkas($id);
        
        // Calculate per Tahapan for the summary part of Rekap
        $totalPendapatan = (float) $penganggaran->pagu_anggaran;
        $pendapatanTahap1 = $totalPendapatan / 2;
        $pendapatanTahap2 = $totalPendapatan / 2;
        
        // Need raw data for tahap calc
        $rkasData = ($this->Rkas)::with(['rekeningBelanja']) ->where(VariantConfig::penganggaranFk($this->variant), $id)->get();
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
        $penganggaran = ($this->Penganggaran)::with('sekolah')->findOrFail($id);
        $penganggaran->setAttribute('sumber_dana', \App\Config\VariantConfig::title($this->variant));
        $month = $request->input('month', 'Januari');

        if ($month === 'all') {
            $months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
            $allData = [];

            // Fetch all data for this budget
            $allRkas = ($this->Rkas)::with(['kodeKegiatan', 'rekeningBelanja'])
                ->where(VariantConfig::penganggaranFk($this->variant), $id)
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
            $rkasData = ($this->Rkas)::with(['kodeKegiatan', 'rekeningBelanja'])
                ->where(VariantConfig::penganggaranFk($this->variant), $id)
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
        $penganggaran = ($this->Penganggaran)::with('sekolah')->findOrFail($id);
        $penganggaran->setAttribute('sumber_dana', \App\Config\VariantConfig::title($this->variant));
        
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
            'id' => 'required|exists:' . (new ($this->Rkas))->getTable() . ',id',
        ]);
        
        $target = ($this->Rkas)::findOrFail($request->id);
        
        // Validasi BKU
        $bkuSpentVolume = $this->getBkuSpentVolume($target);

        if ($bkuSpentVolume > 0) {
            return redirect()->back()->withErrors(['message' => 'Tidak Dapat Melakukan Perubahan, Karena Sudah Dibelanjakan Pada BKU. Hapus Belanja Ini Pada BKU Terlebih Dahulu Agar Dapat Melakukan Update Data.']);
        }

        // Delete all matches
        ($this->Rkas)::where(VariantConfig::penganggaranFk($this->variant), $target->{VariantConfig::penganggaranFk($this->variant)})
            ->where('kode_id', $target->kode_id)
            ->where('kode_rekening_id', $target->kode_rekening_id)
            ->where('uraian', $target->uraian)
            ->delete();
            
            
        return redirect()->back()->with('success', 'Data RKAS berhasil dihapus semua.');
    }

    private function getBkuSpentVolume($rkasItem)
    {
        $bkuTable = (new ($this->BukuKasUmum))->getTable();
        $bkuDetailTable = (new ($this->BukuKasUmumUraianDetail))->getTable();
        $penganggaranFk = VariantConfig::penganggaranFk($this->variant);
        $bkuFk = VariantConfig::bkuFk($this->variant);

        return ($this->BukuKasUmumUraianDetail)::join($bkuTable, "{$bkuTable}.id", '=', "{$bkuDetailTable}.{$bkuFk}")
            ->where("{$bkuTable}.{$penganggaranFk}", $rkasItem->{$penganggaranFk})
            ->where("{$bkuDetailTable}.kode_kegiatan_id", $rkasItem->kode_id)
            ->where("{$bkuDetailTable}.rekening_belanja_id", $rkasItem->kode_rekening_id)
            ->whereRaw("LOWER(TRIM({$bkuDetailTable}.uraian)) = LOWER(TRIM(?))", [$rkasItem->uraian])
            ->where("{$bkuDetailTable}.harga_satuan", $rkasItem->harga_satuan)
            ->sum("{$bkuDetailTable}.volume");
    }

    // --- LOGIC HELPERS ---

    private function calculateTotalTahap1($penganggaranId)
    {
        return ($this->Rkas)::where(VariantConfig::penganggaranFk($this->variant), $penganggaranId)
            ->whereIn('bulan', ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'])
            ->sum(DB::raw('jumlah * harga_satuan'));
    }

    private function calculateTotalTahap2($penganggaranId)
    {
        return ($this->Rkas)::where(VariantConfig::penganggaranFk($this->variant), $penganggaranId)
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
                        'kode_rekening_id' => $item->rekeningBelanja->id,
                        'kode_rekening' => $item->rekeningBelanja->kode_rekening,
                        'kode_id' => $item->kode_id,
                        'kode_kegiatan' => optional($item->kodeKegiatan)->kode ?? '',
                        'uraian' => $item->uraian,
                        'uraian_gabungan' => $item->uraian_gabungan,
                        'uraian_gabungan_t1' => null,
                        'uraian_gabungan_t2' => null,
                        'rkas_ids' => [], // Added for precise Gabung Kegiatan matching
                        'rkas_ids_per_bulan' => [], // Added for phase-specific precise Gabung Kegiatan matching
                        'program_code' => $kodeSubProgram, // Added for frontend compatibility
                        'volume' => 0,
                        'satuan' => $item->satuan,
                        'harga_satuan' => $item->harga_satuan,
                        'jumlah' => 0,
                        'tahap1' => 0,
                        'tahap2' => 0,
                        'tarif' => $item->harga_satuan, // Added alias for frontend compatibility
                        'bulanan' => [], // Initialize monthly breakdown
                        
                        // RP Fields
                        'nama_penerima' => $item->nama_penerima,
                        'jabatan' => $item->jabatan,
                        'nomor_rekening' => $item->nomor_rekening,
                        'bank' => $item->bank,
                        'ada_npwp' => $item->ada_npwp,
                        'pot_ppn' => $item->pot_ppn,
                        'pot_pph23' => $item->pot_pph23,
                        'pot_pph21' => $item->pot_pph21,
                        'pot_pph21_narasumber' => $item->pot_pph21_narasumber,
                        'status_penerima' => $item->status_penerima,
                        'golongan' => $item->golongan,
                        'pot_ppn_t1' => 0,
                        'pot_ppn_t2' => 0,
                        'pot_pph23_t1' => 0,
                        'pot_pph23_t2' => 0,
                        'pot_pph21_t1' => 0,
                        'pot_pph21_t2' => 0,
                        'pot_pph21_narasumber_t1' => 0,
                        'pot_pph21_narasumber_t2' => 0,
                        
                        // Tax Flags
                        'is_ppn' => $item->rekeningBelanja->is_ppn,
                        'is_pph21' => $item->rekeningBelanja->is_pph21,
                        'is_pph22' => $item->rekeningBelanja->is_pph22,
                        'is_pph23' => $item->rekeningBelanja->is_pph23,
                        'is_pph4' => $item->rekeningBelanja->is_pph4,
                    ];
                } else {
                    // Update tax/recipient fields opportunistically if the grouped one is missing them but current item has them
                    if (empty($groupedItems[$key]['nama_penerima']) && !empty($item->nama_penerima)) {
                        $groupedItems[$key]['nama_penerima'] = $item->nama_penerima;
                        $groupedItems[$key]['jabatan'] = $item->jabatan;
                        $groupedItems[$key]['nomor_rekening'] = $item->nomor_rekening;
                        $groupedItems[$key]['bank'] = $item->bank;
                        $groupedItems[$key]['ada_npwp'] = $item->ada_npwp;
                        $groupedItems[$key]['status_penerima'] = $item->status_penerima;
                        $groupedItems[$key]['golongan'] = $item->golongan;
                    }
                    if (empty($groupedItems[$key]['pot_ppn']) && !empty($item->pot_ppn)) {
                        $groupedItems[$key]['pot_ppn'] = $item->pot_ppn;
                    }
                    if (empty($groupedItems[$key]['pot_pph23']) && !empty($item->pot_pph23)) {
                        $groupedItems[$key]['pot_pph23'] = $item->pot_pph23;
                    }
                    if (empty($groupedItems[$key]['pot_pph21']) && !empty($item->pot_pph21)) {
                        $groupedItems[$key]['pot_pph21'] = $item->pot_pph21;
                    }
                    if (empty($groupedItems[$key]['pot_pph21_narasumber']) && !empty($item->pot_pph21_narasumber)) {
                        $groupedItems[$key]['pot_pph21_narasumber'] = $item->pot_pph21_narasumber;
                    }
                }

                $groupedItems[$key]['rkas_ids'][] = $item->id;
                if (!isset($groupedItems[$key]['rkas_ids_per_bulan'][$item->bulan])) {
                    $groupedItems[$key]['rkas_ids_per_bulan'][$item->bulan] = [];
                }
                $groupedItems[$key]['rkas_ids_per_bulan'][$item->bulan][] = $item->id;

                $jumlah = $item->jumlah * $item->harga_satuan;
                $isTahap1 = in_array($item->bulan, ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni']);
                $bulanName = $item->bulan;

                $groupedItems[$key]['volume'] += $item->jumlah;
                $groupedItems[$key]['jumlah'] += $jumlah;

                if ($isTahap1) {
                    $groupedItems[$key]['pot_ppn_t1'] += $item->pot_ppn;
                    $groupedItems[$key]['pot_pph23_t1'] += $item->pot_pph23;
                    $groupedItems[$key]['pot_pph21_t1'] += $item->pot_pph21;
                    $groupedItems[$key]['pot_pph21_narasumber_t1'] += $item->pot_pph21_narasumber;
                } else {
                    $groupedItems[$key]['pot_ppn_t2'] += $item->pot_ppn;
                    $groupedItems[$key]['pot_pph23_t2'] += $item->pot_pph23;
                    $groupedItems[$key]['pot_pph21_t2'] += $item->pot_pph21;
                    $groupedItems[$key]['pot_pph21_narasumber_t2'] += $item->pot_pph21_narasumber;
                }

                if ($isTahap1) {
                    $groupedItems[$key]['tahap1'] += $jumlah;
                    if (!empty($item->uraian_gabungan)) {
                        $groupedItems[$key]['uraian_gabungan_t1'] = $item->uraian_gabungan;
                    }
                } else {
                    $groupedItems[$key]['tahap2'] += $jumlah;
                    if (!empty($item->uraian_gabungan)) {
                        $groupedItems[$key]['uraian_gabungan_t2'] = $item->uraian_gabungan;
                    }
                }

                // Populate monthly data
                if (!isset($groupedItems[$key]['bulanan'][$bulanName])) {
                     $groupedItems[$key]['bulanan'][$bulanName] = [
                        'volume' => 0,
                        'total' => 0,
                        'pot_ppn' => 0,
                        'pot_pph23' => 0,
                        'pot_pph21' => 0,
                        'pot_pph21_narasumber' => 0,
                        'nama_penerima' => $item->nama_penerima,
                        'jabatan' => $item->jabatan,
                        'nomor_rekening' => $item->nomor_rekening,
                        'bank' => $item->bank,
                        'ada_npwp' => $item->ada_npwp,
                        'status_penerima' => $item->status_penerima,
                        'golongan' => $item->golongan,
                     ];
                }
                $groupedItems[$key]['bulanan'][$bulanName]['volume'] += $item->jumlah;
                $groupedItems[$key]['bulanan'][$bulanName]['total'] += $jumlah;
                $groupedItems[$key]['bulanan'][$bulanName]['pot_ppn'] += $item->pot_ppn;
                $groupedItems[$key]['bulanan'][$bulanName]['pot_pph23'] += $item->pot_pph23;
                $groupedItems[$key]['bulanan'][$bulanName]['pot_pph21'] += $item->pot_pph21;
                $groupedItems[$key]['bulanan'][$bulanName]['pot_pph21_narasumber'] += $item->pot_pph21_narasumber;
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

    /**
     * Membuat mapping rkas_id => [{ id_transaksi, bulan }, ...] dari kolom nomor_kwitansi.
     */
    private function getKwitansiMap($penganggaranId): array
    {
        $rkasTable = (new ($this->Rkas))->getTable();
        $bkuTable = (new ($this->BukuKasUmum))->getTable();
        $penganggaranFk = VariantConfig::penganggaranFk($this->variant);
        
        // 1. Dapatkan lookup id_transaksi => bulan dari BKU
        $bkuRows = DB::table($bkuTable)
            ->where($penganggaranFk, $penganggaranId)
            ->whereNotNull('id_transaksi')
            ->select('id_transaksi', 'tanggal_transaksi')
            ->get();

        $bulanNames = [
            1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
            5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
            9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember',
        ];

        $bkuLookup = [];
        foreach ($bkuRows as $row) {
            $bulanName = '';
            if ($row->tanggal_transaksi) {
                $bulanNum = (int) date('n', strtotime($row->tanggal_transaksi));
                $bulanName = $bulanNames[$bulanNum] ?? '';
            }
            $bkuLookup[$row->id_transaksi] = $bulanName;
        }

        // 2. Dapatkan data RKAS yang memiliki nomor_kwitansi
        $rkasRows = DB::table($rkasTable)
            ->where($penganggaranFk, $penganggaranId)
            ->whereNotNull('nomor_kwitansi')
            ->select('id', 'nomor_kwitansi')
            ->get();

        $map = [];
        foreach ($rkasRows as $row) {
            if (!$row->nomor_kwitansi) continue;
            
            $kwitansis = array_map('trim', explode(',', $row->nomor_kwitansi));
            foreach ($kwitansis as $kwitansi) {
                if (!$kwitansi) continue;
                
                $map[$row->id][] = [
                    'id_transaksi' => $kwitansi,
                    'bulan' => $bkuLookup[$kwitansi] ?? '',
                ];
            }
        }

        // Deduplicate
        foreach ($map as $k => $entries) {
            $unique = [];
            $seen = [];
            foreach ($entries as $entry) {
                $sig = $entry['id_transaksi'] . '|' . $entry['bulan'];
                if (!in_array($sig, $seen)) {
                    $seen[] = $sig;
                    $unique[] = $entry;
                }
            }
            $map[$k] = $unique;
        }

        return $map;
    }

    public function getAvailableKwitansi($id)
    {
        $bkuClass = $this->BukuKasUmum;
        $penganggaranFk = VariantConfig::penganggaranFk($this->variant);
        
        $bkuRows = $bkuClass::with('uraianDetails')
            ->where($penganggaranFk, $id)
            ->whereNotNull('id_transaksi')
            ->select('id', 'id_transaksi', 'tanggal_transaksi', 'uraian')
            ->get();
            
        $bulanNames = [
            1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
            5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
            9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember',
        ];

        $results = [];
        foreach ($bkuRows as $row) {
            $bulanName = '';
            if ($row->tanggal_transaksi) {
                $bulanNum = (int) date('n', strtotime($row->tanggal_transaksi));
                $bulanName = $bulanNames[$bulanNum] ?? '';
            }

            $uraianDetails = $row->uraianDetails->map(function($detail) {
                return [
                    'uraian' => $detail->uraian,
                    'volume' => $detail->volume,
                    'satuan' => $detail->satuan,
                    'harga_satuan' => $detail->harga_satuan,
                    'jumlah' => $detail->jumlah,
                ];
            });

            $results[] = [
                'id_transaksi' => $row->id_transaksi,
                'bulan' => $bulanName,
                'uraian' => $row->uraian,
                'uraian_details' => $uraianDetails,
            ];
        }

        return response()->json($results);
    }

    public function updateKwitansi(Request $request, $id)
    {
        $request->validate([
            'rkas_ids' => 'required|array',
            'rkas_ids.*' => 'integer',
            'nomor_kwitansi' => 'nullable|string'
        ]);
        
        $this->Rkas::where(VariantConfig::penganggaranFk($this->variant), $id)
            ->whereIn('id', $request->rkas_ids)
            ->update(['nomor_kwitansi' => $request->nomor_kwitansi]);
            
        return redirect()->back()->with('success', 'Nomor kwitansi berhasil disimpan.');
    }

    private function getRekapRkas($penganggaranId)
    {
        try {
            $penganggaran = ($this->Penganggaran)::findOrFail($penganggaranId);
            $rkasData = ($this->Rkas)::with(['rekeningBelanja'])
                ->where(VariantConfig::penganggaranFk($this->variant), $penganggaranId)
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

        $rkasDetail = ($this->Rkas)::with(['rekeningBelanja'])
            ->where(VariantConfig::penganggaranFk($this->variant), $penganggaranId)
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
        Log::info('🔍 [GRAFIK_DEBUG_NEW_MURNI] Starting getGrafikData for penganggaran_id: ' . $penganggaranId);

        try {
            // Total pagu anggaran
            $penganggaran = ($this->Penganggaran)::find($penganggaranId);
            $totalPagu = $penganggaran->pagu_anggaran ?? 0;

            Log::info('🔍 [GRAFIK_DEBUG] Total pagu anggaran: ' . number_format($totalPagu, 2));

            // 1. Hitung anggaran BUKU - BERDASARKAN KODE KEGIATAN
            $bukuAnggaran = ($this->Rkas)::where(VariantConfig::penganggaranFk($this->variant), $penganggaranId)
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
            $honorAnggaran = ($this->Rkas)::where(VariantConfig::penganggaranFk($this->variant), $penganggaranId)
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

            // 3. Hitung anggaran SARPRAS - BERDASARKAN KODE KEGIATAN (05.08.01.)
            $sarprasAnggaran = ($this->Rkas)::where(VariantConfig::penganggaranFk($this->variant), $penganggaranId)
                ->whereHas('kodeKegiatan', function ($query) {
                    // Kode kegiatan Pemeliharaan Prasarana Lahan, Bangunan dan Ruang
                    $query->where('kode', 'like', '05.08.01%')
                            ->orWhere('kode', 'like', '05.08.03%');
                            // ->orWhere('kode', 'like', '05.08.05%')
                            // ->orWhere('kode', 'like', '05.08.10%');
                })
                ->get()
                ->sum(function ($item) {
                    return $item->jumlah * $item->harga_satuan;
                });

            $bkuTable = (new ($this->BukuKasUmum))->getTable();
            $bkuDetailTable = (new ($this->BukuKasUmumUraianDetail))->getTable();
            $penganggaranFk = VariantConfig::penganggaranFk($this->variant);
            $bkuFk = VariantConfig::bkuFk($this->variant);

            $sarprasSpent = \DB::table($bkuDetailTable)
                ->join($bkuTable, "{$bkuTable}.id", '=', "{$bkuDetailTable}.{$bkuFk}")
                ->join('kode_kegiatans', 'kode_kegiatans.id', '=', "{$bkuDetailTable}.kode_kegiatan_id")
                ->where("{$bkuTable}.{$penganggaranFk}", $penganggaranId)
                ->where(function($q) {
                    $q->where('kode_kegiatans.kode', 'like', '05.08.01%')
                      ->orWhere('kode_kegiatans.kode', 'like', '05.08.03%')
                      ->orWhere('kode_kegiatans.kode', 'like', '05.08.05%')
                      ->orWhere('kode_kegiatans.kode', 'like', '05.08.10%');
                })
                ->sum("{$bkuDetailTable}.jumlah");

            Log::info('🏫 [GRAFIK_DEBUG] Sarpras anggaran calculated: ' . number_format($sarprasAnggaran, 2));
            Log::info('🏫 [GRAFIK_DEBUG] Sarpras spent calculated: ' . number_format($sarprasSpent, 2));
            Log::info('🏫 [GRAFIK_DEBUG] Sarpras percentage: ' . ($totalPagu > 0 ? number_format(($sarprasAnggaran / $totalPagu) * 100, 2) : 0) . '%');

            // 4. Data untuk grafik jenis belanja lainnya - BERDASARKAN REKENING BELANJA SAJA
            $jenisBelanjaData = ($this->Rkas)::where(VariantConfig::penganggaranFk($this->variant), $penganggaranId)
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
                'sarpras_spent' => $sarprasSpent,
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
        if (!$this->RkasPerubahan) {
            return response()->json([
                'success' => false,
                'has_previous_perubahan' => false,
                'message' => 'Fitur salin RKAS Perubahan tidak tersedia untuk varian ini'
            ]);
        }

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
            $previousPenganggaran = ($this->Penganggaran)::where('tahun_anggaran', $previousYear)->first();

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
            $hasPreviousPerubahan = ($this->RkasPerubahan)::where(VariantConfig::penganggaranFk($this->variant), $previousPenganggaran->id)->exists();

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
        if (!$this->RkasPerubahan) {
            return response()->json([
                'success' => false,
                'message' => 'Fitur salin RKAS Perubahan tidak tersedia untuk varian ini'
            ]);
        }

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
            $previousPenganggaran = ($this->Penganggaran)::where('tahun_anggaran', $previousYear)->first();
            $currentPenganggaran = ($this->Penganggaran)::where('tahun_anggaran', $currentYear)->first();

            if (!$previousPenganggaran || !$currentPenganggaran) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data penganggaran tidak lengkap'
                ], 404);
            }

            // Ambil semua data RKAS Perubahan tahun sebelumnya
            $previousPerubahanData = ($this->RkasPerubahan)::where(VariantConfig::penganggaranFk($this->variant), $previousPenganggaran->id)->get();

            if ($previousPerubahanData->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tidak ada data RKAS Perubahan tahun ' . $previousYear . ' untuk disalin'
                ], 404);
            }

            $copiedCount = 0;

            foreach ($previousPerubahanData as $previousData) {
                // Cek apakah data sudah ada di tahun ini (berdasarkan kriteria unik)
                $exists = ($this->Rkas)::where(VariantConfig::penganggaranFk($this->variant), $currentPenganggaran->id)
                    ->where('kode_id', $previousData->kode_id)
                    ->where('kode_rekening_id', $previousData->kode_rekening_id)
                    ->where('uraian', $previousData->uraian)
                    ->where('bulan', $previousData->bulan)
                    ->exists();

                if (!$exists) {
                    // Salin data ke RKAS tahun berjalan
                    ($this->Rkas)::create([
                        VariantConfig::penganggaranFk($this->variant) => $currentPenganggaran->id,
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

    public function exportExcelTahapan(Request $request, $id)
    {
        $penganggaran = ($this->Penganggaran)::with('sekolah')->findOrFail($id);
        $penganggaran->setAttribute('sumber_dana', \App\Config\VariantConfig::title($this->variant));

        $rkasData = ($this->Rkas)::with(['kodeKegiatan', 'rekeningBelanja'])
            ->where(VariantConfig::penganggaranFk($this->variant), $id)
            ->orderBy('kode_id')
            ->get()
            ->groupBy(function ($item) {
                return optional($item->kodeKegiatan)->kode;
            })
            ->filter(fn($group, $key) => !is_null($key));

        $tahapanData = $this->kelolaDataRkas($rkasData);
        $totalTahap1 = $this->calculateTotalTahap1($id);
        $totalTahap2 = $this->calculateTotalTahap2($id);

        $html = view('rka_tahapan_pdf', [
            'anggaran' => $penganggaran->toArray(),
            'tahapanData' => $tahapanData,
            'totalTahap1' => $totalTahap1,
            'totalTahap2' => $totalTahap2,
            'paper_size' => 'A4',
            'orientation' => 'portrait',
            'font_size' => '11pt',
            'is_excel' => true // Flag to indicate Excel export
        ])->render();

        return response($html)
            ->header('Content-Type', 'application/vnd.ms-excel')
            ->header('Content-Disposition', 'attachment; filename="rka_tahapan_' . $penganggaran->tahun_anggaran . '.xls"');
    }

    public function exportExcelTahapanV1(Request $request, $id)
    {
        $penganggaran = ($this->Penganggaran)::with('sekolah')->findOrFail($id);
        $penganggaran->setAttribute('sumber_dana', \App\Config\VariantConfig::title($this->variant));
        
        $rkasData = ($this->Rkas)::with(['kodeKegiatan', 'rekeningBelanja'])
            ->where(VariantConfig::penganggaranFk($this->variant), $id)
            ->orderBy('kode_id')
            ->get()
            ->groupBy(function ($item) {
                return optional($item->kodeKegiatan)->kode;
            })
            ->filter(fn($group, $key) => !is_null($key));
            
        $tahapanData = $this->kelolaDataRkas($rkasData);
        $totalTahap1 = $this->calculateTotalTahap1($id);
        $totalTahap2 = $this->calculateTotalTahap2($id);

        $html = view('laporan.rka_tahapan_v_1_pdf', [
            'anggaran' => $penganggaran->toArray(),
            'tahapanData' => $tahapanData,
            'totalTahap1' => $totalTahap1,
            'totalTahap2' => $totalTahap2,
            'paper_size' => 'A4',
            'orientation' => 'portrait',
            'font_size' => '11pt',
            'is_excel' => true
        ])->render();

        return response($html)
            ->header('Content-Type', 'application/vnd.ms-excel')
            ->header('Content-Disposition', 'attachment; filename="rka_tahapan_v1_' . $penganggaran->tahun_anggaran . '.xls"');
    }

    public function exportRincianPdf(Request $request, $id)
    {
        $penganggaran = ($this->Penganggaran)::with('sekolah')->findOrFail($id);
        $penganggaran->setAttribute('sumber_dana', \App\Config\VariantConfig::title($this->variant));
        $tahap = $request->input('tahap', 'tahunan');
        
        $query = ($this->Rkas)::with(['kodeKegiatan', 'rekeningBelanja'])
            ->where(VariantConfig::penganggaranFk($this->variant), $id);

        if ($tahap === '1') {
            $query->whereIn('bulan', ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni']);
        } elseif ($tahap === '2') {
            $query->whereIn('bulan', ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']);
        }

        $rkasData = $query->get();

        $rincianData = $this->kelolaDataRincian($rkasData);

        $pdf = Pdf::loadView('laporan.rka_rincian_pdf', [
            'anggaran' => $penganggaran->toArray(),
            'rincianData' => $rincianData,
            'tahap' => $tahap,
            'paper_size' => $request->paper_size ?? 'A4',
            'orientation' => $request->orientation ?? 'portrait',
            'font_size' => $request->font_size ?? '12pt'
        ]);

        return $pdf->stream('rka_rincian.pdf');
    }

    public function exportRincianExcel(Request $request, $id)
    {
        $penganggaran = ($this->Penganggaran)::with('sekolah')->findOrFail($id);
        $penganggaran->setAttribute('sumber_dana', \App\Config\VariantConfig::title($this->variant));
        $tahap = $request->input('tahap', 'tahunan');

        $query = ($this->Rkas)::with(['kodeKegiatan', 'rekeningBelanja'])
            ->where(VariantConfig::penganggaranFk($this->variant), $id);

        if ($tahap === '1') {
            $query->whereIn('bulan', ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni']);
        } elseif ($tahap === '2') {
            $query->whereIn('bulan', ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']);
        }

        $rkasData = $query->get();

        $rincianData = $this->kelolaDataRincian($rkasData);

        $html = view('laporan.rka_rincian_exel', [
            'anggaran' => $penganggaran->toArray(),
            'rincianData' => $rincianData,
            'tahap' => $tahap,
            'paper_size' => $request->paper_size ?? 'A4',
            'orientation' => $request->orientation ?? 'portrait',
            'font_size' => $request->font_size ?? '11pt',
            'is_excel' => true,
        ])->render();

        return response($html)
            ->header('Content-Type', 'application/vnd.ms-excel')
            ->header('Content-Disposition', 'attachment; filename="rka_rincian_' . $penganggaran->tahun_anggaran . '.xls"');
    }
    public function exportAlurKasPdf(Request $request, $id)
    {
        $penganggaran = ($this->Penganggaran)::with('sekolah')->findOrFail($id);
        $penganggaran->setAttribute('sumber_dana', \App\Config\VariantConfig::title($this->variant));
        
        $rkasData = ($this->Rkas)::with(['kodeKegiatan', 'rekeningBelanja'])
            ->where(VariantConfig::penganggaranFk($this->variant), $id)
            ->orderBy('kode_id')
            ->get()
            ->groupBy(function ($item) {
                return optional($item->kodeKegiatan)->kode;
            })
            ->filter(fn($group, $key) => !is_null($key));
            
        $tahapanData = $this->kelolaDataRkas($rkasData);

        $pdf = Pdf::loadView('laporan.alur_kas', [
            'anggaran' => $penganggaran->toArray(),
            'tahapanData' => $tahapanData,
            'paper_size' => $request->paper_size ?? 'A4',
            'orientation' => $request->orientation ?? 'landscape',
            'font_size' => $request->font_size ?? '10pt',
            'is_excel' => false
        ]);

        return $pdf->setPaper($request->paper_size ?? 'A4', $request->orientation ?? 'landscape')
                   ->stream('alur_kas.pdf');
    }

    public function exportAlurKasExcel(Request $request, $id)
    {
        $penganggaran = ($this->Penganggaran)::with('sekolah')->findOrFail($id);
        $penganggaran->setAttribute('sumber_dana', \App\Config\VariantConfig::title($this->variant));
        
        $rkasData = ($this->Rkas)::with(['kodeKegiatan', 'rekeningBelanja'])
            ->where(VariantConfig::penganggaranFk($this->variant), $id)
            ->orderBy('kode_id')
            ->get()
            ->groupBy(function ($item) {
                return optional($item->kodeKegiatan)->kode;
            })
            ->filter(fn($group, $key) => !is_null($key));
            
        $tahapanData = $this->kelolaDataRkas($rkasData);

        $html = view('laporan.alur_kas', [
            'anggaran' => $penganggaran->toArray(),
            'tahapanData' => $tahapanData,
            'paper_size' => $request->paper_size ?? 'A4',
            'orientation' => $request->orientation ?? 'landscape',
            'font_size' => $request->font_size ?? '10pt',
            'is_excel' => true
        ])->render();

        return response($html)
            ->header('Content-Type', 'application/vnd.ms-excel')
            ->header('Content-Disposition', 'attachment; filename="alur_kas_' . $penganggaran->tahun_anggaran . '.xls"');
    }

    public function exportRpPdf(Request $request, $id)
    {
        $penganggaran = ($this->Penganggaran)::with('sekolah')->findOrFail($id);
        $penganggaran->setAttribute('sumber_dana', \App\Config\VariantConfig::title($this->variant));
        
        $rkasData = ($this->Rkas)::with(['kodeKegiatan', 'rekeningBelanja'])
            ->where(VariantConfig::penganggaranFk($this->variant), $id)
            ->orderBy('kode_id')
            ->get()
            ->groupBy(function ($item) {
                return optional($item->kodeKegiatan)->kode;
            })
            ->filter(fn($group, $key) => !is_null($key));
            
        $tahapanData = $this->kelolaDataRkas($rkasData);

        $tahap = $request->tahap ?? 1;
        $bulan = $request->bulan ?? 'Semua';
        $kwitansiMap = $this->getKwitansiMap($id);

        $pdf = Pdf::loadView('laporan.rincian_pencairan', [
            'anggaran' => $penganggaran->toArray(),
            'tahapanData' => $tahapanData,
            'tahap' => $tahap,
            'bulan' => $bulan,
            'kwitansiMap' => $kwitansiMap,
            'paper_size' => $request->paper_size ?? 'A4',
            'orientation' => $request->orientation ?? 'landscape',
            'font_size' => $request->font_size ?? '10pt',
            'is_excel' => false
        ])->setPaper($request->paper_size ?? 'A4', $request->orientation ?? 'landscape');

        $filename_bulan = $bulan !== 'Semua' ? '_' . strtolower($bulan) : '';
        return $pdf->stream('rincian_pencairan_tahap' . $tahap . $filename_bulan . '_' . $penganggaran->tahun_anggaran . '.pdf');
    }

    public function exportRpExcel(Request $request, $id)
    {
        $penganggaran = ($this->Penganggaran)::with('sekolah')->findOrFail($id);
        $penganggaran->setAttribute('sumber_dana', \App\Config\VariantConfig::title($this->variant));
        
        $rkasData = ($this->Rkas)::with(['kodeKegiatan', 'rekeningBelanja'])
            ->where(VariantConfig::penganggaranFk($this->variant), $id)
            ->orderBy('kode_id')
            ->get()
            ->groupBy(function ($item) {
                return optional($item->kodeKegiatan)->kode;
            })
            ->filter(fn($group, $key) => !is_null($key));
            
        $tahapanData = $this->kelolaDataRkas($rkasData);

        $tahap = $request->tahap ?? 1;
        $bulan = $request->bulan ?? 'Semua';
        $kwitansiMap = $this->getKwitansiMap($id);

        $html = view('laporan.rincian_pencairan_excel', [
            'anggaran' => $penganggaran->toArray(),
            'tahapanData' => $tahapanData,
            'tahap' => $tahap,
            'bulan' => $bulan,
            'kwitansiMap' => $kwitansiMap,
            'is_excel' => true
        ])->render();

        $filename_bulan = $bulan !== 'Semua' ? '_' . strtolower($bulan) : '';
        return response($html)
            ->header('Content-Type', 'application/vnd.ms-excel')
            ->header('Content-Disposition', 'attachment; filename="rincian_pencairan_tahap' . $tahap . $filename_bulan . '_' . $penganggaran->tahun_anggaran . '.xls"');
    }

    public function updateRincianPencairan(Request $request, $id)
    {
        $request->validate([
            'uraian' => 'required|string',
            'kode_rekening_id' => 'required|exists:rekening_belanjas,id',
            'nama_penerima' => 'nullable|string',
            'jabatan' => 'nullable|string',
            'nomor_rekening' => 'nullable|string',
            'bank' => 'nullable|string',
            'ada_npwp' => 'boolean',
            'pot_ppn' => 'nullable|numeric',
            'pot_pph23' => 'nullable|numeric',
            'pot_pph21' => 'nullable|numeric',
            'status_penerima' => 'nullable|in:pns,non_asn',
            'golongan' => 'nullable|in:I,II,III,IV',
        ]);

        $updateData = [
            'nama_penerima' => $request->nama_penerima,
            'jabatan' => $request->jabatan,
            'nomor_rekening' => $request->nomor_rekening,
            'bank' => $request->bank,
            'ada_npwp' => $request->ada_npwp ? 1 : 0,
            'pot_ppn' => $request->pot_ppn,
            'pot_pph23' => $request->pot_pph23,
            'pot_pph21' => $request->pot_pph21,
            'status_penerima' => $request->status_penerima,
            'golongan' => $request->golongan,
        ];

        // Tentukan bulan mana yang akan diupdate
        $monthsToUpdate = [];
        if ($request->filled('bulan') && $request->bulan !== 'Semua') {
            $monthsToUpdate = [$request->bulan];
        } else {
            $tahap = $request->input('tahap', 1);
            $monthsToUpdate = $tahap == 1 
                ? ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'] 
                : ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        }

        // 1 & 2. Tentukan baris yang akan diupdate (berdasarkan ID spesifik atau fallback teks uraian)
        $query = ($this->Rkas)::where(\App\Config\VariantConfig::penganggaranFk($this->variant), $id);

        if ($request->has('rkas_ids') && is_array($request->rkas_ids) && count($request->rkas_ids) > 0) {
            $query->whereIn('id', $request->rkas_ids)
                  ->whereIn('bulan', $monthsToUpdate)
                  ->orderBy('id', 'asc');
        } else {
            // Fallback ke pencocokan teks jika rkas_ids tidak dikirim dari frontend lama
            $originalUraians = ($this->Rkas)::where(\App\Config\VariantConfig::penganggaranFk($this->variant), $id)
                ->where('kode_rekening_id', $request->kode_rekening_id)
                ->where(function($q) use ($request) {
                    $q->whereRaw('TRIM(uraian) = TRIM(?)', [$request->uraian])
                      ->orWhereRaw('TRIM(uraian_gabungan) = TRIM(?)', [$request->uraian]);
                })
                ->pluck('uraian')
                ->toArray();

            if (empty($originalUraians)) {
                return redirect()->back(); // Tidak ditemukan
            }

            $query->where('kode_rekening_id', $request->kode_rekening_id)
                  ->whereIn('uraian', $originalUraians)
                  ->whereIn('bulan', $monthsToUpdate)
                  ->orderBy('id', 'asc');
        }

        $itemsToUpdate = $query->get();
            
            if ($itemsToUpdate->count() > 0) {
                // Calculate total pagu for these items to distribute taxes proportionally
                $totalPagu = $itemsToUpdate->sum(function($item) {
                    return $item->jumlah * $item->harga_satuan;
                });
                
                $totalPpn = $request->pot_ppn ?? 0;
                $totalPph23 = $request->pot_pph23 ?? 0;
                $totalPph21 = $request->pot_pph21 ?? 0;
                
                $distributedPpn = 0;
                $distributedPph23 = 0;
                $distributedPph21 = 0;
                
                $lastIndex = $itemsToUpdate->count() - 1;
                
                foreach ($itemsToUpdate as $index => $item) {
                    $itemUpdate = $updateData; // Assign non-tax fields
                    
                    if ($totalPagu > 0) {
                        if ($index === $lastIndex) {
                            // Give the exact remainder to the last item to avoid rounding errors
                            $itemUpdate['pot_ppn'] = $totalPpn - $distributedPpn;
                            $itemUpdate['pot_pph23'] = $totalPph23 - $distributedPph23;
                            $itemUpdate['pot_pph21'] = $totalPph21 - $distributedPph21;
                        } else {
                            $ratio = ($item->jumlah * $item->harga_satuan) / $totalPagu;
                            $itemUpdate['pot_ppn'] = round($totalPpn * $ratio);
                            $itemUpdate['pot_pph23'] = round($totalPph23 * $ratio);
                            $itemUpdate['pot_pph21'] = round($totalPph21 * $ratio);
                            
                            $distributedPpn += $itemUpdate['pot_ppn'];
                            $distributedPph23 += $itemUpdate['pot_pph23'];
                            $distributedPph21 += $itemUpdate['pot_pph21'];
                        }
                    } else {
                        // Fallback if totalPagu is 0 (unlikely)
                        if ($index > 0) {
                            $itemUpdate['pot_ppn'] = 0;
                            $itemUpdate['pot_pph23'] = 0;
                            $itemUpdate['pot_pph21'] = 0;
                        }
                    }
                    
                    $item->update($itemUpdate);
                }
            }

        return redirect()->back()->with('success', 'Rincian pencairan berhasil disimpan.');
    }

    public function gabungRincian(Request $request, $id)
    {
        $request->validate([
            'new_uraian' => 'required|string|max:255',
            'rkas_ids' => 'required|array|min:1',
            'rkas_ids.*' => 'integer'
        ]);

        $penganggaran = ($this->Penganggaran)::findOrFail($id);

        DB::beginTransaction();
        try {
            // Update uraian_gabungan ONLY for the exact selected records
            ($this->Rkas)::where(\App\Config\VariantConfig::penganggaranFk($this->variant), $penganggaran->id)
                ->whereIn('id', $request->rkas_ids)
                ->update(['uraian_gabungan' => $request->new_uraian]);

            DB::commit();
            return redirect()->back()->with('success', 'Kegiatan berhasil digabung.');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->withErrors(['message' => 'Gagal menggabung kegiatan: ' . $e->getMessage()]);
        }
    }

    public function editGabungRincian(Request $request, $id)
    {
        $request->validate([
            'new_uraian_gabungan' => 'required|string|max:255',
            'rkas_ids' => 'required|array|min:1',
            'rkas_ids.*' => 'integer'
        ]);

        $penganggaran = ($this->Penganggaran)::findOrFail($id);

        DB::beginTransaction();
        try {
            $firstItem = ($this->Rkas)::where('id', $request->rkas_ids[0])->first();
            $oldUraianGabungan = $firstItem->uraian_gabungan;
            $kodeRekeningId = $firstItem->kode_rekening_id;

            if (!empty($oldUraianGabungan)) {
                // Update in Rkas
                ($this->Rkas)::where(\App\Config\VariantConfig::penganggaranFk($this->variant), $penganggaran->id)
                    ->where('kode_rekening_id', $kodeRekeningId)
                    ->where('uraian_gabungan', $oldUraianGabungan)
                    ->update(['uraian_gabungan' => $request->new_uraian_gabungan]);

                // Update in RkasPerubahan if it exists
                if ($this->RkasPerubahan && class_exists($this->RkasPerubahan)) {
                    ($this->RkasPerubahan)::where(\App\Config\VariantConfig::penganggaranFk($this->variant), $penganggaran->id)
                        ->where('kode_rekening_id', $kodeRekeningId)
                        ->where('uraian_gabungan', $oldUraianGabungan)
                        ->update(['uraian_gabungan' => $request->new_uraian_gabungan]);
                }
            } else {
                ($this->Rkas)::where(\App\Config\VariantConfig::penganggaranFk($this->variant), $penganggaran->id)
                    ->where('kode_rekening_id', $kodeRekeningId)
                    ->where('uraian', $firstItem->uraian)
                    ->whereNull('uraian_gabungan')
                    ->update(['uraian_gabungan' => $request->new_uraian_gabungan]);

                if ($this->RkasPerubahan && class_exists($this->RkasPerubahan)) {
                    ($this->RkasPerubahan)::where(\App\Config\VariantConfig::penganggaranFk($this->variant), $penganggaran->id)
                        ->where('kode_rekening_id', $kodeRekeningId)
                        ->where('uraian', $firstItem->uraian)
                        ->whereNull('uraian_gabungan')
                        ->update(['uraian_gabungan' => $request->new_uraian_gabungan]);
                }
            }

            DB::commit();
            return redirect()->back()->with('success', 'Nama gabungan berhasil diubah.');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->withErrors(['message' => 'Gagal mengubah nama gabungan: ' . $e->getMessage()]);
        }
    }

    public function ungabungRincian(Request $request, $id)
    {
        $request->validate([
            'rkas_ids' => 'required|array|min:1',
            'rkas_ids.*' => 'integer'
        ]);

        $penganggaran = ($this->Penganggaran)::findOrFail($id);

        DB::beginTransaction();
        try {
            $firstItem = ($this->Rkas)::whereIn('id', $request->rkas_ids)->first();
            
            if ($firstItem && !empty($firstItem->uraian_gabungan)) {
                $oldUraianGabungan = $firstItem->uraian_gabungan;
                $kodeRekeningId = $firstItem->kode_rekening_id;

                ($this->Rkas)::where(\App\Config\VariantConfig::penganggaranFk($this->variant), $penganggaran->id)
                    ->where('kode_rekening_id', $kodeRekeningId)
                    ->where('uraian_gabungan', $oldUraianGabungan)
                    ->update([
                        'uraian_gabungan' => null,
                        'pot_ppn' => null,
                        'pot_pph23' => null,
                        'pot_pph21' => null,
                        'pot_pph21_narasumber' => null,
                    ]);
                    
                if ($this->RkasPerubahan && class_exists($this->RkasPerubahan)) {
                    ($this->RkasPerubahan)::where(\App\Config\VariantConfig::penganggaranFk($this->variant), $penganggaran->id)
                        ->where('kode_rekening_id', $kodeRekeningId)
                        ->where('uraian_gabungan', $oldUraianGabungan)
                        ->update([
                            'uraian_gabungan' => null,
                            'pot_ppn' => null,
                            'pot_pph23' => null,
                            'pot_pph21' => null,
                            'pot_pph21_narasumber' => null,
                        ]);
                }
            }

            DB::commit();
            return redirect()->back()->with('success', 'Gabungan kegiatan berhasil dipisahkan.');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->withErrors(['message' => 'Gagal memisahkan kegiatan: ' . $e->getMessage()]);
        }
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
