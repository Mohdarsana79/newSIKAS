<?php

namespace App\Services\Ai;

use App\Config\VariantConfig;
use App\Models\Sekolah;
use Illuminate\Support\Facades\DB;

class CalkDataAggregator
{
    /**
     * Mengumpulkan dan mengagregasi data keuangan riil dari database PostgreSQL SIKAS.
     */
    public function aggregate(string $variant, int $tahun, string $periode = 'tahunan'): array
    {
        $startMonth = 1;
        $endMonth = 12;
        $periodeLabel = 'Tahun Anggaran Penuh (Januari - Desember)';

        if ($periode === 'tahap_1') {
            $startMonth = 1;
            $endMonth = 6;
            $periodeLabel = 'Tahap 1 (Januari - Juni)';
        } elseif ($periode === 'tahap_2') {
            $startMonth = 7;
            $endMonth = 12;
            $periodeLabel = 'Tahap 2 (Juli - Desember)';
        }

        $sekolah = Sekolah::first();
        $penganggaranClass = VariantConfig::getModelClass('penganggaran', $variant);
        $bkuClass = VariantConfig::getModelClass('bku', $variant);
        $penerimaanClass = VariantConfig::getModelClass('penerimaan_dana', $variant);
        $penarikanClass = VariantConfig::getModelClass('penarikan_tunai', $variant);
        $setorClass = VariantConfig::getModelClass('setor_tunai', $variant);
        $fk = VariantConfig::penganggaranFk($variant);

        $penganggaran = $penganggaranClass::where('tahun_anggaran', $tahun)->first();
        $paguAnggaran = $penganggaran ? (float) ($penganggaran->total_anggaran ?? $penganggaran->pendapatan ?? 0) : 0.0;

        // 1. Penerimaan Dana
        $totalPenerimaan = 0.0;
        $penerimaanTahap1 = 0.0;
        $penerimaanTahap2 = 0.0;

        if ($penganggaran) {
            $penerimaanQuery = $penerimaanClass::where($fk, $penganggaran->id)
                ->whereYear('tanggal_terima', $tahun)
                ->whereBetween(DB::raw('EXTRACT(MONTH FROM tanggal_terima)'), [$startMonth, $endMonth]);

            $totalPenerimaan = (float) (clone $penerimaanQuery)->sum('jumlah_dana');

            // Breakdown Tahap 1 & Tahap 2
            $penerimaanTahap1 = (float) $penerimaanClass::where($fk, $penganggaran->id)
                ->whereYear('tanggal_terima', $tahun)
                ->whereBetween(DB::raw('EXTRACT(MONTH FROM tanggal_terima)'), [1, 6])
                ->sum('jumlah_dana');

            $penerimaanTahap2 = (float) $penerimaanClass::where($fk, $penganggaran->id)
                ->whereYear('tanggal_terima', $tahun)
                ->whereBetween(DB::raw('EXTRACT(MONTH FROM tanggal_terima)'), [7, 12])
                ->sum('jumlah_dana');
        }

        // 2. Realisasi Belanja (BKU)
        $totalBelanja = 0.0;
        $belanjaPegawai = 0.0;
        $belanjaBarangJasa = 0.0;
        $belanjaModal = 0.0;
        $belanjaPemeliharaan = 0.0;
        $topKegiatan = [];

        if ($penganggaran) {
            $bkuPeriodQuery = $bkuClass::where($fk, $penganggaran->id)
                ->whereYear('tanggal_transaksi', $tahun)
                ->whereBetween(DB::raw('EXTRACT(MONTH FROM tanggal_transaksi)'), [$startMonth, $endMonth])
                ->where('is_bunga_record', false);

            $totalBelanja = (float) (clone $bkuPeriodQuery)->sum('nominal_transaksi');

            // Pengelompokan Jenis Akun Belanja
            $belanjaItems = (clone $bkuPeriodQuery)->get();
            foreach ($belanjaItems as $item) {
                $kode = (string) ($item->kode_rekening ?? $item->rekening_belanja ?? '');
                $uraian = strtolower((string) ($item->uraian_belanja ?? $item->nama_kegiatan ?? ''));
                $nom = (float) ($item->nominal_transaksi ?? 0);

                if (str_starts_with($kode, '5.2') || str_contains($uraian, 'modal') || str_contains($uraian, 'laptop') || str_contains($uraian, 'komputer') || str_contains($uraian, 'alat')) {
                    $belanjaModal += $nom;
                } elseif (str_starts_with($kode, '5.1.01') || str_contains($uraian, 'honor') || str_contains($uraian, 'gaji')) {
                    $belanjaPegawai += $nom;
                } elseif (str_contains($uraian, 'pemeliharaan') || str_contains($uraian, 'rehab') || str_contains($uraian, 'perbaikan')) {
                    $belanjaPemeliharaan += $nom;
                    $belanjaBarangJasa += $nom;
                } else {
                    $belanjaBarangJasa += $nom;
                }
            }

            // Top 5 Kegiatan Terbesar
            $topKegiatan = (clone $bkuPeriodQuery)
                ->select('nama_kegiatan', DB::raw('SUM(nominal_transaksi) as total_nominal'), DB::raw('COUNT(*) as total_transaksi'))
                ->groupBy('nama_kegiatan')
                ->orderByDesc('total_nominal')
                ->limit(5)
                ->get()
                ->map(fn($k) => [
                    'nama_kegiatan' => $k->nama_kegiatan ?: 'Belanja Operasional Sekolah',
                    'nominal' => (float) $k->total_nominal,
                    'transaksi_count' => (int) $k->total_transaksi,
                ])
                ->toArray();
        }

        // 3. Saldo Kas & Penarikan / Setor
        $totalPenarikan = 0.0;
        $totalSetor = 0.0;
        if ($penganggaran) {
            $totalPenarikan = (float) $penarikanClass::where($fk, $penganggaran->id)
                ->whereYear('tanggal_penarikan', $tahun)
                ->whereBetween(DB::raw('EXTRACT(MONTH FROM tanggal_penarikan)'), [$startMonth, $endMonth])
                ->sum('jumlah_penarikan');

            $totalSetor = (float) $setorClass::where($fk, $penganggaran->id)
                ->whereYear('tanggal_setor', $tahun)
                ->whereBetween(DB::raw('EXTRACT(MONTH FROM tanggal_setor)'), [$startMonth, $endMonth])
                ->sum('jumlah_setor');
        }

        // Estimasi Saldo Kas Akhir Periode
        $sisaDana = max(0, $totalPenerimaan - $totalBelanja);
        $saldoTunai = max(0, $totalPenarikan - $totalBelanja - $totalSetor);
        $saldoBank = max(0, $sisaDana - $saldoTunai);

        $persentaseSerapan = $paguAnggaran > 0 ? round(($totalBelanja / $paguAnggaran) * 100, 2) : 0.0;

        return [
            'sekolah' => [
                'nama' => $sekolah->nama_sekolah ?? 'Satuan Pendidikan',
                'npsn' => $sekolah->npsn ?? '-',
                'alamat' => $sekolah->alamat ?? '-',
                'kecamatan' => $sekolah->kecamatan ?? '-',
                'kabupaten' => $sekolah->kabupaten ?? '-',
                'provinsi' => $sekolah->provinsi ?? '-',
                'kepala_sekolah' => $sekolah->nama_kepala_sekolah ?? 'Kepala Sekolah',
                'nip_kepala_sekolah' => $sekolah->nip_kepala_sekolah ?? '-',
                'bendahara' => $sekolah->nama_bendahara ?? 'Bendahara BOSP',
                'nip_bendahara' => $sekolah->nip_bendahara ?? '-',
            ],
            'tahun' => $tahun,
            'periode' => $periode,
            'periode_label' => $periodeLabel,
            'variant' => $variant,
            'variant_title' => VariantConfig::title($variant),
            'finansial' => [
                'pagu_anggaran' => $paguAnggaran,
                'total_penerimaan' => $totalPenerimaan,
                'penerimaan_tahap_1' => $penerimaanTahap1,
                'penerimaan_tahap_2' => $penerimaanTahap2,
                'total_belanja' => $totalBelanja,
                'persentase_serapan' => $persentaseSerapan,
                'belanja_pegawai' => $belanjaPegawai,
                'belanja_barang_jasa' => $belanjaBarangJasa,
                'belanja_modal' => $belanjaModal,
                'belanja_pemeliharaan' => $belanjaPemeliharaan,
                'sisa_anggaran' => max(0, $paguAnggaran - $totalBelanja),
                'saldo_kas_total' => $sisaDana,
                'saldo_kas_bank' => $saldoBank,
                'saldo_kas_tunai' => $saldoTunai,
                'total_penarikan_tunai' => $totalPenarikan,
                'total_setor_tunai' => $totalSetor,
            ],
            'top_kegiatan' => $topKegiatan,
        ];
    }
}
