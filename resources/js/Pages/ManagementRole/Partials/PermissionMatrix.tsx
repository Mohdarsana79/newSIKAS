import IconTile, { IconTileTone } from '@/Components/ui/IconTile';
import StatusBadge from '@/Components/ui/StatusBadge';
import type { ModulePermissionLevel, PermissionMatrixData } from '@/types';
import {
    Ban,
    CheckCircle2,
    Database,
    Eye,
    FileText,
    Layers,
    Lock,
    Settings,
    ShieldCheck,
    Sparkles,
} from 'lucide-react';
import type { PermissionCatalog, PermissionModuleMeta } from '../types';

interface PermissionMatrixProps {
    catalog: PermissionCatalog;
    value: PermissionMatrixData;
    onChange: (next: PermissionMatrixData) => void;
    lockAdminModule?: boolean;
    disabled?: boolean;
}

const GROUP_STYLES: Record<string, { tone: IconTileTone; icon: typeof Layers; subtitle: string }> = {
    'Menu Utama': {
        tone: 'violet',
        icon: Layers,
        subtitle: 'Modul inti operasional anggaran, BKU, STS, dan referensi ARKAS.',
    },
    'Data Master': {
        tone: 'mint',
        icon: Database,
        subtitle: 'Identitas sekolah, kop surat, master kegiatan, dan rekening belanja.',
    },
    'Fitur Pelengkap': {
        tone: 'peach',
        icon: FileText,
        subtitle: 'Dokumen SPJ, kwitansi, BAST, surat pesanan, SK, dan laporan.',
    },
    'Integrasi & Sistem': {
        tone: 'sky',
        icon: Settings,
        subtitle: 'Koneksi database ARKAS, backup, pengaturan jaringan, dan sistem.',
    },
};

