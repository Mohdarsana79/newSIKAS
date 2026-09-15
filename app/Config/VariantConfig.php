<?php

namespace App\Config;

use App\Models\BukuKasUmum;
use App\Models\BukuKasUmumUraianDetail;
use App\Models\Dokumen;
use App\Models\KinerjaBukuKasUmum;
use App\Models\KinerjaBukuKasUmumUraianDetail;
use App\Models\KinerjaDokumen;
use App\Models\KinerjaKwitansi;
use App\Models\KinerjaLph;
use App\Models\KinerjaPenarikanTunai;
use App\Models\KinerjaPenerimaanDana;
use App\Models\KinerjaPenganggaran;
use App\Models\KinerjaRekamanPerubahan;
use App\Models\KinerjaRkas;
use App\Models\KinerjaRkasPerubahan;
use App\Models\KinerjaSetorTunai;
use App\Models\KinerjaSilpaBukuKasUmum;
use App\Models\KinerjaSilpaBukuKasUmumUraianDetail;
use App\Models\KinerjaSilpaDokumen;
use App\Models\KinerjaSilpaKwitansi;
use App\Models\KinerjaSilpaLph;
use App\Models\KinerjaSilpaPenarikanTunai;
use App\Models\KinerjaSilpaPenerimaanDana;
use App\Models\KinerjaSilpaPenganggaran;
use App\Models\KinerjaSilpaRkas;
use App\Models\KinerjaSilpaSetorTunai;
use App\Models\KinerjaSilpaSp2b;
use App\Models\KinerjaSilpaSpmth;
use App\Models\KinerjaSilpaSptj;
use App\Models\KinerjaSilpaSts;
use App\Models\KinerjaSilpaTandaTerima;
use App\Models\KinerjaSp2b;
use App\Models\KinerjaSpmth;
use App\Models\KinerjaSptj;
use App\Models\KinerjaSts;
use App\Models\KinerjaTandaTerima;
use App\Models\Kwitansi;
use App\Models\Lph;
use App\Models\PenarikanTunai;
use App\Models\PenerimaanDana;
use App\Models\Penganggaran;
use App\Models\RekamanPerubahan;
use App\Models\Rkas;
use App\Models\RkasPerubahan;
use App\Models\SetorTunai;
use App\Models\SilpaBukuKasUmum;
use App\Models\SilpaBukuKasUmumUraianDetail;
use App\Models\SilpaDokumen;
use App\Models\SilpaKwitansi;
use App\Models\SilpaLph;
use App\Models\SilpaPenarikanTunai;
use App\Models\SilpaPenerimaanDana;
use App\Models\SilpaPenganggaran;
use App\Models\SilpaRkas;
use App\Models\SilpaSetorTunai;
use App\Models\SilpaSp2b;
use App\Models\SilpaSpmth;
use App\Models\SilpaSptj;
use App\Models\SilpaSts;
use App\Models\SilpaTandaTerima;
use App\Models\Sp2b;
use App\Models\Spmth;
use App\Models\Sptj;
use App\Models\Sts;
use App\Models\TandaTerima;
use InvalidArgumentException;

/**
 * Central configuration for budget variants.
 *
 * This is the SINGLE SOURCE OF TRUTH for all variant-specific
 * model classes, table names, FK names, route prefixes, and titles.
 *
 * Variants:
 *   - reguler       : BOSP Reguler (default)
 *   - kinerja       : BOSP Kinerja
 *   - silpa         : SiLPA BOSP Reguler
 *   - kinerja_silpa : SiLPA BOSP Kinerja
 */
class VariantConfig
{
    // ─── Variant Constants ─────────────────────────────────────────
    const REGULER = 'reguler';

    const KINERJA = 'kinerja';

    const SILPA = 'silpa';

    const KINERJA_SILPA = 'kinerja_silpa';

    const VARIANTS = [self::REGULER, self::KINERJA, self::SILPA, self::KINERJA_SILPA];

    // ─── Model Resolution ──────────────────────────────────────────

    /**
     * Returns model class for a given domain concept and variant.
     *
     * @param  string  $concept  Domain concept key (e.g. 'penganggaran', 'bku', 'rkas')
     * @param  string  $variant  One of the VARIANT constants
     * @return string Fully qualified model class name
     *
     * @throws InvalidArgumentException if concept/variant combination is unknown
     */
    public static function getModelClass(string $concept, string $variant): ?string
    {
        self::validateVariant($variant);

        $map = self::modelMap();
        if (! array_key_exists($concept, $map)) {
            throw new InvalidArgumentException(
                "Unknown concept: {$concept}. ".
                'Available concepts: '.implode(', ', array_keys($map))
            );
        }

        if (! array_key_exists($variant, $map[$concept])) {
            return null;
        }

        return $map[$concept][$variant];
    }

