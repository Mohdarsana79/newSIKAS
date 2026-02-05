<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Buku Pembantu Bank</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 11pt;
        }
        .header {
            text-align: center;
            font-weight: bold;
            margin-bottom: 20px;
            text-transform: uppercase;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .bold { font-weight: bold; }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            padding: 4px;
            vertical-align: top;
        }
        .border-table th, .border-table td {
            border: 1px solid black;
        }
       .border-table th {
            text-align: center;
            font-weight: bold;
            text-transform: uppercase;
            background-color: #f0f0f0; 
        }
    </style>
</head>
<body>
    @foreach($reportData as $index => $report)
    
    @if($index > 0)
        <tr><td colspan="8"></td></tr>
        <tr><td colspan="8"></td></tr>
    @endif

    <div class="header">
        <table>
            <tr><td colspan="8" class="text-center bold">BUKU KAS PEMBANTU BANK</td></tr>
            <tr><td colspan="8" class="text-center bold">BULAN : {{ strtoupper($report['bulan']) }} TAHUN : {{ $report['tahun'] }}</td></tr>
        </table>
    </div>

    <table class="meta-table">
        <tr>
            <td colspan="2">NPSN</td>
            <td>: {{ $report['sekolah']['npsn'] }}</td>
            <td colspan="5"></td>
        </tr>
        <tr>
            <td colspan="2">Nama Sekolah</td>
            <td>: {{ $report['sekolah']['nama_sekolah'] }}</td>
            <td colspan="5"></td>
        </tr>
        <tr>
            <td colspan="2">Desa/Kecamatan</td>
            <td>: {{ $report['sekolah']['alamat'] ?? ($report['sekolah']['kelurahan_desa'] . ' / ' . $report['sekolah']['kecamatan']) }}</td>
            <td colspan="5"></td>
        </tr>
        <tr>
            <td colspan="2">Kabupaten / Kota</td>
            <td>: {{ $report['sekolah']['kabupaten'] }}</td>
            <td colspan="5"></td>
        </tr>
        <tr>
            <td colspan="2">Provinsi</td>
            <td>: {{ $report['sekolah']['provinsi'] }}</td>
            <td colspan="5"></td>
        </tr>
        <tr>
            <td colspan="2">Sumber Dana</td>
            <td>: BOSP Reguler</td>
            <td colspan="5"></td>
        </tr>
    </table>

    <br/>

    <table class="border-table">
        <thead>
            <tr>
                <th style="border: 1px solid black; background-color: #d3d3d3; text-align: center; font-weight: bold;">TANGGAL</th>
                <th style="border: 1px solid black; background-color: #d3d3d3; text-align: center; font-weight: bold;">KODE KEGIATAN</th>
                <th style="border: 1px solid black; background-color: #d3d3d3; text-align: center; font-weight: bold;">KODE REKENING</th>
                <th style="border: 1px solid black; background-color: #d3d3d3; text-align: center; font-weight: bold;">NO. BUKTI</th>
                <th style="border: 1px solid black; background-color: #d3d3d3; text-align: center; font-weight: bold;">URAIAN</th>
                <th style="border: 1px solid black; background-color: #d3d3d3; text-align: center; font-weight: bold;">PENERIMAAN</th>
                <th style="border: 1px solid black; background-color: #d3d3d3; text-align: center; font-weight: bold;">PENGELUARAN</th>
                <th style="border: 1px solid black; background-color: #d3d3d3; text-align: center; font-weight: bold;">SALDO</th>
            </tr>
            <tr>
                <td class="text-center" style="background-color: #f0f0f0;">1</td>
                <td class="text-center" style="background-color: #f0f0f0;">2</td>
                <td class="text-center" style="background-color: #f0f0f0;">3</td>
                <td class="text-center" style="background-color: #f0f0f0;">4</td>
                <td class="text-center" style="background-color: #f0f0f0;">5</td>
                <td class="text-center" style="background-color: #f0f0f0;">6</td>
                <td class="text-center" style="background-color: #f0f0f0;">7</td>
                <td class="text-center" style="background-color: #f0f0f0;">8</td>
            </tr>
        </thead>
        <tbody>
            {{-- Saldo Awal --}}
            <tr>
                <td class="text-center">{{ '01-' . $report['bulanAngkaStr'] . '-' . $report['tahun'] }}</td>
                <td></td>
                <td></td>
                <td></td>
                <td>
                    @if(($report['data']['has_saldo_awal_tahun_lalu'] ?? false) && $report['bulanAngkaStr'] !== '01')
                        Saldo Awal {{ \Carbon\Carbon::createFromDate($report['tahun'], $report['bulanAngkaStr'], 1)->locale('id')->isoFormat('MMMM Y') }}
                    @else
                        Saldo Bank Bulan {{ \Carbon\Carbon::createFromDate($report['tahun'], $report['bulanAngkaStr'], 1)->subMonth()->locale('id')->isoFormat('MMMM Y') }}
                    @endif
                </td>
                <td class="text-right">{{ number_format($report['data']['saldo_awal'], 0, '.', ',') }}</td>
                <td class="text-right">0</td>
                <td class="text-right">{{ number_format($report['data']['saldo_awal'], 0, '.', ',') }}</td>
            </tr>

            @php $currentSaldo = $report['data']['saldo_awal']; @endphp
            @foreach($report['items'] as $item)
                @php
                    $penerimaan = $item['penerimaan'] ?? 0;
                    $pengeluaran = $item['pengeluaran'] ?? 0;
                    $currentSaldo = $currentSaldo + $penerimaan - $pengeluaran;
                @endphp
                <tr>
                    <td class="text-center">{{ \Carbon\Carbon::parse($item['tanggal'])->format('d-m-Y') }}</td>
                    <td class="text-center">{{ $item['kode_kegiatan'] }}</td>
                    <td class="text-center">{{ $item['kode_rekening'] }}</td>
                    <td class="text-center">{{ $item['no_bukti'] }}</td>
                    <td>{{ $item['uraian'] }}</td>
                    <td class="text-right">{{ $penerimaan > 0 ? number_format($penerimaan, 0, '.', ',') : '0' }}</td>
                    <td class="text-right">{{ $pengeluaran > 0 ? number_format($pengeluaran, 0, '.', ',') : '0' }}</td>
                    <td class="text-right">{{ number_format($currentSaldo, 0, '.', ',') }}</td>
                </tr>
            @endforeach

            <tr class="bold">
                <td colspan="5" style="border: 1px solid black; font-weight: bold;">Jumlah</td>
                <td class="text-right" style="border: 1px solid black; font-weight: bold;">{{ number_format($report['data']['saldo_awal'] + collect($report['items'])->sum('penerimaan'), 0, '.', ',') }}</td>
                <td class="text-right" style="border: 1px solid black; font-weight: bold;">{{ number_format(collect($report['items'])->sum('pengeluaran'), 0, '.', ',') }}</td>
                <td class="text-right" style="border: 1px solid black; font-weight: bold;">{{ number_format(($report['data']['saldo_awal'] + collect($report['items'])->sum('penerimaan')) - collect($report['items'])->sum('pengeluaran'), 0, '.', ',') }}</td>
            </tr>
        </tbody>
    </table>

    <br/>

    <table>
        <tr>
            <td colspan="8">
                Pada hari ini {{ $report['tanggalCetakFormatted'] }}, Buku Kas Bank Ditutup dengan keadaan/posisi buku sebagai berikut :<br>
                <strong>Saldo Bank : Rp. {{ number_format(($report['data']['saldo_awal'] + collect($report['items'])->sum('penerimaan')) - collect($report['items'])->sum('pengeluaran'), 0, '.', ',') }}</strong>
            </td>
        </tr>
    </table>

    <br/>

    <table>
        <tr>
            <td colspan="4" class="text-center">
                Menyetujui,<br>
                Kepala Sekolah
                <br/><br/><br/><br/>
                <span style="text-decoration: underline; font-weight: bold; text-transform: uppercase;">{{ $report['kepala_sekolah']['nama'] ?? '...................' }}</span><br>
                NIP. {{ $report['kepala_sekolah']['nip'] ?? '...................' }}
            </td>
            <td colspan="4" class="text-center">
                {{ $report['sekolah']['kecamatan'] }}, {{ $report['tanggalCetakDOB'] }}<br>
                Bendahara,
                <br/><br/><br/><br/>
                <span style="text-decoration: underline; font-weight: bold; text-transform: uppercase;">{{ $report['bendahara']['nama'] ?? '...................' }}</span><br>
                NIP. {{ $report['bendahara']['nip'] ?? '...................' }}
            </td>
        </tr>
    </table>
    @endforeach
</body>
</html>
