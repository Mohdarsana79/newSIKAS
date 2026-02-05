<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Buku Pembantu Tunai</title>
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
            background-color: #f0f0f0; 
            font-weight: bold;
        }
    </style>
</head>
<body>
    @foreach($reportData as $index => $report)

    @if($index > 0)
        <tr><td colspan="7"></td></tr>
        <tr><td colspan="7"></td></tr>
    @endif
    
    <div class="header">
        <table>
            <tr><td colspan="7" class="text-center bold">BUKU KAS PEMBANTU TUNAI</td></tr>
            <tr><td colspan="7" class="text-center bold">BULAN : {{ strtoupper($report['bulan']) }} TAHUN : {{ $report['tahun'] }}</td></tr>
        </table>
    </div>

    <table class="meta-table">
        <tr>
            <td colspan="2">NPSN</td>
            <td>: {{ $report['sekolah']['npsn'] }}</td>
            <td colspan="4"></td>
        </tr>
        <tr>
            <td colspan="2">Nama Sekolah</td>
            <td>: {{ $report['sekolah']['nama_sekolah'] }}</td>
            <td colspan="4"></td>
        </tr>
        <tr>
            <td colspan="2">Kelurahan / Desa</td>
            <td>: {{ $report['sekolah']['kelurahan_desa'] }}</td>
            <td colspan="4"></td>
        </tr>
        <tr>
            <td colspan="2">Kecamatan</td>
            <td>: {{ $report['sekolah']['kecamatan'] }}</td>
            <td colspan="4"></td>
        </tr>
        <tr>
            <td colspan="2">Kabupaten / Kota</td>
            <td>: {{ $report['sekolah']['kabupaten'] }}</td>
            <td colspan="4"></td>
        </tr>
        <tr>
            <td colspan="2">Provinsi</td>
            <td>: {{ $report['sekolah']['provinsi'] }}</td>
            <td colspan="4"></td>
        </tr>
        <tr>
            <td colspan="2">Sumber Dana</td>
            <td>: BOSP Reguler</td>
            <td colspan="4"></td>
        </tr>
    </table>

    <br/>

    <table class="border-table">
        <thead>
            <tr>
                <th style="border: 1px solid black; background-color: #d3d3d3; text-align: center; font-weight: bold;">Tanggal</th>
                <th style="border: 1px solid black; background-color: #d3d3d3; text-align: center; font-weight: bold;">Kode Rekening</th>
                <th style="border: 1px solid black; background-color: #d3d3d3; text-align: center; font-weight: bold;">No. Bukti</th>
                <th style="border: 1px solid black; background-color: #d3d3d3; text-align: center; font-weight: bold;">Uraian</th>
                <th style="border: 1px solid black; background-color: #d3d3d3; text-align: center; font-weight: bold;">Penerimaan (Kredit)</th>
                <th style="border: 1px solid black; background-color: #d3d3d3; text-align: center; font-weight: bold;">Pengeluaran (Debet)</th>
                <th style="border: 1px solid black; background-color: #d3d3d3; text-align: center; font-weight: bold;">Saldo</th>
            </tr>
        </thead>
        <tbody>
            @php
                $totalPenarikan = $report['data']['totalPenarikan'] ?? 0;
                $saldoAwal = $report['data']['saldoAwalTunai'];
                $saldoWithPenarikan = $saldoAwal + $totalPenarikan;
                $filteredItems = $report['items'];
            @endphp

            {{-- Saldo Kas Tunai Row --}}
            <tr>
                <td class="text-center">{{ '01-' . $report['bulanAngkaStr'] . '-' . $report['tahun'] }}</td>
                <td class="text-center">-</td>
                <td class="text-center">-</td>
                <td>Saldo Kas Tunai</td>
                <td class="text-right">{{ $totalPenarikan > 0 ? number_format($totalPenarikan, 0, '.', ',') : '0' }}</td>
                <td class="text-right">-</td>
                <td class="text-right">{{ number_format($saldoWithPenarikan, 0, '.', ',') }}</td>
            </tr>

            @php $currentSaldo = $saldoWithPenarikan; @endphp
            @foreach($filteredItems as $item)
                @php
                    $penerimaan = $item['penerimaan'] ?? 0;
                    $pengeluaran = $item['pengeluaran'] ?? 0;
                    $currentSaldo = $currentSaldo + $penerimaan - $pengeluaran;
                @endphp
                <tr>
                    <td class="text-center">{{ \Carbon\Carbon::parse($item['tanggal'])->format('d-m-Y') }}</td>
                    <td class="text-center">{{ $item['kode_rekening'] ?? '-' }}</td>
                    <td class="text-center">{{ $item['no_bukti'] ?? '-' }}</td>
                    <td>{{ $item['uraian'] }}</td>
                    <td class="text-right">{{ $penerimaan > 0 ? number_format($penerimaan, 0, '.', ',') : '-' }}</td>
                    <td class="text-right">{{ $pengeluaran > 0 ? number_format($pengeluaran, 0, '.', ',') : '-' }}</td>
                    <td class="text-right">{{ number_format($currentSaldo, 0, '.', ',') }}</td>
                </tr>
            @endforeach

            {{-- Footer Total --}}
            <tr class="bold">
                <td colspan="4" class="text-center" style="border: 1px solid black; background-color: #ccc; font-weight: bold;">Jumlah Penutupan</td>
                <td class="text-right" style="border: 1px solid black; background-color: #ccc; font-weight: bold;">{{ number_format($report['data']['totalPenerimaan'], 0, '.', ',') }}</td>
                <td class="text-right" style="border: 1px solid black; background-color: #ccc; font-weight: bold;">{{ number_format($report['data']['totalPengeluaran'], 0, '.', ',') }}</td>
                <td class="text-right" style="border: 1px solid black; background-color: #ccc; font-weight: bold;">{{ number_format($report['data']['currentSaldo'], 0, '.', ',') }}</td>
            </tr>
        </tbody>
    </table>

    <br/>

    <table>
        <tr>
            <td colspan="7">
                Pada hari ini {{ $report['formatAkhirBulanLengkapHari'] }}, Buku Kas Pembantu Tunai ditutup dengan keadaan/posisi sebagai berikut :<br>
                <strong>Saldo Kas Tunai : {{ number_format($report['data']['currentSaldo'], 0, '.', ',') }}</strong>
            </td>
        </tr>
    </table>

    <br/>

    <table>
        <tr>
            <td colspan="3" class="text-center">
                Menyetujui,<br>
                Kepala Sekolah
                <br/><br/><br/><br/>
                <span style="text-decoration: underline; font-weight: bold; text-transform: uppercase;">{{ $report['kepala_sekolah']['nama'] ?? '...................' }}</span><br>
                NIP. {{ $report['kepala_sekolah']['nip'] ?? '...................' }}
            </td>
            <td></td>
            <td colspan="3" class="text-center">
                {{ $report['sekolah']['kecamatan'] }}, {{ $report['formatTanggalAkhirBulanLengkap'] }}<br>
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
