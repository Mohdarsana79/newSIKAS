<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Buku Kas Umum</title>
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
            <tr><td colspan="7" class="text-center bold">BUKU KAS UMUM</td></tr>
            <tr><td colspan="7" class="text-center bold">BULAN : {{ strtoupper($report['bulan']) }} TAHUN : {{ $report['tahun'] }}</td></tr>
        </table>
    </div>

    <table class="meta-table">
        <tr>
            <td colspan="2">Nama Sekolah</td>
            <td>: {{ $report['sekolah']['nama_sekolah'] }}</td>
            <td colspan="4"></td>
        </tr>
        <tr>
            <td colspan="2">Desa/Kecamatan</td>
            <td>: {{ $report['sekolah']['kelurahan_desa'] }} / {{ $report['sekolah']['kecamatan'] }}</td>
            <td colspan="4"></td>
        </tr>
        <tr>
            <td colspan="2">Kabupaten</td>
            <td>: {{ $report['sekolah']['kabupaten'] }}</td>
            <td colspan="4"></td>
        </tr>
        <tr>
            <td colspan="2">Provinsi</td>
            <td>: {{ $report['sekolah']['provinsi'] }}</td>
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
            @php $currentSaldo = 0; @endphp
            @foreach($report['items'] as $item)
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
                    <td class="text-right">{{ $penerimaan != 0 ? number_format($penerimaan, 0, '.', ',') : '-' }}</td>
                    <td class="text-right">{{ $pengeluaran != 0 ? number_format($pengeluaran, 0, '.', ',') : '-' }}</td>
                    <td class="text-right">{{ number_format($currentSaldo, 0, '.', ',') }}</td>
                </tr>
            @endforeach

            {{-- Footer Total --}}
            <tr class="bold">
                <td colspan="4" class="text-center" style="border: 1px solid black; background-color: #ccc; font-weight: bold;">Jumlah Penutupan</td>
                <td class="text-right" style="border: 1px solid black; background-color: #ccc; font-weight: bold;">{{ number_format($report['data']['total_penerimaan'], 0, '.', ',') }}</td>
                <td class="text-right" style="border: 1px solid black; background-color: #ccc; font-weight: bold;">{{ number_format($report['data']['total_pengeluaran'], 0, '.', ',') }}</td>
                <td class="text-right" style="border: 1px solid black; background-color: #ccc; font-weight: bold;">{{ number_format($report['data']['saldo_akhir'], 0, '.', ',') }}</td>
            </tr>
        </tbody>
    </table>

    <br/>

    <table>
        <tr>
            <td colspan="7">
                Pada hari ini, {{ $report['formatAkhirBulanLengkapHari'] }} Buku Kas Umum ditutup dengan keadaan/posisi sebagai berikut :
            </td>
        </tr>
    </table>

    <table class="closing-table">
        <tr>
            <td colspan="2">Saldo Buku Kas Umum</td>
            <td>:</td>
            <td colspan="4">Rp. {{ number_format($report['data']['saldo_bku'], 0, '.', ',') }}</td>
        </tr>
        <tr>
            <td colspan="2">Saldo Bank</td>
            <td>:</td>
            <td colspan="4">Rp. {{ number_format($report['data']['saldo_bank'] ?? 0, 0, '.', ',') }}</td>
        </tr>
         <tr>
            <td></td>
            <td>1. Dana Sekolah</td>
            <td>:</td>
            <td colspan="4">Rp. {{ number_format($report['data']['dana_sekolah'] ?? 0, 0, '.', ',') }}</td>
        </tr>
        <tr>
            <td></td>
            <td>2. Dana BOSP</td>
            <td>:</td>
            <td colspan="4">Rp. {{ number_format($report['data']['dana_bosp'] ?? 0, 0, '.', ',') }}</td>
        </tr>
        <tr>
            <td colspan="2">Saldo Kas Tunai</td>
            <td>:</td>
            <td colspan="4">Rp. {{ number_format($report['data']['saldo_tunai'] ?? 0, 0, '.', ',') }}</td>
        </tr>
        <tr class="bold">
            <td colspan="2" style="font-weight: bold;">Jumlah</td>
            <td style="font-weight: bold;">:</td>
            <td colspan="4" style="font-weight: bold;">Rp. {{ number_format($report['data']['saldo_bku'], 0, '.', ',') }}</td>
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
