import { Transition } from '@headlessui/react';
import { ExternalLink, Send, X } from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';

const WHATSAPP_NUMBER_INTL = '6285342209966';
const WHATSAPP_DISPLAY_NUMBER = '085342209966';

const COMPLAINT_CATEGORIES = [
    'Kendala / Bug Aplikasi',
    'RKAS & Penatausahaan BKU',
    'Sinkronisasi ARKAS',
    'Lisensi & Pembaharuan',
    'Lainnya',
] as const;

interface WhatsAppComplaintWidgetProps {
    defaultSchoolName?: string | null;
}

function buildWhatsAppUrl(message: string): string {
    return `https://wa.me/${WHATSAPP_NUMBER_INTL}?text=${encodeURIComponent(message)}`;
}

function WhatsAppIcon({ className = 'h-5 w-5' }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M20.52 3.48A11.86 11.86 0 0 0 12.06 0C5.5 0 .16 5.34.16 11.9c0 2.1.55 4.15 1.59 5.95L0 24l6.33-1.66a11.86 11.86 0 0 0 5.73 1.46h.01c6.56 0 11.9-5.34 11.9-11.9 0-3.18-1.24-6.17-3.45-8.42ZM12.07 21.8h-.01a9.86 9.86 0 0 1-5.03-1.38l-.36-.21-3.76.99 1-3.66-.24-.38a9.84 9.84 0 0 1-1.51-5.26c0-5.45 4.44-9.89 9.91-9.89 2.64 0 5.13 1.03 7 2.9a9.83 9.83 0 0 1 2.9 7c0 5.45-4.44 9.89-9.9 9.89Zm5.43-7.41c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.22 3.08.15.2 2.1 3.21 5.09 4.5.71.31 1.27.49 1.7.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35Z" />
        </svg>
    );
}

