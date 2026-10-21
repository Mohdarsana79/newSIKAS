<?php

namespace Tests\Unit;

use App\Services\Ai\Audit\BkuAuditOrchestrator;
use App\Services\Ai\Audit\Scanners\BkpBankAuditScanner;
use App\Services\Ai\Audit\Scanners\BkpPembantuAuditScanner;
use App\Services\Ai\Audit\Scanners\BkpUmumAuditScanner;
use App\Services\Ai\Audit\Scanners\BkpPajakAuditScanner;
use App\Services\Ai\Audit\Scanners\BkpRobAuditScanner;
use App\Services\Ai\Audit\Scanners\BkpRegAuditScanner;
use App\Services\Ai\Audit\Scanners\BkpBaAuditScanner;
use App\Services\Ai\Audit\Scanners\RealisasiAuditScanner;
use App\Services\Ai\Audit\Scanners\RekRealisasiAuditScanner;
use App\Services\Ai\Audit\Scanners\BhpAuditScanner;
use App\Services\Ai\Audit\Scanners\BhmAuditScanner;
use Tests\TestCase;

class BkuMultiTabAuditTest extends TestCase
{
    public function test_orchestrator_registers_all_11_tab_scanners()
    {
        $orchestrator = app(BkuAuditOrchestrator::class);

        $expectedTabs = [
            'bkp_bank',
            'bkp_pembantu',
            'bkp_umum',
            'bkp_pajak',
            'rob',
            'reg',
            'ba',
            'realisasi',
            'rek_realisasi',
            'bhp',
            'bhm',
        ];

        foreach ($expectedTabs as $tab) {
            $this->assertTrue(
                $orchestrator->hasScanner($tab),
                "Scanner for tab '{$tab}' should be registered in BkuAuditOrchestrator."
            );
            $scanner = $orchestrator->getScanner($tab);
            $this->assertNotNull($scanner);
            $this->assertNotEmpty($scanner->getTabTitle());
            $this->assertNotEmpty($scanner->getSystemPrompt('reguler', 2026, 'bulanan', 'januari'));
        }
    }

    public function test_orchestrator_resolves_correct_scanner_classes()
    {
        $orchestrator = app(BkuAuditOrchestrator::class);

        $this->assertInstanceOf(BkpBankAuditScanner::class, $orchestrator->getScanner('bkp_bank'));
        $this->assertInstanceOf(BkpPembantuAuditScanner::class, $orchestrator->getScanner('bkp_pembantu'));
        $this->assertInstanceOf(BkpUmumAuditScanner::class, $orchestrator->getScanner('bkp_umum'));
        $this->assertInstanceOf(BkpPajakAuditScanner::class, $orchestrator->getScanner('bkp_pajak'));
        $this->assertInstanceOf(BkpRobAuditScanner::class, $orchestrator->getScanner('rob'));
        $this->assertInstanceOf(BkpRegAuditScanner::class, $orchestrator->getScanner('reg'));
        $this->assertInstanceOf(BkpBaAuditScanner::class, $orchestrator->getScanner('ba'));
        $this->assertInstanceOf(RealisasiAuditScanner::class, $orchestrator->getScanner('realisasi'));
        $this->assertInstanceOf(RekRealisasiAuditScanner::class, $orchestrator->getScanner('rek_realisasi'));
        $this->assertInstanceOf(BhpAuditScanner::class, $orchestrator->getScanner('bhp'));
        $this->assertInstanceOf(BhmAuditScanner::class, $orchestrator->getScanner('bhm'));
    }
}
