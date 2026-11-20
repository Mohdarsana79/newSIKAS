<?php

namespace App\Http\Controllers;

use App\Config\PermissionCatalog;
use App\Models\User;
use App\Services\PermissionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class UserManagementController extends Controller
{
    /**
     * Halaman utama Management & Role (Pengguna, Role Custom, dan Matriks Hak Akses).
     */
    public function page(PermissionService $permissionService): InertiaResponse
    {
        $permissionService->ensureDefaultRolesExist();

        return Inertia::render('ManagementRole/Index', [
            'users' => $this->formatUsers($permissionService),
            'roles' => $this->formatRoles($permissionService),
            'permissionCatalog' => [
                'modules' => PermissionCatalog::modules(),
                'abilities' => PermissionCatalog::abilities(),
            ],
        ]);
    }

    /**
     * Get list of users (JSON) for backward-compatible consumers.
     */
    public function index(PermissionService $permissionService): JsonResponse
    {
        $permissionService->ensureDefaultRolesExist();

        return response()->json([
            'users' => $this->formatUsers($permissionService),
        ]);
    }

    /**
     * Store a newly created user account.
     */
    public function store(Request $request, PermissionService $permissionService): RedirectResponse
    {
        $permissionService->ensureDefaultRolesExist();

        // Sanitasi username jika berupa NIP dengan spasi (misal: 19800101 200501 1 001)
        $rawUsername = trim((string) $request->input('username', ''));
        if (preg_match('/^[0-9\s]+$/', $rawUsername)) {
            $rawUsername = preg_replace('/\s+/', '', $rawUsername);
        }
        $request->merge(['username' => $rawUsername]);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'username' => ['required', 'string', 'max:255', 'regex:/^[a-zA-Z0-9_\-\.@]+$/', 'unique:users,username'],
            'email' => 'nullable|string|email|max:255|unique:users,email',
            'password' => ['required', 'string', Password::min(6)],
            'role' => ['required', 'string', Rule::exists('roles', 'slug')],
        ], [
            'username.regex' => 'Username hanya boleh memuat huruf, angka, titik, minus, underscore, atau simbol @.',
        ]);

        if (! empty($validated['email'])) {
            $email = $validated['email'];
        } elseif (filter_var($validated['username'], FILTER_VALIDATE_EMAIL)) {
            $email = $validated['username'];
        } else {
            $email = $validated['username'].'@sikas.local';
        }

        User::create([
            'name' => $validated['name'],
            'username' => $validated['username'],
            'email' => $email,
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
        ]);

        return redirect()->back()->with('success', 'Akun pengguna berhasil ditambahkan.');
    }

    /**
     * Update user details, role, or reset password.
     */
    public function update(Request $request, $id, PermissionService $permissionService): RedirectResponse
    {
        $permissionService->ensureDefaultRolesExist();
        $user = User::findOrFail($id);

        // Sanitasi username jika berupa NIP dengan spasi
        $rawUsername = trim((string) $request->input('username', ''));
        if (preg_match('/^[0-9\s]+$/', $rawUsername)) {
            $rawUsername = preg_replace('/\s+/', '', $rawUsername);
        }
        $request->merge(['username' => $rawUsername]);

        $rules = [
            'name' => 'required|string|max:255',
            'username' => ['required', 'string', 'max:255', 'regex:/^[a-zA-Z0-9_\-\.@]+$/', 'unique:users,username,'.$user->id],
            'email' => 'nullable|string|email|max:255|unique:users,email,'.$user->id,
            'role' => ['required', 'string', Rule::exists('roles', 'slug')],
        ];

        if ($request->filled('password')) {
            $rules['password'] = ['required', 'string', Password::min(6)];
        }

        $validated = $request->validate($rules, [
            'username.regex' => 'Username hanya boleh memuat huruf, angka, titik, minus, underscore, atau simbol @.',
        ]);

        if ($user->id === $request->user()?->id && $validated['role'] !== $user->role) {
            return redirect()->back()->with('error', 'Anda tidak dapat mengganti role akun Anda sendiri.');
        }

        $user->name = $validated['name'];
        $user->username = $validated['username'];
        if (! empty($validated['email'])) {
            $user->email = $validated['email'];
        } elseif (filter_var($validated['username'], FILTER_VALIDATE_EMAIL)) {
            $user->email = $validated['username'];
        }
        $user->role = $validated['role'];

        if ($request->filled('password')) {
            $user->password = Hash::make($validated['password']);
        }

        $user->save();

        return redirect()->back()->with('success', 'Data akun berhasil diperbarui.');
    }

    /**
     * Atur atau reset izin khusus (per-user override) di atas role bawaan pengguna.
     */
    public function updatePermissions(Request $request, $id): RedirectResponse
    {
        $user = User::findOrFail($id);

        if ($request->boolean('reset_to_role')) {
            $user->custom_permissions = null;
            $user->save();

            return redirect()->back()->with('success', "Hak akses {$user->name} dikembalikan mengikuti aturan role.");
        }

        $validated = $request->validate([
            'permissions' => ['required', 'array'],
        ]);

        $protectSelfAdmin = ($user->id === $request->user()?->id) || ($user->role === 'bendahara');
        $normalized = PermissionCatalog::normalizePermissions($validated['permissions'], $protectSelfAdmin);

        $user->custom_permissions = $normalized;
        $user->save();

        return redirect()->back()->with('success', "Hak akses khusus untuk {$user->name} berhasil disimpan.");
    }

    /**
     * Delete user account.
     */
    public function destroy(Request $request, $id): RedirectResponse
    {
        $user = User::findOrFail($id);

        if ($user->id === $request->user()->id) {
            return redirect()->back()->with('error', 'Anda tidak dapat menghapus akun Anda sendiri.');
        }

        $user->delete();

        return redirect()->back()->with('success', 'Akun berhasil dihapus.');
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function formatUsers(PermissionService $permissionService): array
    {
        return User::select('id', 'name', 'username', 'email', 'role', 'custom_permissions', 'created_at')
            ->orderBy('id', 'asc')
            ->get()
            ->map(function (User $user) use ($permissionService): array {
                $resolved = $permissionService->resolveForUser($user);

                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'username' => $user->username,
                    'email' => $user->email,
                    'role' => $user->role ?: 'bendahara',
                    'role_name' => $resolved['role_name'],
                    'has_custom_override' => $resolved['has_custom_override'],
                    'custom_permissions' => $user->custom_permissions,
                    'effective_permissions' => [
                        'modules' => $resolved['modules'],
                        'abilities' => $resolved['abilities'],
                    ],
                    'created_at' => $user->created_at?->toISOString(),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function formatRoles(PermissionService $permissionService): array
    {
        return $permissionService->getAllRoles()
            ->loadCount('users')
            ->map(function ($role): array {
                $normalized = PermissionCatalog::normalizePermissions(
                    is_array($role->permissions) ? $role->permissions : [],
                    $role->slug === 'bendahara'
                );

                return [
                    'id' => $role->id,
                    'slug' => $role->slug,
                    'name' => $role->name,
                    'description' => $role->description,
                    'is_system' => (bool) $role->is_system,
                    'users_count' => (int) $role->users_count,
                    'permissions' => $normalized,
                ];
            })
            ->values()
            ->all();
    }
}
