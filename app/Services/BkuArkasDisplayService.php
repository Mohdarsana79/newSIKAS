<?php

namespace App\Services;

use App\Config\VariantConfig;
use Illuminate\Http\Request;

class BkuArkasDisplayService
{
    /**
     * Cek apakah request meminta tampilan/cetak mode BKU ARKAS.
     */
    public function isArkasMode(?Request $request = null): bool
    {
        $req = $request ?? request();
        if (! $req) {
            return false;
        }

        return strtolower(trim((string) $req->input('bku_mode', $req->query('bku_mode', 'sikas')))) === 'arkas';
    }

    /**
     * Ambil nomor bukti sesuai mode aktif (BPU01/BNU01 untuk ARKAS, id_transaksi untuk SIKAS).
     */
    public function resolveNoBukti($bku, bool $isArkasMode, string $fallback = '-'): string
    {
        if ($isArkasMode && filled($bku->id_transaksi_arkas ?? null)) {
            return trim((string) $bku->id_transaksi_arkas);
        }

        if (filled($bku->id_transaksi ?? null)) {
            return trim((string) $bku->id_transaksi);
        }

        if (filled($bku->nomor_nota ?? null)) {
            return trim((string) $bku->nomor_nota);
        }

        return $fallback;
    }

    /**
     * Ambil uraian header transaksi sesuai mode aktif (dipakai untuk baris pajak dan fallback tanpa rincian).
     */
    public function resolveHeaderUraian($bku, bool $isArkasMode, string $fallback = 'Transaksi Tanpa Uraian'): string
    {
        if ($isArkasMode) {
            if ($bku->rekeningBelanja && filled($bku->rekeningBelanja->rincian_objek)) {
                return trim((string) $bku->rekeningBelanja->rincian_objek);
            }
            if (filled($bku->uraian_arkas ?? null)) {
                return trim((string) $bku->uraian_arkas);
            }
        }

        $sikas = $bku->uraian_opsional ?: $bku->uraian;

        return filled($sikas) ? trim((string) $sikas) : $fallback;
    }

    /**
     * Muat peta lookup uraian_arkas dari RKAS & RKAS Perubahan dalam 1 batch query per penganggaran.
     *
     * @return array{rkas: array<int, string>, perubahan: array<int, string>, fk1: string, fk2: string}
     */
    public function loadRkasArkasMaps(string $variant, int $penganggaranId): array
    {
        $penganggaranFk = VariantConfig::penganggaranFk($variant);
        $rkasClass = VariantConfig::getModelClass('rkas', $variant);
        $rkasPerubahanClass = VariantConfig::getModelClass('rkas_perubahan', $variant);

        $rkasMap = $rkasClass::query()
            ->where($penganggaranFk, $penganggaranId)
            ->whereNotNull('uraian_arkas')
            ->pluck('uraian_arkas', 'id')
            ->toArray();

        $perubahanMap = ($rkasPerubahanClass && class_exists($rkasPerubahanClass))
            ? $rkasPerubahanClass::query()
                ->where($penganggaranFk, $penganggaranId)
                ->whereNotNull('uraian_arkas')
                ->pluck('uraian_arkas', 'id')
                ->toArray()
            : [];

        return [
            'rkas' => $rkasMap,
            'perubahan' => $perubahanMap,
            'fk1' => VariantConfig::uraianDetailRkasFk($variant, false),
            'fk2' => VariantConfig::uraianDetailRkasFk($variant, true),
        ];
    }

    /**
     * Resolusi uraian barang ARKAS untuk 1 baris BukuKasUmumUraianDetail dengan fallback bersih.
     *
     * @param  array{rkas: array<int, string>, perubahan: array<int, string>, fk1: string, fk2: string}|null  $rkasMaps
     */
    public function resolveDetailArkasUraian($detail, ?array $rkasMaps = null): string
    {
        if (filled($detail->uraian_arkas ?? null)) {
            return trim((string) $detail->uraian_arkas);
        }

        if ($rkasMaps) {
            $fk1 = $rkasMaps['fk1'];
            $fk2 = $rkasMaps['fk2'];

            if ($fk2 !== $fk1 && ! empty($detail->{$fk2}) && isset($rkasMaps['perubahan'][$detail->{$fk2}])) {
                $val = trim((string) $rkasMaps['perubahan'][$detail->{$fk2}]);
                if ($val !== '') {
                    return $val;
                }
            }

            if (! empty($detail->{$fk1}) && isset($rkasMaps['rkas'][$detail->{$fk1}])) {
                $val = trim((string) $rkasMaps['rkas'][$detail->{$fk1}]);
                if ($val !== '') {
                    return $val;
                }
            }
        }

        return trim((string) ($detail->uraian ?? '-'));
    }

