<?php

namespace App\Http\Controllers;

use App\Config\VariantConfig;
use App\Models\RkasItemReview;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RkasReviewController extends Controller
{
    /**
     * Store or update review for a specific RKAS item (Kepala Sekolah).
     */
    public function store(Request $request)
    {
        $user = Auth::user();

        if (! $user || ! $user->hasFeatureAbility('rkas_review')) {
            return response()->json([
                'success' => false,
                'message' => 'Akun Anda tidak memiliki izin untuk memberikan telaah belanja.',
            ], 403);
        }

        $validated = $request->validate([
            'reviewable_type' => 'required|string',
            'reviewable_id' => 'required|integer',
            'status' => 'required|string|in:disetujui,perlu_revisi',
            'catatan' => 'nullable|string',
        ]);

        // Allowed: reviewable_type must be an Eloquent model class
        if (! class_exists($validated['reviewable_type'])) {
            return response()->json([
                'success' => false,
                'message' => 'Tipe item belanja tidak valid.',
            ], 422);
        }

        $itemModel = ($validated['reviewable_type'])::find($validated['reviewable_id']);
        if ($itemModel && $this->isItemFullySpent($itemModel)) {
            return response()->json([
                'success' => false,
                'message' => 'Belanja ini sudah terealisasi penuh pada BKU sehingga tidak dapat ditelaah.',
            ], 422);
        }

        $review = RkasItemReview::updateOrCreate(
            [
                'reviewable_type' => $validated['reviewable_type'],
                'reviewable_id' => $validated['reviewable_id'],
            ],
            [
                'user_id' => $user->id,
                'status' => $validated['status'],
                'catatan' => $validated['catatan'],
            ]
        );

        $review->load('user:id,name,role');

        return response()->json([
            'success' => true,
            'message' => 'Telaah belanja berhasil disimpan.',
            'review' => $review,
        ]);
    }

    /**
     * Resubmit fixed item review by Bendahara to Kepala Sekolah.
     */
    public function resubmit(Request $request, $id)
    {
        $user = Auth::user();

        if (! $user || ! $user->canAccessModule('penganggaran', 'write')) {
            return response()->json([
                'success' => false,
                'message' => 'Hanya pengelola Penganggaran yang dapat mengajukan kembali perbaikan belanja.',
            ], 403);
        }

        $validated = $request->validate([
            'tanggapan_bendahara' => 'nullable|string|max:1000',
        ]);

        $review = RkasItemReview::findOrFail($id);

        if ($review->reviewable && $this->isItemFullySpent($review->reviewable)) {
            return response()->json([
                'success' => false,
                'message' => 'Belanja ini sudah terealisasi penuh pada BKU.',
            ], 422);
        }

        $review->update([
            'status' => 'sudah_diperbaiki',
            'tanggapan_bendahara' => $validated['tanggapan_bendahara'] ?? null,
            'revisi_diajukan_at' => now(),
        ]);

        $review->load('user:id,name,role');

        return response()->json([
            'success' => true,
            'message' => 'Perbaikan belanja berhasil diajukan kembali kepada Kepala Sekolah.',
            'review' => $review,
        ]);
    }

    /**
     * Delete review.
     */
    public function destroy($id)
    {
        $user = Auth::user();

        if (! $user || ! $user->hasFeatureAbility('rkas_review')) {
            return response()->json([
                'success' => false,
                'message' => 'Akun Anda tidak memiliki izin untuk menghapus telaah belanja.',
            ], 403);
        }

        $review = RkasItemReview::findOrFail($id);

        if ($review->reviewable && $this->isItemFullySpent($review->reviewable)) {
            return response()->json([
                'success' => false,
                'message' => 'Belanja ini sudah terealisasi penuh pada BKU sehingga telaah tidak dapat dihapus.',
            ], 422);
        }

        $review->delete();

        return response()->json([
            'success' => true,
            'message' => 'Telaah belanja berhasil dihapus.',
        ]);
    }

    /**
     * Check whether the given RKAS / RKAS Perubahan item has been fully spent in BKU (dibelanjakan >= jumlah).
     */
    protected function isItemFullySpent($item): bool
    {
        $variant = app()->bound('variant') ? app('variant') : 'reguler';
        $penganggaranFk = VariantConfig::penganggaranFk($variant);
        $penganggaranId = $item->{$penganggaranFk} ?? null;

        if (! $penganggaranId || (int) $item->jumlah <= 0) {
            return false;
        }

        $bkuClass = VariantConfig::getModelClass('bku', $variant);
        $bkuDetailClass = VariantConfig::getModelClass('bku_uraian_detail', $variant);
        $bkuTable = (new $bkuClass)->getTable();
        $bkuDetailTable = (new $bkuDetailClass)->getTable();
        $bkuFk = VariantConfig::bkuFk($variant);

        $totalSpent = (float) $bkuDetailClass::join($bkuTable, "{$bkuTable}.id", '=', "{$bkuDetailTable}.{$bkuFk}")
            ->where("{$bkuTable}.{$penganggaranFk}", $penganggaranId)
            ->where("{$bkuDetailTable}.kode_kegiatan_id", $item->kode_id)
            ->where("{$bkuDetailTable}.rekening_belanja_id", $item->kode_rekening_id)
            ->whereRaw("LOWER(TRIM({$bkuDetailTable}.uraian)) = ?", [strtolower(trim((string) $item->uraian))])
            ->where("{$bkuDetailTable}.harga_satuan", $item->harga_satuan)
            ->sum("{$bkuDetailTable}.volume");

        if ($totalSpent <= 0) {
            return false;
        }

        $modelClass = get_class($item);
        $monthMap = array_flip(method_exists($modelClass, 'getBulanList') ? $modelClass::getBulanList() : [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
        ]);

        $groupItems = $modelClass::where($penganggaranFk, $penganggaranId)
            ->where('kode_id', $item->kode_id)
            ->where('kode_rekening_id', $item->kode_rekening_id)
            ->whereRaw('LOWER(TRIM(uraian)) = ?', [strtolower(trim((string) $item->uraian))])
            ->where('harga_satuan', $item->harga_satuan)
            ->get()
            ->sortBy(fn ($row) => $monthMap[$row->bulan] ?? 99);

        $remaining = $totalSpent;
        foreach ($groupItems as $row) {
            $allocated = $remaining > 0 ? min($remaining, (float) $row->jumlah) : 0;
            $remaining -= $allocated;

            if ((int) $row->id === (int) $item->id) {
                return $allocated >= (float) $item->jumlah;
            }
        }

        return false;
    }
}
