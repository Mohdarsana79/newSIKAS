import { Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';

export default function Guest({ children }: PropsWithChildren) {
    return (
        <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
            {/* Left Side - Branding & Visuals */}
            <div className="relative hidden lg:flex flex-col justify-between p-12 bg-purple-950 text-white overflow-hidden">
                {/* Background Decorations */}
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-violet-900 via-purple-900 to-fuchsia-900 z-0 opacity-90"></div>
                <div className="absolute top-0 right-0 w-96 h-96 bg-fuchsia-600 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-blob"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

                <div className="relative z-10 flex items-center gap-3">
                    <div className="flex items-center justify-center p-2 rounded-lg bg-white/10 backdrop-blur-sm shadow-inner">
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                    </div>
                    <span className="text-2xl font-bold tracking-tight">SIKAS</span>
                </div>

                <div className="relative z-10 my-auto">
                    <h1 className="text-5xl font-extrabold tracking-tight leading-tight mb-6">
                        Kelola Anggaran <br /> Lebih Efisien.
                    </h1>
                    <p className="text-lg text-indigo-100 max-w-md">
                        Sistem Informasi Kegiatan Anggaran Sekolah yang terintegrasi, transparan, dan akuntabel.
                    </p>
                </div>

                <div className="relative z-10 text-sm text-indigo-200">
                    &copy; {new Date().getFullYear()} SIKAS Team. All rights reserved.
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="flex flex-col justify-center items-center p-6 bg-white dark:bg-gray-900">
                <div className="w-full max-w-md space-y-8">
                    {/* Mobile Logo (Visible only on small screens) */}
                    <div className="flex lg:hidden justify-center mb-8">
                        <Link href="/" className="flex items-center gap-2 text-indigo-600">
                            <div className="p-2 bg-indigo-100 rounded-lg">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </div>
                            <span className="text-2xl font-bold">SIKAS</span>
                        </Link>
                    </div>

                    {children}
                </div>
            </div>
        </div>
    );
}
