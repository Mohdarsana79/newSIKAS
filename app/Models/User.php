<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'username',
        'email',
        'password',
        'security_code',
        'is_security_code_enabled',
        'deepseek_api_key',
        'deepseek_model_reasoner',
        'deepseek_model_chat',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'security_code', // Hide security code by default, explicitly show when needed
        'deepseek_api_key',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_security_code_enabled' => 'boolean',
            'deepseek_api_key' => 'encrypted',
        ];
    }

    public function hasDeepSeekKey(): bool
    {
        return ! empty($this->deepseek_api_key);
    }

    public function bkuAuditLogs()
    {
        return $this->hasMany(BkuAuditLog::class);
    }
}
