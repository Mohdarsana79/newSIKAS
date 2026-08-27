<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KinerjaRekamanPerubahan extends Model
{
    use HasFactory;

    protected $table = "kinerja_rekaman_perubahans";

    protected $fillable = [
        "kinerja_penganggaran_id",
        "action",
        "description",
        "old_data",
        "new_data"
    ];

    protected $casts = [
        "old_data" => "array",
        "new_data" => "array",
    ];

    public function kinerjaPenganggaran()
    {
        return $this->belongsTo(KinerjaPenganggaran::class, "kinerja_penganggaran_id");
    }


    public function penganggaran() { return $this->kinerjaPenganggaran(); }
}


