import { useCountUp } from '@/Hooks/useCountUp';
import { useReducedMotion } from '@/Hooks/useReducedMotion';
import { useReveal } from '@/Hooks/useReveal';
import { cn } from '@/lib/utils';

export type CounterProps = {
    to: number;
    suffix?: string;
    prefix?: string;
    decimals?: number;
    className?: string;
    /** Bila diisi, nilai ditampilkan apa adanya tanpa animasi (mis. "24/7"). */
    raw?: string;
};

/** Angka yang berhitung naik saat masuk viewport (langsung final saat reduce-motion). */
export function Counter({ to, suffix = '', prefix = '', decimals = 0, className, raw }: CounterProps) {
    const reducedMotion = useReducedMotion();
    const { ref, visible } = useReveal<HTMLSpanElement>({ threshold: 0.5 });
    const animated = useCountUp(to, { start: visible && !reducedMotion, decimals });

    const settled = to.toLocaleString('id-ID', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
    const display = reducedMotion ? settled : animated;

    return (
        <span ref={ref} className={cn('tabular-nums', className)}>
            {prefix}
            {raw ?? display}
            {suffix}
        </span>
    );
}

export default Counter;
