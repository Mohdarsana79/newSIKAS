<?php

namespace App\Services;

use App\Models\Penganggaran;
use App\Models\SekolahProfile;
use App\Models\SkDokumen;
use Illuminate\Support\Facades\File;
use PhpOffice\PhpWord\TemplateProcessor;
use Symfony\Component\Process\ExecutableFinder;
use Symfony\Component\Process\Process;

class SkSuratService
{
    /**
     * Match closed ${tag} tags first (without nested braces/parens), or fallback to unclosed
     * identifier tags such as (${terbilang) missing their closing curly brace.
     */
    private const VARIABLE_SCAN_PATTERN = '/\$\{([^{}()]+)\}|\$\{([A-Za-z0-9_]+)(?=\s*(?:[)\],.;:!?"\'\s]|$))/u';

    /**
     * Extract variable tags (${variable}) from a DOCX file.
     *
     * @return array<string>
     *
     * @throws \RuntimeException When the file is missing or not a valid DOCX archive.
     */
    public function extractVariables(string $fullPath): array
    {
        return $this->extractVariableReport($fullPath)['variables'];
    }

    /**
     * Extract both detected variable tags and any unclosed tag typos (e.g. ${terbilang)) from a DOCX file.
     *
     * Validates the DOCX archive, combines PHPWord's TemplateProcessor detection with
     * a paragraph-level XML scan across document/header/footer/notes parts (including
     * textboxes) so tags split across Word XML runs are still detected.
     *
     * @return array{variables: array<string>, unclosed: array<string>}
     *
     * @throws \RuntimeException When the file is missing or not a valid DOCX archive.
     */
    public function extractVariableReport(string $fullPath): array
    {
        if (! file_exists($fullPath)) {
            throw new \RuntimeException('Berkas template tidak ditemukan di penyimpanan.');
        }

        $zip = new \ZipArchive;
        if ($zip->open($fullPath) !== true) {
            throw new \RuntimeException('Berkas tidak dapat dibuka sebagai dokumen Word (.docx) yang valid.');
        }

        try {
            $partInfo = $this->resolveWordXmlPartNames($zip);
            if (! $partInfo['hasMainDocument']) {
                throw new \RuntimeException('Struktur berkas tidak valid. Pastikan berkas berformat .docx (bukan .doc lama atau file lain yang diubah ekstensinya).');
            }

            $xmlVariables = [];
            $unclosedVars = [];
            foreach ($partInfo['parts'] as $partName) {
                $xmlContent = $zip->getFromName($partName);
                if (is_string($xmlContent) && $xmlContent !== '') {
                    $report = $this->extractVariableReportFromWordXml($xmlContent);
                    $xmlVariables = array_merge($xmlVariables, $report['variables']);
                    $unclosedVars = array_merge($unclosedVars, $report['unclosed']);
                }
            }
        } finally {
            $zip->close();
        }

        $processorVars = [];
        try {
            $processor = new TemplateProcessor($fullPath);
            $processorVars = $processor->getVariables();
        } catch (\Throwable $e) {
            if ($xmlVariables === []) {
                throw new \RuntimeException('Gagal memproses template Word: '.$e->getMessage(), 0, $e);
            }
            report($e);
        }

        $combined = [];
        foreach (array_merge($processorVars, $xmlVariables) as $rawVar) {
            $cleaned = $this->sanitizeExtractedVariable((string) $rawVar);
            if ($cleaned !== null) {
                $combined[$cleaned] = true;
            }
        }

        $unclosedUnique = [];
        foreach ($unclosedVars as $rawUnclosed) {
            $cleaned = $this->sanitizeExtractedVariable((string) $rawUnclosed);
            if ($cleaned !== null) {
                $unclosedUnique[$cleaned] = true;
            }
        }

        return [
            'variables' => array_keys($combined),
            'unclosed' => array_keys($unclosedUnique),
        ];
    }

    /**
     * Resolve document/header/footer/note XML part names inside an open DOCX archive.
     *
     * @return array{parts: array<string>, hasMainDocument: bool}
     */
    protected function resolveWordXmlPartNames(\ZipArchive $zip): array
    {
        $parts = [];
        $hasMainDocument = false;

        for ($i = 0; $i < $zip->numFiles; $i++) {
            $name = $zip->getNameIndex($i);
            if (! is_string($name)) {
                continue;
            }
            if (preg_match('#^word/document\d*\.xml$#i', $name)) {
                $hasMainDocument = true;
                $parts[] = $name;
            } elseif (preg_match('#^word/(?:header\d+|footer\d+|footnotes|endnotes)\.xml$#i', $name)) {
                $parts[] = $name;
            }
        }

        return [
            'parts' => $parts,
            'hasMainDocument' => $hasMainDocument,
        ];
    }

