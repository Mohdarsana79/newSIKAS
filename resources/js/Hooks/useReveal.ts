import { useEffect, useRef, useState } from 'react';

type Options = {
    threshold?: number;
    rootMargin?: string;
    once?: boolean;
};

/**
 * Mendeteksi apakah elemen sudah masuk viewport (untuk scroll reveal).
 * Aman untuk SSR: elemen tidak terlihat sampai effect berjalan di browser.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>({
    threshold = 0.18,
    rootMargin = '0px 0px -10% 0px',
    once = true,
}: Options = {}) {
    const ref = useRef<T | null>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const node = ref.current;
        if (!node) return;

        if (typeof IntersectionObserver === 'undefined') {
            setVisible(true);
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setVisible(true);
                        if (once) observer.unobserve(entry.target);
                    } else if (!once) {
                        setVisible(false);
                    }
                });
            },
            { threshold, rootMargin },
        );

        observer.observe(node);
        return () => observer.disconnect();
    }, [threshold, rootMargin, once]);

    return { ref, visible };
}

export default useReveal;
