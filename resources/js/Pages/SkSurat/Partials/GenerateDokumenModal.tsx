import React, { useEffect, useMemo, useRef, useState } from 'react';
import Select, { ClassNamesConfig } from 'react-select';
import Modal from '@/Components/Modal';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import IconTile from '@/Components/ui/IconTile';
import { cn } from '@/lib/utils';
import { router } from '@inertiajs/react';
import { FileEdit, Sparkles, AlertCircle, AlertTriangle, Settings, RefreshCw } from 'lucide-react';

interface SkTemplate {
    id: number;
    judul: string;
    file_name_original: string;
    detected_variables: string[] | null;
}

interface TemplateOption {
    value: number;
    label: string;
    fileName: string;
    variableCount: number;
}

interface SkDokumen {
    id: number;
    folder_id: number;
    template_id: number;
    perihal: string;
    nomor_surat?: string | null;
    tanggal_surat?: string | null;
    data_isian: Record<string, any> | null;
    keterangan: string | null;
}

interface Props {
    show: boolean;
    onClose: () => void;
    folderId: number;
    templates: SkTemplate[];
    schoolData?: Record<string, string>;
    dokumen?: SkDokumen | null;
    isKepalaSekolah?: boolean;
    onOpenManageTemplates?: () => void;
}

function normalizeSchoolKey(tag: string): string {
    return tag
        .replace(/^\$\{?|\}?$/g, '')
        .trim()
        .toLowerCase()
        .replace(/[\s\-.]+/g, '_');
}

function buildDataIsianForVariables(
    variables: string[] | null | undefined,
    existing: Record<string, string>,
    schoolData: Record<string, string>
): Record<string, string> {
    if (!variables || variables.length === 0) {
        return {};
    }

    const next: Record<string, string> = {};
    variables.forEach((tag) => {
        const currentValue = existing[tag];
        if (currentValue !== undefined && currentValue !== '') {
            next[tag] = currentValue;
            return;
        }
        const normalized = normalizeSchoolKey(tag);
        next[tag] = schoolData[normalized] ?? '';
    });

    return next;
}

/**
 * Format raw variable keys into user-friendly form labels.
 * E.g.:
 * - "nomor" / "${nomor}" -> "Nomor"
 * - "nomor_surat" -> "Nomor Surat"
 * - "tgl_surat" -> "Tanggal Surat"
 * - "nip_kepala_sekolah" -> "NIP Kepala Sekolah"
 * - "npsn" -> "NPSN"
 */
function formatVariableLabel(tag: string): string {
    if (!tag) return '';

    // Strip leading ${ and trailing }
    let cleaned = tag.replace(/^\$\{?|\}?$/g, '').trim();

    // Insert space before camelCase capitals
    cleaned = cleaned.replace(/([a-z])([A-Z])/g, '$1 $2');

    // Replace underscores, hyphens, and dots with spaces
    cleaned = cleaned.replace(/[_\-.]+/g, ' ').trim();

    // Dictionary of common school / admin abbreviations
    const dictionary: Record<string, string> = {
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
        sk: 'SK',
        bosp: 'BOSP',
        bos: 'BOS',
        rkas: 'RKAS',
        bku: 'BKU',
        ta: 'TA',
        ttd: 'TTD',
        rt: 'RT',
        rw: 'RW',
        nik: 'NIK',
        kepsek: 'Kepala Sekolah',
    };

    return cleaned
        .split(/\s+/)
        .map((word) => {
            const lower = word.toLowerCase();
            if (dictionary[lower]) {
                return dictionary[lower];
            }
            return lower.charAt(0).toUpperCase() + lower.slice(1);
        })
        .join(' ');
}

const LABEL_CLASS =
    'mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500';

