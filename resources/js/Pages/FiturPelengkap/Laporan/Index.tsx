import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import TabReguler from './TabReguler';
import PageHeader from '@/Components/ui/PageHeader';
import PillTabs from '@/Components/ui/PillTabs';
import StatusBadge from '@/Components/ui/StatusBadge';
import Surface from '@/Components/ui/Surface';

export default function Index({ auth }: { auth: any }) {
    const routePrefix = usePage<any>().props.routePrefix || '';

    let activeTab = 'reguler';
    if (routePrefix === 'silpa-') activeTab = 'silpa';
    else if (routePrefix === 'kinerja-') activeTab = 'kinerja';
    else if (routePrefix === 'kinerja-silpa-') activeTab = 'kinerja_silpa';

    return (
        <AuthenticatedLayout>
            <Head title="Manajemen Laporan" />

            <div className="space-y-4">
                <PageHeader
                    className="animate-rise"
                    breadcrumb={[
                        { label: 'Dashboard' },
                        { label: 'Fitur Pelengkap' },
                        { label: 'Laporan' },
                    ]}
                    title="Laporan & Pertanggungjawaban"
                    badge={
                        <StatusBadge tone="violet" dot={false}>
                            SPJ
                        </StatusBadge>
                    }
                    subtitle="Kelola dokumen SPMTH, SPTJ, SP2B, dan laporan keuangan lainnya dalam satu tempat."
                />

                <div className="animate-rise" style={{ animationDelay: '60ms' }}>
                    <Surface padding="sm">
                        <PillTabs
                            ariaLabel="Varian BOSP Laporan"
                            variant="solid"
                            value={activeTab}
                            items={[
                                { key: 'reguler', label: 'BOSP Reguler' },
                                { key: 'kinerja', label: 'BOSP Kinerja' },
                                { key: 'silpa', label: 'SiLPA BOSP Reguler' },
                                { key: 'kinerja_silpa', label: 'SiLPA BOSP Kinerja' },
                            ]}
                            onChange={(key) => {
                                if (key === 'reguler') {
                                    if (activeTab !== 'reguler') router.visit(route('laporan.index'));
                                } else if (key === 'kinerja') {
                                    if (activeTab !== 'kinerja') router.visit(route('kinerja-laporan.index'));
                                } else if (key === 'silpa') {
                                    if (activeTab !== 'silpa') router.visit(route('silpa-laporan.index'));
                                } else if (key === 'kinerja_silpa') {
                                    if (activeTab !== 'kinerja_silpa') router.visit(route('kinerja-silpa-laporan.index'));
                                }
                            }}
                        />
                    </Surface>
                </div>

                <div className="animate-rise" style={{ animationDelay: '120ms' }}>
                    <TabReguler auth={auth} />
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
