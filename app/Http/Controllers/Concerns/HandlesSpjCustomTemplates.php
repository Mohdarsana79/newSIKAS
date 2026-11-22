<?php

namespace App\Http\Controllers\Concerns;

use App\Exceptions\KwitansiTemplateException;
use App\Models\SpjTemplate;
use App\Services\SpjTemplateService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

trait HandlesSpjCustomTemplates
{
    /**
     * Stream atau download 1 dokumen SPJ kustom dalam format PDF (via LibreOffice).
     *
     * @param  callable(): Model  $recordResolver
     * @param  callable(SpjTemplate, Model, string): string  $filenameBuilder
     */
    protected function respondSpjCustomPdf(
        string $expectedType,
        SpjTemplate $template,
        SpjTemplateService $templateService,
        callable $recordResolver,
        callable $filenameBuilder,
        bool $inline
    ): BinaryFileResponse|JsonResponse {
        $label = SpjTemplate::labelForType($expectedType);

        if ($template->document_type !== $expectedType) {
            return response()->json([
                'success' => false,
                'message' => "Template tidak sesuai untuk dokumen {$label}.",
            ], 404);
        }

        if (! $templateService->isLibreOfficeAvailable()) {
            return response()->json([
                'success' => false,
                'message' => 'LibreOffice tidak ditemukan di sistem. Gunakan tombol Unduh Word (.docx) atau pastikan LibreOffice portable/sistem tersedia.',
            ], 422);
        }

        $docxPath = null;
        $pdfPath = null;
        $pdfHandedOff = false;
        try {
            $record = $recordResolver();
            $docxPath = $templateService->compileSingleDocx($template, $record, $this->variant);
            $pdfPath = $templateService->convertDocxToPdf($docxPath);
            $filename = $filenameBuilder($template, $record, 'pdf');

            if ($inline) {
                $response = response()
                    ->file($pdfPath, [
                        'Content-Type' => 'application/pdf',
                        'Content-Disposition' => 'inline; filename="'.$filename.'"',
                    ])
                    ->deleteFileAfterSend(true);
                $pdfHandedOff = true;

                return $response;
            }

            $response = response()
                ->download($pdfPath, $filename, ['Content-Type' => 'application/pdf'])
                ->deleteFileAfterSend(true);
            $pdfHandedOff = true;

            return $response;
        } catch (ModelNotFoundException) {
            return response()->json([
                'success' => false,
                'message' => "Data {$label} tidak ditemukan.",
            ], 404);
        } catch (KwitansiTemplateException $e) {
            Log::warning("Error generating custom {$expectedType} PDF: ".$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Throwable $e) {
            Log::error("Error generating custom {$expectedType} PDF: ".$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => "Terjadi kesalahan saat membuat PDF {$label}.",
            ], 500);
        } finally {
            if ($docxPath !== null && is_file($docxPath)) {
                @unlink($docxPath);
            }
            if (! $pdfHandedOff && $pdfPath !== null && is_file($pdfPath)) {
                @unlink($pdfPath);
            }
        }
    }

    /**
     * Download 1 dokumen SPJ kustom dalam format Word (.docx).
     *
     * @param  callable(): Model  $recordResolver
     * @param  callable(SpjTemplate, Model, string): string  $filenameBuilder
     */
    protected function respondSpjCustomDocx(
        string $expectedType,
        SpjTemplate $template,
        SpjTemplateService $templateService,
        callable $recordResolver,
        callable $filenameBuilder
    ): BinaryFileResponse|JsonResponse {
        $label = SpjTemplate::labelForType($expectedType);

        if ($template->document_type !== $expectedType) {
            return response()->json([
                'success' => false,
                'message' => "Template tidak sesuai untuk dokumen {$label}.",
            ], 404);
        }

        $docxPath = null;
        $handedOff = false;
        try {
            $record = $recordResolver();
            $docxPath = $templateService->compileSingleDocx($template, $record, $this->variant);
            $filename = $filenameBuilder($template, $record, 'docx');

            $response = response()
                ->download(
                    $docxPath,
                    $filename,
                    ['Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
                )
                ->deleteFileAfterSend(true);
            $handedOff = true;

            return $response;
        } catch (ModelNotFoundException) {
            return response()->json([
                'success' => false,
                'message' => "Data {$label} tidak ditemukan.",
            ], 404);
        } catch (KwitansiTemplateException $e) {
            Log::warning("Error generating custom {$expectedType} DOCX: ".$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Throwable $e) {
            Log::error("Error generating custom {$expectedType} DOCX: ".$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => "Terjadi kesalahan saat membuat dokumen DOCX {$label}.",
            ], 500);
        } finally {
            if (! $handedOff && $docxPath !== null && is_file($docxPath)) {
                @unlink($docxPath);
            }
        }
    }

    protected function sanitizeCustomFilename(string $prefix, string $identifier, string $ext): string
    {
        $slug = Str::slug(Str::limit($identifier, 60, ''), '_');
        if ($slug === '') {
            $slug = 'dokumen';
        }

        return "{$prefix}_{$slug}.{$ext}";
    }

    /**
     * Normalisasi pasangan key => value dari input custom_variables form BAST / Surat Pesanan.
     *
     * @return array<string, string>
     */
    protected function sanitizeCustomVariables(mixed $raw): array
    {
        if (! is_array($raw)) {
            return [];
        }

        $cleaned = [];
        foreach ($raw as $key => $val) {
            if (! is_string($key)) {
                continue;
            }
            $normalizedKey = trim((string) preg_replace('/^\$\{?|\}?$/', '', $key));
            if ($normalizedKey === '' || strlen($normalizedKey) > 120) {
                continue;
            }
            if (is_scalar($val) || $val === null) {
                $cleaned[$normalizedKey] = trim((string) ($val ?? ''));
            }
        }

        return $cleaned;
    }
}
