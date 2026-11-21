<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BackupSetting extends Model
{
    public const FREQUENCY_DAILY = 'daily';

    public const FREQUENCY_WEEKLY = 'weekly';

    public const FREQUENCY_MONTHLY = 'monthly';

    public const SYNC_NONE = 'none';

    public const SYNC_LOCAL_FOLDER = 'local_folder';

    public const SYNC_GOOGLE_DRIVE_API = 'google_drive_api';

    protected $table = 'backup_settings';

    protected $fillable = [
        'is_enabled',
        'frequency',
        'scheduled_time',
        'day_of_week',
        'day_of_month',
        'retention_enabled',
        'retention_max_files',
        'retention_max_days',
        'sync_mode',
        'local_sync_path',
        'sync_apply_retention',
        'gdrive_folder_id',
        'gdrive_client_id',
        'gdrive_client_secret',
        'gdrive_refresh_token',
    ];

    protected $hidden = [
        'gdrive_client_secret',
        'gdrive_refresh_token',
        'pending_cloud_path',
    ];

    protected function casts(): array
    {
        return [
            'is_enabled' => 'boolean',
            'day_of_week' => 'integer',
            'day_of_month' => 'integer',
            'retention_enabled' => 'boolean',
            'retention_max_files' => 'integer',
            'retention_max_days' => 'integer',
            'sync_apply_retention' => 'boolean',
            'gdrive_client_secret' => 'encrypted',
            'gdrive_refresh_token' => 'encrypted',
            'last_run_at' => 'datetime',
            'pending_cloud_run_id' => 'integer',
            'pending_cloud_retry_at' => 'datetime',
        ];
    }

    /**
     * Mengambil konfigurasi tunggal aplikasi atau mengembalikan objek default yang aman.
     */
    public static function current(): self
    {
        try {
            $existing = self::query()->orderBy('id')->first();
            if ($existing) {
                return $existing;
            }
        } catch (\Throwable) {
            // Jatuh ke default aman bila migrasi belum berjalan
        }

        return new self([
            'is_enabled' => false,
            'frequency' => self::FREQUENCY_DAILY,
            'scheduled_time' => '22:00',
            'day_of_week' => 0,
            'day_of_month' => 1,
            'retention_enabled' => true,
            'retention_max_files' => 14,
            'retention_max_days' => 30,
            'sync_mode' => self::SYNC_NONE,
            'local_sync_path' => null,
            'sync_apply_retention' => true,
            'gdrive_folder_id' => null,
            'gdrive_client_id' => null,
        ]);
    }

    /**
     * Representasi aman untuk frontend Inertia (tanpa rahasia plaintext).
     *
     * @return array<string, mixed>
     */
    public function toSafeFrontendArray(): array
    {
        $hasSecret = false;
        $hasRefreshToken = false;
        $secretsCorrupted = false;

        try {
            $hasSecret = filled($this->gdrive_client_secret);
        } catch (\Throwable) {
            $hasSecret = false;
            if (filled($this->getRawOriginal('gdrive_client_secret'))) {
                $secretsCorrupted = true;
            }
        }

        try {
            $hasRefreshToken = filled($this->gdrive_refresh_token);
        } catch (\Throwable) {
            $hasRefreshToken = false;
            if (filled($this->getRawOriginal('gdrive_refresh_token'))) {
                $secretsCorrupted = true;
            }
        }

        return [
            'is_enabled' => (bool) $this->is_enabled,
            'frequency' => (string) ($this->frequency ?: self::FREQUENCY_DAILY),
            'scheduled_time' => (string) ($this->scheduled_time ?: '22:00'),
            'day_of_week' => (int) ($this->day_of_week ?? 0),
            'day_of_month' => (int) ($this->day_of_month ?? 1),
            'retention_enabled' => (bool) ($this->retention_enabled ?? true),
            'retention_max_files' => (int) ($this->retention_max_files ?? 14),
            'retention_max_days' => $this->retention_max_days !== null ? (int) $this->retention_max_days : null,
            'sync_mode' => (string) ($this->sync_mode ?: self::SYNC_NONE),
            'local_sync_path' => $this->local_sync_path ?: '',
            'sync_apply_retention' => (bool) ($this->sync_apply_retention ?? true),
            'gdrive_folder_id' => $this->gdrive_folder_id ?: '',
            'gdrive_client_id' => $this->gdrive_client_id ?: '',
            'has_gdrive_client_secret' => $hasSecret,
            'has_gdrive_refresh_token' => $hasRefreshToken,
            'gdrive_secrets_corrupted' => $secretsCorrupted,
            'last_run_at_formatted' => $this->last_run_at?->timezone(config('app.timezone'))->format('d M Y, H:i'),
            'last_run_at_human' => $this->last_run_at?->copy()->locale('id')->diffForHumans(),
            'last_run_status' => $this->last_run_status,
            'last_run_message' => $this->last_run_message,
            'last_backup_file' => $this->last_backup_file,
            'has_pending_cloud_sync' => filled($this->pending_cloud_file) && $this->sync_mode === self::SYNC_GOOGLE_DRIVE_API,
            'pending_cloud_file' => $this->sync_mode === self::SYNC_GOOGLE_DRIVE_API ? $this->pending_cloud_file : null,
        ];
    }
}
