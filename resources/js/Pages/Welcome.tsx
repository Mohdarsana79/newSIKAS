import { Head } from '@inertiajs/react';
import { useEffect } from 'react';

import Footer from '@/Components/Landing/Footer';
import Hero from '@/Components/Landing/Hero';
import ModulesSection from '@/Components/Landing/ModulesSection';
import Navbar from '@/Components/Landing/Navbar';
import StatsSection from '@/Components/Landing/StatsSection';
import StepsSection from '@/Components/Landing/StepsSection';
import TrustStrip from '@/Components/Landing/TrustStrip';
import CtaSection from '@/Components/Landing/CtaSection';
import WhySection from '@/Components/Landing/WhySection';
import { PageProps } from '@/types';

/**
 * Latar halaman: satu lapisan gelap/ivory + glow radial + grid tipis.
 * Ditaruh di sini (bukan per section) supaya seluruh halaman terasa satu
 * kanvas, sementara tiap section tetap transparan.
 */
function PageBackdrop() {
    return (
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
            <div className="absolute inset-0 bg-[#FBF8F3] dark:bg-ink-950" />
            <div className="absolute left-1/2 top-[22%] h-[42rem] w-[70rem] -translate-x-1/2 rounded-full bg-brand-500/[0.07] blur-[150px] dark:bg-brand-500/[0.12]" />
            <div className="absolute -right-32 top-[58%] h-[34rem] w-[34rem] rounded-full bg-gold-400/[0.07] blur-[130px] dark:bg-gold-400/[0.07]" />
            <div className="absolute -left-32 top-[78%] h-[30rem] w-[30rem] rounded-full bg-brand-700/[0.06] blur-[130px] dark:bg-brand-700/[0.16]" />
            <div className="absolute inset-0 bg-grid-faint bg-grid-32 opacity-35 dark:opacity-60" />
        </div>
    );
}

export default function Welcome({
    auth,
    hasUsers,
}: PageProps<{ laravelVersion: string; phpVersion: string; hasUsers: boolean }>) {
    const authenticated = Boolean(auth?.user);

    // Smooth anchor scroll hanya untuk halaman ini (kelas dilepas saat unmount).
    useEffect(() => {
        const root = document.documentElement;
        root.classList.add('landing-active');
        return () => root.classList.remove('landing-active');
    }, []);

    return (
        <div className="landing-shell min-h-screen overflow-x-clip bg-[#FBF8F3] text-ink-900 selection:bg-brand-500/25 selection:text-ink-900 dark:bg-ink-950 dark:text-white dark:selection:bg-gold-400/25 dark:selection:text-white">
            <Head title="Welcome to SIKAS">
                <meta
                    name="description"
                    content="SIKAS — Sistem Informasi Kegiatan Anggaran Sekolah. Kelola RKAS, penatausahaan BKU, laporan PDF & Excel, dan sinkronisasi ARKAS dalam satu alur yang transparan dan akuntabel."
                />
                <meta name="theme-color" content="#07060C" media="(prefers-color-scheme: dark)" />
                <meta name="theme-color" content="#FBF8F3" media="(prefers-color-scheme: light)" />
            </Head>

            <PageBackdrop />

            <a
                href="#konten"
                className="landing-focus sr-only focus:not-sr-only focus:absolute focus:left-1/2 focus:top-4 focus:z-[60] focus:-translate-x-1/2 focus:rounded-full focus:bg-brand-600 focus:px-5 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white"
            >
                Lompat ke konten
            </a>

            <Navbar authenticated={authenticated} hasUsers={hasUsers} />

            <main id="konten">
                <Hero authenticated={authenticated} hasUsers={hasUsers} />
                <TrustStrip />
                <WhySection />
                <ModulesSection />
                <StepsSection />
                <StatsSection />
                <CtaSection authenticated={authenticated} hasUsers={hasUsers} />
            </main>

            <Footer />
        </div>
    );
}
