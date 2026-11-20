export interface UraianDisplayable {
    uraian?: string | null;
    uraian_arkas?: string | null;
}

/**
 * Mengembalikan uraian tampilan sesuai mode toggle Summary (ARKAS vs SIKAS).
 * Jika mode ARKAS aktif tetapi `uraian_arkas` kosong, fallback bersih ke `uraian` SIKAS.
 */
export function getDisplayUraian(item: UraianDisplayable | null | undefined, showArkasUraian = false): string {
    if (!item) {
        return '';
    }

    if (showArkasUraian) {
        const arkas = typeof item.uraian_arkas === 'string' ? item.uraian_arkas.trim() : '';
        if (arkas !== '') {
            return arkas;
        }
    }

    return item.uraian ?? '';
}
