import { useEffect, useRef, useState } from 'react';

import { AccountActions } from '@/Components/Landing/ui/AccountActions';
import { useReducedMotion } from '@/Hooks/useReducedMotion';
import { animate, createSpring, stagger, svg } from '@/lib/anime';
import { cn } from '@/lib/utils';

export type VideoGuideModalProps = {
    open: boolean;
    onClose: () => void;
    authenticated: boolean;
    hasUsers: boolean;
};

type GuideChapter = {
    step: string;
    title: string;
    duration: string;
    summary: string;
    bullets: readonly string[];
    svgPath: string;
};

const CHAPTERS: readonly GuideChapter[] = [
    {
        step: '01',
        title: 'Perencanaan RKAS & Sinkronisasi ARKAS',
        duration: '02:15',
        summary:
            'Mulai dengan menarik data dari aplikasi ARKAS atau menyusun pagu 4 varian BOSP secara langsung tanpa entri ganda.',
        bullets: [
            'Impor cepat struktur kegiatan dan rekening belanja dari ARKAS',
            'Keseimbangan pagu tahunan vs rincian anggaran kas 12 bulan',
            'Mendukung RKAS Murni, Pergeseran, dan Perubahan',
        ],
        svgPath: 'M 24 110 C 70 105, 110 72, 160 76 C 210 80, 250 42, 316 26',
    },
    {
        step: '02',
        title: 'Penatausahaan BKU, Bank, Kas Tunai & Pajak',
        duration: '03:40',
        summary:
            'Setiap transaksi yang dicatat langsung memperbarui Buku Kas Umum, Buku Pembantu, dan perhitungan kewajiban pajak.',
        bullets: [
            'Otomatisasi mutasi penarikan bank ke kas tunai dan belanja',
            'Rekapitulasi pungutan & setoran PPN, PPh 21/22/23, dan Pajak Daerah',
            'Pembuatan Berita Acara Pemeriksaan Kas secara instan',
        ],
        svgPath: 'M 24 102 C 80 64, 130 92, 185 56 C 235 28, 275 48, 316 20',
    },
    {
        step: '03',
        title: 'Ekspor Laporan PDF & Excel Siap Tanda Tangan',
        duration: '01:50',
        summary:
            'Cetak berkas pertanggungjawaban bulanan maupun triwulanan sesuai format standar dinas dalam satu klik.',
        bullets: [
            'Tata letak kertas, kop sekolah, dan pejabat penanda tangan presisi',
            'Ekspor Excel multi-sheet untuk kebutuhan rekapitulasi lanjutan',
            'Arsip digital rapi untuk kemudahan verifikasi dan audit BOSP',
        ],
        svgPath: 'M 24 116 C 75 98, 135 84, 190 62 C 245 40, 280 34, 316 18',
    },
];

/**
 * Modal Pratinjau & Video Panduan Interaktif yang dipicu dari tombol "Tonton Panduan"
 * di Hero maupun ikon panduan di Navbar. Dianimasikan menggunakan Anime.js.
 */
