import { toCanvas } from 'html-to-image';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type {
    AssembledBundleResult,
    AssembledChapterMeta,
    AssemblyFailure,
    AssemblyProgress,
    AssemblyTaskChunk,
    SpjItemPrintSettings,
    SpjPaperSize,
    SpjPrintParamSchema,
    TocEntry,
} from '../types';

export interface PaperDimensionSpec {
    label: string;
    ptWidth: number;
    ptHeight: number;
    designWidth: number;
    designHeight: number;
    exportWidth: number;
    exportHeight: number;
}

export const SPJ_PAPER_SPECS: Record<SpjPaperSize, PaperDimensionSpec> = {
    F4: {
        label: 'F4 / Folio (210 × 330 mm)',
        ptWidth: 595.28,
        ptHeight: 935.43,
        designWidth: 794,
        designHeight: 1248,
        exportWidth: 2382,
        exportHeight: 3744,
    },
    A4: {
        label: 'A4 (210 × 297 mm)',
        ptWidth: 595.28,
        ptHeight: 841.89,
        designWidth: 794,
        designHeight: 1123,
        exportWidth: 2382,
        exportHeight: 3369,
    },
    Legal: {
        label: 'Legal (216 × 356 mm)',
        ptWidth: 612,
        ptHeight: 1008,
        designWidth: 794,
        designHeight: 1308,
        exportWidth: 2382,
        exportHeight: 3924,
    },
    Letter: {
        label: 'Letter (216 × 279 mm)',
        ptWidth: 612,
        ptHeight: 792,
        designWidth: 794,
        designHeight: 1028,
        exportWidth: 2382,
        exportHeight: 3084,
    },
};

/**
 * Menyuntikkan pengaturan kertas, orientasi, dan ukuran font per-item
 * ke URL endpoint PDF SIKAS sesuai skema parameter masing-masing controller.
 */
export function applyItemPrintSettingsToUrl(
    rawUrl: string,
    schema: SpjPrintParamSchema,
    settings: SpjItemPrintSettings | undefined,
    isCustomDocx = false,
): string {
    if (!rawUrl || !settings || schema === 'none' || isCustomDocx) {
        return rawUrl;
    }

    try {
        const parsed = new URL(rawUrl, window.location.origin);
        const params = parsed.searchParams;

        if (schema === 'camel') {
            params.set('paperSize', settings.paper_size);
            params.set('orientation', settings.orientation);
            params.set('fontSize', settings.font_size);
        } else if (schema === 'realisasi') {
            params.set('ukuran_kertas', settings.paper_size);
            params.set('orientasi', settings.orientation);
            params.set('font_size', settings.font_size);
        } else {
            // 'snake' (RKAS, SP2B, SPTJ, SPMTH, LPH, Kwitansi, Tanda Terima)
            params.set('paper_size', settings.paper_size);
            params.set('orientation', settings.orientation);
            params.set('font_size', settings.font_size);
        }

        return parsed.toString();
    } catch {
        return rawUrl;
    }
}

interface FetchedChunkEntry {
    task: AssemblyTaskChunk;
    bytes: Uint8Array;
    pageCount: number;
}

export interface AssembleBundleParams {
    tasks: AssemblyTaskChunk[];
    paperSize: SpjPaperSize;
    includeCover: boolean;
    includeToc: boolean;
    includeDividers: boolean;
    includePageNumbers: boolean;
    accentHex: string;
    schoolName: string;
    variantLabel: string;
    periodeLabel: string;
    fileBaseName: string;
    captureCoverPng: () => Promise<Uint8Array | null>;
    captureDividerPng: (chapterKey: string) => Promise<Uint8Array | null>;
    onProgress: (progress: AssemblyProgress) => void;
    signal?: AbortSignal;
    /** Dipakai untuk mekanisme retry/fallback dari hasil parsial sebelumnya */
    preloadedChunks?: Map<string, FetchedChunkEntry>;
}