    /**
     * Returns ALL model classes for a given domain concept (all variants).
     */
    public static function getAllModelClasses(string $concept): array
    {
        $map = self::modelMap();

        return $map[$concept] ?? throw new InvalidArgumentException("Unknown concept: {$concept}");
    }

    // ─── Foreign Key Resolution ────────────────────────────────────

    /**
     * Returns the foreign key name for the penganggaran relationship in a given variant.
     */
    public static function penganggaranFk(string $variant): string
    {
        self::validateVariant($variant);

        return match ($variant) {
            self::REGULER => 'penganggaran_id',
            self::KINERJA => 'kinerja_penganggaran_id',
            self::SILPA => 'silpa_penganggaran_id',
            self::KINERJA_SILPA => 'kinerja_silpa_penganggaran_id',
        };
    }

    /**
     * Returns the foreign key name for the BKU relationship in a given variant.
     */
    public static function bkuFk(string $variant): string
    {
        self::validateVariant($variant);

        return match ($variant) {
            self::REGULER => 'buku_kas_umum_id',
            self::KINERJA => 'kinerja_buku_kas_umum_id',
            self::SILPA => 'silpa_buku_kas_umum_id',
            self::KINERJA_SILPA => 'kinerja_silpa_buku_kas_umum_id',
        };
    }

    /**
     * Returns the foreign key name for the Penerimaan Dana relationship in a given variant.
     */
    public static function penerimaanDanaFk(string $variant): string
    {
        self::validateVariant($variant);

        return match ($variant) {
            self::REGULER => 'penerimaan_dana_id',
            self::KINERJA => 'kinerja_penerimaan_dana_id',
            self::SILPA => 'silpa_penerimaan_dana_id',
            self::KINERJA_SILPA => 'kinerja_silpa_penerimaan_dana_id',
        };
    }

    /**
     * Returns the foreign key name for the BKU Uraian Detail relationship in a given variant.
     */
    public static function bkuUraianDetailFk(string $variant): string
    {
        self::validateVariant($variant);

        return match ($variant) {
            self::REGULER => 'bku_uraian_detail_id',
            self::KINERJA => 'kinerja_bku_uraian_detail_id',
            self::SILPA => 'silpa_bku_uraian_detail_id',
            self::KINERJA_SILPA => 'kinerja_silpa_bku_uraian_detail_id',
        };
    }

    // ─── Penerimaan Dana (sumber_dana) ─────────────────────────────

    /**
     * Nilai sumber_dana yang valid untuk formulir Penerimaan Dana per varian.
     *
     * Reguler & Kinerja memiliki dua tahap; SiLPA hanya satu nilai (tanpa tahap).
     */
    public static function sumberDanaOptions(string $variant): array
    {
        self::validateVariant($variant);

        return match ($variant) {
            self::REGULER => ['Bosp Reguler Tahap 1', 'Bosp Reguler Tahap 2'],
            self::KINERJA => ['Bosp Kinerja Tahap 1', 'Bosp Kinerja Tahap 2'],
            self::SILPA => ['SiLPA BOSP Reguler'],
            self::KINERJA_SILPA => ['SiLPA BOSP Kinerja'],
        };
    }

    /**
     * Nilai sumber_dana "Tahap 1" yang membawa saldo_awal carryover.
     *
     * Hanya Reguler yang punya konsep saldo_awal carryover (Tahap 1).
     * Kinerja & SiLPA mengembalikan null (tidak ada carryover saldo_awal).
     */
    public static function sumberDanaTahap1(string $variant): ?string
    {
        self::validateVariant($variant);

        return match ($variant) {
            self::REGULER => 'Bosp Reguler Tahap 1',
            default => null,
        };
    }

    /**
     * Nilai sumber_dana "Tahap 2" (digunakan untuk gating bulan Juli-Desember).
     *
     * Reguler & Kinerja punya Tahap 2; SiLPA mengembalikan null (tanpa gating).
     */
    public static function sumberDanaTahap2(string $variant): ?string
    {
        self::validateVariant($variant);

        return match ($variant) {
            self::REGULER => 'Bosp Reguler Tahap 2',
            self::KINERJA => 'Bosp Kinerja Tahap 2',
            default => null,
        };
    }

