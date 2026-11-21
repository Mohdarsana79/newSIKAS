<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\ActivityLog;
use App\Services\ActivityLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Display the login view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => session('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        $user = Auth::user();

        if ($user->is_security_code_enabled) {
            if (! $request->filled('security_code')) {
                Auth::logout();
                // Send a generic error key that the frontend can detect to show the modal
                throw ValidationException::withMessages([
                    'two_factor_required' => true,
                ]);
            }

            if ($request->input('security_code') !== $user->security_code) {
                Auth::logout();

                app(ActivityLogger::class)->logAuthEvent(
                    $request,
                    'login_failed',
                    'Gagal login: kode keamanan 2FA salah',
                    $user,
                    ActivityLog::SEVERITY_WARNING,
                    ['reason' => 'invalid_security_code'],
                );

                throw ValidationException::withMessages([
                    'security_code' => 'Kode keamanan yang Anda masukkan salah.',
                ]);
            }
        }

        $request->session()->regenerate();
        $request->session()->flash('show_changelog', true);

        app(ActivityLogger::class)->logAuthEvent(
            $request,
            'login',
            'Masuk ke aplikasi SIKAS',
            $user,
            ActivityLog::SEVERITY_INFO,
            ['two_factor_used' => (bool) $user->is_security_code_enabled],
        );

        return redirect()->intended(route('dashboard', absolute: false));
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $user = $request->user();

        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        if ($user) {
            app(ActivityLogger::class)->logAuthEvent(
                $request,
                'logout',
                'Keluar dari aplikasi SIKAS',
                $user,
                ActivityLog::SEVERITY_INFO,
            );
        }

        return redirect('/');
    }
}
