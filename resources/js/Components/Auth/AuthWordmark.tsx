import { cn } from '@/lib/utils';

/**
 * Tanda merek resmi SIKAS untuk halaman autentikasi, serasi dengan halaman Welcome
 * menggunakan aset `public/images/landing/large.ico`.
 */
export default function AuthWordmark({
    className,
    compact = false,
    tone = 'dark',
}: {
    className?: string;
    compact?: boolean;
    /** `dark`: di atas panel Deep Midnight Teal; `light`: di atas latar Ice-White mobile. */
    tone?: 'dark' | 'light';
}) {
    const isDark = tone === 'dark';

    return (
        <div className={cn('group flex items-center gap-3', className)}>
            <span
                aria-hidden="true"
                className="relative flex h-10 w-10 shrink-0 items-center justify-center transition-transform duration-300 group-hover:scale-105"
            >
                <img
                    src="/images/landing/large.ico"
                    alt=""
                    className="h-full w-full object-contain drop-shadow-[0_4px_12px_rgba(139,230,220,0.35)]"
                />
            </span>

            <span className="flex min-w-0 flex-col leading-none">
                <span
                    className={cn(
                        'font-sans text-[21px] font-bold tracking-[-0.025em]',
                        isDark ? 'text-white' : 'text-[#08222B]',
                    )}
                >
                    SIKAS
                </span>
                {!compact && (
                    <span
                        className={cn(
                            'mt-[5px] text-[8.5px] font-semibold uppercase tracking-[0.22em]',
                            isDark ? 'text-[#8BE6DC]/85' : 'text-[#2A6F78]',
                        )}
                    >
                        Sistem Anggaran Sekolah
                    </span>
                )}
            </span>
        </div>
    );
}
