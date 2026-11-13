import React, { useMemo } from 'react';
import Select from 'react-select';
import { cn } from '@/lib/utils';

export interface YearSelectOption {
    value: string;
    label: string;
    count?: number;
}

interface ArkasYearSelectProps {
    value: string;
    onChange: (value: string) => void;
    activeYears: string[];
    includeAllOption?: boolean;
    isDisabled?: boolean;
    inputId?: string;
    placeholder?: string;
    localStatsPerYear?: Record<string, number>;
    totalLocal?: number;
    className?: string;
}

/**
 * Dropdown Neo-Bento berbasis react-select (dapat diketik untuk memfilter)
 * yang menampilkan Tahun Anggaran aktif dari model Penganggaran varian berjalan.
 */
export default function ArkasYearSelect({
    value,
    onChange,
    activeYears,
    includeAllOption = true,
    isDisabled = false,
    inputId,
    placeholder = 'Ketik atau pilih tahun...',
    localStatsPerYear,
    totalLocal,
    className,
}: ArkasYearSelectProps) {
    const options = useMemo<YearSelectOption[]>(() => {
        const yearOpts: YearSelectOption[] = activeYears.map((y) => ({
            value: String(y),
            label: `Tahun ${y}`,
            count: localStatsPerYear ? Number(localStatsPerYear[String(y)] ?? 0) : undefined,
        }));

        if (includeAllOption) {
            yearOpts.push({
                value: 'ALL',
                label: 'Semua Tahun',
                count: totalLocal,
            });
        }

        return yearOpts;
    }, [activeYears, includeAllOption, localStatsPerYear, totalLocal]);

    const selectedOption = useMemo(
        () => options.find((opt) => opt.value === String(value)) ?? null,
        [options, value],
    );

    return (
        <div className={className}>
            <Select<YearSelectOption, false>
                inputId={inputId}
                unstyled
                isSearchable
                isClearable={false}
                isDisabled={isDisabled}
                placeholder={placeholder}
                noOptionsMessage={() => 'Tahun anggaran aktif tidak ditemukan'}
                options={options}
                value={selectedOption}
                onChange={(opt) => {
                    if (opt) {
                        onChange(opt.value);
                    }
                }}
                formatOptionLabel={(option, meta) => {
                    const showCount =
                        meta.context === 'menu' && typeof option.count === 'number';
                    return (
                        <div className="flex items-center justify-between gap-2">
                            <span className="truncate">{option.label}</span>
                            {showCount && (
                                <span className="text-sikas-num shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-500 dark:bg-white/10 dark:text-slate-300">
                                    {option.count?.toLocaleString('id-ID')}
                                </span>
                            )}
                        </div>
                    );
                }}
                classNames={{
                    container: () => 'relative',
                    control: ({ isFocused, isDisabled: disabled }) =>
                        cn(
                            'min-h-[42px] rounded-2xl border bg-white px-3.5 py-1.5 text-xs font-bold shadow-sm transition dark:bg-white/5',
                            disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
                            isFocused
                                ? 'border-lime-400 ring-4 ring-lime-200/60 dark:border-lime-400/70 dark:ring-lime-400/10'
                                : 'border-slate-200/90 hover:border-slate-300 dark:border-white/10 dark:hover:border-white/20',
                        ),
                    valueContainer: () => 'gap-1 py-0.5',
                    placeholder: () => 'text-xs font-medium text-slate-400 dark:text-slate-500',
                    singleValue: () =>
                        'text-xs font-bold text-sikas-num text-slate-900 dark:text-white',
                    input: () =>
                        'text-xs font-semibold text-slate-900 dark:text-white [&_input]:!border-0 [&_input]:!outline-none [&_input]:!ring-0 [&_input]:!shadow-none',
                    indicatorsContainer: () => 'gap-1.5 pl-2',
                    indicatorSeparator: () => 'my-1.5 w-px bg-slate-200 dark:bg-white/10',
                    dropdownIndicator: () =>
                        'cursor-pointer rounded-lg p-0.5 text-slate-400 transition hover:text-slate-700 dark:text-slate-500 dark:hover:text-white',
                    menu: () =>
                        'z-50 mt-1.5 overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-float dark:border-white/10 dark:bg-[#1A1728]',
                    menuList: () => 'sikas-scroll max-h-52 space-y-0.5 overflow-y-auto',
                    option: ({ isSelected, isFocused }) =>
                        cn(
                            'cursor-pointer rounded-xl px-3 py-2 text-xs font-bold text-sikas-num transition',
                            isSelected
                                ? 'bg-pastel-lavender/85 text-brand-800 dark:bg-brand-500/25 dark:text-brand-200'
                                : isFocused
                                  ? 'bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white'
                                  : 'text-slate-700 dark:text-slate-300',
                        ),
                    noOptionsMessage: () =>
                        'px-3 py-3 text-center text-xs text-slate-400 dark:text-slate-500',
                }}
            />
        </div>
    );
}

