import type { ApexOptions } from 'apexcharts';

/**
 * Palet & konfigurasi dasar grafik SIKAS Neo-Bento.
 * Lime untuk sorotan, violet untuk data utama, peach/sky untuk seri pendukung.
 */
export const SIKAS_CHART_COLORS = [
    '#7C5CFF',
    '#D8F275',
    '#FFB489',
    '#7DD3FC',
    '#F472B6',
    '#34D399',
    '#FBBF24',
    '#94A3B8',
];

export const SIKAS_CHART_FONT = 'Plus Jakarta Sans, Figtree, sans-serif';

export function sikasChartBase(dark: boolean): ApexOptions {
    const labelColor = dark ? '#94A3B8' : '#64748B';
    const gridColor = dark ? 'rgba(255,255,255,0.07)' : 'rgba(30,29,46,0.07)';

    return {
        chart: {
            background: 'transparent',
            fontFamily: SIKAS_CHART_FONT,
            toolbar: { show: false },
            zoom: { enabled: false },
            foreColor: labelColor,
        },
        theme: { mode: dark ? 'dark' : 'light' },
        colors: SIKAS_CHART_COLORS,
        grid: {
            borderColor: gridColor,
            strokeDashArray: 4,
            padding: { top: 0, right: 0, bottom: 0, left: 8 },
        },
        dataLabels: { enabled: false },
        legend: {
            fontSize: '10px',
            fontWeight: 700,
            labels: { colors: labelColor },
            markers: { size: 5, strokeWidth: 0 },
            itemMargin: { horizontal: 10, vertical: 4 },
        },
        xaxis: {
            labels: {
                style: {
                    colors: labelColor,
                    fontSize: '10px',
                    fontWeight: 600,
                    fontFamily: SIKAS_CHART_FONT,
                },
            },
            axisBorder: { show: false },
            axisTicks: { show: false },
        },
        yaxis: {
            labels: {
                style: {
                    colors: labelColor,
                    fontSize: '10px',
                    fontWeight: 600,
                    fontFamily: SIKAS_CHART_FONT,
                },
            },
        },
        tooltip: {
            theme: dark ? 'dark' : 'light',
            style: { fontFamily: SIKAS_CHART_FONT },
        },
    };
}

/** Tooltip kustom bernuansa ink + lime (dipakai untuk chart utama). */
export const SIKAS_TOOLTIP_STYLE = {
    background: '#14131F',
    border: '0',
    borderRadius: '12px',
    boxShadow: '0 18px 40px -24px rgba(9,9,20,0.8)',
    color: '#F8FAFC',
    fontSize: '11px',
};
