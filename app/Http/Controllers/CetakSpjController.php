<?php

namespace App\Http\Controllers;

use App\Config\VariantConfig;
use App\Models\SekolahProfile;
use App\Models\SpjExternalAttachment;
use App\Models\SpjPrintPreset;
use App\Services\ActivityLogger;
use App\Services\SpjPrintManifestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response;

class CetakSpjController extends Controller
{
    private const MAX_ATTACHMENT_KB = 25600; // 25 MB

    private const MAX_COVER_PHOTO_KB = 3072; // 3 MB

    public function __construct(
        private readonly SpjPrintManifestService $manifestService,
        private readonly ActivityLogger $activityLogger,
    ) {}

    /**
     * Halaman utama Studio Cetak SPJ Terpadu & Cover LPJ Modern (lintas 4 varian BOSP).
     */
    public function index(Request $request): InertiaResponse
    {
        $variant = $this->resolveVariant();
        $params = $this->parseFilterParams($request, $variant);

        return $this->renderVariant('FiturPelengkap/CetakSpj/Index', $variant, [
            'initialManifest' => $this->manifestService->buildManifest(
                variant: $variant,
                tahun: $params['tahun'],
                periodeType: $params['periode_type'],
                bulanAwal: $params['bulan_awal'],
                bulanAkhir: $params['bulan_akhir'],
                paperSize: $params['paper_size'],
                groupingMode: $params['grouping_mode'],
                sp2bMode: $params['sp2b_mode'],
            ),
        ]);
    }

    /**
     * Endpoint JSON untuk memperbarui manifest kesiapan & antrean chunk PDF.
     */
    public function manifest(Request $request): JsonResponse
    {
        $variant = $this->resolveVariant();
        $params = $this->parseFilterParams($request, $variant);

        return response()->json([
            'success' => true,
            'data' => $this->manifestService->buildManifest(
                variant: $variant,
                tahun: $params['tahun'],
                periodeType: $params['periode_type'],
                bulanAwal: $params['bulan_awal'],
                bulanAkhir: $params['bulan_akhir'],
                paperSize: $params['paper_size'],
                groupingMode: $params['grouping_mode'],
                sp2bMode: $params['sp2b_mode'],
            ),
        ]);
    }

    /**
     * Simpan preset konfigurasi Cover LPJ Modern & susunan bendel ke database.
     */
    public function savePreset(Request $request): JsonResponse
    {
        $variant = $this->resolveVariant();

        $validated = $request->validate([
            'tahun_anggaran' => ['nullable', 'integer', 'min:2000', 'max:2100'],
            'nama_preset' => ['nullable', 'string', 'max:100'],
            'cover_config' => ['required', 'array'],
            'bundle_config' => ['required', 'array'],
        ]);

        // Normalisasi & sanitasi terpusat cover_config
        $coverConfig = $this->manifestService->normalizeCoverConfig(
            $validated['cover_config'],
            $variant,
            false,
        );

        $bundleConfig = $validated['bundle_config'];
        if (
            array_key_exists('sp2b_mode', $bundleConfig)
            && ! in_array($bundleConfig['sp2b_mode'], SpjPrintManifestService::ALLOWED_SP2B_MODES, true)
        ) {
            unset($bundleConfig['sp2b_mode']);
        }

        $preset = SpjPrintPreset::query()->updateOrCreate(
            [
                'variant' => $variant,
                'tahun_anggaran' => $validated['tahun_anggaran'] ?? null,
                'nama_preset' => trim((string) ($validated['nama_preset'] ?? 'Default')) ?: 'Default',
            ],
            [
                'cover_config' => $coverConfig,
                'bundle_config' => $bundleConfig,
                'updated_by' => $request->user()?->id,
            ]
        );

        $this->logActivity(
            $request,
            $variant,
            'update',
            'Menyimpan konfigurasi Cover & Bendel Cetak SPJ ('.VariantConfig::title($variant).')',
            Response::HTTP_OK,
        );

        return response()->json([
            'success' => true,
            'message' => 'Konfigurasi Cover & Bendel SPJ berhasil disimpan.',
            'data' => [
                'id' => $preset->id,
                'nama_preset' => $preset->nama_preset,
                'cover_config' => $coverConfig,
                'bundle_config' => $preset->bundle_config,
            ],
        ]);
    }

