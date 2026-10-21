<?php

namespace Tests\Unit;

use App\Services\Ai\Audit\BkuAuditOrchestrator;
use App\Services\Ai\Audit\Scanners\BhmAuditScanner;
use App\Services\Ai\Audit\Scanners\BhpAuditScanner;
use App\Services\Ai\Audit\Scanners\BkpBaAuditScanner;
use App\Services\Ai\Audit\Scanners\BkpBankAuditScanner;
use App\Services\Ai\Audit\Scanners\BkpPajakAuditScanner;
use App\Services\Ai\Audit\Scanners\BkpPembantuAuditScanner;
use App\Services\Ai\Audit\Scanners\BkpRegAuditScanner;
use App\Services\Ai\Audit\Scanners\BkpRobAuditScanner;
use App\Services\Ai\Audit\Scanners\BkpUmumAuditScanner;
use App\Services\Ai\Audit\Scanners\RealisasiAuditScanner;
use App\Services\Ai\Audit\Scanners\RekRealisasiAuditScanner;
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

    public function test_all_scanners_forbid_database_ids()
    {
        $orchestrator = app(BkuAuditOrchestrator::class);
        $expectedTabs = [
            'bkp_bank', 'bkp_pembantu', 'bkp_umum', 'bkp_pajak',
            'rob', 'reg', 'ba', 'realisasi', 'rek_realisasi', 'bhp', 'bhm',
        ];

        foreach ($expectedTabs as $tab) {
            $scanner = $orchestrator->getScanner($tab);
            $prompt = $scanner->getSystemPrompt('reguler', 2026, 'tahunan', 'tahap1');
            $hasIdRule = str_contains($prompt, 'ID INTERNAL DATABASE') || str_contains($prompt, 'ID internal angka database');
            $this->assertTrue($hasIdRule, "Scanner {$tab} should instruct AI not to output database IDs.");
            $this->assertTrue(
                str_contains($prompt, 'Auditor Konsultan / Narrator') || str_contains($prompt, 'executive_summary'),
                "Scanner {$tab} should configure AI as Narrator/Consultant."
            );
        }
    }

    public function test_deterministic_compliance_score_calculation()
    {
        $scanner = app(BkpBankAuditScanner::class);

        // Kasus 1: Tanpa temuan -> Skor 100
        $this->assertEquals(100, $scanner->calculateComplianceScore([]));

        // Kasus 2: 1 Temuan Bahaya (Danger) -> Penalti -20 -> Skor 80
        $dangerFindings = [['severity' => 'danger', 'title' => 'Saldo Minus']];
        $this->assertEquals(80, $scanner->calculateComplianceScore($dangerFindings));

        // Kasus 3: 1 Temuan Peringatan (Warning) -> Penalti -10 -> Skor 90
        $warningFindings = [['severity' => 'warning', 'title' => 'Batas Brankas']];
        $this->assertEquals(90, $scanner->calculateComplianceScore($warningFindings));

        // Kasus 4: 1 Temuan Info -> Penalti -2 -> Skor 98
        $infoFindings = [['severity' => 'info', 'title' => 'Sisa Pagu']];
        $this->assertEquals(98, $scanner->calculateComplianceScore($infoFindings));

        // Kasus 5: Kombinasi 1 Danger + 1 Warning + 1 Info -> Penalti -32 -> Skor 68
        $combo = [
            ['severity' => 'danger'],
            ['severity' => 'warning'],
            ['severity' => 'info'],
        ];
        $this->assertEquals(68, $scanner->calculateComplianceScore($combo));

        // Kasus 6: Pelanggaran Ekstrem (6 Danger) -> Clamped di 0 (bukan negatif)
        $extreme = array_fill(0, 6, ['severity' => 'danger']);
        $this->assertEquals(0, $scanner->calculateComplianceScore($extreme));
    }

    public function test_compact_transactions_omits_database_id_and_handles_bunga_record()
    {
        $scanner = app(BkpBankAuditScanner::class);
        $reflection = new \ReflectionClass($scanner);
        $method = $reflection->getMethod('compactTransactions');
        $method->setAccessible(true);

        $fakeTransactions = collect([
            (object) [
                'id' => 999,
                'tanggal_transaksi' => '2026-02-10',
                'no_bukti' => 'BKT-001',
                'uraian' => 'Pembelian ATK Kantor',
                'kode_rekening' => '5.1.02.01.01.0024',
                'nama_rekening' => 'Belanja Alat Tulis Kantor',
                'kode_kegiatan' => '02.03.01',
                'nama_kegiatan' => 'Operasional Sekolah',
                'penerimaan' => 0,
                'pengeluaran' => 250000,
                'dibelanjakan' => 250000,
                'nama_toko' => 'CV Makmur Sejahtera',
                'is_bunga_record' => false,
            ],
            (object) [
                'id' => 1000,
                'tanggal_transaksi' => '2026-02-28',
                'no_bukti' => null,
                'uraian' => null,
                'kode_rekening' => null,
                'nama_rekening' => null,
                'penerimaan' => 0,
                'pengeluaran' => 0,
                'dibelanjakan' => 0,
                'bunga_bank' => 1896,
                'pajak_bunga_bank' => 379,
                'is_bunga_record' => true,
            ],
        ]);

        $compacted = $method->invoke($scanner, $fakeTransactions);

        $this->assertCount(2, $compacted, 'Bunga record should generate compact informative entry.');

        // 1. Pastikan TIDAK ADA key 'id' pada semua item
        foreach ($compacted as $item) {
            $this->assertArrayNotHasKey('id', $item, 'Compacted transactions must NEVER expose internal database IDs.');
            $this->assertArrayHasKey('uraian', $item);
        }

        // 2. Cek transaksi biasa
        $this->assertEquals('Pembelian ATK Kantor', $compacted[0]['uraian']);
        $this->assertEquals('5.1.02.01.01.0024', $compacted[0]['kode_rekening']);
        $this->assertEquals('Belanja Alat Tulis Kantor', $compacted[0]['nama_rekening']);
        $this->assertEquals(250000, $compacted[0]['nominal']);

        // 3. Cek hasil penanganan bunga bank (tidak lagi bernilai 0 atau uraian kosong)
        $this->assertStringContainsString('Bunga Bank', $compacted[1]['uraian']);
        $this->assertStringContainsString('Pajak Bunga', $compacted[1]['uraian']);
        $this->assertEquals(1896, $compacted[1]['nominal']);
        $this->assertEquals(379, $compacted[1]['pajak']);
    }
}
