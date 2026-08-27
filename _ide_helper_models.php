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
 * @property string|null $id_transaksi
 * @property int $penganggaran_id
 * @property \Illuminate\Support\Carbon $tanggal_transaksi
 * @property int|null $kode_kegiatan_id
 * @property int|null $rekening_belanja_id
 * @property string|null $uraian
 * @property string $jenis_transaksi
 * @property numeric $anggaran
 * @property numeric $dibelanjakan
 * @property numeric $total_transaksi_kotor
 * @property string|null $pajak
 * @property numeric|null $persen_pajak
 * @property numeric $total_pajak
 * @property string|null $pajak_daerah
 * @property numeric|null $persen_pajak_daerah
 * @property numeric $total_pajak_daerah
 * @property string|null $tanggal_lapor
 * @property string|null $kode_masa_pajak
 * @property string|null $ntpn
 * @property string|null $tanggal_tutup
 * @property bool $is_bunga_record
 * @property numeric $bunga_bank
 * @property numeric $pajak_bunga_bank
 * @property string|null $nama_toko
 * @property string|null $nama_penerima_pembayaran
 * @property string|null $alamat_toko
 * @property string|null $npwp
 * @property string|null $nomor_nota
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property string|null $uraian_opsional
 * @property-read \App\Models\Dokumen|null $dokumen
 * @property-read \App\Models\KodeKegiatan|null $kodeKegiatan
 * @property-read \App\Models\Kwitansi|null $kwitansi
 * @property-read \App\Models\Penganggaran $penganggaran
 * @property-read \App\Models\RekeningBelanja|null $rekeningBelanja
 * @property-read \App\Models\TandaTerima|null $tandaTerima
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\BukuKasUmumUraianDetail> $uraianDetails
 * @property-read int|null $uraian_details_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmum newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmum newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmum query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmum whereAlamatToko($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmum whereAnggaran($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmum whereBungaBank($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmum whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmum whereDibelanjakan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmum whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmum whereIdTransaksi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmum whereIsBungaRecord($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmum whereJenisTransaksi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmum whereKodeKegiatanId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmum whereKodeMasaPajak($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmum whereNamaPenerimaPembayaran($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmum whereNamaToko($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmum whereNomorNota($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmum whereNpwp($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmum whereNtpn($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmum wherePajak($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmum wherePajakBungaBank($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmum wherePajakDaerah($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmum wherePenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmum wherePersenPajak($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmum wherePersenPajakDaerah($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmum whereRekeningBelanjaId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmum whereTanggalLapor($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmum whereTanggalTransaksi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmum whereTanggalTutup($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmum whereTotalPajak($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmum whereTotalPajakDaerah($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmum whereTotalTransaksiKotor($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmum whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmum whereUraian($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmum whereUraianOpsional($value)
 */
	class BukuKasUmum extends \Eloquent {}
}

