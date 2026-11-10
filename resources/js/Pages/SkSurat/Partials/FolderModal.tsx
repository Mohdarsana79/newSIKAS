import React, { useEffect, useState } from 'react';
import Modal from '@/Components/Modal';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import { router } from '@inertiajs/react';
import Swal from 'sweetalert2';

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

    useEffect(() => {
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
        if (!namaFolder.trim()) {
            Swal.fire({ icon: 'warning', title: 'Perhatian', text: 'Nama folder wajib diisi' });
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
                        Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Folder berhasil diperbarui', timer: 1500, showConfirmButton: false });
                    },
                    onError: (err) => {
                        Swal.fire({ icon: 'error', title: 'Gagal', text: Object.values(err).join(', ') });
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
                        Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Folder berhasil dibuat', timer: 1500, showConfirmButton: false });
                    },
                    onError: (err) => {
                        Swal.fire({ icon: 'error', title: 'Gagal', text: Object.values(err).join(', ') });
                    },
                    onFinish: () => setLoading(false),
                }
            );
        }
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="md">
            <form onSubmit={handleSubmit} className="p-6 bg-slate-900 border border-slate-800 text-white rounded-2xl">
                <h3 className="text-lg font-bold text-slate-100 mb-1">
                    {isEditing ? 'Ubah Informasi Folder' : 'Buat Folder Dokumen Baru'}
                </h3>
                <p className="text-xs text-slate-400 mb-5">
                    Folder digunakan untuk mengelompokkan SK dan surat resmi sekolah secara terstruktur.
                </p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                            Nama Folder <span className="text-rose-400">*</span>
                        </label>
                        <TextInput
                            type="text"
                            className="w-full bg-slate-950 border-slate-800 text-slate-200 text-sm focus:border-indigo-500 focus:ring-indigo-500/20"
                            placeholder="Contoh: SK Tim Manajemen BOSP 2026"
                            value={namaFolder}
                            onChange={(e) => setNamaFolder(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                            Deskripsi / Catatan (Opsional)
                        </label>
                        <textarea
                            className="w-full bg-slate-950 border-slate-800 text-slate-200 text-sm rounded-lg focus:border-indigo-500 focus:ring-indigo-500/20 placeholder:text-slate-600"
                            rows={3}
                            placeholder="Catatan peruntukan folder ini..."
                            value={deskripsi}
                            onChange={(e) => setDeskripsi(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
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
                                            ? 'ring-4 ring-white/20 scale-110 shadow-lg'
                                            : 'opacity-60 hover:opacity-100'
                                    }`}
                                    title={c.name}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-800">
                    <SecondaryButton type="button" onClick={onClose} disabled={loading} className="border-slate-800 text-slate-300 hover:bg-slate-800">
                        Batal
                    </SecondaryButton>
                    <PrimaryButton type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
                        {loading ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Buat Folder'}
                    </PrimaryButton>
                </div>
            </form>
        </Modal>
    );
}
