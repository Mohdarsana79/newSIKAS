<?php

namespace Tests\Feature;

use App\Config\PermissionCatalog;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ManagementRoleTest extends TestCase
{
    use RefreshDatabase;

    protected User $bendahara;

    protected User $kepsek;

    protected function setUp(): void
    {
        parent::setUp();

        $this->bendahara = User::factory()->create([
            'username' => 'bendahara_admin',
            'role' => 'bendahara',
        ]);

        $this->kepsek = User::factory()->create([
            'username' => 'kepsek_test',
            'role' => 'kepala_sekolah',
        ]);
    }

    public function test_bendahara_can_access_management_role_page_and_kepala_sekolah_is_blocked(): void
    {
        $this->actingAs($this->kepsek)
            ->get('/management-role')
            ->assertForbidden();

        $this->actingAs($this->bendahara)
            ->get('/management-role')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('ManagementRole/Index')
                ->has('users', 2)
                ->has('roles', 2)
                ->has('permissionCatalog.modules')
                ->has('permissionCatalog.abilities')
            );
    }

    public function test_bendahara_can_create_custom_role_and_enforce_module_permissions(): void
    {
        $createRoleResponse = $this->actingAs($this->bendahara)
            ->from('/management-role')
            ->post('/management-role/roles', [
                'name' => 'Operator Tata Usaha',
                'slug' => 'operator_tu',
                'description' => 'Mengelola SK & Surat serta melihat dashboard.',
                'permissions' => [
                    'modules' => [
                        'dashboard' => PermissionCatalog::LEVEL_READ,
                        'sk_surat' => PermissionCatalog::LEVEL_WRITE,
                        'penatausahaan' => PermissionCatalog::LEVEL_NONE,
                    ],
                    'abilities' => [
                        'rkas_review' => false,
                        'rkas_approve' => false,
                    ],
                ],
            ]);

        $createRoleResponse->assertRedirect('/management-role');
        $this->assertDatabaseHas('roles', [
            'slug' => 'operator_tu',
            'name' => 'Operator Tata Usaha',
            'is_system' => false,
        ]);

        // Daftarkan pengguna dengan role custom baru
        $this->actingAs($this->bendahara)
            ->from('/management-role')
            ->post('/user-management', [
                'name' => 'Staf Tata Usaha',
                'username' => 'staf_tu',
                'email' => 'tu@sekolah.sch.id',
                'password' => 'Password123!',
                'role' => 'operator_tu',
            ])
            ->assertRedirect('/management-role');

        $operatorUser = User::where('username', 'staf_tu')->firstOrFail();

        // Diizinkan melihat SK & Surat dan membuat folder SK & Surat
        $this->actingAs($operatorUser)->get('/sk-surat')->assertOk();
        $this->actingAs($operatorUser)->post('/sk-surat/folder', [
            'nama_folder' => 'SK Tugas 2026',
            'warna' => 'indigo',
        ])->assertRedirect();

        // Ditolak membuka Penatausahaan (LEVEL_NONE) dan Management & Role (LEVEL_NONE)
        $this->actingAs($operatorUser)->get('/penatausahaan')->assertForbidden();
        $this->actingAs($operatorUser)->get('/management-role')->assertForbidden();

        // Shared auth.permissions menampilkan level yang sesuai ke frontend Sidebar
        $this->actingAs($operatorUser)
            ->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('auth.permissions.modules.dashboard', 'read')
                ->where('auth.permissions.modules.sk_surat', 'write')
                ->where('auth.permissions.modules.penatausahaan', 'none')
                ->where('auth.user.role_name', 'Operator Tata Usaha')
            );
    }

    public function test_bendahara_can_set_and_reset_per_user_custom_permissions_and_protect_system_roles(): void
    {
        $role = Role::create([
            'slug' => 'staf_keuangan',
            'name' => 'Staf Keuangan',
            'description' => 'Akses baca STS saja',
            'is_system' => false,
            'permissions' => [
                'modules' => [
                    'dashboard' => PermissionCatalog::LEVEL_READ,
                    'sts' => PermissionCatalog::LEVEL_READ,
                ],
                'abilities' => [
                    'rkas_review' => false,
                    'rkas_approve' => false,
                ],
            ],
        ]);

        $staf = User::factory()->create([
            'username' => 'staf_keu',
            'role' => $role->slug,
        ]);

        // Awalnya hanya read di STS, sehingga mutasi STS ditolak 403
        $this->actingAs($staf)->delete('/sts/999')->assertForbidden();

        // Role yang masih dipakai user tidak bisa dihapus
        $this->actingAs($this->bendahara)
            ->from('/management-role')
            ->delete("/management-role/roles/{$role->id}")
            ->assertRedirect('/management-role')
            ->assertSessionHas('error');
        $this->assertDatabaseHas('roles', ['id' => $role->id]);

        // Role sistem bendahara tidak bisa dihapus & izin user_management tetap terkunci write
        $bendaharaRole = Role::where('slug', 'bendahara')->firstOrFail();
        $this->actingAs($this->bendahara)
            ->delete("/management-role/roles/{$bendaharaRole->id}");
        $this->assertDatabaseHas('roles', ['id' => $bendaharaRole->id]);

        $this->actingAs($this->bendahara)
            ->put("/management-role/roles/{$bendaharaRole->id}", [
                'name' => 'Bendahara / Admin',
                'permissions' => [
                    'modules' => [
                        'user_management' => PermissionCatalog::LEVEL_NONE,
                    ],
                ],
            ]);
        $this->assertTrue($this->bendahara->fresh()->canAccessModule('user_management', PermissionCatalog::LEVEL_WRITE));

        // Override khusus untuk staf agar boleh write pada sts & read pada backup
        $this->actingAs($this->bendahara)
            ->put("/user-management/{$staf->id}/permissions", [
                'permissions' => [
                    'modules' => [
                        'dashboard' => PermissionCatalog::LEVEL_READ,
                        'sts' => PermissionCatalog::LEVEL_WRITE,
                        'backup' => PermissionCatalog::LEVEL_READ,
                    ],
                ],
            ]);

        $staf->refresh();
        $this->assertTrue($staf->canAccessModule('sts', PermissionCatalog::LEVEL_WRITE));
        $this->actingAs($staf)->get('/backup')->assertOk();

        // Reset kembali mengikuti default role
        $this->actingAs($this->bendahara)
            ->put("/user-management/{$staf->id}/permissions", [
                'reset_to_role' => true,
            ]);

        $staf->refresh();
        $this->assertNull($staf->custom_permissions);
        $this->assertFalse($staf->canAccessModule('sts', PermissionCatalog::LEVEL_WRITE));
        $this->actingAs($staf)->get('/backup')->assertForbidden();
    }
}
