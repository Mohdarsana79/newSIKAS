import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import Modal from '@/Components/Modal';
import TextInput from '@/Components/TextInput';
import DatePicker from '@/Components/DatePicker';
import { Calendar } from '@/Components/ui/calendar';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import IconTile from '@/Components/ui/IconTile';
import ModernSelect, { ModernSelectGroup, ModernSelectOption } from './ModernSelect';
import { router } from '@inertiajs/react';
import {
    AlertCircle,
    BookOpen,
    BookmarkCheck,
    Calendar as CalendarIcon,
    CheckCircle2,
    Database,
    FileText,
    Image as ImageIcon,
    Info,
    Link2,
    Link2Off,
    Loader2,
    RefreshCw,
    Search,
    Settings,
    Sparkles,
    Table as TableIcon,
    Wand2,
    X,
} from 'lucide-react';
import {
    SkDataSourceOptions,
    SkDokumen,
    SkSumberDataState,
    SkTableRowsPreview,
    SkTagGroup,
    SkTemplate,
    SkTemplateTagMapping,
} from './types';

interface Props {
    show: boolean;
    onClose: () => void;
    folderId: number;
    templates: SkTemplate[];
    schoolData: Record<string, string>;
    tagCatalog?: SkTagGroup[];
    dokumen?: SkDokumen | null;
    canWrite?: boolean;
    isKepalaSekolah?: boolean;
    onOpenManageTemplates?: () => void;
    onOpenTagReference?: () => void;
}

const LABEL_CLASS =
    'mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500';
const TEXTAREA_CLASS =
    'w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-[12px] font-semibold text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10';

const BULAN_OPTIONS: ModernSelectOption[] = [
    { value: '', label: 'Semua Bulan' },
    { value: '1', label: 'Januari' },
    { value: '2', label: 'Februari' },
    { value: '3', label: 'Maret' },
    { value: '4', label: 'April' },
    { value: '5', label: 'Mei' },
    { value: '6', label: 'Juni' },
    { value: '7', label: 'Juli' },
    { value: '8', label: 'Agustus' },
    { value: '9', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' },
];

const EMPTY_SUMBER_DATA: SkSumberDataState = {
    variant: 'reguler',
    penganggaran_id: null,
    bku_id: null,
    bku_ids: [],
    penerimaan_id: null,
    ptk_id: null,
    ptk_ids: [],
};

const EMPTY_TABLES: SkTableRowsPreview = {
    item: [],
    ptk: [],
    belanja: [],
};

type TableGroupKey = 'item' | 'ptk' | 'belanja';
type ImageKey = 'kop_surat' | 'logo_sekolah' | 'logo_daerah';

const IMAGE_KEYS: Array<{ key: ImageKey; label: string }> = [
    { key: 'kop_surat', label: 'Kop Surat (${kop_surat})' },
    { key: 'logo_sekolah', label: 'Logo Sekolah (${logo_sekolah})' },
    { key: 'logo_daerah', label: 'Logo Daerah (${logo_daerah})' },
];

const TABLE_GROUPS: Array<{ key: TableGroupKey; label: string; hint: string }> = [
    { key: 'item', label: 'Tabel Rincian Item BKU (${item_*})', hint: 'Dari 1 transaksi Belanja BKU terpilih' },
    { key: 'ptk', label: 'Tabel Daftar PTK (${ptk_*_row})', hint: 'Dari daftar PTK (Multi PTK) terpilih' },
    { key: 'belanja', label: 'Tabel Daftar Belanja (${belanja_*})', hint: 'Dari daftar beberapa Belanja BKU terpilih' },
];

const formatTagLabel = (tag: string) =>
    tag
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());

const isLongField = (tag: string) => {
    const lower = tag.toLowerCase();
    return (
        lower.includes('alamat') ||
        lower.includes('uraian') ||
        lower.includes('keterangan') ||
        lower.includes('menimbang') ||
        lower.includes('mengingat') ||
        lower.includes('memutuskan') ||
        lower.includes('isi') ||
        lower.includes('daftar') ||
        lower.includes('catatan') ||
        lower.includes('tujuan') ||
        lower.includes('dasar') ||
        lower.includes('terbilang') ||
        lower.includes('lengkap')
    );
};

const isDateField = (tag: string) => {
    const lower = tag.toLowerCase();
    if (
        lower.includes('terbilang') ||
        lower.includes('angka') ||
        lower.includes('lengkap') ||
        lower.includes('tempat_')
    ) {
        return false;
    }
    return lower.includes('tanggal') || lower.includes('tgl') || lower === 'date';
};

