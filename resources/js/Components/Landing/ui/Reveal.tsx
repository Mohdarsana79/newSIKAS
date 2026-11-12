import { CSSProperties, ReactNode } from 'react';

import { useReducedMotion } from '@/Hooks/useReducedMotion';
import { useReveal } from '@/Hooks/useReveal';
import { cn } from '@/lib/utils';

type Direction = 'up' | 'down' | 'left' | 'right' | 'none';

const OFFSET: Record<Direction, string> = {
    up: 'translate3d(0, 28px, 0)',
    down: 'translate3d(0, -28px, 0)',
    left: 'translate3d(28px, 0, 0)',
    right: 'translate3d(-28px, 0, 0)',
    none: 'translate3d(0, 0, 0)',
};

export type RevealProps = {
    children: ReactNode;
    /** Jeda animasi dalam milidetik. */
    delay?: number;
    direction?: Direction;
    className?: string;
    once?: boolean;
};

/**
 * Scroll reveal: fade + slide + blur halus. Otomatis nonaktif saat
 * pengguna memilih "reduce motion".
 */
export function Reveal({
    children,
    delay = 0,
    direction = 'up',
    className,
    once = true,
}: RevealProps) {
    const reducedMotion = useReducedMotion();
    const { ref, visible } = useReveal<HTMLDivElement>({ once });
    const shown = reducedMotion || visible;

    const style: CSSProperties = {
        transitionProperty: 'opacity, transform, filter',
        transitionDuration: '780ms',
        transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
        transitionDelay: `${delay}ms`,
        opacity: shown ? 1 : 0,
        filter: shown ? 'blur(0px)' : 'blur(6px)',
        transform: shown ? 'translate3d(0, 0, 0)' : OFFSET[direction],
        willChange: 'opacity, transform',
    };

    return (
        <div ref={ref} className={cn('motion-reduce:transition-none', className)} style={style}>
            {children}
        </div>
    );
}

export default Reveal;
