<!DOCTYPE html>
<html lang="id">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Berita Acara Serah Terima Barang</title>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Roboto:wght@400;700&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: {{ $fontSize ?? '11pt' }};
            line-height: 1.5;
            padding: 30px;
        }

        .title {
            text-align: center;
            font-weight: bold;
            font-size: 1.3em;
            text-decoration: underline;
            margin-bottom: 5px;
        }

        .subtitle {
            text-align: center;
            margin-bottom: 20px;
        }

        .content {
            text-align: justify;
        }

        .identity-table {
            width: 100%;
            margin-left: 20px;
            margin-bottom: 10px;
        }
        
        .identity-table td {
            vertical-align: top;
            padding: 2px 0;
        }

        .identity-label {
            width: 150px;
        }

        .identity-separator {
            width: 10px;
        }

        .item-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            margin-bottom: 20px;
        }

        .item-table th, .item-table td {
            border: 1px solid #000;
            padding: 5px;
            text-align: center;
        }

        .item-table th {
            background-color: #f2f2f2;
            font-weight: bold;
        }

        .item-table .text-left {
            text-align: left;
        }

        .item-table .text-right {
            text-align: right;
        }

        .signature-area {
            width: 100%;
            margin-top: 40px;
            text-align: center;
        }

        .signature-table {
            width: 100%;
            border: none;
        }

        .signature-table td {
            width: 50%;
            vertical-align: bottom;
            text-align: center;
        }

        .signature-name {
            font-weight: bold;
            text-decoration: underline;
            margin-top: 80px;
        }

        .witness-area {
            text-align: center;
            margin-top: 30px;
        }
        
        .witness-name {
            margin-top: 80px;
        }
    </style>
</head>

