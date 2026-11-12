import { Link } from '@inertiajs/react';
import { ArrowRight, Database, RefreshCw, Sparkles } from 'lucide-react';

export type ArkasQuickSyncCardProps = {
    className?: string;
    onSyncClick?: () => void;
    isSyncing?: boolean;
};

/**
 * Kartu Cepat ARKAS Sync bergaya Promo Card Eduplex ("Go Premium"):
 * Gradien Royal Violet gelap, lengkungan artistik, status database terintegrasi,
 * dan tombol aksi langsung dengan efek hover mewah.
 */
export function ArkasQuickSyncCard({
    className = '',
    onSyncClick,
    isSyncing = false,
}: ArkasQuickSyncCardProps) {
    return (
        <div
            className={`group relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#2D1B69] via-[#1B1145] to-[#0D0824] p-6 text-white shadow-xl shadow-brand-950/20 ring-1 ring-white/10 transition-all duration-500 hover:shadow-2xl hover:shadow-brand-500/20 ${className}`}
        >
            {/* Ambient Aurora Glow */}
            <div
                aria-hidden
                className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-500/30 blur-3xl transition-transform duration-700 group-hover:scale-125"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute -bottom-14 -left-14 h-40 w-40 rounded-full bg-gold-400/20 blur-2xl"
            />

            <div className="relative z-10 flex flex-col justify-between h-full">
                {/* Header Badge */}
                <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-400/30 bg-gold-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gold-300">
                        <Sparkles className="h-3 w-3" />
                        <span>ARKAS 4.x</span>
                    </span>

                    <span className="flex h-2.5 w-2.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                </div>

                {/* Content */}
                <div className="my-5">
                    <h3 className="font-display text-xl font-bold tracking-tight text-white">
                        Integrasi ARKAS
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-white/70">
                        Tarik pagu RKAS & catatan BKU langsung dari file SQLite ARKAS desktop Anda tanpa koneksi internet.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                    {onSyncClick ? (
                        <button
                            type="button"
                            onClick={onSyncClick}
                            disabled={isSyncing}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-slate-950 shadow-md transition-all duration-300 hover:bg-gold-300 hover:shadow-lg disabled:opacity-50"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                            <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkron Sekarang'}</span>
                        </button>
                    ) : (
                        <Link
                            href={route('arkas-tools.index')}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-slate-950 shadow-md transition-all duration-300 hover:bg-gold-300 hover:shadow-lg"
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

