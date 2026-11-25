export type SpjPeriodeType = 'tahap_1' | 'tahap_2' | 'bulan' | 'rentang_bulan' | 'tahunan';
export type SpjPaperSize = 'A4' | 'F4' | 'Legal' | 'Letter';
export type SpjOrientation = 'portrait' | 'landscape';
export type SpjFontSize = '8pt' | '9pt' | '10pt' | '11pt' | '12pt';
export type SpjPrintParamSchema = 'snake' | 'camel' | 'realisasi' | 'none';
export type SpjGroupingMode = 'per_jenis' | 'per_bulan';
export type SpjSp2bMode = 'tahap' | 'bulan';

export interface SpjSp2bModeOption {
    id: SpjSp2bMode;
    label: string;
    count: number;
}

export interface SpjItemPrintSettings {
    paper_size: SpjPaperSize;
    orientation: SpjOrientation;
    font_size: SpjFontSize;
}
export type SpjCoverLayoutKey =
    | 'editorial'
    | 'instansi_elegan'
    | 'geometris'
    | 'neo_bento'
    | 'photo_hero'
    | 'bosp_wave'
    | 'split_magazine'
    | 'aurora_glass'
    | 'nusantara_heritage'
    | 'swiss_ribbon';
export type SpjCoverLayoutCategory = 'resmi' | 'eksekutif';
export type SpjPhotoFocus = 'top' | 'center' | 'bottom';
export type SpjPhotoBlend = 'vivid' | 'balanced' | 'soft';
export type SpjCoverPaletteKey =
    | 'navy_gold'
    | 'royal_bosp'
    | 'emerald'
    | 'indigo_sikas'
    | 'teal_modern'
    | 'burgundy'
    | 'slate_mono'
    | 'custom';
export type SpjAttachmentCategory = 'sk_tim' | 'rekening_koran' | 'pajak' | 'lainnya';
export type SpjAttachmentPeriodeTag = 'umum' | 'tahap_1' | 'tahap_2' | 'tahunan';

export interface SpjMonthInfo {
    number: number;
    name: string;
    slug: string;
}

export interface SpjTemplateOption {
    id: string;
    label: string;
    is_custom: boolean;
    template_id: number | null;
}

export interface SpjPdfChunk {
    id: string;
    label: string;
    url: string;
    fallback_url: string;
    urls_by_template: Record<string, string>;
    month: number | null;
    is_custom_template: boolean;
}

export interface SpjDocumentItemManifest {
    key: string;
    label: string;
    chapter_key: string;
    status: 'ready' | 'partial' | 'empty';
    count: number;
    summary_text: string;
    shortcut_url: string | null;
    default_enabled: boolean;
    default_template: string;
    available_templates: SpjTemplateOption[];
    default_paper_size: SpjPaperSize;
    default_orientation: SpjOrientation;
    default_font_size: SpjFontSize;
    print_param_schema: SpjPrintParamSchema;
    is_external?: boolean;
    attachment_id?: number;
    sp2b_active_mode?: SpjSp2bMode;
    sp2b_mode_options?: SpjSp2bModeOption[];
    chunks: SpjPdfChunk[];
}

export interface SpjChapterManifest {
    key: string;
    roman: string;
    title: string;
    subtitle: string;
    items: SpjDocumentItemManifest[];
}

export interface SpjExternalAttachmentItem {
    id: number;
    judul: string;
    kategori: SpjAttachmentCategory;
    periode_tag: SpjAttachmentPeriodeTag;
    original_filename: string;
    file_size: number;
    sort_order: number;
    stream_url: string;
}

export interface SpjCoverConfig {
    layout: SpjCoverLayoutKey;
    palette: SpjCoverPaletteKey;
    custom_primary: string;
    custom_accent: string;
    ink_saver: boolean;
    instansi_atas: string;
    badge_dokumen: string;
    judul_utama: string;
    subjudul_override: string;
    label_jilid: string;
    nama_sekolah_override: string;
    alamat_override: string;
    kontak_sekolah_override: string;
    show_logo_daerah: boolean;
    show_logo_sekolah: boolean;
    show_logo_bosp: boolean;
    show_foto_sekolah: boolean;
    photo_focus: SpjPhotoFocus;
    photo_blend: SpjPhotoBlend;
    show_ringkasan_keuangan: boolean;
    show_qr_code: boolean;
    show_penanggung_jawab: boolean;
    show_geometric_pattern: boolean;
    photo_path: string | null;
    photo_data_uri?: string | null;
    kepala_sekolah_override: string;
    nip_kepala_sekolah_override: string;
    bendahara_override: string;
    nip_bendahara_override: string;
}

