<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Alur Kas Perubahan</title>
    <style>
        @page {
            size: {{ $paper_size ?? 'F4' }} {{ $orientation ?? 'landscape' }};
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
            margin-bottom: 10px;
            border-collapse: collapse;
        }
        
        .header-table td {
            border: none;
            padding: 2px;
        }

        h3, h4, h5 {
            margin: 0 0 3px 0;
            text-align: center;
        }

        .uppercase {
            text-transform: uppercase;
        }

        .font-bold {
            font-weight: bold;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 5px;
            font-size: {{ $font_size ?? '9pt' }};
        }

        th, td {
            border: 1px solid #000;
            padding: 3px;
            vertical-align: middle;
        }

        th {
            text-align: center;
            font-weight: bold;
        }

        .text-center {
            text-align: center;
        }

        .text-right {
            text-align: right;
        }

        .text-left {
            text-align: left;
        }

        .bg-tahap {
            background-color: #fcd34d; /* yellow-300 / orange-ish */
        }
        
        .bg-bulan {
            background-color: #bbf7d0; /* green-200 */
        }

        .bg-grey {
            background-color: #e5e7eb; /* gray-200 */
        }

        .bg-tahap1-cell {
            background-color: #fed7aa; /* orange-200 */
        }

        .accounting {
            mso-number-format: "\#\,\#\#0";
            text-align: right;
            white-space: nowrap;
        }

        .text-string {
            mso-number-format: "\@";
        }
        
        .no-border-table td {
            border: none;
            padding: 2px;
        }
    </style>
