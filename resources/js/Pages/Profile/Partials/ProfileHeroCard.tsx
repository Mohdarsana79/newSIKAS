import IconTile, { IconTileTone } from '@/Components/ui/IconTile';
import StatusBadge from '@/Components/ui/StatusBadge';
import type { SharedSekolah, User } from '@/types';
import {
    AtSign,
    Brain,
    Building2,
    CheckCircle2,
    Mail,
    Shield,
    ShieldAlert,
    Sparkles,
} from 'lucide-react';
import { ReactNode } from 'react';
import { getRoleDisplayName } from './ProfileUiPrimitives';

interface ProfileHeroCardProps {
    user: User;
    sekolah?: SharedSekolah | null;
    hasDeepSeekKey: boolean;
    isSecurityCodeEnabled: boolean;
    mustVerifyEmail: boolean;
}

function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getRoleAvatarGradient(user: User): string {
    if (user.is_kepala_sekolah) {
        return 'from-sky-400 via-sky-500 to-cyan-500 text-white shadow-lg shadow-sky-500/20';
    }
    if (user.is_bendahara) {
        return 'from-brand-500 via-brand-600 to-indigo-600 text-white shadow-lg shadow-brand-500/25';
    }
    return 'from-lime-300 via-lime-400 to-emerald-400 text-slate-950 shadow-lime';
}

function HeroStatusTile({
    tone,
    icon,
    label,
    value,
    valueClassName,
}: {
    tone: IconTileTone;
    icon: ReactNode;
    label: string;
    value: string;
    valueClassName: string;
}) {
    return (
        <div className="flex items-center gap-2.5 rounded-2xl border border-slate-100 bg-slate-50/80 px-3.5 py-3 transition hover:border-slate-200/90 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/15">
            <IconTile tone={tone} size="sm">
                {icon}
            </IconTile>
            <div className="min-w-0">
                <p className="text-[9.5px] font-extrabold uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">
                    {label}
                </p>
                <p className={`mt-0.5 truncate text-[11.5px] font-extrabold ${valueClassName}`}>
                    {value}
                </p>
            </div>
        </div>
    );
}

/**
 * Banner Hero Identitas Pengguna + 3 Kartu Mini Status Akun, AI, dan Keamanan 2FA.
 */
export default function ProfileHeroCard({
    user,
    sekolah,
    hasDeepSeekKey,
    isSecurityCodeEnabled,
    mustVerifyEmail,
}: ProfileHeroCardProps) {
    const needsVerification = mustVerifyEmail && user.email_verified_at === null;
    const initials = getInitials(user.name);
    const roleLabel = getRoleDisplayName(user);

    return (
        <section className="sikas-card relative overflow-hidden p-5 sm:p-6">
            <div
                aria-hidden
                className="pointer-events-none absolute -left-12 -top-16 h-44 w-44 rounded-full bg-pastel-lavender/90 blur-3xl dark:bg-brand-500/15"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute -bottom-16 -right-12 h-44 w-44 rounded-full bg-lime-200/70 blur-3xl dark:bg-lime-400/10"
            />

            <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                {/* Identitas Pengguna */}
                <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="relative shrink-0 self-start sm:self-auto">
                        <div
                            className={`flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-br text-xl font-extrabold tracking-tight ring-4 ring-white dark:ring-[#15131F] ${getRoleAvatarGradient(user)}`}
                        >
                            {initials}
                        </div>
                        <span
                            title="Akun aktif"
                            className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white dark:bg-[#15131F]"
                        >
                            <span className="h-2.5 w-2.5 rounded-full bg-mint" />
                        </span>
                    </div>

                    <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="truncate text-[18px] font-extrabold tracking-tight text-slate-900 sm:text-[20px] dark:text-white">
                                {user.name}
                            </h2>
                            <StatusBadge tone="violet" dot={false}>
                                {roleLabel}
                            </StatusBadge>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            <span className="inline-flex items-center gap-1.5">
                                <AtSign className="h-3.5 w-3.5 text-brand-500 dark:text-brand-300" />
                                <span>{user.username}</span>
                            </span>
                            <span className="hidden text-slate-300 sm:inline dark:text-slate-600">•</span>
                            <span className="inline-flex min-w-0 items-center gap-1.5">
                                <Mail className="h-3.5 w-3.5 shrink-0 text-sky-500 dark:text-sky-400" />
                                <span className="truncate">{user.email}</span>
                            </span>
                            {sekolah?.nama_sekolah && (
                                <>
                                    <span className="hidden text-slate-300 sm:inline dark:text-slate-600">•</span>
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-slate-50 px-2.5 py-0.5 text-[10.5px] font-bold text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200">
                                        <Building2 className="h-3 w-3 text-lime-600 dark:text-lime-300" />
                                        <span className="max-w-[220px] truncate">{sekolah.nama_sekolah}</span>
                                        {sekolah.npsn && (
                                            <span className="text-sikas-num text-slate-400 dark:text-slate-500">
                                                ({sekolah.npsn})
                                            </span>
                                        )}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3 Mini Bento Status Cards */}
                <div className="grid shrink-0 grid-cols-1 gap-2.5 sm:grid-cols-3 xl:w-[530px]">
                    <HeroStatusTile
                        tone={needsVerification ? 'amber' : 'mint'}
                        icon={needsVerification ? <ShieldAlert /> : <CheckCircle2 />}
                        label="Status Akun"
                        value={needsVerification ? 'Perlu Verifikasi' : 'Aktif & Terverifikasi'}
                        valueClassName={
                            needsVerification
                                ? 'text-amber-600 dark:text-amber-300'
                                : 'text-emerald-700 dark:text-emerald-300'
                        }
                    />
                    <HeroStatusTile
                        tone={hasDeepSeekKey ? 'violet' : 'amber'}
                        icon={<Brain />}
                        label="AI DeepSeek"
                        value={hasDeepSeekKey ? 'Terpasang' : 'Belum Diatur'}
                        valueClassName={
                            hasDeepSeekKey
                                ? 'text-brand-600 dark:text-brand-300'
                                : 'text-amber-600 dark:text-amber-300'
                        }
                    />
                    <HeroStatusTile
                        tone={isSecurityCodeEnabled ? 'mint' : 'slate'}
                        icon={<Shield />}
                        label="Keamanan 2FA"
                        value={isSecurityCodeEnabled ? 'Aktif' : 'Nonaktif'}
                        valueClassName={
                            isSecurityCodeEnabled
                                ? 'text-emerald-700 dark:text-emerald-300'
                                : 'text-slate-500 dark:text-slate-400'
                        }
                    />
                </div>
            </div>
        </section>
    );
}
