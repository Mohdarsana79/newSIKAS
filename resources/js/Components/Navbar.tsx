import Dropdown from '@/Components/Dropdown';
import DarkModeSwitcher from '@/Components/DarkModeSwitcher';
import FullscreenSwitcher from '@/Components/FullscreenSwitcher';
import NotificationDropdown from '@/Components/NotificationDropdown';
import { usePage } from '@inertiajs/react';
import { Sparkles } from 'lucide-react';
import type { CopilotWindowState } from '@/Layouts/AuthenticatedLayout';

interface NavbarProps {
    header?: React.ReactNode;
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    copilotState?: CopilotWindowState;
    setCopilotState?: (state: CopilotWindowState) => void;
}

export default function Navbar({ 
    header, 
    sidebarOpen, 
    setSidebarOpen,
    copilotState = 'closed',
    setCopilotState
}: NavbarProps) {
    const user = usePage().props.auth.user;

    return (
        <header className="sticky top-0 z-20 flex w-full flex-col bg-white drop-shadow-sm dark:bg-gray-800">
            <div className="flex flex-grow items-center justify-between px-4 py-4 shadow-sm md:px-6 2xl:px-11">

                {/* Header Title & Toggle */}
                <div className="flex items-center gap-2 sm:gap-4">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-500 transition-all focus:outline-none lg:hidden"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    
                    {!sidebarOpen && (
                        <h1 className="text-xl font-bold tracking-tight text-gray-800 dark:text-white lg:hidden">
                            SIKAS
                        </h1>
                    )}
                </div>

                {/* Right Side Actions */}
                <div className="flex items-center gap-3 2xsm:gap-7">
                    {/* SIKAS AI Copilot Trigger */}
                    <button
                        type="button"
                        onClick={() => {
                            if (setCopilotState) {
                                if (copilotState === 'closed' || copilotState === 'minimized') {
                                    setCopilotState('normal');
                                } else {
                                    setCopilotState('closed');
                                }
                            }
                        }}
                        className={`relative flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300 focus:outline-none ${
                            copilotState !== 'closed'
                                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/40 ring-2 ring-purple-400/50 scale-105'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-gray-600 shadow-inner'
                        }`}
                        title={copilotState !== 'closed' ? 'Tutup SIKAS AI Copilot' : 'Buka SIKAS AI Copilot'}
                    >
                        <Sparkles className={`w-4.5 h-4.5 ${copilotState !== 'closed' ? 'text-purple-100' : 'text-purple-600 dark:text-purple-400'}`} />
                        {copilotState !== 'closed' ? (
                            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                            </span>
                        ) : (
                            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-purple-500"></span>
                        )}
                    </button>

                    {/* Notifications */}
                    <NotificationDropdown />

                    {/* Fullscreen Toggler */}
                    <FullscreenSwitcher />

                    {/* Dark Mode Toggler */}
                    <DarkModeSwitcher />

                    {/* User Area */}
                    <Dropdown>
                        <Dropdown.Trigger>
                            <span className="inline-flex rounded-md">
                                <button
                                    type="button"
                                    className="flex items-center gap-4 text-sm font-medium text-gray-500 transition duration-150 ease-in-out hover:text-gray-700 focus:outline-none dark:text-gray-400 dark:hover:text-gray-300"
                                >
                                    <span className="hidden text-right lg:block">
                                        <span className="block text-sm font-medium text-black dark:text-white">
                                            {user.name}
                                        </span>
                                        <span className="block text-xs text-gray-500 font-normal">
                                            Administrator
                                        </span>
                                    </span>

                                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>

                                    <svg
                                        className="hidden h-4 w-4 sm:block"
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                </button>
                            </span>
                        </Dropdown.Trigger>

                        <Dropdown.Content>
                            <Dropdown.Link href={route('profile.edit')}>
                                Profile
                            </Dropdown.Link>
                            <Dropdown.Link href={route('logout')} method="post" as="button">
                                Log Out
                            </Dropdown.Link>
                        </Dropdown.Content>
                    </Dropdown>
                </div>
            </div>

            {/* Page Header (if provided) */}
            {header && (
                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    {header}
                </div>
            )}
        </header>
    );
}
