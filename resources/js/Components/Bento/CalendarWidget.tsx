import { useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import Surface from '@/Components/ui/Surface';
import IconTile from '@/Components/ui/IconTile';

export type CalendarWidgetProps = {
    className?: string;
};

const DAYS = ['M', 'S', 'S', 'R', 'K', 'J', 'S']; // Minggu, Senin, Selasa, Rabu, Kamis, Jumat, Sabtu

const MONTH_NAMES = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export function CalendarWidget({ className = '' }: CalendarWidgetProps) {
    const today = new Date();
    const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const handlePrev = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const handleNext = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    // Bangun sel kalender
    const calendarCells = [];

    // Hari dari bulan sebelumnya
    for (let i = firstDayIndex - 1; i >= 0; i--) {
        calendarCells.push({
            day: prevMonthDays - i,
            currentMonth: false,
            isToday: false,
        });
    }

    // Hari bulan ini
    for (let d = 1; d <= daysInMonth; d++) {
        const isToday =
            d === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear();

        calendarCells.push({
            day: d,
            currentMonth: true,
            isToday,
        });
    }

    // Hari bulan berikutnya hingga total 35 atau 42
    const totalSlots = calendarCells.length > 35 ? 42 : 35;
    const remaining = totalSlots - calendarCells.length;
    for (let n = 1; n <= remaining; n++) {
        calendarCells.push({
            day: n,
            currentMonth: false,
            isToday: false,
        });
    }

    return (
        <Surface
            className={className}
            padding="sm"
            icon={
                <IconTile tone="ink" size="sm">
                    <CalendarDays />
                </IconTile>
            }
            title="Kalender Keuangan"
            subtitle={`${MONTH_NAMES[month]} ${year}`}
            actions={
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={handlePrev}
                        className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-50 hover:text-slate-800 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-white"
                        aria-label="Bulan sebelumnya"
                    >
                        <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={handleNext}
                        className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-50 hover:text-slate-800 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-white"
                        aria-label="Bulan berikutnya"
                    >
                        <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                </div>
            }
        >
            {/* Nama Hari */}
            <div className="grid grid-cols-7 gap-y-1 text-center">
                {DAYS.map((d, idx) => (
                    <span
                        key={idx}
                        className="text-[8.5px] font-extrabold uppercase tracking-wider text-slate-300 dark:text-slate-600"
                    >
                        {d}
                    </span>
                ))}
            </div>

            {/* Grid Tanggal */}
            <div className="grid grid-cols-7 gap-y-1 text-center">
                {calendarCells.map((cell, idx) => {
                    return (
                        <div
                            key={idx}
                            className="flex h-7 items-center justify-center"
                        >
                            <span
                                className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] transition-all ${
                                    cell.isToday
                                        ? 'bg-lime-400 font-extrabold text-slate-950 shadow-lime'
                                        : cell.currentMonth
                                        ? 'font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10'
                                        : 'font-semibold text-slate-300 dark:text-slate-600'
                                }`}
                            >
                                {cell.day}
                            </span>
                        </div>
                    );
                })}
            </div>
        </Surface>
    );
}

export default CalendarWidget;
