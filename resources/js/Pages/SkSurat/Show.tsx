import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    Folder,
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
import Swal from 'sweetalert2';
import ManageTemplatesModal from './Partials/ManageTemplatesModal';
import GenerateDokumenModal from './Partials/GenerateDokumenModal';
import UploadArsipModal from './Partials/UploadArsipModal';

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

    const [search, setSearch] = useState(filters.search || '');
    const [tipeFilter, setTipeFilter] = useState(filters.tipe || '');

    // Modals
    const [showManageTemplates, setShowManageTemplates] = useState(false);
    const [showGenerateDokumen, setShowGenerateDokumen] = useState(false);
    const [showUploadArsip, setShowUploadArsip] = useState(false);
    const [editingDokumen, setEditingDokumen] = useState<SkDokumen | null>(null);

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
            Swal.fire({
                icon: 'info',
                title: 'Belum Ada Master Template',
                text: 'Unggah file master template .docx ke folder ini terlebih dahulu sebelum membuat surat dinamis.',
                showCancelButton: true,
                confirmButtonText: 'Unggah Template Sekarang',
                cancelButtonText: 'Tutup',
                confirmButtonColor: '#6366f1',
            }).then((res) => {
                if (res.isConfirmed) {
                    setShowManageTemplates(true);
                }
            });
            return;
        }
        setEditingDokumen(null);
        setShowGenerateDokumen(true);
    };

    const handleEditDokumen = (dokumen: SkDokumen) => {
        setEditingDokumen(dokumen);
        setShowGenerateDokumen(true);
    };

    const handleDeleteDokumen = (dokumen: SkDokumen) => {
        Swal.fire({
            title: 'Hapus Dokumen?',
            text: `Yakin ingin menghapus dokumen "${dokumen.perihal}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#334155',
            confirmButtonText: 'Ya, Hapus',
            cancelButtonText: 'Batal',
        }).then((res) => {
            if (res.isConfirmed) {
                router.delete(route('sk-surat.dokumen.destroy', dokumen.id), {
                    onSuccess: () => {
                        Swal.fire({ icon: 'success', title: 'Terhapus', text: 'Dokumen berhasil dihapus', timer: 1500, showConfirmButton: false });
                    },
                });
            }
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="space-y-3">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
                        <Link href={route('sk-surat.index')} className="hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 transition-colors">
                            <ArrowLeft className="w-3.5 h-3.5" />
                            SK & Dokumen Surat
                        </Link>
                        <span>/</span>
                        <span className="text-gray-800 dark:text-slate-200 font-medium">{folder.nama_folder}</span>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-2xl text-indigo-600 dark:text-indigo-400">
                                <Folder className="w-7 h-7" />
                            </div>
                            <div>
                                <h2 className="font-bold text-2xl text-gray-900 dark:text-slate-100 flex items-center gap-2">
                                    {folder.nama_folder}
                                </h2>
                                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                                    {folder.deskripsi || 'Ruang kerja pengelolaan dokumen surat dan SK sekolah.'}
                                </p>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2.5">
                            <button
                                onClick={() => setShowManageTemplates(true)}
                                className="inline-flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-xl text-xs font-semibold border border-gray-300 dark:border-slate-700 shadow-sm transition-all"
                            >
                                <Settings className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                                Kelola Master Template ({folder.templates.length})
                            </button>

                            {!isKepalaSekolah && (
                                <>
                                    <button
                                        onClick={() => setShowUploadArsip(true)}
                                        className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-50 dark:bg-emerald-600/20 hover:bg-emerald-100 dark:hover:bg-emerald-600/30 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 rounded-xl text-xs font-semibold shadow-sm transition-all"
                                    >
                                        <UploadCloud className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                        Upload Arsip Fisik
                                    </button>

                                    <button
                                        onClick={handleOpenCreateDokumen}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-500/20 transition-all"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Buat Surat dari Word
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            }
        >
            <Head title={`Folder: ${folder.nama_folder}`} />

            <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
                {/* Search & Filter Bar */}
                <div className="p-4 bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                        <div className="relative w-full sm:w-72">
                            <Search className="w-4 h-4 text-gray-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Cari nomor atau perihal surat..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    handleFilter(e.target.value, tipeFilter);
                                }}
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-800 rounded-xl text-xs text-gray-900 dark:text-slate-200 placeholder:text-gray-400 dark:placeholder:text-slate-600 focus:border-indigo-500"
                            />
                        </div>

                        {/* Filter Tipe Dokumen */}
                        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
                            <button
                                onClick={() => {
                                    setTipeFilter('');
                                    handleFilter(search, '');
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                    tipeFilter === ''
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'bg-gray-100 dark:bg-slate-950 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-slate-800'
                                }`}
                            >
                                Semua ({folder.dokumens.length})
                            </button>
                            <button
                                onClick={() => {
                                    setTipeFilter('generated');
                                    handleFilter(search, 'generated');
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                                    tipeFilter === 'generated'
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'bg-gray-100 dark:bg-slate-950 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-slate-800'
                                }`}
                            >
                                <Sparkles className="w-3 h-3 text-sky-500 dark:text-sky-400" />
                                Surat PHPWord
                            </button>
                            <button
                                onClick={() => {
                                    setTipeFilter('uploaded');
                                    handleFilter(search, 'uploaded');
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                                    tipeFilter === 'uploaded'
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'bg-gray-100 dark:bg-slate-950 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-slate-800'
                                }`}
                            >
                                <UploadCloud className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                                Arsip Fisik
                            </button>
                        </div>
                    </div>

                    <div className="text-xs text-gray-500 dark:text-slate-400">
                        {folder.dokumens.length} dokumen tersimpan
                    </div>
                </div>

                {/* Tabel Daftar Dokumen */}
                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                    {folder.dokumens.length === 0 ? (
                        <div className="py-16 text-center p-8">
                            <FileCheck className="w-12 h-12 text-gray-300 dark:text-slate-700 mx-auto mb-3" />
                            <h4 className="text-sm font-semibold text-gray-800 dark:text-slate-300">Belum Ada Dokumen di Folder Ini</h4>
                            <p className="text-xs text-gray-500 dark:text-slate-500 mt-1 max-w-sm mx-auto">
                                Mulai dengan membuat surat baru dari template Word atau unggah berkas fisik/scan bertanda tangan basah.
                            </p>
                            {!isKepalaSekolah && (
                                <div className="mt-4 flex justify-center gap-3">
                                    <button
                                        onClick={handleOpenCreateDokumen}
                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-medium shadow-md shadow-indigo-500/20"
                                    >
                                        Buat Surat dari Word
                                    </button>
                                    <button
                                        onClick={() => setShowUploadArsip(true)}
                                        className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 border border-gray-300 dark:border-slate-700 rounded-xl text-xs font-medium shadow-sm"
                                    >
                                        Upload Arsip Fisik
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-gray-700 dark:text-slate-300">
                                <thead className="bg-gray-50 dark:bg-slate-950/70 text-gray-500 dark:text-slate-400 uppercase tracking-wider text-[11px] border-b border-gray-200 dark:border-slate-800">
                                    <tr>
                                        <th className="py-3.5 px-4 font-semibold">Tipe</th>
                                        <th className="py-3.5 px-4 font-semibold">Nomor & Tanggal</th>
                                        <th className="py-3.5 px-4 font-semibold">Perihal / Judul Dokumen</th>
                                        <th className="py-3.5 px-4 font-semibold">Template / Berkas Asli</th>
                                        <th className="py-3.5 px-4 font-semibold">Dibuat Oleh</th>
                                        <th className="py-3.5 px-4 font-semibold text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
                                    {folder.dokumens.map((doc) => (
                                        <tr key={doc.id} className="hover:bg-gray-50/70 dark:hover:bg-slate-800/30 transition-colors">
                                            {/* Tipe Badge */}
                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                {doc.tipe === 'generated' ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-500/30">
                                                        <Sparkles className="w-3 h-3" />
                                                        Generator Word
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                                                        <UploadCloud className="w-3 h-3" />
                                                        Arsip Fisik
                                                    </span>
                                                )}
                                            </td>

                                            {/* Nomor & Tanggal */}
                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                <div className="font-mono font-medium text-gray-900 dark:text-slate-200">
                                                    {doc.nomor_surat || <span className="text-gray-400 dark:text-slate-600 italic">Tanpa nomor</span>}
                                                </div>
                                                <div className="text-[11px] text-gray-500 dark:text-slate-500 mt-0.5">
                                                    {doc.tanggal_surat ? doc.tanggal_surat.substring(0, 10) : '-'}
                                                </div>
                                            </td>

                                            {/* Perihal */}
                                            <td className="py-3.5 px-4">
                                                <div className="font-semibold text-gray-900 dark:text-slate-100 text-sm">
                                                    {doc.perihal}
                                                </div>
                                                {doc.keterangan && (
                                                    <div className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                                                        {doc.keterangan}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Template / File */}
                                            <td className="py-3.5 px-4 whitespace-nowrap text-gray-600 dark:text-slate-400">
                                                {doc.tipe === 'generated' ? (
                                                    <div className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-300">
                                                        <FileText className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                                                        {doc.template?.judul || 'Template'}
                                                    </div>
                                                ) : (
                                                    <div className="font-mono text-[11px] text-gray-500 dark:text-slate-400 truncate max-w-[180px]">
                                                        {doc.file_name_original || 'Berkas arsip'}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Dibuat Oleh */}
                                            <td className="py-3.5 px-4 whitespace-nowrap text-gray-500 dark:text-slate-400 text-xs">
                                                {doc.user?.name || 'Sistem'}
                                            </td>

                                            {/* Aksi */}
                                            <td className="py-3.5 px-4 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {doc.tipe === 'generated' ? (
                                                        <>
                                                            {/* Download DOCX */}
                                                            <a
                                                                href={route('sk-surat.dokumen.download-docx', doc.id)}
                                                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 dark:bg-indigo-600/20 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-600/30 border border-indigo-200 dark:border-indigo-500/30 transition-colors shadow-sm"
                                                                title="Unduh File Asli Word (.docx)"
                                                            >
                                                                <FileDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                                                DOCX
                                                            </a>

                                                            {/* Export PDF */}
                                                            <a
                                                                href={route('sk-surat.dokumen.export-pdf', doc.id)}
                                                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-rose-50 dark:bg-rose-600/20 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-600/30 border border-rose-200 dark:border-rose-500/30 transition-colors shadow-sm"
                                                                title="Ekspor Siap Cetak (.pdf)"
                                                            >
                                                                <Download className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                                                                PDF
                                                            </a>

                                                            {/* Edit Form - Khusus Bendahara */}
                                                            {!isKepalaSekolah && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleEditDokumen(doc)}
                                                                    className="p-1.5 rounded-lg text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                                                                    title="Ubah Isian Variabel"
                                                                >
                                                                    <Edit2 className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                                                                </button>
                                                            )}
                                                        </>
                                                    ) : (
                                                        /* Download Arsip Fisik */
                                                        <a
                                                            href={route('sk-surat.dokumen.download-archive', doc.id)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-600/30 border border-emerald-200 dark:border-emerald-500/30 transition-colors shadow-sm"
                                                            title="Unduh Berkas Fisik"
                                                        >
                                                            <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                                            Unduh Berkas
                                                        </a>
                                                    )}

                                                    {/* Hapus Dokumen - Khusus Bendahara */}
                                                    {!isKepalaSekolah && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteDokumen(doc)}
                                                            className="p-1.5 rounded-lg text-gray-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                                                            title="Hapus Dokumen"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
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
        </AuthenticatedLayout>
    );
}
