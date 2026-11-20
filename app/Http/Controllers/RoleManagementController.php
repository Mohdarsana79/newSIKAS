<?php

namespace App\Http\Controllers;

use App\Config\PermissionCatalog;
use App\Models\Role;
use App\Services\PermissionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class RoleManagementController extends Controller
{
    /**
     * Buat role custom baru beserta matriks hak akses fiturnya.
     */
    public function store(Request $request, PermissionService $permissionService): RedirectResponse
    {
        $permissionService->ensureDefaultRolesExist();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'slug' => ['nullable', 'string', 'max:60', 'regex:/^[a-z0-9_]+$/', 'unique:roles,slug'],
            'description' => ['nullable', 'string', 'max:500'],
            'permissions' => ['nullable', 'array'],
        ], [
            'slug.regex' => 'Kode role (slug) hanya boleh berisi huruf kecil, angka, dan garis bawah (_).',
            'slug.unique' => 'Kode role tersebut sudah digunakan.',
        ]);

        $slug = trim((string) ($validated['slug'] ?? ''));
        if ($slug === '') {
            $base = Str::snake(Str::ascii($validated['name']));
            $base = preg_replace('/[^a-z0-9_]+/', '_', strtolower($base)) ?: 'role_custom';
            $base = trim($base, '_') ?: 'role_custom';
            $slug = $base;
            $counter = 2;
            while (Role::where('slug', $slug)->exists()) {
                $slug = "{$base}_{$counter}";
                $counter++;
            }
        }

        $rawPermissions = is_array($validated['permissions'] ?? null)
            ? $validated['permissions']
            : PermissionCatalog::defaultPermissionsForRole($slug);

        Role::create([
            'slug' => $slug,
            'name' => trim($validated['name']),
            'description' => $validated['description'] ?? null,
            'is_system' => false,
            'permissions' => PermissionCatalog::normalizePermissions($rawPermissions),
        ]);

        $permissionService->clearCache();

        return redirect()->back()->with('success', 'Role baru berhasil dibuat.');
    }

    /**
     * Perbarui nama, deskripsi, dan hak akses fitur suatu role.
     */
    public function update(Request $request, Role $role, PermissionService $permissionService): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:500'],
            'permissions' => ['required', 'array'],
        ]);

        $normalized = PermissionCatalog::normalizePermissions(
            $validated['permissions'],
            $role->slug === 'bendahara'
        );

        $role->update([
            'name' => trim($validated['name']),
            'description' => $validated['description'] ?? null,
            'permissions' => $normalized,
        ]);

        $permissionService->clearCache();

        return redirect()->back()->with('success', "Pengaturan role \"{$role->name}\" berhasil diperbarui.");
    }

    /**
     * Hapus role custom (role sistem & role yang masih dipakai akun tidak dapat dihapus).
     */
    public function destroy(Role $role, PermissionService $permissionService): RedirectResponse
    {
        if ($role->is_system || in_array($role->slug, ['bendahara', 'kepala_sekolah'], true)) {
            return redirect()->back()->with('error', 'Role bawaan sistem tidak dapat dihapus.');
        }

        if ($role->users()->exists()) {
            return redirect()->back()->with('error', 'Role masih digunakan oleh pengguna. Pindahkan pengguna ke role lain terlebih dahulu.');
        }

        $role->delete();
        $permissionService->clearCache();

        return redirect()->back()->with('success', 'Role berhasil dihapus.');
    }
}
