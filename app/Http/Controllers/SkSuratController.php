<?php

namespace App\Http\Controllers;

use App\Config\VariantConfig;
use App\Models\SkDokumen;
use App\Models\SkFolder;
use App\Models\SkTemplate;
use App\Services\SkSuratService;
use App\Services\SkSuratTagService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;

class SkSuratController extends Controller
{
    public const PRESET_FOLDER_COLORS = [
        'indigo',
        'emerald',
        'amber',
        'rose',
        'sky',
        'purple',
    ];

    private const HEX_COLOR_PATTERN = '/^#(?:([0-9a-fA-F]{3})|([0-9a-fA-F]{6}))$/';

    protected SkSuratService $skSuratService;

    protected SkSuratTagService $skSuratTagService;

    public function __construct(SkSuratService $skSuratService, SkSuratTagService $skSuratTagService)
    {
        $this->skSuratService = $skSuratService;
        $this->skSuratTagService = $skSuratTagService;
    }

    /**
     * Display list of folders.
     */
    public function index(Request $request)
    {
        $query = SkFolder::query()
            ->withCount(['dokumens', 'templates'])
            ->with('user:id,name')
            ->latest('updated_at');

        if ($request->filled('search')) {
            $search = strtolower($request->search);
            $query->where(function ($sub) use ($search) {
                $sub->whereRaw('LOWER(nama_folder) LIKE ?', ["%{$search}%"])
                    ->orWhereRaw('LOWER(deskripsi) LIKE ?', ["%{$search}%"]);
            });
        }

        $folders = $query->paginate(12)->withQueryString();

        return Inertia::render('SkSurat/Index', [
            'folders' => $folders,
            'filters' => $request->only('search'),
            'totalFolders' => SkFolder::count(),
            'totalDokumens' => SkDokumen::count(),
            'totalGenerated' => SkDokumen::where('tipe', 'generated')->count(),
            'totalUploaded' => SkDokumen::where('tipe', 'uploaded')->count(),
            'tagCatalog' => $this->skSuratTagService->variableCatalog(true),
        ]);
    }

