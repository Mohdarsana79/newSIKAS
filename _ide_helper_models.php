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

namespace App\Models{
/**
 * @property int $id
 * @property int $user_id
 * @property int|null $sekolah_id
 * @property string $variant
 * @property int $tahun
 * @property string|null $bulan
 * @property int|null $bulan_angka
 * @property int $penganggaran_id
 * @property int $compliance_score
 * @property string|null $executive_summary
 * @property array<array-key, mixed> $findings
 * @property array<array-key, mixed> $rules_checked
 * @property \Illuminate\Support\Carbon|null $last_bku_updated_at
 * @property array<array-key, mixed>|null $metadata
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property string $tab_type
 * @property string $periode_type
 * @property string $periode_key
 * @property-read \App\Models\SekolahProfile|null $sekolah
 * @property-read \App\Models\User $user
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BkuAuditLog newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BkuAuditLog newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BkuAuditLog query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BkuAuditLog whereBulan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BkuAuditLog whereBulanAngka($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BkuAuditLog whereComplianceScore($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BkuAuditLog whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BkuAuditLog whereExecutiveSummary($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BkuAuditLog whereFindings($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BkuAuditLog whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BkuAuditLog whereLastBkuUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BkuAuditLog whereMetadata($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BkuAuditLog wherePenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BkuAuditLog wherePeriodeKey($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BkuAuditLog wherePeriodeType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BkuAuditLog whereRulesChecked($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BkuAuditLog whereSekolahId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BkuAuditLog whereTabType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BkuAuditLog whereTahun($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BkuAuditLog whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BkuAuditLog whereUserId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BkuAuditLog whereVariant($value)
 */
	class BkuAuditLog extends \Eloquent {}
}

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
 * @property-read \App\Models\Bast|null $bast
 * @property-read \App\Models\Dokumen|null $dokumen
 * @property-read \App\Models\KodeKegiatan|null $kodeKegiatan
 * @property-read \App\Models\Kwitansi|null $kwitansi
 * @property-read \App\Models\Penganggaran $penganggaran
 * @property-read \App\Models\RekeningBelanja|null $rekeningBelanja
 * @property-read \App\Models\SuratPesanan|null $suratPesanan
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

