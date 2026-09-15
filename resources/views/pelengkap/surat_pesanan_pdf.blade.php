<!DOCTYPE html>
<html lang="id">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Surat Pesanan Barang</title>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Roboto:wght@400;700&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: {{ $fontSize ?? '11pt' }};
            line-height: 1.5;
            padding: 30px;
        }

        .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 3px solid #000;
            padding-bottom: 10px;
        }

        .header-title {
            font-weight: bold;
            font-size: 1.3em;
            text-transform: uppercase;
        }

        .title {
            text-align: center;
            font-weight: bold;
            font-size: 1.2em;
            text-decoration: underline;
            margin-top: 10px;
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
            margin-left: 0;
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
            vertical-align: top;
            text-align: center;
        }
    </style>
</head>

<body>
    @if(isset($suratPesanan->penganggaran->sekolah->kop_surat) && $suratPesanan->penganggaran->sekolah->kop_surat)
        <div class="header-kop" style="text-align: center; border-bottom: 3px solid #000; margin-bottom: 20px; padding-bottom: 10px;">
            <img src="{{ public_path('storage/' . $suratPesanan->penganggaran->sekolah->kop_surat) }}" alt="Kop Surat" style="width: 100%; object-fit: contain;">
        </div>
    @else
        <div class="header">
            <div class="header-title">{{ $suratPesanan->penganggaran->sekolah->nama_sekolah ?? 'SEKOLAH' }}</div>
            <div>{{ $suratPesanan->penganggaran->sekolah->alamat ?? 'Alamat Sekolah' }}</div>
        </div>
    @endif

    <div class="title">SURAT PESANAN (SP) BARANG</div>
    <div class="subtitle">Nomor: {{ $suratPesanan->nomor_sp ?? '_______________________' }}</div>

    <div class="content">
        <p>Yang bertanda tangan di bawah ini:</p>

        <table class="identity-table">
            <tr>
                <td class="identity-label">Nama</td>
                <td class="identity-separator">:</td>
                <td>{{ $suratPesanan->pihak_kesatu_nama ?? '...................................................' }}</td>
            </tr>
            @if(!empty($suratPesanan->pihak_kesatu_nip))
            <tr>
                <td>NIP</td>
                <td>:</td>
                <td>{{ $suratPesanan->pihak_kesatu_nip }}</td>
            </tr>
            @endif
            <tr>
                <td>Jabatan</td>
                <td>:</td>
                <td>{{ $suratPesanan->pihak_kesatu_jabatan ?? '...................................................' }}</td>
            </tr>
            <tr>
                <td>Instansi</td>
                <td>:</td>
                <td>{{ $suratPesanan->pihak_kesatu_instansi ?? '...................................................' }}</td>
            </tr>
            <tr>
                <td>Alamat</td>
                <td>:</td>
                <td>{{ $suratPesanan->pihak_kesatu_alamat ?? '...................................................' }}</td>
            </tr>
        </table>
        <p>Dalam hal ini bertindak untuk dan atas nama <strong>{{ $suratPesanan->pihak_kesatu_instansi ?? 'Instansi' }}</strong>, yang selanjutnya disebut <strong>PIHAK KESATU</strong> (Pemesan).</p>

        <p>Dengan ini memesan barang/jasa kepada:</p>
        <table class="identity-table">
            <tr>
                <td class="identity-label">Nama Perusahaan / Toko</td>
                <td class="identity-separator">:</td>
                <td>{{ $suratPesanan->pihak_kedua_nama_perusahaan ?? '...................................................' }}</td>
            </tr>
            <tr>
                <td>Penanggung Jawab</td>
                <td>:</td>
                <td>{{ $suratPesanan->pihak_kedua_penanggung_jawab ?? '...................................................' }}</td>
            </tr>
            <tr>
                <td>Alamat Perusahaan</td>
                <td>:</td>
                <td>{{ $suratPesanan->pihak_kedua_alamat ?? '...................................................' }}</td>
            </tr>
            @if(!empty($suratPesanan->pihak_kedua_npwp))
            <tr>
                <td>NPWP</td>
                <td>:</td>
                <td>{{ $suratPesanan->pihak_kedua_npwp }}</td>
            </tr>
            @endif
        </table>
        <p>Dalam hal ini bertindak untuk dan atas nama perusahaan/toko tersebut, yang selanjutnya disebut <strong>PIHAK KEDUA</strong> (Penyedia).</p>

        <p>Dengan rincian pesanan sebagai berikut:</p>

        <table class="item-table">
            <thead>
                <tr>
                    <th>No</th>
                    <th>Nama Barang</th>
                    <th>Jumlah</th>
                    <th>Satuan</th>
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
                    <td class="text-right">{{ number_format($detail->harga_satuan, 0, ',', '.') }}</td>
                    <td class="text-right">{{ number_format($subtotal, 0, ',', '.') }}</td>
                </tr>
                @empty
                <tr>
                    <td>1</td>
                    <td class="text-left">{{ $bku->uraian_opsional ?? $bku->uraian }}</td>
                    <td>1</td>
                    <td>Paket</td>
                    <td class="text-right">{{ number_format($totalKeseluruhan, 0, ',', '.') }}</td>
                    <td class="text-right">{{ number_format($totalKeseluruhan, 0, ',', '.') }}</td>
                </tr>
                @endforelse
                <tr>
                    <td colspan="5" class="text-right" style="font-weight: bold;">Total Harga</td>
                    <td class="text-right" style="font-weight: bold;">{{ number_format($totalKeseluruhan, 0, ',', '.') }}</td>
                </tr>
            </tbody>
        </table>

        <div>
            <p><strong>Syarat dan Ketentuan:</strong></p>
            <ol>
                <li><strong>Waktu Pengiriman:</strong> {{ $suratPesanan->waktu_pengiriman ?? 'Barang harus dikirimkan selambat-lambatnya setelah Surat Pesanan ini disetujui.' }}</li>
                <li><strong>Kondisi Barang:</strong> {{ $suratPesanan->kondisi_barang ?? 'Barang yang dikirim harus dalam keadaan baru, tidak cacat, dan sesuai dengan spesifikasi yang tertera. PIHAK KESATU berhak menolak barang yang tidak sesuai.' }}</li>
                <li><strong>Ketentuan Pembayaran:</strong> {{ $suratPesanan->ketentuan_pembayaran ?? 'Pembayaran akan ditransfer ke rekening PIHAK KEDUA setelah seluruh barang diterima dengan baik yang dibuktikan dengan penandatanganan Berita Acara Serah Terima (BAST).' }}</li>
                <li><strong>Sumber Dana:</strong> {{ $suratPesanan->sumber_dana ?? 'Pembiayaan pengadaan barang ini dibebankan pada dana BOSP.' }}</li>
            </ol>

            <p>Demikian Surat Pesanan ini dibuat untuk dapat dilaksanakan dengan penuh tanggung jawab.</p>

            <div class="signature-area" style="page-break-inside: avoid;">
                <table class="signature-table" style="margin-top: 30px;">
                    <tr>
                        <td style="font-weight: bold;">
                            Menyetujui,<br>
                            PIHAK KEDUA
                            <br><br><br><br><br>
                            <u>{{ $suratPesanan->pihak_kedua_penanggung_jawab ?? '................................' }}</u>
                        </td>
                        <td style="font-weight: bold;">
                            {{ $suratPesanan->penganggaran->sekolah->kecamatan ?? '........................' }}, {{ $tanggalSp->translatedFormat('d F Y') }}<br>
                            Pemesan / PIHAK KESATU
                            <br><br><br><br><br>
                            <u>{{ $suratPesanan->pihak_kesatu_nama ?? '_________________________' }}</u>
                            @if(!empty($suratPesanan->pihak_kesatu_nip))
                            <br>NIP. {{ $suratPesanan->pihak_kesatu_nip }}
                            @endif
                        </td>
                    </tr>
                </table>
            </div>
        </div>
    </div>
</body>

</html>
