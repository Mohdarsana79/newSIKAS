import { Link } from '@inertiajs/react';
import { ArrowRight, Database, RefreshCw, Sparkles } from 'lucide-react';

export type ArkasQuickSyncCardProps = {
    className?: string;
    onSyncClick?: () => void;
    isSyncing?: boolean;
};

/**
 * Kartu promo ARKAS Sync bergaya SIKAS Neo-Bento:
 * permukaan gradient ink (violet-gelap → ink) dengan blob aurora,
 * badge lime, dan CTA lime penuh dengan glow. Props & handler tetap sama:
 * `onSyncClick` / `isSyncing` dipakai persis seperti sebelumnya.
 */
export function ArkasQuickSyncCard({
    className = '',
    onSyncClick,
    isSyncing = false,
}: ArkasQuickSyncCardProps) {
    return (
        <div
            className={`group relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#2B2940] via-[#232135] to-[#191826] p-5 text-white shadow-float ring-1 ring-white/10 transition-all duration-500 hover:-translate-y-1 ${className}`}
        >
            {/* Ambient Aurora Glow */}
            <div
                aria-hidden
                className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-brand-500/40 blur-2xl transition-transform duration-700 group-hover:scale-125"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute -bottom-14 -left-10 h-32 w-32 rounded-full bg-lime-400/20 blur-2xl"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute -right-6 top-6 animate-float text-lime-300/80"
            >
                <Database className="h-20 w-20" strokeWidth={1.4} />
            </div>

            <div className="relative z-10 flex h-full flex-col justify-between">
                {/* Header Badge */}
                <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-lime-400/15 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.16em] text-lime-300 ring-1 ring-lime-400/30">
                        <Sparkles className="h-3 w-3" />
                        <span>ARKAS 4.x</span>
                    </span>

                    <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-75" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-mint" />
                    </span>
                </div>

                {/* Content */}
                <div className="mt-3">
                    <h3 className="max-w-[75%] text-[16px] font-extrabold leading-snug tracking-tight text-white">
                        Integrasi ARKAS
                    </h3>
                    <p className="mt-1.5 max-w-[85%] text-[10.5px] font-medium leading-relaxed text-white/55">
                        Tarik pagu RKAS & catatan BKU langsung dari file SQLite ARKAS desktop Anda tanpa koneksi internet.
                    </p>
                </div>

                {/* Actions */}
                <div className="mt-4 flex items-center gap-2">
                    {onSyncClick ? (
                        <button
                            type="button"
                            onClick={onSyncClick}
                            disabled={isSyncing}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-lime-400 px-4 py-2.5 text-[11.5px] font-extrabold text-slate-950 shadow-lime transition hover:-translate-y-0.5 hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                            <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkron Sekarang'}</span>
                        </button>
                    ) : (
                        <Link
                            href={route('arkas-tools.index')}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-lime-400 px-4 py-2.5 text-[11.5px] font-extrabold text-slate-950 shadow-lime transition hover:-translate-y-0.5 hover:bg-lime-300"
                        >
                            <Database className="h-3.5 w-3.5" />
                            <span>Buka Tools ARKAS</span>
                            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ArkasQuickSyncCard;
