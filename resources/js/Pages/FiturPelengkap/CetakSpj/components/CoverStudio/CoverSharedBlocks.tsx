import type React from 'react';
import { SPJ_PAPER_SPECS, type PaperDimensionSpec } from '../../services/spjPdfAssembler';
import type { SpjCoverConfig, SpjManifest, SpjPaperSize } from '../../types';
import { BospOfficialLogoSvg } from './CoverAssets';
import {
    formatRupiah,
    resolveCoverPalette,
    resolveSchoolPhotoUri,
    type CoverPaletteSpec,
} from './coverThemes';
import QrCodeSvg from './QrCodeSvg';

export interface CoverFinanceCard {
    label: string;
    value: string;
}

export interface CoverResolvedData {
    spec: PaperDimensionSpec;
    palette: CoverPaletteSpec;
    inkSaver: boolean;
    isShortPaper: boolean;
    instansiLines: string[];
    schoolName: string;
    schoolAddress: string;
    schoolContact: string;
    periodeText: string;
    labelJilid: string;
    ksName: string;
    ksNip: string;
    bendaharaName: string;
    bendaharaNip: string;
    logoDaerah: string | null;
    logoSekolah: string | null;
    rawSchoolPhoto: string | null;
    activeSchoolPhoto: string | null;
    qrPayload: string;
    financeCards: CoverFinanceCard[];
    baseStyle: React.CSSProperties;
}

export function buildCoverResolvedData(
    manifest: SpjManifest,
    config: SpjCoverConfig,
    paperSize: SpjPaperSize,
): CoverResolvedData {
    const spec = SPJ_PAPER_SPECS[paperSize];
    const palette = resolveCoverPalette(config);
    const inkSaver = config.ink_saver;
    const isShortPaper = spec.designHeight <= 1130;

    const instansiLines = (config.instansi_atas || '')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

    const schoolName =
        (config.nama_sekolah_override ?? '').trim() || manifest.sekolah.nama_sekolah;
    const schoolAddress =
        (config.alamat_override ?? '').trim() || manifest.sekolah.alamat_lengkap;
    const schoolContact = (config.kontak_sekolah_override ?? '').trim();
    const periodeText =
        (config.subjudul_override ?? '').trim() || manifest.meta.periode_label;
    const labelJilid = (config.label_jilid ?? '').trim();
    const ksName =
        (config.kepala_sekolah_override ?? '').trim() ||
        manifest.penanggung_jawab.kepala_sekolah ||
        '.........................';
    const ksNip =
        (config.nip_kepala_sekolah_override ?? '').trim() ||
        manifest.penanggung_jawab.nip_kepala_sekolah;
    const bendaharaName =
        (config.bendahara_override ?? '').trim() ||
        manifest.penanggung_jawab.bendahara ||
        '.........................';
    const bendaharaNip =
        (config.nip_bendahara_override ?? '').trim() ||
        manifest.penanggung_jawab.nip_bendahara;

    const logoDaerah = config.show_logo_daerah ? manifest.sekolah.logo_daerah_data_uri : null;
    const logoSekolah = config.show_logo_sekolah ? manifest.sekolah.logo_sekolah_data_uri : null;

    const rawSchoolPhoto = resolveSchoolPhotoUri(manifest, config);
    const activeSchoolPhoto = (config.show_foto_sekolah ?? true) ? rawSchoolPhoto : null;

    const shortSchool = schoolName.slice(0, 18);
    const qrPayload = `${manifest.sekolah.npsn || '-'}|${shortSchool}|${manifest.meta.variant}|${manifest.meta.tahun}|${manifest.meta.periode_type}|Rp${Math.round(manifest.ringkasan_keuangan.total_realisasi)}|${manifest.meta.generated_at_formatted}`;

    const financeCards: CoverFinanceCard[] = [
        {
            label: 'Pagu Anggaran',
            value: formatRupiah(manifest.ringkasan_keuangan.pagu_anggaran),
        },
        {
            label: 'Dana Diterima',
            value: formatRupiah(manifest.ringkasan_keuangan.dana_diterima),
        },
        {
            label: 'Total Realisasi',
            value: formatRupiah(manifest.ringkasan_keuangan.total_realisasi),
        },
        {
            label: 'Serapan & Transaksi',
            value: `${manifest.ringkasan_keuangan.persentase_serapan_aktual}% · ${manifest.ringkasan_keuangan.jumlah_transaksi} trx`,
        },
    ];

    const baseStyle: React.CSSProperties = {
        width: `${spec.designWidth}px`,
        height: `${spec.designHeight}px`,
        fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif",
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: inkSaver ? '#FFFFFF' : palette.surfaceTint,
        color: palette.darkText,
        display: 'flex',
        flexDirection: 'column',
    };

    return {
        spec,
        palette,
        inkSaver,
        isShortPaper,
        instansiLines,
        schoolName,
        schoolAddress,
        schoolContact,
        periodeText,
        labelJilid,
        ksName,
        ksNip,
        bendaharaName,
        bendaharaNip,
        logoDaerah,
        logoSekolah,
        rawSchoolPhoto,
        activeSchoolPhoto,
        qrPayload,
        financeCards,
        baseStyle,
    };
}