export interface SpjBundleConfig {
    include_cover: boolean;
    include_toc: boolean;
    include_dividers: boolean;
    include_page_numbers: boolean;
    chapter_order: string[];
    item_order_by_chapter: Record<string, string[]>;
    enabled_items: Record<string, boolean>;
    selected_templates: Record<string, string>;
    item_print_settings: Record<string, SpjItemPrintSettings>;
    sp2b_mode?: SpjSp2bMode;
}

export interface SpjManifest {
    meta: {
        variant: string;
        variant_label: string;
        is_silpa: boolean;
        tahun: number;
        penganggaran_id: number | null;
        has_penganggaran: boolean;
        periode_type: SpjPeriodeType;
        periode_label: string;
        bulan_awal: number;
        bulan_akhir: number;
        start_date: string;
        end_date: string;
        months: SpjMonthInfo[];
        available_years: number[];
        paper_size: SpjPaperSize;
        grouping_mode: SpjGroupingMode;
        sp2b_mode: SpjSp2bMode;
        libreoffice_available: boolean;
        generated_at_formatted: string;
    };
    sekolah: {
        nama_sekolah: string;
        npsn: string;
        status_sekolah: string;
        jenjang_sekolah: string;
        alamat_lengkap: string;
        kelurahan_desa?: string;
        kecamatan: string;
        kabupaten_kota: string;
        provinsi: string;
        logo_daerah_data_uri: string | null;
        logo_sekolah_data_uri: string | null;
        foto_sekolah_data_uri?: string | null;
    };
    penanggung_jawab: {
        kepala_sekolah: string;
        nip_kepala_sekolah: string;
        bendahara: string;
        nip_bendahara: string;
        komite: string;
    };
    ringkasan_keuangan: {
        pagu_anggaran: number;
        dana_diterima: number;
        total_realisasi: number;
        sisa_dana: number;
        persentase_serapan: number;
        persentase_serapan_aktual: number;
        jumlah_transaksi: number;
    };
    preset: {
        id: number;
        nama_preset: string;
        cover_config: Partial<SpjCoverConfig>;
        bundle_config: Partial<SpjBundleConfig>;
    } | null;
    chapters: SpjChapterManifest[];
    external_attachments: SpjExternalAttachmentItem[];
    readiness_summary: {
        ready: number;
        partial: number;
        empty: number;
        total_items: number;
        total_chunks: number;
    };
}

export interface TocEntry {
    kind: 'chapter' | 'item';
    chapterKey: string;
    roman?: string;
    title: string;
    pageNumber: number;
    pageCount: number;
}

export interface AssemblyTaskChunk {
    chunkId: string;
    chapterKey: string;
    chapterRoman: string;
    chapterTitle: string;
    itemKey: string;
    itemLabel: string;
    chunkLabel: string;
    url: string;
    fallbackUrl: string;
    isCustomTemplate: boolean;
}

export interface AssemblyFailure {
    task: AssemblyTaskChunk;
    reason: string;
    canFallbackToDefault: boolean;
}

export interface AssemblyProgress {
    stage: 'idle' | 'capturing_cover' | 'fetching_chunks' | 'building_toc' | 'finalizing' | 'needs_resolution' | 'completed' | 'cancelled' | 'error';
    completedCount: number;
    totalCount: number;
    currentLabel: string;
    pagesCollected: number;
}

export interface AssembledChapterMeta {
    chapterKey: string;
    roman: string;
    title: string;
    startPage: number;
    pageCount: number;
    pageIndices: number[];
}

export interface AssembledBundleResult {
    fullPdfBytes: Uint8Array;
    totalPages: number;
    portraitPageCount: number;
    landscapePageCount: number;
    portraitPageIndices: number[];
    landscapePageIndices: number[];
    tocEntries: TocEntry[];
    chapters: AssembledChapterMeta[];
    failures: AssemblyFailure[];
    fileBaseName: string;
}
