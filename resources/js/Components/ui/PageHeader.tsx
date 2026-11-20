import { Link } from '@inertiajs/react';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type PageHeaderCrumb = {
    label: string;
    href?: string;
};

/**
 * Header halaman standar: breadcrumb + judul + badge + subtitle + slot aksi.
 * Menggantikan header inline yang selama ini ditulis manual di tiap halaman.
 */
export function PageHeader({
    title,
    subtitle,
    breadcrumb,
    badge,
    icon,
    actions,
    className,
}: {
    title: ReactNode;
    subtitle?: ReactNode;
    breadcrumb?: PageHeaderCrumb[];
    badge?: ReactNode;
    icon?: ReactNode;
    actions?: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'mt-2.5 sm:mt-3.5 flex flex-wrap items-end justify-between gap-2.5 sm:gap-3',
                className,
            )}
        >
            <div className="min-w-0">
                {breadcrumb && breadcrumb.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 text-[10.5px] font-semibold text-slate-400 dark:text-slate-500">
                        {breadcrumb.map((crumb, index) => (
                            <span key={`${crumb.label}-${index}`} className="flex items-center gap-2">
                                {index > 0 && <span className="text-slate-200 dark:text-slate-700">/</span>}
                                {crumb.href ? (
                                    <Link
                                        href={crumb.href}
                                        className="transition hover:text-slate-700 dark:hover:text-slate-200"
                                    >
                                        {crumb.label}
                                    </Link>
                                ) : (
                                    <span className={cn(index === breadcrumb.length - 1 && 'text-slate-700 dark:text-slate-200')}>
                                        {crumb.label}
                                    </span>
                                )}
                            </span>
                        ))}
                    </div>
                )}

                <div className="mt-1 flex flex-wrap items-center gap-2.5">
                    {icon}
                    <h1 className="text-[20px] sm:text-[22px] xl:text-[25px] font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white">
                        {title}
                    </h1>
                    {badge}
                </div>

                {subtitle && (
                    <p className="mt-0.5 text-[11.5px] font-medium text-slate-500 dark:text-slate-400">
                        {subtitle}
                    </p>
                )}
            </div>

            {actions && (
                <div className="flex flex-wrap items-center gap-2">{actions}</div>
            )}
        </div>
    );
}

export default PageHeader;
