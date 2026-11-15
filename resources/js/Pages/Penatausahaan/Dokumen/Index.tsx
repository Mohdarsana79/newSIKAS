import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import PageHeader from '@/Components/ui/PageHeader';
import StatusBadge from '@/Components/ui/StatusBadge';
import Surface from '@/Components/ui/Surface';
import PillTabs from '@/Components/ui/PillTabs';
import TabReguler from './components/TabReguler';
import TabSilpa from './components/TabSilpa';
import TabKinerja from './components/TabKinerja';
import TabKinerjaSilpa from './components/TabKinerjaSilpa';

interface Props {
    auth: any;
    penganggarans: { id: number; tahun_anggaran: string }[];
}

export default function Index({ auth, penganggarans }: Props) {
    const routePrefix = usePage<any>().props.routePrefix || '';

    let activeTab = 'reguler';
    if (routePrefix === 'silpa-') activeTab = 'silpa';
    else if (routePrefix === 'kinerja-') activeTab = 'kinerja';
    else if (routePrefix === 'kinerja-silpa-') activeTab = 'kinerja_silpa';

    return (
        <AuthenticatedLayout>
            <Head title="Dokumen BKU" />

            <div className="space-y-4">
                <PageHeader
                    className="animate-rise"
                    breadcrumb={[
                        { label: 'Dashboard' },
                        { label: 'Penatausahaan' },
                        { label: 'Dokumen BKU' },
                    ]}
                    title="Dokumen BKU"
                    badge={<StatusBadge tone="violet">SPJ</StatusBadge>}
                    subtitle="Kelola dokumen bukti transaksi untuk setiap varian BOSP."
                />

                <div className="animate-rise" style={{ animationDelay: '60ms' }}>
                    <Surface padding="sm">
                        <PillTabs
                            variant="solid"
                            ariaLabel="Varian BOSP"
                            value={activeTab}
                            onChange={(key) => {
                                if (key === 'reguler') {
                                    if (activeTab !== 'reguler') router.visit(route('dokumen.index'));
                                } else if (key === 'silpa') {
                                    if (activeTab !== 'silpa') router.visit(route('silpa-dokumen.index'));
                                } else if (key === 'kinerja') {
                                    if (activeTab !== 'kinerja') router.visit(route('kinerja-dokumen.index'));
                                } else if (key === 'kinerja_silpa') {
                                    if (activeTab !== 'kinerja_silpa') router.visit(route('kinerja-silpa-dokumen.index'));
                                }
                            }}
                            items={[
                                { key: 'reguler', label: 'BOSP Reguler' },
                                { key: 'silpa', label: 'SiLPA BOSP' },
                                { key: 'kinerja', label: 'BOSP Kinerja' },
                                { key: 'kinerja_silpa', label: 'SiLPA BOSP Kinerja' },
                            ]}
                        />
                    </Surface>
                </div>

                {activeTab === 'reguler' && <TabReguler auth={auth} penganggarans={penganggarans} />}
                {activeTab === 'silpa' && <TabSilpa auth={auth} silpaPenganggarans={penganggarans} />}
                {activeTab === 'kinerja' && <TabKinerja auth={auth} kinerjaPenganggarans={penganggarans} />}
                {activeTab === 'kinerja_silpa' && <TabKinerjaSilpa auth={auth} kinerjaSilpaPenganggarans={penganggarans} />}
            </div>
        </AuthenticatedLayout>
    );
}
