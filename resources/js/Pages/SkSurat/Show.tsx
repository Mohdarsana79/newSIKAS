import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    FileText,
    Download,
    FileCheck,
    UploadCloud,
    Plus,
    Search,
    Edit2,
    Trash2,
    Sparkles,
    Settings,
    ArrowLeft,
    FileDown,
} from 'lucide-react';
import ManageTemplatesModal from './Partials/ManageTemplatesModal';
import GenerateDokumenModal from './Partials/GenerateDokumenModal';
import UploadArsipModal from './Partials/UploadArsipModal';
import ConfirmModal from './Partials/ConfirmModal';
import FolderIconTile from './Partials/FolderIconTile';
import { resolveFolderTheme } from './Partials/folderColors';
import PageHeader from '@/Components/ui/PageHeader';
import StatusBadge from '@/Components/ui/StatusBadge';
import Surface from '@/Components/ui/Surface';
import EmptyState from '@/Components/ui/EmptyState';

interface SkTemplate {
    id: number;
    folder_id: number;
    judul: string;
    file_path: string;
    file_name_original: string;
    detected_variables: string[] | null;
    created_at: string;
    user?: { id: number; name: string };
}

interface SkDokumen {
    id: number;
    folder_id: number;
    template_id: number;
    tipe: 'generated' | 'uploaded';
    nomor_surat: string | null;
    perihal: string;
    tanggal_surat: string | null;
    data_isian: Record<string, any> | null;
    file_path: string | null;
    file_name_original: string | null;
    keterangan: string | null;
    created_at: string;
    template?: SkTemplate;
    user?: { id: number; name: string };
}

interface SkFolderDetail {
    id: number;
    nama_folder: string;
    deskripsi?: string | null;
    warna?: string;
    templates: SkTemplate[];
    dokumens: SkDokumen[];
}

interface Props {
    folder: SkFolderDetail;
    schoolData: Record<string, string>;
    filters: {
        search?: string;
        tipe?: string;
    };
}

