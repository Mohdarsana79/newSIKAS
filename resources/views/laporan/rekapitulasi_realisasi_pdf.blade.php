<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Rekapitulasi Realisasi Penggunaan Dana BOSP</title>
    <style>
        @page {
            size: {{ $printSettings['ukuran_kertas'] ?? 'Legal' }} {{ $printSettings['orientasi'] ?? 'landscape' }};
            margin: 1cm 1.5cm;
        }
        body {
            font-family: Arial, sans-serif;
            font-size: {{ $printSettings['font_size'] ?? '10pt' }};
            line-height: 1.5;
        }
        .header {
            text-align: center;
            font-weight: bold;
            margin-bottom: 25px;
            text-transform: uppercase;
        }
        .meta-table {
            width: 100%;
            margin-bottom: 15px;
            font-size: {{ $printSettings['font_size'] ?? '10pt' }};
        }
        .meta-table td {
            vertical-align: top;
            padding: 2px 0;
        }
        .main-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9pt;
            margin-bottom: 20px;
        }
        .main-table th, .main-table td {
            border: 1px solid black;
            padding: 6px 4px;
            vertical-align: top;
        }
        .main-table th {
            text-align: center;
            background-color: #f5f5f5;
            vertical-align: middle;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .bold { font-weight: bold; }
        
        .summary-table {
            width: 60%;
            border-collapse: collapse;
            margin-top: 20px;
            margin-bottom: 30px;
            page-break-inside: avoid;
            font-size: 9pt;
        }
        .summary-table td {
            border: none;
            padding: 4px 0;
        }

        .signature-section {
            width: 100%;
            margin-top: 30px;
            page-break-inside: avoid;
        }
        .signature-table {
            width: 100%;
            text-align: center;
        }
        .signature-space {
            height: 70px;
        }
        .no-border {
            border: none !important;
        }
    </style>
</head>
<body>
    <div class="header">
        <span style="font-size: 1.1em;">REKAPITULASI REALISASI PENGGUNAAN DANA BOSP</span><br>
        <span style="font-size: 0.9em; font-weight: normal; margin-top: 5px; display: inline-block;">
            PERIODE TANGGAL: {{ $periode_info['periode_awal'] }} s/d {{ $periode_info['periode_akhir'] }}<br>
            {{ strtoupper($periode_info['tahap_label'] ?? '') }} TAHUN {{ $tahun }}
        </span>
    </div>

    <table class="meta-table">
        <tr>
            <td width="150">NPSN</td>
            <td width="10">:</td>
            <td>{{ $sekolah->npsn ?? '-' }}</td>
        </tr>
        <tr>
            <td>Nama Sekolah</td>
            <td>:</td>
            <td>{{ $sekolah->nama_sekolah ?? '-' }}</td>
        </tr>
        <tr>
            <td>Kecamatan</td>
            <td>:</td>
            <td>{{ $sekolah->kecamatan ?? '-' }}</td>
        </tr>
        <tr>
            <td>Kabupaten/Kota</td>
            <td>:</td>
            <td>{{ $sekolah->kabupaten_kota ?? '-' }}</td>
        </tr>
        <tr>
            <td>Provinsi</td>
            <td>:</td>
            <td>{{ $sekolah->provinsi ?? '-' }}</td>
        </tr>
        <tr>
            <td>Sumber Dana</td>
            <td>:</td>
            <td>BOS Reguler</td>
        </tr>
    </table>

    <table class="main-table">
        <thead>
            <tr>
                <th rowspan="2" width="40">No Urut</th>
                <th rowspan="2">8 STANDAR</th>
                <th colspan="11">SUB PROGRAM</th>
                <th rowspan="2" width="80">Jumlah</th>
            </tr>
            <tr>
                <!-- Headers columns 1-11 -->
                @foreach($komponen_bos as $id => $nama)
                    <th style="font-size: 7.5pt; width: 6%;">{{ $nama }}</th>
                @endforeach
            </tr>
            <tr style="background-color: #e0e0e0;">
                <th></th>
                <th></th>
                @for($i = 1; $i <= 11; $i++)
                    <th>{{ $i }}</th>
                @endfor
                <th></th>
            </tr>
        </thead>
        <tbody>
            @php
                $grandTotalPerKomponen = array_fill(1, 11, 0);
                $grandTotalAll = 0;
            @endphp
            
            @foreach($realisasi_data as $row)
                <tr>
                    <td class="text-center">{{ $row['no_urut'] }}</td>
                    <td>{{ $row['program_kegiatan'] }}</td>
                    
                    @foreach($komponen_bos as $id => $nama)
                        @php
                            $val = $row['realisasi_komponen'][$id] ?? 0;
                            $grandTotalPerKomponen[$id] += $val;
                        @endphp
                        <td class="text-right">
                            {{ $val > 0 ? number_format($val, 0, ',', '.') : '-' }}
                        </td>
                    @endforeach

                    @php $grandTotalAll += $row['total_kegiatan']; @endphp
                    <td class="text-right bold">
                        {{ $row['total_kegiatan'] > 0 ? number_format($row['total_kegiatan'], 0, ',', '.') : '-' }}
                    </td>
                </tr>
            @endforeach

            <!-- Total Row -->
            <tr class="bold" style="background-color: #f5f5f5;">
                <td colspan="2" class="text-center">JUMLAH</td>
                 @foreach($komponen_bos as $id => $nama)
                    <td class="text-right">
                        {{ $grandTotalPerKomponen[$id] > 0 ? number_format($grandTotalPerKomponen[$id], 0, ',', '.') : '-' }}
                    </td>
                @endforeach
                <td class="text-right">
                    {{ $grandTotalAll > 0 ? number_format($grandTotalAll, 0, ',', '.') : '-' }}
                </td>
            </tr>
        </tbody>
    </table>

    <!-- Ringkasan Keuangan -->
    <table class="summary-table">
        <tr>
            <td width="60%">Saldo periode sebelumnya</td>
            <td width="5%" class="text-center">:</td>
            <td class="text-right bold">Rp. {{ number_format($ringkasan_keuangan['saldo_periode_sebelumnya'], 0, ',', '.') }}</td>
        </tr>
        <tr>
            <td>Total penerimaan dana BOSP periode ini</td>
            <td class="text-center">:</td>
            <td class="text-right bold">Rp. {{ number_format($ringkasan_keuangan['total_penerimaan_periode_ini'], 0, ',', '.') }}</td>
        </tr>
         <tr>
            <td>Total penggunaan dana BOSP periode ini</td>
            <td class="text-center">:</td>
            <td class="text-right bold">Rp. {{ number_format($ringkasan_keuangan['total_penggunaan_periode_ini'], 0, ',', '.') }}</td>
        </tr>
         <tr>
            <td>Akhir saldo BOSP periode ini</td>
            <td class="text-center">:</td>
            <td class="text-right bold">Rp. {{ number_format($ringkasan_keuangan['akhir_saldo_periode_ini'], 0, ',', '.') }}</td>
        </tr>
    </table>

    <!-- Signatures -->
    <!-- Signatures -->
    <div class="signature-section">
        <table class="signature-table">
            <tr>
                <td width="40%" class="text-center" style="vertical-align: top;">
                    Mengetahui,<br>
                    Kepala Sekolah
                    <div class="signature-space"></div>
                    <span class="bold uppercase" style="border-bottom: 1px solid black; padding-bottom: 1px; display: inline-block;">{{ $penganggaran->kepala_sekolah ?? '.........................' }}</span><br>
                    <div style="margin-top: 3px;">NIP. {{ $penganggaran->nip_kepala_sekolah ?? '.........................' }}</div>
                </td>
                <td width="20%"></td>
                <td width="40%" class="text-center" style="vertical-align: top;">
                    {{ $sekolah->kecamatan ?? '..............' }}, {{ $tanggal_cetak ?? date('d F Y') }}<br>
                    Bendahara / Penanggungjawab Kegiatan
                    <div class="signature-space"></div>
                    <span class="bold uppercase" style="border-bottom: 1px solid black; padding-bottom: 4px; display: inline-block;">{{ $penganggaran->bendahara ?? '.........................' }}</span><br>
                    <div style="margin-top: 3px;">NIP. {{ $penganggaran->nip_bendahara ?? '.........................' }}</div>
                </td>
            </tr>
        </table>
    </div>

</body>
</html>
