import { cn } from '@/lib/utils';

/**
 * Placeholder loading dengan efek shimmer. Dipakai untuk tabel/kartu saat data
 * sedang dimuat (menggantikan spinner layar penuh).
 */
export function Skeleton({
    className,
    rounded = 'rounded-xl',
}: {
    className?: string;
    rounded?: string;
}) {
    return (
        <div className={cn('relative overflow-hidden bg-slate-100 dark:bg-white/5', rounded, className)}>
            <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/70 to-transparent dark:via-white/10" />
        </div>
    );
}

export function SkeletonRows({
    rows = 4,
    columns = 4,
    className,
}: {
    rows?: number;
    columns?: number;
    className?: string;
}) {
    return (
        <div className={cn('space-y-2.5 p-5', className)}>
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <div key={rowIndex} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8" rounded="rounded-xl" />
                    {Array.from({ length: columns }).map((__, columnIndex) => (
                        <Skeleton
                            key={columnIndex}
                            className={cn(
                                'h-3',
                                columnIndex === 0 ? 'w-1/3' : 'flex-1',
                            )}
                            rounded="rounded-md"
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}

export default Skeleton;
