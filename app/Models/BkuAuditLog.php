<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BkuAuditLog extends Model
{
    use HasFactory;

    protected $table = 'bku_audit_logs';

    protected $fillable = [
        'user_id',
        'sekolah_id',
        'variant',
        'tahun',
        'bulan',
        'bulan_angka',
        'penganggaran_id',
        'compliance_score',
        'executive_summary',
        'findings',
        'rules_checked',
        'last_bku_updated_at',
        'metadata',
    ];

    protected $casts = [
        'tahun' => 'integer',
        'bulan_angka' => 'integer',
        'penganggaran_id' => 'integer',
        'compliance_score' => 'integer',
        'findings' => 'array',
        'rules_checked' => 'array',
        'metadata' => 'array',
        'last_bku_updated_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function sekolah()
    {
        return $this->belongsTo(SekolahProfile::class, 'sekolah_id');
    }
}
