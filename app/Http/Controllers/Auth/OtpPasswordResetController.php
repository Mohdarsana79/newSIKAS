<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Mail\OtpMail;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Illuminate\Support\Facades\Log;

class OtpPasswordResetController extends Controller
{
    public function showForgotPassword()
    {
        return Inertia::render('Auth/ForgotPassword');
    }

    public function sendOtp(Request $request)
    {
        Log::info('sendOtp called for email: ' . $request->email);
        $request->validate([
            'email' => 'required|email|exists:users,email',
        ], [
            'email.exists' => 'Email tidak terdaftar di sistem kami.',
        ]);

        $otp = rand(100000, 999999);

        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $request->email],
            [
                'token' => $otp,
                'created_at' => now(),
            ]
        );

        try {
            Mail::to($request->email)->send(new OtpMail($otp));
            return response()->json(['message' => 'Kode OTP telah dikirim ke email Anda.']);
        } catch (\Exception $e) {
            report($e);
            return response()->json([
                'message' => 'Gagal mengirim OTP. Pastikan koneksi internet stabil dan port SMTP tidak diblokir.'
            ], 422);
        }
    }

    public function verifyOtp(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'otp' => 'required|numeric',
        ]);

        $record = DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->where('token', $request->otp)
            ->first();

        if (!$record) {
            return response()->json(['message' => 'Kode OTP salah.'], 422);
        }

        // Check expiry (15 minutes)
        if (now()->diffInMinutes($record->created_at) > 15) {
            return response()->json(['message' => 'Kode OTP telah kedaluwarsa.'], 422);
        }

        return response()->json(['message' => 'Kode OTP berhasil diverifikasi.']);
    }

    public function resetPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'otp' => 'required|numeric',
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        // Double check OTP
        $record = DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->where('token', $request->otp)
            ->first();

        if (!$record || now()->diffInMinutes($record->created_at) > 15) {
            return response()->json(['message' => 'Sesi tidak valid atau telah kedaluwarsa.'], 422);
        }

        $user = User::where('email', $request->email)->first();
        $user->password = Hash::make($request->password);
        $user->save();

        // Delete token
        DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        return response()->json(['message' => 'Password berhasil diubah. Silakan login kembali.']);
    }
}
