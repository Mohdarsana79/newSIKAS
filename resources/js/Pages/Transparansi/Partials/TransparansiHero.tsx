import type { PosterPeriode } from '@/Pages/FiturPelengkap/PosterTransparansi/types';
import { cn } from '@/lib/utils';
import {
    type BudgetVariantKey,
    type PublicTransparansiOverview,
    formatCompactRupiah,
    formatRupiah,
} from '../types';

interface TransparansiHeroProps {
    overview: PublicTransparansiOverview;
    selectedVariant: BudgetVariantKey;
    selectedTahun: number;
    selectedPeriode: PosterPeriode;
    isLoading: boolean;
    onVariantChange: (variant: BudgetVariantKey) => void;
    onTahunChange: (tahun: number) => void;
    onPeriodeChange: (periode: PosterPeriode) => void;
}

const PERIODE_OPTIONS: readonly { value: PosterPeriode; label: string; shortLabel: string }[] = [
    { value: 'tahunan', label: '1 Tahun Penuh', shortLabel: 'Tahunan' },
    { value: 'tahap_1', label: 'Tahap 1 (Jan–Jun)', shortLabel: 'Tahap 1' },
    { value: 'tahap_2', label: 'Tahap 2 (Jul–Des)', shortLabel: 'Tahap 2' },
];

