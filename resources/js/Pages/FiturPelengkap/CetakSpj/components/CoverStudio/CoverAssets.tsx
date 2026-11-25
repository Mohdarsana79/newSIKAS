import type { SpjCoverLayoutKey } from '../../types';
import type { CoverPaletteSpec } from './coverThemes';

interface BospLogoProps {
    width?: number;
    darkBg?: boolean;
    inkSaver?: boolean;
    primaryColor?: string;
}

/**
 * Logo vektor tajam BOSP (Bantuan Operasional Satuan Pendidikan)
 * dengan siluet pita melengkung, figur merah meraih bintang emas, dan subteks resmi.
 */
export function BospOfficialLogoSvg({
    width = 132,
    darkBg = false,
    inkSaver = false,
    primaryColor = '#0A3D79',
}: BospLogoProps) {
    const textCol = darkBg && !inkSaver ? '#FFFFFF' : primaryColor;
    const subCol = darkBg && !inkSaver ? 'rgba(255,255,255,0.86)' : '#1E3A5F';
    const swooshOuter = darkBg && !inkSaver ? '#60A5FA' : '#0B4F9C';
    const swooshInner = darkBg && !inkSaver ? '#93C5FD' : '#38BDF8';
    const height = Math.round(width * 0.56);

    return (
        <svg
            width={width}
            height={height}
            viewBox="0 0 220 124"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ flexShrink: 0, display: 'block' }}
        >
            {/* Bintang emas di puncak kanan atas */}
            <polygon
                points="146,6 149.2,13.6 157.4,14.2 151.1,19.5 153.1,27.5 146,23.1 138.9,27.5 140.9,19.5 134.6,14.2 142.8,13.6"
                fill="#F59E0B"
            />
            {/* Pita lengkung biru (huruf O dinamis) */}
            <path
                d="M114 14C86 20 68 45 73 70C77 90 99 101 122 93C144 85 156 61 151 39C146 61 131 80 112 83C93 86 81 73 82 55C83 37 97 22 114 14Z"
                fill={swooshOuter}
            />
            <path
                d="M126 17C103 26 91 46 94 64C96 76 108 83 121 79C109 78 101 69 101 57C101 42 111 27 126 17Z"
                fill={swooshInner}
                opacity="0.72"
            />
            {/* Siluet figur merah meraih bintang */}
            <circle cx="122" cy="34" r="6.5" fill="#DC2626" />
            <path
                d="M104 28C111 35 117 41 123 43C129 39 136 31 142 22C139 33 134 44 128 52L126 73C122 76 118 76 116 73L118 53C112 46 107 38 104 28Z"
                fill="#DC2626"
            />
            {/* Huruf B di kiri dan SP di kanan */}
            <text
                x="12"
                y="84"
                fill={textCol}
                fontFamily="'Plus Jakarta Sans', 'Inter', sans-serif"
                fontWeight="900"
                fontSize="54"
                letterSpacing="-1"
            >
                B
            </text>
            <text
                x="146"
                y="84"
                fill={textCol}
                fontFamily="'Plus Jakarta Sans', 'Inter', sans-serif"
                fontWeight="900"
                fontSize="50"
                letterSpacing="-1.5"
            >
                SP
            </text>
            {/* Subteks resmi */}
            <text
                x="14"
                y="104"
                fill={subCol}
                fontFamily="'Plus Jakarta Sans', 'Inter', sans-serif"
                fontWeight="700"
                fontSize="12.5"
            >
                Bantuan Operasional
            </text>
            <text
                x="14"
                y="119"
                fill={subCol}
                fontFamily="'Plus Jakarta Sans', 'Inter', sans-serif"
                fontWeight="800"
                fontSize="12.5"
            >
                Satuan Pendidikan
            </text>
        </svg>
    );
}

/**
 * Emblem vektor Pendidikan (Segi Lima Biru Tut Wuri Handayani)
 * dipakai bila logo daerah/sekolah belum diunggah agar sampul tetap berwibawa.
 */
