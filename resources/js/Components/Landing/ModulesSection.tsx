import { useCallback, useEffect, useRef, useState } from 'react';

import { useReducedMotion } from '@/Hooks/useReducedMotion';
import { animate, createSpring, stagger, useAnimeInView } from '@/lib/anime';
import { cn } from '@/lib/utils';

export type ModuleKind = 'rkas' | 'bku' | 'pajak' | 'laporan' | 'arkas';

export type ModuleItem = {
    kind: ModuleKind;
    titleLine1: string;
    titleLine2: string;
    shortDesc: string;
    fullDesc: string;
    badge: string;
    highlights: readonly string[];
    metricsLabel: string;
    metricsValue: string;
    icon: () => JSX.Element;
};

export const MODULES: readonly ModuleItem[] = [
    {
        kind: 'rkas',
        titleLine1: 'Perencanaan',
        titleLine2: 'RKAS',
        shortDesc: 'Susun dan kembangkan pagu anggaran sekolah dengan penuh kepastian.',
        fullDesc:
            'Kelola Rencana Kegiatan dan Anggaran Sekolah (RKAS) untuk keempat varian dana BOSP (Reguler, Kinerja, SiLPA Reguler, dan SiLPA Kinerja) lengkap dengan validasi kode rekening dan rincian bulanan.',
        badge: 'Tahap 01 · Perencanaan',
        highlights: [
            'Dukungan penuh 4 varian anggaran BOSP dalam satu dasbor terpadu',
            'Penyusunan RKAS murni, pergeseran, hingga RKAS perubahan',
            'Validasi otomatis pagu tahunan terhadap rincian belanja bulanan',
        ],
        metricsLabel: 'Cakupan Varian',
        metricsValue: '4 Varian BOSP',
        icon: SproutPlanIcon,
    },
    {
        kind: 'bku',
        titleLine1: 'Penatausahaan',
        titleLine2: 'BKU',
        shortDesc: 'Wujudkan pencatatan kas tunai dan bank yang rapi setiap bulan.',
        fullDesc:
            'Catat seluruh transaksi penerimaan, penarikan bank, dan belanja harian tanpa kehilangan jejak audit. Buku Kas Umum (BKU), Buku Pembantu Kas Tunai, dan Buku Pembantu Bank tersinkronisasi otomatis.',
        badge: 'Tahap 02 · Penatausahaan',
        highlights: [
            'Sinkronisasi otomatis antara BKU, Buku Kas Tunai, dan Buku Bank',
            'Pencatatan kuitansi dan bukti transaksi dengan penomoran terstruktur',
            'Rekonsiliasi bunga bank, biaya admin, dan penutupan kas bulanan',
        ],
        metricsLabel: 'Akurasi Saldo',
        metricsValue: '100% Seimbang',
        icon: PieAllocationIcon,
    },
    {
        kind: 'pajak',
        titleLine1: 'Perlindungan',
        titleLine2: 'Pajak & Kas',
        shortDesc: 'Jaga kepatuhan pajak dan keamanan saldo yang paling krusial.',
        fullDesc:
            'Hindari selisih perhitungan pajak pada pemeriksaan akhir tahun. SIKAS membantu memantau pungutan dan penyetoran PPN, PPh 21, PPh 22, PPh 23, serta Pajak Daerah beserta Berita Acara Pemeriksaan Kas.',
        badge: 'Tahap 03 · Kepatuhan',
        highlights: [
            'Buku Pembantu Pajak otomatis merekap pungutan dan setoran pajak',
            'Pembuatan Berita Acara Pemeriksaan Kas lengkap dengan pecahan uang',
            'Peringatan dini terhadap saldo kas tunai dan kewajiban pajak belum setor',
        ],
        metricsLabel: 'Status Audit',
        metricsValue: 'Siap Periksa',
        icon: ShieldProtectIcon,
    },
    {
        kind: 'laporan',
        titleLine1: 'Laporan &',
        titleLine2: 'Arsip Dinas',
        shortDesc: 'Rencanakan dokumen hari ini untuk kelancaran verifikasi esok hari.',
        fullDesc:
            'Cetak seluruh dokumen pertanggungjawaban keuangan sekolah dalam format PDF siap tanda tangan maupun lembar kerja Excel yang rapi sesuai pedoman pelaporan BOSP.',
        badge: 'Tahap 04 · Pelaporan',
        highlights: [
            'Ekspor instan ke PDF (siap cetak) dan Excel (multi-sheet terformat)',
            'Rekapitulasi realisasi penggunaan dana per komponen standar nasional',
            'Format tanda tangan Kepala Sekolah, Bendahara, dan Komite otomatis',
        ],
        metricsLabel: 'Format Ekspor',
        metricsValue: 'PDF & Excel',
        icon: SchoolEstateIcon,
    },
    {
        kind: 'arkas',
        titleLine1: 'Sinkronisasi',
        titleLine2: 'ARKAS',
        shortDesc: 'Dukungan integrasi data strategis bagi bendahara dan operator sekolah.',
        fullDesc:
            'Hubungkan SIKAS langsung dengan database aplikasi desktop ARKAS. Tarik data penganggaran dan penatausahaan tanpa perlu mengetik ulang ratusan baris transaksi di dua aplikasi berbeda.',
        badge: 'Tahap 05 · Integrasi',
        highlights: [
            'Pembacaan langsung struktur tabel anggaran dan BKU dari database ARKAS',
            'Pemetaan kode kegiatan, rekening belanja, dan uraian secara cerdas',
            'Hemat waktu kerja bendahara hingga 80% saat menyusun laporan bulanan',
        ],
        metricsLabel: 'Efisiensi Waktu',
        metricsValue: 'Tanpa Input Ulang',
        icon: AdvisoryTeamIcon,
    },
];