export function VideoGuideModal({
    open,
    onClose,
    authenticated,
    hasUsers,
}: VideoGuideModalProps) {
    const [activeChapterIndex, setActiveChapterIndex] = useState(0);
    const backdropRef = useRef<HTMLDivElement | null>(null);
    const panelRef = useRef<HTMLDivElement | null>(null);
    const curveRef = useRef<SVGPathElement | null>(null);
    const chapterContentRef = useRef<HTMLDivElement | null>(null);
    const reducedMotion = useReducedMotion();

    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [open, onClose]);

    useEffect(() => {
        if (!open || reducedMotion) return;
        const anims: { pause: () => void }[] = [];

        if (backdropRef.current) {
            anims.push(
                animate(backdropRef.current, {
                    opacity: [0, 1],
                    duration: 250,
                    ease: 'outQuad',
                }),
            );
        }

        if (panelRef.current) {
            anims.push(
                animate(panelRef.current, {
                    opacity: [0, 1],
                    scale: [0.92, 1],
                    translateY: [24, 0],
                    ease: createSpring({ stiffness: 200, damping: 18 }),
                }),
            );
        }

        return () => anims.forEach((a) => a.pause());
    }, [open, reducedMotion]);

    useEffect(() => {
        if (!open || reducedMotion) return;
        const anims: { pause: () => void }[] = [];

        if (curveRef.current) {
            const drawable = svg.createDrawable(curveRef.current);
            anims.push(
                animate(drawable, {
                    draw: ['0 0', '0 1'],
                    duration: 950,
                    ease: 'outQuart',
                }),
            );
        }

        if (chapterContentRef.current) {
            const items = chapterContentRef.current.querySelectorAll('[data-guide-item]');
            if (items.length > 0) {
                anims.push(
                    animate(items, {
                        opacity: [0, 1],
                        translateY: [10, 0],
                        delay: stagger(65),
                        duration: 450,
                        ease: 'outCubic',
                    }),
                );
            }
        }

        return () => anims.forEach((a) => a.pause());
    }, [open, activeChapterIndex, reducedMotion]);

    if (!open) return null;

    const chapter = CHAPTERS[activeChapterIndex];

    return (
        <div
            ref={backdropRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="video-guide-title"
            onClick={onClose}
            className="fixed inset-0 z-[75] flex items-center justify-center bg-[#031219]/80 p-4 backdrop-blur-md sm:p-6"
        >
            <div
                ref={panelRef}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-3xl overflow-hidden rounded-[2rem] border border-white/20 bg-[#07202B] text-white shadow-2xl"
            >
                <div
                    aria-hidden
                    className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-[#8BE6DC]/20 blur-3xl"
                />

                <div className="relative p-6 sm:p-8">
                    <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
                        <div>
                            <p className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-[#8BE6DC]">
                                Panduan &amp; Pratinjau Alur SIKAS
                            </p>
                            <h3 id="video-guide-title" className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">
                                Cara Kerja Pengelolaan Dana BOSP di SIKAS
                            </h3>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Tutup modal panduan"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-white/75 transition-colors hover:border-[#8BE6DC] hover:text-white"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Pemilih Bab Panduan */}
                    <div className="mt-5 grid grid-cols-3 gap-2.5">
                        {CHAPTERS.map((item, idx) => {
                            const active = idx === activeChapterIndex;
                            return (
                                <button
                                    key={item.step}
                                    type="button"
                                    onClick={() => setActiveChapterIndex(idx)}
                                    className={cn(
                                        'flex flex-col items-start rounded-2xl border p-3 text-left transition-all',
                                        active
                                            ? 'border-[#8BE6DC] bg-[#8BE6DC]/15 text-white'
                                            : 'border-white/10 bg-white/[0.04] text-white/65 hover:border-white/25 hover:text-white',
                                    )}
                                >
                                    <div className="flex w-full items-center justify-between text-[11px] font-bold">
                                        <span className={active ? 'text-[#8BE6DC]' : 'text-white/50'}>
                                            LANGKAH {item.step}
                                        </span>
                                        <span className="tabular-nums opacity-75">{item.duration}</span>
                                    </div>
                                    <p className="mt-1 line-clamp-1 text-xs font-semibold">{item.title}</p>
                                </button>
                            );
                        })}
                    </div>

                    {/* Panggung Visual Interaktif + Penjelasan Bab */}
                    <div
                        ref={chapterContentRef}
                        className="mt-5 grid items-center gap-6 rounded-2xl border border-white/15 bg-[#051821]/90 p-5 sm:grid-cols-[1.05fr_1.2fr] sm:p-6"
                    >
                        {/* Kanvas Animasi SVG */}
                        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#0B2D3B] to-[#061A23] p-4">
                            <div className="flex items-center justify-between text-[11px] text-white/70">
                                <span className="font-semibold text-[#8BE6DC]">Simulasi Tahap {chapter.step}</span>
                                <span className="inline-flex items-center gap-1 rounded-full bg-[#8BE6DC]/15 px-2 py-0.5 text-[10px] font-semibold text-[#8BE6DC]">
                                    ● Aktif
                                </span>
                            </div>

                            <svg viewBox="0 0 340 130" className="mt-2 h-32 w-full overflow-visible">
                                {[35, 70, 105].map((y) => (
                                    <line
                                        key={y}
                                        x1="16"
                                        y1={y}
                                        x2="324"
                                        y2={y}
                                        stroke="#FFFFFF"
                                        strokeOpacity="0.08"
                                        strokeDasharray="3 4"
                                    />
                                ))}
                                <path
                                    ref={curveRef}
                                    d={chapter.svgPath}
                                    fill="none"
                                    stroke="#8BE6DC"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                />
                                <circle cx="316" cy="22" r="6" fill="#FFFFFF" stroke="#8BE6DC" strokeWidth="2.5" />
                            </svg>

                            <div className="mt-2 flex items-center justify-between text-[10.5px] text-white/55">
                                <span>RKAS</span>
                                <span>→</span>
                                <span>BKU &amp; Pajak</span>
                                <span>→</span>
                                <span className="font-semibold text-[#8BE6DC]">Laporan</span>
                            </div>
                        </div>

                        {/* Rincian Bab */}
                        <div>
                            <h4 data-guide-item className="text-lg font-bold text-white">
                                {chapter.title}
                            </h4>
                            <p data-guide-item className="mt-2 text-[13.5px] leading-relaxed text-white/75">
                                {chapter.summary}
                            </p>
                            <ul className="mt-3.5 space-y-2">
                                {chapter.bullets.map((bullet) => (
                                    <li
                                        key={bullet}
                                        data-guide-item
                                        className="flex items-start gap-2 text-[13px] text-white/85"
                                    >
                                        <span className="mt-0.5 text-[#8BE6DC]">✓</span>
                                        <span>{bullet}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Footer Modal: Tautan ke Channel YouTube Resmi + Tombol Masuk/Daftar */}
                    <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5">
                        <a
                            href="https://www.youtube.com/@giandarsana5772"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="landing-focus inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/[0.06] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:border-[#8BE6DC] hover:bg-white/[0.12]"
                        >
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#8BE6DC] text-[#06222B]">
                                ▶
                            </span>
                            <span>Buka Channel YouTube Panduan Lengkap</span>
                        </a>

                        <div className="flex items-center gap-3">
                            <AccountActions
                                authenticated={authenticated}
                                hasUsers={hasUsers}
                                context="navbar"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default VideoGuideModal;
