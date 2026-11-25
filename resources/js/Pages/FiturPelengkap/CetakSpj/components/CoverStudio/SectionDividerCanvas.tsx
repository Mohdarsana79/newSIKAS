import { forwardRef } from 'react';
import { SPJ_PAPER_SPECS } from '../../services/spjPdfAssembler';
import type { SpjChapterManifest, SpjCoverConfig, SpjManifest, SpjPaperSize } from '../../types';
import { BospOfficialLogoSvg, NusantaraPatternSvg } from './CoverAssets';
import { resolveCoverPalette } from './coverThemes';

interface SectionDividerCanvasProps {
    manifest: SpjManifest;
    config: SpjCoverConfig;
    paperSize: SpjPaperSize;
    chapter: SpjChapterManifest;
    activeItemLabels: string[];
}

/**
 * Halaman Pembatas Bab adaptif yang mewarisi ornamen visual dari tema Cover terpilih.
 */
const SectionDividerCanvas = forwardRef<HTMLDivElement, SectionDividerCanvasProps>(
    ({ manifest, config, paperSize, chapter, activeItemLabels }, ref) => {
        const spec = SPJ_PAPER_SPECS[paperSize];
        const palette = resolveCoverPalette(config);
        const inkSaver = config.ink_saver;
        const schoolName =
            (config.nama_sekolah_override ?? '').trim() || manifest.sekolah.nama_sekolah;
        const periodeText =
            (config.subjudul_override ?? '').trim() || manifest.meta.periode_label;

        const isFramed = config.layout === 'instansi_elegan';
        const isNusantara = config.layout === 'nusantara_heritage';
        const isWave = config.layout === 'bosp_wave';
        const isAurora = config.layout === 'aurora_glass';
        const isDiagonal = config.layout === 'geometris' || config.layout === 'swiss_ribbon';
        const isBento = config.layout === 'neo_bento';
        const hasLeftSpine =
            !isFramed && !isNusantara && !isWave && !isAurora && !isDiagonal && !isBento;

        return (
            <div
                ref={ref}
                style={{
                    width: `${spec.designWidth}px`,
                    height: `${spec.designHeight}px`,
                    fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif",
                    backgroundColor: inkSaver
                        ? '#FFFFFF'
                        : isBento
                          ? '#F2F4F8'
                          : palette.surfaceTint,
                    color: palette.darkText,
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: isFramed
                        ? '52px 54px'
                        : isNusantara
                          ? '82px 60px 76px 60px'
                          : isWave
                            ? '54px 58px 82px 58px'
                            : '64px 60px',
                }}
            >
                {/* 1. Ornamen Adaptif per Keluarga Tema Cover */}
                {hasLeftSpine && (
                    <>
                        <div
                            style={{
                                position: 'absolute',
                                top: 0,
                                bottom: 0,
                                left: 0,
                                width: '18px',
                                backgroundColor: palette.primary,
                            }}
                        />
                        <div
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: '18px',
                                width: '6px',
                                height: '240px',
                                backgroundColor: palette.accent,
                            }}
                        />
                    </>
                )}

                {isFramed && (
                    <>
                        <div
                            style={{
                                position: 'absolute',
                                inset: '24px',
                                border: `2.5px solid ${palette.primary}`,
                                borderRadius: '12px',
                                pointerEvents: 'none',
                            }}
                        />
                        <div
                            style={{
                                position: 'absolute',
                                inset: '33px',
                                border: `1px solid ${palette.accent}`,
                                borderRadius: '8px',
                                pointerEvents: 'none',
                            }}
                        />
                    </>
                )}

                {isNusantara && (
                    <>
                        <div
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: '52px',
                                backgroundColor: inkSaver ? '#FFFFFF' : palette.primary,
                                borderBottom: `4px solid ${palette.accent}`,
                                overflow: 'hidden',
                            }}
                        >
                            {config.show_geometric_pattern && (
                                <NusantaraPatternSvg
                                    width={spec.designWidth}
                                    height={52}
                                    primaryColor={inkSaver ? palette.primary : '#FFFFFF'}
                                    accentColor={palette.accent}
                                    opacity={inkSaver ? 0.25 : 0.34}
                                />
                            )}
                        </div>
                        <div
                            style={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                height: '44px',
                                backgroundColor: inkSaver ? '#FFFFFF' : palette.primary,
                                borderTop: `4px solid ${palette.accent}`,
                                overflow: 'hidden',
                            }}
                        >
                            {config.show_geometric_pattern && (
                                <NusantaraPatternSvg
                                    width={spec.designWidth}
                                    height={44}
                                    primaryColor={inkSaver ? palette.primary : '#FFFFFF'}
                                    accentColor={palette.accent}
                                    opacity={inkSaver ? 0.25 : 0.34}
                                />
                            )}
                        </div>
                    </>
                )}

                {isWave && (
                    <svg
                        width={spec.designWidth}
                        height="68"
                        viewBox="0 0 800 68"
                        preserveAspectRatio="none"
                        style={{ position: 'absolute', bottom: 0, left: 0 }}
                    >
                        {!inkSaver ? (
                            <>
                                <path
                                    d="M0,14 C250,64 530,48 800,8 L800,68 L0,68 Z"
                                    fill={palette.accent}
                                />
                                <path
                                    d="M0,24 C230,68 560,34 800,20 L800,68 L0,68 Z"
                                    fill={palette.secondary}
                                />
                                <path
                                    d="M0,36 C280,68 540,46 800,34 L800,68 L0,68 Z"
                                    fill={palette.primary}
                                />
                            </>
                        ) : (
                            <rect x="0" y="58" width="800" height="10" fill={palette.primary} />
                        )}
                    </svg>
                )}

                {isAurora && !inkSaver && (
                    <svg
                        width={spec.designWidth}
                        height={spec.designHeight}
                        viewBox={`0 0 ${spec.designWidth} ${spec.designHeight}`}
                        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
                    >
                        <defs>
                            <radialGradient id="divAurora1" cx="85%" cy="15%" r="45%">
                                <stop offset="0%" stopColor={palette.accent} stopOpacity="0.28" />
                                <stop offset="100%" stopColor={palette.accent} stopOpacity="0" />
                            </radialGradient>
                            <radialGradient id="divAurora2" cx="12%" cy="85%" r="45%">
                                <stop offset="0%" stopColor={palette.primary} stopOpacity="0.2" />
                                <stop offset="100%" stopColor={palette.primary} stopOpacity="0" />
                            </radialGradient>
                        </defs>
                        <rect width={spec.designWidth} height={spec.designHeight} fill="url(#divAurora1)" />
                        <rect width={spec.designWidth} height={spec.designHeight} fill="url(#divAurora2)" />
                    </svg>
                )}

                {isDiagonal && (
                    <>
                        <svg
                            width={spec.designWidth}
                            height="120"
                            viewBox={`0 0 ${spec.designWidth} 120`}
                            style={{ position: 'absolute', top: 0, left: 0 }}
                        >
                            <polygon
                                points={`0,0 ${spec.designWidth},0 ${spec.designWidth},18 0,58`}
                                fill={palette.primary}
                            />
                            <polygon
                                points={`0,58 ${spec.designWidth},18 ${spec.designWidth},28 0,68`}
                                fill={palette.accent}
                            />
                        </svg>
                        <div
                            style={{
                                position: 'absolute',
                                right: '52px',
                                bottom: '72px',
                                fontSize: '150px',
                                fontWeight: 900,
                                lineHeight: 0.8,
                                color: palette.primary,
                                opacity: inkSaver ? 0.05 : 0.08,
                                pointerEvents: 'none',
                            }}
                        >
                            {chapter.roman}
                        </div>
                    </>
                )}

                {hasLeftSpine && config.show_geometric_pattern && (
                    <svg
                        width="320"
                        height="320"
                        viewBox="0 0 320 320"
                        style={{
                            position: 'absolute',
                            top: '-40px',
                            right: '-40px',
                            opacity: inkSaver ? 0.06 : 0.11,
                        }}
                    >
                        <circle cx="220" cy="100" r="150" fill={palette.primary} />
                        <circle cx="240" cy="160" r="70" fill={palette.accent} />
                    </svg>
                )}

                {/* 2. Header Atas */}
                <div
                    className="relative z-10 flex items-center justify-between border-b border-slate-200 pb-5"
                    style={{ marginTop: isDiagonal ? '24px' : 0 }}
                >
                    <div>
                        <div
                            style={{
                                fontSize: '11px',
                                fontWeight: 800,
                                letterSpacing: '0.18em',
                                color: palette.primary,
                                textTransform: 'uppercase',
                            }}
                        >
                            {manifest.meta.variant_label} · {periodeText}
                        </div>
                        <div
                            style={{
                                fontSize: '14px',
                                fontWeight: 700,
                                color: palette.mutedText,
                                marginTop: '4px',
                            }}
                        >
                            {schoolName}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {isWave && (config.show_logo_bosp ?? true) && (
                            <BospOfficialLogoSvg
                                width={86}
                                primaryColor={palette.primary}
                                inkSaver={inkSaver}
                            />
                        )}
                        <div
                            style={{
                                fontSize: '12px',
                                fontWeight: 900,
                                color: palette.primary,
                                border: `1.5px solid ${palette.primary}`,
                                backgroundColor: '#FFFFFF',
                                borderRadius: '999px',
                                padding: '5px 14px',
                            }}
                        >
                            TA {manifest.meta.tahun}
                        </div>
                    </div>
                </div>

                {/* 3. Tengah: Nomor Bab & Judul */}
                <div className="relative z-10 my-auto py-8">
                    <div
                        style={
                            isBento
                                ? {
                                      backgroundColor: '#FFFFFF',
                                      border: '1px solid rgba(15,23,42,0.08)',
                                      borderRadius: '24px',
                                      padding: '32px 34px',
                                  }
                                : undefined
                        }
                    >
                        <div
                            style={{
                                display: 'inline-block',
                                backgroundColor: inkSaver ? '#FFFFFF' : palette.primary,
                                color: inkSaver ? palette.primary : '#FFFFFF',
                                border: `2px solid ${palette.primary}`,
                                borderRadius: isWave ? '999px' : '14px',
                                padding: '8px 22px',
                                fontSize: '16px',
                                fontWeight: 900,
                                letterSpacing: '0.26em',
                            }}
                        >
                            BAB {chapter.roman}
                        </div>

                        <h2
                            style={{
                                marginTop: '24px',
                                fontSize: '46px',
                                fontWeight: 900,
                                lineHeight: 1.1,
                                letterSpacing: '-0.02em',
                                color: palette.primary,
                            }}
                        >
                            {chapter.title}
                        </h2>

                        <div
                            style={{
                                marginTop: '18px',
                                width: '90px',
                                height: '6px',
                                borderRadius: '999px',
                                backgroundColor: palette.accent,
                            }}
                        />

                        <p
                            style={{
                                marginTop: '18px',
                                fontSize: '18px',
                                color: palette.mutedText,
                                fontWeight: 500,
                            }}
                        >
                            {chapter.subtitle}
                        </p>
                    </div>

                    {/* Daftar isi bab ini */}
                    {activeItemLabels.length > 0 && (
                        <div
                            style={{
                                marginTop: '40px',
                                backgroundColor: isAurora && !inkSaver
                                    ? 'rgba(255,255,255,0.88)'
                                    : '#FFFFFF',
                                border: '1px solid rgba(15,23,42,0.1)',
                                borderLeft: `5px solid ${palette.accent}`,
                                borderRadius: isBento || isAurora ? '22px' : '18px',
                                padding: '24px 28px',
                                boxShadow:
                                    isAurora && !inkSaver
                                        ? '0 14px 32px rgba(15,23,42,0.06)'
                                        : 'none',
                            }}
                        >
                            <div
                                style={{
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    letterSpacing: '0.18em',
                                    color: palette.primary,
                                    textTransform: 'uppercase',
                                    marginBottom: '14px',
                                }}
                            >
                                Dokumen dalam Bagian Ini ({activeItemLabels.length})
                            </div>
                            <ol className="space-y-2.5">
                                {activeItemLabels.slice(0, 12).map((lbl, i) => (
                                    <li
                                        key={`${lbl}-${i}`}
                                        className="flex items-center gap-3 text-[14.5px] font-semibold text-slate-700"
                                    >
                                        <span
                                            style={{
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '8px',
                                                backgroundColor: palette.surfaceTint,
                                                color: palette.primary,
                                                fontSize: '11.5px',
                                                fontWeight: 800,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                            }}
                                        >
                                            {i + 1}
                                        </span>
                                        <span>{lbl}</span>
                                    </li>
                                ))}
                                {activeItemLabels.length > 12 && (
                                    <li className="pl-9 text-[13px] font-medium text-slate-500">
                                        + {activeItemLabels.length - 12} dokumen lainnya
                                    </li>
                                )}
                            </ol>
                        </div>
                    )}
                </div>

                {/* 4. Footer Bawah */}
                <div className="relative z-10 flex items-center justify-between border-t border-slate-200 pt-4 text-[11px] font-semibold text-slate-400">
                    <span>PEMBATAS BAB · BENDEL SPJ {manifest.meta.variant_label.toUpperCase()}</span>
                    <span>SIKAS · {manifest.meta.generated_at_formatted}</span>
                </div>
            </div>
        );
    },
);

SectionDividerCanvas.displayName = 'SectionDividerCanvas';

export default SectionDividerCanvas;
