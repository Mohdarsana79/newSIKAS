import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import TabReguler from './TabReguler';
import PageHeader from '@/Components/ui/PageHeader';
import Surface from '@/Components/ui/Surface';
import PillTabs from '@/Components/ui/PillTabs';
import StatusBadge from '@/Components/ui/StatusBadge';

export default function Index({ auth }: { auth: any }) {
    const routePrefix = usePage<any>().props.routePrefix || '';
    
    let activeTab = 'reguler';
    if (routePrefix === 'silpa-') activeTab = 'silpa';
    else if (routePrefix === 'kinerja-') activeTab = 'kinerja';
    else if (routePrefix === 'kinerja-silpa-') activeTab = 'kinerja_silpa';

    return (
        <AuthenticatedLayout>
            <Head title="Manajemen Tanda Terima" />

            <div className="space-y-4">
                <PageHeader
                    className="animate-rise"
                    breadcrumb={[
                        { label: 'Dashboard' },
                        { label: 'Dokumen SPJ' },
                        { label: 'Tanda Terima' },
                    ]}
                    title="Tanda Terima"
                    badge={
                        <StatusBadge tone="violet" dot={false}>
                            SPJ
                        </StatusBadge>
                    }
                />

                <div className="animate-rise" style={{ animationDelay: '60ms' }}>
                    <Surface padding="sm">
                        <PillTabs
                            variant="solid"
                            value={activeTab}
                            ariaLabel="Varian BOSP"
                            onChange={(key) => {
                                if (key === 'reguler' && activeTab !== 'reguler') router.visit(route('tanda-terima.index'));
                                if (key === 'kinerja' && activeTab !== 'kinerja') router.visit(route('kinerja-tanda-terima.index'));
                                if (key === 'silpa' && activeTab !== 'silpa') router.visit(route('silpa-tanda-terima.index'));
                                if (key === 'kinerja_silpa' && activeTab !== 'kinerja_silpa') router.visit(route('kinerja-silpa-tanda-terima.index'));
                            }}
                            items={[
                                { key: 'reguler', label: 'BOSP Reguler' },
                                { key: 'kinerja', label: 'BOSP Kinerja' },
                                { key: 'silpa', label: 'SiLPA BOSP Reguler' },
                                { key: 'kinerja_silpa', label: 'SiLPA BOSP Kinerja' },
                            ]}
                        />
                    </Surface>
                </div>

                <div className="animate-rise" style={{ animationDelay: '120ms' }}>
                    <TabReguler />
                </div>
            </div>

        </AuthenticatedLayout>
    );
}
