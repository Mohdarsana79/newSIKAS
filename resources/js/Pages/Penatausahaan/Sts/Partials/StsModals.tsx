import React, { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import {
    AlertTriangle,
    Calendar,
    Check,
    ChevronDown,
    Pencil,
    Plus,
    Search,
    Sparkles,
    Trash2,
    Wallet,
    X,
} from 'lucide-react';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';
import InputError from '@/Components/InputError';
import DatePicker from '@/Components/DatePicker';
import IconTile from '@/Components/ui/IconTile';
import StatusBadge from '@/Components/ui/StatusBadge';
import { cn } from '@/lib/utils';

export interface PenganggaranOption {
    id: number | string;
    tahun_anggaran: number | string;
}

export interface StsItem {
    id: number;
    nomor_sts: string;
    jumlah_sts: number;
    jumlah_bayar?: number;
    sisa: number;
    tanggal_bayar?: string | null;
}

export interface StsModalsProps {
    penganggaranList: PenganggaranOption[];
    penganggaranFk: string;
    selectedSts: StsItem | null;
    stsToDelete: StsItem | null;
    handleCurrencyChange: (e: React.ChangeEvent<HTMLInputElement>, form: any, field: string, rawField: string) => void;
    // Create
    isCreateOpen: boolean;
    onCloseCreate: () => void;
    createForm: any;
    onSubmitCreate: (e: React.FormEvent) => void;
    // Edit
    isEditOpen: boolean;
    onCloseEdit: () => void;
    editForm: any;
    onSubmitEdit: (e: React.FormEvent) => void;
    // Payment
    isPaymentOpen: boolean;
    onClosePayment: () => void;
    paymentForm: any;
    onSubmitPayment: (e: React.FormEvent) => void;
    // Delete
    isDeleteOpen: boolean;
    onCloseDelete: () => void;
    onConfirmDelete: () => void;
    deleteProcessing: boolean;
}

const GLOW_TONES: Record<'violet' | 'amber' | 'mint' | 'rose', { primary: string; secondary: string }> = {
    violet: {
        primary: 'bg-pastel-lavender/75 dark:bg-brand-500/15',
        secondary: 'bg-pastel-mint/45 dark:bg-mint/10',
    },
    amber: {
        primary: 'bg-pastel-amber/80 dark:bg-amber-500/15',
        secondary: 'bg-pastel-lavender/50 dark:bg-brand-500/10',
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

function formatRupiah(amount: number | string | undefined | null): string {
    const numeric = Number(amount) || 0;
    return `Rp ${new Intl.NumberFormat('id-ID').format(numeric)}`;
}

interface StsModalHeaderProps {
    tone: 'violet' | 'amber' | 'mint' | 'rose';
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    badge?: React.ReactNode;
    onClose: () => void;
}

function StsModalHeader({ tone, icon, title, subtitle, badge, onClose }: StsModalHeaderProps) {
    return (
        <div className="relative flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-white/10">
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
                aria-label={`Tutup ${title}`}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}

interface YearBudgetPickerProps {
    options: PenganggaranOption[];
    value: number | string;
    onChange: (val: number | string) => void;
    error?: string;
}

function YearBudgetPicker({ options, value, onChange, error }: YearBudgetPickerProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    const selected = useMemo(
        () => options.find((opt) => String(opt.id) === String(value)) || null,
        [options, value]
    );

    const filtered = useMemo(() => {
        if (!query.trim()) return options;
        const lower = query.trim().toLowerCase();
        return options.filter((opt) => String(opt.tahun_anggaran).toLowerCase().includes(lower));
    }, [options, query]);

    useEffect(() => {
        if (!open) return;
        const handleOutside = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, [open]);

    if (options.length <= 4 && options.length > 0) {
        return (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {options.map((opt) => {
                    const isSelected = String(opt.id) === String(value);
                    return (
                        <button
                            key={opt.id}
                            type="button"
                            onClick={() => onChange(opt.id)}
                            className={cn(
                                'flex items-center justify-between gap-2 rounded-2xl border px-3.5 py-2.5 text-left text-xs font-extrabold transition-all',
                                isSelected
                                    ? 'border-brand-400 bg-pastel-lavender/75 text-brand-800 shadow-sm dark:border-brand-400/60 dark:bg-brand-500/20 dark:text-brand-200'
                                    : 'border-slate-200/90 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                            )}
                        >
                            <span className="inline-flex items-center gap-1.5 text-sikas-num">
                                <Calendar className="h-3.5 w-3.5 opacity-70" />
                                {opt.tahun_anggaran}
                            </span>
                            {isSelected && (
                                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-white dark:bg-brand-400 dark:text-slate-950">
                                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        );
    }

    return (
        <div ref={wrapperRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className={cn(
                    'flex min-h-[42px] w-full items-center justify-between rounded-2xl border bg-white px-3.5 py-2.5 text-left text-xs font-bold shadow-sm transition dark:bg-white/5',
                    error
                        ? 'border-rose-400 ring-4 ring-rose-100 dark:border-rose-500/50 dark:ring-rose-500/10'
                        : open
                            ? 'border-brand-400 ring-4 ring-brand-200/60 dark:border-brand-400/70 dark:ring-brand-500/15'
                            : 'border-slate-200/90 hover:border-slate-300 dark:border-white/10 dark:hover:border-white/20'
                )}
            >
                <span className={cn('inline-flex items-center gap-2', selected ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500')}>
                    <Calendar className="h-3.5 w-3.5 text-brand-500 dark:text-brand-300" />
                    {selected ? selected.tahun_anggaran : 'Pilih Tahun Anggaran...'}
                </span>
                <ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform', open && 'rotate-180')} />
            </button>

            {open && (
                <div className="absolute left-0 right-0 z-50 mt-1.5 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-float dark:border-white/10 dark:bg-[#1A1728]">
                    <div className="border-b border-slate-100 bg-slate-50/80 p-2 dark:border-white/10 dark:bg-white/[0.03]">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Cari tahun anggaran..."
                                autoFocus
                                className="w-full rounded-xl border border-slate-200/90 bg-white py-1.5 pl-8 pr-3 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
                            />
                        </div>
                    </div>
                    <div className="sikas-scroll max-h-48 overflow-y-auto p-1.5">
                        {filtered.length > 0 ? (
                            filtered.map((opt) => {
                                const isSelected = String(opt.id) === String(value);
                                return (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => {
                                            onChange(opt.id);
                                            setOpen(false);
                                            setQuery('');
                                        }}
                                        className={cn(
                                            'flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition',
                                            isSelected
                                                ? 'bg-pastel-lavender/80 text-brand-800 dark:bg-brand-500/20 dark:text-brand-200'
                                                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5'
                                        )}
                                    >
                                        <span className="text-sikas-num">{opt.tahun_anggaran}</span>
                                        {isSelected && <Check className="h-3.5 w-3.5 text-brand-600 dark:text-brand-300" />}
                                    </button>
                                );
                            })
                        ) : (
                            <p className="px-3 py-3 text-center text-xs text-slate-400 dark:text-slate-500">
                                Tahun anggaran tidak ditemukan.
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function StsModals({
    penganggaranList,
    penganggaranFk,
    selectedSts,
    stsToDelete,
    handleCurrencyChange,
    isCreateOpen,
    onCloseCreate,
    createForm,
    onSubmitCreate,
    isEditOpen,
    onCloseEdit,
    editForm,
    onSubmitEdit,
    isPaymentOpen,
    onClosePayment,
    paymentForm,
    onSubmitPayment,
    isDeleteOpen,
    onCloseDelete,
    onConfirmDelete,
    deleteProcessing,
}: StsModalsProps) {
    const totalStsAmount = Number(selectedSts?.jumlah_sts || 0);
    const currentSisa = Number(selectedSts?.sisa || 0);
    const currentBayarRaw = Number(paymentForm.data.jumlah_bayar_raw || 0);
    const effectiveTagihan = paymentForm.data.is_edit
        ? currentSisa + Number(selectedSts?.jumlah_bayar || 0)
        : currentSisa;
    const estimatedSisa = effectiveTagihan - currentBayarRaw;
    const isOverpaying = estimatedSisa < 0;

    return (
        <>
            {/* 1. CREATE MODAL */}
            <Modal show={isCreateOpen} onClose={onCloseCreate} maxWidth="md">
                <div className="relative overflow-visible rounded-[26px] bg-white dark:bg-[#15131F]">
                    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]">
                        <div className={cn('absolute -right-14 -top-14 h-44 w-44 rounded-full blur-3xl', GLOW_TONES.violet.primary)} />
                        <div className={cn('absolute -bottom-16 -left-14 h-36 w-36 rounded-full blur-3xl', GLOW_TONES.violet.secondary)} />
                    </div>

                    <StsModalHeader
                        tone="violet"
                        icon={<Plus className="h-5 w-5" />}
                        title="Tambahkan STS Baru"
                        subtitle="Catat surat tanda setoran sisa titipan sekolah."
                        badge={<StatusBadge tone="violet">STS Baru</StatusBadge>}
                        onClose={onCloseCreate}
                    />

                    <form onSubmit={onSubmitCreate} className="relative overflow-visible">
                        <div className="space-y-4 overflow-visible px-6 py-5">
                            <div className="space-y-4 overflow-visible rounded-[20px] border border-slate-200/80 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                                <div>
                                    <InputLabel
                                        htmlFor="penganggaran_id"
                                        value="Tahun Anggaran"
                                        className="mb-1.5 !text-[11px] !font-bold !uppercase !tracking-wider !text-slate-600 dark:!text-slate-300"
                                    />
                                    <YearBudgetPicker
                                        options={penganggaranList}
                                        value={createForm.data[penganggaranFk]}
                                        onChange={(val) => createForm.setData(penganggaranFk, val)}
                                        error={(createForm.errors as any)[penganggaranFk]}
                                    />
                                    <InputError message={(createForm.errors as any)[penganggaranFk]} className="mt-1.5" />
                                </div>

                                <div>
                                    <InputLabel
                                        htmlFor="nomor_sts"
                                        value="Nomor STS"
                                        className="mb-1.5 !text-[11px] !font-bold !uppercase !tracking-wider !text-slate-600 dark:!text-slate-300"
                                    />
                                    <TextInput
                                        id="nomor_sts"
                                        type="text"
                                        className="block w-full !rounded-2xl font-mono text-xs sm:text-sm"
                                        value={createForm.data.nomor_sts}
                                        onChange={(e) => createForm.setData('nomor_sts', e.target.value)}
                                        required
                                        placeholder="Contoh: 001/STS/2026"
                                    />
                                    <InputError message={createForm.errors.nomor_sts} className="mt-1.5" />
                                </div>

                                <div>
                                    <InputLabel
                                        htmlFor="jumlah_sts"
                                        value="Jumlah STS"
                                        className="mb-1.5 !text-[11px] !font-bold !uppercase !tracking-wider !text-slate-600 dark:!text-slate-300"
                                    />
                                    <TextInput
                                        id="jumlah_sts"
                                        type="text"
                                        className="block w-full !rounded-2xl font-bold text-sikas-num"
                                        value={createForm.data.jumlah_sts}
                                        onChange={(e) => handleCurrencyChange(e, createForm, 'jumlah_sts', 'jumlah_sts_raw')}
                                        required
                                        placeholder="Rp 0"
                                    />
                                    <InputError message={createForm.errors.jumlah_sts} className="mt-1.5" />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-6 py-4 dark:border-white/10">
                            <SecondaryButton type="button" onClick={onCloseCreate}>
                                Batal
                            </SecondaryButton>
                            <PrimaryButton type="submit" disabled={createForm.processing}>
                                {createForm.processing ? 'Menyimpan...' : 'Simpan'}
                            </PrimaryButton>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* 2. EDIT MODAL */}
            <Modal show={isEditOpen} onClose={onCloseEdit} maxWidth="md">
                <div className="relative overflow-visible rounded-[26px] bg-white dark:bg-[#15131F]">
                    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]">
                        <div className={cn('absolute -right-14 -top-14 h-44 w-44 rounded-full blur-3xl', GLOW_TONES.amber.primary)} />
                        <div className={cn('absolute -bottom-16 -left-14 h-36 w-36 rounded-full blur-3xl', GLOW_TONES.amber.secondary)} />
                    </div>

                    <StsModalHeader
                        tone="amber"
                        icon={<Pencil className="h-5 w-5" />}
                        title="Edit STS"
                        subtitle="Perbarui nomor surat tanda setoran dan nominalnya."
                        badge={
                            selectedSts?.nomor_sts ? (
                                <StatusBadge tone="warning" className="font-mono">
                                    {selectedSts.nomor_sts}
                                </StatusBadge>
                            ) : undefined
                        }
                        onClose={onCloseEdit}
                    />

                    <form onSubmit={onSubmitEdit} className="relative overflow-visible">
                        <div className="space-y-4 px-6 py-5">
                            <div className="space-y-4 rounded-[20px] border border-slate-200/80 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                                <div>
                                    <InputLabel
                                        htmlFor="edit_nomor_sts"
                                        value="Nomor STS"
                                        className="mb-1.5 !text-[11px] !font-bold !uppercase !tracking-wider !text-slate-600 dark:!text-slate-300"
                                    />
                                    <TextInput
                                        id="edit_nomor_sts"
                                        type="text"
                                        className="block w-full !rounded-2xl font-mono text-xs sm:text-sm"
                                        value={editForm.data.nomor_sts}
                                        onChange={(e) => editForm.setData('nomor_sts', e.target.value)}
                                        required
                                    />
                                    <InputError message={editForm.errors.nomor_sts} className="mt-1.5" />
                                </div>

                                <div>
                                    <InputLabel
                                        htmlFor="edit_jumlah_sts"
                                        value="Jumlah STS"
                                        className="mb-1.5 !text-[11px] !font-bold !uppercase !tracking-wider !text-slate-600 dark:!text-slate-300"
                                    />
                                    <TextInput
                                        id="edit_jumlah_sts"
                                        type="text"
                                        className="block w-full !rounded-2xl font-bold text-sikas-num"
                                        value={editForm.data.jumlah_sts}
                                        onChange={(e) => handleCurrencyChange(e, editForm, 'jumlah_sts', 'jumlah_sts_raw')}
                                        required
                                    />
                                    <InputError message={editForm.errors.jumlah_sts} className="mt-1.5" />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-6 py-4 dark:border-white/10">
                            <SecondaryButton type="button" onClick={onCloseEdit}>
                                Batal
                            </SecondaryButton>
                            <PrimaryButton type="submit" disabled={editForm.processing}>
                                {editForm.processing ? 'Menyimpan...' : 'Simpan Perubahan'}
                            </PrimaryButton>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* 3. PAYMENT MODAL */}
            <Modal show={isPaymentOpen} onClose={onClosePayment} maxWidth="md">
                <div className="relative overflow-visible rounded-[26px] bg-white dark:bg-[#15131F]">
                    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]">
                        <div className={cn('absolute -right-14 -top-14 h-44 w-44 rounded-full blur-3xl', GLOW_TONES.mint.primary)} />
                        <div className={cn('absolute -bottom-16 -left-14 h-36 w-36 rounded-full blur-3xl', GLOW_TONES.mint.secondary)} />
                    </div>

                    <StsModalHeader
                        tone="mint"
                        icon={<Wallet className="h-5 w-5" />}
                        title={paymentForm.data.is_edit ? 'Edit Pembayaran STS' : 'Proses Pembayaran STS'}
                        subtitle="Catat tanggal penyetoran dan nominal pembayaran STS."
                        badge={
                            selectedSts?.nomor_sts ? (
                                <StatusBadge tone="success" className="font-mono">
                                    {selectedSts.nomor_sts}
                                </StatusBadge>
                            ) : undefined
                        }
                        onClose={onClosePayment}
                    />

                    <form onSubmit={onSubmitPayment} className="relative overflow-visible">
                        <div className="space-y-4 overflow-visible px-6 py-5">
                            {/* Bento Summary Strip */}
                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                                <div className="rounded-[18px] border border-slate-200/80 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Total STS
                                    </span>
                                    <p className="mt-1 text-xs font-extrabold text-slate-900 text-sikas-num dark:text-white">
                                        {formatRupiah(totalStsAmount)}
                                    </p>
                                </div>

                                <div className="rounded-[18px] border border-slate-200/80 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Sisa Tagihan
                                    </span>
                                    <p className="mt-1 text-xs font-extrabold text-rose-600 text-sikas-num dark:text-rose-300">
                                        {formatRupiah(currentSisa)}
                                    </p>
                                </div>

                                <div
                                    className={cn(
                                        'rounded-[18px] border p-3 transition-colors',
                                        isOverpaying
                                            ? 'border-rose-200 bg-pastel-rose/70 dark:border-rose-500/25 dark:bg-rose-500/[0.08]'
                                            : estimatedSisa === 0
                                                ? 'border-mint/25 bg-pastel-mint/60 dark:border-mint/25 dark:bg-mint/[0.08]'
                                                : 'border-sky/25 bg-pastel-sky/70 dark:border-sky/20 dark:bg-sky/[0.08]'
                                    )}
                                >
                                    <div className="flex items-center justify-between gap-1">
                                        <span
                                            className={cn(
                                                'text-[10px] font-bold uppercase tracking-wider',
                                                isOverpaying
                                                    ? 'text-rose-700 dark:text-rose-300'
                                                    : estimatedSisa === 0
                                                        ? 'text-emerald-700 dark:text-emerald-300'
                                                        : 'text-blue-700 dark:text-blue-300'
                                            )}
                                        >
                                            {isOverpaying ? 'Melebihi' : estimatedSisa === 0 ? 'Lunas' : 'Est. Sisa'}
                                        </span>
                                        <Sparkles
                                            className={cn(
                                                'h-3 w-3',
                                                isOverpaying
                                                    ? 'text-rose-600 dark:text-rose-300'
                                                    : estimatedSisa === 0
                                                        ? 'text-mint'
                                                        : 'text-blue-600 dark:text-blue-300'
                                            )}
                                        />
                                    </div>
                                    <p
                                        className={cn(
                                            'mt-1 text-xs font-extrabold text-sikas-num',
                                            isOverpaying
                                                ? 'text-rose-700 dark:text-rose-200'
                                                : estimatedSisa === 0
                                                    ? 'text-emerald-800 dark:text-emerald-200'
                                                    : 'text-blue-900 dark:text-blue-200'
                                        )}
                                    >
                                        {formatRupiah(Math.abs(estimatedSisa))}
                                    </p>
                                </div>
                            </div>

                            {/* Form Card */}
                            <div className="space-y-4 overflow-visible rounded-[20px] border border-slate-200/80 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                                <div>
                                    <InputLabel
                                        htmlFor="tanggal_bayar"
                                        value="Tanggal Bayar"
                                        className="mb-1.5 !text-[11px] !font-bold !uppercase !tracking-wider !text-slate-600 dark:!text-slate-300"
                                    />
                                    <div className="relative overflow-visible">
                                        <DatePicker
                                            value={paymentForm.data.tanggal_bayar}
                                            onChange={(date) =>
                                                paymentForm.setData('tanggal_bayar', date ? format(date, 'yyyy-MM-dd') : '')
                                            }
                                            className="block w-full !rounded-2xl"
                                            placeholder="Pilih Tanggal Bayar"
                                        />
                                    </div>
                                    <InputError message={paymentForm.errors.tanggal_bayar} className="mt-1.5" />
                                </div>

                                <div>
                                    <InputLabel
                                        htmlFor="jumlah_bayar"
                                        value="Jumlah Bayar"
                                        className="mb-1.5 !text-[11px] !font-bold !uppercase !tracking-wider !text-slate-600 dark:!text-slate-300"
                                    />
                                    <TextInput
                                        id="jumlah_bayar"
                                        type="text"
                                        className="block w-full !rounded-2xl font-bold text-sikas-num"
                                        value={paymentForm.data.jumlah_bayar}
                                        onChange={(e) =>
                                            handleCurrencyChange(e, paymentForm, 'jumlah_bayar', 'jumlah_bayar_raw')
                                        }
                                        required
                                        placeholder="Rp 0"
                                    />
                                    <InputError message={paymentForm.errors.jumlah_bayar} className="mt-1.5" />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-6 py-4 dark:border-white/10">
                            <SecondaryButton type="button" onClick={onClosePayment}>
                                Batal
                            </SecondaryButton>
                            <PrimaryButton type="submit" disabled={paymentForm.processing}>
                                {paymentForm.processing ? 'Menyimpan...' : 'Simpan Pembayaran'}
                            </PrimaryButton>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* 4. DELETE MODAL */}
            <Modal show={isDeleteOpen} onClose={onCloseDelete} maxWidth="sm">
                <div className="relative overflow-visible rounded-[26px] bg-white dark:bg-[#15131F]">
                    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]">
                        <div className={cn('absolute -right-14 -top-14 h-44 w-44 rounded-full blur-3xl', GLOW_TONES.rose.primary)} />
                        <div className={cn('absolute -bottom-16 -left-14 h-36 w-36 rounded-full blur-3xl', GLOW_TONES.rose.secondary)} />
                    </div>

                    <StsModalHeader
                        tone="rose"
                        icon={<Trash2 className="h-5 w-5" />}
                        title="Hapus Data STS"
                        subtitle="Konfirmasi penghapusan permanen data STS."
                        onClose={onCloseDelete}
                    />

                    <div className="relative px-6 py-5">
                        <div className="flex items-start gap-3 rounded-[20px] border border-rose-200/80 bg-pastel-rose/70 p-4 dark:border-rose-500/25 dark:bg-rose-500/[0.08]">
                            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/80 text-rose-600 shadow-sm dark:bg-rose-500/20 dark:text-rose-300">
                                <AlertTriangle className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 text-xs">
                                <p className="font-bold text-rose-900 dark:text-rose-200">
                                    {stsToDelete?.nomor_sts
                                        ? `Hapus STS ${stsToDelete.nomor_sts}?`
                                        : 'Apakah Anda yakin ingin menghapus data STS ini?'}
                                </p>
                                <p className="mt-1 leading-relaxed text-rose-800/90 dark:text-rose-200/80">
                                    Data STS beserta riwayat pembayarannya akan dihapus secara permanen dan tindakan ini tidak dapat dibatalkan.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="relative flex items-center justify-end gap-2.5 border-t border-slate-100 px-6 py-4 dark:border-white/10">
                        <SecondaryButton type="button" onClick={onCloseDelete}>
                            Batal
                        </SecondaryButton>
                        <DangerButton type="button" onClick={onConfirmDelete} disabled={deleteProcessing}>
                            <Trash2 className="h-3.5 w-3.5" />
                            {deleteProcessing ? 'Menghapus...' : 'Hapus'}
                        </DangerButton>
                    </div>
                </div>
            </Modal>
        </>
    );
}

