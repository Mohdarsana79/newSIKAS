import React from 'react';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputError from '@/Components/InputError';
import DatePicker from '@/Components/DatePicker';
import IconTile from '@/Components/ui/IconTile';
import StatusBadge from '@/Components/ui/StatusBadge';
import { cn } from '@/lib/utils';

type TransferTone = 'sky' | 'mint';

const TONE_STYLES: Record<TransferTone, {
    glow: string;
    infoCard: string;
    infoLabel: string;
    maxBtn: string;
}> = {
    sky: {
        glow: 'bg-sky/10',
        infoCard: 'border-sky/20 bg-pastel-sky/60 dark:border-sky/20 dark:bg-sky/[0.08]',
        infoLabel: 'text-blue-700 dark:text-blue-300',
        maxBtn: 'border-sky/25 bg-white text-blue-700 hover:bg-sky/10 dark:border-sky/30 dark:bg-white/10 dark:text-blue-300 dark:hover:bg-sky/20',
    },
    mint: {
        glow: 'bg-mint/10',
        infoCard: 'border-mint/20 bg-pastel-mint/60 dark:border-mint/20 dark:bg-mint/[0.08]',
        infoLabel: 'text-emerald-700 dark:text-emerald-300',
        maxBtn: 'border-mint/25 bg-white text-emerald-700 hover:bg-mint/10 dark:border-mint/30 dark:bg-white/10 dark:text-emerald-300 dark:hover:bg-mint/20',
    },
};

export interface KasBankTransferModalProps {
    show: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    processing: boolean;
    tone: TransferTone;
    title: string;
    subtitle: string;
    badgeLabel: string;
    icon: React.ReactNode;
    balanceLabel: string;
    availableBalance: number;
    formattedBalance: string;
    dateLabel: string;
    dateValue: string;
    onDateChange: (date: Date | undefined) => void;
    dateError?: string;
    amountLabel: string;
    amountValue: string;
    onAmountChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onFillMax: () => void;
    amountError?: string;
    startMonth?: Date;
    endMonth?: Date;
    disabledDates?: any;
}

/**
 * Modal transaksi perpindahan saldo BKU (Tarik Tunai / Setor Tunai) bergaya Neo-Bento.
 * Menggunakan overflow-visible agar popover kalender DatePicker tidak terpotong.
 */
export default function KasBankTransferModal({
    show,
    onClose,
    onSubmit,
    processing,
    tone,
    title,
    subtitle,
    badgeLabel,
    icon,
    balanceLabel,
    availableBalance,
    formattedBalance,
    dateLabel,
    dateValue,
    onDateChange,
    dateError,
    amountLabel,
    amountValue,
    onAmountChange,
    onFillMax,
    amountError,
    startMonth,
    endMonth,
    disabledDates,
}: KasBankTransferModalProps) {
    const styles = TONE_STYLES[tone];

    return (
        <Modal show={show} onClose={onClose} maxWidth="2xl">
            <div className="relative overflow-visible rounded-[26px] bg-white dark:bg-[#15131F]">
                {/* Layer efek blur dekoratif di-clip terpisah agar popover DatePicker tetap bebas */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]">
                    <div className={cn('absolute -right-10 -top-16 h-40 w-40 rounded-full blur-3xl', styles.glow)} />
                </div>

                {/* Header Neo-Bento */}
                <div className="relative flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 dark:border-white/5">
                    <div className="flex items-center gap-3.5">
                        <IconTile tone={tone} size="lg">
                            {icon}
                        </IconTile>
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2.5">
                                <h2 className="text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                    {title}
                                </h2>
                                <StatusBadge tone={tone === 'sky' ? 'info' : 'success'} dot={false}>
                                    {badgeLabel}
                                </StatusBadge>
                            </div>
                            <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-400 dark:text-slate-500">
                                {subtitle}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-white"
                        aria-label="Tutup"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="px-6 py-5">
                    <form onSubmit={onSubmit} className="space-y-4">
                        {/* Panel 1: Kartu Bento Info Saldo + Tombol Cepat Isi Maksimal */}
                        <div className={cn('flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4', styles.infoCard)}>
                            <div className="min-w-0">
                                <span className={cn('block text-[10px] font-extrabold uppercase tracking-[0.14em]', styles.infoLabel)}>
                                    {balanceLabel}
                                </span>
                                <div className="mt-0.5 text-sikas-num text-[17px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                    {formattedBalance}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={onFillMax}
                                disabled={availableBalance <= 0}
                                className={cn(
                                    'inline-flex items-center rounded-xl border px-3 py-1.5 text-[11px] font-extrabold shadow-sm transition',
                                    availableBalance <= 0
                                        ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-500'
                                        : styles.maxBtn,
                                )}
                            >
                                Isi Maksimal
                            </button>
                        </div>

                        {/* Panel 2: Kartu Bento Form Input */}
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-white/5 dark:bg-white/[0.02]">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <InputLabel value={dateLabel} />
                                    <DatePicker
                                        value={dateValue}
                                        onChange={onDateChange}
                                        className="mt-1"
                                        placeholder="Pilih tanggal"
                                        startMonth={startMonth}
                                        endMonth={endMonth}
                                        disabled={disabledDates}
                                    />
                                    <InputError message={dateError} className="mt-1.5" />
                                </div>

                                <div>
                                    <InputLabel value={amountLabel} />
                                    <div className="relative mt-1">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                                            <span className="text-[12px] font-bold text-slate-400 dark:text-slate-500">Rp</span>
                                        </div>
                                        <TextInput
                                            className="!pl-10 text-sikas-num text-[13px] font-bold"
                                            value={amountValue}
                                            onChange={onAmountChange}
                                            placeholder="0"
                                        />
                                    </div>
                                    <p className="mt-1.5 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                                        Maksimal: <span className="text-sikas-num font-bold text-slate-600 dark:text-slate-300">{formattedBalance}</span>
                                    </p>
                                    <InputError message={amountError} className="mt-1" />
                                </div>
                            </div>
                        </div>

                        {/* Footer Aksi */}
                        <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-white/5">
                            <SecondaryButton onClick={onClose} type="button" disabled={processing}>
                                Tutup
                            </SecondaryButton>
                            <PrimaryButton disabled={processing}>
                                {processing ? 'Menyimpan...' : 'Simpan'}
                            </PrimaryButton>
                        </div>
                    </form>
                </div>
            </div>
        </Modal>
    );
}
