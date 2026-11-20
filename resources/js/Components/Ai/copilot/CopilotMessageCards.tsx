import IconTile from '@/Components/ui/IconTile';
import StatusBadge from '@/Components/ui/StatusBadge';
import { router } from '@inertiajs/react';
import type { ApexOptions } from 'apexcharts';
import {
    AlertCircle,
    ArrowUpRight,
    BarChart3,
    CheckCircle2,
    Coins,
    Compass,
    ExternalLink,
    FileCheck,
    FileText,
    FolderSync,
    Loader2,
    Printer,
    Settings,
    ShieldCheck,
} from 'lucide-react';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import Chart from 'react-apexcharts';
import type { ActionButton, CopilotAnalyticsChart, StagingDraft } from './types';

function formatRupiah(amount: number): string {
    return `Rp ${amount.toLocaleString('id-ID')}`;
}

function useIsDarkMode(): boolean {
    const [isDark, setIsDark] = useState(() =>
        typeof document !== 'undefined'
            ? document.documentElement.classList.contains('dark')
            : false,
    );

    useEffect(() => {
        if (typeof document === 'undefined') return;
        const root = document.documentElement;
        const sync = () => setIsDark(root.classList.contains('dark'));
        sync();

        const observer = new MutationObserver(sync);
        observer.observe(root, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    return isDark;
}

/**
 * Kartu Draf Transaksi BKU Neo-Bento di dalam pesan Copilot.
 */
export function CopilotStagingDraftCard({
    draft,
    isCommitting,
    onCommit,
}: {
    draft: StagingDraft;
    isCommitting: boolean;
    onCommit: () => void;
}) {
    return (
        <div className="mt-3 space-y-3 rounded-2xl border border-brand-500/15 bg-slate-50/90 p-3.5 text-slate-900 shadow-sm dark:border-brand-400/20 dark:bg-[#12101B] dark:text-slate-100">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5 dark:border-white/10">
                <div className="flex min-w-0 items-center gap-2">
                    <IconTile tone="lime" size="sm">
                        <Coins />
                    </IconTile>
                    <span className="truncate text-[12px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                        Draf Transaksi BKU
                    </span>
                </div>
                <StatusBadge tone="violet" dot={false}>
                    {draft.jenis_transaksi}
                </StatusBadge>
            </div>

            <div className="space-y-1.5 text-[11px]">
                <div>
                    <span className="text-slate-400 dark:text-slate-500">Kegiatan:</span>{' '}
                    <strong className="font-bold text-slate-800 dark:text-slate-100">
                        {draft.nama_kegiatan}
                    </strong>
                </div>
                <div>
                    <span className="text-slate-400 dark:text-slate-500">Rekening:</span>{' '}
                    <span className="font-mono text-[10.5px] font-bold text-brand-600 dark:text-brand-300">
                        {draft.kode_rekening}
                    </span>{' '}
                    <span className="text-slate-600 dark:text-slate-300">
                        - {draft.nama_rekening}
                    </span>
                </div>
                <div>
                    <span className="text-slate-400 dark:text-slate-500">Penyedia:</span>{' '}
                    <strong className="font-bold text-slate-800 dark:text-slate-100">
                        {draft.nama_toko}
                    </strong>{' '}
                    <span className="text-slate-400 dark:text-slate-500">({draft.tanggal})</span>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200/70 pt-2 dark:border-white/10">
                    <span className="font-extrabold text-slate-700 dark:text-slate-300">
                        Total Nominal:
                    </span>
                    <span className="text-sikas-num text-[13.5px] font-extrabold text-brand-600 dark:text-lime-300">
                        {formatRupiah(draft.nominal)}
                    </span>
                </div>

                {draft.total_pajak > 0 && (
                    <div className="flex items-center justify-between text-[10.5px] font-semibold text-rose-600 dark:text-rose-300">
                        <span>Potongan Pajak:</span>
                        <span className="text-sikas-num">{formatRupiah(draft.total_pajak)}</span>
                    </div>
                )}

                <div className="flex items-center justify-between gap-2 pt-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    <span>Sisa Pagu RKAS:</span>
                    <span
                        className={`text-sikas-num font-extrabold ${
                            draft.is_over_budget
                                ? 'text-rose-600 dark:text-rose-300'
                                : 'text-emerald-600 dark:text-emerald-300'
                        }`}
                    >
                        {formatRupiah(draft.sisa_pagu_sebelum)} →{' '}
                        {formatRupiah(draft.sisa_pagu_sesudah)}
                    </span>
                </div>
            </div>

            {draft.commit_error && (
                <div
                    role="alert"
                    className="flex items-start gap-2 rounded-xl border border-rose-200/80 bg-pastel-rose px-3 py-2 text-[10.5px] font-semibold text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300"
                >
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{draft.commit_error}</span>
                </div>
            )}

            <div className="flex items-center justify-end gap-2 border-t border-slate-200/70 pt-2.5 dark:border-white/10">
                {draft.is_committed ? (
                    <StatusBadge tone="success" dot={false} className="px-3 py-1.5 text-[10.5px]">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Tersimpan di BKU (#{draft.bku_id})
                    </StatusBadge>
                ) : (
                    <button
                        type="button"
                        onClick={onCommit}
                        disabled={isCommitting || draft.is_over_budget}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-lime-400 px-3.5 py-2 text-[11px] font-extrabold text-slate-950 shadow-lime transition hover:-translate-y-0.5 hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                    >
                        {isCommitting ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        Konfirmasi &amp; Simpan ke BKU
                    </button>
                )}
            </div>
        </div>
    );
}

/**
 * Mini Analytics Chart Neo-Bento adaptif light & dark mode (options ter-memoize).
 */
export function CopilotAnalyticsChartCard({ chart }: { chart: CopilotAnalyticsChart }) {
    const isDark = useIsDarkMode();

    const options = useMemo<ApexOptions>(() => {
        const labelColor = isDark ? '#94a3b8' : '#64748b';
        const gridColor = isDark ? 'rgba(255,255,255,0.08)' : '#eef2f6';

        return {
            chart: {
                toolbar: { show: false },
                sparkline: { enabled: false },
                background: 'transparent',
                fontFamily: 'inherit',
            },
            theme: {
                mode: isDark ? 'dark' : 'light',
            },
            plotOptions: {
                bar: {
                    borderRadius: 6,
                    columnWidth: '58%',
                },
            },
            xaxis: {
                categories: chart.categories,
                axisBorder: { show: false },
                axisTicks: { show: false },
                labels: {
                    style: {
                        fontSize: '10px',
                        colors: labelColor,
                    },
                },
            },
            yaxis: {
                labels: {
                    formatter: (val: number) => `Rp ${(val / 1000000).toFixed(1)}jt`,
                    style: {
                        fontSize: '9.5px',
                        colors: labelColor,
                    },
                },
            },
            legend: {
                labels: {
                    colors: labelColor,
                },
                fontSize: '10px',
            },
            colors: ['#7c5cff', '#c5e84e', '#38bdf8'],
            dataLabels: { enabled: false },
            grid: {
                borderColor: gridColor,
                strokeDashArray: 4,
            },
            tooltip: {
                theme: isDark ? 'dark' : 'light',
            },
        };
    }, [isDark, chart.categories]);

    return (
        <div className="mt-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm dark:border-white/10 dark:bg-[#12101B]">
            <div className="mb-2.5 flex items-center gap-2">
                <IconTile tone="violet" size="sm">
                    <BarChart3 />
                </IconTile>
                <span className="truncate text-[12px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                    {chart.title}
                </span>
            </div>
            <Chart
                key={isDark ? 'dark' : 'light'}
                options={options}
                series={chart.series}
                type="bar"
                height={185}
            />
        </div>
    );
}

const ACTION_ICON_RULES: Array<{ match: string[]; icon: ReactNode }> = [
    { match: ['print', 'pdf'], icon: <Printer /> },
    { match: ['check', 'bast'], icon: <FileCheck /> },
    { match: ['file', 'doc'], icon: <FileText /> },
    { match: ['setting'], icon: <Settings /> },
    { match: ['sync', 'arkas'], icon: <FolderSync /> },
    { match: ['shield', 'audit'], icon: <ShieldCheck /> },
    { match: ['chart', 'rekap'], icon: <BarChart3 /> },
];

function resolveActionIcon(iconKey?: string): ReactNode {
    const normalized = (iconKey || '').toLowerCase();
    const matched = ACTION_ICON_RULES.find((rule) =>
        rule.match.some((token) => normalized.includes(token)),
    );
    return matched ? matched.icon : <Compass />;
}

function classifySafeUrl(rawUrl: string): { kind: 'internal' | 'external' | 'unsafe'; href: string } {
    const trimmed = (rawUrl || '').trim();
    if (!trimmed || trimmed.includes('\\')) {
        return { kind: 'unsafe', href: '' };
    }

    // Path relatif internal aman (tolak protocol-relative `//`)
    if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
        return { kind: 'internal', href: trimmed };
    }

    try {
        const parsed = new URL(trimmed);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return { kind: 'unsafe', href: '' };
        }
        if (typeof window !== 'undefined' && parsed.origin === window.location.origin) {
            return {
                kind: 'internal',
                href: `${parsed.pathname}${parsed.search}${parsed.hash}`,
            };
        }
        return { kind: 'external', href: parsed.toString() };
    } catch {
        return { kind: 'unsafe', href: '' };
    }
}

/**
 * Kartu tombol aksi cepat (`action_buttons`) yang dikirim oleh Copilot backend.
 */
export function CopilotActionButtonsCard({
    buttons,
    isMaximized = false,
}: {
    buttons: ActionButton[];
    isMaximized?: boolean;
}) {
    const safeButtons = buttons
        .map((btn) => ({ btn, target: classifySafeUrl(btn.url) }))
        .filter((entry) => entry.target.kind !== 'unsafe');

    if (safeButtons.length === 0) return null;

    return (
        <div
            className={`mt-3 grid grid-cols-1 gap-2 ${
                isMaximized ? 'md:grid-cols-2' : ''
            }`}
        >
            {safeButtons.map(({ btn, target }, idx) => {
                const content = (
                    <>
                        <IconTile tone="sky" size="sm">
                            {resolveActionIcon(btn.icon)}
                        </IconTile>
                        <div className="min-w-0 flex-1 text-left">
                            <p className="truncate text-[11px] font-extrabold text-slate-800 group-hover:text-brand-600 dark:text-slate-100 dark:group-hover:text-lime-300">
                                {btn.label}
                            </p>
                            {btn.description && (
                                <p className="mt-0.5 truncate text-[9.5px] font-medium text-slate-400 dark:text-slate-500">
                                    {btn.description}
                                </p>
                            )}
                        </div>
                        {target.kind === 'external' ? (
                            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400 transition group-hover:text-brand-500 dark:group-hover:text-lime-300" />
                        ) : (
                            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand-500 dark:group-hover:text-lime-300" />
                        )}
                    </>
                );

                const itemClass =
                    'group flex items-center gap-2.5 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-2.5 transition hover:border-lime-400/80 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-lime-400/40 dark:hover:bg-white/[0.07]';

                if (target.kind === 'external') {
                    return (
                        <a
                            key={idx}
                            href={target.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={itemClass}
                        >
                            {content}
                        </a>
                    );
                }

                return (
                    <button
                        key={idx}
                        type="button"
                        onClick={() => router.visit(target.href)}
                        className={itemClass}
                    >
                        {content}
                    </button>
                );
            })}
        </div>
    );
}
