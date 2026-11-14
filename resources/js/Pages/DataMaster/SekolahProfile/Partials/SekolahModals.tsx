import React, { FormEventHandler, useEffect, useMemo, useState } from 'react';
import Select from 'react-select';
import {
    AlertTriangle,
    Building2,
    Eye,
    Image as ImageIcon,
    Lock,
    MapPin,
    RotateCw,
    Trash2,
    UploadCloud,
    X,
} from 'lucide-react';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';
import IconTile, { IconTileTone } from '@/Components/ui/IconTile';
import StatusBadge from '@/Components/ui/StatusBadge';
import { cn } from '@/lib/utils';

export interface SekolahModalTarget {
    id: number;
    nama_sekolah: string;
    npsn: string;
    kop_surat?: string;
}

export interface SekolahFormData {
    nama_sekolah: string;
    npsn: string;
    status_sekolah: string;
    jenjang_sekolah: string;
    kelurahan_desa: string;
    kecamatan: string;
    kabupaten_kota: string;
    provinsi: string;
    alamat: string;
}

interface SelectOption {
    value: string;
    label: string;
}

export interface SekolahModalsProps {
    sekolah?: SekolahModalTarget | null;
    licensedNpsn?: string;
    // Modal Edit / Input Sekolah
    isModalOpen: boolean;
    onCloseModal: () => void;
    data: SekolahFormData;
    setData: <K extends keyof SekolahFormData>(key: K, value: SekolahFormData[K]) => void;
    errors: Partial<Record<keyof SekolahFormData, string>>;
    processing: boolean;
    onSubmit: FormEventHandler;
    // Modal Upload Kop
    isUploadOpen: boolean;
    onCloseUpload: () => void;
    kopFile: File | null;
    onChangeKopFile: (file: File | null) => void;
    kopErrors: { kop_surat?: string };
    kopProcessing: boolean;
    onSubmitKop: FormEventHandler;
    // Modal Hapus Kop
    isDeleteKopOpen: boolean;
    onCloseDeleteKop: () => void;
    onConfirmDeleteKop: () => void;
    // Modal Preview Kop
    isPreviewOpen: boolean;
    onClosePreview: () => void;
}

const STATUS_OPTIONS: SelectOption[] = [
    { value: 'Negeri', label: 'Negeri' },
    { value: 'Swasta', label: 'Swasta' },
];

const JENJANG_OPTIONS: SelectOption[] = [
    { value: 'SD', label: 'SD' },
    { value: 'SMP', label: 'SMP' },
    { value: 'SMA', label: 'SMA' },
    { value: 'SMK', label: 'SMK' },
];

