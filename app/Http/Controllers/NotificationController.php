<?php

namespace App\Http\Controllers;

use App\Config\PermissionCatalog;
use App\Config\VariantConfig;
use App\Services\SmartNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function __construct(private readonly SmartNotificationService $notifications) {}

    /**
     * Mengambil feed notifikasi terpadu (Workflow Bendahara <-> Kepala Sekolah + Pajak 4 Varian BOSP).
     */
    public function getUnifiedNotifications(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['success' => false, 'message' => 'Tidak terautentikasi.'], 401);
        }

        try {
            return response()->json([
                'success' => true,
                'data' => $this->notifications->getUnifiedFeed($user),
            ]);
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'success' => false,
                'message' => 'Gagal memuat notifikasi terpadu.',
            ], 500);
        }
    }

    /**
     * Menandai satu notifikasi (workflow DB atau setor_pajak) sebagai dibaca untuk user login.
     */
    public function markAsRead(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['success' => false, 'message' => 'Tidak terautentikasi.'], 401);
        }

        $validated = $request->validate([
            'db_id' => ['nullable', 'integer', 'min:1'],
            'notification_key' => ['nullable', 'string', 'max:140', 'regex:'.SmartNotificationService::DISMISS_KEY_REGEX],
        ]);

        $dbId = isset($validated['db_id']) ? (int) $validated['db_id'] : null;
        $key = isset($validated['notification_key']) ? (string) $validated['notification_key'] : null;

        if ($dbId === null && $key === null) {
            return response()->json([
                'success' => false,
                'message' => 'Target notifikasi wajib disertakan.',
            ], 422);
        }

        if ($key !== null && ! $user->canAccessModule('penatausahaan', PermissionCatalog::LEVEL_READ)) {
            return response()->json([
                'success' => false,
                'message' => 'Akses ditolak. Akun Anda tidak memiliki izin untuk notifikasi pajak.',
            ], 403);
        }

        $updated = $this->notifications->markAsRead($user, $dbId, $key);

        return response()->json([
            'success' => true,
            'updated' => $updated,
        ]);
    }

    /**
     * Menandai seluruh notifikasi yang dapat dibaca (workflow DB + setor_pajak) sebagai dibaca.
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['success' => false, 'message' => 'Tidak terautentikasi.'], 401);
        }

        $validated = $request->validate([
            'category' => ['nullable', 'string', 'in:all,workflow,pajak'],
        ]);

        $category = (string) ($validated['category'] ?? 'all');
        $markedCount = $this->notifications->markAllAsRead($user, $category);

        return response()->json([
            'success' => true,
            'marked_count' => $markedCount,
        ]);
    }

    /**
     * Endpoint pajak lama (kompatibilitas mundur): kini juga mendukung parameter varian BOSP.
     */
    public function getPajakNotifications(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user || ! $user->canAccessModule('penatausahaan', PermissionCatalog::LEVEL_READ)) {
            return response()->json([
                'success' => false,
                'message' => 'Akses ditolak. Akun Anda tidak memiliki izin melihat data pajak.',
            ], 403);
        }

        $variant = $this->resolveRequestedVariant($request);

        try {
            return response()->json([
                'success' => true,
                'data' => $this->notifications->getPajakSummaryForVariant($variant),
            ]);
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil notifikasi pajak.',
            ], 500);
        }
    }

    /**
     * Mengambil detail transaksi pajak berdasarkan tipe, bulan, tahun, dan varian BOSP.
     */
    public function getPajakDetails(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user || ! $user->canAccessModule('penatausahaan', PermissionCatalog::LEVEL_READ)) {
            return response()->json([
                'success' => false,
                'message' => 'Akses ditolak. Akun Anda tidak memiliki izin melihat rincian pajak.',
            ], 403);
        }

        $type = (string) $request->input('type', '');
        $month = (int) $request->input('month', 0);
        $year = (int) $request->input('year', 0);

        if (! in_array($type, ['terima_pajak', 'setor_pajak'], true)) {
            return response()->json(['success' => false, 'message' => 'Tipe tidak valid'], 400);
        }

        if ($month < 1 || $month > 12 || $year < 2000 || $year > 2100) {
            return response()->json(['success' => false, 'message' => 'Periode bulan atau tahun tidak valid'], 400);
        }

        $variant = $this->resolveRequestedVariant($request);

        try {
            $details = $this->notifications->getPajakDetailsForVariant($variant, $type, $month, $year);

            return response()->json([
                'success' => true,
                'data' => $details,
                'month_name' => SmartNotificationService::bulanName($month),
                'year' => $year,
                'variant' => $variant,
                'variant_label' => SmartNotificationService::variantLabel($variant),
            ]);
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil detail pajak.',
            ], 500);
        }
    }

    protected function resolveRequestedVariant(Request $request): string
    {
        $requested = $request->input('variant');
        if (is_string($requested) && in_array($requested, VariantConfig::VARIANTS, true)) {
            return $requested;
        }

        $bound = app()->bound('variant') ? app('variant') : VariantConfig::REGULER;

        return in_array($bound, VariantConfig::VARIANTS, true) ? $bound : VariantConfig::REGULER;
    }
}
