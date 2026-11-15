import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import IconTile from '@/Components/ui/IconTile';
import { Transition } from '@headlessui/react';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useRef } from 'react';
import { Lock, Key } from 'lucide-react';

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

    const updatePassword: FormEventHandler = (e) => {
        e.preventDefault();

        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (errors) => {
                if (errors.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current?.focus();
                }

                if (errors.current_password) {
                    reset('current_password');
                    currentPasswordInput.current?.focus();
                }
            },
        });
    };

    return (
        <section className={className}>
            <header className="mb-5 flex items-start gap-3 border-b border-slate-100 pb-4 dark:border-white/5">
                <IconTile tone="sky" size="lg">
                    <Lock />
                </IconTile>
                <div className="min-w-0">
                    <h2 className="text-[14px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                        Perbarui Kata Sandi
                    </h2>
                    <p className="mt-0.5 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                        Pastikan akun Anda menggunakan kata sandi yang panjang dan acak agar tetap aman.
                    </p>
                </div>
            </header>

            <form onSubmit={updatePassword} className="space-y-5">
                <div>
                    <InputLabel
                        htmlFor="current_password"
                        value="Kata Sandi Saat Ini"
                    />
                    <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <Key className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                        </div>
                        <TextInput
                            id="current_password"
                            ref={currentPasswordInput}
                            value={data.current_password}
                            onChange={(e) =>
                                setData('current_password', e.target.value)
                            }
                            type="password"
                            className="pl-10"
                            autoComplete="current-password"
                            placeholder="Kata sandi saat ini"
                        />
                    </div>
                    <InputError
                        message={errors.current_password}
                        className="mt-2"
                    />
                </div>

                <div>
                    <InputLabel htmlFor="password" value="Kata Sandi Baru" />
                    <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <Lock className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                        </div>
                        <TextInput
                            id="password"
                            ref={passwordInput}
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            type="password"
                            className="pl-10"
                            autoComplete="new-password"
                            placeholder="Kata sandi baru"
                        />
                    </div>
                    <InputError message={errors.password} className="mt-2" />
                </div>

                <div>
                    <InputLabel
                        htmlFor="password_confirmation"
                        value="Konfirmasi Kata Sandi"
                    />
                    <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <Lock className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                        </div>
                        <TextInput
                            id="password_confirmation"
                            value={data.password_confirmation}
                            onChange={(e) =>
                                setData('password_confirmation', e.target.value)
                            }
                            type="password"
                            className="pl-10"
                            autoComplete="new-password"
                            placeholder="Ulangi kata sandi baru"
                        />
                    </div>
                    <InputError
                        message={errors.password_confirmation}
                        className="mt-2"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 dark:border-white/5">
                    <PrimaryButton disabled={processing} className="min-w-[120px]">
                        Simpan
                    </PrimaryButton>

                    <Transition
                        show={recentlySuccessful}
                        enter="transition ease-in-out"
                        enterFrom="opacity-0"
                        leave="transition ease-in-out"
                        leaveTo="opacity-0"
                    >
                        <p className="inline-flex items-center gap-1.5 rounded-full bg-pastel-mint px-3 py-1 text-[10.5px] font-extrabold text-emerald-700 dark:bg-mint/10 dark:text-emerald-300">
                            Berhasil Disimpan!
                        </p>
                    </Transition>
                </div>
            </form>
        </section>
    );
}
