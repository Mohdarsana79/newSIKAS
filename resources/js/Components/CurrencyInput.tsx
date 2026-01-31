import React, { useRef, useEffect } from 'react';


interface CurrencyInputProps {
    id?: string;
    name?: string;
    value: string | number;
    onValueChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    required?: boolean;
    autoFocus?: boolean;
}

const CurrencyInput = ({
    id,
    name,
    value,
    onValueChange,
    placeholder,
    className = "",
    disabled = false,
    required = false,
    autoFocus = false
}: CurrencyInputProps) => {
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (autoFocus && inputRef.current) {
            inputRef.current.focus();
        }
    }, [autoFocus]);

    const formatRupiah = (angka: string, prefix: string = "Rp. ") => {
        if (!angka) return "";

        // Convert input to string and handle standard decimal point (.) typically found in JSON/JS numbers
        let numberString = angka.toString();

        // If it contains a dot and no comma, assume the dot is a decimal separator (standard JS float)
        // We replace it with comma to match the logic below which expects comma as decimal separator (Indo format)
        if (numberString.indexOf('.') !== -1 && numberString.indexOf(',') === -1) {
            numberString = numberString.replace('.', ',');
        }

        // Remove non-numeric chars except comma
        const cleanString = numberString.replace(/[^,\d]/g, "").toString();

        const split = cleanString.split(",");
        const sisa = split[0].length % 3;
        let rupiah = split[0].substr(0, sisa);
        const ribuan = split[0].substr(sisa).match(/\d{3}/gi);

        if (ribuan) {
            const separator = sisa ? "." : "";
            rupiah += separator + ribuan.join(".");
        }

        rupiah = split[1] !== undefined ? rupiah + "," + split[1] : rupiah;
        return prefix + rupiah;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value;
        // Strip non-numeric except comma
        const cleanValue = rawValue.replace(/[^0-9,]/g, '');

        // Pass parent the raw value (or properly formatted one? usually raw numeric string 10000)
        // For parent state, we usually want "10000". But this component displays "Rp. 10.000".
        // The onValueChange prop suggests passing back the semantic value.
        // Let's pass back the numeric string "10000" (or "10000.50" if comma used).

        let numericValue = cleanValue.replace(/\./g, "").replace(/,/g, ".");
        // But our formatRupiah uses comma as decimal.

        // Let's just pass the raw numbers for now to keep simple, assuming parent handles it?
        // Actually, best practice for these inputs:
        // 1. Parent holds "10000".
        // 2. Component formats to "Rp. 10.000" on display.
        // 3. User types.
        // 4. Component strips format -> "10000" -> parent.

        // However, 'formatRupiah' logic above is standard Indo logic.

        // Improved logic:
        const valueOnlyNumbers = cleanValue.replace(/\./g, ""); // Remove dots
        // Actually regex above /[^,\d]/g handles it.

        // Send to parent the CLEAN numeric string (e.g. 10000)
        // If comma exists, handle decimal?
        // Let's assume integer for now or standard decimal with dot in backend.

        // Convert "10.000" -> "10000"
        // Convert "10.000,50" -> "10000.50"

        let normalized = cleanValue.replace(/\./g, ""); // remove dots (thousands)
        normalized = normalized.replace(/,/g, "."); // comma to dot (decimal)

        onValueChange(normalized);
    };

    // Calculate display value
    const displayValue = value ? formatRupiah(value.toString()) : "";

    return (
        <input
            id={id}
            name={name}
            ref={inputRef}
            type="text"
            className={`border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 rounded-md shadow-sm ${className}`}
            value={displayValue}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
        />
    );
};

export default CurrencyInput;
