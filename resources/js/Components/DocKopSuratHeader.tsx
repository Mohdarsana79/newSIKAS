import React from 'react';
import { usePage } from '@inertiajs/react';
import { PageProps, SharedSekolah } from '@/types';
import { cn } from '@/lib/utils';

export interface DocKopSuratHeaderProps {
    docKey: string;
    sekolah?: SharedSekolah | Record<string, any> | null;
    className?: string;
}

export default function DocKopSuratHeader({
    docKey,
    sekolah: sekolahProp,
    className,
}: DocKopSuratHeaderProps) {
    const { props } = usePage<PageProps>();
    const sharedSekolah = props.sekolah;

    const kopSurat = (sekolahProp?.kop_surat as string | undefined) || sharedSekolah?.kop_surat;
    const kopDokumen = (sekolahProp?.kop_dokumen as Record<string, boolean> | undefined) || sharedSekolah?.kop_dokumen;
    const borderMode = (sekolahProp?.kop_border as string | undefined) || sharedSekolah?.kop_border || 'double';
    const kopTeksHtml = (sekolahProp?.kop_teks_html as string | undefined) || sharedSekolah?.kop_teks_html;
    const logoDaerah = (sekolahProp?.logo_daerah as string | undefined) || sharedSekolah?.logo_daerah;
    const logoSekolah = (sekolahProp?.logo_sekolah as string | undefined) || sharedSekolah?.logo_sekolah;
    const kopMode = (sekolahProp?.kop_mode as string | undefined) || sharedSekolah?.kop_mode || '2_logo';

    const isEnabled = Boolean(kopDokumen && kopDokumen[docKey]);

    if (!isEnabled || (!kopSurat && !kopTeksHtml)) {
        return null;
    }

    const cleanPath = (p?: string) => (p ? `/storage/${p.replace(/^public\//, '')}` : null);
    const logoDaerahUrl = cleanPath(logoDaerah);
    const logoSekolahUrl = cleanPath(logoSekolah);
    const kopUrl = cleanPath(kopSurat);

    return (
        <div className={cn('doc-kop-surat-header w-full mb-6 print:mb-4 select-none', className)}>
            {kopTeksHtml ? (
                <div className="flex w-full items-center justify-center mb-2">
                    <div className="inline-flex items-center justify-center gap-4 sm:gap-5 max-w-full">
                        <div className="w-16 sm:w-20 flex-shrink-0 flex items-center justify-end">
                            {logoDaerahUrl && (
                                <img
                                    src={logoDaerahUrl}
                                    alt="Logo Daerah"
                                    className="max-h-16 sm:max-h-20 max-w-full object-contain"
                                />
                            )}
                        </div>
                        <div
                            className="text-center px-1 text-slate-900 dark:text-white text-xs sm:text-sm [&_p]:m-0 [&_p]:p-0 [&_p]:leading-tight"
                            dangerouslySetInnerHTML={{ __html: kopTeksHtml }}
                        />
                        <div className="w-16 sm:w-20 flex-shrink-0 flex items-center justify-start">
                            {kopMode === '2_logo' && logoSekolahUrl && (
                                <img
                                    src={logoSekolahUrl}
                                    alt="Logo Sekolah"
                                    className="max-h-16 sm:max-h-20 max-w-full object-contain"
                                />
                            )}
                        </div>
                    </div>
                </div>
            ) : kopUrl ? (
                <div className="flex justify-center items-center mb-2">
                    <img
                        src={kopUrl}
                        alt="Kop Surat Resmi"
                        className="max-h-24 sm:max-h-28 w-auto max-w-full object-contain mx-auto"
                    />
                </div>
            ) : null}

            {borderMode === 'double' && (
                <div
                    className="w-full border-t-[3px] border-b border-slate-900 dark:border-white h-[3px] mt-1 mb-3"
                    style={{ borderTopStyle: 'solid', borderBottomStyle: 'solid' }}
                />
            )}

            {borderMode === 'single' && (
                <div className="w-full border-t-2 border-slate-900 dark:border-white mt-1 mb-3" />
            )}
        </div>
    );
}
