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
 * Kontainer Kartu Bento khas Eduplex & SIKAS Neo-Bento:
 * Sudut rounded-3xl membulat (28px), border presisi, latar bersih putih/ink-soft,
 * dan bayangan halus. Opsional tilt 3D kursor.
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
                'relative flex flex-col overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-300 dark:border-white/10 dark:bg-[#151324] dark:shadow-card-dark',
                className,
            )}
        >
            {(title || icon || action || badge) && (
                <div className={cn('mb-5 flex items-start justify-between gap-3', headerClassName)}>
                    <div className="flex items-center gap-3">
                        {icon && (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white">
                                {icon}
                            </div>
                        )}
                        <div>
                            {title && (
                                <h3 className="font-display text-base font-semibold tracking-tight text-slate-900 dark:text-white">
                                    {title}
                                </h3>
                            )}
                            {subtitle && (
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {badge}
                        {action}
                    </div>
                </div>
            )}

            <div className={cn('flex-1', bodyClassName)}>
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

