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
        $user = $request->user();

        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $user instanceof MustVerifyEmail,
            'status' => session('status'),
            'hasDeepSeekKey' => $user->hasDeepSeekKey(),
            'deepseekModelReasoner' => $user->deepseek_model_reasoner ?: 'deepseek-reasoner',
            'deepseekModelChat' => $user->deepseek_model_chat ?: 'deepseek-chat',
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

    /**
     * Memperbarui pengaturan DeepSeek API Key dan preferensi model.
     */
    public function updateDeepSeekSettings(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'deepseek_api_key' => 'nullable|string',
            'deepseek_model_reasoner' => 'required|string|max:50',
            'deepseek_model_chat' => 'required|string|max:50',
        ]);

        $user = $request->user();

        if ($request->has('deepseek_api_key') && $request->filled('deepseek_api_key')) {
            $user->deepseek_api_key = trim($validated['deepseek_api_key']);
        } elseif ($request->has('clear_api_key') && $request->boolean('clear_api_key')) {
            $user->deepseek_api_key = null;
        }

        $user->deepseek_model_reasoner = $validated['deepseek_model_reasoner'];
        $user->deepseek_model_chat = $validated['deepseek_model_chat'];
        $user->save();

        return Redirect::back()->with('status', 'deepseek-settings-updated');
    }

    /**
     * Menguji validitas koneksi ke DeepSeek API.
     */
    public function testDeepSeekConnection(Request $request, \App\Services\Ai\DeepSeekService $deepSeekService)
    {
        $apiKey = $request->input('deepseek_api_key');
        if (empty($apiKey)) {
            $apiKey = $request->user()->deepseek_api_key;
        }

        $result = $deepSeekService->testConnection($apiKey ?? '');
        return response()->json($result);
    }
}
