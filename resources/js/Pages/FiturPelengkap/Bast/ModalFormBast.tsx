import { useEffect, useMemo, useState } from 'react';
import Select from 'react-select';
import axios from 'axios';
import { format } from 'date-fns';
import { CalendarDays, FileText, Layers, Sparkles, User, UserCheck, X } from 'lucide-react';
import Modal from '@/Components/Modal';
import DatePicker from '@/Components/DatePicker';
import SearchableSelect from '@/Components/SearchableSelect';
import useVariantRoute from '@/Hooks/useVariantRoute';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import IconTile from '@/Components/ui/IconTile';
import StatusBadge from '@/Components/ui/StatusBadge';
import {
    resolveSpjCustomFormVariables,
    SpjCustomTemplate,
} from '@/Components/SpjCustomTemplate/types';
import { cn } from '@/lib/utils';
import { BAST_SELECT_CLASS_NAMES, SelectOption } from './bastModalTheme';

interface ModalFormBastProps {
    show: boolean;
    onClose: () => void;
    onSuccess: () => void;
    tahun: string;
    years: { tahun_anggaran: string; id: number }[];
    editData: any | null;
    customTemplates?: SpjCustomTemplate[];
    activeCustomTemplate?: SpjCustomTemplate | null;
}

const TEXTAREA_CLASS =
    'mt-1 block w-full rounded-2xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-[12px] font-semibold text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10';

const SECTION_CLASS =
    'rounded-[20px] border border-slate-200/80 bg-slate-50/75 p-4 dark:border-white/10 dark:bg-white/[0.03]';

const SECTION_TITLE_CLASS =
    'text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400';

const TAHAP_OPTIONS: SelectOption[] = [
    { value: '', label: 'Semua Tahap' },
    { value: 'Tahap 1', label: 'Tahap 1 (Januari - Juni)' },
    { value: 'Tahap 2', label: 'Tahap 2 (Juli - Desember)' },
];

