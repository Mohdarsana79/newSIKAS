import React, { useState, useEffect, useRef } from 'react';
import NotificationModal from './NotificationModal';
import PajakReminderModal from './PajakReminderModal';
import { usePage } from '@inertiajs/react';
import { Transition } from '@headlessui/react';
import { 
    Bell, 
    AlertTriangle, 
    CheckCircle2, 
    CheckCheck,
    Receipt
} from 'lucide-react';

export interface NotificationItem {
    type: 'terima_pajak' | 'setor_pajak';
    month: number;
    year: number;
    count: number;
    month_name: string;
}

export type NotificationTabType = 'all' | 'terima' | 'setor';

// Helper storage key untuk konsistensi status baca
const getSetorStorageKey = (year: number, month: number) => `read_setor_${year}_${month}`;

export default function NotificationDropdown() {
    const { flash } = usePage<any>().props;
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<NotificationTabType>('all');
    const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
    const [showReminder, setShowReminder] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = () => {
        fetch('/api/notifications/pajak')
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    // Filter Setor Pajak notifications yang sudah ditandai dibaca di localStorage
                    const filtered = data.data.filter((item: NotificationItem) => {
                        if (item.type === 'setor_pajak') {
                            const isRead = localStorage.getItem(getSetorStorageKey(item.year, item.month));
                            return !isRead;
                        }
                        return true;
                    });
                    setNotifications(filtered);

                    // Cek pajak belum dibayar untuk modal pengingat saat login
                    const hasUnpaidTax = filtered.some((item: NotificationItem) => item.type === 'terima_pajak');
                    if (hasUnpaidTax) {
                        const reminderShown = sessionStorage.getItem('pajak_reminder_shown');
                        if (!reminderShown) {
                            if (flash?.show_changelog) {
                                const handleChangelogClosed = () => {
                                    setShowReminder(true);
                                    window.removeEventListener('changelog_closed', handleChangelogClosed);
                                };
                                window.addEventListener('changelog_closed', handleChangelogClosed);
                            } else {
                                setShowReminder(true);
                            }
                        }
                    }
                }
            })
            .catch(err => console.error('Error fetching notifications:', err));
    };

    useEffect(() => {
        fetchNotifications();

        // Polling setiap 5 menit
        const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    // Tutup dropdown saat klik di luar
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNotificationClick = (item: NotificationItem) => {
        // Tandai Setor Pajak sebagai telah dibaca
        if (item.type === 'setor_pajak') {
            localStorage.setItem(getSetorStorageKey(item.year, item.month), 'true');
            // Hapus dari state lokal
            setNotifications(prev => prev.filter(n => !(n.type === 'setor_pajak' && n.month === item.month && n.year === item.year)));
        }

        setSelectedNotification(item);
        setIsOpen(false);
    };

    // Tandai semua setor pajak sebagai dibaca
    const handleMarkAllSetorAsRead = () => {
        notifications.forEach(item => {
            if (item.type === 'setor_pajak') {
                localStorage.setItem(getSetorStorageKey(item.year, item.month), 'true');
            }
        });
        setNotifications(prev => prev.filter(n => n.type !== 'setor_pajak'));
    };

    const unreadCount = notifications.length;
    const terimaCount = notifications.filter(n => n.type === 'terima_pajak').length;
    const setorCount = notifications.filter(n => n.type === 'setor_pajak').length;
    const hasUnreadSetor = setorCount > 0;

    // Filter berdasarkan tab aktif
    const displayedNotifications = notifications.filter(item => {
        if (activeTab === 'terima') return item.type === 'terima_pajak';
        if (activeTab === 'setor') return item.type === 'setor_pajak';
        return true;
    });

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`relative flex h-9 w-9 items-center justify-center rounded-xl border transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-lime-200/60 ${
                    isOpen
                        ? 'border-brand-300 bg-brand-50 text-brand-600 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300'
                        : 'border-slate-100 bg-white text-slate-500 shadow-sm hover:-translate-y-0.5 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-white'
                }`}
                aria-label="Buka notifikasi"
                aria-expanded={isOpen}
            >
                <span className="sr-only">Lihat notifikasi</span>
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-peach px-1 text-[8.5px] font-extrabold text-slate-950 shadow-sm ring-2 ring-white dark:ring-[#0D0F17]">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Menu dengan Animasi Headless UI Transition */}
            <Transition
                show={isOpen}
                enter="transition ease-out duration-200"
                enterFrom="opacity-0 scale-95 -translate-y-1"
                enterTo="opacity-100 scale-100 translate-y-0"
                leave="transition ease-in duration-150"
                leaveFrom="opacity-100 scale-100 translate-y-0"
                leaveTo="opacity-0 scale-95 -translate-y-1"
            >
                <div className="absolute right-0 z-50 mt-2 w-[330px] sm:w-[390px] origin-top-right overflow-hidden rounded-2xl border border-white/80 bg-white/95 shadow-float backdrop-blur-xl dark:border-white/10 dark:bg-[#15131F]/95">
                    {/* Header Popover */}
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-white/5">
                        <div className="flex items-center gap-2">
                            <p className="text-[13px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                Notifikasi
                            </p>
                            {unreadCount > 0 && (
                                <span className="rounded-full bg-pastel-lavender px-2 py-0.5 text-[9.5px] font-extrabold text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                                    {unreadCount} Baru
                                </span>
                            )}
                        </div>

                        {hasUnreadSetor && (
                            <button
                                type="button"
                                onClick={handleMarkAllSetorAsRead}
                                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-500 transition hover:bg-slate-100 hover:text-brand-600 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-brand-300"
                                title="Tandai semua riwayat setor sebagai dibaca"
                            >
                                <CheckCheck className="h-3.5 w-3.5" />
                                <span>Tandai semua dibaca</span>
                            </button>
                        )}
                    </div>

                    {/* Filter Tabs Mini */}
                    <div className="flex items-center gap-1 border-b border-slate-100 bg-slate-50/50 p-1.5 dark:border-white/5 dark:bg-white/[0.02]">
                        <button
                            type="button"
                            onClick={() => setActiveTab('all')}
                            className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-1 text-[10.5px] font-bold transition ${
                                activeTab === 'all'
                                    ? 'bg-white text-slate-900 shadow-sm dark:bg-white/10 dark:text-white'
                                    : 'text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300'
                            }`}
                        >
                            <span>Semua</span>
                            <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[9px] dark:bg-white/10">
                                {notifications.length}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('terima')}
                            className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-1 text-[10.5px] font-bold transition ${
                                activeTab === 'terima'
                                    ? 'bg-white text-amber-700 shadow-sm dark:bg-white/10 dark:text-amber-400'
                                    : 'text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300'
                            }`}
                        >
                            <span>Perlu Disetor</span>
                            {terimaCount > 0 && (
                                <span className="rounded-full bg-amber-100 px-1.5 py-0.2 text-[9px] font-extrabold text-amber-700 dark:bg-amber-400/20 dark:text-amber-300">
                                    {terimaCount}
                                </span>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('setor')}
                            className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-1 text-[10.5px] font-bold transition ${
                                activeTab === 'setor'
                                    ? 'bg-white text-emerald-700 shadow-sm dark:bg-white/10 dark:text-emerald-400'
                                    : 'text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300'
                            }`}
                        >
                            <span>Sudah Disetor</span>
                            {setorCount > 0 && (
                                <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[9px] font-extrabold text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-300">
                                    {setorCount}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Daftar Item Notifikasi */}
                    <div className="sikas-scroll max-h-[360px] overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
                        {displayedNotifications.length > 0 ? (
                            displayedNotifications.map((item, index) => {
                                const isTerima = item.type === 'terima_pajak';
                                return (
                                    <button
                                        key={`${item.type}-${item.year}-${item.month}-${index}`}
                                        type="button"
                                        onClick={() => handleNotificationClick(item)}
                                        className="group relative flex w-full items-start gap-3 p-3.5 text-left transition hover:bg-slate-50/80 dark:hover:bg-white/[0.04]"
                                    >
                                        {/* Avatar Icon Pastel */}
                                        <span
                                            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition duration-200 group-hover:scale-105 ${
                                                isTerima
                                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                                                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                                            }`}
                                        >
                                            {isTerima ? (
                                                <AlertTriangle className="h-4.5 w-4.5" />
                                            ) : (
                                                <CheckCircle2 className="h-4.5 w-4.5" />
                                            )}
                                        </span>

                                        {/* Informasi Notifikasi */}
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-1">
                                                <div className="flex items-center gap-1.5 truncate">
                                                    {/* Titik Indikator Unread */}
                                                    <span className="relative flex h-2 w-2 shrink-0">
                                                        {isTerima ? (
                                                            <>
                                                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                                                                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                                                            </>
                                                        ) : (
                                                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                                                        )}
                                                    </span>
                                                    <p className="truncate text-[11.5px] font-extrabold text-slate-900 dark:text-white">
                                                        {isTerima ? 'Terima Pajak (Belum Disetor)' : 'Pajak Sudah Disetor'}
                                                    </p>
                                                </div>
                                                <span
                                                    className={`shrink-0 rounded-md px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase tracking-wide ${
                                                        isTerima
                                                            ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20'
                                                            : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20'
                                                    }`}
                                                >
                                                    {isTerima ? 'Perlu Disetor' : 'Lunas'}
                                                </span>
                                            </div>

                                            <p className="mt-1 text-[10.5px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                                                {isTerima
                                                    ? `Terdapat transaksi pungut pajak periode ${item.month_name} ${item.year} yang belum memiliki NTPN.`
                                                    : `Pajak periode ${item.month_name} ${item.year} telah disetor dan tersimpan.`}
                                            </p>

                                            <div className="mt-2 flex items-center justify-between text-[9px] font-bold text-slate-400 dark:text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    <Receipt className="h-3 w-3" />
                                                    {item.count} transaksi
                                                </span>
                                                <span className="flex items-center gap-1 text-brand-600 dark:text-brand-300 group-hover:underline">
                                                    Lihat rincian →
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        ) : (
                            /* Empty State */
                            <div className="px-4 py-10 text-center">
                                <div className="mx-auto mb-2.5 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500">
                                    <Bell className="h-5 w-5" />
                                </div>
                                <p className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200">
                                    Tidak ada notifikasi
                                </p>
                                <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                                    {activeTab === 'all'
                                        ? 'Semua kewajiban pajak telah terselesaikan dengan baik.'
                                        : activeTab === 'terima'
                                        ? 'Tidak ada pajak tertunggak yang perlu disetor.'
                                        : 'Belum ada riwayat setor pajak baru.'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </Transition>

            {/* Modal Detail Notifikasi */}
            <NotificationModal
                show={!!selectedNotification}
                onClose={() => {
                    setSelectedNotification(null);
                    fetchNotifications();
                }}
                notification={selectedNotification}
            />

            {/* Modal Pengingat Login */}
            <PajakReminderModal
                show={showReminder}
                onClose={() => {
                    setShowReminder(false);
                    sessionStorage.setItem('pajak_reminder_shown', 'true');
                }}
            />
        </div>
    );
}