const TEMPLATE_SELECT_CLASS_NAMES: ClassNamesConfig<TemplateOption, false> = {
    container: () => 'relative w-full',
    control: ({ isFocused, isDisabled }) =>
        cn(
            'min-h-[41px] rounded-xl border px-3.5 py-1.5 text-[12px] font-semibold shadow-sm transition',
            isDisabled
                ? 'cursor-not-allowed border-slate-200/90 bg-slate-100 text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-500'
                : 'cursor-pointer bg-white text-slate-800 dark:bg-white/5 dark:text-white',
            !isDisabled && isFocused
                ? 'border-lime-400 ring-4 ring-lime-200/60 dark:border-lime-400/70 dark:ring-lime-400/10'
                : !isDisabled && 'border-slate-200/90 hover:border-slate-300 dark:border-white/10 dark:hover:border-white/20',
        ),
    valueContainer: () => 'min-w-0 flex-1 overflow-hidden py-0.5 pr-1',
    placeholder: () => 'truncate text-[12px] font-medium text-slate-400 dark:text-slate-500',
    singleValue: () => 'min-w-0 max-w-full truncate text-[12px] font-semibold text-slate-800 dark:text-white',
    input: () =>
        'text-[12px] font-semibold text-slate-800 dark:text-white [&_input]:!border-0 [&_input]:!outline-none [&_input]:!ring-0 [&_input]:!shadow-none',
    indicatorsContainer: () => 'shrink-0 gap-1.5 pl-2',
    indicatorSeparator: () => 'my-1.5 w-px bg-slate-200 dark:bg-white/10',
    dropdownIndicator: ({ isFocused }) =>
        cn(
            'rounded-lg p-0.5 transition',
            isFocused
                ? 'text-brand-600 dark:text-lime-300'
                : 'text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-white',
        ),
    menu: () =>
        'z-50 mt-1.5 overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-float dark:border-white/10 dark:bg-[#1A1728]',
    menuList: () => 'sikas-scroll max-h-60 space-y-1 overflow-y-auto',
    option: ({ isSelected, isFocused }) =>
        cn(
            'cursor-pointer rounded-xl px-3 py-2 text-left transition',
            isSelected
                ? 'bg-pastel-lavender/90 text-brand-800 dark:bg-brand-500/25 dark:text-brand-200'
                : isFocused
                  ? 'bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white'
                  : 'text-slate-700 dark:text-slate-200',
        ),
    noOptionsMessage: () => 'px-3 py-3 text-center text-[11px] font-medium text-slate-400 dark:text-slate-500',
};

const TEXTAREA_CLASS =
    'w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-[12px] font-semibold text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10';

