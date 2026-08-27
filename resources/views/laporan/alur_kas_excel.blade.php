<!DOCTYPE html>
<html lang="id">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cetak Alur Kas</title>
    <style>
        @page {
            size: {{ $paper_size ?? 'A4' }} {{ $orientation ?? 'landscape' }};
            margin: 1.5cm;
        }

        body {
            font-family: Arial, sans-serif;
            font-size: {{ $font_size ?? '11pt' }};
            line-height: 1.3;
        }

        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .font-bold { font-weight: bold; }
        .uppercase { text-transform: uppercase; }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }

        th, td {
            border: 1px solid #000;
            padding: 4px 6px;
            vertical-align: top;
        }

        thead th { background-color: #f0f0f0; }

        .no-border-table, .no-border-table td, .no-border-table th {
            border: none;
        }

        .bg-grey { background-color: #f2f2f2; }
        .bg-orange { background-color: #ffd8a8; }
        .bg-yellow { background-color: #fef08a; }
        .bg-green { background-color: #b2f2bb; }
        .bg-orange-light { background-color: #fff3e0; }
        .bg-yellow-light { background-color: #fef9c3; }

        .signature-section {
            width: 100%;
            margin-top: 30px;
            page-break-inside: avoid;
        }

        .signature-space {
            height: 70px;
        }
    </style>
</head>

<body>
    @if (!($is_excel ?? false))
    <div style="text-align: center; margin-bottom: 20px;">
        <h3 style="margin: 0;">ALUR KAS PENGGUNAAN DANA BOS REGULER</h3>
        <h4 style="margin: 0;">TAHUN ANGGARAN {{ $anggaran['tahun_anggaran'] ?? date('Y') }}</h4>
    </div>
    @endif

    <table class="no-border-table" style="margin-bottom: 20px; width: 60%;">
        <tr>
            <td style="width: 120px;">Nama Sekolah</td>
            <td style="width: 10px;">:</td>
            <td>{{ $anggaran['sekolah']['nama_sekolah'] ?? '-' }}</td>
        </tr>
        <tr>
            <td>NPSN</td>
            <td>:</td>
            <td>{{ $anggaran['sekolah']['npsn'] ?? '-' }}</td>
        </tr>
        <tr>
            <td>Alamat</td>
            <td>:</td>
            <td>{{ $anggaran['sekolah']['alamat'] ?? '-' }}</td>
        </tr>
        <tr>
            <td>Kabupaten</td>
            <td>:</td>
            <td>{{ $anggaran['sekolah']['kabupaten_kota'] ?? '-' }}</td>
        </tr>
        <tr>
            <td>Provinsi</td>
            <td>:</td>
            <td>{{ $anggaran['sekolah']['provinsi'] ?? '-' }}</td>
        </tr>
    </table>

    <!-- A. Penerimaan -->
    <div style="margin-bottom: 20px;">
        <div class="font-bold" style="margin-bottom: 5px;">A. Penerimaan</div>
        <div style="margin-bottom: 5px; font-style: italic; font-size: 0.9em;">Sumber Dana :</div>
        <table>
            <thead>
                <tr>
                    <th style="width: 15%;" class="text-center">Nomor Kode</th>
                    <th class="text-center">Penerimaan</th>
                    <th style="width: 20%;" class="text-center">Jumlah</th>
                    <th style="width: 20%;" class="text-center">Tahap I</th>
                    <th style="width: 20%;" class="text-center">Tahap II</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td class="text-center">4.3.1.01</td>
                    <td class="text-center">{{ $anggaran['sumber_dana'] ?? 'BOSP Reguler' }}</td>
                    @if ($is_excel ?? false)
                        <td>{{ $anggaran['pagu_anggaran'] ?? 0 }}</td>
                        <td>{{ ($anggaran['pagu_anggaran'] ?? 0) / 2 }}</td>
                        <td>{{ ($anggaran['pagu_anggaran'] ?? 0) / 2 }}</td>
                    @else
                        <td class="text-right">Rp {{ number_format($anggaran['pagu_anggaran'] ?? 0, 0, ',', '.') }}</td>
                        <td class="text-right">Rp {{ number_format(($anggaran['pagu_anggaran'] ?? 0) / 2, 0, ',', '.') }}</td>
                        <td class="text-right">Rp {{ number_format(($anggaran['pagu_anggaran'] ?? 0) / 2, 0, ',', '.') }}</td>
                    @endif
                </tr>
            </tbody>
        </table>
    </div>

    <!-- B. Belanja -->
    <div>
        <div class="font-bold" style="margin-bottom: 5px;">B. Belanja</div>
        @php
            $months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        @endphp
        <table>
            <thead>
                <tr>
                    <th rowspan="2" class="text-center align-middle" style="width: 8%;">KODE KEGIATAN</th>
                    <th rowspan="2" class="text-center align-middle" style="width: 20%;">PROGRAM DAN KEGIATAN</th>
                    <th rowspan="2" class="text-center align-middle bg-grey">PAGU ANGGARAN</th>
                    <th colspan="6" class="text-center bg-orange">TAHAP I (SATU)</th>
                    <th colspan="6" class="text-center bg-yellow">TAHAP II (DUA)</th>
                </tr>
                <tr>
                    @foreach (array_slice($months, 0, 6) as $m)
                        <th class="text-center font-bold bg-green" style="font-size: 0.8em; width: 4.5%;">{{ $m }}</th>
                    @endforeach
                    @foreach (array_slice($months, 6, 6) as $m)
                        <th class="text-center font-bold bg-green" style="font-size: 0.8em; width: 4.5%;">{{ $m }}</th>
                    @endforeach
                </tr>
            </thead>
            <tbody>
                @php
                    $totalPagu = 0;
                    $totalBulan = array_fill_keys($months, 0);

                    $alurKasRows = [];
                    if (isset($tahapanData)) {
                        foreach ($tahapanData as $progCode => $program) {
                            if (isset($program['sub_programs'])) {
                                foreach ($program['sub_programs'] as $subCode => $subProgram) {
                                    if (isset($subProgram['uraian_programs'])) {
                                        foreach ($subProgram['uraian_programs'] as $urCode => $urProgram) {
                                            $rowPagu = $urProgram['jumlah'] ?? 0;
                                            $rowBulanan = array_fill_keys($months, 0);

                                            if (isset($urProgram['items'])) {
                                                foreach ($urProgram['items'] as $item) {
                                                    foreach ($months as $m) {
                                                        if (isset($item['bulanan'][$m]['total'])) {
                                                            $rowBulanan[$m] += $item['bulanan'][$m]['total'];
                                                        }
                                                    }
                                                }
                                            }

                                            $alurKasRows[] = [
                                                'kode_kegiatan' => strpos((string)$urCode, '.') !== false ? $urCode : "{$subCode}.{$urCode}",
                                                'uraian' => $urProgram['uraian'] ?? '',
                                                'pagu' => $rowPagu,
                                                'bulanan' => $rowBulanan
                                            ];

                                            $totalPagu += $rowPagu;
                                            foreach ($months as $m) {
                                                $totalBulan[$m] += $rowBulanan[$m];
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                @endphp

                @foreach ($alurKasRows as $row)
                    <tr>
                        <td class="text-center">{{ $row['kode_kegiatan'] }}</td>
                        <td>{{ $row['uraian'] }}</td>
                        @if ($is_excel ?? false)
                            <td>{{ $row['pagu'] }}</td>
                            @foreach ($months as $idx => $m)
                                <td>{{ $row['bulanan'][$m] > 0 ? $row['bulanan'][$m] : '' }}</td>
                            @endforeach
                        @else
                            <td class="text-right">Rp {{ number_format($row['pagu'], 0, ',', '.') }}</td>
                            @foreach ($months as $idx => $m)
                                <td class="text-right {{ $idx < 6 ? 'bg-orange-light' : 'bg-yellow-light' }}">
                                    {{ $row['bulanan'][$m] > 0 ? 'Rp ' . number_format($row['bulanan'][$m], 0, ',', '.') : '' }}
                                </td>
                            @endforeach
                        @endif
                    </tr>
                @endforeach
                
                <tr class="bg-grey font-bold">
                    <td colspan="2" class="text-center">Jumlah</td>
                    @if ($is_excel ?? false)
                        <td>{{ $totalPagu }}</td>
                        @foreach ($months as $m)
                            <td>{{ $totalBulan[$m] > 0 ? $totalBulan[$m] : '' }}</td>
                        @endforeach
                    @else
                        <td class="text-right">Rp {{ number_format($totalPagu, 0, ',', '.') }}</td>
                        @foreach ($months as $m)
                            <td class="text-right">
                                {{ $totalBulan[$m] > 0 ? 'Rp ' . number_format($totalBulan[$m], 0, ',', '.') : '' }}
                            </td>
                        @endforeach
                    @endif
                </tr>

                <tr class="font-bold">
                    <td colspan="3" class="no-border-table"></td>
                    @php
                        $sumTahap1 = 0;
                        foreach(array_slice($months, 0, 6) as $m) $sumTahap1 += $totalBulan[$m];
                        
                        $sumTahap2 = 0;
                        foreach(array_slice($months, 6, 6) as $m) $sumTahap2 += $totalBulan[$m];
                    @endphp

                    @if ($is_excel ?? false)
                        <td colspan="6" class="text-center">{{ $sumTahap1 }}</td>
                        <td colspan="6" class="text-center">{{ $sumTahap2 }}</td>
                    @else
                        <td colspan="6" class="text-center bg-grey">Rp {{ number_format($sumTahap1, 0, ',', '.') }}</td>
                        <td colspan="6" class="text-center bg-grey">Rp {{ number_format($sumTahap2, 0, ',', '.') }}</td>
                    @endif
                </tr>
            </tbody>
        </table>
    </div>

    <!-- Signatures -->
    <table class="no-border-table signature-section">
        <tr>
            <td style="width: 33%; text-align: center; vertical-align: top;">
                <p>Mengetahui,</p>
                <p>Komite Sekolah,</p>
                <div class="signature-space"></div>
                <p class="font-bold" style="text-decoration: underline;">
                    {{ $anggaran['komite'] ?? '....................' }}
                </p>
            </td>
            <td style="width: 33%; text-align: center; vertical-align: top;">
                <p>Mengetahui,</p>
                <p>Kepala Sekolah,</p>
                <div class="signature-space"></div>
                <p class="font-bold" style="text-decoration: underline;">
                    {{ $anggaran['kepala_sekolah'] ?? '....................' }}
                </p>
                <p>NIP. {{ $anggaran['nip_kepala_sekolah'] ?? '-' }}</p>
            </td>
            <td style="width: 33%; text-align: center; vertical-align: top;">
                <p>
                    {{ $anggaran['sekolah']['kabupaten_kota'] ?? '...' }},
                    {{ isset($anggaran['tanggal_cetak']) ? \Carbon\Carbon::parse($anggaran['tanggal_cetak'])->locale('id')->translatedFormat('d F Y') : '....................' }}
                </p>
                <p>Bendahara,</p>
                <div class="signature-space"></div>
                <p class="font-bold" style="text-decoration: underline;">
                    {{ $anggaran['bendahara'] ?? '....................' }}
                </p>
                <p>NIP. {{ $anggaran['nip_bendahara'] ?? '-' }}</p>
            </td>
        </tr>
    </table>
</body>

</html>