export function TutWuriEmblemSvg({ size = 68 }: { size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ flexShrink: 0, display: 'block' }}
        >
            {/* Perisai segi lima biru pendidikan */}
            <path
                d="M50 5L93 34L78 88C68 94 32 94 22 88L7 34L50 5Z"
                fill="#0284C7"
                stroke="#0369A1"
                strokeWidth="3"
            />
            <path
                d="M50 11L87 36L74 83C65 88 35 88 26 83L13 36L50 11Z"
                fill="#38BDF8"
                opacity="0.28"
            />
            {/* Pita lengkung atas */}
            <path
                d="M21 36C34 24 66 24 79 36"
                stroke="#0F172A"
                strokeWidth="5.5"
                strokeLinecap="round"
                opacity="0.78"
            />
            <path
                d="M21 36C34 24 66 24 79 36"
                stroke="#FDE047"
                strokeWidth="2"
                strokeDasharray="2 3"
                strokeLinecap="round"
            />
            {/* Sayap emas-putih & obor pengetahuan */}
            <path
                d="M50 32L55 46L68 42L59 56L72 60L56 66L50 58L44 66L28 60L41 56L32 42L45 46L50 32Z"
                fill="#FFFFFF"
                stroke="#0F172A"
                strokeWidth="1.8"
                strokeLinejoin="round"
            />
            <circle cx="50" cy="48" r="5" fill="#F59E0B" />
            {/* Buku terbuka di dasar perisai */}
            <path
                d="M31 73C38 70 45 72 50 76C55 72 62 70 69 73V81C62 78 55 80 50 84C45 80 38 78 31 81V73Z"
                fill="#FFFFFF"
                stroke="#0F172A"
                strokeWidth="1.8"
            />
        </svg>
    );
}

/**
 * Ornamen buku terbuka diapit garis horizontal simetris.
 */
export function OpenBookDividerSvg({
    color = '#0A3D79',
    lineWidth = 96,
}: {
    color?: string;
    lineWidth?: number;
}) {
    const totalW = lineWidth * 2 + 56;
    return (
        <svg
            width={totalW}
            height="28"
            viewBox={`0 0 ${totalW} 28`}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <line x1="0" y1="14" x2={lineWidth} y2="14" stroke={color} strokeWidth="2" strokeOpacity="0.65" />
            <g transform={`translate(${lineWidth + 12}, 3)`}>
                <path
                    d="M16 5C12 2.2 6 1.8 1 3.5V19.5C6 17.8 12 18.2 16 21C20 18.2 26 17.8 31 19.5V3.5C26 1.8 20 2.2 16 5Z"
                    fill={color}
                />
                <path
                    d="M16 5V21"
                    stroke="#FFFFFF"
                    strokeWidth="1.8"
                />
                <path
                    d="M2 21.5C7 19.8 12 20.2 16 23C20 20.2 25 19.8 30 21.5"
                    stroke={color}
                    strokeWidth="1.8"
                    strokeLinecap="round"
                />
            </g>
            <line
                x1={lineWidth + 56}
                y1="14"
                x2={totalW}
                y2="14"
                stroke={color}
                strokeWidth="2"
                strokeOpacity="0.65"
            />
        </svg>
    );
}

/**
 * Ilustrasi vektor arsitektur sekolah Indonesia modern 2 lantai
 * dengan bendera Merah Putih & pepohonan hijau (fallback saat foto belum diunggah).
 */