export interface FetchPhaseOutcome {
    fetchedMap: Map<string, FetchedChunkEntry>;
    failures: AssemblyFailure[];
    cancelled: boolean;
}

/**
 * Mengambil tangkapan PNG 300 DPI dari elemen React Cover/Pembatas Bab
 * dengan kompensasi aman terhadap `html { zoom: 0.8 }` pada desktop SIKAS.
 */
export async function captureCanvasElementToPngBytes(
    node: HTMLElement,
    paperSize: SpjPaperSize,
    backgroundColor = '#ffffff',
): Promise<Uint8Array> {
    const spec = SPJ_PAPER_SPECS[paperSize];
    const docEl = document.documentElement;
    const previousInlineZoom = docEl.style.getPropertyValue('zoom');

    try {
        if (document.fonts?.ready) {
            await document.fonts.ready;
        }

        docEl.style.setProperty('zoom', '1');

        const sourceCanvas = await toCanvas(node, {
            pixelRatio: 3,
            width: spec.designWidth,
            height: spec.designHeight,
            backgroundColor,
            style: {
                width: `${spec.designWidth}px`,
                height: `${spec.designHeight}px`,
                minHeight: `${spec.designHeight}px`,
                transform: 'none',
                zoom: '1',
                margin: '0',
                borderRadius: '0',
                border: 'none',
                boxShadow: 'none',
            },
        });

        const outputCanvas = document.createElement('canvas');
        outputCanvas.width = spec.exportWidth;
        outputCanvas.height = spec.exportHeight;

        const ctx = outputCanvas.getContext('2d');
        if (!ctx) {
            throw new Error('Konteks kanvas 2D tidak tersedia.');
        }

        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, spec.exportWidth, spec.exportHeight);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(sourceCanvas, 0, 0, spec.exportWidth, spec.exportHeight);

        const blob = await new Promise<Blob>((resolve, reject) => {
            outputCanvas.toBlob((b) => {
                if (b) resolve(b);
                else reject(new Error('Gagal mengonversi kanvas cover ke PNG.'));
            }, 'image/png');
        });

        return new Uint8Array(await blob.arrayBuffer());
    } finally {
        if (previousInlineZoom) {
            docEl.style.setProperty('zoom', previousInlineZoom);
        } else {
            docEl.style.removeProperty('zoom');
        }
    }
}

/**
 * Mengunduh byte biner (PDF/PNG) ke perangkat pengguna.
 */