export default function PermissionMatrix({
    catalog,
    value,
    onChange,
    lockAdminModule = false,
    disabled = false,
}: PermissionMatrixProps) {
    const groupedModules = catalog.modules.reduce<Record<string, PermissionModuleMeta[]>>((acc, mod) => {
        if (!acc[mod.group]) {
            acc[mod.group] = [];
        }
        acc[mod.group].push(mod);
        return acc;
    }, {});

    const setModuleLevel = (key: string, level: ModulePermissionLevel) => {
        if (disabled) return;
        if (lockAdminModule && key === 'user_management') return;

        onChange({
            ...value,
            modules: {
                ...value.modules,
                [key]: level,
            },
        });
    };

    const toggleAbility = (key: string) => {
        if (disabled) return;
        onChange({
            ...value,
            abilities: {
                ...value.abilities,
                [key]: !value.abilities[key],
            },
        });
    };

    const applyPreset = (mode: 'none' | 'read' | 'write') => {
        if (disabled) return;
        const nextModules: Record<string, ModulePermissionLevel> = { ...value.modules };
        for (const mod of catalog.modules) {
            if (lockAdminModule && mod.key === 'user_management') {
                nextModules[mod.key] = 'write';
                continue;
            }
            if (mode === 'write') {
                nextModules[mod.key] = mod.supports_write ? 'write' : 'read';
            } else {
                nextModules[mod.key] = mode;
            }
        }
        onChange({
            ...value,
            modules: nextModules,
        });
    };

    const applyGroupPreset = (mods: PermissionModuleMeta[], mode: 'none' | 'read' | 'write') => {
        if (disabled) return;
        const nextModules: Record<string, ModulePermissionLevel> = { ...value.modules };
        for (const mod of mods) {
            if (lockAdminModule && mod.key === 'user_management') {
                nextModules[mod.key] = 'write';
                continue;
            }
            nextModules[mod.key] = mode === 'write' && !mod.supports_write ? 'read' : mode;
        }
        onChange({
            ...value,
            modules: nextModules,
        });
    };

    const writeCount = catalog.modules.filter((m) => value.modules[m.key] === 'write').length;
    const readCount = catalog.modules.filter((m) => value.modules[m.key] === 'read').length;
    const noneCount = catalog.modules.length - writeCount - readCount;

    return (
        <div className="space-y-4">
            {/* Toolbar Ringkasan & Tombol Preset Cepat */}
            <div className="flex flex-col gap-3 rounded-[22px] border border-slate-100 bg-slate-50/80 p-3.5 sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-white/[0.03]">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-xl border border-lime-300/80 bg-lime-100/80 px-2.5 py-1 text-[10.5px] font-extrabold text-slate-900 dark:border-lime-400/30 dark:bg-lime-400/15 dark:text-lime-200">
                        <span className="h-2 w-2 rounded-full bg-lime-500" />
                        <span className="sikas-num">{writeCount}</span> Kelola Penuh
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-xl border border-sky/25 bg-pastel-sky/70 px-2.5 py-1 text-[10.5px] font-extrabold text-sky-800 dark:border-sky/30 dark:bg-sky/15 dark:text-sky-200">
                        <span className="h-2 w-2 rounded-full bg-sky-500" />
                        <span className="sikas-num">{readCount}</span> Lihat Saja
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-2.5 py-1 text-[10.5px] font-bold text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                        <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                        <span className="sikas-num">{noneCount}</span> Nonaktif
                    </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="mr-1 text-[10.5px] font-bold text-slate-400 dark:text-slate-500">
                        Setel Cepat:
                    </span>
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={() => applyPreset('write')}
                        className="inline-flex items-center gap-1 rounded-xl bg-lime-400 px-3 py-1.5 text-[10.5px] font-extrabold text-slate-950 shadow-sm transition hover:-translate-y-0.5 hover:bg-lime-300 disabled:opacity-50"
                    >
                        <Sparkles className="h-3 w-3" />
                        Semua Kelola
                    </button>
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={() => applyPreset('read')}
                        className="inline-flex items-center gap-1 rounded-xl border border-sky/30 bg-pastel-sky/80 px-3 py-1.5 text-[10.5px] font-extrabold text-sky-900 transition hover:-translate-y-0.5 hover:bg-pastel-sky disabled:opacity-50 dark:border-sky/30 dark:bg-sky/15 dark:text-sky-200"
                    >
                        <Eye className="h-3 w-3" />
                        Semua Lihat
                    </button>
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={() => applyPreset('none')}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[10.5px] font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                    >
                        <Ban className="h-3 w-3" />
                        Reset
                    </button>
                </div>
            </div>

            {/* Grid Kartu Bento per Kategori Sidebar */}
            <div className="space-y-4">
                {Object.entries(groupedModules).map(([groupName, mods]) => {
                    const meta = GROUP_STYLES[groupName] || {
                        tone: 'violet' as IconTileTone,
                        icon: Layers,
                        subtitle: 'Pengaturan hak akses modul aplikasi.',
                    };
                    const GroupIcon = meta.icon;
                    const activeInGroup = mods.filter((m) => (value.modules[m.key] || 'none') !== 'none').length;

                    return (
                        <div
                            key={groupName}
                            className="overflow-hidden rounded-[24px] border border-slate-100 bg-slate-50/40 p-4 dark:border-white/10 dark:bg-white/[0.015]"
                        >
                            {/* Header Grup */}
                            <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-3">
                                    <IconTile tone={meta.tone} size="sm">
                                        <GroupIcon />
                                    </IconTile>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-[12.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                                {groupName}
                                            </h4>
                                            <span className="sikas-num rounded-full bg-white px-2 py-0.5 text-[10px] font-extrabold text-slate-600 shadow-sm ring-1 ring-slate-900/5 dark:bg-white/10 dark:text-slate-300">
                                                {activeInGroup}/{mods.length} aktif
                                            </span>
                                        </div>
                                        <p className="text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                                            {meta.subtitle}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-1.5 text-[10.5px] font-extrabold">
                                    <button
                                        type="button"
                                        disabled={disabled}
                                        onClick={() => applyGroupPreset(mods, 'write')}
                                        className="rounded-xl border border-lime-300 bg-lime-100/80 px-2.5 py-1 text-slate-900 shadow-sm transition hover:bg-lime-200 disabled:opacity-50 dark:border-lime-400/30 dark:bg-lime-400/15 dark:text-lime-200"
                                    >
                                        Kelola Grup
                                    </button>
                                    <button
                                        type="button"
                                        disabled={disabled}
                                        onClick={() => applyGroupPreset(mods, 'read')}
                                        className="rounded-xl border border-sky-300 bg-sky-100/90 px-2.5 py-1 text-sky-900 shadow-sm transition hover:bg-sky-200/80 disabled:opacity-50 dark:border-sky-400/30 dark:bg-sky-500/15 dark:text-sky-200"
                                    >
                                        Lihat Grup
                                    </button>
                                    <button
                                        type="button"
                                        disabled={disabled}
                                        onClick={() => applyGroupPreset(mods, 'none')}
                                        className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-slate-600 shadow-sm transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                                    >
                                        Matikan
                                    </button>
                                </div>
                            </div>

                            {/* Grid 2 Kolom Modul */}
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                {mods.map((mod) => {
                                    const current = value.modules[mod.key] || 'none';
                                    const isLocked = lockAdminModule && mod.key === 'user_management';
                                    const options: ModulePermissionLevel[] = mod.supports_write
                                        ? ['none', 'read', 'write']
                                        : ['none', 'read'];

                                    const cardStyle =
                                        current === 'write'
                                            ? 'border-lime-300/90 bg-gradient-to-br from-white via-white to-lime-50/70 shadow-sm dark:border-lime-400/35 dark:from-[#181625] dark:via-[#181625] dark:to-lime-400/[0.07]'
                                            : current === 'read'
                                              ? 'border-sky/30 bg-gradient-to-br from-white via-white to-pastel-sky/40 shadow-sm dark:border-sky/30 dark:from-[#181625] dark:via-[#181625] dark:to-sky/[0.07]'
                                              : 'border-slate-200/70 bg-white/70 opacity-85 hover:opacity-100 dark:border-white/5 dark:bg-white/[0.02]';

                                    const dotColor =
                                        current === 'write'
                                            ? 'bg-lime-500 ring-4 ring-lime-400/20'
                                            : current === 'read'
                                              ? 'bg-sky-500 ring-4 ring-sky-400/20'
                                              : 'bg-slate-300 dark:bg-slate-600';

                                    return (
                                        <div
                                            key={mod.key}
                                            className={`flex flex-col justify-between gap-3 rounded-2xl border p-3.5 transition-all duration-200 ${cardStyle}`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className={`h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
                                                        <span className="text-[12.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                                            {mod.label}
                                                        </span>
                                                    </div>
                                                    <p className="mt-1 pl-4 text-[10.5px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                                                        {mod.description}
                                                    </p>
                                                </div>

                                                {isLocked && (
                                                    <StatusBadge tone="violet" dot={false} className="shrink-0">
                                                        <Lock className="h-3 w-3" /> Admin
                                                    </StatusBadge>
                                                )}
                                            </div>

                                            {/* Kontrol Segmen 3-Arah */}
                                            <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-slate-200/90 bg-slate-100/90 p-1.5 dark:border-white/10 dark:bg-slate-950/70">
                                                {options.map((opt) => {
                                                    const active = current === opt;
                                                    const spanClass = !mod.supports_write && opt === 'read' ? 'col-span-2' : '';

                                                    const activeClass =
                                                        opt === 'write'
                                                            ? 'border border-lime-500/50 bg-lime-400 text-slate-950 shadow-sm'
                                                            : opt === 'read'
                                                              ? 'border border-sky-700/40 bg-sky-600 text-white shadow-sm'
                                                              : 'border border-slate-900 bg-slate-800 text-white shadow-sm dark:border-slate-600 dark:bg-slate-700';

                                                    const inactiveClass =
                                                        'border border-slate-200/90 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white';

                                                    const label =
                                                        opt === 'write'
                                                            ? 'Kelola'
                                                            : opt === 'read'
                                                              ? mod.supports_write
                                                                  ? 'Lihat Saja'
                                                                  : 'Diizinkan'
                                                              : 'Nonaktif';

                                                    return (
                                                        <button
                                                            key={opt}
                                                            type="button"
                                                            disabled={disabled || isLocked}
                                                            onClick={() => setModuleLevel(mod.key, opt)}
                                                            className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-extrabold transition-all ${spanClass} ${
                                                                active ? activeClass : inactiveClass
                                                            } ${isLocked && !active ? 'opacity-40' : ''}`}
                                                        >
                                                            {opt === 'write' && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
                                                            {opt === 'read' && <Eye className="h-3.5 w-3.5 shrink-0" />}
                                                            {opt === 'none' && <Ban className="h-3.5 w-3.5 shrink-0" />}
                                                            <span className="truncate">{label}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Kartu Kewenangan Khusus RKAS dengan Switch Modern */}
            {catalog.abilities.length > 0 && (
                <div className="relative overflow-hidden rounded-[24px] border border-brand-200/80 bg-gradient-to-br from-pastel-lavender/60 via-white to-lime-50/40 p-4 dark:border-brand-500/25 dark:from-brand-500/10 dark:via-[#15131F] dark:to-lime-400/5">
                    <div className="mb-3 flex items-center gap-3">
                        <IconTile tone="violet" size="sm">
                            <ShieldCheck />
                        </IconTile>
                        <div>
                            <h4 className="text-[12.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                Kewenangan Khusus Telaah &amp; Pengesahan RKAS
                            </h4>
                            <p className="text-[10.5px] font-medium text-slate-500 dark:text-slate-400">
                                Hak eksekutif untuk memberi catatan revisi per item belanja atau mengesahkan dokumen penganggaran.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {catalog.abilities.map((ab) => {
                            const checked = Boolean(value.abilities[ab.key]);
                            return (
                                <button
                                    key={ab.key}
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => toggleAbility(ab.key)}
                                    className={`flex items-center justify-between gap-3 rounded-2xl border p-3.5 text-left transition-all ${
                                        checked
                                            ? 'border-lime-400 bg-white shadow-sm ring-2 ring-lime-300/40 dark:border-lime-400/50 dark:bg-white/[0.06]'
                                            : 'border-slate-200/80 bg-white/70 hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.02]'
                                    }`}
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[12px] font-extrabold text-slate-900 dark:text-white">
                                                {ab.label}
                                            </span>
                                            <StatusBadge tone={checked ? 'lime' : 'neutral'} dot={false}>
                                                {checked ? 'Diizinkan' : 'Nonaktif'}
                                            </StatusBadge>
                                        </div>
                                        <p className="mt-1 text-[10.5px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                                            {ab.description}
                                        </p>
                                    </div>

                                    {/* Toggle Switch Pill */}
                                    <span
                                        aria-hidden="true"
                                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ${
                                            checked ? 'bg-lime-400' : 'bg-slate-200 dark:bg-white/15'
                                        }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-slate-950 shadow transition-transform duration-200 ${
                                                checked ? 'translate-x-6' : 'translate-x-1 bg-white'
                                            }`}
                                        />
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
