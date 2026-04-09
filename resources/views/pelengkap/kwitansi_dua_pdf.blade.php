<!DOCTYPE html>
<html lang="id">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kwitansi Pembayaran 2</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700&display=swap');

        body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: {{ $fontSize ?? '10pt' }};
            line-height: 1.3;
            color: #000;
        }

        .kwitansi-container {
            background-color: white;
            padding: 10px 20px;
        }

        .header-table {
            width: 100%;
            border-collapse: collapse;
        }

        .header-table td {
            vertical-align: top;
            padding: 2px 0;
        }

        .title-container {
            text-align: center;
            margin: 15px 0 25px 0;
        }

        .title-container h1 {
            font-size: 38pt;
            font-family: 'Cinzel', serif;
            font-weight: 700;
            color: #4ade80;
            margin: 0;
            letter-spacing: 2px;
            text-shadow: 1px 1px 0px #eee, 2px 2px 0px #ddd;
        }

        .content-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 25px;
        }

        .content-table td {
            vertical-align: top;
            padding: 4px 0;
        }

        .terbilang-box {
            background-image: repeating-linear-gradient(90deg, #e5e7eb, #e5e7eb 8px, #ffffff 8px, #ffffff 12px);
            background-color: #e5e7eb; /* Fallback */
            padding: 5px 10px;
            font-weight: bold;
            display: inline-block;
            min-width: 80%;
        }

        .tax-table {
            border-collapse: collapse;
            margin-left: 20px;
        }

        .tax-table td {
            padding: 2px 5px;
        }

        .signature-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 40px;
        }

        .signature-table td {
            width: 33.33%;
            text-align: center;
            vertical-align: top;
        }

        .code-col {
            width: 160px;
            text-align: right;
            padding-right: 8px !important;
        }
    </style>
</head>

