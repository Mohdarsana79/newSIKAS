@php
    $s = $sekolah ?? ($anggaran['sekolah'] ?? ($anggaran->sekolah ?? null));
    $profile = null;
    $getProfile = function () use (&$profile) {
        if ($profile === null && class_exists(\App\Models\SekolahProfile::class)) {
            $profile = \App\Models\SekolahProfile::first();
        }
        return $profile;
    };

    $kopSurat = is_array($s) ? ($s['kop_surat'] ?? null) : ($s->kop_surat ?? null);
    if (empty($kopSurat) && ($p = $getProfile())) {
        $kopSurat = $p->kop_surat;
    }

    $logoDaerah = is_array($s) ? ($s['logo_daerah'] ?? null) : ($s->logo_daerah ?? null);
    if (empty($logoDaerah) && ($p = $getProfile())) {
        $logoDaerah = $p->logo_daerah;
    }

    $logoSekolah = is_array($s) ? ($s['logo_sekolah'] ?? null) : ($s->logo_sekolah ?? null);
    if (empty($logoSekolah) && ($p = $getProfile())) {
        $logoSekolah = $p->logo_sekolah;
    }

    $kopMode = is_array($s) ? ($s['kop_mode'] ?? null) : ($s->kop_mode ?? null);
    if (empty($kopMode) && ($p = $getProfile())) {
        $kopMode = $p->kop_mode ?? '2_logo';
    }

    $kopTeksHtml = is_array($s) ? ($s['kop_teks_html'] ?? null) : ($s->kop_teks_html ?? null);
    if (empty($kopTeksHtml) && ($p = $getProfile())) {
        $kopTeksHtml = $p->kop_teks_html;
    }

    $kopBorder = is_array($s) ? ($s['kop_border'] ?? null) : ($s->kop_border ?? null);
    if (empty($kopBorder) && ($p = $getProfile())) {
        $kopBorder = $p->kop_border ?? 'double';
    }

    $kopDokumen = is_array($s) ? ($s['kop_dokumen'] ?? null) : ($s->kop_dokumen ?? null);
    if (empty($kopDokumen) && ($p = $getProfile())) {
        $kopDokumen = $p->kop_dokumen ?? [];
    }
    if (is_string($kopDokumen)) {
        $kopDokumen = json_decode($kopDokumen, true) ?? [];
    }

    $hasKop = (!empty($kopSurat) || !empty($kopTeksHtml)) && !empty($kopDokumen[$docKey ?? '']) && !($is_excel ?? false);

    $getDataUri = function ($path) {
        if (empty($path)) {
            return null;
        }
        $clean = str_replace('public/', '', $path);
        $fullPath = public_path('storage/' . $clean);
        if (!file_exists($fullPath)) {
            $fullPath = storage_path('app/public/' . $clean);
        }
        if (file_exists($fullPath)) {
            $mime = @mime_content_type($fullPath) ?: 'image/png';
            return 'data:' . $mime . ';base64,' . base64_encode(file_get_contents($fullPath));
        }
        return null;
    };

    $logoDaerahUri = $hasKop ? $getDataUri($logoDaerah) : null;
    $logoSekolahUri = $hasKop ? $getDataUri($logoSekolah) : null;
    $kopDataUri = ($hasKop && empty($kopTeksHtml)) ? $getDataUri($kopSurat) : null;
@endphp

@if ($hasKop)
    <div style="margin-bottom: 12px; width: 100%;">
        @if (!empty($kopTeksHtml))
            @once
                <style>
                    .doc-kop-table {
                        width: auto !important;
                        margin: 0 auto 3px auto !important;
                        border-collapse: collapse !important;
                        border: none !important;
                    }
                    .doc-kop-table td {
                        border: none !important;
                        padding: 0 !important;
                        vertical-align: middle !important;
                    }
                    .doc-kop-table .kop-logo-left {
                        width: 75px !important;
                        text-align: right !important;
                        padding-right: 18px !important;
                        vertical-align: middle !important;
                        border: none !important;
                    }
                    .doc-kop-table .kop-logo-right {
                        width: 75px !important;
                        text-align: left !important;
                        padding-left: 18px !important;
                        vertical-align: middle !important;
                        border: none !important;
                    }
                    .doc-kop-table .kop-logo-img {
                        max-height: 75px !important;
                        max-width: 75px !important;
                        height: auto !important;
                        width: auto !important;
                        display: inline-block !important;
                        vertical-align: middle !important;
                    }
                    .doc-kop-table .kop-text-cell {
                        text-align: center !important;
                        padding: 0 !important;
                        vertical-align: middle !important;
                        border: none !important;
                    }
                    .doc-kop-table .kop-text-cell p {
                        margin: 0 !important;
                        padding: 0 !important;
                        line-height: 1.15 !important;
                    }
                    .doc-kop-table .kop-text-cell h1,
                    .doc-kop-table .kop-text-cell h2,
                    .doc-kop-table .kop-text-cell h3 {
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                </style>
            @endonce
            <table class="doc-kop-table">
                <tr>
                    <td class="kop-logo-left">
                        @if ($logoDaerahUri)
                            <img src="{{ $logoDaerahUri }}" class="kop-logo-img" alt="Logo Daerah">
                        @else
                            <div style="width: 75px;"></div>
                        @endif
                    </td>
                    <td class="kop-text-cell">
                        {!! $kopTeksHtml !!}
                    </td>
                    <td class="kop-logo-right">
                        @if ($kopMode === '2_logo' && $logoSekolahUri)
                            <img src="{{ $logoSekolahUri }}" class="kop-logo-img" alt="Logo Sekolah">
                        @else
                            <div style="width: 75px;"></div>
                        @endif
                    </td>
                </tr>
            </table>
        @elseif (!empty($kopDataUri))
            <div style="text-align: center; margin-bottom: 3px;">
                <img src="{{ $kopDataUri }}" style="max-height: 95px; width: auto; max-width: 100%; display: block; margin: 0 auto;" alt="Kop Surat">
            </div>
        @endif

        @include('partials.kop_border', ['border' => $kopBorder ?? 'double'])
    </div>
@endif
