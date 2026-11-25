import { forwardRef } from 'react';
import type { SpjCoverConfig, SpjManifest, SpjPaperSize } from '../../types';
import { buildCoverResolvedData } from './CoverSharedBlocks';
import { ClassicCoverLayout } from './layouts/ClassicCoverLayouts';
import { ModernCoverLayout } from './layouts/ModernCoverLayouts';

interface CoverCanvasProps {
    manifest: SpjManifest;
    config: SpjCoverConfig;
    paperSize: SpjPaperSize;
}

const CLASSIC_LAYOUTS = new Set([
    'editorial',
    'instansi_elegan',
    'geometris',
    'neo_bento',
    'photo_hero',
]);

/**
 * Kanvas utama Sampul LPJ/SPJ Modern (mendukung 10 preset layout pada resolusi ekspor 300 DPI).
 */
const CoverCanvas = forwardRef<HTMLDivElement, CoverCanvasProps>(
    ({ manifest, config, paperSize }, ref) => {
        const data = buildCoverResolvedData(manifest, config, paperSize);
        const isClassic = CLASSIC_LAYOUTS.has(config.layout);

        return (
            <div ref={ref} style={data.baseStyle}>
                {isClassic ? (
                    <ClassicCoverLayout manifest={manifest} config={config} data={data} />
                ) : (
                    <ModernCoverLayout manifest={manifest} config={config} data={data} />
                )}
            </div>
        );
    },
);

CoverCanvas.displayName = 'CoverCanvas';

export default CoverCanvas;