</head>
<body>
    @php
        $months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        
        $alurData = [];
        $totalPagu = 0;
        $totalBulan = array_fill_keys($months, 0);

        if (isset($tahapanData)) {
            foreach ($tahapanData as $programKode => $programData) {
                if (isset($programData['sub_programs'])) {
                    foreach ($programData['sub_programs'] as $subCode => $subProgramData) {
                        if (isset($subProgramData['uraian_programs'])) {
                            foreach ($subProgramData['uraian_programs'] as $urCode => $urProgramData) {
                                $row = [
                                    'kode_kegiatan' => str_contains($urCode, '.') ? $urCode : $subCode . '.' . $urCode,
                                    'uraian' => $urProgramData['uraian'] ?? '-',
                                    'pagu' => $urProgramData['jumlah'] ?? 0,
                                    'bulanan' => array_fill_keys($months, 0)
                                ];
                                
                                $totalPagu += $row['pagu'];
                                
                                foreach ($months as $m) {
                                    $monthTotal = 0;
                                    if (isset($urProgramData['items'])) {
                                        foreach ($urProgramData['items'] as $item) {
                                            $monthTotal += $item['bulanan'][$m]['total'] ?? 0;
                                        }
                                    }
                                    $row['bulanan'][$m] = $monthTotal;
                                    $totalBulan[$m] += $monthTotal;
                                }
                                
                                $alurData[] = $row;
                            }
                        }
                    }
                }
            }
        }

        $penerimaan = $anggaran->pagu_anggaran ?? 0;
    @endphp

    <div class="header-table">
        @if (isset($anggaran->sekolah->kop_surat) && $anggaran->sekolah->kop_surat && !($is_excel ?? false))
            <div style="text-align: center; border-bottom: 3px solid black; padding-bottom: 10px; margin-bottom: 15px;">
                <img src="{{ public_path('storage/' . $anggaran->sekolah->kop_surat) }}" style="height: 120px; width: auto; max-width: 100%;" alt="Kop Surat">
            </div>
        @endif
    </div>

    <div style="margin-bottom: 10px;">
        <h4 class="uppercase font-bold">ALUR KAS</h4>
        <h5 class="uppercase font-bold">BANTUAN OPERASIONAL SATUAN PENDIDIKAN (BOSP)</h5>
        <h5 class="uppercase font-bold">TAHUN ANGGARAN {{ $anggaran->tahun_anggaran }}</h5>
    </div>

    <table class="no-border-table" style="width: 300px; margin-bottom: 10px; margin-top: 0;">
        <tr><td style="width: 80px;">NPSN</td><td style="width: 5px;">:</td><td>{{ $anggaran->sekolah->npsn ?? '' }}</td></tr>
        <tr><td>Nama Sekolah</td><td>:</td><td>{{ $anggaran->sekolah->nama_sekolah ?? '' }}</td></tr>
        <tr><td>Alamat</td><td>:</td><td>{{ $anggaran->sekolah->alamat ?? '' }}</td></tr>
        <tr><td>Kabupaten</td><td>:</td><td>{{ $anggaran->sekolah->kabupaten_kota ?? '' }}</td></tr>
        <tr><td>Provinsi</td><td>:</td><td>{{ $anggaran->sekolah->provinsi ?? '' }}</td></tr>
    </table>

    <div class="font-bold">A. Penerimaan</div>
    <div style="font-size: {{ $font_size ?? '9pt' }};">Sumber Dana</div>
    <table style="margin-bottom: 15px; table-layout: fixed; width: 100%;">
        <thead>
            <tr>
                <th style="width: 12%;">Nomor Kode</th>
                <th style="width: 43%;">Penerimaan</th>
                <th style="width: 15%;">Jumlah</th>
                <th style="width: 15%;">Tahap I</th>
                <th style="width: 15%;">Tahap II</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td class="text-center text-string">4.3.1.01</td>
                <td class="text-center">{{ $anggaran['sumber_dana'] ?? 'BOSP Reguler' }}</td>
                @if ($is_excel ?? false)
                    <td class="accounting">{{ number_format($penerimaan, 0, '.', ',') }}</td>
                    <td class="accounting">{{ number_format($penerimaan / 2, 0, '.', ',') }}</td>
                    <td class="accounting">{{ number_format($penerimaan / 2, 0, '.', ',') }}</td>
                @else
                    <td class="text-right">{{ number_format($penerimaan, 0, ',', '.') }}</td>
                    <td class="text-right">{{ number_format($penerimaan / 2, 0, ',', '.') }}</td>
                    <td class="text-right">{{ number_format($penerimaan / 2, 0, ',', '.') }}</td>
                @endif
            </tr>
        </tbody>
    </table>

    <div class="font-bold">B. Belanja</div>
    <table style="table-layout: fixed; width: 100%; word-wrap: break-word;">
        <thead>
            <tr>
                <th rowspan="2" style="width: 6%;" class="bg-grey">KODE KEGIATAN</th>
                <th rowspan="2" style="width: 20%;" class="bg-grey">PROGRAM DAN KEGIATAN</th>
                <th rowspan="2" style="width: 8%;" class="bg-grey">PAGU ANGGARAN</th>
                <th colspan="6" class="bg-tahap">TAHAP I (SATU)</th>
                <th colspan="6" class="bg-tahap">TAHAP II (DUA)</th>
            </tr>
            <tr>
                @foreach (array_slice($months, 0, 6) as $month)
                    <th class="bg-bulan" style="width: 5.5%;">{{ substr($month, 0, 3) }}</th>
                @endforeach
                @foreach (array_slice($months, 6, 6) as $month)
                    <th class="bg-bulan" style="width: 5.5%;">{{ substr($month, 0, 3) }}</th>
                @endforeach
            </tr>
        </thead>
        <tbody>
            @foreach ($alurData as $row)
                <tr>
                    <td class="text-center text-string" style="vertical-align: top;">{{ $row['kode_kegiatan'] }}</td>
                    <td style="vertical-align: top;">{{ $row['uraian'] }}</td>
                    @if ($is_excel ?? false)
                        <td class="accounting" style="vertical-align: top;">{{ number_format($row['pagu'], 0, '.', ',') }}</td>
                        @foreach ($months as $m)
                            <td class="accounting" style="vertical-align: top;">
                                {{ $row['bulanan'][$m] > 0 ? number_format($row['bulanan'][$m], 0, '.', ',') : '' }}
                            </td>
                        @endforeach
                    @else
                        <td class="text-right" style="vertical-align: top;">{{ number_format($row['pagu'], 0, ',', '.') }}</td>
                        @foreach ($months as $m)
                            <td class="text-right" style="vertical-align: top;">
                                @if($row['bulanan'][$m] > 0)
                                    {{ number_format($row['bulanan'][$m], 0, ',', '.') }}
                                @endif
                            </td>
                        @endforeach
                    @endif
                </tr>
            @endforeach
            
            <tr class="font-bold">
                <td colspan="2" class="text-center">Jumlah</td>
                @if ($is_excel ?? false)
                    <td class="accounting">{{ number_format($totalPagu, 0, '.', ',') }}</td>
                    @foreach ($months as $m)
                        <td class="accounting">{{ $totalBulan[$m] > 0 ? number_format($totalBulan[$m], 0, '.', ',') : '' }}</td>
                    @endforeach
                @else
                    <td class="text-right">{{ number_format($totalPagu, 0, ',', '.') }}</td>
                    @foreach ($months as $m)
                        <td class="text-right">
                            @if($totalBulan[$m] > 0)
                                {{ number_format($totalBulan[$m], 0, ',', '.') }}
                            @endif
                        </td>
                    @endforeach
                @endif
            </tr>
            <tr class="font-bold">
                <td colspan="3"></td>
                @php
                    $totalTahap1 = 0;
                    $totalTahap2 = 0;
                    for($i=0; $i<6; $i++) { $totalTahap1 += $totalBulan[$months[$i]]; }
                    for($i=6; $i<12; $i++) { $totalTahap2 += $totalBulan[$months[$i]]; }
                @endphp
                @if ($is_excel ?? false)
                    <td colspan="6" class="accounting">{{ number_format($totalTahap1, 0, '.', ',') }}</td>
                    <td colspan="6" class="accounting">{{ number_format($totalTahap2, 0, '.', ',') }}</td>
                @else
                    <td colspan="6" class="text-center">{{ number_format($totalTahap1, 0, ',', '.') }}</td>
                    <td colspan="6" class="text-center">{{ number_format($totalTahap2, 0, ',', '.') }}</td>
                @endif
            </tr>
        </tbody>
    </table>

    <table class="no-border-table" style="width: 100%; margin-top: 30px;">
        <tr>
            <td style="width: 50%; text-align: center; vertical-align: top;">
                <br>
                <div style="margin-bottom: 60px;">Mengetahui,<br>Kepala Sekolah</div>
                <div class="font-bold uppercase" style="text-decoration: underline;">{{ $anggaran->kepala_sekolah ?? '......................' }}</div>
                <div>NIP. {{ $anggaran->nip_kepala_sekolah ?? '-' }}</div>
            </td>
            <td style="width: 50%; text-align: center; vertical-align: top;">
                <div>{{ $anggaran->sekolah->kabupaten_kota ?? '...' }}, {{ $anggaran->tanggal_perubahan ? \Carbon\Carbon::parse($anggaran->tanggal_perubahan)->locale('id')->translatedFormat('d F Y') : '' }}</div>
                <div style="margin-bottom: 60px;">Bendahara BOSP</div>
                <div class="font-bold uppercase" style="text-decoration: underline;">{{ $anggaran->bendahara ?? '......................' }}</div>
                <div>NIP. {{ $anggaran->nip_bendahara ?? '-' }}</div>
            </td>
        </tr>
    </table>
</body>
</html>
