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
                    w-full min-h-[42px] px-3 py-2 bg-white dark:bg-gray-900 border rounded-md shadow-sm cursor-pointer flex items-center justify-between
                    ${error ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300 dark:border-gray-700 hover:border-indigo-500'}
                    focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500
                `}
                onClick={() => {
                    setIsOpen(!isOpen);
                    // if opening, maybe allow searching immediately?
                }}
            >
                <div className="flex-1 truncate text-gray-700 dark:text-gray-300 text-sm">
                    {displayLabel || <span className="text-gray-400">{placeholder}</span>}
                </div>
                <div className="ml-2 flex flex-col items-center justify-center">
                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-[400px] overflow-hidden flex flex-col min-w-[600px] -left-0 md:left-0">

                    {/* Search Bar */}
                    <div className="p-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 sticky top-0">
                        <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                            placeholder="Cari..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking input
                        />
                    </div>

                    {/* Table Header */}
                    <div className="grid border-b border-gray-200 dark:border-gray-700 bg-blue-600 text-white text-xs font-semibold uppercase tracking-wider sticky top-[53px]">
                        <div className="flex px-4 py-2">
                            {displayColumns.map((col, idx) => (
                                <div key={idx} className={`${col.width || 'flex-1'} px-2`}>
                                    {col.header}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Options List */}
                    <div className="overflow-y-auto max-h-[300px]">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => (
                                <div
                                    key={option.id}
                                    className={`
                                        flex px-4 py-2 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors
                                        ${value === option.id ? 'bg-blue-50 dark:bg-gray-700' : ''}
                                    `}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelect(option);
                                    }}
                                >
                                    {displayColumns.map((col, idx) => (
                                        <div key={idx} className={`${col.width || 'flex-1'} px-2 text-sm text-gray-700 dark:text-gray-300 ${col.className || ''}`}>
                                            {option[col.field] ?? '-'}
                                        </div>
                                    ))}
                                </div>
                            ))
                        ) : (
                            <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                                Tidak ada data yang cocok.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
        </div>
    );
}
