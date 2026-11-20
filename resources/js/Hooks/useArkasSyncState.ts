import { ArkasAwalDiffPreview } from '@/Components/Rkas/ArkasAwalPreviewModal';
import { ArkasSyncReport } from '@/Components/Rkas/ArkasSyncReportModal';
import { useEffect, useMemo, useState } from 'react';

export interface ArkasPreviewData {
    status: string;
    exists: boolean;
    is_revisi?: number | null;
    tahun: number;
    sumber_dana: string;
    pagu: number;
    total_kegiatan: number;
    total_alokasi: number;
    total_alokasi_rp: number;
    current_rkas_count: number;
    has_bku?: boolean;
    has_bku_tahap2?: boolean;
    can_pull: boolean;
    diff_preview?: ArkasAwalDiffPreview | null;
    message?: string | null;
}

interface UseArkasSyncStateOptions {
    items: Array<{ uraian_arkas?: string | null }>;
    flashReport?: ArkasSyncReport | null;
    selectedMonth: string | null;
    setSelectedMonth: (month: string | null) => void;
    setShowArkasUraian: (show: boolean) => void;
    setSearchQuery: (query: string) => void;
}

export function useArkasSyncState({
    items,
    flashReport,
    selectedMonth,
    setSelectedMonth,
    setShowArkasUraian,
    setSearchQuery,
}: UseArkasSyncStateOptions) {
    const [isArkasModalOpen, setIsArkasModalOpen] = useState(false);
    const [arkasPreviewData, setArkasPreviewData] = useState<ArkasPreviewData | null>(null);
    const [isCheckingArkas, setIsCheckingArkas] = useState(false);
    const [isPullingArkas, setIsPullingArkas] = useState(false);
    const [syncReport, setSyncReport] = useState<ArkasSyncReport | null>(null);
    const [isSyncReportOpen, setIsSyncReportOpen] = useState(false);
    const [onlyUnpairedArkas, setOnlyUnpairedArkas] = useState(false);

    useEffect(() => {
        if (flashReport) {
            setSyncReport(flashReport);
            setIsSyncReportOpen(true);
        }
    }, [flashReport]);

    const unpairedArkasCount = useMemo(
        () => items.filter((item) => !item.uraian_arkas || !item.uraian_arkas.trim()).length,
        [items],
    );

    useEffect(() => {
        if (onlyUnpairedArkas && unpairedArkasCount === 0) {
            setOnlyUnpairedArkas(false);
            if (!selectedMonth) {
                setSelectedMonth('Januari');
            }
        }
    }, [onlyUnpairedArkas, unpairedArkasCount, selectedMonth, setSelectedMonth]);

    const activateUnpairedFilter = () => {
        setOnlyUnpairedArkas(true);
        setShowArkasUraian(true);
        setSelectedMonth(null);
        setSearchQuery('');
    };

    const handleToggleUnpairedFilter = () => {
        if (onlyUnpairedArkas) {
            setOnlyUnpairedArkas(false);
            if (!selectedMonth) {
                setSelectedMonth('Januari');
            }
        } else {
            activateUnpairedFilter();
        }
    };

    return {
        isArkasModalOpen,
        setIsArkasModalOpen,
        arkasPreviewData,
        setArkasPreviewData,
        isCheckingArkas,
        setIsCheckingArkas,
        isPullingArkas,
        setIsPullingArkas,
        syncReport,
        isSyncReportOpen,
        setIsSyncReportOpen,
        onlyUnpairedArkas,
        unpairedArkasCount,
        handleToggleUnpairedFilter,
        activateUnpairedFilter,
    };
}
