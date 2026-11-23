import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';

declare const route: (name: string, params?: any, absolute?: boolean) => string;

export type SpjDocumentType =
    | 'tanda_terima'
    | 'bast'
    | 'surat_pesanan'
    | 'spmth'
    | 'sptj'
    | 'sp2b'
    | 'lph';

export const SPJ_CUSTOM_FORM_DOC_TYPES: SpjDocumentType[] = [
    'bast',
    'surat_pesanan',
    'spmth',
    'sptj',
    'sp2b',
    'lph',
];

export interface SpjCustomTemplate {
    id: number;
    document_type: SpjDocumentType;
    nama: string;
    deskripsi: string | null;
    original_filename: string;
    file_size: number;
    has_item_table: boolean;
    detected_variables: {
        recognized: string[];
        unrecognized: string[];
        unclosed: string[];
        item_table_vars: string[];
        image_vars: string[];
    };
    creator_name: string | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface SpjVariableItem {
    key: string;
    tag: string;
    label: string;
    example: string;
}

export interface SpjVariableGroup {
    group: string;
    type: 'text' | 'table' | 'image';
    description: string;
    items: SpjVariableItem[];
}

export type SpjSelectedFormat = 'default' | `custom:${number}`;

export function parseSpjCustomTemplateId(format: SpjSelectedFormat): number | null {
    if (format.startsWith('custom:')) {
        const parsed = Number(format.slice('custom:'.length));
        return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
    }

    return null;
}

export const SPJ_DOCUMENT_LABELS: Record<SpjDocumentType, string> = {
    tanda_terima: 'Tanda Terima',
    bast: 'BAST',
    surat_pesanan: 'Surat Pesanan',
    spmth: 'SPMTH',
    sptj: 'SPTJ',
    sp2b: 'SP2B',
    lph: 'LPH',
};

export interface SpjCustomFormVariable {
    key: string;
    tag: string;
    label: string;
    isLongText: boolean;
    templateNames: string[];
}

const CUSTOM_VAR_ABBREVIATIONS: Record<string, string> = {
    no: 'Nomor',
    nomor: 'Nomor',
    tgl: 'Tanggal',
    tanggal: 'Tanggal',
    thn: 'Tahun',
    tahun: 'Tahun',
    bln: 'Bulan',
    bulan: 'Bulan',
    nip: 'NIP',
    npsn: 'NPSN',
    npwp: 'NPWP',
    sk: 'SK',
    spk: 'SPK',
    bast: 'BAST',
    sp: 'SP',
    bosp: 'BOSP',
    bos: 'BOS',
    rkas: 'RKAS',
    bku: 'BKU',
    ta: 'TA',
    ttd: 'TTD',
    rt: 'RT',
    rw: 'RW',
    nik: 'NIK',
    hp: 'HP',
    wa: 'WA',
    kepsek: 'Kepala Sekolah',
};

export function formatSpjCustomVariableLabel(rawTag: string): string {
    const cleaned = rawTag
        .replace(/^\$\{?|\}?$/g, '')
        .trim()
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[_\-.]+/g, ' ')
        .trim();

    if (!cleaned) {
        return rawTag;
    }

    return cleaned
        .split(/\s+/)
        .map((word) => {
            const lower = word.toLowerCase();
            if (CUSTOM_VAR_ABBREVIATIONS[lower]) {
                return CUSTOM_VAR_ABBREVIATIONS[lower];
            }
            return lower.charAt(0).toUpperCase() + lower.slice(1);
        })
        .join(' ');
}

export function isLongSpjCustomVariableField(rawKey: string): boolean {
    const lower = rawKey.toLowerCase();
    return (
        lower.includes('alamat') ||
        lower.includes('uraian') ||
        lower.includes('catatan') ||
        lower.includes('deskripsi') ||
        lower.includes('ketentuan') ||
        lower.includes('keterangan') ||
        lower.includes('syarat')
    );
}

/**
 * Kumpulkan daftar tag kustom (di luar katalog variabel sistem) untuk ditampilkan sebagai input form
 * pada Tambah/Edit BAST dan Surat Pesanan.
 * - Jika ada template kustom yang sedang dipilih di toolbar, tampilkan tag kustom dari template tersebut.
 * - Jika toolbar masih di Format Standar, gabungkan seluruh tag kustom unik dari semua template yang tersimpan.
 */
