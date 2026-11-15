import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Wadah baris filter: slot pencarian, chip filter, select, dan aksi di kanan.
 * Hanya tata letak — kontrol di dalamnya tetap milik halaman.
 */
export function FilterBar({
    children,
    end,
    className,
}: {
    children: ReactNode;
    end?: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('flex flex-wrap items-center gap-2', className)}>
            <div className="flex min-w-[220px] flex-1 flex-wrap items-center gap-2">
                {children}
            </div>
            {end && <div className="flex items-center gap-2">{end}</div>}
        </div>
    );
}

export default FilterBar;
