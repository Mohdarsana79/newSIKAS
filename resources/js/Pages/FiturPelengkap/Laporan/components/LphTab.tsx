import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
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
    LaporanPdfPreviewModal,
    LaporanPrintSettingsModal,
    LaporanSectionCard,
    LaporanSelect,
    LaporanValidationModal,
} from './LaporanModalPrimitives';

interface LphData {
    id: number;
    semester: '1' | '2';
    tanggal_lph: string | null;

    penerimaan_anggaran: number;
    penerimaan_realisasi: number;

    belanja_operasi_anggaran: number;
    belanja_operasi_realisasi: number;

    belanja_modal_peralatan_anggaran: number;
    belanja_modal_peralatan_realisasi: number;

    belanja_modal_aset_anggaran: number;
    belanja_modal_aset_realisasi: number;

    created_at: string;
    penganggaran_id: number;
    penganggaran: {
        id: number;
        tahun_anggaran: string;
    };
    items?: any[];
}

export default function LphTab() {
    const vroute = useVariantRoute();
    const penganggaranFk = usePage<any>().props.penganggaranFk || 'penganggaran_id';
    const [data, setData] = useState<LphData[]>([]);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [loading, setLoading] = useState(false);

    // Modals
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
    const [validationMessage, setValidationMessage] = useState('');
    const [itemToDelete, setItemToDelete] = useState<number | null>(null);
    const [selectedPdfUrl, setSelectedPdfUrl] = useState('');
    const [isPrintSettingsModalOpen, setIsPrintSettingsModalOpen] = useState(false);
    const [printSettings, setPrintSettings] = useState({
        paperSize: 'A4',
        fontSize: '11pt'
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
        semester: '1',
        tanggal_lph: '',
        penganggaran_id: 0,
        tahun_anggaran: new Date().getFullYear().toString(),
        
        penerimaan_anggaran: 0,
        penerimaan_realisasi: 0,
        belanja_operasi_anggaran: 0,
        belanja_operasi_realisasi: 0,
        belanja_modal_peralatan_anggaran: 0,
        belanja_modal_peralatan_realisasi: 0,
        belanja_modal_aset_anggaran: 0,
        belanja_modal_aset_realisasi: 0,
        
        rekap_per_rekening: [] as any[]
    });

    const [isSaving, setIsSaving] = useState(false);
    const [isCalculating, setIsCalculating] = useState(false);
    const [availableYears, setAvailableYears] = useState<Array<{ id: number; tahun_anggaran: number | string }>>([]);

    useEffect(() => {
        fetchAvailableYears();
        fetchData();
    }, [page, search]);

    const fetchAvailableYears = async () => {
        try {
            const response = await axios.get(vroute('api.lph.tahun'));
            const years = response.data;
            setAvailableYears(years);

            if (years.length > 0) {
                setFormData(prev => {
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
            const response = await axios.get(vroute('api.lph.index'), {
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

    const handleCalculate = async () => {
        setIsCalculating(true);
        try {
            const response = await axios.get(vroute('api.lph.calculate'), {
                params: {
                    tahun_anggaran: formData.tahun_anggaran,
                    semester: formData.semester
                }
            });

            setFormData(prev => ({
                ...prev,
                ...response.data,
                rekap_per_rekening: response.data.rekap_per_rekening || [],
                penganggaran_id: response.data[penganggaranFk]
            }));
            showToast('Data berhasil dihitung.', 'success');
        } catch (error: any) {
            showToast(error.response?.data?.error || 'Gagal menghitung data', 'error');
        } finally {
            setIsCalculating(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const payload = {
                ...formData,
                [penganggaranFk]: formData.penganggaran_id
            };
            if (formData.id) {
                await axios.put(vroute('api.lph.update', formData.id), payload);
                showToast('Data LPH berhasil diperbarui.', 'success');
            } else {
                await axios.post(vroute('api.lph.store'), payload);
                showToast('Data LPH berhasil disimpan.', 'success');
            }
            setIsAddModalOpen(false);
            fetchData();
            resetForm();
        } catch (error: any) {
            console.error(error);
            if (error.response && error.response.status === 422) {
                const errors = error.response.data.errors;
                if (errors.semester) {
                    setValidationMessage(errors.semester[0]);
                    setIsValidationModalOpen(true);
                } else {
                    showToast('Data tidak valid. Silakan periksa kembali.', 'error');
                }
            } else {
                showToast('Gagal menyimpan data LPH.', 'error');
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
            await axios.delete(vroute('api.lph.destroy', itemToDelete));
            fetchData();
            setIsDeleteModalOpen(false);
            setItemToDelete(null);
            showToast('Data LPH berhasil dihapus.', 'success');
        } catch (error) {
            console.error(error);
            showToast('Gagal menghapus data.', 'error');
        }
    };

    const openEdit = (item: any) => {
        setFormData({
            id: item.id,
            semester: item.semester,
            tanggal_lph: item.tanggal_lph || '',
            penganggaran_id: item.penganggaran_id,
            tahun_anggaran: item.penganggaran?.tahun_anggaran || new Date().getFullYear().toString(),
            
            penerimaan_anggaran: Number(item.penerimaan_anggaran) || 0,
            penerimaan_realisasi: Number(item.penerimaan_realisasi) || 0,
            belanja_operasi_anggaran: Number(item.belanja_operasi_anggaran) || 0,
            belanja_operasi_realisasi: Number(item.belanja_operasi_realisasi) || 0,
            belanja_modal_peralatan_anggaran: Number(item.belanja_modal_peralatan_anggaran) || 0,
            belanja_modal_peralatan_realisasi: Number(item.belanja_modal_peralatan_realisasi) || 0,
            belanja_modal_aset_anggaran: Number(item.belanja_modal_aset_anggaran) || 0,
            belanja_modal_aset_realisasi: Number(item.belanja_modal_aset_realisasi) || 0,
            
            rekap_per_rekening: item.items || []
        });
        setIsAddModalOpen(true);
    };

    const resetForm = () => {
        setFormData({
            id: null,
            semester: '1',
            tanggal_lph: '',
            penganggaran_id: availableYears.length > 0 ? availableYears[0].id : 0,
            tahun_anggaran: availableYears.length > 0 ? String(availableYears[0].tahun_anggaran) : new Date().getFullYear().toString(),
            
            penerimaan_anggaran: 0,
            penerimaan_realisasi: 0,
            belanja_operasi_anggaran: 0,
            belanja_operasi_realisasi: 0,
            belanja_modal_peralatan_anggaran: 0,
            belanja_modal_peralatan_realisasi: 0,
            belanja_modal_aset_anggaran: 0,
            belanja_modal_aset_realisasi: 0,
            
            rekap_per_rekening: []
        });
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
    };

    return (
        <div className="space-y-4">
            {/* Filter & aksi */}
            <div className="animate-rise" style={{ animationDelay: '60ms' }}>
                <Surface padding="sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 flex-1 sm:max-w-xs">
                            <TextInput
                                type="text"
                                placeholder="Cari LPH..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <PrimaryButton onClick={() => { resetForm(); setIsAddModalOpen(true); }}>
                            Tambah
                        </PrimaryButton>
                    </div>
                </Surface>
            </div>

            {/* Daftar LPH */}
            <div className="animate-rise" style={{ animationDelay: '120ms' }}>
                <DataTable
                    title="Daftar LPH"
                    subtitle="Laporan Penggunaan Hibah (BOSP) per semester"
                    icon={
                        <IconTile tone="violet" size="sm">
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
                                <th className="text-left">Semester</th>
                                <th className="text-left">Tahun</th>
                                <th className="text-left">Tanggal Lapor</th>
                                <th className="text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={5} className="p-0"><SkeletonRows rows={4} columns={4} /></td></tr>
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-4">
                                        <EmptyState
                                            className="border-0 bg-transparent py-9 dark:bg-transparent"
                                            title="Tidak ada data LPH."
                                            description="Coba ubah kata kunci pencarian atau tambahkan data LPH baru."
                                            icon={
                                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            }
                                        />
                                    </td>
                                </tr>
                            ) : (
                                data.map((item, index) => (
                                    <tr key={item.id}>
                                        <td className="text-sikas-num whitespace-nowrap">{index + 1 + (page - 1) * 10}</td>
                                        <td className="whitespace-nowrap">
                                            <StatusBadge tone="violet" dot={false}>
                                                {item.semester === '1' ? 'Ganjil' : 'Genap'}
                                            </StatusBadge>
                                        </td>
                                        <td className="text-sikas-num whitespace-nowrap">{item.penganggaran?.tahun_anggaran}</td>
                                        <td className="text-sikas-num whitespace-nowrap">{item.tanggal_lph ? new Date(item.tanggal_lph).toLocaleDateString('id-ID') : '-'}</td>
                                        <td className="whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    onClick={() => { setSelectedPdfUrl(vroute('laporan.lph.pdf', item.id)); setIsPreviewModalOpen(true); }}
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
                                ))
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
                title={formData.id ? 'Edit LPH' : 'Tambah LPH'}
                subtitle="Kelola Laporan Penggunaan Hibah (BOSP)"
                submitLabel="Simpan LPH"
                isSaving={isSaving}
                submitDisabled={(formData.rekap_per_rekening || []).length === 0}
                onSubmit={handleSubmit}
            >
                <LaporanSectionCard title="Informasi Laporan" tone="neutral">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                        <div>
                            <InputLabel htmlFor="lph_semester" value="Semester" required />
                            <LaporanSelect
                                inputId="lph_semester"
                                options={[
                                    { value: '1', label: 'Ganjil (Jan-Jun)' },
                                    { value: '2', label: 'Genap (Jul-Des)' },
                                ]}
                                value={formData.semester}
                                onChange={(val) => setFormData({ ...formData, semester: val || '1' })}
                                isSearchable={false}
                            />
                        </div>

                        <div>
                            <InputLabel htmlFor="lph_tahun_anggaran" value="Tahun Anggaran" required />
                            <LaporanSelect
                                inputId="lph_tahun_anggaran"
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

                        <div>
                            <InputLabel htmlFor="tanggal_lph" value="Tanggal Lapor" />
                            <DatePicker
                                id="tanggal_lph"
                                value={formData.tanggal_lph}
                                onChange={(date) =>
                                    setFormData({
                                        ...formData,
                                        tanggal_lph: date ? format(date, 'yyyy-MM-dd') : '',
                                    })
                                }
                                placeholder="Pilih tanggal lapor..."
                            />
                        </div>

                        <div className="flex items-end justify-end">
                            <LaporanCalculateButton
                                onClick={handleCalculate}
                                isCalculating={isCalculating}
                                label="Tarik Data Realisasi"
                                className="w-full"
                            />
                        </div>
                    </div>
                </LaporanSectionCard>

                            {/* Section 2: Summary Stats */}
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                {/* Penerimaan */}
                                <div className="rounded-2xl border border-mint/15 bg-pastel-mint/50 p-4 dark:border-mint/20 dark:bg-mint/[0.06]">
                                    <div className="mb-3 flex items-center gap-2.5">
                                        <IconTile tone="mint" size="sm">
                                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                        </IconTile>
                                        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-mint dark:text-mint">PENERIMAAN</p>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between gap-3 border-b border-mint/10 pb-2 text-[11px] dark:border-white/5">
                                            <span className="font-semibold text-slate-500 dark:text-slate-400">Anggaran:</span>
                                            <span className="text-sikas-num font-extrabold text-slate-900 dark:text-white">{formatCurrency(formData.penerimaan_anggaran)}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3 border-b border-mint/10 pb-2 text-[11px] dark:border-white/5">
                                            <span className="font-semibold text-slate-500 dark:text-slate-400">Realisasi:</span>
                                            <span className="text-sikas-num font-extrabold text-slate-900 dark:text-white">{formatCurrency(formData.penerimaan_realisasi)}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3 text-[11.5px]">
                                            <span className="font-extrabold text-mint dark:text-mint">Selisih:</span>
                                            <span className="text-sikas-num font-extrabold text-mint dark:text-mint">{formatCurrency(formData.penerimaan_anggaran - formData.penerimaan_realisasi)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Belanja Operasi */}
                                <div className="rounded-2xl border border-sky/10 bg-pastel-sky/40 p-4 dark:border-sky/20 dark:bg-sky/[0.06]">
                                    <div className="mb-3 flex items-center gap-2.5">
                                        <IconTile tone="sky" size="sm">
                                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                                        </IconTile>
                                        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-sky dark:text-sky">BELANJA OPERASI</p>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between gap-3 border-b border-sky/10 pb-2 text-[11px] dark:border-white/5">
                                            <span className="font-semibold text-slate-500 dark:text-slate-400">Anggaran:</span>
                                            <span className="text-sikas-num font-extrabold text-slate-900 dark:text-white">{formatCurrency(formData.belanja_operasi_anggaran)}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3 border-b border-sky/10 pb-2 text-[11px] dark:border-white/5">
                                            <span className="font-semibold text-slate-500 dark:text-slate-400">Realisasi:</span>
                                            <span className="text-sikas-num font-extrabold text-slate-900 dark:text-white">{formatCurrency(formData.belanja_operasi_realisasi)}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3 text-[11.5px]">
                                            <span className="font-extrabold text-sky dark:text-sky">Selisih:</span>
                                            <span className="text-sikas-num font-extrabold text-sky dark:text-sky">{formatCurrency(formData.belanja_operasi_anggaran - formData.belanja_operasi_realisasi)}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Belanja Modal Peralatan */}
                                <div className="rounded-2xl border border-amber-500/15 bg-pastel-amber/60 p-4 dark:border-amber-400/20 dark:bg-amber-400/[0.06]">
                                    <div className="mb-3 flex items-center gap-2.5">
                                        <IconTile tone="amber" size="sm">
                                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"></path></svg>
                                        </IconTile>
                                        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-amber-600 dark:text-amber-300">BM PERALATAN &amp; MESIN</p>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between gap-3 border-b border-amber-500/10 pb-2 text-[11px] dark:border-white/5">
                                            <span className="font-semibold text-slate-500 dark:text-slate-400">Anggaran:</span>
                                            <span className="text-sikas-num font-extrabold text-slate-900 dark:text-white">{formatCurrency(formData.belanja_modal_peralatan_anggaran)}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3 border-b border-amber-500/10 pb-2 text-[11px] dark:border-white/5">
                                            <span className="font-semibold text-slate-500 dark:text-slate-400">Realisasi:</span>
                                            <span className="text-sikas-num font-extrabold text-slate-900 dark:text-white">{formatCurrency(formData.belanja_modal_peralatan_realisasi)}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3 text-[11.5px]">
                                            <span className="font-extrabold text-amber-600 dark:text-amber-300">Selisih:</span>
                                            <span className="text-sikas-num font-extrabold text-amber-600 dark:text-amber-300">{formatCurrency(formData.belanja_modal_peralatan_anggaran - formData.belanja_modal_peralatan_realisasi)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Belanja Modal Aset Tetap Lainnya */}
                                <div className="rounded-2xl border border-rose-500/10 bg-pastel-rose/40 p-4 dark:border-rose-400/20 dark:bg-rose-500/[0.06]">
                                    <div className="mb-3 flex items-center gap-2.5">
                                        <IconTile tone="rose" size="sm">
                                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                                        </IconTile>
                                        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-rose-600 dark:text-rose-300">BM ASET TETAP LAINNYA</p>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between gap-3 border-b border-rose-500/10 pb-2 text-[11px] dark:border-white/5">
                                            <span className="font-semibold text-slate-500 dark:text-slate-400">Anggaran:</span>
                                            <span className="text-sikas-num font-extrabold text-slate-900 dark:text-white">{formatCurrency(formData.belanja_modal_aset_anggaran)}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3 border-b border-rose-500/10 pb-2 text-[11px] dark:border-white/5">
                                            <span className="font-semibold text-slate-500 dark:text-slate-400">Realisasi:</span>
                                            <span className="text-sikas-num font-extrabold text-slate-900 dark:text-white">{formatCurrency(formData.belanja_modal_aset_realisasi)}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3 text-[11.5px]">
                                            <span className="font-extrabold text-rose-600 dark:text-rose-300">Selisih:</span>
                                            <span className="text-sikas-num font-extrabold text-rose-600 dark:text-rose-300">{formatCurrency(formData.belanja_modal_aset_anggaran - formData.belanja_modal_aset_realisasi)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Items Table */}
                            <div>
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Rincian Penggunaan Dana Per Rekening</p>
                                </div>
                                <div className="bento-table-wrapper overflow-x-auto">
                                    <table className="min-w-full">
                                        <thead>
                                            <tr>
                                                <th className="text-left">Kode Rekening</th>
                                                <th className="text-left">Uraian</th>
                                                <th className="text-right">Jumlah (Rp)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(formData.rekap_per_rekening || []).length === 0 ? (
                                                <tr><td colSpan={3} className="px-6 py-8 text-center !text-[11.5px] font-medium italic text-slate-400 dark:text-slate-500">Klik tombol "Tarik Data Realisasi" untuk memuat rincian.</td></tr>
                                            ) : (
                                                formData.rekap_per_rekening.map((item, idx) => (
                                                    <tr key={idx}>
                                                        <td className="whitespace-nowrap font-mono text-sikas-num">{item.kode_rekening}</td>
                                                        <td>{item.uraian}</td>
                                                        <td className="whitespace-nowrap text-right text-sikas-num">
                                                            {formatCurrency(Number(item.total_realisasi))}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                        {(formData.rekap_per_rekening || []).length > 0 && (
                                            <tfoot>
                                                <tr>
                                                    <td colSpan={2} className="text-right !text-[11.5px] !font-extrabold !text-slate-900 dark:!text-white">TOTAL PENGGUNAAN:</td>
                                                    <td className="text-right !text-[12px] !font-extrabold !text-slate-900 text-sikas-num dark:!text-white">
                                                        {formatCurrency(formData.rekap_per_rekening.reduce((sum, item) => sum + Number(item.total_realisasi), 0))}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            </div>
            </LaporanFormModal>

            {/* Delete Confirmation Modal */}
            <LaporanDeleteModal
                show={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Hapus Data LPH"
                message="Apakah Anda yakin ingin menghapus laporan LPH ini? Tindakan ini tidak dapat dibatalkan."
            />

            {/* Preview Modal */}
            <LaporanPdfPreviewModal
                show={isPreviewModalOpen}
                onClose={() => setIsPreviewModalOpen(false)}
                previewId="lph-pdf-preview"
                title="Preview LPH (Lampiran Hibah)"
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
                hint="Laporan LPH untuk semester dan tahun anggaran ini sudah terdaftar dalam sistem. Mohon periksa kembali data yang sudah ada."
            />
        </div>
    );
}
