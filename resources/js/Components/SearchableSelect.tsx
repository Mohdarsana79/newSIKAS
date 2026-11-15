import { useState, useRef, useEffect, useMemo } from 'react';

interface ColumnDef {
    header: string;
    field: string;
    width?: string;
    className?: string; // Optional for specific styling like font-bold
}

interface SearchableSelectProps {
    value: string | number;
    onChange: (value: string | number) => void;
    options: any[];
    searchFields: string[];
    displayColumns: ColumnDef[];
    placeholder?: string;
    className?: string;
    labelRenderer?: (option: any) => string; // How to display the selected value in the input box
    error?: string;
}

export default function SearchableSelect({
    value,
    onChange,
    options,
    searchFields,
    displayColumns,
    placeholder = 'Pilih...',
    className = '',
    labelRenderer,
    error
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Filter options based on search term
    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        const lowerTerm = searchTerm.toLowerCase();
        return options.filter(option =>
            searchFields.some(field => {
                const val = option[field];
                return val && String(val).toLowerCase().includes(lowerTerm);
            })
        );
    }, [options, searchTerm, searchFields]);

    // Get selected option object
    const selectedOption = useMemo(() => {
        return options.find(opt => opt.id == value);
    }, [options, value]);

    // Handle clicking outside to close
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);

    const handleSelect = (option: any) => {
        onChange(option.id);
        setIsOpen(false);
        setSearchTerm('');
    };

    const displayLabel = selectedOption
        ? (labelRenderer ? labelRenderer(selectedOption) : (selectedOption.name || selectedOption.uraian || selectedOption.rincian_objek))
        : '';

    return (
        <div className={`relative ${className}`} ref={wrapperRef}>
            {/* Input Trigger */}
            <div
                className={`
                    flex min-h-[42px] w-full cursor-pointer items-center justify-between rounded-xl border bg-white px-3.5 py-2.5 text-[12px] font-semibold shadow-sm transition
                    dark:bg-white/5 dark:text-white
                    ${error
                        ? 'border-rose-400 ring-4 ring-rose-100 dark:border-rose-500/50 dark:ring-rose-500/10'
                        : 'border-slate-200/90 hover:border-lime-400 dark:border-white/10 dark:hover:border-lime-400/60'}
                    focus-within:border-lime-400 focus-within:ring-4 focus-within:ring-lime-200/60 dark:focus-within:border-lime-400/70
                `}
                onClick={() => {
                    setIsOpen(!isOpen);
                    // if opening, maybe allow searching immediately?
                }}
            >
                <div className="flex-1 truncate text-slate-800 dark:text-slate-100">
                    {displayLabel || <span className="text-slate-400 dark:text-slate-500">{placeholder}</span>}
                </div>
                <div className="ml-2 flex flex-col items-center justify-center">
                    <svg className={`h-4 w-4 text-slate-400 transition-transform duration-200 dark:text-slate-500 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute -left-0 z-50 mt-1 flex max-h-[400px] w-full min-w-[600px] flex-col overflow-hidden rounded-2xl border border-white bg-white shadow-float dark:border-white/10 dark:bg-[#15131F] md:left-0">

                    {/* Search Bar */}
                    <div className="sticky top-0 border-b border-slate-100 bg-slate-50/80 p-2 dark:border-white/5 dark:bg-white/[0.03]">
                        <input
                            type="text"
                            className="w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-[12px] font-semibold text-slate-800 placeholder:text-slate-400 focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
                            placeholder="Cari..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking input
                        />
                    </div>

                    {/* Table Header */}
                    <div className="sticky top-[53px] grid border-b border-slate-100 bg-slate-50/70 text-[9px] font-extrabold uppercase tracking-[0.12em] text-slate-400 dark:border-white/5 dark:bg-white/[0.03] dark:text-slate-500">
                        <div className="flex px-3 py-2">
                            {displayColumns.map((col, idx) => (
                                <div key={idx} className={`${col.width || 'flex-1'} px-2`}>
                                    {col.header}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Options List */}
                    <div className="sikas-scroll max-h-[300px] overflow-y-auto">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => (
                                <div
                                    key={option.id}
                                    className={`
                                        flex cursor-pointer border-b border-slate-100 px-3 py-2 transition-colors last:border-0 hover:bg-lime-50/60 dark:border-white/5 dark:hover:bg-white/5
                                        ${value === option.id ? 'bg-lime-100/60 dark:bg-lime-400/10' : ''}
                                    `}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelect(option);
                                    }}
                                >
                                    {displayColumns.map((col, idx) => (
                                        <div key={idx} className={`${col.width || 'flex-1'} px-2 text-[11.5px] font-semibold text-slate-700 dark:text-slate-300 ${col.className || ''}`}>
                                            {option[col.field] ?? '-'}
                                        </div>
                                    ))}
                                </div>
                            ))
                        ) : (
                            <div className="px-4 py-8 text-center text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                                Tidak ada data yang cocok.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {error && <p className="mt-1 text-[10px] font-semibold text-rose-500">{error}</p>}
        </div>
    );
}
