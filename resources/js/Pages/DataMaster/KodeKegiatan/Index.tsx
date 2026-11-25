import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { PageProps } from '@/types';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import { Fragment, useEffect, useMemo, useState } from 'react';
import PageHeader from '@/Components/ui/PageHeader';
import Surface from '@/Components/ui/Surface';
import DataTable from '@/Components/ui/DataTable';
import EmptyState from '@/Components/ui/EmptyState';
import IconTile from '@/Components/ui/IconTile';
import StatusBadge from '@/Components/ui/StatusBadge';
import ArkasYearSelect from '@/Components/Arkas/ArkasYearSelect';
import CopyYearModal from '@/Components/DataMaster/CopyYearModal';
import KodeKegiatanModals, { KodeKegiatanItem } from './Partials/KodeKegiatanModals';

interface YearStats {
    kegiatan: number;
    rekening: number;
}

export default function Index({
    auth,
    kode_kegiatan,
    selectedYear = new Date().getFullYear(),
    availableYears = [],
    statsPerYear = {},
}: PageProps<{
    kode_kegiatan: KodeKegiatanItem[];
    selectedYear?: number;
    availableYears?: string[];
    statsPerYear?: Record<string, YearStats>;
}>) {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isCopyYearModalOpen, setIsCopyYearModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [sumberFilter, setSumberFilter] = useState<'all' | 'reguler' | 'kinerja'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<KodeKegiatanItem | null>(null);
    const ITEMS_PER_PAGE = 10;

    const resolvedYears = useMemo(() => {
        const list = availableYears.length > 0 ? [...availableYears] : [String(selectedYear)];
        if (!list.includes(String(selectedYear))) {
            list.unshift(String(selectedYear));
        }
        return list;
    }, [availableYears, selectedYear]);

    const countPerYear = useMemo<Record<string, number>>(() => {
        const map: Record<string, number> = {};
        resolvedYears.forEach((yr) => {
            map[yr] = statsPerYear[yr]?.kegiatan ?? 0;
        });
        return map;
    }, [resolvedYears, statsPerYear]);

    const sourceYearOptions = useMemo(
        () =>
            Object.entries(statsPerYear)
                .map(([year, st]) => ({ year, count: st?.kegiatan ?? 0 }))
                .sort((a, b) => Number(b.year) - Number(a.year)),
        [statsPerYear],
    );

    const { data, setData, post, put, delete: destroy, processing, errors, reset, clearErrors } = useForm<{
        tahun: number;
        sumber_dana: 'reguler' | 'kinerja' | 'semua';
        kode: string;
        program: string;
        sub_program: string;
        uraian: string;
    }>({
        tahun: selectedYear,
        sumber_dana: 'reguler',
        kode: '',
        program: '',
        sub_program: '',
        uraian: '',
    });

    const { data: importData, setData: setImportData, post: postImport, progress: importProgress, processing: importProcessing, errors: importErrors, reset: resetImport, clearErrors: clearImportErrors } = useForm<{ file: File | null; tahun: number }>({
        file: null,
        tahun: selectedYear,
    });

    const { data: copyData, setData: setCopyData, post: postCopy, processing: copyProcessing, errors: copyErrors, clearErrors: clearCopyErrors } = useForm({
        source_year: '',
        target_year: String(selectedYear),
    });

    useEffect(() => {
        setData('tahun', selectedYear);
        setImportData('tahun', selectedYear);
        setCopyData('target_year', String(selectedYear));
        setCurrentPage(1);
    }, [selectedYear]);

    const handleYearChange = (newYear: string) => {
        router.get(route('kode-kegiatan.index'), { year: newYear }, { preserveScroll: true });
    };

    const regulerCount = useMemo(
        () => kode_kegiatan.filter((i) => !i.sumber_dana || i.sumber_dana === 'reguler' || i.sumber_dana === 'semua').length,
        [kode_kegiatan],
    );
    const kinerjaCount = useMemo(
        () => kode_kegiatan.filter((i) => i.sumber_dana === 'kinerja' || i.sumber_dana === 'semua').length,
        [kode_kegiatan],
    );

    // Client-side filtering and pagination
    const filteredData = kode_kegiatan.filter((item) => {
        const sd = item.sumber_dana || 'reguler';
        if (sumberFilter === 'reguler' && sd !== 'reguler' && sd !== 'semua') return false;
        if (sumberFilter === 'kinerja' && sd !== 'kinerja' && sd !== 'semua') return false;
        if (!search) return true;
        const lowerSearch = search.toLowerCase();
        return (
            item.kode.toLowerCase().includes(lowerSearch) ||
            item.program.toLowerCase().includes(lowerSearch) ||
            item.sub_program.toLowerCase().includes(lowerSearch) ||
            item.uraian.toLowerCase().includes(lowerSearch)
        );
    });

    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
    const currentData = filteredData.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Reset page to 1 when search or sumberFilter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [search, sumberFilter]);

    const resetForm = () => {
        reset();
        setData('tahun', selectedYear);
        clearErrors();
        setEditingId(null);
    };

    const closeAddModal = () => {
        setIsAddModalOpen(false);
        resetForm();
    };

    const closeEditModal = () => {
        setIsEditModalOpen(false);
        resetForm();
    };

    const closeImportModal = () => {
        setIsImportModalOpen(false);
        resetImport();
        setImportData('tahun', selectedYear);
        clearImportErrors();
    };

    const closeCopyYearModal = () => {
        setIsCopyYearModalOpen(false);
        clearCopyErrors();
    };

    const closeDeleteModal = () => {
        setIsDeleteModalOpen(false);
        setDeleteTarget(null);
    };

    const submitAdd = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('kode-kegiatan.store'), {
            onSuccess: () => {
                closeAddModal();
            },
        });
    };

    const submitEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingId) {
            put(route('kode-kegiatan.update', editingId), {
                onSuccess: () => {
                    closeEditModal();
                },
            });
        }
    };

    const submitImport = (e: React.FormEvent) => {
        e.preventDefault();
        postImport(route('kode-kegiatan.import'), {
            onSuccess: () => {
                closeImportModal();
            },
        });
    };

    const submitCopyYear = (e: React.FormEvent) => {
        e.preventDefault();
        postCopy(route('kode-kegiatan.copy-year'), {
            onSuccess: () => {
                closeCopyYearModal();
                if (copyData.target_year && copyData.target_year !== String(selectedYear)) {
                    router.get(route('kode-kegiatan.index'), { year: copyData.target_year }, { preserveScroll: true });
                }
            },
        });
    };

    const handleEdit = (item: KodeKegiatanItem) => {
        clearErrors();
        setEditingId(item.id);
        const sd = item.sumber_dana === 'kinerja' || item.sumber_dana === 'semua' ? item.sumber_dana : 'reguler';
        setData({
            tahun: item.tahun ?? selectedYear,
            sumber_dana: sd,
            kode: item.kode,
            program: item.program,
            sub_program: item.sub_program,
            uraian: item.uraian,
        });
        setIsEditModalOpen(true);
    };

    const handleDelete = (item: KodeKegiatanItem) => {
        setDeleteTarget(item);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        if (deleteTarget) {
            destroy(route('kode-kegiatan.destroy', deleteTarget.id), {
                onSuccess: () => {
                    closeDeleteModal();
                },
            });
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="Kode Kegiatan" />

            <div className="space-y-4">
                <PageHeader
                    className="animate-rise"
                    breadcrumb={[
                        { label: 'Dashboard' },
                        { label: 'Data Master' },
                        { label: 'Kode Kegiatan' },
                    ]}
                    title="Data Kode Kegiatan"
                    badge={<StatusBadge tone="violet" dot={false}>Tahun {selectedYear}</StatusBadge>}
                    subtitle={`Kelola kode kegiatan, program, dan sub program terisolasi untuk Tahun Anggaran ${selectedYear}.`}
                    actions={
                        <>
                            <SecondaryButton
                                onClick={() => {
                                    setCopyData('target_year', String(selectedYear));
                                    setIsCopyYearModalOpen(true);
                                }}
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                Salin Tahun
                            </SecondaryButton>
                            <SecondaryButton onClick={() => setIsImportModalOpen(true)}>
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                Import Excel
                            </SecondaryButton>
                            <PrimaryButton onClick={() => { resetForm(); setIsAddModalOpen(true); }}>
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Tambah Data
                            </PrimaryButton>
                        </>
                    }
                />

                {/* Kartu ringkas dari data existing */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="sikas-card sikas-card-hover animate-rise p-4" style={{ animationDelay: '60ms' }}>
                        <div className="flex items-center gap-2.5">
                            <IconTile tone="violet" size="md">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 6h16M4 12h16M4 18h10" />
                                </svg>
                            </IconTile>
                            <div className="min-w-0">
                                <p className="text-[11.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">Total Kode Kegiatan</p>
                                <p className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500">Baris data</p>
                            </div>
                        </div>
                        <p className="mt-3 text-sikas-num text-[19px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                            {kode_kegiatan.length}
                        </p>
                    </div>

                    <div className="sikas-card sikas-card-hover animate-rise p-4" style={{ animationDelay: '110ms' }}>
                        <div className="flex items-center gap-2.5">
                            <IconTile tone="sky" size="md">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                                    <path d="M9 3h6v4H9z" />
                                    <path d="M9 12h6M9 16h4" />
                                </svg>
                            </IconTile>
                            <div className="min-w-0">
                                <p className="text-[11.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">Program</p>
                                <p className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500">Program unik</p>
                            </div>
                        </div>
                        <p className="mt-3 text-sikas-num text-[19px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                            {new Set(kode_kegiatan.map((item) => item.program)).size}
                        </p>
                    </div>

                    <div className="sikas-card sikas-card-hover animate-rise p-4" style={{ animationDelay: '160ms' }}>
                        <div className="flex items-center gap-2.5">
                            <IconTile tone="mint" size="md">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 6h16M4 12h10M4 18h14" />
                                </svg>
                            </IconTile>
                            <div className="min-w-0">
                                <p className="text-[11.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">Sub Program</p>
                                <p className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500">Sub program unik</p>
                            </div>
                        </div>
                        <p className="mt-3 text-sikas-num text-[19px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                            {new Set(kode_kegiatan.map((item) => item.sub_program)).size}
                        </p>
                    </div>
                </div>

                {/* Toolbar pencarian & filter tahun */}
                <div className="animate-rise relative z-20" style={{ animationDelay: '210ms' }}>
                    <Surface padding="sm" overflowVisible>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex w-full flex-wrap items-center gap-3 md:w-auto">
                                <IconTile tone="ink" size="sm">
                                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="11" cy="11" r="7" />
                                        <path d="m21 21-4.3-4.3" />
                                    </svg>
                                </IconTile>
                                <div className="w-full md:w-80">
                                    <TextInput
                                        placeholder="Cari Kode atau Uraian..."
                                        className="w-full"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5">
                                    {(
                                        [
                                            { key: 'all', label: `Semua (${kode_kegiatan.length})` },
                                            { key: 'reguler', label: `Reguler (${regulerCount})` },
                                            { key: 'kinerja', label: `Kinerja (${kinerjaCount})` },
                                        ] as const
                                    ).map((pill) => (
                                        <button
                                            key={pill.key}
                                            type="button"
                                            onClick={() => setSumberFilter(pill.key)}
                                            className={`rounded-xl px-3 py-1.5 text-[10.5px] font-extrabold transition ${
                                                sumberFilter === pill.key
                                                    ? 'bg-lime-400 text-slate-950 shadow-lime'
                                                    : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                                            }`}
                                        >
                                            {pill.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="w-44">
                                    <ArkasYearSelect
                                        inputId="kode-kegiatan-year-filter"
                                        value={String(selectedYear)}
                                        onChange={handleYearChange}
                                        activeYears={resolvedYears}
                                        includeAllOption={false}
                                        localStatsPerYear={countPerYear}
                                        placeholder="Pilih Tahun..."
                                    />
                                </div>
                            </div>
                            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                                <span className="text-sikas-num font-extrabold text-slate-700 dark:text-slate-200">{filteredData.length}</span> data tahun {selectedYear}
                            </span>
                        </div>
                    </Surface>
                </div>

                {/* Tabel */}
                <div className="animate-rise" style={{ animationDelay: '260ms' }}>
                    <DataTable
                        title="Daftar Kode Kegiatan"
                        subtitle="Referensi kode kegiatan, program, dan sub program."
                        icon={
                            <IconTile tone="violet" size="sm">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 6h16M4 12h16M4 18h10" />
                                </svg>
                            </IconTile>
                        }
                        actions={<StatusBadge tone="info" dot={false} className="text-sikas-num">{filteredData.length}</StatusBadge>}
                        contentClassName="bento-table-wrapper mx-4 mb-4"
                        footer={
                            <>
                                <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                                    Menampilkan <span className="text-sikas-num font-extrabold text-slate-700 dark:text-slate-200">{filteredData.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}</span> sampai <span className="text-sikas-num font-extrabold text-slate-700 dark:text-slate-200">{Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)}</span> dari <span className="text-sikas-num font-extrabold text-slate-700 dark:text-slate-200">{filteredData.length}</span> data
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-extrabold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:disabled:border-white/5 dark:disabled:bg-white/5 dark:disabled:text-slate-600"
                                    >
                                        Previous
                                    </button>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                                        .filter(page => page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1))
                                        .map((page, index, array) => (
                                            <Fragment key={page}>
                                                {index > 0 && array[index - 1] !== page - 1 && <span className="px-1 text-[10px] font-bold text-slate-300 dark:text-slate-600">...</span>}
                                                <button
                                                    onClick={() => setCurrentPage(page)}
                                                    className={`flex h-7 min-w-7 items-center justify-center rounded-xl px-2 text-[10px] font-extrabold transition text-sikas-num ${currentPage === page ? 'bg-lime-400 text-slate-950 shadow-lime' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-white/5'}`}
                                                >
                                                    {page}
                                                </button>
                                            </Fragment>
                                        ))}
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages || totalPages === 0}
                                        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-extrabold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:disabled:border-white/5 dark:disabled:bg-white/5 dark:disabled:text-slate-600"
                                    >
                                        Next
                                    </button>
                                </div>
                            </>
                        }
                    >
                        <table className="min-w-full">
                            <thead>
                                <tr>
                                    <th className="text-left">Kode</th>
                                    <th className="text-center">Sumber Dana</th>
                                    <th className="text-left">Program</th>
                                    <th className="text-left">Sub Program</th>
                                    <th className="text-left">Uraian</th>
                                    <th className="text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentData.length > 0 ? (
                                    currentData.map((item) => (
                                        <tr key={item.id}>
                                            <td className="whitespace-nowrap font-extrabold text-slate-900 dark:text-white">{item.kode}</td>
                                            <td className="whitespace-nowrap text-center">
                                                {item.sumber_dana === 'kinerja' ? (
                                                    <StatusBadge tone="violet" dot={false}>Kinerja</StatusBadge>
                                                ) : item.sumber_dana === 'semua' ? (
                                                    <StatusBadge tone="success" dot={false}>Semua</StatusBadge>
                                                ) : (
                                                    <StatusBadge tone="info" dot={false}>Reguler</StatusBadge>
                                                )}
                                            </td>
                                            <td className="text-slate-600 dark:text-slate-300">{item.program}</td>
                                            <td className="max-w-xs truncate text-slate-500 dark:text-slate-400" title={item.sub_program}>{item.sub_program}</td>
                                            <td className="max-w-xs truncate text-slate-500 dark:text-slate-400" title={item.uraian}>{item.uraian}</td>
                                            <td className="whitespace-nowrap text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => handleEdit(item)}
                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-100 bg-white text-brand-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:text-brand-700 dark:border-white/10 dark:bg-white/5 dark:text-brand-300 dark:hover:bg-white/10"
                                                        title="Edit"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item)}
                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-100 bg-white text-rose-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:text-rose-700 dark:border-white/10 dark:bg-white/5 dark:text-rose-400 dark:hover:bg-white/10"
                                                        title="Hapus"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="p-0">
                                            <EmptyState
                                                className="border-0 bg-transparent py-9 dark:bg-transparent"
                                                icon={
                                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                    </svg>
                                                }
                                                title={search ? 'Data tidak ditemukan untuk pencarian tersebut.' : 'Tidak ada data ditemukan.'}
                                                description="Coba ubah kata kunci pencarian atau tambahkan data kode kegiatan baru."
                                            />
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </DataTable>
                </div>
            </div>

            <KodeKegiatanModals
                selectedYear={selectedYear}
                isAddOpen={isAddModalOpen}
                onCloseAdd={closeAddModal}
                onSubmitAdd={submitAdd}
                isEditOpen={isEditModalOpen}
                onCloseEdit={closeEditModal}
                onSubmitEdit={submitEdit}
                data={data}
                setData={setData}
                errors={errors}
                processing={processing}
                isImportOpen={isImportModalOpen}
                onCloseImport={closeImportModal}
                importFile={importData.file}
                onChangeImportFile={(file) => setImportData('file', file)}
                importProgress={importProgress}
                importErrors={importErrors}
                importProcessing={importProcessing}
                onSubmitImport={submitImport}
                downloadTemplateUrl={route('kode-kegiatan.download-template')}
                isDeleteOpen={isDeleteModalOpen}
                deleteTarget={deleteTarget}
                deleteProcessing={processing}
                onCloseDelete={closeDeleteModal}
                onConfirmDelete={confirmDelete}
            />

            <CopyYearModal
                show={isCopyYearModalOpen}
                onClose={closeCopyYearModal}
                title="Salin Kode Kegiatan Antar Tahun"
                itemLabel="kode kegiatan"
                sourceYear={copyData.source_year}
                targetYear={copyData.target_year}
                onChangeSourceYear={(yr) => setCopyData('source_year', yr)}
                onChangeTargetYear={(yr) => setCopyData('target_year', yr)}
                sourceYearOptions={sourceYearOptions}
                errors={copyErrors}
                processing={copyProcessing}
                onSubmit={submitCopyYear}
            />
        </AuthenticatedLayout>
    );
}
