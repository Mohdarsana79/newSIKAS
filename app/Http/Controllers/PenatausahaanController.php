<?php

namespace App\Http\Controllers;

use App\Models\Penganggaran;
use App\Models\Rkas;
use App\Models\PenerimaanDana;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class PenatausahaanController extends Controller
{
    public function bku($id, $bulan)
    {
        $penganggaran = Penganggaran::findOrFail($id);

        return Inertia::render('Penatausahaan/Bku', [
            'bulan' => $bulan,
            'tahun' => $penganggaran->tahun_anggaran,
            'penganggaran' => $penganggaran
        ]);
    }

    public function index(Request $request)
    {
        // Ambil semua tahun yang ada
        $tahunList = Penganggaran::distinct()
            ->orderBy('tahun_anggaran', 'desc')
            ->pluck('tahun_anggaran')
            ->toArray();

        // Ambil semua data penganggaran dengan relasi yang diperlukan
        $penganggaranList = Penganggaran::with(['penerimaanDanas']) // Pastikan relasi ini dimuat
            ->orderBy('tahun_anggaran', 'desc')
            ->get();

        // Siapkan data status untuk setiap tahun
        $statusPerTahun = [];
        foreach ($penganggaranList as $penganggaran) {
            $statusPerTahun[$penganggaran->tahun_anggaran] = $penganggaran->getBulanStatus();
            $penganggaran->has_tahap_2 = $penganggaran->penerimaanDanas->contains('sumber_dana', 'Bosp Reguler Tahap 2');
        }

        return Inertia::render('Penatausahaan/Index', [
            'tahunList' => $tahunList,
            'penganggaranList' => $penganggaranList,
            'statusPerTahun' => $statusPerTahun,
            'tahun' => !empty($tahunList) ? $tahunList[0] : date('Y')
        ]);
    }

    public function getPenganggaranId(Request $request)
    {
        $tahun = $request->query('tahun');

        Log::info('getPenganggaranId called with tahun: ' . $tahun);

        if (!$tahun) {
            return response()->json([
                'error' => 'Parameter tahun diperlukan'
            ], 400);
        }

        try {
            // Cari penganggaran berdasarkan tahun
            $penganggaran = Penganggaran::where('tahun_anggaran', $tahun)->first();

            if ($penganggaran) {
                return response()->json([
                    'penganggaran_id' => $penganggaran->id,
                    'tahun_anggaran' => $penganggaran->tahun_anggaran
                ]);
            } else {
                return response()->json([
                    'error' => 'Data penganggaran tidak ditemukan untuk tahun ' . $tahun
                ], 404);
            }
        } catch (\Exception $e) {
            Log::error('Error in getPenganggaranId: ' . $e->getMessage());
            return response()->json([
                'error' => 'Terjadi kesalahan server: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getByPenganggaran($penganggaran_id)
    {
        try {
            Log::info('getByPenganggaran called with ID: ' . $penganggaran_id);

            // Pastikan penganggaran_id adalah angka dan valid
            if (!is_numeric($penganggaran_id) || $penganggaran_id <= 0) {
                return response()->json([
                    'error' => 'Invalid penganggaran ID'
                ], 400);
            }

            // Cek apakah penganggaran exists
            $penganggaran = Penganggaran::find($penganggaran_id);
            if (!$penganggaran) {
                return response()->json([
                    'error' => 'Data penganggaran tidak ditemukan'
                ], 404);
            }

            $penerimaanDanas = PenerimaanDana::where('penganggaran_id', $penganggaran_id)
                ->orderBy('tanggal_terima', 'asc')
                ->get();

            Log::info('Penerimaan dana found: ' . $penerimaanDanas->count() . ' records for penganggaran ID: ' . $penganggaran_id);

            return response()->json($penerimaanDanas);
        } catch (\Exception $e) {
            Log::error('Error getting penerimaan dana: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to load data: ' . $e->getMessage()
            ], 500);
        }
    }
}