export function CoverLogosRow({
    data,
    config,
    size = 62,
    invertFrame = false,
    includeBosp = false,
}: {
    data: CoverResolvedData;
    config: SpjCoverConfig;
    size?: number;
    invertFrame?: boolean;
    includeBosp?: boolean;
}) {
    const showBosp = includeBosp && (config.show_logo_bosp ?? true);
    if (!data.logoDaerah && !data.logoSekolah && !showBosp) {
        return null;
    }

    const boxStyle: React.CSSProperties = {
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '14px',
        backgroundColor: invertFrame ? 'rgba(255,255,255,0.95)' : '#FFFFFF',
        border: `1px solid ${invertFrame ? 'rgba(255,255,255,0.45)' : 'rgba(15,23,42,0.09)'}`,
        padding: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: data.inkSaver ? 'none' : '0 6px 18px rgba(15,23,42,0.08)',
        flexShrink: 0,
    };

    return (
        <div className="flex items-center gap-2.5" style={{ flexShrink: 0 }}>
            {data.logoDaerah && (
                <div style={boxStyle}>
                    <img
                        src={data.logoDaerah}
                        alt="Logo Daerah"
                        className="max-h-full max-w-full object-contain"
                    />
                </div>
            )}
            {data.logoSekolah && (
                <div style={boxStyle}>
                    <img
                        src={data.logoSekolah}
                        alt="Logo Sekolah"
                        className="max-h-full max-w-full object-contain"
                    />
                </div>
            )}
            {showBosp && (
                <div
                    style={{
                        backgroundColor: invertFrame ? 'rgba(255,255,255,0.95)' : '#FFFFFF',
                        border: `1px solid ${invertFrame ? 'rgba(255,255,255,0.45)' : 'rgba(15,23,42,0.09)'}`,
                        borderRadius: '14px',
                        padding: '6px 10px',
                        height: `${size}px`,
                        display: 'flex',
                        alignItems: 'center',
                        boxShadow: data.inkSaver ? 'none' : '0 6px 18px rgba(15,23,42,0.08)',
                    }}
                >
                    <BospOfficialLogoSvg
                        width={Math.round(size * 1.48)}
                        primaryColor={data.palette.primary}
                        inkSaver={data.inkSaver}
                    />
                </div>
            )}
        </div>
    );
}

export function CoverFinanceStrip({
    data,
    config,
    compact = false,
}: {
    data: CoverResolvedData;
    config: SpjCoverConfig;
    compact?: boolean;
}) {
    if (!config.show_ringkasan_keuangan) return null;
    const { palette } = data;

    return (
        <div className={`grid grid-cols-2 ${compact ? 'gap-2' : 'gap-3'}`}>
            {data.financeCards.map((card, i) => (
                <div
                    key={card.label}
                    style={{
                        backgroundColor: '#FFFFFF',
                        border: `1px solid ${i === 2 ? palette.accent : 'rgba(15,23,42,0.1)'}`,
                        borderLeft: `4px solid ${i % 2 === 0 ? palette.primary : palette.accent}`,
                        borderRadius: '13px',
                        padding: compact ? '9px 12px' : '12px 15px',
                    }}
                >
                    <div
                        style={{
                            fontSize: compact ? '9px' : '9.5px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            color: palette.mutedText,
                        }}
                    >
                        {card.label}
                    </div>
                    <div
                        style={{
                            fontSize: compact ? '13.5px' : '15.5px',
                            fontWeight: 800,
                            color: palette.darkText,
                            marginTop: '2px',
                        }}
                    >
                        {card.value}
                    </div>
                </div>
            ))}
        </div>
    );
}