const GLOW_TONES: Record<'violet' | 'mint' | 'rose', { primary: string; secondary: string }> = {
    violet: {
        primary: 'bg-pastel-lavender/75 dark:bg-brand-500/15',
        secondary: 'bg-pastel-mint/45 dark:bg-mint/10',
    },
    mint: {
        primary: 'bg-pastel-mint/75 dark:bg-mint/15',
        secondary: 'bg-pastel-sky/60 dark:bg-sky/10',
    },
    rose: {
        primary: 'bg-pastel-rose/75 dark:bg-rose-500/15',
        secondary: 'bg-pastel-amber/45 dark:bg-amber-500/10',
    },
};

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function buildSelectClassNames(hasError: boolean) {
    return {
        container: () => 'relative',
        control: ({ isFocused }: { isFocused: boolean }) =>
            cn(
                'min-h-[42px] cursor-pointer rounded-2xl border bg-white px-3.5 py-1.5 text-xs font-bold shadow-sm transition dark:bg-white/5',
                hasError
                    ? 'border-rose-400 ring-4 ring-rose-100 dark:border-rose-500/50 dark:ring-rose-500/10'
                    : isFocused
                      ? 'border-lime-400 ring-4 ring-lime-200/60 dark:border-lime-400/70 dark:ring-lime-400/10'
                      : 'border-slate-200/90 hover:border-slate-300 dark:border-white/10 dark:hover:border-white/20',
            ),
        valueContainer: () => 'gap-1 py-0.5',
        placeholder: () => 'text-xs font-medium text-slate-400 dark:text-slate-500',
        singleValue: () => 'text-xs font-bold text-slate-900 dark:text-white',
        input: () =>
            'text-xs font-semibold text-slate-900 dark:text-white [&_input]:!border-0 [&_input]:!outline-none [&_input]:!ring-0 [&_input]:!shadow-none',
        indicatorsContainer: () => 'gap-1.5 pl-2',
        indicatorSeparator: () => 'my-1.5 w-px bg-slate-200 dark:bg-white/10',
        dropdownIndicator: () =>
            'cursor-pointer rounded-lg p-0.5 text-slate-400 transition hover:text-slate-700 dark:text-slate-500 dark:hover:text-white',
        menu: () =>
            'z-50 mt-1.5 overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-float dark:border-white/10 dark:bg-[#1A1728]',
        menuList: () => 'sikas-scroll max-h-48 space-y-0.5 overflow-y-auto',
        option: ({ isSelected, isFocused }: { isSelected: boolean; isFocused: boolean }) =>
            cn(
                'cursor-pointer rounded-xl px-3 py-2 text-xs font-bold transition',
                isSelected
                    ? 'bg-pastel-lavender/85 text-brand-800 dark:bg-brand-500/25 dark:text-brand-200'
                    : isFocused
                      ? 'bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white'
                      : 'text-slate-700 dark:text-slate-300',
            ),
        noOptionsMessage: () => 'px-3 py-3 text-center text-xs text-slate-400 dark:text-slate-500',
    };
}

interface SekolahModalHeaderProps {
    tone: IconTileTone;
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    badge?: React.ReactNode;
    onClose: () => void;
    disabledClose?: boolean;
}

