<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class UserManagementController extends Controller
{
    /**
     * Get list of users (JSON) for the management tab.
     */
    public function index()
    {
        $users = User::select('id', 'name', 'username', 'email', 'role', 'created_at')
            ->orderBy('id', 'asc')
            ->get();

        return response()->json([
            'users' => $users,
        ]);
    }

    /**
     * Store a newly created Kepala Sekolah user.
     */
    public function store(Request $request): RedirectResponse
    {
        // Sanitasi username jika berupa NIP dengan spasi (misal: 19800101 200501 1 001)
        $rawUsername = trim($request->input('username', ''));
        if (preg_match('/^[0-9\s]+$/', $rawUsername)) {
            $rawUsername = preg_replace('/\s+/', '', $rawUsername);
        }
        $request->merge(['username' => $rawUsername]);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'username' => ['required', 'string', 'max:255', 'regex:/^[a-zA-Z0-9_\-\.@]+$/', 'unique:users,username'],
            'email' => 'nullable|string|email|max:255|unique:users,email',
            'password' => ['required', 'string', Password::min(6)],
            'role' => 'required|string|in:kepala_sekolah,bendahara',
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
     * Update user details or reset password.
     */
    public function update(Request $request, $id): RedirectResponse
    {
        $user = User::findOrFail($id);

        // Sanitasi username jika berupa NIP dengan spasi
        $rawUsername = trim($request->input('username', ''));
        if (preg_match('/^[0-9\s]+$/', $rawUsername)) {
            $rawUsername = preg_replace('/\s+/', '', $rawUsername);
        }
        $request->merge(['username' => $rawUsername]);

        $rules = [
            'name' => 'required|string|max:255',
            'username' => ['required', 'string', 'max:255', 'regex:/^[a-zA-Z0-9_\-\.@]+$/', 'unique:users,username,'.$user->id],
            'email' => 'nullable|string|email|max:255|unique:users,email,'.$user->id,
            'role' => 'required|string|in:kepala_sekolah,bendahara',
        ];

        if ($request->filled('password')) {
            $rules['password'] = ['required', 'string', Password::min(6)];
        }

        $validated = $request->validate($rules, [
            'username.regex' => 'Username hanya boleh memuat huruf, angka, titik, minus, underscore, atau simbol @.',
        ]);

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
}
