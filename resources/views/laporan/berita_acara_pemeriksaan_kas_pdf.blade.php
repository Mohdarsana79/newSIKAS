<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Berita Acara Pemeriksaan Kas</title>
    <style>
        @page {
            size: {{ $printSettings['ukuran_kertas'] ?? 'A4' }} {{ $printSettings['orientasi'] ?? 'portrait' }};
            margin: 1cm 1.5cm;
        }
        body {
            font-family: Arial, sans-serif;
            font-size: {{ $printSettings['font_size'] ?? '11pt' }};
            line-height: 1.5;
        }
        .header {
            text-align: center;
            font-weight: bold;
            margin-bottom: 20px;
            font-size: 11pt;
            text-transform: uppercase;
        }
        .text-bold { font-weight: bold; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        
        .content {
            margin-bottom: 20px;
        }
        
        .info-table {
            width: 100%;
            border: none;
            margin-bottom: 15px;
            margin-left: 30px;
        }
        .info-table td {
            vertical-align: top;
            padding: 2px;
        }
        
        .value-table {
            width: 90%;
            border: none;
            margin-left: 30px;
            margin-bottom: 15px;
        }
        .value-table td {
            vertical-align: top;
            padding: 2px;
        }

        .indent {
            padding-left: 20px;
        }
        
        .signature-section {
            margin-top: 50px;
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
        BERITA ACARA PEMERIKSAAN KAS
    </div>

    <div class="content">
        <div style="text-align: justify; margin-bottom: 10px;">
            Pada hari ini, {{ $report['namaHariAkhirBulan'] }} tanggal {{ $report['tanggalPenutupan'] }} yang bertanda tangan di bawah ini, kami Kepala Sekolah yang ditunjuk berdasarkan Surat Keputusan No. {{ $report['skKepsek'] }} Tanggal {{ $report['tanggalSkKepsek'] }}
        </div>

        <table class="info-table">
            <tr>
                <td width="150">Nama</td>
                <td width="10">:</td>
                <td class="text-bold">{{ $report['namaKepalaSekolah'] }}</td>
            </tr>
            <tr>
                <td>Jabatan</td>
                <td>:</td>
                <td>Kepala Sekolah</td>
            </tr>
        </table>

         <div style="margin-bottom: 10px;">
            Melakukan pemeriksaan kas kepada :
        </div>

        <table class="info-table">
            <tr>
                <td width="150">Nama</td>
                <td width="10">:</td>
                <td class="text-bold">{{ $report['namaBendahara'] }}</td>
            </tr>
            <tr>
                <td>Jabatan</td>
                <td>:</td>
                <td>Bendahara BOS</td>
            </tr>
        </table>

        <div style="text-align: justify; margin-bottom: 10px;">
            Yang berdasarkan Surat Keputusan Nomor : {{ $report['skBendahara'] }} Tanggal {{ $report['tanggalSkBendahara'] }} ditugaskan dengan pengurusan uang Bantuan Operasional Sekolah (BOS).
        </div>

        <div style="text-align: justify; margin-bottom: 10px;">
            Berdasarkan pemeriksaan kas serta bukti-bukti dalam pengurusan itu, kami menemui kenyataan sebagai berikut :
        </div>
        
        <div style="margin-bottom: 5px;">
            Jumlah uang yang dihitung di hadapan Bendahara / Pemegang Kas adalah :
        </div>

        <table class="value-table">
            <tr>
                <td width="30">a)</td>
                <td width="200">Uang kertas bank, uang logam</td>
                <td width="10">:</td>
                <td width="30">Rp.</td>
                <td class="text-right">{{ number_format($report['totalUangKertasLogam'], 0, ',', '.') }}</td>
            </tr>
            <tr>
                <td>b)</td>
                <td>Saldo Bank</td>
                <td>:</td>
                 <td>Rp.</td>
                <td class="text-right">{{ number_format($report['saldoBank'], 0, ',', '.') }}</td>
            </tr>
             <tr>
                <td>c)</td>
                <td>Surat Berharga dll</td>
                <td>:</td>
                 <td>Rp.</td>
                <td class="text-right">-</td>
            </tr>
            <tr class="text-bold">
                <td></td>
                <td>Jumlah</td>
                <td>:</td>
                 <td>Rp.</td>
                <td class="text-right">{{ number_format($report['totalKas'], 0, ',', '.') }}</td>
            </tr>
        </table>
        
        <table class="value-table">
             <tr>
                <td width="243">Saldo uang menurut Buku Kas Umum</td>
                <td width="10">:</td>
                 <td width="30">Rp.</td>
                <td class="text-right">{{ number_format($report['saldoBuku'], 0, ',', '.') }}</td>
            </tr>
            <tr class="text-bold">
                <td>Perbedaan antara Saldo Kas dan Saldo buku</td>
                <td>:</td>
                 <td>Rp.</td>
                <td class="text-right">{{ number_format($report['perbedaan'], 0, ',', '.') }}</td>
            </tr>
        </table>

    </div>

    <div class="signature-section">
        <table class="signature-table">
            <tr>
                <td colspan="2" class="text-center" style="padding-bottom: 20px;">
                    Kec. {{ $report['namaKecamatan'] }}, {{ $report['tanggalPenutupan'] }}
                </td>
            </tr>
            <tr>
                <td width="50%">
                    Bendahara BOSP
                    <div class="signature-space"></div>
                    <span class="text-bold uppercase">{{ $report['namaBendahara'] ?? '.........................' }}</span><br>
                    NIP. {{ $report['nipBendahara'] ?? '.........................' }}
                </td>
                <td width="50%">
                    Kepala Sekolah
                    <div class="signature-space"></div>
                    <span class="text-bold uppercase">{{ $report['namaKepalaSekolah'] ?? '.........................' }}</span><br>
                    NIP. {{ $report['nipKepalaSekolah'] ?? '.........................' }}
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