    /**
     * Kolom penghubung RKAS pada tabel *_buku_kas_umum_uraian_details.
     *
     * Reguler memakai dua kolom (rkas_id untuk Tahap 1, rkas_perubahan_id untuk Tahap 2).
     * Varian lain hanya punya satu kolom *_rkas_id untuk seluruh tahap.
     */
    public static function uraianDetailRkasFk(string $variant, bool $isTahap2 = false): string
    {
        self::validateVariant($variant);

        return match ($variant) {
            self::REGULER => $isTahap2 ? 'rkas_perubahan_id' : 'rkas_id',
            self::KINERJA => $isTahap2 ? 'kinerja_rkas_perubahan_id' : 'kinerja_rkas_id',
            self::SILPA => 'silpa_rkas_id',
            self::KINERJA_SILPA => 'kinerja_silpa_rkas_id',
        };
    }

    // ─── Route Resolution ──────────────────────────────────────────

    /**
     * Returns the URL/route prefix for a given variant.
     * Example: 'kinerja' → 'kinerja-'
     */
    public static function routePrefix(string $variant): string
    {
        self::validateVariant($variant);

        return match ($variant) {
            self::REGULER => '',
            self::KINERJA => 'kinerja-',
            self::SILPA => 'silpa-',
            self::KINERJA_SILPA => 'kinerja-silpa-',
        };
    }

    /**
     * Returns the route name prefix for a given variant.
     * Example: 'kinerja' → 'kinerja-'
     */
    public static function routeNamePrefix(string $variant): string
    {
        return self::routePrefix($variant);
    }

    /**
     * Build a full route name for a given variant and base route name.
     * Example: routeName('kinerja', 'bku.store') → 'kinerja-bku.store'
     */
    public static function routeName(string $variant, string $baseRouteName): string
    {
        return self::routePrefix($variant).$baseRouteName;
    }

    // ─── Display / UI ──────────────────────────────────────────────

    /**
     * Returns the display title for a given variant.
     */
    public static function title(string $variant): string
    {
        self::validateVariant($variant);

        return match ($variant) {
            self::REGULER => 'BOSP Reguler',
            self::KINERJA => 'BOSP Kinerja',
            self::SILPA => 'SiLPA BOSP Reguler',
            self::KINERJA_SILPA => 'SiLPA BOSP Kinerja',
        };
    }

    /**
     * Returns the Inertia page component prefix for a given variant.
     * Used when rendering: Inertia::render($pagePrefix . 'Penatausahaan/Bku', ...)
     */
    public static function pagePrefix(string $variant): string
    {
        self::validateVariant($variant);

        // All variants now share the same frontend components!
        return '';
    }

    // ─── Validation ────────────────────────────────────────────────

    /**
     * Validates that a variant string is one of the known variants.
     *
     * @throws InvalidArgumentException if variant is unknown
     */
    public static function validateVariant(string $variant): void
    {
        if (! in_array($variant, self::VARIANTS, true)) {
            throw new InvalidArgumentException(
                "Unknown variant: '{$variant}'. Must be one of: ".implode(', ', self::VARIANTS)
            );
        }
    }

    /**
     * Check if a variant string is valid.
     */
    public static function isValid(string $variant): bool
    {
        return in_array($variant, self::VARIANTS, true);
    }

    // ─── Model Map ─────────────────────────────────────────────────

