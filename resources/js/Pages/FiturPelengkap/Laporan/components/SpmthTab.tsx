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
import SpjTemplateSelector from '@/Components/SpjCustomTemplate/SpjTemplateSelector';
import SpjTemplateModal from '@/Components/SpjCustomTemplate/SpjTemplateModal';
import {
    resolveCanManageSpjTemplates,
    resolveSpjCustomFormVariables,
    useSpjCustomTemplates,
} from '@/Components/SpjCustomTemplate/types';
import LaporanCustomVariablesSection from './LaporanCustomVariablesSection';
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

// ... (in the component return)

interface SpmthData {
    id: number;
    nomor_surat: string;
    tahap: '1' | '2';
    realisasi_lalu: number;
    realisasi_ini: number;
    sisa: number;
    tanggal_spmth: string | null;
    custom_variables?: Record<string, string> | null;
    created_at: string;
    penganggaran_id: number;
    penganggaran: {
        id: number;
        tahun_anggaran: string;
    };
}


export default function SpmthTab() {
    const vroute = useVariantRoute();
    const pageProps = usePage<any>().props;
    const penganggaranFk = pageProps.penganggaranFk || 'penganggaran_id';
    const canManageTemplates = resolveCanManageSpjTemplates(pageProps, 'spmth');
    const {
        templates: customTemplates,
        variableCatalog,
        libreOfficeAvailable,
        selectedFormat,
        setSelectedFormat,
        activeCustomTemplateId,
        activeCustomTemplate,
        fetchTemplates: fetchCustomTemplates,
    } = useSpjCustomTemplates('spmth');
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [customVariables, setCustomVariables] = useState<Record<string, string>>({});
    const [previewCustomDownloadUrl, setPreviewCustomDownloadUrl] = useState<string | null>(null);
    const [previewCustomDocxUrl, setPreviewCustomDocxUrl] = useState<string | null>(null);
    const [previewTitle, setPreviewTitle] = useState('Preview SPMTH');
    const hasCustomFormVars =
        resolveSpjCustomFormVariables(customTemplates, activeCustomTemplate).length > 0;
    const [data, setData] = useState<SpmthData[]>([]);
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
        const url = `${vroute('laporan.spmth.pdf', itemToDelete || 0)}?paper_size=${printSettings.paperSize}&font_size=${printSettings.fontSize}`; // Fallback to itemToDelete or whatever state holds the ID. Wait, PDF uses selectedPdfUrl! Let's just append parameters.
        window.open(`${selectedPdfUrl}?paper_size=${printSettings.paperSize}&font_size=${printSettings.fontSize}`, '_blank');
        setIsPrintSettingsModalOpen(false);
    };

    // Form Data
    const [formData, setFormData] = useState({
        id: null as number | null,
        nomor_surat: '',
        tanggal_spmth: '',
        tahun_anggaran: new Date().getFullYear().toString(),
        tahap: '1',
        penganggaran_id: 0,
        pagu: 0,
        realisasi_lalu: 0,
        realisasi_ini: 0,
        sisa: 0
    });

    const [isCalculating, setIsCalculating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [availableYears, setAvailableYears] = useState<Array<{ id: number; tahun_anggaran: number | string }>>([]);

    useEffect(() => {
        fetchAvailableYears();
        fetchData();
    }, [page, search]);

    const fetchAvailableYears = async () => {
        try {
            const response = await axios.get(vroute('api.spmth.tahun'));
            const years = response.data;
            setAvailableYears(years);

            if (years.length > 0) {
                setFormData(prev => {
                    // Set default to first available budget
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
    // ... existing fetchData ...


    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.get(vroute('api.spmth.index'), {
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
            const response = await axios.get(vroute('api.spmth.calculate'), {
                params: {
                    tahun_anggaran: formData.tahun_anggaran,
                    tahap: formData.tahap
                }
            });

            const data = response.data;
            setFormData(prev => ({
                ...prev,
                pagu: data.pagu,
                realisasi_lalu: data.realisasi_lalu,
                realisasi_ini: data.realisasi_ini,
                sisa: data.sisa,
                penganggaran_id: data[penganggaranFk]
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
                [penganggaranFk]: formData.penganggaran_id,
                custom_variables: customVariables,
            };
            if (formData.id) {
                await axios.put(vroute('api.spmth.update', formData.id), payload);
                showToast('Data SPMTH berhasil diperbarui.', 'success');
            } else {
                await axios.post(vroute('api.spmth.store'), payload);
                showToast('Data SPMTH berhasil disimpan.', 'success');
            }
            setIsAddModalOpen(false);
            fetchData();
            resetForm();
        } catch (error: any) {
            console.error(error);
            if (error.response && error.response.status === 422) {
                const errors = error.response.data.errors;
                if (errors.nomor_surat) {
                    setValidationMessage(errors.nomor_surat[0]);
                    setIsValidationModalOpen(true);
                } else {
                    showToast('Data tidak valid. Silakan periksa kembali.', 'error');
                }
            } else {
                showToast('Gagal menyimpan data SPMTH.', 'error');
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
            await axios.delete(vroute('api.spmth.destroy', itemToDelete));
            fetchData();
            setIsDeleteModalOpen(false);
            setItemToDelete(null);
            showToast('Data SPMTH berhasil dihapus.', 'success');
        } catch (error) {
            console.error(error);
            showToast('Gagal menghapus data.', 'error');
        }
    };

    const openEdit = (item: SpmthData) => {
        setFormData({
            ...item,
            id: item.id,
            tanggal_spmth: item.tanggal_spmth || '',
            tahap: item.tahap as any,
            tahun_anggaran: item.penganggaran?.tahun_anggaran || new Date().getFullYear().toString(),
            pagu: 0 // Will need calculation if we want to show it, or we rely on 'Hitung' being clicked again or just display 0
        });
        const initialCustom: Record<string, string> = {};
        if (item.custom_variables && typeof item.custom_variables === 'object') {
            Object.entries(item.custom_variables).forEach(([k, v]) => {
                initialCustom[k] = v != null ? String(v) : '';
            });
        }
        setCustomVariables(initialCustom);
        setIsAddModalOpen(true);
    };

    const resetForm = () => {
        setFormData({
            id: null,
            nomor_surat: '',
            tanggal_spmth: '',
            tahun_anggaran: availableYears.length > 0 ? String(availableYears[0].tahun_anggaran) : new Date().getFullYear().toString(),
            tahap: '1',
            penganggaran_id: availableYears.length > 0 ? availableYears[0].id : 0,
            pagu: 0,
            realisasi_lalu: 0,
            realisasi_ini: 0,
            sisa: 0
        });
        setCustomVariables({});
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
                            <IconTile tone="sky" size="sm">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </IconTile>
                            <div>
                                <p className="text-[11.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">SPMTH</p>
                                <p className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500">Surat Pernyataan Tanggung Jawab Mutlak (Hibah)</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="w-full sm:w-56">
                                <TextInput
                                    type="text"
                                    placeholder="Cari Nomor Surat..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <SpjTemplateSelector
                                docType="spmth"
                                templates={customTemplates}
                                selectedFormat={selectedFormat}
                                onChangeFormat={setSelectedFormat}
                                onOpenModal={() => setShowTemplateModal(true)}
                                canManage={canManageTemplates}
                                libreOfficeAvailable={libreOfficeAvailable}
                            />
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
                    title="Daftar SPMTH"
                    subtitle="Riwayat dokumen SPMTH per tahap dan tahun anggaran."
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
                                <th className="text-left">Nomor SPMTH</th>
                                <th className="text-left">Tanggal</th>
                                <th className="text-left">Tahap</th>
                                <th className="text-left">Tahun</th>
                                <th className="text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="p-0">
                                        <SkeletonRows rows={4} columns={5} />
                                    </td>
                                </tr>
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-0">
                                        <EmptyState
                                            className="border-0 bg-transparent py-9 dark:bg-transparent"
                                            icon={
                                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                </svg>
                                            }
                                            title="Tidak ada data SPMTH."
                                            description="Coba ubah kata kunci pencarian atau tambahkan data SPMTH baru."
                                        />
                                    </td>
                                </tr>
                            ) : (
                                data.map((item, index) => (
                                    <tr key={item.id}>
                                        <td className="text-sikas-num text-slate-400 dark:text-slate-500">{index + 1 + (page - 1) * 10}</td>
                                        <td className="whitespace-nowrap font-extrabold text-slate-900 dark:text-white">{item.nomor_surat}</td>
                                        <td className="whitespace-nowrap text-slate-500 dark:text-slate-400">{item.tanggal_spmth ? new Date(item.tanggal_spmth).toLocaleDateString('id-ID') : '-'}</td>
                                        <td className="whitespace-nowrap">
                                            <StatusBadge tone={item.tahap === '1' ? 'info' : 'violet'} dot={false}>{item.tahap}</StatusBadge>
                                        </td>
                                        <td className="whitespace-nowrap text-sikas-num font-bold text-slate-500 dark:text-slate-400">{item.penganggaran?.tahun_anggaran}</td>
                                        <td className="whitespace-nowrap">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => {
                                                        if (activeCustomTemplateId !== null) {
                                                            if (!libreOfficeAvailable) {
                                                                showToast('Preview PDF kustom memerlukan LibreOffice. Gunakan tombol DOCX.', 'error');
                                                                return;
                                                            }
                                                            setPreviewTitle(`Preview SPMTH (${activeCustomTemplate?.nama ?? 'Template Kustom'})`);
                                                            setSelectedPdfUrl(vroute('laporan.spmth.custom.preview', { id: item.id, template: activeCustomTemplateId }));
                                                            setPreviewCustomDownloadUrl(vroute('laporan.spmth.custom.pdf', { id: item.id, template: activeCustomTemplateId }));
                                                            setPreviewCustomDocxUrl(vroute('laporan.spmth.custom.docx', { id: item.id, template: activeCustomTemplateId }));
                                                            setIsPreviewModalOpen(true);
                                                            return;
                                                        }
                                                        setPreviewTitle('Preview SPMTH');
                                                        setPreviewCustomDownloadUrl(null);
                                                        setPreviewCustomDocxUrl(null);
                                                        setSelectedPdfUrl(vroute('laporan.spmth.pdf', item.id));
                                                        setIsPreviewModalOpen(true);
                                                    }}
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-100 bg-white text-sky-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:text-sky-700 dark:border-white/10 dark:bg-white/5 dark:text-sky-400 dark:hover:bg-white/10"
                                                    title={activeCustomTemplate ? `Preview PDF (${activeCustomTemplate.nama})` : 'Preview PDF'}
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                                </button>
                                                {activeCustomTemplateId !== null && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            window.open(
                                                                vroute('laporan.spmth.custom.docx', { id: item.id, template: activeCustomTemplateId }),
                                                                '_blank',
                                                                'noopener,noreferrer',
                                                            );
                                                        }}
                                                        className="inline-flex h-8 items-center justify-center rounded-xl border border-brand-200/80 bg-brand-50/70 px-2 text-[10px] font-extrabold text-brand-700 transition hover:bg-brand-100 dark:border-brand-400/25 dark:bg-brand-500/10 dark:text-brand-300"
                                                        title={`Unduh Word (.docx) — ${activeCustomTemplate?.nama ?? 'Template Kustom'}`}
                                                    >
                                                        DOCX
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => openEdit(item)}
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-100 bg-white text-brand-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:text-brand-700 dark:border-white/10 dark:bg-white/5 dark:text-brand-300 dark:hover:bg-white/10"
                                                    title="Edit"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-100 bg-white text-rose-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:text-rose-700 dark:border-white/10 dark:bg-white/5 dark:text-rose-400 dark:hover:bg-white/10"
                                                    title="Delete"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
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
                maxWidth="3xl"
                tall={hasCustomFormVars}
                title={formData.id ? 'Edit SPMTH' : 'Tambah SPMTH'}
                subtitle="Kelola Surat Pernyataan Tanggung Jawab Mutlak (Hibah)"
                isSaving={isSaving}
                onSubmit={handleSubmit}
            >
                <LaporanSectionCard
                    title="Informasi Surat"
                    tone="neutral"
                    headerAction={
                        <LaporanCalculateButton
                            onClick={handleCalculate}
                            isCalculating={isCalculating}
                            label="Hitung Pagu & Realisasi"
                        />
                    }
                >
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <InputLabel htmlFor="nomor_surat" value="Nomor SPMTH" required />
                            <TextInput
                                id="nomor_surat"
                                type="text"
                                className="w-full"
                                value={formData.nomor_surat}
                                onChange={(e) => setFormData({ ...formData, nomor_surat: e.target.value })}
                                required
                                placeholder="Contoh: 001/SPMTH/2024"
                            />
                        </div>

                        <div>
                            <InputLabel htmlFor="tanggal_spmth" value="Tanggal SPMTH" required />
                            <DatePicker
                                id="tanggal_spmth"
                                value={formData.tanggal_spmth}
                                onChange={(date) =>
                                    setFormData({
                                        ...formData,
                                        tanggal_spmth: date ? format(date, 'yyyy-MM-dd') : '',
                                    })
                                }
                                placeholder="Pilih tanggal SPMTH..."
                            />
                        </div>

                        <div>
                            <InputLabel htmlFor="spmth_tahun_anggaran" value="Tahun Anggaran" required />
                            <LaporanSelect
                                inputId="spmth_tahun_anggaran"
                                options={availableYears.map((year) => ({
                                    value: year.tahun_anggaran.toString(),
                                    label: year.tahun_anggaran.toString(),
                                }))}
                                value={formData.tahun_anggaran}
                                onChange={(val) => setFormData({ ...formData, tahun_anggaran: val })}
                                placeholder="Pilih Tahun Anggaran..."
                                isSearchable
                            />
                        </div>

                        <div>
                            <InputLabel htmlFor="spmth_tahap" value="Tahap" required />
                            <LaporanSelect
                                inputId="spmth_tahap"
                                options={[
                                    { value: '1', label: 'Tahap 1' },
                                    { value: '2', label: 'Tahap 2' },
                                ]}
                                value={formData.tahap}
                                onChange={(val) => setFormData({ ...formData, tahap: (val || '1') as '1' | '2' })}
                                isSearchable={false}
                            />
                        </div>
                    </div>
                </LaporanSectionCard>

                <LaporanSectionCard title="Rincian Anggaran" tone="violet">
                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                        <LaporanMetricCard
                            label="Pagu Anggaran"
                            value={formatCurrency(formData.pagu)}
                            tone="neutral"
                        />
                        <LaporanMetricCard
                            label="Realisasi Lalu"
                            value={formatCurrency(formData.realisasi_lalu)}
                            tone="neutral"
                        />
                        <LaporanMetricCard
                            label="Realisasi Ini"
                            value={formatCurrency(formData.realisasi_ini)}
                            tone="violet"
                        />
                        <LaporanMetricCard
                            label="Sisa Anggaran"
                            value={formatCurrency(formData.sisa)}
                            tone={formData.sisa < 0 ? 'rose' : 'mint'}
                        />
                    </div>
                </LaporanSectionCard>

                <LaporanCustomVariablesSection
                    docLabel="SPMTH"
                    templates={customTemplates}
                    activeTemplate={activeCustomTemplate}
                    values={customVariables}
                    onChange={setCustomVariables}
                />
            </LaporanFormModal>

            {/* Delete Confirmation Modal */}
            <LaporanDeleteModal
                show={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Hapus Data SPMTH"
                message="Apakah Anda yakin ingin menghapus data SPMTH ini? Tindakan ini tidak dapat dibatalkan."
            />

            {/* Preview Modal */}
            <LaporanPdfPreviewModal
                show={isPreviewModalOpen}
                onClose={() => setIsPreviewModalOpen(false)}
                previewId="spmth-pdf-preview"
                title={previewTitle}
                pdfUrl={selectedPdfUrl}
                onOpenPrintSettings={() => setIsPrintSettingsModalOpen(true)}
                customDownloadUrl={previewCustomDownloadUrl}
                customDocxUrl={previewCustomDocxUrl}
            />

            <SpjTemplateModal
                show={showTemplateModal}
                onClose={() => setShowTemplateModal(false)}
                docType="spmth"
                templates={customTemplates}
                variableCatalog={variableCatalog}
                libreOfficeAvailable={libreOfficeAvailable}
                canManage={canManageTemplates}
                onTemplatesChanged={fetchCustomTemplates}
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
                hint="Nomor SPMTH untuk tahap dan tahun anggaran ini sudah terdaftar dalam sistem. Mohon gunakan nomor yang berbeda atau periksa data yang sudah ada."
            />
        </div>
    );
}
