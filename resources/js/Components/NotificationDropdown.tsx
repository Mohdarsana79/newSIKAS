import React, { useState, useEffect, useRef } from 'react';
import NotificationModal from './NotificationModal';
import PajakReminderModal from './PajakReminderModal';
import { usePage } from '@inertiajs/react';

interface NotificationItem {
    type: 'terima_pajak' | 'setor_pajak';
    month: number;
    year: number;
    count: number;
    month_name: string;
}

export default function NotificationDropdown() {
    const { flash } = usePage<any>().props;
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
    const [showReminder, setShowReminder] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = () => {
        fetch('/api/notifications/pajak')
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    // Filter Setor Pajak notifications that have been read
                    const filtered = data.data.filter((item: NotificationItem) => {
                        if (item.type === 'setor_pajak') {
                            const isRead = localStorage.getItem(`read_setor_${item.year}_${item.month}`);
                            return !isRead;
                        }
                        return true;
                    });
                    setNotifications(filtered);

                    // Check if there are any unpaid taxes for the login reminder
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

        // Optional: Poll every few minutes
        const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    // Close dropdown when clicking outside
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
        // Mark Setor Pajak as read
        if (item.type === 'setor_pajak') {
            localStorage.setItem(`read_setor_${item.year}_${item.month}`, 'true');
            // Remove from current list visually
            setNotifications(prev => prev.filter(n => !(n.type === 'setor_pajak' && n.month === item.month && n.year === item.year)));
        }
        
        setSelectedNotification(item);
        setIsOpen(false);
    };

    const unreadCount = notifications.length;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-indigo-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
            >
                <span className="sr-only">View notifications</span>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-gray-800">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown menu */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-gray-800 dark:ring-gray-700 z-50">
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Notifikasi</p>
                        <span className="bg-indigo-100 text-indigo-800 text-xs font-semibold px-2.5 py-0.5 rounded-full dark:bg-indigo-900 dark:text-indigo-300">
                            {unreadCount} Baru
                        </span>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length > 0 ? (
                            notifications.map((item, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleNotificationClick(item)}
                                    className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition duration-150 ease-in-out border-b border-gray-100 dark:border-gray-700/50 last:border-0 flex items-start"
                                >
                                    <div className="flex-shrink-0 mt-1 mr-3">
                                        {item.type === 'terima_pajak' ? (
                                            <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
                                                <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                        ) : (
                                            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                                                <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {item.type === 'terima_pajak' ? 'Terima Pajak' : 'Setor Pajak'}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            {item.type === 'terima_pajak' 
                                                ? `Terdapat pajak belum dibayar untuk bulan ${item.month_name} ${item.year}.`
                                                : `Pajak bulan ${item.month_name} ${item.year} telah disetor.`}
                                        </p>
                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 font-medium">
                                            {item.count} TRANSAKSI
                                        </p>
                                    </div>
                                </button>
                            ))
                        ) : (
                            <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                                <svg className="mx-auto h-8 w-8 text-gray-400 dark:text-gray-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                                Tidak ada notifikasi baru
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal for Details */}
            <NotificationModal 
                show={!!selectedNotification} 
                onClose={() => {
                    setSelectedNotification(null);
                    fetchNotifications(); // Refresh to ensure correct state after close
                }}
                notification={selectedNotification}
            />

            {/* Login Reminder Modal */}
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
