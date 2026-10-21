<?php

namespace App\Services\Ai\Audit;

use App\Models\User;

interface TabAuditScannerInterface
{
    /**
     * Menjalankan pemindaian deterministik dan ekstraksi data untuk tab dan rentang periode tertentu.
     *
     * @return array [
     *               'summary' => array,
     *               'rules_checked' => string[],
     *               'pre_findings' => array,
     *               'transactions' => array,
     *               'metadata' => array,
     *               ]
     */
    public function scanDeterministic(
        User $user,
        string $variant,
        int $tahun,
        string $periodeType,
        string $periodeKey,
        $penganggaran
    ): array;

    /**
     * Menghasilkan prompt sistem AI yang disesuaikan secara forensik untuk tab ini.
     */
    public function getSystemPrompt(string $variant, int $tahun, string $periodeType, string $periodeKey): string;

    /**
     * Mendapatkan label nama resmi dari tab/buku ini.
     */
    public function getTabTitle(): string;
}
