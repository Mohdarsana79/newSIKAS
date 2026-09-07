<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Rincian Pencairan</title>
</head>
<body>

    <table>
        <tr>
            <td>Program</td>
            <td>:</td>
            <td colspan="9">{{ strtoupper($anggaran['sumber_dana'] ?? 'BOS REGULER') }}</td>
        </tr>
        <tr>
            <td>Kegiatan</td>
            <td>:</td>
            <td colspan="9">Daftar Rincian Pencairan {{ $anggaran['sumber_dana'] ?? 'BOS Reguler' }} Tahap {{ $tahap ?? 1 }} {{ isset($bulan) && $bulan !== 'Semua' ? 'Bulan ' . $bulan : '' }} Tahun {{ $anggaran['tahun_anggaran'] ?? '' }}</td>
        </tr>
        <tr>
            <td>Nama Satuan</td>
            <td>:</td>
            <td colspan="9">{{ $anggaran['sekolah']['nama_sekolah'] ?? '-' }}</td>
        </tr>
        <tr>
            <td>NPSN</td>
            <td>:</td>
            <td colspan="9">{{ $anggaran['sekolah']['npsn'] ?? '-' }}</td>
        </tr>
        <tr>
            <td>Kecamatan</td>
            <td>:</td>
            <td colspan="9">{{ $anggaran['sekolah']['kecamatan'] ?? '-' }}</td>
        </tr>
        <tr>
            <td colspan="11"></td>
        </tr>
    </table>

    <table border="1">
        <thead>
            <tr>
                <th rowspan="2">No</th>
                <th rowspan="2">Nama Kegiatan</th>
                <th rowspan="2">Bulan</th>
                <th rowspan="2">No. Kwitansi</th>
                <th rowspan="2">Nama Penerima</th>
                <th rowspan="2">Jabatan</th>
                <th rowspan="2">Jumlah Anggaran (Rp)</th>
                <th rowspan="2">Pot. PPN 11%</th>
                <th rowspan="2">Pot. PPH 23 Badan 2%</th>
                <th rowspan="2">Pot. PPH 21</th>
                <th rowspan="2">Jumlah Yang Diterima (Rp)</th>
                <th rowspan="2">Nomor Rekening</th>
                <th rowspan="2">Bank</th>
            </tr>
            <tr></tr>
            <tr>
                <th>1</th>
                <th>2</th>
                <th>3</th>
                <th>4</th>
                <th>5</th>
                <th>6</th>
                <th>7</th>
                <th>8</th>
                <th>9</th>
                <th>10</th>
                <th>11</th>
                <th>12</th>
            </tr>
        </thead>
        <tbody>
            @php
                $no = 1;
                $totalAnggaran = 0;
                $totalPpn = 0;
                $totalPph23 = 0;
                $totalPph21 = 0;
                $totalDiterima = 0;
                $tahap = $tahap ?? 1;

                $groupedItems = [];
                foreach($tahapanData as $progCode => $program) {
                    if(isset($program['sub_programs'])) {
                        foreach($program['sub_programs'] as $subCode => $subProgram) {
                            if(isset($subProgram['uraian_programs'])) {
                                foreach($subProgram['uraian_programs'] as $urCode => $urProgram) {
                                    if(isset($urProgram['items'])) {
                                        foreach($urProgram['items'] as $item) {
                                            $jumlahAnggaran = 0;
                                            if (isset($bulan) && $bulan !== 'Semua') {
                                                if (isset($item['bulanan']) && isset($item['bulanan'][$bulan])) {
                                                    $jumlahAnggaran = $item['bulanan'][$bulan]['total'] ?? 0;
                                                }
                                            } else {
                                                $jumlahAnggaran = $tahap == 1 ? ($item['tahap1'] ?? 0) : ($item['tahap2'] ?? 0);
                                            }
                                            
                                            if($jumlahAnggaran > 0) {
                                                $currentUraianGabungan = $tahap == 1 ? ($item['uraian_gabungan_t1'] ?? null) : ($item['uraian_gabungan_t2'] ?? null);
                                                $displayUraian = !empty($currentUraianGabungan) ? $currentUraianGabungan : $item['uraian'];
                                                $key = $item['kode_rekening_id'] . '-' . $displayUraian;
                                                
                                                if (!isset($groupedItems[$key])) {
                                                    $groupedItems[$key] = $item;
                                                    $groupedItems[$key]['uraian'] = $displayUraian;
                                                    $groupedItems[$key]['tahap_anggaran'] = 0;
                                                    $groupedItems[$key]['pot_ppn_total'] = 0;
                                                    $groupedItems[$key]['pot_pph23_total'] = 0;
                                                    $groupedItems[$key]['pot_pph21_total'] = 0;
                                                    $groupedItems[$key]['rkas_ids'] = [];
                                                }
                                                if (!empty($item['rkas_ids'])) {
                                                    $groupedItems[$key]['rkas_ids'] = array_merge($groupedItems[$key]['rkas_ids'], $item['rkas_ids']);
                                                } elseif (!empty($item['id'])) {
                                                    $groupedItems[$key]['rkas_ids'][] = $item['id'];
                                                }
                                                
                                                $ppn = 0;
                                                $pph23 = 0;
                                                $pph21_total = 0;

                                                if (isset($bulan) && $bulan !== 'Semua') {
                                                    if (isset($item['bulanan']) && isset($item['bulanan'][$bulan])) {
                                                        $ppn = $item['bulanan'][$bulan]['pot_ppn'] ?? 0;
                                                        $pph23 = $item['bulanan'][$bulan]['pot_pph23'] ?? 0;
                                                        $pph21_total = ($item['bulanan'][$bulan]['pot_pph21'] ?? 0) + ($item['bulanan'][$bulan]['pot_pph21_narasumber'] ?? 0);
                                                    }
                                                } else {
                                                    $ppn = $tahap == 1 ? ($item['pot_ppn_t1'] ?? 0) : ($item['pot_ppn_t2'] ?? 0);
                                                    $pph23 = $tahap == 1 ? ($item['pot_pph23_t1'] ?? 0) : ($item['pot_pph23_t2'] ?? 0);
                                                    $pph21_total = $tahap == 1 ? (($item['pot_pph21_t1'] ?? 0) + ($item['pot_pph21_narasumber_t1'] ?? 0)) : (($item['pot_pph21_t2'] ?? 0) + ($item['pot_pph21_narasumber_t2'] ?? 0));
                                                }
                                                
                                                $groupedItems[$key]['tahap_anggaran'] += $jumlahAnggaran;
                                                $groupedItems[$key]['pot_ppn_total'] += $ppn;
                                                $groupedItems[$key]['pot_pph23_total'] += $pph23;
                                                $groupedItems[$key]['pot_pph21_total'] += $pph21_total;
                                                
                                                if (empty($groupedItems[$key]['nama_penerima']) && !empty($item['nama_penerima'])) {
                                                    $groupedItems[$key]['nama_penerima'] = $item['nama_penerima'];
                                                    $groupedItems[$key]['jabatan'] = $item['jabatan'];
                                                    $groupedItems[$key]['nomor_rekening'] = $item['nomor_rekening'];
                                                    $groupedItems[$key]['bank'] = $item['bank'];
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            @endphp

            @foreach($groupedItems as $item)
                @php
                    $diterima = $item['tahap_anggaran'] - $item['pot_ppn_total'] - $item['pot_pph23_total'] - $item['pot_pph21_total'];
                    
                    $totalAnggaran += $item['tahap_anggaran'];
                    $totalPpn += $item['pot_ppn_total'];
                    $totalPph23 += $item['pot_pph23_total'];
                    $totalPph21 += $item['pot_pph21_total'];
                    $totalDiterima += $diterima;

                    $bulanTampil = '-';
                    $relevantMonths = [];
                    
                    if (isset($bulan) && $bulan !== 'Semua') {
                        $bulanTampil = $bulan;
                        $relevantMonths = [$bulan];
                    } else {
                        $TAHAP_1_MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
                        $TAHAP_2_MONTHS = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                        $relevantMonths = $tahap == 1 ? $TAHAP_1_MONTHS : $TAHAP_2_MONTHS;
                        
                        if (!empty($item['bulanan'])) {
                            $bulanKeys = array_keys($item['bulanan']);
                            $tahapBulan = [];
                            foreach($bulanKeys as $b) {
                                if (in_array($b, $relevantMonths)) {
                                    $tahapBulan[] = $b;
                                }
                            }
                            $bulanTampil = !empty($tahapBulan) ? implode(', ', $tahapBulan) : '-';
                        }
                    }

                    $kwitansis = [];
                    // Gunakan SEMUA rkas_ids dari item ini, jangan dibatasi.
                    // Filter bulan tertangani oleh in_array($kwt['bulan'], $relevantMonths)
                    if (!empty($item['rkas_ids'])) {
                        foreach ($item['rkas_ids'] as $rkasId) {
                            if (!empty($kwitansiMap[$rkasId])) {
                                foreach ($kwitansiMap[$rkasId] as $kwt) {
                                    if (in_array($kwt['bulan'], $relevantMonths)) {
                                        $kwitansis[$kwt['id_transaksi']] = true;
                                    }
                                }
                            }
                        }
                    }
                    $noKwitansiTampil = !empty($kwitansis) ? implode(', ', array_keys($kwitansis)) : '-';
                @endphp
                <tr>
                    <td align="center">{{ $no++ }}</td>
                    <td>{{ $item['uraian'] ?? '-' }}</td>
                    <td align="center">{{ $bulanTampil }}</td>
                    <td align="center">{{ $noKwitansiTampil }}</td>
                    <td>{{ $item['nama_penerima'] ?? '-' }}</td>
                    <td>{{ $item['jabatan'] ?? '-' }}</td>
                    <td align="right">{{ $item['tahap_anggaran'] > 0 ? $item['tahap_anggaran'] : 0 }}</td>
                    <td align="right">{{ $item['pot_ppn_total'] > 0 ? $item['pot_ppn_total'] : 0 }}</td>
                    <td align="right">{{ $item['pot_pph23_total'] > 0 ? $item['pot_pph23_total'] : 0 }}</td>
                    <td align="right">{{ $item['pot_pph21_total'] > 0 ? $item['pot_pph21_total'] : 0 }}</td>
                    <td align="right">{{ $diterima > 0 ? $diterima : 0 }}</td>
                    <td style="mso-number-format:\@;">{{ $item['nomor_rekening'] ?? '-' }}</td>
                    <td align="center">{{ $item['bank'] ?? '-' }}</td>
                </tr>
            @endforeach

            <tr style="font-weight: bold;">
                <td colspan="6" align="center">Jumlah</td>
                <td align="right">{{ $totalAnggaran }}</td>
                <td align="right">{{ $totalPpn }}</td>
                <td align="right">{{ $totalPph23 }}</td>
                <td align="right">{{ $totalPph21 }}</td>
                <td align="right">{{ $totalDiterima }}</td>
                <td colspan="2"></td>
            </tr>

        </tbody>
    </table>

</body>
</html>
