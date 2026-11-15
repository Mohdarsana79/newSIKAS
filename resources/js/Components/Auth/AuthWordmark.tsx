import { cn } from '@/lib/utils';

/**
 * Tanda merek SIKAS untuk halaman autentikasi.
 * Ikon digambar manual: tumpukan lembar anggaran dengan koin kecil —
 * sengaja sederhana supaya tetap terbaca di ukuran 40px.
 */
export default function AuthWordmark({
    className,
    compact = false,
}: {
    className?: string;
    compact?: boolean;
}) {
    return (
        <div className={cn('flex items-center gap-3', className)}>
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#6D4DE0] shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_18px_-10px_rgba(74,47,176,0.75)]">
                <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" aria-hidden="true">
                    <path
                        d="M5.4 7.4c0-1.3 1.05-2.35 2.35-2.35h8.5c1.3 0 2.35 1.05 2.35 2.35v.85H5.4V7.4Z"
                        fill="#FFFDF8"
                        opacity="0.92"
                    />
                    <path
                        d="M5.4 10.2h13.2v6.4a2.4 2.4 0 0 1-2.4 2.4H7.8a2.4 2.4 0 0 1-2.4-2.4v-6.4Z"
                        fill="#FFFDF8"
                    />
                    <path d="M9 13.4h6" stroke="#6D4DE0" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M9 15.9h3.6" stroke="#6D4DE0" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="18.7" cy="6.3" r="2.05" fill="#E7C069" stroke="#FFFDF8" strokeWidth="0.9" />
                </svg>
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#F3A87C] ring-2 ring-[#F4ECFF]" />
            </span>

            <span className="flex min-w-0 flex-col leading-none">
                <span className="font-display text-[21px] font-semibold tracking-[-0.02em] text-[#221C33]">
                    SIKAS
                </span>
                {!compact && (
                    <span className="mt-[5px] text-[9px] font-semibold uppercase tracking-[0.2em] text-[#6B5E86]">
                        Sistem Informasi Keuangan Sekolah
                    </span>
                )}
            </span>
        </div>
    );
}
