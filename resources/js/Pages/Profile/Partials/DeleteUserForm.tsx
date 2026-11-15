import DangerButton from '@/Components/DangerButton';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import IconTile from '@/Components/ui/IconTile';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function DeleteUserForm({
    className = '',
}: {
    className?: string;
}) {
    const [confirmingUserDeletion, setConfirmingUserDeletion] = useState(false);
    const passwordInput = useRef<HTMLInputElement>(null);

    const {
        data,
        setData,
        delete: destroy,
        processing,
        reset,
        errors,
        clearErrors,
    } = useForm({
        password: '',
    });

    const confirmUserDeletion = () => {
        setConfirmingUserDeletion(true);
    };

    const deleteUser: FormEventHandler = (e) => {
        e.preventDefault();

        destroy(route('profile.destroy'), {
            preserveScroll: true,
            onSuccess: () => closeModal(),
            onError: () => passwordInput.current?.focus(),
            onFinish: () => reset(),
        });
    };

    const closeModal = () => {
        setConfirmingUserDeletion(false);

        clearErrors();
        reset();
    };

    return (
        <section className={`space-y-5 ${className}`}>
            <header className="mb-5 flex items-start gap-3 border-b border-rose-100 pb-4 dark:border-rose-400/15">
                <IconTile tone="rose" size="lg">
                    <AlertTriangle />
                </IconTile>
                <div className="min-w-0">
                    <h2 className="text-[14px] font-extrabold tracking-tight text-rose-600 dark:text-rose-300">
                        Hapus Akun
                    </h2>
                    <p className="mt-0.5 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                        Setelah akun Anda dihapus, semua sumber daya dan datanya akan dihapus secara permanen. Sebelum menghapus akun Anda, silakan unduh data atau informasi apa pun yang ingin Anda simpan.
                    </p>
                </div>
            </header>

            <DangerButton onClick={confirmUserDeletion}>
                Hapus Akun
            </DangerButton>

            <Modal show={confirmingUserDeletion} onClose={closeModal}>
                <form onSubmit={deleteUser} className="flex max-h-[90vh] flex-col overflow-hidden">
                    <div className="flex shrink-0 items-start gap-3 border-b border-slate-100 px-6 py-5 dark:border-white/5">
                        <IconTile tone="rose" size="lg">
                            <AlertTriangle />
                        </IconTile>
                        <div className="min-w-0">
                            <h2 className="text-[16px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                Apakah Anda yakin ingin menghapus akun Anda?
                            </h2>
                            <p className="mt-0.5 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                                Konfirmasi kata sandi untuk melanjutkan penghapusan permanen.
                            </p>
                        </div>
                    </div>

                    <div className="sikas-scroll flex-1 space-y-4 overflow-y-auto px-6 py-5">
                        <p className="text-[11.5px] font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                            Setelah akun Anda dihapus, semua sumber daya dan datanya akan dihapus secara permanen. Silakan masukkan kata sandi Anda untuk mengonfirmasi bahwa Anda ingin menghapus akun Anda secara permanen.
                        </p>

                        <div>
                            <InputLabel
                                htmlFor="password"
                                value="Kata Sandi"
                                className="sr-only"
                            />

                            <TextInput
                                id="password"
                                type="password"
                                name="password"
                                ref={passwordInput}
                                value={data.password}
                                onChange={(e) =>
                                    setData('password', e.target.value)
                                }
                                className="mt-1 block w-full"
                                isFocused
                                placeholder="Kata Sandi"
                            />

                            <InputError
                                message={errors.password}
                                className="mt-2"
                            />
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-white/5">
                        <SecondaryButton onClick={closeModal}>
                            Batal
                        </SecondaryButton>

                        <DangerButton disabled={processing}>
                            Hapus Akun
                        </DangerButton>
                    </div>
                </form>
            </Modal>
        </section>
    );
}
