<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RkasItemReview extends Model
{
    use HasFactory;

    protected $table = 'rkas_item_reviews';

    protected $fillable = [
        'user_id',
        'reviewable_type',
        'reviewable_id',
        'status',
        'catatan',
        'tanggapan_bendahara',
        'revisi_diajukan_at',
    ];

    protected $casts = [
        'revisi_diajukan_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function reviewable()
    {
        return $this->morphTo();
    }
}
