import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import { FormEventHandler, useState, useEffect } from 'react';
import DangerButton from '@/Components/DangerButton';
import KopSuratBuilder from './Partials/KopSuratBuilder';
import SekolahModals from './Partials/SekolahModals';
import { Building2, Sparkles, Image as ImageIcon, FileText } from 'lucide-react';
import PageHeader from '@/Components/ui/PageHeader';
import Surface from '@/Components/ui/Surface';
import PillTabs from '@/Components/ui/PillTabs';
import IconTile from '@/Components/ui/IconTile';
import StatusBadge from '@/Components/ui/StatusBadge';
import EmptyState from '@/Components/ui/EmptyState';

interface Sekolah {
    id: number;
    nama_sekolah: string;
    npsn: string;
    status_sekolah: string;
    jenjang_sekolah: string;
    kelurahan_desa: string;
    kecamatan: string;
    kabupaten_kota: string;
    provinsi: string;
    alamat: string;
    kop_surat?: string;
    logo_daerah?: string;
    logo_sekolah?: string;
    kop_mode?: string;
    kop_border?: 'double' | 'single' | 'none';
    kop_teks_html?: string;
    kop_jenis?: string;
    website_sync_url?: string;
    website_sync_token?: string;
}

export default function Index({ auth, sekolah, licensedNpsn }: PageProps<{ sekolah?: Sekolah; licensedNpsn?: string }>) {
    const [activeTab, setActiveTab] = useState<'profil' | 'kop'>('profil');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [isDeleteKopOpen, setIsDeleteKopOpen] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [kopImageError, setKopImageError] = useState(false);

    useEffect(() => {
        setKopImageError(false);
    }, [sekolah?.kop_surat]);

    // Form for Data Sekolah
    const { data, setData, post, put, processing, errors, reset } = useForm({
        nama_sekolah: '',
        npsn: sekolah?.npsn || licensedNpsn || '',
        status_sekolah: '',
        jenjang_sekolah: '',
        kelurahan_desa: '',
        kecamatan: '',
        kabupaten_kota: '',
        provinsi: '',
        alamat: '',
    });

    // Form for Kop Surat
    const {
        data: kopData,
        setData: setKopData,
        post: postKop,
        delete: deleteKop,
        processing: kopProcessing,
        errors: kopErrors,
        reset: resetKop,
    } = useForm({
        kop_surat: null as File | null,
    });

    useEffect(() => {
        if (sekolah) {
            setData({
                nama_sekolah: sekolah.nama_sekolah,
                npsn: sekolah.npsn,
                status_sekolah: sekolah.status_sekolah,
                jenjang_sekolah: sekolah.jenjang_sekolah,
                kelurahan_desa: sekolah.kelurahan_desa,
                kecamatan: sekolah.kecamatan,
                kabupaten_kota: sekolah.kabupaten_kota,
                provinsi: sekolah.provinsi,
                alamat: sekolah.alamat,
            });
        } else if (licensedNpsn) {
            setData('npsn', licensedNpsn);
        }
    }, [sekolah, licensedNpsn]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (sekolah) {
            put(route('sekolah-profile.update', sekolah.id), {
                onSuccess: () => setIsModalOpen(false),
            });
        } else {
            post(route('sekolah-profile.store'), {
                onSuccess: () => setIsModalOpen(false),
            });
        }
    };

    const submitKop: FormEventHandler = (e) => {
        e.preventDefault();
        if (sekolah) {
            postKop(route('sekolah-profile.upload-kop', sekolah.id), {
                onSuccess: () => {
                    resetKop();
                    setIsUploadOpen(false);
                },
            });
        }
    };

    const handleDeleteKop = () => {
        setIsDeleteKopOpen(true);
    };

    const confirmDeleteKop = () => {
        if (sekolah) {
            deleteKop(route('sekolah-profile.delete-kop', sekolah.id), {
                onSuccess: () => setIsDeleteKopOpen(false),
            });
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="Profil Sekolah" />

            <div className="space-y-4">
                <PageHeader
                    className="animate-rise"
                    breadcrumb={[
                        { label: 'Dashboard' },
                        { label: 'Data Master' },
                        { label: 'Profil Sekolah' },
                    ]}
                    title="Profil Sekolah"
                    badge={<StatusBadge tone="violet" dot={false}>Data Master</StatusBadge>}
                    subtitle="Identitas satuan pendidikan dan pengaturan kop surat resmi."
                    actions={
                        <PrimaryButton onClick={() => setIsModalOpen(true)}>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                {sekolah ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                )}
                            </svg>
                            {sekolah ? 'Update Data' : 'Input Data'}
                        </PrimaryButton>
                    }
                />

                {/* Tab navigasi */}
                <div className="animate-rise" style={{ animationDelay: '60ms' }}>
                    <Surface padding="sm">
                        <PillTabs
                            ariaLabel="Tab profil sekolah"
                            variant="soft"
                            value={activeTab}
                            items={[
                                {
                                    key: 'profil',
                                    label: (
                                        <span className="flex items-center gap-1.5">
                                            <Building2 className="h-4 w-4" />
                                            Profil & Data Sekolah
                                        </span>
                                    ),
                                },
                                {
                                    key: 'kop',
                                    label: (
                                        <span className="flex items-center gap-1.5">
                                            <Sparkles className="h-4 w-4 text-amber-500" />
                                            Pengaturan Kop Surat
                                        </span>
                                    ),
                                    badge: (
                                        <span className="ml-1.5 rounded-full bg-brand-500/10 px-2 py-0.5 text-[9px] font-extrabold text-brand-600 dark:text-brand-300">
                                            Tiptap Builder
                                        </span>
                                    ),
                                },
                            ]}
                            onChange={(key) => setActiveTab(key as 'profil' | 'kop')}
                        />
                    </Surface>
                </div>

                {activeTab === 'profil' && (
                    <div className="space-y-4">
                        {/* Kartu ringkas identitas */}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div className="sikas-card sikas-card-hover animate-rise p-4" style={{ animationDelay: '110ms' }}>
                                <div className="flex items-center gap-2.5">
                                    <IconTile tone="sky" size="md">
                                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                        </svg>
                                    </IconTile>
                                    <div className="min-w-0">
                                        <p className="text-[11.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">NPSN</p>
                                        <p className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500">Nomor Pokok Sekolah</p>
                                    </div>
                                </div>
                                <p className="mt-3 truncate font-mono text-[17px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                    {sekolah?.npsn || '-'}
                                </p>
                            </div>

                            <div className="sikas-card sikas-card-hover animate-rise p-4" style={{ animationDelay: '160ms' }}>
                                <div className="flex items-center gap-2.5">
                                    <IconTile tone="mint" size="md">
                                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </IconTile>
                                    <div className="min-w-0">
                                        <p className="text-[11.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">Status Sekolah</p>
                                        <p className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500">Negeri / Swasta</p>
                                    </div>
                                </div>
                                <div className="mt-3">
                                    {sekolah?.status_sekolah ? (
                                        <StatusBadge tone={sekolah.status_sekolah === 'Negeri' ? 'success' : 'warning'}>
                                            {sekolah.status_sekolah}
                                        </StatusBadge>
                                    ) : (
                                        <span className="text-[17px] font-extrabold text-slate-900 dark:text-white">-</span>
                                    )}
                                </div>
                            </div>

                            <div className="sikas-card sikas-card-hover animate-rise p-4" style={{ animationDelay: '210ms' }}>
                                <div className="flex items-center gap-2.5">
                                    <IconTile tone="violet" size="md">
                                        <Building2 className="h-5 w-5" />
                                    </IconTile>
                                    <div className="min-w-0">
                                        <p className="text-[11.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">Jenjang</p>
                                        <p className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500">Jenjang pendidikan</p>
                                    </div>
                                </div>
                                <p className="mt-3 truncate text-[17px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                    {sekolah?.jenjang_sekolah || '-'}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                            {/* Kolom kiri: Informasi Sekolah */}
                            <div className="lg:col-span-2">
                                <Surface
                                    className="h-full"
                                    title="Informasi Sekolah"
                                    subtitle="Kelola data identitas satuan pendidikan Anda."
                                    icon={
                                        <IconTile tone="violet" size="md">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                            </svg>
                                        </IconTile>
                                    }
                                    actions={
                                        <PrimaryButton onClick={() => setIsModalOpen(true)}>
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                {sekolah ? (
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                ) : (
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                )}
                                            </svg>
                                            {sekolah ? 'Update Data' : 'Input Data'}
                                        </PrimaryButton>
                                    }
                                >
                                    {sekolah ? (
                                        <dl className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
                                            <div className="border-b border-slate-100 pb-3 dark:border-white/5">
                                                <dt className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Nama Sekolah</dt>
                                                <dd className="text-[15px] font-extrabold text-slate-900 dark:text-white">{sekolah.nama_sekolah}</dd>
                                            </div>
                                            <div className="border-b border-slate-100 pb-3 dark:border-white/5">
                                                <dt className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">NPSN</dt>
                                                <dd className="inline-block rounded-lg bg-slate-50 px-2 py-1 font-mono text-[15px] font-extrabold text-slate-900 dark:bg-white/5 dark:text-white">{sekolah.npsn}</dd>
                                            </div>

                                            <div className="border-b border-slate-100 pb-3 dark:border-white/5">
                                                <dt className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Status</dt>
                                                <dd className="text-[13px] text-slate-900 dark:text-slate-200">
                                                    <StatusBadge tone={sekolah.status_sekolah === 'Negeri' ? 'success' : 'warning'}>
                                                        {sekolah.status_sekolah}
                                                    </StatusBadge>
                                                </dd>
                                            </div>
                                            <div className="border-b border-slate-100 pb-3 dark:border-white/5">
                                                <dt className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Jenjang</dt>
                                                <dd className="text-[13px] font-semibold text-slate-900 dark:text-slate-200">{sekolah.jenjang_sekolah}</dd>
                                            </div>

                                            <div className="mt-2 md:col-span-2">
                                                <h4 className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-brand-600 dark:text-brand-300">Situsasi Wilayah</h4>
                                                <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 sm:grid-cols-2 dark:border-white/5 dark:bg-white/[0.02]">
                                                    <div>
                                                        <dt className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">Provinsi</dt>
                                                        <dd className="text-[12px] font-semibold text-slate-800 dark:text-slate-200">{sekolah.provinsi}</dd>
                                                    </div>
                                                    <div>
                                                        <dt className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">Kabupaten/Kota</dt>
                                                        <dd className="text-[12px] font-semibold text-slate-800 dark:text-slate-200">{sekolah.kabupaten_kota}</dd>
                                                    </div>
                                                    <div>
                                                        <dt className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">Kecamatan</dt>
                                                        <dd className="text-[12px] font-semibold text-slate-800 dark:text-slate-200">{sekolah.kecamatan}</dd>
                                                    </div>
                                                    <div>
                                                        <dt className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">Kelurahan/Desa</dt>
                                                        <dd className="text-[12px] font-semibold text-slate-800 dark:text-slate-200">{sekolah.kelurahan_desa}</dd>
                                                    </div>
                                                    <div className="mt-2 border-t border-slate-100 pt-3 sm:col-span-2 dark:border-white/5">
                                                        <dt className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">Alamat Lengkap</dt>
                                                        <dd className="mt-1 text-[12px] font-semibold text-slate-800 dark:text-slate-200">{sekolah.alamat}</dd>
                                                    </div>
                                                </div>
                                            </div>
                                        </dl>
                                    ) : (
                                        <EmptyState
                                            className="border-0 bg-transparent py-12 dark:bg-transparent"
                                            icon={<Building2 className="h-6 w-6" />}
                                            title="Data Sekolah Belum Lengkap"
                                            description="Silakan lengkapi data profil sekolah untuk memulai menggunakan aplikasi SIKAS."
                                            action={
                                                <PrimaryButton onClick={() => setIsModalOpen(true)}>
                                                    Update Data Sekarang
                                                </PrimaryButton>
                                            }
                                        />
                                    )}
                                </Surface>
                            </div>

                            {/* Kolom kanan: Kop Surat */}
                            <div className="animate-rise" style={{ animationDelay: '160ms' }}>
                                <Surface
                                    className="flex h-full flex-col"
                                    title="Kop Sekolah"
                                    subtitle="Pratinjau dan pengaturan kop surat."
                                    icon={
                                        <IconTile tone="rose" size="md">
                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </IconTile>
                                    }
                                >
                                    {sekolah?.kop_surat && !kopImageError ? (
                                        <div className="flex flex-1 flex-col gap-4">
                                            <div className="group relative flex min-h-[200px] flex-1 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-2 dark:border-white/10 dark:bg-white/[0.02]" onClick={() => setIsPreviewOpen(true)}>
                                                <img
                                                    src={`/storage/${sekolah.kop_surat.replace('public/', '')}`}
                                                    alt="Kop Surat"
                                                    className="h-auto w-full rounded-xl shadow-sm transition-transform duration-300 group-hover:scale-105"
                                                    onError={() => setKopImageError(true)}
                                                />
                                                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                                                    <svg className="mb-2 h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                    </svg>
                                                    <span className="text-[12px] font-extrabold text-white">Klik untuk Perbesar</span>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <PrimaryButton
                                                    onClick={() => setActiveTab('kop')}
                                                    className="w-full justify-center text-[11px]"
                                                >
                                                    <Sparkles className="w-4 h-4" />
                                                    Buka Editor Kop (Tiptap)
                                                </PrimaryButton>
                                                <div className="flex gap-2">
                                                    <SecondaryButton
                                                        onClick={() => setIsUploadOpen(true)}
                                                        className="flex-1 justify-center text-[11px]"
                                                    >
                                                        <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                        </svg>
                                                        Upload Gambar
                                                    </SecondaryButton>
                                                    <DangerButton onClick={handleDeleteKop} className="px-3">
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </DangerButton>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-1 flex-col">
                                            <EmptyState
                                                className="flex-1 py-8"
                                                icon={
                                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                }
                                                title="Kop Surat Belum Ada"
                                                description={
                                                    <>
                                                        <span className="block">Format: .jpg, .jpeg, .png (Maks. 2MB)</span>
                                                        <span className="mt-1 block font-bold text-brand-600 dark:text-brand-300">Disarankan: Lebar 2480 px &amp; Tinggi 588 px</span>
                                                    </>
                                                }
                                                action={
                                                    <div className="w-full max-w-xs space-y-2">
                                                        <PrimaryButton
                                                            onClick={() => setActiveTab('kop')}
                                                            disabled={!sekolah}
                                                            className="w-full justify-center text-[11px]"
                                                        >
                                                            <Sparkles className="w-4 h-4" />
                                                            Desain Kop Sendiri (Tiptap)
                                                        </PrimaryButton>

                                                        <SecondaryButton
                                                            onClick={() => setIsUploadOpen(true)}
                                                            disabled={!sekolah}
                                                            className="w-full justify-center text-[11px]"
                                                        >
                                                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                            </svg>
                                                            Upload Gambar Jadi
                                                        </SecondaryButton>

                                                        {!sekolah && <p className="mt-2 rounded-lg bg-rose-50 px-2 py-1 text-[10.5px] font-semibold text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">Input data sekolah dulu!</p>}
                                                    </div>
                                                }
                                            />
                                        </div>
                                    )}
                                </Surface>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: PENGATURAN KOP SURAT (TIPTAP BUILDER) */}
                {activeTab === 'kop' && (
                    <div className="animate-rise">
                        {sekolah ? (
                            <KopSuratBuilder sekolah={sekolah} />
                        ) : (
                            <EmptyState
                                className="py-12"
                                icon={<Building2 className="h-6 w-6" />}
                                title="Data Profil Sekolah Belum Lengkap"
                                description={'Silakan lengkapi identitas profil sekolah terlebih dahulu pada tab "Profil & Data Sekolah" sebelum menyusun kop surat resmi.'}
                                action={
                                    <PrimaryButton
                                        onClick={() => {
                                            setActiveTab('profil');
                                            setIsModalOpen(true);
                                        }}
                                    >
                                        Lengkapi Profil Sekolah
                                    </PrimaryButton>
                                }
                            />
                        )}
                    </div>
                )}
            </div>

            <SekolahModals
                sekolah={sekolah}
                licensedNpsn={licensedNpsn}
                isModalOpen={isModalOpen}
                onCloseModal={() => setIsModalOpen(false)}
                data={data}
                setData={setData}
                errors={errors}
                processing={processing}
                onSubmit={submit}
                isUploadOpen={isUploadOpen}
                onCloseUpload={() => setIsUploadOpen(false)}
                kopFile={kopData.kop_surat}
                onChangeKopFile={(file) => setKopData('kop_surat', file)}
                kopErrors={kopErrors}
                kopProcessing={kopProcessing}
                onSubmitKop={submitKop}
                isDeleteKopOpen={isDeleteKopOpen}
                onCloseDeleteKop={() => setIsDeleteKopOpen(false)}
                onConfirmDeleteKop={confirmDeleteKop}
                isPreviewOpen={isPreviewOpen}
                onClosePreview={() => setIsPreviewOpen(false)}
            />
        </AuthenticatedLayout>
    );
}
