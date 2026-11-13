import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
    AlertTriangle,
    Check,
    CheckCircle2,
    Database,
    Layers,
    RotateCw,
    Sparkles,
    X,
} from 'lucide-react';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import { IconTile } from '@/Components/ui/IconTile';
import { StatusBadge } from '@/Components/ui/StatusBadge';

export interface ArkasSyncCompletePayload {
    synced: number;
    updated: number;
    targetYear: string;
}

interface ArkasSyncModalProps {
    show: boolean;
    onClose: () => void;
    defaultYear: string;
    localStats?: {
        total: number;
        perYear: Record<string, number>;
    };
    onSyncComplete: (result: ArkasSyncCompletePayload) => void;
}

type SyncPhase = 'confirm' | 'syncing' | 'result';
type StepStatus = 'waiting' | 'running' | 'done' | 'error';

interface YearStep {
    year: string;
    status: StepStatus;
    synced: number;
    updated: number;
    errorMessage?: string;
}

const SEQUENTIAL_ALL_YEARS = ['2024', '2025', '2026'] as const;

const TARGET_OPTIONS = [
    { value: '2026', label: '2026' },
    { value: '2025', label: '2025' },
    { value: '2024', label: '2024' },
    { value: 'ALL', label: 'Semua Tahun' },
] as const;

