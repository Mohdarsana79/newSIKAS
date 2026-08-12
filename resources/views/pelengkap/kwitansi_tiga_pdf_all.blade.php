<!DOCTYPE html>
<html lang="id">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Semua Kwitansi Pembayaran 3</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Times+New+Roman:wght@400;700&display=swap');

        body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: {{ $fontSize ?? '11pt' }};
            line-height: 1.3;
            color: #000;
            margin: 0;
            padding: 0;
        }
        
        .page-break {
            page-break-after: always;
        }

        .kwitansi-container {
            background-color: white;
            padding: 10px;
            border: 2px solid #000;
            margin-bottom: 20px;
        }

        .header-kop {
            width: 100%;
            border-bottom: 3px solid #000;
            margin-bottom: 10px;
        }

        .header-kop img {
            width: 100%;
            object-fit: contain;
        }

        /* If no image, fallback header */
        .fallback-header {
            text-align: center;
            width: 100%;
            border-bottom: 3px solid #000;
            margin-bottom: 10px;
            padding-bottom: 10px;
        }
        
        .fallback-header h2, .fallback-header h3 {
            margin: 0;
            padding: 2px;
        }

        .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
        }

        .info-table td {
            vertical-align: top;
            padding: 2px 4px;
        }

        .no-box {
            border: 1px solid #000;
            padding: 2px 5px;
            text-align: right;
            font-weight: bold;
            float: right;
        }

        .title-container {
            text-align: center;
            margin: 15px 0;
            clear: both;
        }

        .title-container h1 {
            font-size: 32pt;
            font-family: 'Times New Roman', Times, serif;
            font-weight: 700;
            margin: 0;
            letter-spacing: 5px;
            color: #2563eb; /* Use solid blue as dompdf does not support text-shadow outline */
        }

        .content-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }

        .content-table td {
            vertical-align: top;
            padding: 4px;
        }
        
        .label-col {
            width: 150px;
        }
        
        .colon-col {
            width: 10px;
        }

        .uang-sebanyak-box {
            border: 3px double #000;
            padding: 4px 10px;
            font-weight: bold;
            font-style: italic;
            background-color: #f8fafc;
            display: block;
        }

        .rincian-table {
            width: 90%;
            border-collapse: collapse;
            margin-top: 5px;
        }

        .rincian-table td {
            padding: 2px 5px;
        }
        
        .rincian-table .border-top-bottom {
            border-top: 1px solid #000;
            border-bottom: 2px solid #000;
            font-weight: bold;
        }

        .jumlah-box {
            border: 2px solid #000;
            padding: 5px 15px;
            font-weight: bold;
            font-size: 14pt;
            display: inline-block;
        }

        .signature-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }

        .signature-table td {
            width: 33.33%;
            text-align: center;
            vertical-align: top;
        }
        
        .clear {
            clear: both;
        }
    </style>
</head>

