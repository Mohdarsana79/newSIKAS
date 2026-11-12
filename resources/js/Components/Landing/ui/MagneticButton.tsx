import { Link } from '@inertiajs/react';
import { ReactNode, useCallback } from 'react';

import { useReducedMotion } from '@/Hooks/useReducedMotion';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost';

const BASE =
    'group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full font-semibold tracking-tight transition-all duration-300 ease-luxe landing-focus active:scale-[0.98]';

const VARIANTS: Record<Variant, string> = {
    primary:
        'bg-gradient-to-r from-brand-500 to-brand-600 px-7 py-3.5 text-[15px] text-white shadow-glow-violet hover:from-brand-400 hover:to-brand-500 hover:shadow-glow-gold/60',
    secondary:
        'border border-ink-900/12 bg-white/80 px-6 py-3.5 text-[15px] text-ink-900 backdrop-blur hover:border-gold-600/40 hover:bg-white dark:border-white/15 dark:bg-white/[0.06] dark:text-white dark:hover:border-gold-400/50 dark:hover:bg-white/[0.1]',
    ghost:
        'px-4 py-2.5 text-[14px] text-ink-700 hover:text-brand-600 dark:text-white/70 dark:hover:text-gold-300',
};

export type MagneticButtonProps = {
    children: ReactNode;
    as?: 'button' | 'a';
    href?: string;
    onClick?: () => void;
    variant?: Variant;
    className?: string;
    target?: string;
    rel?: string;
    ariaLabel?: string;
    /** Pakai navigasi SPA Inertia (dipakai untuk route Laravel). */
    inertia?: boolean;
    type?: 'button' | 'submit';
};

/**
 * Tombol/tautan dengan efek magnetis halus (maks 6px) plus shimmer sweep
 * saat hover. Efek dimatikan saat reduce-motion atau perangkat sentuh.
 *
 * Transform diterapkan langsung ke elemen lewat `currentTarget`, jadi tidak
 * perlu ref maupun cast tipe.
 */
export function MagneticButton({
    children,
    as = 'button',
    href,
    onClick,
    variant = 'primary',
    className,
    target,
    rel,
    ariaLabel,
    inertia = false,
    type = 'button',
}: MagneticButtonProps) {
    const reducedMotion = useReducedMotion();

    const handlePointerMove = useCallback(
        (event: React.PointerEvent<HTMLElement>) => {
            if (reducedMotion || event.pointerType === 'touch') return;
            const node = event.currentTarget;
            const rect = node.getBoundingClientRect();
            const relX = event.clientX - (rect.left + rect.width / 2);
            const relY = event.clientY - (rect.top + rect.height / 2);
            const x = Math.max(-6, Math.min(6, relX * 0.12));
            const y = Math.max(-6, Math.min(6, relY * 0.18));

            node.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        },
        [reducedMotion],
    );

    const handlePointerLeave = useCallback((event: React.PointerEvent<HTMLElement>) => {
        event.currentTarget.style.transform = 'translate3d(0, 0, 0)';
    }, []);

    const content = (
        <>
            <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
            <span
                aria-hidden
                className="pointer-events-none absolute inset-0 z-0 opacity-0 group-hover:animate-shimmer group-hover:opacity-100"
                style={{
                    background:
                        'linear-gradient(100deg, transparent 20%, rgba(255,255,255,0.28) 50%, transparent 80%)',
                }}
            />
        </>
    );

    const classNames = cn(BASE, VARIANTS[variant], className);
    const interaction = {
        onPointerMove: handlePointerMove,
        onPointerLeave: handlePointerLeave,
    };

    if (as === 'a') {
        if (inertia && href) {
            return (
                <Link
                    href={href}
                    className={classNames}
                    onClick={onClick}
                    target={target}
                    rel={rel}
                    aria-label={ariaLabel}
                    {...interaction}
                >
                    {content}
                </Link>
            );
        }

        return (
            <a
                href={href}
                className={classNames}
                onClick={onClick}
                target={target}
                rel={rel}
                aria-label={ariaLabel}
                {...interaction}
            >
                {content}
            </a>
        );
    }

    return (
        <button
            type={type}
            className={classNames}
            onClick={onClick}
            aria-label={ariaLabel}
            {...interaction}
        >
            {content}
        </button>
    );
}

export default MagneticButton;
