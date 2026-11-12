import { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type Padding = 'none' | 'sm' | 'md' | 'lg';

const PADDING: Record<Padding, string> = {
    none: '',
    sm: 'p-4',
    md: 'p-6 sm:p-7',
    lg: 'p-7 sm:p-9',
};

export type GlassCardProps = {
    children: ReactNode;
    className?: string;
    /** Menambah glow violet di belakang kartu. */
    glow?: boolean;
    padding?: Padding;
};

/**
 * Permukaan kaca standar landing page: hairline emas tipis, blur, dan
 * highlight atas. Otomatis menyesuaikan dark/light mode.
 */
export function GlassCard({ children, className, glow = false, padding = 'md' }: GlassCardProps) {
    return (
        <div
            className={cn(
                'landing-glass relative overflow-hidden transition-all duration-500 ease-luxe',
                'before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-gold-400/40 before:to-transparent',
                glow && 'shadow-glow-violet',
                PADDING[padding],
                className,
            )}
        >
            {glow ? (
                <span
                    aria-hidden
                    className="pointer-events-none absolute -inset-16 -z-10 rounded-full bg-brand-500/20 blur-3xl dark:bg-brand-500/25"
                />
            ) : null}
            {children}
        </div>
    );
}

export default GlassCard;