export default function WhatsAppComplaintWidget({ defaultSchoolName }: WhatsAppComplaintWidgetProps) {
    const [open, setOpen] = useState(false);
    const [senderName, setSenderName] = useState(defaultSchoolName?.trim() || '');
    const [category, setCategory] = useState<string>(COMPLAINT_CATEGORIES[0]);
    const [detail, setDetail] = useState('');
    const [detailError, setDetailError] = useState('');
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setOpen(false);
            }
        };

        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [open]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const trimmedDetail = detail.trim();

        if (!trimmedDetail) {
            setDetailError('Mohon jelaskan detail laporan pengaduan terlebih dahulu.');
            return;
        }

        setDetailError('');

        const lines = [
            'Halo Admin SIKAS, saya ingin menyampaikan *Laporan Pengaduan*:',
            '',
            `• *Nama / Sekolah:* ${senderName.trim() || '-'}`,
            `• *Kategori:* ${category}`,
            '• *Detail Pengaduan:*',
            trimmedDetail,
        ];

        window.open(buildWhatsAppUrl(lines.join('\n')), '_blank', 'noopener,noreferrer');
    };

    const quickDirectUrl = buildWhatsAppUrl(
        'Halo Admin SIKAS, saya ingin menyampaikan Laporan Pengaduan.\n\nNama / Sekolah:\nDetail Pengaduan:',
    );

    return (
        <div
            ref={containerRef}
            className="fixed bottom-5 right-4 z-40 flex flex-col items-end gap-3 sm:right-6"
        >
            <Transition
                show={open}
                enter="transition ease-out duration-200"
                enterFrom="transform opacity-0 translate-y-3 scale-95"
                enterTo="transform opacity-100 translate-y-0 scale-100"
                leave="transition ease-in duration-150"
                leaveFrom="transform opacity-100 translate-y-0 scale-100"
                leaveTo="transform opacity-0 translate-y-3 scale-95"
            >
                <div
                    id="whatsapp-complaint-panel"
                    role="dialog"
                    aria-label="Form Laporan Pengaduan WhatsApp"
                    className="w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-[#08222B]/10 bg-white shadow-[0_24px_60px_-15px_rgba(5,24,33,0.35)] dark:border-white/10 dark:bg-[#091E26]"
                >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 bg-gradient-to-r from-[#06222B] via-[#0A3440] to-[#0E4A4A] px-4 py-3.5 text-white">
                        <div className="flex items-center gap-2.5">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#25D366] text-white shadow-sm">
                                <WhatsAppIcon className="h-5 w-5" />
                            </span>
                            <div>
                                <h3 className="text-[13.5px] font-bold leading-tight">Laporan Pengaduan</h3>
                                <p className="mt-0.5 text-[11px] font-medium text-[#8BE6DC]">
                                    WhatsApp: {WHATSAPP_DISPLAY_NUMBER}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            aria-label="Tutup panel laporan pengaduan"
                            className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white"
                        >
                            <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                    </div>

                    {/* Body */}
                    <form onSubmit={handleSubmit} className="space-y-3 p-4">
                        <p className="rounded-2xl bg-[#F2FAF9] px-3 py-2 text-[11px] leading-relaxed text-[#0B3540] dark:bg-white/[0.05] dark:text-[#C5EAE6]">
                            Untuk laporan pengaduan, langsung hubungi kami lewat WhatsApp{' '}
                            <strong className="font-bold">{WHATSAPP_DISPLAY_NUMBER}</strong> dengan menjelaskan detail kendala Anda di bawah ini.
                        </p>

                        <div>
                            <label
                                htmlFor="wa-complaint-sender"
                                className="mb-1 block text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                            >
                                Nama / Asal Sekolah
                            </label>
                            <input
                                id="wa-complaint-sender"
                                type="text"
                                value={senderName}
                                onChange={(e) => setSenderName(e.target.value)}
                                placeholder="Contoh: Bendahara SDN 01..."
                                maxLength={120}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-[12px] text-slate-900 placeholder:text-slate-400 focus:border-[#25D366] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]/20 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-slate-500"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="wa-complaint-category"
                                className="mb-1 block text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                            >
                                Kategori Pengaduan
                            </label>
                            <select
                                id="wa-complaint-category"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-[12px] text-slate-900 focus:border-[#25D366] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]/20 dark:border-white/10 dark:bg-[#0D2832] dark:text-white"
                            >
                                {COMPLAINT_CATEGORIES.map((item) => (
                                    <option key={item} value={item}>
                                        {item}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label
                                htmlFor="wa-complaint-detail"
                                className="mb-1 block text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                            >
                                Detail Laporan Pengaduan <span className="text-rose-500">*</span>
                            </label>
                            <textarea
                                id="wa-complaint-detail"
                                rows={3}
                                value={detail}
                                onChange={(e) => {
                                    setDetail(e.target.value);
                                    if (detailError) setDetailError('');
                                }}
                                placeholder="Jelaskan kronologi, menu yang bermasalah, atau detail kendala Anda..."
                                maxLength={1000}
                                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-[12px] text-slate-900 placeholder:text-slate-400 focus:border-[#25D366] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]/20 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-slate-500"
                            />
                            {detailError && (
                                <p className="mt-1 text-[10.5px] font-semibold text-rose-500">{detailError}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-[12.5px] font-bold text-white shadow-md shadow-[#25D366]/25 transition hover:bg-[#1EBA59] active:scale-[0.99]"
                        >
                            <Send className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Kirim ke WhatsApp</span>
                        </button>

                        <div className="pt-0.5 text-center">
                            <a
                                href={quickDirectUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 underline-offset-2 transition hover:text-[#128C7E] hover:underline dark:text-slate-400 dark:hover:text-[#8BE6DC]"
                            >
                                <span>Langsung chat WA tanpa isi form</span>
                                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                            </a>
                        </div>
                    </form>
                </div>
            </Transition>

            {/* Floating Pill Trigger */}
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                aria-expanded={open}
                aria-controls="whatsapp-complaint-panel"
                className="group relative inline-flex items-center gap-2.5 rounded-full bg-[#25D366] py-2.5 pl-3.5 pr-4 text-white shadow-[0_14px_32px_-8px_rgba(37,211,102,0.65)] ring-2 ring-white/80 transition duration-200 hover:-translate-y-0.5 hover:bg-[#1EBA59] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#8BE6DC] dark:ring-[#051319]"
            >
                <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-white/15">
                    <WhatsAppIcon className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                    <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-70" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
                    </span>
                </span>
                <span className="text-[12.5px] font-extrabold tracking-tight">Laporan Pengaduan</span>
            </button>
        </div>
    );
}
