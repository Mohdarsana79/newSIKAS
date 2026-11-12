import { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type GradientTextProps = {
    children: ReactNode;
    className?: string;
};

/** Kata kunci dengan gradient violet → gold (menyesuaikan dark/light). */
export function GradientText({ children, className }: GradientTextProps) {
    return (
        <span
            className={cn(
                'bg-gradient-to-r from-brand-600 via-brand-500 to-gold-600 bg-clip-text text-transparent',
                'dark:from-brand-300 dark:via-brand-400 dark:to-gold-300',
                className,
            )}
        >
            {children}
        </span>
    );
}

export default GradientText;
