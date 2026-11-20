import {
    animate,
    createSpring,
    createTimeline,
    stagger,
    svg,
    type AnimationParams,
    type JSAnimation,
    type TargetsParam,
    type Timeline,
} from 'animejs';
import { useEffect, useLayoutEffect, useRef } from 'react';

import { useReducedMotion } from '@/Hooks/useReducedMotion';

export { animate, createSpring, createTimeline, stagger, svg };
export type { AnimationParams, JSAnimation, TargetsParam, Timeline };

export type UseAnimeInViewOptions = {
    threshold?: number;
    rootMargin?: string;
    once?: boolean;
    /** Selector elemen anak yang disembunyikan (`opacity: 0`) sebelum masuk viewport agar bebas flicker. */
    initialHideSelector?: string;
};

/**
 * Menjalankan callback animasi Anime.js ketika elemen kontainer masuk ke dalam viewport.
 * Otomatis menghormati `prefers-reduced-motion`, mencegah flicker awal, dan membersihkan instance saat unmount.
 */
export function useAnimeInView<T extends HTMLElement = HTMLDivElement>(
    runAnimation: (container: T, reducedMotion: boolean) => (() => void) | JSAnimation | Timeline | void,
    options: UseAnimeInViewOptions = {},
) {
    const {
        threshold = 0.14,
        rootMargin = '0px 0px -6% 0px',
        once = true,
        initialHideSelector,
    } = options;
    const ref = useRef<T | null>(null);
    const reducedMotion = useReducedMotion();
    const callbackRef = useRef(runAnimation);
    callbackRef.current = runAnimation;
    const hasTriggeredRef = useRef(false);

    useLayoutEffect(() => {
        const node = ref.current;
        if (!node || !initialHideSelector || reducedMotion || hasTriggeredRef.current) return;

        const targets = node.querySelectorAll<HTMLElement>(initialHideSelector);
        targets.forEach((el) => {
            el.style.opacity = '0';
        });
    }, [initialHideSelector, reducedMotion]);

    useEffect(() => {
        const node = ref.current;
        if (!node) return;

        let cleanupFn: (() => void) | undefined;

        const trigger = () => {
            if (once && hasTriggeredRef.current) return;
            hasTriggeredRef.current = true;
            const result = callbackRef.current(node, reducedMotion);
            if (typeof result === 'function') {
                cleanupFn = result;
            } else if (result && typeof result.pause === 'function') {
                cleanupFn = () => {
                    result.pause();
                };
            }
        };

        if (reducedMotion || typeof IntersectionObserver === 'undefined') {
            if (initialHideSelector) {
                node.querySelectorAll<HTMLElement>(initialHideSelector).forEach((el) => {
                    el.style.opacity = '1';
                });
            }
            trigger();
            return () => {
                cleanupFn?.();
            };
        }

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        trigger();
                        if (once) observer.unobserve(node);
                    }
                }
            },
            { threshold, rootMargin },
        );

        observer.observe(node);

        return () => {
            observer.disconnect();
            cleanupFn?.();
        };
    }, [initialHideSelector, once, reducedMotion, rootMargin, threshold]);

    return { ref, reducedMotion };
}

export type AnimateNumberOptions = {
    from?: number;
    to: number;
    duration?: number;
    decimals?: number;
    reducedMotion?: boolean;
    onUpdate: (formatted: string, rawValue: number) => void;
    formatter?: (val: number) => string;
};

/**
 * Menganimasikan angka secara mulus menggunakan engine `animate()` dari Anime.js v4.
 */
export function animateNumber({
    from = 0,
    to,
    duration = 1350,
    decimals = 0,
    reducedMotion = false,
    onUpdate,
    formatter,
}: AnimateNumberOptions): JSAnimation | null {
    const formatValue = (val: number) => {
        if (formatter) return formatter(val);
        return val.toLocaleString('id-ID', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        });
    };

    if (reducedMotion) {
        onUpdate(formatValue(to), to);
        return null;
    }

    const state = { val: from };
    return animate(state, {
        val: to,
        duration,
        ease: 'outExpo',
        onUpdate: () => {
            onUpdate(formatValue(state.val), state.val);
        },
    });
}
