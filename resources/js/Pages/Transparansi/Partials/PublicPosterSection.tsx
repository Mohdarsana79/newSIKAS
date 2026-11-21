import { Link } from '@inertiajs/react';
import { toPng } from 'html-to-image';
import { useEffect, useRef, useState } from 'react';

import PosterCanvas from '@/Pages/FiturPelengkap/PosterTransparansi/Partials/PosterCanvas';
import { POSTER_THEMES, POSTER_THEME_LIST } from '@/Pages/FiturPelengkap/PosterTransparansi/themes';
import type { PosterThemeKey } from '@/Pages/FiturPelengkap/PosterTransparansi/types';
import { cn } from '@/lib/utils';
import type { PublicActivePosterData } from '../types';

interface PublicPosterSectionProps {
    activeData: PublicActivePosterData;
}

const POSTER_DESIGN_WIDTH = 794;

export default function PublicPosterSection({ activeData }: PublicPosterSectionProps) {
    const [themeKey, setThemeKey] = useState<PosterThemeKey>('resmi');
    const [isExportingPng, setIsExportingPng] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [previewScale, setPreviewScale] = useState(0.75);
    const [posterHeight, setPosterHeight] = useState(1120);

    const previewContainerRef = useRef<HTMLDivElement | null>(null);
    const posterRef = useRef<HTMLDivElement | null>(null);

    const activeTheme = POSTER_THEMES[themeKey];

    useEffect(() => {
        const container = previewContainerRef.current;
        if (!container) return;

        const updateScale = () => {
            const availableWidth = Math.max(260, container.clientWidth - 24);
            setPreviewScale(Math.min(1, availableWidth / POSTER_DESIGN_WIDTH));
        };

        updateScale();
        const observer = new ResizeObserver(updateScale);
        observer.observe(container);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const sheet = posterRef.current;
        if (!sheet) return;

        const updateHeight = () => {
            if (sheet.offsetHeight > 0) {
                setPosterHeight(sheet.offsetHeight);
            }
        };

        updateHeight();
        const observer = new ResizeObserver(updateHeight);
        observer.observe(sheet);
        return () => observer.disconnect();
    }, [activeData, themeKey]);

    const handleDownloadPng = async () => {
        const node = posterRef.current;
        if (!node || isExportingPng) return;

        setIsExportingPng(true);
        setFeedback(null);

        const docEl = document.documentElement;
        const previousInlineZoom = docEl.style.getPropertyValue('zoom');

        try {
            if (document.fonts?.ready) {
                await document.fonts.ready;
            }
            docEl.style.setProperty('zoom', '1');

            const dataUrl = await toPng(node, {
                pixelRatio: 3,
                width: node.offsetWidth,
                height: node.offsetHeight,
                backgroundColor: activeTheme.pageBg,
                style: {
                    transform: 'none',
                    margin: '0',
                    borderRadius: '0',
                    border: 'none',
                    boxShadow: 'none',
                },
            });

            const link = document.createElement('a');
            link.download = `transparansi-bosp-${activeData.meta.variant}-${activeData.meta.tahun}-${activeData.meta.periode}.png`;
            link.href = dataUrl;
            link.click();

            setFeedback({
                type: 'success',
                text: 'Poster Transparansi PNG HD (3×) berhasil diunduh.',
            });
        } catch (err) {
            console.error('Gagal mengunduh poster transparansi publik:', err);
            setFeedback({
                type: 'error',
                text: 'Gagal membuat gambar PNG. Silakan coba lagi atau gunakan tombol Cetak / Simpan PDF.',
            });
        } finally {
            if (previousInlineZoom) {
                docEl.style.setProperty('zoom', previousInlineZoom);
            } else {
                docEl.style.removeProperty('zoom');
            }
            setIsExportingPng(false);
        }
    };

    const handlePrint = () => {
        setFeedback(null);
        window.print();
    };

    return (
        <>
            <style>{`
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 6mm;
                    }
                    body {
                        background: #ffffff !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    #public-poster-print-wrapper {
                        transform: none !important;
                        width: 100% !important;
                        height: auto !important;
                        margin: 0 !important;
                    }
                }
            `}</style>

            <section id="poster" className="relative py-16 print:py-0">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 print:max-w-none print:px-0">
                    {/* Header + Tombol Aksi */}
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between print:hidden">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#14535E] dark:text-[#8BE6DC]">
                                Publikasi &amp; Akuntabilitas
                            </p>
                            <h2 className="mt-1.5 font-sans text-2xl font-extrabold tracking-[-0.025em] text-[#08222B] dark:text-white sm:text-3xl">
                                Poster Infografis Transparansi BOSP
                            </h2>
                            <p className="mt-1.5 max-w-2xl text-sm text-[#4A6670] dark:text-[#94B8C2]">
                                Unduh versi gambar HD (3×) untuk papan pengumuman atau grup informasi orang tua, atau
                                cetak langsung dalam format A4.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5">
                            <div className="inline-flex rounded-2xl border border-[#CBE0E0] bg-white p-1 dark:border-white/15 dark:bg-[#0B222C]">
                                {POSTER_THEME_LIST.map((theme) => (
                                    <button
                                        key={theme.key}
                                        type="button"
                                        onClick={() => setThemeKey(theme.key)}
                                        className={cn(
                                            'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition',
                                            themeKey === theme.key
                                                ? 'bg-[#08222B] text-[#8BE6DC] dark:bg-[#8BE6DC] dark:text-[#06222B]'
                                                : 'text-[#4A6670] hover:text-[#08222B] dark:text-[#94B8C2] dark:hover:text-white',
                                        )}
                                    >
                                        <span
                                            className="h-2.5 w-2.5 rounded-full"
                                            style={{ backgroundColor: theme.previewSwatches[0] }}
                                        />
                                        <span>{theme.name}</span>
                                    </button>
                                ))}
                            </div>

                            <button
                                type="button"
                                onClick={handleDownloadPng}
                                disabled={isExportingPng}
                                className="inline-flex items-center gap-2 rounded-2xl bg-[#14535E] px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#0E3F48] disabled:opacity-60 dark:bg-[#8BE6DC] dark:text-[#06222B] dark:hover:bg-[#A4F2E9]"
                            >
                                {isExportingPng ? 'Menyiapkan PNG HD...' : 'Unduh Poster PNG HD (3×)'}
                            </button>

                            <button
                                type="button"
                                onClick={handlePrint}
                                className="inline-flex items-center gap-2 rounded-2xl border border-[#CBE0E0] bg-white px-4 py-2.5 text-xs font-extrabold text-[#08222B] transition hover:bg-[#EAF4F4] dark:border-white/20 dark:bg-[#0B222C] dark:text-white dark:hover:bg-white/10"
                            >
                                Cetak / Simpan PDF
                            </button>
                        </div>
                    </div>

                    {feedback && (
                        <div
                            className={cn(
                                'mt-4 rounded-2xl border px-4 py-3 text-xs font-bold print:hidden',
                                feedback.type === 'success'
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-200'
                                    : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-400/30 dark:bg-rose-500/15 dark:text-rose-200',
                            )}
                        >
                            {feedback.text}
                        </div>
                    )}

                    {/* Area Pratinjau Poster */}
                    <div
                        ref={previewContainerRef}
                        className="mt-8 flex justify-center overflow-hidden rounded-3xl border border-[#DCEBEB] bg-[#EAF4F4]/70 p-4 dark:border-[#8BE6DC]/15 dark:bg-[#081A22] sm:p-6 print:mt-0 print:block print:rounded-none print:border-0 print:bg-white print:p-0"
                    >
                        <div
                            id="public-poster-print-wrapper"
                            style={{
                                width: `${POSTER_DESIGN_WIDTH * previewScale}px`,
                                height: `${posterHeight * previewScale}px`,
                            }}
                            className="relative"
                        >
                            <div
                                style={{
                                    width: `${POSTER_DESIGN_WIDTH}px`,
                                    transform: `scale(${previewScale})`,
                                    transformOrigin: 'top left',
                                }}
                                className="print:!transform-none print:!w-full"
                            >
                                <PosterCanvas
                                    ref={posterRef}
                                    data={activeData}
                                    theme={activeTheme}
                                    showSignatures={true}
                                    showMonthlyTrend={true}
                                    transparencyNote="Publikasi resmi keterbukaan pengelolaan Dana BOSP melalui Portal Transparansi SIKAS. Pertanyaan atau masukan dapat disampaikan melalui Komite Sekolah."
                                    hideNip={true}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Kartu Penanggung Jawab Publik (Tanpa NIP) */}
                    <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3 print:hidden">
                        <OfficialCard role="Kepala Sekolah" name={activeData.penanggung_jawab.kepala_sekolah} />
                        <OfficialCard role="Bendahara Dana BOSP" name={activeData.penanggung_jawab.bendahara} />
                        <OfficialCard role="Ketua Komite Sekolah" name={activeData.penanggung_jawab.komite} />
                    </div>
                </div>
            </section>

            {/* Footer Portal Publik */}
            <footer className="border-t border-[#DCEBEB] bg-[#051821] py-10 text-white/80 dark:border-white/10 print:hidden">
                <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
                    <div>
                        <p className="text-sm font-extrabold text-white">
                            Portal Transparansi BOSP · {activeData.sekolah.nama_sekolah}
                        </p>
                        <p className="mt-1 text-xs text-white/60">
                            Disajikan otomatis dari data resmi SIKAS (Sistem Informasi Kegiatan Anggaran Sekolah).
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
                        <Link href="/" className="text-[#8BE6DC] transition hover:text-white">
                            Beranda SIKAS
                        </Link>
                        <a href="#ringkasan" className="text-white/75 transition hover:text-white">
                            Ke Atas ↑
                        </a>
                    </div>
                </div>
            </footer>
        </>
    );
}

function OfficialCard({ role, name }: { role: string; name: string }) {
    return (
        <div className="rounded-2xl border border-[#DCEBEB] bg-white p-5 shadow-sm dark:border-[#8BE6DC]/15 dark:bg-[#0B222C]">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#14535E] dark:text-[#8BE6DC]">
                {role}
            </p>
            <p className="mt-2 text-base font-extrabold text-[#08222B] dark:text-white">{name || '-'}</p>
            <p className="mt-1 text-xs text-[#4A6670] dark:text-[#94B8C2]">Penanggung Jawab Pengelolaan BOSP</p>
        </div>
    );
}
