<?php

namespace App\Http\Controllers;

use App\Models\RkasItemReview;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RkasReviewController extends Controller
{
    /**
     * Store or update review for a specific RKAS item.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'reviewable_type' => 'required|string',
            'reviewable_id' => 'required|integer',
            'status' => 'required|string|in:disetujui,perlu_revisi',
            'catatan' => 'nullable|string',
        ]);

        $user = Auth::user();

        // Allowed: reviewable_type must be an Eloquent model class
        if (! class_exists($validated['reviewable_type'])) {
            return response()->json([
                'success' => false,
                'message' => 'Tipe item belanja tidak valid.',
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
     * Delete review.
     */
    public function destroy($id)
    {
        $review = RkasItemReview::findOrFail($id);
        $review->delete();

        return response()->json([
            'success' => true,
            'message' => 'Telaah belanja berhasil dihapus.',
        ]);
    }
}
