import Modal from '@/Components/Modal';
import IconTile from '@/Components/ui/IconTile';
import StatusBadge, { type StatusTone } from '@/Components/ui/StatusBadge';
import {
    Clock,
    Globe,
    Layers,
    Lock,
    Monitor,
    ShieldAlert,
    ShieldCheck,
    Smartphone,
    Sparkles,
    User as UserIcon,
    X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ActivityLogItem, ActivitySeverity } from '../types';
import {
    formatRoleLabel,
    getInitials,
    getOutcomeBadge,
    parseUserAgentSummary,
    VARIANT_TONE,
} from '../utils';

interface ActivityLogDetailModalProps {
    log: ActivityLogItem | null;
    onClose: () => void;
}

const DARK_HERO_SEVERITY_PILL: Record<ActivitySeverity, { pill: string; dot: string }> = {
    info: {
        pill: 'border-sky-400/25 bg-sky-400/15 text-sky-200',
        dot: 'bg-sky-300',
    },
    warning: {
        pill: 'border-amber-400/30 bg-amber-400/15 text-amber-200',
        dot: 'bg-amber-300',
    },
    critical: {
        pill: 'border-rose-400/30 bg-rose-500/20 text-rose-200',
        dot: 'bg-rose-400',
    },
};

const DARK_HERO_OUTCOME_PILL: Record<StatusTone, string> = {
    success: 'border-emerald-400/25 bg-emerald-400/15 text-emerald-200',
    warning: 'border-amber-400/30 bg-amber-400/15 text-amber-200',
    danger: 'border-rose-400/30 bg-rose-500/20 text-rose-200',
    info: 'border-sky-400/25 bg-sky-400/15 text-sky-200',
    violet: 'border-brand-400/30 bg-brand-400/20 text-brand-200',
    lime: 'border-lime-400/30 bg-lime-400/20 text-lime-200',
    neutral: 'border-white/15 bg-white/10 text-white/80',
};

const DARK_HERO_ICON_STYLE: Record<ActivitySeverity, string> = {
    info: 'border-lime-400/30 bg-lime-400/15 text-lime-300',
    warning: 'border-amber-400/30 bg-amber-400/15 text-amber-300',
    critical: 'border-rose-400/30 bg-rose-500/20 text-rose-300',
};

