import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Mengembalikan true bila pengguna meminta animasi dikurangi.
 * SSR-safe: default false, lalu disinkronkan di effect.
 */
export function useReducedMotion(): boolean {
    const [reduced, setReduced] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return;

        const mql = window.matchMedia(QUERY);
        const update = () => setReduced(mql.matches);

        update();
        mql.addEventListener('change', update);
        return () => mql.removeEventListener('change', update);
    }, []);

    return reduced;
}

export default useReducedMotion;
