import { ReactNode } from 'react';
import { TiltCard } from '@/Components/Landing/ui/TiltCard';
import IconTile, { IconTileTone } from '@/Components/ui/IconTile';
import { cn } from '@/lib/utils';

export interface StatCardProps {
    title: string;
    value: string | number;
    icon?: ReactNode;
    /** @deprecated warna ikon kini ditentukan oleh `tone`. */
    color?: string;
    description?: string;
    tooltip?: string;
    trend?: {
        value: string;
        isPositive?: boolean;
    };
    /** Warna tile ikon & aksen kartu. */
    tone?: IconTileTone;
    /** Persentase progres 0-100 untuk bar tipis di bawah nilai. */
    progress?: number;
    /** Label kecil di kanan bar progres (mis. "dari pagu"). */
    progressLabel?: string;
    className?: string;
}

const TONE_BAR: Record<string, string> = {
    violet: 'from-brand-400 to-brand-500',
    mint: 'from-mint to-emerald-400',
    peach: 'from-peach to-orange-400',
    sky: 'from-sky to-blue-400',
    amber: 'from-amber-400 to-orange-400',
    lime: 'from-lime-400 to-lime-500',
    rose: 'from-rose-400 to-rose-500',
    slate: 'from-slate-400 to-slate-500',
    ink: 'from-slate-700 to-slate-900',
};

/**
 * Kartu statistik bento SIKAS: tile ikon pastel, nilai besar tabular,
 * badge tren, dan bar progres tipis. Tilt 3D hanya aktif saat pointer halus.
 */
export default function StatCard({
    title,
    value,
    icon,
    color,
    description,
    tooltip,
    trend,
    tone = 'violet',
    progress,
    progressLabel,
    className,
}: StatCardProps) {
    const isPositive = trend?.isPositive !== false;

    return (
        <TiltCard maxTilt={5} className={cn('h-full', className)}>
            <article className="group relative flex h-full flex-col justify-between overflow-hidden rounded-[26px] border border-white bg-white p-4 shadow-card transition-all duration-500 hover:-translate-y-1 hover:shadow-card-hover dark:border-white/10 dark:bg-[#15131F] dark:shadow-card-dark">
                <div
                    aria-hidden
                    className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-pastel-lavender/70 blur-2xl transition-transform duration-500 group-hover:scale-150 dark:bg-brand-500/10"
                />

                <div className="relative flex items-start justify-between gap-3">
                    {icon && (
                        <IconTile tone={tone} size="lg">
                            {icon}
                        </IconTile>
                    )}

                    {trend && (
                        <span
                            className={cn(
                                'inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9.5px] font-extrabold leading-none',
                                isPositive
                                    ? 'bg-pastel-mint text-mint dark:bg-mint/10 dark:text-mint'
                                    : 'bg-pastel-rose text-rose-500 dark:bg-rose-500/10 dark:text-rose-300',
                            )}
                        >
                            {trend.value}
                            <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round"><path d="m7 17 10-10M8 7h9v9" /></svg>
                        </span>
                    )}
                </div>

                <div className="relative mt-3">
                    <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                        {title}
                    </p>
                    <p
                        className="mt-1 flex items-baseline gap-1 text-sikas-num"
                        title={tooltip || (typeof value === 'string' ? value : undefined)}
                    >
                        <span className="text-[24px] font-extrabold leading-none tracking-tight text-slate-900 dark:text-white">
                            {value}
                        </span>
                    </p>
                </div>

                {(typeof progress === 'number' || description) && (
                    <div className="relative mt-3 flex items-center gap-2">
                        {typeof progress === 'number' ? (
                            <>
                                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                                    <div
                                        className={cn('h-full rounded-full bg-gradient-to-r', TONE_BAR[tone] ?? TONE_BAR.violet)}
                                        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                                    />
                                </div>
                                <span className="text-[9.5px] font-bold text-slate-400 dark:text-slate-500">
                                    {progressLabel ?? `${progress}%`}
                                </span>
                            </>
                        ) : (
                            <p className="truncate text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                {description}
                            </p>
                        )}
                    </div>
                )}
            </article>
        </TiltCard>
    );
}
