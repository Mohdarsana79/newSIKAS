import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import TabReguler from './TabReguler';
import PageHeader from '@/Components/ui/PageHeader';
import PillTabs from '@/Components/ui/PillTabs';
import StatusBadge from '@/Components/ui/StatusBadge';
import Surface from '@/Components/ui/Surface';

export default function KwitansiIndex({ auth }: { auth: any }) {
    const routePrefix = usePage<any>().props.routePrefix || '';
    
    let activeTab = 'BOSP Reguler';
    if (routePrefix === 'silpa-') activeTab = 'SiLPA BOSP Reguler';
    else if (routePrefix === 'kinerja-') activeTab = 'BOSP Kinerja';
    else if (routePrefix === 'kinerja-silpa-') activeTab = 'SiLPA BOSP Kinerja';

    return (
        <AuthenticatedLayout>
            <Head title="Manajemen Kwitansi" />

            <div className="space-y-4">
                <PageHeader
                    className="animate-rise"
                    breadcrumb={[
                        { label: 'Dashboard' },
                        { label: 'Dokumen SPJ' },
                        { label: 'Kwitansi' },
                    ]}
                    title="Manajemen Kwitansi"
                    badge={
                        <StatusBadge tone="violet" dot={false}>
                            SPJ
                        </StatusBadge>
                    }
                    subtitle="Kelola dan pantau semua dokumen kwitansi dalam satu tempat yang terintegrasi"
                />

                <div className="animate-rise" style={{ animationDelay: '60ms' }}>
                    <Surface padding="sm">
                        <PillTabs
                            ariaLabel="Varian BOSP Kwitansi"
                            variant="solid"
                            value={activeTab}
                            items={[
                                { key: 'BOSP Reguler', label: 'BOSP Reguler' },
                                { key: 'BOSP Kinerja', label: 'BOSP Kinerja' },
                                { key: 'SiLPA BOSP Reguler', label: 'SiLPA BOSP Reguler' },
                                { key: 'SiLPA BOSP Kinerja', label: 'SiLPA BOSP Kinerja' },
                            ]}
                            onChange={(key) => {
                                if (key === 'BOSP Reguler') {
                                    if (activeTab !== 'BOSP Reguler') router.visit(route('kwitansi.index'));
                                } else if (key === 'BOSP Kinerja') {
                                    if (activeTab !== 'BOSP Kinerja') router.visit(route('kinerja-kwitansi.index'));
                                } else if (key === 'SiLPA BOSP Reguler') {
                                    if (activeTab !== 'SiLPA BOSP Reguler') router.visit(route('silpa-kwitansi.index'));
                                } else if (key === 'SiLPA BOSP Kinerja') {
                                    if (activeTab !== 'SiLPA BOSP Kinerja') router.visit(route('kinerja-silpa-kwitansi.index'));
                                }
                            }}
                        />
                    </Surface>
                </div>

                <TabReguler auth={auth} />
            </div>
        </AuthenticatedLayout>
    );
}
