import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const PADDING = {
    none: '',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
} as const;

/**
 * Kartu permukaan standar (pengganti BentoCard untuk halaman dalam).
 * Header opsional: ikon tile, judul, subtitle, badge/aksi kanan.
 */
export function Surface({
    children,
    className,
    title,
    subtitle,
    icon,
    actions,
    badge,
    padding = 'md',
    hover = false,
    overflowVisible = false,
    bodyClassName,
    headerClassName,
}: {
    children: ReactNode;
    className?: string;
    title?: ReactNode;
    subtitle?: ReactNode;
    icon?: ReactNode;
    actions?: ReactNode;
    badge?: ReactNode;
    padding?: keyof typeof PADDING;
    hover?: boolean;
    overflowVisible?: boolean;
    bodyClassName?: string;
    headerClassName?: string;
}) {
    const hasHeader = Boolean(title || icon || actions || badge);

    return (
        <section
            className={cn(
                'sikas-card relative flex flex-col',
                overflowVisible ? 'overflow-visible' : 'overflow-hidden',
                hover && 'sikas-card-hover',
                PADDING[padding],
                className,
            )}
        >
            {hasHeader && (
                <div
                    className={cn(
                        'mb-4 flex items-start justify-between gap-3',
                        headerClassName,
                    )}
                >
                    <div className="flex min-w-0 items-center gap-3">
                        {icon}
                        <div className="min-w-0">
                            {title && (
                                <h2 className="truncate text-[13.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                    {title}
                                </h2>
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
                        {actions}
                    </div>
                </div>
            )}

            <div className={cn('min-w-0 flex-1', bodyClassName)}>{children}</div>
        </section>
    );
}

export default Surface;
