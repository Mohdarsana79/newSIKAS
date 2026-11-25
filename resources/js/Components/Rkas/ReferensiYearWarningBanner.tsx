import React, { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import axios from 'axios';
import { AlertTriangle, Copy, ExternalLink, RefreshCw } from 'lucide-react';

interface ReferensiYearWarningBannerProps {
    tahun: string;
    hasKegiatan: boolean;
    hasRekening: boolean;
    prevYear?: number | null;
    routePrefix?: string;
}

export default function ReferensiYearWarningBanner({
    tahun,
    hasKegiatan,
    hasRekening,
    prevYear,
    routePrefix = '',
}: ReferensiYearWarningBannerProps) {
    const [busyAction, setBusyAction] = useState<'sync' | 'copy' | null>(null);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    if (hasKegiatan && hasRekening) {
        return null;
    }

    const missingParts: string[] = [];
    if (!hasKegiatan) missingParts.push('Kode Kegiatan');
    if (!hasRekening) missingParts.push('Rekening Belanja');

    const handleSyncArkas = async () => {
        setBusyAction('sync');
        setFeedback(null);
        try {
            const res = await axios.post(route(`${routePrefix}referensi-kode.sync-all`), {
                year: tahun,
            });
            if (res.data?.status === 'success') {
                setFeedback({ type: 'success', text: res.data.message || `Referensi tahun ${tahun} berhasil disinkronkan.` });
                router.reload();
            } else {
                setFeedback({ type: 'error', text: res.data?.message || 'Gagal menyinkronkan referensi dari ARKAS.' });
            }
        } catch (err: any) {
            setFeedback({
                type: 'error',
                text: err.response?.data?.message || 'Gagal menghubungi engine ARKAS. Pastikan database arkas.db tersedia.',
            });
        } finally {
            setBusyAction(null);
        }
    };

    const handleCopyPrevYear = async () => {
        if (!prevYear) return;
        setBusyAction('copy');
        setFeedback(null);
        try {
            const res = await axios.post(route(`${routePrefix}referensi-kode.copy-year`), {
                source_year: prevYear,
                target_year: Number(tahun),
                tipe: 'both',
            });
            if (res.data?.status === 'success') {
                setFeedback({ type: 'success', text: res.data.message || `Referensi berhasil disalin dari tahun ${prevYear}.` });
                router.reload();
            } else {
                setFeedback({ type: 'error', text: res.data?.message || 'Gagal menyalin referensi tahun sebelumnya.' });
            }
        } catch (err: any) {
            setFeedback({
                type: 'error',
                text: err.response?.data?.message || 'Terjadi kesalahan saat menyalin referensi.',
            });
        } finally {
            setBusyAction(null);
        }
    };

    return (
        <div className="rounded-3xl border border-amber-200/90 bg-pastel-amber/70 p-4 shadow-sm dark:border-amber-400/25 dark:bg-amber-500/10">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-700 dark:bg-amber-400/20 dark:text-amber-300">
                        <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[12.5px] font-extrabold text-amber-950 dark:text-amber-100">
                            Referensi {missingParts.join(' & ')} Tahun {tahun} Belum Tersedia
                        </p>
                        <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-amber-900/80 dark:text-amber-200/80">
                            Data master kini terisolasi per tahun anggaran agar data tahun sebelumnya tidak ikut berubah. Tarik referensi tahun {tahun} dari ARKAS atau salin dari tahun sebelumnya untuk mulai mengisi RKAS {tahun}.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
                    <button
                        type="button"
                        onClick={() => void handleSyncArkas()}
                        disabled={busyAction !== null}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-[11px] font-extrabold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-brand-500 dark:hover:bg-brand-400"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${busyAction === 'sync' ? 'animate-spin' : ''}`} />
                        {busyAction === 'sync' ? `Menarik ${tahun}...` : `Tarik Referensi ${tahun} (ARKAS)`}
                    </button>

                    {prevYear && (
                        <button
                            type="button"
                            onClick={() => void handleCopyPrevYear()}
                            disabled={busyAction !== null}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3.5 py-2 text-[11px] font-extrabold text-amber-900 shadow-sm transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-400/30 dark:bg-white/10 dark:text-amber-100 dark:hover:bg-white/15"
                        >
                            <Copy className="h-3.5 w-3.5" />
                            {busyAction === 'copy' ? 'Menyalin...' : `Salin dari Tahun ${prevYear}`}
                        </button>
                    )}

                    <Link
                        href={`${route(`${routePrefix}referensi-kode.index`)}?year=${encodeURIComponent(tahun)}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300/80 bg-transparent px-3 py-2 text-[11px] font-extrabold text-amber-900 transition hover:bg-amber-100/70 dark:border-amber-400/30 dark:text-amber-200 dark:hover:bg-amber-400/15"
                    >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Buka Referensi Kode
                    </Link>
                </div>
            </div>

            {feedback && (
                <div
                    role={feedback.type === 'error' ? 'alert' : 'status'}
                    className={`mt-3 rounded-2xl border px-3.5 py-2 text-[11px] font-bold ${
                        feedback.type === 'success'
                            ? 'border-emerald-200 bg-emerald-50/90 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-200'
                            : 'border-rose-200 bg-rose-50/90 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-200'
                    }`}
                >
                    {feedback.text}
                </div>
            )}
        </div>
    );
}
