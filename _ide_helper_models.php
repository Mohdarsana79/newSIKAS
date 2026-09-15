<?php

// @formatter:off
// phpcs:ignoreFile
/**
 * A helper file for your Eloquent Models
 * Copy the phpDocs from this file to the correct Model,
 * And remove them from this file, to prevent double declarations.
 *
 * @author Barry vd. Heuvel <barryvdh@gmail.com>
 */


namespace App\Models{
/**
 * @property int $id
 * @property int $sekolah_id
 * @property int $penganggaran_id
 * @property int $buku_kas_umum_id
 * @property string|null $nomor_bast
 * @property string|null $tanggal_bast
 * @property string|null $pihak_pertama_nama
 * @property string|null $pihak_pertama_jabatan
 * @property string|null $pihak_pertama_instansi
 * @property string|null $pihak_pertama_alamat
 * @property string|null $pihak_kedua_nama
 * @property string|null $pihak_kedua_jabatan
 * @property string|null $pihak_kedua_instansi
 * @property string|null $pihak_kedua_alamat
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\BukuKasUmum $bukuKasUmum
 * @property-read \App\Models\Penganggaran $penganggaran
 * @property-read \App\Models\SekolahProfile $sekolah
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Bast newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Bast newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Bast query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Bast whereBukuKasUmumId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Bast whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Bast whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Bast whereNomorBast($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Bast wherePenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Bast wherePihakKeduaAlamat($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Bast wherePihakKeduaInstansi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Bast wherePihakKeduaJabatan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Bast wherePihakKeduaNama($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Bast wherePihakPertamaAlamat($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Bast wherePihakPertamaInstansi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Bast wherePihakPertamaJabatan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Bast wherePihakPertamaNama($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Bast whereSekolahId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Bast whereTanggalBast($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Bast whereUpdatedAt($value)
 */
	class Bast extends \Eloquent {}
}

