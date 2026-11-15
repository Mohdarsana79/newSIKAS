/**
 * AuthScene — hand-built inline SVG illustration for the SIKAS auth brand panel.
 * A quiet "paper & clay" homework nook: arched window, light wood desk, laptop
 * lid seen from behind, mug with steam, a small book stack, a potted plant and
 * three floating finance chips. No raster assets, no icon library, no people.
 *
 * All motion lives in one scoped <style> block; keyframes are prefixed
 * `authScene` so they can never collide with global CSS. Motion is disabled for
 * visitors who prefer reduced motion.
 */

const ARCH_OUTER = 'M 198 366 L 198 210 A 182 182 0 0 1 562 210 L 562 366 Z';
const ARCH_GLASS = 'M 214 366 L 214 210 A 166 166 0 0 1 546 210 L 546 366 Z';
const DESK_PATH = 'M 0 484 C 180 462 580 462 760 484 L 760 700 L 0 700 Z';
const DESK_LIP = 'M 0 668 C 200 656 560 656 760 668 L 760 700 L 0 700 Z';

const sceneStyles = `
.as-scene {
    animation: authSceneEnter 0.9s cubic-bezier(0.2, 0.7, 0.2, 1) both;
}
.as-bob,
.as-sway,
.as-cloud,
.as-sun,
.as-spark,
.as-steam {
    will-change: transform, opacity;
}
.as-bob {
    transform-box: fill-box;
    transform-origin: 50% 50%;
    animation: authSceneBob 8s ease-in-out infinite;
}
.as-bob-alt {
    animation-name: authSceneBobAlt;
    animation-duration: 7.2s;
    animation-delay: -2.6s;
}
.as-bob-slow {
    animation-duration: 9s;
    animation-delay: -5.1s;
}
.as-sway {
    transform-box: fill-box;
    transform-origin: 50% 100%;
    animation: authSceneSway 7s ease-in-out infinite;
}
.as-sway-b {
    transform-origin: 100% 100%;
    animation-duration: 6.2s;
    animation-delay: -1.8s;
}
.as-sway-c {
    transform-origin: 0% 100%;
    animation-duration: 7.8s;
    animation-delay: -3.4s;
}
.as-cloud {
    transform-box: fill-box;
    transform-origin: 50% 50%;
    animation: authSceneDrift 19s ease-in-out infinite;
}
.as-cloud-b {
    animation-duration: 23s;
    animation-delay: -7s;
}
.as-sun {
    transform-box: fill-box;
    transform-origin: 50% 50%;
    animation: authSceneSun 8s ease-in-out infinite;
}
.as-spark {
    transform-box: fill-box;
    transform-origin: 50% 50%;
    animation: authSceneSparkle 5s ease-in-out infinite;
}
.as-spark-b {
    animation-duration: 4.2s;
    animation-delay: -1.4s;
}
.as-spark-c {
    animation-duration: 6s;
    animation-delay: -2.9s;
}
.as-spark-d {
    animation-duration: 4.6s;
    animation-delay: -3.6s;
}
.as-steam {
    opacity: 0;
    transform-box: fill-box;
    transform-origin: 50% 100%;
    animation: authSceneSteam 4.6s ease-in-out infinite;
}
.as-steam-b {
    animation-delay: 2.3s;
}
@keyframes authSceneEnter {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}
@keyframes authSceneBob {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(-7px) rotate(1.1deg); }
}
@keyframes authSceneBobAlt {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(-5px) rotate(-1.1deg); }
}
@keyframes authSceneSway {
    0%, 100% { transform: rotate(-2.6deg); }
    50% { transform: rotate(2.6deg); }
}
@keyframes authSceneDrift {
    0%, 100% { transform: translateX(-5px); }
    50% { transform: translateX(5px); }
}
@keyframes authSceneSun {
    0%, 100% { opacity: 0.4; transform: scale(0.94); }
    50% { opacity: 0.72; transform: scale(1.05); }
}
@keyframes authSceneSparkle {
    0%, 100% { opacity: 0.25; transform: scale(0.65); }
    50% { opacity: 1; transform: scale(1); }
}
@keyframes authSceneSteam {
    0% { opacity: 0; transform: translateY(8px) scale(0.85); }
    30% { opacity: 0.7; }
    65% { opacity: 0.35; }
    100% { opacity: 0; transform: translateY(-30px) scale(1.05); }
}
@media (prefers-reduced-motion: reduce) {
    .as-scene,
    .as-bob,
    .as-sway,
    .as-cloud,
    .as-sun,
    .as-spark,
    .as-steam {
        animation: none;
    }
    .as-steam {
        opacity: 0.45;
    }
}
`;