/**
 * Section 2 ("Layanan & Modul") bergaya Novara ("Our Services"):
 * - Header 3 kolom (Judul di kiri, Deskripsi di tengah, Tombol Pill "Lihat Semua Modul ->" di kanan)
 * - 5 kartu vertikal berwarna soft ice-teal (#EAF4F4) dengan ikon duo-tone & tombol bulat panah (->)
 * - Klik kartu atau tombol panah membuka Modal Detail Modul dengan animasi Spring dari Anime.js
 */
export function ModulesSection() {
    const [activeModule, setActiveModule] = useState<ModuleItem | null>(null);
    const reducedMotion = useReducedMotion();

    const { ref: sectionRef } = useAnimeInView<HTMLElement>(
        (container, isReduced) => {
            if (isReduced) return;

            const headerItems = container.querySelectorAll('[data-service-header]');
            const cards = container.querySelectorAll('[data-service-card]');

            const anim1 = animate(headerItems, {
                opacity: [0, 1],
                translateY: [24, 0],
                duration: 780,
                delay: stagger(90),
                ease: 'outExpo',
            });

            const anim2 = animate(cards, {
                opacity: [0, 1],
                translateY: [36, 0],
                scale: [0.95, 1],
                duration: 850,
                delay: stagger(95, { start: 140 }),
                ease: 'outExpo',
            });

            return () => {
                anim1.pause();
                anim2.pause();
            };
        },
        {
            threshold: 0.12,
            initialHideSelector: '[data-service-header], [data-service-card]',
        },
    );

    const handleCardMouseEnter = useCallback(
        (event: React.MouseEvent<HTMLElement>) => {
            if (reducedMotion) return;
            const card = event.currentTarget;
            const iconBox = card.querySelector('[data-card-icon]');
            const arrowBtn = card.querySelector('[data-card-arrow]');

            animate(card, {
                translateY: -6,
                duration: 340,
                ease: 'outCubic',
            });

            if (iconBox) {
                animate(iconBox, {
                    scale: 1.08,
                    rotate: -3,
                    ease: createSpring({ stiffness: 200, damping: 13 }),
                });
            }

            if (arrowBtn) {
                animate(arrowBtn, {
                    translateX: 4,
                    scale: 1.06,
                    duration: 280,
                    ease: 'outBack',
                });
            }
        },
        [reducedMotion],
    );

    const handleCardMouseLeave = useCallback(
        (event: React.MouseEvent<HTMLElement>) => {
            if (reducedMotion) return;
            const card = event.currentTarget;
            const iconBox = card.querySelector('[data-card-icon]');
            const arrowBtn = card.querySelector('[data-card-arrow]');

            animate(card, {
                translateY: 0,
                duration: 420,
                ease: 'outExpo',
            });

            if (iconBox) {
                animate(iconBox, {
                    scale: 1,
                    rotate: 0,
                    duration: 380,
                    ease: 'outExpo',
                });
            }

            if (arrowBtn) {
                animate(arrowBtn, {
                    translateX: 0,
                    scale: 1,
                    duration: 340,
                    ease: 'outExpo',
                });
            }
        },
        [reducedMotion],
    );

    return (
        <section
            id="modul"
            ref={sectionRef}
            aria-labelledby="services-heading"
            className="relative isolate scroll-mt-24 bg-[#F8FBFB] py-16 dark:bg-[#051319] sm:py-20 lg:py-24"
        >
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                {/* Baris Header 3 Kolom seperti referensi Novara */}
                <div className="grid items-end gap-6 lg:grid-cols-[1.2fr_1fr_auto] lg:gap-10">
                    <div data-service-header>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#2A6F78] dark:text-[#8BE6DC]">
                            Layanan &amp; Modul
                        </p>
                        <h2
                            id="services-heading"
                            className="mt-2.5 text-balance font-sans text-[clamp(1.75rem,3.1vw,2.45rem)] font-bold leading-[1.15] tracking-[-0.028em] text-[#08222B] dark:text-white"
                        >
                            Panduan Pengelolaan untuk
                            <span className="block">Setiap Tahap Anggaran.</span>
                        </h2>
                    </div>

                    <p
                        data-service-header
                        className="max-w-md text-pretty text-[13.5px] leading-[1.7] text-[#45636D] dark:text-white/70 sm:text-[14px]"
                    >
                        Mulai dari penyusunan pagu RKAS hingga arsip laporan akhir tahun, kami menghadirkan solusi
                        keuangan sekolah yang terpadu dan selaras dengan sasaran Anda.
                    </p>

                    <div data-service-header className="flex lg:justify-end">
                        <button
                            type="button"
                            onClick={() => setActiveModule(MODULES[0])}
                            className="landing-focus group inline-flex items-center gap-2.5 rounded-full border border-[#0D3B47]/20 bg-[#EAF4F4] px-5 py-2.5 text-[13px] font-semibold text-[#08222B] transition-all duration-300 hover:border-[#0D3B47]/40 hover:bg-[#DCEFEF] dark:border-white/15 dark:bg-[#0B222C] dark:text-white dark:hover:border-[#8BE6DC]/50 dark:hover:bg-[#102E3B]"
                        >
                            <span>Lihat Semua Modul</span>
                            <ArrowRightSmallIcon />
                        </button>
                    </div>
                </div>

                {/* Grid 5 Kartu Modul Vertikal persis seperti referensi Novara */}
                <div className="mt-10 grid grid-cols-1 gap-4 sm:mt-12 sm:grid-cols-2 lg:grid-cols-5">
                    {MODULES.map((module) => (
                        <article
                            key={module.kind}
                            data-service-card
                            onMouseEnter={handleCardMouseEnter}
                            onMouseLeave={handleCardMouseLeave}
                            onClick={() => setActiveModule(module)}
                            className="group relative flex cursor-pointer flex-col justify-between rounded-[1.35rem] border border-[#D5EAEA]/90 bg-[#EAF4F4] p-6 transition-colors duration-300 hover:border-[#8BE6DC] hover:bg-[#E1F1F1] dark:border-white/10 dark:bg-[#0B222C] dark:hover:border-[#8BE6DC]/45 dark:hover:bg-[#0F2C38]"
                        >
                            <div>
                                {/* Ikon Duo-Tone di Kiri Atas */}
                                <div
                                    data-card-icon
                                    className="inline-flex h-12 w-12 items-center justify-center rounded-2xl text-[#13505B] dark:text-[#8BE6DC]"
                                >
                                    <module.icon />
                                </div>

                                <h3 className="mt-5 font-sans text-[17px] font-bold leading-[1.22] tracking-[-0.02em] text-[#08222B] dark:text-white">
                                    <span className="block">{module.titleLine1}</span>
                                    <span className="block">{module.titleLine2}</span>
                                </h3>

                                <p className="mt-3 text-pretty text-[13px] leading-[1.6] text-[#45636D] dark:text-white/65">
                                    {module.shortDesc}
                                </p>
                            </div>

                            {/* Tombol Bulat Panah (->) di Kiri Bawah */}
                            <div className="mt-7 pt-1">
                                <button
                                    type="button"
                                    data-card-arrow
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveModule(module);
                                    }}
                                    aria-label={`Pelajari detail modul ${module.titleLine1} ${module.titleLine2}`}
                                    className="landing-focus inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#14505C]/25 bg-white/75 text-[#08222B] transition-colors duration-300 group-hover:border-[#08222B] group-hover:bg-[#08222B] group-hover:text-[#8BE6DC] dark:border-white/20 dark:bg-white/[0.06] dark:text-white dark:group-hover:border-[#8BE6DC] dark:group-hover:bg-[#8BE6DC] dark:group-hover:text-[#062028]"
                                >
                                    <ArrowRightSmallIcon />
                                </button>
                            </div>
                        </article>
                    ))}
                </div>
            </div>

            {/* Modal Interaktif Detail Modul (Dianimasikan dengan Anime.js) */}
            {activeModule ? (
                <ModuleDetailModal
                    module={activeModule}
                    onSelectModule={setActiveModule}
                    onClose={() => setActiveModule(null)}
                />
            ) : null}
        </section>
    );
}

