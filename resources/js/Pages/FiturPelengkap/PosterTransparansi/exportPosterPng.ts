import { toCanvas } from 'html-to-image';
import { POSTER_PAPER_SIZES } from './paperSizes';
import type { PosterPaperSize } from './types';

export interface ExportPosterPngOptions {
    node: HTMLElement;
    paperSize: PosterPaperSize;
    backgroundColor: string;
    fileName: string;
}

function triggerCanvasDownload(canvas: HTMLCanvasElement, fileName: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const triggerLink = (href: string, revokeAfter: boolean) => {
            const link = document.createElement('a');
            link.download = fileName;
            link.href = href;
            link.click();
            if (revokeAfter) {
                window.setTimeout(() => URL.revokeObjectURL(href), 1000);
            }
            resolve();
        };

        const fallbackToDataUrl = () => {
            try {
                triggerLink(canvas.toDataURL('image/png'), false);
            } catch (err) {
                reject(err);
            }
        };

        if (typeof canvas.toBlob === 'function') {
            canvas.toBlob((blob) => {
                if (blob) {
                    const objectUrl = URL.createObjectURL(blob);
                    triggerLink(objectUrl, true);
                    return;
                }
                fallbackToDataUrl();
            }, 'image/png');
            return;
        }

        fallbackToDataUrl();
    });
}

export async function exportPosterToPng({
    node,
    paperSize,
    backgroundColor,
    fileName,
}: ExportPosterPngOptions): Promise<void> {
    const spec = POSTER_PAPER_SIZES[paperSize];
    const docEl = document.documentElement;
    const previousInlineZoom = docEl.style.getPropertyValue('zoom');

    try {
        if (document.fonts?.ready) {
            await document.fonts.ready;
        }

        // Netralkan sementara aturan desktop `html { zoom: 0.8 }` agar hasil PNG 300 DPI utuh & tajam
        docEl.style.setProperty('zoom', '1');

        const measuredWidth = node.offsetWidth;
        const measuredHeight = node.offsetHeight;
        if (measuredWidth <= 0 || measuredHeight <= 0) {
            throw new Error('Dimensi kanvas poster tidak valid untuk diekspor.');
        }

        // Pastikan rasio kanvas selalu persis sama dengan rasio kertas (full-bleed 100%, tanpa celah kiri-kanan)
        const paperRatio = spec.exportWidth / spec.exportHeight;
        const effectiveWidth =
            measuredHeight > spec.designHeight
                ? Math.ceil(measuredHeight * paperRatio)
                : spec.designWidth;
        const effectiveHeight =
            measuredHeight > spec.designHeight
                ? Math.round(effectiveWidth * (spec.exportHeight / spec.exportWidth))
                : spec.designHeight;

        const renderPixelRatio = Math.max(
            2,
            Math.min(5, Math.ceil((spec.exportWidth / effectiveWidth) * 10) / 10),
        );

        const sourceCanvas = await toCanvas(node, {
            pixelRatio: renderPixelRatio,
            width: effectiveWidth,
            height: effectiveHeight,
            backgroundColor,
            style: {
                width: `${effectiveWidth}px`,
                minHeight: `${effectiveHeight}px`,
                height: `${effectiveHeight}px`,
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
            throw new Error('Konteks kanvas 2D tidak tersedia untuk menyusun PNG.');
        }

        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, spec.exportWidth, spec.exportHeight);

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(sourceCanvas, 0, 0, spec.exportWidth, spec.exportHeight);

        await triggerCanvasDownload(outputCanvas, fileName);
    } finally {
        if (previousInlineZoom) {
            docEl.style.setProperty('zoom', previousInlineZoom);
        } else {
            docEl.style.removeProperty('zoom');
        }
    }
}
