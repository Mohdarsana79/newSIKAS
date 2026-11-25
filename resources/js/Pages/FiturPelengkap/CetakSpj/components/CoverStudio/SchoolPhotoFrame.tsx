import type { SpjPhotoBlend, SpjPhotoFocus } from '../../types';
import { AuroraSchoolSilhouetteSvg, SchoolArchitectureSvg } from './CoverAssets';
import type { CoverPaletteSpec } from './coverThemes';

export type PhotoFrameMode =
    | 'wave_showcase'
    | 'arch_window'
    | 'magazine_window'
    | 'glass_panorama'
    | 'angled_banner'
    | 'bento_card'
    | 'compact_banner';

interface SchoolPhotoFrameProps {
    photoUri: string | null;
    enabled: boolean;
    focus: SpjPhotoFocus;
    blend: SpjPhotoBlend;
    inkSaver: boolean;
    palette: CoverPaletteSpec;
    mode: PhotoFrameMode;
    height?: number | string;
    caption?: string;
    /** Tampilkan ilustrasi vektor saat toggle aktif namun foto belum diunggah */
    fallbackWhenEmpty?: boolean;
    /** Tampilkan ilustrasi vektor bahkan saat toggle foto dimatikan (khusus slot hero wajib seperti bosp_wave / split_magazine) */
    fallbackWhenDisabled?: boolean;
    /** Gunakan siluet cahaya aurora sebagai fallback (khusus tema aurora_glass) */
    fallbackVariant?: 'architecture' | 'aurora';
}

export function resolveObjectPosition(focus: SpjPhotoFocus): string {
    if (focus === 'top') return 'center 18%';
    if (focus === 'bottom') return 'center 82%';
    return 'center 50%';
}

/**
 * Menghitung opasitas lapisan pelindung teks/gradasi berdasarkan preferensi blend pengguna.
 */
export function resolveBlendAlpha(blend: SpjPhotoBlend): {
    tintAlpha: string;
    softWashAlpha: number;
    imgOpacity: number;
} {
    if (blend === 'vivid') {
        return { tintAlpha: '66', softWashAlpha: 0.06, imgOpacity: 1 };
    }
    if (blend === 'soft') {
        return { tintAlpha: 'CC', softWashAlpha: 0.34, imgOpacity: 0.82 };
    }
    return { tintAlpha: '9E', softWashAlpha: 0.18, imgOpacity: 0.94 };
}

/**
 * Komponen bingkai Gambar Sekolah anti-rusak:
 * - Menjaga proporsi gambar dengan `object-fit: cover` dan `object-position` terkendali.
 * - Menerapkan lapisan kontras `photo_blend` (`vivid` / `balanced` / `soft`) secara nyata di semua mode.
 * - Menghormati sakelar `enabled` (`show_foto_sekolah`).
 */
