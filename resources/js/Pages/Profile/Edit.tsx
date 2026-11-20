import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import IconTile from '@/Components/ui/IconTile';
import PageHeader from '@/Components/ui/PageHeader';
import StatusBadge from '@/Components/ui/StatusBadge';
import { PageProps } from '@/types';
import { Head } from '@inertiajs/react';
import { ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import DeepSeekApiForm from './Partials/DeepSeekApiForm';
import ProfileHeroCard from './Partials/ProfileHeroCard';
import SecurityCodeForm from './Partials/SecurityCodeForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

export default function Edit({
    auth,
    sekolah,
    mustVerifyEmail,
    status,
    hasDeepSeekKey = false,
}: PageProps<{
    mustVerifyEmail: boolean;
    status?: string;
    hasDeepSeekKey?: boolean;
}>) {
    const [securityEnabled, setSecurityEnabled] = useState(
        Boolean(auth.user.is_security_code_enabled),
    );

    useEffect(() => {
        setSecurityEnabled(Boolean(auth.user.is_security_code_enabled));
    }, [auth.user.is_security_code_enabled]);

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
                    subtitle="Kelola biodata, kata sandi, konfigurasi AI DeepSeek, dan keamanan akun pribadi Anda di satu tempat."
                />

                {/* Baris 1: Hero Identitas Pengguna + 3 Status Ringkas */}
                <div className="animate-rise" style={{ animationDelay: '40ms' }}>
                    <ProfileHeroCard
                        user={auth.user}
                        sekolah={sekolah}
                        hasDeepSeekKey={Boolean(hasDeepSeekKey)}
                        isSecurityCodeEnabled={securityEnabled}
                        mustVerifyEmail={mustVerifyEmail}
                    />
                </div>

                {/* Baris 2: Bento Grid Asimetris 7:5 — Biodata & Kata Sandi */}
                <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
                    <div
                        className="animate-rise xl:col-span-7"
                        style={{ animationDelay: '90ms' }}
                    >
                        <UpdateProfileInformationForm
                            mustVerifyEmail={mustVerifyEmail}
                            status={status}
                        />
                    </div>

                    <div
                        className="animate-rise xl:col-span-5"
                        style={{ animationDelay: '130ms' }}
                    >
                        <UpdatePasswordForm />
                    </div>
                </div>

                {/* Baris 3: Bento Grid Asimetris 7:5 — Konfigurasi AI DeepSeek & Keamanan Akun */}
                <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
                    <div
                        className="animate-rise xl:col-span-7"
                        style={{ animationDelay: '170ms' }}
                    >
                        <DeepSeekApiForm />
                    </div>

                    <div
                        className="animate-rise xl:col-span-5"
                        style={{ animationDelay: '210ms' }}
                    >
                        <SecurityCodeForm onStatusChange={setSecurityEnabled} />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
