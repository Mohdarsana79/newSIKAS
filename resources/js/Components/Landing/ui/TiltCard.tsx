import { PointerEvent, ReactNode, useCallback, useRef, useState } from 'react';

import { useReducedMotion } from '@/Hooks/useReducedMotion';
import { cn } from '@/lib/utils';

export type TiltCardProps = {
    children: ReactNode;
    className?: string;
    /** Kemiringan maksimum dalam derajat. */
    maxTilt?: number;
    glare?: boolean;
};

/**
 * Kartu dengan efek 3D tilt + glare radial yang mengikuti kursor.
 * Nonaktif saat reduce-motion maupun di perangkat sentuh.
 */
export function TiltCard({ children, className, maxTilt = 7, glare = true }: TiltCardProps) {
    const ref = useRef<HTMLDivElement | null>(null);
    const reducedMotion = useReducedMotion();
    const [style, setStyle] = useState<{ transform: string; glareX: number; glareY: number; active: boolean }>({
        transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg)',
        glareX: 50,
        glareY: 50,
        active: false,
    });

    const handlePointerMove = useCallback(
        (event: PointerEvent<HTMLDivElement>) => {
            if (reducedMotion || event.pointerType === 'touch') return;
            const node = ref.current;
            if (!node) return;

            const rect = node.getBoundingClientRect();
            const px = (event.clientX - rect.left) / rect.width;
            const py = (event.clientY - rect.top) / rect.height;
            const rotateY = (px - 0.5) * 2 * maxTilt;
            const rotateX = (0.5 - py) * 2 * maxTilt;

            setStyle({
                transform: `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateZ(0)`,
                glareX: px * 100,
                glareY: py * 100,
                active: true,
            });
        },
        [maxTilt, reducedMotion],
    );

    const reset = useCallback(() => {
        setStyle({
            transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg)',
            glareX: 50,
            glareY: 50,
            active: false,
        });
    }, []);

    return (
        <div className="perspective-1000 h-full">
            <div
                ref={ref}
                onPointerMove={handlePointerMove}
                onPointerLeave={reset}
                className={cn(
                    'relative h-full transition-transform duration-300 ease-luxe will-change-transform',
                    className,
                )}
                style={{ transform: style.transform }}
            >
                {children}
                {glare ? (
                    <span
                        aria-hidden
                        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300"
                        style={{
                            opacity: style.active ? 0.55 : 0,
                            background: `radial-gradient(420px circle at ${style.glareX}% ${style.glareY}%, rgba(255,255,255,0.28), transparent 55%)`,
                        }}
                    />
                ) : null}
            </div>
        </div>
    );
}

export default TiltCard;
