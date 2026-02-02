import { PageProps } from '@/types';
import { Head, Link } from '@inertiajs/react';

export default function Welcome({
    auth,
    laravelVersion,
    phpVersion,
    hasUsers,
}: PageProps<{ laravelVersion: string; phpVersion: string; hasUsers: boolean }>) {
    return (
        <div className="flex min-h-screen flex-col overflow-hidden bg-gray-50 text-gray-800 dark:bg-gray-900 dark:text-gray-100 font-sans">
            <Head title="Welcome to SIKAS" />

            {/* Navbar */}
            <nav className="flex items-center justify-between px-6 py-4 lg:px-12 backdrop-blur-md fixed w-full z-50 bg-white/70 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center p-2 rounded-lg bg-indigo-600 text-white shadow-lg">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                    </div>
                    <span className="text-xl font-bold tracking-tight text-indigo-700 dark:text-indigo-400">SIKAS</span>
                </div>
                <div className="flex items-center gap-4">
                    {auth.user ? (
                        <Link
                            href={route('dashboard')}
                            className="text-sm font-semibold text-gray-600 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-white"
                        >
                            Dashboard
                        </Link>
                    ) : (
                        <>
                            <Link
                                href={route('login')}
                                className="text-sm font-semibold text-gray-600 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-white"
                            >
                                Masuk
                            </Link>
                            {!hasUsers && (
                                <Link
                                    href={route('register')}
                                    className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                >
                                    Daftar
                                </Link>
                            )}
                        </>
                    )}
                </div>
            </nav>

            {/* Hero Section */}
            <div className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
                {/* Background Decoration */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full z-0 pointer-events-none">
                    <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300/30 rounded-full blur-3xl mix-blend-multiply filter opacity-70 animate-blob"></div>
                    <div className="absolute top-20 right-10 w-72 h-72 bg-yellow-300/30 rounded-full blur-3xl mix-blend-multiply filter opacity-70 animate-blob animation-delay-2000"></div>
                    <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300/30 rounded-full blur-3xl mix-blend-multiply filter opacity-70 animate-blob animation-delay-4000"></div>
                </div>

                <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8 text-center">
                    <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 sm:text-6xl mb-6 py-2">
                        Sistem Informasi <br /> Kegiatan Anggaran Sekolah
                    </h1>
                    <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600 dark:text-gray-300">
                        Kelola anggaran sekolah Anda dengan lebih <span className="font-bold text-indigo-600 dark:text-indigo-400">Efisien</span>, <span className="font-bold text-indigo-600 dark:text-indigo-400">Transparan</span>, dan <span className="font-bold text-indigo-600 dark:text-indigo-400">Akuntabel</span>.
                        Terintegrasi dengan standar nasional pendidikan untuk kemudahan pelaporan.
                    </p>
                    <div className="mt-10 flex items-center justify-center gap-x-6">
                        {!auth.user && !hasUsers && (
                            <Link
                                href={route('register')}
                                className="rounded-full flex items-center gap-2 bg-indigo-600 px-8 py-3.5 text-sm font-semibold text-white shadow-xl transition-all hover:bg-indigo-500 hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                            >
                                Mulai Sekarang
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </Link>
                        )}
                        {auth.user && (
                            <Link
                                href={route('dashboard')}
                                className="rounded-full flex items-center gap-2 bg-indigo-600 px-8 py-3.5 text-sm font-semibold text-white shadow-xl transition-all hover:bg-indigo-500 hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                            >
                                Ke Dashboard
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </Link>
                        )}
                        {!auth.user && hasUsers && (
                            <Link
                                href={route('login')}
                                className="rounded-full flex items-center gap-2 bg-indigo-600 px-8 py-3.5 text-sm font-semibold text-white shadow-xl transition-all hover:bg-indigo-500 hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                            >
                                Masuk Sekarang
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </Link>
                        )}
                        <a href="#features" className="text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100 hover:text-indigo-600 transition">
                            Pelajari Fitur <span aria-hidden="true">→</span>
                        </a>
                    </div>
                </div>
            </div>

            {/* Features Section */}
            <div id="features" className="bg-white py-24 sm:py-32 dark:bg-gray-800">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="mx-auto max-w-2xl lg:text-center">
                        <h2 className="text-base font-semibold leading-7 text-indigo-600 dark:text-indigo-400">Fitur Unggulan</h2>
                        <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
                            Semua yang Anda butuhkan untuk manajemen anggaran
                        </p>
                        <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
                            Kami menyediakan alat terbaik untuk membantu bendahara dan kepala sekolah dalam merencanakan dan melaporkan keuangan sekolah.
                        </p>
                    </div>
                    <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
                        <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
                            <div className="flex flex-col">
                                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900 dark:text-white">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
                                        <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                                        </svg>
                                    </div>
                                    Dashboard Interaktif
                                </dt>
                                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600 dark:text-gray-300">
                                    <p className="flex-auto">Pantau realisasi anggaran, sisa saldo, dan grafik penggunaan dana secara real-time dengan tampilan visual yang menarik.</p>
                                </dd>
                            </div>
                            <div className="flex flex-col">
                                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900 dark:text-white">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
                                        <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                        </svg>
                                    </div>
                                    Laporan Otomatis
                                </dt>
                                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600 dark:text-gray-300">
                                    <p className="flex-auto">Generate laporan BKU, Buku Pembantu, dan laporan realisasi hanya dengan sekali klik. Format sesuai standar dinas.</p>
                                </dd>
                            </div>
                            <div className="flex flex-col">
                                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900 dark:text-white">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
                                        <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                                        </svg>
                                    </div>
                                    Validasi Data
                                </dt>
                                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600 dark:text-gray-300">
                                    <p className="flex-auto">Sistem cerdas yang membantu memvalidasi input anggaran agar sesuai dengan kode rekening dan pagu yang tersedia.</p>
                                </dd>
                            </div>
                        </dl>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="mt-auto bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-12">
                <div className="mx-auto max-w-7xl px-6 lg:px-8 flex flex-col items-center">
                    <p className="text-center text-xs leading-5 text-gray-500">
                        &copy; {new Date().getFullYear()} SIKAS Team. All rights reserved.
                    </p>
                    <p className="text-center text-xs leading-5 text-gray-400 mt-2">
                        Laravel v{laravelVersion} (PHP v{phpVersion})
                    </p>
                </div>
            </footer>
        </div>
    );
}
