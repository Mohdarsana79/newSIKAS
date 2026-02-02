import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Head } from '@inertiajs/react';
import SecurityCodeForm from './Partials/SecurityCodeForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';
import { ShieldCheck } from 'lucide-react';

export default function Edit({
    mustVerifyEmail,
    status,
}: PageProps<{ mustVerifyEmail: boolean; status?: string }>) {
    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center gap-2">
                    <ShieldCheck className="h-6 w-6 text-indigo-500" />
                    <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                        Pengaturan Profil
                    </h2>
                </div>
            }
        >
            <Head title="Profil Pengguna" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl space-y-8 sm:px-6 lg:px-8">

                    {/* Grid Layout for Profile & Password */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                        {/* Profile Info */}
                        <div className="bg-white p-4 shadow-lg sm:rounded-xl sm:p-8 dark:bg-gray-800 transition-all hover:shadow-xl duration-300 border border-gray-100 dark:border-gray-700">
                            <UpdateProfileInformationForm
                                mustVerifyEmail={mustVerifyEmail}
                                status={status}
                                className="max-w-xl"
                            />
                        </div>

                        {/* Password */}
                        <div className="bg-white p-4 shadow-lg sm:rounded-xl sm:p-8 dark:bg-gray-800 transition-all hover:shadow-xl duration-300 border border-gray-100 dark:border-gray-700">
                            <UpdatePasswordForm className="max-w-xl" />
                        </div>
                    </div>

                    {/* Security Code Section (Replaces Delete Account) */}
                    <div className="bg-white p-4 shadow-lg sm:rounded-xl sm:p-8 dark:bg-gray-800 transition-all hover:shadow-xl duration-300 border border-gray-100 dark:border-gray-700">
                        <SecurityCodeForm className="max-w-3xl" />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
