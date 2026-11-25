import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Check,
    Copy,
    Image as ImageIcon,
    Info,
    Search,
    Sparkles,
    Table as TableIcon,
    Tag,
} from 'lucide-react';
import { SkTagGroup } from './types';

interface Props {
    catalog: SkTagGroup[];
    compact?: boolean;
}

export default function TagReferenceCatalog({ catalog = [], compact = false }: Props) {
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [copiedTag, setCopiedTag] = useState<string | null>(null);
    const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hostRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        return () => {
            if (copyTimerRef.current !== null) {
                clearTimeout(copyTimerRef.current);
            }
        };
    }, []);

    const handleCopy = async (tag: string) => {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(tag);
            } else {
                const ta = document.createElement('textarea');
                ta.value = tag;
                ta.setAttribute('readonly', '');
                ta.className = 'fixed -left-[9999px] top-0 opacity-0 pointer-events-none';
                (hostRef.current ?? document.body).appendChild(ta);
                ta.select();
                document.execCommand('copy');
                ta.parentNode?.removeChild(ta);
            }
            if (copyTimerRef.current !== null) {
                clearTimeout(copyTimerRef.current);
            }
            setCopiedTag(tag);
            copyTimerRef.current = setTimeout(() => {
                setCopiedTag((prev) => (prev === tag ? null : prev));
                copyTimerRef.current = null;
            }, 1500);
        } catch {
            // Abaikan bila clipboard diblokir browser
        }
    };

    const totalTags = useMemo(
        () => catalog.reduce((sum, g) => sum + g.items.length, 0),
        [catalog]
    );

    const filteredGroups = useMemo(() => {
        const q = search.trim().toLowerCase();
        return catalog
            .filter((g) => activeCategory === 'all' || g.id === activeCategory)
            .map((g) => {
                if (!q) return g;
                const matchesGroup =
                    g.group.toLowerCase().includes(q) ||
                    g.description.toLowerCase().includes(q) ||
                    g.source_label.toLowerCase().includes(q);
                const items = matchesGroup
                    ? g.items
                    : g.items.filter(
                          (item) =>
                              item.tag.toLowerCase().includes(q) ||
                              item.key.toLowerCase().includes(q) ||
                              item.label.toLowerCase().includes(q) ||
                              item.example.toLowerCase().includes(q) ||
                              (item.aliases ?? []).some((a) => a.toLowerCase().includes(q))
                      );
                return { ...g, items };
            })
            .filter((g) => g.items.length > 0);
    }, [catalog, activeCategory, search]);

    const renderTypeBadge = (type: SkTagGroup['type']) => {
        if (type === 'table') {
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[9.5px] font-extrabold text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
                    <TableIcon className="h-3 w-3" />
                    Tabel Baris Dinamis
                </span>
            );
        }
        if (type === 'image') {
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[9.5px] font-extrabold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                    <ImageIcon className="h-3 w-3" />
                    Gambar Otomatis
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[9.5px] font-extrabold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                <Sparkles className="h-3 w-3" />
                Teks Otomatis
            </span>
        );
    };

    return (
        <div ref={hostRef} className="space-y-4">
            {/* Panduan Singkat */}
            <div className="rounded-2xl border border-brand-200/80 bg-brand-50/70 p-3.5 text-[11px] text-slate-700 dark:border-brand-400/20 dark:bg-brand-500/10 dark:text-slate-200">
                <div className="flex items-start gap-2.5">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-300" />
                    <div className="space-y-1 leading-relaxed">
                        <p className="font-bold text-slate-900 dark:text-white">
                            Cara Pakai Tag Otomatis &amp; Tag Manual di Microsoft Word (.docx)
                        </p>
                        <p className="text-[10.5px] text-slate-600 dark:text-slate-300">
                            Salin tag di bawah ini ke template Word Anda (contoh:{' '}
                            <code className="rounded bg-white px-1 py-0.5 font-mono font-bold text-brand-700 dark:bg-white/10 dark:text-brand-300">
                                {'${uraian}'}
                            </code>{' '}
                            atau{' '}
                            <code className="rounded bg-white px-1 py-0.5 font-mono font-bold text-brand-700 dark:bg-white/10 dark:text-brand-300">
                                {'${jumlah_rupiah}'}
                            </code>
                            ). Saat membuat surat, sistem otomatis memunculkan pemilih data terkait dan mengisinya. Jika Anda menuliskan tag kustom di luar daftar ini (misal{' '}
                            <code className="rounded bg-white px-1 py-0.5 font-mono font-bold text-amber-700 dark:bg-white/10 dark:text-amber-300">
                                {'${lokasi_kegiatan}'}
                            </code>
                            ), sistem otomatis menyediakan kolom input manual.
                        </p>
                    </div>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="space-y-2.5">
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={`Cari dari ${totalTags} tag referensi (mis. belanja, toko, ptk, pagu, terbilang, kop_surat)...`}
                        className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-[11.5px] font-semibold text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-200/50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
                    />
                </div>

                <div className="flex flex-wrap gap-1.5">
                    <button
                        type="button"
                        onClick={() => setActiveCategory('all')}
                        className={`rounded-xl px-2.5 py-1 text-[10.5px] font-extrabold transition ${
                            activeCategory === 'all'
                                ? 'bg-slate-900 text-white dark:bg-lime-400 dark:text-slate-950'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                        }`}
                    >
                        Semua ({totalTags})
                    </button>
                    {catalog.map((group) => (
                        <button
                            key={group.id}
                            type="button"
                            onClick={() => setActiveCategory(group.id)}
                            className={`rounded-xl px-2.5 py-1 text-[10.5px] font-bold transition ${
                                activeCategory === group.id
                                    ? 'bg-brand-600 text-white dark:bg-brand-400 dark:text-slate-950'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                            }`}
                        >
                            {group.source_label} ({group.items.length})
                        </button>
                    ))}
                </div>
            </div>

            {/* Daftar Grup Tag */}
            {filteredGroups.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 py-8 text-center text-[11.5px] font-semibold text-slate-400 dark:border-white/10 dark:text-slate-500">
                    <Tag className="mx-auto mb-2 h-6 w-6 opacity-40" />
                    Tidak ada tag referensi yang cocok dengan pencarian &ldquo;{search}&rdquo;.
                    <p className="mt-1 text-[10.5px] font-normal">
                        Anda tetap bisa menulis tag buatan sendiri (mis. <code className="font-mono">{'${tag_anda}'}</code>) di Word — sistem akan otomatis menyediakan form isian manualnya.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredGroups.map((group) => (
                        <div
                            key={group.id}
                            className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white dark:border-white/10 dark:bg-white/[0.02]"
                        >
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5 dark:border-white/5 dark:bg-white/[0.03]">
                                <div>
                                    <h4 className="text-[12px] font-extrabold text-slate-900 dark:text-white">
                                        {group.group}
                                    </h4>
                                    <p className="mt-0.5 text-[10.5px] text-slate-500 dark:text-slate-400">
                                        {group.description}
                                    </p>
                                </div>
                                {renderTypeBadge(group.type)}
                            </div>

                            <div className="grid grid-cols-1 divide-y divide-slate-100 dark:divide-white/5 lg:grid-cols-2 lg:divide-y-0">
                                {group.items.map((item) => {
                                    const isCopied = copiedTag === item.tag;
                                    return (
                                        <div
                                            key={item.key}
                                            className={`flex flex-col justify-between gap-2 border-slate-100 px-4 transition hover:bg-slate-50/70 dark:border-white/5 dark:hover:bg-white/[0.03] sm:flex-row sm:items-center lg:border-b lg:odd:border-r ${
                                                compact ? 'py-2' : 'py-2.5'
                                            }`}
                                        >
                                            <div className="min-w-0 flex-1 space-y-0.5">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <code className="rounded-lg bg-brand-50 px-2 py-0.5 font-mono text-[11px] font-extrabold text-brand-700 ring-1 ring-brand-200/70 dark:bg-brand-500/15 dark:text-brand-300 dark:ring-brand-400/20">
                                                        {item.tag}
                                                    </code>
                                                    <span className="text-[11.5px] font-bold text-slate-800 dark:text-slate-100">
                                                        {item.label}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                                                    <span className="truncate">
                                                        Contoh: <span className="font-semibold text-slate-700 dark:text-slate-300">{item.example}</span>
                                                    </span>
                                                    {item.aliases && item.aliases.length > 0 && (
                                                        <span className="text-slate-400 dark:text-slate-500">
                                                            &bull; Alias:{' '}
                                                            {item.aliases.map((a) => `\${${a}}`).join(', ')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => handleCopy(item.tag)}
                                                className={`inline-flex shrink-0 items-center justify-center gap-1 rounded-xl px-2.5 py-1.5 text-[10.5px] font-extrabold transition ${
                                                    isCopied
                                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                                                        : 'border border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10'
                                                }`}
                                            >
                                                {isCopied ? (
                                                    <>
                                                        <Check className="h-3.5 w-3.5" />
                                                        Tersalin
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="h-3.5 w-3.5" />
                                                        Salin Tag
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
