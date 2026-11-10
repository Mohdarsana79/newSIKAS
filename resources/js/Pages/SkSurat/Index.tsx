import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    Folder,
    Plus,
    Search,
    FileText,
    FileSpreadsheet,
    UploadCloud,
    MoreVertical,
    Edit2,
    Trash2,
    FolderPlus,
    Sparkles,
} from 'lucide-react';
import Swal from 'sweetalert2';
import FolderModal from './Partials/FolderModal';

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
    indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20', glow: 'group-hover:border-indigo-500/50' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', glow: 'group-hover:border-emerald-500/50' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', glow: 'group-hover:border-amber-500/50' },
    rose: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20', glow: 'group-hover:border-rose-500/50' },
    sky: { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20', glow: 'group-hover:border-sky-500/50' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20', glow: 'group-hover:border-purple-500/50' },
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

    const handleDeleteFolder = (folder: SkFolderItem) => {
        setActiveDropdown(null);
        Swal.fire({
            title: 'Hapus Folder Ini?',
            text: `Folder "${folder.nama_folder}" beserta seluruh template dan dokumen di dalamnya akan dihapus permanen.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#334155',
            confirmButtonText: 'Ya, Hapus Folder',
            cancelButtonText: 'Batal',
        }).then((res) => {
            if (res.isConfirmed) {
                router.delete(route('sk-surat.folder.destroy', folder.id), {
                    onSuccess: () => {
                        Swal.fire({ icon: 'success', title: 'Terhapus', text: 'Folder berhasil dihapus', timer: 1500, showConfirmButton: false });
                    },
                });
            }
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h2 className="font-bold text-2xl text-slate-100 flex items-center gap-2.5">
                            <span className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                                <FileText className="w-6 h-6" />
                            </span>
                            SK & Dokumen Surat Sekolah
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">
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
                    <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-3.5 shadow-sm">
                        <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                            <Folder className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-slate-100">{totalFolders}</div>
                            <div className="text-xs text-slate-400 font-medium">Total Folder</div>
                        </div>
                    </div>

                    <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-3.5 shadow-sm">
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-slate-100">{totalDokumens}</div>
                            <div className="text-xs text-slate-400 font-medium">Total Dokumen</div>
                        </div>
                    </div>

                    <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-3.5 shadow-sm">
                        <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-slate-100">{totalGenerated}</div>
                            <div className="text-xs text-slate-400 font-medium">Surat PHPWord</div>
                        </div>
                    </div>

                    <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-3.5 shadow-sm">
                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
                            <UploadCloud className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-slate-100">{totalUploaded}</div>
                            <div className="text-xs text-slate-400 font-medium">Arsip Scan / Fisik</div>
                        </div>
                    </div>
                </div>

                {/* Filter & Search Bar */}
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                    <form onSubmit={handleSearch} className="w-full sm:w-80 relative">
                        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Cari nama folder..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder:text-slate-600 focus:border-indigo-500 focus:ring-indigo-500/20"
                        />
                    </form>

                    <div className="text-xs text-slate-500 self-start sm:self-auto">
                        Menampilkan <span className="font-semibold text-slate-300">{folders.data.length}</span> folder
                    </div>
                </div>

                {/* Grid Folder */}
                {folders.data.length === 0 ? (
                    <div className="py-16 text-center border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/40 p-8">
                        <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl w-16 h-16 mx-auto mb-4 flex items-center justify-center text-indigo-400">
                            <FolderPlus className="w-8 h-8" />
                        </div>
                        <h3 className="text-base font-bold text-slate-200">Belum Ada Folder SK & Surat</h3>
                        <p className="text-xs text-slate-400 mt-1.5 max-w-md mx-auto">
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
                                    className={`group relative bg-slate-900 border ${color.border} ${color.glow} rounded-2xl p-5 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/5 flex flex-col justify-between`}
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
                                                    <h4 className="font-bold text-slate-100 text-base group-hover:text-indigo-400 transition-colors line-clamp-1">
                                                        {folder.nama_folder}
                                                    </h4>
                                                    <span className="text-[11px] text-slate-500">
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
                                                        className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                                                    >
                                                        <MoreVertical className="w-4 h-4" />
                                                    </button>

                                                    {activeDropdown === folder.id && (
                                                        <div className="absolute right-0 mt-1 w-36 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl py-1 z-20">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenEditModal(folder)}
                                                                className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                                                            >
                                                                <Edit2 className="w-3.5 h-3.5 text-indigo-400" />
                                                                Ubah Info
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteFolder(folder)}
                                                                className="w-full px-3 py-2 text-left text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                                                                Hapus Folder
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <p className="text-xs text-slate-400 line-clamp-2 min-h-[32px] mb-4">
                                            {folder.deskripsi || <span className="italic text-slate-600">Tidak ada keterangan.</span>}
                                        </p>
                                    </div>

                                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-1.5 text-slate-400 font-medium">
                                            <FileText className="w-3.5 h-3.5 text-slate-500" />
                                            <span>{folder.dokumens_count} Dokumen</span>
                                        </div>

                                        <Link
                                            href={route('sk-surat.show', folder.id)}
                                            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1"
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
        </AuthenticatedLayout>
    );
}
