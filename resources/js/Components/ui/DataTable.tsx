import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Chrome tabel bento: header (judul/ikon/aksi), area tabel responsif, footer.
 * Halaman tetap memegang markup <table> beserta data & urutan kolomnya —
 * komponen ini hanya menyediakan permukaan dan scroll container.
 */
export function DataTable({
    title,
    subtitle,
    icon,
    actions,
    children,
    footer,
    className,
    contentClassName,
}: {
    title?: ReactNode;
    subtitle?: ReactNode;
    icon?: ReactNode;
    actions?: ReactNode;
    children: ReactNode;
    footer?: ReactNode;
    className?: string;
    contentClassName?: string;
}) {
    return (
        <section className={cn('sikas-card overflow-hidden', className)}>
            {(title || subtitle || icon || actions) && (
                <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-4">
                    <div className="flex items-center gap-3">
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
                    {actions && (
                        <div className="flex flex-wrap items-center gap-2">{actions}</div>
                    )}
                </div>
            )}

            <div className={cn('bento-table-wrapper mt-3 overflow-x-auto', contentClassName)}>
                {children}
            </div>

            {footer && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 py-3 dark:border-white/5">
                    {footer}
                </div>
            )}
        </section>
    );
}

export default DataTable;
