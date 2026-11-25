import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { PageProps } from '@/types';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import { useEffect, useMemo, useState } from 'react';
import PageHeader from '@/Components/ui/PageHeader';
import Surface from '@/Components/ui/Surface';
import DataTable from '@/Components/ui/DataTable';
import EmptyState from '@/Components/ui/EmptyState';
import IconTile from '@/Components/ui/IconTile';
import StatusBadge from '@/Components/ui/StatusBadge';
import ArkasYearSelect from '@/Components/Arkas/ArkasYearSelect';
import CopyYearModal from '@/Components/DataMaster/CopyYearModal';
import { Copy, Edit2, Plus, RefreshCw, Search, Trash2, Users, X } from 'lucide-react';

interface PtkItem {
    id: number;
    tahun: number;
    ptk_id: string | null;
    nuptk: string | null;
    nama: string;
    jenis_kelamin: string | null;
    jenis_ptk_arkas: number;
    jenis_label: string;
    formatted_uraian_arkas: string;
    masa_kerja_tahun: number;
    masa_kerja_bulan: number;
    pernah_sertifikasi: boolean;
    is_active: boolean;
    sumber: string;
}

interface PtkYearStats {
    total: number;
    guru: number;
    tendik: number;
    asn: number;
    active_honorer: number;
}

type CategoryFilter = 'honorer' | 'guru' | 'tendik' | 'all';