    protected function sanitizeExtractedVariable(string $rawVar): ?string
    {
        $cleaned = trim($rawVar);
        if ($cleaned === '' || str_contains($cleaned, '<') || str_contains($cleaned, '>') || preg_match('/[\r\n]/', $cleaned)) {
            return null;
        }

        return $cleaned;
    }

    /**
     * Reconstruct paragraph text from WordprocessingML runs so ${tag} split across
     * multiple <w:r>, <w:proofErr>, or formatting tags inside body/tables/textboxes is intact.
     *
     * @return array<string>
     */
    protected function extractVariablesFromWordXml(string $xmlContent): array
    {
        return $this->extractVariableReportFromWordXml($xmlContent)['variables'];
    }

    /**
     * @return array{variables: array<string>, unclosed: array<string>}
     */
    protected function extractVariableReportFromWordXml(string $xmlContent): array
    {
        $dom = $this->loadWordXmlDocument($xmlContent);
        $variables = [];
        $unclosed = [];

        if ($dom !== null) {
            $xpath = new \DOMXPath($dom);
            $xpath->registerNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main');

            $paragraphs = $xpath->query('//w:p');
            if ($paragraphs !== false) {
                foreach ($paragraphs as $paragraph) {
                    $textNodes = $xpath->query('.//w:t | .//w:instrText', $paragraph);
                    if ($textNodes === false) {
                        continue;
                    }

                    $buffer = '';
                    foreach ($textNodes as $node) {
                        $buffer .= $node->textContent;
                    }

                    if ($buffer !== '') {
                        $this->scanBufferForVariables($buffer, $variables, $unclosed);
                    }
                }
            }
        } else {
            $plainText = html_entity_decode(strip_tags($xmlContent), ENT_QUOTES | ENT_XML1, 'UTF-8');
            $this->scanBufferForVariables($plainText, $variables, $unclosed);
        }

        return [
            'variables' => $variables,
            'unclosed' => $unclosed,
        ];
    }

    protected function loadWordXmlDocument(string $xmlContent): ?\DOMDocument
    {
        $dom = new \DOMDocument;
        $previousErrors = libxml_use_internal_errors(true);
        $loaded = $dom->loadXML($xmlContent, LIBXML_NONET);
        libxml_clear_errors();
        libxml_use_internal_errors($previousErrors);

        return $loaded ? $dom : null;
    }

    /**
     * @param  array<string>  $variables
     * @param  array<string>  $unclosed
     */
    protected function scanBufferForVariables(string $buffer, array &$variables, array &$unclosed): void
    {
        if (! preg_match_all(self::VARIABLE_SCAN_PATTERN, $buffer, $matches, PREG_SET_ORDER)) {
            return;
        }

        foreach ($matches as $match) {
            $closedTag = trim($match[1] ?? '');
            $unclosedTag = trim($match[2] ?? '');

            if ($unclosedTag !== '') {
                $variables[] = $unclosedTag;
                $unclosed[] = $unclosedTag;
            } elseif ($closedTag !== '') {
                $variables[] = $closedTag;
            }
        }
    }

