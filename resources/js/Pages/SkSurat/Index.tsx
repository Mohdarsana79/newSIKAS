import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    Folder,
    Plus,
    Search,
    FileText,
    UploadCloud,
    MoreVertical,
    Edit2,
    Trash2,
    FolderPlus,
    Sparkles,
} from 'lucide-react';
import FolderModal from './Partials/FolderModal';
import ConfirmModal from './Partials/ConfirmModal';

interface SkFolderItem {
    id: number;
    nama_folder: string;
    deskripsi?: string | null;
    warna?: string;
    dokumens_count: number;
    templates_count: number;
    updated_at: string;
    user?: { id: number; name: string };
}

interface Props {
    folders: {
        data: SkFolderItem[];
        links: any[];
        total: number;
    };
    filters: {
        search?: string;
    };
    totalFolders: number;
    totalDokumens: number;
    totalGenerated: number;
    totalUploaded: number;
}

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; glow: string }> = {
    indigo: {
        bg: 'bg-indigo-50 dark:bg-indigo-500/10',
        text: 'text-indigo-600 dark:text-indigo-400',
        border: 'border-indigo-200 dark:border-indigo-500/20',
        glow: 'hover:border-indigo-400 dark:hover:border-indigo-500/50',
    },
    emerald: {
        bg: 'bg-emerald-50 dark:bg-emerald-500/10',
        text: 'text-emerald-600 dark:text-emerald-400',
        border: 'border-emerald-200 dark:border-emerald-500/20',
        glow: 'hover:border-emerald-400 dark:hover:border-emerald-500/50',
    },
    amber: {
        bg: 'bg-amber-50 dark:bg-amber-500/10',
        text: 'text-amber-600 dark:text-amber-400',
        border: 'border-amber-200 dark:border-amber-500/20',
        glow: 'hover:border-amber-400 dark:hover:border-amber-500/50',
    },
    rose: {
        bg: 'bg-rose-50 dark:bg-rose-500/10',
        text: 'text-rose-600 dark:text-rose-400',
        border: 'border-rose-200 dark:border-rose-500/20',
        glow: 'hover:border-rose-400 dark:hover:border-rose-500/50',
    },
    sky: {
        bg: 'bg-sky-50 dark:bg-sky-500/10',
        text: 'text-sky-600 dark:text-sky-400',
        border: 'border-sky-200 dark:border-sky-500/20',
        glow: 'hover:border-sky-400 dark:hover:border-sky-500/50',
    },
    purple: {
        bg: 'bg-purple-50 dark:bg-purple-500/10',
        text: 'text-purple-600 dark:text-purple-400',
        border: 'border-purple-200 dark:border-purple-500/20',
        glow: 'hover:border-purple-400 dark:hover:border-purple-500/50',
    },
};

