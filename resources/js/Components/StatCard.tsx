import { ReactNode } from 'react';
import { TiltCard } from '@/Components/Landing/ui/TiltCard';

export interface StatCardProps {
    title: string;
    value: string | number;
    icon?: ReactNode;
    color?: string;
    description?: string;
    tooltip?: string;
    trend?: {
        value: string;
        isPositive?: boolean;
    };
}

/**
 * Kartu Statistik Bento bergaya Eduplex Top Cards:
 * Efek fisika 3D Tilt kursor, sudut rounded-[1.75rem] (28px), wadah ikon pastel,
 * tipografi angka tajam, dan border presisi.
 */
export default function StatCard({
    title,
    value,
    icon,
    color,
    description,
    tooltip,
    trend,
}: StatCardProps) {
    return (
        <TiltCard maxTilt={6} className="h-full">
            <div className="group relative flex h-full flex-col justify-between overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:border-brand-500/30 hover:shadow-lg dark:border-white/10 dark:bg-[#151324] dark:shadow-card-dark dark:hover:border-brand-400/30">
                {/* Background ambient radial highlight */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-brand-500/5 blur-2xl transition-transform duration-500 group-hover:scale-150 dark:bg-brand-500/10"
                />

                <div className="relative z-10 flex items-start justify-between gap-3">
                    <div className="space-y-1">
                        <span className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                            {title}
                        </span>
                        <div
                            className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white cursor-help"
                            title={tooltip || (typeof value === 'string' ? value : undefined)}
                        >
                            {value}
                        </div>
                    </div>

                    {icon && (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 p-2.5 text-slate-700 transition-all duration-300 group-hover:scale-110 dark:bg-white/5 dark:text-slate-200">
                            {icon}
                        </div>
                    )}
                </div>

                <div className="relative z-10 mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-white/5">
                    {description ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {description}
                        </p>
                    ) : (
                        <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                            Data BOSP Terverifikasi
                        </span>
                    )}

                    {trend && (
                        <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                trend.isPositive !== false
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                                    : 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400'
                            }`}
                        >
                            {trend.value}
                        </span>
                    )}
                </div>
            </div>
        </TiltCard>
    );
}