export default function GenerateDokumenModal({
    show,
    onClose,
    folderId,
    templates = [],
    schoolData = {},
    dokumen = null,
    isKepalaSekolah = false,
    onOpenManageTemplates,
}: Props) {
    const isEditing = Boolean(dokumen && dokumen.id);

    const [selectedTemplateId, setSelectedTemplateId] = useState<number | ''>('');
    const [perihal, setPerihal] = useState('');
    const [keterangan, setKeterangan] = useState('');
    const [dataIsian, setDataIsian] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [rescanning, setRescanning] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [warningMsg, setWarningMsg] = useState<string | null>(null);
    const wasOpenRef = useRef(false);

    // Active selected template object
    const activeTemplate = templates.find((t) => t.id === Number(selectedTemplateId));

    const templateOptions = useMemo<TemplateOption[]>(
        () =>
            templates.map((t) => ({
                value: t.id,
                label: t.judul,
                fileName: t.file_name_original,
                variableCount: t.detected_variables?.length ?? 0,
            })),
        [templates],
    );

    const selectedTemplateOption = useMemo(
        () => templateOptions.find((opt) => opt.value === Number(selectedTemplateId)) ?? null,
        [templateOptions, selectedTemplateId],
    );

    useEffect(() => {
        if (!show) {
            wasOpenRef.current = false;
            return;
        }

        const isFirstOpen = !wasOpenRef.current;
        wasOpenRef.current = true;

        if (!isFirstOpen) {
            return;
        }

        setErrorMsg(null);
        setWarningMsg(null);
        if (dokumen) {
            setSelectedTemplateId(dokumen.template_id || '');
            setPerihal(dokumen.perihal || '');
            setKeterangan(dokumen.keterangan || '');
            setDataIsian((dokumen.data_isian as Record<string, string>) || {});
        } else {
            const defaultTpl = templates[0];
            const defaultId = defaultTpl ? defaultTpl.id : '';
            setSelectedTemplateId(defaultId);
            setPerihal('');
            setKeterangan('');
            setDataIsian(buildDataIsianForVariables(defaultTpl?.detected_variables, {}, schoolData));
        }
    }, [dokumen, show, templates, schoolData]);

    useEffect(() => {
        if (!show || !activeTemplate) {
            return;
        }

        const vars = activeTemplate.detected_variables || [];
        if (vars.length === 0) {
            return;
        }

        setDataIsian((prev) => {
            let changed = false;
            const next: Record<string, string> = { ...prev };
            vars.forEach((tag) => {
                if (!(tag in next)) {
                    const normalized = normalizeSchoolKey(tag);
                    next[tag] = schoolData[normalized] ?? '';
                    changed = true;
                }
            });
            return changed ? next : prev;
        });
    }, [show, activeTemplate?.id, activeTemplate?.detected_variables, schoolData]);

    const handleTemplateChange = (tplId: number) => {
        setSelectedTemplateId(tplId);
        setWarningMsg(null);
        const tpl = templates.find((t) => t.id === tplId);
        setDataIsian(buildDataIsianForVariables(tpl?.detected_variables, dataIsian, schoolData));
    };

    const handleRescanActiveTemplate = () => {
        if (!activeTemplate || rescanning) return;
        setErrorMsg(null);
        setWarningMsg(null);
        setRescanning(true);

        router.post(
            route('sk-surat.template.rescan', activeTemplate.id),
            {},
            {
                preserveScroll: true,
                onSuccess: (page: any) => {
                    const flashWarning = page?.props?.flash?.warning as string | undefined;
                    if (flashWarning) {
                        setWarningMsg(flashWarning);
                    }
                },
                onError: (err) => {
                    setErrorMsg(Object.values(err).join(', '));
                },
                onFinish: () => setRescanning(false),
            }
        );
    };

    const handleFieldChange = (key: string, value: string) => {
        setDataIsian((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        if (!selectedTemplateId) {
            setErrorMsg('Pilih master template terlebih dahulu.');
            return;
        }

        if (!perihal.trim()) {
            setErrorMsg('Perihal / Judul surat wajib diisi.');
            return;
        }

        setLoading(true);

        const payload = {
            template_id: selectedTemplateId,
            perihal,
            data_isian: dataIsian,
            keterangan: keterangan || null,
        };

        if (isEditing && dokumen?.id) {
            router.put(route('sk-surat.dokumen.update', dokumen.id), payload, {
                onSuccess: () => {
                    onClose();
                },
                onError: (err) => {
                    setErrorMsg(Object.values(err).join(', '));
                },
                onFinish: () => setLoading(false),
            });
        } else {
            router.post(route('sk-surat.dokumen.store', folderId), payload, {
                onSuccess: () => {
                    onClose();
                },
                onError: (err) => {
                    setErrorMsg(Object.values(err).join(', '));
                },
                onFinish: () => setLoading(false),
            });
        }
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="3xl">
            <form onSubmit={handleSubmit} className="relative flex max-h-[90vh] flex-col overflow-visible">
                <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]">
                    <div className="absolute -right-10 -top-16 h-40 w-40 rounded-full bg-brand-500/10 blur-3xl dark:bg-brand-500/[0.08]" />
                </div>

                {/* Header */}
                <div className="relative flex shrink-0 items-center gap-3 border-b border-slate-100 px-6 py-4 dark:border-white/5">
                    <IconTile tone="violet" size="lg">
                        <FileEdit className="w-4 h-4" />
                    </IconTile>
                    <div className="min-w-0">
                        <h3 className="text-[14px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                            {isEditing ? 'Ubah Isian Surat Dokumen' : 'Buat Surat Baru dari Template Word'}
                        </h3>
                        <p className="mt-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                            Isi formulir data di bawah ini. Dokumen Word akan dibuat otomatis sesuai data yang Anda masukkan.
                        </p>
                    </div>
                </div>

                {/* Fixed Top Section: Error Banner + Master Template & Perihal (kept outside overflow-y-auto so dropdown never clips) */}
                <div className="relative z-20 shrink-0 space-y-4 border-b border-slate-100 px-6 py-4 dark:border-white/5">
                    {errorMsg && (
                        <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-pastel-rose p-3 text-[11px] font-semibold text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {warningMsg && (
                        <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-[11px] font-semibold text-amber-800 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-300">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>{warningMsg}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="min-w-0">
                            <div className="mb-1.5 flex items-center justify-between gap-2">
                                <label
                                    htmlFor="sk-surat-template-select"
                                    className="block text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500"
                                >
                                    Pilih Master Template <span className="text-rose-500">*</span>
                                </label>
                                {!isKepalaSekolah && onOpenManageTemplates && (
                                    <button
                                        type="button"
                                        onClick={onOpenManageTemplates}
                                        className="inline-flex shrink-0 items-center gap-1 text-[10px] font-extrabold text-brand-600 transition hover:text-brand-700 dark:text-brand-300 dark:hover:text-brand-200"
                                    >
                                        <Settings className="h-3 w-3" />
                                        Upload / Kelola Template
                                    </button>
                                )}
                            </div>
                            <Select<TemplateOption, false>
                                inputId="sk-surat-template-select"
                                unstyled
                                isSearchable
                                isClearable={false}
                                isDisabled={isEditing || templates.length === 0}
                                options={templateOptions}
                                value={selectedTemplateOption}
                                onChange={(opt) => {
                                    if (opt) {
                                        handleTemplateChange(opt.value);
                                    }
                                }}
                                placeholder={
                                    templates.length === 0
                                        ? 'Tidak ada template tersedia'
                                        : 'Pilih atau cari master template...'
                                }
                                noOptionsMessage={() => 'Template tidak ditemukan'}
                                filterOption={(option, inputValue) => {
                                    const query = inputValue.trim().toLowerCase();
                                    if (!query) return true;
                                    return (
                                        option.data.label.toLowerCase().includes(query) ||
                                        option.data.fileName.toLowerCase().includes(query)
                                    );
                                }}
                                formatOptionLabel={(option, { context }) =>
                                    context === 'value' ? (
                                        <span className="block truncate">{option.label}</span>
                                    ) : (
                                        <div className="min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="truncate text-[12px] font-bold">
                                                    {option.label}
                                                </span>
                                                <span className="shrink-0 rounded-full border border-brand-500/15 bg-pastel-lavender/80 px-2 py-0.5 text-[9.5px] font-extrabold text-brand-700 dark:border-brand-400/20 dark:bg-brand-500/15 dark:text-brand-300">
                                                    {option.variableCount} tag
                                                </span>
                                            </div>
                                            <span className="mt-0.5 block truncate text-[10px] font-medium text-slate-400 dark:text-slate-400">
                                                {option.fileName}
                                            </span>
                                        </div>
                                    )
                                }
                                classNames={TEMPLATE_SELECT_CLASS_NAMES}
                            />
                        </div>

                        <div className="min-w-0">
                            <label className={LABEL_CLASS}>
                                Perihal / Judul Surat <span className="text-rose-500">*</span>
                            </label>
                            <TextInput
                                type="text"
                                placeholder="Contoh: SK Tim Manajemen BOSP TA 2026"
                                value={perihal}
                                onChange={(e) => setPerihal(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                </div>

                <div className="sikas-scroll relative flex-1 space-y-5 overflow-y-auto px-6 py-4">
                    {/* Dynamic Variable Inputs */}
                    <div>
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <div className="min-w-0">
                                <h4 className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                    <Sparkles className="w-4 h-4 text-brand-500" />
                                    Formulir Isian Surat
                                </h4>
                                <p className="mt-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                    Lengkapi kolom di bawah ini untuk mengisi bagian dinamis pada template surat.
                                </p>
                            </div>
                            {activeTemplate?.detected_variables && activeTemplate.detected_variables.length > 0 && (
                                <span className="rounded-full border border-brand-500/15 bg-pastel-lavender px-2.5 py-0.5 text-[9.5px] font-extrabold text-brand-600 dark:border-brand-400/20 dark:bg-brand-500/10 dark:text-brand-300">
                                    {activeTemplate.detected_variables.length} Kolom Isian
                                </span>
                            )}
                        </div>

                        {!activeTemplate || !activeTemplate.detected_variables || activeTemplate.detected_variables.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center dark:border-white/10 dark:bg-white/[0.02]">
                                <AlertCircle className="mx-auto mb-1.5 w-6 h-6 text-amber-500 dark:text-amber-400" />
                                <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                                    Template ini belum memiliki variabel isian dinamis.
                                </p>
                                <p className="mt-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                    Pastikan file Word memakai tag <code className="font-mono text-brand-600 dark:text-brand-300">{'${nama_tag}'}</code>. Anda dapat memindai ulang file atau mengganti master template.
                                </p>
                                {!isKepalaSekolah && activeTemplate && (
                                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                                        <button
                                            type="button"
                                            onClick={handleRescanActiveTemplate}
                                            disabled={rescanning}
                                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[10.5px] font-bold text-slate-700 shadow-sm transition hover:border-brand-300 hover:bg-pastel-lavender hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-brand-500/15"
                                        >
                                            <RefreshCw className={`h-3.5 w-3.5 ${rescanning ? 'animate-spin' : ''}`} />
                                            {rescanning ? 'Memindai Tag...' : 'Deteksi Ulang Tag'}
                                        </button>
                                        {onOpenManageTemplates && (
                                            <button
                                                type="button"
                                                onClick={onOpenManageTemplates}
                                                className="inline-flex items-center gap-1.5 rounded-xl border border-brand-200 bg-pastel-lavender px-3 py-1.5 text-[10.5px] font-extrabold text-brand-700 transition hover:bg-brand-500/15 dark:border-brand-400/20 dark:bg-brand-500/10 dark:text-brand-300"
                                            >
                                                <Settings className="h-3.5 w-3.5" />
                                                Kelola Master Template
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="max-h-80 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-white/5 dark:bg-white/[0.03]">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    {activeTemplate.detected_variables.map((tag) => {
                                        const normalized = normalizeSchoolKey(tag);
                                        const isAutoFilled = Boolean(schoolData[normalized]);
                                        const labelText = formatVariableLabel(tag);
                                        const isLongField =
                                            tag.toLowerCase().includes('alamat') ||
                                            tag.toLowerCase().includes('uraian') ||
                                            tag.toLowerCase().includes('catatan') ||
                                            tag.toLowerCase().includes('deskripsi');

                                        return (
                                            <div key={tag} className={isLongField ? 'md:col-span-2' : ''}>
                                                <div className="mb-1.5 flex items-center justify-between">
                                                    <label className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                                                        {labelText}
                                                    </label>
                                                    {isAutoFilled && (
                                                        <span className="inline-flex items-center gap-1 rounded-full border border-mint/20 bg-pastel-mint px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-700 dark:border-mint/20 dark:bg-mint/10 dark:text-emerald-300">
                                                            <Sparkles className="w-2.5 h-2.5" />
                                                            Profil SIKAS
                                                        </span>
                                                    )}
                                                </div>

                                                {isLongField ? (
                                                    <textarea
                                                        className={TEXTAREA_CLASS}
                                                        rows={2}
                                                        placeholder={`Masukkan ${labelText.toLowerCase()}...`}
                                                        value={dataIsian[tag] ?? ''}
                                                        onChange={(e) => handleFieldChange(tag, e.target.value)}
                                                    />
                                                ) : (
                                                    <TextInput
                                                        type="text"
                                                        placeholder={`Masukkan ${labelText.toLowerCase()}...`}
                                                        value={dataIsian[tag] ?? ''}
                                                        onChange={(e) => handleFieldChange(tag, e.target.value)}
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Keterangan Tambahan */}
                    <div className="border-t border-slate-100 pt-4 dark:border-white/5">
                        <label className={LABEL_CLASS}>
                            Keterangan Tambahan (Opsional)
                        </label>
                        <textarea
                            className={TEXTAREA_CLASS}
                            rows={2}
                            placeholder="Catatan peruntukan atau ringkasan surat ini..."
                            value={keterangan}
                            onChange={(e) => setKeterangan(e.target.value)}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="relative flex shrink-0 justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-white/5">
                    <SecondaryButton type="button" onClick={onClose} disabled={loading}>
                        Batal
                    </SecondaryButton>
                    <PrimaryButton type="submit" disabled={loading}>
                        {loading ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Simpan Surat Dokumen'}
                    </PrimaryButton>
                </div>
            </form>
        </Modal>
    );
}
