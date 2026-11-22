import { forwardRef } from 'react';
import { POSTER_PAPER_SIZES } from '../paperSizes';
import type { PosterTheme } from '../themes';
import type { PosterData, PosterJenisBelanjaItem, PosterPaperSize, PosterTrenBulananItem } from '../types';

interface PosterCanvasProps {
    data: PosterData;
    theme: PosterTheme;
    paperSize?: PosterPaperSize;
    framed?: boolean;
    showSignatures: boolean;
    showMonthlyTrend: boolean;
    transparencyNote: string;
    hideNip?: boolean;
}

function formatRupiah(value: number): string {
    return `Rp ${Math.round(value).toLocaleString('id-ID')}`;
}

function formatCompactRupiah(value: number): string {
    if (value <= 0) return '0';
    if (value >= 999_500_000) {
        return `${(value / 1_000_000_000).toFixed(1).replace('.', ',')} M`;
    }
    if (value >= 999_500) {
        const jt = value / 1_000_000;
        return `${jt >= 100 ? Math.round(jt) : jt.toFixed(1).replace('.', ',')} Jt`;
    }
    if (value >= 1_000) {
        return `${Math.round(value / 1_000)} Rb`;
    }
    return `${Math.round(value)}`;
}

function formatNip(nip?: string): string {
    const trimmed = (nip || '').trim();
    if (trimmed === '' || trimmed === '-') {
        return 'NIP. -';
    }
    if (/^nip[\.\s]/i.test(trimmed)) {
        return trimmed;
    }
    return `NIP. ${trimmed}`;
}

/**
 * Kanvas poster infografis siap cetak (lebar desain standar 794px dengan tinggi adaptif sesuai ukuran kertas).
 * Selalu menggunakan warna terang eksplisit agar hasil ekspor PNG 300 DPI bebas distorsi dark mode.
 */
