import { Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';

import Footer from '@/Components/Landing/Footer';
import Hero from '@/Components/Landing/Hero';
import ModulesSection from '@/Components/Landing/ModulesSection';
import Navbar from '@/Components/Landing/Navbar';
import StatsSection from '@/Components/Landing/StatsSection';
import { createEmptyWelcomeSummary, type WelcomeSummaryData } from '@/Components/Landing/types';
import VideoGuideModal from '@/Components/Landing/VideoGuideModal';
import WhySection from '@/Components/Landing/WhySection';
import { PageProps } from '@/types';

/**
 * Halaman Welcome SIKAS bergaya Novara (Deep Midnight Teal & Mint Aqua + Anime.js).
 * Terdiri dari 5 section terpadu:
 * 1. Dark Teal Mountain Hero + Interactive Glassmorphism Chart Card (Navbar menyatu di atas)
 * 2. 5-Card Services / Modul Grid ("Panduan Pengelolaan untuk Setiap Tahap Anggaran.")
 * 3. Split Bento Partner Banner + Interactive Testimonial Carousel
 * 4. 4-Column Stats Bar dengan ikon duo-tone & garis vertikal
 * 5. Clean Minimalist Footer
 */
export default function Welcome({
    auth,
    hasUsers,
    welcomeData,
}: PageProps<{
    laravelVersion: string;
    phpVersion: string;
    hasUsers: boolean;
    welcomeData?: WelcomeSummaryData;
}>) {
    const authenticated = Boolean(auth?.user);
    const [videoGuideOpen, setVideoGuideOpen] = useState(false);
    const resolvedWelcomeData = welcomeData ?? createEmptyWelcomeSummary();

    // Smooth anchor scroll hanya aktif saat halaman landing terpasang.
    useEffect(() => {
        const root = document.documentElement;
        root.classList.add('landing-active');
        return () => root.classList.remove('landing-active');
    }, []);

    return (
        <div className="landing-shell min-h-screen overflow-x-clip bg-[#F8FBFB] text-[#08222B] selection:bg-[#8BE6DC]/35 selection:text-[#06222B] dark:bg-[#051319] dark:text-white dark:selection:bg-[#8BE6DC]/30 dark:selection:text-white">
            <Head title="Welcome to SIKAS">
                <meta
                    name="description"
                    content="SIKAS — Sistem Informasi Kegiatan Anggaran Sekolah. Kelola RKAS, penatausahaan BKU, laporan PDF & Excel, dan sinkronisasi ARKAS dalam satu alur yang transparan dan akuntabel."
                />
                <meta name="theme-color" content="#051821" media="(prefers-color-scheme: dark)" />
                <meta name="theme-color" content="#051821" media="(prefers-color-scheme: light)" />
            </Head>

            <a
                href="#konten"
                className="landing-focus sr-only focus:not-sr-only focus:fixed focus:left-1/2 focus:top-4 focus:z-[80] focus:-translate-x-1/2 focus:rounded-full focus:bg-[#8BE6DC] focus:px-5 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-[#06222B]"
            >
                Lompat ke konten
            </a>

            <Navbar
                authenticated={authenticated}
                hasUsers={hasUsers}
                onOpenGuide={() => setVideoGuideOpen(true)}
            />

            <main id="konten">
                <Hero
                    authenticated={authenticated}
                    hasUsers={hasUsers}
                    welcomeData={resolvedWelcomeData}
                    onOpenVideoModal={() => setVideoGuideOpen(true)}
                />
                <ModulesSection />
                <WhySection authenticated={authenticated} hasUsers={hasUsers} />
                <StatsSection stats={resolvedWelcomeData.stats} />
            </main>

            <Footer />

            <VideoGuideModal
                open={videoGuideOpen}
                onClose={() => setVideoGuideOpen(false)}
                authenticated={authenticated}
                hasUsers={hasUsers}
            />
        </div>
    );
}
