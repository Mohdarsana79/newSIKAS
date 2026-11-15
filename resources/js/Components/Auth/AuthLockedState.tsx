import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { ArrowLeft, LockKeyhole } from 'lucide-react';

/**
 * Hiasan kecil untuk keadaan "registrasi terkunci" dan pesan galat halaman.
 * Semua ornamen hanya dekoratif (aria-hidden) dan mengikuti palet auth.
 */
export function AuthLockBadge({ className }: { className?: string }) {
    return (
        <div className={cn('relative mx-auto flex h-16 w-16 items-center justify-center', className)}>
            <span aria-hidden="true" className="absolute inset-0 rotate-6 rounded-[20px] bg-[#E5DBFF]" />
            <span aria-hidden="true" className="absolute inset-[3px] -rotate-3 rounded-[17px] bg-[#FFFDF8]" />
            <span className="relative flex h-[46px] w-[46px] items-center justify-center rounded-[14px] bg-[#221C33] text-[#E5DBFF] shadow-[0_10px_18px_-12px_rgba(34,28,51,0.7)]">
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
                'group mx-auto inline-flex h-[52px] items-center justify-center gap-2 rounded-[14px] border border-[#221C33]/[0.12] bg-[#FFFDF8] px-6',
                'text-[14px] font-semibold text-[#221C33] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                'shadow-[0_2px_0_rgba(34,28,51,0.08)] hover:-translate-y-0.5 hover:border-[#6D4DE0]/30 hover:bg-[#F7F2FF] hover:shadow-[0_10px_20px_-14px_rgba(74,47,176,0.4)]',
                'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#6D4DE0]/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFDF8]',
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