const normalizeKey = (tag: string) =>
    tag
        .toLowerCase()
        .trim()
        .replace(/[\s\-]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');

function InlineCalendarPicker({
    disabled,
    onPickDate,
}: {
    disabled?: boolean;
    onPickDate: (formatted: string) => void;
}) {
    return (
        <Popover className="relative shrink-0">
            <PopoverButton
                type="button"
                disabled={disabled}
                title="Pilih tanggal dari kalender"
                className="inline-flex h-[42px] w-[42px] items-center justify-center rounded-xl border border-slate-200/90 bg-white text-brand-600 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 focus:outline-none focus:ring-4 focus:ring-brand-200/50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-brand-300 dark:hover:bg-white/10"
            >
                <CalendarIcon className="h-4 w-4" />
            </PopoverButton>
            <PopoverPanel
                portal
                anchor={{ to: 'bottom end', gap: 6, padding: 12 }}
                className="z-[9999] w-auto rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-2xl dark:border-white/10 dark:bg-[#191627]"
            >
                {({ close }) => (
                    <Calendar
                        mode="single"
                        onSelect={(date) => {
                            if (date) {
                                onPickDate(format(date, 'dd MMMM yyyy', { locale: idLocale }));
                            }
                            close();
                        }}
                        initialFocus
                        captionLayout="dropdown"
                        startMonth={new Date(1950, 0)}
                        endMonth={new Date(new Date().getFullYear() + 10, 11)}
                        locale={idLocale}
                    />
                )}
            </PopoverPanel>
        </Popover>
    );
}

export default function GenerateDokumenModal({
    show,
    onClose,
    folderId,
    templates = [],
    schoolData = {},
    tagCatalog = [],
    dokumen = null,
    canWrite,
    isKepalaSekolah = false,
    onOpenManageTemplates,
    onOpenTagReference,
}: Props) {
    const allowWrite = canWrite !== undefined ? canWrite : !isKepalaSekolah;
    const isEdit = Boolean(dokumen);

    // Core form state (manual-first until user maps/enables system tags)
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [perihal, setPerihal] = useState('');
    const [nomorSurat, setNomorSurat] = useState('');
    const [tanggalSurat, setTanggalSurat] = useState('');
    const [keterangan, setKeterangan] = useState('');
    const [dataIsian, setDataIsian] = useState<Record<string, string>>({});

    // Panel "Gunakan Referensi Tag" & live mapping state
    const [showRefPanel, setShowRefPanel] = useState(false);
    const [sumberData, setSumberData] = useState<SkSumberDataState>(EMPTY_SUMBER_DATA);
    const [tagTextMap, setTagTextMap] = useState<Record<string, string>>({});
    const [enabledTags, setEnabledTags] = useState<string[]>([]);
    const [enabledTables, setEnabledTables] = useState<TableGroupKey[]>([]);
    const [enabledImages, setEnabledImages] = useState<ImageKey[]>([]);
    const [saveTemplateMapping, setSaveTemplateMapping] = useState(false);

    // Resolved SIKAS data
    const [sourceOptions, setSourceOptions] = useState<SkDataSourceOptions | null>(null);
    const [resolvedText, setResolvedText] = useState<Record<string, string>>({});
    const [previewTables, setPreviewTables] = useState<SkTableRowsPreview>(EMPTY_TABLES);
    const [hasImages, setHasImages] = useState<Record<string, boolean>>({});
    const [loadingOptions, setLoadingOptions] = useState(false);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [savingMapping, setSavingMapping] = useState(false);
    const [syncNotice, setSyncNotice] = useState<string | null>(null);

    // Filters
    const [bulanFilter, setBulanFilter] = useState('');
    const [bkuSearch, setBkuSearch] = useState('');
    const [ptkSearch, setPtkSearch] = useState('');
    const [ptkTahunFilter, setPtkTahunFilter] = useState<string>('');
    const [tagFilter, setTagFilter] = useState('');

    // Submit / UI state
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const resolveReqIdRef = useRef(0);
    const preserveInitialEditValuesRef = useRef(false);

    const selectedTemplate = useMemo(() => {
        if (isEdit && dokumen?.template) {
            return templates.find((t) => t.id === dokumen.template_id) ?? dokumen.template;
        }
        return templates.find((t) => t.id.toString() === selectedTemplateId) ?? null;
    }, [isEdit, dokumen, templates, selectedTemplateId]);

    const detectedVariables = useMemo(
        () => selectedTemplate?.detected_variables ?? [],
        [selectedTemplate]
    );

    // Index every catalog item -> { key, label, tag, source, sourceLabel }
    const catalogMetaByKey = useMemo(() => {
        const map: Record<
            string,
            { key: string; label: string; tag: string; source: string; sourceLabel: string }
        > = {};
        tagCatalog.forEach((g) => {
            g.items.forEach((item) => {
                if (
                    g.type === 'text' ||
                    item.key.startsWith('belanja_total') ||
                    item.key === 'belanja_jumlah_transaksi'
                ) {
                    const entry = {
                        key: item.key,
                        label: item.label,
                        tag: item.tag,
                        source: g.source,
                        sourceLabel: g.source_label,
                    };
                    map[item.key] = entry;
                    (item.aliases ?? []).forEach((alias) => {
                        map[alias] = entry;
                    });
                }
            });
        });
        return map;
    }, [tagCatalog]);

    // Compute which system data sources are CURRENTLY ACTIVE based on user's checked tags & tables!
    const activeSources = useMemo(() => {
        const set = new Set<string>();
        enabledTags.forEach((raw) => {
            const refKey = tagTextMap[raw];
            if (!refKey) return;
            const meta = catalogMetaByKey[refKey];
            if (!meta) return;
            set.add(meta.source);
            if (['bku', 'bku_list', 'penerimaan'].includes(meta.source)) {
                set.add('penganggaran');
            }
        });
        if (enabledTables.includes('item')) {
            set.add('bku');
            set.add('penganggaran');
        }
        if (enabledTables.includes('belanja')) {
            set.add('bku_list');
            set.add('penganggaran');
        }
        if (enabledTables.includes('ptk')) {
            set.add('ptk_list');
        }
        return Array.from(set);
    }, [enabledTags, tagTextMap, enabledTables, catalogMetaByKey]);

    const needsPenganggaran = activeSources.includes('penganggaran');
    const needsSingleBku = activeSources.includes('bku');
    const needsMultiBku = activeSources.includes('bku_list');
    const needsPenerimaan = activeSources.includes('penerimaan');
    const needsSinglePtk = activeSources.includes('ptk');
    const needsMultiPtk = activeSources.includes('ptk_list');
    const hasActiveDataPickers =
        needsPenganggaran ||
        needsSingleBku ||
        needsMultiBku ||
        needsPenerimaan ||
        needsSinglePtk ||
        needsMultiPtk;

    // Auto-fill tanggalSurat to today if user activates a tanggal_surat tag while tanggalSurat is empty
    const hasActiveSuratDateTag = useMemo(() => {
        return enabledTags.some((raw) => {
            const refKey = tagTextMap[raw];
            if (!refKey) return false;
            const meta = catalogMetaByKey[refKey];
            return meta?.source === 'surat' && refKey !== 'nomor_surat' && refKey !== 'perihal';
        });
    }, [enabledTags, tagTextMap, catalogMetaByKey]);

    useEffect(() => {
        if (show && hasActiveSuratDateTag && !tanggalSurat) {
            setTanggalSurat(format(new Date(), 'yyyy-MM-dd'));
        }
    }, [show, hasActiveSuratDateTag, tanggalSurat]);

    // Grouped options for ModernSelect (Referensi Tag mapper)
    const tagMapperGroups: ModernSelectGroup[] = useMemo(() => {
        return tagCatalog
            .filter((g) => g.type === 'text' || g.id === 'tabel_belanja')
            .map((g) => ({
                label: g.group,
                options: g.items
                    .filter(
                        (it) =>
                            g.type === 'text' ||
                            it.key.startsWith('belanja_total') ||
                            it.key === 'belanja_jumlah_transaksi'
                    )
                    .map((it) => {
                        const liveVal =
                            it.key === 'nomor_surat'
                                ? nomorSurat || resolvedText[it.key]
                                : it.key === 'perihal'
                                  ? perihal || resolvedText[it.key]
                                  : resolvedText[it.key];
                        return {
                            value: it.key,
                            label: it.label,
                            badge: it.tag,
                            preview:
                                liveVal !== undefined && liveVal !== ''
                                    ? liveVal
                                    : undefined,
                            searchText: `${g.group} ${g.source_label} ${(it.aliases ?? []).join(' ')} ${it.example}`,
                        };
                    }),
            }))
            .filter((g) => g.options.length > 0);
    }, [tagCatalog, resolvedText, nomorSurat, perihal]);

    const templateSelectOptions: ModernSelectOption[] = useMemo(
        () =>
            templates.map((tpl) => ({
                value: tpl.id.toString(),
                label: tpl.judul,
                badge: `${tpl.detected_variables?.length ?? 0} tag`,
                description:
                    tpl.file_name_original +
                    (tpl.tag_mappings && Object.keys(tpl.tag_mappings.text_map || {}).length > 0
                        ? ' • Ada pemetaan tersimpan'
                        : ''),
            })),
        [templates]
    );

    const variantSelectOptions: ModernSelectOption[] = useMemo(() => {
        const list = sourceOptions?.variants ?? [
            { value: 'reguler', label: 'BOSP Reguler' },
            { value: 'kinerja', label: 'BOSP Kinerja' },
            { value: 'silpa', label: 'SiLPA BOSP Reguler' },
            { value: 'kinerja_silpa', label: 'SiLPA BOSP Kinerja' },
        ];
        return list.map((v) => ({ value: v.value, label: v.label }));
    }, [sourceOptions]);

    const penganggaranSelectOptions: ModernSelectOption[] = useMemo(
        () =>
            (sourceOptions?.penganggarans ?? []).map((p) => ({
                value: String(p.id),
                label: `Tahun Anggaran ${p.tahun_anggaran}`,
                badge:
                    (p.bku_count ?? 0) > 0
                        ? `${p.bku_count} BKU`
                        : p.pagu_anggaran_rupiah,
                description: [
                    p.pagu_anggaran_rupiah,
                    p.kepala_sekolah ? `Kepsek: ${p.kepala_sekolah}` : '',
                ]
                    .filter(Boolean)
                    .join(' • '),
            })),
        [sourceOptions]
    );

    const bkuSelectOptions: ModernSelectOption[] = useMemo(
        () =>
            (sourceOptions?.bku_items ?? []).map((b) => ({
                value: String(b.id),
                label: b.uraian,
                badge: b.no_bukti,
                description: `${b.tanggal} • ${b.toko} • ${b.total_rupiah}${b.items_count > 0 ? ` (${b.items_count} item)` : ''}`,
                searchText: `${b.no_bukti} ${b.tanggal} ${b.toko} ${b.kode_kegiatan} ${b.kode_rekening} ${b.total_rupiah}`,
            })),
        [sourceOptions]
    );

    const penerimaanSelectOptions: ModernSelectOption[] = useMemo(
        () =>
            (sourceOptions?.penerimaans ?? []).map((p) => ({
                value: String(p.id),
                label: p.sumber_dana,
                badge: p.jumlah_rupiah,
                description: `Tanggal terima: ${p.tanggal}`,
            })),
        [sourceOptions]
    );

    const ptkYearSelectOptions: ModernSelectOption[] = useMemo(
        () =>
            (sourceOptions?.ptk_years ?? []).map((y) => ({
                value: String(y),
                label: `Tahun ${y}`,
            })),
        [sourceOptions]
    );

    const ptkSelectOptions: ModernSelectOption[] = useMemo(
        () =>
            (sourceOptions?.ptks ?? []).map((p) => ({
                value: String(p.id),
                label: p.nama,
                badge: p.nuptk !== '-' ? p.nuptk : undefined,
                description: `${p.jenis} • ${p.jenis_kelamin}`,
                searchText: `${p.nama} ${p.nuptk} ${p.jenis}`,
            })),
        [sourceOptions]
    );

    const loadMappingIntoState = useCallback(
        (mapping?: Partial<SkTemplateTagMapping> | null, enableSavedTags = false) => {
            if (!mapping) {
                setTagTextMap({});
                setEnabledTags([]);
                setEnabledTables([]);
                setEnabledImages([]);
                return;
            }
            setTagTextMap(
                mapping.text_map && typeof mapping.text_map === 'object'
                    ? { ...mapping.text_map }
                    : {}
            );
            setEnabledTags(
                enableSavedTags && Array.isArray(mapping.enabled_tags)
                    ? [...mapping.enabled_tags]
                    : []
            );
            setEnabledTables(
                enableSavedTags && Array.isArray(mapping.enabled_tables)
                    ? [...mapping.enabled_tables]
                    : []
            );
            setEnabledImages(
                enableSavedTags && Array.isArray(mapping.enabled_images)
                    ? [...mapping.enabled_images]
                    : []
            );
        },
        []
    );

    // Initialize modal state cleanly when opened
    useEffect(() => {
        if (!show) {
            setShowRefPanel(false);
            setSyncNotice(null);
            setErrors({});
            return;
        }

        setErrors({});
        setShowRefPanel(false);
        setSyncNotice(null);
        setBkuSearch('');
        setPtkSearch('');
        setTagFilter('');
        setBulanFilter('');
        setSaveTemplateMapping(false);
        setResolvedText(schoolData);

        if (dokumen) {
            preserveInitialEditValuesRef.current = true;
            const tpl = templates.find((t) => t.id === dokumen.template_id) ?? dokumen.template ?? null;
            setSelectedTemplateId(dokumen.template_id?.toString() || '');
            setPerihal(dokumen.perihal || '');
            setNomorSurat(dokumen.nomor_surat || '');
            setTanggalSurat(dokumen.tanggal_surat ? dokumen.tanggal_surat.substring(0, 10) : '');
            setKeterangan(dokumen.keterangan || '');

            const saved: Record<string, string> = {};
            (tpl?.detected_variables ?? []).forEach((v) => {
                saved[v] = '';
            });
            if (dokumen.data_isian) {
                Object.entries(dokumen.data_isian).forEach(([k, v]) => {
                    saved[k] = v !== null && v !== undefined ? String(v) : '';
                });
            }
            setDataIsian(saved);

            const sd = dokumen.sumber_data ?? {};
            setSumberData({
                variant: sd.variant || 'reguler',
                penganggaran_id: sd.penganggaran_id ?? null,
                bku_id: sd.bku_id ?? null,
                bku_ids: Array.isArray(sd.bku_ids) ? sd.bku_ids : [],
                penerimaan_id: sd.penerimaan_id ?? null,
                ptk_id: sd.ptk_id ?? null,
                ptk_ids: Array.isArray(sd.ptk_ids) ? sd.ptk_ids : [],
            });
            setPreviewTables(sd.table_rows ?? EMPTY_TABLES);

            // On edit, restore active mappings that were saved on this document
            const docMapping = sd.tag_mappings ?? null;
            loadMappingIntoState(docMapping ?? tpl?.tag_mappings ?? null, Boolean(docMapping));
        } else {
            preserveInitialEditValuesRef.current = false;
            const defaultTpl = templates.length > 0 ? templates[0] : null;
            setSelectedTemplateId(defaultTpl ? defaultTpl.id.toString() : '');
            setPerihal('');
            setNomorSurat('');
            setTanggalSurat('');
            setKeterangan('');

            const blankIsian: Record<string, string> = {};
            (defaultTpl?.detected_variables ?? []).forEach((v) => {
                blankIsian[v] = '';
            });
            setDataIsian(blankIsian);
            setSumberData(EMPTY_SUMBER_DATA);
            setPreviewTables(EMPTY_TABLES);
            // Pre-populate dropdown choices from saved template mapping, but keep unchecked until user turns on Referensi Tag!
            loadMappingIntoState(defaultTpl?.tag_mappings ?? null, false);
        }
    }, [show, dokumen, templates, schoolData, loadMappingIntoState]);

    const shouldLoadSikasData =
        show && (showRefPanel || activeSources.length > 0 || enabledImages.length > 0);

    // Fetch source options whenever panel is open OR any dynamic source is active
    const fetchSourceOptions = useCallback(
        async (params: {
            variant: string;
            penganggaran_id?: number | null;
            bulan?: string;
            ptk_tahun?: string;
        }) => {
            setLoadingOptions(true);
            try {
                const res = await axios.get<SkDataSourceOptions>(route('sk-surat.data-sources.options'), {
                    params: {
                        variant: params.variant,
                        penganggaran_id: params.penganggaran_id ?? undefined,
                        bulan: params.bulan || undefined,
                        ptk_tahun: params.ptk_tahun || undefined,
                    },
                });
                const opts = res.data;
                setSourceOptions(opts);
                if (!ptkTahunFilter && opts.active_ptk_tahun) {
                    setPtkTahunFilter(String(opts.active_ptk_tahun));
                }
                setSumberData((prev) => {
                    const nextPengId =
                        prev.penganggaran_id && opts.penganggarans.some((p) => p.id === prev.penganggaran_id)
                            ? prev.penganggaran_id
                            : opts.active_penganggaran_id;

                    // Auto-pick first available record when user activates a source and hasn't chosen one yet
                    const nextBkuId =
                        prev.bku_id && opts.bku_items.some((b) => b.id === prev.bku_id)
                            ? prev.bku_id
                            : needsSingleBku && opts.bku_items.length > 0
                              ? opts.bku_items[0].id
                              : prev.bku_id;

                    const nextPenId =
                        prev.penerimaan_id && opts.penerimaans.some((p) => p.id === prev.penerimaan_id)
                            ? prev.penerimaan_id
                            : needsPenerimaan && opts.penerimaans.length > 0
                              ? opts.penerimaans[0].id
                              : prev.penerimaan_id;

                    const nextPtkId =
                        prev.ptk_id && opts.ptks.some((p) => p.id === prev.ptk_id)
                            ? prev.ptk_id
                            : needsSinglePtk && opts.ptks.length > 0
                              ? opts.ptks[0].id
                              : prev.ptk_id;

                    if (
                        nextPengId === prev.penganggaran_id &&
                        nextBkuId === prev.bku_id &&
                        nextPenId === prev.penerimaan_id &&
                        nextPtkId === prev.ptk_id
                    ) {
                        return prev;
                    }

                    return {
                        ...prev,
                        penganggaran_id: nextPengId,
                        bku_id: nextBkuId,
                        penerimaan_id: nextPenId,
                        ptk_id: nextPtkId,
                    };
                });
            } catch {
                // Abaikan bila gagal memuat opsi sementara
            } finally {
                setLoadingOptions(false);
            }
        },
        [ptkTahunFilter, needsSingleBku, needsPenerimaan, needsSinglePtk]
    );

    useEffect(() => {
        if (!shouldLoadSikasData) return;
        fetchSourceOptions({
            variant: sumberData.variant,
            penganggaran_id: sumberData.penganggaran_id,
            bulan: bulanFilter,
            ptk_tahun: ptkTahunFilter,
        });
    }, [
        shouldLoadSikasData,
        sumberData.variant,
        sumberData.penganggaran_id,
        bulanFilter,
        ptkTahunFilter,
        needsSingleBku,
        needsPenerimaan,
        needsSinglePtk,
    ]);

    // Fetch resolved tag values (with server-side auto_default so even the very first response has zero empty BKU/PTK values!)
    const fetchResolvedValues = useCallback(async () => {
        const reqId = ++resolveReqIdRef.current;
        setLoadingPreview(true);
        try {
            const res = await axios.post<{
                text: Record<string, string>;
                table_rows: SkTableRowsPreview;
                has_images: Record<string, boolean>;
                resolved_context?: Partial<SkSumberDataState>;
            }>(route('sk-surat.data-sources.resolve'), {
                variant: sumberData.variant,
                penganggaran_id: sumberData.penganggaran_id,
                bku_id: sumberData.bku_id,
                bku_ids: sumberData.bku_ids,
                penerimaan_id: sumberData.penerimaan_id,
                ptk_id: sumberData.ptk_id,
                ptk_ids: sumberData.ptk_ids,
                tanggal_surat: tanggalSurat || undefined,
                nomor_surat: nomorSurat || undefined,
                perihal: perihal || undefined,
                auto_default: true,
                required_sources: activeSources,
            });
            if (reqId !== resolveReqIdRef.current) return;

            setResolvedText(res.data.text || {});
            setPreviewTables(res.data.table_rows || EMPTY_TABLES);
            setHasImages(res.data.has_images || {});

            const rc = res.data.resolved_context;
            if (rc) {
                setSumberData((prev) => {
                    const nextPeng = prev.penganggaran_id ?? rc.penganggaran_id ?? null;
                    const nextBku = prev.bku_id ?? (needsSingleBku ? (rc.bku_id ?? null) : null);
                    const nextPen = prev.penerimaan_id ?? (needsPenerimaan ? (rc.penerimaan_id ?? null) : null);
                    const nextPtk = prev.ptk_id ?? (needsSinglePtk ? (rc.ptk_id ?? null) : null);
                    if (
                        nextPeng === prev.penganggaran_id &&
                        nextBku === prev.bku_id &&
                        nextPen === prev.penerimaan_id &&
                        nextPtk === prev.ptk_id
                    ) {
                        return prev;
                    }
                    return {
                        ...prev,
                        penganggaran_id: nextPeng,
                        bku_id: nextBku,
                        penerimaan_id: nextPen,
                        ptk_id: nextPtk,
                    };
                });
            }
        } catch {
            if (reqId === resolveReqIdRef.current) {
                setResolvedText(schoolData);
            }
        } finally {
            if (reqId === resolveReqIdRef.current) {
                setLoadingPreview(false);
            }
        }
    }, [
        sumberData,
        tanggalSurat,
        nomorSurat,
        perihal,
        activeSources,
        needsSingleBku,
        needsPenerimaan,
        needsSinglePtk,
        schoolData,
    ]);

    useEffect(() => {
        if (!shouldLoadSikasData) return;
        const timer = setTimeout(() => {
            fetchResolvedValues();
        }, 80);
        return () => clearTimeout(timer);
    }, [
        shouldLoadSikasData,
        sumberData.variant,
        sumberData.penganggaran_id,
        sumberData.bku_id,
        sumberData.bku_ids.join(','),
        sumberData.penerimaan_id,
        sumberData.ptk_id,
        sumberData.ptk_ids.join(','),
        tanggalSurat,
        nomorSurat,
        perihal,
        activeSources.join(','),
    ]);

    // LIVE REACTIVE SYNC: Every enabled & mapped system tag automatically keeps dataIsian[raw] in sync!
    useEffect(() => {
        if (!show || enabledTags.length === 0) return;
        if (preserveInitialEditValuesRef.current) {
            preserveInitialEditValuesRef.current = false;
            return;
        }

        setDataIsian((prev) => {
            let changed = false;
            const next = { ...prev };

            enabledTags.forEach((rawTag) => {
                const refKey = tagTextMap[rawTag];
                if (!refKey) return;

                let liveVal: string | undefined;
                if (refKey === 'nomor_surat') {
                    liveVal = nomorSurat;
                } else if (refKey === 'perihal') {
                    liveVal = perihal;
                } else {
                    liveVal = resolvedText[refKey];
                }

                if (liveVal !== undefined && next[rawTag] !== liveVal) {
                    next[rawTag] = liveVal;
                    changed = true;
                }
            });

            return changed ? next : prev;
        });
    }, [show, enabledTags, tagTextMap, resolvedText, nomorSurat, perihal]);

    const handleTemplateSelect = (tplId: string) => {
        const tpl = templates.find((t) => t.id.toString() === tplId) ?? null;
        setSelectedTemplateId(tplId);
        setSyncNotice(null);

        const blank: Record<string, string> = {};
        (tpl?.detected_variables ?? []).forEach((v) => {
            blank[v] = '';
        });
        setDataIsian(blank);
        loadMappingIntoState(tpl?.tag_mappings ?? null, false);
    };

    const handleVariantChange = (nextVariant: string) => {
        if (!nextVariant) return;
        setSumberData((prev) => ({
            ...prev,
            variant: nextVariant,
            penganggaran_id: null,
            bku_id: null,
            bku_ids: [],
            penerimaan_id: null,
        }));
    };

    const handlePenganggaranChange = (nextId: number | null) => {
        setSumberData((prev) => ({
            ...prev,
            penganggaran_id: nextId,
            bku_id: null,
            bku_ids: [],
            penerimaan_id: null,
        }));
    };

    const toggleMultiId = (field: 'bku_ids' | 'ptk_ids', id: number) => {
        setSumberData((prev) => {
            const list = prev[field];
            return {
                ...prev,
                [field]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id],
            };
        });
    };

    const toggleTagEnabled = (rawTag: string) => {
        const isCurrentlyEnabled = enabledTags.includes(rawTag);
        if (isCurrentlyEnabled) {
            setEnabledTags((prev) => prev.filter((t) => t !== rawTag));
            return;
        }
        // If user checks the box and no refKey was chosen yet, try matching by same name automatically for convenience!
        if (!tagTextMap[rawTag]) {
            const norm = normalizeKey(rawTag);
            const hit = catalogMetaByKey[rawTag.trim()] ?? catalogMetaByKey[norm];
            if (hit) {
                setTagTextMap((prev) => ({ ...prev, [rawTag]: hit.key }));
            }
        }
        setEnabledTags((prev) => [...prev, rawTag]);
    };

    const handleChangeTagMapping = (rawTag: string, refKey: string) => {
        setTagTextMap((prev) => {
            const next = { ...prev };
            if (!refKey) {
                delete next[rawTag];
            } else {
                next[rawTag] = refKey;
            }
            return next;
        });

        if (refKey) {
            setEnabledTags((prev) => (prev.includes(rawTag) ? prev : [...prev, rawTag]));
        } else {
            setEnabledTags((prev) => prev.filter((t) => t !== rawTag));
        }
    };

    const handleDetachToManual = (rawTag: string) => {
        setEnabledTags((prev) => prev.filter((t) => t !== rawTag));
    };

    const toggleTableEnabled = (tg: TableGroupKey) => {
        setEnabledTables((prev) =>
            prev.includes(tg) ? prev.filter((x) => x !== tg) : [...prev, tg]
        );
    };

    const toggleImageEnabled = (img: ImageKey) => {
        setEnabledImages((prev) =>
            prev.includes(img) ? prev.filter((x) => x !== img) : [...prev, img]
        );
    };

    const handleMatchSameNames = () => {
        const nextMap: Record<string, string> = { ...tagTextMap };
        const nextEnabled = new Set(enabledTags);
        const nextTables = new Set<TableGroupKey>(enabledTables);
        const nextImages = new Set<ImageKey>(enabledImages);
        let matched = 0;

        detectedVariables.forEach((raw) => {
            const trimmed = raw.trim();
            const baseImg = trimmed.split(':')[0].trim() as ImageKey;
            if (['kop_surat', 'logo_sekolah', 'logo_daerah'].includes(baseImg)) {
                nextImages.add(baseImg);
                matched++;
                return;
            }
            const norm = normalizeKey(trimmed);
            if (norm.startsWith('item_')) {
                nextTables.add('item');
                matched++;
                return;
            }
            if (norm === 'ptk_no' || norm.endsWith('_row')) {
                nextTables.add('ptk');
                matched++;
                return;
            }
            if (
                norm.startsWith('belanja_') &&
                !norm.startsWith('belanja_total') &&
                norm !== 'belanja_jumlah_transaksi'
            ) {
                nextTables.add('belanja');
                matched++;
                return;
            }

            const hit = catalogMetaByKey[trimmed] ?? catalogMetaByKey[norm];
            if (hit) {
                nextMap[raw] = hit.key;
                nextEnabled.add(raw);
                matched++;
            }
        });

        setTagTextMap(nextMap);
        setEnabledTags(Array.from(nextEnabled));
        setEnabledTables(Array.from(nextTables));
        setEnabledImages(Array.from(nextImages));
        setSyncNotice(
            matched > 0
                ? `${matched} tag berhasil dihubungkan otomatis ke data SIKAS dan form kiri langsung diperbarui.`
                : 'Tidak ada nama tag Word yang sama persis dengan katalog SIKAS. Silakan pilih pemetaannya pada dropdown masing-masing tag.'
        );
    };

    const handleClearMappingSelection = () => {
        setEnabledTags([]);
        setEnabledTables([]);
        setEnabledImages([]);
        setSyncNotice('Seluruh tag dikembalikan ke mode input manual.');
    };

    const handleSaveMappingToTemplate = async () => {
        if (!selectedTemplate) return;
        setSavingMapping(true);
        setSyncNotice(null);
        try {
            const payload: SkTemplateTagMapping = {
                text_map: tagTextMap,
                enabled_tags: enabledTags,
                enabled_tables: enabledTables,
                enabled_images: enabledImages,
            };
            const res = await axios.put<{ success: boolean; message?: string }>(
                route('sk-surat.template.tag-mapping', selectedTemplate.id),
                payload
            );
            setSyncNotice(res.data.message || 'Pemetaan tag berhasil disimpan ke master template.');
        } catch {
            setSyncNotice('Gagal menyimpan pemetaan tag ke master template.');
        } finally {
            setSavingMapping(false);
        }
    };

    const filteredBkuOptions = useMemo(() => {
        const items = sourceOptions?.bku_items ?? [];
        const q = bkuSearch.trim().toLowerCase();
        if (!q) return items;
        return items.filter(
            (b) =>
                b.label.toLowerCase().includes(q) ||
                b.kode_kegiatan.toLowerCase().includes(q) ||
                b.kode_rekening.toLowerCase().includes(q)
        );
    }, [sourceOptions, bkuSearch]);

    const filteredPtkOptions = useMemo(() => {
        const items = sourceOptions?.ptks ?? [];
        const q = ptkSearch.trim().toLowerCase();
        if (!q) return items;
        return items.filter(
            (p) =>
                p.nama.toLowerCase().includes(q) ||
                p.nuptk.toLowerCase().includes(q) ||
                p.jenis.toLowerCase().includes(q)
        );
    }, [sourceOptions, ptkSearch]);

    const mappableTemplateTags = useMemo(() => {
        const q = tagFilter.trim().toLowerCase();
        return detectedVariables.filter((raw) => {
            if (!q) return true;
            return raw.toLowerCase().includes(q) || (tagTextMap[raw] ?? '').toLowerCase().includes(q);
        });
    }, [detectedVariables, tagFilter, tagTextMap]);

    const selectedSyncCount = useMemo(
        () => enabledTags.filter((t) => Boolean(tagTextMap[t])).length,
        [enabledTags, tagTextMap]
    );

    const resolveDisplayStatusForMappedKey = (refKey: string): { text: string; isReady: boolean } => {
        if (refKey === 'nomor_surat') {
            return nomorSurat
                ? { text: nomorSurat, isReady: true }
                : { text: 'Mengikuti input Nomor Surat di atas (ketik Nomor Surat untuk mengisi)', isReady: true };
        }
        if (refKey === 'perihal') {
            return perihal
                ? { text: perihal, isReady: true }
                : { text: 'Mengikuti input Perihal di atas (ketik Perihal untuk mengisi)', isReady: true };
        }
        const val = resolvedText[refKey];
        if (val !== undefined && val !== '') {
            return { text: val, isReady: true };
        }
        if (loadingPreview || loadingOptions) {
            return { text: 'Memuat nilai dari database SIKAS...', isReady: true };
        }
        return { text: 'Belum ada data pada sumber/tahun yang dipilih', isReady: false };
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        if (!perihal.trim()) {
            setErrors({ perihal: 'Perihal / Nama dokumen surat wajib diisi.' });
            return;
        }
        if (!isEdit && !selectedTemplateId) {
            setErrors({ template_id: 'Pilih master template terlebih dahulu.' });
            return;
        }

        const mappingPayload: SkTemplateTagMapping = {
            text_map: tagTextMap,
            enabled_tags: enabledTags,
            enabled_tables: enabledTables,
            enabled_images: enabledImages,
        };

        const hasAnySyncSetup =
            enabledTags.length > 0 ||
            enabledTables.length > 0 ||
            enabledImages.length > 0 ||
            Object.keys(tagTextMap).length > 0 ||
            sumberData.bku_id !== null ||
            sumberData.bku_ids.length > 0 ||
            sumberData.penerimaan_id !== null ||
            sumberData.ptk_id !== null ||
            sumberData.ptk_ids.length > 0;

        const payloadSumberData = hasAnySyncSetup
            ? {
                  variant: sumberData.variant,
                  penganggaran_id: sumberData.penganggaran_id,
                  bku_id: sumberData.bku_id,
                  bku_ids: sumberData.bku_ids,
                  penerimaan_id: sumberData.penerimaan_id,
                  ptk_id: sumberData.ptk_id,
                  ptk_ids: sumberData.ptk_ids,
                  tag_mappings: mappingPayload,
                  enabled_tables: enabledTables,
                  enabled_images: enabledImages,
              }
            : null;

        setLoading(true);
        if (isEdit && dokumen) {
            router.put(
                route('sk-surat.dokumen.update', dokumen.id),
                {
                    perihal,
                    nomor_surat: nomorSurat || null,
                    tanggal_surat: tanggalSurat || null,
                    data_isian: dataIsian,
                    sumber_data: payloadSumberData as any,
                    save_template_mapping: saveTemplateMapping,
                    keterangan,
                },
                {
                    onSuccess: () => onClose(),
                    onError: (err) => setErrors(err),
                    onFinish: () => setLoading(false),
                }
            );
        } else {
            router.post(
                route('sk-surat.dokumen.store', folderId),
                {
                    template_id: selectedTemplateId,
                    perihal,
                    nomor_surat: nomorSurat || null,
                    tanggal_surat: tanggalSurat || null,
                    data_isian: dataIsian,
                    sumber_data: payloadSumberData as any,
                    save_template_mapping: saveTemplateMapping,
                    keterangan,
                },
                {
                    onSuccess: () => onClose(),
                    onError: (err) => setErrors(err),
                    onFinish: () => setLoading(false),
                }
            );
        }
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="full">
            <form onSubmit={handleSubmit} className="relative flex h-screen flex-col overflow-hidden bg-slate-50/40 dark:bg-[#15131F]">
                {/* Header Bar */}
                <div className="relative z-30 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-white px-6 py-3.5 dark:border-white/10 dark:bg-[#15131F]">
                    <div className="flex min-w-0 items-center gap-3">
                        <IconTile tone="lime" size="lg">
                            <Sparkles className="h-4 w-4" />
                        </IconTile>
                        <div className="min-w-0">
                            <h3 className="text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                {isEdit ? 'Edit Dokumen Surat Dinamis' : 'Buat Dokumen Surat dari Word'}
                            </h3>
                            <p className="text-[10.5px] font-medium text-slate-500 dark:text-slate-400">
                                Klik <span className="font-bold text-brand-600 dark:text-brand-300">Gunakan Referensi Tag</span> untuk menghubungkan tag surat ke data newSIKAS — form kiri akan langsung menyesuaikan secara live.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {allowWrite && selectedTemplate && (
                            <button
                                type="button"
                                onClick={() => setShowRefPanel((v) => !v)}
                                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[11.5px] font-extrabold shadow-sm transition ${
                                    showRefPanel
                                        ? 'bg-brand-600 text-white hover:bg-brand-700 dark:bg-brand-500'
                                        : 'bg-lime-400 text-slate-950 hover:bg-lime-300'
                                }`}
                            >
                                <Database className="h-4 w-4" />
                                {showRefPanel ? 'Tutup Panel Referensi Tag' : 'Gunakan Referensi Tag'}
                                {selectedSyncCount > 0 && (
                                    <span className="ml-0.5 rounded-full bg-black/15 px-1.5 py-0.5 text-[10px]">
                                        {selectedSyncCount} Aktif
                                    </span>
                                )}
                            </button>
                        )}

                        {onOpenTagReference && (
                            <button
                                type="button"
                                onClick={onOpenTagReference}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-extrabold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                            >
                                <BookOpen className="h-3.5 w-3.5 text-brand-500" />
                                Katalog Tag
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Tutup modal"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/10"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Template Selector Strip */}
                <div className="relative z-20 shrink-0 border-b border-slate-200/70 bg-slate-50/90 px-6 py-3 dark:border-white/10 dark:bg-white/[0.02]">
                    <div className="mx-auto flex max-w-[1600px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        {!isEdit ? (
                            <div className="flex flex-1 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                                <label className="shrink-0 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                    Master Template <span className="text-rose-500">*</span>
                                </label>
                                <div className="flex-1 sm:max-w-xl">
                                    <ModernSelect
                                        value={selectedTemplateId}
                                        onChange={handleTemplateSelect}
                                        options={templateSelectOptions}
                                        placeholder="-- Pilih Master Template Word --"
                                        searchPlaceholder="Cari judul template..."
                                        searchable={templates.length > 4}
                                        icon={<FileText className="h-4 w-4 text-brand-500" />}
                                    />
                                </div>
                                {errors.template_id && (
                                    <p className="text-[11px] font-semibold text-rose-600">{errors.template_id}</p>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-[12px] font-bold text-slate-700 dark:text-slate-200">
                                <FileText className="h-4 w-4 text-brand-500" />
                                <span>Template: {selectedTemplate?.judul || '-'}</span>
                                <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-extrabold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                                    {detectedVariables.length} tag
                                </span>
                            </div>
                        )}

                        <div className="flex flex-wrap items-center gap-2 text-[10.5px] font-bold text-slate-500 dark:text-slate-400">
                            {selectedSyncCount > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                                    <CheckCircle2 className="h-3 w-3" />
                                    {selectedSyncCount} Tag Terhubung ke SIKAS
                                </span>
                            )}
                            {enabledTables.length > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">
                                    <TableIcon className="h-3 w-3" />
                                    {enabledTables.length} Tabel Dinamis Aktif
                                </span>
                            )}
                            {enabledImages.length > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                                    <ImageIcon className="h-3 w-3" />
                                    {enabledImages.length} Gambar Aktif
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Fullscreen Split Workspace */}
                <div className="relative flex-1 overflow-hidden">
                    <div
                        className={`grid h-full grid-cols-1 ${
                            showRefPanel ? 'lg:grid-cols-12' : ''
                        }`}
                    >
                        {/* LEFT PANE: Adaptive Form */}
                        <div
                            className={`sikas-scroll h-full overflow-y-auto px-6 py-5 ${
                                showRefPanel
                                    ? 'lg:col-span-7 lg:border-r lg:border-slate-200/80 dark:lg:border-white/10'
                                    : ''
                            }`}
                        >
                            <div className={showRefPanel ? 'space-y-5' : 'mx-auto max-w-5xl space-y-5'}>
                                {/* 1. Metadata Surat */}
                                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                                    <h4 className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                        Informasi Dasar Dokumen
                                    </h4>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                                        <div className="sm:col-span-5">
                                            <label className={LABEL_CLASS}>
                                                Perihal / Judul Surat <span className="text-rose-500">*</span>
                                            </label>
                                            <TextInput
                                                type="text"
                                                value={perihal}
                                                onChange={(e) => setPerihal(e.target.value)}
                                                placeholder="Contoh: Surat Pesanan ATK Bulan Maret"
                                                required
                                                disabled={!allowWrite}
                                            />
                                            {errors.perihal && (
                                                <p className="mt-1 text-[11px] font-semibold text-rose-600">{errors.perihal}</p>
                                            )}
                                        </div>
                                        <div className="sm:col-span-3">
                                            <label className={LABEL_CLASS}>Nomor Surat</label>
                                            <TextInput
                                                type="text"
                                                value={nomorSurat}
                                                onChange={(e) => setNomorSurat(e.target.value)}
                                                placeholder="421/001/2026"
                                                disabled={!allowWrite}
                                            />
                                        </div>
                                        <div className="sm:col-span-4">
                                            <label className={LABEL_CLASS}>Tanggal Surat</label>
                                            <div className="flex items-center gap-1.5">
                                                <DatePicker
                                                    value={tanggalSurat || undefined}
                                                    onChange={(date) =>
                                                        setTanggalSurat(date ? format(date, 'yyyy-MM-dd') : '')
                                                    }
                                                    placeholder="Pilih tanggal surat"
                                                    inputDisabled={!allowWrite}
                                                />
                                                {tanggalSurat && allowWrite && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setTanggalSurat('')}
                                                        title="Kosongkan tanggal"
                                                        className="inline-flex h-[42px] w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 2. ADAPTIVE SYSTEM SOURCE PICKERS — Automatically appears on the form as soon as user maps corresponding system tags! */}
                                {hasActiveDataPickers && (
                                    <div className="space-y-3.5 rounded-2xl border border-brand-300/80 bg-brand-50/50 p-4 shadow-sm dark:border-brand-400/25 dark:bg-brand-500/[0.07]">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <Database className="h-4 w-4 text-brand-600 dark:text-brand-300" />
                                                <div>
                                                    <h4 className="text-[12px] font-extrabold text-slate-900 dark:text-white">
                                                        Sumber Data Sistem Aktif
                                                    </h4>
                                                    <p className="text-[10.5px] font-medium text-slate-500 dark:text-slate-400">
                                                        Ubah pilihan di bawah ini — seluruh kolom tag sistem di bawah akan ikut berubah secara otomatis.
                                                    </p>
                                                </div>
                                            </div>
                                            {(loadingPreview || loadingOptions) && (
                                                <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold text-brand-600 dark:text-brand-300">
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    Menyinkronkan...
                                                </span>
                                            )}
                                        </div>

                                        {/* Varian & Tahun Anggaran */}
                                        {needsPenganggaran && (
                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                <div>
                                                    <label className={LABEL_CLASS}>Varian Sumber Dana BOSP</label>
                                                    <ModernSelect
                                                        value={sumberData.variant}
                                                        onChange={handleVariantChange}
                                                        options={variantSelectOptions}
                                                        searchable={false}
                                                        disabled={!allowWrite}
                                                    />
                                                </div>
                                                <div>
                                                    <label className={LABEL_CLASS}>Tahun Anggaran / Pagu</label>
                                                    <ModernSelect
                                                        value={sumberData.penganggaran_id ? String(sumberData.penganggaran_id) : ''}
                                                        onChange={(val) =>
                                                            handlePenganggaranChange(val ? Number(val) : null)
                                                        }
                                                        options={penganggaranSelectOptions}
                                                        placeholder={
                                                            penganggaranSelectOptions.length === 0
                                                                ? 'Belum ada penganggaran di varian ini'
                                                                : '-- Pilih Tahun Anggaran --'
                                                        }
                                                        searchable={penganggaranSelectOptions.length > 5}
                                                        disabled={!allowWrite}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Pilih 1 Transaksi Belanja BKU */}
                                        {needsSingleBku && (
                                            <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200/80 bg-white p-3 dark:border-white/10 dark:bg-white/[0.03] sm:grid-cols-12">
                                                <div className="sm:col-span-4">
                                                    <label className={LABEL_CLASS}>Filter Bulan BKU</label>
                                                    <ModernSelect
                                                        value={bulanFilter}
                                                        onChange={setBulanFilter}
                                                        options={BULAN_OPTIONS}
                                                        placeholder="Semua Bulan"
                                                        searchable={false}
                                                        disabled={!allowWrite}
                                                    />
                                                </div>
                                                <div className="sm:col-span-8">
                                                    <label className={LABEL_CLASS}>Pilih Transaksi Belanja BKU</label>
                                                    <ModernSelect
                                                        value={sumberData.bku_id ? String(sumberData.bku_id) : ''}
                                                        onChange={(val) =>
                                                            setSumberData((prev) => ({
                                                                ...prev,
                                                                bku_id: val ? Number(val) : null,
                                                            }))
                                                        }
                                                        options={bkuSelectOptions}
                                                        placeholder="-- Pilih Transaksi Belanja BKU --"
                                                        searchPlaceholder="Cari nomor bukti, uraian, toko, rekening..."
                                                        disabled={!allowWrite}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Pilih Multi Belanja BKU */}
                                        {needsMultiBku && (
                                            <div className="space-y-2 rounded-xl border border-slate-200/80 bg-white p-3 dark:border-white/10 dark:bg-white/[0.03]">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <label className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                                        Daftar Transaksi Belanja untuk Tabel ({sumberData.bku_ids.length} dipilih)
                                                    </label>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <div className="w-36">
                                                            <ModernSelect
                                                                value={bulanFilter}
                                                                onChange={setBulanFilter}
                                                                options={BULAN_OPTIONS}
                                                                placeholder="Semua Bulan"
                                                                searchable={false}
                                                                compact
                                                            />
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={bkuSearch}
                                                            onChange={(e) => setBkuSearch(e.target.value)}
                                                            placeholder="Cari transaksi..."
                                                            className="w-36 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold dark:border-white/10 dark:bg-white/5 dark:text-white"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setSumberData((prev) => ({
                                                                    ...prev,
                                                                    bku_ids: filteredBkuOptions.map((b) => b.id),
                                                                }))
                                                            }
                                                            className="rounded-lg bg-sky-100 px-2.5 py-1 text-[10px] font-extrabold text-sky-700 dark:bg-sky-500/20 dark:text-sky-300"
                                                        >
                                                            Pilih Semua ({filteredBkuOptions.length})
                                                        </button>
                                                        {sumberData.bku_ids.length > 0 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setSumberData((prev) => ({ ...prev, bku_ids: [] }))}
                                                                className="rounded-lg bg-slate-200 px-2.5 py-1 text-[10px] font-bold text-slate-700 dark:bg-white/10 dark:text-slate-300"
                                                            >
                                                                Bersihkan
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="sikas-scroll max-h-36 space-y-1 overflow-y-auto pr-1">
                                                    {filteredBkuOptions.length === 0 ? (
                                                        <p className="py-2 text-center text-[10.5px] italic text-slate-400">
                                                            Belum ada transaksi belanja pada filter ini.
                                                        </p>
                                                    ) : (
                                                        filteredBkuOptions.map((b) => {
                                                            const checked = sumberData.bku_ids.includes(b.id);
                                                            return (
                                                                <label
                                                                    key={b.id}
                                                                    className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] ${
                                                                        checked
                                                                            ? 'bg-sky-50 font-bold text-sky-900 dark:bg-sky-500/15 dark:text-sky-200'
                                                                            : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5'
                                                                    }`}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={checked}
                                                                        onChange={() => toggleMultiId('bku_ids', b.id)}
                                                                        className="rounded border-slate-300 text-brand-600"
                                                                    />
                                                                    <span className="truncate">{b.label}</span>
                                                                </label>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Pilih Penerimaan Dana */}
                                        {needsPenerimaan && (
                                            <div className="rounded-xl border border-slate-200/80 bg-white p-3 dark:border-white/10 dark:bg-white/[0.03]">
                                                <label className={LABEL_CLASS}>Pilih Data Penerimaan Dana</label>
                                                <ModernSelect
                                                    value={sumberData.penerimaan_id ? String(sumberData.penerimaan_id) : ''}
                                                    onChange={(val) =>
                                                        setSumberData((prev) => ({
                                                            ...prev,
                                                            penerimaan_id: val ? Number(val) : null,
                                                        }))
                                                    }
                                                    options={penerimaanSelectOptions}
                                                    placeholder="-- Pilih Data Penerimaan Dana --"
                                                    searchable={penerimaanSelectOptions.length > 4}
                                                    disabled={!allowWrite}
                                                />
                                            </div>
                                        )}

                                        {/* Pilih 1 PTK */}
                                        {needsSinglePtk && (
                                            <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200/80 bg-white p-3 dark:border-white/10 dark:bg-white/[0.03] sm:grid-cols-12">
                                                {ptkYearSelectOptions.length > 0 && (
                                                    <div className="sm:col-span-4">
                                                        <label className={LABEL_CLASS}>Tahun PTK</label>
                                                        <ModernSelect
                                                            value={ptkTahunFilter}
                                                            onChange={setPtkTahunFilter}
                                                            options={ptkYearSelectOptions}
                                                            searchable={false}
                                                            disabled={!allowWrite}
                                                        />
                                                    </div>
                                                )}
                                                <div className={ptkYearSelectOptions.length > 0 ? 'sm:col-span-8' : 'sm:col-span-12'}>
                                                    <label className={LABEL_CLASS}>Pilih Data PTK / Guru &amp; Tendik</label>
                                                    <ModernSelect
                                                        value={sumberData.ptk_id ? String(sumberData.ptk_id) : ''}
                                                        onChange={(val) =>
                                                            setSumberData((prev) => ({
                                                                ...prev,
                                                                ptk_id: val ? Number(val) : null,
                                                            }))
                                                        }
                                                        options={ptkSelectOptions}
                                                        placeholder="-- Pilih Data PTK --"
                                                        searchPlaceholder="Cari nama, NUPTK, atau jenis PTK..."
                                                        disabled={!allowWrite}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Pilih Multi PTK */}
                                        {needsMultiPtk && (
                                            <div className="space-y-2 rounded-xl border border-slate-200/80 bg-white p-3 dark:border-white/10 dark:bg-white/[0.03]">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <label className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                                        Daftar PTK untuk Tabel ({sumberData.ptk_ids.length} dipilih)
                                                    </label>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        {ptkYearSelectOptions.length > 0 && (
                                                            <div className="w-32">
                                                                <ModernSelect
                                                                    value={ptkTahunFilter}
                                                                    onChange={setPtkTahunFilter}
                                                                    options={ptkYearSelectOptions}
                                                                    searchable={false}
                                                                    compact
                                                                />
                                                            </div>
                                                        )}
                                                        <input
                                                            type="text"
                                                            value={ptkSearch}
                                                            onChange={(e) => setPtkSearch(e.target.value)}
                                                            placeholder="Cari PTK..."
                                                            className="w-36 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold dark:border-white/10 dark:bg-white/5 dark:text-white"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setSumberData((prev) => ({
                                                                    ...prev,
                                                                    ptk_ids: filteredPtkOptions.map((p) => p.id),
                                                                }))
                                                            }
                                                            className="rounded-lg bg-sky-100 px-2.5 py-1 text-[10px] font-extrabold text-sky-700 dark:bg-sky-500/20 dark:text-sky-300"
                                                        >
                                                            Pilih Semua
                                                        </button>
                                                        {sumberData.ptk_ids.length > 0 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setSumberData((prev) => ({ ...prev, ptk_ids: [] }))}
                                                                className="rounded-lg bg-slate-200 px-2.5 py-1 text-[10px] font-bold text-slate-700 dark:bg-white/10 dark:text-slate-300"
                                                            >
                                                                Bersihkan
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="sikas-scroll max-h-36 space-y-1 overflow-y-auto pr-1">
                                                    {filteredPtkOptions.length === 0 ? (
                                                        <p className="py-2 text-center text-[10.5px] italic text-slate-400">
                                                            Belum ada data PTK aktif pada tahun ini.
                                                        </p>
                                                    ) : (
                                                        filteredPtkOptions.map((p) => {
                                                            const checked = sumberData.ptk_ids.includes(p.id);
                                                            return (
                                                                <label
                                                                    key={p.id}
                                                                    className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] ${
                                                                        checked
                                                                            ? 'bg-sky-50 font-bold text-sky-900 dark:bg-sky-500/15 dark:text-sky-200'
                                                                            : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5'
                                                                    }`}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={checked}
                                                                        onChange={() => toggleMultiId('ptk_ids', p.id)}
                                                                        className="rounded border-slate-300 text-brand-600"
                                                                    />
                                                                    <span className="truncate">{p.label}</span>
                                                                </label>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Banner Ajakan Gunakan Referensi Tag (saat belum ada tag sistem aktif & panel tertutup) */}
                                {!showRefPanel && selectedSyncCount === 0 && allowWrite && selectedTemplate && detectedVariables.length > 0 && (
                                    <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-brand-200/80 bg-brand-50/70 p-4 dark:border-brand-400/20 dark:bg-brand-500/10 sm:flex-row sm:items-center">
                                        <div className="flex items-start gap-2.5">
                                            <Database className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-300" />
                                            <div className="text-[11px] text-slate-700 dark:text-slate-200">
                                                <p className="font-extrabold text-slate-900 dark:text-white">
                                                    Mode Input Manual Aktif
                                                </p>
                                                <p className="mt-0.5 text-[10.5px] text-slate-600 dark:text-slate-300">
                                                    Ingin mengisi tag dari data Sekolah, Penganggaran, Belanja BKU, Penerimaan, atau PTK? Klik <span className="font-bold">Gunakan Referensi Tag</span> untuk memilih tag yang ingin dihubungkan ke sistem.
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShowRefPanel(true)}
                                            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-[11px] font-extrabold text-white shadow-sm transition hover:bg-brand-700"
                                        >
                                            <Link2 className="h-3.5 w-3.5" />
                                            Gunakan Referensi Tag
                                        </button>
                                    </div>
                                )}

                                {/* 3. Daftar Semua Variabel Template (Adaptif: Kolom Sistem vs Kolom Manual!) */}
                                {selectedTemplate && detectedVariables.length > 0 ? (
                                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                            <h4 className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                                Isian Variabel Dokumen ({detectedVariables.length})
                                            </h4>
                                            <span className="text-[10px] font-semibold text-slate-400">
                                                Tag hijau terisi otomatis dari SIKAS &bull; Tag abu-abu diisi manual
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                                            {detectedVariables.map((raw) => {
                                                const long = isLongField(raw);
                                                const dateLike = !long && isDateField(raw);
                                                const mappedRefKey = tagTextMap[raw] || '';
                                                const isSystemActive = enabledTags.includes(raw) && Boolean(mappedRefKey);
                                                const meta = mappedRefKey ? catalogMetaByKey[mappedRefKey] : undefined;

                                                if (isSystemActive) {
                                                    const currentVal = dataIsian[raw] ?? '';
                                                    return (
                                                        <div
                                                            key={raw}
                                                            className={`rounded-2xl border border-emerald-300/80 bg-emerald-50/40 p-3 transition dark:border-emerald-400/30 dark:bg-emerald-500/[0.06] ${
                                                                long ? 'sm:col-span-2' : ''
                                                            }`}
                                                        >
                                                            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1.5">
                                                                <div className="flex flex-wrap items-center gap-1.5">
                                                                    <span className="text-[11px] font-extrabold text-slate-900 dark:text-white">
                                                                        {formatTagLabel(raw)}
                                                                    </span>
                                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[9.5px] font-extrabold text-emerald-800 dark:bg-emerald-500/25 dark:text-emerald-200">
                                                                        <CheckCircle2 className="h-2.5 w-2.5" />
                                                                        {meta ? `${meta.sourceLabel}: ${meta.label}` : mappedRefKey}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <code className="rounded bg-white/80 px-1.5 py-0.5 font-mono text-[9.5px] font-bold text-emerald-700 ring-1 ring-emerald-200 dark:bg-white/10 dark:text-emerald-300 dark:ring-emerald-400/20">
                                                                        {`\${${raw}}`}
                                                                    </code>
                                                                    {allowWrite && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleDetachToManual(raw)}
                                                                            title="Lepas ikatan sistem & ubah secara manual"
                                                                            className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-0.5 text-[9.5px] font-extrabold text-slate-600 ring-1 ring-slate-200 transition hover:bg-amber-50 hover:text-amber-700 hover:ring-amber-300 dark:bg-white/10 dark:text-slate-300 dark:ring-white/10"
                                                                        >
                                                                            <Link2Off className="h-2.5 w-2.5" />
                                                                            Manual
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="rounded-xl border border-emerald-200/80 bg-white px-3 py-2 text-[12px] font-bold text-slate-800 dark:border-white/10 dark:bg-[#12101C] dark:text-emerald-100">
                                                                {currentVal !== '' ? (
                                                                    <span className="whitespace-pre-wrap break-words">{currentVal}</span>
                                                                ) : mappedRefKey === 'nomor_surat' ? (
                                                                    <span className="text-[11px] font-medium italic text-slate-400">
                                                                        Mengikuti kolom Nomor Surat di atas (ketik Nomor Surat untuk mengisi)
                                                                    </span>
                                                                ) : mappedRefKey === 'perihal' ? (
                                                                    <span className="text-[11px] font-medium italic text-slate-400">
                                                                        Mengikuti kolom Perihal di atas
                                                                    </span>
                                                                ) : loadingPreview || loadingOptions ? (
                                                                    <span className="text-[11px] font-medium italic text-slate-400">
                                                                        Memuat nilai dari database SIKAS...
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[11px] font-medium italic text-amber-600 dark:text-amber-400">
                                                                        Data sumber belum tersedia
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                // Manual Field
                                                return (
                                                    <div key={raw} className={long ? 'sm:col-span-2' : ''}>
                                                        <div className="mb-1 flex flex-wrap items-center justify-between gap-1.5">
                                                            <div className="flex flex-wrap items-center gap-1.5">
                                                                <label className="text-[11px] font-extrabold text-slate-800 dark:text-slate-100">
                                                                    {formatTagLabel(raw)}
                                                                </label>
                                                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9.5px] font-bold text-slate-500 dark:bg-white/10 dark:text-slate-400">
                                                                    Manual
                                                                </span>
                                                            </div>
                                                            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[9.5px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                                                                {`\${${raw}}`}
                                                            </code>
                                                        </div>

                                                        {long ? (
                                                            <textarea
                                                                rows={3}
                                                                value={dataIsian[raw] ?? ''}
                                                                onChange={(e) =>
                                                                    setDataIsian((prev) => ({
                                                                        ...prev,
                                                                        [raw]: e.target.value,
                                                                    }))
                                                                }
                                                                placeholder={`Ketik nilai untuk ${formatTagLabel(raw)}...`}
                                                                className={TEXTAREA_CLASS}
                                                                disabled={!allowWrite}
                                                            />
                                                        ) : dateLike ? (
                                                            <div className="flex items-center gap-1.5">
                                                                <TextInput
                                                                    type="text"
                                                                    value={dataIsian[raw] ?? ''}
                                                                    onChange={(e) =>
                                                                        setDataIsian((prev) => ({
                                                                            ...prev,
                                                                            [raw]: e.target.value,
                                                                        }))
                                                                    }
                                                                    placeholder="Pilih kalender atau ketik bebas..."
                                                                    disabled={!allowWrite}
                                                                />
                                                                <InlineCalendarPicker
                                                                    disabled={!allowWrite}
                                                                    onPickDate={(formatted) =>
                                                                        setDataIsian((prev) => ({
                                                                            ...prev,
                                                                            [raw]: formatted,
                                                                        }))
                                                                    }
                                                                />
                                                            </div>
                                                        ) : (
                                                            <TextInput
                                                                type="text"
                                                                value={dataIsian[raw] ?? ''}
                                                                onChange={(e) =>
                                                                    setDataIsian((prev) => ({
                                                                        ...prev,
                                                                        [raw]: e.target.value,
                                                                    }))
                                                                }
                                                                placeholder={`Ketik nilai untuk ${formatTagLabel(raw)}...`}
                                                                disabled={!allowWrite}
                                                            />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : selectedTemplate ? (
                                    <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-[11px] text-amber-800 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-300">
                                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                        <div className="space-y-1">
                                            <p className="font-bold">
                                                Belum ada tag variabel {'${...}'} yang terdeteksi pada template ini.
                                            </p>
                                            <p className="text-[10.5px]">
                                                Dokumen tetap bisa disimpan dan diunduh apa adanya, atau kelola master template untuk memperbarui file Word.
                                            </p>
                                            {onOpenManageTemplates && (
                                                <button
                                                    type="button"
                                                    onClick={onOpenManageTemplates}
                                                    className="mt-1 inline-flex items-center gap-1 font-extrabold underline"
                                                >
                                                    <Settings className="h-3.5 w-3.5" />
                                                    Buka Kelola Master Template
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ) : null}

                                {/* 4. Pratinjau Tabel Baris Dinamis & Gambar Kop Aktif pada Form Kiri */}
                                {(enabledTables.length > 0 || enabledImages.length > 0) && (
                                    <div className="space-y-3 rounded-2xl border border-sky-200/80 bg-sky-50/40 p-4 dark:border-sky-400/20 dark:bg-sky-500/[0.05]">
                                        <h4 className="flex items-center gap-2 text-[11.5px] font-extrabold text-slate-900 dark:text-white">
                                            <TableIcon className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                                            Pratinjau Tabel Dinamis &amp; Gambar yang Akan Dicetak
                                        </h4>

                                        {enabledImages.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {enabledImages.map((imgKey) => {
                                                    const ready = hasImages[imgKey];
                                                    return (
                                                        <span
                                                            key={imgKey}
                                                            className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[10.5px] font-bold ${
                                                                ready
                                                                    ? 'bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200'
                                                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
                                                            }`}
                                                        >
                                                            <ImageIcon className="h-3.5 w-3.5" />
                                                            <code className="font-mono">{`\${${imgKey}}`}</code>
                                                            <span>{ready ? '• Siap disisipkan' : '• Belum diunggah di Profil Sekolah'}</span>
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {enabledTables.map((tg) => {
                                            const rows = previewTables[tg] ?? [];
                                            const title =
                                                tg === 'item'
                                                    ? 'Tabel Rincian Item BKU'
                                                    : tg === 'ptk'
                                                      ? 'Tabel Daftar PTK'
                                                      : 'Tabel Daftar Belanja BKU';
                                            return (
                                                <div
                                                    key={tg}
                                                    className="rounded-xl border border-slate-200/80 bg-white p-3 dark:border-white/10 dark:bg-white/[0.03]"
                                                >
                                                    <div className="mb-2 flex items-center justify-between">
                                                        <span className="text-[11px] font-extrabold text-slate-800 dark:text-slate-100">
                                                            {title}
                                                        </span>
                                                        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-extrabold text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">
                                                            {rows.length} baris
                                                        </span>
                                                    </div>
                                                    {rows.length === 0 ? (
                                                        <p className="text-[10.5px] italic text-amber-600 dark:text-amber-400">
                                                            Pilih minimal 1 data pada kotak Sumber Data Sistem Aktif di atas.
                                                        </p>
                                                    ) : (
                                                        <div className="sikas-scroll max-h-36 overflow-auto rounded-lg border border-slate-100 dark:border-white/10">
                                                            <table className="w-full text-left text-[10.5px]">
                                                                <thead className="bg-slate-50 text-[9.5px] font-extrabold uppercase text-slate-500 dark:bg-white/5 dark:text-slate-400">
                                                                    <tr>
                                                                        {Object.keys(rows[0])
                                                                            .slice(0, 5)
                                                                            .map((col) => (
                                                                                <th key={col} className="px-2.5 py-1.5">
                                                                                    {col.replace(/_/g, ' ')}
                                                                                </th>
                                                                            ))}
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                                                    {rows.slice(0, 5).map((r, idx) => (
                                                                        <tr key={idx}>
                                                                            {Object.keys(rows[0])
                                                                                .slice(0, 5)
                                                                                .map((col) => (
                                                                                    <td
                                                                                        key={col}
                                                                                        className="max-w-[160px] truncate px-2.5 py-1.5 text-slate-700 dark:text-slate-300"
                                                                                    >
                                                                                        {r[col]}
                                                                                    </td>
                                                                                ))}
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* 5. Keterangan Tambahan */}
                                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                                    <label className={LABEL_CLASS}>Catatan / Keterangan Arsip (Opsional)</label>
                                    <textarea
                                        rows={2}
                                        value={keterangan}
                                        onChange={(e) => setKeterangan(e.target.value)}
                                        placeholder="Catatan internal untuk memudahkan pencarian arsip surat ini..."
                                        className={TEXTAREA_CLASS}
                                        disabled={!allowWrite}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* RIGHT PANE: Focused Tag Mapper Panel */}
                        {showRefPanel && (
                            <div className="flex h-full flex-col overflow-hidden bg-white dark:bg-[#191625] lg:col-span-5">
                                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200/80 bg-brand-50/60 px-5 py-3 dark:border-white/10 dark:bg-brand-500/10">
                                    <div className="flex items-center gap-2">
                                        <Database className="h-4 w-4 text-brand-600 dark:text-brand-300" />
                                        <div>
                                            <h4 className="text-[12px] font-extrabold text-slate-900 dark:text-white">
                                                Pilih &amp; Petakan Referensi Tag SIKAS
                                            </h4>
                                            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                                Pilih tag sistem di bawah — form kiri langsung menyesuaikan &amp; terisi otomatis.
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={fetchResolvedValues}
                                        disabled={loadingPreview || loadingOptions}
                                        className="inline-flex items-center gap-1 rounded-xl border border-brand-200 bg-white px-2.5 py-1.5 text-[10.5px] font-extrabold text-brand-700 hover:bg-brand-50 disabled:opacity-50 dark:border-brand-400/20 dark:bg-white/10 dark:text-brand-300"
                                        title="Segarkan nilai dari database"
                                    >
                                        {loadingPreview || loadingOptions ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <RefreshCw className="h-3.5 w-3.5" />
                                        )}
                                        Segarkan
                                    </button>
                                </div>

                                <div className="sikas-scroll flex-1 space-y-4 overflow-y-auto px-5 py-4">
                                    {syncNotice && (
                                        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[11px] font-semibold text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-500/15 dark:text-emerald-200">
                                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                                            <span>{syncNotice}</span>
                                        </div>
                                    )}

                                    {/* Pemetaan per Tag Word */}
                                    <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 dark:border-white/10 dark:bg-white/[0.03]">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <span className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
                                                Pemetaan Tag Word ({selectedSyncCount}/{detectedVariables.length} Aktif)
                                            </span>
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={handleMatchSameNames}
                                                    className="inline-flex items-center gap-1 rounded-lg bg-brand-100 px-2.5 py-1 text-[10px] font-extrabold text-brand-700 hover:bg-brand-200 dark:bg-brand-500/20 dark:text-brand-300"
                                                >
                                                    <Wand2 className="h-3 w-3" />
                                                    Cocokkan Nama Sama
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleClearMappingSelection}
                                                    className="rounded-lg bg-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-300 dark:bg-white/10 dark:text-slate-300"
                                                >
                                                    Reset ke Manual
                                                </button>
                                            </div>
                                        </div>

                                        {detectedVariables.length > 5 && (
                                            <div className="relative">
                                                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    type="text"
                                                    value={tagFilter}
                                                    onChange={(e) => setTagFilter(e.target.value)}
                                                    placeholder="Filter tag di template Word..."
                                                    className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-[11px] font-semibold dark:border-white/10 dark:bg-white/5 dark:text-white"
                                                />
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            {mappableTemplateTags.map((raw) => {
                                                const mappedKey = tagTextMap[raw] || '';
                                                const checked = enabledTags.includes(raw);
                                                const status = mappedKey
                                                    ? resolveDisplayStatusForMappedKey(mappedKey)
                                                    : null;

                                                return (
                                                    <div
                                                        key={raw}
                                                        className={`rounded-xl border p-2.5 transition ${
                                                            checked && mappedKey
                                                                ? 'border-emerald-300 bg-white shadow-sm dark:border-emerald-400/40 dark:bg-white/[0.06]'
                                                                : 'border-slate-200/80 bg-white/80 dark:border-white/10 dark:bg-white/[0.02]'
                                                        }`}
                                                    >
                                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                                            <label className="flex min-w-0 cursor-pointer items-center gap-2 sm:w-5/12">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={checked}
                                                                    onChange={() => toggleTagEnabled(raw)}
                                                                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-400"
                                                                />
                                                                <code className="truncate rounded-lg bg-slate-100 px-2 py-1 font-mono text-[10.5px] font-extrabold text-slate-800 dark:bg-white/10 dark:text-slate-100">
                                                                    {`\${${raw}}`}
                                                                </code>
                                                            </label>

                                                            <div className="sm:w-7/12">
                                                                <ModernSelect
                                                                    value={mappedKey}
                                                                    onChange={(val) => handleChangeTagMapping(raw, val)}
                                                                    groups={tagMapperGroups}
                                                                    placeholder="Pilih Referensi Tag SIKAS (Manual)"
                                                                    emptyOptionLabel="Biarkan Manual (Tidak Disinkronkan)"
                                                                    searchPlaceholder="Cari tag (mis. uraian, banyaknya, toko, pagu)..."
                                                                    panelWidthClass="w-[var(--button-width)] min-w-[320px] max-w-[92vw]"
                                                                    compact
                                                                    clearable
                                                                />
                                                            </div>
                                                        </div>

                                                        {mappedKey && status && (
                                                            <div className="mt-1.5 flex items-center justify-between gap-2 pl-6 text-[10px]">
                                                                <span className="truncate text-slate-500 dark:text-slate-400">
                                                                    Nilai aktif:{' '}
                                                                    <span
                                                                        className={
                                                                            status.isReady
                                                                                ? 'font-bold text-emerald-700 dark:text-emerald-300'
                                                                                : 'italic text-amber-600 dark:text-amber-400'
                                                                        }
                                                                    >
                                                                        {status.text}
                                                                    </span>
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Opsi Tabel Baris Dinamis & Gambar Kop/Logo */}
                                    <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 dark:border-white/10 dark:bg-white/[0.03]">
                                        <span className="block text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
                                            Tabel Baris Dinamis &amp; Gambar Kop (Opsional)
                                        </span>

                                        <div className="space-y-2">
                                            {TABLE_GROUPS.map((tg) => {
                                                const active = enabledTables.includes(tg.key);
                                                const count = previewTables[tg.key]?.length ?? 0;
                                                return (
                                                    <label
                                                        key={tg.key}
                                                        className="flex cursor-pointer items-start gap-2 rounded-xl border border-slate-200/70 bg-white p-2.5 text-[10.5px] hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-white/5"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={active}
                                                            onChange={() => toggleTableEnabled(tg.key)}
                                                            className="mt-0.5 rounded border-slate-300 text-sky-600"
                                                        />
                                                        <div className="min-w-0">
                                                            <div className="font-bold text-slate-800 dark:text-slate-100">
                                                                {tg.label}{' '}
                                                                <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[9.5px] text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">
                                                                    {count} baris
                                                                </span>
                                                            </div>
                                                            <div className="text-[9.5px] text-slate-400">{tg.hint}</div>
                                                        </div>
                                                    </label>
                                                );
                                            })}

                                            <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-3">
                                                {IMAGE_KEYS.map((img) => {
                                                    const active = enabledImages.includes(img.key);
                                                    const ready = hasImages[img.key];
                                                    return (
                                                        <label
                                                            key={img.key}
                                                            className="flex cursor-pointer items-start gap-2 rounded-xl border border-slate-200/70 bg-white p-2.5 text-[10px] hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.02]"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={active}
                                                                onChange={() => toggleImageEnabled(img.key)}
                                                                className="mt-0.5 rounded border-slate-300 text-violet-600"
                                                            />
                                                            <div className="min-w-0">
                                                                <div className="truncate font-bold text-slate-800 dark:text-slate-100">
                                                                    {`\${${img.key}}`}
                                                                </div>
                                                                <div
                                                                    className={`text-[9px] font-semibold ${
                                                                        ready ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                                                                    }`}
                                                                >
                                                                    {ready ? 'Tersedia' : 'Belum ada'}
                                                                </div>
                                                            </div>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Sticky Footer Right Pane: Save Template Mapping */}
                                <div className="shrink-0 border-t border-slate-200/80 bg-slate-50/90 px-5 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <label className="flex cursor-pointer items-center gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                                            <input
                                                type="checkbox"
                                                checked={saveTemplateMapping}
                                                onChange={(e) => setSaveTemplateMapping(e.target.checked)}
                                                className="rounded border-slate-300 text-brand-600"
                                            />
                                            Simpan pemetaan ke Master Template saat surat disimpan
                                        </label>
                                        <button
                                            type="button"
                                            onClick={handleSaveMappingToTemplate}
                                            disabled={savingMapping || !selectedTemplate}
                                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[10.5px] font-extrabold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                                        >
                                            <BookmarkCheck className="h-3.5 w-3.5 text-brand-500" />
                                            {savingMapping ? 'Menyimpan...' : 'Simpan Pemetaan Sekarang'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Sticky Footer */}
                <div className="relative z-30 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 bg-white px-6 py-3.5 dark:border-white/10 dark:bg-[#15131F]">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        <Info className="h-4 w-4 text-brand-500" />
                        <span>Hasil dokumen tersimpan dapat diunduh kapan saja dalam format Word (.docx) atau PDF.</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <SecondaryButton type="button" onClick={onClose} disabled={loading}>
                            Batal
                        </SecondaryButton>
                        {allowWrite && (
                            <PrimaryButton type="submit" disabled={loading}>
                                {loading
                                    ? 'Menyimpan...'
                                    : isEdit
                                      ? 'Simpan Perubahan Surat'
                                      : 'Simpan & Generate Surat'}
                            </PrimaryButton>
                        )}
                    </div>
                </div>
            </form>
        </Modal>
    );
}
