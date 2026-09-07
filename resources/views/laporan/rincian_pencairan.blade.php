<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rincian Pencairan</title>
    <style>
        @page {
            size: {{ $paper_size ?? 'A4' }} {{ $orientation ?? 'landscape' }};
            margin: 1cm;
        }

        body {
            font-family: Arial, sans-serif;
            font-size: {{ $font_size ?? '9pt' }};
            line-height: 1.2;
            color: #000;
        }

        .header-table {
            width: 100%;
            margin-bottom: 15px;
            border-collapse: collapse;
            font-weight: bold;
        }
        
        .header-table td {
            border: none;
            padding: 2px;
            vertical-align: top;
        }

        .w-label {
            width: 120px;
        }

        .w-colon {
            width: 10px;
        }

        table.data-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            font-size: 7pt; /* Reduce font size to ensure it fits */
            table-layout: fixed;
            word-wrap: break-word;
        }

        .data-table th, .data-table td {
            border: 1px solid #000;
            padding: 3px;
            vertical-align: middle;
            overflow: hidden;
        }

        .data-table th {
            text-align: center;
            font-weight: bold;
            background-color: #ffffff;
        }

        .header-green th {
            background-color: #92d050 !important;
        }

        .header-yellow th {
            background-color: #ffc000 !important;
        }

        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .font-bold { font-weight: bold; }
        .whitespace-nowrap { white-space: nowrap; }

        .signature-section {
            width: 100%;
            margin-top: 30px;
            page-break-inside: avoid;
        }

        .signature-table {
            width: 100%;
            border: none;
        }

        .signature-table td {
            border: none;
            text-align: center;
            vertical-align: top;
            width: 50%;
        }

        .signature-space {
            height: 70px;
        }
    </style>