export default function ModalFormBast({
    show,
    onClose,
    onSuccess,
    tahun,
    years,
    editData,
    customTemplates = [],
    activeCustomTemplate = null,
}: ModalFormBastProps) {
    const vroute = useVariantRoute();
    const [bkuOptions, setBkuOptions] = useState<any[]>([]);
    const [loadingBku, setLoadingBku] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [modalTahun, setModalTahun] = useState('');
    const [modalTahap, setModalTahap] = useState('');
    const [customVariables, setCustomVariables] = useState<Record<string, string>>({});

    const customFormVariables = useMemo(
        () => resolveSpjCustomFormVariables(customTemplates, activeCustomTemplate),
        [customTemplates, activeCustomTemplate],
    );

    const [data, setData] = useState({
        bku_id: '',
        nomor_bast: '',
        tanggal_bast: '',
        pihak_pertama_nama: '',
        pihak_pertama_jabatan: '',
        pihak_pertama_instansi: '',
        pihak_pertama_alamat: '',
        pihak_kedua_nama: '',
        pihak_kedua_jabatan: '',
        pihak_kedua_instansi: '',
        pihak_kedua_alamat: '',
    });

    useEffect(() => {
        if (show) {
            if (editData) {
                const bkuFk =
                    editData.kinerja_silpa_buku_kas_umum_id ||
                    editData.silpa_buku_kas_umum_id ||
                    editData.kinerja_buku_kas_umum_id ||
                    editData.buku_kas_umum_id;

                setData({
                    bku_id: bkuFk || '',
                    nomor_bast: editData.nomor_bast || '',
                    tanggal_bast: editData.tanggal_bast_raw || editData.tanggal || '',
                    pihak_pertama_nama: editData.pihak_pertama_nama || '',
                    pihak_pertama_jabatan: editData.pihak_pertama_jabatan || '',
                    pihak_pertama_instansi: editData.pihak_pertama_instansi || '',
                    pihak_pertama_alamat: editData.pihak_pertama_alamat || '',
                    pihak_kedua_nama: editData.pihak_kedua_nama || '',
                    pihak_kedua_jabatan: editData.pihak_kedua_jabatan || '',
                    pihak_kedua_instansi: editData.pihak_kedua_instansi || '',
                    pihak_kedua_alamat: editData.pihak_kedua_alamat || '',
                });
                const initialCustom: Record<string, string> = {};
                if (editData.custom_variables && typeof editData.custom_variables === 'object') {
                    Object.entries(editData.custom_variables).forEach(([k, v]) => {
                        initialCustom[k] = v != null ? String(v) : '';
                    });
                }
                setCustomVariables(initialCustom);
            } else {
                setData({
                    bku_id: '',
                    nomor_bast: '',
                    tanggal_bast: '',
                    pihak_pertama_nama: '',
                    pihak_pertama_jabatan: 'Pimpinan',
                    pihak_pertama_instansi: '',
                    pihak_pertama_alamat: '',
                    pihak_kedua_nama: '',
                    pihak_kedua_jabatan: 'Kepala Sekolah',
                    pihak_kedua_instansi: 'Sekolah',
                    pihak_kedua_alamat: '',
                });
                setCustomVariables({});
                if (tahun && !modalTahun) setModalTahun(tahun);
            }
        }
    }, [show, editData, tahun]);

    useEffect(() => {
        if (show && !editData && modalTahun) {
            fetchAvailableBku();
        }
    }, [show, editData, modalTahun, modalTahap]);

    const tahunOptions = useMemo<SelectOption[]>(() => {
        const base: SelectOption[] = [
            { value: '', label: 'Semua Tahun' },
            ...years.map((y) => ({
                value: String(y.tahun_anggaran),
                label: String(y.tahun_anggaran),
            })),
        ];

        if (modalTahun && !base.some((opt) => opt.value === String(modalTahun))) {
            base.splice(1, 0, { value: String(modalTahun), label: String(modalTahun) });
        }

        return base;
    }, [years, modalTahun]);

    const fetchAvailableBku = async () => {
        setLoadingBku(true);
        try {
            const res = await axios.get(vroute('api.bast.bku-available'), {
                params: { tahun: modalTahun, tahap: modalTahap },
            });
            if (res.data.success) {
                setBkuOptions(res.data.data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingBku(false);
        }
    };

    const handleBkuChange = (id: string | number) => {
        const selected = bkuOptions.find((b) => b.id == id);
        if (selected) {
            setData((prev) => ({
                ...prev,
                bku_id: id.toString(),
                tanggal_bast: selected.tanggal,
                pihak_pertama_nama: selected.pihak_pertama_nama,
                pihak_pertama_instansi: selected.pihak_pertama_instansi,
                pihak_pertama_alamat: selected.pihak_pertama_alamat,
                pihak_kedua_nama: selected.pihak_kedua_nama,
                pihak_kedua_instansi: selected.pihak_kedua_instansi,
                pihak_kedua_alamat: selected.pihak_kedua_alamat,
            }));
        } else {
            setData((prev) => ({ ...prev, bku_id: id.toString() }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        try {
            const bkuFk = vroute('bast.store').includes('kinerja-silpa')
                ? 'kinerja_silpa_buku_kas_umum_id'
                : vroute('bast.store').includes('silpa')
                  ? 'silpa_buku_kas_umum_id'
                  : vroute('bast.store').includes('kinerja')
                    ? 'kinerja_buku_kas_umum_id'
                    : 'buku_kas_umum_id';

            const payload = {
                ...data,
                [bkuFk]: data.bku_id,
                custom_variables: customVariables,
            };

            let res;
            if (editData) {
                res = await axios.put(vroute('bast.update', { id: editData.id }), payload);
            } else {
                res = await axios.post(vroute('bast.store'), payload);
            }

            if (res.data.success) {
                window.dispatchEvent(
                    new CustomEvent('toast-notification', {
                        detail: { message: res.data.message, type: 'success' },
                    }),
                );
                onSuccess();
                onClose();
            }
        } catch (error: any) {
            window.dispatchEvent(
                new CustomEvent('toast-notification', {
                    detail: {
                        message: error.response?.data?.message || 'Terjadi kesalahan',
                        type: 'error',
                    },
                }),
            );
        } finally {
            setProcessing(false);
        }
    };

    const isEditing = Boolean(editData);

    return (
        <Modal show={show} onClose={onClose} maxWidth="4xl">
            <div className="relative rounded-[26px] bg-white shadow-card-light dark:bg-[#15131F] dark:shadow-card-dark">
                <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]">
                    <div
                        className={cn(
                            'absolute -right-14 -top-20 h-56 w-56 rounded-full blur-3xl',
                            isEditing
                                ? 'bg-pastel-amber/75 dark:bg-amber-500/15'
                                : 'bg-pastel-lavender/75 dark:bg-brand-500/15',
                        )}
                    />
                    <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-lime-200/60 blur-3xl dark:bg-lime-400/10" />
                </div>

                <div className="relative">
                    {/* Header Neo-Bento */}
                    <div className="flex items-start justify-between gap-3 rounded-t-[26px] border-b border-slate-100 px-6 py-4 dark:border-white/10">
                        <div className="flex min-w-0 items-center gap-3.5">
                            <IconTile tone={isEditing ? 'amber' : 'violet'} size="md">
                                <FileText />
                            </IconTile>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-[15.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                        {isEditing ? 'Edit BAST' : 'Tambah BAST Baru'}
                                    </h2>
                                    <StatusBadge tone={isEditing ? 'warning' : 'lime'} dot={false}>
                                        {isEditing ? 'Edit Data' : 'Tambah Data'}
                                    </StatusBadge>
                                </div>
                                <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                    Lengkapi data berita acara serah terima barang beserta tanggal BAST.
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            disabled={processing}
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-white"
                            aria-label="Tutup"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="sikas-scroll max-h-[64vh] space-y-4 overflow-y-auto px-6 py-5">
                            {!isEditing && (
                                <div className={SECTION_CLASS}>
                                    <div className="mb-3.5 flex items-center gap-2">
                                        <Layers className="h-3.5 w-3.5 text-sky" />
                                        <p className={SECTION_TITLE_CLASS}>Transaksi BKU</p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div>
                                            <InputLabel htmlFor="bast-tahun" value="Tahun Anggaran" className="mb-1.5" />
                                            <Select<SelectOption, false>
                                                inputId="bast-tahun"
                                                unstyled
                                                isSearchable
                                                isClearable={false}
                                                menuPlacement="bottom"
                                                options={tahunOptions}
                                                value={
                                                    tahunOptions.find((opt) => opt.value === String(modalTahun)) ?? null
                                                }
                                                onChange={(opt) => setModalTahun(opt ? opt.value : '')}
                                                classNames={BAST_SELECT_CLASS_NAMES}
                                            />
                                        </div>
                                        <div>
                                            <InputLabel htmlFor="bast-tahap" value="Tahap" className="mb-1.5" />
                                            <Select<SelectOption, false>
                                                inputId="bast-tahap"
                                                unstyled
                                                isSearchable={false}
                                                isClearable={false}
                                                menuPlacement="bottom"
                                                options={TAHAP_OPTIONS}
                                                value={TAHAP_OPTIONS.find((opt) => opt.value === modalTahap) ?? null}
                                                onChange={(opt) => setModalTahap(opt ? opt.value : '')}
                                                classNames={BAST_SELECT_CLASS_NAMES}
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <InputLabel className="mb-1.5">
                                            Pilih Transaksi (BKU) <span className="text-rose-500">*</span>
                                        </InputLabel>
                                        <SearchableSelect
                                            value={data.bku_id}
                                            onChange={handleBkuChange}
                                            options={bkuOptions.map((b) => ({
                                                ...b,
                                                nominal_formatted: 'Rp ' + b.nominal.toLocaleString('id-ID'),
                                            }))}
                                            searchFields={['tanggal', 'uraian', 'nominal_formatted']}
                                            displayColumns={[
                                                { header: 'Tanggal', field: 'tanggal', width: 'w-24 flex-none' },
                                                { header: 'Anggaran', field: 'nominal_formatted', width: 'w-32 flex-none' },
                                                { header: 'Uraian BKU', field: 'uraian', width: 'flex-1' },
                                            ]}
                                            labelRenderer={(opt) =>
                                                `${opt.tanggal} - ${opt.nominal_formatted} - ${opt.uraian}`
                                            }
                                            placeholder="-- Cari Transaksi --"
                                        />
                                        {loadingBku && (
                                            <p className="mt-1.5 text-[10.5px] font-semibold text-slate-400 dark:text-slate-500">
                                                Memuat transaksi BKU...
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Identitas BAST */}
                            <div className={SECTION_CLASS}>
                                <div className="mb-3.5 flex items-center gap-2">
                                    <CalendarDays className="h-3.5 w-3.5 text-lime-600 dark:text-lime-400" />
                                    <p className={SECTION_TITLE_CLASS}>Identitas BAST</p>
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div>
                                        <InputLabel htmlFor="bast-nomor" value="Nomor BAST" className="mb-1.5" />
                                        <TextInput
                                            id="bast-nomor"
                                            type="text"
                                            value={data.nomor_bast}
                                            onChange={(e) => setData({ ...data, nomor_bast: e.target.value })}
                                            placeholder="Masukkan nomor (opsional)"
                                        />
                                    </div>
                                    <div>
                                        <InputLabel htmlFor="bast-tanggal" value="Tanggal BAST" className="mb-1.5" />
                                        <DatePicker
                                            id="bast-tanggal"
                                            value={data.tanggal_bast}
                                            onChange={(date) =>
                                                setData((prev) => ({
                                                    ...prev,
                                                    tanggal_bast: date ? format(date, 'yyyy-MM-dd') : '',
                                                }))
                                            }
                                            placeholder="Pilih tanggal BAST"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Pihak Pertama & Kedua */}
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className={SECTION_CLASS}>
                                    <div className="mb-3.5 flex items-center gap-2">
                                        <User className="h-3.5 w-3.5 text-brand-500 dark:text-brand-300" />
                                        <p className={SECTION_TITLE_CLASS}>Pihak Pertama (Yang Menyerahkan)</p>
                                    </div>

                                    <div className="space-y-3.5">
                                        <div>
                                            <InputLabel>Nama / Pimpinan</InputLabel>
                                            <TextInput
                                                type="text"
                                                value={data.pihak_pertama_nama}
                                                onChange={(e) => setData({ ...data, pihak_pertama_nama: e.target.value })}
                                                className="mt-1.5"
                                            />
                                        </div>
                                        <div>
                                            <InputLabel>Jabatan</InputLabel>
                                            <TextInput
                                                type="text"
                                                value={data.pihak_pertama_jabatan}
                                                onChange={(e) =>
                                                    setData({ ...data, pihak_pertama_jabatan: e.target.value })
                                                }
                                                className="mt-1.5"
                                            />
                                        </div>
                                        <div>
                                            <InputLabel>Instansi / Toko</InputLabel>
                                            <TextInput
                                                type="text"
                                                value={data.pihak_pertama_instansi}
                                                onChange={(e) =>
                                                    setData({ ...data, pihak_pertama_instansi: e.target.value })
                                                }
                                                className="mt-1.5"
                                            />
                                        </div>
                                        <div>
                                            <InputLabel>Alamat</InputLabel>
                                            <textarea
                                                className={TEXTAREA_CLASS}
                                                rows={2}
                                                value={data.pihak_pertama_alamat}
                                                onChange={(e) =>
                                                    setData({ ...data, pihak_pertama_alamat: e.target.value })
                                                }
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className={SECTION_CLASS}>
                                    <div className="mb-3.5 flex items-center gap-2">
                                        <UserCheck className="h-3.5 w-3.5 text-mint" />
                                        <p className={SECTION_TITLE_CLASS}>Pihak Kedua (Yang Menerima)</p>
                                    </div>

                                    <div className="space-y-3.5">
                                        <div>
                                            <InputLabel>Nama</InputLabel>
                                            <TextInput
                                                type="text"
                                                value={data.pihak_kedua_nama}
                                                onChange={(e) => setData({ ...data, pihak_kedua_nama: e.target.value })}
                                                className="mt-1.5"
                                            />
                                        </div>
                                        <div>
                                            <InputLabel>Jabatan</InputLabel>
                                            <TextInput
                                                type="text"
                                                value={data.pihak_kedua_jabatan}
                                                onChange={(e) => setData({ ...data, pihak_kedua_jabatan: e.target.value })}
                                                className="mt-1.5"
                                            />
                                        </div>
                                        <div>
                                            <InputLabel>Instansi / Sekolah</InputLabel>
                                            <TextInput
                                                type="text"
                                                value={data.pihak_kedua_instansi}
                                                onChange={(e) =>
                                                    setData({ ...data, pihak_kedua_instansi: e.target.value })
                                                }
                                                className="mt-1.5"
                                            />
                                        </div>
                                        <div>
                                            <InputLabel>Alamat</InputLabel>
                                            <textarea
                                                className={TEXTAREA_CLASS}
                                                rows={2}
                                                value={data.pihak_kedua_alamat}
                                                onChange={(e) => setData({ ...data, pihak_kedua_alamat: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {customFormVariables.length > 0 && (
                                <div className={SECTION_CLASS}>
                                    <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="h-3.5 w-3.5 text-brand-500 dark:text-brand-300" />
                                            <div>
                                                <p className={SECTION_TITLE_CLASS}>
                                                    Variabel Tambahan (Template Kustom)
                                                </p>
                                                <p className="mt-0.5 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                                                    {activeCustomTemplate
                                                        ? `Kolom otomatis dari tag kustom pada template "${activeCustomTemplate.nama}".`
                                                        : 'Kolom otomatis dari tag kustom yang terdeteksi pada template BAST Anda.'}
                                                </p>
                                            </div>
                                        </div>
                                        <StatusBadge tone="info" dot={false}>
                                            {customFormVariables.length} tag kustom
                                        </StatusBadge>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        {customFormVariables.map((field) => (
                                            <div
                                                key={field.key}
                                                className={field.isLongText ? 'md:col-span-2' : ''}
                                            >
                                                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1.5">
                                                    <InputLabel value={field.label} />
                                                    <div className="flex items-center gap-1.5">
                                                        {!activeCustomTemplate && field.templateNames.length > 0 && (
                                                            <span className="truncate text-[9.5px] font-semibold text-slate-400 dark:text-slate-500">
                                                                {field.templateNames.join(', ')}
                                                            </span>
                                                        )}
                                                        <code className="rounded-md border border-brand-200/70 bg-brand-50/70 px-1.5 py-0.5 font-mono text-[10px] font-bold text-brand-700 dark:border-brand-400/20 dark:bg-brand-500/10 dark:text-brand-300">
                                                            {field.tag}
                                                        </code>
                                                    </div>
                                                </div>

                                                {field.isLongText ? (
                                                    <textarea
                                                        className={TEXTAREA_CLASS}
                                                        rows={2}
                                                        placeholder={`Masukkan ${field.label.toLowerCase()}...`}
                                                        value={customVariables[field.key] ?? ''}
                                                        onChange={(e) =>
                                                            setCustomVariables((prev) => ({
                                                                ...prev,
                                                                [field.key]: e.target.value,
                                                            }))
                                                        }
                                                    />
                                                ) : (
                                                    <TextInput
                                                        type="text"
                                                        placeholder={`Masukkan ${field.label.toLowerCase()}...`}
                                                        value={customVariables[field.key] ?? ''}
                                                        onChange={(e) =>
                                                            setCustomVariables((prev) => ({
                                                                ...prev,
                                                                [field.key]: e.target.value,
                                                            }))
                                                        }
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-2.5 rounded-b-[26px] border-t border-slate-100 bg-slate-50/70 px-6 py-4 dark:border-white/5 dark:bg-white/[0.02]">
                            <SecondaryButton type="button" onClick={onClose} disabled={processing}>
                                Batal
                            </SecondaryButton>
                            <PrimaryButton type="submit" disabled={processing || (!isEditing && !data.bku_id)}>
                                {processing ? 'Menyimpan...' : 'Simpan BAST'}
                            </PrimaryButton>
                        </div>
                    </form>
                </div>
            </div>
        </Modal>
    );
}
