<?php

namespace App\Support;

class PdfPaperHelper
{
    /** @var array<int, string> */
    public const ALLOWED_PAPER_SIZES = ['A4', 'F4', 'Legal', 'Letter'];

    /** @var array<int, string> */
    public const ALLOWED_ORIENTATIONS = ['portrait', 'landscape'];

    /** @var array<int, string> */
    public const ALLOWED_FONT_SIZES = ['8pt', '9pt', '10pt', '11pt', '12pt'];

    /**
     * Dimensi F4 / Folio (210 × 330 mm dalam satuan point DomPDF: 595.28 × 935.43 pt).
     *
     * @var array{0: int, 1: int, 2: float, 3: float}
     */
    public const F4_PAPER_POINTS = [0, 0, 595.28, 935.43];

    /**
     * Konversi nama ukuran kertas ('A4', 'F4', 'Folio', 'Legal', 'Letter')
     * menjadi argumen yang 100% dipahami DomPDF::setPaper().
     *
     * @return string|array{0: int, 1: int, 2: float, 3: float}
     */
    public static function resolvePaper(mixed $paperSize, string $default = 'A4'): string|array
    {
        $raw = is_string($paperSize) && trim($paperSize) !== '' ? trim($paperSize) : $default;

        return match (strtolower($raw)) {
            'f4', 'folio' => self::F4_PAPER_POINTS,
            'legal' => 'legal',
            'letter' => 'letter',
            'a4' => 'a4',
            default => strtolower($default) === 'f4' || strtolower($default) === 'folio'
                ? self::F4_PAPER_POINTS
                : strtolower($default),
        };
    }

    /**
     * Nilai ukuran kertas untuk aturan CSS `@page { size: ... }` di DomPDF.
     * DomPDF CSS tidak mengenal keyword `F4`, sehingga dipetakan ke `210mm 330mm`.
     */
    public static function resolveCssPaperSize(mixed $paperSize, string $default = 'A4'): string
    {
        $raw = is_string($paperSize) && trim($paperSize) !== '' ? trim($paperSize) : $default;

        return match (strtolower($raw)) {
            'f4', 'folio' => '210mm 330mm',
            'legal' => 'Legal',
            'letter' => 'Letter',
            'a4' => 'A4',
            default => strtolower($default) === 'f4' || strtolower($default) === 'folio'
                ? '210mm 330mm'
                : $default,
        };
    }

    /**
     * Normalisasi orientasi ('portrait' | 'landscape').
     */
    public static function resolveOrientation(mixed $orientation, string $default = 'portrait'): string
    {
        if (is_string($orientation)) {
            $normalized = strtolower(trim($orientation));
            if (in_array($normalized, self::ALLOWED_ORIENTATIONS, true)) {
                return $normalized;
            }
        }

        return in_array(strtolower($default), self::ALLOWED_ORIENTATIONS, true)
            ? strtolower($default)
            : 'portrait';
    }

    /**
     * Normalisasi ukuran font (menerima '8pt'..'12pt' atau angka '8'..'12', tetap kompatibel dengan pt valid lain).
     */
    public static function resolveFontSize(mixed $fontSize, string $default = '10pt'): string
    {
        if (is_string($fontSize) || is_numeric($fontSize)) {
            $raw = strtolower(trim((string) $fontSize));
            if (preg_match('/^(\d+(?:\.\d+)?)(pt)?$/', $raw, $matches) === 1) {
                $num = (float) $matches[1];
                if ($num >= 6 && $num <= 18) {
                    $formatted = rtrim(rtrim(number_format($num, 1, '.', ''), '0'), '.');

                    return $formatted.'pt';
                }
            }
        }

        return $default;
    }
}
