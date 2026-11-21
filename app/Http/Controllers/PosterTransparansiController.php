<?php

namespace App\Http\Controllers;

use App\Config\VariantConfig;
use App\Services\TransparansiPosterService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class PosterTransparansiController extends Controller
{
    public function __construct(private readonly TransparansiPosterService $posterService) {}

    /**
     * Halaman utama Studio Poster Infografis Transparansi BOSP (variant-aware).
     */
    public function index(Request $request): InertiaResponse
    {
        $variant = $this->resolveVariant();
        [$tahun, $periode] = $this->parseQueryParams($request);

        return $this->renderVariant('FiturPelengkap/PosterTransparansi/Index', $variant, [
            'posterData' => $this->posterService->buildPosterData($variant, $tahun, $periode),
        ]);
    }

    /**
     * Endpoint JSON untuk mengganti Tahun Anggaran / Periode secara instan tanpa full page reload.
     */
    public function data(Request $request): JsonResponse
    {
        $variant = $this->resolveVariant();
        [$tahun, $periode] = $this->parseQueryParams($request);

        return response()->json([
            'success' => true,
            'data' => $this->posterService->buildPosterData($variant, $tahun, $periode),
        ]);
    }

    /**
     * @param  array<string, mixed>  $props
     */
    protected function renderVariant(string $page, string $variant, array $props = []): InertiaResponse
    {
        return Inertia::render(VariantConfig::pagePrefix($variant).$page, array_merge([
            'variant' => $variant,
            'routePrefix' => VariantConfig::routePrefix($variant),
        ], $props));
    }

    /**
     * @return array{0: int|null, 1: string}
     */
    protected function parseQueryParams(Request $request): array
    {
        $rawTahun = $request->query('tahun');
        $tahun = is_scalar($rawTahun) && is_numeric($rawTahun) ? (int) $rawTahun : null;

        $rawPeriode = $request->query('periode', 'tahunan');
        $periode = is_string($rawPeriode) ? $rawPeriode : 'tahunan';

        return [$tahun, $periode];
    }

    protected function resolveVariant(): string
    {
        $bound = app()->bound('variant') ? app('variant') : VariantConfig::REGULER;

        return VariantConfig::isValid((string) $bound) ? (string) $bound : VariantConfig::REGULER;
    }
}
