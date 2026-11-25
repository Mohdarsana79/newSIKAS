import {
    BospOfficialLogoSvg,
    NusantaraPatternSvg,
    OpenBookDividerSvg,
    TutWuriEmblemSvg,
} from '../CoverAssets';
import {
    CoverFinanceStrip,
    CoverLogosRow,
    CoverSignatureFooter,
} from '../CoverSharedBlocks';
import SchoolPhotoFrame from '../SchoolPhotoFrame';
import type { CoverLayoutRenderProps } from './ClassicCoverLayouts';

const DEFAULT_BADGE = 'LAPORAN PERTANGGUNGJAWABAN (LPJ / SPJ)';

/**
 * 5 Preset Cover Modern Baru:
 * 6. bosp_wave          — Gelombang BOSP Resmi (adaptasi poster resmi + kop & wave berlapis)
 * 7. split_magazine     — Split Magazine Arsitektural
 * 8. aurora_glass       — Aurora Glassmorphism Modern
 * 9. nusantara_heritage — Nusantara Heritage Modern (Batik Kawung/Geometris & Kubah)
 * 10. swiss_ribbon      — Swiss Diagonal Ribbon
 */
export function ModernCoverLayout({ manifest, config, data }: CoverLayoutRenderProps) {
    const { palette, inkSaver, spec } = data;

    // ─── PRESET 6: GELOMBANG BOSP RESMI ──────────────────────────────────────
    if (config.layout === 'bosp_wave') {
        const hasExtraBlocks =
            config.show_ringkasan_keuangan ||
            config.show_penanggung_jawab ||
            config.show_qr_code;
        const wavePhotoHeight = data.isShortPaper
            ? hasExtraBlocks
                ? 176
                : 238
            : hasExtraBlocks
              ? 226
              : 306;

        const isDefaultBadge =
            config.badge_dokumen.trim().toUpperCase() === DEFAULT_BADGE ||
            config.badge_dokumen.trim() === '';
        const defaultJudul = `DANA ${manifest.meta.variant_label.toUpperCase()}`;
        const isDefaultJudul = config.judul_utama.trim().toUpperCase() === defaultJudul;
        const pillTitle = isDefaultJudul
            ? manifest.meta.variant === 'reguler'
                ? 'BOSP'
                : manifest.meta.variant_label.toUpperCase()
            : config.judul_utama;

        const showLeftEmblem = config.show_logo_daerah || config.show_logo_sekolah;
        const leftLogoSrc = data.logoDaerah || data.logoSekolah;
        const secondaryLogoSrc = data.logoDaerah && data.logoSekolah ? data.logoSekolah : null;

        const identityRows = [
            { label: 'Nama Sekolah', value: data.schoolName },
            { label: 'NPSN', value: manifest.sekolah.npsn || '-' },
            {
                label: 'Alamat',
                value: data.schoolAddress || '-',
            },
            {
                label: 'Kecamatan',
                value: manifest.sekolah.kecamatan || '-',
            },
            {
                label: 'Kabupaten/Kota',
                value: manifest.sekolah.kabupaten_kota || '-',
            },
            {
                label: 'Provinsi',
                value: manifest.sekolah.provinsi || '-',
            },
        ];

        return (
            <div
                style={{
                    flex: 1,
                    backgroundColor: '#FFFFFF',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                }}
            >
                {/* Sinar langit diagonal lembut di bagian atas */}
                {!inkSaver && (
                    <svg
                        width={spec.designWidth}
                        height="420"
                        viewBox={`0 0 ${spec.designWidth} 420`}
                        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
                    >
                        <defs>
                            <linearGradient id="bospSkyTop" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={palette.surfaceTint} />
                                <stop offset="100%" stopColor="#FFFFFF" />
                            </linearGradient>
                        </defs>
                        <rect width={spec.designWidth} height="420" fill="url(#bospSkyTop)" />
                        <polygon
                            points={`0,0 240,0 90,420 0,420`}
                            fill={palette.secondary}
                            opacity="0.05"
                        />
                        <polygon
                            points={`${spec.designWidth - 260},0 ${spec.designWidth},0 ${spec.designWidth},360 ${spec.designWidth - 90},420`}
                            fill={palette.secondary}
                            opacity="0.06"
                        />
                    </svg>
                )}

                {/* 1. Kop Resmi Atas */}
                <div
                    style={{
                        position: 'relative',
                        zIndex: 2,
                        padding: data.isShortPaper ? '22px 38px 0 38px' : '28px 42px 0 42px',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '16px',
                            paddingBottom: '14px',
                            borderBottom: `2.5px solid ${palette.primary}`,
                        }}
                    >
                        {/* Kiri: Emblem Daerah/Tut Wuri + Garis Vertikal + Teks Instansi */}
                        <div className="flex min-w-0 flex-1 items-center gap-3.5">
                            {showLeftEmblem && (
                                <>
                                    {leftLogoSrc ? (
                                        <img
                                            src={leftLogoSrc}
                                            alt="Logo Instansi"
                                            style={{
                                                width: '68px',
                                                height: '68px',
                                                objectFit: 'contain',
                                                flexShrink: 0,
                                            }}
                                        />
                                    ) : (
                                        <TutWuriEmblemSvg size={68} />
                                    )}

                                    <div
                                        style={{
                                            width: '2.5px',
                                            alignSelf: 'stretch',
                                            backgroundColor: palette.primary,
                                            borderRadius: '999px',
                                            opacity: 0.85,
                                            flexShrink: 0,
                                        }}
                                    />
                                </>
                            )}

                            <div className="min-w-0 flex-1">
                                {data.instansiLines.map((line, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            fontSize: '12px',
                                            fontWeight: 800,
                                            letterSpacing: '0.05em',
                                            color: palette.darkText,
                                            lineHeight: 1.28,
                                        }}
                                    >
                                        {line}
                                    </div>
                                ))}
                                <div
                                    style={{
                                        fontSize: '16px',
                                        fontWeight: 900,
                                        color: palette.primary,
                                        lineHeight: 1.25,
                                        marginTop: '2px',
                                    }}
                                >
                                    {data.schoolName}
                                </div>
                                {data.schoolAddress && (
                                    <div
                                        style={{
                                            fontSize: '11px',
                                            fontStyle: 'italic',
                                            fontWeight: 600,
                                            color: palette.mutedText,
                                            marginTop: '1px',
                                        }}
                                    >
                                        {data.schoolAddress}
                                    </div>
                                )}
                                {(data.schoolContact || manifest.sekolah.npsn) && (
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            fontSize: '10.5px',
                                            fontStyle: 'italic',
                                            fontWeight: 700,
                                            color: palette.primary,
                                            marginTop: '2px',
                                        }}
                                    >
                                        <span
                                            style={{
                                                display: 'inline-block',
                                                width: '12px',
                                                height: '9px',
                                                backgroundColor: palette.primary,
                                                borderRadius: '2px',
                                            }}
                                        />
                                        <span>
                                            {data.schoolContact ||
                                                `NPSN: ${manifest.sekolah.npsn}`}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Kanan: Logo Sekolah pendamping (bila 2 logo aktif) + Logo Resmi BOSP */}
                        <div className="flex shrink-0 items-center gap-2.5">
                            {secondaryLogoSrc && (
                                <img
                                    src={secondaryLogoSrc}
                                    alt="Logo Sekolah"
                                    style={{
                                        width: '58px',
                                        height: '58px',
                                        objectFit: 'contain',
                                    }}
                                />
                            )}
                            {(config.show_logo_bosp ?? true) && (
                                <BospOfficialLogoSvg
                                    width={126}
                                    primaryColor={palette.primary}
                                    inkSaver={inkSaver}
                                />
                            )}
                        </div>
                    </div>

                    {/* 2. Hero Tipografi Tengah */}
                    <div
                        className="flex flex-col items-center text-center"
                        style={{ marginTop: data.isShortPaper ? '14px' : '22px' }}
                    >
                        {isDefaultBadge ? (
                            <>
                                <div
                                    style={{
                                        fontSize: data.isShortPaper ? '38px' : '46px',
                                        fontWeight: 900,
                                        letterSpacing: '0.04em',
                                        lineHeight: 1,
                                        color: palette.primary,
                                    }}
                                >
                                    LAPORAN
                                </div>
                                <div
                                    style={{
                                        fontSize: data.isShortPaper ? '22px' : '26px',
                                        fontWeight: 900,
                                        letterSpacing: '0.04em',
                                        lineHeight: 1.2,
                                        color: palette.darkText,
                                        marginTop: '3px',
                                    }}
                                >
                                    PERTANGGUNGJAWABAN
                                </div>
                            </>
                        ) : (
                            <div
                                style={{
                                    fontSize: data.isShortPaper ? '22px' : '26px',
                                    fontWeight: 900,
                                    letterSpacing: '0.06em',
                                    color: palette.primary,
                                    textTransform: 'uppercase',
                                }}
                            >
                                {config.badge_dokumen}
                            </div>
                        )}

                        {/* Kapsul Utama BOSP */}
                        <div
                            style={{
                                marginTop: '10px',
                                backgroundColor: inkSaver ? '#FFFFFF' : palette.primary,
                                color: inkSaver ? palette.primary : '#FFFFFF',
                                border: `3px solid ${palette.primary}`,
                                borderRadius: '999px',
                                padding: data.isShortPaper ? '6px 46px' : '8px 58px',
                                fontSize: isDefaultJudul
                                    ? data.isShortPaper
                                        ? '36px'
                                        : '44px'
                                    : data.isShortPaper
                                      ? '24px'
                                      : '28px',
                                fontWeight: 900,
                                letterSpacing: '0.04em',
                                lineHeight: 1.08,
                                boxShadow: inkSaver
                                    ? 'none'
                                    : `0 10px 24px ${palette.primary}33`,
                            }}
                        >
                            {pillTitle}
                        </div>

                        <div
                            style={{
                                marginTop: '8px',
                                fontSize: data.isShortPaper ? '14px' : '16px',
                                fontWeight: 800,
                                color: palette.primary,
                            }}
                        >
                            (Bantuan Operasional Satuan Pendidikan)
                        </div>

                        {/* Kapsul Periode */}
                        <div
                            style={{
                                marginTop: '8px',
                                backgroundColor: inkSaver ? '#F8FAFC' : palette.secondary,
                                color: inkSaver ? palette.primary : '#FFFFFF',
                                border: inkSaver ? `1.5px solid ${palette.primary}` : 'none',
                                borderRadius: '999px',
                                padding: '5px 26px',
                                fontSize: '14px',
                                fontWeight: 800,
                            }}
                        >
                            Periode : {data.periodeText}
                            {data.labelJilid !== '' ? ` · ${config.label_jilid}` : ''}
                        </div>

                        <div style={{ marginTop: '8px' }}>
                            <OpenBookDividerSvg color={palette.primary} lineWidth={88} />
                        </div>
                    </div>
                </div>

                {/* 3. Zona Foto Gedung Sekolah + Gelombang Tengah */}
                <div style={{ position: 'relative', zIndex: 2, marginTop: '4px' }}>
                    <SchoolPhotoFrame
                        photoUri={data.rawSchoolPhoto}
                        enabled={config.show_foto_sekolah ?? true}
                        focus={config.photo_focus ?? 'center'}
                        blend={config.photo_blend ?? 'balanced'}
                        inkSaver={inkSaver}
                        palette={palette}
                        mode="wave_showcase"
                        height={wavePhotoHeight}
                        fallbackWhenEmpty
                        fallbackWhenDisabled
                    />
                </div>

                {/* 4. Kartu Tabel Identitas + Ringkasan/Pengesahan Kompak */}
                <div
                    style={{
                        position: 'relative',
                        zIndex: 3,
                        padding: data.isShortPaper ? '4px 44px 0 44px' : '8px 48px 0 48px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: data.isShortPaper ? '8px' : '12px',
                    }}
                >
                    <div
                        style={{
                            backgroundColor: inkSaver ? '#FFFFFF' : palette.surfaceTint,
                            border: `1.5px solid ${palette.primary}45`,
                            borderRadius: '16px',
                            padding: data.isShortPaper ? '11px 20px' : '15px 24px',
                        }}
                    >
                        <div className="space-y-1">
                            {identityRows.map((row) => (
                                <div
                                    key={row.label}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'baseline',
                                        fontSize: data.isShortPaper ? '12px' : '13px',
                                        lineHeight: 1.38,
                                    }}
                                >
                                    <span
                                        style={{
                                            width: '132px',
                                            fontWeight: 800,
                                            color: palette.primary,
                                            flexShrink: 0,
                                        }}
                                    >
                                        {row.label}
                                    </span>
                                    <span
                                        style={{
                                            width: '14px',
                                            fontWeight: 800,
                                            color: palette.primary,
                                            flexShrink: 0,
                                        }}
                                    >
                                        :
                                    </span>
                                    <span
                                        style={{
                                            fontWeight: 700,
                                            color: palette.darkText,
                                            flex: 1,
                                        }}
                                    >
                                        {row.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {config.show_ringkasan_keuangan && (
                        <CoverFinanceStrip data={data} config={config} compact />
                    )}

                    {(config.show_penanggung_jawab || config.show_qr_code) && (
                        <CoverSignatureFooter data={data} config={config} compact />
                    )}
                </div>

                {/* 5. Footer Sekolah & Pita Gelombang Biru-Emas Bawah */}
                <div style={{ position: 'relative', zIndex: 2, marginTop: 'auto' }}>
                    <div
                        className="text-center"
                        style={{ padding: '8px 42px 4px 42px' }}
                    >
                        <div
                            style={{
                                fontSize: data.isShortPaper ? '15px' : '17px',
                                fontWeight: 900,
                                color: palette.primary,
                                letterSpacing: '0.03em',
                            }}
                        >
                            {data.schoolName}
                        </div>
                        <div className="mt-1 flex items-center justify-center gap-3">
                            <span
                                style={{
                                    height: '1.5px',
                                    width: '78px',
                                    backgroundColor: palette.primary,
                                    opacity: 0.45,
                                }}
                            />
                            <span
                                style={{
                                    fontSize: '12px',
                                    fontWeight: 800,
                                    letterSpacing: '0.24em',
                                    color: palette.darkText,
                                }}
                            >
                                TAHUN ANGGARAN {manifest.meta.tahun}
                            </span>
                            <span
                                style={{
                                    height: '1.5px',
                                    width: '78px',
                                    backgroundColor: palette.primary,
                                    opacity: 0.45,
                                }}
                            />
                        </div>
                    </div>

                    <svg
                        width={spec.designWidth}
                        height={data.isShortPaper ? 42 : 54}
                        viewBox="0 0 800 54"
                        preserveAspectRatio="none"
                        style={{ display: 'block' }}
                    >
                        {!inkSaver ? (
                            <>
                                <path
                                    d="M0,12 C260,52 540,42 800,4 L800,54 L0,54 Z"
                                    fill={palette.accent}
                                />
                                <path
                                    d="M0,18 C240,56 560,30 800,14 L800,54 L0,54 Z"
                                    fill={palette.secondary}
                                />
                                <path
                                    d="M0,28 C280,58 540,38 800,26 L800,54 L0,54 Z"
                                    fill={palette.primary}
                                />
                            </>
                        ) : (
                            <rect x="0" y="44" width="800" height="10" fill={palette.primary} />
                        )}
                    </svg>
                </div>
            </div>
        );
    }

    // ─── PRESET 7: SPLIT MAGAZINE ARSITEKTURAL ───────────────────────────────
    if (config.layout === 'split_magazine') {
        return (
            <div
                style={{
                    flex: 1,
                    backgroundColor: '#FFFFFF',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                }}
            >
                {/* Kolom aksen kanan atas bergaya majalah arsitektur */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        width: '308px',
                        height: data.isShortPaper ? '430px' : '486px',
                        backgroundColor: inkSaver ? '#F8FAFC' : palette.primary,
                        borderBottomLeftRadius: '44px',
                        borderLeft: inkSaver ? `3px solid ${palette.primary}` : 'none',
                        borderBottom: inkSaver ? `3px solid ${palette.primary}` : 'none',
                    }}
                />
                {config.show_geometric_pattern && !inkSaver && (
                    <div
                        style={{
                            position: 'absolute',
                            top: '24px',
                            right: '24px',
                            width: '120px',
                            height: '120px',
                            borderRadius: '999px',
                            border: `2px dashed ${palette.accent}`,
                            opacity: 0.35,
                        }}
                    />
                )}

                <div
                    style={{
                        position: 'relative',
                        zIndex: 2,
                        flex: 1,
                        padding: data.isShortPaper ? '38px 44px 34px 44px' : '46px 48px 40px 48px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                    }}
                >
                    {/* Split Hero */}
                    <div className="grid grid-cols-12 items-start gap-6">
                        <div className="col-span-7 pr-2">
                            <CoverLogosRow
                                data={data}
                                config={config}
                                size={56}
                                includeBosp
                            />

                            <div style={{ marginTop: '20px' }}>
                                {data.instansiLines.map((line, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            fontSize: '11.5px',
                                            fontWeight: 800,
                                            letterSpacing: '0.14em',
                                            color: palette.mutedText,
                                            lineHeight: 1.4,
                                        }}
                                    >
                                        {line}
                                    </div>
                                ))}
                            </div>

                            <div className="mt-4 flex flex-wrap items-center gap-2">
                                <span
                                    style={{
                                        backgroundColor: palette.accent,
                                        color: '#0F172A',
                                        fontSize: '10px',
                                        fontWeight: 900,
                                        letterSpacing: '0.16em',
                                        padding: '5px 12px',
                                        borderRadius: '6px',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    {config.badge_dokumen}
                                </span>
                                {data.labelJilid !== '' && (
                                    <span
                                        style={{
                                            border: `1.5px solid ${palette.primary}`,
                                            color: palette.primary,
                                            fontSize: '10px',
                                            fontWeight: 800,
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                        }}
                                    >
                                        {config.label_jilid}
                                    </span>
                                )}
                            </div>

                            <h1
                                style={{
                                    marginTop: '16px',
                                    fontSize: data.isShortPaper ? '38px' : '44px',
                                    fontWeight: 900,
                                    lineHeight: 1.06,
                                    letterSpacing: '-0.025em',
                                    color: palette.primary,
                                }}
                            >
                                {config.judul_utama}
                            </h1>

                            <div
                                style={{
                                    marginTop: '14px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    fontSize: '17px',
                                    fontWeight: 800,
                                    color: palette.darkText,
                                }}
                            >
                                <span
                                    style={{
                                        width: '32px',
                                        height: '4px',
                                        borderRadius: '999px',
                                        backgroundColor: palette.accent,
                                    }}
                                />
                                <span>{data.periodeText}</span>
                            </div>
                        </div>

                        {/* Kolom Kanan: Jendela Foto Majalah */}
                        <div className="col-span-5 pt-2">
                            <SchoolPhotoFrame
                                photoUri={data.rawSchoolPhoto}
                                enabled={config.show_foto_sekolah ?? true}
                                focus={config.photo_focus ?? 'center'}
                                blend={config.photo_blend ?? 'balanced'}
                                inkSaver={inkSaver}
                                palette={palette}
                                mode="magazine_window"
                                height={data.isShortPaper ? 292 : 346}
                                caption={`TA ${manifest.meta.tahun} · ${manifest.sekolah.npsn ? `NPSN ${manifest.sekolah.npsn}` : 'SIKAS'}`}
                                fallbackWhenEmpty
                                fallbackWhenDisabled
                            />
                        </div>
                    </div>

                    {/* Kartu Identitas Arsitektural + Keuangan */}
                    <div className="space-y-4">
                        <div
                            style={{
                                backgroundColor: inkSaver ? '#FFFFFF' : palette.surfaceTint,
                                border: '1px solid rgba(15,23,42,0.09)',
                                borderLeft: `7px solid ${palette.accent}`,
                                borderRadius: '18px',
                                padding: data.isShortPaper ? '18px 22px' : '22px 26px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '18px',
                            }}
                        >
                            <div>
                                <div
                                    style={{
                                        fontSize: '10px',
                                        fontWeight: 800,
                                        letterSpacing: '0.18em',
                                        color: palette.primary,
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    Identitas Satuan Pendidikan
                                </div>
                                <div
                                    style={{
                                        fontSize: '24px',
                                        fontWeight: 900,
                                        color: palette.darkText,
                                        marginTop: '4px',
                                    }}
                                >
                                    {data.schoolName}
                                </div>
                                {data.schoolAddress && (
                                    <div
                                        style={{
                                            fontSize: '12.5px',
                                            color: palette.mutedText,
                                            marginTop: '4px',
                                        }}
                                    >
                                        {data.schoolAddress}
                                    </div>
                                )}
                                {data.schoolContact && (
                                    <div
                                        style={{
                                            fontSize: '11.5px',
                                            fontWeight: 700,
                                            color: palette.primary,
                                            marginTop: '3px',
                                        }}
                                    >
                                        {data.schoolContact}
                                    </div>
                                )}
                            </div>
                            <div
                                style={{
                                    backgroundColor: '#FFFFFF',
                                    border: `1.5px solid ${palette.primary}`,
                                    borderRadius: '14px',
                                    padding: '10px 16px',
                                    textAlign: 'center',
                                    flexShrink: 0,
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: '9.5px',
                                        fontWeight: 800,
                                        letterSpacing: '0.14em',
                                        color: palette.mutedText,
                                    }}
                                >
                                    TAHUN
                                </div>
                                <div
                                    style={{
                                        fontSize: '22px',
                                        fontWeight: 900,
                                        color: palette.primary,
                                    }}
                                >
                                    {manifest.meta.tahun}
                                </div>
                            </div>
                        </div>

                        <CoverFinanceStrip data={data} config={config} compact={data.isShortPaper} />
                    </div>

                    {/* Footer */}
                    <div className="space-y-2.5">
                        <CoverSignatureFooter data={data} config={config} compact={data.isShortPaper} />
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                borderTop: `2px solid ${palette.primary}`,
                                paddingTop: '8px',
                                fontSize: '10px',
                                fontWeight: 700,
                                letterSpacing: '0.08em',
                                color: palette.primary,
                            }}
                        >
                            <span>DOKUMEN PERTANGGUNGJAWABAN RESMI · SIKAS</span>
                            <span>{manifest.meta.generated_at_formatted}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ─── PRESET 8: AURORA GLASSMORPHISM ──────────────────────────────────────
    if (config.layout === 'aurora_glass') {
        return (
            <div
                style={{
                    flex: 1,
                    backgroundColor: inkSaver ? '#FFFFFF' : palette.surfaceTint,
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                {/* Latar Aurora Mesh Halus */}
                {!inkSaver && (
                    <svg
                        width={spec.designWidth}
                        height={spec.designHeight}
                        viewBox={`0 0 ${spec.designWidth} ${spec.designHeight}`}
                        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
                    >
                        <defs>
                            <radialGradient id="auroraOrb1" cx="18%" cy="16%" r="48%">
                                <stop offset="0%" stopColor={palette.primary} stopOpacity="0.28" />
                                <stop offset="100%" stopColor={palette.primary} stopOpacity="0" />
                            </radialGradient>
                            <radialGradient id="auroraOrb2" cx="88%" cy="28%" r="44%">
                                <stop offset="0%" stopColor={palette.accent} stopOpacity="0.34" />
                                <stop offset="100%" stopColor={palette.accent} stopOpacity="0" />
                            </radialGradient>
                            <radialGradient id="auroraOrb3" cx="50%" cy="82%" r="50%">
                                <stop offset="0%" stopColor={palette.secondary} stopOpacity="0.2" />
                                <stop offset="100%" stopColor={palette.secondary} stopOpacity="0" />
                            </radialGradient>
                        </defs>
                        <rect width={spec.designWidth} height={spec.designHeight} fill="url(#auroraOrb1)" />
                        <rect width={spec.designWidth} height={spec.designHeight} fill="url(#auroraOrb2)" />
                        <rect width={spec.designWidth} height={spec.designHeight} fill="url(#auroraOrb3)" />
                    </svg>
                )}

                <div
                    style={{
                        position: 'relative',
                        zIndex: 2,
                        flex: 1,
                        padding: data.isShortPaper ? '32px 38px' : '40px 44px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: data.isShortPaper ? '14px' : '18px',
                    }}
                >
                    {/* Kartu Glass 1: Kop & Judul */}
                    <div
                        style={{
                            backgroundColor: inkSaver ? '#FFFFFF' : 'rgba(255,255,255,0.84)',
                            border: inkSaver
                                ? `2px solid ${palette.primary}`
                                : '1.5px solid rgba(255,255,255,0.92)',
                            boxShadow: inkSaver ? 'none' : '0 16px 40px rgba(15,23,42,0.08)',
                            borderRadius: '28px',
                            padding: data.isShortPaper ? '24px 28px' : '30px 34px',
                        }}
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                {data.instansiLines.map((line, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            fontSize: idx === 0 ? '11.5px' : '13.5px',
                                            fontWeight: 800,
                                            letterSpacing: '0.14em',
                                            color: idx === 0 ? palette.mutedText : palette.primary,
                                        }}
                                    >
                                        {line}
                                    </div>
                                ))}
                            </div>
                            <CoverLogosRow
                                data={data}
                                config={config}
                                size={58}
                                includeBosp
                            />
                        </div>

                        <div style={{ marginTop: data.isShortPaper ? '16px' : '22px' }}>
                            <div className="flex flex-wrap items-center gap-2">
                                <span
                                    style={{
                                        backgroundColor: palette.primary,
                                        color: '#FFFFFF',
                                        fontSize: '10px',
                                        fontWeight: 800,
                                        letterSpacing: '0.18em',
                                        padding: '5px 14px',
                                        borderRadius: '999px',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    {config.badge_dokumen}
                                </span>
                                {data.labelJilid !== '' && (
                                    <span
                                        style={{
                                            backgroundColor: palette.accent,
                                            color: '#0F172A',
                                            fontSize: '10px',
                                            fontWeight: 800,
                                            padding: '5px 12px',
                                            borderRadius: '999px',
                                        }}
                                    >
                                        {config.label_jilid}
                                    </span>
                                )}
                            </div>

                            <h1
                                style={{
                                    marginTop: '14px',
                                    fontSize: data.isShortPaper ? '38px' : '44px',
                                    fontWeight: 900,
                                    lineHeight: 1.08,
                                    letterSpacing: '-0.02em',
                                    color: palette.primary,
                                }}
                            >
                                {config.judul_utama}
                            </h1>

                            <div
                                style={{
                                    marginTop: '10px',
                                    fontSize: '17.5px',
                                    fontWeight: 700,
                                    color: palette.secondary,
                                }}
                            >
                                {data.periodeText} · Tahun Anggaran {manifest.meta.tahun}
                            </div>
                        </div>
                    </div>

                    {/* Kartu Glass 2: Panorama Gedung Sekolah */}
                    <SchoolPhotoFrame
                        photoUri={data.rawSchoolPhoto}
                        enabled={config.show_foto_sekolah ?? true}
                        focus={config.photo_focus ?? 'center'}
                        blend={config.photo_blend ?? 'balanced'}
                        inkSaver={inkSaver}
                        palette={palette}
                        mode="glass_panorama"
                        height={data.isShortPaper ? 168 : 212}
                        caption={
                            manifest.sekolah.npsn
                                ? `${data.schoolName} · NPSN ${manifest.sekolah.npsn}`
                                : data.schoolName
                        }
                        fallbackWhenEmpty
                        fallbackVariant="aurora"
                    />

                    {/* Kartu Glass 3: Identitas & Statistik */}
                    <div
                        style={{
                            backgroundColor: inkSaver ? '#FFFFFF' : 'rgba(255,255,255,0.88)',
                            border: '1.5px solid rgba(255,255,255,0.95)',
                            boxShadow: inkSaver ? 'none' : '0 12px 32px rgba(15,23,42,0.06)',
                            borderRadius: '24px',
                            padding: data.isShortPaper ? '18px 24px' : '22px 26px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '14px',
                        }}
                    >
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <div
                                    style={{
                                        fontSize: '10px',
                                        fontWeight: 800,
                                        letterSpacing: '0.18em',
                                        color: palette.mutedText,
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    Satuan Pendidikan Pelaksana
                                </div>
                                <div
                                    style={{
                                        fontSize: '22px',
                                        fontWeight: 900,
                                        color: palette.darkText,
                                        marginTop: '2px',
                                    }}
                                >
                                    {data.schoolName}
                                </div>
                                {(data.schoolAddress || data.schoolContact) && (
                                    <div
                                        style={{
                                            fontSize: '12px',
                                            color: palette.mutedText,
                                            marginTop: '3px',
                                        }}
                                    >
                                        {data.schoolAddress}
                                        {data.schoolContact ? ` · ${data.schoolContact}` : ''}
                                    </div>
                                )}
                            </div>
                        </div>

                        <CoverFinanceStrip data={data} config={config} compact />
                    </div>

                    {/* Kartu Glass 4: Pengesahan */}
                    <div
                        style={{
                            backgroundColor: inkSaver ? '#FFFFFF' : 'rgba(255,255,255,0.9)',
                            border: '1.5px solid rgba(255,255,255,0.95)',
                            borderRadius: '22px',
                            padding: data.isShortPaper ? '14px 20px' : '18px 22px',
                        }}
                    >
                        <CoverSignatureFooter data={data} config={config} compact={data.isShortPaper} />
                    </div>
                </div>
            </div>
        );
    }

    // ─── PRESET 9: NUSANTARA HERITAGE MODERN ─────────────────────────────────
    if (config.layout === 'nusantara_heritage') {
        return (
            <div
                style={{
                    flex: 1,
                    backgroundColor: inkSaver ? '#FFFFFF' : palette.surfaceTint,
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                }}
            >
                {/* Pita Atas Ornamen Batik Kawung Nusantara */}
                <div
                    style={{
                        backgroundColor: inkSaver ? '#FFFFFF' : palette.primary,
                        borderBottom: `4px solid ${palette.accent}`,
                        position: 'relative',
                        overflow: 'hidden',
                        height: data.isShortPaper ? '52px' : '64px',
                        display: 'flex',
                        alignItems: 'center',
                    }}
                >
                    {config.show_geometric_pattern && (
                        <NusantaraPatternSvg
                            width={spec.designWidth}
                            height={64}
                            primaryColor={inkSaver ? palette.primary : '#FFFFFF'}
                            accentColor={palette.accent}
                            opacity={inkSaver ? 0.25 : 0.34}
                        />
                    )}
                </div>

                {/* Konten Utama Simetris Berwibawa */}
                <div
                    style={{
                        flex: 1,
                        padding: data.isShortPaper ? '22px 46px' : '30px 52px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                    }}
                >
                    {/* Header Kop Tengah */}
                    <div className="flex flex-col items-center text-center">
                        <CoverLogosRow
                            data={data}
                            config={config}
                            size={data.isShortPaper ? 56 : 62}
                            includeBosp
                        />
                        <div style={{ marginTop: '12px' }}>
                            {data.instansiLines.map((line, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        fontSize: idx === 0 ? '12.5px' : '15px',
                                        fontWeight: 800,
                                        letterSpacing: '0.16em',
                                        color: palette.primary,
                                        lineHeight: 1.38,
                                    }}
                                >
                                    {line}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Medali Judul & Kubah Foto */}
                    <div className="flex flex-col items-center text-center">
                        <span
                            style={{
                                backgroundColor: inkSaver ? '#FFFFFF' : `${palette.accent}28`,
                                border: `1.5px solid ${palette.accent}`,
                                color: palette.primary,
                                fontSize: '10.5px',
                                fontWeight: 900,
                                letterSpacing: '0.2em',
                                padding: '5px 18px',
                                borderRadius: '999px',
                                textTransform: 'uppercase',
                            }}
                        >
                            {config.badge_dokumen}
                        </span>

                        <h1
                            style={{
                                marginTop: '12px',
                                fontSize: data.isShortPaper ? '36px' : '42px',
                                fontWeight: 900,
                                lineHeight: 1.08,
                                color: palette.primary,
                            }}
                        >
                            {config.judul_utama}
                        </h1>

                        <div
                            style={{
                                marginTop: '8px',
                                fontSize: '16.5px',
                                fontWeight: 800,
                                color: palette.secondary,
                            }}
                        >
                            {data.periodeText}
                            {data.labelJilid !== '' ? ` · ${config.label_jilid}` : ''}
                        </div>

                        <div
                            style={{
                                marginTop: data.isShortPaper ? '14px' : '18px',
                                width: '86%',
                            }}
                        >
                            <SchoolPhotoFrame
                                photoUri={data.rawSchoolPhoto}
                                enabled={config.show_foto_sekolah ?? true}
                                focus={config.photo_focus ?? 'center'}
                                blend={config.photo_blend ?? 'balanced'}
                                inkSaver={inkSaver}
                                palette={palette}
                                mode="arch_window"
                                height={data.isShortPaper ? 168 : 210}
                                caption={`TAHUN ANGGARAN ${manifest.meta.tahun}`}
                                fallbackWhenEmpty
                            />
                        </div>
                    </div>

                    {/* Identitas, Keuangan & Pengesahan */}
                    <div className="space-y-3">
                        <div
                            style={{
                                backgroundColor: '#FFFFFF',
                                border: `1.5px solid ${palette.primary}25`,
                                borderRadius: '16px',
                                padding: data.isShortPaper ? '13px 20px' : '16px 24px',
                                textAlign: 'center',
                            }}
                        >
                            <div
                                style={{
                                    fontSize: data.isShortPaper ? '20px' : '23px',
                                    fontWeight: 900,
                                    color: palette.darkText,
                                }}
                            >
                                {data.schoolName}
                            </div>
                            <div
                                style={{
                                    fontSize: '12px',
                                    color: palette.mutedText,
                                    marginTop: '3px',
                                }}
                            >
                                {manifest.sekolah.npsn ? `NPSN ${manifest.sekolah.npsn} · ` : ''}
                                {data.schoolAddress}
                                {data.schoolContact ? ` · ${data.schoolContact}` : ''}
                            </div>
                        </div>

                        <CoverFinanceStrip data={data} config={config} compact />
                        <CoverSignatureFooter data={data} config={config} compact />
                    </div>
                </div>

                {/* Pita Bawah Ornamen Batik */}
                <div
                    style={{
                        backgroundColor: inkSaver ? '#FFFFFF' : palette.primary,
                        borderTop: `4px solid ${palette.accent}`,
                        height: data.isShortPaper ? '40px' : '50px',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                    }}
                >
                    {config.show_geometric_pattern && (
                        <NusantaraPatternSvg
                            width={spec.designWidth}
                            height={50}
                            primaryColor={inkSaver ? palette.primary : '#FFFFFF'}
                            accentColor={palette.accent}
                            opacity={inkSaver ? 0.25 : 0.34}
                        />
                    )}
                </div>
            </div>
        );
    }

    // ─── PRESET 10: SWISS DIAGONAL RIBBON ────────────────────────────────────
    return (
        <div
            style={{
                flex: 1,
                backgroundColor: '#FFFFFF',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* Grid garis tipis ala Swiss International Style + Tahun Raksasa */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: '48px',
                    width: '1px',
                    backgroundColor: 'rgba(15,23,42,0.07)',
                }}
            />
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    right: '48px',
                    width: '1px',
                    backgroundColor: 'rgba(15,23,42,0.07)',
                }}
            />
            <div
                style={{
                    position: 'absolute',
                    top: '28px',
                    right: '46px',
                    fontSize: '124px',
                    fontWeight: 900,
                    lineHeight: 0.85,
                    letterSpacing: '-0.05em',
                    color: palette.primary,
                    opacity: inkSaver ? 0.06 : 0.09,
                    pointerEvents: 'none',
                }}
            >
                {manifest.meta.tahun}
            </div>

            {/* Pita Diagonal Dinamis di Tengah */}
            <svg
                width={spec.designWidth}
                height="240"
                viewBox={`0 0 ${spec.designWidth} 240`}
                style={{
                    position: 'absolute',
                    top: data.isShortPaper ? '320px' : '365px',
                    left: 0,
                    pointerEvents: 'none',
                }}
            >
                <polygon
                    points={`0,95 ${spec.designWidth},10 ${spec.designWidth},82 0,167`}
                    fill={inkSaver ? '#F1F5F9' : palette.primary}
                />
                <polygon
                    points={`0,167 ${spec.designWidth},82 ${spec.designWidth},104 0,189`}
                    fill={palette.accent}
                />
            </svg>

            <div
                style={{
                    position: 'relative',
                    zIndex: 2,
                    flex: 1,
                    padding: data.isShortPaper ? '38px 48px 34px 48px' : '46px 48px 40px 48px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                }}
            >
                {/* Header Swiss Presisi */}
                <div>
                    <div className="flex items-start justify-between gap-4 border-b-2 border-slate-900/10 pb-5">
                        <div>
                            <div
                                style={{
                                    fontSize: '10px',
                                    fontWeight: 900,
                                    letterSpacing: '0.24em',
                                    color: palette.accent,
                                    textTransform: 'uppercase',
                                }}
                            >
                                SISTEM INFORMASI KEUANGAN SEKOLAH
                            </div>
                            {data.instansiLines.map((line, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        fontSize: '13.5px',
                                        fontWeight: 800,
                                        letterSpacing: '0.08em',
                                        color: palette.darkText,
                                        marginTop: idx === 0 ? '4px' : '1px',
                                    }}
                                >
                                    {line}
                                </div>
                            ))}
                        </div>
                        <CoverLogosRow
                            data={data}
                            config={config}
                            size={58}
                            includeBosp
                        />
                    </div>

                    {/* Tipografi Utama Bold */}
                    <div style={{ marginTop: data.isShortPaper ? '20px' : '28px' }}>
                        <div className="flex items-center gap-3">
                            <span
                                style={{
                                    backgroundColor: palette.primary,
                                    color: '#FFFFFF',
                                    fontSize: '10px',
                                    fontWeight: 900,
                                    letterSpacing: '0.18em',
                                    padding: '5px 12px',
                                    textTransform: 'uppercase',
                                }}
                            >
                                {config.badge_dokumen}
                            </span>
                            {data.labelJilid !== '' && (
                                <span
                                    style={{
                                        backgroundColor: palette.accent,
                                        color: '#0F172A',
                                        fontSize: '10px',
                                        fontWeight: 900,
                                        letterSpacing: '0.14em',
                                        padding: '5px 12px',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    {config.label_jilid}
                                </span>
                            )}
                        </div>

                        <h1
                            style={{
                                marginTop: '14px',
                                fontSize: data.isShortPaper ? '40px' : '48px',
                                fontWeight: 900,
                                lineHeight: 1.04,
                                letterSpacing: '-0.03em',
                                color: palette.primary,
                            }}
                        >
                            {config.judul_utama}
                        </h1>

                        <div
                            style={{
                                marginTop: '10px',
                                fontSize: '18px',
                                fontWeight: 800,
                                color: palette.mutedText,
                            }}
                        >
                            {data.periodeText}
                        </div>
                    </div>
                </div>

                {/* Slot Foto Sekolah Mengambang di Atas Pita Diagonal */}
                <div style={{ marginTop: '12px' }}>
                    <SchoolPhotoFrame
                        photoUri={data.rawSchoolPhoto}
                        enabled={config.show_foto_sekolah ?? true}
                        focus={config.photo_focus ?? 'center'}
                        blend={config.photo_blend ?? 'balanced'}
                        inkSaver={inkSaver}
                        palette={palette}
                        mode="glass_panorama"
                        height={data.isShortPaper ? 166 : 206}
                        caption={`${manifest.meta.variant_label} · TA ${manifest.meta.tahun}`}
                        fallbackWhenEmpty
                    />
                </div>

                {/* Grid Tabel Sekolah & Keuangan */}
                <div className="space-y-3.5">
                    <div
                        style={{
                            backgroundColor: inkSaver ? '#FFFFFF' : palette.surfaceTint,
                            borderTop: `3px solid ${palette.primary}`,
                            borderBottom: '1px solid rgba(15,23,42,0.12)',
                            padding: data.isShortPaper ? '14px 18px' : '18px 20px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'baseline',
                            gap: '16px',
                        }}
                    >
                        <div>
                            <div
                                style={{
                                    fontSize: '23px',
                                    fontWeight: 900,
                                    color: palette.darkText,
                                }}
                            >
                                {data.schoolName}
                            </div>
                            <div
                                style={{
                                    fontSize: '12px',
                                    color: palette.mutedText,
                                    marginTop: '3px',
                                }}
                            >
                                {data.schoolAddress}
                                {data.schoolContact ? ` · ${data.schoolContact}` : ''}
                            </div>
                        </div>
                        {manifest.sekolah.npsn && (
                            <div
                                style={{
                                    fontSize: '12px',
                                    fontWeight: 900,
                                    letterSpacing: '0.12em',
                                    color: palette.primary,
                                    flexShrink: 0,
                                }}
                            >
                                NPSN {manifest.sekolah.npsn}
                            </div>
                        )}
                    </div>

                    <CoverFinanceStrip data={data} config={config} compact />
                </div>

                {/* Footer */}
                <CoverSignatureFooter data={data} config={config} compact={data.isShortPaper} />
            </div>
        </div>
    );
}
