<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Display the user's profile form.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => session('status'),
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        return Redirect::route('profile.edit');
    }

    /**
     * Delete the user's account.
     */
    /**
     * DELETE functionality is disabled/replaced by Security features as per request.
     */
    // public function destroy(Request $request): RedirectResponse
    // ...

    /**
     * Toggle Security Code Feature.
     */
    public function toggleSecurity(Request $request): RedirectResponse
    {
        $user = $request->user();
        $user->is_security_code_enabled = !$user->is_security_code_enabled;
        
        // If disabling, also clear the code? Maybe not, just keep it but ignore.
        // If enabling, assume they will generate one.
        
        $user->save();

        return Redirect::back();
    }

    /**
     * Generate a new Security Code.
     */
    public function generateSecurityCode(Request $request)
    {
        $user = $request->user();
        
        // Generate 6 digit random number string
        $code = str_pad(mt_rand(0, 999999), 6, '0', STR_PAD_LEFT);
        
        $user->security_code = $code;
        $user->save();

        return response()->json([
            'code' => $code,
            'message' => 'Kode keamanan berhasil digenerate.',
        ]);
    }
}
