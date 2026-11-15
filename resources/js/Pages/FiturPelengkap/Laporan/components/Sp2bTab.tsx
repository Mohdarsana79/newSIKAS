import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Layers, Receipt } from 'lucide-react';
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

const BULAN_OPTIONS = [
    { value: '1', label: 'Januari' },
    { value: '2', label: 'Februari' },
    { value: '3', label: 'Maret' },
    { value: '4', label: 'April' },
    { value: '5', label: 'Mei' },
    { value: '6', label: 'Juni' },
    { value: '7', label: 'Juli' },
    { value: '8', label: 'Agustus' },
    { value: '9', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' },
];

interface Sp2bData {
    id: number;
    nomor_sp2b: string;
    tanggal_sp2b: string;
    jenis_periode: 'bulan' | 'tahap';
    bulan?: number | null;
    tahap: '1' | '2';
    saldo_awal: number;
    pendapatan: number;
    belanja: number;
    belanja_pegawai: number;
    belanja_barang_jasa: number;
    belanja_modal: number;
    belanja_modal_peralatan_mesin: number;
    belanja_modal_aset_tetap_lainnya: number;
    belanja_modal_tanah_bangunan: number;
    saldo_akhir: number;
    created_at: string;
    penganggaran_id: number;
    penganggaran: {
        id: number;
        tahun_anggaran: string;
    };
}

export default function Sp2bTab() {
    const vroute = useVariantRoute();
    const penganggaranFk = usePage<any>().props.penganggaranFk || 'penganggaran_id';
    const [data, setData] = useState<Sp2bData[]>([]);
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
        fontSize: '8pt'
    });

    const handlePrint = () => {
        const url = `${selectedPdfUrl}?paper_size=${printSettings.paperSize}&font_size=${printSettings.fontSize}`;
        window.open(url, '_blank');
        setIsPrintSettingsModalOpen(false);
    };

    // Form Data
    const [formData, setFormData] = useState({
        id: null as number | null,
        nomor_sp2b: '',
        tanggal_sp2b: '',
        jenis_periode: 'tahap' as 'bulan' | 'tahap',
        bulan: new Date().getMonth() + 1,
        tahap: '1',
        penganggaran_id: 0,
        tahun_anggaran: new Date().getFullYear().toString(),
        saldo_awal: 0,
        pendapatan: 0,
        belanja: 0,
        belanja_pegawai: 0,
        belanja_barang_jasa: 0,
        belanja_modal: 0,
        belanja_modal_peralatan_mesin: 0,
        belanja_modal_aset_tetap_lainnya: 0,
        belanja_modal_tanah_bangunan: 0,
        saldo_akhir: 0,
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
            const response = await axios.get(vroute('api.sp2b.calculate'), {
                params: {
                    tahun_anggaran: formData.tahun_anggaran,
                    jenis_periode: formData.jenis_periode,
                    bulan: formData.bulan,
                    tahap: formData.tahap
                }
            });

            setFormData(prev => ({
                ...prev,
                saldo_awal: response.data.saldo_awal,
                pendapatan: response.data.pendapatan,
                belanja: response.data.belanja,
                belanja_pegawai: response.data.belanja_pegawai,
                belanja_barang_jasa: response.data.belanja_barang_jasa,
                belanja_modal: response.data.belanja_modal,
                belanja_modal_peralatan_mesin: response.data.belanja_modal_peralatan_mesin,
                belanja_modal_aset_tetap_lainnya: response.data.belanja_modal_aset_tetap_lainnya,
                belanja_modal_tanah_bangunan: response.data.belanja_modal_tanah_bangunan,
                saldo_akhir: response.data.saldo_akhir,
                penganggaran_id: response.data[penganggaranFk],
            }));
        } catch (error: any) {
            alert(error.response?.data?.error || 'Gagal menghitung data');
        } finally {
            setIsCalculating(false);
        }
    };

    const fetchAvailableYears = async () => {
        try {
            const response = await axios.get(vroute('api.sp2b.tahun'));
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
            const response = await axios.get(vroute('api.sp2b.index'), {
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
        if (!formData.tanggal_sp2b) {
            setValidationMessage('Tanggal SP2B wajib dipilih.');
            setIsValidationModalOpen(true);
            return;
        }
        setIsSaving(true);
        try {
            const payload = {
                ...formData,
                [penganggaranFk]: formData.penganggaran_id
            };
            if (formData.id) {
                await axios.put(vroute('api.sp2b.update', formData.id), payload);
            } else {
                await axios.post(vroute('api.sp2b.store'), payload);
            }
            setIsAddModalOpen(false);
            fetchData();
            resetForm();
        } catch (error: any) {
            console.error(error);
            let msg = 'Gagal menyimpan data. Pastikan semua field sudah diisi termasuk memencet tombol hitung otomatis.';
            if (error.response?.data?.errors?.nomor_sp2b) {
                msg = error.response.data.errors.nomor_sp2b[0];
            } else if (error.response?.data?.message) {
                msg = error.response.data.message;
            }
            setValidationMessage(msg);
            setIsValidationModalOpen(true);
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
            await axios.delete(vroute('api.sp2b.destroy', itemToDelete));
            fetchData();
            setIsDeleteModalOpen(false);
            setItemToDelete(null);
        } catch (error) {
            console.error(error);
            alert('Gagal menghapus data');
        }
    };

    const openEdit = (item: Sp2bData) => {
        setFormData({
            id: item.id,
            nomor_sp2b: item.nomor_sp2b,
            tanggal_sp2b: item.tanggal_sp2b || '',
            jenis_periode: item.jenis_periode || 'tahap',
            bulan: item.bulan || new Date().getMonth() + 1,
            tahap: item.tahap as any,
            tahun_anggaran: item.penganggaran?.tahun_anggaran || new Date().getFullYear().toString(),
            penganggaran_id: item.penganggaran_id,
            saldo_awal: Number(item.saldo_awal),
            pendapatan: Number(item.pendapatan),
            belanja: Number(item.belanja),
            belanja_pegawai: Number(item.belanja_pegawai),
            belanja_barang_jasa: Number(item.belanja_barang_jasa),
            belanja_modal: Number(item.belanja_modal),
            belanja_modal_peralatan_mesin: Number(item.belanja_modal_peralatan_mesin),
            belanja_modal_aset_tetap_lainnya: Number(item.belanja_modal_aset_tetap_lainnya),
            belanja_modal_tanah_bangunan: Number(item.belanja_modal_tanah_bangunan),
            saldo_akhir: Number(item.saldo_akhir),
        });
        setIsAddModalOpen(true);
    };

    const resetForm = () => {
        setFormData({
            id: null,
            nomor_sp2b: '',
            tanggal_sp2b: '',
            jenis_periode: 'tahap',
            bulan: new Date().getMonth() + 1,
            tahap: '1',
            penganggaran_id: availableYears.length > 0 ? availableYears[0].id : 0,
            tahun_anggaran: availableYears.length > 0 ? String(availableYears[0].tahun_anggaran) : new Date().getFullYear().toString(),
            saldo_awal: 0,
            pendapatan: 0,
            belanja: 0,
            belanja_pegawai: 0,
            belanja_barang_jasa: 0,
            belanja_modal: 0,
            belanja_modal_peralatan_mesin: 0,
            belanja_modal_aset_tetap_lainnya: 0,
            belanja_modal_tanah_bangunan: 0,
            saldo_akhir: 0,
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
                                placeholder="Cari Nomor SP2B..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <PrimaryButton onClick={() => { resetForm(); setIsAddModalOpen(true); }}>
                            Tambah SP2B
                        </PrimaryButton>
                    </div>
                </Surface>
            </div>

            {/* Daftar SP2B */}
            <div className="animate-rise" style={{ animationDelay: '120ms' }}>
                <DataTable
                    title="Daftar SP2B"
                    subtitle="Surat Permintaan Pengesahan Belanja per periode"
                    icon={
                        <IconTile tone="violet" size="sm">
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
                                <th className="text-left">Nomor SP2B</th>
                                <th className="text-right">Belanja Pegawai</th>
                                <th className="text-right">Belanja Barang dan Jasa</th>
                                <th className="text-right">Belanja Modal</th>
                                <th className="text-left">Periode</th>
                                <th className="text-left">Tahun</th>
                                <th className="text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={8} className="p-0"><SkeletonRows rows={4} columns={6} /></td></tr>
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-4">
                                        <EmptyState
                                            className="border-0 bg-transparent py-9 dark:bg-transparent"
                                            title="Tidak ada data SP2B."
                                            description="Coba ubah kata kunci pencarian atau tambahkan data SP2B baru."
                                            icon={
                                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            }
                                        />
                                    </td>
                                </tr>
                            ) : (
                                data.map((item, index) => {
                                    return (
                                        <tr key={item.id}>
                                            <td className="text-sikas-num whitespace-nowrap">{index + 1 + (page - 1) * 10}</td>
                                            <td className="text-sikas-num whitespace-nowrap font-bold text-slate-900 dark:text-white">{item.nomor_sp2b}</td>
                                            <td className="text-sikas-num whitespace-nowrap text-right">{formatCurrency(item.belanja_pegawai)}</td>
                                            <td className="text-sikas-num whitespace-nowrap text-right">{formatCurrency(item.belanja_barang_jasa)}</td>
                                            <td className="text-sikas-num whitespace-nowrap text-right">{formatCurrency(item.belanja_modal)}</td>
                                            <td className="whitespace-nowrap">
                                                <StatusBadge tone="info" dot={false}>
                                                    {item.jenis_periode === 'bulan' ? `Bulan ${item.bulan}` : `Tahap ${item.tahap}`}
                                                </StatusBadge>
                                            </td>
                                            <td className="text-sikas-num whitespace-nowrap">{item.penganggaran?.tahun_anggaran}</td>
                                            <td className="whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={() => { setSelectedPdfUrl(vroute('laporan.sp2b.pdf', item.id)); setIsPreviewModalOpen(true); }}
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
                title={formData.id ? 'Edit SP2B' : 'Tambah SP2B'}
                subtitle="Permintaan Pengesahan Belanja (Modal Perhitungan Otomatis)"
                isSaving={isSaving}
                onSubmit={handleSubmit}
            >
                <LaporanSectionCard title="Informasi Surat" tone="neutral">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                        <div className="col-span-1 md:col-span-2">
                            <InputLabel htmlFor="nomor_sp2b" value="Nomor SP2B" required />
                            <TextInput
                                id="nomor_sp2b"
                                type="text"
                                className="w-full"
                                value={formData.nomor_sp2b}
                                onChange={(e) => setFormData({ ...formData, nomor_sp2b: e.target.value })}
                                required
                                placeholder="Contoh: 001/SP2b/2025"
                            />
                        </div>

                        <div>
                            <InputLabel htmlFor="tanggal_sp2b" value="Tanggal SP2B" required />
                            <DatePicker
                                id="tanggal_sp2b"
                                value={formData.tanggal_sp2b}
                                onChange={(date) =>
                                    setFormData({
                                        ...formData,
                                        tanggal_sp2b: date ? format(date, 'yyyy-MM-dd') : '',
                                    })
                                }
                                placeholder="Pilih tanggal SP2B..."
                            />
                        </div>

                        <div>
                            <InputLabel htmlFor="sp2b_tahun_anggaran" value="Tahun Anggaran" required />
                            <LaporanSelect
                                inputId="sp2b_tahun_anggaran"
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
                            <InputLabel htmlFor="sp2b_jenis_periode" value="Jenis Periode" required />
                            <LaporanSelect
                                inputId="sp2b_jenis_periode"
                                options={[
                                    { value: 'bulan', label: 'Bulan' },
                                    { value: 'tahap', label: 'Tahap' },
                                ]}
                                value={formData.jenis_periode}
                                onChange={(val) =>
                                    setFormData({
                                        ...formData,
                                        jenis_periode: (val || 'bulan') as 'bulan' | 'tahap',
                                    })
                                }
                                isSearchable={false}
                            />
                        </div>

                        {formData.jenis_periode === 'bulan' ? (
                            <div>
                                <InputLabel htmlFor="sp2b_bulan" value="Bulan" required />
                                <LaporanSelect
                                    inputId="sp2b_bulan"
                                    options={BULAN_OPTIONS}
                                    value={formData.bulan ? String(formData.bulan) : ''}
                                    onChange={(val) =>
                                        setFormData({
                                            ...formData,
                                            bulan: val ? Number(val) : formData.bulan,
                                        })
                                    }
                                    placeholder="Pilih Bulan..."
                                    isSearchable
                                />
                            </div>
                        ) : (
                            <div>
                                <InputLabel htmlFor="sp2b_tahap" value="Tahap" required />
                                <LaporanSelect
                                    inputId="sp2b_tahap"
                                    options={[
                                        { value: '1', label: 'Tahap 1' },
                                        { value: '2', label: 'Tahap 2' },
                                    ]}
                                    value={formData.tahap}
                                    onChange={(val) =>
                                        setFormData({ ...formData, tahap: (val || '1') as '1' | '2' })
                                    }
                                    isSearchable={false}
                                />
                            </div>
                        )}

                        <div className="flex items-end justify-end md:col-span-2">
                            <LaporanCalculateButton
                                onClick={handleCalculate}
                                isCalculating={isCalculating}
                                label="Hitung Otomatis via API"
                                className="w-full md:w-auto"
                            />
                        </div>
                    </div>
                </LaporanSectionCard>

                <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                    <LaporanMetricCard
                        label="Saldo Awal"
                        value={formatCurrency(formData.saldo_awal)}
                        tone="neutral"
                    />
                    <LaporanMetricCard
                        label="Pendapatan"
                        value={formatCurrency(formData.pendapatan)}
                        tone="sky"
                    />
                </div>

                <LaporanSectionCard
                    title="Rincian Belanja"
                    tone="rose"
                    icon={<Receipt className="h-3.5 w-3.5" />}
                >
                    <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
                        <LaporanMetricCard
                            label="Belanja Pegawai"
                            value={formatCurrency(formData.belanja_pegawai)}
                            tone="rose"
                        />
                        <LaporanMetricCard
                            label="Belanja Barang dan Jasa"
                            value={formatCurrency(formData.belanja_barang_jasa)}
                            tone="rose"
                        />
                        <LaporanMetricCard
                            label="Total Belanja Modal"
                            value={formatCurrency(formData.belanja_modal)}
                            tone="rose"
                        />
                    </div>
                </LaporanSectionCard>

                <LaporanSectionCard
                    title="Rincian Belanja Modal"
                    tone="sky"
                    icon={<Layers className="h-3.5 w-3.5" />}
                >
                    <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
                        <LaporanMetricCard
                            label="Peralatan dan Mesin"
                            value={formatCurrency(formData.belanja_modal_peralatan_mesin)}
                            tone="sky"
                        />
                        <LaporanMetricCard
                            label="Aset Tetap Lainnya"
                            value={formatCurrency(formData.belanja_modal_aset_tetap_lainnya)}
                            tone="sky"
                        />
                        <LaporanMetricCard
                            label="Tanah dan Bangunan"
                            value={formatCurrency(formData.belanja_modal_tanah_bangunan)}
                            tone="sky"
                        />
                    </div>
                </LaporanSectionCard>

                <LaporanMetricCard
                    label="Saldo Akhir"
                    value={formatCurrency(formData.saldo_akhir)}
                    tone={formData.saldo_akhir < 0 ? 'rose' : 'mint'}
                    sublabel="Akumulasi saldo akhir kas periode terpilih"
                />
            </LaporanFormModal>

            {/* Delete Confirmation Modal */}
            <LaporanDeleteModal
                show={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Hapus Data SP2B"
                message="Apakah Anda yakin ingin menghapus data SP2B ini? Tindakan ini tidak dapat dibatalkan."
            />

            {/* Preview Modal */}
            <LaporanPdfPreviewModal
                show={isPreviewModalOpen}
                onClose={() => setIsPreviewModalOpen(false)}
                previewId="sp2b-pdf-preview"
                title="Pratinjau SP2B"
                pdfUrl={`${selectedPdfUrl}?font_size=${printSettings.fontSize}&paper_size=${printSettings.paperSize}`}
                onOpenPrintSettings={() => {
                    setIsPreviewModalOpen(false);
                    setIsPrintSettingsModalOpen(true);
                }}
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
                title="Peringatan Validasi"
                message={validationMessage}
                hint="Pastikan seluruh isian wajib SP2B telah lengkap dan tombol Hitung Otomatis sudah dijalankan sebelum menyimpan."
            />
        </div>
    );
}
