<?php

namespace App\Http\Requests\Auth;

use App\Models\ActivityLog;
use App\Models\User;
use App\Services\ActivityLogger;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoginRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'username' => ['required', 'string'],
            'password' => ['required', 'string'],
        ];
    }

    /**
     * Attempt to authenticate the request's credentials.
     *
     * @throws ValidationException
     */
    public function authenticate(): void
    {
        $this->ensureIsNotRateLimited();

        $rawInput = trim((string) $this->username);
        $identifier = preg_match('/^[0-9\s]+$/', $rawInput)
            ? (preg_replace('/\s+/', '', $rawInput) ?? $rawInput)
            : $rawInput;

        $user = User::where('username', $identifier)
            ->orWhere('email', $identifier)
            ->first();

        if (! $user) {
            RateLimiter::hit($this->throttleKey());

            app(ActivityLogger::class)->logAuthEvent(
                $this,
                'login_failed',
                'Gagal login: username tidak terdaftar',
                null,
                ActivityLog::SEVERITY_WARNING,
                ['reason' => 'username_not_found'],
                $identifier,
            );

            throw ValidationException::withMessages([
                'username' => 'Username tidak terdaftar.',
            ]);
        }

        if (! Hash::check($this->password, $user->password)) {
            RateLimiter::hit($this->throttleKey());

            app(ActivityLogger::class)->logAuthEvent(
                $this,
                'login_failed',
                'Gagal login: kata sandi salah',
                $user,
                ActivityLog::SEVERITY_WARNING,
                ['reason' => 'invalid_password'],
                $identifier,
            );

            throw ValidationException::withMessages([
                'password' => 'Password salah.',
            ]);
        }

        Auth::login($user, $this->boolean('remember'));
        RateLimiter::clear($this->throttleKey());
    }

    /**
     * Ensure the login request is not rate limited.
     *
     * @throws ValidationException
     */
    public function ensureIsNotRateLimited(): void
    {
        if (! RateLimiter::tooManyAttempts($this->throttleKey(), 5)) {
            return;
        }

        event(new Lockout($this));

        $seconds = RateLimiter::availableIn($this->throttleKey());

        app(ActivityLogger::class)->logAuthEvent(
            $this,
            'login_failed',
            'Gagal login: terlalu banyak percobaan (rate limit lockout)',
            null,
            ActivityLog::SEVERITY_CRITICAL,
            ['reason' => 'rate_limited', 'retry_after_seconds' => $seconds],
            trim((string) $this->username),
        );

        throw ValidationException::withMessages([
            'username' => trans('auth.throttle', [
                'seconds' => $seconds,
                'minutes' => ceil($seconds / 60),
            ]),
        ]);
    }

    /**
     * Get the rate limiting throttle key for the request.
     */
    public function throttleKey(): string
    {
        return Str::transliterate(Str::lower($this->string('username')).'|'.$this->ip());
    }
}
