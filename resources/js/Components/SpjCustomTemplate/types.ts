import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';

declare const route: (name: string, params?: any, absolute?: boolean) => string;

export type SpjDocumentType = 'tanda_terima' | 'bast' | 'surat_pesanan';

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
};

export function resolveCanManageSpjTemplates(pageProps: any, docType: SpjDocumentType): boolean {
    const auth = pageProps?.auth;
    if (auth?.permissions?.modules && typeof auth.permissions.modules === 'object') {
        return auth.permissions.modules[docType] === 'write';
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
