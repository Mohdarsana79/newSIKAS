<?php

namespace Tests\Feature;

use App\Config\PermissionCatalog;
use App\Models\ActivityLog;
use App\Models\Role;
use App\Models\User;
use App\Services\ActivityLogger;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ActivityLogTest extends TestCase
{
    use RefreshDatabase;

    public function test_http_mutations_are_automatically_logged_with_sanitized_payload(): void
    {
        $bendahara = User::factory()->create([
            'name' => 'Bendahara Utama',
            'username' => 'bendahara1',
            'role' => 'bendahara',
        ]);

        $response = $this
            ->actingAs($bendahara)
            ->post('/user-management', [
                'name' => 'Operator Baru',
                'username' => 'operator1',
                'email' => 'operator1@sekolah.sch.id',
                'password' => 'rahasia123',
                'role' => 'kepala_sekolah',
            ]);

        $response->assertRedirect();

        $log = ActivityLog::query()
            ->where('route_name', 'user-management.store')
            ->latest('id')
            ->first();

        $this->assertNotNull($log);
        $this->assertSame($bendahara->id, $log->user_id);
        $this->assertSame('user_management', $log->module);
        $this->assertNull($log->variant);
        $this->assertSame('create', $log->action);
        $this->assertSame('info', $log->severity);
        $this->assertSame('Menambahkan akun pengguna baru', $log->description);
        $this->assertSame('[DISENSOR]', $log->metadata['payload']['password'] ?? null);
        $this->assertSame('Operator Baru', $log->metadata['payload']['name'] ?? null);
    }

    public function test_activity_logger_sanitizes_all_sensitive_fields(): void
    {
        $logger = app(ActivityLogger::class);

        $sanitized = $logger->sanitizePayload([
            'name' => 'SDN 1 Contoh',
            'password' => 's3cr3t',
            'current_password' => 'oldpass',
            'security_code' => '123456',
            'deepseek_api_key' => 'sk-123456789',
            'npsn' => '10101010',
            '_token' => 'csrf-abc',
            'nested' => [
                'otp_code' => '998877',
                'safe_note' => 'Catatan biasa',
            ],
        ]);

        $this->assertSame('SDN 1 Contoh', $sanitized['name']);
        $this->assertSame('[DISENSOR]', $sanitized['password']);
        $this->assertSame('[DISENSOR]', $sanitized['current_password']);
        $this->assertSame('[DISENSOR]', $sanitized['security_code']);
        $this->assertSame('[DISENSOR]', $sanitized['deepseek_api_key']);
        $this->assertSame('[DISENSOR]', $sanitized['npsn']);
        $this->assertSame('[DISENSOR]', $sanitized['_token']);
        $this->assertSame('[DISENSOR]', $sanitized['nested']['otp_code']);
        $this->assertSame('Catatan biasa', $sanitized['nested']['safe_note']);
    }

    public function test_auth_events_log_accurately_including_2fa_without_false_logs(): void
    {
        $user = User::factory()->create([
            'name' => 'Admin 2FA',
            'username' => 'admin2fa',
            'password' => Hash::make('password123'),
            'role' => 'bendahara',
            'is_security_code_enabled' => true,
            'security_code' => '654321',
        ]);

        // 0. Gagal login: username tidak terdaftar
        $this->post('/login', [
            'username' => 'user_tidak_ada',
            'password' => 'apapun',
        ])->assertSessionHasErrors('username');

        $unknownUserLog = ActivityLog::query()->latest('id')->first();
        $this->assertNotNull($unknownUserLog);
        $this->assertNull($unknownUserLog->user_id);
        $this->assertSame('login_failed', $unknownUserLog->action);
        $this->assertSame('warning', $unknownUserLog->severity);
        $this->assertSame('username_not_found', $unknownUserLog->metadata['reason'] ?? null);

        // 1. Gagal login: password salah
        $this->post('/login', [
            'username' => 'admin2fa',
            'password' => 'salah-banget',
        ])->assertSessionHasErrors('password');

        $failedPassLog = ActivityLog::query()->latest('id')->first();
        $this->assertNotNull($failedPassLog);
        $this->assertSame('login_failed', $failedPassLog->action);
        $this->assertSame('warning', $failedPassLog->severity);
        $this->assertSame('invalid_password', $failedPassLog->metadata['reason'] ?? null);

        $countBeforeChallenge = ActivityLog::query()->count();

        // 2. Langkah challenge 2FA (tanpa security_code) TIDAK boleh menciptakan log palsu
        $this->post('/login', [
            'username' => 'admin2fa',
            'password' => 'password123',
        ])->assertSessionHasErrors('two_factor_required');

        $this->assertSame($countBeforeChallenge, ActivityLog::query()->count());

        // 3. Gagal kode keamanan 2FA
        $this->post('/login', [
            'username' => 'admin2fa',
            'password' => 'password123',
            'security_code' => '000000',
        ])->assertSessionHasErrors('security_code');

        $failed2faLog = ActivityLog::query()->latest('id')->first();
        $this->assertNotNull($failed2faLog);
        $this->assertSame('login_failed', $failed2faLog->action);
        $this->assertSame('invalid_security_code', $failed2faLog->metadata['reason'] ?? null);

        // 4. Login sukses dengan kode keamanan valid
        $this->post('/login', [
            'username' => 'admin2fa',
            'password' => 'password123',
            'security_code' => '654321',
        ])->assertRedirect(route('dashboard', absolute: false));

        $loginLog = ActivityLog::query()->latest('id')->first();
        $this->assertNotNull($loginLog);
        $this->assertSame('login', $loginLog->action);
        $this->assertSame('info', $loginLog->severity);
        $this->assertTrue($loginLog->metadata['two_factor_used'] ?? false);

        // 5. Logout tercatat bersih
        $this->post('/logout')->assertRedirect('/');

        $logoutLog = ActivityLog::query()->latest('id')->first();
        $this->assertNotNull($logoutLog);
        $this->assertSame('logout', $logoutLog->action);
        $this->assertSame($user->id, $logoutLog->user_id);
    }

    public function test_rbac_allows_kepala_sekolah_read_and_export_but_blocks_and_logs_prune(): void
    {
        $this->withoutVite();

        $kepsek = User::factory()->create([
            'name' => 'Kepala Sekolah',
            'username' => 'kepsek1',
            'role' => 'kepala_sekolah',
        ]);

        // Kepala Sekolah boleh membuka halaman & mengekspor CSV secara default
        $this->actingAs($kepsek)
            ->get(route('activity-logs.index'))
            ->assertOk();

        $this->actingAs($kepsek)
            ->get(route('activity-logs.export'))
            ->assertOk();

        // Kepala Sekolah TIDAK boleh menjalankan prune (403) dan percobaan tersebut tercatat
        $this->actingAs($kepsek)
            ->post(route('activity-logs.prune'), ['retention_days' => 90])
            ->assertForbidden();

        $deniedLog = ActivityLog::query()
            ->where('action', 'access_denied')
            ->latest('id')
            ->first();

        $this->assertNotNull($deniedLog);
        $this->assertSame($kepsek->id, $deniedLog->user_id);
        $this->assertSame('warning', $deniedLog->severity);
        $this->assertSame(403, $deniedLog->status_code);
        $this->assertSame('activity_logs', $deniedLog->module);
    }

    public function test_custom_role_without_activity_logs_permission_is_forbidden(): void
    {
        Role::create([
            'slug' => 'tamu_khusus',
            'name' => 'Tamu Khusus',
            'is_system' => false,
            'permissions' => PermissionCatalog::defaultPermissionsForRole('tamu_khusus'),
        ]);

        $customUser = User::factory()->create([
            'name' => 'Pengguna Custom',
            'username' => 'custom1',
            'role' => 'tamu_khusus',
        ]);

        $this->actingAs($customUser)
            ->get(route('activity-logs.index'))
            ->assertForbidden();

        $this->assertDatabaseHas('activity_logs', [
            'user_id' => $customUser->id,
            'action' => 'access_denied',
            'status_code' => 403,
        ]);
    }

    public function test_csv_export_includes_utf8_bom_and_respects_active_filters(): void
    {
        $bendahara = User::factory()->create([
            'name' => 'Bendahara Ekspor',
            'username' => 'bendahara_csv',
            'role' => 'bendahara',
        ]);

        ActivityLog::create([
            'user_id' => $bendahara->id,
            'actor_name' => $bendahara->name,
            'actor_username' => $bendahara->username,
            'actor_role' => 'bendahara',
            'module' => 'penganggaran',
            'variant' => 'kinerja',
            'action' => 'approve',
            'severity' => ActivityLog::SEVERITY_INFO,
            'description' => 'Mengesahkan RKAS Kinerja Target Filter',
            'created_at' => now(),
        ]);

        ActivityLog::create([
            'user_id' => $bendahara->id,
            'actor_name' => $bendahara->name,
            'actor_username' => $bendahara->username,
            'actor_role' => 'bendahara',
            'module' => 'backup',
            'variant' => null,
            'action' => 'backup',
            'severity' => ActivityLog::SEVERITY_INFO,
            'description' => 'Backup Rutin Tidak Masuk Filter',
            'created_at' => now(),
        ]);

        $response = $this->actingAs($bendahara)
            ->get(route('activity-logs.export', [
                'module' => 'penganggaran',
                'variant' => 'kinerja',
            ]));

        $response->assertOk();
        $content = $response->streamedContent();

        $this->assertStringStartsWith("\xEF\xBB\xBF", $content);
        $this->assertStringContainsString('Mengesahkan RKAS Kinerja Target Filter', $content);
        $this->assertStringNotContainsString('Backup Rutin Tidak Masuk Filter', $content);
    }

    public function test_bendahara_can_prune_old_logs_and_prune_action_is_recorded_as_critical(): void
    {
        $bendahara = User::factory()->create([
            'name' => 'Bendahara Retensi',
            'username' => 'bendahara_prune',
            'role' => 'bendahara',
        ]);

        $oldLog = ActivityLog::create([
            'user_id' => $bendahara->id,
            'actor_name' => $bendahara->name,
            'actor_role' => 'bendahara',
            'module' => 'penatausahaan',
            'variant' => 'reguler',
            'action' => 'create',
            'severity' => ActivityLog::SEVERITY_INFO,
            'description' => 'Log lama 120 hari lalu',
            'created_at' => now()->subDays(120),
        ]);

        $recentLog = ActivityLog::create([
            'user_id' => $bendahara->id,
            'actor_name' => $bendahara->name,
            'actor_role' => 'bendahara',
            'module' => 'penatausahaan',
            'variant' => 'reguler',
            'action' => 'create',
            'severity' => ActivityLog::SEVERITY_INFO,
            'description' => 'Log baru 10 hari lalu',
            'created_at' => now()->subDays(10),
        ]);

        $this->actingAs($bendahara)
            ->post(route('activity-logs.prune'), ['retention_days' => 90])
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertDatabaseMissing('activity_logs', ['id' => $oldLog->id]);
        $this->assertDatabaseHas('activity_logs', ['id' => $recentLog->id]);

        $pruneLog = ActivityLog::query()
            ->where('action', 'prune')
            ->latest('id')
            ->first();

        $this->assertNotNull($pruneLog);
        $this->assertSame('critical', $pruneLog->severity);
        $this->assertSame(1, $pruneLog->metadata['deleted_count'] ?? null);
        $this->assertSame(90, $pruneLog->metadata['retention_days'] ?? null);
    }

    public function test_variant_mutation_records_variant_and_strips_internal_variant_key_while_skipping_422(): void
    {
        $this->withoutVite();

        $bendahara = User::factory()->create([
            'name' => 'Bendahara Varian',
            'username' => 'bendahara_var',
            'role' => 'bendahara',
        ]);

        // Bendahara bisa membuka halaman index (200)
        $this->actingAs($bendahara)
            ->get(route('activity-logs.index'))
            ->assertOk();

        // 422 validation error pada mutasi TIDAK boleh dicatat ke audit trail
        $countBefore422 = ActivityLog::query()->count();
        $this->actingAs($bendahara)
            ->postJson('/kinerja/penganggaran', [])
            ->assertStatus(422);
        $this->assertSame($countBefore422, ActivityLog::query()->count());

        // Mutasi valid pada varian kinerja tercatat dengan variant = 'kinerja' dan tanpa '_variant' di payload
        $this->actingAs($bendahara)
            ->post('/kinerja/penganggaran', [
                'pagu_anggaran' => 50000000,
                'tahun_anggaran' => 2026,
                'kepala_sekolah' => 'Drs. Kepala Sekolah',
                'nip_kepala_sekolah' => '197001012000011001',
                'sk_kepala_sekolah' => 'SK-01/2026',
                'bendahara' => 'Bendahara Sekolah',
                'nip_bendahara' => '198001012005012001',
                'sk_bendahara' => 'SK-02/2026',
                'komite' => 'Ketua Komite',
            ]);

        $variantLog = ActivityLog::query()
            ->where('route_name', 'kinerja-penganggaran.store')
            ->latest('id')
            ->first();

        $this->assertNotNull($variantLog);
        $this->assertSame('penganggaran', $variantLog->module);
        $this->assertSame('kinerja', $variantLog->variant);
        $this->assertSame('create', $variantLog->action);
        $this->assertArrayNotHasKey('_variant', $variantLog->metadata['payload'] ?? []);
    }

    public function test_otp_password_reset_is_logged_as_critical(): void
    {
        $user = User::factory()->create([
            'name' => 'User Reset OTP',
            'username' => 'user_otp',
            'email' => 'otp@sekolah.sch.id',
            'role' => 'bendahara',
        ]);

        DB::table('password_reset_tokens')->insert([
            'email' => $user->email,
            'token' => '123456',
            'created_at' => now(),
        ]);

        $this->postJson(route('password.otp.reset'), [
            'email' => $user->email,
            'otp' => '123456',
            'password' => 'PasswordBaru123!',
            'password_confirmation' => 'PasswordBaru123!',
        ])->assertOk();

        $resetLog = ActivityLog::query()
            ->where('action', 'password_reset')
            ->latest('id')
            ->first();

        $this->assertNotNull($resetLog);
        $this->assertSame($user->id, $resetLog->user_id);
        $this->assertSame('critical', $resetLog->severity);
        $this->assertSame('auth', $resetLog->module);
    }

    public function test_csv_export_escapes_formula_injection_and_scope_filter_handles_wildcards_and_dates(): void
    {
        $bendahara = User::factory()->create([
            'name' => 'Bendahara Filter',
            'username' => 'bendahara_flt',
            'role' => 'bendahara',
        ]);

        ActivityLog::create([
            'user_id' => $bendahara->id,
            'actor_name' => ' =HYPERLINK("http://evil.test")',
            'actor_username' => 'bendahara_flt',
            'actor_role' => 'bendahara',
            'module' => 'activity_logs',
            'variant' => null,
            'action' => 'action',
            'severity' => ActivityLog::SEVERITY_INFO,
            'description' => 'Target kata_kunci_persis pada sistem',
            'created_at' => now()->subDays(2),
        ]);

        ActivityLog::create([
            'user_id' => $bendahara->id,
            'actor_name' => 'Aktor Lain',
            'actor_username' => 'lain',
            'actor_role' => 'bendahara',
            'module' => 'activity_logs',
            'variant' => 'reguler',
            'action' => 'action',
            'severity' => ActivityLog::SEVERITY_INFO,
            'description' => 'Target kataXkunciXpersis tidak cocok underscore',
            'created_at' => now()->subDays(10),
        ]);

        // Filter underscore literal + variant=global + date_from/date_to
        $filtered = ActivityLog::query()->filter([
            'search' => 'kata_kunci_persis',
            'variant' => 'global',
            'date_from' => now()->subDays(3)->toDateString(),
            'date_to' => now()->toDateString(),
        ])->get();

        $this->assertCount(1, $filtered);
        $this->assertSame('Target kata_kunci_persis pada sistem', $filtered->first()->description);

        // Ekspor CSV melindungi sel formula injection dan menyertakan header keamanan
        $response = $this->actingAs($bendahara)
            ->get(route('activity-logs.export', ['variant' => 'global']));

        $response->assertOk();
        $this->assertSame('nosniff', $response->headers->get('X-Content-Type-Options'));
        $content = $response->streamedContent();
        $this->assertStringContainsString("'\x20=HYPERLINK", $content);
    }
}
