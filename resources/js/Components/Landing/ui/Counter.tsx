import { useCountUp } from '@/Hooks/useCountUp';
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

/** Angka yang berhitung naik saat masuk viewport. */
export function Counter({ to, suffix = '', prefix = '', decimals = 0, className, raw }: CounterProps) {
    const { ref, visible } = useReveal<HTMLSpanElement>({ threshold: 0.5 });
    const value = useCountUp(to, { start: visible, decimals });

    return (
        <span ref={ref} className={cn('tabular-nums', className)}>
            {prefix}
            {raw ?? value}
            {suffix}
        </span>
    );
}

export default Counter;
