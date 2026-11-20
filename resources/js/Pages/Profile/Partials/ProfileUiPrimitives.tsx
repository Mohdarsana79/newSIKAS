import Modal from '@/Components/Modal';
import TextInput from '@/Components/TextInput';
import IconTile from '@/Components/ui/IconTile';
import { cn } from '@/lib/utils';
import type { User } from '@/types';
import { Transition } from '@headlessui/react';
import { CheckCircle2, Eye, EyeOff, Key, Lock, X } from 'lucide-react';
import { ReactNode, RefObject, useState } from 'react';

export type ProfileCardTone = 'violet' | 'sky' | 'mint' | 'rose';

const CARD_GLOW: Record<ProfileCardTone, string> = {
    violet: 'bg-pastel-lavender/80 dark:bg-brand-500/15',
    sky: 'bg-pastel-sky/80 dark:bg-sky/15',
    mint: 'bg-pastel-mint/80 dark:bg-mint/15',
    rose: 'bg-pastel-rose/80 dark:bg-rose-500/15',
};

const MODAL_GLOW: Record<ProfileCardTone, string> = {
    violet: 'bg-brand-500/15 dark:bg-brand-500/10',
    sky: 'bg-sky-500/15 dark:bg-sky-500/10',
    mint: 'bg-mint/15 dark:bg-mint/10',
    rose: 'bg-rose-500/15 dark:bg-rose-500/10',
};

const HEADER_BORDER: Record<ProfileCardTone, string> = {
    violet: 'border-slate-100 dark:border-white/5',
    sky: 'border-slate-100 dark:border-white/5',
    mint: 'border-slate-100 dark:border-white/5',
    rose: 'border-rose-100 dark:border-rose-400/15',
};

const TITLE_COLOR: Record<ProfileCardTone, string> = {
    violet: 'text-slate-900 dark:text-white',
    sky: 'text-slate-900 dark:text-white',
    mint: 'text-slate-900 dark:text-white',
    rose: 'text-rose-600 dark:text-rose-300',
};

export function getRoleDisplayName(user: User): string {
    if (user.role_name) return user.role_name;
    if (user.is_kepala_sekolah) return 'Kepala Sekolah';
    if (user.is_bendahara) return 'Bendahara';
    if (user.role) return user.role.replace(/_/g, ' ');
    return 'Pengguna';
}

/**
 * Kartu permukaan Neo-Bento standar untuk seluruh bagian halaman Profil:
 * berbasis `.sikas-card`, penuh tinggi (`h-full flex-col`), ambient blur glow halus, dan header seragam.
 */
export function ProfileCardShell({
    tone,
    icon,
    title,
    subtitle,
    badge,
    children,
    className,
}: {
    tone: ProfileCardTone;
    icon: ReactNode;
    title: string;
    subtitle: string;
    badge?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section
            className={cn(
                'sikas-card relative flex h-full flex-col overflow-hidden',
                className,
            )}
        >
            <div
                aria-hidden
                className={cn(
                    'pointer-events-none absolute -right-12 -top-14 h-36 w-36 rounded-full blur-3xl',
                    CARD_GLOW[tone],
                )}
            />

            <header
                className={cn(
                    'relative flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6',
                    HEADER_BORDER[tone],
                )}
            >
                <div className="flex min-w-0 items-start gap-3">
                    <IconTile tone={tone} size="lg">
                        {icon}
                    </IconTile>
                    <div className="min-w-0">
                        <h2
                            className={cn(
                                'text-[14px] font-extrabold tracking-tight',
                                TITLE_COLOR[tone],
                            )}
                        >
                            {title}
                        </h2>
                        <p className="mt-0.5 text-[10.5px] font-medium leading-relaxed text-slate-400 dark:text-slate-500">
                            {subtitle}
                        </p>
                    </div>
                </div>
                {badge && <div className="shrink-0 self-start">{badge}</div>}
            </header>

            <div className="relative flex flex-1 flex-col p-5 sm:p-6">
                {children}
            </div>
        </section>
    );
}

/**
 * Modal Neo-Bento standar untuk dialog konfirmasi/aksi di halaman Profil
 * lengkap dengan `ariaLabelledBy`, ambient blur glow, tombol tutup `X`, dan scroll aman.
 */