function SekolahModalHeader({
    tone,
    icon,
    title,
    subtitle,
    badge,
    onClose,
    disabledClose = false,
}: SekolahModalHeaderProps) {
    return (
        <div className="relative flex flex-none items-start justify-between gap-3 rounded-t-[26px] border-b border-slate-100 px-6 py-4 dark:border-white/10">
            <div className="flex min-w-0 items-center gap-3.5">
                <IconTile tone={tone} size="md">
                    {icon}
                </IconTile>
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-[15.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                            {title}
                        </h2>
                        {badge}
                    </div>
                    <p className="mt-0.5 truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                        {subtitle}
                    </p>
                </div>
            </div>
            <button
                type="button"
                onClick={onClose}
                disabled={disabledClose}
                aria-label={`Tutup ${title}`}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/10 dark:hover:text-white"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}

export default function SekolahModals({
    sekolah,
    licensedNpsn,
    isModalOpen,
    onCloseModal,
    data,
    setData,
    errors,
    processing,
    onSubmit,
    isUploadOpen,
    onCloseUpload,
    kopFile,
    onChangeKopFile,
    kopErrors,
    kopProcessing,
    onSubmitKop,
    isDeleteKopOpen,
    onCloseDeleteKop,
    onConfirmDeleteKop,
    isPreviewOpen,
    onClosePreview,
}: SekolahModalsProps) {
    const [kopPreviewUrl, setKopPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!kopFile) {
            setKopPreviewUrl(null);
            return;
        }
        const objectUrl = URL.createObjectURL(kopFile);
        setKopPreviewUrl(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [kopFile]);

    const resolvedStatusOptions = useMemo(() => {
        if (
            data.status_sekolah &&
            !STATUS_OPTIONS.some((o) => o.value === data.status_sekolah)
        ) {
            return [...STATUS_OPTIONS, { value: data.status_sekolah, label: data.status_sekolah }];
        }
        return STATUS_OPTIONS;
    }, [data.status_sekolah]);

    const resolvedJenjangOptions = useMemo(() => {
        if (
            data.jenjang_sekolah &&
            !JENJANG_OPTIONS.some((o) => o.value === data.jenjang_sekolah)
        ) {
            return [...JENJANG_OPTIONS, { value: data.jenjang_sekolah, label: data.jenjang_sekolah }];
        }
        return JENJANG_OPTIONS;
    }, [data.jenjang_sekolah]);

    const handleCloseUploadModal = () => {
        if (kopProcessing) return;
        onChangeKopFile(null);
        onCloseUpload();
    };

    return (
        <>
            {/* 1. MODAL INPUT / UPDATE DATA SEKOLAH */}
            <Modal show={isModalOpen} onClose={() => !processing && onCloseModal()} maxWidth="2xl">
                <div className="relative overflow-visible rounded-[26px] bg-white dark:bg-[#15131F]">
                    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]">
                        <div className={cn('absolute -right-14 -top-14 h-44 w-44 rounded-full blur-3xl', GLOW_TONES.violet.primary)} />
                        <div className={cn('absolute -bottom-16 -left-14 h-40 w-40 rounded-full blur-3xl', GLOW_TONES.violet.secondary)} />
                    </div>

                    <form onSubmit={onSubmit} className="relative flex flex-col overflow-visible">
                        <SekolahModalHeader
                            tone="violet"
                            icon={<Building2 className="h-5 w-5" />}
                            title={sekolah ? 'Update Data Sekolah' : 'Input Data Sekolah'}
                            subtitle="Lengkapi identitas satuan pendidikan dan alamat resmi sekolah."
                            badge={
                                <StatusBadge tone={sekolah ? 'violet' : 'lime'}>
                                    {sekolah ? 'Edit Profil' : 'Profil Baru'}
                                </StatusBadge>
                            }
                            onClose={onCloseModal}
                            disabledClose={processing}
                        />

                        <div className="space-y-3.5 overflow-visible px-6 py-4">
                            {/* Bento Grup 1: Identitas Satuan Pendidikan */}
                            <div className="space-y-3.5 overflow-visible rounded-[20px] border border-slate-200/80 bg-slate-50/75 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                                <div className="flex items-center gap-2 border-b border-slate-200/70 pb-2.5 dark:border-white/10">
                                    <Building2 className="h-3.5 w-3.5 text-brand-500 dark:text-brand-300" />
                                    <span className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
                                        Identitas Satuan Pendidikan
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="md:col-span-2">
                                        <InputLabel
                                            htmlFor="nama_sekolah"
                                            value="Nama Sekolah"
                                            className="mb-1.5 !text-[11px] !font-bold !uppercase !tracking-wider !text-slate-600 dark:!text-slate-300"
                                        />
                                        <TextInput
                                            id="nama_sekolah"
                                            value={data.nama_sekolah}
                                            onChange={(e) => setData('nama_sekolah', e.target.value)}
                                            className="block w-full"
                                            placeholder="Contoh: SDN 1 Bangkir"
                                            required
                                        />
                                        <InputError message={errors.nama_sekolah} className="mt-1.5" />
                                    </div>

                                    <div>
                                        <div className="mb-1.5 flex items-center justify-between gap-2">
                                            <InputLabel
                                                htmlFor="npsn"
                                                value="NPSN"
                                                className="!text-[11px] !font-bold !uppercase !tracking-wider !text-slate-600 dark:!text-slate-300"
                                            />
                                            <StatusBadge tone="success" dot={false}>
                                                <Lock className="h-3 w-3" />
                                                Lisensi Terverifikasi
                                            </StatusBadge>
                                        </div>
                                        <TextInput
                                            id="npsn"
                                            value={data.npsn || licensedNpsn || ''}
                                            readOnly
                                            className="text-sikas-num block w-full cursor-not-allowed bg-slate-100/90 font-mono font-bold text-slate-500 dark:bg-white/[0.04] dark:text-slate-400"
                                            required
                                        />
                                        <p className="mt-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                            NPSN terdaftar otomatis sesuai lisensi aplikasi.
                                        </p>
                                        <InputError message={errors.npsn} className="mt-1" />
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:col-span-1">
                                        <div>
                                            <InputLabel
                                                htmlFor="status_sekolah"
                                                value="Status Sekolah"
                                                className="mb-1.5 !text-[11px] !font-bold !uppercase !tracking-wider !text-slate-600 dark:!text-slate-300"
                                            />
                                            <Select<SelectOption, false>
                                                inputId="status_sekolah"
                                                unstyled
                                                isSearchable
                                                isClearable={false}
                                                placeholder="Pilih status..."
                                                noOptionsMessage={() => 'Status tidak ditemukan'}
                                                options={resolvedStatusOptions}
                                                value={
                                                    resolvedStatusOptions.find(
                                                        (opt) => opt.value === data.status_sekolah,
                                                    ) || null
                                                }
                                                onChange={(opt) =>
                                                    setData('status_sekolah', opt ? opt.value : '')
                                                }
                                                classNames={buildSelectClassNames(Boolean(errors.status_sekolah))}
                                            />
                                            <InputError message={errors.status_sekolah} className="mt-1.5" />
                                        </div>

                                        <div>
                                            <InputLabel
                                                htmlFor="jenjang_sekolah"
                                                value="Jenjang"
                                                className="mb-1.5 !text-[11px] !font-bold !uppercase !tracking-wider !text-slate-600 dark:!text-slate-300"
                                            />
                                            <Select<SelectOption, false>
                                                inputId="jenjang_sekolah"
                                                unstyled
                                                isSearchable
                                                isClearable={false}
                                                placeholder="Pilih jenjang..."
                                                noOptionsMessage={() => 'Jenjang tidak ditemukan'}
                                                options={resolvedJenjangOptions}
                                                value={
                                                    resolvedJenjangOptions.find(
                                                        (opt) => opt.value === data.jenjang_sekolah,
                                                    ) || null
                                                }
                                                onChange={(opt) =>
                                                    setData('jenjang_sekolah', opt ? opt.value : '')
                                                }
                                                classNames={buildSelectClassNames(Boolean(errors.jenjang_sekolah))}
                                            />
                                            <InputError message={errors.jenjang_sekolah} className="mt-1.5" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Bento Grup 2: Lokasi & Alamat Sekolah */}
                            <div className="space-y-4 rounded-[20px] border border-slate-200/80 bg-slate-50/75 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                                <div className="flex items-center gap-2 border-b border-slate-200/70 pb-2.5 dark:border-white/10">
                                    <MapPin className="h-3.5 w-3.5 text-mint" />
                                    <span className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
                                        Lokasi &amp; Alamat Sekolah
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div>
                                        <InputLabel
                                            htmlFor="provinsi"
                                            value="Provinsi"
                                            className="mb-1.5 !text-[11px] !font-bold !uppercase !tracking-wider !text-slate-600 dark:!text-slate-300"
                                        />
                                        <TextInput
                                            id="provinsi"
                                            value={data.provinsi}
                                            onChange={(e) => setData('provinsi', e.target.value)}
                                            className="block w-full"
                                            required
                                        />
                                        <InputError message={errors.provinsi} className="mt-1.5" />
                                    </div>

                                    <div>
                                        <InputLabel
                                            htmlFor="kabupaten_kota"
                                            value="Kabupaten / Kota"
                                            className="mb-1.5 !text-[11px] !font-bold !uppercase !tracking-wider !text-slate-600 dark:!text-slate-300"
                                        />
                                        <TextInput
                                            id="kabupaten_kota"
                                            value={data.kabupaten_kota}
                                            onChange={(e) => setData('kabupaten_kota', e.target.value)}
                                            className="block w-full"
                                            required
                                        />
                                        <InputError message={errors.kabupaten_kota} className="mt-1.5" />
                                    </div>

                                    <div>
                                        <InputLabel
                                            htmlFor="kecamatan"
                                            value="Kecamatan"
                                            className="mb-1.5 !text-[11px] !font-bold !uppercase !tracking-wider !text-slate-600 dark:!text-slate-300"
                                        />
                                        <TextInput
                                            id="kecamatan"
                                            value={data.kecamatan}
                                            onChange={(e) => setData('kecamatan', e.target.value)}
                                            className="block w-full"
                                            required
                                        />
                                        <InputError message={errors.kecamatan} className="mt-1.5" />
                                    </div>

                                    <div>
                                        <InputLabel
                                            htmlFor="kelurahan_desa"
                                            value="Kelurahan / Desa"
                                            className="mb-1.5 !text-[11px] !font-bold !uppercase !tracking-wider !text-slate-600 dark:!text-slate-300"
                                        />
                                        <TextInput
                                            id="kelurahan_desa"
                                            value={data.kelurahan_desa}
                                            onChange={(e) => setData('kelurahan_desa', e.target.value)}
                                            className="block w-full"
                                            required
                                        />
                                        <InputError message={errors.kelurahan_desa} className="mt-1.5" />
                                    </div>

                                    <div className="md:col-span-2">
                                        <InputLabel
                                            htmlFor="alamat"
                                            value="Alamat Lengkap"
                                            className="mb-1.5 !text-[11px] !font-bold !uppercase !tracking-wider !text-slate-600 dark:!text-slate-300"
                                        />
                                        <textarea
                                            id="alamat"
                                            value={data.alamat}
                                            onChange={(e) => setData('alamat', e.target.value)}
                                            className="block w-full rounded-2xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10"
                                            rows={2}
                                            placeholder="Jalan, nomor, RT/RW..."
                                            required
                                        />
                                        <InputError message={errors.alamat} className="mt-1.5" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="relative flex flex-none items-center justify-end gap-2.5 rounded-b-[26px] border-t border-slate-100 bg-slate-50/70 px-6 py-4 dark:border-white/5 dark:bg-white/[0.02]">
                            <SecondaryButton
                                onClick={onCloseModal}
                                type="button"
                                disabled={processing}
                            >
                                Batal
                            </SecondaryButton>
                            <PrimaryButton disabled={processing} className="flex items-center gap-2">
                                {processing ? (
                                    <>
                                        <RotateCw className="h-4 w-4 animate-spin" />
                                        Menyimpan...
                                    </>
                                ) : sekolah ? (
                                    'Simpan Perubahan'
                                ) : (
                                    'Simpan Data'
                                )}
                            </PrimaryButton>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* 2. MODAL UPLOAD KOP SURAT */}
            <Modal show={isUploadOpen} onClose={handleCloseUploadModal} maxWidth="md">
                <div className="relative overflow-hidden rounded-[26px] bg-white dark:bg-[#15131F]">
                    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]">
                        <div className={cn('absolute -right-14 -top-14 h-40 w-40 rounded-full blur-3xl', GLOW_TONES.mint.primary)} />
                        <div className={cn('absolute -bottom-16 -left-14 h-40 w-40 rounded-full blur-3xl', GLOW_TONES.mint.secondary)} />
                    </div>

                    <SekolahModalHeader
                        tone="mint"
                        icon={<UploadCloud className="h-5 w-5" />}
                        title="Upload Kop Surat"
                        subtitle="Unggah gambar kop surat resmi untuk cetakan SPJ & laporan."
                        badge={<StatusBadge tone="success">JPG / PNG</StatusBadge>}
                        onClose={handleCloseUploadModal}
                        disabledClose={kopProcessing}
                    />

                    <form onSubmit={onSubmitKop} className="relative">
                        <div className="space-y-4 px-6 py-5">
                            {/* Spesifikasi Ideal */}
                            <div className="rounded-[20px] border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <StatusBadge tone="neutral" dot={false}>
                                        .jpg / .jpeg / .png
                                    </StatusBadge>
                                    <StatusBadge tone="info" dot={false}>
                                        Maks. 2 MB
                                    </StatusBadge>
                                    <StatusBadge tone="violet" dot={false}>
                                        Ideal 2480 × 588 px
                                    </StatusBadge>
                                </div>
                                <p className="mt-2.5 text-[11px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                                    Resolusi di atas membantu hasil cetak dokumen SPJ dan laporan tampak tajam dan proporsional.
                                </p>
                            </div>

                            {/* Dropzone File Interaktif */}
                            <div>
                                <label
                                    htmlFor="kop_surat_upload"
                                    className={cn(
                                        'group flex cursor-pointer flex-col items-center justify-center rounded-[20px] border-2 border-dashed p-5 text-center transition',
                                        kopFile
                                            ? 'border-mint/50 bg-pastel-mint/40 dark:border-mint/30 dark:bg-mint/10'
                                            : 'border-slate-300/80 bg-slate-50/60 hover:border-brand-400 hover:bg-pastel-lavender/30 dark:border-white/15 dark:bg-white/[0.02] dark:hover:border-brand-400/50 dark:hover:bg-white/[0.04]',
                                    )}
                                >
                                    <input
                                        id="kop_surat_upload"
                                        type="file"
                                        accept="image/jpeg,image/png,image/jpg"
                                        className="sr-only"
                                        onChange={(e) =>
                                            onChangeKopFile(e.target.files ? e.target.files[0] : null)
                                        }
                                    />

                                    {kopPreviewUrl && kopFile ? (
                                        <div className="w-full space-y-3">
                                            <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-sm dark:border-white/10 dark:bg-slate-900">
                                                <img
                                                    src={kopPreviewUrl}
                                                    alt="Pratinjau file kop surat"
                                                    className="mx-auto max-h-28 w-full object-contain"
                                                />
                                            </div>
                                            <div className="flex items-center justify-between gap-2 text-left">
                                                <div className="min-w-0">
                                                    <p className="truncate text-[11.5px] font-extrabold text-slate-800 dark:text-white">
                                                        {kopFile.name}
                                                    </p>
                                                    <p className="text-sikas-num text-[10px] font-semibold text-mint">
                                                        {formatBytes(kopFile.size)} • Klik untuk mengganti file
                                                    </p>
                                                </div>
                                                <StatusBadge tone="success" dot={false}>
                                                    Siap Upload
                                                </StatusBadge>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 py-2">
                                            <IconTile tone="mint" size="md">
                                                <ImageIcon />
                                            </IconTile>
                                            <div>
                                                <p className="text-[12px] font-extrabold text-slate-800 dark:text-white">
                                                    Pilih file gambar kop surat
                                                </p>
                                                <p className="mt-0.5 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                                                    Klik area ini untuk memilih file PNG atau JPG
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </label>
                                <InputError message={kopErrors.kop_surat} className="mt-1.5" />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2.5 rounded-b-[26px] border-t border-slate-100 bg-slate-50/70 px-6 py-4 dark:border-white/5 dark:bg-white/[0.02]">
                            <SecondaryButton
                                onClick={handleCloseUploadModal}
                                type="button"
                                disabled={kopProcessing}
                            >
                                Batal
                            </SecondaryButton>
                            <PrimaryButton
                                disabled={kopProcessing || !kopFile}
                                className="flex items-center gap-2"
                            >
                                {kopProcessing ? (
                                    <>
                                        <RotateCw className="h-4 w-4 animate-spin" />
                                        Mengunggah...
                                    </>
                                ) : (
                                    'Upload Kop Surat'
                                )}
                            </PrimaryButton>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* 3. MODAL KONFIRMASI HAPUS KOP SURAT */}
            <Modal show={isDeleteKopOpen} onClose={() => !kopProcessing && onCloseDeleteKop()} maxWidth="sm">
                <div className="relative overflow-hidden rounded-[26px] bg-white dark:bg-[#15131F]">
                    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]">
                        <div className={cn('absolute -right-12 -top-12 h-36 w-36 rounded-full blur-3xl', GLOW_TONES.rose.primary)} />
                        <div className={cn('absolute -bottom-12 -left-12 h-32 w-32 rounded-full blur-3xl', GLOW_TONES.rose.secondary)} />
                    </div>

                    <SekolahModalHeader
                        tone="rose"
                        icon={<Trash2 className="h-5 w-5" />}
                        title="Hapus Kop Surat?"
                        subtitle="Konfirmasi penghapusan gambar kop surat."
                        badge={<StatusBadge tone="danger">Permanen</StatusBadge>}
                        onClose={onCloseDeleteKop}
                        disabledClose={kopProcessing}
                    />

                    <div className="relative px-6 py-5">
                        <div className="rounded-[20px] border border-rose-200/80 bg-pastel-rose/70 p-4 dark:border-rose-400/20 dark:bg-rose-500/10">
                            <div className="flex items-start gap-3">
                                <IconTile tone="rose" size="sm">
                                    <AlertTriangle />
                                </IconTile>
                                <p className="text-[11.5px] font-semibold leading-relaxed text-rose-700 dark:text-rose-200">
                                    File kop surat yang tersimpan akan dihapus dan cetakan laporan akan kembali ke mode kop teks. Tindakan ini tidak dapat dibatalkan.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="relative flex items-center justify-end gap-2.5 rounded-b-[26px] border-t border-slate-100 bg-slate-50/70 px-6 py-4 dark:border-white/5 dark:bg-white/[0.02]">
                        <SecondaryButton
                            onClick={onCloseDeleteKop}
                            type="button"
                            disabled={kopProcessing}
                        >
                            Batal
                        </SecondaryButton>
                        <DangerButton
                            onClick={onConfirmDeleteKop}
                            disabled={kopProcessing}
                            className="flex items-center gap-2"
                        >
                            {kopProcessing ? (
                                <>
                                    <RotateCw className="h-4 w-4 animate-spin" />
                                    Menghapus...
                                </>
                            ) : (
                                'Hapus Kop'
                            )}
                        </DangerButton>
                    </div>
                </div>
            </Modal>

            {/* 4. MODAL PRATINJAU KOP SURAT */}
            <Modal show={isPreviewOpen} onClose={onClosePreview} maxWidth="2xl">
                <div className="relative overflow-hidden rounded-[26px] bg-white dark:bg-[#15131F]">
                    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]">
                        <div className={cn('absolute -right-14 -top-14 h-44 w-44 rounded-full blur-3xl', GLOW_TONES.violet.primary)} />
                        <div className={cn('absolute -bottom-16 -left-14 h-40 w-40 rounded-full blur-3xl', GLOW_TONES.violet.secondary)} />
                    </div>

                    <SekolahModalHeader
                        tone="violet"
                        icon={<Eye className="h-5 w-5" />}
                        title="Pratinjau Kop Surat Resmi"
                        subtitle={sekolah?.nama_sekolah || 'Kop surat aktif pada dokumen cetak.'}
                        badge={<StatusBadge tone="success">Aktif</StatusBadge>}
                        onClose={onClosePreview}
                    />

                    <div className="relative px-6 py-5">
                        <div className="rounded-[20px] border border-slate-200/80 bg-slate-50/90 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                            {sekolah?.kop_surat ? (
                                <img
                                    src={`/storage/${sekolah.kop_surat.replace('public/', '')}`}
                                    alt="Preview Kop Surat"
                                    className="mx-auto max-h-[62vh] w-full rounded-xl border border-slate-200/80 bg-white object-contain p-2 shadow-sm dark:border-white/10"
                                />
                            ) : (
                                <p className="py-8 text-center text-xs font-semibold text-slate-400">
                                    Gambar kop surat tidak tersedia.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="relative flex items-center justify-end rounded-b-[26px] border-t border-slate-100 bg-slate-50/70 px-6 py-4 dark:border-white/5 dark:bg-white/[0.02]">
                        <SecondaryButton onClick={onClosePreview} type="button">
                            Tutup
                        </SecondaryButton>
                    </div>
                </div>
            </Modal>
        </>
    );
}

