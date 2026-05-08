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
 * @property int|null $persen_pajak
 * @property numeric $total_pajak
 * @property string|null $pajak_daerah
 * @property int|null $persen_pajak_daerah
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
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\BukuKasUmum> $bukuKasUmums
 * @property-read int|null $buku_kas_umums_count
 * @property-read mixed $format_tanggal_cetak
 * @property-read mixed $format_tanggal_perubahan
 * @property-read mixed $format_tanggal_sk_bendahara
 * @property-read mixed $format_tanggal_sk_kepsek
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\PenerimaanDana> $penerimaanDanas
 * @property-read int|null $penerimaan_danas_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Rkas> $rkas
 * @property-read int|null $rkas_count
 * @property-read \App\Models\SekolahProfile|null $sekolah
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Penganggaran newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Penganggaran newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Penganggaran query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Penganggaran whereBendahara($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Penganggaran whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Penganggaran whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Penganggaran whereIsTrkSaldoAwal($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Penganggaran whereJumlahTrkSaldoAwal($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Penganggaran whereKepalaSekolah($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Penganggaran whereKomite($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Penganggaran whereNipBendahara($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Penganggaran whereNipKepalaSekolah($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Penganggaran wherePaguAnggaran($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Penganggaran whereSekolahId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Penganggaran whereSkBendahara($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Penganggaran whereSkKepalaSekolah($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Penganggaran whereTahunAnggaran($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Penganggaran whereTanggalCetak($value)
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
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\BukuKasUmumUraianDetail> $bkuUraianDetails
 * @property-read int|null $bku_uraian_details_count
 * @property-read mixed $harga_satuan_formatted
 * @property-read mixed $total_anggaran
 * @property-read mixed $total_anggaran_formatted
 * @property-read \App\Models\KodeKegiatan $kodeKegiatan
 * @property-read \App\Models\Penganggaran $penganggaran
 * @property-read \App\Models\RekeningBelanja $rekeningBelanja
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rkas byBulan($bulan)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rkas byKegiatan($kodeId)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rkas byRekening($rekeningId)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rkas byTahap($tahap, $penganggaranId = null)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rkas newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rkas newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rkas query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rkas whereBulan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rkas whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rkas whereHargaSatuan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rkas whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rkas whereJumlah($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rkas whereKodeId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rkas whereKodeRekeningId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rkas wherePenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rkas whereSatuan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rkas whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Rkas whereUraian($value)
 */
	class Rkas extends \Eloquent {}
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
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\BukuKasUmumUraianDetail> $bkuUraianDetails
 * @property-read int|null $bku_uraian_details_count
 * @property-read mixed $harga_satuan_formatted
 * @property-read mixed $total_anggaran
 * @property-read mixed $total_anggaran_formatted
 * @property-read \App\Models\KodeKegiatan $kodeKegiatan
 * @property-read \App\Models\Penganggaran $penganggaran
 * @property-read \App\Models\RekeningBelanja $rekeningBelanja
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasPerubahan byBulan($bulan)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasPerubahan byKegiatan($kodeId)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasPerubahan byRekening($rekeningId)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasPerubahan byTahap($tahap, $penganggaranId = null)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasPerubahan newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasPerubahan newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasPerubahan query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasPerubahan whereBulan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasPerubahan whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasPerubahan whereHargaSatuan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasPerubahan whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasPerubahan whereJumlah($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasPerubahan whereKodeId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasPerubahan whereKodeRekeningId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasPerubahan wherePenganggaranId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasPerubahan whereSatuan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasPerubahan whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RkasPerubahan whereUraian($value)
 */
	class RkasPerubahan extends \Eloquent {}
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
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SekolahProfile whereKopSurat($value)
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
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sp2b whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Sp2b whereId($value)
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
 * @property-read \Illuminate\Notifications\DatabaseNotificationCollection<int, \Illuminate\Notifications\DatabaseNotification> $notifications
 * @property-read int|null $notifications_count
 * @method static \Database\Factories\UserFactory factory($count = null, $state = [])
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereEmail($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereEmailVerifiedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereIsSecurityCodeEnabled($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User wherePassword($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereRememberToken($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereSecurityCode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereUsername($value)
 */
	class User extends \Eloquent {}
}

