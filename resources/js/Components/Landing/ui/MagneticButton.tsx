import { Link } from '@inertiajs/react';
import { ReactNode, useCallback, useRef } from 'react';

import { useReducedMotion } from '@/Hooks/useReducedMotion';
import { animate, createSpring } from '@/lib/anime';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'mint' | 'secondary' | 'outline' | 'ghost';

const BASE =
    'group relative inline-flex items-center justify-center gap-2.5 overflow-hidden rounded-full font-semibold tracking-[-0.01em] transition-colors duration-300 landing-focus active:scale-[0.98]';

const VARIANTS: Record<Variant, string> = {
    primary:
        'bg-gradient-to-r from-[#8BE6DC] via-[#9DF0E7] to-[#7CDAD0] px-6 py-3.5 text-[14.5px] text-[#06222B] shadow-[0_14px_34px_-10px_rgba(139,230,220,0.48)] ring-1 ring-inset ring-white/50 hover:from-[#A1F2E9] hover:to-[#8BE6DC] hover:shadow-[0_18px_40px_-8px_rgba(139,230,220,0.68)]',
    mint:
        'bg-gradient-to-r from-[#8BE6DC] via-[#9DF0E7] to-[#7CDAD0] px-5 py-2.5 text-[13.5px] text-[#06222B] shadow-[0_10px_26px_-8px_rgba(139,230,220,0.42)] ring-1 ring-inset ring-white/50 hover:from-[#A1F2E9] hover:to-[#8BE6DC]',
    secondary:
        'border border-white/25 bg-white/[0.08] px-6 py-3.5 text-[14.5px] text-white backdrop-blur-md hover:border-[#8BE6DC]/55 hover:bg-white/[0.14]',
    outline:
        'border border-[#0D3B47]/20 bg-[#EAF4F4]/70 px-5 py-2.5 text-[13.5px] text-[#09242E] hover:border-[#0D3B47]/40 hover:bg-[#DEF0F0] dark:border-white/15 dark:bg-white/[0.06] dark:text-white dark:hover:border-[#8BE6DC]/45 dark:hover:bg-white/[0.12]',
    ghost:
        'px-4 py-2 text-[13.5px] text-white/80 hover:text-[#8BE6DC]',
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
 * Tombol pill bergaya Novara dengan fisika magnetis pegas (Spring) dari Anime.js
 * serta kilau shimmer halus saat kursor melintas.
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
    const wrapperRef = useRef<HTMLSpanElement | null>(null);

    const handlePointerMove = useCallback(
        (event: React.PointerEvent<HTMLElement>) => {
            if (reducedMotion || event.pointerType === 'touch') return;
            const wrapper = wrapperRef.current;
            if (!wrapper) return;

            const rect = wrapper.getBoundingClientRect();
            const relX = event.clientX - (rect.left + rect.width / 2);
            const relY = event.clientY - (rect.top + rect.height / 2);
            const x = Math.max(-7, Math.min(7, relX * 0.14));
            const y = Math.max(-6, Math.min(6, relY * 0.2));

            animate(wrapper, {
                translateX: x,
                translateY: y,
                duration: 260,
                ease: 'outQuad',
            });
        },
        [reducedMotion],
    );

    const handlePointerLeave = useCallback(() => {
        const wrapper = wrapperRef.current;
        if (!wrapper || reducedMotion) return;

        animate(wrapper, {
            translateX: 0,
            translateY: 0,
            ease: createSpring({ stiffness: 160, damping: 14 }),
        });
    }, [reducedMotion]);

    const content = (
        <>
            <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
            <span
                aria-hidden
                className="pointer-events-none absolute inset-0 z-0 opacity-0 group-hover:animate-shimmer group-hover:opacity-100"
                style={{
                    background:
                        'linear-gradient(100deg, transparent 20%, rgba(255,255,255,0.42) 50%, transparent 80%)',
                }}
            />
        </>
    );

    const classNames = cn(BASE, VARIANTS[variant], className);
    const interaction = {
        onPointerMove: handlePointerMove,
        onPointerLeave: handlePointerLeave,
    };

    const inner =
        as === 'a' ? (
            inertia && href ? (
                <Link
                    href={href}
                    className={classNames}
                    onClick={onClick}
                    target={target}
                    rel={rel}
                    aria-label={ariaLabel}
                >
                    {content}
                </Link>
            ) : (
                <a
                    href={href}
                    className={classNames}
                    onClick={onClick}
                    target={target}
                    rel={rel}
                    aria-label={ariaLabel}
                >
                    {content}
                </a>
            )
        ) : (
            <button type={type} className={classNames} onClick={onClick} aria-label={ariaLabel}>
                {content}
            </button>
        );

    return (
        <span ref={wrapperRef} className="inline-flex will-change-transform" {...interaction}>
            {inner}
        </span>
    );
}

export default MagneticButton;
