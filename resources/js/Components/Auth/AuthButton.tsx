import { cn } from '@/lib/utils';
import { ArrowRight, Loader2 } from 'lucide-react';
import { ButtonHTMLAttributes } from 'react';

/**
 * Tombol utama auth: gradasi Mint Aqua (#8BE6DC) dengan teks Deep Midnight Teal (#06222B)
 * persis seperti tombol CTA utama pada halaman Welcome, lengkap dengan efek shimmer.
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
                'auth-button group relative inline-flex h-[52px] w-full items-center justify-center gap-2 overflow-hidden rounded-full',
                'bg-gradient-to-r from-[#8BE6DC] via-[#9DF0E7] to-[#7CDAD0] text-[14.5px] font-bold tracking-[-0.01em] text-[#06222B]',
                'shadow-[0_14px_30px_-12px_rgba(92,202,192,0.55)] ring-1 ring-inset ring-white/60',
                'transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                'hover:-translate-y-0.5 hover:from-[#A1F2E9] hover:to-[#8BE6DC] hover:shadow-[0_18px_36px_-10px_rgba(92,202,192,0.75)]',
                'active:translate-y-0 active:scale-[0.99]',
                'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#8BE6DC]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
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
                    className="h-[17px] w-[17px] text-[#06222B] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1"
                />
            )}
        </button>
    );
}
