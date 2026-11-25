import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import IconTile from '@/Components/ui/IconTile';
import PageHeader from '@/Components/ui/PageHeader';
import PillTabs from '@/Components/ui/PillTabs';
import StatusBadge from '@/Components/ui/StatusBadge';
import Surface from '@/Components/ui/Surface';
import useVariantRoute from '@/Hooks/useVariantRoute';
import type { PageProps } from '@/types';
import { canAccessFeatureModule } from '@/Utils/featureSearchCatalog';
import { Head, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import {
    AlertCircle,
    BookOpen,
    CheckCircle2,
    Clock,
    FileCheck2,
    FileStack,
    Layers,
    Loader2,
    Maximize2,
    Palette,
    Printer,
    Save,
    Sparkles,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AssemblyProgressModal from './components/AssemblyProgressModal';
import BundleChecklist from './components/BundleChecklist';
import CoverCanvas from './components/CoverStudio/CoverCanvas';
import CoverControlPanel from './components/CoverStudio/CoverControlPanel';
import {
    COVER_LAYOUT_LIST,
    createDefaultCoverConfig,
    resolveCoverPalette,
    resolveSchoolPhotoUri,
} from './components/CoverStudio/coverThemes';
import SectionDividerCanvas from './components/CoverStudio/SectionDividerCanvas';
import ExternalAttachmentManager from './components/ExternalAttachmentManager';
import ItemPrintSettingsModal from './components/ItemPrintSettingsModal';
import {
    SPJ_PAPER_SPECS,
    applyItemPrintSettingsToUrl,
    buildSingleCoverPdfBytes,
    captureCanvasElementToPngBytes,
    fetchAllChunksWithConcurrency,
    finalizeAssembledBundle,
    triggerBytesDownload,
} from './services/spjPdfAssembler';
import type {
    AssembledBundleResult,
    AssemblyFailure,
    AssemblyProgress,
    AssemblyTaskChunk,
    SpjAttachmentCategory,
    SpjAttachmentPeriodeTag,
    SpjBundleConfig,
    SpjChapterManifest,
    SpjCoverConfig,
    SpjDocumentItemManifest,
    SpjGroupingMode,
    SpjManifest,
    SpjPaperSize,
    SpjPeriodeType,
    SpjSp2bMode,
} from './types';

interface CetakSpjPageProps {
    variant: string;
    routePrefix: string;
    initialManifest: SpjManifest;
}

const VARIANT_SWITCHER = [
    { key: 'reguler', label: 'BOSP Reguler', routeName: 'cetak-spj.index' },
    { key: 'kinerja', label: 'BOSP Kinerja', routeName: 'kinerja-cetak-spj.index' },
    { key: 'silpa', label: 'SiLPA Reguler', routeName: 'silpa-cetak-spj.index' },
    { key: 'kinerja_silpa', label: 'SiLPA Kinerja', routeName: 'kinerja-silpa-cetak-spj.index' },
];

const MONTHS_ID = [
    { num: 1, name: 'Januari' },
    { num: 2, name: 'Februari' },
    { num: 3, name: 'Maret' },
    { num: 4, name: 'April' },
    { num: 5, name: 'Mei' },
    { num: 6, name: 'Juni' },
    { num: 7, name: 'Juli' },
    { num: 8, name: 'Agustus' },
    { num: 9, name: 'September' },
    { num: 10, name: 'Oktober' },
    { num: 11, name: 'November' },
    { num: 12, name: 'Desember' },
];

function buildInitialBundleConfig(manifest: SpjManifest): SpjBundleConfig {
    const saved = manifest.preset?.bundle_config ?? {};
    const defaultChapterOrder = manifest.chapters.map((c) => c.key);
    const savedChapterOrder = Array.isArray(saved.chapter_order) ? saved.chapter_order : [];
    const mergedChapterOrder = [
        ...savedChapterOrder.filter((k) => defaultChapterOrder.includes(k)),
        ...defaultChapterOrder.filter((k) => !savedChapterOrder.includes(k)),
    ];

    const enabledItems: Record<string, boolean> = {};
    const selectedTemplates: Record<string, string> = {};
    const itemOrderByChapter: Record<string, string[]> = {};

    for (const ch of manifest.chapters) {
        const defaultItemKeys = ch.items.map((it) => it.key);
        const savedOrder = saved.item_order_by_chapter?.[ch.key] ?? [];
        itemOrderByChapter[ch.key] = [
            ...savedOrder.filter((k) => defaultItemKeys.includes(k)),
            ...defaultItemKeys.filter((k) => !savedOrder.includes(k)),
        ];

        for (const it of ch.items) {
            const hasSavedEnabled =
                saved.enabled_items && Object.prototype.hasOwnProperty.call(saved.enabled_items, it.key);
            enabledItems[it.key] = hasSavedEnabled
                ? Boolean(saved.enabled_items![it.key])
                : it.default_enabled;

            const savedTpl = saved.selected_templates?.[it.key];
            const isValidTpl = savedTpl && it.available_templates.some((t) => t.id === savedTpl);
            selectedTemplates[it.key] = isValidTpl ? savedTpl : it.default_template;
        }
    }

    const savedPrintSettings =
        saved.item_print_settings && typeof saved.item_print_settings === 'object'
            ? { ...saved.item_print_settings }
            : {};

    return {
        include_cover: saved.include_cover ?? true,
        include_toc: saved.include_toc ?? true,
        include_dividers: saved.include_dividers ?? true,
        include_page_numbers: saved.include_page_numbers ?? false,
        chapter_order: mergedChapterOrder,
        item_order_by_chapter: itemOrderByChapter,
        enabled_items: enabledItems,
        selected_templates: selectedTemplates,
        item_print_settings: savedPrintSettings,
        sp2b_mode: manifest.meta.sp2b_mode,
    };
}

function buildInitialCoverConfig(manifest: SpjManifest): SpjCoverConfig {
    const defaults = createDefaultCoverConfig(manifest);
    const saved = manifest.preset?.cover_config ?? {};
    const str = (val: unknown, fallback: string): string =>
        typeof val === 'string' ? val : fallback;

    const validLayouts = new Set(COVER_LAYOUT_LIST.map((l) => l.key));
    const resolvedLayout =
        saved.layout && validLayouts.has(saved.layout) ? saved.layout : defaults.layout;
    const resolvedFocus =
        saved.photo_focus === 'top' ||
        saved.photo_focus === 'center' ||
        saved.photo_focus === 'bottom'
            ? saved.photo_focus
            : defaults.photo_focus;
    const resolvedBlend =
        saved.photo_blend === 'vivid' ||
        saved.photo_blend === 'balanced' ||
        saved.photo_blend === 'soft'
            ? saved.photo_blend
            : defaults.photo_blend;

    return {
        ...defaults,
        ...saved,
        layout: resolvedLayout,
        photo_focus: resolvedFocus,
        photo_blend: resolvedBlend,
        show_logo_bosp:
            typeof saved.show_logo_bosp === 'boolean'
                ? saved.show_logo_bosp
                : defaults.show_logo_bosp,
        show_foto_sekolah:
            typeof saved.show_foto_sekolah === 'boolean'
                ? saved.show_foto_sekolah
                : defaults.show_foto_sekolah,
        custom_primary: str(saved.custom_primary, defaults.custom_primary) || defaults.custom_primary,
        custom_accent: str(saved.custom_accent, defaults.custom_accent) || defaults.custom_accent,
        instansi_atas: str(saved.instansi_atas, defaults.instansi_atas),
        badge_dokumen: str(saved.badge_dokumen, defaults.badge_dokumen),
        judul_utama: str(saved.judul_utama, defaults.judul_utama),
        subjudul_override: str(saved.subjudul_override, ''),
        label_jilid: str(saved.label_jilid, ''),
        nama_sekolah_override: str(saved.nama_sekolah_override, ''),
        alamat_override: str(saved.alamat_override, ''),
        kontak_sekolah_override: str(saved.kontak_sekolah_override, ''),
        kepala_sekolah_override: str(saved.kepala_sekolah_override, ''),
        nip_kepala_sekolah_override: str(saved.nip_kepala_sekolah_override, ''),
        bendahara_override: str(saved.bendahara_override, ''),
        nip_bendahara_override: str(saved.nip_bendahara_override, ''),
    };
}

export default function CetakSpjIndex({ variant, initialManifest }: CetakSpjPageProps) {
    const vRoute = useVariantRoute();
    const { props } = usePage<PageProps>();
    const canWrite = canAccessFeatureModule(props.auth?.user, props.auth?.permissions, 'cetak_spj', 'write');

    const [manifest, setManifest] = useState<SpjManifest>(initialManifest);
    const [activeTab, setActiveTab] = useState<'bundle' | 'cover'>('bundle');
    const [previewTab, setPreviewTab] = useState<'cover' | 'divider' | 'toc'>('cover');
    const [previewDividerKey, setPreviewDividerKey] = useState<string>('penganggaran');

    // Global filter state
    const [tahun, setTahun] = useState<number>(initialManifest.meta.tahun);
    const [periodeType, setPeriodeType] = useState<SpjPeriodeType>(initialManifest.meta.periode_type);
    const [bulanAwal, setBulanAwal] = useState<number>(initialManifest.meta.bulan_awal);
    const [bulanAkhir, setBulanAkhir] = useState<number>(initialManifest.meta.bulan_akhir);
    const [paperSize, setPaperSize] = useState<SpjPaperSize>(initialManifest.meta.paper_size);
    const [groupingMode, setGroupingMode] = useState<SpjGroupingMode>(initialManifest.meta.grouping_mode);
    const [sp2bMode, setSp2bMode] = useState<SpjSp2bMode>(initialManifest.meta.sp2b_mode);

    const [coverConfig, setCoverConfig] = useState<SpjCoverConfig>(() =>
        buildInitialCoverConfig(initialManifest),
    );
    const [bundleConfig, setBundleConfig] = useState<SpjBundleConfig>(() =>
        buildInitialBundleConfig(initialManifest),
    );

    const [isFetchingManifest, setIsFetchingManifest] = useState(false);
    const manifestReqSeqRef = useRef(0);
    const [isSavingPreset, setIsSavingPreset] = useState(false);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
    const [isExportingCover, setIsExportingCover] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [settingsModalTarget, setSettingsModalTarget] = useState<{
        chapter: SpjChapterManifest;
        item: SpjDocumentItemManifest;
    } | null>(null);

    // Live preview scale & interactive zoom
    const previewContainerRef = useRef<HTMLDivElement>(null);
    const [autoPreviewScale, setAutoPreviewScale] = useState<number>(0.65);
    const [zoomOverride, setZoomOverride] = useState<'auto' | number>('auto');
    const [isFullscreenPreview, setIsFullscreenPreview] = useState<boolean>(false);
    const previewScale = zoomOverride === 'auto' ? autoPreviewScale : zoomOverride;

    // Hidden staging refs for 300 DPI rendering regardless of active tab
    const stageCoverRef = useRef<HTMLDivElement>(null);
    const stageDividerRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // Assembly modal state
    const [isAssemblyOpen, setIsAssemblyOpen] = useState(false);
    const [assemblyProgress, setAssemblyProgress] = useState<AssemblyProgress>({
        stage: 'idle',
        completedCount: 0,
        totalCount: 0,
        currentLabel: '',
        pagesCollected: 0,
    });
    const [assemblyFailures, setAssemblyFailures] = useState<AssemblyFailure[]>([]);
    const [assemblyResult, setAssemblyResult] = useState<AssembledBundleResult | null>(null);
    const [assemblyError, setAssemblyError] = useState<string | null>(null);
    const assemblyAbortRef = useRef<AbortController | null>(null);
    const activeTasksRef = useRef<AssemblyTaskChunk[]>([]);
    const partialFetchedRef = useRef<Map<string, { task: AssemblyTaskChunk; bytes: Uint8Array; pageCount: number }>>(
        new Map(),
    );

    useEffect(() => {
        setManifest(initialManifest);
        setTahun(initialManifest.meta.tahun);
        setPeriodeType(initialManifest.meta.periode_type);
        setBulanAwal(initialManifest.meta.bulan_awal);
        setBulanAkhir(initialManifest.meta.bulan_akhir);
        setPaperSize(initialManifest.meta.paper_size);
        setGroupingMode(initialManifest.meta.grouping_mode);
        setSp2bMode(initialManifest.meta.sp2b_mode);
        setCoverConfig(buildInitialCoverConfig(initialManifest));
        setBundleConfig(buildInitialBundleConfig(initialManifest));
        setFeedback(null);
    }, [initialManifest]);

    // Scale live preview responsively
    useEffect(() => {
        const el = previewContainerRef.current;
        if (!el) return;
        const spec = SPJ_PAPER_SPECS[paperSize];
        const update = () => {
            const avail = el.clientWidth - 28;
            if (avail > 0) {
                setAutoPreviewScale(Math.min(0.86, Math.max(0.35, avail / spec.designWidth)));
            }
        };
        update();
        const obs = new ResizeObserver(update);
        obs.observe(el);
        return () => obs.disconnect();
    }, [paperSize, activeTab, previewTab]);

    // Chapters ordered by bundleConfig.chapter_order
    const orderedChapters = useMemo<SpjChapterManifest[]>(() => {
        const map = new Map(manifest.chapters.map((c) => [c.key, c]));
        const out: SpjChapterManifest[] = [];
        for (const k of bundleConfig.chapter_order) {
            const found = map.get(k);
            if (found) {
                out.push(found);
                map.delete(k);
            }
        }
        for (const rest of map.values()) {
            out.push(rest);
        }
        return out;
    }, [manifest.chapters, bundleConfig.chapter_order]);

    const getOrderedItemsForChapter = useCallback(
        (chapter: SpjChapterManifest): SpjDocumentItemManifest[] => {
            const order = bundleConfig.item_order_by_chapter[chapter.key];
            if (!order || order.length === 0) return chapter.items;
            const map = new Map(chapter.items.map((it) => [it.key, it]));
            const out: SpjDocumentItemManifest[] = [];
            for (const k of order) {
                const found = map.get(k);
                if (found) {
                    out.push(found);
                    map.delete(k);
                }
            }
            for (const rest of map.values()) {
                out.push(rest);
            }
            return out;
        },
        [bundleConfig.item_order_by_chapter],
    );

    // Build flat list of active assembly tasks
    const activeTasks = useMemo<AssemblyTaskChunk[]>(() => {
        const tasks: AssemblyTaskChunk[] = [];
        for (const ch of orderedChapters) {
            const items = getOrderedItemsForChapter(ch);
            for (const item of items) {
                if (!bundleConfig.enabled_items[item.key] || item.chunks.length === 0) continue;
                const tplId = bundleConfig.selected_templates[item.key] || item.default_template;
                const tplMeta = item.available_templates.find((t) => t.id === tplId);
                const isCustomDocx = Boolean(tplMeta?.is_custom);
                const itemOverride = bundleConfig.item_print_settings[item.key];

                for (const chunk of item.chunks) {
                    const rawUrl = chunk.urls_by_template[tplId] || chunk.url;
                    const resolvedUrl = itemOverride
                        ? applyItemPrintSettingsToUrl(
                              rawUrl,
                              item.print_param_schema,
                              itemOverride,
                              isCustomDocx,
                          )
                        : rawUrl;
                    const rawFallback = chunk.fallback_url || chunk.url;
                    const resolvedFallbackUrl = itemOverride
                        ? applyItemPrintSettingsToUrl(
                              rawFallback,
                              item.print_param_schema,
                              itemOverride,
                              false,
                          )
                        : rawFallback;
                    tasks.push({
                        chunkId: chunk.id,
                        chapterKey: ch.key,
                        chapterRoman: ch.roman,
                        chapterTitle: ch.title,
                        itemKey: item.key,
                        itemLabel: item.label,
                        chunkLabel: chunk.label,
                        url: resolvedUrl,
                        fallbackUrl: resolvedFallbackUrl,
                        isCustomTemplate: isCustomDocx,
                    });
                }
            }
        }
        return tasks;
    }, [orderedChapters, getOrderedItemsForChapter, bundleConfig]);

    const selectedItemCount = useMemo(() => {
        let count = 0;
        for (const ch of orderedChapters) {
            for (const it of ch.items) {
                if (bundleConfig.enabled_items[it.key] && it.chunks.length > 0) count++;
            }
        }
        return count;
    }, [orderedChapters, bundleConfig.enabled_items]);

    // Fetch updated manifest when filters change
    const reloadManifest = async (overrides?: {
        tahun?: number;
        periode_type?: SpjPeriodeType;
        bulan_awal?: number;
        bulan_akhir?: number;
        paper_size?: SpjPaperSize;
        grouping_mode?: SpjGroupingMode;
        sp2b_mode?: SpjSp2bMode | 'auto';
    }) => {
        const nextTahun = overrides?.tahun ?? tahun;
        const nextPeriode = overrides?.periode_type ?? periodeType;
        const nextAwal = overrides?.bulan_awal ?? bulanAwal;
        const nextAkhir = overrides?.bulan_akhir ?? bulanAkhir;
        const nextPaper = overrides?.paper_size ?? paperSize;
        const nextGrouping = overrides?.grouping_mode ?? groupingMode;
        const yearChanged = overrides?.tahun !== undefined && overrides.tahun !== tahun;
        const periodeChanged = overrides?.periode_type !== undefined && overrides.periode_type !== periodeType;
        const monthChanged =
            (overrides?.bulan_awal !== undefined && overrides.bulan_awal !== bulanAwal) ||
            (overrides?.bulan_akhir !== undefined && overrides.bulan_akhir !== bulanAkhir);
        const nextSp2bMode =
            overrides?.sp2b_mode !== undefined
                ? overrides.sp2b_mode
                : yearChanged
                  ? undefined
                  : periodeChanged || monthChanged
                    ? 'auto'
                    : sp2bMode;

        const reqId = ++manifestReqSeqRef.current;
        setIsFetchingManifest(true);
        setFeedback(null);
        try {
            const res = await axios.get<{ success: boolean; data: SpjManifest }>(
                vRoute('api.cetak-spj.manifest'),
                {
                    params: {
                        tahun: nextTahun,
                        periode_type: nextPeriode,
                        bulan_awal: nextAwal,
                        bulan_akhir: nextAkhir,
                        paper_size: nextPaper,
                        grouping_mode: nextGrouping,
                        ...(nextSp2bMode !== undefined ? { sp2b_mode: nextSp2bMode } : {}),
                    },
                },
            );
            if (reqId !== manifestReqSeqRef.current) {
                return;
            }
            const nextData = res.data.data;
            const sp2bModeExplicitlyChanged =
                overrides?.sp2b_mode !== undefined && overrides.sp2b_mode !== 'auto';
            setManifest(nextData);
            setSp2bMode(nextData.meta.sp2b_mode);
            if (yearChanged) {
                setCoverConfig(buildInitialCoverConfig(nextData));
            }
            const availableByKey = new Map<string, Set<string>>();
            const defaultTemplateByKey = new Map<string, string>();
            let sp2bHasChunks = false;
            for (const ch of nextData.chapters) {
                for (const it of ch.items) {
                    availableByKey.set(
                        it.key,
                        new Set(it.available_templates.map((t) => t.id)),
                    );
                    defaultTemplateByKey.set(it.key, it.default_template);
                    if (it.key === 'sp2b' && it.chunks.length > 0) {
                        sp2bHasChunks = true;
                    }
                }
            }
            setBundleConfig((prev) => {
                // Pertahankan pilihan item/template pengguna hanya jika valid di manifest baru
                const fresh = buildInitialBundleConfig(nextData);
                const mergedEnabled = { ...fresh.enabled_items };
                const mergedTemplates = { ...fresh.selected_templates };
                for (const k of Object.keys(mergedEnabled)) {
                    if (Object.prototype.hasOwnProperty.call(prev.enabled_items, k)) {
                        mergedEnabled[k] = prev.enabled_items[k];
                    }
                }
                if (sp2bModeExplicitlyChanged && sp2bHasChunks) {
                    mergedEnabled['sp2b'] = true;
                }
                for (const k of Object.keys(mergedTemplates)) {
                    // Saat periode berubah, izinkan default cerdas RKAS (Murni vs Perubahan) mengikuti manifest
                    if (periodeChanged && k.startsWith('rkas_')) {
                        mergedTemplates[k] = defaultTemplateByKey.get(k) ?? mergedTemplates[k];
                        continue;
                    }
                    const prevTpl = prev.selected_templates[k];
                    if (prevTpl && availableByKey.get(k)?.has(prevTpl)) {
                        mergedTemplates[k] = prevTpl;
                    }
                }
                return {
                    ...fresh,
                    include_cover: prev.include_cover,
                    include_toc: prev.include_toc,
                    include_dividers: prev.include_dividers,
                    include_page_numbers: prev.include_page_numbers,
                    enabled_items: mergedEnabled,
                    selected_templates: mergedTemplates,
                    item_print_settings: yearChanged ? fresh.item_print_settings : prev.item_print_settings,
                    sp2b_mode: nextData.meta.sp2b_mode,
                };
            });
        } catch {
            if (reqId === manifestReqSeqRef.current) {
                setFeedback({ type: 'error', text: 'Gagal memuat ulang manifest kesiapan SPJ.' });
            }
        } finally {
            if (reqId === manifestReqSeqRef.current) {
                setIsFetchingManifest(false);
            }
        }
    };

    const handleSavePreset = async () => {
        if (!canWrite) return;
        setIsSavingPreset(true);
        setFeedback(null);
        try {
            await axios.post(vRoute('api.cetak-spj.preset.save'), {
                tahun_anggaran: manifest.meta.tahun,
                nama_preset: 'Default',
                cover_config: coverConfig,
                bundle_config: bundleConfig,
            });
            setFeedback({ type: 'success', text: 'Preset Cover & susunan bendel SPJ berhasil disimpan.' });
        } catch {
            setFeedback({ type: 'error', text: 'Gagal menyimpan konfigurasi Cover & Bendel.' });
        } finally {
            setIsSavingPreset(false);
        }
    };

    const handleUploadCoverPhoto = async (file: File) => {
        if (!canWrite) return;
        setIsUploadingPhoto(true);
        setFeedback(null);
        try {
            const fd = new FormData();
            fd.append('photo', file);
            fd.append('tahun_anggaran', String(manifest.meta.tahun));
            const res = await axios.post<{
                success: boolean;
                data: { photo_path: string; photo_data_uri: string | null };
            }>(vRoute('api.cetak-spj.cover-photo.upload'), fd);

            setManifest((prev) => ({
                ...prev,
                sekolah: {
                    ...prev.sekolah,
                    foto_sekolah_data_uri: res.data.data.photo_data_uri,
                },
            }));
            setCoverConfig((prev) => ({
                ...prev,
                photo_path: res.data.data.photo_path,
                photo_data_uri: res.data.data.photo_data_uri,
                show_foto_sekolah: true,
            }));
            setFeedback({
                type: 'success',
                text: 'Gambar sekolah berhasil diperbarui & siap digunakan lintas varian BOSP.',
            });
        } catch {
            setFeedback({ type: 'error', text: 'Gagal mengunggah foto sekolah (pastikan JPG/PNG/WebP ≤ 3 MB).' });
        } finally {
            setIsUploadingPhoto(false);
        }
    };

    const handleDeleteCoverPhoto = async () => {
        if (!canWrite) return;
        try {
            await axios.delete(vRoute('api.cetak-spj.cover-photo.delete'), {
                data: {
                    photo_path: coverConfig.photo_path,
                    tahun_anggaran: manifest.meta.tahun,
                },
            });
            setManifest((prev) => ({
                ...prev,
                sekolah: {
                    ...prev.sekolah,
                    foto_sekolah_data_uri: null,
                },
            }));
            setCoverConfig((prev) => ({ ...prev, photo_path: null, photo_data_uri: null }));
            setFeedback({ type: 'success', text: 'Gambar sekolah berhasil dihapus.' });
        } catch {
            setFeedback({ type: 'error', text: 'Gagal menghapus foto cover.' });
        }
    };

    const handleUploadAttachment = async (payload: {
        file: File;
        judul: string;
        kategori: SpjAttachmentCategory;
        periode_tag: SpjAttachmentPeriodeTag;
    }) => {
        setIsUploadingAttachment(true);
        setFeedback(null);
        try {
            const fd = new FormData();
            fd.append('file', payload.file);
            fd.append('judul', payload.judul);
            fd.append('kategori', payload.kategori);
            fd.append('tahun_anggaran', String(manifest.meta.tahun));
            fd.append('periode_tag', payload.periode_tag);
            await axios.post(vRoute('api.cetak-spj.attachments.store'), fd);
            await reloadManifest();
            setFeedback({ type: 'success', text: `Lampiran "${payload.judul}" berhasil ditambahkan.` });
        } catch (err: unknown) {
            const msg = axios.isAxiosError(err)
                ? (err.response?.data?.message as string) || 'Gagal mengunggah PDF lampiran.'
                : 'Gagal mengunggah PDF lampiran.';
            setFeedback({ type: 'error', text: msg });
        } finally {
            setIsUploadingAttachment(false);
        }
    };

    const handleUpdateAttachment = async (
        id: number,
        payload: {
            judul: string;
            kategori: SpjAttachmentCategory;
            periode_tag: SpjAttachmentPeriodeTag;
        },
    ) => {
        setFeedback(null);
        try {
            await axios.patch(vRoute('api.cetak-spj.attachments.update', { attachment: id }), payload);
            await reloadManifest();
            setFeedback({ type: 'success', text: `Lampiran "${payload.judul}" berhasil diperbarui.` });
        } catch {
            setFeedback({ type: 'error', text: 'Gagal memperbarui metadata lampiran PDF.' });
        }
    };

    const handleDeleteAttachment = async (id: number) => {
        setFeedback(null);
        try {
            await axios.delete(vRoute('api.cetak-spj.attachments.destroy', { attachment: id }));
            await reloadManifest();
            setFeedback({ type: 'success', text: 'Lampiran PDF berhasil dihapus.' });
        } catch {
            setFeedback({ type: 'error', text: 'Gagal menghapus lampiran PDF.' });
        }
    };

    // Standalone Cover Export
    const handleDownloadCoverOnly = async (format: 'pdf' | 'png') => {
        const node = stageCoverRef.current;
        if (!node) return;
        setIsExportingCover(true);
        setFeedback(null);
        try {
            const palette = resolveCoverPalette(coverConfig);
            const pngBytes = await captureCanvasElementToPngBytes(
                node,
                paperSize,
                coverConfig.ink_saver ? '#FFFFFF' : palette.surfaceTint,
            );
            const baseName = `Cover-SPJ-${manifest.meta.variant}-${manifest.meta.tahun}-${manifest.meta.periode_type}`;
            if (format === 'png') {
                triggerBytesDownload(pngBytes, 'image/png', `${baseName}.png`);
            } else {
                const pdfBytes = await buildSingleCoverPdfBytes(pngBytes, paperSize);
                triggerBytesDownload(pdfBytes, 'application/pdf', `${baseName}.pdf`);
            }
        } catch {
            setFeedback({ type: 'error', text: 'Gagal mengekspor halaman Cover.' });
        } finally {
            setIsExportingCover(false);
        }
    };

    // Core SPJ Assembly Runner
    const runFinalizeStage = async (
        tasks: AssemblyTaskChunk[],
        fetchedMap: Map<string, { task: AssemblyTaskChunk; bytes: Uint8Array; pageCount: number }>,
        failures: AssemblyFailure[],
    ) => {
        const palette = resolveCoverPalette(coverConfig);
        const bgColor = coverConfig.ink_saver ? '#FFFFFF' : palette.surfaceTint;
        const fileBaseName = `SPJ-${manifest.meta.variant_label.replace(/\s+/g, '-')}-${manifest.meta.tahun}-${manifest.meta.periode_type}`;

        const result = await finalizeAssembledBundle(
            {
                tasks,
                paperSize,
                includeCover: bundleConfig.include_cover,
                includeToc: bundleConfig.include_toc,
                includeDividers: bundleConfig.include_dividers,
                includePageNumbers: bundleConfig.include_page_numbers,
                accentHex: palette.primary,
                schoolName: (coverConfig.nama_sekolah_override ?? '').trim() || manifest.sekolah.nama_sekolah,
                variantLabel: manifest.meta.variant_label,
                periodeLabel: (coverConfig.subjudul_override ?? '').trim() || manifest.meta.periode_label,
                fileBaseName,
                captureCoverPng: async () => {
                    if (!stageCoverRef.current) return null;
                    return captureCanvasElementToPngBytes(stageCoverRef.current, paperSize, bgColor);
                },
                captureDividerPng: async (chapterKey: string) => {
                    const el = stageDividerRefs.current[chapterKey];
                    if (!el) return null;
                    return captureCanvasElementToPngBytes(el, paperSize, bgColor);
                },
                onProgress: setAssemblyProgress,
            },
            fetchedMap,
            failures,
        );

        setAssemblyResult(result);
        partialFetchedRef.current.clear();
        setAssemblyProgress((prev) => ({ ...prev, stage: 'completed' }));
    };

    const startAssembly = async (
        tasksOverride?: AssemblyTaskChunk[],
        reusePartialMap?: Map<string, { task: AssemblyTaskChunk; bytes: Uint8Array; pageCount: number }>,
    ) => {
        const tasksToRun = tasksOverride ?? activeTasks;
        if (tasksToRun.length === 0 && !bundleConfig.include_cover) {
            setFeedback({
                type: 'error',
                text: 'Pilih minimal 1 dokumen siap cetak atau aktifkan Cover LPJ sebelum merakit SPJ.',
            });
            return;
        }

        activeTasksRef.current = tasksToRun;
        if (!reusePartialMap) {
            partialFetchedRef.current = new Map();
        }

        const controller = new AbortController();
        assemblyAbortRef.current = controller;

        setIsAssemblyOpen(true);
        setAssemblyResult(null);
        setAssemblyFailures([]);
        setAssemblyError(null);
        setAssemblyProgress({
            stage: 'fetching_chunks',
            completedCount: reusePartialMap?.size ?? 0,
            totalCount: tasksToRun.length,
            currentLabel: 'Menyiapkan antrean dokumen...',
            pagesCollected: 0,
        });

        try {
            const outcome = await fetchAllChunksWithConcurrency(
                tasksToRun,
                setAssemblyProgress,
                controller.signal,
                reusePartialMap,
            );

            if (outcome.cancelled) {
                setAssemblyProgress((prev) => ({ ...prev, stage: 'cancelled' }));
                return;
            }

            partialFetchedRef.current = outcome.fetchedMap;

            if (outcome.failures.length > 0) {
                setAssemblyFailures(outcome.failures);
                setAssemblyProgress((prev) => ({ ...prev, stage: 'needs_resolution' }));
                return;
            }

            await runFinalizeStage(tasksToRun, outcome.fetchedMap, []);
        } catch (err) {
            setAssemblyError(err instanceof Error ? err.message : 'Kesalahan tak terduga saat merakit SPJ.');
            setAssemblyProgress((prev) => ({ ...prev, stage: 'error' }));
        }
    };

    const handleRetryFailed = (useFallbackDefault: boolean) => {
        const failedIds = new Set(assemblyFailures.map((f) => f.task.chunkId));
        const updatedTasks = activeTasksRef.current.map((t) => {
            if (!failedIds.has(t.chunkId)) return t;
            if (useFallbackDefault && t.isCustomTemplate && t.fallbackUrl) {
                return { ...t, url: t.fallbackUrl, isCustomTemplate: false };
            }
            return t;
        });
        void startAssembly(updatedTasks, partialFetchedRef.current);
    };

    const handleContinueWithoutFailed = async () => {
        try {
            setAssemblyProgress((prev) => ({ ...prev, stage: 'finalizing' }));
            await runFinalizeStage(activeTasksRef.current, partialFetchedRef.current, assemblyFailures);
        } catch (err) {
            setAssemblyError(err instanceof Error ? err.message : 'Gagal menyelesaikan perakitan SPJ.');
            setAssemblyProgress((prev) => ({ ...prev, stage: 'error' }));
        }
    };

    // Reorder helpers
    const moveChapter = (chapterKey: string, direction: 'up' | 'down') => {
        setBundleConfig((prev) => {
            const arr = [...prev.chapter_order];
            const idx = arr.indexOf(chapterKey);
            if (idx < 0) return prev;
            const target = direction === 'up' ? idx - 1 : idx + 1;
            if (target < 0 || target >= arr.length) return prev;
            [arr[idx], arr[target]] = [arr[target], arr[idx]];
            return { ...prev, chapter_order: arr };
        });
    };

    const moveItem = (chapterKey: string, itemKey: string, direction: 'up' | 'down') => {
        setBundleConfig((prev) => {
            const arr = [...(prev.item_order_by_chapter[chapterKey] ?? [])];
            const idx = arr.indexOf(itemKey);
            if (idx < 0) return prev;
            const target = direction === 'up' ? idx - 1 : idx + 1;
            if (target < 0 || target >= arr.length) return prev;
            [arr[idx], arr[target]] = [arr[target], arr[idx]];
            return {
                ...prev,
                item_order_by_chapter: { ...prev.item_order_by_chapter, [chapterKey]: arr },
            };
        });
    };

    const activeSpec = SPJ_PAPER_SPECS[paperSize];
    const miniCoverWidth = 92;
    const miniCoverScale = miniCoverWidth / activeSpec.designWidth;
    const miniCoverHeight = Math.round(activeSpec.designHeight * miniCoverScale);

    const previewDividerChapter =
        orderedChapters.find((c) => c.key === previewDividerKey) ?? orderedChapters[0];

    const getActiveItemLabelsForChapter = useCallback(
        (chapter: SpjChapterManifest): string[] =>
            getOrderedItemsForChapter(chapter)
                .filter((it) => bundleConfig.enabled_items[it.key] && it.chunks.length > 0)
                .map((it) => it.label),
        [getOrderedItemsForChapter, bundleConfig.enabled_items],
    );

    const renderActivePreviewCanvas = () =>
        previewTab === 'cover' ? (
            <CoverCanvas manifest={manifest} config={coverConfig} paperSize={paperSize} />
        ) : previewDividerChapter ? (
            <SectionDividerCanvas
                manifest={manifest}
                config={coverConfig}
                paperSize={paperSize}
                chapter={previewDividerChapter}
                activeItemLabels={getActiveItemLabelsForChapter(previewDividerChapter)}
            />
        ) : null;

    const defaultAttachmentTag: SpjAttachmentPeriodeTag =
        periodeType === 'tahap_1' || periodeType === 'tahap_2' || periodeType === 'tahunan'
            ? periodeType
            : 'umum';

    const filterSelectClass =
        'w-full rounded-xl border border-slate-200/90 bg-slate-50/90 px-3 py-2 text-xs font-bold text-slate-800 transition focus:border-brand-500 focus:ring-brand-500/30 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100 dark:focus:border-lime-400/60 dark:focus:ring-lime-400/20';
    const filterLabelClass =
        'mb-1 block text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400';

    return (
        <AuthenticatedLayout>
            <Head title={`Cetak SPJ Terpadu — ${manifest.meta.variant_label}`} />

            <div className="space-y-4 pb-10">
                <PageHeader
                    breadcrumb={[{ label: 'Fitur Pelengkap' }, { label: 'Cetak SPJ Terpadu' }]}
                    icon={
                        <IconTile tone="lime" size="lg">
                            <Printer />
                        </IconTile>
                    }
                    title="Cetak SPJ Terpadu & Cover LPJ Modern"
                    subtitle={`Susun, pratinjau cover modern, dan cetak seluruh bendel SPJ ${manifest.meta.variant_label} (${manifest.meta.periode_label}) dalam satu klik.`}
                    badge={
                        <StatusBadge tone="lime" dot={false}>
                            {manifest.meta.variant_label}
                        </StatusBadge>
                    }
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            {canWrite && (
                                <button
                                    type="button"
                                    disabled={isSavingPreset}
                                    onClick={handleSavePreset}
                                    className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200/90 bg-white px-4 py-2.5 text-xs font-extrabold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200 dark:hover:bg-white/[0.1]"
                                >
                                    <Save className="h-3.5 w-3.5" />
                                    <span>{isSavingPreset ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
                                </button>
                            )}
                            <button
                                type="button"
                                disabled={isFetchingManifest}
                                onClick={() => void startAssembly()}
                                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-2.5 text-xs font-extrabold text-lime-300 shadow-md transition hover:bg-slate-800 disabled:opacity-50 dark:bg-lime-400 dark:text-slate-950 dark:hover:bg-lime-300"
                            >
                                <Printer className="h-4 w-4" />
                                <span>Rakit &amp; Cetak SPJ ({activeTasks.length} file)</span>
                            </button>
                        </div>
                    }
                />

                {/* Unified Neo-Bento Command Bar: Variant Switcher + Page Mode + Filters */}
                <Surface padding="md" bodyClassName="space-y-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-white/[0.07]">
                        <PillTabs
                            variant="solid"
                            ariaLabel="Pilih varian sumber dana BOSP"
                            value={variant}
                            onChange={(nextKey) => {
                                const target = VARIANT_SWITCHER.find((v) => v.key === nextKey);
                                if (target && target.key !== variant) {
                                    router.visit(route(target.routeName));
                                }
                            }}
                            items={VARIANT_SWITCHER.map((v) => ({
                                key: v.key,
                                label: v.label,
                            }))}
                        />

                        <div className="flex flex-wrap items-center gap-2.5">
                            {isFetchingManifest && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-[11px] font-bold text-brand-700 dark:bg-lime-400/15 dark:text-lime-300">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    <span>Memindai SPJ...</span>
                                </span>
                            )}
                            <PillTabs
                                variant="soft"
                                ariaLabel="Pilih tampilan Cetak SPJ"
                                value={activeTab}
                                onChange={(k) => setActiveTab(k as 'bundle' | 'cover')}
                                items={[
                                    {
                                        key: 'bundle',
                                        label: 'Susun Bendel',
                                        badge: (
                                            <span className="rounded-full bg-slate-900/10 px-1.5 py-0.5 text-[10px] font-extrabold leading-none dark:bg-lime-300/15">
                                                {selectedItemCount}
                                            </span>
                                        ),
                                    },
                                    {
                                        key: 'cover',
                                        label: 'Studio Cover & Pembatas',
                                    },
                                ]}
                            />
                        </div>
                    </div>

                    {/* Filter Grid */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        {/* Tahun */}
                        <div>
                            <label className={filterLabelClass}>Tahun Anggaran</label>
                            <select
                                value={tahun}
                                onChange={(e) => {
                                    const next = Number(e.target.value);
                                    setTahun(next);
                                    void reloadManifest({ tahun: next });
                                }}
                                className={filterSelectClass}
                            >
                                {(manifest.meta.available_years.length > 0
                                    ? manifest.meta.available_years
                                    : [manifest.meta.tahun]
                                ).map((y) => (
                                    <option key={y} value={y}>
                                        Tahun {y}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Periode */}
                        <div>
                            <label className={filterLabelClass}>Periode Cetak</label>
                            <select
                                value={periodeType}
                                onChange={(e) => {
                                    const next = e.target.value as SpjPeriodeType;
                                    setPeriodeType(next);
                                    void reloadManifest({ periode_type: next });
                                }}
                                className={filterSelectClass}
                            >
                                {!manifest.meta.is_silpa && (
                                    <>
                                        <option value="tahap_1">Tahap 1 (Januari – Juni)</option>
                                        <option value="tahap_2">Tahap 2 (Juli – Desember)</option>
                                    </>
                                )}
                                <option value="tahunan">Tahunan (Full 1 Tahun)</option>
                                <option value="bulan">Per Bulan Tertentu</option>
                                <option value="rentang_bulan">Rentang Bulan Kustom</option>
                            </select>
                        </div>

                        {/* Bulan (kondisional) */}
                        {periodeType === 'bulan' || periodeType === 'rentang_bulan' ? (
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className={filterLabelClass}>
                                        {periodeType === 'bulan' ? 'Pilih Bulan' : 'Dari Bulan'}
                                    </label>
                                    <select
                                        value={bulanAwal}
                                        onChange={(e) => {
                                            const next = Number(e.target.value);
                                            const nextAkhir = Math.max(next, bulanAkhir);
                                            setBulanAwal(next);
                                            setBulanAkhir(nextAkhir);
                                            void reloadManifest({ bulan_awal: next, bulan_akhir: nextAkhir });
                                        }}
                                        className={filterSelectClass}
                                    >
                                        {MONTHS_ID.map((m) => (
                                            <option key={m.num} value={m.num}>
                                                {m.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {periodeType === 'rentang_bulan' && (
                                    <div className="flex-1">
                                        <label className={filterLabelClass}>Sampai</label>
                                        <select
                                            value={bulanAkhir}
                                            onChange={(e) => {
                                                const next = Math.max(bulanAwal, Number(e.target.value));
                                                setBulanAkhir(next);
                                                void reloadManifest({ bulan_akhir: next });
                                            }}
                                            className={filterSelectClass}
                                        >
                                            {MONTHS_ID.filter((m) => m.num >= bulanAwal).map((m) => (
                                                <option key={m.num} value={m.num}>
                                                    {m.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div>
                                <label className={filterLabelClass}>Cakupan Bulan</label>
                                <div className="flex h-[34px] items-center rounded-xl border border-slate-200/70 bg-slate-100/70 px-3 text-xs font-semibold text-slate-600 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-300">
                                    <span className="truncate">{manifest.meta.periode_label}</span>
                                </div>
                            </div>
                        )}

                        {/* Kertas */}
                        <div>
                            <label className={filterLabelClass}>Ukuran Kertas</label>
                            <select
                                value={paperSize}
                                onChange={(e) => {
                                    const next = e.target.value as SpjPaperSize;
                                    setPaperSize(next);
                                    void reloadManifest({ paper_size: next });
                                }}
                                className={filterSelectClass}
                            >
                                <option value="F4">F4 / Folio (210 × 330 mm)</option>
                                <option value="A4">A4 (210 × 297 mm)</option>
                                <option value="Legal">Legal (216 × 356 mm)</option>
                                <option value="Letter">Letter (216 × 279 mm)</option>
                            </select>
                        </div>

                        {/* Mode Susun */}
                        <div>
                            <label className={filterLabelClass}>Mode Susun Bulanan</label>
                            <select
                                value={groupingMode}
                                onChange={(e) => {
                                    const next = e.target.value as SpjGroupingMode;
                                    setGroupingMode(next);
                                    void reloadManifest({ grouping_mode: next });
                                }}
                                className={filterSelectClass}
                            >
                                <option value="per_jenis">Per Jenis Buku (BKU Jan–Jun...)</option>
                                <option value="per_bulan">Per Bulan (Jan Lengkap, Feb...)</option>
                            </select>
                        </div>
                    </div>
                </Surface>

                {/* Feedback Banner */}
                {feedback && (
                    <div
                        className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-xs font-bold ${
                            feedback.type === 'success'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300'
                                : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300'
                        }`}
                    >
                        <span>{feedback.text}</span>
                        <button
                            type="button"
                            onClick={() => setFeedback(null)}
                            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg opacity-75 transition hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
                            aria-label="Tutup notifikasi"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                )}

                {/* TAB 1: SUSUN BENDEL & KESIAPAN */}
                {activeTab === 'bundle' && (
                    <div className="space-y-4">
                        {/* 4 Neo-Bento KPI Cards */}
                        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                            <Surface padding="sm" hover>
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                            Dokumen Siap
                                        </div>
                                        <div className="sikas-num mt-1 text-2xl font-black text-slate-900 dark:text-white">
                                            {manifest.readiness_summary.ready}
                                        </div>
                                        <div className="mt-0.5 text-[10.5px] font-medium text-emerald-600 dark:text-mint">
                                            Lengkap siap cetak
                                        </div>
                                    </div>
                                    <IconTile tone="mint" size="md">
                                        <FileCheck2 />
                                    </IconTile>
                                </div>
                            </Surface>

                            <Surface padding="sm" hover>
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                            Sebagian Bulan
                                        </div>
                                        <div className="sikas-num mt-1 text-2xl font-black text-slate-900 dark:text-white">
                                            {manifest.readiness_summary.partial}
                                        </div>
                                        <div className="mt-0.5 text-[10.5px] font-medium text-amber-600 dark:text-amber-300">
                                            Baru sebagian periode
                                        </div>
                                    </div>
                                    <IconTile tone="amber" size="md">
                                        <Clock />
                                    </IconTile>
                                </div>
                            </Surface>

                            <Surface padding="sm" hover>
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                            Belum Dibuat
                                        </div>
                                        <div className="sikas-num mt-1 text-2xl font-black text-slate-900 dark:text-white">
                                            {manifest.readiness_summary.empty}
                                        </div>
                                        <div className="mt-0.5 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                                            Belum ada data di modul
                                        </div>
                                    </div>
                                    <IconTile tone="slate" size="md">
                                        <AlertCircle />
                                    </IconTile>
                                </div>
                            </Surface>

                            <Surface padding="sm" hover>
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                            Antrean Terpilih
                                        </div>
                                        <div className="sikas-num mt-1 flex items-baseline gap-1.5 text-2xl font-black text-slate-900 dark:text-white">
                                            <span>{activeTasks.length}</span>
                                            <span className="text-xs font-bold text-brand-600 dark:text-lime-300">
                                                berkas
                                            </span>
                                        </div>
                                        <div className="mt-0.5 text-[10.5px] font-medium text-slate-500 dark:text-slate-400">
                                            {selectedItemCount} jenis dokumen aktif
                                        </div>
                                    </div>
                                    <IconTile tone="lime" size="md">
                                        <FileStack />
                                    </IconTile>
                                </div>
                            </Surface>
                        </div>

                        {/* Main Asymmetric 8 / 4 Bento Grid */}
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start">
                            {/* Left 8 Columns: Collapsible Accordion Chapters */}
                            <div className="lg:col-span-8">
                                <BundleChecklist
                                    key={variant}
                                    orderedChapters={orderedChapters}
                                    bundleConfig={bundleConfig}
                                    libreOfficeAvailable={manifest.meta.libreoffice_available}
                                    isFetchingManifest={isFetchingManifest}
                                    onToggleItem={(itemKey, enabled) =>
                                        setBundleConfig((prev) => ({
                                            ...prev,
                                            enabled_items: { ...prev.enabled_items, [itemKey]: enabled },
                                        }))
                                    }
                                    onToggleChapterAll={(chapter, enabled) =>
                                        setBundleConfig((prev) => {
                                            const next = { ...prev.enabled_items };
                                            for (const it of chapter.items) {
                                                if (it.chunks.length > 0) {
                                                    next[it.key] = enabled;
                                                }
                                            }
                                            return { ...prev, enabled_items: next };
                                        })
                                    }
                                    onSelectTemplate={(itemKey, templateId) =>
                                        setBundleConfig((prev) => ({
                                            ...prev,
                                            selected_templates: {
                                                ...prev.selected_templates,
                                                [itemKey]: templateId,
                                            },
                                        }))
                                    }
                                    onChangeSp2bMode={(nextMode) => {
                                        void reloadManifest({ sp2b_mode: nextMode });
                                    }}
                                    onOpenItemSettings={(chapter, item) =>
                                        setSettingsModalTarget({ chapter, item })
                                    }
                                    onMoveChapter={moveChapter}
                                    onMoveItem={moveItem}
                                />
                            </div>

                            {/* Right 4 Columns: Sticky Neo-Bento Dock */}
                            <div className="space-y-4 lg:sticky lg:top-[84px] lg:col-span-4">
                                {/* Card 1: Pusat Rakit + Mini Live Cover Preview */}
                                <div className="relative overflow-hidden rounded-[26px] border border-slate-900/90 bg-gradient-to-br from-[#24223a] via-[#191729] to-[#110f1c] p-5 text-white shadow-xl dark:border-white/[0.1]">
                                    <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-lime-400/10 blur-3xl" />

                                    <div className="relative flex items-center justify-between gap-2">
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-lime-400/15 px-2.5 py-1 text-[10.5px] font-extrabold text-lime-300 ring-1 ring-lime-400/25">
                                            <Sparkles className="h-3 w-3" />
                                            Cetak Hybrid Siap Jilid
                                        </span>
                                        <span className="rounded-lg bg-white/[0.08] px-2 py-0.5 text-[10.5px] font-extrabold text-white/75">
                                            {paperSize}
                                        </span>
                                    </div>

                                    {/* Mini Live Cover Preview + Summary */}
                                    <div className="relative mt-4 flex items-start gap-3.5">
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('cover')}
                                            className="group relative shrink-0 overflow-hidden rounded-lg bg-white text-left shadow-lg ring-1 ring-white/25 transition hover:ring-lime-300"
                                            style={{
                                                width: `${miniCoverWidth}px`,
                                                height: `${miniCoverHeight}px`,
                                            }}
                                            title="Klik untuk membuka Studio Cover LPJ"
                                        >
                                            <div
                                                className="pointer-events-none origin-top-left"
                                                style={{
                                                    width: `${activeSpec.designWidth}px`,
                                                    height: `${activeSpec.designHeight}px`,
                                                    transform: `scale(${miniCoverScale})`,
                                                }}
                                            >
                                                <CoverCanvas
                                                    manifest={manifest}
                                                    config={coverConfig}
                                                    paperSize={paperSize}
                                                />
                                            </div>
                                            <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-slate-950/80 via-slate-950/15 to-transparent p-1.5 opacity-0 transition group-hover:opacity-100">
                                                <span className="inline-flex items-center gap-1 rounded-md bg-lime-400 px-1.5 py-0.5 text-[9px] font-black text-slate-950">
                                                    <Palette className="h-2.5 w-2.5" />
                                                    Edit
                                                </span>
                                            </div>
                                        </button>

                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-[15px] font-extrabold tracking-tight text-white">
                                                Pusat Rakit Bendel SPJ
                                            </h3>
                                            <p className="mt-1 text-[11.5px] leading-relaxed text-white/65">
                                                Otomatis merakit 1 PDF utuh lengkap dengan opsi pisah cetak Portrait, Landscape, &amp; per Bab.
                                            </p>
                                            <div className="mt-2.5 flex flex-wrap gap-1.5 text-[10px] font-bold">
                                                <span className="rounded-md bg-white/[0.08] px-2 py-0.5 text-lime-200">
                                                    {activeTasks.length} berkas PDF
                                                </span>
                                                <span className="rounded-md bg-white/[0.08] px-2 py-0.5 text-white/75">
                                                    {manifest.meta.tahun}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 4 Bundle Structure Toggles */}
                                    <div className="relative mt-4 space-y-2 rounded-2xl border border-white/[0.07] bg-white/[0.04] p-3 text-xs">
                                        <label className="flex cursor-pointer items-center justify-between gap-2">
                                            <span className="font-medium text-white/85">
                                                Cover LPJ Modern (300 DPI)
                                            </span>
                                            <input
                                                type="checkbox"
                                                checked={bundleConfig.include_cover}
                                                onChange={(e) =>
                                                    setBundleConfig((p) => ({
                                                        ...p,
                                                        include_cover: e.target.checked,
                                                    }))
                                                }
                                                className="h-4 w-4 rounded border-white/30 bg-white/10 text-brand-500 focus:ring-brand-400 focus:ring-offset-0"
                                            />
                                        </label>
                                        <label className="flex cursor-pointer items-center justify-between gap-2">
                                            <span className="font-medium text-white/85">
                                                Daftar Isi Bernomor Halaman
                                            </span>
                                            <input
                                                type="checkbox"
                                                checked={bundleConfig.include_toc}
                                                onChange={(e) =>
                                                    setBundleConfig((p) => ({
                                                        ...p,
                                                        include_toc: e.target.checked,
                                                    }))
                                                }
                                                className="h-4 w-4 rounded border-white/30 bg-white/10 text-brand-500 focus:ring-brand-400 focus:ring-offset-0"
                                            />
                                        </label>
                                        <label className="flex cursor-pointer items-center justify-between gap-2">
                                            <span className="font-medium text-white/85">
                                                Halaman Pembatas Bab
                                            </span>
                                            <input
                                                type="checkbox"
                                                checked={bundleConfig.include_dividers}
                                                onChange={(e) =>
                                                    setBundleConfig((p) => ({
                                                        ...p,
                                                        include_dividers: e.target.checked,
                                                    }))
                                                }
                                                className="h-4 w-4 rounded border-white/30 bg-white/10 text-brand-500 focus:ring-brand-400 focus:ring-offset-0"
                                            />
                                        </label>
                                        <label className="flex cursor-pointer items-center justify-between gap-2">
                                            <span className="font-medium text-white/85">
                                                Stempel Nomor Halaman
                                            </span>
                                            <input
                                                type="checkbox"
                                                checked={bundleConfig.include_page_numbers}
                                                onChange={(e) =>
                                                    setBundleConfig((p) => ({
                                                        ...p,
                                                        include_page_numbers: e.target.checked,
                                                    }))
                                                }
                                                className="h-4 w-4 rounded border-white/30 bg-white/10 text-brand-500 focus:ring-brand-400 focus:ring-offset-0"
                                            />
                                        </label>
                                    </div>

                                    {/* CTA Buttons */}
                                    <div className="relative mt-4 space-y-2">
                                        <button
                                            type="button"
                                            disabled={isFetchingManifest}
                                            onClick={() => void startAssembly()}
                                            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-lime-400 px-4 py-3 text-xs font-black text-slate-950 shadow-md transition hover:bg-lime-300 disabled:opacity-50"
                                        >
                                            <Printer className="h-4 w-4" />
                                            <span>Rakit &amp; Cetak Bendel SPJ</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('cover')}
                                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/[0.12]"
                                        >
                                            <Palette className="h-3.5 w-3.5 text-lime-300" />
                                            <span>Edit Desain Cover Modern</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Card 2: External Attachments */}
                                <ExternalAttachmentManager
                                    attachments={manifest.external_attachments}
                                    canWrite={canWrite}
                                    defaultPeriodeTag={defaultAttachmentTag}
                                    isUploading={isUploadingAttachment}
                                    onUpload={handleUploadAttachment}
                                    onUpdate={handleUpdateAttachment}
                                    onDelete={handleDeleteAttachment}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: STUDIO COVER & PEMBATAS BAB */}
                {activeTab === 'cover' && (
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-start">
                        <div className="lg:col-span-5">
                            <CoverControlPanel
                                config={coverConfig}
                                bundleConfig={bundleConfig}
                                schoolPhotoUri={resolveSchoolPhotoUri(manifest, coverConfig)}
                                canWrite={canWrite}
                                isSavingPreset={isSavingPreset}
                                isUploadingPhoto={isUploadingPhoto}
                                isExportingCover={isExportingCover}
                                onChangeConfig={(patch) => setCoverConfig((prev) => ({ ...prev, ...patch }))}
                                onChangeBundleConfig={(patch) =>
                                    setBundleConfig((prev) => ({ ...prev, ...patch }))
                                }
                                onUploadPhoto={(file) => void handleUploadCoverPhoto(file)}
                                onDeletePhoto={() => void handleDeleteCoverPhoto()}
                                onSavePreset={() => void handleSavePreset()}
                                onResetCover={() => setCoverConfig(createDefaultCoverConfig(manifest))}
                                onDownloadCoverPdf={() => void handleDownloadCoverOnly('pdf')}
                                onDownloadCoverPng={() => void handleDownloadCoverOnly('png')}
                            />
                        </div>

                        {/* Live Preview Kanan */}
                        <div className="lg:sticky lg:top-[84px] lg:col-span-7">
                            <Surface padding="md">
                                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-white/[0.07]">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        {[
                                            {
                                                key: 'cover',
                                                label: 'Preview Cover',
                                                icon: <BookOpen className="h-3.5 w-3.5" />,
                                            },
                                            {
                                                key: 'divider',
                                                label: 'Pembatas Bab',
                                                icon: <Layers className="h-3.5 w-3.5" />,
                                            },
                                            {
                                                key: 'toc',
                                                label: 'Struktur Daftar Isi',
                                                icon: <CheckCircle2 className="h-3.5 w-3.5" />,
                                            },
                                        ].map((t) => (
                                            <button
                                                key={t.key}
                                                type="button"
                                                onClick={() =>
                                                    setPreviewTab(t.key as 'cover' | 'divider' | 'toc')
                                                }
                                                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition ${
                                                    previewTab === t.key
                                                        ? 'bg-slate-900 text-lime-300 dark:bg-lime-400 dark:text-slate-950'
                                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/[0.1]'
                                                }`}
                                            >
                                                {t.icon}
                                                <span>{t.label}</span>
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        {previewTab === 'divider' && (
                                            <select
                                                value={previewDividerChapter?.key ?? ''}
                                                onChange={(e) => setPreviewDividerKey(e.target.value)}
                                                className="rounded-xl border border-slate-200/90 bg-slate-50/90 px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200"
                                            >
                                                {orderedChapters.map((c) => (
                                                    <option key={c.key} value={c.key}>
                                                        BAB {c.roman} — {c.title}
                                                    </option>
                                                ))}
                                            </select>
                                        )}

                                        {previewTab !== 'toc' && (
                                            <div className="flex items-center gap-1 rounded-xl border border-slate-200/80 bg-slate-50/90 p-0.5 dark:border-white/10 dark:bg-white/[0.04]">
                                                {[
                                                    { key: 'auto' as const, label: 'Otomatis' },
                                                    { key: 0.5 as const, label: '50%' },
                                                    { key: 0.75 as const, label: '75%' },
                                                    { key: 1 as const, label: '100%' },
                                                ].map((z) => {
                                                    const active = zoomOverride === z.key;
                                                    return (
                                                        <button
                                                            key={String(z.key)}
                                                            type="button"
                                                            onClick={() => setZoomOverride(z.key)}
                                                            className={`rounded-lg px-2 py-1 text-[10.5px] font-extrabold transition ${
                                                                active
                                                                    ? 'bg-slate-900 text-lime-300 dark:bg-lime-400 dark:text-slate-950'
                                                                    : 'text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-white/[0.08]'
                                                            }`}
                                                        >
                                                            {z.label}
                                                        </button>
                                                    );
                                                })}
                                                <button
                                                    type="button"
                                                    onClick={() => setIsFullscreenPreview(true)}
                                                    title="Buka Pratinjau Layar Penuh"
                                                    aria-label="Buka Pratinjau Layar Penuh"
                                                    className="inline-flex items-center justify-center rounded-lg px-2 py-1 text-slate-600 transition hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/[0.08] dark:hover:text-white"
                                                >
                                                    <Maximize2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div
                                    ref={previewContainerRef}
                                    className="flex justify-center overflow-auto rounded-2xl border border-slate-200/70 bg-slate-200/75 p-4 dark:border-white/[0.06] dark:bg-[#0d0c16]"
                                >
                                    {previewTab === 'toc' ? (
                                        <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-md ring-1 ring-slate-900/5 dark:border-white/10">
                                            <div className="border-b-2 border-slate-900 pb-3">
                                                <div className="text-lg font-black text-slate-900">
                                                    PRATINJAU STRUKTUR DAFTAR ISI
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    Nomor halaman aktual dihitung otomatis saat bendel dirakit oleh pdf-lib.
                                                </div>
                                            </div>
                                            <div className="mt-4 space-y-3 text-xs">
                                                {orderedChapters.map((ch) => {
                                                    const activeItems = getOrderedItemsForChapter(ch).filter(
                                                        (it) =>
                                                            bundleConfig.enabled_items[it.key] &&
                                                            it.chunks.length > 0,
                                                    );
                                                    if (activeItems.length === 0) return null;
                                                    return (
                                                        <div key={ch.key}>
                                                            <div className="rounded-lg bg-slate-100 px-2.5 py-1.5 font-extrabold text-slate-900">
                                                                BAB {ch.roman} — {ch.title}
                                                            </div>
                                                            <ul className="mt-1 space-y-1 pl-4 text-slate-600">
                                                                {activeItems.map((it) => (
                                                                    <li
                                                                        key={it.key}
                                                                        className="flex justify-between"
                                                                    >
                                                                        <span>{it.label}</span>
                                                                        <span className="font-mono text-[11px] text-slate-400">
                                                                            otomatis
                                                                        </span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            style={{
                                                width: `${Math.round(activeSpec.designWidth * previewScale)}px`,
                                                height: `${Math.round(activeSpec.designHeight * previewScale)}px`,
                                                position: 'relative',
                                            }}
                                        >
                                            <div
                                                className="origin-top-left overflow-hidden rounded-lg shadow-2xl ring-1 ring-slate-900/10 dark:ring-white/10"
                                                style={{
                                                    width: `${activeSpec.designWidth}px`,
                                                    height: `${activeSpec.designHeight}px`,
                                                    transform: `scale(${previewScale})`,
                                                }}
                                            >
                                                {renderActivePreviewCanvas()}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Surface>
                        </div>
                    </div>
                )}
            </div>

            {isFullscreenPreview && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Pratinjau Layar Penuh Cover SPJ"
                    className="fixed inset-0 z-50 flex flex-col bg-slate-950/85 p-4 backdrop-blur-sm sm:p-6"
                >
                    <div className="mx-auto mb-3 flex w-full max-w-5xl items-center justify-between gap-3 rounded-2xl border border-white/15 bg-slate-900/95 px-4 py-2.5 text-white shadow-xl">
                        <div className="text-xs font-extrabold">
                            Pratinjau Resolusi Tinggi ({paperSize}) —{' '}
                            {previewTab === 'cover'
                                ? COVER_LAYOUT_LIST.find((l) => l.key === coverConfig.layout)?.label
                                : `Pembatas BAB ${previewDividerChapter?.roman ?? ''}`}
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsFullscreenPreview(false)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-lime-400 px-3 py-1.5 text-xs font-black text-slate-950 transition hover:bg-lime-300"
                        >
                            <X className="h-3.5 w-3.5" />
                            <span>Tutup</span>
                        </button>
                    </div>
                    <div className="flex flex-1 justify-center overflow-auto py-2">
                        <div
                            className="shrink-0 overflow-hidden rounded-xl shadow-2xl ring-1 ring-white/20"
                            style={{
                                width: `${Math.round(activeSpec.designWidth * 0.85)}px`,
                                height: `${Math.round(activeSpec.designHeight * 0.85)}px`,
                            }}
                        >
                            <div
                                className="origin-top-left"
                                style={{
                                    width: `${activeSpec.designWidth}px`,
                                    height: `${activeSpec.designHeight}px`,
                                    transform: 'scale(0.85)',
                                }}
                            >
                                {renderActivePreviewCanvas()}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Offscreen 300 DPI Render Stage (selalu mounted agar cetak dari Tab 1 langsung jalan) */}
            <div
                aria-hidden="true"
                style={{
                    position: 'fixed',
                    left: '-12000px',
                    top: 0,
                    pointerEvents: 'none',
                    zIndex: -1,
                }}
            >
                <CoverCanvas
                    ref={stageCoverRef}
                    manifest={manifest}
                    config={coverConfig}
                    paperSize={paperSize}
                />
                {orderedChapters.map((ch) => (
                    <SectionDividerCanvas
                        key={`stage-div-${ch.key}`}
                        ref={(el) => {
                            stageDividerRefs.current[ch.key] = el;
                        }}
                        manifest={manifest}
                        config={coverConfig}
                        paperSize={paperSize}
                        chapter={ch}
                        activeItemLabels={getActiveItemLabelsForChapter(ch)}
                    />
                ))}
            </div>

            <AssemblyProgressModal
                isOpen={isAssemblyOpen}
                progress={assemblyProgress}
                failures={assemblyFailures}
                result={assemblyResult}
                errorMessage={assemblyError}
                onCancel={() => assemblyAbortRef.current?.abort()}
                onClose={() => setIsAssemblyOpen(false)}
                onRetryFailed={handleRetryFailed}
                onContinueWithoutFailed={() => void handleContinueWithoutFailed()}
            />

            <ItemPrintSettingsModal
                isOpen={settingsModalTarget !== null}
                item={settingsModalTarget?.item ?? null}
                chapter={settingsModalTarget?.chapter ?? null}
                selectedTemplateId={
                    settingsModalTarget
                        ? bundleConfig.selected_templates[settingsModalTarget.item.key] ||
                          settingsModalTarget.item.default_template
                        : 'default'
                }
                defaultSettings={
                    settingsModalTarget
                        ? {
                              paper_size: settingsModalTarget.item.default_paper_size,
                              orientation: settingsModalTarget.item.default_orientation,
                              font_size: settingsModalTarget.item.default_font_size,
                          }
                        : { paper_size: paperSize, orientation: 'portrait', font_size: '10pt' }
                }
                currentSettings={
                    settingsModalTarget
                        ? {
                              paper_size:
                                  bundleConfig.item_print_settings[settingsModalTarget.item.key]?.paper_size ??
                                  settingsModalTarget.item.default_paper_size,
                              orientation:
                                  bundleConfig.item_print_settings[settingsModalTarget.item.key]?.orientation ??
                                  settingsModalTarget.item.default_orientation,
                              font_size:
                                  bundleConfig.item_print_settings[settingsModalTarget.item.key]?.font_size ??
                                  settingsModalTarget.item.default_font_size,
                          }
                        : { paper_size: paperSize, orientation: 'portrait', font_size: '10pt' }
                }
                onClose={() => setSettingsModalTarget(null)}
                onApply={(itemKey, settings) => {
                    setBundleConfig((prev) => ({
                        ...prev,
                        item_print_settings: {
                            ...prev.item_print_settings,
                            [itemKey]: settings,
                        },
                    }));
                }}
                onApplyToChapter={(chapter, settings) => {
                    setBundleConfig((prev) => {
                        const nextSettings = { ...prev.item_print_settings };
                        for (const it of chapter.items) {
                            if (it.is_external || it.print_param_schema === 'none') continue;
                            const tplId = prev.selected_templates[it.key] || it.default_template;
                            const tplMeta = it.available_templates.find((t) => t.id === tplId);
                            if (tplMeta?.is_custom) continue;
                            nextSettings[it.key] = { ...settings };
                        }
                        return { ...prev, item_print_settings: nextSettings };
                    });
                    setFeedback({
                        type: 'success',
                        text: `Pengaturan ${settings.paper_size} · ${settings.orientation} · ${settings.font_size} diterapkan ke seluruh item di BAB ${chapter.roman}.`,
                    });
                }}
                onResetItem={(itemKey) => {
                    setBundleConfig((prev) => {
                        const next = { ...prev.item_print_settings };
                        delete next[itemKey];
                        return { ...prev, item_print_settings: next };
                    });
                }}
            />
        </AuthenticatedLayout>
    );
}