export default function ActivityLogDetailModal({ log, onClose }: ActivityLogDetailModalProps) {
    const [displayLog, setDisplayLog] = useState<ActivityLogItem | null>(log);

    useEffect(() => {
        if (log !== null) {
            setDisplayLog(log);
        }
    }, [log]);

    const activeLog = log ?? displayLog;
    const outcome = getOutcomeBadge(activeLog?.status_code ?? null);
    const device = parseUserAgentSummary(activeLog?.user_agent ?? null);

    const heroGlowClass =
        activeLog?.severity === 'critical'
            ? 'bg-rose-500/25'
            : activeLog?.severity === 'warning'
              ? 'bg-amber-400/20'
              : 'bg-brand-500/25';

    const severityStyle = activeLog ? DARK_HERO_SEVERITY_PILL[activeLog.severity] : DARK_HERO_SEVERITY_PILL.info;
    const heroIconClass = activeLog ? DARK_HERO_ICON_STYLE[activeLog.severity] : DARK_HERO_ICON_STYLE.info;
    const ipDisplay = activeLog?.ip_address || '-';

    return (
        <Modal
            show={log !== null}
            onClose={onClose}
            maxWidth="xl"
            panelClassName="overflow-hidden rounded-[28px] border border-white/80 dark:border-white/10"
            ariaLabelledBy="activity-log-detail-title"
        >
            {activeLog && (
                <div className="flex flex-col bg-[#F7F7FB] dark:bg-[#0F0E17]">
                    {/* Signature Neo-Bento Dark Hero Header */}
                    <div className="relative overflow-hidden bg-[#15131F] px-5 pb-5 pt-5 text-white sm:px-6 sm:pb-6">
                        <div
                            aria-hidden
                            className={`pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full blur-3xl ${heroGlowClass}`}
                        />
                        <div
                            aria-hidden
                            className="pointer-events-none absolute -bottom-16 -left-10 h-36 w-36 rounded-full bg-lime-400/10 blur-3xl"
                        />

                        <div className="relative flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3.5">
                                <div
                                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border shadow-sm ${heroIconClass}`}
                                >
                                    {activeLog.severity === 'info' ? (
                                        <ShieldCheck className="h-5 w-5" />
                                    ) : (
                                        <ShieldAlert className="h-5 w-5" />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3
                                            id="activity-log-detail-title"
                                            className="text-[16px] font-extrabold tracking-tight text-white"
                                        >
                                            Detail Aktivitas
                                        </h3>
                                        <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 font-mono text-[10px] font-bold text-white/80">
                                            #{activeLog.id}
                                        </span>
                                    </div>
                                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                        <span
                                            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[9.5px] font-extrabold leading-none ${severityStyle.pill}`}
                                        >
                                            <span className={`h-1.5 w-1.5 rounded-full ${severityStyle.dot}`} />
                                            {activeLog.severity_label}
                                        </span>
                                        <span
                                            className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[9.5px] font-extrabold leading-none ${DARK_HERO_OUTCOME_PILL[outcome.tone]}`}
                                        >
                                            {outcome.label}
                                        </span>
                                        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-white/10 bg-white/[0.08] px-2.5 py-0.5 text-[9.5px] font-extrabold leading-none text-lime-300">
                                            <Sparkles className="h-2.5 w-2.5" />
                                            {activeLog.action_label}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Tutup detail aktivitas"
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/80"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Ringkasan Aktivitas */}
                        <div className="relative mt-4 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3.5 backdrop-blur-md">
                            <p className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-white/65">
                                Ringkasan Aktivitas
                            </p>
                            <p className="mt-1 break-words text-[13.5px] font-bold leading-relaxed text-white">
                                {activeLog.description}
                            </p>
                        </div>
                    </div>

                    {/* Neo-Bento 2x2 Cards Body */}
                    <div className="p-4 sm:p-5">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {/* Kartu 1: Pelaku / Pengguna */}
                            <div className="relative overflow-hidden rounded-[22px] border border-white bg-white p-4 shadow-card dark:border-white/10 dark:bg-[#15131F]">
                                <div
                                    aria-hidden
                                    className="pointer-events-none absolute -right-6 -top-8 h-20 w-20 rounded-full bg-pastel-mint/70 blur-2xl dark:bg-mint/10"
                                />
                                <div className="relative flex items-center gap-2 text-[9.5px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                                    <UserIcon className="h-3.5 w-3.5 text-emerald-500" />
                                    <span>Pelaku / Pengguna</span>
                                </div>
                                <div className="relative mt-3 flex items-center gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-[12px] font-extrabold text-lime-300 shadow-sm dark:bg-brand-500/20 dark:text-brand-200">
                                        {getInitials(activeLog.actor_name)}
                                    </div>
                                    <div className="min-w-0">
                                        <p
                                            className="truncate text-[13px] font-extrabold text-slate-900 dark:text-white"
                                            title={activeLog.actor_name}
                                        >
                                            {activeLog.actor_name}
                                        </p>
                                        <p
                                            className="mt-0.5 truncate text-[11px] font-semibold text-slate-500 dark:text-slate-400"
                                            title={activeLog.actor_username ? `@${activeLog.actor_username}` : undefined}
                                        >
                                            {activeLog.actor_username ? `@${activeLog.actor_username}` : 'Tanpa username'}
                                        </p>
                                    </div>
                                </div>
                                <div className="relative mt-3">
                                    <StatusBadge tone="violet" dot={false}>
                                        {formatRoleLabel(activeLog.actor_role)}
                                    </StatusBadge>
                                </div>
                            </div>

                            {/* Kartu 2: Waktu Kejadian */}
                            <div className="relative overflow-hidden rounded-[22px] border border-white bg-white p-4 shadow-card dark:border-white/10 dark:bg-[#15131F]">
                                <div
                                    aria-hidden
                                    className="pointer-events-none absolute -right-6 -top-8 h-20 w-20 rounded-full bg-pastel-lavender/80 blur-2xl dark:bg-brand-500/15"
                                />
                                <div className="relative flex items-start justify-between gap-2">
                                    <span className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                                        Waktu Kejadian
                                    </span>
                                    <IconTile tone="violet" size="sm">
                                        <Clock />
                                    </IconTile>
                                </div>
                                <p className="text-sikas-num relative mt-2.5 text-[14px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                    {activeLog.created_at_formatted || '-'}
                                </p>
                                <p className="relative mt-1 text-[11.5px] font-semibold text-slate-500 dark:text-slate-400">
                                    {activeLog.created_at_human || 'Waktu tercatat otomatis'}
                                </p>
                            </div>

                            {/* Kartu 3: Modul & Varian BOSP */}
                            <div className="relative overflow-hidden rounded-[22px] border border-white bg-white p-4 shadow-card dark:border-white/10 dark:bg-[#15131F]">
                                <div
                                    aria-hidden
                                    className="pointer-events-none absolute -right-6 -top-8 h-20 w-20 rounded-full bg-pastel-sky/80 blur-2xl dark:bg-sky/15"
                                />
                                <div className="relative flex items-start justify-between gap-2">
                                    <span className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                                        Modul &amp; Varian BOSP
                                    </span>
                                    <IconTile tone="sky" size="sm">
                                        <Layers />
                                    </IconTile>
                                </div>
                                <p
                                    className="relative mt-2.5 truncate text-[13.5px] font-extrabold text-slate-900 dark:text-white"
                                    title={activeLog.module_label}
                                >
                                    {activeLog.module_label}
                                </p>
                                <div className="relative mt-2">
                                    {activeLog.variant_label ? (
                                        <StatusBadge
                                            tone={(activeLog.variant && VARIANT_TONE[activeLog.variant]) || 'neutral'}
                                            dot={false}
                                        >
                                            {activeLog.variant_label}
                                        </StatusBadge>
                                    ) : (
                                        <StatusBadge tone="neutral" dot={false}>
                                            Global / Sistem
                                        </StatusBadge>
                                    )}
                                </div>
                            </div>

                            {/* Kartu 4: Perangkat & Lokasi Akses */}
                            <div className="relative overflow-hidden rounded-[22px] border border-white bg-white p-4 shadow-card dark:border-white/10 dark:bg-[#15131F]">
                                <div
                                    aria-hidden
                                    className="pointer-events-none absolute -right-6 -top-8 h-20 w-20 rounded-full bg-pastel-amber/80 blur-2xl dark:bg-amber-400/15"
                                />
                                <div className="relative flex items-start justify-between gap-2">
                                    <span className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                                        Perangkat &amp; Akses
                                    </span>
                                    <IconTile tone="mint" size="sm">
                                        {device.isMobile ? <Smartphone /> : <Monitor />}
                                    </IconTile>
                                </div>
                                <p
                                    className="relative mt-2.5 truncate text-[13.5px] font-extrabold text-slate-900 dark:text-white"
                                    title={device.summary}
                                >
                                    {device.summary}
                                </p>
                                <div
                                    className="relative mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10.5px] font-bold text-slate-600 dark:bg-white/[0.06] dark:text-slate-300"
                                    title={`IP ${ipDisplay}`}
                                >
                                    <Globe className="h-3 w-3 shrink-0 text-slate-400" />
                                    <span className="truncate font-mono">IP {ipDisplay}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Pill Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/70 bg-white/80 px-5 py-3.5 backdrop-blur-md sm:px-6 dark:border-white/10 dark:bg-[#15131F]/90">
                        <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            <Lock className="h-3.5 w-3.5 text-brand-500 dark:text-lime-400" />
                            <span>Jejak audit terlindungi &amp; tidak dapat diubah</span>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-2 text-[12px] font-extrabold text-lime-300 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 dark:bg-lime-400 dark:text-slate-950 dark:hover:bg-lime-300 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
}
