import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { ArrowLeft, LockKeyhole } from 'lucide-react';

/**
 * Ornamen status "registrasi terkunci" bernuansa Deep Teal & Mint Aqua.
 */
export function AuthLockBadge({ className }: { className?: string }) {
    return (
        <div className={cn('relative mx-auto flex h-16 w-16 items-center justify-center', className)}>
            <span aria-hidden="true" className="absolute inset-0 rotate-6 rounded-[20px] bg-[#D7F4F0]" />
            <span aria-hidden="true" className="absolute inset-[3px] -rotate-3 rounded-[17px] bg-white" />
            <span className="relative flex h-[46px] w-[46px] items-center justify-center rounded-[14px] bg-[#08222B] text-[#8BE6DC] shadow-[0_12px_22px_-12px_rgba(8,34,43,0.7)]">
                <LockKeyhole className="h-5 w-5" strokeWidth={1.7} aria-hidden="true" />
            </span>
        </div>
    );
}

export function AuthBackLink({ href, children }: { href: string; children: string }) {
    return (
        <Link
            href={href}
            className={cn(
                'group mx-auto inline-flex h-[52px] items-center justify-center gap-2 rounded-full border border-[#0D3B47]/20 bg-[#EAF4F4] px-6',
                'text-[14px] font-semibold text-[#08222B] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                'hover:-translate-y-0.5 hover:border-[#0D3B47]/35 hover:bg-[#DCF0F0] hover:shadow-[0_10px_24px_-14px_rgba(8,34,43,0.3)]',
                'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#8BE6DC]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
            )}
        >
            <ArrowLeft
                aria-hidden="true"
                className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5"
            />
            {children}
        </Link>
    );
}
