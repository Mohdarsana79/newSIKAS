import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BentoCard } from './BentoCard';

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
        <BentoCard className={`p-5 ${className}`}>
            {/* Header: Bulan & Tombol Navigasi */}
            <div className="flex items-center justify-between pb-3">
                <span className="font-display text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                    {MONTH_NAMES[month]} {year}
                </span>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={handlePrev}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white transition-colors"
                        aria-label="Bulan sebelumnya"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={handleNext}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white transition-colors"
                        aria-label="Bulan berikutnya"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Nama Hari */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
                {DAYS.map((d, idx) => (
                    <span
                        key={idx}
                        className="text-[11px] font-semibold uppercase text-slate-400 dark:text-slate-500"
                    >
                        {d}
                    </span>
                ))}
            </div>

            {/* Grid Tanggal */}
            <div className="grid grid-cols-7 gap-1 text-center">
                {calendarCells.map((cell, idx) => {
                    return (
                        <div
                            key={idx}
                            className="flex h-8 items-center justify-center relative"
                        >
                            <span
                                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs transition-all ${
                                    cell.isToday
                                        ? 'bg-brand-500 font-bold text-white shadow-glow-violet'
                                        : cell.currentMonth
                                        ? 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 font-medium'
                                        : 'text-slate-300 dark:text-slate-600'
                                }`}
                            >
                                {cell.day}
                            </span>
                        </div>
                    );
                })}
            </div>
        </BentoCard>
    );
}

export default CalendarWidget;

