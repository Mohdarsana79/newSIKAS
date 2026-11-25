import { Transition } from '@headlessui/react';
import { Link, usePage } from '@inertiajs/react';
import axios from 'axios';
import { ArrowUpRight, Download, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { PageProps, SharedSystemUpdate } from '@/types';
import { canAccessFeatureModule } from '@/Utils/featureSearchCatalog';

const DISMISSED_VERSION_SESSION_KEY = 'sikas:update-toast:dismissed-version';
const LAST_BG_CHECK_STORAGE_KEY = 'sikas:system-update:last-bg-check';
const BG_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 jam

interface UpdateAvailableToastProps {
    sidebarOpen?: boolean;
}

function readDismissedVersion(): string {
    if (typeof window === 'undefined') return '';
    try {
        return window.sessionStorage.getItem(DISMISSED_VERSION_SESSION_KEY) || '';
    } catch {
        return '';
    }
}

export default function UpdateAvailableToast({ sidebarOpen = true }: UpdateAvailableToastProps) {
    const { auth, systemUpdate } = usePage<PageProps>().props;
    const canManageUpdate = canAccessFeatureModule(auth?.user, auth?.permissions, 'system_update', 'write');
    const isOnUpdatePage = Boolean(route().current('system-update.*'));

    const [summary, setSummary] = useState<SharedSystemUpdate | null>(systemUpdate ?? null);
    const [dismissedVersion, setDismissedVersion] = useState<string>(() => readDismissedVersion());
    const checkInFlightRef = useRef(false);

    useEffect(() => {
        if (systemUpdate) {
            setSummary(systemUpdate);
        }
    }, [systemUpdate?.currentVersion, systemUpdate?.latestVersion, systemUpdate?.hasUpdate, systemUpdate?.checkedAt]);

    // Pengecekan versi terbaru di latar belakang tiap 1 jam saat online (terkoordinasi lintas tab)
    useEffect(() => {
        if (typeof window === 'undefined' || !canManageUpdate || isOnUpdatePage) {
            return;
        }

        let cancelled = false;

        const runBackgroundCheck = () => {
            if (cancelled || checkInFlightRef.current) return;
            if (typeof navigator !== 'undefined' && !navigator.onLine) return;

            try {
                const now = Date.now();
                const lastTs = Number(window.localStorage.getItem(LAST_BG_CHECK_STORAGE_KEY) || '0');
                if (now - lastTs < BG_CHECK_INTERVAL_MS) {
                    return;
                }

                window.localStorage.setItem(LAST_BG_CHECK_STORAGE_KEY, String(now));
                checkInFlightRef.current = true;

                axios
                    .get<{ success?: boolean; systemUpdate?: SharedSystemUpdate }>(
                        route('system-update.background-check'),
                        { timeout: 15_000 },
                    )
                    .then((res) => {
                        if (!cancelled && res.data?.systemUpdate) {
                            setSummary(res.data.systemUpdate);
                        }
                    })
                    .catch(() => {
                        // Fail-safe: jangan pernah mengganggu aktivitas pengguna bila offline / GitHub timeout
                    })
                    .finally(() => {
                        checkInFlightRef.current = false;
                    });
            } catch {
                checkInFlightRef.current = false;
            }
        };

        const initialTimer = window.setTimeout(runBackgroundCheck, 2_500);
        const intervalId = window.setInterval(runBackgroundCheck, BG_CHECK_INTERVAL_MS);
        const handleOnline = () => runBackgroundCheck();
        window.addEventListener('online', handleOnline);

        return () => {
            cancelled = true;
            window.clearTimeout(initialTimer);
            window.clearInterval(intervalId);
            window.removeEventListener('online', handleOnline);
        };
    }, [canManageUpdate, isOnUpdatePage]);

    const handleDismiss = () => {
        const versionToDismiss = summary?.latestVersion || 'latest';
        setDismissedVersion(versionToDismiss);
        try {
            window.sessionStorage.setItem(DISMISSED_VERSION_SESSION_KEY, versionToDismiss);
        } catch {
            // Abaikan bila sessionStorage tidak tersedia
        }
    };

    const isVisible =
        canManageUpdate &&
        !isOnUpdatePage &&
        Boolean(summary?.hasUpdate) &&
        Boolean(summary?.latestVersion) &&
        dismissedVersion !== summary?.latestVersion;

    return (
        <div
            className={`pointer-events-none fixed inset-x-3 bottom-4 z-[55] flex justify-center transition-[padding] duration-300 ease-out ${
                sidebarOpen ? 'lg:pl-[276px]' : 'lg:pl-[98px]'
            }`}
        >
            <Transition
                show={isVisible}
                enter="transition ease-out duration-300"
                enterFrom="transform opacity-0 translate-y-4 scale-95"
                enterTo="transform opacity-100 translate-y-0 scale-100"
                leave="transition ease-in duration-150"
                leaveFrom="transform opacity-100 translate-y-0 scale-100"
                leaveTo="transform opacity-0 translate-y-4 scale-95"
            >
                <div
                    role="status"
                    aria-live="polite"
                    className="pointer-events-auto flex w-full max-w-lg items-center gap-3 rounded-2xl border border-slate-200/90 bg-white/95 px-3.5 py-2.5 shadow-float backdrop-blur-md dark:border-white/10 dark:bg-[#1A1828]/95"
                >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-lime-300 to-lime-400 text-slate-950 shadow-sm">
                        <Download className="h-4 w-4" aria-hidden="true" />
                    </span>

                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <p className="text-[12px] font-extrabold leading-tight text-slate-900 dark:text-white">
                                Versi Terbaru tersedia
                            </p>
                            {summary?.latestVersion && (
                                <span className="rounded-full bg-lime-400/20 px-2 py-0.5 text-[9.5px] font-extrabold text-lime-700 dark:bg-lime-400/15 dark:text-lime-300">
                                    v{summary.latestVersion}
                                </span>
                            )}
                        </div>
                        <p className="mt-0.5 text-[10.5px] font-medium text-slate-500 dark:text-slate-400">
                            Pembaruan aplikasi dari v{summary?.currentVersion} siap dipasang.
                        </p>
                    </div>

                    <Link
                        href={route('system-update.index')}
                        className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-slate-950 px-3 py-2 text-[11px] font-bold text-lime-300 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-lime-400 dark:text-slate-950 dark:hover:bg-lime-300"
                    >
                        <span>Update sekarang</span>
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>

                    <button
                        type="button"
                        onClick={handleDismiss}
                        aria-label="Tutup notifikasi versi terbaru"
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                </div>
            </Transition>
        </div>
    );
}