    /**
     * Unggah foto gedung/lingkungan sekolah bersama untuk Studio Cover (berlaku lintas varian & tahun).
     */
    public function uploadCoverPhoto(Request $request): JsonResponse
    {
        $variant = $this->resolveVariant();

        $validated = $request->validate([
            'photo' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:'.self::MAX_COVER_PHOTO_KB],
            'tahun_anggaran' => ['nullable', 'integer', 'min:2000', 'max:2100'],
        ]);

        $file = $validated['photo'];
        $ext = strtolower($file->getClientOriginalExtension() ?: 'jpg');
        $filename = Str::uuid()->toString().'.'.$ext;
        $path = $file->storeAs('spj_cover_photos/shared', $filename, 'public');

        if (! is_string($path) || $path === '') {
            return response()->json([
                'success' => false,
                'message' => 'Gagal menyimpan foto cover sekolah.',
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        $oldPathsToDelete = [];

        // Simpan ke profil sekolah agar otomatis dipakai bersama lintas 4 varian BOSP & lintas tahun
        $sekolah = SekolahProfile::query()->first();
        if ($sekolah) {
            $oldSekolahPhoto = is_string($sekolah->foto_sekolah)
                ? $this->sanitizeAnyCoverPhotoPath($sekolah->foto_sekolah)
                : null;
            if ($oldSekolahPhoto !== null && $oldSekolahPhoto !== $path) {
                $oldPathsToDelete[] = $oldSekolahPhoto;
            }
            $sekolah->update(['foto_sekolah' => $path]);
        }

        // Perbarui juga preset varian/tahun aktif jika sudah ada
        $tahun = $validated['tahun_anggaran'] ?? null;
        $existingPreset = SpjPrintPreset::query()
            ->where('variant', $variant)
            ->where('tahun_anggaran', $tahun)
            ->where('nama_preset', 'Default')
            ->first();

        if ($existingPreset) {
            $rawOldPath = $existingPreset->cover_config['photo_path'] ?? null;
            $safeOldPath = is_string($rawOldPath) ? $this->sanitizeCoverPhotoPath($rawOldPath, $variant) : null;
            if ($safeOldPath !== null && $safeOldPath !== $path) {
                $oldPathsToDelete[] = $safeOldPath;
            }
            $coverConfig = is_array($existingPreset->cover_config) ? $existingPreset->cover_config : [];
            $coverConfig['photo_path'] = $path;
            $existingPreset->update([
                'cover_config' => $coverConfig,
                'updated_by' => $request->user()?->id,
            ]);
        }

        foreach (array_unique($oldPathsToDelete) as $oldPath) {
            if (Storage::disk('public')->exists($oldPath)) {
                Storage::disk('public')->delete($oldPath);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Foto sekolah untuk Cover berhasil diunggah.',
            'data' => [
                'photo_path' => $path,
                'photo_data_uri' => $this->manifestService->imageToDataUri($path),
            ],
        ]);
    }

    /**
     * Hapus foto sekolah tersimpan dari profil sekolah & preset cover.
     */
    public function deleteCoverPhoto(Request $request): JsonResponse
    {
        $variant = $this->resolveVariant();
        $validated = $request->validate([
            'photo_path' => ['nullable', 'string', 'max:255'],
            'tahun_anggaran' => ['nullable', 'integer', 'min:2000', 'max:2100'],
        ]);

        $pathsToDelete = [];

        if (isset($validated['photo_path']) && is_string($validated['photo_path'])) {
            $safeReqPath = $this->sanitizeCoverPhotoPath($validated['photo_path'], $variant);
            if ($safeReqPath !== null) {
                $pathsToDelete[] = $safeReqPath;
            }
        }

        $sekolah = SekolahProfile::query()->first();
        if ($sekolah && is_string($sekolah->foto_sekolah) && $sekolah->foto_sekolah !== '') {
            $safeSekolahPath = $this->sanitizeAnyCoverPhotoPath($sekolah->foto_sekolah);
            if ($safeSekolahPath !== null) {
                $pathsToDelete[] = $safeSekolahPath;
            }
            $sekolah->update(['foto_sekolah' => null]);
        }

        // Bersihkan photo_path dari seluruh preset yang merujuk pada foto yang dihapus atau preset aktif
        $presets = SpjPrintPreset::query()->get();
        foreach ($presets as $preset) {
            $coverConfig = is_array($preset->cover_config) ? $preset->cover_config : [];
            $presetPhoto = isset($coverConfig['photo_path']) && is_string($coverConfig['photo_path'])
                ? $this->sanitizeAnyCoverPhotoPath($coverConfig['photo_path'])
                : null;

            $isTargetPreset = $preset->variant === $variant
                && $preset->tahun_anggaran === ($validated['tahun_anggaran'] ?? null)
                && $preset->nama_preset === 'Default';

            if ($presetPhoto !== null && ($isTargetPreset || in_array($presetPhoto, $pathsToDelete, true))) {
                $pathsToDelete[] = $presetPhoto;
                unset($coverConfig['photo_path']);
                $preset->update([
                    'cover_config' => $coverConfig,
                    'updated_by' => $request->user()?->id,
                ]);
            } elseif ($isTargetPreset && array_key_exists('photo_path', $coverConfig)) {
                unset($coverConfig['photo_path']);
                $preset->update([
                    'cover_config' => $coverConfig,
                    'updated_by' => $request->user()?->id,
                ]);
            }
        }

        foreach (array_unique($pathsToDelete) as $delPath) {
            if (Storage::disk('public')->exists($delPath)) {
                Storage::disk('public')->delete($delPath);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Foto cover berhasil dihapus.',
        ]);
    }

    /**
     * Unggah lampiran PDF eksternal (SK Tim BOS, Rekening Koran, Bukti Pajak, dll.).
     */
    public function storeAttachment(Request $request): JsonResponse
    {
        $variant = $this->resolveVariant();

        $validated = $request->validate([
            'file' => ['required', 'file', 'mimes:pdf', 'max:'.self::MAX_ATTACHMENT_KB],
            'judul' => ['required', 'string', 'max:180'],
            'kategori' => ['required', 'string', Rule::in(SpjExternalAttachment::KATEGORI_LIST)],
            'tahun_anggaran' => ['required', 'integer', 'min:2000', 'max:2100'],
            'periode_tag' => ['required', 'string', Rule::in(SpjExternalAttachment::PERIODE_TAGS)],
        ]);

        $file = $validated['file'];

        // Validasi ketat magic bytes %PDF-
        $handle = fopen($file->getRealPath(), 'rb');
        $header = $handle ? fread($handle, 5) : '';
        if ($handle) {
            fclose($handle);
        }

        if ($header !== '%PDF-') {
            return response()->json([
                'success' => false,
                'message' => 'Berkas bukan dokumen PDF yang valid (header PDF tidak dikenali).',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $tahun = (int) $validated['tahun_anggaran'];
        $filename = Str::uuid()->toString().'.pdf';
        $relativeDir = "spj_attachments/{$variant}/{$tahun}";
        $storedPath = $file->storeAs($relativeDir, $filename, 'local');

        if (! is_string($storedPath) || $storedPath === '') {
            return response()->json([
                'success' => false,
                'message' => 'Gagal menyimpan file PDF lampiran.',
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        $nextOrder = (int) SpjExternalAttachment::query()
            ->where('variant', $variant)
            ->where('tahun_anggaran', $tahun)
            ->max('sort_order') + 1;

        $attachment = SpjExternalAttachment::query()->create([
            'variant' => $variant,
            'tahun_anggaran' => $tahun,
            'periode_tag' => $validated['periode_tag'],
            'judul' => trim($validated['judul']),
            'kategori' => $validated['kategori'],
            'file_path' => $storedPath,
            'original_filename' => $file->getClientOriginalName(),
            'file_size' => (int) $file->getSize(),
            'sort_order' => $nextOrder,
            'uploaded_by' => $request->user()?->id,
        ]);

        $this->logActivity(
            $request,
            $variant,
            'create',
            "Mengunggah lampiran PDF eksternal '{$attachment->judul}' (".VariantConfig::title($variant)." {$tahun})",
            Response::HTTP_CREATED,
        );

        return response()->json([
            'success' => true,
            'message' => 'Lampiran PDF berhasil ditambahkan ke bendel SPJ.',
            'data' => [
                'id' => $attachment->id,
                'judul' => $attachment->judul,
                'kategori' => $attachment->kategori,
                'periode_tag' => $attachment->periode_tag,
                'original_filename' => $attachment->original_filename,
                'file_size' => $attachment->file_size,
                'sort_order' => $attachment->sort_order,
                'stream_url' => route(VariantConfig::routeName($variant, 'api.cetak-spj.attachments.stream'), ['attachment' => $attachment->id]),
            ],
        ], Response::HTTP_CREATED);
    }

    /**
     * Perbarui metadata lampiran PDF eksternal (judul, kategori, periode_tag).
     */
    public function updateAttachment(Request $request, SpjExternalAttachment $attachment): JsonResponse
    {
        $variant = $this->resolveVariant();
        abort_if($attachment->variant !== $variant, Response::HTTP_NOT_FOUND);

        $validated = $request->validate([
            'judul' => ['sometimes', 'required', 'string', 'max:180'],
            'kategori' => ['sometimes', 'required', 'string', Rule::in(SpjExternalAttachment::KATEGORI_LIST)],
            'periode_tag' => ['sometimes', 'required', 'string', Rule::in(SpjExternalAttachment::PERIODE_TAGS)],
        ]);

        $attachment->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Metadata lampiran berhasil diperbarui.',
            'data' => [
                'id' => $attachment->id,
                'judul' => $attachment->judul,
                'kategori' => $attachment->kategori,
                'periode_tag' => $attachment->periode_tag,
                'original_filename' => $attachment->original_filename,
                'file_size' => $attachment->file_size,
                'sort_order' => $attachment->sort_order,
                'stream_url' => route(VariantConfig::routeName($variant, 'api.cetak-spj.attachments.stream'), ['attachment' => $attachment->id]),
            ],
        ]);
    }

    /**
     * Hapus lampiran PDF eksternal dari storage & database.
     */
    public function destroyAttachment(Request $request, SpjExternalAttachment $attachment): JsonResponse
    {
        $variant = $this->resolveVariant();
        abort_if($attachment->variant !== $variant, Response::HTTP_NOT_FOUND);

        $judul = $attachment->judul;
        if (Storage::disk('local')->exists($attachment->file_path)) {
            Storage::disk('local')->delete($attachment->file_path);
        }

        $attachment->delete();

        $this->logActivity(
            $request,
            $variant,
            'delete',
            "Menghapus lampiran PDF eksternal '{$judul}' (".VariantConfig::title($variant).')',
            Response::HTTP_OK,
        );

        return response()->json([
            'success' => true,
            'message' => 'Lampiran PDF berhasil dihapus.',
        ]);
    }

    /**
     * Stream berkas PDF eksternal secara aman untuk dirakit oleh mesin pdf-lib / pratinjau.
     */
    public function streamAttachment(SpjExternalAttachment $attachment): BinaryFileResponse
    {
        $variant = $this->resolveVariant();
        abort_if($attachment->variant !== $variant, Response::HTTP_NOT_FOUND);

        $disk = Storage::disk('local');
        abort_unless($disk->exists($attachment->file_path), Response::HTTP_NOT_FOUND);

        $safeFilename = Str::slug($attachment->judul, '_').'.pdf';

        return response()->file($disk->path($attachment->file_path), [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.$safeFilename.'"',
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
     * @return array{tahun: int|null, periode_type: string, bulan_awal: int|null, bulan_akhir: int|null, paper_size: string, grouping_mode: string, sp2b_mode: string|null}
     */
    protected function parseFilterParams(Request $request, string $variant): array
    {
        $isSilpa = in_array($variant, [VariantConfig::SILPA, VariantConfig::KINERJA_SILPA], true);
        $rawTahun = $request->query('tahun');
        $tahun = is_scalar($rawTahun) && is_numeric($rawTahun) ? (int) $rawTahun : null;

        $rawPeriode = $request->query('periode_type', $isSilpa ? 'tahunan' : 'tahap_1');
        $periodeType = is_string($rawPeriode) ? $rawPeriode : ($isSilpa ? 'tahunan' : 'tahap_1');

        $rawAwal = $request->query('bulan_awal');
        $bulanAwal = is_scalar($rawAwal) && is_numeric($rawAwal) ? (int) $rawAwal : null;

        $rawAkhir = $request->query('bulan_akhir');
        $bulanAkhir = is_scalar($rawAkhir) && is_numeric($rawAkhir) ? (int) $rawAkhir : null;

        $rawPaper = $request->query('paper_size', 'F4');
        $paperSize = is_string($rawPaper) ? $rawPaper : 'F4';

        $rawGrouping = $request->query('grouping_mode', 'per_jenis');
        $groupingMode = is_string($rawGrouping) ? $rawGrouping : 'per_jenis';

        $rawSp2bMode = $request->query('sp2b_mode');
        $allowedSp2bQuery = array_merge(['auto'], SpjPrintManifestService::ALLOWED_SP2B_MODES);
        $sp2bMode = is_string($rawSp2bMode) && in_array($rawSp2bMode, $allowedSp2bQuery, true)
            ? $rawSp2bMode
            : null;

        return [
            'tahun' => $tahun,
            'periode_type' => $periodeType,
            'bulan_awal' => $bulanAwal,
            'bulan_akhir' => $bulanAkhir,
            'paper_size' => $paperSize,
            'grouping_mode' => $groupingMode,
            'sp2b_mode' => $sp2bMode,
        ];
    }

    protected function sanitizeCoverPhotoPath(string $rawPath, string $variant): ?string
    {
        return $this->manifestService->sanitizeCoverPhotoPath($rawPath, $variant);
    }

    protected function sanitizeAnyCoverPhotoPath(string $rawPath): ?string
    {
        return $this->manifestService->sanitizeAnyCoverPhotoPath($rawPath);
    }

    protected function logActivity(
        Request $request,
        string $variant,
        string $action,
        string $description,
        int $statusCode,
    ): void {
        $this->activityLogger->log([
            'user_id' => $request->user()?->id,
            'actor_name' => $request->user()?->name ?? 'Pengguna',
            'module' => 'cetak_spj',
            'variant' => $variant,
            'action' => $action,
            'description' => $description,
            'route_name' => $request->route()?->getName(),
            'http_method' => $request->method(),
            'url_path' => '/'.ltrim($request->path(), '/'),
            'status_code' => $statusCode,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);
    }

    protected function resolveVariant(): string
    {
        $bound = app()->bound('variant') ? app('variant') : VariantConfig::REGULER;

        return VariantConfig::isValid((string) $bound) ? (string) $bound : VariantConfig::REGULER;
    }
}
