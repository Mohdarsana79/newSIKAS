import IconTile from '@/Components/ui/IconTile';
import Surface from '@/Components/ui/Surface';
import {
    Download,
    Eye,
    EyeOff,
    FileImage,
    Image as ImageIcon,
    Palette,
    RotateCcw,
    Save,
    Sliders,
    Sparkles,
    Trash2,
    Type,
    Upload,
} from 'lucide-react';
import { useRef, useState } from 'react';
import type {
    SpjBundleConfig,
    SpjCoverConfig,
    SpjCoverLayoutCategory,
    SpjPhotoBlend,
    SpjPhotoFocus,
} from '../../types';
import { CoverLayoutThumbnailSvg } from './CoverAssets';
import {
    COVER_LAYOUT_LIST,
    COVER_PALETTE_LIST,
    resolveCoverPalette,
} from './coverThemes';

interface CoverControlPanelProps {
    config: SpjCoverConfig;
    bundleConfig: SpjBundleConfig;
    schoolPhotoUri: string | null;
    canWrite: boolean;
    isSavingPreset: boolean;
    isUploadingPhoto: boolean;
    isExportingCover: boolean;
    onChangeConfig: (patch: Partial<SpjCoverConfig>) => void;
    onChangeBundleConfig: (patch: Partial<SpjBundleConfig>) => void;
    onUploadPhoto: (file: File) => void;
    onDeletePhoto: () => void;
    onSavePreset: () => void;
    onResetCover: () => void;
    onDownloadCoverPdf: () => void;
    onDownloadCoverPng: () => void;
}

const RESMI_COUNT = COVER_LAYOUT_LIST.filter((l) => l.category === 'resmi').length;
const EKSEKUTIF_COUNT = COVER_LAYOUT_LIST.filter((l) => l.category === 'eksekutif').length;

const LAYOUT_CATEGORY_FILTERS: Array<{
    key: 'all' | SpjCoverLayoutCategory;
    label: string;
}> = [
    { key: 'all', label: `Semua (${COVER_LAYOUT_LIST.length})` },
    { key: 'resmi', label: `Resmi & Instansi (${RESMI_COUNT})` },
    { key: 'eksekutif', label: `Eksekutif & Kreatif (${EKSEKUTIF_COUNT})` },
];

const PHOTO_FOCUS_OPTIONS: Array<{ key: SpjPhotoFocus; label: string }> = [
    { key: 'top', label: 'Atas' },
    { key: 'center', label: 'Tengah' },
    { key: 'bottom', label: 'Bawah' },
];

const PHOTO_BLEND_OPTIONS: Array<{ key: SpjPhotoBlend; label: string }> = [
    { key: 'vivid', label: 'Jernih' },
    { key: 'balanced', label: 'Seimbang' },
    { key: 'soft', label: 'Lembut' },
];

