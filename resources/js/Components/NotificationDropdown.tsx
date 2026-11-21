import type { PageProps } from '@/types';
import { Transition } from '@headlessui/react';
import { router, usePage } from '@inertiajs/react';
import axios from 'axios';
import {
    AlertTriangle,
    ArrowRight,
    Bell,
    CheckCheck,
    CheckCircle2,
    ClipboardCheck,
    FileWarning,
    Receipt,
    RefreshCw,
    RotateCcw,
    Send,
    Sparkles,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import NotificationModal from './NotificationModal';
import PajakReminderModal from './PajakReminderModal';

export interface NotificationItem {
    type: 'terima_pajak' | 'setor_pajak';
    month: number;
    year: number;
    count: number;
    month_name: string;
    variant?: string;
    variant_label?: string;
    bku_url?: string;
}

export interface UnifiedNotificationItem {
    id: string;
    source: 'db' | 'live' | 'pajak';
    db_id: number | null;
    notification_key: string | null;
    category: 'workflow' | 'pajak';
    type: string;
    tone: 'info' | 'warning' | 'danger' | 'success' | 'violet';
    variant: string;
    variant_label: string;
    title: string;
    message: string;
    action_url: string | null;
    action_label: string;
    is_read: boolean;
    dismissible: boolean;
    created_at_human: string;
    meta: NotificationItem | null;
}

interface UnifiedNotificationResponse {
    items: UnifiedNotificationItem[];
    counts: {
        all: number;
        workflow: number;
        pajak: number;
        unread: number;
        dismissible_unread: number;
    };
    can_view_pajak: boolean;
    show_pajak_reminder: boolean;
}

export type NotificationTabType = 'all' | 'workflow' | 'pajak';

const VARIANT_CHIP_STYLE: Record<string, string> = {
    reguler: 'bg-pastel-lavender text-brand-700 dark:bg-brand-500/15 dark:text-brand-300',
    kinerja: 'bg-pastel-sky text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
    silpa: 'bg-pastel-amber text-amber-700 dark:bg-amber-400/15 dark:text-amber-300',
    kinerja_silpa: 'bg-pastel-mint text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
};

const ICON_TONE_STYLE: Record<UnifiedNotificationItem['tone'], string> = {
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    danger: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    violet: 'bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300',
    info: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
};

const POLL_INTERVAL_MS = 60 * 1000;
const REFRESH_THROTTLE_MS = 10 * 1000;

function isSafeRelativeUrl(url: string | null | undefined): url is string {
    return typeof url === 'string' && url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/\\');
}

function renderItemIcon(type: string) {
    switch (type) {
        case 'rkas_revision_requested':
        case 'live_rkas_needs_revision':
            return <FileWarning className="h-4 w-4" aria-hidden="true" />;
        case 'rkas_revision_resubmitted':
        case 'live_rkas_pending_rereview':
            return <Send className="h-4 w-4" aria-hidden="true" />;
        case 'live_rkas_pending_approval':
            return <ClipboardCheck className="h-4 w-4" aria-hidden="true" />;
        case 'rkas_unapproved':
            return <RotateCcw className="h-4 w-4" aria-hidden="true" />;
        case 'rkas_approved':
        case 'rkas_item_approved':
        case 'setor_pajak':
            return <CheckCircle2 className="h-4 w-4" aria-hidden="true" />;
        case 'terima_pajak':
            return <AlertTriangle className="h-4 w-4" aria-hidden="true" />;
        default:
            return <Bell className="h-4 w-4" aria-hidden="true" />;
    }
}

function isUrgentItem(item: UnifiedNotificationItem): boolean {
    return (
        item.type === 'terima_pajak' ||
        item.type === 'rkas_revision_requested' ||
        item.type === 'rkas_revision_resubmitted' ||
        item.type === 'rkas_unapproved' ||
        item.type.startsWith('live_rkas_')
    );
}

export default function NotificationDropdown() {
    const { props } = usePage<PageProps<{ flash?: { show_changelog?: boolean } }>>();
    const showChangelog = Boolean(props.flash?.show_changelog);
    const showChangelogRef = useRef<boolean>(showChangelog);
    showChangelogRef.current = showChangelog;

    const [feed, setFeed] = useState<UnifiedNotificationResponse>({
        items: [],
        counts: { all: 0, workflow: 0, pajak: 0, unread: 0, dismissible_unread: 0 },
        can_view_pajak: false,
        show_pajak_reminder: false,
    });
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isMarkingAll, setIsMarkingAll] = useState(false);
    const [activeTab, setActiveTab] = useState<NotificationTabType>('all');
    const [selectedPajak, setSelectedPajak] = useState<NotificationItem | null>(null);
    const [showReminder, setShowReminder] = useState(false);
    const [waitingForChangelog, setWaitingForChangelog] = useState(false);

    const dropdownRef = useRef<HTMLDivElement>(null);
    const lastFetchedAtRef = useRef<number>(0);
    const reminderCheckedRef = useRef<boolean>(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const isMountedRef = useRef<boolean>(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            abortControllerRef.current?.abort();
        };
    }, []);

    // Listener bersih dengan cleanup untuk menunda PajakReminderModal hingga ChangelogModal ditutup
    useEffect(() => {
        if (!waitingForChangelog) return;

        const handleChangelogClosed = () => {
            setWaitingForChangelog(false);
            setShowReminder(true);
        };

        window.addEventListener('changelog_closed', handleChangelogClosed);
        return () => {
            window.removeEventListener('changelog_closed', handleChangelogClosed);
        };
    }, [waitingForChangelog]);

    const fetchNotifications = useCallback(async (force = false) => {
        const now = Date.now();
        if (!force && now - lastFetchedAtRef.current < REFRESH_THROTTLE_MS) {
            return;
        }
        lastFetchedAtRef.current = now;

        abortControllerRef.current?.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setIsLoading(true);

        try {
            const res = await axios.get<{ success: boolean; data: UnifiedNotificationResponse }>(
                route('api.notifications.unified'),
                { signal: controller.signal },
            );

            if (!isMountedRef.current || controller.signal.aborted) return;

            if (res.data?.success && res.data.data) {
                const data = res.data.data;
                setFeed(data);

                if (!data.can_view_pajak) {
                    setActiveTab((prev) => (prev === 'pajak' ? 'all' : prev));
                }

                // Popup pengingat pajak saat login hanya untuk akun dengan izin tulis Penatausahaan (Bendahara)
                if (data.show_pajak_reminder && !reminderCheckedRef.current) {
                    reminderCheckedRef.current = true;
                    const alreadyShown = sessionStorage.getItem('pajak_reminder_shown');
                    if (!alreadyShown) {
                        if (showChangelogRef.current) {
                            setWaitingForChangelog(true);
                        } else {
                            setShowReminder(true);
                        }
                    }
                }
            }
        } catch (err) {
            if (!axios.isCancel(err)) {
                console.error('Gagal memuat notifikasi terpadu:', err);
            }
        } finally {
            if (isMountedRef.current && !controller.signal.aborted) {
                setIsLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        void fetchNotifications(true);

        const interval = window.setInterval(() => {
            if (document.visibilityState === 'visible') {
                void fetchNotifications(true);
            }
        }, POLL_INTERVAL_MS);

        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                void fetchNotifications(false);
            }
        };

        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            window.clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [fetchNotifications]);

    // Tutup dropdown saat klik di luar atau tekan Escape
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    const handleToggleOpen = () => {
        const nextOpen = !isOpen;
        setIsOpen(nextOpen);
        if (nextOpen) {
            void fetchNotifications(false);
        }
    };

    const removeItemLocally = (target: UnifiedNotificationItem) => {
        setFeed((prev) => {
            const remaining = prev.items.filter((entry) => entry.id !== target.id);
            const workflowCount = remaining.filter((entry) => entry.category === 'workflow').length;
            const pajakCount = remaining.filter((entry) => entry.category === 'pajak').length;
            const dismissibleUnread = remaining.filter((entry) => entry.dismissible && !entry.is_read).length;

            return {
                ...prev,
                items: remaining,
                counts: {
                    all: remaining.length,
                    workflow: workflowCount,
                    pajak: pajakCount,
                    unread: remaining.length,
                    dismissible_unread: dismissibleUnread,
                },
            };
        });
    };

    const handleItemClick = (item: UnifiedNotificationItem) => {
        setIsOpen(false);

        const shouldPersistRead = item.dismissible && (item.db_id || item.notification_key);
        if (shouldPersistRead) {
            removeItemLocally(item);
        }

        if (item.category === 'pajak' && item.meta) {
            // Buka modal rincian segera tanpa menunda koneksi
            setSelectedPajak(item.meta);
            if (shouldPersistRead) {
                void axios
                    .post(route('api.notifications.read'), {
                        db_id: item.db_id,
                        notification_key: item.notification_key,
                    })
                    .catch((err) => {
                        console.error('Gagal menandai notifikasi pajak dibaca:', err);
                        void fetchNotifications(true);
                    });
            }
            return;
        }

        const navigate = () => {
            if (isSafeRelativeUrl(item.action_url)) {
                router.visit(item.action_url);
            }
        };

        if (shouldPersistRead) {
            void axios
                .post(route('api.notifications.read'), {
                    db_id: item.db_id,
                    notification_key: item.notification_key,
                })
                .catch((err) => {
                    console.error('Gagal menandai notifikasi workflow dibaca:', err);
                    void fetchNotifications(true);
                })
                .finally(navigate);
            return;
        }

        navigate();
    };

    const handleMarkAllAsRead = async () => {
        if (isMarkingAll || feed.counts.dismissible_unread === 0) return;
        setIsMarkingAll(true);

        try {
            await axios.post(route('api.notifications.read-all'), {
                category: activeTab,
            });
            await fetchNotifications(true);
        } catch (err) {
            console.error('Gagal menandai semua notifikasi dibaca:', err);
        } finally {
            if (isMountedRef.current) {
                setIsMarkingAll(false);
            }
        }
    };

    const displayedItems = feed.items.filter((item) => {
        if (activeTab === 'workflow') return item.category === 'workflow';
        if (activeTab === 'pajak') return item.category === 'pajak';
        return true;
    });

    const unreadCount = feed.counts.unread;
    const hasUrgent = feed.items.some(isUrgentItem);
    const activeTabDismissibleCount = displayedItems.filter((item) => item.dismissible && !item.is_read).length;

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={handleToggleOpen}
                className={`relative flex h-9 w-9 items-center justify-center rounded-xl border transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-lime-200/60 ${
                    isOpen
                        ? 'border-brand-300 bg-brand-50 text-brand-600 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300'
                        : 'border-slate-100 bg-white text-slate-500 shadow-sm hover:-translate-y-0.5 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-white'
                }`}
                aria-label={
                    unreadCount > 0
                        ? `Buka pusat notifikasi (${unreadCount} aktif)`
                        : 'Buka pusat notifikasi'
                }
                aria-expanded={isOpen}
                aria-haspopup="true"
                aria-controls="sikas-notification-popover"
            >
                <Bell className="h-4 w-4" aria-hidden="true" />
                {unreadCount > 0 && (
                    <span
                        aria-hidden="true"
                        className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-peach px-1 text-[8.5px] font-extrabold text-slate-950 shadow-sm ring-2 ring-white dark:ring-[#0D0F17]"
                    >
                        {hasUrgent && (
                            <span className="absolute inset-0 animate-ping rounded-full bg-peach opacity-50" />
                        )}
                        <span className="relative">{unreadCount > 9 ? '9+' : unreadCount}</span>
                    </span>
                )}
            </button>

            {/* Popover Neo-Bento */}
            <Transition
                show={isOpen}
                enter="transition ease-out duration-200"
                enterFrom="opacity-0 scale-95 -translate-y-1"
                enterTo="opacity-100 scale-100 translate-y-0"
                leave="transition ease-in duration-150"
                leaveFrom="opacity-100 scale-100 translate-y-0"
                leaveTo="opacity-0 scale-95 -translate-y-1"
            >
                <div
                    id="sikas-notification-popover"
                    role="region"
                    aria-label="Pusat Notifikasi"
                    className="absolute right-0 z-50 mt-2 w-[min(410px,calc(100vw-1.5rem))] origin-top-right overflow-hidden rounded-[26px] border border-white/80 bg-white/95 shadow-float backdrop-blur-xl dark:border-white/10 dark:bg-[#15131F]/95"
                >
                    {/* Header Gelap Neo-Bento */}
                    <div className="relative overflow-hidden bg-[#15131F] px-4 py-3.5 text-white">
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-brand-500/30 blur-2xl"
                        />
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute -bottom-10 -left-8 h-24 w-24 rounded-full bg-lime-400/15 blur-2xl"
                        />

                        <div className="relative flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <span
                                    aria-hidden="true"
                                    className="flex h-7 w-7 items-center justify-center rounded-xl border border-lime-400/30 bg-lime-400/15 text-lime-300"
                                >
                                    <Sparkles className="h-3.5 w-3.5" />
                                </span>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-[13px] font-extrabold tracking-tight text-white">
                                            Pusat Notifikasi
                                        </p>
                                        {unreadCount > 0 && (
                                            <span className="rounded-full bg-lime-400 px-2 py-0.5 text-[9px] font-extrabold text-slate-950">
                                                {unreadCount} Aktif
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[9.5px] font-medium text-white/65">
                                        Workflow RKAS &amp; Pajak 4 Varian BOSP
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => void fetchNotifications(true)}
                                    disabled={isLoading}
                                    title="Muat ulang notifikasi"
                                    aria-label="Muat ulang notifikasi"
                                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/75 transition hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/80 disabled:opacity-50"
                                >
                                    <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
                                </button>

                                {activeTabDismissibleCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => void handleMarkAllAsRead()}
                                        disabled={isMarkingAll}
                                        className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold text-lime-300 transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/80 disabled:opacity-50"
                                        title="Tandai semua notifikasi yang bisa dibaca sebagai selesai dibaca"
                                    >
                                        <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                                        <span>Tandai dibaca</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Tab Filter Pil */}
                    <div
                        role="tablist"
                        aria-label="Filter kategori notifikasi"
                        className="flex items-center gap-1 border-b border-slate-100 bg-slate-50/70 p-1.5 dark:border-white/10 dark:bg-white/[0.02]"
                    >
                        <TabButton
                            active={activeTab === 'all'}
                            label="Semua"
                            count={feed.counts.all}
                            onClick={() => setActiveTab('all')}
                        />
                        <TabButton
                            active={activeTab === 'workflow'}
                            label="Workflow RKAS"
                            count={feed.counts.workflow}
                            accent="violet"
                            onClick={() => setActiveTab('workflow')}
                        />
                        {feed.can_view_pajak && (
                            <TabButton
                                active={activeTab === 'pajak'}
                                label="Pajak"
                                count={feed.counts.pajak}
                                accent="amber"
                                onClick={() => setActiveTab('pajak')}
                            />
                        )}
                    </div>

                    {/* Daftar Item Notifikasi */}
                    <div className="sikas-scroll max-h-[390px] divide-y divide-slate-100 overflow-y-auto dark:divide-white/5">
                        {displayedItems.length > 0 ? (
                            displayedItems.map((item) => {
                                const urgent = isUrgentItem(item);
                                const variantClass =
                                    VARIANT_CHIP_STYLE[item.variant] ||
                                    'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300';

                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => handleItemClick(item)}
                                        className="group relative flex w-full items-start gap-3 p-3.5 text-left transition hover:bg-slate-50/90 focus-visible:bg-slate-50 focus-visible:outline-none dark:hover:bg-white/[0.04] dark:focus-visible:bg-white/[0.04]"
                                    >
                                        <span
                                            aria-hidden="true"
                                            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition duration-200 group-hover:scale-105 ${ICON_TONE_STYLE[item.tone]}`}
                                        >
                                            {renderItemIcon(item.type)}
                                        </span>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex min-w-0 items-center gap-1.5">
                                                    <span aria-hidden="true" className="relative flex h-2 w-2 shrink-0">
                                                        {urgent && (
                                                            <span
                                                                className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                                                                    item.tone === 'warning'
                                                                        ? 'bg-amber-400'
                                                                        : item.tone === 'danger'
                                                                          ? 'bg-rose-400'
                                                                          : 'bg-brand-400'
                                                                }`}
                                                            />
                                                        )}
                                                        <span
                                                            className={`relative inline-flex h-2 w-2 rounded-full ${
                                                                item.tone === 'warning'
                                                                    ? 'bg-amber-500'
                                                                    : item.tone === 'danger'
                                                                      ? 'bg-rose-500'
                                                                      : item.tone === 'success'
                                                                        ? 'bg-emerald-500'
                                                                        : 'bg-brand-500'
                                                            }`}
                                                        />
                                                    </span>
                                                    <p className="truncate text-[11.5px] font-extrabold text-slate-900 dark:text-white">
                                                        {item.title}
                                                    </p>
                                                </div>

                                                <span
                                                    className={`shrink-0 rounded-full px-2 py-0.5 text-[8.5px] font-extrabold ${variantClass}`}
                                                >
                                                    {item.variant_label}
                                                </span>
                                            </div>

                                            <p className="mt-1 line-clamp-3 break-words text-[10.5px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                                                {item.message}
                                            </p>

                                            <div className="mt-2 flex items-center justify-between gap-2 text-[9.5px] font-bold text-slate-400 dark:text-slate-500">
                                                <span className="flex items-center gap-1 truncate">
                                                    {item.category === 'pajak' && item.meta ? (
                                                        <>
                                                            <Receipt className="h-3 w-3 shrink-0" aria-hidden="true" />
                                                            <span>
                                                                {item.meta.count} transaksi · {item.created_at_human}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <span>{item.created_at_human}</span>
                                                    )}
                                                </span>

                                                <span className="inline-flex shrink-0 items-center gap-1 text-brand-600 transition group-hover:translate-x-0.5 dark:text-lime-300">
                                                    <span>{item.action_label}</span>
                                                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        ) : (
                            <div className="px-4 py-10 text-center">
                                <div className="mx-auto mb-2.5 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500">
                                    <Bell className="h-5 w-5" aria-hidden="true" />
                                </div>
                                <p className="text-[12px] font-extrabold text-slate-700 dark:text-slate-200">
                                    Semua beres &amp; terkendali
                                </p>
                                <p className="mt-1 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                                    {activeTab === 'workflow'
                                        ? 'Tidak ada antrean telaah, revisi, atau pengesahan RKAS yang tertunda.'
                                        : activeTab === 'pajak'
                                          ? 'Tidak ada tagihan atau riwayat setor pajak baru pada 4 varian BOSP.'
                                          : 'Belum ada notifikasi workflow RKAS maupun pajak yang perlu ditindaklanjuti.'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </Transition>

            {/* Modal Detail Pajak Multi-Varian */}
            <NotificationModal
                show={selectedPajak !== null}
                onClose={() => {
                    setSelectedPajak(null);
                    void fetchNotifications(true);
                }}
                notification={selectedPajak}
            />

            {/* Modal Pengingat Login (khusus akun dengan izin tulis Penatausahaan / Bendahara) */}
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

function TabButton({
    active,
    label,
    count,
    accent = 'default',
    onClick,
}: {
    active: boolean;
    label: string;
    count: number;
    accent?: 'default' | 'violet' | 'amber';
    onClick: () => void;
}) {
    const activeClass =
        accent === 'violet'
            ? 'bg-white text-brand-700 shadow-sm dark:bg-white/10 dark:text-brand-300'
            : accent === 'amber'
              ? 'bg-white text-amber-700 shadow-sm dark:bg-white/10 dark:text-amber-300'
              : 'bg-white text-slate-900 shadow-sm dark:bg-white/10 dark:text-white';

    const badgeClass =
        accent === 'violet'
            ? 'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300'
            : accent === 'amber'
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-400/20 dark:text-amber-300'
              : 'bg-slate-200/80 text-slate-700 dark:bg-white/10 dark:text-slate-200';

    return (
        <button
            type="button"
            role="tab"
            aria-selected={active}
            onClick={onClick}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-1.5 text-[10.5px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/50 ${
                active
                    ? activeClass
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
        >
            <span className="truncate">{label}</span>
            {count > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-extrabold leading-none ${badgeClass}`}>
                    {count}
                </span>
            )}
        </button>
    );
}
