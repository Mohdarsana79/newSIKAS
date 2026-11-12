import { cn } from '@/lib/utils';

type Variant = 'hero' | 'section' | 'cta';

const GRAIN =
    "url(\"data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.32'/%3E%3C/svg%3E\")";

export type AuroraBackgroundProps = {
    variant?: Variant;
    className?: string;
};

/**
 * Latar aurora dekoratif: blob gradient bergerak pelan + grid tipis + grain.
 * Murni dekoratif (aria-hidden) dan tidak menangkap pointer.
 */
export function AuroraBackground({ variant = 'section', className }: AuroraBackgroundProps) {
    return (
        <div aria-hidden className={cn('pointer-events-none absolute inset-0 -z-10 overflow-hidden', className)}>
            {/* Grid tipis */}
            <div className="absolute inset-0 bg-grid-faint bg-grid-32 opacity-60 dark:opacity-100 dark:bg-grid-faint" />

            {variant === 'hero' ? (
                <>
                    <div className="absolute -left-32 -top-24 h-[34rem] w-[34rem] animate-aurora rounded-full bg-brand-500/25 blur-[120px] dark:bg-brand-500/30" />
                    <div className="absolute -right-24 top-10 h-[28rem] w-[28rem] animate-aurora-slow rounded-full bg-gold-400/20 blur-[110px] dark:bg-gold-400/15" />
                    <div className="absolute bottom-[-12rem] left-1/3 h-[30rem] w-[30rem] animate-aurora rounded-full bg-brand-700/25 blur-[130px]" />
                </>
            ) : null}

            {variant === 'section' ? (
                <>
                    <div className="absolute -left-40 top-1/4 h-[26rem] w-[26rem] animate-aurora-slow rounded-full bg-brand-500/10 blur-[120px] dark:bg-brand-500/[0.14]" />
                    <div className="absolute -right-32 bottom-0 h-[24rem] w-[24rem] animate-aurora rounded-full bg-gold-400/10 blur-[110px] dark:bg-gold-400/10" />
                </>
            ) : null}

            {variant === 'cta' ? (
                <>
                    <div className="absolute left-1/2 top-1/2 h-[38rem] w-[38rem] -translate-x-1/2 -translate-y-1/2 animate-glow-pulse rounded-full bg-brand-500/30 blur-[130px]" />
                    <div className="absolute -right-20 -top-20 h-[22rem] w-[22rem] animate-aurora rounded-full bg-gold-400/25 blur-[100px]" />
                </>
            ) : null}

            {/* Grain halus */}
            <div className="absolute inset-0 opacity-[0.05] mix-blend-overlay dark:opacity-[0.08]" style={{ backgroundImage: GRAIN }} />
        </div>
    );
}

export default AuroraBackground;