<body>
    @foreach($kwitansis as $index => $data)
    <div class="kwitansi-container @if(!$loop->last) page-break @endif">
        @php
        $kwitansi = $data['kwitansi'];
        $parsedKode = $data['parsedKode'];
        $jumlahUangText = $data['jumlahUangText'];
        $totalAmount = ($data['totalAmount'] > 0) ? $data['totalAmount'] : ($kwitansi->bukuKasUmum->total_transaksi_kotor ?? 0);
        $tanggalLunas = $data['tanggalLunas'];
        $pajakData = $data['pajakData'];
        $sekolah = $data['sekolah'];
        $tahapRoman = $data['tahapRoman'] ?? 'THP-I';
        @endphp
        
        <!-- Header Information -->
        @if(isset($sekolah->kop_surat) && $sekolah->kop_surat)
            <div class="header-kop">
                <img src="{{ public_path('storage/' . $sekolah->kop_surat) }}" alt="Kop Surat">
            </div>
        @else
            <div class="fallback-header">
                <h2>PEMERINTAH KABUPATEN TOLITOLI</h2>
                <h2>KORWIL DINAS PENDIDIKAN DAN KEBUDAYAAN</h2>
                <h3>{{ strtoupper($sekolah->nama_sekolah ?? 'SEKOLAH') }}</h3>
                <p style="margin: 5px 0 0 0; font-size: 10pt;">Alamat: {{ $sekolah->alamat ?? '-' }}</p>
            </div>
        @endif

        <table class="info-table" style="width: 100%; border-collapse: collapse;">
            <tr>
                <td style="width: 250px;">Sumber Dana</td>
                <td style="width: 10px;">:</td>
                <td style="width: 120px;">BOSP REGULER</td>
                <td rowspan="2" style="text-align: right; vertical-align: top;">
                    <div class="no-box">
                        No. {{ str_pad($kwitansi->bukuKasUmum->id_transaksi ?? $kwitansi->id, 3, '0', STR_PAD_LEFT) }}
                    </div>
                </td>
            </tr>
            <tr>
                <td>Tahun Anggaran</td>
                <td>:</td>
                <td>{{ $kwitansi->penganggaran->tahun_anggaran ?? '-' }}</td>
            </tr>
            <tr>
                <td>Kode Program/Kegiatan</td>
                <td>:</td>
                <td>{{ $parsedKode['kode_program'] ?? '-' }}</td>
                <td>{{ $parsedKode['program'] ?? '-' }}</td>
            </tr>
            <tr>
                <td>Kode Sub Program/Kegiatan</td>
                <td>:</td>
                <td>{{ $parsedKode['kode_sub_program'] ?? '-' }}</td>
                <td>{{ $parsedKode['sub_program'] ?? '-' }}</td>
            </tr>
            <tr>
                <td>Kode Sub Pembiayaan BOSP</td>
                <td>:</td>
                <td>{{ $parsedKode['kode_uraian'] ?? '-' }}</td>
                <td>{{ $parsedKode['uraian'] ?? '-' }}</td>
            </tr>
            <tr>
                <td>Kode Rekening Rincian Obyek Belanja</td>
                <td>:</td>
                <td>{{ $kwitansi->rekeningBelanja->kode_rekening ?? '-' }}</td>
                <td>{{ $kwitansi->rekeningBelanja->rincian_objek ?? '-' }}</td>
            </tr>
        </table>

        <!-- Title -->
        <div class="title-container">
            <h1>KWITANSI</h1>
        </div>

        <!-- Receipt Info -->
        <table class="content-table">
            <tr>
                <td class="label-col">Sudah Terima Dari</td>
                <td class="colon-col">:</td>
                <td>BENDAHARA DANA BOSP {{ strtoupper($sekolah->nama_sekolah ?? '-') }}</td>
            </tr>
            <tr>
                <td class="label-col">Uang Sebanyak</td>
                <td class="colon-col">:</td>
                <td>
                    <div class="uang-sebanyak-box">
                        {{ strtoupper($jumlahUangText ?? '-') }} RUPIAH
                    </div>
                </td>
            </tr>
            <tr>
                <td class="label-col">Untuk Pembayaran</td>
                <td class="colon-col">:</td>
                <td>{{ $kwitansi->bukuKasUmum->uraian_opsional ?? $kwitansi->bukuKasUmum->uraian }}</td>
            </tr>
            <tr>
                <td class="label-col"></td>
                <td class="colon-col"></td>
                <td>
                    <div style="margin-top: 5px; margin-bottom: 5px;">Rincian :</div>
                    <table style="width: 100%; border-collapse: collapse; border: 2px solid black;">
                        <thead>
                            <tr>
                                <th style="border: 1px solid black; padding: 5px; text-align: center;">Rincian</th>
                                <th style="border: 1px solid black; padding: 5px; text-align: center;">Jml</th>
                                <th style="border: 1px solid black; padding: 5px; text-align: center;">Satuan</th>
                                <th style="border: 1px solid black; padding: 5px; text-align: center;">Harga Satuan</th>
                                <th style="border: 1px solid black; padding: 5px; text-align: center;">Jumlah</th>
                            </tr>
                        </thead>
                        <tbody>
                            @if($kwitansi->bukuKasUmum && $kwitansi->bukuKasUmum->uraianDetails)
                                @foreach($kwitansi->bukuKasUmum->uraianDetails as $detail)
                                <tr>
                                    <td style="border: 1px solid black; padding: 5px;">{{ $detail->uraian }}</td>
                                    <td style="border: 1px solid black; padding: 5px; text-align: center;">{{ $detail->volume }}</td>
                                    <td style="border: 1px solid black; padding: 5px; text-align: center;">{{ $detail->satuan }}</td>
                                    <td style="border: 1px solid black; padding: 5px; text-align: right;">{{ number_format($detail->harga_satuan, 0, ',', '.') }}</td>
                                    <td style="border: 1px solid black; padding: 5px; text-align: right;">{{ number_format($detail->jumlah ?? ($detail->volume * $detail->harga_satuan), 0, ',', '.') }}</td>
                                </tr>
                                @endforeach
                            @endif
                            <tr>
                                <td colspan="4" style="border: 1px solid black; padding: 5px; text-align: center; font-weight: bold;">Jumlah</td>
                                <td style="border: 1px solid black; padding: 5px; text-align: right; font-weight: bold;">{{ number_format($totalAmount, 0, ',', '.') }}</td>
                            </tr>
                        </tbody>
                    </table>
                </td>
            </tr>
        </table>
        
        <table style="width: 100%; margin-top: 15px;">
            <tr>
                <td style="width: 150px; font-weight: bold; font-size: 12pt;">JUMLAH</td>
                <td style="width: 10px; font-weight: bold; font-size: 12pt;">:</td>
                <td>
                    <table style="border: 2px solid #000; font-weight: bold; font-size: 12pt; width: 250px; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 5px 10px; text-align: left; width: 40px;">Rp</td>
                            <td style="padding: 5px 10px; text-align: right;">{{ number_format($totalAmount, 0, ',', '.') }}</td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>

        <!-- Signatures -->
        <table class="signature-table" style="margin-top: 30px;">
            <tr>
                <td>
                    Setuju Bayar<br>
                    Kepala Sekolah
                    <br><br><br><br><br><br>
                    <b>{{ $kwitansi->penganggaran->kepala_sekolah ?? '-' }}</b><br>
                    NIP. {{ $kwitansi->penganggaran->nip_kepala_sekolah ?? '-' }}
                </td>
                <td>
                    {{ $tanggalLunas ?? '-' }}<br>
                    Bendahara BOSP
                    <br><br><br><br><br><br>
                    <b>{{ $kwitansi->penganggaran->bendahara ?? '-' }}</b><br>
                    NIP. {{ $kwitansi->penganggaran->nip_bendahara ?? '-' }}
                </td>
                <td>
                    <br>
                    Menerima
                    <br><br><br><br><br><br>
                    <b>{{ $kwitansi->bukuKasUmum->penerima ?? '.....................................' }}</b>
                </td>
            </tr>
        </table>
    </div>
    @endforeach
</body>
</html>