export function CoverSignatureFooter({
    data,
    config,
    darkBg = false,
    compact = false,
}: {
    data: CoverResolvedData;
    config: SpjCoverConfig;
    darkBg?: boolean;
    compact?: boolean;
}) {
    if (!config.show_penanggung_jawab && !config.show_qr_code) {
        return null;
    }

    const { palette } = data;
    const textPrimary = darkBg ? '#FFFFFF' : palette.darkText;
    const textMuted = darkBg ? 'rgba(255,255,255,0.74)' : palette.mutedText;
    const cardBg = darkBg ? 'rgba(255,255,255,0.09)' : '#FFFFFF';
    const borderCol = darkBg ? 'rgba(255,255,255,0.2)' : 'rgba(15,23,42,0.1)';
    const qrSize = compact ? 62 : 70;

    return (
        <div className="flex items-end justify-between gap-4">
            {config.show_penanggung_jawab ? (
                <div className={`grid flex-1 grid-cols-2 ${compact ? 'gap-2.5' : 'gap-3.5'}`}>
                    <div
                        style={{
                            backgroundColor: cardBg,
                            border: `1px solid ${borderCol}`,
                            borderRadius: '13px',
                            padding: compact ? '9px 12px' : '11px 14px',
                        }}
                    >
                        <div
                            style={{
                                fontSize: '9px',
                                fontWeight: 700,
                                letterSpacing: '0.12em',
                                textTransform: 'uppercase',
                                color: textMuted,
                            }}
                        >
                            Kepala Sekolah
                        </div>
                        <div
                            style={{
                                fontSize: compact ? '12.5px' : '13.5px',
                                fontWeight: 800,
                                color: textPrimary,
                                marginTop: '3px',
                            }}
                        >
                            {data.ksName}
                        </div>
                        {data.ksNip && (
                            <div
                                style={{
                                    fontSize: '10px',
                                    color: textMuted,
                                    marginTop: '1px',
                                }}
                            >
                                NIP. {data.ksNip}
                            </div>
                        )}
                    </div>
                    <div
                        style={{
                            backgroundColor: cardBg,
                            border: `1px solid ${borderCol}`,
                            borderRadius: '13px',
                            padding: compact ? '9px 12px' : '11px 14px',
                        }}
                    >
                        <div
                            style={{
                                fontSize: '9px',
                                fontWeight: 700,
                                letterSpacing: '0.12em',
                                textTransform: 'uppercase',
                                color: textMuted,
                            }}
                        >
                            Bendahara BOSP
                        </div>
                        <div
                            style={{
                                fontSize: compact ? '12.5px' : '13.5px',
                                fontWeight: 800,
                                color: textPrimary,
                                marginTop: '3px',
                            }}
                        >
                            {data.bendaharaName}
                        </div>
                        {data.bendaharaNip && (
                            <div
                                style={{
                                    fontSize: '10px',
                                    color: textMuted,
                                    marginTop: '1px',
                                }}
                            >
                                NIP. {data.bendaharaNip}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex-1" />
            )}

            {config.show_qr_code && (
                <div
                    style={{
                        backgroundColor: '#FFFFFF',
                        border: `1px solid ${borderCol}`,
                        borderRadius: '13px',
                        padding: compact ? '6px' : '7px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '3px',
                        flexShrink: 0,
                    }}
                >
                    <QrCodeSvg
                        value={data.qrPayload}
                        size={qrSize}
                        fgColor={palette.primary}
                        bgColor="#FFFFFF"
                    />
                    <span
                        style={{
                            fontSize: '7.5px',
                            fontWeight: 800,
                            letterSpacing: '0.12em',
                            color: palette.mutedText,
                        }}
                    >
                        VERIFIKASI SIKAS
                    </span>
                </div>
            )}
        </div>
    );
}
