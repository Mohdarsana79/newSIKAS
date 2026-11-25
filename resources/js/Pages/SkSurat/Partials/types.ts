export interface SkTagItem {
    key: string;
    tag: string;
    label: string;
    example: string;
    aliases?: string[];
}

export interface SkTagGroup {
    id: string;
    group: string;
    source: string;
    source_label: string;
    type: 'text' | 'table' | 'image';
    table_group?: 'item' | 'ptk' | 'belanja';
    description: string;
    items: SkTagItem[];
}

export interface SkSystemTextVariable {
    raw: string;
    canonical: string;
    label: string;
    source: string;
    source_label: string;
}

export interface SkTemplateClassification {
    system_text: SkSystemTextVariable[];
    table_groups: Partial<Record<'item' | 'ptk' | 'belanja', string[]>>;
    image_vars: string[];
    manual_vars: string[];
    required_sources: string[];
}

export interface SkTemplateTagMapping {
    text_map: Record<string, string>;
    enabled_tags: string[];
    enabled_tables: Array<'item' | 'ptk' | 'belanja'>;
    enabled_images: Array<'kop_surat' | 'logo_sekolah' | 'logo_daerah'>;
}

export interface SkTemplate {
    id: number;
    folder_id?: number;
    judul: string;
    file_path?: string;
    file_name_original: string;
    detected_variables: string[] | null;
    tag_mappings?: SkTemplateTagMapping | null;
    variable_classification?: SkTemplateClassification;
    created_at: string;
    user?: { id: number; name: string };
}

export interface SkTableRowsPreview {
    item: Record<string, string>[];
    ptk: Record<string, string>[];
    belanja: Record<string, string>[];
}

export interface SkSumberDataState {
    variant: string;
    penganggaran_id: number | null;
    bku_id: number | null;
    bku_ids: number[];
    penerimaan_id: number | null;
    ptk_id: number | null;
    ptk_ids: number[];
    tag_mappings?: SkTemplateTagMapping;
    enabled_tables?: Array<'item' | 'ptk' | 'belanja'>;
    enabled_images?: Array<'kop_surat' | 'logo_sekolah' | 'logo_daerah'>;
    table_rows?: SkTableRowsPreview;
}

export interface SkDokumen {
    id: number;
    folder_id: number;
    template_id: number;
    tipe: 'generated' | 'uploaded';
    nomor_surat: string | null;
    perihal: string;
    tanggal_surat: string | null;
    data_isian: Record<string, any> | null;
    sumber_data?: Partial<SkSumberDataState> | null;
    file_path: string | null;
    file_name_original: string | null;
    keterangan: string | null;
    created_at: string;
    template?: SkTemplate;
    user?: { id: number; name: string };
}

export interface SkDataSourceOptions {
    variants: Array<{ value: string; label: string }>;
    active_variant: string;
    penganggarans: Array<{
        id: number;
        tahun_anggaran: number;
        pagu_anggaran: number;
        pagu_anggaran_rupiah: string;
        kepala_sekolah: string;
        bendahara: string;
        bku_count?: number;
        penerimaan_count?: number;
        label: string;
    }>;
    active_penganggaran_id: number | null;
    bku_items: Array<{
        id: number;
        no_bukti: string;
        tanggal: string;
        bulan: number | null;
        uraian: string;
        toko: string;
        kode_kegiatan: string;
        kode_rekening: string;
        total: number;
        total_rupiah: string;
        items_count: number;
        label: string;
    }>;
    penerimaans: Array<{
        id: number;
        sumber_dana: string;
        tanggal: string;
        jumlah: number;
        jumlah_rupiah: string;
        label: string;
    }>;
    ptk_years: number[];
    active_ptk_tahun: number;
    ptks: Array<{
        id: number;
        tahun: number;
        nama: string;
        nuptk: string;
        jenis: string;
        jenis_ptk_arkas: number;
        jenis_kelamin: string;
        label: string;
    }>;
}

/**
 * RBAC helper: selaras dengan backend canAccessModule('sk_surat', 'write'),
 * dengan fallback aman bila prop permissions tidak tersedia.
 */
export function canWriteSkSurat(auth: any): boolean {
    const level = auth?.permissions?.modules?.sk_surat;
    if (typeof level === 'string') {
        return level === 'write';
    }
    return !(auth?.user?.is_kepala_sekolah ?? false);
}
