import type { StatusTone } from '@/Components/ui/StatusBadge';
import type { ActivitySeverity } from './types';

export const SEVERITY_TONE: Record<ActivitySeverity, StatusTone> = {
    info: 'info',
    warning: 'warning',
    critical: 'danger',
};

export const VARIANT_TONE: Record<string, StatusTone> = {
    reguler: 'violet',
    kinerja: 'info',
    silpa: 'warning',
    kinerja_silpa: 'success',
};

export function getStatusTone(statusCode: number | null): StatusTone {
    if (statusCode !== null && statusCode >= 500) return 'danger';
    if (statusCode !== null && statusCode >= 400) return 'warning';
    return 'success';
}

export function getOutcomeBadge(statusCode: number | null): { label: string; tone: StatusTone } {
    if (statusCode === null || Number.isNaN(statusCode) || statusCode < 200) {
        return { label: 'Tercatat', tone: 'neutral' };
    }
    if (statusCode === 403) {
        return { label: 'Akses Ditolak', tone: 'warning' };
    }
    if (statusCode === 401) {
        return { label: 'Gagal Masuk', tone: 'warning' };
    }
    if (statusCode === 429) {
        return { label: 'Batas Percobaan', tone: 'warning' };
    }
    if (statusCode >= 500) {
        return { label: 'Gagal Sistem', tone: 'danger' };
    }
    if (statusCode >= 400) {
        return { label: 'Ditolak', tone: 'warning' };
    }
    return { label: 'Berhasil', tone: 'success' };
}

export function formatRoleLabel(role: string | null): string {
    if (!role) return 'Sistem / Tamu';
    if (role === 'bendahara') return 'Bendahara / Admin';
    if (role === 'kepala_sekolah') return 'Kepala Sekolah';
    return role
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

export function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'S';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export interface ParsedDeviceSummary {
    browser: string;
    os: string;
    isMobile: boolean;
    summary: string;
}

/**
 * Mengubah string User-Agent mentah menjadi ringkasan browser & sistem operasi yang ramah dibaca.
 */
export function parseUserAgentSummary(userAgent: string | null): ParsedDeviceSummary {
    const ua = (userAgent ?? '').trim();
    if (!ua) {
        return {
            browser: 'Perangkat Tidak Dikenal',
            os: 'Sistem Tidak Terdeteksi',
            isMobile: false,
            summary: 'Perangkat Tidak Dikenal',
        };
    }

    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);

    let browser = 'Browser Web';
    if (/Edg\/|EdgA\/|EdgiOS\//i.test(ua)) {
        browser = 'Microsoft Edge';
    } else if (/OPR\/|Opera/i.test(ua)) {
        browser = 'Opera';
    } else if (/Firefox\/|FxiOS\//i.test(ua)) {
        browser = 'Mozilla Firefox';
    } else if (/Chrome\/|CriOS\//i.test(ua)) {
        browser = 'Google Chrome';
    } else if (/Safari\//i.test(ua)) {
        browser = 'Safari';
    } else if (/Symfony|curl|Postman/i.test(ua)) {
        browser = 'Klien Otomatis';
    }

    let os = 'Sistem Lainnya';
    if (/Windows/i.test(ua)) {
        os = 'Windows';
    } else if (/Android/i.test(ua)) {
        os = 'Android';
    } else if (/iPhone|iPad|iPod/i.test(ua)) {
        os = 'iOS / iPadOS';
    } else if (/Mac OS X|Macintosh/i.test(ua)) {
        os = 'macOS';
    } else if (/Linux/i.test(ua)) {
        os = 'Linux';
    }

    return {
        browser,
        os,
        isMobile,
        summary: `${browser} · ${os}`,
    };
}
