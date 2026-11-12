import { useEffect, useRef } from 'react';
import type { ComponentType, ReactElement, ReactNode } from 'react';
import { Player } from '@remotion/player';
import type { PlayerRef } from '@remotion/player';

/**
 * Runtime Remotion yang dimuat secara DINAMIS oleh PlayerStage.
 *
 * File ini satu-satunya tempat yang meng-import `@remotion/player` secara
 * statis, sehingga library Player (+ remotion) tidak ikut masuk ke chunk
 * halaman Welcome. PlayerStage memanggilnya lewat
 * `lazy(() => import('./PlayerRuntime'))`.
 *
 * Semua konfigurasi Player yang tetap ditetapkan di sini; PlayerStage hanya
 * mengirim data komposisi + status paused/initialFrame.
 */

export type PlayerRuntimeProps = {
    component: ComponentType<Record<string, never>>;
    durationInFrames: number;
    fps: number;
    compositionWidth: number;
    compositionHeight: number;
    initialFrame: number;
    /** true = diam di frame sekarang (di luar viewport / prefers-reduced-motion). */
    paused: boolean;
    /** Tampilan statis bila Player gagal memuat/merender komposisi. */
    fallback?: ReactNode;
};

export function PlayerRuntime({
    component,
    durationInFrames,
    fps,
    compositionWidth,
    compositionHeight,
    initialFrame,
    paused,
    fallback,
}: PlayerRuntimeProps): ReactElement {
    const playerRef = useRef<PlayerRef>(null);

    useEffect(() => {
        const player = playerRef.current;
        if (!player) return;

        if (paused) {
            player.pause();
        } else {
            player.play();
        }
    }, [paused]);

    return (
        <Player
            ref={playerRef}
            component={component}
            durationInFrames={durationInFrames}
            fps={fps}
            compositionWidth={compositionWidth}
            compositionHeight={compositionHeight}
            initialFrame={initialFrame}
            loop
            autoPlay={!paused}
            controls={false}
            clickToPlay={false}
            doubleClickToFullscreen={false}
            allowFullscreen={false}
            showVolumeControls={false}
            // Komposisi tanpa audio: mulai mute agar autoplay diizinkan browser
            // dan console tetap bersih.
            initiallyMuted
            acknowledgeRemotionLicense
            errorFallback={fallback === undefined ? undefined : () => fallback}
            renderLoading={fallback === undefined ? undefined : () => fallback}
            style={{ width: '100%', height: '100%' }}
        />
    );
}

export default PlayerRuntime;
