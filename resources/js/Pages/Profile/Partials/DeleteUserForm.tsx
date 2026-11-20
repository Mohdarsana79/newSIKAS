import DangerButton from '@/Components/DangerButton';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import SecondaryButton from '@/Components/SecondaryButton';
import { useForm } from '@inertiajs/react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { FormEventHandler, useRef, useState } from 'react';
import {
    ProfileCardShell,
    ProfileModalShell,
    ProfilePasswordInput,
} from './ProfileUiPrimitives';

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
        if (processing) return;
        setConfirmingUserDeletion(false);
        clearErrors();
        reset();
    };

    return (
        <ProfileCardShell
            tone="rose"
            icon={<AlertTriangle />}
            title="Hapus Akun"
            subtitle="Setelah akun dihapus, seluruh sumber daya dan data terkait akan dihapus secara permanen."
            className={className}
        >
            <div className="flex flex-1 flex-col justify-between gap-4">
                <div className="rounded-2xl border border-rose-200/70 bg-pastel-rose/60 p-4 text-[11.5px] font-medium leading-relaxed text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-200">
                    Sebelum menghapus akun Anda, pastikan seluruh laporan, data BKU, dan dokumen SPJ yang penting sudah dicadangkan.
                </div>

                <div className="border-t border-rose-100 pt-4 dark:border-rose-400/15">
                    <DangerButton onClick={confirmUserDeletion}>
                        <Trash2 className="h-4 w-4" />
                        Hapus Akun
                    </DangerButton>
                </div>
            </div>

            <ProfileModalShell
                show={confirmingUserDeletion}
                onClose={closeModal}
                closeable={!processing}
                tone="rose"
                icon={<AlertTriangle />}
                titleId="delete-user-modal-title"
                title="Hapus Akun Permanen?"
                subtitle="Konfirmasi kata sandi Anda untuk melanjutkan penghapusan."
                asForm={{ onSubmit: deleteUser }}
                footer={
                    <>
                        <SecondaryButton onClick={closeModal} disabled={processing}>
                            Batal
                        </SecondaryButton>
                        <DangerButton disabled={processing}>
                            {processing ? 'Menghapus...' : 'Hapus Akun'}
                        </DangerButton>
                    </>
                }
            >
                <div className="space-y-4">
                    <p className="text-[11.5px] font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                        Setelah akun Anda dihapus, semua sumber daya dan datanya akan dihapus secara permanen. Masukkan kata sandi Anda untuk mengonfirmasi tindakan ini.
                    </p>

                    <div>
                        <InputLabel
                            htmlFor="delete_account_password"
                            value="Kata Sandi"
                            className="sr-only"
                        />
                        <ProfilePasswordInput
                            id="delete_account_password"
                            name="password"
                            inputRef={passwordInput}
                            icon="lock"
                            value={data.password}
                            onChange={(val) => setData('password', val)}
                            isFocused
                            placeholder="Masukkan kata sandi Anda"
                        />
                        <InputError message={errors.password} className="mt-2" />
                    </div>
                </div>
            </ProfileModalShell>
        </ProfileCardShell>
    );
}
