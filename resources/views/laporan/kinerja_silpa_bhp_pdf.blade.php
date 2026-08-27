<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>REKAPITULASI REALISASI BELANJA DANA BOSP (BARANG HABIS PAKAI)</title>
    <style>
        @page {
            size: {{ $printSettings['paperSize'] ?? 'Legal' }} {{ $printSettings['orientation'] ?? 'landscape' }};
            margin: 1cm 1.5cm;
        }
        body {
            font-family: Arial, sans-serif;
            font-size: {{ $printSettings['fontSize'] ?? '10pt' }};
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
            font-size: {{ $printSettings['fontSize'] ?? '10pt' }};
        }
        .meta-table td {
            vertical-align: top;
            padding: 2px 0;
        }
        .main-table {
            width: 100%;
            border-collapse: collapse;
            font-size: {{ $printSettings['fontSize'] ?? '9pt' }};
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
    </style>
</head>
<body>
    <div style="position: absolute; top: 0; right: 0; border: 1px solid black; padding: 5px 15px; font-weight: bold; font-size: 14pt;">BHP</div>
    <div class="header">
        <span style="font-size: 1.1em;">REKAPITULASI REALISASI BELANJA DANA BOSP ( BARANG HABIS PAKAI)</span><br>
        <span style="font-size: 0.9em; font-weight: normal; margin-top: 5px; display: inline-block;">
            PERIODE TANGGAL: {{ $periodeInfo['periode_awal'] }} s/d {{ $periodeInfo['periode_akhir'] }}<br>
            {{ $periodeInfo['label'] ?? '' }} TAHUN {{ $tahun }}
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
            <td>Desa/Kecamatan</td>
            <td>:</td>
            <td>{{ $sekolah->kelurahan_desa ?? '-' }} / {{ $sekolah->kecamatan ?? '-' }}</td>
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
    </table>

    <table class="main-table">
        <thead>
            <tr>
                <th width="8%">TANGGAL</th>
                <th width="10%">KODE KEGIATAN</th>
                <th width="12%">KODE REKENING</th>
                <th width="15%">NO. BUKTI</th>
                <th width="25%">URAIAN</th>
                <th width="5%">JML BARANG</th>
                <th width="10%">HARGA SATUAN</th>
                <th width="15%">REALISASI</th>
            </tr>
            <tr style="background-color: #e0e0e0; font-size: 8pt;">
                <th>1</th>
                <th>2</th>
                <th>3</th>
                <th>4</th>
                <th>5</th>
                <th>6</th>
                <th>7</th>
                <th>8</th>
            </tr>
        </thead>
        <tbody>
            @php $total = 0; @endphp
            @forelse($bhpData as $item)
                @php $total += $item['jumlah']; @endphp
                <tr>
                    <td class="text-center">{{ $item['tanggal'] }}</td>
                    <td class="text-center">{{ $item['kode_kegiatan'] }}</td>
                    <td class="text-center">{{ $item['kode_rekening'] }}</td>
                    <td class="text-center">{{ $item['no_bukti'] }}</td>
                    <td>{{ $item['uraian'] }}</td>
                    <td class="text-center">{{ $item['volume'] }}</td>
                    <td class="text-right">{{ number_format($item['harga_satuan'], 0, ',', '.') }}</td>
                    <td class="text-right">{{ number_format($item['jumlah'], 0, ',', '.') }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="8" class="text-center" style="padding: 15px;">Tidak ada data BHP untuk periode ini.</td>
                </tr>
            @endforelse
            
            <tr style="background-color: #f5f5f5;">
                <td colspan="7" class="text-center bold">JUMLAH</td>
                <td class="text-right bold">Rp. {{ number_format($total, 0, ',', '.') }}</td>
            </tr>
        </tbody>
    </table>

    <div class="signature-section">
        <table class="signature-table">
            <tr>
                <td width="50%">
                    Menyetujui,<br>
                    Kepala Sekolah
                    <div class="signature-space"></div>
                    <strong><u>{{ $penganggaran->kepala_sekolah ?? '.........................' }}</u></strong><br>
                    NIP. {{ $penganggaran->nip_kepala_sekolah ?? '.........................' }}
                </td>
                <td width="50%">
                    Kec. {{ $sekolah->kecamatan ?? '................' }}, {{ $tanggal_cetak }}<br>
                    Bendahara
                    <div class="signature-space"></div>
                    <strong><u>{{ $penganggaran->bendahara ?? '.........................' }}</u></strong><br>
                    NIP. {{ $penganggaran->nip_bendahara ?? '.........................' }}
                </td>
            </tr>
        </table>
    </div>
</body>
</html>
