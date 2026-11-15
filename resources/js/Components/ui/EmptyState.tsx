import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Empty state standar: tile ikon pastel, judul, deskripsi, dan aksi opsional.
 */
export function EmptyState({
    icon,
    title,
    description,
    action,
    className,
}: {
    icon?: ReactNode;
    title: ReactNode;
    description?: ReactNode;
    action?: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center rounded-[22px] border border-dashed border-slate-200 bg-slate-50/50 px-6 py-10 text-center dark:border-white/10 dark:bg-white/[0.02]',
                className,
            )}
        >
            {icon && (
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pastel-lavender text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                    {icon}
                </div>
            )}
            <p className="mt-3 text-[13px] font-extrabold text-slate-900 dark:text-white">
                {title}
            </p>
            {description && (
                <p className="mt-1 max-w-md text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {description}
                </p>
            )}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}

export default EmptyState;