export function SchoolArchitectureSvg({
    palette,
    inkSaver = false,
}: {
    palette: CoverPaletteSpec;
    inkSaver?: boolean;
}) {
    const roofColor = inkSaver ? '#CBD5E1' : palette.primary;
    const pillarColor = inkSaver ? '#94A3B8' : palette.secondary;
    const accentColor = palette.accent;

    return (
        <svg
            width="100%"
            height="100%"
            viewBox="0 0 800 360"
            preserveAspectRatio="xMidYMid slice"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <linearGradient id="skyGradFallback" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={inkSaver ? '#F8FAFC' : '#E0F2FE'} />
                    <stop offset="65%" stopColor={inkSaver ? '#FFFFFF' : '#F0F9FF'} />
                    <stop offset="100%" stopColor="#FFFFFF" />
                </linearGradient>
            </defs>
            <rect width="800" height="360" fill="url(#skyGradFallback)" />

            {/* Awan lembut */}
            {!inkSaver && (
                <g opacity="0.7">
                    <ellipse cx="165" cy="68" rx="58" ry="18" fill="#FFFFFF" />
                    <ellipse cx="195" cy="62" rx="42" ry="16" fill="#FFFFFF" />
                    <ellipse cx="620" cy="56" rx="64" ry="18" fill="#FFFFFF" />
                </g>
            )}

            {/* Siluet pepohonan belakang */}
            <g opacity={inkSaver ? 0.22 : 0.85}>
                <circle cx="72" cy="215" r="56" fill="#15803D" />
                <circle cx="115" cy="232" r="44" fill="#16A34A" />
                <circle cx="726" cy="210" r="58" fill="#15803D" />
                <circle cx="680" cy="232" r="45" fill="#16A34A" />
            </g>

            {/* Atap limasan gedung sekolah 2 lantai */}
            <polygon points="108,136 400,66 692,136" fill={roofColor} />
            <polygon points="94,136 706,136 696,148 104,148" fill={accentColor} />

            {/* Badan utama lantai 2 & lantai 1 */}
            <rect x="122" y="148" width="556" height="172" fill="#F8FAFC" stroke={pillarColor} strokeWidth="2" />
            <rect x="122" y="226" width="556" height="10" fill={pillarColor} opacity="0.88" />

            {/* Jendela lantai 2 & lantai 1 */}
            {[152, 232, 312, 444, 524, 604].map((x) => (
                <g key={x}>
                    <rect x={x} y="166" width="46" height="42" rx="4" fill="#BAE6FD" stroke={pillarColor} strokeWidth="2" />
                    <line x1={x + 23} y1="166" x2={x + 23} y2="208" stroke={pillarColor} strokeWidth="1.5" />
                    <rect x={x} y="248" width="46" height="46" rx="4" fill="#E0F2FE" stroke={pillarColor} strokeWidth="2" />
                </g>
            ))}

            {/* Lobby tengah & pintu utama */}
            <rect x="366" y="154" width="68" height="166" fill="#FFFFFF" stroke={roofColor} strokeWidth="2" />
            <polygon points="354,154 400,126 446,154" fill={accentColor} />
            <rect x="380" y="256" width="40" height="64" rx="4" fill={roofColor} />
            <line x1="400" y1="256" x2="400" y2="320" stroke="#FFFFFF" strokeWidth="1.5" />

            {/* Pilar-pilar vertikal koridor */}
            {[130, 212, 294, 498, 580, 662].map((px) => (
                <rect key={px} x={px} y="148" width="10" height="172" fill={pillarColor} />
            ))}

            {/* Taman depan */}
            <rect x="70" y="316" width="660" height="44" fill={inkSaver ? '#E2E8F0' : '#DCFCE7'} />
            {!inkSaver &&
                [190, 275, 525, 610].map((tx) => (
                    <g key={tx}>
                        <polygon points={`${tx},270 ${tx - 16},316 ${tx + 16},316`} fill="#16A34A" />
                        <polygon points={`${tx},284 ${tx - 13},318 ${tx + 13},318`} fill="#22C55E" />
                    </g>
                ))}

            {/* Tiang Bendera & Merah Putih */}
            <rect x="424" y="92" width="4" height="228" rx="2" fill="#64748B" />
            <circle cx="426" cy="90" r="4" fill="#F59E0B" />
            <path d="M428 95C446 92 458 100 474 97V113C458 116 446 108 428 111V95Z" fill="#EF4444" />
            <path d="M428 111C446 108 458 116 474 113V129C458 132 446 124 428 127V111Z" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1" />
        </svg>
    );
}

/**
 * Ilustrasi pola cahaya aurora & siluet arsitektur sekolah modern (khusus tema Aurora Glassmorphism).
 */
export function AuroraSchoolSilhouetteSvg({
    palette,
    inkSaver = false,
}: {
    palette: CoverPaletteSpec;
    inkSaver?: boolean;
}) {
    return (
        <svg
            width="100%"
            height="100%"
            viewBox="0 0 800 260"
            preserveAspectRatio="xMidYMid slice"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <linearGradient id="auroraBannerBg" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={inkSaver ? '#F8FAFC' : palette.primary} />
                    <stop offset="55%" stopColor={inkSaver ? '#F1F5F9' : palette.secondary} />
                    <stop offset="100%" stopColor={inkSaver ? '#E2E8F0' : palette.accent} />
                </linearGradient>
            </defs>
            <rect width="800" height="260" fill="url(#auroraBannerBg)" />
            {!inkSaver && (
                <>
                    <circle cx="640" cy="60" r="95" fill="#FFFFFF" opacity="0.16" />
                    <circle cx="180" cy="40" r="70" fill={palette.accent} opacity="0.22" />
                </>
            )}
            {/* Siluet gedung sekolah futuristik berlapis */}
            <path
                d="M90 260V155L240 120L400 78L560 120L710 155V260H90Z"
                fill={inkSaver ? palette.primary : '#FFFFFF'}
                opacity={inkSaver ? 0.14 : 0.22}
            />
            <path
                d="M150 260V172H650V260H150Z"
                fill={inkSaver ? palette.primary : '#FFFFFF'}
                opacity={inkSaver ? 0.18 : 0.28}
            />
            {[200, 275, 350, 425, 500, 575].map((wx) => (
                <rect
                    key={wx}
                    x={wx}
                    y="190"
                    width="34"
                    height="42"
                    rx="6"
                    fill={inkSaver ? '#FFFFFF' : palette.accent}
                    opacity={inkSaver ? 0.8 : 0.55}
                />
            ))}
        </svg>
    );
}