export default function TransparansiHero({
    overview,
    selectedVariant,
    selectedTahun,
    selectedPeriode,
    isLoading,
    onVariantChange,
    onTahunChange,
    onPeriodeChange,
}: TransparansiHeroProps) {
    const { sekolah, aggregate, variants_summary, meta } = overview;
    const yearsList = meta.available_years.length > 0 ? meta.available_years : [selectedTahun];

    return (
        <section
            id="ringkasan"
            className="relative isolate overflow-hidden bg-[#051821] pb-20 pt-28 text-white sm:pb-24 sm:pt-32 print:hidden"
        >
            {/* Latar Sinematik Deep Midnight Teal + Aurora Mint */}
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                <img
                    src="/images/landing/hero-mountain.jpg"
                    alt=""
                    className="h-full w-full object-cover object-center opacity-45"
                    loading="eager"
                />
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            'linear-gradient(108deg, rgba(4,20,28,0.96) 0%, rgba(5,24,33,0.88) 46%, rgba(10,38,51,0.82) 100%)',
                    }}
                />
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            'radial-gradient(46rem 28rem at 82% 18%, rgba(139,230,220,0.22), transparent 65%), radial-gradient(36rem 24rem at 14% 72%, rgba(92,202,192,0.16), transparent 65%)',
                    }}
                />
            </div>

            <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Baris Atas: Identitas Sekolah & Kartu Agregat Gabungan */}
                <div className="grid gap-8 lg:grid-cols-[1.25fr_0.95fr] lg:items-center">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-[#8BE6DC]/35 bg-[#8BE6DC]/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#8BE6DC]">
                            <span className="h-2 w-2 rounded-full bg-[#8BE6DC] shadow-[0_0_10px_#8BE6DC]" />
                            Portal Keterbukaan Informasi Publik BOSP
                        </div>

                        <div className="mt-5 flex items-start gap-4">
                            {(sekolah.logo_sekolah_data_uri || sekolah.logo_daerah_data_uri) && (
                                <div className="flex shrink-0 items-center gap-2">
                                    {sekolah.logo_daerah_data_uri && (
                                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/10 p-1.5 backdrop-blur-md">
                                            <img
                                                src={sekolah.logo_daerah_data_uri}
                                                alt="Logo Daerah"
                                                className="h-full w-full object-contain"
                                            />
                                        </div>
                                    )}
                                    {sekolah.logo_sekolah_data_uri && (
                                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/10 p-1.5 backdrop-blur-md">
                                            <img
                                                src={sekolah.logo_sekolah_data_uri}
                                                alt="Logo Sekolah"
                                                className="h-full w-full object-contain"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="min-w-0">
                                <h1 className="font-sans text-2xl font-extrabold leading-tight tracking-[-0.03em] text-white sm:text-4xl">
                                    {sekolah.nama_sekolah}
                                </h1>
                                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-white/75 sm:text-sm">
                                    <span className="rounded-md bg-white/10 px-2 py-0.5 font-semibold text-[#8BE6DC]">
                                        NPSN: {sekolah.npsn}
                                    </span>
                                    {sekolah.jenjang_sekolah && <span>{sekolah.jenjang_sekolah}</span>}
                                    {sekolah.status_sekolah && <span>· {sekolah.status_sekolah}</span>}
                                </div>
                                {sekolah.alamat_lengkap && (
                                    <p className="mt-2 max-w-2xl text-xs leading-relaxed text-white/65 sm:text-[13.5px]">
                                        {sekolah.alamat_lengkap}
                                    </p>
                                )}
                            </div>
                        </div>

                        <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/75 sm:text-[15px]">
                            Halaman resmi keterbukaan pengelolaan Dana BOSP bagi orang tua siswa, komite sekolah, dan
                            masyarakat. Telusuri alokasi pagu, realisasi belanja, RKA Tahapan RKAS Awal &amp; RKAS
                            Perubahan, hingga poster transparansi siap cetak.
                        </p>
                    </div>

                    {/* Kartu Glassmorphism: Ringkasan Gabungan Seluruh Varian Tahun Terpilih */}
                    <div className="rounded-[2rem] border border-white/20 bg-gradient-to-b from-white/[0.12] via-white/[0.07] to-[#08222D]/60 p-6 shadow-[0_28px_70px_-20px_rgba(0,0,0,0.65)] backdrop-blur-2xl">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8BE6DC]/90">
                                    Total Gabungan BOSP · {selectedTahun}
                                </p>
                                <p className="mt-1 text-2xl font-extrabold tracking-[-0.03em] text-white tabular-nums sm:text-3xl">
                                    {formatRupiah(aggregate.total_pagu)}
                                </p>
                            </div>
                            <div className="rounded-2xl border border-[#8BE6DC]/30 bg-[#8BE6DC]/15 px-3 py-2 text-right">
                                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8BE6DC]">
                                    Serapan
                                </p>
                                <p className="text-lg font-extrabold text-white tabular-nums">
                                    {aggregate.persentase_serapan_aktual.toFixed(1).replace('.', ',')}%
                                </p>
                            </div>
                        </div>

                        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-white/15">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-[#5CCAC0] via-[#8BE6DC] to-[#C2FAF3] transition-all duration-500"
                                style={{ width: `${aggregate.persentase_serapan}%` }}
                            />
                        </div>

                        <div className="mt-5 grid grid-cols-3 gap-2.5">
                            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
                                    Dana Diterima
                                </p>
                                <p className="mt-1 truncate text-xs font-bold text-white tabular-nums sm:text-sm" title={formatRupiah(aggregate.total_dana_diterima)}>
                                    {formatCompactRupiah(aggregate.total_dana_diterima)}
                                </p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
                                    Realisasi
                                </p>
                                <p className="mt-1 truncate text-xs font-bold text-[#8BE6DC] tabular-nums sm:text-sm" title={formatRupiah(aggregate.total_realisasi)}>
                                    {formatCompactRupiah(aggregate.total_realisasi)}
                                </p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
                                    Varian Aktif
                                </p>
                                <p className="mt-1 text-xs font-bold text-white tabular-nums sm:text-sm">
                                    {aggregate.active_variants_count} dari 4
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filter Bar Terpadu: Tahun Anggaran + Periode + 4 Tab Varian BOSP */}
                <div className="mt-10 rounded-3xl border border-white/15 bg-[#061C24]/75 p-4 shadow-2xl backdrop-blur-2xl sm:p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        {/* Pemilih Tahun & Periode */}
                        <div className="flex flex-wrap items-center gap-3">
                            <label className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.06] px-3.5 py-2 text-xs font-semibold text-white/80">
                                <span className="text-white/60">Tahun</span>
                                <select
                                    value={selectedTahun}
                                    onChange={(e) => onTahunChange(Number(e.target.value))}
                                    aria-label="Pilih Tahun Anggaran"
                                    className="cursor-pointer border-0 bg-transparent py-0 pl-1 pr-6 text-sm font-bold text-[#8BE6DC] focus:ring-0 [&>option]:bg-[#061C24] [&>option]:text-white"
                                >
                                    {yearsList.map((y) => (
                                        <option key={y} value={y}>
                                            {y}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <div className="inline-flex rounded-2xl border border-white/15 bg-white/[0.05] p-1">
                                {PERIODE_OPTIONS.map((opt) => {
                                    const active = selectedPeriode === opt.value;
                                    return (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => onPeriodeChange(opt.value)}
                                            className={cn(
                                                'rounded-xl px-3 py-1.5 text-xs font-bold transition-all',
                                                active
                                                    ? 'bg-[#8BE6DC] text-[#06222B] shadow-sm'
                                                    : 'text-white/75 hover:bg-white/10 hover:text-white',
                                            )}
                                        >
                                            <span className="hidden sm:inline">{opt.label}</span>
                                            <span className="sm:hidden">{opt.shortLabel}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-white/65">
                            {isLoading ? (
                                <span className="inline-flex items-center gap-2 text-[#8BE6DC]">
                                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#8BE6DC] border-t-transparent" />
                                    Memperbarui data...
                                </span>
                            ) : (
                                <span>Diperbarui: {meta.generated_at_formatted}</span>
                            )}
                        </div>
                    </div>

                    {/* 4 Kartu Tab Varian BOSP */}
                    <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                        {variants_summary.map((item) => {
                            const active = selectedVariant === item.variant;
                            return (
                                <button
                                    key={item.variant}
                                    type="button"
                                    onClick={() => onVariantChange(item.variant)}
                                    className={cn(
                                        'group relative flex flex-col items-start rounded-2xl border p-3.5 text-left transition-all duration-200',
                                        active
                                            ? 'border-[#8BE6DC] bg-[#8BE6DC]/15 shadow-[0_12px_30px_-14px_rgba(139,230,220,0.65)]'
                                            : 'border-white/12 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.08]',
                                    )}
                                >
                                    <div className="flex w-full items-center justify-between gap-2">
                                        <span
                                            className={cn(
                                                'text-xs font-extrabold tracking-tight',
                                                active ? 'text-[#8BE6DC]' : 'text-white',
                                            )}
                                        >
                                            {item.label}
                                        </span>
                                        <span
                                            className={cn(
                                                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold',
                                                item.has_data
                                                    ? 'bg-emerald-400/20 text-emerald-200'
                                                    : 'bg-white/10 text-white/50',
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    'h-1.5 w-1.5 rounded-full',
                                                    item.has_data ? 'bg-emerald-300' : 'bg-white/40',
                                                )}
                                            />
                                            {item.has_data ? 'Tersedia' : 'Kosong'}
                                        </span>
                                    </div>

                                    <p className="mt-2 text-sm font-extrabold text-white tabular-nums">
                                        {item.has_data ? formatRupiah(item.pagu_anggaran) : 'Belum ada data'}
                                    </p>

                                    <div className="mt-1.5 flex w-full items-center justify-between text-[11px] text-white/65">
                                        <span>
                                            Serapan:{' '}
                                            <strong className="text-white/90 tabular-nums">
                                                {item.has_data
                                                    ? `${item.persentase_serapan.toFixed(1).replace('.', ',')}%`
                                                    : '0%'}
                                            </strong>
                                        </span>
                                        <div className="flex items-center gap-1">
                                            {item.has_rkas_awal && (
                                                <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9.5px] font-bold text-[#8BE6DC]">
                                                    Awal
                                                </span>
                                            )}
                                            {item.has_rkas_perubahan && (
                                                <span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-[9.5px] font-bold text-amber-200">
                                                    Perubahan
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Wave Transisi Halus ke Zona Terang */}
            <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden leading-none">
                <svg
                    viewBox="0 0 1440 56"
                    preserveAspectRatio="none"
                    className="h-8 w-full fill-[#F8FBFB] dark:fill-[#051319] sm:h-12"
                >
                    <path d="M0,28 C360,64 1080,0 1440,34 L1440,56 L0,56 Z" />
                </svg>
            </div>
        </section>
    );
}
