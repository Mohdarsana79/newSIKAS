import Dropdown from '@/Components/Dropdown';
import DarkModeSwitcher from '@/Components/DarkModeSwitcher';
import { usePage } from '@inertiajs/react';

interface NavbarProps {
    header?: React.ReactNode;
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
}

export default function Navbar({ header, sidebarOpen, setSidebarOpen }: NavbarProps) {
    const user = usePage().props.auth.user;

    return (
        <header className="sticky top-0 z-20 flex w-full flex-col bg-white drop-shadow-sm dark:bg-gray-800">
            <div className="flex flex-grow items-center justify-between px-4 py-4 shadow-sm md:px-6 2xl:px-11">

                {/* Header Title & Toggle */}
                <div className="flex items-center gap-2 sm:gap-4">


                    {/* Optional: Add Logo or Title here if sidebar is closed */}
                </div>

                {/* Right Side Actions */}
                <div className="flex items-center gap-3 2xsm:gap-7">
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
