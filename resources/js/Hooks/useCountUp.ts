import { useEffect, useRef, useState } from 'react';

type Options = {
    duration?: number;
    start?: boolean;
    decimals?: number;
};

const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

/**
 * Menghitung naik dari 0 ke `to` memakai requestAnimationFrame.
 * Mengembalikan string yang sudah diformat (id-ID).
 *
 * Sengaja tanpa guard "sudah pernah jalan": kalau effect dibatalkan
 * (StrictMode / remount), animasi cukup dimulai ulang dari 0 dan tetap
 * berakhir tepat di `to`.
 */
export function useCountUp(
    to: number,
    { duration = 1600, start = true, decimals = 0 }: Options = {},
): string {
    const [value, setValue] = useState(0);
    const frame = useRef<number | null>(null);

    useEffect(() => {
        if (!start) return;

        if (typeof window === 'undefined' || typeof requestAnimationFrame === 'undefined') {
            setValue(to);
            return;
        }

        const begin = performance.now();

        const tick = (now: number) => {
            const progress = Math.min((now - begin) / duration, 1);
            setValue(progress < 1 ? to * easeOutExpo(progress) : to);

            if (progress < 1) {
                frame.current = requestAnimationFrame(tick);
            }
        };

        frame.current = requestAnimationFrame(tick);

        return () => {
            if (frame.current !== null) cancelAnimationFrame(frame.current);
            frame.current = null;
        };
    }, [to, duration, start]);

    return value.toLocaleString('id-ID', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}

export default useCountUp;
