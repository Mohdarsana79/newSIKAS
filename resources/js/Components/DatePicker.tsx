import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { Calendar } from "@/Components/ui/calendar"
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { cn } from "@/lib/utils"
import { id } from "date-fns/locale"

interface DatePickerProps {
    value?: Date | string;
    onChange: (date: Date | undefined) => void;
    placeholder?: string;
    className?: string;
    disabled?: any;
    startMonth?: Date;
    endMonth?: Date;
    inputDisabled?: boolean;
    id?: string;
    minDate?: Date;
    maxDate?: Date;
}

export default function DatePicker({ value, onChange, placeholder = "Pilih tanggal", className, disabled, startMonth, endMonth, inputDisabled, id: elementId, minDate, maxDate }: DatePickerProps) {
    const dateValue = value ? new Date(value) : undefined;

    // Combine custom disabled logic with min/max date logic
    const disabledDays = disabled || (
        (minDate || maxDate)
            ? {
                before: minDate,
                after: maxDate
            }
            : undefined
    );

    return (
        <Popover className="relative w-full">
            <PopoverButton
                id={elementId}
                disabled={inputDisabled}
                className={cn(
                    "w-full justify-start text-left font-normal flex items-center px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500",
                    !dateValue && "text-muted-foreground",
                    inputDisabled && "opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800",
                    className
                )}>
                <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
                {dateValue ? format(dateValue, "PPP", { locale: id }) : <span className="text-gray-500">{placeholder}</span>}
            </PopoverButton>

            <PopoverPanel className="absolute z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg p-0 w-auto">
                {({ close }) => (
                    <Calendar
                        mode="single"
                        selected={dateValue}
                        onSelect={(date) => {
                            onChange(date);
                            close();
                        }}
                        initialFocus
                        captionLayout="dropdown"
                        startMonth={startMonth || new Date(1900, 0)}
                        endMonth={endMonth || new Date(new Date().getFullYear() + 10, 11)}
                        locale={id}
                        disabled={disabledDays}
                    />
                )}
            </PopoverPanel>
        </Popover>
    )
}