    /**
     * Get auto-fill default data from school profile and latest penganggaran.
     */
    public function getSchoolAutoFillData(): array
    {
        $sekolah = SekolahProfile::first();
        $penganggaran = Penganggaran::latest('tahun_anggaran')->first();

        $namaKepalaSekolah = (string) ($penganggaran->kepala_sekolah ?? '');
        $nipKepalaSekolah = (string) ($penganggaran->nip_kepala_sekolah ?? '');
        $namaBendahara = (string) ($penganggaran->bendahara ?? '');
        $nipBendahara = (string) ($penganggaran->nip_bendahara ?? '');
        $namaKomite = (string) ($penganggaran->komite ?? '');
        $tahunAnggaran = (string) ($penganggaran->tahun_anggaran ?? date('Y'));

        return [
            'nama_sekolah' => (string) ($sekolah->nama_sekolah ?? ''),
            'npsn' => (string) ($sekolah->npsn ?? ''),
            'status_sekolah' => (string) ($sekolah->status_sekolah ?? ''),
            'jenjang_sekolah' => (string) ($sekolah->jenjang_sekolah ?? ''),
            'alamat' => (string) ($sekolah->alamat ?? ''),
            'alamat_sekolah' => (string) ($sekolah->alamat ?? ''),
            'kelurahan_desa' => (string) ($sekolah->kelurahan_desa ?? ''),
            'desa' => (string) ($sekolah->kelurahan_desa ?? ''),
            'kelurahan' => (string) ($sekolah->kelurahan_desa ?? ''),
            'kecamatan' => (string) ($sekolah->kecamatan ?? ''),
            'kabupaten_kota' => (string) ($sekolah->kabupaten_kota ?? ''),
            'kabupaten' => (string) ($sekolah->kabupaten_kota ?? ''),
            'kota' => (string) ($sekolah->kabupaten_kota ?? ''),
            'provinsi' => (string) ($sekolah->provinsi ?? ''),
            'nama_kepala_sekolah' => $namaKepalaSekolah,
            'kepala_sekolah' => $namaKepalaSekolah,
            'nip_kepala_sekolah' => $nipKepalaSekolah,
            'nip_kepsek' => $nipKepalaSekolah,
            'nama_bendahara' => $namaBendahara,
            'bendahara' => $namaBendahara,
            'nip_bendahara' => $nipBendahara,
            'komite' => $namaKomite,
            'nama_komite' => $namaKomite,
            'tahun_anggaran' => $tahunAnggaran,
            'tahun' => $tahunAnggaran,
        ];
    }

    /**
     * Generate compiled DOCX file from SkDokumen and its master template.
     * Supports dynamic tables (cloneRow), school image placeholders (${kop_surat}, ${logo_*}),
     * unclosed-tag normalization, and custom manual variables.
     * Returns full path to generated temporary file.
     */
    public function generateDocx(SkDokumen $dokumen): string
    {
        return app(SkSuratTagService::class)->compileSkDokumenDocx($dokumen);
    }

    /**
     * Create a temporary DOCX copy with unclosed ${tag typos (such as (${terbilang)) normalized
     * to ${tag} so PHPWord replaces them cleanly without modifying the original template.
     */
    public function createNormalizedTemplateIfNeeded(string $templatePath, string $tempDir): ?string
    {
        $tempTemplate = $tempDir.DIRECTORY_SEPARATOR.'tpl_norm_'.uniqid('', true).'.docx';
        if (! @copy($templatePath, $tempTemplate)) {
            return null;
        }

        $zip = new \ZipArchive;
        if ($zip->open($tempTemplate) !== true) {
            @unlink($tempTemplate);

            return null;
        }

        $changed = false;
        try {
            $partInfo = $this->resolveWordXmlPartNames($zip);
            foreach ($partInfo['parts'] as $partName) {
                $xmlContent = $zip->getFromName($partName);
                if (! is_string($xmlContent) || $xmlContent === '' || ! str_contains($xmlContent, '${')) {
                    continue;
                }

                $normalizedXml = $this->normalizeUnclosedTagsInXml($xmlContent, $partChanged);
                if ($partChanged) {
                    $zip->addFromString($partName, $normalizedXml);
                    $changed = true;
                }
            }
        } finally {
            $zip->close();
        }

        if (! $changed) {
            @unlink($tempTemplate);

            return null;
        }

        return $tempTemplate;
    }

