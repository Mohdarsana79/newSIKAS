import Sidebar from '@/Components/Sidebar';
import Navbar from '@/Components/Navbar';
import { PropsWithChildren, ReactNode, useState } from 'react';
import ChangelogModal from '@/Components/ChangelogModal';
import Toast from '@/Components/Toast';
import CopilotDrawer from '@/Components/Ai/CopilotDrawer';

export type CopilotWindowState = 'closed' | 'normal' | 'minimized' | 'maximized';

export default function Authenticated({
    header,
    children,
}: PropsWithChildren<{ header?: ReactNode }>) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [copilotState, setCopilotState] = useState<CopilotWindowState>('closed');

    // Close sidebar on mobile on initial load
    useState(() => {
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            setSidebarOpen(false);
        }
    });

    return (
        <div className="min-h-screen bg-[#F6F8FC] dark:bg-[#0B0A12] text-slate-900 dark:text-slate-100 flex antialiased selection:bg-brand-500/20 selection:text-brand-900 dark:selection:text-brand-200">
            <Toast />
            <ChangelogModal />
            <CopilotDrawer 
                copilotState={copilotState}
                setCopilotState={setCopilotState}
                sidebarOpen={sidebarOpen}
            />
            {/* Sidebar */}
            <Sidebar
                isOpen={sidebarOpen}
                setIsOpen={setSidebarOpen}
            />

            {/* Main Content Wrapper */}
            <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${sidebarOpen ? 'md:ml-64' : 'md:ml-20'} ml-0`}>
                {/* Navbar */}
                <Navbar
                    header={header}
                    sidebarOpen={sidebarOpen}
                    setSidebarOpen={setSidebarOpen}
                    copilotState={copilotState}
                    setCopilotState={setCopilotState}
                />

                {/* Page Content Canvas */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[#F6F8FC] dark:bg-[#0B0A12]">
                    {children}
                </main>
            </div>
        </div>
    );
}