export default function SchoolPhotoFrame({
    photoUri,
    enabled,
    focus,
    blend,
    inkSaver,
    palette,
    mode,
    height = 140,
    caption,
    fallbackWhenEmpty = false,
    fallbackWhenDisabled = false,
    fallbackVariant = 'architecture',
}: SchoolPhotoFrameProps) {
    const activeUri = enabled ? photoUri : null;
    const shouldRenderFallback =
        !activeUri && (enabled ? fallbackWhenEmpty || fallbackWhenDisabled : fallbackWhenDisabled);

    if (!activeUri && !shouldRenderFallback) {
        return null;
    }

    const objPos = resolveObjectPosition(focus);
    const { tintAlpha, softWashAlpha, imgOpacity } = resolveBlendAlpha(blend);

    const renderFallbackArtwork = () =>
        fallbackVariant === 'aurora' ? (
            <AuroraSchoolSilhouetteSvg palette={palette} inkSaver={inkSaver} />
        ) : (
            <SchoolArchitectureSvg palette={palette} inkSaver={inkSaver} />
        );

    // 1. Mode Gelombang BOSP Resmi (Top sky-fade + Bottom multi-wave)
    if (mode === 'wave_showcase') {
        return (
            <div
                style={{
                    position: 'relative',
                    width: '100%',
                    height: typeof height === 'number' ? `${height}px` : height,
                    overflow: 'hidden',
                    backgroundColor: inkSaver ? '#F8FAFC' : '#E8F3FC',
                    flexShrink: 0,
                }}
            >
                {activeUri ? (
                    <img
                        src={activeUri}
                        alt="Gedung Sekolah"
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            objectPosition: objPos,
                            opacity: inkSaver ? 0.35 : imgOpacity,
                            display: 'block',
                        }}
                    />
                ) : (
                    renderFallbackArtwork()
                )}

                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '62px',
                        background: inkSaver
                            ? 'linear-gradient(180deg, #FFFFFF 0%, rgba(255,255,255,0) 100%)'
                            : `linear-gradient(180deg, ${palette.surfaceTint} 0%, ${palette.surfaceTint}CC 28%, rgba(255,255,255,0) 100%)`,
                        pointerEvents: 'none',
                    }}
                />

                {activeUri && !inkSaver && (
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundColor: palette.primary,
                            opacity: softWashAlpha * 0.55,
                            pointerEvents: 'none',
                        }}
                    />
                )}

                <svg
                    width="100%"
                    height="92"
                    viewBox="0 0 800 92"
                    preserveAspectRatio="none"
                    style={{ position: 'absolute', bottom: -1, left: 0, right: 0, display: 'block' }}
                >
                    {!inkSaver ? (
                        <>
                            <path
                                d="M0,12 C180,76 420,92 800,34 L800,92 L0,92 Z"
                                fill={palette.secondary}
                                opacity="0.88"
                            />
                            <path
                                d="M0,34 C230,94 510,18 800,52 L800,92 L0,92 Z"
                                fill={palette.primary}
                            />
                            <path
                                d="M0,66 C260,96 540,42 800,76 L800,92 L0,92 Z"
                                fill="#FFFFFF"
                            />
                        </>
                    ) : (
                        <>
                            <path
                                d="M0,48 C240,90 520,30 800,66 L800,92 L0,92 Z"
                                fill="#FFFFFF"
                            />
                            <path
                                d="M0,48 C240,90 520,30 800,66"
                                fill="none"
                                stroke={palette.primary}
                                strokeWidth="3"
                            />
                        </>
                    )}
                </svg>
            </div>
        );
    }

    // 2. Mode Kubah Arsitektural (Nusantara Heritage)
    if (mode === 'arch_window') {
        return (
            <div
                style={{
                    position: 'relative',
                    width: '100%',
                    height: typeof height === 'number' ? `${height}px` : height,
                    borderRadius: '110px 110px 20px 20px',
                    overflow: 'hidden',
                    border: `2.5px solid ${palette.accent}`,
                    boxShadow: inkSaver ? 'none' : '0 14px 32px rgba(15,23,42,0.12)',
                    backgroundColor: '#FFFFFF',
                    flexShrink: 0,
                }}
            >
                {activeUri ? (
                    <img
                        src={activeUri}
                        alt="Gedung Sekolah"
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            objectPosition: objPos,
                            opacity: inkSaver ? 0.38 : imgOpacity,
                            display: 'block',
                        }}
                    />
                ) : (
                    renderFallbackArtwork()
                )}
                <div
                    style={{
                        position: 'absolute',
                        inset: '6px',
                        borderRadius: '104px 104px 14px 14px',
                        border: '1px solid rgba(255,255,255,0.65)',
                        pointerEvents: 'none',
                    }}
                />
                {!inkSaver && (
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: `linear-gradient(180deg, transparent 44%, ${palette.primary}${tintAlpha} 100%)`,
                            pointerEvents: 'none',
                        }}
                    />
                )}
                {caption && (
                    <div
                        style={{
                            position: 'absolute',
                            bottom: '12px',
                            left: '18px',
                            right: '18px',
                            textAlign: 'center',
                            fontSize: '10.5px',
                            fontWeight: 800,
                            letterSpacing: '0.14em',
                            textTransform: 'uppercase',
                            color: inkSaver ? palette.primary : '#FFFFFF',
                        }}
                    >
                        {caption}
                    </div>
                )}
            </div>
        );
    }

    // 3. Mode Jendela Majalah Asimetris (Split Magazine)
    if (mode === 'magazine_window') {
        return (
            <div
                style={{
                    position: 'relative',
                    width: '100%',
                    height: typeof height === 'number' ? `${height}px` : height,
                    borderRadius: '28px 8px 28px 28px',
                    overflow: 'hidden',
                    border: inkSaver ? `2px solid ${palette.primary}` : '3px solid #FFFFFF',
                    boxShadow: inkSaver ? 'none' : '0 18px 36px rgba(15,23,42,0.16)',
                    backgroundColor: '#F1F5F9',
                    flexShrink: 0,
                }}
            >
                {activeUri ? (
                    <img
                        src={activeUri}
                        alt="Gedung Sekolah"
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            objectPosition: objPos,
                            opacity: inkSaver ? 0.38 : imgOpacity,
                            display: 'block',
                        }}
                    />
                ) : (
                    renderFallbackArtwork()
                )}
                {!inkSaver && (
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: `linear-gradient(180deg, rgba(15,23,42,0.04) 36%, ${palette.primary}${tintAlpha} 100%)`,
                            pointerEvents: 'none',
                        }}
                    />
                )}
                {caption && (
                    <div
                        style={{
                            position: 'absolute',
                            bottom: '14px',
                            left: '16px',
                            right: '16px',
                            fontSize: '10px',
                            fontWeight: 800,
                            letterSpacing: '0.14em',
                            textTransform: 'uppercase',
                            color: inkSaver ? palette.primary : '#FFFFFF',
                        }}
                    >
                        {caption}
                    </div>
                )}
            </div>
        );
    }

    // 4. Mode Panorama Mengambang (Aurora Glass & Swiss Ribbon)
    if (mode === 'glass_panorama') {
        return (
            <div
                style={{
                    position: 'relative',
                    width: '100%',
                    height: typeof height === 'number' ? `${height}px` : height,
                    borderRadius: '22px',
                    overflow: 'hidden',
                    border: inkSaver
                        ? `1.5px solid ${palette.primary}`
                        : '2.5px solid rgba(255,255,255,0.88)',
                    boxShadow: inkSaver ? 'none' : '0 12px 30px rgba(15,23,42,0.11)',
                    backgroundColor: '#FFFFFF',
                    flexShrink: 0,
                }}
            >
                {activeUri ? (
                    <img
                        src={activeUri}
                        alt="Gedung Sekolah"
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            objectPosition: objPos,
                            opacity: inkSaver ? 0.36 : imgOpacity,
                            display: 'block',
                        }}
                    />
                ) : (
                    renderFallbackArtwork()
                )}
                {!inkSaver && (
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: `linear-gradient(90deg, ${palette.primary}${tintAlpha} 0%, rgba(15,23,42,0.08) 58%, rgba(15,23,42,0.28) 100%)`,
                            pointerEvents: 'none',
                        }}
                    />
                )}
                {caption && (
                    <div
                        style={{
                            position: 'absolute',
                            bottom: '12px',
                            left: '18px',
                            display: 'inline-block',
                            backgroundColor: inkSaver ? '#FFFFFF' : 'rgba(255,255,255,0.92)',
                            color: palette.primary,
                            padding: '4px 12px',
                            borderRadius: '999px',
                            fontSize: '10px',
                            fontWeight: 800,
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                        }}
                    >
                        {caption}
                    </div>
                )}
            </div>
        );
    }

    // 5. Mode Kartu Aksen Miring (Geometris saat Hemat Tinta)
    if (mode === 'angled_banner') {
        return (
            <div
                style={{
                    position: 'relative',
                    width: '100%',
                    height: typeof height === 'number' ? `${height}px` : height,
                    clipPath: 'polygon(0 0, 100% 0, 97% 100%, 0 100%)',
                    borderLeft: `6px solid ${palette.accent}`,
                    borderTop: `1.5px solid ${palette.primary}`,
                    borderBottom: `1.5px solid ${palette.primary}`,
                    backgroundColor: '#FFFFFF',
                    overflow: 'hidden',
                    flexShrink: 0,
                }}
            >
                {activeUri ? (
                    <img
                        src={activeUri}
                        alt="Gedung Sekolah"
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            objectPosition: objPos,
                            opacity: inkSaver ? 0.38 : imgOpacity,
                            display: 'block',
                        }}
                    />
                ) : (
                    renderFallbackArtwork()
                )}
            </div>
        );
    }

    // 6. Mode Kartu Bento Lebar bersudut 22px (Neo-Bento) & Compact Banner (Editorial, Instansi Elegan)
    const isBento = mode === 'bento_card';
    return (
        <div
            style={{
                position: 'relative',
                width: '100%',
                height: typeof height === 'number' ? `${height}px` : height,
                borderRadius: isBento ? '22px' : '16px',
                overflow: 'hidden',
                border: isBento
                    ? '1px solid rgba(15,23,42,0.08)'
                    : `1.5px solid ${inkSaver ? palette.primary : 'rgba(15,23,42,0.12)'}`,
                backgroundColor: '#FFFFFF',
                flexShrink: 0,
            }}
        >
            {activeUri ? (
                <img
                    src={activeUri}
                    alt="Gedung Sekolah"
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        objectPosition: objPos,
                        opacity: inkSaver ? 0.35 : imgOpacity,
                        display: 'block',
                    }}
                />
            ) : (
                renderFallbackArtwork()
            )}
            {!inkSaver && (
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background: `linear-gradient(180deg, rgba(15,23,42,0.04) 28%, ${palette.primary}${tintAlpha} 100%)`,
                        pointerEvents: 'none',
                    }}
                />
            )}
            {caption && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: '10px',
                        left: '14px',
                        right: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <span
                        style={{
                            backgroundColor: inkSaver ? '#FFFFFF' : 'rgba(255,255,255,0.92)',
                            color: palette.primary,
                            fontSize: '9.5px',
                            fontWeight: 800,
                            letterSpacing: '0.14em',
                            padding: '3px 10px',
                            borderRadius: '999px',
                            textTransform: 'uppercase',
                        }}
                    >
                        {caption}
                    </span>
                </div>
            )}
        </div>
    );
}