    protected function normalizeUnclosedTagsInXml(string $xmlContent, ?bool &$changed = false): string
    {
        $changed = false;
        $dom = $this->loadWordXmlDocument($xmlContent);
        if ($dom === null) {
            return $xmlContent;
        }

        $xpath = new \DOMXPath($dom);
        $xpath->registerNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main');

        $paragraphs = $xpath->query('//w:p');
        if ($paragraphs === false) {
            return $xmlContent;
        }

        foreach ($paragraphs as $paragraph) {
            $textNodes = $xpath->query('.//w:t | .//w:instrText', $paragraph);
            if ($textNodes === false || $textNodes->length === 0) {
                continue;
            }

            $spans = [];
            $buffer = '';
            $cursor = 0;

            foreach ($textNodes as $node) {
                $text = $node->textContent;
                $len = strlen($text);
                $spans[] = [
                    'node' => $node,
                    'text' => $text,
                    'start' => $cursor,
                    'end' => $cursor + $len,
                ];
                $buffer .= $text;
                $cursor += $len;
            }

            if ($buffer === '' || ! str_contains($buffer, '${')) {
                continue;
            }

            if (! preg_match_all(self::VARIABLE_SCAN_PATTERN, $buffer, $matches, PREG_OFFSET_CAPTURE)) {
                continue;
            }

            $insertOffsets = [];
            foreach ($matches[2] as $unclosedMatch) {
                if (is_array($unclosedMatch) && $unclosedMatch[1] !== -1 && $unclosedMatch[0] !== '') {
                    $insertOffsets[] = $unclosedMatch[1] + strlen($unclosedMatch[0]);
                }
            }

            if ($insertOffsets === []) {
                continue;
            }

            rsort($insertOffsets);
            $dirtySpans = [];

            foreach ($insertOffsets as $insertBytePos) {
                foreach ($spans as $idx => $span) {
                    if ($span['start'] <= $insertBytePos && $insertBytePos <= $span['end'] && $span['text'] !== '') {
                        $localOffset = $insertBytePos - $span['start'];
                        $spans[$idx]['text'] = substr_replace($spans[$idx]['text'], '}', $localOffset, 0);
                        $dirtySpans[$idx] = true;
                        $changed = true;
                        break;
                    }
                }
            }

            foreach (array_keys($dirtySpans) as $idx) {
                $spans[$idx]['node']->textContent = $spans[$idx]['text'];
            }
        }

        if (! $changed) {
            return $xmlContent;
        }

        return $dom->saveXML() ?: $xmlContent;
    }

    /**
     * Resolve the LibreOffice executable path, prioritizing configured path and project portable binary.
     */
    public function resolveLibreOfficePath(): ?string
    {
        $configuredPath = config('services.libreoffice.path');
        if (is_string($configuredPath) && trim($configuredPath) !== '') {
            $trimmed = trim($configuredPath);
            if (is_file($trimmed)) {
                return $trimmed;
            }
        }

        $candidates = [
            storage_path('app/libreoffice/program/soffice.com'),
            storage_path('app/libreoffice/program/soffice.exe'),
            storage_path('app/libreoffice/program/soffice'),
            base_path('libreoffice/program/soffice.com'),
            base_path('libreoffice/program/soffice.exe'),
            base_path('libreoffice/program/soffice'),
            'C:\\Program Files\\LibreOffice\\program\\soffice.com',
            'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
            'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.com',
            'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
            '/usr/bin/soffice',
            '/usr/bin/libreoffice',
        ];

        foreach ($candidates as $candidate) {
            if (is_file($candidate)) {
                return $candidate;
            }
        }

        $finder = new ExecutableFinder;
        foreach (['soffice', 'libreoffice'] as $command) {
            $resolved = $finder->find($command);
            if (is_string($resolved) && $resolved !== '') {
                return $resolved;
            }
        }

        return null;
    }

    /**
     * Convert compiled DOCX to PDF using LibreOffice headless (mandatory for layout fidelity).
     * Returns full path to generated temporary PDF file.
     *
     * @throws \RuntimeException When LibreOffice is missing or conversion fails.
     */
    public function convertDocxToPdf(string $docxPath): string
    {
        if (! file_exists($docxPath)) {
            throw new \RuntimeException('File DOCX sumber tidak ditemukan: '.$docxPath);
        }

        $sofficePath = $this->resolveLibreOfficePath();
        if (! $sofficePath) {
            throw new \RuntimeException('LibreOffice portable/sistem tidak ditemukan. Pastikan folder libreoffice/program/soffice.exe tersedia atau atur LIBREOFFICE_PATH di .env.');
        }

        $this->syncDocxFontsToLibreOffice($docxPath, $sofficePath);

        $tempDir = storage_path('app/temp');
        if (! File::isDirectory($tempDir)) {
            File::makeDirectory($tempDir, 0755, true);
        }

        $baseName = pathinfo($docxPath, PATHINFO_FILENAME);
        $expectedPdfPath = $tempDir.DIRECTORY_SEPARATOR.$baseName.'.pdf';
        if (file_exists($expectedPdfPath)) {
            @unlink($expectedPdfPath);
        }

        // First try using persistent warm profile for fast conversion (~2-3s)
        $warmProfileDir = $tempDir.DIRECTORY_SEPARATOR.'libreoffice_profile';
        $result = $this->runLibreOfficeConvert($sofficePath, $docxPath, $tempDir, $warmProfileDir);

        if ($result['exitCode'] === 0 && file_exists($expectedPdfPath) && filesize($expectedPdfPath) > 0) {
            return $expectedPdfPath;
        }

        // Retry once with an isolated temporary profile in case the shared profile was locked/corrupted
        $isolatedProfileDir = $tempDir.DIRECTORY_SEPARATOR.'lo_profile_'.uniqid('', true);
        try {
            $retryResult = $this->runLibreOfficeConvert($sofficePath, $docxPath, $tempDir, $isolatedProfileDir);
            if ($retryResult['exitCode'] === 0 && file_exists($expectedPdfPath) && filesize($expectedPdfPath) > 0) {
                return $expectedPdfPath;
            }
            $detail = trim($retryResult['output']) !== '' ? $retryResult['output'] : $result['output'];
        } finally {
            if (File::isDirectory($isolatedProfileDir)) {
                File::deleteDirectory($isolatedProfileDir);
            }
        }

        throw new \RuntimeException('Konversi PDF melalui LibreOffice gagal'.($detail !== '' ? ': '.$detail : '.'));
    }

