import type { SpjCoverConfig, SpjManifest } from '../../../types';
import { SchoolArchitectureSvg } from '../CoverAssets';
import {
    CoverFinanceStrip,
    CoverLogosRow,
    CoverSignatureFooter,
    type CoverResolvedData,
} from '../CoverSharedBlocks';
import SchoolPhotoFrame, { resolveBlendAlpha, resolveObjectPosition } from '../SchoolPhotoFrame';

export interface CoverLayoutRenderProps {
    manifest: SpjManifest;
    config: SpjCoverConfig;
    data: CoverResolvedData;
}

/**
 * 5 Preset Klasik SIKAS (Editorial, Instansi Elegan, Geometris, Neo-Bento, Photo Hero)
 * yang telah ditingkatkan agar mendukung Gambar Sekolah, Logo BOSP, dan Kontak Sekolah tanpa merusak tata letak.
 */
export function ClassicCoverLayout({ manifest, config, data }: CoverLayoutRenderProps) {
    const { palette, inkSaver, spec } = data;
    const hasActivePhoto = Boolean(data.activeSchoolPhoto);
    const denseMode =
        data.isShortPaper ||
        (hasActivePhoto && config.show_ringkasan_keuangan && config.show_penanggung_jawab);

    // ─── PRESET 1: EDITORIAL MODERN ──────────────────────────────────────────
    if (config.layout === 'editorial') {
        return (
            <>
                {/* Spine kiri vertikal bergaya annual report */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: 0,
                        width: '72px',
                        backgroundColor: inkSaver ? '#FFFFFF' : palette.primary,
                        borderRight: inkSaver
                            ? `4px solid ${palette.primary}`
                            : `6px solid ${palette.accent}`,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '38px 0',
                    }}
                >
                    <div
                        style={{
                            width: '12px',
                            height: '54px',
                            borderRadius: '999px',
                            backgroundColor: palette.accent,
                        }}
                    />
                    <div
                        style={{
                            writingMode: 'vertical-rl',
                            transform: 'rotate(180deg)',
                            fontSize: '12px',
                            fontWeight: 800,
                            letterSpacing: '0.32em',
                            textTransform: 'uppercase',
                            color: inkSaver ? palette.primary : 'rgba(255,255,255,0.85)',
                        }}
                    >
                        SIKAS · {manifest.meta.variant_label} · {manifest.meta.tahun}
                    </div>
                    <div
                        style={{
                            fontSize: '18px',
                            fontWeight: 900,
                            color: inkSaver ? palette.primary : palette.accent,
                        }}
                    >
                        {String(manifest.meta.tahun).slice(-2)}
                    </div>
                </div>

                {/* Pola dekoratif halus */}
                {config.show_geometric_pattern && (
                    <svg
                        width="340"
                        height="340"
                        viewBox="0 0 340 340"
                        style={{
                            position: 'absolute',
                            top: '-40px',
                            right: '-40px',
                            opacity: inkSaver ? 0.08 : 0.14,
                        }}
                    >
                        <circle cx="220" cy="120" r="140" fill={palette.primary} />
                        <circle cx="260" cy="180" r="76" fill={palette.accent} />
                    </svg>
                )}

                <div
                    style={{
                        marginLeft: '72px',
                        padding: denseMode ? '38px 46px 34px 46px' : '50px 50px 42px 50px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        flex: 1,
                        position: 'relative',
                        zIndex: 2,
                    }}
                >
                    {/* Header Instansi & Logo */}
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            {data.instansiLines.map((line, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        fontSize: idx === 0 ? '12.5px' : '14.5px',
                                        fontWeight: idx === 0 ? 700 : 800,
                                        letterSpacing: '0.12em',
                                        color: idx === 0 ? palette.mutedText : palette.primary,
                                        lineHeight: 1.4,
                                    }}
                                >
                                    {line}
                                </div>
                            ))}
                            {manifest.sekolah.npsn && (
                                <div
                                    style={{
                                        marginTop: '7px',
                                        display: 'inline-block',
                                        fontSize: '10.5px',
                                        fontWeight: 700,
                                        padding: '3px 10px',
                                        borderRadius: '999px',
                                        backgroundColor: inkSaver ? '#F1F5F9' : 'rgba(15,23,42,0.06)',
                                        color: palette.primary,
                                    }}
                                >
                                    NPSN: {manifest.sekolah.npsn}
                                </div>
                            )}
                        </div>
                        <CoverLogosRow
                            data={data}
                            config={config}
                            size={denseMode ? 56 : 62}
                            invertFrame={false}
                            includeBosp
                        />
                    </div>

                    {/* Hero Tipografi Utama */}
                    <div style={{ marginTop: denseMode ? '16px' : '26px' }}>
                        <div className="flex flex-wrap items-center gap-2.5">
                            <span
                                style={{
                                    backgroundColor: inkSaver ? '#FFFFFF' : palette.primary,
                                    color: inkSaver ? palette.primary : palette.onPrimary,
                                    border: `2px solid ${palette.primary}`,
                                    fontSize: '10.5px',
                                    fontWeight: 800,
                                    letterSpacing: '0.18em',
                                    padding: '5px 13px',
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
                                        fontSize: '10.5px',
                                        fontWeight: 800,
                                        letterSpacing: '0.12em',
                                        padding: '5px 12px',
                                        borderRadius: '999px',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    {config.label_jilid}
                                </span>
                            )}
                        </div>

                        <h1
                            style={{
                                marginTop: denseMode ? '14px' : '20px',
                                fontSize: denseMode ? '40px' : '45px',
                                fontWeight: 900,
                                lineHeight: 1.08,
                                letterSpacing: '-0.025em',
                                color: palette.primary,
                            }}
                        >
                            {config.judul_utama}
                        </h1>

                        <div
                            style={{
                                marginTop: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '14px',
                            }}
                        >
                            <div
                                style={{
                                    width: '52px',
                                    height: '5px',
                                    borderRadius: '999px',
                                    backgroundColor: palette.accent,
                                }}
                            />
                            <div
                                style={{
                                    fontSize: denseMode ? '18px' : '20px',
                                    fontWeight: 700,
                                    color: palette.darkText,
                                }}
                            >
                                {data.periodeText}
                            </div>
                        </div>
                    </div>

                    {/* Foto Sekolah Proporsional + Identitas Sekolah & Ringkasan */}
                    <div className={denseMode ? 'space-y-3' : 'space-y-4'}>
                        <SchoolPhotoFrame
                            photoUri={data.rawSchoolPhoto}
                            enabled={config.show_foto_sekolah ?? true}
                            focus={config.photo_focus ?? 'center'}
                            blend={config.photo_blend ?? 'balanced'}
                            inkSaver={inkSaver}
                            palette={palette}
                            mode="compact_banner"
                            height={denseMode ? 114 : 138}
                            caption="Profil Lingkungan Sekolah"
                        />

                        <div
                            style={{
                                backgroundColor: '#FFFFFF',
                                border: `1.5px solid ${inkSaver ? palette.primary : 'rgba(15,23,42,0.1)'}`,
                                borderRadius: '18px',
                                padding: denseMode ? '16px 20px' : '20px 24px',
                            }}
                        >
                            <div
                                style={{
                                    fontSize: '10px',
                                    fontWeight: 800,
                                    letterSpacing: '0.18em',
                                    color: palette.accent,
                                    textTransform: 'uppercase',
                                }}
                            >
                                Satuan Pendidikan Pelaksana
                            </div>
                            <div
                                style={{
                                    fontSize: denseMode ? '21px' : '24px',
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
                                        lineHeight: 1.45,
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
                                        marginTop: '4px',
                                    }}
                                >
                                    {data.schoolContact}
                                </div>
                            )}
                        </div>

                        <CoverFinanceStrip data={data} config={config} compact={denseMode} />
                    </div>

                    {/* Footer Penanggung Jawab & QR */}
                    <div className="space-y-2.5">
                        <CoverSignatureFooter data={data} config={config} compact={denseMode} />
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                borderTop: '1px solid rgba(15,23,42,0.1)',
                                paddingTop: '8px',
                                fontSize: '10px',
                                color: palette.mutedText,
                                fontWeight: 600,
                            }}
                        >
                            <span>Dicetak melalui SIKAS · {manifest.meta.generated_at_formatted}</span>
                            <span>TAHUN ANGGARAN {manifest.meta.tahun}</span>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    // ─── PRESET 2: INSTANSI ELEGAN ───────────────────────────────────────────
    if (config.layout === 'instansi_elegan') {
        return (
            <div style={{ flex: 1, backgroundColor: '#FFFFFF', padding: '28px', display: 'flex' }}>
                <div
                    style={{
                        flex: 1,
                        border: `2.5px solid ${palette.primary}`,
                        borderRadius: '12px',
                        padding: '9px',
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    <div
                        style={{
                            flex: 1,
                            border: `1px solid ${palette.accent}`,
                            borderRadius: '8px',
                            padding: denseMode ? '28px 36px 26px 36px' : '38px 42px 32px 42px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            position: 'relative',
                            backgroundColor: inkSaver ? '#FFFFFF' : palette.surfaceTint,
                        }}
                    >
                        {/* Top symmetric header */}
                        <div className="flex flex-col items-center text-center">
                            <div className="mb-3.5 flex items-center justify-center gap-5">
                                <CoverLogosRow
                                    data={data}
                                    config={config}
                                    size={denseMode ? 58 : 68}
                                    includeBosp
                                />
                            </div>
                            {data.instansiLines.map((line, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        fontSize: idx === 0 ? '13px' : '16px',
                                        fontWeight: 800,
                                        letterSpacing: '0.15em',
                                        color: palette.primary,
                                        lineHeight: 1.4,
                                    }}
                                >
                                    {line}
                                </div>
                            ))}
                            <div
                                style={{
                                    marginTop: '12px',
                                    width: '180px',
                                    height: '3px',
                                    background: `linear-gradient(90deg, transparent, ${palette.accent}, transparent)`,
                                }}
                            />
                        </div>

                        {/* Center Title & Photo / Identity */}
                        <div className="my-2 flex flex-col items-center text-center">
                            <div
                                style={{
                                    fontSize: '11.5px',
                                    fontWeight: 800,
                                    letterSpacing: '0.22em',
                                    color: palette.mutedText,
                                    textTransform: 'uppercase',
                                }}
                            >
                                {config.badge_dokumen}
                            </div>
                            <h1
                                style={{
                                    marginTop: '10px',
                                    fontSize: denseMode ? '36px' : '41px',
                                    fontWeight: 900,
                                    color: palette.primary,
                                    lineHeight: 1.1,
                                    letterSpacing: '-0.01em',
                                }}
                            >
                                {config.judul_utama}
                            </h1>

                            <div
                                style={{
                                    marginTop: '16px',
                                    backgroundColor: inkSaver ? '#FFFFFF' : palette.primary,
                                    color: inkSaver ? palette.primary : palette.onPrimary,
                                    border: `2px solid ${palette.primary}`,
                                    padding: '8px 26px',
                                    borderRadius: '999px',
                                    fontSize: '15px',
                                    fontWeight: 800,
                                    letterSpacing: '0.06em',
                                }}
                            >
                                {data.periodeText}
                                {data.labelJilid !== '' ? ` · ${config.label_jilid}` : ''}
                            </div>

                            {hasActivePhoto && (
                                <div style={{ marginTop: '16px', width: '100%' }}>
                                    <SchoolPhotoFrame
                                        photoUri={data.rawSchoolPhoto}
                                        enabled={config.show_foto_sekolah ?? true}
                                        focus={config.photo_focus ?? 'center'}
                                        blend={config.photo_blend ?? 'balanced'}
                                        inkSaver={inkSaver}
                                        palette={palette}
                                        mode="compact_banner"
                                        height={denseMode ? 110 : 132}
                                    />
                                </div>
                            )}

                            {/* Identitas Sekolah */}
                            <div
                                style={{
                                    marginTop: hasActivePhoto ? '14px' : '22px',
                                    width: '100%',
                                    backgroundColor: '#FFFFFF',
                                    border: '1px solid rgba(15,23,42,0.12)',
                                    borderTop: `4px solid ${palette.accent}`,
                                    borderRadius: '14px',
                                    padding: denseMode ? '14px 22px' : '18px 24px',
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: denseMode ? '20px' : '23px',
                                        fontWeight: 900,
                                        color: palette.darkText,
                                    }}
                                >
                                    {data.schoolName}
                                </div>
                                {manifest.sekolah.npsn && (
                                    <div
                                        style={{
                                            fontSize: '11.5px',
                                            fontWeight: 700,
                                            color: palette.primary,
                                            marginTop: '3px',
                                            letterSpacing: '0.1em',
                                        }}
                                    >
                                        NPSN: {manifest.sekolah.npsn}
                                    </div>
                                )}
                                {data.schoolAddress && (
                                    <div
                                        style={{
                                            fontSize: '12px',
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
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            color: palette.primary,
                                            marginTop: '3px',
                                        }}
                                    >
                                        {data.schoolContact}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Finance + Signature */}
                        <div className="space-y-3">
                            <CoverFinanceStrip data={data} config={config} compact />
                            <CoverSignatureFooter data={data} config={config} compact={denseMode} />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ─── PRESET 3: GEOMETRIS DINAMIS ─────────────────────────────────────────
    if (config.layout === 'geometris') {
        const { imgOpacity } = resolveBlendAlpha(config.photo_blend ?? 'balanced');
        const objPos = resolveObjectPosition(config.photo_focus ?? 'center');

        return (
            <div style={{ flex: 1, backgroundColor: '#FFFFFF', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                {/* Foto sekolah terpotong rapi di dalam poligon atas bila diaktifkan */}
                {hasActivePhoto && !inkSaver && (
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: `${spec.designWidth}px`,
                            height: '410px',
                            clipPath: `polygon(0px 0px, ${spec.designWidth}px 0px, ${spec.designWidth}px 300px, 0px 410px)`,
                            overflow: 'hidden',
                            backgroundColor: palette.primary,
                        }}
                    >
                        <img
                            src={data.activeSchoolPhoto!}
                            alt="Gedung Sekolah"
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                objectPosition: objPos,
                                opacity: Math.min(0.42, imgOpacity * 0.36),
                                display: 'block',
                            }}
                        />
                    </div>
                )}

                {/* Poligon SVG modern di bagian atas */}
                <svg
                    width={spec.designWidth}
                    height="440"
                    viewBox={`0 0 ${spec.designWidth} 440`}
                    style={{ position: 'absolute', top: 0, left: 0 }}
                >
                    {!inkSaver ? (
                        <>
                            <polygon
                                points={`0,0 ${spec.designWidth},0 ${spec.designWidth},300 0,410`}
                                fill={palette.primary}
                                opacity={hasActivePhoto ? 0.78 : 1}
                            />
                            <polygon
                                points={`0,340 ${spec.designWidth},220 ${spec.designWidth},275 0,395`}
                                fill={palette.accent}
                                opacity="0.92"
                            />
                            <polygon
                                points={`${spec.designWidth - 260},0 ${spec.designWidth},0 ${spec.designWidth},220`}
                                fill={palette.secondary}
                                opacity="0.45"
                            />
                        </>
                    ) : (
                        <>
                            <polygon
                                points={`0,0 ${spec.designWidth},0 ${spec.designWidth},18 0,18`}
                                fill={palette.primary}
                            />
                            <polygon
                                points={`0,340 ${spec.designWidth},270 ${spec.designWidth},282 0,352`}
                                fill={palette.accent}
                            />
                        </>
                    )}
                </svg>

                {/* Sudut bawah geometris + dot-grid halus */}
                {config.show_geometric_pattern && (
                    <>
                        <svg
                            width="180"
                            height="140"
                            viewBox="0 0 180 140"
                            style={{
                                position: 'absolute',
                                bottom: '185px',
                                left: '42px',
                                opacity: inkSaver ? 0.14 : 0.2,
                            }}
                        >
                            {[0, 1, 2, 3, 4, 5].map((r) =>
                                [0, 1, 2, 3, 4, 5, 6, 7].map((c) => (
                                    <circle
                                        key={`${r}-${c}`}
                                        cx={10 + c * 22}
                                        cy={10 + r * 22}
                                        r="2.4"
                                        fill={palette.primary}
                                    />
                                )),
                            )}
                        </svg>
                        <svg
                            width="260"
                            height="180"
                            viewBox="0 0 260 180"
                            style={{
                                position: 'absolute',
                                bottom: 0,
                                right: 0,
                                opacity: inkSaver ? 0.14 : 0.22,
                            }}
                        >
                            <polygon points="260,0 260,180 60,180" fill={palette.primary} />
                            <polygon points="260,70 260,180 140,180" fill={palette.accent} />
                        </svg>
                    </>
                )}

                <div
                    style={{
                        position: 'relative',
                        zIndex: 2,
                        padding: denseMode ? '40px 46px 36px 46px' : '48px 50px 42px 50px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        flex: 1,
                    }}
                >
                    {/* Header di atas poligon */}
                    <div>
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                {data.instansiLines.map((line, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            fontSize: idx === 0 ? '12.5px' : '15px',
                                            fontWeight: 800,
                                            letterSpacing: '0.14em',
                                            color: inkSaver ? palette.primary : '#FFFFFF',
                                            opacity: idx === 0 ? 0.88 : 1,
                                        }}
                                    >
                                        {line}
                                    </div>
                                ))}
                            </div>
                            <CoverLogosRow
                                data={data}
                                config={config}
                                size={60}
                                invertFrame={!inkSaver}
                                includeBosp
                            />
                        </div>

                        <div style={{ marginTop: '32px' }}>
                            <span
                                style={{
                                    display: 'inline-block',
                                    backgroundColor: palette.accent,
                                    color: '#0F172A',
                                    fontSize: '11px',
                                    fontWeight: 900,
                                    letterSpacing: '0.18em',
                                    padding: '6px 14px',
                                    borderRadius: '8px',
                                    textTransform: 'uppercase',
                                }}
                            >
                                {config.badge_dokumen}
                            </span>
                            <h1
                                style={{
                                    marginTop: '14px',
                                    fontSize: denseMode ? '40px' : '44px',
                                    fontWeight: 900,
                                    lineHeight: 1.08,
                                    color: inkSaver ? palette.primary : '#FFFFFF',
                                }}
                            >
                                {config.judul_utama}
                            </h1>
                            <div
                                style={{
                                    marginTop: '10px',
                                    fontSize: '18.5px',
                                    fontWeight: 700,
                                    color: inkSaver ? palette.mutedText : 'rgba(255,255,255,0.92)',
                                }}
                            >
                                {data.periodeText}
                                {data.labelJilid !== '' ? ` — ${config.label_jilid}` : ''}
                            </div>
                        </div>
                    </div>

                    {/* Panel tengah bersih */}
                    <div className="space-y-4" style={{ marginTop: '56px' }}>
                        {hasActivePhoto && inkSaver && (
                            <SchoolPhotoFrame
                                photoUri={data.rawSchoolPhoto}
                                enabled={config.show_foto_sekolah ?? true}
                                focus={config.photo_focus ?? 'center'}
                                blend={config.photo_blend ?? 'balanced'}
                                inkSaver={inkSaver}
                                palette={palette}
                                mode="angled_banner"
                                height={108}
                            />
                        )}
                        <div
                            style={{
                                backgroundColor: palette.surfaceTint,
                                borderLeft: `6px solid ${palette.primary}`,
                                borderRadius: '16px',
                                padding: '20px 24px',
                            }}
                        >
                            <div
                                style={{
                                    fontSize: '10px',
                                    fontWeight: 800,
                                    letterSpacing: '0.18em',
                                    color: palette.primary,
                                    textTransform: 'uppercase',
                                }}
                            >
                                Identitas Sekolah · Tahun Anggaran {manifest.meta.tahun}
                            </div>
                            <div
                                style={{
                                    fontSize: '24px',
                                    fontWeight: 900,
                                    color: palette.darkText,
                                    marginTop: '5px',
                                }}
                            >
                                {data.schoolName}
                            </div>
                            <div
                                style={{
                                    fontSize: '12.5px',
                                    color: palette.mutedText,
                                    marginTop: '5px',
                                }}
                            >
                                {manifest.sekolah.npsn ? `NPSN ${manifest.sekolah.npsn} · ` : ''}
                                {data.schoolAddress}
                            </div>
                            {data.schoolContact && (
                                <div
                                    style={{
                                        fontSize: '11.5px',
                                        fontWeight: 700,
                                        color: palette.primary,
                                        marginTop: '4px',
                                    }}
                                >
                                    {data.schoolContact}
                                </div>
                            )}
                        </div>

                        <CoverFinanceStrip data={data} config={config} compact={data.isShortPaper} />
                    </div>

                    {/* Footer */}
                    <CoverSignatureFooter data={data} config={config} compact={data.isShortPaper} />
                </div>
            </div>
        );
    }

    // ─── PRESET 4: NEO-BENTO EKSEKUTIF ───────────────────────────────────────
    if (config.layout === 'neo_bento') {
        return (
            <div
                style={{
                    flex: 1,
                    backgroundColor: inkSaver ? '#FFFFFF' : '#F2F4F8',
                    padding: data.isShortPaper ? '28px' : '34px',
                    gap: data.isShortPaper ? '12px' : '14px',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                {/* Bento Card 1: Hero Header */}
                <div
                    style={{
                        backgroundColor: inkSaver ? '#FFFFFF' : palette.primary,
                        color: inkSaver ? palette.darkText : '#FFFFFF',
                        border: inkSaver ? `2px solid ${palette.primary}` : 'none',
                        borderRadius: '26px',
                        padding: data.isShortPaper ? '24px 28px' : '28px 32px',
                        position: 'relative',
                        overflow: 'hidden',
                    }}
                >
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <span
                                    style={{
                                        backgroundColor: palette.accent,
                                        color: '#0F172A',
                                        fontSize: '10.5px',
                                        fontWeight: 900,
                                        letterSpacing: '0.16em',
                                        padding: '5px 12px',
                                        borderRadius: '999px',
                                    }}
                                >
                                    {config.badge_dokumen}
                                </span>
                                {data.labelJilid !== '' && (
                                    <span
                                        style={{
                                            backgroundColor: inkSaver
                                                ? '#F1F5F9'
                                                : 'rgba(255,255,255,0.16)',
                                            color: inkSaver ? palette.primary : '#FFFFFF',
                                            fontSize: '10.5px',
                                            fontWeight: 800,
                                            padding: '5px 12px',
                                            borderRadius: '999px',
                                        }}
                                    >
                                        {config.label_jilid}
                                    </span>
                                )}
                            </div>
                            <div
                                style={{
                                    marginTop: '10px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    letterSpacing: '0.14em',
                                    opacity: 0.8,
                                }}
                            >
                                {data.instansiLines.join(' · ')}
                            </div>
                            <h1
                                style={{
                                    marginTop: '10px',
                                    fontSize: data.isShortPaper ? '36px' : '40px',
                                    fontWeight: 900,
                                    lineHeight: 1.08,
                                    letterSpacing: '-0.02em',
                                }}
                            >
                                {config.judul_utama}
                            </h1>
                            <div
                                style={{
                                    marginTop: '8px',
                                    fontSize: '17px',
                                    fontWeight: 700,
                                    color: inkSaver ? palette.primary : palette.accent,
                                }}
                            >
                                {data.periodeText}
                            </div>
                        </div>
                        <CoverLogosRow
                            data={data}
                            config={config}
                            size={60}
                            invertFrame={!inkSaver}
                            includeBosp
                        />
                    </div>
                </div>

                {/* Bento Card Khusus Gambar Sekolah (sudut 22px via SchoolPhotoFrame) */}
                <SchoolPhotoFrame
                    photoUri={data.rawSchoolPhoto}
                    enabled={config.show_foto_sekolah ?? true}
                    focus={config.photo_focus ?? 'center'}
                    blend={config.photo_blend ?? 'balanced'}
                    inkSaver={inkSaver}
                    palette={palette}
                    mode="bento_card"
                    height={data.isShortPaper ? 112 : 136}
                    caption="Gedung & Lingkungan Sekolah"
                />

                {/* Bento Card 2: School Identity */}
                <div
                    style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid rgba(15,23,42,0.08)',
                        borderRadius: '22px',
                        padding: data.isShortPaper ? '16px 22px' : '20px 26px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '18px',
                    }}
                >
                    <div className="min-w-0 flex-1">
                        <div
                            style={{
                                fontSize: '10px',
                                fontWeight: 800,
                                letterSpacing: '0.18em',
                                color: palette.mutedText,
                                textTransform: 'uppercase',
                            }}
                        >
                            Satuan Pendidikan
                        </div>
                        <div
                            style={{
                                fontSize: data.isShortPaper ? '21px' : '24px',
                                fontWeight: 900,
                                color: palette.darkText,
                                marginTop: '3px',
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
                            backgroundColor: palette.surfaceTint,
                            borderRadius: '16px',
                            padding: '12px 18px',
                            textAlign: 'right',
                            flexShrink: 0,
                        }}
                    >
                        <div
                            style={{
                                fontSize: '10px',
                                fontWeight: 800,
                                color: palette.mutedText,
                                letterSpacing: '0.14em',
                            }}
                        >
                            NPSN
                        </div>
                        <div style={{ fontSize: '19px', fontWeight: 900, color: palette.primary }}>
                            {manifest.sekolah.npsn || '-'}
                        </div>
                    </div>
                </div>

                {/* Bento Card 3: Ringkasan Eksekutif & Progress Bar */}
                {config.show_ringkasan_keuangan && (
                    <div
                        style={{
                            backgroundColor: '#FFFFFF',
                            border: '1px solid rgba(15,23,42,0.08)',
                            borderRadius: '22px',
                            padding: '22px 26px',
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            gap: '14px',
                        }}
                    >
                        <div className="flex items-center justify-between">
                            <span
                                style={{
                                    fontSize: '11.5px',
                                    fontWeight: 800,
                                    letterSpacing: '0.16em',
                                    color: palette.primary,
                                    textTransform: 'uppercase',
                                }}
                            >
                                Ringkasan Eksekutif Keuangan Periode
                            </span>
                            <span
                                style={{
                                    fontSize: '12.5px',
                                    fontWeight: 900,
                                    color: palette.primary,
                                    backgroundColor: palette.surfaceTint,
                                    padding: '4px 12px',
                                    borderRadius: '999px',
                                }}
                            >
                                Serapan {manifest.ringkasan_keuangan.persentase_serapan_aktual}%
                            </span>
                        </div>

                        <div
                            style={{
                                height: '11px',
                                borderRadius: '999px',
                                backgroundColor: '#E2E8F0',
                                overflow: 'hidden',
                            }}
                        >
                            <div
                                style={{
                                    width: `${Math.min(100, Math.max(0, manifest.ringkasan_keuangan.persentase_serapan))}%`,
                                    height: '100%',
                                    backgroundColor: palette.primary,
                                    borderRadius: '999px',
                                }}
                            />
                        </div>

                        <CoverFinanceStrip data={data} config={config} compact={data.isShortPaper} />
                    </div>
                )}

                {/* Bento Card 4: Signatures & QR */}
                <div
                    style={{
                        marginTop: 'auto',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid rgba(15,23,42,0.08)',
                        borderRadius: '22px',
                        padding: '18px 22px',
                    }}
                >
                    <CoverSignatureFooter data={data} config={config} compact={data.isShortPaper} />
                </div>
            </div>
        );
    }

    // ─── PRESET 5: PHOTO HERO SEKOLAH ────────────────────────────────────────
    const objPos = resolveObjectPosition(config.photo_focus ?? 'center');
    const { tintAlpha, imgOpacity } = resolveBlendAlpha(config.photo_blend ?? 'balanced');

    return (
        <div style={{ flex: 1, backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
            {/* Top Photo Hero */}
            <div
                style={{
                    position: 'relative',
                    height: '44%',
                    backgroundColor: palette.primary,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '40px 48px',
                }}
            >
                {hasActivePhoto ? (
                    <img
                        src={data.activeSchoolPhoto!}
                        alt="Foto Sekolah"
                        style={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            objectPosition: objPos,
                            opacity: imgOpacity,
                        }}
                    />
                ) : (
                    <div style={{ position: 'absolute', inset: 0, opacity: 0.34 }}>
                        <SchoolArchitectureSvg palette={palette} inkSaver={inkSaver} />
                    </div>
                )}

                {/* Gradient overlay */}
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background: inkSaver
                            ? 'linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.88) 50%, rgba(255,255,255,0.96) 100%)'
                            : `linear-gradient(180deg, ${palette.primary}CC 0%, ${palette.primary}${tintAlpha} 48%, ${palette.primary}F2 100%)`,
                    }}
                />

                {/* Header atas hero */}
                <div className="relative z-10 flex items-start justify-between gap-4">
                    <div>
                        {data.instansiLines.map((line, idx) => (
                            <div
                                key={idx}
                                style={{
                                    fontSize: idx === 0 ? '12.5px' : '15px',
                                    fontWeight: 800,
                                    letterSpacing: '0.14em',
                                    color: inkSaver ? palette.primary : '#FFFFFF',
                                    opacity: idx === 0 ? 0.85 : 1,
                                }}
                            >
                                {line}
                            </div>
                        ))}
                    </div>
                    <CoverLogosRow
                        data={data}
                        config={config}
                        size={60}
                        invertFrame={!inkSaver}
                        includeBosp
                    />
                </div>

                {/* Judul di bawah hero */}
                <div className="relative z-10">
                    <span
                        style={{
                            display: 'inline-block',
                            backgroundColor: palette.accent,
                            color: '#0F172A',
                            fontSize: '11px',
                            fontWeight: 900,
                            letterSpacing: '0.18em',
                            padding: '5px 14px',
                            borderRadius: '999px',
                        }}
                    >
                        {config.badge_dokumen}
                    </span>
                    <h1
                        style={{
                            marginTop: '14px',
                            fontSize: data.isShortPaper ? '38px' : '42px',
                            fontWeight: 900,
                            color: inkSaver ? palette.primary : '#FFFFFF',
                            lineHeight: 1.08,
                        }}
                    >
                        {config.judul_utama}
                    </h1>
                    <div
                        style={{
                            marginTop: '10px',
                            fontSize: '18px',
                            fontWeight: 700,
                            color: inkSaver ? palette.mutedText : 'rgba(255,255,255,0.9)',
                        }}
                    >
                        {data.periodeText}
                        {data.labelJilid !== '' ? ` · ${config.label_jilid}` : ''}
                    </div>
                </div>
            </div>

            {/* Accent strip */}
            <div style={{ height: '7px', backgroundColor: palette.accent }} />

            {/* Body bawah */}
            <div
                style={{
                    flex: 1,
                    padding: data.isShortPaper ? '30px 46px 32px 46px' : '38px 48px 40px 48px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                }}
            >
                <div>
                    <div
                        style={{
                            fontSize: '10.5px',
                            fontWeight: 800,
                            letterSpacing: '0.18em',
                            color: palette.primary,
                            textTransform: 'uppercase',
                        }}
                    >
                        Satuan Pendidikan · Tahun Anggaran {manifest.meta.tahun}
                    </div>
                    <div
                        style={{
                            fontSize: '26px',
                            fontWeight: 900,
                            color: palette.darkText,
                            marginTop: '6px',
                        }}
                    >
                        {data.schoolName}
                    </div>
                    <div style={{ fontSize: '13px', color: palette.mutedText, marginTop: '5px' }}>
                        {manifest.sekolah.npsn ? `NPSN ${manifest.sekolah.npsn} · ` : ''}
                        {data.schoolAddress}
                    </div>
                    {data.schoolContact && (
                        <div
                            style={{
                                fontSize: '11.5px',
                                fontWeight: 700,
                                color: palette.primary,
                                marginTop: '4px',
                            }}
                        >
                            {data.schoolContact}
                        </div>
                    )}
                </div>

                <CoverFinanceStrip data={data} config={config} compact={data.isShortPaper} />

                <CoverSignatureFooter data={data} config={config} compact={data.isShortPaper} />
            </div>
        </div>
    );
}