export default function AuthScene({ className = '' }: { className?: string }) {
    return (
        <div className="as-scene relative w-full">
            <style>{sceneStyles}</style>
            <svg
                role="presentation"
                aria-hidden="true"
                focusable="false"
                className={`block h-auto w-full ${className}`}
                viewBox="0 0 760 700"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <linearGradient id="asWall" x1="0" y1="0" x2="0.35" y2="1">
                        <stop offset="0" stopColor="#FDF8EF" />
                        <stop offset="0.55" stopColor="#F8F1E3" />
                        <stop offset="1" stopColor="#EBDBC4" />
                    </linearGradient>
                    <linearGradient id="asWallLight" x1="0" y1="0" x2="0.55" y2="0.7">
                        <stop offset="0" stopColor="#FFFDF8" stopOpacity="0.65" />
                        <stop offset="1" stopColor="#FFFDF8" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="asDesk" x1="0" y1="0" x2="0.25" y2="1">
                        <stop offset="0" stopColor="#EDD2AC" />
                        <stop offset="0.45" stopColor="#E4C49C" />
                        <stop offset="1" stopColor="#CDA476" />
                    </linearGradient>
                    <linearGradient id="asDeskSheen" x1="0" y1="0" x2="0.6" y2="1">
                        <stop offset="0" stopColor="#FFFDF8" stopOpacity="0.26" />
                        <stop offset="0.55" stopColor="#FFFDF8" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="asDeskTopShade" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#221C33" stopOpacity="0.1" />
                        <stop offset="0.09" stopColor="#221C33" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="asDeskLip" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#C79B69" />
                        <stop offset="1" stopColor="#B78958" />
                    </linearGradient>
                    <radialGradient id="asDeskLight" cx="0.5" cy="0.5" r="0.5">
                        <stop offset="0" stopColor="#FFE9C9" stopOpacity="0.55" />
                        <stop offset="1" stopColor="#FFE9C9" stopOpacity="0" />
                    </radialGradient>
                    <linearGradient id="asFrame" x1="0" y1="0" x2="0.3" y2="1">
                        <stop offset="0" stopColor="#FFFDF8" />
                        <stop offset="0.6" stopColor="#F9EFDF" />
                        <stop offset="1" stopColor="#EADCC6" />
                    </linearGradient>
                    <linearGradient id="asSky" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#CFE4FA" />
                        <stop offset="0.58" stopColor="#E2ECEC" />
                        <stop offset="1" stopColor="#F7E9D2" />
                    </linearGradient>
                    <linearGradient id="asHaze" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#F7E9D2" stopOpacity="0" />
                        <stop offset="1" stopColor="#F7E9D2" stopOpacity="0.6" />
                    </linearGradient>
                    <linearGradient id="asHillFar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#C9D8BE" />
                        <stop offset="1" stopColor="#B2C7A8" />
                    </linearGradient>
                    <linearGradient id="asHillNear" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#A8BF9D" />
                        <stop offset="1" stopColor="#90AC88" />
                    </linearGradient>
                    <radialGradient id="asSun" cx="0.42" cy="0.38" r="0.62">
                        <stop offset="0" stopColor="#FFD9A6" />
                        <stop offset="0.55" stopColor="#F7B183" />
                        <stop offset="1" stopColor="#EC8F63" />
                    </radialGradient>
                    <radialGradient id="asSunGlow" cx="0.5" cy="0.5" r="0.5">
                        <stop offset="0" stopColor="#FFD79A" stopOpacity="0.62" />
                        <stop offset="1" stopColor="#FFD79A" stopOpacity="0" />
                    </radialGradient>
                    <linearGradient id="asGlassSheen" x1="0" y1="0" x2="0.6" y2="1">
                        <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.45" />
                        <stop offset="0.6" stopColor="#FFFFFF" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="asNotePaper" x1="0" y1="0" x2="0.2" y2="1">
                        <stop offset="0" stopColor="#FFFDF8" />
                        <stop offset="1" stopColor="#F8EFDF" />
                    </linearGradient>
                    <linearGradient id="asSilver" x1="0" y1="0" x2="0.9" y2="0.95">
                        <stop offset="0" stopColor="#F9F6F4" />
                        <stop offset="0.5" stopColor="#E7E1E5" />
                        <stop offset="1" stopColor="#C9C0CE" />
                    </linearGradient>
                    <linearGradient id="asCloud" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#FFFDF8" />
                        <stop offset="0.7" stopColor="#FBF2E3" />
                        <stop offset="1" stopColor="#F2E3CC" />
                    </linearGradient>
                    <linearGradient id="asLidInner" x1="0" y1="0" x2="0.25" y2="1">
                        <stop offset="0" stopColor="#F9F6F4" />
                        <stop offset="1" stopColor="#E9E3E7" />
                    </linearGradient>
                    <linearGradient id="asBase" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#EFE9ED" />
                        <stop offset="1" stopColor="#AFA4B3" />
                    </linearGradient>
                    <linearGradient id="asBaseLip" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#C4BAC7" />
                        <stop offset="1" stopColor="#9E94A4" />
                    </linearGradient>
                    <radialGradient id="asLilacCoin" cx="0.35" cy="0.3" r="0.8">
                        <stop offset="0" stopColor="#F5F0FF" />
                        <stop offset="1" stopColor="#E5DBFF" />
                    </radialGradient>
                    <linearGradient id="asBookViolet" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0" stopColor="#7758E4" />
                        <stop offset="1" stopColor="#5B3DD0" />
                    </linearGradient>
                    <linearGradient id="asBookPeach" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0" stopColor="#F9C3A0" />
                        <stop offset="1" stopColor="#F3A87C" />
                    </linearGradient>
                    <linearGradient id="asBookSage" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0" stopColor="#A9C3A2" />
                        <stop offset="1" stopColor="#8FAE8B" />
                    </linearGradient>
                    <linearGradient id="asPot" x1="0" y1="0" x2="0.8" y2="1">
                        <stop offset="0" stopColor="#E0A17F" />
                        <stop offset="1" stopColor="#C4835C" />
                    </linearGradient>
                    <linearGradient id="asMug" x1="0" y1="0" x2="1" y2="0.2">
                        <stop offset="0" stopColor="#FCC7A6" />
                        <stop offset="1" stopColor="#F3A87C" />
                    </linearGradient>
                    <linearGradient id="asLeaf" x1="0" y1="0" x2="0.8" y2="1">
                        <stop offset="0" stopColor="#AEC7A5" />
                        <stop offset="1" stopColor="#8FAE8B" />
                    </linearGradient>
                    <linearGradient id="asLeafDark" x1="0" y1="0" x2="0.8" y2="1">
                        <stop offset="0" stopColor="#9DB797" />
                        <stop offset="1" stopColor="#75936F" />
                    </linearGradient>
                    <linearGradient id="asSteam" x1="0" y1="1" x2="0" y2="0">
                        <stop offset="0" stopColor="#FFFDF8" stopOpacity="0.1" />
                        <stop offset="0.5" stopColor="#FFFDF8" stopOpacity="0.8" />
                        <stop offset="1" stopColor="#FFFDF8" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="asCard" x1="0" y1="0" x2="0.2" y2="1">
                        <stop offset="0" stopColor="#FFFDF8" />
                        <stop offset="1" stopColor="#FAF1E3" />
                    </linearGradient>
                    <radialGradient id="asCardShadow" cx="0.5" cy="0.5" r="0.5">
                        <stop offset="0" stopColor="#221C33" stopOpacity="0.27" />
                        <stop offset="0.55" stopColor="#221C33" stopOpacity="0.13" />
                        <stop offset="1" stopColor="#221C33" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="asContact" cx="0.5" cy="0.5" r="0.5">
                        <stop offset="0" stopColor="#221C33" stopOpacity="0.3" />
                        <stop offset="0.55" stopColor="#221C33" stopOpacity="0.13" />
                        <stop offset="1" stopColor="#221C33" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="asContactSoft" cx="0.5" cy="0.5" r="0.5">
                        <stop offset="0" stopColor="#221C33" stopOpacity="0.14" />
                        <stop offset="1" stopColor="#221C33" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="asVignette" cx="0.5" cy="0.5" r="0.5">
                        <stop offset="0" stopColor="#221C33" stopOpacity="0.16" />
                        <stop offset="1" stopColor="#221C33" stopOpacity="0" />
                    </radialGradient>
                    <clipPath id="asGlassClip">
                        <path d={ARCH_GLASS} />
                    </clipPath>
                    <clipPath id="asDeskClip">
                        <path d={DESK_PATH} />
                    </clipPath>
                    <g id="asLeafShape">
                        <path
                            d="M 0 0 C 10 -12 26 -19 43 -19 C 37 -5 19 4 0 0 Z"
                            stroke="#5F7F5B"
                            strokeOpacity="0.25"
                            strokeWidth="1.1"
                        />
                        <path
                            d="M 3 -1 C 15 -7 28 -13 38 -16"
                            stroke="#FFFDF8"
                            strokeOpacity="0.42"
                            strokeWidth="1.3"
                            strokeLinecap="round"
                            fill="none"
                        />
                    </g>
                    <path
                        id="asSparkle"
                        d="M 0 -10 C 1.5 -3.1 3.1 -1.5 10 0 C 3.1 1.5 1.5 3.1 0 10 C -1.5 3.1 -3.1 1.5 -10 0 C -3.1 -1.5 -1.5 -3.1 0 -10 Z"
                    />
                    <filter
                        id="asGrain"
                        x="0"
                        y="0"
                        width="760"
                        height="700"
                        filterUnits="userSpaceOnUse"
                    >
                        <feTurbulence
                            type="fractalNoise"
                            baseFrequency="0.9"
                            numOctaves="2"
                            stitchTiles="stitch"
                        />
                        <feColorMatrix
                            type="matrix"
                            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.4 0.4 0.4 0 0"
                        />
                    </filter>
                </defs>

                {/* warm wall, lit from the upper left */}
                <rect width="760" height="700" fill="url(#asWall)" />
                <rect width="760" height="700" fill="url(#asWallLight)" />

                {/* hand-drawn dashed orbits, tucked behind the window */}
                <g strokeLinecap="round" fill="none">
                    <path
                        d="M 88 320 C 92 214 140 128 232 66"
                        stroke="#6D4DE0"
                        strokeOpacity="0.26"
                        strokeWidth="1.6"
                        strokeDasharray="1 9"
                    />
                    <path
                        d="M 532 70 C 610 86 676 130 718 200"
                        stroke="#E7C069"
                        strokeOpacity="0.42"
                        strokeWidth="1.6"
                        strokeDasharray="1 8"
                    />
                </g>

                {/* arched window */}
                <g>
                    <path d={ARCH_OUTER} transform="translate(8 11)" fill="#221C33" opacity="0.07" />
                    <path d={ARCH_OUTER} transform="translate(3 5)" fill="#221C33" opacity="0.07" />
                    <path
                        d={ARCH_OUTER}
                        fill="url(#asFrame)"
                        stroke="#221C33"
                        strokeOpacity="0.13"
                        strokeWidth="1.5"
                    />

                    <g clipPath="url(#asGlassClip)">
                        <rect x="214" y="40" width="332" height="326" fill="url(#asSky)" />
                        <circle className="as-sun" cx="472" cy="128" r="62" fill="url(#asSunGlow)" />
                        <circle cx="472" cy="128" r="26" fill="url(#asSun)" />

                        <g className="as-cloud">
                            <g transform="translate(280 150)">
                                <path
                                    d="M -4 14 C -16 14 -20 3 -9 -2 C -13 -14 2 -20 10 -12 C 15 -24 36 -21 37 -7 C 50 -7 54 7 43 14 Z"
                                    fill="#E6D9C4"
                                    opacity="0.35"
                                    transform="translate(0 2.5)"
                                />
                                <path
                                    d="M -4 14 C -16 14 -20 3 -9 -2 C -13 -14 2 -20 10 -12 C 15 -24 36 -21 37 -7 C 50 -7 54 7 43 14 Z"
                                    fill="url(#asCloud)"
                                    opacity="0.9"
                                />
                            </g>
                        </g>
                        <g className="as-cloud as-cloud-b">
                            <g transform="translate(438 212) scale(0.78)">
                                <path
                                    d="M -4 14 C -16 14 -20 3 -9 -2 C -13 -14 2 -20 10 -12 C 15 -24 36 -21 37 -7 C 50 -7 54 7 43 14 Z"
                                    fill="#E6D9C4"
                                    opacity="0.35"
                                    transform="translate(0 2.5)"
                                />
                                <path
                                    d="M -4 14 C -16 14 -20 3 -9 -2 C -13 -14 2 -20 10 -12 C 15 -24 36 -21 37 -7 C 50 -7 54 7 43 14 Z"
                                    fill="url(#asCloud)"
                                    opacity="0.78"
                                />
                            </g>
                        </g>

                        <rect x="214" y="304" width="332" height="36" fill="url(#asHaze)" />
                        <path
                            d="M 214 348 C 260 330 306 342 352 332 C 398 322 436 340 478 330 C 512 322 532 334 546 330 L 546 366 L 214 366 Z"
                            fill="url(#asHillFar)"
                            opacity="0.85"
                        />
                        <path
                            d="M 214 358 C 254 344 292 354 334 348 C 382 340 420 354 464 347 C 500 341 526 352 546 349 L 546 366 L 214 366 Z"
                            fill="url(#asHillNear)"
                        />

                        <rect
                            x="214"
                            y="44"
                            width="332"
                            height="322"
                            fill="url(#asGlassSheen)"
                            opacity="0.45"
                        />
                        <path
                            d={ARCH_GLASS}
                            stroke="#221C33"
                            strokeOpacity="0.08"
                            strokeWidth="12"
                            fill="none"
                        />
                        <path
                            d={ARCH_GLASS}
                            stroke="#221C33"
                            strokeOpacity="0.13"
                            strokeWidth="2.5"
                            fill="none"
                        />
                    </g>

                    {/* mullions plus the shadows they throw down-right */}
                    <rect x="374" y="46" width="12" height="320" rx="5" fill="url(#asFrame)" />
                    <rect x="386" y="48" width="5" height="316" fill="#221C33" opacity="0.05" />
                    <rect x="383" y="48" width="3" height="316" fill="#D9C8B0" opacity="0.45" />
                    <rect x="214" y="247" width="332" height="11" rx="5" fill="url(#asFrame)" />
                    <rect x="214" y="258" width="332" height="5" fill="#221C33" opacity="0.05" />
                    <rect x="216" y="255" width="328" height="3" fill="#D9C8B0" opacity="0.4" />
                    <rect x="216" y="248" width="328" height="2" fill="#FFFDF8" opacity="0.5" />
                    <path
                        d="M 208 332 L 208 210 A 172 172 0 0 1 258 88"
                        stroke="#FFFDF8"
                        strokeOpacity="0.6"
                        strokeWidth="2"
                        strokeLinecap="round"
                        fill="none"
                    />

                    {/* sill */}
                    <ellipse cx="380" cy="390" rx="214" ry="13" fill="url(#asContactSoft)" />
                    <rect
                        x="180"
                        y="362"
                        width="400"
                        height="18"
                        rx="9"
                        fill="url(#asFrame)"
                        stroke="#221C33"
                        strokeOpacity="0.08"
                        strokeWidth="1.2"
                    />
                    <rect x="196" y="366" width="368" height="3" rx="1.5" fill="#FFFDF8" opacity="0.55" />
                    <path
                        d="M 186 378 H 574"
                        stroke="#221C33"
                        strokeOpacity="0.06"
                        strokeWidth="2"
                        strokeLinecap="round"
                    />
                </g>

                {/* little folded note, propped on the window sill */}
                <g transform="translate(520 348) rotate(-7)">
                    <rect x="-34" y="-24" width="74" height="56" rx="4" fill="#221C33" opacity="0.07" />
                    <path
                        d="M -37 -28 H 25 L 37 -16 V 22 Q 37 26 33 26 H -33 Q -37 26 -37 22 V -24 Q -37 -28 -33 -28 Z"
                        fill="url(#asNotePaper)"
                        stroke="#221C33"
                        strokeOpacity="0.06"
                        strokeWidth="1"
                    />
                    <path d="M 25 -28 L 37 -16 L 25 -16 Z" fill="#EFE1CB" />
                    <path
                        d="M 25 -28 L 37 -16"
                        stroke="#221C33"
                        strokeOpacity="0.09"
                        strokeWidth="1"
                    />
                    <g strokeLinecap="round" fill="none">
                        <path d="M -24 -8 H 24" stroke="#6B6178" strokeOpacity="0.35" strokeWidth="2.4" />
                        <path d="M -24 3 H 8" stroke="#6B6178" strokeOpacity="0.3" strokeWidth="2.4" />
                        <path d="M -24 14 H 18" stroke="#6D4DE0" strokeOpacity="0.3" strokeWidth="2.4" />
                    </g>
                </g>

                {/* desk */}
                <g>
                    <path d={DESK_PATH} fill="url(#asDesk)" />
                    <path d={DESK_PATH} fill="url(#asDeskSheen)" />
                    <path d={DESK_PATH} fill="url(#asDeskTopShade)" />
                    <g clipPath="url(#asDeskClip)">
                        <ellipse cx="340" cy="560" rx="250" ry="70" fill="url(#asDeskLight)" />
                        <g
                            stroke="#8A6B4A"
                            strokeOpacity="0.12"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            fill="none"
                        >
                            <path d="M -20 548 C 140 534 320 556 470 540 C 600 528 700 542 790 532" />
                            <path d="M -20 596 C 120 586 260 606 420 592 C 560 580 690 596 790 588" />
                            <path d="M 40 644 C 200 634 360 654 540 638 C 660 628 720 638 790 630" />
                        </g>
                        <g
                            stroke="#FFFDF8"
                            strokeOpacity="0.16"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                            fill="none"
                        >
                            <path d="M -20 572 C 160 560 360 582 520 566 C 640 554 720 566 790 558" />
                            <path d="M 80 620 C 260 610 420 628 600 614" />
                        </g>
                        <ellipse cx="648" cy="604" rx="15" ry="6.5" fill="#8A6B4A" opacity="0.07" />
                        <path
                            d="M 640 604 C 645 600 652 600 657 604 C 652 608 645 608 640 604 Z"
                            stroke="#8A6B4A"
                            strokeOpacity="0.12"
                            strokeWidth="1.3"
                            fill="none"
                        />
                        {/* the ring a mug leaves behind */}
                        <g transform="rotate(-8 490 594)" opacity="0.45">
                            <ellipse
                                cx="490"
                                cy="594"
                                rx="27"
                                ry="9"
                                stroke="#8A6B4A"
                                strokeOpacity="0.16"
                                strokeWidth="1.6"
                                strokeDasharray="104 24"
                                fill="none"
                            />
                        </g>
                    </g>
                    <path d={DESK_LIP} fill="url(#asDeskLip)" />
                    <path
                        d="M 0 668 C 200 656 560 656 760 668"
                        stroke="#FFFDF8"
                        strokeOpacity="0.22"
                        strokeWidth="2"
                        fill="none"
                    />
                    <path
                        d="M 0 676 C 200 664 560 664 760 676"
                        stroke="#8A6B4A"
                        strokeOpacity="0.1"
                        strokeWidth="2"
                        fill="none"
                    />
                    <ellipse cx="380" cy="722" rx="490" ry="120" fill="url(#asVignette)" />
                </g>

                {/* contact shadows */}
                <g>
                    <ellipse cx="270" cy="552" rx="120" ry="17" fill="url(#asContact)" />
                    <ellipse cx="419" cy="560" rx="46" ry="11" fill="url(#asContact)" />
                    <ellipse cx="536" cy="566" rx="82" ry="15" fill="url(#asContact)" />
                    <ellipse cx="112" cy="618" rx="68" ry="14" fill="url(#asContact)" />
                </g>

                {/* laptop, open, lid seen from behind */}
                <g>
                    <ellipse cx="270" cy="548" rx="94" ry="5.5" fill="#221C33" opacity="0.12" />
                    <rect x="194" y="312" width="164" height="200" rx="17" fill="#221C33" opacity="0.08" />
                    {/* base deck and front lip */}
                    <rect x="164" y="510" width="212" height="36" rx="12" fill="url(#asBase)" />
                    <rect x="170" y="512" width="200" height="14" rx="7" fill="#F7F3F5" opacity="0.5" />
                    <path
                        d="M 208 518 H 332"
                        stroke="#6B6178"
                        strokeOpacity="0.2"
                        strokeWidth="4"
                        strokeDasharray="6 5"
                        strokeLinecap="round"
                    />
                    <path
                        d="M 226 525 H 314"
                        stroke="#6B6178"
                        strokeOpacity="0.14"
                        strokeWidth="3.5"
                        strokeDasharray="10 6"
                        strokeLinecap="round"
                    />
                    <rect x="164" y="534" width="212" height="12" rx="6" fill="url(#asBaseLip)" />
                    <path
                        d="M 168 535 H 372"
                        stroke="#FFFDF8"
                        strokeOpacity="0.28"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                    />
                    <path
                        d="M 170 544 H 370"
                        stroke="#221C33"
                        strokeOpacity="0.1"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                    />
                    {/* hinge */}
                    <rect x="194" y="500" width="152" height="12" rx="6" fill="#A99EAF" />
                    <rect x="200" y="501" width="140" height="2.5" rx="1.25" fill="#FFFDF8" opacity="0.25" />
                    <path
                        d="M 196 512 H 344"
                        stroke="#221C33"
                        strokeOpacity="0.14"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                    />
                    <rect
                        x="188"
                        y="304"
                        width="164"
                        height="200"
                        rx="17"
                        fill="url(#asSilver)"
                        stroke="#221C33"
                        strokeOpacity="0.12"
                        strokeWidth="1.5"
                    />
                    <rect
                        x="200"
                        y="316"
                        width="140"
                        height="176"
                        rx="9"
                        fill="url(#asLidInner)"
                        stroke="#221C33"
                        strokeOpacity="0.05"
                        strokeWidth="1.2"
                        opacity="0.85"
                    />
                    <path
                        d="M 199 328 L 199 400"
                        stroke="#FFFDF8"
                        strokeOpacity="0.6"
                        strokeWidth="3"
                        strokeLinecap="round"
                    />
                    <path
                        d="M 200 322 Q 200 312 210 312 L 330 312"
                        stroke="#FFFDF8"
                        strokeOpacity="0.4"
                        strokeWidth="2"
                        strokeLinecap="round"
                        fill="none"
                    />
                    <path
                        d="M 204 490 Q 230 497 270 497 Q 310 497 336 490"
                        stroke="#221C33"
                        strokeOpacity="0.035"
                        strokeWidth="6"
                        fill="none"
                    />
                    <path
                        d="M 190 503 H 350"
                        stroke="#221C33"
                        strokeOpacity="0.1"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                    />
                    <path
                        d="M 196 498 Q 200 502 210 502 H 330 Q 340 502 344 498"
                        stroke="#221C33"
                        strokeOpacity="0.06"
                        strokeWidth="4"
                        fill="none"
                    />
                    {/* the small sprout mark on the lid */}
                    <g>
                        <circle
                            cx="270"
                            cy="404"
                            r="24"
                            fill="url(#asLilacCoin)"
                            stroke="#4A2FB0"
                            strokeOpacity="0.22"
                            strokeWidth="1.5"
                        />
                        <path
                            d="M 270 414 C 258 406 255 392 266 383 C 276 389 280 404 270 414 Z"
                            fill="#6D4DE0"
                        />
                        <path
                            d="M 270 414 C 270 408 273 402 278 397"
                            stroke="#4A2FB0"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            fill="none"
                        />
                        <path
                            d="M 270 410 C 265 404 263 397 264 390"
                            stroke="#FFFDF8"
                            strokeOpacity="0.35"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                            fill="none"
                        />
                    </g>
                </g>

                {/* mug */}
                <g>
                    <ellipse cx="419" cy="556" rx="30" ry="4.5" fill="#221C33" opacity="0.12" />
                    <path
                        d="M 444 516 C 464 512 468 538 444 542"
                        stroke="#E29A72"
                        strokeWidth="9"
                        strokeLinecap="round"
                        fill="none"
                    />
                    <path
                        d="M 444 516 C 464 512 468 538 444 542"
                        stroke="#FBDCC6"
                        strokeOpacity="0.3"
                        strokeWidth="3"
                        strokeLinecap="round"
                        fill="none"
                    />
                    <path
                        d="M 394 506 L 394 538 Q 394 554 410 554 L 428 554 Q 444 554 444 538 L 444 506 Z"
                        fill="url(#asMug)"
                        stroke="#221C33"
                        strokeOpacity="0.08"
                        strokeWidth="1.2"
                    />
                    <ellipse
                        cx="419"
                        cy="506"
                        rx="25"
                        ry="6.5"
                        fill="#F8DCC2"
                        stroke="#E0936B"
                        strokeOpacity="0.5"
                        strokeWidth="1.2"
                    />
                    <ellipse cx="419" cy="506" rx="18" ry="4.2" fill="#D6A07A" opacity="0.85" />
                    <path
                        d="M 404 514 L 404 538"
                        stroke="#FFFDF8"
                        strokeOpacity="0.5"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                    />
                    <path
                        d="M 402 546 Q 410 551 419 551 Q 428 551 436 546"
                        stroke="#221C33"
                        strokeOpacity="0.05"
                        strokeWidth="5"
                        strokeLinecap="round"
                        fill="none"
                    />
                </g>

                {/* steam: two slow curls */}
                <g fill="none" stroke="url(#asSteam)" strokeWidth="4" strokeLinecap="round">
                    <path
                        className="as-steam"
                        d="M 411 496 C 401 482 417 470 407 454 C 401 444 408 434 414 428"
                    />
                    <path
                        className="as-steam as-steam-b"
                        d="M 429 496 C 437 481 423 468 431 452 C 435 442 430 432 424 426"
                    />
                </g>

                {/* book stack */}
                <g>
                    <ellipse cx="536" cy="559" rx="58" ry="5.5" fill="#221C33" opacity="0.1" />
                    <g transform="rotate(-2.2 534 547)">
                        <rect
                            x="476"
                            y="536"
                            width="118"
                            height="22"
                            rx="6"
                            fill="url(#asBookSage)"
                            stroke="#221C33"
                            strokeOpacity="0.1"
                            strokeWidth="1.2"
                        />
                        <rect x="492" y="540" width="86" height="2" rx="1" fill="#FFFDF8" opacity="0.3" />
                        <rect x="572" y="539" width="14" height="17" rx="3" fill="#F0E2CB" />
                        <path d="M 574 544 H 584 M 574 549 H 584" stroke="#DCC9AC" strokeWidth="1" />
                    </g>
                    <g transform="rotate(1.6 534 523)">
                        <rect
                            x="486"
                            y="512"
                            width="112"
                            height="22"
                            rx="6"
                            fill="url(#asBookPeach)"
                            stroke="#221C33"
                            strokeOpacity="0.1"
                            strokeWidth="1.2"
                        />
                        <rect x="502" y="516" width="78" height="2" rx="1" fill="#FFFDF8" opacity="0.32" />
                        <rect x="576" y="515" width="14" height="17" rx="3" fill="#F4E6D0" />
                        <path d="M 578 520 H 588 M 578 525 H 588" stroke="#DCC9AC" strokeWidth="1" />
                    </g>
                    <g transform="rotate(-1.2 534 499)">
                        <rect
                            x="480"
                            y="488"
                            width="116"
                            height="22"
                            rx="6"
                            fill="url(#asBookViolet)"
                            stroke="#221C33"
                            strokeOpacity="0.1"
                            strokeWidth="1.2"
                        />
                        <rect x="496" y="492" width="82" height="2" rx="1" fill="#FFFDF8" opacity="0.32" />
                        <rect x="574" y="491" width="14" height="17" rx="3" fill="#F0E2CB" />
                        <path d="M 576 496 H 586 M 576 501 H 586" stroke="#DCC9AC" strokeWidth="1" />
                        <path d="M 566 498 L 566 532 L 560 526 L 554 532 L 554 498 Z" fill="#E7C069" />
                    </g>
                </g>

                {/* potted plant */}
                <g>
                    <ellipse cx="112" cy="614" rx="40" ry="4" fill="#221C33" opacity="0.12" />
                    <path
                        d="M 64 526 L 152 526 L 143 598 Q 141 611 128 611 L 88 611 Q 75 611 73 598 Z"
                        fill="url(#asPot)"
                        stroke="#221C33"
                        strokeOpacity="0.08"
                        strokeWidth="1.2"
                    />
                    <rect
                        x="55"
                        y="510"
                        width="106"
                        height="16"
                        rx="8"
                        fill="#F2E2CD"
                        stroke="#221C33"
                        strokeOpacity="0.07"
                        strokeWidth="1.2"
                    />
                    <rect x="62" y="513" width="92" height="3" rx="1.5" fill="#FFFDF8" opacity="0.5" />
                    <path
                        d="M 65 528 H 151"
                        stroke="#221C33"
                        strokeOpacity="0.1"
                        strokeWidth="3"
                    />
                    <path
                        d="M 78 534 C 78 562 82 586 86 598"
                        stroke="#FFFDF8"
                        strokeOpacity="0.22"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        fill="none"
                    />
                    <path
                        d="M 141 533 C 139 564 133 588 129 600"
                        stroke="#221C33"
                        strokeOpacity="0.08"
                        strokeWidth="2"
                        strokeLinecap="round"
                        fill="none"
                    />
                    <path
                        d="M 80 600 Q 108 608 136 598"
                        stroke="#8A5A3E"
                        strokeOpacity="0.1"
                        strokeWidth="3"
                        strokeLinecap="round"
                        fill="none"
                    />
                    <g className="as-sway">
                        <path
                            d="M 105 526 C 100 492 104 460 98 430"
                            stroke="#7E9C79"
                            strokeWidth="3.2"
                            strokeLinecap="round"
                            fill="none"
                        />
                        <use
                            href="#asLeafShape"
                            transform="translate(98 430) rotate(-100) scale(1.15)"
                            fill="url(#asLeaf)"
                        />
                        <use
                            href="#asLeafShape"
                            transform="translate(102 456) rotate(-36) scale(1)"
                            fill="url(#asLeaf)"
                        />
                        <use
                            href="#asLeafShape"
                            transform="translate(107 482) rotate(12) scale(0.8)"
                            fill="url(#asLeafDark)"
                        />
                        <use
                            href="#asLeafShape"
                            transform="translate(100 444) rotate(-150) scale(0.76)"
                            fill="url(#asLeafDark)"
                        />
                    </g>
                    <g className="as-sway as-sway-b">
                        <path
                            d="M 98 528 C 82 506 70 486 60 466"
                            stroke="#7E9C79"
                            strokeWidth="3.2"
                            strokeLinecap="round"
                            fill="none"
                        />
                        <use
                            href="#asLeafShape"
                            transform="translate(60 466) rotate(-155) scale(1.02)"
                            fill="url(#asLeaf)"
                        />
                        <use
                            href="#asLeafShape"
                            transform="translate(76 488) rotate(-186) scale(0.88)"
                            fill="url(#asLeaf)"
                        />
                        <use
                            href="#asLeafShape"
                            transform="translate(90 512) rotate(-215) scale(0.7)"
                            fill="url(#asLeafDark)"
                        />
                        <use
                            href="#asLeafShape"
                            transform="translate(70 474) rotate(-118) scale(0.6)"
                            fill="url(#asLeafDark)"
                        />
                    </g>
                    <g className="as-sway as-sway-c">
                        <path
                            d="M 118 526 C 136 506 148 488 156 474"
                            stroke="#7E9C79"
                            strokeWidth="3.2"
                            strokeLinecap="round"
                            fill="none"
                        />
                        <use
                            href="#asLeafShape"
                            transform="translate(156 474) rotate(-22) scale(0.98)"
                            fill="url(#asLeaf)"
                        />
                        <use
                            href="#asLeafShape"
                            transform="translate(142 496) rotate(18) scale(0.86)"
                            fill="url(#asLeafDark)"
                        />
                        <use
                            href="#asLeafShape"
                            transform="translate(162 490) rotate(-75) scale(0.7)"
                            fill="url(#asLeaf)"
                        />
                        <use
                            href="#asLeafShape"
                            transform="translate(148 486) rotate(-52) scale(0.66)"
                            fill="url(#asLeafDark)"
                        />
                    </g>
                </g>

                {/* floating checklist card */}
                <g className="as-bob">
                    <g transform="rotate(-5.5 95 195) translate(95 195) scale(1.16) translate(-95 -195)">
                        <ellipse cx="100" cy="202" rx="68" ry="74" fill="url(#asCardShadow)" />
                        <rect
                            x="38"
                            y="132"
                            width="114"
                            height="126"
                            rx="16"
                            fill="url(#asCard)"
                            stroke="#221C33"
                            strokeOpacity="0.07"
                            strokeWidth="1.2"
                        />
                        <g>
                            <rect x="54" y="154" width="16" height="16" rx="5" fill="#E5DBFF" />
                            <path
                                d="M 58 162 L 61 165 L 67 158"
                                stroke="#4A2FB0"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                fill="none"
                            />
                            <rect x="79" y="159" width="52" height="5" rx="2.5" fill="#6B6178" opacity="0.3" />
                        </g>
                        <g>
                            <rect x="54" y="182" width="16" height="16" rx="5" fill="#E3EDDF" />
                            <path
                                d="M 58 190 L 61 193 L 67 186"
                                stroke="#5F7F5B"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                fill="none"
                            />
                            <rect x="79" y="187" width="42" height="5" rx="2.5" fill="#6B6178" opacity="0.26" />
                        </g>
                        <g>
                            <rect
                                x="54"
                                y="210"
                                width="16"
                                height="16"
                                rx="5"
                                fill="none"
                                stroke="#6B6178"
                                strokeOpacity="0.28"
                                strokeWidth="1.5"
                            />
                            <rect x="79" y="215" width="48" height="5" rx="2.5" fill="#6B6178" opacity="0.2" />
                        </g>
                    </g>
                </g>

                {/* floating bar-chart card */}
                <g className="as-bob as-bob-alt">
                    <g transform="translate(6 0) rotate(4.5 634 212) translate(634 212) scale(1.16) translate(-634 -212)">
                        <ellipse cx="638" cy="222" rx="72" ry="72" fill="url(#asCardShadow)" />
                        <rect
                            x="572"
                            y="148"
                            width="124"
                            height="126"
                            rx="16"
                            fill="url(#asCard)"
                            stroke="#221C33"
                            strokeOpacity="0.07"
                            strokeWidth="1.2"
                        />
                        <rect x="600" y="216" width="16" height="34" rx="5" fill="#C9B8F7" />
                        <rect x="626" y="198" width="16" height="52" rx="5" fill="#6D4DE0" />
                        <rect x="652" y="182" width="16" height="68" rx="5" fill="#F3A87C" />
                        <path
                            d="M 594 250 H 676"
                            stroke="#221C33"
                            strokeOpacity="0.12"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                        />
                        <path
                            d="M 608 256 V 259 M 634 256 V 259 M 660 256 V 259"
                            stroke="#6B6178"
                            strokeOpacity="0.25"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                        />
                        <text
                            x="598"
                            y="174"
                            fontFamily="Plus Jakarta Sans, Figtree, sans-serif"
                            fontSize="19"
                            fontWeight="700"
                            letterSpacing="-0.3"
                            fill="#221C33"
                        >
                            82%
                        </text>
                    </g>
                </g>

                {/* floating verified chip */}
                <g className="as-bob as-bob-slow">
                    <g transform="translate(6 10) rotate(-3.5 662 321) translate(662 321) scale(1.16) translate(-662 -321)">
                        <ellipse cx="664" cy="330" rx="62" ry="30" fill="url(#asCardShadow)" />
                        <rect
                            x="606"
                            y="298"
                            width="112"
                            height="46"
                            rx="14"
                            fill="url(#asCard)"
                            stroke="#221C33"
                            strokeOpacity="0.07"
                            strokeWidth="1.2"
                        />
                        <path
                            d="M 642 306 L 654 310 L 653 322 C 652 329 648 333 642 336 C 636 333 632 329 631 322 L 630 310 Z"
                            fill="#E5DBFF"
                        />
                        <path
                            d="M 636 319 L 641 324 L 649 314.5"
                            stroke="#4A2FB0"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                        />
                        <text
                            x="662"
                            y="326"
                            fontFamily="Plus Jakarta Sans, Figtree, sans-serif"
                            fontSize="9"
                            fontWeight="600"
                            letterSpacing="2.4"
                            fill="#6B6178"
                        >
                            RKAS
                        </text>
                    </g>
                </g>

                {/* four-point twinkles */}
                <g className="as-spark">
                    <use href="#asSparkle" transform="translate(648 70) scale(1)" fill="#E7C069" />
                </g>
                <g className="as-spark as-spark-b">
                    <use href="#asSparkle" transform="translate(118 94) scale(0.7)" fill="#E7C069" />
                </g>
                <g className="as-spark as-spark-c">
                    <use href="#asSparkle" transform="translate(734 244) scale(0.8)" fill="#F3A87C" />
                </g>
                <g className="as-spark as-spark-d">
                    <use href="#asSparkle" transform="translate(58 334) scale(0.6)" fill="#C9B8F7" />
                </g>

                {/* paper grain, the last quiet layer */}
                <rect
                    width="760"
                    height="700"
                    filter="url(#asGrain)"
                    opacity="0.14"
                    style={{ mixBlendMode: 'multiply' }}
                />
            </svg>
        </div>
    );
}
