import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import IconTile from '@/Components/ui/IconTile';
import StatusBadge from '@/Components/ui/StatusBadge';
import { usePage } from '@inertiajs/react';
import axios from 'axios';
import {
    AlertCircle,
    Check,
    Copy,
    KeyRound,
    Lock,
    RefreshCw,
    Shield,
    ShieldCheck,
    Unlock,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ProfileCardShell, ProfileModalShell } from './ProfileUiPrimitives';

export default function SecurityCodeForm({
    className = '',
    onStatusChange,
}: {
    className?: string;
    onStatusChange?: (enabled: boolean) => void;
}) {
    const user = usePage().props.auth.user;

    const [isEnabled, setIsEnabled] = useState(Boolean(user.is_security_code_enabled));
    const [showCodeModal, setShowCodeModal] = useState(false);
    const [generatedCode, setGeneratedCode] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);
    const [toggleProcessing, setToggleProcessing] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setIsEnabled(Boolean(user.is_security_code_enabled));
    }, [user.is_security_code_enabled]);

    useEffect(() => {
        return () => {
            if (copyTimerRef.current) {
                clearTimeout(copyTimerRef.current);
            }
        };
    }, []);

    const handleToggle = () => {
        setToggleProcessing(true);
        setActionError(null);
        const nextState = !isEnabled;

        axios
            .post(route('profile.toggle-security'))
            .then(() => {
                setIsEnabled(nextState);
                onStatusChange?.(nextState);
            })
            .catch(() => {
                setActionError('Gagal memperbarui status kode keamanan. Silakan coba lagi.');
            })
            .finally(() => {
                setToggleProcessing(false);
            });
    };

    const handleGenerateClick = () => {
        setActionError(null);
        setGeneratedCode(null);
        setCopied(false);
        setShowCodeModal(true);
    };

    const generateCode = () => {
        setProcessing(true);
        setActionError(null);
        axios
            .post(route('profile.generate-security-code'))
            .then((response) => {
                setGeneratedCode(response.data.code);
            })
            .catch(() => {
                setActionError('Gagal membuat kode keamanan baru. Silakan coba lagi.');
            })
            .finally(() => {
                setProcessing(false);
            });
    };

    const handleCopyCode = async () => {
        if (!generatedCode) return;
        try {
            await navigator.clipboard.writeText(generatedCode);
            setCopied(true);
            if (copyTimerRef.current) {
                clearTimeout(copyTimerRef.current);
            }
            copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
        } catch {
            setActionError('Tidak dapat menyalin otomatis. Silakan salin kode secara manual.');
        }
    };

    const closeCodeModal = () => {
        if (processing) return;
        setShowCodeModal(false);
        setGeneratedCode(null);
        setCopied(false);
        setActionError(null);
    };

    return (
        <ProfileCardShell
            tone="mint"
            icon={<Shield />}
            title="Keamanan Akun"
            subtitle="Tambahkan lapisan perlindungan 6-digit kode keamanan setiap kali Anda masuk ke aplikasi."
            badge={
                <StatusBadge tone={isEnabled ? 'success' : 'neutral'} dot={true}>
                    {isEnabled ? '2FA Aktif' : 'Nonaktif'}
                </StatusBadge>
            }
            className={className}
        >
            <div className="flex flex-1 flex-col justify-between gap-4">
                <div className="space-y-4">
                    {/* Toggle Switch Panel */}
                    <div
                        className={`flex items-center justify-between gap-4 rounded-2xl border p-4 transition-colors ${
                            isEnabled
                                ? 'border-emerald-200/70 bg-pastel-mint/50 dark:border-mint/20 dark:bg-mint/[0.07]'
                                : 'border-slate-100 bg-slate-50/80 dark:border-white/5 dark:bg-white/[0.03]'
                        }`}
                    >
                        <div className="flex min-w-0 items-center gap-3">
                            {isEnabled ? (
                                <IconTile tone="mint" size="md">
                                    <Lock />
                                </IconTile>
                            ) : (
                                <IconTile tone="slate" size="md">
                                    <Unlock />
                                </IconTile>
                            )}
                            <div className="min-w-0">
                                <h3 className="text-[12.5px] font-extrabold text-slate-900 dark:text-white">
                                    Kode Keamanan Login
                                </h3>
                                <p className="mt-0.5 text-[10.5px] font-medium leading-snug text-slate-500 dark:text-slate-400">
                                    {isEnabled
                                        ? 'Aktif. Kode 6 digit akan diminta saat login.'
                                        : 'Nonaktif. Login hanya menggunakan kata sandi.'}
                                </p>
                            </div>
                        </div>

                        <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                            <input
                                type="checkbox"
                                className="peer sr-only"
                                checked={isEnabled}
                                onChange={handleToggle}
                                disabled={toggleProcessing}
                                aria-label="Aktifkan kode keamanan login"
                            />
                            <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-lime-400 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-lime-400/60 peer-disabled:cursor-not-allowed peer-disabled:opacity-60 dark:border-white/10 dark:bg-white/10 dark:after:border-white/20 dark:peer-focus:ring-lime-400/30" />
                        </label>
                    </div>

                    {actionError && !showCodeModal && (
                        <div className="flex items-start gap-2 rounded-2xl border border-rose-200/70 bg-pastel-rose p-3 text-[11px] font-semibold text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>{actionError}</span>
                        </div>
                    )}

                    {/* Panel panduan / informasi */}
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-white/5 dark:bg-white/[0.02]">
                        <div className="flex items-start gap-2.5">
                            <IconTile tone="violet" size="sm" className="mt-0.5">
                                {isEnabled ? <KeyRound /> : <ShieldCheck />}
                            </IconTile>
                            <div className="min-w-0 space-y-1">
                                <p className="text-[11.5px] font-extrabold text-slate-800 dark:text-slate-100">
                                    {isEnabled ? 'Perbarui Kode Aktivasi Login' : 'Mengapa mengaktifkan Kode Keamanan?'}
                                </p>
                                <p className="text-[10.5px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                                    {isEnabled
                                        ? 'Anda dapat membuat ulang 6 digit kode keamanan kapan saja. Kode baru akan langsung menggantikan kode sebelumnya.'
                                        : 'Aktifkan sakelar di atas untuk mewajibkan 6 digit kode keamanan tambahan saat login, melindungi data keuangan BOSP sekolah dari akses tidak sah.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {isEnabled && (
                    <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-white/5">
                        <span className="text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                            Simpan kode di tempat aman setelah dibuat.
                        </span>
                        <PrimaryButton onClick={handleGenerateClick} className="shrink-0">
                            <RefreshCw className="h-4 w-4" />
                            Generate Kode Baru
                        </PrimaryButton>
                    </div>
                )}
            </div>

            <ProfileModalShell
                show={showCodeModal}
                onClose={closeCodeModal}
                closeable={!processing}
                tone="violet"
                icon={<Shield />}
                titleId="security-code-modal-title"
                title="Generate Kode Aktivasi Login"
                subtitle="Kode 6 digit untuk lapisan keamanan tambahan saat login."
            >
                {actionError && (
                    <div className="mb-4 flex items-start gap-2 rounded-2xl border border-rose-200/70 bg-pastel-rose p-3 text-[11px] font-semibold text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{actionError}</span>
                    </div>
                )}

                {!generatedCode ? (
                    <div className="space-y-4">
                        <p className="text-[11.5px] font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                            Sistem akan membuat 6 digit angka acak sebagai kode keamanan Anda. Kode sebelumnya (jika ada) akan langsung diganti.
                        </p>
                        <div className="flex justify-end gap-2 pt-2">
                            <SecondaryButton onClick={closeCodeModal} disabled={processing}>
                                Batal
                            </SecondaryButton>
                            <PrimaryButton onClick={generateCode} disabled={processing}>
                                {processing ? 'Memproses...' : 'Generate Sekarang'}
                            </PrimaryButton>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 text-center">
                        <div className="rounded-2xl border border-brand-500/15 bg-pastel-lavender p-6 dark:border-brand-400/20 dark:bg-brand-500/10">
                            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-brand-600 dark:text-brand-300">
                                KODE KEAMANAN ANDA
                            </p>
                            <div className="text-sikas-num select-all font-mono text-4xl font-extrabold tracking-[0.22em] text-brand-700 dark:text-brand-200">
                                {generatedCode}
                            </div>
                            <button
                                type="button"
                                onClick={handleCopyCode}
                                className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-brand-500/20 bg-white/90 px-3.5 py-1.5 text-[11px] font-extrabold text-brand-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white dark:border-brand-400/25 dark:bg-white/10 dark:text-brand-200 dark:hover:bg-white/15"
                            >
                                {copied ? (
                                    <>
                                        <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-300" />
                                        Tersalin!
                                    </>
                                ) : (
                                    <>
                                        <Copy className="h-3.5 w-3.5" />
                                        Salin Kode
                                    </>
                                )}
                            </button>
                        </div>

                        <p className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400">
                            Harap simpan kode ini dengan aman. Anda akan membutuhkannya pada sesi login berikutnya.
                        </p>

                        <div className="pt-1">
                            <SecondaryButton onClick={closeCodeModal} className="w-full justify-center">
                                Tutup &amp; Simpan
                            </SecondaryButton>
                        </div>
                    </div>
                )}
            </ProfileModalShell>
        </ProfileCardShell>
    );
}
