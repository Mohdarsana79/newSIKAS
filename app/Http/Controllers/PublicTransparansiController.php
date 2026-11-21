<?php

namespace App\Http\Controllers;

use App\Config\VariantConfig;
use App\Models\User;
use App\Services\PublicTransparansiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class PublicTransparansiController extends Controller
{
    public function __construct(
        private readonly PublicTransparansiService $transparansiService,
    ) {}

    public function index(Request $request): Response
    {
        $variant = (string) $request->query('variant', VariantConfig::REGULER);
        $tahun = $request->query('tahun') !== null ? (int) $request->query('tahun') : null;
        $periode = (string) $request->query('periode', 'tahunan');

        $hasUsers = false;
        try {
            if (Schema::hasTable('users')) {
                $hasUsers = User::count() > 0;
            }
        } catch (Throwable) {
            $hasUsers = false;
        }

        return Inertia::render('Transparansi/Index', [
            'initialData' => $this->transparansiService->buildOverview($variant, $tahun, $periode),
            'hasUsers' => $hasUsers,
        ]);
    }

    public function data(Request $request): JsonResponse
    {
        $variant = (string) $request->query('variant', VariantConfig::REGULER);
        $tahun = $request->query('tahun') !== null ? (int) $request->query('tahun') : null;
        $periode = (string) $request->query('periode', 'tahunan');

        return response()->json([
            'success' => true,
            'data' => $this->transparansiService->buildOverview($variant, $tahun, $periode),
        ]);
    }

    public function rkaTahapan(Request $request): JsonResponse
    {
        $variant = (string) $request->query('variant', VariantConfig::REGULER);
        $tahun = $request->query('tahun') !== null ? (int) $request->query('tahun') : null;
        $jenis = (string) $request->query('jenis', 'awal');

        return response()->json([
            'success' => true,
            'data' => $this->transparansiService->buildRkaTahapan($variant, $tahun, $jenis),
        ]);
    }
}
