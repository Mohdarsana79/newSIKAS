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
    const dateValueRaw = value ? (typeof value === 'string' && value.includes('-') ? (
        (() => {
            // Ambil hanya bagian tanggal (sebelum spasi atau huruf T pada ISO string)
            const datePart = value.split(/[ T]/)[0];
            const [y, m, d] = datePart.split('-').map(Number);
            return new Date(y, m - 1, d);
        })()
    ) : new Date(value)) : undefined;

    const dateValue = (dateValueRaw instanceof Date && !isNaN(dateValueRaw.getTime())) ? dateValueRaw : undefined;

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
                    "flex w-full items-center justify-start rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-left text-[12px] font-semibold text-slate-800 shadow-sm transition focus:outline-none focus-visible:border-lime-400 focus-visible:ring-4 focus-visible:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white",
                    !dateValue && "text-slate-400 dark:text-slate-500",
                    inputDisabled && "cursor-not-allowed bg-slate-100 opacity-60 dark:bg-white/5",
                    className
                )}>
                <CalendarIcon className="mr-2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                {dateValue ? format(dateValue, "PPP", { locale: id }) : <span className="text-slate-400 dark:text-slate-500">{placeholder}</span>}
            </PopoverButton>

            <PopoverPanel
                portal
                anchor={{ to: 'bottom start', gap: 6, padding: 12 }}
                className="z-[9999] w-auto rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-float dark:border-white/10 dark:bg-[#15131F]"
            >
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