/**
 * Pola ornamen Batik Kawung / Geometris Nusantara vektor tipis.
 */
export function NusantaraPatternSvg({
    width = 794,
    height = 68,
    primaryColor = '#152A4A',
    accentColor = '#D99B26',
    opacity = 0.22,
}: {
    width?: number;
    height?: number;
    primaryColor?: string;
    accentColor?: string;
    opacity?: number;
}) {
    const cols = Math.ceil(width / 56) + 1;
    return (
        <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ opacity, display: 'block' }}
        >
            {Array.from({ length: cols }).map((_, idx) => {
                const cx = idx * 56 + 28;
                const cy = height / 2;
                return (
                    <g key={idx}>
                        <circle cx={cx} cy={cy} r="22" stroke={primaryColor} strokeWidth="1.4" />
                        <ellipse cx={cx} cy={cy - 11} rx="7" ry="11" stroke={accentColor} strokeWidth="1.3" />
                        <ellipse cx={cx} cy={cy + 11} rx="7" ry="11" stroke={accentColor} strokeWidth="1.3" />
                        <ellipse cx={cx - 11} cy={cy} rx="11" ry="7" stroke={accentColor} strokeWidth="1.3" />
                        <ellipse cx={cx + 11} cy={cy} rx="11" ry="7" stroke={accentColor} strokeWidth="1.3" />
                        <circle cx={cx} cy={cy} r="3" fill={accentColor} />
                    </g>
                );
            })}
        </svg>
    );
}

/**
 * Miniatur siluet SVG untuk setiap dari 10 layout cover pada galeri pemilih di CoverControlPanel.
 */