</head>
<body>

    <table class="header-table">
        <tr>
            <td class="w-label">Program</td>
            <td class="w-colon">:</td>
            <td>{{ strtoupper($anggaran['sumber_dana'] ?? 'BOS REGULER') }}</td>
        </tr>
        <tr>
            <td class="w-label">Kegiatan</td>
            <td class="w-colon">:</td>
            <td>Daftar Rincian Pencairan {{ $anggaran['sumber_dana'] ?? 'BOS Reguler' }} Tahap {{ $tahap ?? 1 }} {{ isset($bulan) && $bulan !== 'Semua' ? 'Bulan ' . $bulan : '' }} Tahun {{ $anggaran['tahun_anggaran'] ?? '' }}</td>
        </tr>
        <tr>
            <td class="w-label">Nama Satuan</td>
            <td class="w-colon">:</td>
            <td>{{ $anggaran['sekolah']['nama_sekolah'] ?? '-' }}</td>
        </tr>
        <tr>
            <td class="w-label">NPSN</td>
            <td class="w-colon">:</td>
            <td>{{ $anggaran['sekolah']['npsn'] ?? '-' }}</td>
        </tr>
        <tr>
            <td class="w-label">Kecamatan</td>
            <td class="w-colon">:</td>
            <td>{{ $anggaran['sekolah']['kecamatan'] ?? '-' }}</td>
        </tr>
    </table>

    <table class="data-table">
        <thead>
            <tr class="header-green">
                <th rowspan="2" style="width: 3%;">No</th>
                <th rowspan="2" style="width: 15%;">Nama Kegiatan</th>
                <th rowspan="2" style="width: 6%;">Bulan</th>
                <th rowspan="2" style="width: 7%;">No. Kwitansi</th>
                <th rowspan="2" style="width: 10%;">Nama Penerima</th>
                <th rowspan="2" style="width: 7%;">Jabatan</th>
                <th rowspan="2" style="width: 9%;">Jumlah<br/>Anggaran<br/>(Rp)</th>
                <th rowspan="2" style="width: 5%;">Pot. PPN</th>
                <th rowspan="2" style="width: 5%;">Pot. PPH 23</th>
                <th rowspan="2" style="width: 5%;">Pot. PPH 21</th>
                <th rowspan="2" style="width: 9%;">Jumlah Yang<br/>Diterima<br/>(Rp)</th>
                <th rowspan="2" colspan="2" style="width: 19%;">Nomor Rekening</th>
            </tr>
            <tr class="header-green">
            </tr>
            <tr class="header-yellow">
                <th style="width: 3%;">1</th>
                <th style="width: 15%;">2</th>
                <th style="width: 6%;">3</th>
                <th style="width: 7%;">4</th>
                <th style="width: 10%;">5</th>
                <th style="width: 7%;">6</th>
                <th style="width: 9%;">7</th>
                <th style="width: 5%;">8</th>
                <th style="width: 5%;">9</th>
                <th style="width: 5%;">10</th>
                <th style="width: 9%;">11</th>
                <th style="width: 12%;">12</th>
                <th style="width: 7%;">13</th>
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
                    <td class="text-center">{{ $no++ }}</td>
                    <td>{{ $item['uraian'] ?? '-' }}</td>
                    <td class="text-center">{{ $bulanTampil }}</td>
                    <td class="text-center">{{ $noKwitansiTampil }}</td>
                    <td>{{ $item['nama_penerima'] ?? '-' }}</td>
                    <td>{{ $item['jabatan'] ?? '-' }}</td>
                    <td class="text-right">{{ number_format($item['tahap_anggaran'], 0, ',', '.') }}</td>
                    <td class="text-right">{{ $item['pot_ppn_total'] > 0 ? number_format($item['pot_ppn_total'], 0, ',', '.') : '-' }}</td>
                    <td class="text-right">{{ $item['pot_pph23_total'] > 0 ? number_format($item['pot_pph23_total'], 0, ',', '.') : '-' }}</td>
                    <td class="text-right">{{ $item['pot_pph21_total'] > 0 ? number_format($item['pot_pph21_total'], 0, ',', '.') : '-' }}</td>
                    <td class="text-right">{{ $diterima > 0 ? number_format($diterima, 0, ',', '.') : '-' }}</td>
                    <td class="text-center">{{ $item['nomor_rekening'] ?? '-' }}</td>
                    <td class="text-center">{{ $item['bank'] ?? '-' }}</td>
                </tr>
            @endforeach

            <tr class="font-bold">
                <td colspan="6" class="text-center">Jumlah</td>
                <td class="text-right">{{ $totalAnggaran > 0 ? number_format($totalAnggaran, 0, ',', '.') : '-' }}</td>
                <td class="text-right">{{ $totalPpn > 0 ? number_format($totalPpn, 0, ',', '.') : '-' }}</td>
                <td class="text-right">{{ $totalPph23 > 0 ? number_format($totalPph23, 0, ',', '.') : '-' }}</td>
                <td class="text-right">{{ $totalPph21 > 0 ? number_format($totalPph21, 0, ',', '.') : '-' }}</td>
                <td class="text-right">{{ $totalDiterima > 0 ? number_format($totalDiterima, 0, ',', '.') : '-' }}</td>
                <td colspan="2"></td>
            </tr>

            @if($no == 1)
                <tr>
                    <td colspan="12" class="text-center" style="padding: 20px;">Tidak ada data rincian pencairan.</td>
                </tr>
            @endif
        </tbody>
    </table>

    @php
        $tanggalSumber = (!empty($is_perubahan) && !empty($anggaran['tanggal_perubahan'] ?? null))
            ? $anggaran['tanggal_perubahan']
            : ($anggaran['tanggal_cetak'] ?? null);
    @endphp

    <div class="signature-section">
        <table class="signature-table">
            <tr>
                <td>
                    Mengetahui,<br>
                    Kepala Sekolah
                    <div class="signature-space"></div>
                    <strong><u>{{ $anggaran['kepala_sekolah'] ?? '...........................' }}</u></strong><br>
                    NIP. {{ $anggaran['nip_kepala_sekolah'] ?? '...........................' }}
                </td>
                <td>
                    <br>
                    Bendahara BOS
                    <div class="signature-space"></div>
                    <strong><u>{{ $anggaran['bendahara'] ?? '...........................' }}</u></strong><br>
                    NIP. {{ $anggaran['nip_bendahara'] ?? '...........................' }}
                </td>
                <td>
                    {{ $anggaran['sekolah']['kabupaten_kota'] ?? '...........................' }}, {{ \Carbon\Carbon::now()->locale('id')->translatedFormat('d F Y') }}<br>
                    Bank Penyalur
                    <div class="signature-space"></div>
                    <strong><u></u>...........................</strong><br>
                    
                </td>
            </tr>
        </table>
    </div>

</body>
</html>
