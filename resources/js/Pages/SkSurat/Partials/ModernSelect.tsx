import React, { useMemo, useRef, useState } from 'react';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ModernSelectOption {
    value: string;
    label: string;
    badge?: string;
    description?: string;
    preview?: string;
    searchText?: string;
}

export interface ModernSelectGroup {
    label: string;
    options: ModernSelectOption[];
}

interface ModernSelectProps {
    value: string;
    onChange: (value: string) => void;
    options?: ModernSelectOption[];
    groups?: ModernSelectGroup[];
    placeholder?: string;
    emptyOptionLabel?: string;
    searchPlaceholder?: string;
    searchable?: boolean;
    clearable?: boolean;
    disabled?: boolean;
    compact?: boolean;
    className?: string;
    panelWidthClass?: string;
    icon?: React.ReactNode;
}

export default function ModernSelect({
    value,
    onChange,
    options = [],
    groups = [],
    placeholder = '-- Pilih --',
    emptyOptionLabel,
    searchPlaceholder = 'Cari opsi...',
    searchable = true,
    clearable = false,
    disabled = false,
    compact = false,
    className,
    panelWidthClass = 'w-[var(--button-width)] min-w-[260px] max-w-[92vw]',
    icon,
}: ModernSelectProps) {
    const [query, setQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const normalizedGroups: ModernSelectGroup[] = useMemo(() => {
        if (groups.length > 0) return groups;
        return [{ label: '', options }];
    }, [groups, options]);

    const allOptions = useMemo(
        () => normalizedGroups.flatMap((g) => g.options),
        [normalizedGroups]
    );

    const selectedOption = useMemo(
        () => allOptions.find((o) => o.value === value) ?? null,
        [allOptions, value]
    );

    const filteredGroups = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return normalizedGroups;

        return normalizedGroups
            .map((g) => {
                const groupMatches = g.label.toLowerCase().includes(q);
                const filteredOpts = groupMatches
                    ? g.options
                    : g.options.filter((opt) => {
                          const haystack = [
                              opt.label,
                              opt.badge ?? '',
                              opt.description ?? '',
                              opt.preview ?? '',
                              opt.searchText ?? '',
                              opt.value,
                          ]
                              .join(' ')
                              .toLowerCase();
                          return haystack.includes(q);
                      });
                return { ...g, options: filteredOpts };
            })
            .filter((g) => g.options.length > 0);
    }, [normalizedGroups, query]);

    const totalFiltered = useMemo(
        () => filteredGroups.reduce((sum, g) => sum + g.options.length, 0),
        [filteredGroups]
    );

    return (
        <Popover className={cn('relative w-full', className)}>
            {({ open, close }) => (
                <>
                    <div className="relative flex w-full items-center">
                        <PopoverButton
                            type="button"
                            disabled={disabled}
                            onClick={() => setQuery('')}
                            className={cn(
                                'group flex w-full items-center justify-between gap-2 rounded-xl border text-left font-semibold shadow-sm transition focus:outline-none',
                                compact ? 'px-2.5 py-1.5 text-[11px]' : 'px-3 py-2 text-[11.5px]',
                                open
                                    ? 'border-brand-400 bg-white ring-4 ring-brand-200/50 dark:border-brand-400/70 dark:bg-[#1A1727] dark:ring-brand-500/15'
                                    : 'border-slate-200/90 bg-white hover:border-brand-300 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-brand-400/50',
                                disabled && 'cursor-not-allowed opacity-60',
                                clearable && selectedOption && !disabled && 'pr-14'
                            )}
                        >
                            <span className="flex min-w-0 flex-1 items-center gap-2 truncate">
                                {icon && <span className="shrink-0 text-slate-400 dark:text-slate-500">{icon}</span>}
                                {selectedOption ? (
                                    <span className="flex min-w-0 items-center gap-1.5 truncate">
                                        <span className="truncate text-slate-800 dark:text-slate-100">
                                            {selectedOption.label}
                                        </span>
                                        {selectedOption.badge && (
                                            <code className="shrink-0 rounded-md bg-brand-50 px-1.5 py-0.5 font-mono text-[9.5px] font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                                                {selectedOption.badge}
                                            </code>
                                        )}
                                    </span>
                                ) : (
                                    <span className="truncate text-slate-400 dark:text-slate-500">
                                        {placeholder}
                                    </span>
                                )}
                            </span>

                            <ChevronDown
                                className={cn(
                                    'h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200 dark:text-slate-500',
                                    open && 'rotate-180 text-brand-500 dark:text-brand-300'
                                )}
                            />
                        </PopoverButton>

                        {clearable && selectedOption && !disabled && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onChange('');
                                    close();
                                }}
                                aria-label="Hapus pilihan"
                                title="Hapus pilihan"
                                className="absolute right-8 inline-flex h-5 w-5 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-slate-200"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        )}
                    </div>

                    <PopoverPanel
                        portal
                        anchor={{ to: 'bottom start', gap: 6, padding: 12 }}
                        className={cn(
                            'z-[9999] flex max-h-[340px] flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl ring-1 ring-black/5 dark:border-white/10 dark:bg-[#191627] dark:ring-white/5',
                            panelWidthClass
                        )}
                    >
                        {searchable && (
                            <div className="shrink-0 border-b border-slate-100 bg-slate-50/90 p-2 dark:border-white/10 dark:bg-white/[0.03]">
                                <div className="relative">
                                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder={searchPlaceholder}
                                        autoFocus
                                        className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-7 text-[11.5px] font-semibold text-slate-800 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200/50 dark:border-white/10 dark:bg-[#12101C] dark:text-white dark:placeholder:text-slate-500 dark:focus:border-brand-400/70"
                                    />
                                    {query && (
                                        <button
                                            type="button"
                                            onClick={() => setQuery('')}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="sikas-scroll flex-1 overflow-y-auto p-1.5">
                            {emptyOptionLabel && !query.trim() && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onChange('');
                                        close();
                                    }}
                                    className={cn(
                                        'mb-1 flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-[11px] font-semibold transition',
                                        value === ''
                                            ? 'bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white'
                                            : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-white/5'
                                    )}
                                >
                                    <span>{emptyOptionLabel}</span>
                                    {value === '' && <Check className="h-3.5 w-3.5 text-brand-500 dark:text-lime-400" />}
                                </button>
                            )}

                            {totalFiltered === 0 ? (
                                <div className="px-3 py-6 text-center text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                                    Tidak ada pilihan yang cocok.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredGroups.map((group, gIdx) => (
                                        <div key={group.label || `grp-${gIdx}`}>
                                            {group.label && (
                                                <div className="sticky top-0 z-10 mb-1 rounded-lg bg-slate-100/95 px-2.5 py-1 text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-slate-500 backdrop-blur-sm dark:bg-[#231F35]/95 dark:text-slate-400">
                                                    {group.label}
                                                </div>
                                            )}
                                            <div className="space-y-0.5">
                                                {group.options.map((opt) => {
                                                    const active = opt.value === value;
                                                    return (
                                                        <button
                                                            key={opt.value}
                                                            type="button"
                                                            onClick={() => {
                                                                onChange(opt.value);
                                                                close();
                                                            }}
                                                            className={cn(
                                                                'flex w-full items-start justify-between gap-2 rounded-xl px-2.5 py-2 text-left transition',
                                                                active
                                                                    ? 'bg-brand-50 text-brand-900 ring-1 ring-brand-200/80 dark:bg-brand-500/20 dark:text-white dark:ring-brand-400/30'
                                                                    : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/[0.06]'
                                                            )}
                                                        >
                                                            <div className="min-w-0 flex-1 space-y-0.5">
                                                                <div className="flex flex-wrap items-center gap-1.5">
                                                                    <span className={cn('text-[11.5px]', active ? 'font-extrabold' : 'font-semibold')}>
                                                                        {opt.label}
                                                                    </span>
                                                                    {opt.badge && (
                                                                        <code className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[9.5px] font-bold text-brand-700 dark:bg-white/10 dark:text-brand-300">
                                                                            {opt.badge}
                                                                        </code>
                                                                    )}
                                                                </div>
                                                                {opt.description && (
                                                                    <div className="truncate text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                                                        {opt.description}
                                                                    </div>
                                                                )}
                                                                {opt.preview && (
                                                                    <div className="truncate text-[10px] font-semibold text-emerald-600 dark:text-emerald-300">
                                                                        Nilai: {opt.preview}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {active && (
                                                                <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-lime-400" />
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </PopoverPanel>
                </>
            )}
        </Popover>
    );
}
