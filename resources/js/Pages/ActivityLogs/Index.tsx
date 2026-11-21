import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import StatCard from '@/Components/StatCard';
import IconTile from '@/Components/ui/IconTile';
import PageHeader from '@/Components/ui/PageHeader';
import StatusBadge from '@/Components/ui/StatusBadge';
import Surface from '@/Components/ui/Surface';
import type { PageProps } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import {
    Activity,
    AlertTriangle,
    Calendar,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Download,
    Eye,
    Filter,
    History,
    RotateCcw,
    Search,
    ShieldAlert,
    Sparkles,
    Trash2,
    Users,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import ActivityLogDetailModal from './Partials/ActivityLogDetailModal';
import ActivityLogPruneModal from './Partials/ActivityLogPruneModal';
import type {
    ActivityLogFilterOptions,
    ActivityLogFilters,
    ActivityLogItem,
    ActivityLogStats,
    PaginatedActivityLogs,
} from './types';
import { formatRoleLabel, getInitials, getStatusTone, SEVERITY_TONE, VARIANT_TONE } from './utils';

interface ActivityLogsPageProps {
    logs: PaginatedActivityLogs;
    filters: ActivityLogFilters;
    stats: ActivityLogStats;
    filterOptions: ActivityLogFilterOptions;
    canPrune: boolean;
}

function buildQueryParams(filters: ActivityLogFilters): Record<string, string | number> {
    const params: Record<string, string | number> = {};
    if (filters.search.trim()) params.search = filters.search.trim();
    if (filters.user_id) params.user_id = filters.user_id;
    if (filters.module) params.module = filters.module;
    if (filters.variant) params.variant = filters.variant;
    if (filters.action) params.action = filters.action;
    if (filters.severity) params.severity = filters.severity;
    if (filters.date_from) params.date_from = filters.date_from;
    if (filters.date_to) params.date_to = filters.date_to;
    if (filters.per_page && filters.per_page !== 25) params.per_page = filters.per_page;
    return params;
}

export default function ActivityLogsIndex({
    logs,
    filters,
    stats,
    filterOptions,
    canPrune,
}: ActivityLogsPageProps) {
    const { props } = usePage<PageProps<{ flash?: { success?: string; error?: string } }>>();
    const flash = props.flash;

    const [draftFilters, setDraftFilters] = useState<ActivityLogFilters>(filters);
    const [selectedLog, setSelectedLog] = useState<ActivityLogItem | null>(null);
    const [showPruneModal, setShowPruneModal] = useState(false);

    useEffect(() => {
        setDraftFilters(filters);
    }, [filters]);

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (filters.search) count++;
        if (filters.user_id) count++;
        if (filters.module) count++;
        if (filters.variant) count++;
        if (filters.action) count++;
        if (filters.severity) count++;
        if (filters.date_from) count++;
        if (filters.date_to) count++;
        return count;
    }, [filters]);

    const applyFilters = (next: ActivityLogFilters) => {
        router.get(route('activity-logs.index'), buildQueryParams(next), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handleSearchSubmit = (e: FormEvent) => {
        e.preventDefault();
        applyFilters(draftFilters);
    };

    const handleSelectChange = <K extends keyof ActivityLogFilters>(
        key: K,
        value: ActivityLogFilters[K],
    ) => {
        const next = { ...draftFilters, [key]: value };
        setDraftFilters(next);
        applyFilters(next);
    };

    const handleResetFilters = () => {
        const cleared: ActivityLogFilters = {
            search: '',
            user_id: '',
            module: '',
            variant: '',
            action: '',
            severity: '',
            date_from: '',
            date_to: '',
            per_page: 25,
        };
        setDraftFilters(cleared);
        applyFilters(cleared);
    };

    const exportHref = useMemo(() => {
        const params = buildQueryParams(filters);
        delete params.per_page;
        return route('activity-logs.export', params);
    }, [filters]);

    const todayRatio = stats.total > 0 ? Math.min(100, Math.max(8, Math.round((stats.today / stats.total) * 100))) : 0;
    const criticalRatio =
        stats.total > 0
            ? Math.min(100, Math.max(stats.critical_or_security > 0 ? 12 : 0, Math.round((stats.critical_or_security / stats.total) * 100)))
            : 0;

    return (
        <AuthenticatedLayout>
            <Head title="Log Aktivitas (Audit Trail)" />

            <div className="space-y-5">
                <PageHeader
                    className="animate-rise"
                    breadcrumb={[{ label: 'Sistem' }, { label: 'Log Aktivitas' }]}
                    icon={
                        <IconTile tone="violet" size="lg">
                            <History />
                        </IconTile>
                    }
                    title="Log Aktivitas Pengguna"
                    subtitle="Rekam jejak audit aktivitas pengguna lintas modul dan 4 varian BOSP secara kronologis & immutable."
                    badge={
                        <StatusBadge tone="lime" dot={false}>
                            <Sparkles className="h-3 w-3" />
                            Audit Trail
                        </StatusBadge>
                    }
                    actions={
                        <>
                            <a
                                href={exportHref}
                                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/90 bg-white px-3.5 py-2 text-[12px] font-extrabold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:text-brand-700 dark:border-white/10 dark:bg-[#15131F] dark:text-slate-200 dark:hover:border-brand-500/40 dark:hover:text-white"
                            >
                                <Download className="h-3.5 w-3.5 text-emerald-500" />
                                Ekspor CSV
                            </a>

                            {canPrune && (
                                <button
                                    type="button"
                                    onClick={() => setShowPruneModal(true)}
                                    className="inline-flex items-center gap-2 rounded-2xl border border-rose-200/90 bg-rose-50/90 px-3.5 py-2 text-[12px] font-extrabold text-rose-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Bersihkan Log Lama
                                </button>
                            )}
                        </>
                    }
                />

                {/* Flash Feedback */}
                {flash?.success && (
                    <div className="animate-rise flex items-center gap-2.5 rounded-2xl border border-emerald-200/90 bg-emerald-50/90 px-4 py-3 text-[12px] font-bold text-emerald-800 shadow-sm dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span>{flash.success}</span>
                    </div>
                )}

                {flash?.error && (
                    <div className="animate-rise flex items-center gap-2.5 rounded-2xl border border-rose-200/90 bg-rose-50/90 px-4 py-3 text-[12px] font-bold text-rose-800 shadow-sm dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                        <span>{flash.error}</span>
                    </div>
                )}

                {/* 4 Kartu KPI Neo-Bento */}
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="animate-rise" style={{ animationDelay: '0ms' }}>
                        <StatCard
                            tone="violet"
                            title="TOTAL LOG TERCATAT"
                            value={stats.total.toLocaleString('id-ID')}
                            description="Seluruh jejak aktivitas tersimpan"
                            trend={{ value: 'Immutable', isPositive: true }}
                            progress={stats.total > 0 ? 100 : 0}
                            progressLabel="Aktif"
                            icon={<History />}
                        />
                    </div>
                    <div className="animate-rise" style={{ animationDelay: '60ms' }}>
                        <StatCard
                            tone="mint"
                            title="AKTIVITAS HARI INI"
                            value={stats.today.toLocaleString('id-ID')}
                            description="Mutasi & autentikasi tercatat hari ini"
                            trend={{
                                value: stats.today > 0 ? 'Live' : 'Tenang',
                                isPositive: true,
                            }}
                            progress={todayRatio}
                            progressLabel={`${stats.today} entri`}
                            icon={<Activity />}
                        />
                    </div>
                    <div className="animate-rise" style={{ animationDelay: '120ms' }}>
                        <StatCard
                            tone="rose"
                            title="KRITIS & KEAMANAN (30 HR)"
                            value={stats.critical_or_security.toLocaleString('id-ID')}
                            description="Gagal login, 403, restore, reset & prune"
                            trend={{
                                value: stats.critical_or_security > 0 ? 'Perlu Pantau' : 'Aman',
                                isPositive: stats.critical_or_security === 0,
                            }}
                            progress={criticalRatio}
                            progressLabel="30 hari"
                            icon={<ShieldAlert />}
                        />
                    </div>
                    <div className="animate-rise" style={{ animationDelay: '180ms' }}>
                        <StatCard
                            tone="sky"
                            title="PENGGUNA AKTIF (7 HR)"
                            value={stats.active_users_7d.toLocaleString('id-ID')}
                            description="Akun unik yang beraktivitas 7 hari terakhir"
                            trend={{ value: 'Kolaborasi', isPositive: true }}
                            progress={Math.min(100, Math.max(stats.active_users_7d > 0 ? 25 : 0, stats.active_users_7d * 25))}
                            progressLabel={`${stats.active_users_7d} akun`}
                            icon={<Users />}
                        />
                    </div>
                </div>

                {/* Floating Glass Filter Dock */}
                <form
                    onSubmit={handleSearchSubmit}
                    className="animate-rise space-y-3 rounded-[24px] border border-white/80 bg-white/85 p-3.5 shadow-nav ring-1 ring-slate-900/[0.03] backdrop-blur-xl sm:p-4 dark:border-white/10 dark:bg-[#15131F]/85"
                    style={{ animationDelay: '220ms' }}
                >
                    <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
                        <div className="relative flex-1">
                            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                aria-label="Cari log aktivitas"
                                value={draftFilters.search}
                                onChange={(e) => setDraftFilters((prev) => ({ ...prev, search: e.target.value }))}
                                placeholder="Cari deskripsi aktivitas, nama pengguna, username, route, atau alamat IP..."
                                className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/70 py-2.5 pl-10 pr-4 text-[12px] font-semibold text-slate-800 placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-400/20 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-white/[0.06]"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="submit"
                                className="inline-flex items-center gap-1.5 rounded-2xl bg-slate-900 px-4 py-2.5 text-[12px] font-extrabold text-lime-300 shadow-sm transition hover:bg-slate-800 dark:bg-lime-400 dark:text-slate-950 dark:hover:bg-lime-300"
                            >
                                <Filter className="h-3.5 w-3.5" />
                                Terapkan
                                {activeFilterCount > 0 && (
                                    <span className="ml-0.5 rounded-full bg-lime-400 px-1.5 py-0.5 text-[9.5px] font-extrabold text-slate-950 dark:bg-slate-950 dark:text-lime-300">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </button>

                            {activeFilterCount > 0 && (
                                <button
                                    type="button"
                                    onClick={handleResetFilters}
                                    className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-[12px] font-bold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                                >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    Reset
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                        <FilterSelect
                            id="activity-filter-user"
                            label="Pengguna"
                            value={draftFilters.user_id}
                            onChange={(val) => handleSelectChange('user_id', val)}
                            placeholder="Semua Pengguna"
                            options={filterOptions.users.map((u) => ({
                                value: String(u.id),
                                label: u.username ? `${u.name} (@${u.username})` : u.name,
                            }))}
                        />
                        <FilterSelect
                            id="activity-filter-module"
                            label="Modul"
                            value={draftFilters.module}
                            onChange={(val) => handleSelectChange('module', val)}
                            placeholder="Semua Modul"
                            options={filterOptions.modules}
                        />
                        <FilterSelect
                            id="activity-filter-variant"
                            label="Varian BOSP"
                            value={draftFilters.variant}
                            onChange={(val) => handleSelectChange('variant', val)}
                            placeholder="Semua Varian"
                            options={filterOptions.variants}
                        />
                        <FilterSelect
                            id="activity-filter-action"
                            label="Jenis Aksi"
                            value={draftFilters.action}
                            onChange={(val) => handleSelectChange('action', val)}
                            placeholder="Semua Aksi"
                            options={filterOptions.actions}
                        />
                        <FilterSelect
                            id="activity-filter-severity"
                            label="Tingkat"
                            value={draftFilters.severity}
                            onChange={(val) => handleSelectChange('severity', val)}
                            placeholder="Semua Tingkat"
                            options={filterOptions.severities}
                        />
                        <div>
                            <label
                                htmlFor="activity-filter-date-from"
                                className="mb-1 flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500"
                            >
                                <Calendar className="h-3 w-3" />
                                Dari Tanggal
                            </label>
                            <input
                                id="activity-filter-date-from"
                                type="date"
                                value={draftFilters.date_from}
                                onChange={(e) => handleSelectChange('date_from', e.target.value)}
                                className="w-full rounded-xl border border-slate-200/80 bg-white px-2.5 py-2 text-[11.5px] font-semibold text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 dark:border-white/10 dark:bg-[#1E1D2E] dark:text-slate-200"
                            />
                        </div>
                        <div>
                            <label
                                htmlFor="activity-filter-date-to"
                                className="mb-1 flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500"
                            >
                                <Calendar className="h-3 w-3" />
                                Sampai Tanggal
                            </label>
                            <input
                                id="activity-filter-date-to"
                                type="date"
                                value={draftFilters.date_to}
                                onChange={(e) => handleSelectChange('date_to', e.target.value)}
                                className="w-full rounded-xl border border-slate-200/80 bg-white px-2.5 py-2 text-[11.5px] font-semibold text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 dark:border-white/10 dark:bg-[#1E1D2E] dark:text-slate-200"
                            />
                        </div>
                    </div>
                </form>

                {/* Tabel Audit Trail */}
                <Surface
                    className="animate-rise"
                    title="Riwayat Aktivitas Kronologis"
                    subtitle={
                        logs.total > 0
                            ? `Menampilkan ${logs.from ?? 0}–${logs.to ?? 0} dari ${logs.total.toLocaleString('id-ID')} entri`
                            : 'Belum ada entri yang cocok dengan filter aktif'
                    }
                    icon={
                        <IconTile tone="ink" size="md">
                            <History />
                        </IconTile>
                    }
                    actions={
                        <div className="flex items-center gap-2">
                            <span className="text-[10.5px] font-bold text-slate-400 dark:text-slate-500">
                                Baris/Hal:
                            </span>
                            <select
                                aria-label="Jumlah baris per halaman"
                                value={draftFilters.per_page}
                                onChange={(e) => handleSelectChange('per_page', Number(e.target.value))}
                                className="rounded-xl border border-slate-200/80 bg-white px-2.5 py-1.5 text-[11.5px] font-bold text-slate-700 focus:border-brand-400 focus:outline-none dark:border-white/10 dark:bg-[#1E1D2E] dark:text-slate-200"
                            >
                                <option value={15}>15</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                            </select>
                        </div>
                    }
                    padding="md"
                >
                    {logs.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200/90 bg-slate-50/60 px-6 py-14 text-center dark:border-white/10 dark:bg-white/[0.02]">
                            <IconTile tone="violet" size="lg">
                                <History />
                            </IconTile>
                            <p className="mt-3 text-[14px] font-extrabold text-slate-800 dark:text-white">
                                Tidak ada log aktivitas ditemukan
                            </p>
                            <p className="mt-1 max-w-md text-[12px] font-medium text-slate-500 dark:text-slate-400">
                                {activeFilterCount > 0
                                    ? 'Coba ubah atau reset filter pencarian Anda untuk melihat riwayat aktivitas lainnya.'
                                    : 'Aktivitas login, perubahan RKAS/BKU, persetujuan, backup, dan manajemen role akan tercatat otomatis di sini.'}
                            </p>
                            {activeFilterCount > 0 && (
                                <button
                                    type="button"
                                    onClick={handleResetFilters}
                                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-[12px] font-extrabold text-lime-300 transition hover:bg-slate-800 dark:bg-lime-400 dark:text-slate-950"
                                >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    Reset Semua Filter
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="sikas-scroll overflow-x-auto">
                                <table className="w-full min-w-[860px] border-separate border-spacing-y-1.5 text-left">
                                    <thead>
                                        <tr className="text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                                            <th className="px-3 py-2">Waktu</th>
                                            <th className="px-3 py-2">Pengguna</th>
                                            <th className="px-3 py-2">Modul &amp; Varian</th>
                                            <th className="px-3 py-2">Aktivitas</th>
                                            <th className="px-3 py-2">IP &amp; Status</th>
                                            <th className="px-3 py-2 text-right">Inspeksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {logs.data.map((item) => {
                                            const statusTone = getStatusTone(item.status_code);

                                            return (
                                                <tr
                                                    key={item.id}
                                                    onClick={() => setSelectedLog(item)}
                                                    className="group cursor-pointer rounded-2xl bg-slate-50/70 transition hover:bg-brand-50/50 dark:bg-white/[0.025] dark:hover:bg-white/[0.06]"
                                                >
                                                    <td className="rounded-l-2xl px-3 py-3 align-top">
                                                        <p className="text-sikas-num whitespace-nowrap text-[11.5px] font-extrabold text-slate-800 dark:text-slate-100">
                                                            {item.created_at_formatted || '-'}
                                                        </p>
                                                        <p className="mt-0.5 whitespace-nowrap text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                                                            {item.created_at_human || ''}
                                                        </p>
                                                    </td>

                                                    <td className="px-3 py-3 align-top">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-[10.5px] font-extrabold text-lime-300 dark:bg-brand-500/20 dark:text-brand-200">
                                                                {getInitials(item.actor_name)}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="max-w-[160px] truncate text-[12px] font-extrabold text-slate-900 dark:text-white">
                                                                    {item.actor_name}
                                                                </p>
                                                                <p className="max-w-[160px] truncate text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                                                                    {formatRoleLabel(item.actor_role)}
                                                                    {item.actor_username ? ` · @${item.actor_username}` : ''}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="px-3 py-3 align-top">
                                                        <div className="flex flex-col items-start gap-1">
                                                            <span className="text-[11.5px] font-extrabold text-slate-700 dark:text-slate-200">
                                                                {item.module_label}
                                                            </span>
                                                            {item.variant_label ? (
                                                                <StatusBadge
                                                                    tone={
                                                                        (item.variant && VARIANT_TONE[item.variant]) ||
                                                                        'neutral'
                                                                    }
                                                                    dot={false}
                                                                >
                                                                    {item.variant_label}
                                                                </StatusBadge>
                                                            ) : (
                                                                <StatusBadge tone="neutral" dot={false}>
                                                                    Global / Sistem
                                                                </StatusBadge>
                                                            )}
                                                        </div>
                                                    </td>

                                                    <td className="px-3 py-3 align-top">
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            <StatusBadge tone={SEVERITY_TONE[item.severity]}>
                                                                {item.severity_label}
                                                            </StatusBadge>
                                                            <span className="rounded-lg bg-white/90 px-2 py-0.5 text-[10px] font-extrabold text-slate-600 ring-1 ring-slate-200/80 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10">
                                                                {item.action_label}
                                                            </span>
                                                        </div>
                                                        <p className="mt-1.5 max-w-[360px] text-[12px] font-semibold leading-snug text-slate-700 dark:text-slate-200">
                                                            {item.description}
                                                        </p>
                                                    </td>

                                                    <td className="px-3 py-3 align-top">
                                                        <p className="font-mono text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                                            {item.ip_address || '-'}
                                                        </p>
                                                        <div className="mt-1 flex items-center gap-1.5">
                                                            {item.http_method && (
                                                                <span className="font-mono text-[9.5px] font-extrabold uppercase text-slate-400 dark:text-slate-500">
                                                                    {item.http_method}
                                                                </span>
                                                            )}
                                                            {item.status_code !== null && (
                                                                <StatusBadge tone={statusTone} dot={false}>
                                                                    {item.status_code}
                                                                </StatusBadge>
                                                            )}
                                                        </div>
                                                    </td>

                                                    <td className="rounded-r-2xl px-3 py-3 text-right align-top">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedLog(item);
                                                            }}
                                                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-2.5 py-1.5 text-[11px] font-extrabold text-slate-700 shadow-sm transition group-hover:border-brand-300 group-hover:text-brand-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:group-hover:border-brand-400/40 dark:group-hover:text-white"
                                                        >
                                                            <Eye className="h-3.5 w-3.5" />
                                                            Detail
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Dock */}
                            {logs.last_page > 1 && (
                                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-white/10">
                                    <p className="text-[11.5px] font-semibold text-slate-500 dark:text-slate-400">
                                        Halaman <strong className="text-slate-800 dark:text-white">{logs.current_page}</strong> dari{' '}
                                        <strong className="text-slate-800 dark:text-white">{logs.last_page}</strong>
                                    </p>

                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <button
                                            type="button"
                                            disabled={!logs.prev_page_url}
                                            onClick={() =>
                                                logs.prev_page_url &&
                                                router.get(logs.prev_page_url, {}, { preserveState: true, preserveScroll: true })
                                            }
                                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200/90 bg-white px-3 py-1.5 text-[11.5px] font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                                        >
                                            <ChevronLeft className="h-3.5 w-3.5" />
                                            Sebelumnya
                                        </button>

                                        {logs.links
                                            .slice(1, -1)
                                            .map((link, idx) => (
                                                <button
                                                    key={`${link.label}-${idx}`}
                                                    type="button"
                                                    disabled={!link.url || link.active}
                                                    onClick={() =>
                                                        link.url &&
                                                        router.get(link.url, {}, { preserveState: true, preserveScroll: true })
                                                    }
                                                    className={`min-w-[32px] rounded-xl px-2.5 py-1.5 text-[11.5px] font-extrabold transition ${
                                                        link.active
                                                            ? 'bg-slate-900 text-lime-300 shadow-sm dark:bg-lime-400 dark:text-slate-950'
                                                            : link.url
                                                              ? 'border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                                                              : 'text-slate-400 dark:text-slate-600'
                                                    }`}
                                                >
                                                    {link.label}
                                                </button>
                                            ))}

                                        <button
                                            type="button"
                                            disabled={!logs.next_page_url}
                                            onClick={() =>
                                                logs.next_page_url &&
                                                router.get(logs.next_page_url, {}, { preserveState: true, preserveScroll: true })
                                            }
                                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200/90 bg-white px-3 py-1.5 text-[11.5px] font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                                        >
                                            Berikutnya
                                            <ChevronRight className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </Surface>
            </div>

            <ActivityLogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
            <ActivityLogPruneModal show={showPruneModal} onClose={() => setShowPruneModal(false)} />
        </AuthenticatedLayout>
    );
}

function FilterSelect({
    id,
    label,
    value,
    onChange,
    placeholder,
    options,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    options: Array<{ value: string; label: string }>;
}) {
    return (
        <div>
            <label
                htmlFor={id}
                className="mb-1 block text-[9.5px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500"
            >
                {label}
            </label>
            <select
                id={id}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full rounded-xl border border-slate-200/80 bg-white px-2.5 py-2 text-[11.5px] font-semibold text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 dark:border-white/10 dark:bg-[#1E1D2E] dark:text-slate-200"
            >
                <option value="">{placeholder}</option>
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
    );
}
