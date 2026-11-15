import React, { useState, useEffect } from 'react';
import { useForm, router } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';
import DataTable from '@/Components/ui/DataTable';
import EmptyState from '@/Components/ui/EmptyState';
import IconTile from '@/Components/ui/IconTile';
import Surface from '@/Components/ui/Surface';
import SearchableSelect from '@/Components/SearchableSelect';
import axios from 'axios';

interface Dokumen {
    id: number;
    buku_kas_umum_id: number;
    nama_dokumen: string;
    link_drive: string;
}

interface BukuKasUmum {
    id: number;
    uraian: string;
    uraian_opsional?: string | null;
    tanggal_transaksi: string;
    dokumen: Dokumen | null;
}

interface Props {
    auth: any;
    penganggarans: { id: number; tahun_anggaran: string }[];
}

export default function TabReguler({ auth, penganggarans }: Props) {
    const [selectedTahun, setSelectedTahun] = useState<string>('');
    const [selectedBulan, setSelectedBulan] = useState<string>('');
    const [search, setSearch] = useState('');
    const [bkuList, setBkuList] = useState<BukuKasUmum[]>([]);
    const [pagination, setPagination] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedBku, setSelectedBku] = useState<BukuKasUmum | null>(null);

    const { data, setData, post, processing, errors, reset, delete: destroy } = useForm({
        penganggaran_id: '',
        buku_kas_umum_id: '',
        nama_dokumen: '',
        link_drive: ''
    });

    const months = [
        { value: 1, label: 'Januari' },
        { value: 2, label: 'Februari' },
        { value: 3, label: 'Maret' },
        { value: 4, label: 'April' },
        { value: 5, label: 'Mei' },
        { value: 6, label: 'Juni' },
        { value: 7, label: 'Juli' },
        { value: 8, label: 'Agustus' },
        { value: 9, label: 'September' },
        { value: 10, label: 'Oktober' },
        { value: 11, label: 'November' },
        { value: 12, label: 'Desember' },
    ];

    useEffect(() => {
        if (selectedTahun && selectedBulan) {
            fetchData();
        } else {
            setBkuList([]);
            setPagination(null);
        }
    }, [selectedTahun, selectedBulan, search]);

    const fetchData = async (page = 1) => {
        setLoading(true);
        try {
            const response = await axios.get(route('api.dokumen.data'), {
                params: {
                    penganggaran_id: selectedTahun,
                    bulan: selectedBulan,
                    search: search,
                    page: page
                }
            });
            setBkuList(response.data.data);
            setPagination(response.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (url: string) => {
        if (url) {
            const urlObj = new URL(url);
            const page = urlObj.searchParams.get('page');
            if (page) {
                fetchData(parseInt(page));
            }
        }
    };

    const openAddModal = (bku: BukuKasUmum) => {
        setSelectedBku(bku);
        setData({
            penganggaran_id: selectedTahun,
            buku_kas_umum_id: bku.id.toString(),
            nama_dokumen: '',
            link_drive: ''
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        reset();
        setSelectedBku(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('dokumen.store'), {
            onSuccess: () => {
                closeModal();
                fetchData(pagination?.current_page || 1);
            }
        });
    };

    // Delete Confirmation State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const openDeleteModal = (id: number) => {
        setDeleteId(id);
        setIsDeleteModalOpen(true);
    };

    const closeDeleteModal = () => {
        setIsDeleteModalOpen(false);
        setDeleteId(null);
    };

    const confirmDelete = () => {
        if (deleteId) {
            router.delete(route('dokumen.destroy', deleteId), {
                onSuccess: () => {
                    closeDeleteModal();
                    fetchData(pagination?.current_page || 1);
                }
            });
        }
    };

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="relative z-20 animate-rise" style={{ animationDelay: '60ms' }}>
                <Surface padding="sm" overflowVisible>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                            <InputLabel value="Tahun Anggaran" />
                            <SearchableSelect
                                value={selectedTahun}
                                onChange={(value) => {
                                    setSelectedTahun(value.toString());
                                    setSelectedBulan('');
                                }}
                                options={penganggarans}
                                searchFields={['tahun_anggaran']}
                                displayColumns={[
                                    { header: 'Tahun Anggaran', field: 'tahun_anggaran' }
                                ]}
                                placeholder="Pilih Tahun Anggaran"
                                labelRenderer={(option) => option.tahun_anggaran}
                            />
                        </div>

                        <div>
                            <InputLabel value="Bulan" />
                            <select
                                className="w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-[12px] font-semibold text-slate-800 shadow-sm transition focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-slate-900 dark:text-white dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10"
                                value={selectedBulan}
                                onChange={(e) => setSelectedBulan(e.target.value)}
                                disabled={!selectedTahun}
                            >
                                <option value="">Pilih Bulan</option>
                                {months.map((m) => (
                                    <option key={m.value} value={m.value}>{m.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <InputLabel value="Cari Data" />
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                                    <svg className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
                                        <circle cx="11" cy="11" r="7" />
                                        <path d="m21 21-4.3-4.3" />
                                    </svg>
                                </div>
                                <TextInput
                                    type="text"
                                    className="pl-9"
                                    placeholder="Cari Uraian..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </Surface>
            </div>

            {/* Table */}
            <div className="animate-rise" style={{ animationDelay: '120ms' }}>
                <DataTable
                    title="Daftar Transaksi"
                    icon={
                        <IconTile tone="sky" size="sm">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 7h16M4 12h16M4 17h10" />
                            </svg>
                        </IconTile>
                    }
                    contentClassName="px-3 pb-1 sm:px-4"
                    footer={
                        pagination && pagination.links && pagination.links.length > 3 && (
                            <>
                                <div className="flex flex-1 justify-between sm:hidden">
                                    <button
                                        onClick={() => handlePageChange(pagination.prev_page_url)}
                                        disabled={!pagination.prev_page_url}
                                        className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-[10.5px] font-bold text-slate-600 shadow-pill transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => handlePageChange(pagination.next_page_url)}
                                        disabled={!pagination.next_page_url}
                                        className="ml-2 inline-flex items-center rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-[10.5px] font-bold text-slate-600 shadow-pill transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                                    >
                                        Next
                                    </button>
                                </div>
                                <div className="hidden flex-1 flex-wrap items-center justify-between gap-3 sm:flex">
                                    <p className="text-[10.5px] font-semibold text-slate-400 dark:text-slate-500">
                                        Menampilkan <span className="text-sikas-num font-extrabold text-slate-700 dark:text-slate-200">{pagination.from || 0}</span> sampai <span className="text-sikas-num font-extrabold text-slate-700 dark:text-slate-200">{pagination.to || 0}</span> dari <span className="text-sikas-num font-extrabold text-slate-700 dark:text-slate-200">{pagination.total}</span> hasil
                                    </p>
                                    <nav className="inline-flex items-center gap-1" aria-label="Pagination">
                                        {pagination.links.map((link: any, index: number) => {
                                            // Clean up standard Label HTML entities
                                            const label = link.label.replace('&laquo; Previous', 'Sebelumnya').replace('Next &raquo;', 'Selanjutnya');

                                            return (
                                                <button
                                                    key={index}
                                                    onClick={() => handlePageChange(link.url)}
                                                    disabled={!link.url || link.active}
                                                    className={`inline-flex h-7 min-w-[28px] items-center justify-center rounded-xl px-2 text-[10px] text-sikas-num transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${link.active
                                                        ? 'bg-lime-400 font-extrabold text-slate-950 shadow-lime'
                                                        : 'font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white'
                                                        }`}
                                                    dangerouslySetInnerHTML={{ __html: label }}
                                                />
                                            );
                                        })}
                                    </nav>
                                </div>
                            </>
                        )
                    }
                >
                    <div className="bento-table-wrapper" style={{ overflowX: 'auto' }}>
                        <table className="w-full min-w-[640px]">
                            <thead>
                                <tr>
                                    <th className="text-left">No</th>
                                    <th className="text-left">Buku Kas (Uraian)</th>
                                    <th className="text-left">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={3}>
                                            <div className="flex items-center justify-center gap-2 py-6">
                                                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-400 dark:border-white/10 dark:border-t-lime-400" />
                                                Loading...
                                            </div>
                                        </td>
                                    </tr>
                                ) : bkuList.length === 0 ? (
                                    <tr>
                                        <td colSpan={3}>
                                            <EmptyState
                                                icon={
                                                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M4 7h16M4 12h16M4 17h10" />
                                                    </svg>
                                                }
                                                title={
                                                    !selectedTahun || !selectedBulan
                                                        ? 'Silahkan pilih Tahun Anggaran dan Bulan terlebih dahulu'
                                                        : 'Tidak ada data ditemukan'
                                                }
                                            />
                                        </td>
                                    </tr>
                                ) : (
                                    bkuList.map((item, index) => (
                                        <tr key={item.id}>
                                            <td>
                                                <span className="text-sikas-num text-slate-400 dark:text-slate-500">
                                                    {(pagination?.from || 1) + index}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="text-[12px] font-semibold text-slate-900 dark:text-white">
                                                    {item.uraian_opsional || item.uraian}
                                                    {item.dokumen && (
                                                        <div className="mt-1 flex items-center gap-1.5 text-[9.5px] font-extrabold text-brand-600 dark:text-brand-300">
                                                            <span className="inline-flex h-4 w-4 items-center justify-center rounded-md bg-pastel-lavender dark:bg-brand-500/15">
                                                                <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                                                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                                    <path d="M14 2v6h6" />
                                                                </svg>
                                                            </span>
                                                            Dokumen: {item.dokumen.nama_dokumen}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-1.5">
                                                    {item.dokumen ? (
                                                        <>
                                                            <a
                                                                href={item.dokumen.link_drive}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1 rounded-xl bg-pastel-mint px-2.5 py-1.5 text-[9.5px] font-extrabold text-mint ring-1 ring-mint/15 transition hover:-translate-y-0.5 hover:bg-mint/15 dark:bg-mint/10 dark:hover:bg-mint/20 dark:text-mint dark:ring-mint/20"
                                                            >
                                                                Lihat
                                                            </a>
                                                            <button
                                                                onClick={() => openDeleteModal(item.dokumen!.id)}
                                                                className="inline-flex items-center gap-1 rounded-xl bg-pastel-rose px-2.5 py-1.5 text-[9.5px] font-extrabold text-rose-500 ring-1 ring-rose-500/15 transition hover:-translate-y-0.5 hover:bg-rose-500/15 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:text-rose-300 dark:ring-rose-400/20"
                                                            >
                                                                Hapus
                                                            </button>
                                                        </>
                                                    ) : (
                                                        (item.uraian_opsional || item.uraian) && (
                                                            <button
                                                                onClick={() => openAddModal(item)}
                                                                className="inline-flex items-center gap-1 rounded-xl bg-lime-400 px-2.5 py-1.5 text-[9.5px] font-extrabold text-slate-950 shadow-lime transition hover:-translate-y-0.5 hover:bg-lime-300 dark:bg-lime-400 dark:text-slate-950"
                                                            >
                                                                Tambah
                                                            </button>
                                                        )
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </DataTable>
            </div>

            {/* Modal Tambah Dokumen */}
            <Modal show={isModalOpen} onClose={closeModal} maxWidth="lg">
                <div className="flex flex-col">
                    <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4 dark:border-white/10">
                        <IconTile tone="violet" size="lg">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </IconTile>
                        <div className="min-w-0 flex-1">
                            <h2 className="text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                Tambah Dokumen
                            </h2>
                            <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                Silahkan lengkapi detail dokumen untuk transaksi di bawah ini.
                            </p>
                        </div>
                        <button type="button" onClick={closeModal} aria-label="Tutup" className="sikas-icon-btn h-8 w-8 shrink-0">
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                                <path d="M6 18 18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="space-y-4 px-5 py-4">
                            <div className="rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-100 dark:bg-white/[0.04] dark:ring-white/10">
                                <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                                    Uraian Transaksi
                                </div>
                                <div className="mt-1 text-[13px] font-bold leading-relaxed text-slate-900 dark:text-white">
                                    {selectedBku?.uraian_opsional || selectedBku?.uraian}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <InputLabel htmlFor="nama_dokumen" value="Nama Dokumen" />
                                    <TextInput
                                        id="nama_dokumen"
                                        type="text"
                                        className="mt-1"
                                        value={data.nama_dokumen}
                                        onChange={(e) => setData('nama_dokumen', e.target.value)}
                                        required
                                        placeholder="Contoh: Bukti Pembayaran / Nota Dinas"
                                    />
                                    {errors.nama_dokumen && (
                                        <div className="mt-1.5 text-[11px] font-semibold text-rose-500 dark:text-rose-400">
                                            {errors.nama_dokumen}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <InputLabel htmlFor="link_drive" value="Link Drive Dokumen" />
                                    <div className="relative mt-1">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                                            <span className="text-slate-400 dark:text-slate-500">
                                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                                                    <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                                </svg>
                                            </span>
                                        </div>
                                        <TextInput
                                            id="link_drive"
                                            type="url"
                                            className="pl-9"
                                            value={data.link_drive}
                                            onChange={(e) => setData('link_drive', e.target.value)}
                                            required
                                            placeholder="https://drive.google.com/..."
                                        />
                                    </div>
                                    {errors.link_drive && (
                                        <div className="mt-1.5 text-[11px] font-semibold text-rose-500 dark:text-rose-400">
                                            {errors.link_drive}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3.5 dark:border-white/10">
                            <SecondaryButton onClick={closeModal} disabled={processing}>
                                Batal
                            </SecondaryButton>
                            <PrimaryButton disabled={processing}>
                                {processing ? (
                                    <div className="flex items-center gap-2">
                                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Menyimpan...
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M5 13l4 4L19 7" />
                                        </svg>
                                        Simpan
                                    </div>
                                )}
                            </PrimaryButton>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal show={isDeleteModalOpen} onClose={closeDeleteModal} maxWidth="md">
                <div className="flex flex-col">
                    <div className="flex items-start gap-3 px-5 pt-5">
                        <IconTile tone="rose" size="lg">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m-9 0v14a2 2 0 002 2h6a2 2 0 002-2V6" />
                                <path d="M10 11v6M14 11v6" />
                            </svg>
                        </IconTile>
                        <div className="min-w-0 flex-1">
                            <h2 className="text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                Konfirmasi Hapus
                            </h2>
                            <p className="mt-1 text-[11.5px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                                Apakah Anda yakin ingin menghapus dokumen ini? Tindakan ini tidak dapat dibatalkan.
                            </p>
                        </div>
                    </div>
                    <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3.5 dark:border-white/10">
                        <SecondaryButton onClick={closeDeleteModal}>
                            Batal
                        </SecondaryButton>
                        <DangerButton onClick={confirmDelete}>
                            Hapus
                        </DangerButton>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
