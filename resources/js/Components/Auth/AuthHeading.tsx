import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

/**
 * Judul kartu autentikasi: label kecil bergaya cetak + judul serif.
 * Untuk kata aksen berwarna, gunakan `AuthAccent` agar garis bawah
 * "tangan" menempel tepat di kata tersebut.
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
            <p className="flex items-center gap-2.5 text-[10px] font-bold uppercase tracking-[0.26em] text-[#6B5E86]">
                <span aria-hidden="true" className="h-px w-5 bg-[#C9B9E8]" />
                {eyebrow}
            </p>

            <h1 className="mt-3 max-w-[20ch] font-display text-[clamp(1.8rem,2.4vw,2.2rem)] font-semibold leading-[1.08] tracking-[-0.025em] text-[#221C33]">
                {title}
            </h1>

            {subtitle && (
                <p className="mt-3 max-w-[38ch] text-[13px] leading-relaxed text-[#6B6178]">
                    {subtitle}
                </p>
            )}
        </div>
    );
}

/** Kata aksen dengan garis bawah yang digambar saat halaman dimuat. */
export function AuthAccent({ children }: { children: ReactNode }) {
    return (
        <span className="relative whitespace-nowrap text-[#4A2FB0]">
            {children}
            <svg
                aria-hidden="true"
                viewBox="0 0 120 14"
                className="auth-draw absolute -bottom-[3px] left-0 h-[9px] w-full overflow-visible"
                fill="none"
            >
                <path
                    d="M2 9.5c16-5 30 2.5 46-1.5 15-3.8 26 3.6 41-0.5 10-2.7 18-1.4 29 1"
                    stroke="#F3A87C"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                />
            </svg>
        </span>
    );
}
