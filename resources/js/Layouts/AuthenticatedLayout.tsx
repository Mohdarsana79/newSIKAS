import Sidebar from '@/Components/Sidebar';
import Navbar from '@/Components/Navbar';
import { PropsWithChildren, ReactNode, useEffect, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import useVariantRoute from '@/Hooks/useVariantRoute';
import ChangelogModal from '@/Components/ChangelogModal';
import Toast from '@/Components/Toast';
import UpdateAvailableToast from '@/Components/UpdateAvailableToast';
import CopilotDrawer from '@/Components/Ai/CopilotDrawer';

export type CopilotWindowState = 'closed' | 'normal' | 'minimized' | 'maximized';

const AUTO_BACKUP_HEARTBEAT_KEY = 'sikas:auto-backup:last-heartbeat';
const HEARTBEAT_THROTTLE_MS = 60_000;
const HEARTBEAT_INTERVAL_MS = 5 * 60_000;

/**
 * App shell SIKAS Neo-Bento:
 * - Kanvas aurora lembut dengan sidebar mengambang (12px dari tepi browser).
 * - Konten utama berjarak dari sidebar, transisi halus saat rail diciutkan.
 * - Navbar kaca melayang (sticky) dengan padanan dark mode.
 */
export default function Authenticated({
    header,
    children,
}: PropsWithChildren<{ header?: ReactNode }>) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [copilotState, setCopilotState] = useState<CopilotWindowState>('closed');
    const { auth } = usePage<PageProps>().props;
    const vRoute = useVariantRoute();
    const canWriteBackup = auth?.permissions?.modules?.backup === 'write';
    const heartbeatInFlightRef = useRef(false);

    // Tutup / ciutkan sidebar otomatis hanya di bawah 1024px (HP/tablet); di laptop & PC (>= 1024px, skala 80%) biarkan terbuka.
    useEffect(() => {
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
            setSidebarOpen(false);
        }
    }, []);

    // In-App Zero-Setup Auto-Backup Heartbeat (terkoordinasi lintas tab via localStorage, online & offline, serta auto-retry saat online kembali)
    useEffect(() => {
        if (typeof window === 'undefined' || !canWriteBackup) return;

        let cancelled = false;
        const triggerHeartbeat = (bypassThrottle = false) => {
            if (cancelled || heartbeatInFlightRef.current) return;
            try {
                const now = Date.now();
                if (!bypassThrottle) {
                    const lastTs = Number(window.localStorage.getItem(AUTO_BACKUP_HEARTBEAT_KEY) || '0');
                    if (now - lastTs < HEARTBEAT_THROTTLE_MS) {
                        return;
                    }
                }
                window.localStorage.setItem(AUTO_BACKUP_HEARTBEAT_KEY, String(now));
                heartbeatInFlightRef.current = true;
                window.axios
                    .post(vRoute('backup.auto-heartbeat'), {
                        online: typeof navigator !== 'undefined' ? navigator.onLine : true,
                    })
                    .catch(() => {
                        // Fail-safe: jangan pernah mengganggu aktivitas pengguna
                    })
                    .finally(() => {
                        heartbeatInFlightRef.current = false;
                    });
            } catch {
                heartbeatInFlightRef.current = false;
            }
        };

        const initialTimer = window.setTimeout(() => triggerHeartbeat(false), 3_000);
        const intervalId = window.setInterval(() => triggerHeartbeat(false), HEARTBEAT_INTERVAL_MS);
        const handleOnline = () => triggerHeartbeat(true);
        window.addEventListener('online', handleOnline);

        return () => {
            cancelled = true;
            window.clearTimeout(initialTimer);
            window.clearInterval(intervalId);
            window.removeEventListener('online', handleOnline);
        };
    }, [canWriteBackup]);

    return (
        <div className="sikas-canvas min-h-screen font-sans text-slate-900 antialiased selection:bg-lime-200 selection:text-slate-950 dark:text-slate-100 dark:selection:bg-lime-400/30 dark:selection:text-white">
            <Toast />
            <UpdateAvailableToast sidebarOpen={sidebarOpen} />
            <ChangelogModal />
            <CopilotDrawer
                copilotState={copilotState}
                setCopilotState={setCopilotState}
                sidebarOpen={sidebarOpen}
            />

            {/* Sidebar mengambang */}
            <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

            {/* Kolom konten */}
            <div
                className={`flex min-h-screen flex-col transition-[padding] duration-300 ease-out ${
                    sidebarOpen ? 'lg:pl-[276px]' : 'lg:pl-[98px]'
                }`}
            >
                <Navbar
                    header={header}
                    sidebarOpen={sidebarOpen}
                    setSidebarOpen={setSidebarOpen}
                    copilotState={copilotState}
                    setCopilotState={setCopilotState}
                />

                <main className="flex-1 overflow-x-clip">
                    <div className="px-3 pb-6 pt-5 sm:px-4 sm:pt-6 lg:px-5">{children}</div>
                </main>
            </div>
        </div>
    );
}
