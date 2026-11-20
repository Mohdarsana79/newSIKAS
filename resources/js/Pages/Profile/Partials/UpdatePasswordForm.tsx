import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import { useForm } from '@inertiajs/react';
import { AlertCircle, CheckCircle2, KeyRound, Lock } from 'lucide-react';
import { FormEventHandler, useMemo, useRef } from 'react';
import {
    ProfileCardShell,
    ProfilePasswordInput,
    ProfileSavedPill,
} from './ProfileUiPrimitives';

interface PasswordStrength {
    score: number;
    label: string;
    textClass: string;
    barClass: string;
}

function evaluatePasswordStrength(password: string): PasswordStrength {
    if (password.length < 8) {
        return {
            score: 1,
            label: 'Lemah',
            textClass: 'text-rose-600 dark:text-rose-300',
            barClass: 'bg-rose-500',
        };
    }

    let score = 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score === 1) {
        return {
            score: 1,
            label: 'Lemah',
            textClass: 'text-rose-600 dark:text-rose-300',
            barClass: 'bg-rose-500',
        };
    }
    if (score === 2) {
        return {
            score,
            label: 'Cukup',
            textClass: 'text-amber-600 dark:text-amber-300',
            barClass: 'bg-amber-400',
        };
    }
    if (score === 3) {
        return {
            score,
            label: 'Kuat',
            textClass: 'text-sky-600 dark:text-sky-300',
            barClass: 'bg-sky-500',
        };
    }
    return {
        score: 4,
        label: 'Sangat Kuat',
        textClass: 'text-emerald-600 dark:text-emerald-300',
        barClass: 'bg-mint',
    };
}

export default function UpdatePasswordForm({
    className = '',
}: {
    className?: string;
}) {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    const {
        data,
        setData,
        errors,
        put,
        reset,
        processing,
        recentlySuccessful,
    } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const strength = useMemo(
        () => (data.password.length > 0 ? evaluatePasswordStrength(data.password) : null),
        [data.password],
    );

    const hasConfirmation = data.password_confirmation.length > 0;
    const isPasswordMatched = hasConfirmation && data.password === data.password_confirmation;

    const updatePassword: FormEventHandler = (e) => {
        e.preventDefault();

        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (formErrors) => {
                if (formErrors.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current?.focus();
                }

                if (formErrors.current_password) {
                    reset('current_password');
                    currentPasswordInput.current?.focus();
                }
            },
        });
    };

    return (
        <ProfileCardShell
            tone="sky"
            icon={<Lock />}
            title="Perbarui Kata Sandi"
            subtitle="Gunakan kombinasi huruf besar, kecil, angka, dan simbol agar akun tetap aman."
            className={className}
        >
            <form onSubmit={updatePassword} className="flex flex-1 flex-col justify-between gap-5">
                <div className="space-y-4">
                    <div>
                        <InputLabel htmlFor="current_password" value="Kata Sandi Saat Ini" />
                        <div className="mt-1">
                            <ProfilePasswordInput
                                id="current_password"
                                inputRef={currentPasswordInput}
                                icon="key"
                                value={data.current_password}
                                onChange={(val) => setData('current_password', val)}
                                autoComplete="current-password"
                                placeholder="Masukkan kata sandi saat ini"
                            />
                        </div>
                        <InputError message={errors.current_password} className="mt-1.5" />
                    </div>

                    <div>
                        <InputLabel htmlFor="password" value="Kata Sandi Baru" />
                        <div className="mt-1">
                            <ProfilePasswordInput
                                id="password"
                                inputRef={passwordInput}
                                icon="lock"
                                value={data.password}
                                onChange={(val) => setData('password', val)}
                                autoComplete="new-password"
                                placeholder="Minimal 8 karakter"
                            />
                        </div>

                        {strength && (
                            <div className="mt-2 space-y-1.5">
                                <div className="grid grid-cols-4 gap-1.5">
                                    {[1, 2, 3, 4].map((segment) => (
                                        <span
                                            key={segment}
                                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                                segment <= strength.score
                                                    ? strength.barClass
                                                    : 'bg-slate-200/80 dark:bg-white/10'
                                            }`}
                                        />
                                    ))}
                                </div>
                                <div className="flex items-center justify-between text-[10px] font-bold">
                                    <span className="text-slate-400 dark:text-slate-500">
                                        Kekuatan kata sandi
                                    </span>
                                    <span className={strength.textClass}>{strength.label}</span>
                                </div>
                            </div>
                        )}

                        <InputError message={errors.password} className="mt-1.5" />
                    </div>

                    <div>
                        <InputLabel htmlFor="password_confirmation" value="Konfirmasi Kata Sandi" />
                        <div className="mt-1">
                            <ProfilePasswordInput
                                id="password_confirmation"
                                icon="lock"
                                value={data.password_confirmation}
                                onChange={(val) => setData('password_confirmation', val)}
                                autoComplete="new-password"
                                placeholder="Ulangi kata sandi baru"
                            />
                        </div>

                        {hasConfirmation && (
                            <p
                                className={`mt-1.5 inline-flex items-center gap-1 text-[10.5px] font-bold ${
                                    isPasswordMatched
                                        ? 'text-emerald-600 dark:text-emerald-300'
                                        : 'text-rose-600 dark:text-rose-300'
                                }`}
                            >
                                {isPasswordMatched ? (
                                    <>
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        Kata sandi cocok
                                    </>
                                ) : (
                                    <>
                                        <AlertCircle className="h-3.5 w-3.5" />
                                        Konfirmasi belum sesuai
                                    </>
                                )}
                            </p>
                        )}

                        <InputError message={errors.password_confirmation} className="mt-1.5" />
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 dark:border-white/5">
                    <PrimaryButton disabled={processing} className="min-w-[146px]">
                        <KeyRound className="h-4 w-4" />
                        Simpan Sandi
                    </PrimaryButton>
                    <ProfileSavedPill show={recentlySuccessful} />
                </div>
            </form>
        </ProfileCardShell>
    );
}
