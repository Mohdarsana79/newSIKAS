import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type PillTabItem = {
    key: string;
    label: ReactNode;
    badge?: ReactNode;
};

/**
 * Baris tab berbentuk pil. Komponen presentasional murni: pemanggil tetap
 * yang menentukan apa yang terjadi saat tab diklik (handler existing di halaman).
 */
export function PillTabs({
    items,
    value,
    onChange,
    variant = 'solid',
    className,
    ariaLabel = 'Tab navigasi',
}: {
    items: PillTabItem[];
    value: string;
    onChange?: (key: string) => void;
    variant?: 'solid' | 'soft';
    className?: string;
    ariaLabel?: string;
}) {
    return (
        <div
            role="tablist"
            aria-label={ariaLabel}
            className={cn(
                'flex items-center gap-1 overflow-x-auto no-scrollbar p-0.5',
                className,
            )}
        >
            {items.map((item) => {
                const active = item.key === value;

                return (
                    <button
                        key={item.key}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => onChange?.(item.key)}
                        className={cn(
                            'flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-[11px] font-bold transition-all duration-200',
                            active
                                ? variant === 'solid'
                                    ? 'bg-slate-900 text-white shadow-pill dark:bg-white dark:text-slate-900'
                                    : 'bg-lime-200 text-slate-900 ring-1 ring-lime-300/70 dark:bg-lime-400/15 dark:text-lime-300 dark:ring-lime-400/25'
                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white',
                        )}
                    >
                        {active && variant === 'solid' && (
                            <span className="h-1.5 w-1.5 rounded-full bg-lime-300" />
                        )}
                        {item.label}
                        {item.badge}
                    </button>
                );
            })}
        </div>
    );
}

export default PillTabs;
