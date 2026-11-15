import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ArrowDownLeft, ArrowUpRight, Wallet } from 'lucide-react';
import { usePage } from '@inertiajs/react';
import axios from 'axios';
import DatePicker from '@/Components/DatePicker';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import useVariantRoute from '@/Hooks/useVariantRoute';
import Surface from '@/Components/ui/Surface';
import DataTable from '@/Components/ui/DataTable';
import IconTile from '@/Components/ui/IconTile';
import StatusBadge from '@/Components/ui/StatusBadge';
import EmptyState from '@/Components/ui/EmptyState';
import { SkeletonRows } from '@/Components/ui/Skeleton';
import {
    LaporanCalculateButton,
    LaporanDeleteModal,
    LaporanFormModal,
    LaporanMetricCard,
    LaporanPdfPreviewModal,
    LaporanPrintSettingsModal,
    LaporanSectionCard,
    LaporanSelect,
    LaporanValidationModal,
} from './LaporanModalPrimitives';

interface SptjData {
    id: number;
    nomor_sptj: string;
    tanggal_sptj: string;
    tahap: '1' | '2';
    tahap_satu: number;
    tahap_dua: number;
    jenis_belanja_pegawai: number;
    jenis_belanja_barang_jasa: number;
    jenis_belanja_modal: number;
    sisa_kas_tunai: number;
    sisa_dana_di_bank: number;
    created_at: string;
    penganggaran_id: number;
    penganggaran: {
        id: number;
        tahun_anggaran: string;
    };
    penerimaan_dana_id: number | null;
    buku_kas_umum_id: number | null;
}

