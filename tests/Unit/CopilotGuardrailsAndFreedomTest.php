<?php

namespace Tests\Unit;

use App\Services\Ai\CopilotService;
use Tests\TestCase;

class CopilotGuardrailsAndFreedomTest extends TestCase
{
    protected CopilotService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = $this->app->make(CopilotService::class);
    }

    public function test_system_prompt_includes_open_conversational_freedom(): void
    {
        $prompt = $this->service->buildSystemPrompt('reguler', 2026);

        $this->assertStringContainsString('KEBEBASAN PERCAKAPAN MULTITOPIK (BISA DIAJAK BICARA BEBAS)', $prompt);
        $this->assertStringContainsString('Pengguna BEBAS mengajak bicara tentang topik apa pun', $prompt);
        $this->assertStringContainsString('sapaan santai', $prompt);
        $this->assertStringContainsString('curhat lelah urus SPJ', $prompt);
        $this->assertStringContainsString('pertanyaan pengetahuan umum', $prompt);
        $this->assertStringContainsString('regulasi juknis BOSP', $prompt);
        $this->assertStringContainsString('TIDAK membutuhkan data spesifik dari database sekolah, langsung jawab secara natural', $prompt);
    }

    public function test_system_prompt_includes_strict_security_guardrails(): void
    {
        $prompt = $this->service->buildSystemPrompt('reguler', 2026);

        $this->assertStringContainsString('BATASAN KEAMANAN & GUARDRAILS SANGAT KETAT (ANTI-HACKING, KODE, STACK, & LARANGAN CODING)', $prompt);
        $this->assertStringContainsString('LARANGAN PEMBOCORAN KODE PROGRAM', $prompt);
        $this->assertStringContainsString('LARANGAN MEMBEBERKAN STACK TEKNOLOGI & ARSITEKTUR INTERNAL', $prompt);
        $this->assertStringContainsString('LARANGAN SQL INJECTION & AKTIVITAS PERETASAN / HACKING', $prompt);
        $this->assertStringContainsString('LARANGAN MEMBUATKAN KODING / SOFTWARE', $prompt);
        $this->assertStringContainsString('Waduh, mohon maaf nih Om', $prompt);
        $this->assertStringContainsString('saya tidak diperkenankan membagikan kode program, arsitektur teknis aplikasi, maupun membuatkan skrip pemrograman', $prompt);
    }

    public function test_system_prompt_includes_data_honesty_and_apology_guidelines(): void
    {
        $prompt = $this->service->buildSystemPrompt('reguler', 2026);

        $this->assertStringContainsString('KEJUJURAN DATA & PENANGANAN DATA TIDAK DITEMUKAN (TIDAK BOLEH MENGARANG DATA)', $prompt);
        $this->assertStringContainsString('TAMPILKAN PERMINTAAN MAAF SECARA JUJUR DAN TULUS', $prompt);
        $this->assertStringContainsString('Mohon maaf ya Om', $prompt);
        $this->assertStringContainsString('DILARANG KERAS MENGARANG (HALUSINASI) DATA', $prompt);
        $this->assertStringContainsString('JANGAN PERNAH mengarang nomor kuitansi, tanggal transaksi, nama rekanan, atau nominal angka fiktif', $prompt);
        $this->assertStringContainsString('BERIKAN REKOMENDASI DAN ALTERNATIF SOLUSI YANG MEMBANTU', $prompt);
    }

    public function test_sanitize_response_text_removes_code_blocks_and_php_tags(): void
    {
        $input = "Halo Om! Berikut contoh kodenya: ```php\n<?php echo 'rahasia'; ?>\n``` dan ada tag <?php phpinfo(); ?> di sini.";
        $output = $this->service->sanitizeResponseText($input);

        $this->assertStringNotContainsString('```php', $output);
        $this->assertStringNotContainsString('<?php', $output);
        $this->assertStringNotContainsString('phpinfo()', $output);
        $this->assertStringContainsString('Halo Om!', $output);
    }

    public function test_sanitize_response_text_removes_raw_sql_and_destructive_queries(): void
    {
        $input = 'Data berhasil dicek. SELECT * FROM users WHERE id = 1; dan ada percobaan DROP TABLE siswa; di database.';
        $output = $this->service->sanitizeResponseText($input);

        $this->assertStringNotContainsString('SELECT * FROM users', $output);
        $this->assertStringNotContainsString('DROP TABLE siswa', $output);
        $this->assertStringContainsString('Data berhasil dicek.', $output);
    }

    public function test_sanitize_response_text_masks_sensitive_environment_secrets(): void
    {
        $input = 'Pengaturan ada di file .env dengan APP_KEY dan DB_PASSWORD rahasia.';
        $output = $this->service->sanitizeResponseText($input);

        $this->assertStringNotContainsString('.env', $output);
        $this->assertStringNotContainsString('APP_KEY', $output);
        $this->assertStringNotContainsString('DB_PASSWORD', $output);
        $this->assertStringContainsString('[DILINDUNGI]', $output);
    }

    public function test_sanitize_response_text_removes_internal_variables_and_disguises_keys(): void
    {
        $input = 'Nilai $spent adalah Rp 10.000 dengan rkas_id: 99 dan cek bku_id untuk transaksi.';
        $output = $this->service->sanitizeResponseText($input);

        $this->assertStringNotContainsString('$spent', $output);
        $this->assertStringNotContainsString('rkas_id: 99', $output);
        $this->assertStringContainsString('ID Transaksi BKU', $output);
    }
}
