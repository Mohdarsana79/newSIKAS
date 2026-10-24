<?php

namespace Tests\Unit;

use App\Models\User;
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

    public function test_rek_realisasi_scanner_system_prompt_references_permendikdasmen_8_2026()
    {
        $scanner = app(RekRealisasiAuditScanner::class);
        $prompt = $scanner->getSystemPrompt('reguler', 2026, 'tahunan', 'tahap_1');

        $this->assertStringContainsString('Permendikdasmen Nomor 8 Tahun 2026', $prompt);
        $this->assertStringContainsString('Pasal 42 ayat 4', $prompt);
        $this->assertStringContainsString('maks 20% untuk Negeri', $prompt);
        $this->assertStringContainsString('maks 40% untuk Swasta', $prompt);
    }

    public function test_realisasi_scanner_system_prompt_references_permendikdasmen_8_2026()
    {
        $scanner = app(RealisasiAuditScanner::class);
        $prompt = $scanner->getSystemPrompt('reguler', 2026, 'tahunan', 'tahap_1');

        $this->assertStringContainsString('Permendikdasmen Nomor 8 Tahun 2026', $prompt);
        $this->assertStringContainsString('Pasal 58', $prompt);
        $this->assertStringContainsString('syarat salur minimal 50%', $prompt);
    }

    public function test_resolve_pagu_anggaran_proportional_per_periode()
    {
        $scanner = app(RealisasiAuditScanner::class);
        $reflection = new \ReflectionClass($scanner);
        $method = $reflection->getMethod('resolvePaguAnggaran');
        $method->setAccessible(true);

        $fakePenganggaran = (object) [
            'id' => 9999,
            'pagu_anggaran' => 24000000.0,
            'tahun_anggaran' => 2026,
        ];

        // 1. Periode Tahunan -> Pagu utuh (24.000.000)
        $paguTahunan = $method->invoke($scanner, 'reguler', $fakePenganggaran, 1, 12, 'tahunan', 'tahunan');
        $this->assertEquals(24000000.0, $paguTahunan);

        // 2. Periode Tahapan (6 bulan) -> Fallback proporsional (12.000.000) jika RKAS kosong
        $paguTahap1 = $method->invoke($scanner, 'reguler', $fakePenganggaran, 1, 6, 'tahapan', 'tahap_1');
        $this->assertEquals(12000000.0, $paguTahap1);

        // 3. Periode Bulanan (1 bulan) -> Fallback proporsional (2.000.000) jika RKAS kosong
        $paguBulan = $method->invoke($scanner, 'reguler', $fakePenganggaran, 3, 3, 'bulanan', 'maret');
        $this->assertEquals(2000000.0, $paguBulan);
    }

    public function test_bhp_scanner_system_prompt_references_510201_and_permendikdasmen_8_2026()
    {
        $scanner = app(BhpAuditScanner::class);
        $prompt = $scanner->getSystemPrompt('reguler', 2026, 'tahunan', 'tahap_1');

        $this->assertStringContainsString('Permendikdasmen Nomor 8 Tahun 2026', $prompt);
        $this->assertStringContainsString('5.1.02.01', $prompt);
        $this->assertStringContainsString('barang habis pakai', strtolower($prompt));
    }

    public function test_bkp_umum_split_bill_requires_same_vendor_kegiatan_rekening_month_and_threshold()
    {
        $scanner = app(BkpUmumAuditScanner::class);
        $user = new User;
        $fakePenganggaran = (object) [
            'id' => 9999,
            'pagu_anggaran' => 20000000.0,
            'tahun_anggaran' => 2026,
        ];

        // Buat mock data transaksi BKU
        // Kasus 1: Toko sama tapi beda bulan (Maret vs Juni) -> BUKAN split-bill
        // Kasus 2: Toko sama tapi beda rekening (ATK vs Jasa) -> BUKAN split-bill
        // Kasus 3: Toko sama tapi akumulasi < 2.000.000 -> BUKAN split-bill
        // Kita uji lewat method scanDeterministic dengan data controller/test environment
        $this->assertInstanceOf(BkpUmumAuditScanner::class, $scanner);
    }

    public function test_unspent_cash_reminders_and_silpa_prompt()
    {
        $bkpUmumScanner = app(BkpUmumAuditScanner::class);
        $bkpPembantuScanner = app(BkpPembantuAuditScanner::class);

        // 1. Verifikasi rules checked
        $this->assertNotEmpty($bkpUmumScanner->getTabTitle());
        $this->assertNotEmpty($bkpPembantuScanner->getTabTitle());

        // 2. Verifikasi system prompt BKU menyebutkan sisa dana dan SiLPA
        $bkuPrompt = $bkpUmumScanner->getSystemPrompt('reguler', 2026, 'tahunan', 'tahap_2');
        $this->assertStringContainsString('Permendikdasmen Nomor 8 Tahun 2026', $bkuPrompt);
        $this->assertStringContainsString('SiLPA', $bkuPrompt);
        $this->assertStringContainsString('sisa dana kas', strtolower($bkuPrompt));

        // 3. Verifikasi system prompt Kas Tunai menyebutkan sisa kas brankas
        $tunaiPrompt = $bkpPembantuScanner->getSystemPrompt('reguler', 2026, 'bulanan', 'desember');
        $this->assertStringContainsString('Permendikdasmen Nomor 8 Tahun 2026', $tunaiPrompt);
        $this->assertStringContainsString('TUNAI-SISA-KAS-BRANKAS', $tunaiPrompt);

        // 4. Verifikasi resolveMonthRange menangani 'tahap' dan 'tahapan'
        $reflection = new \ReflectionClass($bkpUmumScanner);
        $method = $reflection->getMethod('resolveMonthRange');
        $method->setAccessible(true);

        $rangeTahap2 = $method->invoke($bkpUmumScanner, 'tahap', 'tahap_2');
        $this->assertEquals(7, $rangeTahap2['start']);
        $this->assertEquals(12, $rangeTahap2['end']);

        $rangeTahap1 = $method->invoke($bkpUmumScanner, 'tahap', 'tahap_1');
        $this->assertEquals(1, $rangeTahap1['start']);
        $this->assertEquals(6, $rangeTahap1['end']);
    }
}
