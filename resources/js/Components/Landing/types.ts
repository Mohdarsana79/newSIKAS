export type BudgetVariantKey = 'reguler' | 'kinerja' | 'silpa' | 'kinerja_silpa';

export interface WelcomeSchoolIdentity {
    nama_sekolah: string;
    npsn: string;
    jenjang_sekolah: string;
    kabupaten_kota: string;
}

export interface WelcomeVariantSummary {
    key: BudgetVariantKey;
    label: string;
    short_label: string;
    has_data: boolean;
    tahun: number;
    pagu_anggaran: number;
    total_realisasi: number;
    sisa_dana: number;
    persentase_serapan: number;
    jumlah_transaksi: number;
    status_persetujuan: 'disetujui' | 'draft' | 'kosong';
    monthly_realisasi: number[];
    monthly_cumulative: number[];
    last_active_month_index: number;
}

export interface WelcomeStatsSummary {
    tahun: number;
    has_data: boolean;
    total_transaksi_bku: number;
    total_pagu: number;
    total_realisasi: number;
    persentase_serapan: number;
}

export interface WelcomeSummaryData {
    tahun: number;
    school: WelcomeSchoolIdentity | null;
    variants: WelcomeVariantSummary[];
    stats: WelcomeStatsSummary;
}

export interface CompactRupiahParts {
    value: number;
    decimals: number;
    prefix: string;
    suffix: string;
    formatted: string;
}

export interface CumulativeChartPoint {
    month: string;
    x: number;
    y: number;
    nominal: number;
    value: string;
}

export interface CumulativeChartGeometry {
    linePath: string;
    areaPath: string;
    points: CumulativeChartPoint[];
}

export const LANDING_MONTHS = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'Mei',
    'Jun',
    'Jul',
    'Agu',
    'Sep',
    'Okt',
    'Nov',
    'Des',
] as const;

export function formatPercentId(value: number): string {
    return `${value.toFixed(1).replace('.', ',')}%`;
}

export function formatCompactRupiahParts(nominal: number): CompactRupiahParts {
    const safe = Number.isFinite(nominal) ? Math.max(0, nominal) : 0;

    if (safe >= 1_000_000_000) {
        const value = Math.round((safe / 1_000_000_000) * 10) / 10;
        return {
            value,
            decimals: 1,
            prefix: 'Rp ',
            suffix: ' M',
            formatted: `Rp ${value.toFixed(1).replace('.', ',')} M`,
        };
    }

    if (safe >= 1_000_000) {
        const value = Math.round((safe / 1_000_000) * 10) / 10;
        return {
            value,
            decimals: 1,
            prefix: 'Rp ',
            suffix: ' Jt',
            formatted: `Rp ${value.toFixed(1).replace('.', ',')} Jt`,
        };
    }

    if (safe >= 1_000) {
        const value = Math.round(safe / 1_000);
        return {
            value,
            decimals: 0,
            prefix: 'Rp ',
            suffix: ' Rb',
            formatted: `Rp ${value.toLocaleString('id-ID')} Rb`,
        };
    }

    const value = Math.round(safe);
    return {
        value,
        decimals: 0,
        prefix: 'Rp ',
        suffix: '',
        formatted: `Rp ${value.toLocaleString('id-ID')}`,
    };
}

/**
 * Membangun 12 titik koordinat & kurva cubic Bezier monoton yang mulus (tanpa overshoot)
 * pada kanvas SVG `420 × 148` (rentang X: 18..402, rentang Y: 18..136, baseline area: 140).
 */
export function buildCumulativeChartGeometry(
    cumulativeValues: readonly number[],
    pagu: number,
): CumulativeChartGeometry {
    const xStart = 18;
    const xEnd = 402;
    const yTop = 18;
    const yBottom = 136;
    const baselineY = 140;

    const normalized = LANDING_MONTHS.map((_, idx) => {
        const raw = cumulativeValues[idx];
        return Number.isFinite(raw) ? Math.max(0, raw) : 0;
    });

    const maxCumulative = Math.max(...normalized, 0);
    const scaleMax = Math.max(pagu > 0 ? pagu : 0, maxCumulative);

    const points: CumulativeChartPoint[] = LANDING_MONTHS.map((month, idx) => {
        const x = Number((xStart + ((xEnd - xStart) * idx) / 11).toFixed(1));
        const nominal = normalized[idx];
        const ratio = scaleMax > 0 ? Math.min(1, nominal / scaleMax) : 0;
        const y =
            maxCumulative <= 0
                ? yBottom
                : Number((yBottom - ratio * (yBottom - yTop)).toFixed(1));

        return {
            month,
            x,
            y,
            nominal,
            value: formatCompactRupiahParts(nominal).formatted,
        };
    });

    let linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const midX = Number(((prev.x + curr.x) / 2).toFixed(1));
        linePath += ` C ${midX} ${prev.y}, ${midX} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    const last = points[points.length - 1];
    const areaPath = `${linePath} L ${last.x} ${baselineY} L ${points[0].x} ${baselineY} Z`;

    return {
        linePath,
        areaPath,
        points,
    };
}

export function createEmptyWelcomeSummary(year = new Date().getFullYear()): WelcomeSummaryData {
    const emptyMonths = Array<number>(12).fill(0);
    const definitions: Array<{ key: BudgetVariantKey; label: string; short_label: string }> = [
        { key: 'reguler', label: 'BOSP Reguler', short_label: 'BOSP Reguler' },
        { key: 'kinerja', label: 'BOSP Kinerja', short_label: 'BOSP Kinerja' },
        { key: 'silpa', label: 'SiLPA BOSP Reguler', short_label: 'SiLPA Reguler' },
        { key: 'kinerja_silpa', label: 'SiLPA BOSP Kinerja', short_label: 'SiLPA Kinerja' },
    ];

    return {
        tahun: year,
        school: null,
        variants: definitions.map((def) => ({
            key: def.key,
            label: def.label,
            short_label: def.short_label,
            has_data: false,
            tahun: year,
            pagu_anggaran: 0,
            total_realisasi: 0,
            sisa_dana: 0,
            persentase_serapan: 0,
            jumlah_transaksi: 0,
            status_persetujuan: 'kosong',
            monthly_realisasi: [...emptyMonths],
            monthly_cumulative: [...emptyMonths],
            last_active_month_index: 11,
        })),
        stats: {
            tahun: year,
            has_data: false,
            total_transaksi_bku: 0,
            total_pagu: 0,
            total_realisasi: 0,
            persentase_serapan: 0,
        },
    };
}
