import { cn } from '@/lib/utils';

/**
 * Paginasi pil. Komponen presentasional: pemanggil memberi nomor halaman aktif
 * dan handler perubahan halaman. Mendukung daftar halaman panjang dengan elipsis.
 */
export function Pagination({
    currentPage,
    lastPage,
    from,
    to,
    total,
    onPageChange,
    className,
}: {
    currentPage: number;
    lastPage: number;
    from?: number;
    to?: number;
    total?: number;
    onPageChange?: (page: number) => void;
    className?: string;
}) {
    const pages: (number | 'ellipsis')[] = [];
    const push = (value: number | 'ellipsis') => pages.push(value);

    if (lastPage <= 7) {
        for (let page = 1; page <= lastPage; page += 1) push(page);
    } else {
        push(1);
        if (currentPage > 3) push('ellipsis');
        for (let page = Math.max(2, currentPage - 1); page <= Math.min(lastPage - 1, currentPage + 1); page += 1) {
            push(page);
        }
        if (currentPage < lastPage - 2) push('ellipsis');
        push(lastPage);
    }

    return (
        <div className={cn('flex flex-wrap items-center justify-between gap-2', className)}>
            {typeof from === 'number' && typeof to === 'number' && typeof total === 'number' ? (
                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                    Menampilkan{' '}
                    <span className="font-extrabold text-slate-700 dark:text-slate-200">{from}–{to}</span>{' '}
                    dari{' '}
                    <span className="font-extrabold text-slate-700 dark:text-slate-200">{total}</span>
                </p>
            ) : (
                <span />
            )}

            <div className="flex items-center gap-1">
                <button
                    type="button"
                    onClick={() => onPageChange?.(Math.max(1, currentPage - 1))}
                    disabled={currentPage <= 1}
                    aria-label="Halaman sebelumnya"
                    className="flex h-7 w-7 items-center justify-center rounded-xl border border-slate-100 text-slate-400 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:text-slate-500"
                >
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="m15 18-6-6 6-6" /></svg>
                </button>

                {pages.map((page, index) =>
                    page === 'ellipsis' ? (
                        <span key={`ellipsis-${index}`} className="px-1 text-[10px] font-bold text-slate-300">
                            …
                        </span>
                    ) : (
                        <button
                            key={page}
                            type="button"
                            onClick={() => onPageChange?.(page)}
                            aria-current={page === currentPage ? 'page' : undefined}
                            className={cn(
                                'flex h-7 min-w-7 items-center justify-center rounded-xl px-2 text-[10px] font-extrabold transition',
                                page === currentPage
                                    ? 'bg-lime-400 text-slate-950 shadow-lime'
                                    : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-white/5',
                            )}
                        >
                            {page}
                        </button>
                    ),
                )}

                <button
                    type="button"
                    onClick={() => onPageChange?.(Math.min(lastPage, currentPage + 1))}
                    disabled={currentPage >= lastPage}
                    aria-label="Halaman berikutnya"
                    className="flex h-7 w-7 items-center justify-center rounded-xl border border-slate-100 text-slate-400 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:text-slate-500"
                >
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="m9 18 6-6-6-6" /></svg>
                </button>
            </div>
        </div>
    );
}

export default Pagination;
