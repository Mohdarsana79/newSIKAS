import Sidebar from '@/Components/Sidebar';
import Navbar from '@/Components/Navbar';
import { PropsWithChildren, ReactNode, useEffect, useState } from 'react';
import ChangelogModal from '@/Components/ChangelogModal';
import Toast from '@/Components/Toast';
import CopilotDrawer from '@/Components/Ai/CopilotDrawer';

export type CopilotWindowState = 'closed' | 'normal' | 'minimized' | 'maximized';

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

    // Tutup / ciutkan sidebar otomatis hanya di bawah 1024px (HP/tablet); di laptop & PC (>= 1024px, skala 80%) biarkan terbuka.
    useEffect(() => {
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
            setSidebarOpen(false);
        }
    }, []);

    return (
        <div className="sikas-canvas min-h-screen font-sans text-slate-900 antialiased selection:bg-lime-200 selection:text-slate-950 dark:text-slate-100 dark:selection:bg-lime-400/30 dark:selection:text-white">
            <Toast />
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

                <main className="flex-1 overflow-x-hidden">
                    <div className="px-3 pb-6 pt-5 sm:px-4 sm:pt-6 lg:px-5">{children}</div>
                </main>
            </div>
        </div>
    );
}
