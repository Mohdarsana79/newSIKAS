<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Config\PermissionCatalog;
use App\Services\PermissionService;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
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
        'role',
        'custom_permissions',
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
            'custom_permissions' => 'array',
            'is_security_code_enabled' => 'boolean',
            'deepseek_api_key' => 'encrypted',
        ];
    }

    public function roleRecord(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'role', 'slug');
    }

    /**
     * @return array{role_slug: string, role_name: string, has_custom_override: bool, modules: array<string, string>, abilities: array<string, bool>}
     */
    public function effectivePermissions(): array
    {
        return app(PermissionService::class)->resolveForUser($this);
    }

    public function canAccessModule(string $module, string $level = PermissionCatalog::LEVEL_READ): bool
    {
        return app(PermissionService::class)->canAccessModule($this, $module, $level);
    }

    public function hasFeatureAbility(string $ability): bool
    {
        return app(PermissionService::class)->hasAbility($this, $ability);
    }

    public function hasDeepSeekKey(): bool
    {
        return ! empty($this->deepseek_api_key);
    }

    public function isKepalaSekolah(): bool
    {
        return $this->role === 'kepala_sekolah';
    }

    public function isBendahara(): bool
    {
        return $this->role === 'bendahara' || empty($this->role);
    }

    public function bkuAuditLogs()
    {
        return $this->hasMany(BkuAuditLog::class);
    }
}
