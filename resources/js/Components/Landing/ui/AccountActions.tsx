import { Link } from '@inertiajs/react';

import { MagneticButton } from '@/Components/Landing/ui/MagneticButton';

export type AccountActionsProps = {
    /** Boolean dari `auth.user` (logika asli halaman dipertahankan). */
    authenticated: boolean;
    /** Boolean `hasUsers` dari props Inertia. */
    hasUsers: boolean;
    /**
     * navbar: tampilkan kombinasi tautan seperti navbar lama.
     * hero / cta: satu tombol utama sesuai state.
     */
    context?: 'navbar' | 'hero' | 'cta';
    className?: string;
};

/**
 * Satu-satunya tempat logika tombol akun landing page.
 * Menjaga perilaku identik dengan halaman lama:
 * - sudah login            -> Dashboard
 * - belum login & ada user -> Masuk
 * - belum login & belum ada user -> Daftar
 */
export function AccountActions({
    authenticated,
    hasUsers,
    context = 'hero',
    className,
}: AccountActionsProps) {
    if (authenticated) {
        return (
            <MagneticButton
                as="a"
                inertia
                href={route('dashboard')}
                variant={context === 'navbar' ? 'secondary' : 'primary'}
                className={className}
            >
                {context === 'navbar' ? 'Dashboard' : 'Ke Dashboard'}
                <ArrowIcon />
            </MagneticButton>
        );
    }

    if (hasUsers) {
        return (
            <MagneticButton
                as="a"
                inertia
                href={route('login')}
                variant={context === 'navbar' ? 'secondary' : 'primary'}
                className={className}
            >
                {context === 'navbar' ? 'Masuk' : 'Masuk Sekarang'}
                <ArrowIcon />
            </MagneticButton>
        );
    }

    if (context === 'navbar') {
        return (
            <span className={className}>
                <MagneticButton as="a" inertia href={route('login')} variant="ghost">
                    Masuk
                </MagneticButton>
                <MagneticButton as="a" inertia href={route('register')} variant="primary" className="ml-1 px-5 py-2.5 text-sm">
                    Daftar
                </MagneticButton>
            </span>
        );
    }

    return (
        <MagneticButton as="a" inertia href={route('register')} variant="primary" className={className}>
            Mulai Sekarang
            <ArrowIcon />
        </MagneticButton>
    );
}

function ArrowIcon() {
    return (
        <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 transition-transform duration-300 ease-luxe group-hover:translate-x-0.5"
        >
            <path d="M5 12h13" />
            <path d="m12 5 7 7-7 7" />
        </svg>
    );
}

/** Tautan "Panduan" (URL lama dipertahankan). */
export function PanduanLink({ className }: { className?: string }) {
    return (
        <a
            href="https://www.youtube.com/@giandarsana5772"
            target="_blank"
            rel="noopener noreferrer"
            className={className}
        >
            Panduan
        </a>
    );
}

/** Tautan Inertia "Masuk/Lihat" kecil untuk navbar versi teks. */
export function PlainLoginLink({ className }: { className?: string }) {
    return (
        <Link href={route('login')} className={className}>
            Masuk
        </Link>
    );
}

export default AccountActions;
