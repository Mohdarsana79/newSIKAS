<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Buku Pembantu Bank</title>
    <style>
        @page {
            size: {{ $paperSize }} {{ $orientation }};
            margin: 1cm 1.5cm;
        }
        body {
            font-family: Arial, sans-serif;
            font-size: {{ $fontSize }};
            line-height: 1.3;
        }
        .header {
            text-align: center;
            font-weight: bold;
            margin-bottom: 20px;
            text-transform: uppercase;
        }
        .meta-table {
            width: 100%;
            margin-bottom: 15px;
            border: none;
            font-size: {{ $fontSize }};
        }
        .meta-table td {
            padding: 2px;
            vertical-align: top;
        }
        .meta-label {
            width: 150px;
        }
        .border-table {
            width: 100%;
            border-collapse: collapse;
            font-size: {{ $fontSize }};
            margin-bottom: 15px;
        }
        .border-table th, .border-table td {
            border: 1px solid black;
            padding: 4px;
        }
        .border-table th {
            text-align: center;
            background-color: transparent;
            font-weight: bold;
            text-transform: uppercase;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .bold { font-weight: bold; }
        
        .footer-text {
            margin-top: 15px;
            font-size: {{ $fontSize }};
        }
        
        .signature-section {
            margin-top: 30px;
            width: 100%;
            font-size: {{ $fontSize }};
        }
        .signature-table {
            width: 100%;
            text-align: center;
        }
        .signature-space {
            height: 70px;
        }
    </style>
</head>
<body>
    @foreach($reportData as $index => $report)
    <div class="header">
        BUKU KAS PEMBANTU BANK<br>
        BULAN : {{ strtoupper($report['bulan']) }} TAHUN : {{ $report['tahun'] }}
    </div>

    <table class="meta-table">
        <tr>
            <td class="meta-label">NPSN</td>
            <td width="10">:</td>
            <td>{{ $report['sekolah']['npsn'] }}</td>
        </tr>
        <tr>
            <td class="meta-label">Nama Sekolah</td>
            <td>:</td>
            <td>{{ $report['sekolah']['nama_sekolah'] }}</td>
        </tr>
        <tr>
            <td class="meta-label">Desa/Kecamatan</td>
            <td>:</td>
            <td>{{ $report['sekolah']['alamat'] ?? ($report['sekolah']['kelurahan_desa'] . ' / ' . $report['sekolah']['kecamatan']) }}</td>
        </tr>
        <tr>
            <td class="meta-label">Kabupaten / Kota</td>
            <td>:</td>
            <td>{{ $report['sekolah']['kabupaten'] }}</td>
        </tr>
        <tr>
            <td class="meta-label">Provinsi</td>
            <td>:</td>
            <td>{{ $report['sekolah']['provinsi'] }}</td>
        </tr>
        <tr>
            <td class="meta-label">Sumber Dana</td>
            <td>:</td>
            <td>BOSP Reguler</td>
        </tr>
    </table>

    <table class="border-table">
        <thead>
            <tr>
                <th>TANGGAL</th>
                <th>KODE KEGIATAN</th>
                <th>KODE REKENING</th>
                <th>NO. BUKTI</th>
                <th>URAIAN</th>
                <th>PENERIMAAN</th>
                <th>PENGELUARAN</th>
                <th>SALDO</th>
            </tr>
            <tr style="background-color: #f0f0f0;">
                <td class="text-center">1</td>
                <td class="text-center">2</td>
                <td class="text-center">3</td>
                <td class="text-center">4</td>
                <td class="text-center">5</td>
                <td class="text-center">6</td>
                <td class="text-center">7</td>
                <td class="text-center">8</td>
            </tr>
        </thead>
        <tbody>
            {{-- Saldo Awal --}}
            <tr>
                <td class="text-center">01-{{ $report['bulanAngkaStr'] }}-{{ $report['tahun'] }}</td>
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
                <td class="text-right">{{ number_format($report['data']['saldo_awal'], 0, ',', '.') }}</td>
                <td class="text-right">0</td>
                <td class="text-right">{{ number_format($report['data']['saldo_awal'], 0, ',', '.') }}</td>
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
                    <td class="text-right">{{ $penerimaan > 0 ? number_format($penerimaan, 0, ',', '.') : '0' }}</td>
                    <td class="text-right">{{ $pengeluaran > 0 ? number_format($pengeluaran, 0, ',', '.') : '0' }}</td>
                    <td class="text-right">{{ number_format($currentSaldo, 0, ',', '.') }}</td>
                </tr>
            @endforeach

            <tr class="bold">
                <td colspan="5">Jumlah</td>
                <td class="text-right">{{ number_format($report['data']['saldo_awal'] + collect($report['items'])->sum('penerimaan'), 0, ',', '.') }}</td>
                <td class="text-right">{{ number_format(collect($report['items'])->sum('pengeluaran'), 0, ',', '.') }}</td>
                <td class="text-right">{{ number_format(($report['data']['saldo_awal'] + collect($report['items'])->sum('penerimaan')) - collect($report['items'])->sum('pengeluaran'), 0, ',', '.') }}</td>
            </tr>
        </tbody>
    </table>

    <div class="footer-text">
        Pada hari ini {{ $report['tanggalCetakFormatted'] }}, Buku Kas Bank Ditutup dengan keadaan/posisi buku sebagai berikut :<br>
        <strong>Saldo Bank : Rp. {{ number_format(($report['data']['saldo_awal'] + collect($report['items'])->sum('penerimaan')) - collect($report['items'])->sum('pengeluaran'), 0, ',', '.') }}</strong>
    </div>

    <div class="signature-section">
        <table class="signature-table">
            <tr>
                <td width="50%">
                    Menyetujui,<br>
                    Kepala Sekolah
                    <div class="signature-space"></div>
                    <span style="text-decoration: underline; font-weight: bold; text-transform: uppercase;">{{ $report['kepala_sekolah']['nama'] ?? '...................' }}</span><br>
                    NIP. {{ $report['kepala_sekolah']['nip'] ?? '...................' }}
                </td>
                <td width="50%">
                    {{ $report['sekolah']['kecamatan'] }}, {{ $report['tanggalCetakDOB'] }}<br>
                    Bendahara,
                    <div class="signature-space"></div>
                    <span style="text-decoration: underline; font-weight: bold; text-transform: uppercase;">{{ $report['bendahara']['nama'] ?? '...................' }}</span><br>
                    NIP. {{ $report['bendahara']['nip'] ?? '...................' }}
                </td>
            </tr>
        </table>
    </div>

    @if(!$loop->last)
        <div style="page-break-after: always;"></div>
    @endif
    @endforeach
</body>
</html>
