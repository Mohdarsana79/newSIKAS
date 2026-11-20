import { ReactNode, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import Surface from '@/Components/ui/Surface';
import IconTile from '@/Components/ui/IconTile';
import { cn } from '@/lib/utils';

export type CalendarWidgetProps = {
    className?: string;
    footer?: ReactNode;
};

const DAYS = ['M', 'S', 'S', 'R', 'K', 'J', 'S']; // Minggu, Senin, Selasa, Rabu, Kamis, Jumat, Sabtu

const MONTH_NAMES = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export function CalendarWidget({ className = '', footer }: CalendarWidgetProps) {
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
            className={cn('h-full', className)}
            bodyClassName="flex flex-col justify-between gap-3"
            padding="md"
            icon={
                <IconTile tone="ink" size="md">
                    <CalendarDays />
                </IconTile>
            }
            title="Kalender & Tahapan BOSP"
            subtitle={`${MONTH_NAMES[month]} ${year}`}
            actions={
                <div className="flex items-center gap-1 rounded-xl border border-slate-100 bg-slate-50/80 p-0.5 dark:border-white/10 dark:bg-white/5">
                    <button
                        type="button"
                        onClick={handlePrev}
                        className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white hover:text-slate-900 hover:shadow-sm dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                        aria-label="Bulan sebelumnya"
                    >
                        <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={handleNext}
                        className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white hover:text-slate-900 hover:shadow-sm dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                        aria-label="Bulan berikutnya"
                    >
                        <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                </div>
            }
        >
            <div className="rounded-2xl border border-slate-100/90 bg-slate-50/60 px-2.5 py-2 dark:border-white/5 dark:bg-white/[0.02]">
                {/* Nama Hari */}
                <div className="mb-1 grid grid-cols-7 text-center">
                    {DAYS.map((d, idx) => (
                        <span
                            key={idx}
                            className="text-[8.5px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500"
                        >
                            {d}
                        </span>
                    ))}
                </div>

                {/* Grid Tanggal */}
                <div className="grid grid-cols-7 gap-y-0.5 text-center">
                    {calendarCells.map((cell, idx) => {
                        return (
                            <div
                                key={idx}
                                className="flex h-6 items-center justify-center"
                            >
                                <span
                                    className={`sikas-num flex h-6 w-6 items-center justify-center rounded-full text-[10px] transition-all ${
                                        cell.isToday
                                            ? 'bg-lime-400 font-extrabold text-slate-950 shadow-lime'
                                            : cell.currentMonth
                                            ? 'font-semibold text-slate-700 hover:bg-white dark:text-slate-300 dark:hover:bg-white/10'
                                            : 'font-medium text-slate-300 dark:text-slate-600'
                                    }`}
                                >
                                    {cell.day}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {footer && (
                <div className="border-t border-slate-100 pt-2.5 dark:border-white/5">
                    {footer}
                </div>
            )}
        </Surface>
    );
}

export default CalendarWidget;