export function ProfileModalShell({
    show,
    onClose,
    closeable = true,
    tone,
    icon,
    titleId,
    title,
    subtitle,
    children,
    footer,
    asForm,
}: {
    show: boolean;
    onClose: () => void;
    closeable?: boolean;
    tone: ProfileCardTone;
    icon: ReactNode;
    titleId: string;
    title: string;
    subtitle: string;
    children: ReactNode;
    footer?: ReactNode;
    asForm?: { onSubmit: React.FormEventHandler<HTMLFormElement> };
}) {
    const content = (
        <>
            <div
                aria-hidden
                className={cn(
                    'pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full blur-3xl',
                    MODAL_GLOW[tone],
                )}
            />

            <div className="relative flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-6 py-5 dark:border-white/5">
                <div className="flex min-w-0 items-start gap-3">
                    <IconTile tone={tone} size="lg">
                        {icon}
                    </IconTile>
                    <div className="min-w-0">
                        <h2
                            id={titleId}
                            className="text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white"
                        >
                            {title}
                        </h2>
                        <p className="mt-0.5 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                            {subtitle}
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => closeable && onClose()}
                    disabled={!closeable}
                    aria-label="Tutup"
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-white"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            <div className="sikas-scroll relative flex-1 overflow-y-auto px-6 py-5">
                {children}
            </div>

            {footer && (
                <div className="relative flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-white/5">
                    {footer}
                </div>
            )}
        </>
    );

    const shellClass = 'relative flex max-h-[90vh] flex-col overflow-hidden rounded-[26px]';

    return (
        <Modal
            show={show}
            onClose={onClose}
            closeable={closeable}
            maxWidth="md"
            ariaLabelledBy={titleId}
        >
            {asForm ? (
                <form onSubmit={asForm.onSubmit} className={shellClass}>
                    {content}
                </form>
            ) : (
                <div className={shellClass}>{content}</div>
            )}
        </Modal>
    );
}

/**
 * Input kata sandi / kunci rahasia Neo-Bento dengan ikon kiri dan toggle lihat/sembunyikan.
 */
export function ProfilePasswordInput({
    id,
    name,
    value,
    onChange,
    placeholder,
    autoComplete,
    isFocused = false,
    inputRef,
    icon = 'lock',
    className,
    showLabel = 'Tampilkan kata sandi',
    hideLabel = 'Sembunyikan kata sandi',
}: {
    id: string;
    name?: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    autoComplete?: string;
    isFocused?: boolean;
    inputRef?: RefObject<HTMLInputElement>;
    icon?: 'lock' | 'key';
    className?: string;
    showLabel?: string;
    hideLabel?: string;
}) {
    const [visible, setVisible] = useState(false);

    return (
        <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                {icon === 'key' ? (
                    <Key className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                ) : (
                    <Lock className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                )}
            </div>
            <TextInput
                id={id}
                name={name}
                ref={inputRef}
                type={visible ? 'text' : 'password'}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={cn('!pl-10 !pr-10', className)}
                autoComplete={autoComplete}
                isFocused={isFocused}
                placeholder={placeholder}
            />
            <button
                type="button"
                onClick={() => setVisible((prev) => !prev)}
                aria-label={visible ? hideLabel : showLabel}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 transition hover:text-slate-600 focus:outline-none focus-visible:text-lime-500 dark:text-slate-500 dark:hover:text-slate-300"
            >
                {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
        </div>
    );
}

/**
 * Pill notifikasi tersimpan seragam untuk seluruh form profil.
 */
export function ProfileSavedPill({
    show,
    label = 'Berhasil Disimpan!',
}: {
    show: boolean;
    label?: string;
}) {
    return (
        <Transition
            show={show}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-0.5"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
        >
            <p className="inline-flex items-center gap-1.5 rounded-full bg-pastel-mint px-3 py-1.5 text-[10.5px] font-extrabold text-emerald-700 ring-1 ring-emerald-200/70 dark:bg-mint/10 dark:text-emerald-300 dark:ring-mint/20">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                {label}
            </p>
        </Transition>
    );
}
