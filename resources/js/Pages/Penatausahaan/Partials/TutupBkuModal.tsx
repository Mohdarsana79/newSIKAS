import React from 'react';
import { format } from 'date-fns';
import {
    AlertTriangle,
    Banknote,
    Landmark,
    Lock,
    Sparkles,
    X,
} from 'lucide-react';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';
import DatePicker from '@/Components/DatePicker';
import IconTile from '@/Components/ui/IconTile';
import StatusBadge from '@/Components/ui/StatusBadge';
import { cn } from '@/lib/utils';

export interface TutupBkuModalProps {
    show: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    processing: boolean;
    bulan: string;
    tahun: string;
    saldoTunai: number;
    saldoNonTunai: number;
    tanggalTutup: string;
    bungaBank: string;
    pajakBunga: string;
    errors: {
        tanggal_tutup?: string;
        bunga_bank?: string;
        pajak_bunga?: string;
    };
    onDateChange: (dateStr: string) => void;
    onBungaChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onPajakBungaChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    startOfActiveMonth: Date;
    endOfActiveMonth: Date;
    formatCurrency: (val: number | string | undefined | null) => string;
}

function parseNominalDigits(value: string): number {
    const digits = String(value || '').replace(/[^0-9]/g, '');
    if (!digits) {
        return 0;
    }
    const parsed = parseInt(digits, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
}

export default function TutupBkuModal({
    show,
    onClose,
    onSubmit,
    processing,
    bulan,
    tahun,
    saldoTunai,
    saldoNonTunai,
    tanggalTutup,
    bungaBank,
    pajakBunga,
    errors,
    onDateChange,
    onBungaChange,
    onPajakBungaChange,
    startOfActiveMonth,
    endOfActiveMonth,
    formatCurrency,
}: TutupBkuModalProps) {
    const parsedBunga = parseNominalDigits(bungaBank);
    const parsedPajak = parseNominalDigits(pajakBunga);
    const netBunga = parsedBunga - parsedPajak;
    const isTaxExceeding = parsedPajak > parsedBunga;

    return (
        <Modal show={show} onClose={onClose} maxWidth="xl">
            <div className="relative overflow-visible rounded-[26px] bg-white dark:bg-[#15131F]">
                {/* Isolated decorative Neo-Bento glow */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]">
                    <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-pastel-amber/80 blur-3xl dark:bg-amber-500/15" />
                    <div className="absolute -bottom-20 -left-16 h-44 w-44 rounded-full bg-pastel-rose/60 blur-3xl dark:bg-rose-500/10" />
                </div>

                {/* Header */}
                <div className="relative flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4 dark:border-white/10">
                    <div className="flex min-w-0 items-center gap-3.5">
                        <IconTile tone="amber" size="md">
                            <Lock className="h-5 w-5" />
                        </IconTile>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-[16px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                    Konfirmasi Tutup BKU
                                </h2>
                                <StatusBadge tone="warning" dot>
                                    {bulan} {tahun}
                                </StatusBadge>
                            </div>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                Kunci transaksi bulanan dan catat jasa giro serta pajak bunga bank.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Tutup modal konfirmasi tutup BKU"
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <form onSubmit={onSubmit} className="relative overflow-visible">
                    <div className="space-y-4 overflow-visible px-6 py-5">
                        {/* Warning Callout */}
                        <div className="flex items-start gap-3 rounded-[20px] border border-amber-200/80 bg-pastel-amber/75 p-3.5 dark:border-amber-500/25 dark:bg-amber-500/[0.08]">
                            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/80 text-amber-600 shadow-sm dark:bg-amber-500/20 dark:text-amber-300">
                                <AlertTriangle className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-xs font-extrabold text-amber-900 dark:text-amber-200">
                                    Perhatian Sebelum Menutup Buku
                                </h3>
                                <p className="mt-0.5 text-xs leading-relaxed text-amber-800/90 dark:text-amber-200/80">
                                    Setelah BKU bulan <strong className="font-bold">{bulan}</strong> ditutup, Anda tidak dapat menambah atau mengubah transaksi hingga buku dibuka kembali.
                                </p>
                            </div>
                        </div>

                        {/* Bento Summary Strip */}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div className="rounded-[18px] border border-slate-200/80 bg-slate-50/80 p-3.5 dark:border-white/10 dark:bg-white/[0.03]">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Saldo Tunai
                                    </span>
                                    <Banknote className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                                </div>
                                <p className="mt-1.5 text-sm font-extrabold text-slate-900 text-sikas-num dark:text-white">
                                    {formatCurrency(saldoTunai)}
                                </p>
                                <p className="mt-0.5 text-[10.5px] text-slate-500 dark:text-slate-400">
                                    Kas tunai aktif
                                </p>
                            </div>

                            <div className="rounded-[18px] border border-slate-200/80 bg-slate-50/80 p-3.5 dark:border-white/10 dark:bg-white/[0.03]">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Saldo Non-Tunai
                                    </span>
                                    <Landmark className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                                </div>
                                <p className="mt-1.5 text-sm font-extrabold text-slate-900 text-sikas-num dark:text-white">
                                    {formatCurrency(saldoNonTunai)}
                                </p>
                                <p className="mt-0.5 text-[10.5px] text-slate-500 dark:text-slate-400">
                                    Saldo rekening bank
                                </p>
                            </div>

                            <div
                                className={cn(
                                    'rounded-[18px] border p-3.5 transition-colors',
                                    isTaxExceeding
                                        ? 'border-rose-200 bg-pastel-rose/70 dark:border-rose-500/25 dark:bg-rose-500/[0.08]'
                                        : 'border-mint/25 bg-pastel-mint/60 dark:border-mint/25 dark:bg-mint/[0.08]'
                                )}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span
                                        className={cn(
                                            'text-[10px] font-bold uppercase tracking-wider',
                                            isTaxExceeding
                                                ? 'text-rose-700 dark:text-rose-300'
                                                : 'text-emerald-700 dark:text-emerald-300'
                                        )}
                                    >
                                        Bunga Bersih
                                    </span>
                                    <Sparkles
                                        className={cn(
                                            'h-3.5 w-3.5',
                                            isTaxExceeding
                                                ? 'text-rose-600 dark:text-rose-300'
                                                : 'text-mint'
                                        )}
                                    />
                                </div>
                                <p
                                    className={cn(
                                        'mt-1.5 text-sm font-extrabold text-sikas-num',
                                        isTaxExceeding
                                            ? 'text-rose-700 dark:text-rose-200'
                                            : 'text-emerald-900 dark:text-emerald-200'
                                    )}
                                >
                                    {netBunga > 0 ? `+ ${formatCurrency(netBunga)}` : formatCurrency(netBunga)}
                                </p>
                                <p
                                    className={cn(
                                        'mt-0.5 text-[10.5px]',
                                        isTaxExceeding
                                            ? 'text-rose-600 dark:text-rose-300'
                                            : 'text-emerald-700/80 dark:text-emerald-300/80'
                                    )}
                                >
                                    {isTaxExceeding ? 'Pajak melebihi bunga' : 'Estimasi jasa giro bersih'}
                                </p>
                            </div>
                        </div>

                        {/* Form Card */}
                        <div className="space-y-4 overflow-visible rounded-[20px] border border-slate-200/80 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                            <div>
                                <InputLabel
                                    value="Tanggal Tutup BKU"
                                    className="mb-1.5 !text-[11px] !font-bold !uppercase !tracking-wider !text-slate-600 dark:!text-slate-300"
                                />
                                <div className="relative overflow-visible">
                                    <DatePicker
                                        value={tanggalTutup}
                                        onChange={(date) => onDateChange(date ? format(date, 'yyyy-MM-dd') : '')}
                                        className="block w-full !rounded-2xl !text-xs text-slate-900 dark:!bg-white/5 dark:text-white"
                                        placeholder="Pilih tanggal tutup"
                                        startMonth={startOfActiveMonth}
                                        endMonth={endOfActiveMonth}
                                        disabled={[
                                            { before: startOfActiveMonth },
                                            { after: endOfActiveMonth },
                                        ]}
                                    />
                                </div>
                                <InputError message={errors.tanggal_tutup} className="mt-1.5" />
                            </div>

                            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                                <div>
                                    <InputLabel
                                        value="Jasa Giro / Bunga Bank"
                                        className="mb-1.5 !text-[11px] !font-bold !uppercase !tracking-wider !text-slate-600 dark:!text-slate-300"
                                    />
                                    <div className="relative">
                                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-xs font-bold text-slate-400 dark:text-slate-500">
                                            Rp
                                        </span>
                                        <TextInput
                                            className="block w-full !rounded-2xl pl-10 !text-sm font-semibold text-slate-900 text-sikas-num dark:text-white"
                                            value={bungaBank}
                                            onChange={onBungaChange}
                                            placeholder="0"
                                        />
                                    </div>
                                    <InputError message={errors.bunga_bank} className="mt-1.5" />
                                </div>

                                <div>
                                    <InputLabel
                                        value="Pajak Bunga Bank"
                                        className="mb-1.5 !text-[11px] !font-bold !uppercase !tracking-wider !text-slate-600 dark:!text-slate-300"
                                    />
                                    <div className="relative">
                                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-xs font-bold text-slate-400 dark:text-slate-500">
                                            Rp
                                        </span>
                                        <TextInput
                                            className="block w-full !rounded-2xl pl-10 !text-sm font-semibold text-slate-900 text-sikas-num dark:text-white"
                                            value={pajakBunga}
                                            onChange={onPajakBungaChange}
                                            placeholder="0"
                                        />
                                    </div>
                                    <InputError message={errors.pajak_bunga} className="mt-1.5" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-6 py-4 dark:border-white/10">
                        <p className="hidden text-[11px] text-slate-400 dark:text-slate-500 sm:block">
                            Pastikan seluruh nota & pajak bulan {bulan} sudah sesuai.
                        </p>
                        <div className="ml-auto flex items-center gap-2.5">
                            <SecondaryButton type="button" onClick={onClose}>
                                Batal
                            </SecondaryButton>
                            <DangerButton type="submit" disabled={processing}>
                                <Lock className="h-3.5 w-3.5" />
                                {processing ? 'Memproses...' : 'Tutup BKU'}
                            </DangerButton>
                        </div>
                    </div>
                </form>
            </div>
        </Modal>
    );
}