export default function Show({ folder, schoolData = {}, filters = {} }: Props) {
    const { auth } = usePage<any>().props;
    const isKepalaSekolah = auth?.user?.is_kepala_sekolah ?? false;
    const folderTheme = resolveFolderTheme(folder.warna);

    const [search, setSearch] = useState(filters.search || '');
    const [tipeFilter, setTipeFilter] = useState(filters.tipe || '');

    // Modals
    const [showManageTemplates, setShowManageTemplates] = useState(false);
    const [showGenerateDokumen, setShowGenerateDokumen] = useState(false);
    const [showUploadArsip, setShowUploadArsip] = useState(false);
    const [editingDokumen, setEditingDokumen] = useState<SkDokumen | null>(null);

    // Delete confirmation state
    const [docToDelete, setDocToDelete] = useState<SkDokumen | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Missing template warning modal
    const [showNoTemplateModal, setShowNoTemplateModal] = useState(false);

    const handleFilter = (newSearch?: string, newTipe?: string) => {
        router.get(
            route('sk-surat.show', folder.id),
            {
                search: newSearch !== undefined ? newSearch : search,
                tipe: newTipe !== undefined ? newTipe : tipeFilter,
            },
            { preserveState: true }
        );
    };

    const handleOpenCreateDokumen = () => {
        if (folder.templates.length === 0) {
            setShowNoTemplateModal(true);
            return;
        }
        setEditingDokumen(null);
        setShowGenerateDokumen(true);
    };

    const handleEditDokumen = (dokumen: SkDokumen) => {
        setEditingDokumen(dokumen);
        setShowGenerateDokumen(true);
    };

    const confirmDeleteDokumen = () => {
        if (!docToDelete) return;

        setIsDeleting(true);
        router.delete(route('sk-surat.dokumen.destroy', docToDelete.id), {
            onSuccess: () => {
                setDocToDelete(null);
            },
            onFinish: () => setIsDeleting(false),
        });
    };

    const resolveNomorSurat = (doc: SkDokumen) => {
        if (doc.nomor_surat) return doc.nomor_surat;
        if (doc.data_isian) {
            return (
                doc.data_isian.nomor_surat ||
                doc.data_isian.no_surat ||
                doc.data_isian.nomor ||
                null
            );
        }
        return null;
    };

    const resolveTanggalSurat = (doc: SkDokumen) => {
        if (doc.tanggal_surat) return doc.tanggal_surat.substring(0, 10);
        if (doc.data_isian) {
            return (
                doc.data_isian.tanggal_surat ||
                doc.data_isian.tanggal ||
                doc.data_isian.tgl_surat ||
                null
            );
        }
        return null;
    };

    return (
        <AuthenticatedLayout>
            <Head title={`Folder: ${folder.nama_folder}`} />

            <div className="space-y-4">
                <PageHeader
                    className="animate-rise"
                    breadcrumb={[
                        { label: 'Dashboard' },
                        { label: 'SK & Surat', href: route('sk-surat.index') },
                        { label: folder.nama_folder },
                    ]}
                    icon={<FolderIconTile theme={folderTheme} size="lg" />}
                    title={folder.nama_folder}
                    badge={<StatusBadge tone="neutral" dot={false}>{folder.templates.length} template</StatusBadge>}
                    subtitle={folder.deskripsi || 'Ruang kerja pengelolaan dokumen surat dan SK sekolah.'}
                    actions={
                        <>
                            <Link
                                href={route('sk-surat.index')}
                                className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-[11px] font-extrabold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Kembali
                            </Link>

                            <button
                                onClick={() => setShowManageTemplates(true)}
                                className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-[11px] font-extrabold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                            >
                                <Settings className="w-4 h-4 text-brand-500 dark:text-brand-300" />
                                Kelola Master Template ({folder.templates.length})
                            </button>

                            {!isKepalaSekolah && (
                                <>
                                    <button
                                        onClick={() => setShowUploadArsip(true)}
                                        className="inline-flex items-center gap-1.5 rounded-2xl border border-emerald-200 bg-pastel-mint px-3.5 py-2.5 text-[11px] font-extrabold text-emerald-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-100 dark:border-emerald-400/20 dark:bg-mint/10 dark:text-emerald-300 dark:hover:bg-mint/15"
                                    >
                                        <UploadCloud className="w-4 h-4" />
                                        Upload Arsip Fisik
                                    </button>

                                    <button
                                        onClick={handleOpenCreateDokumen}
                                        className="inline-flex items-center gap-1.5 rounded-2xl bg-lime-400 px-4 py-2.5 text-[11px] font-extrabold text-slate-950 shadow-lime transition hover:-translate-y-0.5 hover:bg-lime-300"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Buat Surat dari Word
                                    </button>
                                </>
                            )}
                        </>
                    }
                />

                {/* Search & Filter Bar */}
                <div className="animate-rise" style={{ animationDelay: '60ms' }}>
                    <Surface padding="sm">
                        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                            <div className="flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
                                <div className="relative w-full sm:w-72">
                                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                                    <input
                                        type="text"
                                        placeholder="Cari nomor atau perihal surat..."
                                        value={search}
                                        onChange={(e) => {
                                            setSearch(e.target.value);
                                            handleFilter(e.target.value, tipeFilter);
                                        }}
                                        className="w-full rounded-xl border border-slate-200/90 bg-white py-2 pl-10 pr-4 text-[11.5px] font-semibold text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10"
                                    />
                                </div>

                                {/* Filter Tipe Dokumen */}
                                <div className="flex w-full items-center gap-1 overflow-x-auto sm:w-auto">
                                    <button
                                        onClick={() => {
                                            setTipeFilter('');
                                            handleFilter(search, '');
                                        }}
                                        className={`shrink-0 rounded-xl px-3 py-1.5 text-[10.5px] font-extrabold transition ${
                                            tipeFilter === ''
                                                ? 'bg-slate-900 text-white shadow-pill dark:bg-white dark:text-slate-900'
                                                : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white'
                                        }`}
                                    >
                                        Semua ({folder.dokumens.length})
                                    </button>
                                    <button
                                        onClick={() => {
                                            setTipeFilter('generated');
                                            handleFilter(search, 'generated');
                                        }}
                                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-[10.5px] font-extrabold transition ${
                                            tipeFilter === 'generated'
                                                ? 'bg-slate-900 text-white shadow-pill dark:bg-white dark:text-slate-900'
                                                : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white'
                                        }`}
                                    >
                                        <Sparkles className="w-3 h-3 text-sky dark:text-sky" />
                                        Surat PHPWord
                                    </button>
                                    <button
                                        onClick={() => {
                                            setTipeFilter('uploaded');
                                            handleFilter(search, 'uploaded');
                                        }}
                                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-[10.5px] font-extrabold transition ${
                                            tipeFilter === 'uploaded'
                                                ? 'bg-slate-900 text-white shadow-pill dark:bg-white dark:text-slate-900'
                                                : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white'
                                        }`}
                                    >
                                        <UploadCloud className="w-3 h-3 text-mint dark:text-emerald-300" />
                                        Arsip Fisik
                                    </button>
                                </div>
                            </div>

                            <div className="self-start text-[10.5px] font-semibold text-slate-400 dark:text-slate-500 sm:self-auto">
                                <span className="text-sikas-num font-extrabold text-slate-700 dark:text-slate-200">{folder.dokumens.length}</span> dokumen tersimpan
                            </div>
                        </div>
                    </Surface>
                </div>

                {/* Tabel Daftar Dokumen */}
                <div className="animate-rise" style={{ animationDelay: '120ms' }}>
                    <div className="sikas-card overflow-hidden">
                        {folder.dokumens.length === 0 ? (
                            <EmptyState
                                className="m-4 border-0 bg-transparent dark:bg-transparent"
                                icon={<FileCheck className="w-6 h-6" />}
                                title="Belum Ada Dokumen di Folder Ini"
                                description="Mulai dengan membuat surat baru dari template Word atau unggah berkas fisik/scan bertanda tangan basah."
                                action={
                                    !isKepalaSekolah ? (
                                        <div className="flex flex-wrap justify-center gap-2">
                                            <button
                                                onClick={handleOpenCreateDokumen}
                                                className="inline-flex items-center gap-1.5 rounded-2xl bg-lime-400 px-4 py-2.5 text-[11px] font-extrabold text-slate-950 shadow-lime transition hover:-translate-y-0.5 hover:bg-lime-300"
                                            >
                                                Buat Surat dari Word
                                            </button>
                                            <button
                                                onClick={() => setShowUploadArsip(true)}
                                                className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[11px] font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                                            >
                                                Upload Arsip Fisik
                                            </button>
                                        </div>
                                    ) : undefined
                                }
                            />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-[11px]">
                                    <thead>
                                        <tr className="border-b border-slate-100 bg-slate-50/70 dark:border-white/5 dark:bg-white/[0.03]">
                                            <th className="whitespace-nowrap px-4 py-3.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Tipe</th>
                                            <th className="whitespace-nowrap px-4 py-3.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Nomor &amp; Tanggal</th>
                                            <th className="whitespace-nowrap px-4 py-3.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Perihal / Judul Dokumen</th>
                                            <th className="whitespace-nowrap px-4 py-3.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Template / Berkas Asli</th>
                                            <th className="whitespace-nowrap px-4 py-3.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Dibuat Oleh</th>
                                            <th className="whitespace-nowrap px-4 py-3.5 text-right text-[9px] font-extrabold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {folder.dokumens.map((doc) => {
                                            const displayNomor = resolveNomorSurat(doc);
                                            const displayTanggal = resolveTanggalSurat(doc);

                                            return (
                                                <tr key={doc.id} className="border-b border-slate-50 transition last:border-0 hover:bg-lime-50/50 dark:border-white/5 dark:hover:bg-white/[0.04]">
                                                    {/* Tipe Badge */}
                                                    <td className="whitespace-nowrap px-4 py-3.5">
                                                        {doc.tipe === 'generated' ? (
                                                            <StatusBadge tone="info">
                                                                <Sparkles className="w-3 h-3" />
                                                                Generator Word
                                                            </StatusBadge>
                                                        ) : (
                                                            <StatusBadge tone="success">
                                                                <UploadCloud className="w-3 h-3" />
                                                                Arsip Fisik
                                                            </StatusBadge>
                                                        )}
                                                    </td>

                                                    {/* Nomor & Tanggal */}
                                                    <td className="whitespace-nowrap px-4 py-3.5">
                                                        <div className="font-mono text-[11px] font-semibold text-slate-800 text-sikas-num dark:text-slate-200">
                                                            {displayNomor || <span className="italic text-slate-400 dark:text-slate-600">Tanpa nomor</span>}
                                                        </div>
                                                        <div className="mt-0.5 text-[10px] font-semibold text-slate-400 text-sikas-num dark:text-slate-500">
                                                            {displayTanggal || '-'}
                                                        </div>
                                                    </td>

                                                    {/* Perihal */}
                                                    <td className="px-4 py-3.5">
                                                        <div className="text-[12px] font-extrabold text-slate-900 dark:text-slate-100">
                                                            {doc.perihal}
                                                        </div>
                                                        {doc.keterangan && (
                                                            <div className="mt-0.5 line-clamp-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                                                {doc.keterangan}
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Template / File */}
                                                    <td className="whitespace-nowrap px-4 py-3.5">
                                                        {doc.tipe === 'generated' ? (
                                                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-brand-600 dark:text-brand-300">
                                                                <FileText className="w-3.5 h-3.5 text-brand-500 dark:text-brand-300" />
                                                                {doc.template?.judul || 'Template'}
                                                            </div>
                                                        ) : (
                                                            <div className="max-w-[180px] truncate font-mono text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                                                {doc.file_name_original || 'Berkas arsip'}
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Dibuat Oleh */}
                                                    <td className="whitespace-nowrap px-4 py-3.5 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                                                        {doc.user?.name || 'Sistem'}
                                                    </td>

                                                    {/* Aksi */}
                                                    <td className="whitespace-nowrap px-4 py-3.5 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            {doc.tipe === 'generated' ? (
                                                                <>
                                                                    {/* Download DOCX */}
                                                                    <a
                                                                        href={route('sk-surat.dokumen.download-docx', doc.id)}
                                                                        className="inline-flex items-center gap-1 rounded-xl bg-lime-200 px-2.5 py-1.5 text-[10px] font-extrabold text-slate-900 ring-1 ring-lime-300/70 transition hover:-translate-y-0.5 hover:bg-lime-300 dark:bg-lime-400/15 dark:text-lime-300 dark:ring-lime-400/25 dark:hover:bg-lime-400/20"
                                                                        title="Unduh File Asli Word (.docx)"
                                                                    >
                                                                        <FileDown className="w-3.5 h-3.5" />
                                                                        DOCX
                                                                    </a>

                                                                    {/* Export PDF */}
                                                                    <a
                                                                        href={route('sk-surat.dokumen.export-pdf', doc.id)}
                                                                        className="inline-flex items-center gap-1 rounded-xl bg-pastel-rose px-2.5 py-1.5 text-[10px] font-extrabold text-rose-600 ring-1 ring-rose-200 transition hover:-translate-y-0.5 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/20 dark:hover:bg-rose-500/15"
                                                                        title="Ekspor Siap Cetak (.pdf)"
                                                                    >
                                                                        <Download className="w-3.5 h-3.5" />
                                                                        PDF
                                                                    </a>

                                                                    {/* Edit Form - Khusus Bendahara */}
                                                                    {!isKepalaSekolah && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleEditDokumen(doc)}
                                                                            className="inline-flex h-7 w-7 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-white"
                                                                            title="Ubah Isian Variabel"
                                                                        >
                                                                            <Edit2 className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                /* Download Arsip Fisik */
                                                                <a
                                                                    href={route('sk-surat.dokumen.download-archive', doc.id)}
                                                                    className="inline-flex items-center gap-1 rounded-xl bg-pastel-mint px-3 py-1.5 text-[10px] font-extrabold text-emerald-700 ring-1 ring-mint/20 transition hover:-translate-y-0.5 hover:bg-emerald-100 dark:bg-mint/10 dark:text-emerald-300 dark:ring-mint/20 dark:hover:bg-mint/15"
                                                                    title="Unduh Berkas Fisik"
                                                                >
                                                                    <Download className="w-3.5 h-3.5" />
                                                                    Unduh Berkas
                                                                </a>
                                                            )}

                                                            {/* Hapus Dokumen - Khusus Bendahara */}
                                                            {!isKepalaSekolah && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setDocToDelete(doc)}
                                                                    className="inline-flex h-7 w-7 items-center justify-center rounded-xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:text-slate-500 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                                                                    title="Hapus Dokumen"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal Kelola Master Template */}
            <ManageTemplatesModal
                show={showManageTemplates}
                onClose={() => setShowManageTemplates(false)}
                folderId={folder.id}
                templates={folder.templates}
                isKepalaSekolah={isKepalaSekolah}
            />

            {/* Modal Generator Form Surat Dinamis */}
            <GenerateDokumenModal
                show={showGenerateDokumen}
                onClose={() => {
                    setShowGenerateDokumen(false);
                    setEditingDokumen(null);
                }}
                folderId={folder.id}
                templates={folder.templates}
                schoolData={schoolData}
                dokumen={editingDokumen}
            />

            {/* Modal Upload Arsip Fisik */}
            <UploadArsipModal
                show={showUploadArsip}
                onClose={() => setShowUploadArsip(false)}
                folderId={folder.id}
            />

            {/* Modal Konfirmasi Hapus Dokumen */}
            <ConfirmModal
                show={Boolean(docToDelete)}
                onClose={() => setDocToDelete(null)}
                onConfirm={confirmDeleteDokumen}
                title="Hapus Dokumen Ini?"
                message={`Apakah Anda yakin ingin menghapus dokumen "${docToDelete?.perihal}"? Tindakan ini tidak dapat dibatalkan.`}
                confirmText="Ya, Hapus Dokumen"
                type="danger"
                loading={isDeleting}
            />

            {/* Modal Peringatan Template Belum Ada */}
            <ConfirmModal
                show={showNoTemplateModal}
                onClose={() => setShowNoTemplateModal(false)}
                onConfirm={() => {
                    setShowNoTemplateModal(false);
                    setShowManageTemplates(true);
                }}
                title="Belum Ada Master Template"
                message="Unggah file master template Word (.docx) ke folder ini terlebih dahulu sebelum membuat surat dinamis."
                confirmText="Unggah Template Sekarang"
                cancelText="Tutup"
                type="info"
            />
        </AuthenticatedLayout>
    );
}