<body>
    <div class="kwitansi-container">
        <!-- Header Information -->
        <table class="header-table">
            <tr>
                <td style="width: 120px;">Sumber Dana</td>
                <td style="width: 10px;">:</td>
                <td style="width: 200px;">BOSP Reguler</td>
                <td style="width: 180px; text-align: right; padding-right: 10px;">No</td>
                <td>
                    <div style="border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 2px 0; display: inline-block;">
                        : {{ $kwitansi->bukuKasUmum->id_transaksi ?? 'KW-'.$kwitansi->id }}
                    </div>
                </td>
            </tr>
            <tr>
                <td>Tahun Anggaran</td>
                <td>:</td>
                <td colspan="3">{{ $kwitansi->penganggaran->tahun_anggaran ?? '-' }}</td>
            </tr>
            <tr>
                <td>Program</td>
                <td>:</td>
                <td colspan="3">
                    <table style="border-collapse: collapse; width: 100%;">
                        <tr>
                            <td class="code-col">{{ $parsedKode['kode_program'] ?? '-' }}</td>
                            <td>{{ $parsedKode['program'] ?? '-' }}</td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td>Sub Program</td>
                <td>:</td>
                <td colspan="3">
                    <table style="border-collapse: collapse; width: 100%;">
                        <tr>
                            <td class="code-col">{{ $parsedKode['kode_sub_program'] ?? '-' }}</td>
                            <td>{{ $parsedKode['sub_program'] ?? '-' }}</td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td>Uraian / Kegiatan</td>
                <td>:</td>
                <td colspan="3">
                    <table style="border-collapse: collapse; width: 100%;">
                        <tr>
                            <td class="code-col">{{ $parsedKode['kode_uraian'] ?? '-' }}</td>
                            <td>{{ $parsedKode['uraian'] ?? '-' }}</td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td>Kode Rekening</td>
                <td>:</td>
                <td colspan="3">
                    <table style="border-collapse: collapse; width: 100%;">
                        <tr>
                            <td class="code-col">{{ $kwitansi->rekeningBelanja->kode_rekening ?? '-' }}</td>
                            <td>{{ $kwitansi->rekeningBelanja->rincian_objek ?? '-' }}</td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>

        <!-- Title -->
        <div class="title-container">
            <h1>KWITANSI</h1>
        </div>

        <!-- Receipt Info -->
        <table class="content-table">
            <tr>
                <td style="width: 140px;">Sudah terima dari</td>
                <td style="width: 10px;">:</td>
                <td>Bendahara Dana BOSP {{ ucwords(strtolower($kwitansi->sekolah->nama_sekolah ?? '-')) }}</td>
            </tr>
            <tr>
                <td>Uang sebanyak</td>
                <td>:</td>
                <td style="font-weight: bold; font-style: italic;">{{ ucwords(strtolower($jumlahUangText ?? '-')) }}</td>
            </tr>
            <tr>
                <td>Untuk pembayaran</td>
                <td>:</td>
                <td>{{ $kwitansi->bukuKasUmum->uraian_opsional ?? $kwitansi->bukuKasUmum->uraian }}</td>
            </tr>
            <tr>
                <td>Terbilang</td>
                <td>:</td>
                <td>
                    <div class="terbilang-box">
                        Rp. {{ number_format($totalAmount, 0, ',', '.') }}
                    </div>
                </td>
            </tr>
        </table>

        <!-- Tax & Total -->
        <div style="margin-bottom: 20px;">
            <div>Sudah termasuk pajak</div>
            <table class="tax-table">
                <tr>
                    <td style="width: 80px; text-align: left;">PPN</td>
                    <td style="width: 15px; text-align: center;">=</td>
                    <td style="width: 150px;">Rp. {{ number_format($pajakData['ppn'] ?? 0, 0, ',', '.') }}</td>
                </tr>
                <tr>
                    <td style="text-align: left;">PPh</td>
                    <td style="text-align: center;">=</td>
                    <td>Rp. {{ number_format($pajakData['pph'] ?? 0, 0, ',', '.') }}</td>
                </tr>
                <tr>
                    <td style="text-align: left;">PB 1</td>
                    <td style="text-align: center;">=</td>
                    <td>Rp. {{ number_format($pajakData['pb1'] ?? 0, 0, ',', '.') }}</td>
                </tr>
            </table>
            <table style="width: 250px; border-collapse: collapse; background-color: #d1d5db; margin-top: 2px;">
                <tr>
                    <td style="width: 100px; padding: 4px 5px; text-align: left; font-weight: bold; border-top: 1px solid black; border-bottom: 2px solid black;">Jumlah</td>
                    <td style="width: 15px; padding: 4px 5px; text-align: center; font-weight: bold; border-top: 1px solid black; border-bottom: 2px solid black;">=</td>
                    <td style="padding: 4px 5px; font-weight: bold; border-top: 1px solid black; border-bottom: 2px solid black;">Rp. {{ number_format($totalAmount, 0, ',', '.') }}</td>
                </tr>
            </table>
        </div>

        <!-- Signatures -->
        <table class="signature-table">
            <tr>
                <td>
                    {{ $tanggalLunas ?? '-' }}<br>
                    Bendahara BOSP
                    <br><br><br><br><br><br>
                    <b>{{ $kwitansi->penganggaran->bendahara }}</b><br>
                    <span style="font-size: 9pt;">NIP. {{ $kwitansi->penganggaran->nip_bendahara }}</span>
                </td>
                <td>
                    <br>
                    Kepala Sekolah
                    <br><br><br><br><br><br>
                    <b>{{ $kwitansi->penganggaran->kepala_sekolah }}</b><br>
                    <span style="font-size: 9pt;">NIP. {{ $kwitansi->penganggaran->nip_kepala_sekolah }}</span>
                </td>
                <td>
                    <br>
                    Yang Menerima
                    <br><br><br><br><br><br>
                    ............................................................
                </td>
            </tr>
        </table>
    </div>
</body>

</html>
