<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Register Penutupan Kas</title>
    <style>
        @page {
            size: {{ $printSettings['ukuran_kertas'] ?? 'A4' }} {{ $printSettings['orientasi'] ?? 'portrait' }};
            margin: 1cm 1.5cm;
        }
        body {
            font-family: Arial, sans-serif;
            font-size: {{ $printSettings['font_size'] ?? '10pt' }};
            line-height: 1.3;
        }
        .header {
            text-align: center;
            font-weight: bold;
            margin-bottom: 20px;
        }
        .text-bold { font-weight: bold; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        
        .info-table {
            width: 100%;
            border: none;
            margin-bottom: 10px;
        }
        .info-table td {
            vertical-align: top;
            padding: 2px;
        }

        .money-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
        }
        .money-table td {
            padding: 2px;
        }
        
        .section-title {
            font-weight: bold;
            margin-top: 10px;
            margin-bottom: 5px;
        }

        .indent {
            padding-left: 20px;
        }
        
        .signature-section {
            margin-top: 30px;
            width: 100%;
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
    @foreach($reports as $report)
    <div class="header">
        Formulir BOS-K7B<br>
        REGISTER PENUTUPAN KAS
    </div>

    <table class="info-table">
        <tr>
            <td width="250">Tanggal Penutupan Kas</td>
            <td width="10">:</td>
            <td class="text-bold">{{ $report['tanggalPenutupan'] }}</td>
        </tr>
        <tr>
            <td>Nama Penutup Kas (Pemegang Kas)</td>
            <td>:</td>
            <td class="text-bold">{{ $report['namaBendahara'] }}</td>
        </tr>
        <tr>
            <td>Tanggal Penutupan Kas Yang Lalu</td>
            <td>:</td>
            <td>{{ $report['tanggalPenutupanLalu'] }}</td>
        </tr>
        <tr>
            <td>Jumlah Total Penerimaan (D)</td>
            <td>:</td>
            <td class="text-bold">Rp. {{ number_format($report['totalPenerimaan'], 0, ',', '.') }}</td>
        </tr>
         <tr>
            <td>Jumlah Total Pengeluaran (K)</td>
            <td>:</td>
            <td class="text-bold">Rp. {{ number_format($report['totalPengeluaran'], 0, ',', '.') }}</td>
        </tr>
         <tr>
            <td>Saldo Buku (A = D - K)</td>
            <td>:</td>
            <td class="text-bold">Rp. {{ number_format($report['saldoBuku'], 0, ',', '.') }}</td>
        </tr>
         <tr>
            <td>Saldo Kas (B)</td>
            <td>:</td>
            <td class="text-bold">Rp. {{ number_format($report['saldoKas'], 0, ',', '.') }}</td>
        </tr>
    </table>

    <div class="section-title" style="background-color: #f5f5f5; padding: 5px;">Saldo Kas B terdiri dari :</div>

    <div class="section-title">1. Lembaran uang kertas</div>
    <table class="money-table indent">
        @foreach($report['uangKertas'] as $item)
        <tr>
            <td width="200">Lembaran uang kertas</td>
            <td width="30">Rp.</td>
            <td width="80" class="text-right">{{ number_format($item['denominasi'], 0, ',', '.') }}</td>
            <td width="50" class="text-center">{{ $item['lembar'] }}</td>
            <td width="60">Lembar</td>
            <td width="30">Rp.</td>
            <td class="text-right">{{ number_format($item['jumlah'], 0, ',', '.') }}</td>
        </tr>
        @endforeach
        <tr class="text-bold">
            <td colspan="5" class="text-right" style="padding-right: 20px;">Sub Jumlah (1)</td>
            <td>Rp.</td>
            <td class="text-right">{{ number_format($report['totalUangKertas'], 0, ',', '.') }}</td>
        </tr>
    </table>

    <div class="section-title">2. Keping uang logam</div>
    <table class="money-table indent">
         @foreach($report['uangLogam'] as $item)
        <tr>
            <td width="200">Keping uang logam</td>
            <td width="30">Rp.</td>
            <td width="80" class="text-right">{{ number_format($item['denominasi'], 0, ',', '.') }}</td>
            <td width="50" class="text-center">{{ $item['keping'] }}</td>
            <td width="60">Keping</td>
             <td width="30">Rp.</td>
            <td class="text-right">{{ number_format($item['jumlah'], 0, ',', '.') }}</td>
        </tr>
        @endforeach
        <tr class="text-bold">
            <td colspan="5" class="text-right" style="padding-right: 20px;">Sub Jumlah (2)</td>
             <td>Rp.</td>
            <td class="text-right">{{ number_format($report['totalUangLogam'], 0, ',', '.') }}</td>
        </tr>
    </table>

    <div class="section-title">3. Saldo Bank, Surat Berharga, dll</div>
    <table class="money-table indent">
        <tr class="text-bold">
            <td width="420" class="text-right" style="padding-right: 20px;">Sub Jumlah (3)</td>
             <td width="30">Rp.</td>
            <td class="text-right">{{ number_format($report['saldoBank'], 0, ',', '.') }}</td>
        </tr>
        <tr class="text-bold">
            <td class="text-right" style="padding-right: 20px;">Jumlah (1 + 2 + 3)</td>
             <td>Rp.</td>
            <td class="text-right">{{ number_format($report['saldoAkhirBuku'], 0, ',', '.') }}</td>
        </tr>
         <tr class="text-bold">
            <td class="text-right" style="padding-right: 20px;">Perbedaan (A-B)</td>
             <td>Rp.</td>
            <td class="text-right">{{ number_format($report['perbedaan'], 0, ',', '.') }}</td>
        </tr>
    </table>

    <div style="margin-top: 10px;">
        <span class="text-bold">Penjelasan Perbedaan :</span><br>
        <span style="font-style: italic;">{{ $report['penjelasanPerbedaan'] }}</span>
    </div>

    <div class="signature-section">
        <table class="signature-table">
            <tr>
                <td width="50%">
                    <br>
                    Yang diperiksa,
                    <div class="signature-space"></div>
                    <span class="text-bold uppercase">{{ $report['namaKepalaSekolah'] ?? '.........................' }}</span><br>
                    NIP. {{ $report['nipKepalaSekolah'] ?? '.........................' }}
                </td>
                <td width="50%">
                    <span class="text-bold">{{ $report['kecamatan'] ?? '.............' }}, {{ $report['tanggal_cetak_format'] ?? $report['tanggalPenutupan'] }}</span><br>
                    Yang Memeriksa,
                    <div class="signature-space"></div>
                    <span class="text-bold uppercase">{{ $report['namaBendahara'] ?? '.........................' }}</span><br>
                    NIP. {{ $report['nipBendahara'] ?? '.........................' }}
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
