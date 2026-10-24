<?php

namespace Tests\Unit;

use App\Services\Ai\CopilotService;
use Tests\TestCase;

class CopilotAppGuideTest extends TestCase
{
    protected CopilotService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = $this->app->make(CopilotService::class);
    }

    public function test_system_prompt_includes_in_app_guide_and_strict_zero_internal_url_rule(): void
    {
        $prompt = $this->service->buildSystemPrompt('reguler', 2026);

        $this->assertStringContainsString('PEDOMAN KHUSUS ASISTEN PANDUAN PENGGUNAAN APLIKASI SIKAS', $prompt);
        $this->assertStringContainsString('CARA MENGGUNAKAN aplikasi, CARA INPUT, ALUR KERJA, PROSEDUR SOP, atau KENDALA/TROUBLESHOOTING', $prompt);
        $this->assertStringContainsString('PETA MENU RESMI & FITUR APLIKASI SIKAS', $prompt);
        $this->assertStringContainsString('STRICT ZERO INTERNAL URL PATH RULE', $prompt);
        $this->assertStringNotContainsString('menu `/penganggaran`', $prompt);
        $this->assertStringNotContainsString('PROTOKOL SMART ACTION BUTTONS (TOMBOL PINTAS MENU)', $prompt);
    }

    public function test_extract_action_buttons_always_returns_empty_array_and_strips_tags(): void
    {
        $content = "Untuk melakukan tutup buku bulan Maret di BKU, ikuti langkah ini:\n1. Buka menu BKU...\n[ACTION_BUTTON: {\"label\": \"Buka Buku Kas Umum (BKU)\", \"url\": \"/penatausahaan/bku/{tahun}/Maret\", \"icon\": \"BookOpen\", \"description\": \"Menuju BKU bulan Maret\"}]";

        $buttons = $this->service->extractActionButtons($content, 'reguler', 2026);

        $this->assertEmpty($buttons);
        // Pastikan tag ACTION_BUTTON sudah dibersihkan dari teks tampilan
        $this->assertStringNotContainsString('[ACTION_BUTTON:', $content);
        $this->assertStringContainsString('1. Buka menu BKU...', $content);
    }

    public function test_extract_action_buttons_with_variant_cleans_tags_and_returns_empty(): void
    {
        $content = "Om bisa langsung cetak kuitansi di menu kuitansi:\n[ACTION_BUTTON: {\"label\": \"Buka Halaman Kwitansi\", \"url\": \"/kwitansi\", \"icon\": \"Printer\", \"description\": \"Cetak kuitansi massal\"}]";

        $buttonsKinerja = $this->service->extractActionButtons($content, 'kinerja', 2026);
        $this->assertEmpty($buttonsKinerja);
        $this->assertStringNotContainsString('[ACTION_BUTTON:', $content);

        $contentSilpa = "Om bisa cek BKU di sini:\n[ACTION_BUTTON: {\"label\": \"Buka BKU\", \"url\": \"/penatausahaan/bku/2026/April\", \"icon\": \"BookOpen\"}]";
        $buttonsSilpa = $this->service->extractActionButtons($contentSilpa, 'silpa', 2026);
        $this->assertEmpty($buttonsSilpa);
        $this->assertStringNotContainsString('[ACTION_BUTTON:', $contentSilpa);
    }

    public function test_extract_action_buttons_preserves_dashboard_text_and_returns_empty(): void
    {
        $content = "Silakan periksa dashboard atau profil Anda:\n[ACTION_BUTTON: {\"label\": \"Buka Dashboard\", \"url\": \"/dashboard\", \"icon\": \"LayoutDashboard\"}]\n[ACTION_BUTTON: {\"label\": \"Buka Profil\", \"url\": \"/profile\", \"icon\": \"Settings\"}]";

        $buttons = $this->service->extractActionButtons($content, 'kinerja', 2026);

        $this->assertEmpty($buttons);
        $this->assertStringNotContainsString('[ACTION_BUTTON:', $content);
    }

    public function test_extract_action_buttons_handles_empty_or_no_tag(): void
    {
        $content = 'Halo Om! Pagu anggaran tahun ini adalah Rp 29.000.000.';
        $buttons = $this->service->extractActionButtons($content, 'reguler', 2026);

        $this->assertEmpty($buttons);
        $this->assertEquals('Halo Om! Pagu anggaran tahun ini adalah Rp 29.000.000.', $content);
    }
}