    /**
     * Run LibreOffice headless conversion process with a dedicated user profile directory.
     *
     * @return array{exitCode: int, output: string}
     */
    protected function runLibreOfficeConvert(string $sofficePath, string $docxPath, string $outputDir, string $profileDir): array
    {
        if (! File::isDirectory($profileDir)) {
            File::makeDirectory($profileDir, 0755, true);
        }

        $normalizedProfile = str_replace('\\', '/', $profileDir);
        if (! str_starts_with($normalizedProfile, '/')) {
            $normalizedProfile = '/'.$normalizedProfile;
        }
        $profileUri = 'file://'.$normalizedProfile;

        $process = new Process(
            [
                $sofficePath,
                '--headless',
                '--norestore',
                '--nofirststartwizard',
                '--nodefault',
                '-env:UserInstallation='.$profileUri,
                '--convert-to',
                'pdf',
                $docxPath,
                '--outdir',
                $outputDir,
            ],
            null,
            $this->buildLibreOfficeProcessEnv($profileDir, $outputDir)
        );
        $process->setTimeout(60);
        $process->run();

        $output = trim($process->getErrorOutput()."\n".$process->getOutput());

        return [
            'exitCode' => $process->getExitCode() ?? 1,
            'output' => $output,
        ];
    }

    /**
     * Build environment variables required by LibreOffice on Windows/Linux, ensuring
     * it still runs under `php artisan serve` where ServeCommand strips host env vars.
     *
     * @return array<string, string>
     */
    protected function buildLibreOfficeProcessEnv(string $profileDir, string $tempDir): array
    {
        $systemRoot = getenv('SYSTEMROOT') ?: (getenv('WINDIR') ?: 'C:\\Windows');
        $systemDrive = getenv('SystemDrive') ?: 'C:';
        $programData = getenv('ProgramData') ?: $systemDrive.'\\ProgramData';
        $comspec = getenv('COMSPEC') ?: $systemRoot.'\\System32\\cmd.exe';

        $env = [
            'HOME' => $profileDir,
            'USERPROFILE' => $profileDir,
            'APPDATA' => $profileDir,
            'LOCALAPPDATA' => $profileDir,
            'TEMP' => $tempDir,
            'TMP' => $tempDir,
        ];

        if (PHP_OS_FAMILY === 'Windows') {
            $env['WINDIR'] = $systemRoot;
            $env['SystemRoot'] = $systemRoot;
            $env['SystemDrive'] = $systemDrive;
            $env['ProgramData'] = $programData;
            $env['COMSPEC'] = $comspec;
        }

        return $env;
    }

