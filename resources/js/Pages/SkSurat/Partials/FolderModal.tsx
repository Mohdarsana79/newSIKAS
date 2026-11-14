import React, { useEffect, useState } from 'react';
import Modal from '@/Components/Modal';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import IconTile from '@/Components/ui/IconTile';
import { router } from '@inertiajs/react';
import { AlertCircle, FolderPlus, Palette, Pencil } from 'lucide-react';
import FolderIconTile from './FolderIconTile';
import {
    PRESET_FOLDER_COLORS,
    isValidFolderColor,
    normalizeHexColor,
    resolveFolderTheme,
} from './folderColors';

interface Folder {
    id?: number;
    nama_folder: string;
    deskripsi?: string | null;
    warna?: string;
}

interface Props {
    show: boolean;
    onClose: () => void;
    folder?: Folder | null;
}

const LABEL_CLASS =
    'mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500';

const TEXTAREA_CLASS =
    'w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-[12px] font-semibold text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10';

export default function FolderModal({ show, onClose, folder }: Props) {
    const isEditing = Boolean(folder && folder.id);
    const [namaFolder, setNamaFolder] = useState('');
    const [deskripsi, setDeskripsi] = useState('');
    const [warna, setWarna] = useState('indigo');
    const [hexInput, setHexInput] = useState('#5b3df5');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const activeTheme = resolveFolderTheme(warna);

    useEffect(() => {
        setErrorMsg(null);
        if (folder) {
            const initialColor = folder.warna || 'indigo';
            setNamaFolder(folder.nama_folder || '');
            setDeskripsi(folder.deskripsi || '');
            setWarna(initialColor);
            setHexInput(resolveFolderTheme(initialColor).hex.toLowerCase());
        } else {
            setNamaFolder('');
            setDeskripsi('');
            setWarna('indigo');
            setHexInput('#5b3df5');
        }
    }, [folder, show]);

    const handleSelectPreset = (presetValue: string, presetHex: string) => {
        setWarna(presetValue);
        setHexInput(presetHex.toLowerCase());
    };

    const handleCustomColorPick = (rawHex: string) => {
        const normalized = normalizeHexColor(rawHex);
        if (normalized) {
            setWarna(normalized);
            setHexInput(normalized);
        }
    };

    const handleHexInputChange = (raw: string) => {
        setHexInput(raw);
        const normalized = normalizeHexColor(raw);
        if (normalized) {
            setWarna(normalized);
        }
    };

    const handleHexInputBlur = () => {
        setHexInput(activeTheme.hex.toLowerCase());
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        if (!namaFolder.trim()) {
            setErrorMsg('Nama folder wajib diisi.');
            return;
        }

        let resolvedColor = warna;
        const normalizedHexInput = normalizeHexColor(hexInput);
        const hasPendingCustomHex = hexInput.trim().toLowerCase() !== activeTheme.hex.toLowerCase();

        if (hasPendingCustomHex) {
            if (!normalizedHexInput) {
                setErrorMsg('Kode warna hex tidak valid. Gunakan format #RGB atau #RRGGBB.');
                return;
            }
            resolvedColor = normalizedHexInput;
        } else if (!isValidFolderColor(resolvedColor)) {
            setErrorMsg('Warna folder tidak valid.');
            return;
        }

        setLoading(true);
        if (isEditing && folder?.id) {
            router.put(
                route('sk-surat.folder.update', folder.id),
                { nama_folder: namaFolder, deskripsi, warna: resolvedColor },
                {
                    onSuccess: () => {
                        onClose();
                    },
                    onError: (err) => {
                        setErrorMsg(Object.values(err).join(', '));
                    },
                    onFinish: () => setLoading(false),
                }
            );
        } else {
            router.post(
                route('sk-surat.folder.store'),
                { nama_folder: namaFolder, deskripsi, warna: resolvedColor },
                {
                    onSuccess: () => {
                        onClose();
                    },
                    onError: (err) => {
                        setErrorMsg(Object.values(err).join(', '));
                    },
                    onFinish: () => setLoading(false),
                }
            );
        }
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="md">
            <form onSubmit={handleSubmit} className="relative overflow-hidden">
                <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-brand-500/10 blur-3xl dark:bg-brand-500/[0.08]" />

                {/* Header */}
                <div className="relative flex items-center gap-3 border-b border-slate-100 px-6 py-4 dark:border-white/5">
                    <IconTile tone="violet" size="lg">
                        {isEditing ? <Pencil className="w-4 h-4" /> : <FolderPlus className="w-4 h-4" />}
                    </IconTile>
                    <div className="min-w-0">
                        <h3 className="text-[14px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                            {isEditing ? 'Ubah Informasi Folder' : 'Buat Folder Dokumen Baru'}
                        </h3>
                        <p className="mt-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                            Folder digunakan untuk mengelompokkan SK dan surat resmi sekolah secara terstruktur.
                        </p>
                    </div>
                </div>

                <div className="relative space-y-4 px-6 py-5">
                    {errorMsg && (
                        <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-pastel-rose p-3 text-[11px] font-semibold text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    <div>
                        <label className={LABEL_CLASS}>
                            Nama Folder <span className="text-rose-500">*</span>
                        </label>
                        <TextInput
                            type="text"
                            placeholder="Contoh: SK Tim Manajemen BOSP 2026"
                            value={namaFolder}
                            onChange={(e) => setNamaFolder(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label className={LABEL_CLASS}>
                            Deskripsi / Catatan (Opsional)
                        </label>
                        <textarea
                            className={TEXTAREA_CLASS}
                            rows={3}
                            placeholder="Catatan peruntukan folder ini..."
                            value={deskripsi}
                            onChange={(e) => setDeskripsi(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className={`${LABEL_CLASS} mb-2`}>
                            Pilihan Warna Folder
                        </label>
                        <div className="flex flex-wrap items-center gap-3">
                            {PRESET_FOLDER_COLORS.map((c) => (
                                <button
                                    key={c.value}
                                    type="button"
                                    onClick={() => handleSelectPreset(c.value, c.hex)}
                                    style={{ backgroundColor: c.hex }}
                                    className={`h-7 w-7 rounded-full transition-all duration-200 ${
                                        warna === c.value
                                            ? 'scale-110 shadow-lg ring-4 ring-lime-400/40 dark:ring-lime-300/30'
                                            : 'opacity-70 hover:opacity-100'
                                    }`}
                                    title={c.name}
                                    aria-label={`Warna ${c.name}`}
                                />
                            ))}

                            <span className="h-5 w-px bg-slate-200 dark:bg-white/10" aria-hidden="true" />

                            <label
                                className={`relative inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-xl border px-2.5 text-[11px] font-bold transition ${
                                    activeTheme.isCustom
                                        ? 'border-lime-400 bg-lime-100/70 text-slate-900 ring-2 ring-lime-300/60 dark:border-lime-400/60 dark:bg-lime-400/15 dark:text-lime-200 dark:ring-lime-400/20'
                                        : 'border-slate-200/90 bg-white text-slate-600 hover:border-lime-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-lime-400/50'
                                }`}
                                title="Pilih warna bebas"
                            >
                                <span
                                    className="h-4 w-4 shrink-0 rounded-full border border-black/10 dark:border-white/20"
                                    style={{ backgroundColor: activeTheme.hex }}
                                />
                                <Palette className="h-3.5 w-3.5" />
                                <span>Bebas</span>
                                <input
                                    type="color"
                                    value={activeTheme.hex}
                                    onChange={(e) => handleCustomColorPick(e.target.value)}
                                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                                    aria-label="Pemilih warna folder bebas"
                                />
                            </label>

                            <input
                                type="text"
                                value={hexInput}
                                onChange={(e) => handleHexInputChange(e.target.value)}
                                onBlur={handleHexInputBlur}
                                maxLength={7}
                                placeholder="#5b3df5"
                                aria-label="Kode warna Hex folder"
                                className="w-24 rounded-xl border border-slate-200/90 bg-white px-2.5 py-1.5 font-mono text-[11px] font-semibold uppercase text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10"
                            />
                        </div>

                        {/* Pratinjau Tile Ikon Folder */}
                        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-3.5 py-2.5 dark:border-white/10 dark:bg-white/[0.03]">
                            <FolderIconTile theme={activeTheme} size="sm" />
                            <div className="min-w-0">
                                <p className="truncate text-[11.5px] font-extrabold text-slate-800 dark:text-white">
                                    {namaFolder.trim() || 'Pratinjau Kartu Folder'}
                                </p>
                                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                                    Warna aktif: <span className="font-mono uppercase text-slate-600 dark:text-slate-300">{activeTheme.isCustom ? activeTheme.hex : `${warna} (${activeTheme.hex})`}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="relative flex justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-white/5">
                    <SecondaryButton type="button" onClick={onClose} disabled={loading}>
                        Batal
                    </SecondaryButton>
                    <PrimaryButton type="submit" disabled={loading}>
                        {loading ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Buat Folder'}
                    </PrimaryButton>
                </div>
            </form>
        </Modal>
    );
}
