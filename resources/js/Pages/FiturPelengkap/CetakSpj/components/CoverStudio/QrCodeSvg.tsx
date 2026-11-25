import { useMemo } from 'react';

interface QrCodeSvgProps {
    value: string;
    size?: number;
    fgColor?: string;
    bgColor?: string;
}

/**
 * Generator QR Code ISO/IEC 18004 (Version 4-L, 33×33, kapasitas hingga 78 byte)
 * murni TypeScript / SVG lokal — 100% jalan offline tanpa API internet.
 */
function generateQrMatrix(rawText: string): boolean[][] {
    const VERSION = 4;
    const SIZE = 17 + VERSION * 4; // 33
    const DATA_CODEWORDS = 80;
    const EC_CODEWORDS = 20;

    // 1. Encode UTF-8 byte mode (dibatasi aman maks 76 byte agar muat di V4-L)
    const encodedBytes = Array.from(new TextEncoder().encode(rawText)).slice(0, 76);
    const bits: number[] = [];
    const pushBits = (val: number, len: number) => {
        for (let i = len - 1; i >= 0; i--) {
            bits.push((val >> i) & 1);
        }
    };

    pushBits(0b0100, 4); // Byte mode
    pushBits(encodedBytes.length, 8);
    for (const b of encodedBytes) {
        pushBits(b, 8);
    }

    const maxBits = DATA_CODEWORDS * 8;
    const terminatorLen = Math.min(4, maxBits - bits.length);
    for (let i = 0; i < terminatorLen; i++) bits.push(0);
    while (bits.length % 8 !== 0) bits.push(0);

    const dataBytes: number[] = [];
    for (let i = 0; i < bits.length; i += 8) {
        let byte = 0;
        for (let j = 0; j < 8; j++) {
            byte = (byte << 1) | bits[i + j];
        }
        dataBytes.push(byte);
    }

    const padBytes = [0xec, 0x11];
    let padIdx = 0;
    while (dataBytes.length < DATA_CODEWORDS) {
        dataBytes.push(padBytes[padIdx % 2]);
        padIdx++;
    }

    // 2. Reed-Solomon EC (GF(256), poly 0x11D)
    const ecBytes = computeReedSolomon(dataBytes, EC_CODEWORDS);
    const fullCodewords = [...dataBytes, ...ecBytes];

    // 3. Matrix & Function Patterns
    const matrix: boolean[][] = Array.from({ length: SIZE }, () => Array<boolean>(SIZE).fill(false));
    const reserved: boolean[][] = Array.from({ length: SIZE }, () => Array<boolean>(SIZE).fill(false));

    const setModule = (r: number, c: number, dark: boolean, isFunc = true) => {
        if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return;
        matrix[r][c] = dark;
        if (isFunc) reserved[r][c] = true;
    };

    const drawFinder = (top: number, left: number) => {
        for (let r = -1; r <= 7; r++) {
            for (let c = -1; c <= 7; c++) {
                const rr = top + r;
                const cc = left + c;
                if (rr < 0 || rr >= SIZE || cc < 0 || cc >= SIZE) continue;
                const inOuter = r >= 0 && r <= 6 && c >= 0 && c <= 6;
                const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
                const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
                setModule(rr, cc, inOuter && (isBorder || isCenter), true);
            }
        }
    };

    drawFinder(0, 0);
    drawFinder(0, SIZE - 7);
    drawFinder(SIZE - 7, 0);

    // Alignment pattern untuk Version 4 berada di (26, 26)
    const alignCenter = 26;
    for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
            const dark = Math.max(Math.abs(r), Math.abs(c)) !== 1;
            setModule(alignCenter + r, alignCenter + c, dark, true);
        }
    }

    // Timing patterns
    for (let i = 8; i < SIZE - 8; i++) {
        setModule(6, i, i % 2 === 0, true);
        setModule(i, 6, i % 2 === 0, true);
    }

    // Dark module
    setModule(SIZE - 8, 8, true, true);

    // Reserve format information areas
    for (let i = 0; i <= 8; i++) {
        if (i !== 6) {
            reserved[8][i] = true;
            reserved[i][8] = true;
        }
    }
    for (let i = SIZE - 8; i < SIZE; i++) {
        reserved[8][i] = true;
        reserved[i][8] = true;
    }

    // 4. Data placement zig-zag + Mask 0 ((r + c) % 2 === 0)
    const allBits: number[] = [];
    for (const cw of fullCodewords) {
        for (let i = 7; i >= 0; i--) {
            allBits.push((cw >> i) & 1);
        }
    }

    let bitCursor = 0;
    let upward = true;
    for (let col = SIZE - 1; col > 0; col -= 2) {
        if (col === 6) col--;
        for (let step = 0; step < SIZE; step++) {
            const row = upward ? SIZE - 1 - step : step;
            for (let dx = 0; dx <= 1; dx++) {
                const c = col - dx;
                if (reserved[row][c]) continue;
                const bit = bitCursor < allBits.length ? allBits[bitCursor++] : 0;
                const maskBit = (row + c) % 2 === 0 ? 1 : 0;
                matrix[row][c] = (bit ^ maskBit) === 1;
            }
        }
        upward = !upward;
    }

    // 5. Format Info: EC Level L (01) + Mask 0 (000) → 15-bit format word 0x77C4 (MSB first)
    const FORMAT_WORD = 0x77c4;
    const formatBit = (idxFromMsb: number): boolean => ((FORMAT_WORD >> (14 - idxFromMsb)) & 1) === 1;

    const coordsA: Array<[number, number]> = [
        [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
        [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
    ];
    const coordsB: Array<[number, number]> = [
        [SIZE - 1, 8], [SIZE - 2, 8], [SIZE - 3, 8], [SIZE - 4, 8], [SIZE - 5, 8], [SIZE - 6, 8], [SIZE - 7, 8],
        [8, SIZE - 8], [8, SIZE - 7], [8, SIZE - 6], [8, SIZE - 5], [8, SIZE - 4], [8, SIZE - 3], [8, SIZE - 2], [8, SIZE - 1],
    ];

    for (let i = 0; i < 15; i++) {
        const dark = formatBit(i);
        const [r1, c1] = coordsA[i];
        const [r2, c2] = coordsB[i];
        matrix[r1][c1] = dark;
        matrix[r2][c2] = dark;
    }

    return matrix;
}

function gfMul(a: number, b: number): number {
    let res = 0;
    let x = a;
    let y = b;
    for (let i = 0; i < 8; i++) {
        if ((y & 1) !== 0) res ^= x;
        const hi = (x & 0x80) !== 0;
        x = (x << 1) & 0xff;
        if (hi) x ^= 0x1d;
        y >>= 1;
    }
    return res;
}

function buildGeneratorPoly(degree: number): number[] {
    let poly = [1];
    let root = 1;
    for (let i = 0; i < degree; i++) {
        const next = new Array<number>(poly.length + 1).fill(0);
        for (let j = 0; j < poly.length; j++) {
            next[j] ^= poly[j];
            next[j + 1] ^= gfMul(poly[j], root);
        }
        poly = next;
        root = gfMul(root, 2);
    }
    return poly;
}

function computeReedSolomon(data: number[], ecCount: number): number[] {
    const gen = buildGeneratorPoly(ecCount);
    const rem = new Array<number>(ecCount).fill(0);
    for (const byte of data) {
        const factor = byte ^ rem.shift()!;
        rem.push(0);
        if (factor !== 0) {
            for (let i = 0; i < ecCount; i++) {
                rem[i] ^= gfMul(gen[i + 1], factor);
            }
        }
    }
    return rem;
}

export default function QrCodeSvg({
    value,
    size = 82,
    fgColor = '#0F172A',
    bgColor = '#FFFFFF',
}: QrCodeSvgProps) {
    const matrix = useMemo(() => generateQrMatrix(value || 'SIKAS'), [value]);
    const quiet = 2;
    const total = matrix.length + quiet * 2;

    return (
        <svg
            width={size}
            height={size}
            viewBox={`0 0 ${total} ${total}`}
            shapeRendering="crispEdges"
            aria-label="QR Verifikasi SPJ"
        >
            <rect width={total} height={total} fill={bgColor} />
            {matrix.map((row, r) =>
                row.map((dark, c) =>
                    dark ? (
                        <rect
                            key={`${r}-${c}`}
                            x={c + quiet}
                            y={r + quiet}
                            width={1}
                            height={1}
                            fill={fgColor}
                        />
                    ) : null,
                ),
            )}
        </svg>
    );
}