const PosterCanvas = forwardRef<HTMLDivElement, PosterCanvasProps>(function PosterCanvas(
    {
        data,
        theme,
        paperSize = 'a4',
        framed = true,
        showSignatures,
        showMonthlyTrend,
        transparencyNote,
        hideNip = false,
    },
    ref,
) {
    const { meta, sekolah, ringkasan, jenis_belanja, program_snp, tren_bulanan, penanggung_jawab } = data;
    const maxProgramNominal = Math.max(...program_snp.map((p) => p.nominal), 1);
    const paperSpec = POSTER_PAPER_SIZES[paperSize];
    const isCompact = paperSpec.density === 'compact';

    return (
        <div
            ref={ref}
            id="transparansi-poster-sheet"
            style={{
                width: `${paperSpec.designWidth}px`,
                minHeight: `${paperSpec.designHeight}px`,
                backgroundColor: theme.pageBg,
                color: '#0F172A',
                fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
            }}
            className={`mx-auto flex flex-col overflow-hidden ${
                framed ? 'rounded-[22px] border border-slate-200/90 shadow-xl' : ''
            }`}
        >
            {/* 1. HEADER HERO SEKOLAH */}
            <header
                id="transparansi-poster-header"
                style={{ backgroundColor: theme.headerBg }}
                className={`relative overflow-hidden text-white ${isCompact ? 'px-6 pb-4 pt-4' : 'px-7 pb-6 pt-6'}`}
            >
                <div
                    aria-hidden="true"
                    style={{ background: theme.headerAccentGlowA }}
                    className="pointer-events-none absolute -right-14 -top-16 h-56 w-56 rounded-full blur-3xl"
                />
                <div
                    aria-hidden="true"
                    style={{ background: theme.headerAccentGlowB }}
                    className="pointer-events-none absolute -bottom-16 -left-12 h-48 w-48 rounded-full blur-3xl"
                />

                <div className="relative flex items-center justify-between gap-4">
                    {/* Logo Daerah */}
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 p-1.5 backdrop-blur-sm">
                        {sekolah.logo_daerah_data_uri ? (
                            <img
                                src={sekolah.logo_daerah_data_uri}
                                alt="Logo Daerah"
                                className="max-h-full max-w-full object-contain"
                            />
                        ) : (
                            <span className="text-center text-[9px] font-extrabold uppercase leading-tight text-white/60">
                                BOSP
                                <br />
                                RI
                            </span>
                        )}
                    </div>

                    {/* Judul & Identitas Sekolah */}
                    <div className="min-w-0 flex-1 text-center">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/90">
                            <span>TRANSPARANSI PUBLIK</span>
                            <span>·</span>
                            <span>{meta.variant_label}</span>
                        </div>

                        <h2 className="mt-2 text-[22px] font-black uppercase leading-tight tracking-tight text-white">
                            {sekolah.nama_sekolah}
                        </h2>

                        <p className="mt-1 text-[11px] font-semibold text-white/75">
                            NPSN: {sekolah.npsn}
                            {sekolah.jenjang_sekolah ? ` · ${sekolah.jenjang_sekolah}` : ''}
                            {sekolah.status_sekolah ? ` (${sekolah.status_sekolah})` : ''}
                        </p>

                        {sekolah.alamat_lengkap && (
                            <p className="mx-auto mt-0.5 max-w-[520px] truncate text-[10px] font-medium text-white/65">
                                {sekolah.alamat_lengkap}
                            </p>
                        )}
                    </div>

                    {/* Logo Sekolah */}
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 p-1.5 backdrop-blur-sm">
                        {sekolah.logo_sekolah_data_uri ? (
                            <img
                                src={sekolah.logo_sekolah_data_uri}
                                alt="Logo Sekolah"
                                className="max-h-full max-w-full object-contain"
                            />
                        ) : (
                            <span className="text-center text-[9px] font-extrabold uppercase leading-tight text-white/60">
                                LOGO
                                <br />
                                SEKOLAH
                            </span>
                        )}
                    </div>
                </div>

                {/* Strip Periode & Status */}
                <div
                    className={`relative flex items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/[0.08] px-4 ${
                        isCompact ? 'mt-3 py-2' : 'mt-4 py-2.5'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <span
                            style={{
                                backgroundColor: theme.headerBadgeBg,
                                color: theme.headerBadgeText,
                            }}
                            className="rounded-full px-3 py-1 text-[10.5px] font-black uppercase tracking-wide"
                        >
                            {meta.periode_label}
                        </span>
                        <span className="text-[11px] font-semibold text-white/80">
                            Laporan Realisasi Penggunaan Dana {meta.variant_label}
                        </span>
                    </div>

                    <span className="shrink-0 rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[9.5px] font-extrabold uppercase text-white/90">
                        {ringkasan.status_persetujuan === 'disetujui' ? 'RKAS Disahkan' : 'Periode Berjalan'}
                    </span>
                </div>
            </header>

            {/* 2. BODY INFOGRAFIS */}
            <div
                className={`flex flex-1 flex-col justify-between ${
                    isCompact ? 'gap-2.5 px-5 py-3.5' : 'gap-4 px-6 py-5'
                }`}
            >
                {/* 4 Kartu KPI Keuangan */}
                <div className="grid grid-cols-4 gap-3">
                    <KpiTile
                        label="Pagu Anggaran"
                        value={formatRupiah(ringkasan.pagu_anggaran)}
                        sub="Alokasi ditetapkan"
                        accent={theme.accentColor}
                        borderColor={theme.cardBorder}
                    />
                    <KpiTile
                        label="Dana Diterima"
                        value={formatRupiah(ringkasan.dana_diterima)}
                        sub="Total kas masuk periode"
                        accent="#0284C7"
                        borderColor={theme.cardBorder}
                    />
                    <KpiTile
                        label="Realisasi Belanja"
                        value={formatRupiah(ringkasan.total_realisasi)}
                        sub={`${ringkasan.jumlah_transaksi} transaksi tercatat`}
                        accent="#059669"
                        borderColor={theme.cardBorder}
                        highlight
                    />
                    <KpiTile
                        label="Sisa Dana / Saldo"
                        value={formatRupiah(ringkasan.sisa_dana)}
                        sub="Tersedia / saldo akhir"
                        accent="#D97706"
                        borderColor={theme.cardBorder}
                    />
                </div>

                {/* Progress Bar Serapan Anggaran */}
                <div
                    style={{ borderColor: theme.cardBorder }}
                    className="rounded-2xl border bg-white px-4 py-3.5 shadow-sm"
                >
                    <div className="flex items-center justify-between gap-2">
                        <div>
                            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                                Tingkat Penyerapan Anggaran
                            </p>
                            <p className="text-[11px] font-semibold text-slate-600">
                                Realisasi {formatRupiah(ringkasan.total_realisasi)} dari{' '}
                                {formatRupiah(ringkasan.pagu_anggaran > 0 ? ringkasan.pagu_anggaran : ringkasan.dana_diterima)}
                            </p>
                        </div>
                        <div className="text-right">
                            <span
                                style={{ color: theme.accentColor }}
                                className="text-[22px] font-black leading-none tracking-tight tabular-nums"
                            >
                                {ringkasan.persentase_serapan_aktual.toFixed(1).replace('.', ',')}%
                            </span>
                            <p className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">
                                Terserap
                            </p>
                        </div>
                    </div>

                    <div
                        role="progressbar"
                        aria-label="Tingkat penyerapan anggaran"
                        aria-valuenow={ringkasan.persentase_serapan_aktual}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        style={{ backgroundColor: theme.progressTrack }}
                        className="mt-2.5 h-3 w-full overflow-hidden rounded-full"
                    >
                        <div
                            style={{
                                width: `${ringkasan.persentase_serapan}%`,
                                background: theme.progressFill,
                            }}
                            className="h-full rounded-full"
                        />
                    </div>
                </div>

                {/* 2 Kolom Tengah: Komposisi Jenis Belanja (Donut SVG) & Program SNP */}
                <div className="grid grid-cols-12 gap-4">
                    {/* Kiri: Komposisi Jenis Belanja */}
                    <div
                        style={{ borderColor: theme.cardBorder }}
                        className="col-span-5 flex flex-col justify-between rounded-2xl border bg-white p-4 shadow-sm"
                    >
                        <div>
                            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                                Komposisi Belanja
                            </p>
                            <h2 className="mt-0.5 text-[13.5px] font-black text-slate-900">
                                Berdasarkan Jenis Belanja
                            </h2>
                        </div>

                        <div className="my-3 flex items-center justify-center">
                            <DonutChartSvg
                                items={jenis_belanja}
                                total={ringkasan.total_realisasi}
                                theme={theme}
                            />
                        </div>

                        <div className="space-y-2">
                            {jenis_belanja.map((item) => (
                                <div key={item.key} className="flex items-center justify-between gap-2 text-[10.5px]">
                                    <div className="flex min-w-0 items-center gap-2">
                                        <span
                                            style={{ backgroundColor: theme.chartPalette[item.color_key] }}
                                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                                        />
                                        <span className="truncate font-bold text-slate-700">{item.label}</span>
                                    </div>
                                    <div className="shrink-0 text-right tabular-nums">
                                        <span className="font-extrabold text-slate-900">
                                            {formatRupiah(item.nominal)}
                                        </span>
                                        <span className="ml-1.5 text-[9.5px] font-bold text-slate-400">
                                            ({item.persentase.toFixed(1).replace('.', ',')}%)
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Kanan: Realisasi per Program / Standar SNP */}
                    <div
                        style={{ borderColor: theme.cardBorder }}
                        className="col-span-7 rounded-2xl border bg-white p-4 shadow-sm"
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                                    Alokasi Penggunaan Dana
                                </p>
                                <h2 className="mt-0.5 text-[13.5px] font-black text-slate-900">
                                    Realisasi per Standar / Program SNP
                                </h2>
                            </div>
                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[9.5px] font-extrabold text-slate-600">
                                {program_snp.length} Program
                            </span>
                        </div>

                        {program_snp.length > 0 ? (
                            <div className="mt-3 space-y-2.5">
                                {program_snp.map((item, idx) => {
                                    const widthPct = Math.max(4, Math.round((item.nominal / maxProgramNominal) * 100));
                                    return (
                                        <div key={`${item.program}-${idx}`}>
                                            <div className="flex items-baseline justify-between gap-2 text-[10.5px]">
                                                <p className="min-w-0 truncate font-bold text-slate-800">
                                                    <span className="mr-1.5 font-extrabold text-slate-400">
                                                        {idx + 1}.
                                                    </span>
                                                    {item.program}
                                                </p>
                                                <p className="shrink-0 tabular-nums font-extrabold text-slate-900">
                                                    {formatRupiah(item.nominal)}
                                                    <span className="ml-1 text-[9.5px] font-bold text-slate-400">
                                                        ({item.persentase.toFixed(1).replace('.', ',')}%)
                                                    </span>
                                                </p>
                                            </div>
                                            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                                <div
                                                    style={{
                                                        width: `${widthPct}%`,
                                                        backgroundColor:
                                                            idx === 0
                                                                ? theme.accentColor
                                                                : idx === 1
                                                                  ? theme.secondaryAccent
                                                                  : theme.barColor,
                                                        opacity: idx > 1 ? Math.max(0.45, 0.9 - idx * 0.08) : 1,
                                                    }}
                                                    className="h-full rounded-full"
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="mt-8 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-[11px] font-semibold text-slate-400">
                                Belum ada transaksi realisasi belanja pada periode ini.
                            </div>
                        )}
                    </div>
                </div>

                {/* Grafik Tren Bulanan SVG (Opsional) */}
                {showMonthlyTrend && (
                    <div
                        style={{ borderColor: theme.cardBorder }}
                        className="rounded-2xl border bg-white p-4 shadow-sm"
                    >
                        <div className="mb-2 flex items-center justify-between gap-2">
                            <div>
                                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                                    Distribusi Waktu
                                </p>
                                <h2 className="text-[13px] font-black text-slate-900">
                                    Tren Realisasi Belanja Bulanan ({meta.periode_label})
                                </h2>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400">
                                Dalam Rupiah (Jt = Juta, Rb = Ribu)
                            </span>
                        </div>

                        <MonthlyBarChartSvg items={tren_bulanan} barColor={theme.barColor} accentColor={theme.secondaryAccent} />
                    </div>
                )}

                {/* Catatan Transparansi & Saluran Informasi */}
                {transparencyNote.trim() !== '' && (
                    <div
                        style={{
                            backgroundColor: theme.noticeBg,
                            borderColor: theme.noticeBorder,
                            color: theme.noticeText,
                        }}
                        className="rounded-2xl border px-4 py-3"
                    >
                        <p className="text-[9.5px] font-black uppercase tracking-[0.15em] opacity-75">
                            Informasi &amp; Keterbukaan Publik
                        </p>
                        <p className="mt-0.5 break-words text-[11px] font-semibold leading-relaxed">
                            {transparencyNote.trim()}
                        </p>
                    </div>
                )}

                {/* Blok Tanda Tangan Resmi (Opsional) */}
                {showSignatures && (
                    <div
                        style={{ borderColor: theme.cardBorder }}
                        className={`rounded-2xl border bg-white shadow-sm ${isCompact ? 'px-4 py-3' : 'px-5 py-4'}`}
                    >
                        <div className="mb-2 flex items-center justify-between text-[10px] font-semibold text-slate-500">
                            <span>Diterbitkan secara resmi sebagai bentuk akuntabilitas pengelolaan Dana BOSP</span>
                            <span className="font-bold text-slate-700">
                                {sekolah.kabupaten_kota ? `${sekolah.kabupaten_kota}, ` : ''}
                                {meta.generated_at_formatted}
                            </span>
                        </div>

                        <div className={`grid grid-cols-3 gap-4 text-center ${isCompact ? 'pt-1' : 'pt-2'}`}>
                            <SignatureColumn
                                role="Mengetahui, Kepala Sekolah"
                                name={penanggung_jawab.kepala_sekolah}
                                nip={hideNip ? 'Kepala Sekolah' : formatNip(penanggung_jawab.nip_kepala_sekolah)}
                                compact={isCompact}
                            />
                            <SignatureColumn
                                role="Bendahara Dana BOSP"
                                name={penanggung_jawab.bendahara}
                                nip={hideNip ? 'Bendahara BOSP' : formatNip(penanggung_jawab.nip_bendahara)}
                                compact={isCompact}
                            />
                            <SignatureColumn
                                role="Menyetujui, Ketua Komite"
                                name={penanggung_jawab.komite}
                                nip="Komite Sekolah"
                                compact={isCompact}
                            />
                        </div>
                    </div>
                )}

                {/* Footer Verifikasi */}
                <footer className="flex items-center justify-between px-1 pt-0.5 text-[9.5px] font-bold text-slate-400">
                    <span>Sumber Data: Sistem Informasi Keuangan Sekolah (SIKAS) · {meta.variant_label}</span>
                    <span>Dicetak pada {meta.generated_at_formatted}</span>
                </footer>
            </div>
        </div>
    );
});

export default PosterCanvas;

function KpiTile({
    label,
    value,
    sub,
    accent,
    borderColor,
    highlight = false,
}: {
    label: string;
    value: string;
    sub: string;
    accent: string;
    borderColor: string;
    highlight?: boolean;
}) {
    return (
        <div
            style={{
                borderColor: highlight ? accent : borderColor,
                borderWidth: highlight ? '1.5px' : '1px',
            }}
            className="relative overflow-hidden rounded-2xl bg-white p-3.5 shadow-sm"
        >
            <div
                style={{ backgroundColor: accent }}
                className="absolute inset-x-0 top-0 h-1"
            />
            <p className="mt-0.5 text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                {label}
            </p>
            <p
                style={{ color: highlight ? accent : '#0F172A' }}
                className="mt-1.5 truncate text-[14.5px] font-black leading-tight tracking-tight tabular-nums"
                title={value}
            >
                {value}
            </p>
            <p className="mt-1 truncate text-[9.5px] font-semibold text-slate-400">{sub}</p>
        </div>
    );
}

function DonutChartSvg({
    items,
    total,
    theme,
}: {
    items: PosterJenisBelanjaItem[];
    total: number;
    theme: PosterTheme;
}) {
    const size = 148;
    const strokeWidth = 22;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    const positiveItems = items.filter((item) => item.nominal > 0);
    const sliceSum = positiveItems.reduce((acc, item) => acc + item.nominal, 0);

    let cumulativePct = 0;
    const segments =
        sliceSum > 0
            ? positiveItems.map((item) => {
                  const pct = item.nominal / sliceSum;
                  const dashLength = pct * circumference;
                  const dashOffset = -cumulativePct * circumference;
                  cumulativePct += pct;
                  return {
                      key: item.key,
                      color: theme.chartPalette[item.color_key],
                      dashArray: `${dashLength} ${circumference}`,
                      dashOffset,
                  };
              })
            : [];

    return (
        <div className="relative flex items-center justify-center">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Diagram donat komposisi jenis belanja">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="#E2E8F0"
                    strokeWidth={strokeWidth}
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
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                    Total
                </span>
                <span className="mt-0.5 text-[12px] font-black text-slate-900 tabular-nums">
                    {formatCompactRupiah(total)}
                </span>
            </div>
        </div>
    );
}

function MonthlyBarChartSvg({
    items,
    barColor,
    accentColor,
}: {
    items: PosterTrenBulananItem[];
    barColor: string;
    accentColor: string;
}) {
    const width = 710;
    const height = 118;
    const chartTop = 20;
    const chartBottom = 94;
    const chartHeight = chartBottom - chartTop;
    const count = Math.max(items.length, 1);
    const maxVal = Math.max(...items.map((item) => item.nominal), 1);
    const slotWidth = width / count;
    const barWidth = Math.min(34, Math.max(18, slotWidth * 0.52));

    return (
        <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-[118px] w-full"
            role="img"
            aria-label="Grafik batang realisasi belanja bulanan"
        >
            {/* Baseline */}
            <line x1={0} y1={chartBottom} x2={width} y2={chartBottom} stroke="#E2E8F0" strokeWidth={1} />
            <line
                x1={0}
                y1={chartTop + chartHeight / 2}
                x2={width}
                y2={chartTop + chartHeight / 2}
                stroke="#F1F5F9"
                strokeDasharray="4 4"
                strokeWidth={1}
            />

            {items.map((item, idx) => {
                const barH = item.nominal > 0 ? Math.max(4, (item.nominal / maxVal) * chartHeight) : 2;
                const x = idx * slotWidth + (slotWidth - barWidth) / 2;
                const y = chartBottom - barH;
                const isPeak = item.nominal > 0 && item.nominal === maxVal;

                return (
                    <g key={item.bulan}>
                        <rect
                            x={x}
                            y={y}
                            width={barWidth}
                            height={barH}
                            rx={6}
                            fill={item.nominal > 0 ? (isPeak ? accentColor : barColor) : '#E2E8F0'}
                            opacity={item.nominal > 0 ? (isPeak ? 1 : 0.85) : 0.7}
                        />
                        {item.nominal > 0 && (
                            <text
                                x={x + barWidth / 2}
                                y={Math.max(12, y - 5)}
                                textAnchor="middle"
                                fontSize="9"
                                fontWeight="800"
                                fill="#334155"
                            >
                                {formatCompactRupiah(item.nominal)}
                            </text>
                        )}
                        <text
                            x={x + barWidth / 2}
                            y={height - 6}
                            textAnchor="middle"
                            fontSize="9.5"
                            fontWeight="700"
                            fill="#64748B"
                        >
                            {item.label}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
}

function SignatureColumn({
    role,
    name,
    nip,
    compact = false,
}: {
    role: string;
    name: string;
    nip: string;
    compact?: boolean;
}) {
    return (
        <div className="flex flex-col items-center">
            <p className="text-[10px] font-bold text-slate-600">{role}</p>
            <div className={`w-36 border-b border-dashed border-slate-300 ${compact ? 'my-4 h-7' : 'my-6 h-8'}`} />
            <p className="max-w-[200px] truncate text-[11px] font-extrabold text-slate-900" title={name}>
                {name}
            </p>
            <p className="max-w-[200px] truncate text-[9.5px] font-semibold text-slate-500" title={nip}>
                {nip}
            </p>
        </div>
    );
}