export default function CoverControlPanel({
    config,
    bundleConfig,
    schoolPhotoUri,
    canWrite,
    isSavingPreset,
    isUploadingPhoto,
    isExportingCover,
    onChangeConfig,
    onChangeBundleConfig,
    onUploadPhoto,
    onDeletePhoto,
    onSavePreset,
    onResetCover,
    onDownloadCoverPdf,
    onDownloadCoverPng,
}: CoverControlPanelProps) {
    const photoInputRef = useRef<HTMLInputElement>(null);
    const [layoutFilter, setLayoutFilter] = useState<'all' | SpjCoverLayoutCategory>('all');
    const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);

    const activePalette = resolveCoverPalette(config);
    const showFotoSekolah = config.show_foto_sekolah ?? true;

    const filteredLayouts =
        layoutFilter === 'all'
            ? COVER_LAYOUT_LIST
            : COVER_LAYOUT_LIST.filter((item) => item.category === layoutFilter);

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onUploadPhoto(file);
        }
        e.target.value = '';
    };

    const handleDropPhoto = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDraggingPhoto(false);
        if (!canWrite || isUploadingPhoto) return;
        const file = e.dataTransfer.files?.[0];
        if (file && /^image\/(jpeg|png|webp)$/i.test(file.type)) {
            onUploadPhoto(file);
        }
    };

    const labelClass = 'mb-1 block text-[11px] font-bold text-slate-600 dark:text-slate-300';
    const inputClass =
        'w-full rounded-xl border border-slate-200/90 bg-slate-50/90 px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:ring-brand-500/30 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-lime-400/60 dark:focus:ring-lime-400/20';
    const checkboxClass =
        'h-4 w-4 rounded border-slate-300 bg-white text-brand-600 focus:ring-brand-500/40 focus:ring-offset-0 dark:border-white/20 dark:bg-white/[0.06] dark:text-brand-500 dark:focus:ring-brand-400/50';

    return (
        <div className="space-y-4">
            {/* 1. Galeri Visual 10 Preset Layout Cover */}
            <Surface
                padding="md"
                title="1. Galeri Layout Cover Modern (10 Tema)"
                subtitle="Pilih komposisi sampul bendel SPJ — otomatis menyelaraskan Pembatas Bab"
                icon={
                    <IconTile tone="violet" size="sm">
                        <Sparkles />
                    </IconTile>
                }
            >
                {/* Filter Kategori */}
                <div className="mb-3 flex flex-wrap items-center gap-1.5">
                    {LAYOUT_CATEGORY_FILTERS.map((tab) => {
                        const active = layoutFilter === tab.key;
                        return (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setLayoutFilter(tab.key)}
                                className={`rounded-lg px-2.5 py-1 text-[11px] font-extrabold transition ${
                                    active
                                        ? 'bg-slate-900 text-lime-300 dark:bg-lime-400 dark:text-slate-950'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/[0.1]'
                                }`}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {filteredLayouts.map((item) => {
                        const active = config.layout === item.key;
                        return (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() => onChangeConfig({ layout: item.key })}
                                className={`group flex items-start gap-2.5 rounded-xl border p-2.5 text-left transition-all ${
                                    active
                                        ? 'border-brand-500 bg-brand-50/75 ring-2 ring-brand-500/20 dark:border-lime-400/60 dark:bg-lime-400/10 dark:ring-lime-400/20'
                                        : 'border-slate-200/90 bg-slate-50/60 hover:border-slate-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20 dark:hover:bg-white/[0.06]'
                                }`}
                            >
                                <CoverLayoutThumbnailSvg
                                    layout={item.key}
                                    primary={activePalette.primary}
                                    accent={activePalette.accent}
                                />
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                                            {item.label}
                                        </span>
                                        {item.isNew && (
                                            <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-emerald-700 dark:bg-lime-400/20 dark:text-lime-300">
                                                Baru
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-0.5 line-clamp-2 text-[10.5px] leading-snug text-slate-500 dark:text-slate-400">
                                        {item.description}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </Surface>

            {/* 2. Palet Warna & Mode Tinta */}
            <Surface
                padding="md"
                title="2. Palet Warna & Mode Tinta"
                subtitle="Sesuaikan identitas warna sekolah atau hemat tinta"
                icon={
                    <IconTile tone="lime" size="sm">
                        <Palette />
                    </IconTile>
                }
                actions={
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50/90 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200">
                        <input
                            type="checkbox"
                            checked={config.ink_saver}
                            onChange={(e) => onChangeConfig({ ink_saver: e.target.checked })}
                            className={checkboxClass}
                        />
                        <span>Hemat Tinta</span>
                    </label>
                }
            >
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {COVER_PALETTE_LIST.map((pal) => {
                        const active = config.palette === pal.key;
                        return (
                            <button
                                key={pal.key}
                                type="button"
                                onClick={() => onChangeConfig({ palette: pal.key })}
                                className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition ${
                                    active
                                        ? 'border-brand-500 bg-brand-50/70 ring-2 ring-brand-500/20 dark:border-lime-400/60 dark:bg-lime-400/10 dark:ring-lime-400/20'
                                        : 'border-slate-200/90 bg-slate-50/50 hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20 dark:hover:bg-white/[0.06]'
                                }`}
                            >
                                <span className="flex shrink-0 overflow-hidden rounded-full ring-1 ring-slate-200 dark:ring-white/20">
                                    <span className="h-4 w-2.5" style={{ backgroundColor: pal.primary }} />
                                    <span className="h-4 w-2.5" style={{ backgroundColor: pal.accent }} />
                                </span>
                                <span className="truncate text-[11px] font-bold text-slate-700 dark:text-slate-200">
                                    {pal.label}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Custom Color Picker */}
                <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-slate-200/90 bg-slate-50/70 px-3 py-2.5 dark:border-white/15 dark:bg-white/[0.03]">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200">
                        <input
                            type="radio"
                            name="cover_palette_custom"
                            checked={config.palette === 'custom'}
                            onChange={() => onChangeConfig({ palette: 'custom' })}
                            className="text-brand-600 focus:ring-brand-500 focus:ring-offset-0 dark:bg-white/10 dark:text-brand-500 dark:focus:ring-brand-400"
                        />
                        <span>Warna Kustom:</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        <span>Utama</span>
                        <input
                            type="color"
                            value={config.custom_primary}
                            onChange={(e) =>
                                onChangeConfig({ palette: 'custom', custom_primary: e.target.value })
                            }
                            className="h-6 w-8 cursor-pointer rounded border border-slate-300 bg-white p-0.5 dark:border-white/20 dark:bg-[#15131f]"
                        />
                    </label>
                    <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        <span>Aksen</span>
                        <input
                            type="color"
                            value={config.custom_accent}
                            onChange={(e) =>
                                onChangeConfig({ palette: 'custom', custom_accent: e.target.value })
                            }
                            className="h-6 w-8 cursor-pointer rounded border border-slate-300 bg-white p-0.5 dark:border-white/20 dark:bg-[#15131f]"
                        />
                    </label>
                </div>
            </Surface>

            {/* 3. Gambar Gedung / Lingkungan Sekolah (Universal untuk Semua 10 Tema) */}
            <Surface
                padding="md"
                title="3. Gambar Gedung / Lingkungan Sekolah"
                subtitle="Tersimpan bersama lintas 4 varian BOSP · otomatis terbingkai proporsional"
                icon={
                    <IconTile tone="sky" size="sm">
                        <ImageIcon />
                    </IconTile>
                }
                actions={
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-brand-200/80 bg-brand-50/60 px-2.5 py-1.5 text-[11px] font-extrabold text-brand-800 dark:border-lime-400/30 dark:bg-lime-400/10 dark:text-lime-300">
                        <input
                            type="checkbox"
                            checked={showFotoSekolah}
                            onChange={(e) =>
                                onChangeConfig({ show_foto_sekolah: e.target.checked })
                            }
                            className={checkboxClass}
                        />
                        {showFotoSekolah ? (
                            <Eye className="h-3.5 w-3.5" />
                        ) : (
                            <EyeOff className="h-3.5 w-3.5 opacity-60" />
                        )}
                        <span>Gunakan Gambar Sekolah</span>
                    </label>
                }
            >
                <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoChange}
                    className="hidden"
                />

                {/* Dropzone & Preview */}
                <div
                    onDragOver={(e) => {
                        e.preventDefault();
                        if (canWrite) setIsDraggingPhoto(true);
                    }}
                    onDragLeave={() => setIsDraggingPhoto(false)}
                    onDrop={handleDropPhoto}
                    className={`rounded-2xl border-2 border-dashed p-3 transition ${
                        isDraggingPhoto
                            ? 'border-brand-500 bg-brand-50/70 dark:border-lime-400 dark:bg-lime-400/10'
                            : 'border-slate-200/90 bg-slate-50/70 dark:border-white/15 dark:bg-white/[0.03]'
                    }`}
                >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        {schoolPhotoUri ? (
                            <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/15">
                                <img
                                    src={schoolPhotoUri}
                                    alt="Pratinjau Foto Sekolah"
                                    className={`h-full w-full object-cover transition ${
                                        showFotoSekolah ? 'opacity-100' : 'opacity-40 grayscale'
                                    }`}
                                />
                                {!showFotoSekolah && (
                                    <span className="absolute inset-0 flex items-center justify-center bg-slate-950/55 text-[9.5px] font-extrabold uppercase tracking-wider text-white">
                                        Nonaktif
                                    </span>
                                )}
                            </div>
                        ) : (
                            <div className="flex h-20 w-32 shrink-0 flex-col items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-400 dark:border-white/10 dark:bg-white/[0.04]">
                                <ImageIcon className="h-6 w-6 opacity-60" />
                                <span className="mt-1 text-[9.5px] font-bold">Ilustrasi Vektor</span>
                            </div>
                        )}

                        <div className="min-w-0 flex-1">
                            <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                                {schoolPhotoUri
                                    ? 'Foto sekolah siap digunakan di seluruh 10 tema cover tanpa merusak keterbacaan teks.'
                                    : 'Tarik & lepas foto gedung sekolah ke sini (JPG/PNG/WebP maks 3 MB). Jika kosong, tema berbasis foto menampilkan ilustrasi vektor gedung sekolah.'}
                            </p>
                            <div className="mt-2.5 flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    disabled={!canWrite || isUploadingPhoto}
                                    onClick={() => photoInputRef.current?.click()}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-extrabold text-lime-300 transition hover:bg-slate-800 disabled:opacity-50 dark:bg-lime-400 dark:text-slate-950 dark:hover:bg-lime-300"
                                >
                                    <Upload className="h-3.5 w-3.5" />
                                    <span>
                                        {isUploadingPhoto
                                            ? 'Mengunggah...'
                                            : schoolPhotoUri
                                              ? 'Ganti Gambar Sekolah'
                                              : 'Unggah Gambar Sekolah'}
                                    </span>
                                </button>
                                {schoolPhotoUri && canWrite && (
                                    <button
                                        type="button"
                                        onClick={onDeletePhoto}
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        <span>Hapus</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Kontrol Fokus & Integrasi Foto agar Tidak Merusak Cover */}
                {showFotoSekolah && (
                    <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        <div>
                            <label className={labelClass}>Posisi Fokus Gambar</label>
                            <div className="grid grid-cols-3 gap-1">
                                {PHOTO_FOCUS_OPTIONS.map((opt) => {
                                    const active = (config.photo_focus ?? 'center') === opt.key;
                                    return (
                                        <button
                                            key={opt.key}
                                            type="button"
                                            onClick={() => onChangeConfig({ photo_focus: opt.key })}
                                            className={`rounded-lg border px-2 py-1.5 text-[10.5px] font-bold transition ${
                                                active
                                                    ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-lime-400/60 dark:bg-lime-400/15 dark:text-lime-300'
                                                    : 'border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>Gaya Kontras Gambar</label>
                            <div className="grid grid-cols-3 gap-1">
                                {PHOTO_BLEND_OPTIONS.map((opt) => {
                                    const active = (config.photo_blend ?? 'balanced') === opt.key;
                                    return (
                                        <button
                                            key={opt.key}
                                            type="button"
                                            onClick={() => onChangeConfig({ photo_blend: opt.key })}
                                            className={`rounded-lg border px-2 py-1.5 text-[10.5px] font-bold transition ${
                                                active
                                                    ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-lime-400/60 dark:bg-lime-400/15 dark:text-lime-300'
                                                    : 'border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </Surface>

            {/* 4. Editor Teks Cover */}
            <Surface
                padding="md"
                title="4. Kustomisasi Teks Sampul"
                subtitle="Kosongkan override agar sinkron otomatis dengan profil sekolah"
                icon={
                    <IconTile tone="peach" size="sm">
                        <Type />
                    </IconTile>
                }
            >
                <div className="space-y-3">
                    <div>
                        <label className={labelClass}>Header Instansi (boleh 2 baris)</label>
                        <textarea
                            rows={2}
                            value={config.instansi_atas}
                            onChange={(e) => onChangeConfig({ instansi_atas: e.target.value })}
                            className={inputClass}
                        />
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                            <label className={labelClass}>Badge Dokumen</label>
                            <input
                                type="text"
                                value={config.badge_dokumen}
                                onChange={(e) => onChangeConfig({ badge_dokumen: e.target.value })}
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Label Jilid / Volume (opsional)</label>
                            <input
                                type="text"
                                placeholder="mis. Jilid I / Bendel Utama"
                                value={config.label_jilid}
                                onChange={(e) => onChangeConfig({ label_jilid: e.target.value })}
                                className={inputClass}
                            />
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>Judul Utama</label>
                        <input
                            type="text"
                            value={config.judul_utama}
                            onChange={(e) => onChangeConfig({ judul_utama: e.target.value })}
                            className={`${inputClass} font-semibold`}
                        />
                    </div>
                    <div>
                        <label className={labelClass}>
                            Subjudul Periode (kosongkan agar otomatis mengikuti filter)
                        </label>
                        <input
                            type="text"
                            placeholder="Otomatis dari Tahap / Bulan / Tahun terpilih"
                            value={config.subjudul_override}
                            onChange={(e) => onChangeConfig({ subjudul_override: e.target.value })}
                            className={inputClass}
                        />
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                            <label className={labelClass}>Override Nama Sekolah</label>
                            <input
                                type="text"
                                placeholder="Otomatis dari Profil Sekolah"
                                value={config.nama_sekolah_override}
                                onChange={(e) =>
                                    onChangeConfig({ nama_sekolah_override: e.target.value })
                                }
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Override Alamat Sekolah</label>
                            <input
                                type="text"
                                placeholder="Otomatis dari Profil Sekolah"
                                value={config.alamat_override}
                                onChange={(e) =>
                                    onChangeConfig({ alamat_override: e.target.value })
                                }
                                className={inputClass}
                            />
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>
                            Email / Kontak Sekolah di Sampul (opsional)
                        </label>
                        <input
                            type="text"
                            placeholder="mis. smpn1contoh@gmail.com · Telp (0453) 21234"
                            value={config.kontak_sekolah_override ?? ''}
                            onChange={(e) =>
                                onChangeConfig({ kontak_sekolah_override: e.target.value })
                            }
                            className={inputClass}
                        />
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                            <label className={labelClass}>Override Kepala Sekolah</label>
                            <input
                                type="text"
                                placeholder="Otomatis dari Penganggaran"
                                value={config.kepala_sekolah_override}
                                onChange={(e) =>
                                    onChangeConfig({ kepala_sekolah_override: e.target.value })
                                }
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Override NIP Kepala Sekolah</label>
                            <input
                                type="text"
                                placeholder="Otomatis dari Penganggaran"
                                value={config.nip_kepala_sekolah_override}
                                onChange={(e) =>
                                    onChangeConfig({ nip_kepala_sekolah_override: e.target.value })
                                }
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Override Bendahara</label>
                            <input
                                type="text"
                                placeholder="Otomatis dari Penganggaran"
                                value={config.bendahara_override}
                                onChange={(e) =>
                                    onChangeConfig({ bendahara_override: e.target.value })
                                }
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Override NIP Bendahara</label>
                            <input
                                type="text"
                                placeholder="Otomatis dari Penganggaran"
                                value={config.nip_bendahara_override}
                                onChange={(e) =>
                                    onChangeConfig({ nip_bendahara_override: e.target.value })
                                }
                                className={inputClass}
                            />
                        </div>
                    </div>
                </div>
            </Surface>

            {/* 5. Toggle Elemen Visual & Struktur Bendel */}
            <Surface
                padding="md"
                title="5. Elemen Visual & Struktur Bendel"
                subtitle="Atur komponen yang tampil pada sampul dan PDF akhir"
                icon={
                    <IconTile tone="mint" size="sm">
                        <Sliders />
                    </IconTile>
                }
            >
                <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                        { key: 'show_logo_daerah', label: 'Logo Daerah' },
                        { key: 'show_logo_sekolah', label: 'Logo Sekolah' },
                        { key: 'show_logo_bosp', label: 'Logo Resmi BOSP' },
                        { key: 'show_foto_sekolah', label: 'Gambar Sekolah' },
                        { key: 'show_ringkasan_keuangan', label: 'Ringkasan Keuangan' },
                        { key: 'show_qr_code', label: 'QR Info Verifikasi' },
                        { key: 'show_penanggung_jawab', label: 'Blok Penanggung Jawab' },
                        { key: 'show_geometric_pattern', label: 'Ornamen Dekoratif' },
                    ].map((toggle) => (
                        <label
                            key={toggle.key}
                            className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200/70 bg-slate-50/70 px-3 py-2 font-semibold text-slate-700 transition hover:border-slate-300 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-200 dark:hover:border-white/15"
                        >
                            <input
                                type="checkbox"
                                checked={Boolean(config[toggle.key as keyof SpjCoverConfig])}
                                onChange={(e) =>
                                    onChangeConfig({
                                        [toggle.key]: e.target.checked,
                                    } as Partial<SpjCoverConfig>)
                                }
                                className={checkboxClass}
                            />
                            <span className="truncate">{toggle.label}</span>
                        </label>
                    ))}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs dark:border-white/[0.07]">
                    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-brand-200/60 bg-brand-50/40 px-3 py-2 font-semibold text-slate-800 dark:border-lime-400/20 dark:bg-lime-400/[0.06] dark:text-slate-100">
                        <input
                            type="checkbox"
                            checked={bundleConfig.include_cover}
                            onChange={(e) =>
                                onChangeBundleConfig({ include_cover: e.target.checked })
                            }
                            className={checkboxClass}
                        />
                        <span className="truncate">Sertakan Cover LPJ</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-brand-200/60 bg-brand-50/40 px-3 py-2 font-semibold text-slate-800 dark:border-lime-400/20 dark:bg-lime-400/[0.06] dark:text-slate-100">
                        <input
                            type="checkbox"
                            checked={bundleConfig.include_toc}
                            onChange={(e) =>
                                onChangeBundleConfig({ include_toc: e.target.checked })
                            }
                            className={checkboxClass}
                        />
                        <span className="truncate">Daftar Isi Otomatis</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-brand-200/60 bg-brand-50/40 px-3 py-2 font-semibold text-slate-800 dark:border-lime-400/20 dark:bg-lime-400/[0.06] dark:text-slate-100">
                        <input
                            type="checkbox"
                            checked={bundleConfig.include_dividers}
                            onChange={(e) =>
                                onChangeBundleConfig({ include_dividers: e.target.checked })
                            }
                            className={checkboxClass}
                        />
                        <span className="truncate">Halaman Pembatas Bab</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200/70 bg-slate-50/70 px-3 py-2 font-semibold text-slate-700 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-200">
                        <input
                            type="checkbox"
                            checked={bundleConfig.include_page_numbers}
                            onChange={(e) =>
                                onChangeBundleConfig({ include_page_numbers: e.target.checked })
                            }
                            className={checkboxClass}
                        />
                        <span className="truncate">Stempel No. Halaman</span>
                    </label>
                </div>
            </Surface>

            {/* 6. Aksi Cover */}
            <div className="flex flex-wrap items-center gap-2">
                {canWrite && (
                    <button
                        type="button"
                        disabled={isSavingPreset}
                        onClick={onSavePreset}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-slate-900 px-4 py-2.5 text-xs font-extrabold text-lime-300 shadow-sm transition hover:bg-slate-800 disabled:opacity-50 dark:bg-lime-400 dark:text-slate-950 dark:hover:bg-lime-300"
                    >
                        <Save className="h-3.5 w-3.5" />
                        <span>{isSavingPreset ? 'Menyimpan...' : 'Simpan Preset Cover'}</span>
                    </button>
                )}
                <button
                    type="button"
                    disabled={isExportingCover}
                    onClick={onDownloadCoverPdf}
                    className="inline-flex items-center gap-1.5 rounded-2xl border border-brand-200 bg-brand-50 px-3.5 py-2.5 text-xs font-extrabold text-brand-700 transition hover:bg-brand-100 disabled:opacity-50 dark:border-brand-400/30 dark:bg-brand-500/15 dark:text-brand-200 dark:hover:bg-brand-500/25"
                >
                    <Download className="h-3.5 w-3.5" />
                    <span>Cover PDF</span>
                </button>
                <button
                    type="button"
                    disabled={isExportingCover}
                    onClick={onDownloadCoverPng}
                    className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-xs font-extrabold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200 dark:hover:bg-white/[0.1]"
                >
                    <FileImage className="h-3.5 w-3.5" />
                    <span>PNG HD</span>
                </button>
                <button
                    type="button"
                    onClick={onResetCover}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200/90 bg-white px-3 py-2.5 text-xs font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/[0.1] dark:hover:text-white"
                    title="Reset desain cover ke bawaan"
                    aria-label="Reset desain cover ke bawaan"
                >
                    <RotateCcw className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    );
}
