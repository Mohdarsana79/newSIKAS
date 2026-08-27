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
            <td>BOS REGULER</td>
        </tr>
        <tr>
            <td class="w-label">Kegiatan</td>
            <td class="w-colon">:</td>
            <td>Daftar Rincian Pencairan BOS Reguler Tahap {{ $tahap ?? 1 }} Tahun {{ $anggaran['tahun_anggaran'] ?? '' }}</td>
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
                <th rowspan="2" style="width: 23%;">Nama Kegiatan</th>
                <th rowspan="2" style="width: 12%;">Nama Penerima</th>
                <th rowspan="2" style="width: 9%;">Jabatan</th>
                <th rowspan="2" style="width: 9%;">Jumlah<br/>Anggaran<br/>(Rp)</th>
                <th rowspan="2" style="width: 6%;">Pot. PPN</th>
                <th rowspan="2" style="width: 6%;">Pot. PPH 23</th>
                <th rowspan="2" style="width: 6%;">Pot. PPH 21</th>
                <th rowspan="2" style="width: 10%;">Jumlah Yang<br/>Diterima<br/>(Rp)</th>
                <th rowspan="2" colspan="2" style="width: 16%;">Nomor Rekening</th>
            </tr>
            <tr class="header-green">
            </tr>
            <tr class="header-yellow">
                <th style="width: 3%;">1</th>
                <th style="width: 23%;">2</th>
                <th style="width: 12%;">3</th>
                <th style="width: 9%;">4</th>
                <th style="width: 9%;">5</th>
                <th style="width: 6%;">6</th>
                <th style="width: 6%;">7</th>
                <th style="width: 6%;">8</th>
                <th style="width: 10%;">9</th>
                <th style="width: 11%;">10</th>
                <th style="width: 5%;"></th>
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
            @endphp

            @foreach($tahapanData as $progCode => $program)
                @if(isset($program['sub_programs']))
                    @foreach($program['sub_programs'] as $subCode => $subProgram)
                        @if(isset($subProgram['uraian_programs']))
                            @foreach($subProgram['uraian_programs'] as $urCode => $urProgram)
                                @if(isset($urProgram['items']))
                                    @foreach($urProgram['items'] as $item)
                                        @php
                                            $tahap = $tahap ?? 1;
                                            $jumlahAnggaran = $tahap == 1 ? ($item['tahap1'] ?? 0) : ($item['tahap2'] ?? 0);
                                        @endphp
                                        @if($jumlahAnggaran > 0)
                                            @php
                                                $ppn = isset($item['pot_ppn']) && is_numeric($item['pot_ppn']) ? (float)$item['pot_ppn'] : 0;
                                                $pph23 = isset($item['pot_pph23']) && is_numeric($item['pot_pph23']) ? (float)$item['pot_pph23'] : 0;
                                                $pph21_base = isset($item['pot_pph21']) && is_numeric($item['pot_pph21']) ? (float)$item['pot_pph21'] : 0;
                                                $pph21_narasumber = isset($item['pot_pph21_narasumber']) && is_numeric($item['pot_pph21_narasumber']) ? (float)$item['pot_pph21_narasumber'] : 0;
                                                $pph21_total = $pph21_base + $pph21_narasumber;
                                                $diterima = $jumlahAnggaran - $ppn - $pph23 - $pph21_total;

                                                $totalAnggaran += $jumlahAnggaran;
                                                $totalPpn += $ppn;
                                                $totalPph23 += $pph23;
                                                $totalPph21 += $pph21_total;
                                                $totalDiterima += $diterima;
                                            @endphp
                                            <tr>
                                                <td class="text-center">{{ $no++ }}</td>
                                                <td>{{ $item['uraian'] ?? '-' }}</td>
                                                <td>{{ $item['nama_penerima'] ?? '-' }}</td>
                                                <td>{{ $item['jabatan'] ?? '-' }}</td>
                                                <td class="text-right">{{ number_format($jumlahAnggaran, 0, ',', '.') }}</td>
                                                <td class="text-right">{{ $ppn > 0 ? number_format($ppn, 0, ',', '.') : '-' }}</td>
                                                <td class="text-right">{{ $pph23 > 0 ? number_format($pph23, 0, ',', '.') : '-' }}</td>
                                                <td class="text-right">{{ $pph21_total > 0 ? number_format($pph21_total, 0, ',', '.') : '-' }}</td>
                                                <td class="text-right">{{ $diterima > 0 ? number_format($diterima, 0, ',', '.') : '-' }}</td>
                                                <td class="text-center">{{ $item['nomor_rekening'] ?? '-' }}</td>
                                                <td class="text-center">{{ $item['bank'] ?? '-' }}</td>
                                            </tr>
                                        @endif
                                    @endforeach
                                @endif
                            @endforeach
                        @endif
                    @endforeach
                @endif
            @endforeach

            <tr class="font-bold">
                <td colspan="4" class="text-center">Jumlah</td>
                <td class="text-right">{{ $totalAnggaran > 0 ? number_format($totalAnggaran, 0, ',', '.') : '-' }}</td>
                <td class="text-right">{{ $totalPpn > 0 ? number_format($totalPpn, 0, ',', '.') : '-' }}</td>
                <td class="text-right">{{ $totalPph23 > 0 ? number_format($totalPph23, 0, ',', '.') : '-' }}</td>
                <td class="text-right">{{ $totalPph21 > 0 ? number_format($totalPph21, 0, ',', '.') : '-' }}</td>
                <td class="text-right">{{ $totalDiterima > 0 ? number_format($totalDiterima, 0, ',', '.') : '-' }}</td>
                <td colspan="2"></td>
            </tr>

            @if($no == 1)
                <tr>
                    <td colspan="11" class="text-center" style="padding: 20px;">Tidak ada data rincian pencairan.</td>
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
                    {{ $anggaran['sekolah']['kabupaten_kota'] ?? '...........................' }}, {{ $tanggalSumber ? \Carbon\Carbon::parse($tanggalSumber)->locale('id')->translatedFormat('d F Y') : \Carbon\Carbon::now()->translatedFormat('d F Y') }}<br>
                    Bendahara BOS
                    <div class="signature-space"></div>
                    <strong><u>{{ $anggaran['bendahara'] ?? '...........................' }}</u></strong><br>
                    NIP. {{ $anggaran['nip_bendahara'] ?? '...........................' }}
                </td>
            </tr>
        </table>
    </div>

</body>
</html>
