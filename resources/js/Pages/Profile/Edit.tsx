import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Head } from '@inertiajs/react';
import DeepSeekApiForm from './Partials/DeepSeekApiForm';
import SecurityCodeForm from './Partials/SecurityCodeForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';
import { ShieldCheck } from 'lucide-react';
import PageHeader from '@/Components/ui/PageHeader';
import Surface from '@/Components/ui/Surface';
import IconTile from '@/Components/ui/IconTile';
import StatusBadge from '@/Components/ui/StatusBadge';

export default function Edit({
    mustVerifyEmail,
    status,
}: PageProps<{ mustVerifyEmail: boolean; status?: string }>) {
    return (
        <AuthenticatedLayout>
            <Head title="Profil Pengguna" />

            <div className="space-y-4">
                <PageHeader
                    className="animate-rise"
                    breadcrumb={[
                        { label: 'Dashboard' },
                        { label: 'Pengaturan' },
                        { label: 'Profil Pengguna' },
                    ]}
                    icon={
                        <IconTile tone="violet" size="lg">
                            <ShieldCheck />
                        </IconTile>
                    }
                    title="Pengaturan Profil"
                    badge={
                        <StatusBadge tone="violet" dot={false}>
                            Akun
                        </StatusBadge>
                    }
                    subtitle="Kelola biodata, kata sandi, konfigurasi AI, dan keamanan akun Anda di satu tempat."
                />

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <div className="animate-rise" style={{ animationDelay: '60ms' }}>
                        <Surface padding="md">
                            <UpdateProfileInformationForm
                                mustVerifyEmail={mustVerifyEmail}
                                status={status}
                                className="max-w-xl"
                            />
                        </Surface>
                    </div>

                    <div className="animate-rise" style={{ animationDelay: '110ms' }}>
                        <Surface padding="md">
                            <UpdatePasswordForm className="max-w-xl" />
                        </Surface>
                    </div>
                </div>

                <div className="animate-rise" style={{ animationDelay: '160ms' }}>
                    <Surface padding="md">
                        <DeepSeekApiForm className="max-w-4xl" />
                    </Surface>
                </div>

                <div className="animate-rise" style={{ animationDelay: '210ms' }}>
                    <Surface padding="md">
                        <SecurityCodeForm className="max-w-3xl" />
                    </Surface>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
