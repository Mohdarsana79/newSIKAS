import React, { useEffect, useState } from 'react';
import Modal from '@/Components/Modal';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import { router } from '@inertiajs/react';
import { AlertCircle } from 'lucide-react';

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

const COLOR_OPTIONS = [
    { name: 'Indigo', value: 'indigo', bg: 'bg-indigo-500' },
    { name: 'Emerald', value: 'emerald', bg: 'bg-emerald-500' },
    { name: 'Amber', value: 'amber', bg: 'bg-amber-500' },
    { name: 'Rose', value: 'rose', bg: 'bg-rose-500' },
    { name: 'Sky', value: 'sky', bg: 'bg-sky-500' },
    { name: 'Purple', value: 'purple', bg: 'bg-purple-500' },
];

export default function FolderModal({ show, onClose, folder }: Props) {
    const isEditing = Boolean(folder && folder.id);
    const [namaFolder, setNamaFolder] = useState('');
    const [deskripsi, setDeskripsi] = useState('');
    const [warna, setWarna] = useState('indigo');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        setErrorMsg(null);
        if (folder) {
            setNamaFolder(folder.nama_folder || '');
            setDeskripsi(folder.deskripsi || '');
            setWarna(folder.warna || 'indigo');
        } else {
            setNamaFolder('');
            setDeskripsi('');
            setWarna('indigo');
        }
    }, [folder, show]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        if (!namaFolder.trim()) {
            setErrorMsg('Nama folder wajib diisi.');
            return;
        }

        setLoading(true);
        if (isEditing && folder?.id) {
            router.put(
                route('sk-surat.folder.update', folder.id),
                { nama_folder: namaFolder, deskripsi, warna },
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
                { nama_folder: namaFolder, deskripsi, warna },
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
            <form onSubmit={handleSubmit} className="p-6 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-2xl">
                <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-1">
                    {isEditing ? 'Ubah Informasi Folder' : 'Buat Folder Dokumen Baru'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
                    Folder digunakan untuk mengelompokkan SK dan surat resmi sekolah secara terstruktur.
                </p>

                {errorMsg && (
                    <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{errorMsg}</span>
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                            Nama Folder <span className="text-rose-500">*</span>
                        </label>
                        <TextInput
                            type="text"
                            className="w-full bg-gray-50 dark:bg-slate-950 border-gray-300 dark:border-slate-800 text-gray-900 dark:text-slate-200 text-sm focus:border-indigo-500 focus:ring-indigo-500/20"
                            placeholder="Contoh: SK Tim Manajemen BOSP 2026"
                            value={namaFolder}
                            onChange={(e) => setNamaFolder(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                            Deskripsi / Catatan (Opsional)
                        </label>
                        <textarea
                            className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-800 text-gray-900 dark:text-slate-200 text-sm rounded-lg focus:border-indigo-500 focus:ring-indigo-500/20 placeholder:text-gray-400 dark:placeholder:text-slate-600"
                            rows={3}
                            placeholder="Catatan peruntukan folder ini..."
                            value={deskripsi}
                            onChange={(e) => setDeskripsi(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                            Pilihan Warna Folder
                        </label>
                        <div className="flex items-center gap-3">
                            {COLOR_OPTIONS.map((c) => (
                                <button
                                    key={c.value}
                                    type="button"
                                    onClick={() => setWarna(c.value)}
                                    className={`w-7 h-7 rounded-full ${c.bg} transition-all duration-200 ${
                                        warna === c.value
                                            ? 'ring-4 ring-indigo-400/40 dark:ring-white/20 scale-110 shadow-lg'
                                            : 'opacity-60 hover:opacity-100'
                                    }`}
                                    title={c.name}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-800">
                    <SecondaryButton type="button" onClick={onClose} disabled={loading} className="border-gray-300 dark:border-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800">
                        Batal
                    </SecondaryButton>
                    <PrimaryButton type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        {loading ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Buat Folder'}
                    </PrimaryButton>
                </div>
            </form>
        </Modal>
    );
}
