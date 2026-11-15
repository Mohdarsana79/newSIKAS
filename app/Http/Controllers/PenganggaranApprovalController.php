<?php

namespace App\Http\Controllers;

use App\Config\VariantConfig;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PenganggaranApprovalController extends Controller
{
    protected string $variant;

    public function __construct()
    {
        $this->middleware(function ($request, $next) {
            $this->variant = app()->bound('variant') ? app('variant') : 'reguler';

            return $next($request);
        });
    }

    /**
     * Berikan stempel persetujuan penganggaran RKAS oleh Kepala Sekolah.
     */
    public function approve(Request $request, $id)
    {
        $user = Auth::user();

        if (! $user || ! $user->isKepalaSekolah()) {
            abort(403, 'Hanya Kepala Sekolah yang memiliki wewenang untuk menyetujui anggaran.');
        }

        $modelClass = VariantConfig::getModelClass('penganggaran', $this->variant);
        $penganggaran = $modelClass::findOrFail($id);

        $validated = $request->validate([
            'catatan_persetujuan' => 'nullable|string|max:1000',
        ]);

        $penganggaran->update([
            'status_persetujuan' => 'disetujui',
            'persetujuan_oleh' => $user->id,
            'tanggal_persetujuan' => now(),
            'catatan_persetujuan' => $validated['catatan_persetujuan'] ?? null,
        ]);

        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'RKAS berhasil disetujui.',
                'penganggaran' => $penganggaran->fresh(['persetujuanUser:id,name,role']),
            ]);
        }

        return redirect()->back()->with('success', 'Penganggaran RKAS berhasil disahkan / disetujui oleh Kepala Sekolah.');
    }

    /**
     * Batalkan status persetujuan penganggaran RKAS.
     */
    public function unapprove(Request $request, $id)
    {
        $user = Auth::user();

        if (! $user || ! $user->isKepalaSekolah()) {
            abort(403, 'Hanya Kepala Sekolah yang memiliki wewenang untuk membatalkan persetujuan anggaran.');
        }

        $modelClass = VariantConfig::getModelClass('penganggaran', $this->variant);
        $penganggaran = $modelClass::findOrFail($id);

        $penganggaran->update([
            'status_persetujuan' => 'draft',
            'persetujuan_oleh' => null,
            'tanggal_persetujuan' => null,
            'catatan_persetujuan' => null,
        ]);

        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Persetujuan RKAS berhasil dibatalkan.',
                'penganggaran' => $penganggaran->fresh(),
            ]);
        }

        return redirect()->back()->with('success', 'Persetujuan RKAS berhasil dibatalkan.');
    }
}