namespace App\Models{
/**
 * @property int $id
 * @property int $buku_kas_umum_id
 * @property string $uraian
 * @property int $volume
 * @property string|null $satuan
 * @property numeric $harga_satuan
 * @property numeric $jumlah
 * @property int|null $kode_kegiatan_id
 * @property int|null $rekening_belanja_id
 * @property int|null $rkas_id
 * @property int|null $rkas_perubahan_id
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property string|null $kondisi
 * @property-read \App\Models\BukuKasUmum $bukuKasUmum
 * @property-read \App\Models\KodeKegiatan|null $kodeKegiatan
 * @property-read \App\Models\RekeningBelanja|null $rekeningBelanja
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmumUraianDetail newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmumUraianDetail newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmumUraianDetail query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmumUraianDetail whereBukuKasUmumId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmumUraianDetail whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmumUraianDetail whereHargaSatuan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmumUraianDetail whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmumUraianDetail whereJumlah($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmumUraianDetail whereKodeKegiatanId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmumUraianDetail whereKondisi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmumUraianDetail whereRekeningBelanjaId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmumUraianDetail whereRkasId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmumUraianDetail whereRkasPerubahanId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmumUraianDetail whereSatuan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmumUraianDetail whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmumUraianDetail whereUraian($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BukuKasUmumUraianDetail whereVolume($value)
 */
	class BukuKasUmumUraianDetail extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $penganggaran_id
 * @property int $buku_kas_umum_id
 * @property string $nama_dokumen
 * @property string $link_drive
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\BukuKasUmum $bukuKasUmum
 * @property-read \App\Models\Penganggaran $penganggaran
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Dokumen newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Dokumen newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Dokumen query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Dokumen whereBukuKasUmumId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Dokumen whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Dokumen whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Dokumen whereLinkDrive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Dokumen whereNamaDokumen($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Dokumen wherePenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Dokumen whereUpdatedAt($value)
 */
	class Dokumen extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $sekolah_id
 * @property int $kinerja_penganggaran_id
 * @property int $kinerja_buku_kas_umum_id
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
 * @property-read \App\Models\KinerjaBukuKasUmum $bukuKasUmum
 * @property-read \App\Models\KinerjaPenganggaran $penganggaran
 * @property-read \App\Models\SekolahProfile $sekolah
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBast newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBast newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBast query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBast whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBast whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBast whereKinerjaBukuKasUmumId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBast whereKinerjaPenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBast whereNomorBast($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBast wherePihakKeduaAlamat($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBast wherePihakKeduaInstansi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBast wherePihakKeduaJabatan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBast wherePihakKeduaNama($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBast wherePihakPertamaAlamat($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBast wherePihakPertamaInstansi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBast wherePihakPertamaJabatan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBast wherePihakPertamaNama($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBast whereSekolahId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBast whereTanggalBast($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBast whereUpdatedAt($value)
 */
	class KinerjaBast extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string|null $id_transaksi
 * @property int $kinerja_penganggaran_id
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
 * @property string|null $uraian_opsional
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\KinerjaBast|null $bast
 * @property-read \App\Models\KinerjaDokumen|null $dokumen
 * @property-read \App\Models\KodeKegiatan|null $kodeKegiatan
 * @property-read \App\Models\KinerjaKwitansi|null $kwitansi
 * @property-read \App\Models\KinerjaPenganggaran $penganggaran
 * @property-read \App\Models\RekeningBelanja|null $rekeningBelanja
 * @property-read \App\Models\KinerjaSuratPesanan|null $suratPesanan
 * @property-read \App\Models\KinerjaTandaTerima|null $tandaTerima
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\KinerjaBukuKasUmumUraianDetail> $uraianDetails
 * @property-read int|null $uraian_details_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmum newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmum newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmum query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmum whereAlamatToko($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmum whereAnggaran($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmum whereBungaBank($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmum whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmum whereDibelanjakan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmum whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmum whereIdTransaksi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmum whereIsBungaRecord($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmum whereJenisTransaksi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmum whereKinerjaPenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmum whereKodeKegiatanId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmum whereKodeMasaPajak($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmum whereNamaPenerimaPembayaran($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmum whereNamaToko($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmum whereNomorNota($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmum whereNpwp($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmum whereNtpn($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmum wherePajak($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmum wherePajakBungaBank($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmum wherePajakDaerah($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmum wherePersenPajak($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmum wherePersenPajakDaerah($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmum whereRekeningBelanjaId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmum whereTanggalLapor($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmum whereTanggalTransaksi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmum whereTanggalTutup($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmum whereTotalPajak($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmum whereTotalPajakDaerah($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmum whereTotalTransaksiKotor($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmum whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmum whereUraian($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmum whereUraianOpsional($value)
 */
	class KinerjaBukuKasUmum extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $kinerja_buku_kas_umum_id
 * @property string $uraian
 * @property int $volume
 * @property string|null $satuan
 * @property numeric $harga_satuan
 * @property numeric $jumlah
 * @property int|null $kode_kegiatan_id
 * @property int|null $rekening_belanja_id
 * @property int|null $kinerja_rkas_id
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property int|null $kinerja_rkas_perubahan_id
 * @property string|null $kondisi
 * @property-read \App\Models\KinerjaBukuKasUmum $kinerjaBukuKasUmum
 * @property-read \App\Models\KinerjaRkas|null $kinerjaRkas
 * @property-read \App\Models\KodeKegiatan|null $kodeKegiatan
 * @property-read \App\Models\RekeningBelanja|null $rekeningBelanja
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmumUraianDetail newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmumUraianDetail newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmumUraianDetail query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmumUraianDetail whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmumUraianDetail whereHargaSatuan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmumUraianDetail whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmumUraianDetail whereJumlah($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmumUraianDetail whereKinerjaBukuKasUmumId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmumUraianDetail whereKinerjaRkasId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmumUraianDetail whereKinerjaRkasPerubahanId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmumUraianDetail whereKodeKegiatanId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmumUraianDetail whereKondisi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmumUraianDetail whereRekeningBelanjaId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmumUraianDetail whereSatuan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmumUraianDetail whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmumUraianDetail whereUraian($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaBukuKasUmumUraianDetail whereVolume($value)
 */
	class KinerjaBukuKasUmumUraianDetail extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $kinerja_penganggaran_id
 * @property int $kinerja_buku_kas_umum_id
 * @property string $nama_dokumen
 * @property string $link_drive
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\KinerjaBukuKasUmum $kinerjaBukuKasUmum
 * @property-read \App\Models\KinerjaPenganggaran $kinerjaPenganggaran
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaDokumen newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaDokumen newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaDokumen query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaDokumen whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaDokumen whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaDokumen whereKinerjaBukuKasUmumId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaDokumen whereKinerjaPenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaDokumen whereLinkDrive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaDokumen whereNamaDokumen($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaDokumen whereUpdatedAt($value)
 */
	class KinerjaDokumen extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $sekolah_id
 * @property int $kinerja_penganggaran_id
 * @property int $kode_kegiatan_id
 * @property int $kode_rekening_id
 * @property int $kinerja_penerimaan_dana_id
 * @property int $kinerja_buku_kas_umum_id
 * @property int $kinerja_bku_uraian_detail_id
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\KinerjaBukuKasUmum $kinerjaBukuKasUmum
 * @property-read \App\Models\KinerjaPenerimaanDana $kinerjaPenerimaanDana
 * @property-read \App\Models\KinerjaPenganggaran $kinerjaPenganggaran
 * @property-read \App\Models\KinerjaBukuKasUmumUraianDetail $kinerjaUraianDetail
 * @property-read \App\Models\KodeKegiatan $kodeKegiatan
 * @property-read \App\Models\RekeningBelanja $rekeningBelanja
 * @property-read \App\Models\SekolahProfile $sekolah
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaKwitansi newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaKwitansi newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaKwitansi query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaKwitansi whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaKwitansi whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaKwitansi whereKinerjaBkuUraianDetailId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaKwitansi whereKinerjaBukuKasUmumId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaKwitansi whereKinerjaPenerimaanDanaId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaKwitansi whereKinerjaPenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaKwitansi whereKodeKegiatanId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaKwitansi whereKodeRekeningId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaKwitansi whereSekolahId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaKwitansi whereUpdatedAt($value)
 */
	class KinerjaKwitansi extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $sekolah_id
 * @property int $kinerja_penganggaran_id
 * @property string|null $tanggal_lph
 * @property int $semester
 * @property numeric $penerimaan_anggaran
 * @property numeric $penerimaan_realisasi
 * @property numeric $penerimaan_selisih
 * @property numeric $belanja_operasi_anggaran
 * @property numeric $belanja_operasi_realisasi
 * @property numeric $belanja_operasi_selisih
 * @property numeric $belanja_modal_peralatan_anggaran
 * @property numeric $belanja_modal_peralatan_realisasi
 * @property numeric $belanja_modal_peralatan_selisih
 * @property numeric $belanja_modal_aset_anggaran
 * @property numeric $belanja_modal_aset_realisasi
 * @property numeric $belanja_modal_aset_selisih
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\KinerjaPenganggaran $kinerjaPenganggaran
 * @property-read \App\Models\SekolahProfile $sekolah
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaLph newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaLph newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaLph query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaLph whereBelanjaModalAsetAnggaran($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaLph whereBelanjaModalAsetRealisasi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaLph whereBelanjaModalAsetSelisih($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaLph whereBelanjaModalPeralatanAnggaran($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaLph whereBelanjaModalPeralatanRealisasi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaLph whereBelanjaModalPeralatanSelisih($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaLph whereBelanjaOperasiAnggaran($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaLph whereBelanjaOperasiRealisasi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaLph whereBelanjaOperasiSelisih($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaLph whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaLph whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaLph whereKinerjaPenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaLph wherePenerimaanAnggaran($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaLph wherePenerimaanRealisasi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaLph wherePenerimaanSelisih($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaLph whereSekolahId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaLph whereSemester($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaLph whereTanggalLph($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaLph whereUpdatedAt($value)
 */
	class KinerjaLph extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $kinerja_penganggaran_id
 * @property \Illuminate\Support\Carbon $tanggal_penarikan
 * @property numeric $jumlah_penarikan
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\KinerjaPenganggaran $kinerjaPenganggaran
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaPenarikanTunai newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaPenarikanTunai newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaPenarikanTunai query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaPenarikanTunai whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaPenarikanTunai whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaPenarikanTunai whereJumlahPenarikan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaPenarikanTunai whereKinerjaPenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaPenarikanTunai whereTanggalPenarikan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaPenarikanTunai whereUpdatedAt($value)
 */
	class KinerjaPenarikanTunai extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $kinerja_penganggaran_id
 * @property numeric|null $saldo_awal
 * @property \Illuminate\Support\Carbon|null $tanggal_saldo_awal
 * @property string $sumber_dana
 * @property numeric $jumlah_dana
 * @property \Illuminate\Support\Carbon|null $tanggal_terima
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\KinerjaPenganggaran $penganggaran
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaPenerimaanDana newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaPenerimaanDana newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaPenerimaanDana query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaPenerimaanDana whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaPenerimaanDana whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaPenerimaanDana whereJumlahDana($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaPenerimaanDana whereKinerjaPenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaPenerimaanDana whereSaldoAwal($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaPenerimaanDana whereSumberDana($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaPenerimaanDana whereTanggalSaldoAwal($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaPenerimaanDana whereTanggalTerima($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaPenerimaanDana whereUpdatedAt($value)
 */
	class KinerjaPenerimaanDana extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int|null $sekolah_id
 * @property bool $is_trk_saldo_awal
 * @property \Illuminate\Support\Carbon|null $tanggal_trk_saldo_awal
 * @property numeric|null $jumlah_trk_saldo_awal
 * @property numeric $pagu_anggaran
 * @property int $tahun_anggaran
 * @property string $kepala_sekolah
 * @property string $sk_kepala_sekolah
 * @property string $bendahara
 * @property string $sk_bendahara
 * @property string $komite
 * @property string $nip_kepala_sekolah
 * @property string $nip_bendahara
 * @property \Illuminate\Support\Carbon $tanggal_sk_kepala_sekolah
 * @property \Illuminate\Support\Carbon $tanggal_sk_bendahara
 * @property string|null $tanggal_cetak
 * @property string|null $tanggal_perubahan
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property string $status_persetujuan
 * @property int|null $persetujuan_oleh
 * @property \Illuminate\Support\Carbon|null $tanggal_persetujuan
 * @property string|null $catatan_persetujuan
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\KinerjaBukuKasUmum> $bukuKasUmums
 * @property-read int|null $buku_kas_umums_count
 * @property-read mixed $format_tanggal_cetak
 * @property-read mixed $format_tanggal_perubahan
 * @property-read mixed $format_tanggal_sk_bendahara
 * @property-read mixed $format_tanggal_sk_kepsek
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\KinerjaPenerimaanDana> $penerimaanDanas
 * @property-read int|null $penerimaan_danas_count
 * @property-read \App\Models\User|null $persetujuanUser
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\KinerjaRkas> $rkas
 * @property-read int|null $rkas_count
 * @property-read \App\Models\SekolahProfile|null $sekolah
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaPenganggaran newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaPenganggaran newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaPenganggaran query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaPenganggaran whereBendahara($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaPenganggaran whereCatatanPersetujuan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaPenganggaran whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaPenganggaran whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaPenganggaran whereIsTrkSaldoAwal($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaPenganggaran whereJumlahTrkSaldoAwal($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaPenganggaran whereKepalaSekolah($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaPenganggaran whereKomite($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaPenganggaran whereNipBendahara($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaPenganggaran whereNipKepalaSekolah($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaPenganggaran wherePaguAnggaran($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaPenganggaran wherePersetujuanOleh($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaPenganggaran whereSekolahId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaPenganggaran whereSkBendahara($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaPenganggaran whereSkKepalaSekolah($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaPenganggaran whereStatusPersetujuan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaPenganggaran whereTahunAnggaran($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaPenganggaran whereTanggalCetak($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaPenganggaran whereTanggalPersetujuan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaPenganggaran whereTanggalPerubahan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaPenganggaran whereTanggalSkBendahara($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaPenganggaran whereTanggalSkKepalaSekolah($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaPenganggaran whereTanggalTrkSaldoAwal($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaPenganggaran whereUpdatedAt($value)
 */
	class KinerjaPenganggaran extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $kinerja_penganggaran_id
 * @property string $action
 * @property string $description
 * @property array<array-key, mixed>|null $old_data
 * @property array<array-key, mixed>|null $new_data
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\KinerjaPenganggaran $kinerjaPenganggaran
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRekamanPerubahan newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRekamanPerubahan newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRekamanPerubahan query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRekamanPerubahan whereAction($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRekamanPerubahan whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRekamanPerubahan whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRekamanPerubahan whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRekamanPerubahan whereKinerjaPenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRekamanPerubahan whereNewData($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRekamanPerubahan whereOldData($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRekamanPerubahan whereUpdatedAt($value)
 */
	class KinerjaRekamanPerubahan extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $kode_id
 * @property int $kode_rekening_id
 * @property int $kinerja_penganggaran_id
 * @property string $uraian
 * @property numeric $harga_satuan
 * @property string $bulan
 * @property int $jumlah
 * @property string $satuan
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property string|null $nama_penerima
 * @property string|null $jabatan
 * @property string|null $nomor_rekening
 * @property string|null $bank
 * @property bool $ada_npwp
 * @property numeric|null $pot_ppn
 * @property numeric|null $pot_pph23
 * @property numeric|null $pot_pph21
 * @property numeric|null $pot_pph21_narasumber
 * @property string|null $status_penerima
 * @property string|null $golongan
 * @property string|null $uraian_gabungan
 * @property string|null $nomor_kwitansi
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\KinerjaBukuKasUmumUraianDetail> $bkuUraianDetails
 * @property-read int|null $bku_uraian_details_count
 * @property-read mixed $harga_satuan_formatted
 * @property-read mixed $total_anggaran
 * @property-read mixed $total_anggaran_formatted
 * @property-read \App\Models\KodeKegiatan $kodeKegiatan
 * @property-read \App\Models\KinerjaPenganggaran $penganggaran
 * @property-read \App\Models\RekeningBelanja $rekeningBelanja
 * @property-read \App\Models\RkasItemReview|null $review
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\RkasItemReview> $reviews
 * @property-read int|null $reviews_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkas byBulan($bulan)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkas byKegiatan($kodeId)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkas byRekening($rekeningId)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkas byTahap($tahap, $penganggaranId = null)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkas newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkas newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkas query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkas whereAdaNpwp($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkas whereBank($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkas whereBulan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkas whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkas whereGolongan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkas whereHargaSatuan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkas whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkas whereJabatan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkas whereJumlah($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkas whereKinerjaPenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkas whereKodeId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkas whereKodeRekeningId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkas whereNamaPenerima($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkas whereNomorKwitansi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkas whereNomorRekening($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkas wherePotPph21($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkas wherePotPph21Narasumber($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkas wherePotPph23($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkas wherePotPpn($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkas whereSatuan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkas whereStatusPenerima($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkas whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkas whereUraian($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkas whereUraianGabungan($value)
 */
	class KinerjaRkas extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $kode_id
 * @property int $kode_rekening_id
 * @property int $kinerja_penganggaran_id
 * @property string $uraian
 * @property numeric $harga_satuan
 * @property string $bulan
 * @property int $jumlah
 * @property string $satuan
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property string|null $nama_penerima
 * @property string|null $jabatan
 * @property string|null $nomor_rekening
 * @property string|null $bank
 * @property bool $ada_npwp
 * @property numeric|null $pot_ppn
 * @property numeric|null $pot_pph23
 * @property numeric|null $pot_pph21
 * @property numeric|null $pot_pph21_narasumber
 * @property string|null $status_penerima
 * @property string|null $golongan
 * @property string|null $uraian_gabungan
 * @property string|null $nomor_kwitansi
 * @property-read \App\Models\KinerjaPenganggaran $kinerjaPenganggaran
 * @property-read \App\Models\KodeKegiatan $kodeKegiatan
 * @property-read \App\Models\RekeningBelanja $rekeningBelanja
 * @property-read \App\Models\RkasItemReview|null $review
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\RkasItemReview> $reviews
 * @property-read int|null $reviews_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkasPerubahan byTahap($tahap, $penganggaranId = null)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkasPerubahan newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkasPerubahan newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkasPerubahan query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkasPerubahan whereAdaNpwp($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkasPerubahan whereBank($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkasPerubahan whereBulan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkasPerubahan whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkasPerubahan whereGolongan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkasPerubahan whereHargaSatuan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkasPerubahan whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkasPerubahan whereJabatan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkasPerubahan whereJumlah($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkasPerubahan whereKinerjaPenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkasPerubahan whereKodeId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkasPerubahan whereKodeRekeningId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkasPerubahan whereNamaPenerima($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkasPerubahan whereNomorKwitansi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkasPerubahan whereNomorRekening($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkasPerubahan wherePotPph21($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkasPerubahan wherePotPph21Narasumber($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkasPerubahan wherePotPph23($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkasPerubahan wherePotPpn($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkasPerubahan whereSatuan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkasPerubahan whereStatusPenerima($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkasPerubahan whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkasPerubahan whereUraian($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaRkasPerubahan whereUraianGabungan($value)
 */
	class KinerjaRkasPerubahan extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $kinerja_penganggaran_id
 * @property \Illuminate\Support\Carbon $tanggal_setor
 * @property numeric $jumlah_setor
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\KinerjaPenganggaran $kinerjaPenganggaran
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSetorTunai newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSetorTunai newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSetorTunai query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSetorTunai whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSetorTunai whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSetorTunai whereJumlahSetor($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSetorTunai whereKinerjaPenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSetorTunai whereTanggalSetor($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSetorTunai whereUpdatedAt($value)
 */
	class KinerjaSetorTunai extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $sekolah_id
 * @property int $kinerja_silpa_penganggaran_id
 * @property int $kinerja_silpa_buku_kas_umum_id
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
 * @property-read \App\Models\KinerjaSilpaBukuKasUmum $bukuKasUmum
 * @property-read \App\Models\KinerjaSilpaPenganggaran $penganggaran
 * @property-read \App\Models\SekolahProfile $sekolah
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBast newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBast newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBast query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBast whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBast whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBast whereKinerjaSilpaBukuKasUmumId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBast whereKinerjaSilpaPenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBast whereNomorBast($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBast wherePihakKeduaAlamat($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBast wherePihakKeduaInstansi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBast wherePihakKeduaJabatan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBast wherePihakKeduaNama($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBast wherePihakPertamaAlamat($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBast wherePihakPertamaInstansi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBast wherePihakPertamaJabatan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBast wherePihakPertamaNama($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBast whereSekolahId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBast whereTanggalBast($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBast whereUpdatedAt($value)
 */
	class KinerjaSilpaBast extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string|null $id_transaksi
 * @property int $kinerja_silpa_penganggaran_id
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
 * @property string|null $uraian_opsional
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\KinerjaSilpaBast|null $bast
 * @property-read \App\Models\KinerjaSilpaDokumen|null $dokumen
 * @property-read \App\Models\KodeKegiatan|null $kodeKegiatan
 * @property-read \App\Models\KinerjaSilpaKwitansi|null $kwitansi
 * @property-read \App\Models\KinerjaSilpaPenganggaran $penganggaran
 * @property-read \App\Models\RekeningBelanja|null $rekeningBelanja
 * @property-read \App\Models\KinerjaSilpaSuratPesanan|null $suratPesanan
 * @property-read \App\Models\KinerjaSilpaTandaTerima|null $tandaTerima
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\KinerjaSilpaBukuKasUmumUraianDetail> $uraianDetails
 * @property-read int|null $uraian_details_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBukuKasUmum newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBukuKasUmum newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBukuKasUmum query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBukuKasUmum whereAlamatToko($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBukuKasUmum whereAnggaran($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBukuKasUmum whereBungaBank($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBukuKasUmum whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBukuKasUmum whereDibelanjakan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBukuKasUmum whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBukuKasUmum whereIdTransaksi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBukuKasUmum whereIsBungaRecord($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBukuKasUmum whereJenisTransaksi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBukuKasUmum whereKinerjaSilpaPenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBukuKasUmum whereKodeKegiatanId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBukuKasUmum whereKodeMasaPajak($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBukuKasUmum whereNamaPenerimaPembayaran($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBukuKasUmum whereNamaToko($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBukuKasUmum whereNomorNota($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBukuKasUmum whereNpwp($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBukuKasUmum whereNtpn($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBukuKasUmum wherePajak($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBukuKasUmum wherePajakBungaBank($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBukuKasUmum wherePajakDaerah($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBukuKasUmum wherePersenPajak($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBukuKasUmum wherePersenPajakDaerah($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBukuKasUmum whereRekeningBelanjaId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBukuKasUmum whereTanggalLapor($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBukuKasUmum whereTanggalTransaksi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBukuKasUmum whereTanggalTutup($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBukuKasUmum whereTotalPajak($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBukuKasUmum whereTotalPajakDaerah($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBukuKasUmum whereTotalTransaksiKotor($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBukuKasUmum whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBukuKasUmum whereUraian($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBukuKasUmum whereUraianOpsional($value)
 */
	class KinerjaSilpaBukuKasUmum extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $kinerja_silpa_buku_kas_umum_id
 * @property string $uraian
 * @property int $volume
 * @property string|null $satuan
 * @property numeric $harga_satuan
 * @property numeric $jumlah
 * @property int|null $kode_kegiatan_id
 * @property int|null $rekening_belanja_id
 * @property int|null $kinerja_silpa_rkas_id
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property string|null $kondisi
 * @property-read \App\Models\KodeKegiatan|null $kodeKegiatan
 * @property-read \App\Models\RekeningBelanja|null $rekeningBelanja
 * @property-read \App\Models\KinerjaSilpaBukuKasUmum $silpaBukuKasUmum
 * @property-read \App\Models\KinerjaSilpaRkas|null $silpaRkas
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBukuKasUmumUraianDetail newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBukuKasUmumUraianDetail newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBukuKasUmumUraianDetail query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBukuKasUmumUraianDetail whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBukuKasUmumUraianDetail whereHargaSatuan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBukuKasUmumUraianDetail whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBukuKasUmumUraianDetail whereJumlah($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBukuKasUmumUraianDetail whereKinerjaSilpaBukuKasUmumId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBukuKasUmumUraianDetail whereKinerjaSilpaRkasId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBukuKasUmumUraianDetail whereKodeKegiatanId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBukuKasUmumUraianDetail whereKondisi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBukuKasUmumUraianDetail whereRekeningBelanjaId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBukuKasUmumUraianDetail whereSatuan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBukuKasUmumUraianDetail whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBukuKasUmumUraianDetail whereUraian($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaBukuKasUmumUraianDetail whereVolume($value)
 */
	class KinerjaSilpaBukuKasUmumUraianDetail extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $kinerja_silpa_penganggaran_id
 * @property int $kinerja_silpa_buku_kas_umum_id
 * @property string $nama_dokumen
 * @property string $link_drive
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\KinerjaSilpaBukuKasUmum $silpaBukuKasUmum
 * @property-read \App\Models\KinerjaSilpaPenganggaran $silpaPenganggaran
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaDokumen newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaDokumen newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaDokumen query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaDokumen whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaDokumen whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaDokumen whereKinerjaSilpaBukuKasUmumId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaDokumen whereKinerjaSilpaPenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaDokumen whereLinkDrive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaDokumen whereNamaDokumen($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaDokumen whereUpdatedAt($value)
 */
	class KinerjaSilpaDokumen extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $sekolah_id
 * @property int $kinerja_silpa_penganggaran_id
 * @property int $kode_kegiatan_id
 * @property int $kode_rekening_id
 * @property int $kinerja_silpa_penerimaan_dana_id
 * @property int $kinerja_silpa_buku_kas_umum_id
 * @property int $kinerja_silpa_bku_uraian_detail_id
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\KodeKegiatan $kodeKegiatan
 * @property-read \App\Models\RekeningBelanja $rekeningBelanja
 * @property-read \App\Models\SekolahProfile $sekolah
 * @property-read \App\Models\KinerjaSilpaBukuKasUmum $silpaBukuKasUmum
 * @property-read \App\Models\KinerjaSilpaPenerimaanDana $silpaPenerimaanDana
 * @property-read \App\Models\KinerjaSilpaPenganggaran $silpaPenganggaran
 * @property-read \App\Models\KinerjaSilpaBukuKasUmumUraianDetail $silpaUraianDetail
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaKwitansi newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaKwitansi newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaKwitansi query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaKwitansi whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaKwitansi whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaKwitansi whereKinerjaSilpaBkuUraianDetailId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaKwitansi whereKinerjaSilpaBukuKasUmumId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaKwitansi whereKinerjaSilpaPenerimaanDanaId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaKwitansi whereKinerjaSilpaPenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaKwitansi whereKodeKegiatanId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaKwitansi whereKodeRekeningId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaKwitansi whereSekolahId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaKwitansi whereUpdatedAt($value)
 */
	class KinerjaSilpaKwitansi extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $sekolah_id
 * @property int $kinerja_silpa_penganggaran_id
 * @property string $semester
 * @property string|null $tanggal_lph
 * @property numeric $penerimaan_anggaran
 * @property numeric $penerimaan_realisasi
 * @property numeric $penerimaan_selisih
 * @property numeric $belanja_operasi_anggaran
 * @property numeric $belanja_operasi_realisasi
 * @property numeric $belanja_operasi_selisih
 * @property numeric $belanja_modal_peralatan_anggaran
 * @property numeric $belanja_modal_peralatan_realisasi
 * @property numeric $belanja_modal_peralatan_selisih
 * @property numeric $belanja_modal_aset_anggaran
 * @property numeric $belanja_modal_aset_realisasi
 * @property numeric $belanja_modal_aset_selisih
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\SekolahProfile $sekolah
 * @property-read \App\Models\KinerjaSilpaPenganggaran $silpaPenganggaran
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaLph newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaLph newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaLph query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaLph whereBelanjaModalAsetAnggaran($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaLph whereBelanjaModalAsetRealisasi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaLph whereBelanjaModalAsetSelisih($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaLph whereBelanjaModalPeralatanAnggaran($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaLph whereBelanjaModalPeralatanRealisasi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaLph whereBelanjaModalPeralatanSelisih($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaLph whereBelanjaOperasiAnggaran($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaLph whereBelanjaOperasiRealisasi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaLph whereBelanjaOperasiSelisih($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaLph whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaLph whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaLph whereKinerjaSilpaPenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaLph wherePenerimaanAnggaran($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaLph wherePenerimaanRealisasi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaLph wherePenerimaanSelisih($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaLph whereSekolahId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaLph whereSemester($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaLph whereTanggalLph($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaLph whereUpdatedAt($value)
 */
	class KinerjaSilpaLph extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $kinerja_silpa_penganggaran_id
 * @property \Illuminate\Support\Carbon $tanggal_penarikan
 * @property numeric $jumlah_penarikan
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\KinerjaSilpaPenganggaran $silpaPenganggaran
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaPenarikanTunai newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaPenarikanTunai newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaPenarikanTunai query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaPenarikanTunai whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaPenarikanTunai whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaPenarikanTunai whereJumlahPenarikan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaPenarikanTunai whereKinerjaSilpaPenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaPenarikanTunai whereTanggalPenarikan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaPenarikanTunai whereUpdatedAt($value)
 */
	class KinerjaSilpaPenarikanTunai extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $kinerja_silpa_penganggaran_id
 * @property numeric|null $saldo_awal
 * @property \Illuminate\Support\Carbon|null $tanggal_saldo_awal
 * @property string $sumber_dana
 * @property numeric $jumlah_dana
 * @property \Illuminate\Support\Carbon|null $tanggal_terima
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\KinerjaSilpaPenganggaran $penganggaran
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaPenerimaanDana newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaPenerimaanDana newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaPenerimaanDana query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaPenerimaanDana whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaPenerimaanDana whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaPenerimaanDana whereJumlahDana($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaPenerimaanDana whereKinerjaSilpaPenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaPenerimaanDana whereSaldoAwal($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaPenerimaanDana whereSumberDana($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaPenerimaanDana whereTanggalSaldoAwal($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaPenerimaanDana whereTanggalTerima($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaPenerimaanDana whereUpdatedAt($value)
 */
	class KinerjaSilpaPenerimaanDana extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property numeric $pagu_anggaran
 * @property int $tahun_anggaran
 * @property string $kepala_sekolah
 * @property string $sk_kepala_sekolah
 * @property string $bendahara
 * @property string $sk_bendahara
 * @property string $komite
 * @property string $nip_kepala_sekolah
 * @property string $nip_bendahara
 * @property \Illuminate\Support\Carbon $tanggal_sk_kepala_sekolah
 * @property \Illuminate\Support\Carbon $tanggal_sk_bendahara
 * @property string|null $tanggal_cetak
 * @property int|null $sekolah_id
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property string $status_persetujuan
 * @property int|null $persetujuan_oleh
 * @property \Illuminate\Support\Carbon|null $tanggal_persetujuan
 * @property string|null $catatan_persetujuan
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\KinerjaSilpaBukuKasUmum> $bukuKasUmums
 * @property-read int|null $buku_kas_umums_count
 * @property-read mixed $format_tanggal_cetak
 * @property-read mixed $format_tanggal_perubahan
 * @property-read mixed $format_tanggal_sk_bendahara
 * @property-read mixed $format_tanggal_sk_kepsek
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\KinerjaSilpaPenerimaanDana> $penerimaanDanas
 * @property-read int|null $penerimaan_danas_count
 * @property-read \App\Models\User|null $persetujuanUser
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\KinerjaSilpaRkas> $rkas
 * @property-read int|null $rkas_count
 * @property-read \App\Models\SekolahProfile|null $sekolah
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaPenganggaran newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaPenganggaran newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaPenganggaran query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaPenganggaran whereBendahara($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaPenganggaran whereCatatanPersetujuan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaPenganggaran whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaPenganggaran whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaPenganggaran whereKepalaSekolah($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaPenganggaran whereKomite($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaPenganggaran whereNipBendahara($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaPenganggaran whereNipKepalaSekolah($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaPenganggaran wherePaguAnggaran($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaPenganggaran wherePersetujuanOleh($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaPenganggaran whereSekolahId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaPenganggaran whereSkBendahara($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaPenganggaran whereSkKepalaSekolah($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaPenganggaran whereStatusPersetujuan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaPenganggaran whereTahunAnggaran($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaPenganggaran whereTanggalCetak($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaPenganggaran whereTanggalPersetujuan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaPenganggaran whereTanggalSkBendahara($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaPenganggaran whereTanggalSkKepalaSekolah($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaPenganggaran whereUpdatedAt($value)
 */
	class KinerjaSilpaPenganggaran extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $kinerja_silpa_penganggaran_id
 * @property int $kode_id
 * @property int $kode_rekening_id
 * @property string $uraian
 * @property numeric $harga_satuan
 * @property string $bulan
 * @property int $jumlah
 * @property string $satuan
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property string|null $nama_penerima
 * @property string|null $jabatan
 * @property string|null $nomor_rekening
 * @property string|null $bank
 * @property bool $ada_npwp
 * @property numeric|null $pot_ppn
 * @property numeric|null $pot_pph23
 * @property numeric|null $pot_pph21
 * @property numeric|null $pot_pph21_narasumber
 * @property string|null $status_penerima
 * @property string|null $golongan
 * @property string|null $uraian_gabungan
 * @property string|null $nomor_kwitansi
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\KinerjaSilpaBukuKasUmumUraianDetail> $bkuUraianDetails
 * @property-read int|null $bku_uraian_details_count
 * @property-read mixed $harga_satuan_formatted
 * @property-read mixed $total_anggaran
 * @property-read mixed $total_anggaran_formatted
 * @property-read \App\Models\KodeKegiatan $kodeKegiatan
 * @property-read \App\Models\KinerjaSilpaPenganggaran $penganggaran
 * @property-read \App\Models\RekeningBelanja $rekeningBelanja
 * @property-read \App\Models\RkasItemReview|null $review
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\RkasItemReview> $reviews
 * @property-read int|null $reviews_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaRkas byBulan($bulan)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaRkas byKegiatan($kodeId)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaRkas byRekening($rekeningId)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaRkas byTahap($tahap, $penganggaranId = null)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaRkas newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaRkas newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaRkas query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaRkas whereAdaNpwp($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaRkas whereBank($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaRkas whereBulan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaRkas whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaRkas whereGolongan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaRkas whereHargaSatuan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaRkas whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaRkas whereJabatan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaRkas whereJumlah($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaRkas whereKinerjaSilpaPenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaRkas whereKodeId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaRkas whereKodeRekeningId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaRkas whereNamaPenerima($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaRkas whereNomorKwitansi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaRkas whereNomorRekening($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaRkas wherePotPph21($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaRkas wherePotPph21Narasumber($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaRkas wherePotPph23($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaRkas wherePotPpn($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaRkas whereSatuan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaRkas whereStatusPenerima($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaRkas whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaRkas whereUraian($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaRkas whereUraianGabungan($value)
 */
	class KinerjaSilpaRkas extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $kinerja_silpa_penganggaran_id
 * @property \Illuminate\Support\Carbon $tanggal_setor
 * @property numeric $jumlah_setor
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\KinerjaSilpaPenganggaran $silpaPenganggaran
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSetorTunai newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSetorTunai newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSetorTunai query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSetorTunai whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSetorTunai whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSetorTunai whereJumlahSetor($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSetorTunai whereKinerjaSilpaPenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSetorTunai whereTanggalSetor($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSetorTunai whereUpdatedAt($value)
 */
	class KinerjaSilpaSetorTunai extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $nomor_sp2b
 * @property string|null $tanggal_sp2b
 * @property string $jenis_periode
 * @property int|null $bulan
 * @property string $tahap
 * @property int $kinerja_silpa_penganggaran_id
 * @property numeric $saldo_awal
 * @property numeric $pendapatan
 * @property numeric $belanja
 * @property numeric $belanja_pegawai
 * @property numeric $belanja_barang_jasa
 * @property numeric $belanja_modal
 * @property numeric $belanja_modal_peralatan_mesin
 * @property numeric $belanja_modal_aset_tetap_lainnya
 * @property numeric $belanja_modal_tanah_bangunan
 * @property numeric $saldo_akhir
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\KinerjaSilpaPenganggaran $silpaPenganggaran
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSp2b newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSp2b newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSp2b query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSp2b whereBelanja($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSp2b whereBelanjaBarangJasa($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSp2b whereBelanjaModal($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSp2b whereBelanjaModalAsetTetapLainnya($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSp2b whereBelanjaModalPeralatanMesin($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSp2b whereBelanjaModalTanahBangunan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSp2b whereBelanjaPegawai($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSp2b whereBulan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSp2b whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSp2b whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSp2b whereJenisPeriode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSp2b whereKinerjaSilpaPenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSp2b whereNomorSp2b($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSp2b wherePendapatan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSp2b whereSaldoAkhir($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSp2b whereSaldoAwal($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSp2b whereTahap($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSp2b whereTanggalSp2b($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSp2b whereUpdatedAt($value)
 */
	class KinerjaSilpaSp2b extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $nomor_surat
 * @property int $kinerja_silpa_penganggaran_id
 * @property int $sekolah_id
 * @property int|null $kinerja_silpa_buku_kas_umum_id
 * @property int|null $kinerja_silpa_penerimaan_dana_id
 * @property string $tahap
 * @property numeric $realisasi_lalu
 * @property numeric $realisasi_ini
 * @property numeric $sisa
 * @property string|null $tanggal_spmth
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\SekolahProfile $sekolah
 * @property-read \App\Models\KinerjaSilpaBukuKasUmum|null $silpaBukuKasUmum
 * @property-read \App\Models\KinerjaSilpaPenerimaanDana|null $silpaPenerimaanDana
 * @property-read \App\Models\KinerjaSilpaPenganggaran $silpaPenganggaran
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSpmth newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSpmth newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSpmth query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSpmth whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSpmth whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSpmth whereKinerjaSilpaBukuKasUmumId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSpmth whereKinerjaSilpaPenerimaanDanaId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSpmth whereKinerjaSilpaPenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSpmth whereNomorSurat($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSpmth whereRealisasiIni($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSpmth whereRealisasiLalu($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSpmth whereSekolahId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSpmth whereSisa($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSpmth whereTahap($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSpmth whereTanggalSpmth($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSpmth whereUpdatedAt($value)
 */
	class KinerjaSilpaSpmth extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $kinerja_silpa_penganggaran_id
 * @property int|null $kinerja_silpa_penerimaan_dana_id
 * @property int|null $kinerja_silpa_buku_kas_umum_id
 * @property string $nomor_sptj
 * @property string $tanggal_sptj
 * @property string $tahap
 * @property numeric $tahap_satu
 * @property numeric $tahap_dua
 * @property numeric $jenis_belanja_pegawai
 * @property numeric $jenis_belanja_barang_jasa
 * @property numeric $jenis_belanja_modal
 * @property numeric $sisa_kas_tunai
 * @property numeric $sisa_dana_di_bank
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\KinerjaSilpaBukuKasUmum|null $silpaBukuKasUmum
 * @property-read \App\Models\KinerjaSilpaPenerimaanDana|null $silpaPenerimaanDana
 * @property-read \App\Models\KinerjaSilpaPenganggaran $silpaPenganggaran
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSptj newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSptj newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSptj query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSptj whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSptj whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSptj whereJenisBelanjaBarangJasa($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSptj whereJenisBelanjaModal($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSptj whereJenisBelanjaPegawai($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSptj whereKinerjaSilpaBukuKasUmumId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSptj whereKinerjaSilpaPenerimaanDanaId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSptj whereKinerjaSilpaPenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSptj whereNomorSptj($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSptj whereSisaDanaDiBank($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSptj whereSisaKasTunai($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSptj whereTahap($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSptj whereTahapDua($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSptj whereTahapSatu($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSptj whereTanggalSptj($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSptj whereUpdatedAt($value)
 */
	class KinerjaSilpaSptj extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $kinerja_silpa_penganggaran_id
 * @property string $nomor_sts
 * @property numeric $jumlah_sts
 * @property \Illuminate\Support\Carbon|null $tanggal_bayar
 * @property bool $is_bkp
 * @property numeric $jumlah_bayar
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\KinerjaSilpaPenganggaran $silpaPenganggaran
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSts newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSts newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSts query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSts whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSts whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSts whereIsBkp($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSts whereJumlahBayar($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSts whereJumlahSts($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSts whereKinerjaSilpaPenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSts whereNomorSts($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSts whereTanggalBayar($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSts whereUpdatedAt($value)
 */
	class KinerjaSilpaSts extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $sekolah_id
 * @property int $kinerja_silpa_penganggaran_id
 * @property int $kinerja_silpa_buku_kas_umum_id
 * @property string|null $nomor_sp
 * @property string|null $tanggal_sp
 * @property string|null $pihak_kesatu_nama
 * @property string|null $pihak_kesatu_nip
 * @property string|null $pihak_kesatu_jabatan
 * @property string|null $pihak_kesatu_instansi
 * @property string|null $pihak_kesatu_alamat
 * @property string|null $pihak_kedua_nama_perusahaan
 * @property string|null $pihak_kedua_penanggung_jawab
 * @property string|null $pihak_kedua_alamat
 * @property string|null $pihak_kedua_npwp
 * @property string|null $pihak_kedua_platform
 * @property string|null $waktu_pengiriman
 * @property string|null $kondisi_barang
 * @property string|null $ketentuan_pembayaran
 * @property string|null $sumber_dana
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\KinerjaSilpaBukuKasUmum $bukuKasUmum
 * @property-read \App\Models\KinerjaSilpaPenganggaran $penganggaran
 * @property-read \App\Models\SekolahProfile $sekolah
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSuratPesanan newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSuratPesanan newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSuratPesanan query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSuratPesanan whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSuratPesanan whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSuratPesanan whereKetentuanPembayaran($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSuratPesanan whereKinerjaSilpaBukuKasUmumId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSuratPesanan whereKinerjaSilpaPenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSuratPesanan whereKondisiBarang($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSuratPesanan whereNomorSp($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSuratPesanan wherePihakKeduaAlamat($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSuratPesanan wherePihakKeduaNamaPerusahaan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSuratPesanan wherePihakKeduaNpwp($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSuratPesanan wherePihakKeduaPenanggungJawab($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSuratPesanan wherePihakKeduaPlatform($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSuratPesanan wherePihakKesatuAlamat($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSuratPesanan wherePihakKesatuInstansi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSuratPesanan wherePihakKesatuJabatan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSuratPesanan wherePihakKesatuNama($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSuratPesanan wherePihakKesatuNip($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSuratPesanan whereSekolahId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSuratPesanan whereSumberDana($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSuratPesanan whereTanggalSp($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSuratPesanan whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaSuratPesanan whereWaktuPengiriman($value)
 */
	class KinerjaSilpaSuratPesanan extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $sekolah_id
 * @property int $kinerja_silpa_penganggaran_id
 * @property int $kode_kegiatan_id
 * @property int $kode_rekening_id
 * @property int $kinerja_silpa_penerimaan_dana_id
 * @property int $kinerja_silpa_buku_kas_umum_id
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\KodeKegiatan $kodeKegiatan
 * @property-read \App\Models\RekeningBelanja $rekeningBelanja
 * @property-read \App\Models\SekolahProfile $sekolah
 * @property-read \App\Models\KinerjaSilpaBukuKasUmum $silpaBukuKasUmum
 * @property-read \App\Models\KinerjaSilpaPenerimaanDana $silpaPenerimaanDana
 * @property-read \App\Models\KinerjaSilpaPenganggaran $silpaPenganggaran
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaTandaTerima newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaTandaTerima newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaTandaTerima query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaTandaTerima whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaTandaTerima whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaTandaTerima whereKinerjaSilpaBukuKasUmumId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaTandaTerima whereKinerjaSilpaPenerimaanDanaId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaTandaTerima whereKinerjaSilpaPenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaTandaTerima whereKodeKegiatanId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaTandaTerima whereKodeRekeningId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaTandaTerima whereSekolahId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSilpaTandaTerima whereUpdatedAt($value)
 */
	class KinerjaSilpaTandaTerima extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $kinerja_penganggaran_id
 * @property string $nomor_sp2b
 * @property string $tanggal_sp2b
 * @property string $jenis_periode
 * @property int|null $bulan
 * @property int|null $tahap
 * @property numeric $saldo_awal
 * @property numeric $pendapatan
 * @property numeric $belanja
 * @property numeric $belanja_pegawai
 * @property numeric $belanja_barang_jasa
 * @property numeric $belanja_modal
 * @property numeric $belanja_modal_peralatan_mesin
 * @property numeric $belanja_modal_aset_tetap_lainnya
 * @property numeric $belanja_modal_tanah_bangunan
 * @property numeric $saldo_akhir
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\KinerjaPenganggaran $kinerjaPenganggaran
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSp2b newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSp2b newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSp2b query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSp2b whereBelanja($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSp2b whereBelanjaBarangJasa($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSp2b whereBelanjaModal($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSp2b whereBelanjaModalAsetTetapLainnya($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSp2b whereBelanjaModalPeralatanMesin($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSp2b whereBelanjaModalTanahBangunan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSp2b whereBelanjaPegawai($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSp2b whereBulan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSp2b whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSp2b whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSp2b whereJenisPeriode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSp2b whereKinerjaPenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSp2b whereNomorSp2b($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSp2b wherePendapatan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSp2b whereSaldoAkhir($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSp2b whereSaldoAwal($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSp2b whereTahap($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSp2b whereTanggalSp2b($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSp2b whereUpdatedAt($value)
 */
	class KinerjaSp2b extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $sekolah_id
 * @property int $kinerja_penganggaran_id
 * @property string $nomor_surat
 * @property int $tahap
 * @property numeric $realisasi_lalu
 * @property numeric $realisasi_ini
 * @property numeric $sisa
 * @property string|null $tanggal_spmth
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\KinerjaBukuKasUmum|null $kinerjaBukuKasUmum
 * @property-read \App\Models\KinerjaPenerimaanDana|null $kinerjaPenerimaanDana
 * @property-read \App\Models\KinerjaPenganggaran $kinerjaPenganggaran
 * @property-read \App\Models\SekolahProfile $sekolah
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSpmth newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSpmth newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSpmth query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSpmth whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSpmth whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSpmth whereKinerjaPenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSpmth whereNomorSurat($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSpmth whereRealisasiIni($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSpmth whereRealisasiLalu($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSpmth whereSekolahId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSpmth whereSisa($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSpmth whereTahap($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSpmth whereTanggalSpmth($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSpmth whereUpdatedAt($value)
 */
	class KinerjaSpmth extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $kinerja_penganggaran_id
 * @property int|null $kinerja_penerimaan_dana_id
 * @property int|null $kinerja_buku_kas_umum_id
 * @property string $nomor_sptj
 * @property string $tanggal_sptj
 * @property int $tahap
 * @property numeric $tahap_satu
 * @property numeric $tahap_dua
 * @property numeric $jenis_belanja_pegawai
 * @property numeric $jenis_belanja_barang_jasa
 * @property numeric $jenis_belanja_modal
 * @property numeric $sisa_kas_tunai
 * @property numeric $sisa_dana_di_bank
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\KinerjaBukuKasUmum|null $kinerjaBukuKasUmum
 * @property-read \App\Models\KinerjaPenerimaanDana|null $kinerjaPenerimaanDana
 * @property-read \App\Models\KinerjaPenganggaran $kinerjaPenganggaran
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSptj newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSptj newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSptj query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSptj whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSptj whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSptj whereJenisBelanjaBarangJasa($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSptj whereJenisBelanjaModal($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSptj whereJenisBelanjaPegawai($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSptj whereKinerjaBukuKasUmumId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSptj whereKinerjaPenerimaanDanaId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSptj whereKinerjaPenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSptj whereNomorSptj($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSptj whereSisaDanaDiBank($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSptj whereSisaKasTunai($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSptj whereTahap($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSptj whereTahapDua($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSptj whereTahapSatu($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSptj whereTanggalSptj($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSptj whereUpdatedAt($value)
 */
	class KinerjaSptj extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $kinerja_penganggaran_id
 * @property string $nomor_sts
 * @property numeric $jumlah_sts
 * @property \Illuminate\Support\Carbon|null $tanggal_bayar
 * @property bool $is_bkp
 * @property numeric $jumlah_bayar
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\KinerjaPenganggaran $kinerjaPenganggaran
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSts newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSts newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSts query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSts whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSts whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSts whereIsBkp($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSts whereJumlahBayar($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSts whereJumlahSts($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSts whereKinerjaPenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSts whereNomorSts($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSts whereTanggalBayar($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSts whereUpdatedAt($value)
 */
	class KinerjaSts extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $sekolah_id
 * @property int $kinerja_penganggaran_id
 * @property int $kinerja_buku_kas_umum_id
 * @property string|null $nomor_sp
 * @property string|null $tanggal_sp
 * @property string|null $pihak_kesatu_nama
 * @property string|null $pihak_kesatu_nip
 * @property string|null $pihak_kesatu_jabatan
 * @property string|null $pihak_kesatu_instansi
 * @property string|null $pihak_kesatu_alamat
 * @property string|null $pihak_kedua_nama_perusahaan
 * @property string|null $pihak_kedua_penanggung_jawab
 * @property string|null $pihak_kedua_alamat
 * @property string|null $pihak_kedua_npwp
 * @property string|null $pihak_kedua_platform
 * @property string|null $waktu_pengiriman
 * @property string|null $kondisi_barang
 * @property string|null $ketentuan_pembayaran
 * @property string|null $sumber_dana
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\KinerjaBukuKasUmum $bukuKasUmum
 * @property-read \App\Models\KinerjaPenganggaran $penganggaran
 * @property-read \App\Models\SekolahProfile $sekolah
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSuratPesanan newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSuratPesanan newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSuratPesanan query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSuratPesanan whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSuratPesanan whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSuratPesanan whereKetentuanPembayaran($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSuratPesanan whereKinerjaBukuKasUmumId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSuratPesanan whereKinerjaPenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSuratPesanan whereKondisiBarang($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSuratPesanan whereNomorSp($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSuratPesanan wherePihakKeduaAlamat($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSuratPesanan wherePihakKeduaNamaPerusahaan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSuratPesanan wherePihakKeduaNpwp($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSuratPesanan wherePihakKeduaPenanggungJawab($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSuratPesanan wherePihakKeduaPlatform($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSuratPesanan wherePihakKesatuAlamat($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSuratPesanan wherePihakKesatuInstansi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSuratPesanan wherePihakKesatuJabatan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSuratPesanan wherePihakKesatuNama($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSuratPesanan wherePihakKesatuNip($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSuratPesanan whereSekolahId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSuratPesanan whereSumberDana($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSuratPesanan whereTanggalSp($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSuratPesanan whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaSuratPesanan whereWaktuPengiriman($value)
 */
	class KinerjaSuratPesanan extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $sekolah_id
 * @property int $kinerja_penganggaran_id
 * @property int $kode_kegiatan_id
 * @property int $kode_rekening_id
 * @property int $kinerja_penerimaan_dana_id
 * @property int $kinerja_buku_kas_umum_id
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\KinerjaBukuKasUmum $kinerjaBukuKasUmum
 * @property-read \App\Models\KinerjaPenerimaanDana $kinerjaPenerimaanDana
 * @property-read \App\Models\KinerjaPenganggaran $kinerjaPenganggaran
 * @property-read \App\Models\KodeKegiatan $kodeKegiatan
 * @property-read \App\Models\RekeningBelanja $rekeningBelanja
 * @property-read \App\Models\SekolahProfile $sekolah
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaTandaTerima newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaTandaTerima newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaTandaTerima query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaTandaTerima whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaTandaTerima whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaTandaTerima whereKinerjaBukuKasUmumId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaTandaTerima whereKinerjaPenerimaanDanaId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaTandaTerima whereKinerjaPenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaTandaTerima whereKodeKegiatanId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaTandaTerima whereKodeRekeningId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaTandaTerima whereSekolahId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KinerjaTandaTerima whereUpdatedAt($value)
 */
	class KinerjaTandaTerima extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $kode
 * @property string $program
 * @property string $sub_program
 * @property string $uraian
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KodeKegiatan newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KodeKegiatan newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KodeKegiatan query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KodeKegiatan whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KodeKegiatan whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KodeKegiatan whereKode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KodeKegiatan whereProgram($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KodeKegiatan whereSubProgram($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KodeKegiatan whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KodeKegiatan whereUraian($value)
 */
	class KodeKegiatan extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $sekolah_id
 * @property int $penganggaran_id
 * @property int $kode_kegiatan_id
 * @property int $kode_rekening_id
 * @property int $penerimaan_dana_id
 * @property int $buku_kas_umum_id
 * @property int $bku_uraian_detail_id
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\BukuKasUmumUraianDetail $bkuUraianDetail
 * @property-read \App\Models\BukuKasUmum $bukuKasUmum
 * @property-read \App\Models\KodeKegiatan $kodeKegiatan
 * @property-read \App\Models\PenerimaanDana $penerimaanDana
 * @property-read \App\Models\Penganggaran $penganggaran
 * @property-read \App\Models\RekeningBelanja $rekeningBelanja
 * @property-read \App\Models\SekolahProfile $sekolah
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Kwitansi newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Kwitansi newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Kwitansi query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Kwitansi whereBkuUraianDetailId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Kwitansi whereBukuKasUmumId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Kwitansi whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Kwitansi whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Kwitansi whereKodeKegiatanId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Kwitansi whereKodeRekeningId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Kwitansi wherePenerimaanDanaId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Kwitansi wherePenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Kwitansi whereSekolahId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Kwitansi whereUpdatedAt($value)
 */
	class Kwitansi extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $sekolah_id
 * @property int $penganggaran_id
 * @property string $semester
 * @property string|null $tanggal_lph
 * @property numeric $penerimaan_anggaran
 * @property numeric $penerimaan_realisasi
 * @property numeric $penerimaan_selisih
 * @property numeric $belanja_operasi_anggaran
 * @property numeric $belanja_operasi_realisasi
 * @property numeric $belanja_operasi_selisih
 * @property numeric $belanja_modal_peralatan_anggaran
 * @property numeric $belanja_modal_peralatan_realisasi
 * @property numeric $belanja_modal_peralatan_selisih
 * @property numeric $belanja_modal_aset_anggaran
 * @property numeric $belanja_modal_aset_realisasi
 * @property numeric $belanja_modal_aset_selisih
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Penganggaran $penganggaran
 * @property-read \App\Models\SekolahProfile $sekolah
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Lph newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Lph newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Lph query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Lph whereBelanjaModalAsetAnggaran($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Lph whereBelanjaModalAsetRealisasi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Lph whereBelanjaModalAsetSelisih($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Lph whereBelanjaModalPeralatanAnggaran($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Lph whereBelanjaModalPeralatanRealisasi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Lph whereBelanjaModalPeralatanSelisih($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Lph whereBelanjaOperasiAnggaran($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Lph whereBelanjaOperasiRealisasi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Lph whereBelanjaOperasiSelisih($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Lph whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Lph whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Lph wherePenerimaanAnggaran($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Lph wherePenerimaanRealisasi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Lph wherePenerimaanSelisih($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Lph wherePenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Lph whereSekolahId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Lph whereSemester($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Lph whereTanggalLph($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Lph whereUpdatedAt($value)
 */
	class Lph extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $penganggaran_id
 * @property \Illuminate\Support\Carbon $tanggal_penarikan
 * @property numeric $jumlah_penarikan
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Penganggaran $penganggaran
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PenarikanTunai newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PenarikanTunai newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PenarikanTunai query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PenarikanTunai whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PenarikanTunai whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PenarikanTunai whereJumlahPenarikan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PenarikanTunai wherePenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PenarikanTunai whereTanggalPenarikan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PenarikanTunai whereUpdatedAt($value)
 */
	class PenarikanTunai extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $penganggaran_id
 * @property numeric|null $saldo_awal
 * @property \Illuminate\Support\Carbon|null $tanggal_saldo_awal
 * @property string $sumber_dana
 * @property numeric $jumlah_dana
 * @property \Illuminate\Support\Carbon|null $tanggal_terima
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Penganggaran $penganggaran
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PenerimaanDana newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PenerimaanDana newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PenerimaanDana query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PenerimaanDana whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PenerimaanDana whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PenerimaanDana whereJumlahDana($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PenerimaanDana wherePenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PenerimaanDana whereSaldoAwal($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PenerimaanDana whereSumberDana($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PenerimaanDana whereTanggalSaldoAwal($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PenerimaanDana whereTanggalTerima($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PenerimaanDana whereUpdatedAt($value)
 */
	class PenerimaanDana extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property numeric $pagu_anggaran
 * @property int $tahun_anggaran
 * @property string $kepala_sekolah
 * @property string $sk_kepala_sekolah
 * @property string $bendahara
 * @property string $sk_bendahara
 * @property string $komite
 * @property string $nip_kepala_sekolah
 * @property string $nip_bendahara
 * @property \Illuminate\Support\Carbon $tanggal_sk_kepala_sekolah
 * @property \Illuminate\Support\Carbon $tanggal_sk_bendahara
 * @property string|null $tanggal_cetak
 * @property string|null $tanggal_perubahan
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property int|null $sekolah_id
 * @property bool $is_trk_saldo_awal
 * @property \Illuminate\Support\Carbon|null $tanggal_trk_saldo_awal
 * @property numeric|null $jumlah_trk_saldo_awal
 * @property string $status_persetujuan
 * @property int|null $persetujuan_oleh
 * @property \Illuminate\Support\Carbon|null $tanggal_persetujuan
 * @property string|null $catatan_persetujuan
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\BukuKasUmum> $bukuKasUmums
 * @property-read int|null $buku_kas_umums_count
 * @property-read mixed $format_tanggal_cetak
 * @property-read mixed $format_tanggal_perubahan
 * @property-read mixed $format_tanggal_sk_bendahara
 * @property-read mixed $format_tanggal_sk_kepsek
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\PenerimaanDana> $penerimaanDanas
 * @property-read int|null $penerimaan_danas_count
 * @property-read \App\Models\User|null $persetujuanUser
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Rkas> $rkas
 * @property-read int|null $rkas_count
 * @property-read \App\Models\SekolahProfile|null $sekolah
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Penganggaran newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Penganggaran newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Penganggaran query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Penganggaran whereBendahara($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Penganggaran whereCatatanPersetujuan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Penganggaran whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Penganggaran whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Penganggaran whereIsTrkSaldoAwal($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Penganggaran whereJumlahTrkSaldoAwal($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Penganggaran whereKepalaSekolah($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Penganggaran whereKomite($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Penganggaran whereNipBendahara($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Penganggaran whereNipKepalaSekolah($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Penganggaran wherePaguAnggaran($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Penganggaran wherePersetujuanOleh($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Penganggaran whereSekolahId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Penganggaran whereSkBendahara($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Penganggaran whereSkKepalaSekolah($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Penganggaran whereStatusPersetujuan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Penganggaran whereTahunAnggaran($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Penganggaran whereTanggalCetak($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Penganggaran whereTanggalPersetujuan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Penganggaran whereTanggalPerubahan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Penganggaran whereTanggalSkBendahara($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Penganggaran whereTanggalSkKepalaSekolah($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Penganggaran whereTanggalTrkSaldoAwal($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Penganggaran whereUpdatedAt($value)
 */
	class Penganggaran extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $id_barang
 * @property string $nama_barang
 * @property string|null $kode_rekening
 * @property string|null $rekening
 * @property string|null $satuan
 * @property float $batas_atas
 * @property int $tahun
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RefBarang newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RefBarang newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RefBarang query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RefBarang whereBatasAtas($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RefBarang whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RefBarang whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RefBarang whereIdBarang($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RefBarang whereKodeRekening($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RefBarang whereNamaBarang($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RefBarang whereRekening($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RefBarang whereSatuan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RefBarang whereTahun($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RefBarang whereUpdatedAt($value)
 */
	class RefBarang extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $penganggaran_id
 * @property string $action
 * @property string $description
 * @property array<array-key, mixed>|null $old_data
 * @property array<array-key, mixed>|null $new_data
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Penganggaran $penganggaran
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RekamanPerubahan newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RekamanPerubahan newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RekamanPerubahan query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RekamanPerubahan whereAction($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RekamanPerubahan whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RekamanPerubahan whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RekamanPerubahan whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RekamanPerubahan whereNewData($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RekamanPerubahan whereOldData($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RekamanPerubahan wherePenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RekamanPerubahan whereUpdatedAt($value)
 */
	class RekamanPerubahan extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $kode_rekening
 * @property string $rincian_objek
 * @property string $kategori
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property bool $is_ppn
 * @property bool $is_pph21
 * @property bool $is_pph22
 * @property bool $is_pph23
 * @property bool $is_pph4
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RekeningBelanja newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RekeningBelanja newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RekeningBelanja query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RekeningBelanja whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RekeningBelanja whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RekeningBelanja whereIsPph21($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RekeningBelanja whereIsPph22($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RekeningBelanja whereIsPph23($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RekeningBelanja whereIsPph4($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RekeningBelanja whereIsPpn($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RekeningBelanja whereKategori($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RekeningBelanja whereKodeRekening($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RekeningBelanja whereRincianObjek($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RekeningBelanja whereUpdatedAt($value)
 */
	class RekeningBelanja extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $kode_id
 * @property int $kode_rekening_id
 * @property int $penganggaran_id
 * @property string $uraian
 * @property numeric $harga_satuan
 * @property string $bulan
 * @property int $jumlah
 * @property string $satuan
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property string|null $nama_penerima
 * @property string|null $jabatan
 * @property string|null $nomor_rekening
 * @property string|null $bank
 * @property bool $ada_npwp
 * @property numeric|null $pot_ppn
 * @property numeric|null $pot_pph23
 * @property numeric|null $pot_pph21
 * @property numeric|null $pot_pph21_narasumber
 * @property string|null $status_penerima
 * @property string|null $golongan
 * @property string|null $uraian_gabungan
 * @property string|null $nomor_kwitansi
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\BukuKasUmumUraianDetail> $bkuUraianDetails
 * @property-read int|null $bku_uraian_details_count
 * @property-read mixed $harga_satuan_formatted
 * @property-read mixed $total_anggaran
 * @property-read mixed $total_anggaran_formatted
 * @property-read \App\Models\KodeKegiatan $kodeKegiatan
 * @property-read \App\Models\Penganggaran $penganggaran
 * @property-read \App\Models\RekeningBelanja $rekeningBelanja
 * @property-read \App\Models\RkasItemReview|null $review
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\RkasItemReview> $reviews
 * @property-read int|null $reviews_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rkas byBulan($bulan)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rkas byKegiatan($kodeId)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rkas byRekening($rekeningId)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rkas byTahap($tahap, $penganggaranId = null)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rkas newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rkas newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rkas query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rkas whereAdaNpwp($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rkas whereBank($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rkas whereBulan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rkas whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rkas whereGolongan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rkas whereHargaSatuan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rkas whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rkas whereJabatan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rkas whereJumlah($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rkas whereKodeId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rkas whereKodeRekeningId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rkas whereNamaPenerima($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rkas whereNomorKwitansi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rkas whereNomorRekening($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rkas wherePenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rkas wherePotPph21($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rkas wherePotPph21Narasumber($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rkas wherePotPph23($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rkas wherePotPpn($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rkas whereSatuan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rkas whereStatusPenerima($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rkas whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rkas whereUraian($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rkas whereUraianGabungan($value)
 */
	class Rkas extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $user_id
 * @property string $reviewable_type
 * @property int $reviewable_id
 * @property string $status
 * @property string|null $catatan
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property string|null $tanggapan_bendahara
 * @property \Illuminate\Support\Carbon|null $revisi_diajukan_at
 * @property-read \Illuminate\Database\Eloquent\Model|\Eloquent $reviewable
 * @property-read \App\Models\User $user
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasItemReview newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasItemReview newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasItemReview query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasItemReview whereCatatan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasItemReview whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasItemReview whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasItemReview whereReviewableId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasItemReview whereReviewableType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasItemReview whereRevisiDiajukanAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasItemReview whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasItemReview whereTanggapanBendahara($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasItemReview whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasItemReview whereUserId($value)
 */
	class RkasItemReview extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $kode_id
 * @property int $kode_rekening_id
 * @property int $penganggaran_id
 * @property string $uraian
 * @property numeric $harga_satuan
 * @property string $bulan
 * @property int $jumlah
 * @property string $satuan
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property string|null $nama_penerima
 * @property string|null $jabatan
 * @property string|null $nomor_rekening
 * @property string|null $bank
 * @property bool $ada_npwp
 * @property numeric|null $pot_ppn
 * @property numeric|null $pot_pph23
 * @property numeric|null $pot_pph21
 * @property numeric|null $pot_pph21_narasumber
 * @property string|null $status_penerima
 * @property string|null $golongan
 * @property string|null $uraian_gabungan
 * @property string|null $nomor_kwitansi
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\BukuKasUmumUraianDetail> $bkuUraianDetails
 * @property-read int|null $bku_uraian_details_count
 * @property-read mixed $harga_satuan_formatted
 * @property-read mixed $total_anggaran
 * @property-read mixed $total_anggaran_formatted
 * @property-read \App\Models\KodeKegiatan $kodeKegiatan
 * @property-read \App\Models\Penganggaran $penganggaran
 * @property-read \App\Models\RekeningBelanja $rekeningBelanja
 * @property-read \App\Models\RkasItemReview|null $review
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\RkasItemReview> $reviews
 * @property-read int|null $reviews_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasPerubahan byBulan($bulan)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasPerubahan byKegiatan($kodeId)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasPerubahan byRekening($rekeningId)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasPerubahan byTahap($tahap, $penganggaranId = null)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasPerubahan newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasPerubahan newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasPerubahan query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasPerubahan whereAdaNpwp($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasPerubahan whereBank($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasPerubahan whereBulan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasPerubahan whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasPerubahan whereGolongan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasPerubahan whereHargaSatuan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasPerubahan whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasPerubahan whereJabatan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasPerubahan whereJumlah($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasPerubahan whereKodeId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasPerubahan whereKodeRekeningId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasPerubahan whereNamaPenerima($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasPerubahan whereNomorKwitansi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasPerubahan whereNomorRekening($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasPerubahan wherePenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasPerubahan wherePotPph21($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasPerubahan wherePotPph21Narasumber($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasPerubahan wherePotPph23($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasPerubahan wherePotPpn($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasPerubahan whereSatuan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasPerubahan whereStatusPenerima($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasPerubahan whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasPerubahan whereUraian($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasPerubahan whereUraianGabungan($value)
 */
	class RkasPerubahan extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $slug
 * @property string $name
 * @property string|null $description
 * @property bool $is_system
 * @property array<array-key, mixed> $permissions
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\User> $users
 * @property-read int|null $users_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Role newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Role newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Role query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Role whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Role whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Role whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Role whereIsSystem($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Role whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Role wherePermissions($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Role whereSlug($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Role whereUpdatedAt($value)
 */
	class Role extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $nama_sekolah
 * @property string $npsn
 * @property string $status_sekolah
 * @property string $jenjang_sekolah
 * @property string $kelurahan_desa
 * @property string $kecamatan
 * @property string $kabupaten_kota
 * @property string $provinsi
 * @property string $alamat
 * @property string|null $kop_surat
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property string|null $website_sync_url
 * @property string|null $website_sync_token
 * @property string|null $logo_daerah
 * @property string|null $logo_sekolah
 * @property string $kop_mode
 * @property string|null $kop_teks_html
 * @property string $kop_jenis
 * @property string $kop_border
 * @property array<array-key, mixed>|null $kop_dokumen
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SekolahProfile newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SekolahProfile newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SekolahProfile query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SekolahProfile whereAlamat($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SekolahProfile whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SekolahProfile whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SekolahProfile whereJenjangSekolah($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SekolahProfile whereKabupatenKota($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SekolahProfile whereKecamatan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SekolahProfile whereKelurahanDesa($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SekolahProfile whereKopBorder($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SekolahProfile whereKopDokumen($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SekolahProfile whereKopJenis($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SekolahProfile whereKopMode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SekolahProfile whereKopSurat($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SekolahProfile whereKopTeksHtml($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SekolahProfile whereLogoDaerah($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SekolahProfile whereLogoSekolah($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SekolahProfile whereNamaSekolah($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SekolahProfile whereNpsn($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SekolahProfile whereProvinsi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SekolahProfile whereStatusSekolah($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SekolahProfile whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SekolahProfile whereWebsiteSyncToken($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SekolahProfile whereWebsiteSyncUrl($value)
 */
	class SekolahProfile extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $penganggaran_id
 * @property \Illuminate\Support\Carbon $tanggal_setor
 * @property numeric $jumlah_setor
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Penganggaran $penganggaran
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SetorTunai newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SetorTunai newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SetorTunai query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SetorTunai whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SetorTunai whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SetorTunai whereJumlahSetor($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SetorTunai wherePenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SetorTunai whereTanggalSetor($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SetorTunai whereUpdatedAt($value)
 */
	class SetorTunai extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $sekolah_id
 * @property int $silpa_penganggaran_id
 * @property int $silpa_buku_kas_umum_id
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
 * @property-read \App\Models\SilpaBukuKasUmum $bukuKasUmum
 * @property-read \App\Models\SilpaPenganggaran $penganggaran
 * @property-read \App\Models\SekolahProfile $sekolah
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBast newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBast newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBast query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBast whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBast whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBast whereNomorBast($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBast wherePihakKeduaAlamat($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBast wherePihakKeduaInstansi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBast wherePihakKeduaJabatan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBast wherePihakKeduaNama($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBast wherePihakPertamaAlamat($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBast wherePihakPertamaInstansi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBast wherePihakPertamaJabatan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBast wherePihakPertamaNama($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBast whereSekolahId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBast whereSilpaBukuKasUmumId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBast whereSilpaPenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBast whereTanggalBast($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBast whereUpdatedAt($value)
 */
	class SilpaBast extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string|null $id_transaksi
 * @property int $silpa_penganggaran_id
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
 * @property string|null $uraian_opsional
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\SilpaBast|null $bast
 * @property-read \App\Models\SilpaDokumen|null $dokumen
 * @property-read \App\Models\KodeKegiatan|null $kodeKegiatan
 * @property-read \App\Models\SilpaKwitansi|null $kwitansi
 * @property-read \App\Models\SilpaPenganggaran $penganggaran
 * @property-read \App\Models\RekeningBelanja|null $rekeningBelanja
 * @property-read \App\Models\SilpaSuratPesanan|null $suratPesanan
 * @property-read \App\Models\SilpaTandaTerima|null $tandaTerima
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\SilpaBukuKasUmumUraianDetail> $uraianDetails
 * @property-read int|null $uraian_details_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBukuKasUmum newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBukuKasUmum newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBukuKasUmum query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBukuKasUmum whereAlamatToko($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBukuKasUmum whereAnggaran($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBukuKasUmum whereBungaBank($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBukuKasUmum whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBukuKasUmum whereDibelanjakan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBukuKasUmum whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBukuKasUmum whereIdTransaksi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBukuKasUmum whereIsBungaRecord($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBukuKasUmum whereJenisTransaksi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBukuKasUmum whereKodeKegiatanId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBukuKasUmum whereKodeMasaPajak($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBukuKasUmum whereNamaPenerimaPembayaran($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBukuKasUmum whereNamaToko($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBukuKasUmum whereNomorNota($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBukuKasUmum whereNpwp($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBukuKasUmum whereNtpn($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBukuKasUmum wherePajak($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBukuKasUmum wherePajakBungaBank($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBukuKasUmum wherePajakDaerah($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBukuKasUmum wherePersenPajak($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBukuKasUmum wherePersenPajakDaerah($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBukuKasUmum whereRekeningBelanjaId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBukuKasUmum whereSilpaPenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBukuKasUmum whereTanggalLapor($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBukuKasUmum whereTanggalTransaksi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBukuKasUmum whereTanggalTutup($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBukuKasUmum whereTotalPajak($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBukuKasUmum whereTotalPajakDaerah($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBukuKasUmum whereTotalTransaksiKotor($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBukuKasUmum whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBukuKasUmum whereUraian($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBukuKasUmum whereUraianOpsional($value)
 */
	class SilpaBukuKasUmum extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $silpa_buku_kas_umum_id
 * @property string $uraian
 * @property int $volume
 * @property string|null $satuan
 * @property numeric $harga_satuan
 * @property numeric $jumlah
 * @property int|null $kode_kegiatan_id
 * @property int|null $rekening_belanja_id
 * @property int|null $silpa_rkas_id
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property string|null $kondisi
 * @property-read \App\Models\KodeKegiatan|null $kodeKegiatan
 * @property-read \App\Models\RekeningBelanja|null $rekeningBelanja
 * @property-read \App\Models\SilpaBukuKasUmum $silpaBukuKasUmum
 * @property-read \App\Models\SilpaRkas|null $silpaRkas
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBukuKasUmumUraianDetail newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBukuKasUmumUraianDetail newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBukuKasUmumUraianDetail query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBukuKasUmumUraianDetail whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBukuKasUmumUraianDetail whereHargaSatuan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBukuKasUmumUraianDetail whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBukuKasUmumUraianDetail whereJumlah($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBukuKasUmumUraianDetail whereKodeKegiatanId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBukuKasUmumUraianDetail whereKondisi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBukuKasUmumUraianDetail whereRekeningBelanjaId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBukuKasUmumUraianDetail whereSatuan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBukuKasUmumUraianDetail whereSilpaBukuKasUmumId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBukuKasUmumUraianDetail whereSilpaRkasId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBukuKasUmumUraianDetail whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBukuKasUmumUraianDetail whereUraian($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaBukuKasUmumUraianDetail whereVolume($value)
 */
	class SilpaBukuKasUmumUraianDetail extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $silpa_penganggaran_id
 * @property int $silpa_buku_kas_umum_id
 * @property string $nama_dokumen
 * @property string $link_drive
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\SilpaBukuKasUmum $silpaBukuKasUmum
 * @property-read \App\Models\SilpaPenganggaran $silpaPenganggaran
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaDokumen newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaDokumen newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaDokumen query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaDokumen whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaDokumen whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaDokumen whereLinkDrive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaDokumen whereNamaDokumen($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaDokumen whereSilpaBukuKasUmumId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaDokumen whereSilpaPenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaDokumen whereUpdatedAt($value)
 */
	class SilpaDokumen extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $sekolah_id
 * @property int $silpa_penganggaran_id
 * @property int $kode_kegiatan_id
 * @property int $kode_rekening_id
 * @property int $silpa_penerimaan_dana_id
 * @property int $silpa_buku_kas_umum_id
 * @property int $silpa_bku_uraian_detail_id
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\KodeKegiatan $kodeKegiatan
 * @property-read \App\Models\RekeningBelanja $rekeningBelanja
 * @property-read \App\Models\SekolahProfile $sekolah
 * @property-read \App\Models\SilpaBukuKasUmum $silpaBukuKasUmum
 * @property-read \App\Models\SilpaPenerimaanDana $silpaPenerimaanDana
 * @property-read \App\Models\SilpaPenganggaran $silpaPenganggaran
 * @property-read \App\Models\SilpaBukuKasUmumUraianDetail $silpaUraianDetail
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaKwitansi newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaKwitansi newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaKwitansi query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaKwitansi whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaKwitansi whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaKwitansi whereKodeKegiatanId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaKwitansi whereKodeRekeningId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaKwitansi whereSekolahId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaKwitansi whereSilpaBkuUraianDetailId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaKwitansi whereSilpaBukuKasUmumId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaKwitansi whereSilpaPenerimaanDanaId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaKwitansi whereSilpaPenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaKwitansi whereUpdatedAt($value)
 */
	class SilpaKwitansi extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $sekolah_id
 * @property int $silpa_penganggaran_id
 * @property string $semester
 * @property string|null $tanggal_lph
 * @property numeric $penerimaan_anggaran
 * @property numeric $penerimaan_realisasi
 * @property numeric $penerimaan_selisih
 * @property numeric $belanja_operasi_anggaran
 * @property numeric $belanja_operasi_realisasi
 * @property numeric $belanja_operasi_selisih
 * @property numeric $belanja_modal_peralatan_anggaran
 * @property numeric $belanja_modal_peralatan_realisasi
 * @property numeric $belanja_modal_peralatan_selisih
 * @property numeric $belanja_modal_aset_anggaran
 * @property numeric $belanja_modal_aset_realisasi
 * @property numeric $belanja_modal_aset_selisih
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\SekolahProfile $sekolah
 * @property-read \App\Models\SilpaPenganggaran $silpaPenganggaran
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaLph newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaLph newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaLph query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaLph whereBelanjaModalAsetAnggaran($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaLph whereBelanjaModalAsetRealisasi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaLph whereBelanjaModalAsetSelisih($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaLph whereBelanjaModalPeralatanAnggaran($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaLph whereBelanjaModalPeralatanRealisasi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaLph whereBelanjaModalPeralatanSelisih($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaLph whereBelanjaOperasiAnggaran($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaLph whereBelanjaOperasiRealisasi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaLph whereBelanjaOperasiSelisih($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaLph whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaLph whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaLph wherePenerimaanAnggaran($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaLph wherePenerimaanRealisasi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaLph wherePenerimaanSelisih($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaLph whereSekolahId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaLph whereSemester($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaLph whereSilpaPenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaLph whereTanggalLph($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaLph whereUpdatedAt($value)
 */
	class SilpaLph extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $silpa_penganggaran_id
 * @property \Illuminate\Support\Carbon $tanggal_penarikan
 * @property numeric $jumlah_penarikan
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\SilpaPenganggaran $silpaPenganggaran
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaPenarikanTunai newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaPenarikanTunai newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaPenarikanTunai query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaPenarikanTunai whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaPenarikanTunai whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaPenarikanTunai whereJumlahPenarikan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaPenarikanTunai whereSilpaPenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaPenarikanTunai whereTanggalPenarikan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaPenarikanTunai whereUpdatedAt($value)
 */
	class SilpaPenarikanTunai extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $silpa_penganggaran_id
 * @property numeric|null $saldo_awal
 * @property \Illuminate\Support\Carbon|null $tanggal_saldo_awal
 * @property string $sumber_dana
 * @property numeric $jumlah_dana
 * @property \Illuminate\Support\Carbon|null $tanggal_terima
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\SilpaPenganggaran $penganggaran
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaPenerimaanDana newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaPenerimaanDana newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaPenerimaanDana query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaPenerimaanDana whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaPenerimaanDana whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaPenerimaanDana whereJumlahDana($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaPenerimaanDana whereSaldoAwal($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaPenerimaanDana whereSilpaPenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaPenerimaanDana whereSumberDana($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaPenerimaanDana whereTanggalSaldoAwal($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaPenerimaanDana whereTanggalTerima($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaPenerimaanDana whereUpdatedAt($value)
 */
	class SilpaPenerimaanDana extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property numeric $pagu_anggaran
 * @property int $tahun_anggaran
 * @property string $kepala_sekolah
 * @property string $sk_kepala_sekolah
 * @property string $bendahara
 * @property string $sk_bendahara
 * @property string $komite
 * @property string $nip_kepala_sekolah
 * @property string $nip_bendahara
 * @property \Illuminate\Support\Carbon $tanggal_sk_kepala_sekolah
 * @property \Illuminate\Support\Carbon $tanggal_sk_bendahara
 * @property string|null $tanggal_cetak
 * @property int|null $sekolah_id
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property string $status_persetujuan
 * @property int|null $persetujuan_oleh
 * @property \Illuminate\Support\Carbon|null $tanggal_persetujuan
 * @property string|null $catatan_persetujuan
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\SilpaBukuKasUmum> $bukuKasUmums
 * @property-read int|null $buku_kas_umums_count
 * @property-read mixed $format_tanggal_cetak
 * @property-read mixed $format_tanggal_perubahan
 * @property-read mixed $format_tanggal_sk_bendahara
 * @property-read mixed $format_tanggal_sk_kepsek
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\SilpaPenerimaanDana> $penerimaanDanas
 * @property-read int|null $penerimaan_danas_count
 * @property-read \App\Models\User|null $persetujuanUser
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\SilpaRkas> $rkas
 * @property-read int|null $rkas_count
 * @property-read \App\Models\SekolahProfile|null $sekolah
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaPenganggaran newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaPenganggaran newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaPenganggaran query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaPenganggaran whereBendahara($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaPenganggaran whereCatatanPersetujuan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaPenganggaran whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaPenganggaran whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaPenganggaran whereKepalaSekolah($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaPenganggaran whereKomite($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaPenganggaran whereNipBendahara($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaPenganggaran whereNipKepalaSekolah($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaPenganggaran wherePaguAnggaran($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaPenganggaran wherePersetujuanOleh($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaPenganggaran whereSekolahId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaPenganggaran whereSkBendahara($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaPenganggaran whereSkKepalaSekolah($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaPenganggaran whereStatusPersetujuan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaPenganggaran whereTahunAnggaran($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaPenganggaran whereTanggalCetak($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaPenganggaran whereTanggalPersetujuan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaPenganggaran whereTanggalSkBendahara($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaPenganggaran whereTanggalSkKepalaSekolah($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaPenganggaran whereUpdatedAt($value)
 */
	class SilpaPenganggaran extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $silpa_penganggaran_id
 * @property int $kode_id
 * @property int $kode_rekening_id
 * @property string $uraian
 * @property numeric $harga_satuan
 * @property string $bulan
 * @property int $jumlah
 * @property string $satuan
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property string|null $nama_penerima
 * @property string|null $jabatan
 * @property string|null $nomor_rekening
 * @property string|null $bank
 * @property bool $ada_npwp
 * @property numeric|null $pot_ppn
 * @property numeric|null $pot_pph23
 * @property numeric|null $pot_pph21
 * @property numeric|null $pot_pph21_narasumber
 * @property string|null $status_penerima
 * @property string|null $golongan
 * @property string|null $uraian_gabungan
 * @property string|null $nomor_kwitansi
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\SilpaBukuKasUmumUraianDetail> $bkuUraianDetails
 * @property-read int|null $bku_uraian_details_count
 * @property-read mixed $harga_satuan_formatted
 * @property-read mixed $total_anggaran
 * @property-read mixed $total_anggaran_formatted
 * @property-read \App\Models\KodeKegiatan $kodeKegiatan
 * @property-read \App\Models\SilpaPenganggaran $penganggaran
 * @property-read \App\Models\RekeningBelanja $rekeningBelanja
 * @property-read \App\Models\RkasItemReview|null $review
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\RkasItemReview> $reviews
 * @property-read int|null $reviews_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaRkas byBulan($bulan)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaRkas byKegiatan($kodeId)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaRkas byRekening($rekeningId)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaRkas byTahap($tahap, $penganggaranId = null)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaRkas newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaRkas newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaRkas query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaRkas whereAdaNpwp($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaRkas whereBank($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaRkas whereBulan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaRkas whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaRkas whereGolongan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaRkas whereHargaSatuan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaRkas whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaRkas whereJabatan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaRkas whereJumlah($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaRkas whereKodeId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaRkas whereKodeRekeningId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaRkas whereNamaPenerima($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaRkas whereNomorKwitansi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaRkas whereNomorRekening($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaRkas wherePotPph21($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaRkas wherePotPph21Narasumber($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaRkas wherePotPph23($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaRkas wherePotPpn($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaRkas whereSatuan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaRkas whereSilpaPenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaRkas whereStatusPenerima($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaRkas whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaRkas whereUraian($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaRkas whereUraianGabungan($value)
 */
	class SilpaRkas extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $silpa_penganggaran_id
 * @property \Illuminate\Support\Carbon $tanggal_setor
 * @property numeric $jumlah_setor
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\SilpaPenganggaran $silpaPenganggaran
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSetorTunai newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSetorTunai newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSetorTunai query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSetorTunai whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSetorTunai whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSetorTunai whereJumlahSetor($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSetorTunai whereSilpaPenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSetorTunai whereTanggalSetor($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSetorTunai whereUpdatedAt($value)
 */
	class SilpaSetorTunai extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $nomor_sp2b
 * @property string|null $tanggal_sp2b
 * @property string $jenis_periode
 * @property int|null $bulan
 * @property string $tahap
 * @property int $silpa_penganggaran_id
 * @property numeric $saldo_awal
 * @property numeric $pendapatan
 * @property numeric $belanja
 * @property numeric $belanja_pegawai
 * @property numeric $belanja_barang_jasa
 * @property numeric $belanja_modal
 * @property numeric $belanja_modal_peralatan_mesin
 * @property numeric $belanja_modal_aset_tetap_lainnya
 * @property numeric $belanja_modal_tanah_bangunan
 * @property numeric $saldo_akhir
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\SilpaPenganggaran $silpaPenganggaran
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSp2b newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSp2b newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSp2b query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSp2b whereBelanja($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSp2b whereBelanjaBarangJasa($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSp2b whereBelanjaModal($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSp2b whereBelanjaModalAsetTetapLainnya($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSp2b whereBelanjaModalPeralatanMesin($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSp2b whereBelanjaModalTanahBangunan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSp2b whereBelanjaPegawai($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSp2b whereBulan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSp2b whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSp2b whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSp2b whereJenisPeriode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSp2b whereNomorSp2b($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSp2b wherePendapatan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSp2b whereSaldoAkhir($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSp2b whereSaldoAwal($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSp2b whereSilpaPenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSp2b whereTahap($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSp2b whereTanggalSp2b($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSp2b whereUpdatedAt($value)
 */
	class SilpaSp2b extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $nomor_surat
 * @property int $silpa_penganggaran_id
 * @property int $sekolah_id
 * @property int|null $silpa_buku_kas_umum_id
 * @property int|null $silpa_penerimaan_dana_id
 * @property string $tahap
 * @property numeric $realisasi_lalu
 * @property numeric $realisasi_ini
 * @property numeric $sisa
 * @property string|null $tanggal_spmth
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\SekolahProfile $sekolah
 * @property-read \App\Models\SilpaBukuKasUmum|null $silpaBukuKasUmum
 * @property-read \App\Models\SilpaPenerimaanDana|null $silpaPenerimaanDana
 * @property-read \App\Models\SilpaPenganggaran $silpaPenganggaran
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSpmth newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSpmth newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSpmth query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSpmth whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSpmth whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSpmth whereNomorSurat($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSpmth whereRealisasiIni($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSpmth whereRealisasiLalu($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSpmth whereSekolahId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSpmth whereSilpaBukuKasUmumId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSpmth whereSilpaPenerimaanDanaId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSpmth whereSilpaPenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSpmth whereSisa($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSpmth whereTahap($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSpmth whereTanggalSpmth($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSpmth whereUpdatedAt($value)
 */
	class SilpaSpmth extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $silpa_penganggaran_id
 * @property int|null $silpa_penerimaan_dana_id
 * @property int|null $silpa_buku_kas_umum_id
 * @property string $nomor_sptj
 * @property string $tanggal_sptj
 * @property string $tahap
 * @property numeric $tahap_satu
 * @property numeric $tahap_dua
 * @property numeric $jenis_belanja_pegawai
 * @property numeric $jenis_belanja_barang_jasa
 * @property numeric $jenis_belanja_modal
 * @property numeric $sisa_kas_tunai
 * @property numeric $sisa_dana_di_bank
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\SilpaBukuKasUmum|null $silpaBukuKasUmum
 * @property-read \App\Models\SilpaPenerimaanDana|null $silpaPenerimaanDana
 * @property-read \App\Models\SilpaPenganggaran $silpaPenganggaran
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSptj newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSptj newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSptj query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSptj whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSptj whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSptj whereJenisBelanjaBarangJasa($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSptj whereJenisBelanjaModal($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSptj whereJenisBelanjaPegawai($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSptj whereNomorSptj($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSptj whereSilpaBukuKasUmumId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSptj whereSilpaPenerimaanDanaId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSptj whereSilpaPenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSptj whereSisaDanaDiBank($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSptj whereSisaKasTunai($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSptj whereTahap($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSptj whereTahapDua($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSptj whereTahapSatu($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSptj whereTanggalSptj($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSptj whereUpdatedAt($value)
 */
	class SilpaSptj extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $silpa_penganggaran_id
 * @property string $nomor_sts
 * @property numeric $jumlah_sts
 * @property \Illuminate\Support\Carbon|null $tanggal_bayar
 * @property bool $is_bkp
 * @property numeric $jumlah_bayar
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\SilpaPenganggaran $silpaPenganggaran
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSts newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSts newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSts query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSts whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSts whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSts whereIsBkp($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSts whereJumlahBayar($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSts whereJumlahSts($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSts whereNomorSts($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSts whereSilpaPenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSts whereTanggalBayar($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSts whereUpdatedAt($value)
 */
	class SilpaSts extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $sekolah_id
 * @property int $silpa_penganggaran_id
 * @property int $silpa_buku_kas_umum_id
 * @property string|null $nomor_sp
 * @property string|null $tanggal_sp
 * @property string|null $pihak_kesatu_nama
 * @property string|null $pihak_kesatu_nip
 * @property string|null $pihak_kesatu_jabatan
 * @property string|null $pihak_kesatu_instansi
 * @property string|null $pihak_kesatu_alamat
 * @property string|null $pihak_kedua_nama_perusahaan
 * @property string|null $pihak_kedua_penanggung_jawab
 * @property string|null $pihak_kedua_alamat
 * @property string|null $pihak_kedua_npwp
 * @property string|null $pihak_kedua_platform
 * @property string|null $waktu_pengiriman
 * @property string|null $kondisi_barang
 * @property string|null $ketentuan_pembayaran
 * @property string|null $sumber_dana
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\SilpaBukuKasUmum $bukuKasUmum
 * @property-read \App\Models\SilpaPenganggaran $penganggaran
 * @property-read \App\Models\SekolahProfile $sekolah
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSuratPesanan newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSuratPesanan newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSuratPesanan query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSuratPesanan whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSuratPesanan whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSuratPesanan whereKetentuanPembayaran($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSuratPesanan whereKondisiBarang($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSuratPesanan whereNomorSp($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSuratPesanan wherePihakKeduaAlamat($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSuratPesanan wherePihakKeduaNamaPerusahaan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSuratPesanan wherePihakKeduaNpwp($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSuratPesanan wherePihakKeduaPenanggungJawab($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSuratPesanan wherePihakKeduaPlatform($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSuratPesanan wherePihakKesatuAlamat($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSuratPesanan wherePihakKesatuInstansi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSuratPesanan wherePihakKesatuJabatan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSuratPesanan wherePihakKesatuNama($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSuratPesanan wherePihakKesatuNip($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSuratPesanan whereSekolahId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSuratPesanan whereSilpaBukuKasUmumId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSuratPesanan whereSilpaPenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSuratPesanan whereSumberDana($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSuratPesanan whereTanggalSp($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSuratPesanan whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaSuratPesanan whereWaktuPengiriman($value)
 */
	class SilpaSuratPesanan extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $sekolah_id
 * @property int $silpa_penganggaran_id
 * @property int $kode_kegiatan_id
 * @property int $kode_rekening_id
 * @property int $silpa_penerimaan_dana_id
 * @property int $silpa_buku_kas_umum_id
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\KodeKegiatan $kodeKegiatan
 * @property-read \App\Models\RekeningBelanja $rekeningBelanja
 * @property-read \App\Models\SekolahProfile $sekolah
 * @property-read \App\Models\SilpaBukuKasUmum $silpaBukuKasUmum
 * @property-read \App\Models\SilpaPenerimaanDana $silpaPenerimaanDana
 * @property-read \App\Models\SilpaPenganggaran $silpaPenganggaran
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaTandaTerima newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaTandaTerima newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaTandaTerima query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaTandaTerima whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaTandaTerima whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaTandaTerima whereKodeKegiatanId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaTandaTerima whereKodeRekeningId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaTandaTerima whereSekolahId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaTandaTerima whereSilpaBukuKasUmumId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaTandaTerima whereSilpaPenerimaanDanaId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaTandaTerima whereSilpaPenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SilpaTandaTerima whereUpdatedAt($value)
 */
	class SilpaTandaTerima extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $folder_id
 * @property int|null $template_id
 * @property string $tipe
 * @property string|null $nomor_surat
 * @property string $perihal
 * @property \Illuminate\Support\Carbon|null $tanggal_surat
 * @property array<array-key, mixed>|null $data_isian
 * @property string|null $file_path
 * @property string|null $file_name_original
 * @property string|null $keterangan
 * @property int|null $created_by
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\SkFolder $folder
 * @property-read \App\Models\SkTemplate|null $template
 * @property-read \App\Models\User|null $user
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SkDokumen newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SkDokumen newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SkDokumen query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SkDokumen whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SkDokumen whereCreatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SkDokumen whereDataIsian($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SkDokumen whereFileNameOriginal($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SkDokumen whereFilePath($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SkDokumen whereFolderId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SkDokumen whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SkDokumen whereKeterangan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SkDokumen whereNomorSurat($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SkDokumen wherePerihal($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SkDokumen whereTanggalSurat($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SkDokumen whereTemplateId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SkDokumen whereTipe($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SkDokumen whereUpdatedAt($value)
 */
	class SkDokumen extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $nama_folder
 * @property string|null $deskripsi
 * @property string $warna
 * @property int|null $created_by
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\SkDokumen> $dokumens
 * @property-read int|null $dokumens_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\SkTemplate> $templates
 * @property-read int|null $templates_count
 * @property-read \App\Models\User|null $user
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SkFolder newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SkFolder newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SkFolder query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SkFolder whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SkFolder whereCreatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SkFolder whereDeskripsi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SkFolder whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SkFolder whereNamaFolder($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SkFolder whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SkFolder whereWarna($value)
 */
	class SkFolder extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $folder_id
 * @property string $judul
 * @property string $file_path
 * @property string $file_name_original
 * @property array<array-key, mixed>|null $detected_variables
 * @property int|null $created_by
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\SkDokumen> $dokumens
 * @property-read int|null $dokumens_count
 * @property-read \App\Models\SkFolder $folder
 * @property-read \App\Models\User|null $user
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SkTemplate newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SkTemplate newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SkTemplate query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SkTemplate whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SkTemplate whereCreatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SkTemplate whereDetectedVariables($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SkTemplate whereFileNameOriginal($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SkTemplate whereFilePath($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SkTemplate whereFolderId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SkTemplate whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SkTemplate whereJudul($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SkTemplate whereUpdatedAt($value)
 */
	class SkTemplate extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $nomor_sp2b
 * @property string|null $tanggal_sp2b
 * @property string $tahap
 * @property int $penganggaran_id
 * @property numeric $saldo_awal
 * @property numeric $pendapatan
 * @property numeric $belanja
 * @property numeric $belanja_pegawai
 * @property numeric $belanja_barang_jasa
 * @property numeric $belanja_modal
 * @property numeric $belanja_modal_peralatan_mesin
 * @property numeric $belanja_modal_aset_tetap_lainnya
 * @property numeric $belanja_modal_tanah_bangunan
 * @property numeric $saldo_akhir
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property string $jenis_periode
 * @property int|null $bulan
 * @property-read \App\Models\Penganggaran $penganggaran
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sp2b newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sp2b newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sp2b query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sp2b whereBelanja($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sp2b whereBelanjaBarangJasa($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sp2b whereBelanjaModal($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sp2b whereBelanjaModalAsetTetapLainnya($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sp2b whereBelanjaModalPeralatanMesin($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sp2b whereBelanjaModalTanahBangunan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sp2b whereBelanjaPegawai($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sp2b whereBulan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sp2b whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sp2b whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sp2b whereJenisPeriode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sp2b whereNomorSp2b($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sp2b wherePendapatan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sp2b wherePenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sp2b whereSaldoAkhir($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sp2b whereSaldoAwal($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sp2b whereTahap($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sp2b whereTanggalSp2b($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sp2b whereUpdatedAt($value)
 */
	class Sp2b extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $nomor_surat
 * @property int $penganggaran_id
 * @property int $sekolah_id
 * @property int|null $buku_kas_umum_id
 * @property int|null $penerimaan_dana_id
 * @property string $tahap
 * @property numeric $realisasi_lalu
 * @property numeric $realisasi_ini
 * @property numeric $sisa
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property string|null $tanggal_spmth
 * @property-read \App\Models\BukuKasUmum|null $bukuKasUmum
 * @property-read \App\Models\Penganggaran $penganggaran
 * @property-read \App\Models\SekolahProfile $sekolah
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Spmth newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Spmth newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Spmth query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Spmth whereBukuKasUmumId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Spmth whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Spmth whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Spmth whereNomorSurat($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Spmth wherePenerimaanDanaId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Spmth wherePenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Spmth whereRealisasiIni($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Spmth whereRealisasiLalu($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Spmth whereSekolahId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Spmth whereSisa($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Spmth whereTahap($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Spmth whereTanggalSpmth($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Spmth whereUpdatedAt($value)
 */
	class Spmth extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $penganggaran_id
 * @property int|null $penerimaan_dana_id
 * @property int|null $buku_kas_umum_id
 * @property string $nomor_sptj
 * @property string $tanggal_sptj
 * @property string $tahap
 * @property numeric $tahap_satu
 * @property numeric $tahap_dua
 * @property numeric $jenis_belanja_pegawai
 * @property numeric $jenis_belanja_barang_jasa
 * @property numeric $jenis_belanja_modal
 * @property numeric $sisa_kas_tunai
 * @property numeric $sisa_dana_di_bank
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\BukuKasUmum|null $bukuKasUmum
 * @property-read \App\Models\PenerimaanDana|null $penerimaanDana
 * @property-read \App\Models\Penganggaran $penganggaran
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sptj newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sptj newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sptj query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sptj whereBukuKasUmumId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sptj whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sptj whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sptj whereJenisBelanjaBarangJasa($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sptj whereJenisBelanjaModal($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sptj whereJenisBelanjaPegawai($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sptj whereNomorSptj($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sptj wherePenerimaanDanaId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sptj wherePenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sptj whereSisaDanaDiBank($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sptj whereSisaKasTunai($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sptj whereTahap($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sptj whereTahapDua($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sptj whereTahapSatu($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sptj whereTanggalSptj($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sptj whereUpdatedAt($value)
 */
	class Sptj extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $penganggaran_id
 * @property string $nomor_sts
 * @property numeric $jumlah_sts
 * @property \Illuminate\Support\Carbon|null $tanggal_bayar
 * @property numeric $jumlah_bayar
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property string|null $tanggal_buku_bank
 * @property bool $is_bkp
 * @property-read \App\Models\Penganggaran $penganggaran
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sts newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sts newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sts query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sts whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sts whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sts whereIsBkp($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sts whereJumlahBayar($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sts whereJumlahSts($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sts whereNomorSts($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sts wherePenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sts whereTanggalBayar($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sts whereTanggalBukuBank($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sts whereUpdatedAt($value)
 */
	class Sts extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $sekolah_id
 * @property int $penganggaran_id
 * @property int $buku_kas_umum_id
 * @property string|null $nomor_sp
 * @property string|null $tanggal_sp
 * @property string|null $pihak_kesatu_nama
 * @property string|null $pihak_kesatu_nip
 * @property string|null $pihak_kesatu_jabatan
 * @property string|null $pihak_kesatu_instansi
 * @property string|null $pihak_kesatu_alamat
 * @property string|null $pihak_kedua_nama_perusahaan
 * @property string|null $pihak_kedua_penanggung_jawab
 * @property string|null $pihak_kedua_alamat
 * @property string|null $pihak_kedua_npwp
 * @property string|null $pihak_kedua_platform
 * @property string|null $waktu_pengiriman
 * @property string|null $kondisi_barang
 * @property string|null $ketentuan_pembayaran
 * @property string|null $sumber_dana
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\BukuKasUmum $bukuKasUmum
 * @property-read \App\Models\Penganggaran $penganggaran
 * @property-read \App\Models\SekolahProfile $sekolah
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SuratPesanan newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SuratPesanan newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SuratPesanan query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SuratPesanan whereBukuKasUmumId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SuratPesanan whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SuratPesanan whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SuratPesanan whereKetentuanPembayaran($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SuratPesanan whereKondisiBarang($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SuratPesanan whereNomorSp($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SuratPesanan wherePenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SuratPesanan wherePihakKeduaAlamat($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SuratPesanan wherePihakKeduaNamaPerusahaan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SuratPesanan wherePihakKeduaNpwp($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SuratPesanan wherePihakKeduaPenanggungJawab($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SuratPesanan wherePihakKeduaPlatform($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SuratPesanan wherePihakKesatuAlamat($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SuratPesanan wherePihakKesatuInstansi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SuratPesanan wherePihakKesatuJabatan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SuratPesanan wherePihakKesatuNama($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SuratPesanan wherePihakKesatuNip($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SuratPesanan whereSekolahId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SuratPesanan whereSumberDana($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SuratPesanan whereTanggalSp($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SuratPesanan whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SuratPesanan whereWaktuPengiriman($value)
 */
	class SuratPesanan extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $sekolah_id
 * @property int $tahun
 * @property string $status
 * @property string|null $message
 * @property array<array-key, mixed>|null $payload
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SyncLog newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SyncLog newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SyncLog query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SyncLog whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SyncLog whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SyncLog whereMessage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SyncLog wherePayload($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SyncLog whereSekolahId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SyncLog whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SyncLog whereTahun($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SyncLog whereUpdatedAt($value)
 */
	class SyncLog extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $sekolah_id
 * @property int $penganggaran_id
 * @property int $kode_kegiatan_id
 * @property int $kode_rekening_id
 * @property int $penerimaan_dana_id
 * @property int $buku_kas_umum_id
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\BukuKasUmum $bukuKasUmum
 * @property-read \App\Models\KodeKegiatan $kodeKegiatan
 * @property-read \App\Models\PenerimaanDana $penerimaanDana
 * @property-read \App\Models\Penganggaran $penganggaran
 * @property-read \App\Models\RekeningBelanja $rekeningBelanja
 * @property-read \App\Models\SekolahProfile $sekolah
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TandaTerima newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TandaTerima newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TandaTerima query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TandaTerima whereBukuKasUmumId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TandaTerima whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TandaTerima whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TandaTerima whereKodeKegiatanId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TandaTerima whereKodeRekeningId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TandaTerima wherePenerimaanDanaId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TandaTerima wherePenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TandaTerima whereSekolahId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TandaTerima whereUpdatedAt($value)
 */
	class TandaTerima extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $name
 * @property string $username
 * @property string $email
 * @property \Illuminate\Support\Carbon|null $email_verified_at
 * @property string $password
 * @property string|null $remember_token
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property string|null $security_code
 * @property bool $is_security_code_enabled
 * @property string|null $deepseek_api_key
 * @property string $deepseek_model_reasoner
 * @property string $deepseek_model_chat
 * @property string $role
 * @property array<array-key, mixed>|null $custom_permissions
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\BkuAuditLog> $bkuAuditLogs
 * @property-read int|null $bku_audit_logs_count
 * @property-read \Illuminate\Notifications\DatabaseNotificationCollection<int, \Illuminate\Notifications\DatabaseNotification> $notifications
 * @property-read int|null $notifications_count
 * @property-read \App\Models\Role|null $roleRecord
 * @method static \Database\Factories\UserFactory factory($count = null, $state = [])
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereCustomPermissions($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereDeepseekApiKey($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereDeepseekModelChat($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereDeepseekModelReasoner($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereEmail($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereEmailVerifiedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereIsSecurityCodeEnabled($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User wherePassword($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereRememberToken($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereRole($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereSecurityCode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereUsername($value)
 */
	class User extends \Eloquent {}
}

