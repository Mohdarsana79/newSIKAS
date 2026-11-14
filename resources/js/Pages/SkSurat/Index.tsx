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
import { resolveFolderTheme } from './Partials/folderColors';
import IconTile from '@/Components/ui/IconTile';
import PageHeader from '@/Components/ui/PageHeader';
import StatusBadge from '@/Components/ui/StatusBadge';
import Surface from '@/Components/ui/Surface';
import EmptyState from '@/Components/ui/EmptyState';

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
        <AuthenticatedLayout>
            <Head title="SK & Dokumen Surat" />

            <div className="space-y-4">
                <PageHeader
                    className="animate-rise"
                    breadcrumb={[
                        { label: 'Dashboard' },
                        { label: 'SK & Surat' },
                    ]}
                    title="SK & Dokumen Surat Sekolah"
                    badge={<StatusBadge tone="violet">SK &amp; Surat</StatusBadge>}
                    subtitle="Kelola folder SK, buat surat dinamis dengan generator PHPWord, dan arsipkan dokumen fisik sekolah."
                    actions={
                        !isKepalaSekolah ? (
                            <button
                                onClick={handleOpenCreateModal}
                                className="inline-flex items-center gap-1.5 rounded-2xl bg-lime-400 px-4 py-2.5 text-[11.5px] font-extrabold text-slate-950 shadow-lime transition hover:-translate-y-0.5 hover:bg-lime-300"
                            >
                                <Plus className="w-4 h-4" />
                                Buat Folder Baru
                            </button>
                        ) : undefined
                    }
                />

                {/* Statistik Cepat */}
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <div className="group sikas-card sikas-card-hover animate-rise relative flex items-center gap-3 overflow-hidden p-4" style={{ animationDelay: '60ms' }}>
                        <IconTile tone="violet" size="md" className="transition-transform duration-300 group-hover:scale-110">
                            <Folder className="w-4 h-4" />
                        </IconTile>
                        <div className="min-w-0">
                            <div className="text-sikas-num text-[19px] font-extrabold tracking-tight text-slate-900 dark:text-white">{totalFolders}</div>
                            <div className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Total Folder</div>
                        </div>
                    </div>

                    <div className="group sikas-card sikas-card-hover animate-rise relative flex items-center gap-3 overflow-hidden p-4" style={{ animationDelay: '100ms' }}>
                        <IconTile tone="mint" size="md" className="transition-transform duration-300 group-hover:scale-110">
                            <FileText className="w-4 h-4" />
                        </IconTile>
                        <div className="min-w-0">
                            <div className="text-sikas-num text-[19px] font-extrabold tracking-tight text-slate-900 dark:text-white">{totalDokumens}</div>
                            <div className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Total Dokumen</div>
                        </div>
                    </div>

                    <div className="group sikas-card sikas-card-hover animate-rise relative flex items-center gap-3 overflow-hidden p-4" style={{ animationDelay: '140ms' }}>
                        <IconTile tone="sky" size="md" className="transition-transform duration-300 group-hover:scale-110">
                            <Sparkles className="w-4 h-4" />
                        </IconTile>
                        <div className="min-w-0">
                            <div className="text-sikas-num text-[19px] font-extrabold tracking-tight text-slate-900 dark:text-white">{totalGenerated}</div>
                            <div className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Surat PHPWord</div>
                        </div>
                    </div>

                    <div className="group sikas-card sikas-card-hover animate-rise relative flex items-center gap-3 overflow-hidden p-4" style={{ animationDelay: '180ms' }}>
                        <IconTile tone="amber" size="md" className="transition-transform duration-300 group-hover:scale-110">
                            <UploadCloud className="w-4 h-4" />
                        </IconTile>
                        <div className="min-w-0">
                            <div className="text-sikas-num text-[19px] font-extrabold tracking-tight text-slate-900 dark:text-white">{totalUploaded}</div>
                            <div className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Arsip Scan / Fisik</div>
                        </div>
                    </div>
                </div>

                {/* Filter & Search Bar */}
                <div className="animate-rise" style={{ animationDelay: '220ms' }}>
                    <Surface padding="sm">
                        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                            <form onSubmit={handleSearch} className="relative w-full sm:w-80">
                                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="Cari nama folder..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200/90 bg-white py-2 pl-10 pr-4 text-[11.5px] font-semibold text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10"
                                />
                            </form>

                            <div className="self-start text-[10.5px] font-semibold text-slate-400 dark:text-slate-500 sm:self-auto">
                                Menampilkan <span className="font-extrabold text-slate-700 dark:text-slate-200">{folders.data.length}</span> folder
                            </div>
                        </div>
                    </Surface>
                </div>

                {/* Grid Folder */}
                {folders.data.length === 0 ? (
                    <EmptyState
                        className="animate-rise"
                        icon={<FolderPlus className="w-6 h-6" />}
                        title="Belum Ada Folder SK & Surat"
                        description={'Buat folder pertama Anda (misal: "SK Tim Manajemen BOSP", "Surat Perjalanan Dinas") untuk mulai menyusun dokumen surat resmi sekolah.'}
                        action={
                            !isKepalaSekolah ? (
                                <button
                                    onClick={handleOpenCreateModal}
                                    className="inline-flex items-center gap-1.5 rounded-2xl bg-lime-400 px-4 py-2.5 text-[11px] font-extrabold text-slate-950 shadow-lime transition hover:-translate-y-0.5 hover:bg-lime-300"
                                >
                                    <Plus className="w-4 h-4" />
                                    Buat Folder Pertama
                                </button>
                            ) : undefined
                        }
                    />
                ) : (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {folders.data.map((folder) => {
                            const color = resolveFolderTheme(folder.warna);

                            return (
                                <div
                                    key={folder.id}
                                    style={color.cardStyle}
                                    className={`group sikas-card sikas-card-hover relative flex flex-col justify-between overflow-hidden p-4 ${color.border} ${color.glow}`}
                                >
                                    <div>
                                        <div className="mb-3 flex items-start justify-between gap-3">
                                            <Link
                                                href={route('sk-surat.show', folder.id)}
                                                className="flex min-w-0 items-center gap-3 transition-opacity group-hover:opacity-90"
                                            >
                                                <div
                                                    style={color.tileStyle}
                                                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${color.bg} ${color.text} ${color.border}`}
                                                >
                                                    <Folder className="w-5 h-5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="line-clamp-1 text-[13px] font-extrabold tracking-tight text-slate-900 transition-colors group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-300">
                                                        {folder.nama_folder}
                                                    </h4>
                                                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                                                        {folder.templates_count} master template
                                                    </span>
                                                </div>
                                            </Link>

                                            {/* Action Menu (Khusus Bendahara) */}
                                            {!isKepalaSekolah && (
                                                <div className="relative shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => setActiveDropdown(activeDropdown === folder.id ? null : folder.id)}
                                                        className="inline-flex h-7 w-7 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-white"
                                                    >
                                                        <MoreVertical className="w-4 h-4" />
                                                    </button>

                                                    {activeDropdown === folder.id && (
                                                        <div className="absolute right-0 z-20 mt-1 w-36 rounded-2xl border border-white bg-white py-1 shadow-float dark:border-white/10 dark:bg-[#15131F]">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenEditModal(folder)}
                                                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
                                                            >
                                                                <Edit2 className="w-3.5 h-3.5 text-brand-500 dark:text-brand-300" />
                                                                Ubah Info
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRequestDelete(folder)}
                                                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-semibold text-rose-600 transition hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                                                                Hapus Folder
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <p className="mb-3 line-clamp-2 min-h-[30px] text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                            {folder.deskripsi || <span className="italic text-slate-400 dark:text-slate-600">Tidak ada keterangan.</span>}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[10.5px] dark:border-white/5">
                                        <div className="flex items-center gap-1.5 font-semibold text-slate-500 dark:text-slate-400">
                                            <FileText className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                            <span className="text-sikas-num">{folder.dokumens_count} Dokumen</span>
                                        </div>

                                        <Link
                                            href={route('sk-surat.show', folder.id)}
                                            className="inline-flex items-center gap-1 rounded-xl bg-lime-200 px-2.5 py-1 text-[10px] font-extrabold text-slate-900 ring-1 ring-lime-300/70 transition hover:bg-lime-300 dark:bg-lime-400/15 dark:text-lime-300 dark:ring-lime-400/25 dark:hover:bg-lime-400/20"
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