export default function Index({
    auth,
    ptks = [],
    selectedYear = new Date().getFullYear(),
    availableYears = [],
    statsPerYear = {},
}: PageProps<{
    ptks: PtkItem[];
    selectedYear?: number;
    availableYears?: string[];
    statsPerYear?: Record<string, PtkYearStats>;
}>) {
    const canWrite =
        auth?.permissions?.modules?.data_ptk === 'write' ||
        (!auth?.permissions?.modules?.data_ptk && !(auth?.user as any)?.is_kepala_sekolah);

    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('honorer');
    const [isSyncing, setIsSyncing] = useState(false);

    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<PtkItem | null>(null);
    const [isCopyYearModalOpen, setIsCopyYearModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<PtkItem | null>(null);

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
            map[yr] = statsPerYear[yr]?.active_honorer ?? 0;
        });
        return map;
    }, [resolvedYears, statsPerYear]);

    const sourceYearOptions = useMemo(
        () =>
            Object.entries(statsPerYear)
                .map(([year, st]) => ({ year, count: st?.total ?? 0 }))
                .sort((a, b) => Number(b.year) - Number(a.year)),
        [statsPerYear],
    );

    const currentYearStats = statsPerYear[String(selectedYear)] ?? {
        total: ptks.length,
        guru: ptks.filter((p) => p.is_active && p.jenis_ptk_arkas === 10).length,
        tendik: ptks.filter((p) => p.is_active && p.jenis_ptk_arkas === 11).length,
        asn: ptks.filter((p) => p.jenis_ptk_arkas === 90).length,
        active_honorer: ptks.filter((p) => p.is_active && (p.jenis_ptk_arkas === 10 || p.jenis_ptk_arkas === 11)).length,
    };

    const { data, setData, post, put, delete: destroy, processing, errors, reset, clearErrors } = useForm({
        tahun: selectedYear,
        nama: '',
        nuptk: '',
        jenis_ptk_arkas: 10,
        jenis_kelamin: '' as string,
        is_active: true,
    });

    const {
        data: copyData,
        setData: setCopyData,
        post: postCopy,
        processing: copyProcessing,
        errors: copyErrors,
        clearErrors: clearCopyErrors,
    } = useForm({
        source_year: '',
        target_year: String(selectedYear),
    });

    useEffect(() => {
        setData('tahun', selectedYear);
        setCopyData('target_year', String(selectedYear));
    }, [selectedYear]);

    const handleYearChange = (newYear: string) => {
        router.get(route('data-ptk.index'), { year: newYear }, { preserveScroll: true });
    };

    const handleSyncArkas = () => {
        setIsSyncing(true);
        router.post(
            route('data-ptk.sync-arkas'),
            { year: String(selectedYear) },
            {
                preserveScroll: true,
                onFinish: () => setIsSyncing(false),
            },
        );
    };

    const filteredData = useMemo(() => {
        const term = search.trim().toLowerCase();
        return ptks.filter((item) => {
            if (categoryFilter === 'honorer' && !(item.is_active && (item.jenis_ptk_arkas === 10 || item.jenis_ptk_arkas === 11))) {
                return false;
            }
            if (categoryFilter === 'guru' && !(item.is_active && item.jenis_ptk_arkas === 10)) {
                return false;
            }
            if (categoryFilter === 'tendik' && !(item.is_active && item.jenis_ptk_arkas === 11)) {
                return false;
            }

            if (!term) return true;
            return (
                item.nama.toLowerCase().includes(term) ||
                (item.nuptk && item.nuptk.toLowerCase().includes(term)) ||
                item.jenis_label.toLowerCase().includes(term)
            );
        });
    }, [ptks, categoryFilter, search]);

    const openAddModal = () => {
        clearErrors();
        setEditingItem(null);
        setData({
            tahun: selectedYear,
            nama: '',
            nuptk: '',
            jenis_ptk_arkas: 10,
            jenis_kelamin: '',
            is_active: true,
        });
        setIsFormModalOpen(true);
    };

    const openEditModal = (item: PtkItem) => {
        clearErrors();
        setEditingItem(item);
        setData({
            tahun: item.tahun,
            nama: item.nama,
            nuptk: item.nuptk || '',
            jenis_ptk_arkas: item.jenis_ptk_arkas,
            jenis_kelamin: item.jenis_kelamin || '',
            is_active: item.is_active,
        });
        setIsFormModalOpen(true);
    };

    const closeFormModal = () => {
        setIsFormModalOpen(false);
        setEditingItem(null);
        reset();
        setData('tahun', selectedYear);
        clearErrors();
    };

    const submitForm = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingItem) {
            put(route('data-ptk.update', editingItem.id), {
                preserveScroll: true,
                onSuccess: () => closeFormModal(),
            });
        } else {
            post(route('data-ptk.store'), {
                preserveScroll: true,
                onSuccess: () => closeFormModal(),
            });
        }
    };

    const submitCopyYear = (e: React.FormEvent) => {
        e.preventDefault();
        postCopy(route('data-ptk.copy-year'), {
            preserveScroll: true,
            onSuccess: () => {
                setIsCopyYearModalOpen(false);
                clearCopyErrors();
                if (copyData.target_year && copyData.target_year !== String(selectedYear)) {
                    router.get(route('data-ptk.index'), { year: copyData.target_year }, { preserveScroll: true });
                }
            },
        });
    };

    const confirmDelete = () => {
        if (!deleteTarget) return;
        destroy(route('data-ptk.destroy', deleteTarget.id), {
            preserveScroll: true,
            onSuccess: () => setDeleteTarget(null),
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title={`Data PTK (Guru & Tendik) ${selectedYear}`} />

            <div className="space-y-5">
                <PageHeader
                    breadcrumb={[{ label: 'Data Master' }, { label: 'Data PTK' }]}
                    title={`Data PTK (Guru & Tendik) — ${selectedYear}`}
                    subtitle="Daftar Guru & Tenaga Kependidikan per tahun anggaran untuk dropdown Uraian Arkas pada kegiatan pembayaran honor (07.12.*)."
                    badge={<StatusBadge tone="info" dot={false}>Tahun {selectedYear}</StatusBadge>}
                    actions={
                        canWrite ? (
                            <div className="flex flex-wrap items-center gap-2">
                                <SecondaryButton
                                    type="button"
                                    onClick={handleSyncArkas}
                                    disabled={isSyncing}
                                    className="inline-flex items-center gap-1.5"
                                >
                                    <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                                    {isSyncing ? 'Menyinkronkan...' : `Sync ARKAS ${selectedYear}`}
                                </SecondaryButton>
                                <SecondaryButton
                                    type="button"
                                    onClick={() => {
                                        clearCopyErrors();
                                        setCopyData('target_year', String(selectedYear));
                                        setIsCopyYearModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1.5"
                                >
                                    <Copy className="h-3.5 w-3.5" />
                                    Salin Tahun
                                </SecondaryButton>
                                <PrimaryButton
                                    type="button"
                                    onClick={openAddModal}
                                    className="inline-flex items-center gap-1.5"
                                >
                                    <Plus className="h-4 w-4" />
                                    Tambah PTK Manual
                                </PrimaryButton>
                            </div>
                        ) : undefined
                    }
                />

                {/* Filter & Year Selector Bar */}
                <Surface padding="sm" overflowVisible>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                            {(
                                [
                                    { key: 'honorer', label: `Honorer Aktif (${currentYearStats.active_honorer})` },
                                    { key: 'guru', label: `Guru / Pendidik (${currentYearStats.guru})` },
                                    { key: 'tendik', label: `Tendik (${currentYearStats.tendik})` },
                                    { key: 'all', label: `Semua termasuk ASN/Nonaktif (${currentYearStats.total})` },
                                ] as Array<{ key: CategoryFilter; label: string }>
                            ).map((tab) => (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => setCategoryFilter(tab.key)}
                                    className={`rounded-xl px-3 py-1.5 text-[11px] font-extrabold transition ${
                                        categoryFilter === tab.key
                                            ? 'bg-lime-400 text-slate-950 shadow-lime'
                                            : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5">
                            <div className="relative min-w-[220px] flex-1 sm:flex-initial">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Cari Nama atau NUPTK..."
                                    className="h-9 w-full rounded-xl border border-slate-200/90 bg-white pl-9 pr-3 text-[11.5px] font-semibold text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
                                />
                            </div>
                            <ArkasYearSelect
                                value={String(selectedYear)}
                                activeYears={resolvedYears}
                                localStatsPerYear={countPerYear}
                                includeAllOption={false}
                                onChange={handleYearChange}
                                className="w-44"
                            />
                        </div>
                    </div>
                </Surface>

                {/* Info note */}
                <div className="rounded-2xl border border-sky-200/80 bg-pastel-sky/50 px-4 py-3 text-[11.5px] font-semibold text-slate-700 dark:border-sky/20 dark:bg-sky/10 dark:text-slate-200">
                    Hanya PTK berkategori <strong>Guru / Pendidik (10)</strong> berstatus <strong>Aktif</strong> yang tampil di dropdown Uraian Arkas pada kegiatan <strong>07.12.01.</strong> + rekening <strong>5.1.02.02.01.0013</strong> (sesuai ARKAS Desktop; kegiatan 07.12.02.–07.12.04. menggunakan ketik manual dan PTK ASN/Kepsek dikecualikan). Data yang ditambah manual tidak akan tertimpa saat Sync ulang dari ARKAS.
                </div>

                {/* Data Table */}
                <DataTable
                    title={`Daftar PTK Tahun ${selectedYear}`}
                    subtitle={`Menampilkan ${filteredData.length} dari ${ptks.length} data tersimpan lokal.`}
                    icon={
                        <IconTile tone="violet" size="sm">
                            <Users className="h-4 w-4" />
                        </IconTile>
                    }
                    contentClassName="bento-table-wrapper mx-3 mb-3"
                >
                    {filteredData.length === 0 ? (
                        <div className="p-8">
                            <EmptyState
                                icon={<Users className="h-6 w-6" />}
                                title={`Belum ada data PTK pada filter ini (${selectedYear})`}
                                description={
                                    ptks.length === 0
                                        ? `Klik "Sync ARKAS ${selectedYear}" untuk menarik daftar guru/tendik dari arkas.db atau tambahkan secara manual.`
                                        : 'Coba ubah filter kategori atau kata kunci pencarian.'
                                }
                            />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr>
                                        <th className="w-12 text-left">No</th>
                                        <th className="w-44 text-left">NUPTK</th>
                                        <th className="text-left">Nama &amp; Format Uraian Arkas</th>
                                        <th className="w-44 text-left">Kategori</th>
                                        <th className="w-28 text-center">Sumber</th>
                                        <th className="w-28 text-center">Status</th>
                                        {canWrite && <th className="w-28 text-right">Aksi</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredData.map((item, idx) => (
                                        <tr key={item.id}>
                                            <td className="text-[11px] font-bold text-slate-400">{idx + 1}</td>
                                            <td className="font-mono text-[11.5px] font-semibold text-slate-600 dark:text-slate-300">
                                                {item.nuptk || <span className="text-slate-400">-</span>}
                                            </td>
                                            <td>
                                                <div className="text-[12px] font-extrabold text-slate-900 dark:text-white">
                                                    {item.nama}
                                                </div>
                                                <div className="mt-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                                    Uraian RKAS: <span className="font-semibold text-slate-600 dark:text-slate-300">{item.formatted_uraian_arkas}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <StatusBadge
                                                    tone={
                                                        item.jenis_ptk_arkas === 10
                                                            ? 'info'
                                                            : item.jenis_ptk_arkas === 11
                                                                ? 'warning'
                                                                : 'neutral'
                                                    }
                                                    dot={false}
                                                >
                                                    {item.jenis_label}
                                                </StatusBadge>
                                            </td>
                                            <td className="text-center">
                                                <StatusBadge
                                                    tone={item.sumber === 'arkas' ? 'success' : 'info'}
                                                    dot={false}
                                                >
                                                    {item.sumber === 'arkas' ? 'ARKAS' : 'Manual'}
                                                </StatusBadge>
                                            </td>
                                            <td className="text-center">
                                                <StatusBadge tone={item.is_active ? 'success' : 'danger'} dot={true}>
                                                    {item.is_active ? 'Aktif' : 'Nonaktif'}
                                                </StatusBadge>
                                            </td>
                                            {canWrite && (
                                                <td className="text-right">
                                                    <div className="inline-flex items-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => openEditModal(item)}
                                                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-lime-400 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-white"
                                                            title="Edit PTK"
                                                        >
                                                            <Edit2 className="h-3.5 w-3.5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setDeleteTarget(item)}
                                                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300"
                                                            title="Hapus PTK"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </DataTable>
            </div>

            {/* Modal Tambah / Edit PTK */}
            <Modal show={isFormModalOpen} onClose={() => !processing && closeFormModal()} maxWidth="md">
                <div className="relative overflow-hidden rounded-[26px] bg-white dark:bg-[#15131F]">
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-white/10">
                        <div className="flex items-center gap-3">
                            <IconTile tone="violet" size="md">
                                <Users className="h-4 w-4" />
                            </IconTile>
                            <div>
                                <h2 className="text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                    {editingItem ? 'Edit Data PTK' : `Tambah PTK Manual (${selectedYear})`}
                                </h2>
                                <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                    Data PTK aktif akan muncul di dropdown Uraian Arkas Honor RKAS Tahun {data.tahun}.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={closeFormModal}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <form onSubmit={submitForm}>
                        <div className="space-y-4 px-6 py-5">
                            <div>
                                <InputLabel htmlFor="ptk-nama" value="Nama Lengkap PTK" required />
                                <TextInput
                                    id="ptk-nama"
                                    type="text"
                                    value={data.nama}
                                    onChange={(e) => setData('nama', e.target.value)}
                                    className="mt-1.5 block w-full"
                                    placeholder="Contoh: HUSNI"
                                    required
                                />
                                <InputError message={errors.nama} className="mt-1" />
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <InputLabel htmlFor="ptk-nuptk" value="NUPTK (Opsional)" />
                                    <TextInput
                                        id="ptk-nuptk"
                                        type="text"
                                        value={data.nuptk}
                                        onChange={(e) => setData('nuptk', e.target.value.replace(/\s+/g, ''))}
                                        className="mt-1.5 block w-full font-mono"
                                        placeholder="16 digit NUPTK"
                                    />
                                    <InputError message={errors.nuptk} className="mt-1" />
                                </div>

                                <div>
                                    <InputLabel htmlFor="ptk-jk" value="Jenis Kelamin" />
                                    <select
                                        id="ptk-jk"
                                        value={data.jenis_kelamin}
                                        onChange={(e) => setData('jenis_kelamin', e.target.value)}
                                        className="mt-1.5 block h-[42px] w-full rounded-xl border border-slate-200/90 bg-white px-3 text-xs font-semibold text-slate-800 shadow-sm focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white"
                                    >
                                        <option value="" className="dark:bg-[#15131F]">- Pilih -</option>
                                        <option value="L" className="dark:bg-[#15131F]">Laki-laki</option>
                                        <option value="P" className="dark:bg-[#15131F]">Perempuan</option>
                                    </select>
                                    <InputError message={errors.jenis_kelamin} className="mt-1" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <InputLabel htmlFor="ptk-jenis" value="Kategori PTK" required />
                                    <select
                                        id="ptk-jenis"
                                        value={data.jenis_ptk_arkas}
                                        onChange={(e) => setData('jenis_ptk_arkas', Number(e.target.value))}
                                        className="mt-1.5 block h-[42px] w-full rounded-xl border border-slate-200/90 bg-white px-3 text-xs font-semibold text-slate-800 shadow-sm focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white"
                                    >
                                        <option value={10} className="dark:bg-[#15131F]">Guru / Pendidik (10)</option>
                                        <option value={11} className="dark:bg-[#15131F]">Tenaga Kependidikan (11)</option>
                                        <option value={90} className="dark:bg-[#15131F]">ASN / PNS / Kepsek (90)</option>
                                    </select>
                                    <InputError message={errors.jenis_ptk_arkas} className="mt-1" />
                                </div>

                                <div className="flex items-end pb-2">
                                    <label className="inline-flex cursor-pointer items-center gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                                        <input
                                            type="checkbox"
                                            checked={data.is_active}
                                            onChange={(e) => setData('is_active', e.target.checked)}
                                            className="h-4 w-4 rounded border-slate-300 text-lime-500 focus:ring-lime-400"
                                        />
                                        Status Aktif (tampil di dropdown)
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-6 py-4 dark:border-white/5 dark:bg-white/[0.02]">
                            <SecondaryButton type="button" onClick={closeFormModal} disabled={processing}>
                                Batal
                            </SecondaryButton>
                            <PrimaryButton type="submit" disabled={processing}>
                                {processing ? 'Menyimpan...' : editingItem ? 'Simpan Perubahan' : 'Simpan PTK'}
                            </PrimaryButton>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* Modal Salin Tahun */}
            <CopyYearModal
                show={isCopyYearModalOpen}
                onClose={() => {
                    setIsCopyYearModalOpen(false);
                    clearCopyErrors();
                }}
                title="Salin Data PTK Antar Tahun"
                itemLabel="PTK (Guru & Tendik)"
                sourceYear={copyData.source_year}
                targetYear={copyData.target_year}
                onChangeSourceYear={(yr) => setCopyData('source_year', yr)}
                onChangeTargetYear={(yr) => setCopyData('target_year', yr)}
                sourceYearOptions={sourceYearOptions}
                errors={copyErrors}
                processing={copyProcessing}
                onSubmit={submitCopyYear}
            />

            {/* Modal Konfirmasi Hapus */}
            <Modal show={Boolean(deleteTarget)} onClose={() => !processing && setDeleteTarget(null)} maxWidth="sm">
                <div className="p-6">
                    <h3 className="text-[15px] font-extrabold text-slate-900 dark:text-white">
                        Hapus Data PTK?
                    </h3>
                    <p className="mt-2 text-[12px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                        Anda akan menghapus <strong className="text-slate-800 dark:text-white">{deleteTarget?.nama}</strong> dari daftar PTK Tahun {deleteTarget?.tahun}. Data RKAS yang sudah tersimpan sebelumnya tidak akan berubah.
                    </p>
                    <div className="mt-5 flex justify-end gap-2">
                        <SecondaryButton type="button" onClick={() => setDeleteTarget(null)} disabled={processing}>
                            Batal
                        </SecondaryButton>
                        <DangerButton type="button" onClick={confirmDelete} disabled={processing}>
                            {processing ? 'Menghapus...' : 'Ya, Hapus'}
                        </DangerButton>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