export default function ArkasSyncModal({
    show,
    onClose,
    defaultYear,
    localStats,
    onSyncComplete,
}: ArkasSyncModalProps) {
    const [selectedTargetYear, setSelectedTargetYear] = useState<string>(defaultYear || '2026');
    const [phase, setPhase] = useState<SyncPhase>('confirm');
    const [yearSteps, setYearSteps] = useState<YearStep[]>([]);
    const [totalSynced, setTotalSynced] = useState(0);
    const [totalUpdated, setTotalUpdated] = useState(0);
    const [overallError, setOverallError] = useState<string | null>(null);

    useEffect(() => {
        if (show) {
            setSelectedTargetYear(defaultYear || '2026');
            setPhase('confirm');
            setYearSteps([]);
            setTotalSynced(0);
            setTotalUpdated(0);
            setOverallError(null);
        }
    }, [show, defaultYear]);

    const handleSafeClose = () => {
        if (phase === 'syncing') return;
        onClose();
    };

    const getYearsQueue = (target: string): string[] => {
        if (target === 'ALL') {
            return [...SEQUENTIAL_ALL_YEARS];
        }
        return [target];
    };

    const handleStartSync = async () => {
        const yearsQueue = getYearsQueue(selectedTargetYear);
        const initialSteps: YearStep[] = yearsQueue.map((y) => ({
            year: y,
            status: 'waiting',
            synced: 0,
            updated: 0,
        }));

        setYearSteps(initialSteps);
        setTotalSynced(0);
        setTotalUpdated(0);
        setOverallError(null);
        setPhase('syncing');

        let accumulatedSynced = 0;
        let accumulatedUpdated = 0;

        for (let i = 0; i < yearsQueue.length; i++) {
            const currentYear = yearsQueue[i];

            setYearSteps((prev) =>
                prev.map((step, idx) =>
                    idx === i ? { ...step, status: 'running', errorMessage: undefined } : step,
                ),
            );

            try {
                const res = await axios.post('/arkas-tools/sync', { year: currentYear });
                const data = res.data;

                if (data?.status === 'success') {
                    const stepSynced = Number(data.synced || 0);
                    const stepUpdated = Number(data.updated || 0);
                    accumulatedSynced += stepSynced;
                    accumulatedUpdated += stepUpdated;

                    setTotalSynced(accumulatedSynced);
                    setTotalUpdated(accumulatedUpdated);

                    setYearSteps((prev) =>
                        prev.map((step, idx) =>
                            idx === i
                                ? {
                                      ...step,
                                      status: 'done',
                                      synced: stepSynced,
                                      updated: stepUpdated,
                                  }
                                : step,
                        ),
                    );
                } else {
                    const message = data?.message || `Sinkronisasi tahun ${currentYear} gagal.`;
                    setYearSteps((prev) =>
                        prev.map((step, idx) =>
                            idx === i ? { ...step, status: 'error', errorMessage: message } : step,
                        ),
                    );
                    setOverallError(message);
                    setPhase('result');
                    if (accumulatedSynced > 0 || accumulatedUpdated > 0) {
                        onSyncComplete({
                            synced: accumulatedSynced,
                            updated: accumulatedUpdated,
                            targetYear: selectedTargetYear,
                        });
                    }
                    return;
                }
            } catch (err: any) {
                const message =
                    err?.response?.data?.message ||
                    `Gagal menghubungi server saat menyinkronkan tahun ${currentYear}.`;

                setYearSteps((prev) =>
                    prev.map((step, idx) =>
                        idx === i ? { ...step, status: 'error', errorMessage: message } : step,
                    ),
                );
                setOverallError(message);
                setPhase('result');
                if (accumulatedSynced > 0 || accumulatedUpdated > 0) {
                    onSyncComplete({
                        synced: accumulatedSynced,
                        updated: accumulatedUpdated,
                        targetYear: selectedTargetYear,
                    });
                }
                return;
            }
        }

        setPhase('result');
        onSyncComplete({
            synced: accumulatedSynced,
            updated: accumulatedUpdated,
            targetYear: selectedTargetYear,
        });
    };

    const doneCount = yearSteps.filter((s) => s.status === 'done').length;
    const runningIndex = yearSteps.findIndex((s) => s.status === 'running');
    const totalCount = yearSteps.length || 1;
    const progressPercent =
        phase === 'result' && !overallError
            ? 100
            : Math.min(99, Math.round(((doneCount + (runningIndex >= 0 ? 0.35 : 0)) / totalCount) * 100));

    const currentLocalCount =
        selectedTargetYear === 'ALL'
            ? localStats?.total ?? 0
            : localStats?.perYear?.[selectedTargetYear] ?? 0;

    const headerIconTone =
        phase === 'syncing'
            ? 'violet'
            : phase === 'result'
              ? overallError
                  ? 'rose'
                  : 'mint'
              : 'violet';

    const headerBadge =
        phase === 'syncing' ? (
            <StatusBadge tone="violet">Sedang Berjalan</StatusBadge>
        ) : phase === 'result' ? (
            overallError ? (
                <StatusBadge tone="danger">Terhenti</StatusBadge>
            ) : (
                <StatusBadge tone="success">Selesai</StatusBadge>
            )
        ) : (
            <StatusBadge tone="neutral" dot={false}>
                Sinkron Langsung
            </StatusBadge>
        );

    const headerSubtitle =
        phase === 'confirm'
            ? 'Salin & perbarui referensi barang ARKAS langsung ke PostgreSQL SIKAS.'
            : phase === 'syncing'
              ? runningIndex >= 0
                  ? `Menyinkronkan Tahun ${yearSteps[runningIndex]?.year} (${runningIndex + 1} dari ${totalCount})...`
                  : 'Mempersiapkan antrean sinkronisasi...'
              : overallError
                ? 'Proses sinkronisasi mengalami kendala di tengah jalan.'
                : 'Referensi database lokal SIKAS telah diperbarui.';

    return (
        <Modal show={show} onClose={handleSafeClose} maxWidth="md" closeable={phase !== 'syncing'}>
            <div className="relative overflow-hidden rounded-[26px] bg-white dark:bg-[#15131F]">
                {/* Ambient glow terisolasi di dalam sudut modal */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]">
                    <div className="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-brand-500/15 blur-3xl dark:bg-brand-500/20" />
                    <div className="absolute -bottom-16 -left-14 h-40 w-40 rounded-full bg-lime-400/15 blur-3xl dark:bg-lime-400/10" />
                </div>

                {/* Header Neo-Bento */}
                <div className="relative flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-5 dark:border-white/5">
                    <div className="flex items-start gap-3.5">
                        <IconTile tone={headerIconTone} size="md">
                            {phase === 'syncing' ? (
                                <RotateCw className="animate-spin" />
                            ) : phase === 'result' ? (
                                overallError ? (
                                    <AlertTriangle />
                                ) : (
                                    <CheckCircle2 />
                                )
                            ) : (
                                <Database />
                            )}
                        </IconTile>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                    Sinkronisasi Database ARKAS
                                </h3>
                                {headerBadge}
                            </div>
                            <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                {headerSubtitle}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleSafeClose}
                        disabled={phase === 'syncing'}
                        title={
                            phase === 'syncing'
                                ? 'Sinkronisasi sedang berjalan'
                                : 'Tutup modal'
                        }
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-35 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-slate-300"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="relative space-y-4 p-6">
                    {phase === 'confirm' && (
                        <>
                            {/* Pill Selector Target Tahun */}
                            <div className="rounded-[20px] border border-slate-200/80 bg-slate-50/90 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                                        Target Tahun Anggaran
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                                        {selectedTargetYear === 'ALL'
                                            ? 'Berurutan 2024 -> 2025 -> 2026'
                                            : `Khusus Tahun ${selectedTargetYear}`}
                                    </span>
                                </div>

                                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                    {TARGET_OPTIONS.map((opt) => {
                                        const isActive = selectedTargetYear === opt.value;
                                        return (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => setSelectedTargetYear(opt.value)}
                                                className={`flex items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-[11px] font-extrabold transition ${
                                                    isActive
                                                        ? 'border-brand-500 bg-pastel-lavender text-brand-700 ring-2 ring-brand-500/20 dark:border-brand-400/60 dark:bg-brand-500/20 dark:text-brand-200'
                                                        : 'border-slate-200/80 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                                                }`}
                                            >
                                                {isActive && <Check className="h-3.5 w-3.5 shrink-0" />}
                                                <span>{opt.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Info Ringkas Tanpa Tarik Data */}
                            <div className="rounded-[20px] border border-slate-200/80 bg-slate-50/90 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                                <div className="flex items-start gap-3">
                                    <IconTile tone="lime" size="sm">
                                        <Layers />
                                    </IconTile>
                                    <div className="min-w-0 flex-1 space-y-1.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-[11.5px] font-extrabold text-slate-900 dark:text-white">
                                                Tersimpan Saat Ini (Lokal)
                                            </p>
                                            <span className="text-sikas-num rounded-full bg-white px-2.5 py-0.5 text-[11px] font-extrabold text-slate-700 ring-1 ring-slate-200/80 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10">
                                                {currentLocalCount.toLocaleString('id-ID')} item
                                            </span>
                                        </div>
                                        <p className="text-[11px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                                            {selectedTargetYear === 'ALL'
                                                ? 'Sistem akan menyinkronkan tahun 2024, 2025, dan 2026 satu per satu langsung dari database ARKAS ke PostgreSQL tanpa membebani browser.'
                                                : `Data referensi tahun ${selectedTargetYear} dari database ARKAS akan langsung dibandingkan dan di-upsert ke database lokal SIKAS.`}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {(phase === 'syncing' || phase === 'result') && (
                        <>
                            {/* Error Banner jika ada */}
                            {phase === 'result' && overallError && (
                                <div className="rounded-[20px] border border-rose-300/60 bg-pastel-rose/70 p-4 dark:border-rose-400/20 dark:bg-rose-500/10">
                                    <div className="flex items-start gap-3">
                                        <IconTile tone="rose" size="sm">
                                            <AlertTriangle />
                                        </IconTile>
                                        <div className="min-w-0">
                                            <p className="text-[11.5px] font-extrabold text-rose-700 dark:text-rose-200">
                                                Sinkronisasi Terhenti
                                            </p>
                                            <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-rose-600 dark:text-rose-300">
                                                {overallError}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Ringkasan Hasil Sukses 2 Kolom */}
                            {phase === 'result' && !overallError && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-[20px] border border-emerald-200/70 bg-pastel-mint/70 p-4 dark:border-mint/20 dark:bg-mint/10">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-600 dark:text-slate-300">
                                                Data Baru
                                            </span>
                                            <Sparkles className="h-3.5 w-3.5 text-mint" />
                                        </div>
                                        <p className="text-sikas-num mt-2 text-[22px] font-extrabold tracking-tight text-mint">
                                            +{totalSynced.toLocaleString('id-ID')}
                                        </p>
                                        <p className="mt-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                            Referensi ditambahkan
                                        </p>
                                    </div>

                                    <div className="rounded-[20px] border border-amber-200/80 bg-pastel-amber/70 p-4 dark:border-amber-400/20 dark:bg-amber-400/10">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-600 dark:text-slate-300">
                                                Diperbarui
                                            </span>
                                            <RotateCw className="h-3.5 w-3.5 text-amber-600 dark:text-amber-300" />
                                        </div>
                                        <p className="text-sikas-num mt-2 text-[22px] font-extrabold tracking-tight text-amber-600 dark:text-amber-300">
                                            {totalUpdated.toLocaleString('id-ID')}
                                        </p>
                                        <p className="mt-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                            Perubahan tersimpan
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Progress Bar Nyata */}
                            {phase === 'syncing' && (
                                <div className="rounded-[20px] border border-slate-200/80 bg-slate-50/90 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                                    <div className="flex items-center justify-between text-[11px] font-extrabold">
                                        <span className="text-slate-700 dark:text-slate-200">
                                            Progres Sinkronisasi
                                        </span>
                                        <span className="text-sikas-num text-brand-600 dark:text-brand-300">
                                            {progressPercent}%
                                        </span>
                                    </div>
                                    <div className="mt-2.5 h-3 w-full overflow-hidden rounded-full bg-slate-200/90 p-0.5 dark:bg-white/10">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all duration-500 ease-out"
                                            style={{ width: `${Math.max(progressPercent, 8)}%` }}
                                        />
                                    </div>
                                    <p className="mt-2 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                        Mohon tidak menutup halaman. Proses berjalan langsung di server tanpa memuat tabel besar ke browser.
                                    </p>
                                </div>
                            )}

                            {/* Checklist Per Tahun */}
                            <div className="rounded-[20px] border border-slate-200/80 bg-slate-50/90 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                                <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                                    Status Per Tahun
                                </p>
                                <div className="mt-2.5 space-y-2">
                                    {yearSteps.map((step) => (
                                        <div
                                            key={step.year}
                                            className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white px-3.5 py-2.5 dark:border-white/10 dark:bg-white/[0.04]"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                {step.status === 'running' && (
                                                    <RotateCw className="h-4 w-4 animate-spin text-brand-500" />
                                                )}
                                                {step.status === 'done' && (
                                                    <CheckCircle2 className="h-4 w-4 text-mint" />
                                                )}
                                                {step.status === 'error' && (
                                                    <AlertTriangle className="h-4 w-4 text-rose-500" />
                                                )}
                                                {step.status === 'waiting' && (
                                                    <span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                                                )}
                                                <span className="text-[11.5px] font-extrabold text-slate-800 dark:text-slate-100">
                                                    Tahun {step.year}
                                                </span>
                                            </div>

                                            <div className="text-right">
                                                {step.status === 'waiting' && (
                                                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                                                        Menunggu giliran
                                                    </span>
                                                )}
                                                {step.status === 'running' && (
                                                    <span className="text-[10px] font-extrabold text-brand-600 dark:text-brand-300">
                                                        Menyinkronkan...
                                                    </span>
                                                )}
                                                {step.status === 'done' && (
                                                    <span className="text-sikas-num text-[10px] font-extrabold text-mint">
                                                        +{step.synced.toLocaleString('id-ID')} baru •{' '}
                                                        {step.updated.toLocaleString('id-ID')} update
                                                    </span>
                                                )}
                                                {step.status === 'error' && (
                                                    <span className="text-[10px] font-extrabold text-rose-500 dark:text-rose-300">
                                                        Gagal
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="relative flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/70 px-6 py-4 dark:border-white/5 dark:bg-white/[0.02]">
                    {phase === 'confirm' && (
                        <>
                            <SecondaryButton type="button" onClick={handleSafeClose}>
                                Batal
                            </SecondaryButton>
                            <PrimaryButton type="button" onClick={handleStartSync}>
                                Mulai Sinkronisasi
                            </PrimaryButton>
                        </>
                    )}

                    {phase === 'syncing' && (
                        <span className="text-[10.5px] font-bold text-slate-400 dark:text-slate-500">
                            Sedang menyinkronkan database ARKAS...
                        </span>
                    )}

                    {phase === 'result' && !overallError && (
                        <PrimaryButton type="button" onClick={handleSafeClose}>
                            Tutup &amp; Lihat Data
                        </PrimaryButton>
                    )}

                    {phase === 'result' && overallError && (
                        <>
                            <SecondaryButton type="button" onClick={handleSafeClose}>
                                Tutup
                            </SecondaryButton>
                            <PrimaryButton type="button" onClick={handleStartSync}>
                                Coba Lagi
                            </PrimaryButton>
                        </>
                    )}
                </div>
            </div>
        </Modal>
    );
}