function ModuleDetailModal({
    module,
    onSelectModule,
    onClose,
}: {
    module: ModuleItem;
    onSelectModule: (m: ModuleItem) => void;
    onClose: () => void;
}) {
    const backdropRef = useRef<HTMLDivElement | null>(null);
    const dialogRef = useRef<HTMLDivElement | null>(null);
    const reducedMotion = useReducedMotion();

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    useEffect(() => {
        if (reducedMotion) return;
        const anims: { pause: () => void }[] = [];

        if (backdropRef.current) {
            anims.push(
                animate(backdropRef.current, {
                    opacity: [0, 1],
                    duration: 260,
                    ease: 'outQuad',
                }),
            );
        }

        if (dialogRef.current) {
            anims.push(
                animate(dialogRef.current, {
                    opacity: [0, 1],
                    scale: [0.93, 1],
                    translateY: [20, 0],
                    ease: createSpring({ stiffness: 210, damping: 18 }),
                }),
            );
        }

        return () => anims.forEach((a) => a.pause());
    }, [reducedMotion]);

    useEffect(() => {
        if (reducedMotion || !dialogRef.current) return;
        const items = dialogRef.current.querySelectorAll('[data-modal-stagger]');
        if (items.length === 0) return;

        const anim = animate(items, {
            opacity: [0, 1],
            translateY: [12, 0],
            delay: stagger(65),
            duration: 460,
            ease: 'outCubic',
        });

        return () => {
            anim.pause();
        };
    }, [module, reducedMotion]);

    return (
        <div
            ref={backdropRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="module-modal-title"
            onClick={onClose}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-[#04141C]/75 p-4 backdrop-blur-md sm:p-6"
        >
            <div
                ref={dialogRef}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/20 bg-[#08222D] text-white shadow-2xl"
            >
                {/* Pendar atas */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute -top-24 right-0 h-56 w-56 rounded-full bg-[#8BE6DC]/20 blur-3xl"
                />

                <div className="relative p-6 sm:p-8">
                    {/* Tab pemilih cepat ke-5 modul */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
                        <div className="flex flex-wrap gap-1.5">
                            {MODULES.map((item) => {
                                const isCurrent = item.kind === module.kind;
                                return (
                                    <button
                                        key={item.kind}
                                        type="button"
                                        onClick={() => onSelectModule(item)}
                                        className={cn(
                                            'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                                            isCurrent
                                                ? 'bg-[#8BE6DC] text-[#06222B]'
                                                : 'bg-white/[0.06] text-white/70 hover:bg-white/[0.12] hover:text-white',
                                        )}
                                    >
                                        {item.titleLine1} {item.titleLine2}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Tutup detail modul"
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-white/75 transition-colors hover:border-[#8BE6DC] hover:text-white"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Isi Modul Aktif */}
                    <div className="mt-6">
                        <div data-modal-stagger className="flex items-center justify-between gap-4">
                            <span className="inline-flex items-center gap-2 rounded-full border border-[#8BE6DC]/35 bg-[#8BE6DC]/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8BE6DC]">
                                {module.badge}
                            </span>
                            <span className="text-xs font-medium text-white/65">
                                {module.metricsLabel}:{' '}
                                <strong className="text-[#8BE6DC]">{module.metricsValue}</strong>
                            </span>
                        </div>

                        <div data-modal-stagger className="mt-4 flex items-center gap-4">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#8BE6DC]/15 text-[#8BE6DC] ring-1 ring-[#8BE6DC]/30">
                                <module.icon />
                            </div>
                            <div>
                                <h3 id="module-modal-title" className="text-2xl font-bold tracking-tight text-white">
                                    {module.titleLine1} {module.titleLine2}
                                </h3>
                                <p className="mt-0.5 text-sm text-white/70">{module.shortDesc}</p>
                            </div>
                        </div>

                        <p data-modal-stagger className="mt-5 text-[14.5px] leading-relaxed text-white/80">
                            {module.fullDesc}
                        </p>

                        <div data-modal-stagger className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8BE6DC]">
                                Keunggulan Utama Modul
                            </p>
                            <ul className="mt-3 space-y-2.5">
                                {module.highlights.map((point) => (
                                    <li key={point} className="flex items-start gap-2.5 text-[13.5px] text-white/85">
                                        <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#8BE6DC]/25 text-[#8BE6DC]">
                                            ✓
                                        </span>
                                        <span>{point}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div data-modal-stagger className="mt-6 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-full border border-white/20 px-5 py-2.5 text-xs font-semibold text-white/80 transition-colors hover:bg-white/10"
                            >
                                Tutup
                            </button>
                            <a
                                href="#fitur"
                                onClick={onClose}
                                className="inline-flex items-center gap-2 rounded-full bg-[#8BE6DC] px-5 py-2.5 text-xs font-semibold text-[#06222B] transition-colors hover:bg-[#A4F3EA]"
                            >
                                Lihat Alur Kerja
                                <ArrowRightSmallIcon />
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ArrowRightSmallIcon() {
    return (
        <svg
            aria-hidden
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
        >
            <path d="M4.5 10h11" />
            <path d="m10.5 5 5 5-5 5" />
        </svg>
    );
}

/** Ikon 1: Sprout / Tanaman Tumbuh Duo-Tone (seperti Investment Planning di Novara) */
function SproutPlanIcon() {
    return (
        <svg viewBox="0 0 40 40" fill="none" className="h-10 w-10">
            <path
                d="M20 21C20 13.5 25.8 9 33 9C33 16.2 27.5 21 20 21Z"
                fill="#8BE6DC"
                fillOpacity="0.65"
            />
            <path
                d="M20 24C20 17.5 14.8 13 8 13C8 19.5 13.2 24 20 24Z"
                fill="#8BE6DC"
                fillOpacity="0.4"
            />
            <path
                d="M20 33V15M20 21C20 13.5 25.8 9 33 9C33 16.2 27.5 21 20 21ZM20 24C20 17.5 14.8 13 8 13C8 19.5 13.2 24 20 24ZM12 33H28"
                stroke="currentColor"
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

/** Ikon 2: Pie Chart Duo-Tone (seperti Retirement Planning di Novara) */
function PieAllocationIcon() {
    return (
        <svg viewBox="0 0 40 40" fill="none" className="h-10 w-10">
            <path
                d="M21.5 7.5A11.5 11.5 0 0 1 32.5 18.5H21.5V7.5Z"
                fill="#8BE6DC"
                fillOpacity="0.75"
            />
            <circle
                cx="19"
                cy="21"
                r="11.5"
                fill="#8BE6DC"
                fillOpacity="0.28"
            />
            <path
                d="M30.5 21A11.5 11.5 0 1 1 19 9.5V21H30.5Z"
                stroke="currentColor"
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M22.5 7A10.5 10.5 0 0 1 33 17.5H22.5V7Z"
                stroke="currentColor"
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

/** Ikon 3: Shield Check Duo-Tone (seperti Wealth Protection di Novara) */
function ShieldProtectIcon() {
    return (
        <svg viewBox="0 0 40 40" fill="none" className="h-10 w-10">
            <path
                d="M20 7L9 11.5V20.2C9 27.4 13.7 33.4 20 35.5C26.3 33.4 31 27.4 31 20.2V11.5L20 7Z"
                fill="#8BE6DC"
                fillOpacity="0.55"
                stroke="currentColor"
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M15.5 20.5L18.7 23.7L25 17.2"
                stroke="currentColor"
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

/** Ikon 4: House / School Building Duo-Tone (seperti Estate Planning di Novara) */
function SchoolEstateIcon() {
    return (
        <svg viewBox="0 0 40 40" fill="none" className="h-10 w-10">
            <path
                d="M10 19.5L20 11L30 19.5V32H10V19.5Z"
                fill="#8BE6DC"
                fillOpacity="0.45"
            />
            <path
                d="M6.5 21L20 9.5L33.5 21"
                stroke="currentColor"
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M10.5 18.5V32.5H29.5V18.5"
                stroke="currentColor"
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <rect
                x="17"
                y="23"
                width="6"
                height="9.5"
                rx="1"
                fill="#8BE6DC"
                stroke="currentColor"
                strokeWidth="2"
            />
        </svg>
    );
}

/** Ikon 5: Business / Advisory Team Duo-Tone (seperti Business Advisory di Novara) */
function AdvisoryTeamIcon() {
    return (
        <svg viewBox="0 0 40 40" fill="none" className="h-10 w-10">
            <circle cx="20" cy="14" r="4.5" fill="#8BE6DC" fillOpacity="0.65" stroke="currentColor" strokeWidth="2" />
            <circle cx="11.5" cy="16.5" r="3.2" fill="#8BE6DC" fillOpacity="0.35" stroke="currentColor" strokeWidth="1.9" />
            <circle cx="28.5" cy="16.5" r="3.2" fill="#8BE6DC" fillOpacity="0.35" stroke="currentColor" strokeWidth="1.9" />
            <path
                d="M12.5 31V28C12.5 24.7 15.2 22 18.5 22H21.5C24.8 22 27.5 24.7 27.5 28V31"
                fill="#8BE6DC"
                fillOpacity="0.5"
                stroke="currentColor"
                strokeWidth="2.1"
                strokeLinecap="round"
            />
            <path
                d="M6.5 31V28.8C6.5 26.3 8.3 24.2 10.8 23.8M33.5 31V28.8C33.5 26.3 31.7 24.2 29.2 23.8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            />
        </svg>
    );
}

export default ModulesSection;
