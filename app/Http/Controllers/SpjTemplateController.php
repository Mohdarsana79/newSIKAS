<?php

namespace App\Http\Controllers;

use App\Exceptions\KwitansiTemplateException;
use App\Models\SpjTemplate;
use App\Services\SpjTemplateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class SpjTemplateController extends Controller
{
    public function __construct(
        protected SpjTemplateService $templateService,
    ) {}

    /**
     * Daftar seluruh template kustom untuk jenis dokumen tertentu + katalog variabel + status LibreOffice.
     */
    public function index(string $type): JsonResponse
    {
        if (! in_array($type, SpjTemplate::TYPES, true)) {
            return response()->json([
                'success' => false,
                'message' => 'Jenis dokumen template tidak dikenali.',
            ], 404);
        }

        $templates = SpjTemplate::query()
            ->forType($type)
            ->with('creator:id,name')
            ->latest('id')
            ->get()
            ->map(fn (SpjTemplate $tpl) => $this->serializeTemplate($tpl))
            ->values();

        return response()->json([
            'success' => true,
            'document_type' => $type,
            'document_label' => SpjTemplate::labelForType($type),
            'data' => $templates,
            'variable_catalog' => $this->templateService->variableCatalog($type),
            'libreoffice_available' => $this->templateService->isLibreOfficeAvailable(),
        ]);
    }

    /**
     * Upload template .docx baru untuk jenis dokumen tertentu.
     */
    public function store(Request $request, string $type): JsonResponse
    {
        if (! in_array($type, SpjTemplate::TYPES, true)) {
            return response()->json([
                'success' => false,
                'message' => 'Jenis dokumen template tidak dikenali.',
            ], 404);
        }

        $validated = $request->validate([
            'nama' => 'required|string|max:120',
            'deskripsi' => 'nullable|string|max:255',
            'file' => 'required|file|max:10240',
        ], [
            'nama.required' => 'Nama template wajib diisi.',
            'nama.max' => 'Nama template maksimal 120 karakter.',
            'file.required' => 'File template Word (.docx) wajib diunggah.',
            'file.max' => 'Ukuran file template maksimal 10 MB.',
        ]);

        /** @var UploadedFile $file */
        $file = $request->file('file');
        $validationError = $this->validateDocxExtension($file);
        if ($validationError !== null) {
            return response()->json([
                'success' => false,
                'message' => $validationError,
                'errors' => ['file' => [$validationError]],
            ], 422);
        }

        try {
            $analysis = $this->templateService->analyzeTemplateFile($file->getRealPath(), $type);
        } catch (KwitansiTemplateException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'errors' => ['file' => [$e->getMessage()]],
            ], 422);
        } catch (\Throwable $e) {
            Log::error("Unexpected error analyzing uploaded {$type} template: ".$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Gagal memvalidasi berkas template Word (.docx).',
                'errors' => ['file' => ['Gagal memvalidasi berkas template Word (.docx).']],
            ], 422);
        }

        $storedName = Str::uuid().'.docx';
        $storedPath = $file->storeAs(SpjTemplate::storageDirectoryForType($type), $storedName, 'local');
        if (! is_string($storedPath) || $storedPath === '') {
            return response()->json([
                'success' => false,
                'message' => 'Gagal menyimpan file template ke penyimpanan lokal.',
            ], 500);
        }

        $label = SpjTemplate::labelForType($type);

        try {
            $template = SpjTemplate::create([
                'document_type' => $type,
                'nama' => trim($validated['nama']),
                'deskripsi' => isset($validated['deskripsi']) && trim((string) $validated['deskripsi']) !== ''
                    ? trim((string) $validated['deskripsi'])
                    : null,
                'file_path' => $storedPath,
                'original_filename' => Str::limit(basename($file->getClientOriginalName()), 255, ''),
                'file_size' => (int) ($file->getSize() ?: 0),
                'detected_variables' => [
                    'recognized' => $analysis['recognized'],
                    'unrecognized' => $analysis['unrecognized'],
                    'unclosed' => $analysis['unclosed'],
                    'item_table_vars' => $analysis['item_table_vars'],
                    'image_vars' => $analysis['image_vars'],
                ],
                'has_item_table' => $analysis['has_item_table'],
                'created_by' => $request->user()?->id,
            ]);
        } catch (\Throwable $e) {
            Storage::disk('local')->delete($storedPath);
            Log::error("Failed to persist {$type} template record: ".$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => "Gagal menyimpan data template {$label}.",
            ], 500);
        }

        $template->load('creator:id,name');

        return response()->json([
            'success' => true,
            'message' => "Template {$label} berhasil diunggah.",
            'data' => $this->serializeTemplate($template),
        ], 201);
    }

    /**
     * Perbarui nama, deskripsi, dan/atau ganti file .docx template.
     */
    public function update(Request $request, string $type, SpjTemplate $template): JsonResponse
    {
        if (! in_array($type, SpjTemplate::TYPES, true) || $template->document_type !== $type) {
            return response()->json([
                'success' => false,
                'message' => 'Template tidak ditemukan untuk jenis dokumen ini.',
            ], 404);
        }

        $validated = $request->validate([
            'nama' => 'required|string|max:120',
            'deskripsi' => 'nullable|string|max:255',
            'file' => 'nullable|file|max:10240',
        ], [
            'nama.required' => 'Nama template wajib diisi.',
            'nama.max' => 'Nama template maksimal 120 karakter.',
            'file.max' => 'Ukuran file template maksimal 10 MB.',
        ]);

        $updatePayload = [
            'nama' => trim($validated['nama']),
            'deskripsi' => isset($validated['deskripsi']) && trim((string) $validated['deskripsi']) !== ''
                ? trim((string) $validated['deskripsi'])
                : null,
        ];

        $oldPath = null;
        $newStoredPath = null;

        if ($request->hasFile('file')) {
            /** @var UploadedFile $file */
            $file = $request->file('file');
            $validationError = $this->validateDocxExtension($file);
            if ($validationError !== null) {
                return response()->json([
                    'success' => false,
                    'message' => $validationError,
                    'errors' => ['file' => [$validationError]],
                ], 422);
            }

            try {
                $analysis = $this->templateService->analyzeTemplateFile($file->getRealPath(), $type);
            } catch (KwitansiTemplateException $e) {
                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage(),
                    'errors' => ['file' => [$e->getMessage()]],
                ], 422);
            } catch (\Throwable $e) {
                Log::error("Unexpected error analyzing updated {$type} template: ".$e->getMessage());

                return response()->json([
                    'success' => false,
                    'message' => 'Gagal memvalidasi berkas template Word (.docx).',
                    'errors' => ['file' => ['Gagal memvalidasi berkas template Word (.docx).']],
                ], 422);
            }

            $storedName = Str::uuid().'.docx';
            $storedPath = $file->storeAs(SpjTemplate::storageDirectoryForType($type), $storedName, 'local');
            if (! is_string($storedPath) || $storedPath === '') {
                return response()->json([
                    'success' => false,
                    'message' => 'Gagal menyimpan file template ke penyimpanan lokal.',
                ], 500);
            }

            $oldPath = $template->file_path;
            $newStoredPath = $storedPath;
            $updatePayload['file_path'] = $storedPath;
            $updatePayload['original_filename'] = Str::limit(basename($file->getClientOriginalName()), 255, '');
            $updatePayload['file_size'] = (int) ($file->getSize() ?: 0);
            $updatePayload['detected_variables'] = [
                'recognized' => $analysis['recognized'],
                'unrecognized' => $analysis['unrecognized'],
                'unclosed' => $analysis['unclosed'],
                'item_table_vars' => $analysis['item_table_vars'],
                'image_vars' => $analysis['image_vars'],
            ];
            $updatePayload['has_item_table'] = $analysis['has_item_table'];
        }

        $label = SpjTemplate::labelForType($type);

        try {
            $template->update($updatePayload);
        } catch (\Throwable $e) {
            if ($newStoredPath !== null) {
                Storage::disk('local')->delete($newStoredPath);
            }
            Log::error("Failed to update {$type} template record: ".$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => "Gagal memperbarui data template {$label}.",
            ], 500);
        }

        if ($oldPath !== null && $oldPath !== $template->file_path && Storage::disk('local')->exists($oldPath)) {
            Storage::disk('local')->delete($oldPath);
        }

        $template->load('creator:id,name');

        return response()->json([
            'success' => true,
            'message' => "Template {$label} berhasil diperbarui.",
            'data' => $this->serializeTemplate($template),
        ]);
    }

    /**
     * Hapus template dan file fisiknya.
     */
    public function destroy(string $type, SpjTemplate $template): JsonResponse
    {
        if (! in_array($type, SpjTemplate::TYPES, true) || $template->document_type !== $type) {
            return response()->json([
                'success' => false,
                'message' => 'Template tidak ditemukan untuk jenis dokumen ini.',
            ], 404);
        }

        $filePath = $template->file_path;
        $template->delete();

        if ($filePath && Storage::disk('local')->exists($filePath)) {
            Storage::disk('local')->delete($filePath);
        }

        $label = SpjTemplate::labelForType($type);

        return response()->json([
            'success' => true,
            'message' => "Template {$label} berhasil dihapus.",
        ]);
    }

    /**
     * Unduh file .docx sumber asli dari template.
     */
    public function downloadSource(string $type, SpjTemplate $template): BinaryFileResponse|JsonResponse
    {
        if (! in_array($type, SpjTemplate::TYPES, true) || $template->document_type !== $type) {
            return response()->json([
                'success' => false,
                'message' => 'Template tidak ditemukan untuk jenis dokumen ini.',
            ], 404);
        }

        $disk = Storage::disk('local');
        if (! $template->file_path || ! $disk->exists($template->file_path)) {
            return response()->json([
                'success' => false,
                'message' => 'File sumber template tidak ditemukan di penyimpanan.',
            ], 404);
        }

        $safeName = (Str::slug($template->nama ?: "template-{$type}", '_') ?: "template_{$type}").'.docx';

        return response()->download(
            $disk->path($template->file_path),
            $safeName,
            ['Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
        );
    }

    /**
     * Unduh file contoh starter template .docx siap edit untuk jenis dokumen tertentu.
     */
    public function downloadSample(string $type): BinaryFileResponse|JsonResponse
    {
        if (! in_array($type, SpjTemplate::TYPES, true)) {
            return response()->json([
                'success' => false,
                'message' => 'Jenis dokumen template tidak dikenali.',
            ], 404);
        }

        $samplePath = $this->templateService->generateSampleDocx($type);
        $fileMap = [
            SpjTemplate::TYPE_TANDA_TERIMA => 'Contoh_Template_Tanda_Terima_SIKAS.docx',
            SpjTemplate::TYPE_BAST => 'Contoh_Template_BAST_SIKAS.docx',
            SpjTemplate::TYPE_SURAT_PESANAN => 'Contoh_Template_Surat_Pesanan_SIKAS.docx',
        ];

        return response()
            ->download(
                $samplePath,
                $fileMap[$type] ?? 'Contoh_Template_SPJ_SIKAS.docx',
                ['Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
            )
            ->deleteFileAfterSend(true);
    }

    protected function validateDocxExtension(UploadedFile $file): ?string
    {
        $ext = strtolower($file->getClientOriginalExtension());
        if ($ext !== 'docx') {
            return 'Hanya berkas Microsoft Word berformat .docx yang diizinkan (file .doc/.docm tidak didukung).';
        }

        return null;
    }

    /**
     * @return array<string, mixed>
     */
    protected function serializeTemplate(SpjTemplate $template): array
    {
        $detected = is_array($template->detected_variables) ? $template->detected_variables : [];

        return [
            'id' => $template->id,
            'document_type' => $template->document_type,
            'nama' => $template->nama,
            'deskripsi' => $template->deskripsi,
            'original_filename' => $template->original_filename,
            'file_size' => $template->file_size,
            'has_item_table' => (bool) $template->has_item_table,
            'detected_variables' => [
                'recognized' => array_values($detected['recognized'] ?? []),
                'unrecognized' => array_values($detected['unrecognized'] ?? []),
                'unclosed' => array_values($detected['unclosed'] ?? []),
                'item_table_vars' => array_values($detected['item_table_vars'] ?? []),
                'image_vars' => array_values($detected['image_vars'] ?? []),
            ],
            'creator_name' => $template->creator?->name,
            'created_at' => $template->created_at?->toIso8601String(),
            'updated_at' => $template->updated_at?->toIso8601String(),
        ];
    }
}
