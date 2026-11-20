<?php

namespace App\Services;

use App\Config\VariantConfig;
use App\Models\KodeKegiatan;
use App\Models\RekeningBelanja;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ArkasBkuSyncService
{
    /**
     * Map nama bulan ke indeks angka (1..12).
     *
     * @var array<string, int>
     */
    public const MONTH_MAP = [
        'Januari' => 1,
        'Februari' => 2,
        'Maret' => 3,
        'April' => 4,
        'Mei' => 5,
        'Juni' => 6,
        'Juli' => 7,
        'Agustus' => 8,
        'September' => 9,
        'Oktober' => 10,
        'November' => 11,
        'Desember' => 12,
    ];

    /**
     * Map indeks angka (1..12) ke nama bulan.
     *
     * @var array<int, string>
     */
    public const NUMBER_TO_MONTH = [
        1 => 'Januari',
        2 => 'Februari',
        3 => 'Maret',
        4 => 'April',
        5 => 'Mei',
        6 => 'Juni',
        7 => 'Juli',
        8 => 'Agustus',
        9 => 'September',
        10 => 'Oktober',
        11 => 'November',
        12 => 'Desember',
    ];

    /**
     * Normalisasi kode kegiatan dengan menghapus spasi dan titik di akhir
     * agar '08.04.13' dan '08.04.13.' selalu cocok.
     */
    public function normalizeKodeKegiatan(?string $kode): string
    {
        return rtrim(trim((string) $kode), '.');
    }

    /**
     * Sinkronisasi data BKU dari payload ARKAS ke database newSIKAS dengan evaluasi Dua-Mode per bulan:
     * - Mode 1 (Bulan sudah memiliki transaksi BKU di SIKAS): Safe Match-Only Pairing
     *   (tidak pernah menghapus atau menimpa id_transaksi, nomor_nota, uraian, uraian_opsional SIKAS;
     *   hanya mengisi id_transaksi_arkas, nomor_nota_arkas, uraian_arkas, dan detail.uraian_arkas).
     * - Mode 2 (Bulan masih kosong di BKU SIKAS): Smart Import dengan Format Baku SIKAS + Auto-Split FIFO.
     *
     * @return array{
     *     imported_penerimaan: int,
     *     imported_penarikan: int,
     *     imported_setor: int,
     *     imported_belanja: int,
     *     paired_belanja: int
     * }
     */
    public function sync(
        string $variant,
        $penganggaran,
        array $dumpResult,
        ?int $bulanAngkaFilter = null
    ): array {
        $penganggaranFk = VariantConfig::penganggaranFk($variant);
        $bkuFk = VariantConfig::bkuFk($variant);
        $tahun = (int) $penganggaran->tahun_anggaran;

        $bkuClass = VariantConfig::getModelClass('bku', $variant);
        $detailClass = VariantConfig::getModelClass('bku_uraian_detail', $variant);
        $rkasClass = VariantConfig::getModelClass('rkas', $variant);
        $rkasPerubahanClass = VariantConfig::getModelClass('rkas_perubahan', $variant);
        $penerimaanClass = VariantConfig::getModelClass('penerimaan_dana', $variant);
        $penarikanClass = VariantConfig::getModelClass('penarikan_tunai', $variant);
        $setorClass = VariantConfig::getModelClass('setor_tunai', $variant);

        // 1. Cek keberadaan RKAS
        $rkasCount = $rkasClass::where($penganggaranFk, $penganggaran->id)->count();
        if ($rkasCount === 0) {
            throw new \Exception('Data RKAS belum ada di newSIKAS. Harap tarik atau isi data RKAS terlebih dahulu sebelum menarik BKU.');
        }

        // 2. Preload master data kegiatan & rekening dengan normalisasi kode
        $kegiatanByExact = [];
        $kegiatanByNorm = [];
        $kegiatanNormById = [];
        foreach (KodeKegiatan::all() as $keg) {
            $exact = trim((string) $keg->kode);
            $norm = $this->normalizeKodeKegiatan($exact);
            $kegiatanByExact[$exact] = $keg->id;
            $kegiatanNormById[$keg->id] = $norm;
            if (! isset($kegiatanByNorm[$norm]) || str_ends_with($exact, '.')) {
                $kegiatanByNorm[$norm] = $keg->id;
            }
        }

        $rekeningByKode = [];
        $rekeningObjById = [];
        foreach (RekeningBelanja::all() as $rek) {
            $kodeRek = trim((string) $rek->kode_rekening);
            $rekeningByKode[$kodeRek] = $rek->id;
            $rekeningObjById[$rek->id] = $rek;
        }

        // 3. Preload RKAS & RKAS Perubahan untuk tahun anggaran ini
        $rkasList = $rkasClass::where($penganggaranFk, $penganggaran->id)
            ->with(['kodeKegiatan', 'rekeningBelanja'])
            ->get();
        $rkasPerubahanList = ($rkasPerubahanClass && class_exists($rkasPerubahanClass))
            ? $rkasPerubahanClass::where($penganggaranFk, $penganggaran->id)
                ->with(['kodeKegiatan', 'rekeningBelanja'])
                ->get()
            : collect([]);

        $rkasById = $rkasList->keyBy('id');
        $rkasPerubahanById = $rkasPerubahanList->keyBy('id');

        // 4. Preload seluruh transaksi BKU reguler existing pada tahun anggaran ini
        $allExistingBkus = $bkuClass::where($penganggaranFk, $penganggaran->id)
            ->where('is_bunga_record', false)
            ->with(['kodeKegiatan', 'rekeningBelanja', 'uraianDetails'])
            ->orderBy('id', 'asc')
            ->get();

        // Kelompokkan BKU existing berdasarkan bulan (1..12)
        /** @var array<int, Collection> $existingBkusByMonth */
        $existingBkusByMonth = [];
        for ($m = 1; $m <= 12; $m++) {
            $existingBkusByMonth[$m] = collect([]);
        }
        foreach ($allExistingBkus as $bku) {
            $m = (int) $bku->tanggal_transaksi->format('n');
            $existingBkusByMonth[$m]->push($bku);
        }

        // Tracker pemakaian kuota RKAS & RKAS Perubahan lintas bulan
        $spentRkas = [];
        $spentPerubahan = [];

        $rkasFkTahap1 = VariantConfig::uraianDetailRkasFk($variant, false);
        $rkasFkTahap2 = VariantConfig::uraianDetailRkasFk($variant, true);

        foreach ($allExistingBkus as $bku) {
            foreach ($bku->uraianDetails as $det) {
                $rId = $det->{$rkasFkTahap1} ?? null;
                if ($rId) {
                    $spentRkas[$rId] = ($spentRkas[$rId] ?? 0.0) + (float) $det->volume;
                }
                if ($rkasFkTahap2 !== $rkasFkTahap1) {
                    $rpId = $det->{$rkasFkTahap2} ?? null;
                    if ($rpId) {
                        $spentPerubahan[$rpId] = ($spentPerubahan[$rpId] ?? 0.0) + (float) $det->volume;
                    }
                }
            }
        }

        // 5. Deteksi generator nomor urut id_transaksi SIKAS untuk Mode 2
        $sequenceState = $this->detectIdTransaksiPattern($allExistingBkus, $tahun);

        $importedPenerimaan = 0;
        $importedPenarikan = 0;
        $importedSetor = 0;
        $importedBelanja = 0;
        $pairedBelanja = 0;

        // 6. Sinkronisasi Penerimaan Dana (tanpa menghapus data existing; hindari duplikat)
        if (! empty($dumpResult['penerimaan_dana'])) {
            foreach ($dumpResult['penerimaan_dana'] as $p) {
                $tgl = $p['tanggal_terima'];
                $mNum = (int) date('n', strtotime($tgl));
                if ($bulanAngkaFilter && $mNum !== $bulanAngkaFilter) {
                    continue;
                }

                $sumberDanaTitle = VariantConfig::sumberDanaTahap1($variant);
                if ($variant === VariantConfig::REGULER) {
                    $sumberDanaTitle = ($mNum <= 6) ? 'Bosp Reguler Tahap 1' : 'Bosp Reguler Tahap 2';
                } elseif ($variant === VariantConfig::KINERJA) {
                    $sumberDanaTitle = ($mNum <= 6) ? 'Bosp Kinerja Tahap 1' : 'Bosp Kinerja Tahap 2';
                } else {
                    $options = VariantConfig::sumberDanaOptions($variant);
                    $sumberDanaTitle = $options[0] ?? 'SiLPA BOSP Reguler';
                }

                $alreadyExists = $penerimaanClass::where($penganggaranFk, $penganggaran->id)
                    ->where(function ($q) use ($tgl, $p, $sumberDanaTitle) {
                        $q->where(function ($sub) use ($tgl, $p) {
                            $sub->whereDate('tanggal_terima', $tgl)
                                ->where('jumlah_dana', $p['jumlah_dana']);
                        })->orWhere('sumber_dana', $sumberDanaTitle);
                    })
                    ->exists();

                if (! $alreadyExists) {
                    $penerimaanClass::create([
                        $penganggaranFk => $penganggaran->id,
                        'sumber_dana' => $sumberDanaTitle,
                        'jumlah_dana' => $p['jumlah_dana'],
                        'tanggal_terima' => $tgl,
                    ]);
                    $importedPenerimaan++;
                }
            }
        }

        // 7. Sinkronisasi Penarikan Tunai (tanpa duplikat pada tanggal & jumlah yang sama)
        if (! empty($dumpResult['penarikan_tunai'])) {
            foreach ($dumpResult['penarikan_tunai'] as $pt) {
                $tgl = $pt['tanggal_penarikan'];
                $mNum = (int) date('n', strtotime($tgl));
                if ($bulanAngkaFilter && $mNum !== $bulanAngkaFilter) {
                    continue;
                }

                $alreadyExists = $penarikanClass::where($penganggaranFk, $penganggaran->id)
                    ->whereDate('tanggal_penarikan', $tgl)
                    ->where('jumlah_penarikan', $pt['jumlah_penarikan'])
                    ->exists();

                if (! $alreadyExists) {
                    $penarikanClass::create([
                        $penganggaranFk => $penganggaran->id,
                        'tanggal_penarikan' => $tgl,
                        'jumlah_penarikan' => $pt['jumlah_penarikan'],
                    ]);
                    $importedPenarikan++;
                }
            }
        }

        // 8. Sinkronisasi Setor Tunai (tanpa duplikat pada tanggal & jumlah yang sama)
        if (! empty($dumpResult['setor_tunai'])) {
            foreach ($dumpResult['setor_tunai'] as $st) {
                $tgl = $st['tanggal_setor'];
                $mNum = (int) date('n', strtotime($tgl));
                if ($bulanAngkaFilter && $mNum !== $bulanAngkaFilter) {
                    continue;
                }

                $alreadyExists = $setorClass::where($penganggaranFk, $penganggaran->id)
                    ->whereDate('tanggal_setor', $tgl)
                    ->where('jumlah_setor', $st['jumlah_setor'])
                    ->exists();

                if (! $alreadyExists) {
                    $setorClass::create([
                        $penganggaranFk => $penganggaran->id,
                        'tanggal_setor' => $tgl,
                        'jumlah_setor' => $st['jumlah_setor'],
                    ]);
                    $importedSetor++;
                }
            }
        }

        // 9. Kelompokkan transaksi belanja ARKAS per bulan
        $arkasTxByMonth = [];
        if (! empty($dumpResult['transaksi_belanja'])) {
            foreach ($dumpResult['transaksi_belanja'] as $tx) {
                $mNum = (int) date('n', strtotime($tx['tanggal_transaksi']));
                if ($bulanAngkaFilter && $mNum !== $bulanAngkaFilter) {
                    continue;
                }
                $arkasTxByMonth[$mNum][] = $tx;
            }
        }

        ksort($arkasTxByMonth);

        foreach ($arkasTxByMonth as $mNum => $monthArkasTxs) {
            $existingMonthBkus = $existingBkusByMonth[$mNum] ?? collect([]);

            if ($existingMonthBkus->isNotEmpty()) {
                // =========================================================================
                // MODE 1: Bulan SUDAH memiliki BKU di SIKAS -> Safe Match-Only Pairing
                // =========================================================================
                $pairedInMonth = $this->pairExistingMonthBkus(
                    $existingMonthBkus,
                    $monthArkasTxs,
                    $rkasById,
                    $rkasPerubahanById,
                    $rkasFkTahap1,
                    $rkasFkTahap2,
                    $rekeningByKode,
                    $rekeningObjById
                );
                $pairedBelanja += $pairedInMonth;
                $importedBelanja += $pairedInMonth;
            } else {
                // =========================================================================
                // MODE 2: Bulan MASIH KOSONG di BKU SIKAS -> Import Format SIKAS + Auto-Split FIFO
                // =========================================================================
                $importedInMonth = $this->importEmptyMonthBkus(
                    $variant,
                    $penganggaran,
                    $mNum,
                    $monthArkasTxs,
                    $bkuClass,
                    $detailClass,
                    $rkasClass,
                    $rkasPerubahanClass,
                    $rkasList,
                    $rkasPerubahanList,
                    $kegiatanByExact,
                    $kegiatanByNorm,
                    $kegiatanNormById,
                    $rekeningByKode,
                    $rekeningObjById,
                    $spentRkas,
                    $spentPerubahan,
                    $sequenceState
                );
                $importedBelanja += $importedInMonth;
            }
        }

        // 10. Simpan Status Penutupan Bulan & Bunga Bank (jika belum ada)
        if (! empty($dumpResult['penutupan_bulan'])) {
            foreach ($dumpResult['penutupan_bulan'] as $pb) {
                if (! empty($pb['is_closed']) && ! empty($pb['tanggal_tutup'])) {
                    $pbMonth = (int) ($pb['bulan_angka'] ?? date('n', strtotime($pb['tanggal_tutup'])));
                    if ($bulanAngkaFilter && $pbMonth !== $bulanAngkaFilter) {
                        continue;
                    }

                    $tutupExists = $bkuClass::where($penganggaranFk, $penganggaran->id)
                        ->where('is_bunga_record', true)
                        ->where(function ($q) use ($pbMonth, $tahun) {
                            $q->where(function ($sub) use ($pbMonth, $tahun) {
                                $sub->whereMonth('tanggal_tutup', $pbMonth)
                                    ->whereYear('tanggal_tutup', $tahun);
                            })->orWhere(function ($sub) use ($pbMonth, $tahun) {
                                $sub->whereMonth('tanggal_transaksi', $pbMonth)
                                    ->whereYear('tanggal_transaksi', $tahun);
                            });
                        })
                        ->exists();

                    if (! $tutupExists) {
                        $bkuClass::create([
                            $penganggaranFk => $penganggaran->id,
                            'tanggal_transaksi' => $pb['tanggal_tutup'],
                            'tanggal_tutup' => $pb['tanggal_tutup'],
                            'jenis_transaksi' => 'non-tunai',
                            'is_bunga_record' => true,
                            'bunga_bank' => $pb['bunga_bank'] ?: 0,
                            'pajak_bunga_bank' => $pb['pajak_bunga_bank'] ?: 0,
                            'total_transaksi_kotor' => 0,
                            'dibelanjakan' => 0,
                            'total_pajak' => 0,
                        ]);
                    }
                }
            }
        }

        return [
            'imported_penerimaan' => $importedPenerimaan,
            'imported_penarikan' => $importedPenarikan,
            'imported_setor' => $importedSetor,
            'imported_belanja' => $importedBelanja,
            'paired_belanja' => $pairedBelanja,
        ];
    }

    /**
     * Mode 1: Sandingkan transaksi BKU SIKAS yang sudah ada pada bulan ini dengan data BKU ARKAS
     * tanpa menghapus atau menimpa id_transaksi, nomor_nota, uraian, atau uraian_opsional SIKAS.
     */
    protected function pairExistingMonthBkus(
        Collection $existingMonthBkus,
        array $monthArkasTxs,
        Collection $rkasById,
        Collection $rkasPerubahanById,
        string $rkasFkTahap1,
        string $rkasFkTahap2,
        array $rekeningByKode = [],
        array $rekeningObjById = []
    ): int {
        $claimedSikasIds = [];
        $pairedCount = 0;

        foreach ($monthArkasTxs as $tx) {
            $txKegNorm = $this->normalizeKodeKegiatan($tx['kode_kegiatan'] ?? '');
            $txRekKode = trim((string) ($tx['kode_rekening'] ?? ''));
            $txTotal = (float) ($tx['total_transaksi_kotor'] ?? 0);
            $txToko = strtolower(trim((string) ($tx['nama_toko'] ?? '')));
            $txDate = (string) ($tx['tanggal_transaksi'] ?? '');
            $txNoBukti = ! empty($tx['no_bukti']) ? trim((string) $tx['no_bukti']) : null;

            // Cari kandidat BKU SIKAS pada bulan ini yang memiliki kegiatan, rekening, dan total kotor yang sama
            $candidates = $existingMonthBkus->filter(function ($b) use ($claimedSikasIds, $txKegNorm, $txRekKode, $txTotal) {
                if (isset($claimedSikasIds[$b->id])) {
                    return false;
                }
                $bKeg = $this->normalizeKodeKegiatan($b->kodeKegiatan->kode ?? '');
                $bRek = trim((string) ($b->rekeningBelanja->kode_rekening ?? ''));
                $bTotal = (float) $b->total_transaksi_kotor;

                return $bKeg === $txKegNorm && $bRek === $txRekKode && abs($bTotal - $txTotal) < 1.0;
            });

            // Fallback: jika rekening sempat disesuaikan di SIKAS, cocokkan berdasarkan kegiatan + total kotor
            if ($candidates->isEmpty()) {
                $candidates = $existingMonthBkus->filter(function ($b) use ($claimedSikasIds, $txKegNorm, $txTotal) {
                    if (isset($claimedSikasIds[$b->id])) {
                        return false;
                    }
                    $bKeg = $this->normalizeKodeKegiatan($b->kodeKegiatan->kode ?? '');
                    $bTotal = (float) $b->total_transaksi_kotor;

                    return $bKeg === $txKegNorm && abs($bTotal - $txTotal) < 1.0;
                });
            }

            $matchedBku = $candidates->sortByDesc(function ($b) use ($txDate, $txToko, $txNoBukti) {
                $score = 0;
                if ($txNoBukti && $b->id_transaksi_arkas === $txNoBukti) {
                    $score += 50;
                }
                if ($b->tanggal_transaksi && $b->tanggal_transaksi->format('Y-m-d') === $txDate) {
                    $score += 10;
                }
                $bToko = strtolower(trim((string) ($b->nama_toko ?: $b->nama_penerima_pembayaran ?: '')));
                if ($txToko !== '' && $bToko !== '') {
                    if ($bToko === $txToko) {
                        $score += 25;
                    } elseif (str_contains($bToko, $txToko) || str_contains($txToko, $bToko)) {
                        $score += 15;
                    }
                }

                return $score;
            })->first();

            if (! $matchedBku) {
                continue;
            }

            $claimedSikasIds[$matchedBku->id] = true;
            $pairedCount++;

            $idTransaksiArkas = $txNoBukti ?: (! empty($tx['nomor_nota']) ? trim((string) $tx['nomor_nota']) : null);
            $nomorNotaArkas = ! empty($tx['no_nota']) ? trim((string) $tx['no_nota']) : $idTransaksiArkas;

            // Uraian header BKU pada ARKAS adalah nama rekening belanja (rincian_objek), bukan nama item pertama
            $txRekId = $rekeningByKode[$txRekKode] ?? null;
            $rekeningNama = ($matchedBku->rekeningBelanja && filled($matchedBku->rekeningBelanja->rincian_objek))
                ? trim((string) $matchedBku->rekeningBelanja->rincian_objek)
                : ($txRekId && isset($rekeningObjById[$txRekId]) && filled($rekeningObjById[$txRekId]->rincian_objek)
                    ? trim((string) $rekeningObjById[$txRekId]->rincian_objek)
                    : null);
            $uraianArkas = $rekeningNama ?: (! empty($tx['uraian']) ? trim((string) $tx['uraian']) : null);

            $matchedBku->update([
                'id_transaksi_arkas' => $idTransaksiArkas,
                'nomor_nota_arkas' => $nomorNotaArkas,
                'uraian_arkas' => $uraianArkas,
            ]);

            $txItems = $tx['items'] ?? [];
            foreach ($matchedBku->uraianDetails as $detail) {
                $resolvedArkasUraian = $this->resolveDetailArkasUraianForExisting(
                    $detail,
                    $txItems,
                    $rkasById,
                    $rkasPerubahanById,
                    $rkasFkTahap1,
                    $rkasFkTahap2
                );

                if ($resolvedArkasUraian !== null && $resolvedArkasUraian !== '') {
                    $detail->update([
                        'uraian_arkas' => $resolvedArkasUraian,
                    ]);
                }
            }
        }

        // Backfill detail.uraian_arkas dari relasi RKAS jika ada BKU yang belum tersandingkan tetapi sudah tertaut ke RKAS
        foreach ($existingMonthBkus as $bku) {
            foreach ($bku->uraianDetails as $detail) {
                if (! empty($detail->uraian_arkas)) {
                    continue;
                }
                $fallbackArkas = $this->resolveLinkedRkasArkasUraian(
                    $detail,
                    $rkasById,
                    $rkasPerubahanById,
                    $rkasFkTahap1,
                    $rkasFkTahap2
                );
                if ($fallbackArkas) {
                    $detail->update(['uraian_arkas' => $fallbackArkas]);
                }
            }
        }

        return $pairedCount;
    }

    /**
     * Resolusi uraian_arkas untuk detail BKU existing dari relasi RKAS atau daftar item ARKAS.
     */
    protected function resolveDetailArkasUraianForExisting(
        $detail,
        array $txItems,
        Collection $rkasById,
        Collection $rkasPerubahanById,
        string $rkasFkTahap1,
        string $rkasFkTahap2
    ): ?string {
        $linkedArkas = $this->resolveLinkedRkasArkasUraian(
            $detail,
            $rkasById,
            $rkasPerubahanById,
            $rkasFkTahap1,
            $rkasFkTahap2
        );

        if ($linkedArkas) {
            return $linkedArkas;
        }

        $detailHarga = (float) ($detail->harga_satuan ?? 0);
        foreach ($txItems as $it) {
            if (abs((float) ($it['harga_satuan'] ?? 0) - $detailHarga) < 0.01 && ! empty($it['uraian'])) {
                return trim((string) $it['uraian']);
            }
        }

        if (count($txItems) === 1 && ! empty($txItems[0]['uraian'])) {
            return trim((string) $txItems[0]['uraian']);
        }

        return null;
    }

    /**
     * Ambil uraian_arkas dari baris RKAS / RKAS Perubahan yang tertaut pada detail BKU.
     */
    protected function resolveLinkedRkasArkasUraian(
        $detail,
        Collection $rkasById,
        Collection $rkasPerubahanById,
        string $rkasFkTahap1,
        string $rkasFkTahap2
    ): ?string {
        if ($rkasFkTahap2 !== $rkasFkTahap1 && ! empty($detail->{$rkasFkTahap2})) {
            $rp = $rkasPerubahanById->get($detail->{$rkasFkTahap2});
            if ($rp && filled($rp->uraian_arkas)) {
                return trim((string) $rp->uraian_arkas);
            }
        }

        if (! empty($detail->{$rkasFkTahap1})) {
            $rkas = $rkasById->get($detail->{$rkasFkTahap1});
            if ($rkas && filled($rkas->uraian_arkas)) {
                return trim((string) $rkas->uraian_arkas);
            }
        }

        return null;
    }

    /**
     * Mode 2: Import transaksi BKU pada bulan yang masih kosong di SIKAS dengan:
     * - Format id_transaksi SIKAS berurutan + id_transaksi_arkas asli ARKAS
     * - Format uraian "Lunas Bayar ..." & uraian_opsional "Lunas bayar belanja ..." + uraian_arkas asli ARKAS
     * - Auto-Split FIFO item belanja terhadap baris RKAS / RKAS Perubahan SIKAS.
     */
    protected function importEmptyMonthBkus(
        string $variant,
        $penganggaran,
        int $mNum,
        array $monthArkasTxs,
        string $bkuClass,
        string $detailClass,
        string $rkasClass,
        ?string $rkasPerubahanClass,
        Collection $rkasList,
        Collection $rkasPerubahanList,
        array $kegiatanByExact,
        array $kegiatanByNorm,
        array $kegiatanNormById,
        array $rekeningByKode,
        array $rekeningObjById,
        array &$spentRkas,
        array &$spentPerubahan,
        array &$sequenceState
    ): int {
        $penganggaranFk = VariantConfig::penganggaranFk($variant);
        $bkuFk = VariantConfig::bkuFk($variant);
        $isTahap2 = $mNum >= 7;
        $usePerubahanPool = $isTahap2 && $rkasPerubahanList->isNotEmpty();
        $targetPool = $usePerubahanPool ? $rkasPerubahanList : $rkasList;
        $spentPool = &$spentRkas;
        if ($usePerubahanPool) {
            $spentPool = &$spentPerubahan;
        }
        $rkasFkKey = VariantConfig::uraianDetailRkasFk($variant, $usePerubahanPool);
        $activeRkasModelClass = ($usePerubahanPool && $rkasPerubahanClass) ? $rkasPerubahanClass : $rkasClass;
        $bulanName = self::NUMBER_TO_MONTH[$mNum] ?? 'Januari';

        $importedCount = 0;

        foreach ($monthArkasTxs as $tx) {
            $txKegRaw = trim((string) ($tx['kode_kegiatan'] ?? ''));
            $txKegNorm = $this->normalizeKodeKegiatan($txKegRaw);
            $txRekRaw = trim((string) ($tx['kode_rekening'] ?? ''));

            $kegId = $kegiatanByExact[$txKegRaw] ?? ($kegiatanByNorm[$txKegNorm] ?? null);
            $rekId = $rekeningByKode[$txRekRaw] ?? null;

            $idTransaksiArkas = ! empty($tx['no_bukti'])
                ? trim((string) $tx['no_bukti'])
                : (! empty($tx['nomor_nota']) ? trim((string) $tx['nomor_nota']) : null);

            if (empty($idTransaksiArkas)) {
                $dateClean = str_replace('-', '', $tx['tanggal_transaksi']);
                $idTransaksiArkas = 'TRX-'.$dateClean.'-'.strtoupper(substr(md5(uniqid((string) mt_rand(), true)), 0, 4));
            }

            $nomorNotaArkas = ! empty($tx['no_nota']) ? trim((string) $tx['no_nota']) : $idTransaksiArkas;
            $sikasIdTransaksi = $this->nextSikasIdTransaksi($sequenceState, $isTahap2);
            $sikasNomorNota = ! empty($tx['no_nota']) ? trim((string) $tx['no_nota']) : null;

            // Alokasikan setiap item belanja ke baris RKAS dengan Auto-Split FIFO
            $preparedDetailRows = [];
            $firstMatchedRkas = null;

            foreach ($tx['items'] ?? [] as $item) {
                $itemKegRaw = trim((string) ($item['kode_kegiatan'] ?? $txKegRaw));
                $itemKegNorm = $this->normalizeKodeKegiatan($itemKegRaw);
                $itemRekRaw = trim((string) ($item['kode_rekening'] ?? $txRekRaw));

                $itemKegId = $kegiatanByExact[$itemKegRaw] ?? ($kegiatanByNorm[$itemKegNorm] ?? $kegId);
                $itemRekId = $rekeningByKode[$itemRekRaw] ?? $rekId;

                $slices = $this->allocateItemFifo(
                    $item,
                    $itemKegNorm,
                    $itemRekId,
                    $mNum,
                    $targetPool,
                    $spentPool,
                    $kegiatanNormById
                );

                foreach ($slices as $slice) {
                    /** @var mixed $matchedRkas */
                    $matchedRkas = $slice['rkas'];
                    if ($matchedRkas && ! $firstMatchedRkas) {
                        $firstMatchedRkas = $matchedRkas;
                    }

                    $resolvedKegId = $matchedRkas ? $matchedRkas->kode_id : $itemKegId;
                    $resolvedRekId = $matchedRkas ? $matchedRkas->kode_rekening_id : $itemRekId;
                    $resolvedSikasUraian = ($matchedRkas && $slice['use_rkas_uraian'])
                        ? $matchedRkas->uraian
                        : $item['uraian'];
                    $resolvedArkasUraian = ! empty($item['uraian'])
                        ? trim((string) $item['uraian'])
                        : ($matchedRkas && filled($matchedRkas->uraian_arkas) ? trim((string) $matchedRkas->uraian_arkas) : null);

                    $sliceVol = $slice['volume'];
                    $sliceHarga = (float) ($item['harga_satuan'] ?? 0);
                    $sliceTotal = ($slice['is_full_item'] && isset($item['item_total']))
                        ? (float) $item['item_total']
                        : round($sliceVol * $sliceHarga, 2);

                    $preparedDetailRows[] = [
                        'uraian' => $resolvedSikasUraian,
                        'uraian_arkas' => $resolvedArkasUraian,
                        'volume' => $sliceVol,
                        'satuan' => $item['satuan'],
                        'harga_satuan' => $sliceHarga,
                        'jumlah' => $sliceTotal,
                        'kode_kegiatan_id' => $resolvedKegId,
                        'rekening_belanja_id' => $resolvedRekId,
                        $rkasFkKey => $matchedRkas ? $matchedRkas->id : null,
                        'kondisi' => 'Baik',
                    ];
                }
            }

            // Gunakan kode_id dari baris RKAS yang cocok agar konsisten dengan kode_id di tabel RKAS
            if ($firstMatchedRkas) {
                $kegId = $firstMatchedRkas->kode_id;
                $rekId = $firstMatchedRkas->kode_rekening_id;
            }

            // Format uraian header SIKAS ("Lunas Bayar {rincian_objek}") & uraian_opsional ("Lunas bayar belanja {item}")
            $rekeningObj = $rekId ? ($rekeningObjById[$rekId] ?? null) : null;
            $sikasHeaderUraian = $rekeningObj && ! empty($rekeningObj->rincian_objek)
                ? 'Lunas Bayar '.$rekeningObj->rincian_objek
                : (! empty($tx['uraian']) ? 'Lunas Bayar '.$tx['uraian'] : 'Lunas Bayar Belanja');

            $firstDetailSikasUraian = ! empty($preparedDetailRows[0]['uraian'])
                ? trim((string) $preparedDetailRows[0]['uraian'])
                : trim((string) ($tx['uraian'] ?? ''));

            $sikasUraianOpsional = $firstDetailSikasUraian !== ''
                ? (stripos($firstDetailSikasUraian, 'lunas bayar') === 0
                    ? $firstDetailSikasUraian
                    : 'Lunas bayar belanja '.lcfirst($firstDetailSikasUraian))
                : null;

            // Hitung anggaran bulan ini untuk rekening belanja tersebut
            $totalAnggaran = 0;
            if ($rekId) {
                $totalAnggaran = (float) $activeRkasModelClass::query()
                    ->where($penganggaranFk, $penganggaran->id)
                    ->where('kode_rekening_id', $rekId)
                    ->where('bulan', $bulanName)
                    ->sum(DB::raw('harga_satuan * jumlah'));
            }
            if ($totalAnggaran <= 0) {
                $totalAnggaran = (float) ($tx['total_transaksi_kotor'] ?? 0);
            }

            $arkasHeaderUraian = ($rekeningObj && filled($rekeningObj->rincian_objek))
                ? trim((string) $rekeningObj->rincian_objek)
                : (! empty($tx['uraian']) ? trim((string) $tx['uraian']) : null);

            $bku = $bkuClass::create([
                $penganggaranFk => $penganggaran->id,
                'id_transaksi' => $sikasIdTransaksi,
                'id_transaksi_arkas' => $idTransaksiArkas,
                'tanggal_transaksi' => $tx['tanggal_transaksi'],
                'kode_kegiatan_id' => $kegId,
                'rekening_belanja_id' => $rekId,
                'uraian' => $sikasHeaderUraian,
                'uraian_opsional' => $sikasUraianOpsional,
                'uraian_arkas' => $arkasHeaderUraian,
                'jenis_transaksi' => $tx['jenis_transaksi'],
                'anggaran' => $totalAnggaran,
                'total_transaksi_kotor' => $tx['total_transaksi_kotor'],
                'dibelanjakan' => $tx['dibelanjakan'],
                'pajak' => ($tx['pajak'] !== 'Tanpa Pajak') ? $tx['pajak'] : null,
                'persen_pajak' => $tx['persen_pajak'] ?: null,
                'total_pajak' => $tx['total_pajak'] ?: 0,
                'ntpn' => ! empty($tx['ntpn']) ? $tx['ntpn'] : null,
                'tanggal_lapor' => ! empty($tx['tanggal_lapor']) ? $tx['tanggal_lapor'] : null,
                'nama_toko' => $tx['nama_toko'] ?: null,
                'alamat_toko' => $tx['alamat_toko'] ?: null,
                'npwp' => $tx['npwp'] ?: null,
                'nomor_nota' => $sikasNomorNota,
                'nomor_nota_arkas' => $nomorNotaArkas,
                'is_bunga_record' => false,
            ]);

            foreach ($preparedDetailRows as $detailRow) {
                $detailRow[$bkuFk] = $bku->id;
                $detailClass::create($detailRow);
            }

            $importedCount++;
        }

        return $importedCount;
    }

    /**
     * Alokasikan 1 item BKU ARKAS ke 1 atau beberapa baris RKAS SIKAS menggunakan Auto-Split FIFO.
     *
     * @return array<int, array{rkas: mixed, volume: float|int, use_rkas_uraian: bool, is_full_item: bool}>
     */
    protected function allocateItemFifo(
        array $item,
        string $itemKegNorm,
        ?int $itemRekId,
        int $txMonth,
        Collection $targetPool,
        array &$spentPool,
        array $kegiatanNormById
    ): array {
        $rapbsUraianClean = strtolower(trim((string) ($item['rapbs_uraian'] ?? '')));
        $itemUraianClean = strtolower(trim((string) ($item['uraian'] ?? '')));
        $itemHarga = (float) ($item['harga_satuan'] ?? 0);
        $neededVol = (float) ($item['volume'] ?? 0);

        $matchesKegRek = function ($r) use ($itemKegNorm, $itemRekId, $kegiatanNormById) {
            if ($r->kode_rekening_id != $itemRekId) {
                return false;
            }
            $rKegNorm = $kegiatanNormById[$r->kode_id] ?? $this->normalizeKodeKegiatan($r->kodeKegiatan->kode ?? '');

            return $rKegNorm === $itemKegNorm;
        };

        $matchesUraian = function ($r) use ($matchesKegRek, $rapbsUraianClean, $itemUraianClean) {
            if (! $matchesKegRek($r)) {
                return false;
            }

            $rArkas = strtolower(trim((string) ($r->uraian_arkas ?? '')));
            $rSikas = strtolower(trim((string) ($r->uraian ?? '')));

            if ($rArkas !== '' && ($rArkas === $rapbsUraianClean || $rArkas === $itemUraianClean)) {
                return true;
            }

            return $rSikas !== '' && ($rSikas === $rapbsUraianClean || $rSikas === $itemUraianClean);
        };

        $sortChronological = function ($r) use ($txMonth) {
            $m = self::MONTH_MAP[$r->bulan] ?? 99;
            $sameTahap = ($txMonth >= 7 && $m >= 7) || ($txMonth <= 6 && $m <= 6);
            $beforeOrAtTx = $m <= $txMonth;
            $priority = ($sameTahap && $beforeOrAtTx) ? 0 : ($sameTahap ? 1 : 2);

            return sprintf('%d-%02d-%08d', $priority, $m, $r->id);
        };

        // Pass 1: Cocok Kegiatan + Rekening + Uraian (Arkas/SIKAS) + Harga Satuan
        $candidates = $targetPool->filter(function ($r) use ($matchesUraian, $itemHarga) {
            return $matchesUraian($r) && abs((float) $r->harga_satuan - $itemHarga) < 0.01;
        })->sortBy($sortChronological)->values();

        $useRkasUraian = true;

        // Pass 2: Cocok Kegiatan + Rekening + Uraian (Arkas/SIKAS)
        if ($candidates->isEmpty()) {
            $candidates = $targetPool->filter($matchesUraian)->sortBy($sortChronological)->values();
        }

        // Pass 3: Cocok Kegiatan + Rekening + Harga Satuan yang masih punya kuota tersedia
        if ($candidates->isEmpty()) {
            $candidates = $targetPool->filter(function ($r) use ($matchesKegRek, $itemHarga, $spentPool) {
                if (! $matchesKegRek($r) || abs((float) $r->harga_satuan - $itemHarga) >= 0.01) {
                    return false;
                }
                $avail = (float) $r->jumlah - ($spentPool[$r->id] ?? 0.0);

                return $avail > 0.0001;
            })->sortBy($sortChronological)->values();
        }

        // Pass 4: Fallback Kegiatan + Rekening (hanya untuk mengisi FK, tetap gunakan uraian item jika tidak cocok uraian/harga)
        if ($candidates->isEmpty()) {
            $candidates = $targetPool->filter($matchesKegRek)->sortBy($sortChronological)->values();
            $useRkasUraian = false;
        }

        // Pass 5: Tidak ada baris RKAS untuk kegiatan + rekening ini -> jangan fallback ke $targetPool->first()!
        if ($candidates->isEmpty()) {
            return [[
                'rkas' => null,
                'volume' => $item['volume'],
                'use_rkas_uraian' => false,
                'is_full_item' => true,
            ]];
        }

        // Alokasi Auto-Split FIFO berdasarkan sisa kuota masing-masing baris kandidat
        $remaining = $neededVol;
        $slices = [];

        foreach ($candidates as $cand) {
            $avail = max(0.0, (float) $cand->jumlah - ($spentPool[$cand->id] ?? 0.0));
            if ($avail <= 0.0001) {
                continue;
            }

            $take = min($remaining, $avail);
            $spentPool[$cand->id] = ($spentPool[$cand->id] ?? 0.0) + $take;
            $remaining -= $take;

            $slices[] = [
                'rkas' => $cand,
                'volume' => $this->normalizeVolumeValue($take),
                'use_rkas_uraian' => $useRkasUraian,
                'is_full_item' => false,
            ];

            if ($remaining <= 0.0001) {
                break;
            }
        }

        // Jika masih ada sisa volume (overflow karena perubahan volume RKAS), tambahkan ke slice terakhir atau kandidat pertama
        if ($remaining > 0.0001) {
            if (! empty($slices)) {
                $lastIdx = count($slices) - 1;
                $lastRkas = $slices[$lastIdx]['rkas'];
                $newVol = (float) $slices[$lastIdx]['volume'] + $remaining;
                $slices[$lastIdx]['volume'] = $this->normalizeVolumeValue($newVol);
                $spentPool[$lastRkas->id] = ($spentPool[$lastRkas->id] ?? 0.0) + $remaining;
            } else {
                $firstCand = $candidates->first();
                $spentPool[$firstCand->id] = ($spentPool[$firstCand->id] ?? 0.0) + $neededVol;
                $slices[] = [
                    'rkas' => $firstCand,
                    'volume' => $this->normalizeVolumeValue($neededVol),
                    'use_rkas_uraian' => $useRkasUraian,
                    'is_full_item' => true,
                ];
            }
        }

        if (count($slices) === 1) {
            $slices[0]['is_full_item'] = true;
        }

        return $slices;
    }

    /**
     * Rapikan nilai volume agar bilangan bulat tetap bertipe int.
     */
    protected function normalizeVolumeValue(float $val): int|float
    {
        $rounded = round($val, 4);
        if (abs($rounded - round($rounded)) < 0.0001) {
            return (int) round($rounded);
        }

        return $rounded;
    }

    /**
     * Deteksi pola id_transaksi SIKAS yang sudah digunakan pada tahun anggaran ini
     * (mis. '054/BOSP/THP-I/2026' atau 'BPU-031').
     *
     * @return array{type: string, max_seq: int, pad_len: int, prefix: string, suffix: string, tahun: int}
     */
    protected function detectIdTransaksiPattern(Collection $existingBkus, int $tahun): array
    {
        $maxSeq = 0;
        $patternType = 'bosp_slash';
        $padLen = 3;
        $prefix = 'BOSP/THP-';
        $suffix = '/'.$tahun;

        foreach ($existingBkus as $bku) {
            $idTx = trim((string) ($bku->id_transaksi ?? ''));
            if (preg_match('/^(\d+)\/(.+?THP-)(I|II)(\/.*)$/i', $idTx, $m)) {
                $patternType = 'bosp_slash';
                $seq = (int) $m[1];
                if ($seq > $maxSeq) {
                    $maxSeq = $seq;
                    $padLen = max(3, strlen($m[1]));
                    $prefix = $m[2];
                    $suffix = $m[4];
                }
            } elseif (preg_match('/^BPU-(\d+)$/i', $idTx, $m)) {
                if ($maxSeq === 0 || $patternType === 'bpu_dash') {
                    $patternType = 'bpu_dash';
                    $seq = (int) $m[1];
                    if ($seq > $maxSeq) {
                        $maxSeq = $seq;
                        $padLen = max(3, strlen($m[1]));
                    }
                }
            }
        }

        return [
            'type' => $patternType,
            'max_seq' => $maxSeq,
            'pad_len' => $padLen,
            'prefix' => $prefix,
            'suffix' => $suffix,
            'tahun' => $tahun,
        ];
    }

    /**
     * Hasilkan nomor id_transaksi SIKAS berikutnya sesuai pola tahun anggaran aktif.
     */
    protected function nextSikasIdTransaksi(array &$sequenceState, bool $isTahap2): string
    {
        $sequenceState['max_seq']++;
        $numStr = str_pad((string) $sequenceState['max_seq'], $sequenceState['pad_len'], '0', STR_PAD_LEFT);

        if ($sequenceState['type'] === 'bpu_dash') {
            return 'BPU-'.$numStr;
        }

        $tahapRoman = $isTahap2 ? 'II' : 'I';

        return $numStr.'/'.$sequenceState['prefix'].$tahapRoman.$sequenceState['suffix'];
    }
}
