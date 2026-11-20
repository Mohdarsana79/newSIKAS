import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

/**
 * Judul kartu autentikasi: eyebrow teal + headline tegas + subjudul.
 * Untuk kata aksen berwarna, gunakan `AuthAccent`.
 */
export default function AuthHeading({
    eyebrow,
    title,
    subtitle,
    className,
}: {
    eyebrow: string;
    title: ReactNode;
    subtitle?: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn(className)}>
            <p className="flex items-center gap-2.5 text-[10.5px] font-bold uppercase tracking-[0.24em] text-[#2A6F78]">
                <span aria-hidden="true" className="h-px w-5 bg-[#8BE6DC]" />
                {eyebrow}
            </p>

            <h1 className="mt-3 max-w-[20ch] font-sans text-[clamp(1.75rem,2.4vw,2.2rem)] font-bold leading-[1.1] tracking-[-0.03em] text-[#08222B]">
                {title}
            </h1>

            {subtitle && (
                <p className="mt-3 max-w-[38ch] text-[13.5px] leading-relaxed text-[#45636D]">
                    {subtitle}
                </p>
            )}
        </div>
    );
}

/** Kata aksen dengan garis bawah mint-teal yang digambar saat halaman dimuat. */
export function AuthAccent({
    children,
    tone = 'light',
}: {
    children: ReactNode;
    tone?: 'light' | 'dark';
}) {
    return (
        <span
            className={cn(
                'relative whitespace-nowrap',
                tone === 'dark' ? 'text-[#8BE6DC]' : 'text-[#146670]',
            )}
        >
            {children}
            <svg
                aria-hidden="true"
                viewBox="0 0 120 14"
                className="auth-draw absolute -bottom-[3px] left-0 h-[9px] w-full overflow-visible"
                fill="none"
            >
                <path
                    d="M2 9.5c16-5 30 2.5 46-1.5 15-3.8 26 3.6 41-0.5 10-2.7 18-1.4 29 1"
                    stroke={tone === 'dark' ? '#8BE6DC' : '#5CCAC0'}
                    strokeWidth="2.8"
                    strokeLinecap="round"
                />
            </svg>
        </span>
    );
}
