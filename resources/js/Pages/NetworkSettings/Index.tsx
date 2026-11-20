import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import { useState } from 'react';
import PageHeader from '@/Components/ui/PageHeader';
import Surface from '@/Components/ui/Surface';
import IconTile from '@/Components/ui/IconTile';
import StatusBadge from '@/Components/ui/StatusBadge';
import StatCard from '@/Components/StatCard';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';

export interface NetworkAccessInfo {
    port: number;
    lan_urls: string[];
    current_host_url: string;
    app_url: string;
    force_https: boolean;
    trusted_proxies: string;
    env_location: 'programdata' | 'root';
    firewall: {
        supported: boolean;
        open: boolean | null;
        rule_name: string;
        message: string;
    };
}

interface NetworkSettingsPageProps {
    networkAccess: NetworkAccessInfo;
}

export default function NetworkSettingsIndex({ networkAccess }: NetworkSettingsPageProps) {
    const [netState, setNetState] = useState<NetworkAccessInfo>(networkAccess);
    const [copiedValue, setCopiedValue] = useState<string | null>(null);
    const [publicUrlInput, setPublicUrlInput] = useState(
        networkAccess.app_url && !networkAccess.app_url.startsWith('http://localhost')
            ? networkAccess.app_url
            : '',
    );
    const [forceHttpsInput, setForceHttpsInput] = useState(Boolean(networkAccess.force_https));
    const [savingNetwork, setSavingNetwork] = useState(false);
    const [openingFirewall, setOpeningFirewall] = useState(false);
    const [networkFeedback, setNetworkFeedback] = useState<{
        tone: 'success' | 'error';
        text: string;
        cmd?: string | null;
    } | null>(null);

    const handleCopy = async (valueToCopy: string) => {
        try {
            await navigator.clipboard.writeText(valueToCopy);
            setCopiedValue(valueToCopy);
            setTimeout(() => setCopiedValue((prev) => (prev === valueToCopy ? null : prev)), 2000);
        } catch {
            window.prompt('Salin teks berikut:', valueToCopy);
        }
    };

    const handleSaveNetworkSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingNetwork(true);
        setNetworkFeedback(null);

        try {
            const res = await axios.post(route('network-settings.update'), {
                app_url: publicUrlInput.trim() === '' ? null : publicUrlInput.trim(),
                force_https: forceHttpsInput,
            });
            if (res.data?.networkAccess) {
                setNetState(res.data.networkAccess as NetworkAccessInfo);
            }
            setNetworkFeedback({
                tone: 'success',
                text: res.data?.message || 'Pengaturan akses jaringan berhasil disimpan.',
            });
        } catch (err: unknown) {
            const msg = axios.isAxiosError(err)
                ? (err.response?.data as { message?: string } | undefined)?.message || 'Gagal menyimpan pengaturan jaringan.'
                : 'Gagal menyimpan pengaturan jaringan.';
            setNetworkFeedback({ tone: 'error', text: msg });
        } finally {
            setSavingNetwork(false);
        }
    };

    const handleOpenFirewall = async () => {
        setOpeningFirewall(true);
        setNetworkFeedback(null);

        try {
            const res = await axios.post(route('network-settings.firewall-open'));
            if (res.data?.firewall) {
                setNetState((prev) => ({ ...prev, firewall: res.data.firewall }));
            }
            setNetworkFeedback({
                tone: 'success',
                text: res.data?.message || 'Port firewall berhasil dibuka.',
            });
        } catch (err: unknown) {
            const data = axios.isAxiosError(err)
                ? (err.response?.data as {
                      message?: string;
                      manual_command?: string;
                      firewall?: NetworkAccessInfo['firewall'];
                  } | undefined)
                : undefined;
            if (data?.firewall) {
                setNetState((prev) => ({ ...prev, firewall: data.firewall! }));
            }
            setNetworkFeedback({
                tone: 'error',
                text: data?.message || 'Gagal membuka port firewall otomatis.',
                cmd: data?.manual_command || null,
            });
        } finally {
            setOpeningFirewall(false);
        }
    };

    const firewallLabel = !netState.firewall.supported
        ? 'Non-Windows'
        : netState.firewall.open === true
          ? 'Terbuka'
          : netState.firewall.open === false
            ? 'Perlu Izin'
            : 'Tidak Diketahui';

    const hasCustomDomain = Boolean(netState.app_url && !netState.app_url.startsWith('http://localhost'));

    return (
        <AuthenticatedLayout>
            <Head title="Pengaturan Jaringan" />

            <div className="space-y-5">
                <PageHeader
                    title="Pengaturan Jaringan"
                    subtitle="Kelola alamat akses jaringan lokal (WiFi/LAN sekolah), izin Windows Firewall, serta domain publik / HTTPS untuk akses jarak jauh."
                    breadcrumb={[
                        { label: 'Sistem' },
                        { label: 'Pengaturan Jaringan' },
                    ]}
                    badge={
                        <StatusBadge tone={netState.firewall.open === false ? 'warning' : 'success'} dot>
                            {netState.env_location === 'programdata' ? 'Mode Terproteksi (.exe)' : 'Mode Konfigurasi Root'}
                        </StatusBadge>
                    }
                />

                {/* 4 Kartu Ringkasan Status */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="animate-rise" style={{ animationDelay: '0ms' }}>
                        <StatCard
                            tone="violet"
                            title="PORT SERVER AKTIF"
                            value={`:${netState.port}`}
                            description={`Host saat ini: ${netState.current_host_url}`}
                            icon={
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                                </svg>
                            }
                        />
                    </div>
                    <div className="animate-rise" style={{ animationDelay: '70ms' }}>
                        <StatCard
                            tone="mint"
                            title="IP JARINGAN LOKAL"
                            value={`${netState.lan_urls.length} Alamat`}
                            description={netState.lan_urls[0] || 'Belum terhubung ke WiFi/LAN'}
                            icon={
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                                </svg>
                            }
                        />
                    </div>
                    <div className="animate-rise" style={{ animationDelay: '140ms' }}>
                        <StatCard
                            tone={netState.firewall.open === false ? 'amber' : 'sky'}
                            title="WINDOWS FIREWALL"
                            value={firewallLabel}
                            description={`Aturan: ${netState.firewall.rule_name}`}
                            icon={
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            }
                        />
                    </div>
                    <div className="animate-rise" style={{ animationDelay: '210ms' }}>
                        <StatCard
                            tone="peach"
                            title="DOMAIN & HTTPS"
                            value={hasCustomDomain ? 'Domain Publik' : 'Otomatis (Dinamis)'}
                            description={netState.force_https ? 'FORCE_HTTPS: Aktif' : 'Mendukung HTTP LAN & HTTPS Proxy'}
                            icon={
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                </svg>
                            }
                        />
                    </div>
                </div>

                {/* Panel Utama Pengaturan Jaringan */}
                <div className="animate-rise" style={{ animationDelay: '240ms' }}>
                    <Surface
                        title="Akses Jaringan Sekolah & Mode Online"
                        subtitle="Bagikan tautan LAN ke Kepala Sekolah atau perangkat lain dalam satu jaringan, atau konfigurasikan domain tetap tanpa menyunting file .env manual."
                        icon={
                            <IconTile tone="mint" size="md">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                </svg>
                            </IconTile>
                        }
                    >
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            {/* Kolom 1: Link Akses Jaringan Sekolah (LAN) & Status Firewall */}
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                                        Alamat Akses Jaringan Lokal (LAN / WiFi Sekolah)
                                    </p>
                                    {netState.lan_urls.length > 0 ? (
                                        <div className="mt-2 space-y-2">
                                            {netState.lan_urls.map((lanUrl) => (
                                                <div
                                                    key={lanUrl}
                                                    className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 px-3.5 py-2.5 dark:border-white/10 dark:bg-white/[0.03]"
                                                >
                                                    <code className="break-all select-all text-[12px] font-bold text-brand-600 dark:text-brand-300">
                                                        {lanUrl}
                                                    </code>
                                                    <SecondaryButton
                                                        type="button"
                                                        onClick={() => handleCopy(lanUrl)}
                                                        className="shrink-0 !py-1 !px-3 !text-[10.5px]"
                                                    >
                                                        {copiedValue === lanUrl ? 'Tersalin ✓' : 'Salin Link'}
                                                    </SecondaryButton>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="mt-2 rounded-2xl border border-amber-200/70 bg-amber-50/60 px-3.5 py-2.5 text-[11px] font-medium text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                                            IP jaringan lokal tidak terdeteksi. Pastikan komputer terhubung ke WiFi/kabel LAN sekolah.
                                        </div>
                                    )}
                                    <p className="mt-2 text-[10.5px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                                        Port aktif server: <strong className="text-slate-700 dark:text-slate-200">{netState.port}</strong>. Aplikasi otomatis menyesuaikan link dan aset tanpa perlu mengubah kode saat diakses lewat LAN maupun <code className="font-semibold">ngrok</code> / Cloudflare Tunnel.
                                    </p>
                                </div>

                                {netState.firewall.supported && (
                                    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-white/10 dark:bg-white/[0.02]">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[11.5px] font-extrabold text-slate-800 dark:text-slate-100">
                                                    Status Windows Firewall (Port {netState.port})
                                                </p>
                                                <p className="mt-0.5 text-[10.5px] font-medium text-slate-500 dark:text-slate-400">
                                                    {netState.firewall.message}
                                                </p>
                                            </div>
                                            {netState.firewall.open !== true && (
                                                <SecondaryButton
                                                    type="button"
                                                    onClick={handleOpenFirewall}
                                                    disabled={openingFirewall}
                                                    className="shrink-0"
                                                >
                                                    {openingFirewall ? 'Membuka...' : `Buka Port ${netState.port}`}
                                                </SecondaryButton>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Kolom 2: Pengaturan Opsional Domain Publik / Tunnel */}
                            <form
                                onSubmit={handleSaveNetworkSettings}
                                className="space-y-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-white/10 dark:bg-white/[0.02]"
                            >
                                <div>
                                    <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                                        Domain Publik / Reverse Proxy (Opsional)
                                    </p>
                                    <p className="mt-0.5 text-[10.5px] font-medium text-slate-500 dark:text-slate-400">
                                        Isi hanya jika Anda memakai domain tetap (mis. Cloudflare Tunnel / VPS). Kosongkan bila memakai IP LAN atau URL acak <code className="font-semibold">ngrok</code>.
                                    </p>
                                </div>

                                <div>
                                    <InputLabel htmlFor="public_app_url" value="URL Domain Publik (Opsional)" />
                                    <TextInput
                                        id="public_app_url"
                                        type="url"
                                        value={publicUrlInput}
                                        onChange={(e) => setPublicUrlInput(e.target.value)}
                                        placeholder="https://sikas.sekolahanda.sch.id"
                                        className="mt-1 block w-full"
                                        disabled={savingNetwork}
                                    />
                                </div>

                                <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-100 bg-white/70 p-3 dark:border-white/10 dark:bg-white/[0.02]">
                                    <input
                                        type="checkbox"
                                        checked={forceHttpsInput}
                                        onChange={(e) => setForceHttpsInput(e.target.checked)}
                                        disabled={savingNetwork}
                                        className="mt-0.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                    />
                                    <span className="text-[10.5px] font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                                        <strong className="block text-slate-800 dark:text-slate-100">
                                            Paksa Skema HTTPS (FORCE_HTTPS)
                                        </strong>
                                        Aktifkan hanya jika seluruh akses wajib HTTPS. Biarkan nonaktif bila masih mengakses lewat IP LAN HTTP dan proxy HTTPS bersamaan.
                                    </span>
                                </label>

                                <div className="flex justify-end">
                                    <PrimaryButton type="submit" disabled={savingNetwork}>
                                        {savingNetwork ? 'Menyimpan...' : 'Simpan Pengaturan Jaringan'}
                                    </PrimaryButton>
                                </div>
                            </form>
                        </div>

                        {networkFeedback && (
                            <div
                                className={`mt-4 rounded-2xl border px-4 py-3 text-[11px] font-semibold ${
                                    networkFeedback.tone === 'success'
                                        ? 'border-emerald-200 bg-emerald-50/70 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
                                        : 'border-rose-200 bg-pastel-rose/60 text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300'
                                }`}
                            >
                                <p>{networkFeedback.text}</p>
                                {networkFeedback.cmd && (
                                    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                                        <code className="flex-1 select-all rounded-lg bg-slate-900 px-3 py-2 text-[10px] font-mono text-lime-300">
                                            {networkFeedback.cmd}
                                        </code>
                                        <SecondaryButton
                                            type="button"
                                            onClick={() => handleCopy(networkFeedback.cmd!)}
                                            className="shrink-0 !py-1.5 !px-3 !text-[10.5px]"
                                        >
                                            {copiedValue === networkFeedback.cmd ? 'Tersalin ✓' : 'Salin Perintah'}
                                        </SecondaryButton>
                                    </div>
                                )}
                            </div>
                        )}
                    </Surface>
                </div>

                {/* Panduan Singkat Penggunaan */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 animate-rise" style={{ animationDelay: '300ms' }}>
                    <Surface
                        title="1. Akses Satu Jaringan Sekolah (WiFi / LAN)"
                        subtitle="Untuk Kepala Sekolah atau laptop bendahara lain tanpa internet publik."
                        icon={
                            <IconTile tone="sky" size="md">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                                </svg>
                            </IconTile>
                        }
                    >
                        <ol className="list-decimal space-y-1.5 pl-4 text-[11px] font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                            <li>Pastikan laptop server dan perangkat lain terhubung ke jaringan WiFi atau kabel LAN sekolah yang sama.</li>
                            <li>Pastikan status <strong>Windows Firewall</strong> pada port <code className="font-semibold">{netState.port}</code> sudah berstatus <strong>Terbuka</strong> (atau klik tombol Buka Port di atas).</li>
                            <li>Buka alamat IP lokal yang tercantum di atas melalui browser Chrome/Edge/HP Android.</li>
                        </ol>
                    </Surface>

                    <Surface
                        title="2. Akses Online dari Luar Sekolah (ngrok / Tunnel)"
                        subtitle="Untuk uji coba maupun pemakaian jarak jauh lintas jaringan."
                        icon={
                            <IconTile tone="violet" size="md">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </IconTile>
                        }
                    >
                        <ol className="list-decimal space-y-1.5 pl-4 text-[11px] font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                            <li>Biarkan kolom <strong>URL Domain Publik</strong> kosong jika memakai URL acak dari <code className="font-semibold">ngrok</code>.</li>
                            <li>Jalankan tunnel mengarah ke port aktif server: <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10.5px] dark:bg-white/10">ngrok http {netState.port}</code>.</li>
                            <li>Jika memakai domain tetap (mis. Cloudflare Tunnel / VPS), isi URL domain tersebut lalu simpan pengaturan.</li>
                        </ol>
                    </Surface>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
