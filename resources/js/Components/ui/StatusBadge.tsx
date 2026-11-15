import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type StatusTone =
    | 'success'
    | 'warning'
    | 'danger'
    | 'info'
    | 'violet'
    | 'lime'
    | 'neutral';

const TONES: Record<StatusTone, { pill: string; dot: string }> = {
    success: {
        pill: 'bg-pastel-mint text-mint dark:bg-mint/10 dark:text-mint',
        dot: 'bg-mint',
    },
    warning: {
        pill: 'bg-pastel-amber text-amber-600 dark:bg-amber-400/10 dark:text-amber-300',
        dot: 'bg-amber-500',
    },
    danger: {
        pill: 'bg-pastel-rose text-rose-500 dark:bg-rose-500/10 dark:text-rose-300',
        dot: 'bg-rose-500',
    },
    info: {
        pill: 'bg-pastel-sky text-sky dark:bg-sky/10 dark:text-sky',
        dot: 'bg-sky',
    },
    violet: {
        pill: 'bg-pastel-lavender text-brand-600 dark:bg-brand-500/15 dark:text-brand-300',
        dot: 'bg-brand-500',
    },
    lime: {
        pill: 'bg-lime-400 text-slate-900 dark:bg-lime-400 dark:text-slate-950',
        dot: 'bg-slate-900',
    },
    neutral: {
        pill: 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300',
        dot: 'bg-slate-400',
    },
};

/**
 * Badge status pastel dengan dot indikator opsional.
 * Tidak mengubah teks/status dari halaman — hanya presentasi.
 */
export function StatusBadge({
    children,
    tone = 'neutral',
    dot = true,
    className,
}: {
    children: ReactNode;
    tone?: StatusTone;
    dot?: boolean;
    className?: string;
}) {
    const style = TONES[tone];

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-1 text-[9.5px] font-extrabold leading-none',
                style.pill,
                className,
            )}
        >
            {dot && <span className={cn('h-1.5 w-1.5 rounded-full', style.dot)} />}
            {children}
        </span>
    );
}

export default StatusBadge;