export function triggerBytesDownload(bytes: Uint8Array, mimeType: string, filename: string): void {
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const blob = new Blob([buffer], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * Membuka PDF di tab baru agar pengguna dapat langsung preview atau cetak (Ctrl+P).
 */
export function openPdfInNewTab(bytes: Uint8Array): void {
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const blob = new Blob([buffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * Membangun PDF 1 halaman untuk unduh Cover Saja.
 */
export async function buildSingleCoverPdfBytes(
    coverPngBytes: Uint8Array,
    paperSize: SpjPaperSize,
): Promise<Uint8Array> {
    const spec = SPJ_PAPER_SPECS[paperSize];
    const pdfDoc = await PDFDocument.create();
    const img = await pdfDoc.embedPng(coverPngBytes);
    const page = pdfDoc.addPage([spec.ptWidth, spec.ptHeight]);
    page.drawImage(img, {
        x: 0,
        y: 0,
        width: spec.ptWidth,
        height: spec.ptHeight,
    });

    return pdfDoc.save();
}

/**
 * Menarik seluruh chunk PDF dengan concurrency terkendali (maks 2 paralel) dan validasi header PDF.
 */
export async function fetchAllChunksWithConcurrency(
    tasks: AssemblyTaskChunk[],
    onProgress: (progress: AssemblyProgress) => void,
    signal?: AbortSignal,
    existingMap?: Map<string, FetchedChunkEntry>,
): Promise<FetchPhaseOutcome> {
    const fetchedMap = new Map<string, FetchedChunkEntry>(existingMap ?? []);
    const failures: AssemblyFailure[] = [];
    const pendingTasks = tasks.filter((t) => !fetchedMap.has(t.chunkId));

    let completedCount = tasks.length - pendingTasks.length;
    let pagesCollected = Array.from(fetchedMap.values()).reduce((sum, entry) => sum + entry.pageCount, 0);

    const MAX_CONCURRENCY = 2;
    let cursor = 0;
    let cancelled = false;

    const worker = async () => {
        while (cursor < pendingTasks.length) {
            if (signal?.aborted) {
                cancelled = true;
                return;
            }

            const task = pendingTasks[cursor++];
            onProgress({
                stage: 'fetching_chunks',
                completedCount,
                totalCount: tasks.length,
                currentLabel: task.chunkLabel,
                pagesCollected,
            });

            try {
                const { bytes, pageCount } = await fetchAndValidatePdfChunk(task.url, signal);
                fetchedMap.set(task.chunkId, { task, bytes, pageCount });
                pagesCollected += pageCount;
            } catch (err) {
                if (signal?.aborted) {
                    cancelled = true;
                    return;
                }
                const message = err instanceof Error ? err.message : 'Gagal mengambil dokumen PDF.';
                failures.push({
                    task,
                    reason: message,
                    canFallbackToDefault: task.isCustomTemplate && task.fallbackUrl !== task.url,
                });
            } finally {
                completedCount++;
                onProgress({
                    stage: 'fetching_chunks',
                    completedCount,
                    totalCount: tasks.length,
                    currentLabel: task.chunkLabel,
                    pagesCollected,
                });
            }
        }
    };

    const workers = Array.from({ length: Math.min(MAX_CONCURRENCY, pendingTasks.length || 1) }, () => worker());
    await Promise.all(workers);

    return { fetchedMap, failures, cancelled };
}

async function fetchAndValidatePdfChunk(
    url: string,
    signal?: AbortSignal,
): Promise<{ bytes: Uint8Array; pageCount: number }> {
    const response = await fetch(url, {
        method: 'GET',
        credentials: 'same-origin',
        headers: {
            Accept: 'application/pdf, application/json;q=0.9',
            'X-Requested-With': 'XMLHttpRequest',
        },
        signal,
    });

    const contentType = (response.headers.get('content-type') || '').toLowerCase();

    if (!response.ok) {
        if (contentType.includes('application/json')) {
            try {
                const payload = (await response.json()) as { message?: string };
                throw new Error(payload.message || `HTTP ${response.status}`);
            } catch (jsonErr) {
                if (jsonErr instanceof Error && jsonErr.message !== '') {
                    throw jsonErr;
                }
            }
        }
        throw new Error(`Server mengembalikan HTTP ${response.status}.`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Validasi header magic %PDF-
    if (
        bytes.length < 5 ||
        bytes[0] !== 0x25 || // %
        bytes[1] !== 0x50 || // P
        bytes[2] !== 0x44 || // D
        bytes[3] !== 0x46 || // F
        bytes[4] !== 0x2d // -
    ) {
        throw new Error(
            'Respons bukan berkas PDF valid (kemungkinan data kosong atau terjadi redirect halaman).',
        );
    }

    try {
        const parsed = await PDFDocument.load(bytes, { ignoreEncryption: false });
        return { bytes, pageCount: parsed.getPageCount() };
    } catch (loadErr) {
        const msg = loadErr instanceof Error ? loadErr.message : '';
        if (msg.toLowerCase().includes('encrypt')) {
            throw new Error(
                'Berkas PDF terproteksi kata sandi (terenkripsi). Hapus proteksi kata sandi PDF lalu unggah ulang.',
            );
        }
        throw new Error(`Berkas PDF tidak dapat dibaca (${msg || 'struktur rusak'}).`);
    }
}

/**
 * Menggabungkan Cover, Daftar Isi Otomatis (bernomor halaman akurat), Pembatas Bab,
 * dan seluruh dokumen terpilih menjadi 1 PDF utuh + indeks Portrait/Landscape/Bab.
 */
export async function finalizeAssembledBundle(
    params: AssembleBundleParams,
    fetchedMap: Map<string, FetchedChunkEntry>,
    failures: AssemblyFailure[],
): Promise<AssembledBundleResult> {
    const spec = SPJ_PAPER_SPECS[params.paperSize];

    // 1. Kelompokkan task berhasil sesuai urutan bab & item
    interface ChapterGroup {
        chapterKey: string;
        roman: string;
        title: string;
        items: Array<{
            itemKey: string;
            itemLabel: string;
            chunks: FetchedChunkEntry[];
            totalPages: number;
        }>;
    }

    const chapterMap = new Map<string, ChapterGroup>();
    const orderedChapters: ChapterGroup[] = [];

    for (const task of params.tasks) {
        const entry = fetchedMap.get(task.chunkId);
        if (!entry) continue;

        let chapterGroup = chapterMap.get(task.chapterKey);
        if (!chapterGroup) {
            chapterGroup = {
                chapterKey: task.chapterKey,
                roman: task.chapterRoman,
                title: task.chapterTitle,
                items: [],
            };
            chapterMap.set(task.chapterKey, chapterGroup);
            orderedChapters.push(chapterGroup);
        }

        let itemGroup = chapterGroup.items.find((it) => it.itemKey === task.itemKey);
        if (!itemGroup) {
            itemGroup = {
                itemKey: task.itemKey,
                itemLabel: task.itemLabel,
                chunks: [],
                totalPages: 0,
            };
            chapterGroup.items.push(itemGroup);
        }

        itemGroup.chunks.push(entry);
        itemGroup.totalPages += entry.pageCount;
    }

    // 2. Hitung estimasi jumlah halaman Daftar Isi terlebih dahulu
    const estimatedTocLines = orderedChapters.reduce((sum, ch) => sum + 1 + ch.items.length, 0);
    const LINES_PER_TOC_PAGE = 26;
    const tocPageCount = params.includeToc && estimatedTocLines > 0
        ? Math.max(1, Math.ceil(estimatedTocLines / LINES_PER_TOC_PAGE))
        : 0;

    // 3. Hitung nomor halaman mulai yang 100% akurat untuk setiap Bab & Sub-dokumen
    const coverPageCount = params.includeCover ? 1 : 0;
    let cursorPage = coverPageCount + tocPageCount + 1;
    const tocEntries: TocEntry[] = [];

    for (const ch of orderedChapters) {
        const chStartPage = cursorPage;
        const chDividerPages = params.includeDividers ? 1 : 0;
        const chContentPages = ch.items.reduce((s, it) => s + it.totalPages, 0);

        tocEntries.push({
            kind: 'chapter',
            chapterKey: ch.chapterKey,
            roman: ch.roman,
            title: `BAB ${ch.roman} — ${ch.title}`,
            pageNumber: chStartPage,
            pageCount: chDividerPages + chContentPages,
        });

        cursorPage += chDividerPages;

        for (const it of ch.items) {
            tocEntries.push({
                kind: 'item',
                chapterKey: ch.chapterKey,
                title: it.itemLabel,
                pageNumber: cursorPage,
                pageCount: it.totalPages,
            });
            cursorPage += it.totalPages;
        }
    }

    // 4. Rakit PDF Master
    const masterDoc = await PDFDocument.create();
    masterDoc.setTitle(`SPJ ${params.variantLabel} - ${params.periodeLabel}`);
    masterDoc.setAuthor(params.schoolName);
    masterDoc.setCreator('SIKAS - Sistem Informasi Keuangan Sekolah');

    // 4a. Cover LPJ Modern (300 DPI Full-Bleed)
    if (params.includeCover) {
        params.onProgress({
            stage: 'capturing_cover',
            completedCount: params.tasks.length,
            totalCount: params.tasks.length,
            currentLabel: 'Merender Cover LPJ Modern (300 DPI)...',
            pagesCollected: cursorPage - 1,
        });
        const coverBytes = await params.captureCoverPng();
        if (coverBytes) {
            const coverImg = await masterDoc.embedPng(coverBytes);
            const coverPage = masterDoc.addPage([spec.ptWidth, spec.ptHeight]);
            coverPage.drawImage(coverImg, {
                x: 0,
                y: 0,
                width: spec.ptWidth,
                height: spec.ptHeight,
            });
        }
    }

    // 4b. Daftar Isi Otomatis (Teks Vektor Tajam `pdf-lib`)
    if (params.includeToc && tocEntries.length > 0) {
        params.onProgress({
            stage: 'building_toc',
            completedCount: params.tasks.length,
            totalCount: params.tasks.length,
            currentLabel: 'Menyusun Daftar Isi Otomatis...',
            pagesCollected: cursorPage - 1,
        });
        await appendTocPages(masterDoc, {
            paperSize: params.paperSize,
            entries: tocEntries,
            totalPages: cursorPage - 1,
            accentHex: params.accentHex,
            schoolName: params.schoolName,
            variantLabel: params.variantLabel,
            periodeLabel: params.periodeLabel,
            linesPerPage: LINES_PER_TOC_PAGE,
        });
    }

    // 4c. Setiap Bab: Pembatas Bab (opsional) + Copy seluruh halaman chunk
    params.onProgress({
        stage: 'finalizing',
        completedCount: params.tasks.length,
        totalCount: params.tasks.length,
        currentLabel: 'Menggabungkan seluruh dokumen ke 1 PDF utuh...',
        pagesCollected: cursorPage - 1,
    });

    const assembledChapters: AssembledChapterMeta[] = [];

    for (const ch of orderedChapters) {
        const chapterPageIndices: number[] = [];
        const startPageNumber = masterDoc.getPageCount() + 1;

        if (params.includeDividers) {
            const dividerBytes = await params.captureDividerPng(ch.chapterKey);
            if (dividerBytes) {
                const divImg = await masterDoc.embedPng(dividerBytes);
                const divPage = masterDoc.addPage([spec.ptWidth, spec.ptHeight]);
                divPage.drawImage(divImg, {
                    x: 0,
                    y: 0,
                    width: spec.ptWidth,
                    height: spec.ptHeight,
                });
                chapterPageIndices.push(masterDoc.getPageCount() - 1);
            }
        }

        for (const it of ch.items) {
            for (const chunk of it.chunks) {
                const srcDoc = await PDFDocument.load(chunk.bytes);
                const indices = srcDoc.getPageIndices();
                const copiedPages = await masterDoc.copyPages(srcDoc, indices);
                for (const page of copiedPages) {
                    masterDoc.addPage(page);
                    chapterPageIndices.push(masterDoc.getPageCount() - 1);
                }
                // Lepas buffer mentah segera setelah halaman disalin untuk menghemat RAM browser
                fetchedMap.delete(chunk.task.chunkId);
            }
        }

        assembledChapters.push({
            chapterKey: ch.chapterKey,
            roman: ch.roman,
            title: ch.title,
            startPage: startPageNumber,
            pageCount: chapterPageIndices.length,
            pageIndices: chapterPageIndices,
        });
    }

    // 4d. Opsional Stempel Nomor Halaman Footer (mulai setelah Cover)
    const totalPages = masterDoc.getPageCount();
    if (params.includePageNumbers && totalPages > 0) {
        const font = await masterDoc.embedFont(StandardFonts.Helvetica);
        const startIdx = params.includeCover ? 1 : 0;

        for (let i = startIdx; i < totalPages; i++) {
            const page = masterDoc.getPage(i);
            const { width } = page.getSize();
            const label = `Halaman ${i + 1} dari ${totalPages}`;
            const textWidth = font.widthOfTextAtSize(label, 8.5);
            page.drawText(label, {
                x: Math.max(24, width - textWidth - 28),
                y: 16,
                size: 8.5,
                font,
                color: rgb(0.38, 0.42, 0.48),
            });
        }
    }

    // 5. Klasifikasi Orientasi Akurat (memperhitungkan rotasi halaman 90°/270°)
    const portraitPageIndices: number[] = [];
    const landscapePageIndices: number[] = [];

    for (let i = 0; i < totalPages; i++) {
        const page = masterDoc.getPage(i);
        const { width, height } = page.getSize();
        const angle = ((page.getRotation().angle % 360) + 360) % 360;
        const effectiveWidth = angle === 90 || angle === 270 ? height : width;
        const effectiveHeight = angle === 90 || angle === 270 ? width : height;

        if (effectiveWidth > effectiveHeight) {
            landscapePageIndices.push(i);
        } else {
            portraitPageIndices.push(i);
        }
    }

    const fullPdfBytes = await masterDoc.save();

    return {
        fullPdfBytes,
        totalPages,
        portraitPageCount: portraitPageIndices.length,
        landscapePageCount: landscapePageIndices.length,
        portraitPageIndices,
        landscapePageIndices,
        tocEntries,
        chapters: assembledChapters,
        failures,
        fileBaseName: params.fileBaseName,
    };
}

/**
 * Mengekstrak subset halaman (Portrait saja, Landscape saja, atau 1 Bab) secara instan tanpa generate ulang.
 */
export async function extractSubsetPdfBytes(
    fullPdfBytes: Uint8Array,
    pageIndices: number[],
): Promise<Uint8Array> {
    const srcDoc = await PDFDocument.load(fullPdfBytes);
    const targetDoc = await PDFDocument.create();
    const copied = await targetDoc.copyPages(srcDoc, pageIndices);
    for (const p of copied) {
        targetDoc.addPage(p);
    }

    return targetDoc.save();
}

function hexToRgbTuple(hex: string): [number, number, number] {
    const cleaned = hex.replace('#', '').trim();
    if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) {
        return [0.12, 0.25, 0.48];
    }
    const r = parseInt(cleaned.slice(0, 2), 16) / 255;
    const g = parseInt(cleaned.slice(2, 4), 16) / 255;
    const b = parseInt(cleaned.slice(4, 6), 16) / 255;

    return [r, g, b];
}

function sanitizeWinAnsi(text: string): string {
    return text
        .replace(/[–—]/g, '-')
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ');
}

async function appendTocPages(
    doc: PDFDocument,
    opts: {
        paperSize: SpjPaperSize;
        entries: TocEntry[];
        totalPages: number;
        accentHex: string;
        schoolName: string;
        variantLabel: string;
        periodeLabel: string;
        linesPerPage: number;
    },
): Promise<void> {
    const spec = SPJ_PAPER_SPECS[opts.paperSize];
    const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const [ar, ag, ab] = hexToRgbTuple(opts.accentHex);

    const totalTocPages = Math.max(1, Math.ceil(opts.entries.length / opts.linesPerPage));

    for (let pageIdx = 0; pageIdx < totalTocPages; pageIdx++) {
        const page = doc.addPage([spec.ptWidth, spec.ptHeight]);
        const marginX = 48;
        const contentWidth = spec.ptWidth - marginX * 2;
        let y = spec.ptHeight - 54;

        // Strip aksen atas
        page.drawRectangle({
            x: 0,
            y: spec.ptHeight - 10,
            width: spec.ptWidth,
            height: 10,
            color: rgb(ar, ag, ab),
        });

        // Header Daftar Isi
        page.drawText('DAFTAR ISI BENDEL SPJ', {
            x: marginX,
            y,
            size: 18,
            font: fontBold,
            color: rgb(0.1, 0.13, 0.2),
        });

        const pageCounterLabel =
            totalTocPages > 1 ? `Lembar ${pageIdx + 1}/${totalTocPages}` : `Total ${opts.totalPages} Halaman`;
        const counterWidth = fontRegular.widthOfTextAtSize(pageCounterLabel, 9.5);
        page.drawText(pageCounterLabel, {
            x: spec.ptWidth - marginX - counterWidth,
            y: y + 3,
            size: 9.5,
            font: fontBold,
            color: rgb(ar, ag, ab),
        });

        y -= 18;
        page.drawText(
            sanitizeWinAnsi(`${opts.schoolName}  |  ${opts.variantLabel}  |  ${opts.periodeLabel}`),
            {
                x: marginX,
                y,
                size: 9.5,
                font: fontRegular,
                color: rgb(0.4, 0.45, 0.52),
            },
        );

        y -= 14;
        page.drawLine({
            start: { x: marginX, y },
            end: { x: spec.ptWidth - marginX, y },
            thickness: 1.5,
            color: rgb(ar, ag, ab),
        });

        y -= 24;

        const slice = opts.entries.slice(
            pageIdx * opts.linesPerPage,
            (pageIdx + 1) * opts.linesPerPage,
        );

        for (const entry of slice) {
            const isChapter = entry.kind === 'chapter';
            const font = isChapter ? fontBold : fontRegular;
            const fontSize = isChapter ? 10.5 : 9.8;
            const indent = isChapter ? 0 : 16;

            if (isChapter) {
                y -= 4;
                page.drawRectangle({
                    x: marginX,
                    y: y - 5,
                    width: contentWidth,
                    height: 20,
                    color: rgb(0.95, 0.96, 0.98),
                });
            }

            const titleText = sanitizeWinAnsi(entry.title).slice(0, 74);
            const pageNumText = String(entry.pageNumber);
            const pageNumWidth = fontBold.widthOfTextAtSize(pageNumText, fontSize);
            const titleWidth = font.widthOfTextAtSize(titleText, fontSize);

            page.drawText(titleText, {
                x: marginX + indent + (isChapter ? 6 : 0),
                y,
                size: fontSize,
                font,
                color: isChapter ? rgb(0.1, 0.14, 0.22) : rgb(0.22, 0.26, 0.33),
            });

            if (!isChapter) {
                const dotStart = marginX + indent + titleWidth + 8;
                const dotEnd = spec.ptWidth - marginX - pageNumWidth - 10;
                if (dotEnd > dotStart + 10) {
                    const dotWidth = fontRegular.widthOfTextAtSize('.', 9);
                    const dotCount = Math.floor((dotEnd - dotStart) / (dotWidth * 2.4));
                    const dots = '. '.repeat(Math.max(0, dotCount));
                    page.drawText(dots, {
                        x: dotStart,
                        y,
                        size: 9,
                        font: fontRegular,
                        color: rgb(0.68, 0.72, 0.78),
                    });
                }
            }

            page.drawText(pageNumText, {
                x: spec.ptWidth - marginX - pageNumWidth - (isChapter ? 6 : 0),
                y,
                size: fontSize,
                font: fontBold,
                color: isChapter ? rgb(ar, ag, ab) : rgb(0.15, 0.19, 0.27),
            });

            y -= isChapter ? 24 : 21;
        }

        // Footer Daftar Isi
        page.drawLine({
            start: { x: marginX, y: 42 },
            end: { x: spec.ptWidth - marginX, y: 42 },
            thickness: 0.6,
            color: rgb(0.84, 0.87, 0.91),
        });
        page.drawText(
            sanitizeWinAnsi('Disusun otomatis oleh SIKAS - Nomor halaman dihitung dari dokumen SPJ aktual'),
            {
                x: marginX,
                y: 28,
                size: 8,
                font: fontRegular,
                color: rgb(0.5, 0.55, 0.62),
            },
        );
    }
}
