import React, { FormEventHandler, useEffect, useMemo } from 'react';
import { Copy, RefreshCw, X } from 'lucide-react';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import IconTile from '@/Components/ui/IconTile';
import StatusBadge from '@/Components/ui/StatusBadge';

interface CopyYearModalProps {
    show: boolean;
    onClose: () => void;
    title: string;
    itemLabel: string;
    sourceYear: string;
    targetYear: string;
    onChangeSourceYear: (year: string) => void;
    onChangeTargetYear: (year: string) => void;
    sourceYearOptions: Array<{ year: string; count: number }>;
    errors: { source_year?: string; target_year?: string };
    processing: boolean;
    onSubmit: FormEventHandler;
}

export default function CopyYearModal({
    show,
    onClose,
    title,
    itemLabel,
    sourceYear,
    targetYear,
    onChangeSourceYear,
    onChangeTargetYear,
    sourceYearOptions,
    errors,
    processing,
    onSubmit,
}: CopyYearModalProps) {
    const validSources = useMemo(
        () => sourceYearOptions.filter((opt) => opt.count > 0),
        [sourceYearOptions],
    );

    useEffect(() => {
        if (show && !sourceYear && validSources.length > 0) {
            const preferred = validSources.find((opt) => opt.year !== targetYear) ?? validSources[0];
            if (preferred) {
                onChangeSourceYear(preferred.year);
            }
        }
    }, [show, sourceYear, targetYear, validSources, onChangeSourceYear]);

    const sameYear = sourceYear.trim() !== '' && sourceYear.trim() === targetYear.trim();

    return (
        <Modal show={show} onClose={() => !processing && onClose()} maxWidth="md">
            <div className="relative rounded-[26px] bg-white shadow-card-light dark:bg-[#15131F] dark:shadow-card-dark">
                <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]">
                    <div className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-pastel-sky/80 blur-3xl dark:bg-sky/15" />
                    <div className="absolute -bottom-16 -left-10 h-36 w-36 rounded-full bg-pastel-mint/60 blur-3xl dark:bg-mint/10" />
                </div>

                <div className="relative">
                    <div className="flex items-start justify-between gap-3 rounded-t-[26px] border-b border-slate-100 px-6 py-4 dark:border-white/10">
                        <div className="flex min-w-0 items-center gap-3.5">
                            <IconTile tone="sky" size="md">
                                <Copy />
                            </IconTile>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                        {title}
                                    </h2>
                                    <StatusBadge tone="info" dot={false}>Salin Tahun</StatusBadge>
                                </div>
                                <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                    Salin daftar {itemLabel} dari tahun sumber ke tahun tujuan (mode offline/manual).
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={processing}
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-white"
                            aria-label="Tutup"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <form onSubmit={onSubmit}>
                        <div className="space-y-4 px-6 py-5">
                            {validSources.length === 0 ? (
                                <div className="rounded-2xl border border-amber-200/80 bg-pastel-amber/70 p-4 text-[11.5px] font-semibold text-amber-800 dark:border-amber-400/25 dark:bg-amber-500/10 dark:text-amber-200">
                                    Belum ada tahun anggaran yang memiliki data {itemLabel} untuk disalin.
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <InputLabel htmlFor="copy-source-year" value="Tahun Sumber" />
                                            <select
                                                id="copy-source-year"
                                                value={sourceYear}
                                                onChange={(e) => onChangeSourceYear(e.target.value)}
                                                className="mt-1.5 block w-full rounded-2xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-900 shadow-sm transition focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white"
                                                required
                                            >
                                                <option value="">Pilih tahun sumber...</option>
                                                {validSources.map((opt) => (
                                                    <option key={opt.year} value={opt.year} className="dark:bg-[#1A1728]">
                                                        Tahun {opt.year} ({opt.count} data)
                                                    </option>
                                                ))}
                                            </select>
                                            <InputError message={errors.source_year} className="mt-1.5" />
                                        </div>

                                        <div>
                                            <InputLabel htmlFor="copy-target-year" value="Tahun Tujuan" />
                                            <TextInput
                                                id="copy-target-year"
                                                type="number"
                                                min={2000}
                                                max={2100}
                                                value={targetYear}
                                                onChange={(e) => onChangeTargetYear(e.target.value)}
                                                className="mt-1.5 block w-full text-sikas-num"
                                                placeholder="Contoh: 2027"
                                                required
                                            />
                                            <InputError message={errors.target_year} className="mt-1.5" />
                                        </div>
                                    </div>

                                    {sameYear && (
                                        <p className="text-[11px] font-bold text-rose-500 dark:text-rose-400">
                                            Tahun sumber dan tahun tujuan tidak boleh sama.
                                        </p>
                                    )}

                                    <div className="rounded-2xl border border-emerald-200/80 bg-pastel-mint/60 p-3 text-[11px] font-semibold leading-relaxed text-emerald-800 dark:border-mint/25 dark:bg-mint/10 dark:text-emerald-200">
                                        Kode yang sudah ada di tahun tujuan akan dilewati secara otomatis, dan data di tahun sumber tidak akan berubah.
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-2.5 rounded-b-[26px] border-t border-slate-100 bg-slate-50/70 px-6 py-4 dark:border-white/5 dark:bg-white/[0.02]">
                            <SecondaryButton type="button" onClick={onClose} disabled={processing}>
                                Batal
                            </SecondaryButton>
                            <PrimaryButton
                                type="submit"
                                disabled={processing || validSources.length === 0 || !sourceYear || !targetYear || sameYear}
                                className="flex items-center gap-2"
                            >
                                {processing ? (
                                    <>
                                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                        Menyalin...
                                    </>
                                ) : (
                                    'Salin Data'
                                )}
                            </PrimaryButton>
                        </div>
                    </form>
                </div>
            </div>
        </Modal>
    );
}