    /**
     * Pecah 1 transaksi BKU menjadi baris per item barang format cetak BKU resmi ARKAS Desktop.
     * Item dalam nota yang sama dengan (uraian_arkas, harga_satuan) identik digabung agar identik
     * dengan cetakan BKU ARKAS (mis. Tinta Printer Red/Blue/Yellow -> 1 baris Tinta Printer Warna- vol 3).
     *
     * @param  array{rkas: array<int, string>, perubahan: array<int, string>, fk1: string, fk2: string}|null  $rkasMaps
     * @return array<int, array{
     *     uraian: string,
     *     volume: int|float,
     *     satuan: string,
     *     harga_satuan: float,
     *     jumlah: float,
     *     kode_kegiatan: string,
     *     kode_rekening: string
     * }>
     */
    public function expandArkasItems($bku, ?array $rkasMaps = null, bool $enforceTotalBalance = true): array
    {
        $details = $bku->uraianDetails ?? collect([]);
        $parentKeg = $bku->kodeKegiatan->kode ?? '-';
        $parentRek = $bku->rekeningBelanja->kode_rekening ?? '-';
        $parentTotal = (float) ($bku->total_transaksi_kotor ?? 0);

        if ($details->isEmpty()) {
            return [[
                'uraian' => $this->resolveHeaderUraian($bku, true),
                'volume' => 1,
                'satuan' => '',
                'harga_satuan' => $parentTotal,
                'jumlah' => $parentTotal,
                'kode_kegiatan' => $parentKeg,
                'kode_rekening' => $parentRek,
            ]];
        }

        $grouped = [];
        $detailsTotalSum = 0.0;

        foreach ($details as $detail) {
            $arkasUraian = $this->resolveDetailArkasUraian($detail, $rkasMaps);
            $hargaSatuan = (float) ($detail->harga_satuan ?? 0);
            $volume = (float) ($detail->volume ?? 0);
            $jumlah = (float) ($detail->jumlah ?? ($volume * $hargaSatuan));
            $detailsTotalSum += $jumlah;

            $kegKode = $detail->kodeKegiatan?->kode ?? $parentKeg;
            $rekKode = $detail->rekeningBelanja?->kode_rekening ?? $parentRek;

            // Kunci agregasi dalam 1 nota: uraian_arkas + harga_satuan + kode_rekening
            $key = strtolower(trim($arkasUraian)).'|'.number_format($hargaSatuan, 2, '.', '').'|'.$rekKode;

            if (! isset($grouped[$key])) {
                $grouped[$key] = [
                    'uraian' => $arkasUraian,
                    'volume' => $volume,
                    'satuan' => (string) ($detail->satuan ?? ''),
                    'harga_satuan' => $hargaSatuan,
                    'jumlah' => $jumlah,
                    'kode_kegiatan' => $kegKode,
                    'kode_rekening' => $rekKode,
                ];
            } else {
                $grouped[$key]['volume'] += $volume;
                $grouped[$key]['jumlah'] += $jumlah;
            }
        }

        // Guard keseimbangan akuntansi: jika total rincian tidak sama dengan total kotor header, fallback ke 1 baris header
        if ($enforceTotalBalance && abs($detailsTotalSum - $parentTotal) >= 1.0) {
            return [[
                'uraian' => $this->resolveHeaderUraian($bku, true),
                'volume' => 1,
                'satuan' => '',
                'harga_satuan' => $parentTotal,
                'jumlah' => $parentTotal,
                'kode_kegiatan' => $parentKeg,
                'kode_rekening' => $parentRek,
            ]];
        }

        return array_values(array_map(function (array $row) {
            $vol = $row['volume'];
            if (abs($vol - round($vol)) < 0.0001) {
                $row['volume'] = (int) round($vol);
            } else {
                $row['volume'] = round($vol, 4);
            }
            $row['jumlah'] = round($row['jumlah'], 2);

            return $row;
        }, $grouped));
    }
}
