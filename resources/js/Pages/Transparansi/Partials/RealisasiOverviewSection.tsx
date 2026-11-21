import { useState } from 'react';

import type { PosterJenisBelanjaItem, PosterTrenBulananItem } from '@/Pages/FiturPelengkap/PosterTransparansi/types';
import { cn } from '@/lib/utils';
import { type PublicActivePosterData, formatCompactRupiah, formatRupiah } from '../types';

interface RealisasiOverviewSectionProps {
    activeData: PublicActivePosterData;
    isLoading: boolean;
}

const COLOR_MAP: Record<PosterJenisBelanjaItem['color_key'], { stroke: string; badge: string }> = {
    violet: { stroke: '#7C3AED', badge: 'bg-violet-500' },
    sky: { stroke: '#0EA5E9', badge: 'bg-sky-500' },
    amber: { stroke: '#F59E0B', badge: 'bg-amber-500' },
    mint: { stroke: '#10B981', badge: 'bg-emerald-500' },
    slate: { stroke: '#64748B', badge: 'bg-slate-500' },
};

export default function RealisasiOverviewSection({
    activeData,
    isLoading,
}: RealisasiOverviewSectionProps) {
    const { meta, ringkasan, jenis_belanja, program_snp, tren_bulanan } = activeData;
    const isApproved = ringkasan.status_persetujuan === 'disetujui';

    return (
        <section id="realisasi" className="relative py-14 sm:py-16 print:hidden">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Header Section */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#14535E] dark:text-[#8BE6DC]">
                            Ringkasan &amp; Realisasi Pengelolaan
                        </p>
                        <h2 className="mt-1.5 font-sans text-2xl font-extrabold tracking-[-0.025em] text-[#08222B] dark:text-white sm:text-3xl">
                            {meta.variant_label} — {meta.periode_label}
                        </h2>
                    </div>

                    {meta.has_data && (
                        <div className="flex flex-wrap items-center gap-2">
                            <span
                                className={cn(
                                    'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold',
                                    isApproved
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-200'
                                        : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-200',
                                )}
                            >
                                <span
                                    className={cn(
                                        'h-2 w-2 rounded-full',
                                        isApproved ? 'bg-emerald-500' : 'bg-amber-500',
                                    )}
                                />
                                Status: {ringkasan.status_label}
                                {isApproved && ringkasan.tanggal_persetujuan_formatted
                                    ? ` · ${ringkasan.tanggal_persetujuan_formatted}`
                                    : ''}
                            </span>
                        </div>
                    )}
                </div>

                {!meta.has_data ? (
                    <div className="mt-8 rounded-3xl border border-dashed border-[#C7DFDF] bg-white/80 p-10 text-center dark:border-white/15 dark:bg-[#0B222C]/70">
                        <p className="text-base font-bold text-[#08222B] dark:text-white">
                            Belum ada data penganggaran {meta.variant_label} untuk Tahun {meta.tahun}
                        </p>
                        <p className="mt-2 text-sm text-[#4A6670] dark:text-[#94B8C2]">
                            Silakan pilih varian BOSP lain atau tahun anggaran berbeda pada panel filter di atas.
                        </p>
                    </div>
                ) : (
                    <div className={cn('mt-8 space-y-6 transition-opacity duration-200', isLoading && 'opacity-65')}>
                        {/* 4 Kartu KPI */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <KpiCard
                                label="Pagu Anggaran"
                                value={formatRupiah(ringkasan.pagu_anggaran)}
                                sub={`Alokasi resmi ${meta.variant_label}`}
                                accentClass="from-[#14535E] to-[#1E7887]"
                            />
                            <KpiCard
                                label="Dana Diterima"
                                value={formatRupiah(ringkasan.dana_diterima)}
                                sub={`Penerimaan ${meta.periode_label}`}
                                accentClass="from-sky-500 to-cyan-500"
                            />
                            <KpiCard
                                label="Total Realisasi Belanja"
                                value={formatRupiah(ringkasan.total_realisasi)}
                                sub={`${ringkasan.jumlah_transaksi} transaksi tercatat`}
                                accentClass="from-emerald-500 to-teal-500"
                                progress={ringkasan.persentase_serapan}
                                progressLabel={`${ringkasan.persentase_serapan_aktual.toFixed(1).replace('.', ',')}% serapan`}
                                highlight
                            />
                            <KpiCard
                                label="Sisa Dana Tersedia"
                                value={formatRupiah(ringkasan.sisa_dana)}
                                sub={`Sisa pagu: ${formatCompactRupiah(ringkasan.sisa_pagu)}`}
                                accentClass="from-amber-500 to-orange-500"
                            />
                        </div>

                        {/* Grid Grafik: Jenis Belanja + Program SNP */}
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                            {/* Donut Komposisi Jenis Belanja */}
                            <div className="rounded-3xl border border-[#DCEBEB] bg-white p-6 shadow-sm dark:border-[#8BE6DC]/15 dark:bg-[#0B222C] lg:col-span-5">
                                <div className="flex items-center justify-between gap-2">
                                    <div>
                                        <h3 className="text-base font-extrabold text-[#08222B] dark:text-white">
                                            Komposisi Jenis Belanja
                                        </h3>
                                        <p className="mt-0.5 text-xs text-[#4A6670] dark:text-[#94B8C2]">
                                            Klasifikasi realisasi berdasarkan kode rekening BOSP
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row">
                                    <PublicDonutChart items={jenis_belanja} total={ringkasan.total_realisasi} />

                                    <div className="w-full flex-1 space-y-2.5">
                                        {jenis_belanja.map((item) => (
                                            <div key={item.key} className="flex items-center justify-between gap-3 text-xs">
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <span
                                                        className={cn(
                                                            'h-2.5 w-2.5 shrink-0 rounded-full',
                                                            COLOR_MAP[item.color_key].badge,
                                                        )}
                                                    />
                                                    <span className="truncate font-semibold text-[#08222B] dark:text-white/90">
                                                        {item.label}
                                                    </span>
                                                </div>
                                                <div className="shrink-0 text-right tabular-nums">
                                                    <span className="font-bold text-[#08222B] dark:text-white">
                                                        {formatCompactRupiah(item.nominal)}
                                                    </span>
                                                    <span className="ml-1.5 text-[11px] font-semibold text-[#4A6670] dark:text-[#94B8C2]">
                                                        ({item.persentase.toFixed(1).replace('.', ',')}%)
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Realisasi Program / Standar SNP */}
                            <div className="rounded-3xl border border-[#DCEBEB] bg-white p-6 shadow-sm dark:border-[#8BE6DC]/15 dark:bg-[#0B222C] lg:col-span-7">
                                <div className="flex items-center justify-between gap-2">
                                    <div>
                                        <h3 className="text-base font-extrabold text-[#08222B] dark:text-white">
                                            Prioritas Program / Standar Nasional Pendidikan (SNP)
                                        </h3>
                                        <p className="mt-0.5 text-xs text-[#4A6670] dark:text-[#94B8C2]">
                                            Distribusi realisasi anggaran pada program prioritas sekolah
                                        </p>
                                    </div>
                                </div>

                                {program_snp.length === 0 ? (
                                    <div className="mt-8 rounded-2xl bg-[#F4FAFA] p-6 text-center text-xs font-medium text-[#4A6670] dark:bg-white/[0.04] dark:text-[#94B8C2]">
                                        Belum ada transaksi realisasi tercatat pada periode ini.
                                    </div>
                                ) : (
                                    <div className="mt-5 space-y-3.5">
                                        {program_snp.map((prog, index) => {
                                            const maxVal = Math.max(...program_snp.map((p) => p.nominal), 1);
                                            const widthPct = Math.max(4, (prog.nominal / maxVal) * 100);
                                            return (
                                                <div key={`${prog.program}-${index}`}>
                                                    <div className="flex items-baseline justify-between gap-3 text-xs">
                                                        <span className="truncate font-bold text-[#08222B] dark:text-white/95" title={prog.program}>
                                                            {prog.program}
                                                        </span>
                                                        <span className="shrink-0 font-extrabold text-[#14535E] tabular-nums dark:text-[#8BE6DC]">
                                                            {formatRupiah(prog.nominal)}{' '}
                                                            <span className="font-semibold text-[#4A6670] dark:text-[#94B8C2]">
                                                                ({prog.persentase.toFixed(1).replace('.', ',')}%)
                                                            </span>
                                                        </span>
                                                    </div>
                                                    <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-[#E8F3F3] dark:bg-white/10">
                                                        <div
                                                            className="h-full rounded-full bg-gradient-to-r from-[#14535E] via-[#278A97] to-[#5CCAC0] transition-all duration-500 dark:from-[#5CCAC0] dark:to-[#8BE6DC]"
                                                            style={{ width: `${widthPct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tren Realisasi Bulanan Interaktif */}
                        <div className="rounded-3xl border border-[#DCEBEB] bg-white p-6 shadow-sm dark:border-[#8BE6DC]/15 dark:bg-[#0B222C]">
                            <PublicMonthlyChart items={tren_bulanan} periodeLabel={meta.periode_label} />
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}

function KpiCard({
    label,
    value,
    sub,
    accentClass,
    progress,
    progressLabel,
    highlight = false,
}: {
    label: string;
    value: string;
    sub: string;
    accentClass: string;
    progress?: number;
    progressLabel?: string;
    highlight?: boolean;
}) {
    return (
        <div
            className={cn(
                'relative overflow-hidden rounded-3xl border bg-white p-5 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 dark:bg-[#0B222C]',
                highlight
                    ? 'border-[#5CCAC0]/60 ring-1 ring-[#5CCAC0]/25 dark:border-[#8BE6DC]/40'
                    : 'border-[#DCEBEB] dark:border-[#8BE6DC]/15',
            )}
        >
            <div className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', accentClass)} />
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#4A6670] dark:text-[#94B8C2]">
                {label}
            </p>
            <p
                className="mt-2 truncate text-xl font-extrabold tracking-[-0.025em] text-[#08222B] tabular-nums dark:text-white"
                title={value}
            >
                {value}
            </p>
            <p className="mt-1 text-xs font-medium text-[#4A6670] dark:text-[#94B8C2]">{sub}</p>

            {typeof progress === 'number' && (
                <div className="mt-3.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-[#14535E] dark:text-[#8BE6DC]">
                        <span>Progres Serapan</span>
                        <span className="tabular-nums">{progressLabel}</span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#E8F3F3] dark:bg-white/10">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-[#14535E] to-[#5CCAC0] dark:from-[#5CCAC0] dark:to-[#8BE6DC]"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

function PublicDonutChart({
    items,
    total,
}: {
    items: PosterJenisBelanjaItem[];
    total: number;
}) {
    const size = 156;
    const strokeWidth = 22;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    const positiveItems = items.filter((item) => item.nominal > 0);
    const sliceSum = positiveItems.reduce((acc, item) => acc + item.nominal, 0);

    let cumulative = 0;
    const segments =
        sliceSum > 0
            ? positiveItems.map((item) => {
                  const pct = item.nominal / sliceSum;
                  const dashLength = pct * circumference;
                  const dashOffset = -cumulative * circumference;
                  cumulative += pct;
                  return {
                      key: item.key,
                      color: COLOR_MAP[item.color_key].stroke,
                      dashArray: `${dashLength} ${circumference}`,
                      dashOffset,
                  };
              })
            : [];

    return (
        <div className="relative flex shrink-0 items-center justify-center">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Diagram komposisi jenis belanja">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    className="text-[#EAF4F4] dark:text-white/10"
                />
                {segments.map((seg) => (
                    <circle
                        key={seg.key}
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke={seg.color}
                        strokeWidth={strokeWidth}
                        strokeDasharray={seg.dashArray}
                        strokeDashoffset={seg.dashOffset}
                        transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    />
                ))}
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A6670] dark:text-[#94B8C2]">
                    Total
                </span>
                <span className="mt-0.5 text-xs font-extrabold text-[#08222B] tabular-nums dark:text-white">
                    {formatCompactRupiah(total)}
                </span>
            </div>
        </div>
    );
}

function PublicMonthlyChart({
    items,
    periodeLabel,
}: {
    items: PosterTrenBulananItem[];
    periodeLabel: string;
}) {
    const [hoveredBulan, setHoveredBulan] = useState<number | null>(null);
    const activeItem = items.find((item) => item.bulan === hoveredBulan) ?? null;

    const svgWidth = 840;
    const svgHeight = 200;
    const chartTop = 28;
    const chartBottom = 164;
    const chartHeight = chartBottom - chartTop;
    const count = Math.max(items.length, 1);
    const maxVal = Math.max(...items.map((item) => item.nominal), 1);
    const slotWidth = svgWidth / count;
    const barWidth = Math.min(40, Math.max(20, slotWidth * 0.54));

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="text-base font-extrabold text-[#08222B] dark:text-white">
                        Tren Realisasi Belanja Bulanan
                    </h3>
                    <p className="mt-0.5 text-xs text-[#4A6670] dark:text-[#94B8C2]">
                        Pergeseran penyerapan anggaran per bulan ({periodeLabel})
                    </p>
                </div>
                <div className="rounded-2xl border border-[#DCEBEB] bg-[#F4FAFA] px-3.5 py-2 text-xs font-semibold text-[#08222B] dark:border-white/10 dark:bg-white/[0.05] dark:text-white">
                    {activeItem ? (
                        <span>
                            Bulan <strong>{activeItem.label}</strong>:{' '}
                            <strong className="text-[#14535E] tabular-nums dark:text-[#8BE6DC]">
                                {formatRupiah(activeItem.nominal)}
                            </strong>
                        </span>
                    ) : (
                        <span className="text-[#4A6670] dark:text-[#94B8C2]">
                            Arahkan kursor pada batang bulan untuk melihat rincian nominal
                        </span>
                    )}
                </div>
            </div>

            <div className="mt-5 overflow-x-auto">
                <svg
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                    className="h-[200px] w-full min-w-[540px]"
                    role="img"
                    aria-label="Grafik batang SVG tren realisasi belanja bulanan"
                >
                    <defs>
                        <linearGradient id="publicBarGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#5CCAC0" />
                            <stop offset="100%" stopColor="#14535E" />
                        </linearGradient>
                        <linearGradient id="publicBarPeakGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#8BE6DC" />
                            <stop offset="100%" stopColor="#0E5A68" />
                        </linearGradient>
                    </defs>

                    <line x1={0} y1={chartTop} x2={svgWidth} y2={chartTop} stroke="currentColor" strokeDasharray="4 4" className="text-slate-200 dark:text-white/10" />
                    <line x1={0} y1={chartTop + chartHeight / 2} x2={svgWidth} y2={chartTop + chartHeight / 2} stroke="currentColor" strokeDasharray="4 4" className="text-slate-200 dark:text-white/10" />
                    <line x1={0} y1={chartBottom} x2={svgWidth} y2={chartBottom} stroke="currentColor" className="text-slate-300 dark:text-white/20" />

                    {items.map((item, idx) => {
                        const barH = item.nominal > 0 ? Math.max(8, (item.nominal / maxVal) * chartHeight) : 4;
                        const x = idx * slotWidth + (slotWidth - barWidth) / 2;
                        const y = chartBottom - barH;
                        const isPeak = item.nominal > 0 && item.nominal === maxVal;
                        const isHovered = hoveredBulan === item.bulan;

                        return (
                            <g
                                key={item.bulan}
                                tabIndex={0}
                                role="button"
                                aria-label={`Bulan ${item.label}: ${formatRupiah(item.nominal)}`}
                                onMouseEnter={() => setHoveredBulan(item.bulan)}
                                onMouseLeave={() => setHoveredBulan(null)}
                                onFocus={() => setHoveredBulan(item.bulan)}
                                onBlur={() => setHoveredBulan(null)}
                                className="cursor-pointer outline-none"
                            >
                                <rect
                                    x={idx * slotWidth + 2}
                                    y={chartTop}
                                    width={slotWidth - 4}
                                    height={chartHeight + 28}
                                    rx={10}
                                    fill="currentColor"
                                    className={cn(
                                        'transition-opacity duration-200',
                                        isHovered ? 'text-[#8BE6DC]/15 opacity-100' : 'opacity-0',
                                    )}
                                />
                                <rect
                                    x={x}
                                    y={y}
                                    width={barWidth}
                                    height={barH}
                                    rx={8}
                                    fill={
                                        item.nominal <= 0
                                            ? '#CBD5E1'
                                            : isPeak || isHovered
                                              ? 'url(#publicBarPeakGradient)'
                                              : 'url(#publicBarGradient)'
                                    }
                                    opacity={item.nominal > 0 ? (isHovered || isPeak ? 1 : 0.88) : 0.45}
                                />
                                {item.nominal > 0 && (
                                    <text
                                        x={x + barWidth / 2}
                                        y={Math.max(14, y - 7)}
                                        textAnchor="middle"
                                        fontSize="10.5"
                                        fontWeight="700"
                                        fill="currentColor"
                                        className="text-[#14535E] dark:text-[#8BE6DC]"
                                    >
                                        {formatCompactRupiah(item.nominal).replace('Rp ', '')}
                                    </text>
                                )}
                                <text
                                    x={x + barWidth / 2}
                                    y={chartBottom + 20}
                                    textAnchor="middle"
                                    fontSize="11.5"
                                    fontWeight={isHovered ? '800' : '700'}
                                    fill="currentColor"
                                    className={
                                        isHovered
                                            ? 'text-[#14535E] dark:text-[#8BE6DC]'
                                            : 'text-[#4A6670] dark:text-[#94B8C2]'
                                    }
                                >
                                    {item.label}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
}