    /**
     * Extract font family names referenced in a DOCX file.
     *
     * @return array<string>
     */
    public function extractDocxFontFamilies(string $docxPath): array
    {
        if (! file_exists($docxPath)) {
            return [];
        }

        $zip = new \ZipArchive;
        if ($zip->open($docxPath) !== true) {
            return [];
        }

        $families = [];
        try {
            $partPatterns = [
                '#^word/fontTable\.xml$#i',
                '#^word/styles\.xml$#i',
                '#^word/theme/theme\d*\.xml$#i',
                '#^word/document\d*\.xml$#i',
            ];

            for ($i = 0; $i < $zip->numFiles; $i++) {
                $name = $zip->getNameIndex($i);
                if (! is_string($name)) {
                    continue;
                }

                $matchesPart = false;
                foreach ($partPatterns as $pattern) {
                    if (preg_match($pattern, $name)) {
                        $matchesPart = true;
                        break;
                    }
                }
                if (! $matchesPart) {
                    continue;
                }

                $xml = $zip->getFromIndex($i);
                if (! is_string($xml) || $xml === '') {
                    continue;
                }

                if (preg_match_all('/(?:w:name|w:ascii|w:hAnsi|w:cs|typeface)="([^"]+)"/i', $xml, $matches)) {
                    foreach ($matches[1] as $rawFont) {
                        $font = trim($rawFont);
                        if ($font !== '' && ! str_starts_with($font, '+')) {
                            $families[$font] = true;
                        }
                    }
                }
            }
        } finally {
            $zip->close();
        }

        return array_keys($families);
    }

    /**
     * Sync missing font families used by a DOCX file from Windows Office CloudFonts / user
     * fonts into the portable LibreOffice truetype fonts folder so PDF output matches Word.
     *
     * @param  array<string>|null  $cloudFontRoots
     */
    public function syncDocxFontsToLibreOffice(string $docxPath, string $sofficePath, ?array $cloudFontRoots = null): int
    {
        $programDir = dirname($sofficePath);
        $loRoot = dirname($programDir);
        $shareDir = $loRoot.DIRECTORY_SEPARATOR.'share';
        if (! File::isDirectory($shareDir)) {
            return 0;
        }

        $truetypeDir = $shareDir.DIRECTORY_SEPARATOR.'fonts'.DIRECTORY_SEPARATOR.'truetype';
        if (! File::isDirectory($truetypeDir) && ! @File::makeDirectory($truetypeDir, 0755, true)) {
            return 0;
        }
        if (! is_writable($truetypeDir)) {
            return 0;
        }

        $families = $this->extractDocxFontFamilies($docxPath);
        if ($families === []) {
            return 0;
        }

        $searchRoots = $cloudFontRoots ?? $this->resolveWindowsCloudFontRoots();
        if ($searchRoots === []) {
            return 0;
        }

        $copied = 0;
        foreach ($families as $family) {
            $prefix = preg_replace('/[^A-Za-z0-9]+/', '', $family) ?: 'Font';
            foreach ($searchRoots as $rootDir) {
                $familyDir = $rootDir.DIRECTORY_SEPARATOR.$family;
                if (! is_dir($familyDir)) {
                    continue;
                }

                $fontFiles = glob($familyDir.DIRECTORY_SEPARATOR.'*.{ttf,otf,ttc,TTF,OTF,TTC}', GLOB_BRACE) ?: [];
                foreach ($fontFiles as $srcFile) {
                    $dstFile = $truetypeDir.DIRECTORY_SEPARATOR.$prefix.'_'.basename($srcFile);
                    if (! file_exists($dstFile) && @copy($srcFile, $dstFile)) {
                        $copied++;
                    }
                }
            }
        }

        return $copied;
    }

    /**
     * Resolve Windows Office CloudFonts / user font cache directories even when
     * `php artisan serve` strips LOCALAPPDATA from the server environment.
     *
     * @return array<string>
     */
    protected function resolveWindowsCloudFontRoots(): array
    {
        if (PHP_OS_FAMILY !== 'Windows') {
            return [];
        }

        $localAppDataCandidates = [];
        foreach ([getenv('LOCALAPPDATA'), getenv('USERPROFILE')] as $idx => $envVal) {
            if (is_string($envVal) && trim($envVal) !== '') {
                $localAppDataCandidates[] = $idx === 0
                    ? trim($envVal)
                    : rtrim(trim($envVal), '\\/').'\\AppData\\Local';
            }
        }

        $currentUser = trim((string) get_current_user());
        if ($currentUser !== '') {
            $systemDrive = getenv('SystemDrive') ?: 'C:';
            $localAppDataCandidates[] = $systemDrive.'\\Users\\'.$currentUser.'\\AppData\\Local';
        }

        $roots = [];
        foreach (array_unique($localAppDataCandidates) as $localAppData) {
            $cloudFonts = $localAppData.'\\Microsoft\\FontCache\\4\\CloudFonts';
            if (is_dir($cloudFonts)) {
                $roots[$cloudFonts] = true;
            }
        }

        return array_keys($roots);
    }
}