export default function Index({
    folders,
    filters,
    totalFolders = 0,
    totalDokumens = 0,
    totalGenerated = 0,
    totalUploaded = 0,
}: Props) {
    const { auth } = usePage<any>().props;
    const isKepalaSekolah = auth?.user?.is_kepala_sekolah ?? false;

    const [search, setSearch] = useState(filters.search || '');
    const [showFolderModal, setShowFolderModal] = useState(false);
    const [selectedFolder, setSelectedFolder] = useState<SkFolderItem | null>(null);
    const [activeDropdown, setActiveDropdown] = useState<number | null>(null);

    // Delete confirmation state
    const [folderToDelete, setFolderToDelete] = useState<SkFolderItem | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(route('sk-surat.index'), { search }, { preserveState: true });
    };

    const handleOpenCreateModal = () => {
        setSelectedFolder(null);
        setShowFolderModal(true);
    };

    const handleOpenEditModal = (folder: SkFolderItem) => {
        setSelectedFolder(folder);
        setShowFolderModal(true);
        setActiveDropdown(null);
    };

    const handleRequestDelete = (folder: SkFolderItem) => {
        setActiveDropdown(null);
        setFolderToDelete(folder);
    };

    const confirmDeleteFolder = () => {
        if (!folderToDelete) return;

        setIsDeleting(true);
        router.delete(route('sk-surat.folder.destroy', folderToDelete.id), {
            onSuccess: () => {
                setFolderToDelete(null);
            },
            onFinish: () => setIsDeleting(false),
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h2 className="font-bold text-2xl text-gray-900 dark:text-slate-100 flex items-center gap-2.5">
                            <span className="p-2 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-xl text-indigo-600 dark:text-indigo-400">
                                <FileText className="w-6 h-6" />
                            </span>
                            SK & Dokumen Surat Sekolah
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                            Kelola folder SK, buat surat dinamis dengan generator PHPWord, dan arsipkan dokumen fisik sekolah.
                        </p>
                    </div>

                    {!isKepalaSekolah && (
                        <button
                            onClick={handleOpenCreateModal}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/20 transition-all duration-200"
                        >
                            <Plus className="w-4 h-4" />
                            Buat Folder Baru
                        </button>
                    )}
                </div>
            }
        >
            <Head title="SK & Dokumen Surat" />

            <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
                {/* Statistik Cepat */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 rounded-2xl flex items-center gap-3.5 shadow-sm">
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-xl text-indigo-600 dark:text-indigo-400">
                            <Folder className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-slate-100">{totalFolders}</div>
                            <div className="text-xs text-gray-500 dark:text-slate-400 font-medium">Total Folder</div>
                        </div>
                    </div>

                    <div className="p-4 bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 rounded-2xl flex items-center gap-3.5 shadow-sm">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-slate-100">{totalDokumens}</div>
                            <div className="text-xs text-gray-500 dark:text-slate-400 font-medium">Total Dokumen</div>
                        </div>
                    </div>

                    <div className="p-4 bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 rounded-2xl flex items-center gap-3.5 shadow-sm">
                        <div className="p-3 bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 rounded-xl text-sky-600 dark:text-sky-400">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-slate-100">{totalGenerated}</div>
                            <div className="text-xs text-gray-500 dark:text-slate-400 font-medium">Surat PHPWord</div>
                        </div>
                    </div>

                    <div className="p-4 bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 rounded-2xl flex items-center gap-3.5 shadow-sm">
                        <div className="p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl text-amber-600 dark:text-amber-400">
                            <UploadCloud className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-slate-100">{totalUploaded}</div>
                            <div className="text-xs text-gray-500 dark:text-slate-400 font-medium">Arsip Scan / Fisik</div>
                        </div>
                    </div>
                </div>

                {/* Filter & Search Bar */}
                <div className="p-4 bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                    <form onSubmit={handleSearch} className="w-full sm:w-80 relative">
                        <Search className="w-4 h-4 text-gray-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Cari nama folder..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-800 rounded-xl text-sm text-gray-900 dark:text-slate-200 placeholder:text-gray-400 dark:placeholder:text-slate-600 focus:border-indigo-500 focus:ring-indigo-500/20"
                        />
                    </form>

                    <div className="text-xs text-gray-500 dark:text-slate-400 self-start sm:self-auto">
                        Menampilkan <span className="font-semibold text-gray-800 dark:text-slate-200">{folders.data.length}</span> folder
                    </div>
                </div>

                {/* Grid Folder */}
                {folders.data.length === 0 ? (
                    <div className="py-16 text-center border-2 border-dashed border-gray-300 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-900/40 p-8 shadow-sm">
                        <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-2xl w-16 h-16 mx-auto mb-4 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <FolderPlus className="w-8 h-8" />
                        </div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-slate-200">Belum Ada Folder SK & Surat</h3>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1.5 max-w-md mx-auto">
                            Buat folder pertama Anda (misal: "SK Tim Manajemen BOSP", "Surat Perjalanan Dinas") untuk mulai menyusun dokumen surat resmi sekolah.
                        </p>
                        {!isKepalaSekolah && (
                            <button
                                onClick={handleOpenCreateModal}
                                className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-500/20"
                            >
                                <Plus className="w-4 h-4" />
                                Buat Folder Pertama
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {folders.data.map((folder) => {
                            const color = COLOR_MAP[folder.warna || 'indigo'] || COLOR_MAP.indigo;

                            return (
                                <div
                                    key={folder.id}
                                    className={`group relative bg-white dark:bg-slate-900 border ${color.border} ${color.glow} rounded-2xl p-5 transition-all duration-300 shadow-sm hover:shadow-xl dark:hover:shadow-indigo-500/5 flex flex-col justify-between`}
                                >
                                    <div>
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <Link
                                                href={route('sk-surat.show', folder.id)}
                                                className="flex items-center gap-3 group-hover:opacity-90 transition-opacity"
                                            >
                                                <div className={`p-3 rounded-2xl ${color.bg} ${color.text} border ${color.border}`}>
                                                    <Folder className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-900 dark:text-slate-100 text-base group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                                                        {folder.nama_folder}
                                                    </h4>
                                                    <span className="text-[11px] text-gray-500 dark:text-slate-500">
                                                        {folder.templates_count} master template
                                                    </span>
                                                </div>
                                            </Link>

                                            {/* Action Menu (Khusus Bendahara) */}
                                            {!isKepalaSekolah && (
                                                <div className="relative">
                                                    <button
                                                        type="button"
                                                        onClick={() => setActiveDropdown(activeDropdown === folder.id ? null : folder.id)}
                                                        className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                                    >
                                                        <MoreVertical className="w-4 h-4" />
                                                    </button>

                                                    {activeDropdown === folder.id && (
                                                        <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl shadow-xl py-1 z-20">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenEditModal(folder)}
                                                                className="w-full px-3 py-2 text-left text-xs text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white flex items-center gap-2"
                                                            >
                                                                <Edit2 className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                                                                Ubah Info
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRequestDelete(folder)}
                                                                className="w-full px-3 py-2 text-left text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center gap-2"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                                                                Hapus Folder
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <p className="text-xs text-gray-600 dark:text-slate-400 line-clamp-2 min-h-[32px] mb-4">
                                            {folder.deskripsi || <span className="italic text-gray-400 dark:text-slate-600">Tidak ada keterangan.</span>}
                                        </p>
                                    </div>

                                    <div className="pt-3 border-t border-gray-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-1.5 text-gray-500 dark:text-slate-400 font-medium">
                                            <FileText className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" />
                                            <span>{folder.dokumens_count} Dokumen</span>
                                        </div>

                                        <Link
                                            href={route('sk-surat.show', folder.id)}
                                            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline flex items-center gap-1"
                                        >
                                            Buka Folder &rarr;
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal Tambah/Edit Folder */}
            <FolderModal
                show={showFolderModal}
                onClose={() => setShowFolderModal(false)}
                folder={selectedFolder}
            />

            {/* Modal Konfirmasi Hapus Folder */}
            <ConfirmModal
                show={Boolean(folderToDelete)}
                onClose={() => setFolderToDelete(null)}
                onConfirm={confirmDeleteFolder}
                title="Hapus Folder Ini?"
                message={`Folder "${folderToDelete?.nama_folder}" beserta seluruh template dan dokumen di dalamnya akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`}
                confirmText="Ya, Hapus Folder"
                type="danger"
                loading={isDeleting}
            />
        </AuthenticatedLayout>
    );
}
