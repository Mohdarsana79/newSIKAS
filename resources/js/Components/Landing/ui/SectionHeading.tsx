import { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type SectionHeadingProps = {
    eyebrow: string;
    title: ReactNode;
    description?: ReactNode;
    align?: 'left' | 'center';
    className?: string;
};

/** Judul section konsisten: eyebrow emas, headline serif, deskripsi pendek. */
export function SectionHeading({
    eyebrow,
    title,
    description,
    align = 'center',
    className,
}: SectionHeadingProps) {
    const centered = align === 'center';

    return (
        <div className={cn(centered ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl text-left', className)}>
            <div className={cn('flex items-center gap-3', centered && 'justify-center')}>
                <span className="h-px w-8 bg-gradient-to-r from-transparent to-gold-500/70" />
                <p className="landing-eyebrow">{eyebrow}</p>
                <span className="h-px w-8 bg-gradient-to-l from-transparent to-gold-500/70" />
            </div>

            <h2 className="mt-5 font-display text-[clamp(2rem,3.6vw,3.15rem)] font-semibold leading-[1.08] tracking-[-0.02em] text-ink-900 dark:text-white">
                {title}
            </h2>

            {description ? (
                <p className="mt-5 text-pretty text-[15.5px] leading-[1.8] text-ink-900/65 dark:text-white/60">
                    {description}
                </p>
            ) : null}
        </div>
    );
}

export default SectionHeading;
