import { cn } from '@/lib/utils';
import { ArrowRight, Loader2 } from 'lucide-react';
import { ButtonHTMLAttributes } from 'react';

/**
 * Tombol utama auth: bidang tinta tua dengan kilau tipis saat hover.
 * Tetap satu komponen supaya state loading di semua halaman konsisten.
 */
export default function AuthButton({
    className,
    children,
    processing = false,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { processing?: boolean }) {
    return (
        <button
            {...props}
            disabled={processing || props.disabled}
            aria-busy={processing || undefined}
            className={cn(
                'auth-button group relative inline-flex h-[52px] w-full items-center justify-center gap-2 overflow-hidden rounded-[14px]',
                'bg-[#221C33] text-[14.5px] font-semibold tracking-[0.01em] text-[#FFFDF8]',
                'shadow-[0_2px_0_#0D0919,0_18px_30px_-16px_rgba(34,28,51,0.65)]',
                'transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                'hover:-translate-y-0.5 hover:bg-[#2C2440] hover:shadow-[0_2px_0_#0D0919,0_24px_38px_-18px_rgba(109,77,224,0.55)]',
                'active:translate-y-0 active:shadow-[0_1px_0_#0D0919,0_10px_18px_-12px_rgba(34,28,51,0.6)]',
                'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#6D4DE0]/25 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFDF8]',
                'disabled:pointer-events-none disabled:opacity-60',
                className,
            )}
        >
            <span aria-hidden="true" className="auth-sheen" />

            <span className="relative flex items-center gap-2">
                {processing && <Loader2 className="h-[17px] w-[17px] animate-spin" aria-hidden="true" />}
                {children}
            </span>

            {!processing && (
                <ArrowRight
                    aria-hidden="true"
                    className="h-[17px] w-[17px] text-[#E5DBFF] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1"
                />
            )}
        </button>
    );
}