export function resolveSpjCustomFormVariables(
    templates: SpjCustomTemplate[],
    activeTemplate: SpjCustomTemplate | null,
): SpjCustomFormVariable[] {
    const sourceTemplates = activeTemplate ? [activeTemplate] : templates;
    const byKey = new Map<string, { templateNames: Set<string> }>();

    for (const tpl of sourceTemplates) {
        const unrecognized = tpl.detected_variables?.unrecognized ?? [];
        for (const rawKey of unrecognized) {
            const key = String(rawKey ?? '')
                .replace(/^\$\{?|\}?$/g, '')
                .trim();
            if (!key) continue;

            const existing = byKey.get(key);
            if (existing) {
                existing.templateNames.add(tpl.nama);
            } else {
                byKey.set(key, { templateNames: new Set([tpl.nama]) });
            }
        }
    }

    return Array.from(byKey.entries()).map(([key, meta]) => ({
        key,
        tag: `\${${key}}`,
        label: formatSpjCustomVariableLabel(key),
        isLongText: isLongSpjCustomVariableField(key),
        templateNames: Array.from(meta.templateNames),
    }));
}

export function resolveCanManageSpjTemplates(pageProps: any, docType: SpjDocumentType): boolean {
    const auth = pageProps?.auth;
    const permissionModule = ['spmth', 'sptj', 'sp2b', 'lph'].includes(docType) ? 'laporan' : docType;
    if (auth?.permissions?.modules && typeof auth.permissions.modules === 'object') {
        return auth.permissions.modules[permissionModule] === 'write';
    }

    return !Boolean(auth?.user?.is_kepala_sekolah);
}

export function useSpjCustomTemplates(docType: SpjDocumentType) {
    const [templates, setTemplates] = useState<SpjCustomTemplate[]>([]);
    const [variableCatalog, setVariableCatalog] = useState<SpjVariableGroup[]>([]);
    const [libreOfficeAvailable, setLibreOfficeAvailable] = useState<boolean>(true);
    const [loadingTemplates, setLoadingTemplates] = useState<boolean>(false);
    const [selectedFormat, setSelectedFormat] = useState<SpjSelectedFormat>('default');

    const fetchTemplates = useCallback(
        async (signal?: AbortSignal) => {
            setLoadingTemplates(true);
            try {
                const response = await axios.get(
                    route('api.spj-templates.index', { type: docType }),
                    signal ? { signal } : undefined,
                );
                if (signal?.aborted) {
                    return;
                }
                if (response.data?.success) {
                    const list: SpjCustomTemplate[] = Array.isArray(response.data.data) ? response.data.data : [];
                    setTemplates(list);
                    setVariableCatalog(
                        Array.isArray(response.data.variable_catalog) ? response.data.variable_catalog : [],
                    );
                    setLibreOfficeAvailable(Boolean(response.data.libreoffice_available));

                    setSelectedFormat((prev) => {
                        const activeId = parseSpjCustomTemplateId(prev);
                        if (activeId !== null && !list.some((t) => t.id === activeId)) {
                            return 'default';
                        }
                        return prev;
                    });
                }
            } catch (error) {
                if (axios.isCancel(error) || signal?.aborted) {
                    return;
                }
                console.error(`Error fetching ${docType} custom templates:`, error);
            } finally {
                if (!signal?.aborted) {
                    setLoadingTemplates(false);
                }
            }
        },
        [docType],
    );

    useEffect(() => {
        const controller = new AbortController();
        fetchTemplates(controller.signal);

        return () => {
            controller.abort();
        };
    }, [fetchTemplates]);

    const activeCustomTemplateId = parseSpjCustomTemplateId(selectedFormat);
    const activeCustomTemplate =
        activeCustomTemplateId !== null
            ? templates.find((t) => t.id === activeCustomTemplateId) ?? null
            : null;

    return {
        templates,
        variableCatalog,
        libreOfficeAvailable,
        loadingTemplates,
        selectedFormat,
        setSelectedFormat,
        activeCustomTemplateId,
        activeCustomTemplate,
        fetchTemplates,
    };
}
