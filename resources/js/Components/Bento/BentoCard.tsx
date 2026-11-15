import { ReactNode } from 'react';
import { TiltCard } from '@/Components/Landing/ui/TiltCard';
import { cn } from '@/lib/utils';

export type BentoCardProps = {
    children: ReactNode;
    className?: string;
    /** Aktifkan efek fisika 3D cursor tilt */
    tilt?: boolean;
    maxTilt?: number;
    title?: string;
    subtitle?: string;
    icon?: ReactNode;
    action?: ReactNode;
    badge?: ReactNode;
    headerClassName?: string;
    bodyClassName?: string;
};

/**
 * Kontainer Kartu Bento khas SIKAS Neo-Bento:
 * permukaan `sikas-card` (rounded 26px, border putih, shadow card),
 * tile ikon pastel, judul sans-serif, dan slot badge/aksi di kanan.
 * Opsional tilt 3D kursor (hanya untuk kartu statistik).
 */
export function BentoCard({
    children,
    className,
    tilt = false,
    maxTilt = 5,
    title,
    subtitle,
    icon,
    action,
    badge,
    headerClassName,
    bodyClassName,
}: BentoCardProps) {
    const cardContent = (
        <div
            className={cn(
                'sikas-card relative flex flex-col overflow-hidden p-5',
                className,
            )}
        >
            {(title || icon || action || badge) && (
                <div className={cn('mb-4 flex items-start justify-between gap-3', headerClassName)}>
                    <div className="flex min-w-0 items-center gap-3">
                        {icon && (
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 ring-1 ring-slate-200/70 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10 [&>svg]:h-[18px] [&>svg]:w-[18px]">
                                {icon}
                            </span>
                        )}
                        <div className="min-w-0">
                            {title && (
                                <h3 className="truncate text-[13.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                    {title}
                                </h3>
                            )}
                            {subtitle && (
                                <p className="truncate text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        {badge}
                        {action}
                    </div>
                </div>
            )}

            <div className={cn('min-w-0 flex-1', bodyClassName)}>
                {children}
            </div>
        </div>
    );

    if (tilt) {
        return (
            <TiltCard maxTilt={maxTilt} className="h-full">
                {cardContent}
            </TiltCard>
        );
    }

    return cardContent;
}

export default BentoCard;
