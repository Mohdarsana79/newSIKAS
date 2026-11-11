<?php

namespace App\Services;

use App\Models\Penganggaran;
use App\Models\SekolahProfile;
use App\Models\SkDokumen;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpWord\IOFactory;
use PhpOffice\PhpWord\Settings;
use PhpOffice\PhpWord\TemplateProcessor;

class SkSuratService
{
    /**
     * Extract variable tags (${variable}) from a DOCX file.
     *
     * @return array<string>
     */
    public function extractVariables(string $fullPath): array
    {
        if (! file_exists($fullPath)) {
            return [];
        }

        try {
            $processor = new TemplateProcessor($fullPath);
            $variables = $processor->getVariables();

            return array_values(array_unique($variables));
        } catch (\Throwable $e) {
            report($e);

            return [];
        }
    }

    /**
     * Get auto-fill default data from school profile and penganggaran.
     */
    public function getSchoolAutoFillData(): array
    {
        $sekolah = SekolahProfile::first();
        $penganggaran = Penganggaran::latest('tahun_anggaran')->first();

        return [
            'nama_sekolah' => $sekolah->nama_sekolah ?? '',
            'npsn' => $sekolah->npsn ?? '',
            'status_sekolah' => $sekolah->status_sekolah ?? '',
            'jenjang_sekolah' => $sekolah->jenjang_sekolah ?? '',
            'alamat' => $sekolah->alamat ?? '',
            'alamat_sekolah' => $sekolah->alamat ?? '',
            'kelurahan_desa' => $sekolah->kelurahan_desa ?? '',
            'desa' => $sekolah->kelurahan_desa ?? '',
            'kelurahan' => $sekolah->kelurahan_desa ?? '',
            'kecamatan' => $sekolah->kecamatan ?? '',
            'kabupaten_kota' => $sekolah->kabupaten_kota ?? '',
            'kabupaten' => $sekolah->kabupaten_kota ?? '',
            'kota' => $sekolah->kabupaten_kota ?? '',
            'provinsi' => $sekolah->provinsi ?? '',
            'nama_kepala_sekolah' => $penganggaran->nama_kepala_sekolah ?? '',
            'nip_kepala_sekolah' => $penganggaran->nip_kepala_sekolah ?? '',
            'nama_bendahara' => $penganggaran->nama_bendahara ?? '',
            'nip_bendahara' => $penganggaran->nip_bendahara ?? '',
            'tahun_anggaran' => $penganggaran->tahun_anggaran ?? date('Y'),
        ];
    }

    /**
     * Generate compiled DOCX file from SkDokumen and its master template.
     * Returns full path to generated temporary file.
     */
    public function generateDocx(SkDokumen $dokumen): string
    {
        $template = $dokumen->template;
        if (! $template) {
            throw new \RuntimeException('Dokumen tidak memiliki master template.');
        }

        $templatePath = Storage::path($template->file_path);
        if (! file_exists($templatePath)) {
            throw new \RuntimeException('File master template tidak ditemukan di storage: '.$template->file_path);
        }

        $tempDir = storage_path('app/temp');
        if (! File::isDirectory($tempDir)) {
            File::makeDirectory($tempDir, 0755, true);
        }

        $tempFileName = 'surat_'.uniqid().'.docx';
        $tempFilePath = $tempDir.DIRECTORY_SEPARATOR.$tempFileName;

        $processor = new TemplateProcessor($templatePath);

        // Inject all filled variables
        $dataIsian = $dokumen->data_isian ?? [];
        foreach ($dataIsian as $key => $value) {
            // Replace newlines with break lines in Word if value contains multiple lines
            $val = (string) ($value ?? '');
            if (str_contains($val, "\n")) {
                $lines = explode("\n", str_replace("\r", '', $val));
                $processor->setValue($key, $lines);
            } else {
                $processor->setValue($key, $val);
            }
        }

        $processor->saveAs($tempFilePath);

        return $tempFilePath;
    }

    /**
     * Convert compiled DOCX to PDF using LibreOffice headless (preferred) or DomPDF renderer.
     * Returns full path to generated temporary PDF file.
     */
    public function convertDocxToPdf(string $docxPath): string
    {
        if (! file_exists($docxPath)) {
            throw new \RuntimeException('File DOCX sumber tidak ditemukan: '.$docxPath);
        }

        $tempDir = storage_path('app/temp');
        if (! File::isDirectory($tempDir)) {
            File::makeDirectory($tempDir, 0755, true);
        }

        $baseName = pathinfo($docxPath, PATHINFO_FILENAME);
        $expectedPdfPath = $tempDir.DIRECTORY_SEPARATOR.$baseName.'.pdf';

        // Check for LibreOffice paths
        $libreOfficeCandidates = [
            'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
            'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
            'soffice',
            'libreoffice',
        ];

        $sofficePath = null;
        foreach ($libreOfficeCandidates as $candidate) {
            if (file_exists($candidate)) {
                $sofficePath = $candidate;
                break;
            }
        }

        // 1. Try LibreOffice headless conversion (Pixel-perfect Word fidelity)
        if ($sofficePath) {
            $cmd = '"'.$sofficePath.'" --headless --convert-to pdf '.escapeshellarg($docxPath).' --outdir '.escapeshellarg($tempDir);
            exec($cmd, $output, $returnCode);

            if ($returnCode === 0 && file_exists($expectedPdfPath)) {
                return $expectedPdfPath;
            }
        }

        // 2. Fallback to PHPWord DomPDF writer if LibreOffice failed or is not available
        Settings::setPdfRendererName(Settings::PDF_RENDERER_DOMPDF);
        Settings::setPdfRendererPath(base_path('vendor/dompdf/dompdf'));

        $phpWord = IOFactory::load($docxPath);
        $pdfWriter = IOFactory::createWriter($phpWord, 'PDF');
        $pdfWriter->save($expectedPdfPath);

        return $expectedPdfPath;
    }
}