export function CoverLayoutThumbnailSvg({
    layout,
    primary,
    accent,
}: {
    layout: SpjCoverLayoutKey;
    primary: string;
    accent: string;
}) {
    return (
        <svg
            width="44"
            height="60"
            viewBox="0 0 44 60"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="shrink-0 rounded-md border border-slate-200/90 bg-white shadow-sm dark:border-white/15"
        >
            <rect width="44" height="60" rx="4" fill="#F8FAFC" />

            {layout === 'bosp_wave' && (
                <>
                    <rect x="4" y="4" width="36" height="4" rx="1" fill={primary} opacity="0.25" />
                    <rect x="10" y="12" width="24" height="5" rx="2.5" fill={primary} />
                    <rect x="0" y="21" width="44" height="16" fill={primary} opacity="0.18" />
                    <path d="M0 32C14 39 28 29 44 35V40H0V32Z" fill={primary} />
                    <rect x="5" y="42" width="34" height="9" rx="2" fill="#FFFFFF" stroke={primary} strokeWidth="1" />
                    <path d="M0 56C16 52 30 59 44 53V60H0V56Z" fill={accent} />
                </>
            )}

            {layout === 'split_magazine' && (
                <>
                    <rect x="25" y="5" width="15" height="28" rx="5" fill={primary} />
                    <rect x="27" y="18" width="11" height="13" rx="3" fill={accent} opacity="0.85" />
                    <rect x="4" y="8" width="17" height="3" rx="1" fill={accent} />
                    <rect x="4" y="14" width="18" height="8" rx="1.5" fill={primary} />
                    <rect x="4" y="37" width="36" height="9" rx="2" fill="#FFFFFF" stroke="#CBD5E1" />
                    <rect x="4" y="49" width="36" height="6" rx="1.5" fill={primary} opacity="0.12" />
                </>
            )}

            {layout === 'aurora_glass' && (
                <>
                    <circle cx="10" cy="12" r="14" fill={primary} opacity="0.28" />
                    <circle cx="36" cy="22" r="12" fill={accent} opacity="0.35" />
                    <rect x="5" y="7" width="34" height="17" rx="4" fill="#FFFFFF" fillOpacity="0.86" stroke={primary} strokeOpacity="0.25" />
                    <rect x="8" y="12" width="22" height="5" rx="1.5" fill={primary} />
                    <rect x="5" y="27" width="34" height="13" rx="3.5" fill={primary} opacity="0.75" />
                    <rect x="5" y="43" width="34" height="11" rx="3" fill="#FFFFFF" stroke="#CBD5E1" />
                </>
            )}

            {layout === 'nusantara_heritage' && (
                <>
                    <rect x="0" y="0" width="44" height="6" fill={primary} />
                    <line x1="0" y1="7" x2="44" y2="7" stroke={accent} strokeWidth="1.5" />
                    <rect x="9" y="11" width="26" height="7" rx="2" fill={primary} />
                    <path d="M10 38V26C10 21 34 21 34 26V38H10Z" fill={accent} opacity="0.35" stroke={primary} strokeWidth="1" />
                    <rect x="6" y="41" width="32" height="9" rx="2" fill="#FFFFFF" stroke={primary} strokeOpacity="0.3" />
                    <rect x="0" y="54" width="44" height="6" fill={primary} />
                </>
            )}

            {layout === 'swiss_ribbon' && (
                <>
                    <text x="4" y="16" fill={primary} opacity="0.16" fontSize="13" fontWeight="900">
                        26
                    </text>
                    <polygon points="0,24 44,12 44,21 0,33" fill={primary} />
                    <polygon points="0,33 44,21 44,25 0,37" fill={accent} />
                    <rect x="5" y="38" width="34" height="9" rx="1.5" fill={primary} opacity="0.12" />
                    <rect x="5" y="50" width="24" height="5" rx="1" fill={primary} />
                </>
            )}

            {layout === 'editorial' && (
                <>
                    <rect x="0" y="0" width="7" height="60" fill={primary} />
                    <rect x="7" y="0" width="2" height="60" fill={accent} />
                    <rect x="13" y="14" width="25" height="8" rx="1.5" fill={primary} />
                    <rect x="13" y="25" width="12" height="2.5" rx="1" fill={accent} />
                    <rect x="13" y="34" width="26" height="10" rx="2" fill="#FFFFFF" stroke="#CBD5E1" />
                    <rect x="13" y="48" width="26" height="6" rx="1.5" fill={primary} opacity="0.14" />
                </>
            )}

            {layout === 'instansi_elegan' && (
                <>
                    <rect x="3" y="3" width="38" height="54" rx="2.5" stroke={primary} strokeWidth="1.4" />
                    <rect x="5.5" y="5.5" width="33" height="49" rx="1.5" stroke={accent} strokeWidth="0.8" />
                    <circle cx="18" cy="12" r="2.5" fill={primary} />
                    <circle cx="26" cy="12" r="2.5" fill={accent} />
                    <rect x="10" y="21" width="24" height="6" rx="1.5" fill={primary} />
                    <rect x="13" y="30" width="18" height="4" rx="2" fill={accent} />
                    <rect x="9" y="38" width="26" height="10" rx="2" fill="#FFFFFF" stroke="#CBD5E1" />
                </>
            )}

            {layout === 'geometris' && (
                <>
                    <polygon points="0,0 44,0 44,18 0,28" fill={primary} />
                    <polygon points="0,24 44,14 44,18 0,28" fill={accent} />
                    <rect x="6" y="32" width="32" height="10" rx="2" fill={primary} opacity="0.1" />
                    <polygon points="44,44 44,60 28,60" fill={primary} opacity="0.22" />
                </>
            )}

            {layout === 'neo_bento' && (
                <>
                    <rect x="4" y="4" width="36" height="15" rx="3.5" fill={primary} />
                    <rect x="4" y="22" width="36" height="10" rx="3" fill="#FFFFFF" stroke="#CBD5E1" />
                    <rect x="4" y="35" width="17" height="11" rx="3" fill="#FFFFFF" stroke={primary} strokeOpacity="0.35" />
                    <rect x="23" y="35" width="17" height="11" rx="3" fill="#FFFFFF" stroke={accent} />
                    <rect x="4" y="49" width="36" height="7" rx="2.5" fill="#FFFFFF" stroke="#CBD5E1" />
                </>
            )}

            {layout === 'photo_hero' && (
                <>
                    <rect x="0" y="0" width="44" height="25" fill={primary} />
                    <rect x="0" y="25" width="44" height="2.5" fill={accent} />
                    <rect x="6" y="14" width="24" height="6" rx="1.5" fill="#FFFFFF" opacity="0.9" />
                    <rect x="6" y="32" width="32" height="10" rx="2" fill="#FFFFFF" stroke="#CBD5E1" />
                    <rect x="6" y="46" width="32" height="8" rx="2" fill={primary} opacity="0.12" />
                </>
            )}
        </svg>
    );
}