    /**
     * Master mapping of domain concepts to variant model classes.
     *
     * Each key is a domain concept (lowercase), each value is an array
     * mapping variant constants to fully-qualified model class names.
     */
    private static function modelMap(): array
    {
        return [
            // ── Core ────────────────────────────────────────
            'penganggaran' => [
                self::REGULER => Penganggaran::class,
                self::KINERJA => KinerjaPenganggaran::class,
                self::SILPA => SilpaPenganggaran::class,
                self::KINERJA_SILPA => KinerjaSilpaPenganggaran::class,
            ],
            'rkas' => [
                self::REGULER => Rkas::class,
                self::KINERJA => KinerjaRkas::class,
                self::SILPA => SilpaRkas::class,
                self::KINERJA_SILPA => KinerjaSilpaRkas::class,
            ],
            'rkas_perubahan' => [
                self::REGULER => RkasPerubahan::class,
                self::KINERJA => KinerjaRkasPerubahan::class,
                // Silpa and KinerjaSilpa may not have perubahan
            ],

            // ── Penatausahaan ───────────────────────────────
            'bku' => [
                self::REGULER => BukuKasUmum::class,
                self::KINERJA => KinerjaBukuKasUmum::class,
                self::SILPA => SilpaBukuKasUmum::class,
                self::KINERJA_SILPA => KinerjaSilpaBukuKasUmum::class,
            ],
            'bku_uraian_detail' => [
                self::REGULER => BukuKasUmumUraianDetail::class,
                self::KINERJA => KinerjaBukuKasUmumUraianDetail::class,
                self::SILPA => SilpaBukuKasUmumUraianDetail::class,
                self::KINERJA_SILPA => KinerjaSilpaBukuKasUmumUraianDetail::class,
            ],
            'penerimaan_dana' => [
                self::REGULER => PenerimaanDana::class,
                self::KINERJA => KinerjaPenerimaanDana::class,
                self::SILPA => SilpaPenerimaanDana::class,
                self::KINERJA_SILPA => KinerjaSilpaPenerimaanDana::class,
            ],
            'penarikan_tunai' => [
                self::REGULER => PenarikanTunai::class,
                self::KINERJA => KinerjaPenarikanTunai::class,
                self::SILPA => SilpaPenarikanTunai::class,
                self::KINERJA_SILPA => KinerjaSilpaPenarikanTunai::class,
            ],
            'setor_tunai' => [
                self::REGULER => SetorTunai::class,
                self::KINERJA => KinerjaSetorTunai::class,
                self::SILPA => SilpaSetorTunai::class,
                self::KINERJA_SILPA => KinerjaSilpaSetorTunai::class,
            ],

            // ── Fitur Pelengkap ─────────────────────────────
            'kwitansi' => [
                self::REGULER => Kwitansi::class,
                self::KINERJA => KinerjaKwitansi::class,
                self::SILPA => SilpaKwitansi::class,
                self::KINERJA_SILPA => KinerjaSilpaKwitansi::class,
            ],
            'tanda_terima' => [
                self::REGULER => TandaTerima::class,
                self::KINERJA => KinerjaTandaTerima::class,
                self::SILPA => SilpaTandaTerima::class,
                self::KINERJA_SILPA => KinerjaSilpaTandaTerima::class,
            ],
            'dokumen' => [
                self::REGULER => Dokumen::class,
                self::KINERJA => KinerjaDokumen::class,
                self::SILPA => SilpaDokumen::class,
                self::KINERJA_SILPA => KinerjaSilpaDokumen::class,
            ],
            'bast' => [
                self::REGULER => \App\Models\Bast::class,
                self::KINERJA => \App\Models\KinerjaBast::class,
                self::SILPA => \App\Models\SilpaBast::class,
                self::KINERJA_SILPA => \App\Models\KinerjaSilpaBast::class,
            ],
            'surat_pesanan' => [
                self::REGULER => \App\Models\SuratPesanan::class,
                self::KINERJA => \App\Models\KinerjaSuratPesanan::class,
                self::SILPA => \App\Models\SilpaSuratPesanan::class,
                self::KINERJA_SILPA => \App\Models\KinerjaSilpaSuratPesanan::class,
            ],

            // ── Laporan ─────────────────────────────────────
            'spmth' => [
                self::REGULER => Spmth::class,
                self::KINERJA => KinerjaSpmth::class,
                self::SILPA => SilpaSpmth::class,
                self::KINERJA_SILPA => KinerjaSilpaSpmth::class,
            ],
            'sptj' => [
                self::REGULER => Sptj::class,
                self::KINERJA => KinerjaSptj::class,
                self::SILPA => SilpaSptj::class,
                self::KINERJA_SILPA => KinerjaSilpaSptj::class,
            ],
            'sp2b' => [
                self::REGULER => Sp2b::class,
                self::KINERJA => KinerjaSp2b::class,
                self::SILPA => SilpaSp2b::class,
                self::KINERJA_SILPA => KinerjaSilpaSp2b::class,
            ],
            'lph' => [
                self::REGULER => Lph::class,
                self::KINERJA => KinerjaLph::class,
                self::SILPA => SilpaLph::class,
                self::KINERJA_SILPA => KinerjaSilpaLph::class,
            ],
            'sts' => [
                self::REGULER => Sts::class,
                self::KINERJA => KinerjaSts::class,
                self::SILPA => SilpaSts::class,
                self::KINERJA_SILPA => KinerjaSilpaSts::class,
            ],

            // ── Rekaman Perubahan ────────────────────────────
            'rekaman_perubahan' => [
                self::REGULER => RekamanPerubahan::class,
                self::KINERJA => KinerjaRekamanPerubahan::class,
            ],
        ];
    }
}