    /**
     * Validation rules for folder creation/update, allowing preset keys or hex colors.
     *
     * @return array<string, mixed>
     */
    public static function folderValidationRules(): array
    {
        return [
            'nama_folder' => 'required|string|max:255',
            'deskripsi' => 'nullable|string|max:1000',
            'warna' => [
                'nullable',
                'string',
                'max:50',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if ($value === null || $value === '') {
                        return;
                    }

                    $trimmed = trim((string) $value);
                    if (in_array($trimmed, self::PRESET_FOLDER_COLORS, true)) {
                        return;
                    }

                    if (! preg_match(self::HEX_COLOR_PATTERN, $trimmed)) {
                        $fail('Warna folder harus berupa preset yang tersedia atau kode hex yang valid (contoh: #5b3df5).');
                    }
                },
            ],
        ];
    }

    /**
     * Normalize preset tokens and 3/6-digit hex color strings to canonical #rrggbb or preset key.
     */
    public static function normalizeFolderColor(?string $warna): string
    {
        $trimmed = trim((string) ($warna ?? ''));
        if ($trimmed === '') {
            return 'indigo';
        }

        if (in_array($trimmed, self::PRESET_FOLDER_COLORS, true)) {
            return $trimmed;
        }

        if (preg_match(self::HEX_COLOR_PATTERN, $trimmed, $matches)) {
            if (! empty($matches[1])) {
                [$r, $g, $b] = str_split($matches[1]);

                return strtolower("#{$r}{$r}{$g}{$g}{$b}{$b}");
            }

            return strtolower($trimmed);
        }

        return 'indigo';
    }

    /**
     * Create a new folder.
     */
    public function storeFolder(Request $request)
    {
        abort_unless(auth()->user()?->canAccessModule('sk_surat', 'write'), 403, 'Akses ditolak. Akun Anda tidak memiliki izin kelola SK & Surat.');

        $validated = $request->validate(self::folderValidationRules());

        $validated['warna'] = self::normalizeFolderColor($validated['warna'] ?? null);
        $validated['created_by'] = auth()->id();

        $folder = SkFolder::create($validated);

        return redirect()->route('sk-surat.show', $folder->id)->with('success', 'Folder berhasil dibuat.');
    }

    /**
     * Update an existing folder.
     */
    public function updateFolder(Request $request, $id)
    {
        abort_unless(auth()->user()?->canAccessModule('sk_surat', 'write'), 403, 'Akses ditolak. Akun Anda tidak memiliki izin kelola SK & Surat.');

        $folder = SkFolder::findOrFail($id);

        $validated = $request->validate(self::folderValidationRules());
        $validated['warna'] = self::normalizeFolderColor($validated['warna'] ?? null);

        $folder->update($validated);

        return back()->with('success', 'Folder berhasil diperbarui.');
    }

    /**
     * Delete a folder and its contents.
     */
    public function destroyFolder($id)
    {
        abort_unless(auth()->user()?->canAccessModule('sk_surat', 'write'), 403, 'Akses ditolak. Akun Anda tidak memiliki izin kelola SK & Surat.');

        $folder = SkFolder::with(['templates', 'dokumens'])->findOrFail($id);

        $localDisk = Storage::disk('local');

        // Remove files from storage
        foreach ($folder->templates as $template) {
            if ($template->file_path && $localDisk->exists($template->file_path)) {
                $localDisk->delete($template->file_path);
            }
        }

        foreach ($folder->dokumens as $dokumen) {
            if ($dokumen->file_path && $localDisk->exists($dokumen->file_path)) {
                $localDisk->delete($dokumen->file_path);
            }
        }

        $folder->delete();

        return redirect()->route('sk-surat.index')->with('success', 'Folder dan seluruh isinya berhasil dihapus.');
    }

    /**
     * Show folder detail with its documents and templates.
     */
    public function show(Request $request, $id)
    {
        $folder = SkFolder::with([
            'templates.user:id,name',
            'dokumens' => function ($q) use ($request) {
                if ($request->filled('search')) {
                    $search = strtolower($request->search);
                    $q->where(function ($sub) use ($search) {
                        $sub->whereRaw('LOWER(perihal) LIKE ?', ["%{$search}%"])
                            ->orWhereRaw('LOWER(nomor_surat) LIKE ?', ["%{$search}%"]);
                    });
                }
                if ($request->filled('tipe')) {
                    $q->where('tipe', $request->tipe);
                }
                $q->with(['template', 'user:id,name'])->latest();
            },
        ])->findOrFail($id);

        $folder->templates->each(function (SkTemplate $tpl): void {
            $tpl->setAttribute(
                'variable_classification',
                $this->skSuratTagService->classifyTemplateVariables($tpl->detected_variables ?? [])
            );
        });

        $schoolData = $this->skSuratService->getSchoolAutoFillData();

        return Inertia::render('SkSurat/Show', [
            'folder' => $folder,
            'schoolData' => $schoolData,
            'tagCatalog' => $this->skSuratTagService->variableCatalog(true),
            'filters' => $request->only('search', 'tipe'),
        ]);
    }

    /**
     * Katalog lengkap referensi tag SK & Surat (JSON).
     */
    public function tagCatalog(): JsonResponse
    {
        abort_unless(auth()->user()?->canAccessModule('sk_surat', 'read'), 403);

        return response()->json([
            'catalog' => $this->skSuratTagService->variableCatalog(true),
        ]);
    }

    /**
     * Opsi sumber data dinamis (Penganggaran 4 varian, Belanja BKU, Penerimaan Dana, Data PTK).
     */
    public function dataSourceOptions(Request $request): JsonResponse
    {
        abort_unless(auth()->user()?->canAccessModule('sk_surat', 'read'), 403);

        $options = $this->skSuratTagService->getSourceOptions($request->only([
            'variant',
            'penganggaran_id',
            'tahun',
            'bulan',
            'search',
            'ptk_tahun',
        ]));

        return response()->json($options);
    }

    /**
     * Resolusi nilai otomatis tag teks & preview tabel dinamis berdasarkan konteks sumber data terpilih.
     */
    public function resolveDataSourceTags(Request $request): JsonResponse
    {
        abort_unless(auth()->user()?->canAccessModule('sk_surat', 'read'), 403);

        $validated = $request->validate([
            'variant' => 'nullable|string|in:'.implode(',', VariantConfig::VARIANTS),
            'penganggaran_id' => 'nullable|integer',
            'bku_id' => 'nullable|integer',
            'bku_ids' => 'nullable|array',
            'bku_ids.*' => 'integer',
            'penerimaan_id' => 'nullable|integer',
            'ptk_id' => 'nullable|integer',
            'ptk_ids' => 'nullable|array',
            'ptk_ids.*' => 'integer',
            'tanggal_surat' => 'nullable|string|max:50',
            'nomor_surat' => 'nullable|string|max:255',
            'perihal' => 'nullable|string|max:255',
            'auto_default' => 'nullable|boolean',
            'required_sources' => 'nullable|array',
            'required_sources.*' => 'string|max:40',
        ]);

        $resolved = $this->skSuratTagService->resolveTagValues($validated);

        return response()->json([
            'text' => $resolved['text'],
            'table_rows' => $resolved['table_rows'],
            'resolved_context' => $resolved['resolved_context'],
            'has_images' => [
                'kop_surat' => $resolved['images']['kop_surat'] !== null,
                'logo_sekolah' => $resolved['images']['logo_sekolah'] !== null,
                'logo_daerah' => $resolved['images']['logo_daerah'] !== null,
            ],
        ]);
    }

    /**
     * Upload a new master template (.docx) to a folder.
     */
    public function storeTemplate(Request $request, $folderId)
    {
        abort_unless(auth()->user()?->canAccessModule('sk_surat', 'write'), 403, 'Akses ditolak. Akun Anda tidak memiliki izin kelola SK & Surat.');

        $folder = SkFolder::findOrFail($folderId);

        $request->validate([
            'judul' => 'required|string|max:255',
            'file' => 'required|file|mimes:docx|max:10240',
        ]);

        $file = $request->file('file');
        $originalName = $file->getClientOriginalName();
        $localDisk = Storage::disk('local');
        $storedPath = $file->store('sk_surat/templates', 'local');

        try {
            $fullPath = $localDisk->path($storedPath);
            $this->skSuratTagService->assertSafeDocxArchive($fullPath);
            $report = $this->skSuratService->extractVariableReport($fullPath);
        } catch (\Throwable $e) {
            if ($storedPath && $localDisk->exists($storedPath)) {
                $localDisk->delete($storedPath);
            }
            report($e);

            return back()->withErrors([
                'file' => $e->getMessage(),
            ]);
        }

        $variables = $report['variables'];
        $template = SkTemplate::create([
            'folder_id' => $folder->id,
            'judul' => $request->judul,
            'file_path' => $storedPath,
            'file_name_original' => $originalName,
            'detected_variables' => $variables,
            'created_by' => auth()->id(),
        ]);

        return back()->with($this->buildTemplateScanFlash($template, $report, false));
    }

    /**
     * Re-scan variable tags from an existing master template DOCX file.
     */
    public function rescanTemplate($id)
    {
        abort_unless(auth()->user()?->canAccessModule('sk_surat', 'write'), 403, 'Akses ditolak. Akun Anda tidak memiliki izin kelola SK & Surat.');

        $template = SkTemplate::findOrFail($id);
        $localDisk = Storage::disk('local');

        if (! $template->file_path || ! $localDisk->exists($template->file_path)) {
            return back()->withErrors([
                'file' => 'Berkas master template tidak ditemukan di penyimpanan.',
            ]);
        }

        try {
            $report = $this->skSuratService->extractVariableReport($localDisk->path($template->file_path));
        } catch (\Throwable $e) {
            report($e);

            return back()->withErrors([
                'file' => $e->getMessage(),
            ]);
        }

        $template->update([
            'detected_variables' => $report['variables'],
        ]);

        return back()->with($this->buildTemplateScanFlash($template, $report, true));
    }

    /**
     * Build success + optional warning flash payloads from template variable diagnostics.
     *
     * @param  array{variables: array<string>, unclosed: array<string>}  $report
     * @return array<string, string>
     */
    protected function buildTemplateScanFlash(SkTemplate $template, array $report, bool $isRescan): array
    {
        $count = count($report['variables']);
        if ($isRescan) {
            $success = $count > 0
                ? "Deteksi ulang berhasil: {$count} variabel ditemukan pada '{$template->judul}'."
                : "Deteksi ulang selesai, namun belum ada tag variabel \${...} yang ditemukan pada '{$template->judul}'.";
        } else {
            $success = $count > 0
                ? "Master template '{$template->judul}' berhasil diunggah dengan {$count} variabel terdeteksi."
                : "Master template '{$template->judul}' diunggah, namun belum ada tag variabel \${...} yang terdeteksi.";
        }

        $flash = ['success' => $success];

        if ($report['unclosed'] !== []) {
            $tagList = implode(', ', array_map(fn (string $tag) => "\${{$tag}}", $report['unclosed']));
            $flash['warning'] = "Tag berikut terdeteksi kurang tanda tutup '}' di file Word: {$tagList}. Sistem tetap mendukung pengisiannya, namun disarankan melengkapi tanda '}' pada file Word.";
        }

        return $flash;
    }

    /**
     * Delete a master template.
     */
    public function destroyTemplate($id)
    {
        abort_unless(auth()->user()?->canAccessModule('sk_surat', 'write'), 403, 'Akses ditolak. Akun Anda tidak memiliki izin kelola SK & Surat.');

        $template = SkTemplate::findOrFail($id);
        $localDisk = Storage::disk('local');

        if ($template->file_path && $localDisk->exists($template->file_path)) {
            $localDisk->delete($template->file_path);
        }

        $template->delete();

        return back()->with('success', 'Master template berhasil dihapus.');
    }

    /**
     * Simpan pemetaan referensi tag yang dipilih pengguna pada master template.
     */
    public function updateTemplateTagMapping(Request $request, $id): JsonResponse
    {
        abort_unless(auth()->user()?->canAccessModule('sk_surat', 'write'), 403, 'Akses ditolak. Akun Anda tidak memiliki izin kelola SK & Surat.');

        $template = SkTemplate::findOrFail($id);

        $validated = $request->validate([
            'text_map' => 'nullable|array',
            'text_map.*' => 'nullable|string|max:120',
            'enabled_tags' => 'nullable|array',
            'enabled_tags.*' => 'string|max:120',
            'enabled_tables' => 'nullable|array',
            'enabled_tables.*' => 'string|in:item,ptk,belanja',
            'enabled_images' => 'nullable|array',
            'enabled_images.*' => 'string|in:kop_surat,logo_sekolah,logo_daerah',
        ]);

        $cleanMapping = $this->sanitizeTagMappingPayload($validated);

        $template->update([
            'tag_mappings' => $cleanMapping,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pemetaan referensi tag berhasil disimpan pada master template.',
            'tag_mappings' => $cleanMapping,
        ]);
    }

    /**
     * Store dynamic document generated from template.
     */
    public function storeDokumen(Request $request, $folderId)
    {
        abort_unless(auth()->user()?->canAccessModule('sk_surat', 'write'), 403, 'Akses ditolak. Akun Anda tidak memiliki izin kelola SK & Surat.');

        $folder = SkFolder::findOrFail($folderId);

        $validated = $request->validate([
            'template_id' => 'required|exists:sk_templates,id',
            'perihal' => 'required|string|max:255',
            'nomor_surat' => 'nullable|string|max:255',
            'tanggal_surat' => 'nullable|date',
            'data_isian' => 'nullable|array',
            'sumber_data' => 'nullable|array',
            'keterangan' => 'nullable|string|max:1000',
        ]);

        // Auto-extract nomor_surat and tanggal_surat from data_isian if not explicitly passed
        $dataIsian = $request->input('data_isian', []);
        if (empty($validated['nomor_surat'])) {
            $validated['nomor_surat'] = $dataIsian['nomor_surat'] ?? $dataIsian['no_surat'] ?? $dataIsian['nomor'] ?? null;
        }
        if (empty($validated['tanggal_surat'])) {
            $rawDate = $dataIsian['tanggal_surat'] ?? $dataIsian['tanggal'] ?? $dataIsian['tgl_surat'] ?? null;
            if ($rawDate && strtotime($rawDate)) {
                $validated['tanggal_surat'] = date('Y-m-d', strtotime($rawDate));
            }
        }

        $validated['sumber_data'] = $this->sanitizeAndSnapshotSumberData($request->input('sumber_data'));
        $validated['folder_id'] = $folder->id;
        $validated['tipe'] = 'generated';
        $validated['created_by'] = auth()->id();

        SkDokumen::create($validated);

        if ($request->boolean('save_template_mapping') && is_array($request->input('sumber_data.tag_mappings'))) {
            $tpl = SkTemplate::find($validated['template_id']);
            if ($tpl) {
                $tpl->update([
                    'tag_mappings' => $this->sanitizeTagMappingPayload($request->input('sumber_data.tag_mappings')),
                ]);
            }
        }

        return back()->with('success', 'Dokumen surat berhasil dibuat.');
    }

    /**
     * Update dynamic document data isian.
     */
    public function updateDokumen(Request $request, $id)
    {
        abort_unless(auth()->user()?->canAccessModule('sk_surat', 'write'), 403, 'Akses ditolak. Akun Anda tidak memiliki izin kelola SK & Surat.');

        $dokumen = SkDokumen::findOrFail($id);

        $validated = $request->validate([
            'perihal' => 'required|string|max:255',
            'nomor_surat' => 'nullable|string|max:255',
            'tanggal_surat' => 'nullable|date',
            'data_isian' => 'nullable|array',
            'sumber_data' => 'nullable|array',
            'keterangan' => 'nullable|string|max:1000',
        ]);

        $dataIsian = $request->input('data_isian', []);
        if (empty($validated['nomor_surat'])) {
            $validated['nomor_surat'] = $dataIsian['nomor_surat'] ?? $dataIsian['no_surat'] ?? $dataIsian['nomor'] ?? null;
        }
        if (empty($validated['tanggal_surat'])) {
            $rawDate = $dataIsian['tanggal_surat'] ?? $dataIsian['tanggal'] ?? $dataIsian['tgl_surat'] ?? null;
            if ($rawDate && strtotime($rawDate)) {
                $validated['tanggal_surat'] = date('Y-m-d', strtotime($rawDate));
            }
        }

        if ($request->has('sumber_data')) {
            $validated['sumber_data'] = $this->sanitizeAndSnapshotSumberData($request->input('sumber_data'));
        }

        $dokumen->update($validated);

        if ($request->boolean('save_template_mapping') && $dokumen->template_id && is_array($request->input('sumber_data.tag_mappings'))) {
            $tpl = SkTemplate::find($dokumen->template_id);
            if ($tpl) {
                $tpl->update([
                    'tag_mappings' => $this->sanitizeTagMappingPayload($request->input('sumber_data.tag_mappings')),
                ]);
            }
        }

        return back()->with('success', 'Data dokumen berhasil diperbarui.');
    }

    /**
     * Sanitasi struktur pemetaan referensi tag yang dipilih pengguna.
     *
     * @param  array<string, mixed>  $raw
     * @return array{
     *   text_map: array<string, string>,
     *   enabled_tags: array<int, string>,
     *   enabled_tables: array<int, string>,
     *   enabled_images: array<int, string>
     * }
     */
    protected function sanitizeTagMappingPayload(array $raw): array
    {
        $textMap = [];
        foreach (is_array($raw['text_map'] ?? null) ? $raw['text_map'] : [] as $tplTag => $refKey) {
            $k = trim((string) $tplTag);
            $v = trim((string) ($refKey ?? ''));
            if ($k !== '' && $v !== '') {
                $textMap[$k] = $v;
            }
        }

        $enabledTags = array_values(array_unique(array_filter(
            array_map(fn ($v) => trim((string) $v), is_array($raw['enabled_tags'] ?? null) ? $raw['enabled_tags'] : []),
            fn ($v) => $v !== ''
        )));

        $allowedTables = ['item', 'ptk', 'belanja'];
        $enabledTables = array_values(array_unique(array_filter(
            array_map(fn ($v) => trim((string) $v), is_array($raw['enabled_tables'] ?? null) ? $raw['enabled_tables'] : []),
            fn ($v) => in_array($v, $allowedTables, true)
        )));

        $allowedImages = ['kop_surat', 'logo_sekolah', 'logo_daerah'];
        $enabledImages = array_values(array_unique(array_filter(
            array_map(fn ($v) => trim((string) $v), is_array($raw['enabled_images'] ?? null) ? $raw['enabled_images'] : []),
            fn ($v) => in_array($v, $allowedImages, true)
        )));

        return [
            'text_map' => $textMap,
            'enabled_tags' => $enabledTags,
            'enabled_tables' => $enabledTables,
            'enabled_images' => $enabledImages,
        ];
    }

    /**
     * Sanitasi konteks sumber data & buat snapshot baris tabel dinamis di sisi server.
     *
     * @return array<string, mixed>|null
     */
    protected function sanitizeAndSnapshotSumberData(mixed $rawSumberData): ?array
    {
        if (! is_array($rawSumberData) || $rawSumberData === []) {
            return null;
        }

        $rawVariant = (string) ($rawSumberData['variant'] ?? '');
        $variant = in_array($rawVariant, VariantConfig::VARIANTS, true)
            ? $rawVariant
            : VariantConfig::REGULER;

        $clean = [
            'variant' => $variant,
            'penganggaran_id' => ! empty($rawSumberData['penganggaran_id']) && is_numeric($rawSumberData['penganggaran_id'])
                ? (int) $rawSumberData['penganggaran_id']
                : null,
            'bku_id' => ! empty($rawSumberData['bku_id']) && is_numeric($rawSumberData['bku_id'])
                ? (int) $rawSumberData['bku_id']
                : null,
            'bku_ids' => is_array($rawSumberData['bku_ids'] ?? null)
                ? array_values(array_unique(array_filter(array_map('intval', $rawSumberData['bku_ids']), fn ($id) => $id > 0)))
                : [],
            'penerimaan_id' => ! empty($rawSumberData['penerimaan_id']) && is_numeric($rawSumberData['penerimaan_id'])
                ? (int) $rawSumberData['penerimaan_id']
                : null,
            'ptk_id' => ! empty($rawSumberData['ptk_id']) && is_numeric($rawSumberData['ptk_id'])
                ? (int) $rawSumberData['ptk_id']
                : null,
            'ptk_ids' => is_array($rawSumberData['ptk_ids'] ?? null)
                ? array_values(array_unique(array_filter(array_map('intval', $rawSumberData['ptk_ids']), fn ($id) => $id > 0)))
                : [],
        ];

        $hasTagMappings = is_array($rawSumberData['tag_mappings'] ?? null);
        if ($hasTagMappings) {
            $mapping = $this->sanitizeTagMappingPayload($rawSumberData['tag_mappings']);
            $clean['tag_mappings'] = $mapping;
            $clean['enabled_tables'] = $mapping['enabled_tables'];
            $clean['enabled_images'] = $mapping['enabled_images'];
        } else {
            if (array_key_exists('enabled_tables', $rawSumberData) && is_array($rawSumberData['enabled_tables'])) {
                $clean['enabled_tables'] = array_values(array_intersect(['item', 'ptk', 'belanja'], array_map('strval', $rawSumberData['enabled_tables'])));
            }
            if (array_key_exists('enabled_images', $rawSumberData) && is_array($rawSumberData['enabled_images'])) {
                $clean['enabled_images'] = array_values(array_intersect(['kop_surat', 'logo_sekolah', 'logo_daerah'], array_map('strval', $rawSumberData['enabled_images'])));
            }
        }

        $hasAnyBinding = $clean['penganggaran_id'] !== null
            || $clean['bku_id'] !== null
            || $clean['bku_ids'] !== []
            || $clean['penerimaan_id'] !== null
            || $clean['ptk_id'] !== null
            || $clean['ptk_ids'] !== []
            || $hasTagMappings;

        if (! $hasAnyBinding) {
            return null;
        }

        $resolved = $this->skSuratTagService->resolveTagValues($clean);
        $tableRows = $resolved['table_rows'];
        if (array_key_exists('enabled_tables', $clean)) {
            $allowed = array_flip($clean['enabled_tables']);
            foreach (array_keys($tableRows) as $groupKey) {
                if (! isset($allowed[$groupKey])) {
                    $tableRows[$groupKey] = [];
                }
            }
        }
        $clean['table_rows'] = $tableRows;

        return $clean;
    }

    /**
     * Upload scanned/physical archive file.
     */
    public function uploadArsip(Request $request, $folderId)
    {
        abort_unless(auth()->user()?->canAccessModule('sk_surat', 'write'), 403, 'Akses ditolak. Akun Anda tidak memiliki izin kelola SK & Surat.');

        $folder = SkFolder::findOrFail($folderId);

        $request->validate([
            'perihal' => 'required|string|max:255',
            'nomor_surat' => 'nullable|string|max:255',
            'tanggal_surat' => 'nullable|date',
            'file' => 'required|file|mimes:pdf,docx,jpg,jpeg,png|max:15360',
            'keterangan' => 'nullable|string|max:1000',
        ]);

        $file = $request->file('file');
        $originalName = $file->getClientOriginalName();
        $storedPath = $file->store('sk_surat/archives', 'local');

        SkDokumen::create([
            'folder_id' => $folder->id,
            'tipe' => 'uploaded',
            'perihal' => $request->perihal,
            'nomor_surat' => $request->nomor_surat,
            'tanggal_surat' => $request->tanggal_surat,
            'file_path' => $storedPath,
            'file_name_original' => $originalName,
            'keterangan' => $request->keterangan,
            'created_by' => auth()->id(),
        ]);

        return back()->with('success', 'Berkas arsip fisik berhasil diunggah.');
    }

    /**
     * Delete a document (generated or archive).
     */
    public function destroyDokumen($id)
    {
        abort_unless(auth()->user()?->canAccessModule('sk_surat', 'write'), 403, 'Akses ditolak. Akun Anda tidak memiliki izin kelola SK & Surat.');

        $dokumen = SkDokumen::findOrFail($id);
        $localDisk = Storage::disk('local');

        if ($dokumen->file_path && $localDisk->exists($dokumen->file_path)) {
            $localDisk->delete($dokumen->file_path);
        }

        $dokumen->delete();

        return back()->with('success', 'Dokumen berhasil dihapus.');
    }

    /**
     * Download generated DOCX file.
     */
    public function downloadDocx($id)
    {
        $dokumen = SkDokumen::with('template')->findOrFail($id);

        if ($dokumen->tipe !== 'generated') {
            abort(400, 'Dokumen ini bukan dokumen hasil generate template.');
        }

        $tempPath = $this->skSuratService->generateDocx($dokumen);
        $downloadName = Str::slug($dokumen->perihal ?: 'surat').'.docx';

        return response()->download($tempPath, $downloadName)->deleteFileAfterSend(true);
    }

    /**
     * Export generated document to PDF.
     */
    public function exportPdf($id)
    {
        $dokumen = SkDokumen::with('template')->findOrFail($id);

        if ($dokumen->tipe !== 'generated') {
            abort(400, 'Dokumen ini bukan dokumen hasil generate template.');
        }

        $tempDocxPath = null;

        try {
            $tempDocxPath = $this->skSuratService->generateDocx($dokumen);
            $tempPdfPath = $this->skSuratService->convertDocxToPdf($tempDocxPath);
            $downloadName = Str::slug($dokumen->perihal ?: 'surat').'.pdf';

            return response()->download($tempPdfPath, $downloadName)->deleteFileAfterSend(true);
        } catch (\Throwable $e) {
            report($e);

            return back()->with('error', 'Gagal mengekspor PDF: '.$e->getMessage().' Anda dapat mengunduh format DOCX.');
        } finally {
            if ($tempDocxPath && file_exists($tempDocxPath)) {
                @unlink($tempDocxPath);
            }
        }
    }

    /**
     * Download uploaded physical archive file.
     */
    public function downloadArchive($id)
    {
        $dokumen = SkDokumen::findOrFail($id);
        $localDisk = Storage::disk('local');

        if ($dokumen->tipe !== 'uploaded' || ! $dokumen->file_path || ! $localDisk->exists($dokumen->file_path)) {
            abort(404, 'Berkas arsip tidak ditemukan.');
        }

        return $localDisk->download($dokumen->file_path, $dokumen->file_name_original ?: 'dokumen_arsip');
    }
}
