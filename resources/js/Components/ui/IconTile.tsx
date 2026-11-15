import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type IconTileTone =
    | 'lime'
    | 'violet'
    | 'mint'
    | 'peach'
    | 'sky'
    | 'amber'
    | 'rose'
    | 'slate'
    | 'ink';

const TONES: Record<IconTileTone, string> = {
    lime: 'bg-lime-200 text-slate-900 ring-1 ring-lime-300/70 dark:bg-lime-400/15 dark:text-lime-300 dark:ring-lime-400/25',
    violet: 'bg-pastel-lavender text-brand-600 ring-1 ring-brand-500/10 dark:bg-brand-500/15 dark:text-brand-300 dark:ring-brand-400/25',
    mint: 'bg-pastel-mint text-mint ring-1 ring-mint/15 dark:bg-mint/10 dark:text-mint dark:ring-mint/20',
    peach: 'bg-pastel-peach text-peach ring-1 ring-peach/15 dark:bg-peach/10 dark:text-peach dark:ring-peach/20',
    sky: 'bg-pastel-sky text-sky ring-1 ring-sky/15 dark:bg-sky/10 dark:text-sky dark:ring-sky/20',
    amber: 'bg-pastel-amber text-amber-600 ring-1 ring-amber-500/15 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20',
    rose: 'bg-pastel-rose text-rose-500 ring-1 ring-rose-500/15 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/20',
    slate: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200/70 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10',
    ink: 'bg-slate-900 text-lime-300 ring-1 ring-white/10 dark:bg-slate-950 dark:text-lime-300',
};

const SIZES = {
    sm: 'h-8 w-8 rounded-xl [&>svg]:h-4 [&>svg]:w-4',
    md: 'h-10 w-10 rounded-2xl [&>svg]:h-[18px] [&>svg]:w-[18px]',
    lg: 'h-11 w-11 rounded-2xl [&>svg]:h-5 [&>svg]:w-5',
} as const;

/**
 * Tile ikon pastel khas SIKAS Neo-Bento. Ukuran & warna konsisten di seluruh
 * aplikasi; anak (ikon) otomatis disesuaikan ukurannya.
 */
export function IconTile({
    children,
    tone = 'slate',
    size = 'md',
    className,
}: {
    children: ReactNode;
    tone?: IconTileTone;
    size?: keyof typeof SIZES;
    className?: string;
}) {
    return (
        <span
            className={cn(
                'inline-flex shrink-0 items-center justify-center',
                TONES[tone],
                SIZES[size],
                className,
            )}
        >
            {children}
        </span>
    );
}

export default IconTile;