<body>
    <div class="title">BERITA ACARA SERAH TERIMA BARANG</div>
    <div class="subtitle">Nomor: _______________________</div>

    <div class="content">
        <p>Pada hari ini, ________________ tanggal ________________ bulan ________________ tahun ________________, yang bertanda tangan di bawah ini:</p>

        <p><strong>1. PIHAK PERTAMA (Yang Menyerahkan)</strong></p>
        <table class="identity-table">
            <tr>
                <td class="identity-label">Nama</td>
                <td class="identity-separator">:</td>
                <td>{{ $bast->pihak_pertama_nama ?? '...................................................' }}</td>
            </tr>
            <tr>
                <td>Jabatan</td>
                <td>:</td>
                <td>{{ $bast->pihak_pertama_jabatan ?? '...................................................' }}</td>
            </tr>
            <tr>
                <td>Perusahaan/Instansi</td>
                <td>:</td>
                <td>{{ $bast->pihak_pertama_instansi ?? '...................................................' }}</td>
            </tr>
            <tr>
                <td>Alamat</td>
                <td>:</td>
                <td>{{ $bast->pihak_pertama_alamat ?? '...................................................' }}</td>
            </tr>
        </table>
        <p>Dalam hal ini bertindak untuk dan atas nama Perusahaan/Instansi tersebut di atas, yang selanjutnya disebut sebagai <strong>PIHAK PERTAMA</strong>.</p>

        <p><strong>2. PIHAK KEDUA (Yang Menerima)</strong></p>
        <table class="identity-table">
            <tr>
                <td class="identity-label">Nama</td>
                <td class="identity-separator">:</td>
                <td>{{ $bast->pihak_kedua_nama ?? '...................................................' }}</td>
            </tr>
            <tr>
                <td>Jabatan</td>
                <td>:</td>
                <td>{{ $bast->pihak_kedua_jabatan ?? '...................................................' }}</td>
            </tr>
            <tr>
                <td>Perusahaan/Instansi</td>
                <td>:</td>
                <td>{{ $bast->pihak_kedua_instansi ?? '...................................................' }}</td>
            </tr>
            <tr>
                <td>Alamat</td>
                <td>:</td>
                <td>{{ $bast->pihak_kedua_alamat ?? '...................................................' }}</td>
            </tr>
        </table>
        <p>Dalam hal ini bertindak untuk dan atas nama Perusahaan/Instansi tersebut di atas, yang selanjutnya disebut sebagai <strong>PIHAK KEDUA</strong>.</p>

        <p><strong>PIHAK PERTAMA</strong> dengan ini menyerahkan barang kepada <strong>PIHAK KEDUA</strong>, dan <strong>PIHAK KEDUA</strong> menyatakan telah menerima barang dari <strong>PIHAK PERTAMA</strong> dengan rincian sebagai berikut:</p>

        <table class="item-table">
            <thead>
                <tr>
                    <th>No</th>
                    <th>Nama Barang</th>
                    <th>Jumlah</th>
                    <th>Satuan</th>
                    <th>Kondisi</th>
                    <th>Harga<br>Satuan<br>(Rp)</th>
                    <th>Total<br>Harga (Rp)</th>
                </tr>
            </thead>
            <tbody>
                @forelse($uraianDetails as $index => $detail)
                @php 
                    $subtotal = ($detail->volume * $detail->harga_satuan);
                @endphp
                <tr>
                    <td>{{ $index + 1 }}</td>
                    <td class="text-left">{{ $detail->uraian }}</td>
                    <td>{{ $detail->volume }}</td>
                    <td>{{ $detail->satuan }}</td>
                    <td>{{ $detail->kondisi ?? 'Baik' }}</td>
                    <td class="text-right">{{ number_format($detail->harga_satuan, 0, ',', '.') }}</td>
                    <td class="text-right">{{ number_format($subtotal, 0, ',', '.') }}</td>
                </tr>
                @empty
                <tr>
                    <td>1</td>
                    <td class="text-left">{{ $bku->uraian_opsional ?? $bku->uraian }}</td>
                    <td>1</td>
                    <td>Paket</td>
                    <td>Baik</td>
                    <td class="text-right">{{ number_format($totalKeseluruhan, 0, ',', '.') }}</td>
                    <td class="text-right">{{ number_format($totalKeseluruhan, 0, ',', '.') }}</td>
                </tr>
                @endforelse
                <tr>
                    <td colspan="6" class="text-right" style="font-weight: bold;">Total Keseluruhan</td>
                    <td class="text-right" style="font-weight: bold;">{{ number_format($totalKeseluruhan, 0, ',', '.') }}</td>
                </tr>
            </tbody>
        </table>

        <div style="page-break-inside: avoid;">
            <p><strong>Ketentuan Tambahan:</strong></p>
            <ol>
                <li>Sejak ditandatanganinya Berita Acara ini, maka barang tersebut beserta segala tanggung jawab, perawatan, dan risikonya beralih menjadi tanggung jawab <strong>PIHAK KEDUA</strong>.</li>
                <li><strong>PIHAK KEDUA</strong> telah memeriksa dan memastikan bahwa barang yang diserahkan dalam kondisi baik dan sesuai dengan rincian pada tabel di atas.</li>
                <li>Nilai total barang yang diserah terimakan adalah sebesar Rp {{ number_format($totalKeseluruhan, 0, ',', '.') }} <em>({{ $terbilangText ?? '..................................................................' }})</em></li>
            </ol>

            <p>Demikian Berita Acara Serah Terima Barang ini dibuat dengan sebenarnya dalam rangkap 2 (dua) yang masing-masing memiliki kekuatan hukum yang sama, untuk dipergunakan sebagaimana mestinya.</p>

            <div class="signature-area">
                <table class="signature-table" style="margin-top: 30px;">
                    <tr>
                        <td style="font-weight: bold;">
                            PIHAK PERTAMA
                            <br><br><br><br><br>
                            _________________________ 
                        </td>
                        <td style="font-weight: bold;">
                            PIHAK KEDUA
                            <br><br><br><br><br>
                            _________________________ 
                        </td>
                    </tr>
                </table>
            </div>
        </div>
    </div>
</body>

</html>
