<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Sts;
use App\Models\Penganggaran;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class StsController extends Controller
{
    // Index - Menampilkan semua data STS
    public function index()
    {
        $sts = Sts::with('penganggaran')
            ->orderBy('created_at', 'desc')
            ->get();

        // Format data untuk view
        $formattedSts = $sts->map(function ($item) {
            $sisa = $item->jumlah_sts - $item->jumlah_bayar;

            // Tentukan status
            if ($item->jumlah_bayar == 0) {
                $status = 'Menunggu';
                $badge = 'badge-pending';
            } elseif ($sisa > 0) {
                $status = 'Parsial';
                $badge = 'badge-partial';
            } else {
                $status = 'Lunas';
                $badge = 'badge-paid';
            }

            return [
                'id' => $item->id,
                'nomor_sts' => $item->nomor_sts,
                'tahun' => $item->penganggaran ? $item->penganggaran->tahun_anggaran : '-',
                'jumlah_sts' => $item->jumlah_sts, // Keep raw number for frontend formatting flexibility or format here
                'jumlah_bayar' => $item->jumlah_bayar,
                'jumlah_sts_formatted' => number_format($item->jumlah_sts, 0, ',', '.'),
                'jumlah_bayar_formatted' => number_format($item->jumlah_bayar, 0, ',', '.'),
                'tanggal_bayar' => $item->tanggal_bayar ? $item->tanggal_bayar->format('Y-m-d') : null,
                'tanggal_bayar_formatted' => $item->tanggal_bayar ? $item->tanggal_bayar->format('d/m/Y') : '-',
                'status' => $status,
                'badge' => $badge,
                'sisa' => $sisa,
                'sisa_formatted' => number_format($sisa, 0, ',', '.'),
                'penganggaran_id' => $item->penganggaran_id
            ];
        });

        return Inertia::render('Penatausahaan/Sts/Index', [
            'stsList' => $formattedSts,
            'penganggaranList' => Penganggaran::select('id', 'tahun_anggaran')->orderBy('tahun_anggaran', 'desc')->get()
        ]);
    }

    // Store - Menyimpan data STS baru
    public function store(Request $request)
    {
        $validated = $request->validate([
            'penganggaran_id' => 'required|exists:penganggarans,id',
            'nomor_sts' => 'required|string|max:100|unique:status_sts_giros,nomor_sts',
            'jumlah_sts' => 'required|numeric|min:0',
        ]);

        DB::beginTransaction();
        try {
            $sts = Sts::create([
                'penganggaran_id' => $validated['penganggaran_id'],
                'nomor_sts' => $validated['nomor_sts'],
                'jumlah_sts' => $validated['jumlah_sts'],
                'jumlah_bayar' => 0,
            ]);

            DB::commit();
            return redirect()->back()->with('success', 'STS berhasil ditambahkan');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Gagal menambahkan STS: ' . $e->getMessage());
        }
    }

    // Update - Mengupdate data STS
    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'nomor_sts' => 'required|string|max:100|unique:status_sts_giros,nomor_sts,' . $id,
            'jumlah_sts' => 'required|numeric|min:0',
        ]);

        DB::beginTransaction();
        try {
            $sts = Sts::findOrFail($id);

            // Jika mengupdate jumlah STS, validasi bahwa jumlah tidak kurang dari yang sudah dibayar
            if ($request->has('jumlah_sts') && $request->jumlah_sts < $sts->jumlah_bayar) {
                return redirect()->back()->with('error', 'Jumlah STS tidak boleh kurang dari jumlah yang sudah dibayar');
            }

            $sts->update([
                'nomor_sts' => $validated['nomor_sts'],
                'jumlah_sts' => $validated['jumlah_sts'],
            ]);

            DB::commit();
            return redirect()->back()->with('success', 'STS berhasil diupdate');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Gagal mengupdate STS: ' . $e->getMessage());
        }
    }

    // Bayar - Proses pembayaran STS
    public function bayar(Request $request, $id)
    {
        $validated = $request->validate([
            'tanggal_bayar' => 'required|date',
            'jumlah_bayar' => 'required|numeric|min:0',
        ]);

        DB::beginTransaction();
        try {
            $sts = Sts::findOrFail($id);

            $jumlahBisaDibayar = $sts->jumlah_sts - $sts->jumlah_bayar;

            if ($validated['jumlah_bayar'] > $jumlahBisaDibayar) {
                return redirect()->back()->with('error', 'Jumlah pembayaran melebihi sisa tagihan. Sisa yang bisa dibayar: ' . number_format($jumlahBisaDibayar, 0, ',', '.'));
            }

            $sts->update([
                'tanggal_bayar' => $validated['tanggal_bayar'],
                'jumlah_bayar' => $sts->jumlah_bayar + $validated['jumlah_bayar'],
            ]);

            DB::commit();
            return redirect()->back()->with('success', 'Pembayaran berhasil diproses');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Gagal memproses pembayaran: ' . $e->getMessage());
        }
    }

    // Update Bayar - Edit pembayaran
    public function updateBayar(Request $request, $id)
    {
        $validated = $request->validate([
            'tanggal_bayar' => 'required|date',
            'jumlah_bayar' => 'required|numeric|min:0',
        ]);

        DB::beginTransaction();
        try {
            $sts = Sts::findOrFail($id);

            if ($validated['jumlah_bayar'] > $sts->jumlah_sts) {
                return redirect()->back()->with('error', 'Jumlah pembayaran tidak boleh melebihi total STS');
            }

            $sts->update([
                'tanggal_bayar' => $validated['tanggal_bayar'],
                'jumlah_bayar' => $validated['jumlah_bayar'],
            ]);

            DB::commit();
            return redirect()->back()->with('success', 'Pembayaran berhasil diupdate');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Gagal mengupdate pembayaran: ' . $e->getMessage());
        }
    }

    // Destroy - Hapus STS
    public function destroy($id)
    {
        DB::beginTransaction();
        try {
            $sts = Sts::findOrFail($id);
            $sts->delete();

            DB::commit();
            return redirect()->back()->with('success', 'STS berhasil dihapus');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Gagal menghapus STS: ' . $e->getMessage());
        }
    }

    // Get STS by ID untuk modal edit
    public function show($id)
    {
        $sts = Sts::with('penganggaran')->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $sts->id,
                'penganggaran_id' => $sts->penganggaran_id,
                'nomor_sts' => $sts->nomor_sts,
                'jumlah_sts' => $sts->jumlah_sts,
                'jumlah_bayar' => $sts->jumlah_bayar,
                'tahun_anggaran' => $sts->penganggaran ? $sts->penganggaran->tahun_anggaran : null,
            ]
        ]);
    }

    public function getByTahun($tahun)
    {
        $sts = Sts::whereHas('penganggaran', function ($q) use ($tahun) {
            $q->where('tahun_anggaran', $tahun);
        })
        ->orderBy('created_at', 'desc')
        ->get();

        return response()->json([
            'success' => true,
            'data' => $sts->map(function ($item) {
                return [
                    'id' => $item->id,
                    'nomor_sts' => $item->nomor_sts,
                    'jumlah_sts' => $item->jumlah_sts,
                    'jumlah_bayar' => $item->jumlah_bayar,
                    'tanggal_bayar' => $item->tanggal_bayar,
                    'is_checked' => (boolean) $item->is_bkp,
                ];
            })
        ]);
    }

    public function addToBukuBank(Request $request)
    {
        $request->validate([
            'sts_ids' => 'required|array',
            'sts_ids.*' => 'exists:status_sts_giros,id',
            'bulan' => 'required|string', // Bulan context from View
            'tahun' => 'required|string',
            'is_checked' => 'required|boolean' // True to add, False to remove
        ]);

        try {
            DB::beginTransaction();
            
            // Logic:
            // Just updated is_bkp flag.
            
            if ($request->is_checked) {
                 Sts::whereIn('id', $request->sts_ids)->update([
                    'is_bkp' => true
                 ]);
                 $msg = 'STS berhasil ditambahkan ke Buku Bank';
            } else {
                 Sts::whereIn('id', $request->sts_ids)->update([
                    'is_bkp' => false
                 ]);
                 $msg = 'STS berhasil dihapus dari Buku Bank';
            }

            DB::commit();
            return response()->json(['success' => true, 'message' => $msg]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function getAvailableYears()
    {
        $years = Sts::join('penganggarans', 'status_sts_giros.penganggaran_id', '=', 'penganggarans.id')
            ->select('penganggarans.tahun_anggaran')
            ->distinct()
            ->orderBy('penganggarans.tahun_anggaran', 'desc')
            ->pluck('penganggarans.tahun_anggaran');

        return response()->json([
            'success' => true,
            'data' => $years
        ]);
    }
}