export default function SptjTab() {
    const vroute = useVariantRoute();
    const penganggaranFk = usePage<any>().props.penganggaranFk || 'penganggaran_id';
    const [data, setData] = useState<SptjData[]>([]);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [loading, setLoading] = useState(false);

    // Modals
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<number | null>(null);
    const [selectedPdfUrl, setSelectedPdfUrl] = useState('');
    const [isPrintSettingsModalOpen, setIsPrintSettingsModalOpen] = useState(false);
    const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
    const [validationMessage, setValidationMessage] = useState('');
    const [printSettings, setPrintSettings] = useState({
        paperSize: 'A4',
        fontSize: '12pt'
    });

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        window.dispatchEvent(new CustomEvent('toast-notification', {
            detail: { message, type }
        }));
    };

    const handlePrint = () => {
        const url = `${selectedPdfUrl}?paper_size=${printSettings.paperSize}&font_size=${printSettings.fontSize}`;
        window.open(url, '_blank');
        setIsPrintSettingsModalOpen(false);
    };

    // Form Data
    const [formData, setFormData] = useState({
        id: null as number | null,
        nomor_sptj: '',
        tanggal_sptj: '',
        tahap: '1',
        penganggaran_id: 0,
        tahap_satu: 0,
        tahap_dua: 0,
        jenis_belanja_pegawai: 0,
        jenis_belanja_barang_jasa: 0,
        jenis_belanja_operasi: 0,
        jenis_belanja_modal: 0,
        sisa_kas_tunai: 0,
        sisa_dana_di_bank: 0,
        tahun_anggaran: new Date().getFullYear().toString(),
        penerimaan_dana_id: null,
        buku_kas_umum_id: null,
    });

    const [isSaving, setIsSaving] = useState(false);
    const [isCalculating, setIsCalculating] = useState(false);
    const [availableYears, setAvailableYears] = useState<Array<{ id: number; tahun_anggaran: number | string }>>([]);

    useEffect(() => {
        fetchAvailableYears();
        fetchData();
    }, [page, search]);

    const handleCalculate = async () => {
        setIsCalculating(true);
        try {
            const response = await axios.get(vroute('api.sptj.calculate'), {
                params: {
                    tahun_anggaran: formData.tahun_anggaran,
                    tahap: formData.tahap
                }
            });

            // Update form data with calculated values
            // Response should match the keys in formData for the amounts
            setFormData(prev => ({
                ...prev,
                tahap_satu: response.data.tahap_satu,
                tahap_dua: response.data.tahap_dua,
                jenis_belanja_operasi: response.data.jenis_belanja_operasi,
                jenis_belanja_pegawai: 0, // Reset detailed, use operasi
                jenis_belanja_barang_jasa: response.data.jenis_belanja_operasi, // Map to barang jasa for storage
                jenis_belanja_modal: response.data.jenis_belanja_modal,
                sisa_kas_tunai: response.data.sisa_kas_tunai,
                sisa_dana_di_bank: response.data.sisa_dana_di_bank,
                penganggaran_id: response.data[penganggaranFk],
            }));
            showToast('Data berhasil dihitung.', 'success');
        } catch (error: any) {
            showToast(error.response?.data?.error || 'Gagal menghitung data', 'error');
        } finally {
            setIsCalculating(false);
        }
    };

    const fetchAvailableYears = async () => {
        try {
            const response = await axios.get(vroute('api.sptj.tahun'));
            const years = response.data;
            setAvailableYears(years);

            if (years.length > 0) {
                setFormData(prev => {
                    // Set default to first available budget only if not set
                    const isValid = years.some((y: any) => y.id === prev.penganggaran_id);
                    if (!isValid) {
                        return {
                            ...prev,
                            penganggaran_id: years[0].id,
                            tahun_anggaran: String(years[0].tahun_anggaran)
                        };
                    }
                    return prev;
                });
            }
        } catch (error) {
            console.error('Failed to fetch years:', error);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.get(vroute('api.sptj.index'), {
                params: { search, page }
            });
            setData(response.data.data);
            setLastPage(response.data.last_page);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            // Map operasi to barang_jasa for storage, pegwai 0
            const payload = {
                ...formData,
                jenis_belanja_pegawai: 0,
                jenis_belanja_barang_jasa: formData.jenis_belanja_operasi,
                [penganggaranFk]: formData.penganggaran_id
            };

            if (formData.id) {
                await axios.put(vroute('api.sptj.update', formData.id), payload);
                showToast('Data SPTJ berhasil diperbarui.', 'success');
            } else {
                await axios.post(vroute('api.sptj.store'), payload);
                showToast('Data SPTJ berhasil disimpan.', 'success');
            }
            setIsAddModalOpen(false);
            fetchData();
            resetForm();
        } catch (error: any) {
            console.error(error);
            if (error.response && error.response.status === 422) {
                const errors = error.response.data.errors;
                if (errors.nomor_sptj) {
                    setValidationMessage(errors.nomor_sptj[0]);
                    setIsValidationModalOpen(true);
                } else {
                    showToast('Data tidak valid. Silakan periksa kembali.', 'error');
                }
            } else {
                showToast('Gagal menyimpan data SPTJ.', 'error');
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = (id: number) => {
        setItemToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        try {
            await axios.delete(vroute('api.sptj.destroy', itemToDelete));
            fetchData();
            setIsDeleteModalOpen(false);
            setItemToDelete(null);
            showToast('Data SPTJ berhasil dihapus.', 'success');
        } catch (error) {
            console.error(error);
            showToast('Gagal menghapus data.', 'error');
        }
    };

    const openEdit = (item: SptjData) => {
        setFormData({
            ...item,
            id: item.id,
            tanggal_sptj: item.tanggal_sptj || '',
            tahap: item.tahap as any,
            tahun_anggaran: item.penganggaran?.tahun_anggaran || new Date().getFullYear().toString(),
            penganggaran_id: item.penganggaran_id,
            penerimaan_dana_id: item.penerimaan_dana_id as any,
            buku_kas_umum_id: item.buku_kas_umum_id as any,
            // amounts are already in item
            tahap_satu: Number(item.tahap_satu),
            tahap_dua: Number(item.tahap_dua),
            jenis_belanja_pegawai: Number(item.jenis_belanja_pegawai),
            jenis_belanja_barang_jasa: Number(item.jenis_belanja_barang_jasa),
            jenis_belanja_operasi: Number(item.jenis_belanja_pegawai) + Number(item.jenis_belanja_barang_jasa),
            jenis_belanja_modal: Number(item.jenis_belanja_modal),
            sisa_kas_tunai: Number(item.sisa_kas_tunai),
            sisa_dana_di_bank: Number(item.sisa_dana_di_bank),
        });
        setIsAddModalOpen(true);
    };

    const resetForm = () => {
        setFormData({
            id: null,
            nomor_sptj: '',
            tanggal_sptj: '',
            tahap: '1',
            penganggaran_id: availableYears.length > 0 ? availableYears[0].id : 0,
            tahap_satu: 0,
            tahap_dua: 0,
            jenis_belanja_pegawai: 0,
            jenis_belanja_barang_jasa: 0,
            jenis_belanja_operasi: 0,
            jenis_belanja_modal: 0,
            sisa_kas_tunai: 0,
            sisa_dana_di_bank: 0,
            tahun_anggaran: availableYears.length > 0 ? String(availableYears[0].tahun_anggaran) : new Date().getFullYear().toString(),
            penerimaan_dana_id: null,
            buku_kas_umum_id: null,
        });
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
    };

    return (
        <div className="space-y-4">
            {/* Toolbar: identitas tab + pencarian + aksi */}
            <div className="animate-rise" style={{ animationDelay: '60ms' }}>
                <Surface padding="sm">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-2.5">
                            <IconTile tone="mint" size="sm">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </IconTile>
                            <div>
                                <p className="text-[11.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">SPTJ</p>
                                <p className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500">Surat Pernyataan Tanggung Jawab Mutlak (BOSP)</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="w-full sm:w-64">
                                <TextInput
                                    type="text"
                                    placeholder="Cari Nomor SPTJ..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <PrimaryButton onClick={() => { resetForm(); setIsAddModalOpen(true); }}>
                                Tambah
                            </PrimaryButton>
                        </div>
                    </div>
                </Surface>
            </div>

            {/* Tabel data */}
            <div className="animate-rise" style={{ animationDelay: '120ms' }}>
                <DataTable
                    title="Daftar SPTJ"
                    subtitle="Riwayat dokumen SPTJ per tahap dan tahun anggaran."
                    icon={
                        <IconTile tone="sky" size="sm">
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 6h16M4 12h16M4 18h10" />
                            </svg>
                        </IconTile>
                    }
                    actions={<StatusBadge tone="info" dot={false} className="text-sikas-num">{data.length}</StatusBadge>}
                    contentClassName="mx-4 mb-4"
                    footer={
                        <>
                            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                                Page <span className="text-sikas-num font-extrabold text-slate-700 dark:text-slate-200">{page}</span> of <span className="text-sikas-num font-extrabold text-slate-700 dark:text-slate-200">{lastPage}</span>
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                                    disabled={page === 1}
                                    className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-[10px] font-extrabold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:disabled:border-white/5 dark:disabled:bg-white/5 dark:disabled:text-slate-600"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setPage(prev => Math.min(prev + 1, lastPage))}
                                    disabled={page === lastPage}
                                    className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-[10px] font-extrabold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:disabled:border-white/5 dark:disabled:bg-white/5 dark:disabled:text-slate-600"
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
                                <th className="text-left">No</th>
                                <th className="text-left">Nomor SPTJ</th>
                                <th className="text-left">Tahap</th>
                                <th className="text-right">Jml Penerimaan</th>
                                <th className="text-right">Jml Pengeluaran</th>
                                <th className="text-right">Sisa Kas</th>
                                <th className="text-right">Sisa Bank</th>
                                <th className="text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="p-0">
                                        <SkeletonRows rows={4} columns={6} />
                                    </td>
                                </tr>
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-0">
                                        <EmptyState
                                            className="border-0 bg-transparent py-9 dark:bg-transparent"
                                            icon={
                                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                </svg>
                                            }
                                            title="Tidak ada data SPTJ."
                                            description="Coba ubah kata kunci pencarian atau tambahkan data SPTJ baru."
                                        />
                                    </td>
                                </tr>
                            ) : (
                                data.map((item, index) => {
                                    const totalPenerimaan = Number(item.tahap_satu) + Number(item.tahap_dua);
                                    const totalPengeluaran = Number(item.jenis_belanja_pegawai) + Number(item.jenis_belanja_barang_jasa) + Number(item.jenis_belanja_modal);
                                    return (
                                        <tr key={item.id}>
                                            <td className="text-sikas-num text-slate-400 dark:text-slate-500">{index + 1 + (page - 1) * 10}</td>
                                            <td className="whitespace-nowrap font-extrabold text-slate-900 dark:text-white">{item.nomor_sptj}</td>
                                            <td className="whitespace-nowrap">
                                                <StatusBadge tone={item.tahap === '1' ? 'info' : 'violet'} dot={false}>{item.tahap}</StatusBadge>
                                            </td>
                                            <td className="whitespace-nowrap text-right text-sikas-num font-extrabold text-slate-900 dark:text-white">{formatCurrency(totalPenerimaan)}</td>
                                            <td className="whitespace-nowrap text-right text-sikas-num font-bold text-slate-600 dark:text-slate-300">{formatCurrency(totalPengeluaran)}</td>
                                            <td className="whitespace-nowrap text-right text-sikas-num font-bold text-slate-600 dark:text-slate-300">{formatCurrency(item.sisa_kas_tunai)}</td>
                                            <td className="whitespace-nowrap text-right text-sikas-num font-bold text-slate-600 dark:text-slate-300">{formatCurrency(item.sisa_dana_di_bank)}</td>
                                            <td className="whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => { setSelectedPdfUrl(vroute('laporan.sptj.pdf', item.id)); setIsPreviewModalOpen(true); }}
                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-100 bg-white text-sky-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:text-sky-700 dark:border-white/10 dark:bg-white/5 dark:text-sky-400 dark:hover:bg-white/10"
                                                        title="Preview PDF"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                                    </button>
                                                    <button
                                                        onClick={() => openEdit(item)}
                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-100 bg-white text-brand-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:text-brand-700 dark:border-white/10 dark:bg-white/5 dark:text-brand-300 dark:hover:bg-white/10"
                                                        title="Edit"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item.id)}
                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-100 bg-white text-rose-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:text-rose-700 dark:border-white/10 dark:bg-white/5 dark:text-rose-400 dark:hover:bg-white/10"
                                                        title="Delete"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </DataTable>
            </div>

            {/* Add/Edit Modal */}
            <LaporanFormModal
                show={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                maxWidth="7xl"
                tall
                title={formData.id ? 'Edit SPTJ' : 'Tambah SPTJ'}
                subtitle="Kelola Surat Pernyataan Tanggung Jawab Mutlak (BOSP)"
                isSaving={isSaving}
                onSubmit={handleSubmit}
            >
                <LaporanSectionCard title="Informasi Surat" tone="neutral">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                        <div className="col-span-1 md:col-span-2">
                            <InputLabel htmlFor="nomor_sptj" value="Nomor SPTJ" required />
                            <TextInput
                                id="nomor_sptj"
                                type="text"
                                className="w-full"
                                value={formData.nomor_sptj}
                                onChange={(e) => setFormData({ ...formData, nomor_sptj: e.target.value })}
                                required
                                placeholder="Contoh: 001/SPTJ/2024"
                            />
                        </div>

                        <div>
                            <InputLabel htmlFor="tanggal_sptj" value="Tanggal SPTJ" required />
                            <DatePicker
                                id="tanggal_sptj"
                                value={formData.tanggal_sptj}
                                onChange={(date) =>
                                    setFormData({
                                        ...formData,
                                        tanggal_sptj: date ? format(date, 'yyyy-MM-dd') : '',
                                    })
                                }
                                placeholder="Pilih tanggal SPTJ..."
                            />
                        </div>

                        <div>
                            <InputLabel htmlFor="sptj_tahun_anggaran" value="Tahun Anggaran" required />
                            <LaporanSelect
                                inputId="sptj_tahun_anggaran"
                                options={availableYears.map((year) => ({
                                    value: year.tahun_anggaran.toString(),
                                    label: year.tahun_anggaran.toString(),
                                }))}
                                value={formData.tahun_anggaran}
                                onChange={(selectedYear) => {
                                    const selectedBudget = availableYears.find(
                                        (y) => String(y.tahun_anggaran) === selectedYear,
                                    );
                                    setFormData({
                                        ...formData,
                                        tahun_anggaran: selectedYear,
                                        penganggaran_id: selectedBudget
                                            ? selectedBudget.id
                                            : formData.penganggaran_id,
                                    });
                                }}
                                placeholder="Pilih Tahun Anggaran..."
                                isSearchable
                            />
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
                        <div>
                            <InputLabel htmlFor="sptj_tahap" value="Tahap" required />
                            <LaporanSelect
                                inputId="sptj_tahap"
                                options={[
                                    { value: '1', label: 'Tahap 1' },
                                    { value: '2', label: 'Tahap 2' },
                                ]}
                                value={formData.tahap}
                                onChange={(val) => setFormData({ ...formData, tahap: (val || '1') as '1' | '2' })}
                                isSearchable={false}
                            />
                        </div>
                        <div className="flex items-end justify-end md:col-span-3">
                            <LaporanCalculateButton
                                onClick={handleCalculate}
                                isCalculating={isCalculating}
                                label="Hitung Otomatis via API"
                                className="w-full md:w-auto"
                            />
                        </div>
                    </div>
                </LaporanSectionCard>

                <LaporanSectionCard
                    title="Penerimaan Dana"
                    tone="mint"
                    icon={<ArrowDownLeft className="h-3.5 w-3.5" />}
                >
                    <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                        <LaporanMetricCard
                            label="Tahap I"
                            value={formatCurrency(formData.tahap_satu)}
                            tone="mint"
                        />
                        <LaporanMetricCard
                            label="Tahap II"
                            value={formatCurrency(formData.tahap_dua)}
                            tone="mint"
                        />
                    </div>
                </LaporanSectionCard>

                <LaporanSectionCard
                    title="Pengeluaran Dana"
                    tone="rose"
                    icon={<ArrowUpRight className="h-3.5 w-3.5" />}
                >
                    <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                        <LaporanMetricCard
                            label="Belanja Operasi"
                            value={formatCurrency(formData.jenis_belanja_operasi)}
                            tone="rose"
                        />
                        <LaporanMetricCard
                            label="Belanja Modal"
                            value={formatCurrency(formData.jenis_belanja_modal)}
                            tone="rose"
                        />
                    </div>
                </LaporanSectionCard>

                <LaporanSectionCard
                    title="Sisa Dana"
                    tone="sky"
                    icon={<Wallet className="h-3.5 w-3.5" />}
                >
                    <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                        <LaporanMetricCard
                            label="Sisa Kas Tunai"
                            value={formatCurrency(formData.sisa_kas_tunai)}
                            tone="sky"
                        />
                        <LaporanMetricCard
                            label="Sisa Dana Di Bank"
                            value={formatCurrency(formData.sisa_dana_di_bank)}
                            tone="sky"
                        />
                    </div>
                </LaporanSectionCard>
            </LaporanFormModal>

            {/* Delete Confirmation Modal */}
            <LaporanDeleteModal
                show={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Hapus Data SPTJ"
                message="Apakah Anda yakin ingin menghapus data SPTJ ini? Tindakan ini tidak dapat dibatalkan."
            />

            {/* Preview Modal */}
            <LaporanPdfPreviewModal
                show={isPreviewModalOpen}
                onClose={() => setIsPreviewModalOpen(false)}
                previewId="sptj-pdf-preview"
                title="Preview SPTJ"
                pdfUrl={selectedPdfUrl}
                onOpenPrintSettings={() => setIsPrintSettingsModalOpen(true)}
            />

            {/* Print Settings Modal */}
            <LaporanPrintSettingsModal
                show={isPrintSettingsModalOpen}
                onClose={() => setIsPrintSettingsModalOpen(false)}
                paperSize={printSettings.paperSize}
                fontSize={printSettings.fontSize}
                onPaperSizeChange={(paperSize) => setPrintSettings({ ...printSettings, paperSize })}
                onFontSizeChange={(fontSize) => setPrintSettings({ ...printSettings, fontSize })}
                onPrint={handlePrint}
            />

            {/* Validation Modal */}
            <LaporanValidationModal
                show={isValidationModalOpen}
                onClose={() => setIsValidationModalOpen(false)}
                title="Data Duplikat Terdeteksi"
                message={validationMessage}
                hint="Nomor SPTJ untuk tahap dan tahun anggaran ini sudah terdaftar dalam sistem. Mohon gunakan nomor yang berbeda atau periksa data yang sudah ada."
            />
        </div>
    );
}
