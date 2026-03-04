<!DOCTYPE html>
<html>
<head>
    <title>SP2B - Surat Permintaan Pengesahan Belanja</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            font-size: {{ $fontSize ?? '10pt' }}; 
            margin: 0.5cm 1.3cm 0.5cm 1.3cm;
            line-height: 1.4;
        }
        .text-center { text-align: center; }
        .text-bold { font-weight: bold; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        
        .header { text-align: center; margin-bottom: 25px; }
        .separator { border-top: 3px solid #000; margin-top: 8px; margin-bottom: 2px; border-bottom: 1px solid #000; height: 1px; }
        .letterhead { width: 100%; height: auto; display: block; margin: 0 auto; }
        
        .title {
            text-align: center;
            font-weight: bold;
            font-size: 1.2em;
            text-decoration: underline;
            margin-bottom: 5px;
            margin-top: 15px;
        }
        
        /* Utility tables */
        .info-table {
            width: 100%;
            margin-top: 10px;
            margin-bottom: 15px;
        }
        .info-table td {
            vertical-align: top;
        }

        .summary-table {
            width: 80%;
            margin: 0 auto 15px auto;
        }
        .summary-table td {
            vertical-align: top;
            padding: 3px 0;
        }
        .col-number { text-align: right; width: 120px; }
        .col-currency { width: 30px; text-align: left; }

        .bordered-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .bordered-table th, .bordered-table td {
            border: 1px solid #000;
            padding: 6px;
            vertical-align: middle;
        }
        .bordered-table th {
            background-color: #f2f2f2;
            font-weight: bold;
        }
        .indent-1 { padding-left: 15px; }
        
        .amount-container {
            width: 100%;
            border-collapse: collapse;
            border: none;
        }
        .amount-container td {
            border: none;
            padding: 0;
            background: transparent;
        }
        .amount-currency {
            width: 25px;
            text-align: left;
        }
        .amount-value {
            text-align: right;
        }

        .signature-table {
            width: 100%;
            margin-top: 30px;
            page-break-inside: avoid;
        }
        .signature-table td {
            vertical-align: top;
            text-align: center;
            width: 50%;
        }
        .signature-space {
            height: 70px;
        }
    </style>
</head>
<body>
    <div class="header">
        @if ($sekolah && $sekolah->kop_surat)
            <img src="{{ public_path('storage/' . $sekolah->kop_surat) }}" class="letterhead" alt="Kop Surat">
            <div class="separator"></div>
        @else
            <h3 class="text-bold" style="margin: 0;">PEMERINTAH {{ strtoupper($sekolah->kabupaten_kota ?? 'KABUPATEN') }}</h3>
            <h3 class="text-bold" style="margin: 0;">DINAS PENDIDIKAN DAN KEBUDAYAAN</h3>
            <h2 class="text-bold" style="margin: 5px 0;">{{ strtoupper($sekolah->nama_sekolah ?? 'NAMA SEKOLAH') }}</h2>
            <p style="font-size: 0.9em; margin: 0;">Alamat : {{ $sekolah->alamat }} {{ $sekolah->kecamatan }} NPSN : {{ $sekolah->npsn }} Kode Pos : {{ $sekolah->kode_pos }}</p>
            <p style="font-size: 0.9em; margin: 0;">Email : {{ $sekolah->email ?? '-' }}</p>
            <div class="separator"></div>
        @endif
        
        <div class="title">SURAT PERMINTAAN PENGESAHAN BELANJA (SP2B)</div>
        <div class="text-bold text-center" style="font-size: 1.1em;">SATUAN PENDIDIKAN {{ strtoupper($sekolah->status_sekolah ?? 'NEGERI') }}</div>
    </div>
    
    <table class="info-table">
        <tr>
            <td style="text-align:center"><strong>Nomor :</strong> {{ $sp2b->nomor_sp2b }}</td>
        </tr>
    </table>

    <p style="text-align: justify; margin-top: 10px; margin-bottom: 20px; text-indent: 30px;">
        Kepala SKPD Dinas Pendidikan dan Kebudayaan Kabupaten {{ $sekolah->kabupaten_kota ?? 'Tolitoli' }}, memohon kepada Bendahara Umum Daerah selaku PPKD agar mengesahkan dan membukukan Penerimaan dan Belanja BOS sejumlah:
    </p>

    <!-- List -->
    <table class="summary-table">
        <tr>
            <td style="width: 30px;">1.</td>
            <td style="width: 250px;">Saldo Awal</td>
            <td class="col-currency">: Rp</td>
            <td class="col-number">{{ number_format($sp2b->saldo_awal, 0, ',', '.') }}</td>
        </tr>
        <tr>
            <td>2.</td>
            <td>Pendapatan</td>
            <td class="col-currency">: Rp</td>
            <td class="col-number">{{ number_format($sp2b->pendapatan, 0, ',', '.') }}</td>
        </tr>
        <tr>
            <td>3.</td>
            <td>Belanja</td>
            <td class="col-currency">: Rp</td>
            <td class="col-number">{{ number_format($sp2b->belanja, 0, ',', '.') }}</td>
        </tr>
        <tr>
            <td></td>
            <td class="indent-1">a. Belanja Pegawai</td>
            <td class="col-currency">: Rp</td>
            <td class="col-number">{{ number_format($sp2b->belanja_pegawai, 0, ',', '.') }}</td>
        </tr>
        <tr>
            <td></td>
            <td class="indent-1">b. Belanja Barang dan Jasa</td>
            <td class="col-currency">: Rp</td>
            <td class="col-number">{{ number_format($sp2b->belanja_barang_jasa, 0, ',', '.') }}</td>
        </tr>
        <tr>
            <td></td>
            <td class="indent-1">c. Belanja Modal</td>
            <td class="col-currency">: Rp</td>
            <td class="col-number">{{ number_format($sp2b->belanja_modal, 0, ',', '.') }}</td>
        </tr>
        <tr>
            <td class="text-bold">4.</td>
            <td class="text-bold">Saldo Akhir</td>
            <td class="text-bold col-currency">: Rp</td>
            <td class="text-bold col-number" style="border-top: 1px solid #777;">{{ number_format($sp2b->saldo_akhir, 0, ',', '.') }}</td>
        </tr>
    </table>

    <div class="text-center text-bold" style="margin: 25px 0 10px 0;">Untuk Bulan {{ $periode_text }}</div>

    <table class="bordered-table" style="margin-bottom: 25px;">
        <tr>
            <th class="text-center" width="25%">Dasar Pengesahan</th>
            <th class="text-center" width="15%">Urusan</th>
            <th class="text-center" width="25%">Organisasi</th>
            <th class="text-center" width="35%">Nama Satdik</th>
        </tr>
        <tr>
            <td class="text-center">.........................</td>
            <td class="text-center">1.01</td>
            <td class="text-center">1.01.1.01.01</td>
            <td class="text-center text-bold">{{ strtoupper($sekolah->nama_sekolah ?? 'NAMA SEKOLAH') }}</td>
        </tr>
    </table>

    <table class="bordered-table">
        <tr>
            <th rowspan="2" class="text-center" width="22%">PENERIMAAN</th>
            <th colspan="3" class="text-center">BELANJA</th>
        </tr>
        <tr>
            <th class="text-center" width="18%">Kode Rekening</th>
            <th class="text-center" width="35%">Uraian</th>
            <th class="text-center" width="25%">Jumlah</th>
        </tr>
        <tr>
            <!-- PENERIMAAN CELL -->
            <td rowspan="7" valign="top">
                <table class="amount-container">
                    <tr>
                        <td class="amount-currency">Rp</td>
                        <td class="amount-value text-bold">{{ number_format($sp2b->pendapatan, 0, ',', '.') }}</td>
                    </tr>
                </table>
            </td>
            <!-- BELANJA PEGAWAI -->
            <td class="text-center">5.1.02.02</td>
            <td>Belanja Pegawai</td>
            <td>
                <table class="amount-container">
                    <tr>
                        <td class="amount-currency">Rp</td>
                        <td class="amount-value">{{ number_format($sp2b->belanja_pegawai, 0, ',', '.') }}</td>
                    </tr>
                </table>
            </td>
        </tr>
        <tr>
            <td class="text-center">5.1.02</td>
            <td>Belanja Barang dan Jasa</td>
            <td>
                <table class="amount-container">
                    <tr>
                        <td class="amount-currency">Rp</td>
                        <td class="amount-value">{{ number_format($sp2b->belanja_barang_jasa, 0, ',', '.') }}</td>
                    </tr>
                </table>
            </td>
        </tr>
        <tr>
            <td class="text-center">5.2</td>
            <td>Belanja Modal</td>
            <td>
                <table class="amount-container">
                    <tr>
                        <td class="amount-currency">Rp</td>
                        <td class="amount-value">{{ number_format($sp2b->belanja_modal, 0, ',', '.') }}</td>
                    </tr>
                </table>
            </td>
        </tr>
        <tr>
            <td class="text-center">5.2.02</td>
            <td class="indent-1">1. Belanja Modal Peralatan dan Mesin</td>
            <td>
                <table class="amount-container">
                    <tr>
                        <td class="amount-currency">Rp</td>
                        <td class="amount-value">{{ number_format($sp2b->belanja_modal_peralatan_mesin, 0, ',', '.') }}</td>
                    </tr>
                </table>
            </td>
        </tr>
        <tr>
            <td class="text-center">5.2.04</td>
            <td class="indent-1">2. Belanja Modal Jalan, Jaringan, dan Irigasi</td>
            <td>
                <table class="amount-container">
                    <tr>
                        <td class="amount-currency">Rp</td>
                        <td class="amount-value">{{ number_format($sp2b->belanja_modal_aset_tetap_lainnya, 0, ',', '.') }}</td>
                    </tr>
                </table>
            </td>
        </tr>
        <tr>
            <td class="text-center">5.2.05</td>
            <td class="indent-1">3. Belanja Modal Aset Tetap Lainnya</td>
            <td>
                <table class="amount-container">
                    <tr>
                        <td class="amount-currency">Rp</td>
                        <td class="amount-value">{{ number_format($sp2b->belanja_modal_tanah_bangunan, 0, ',', '.') }}</td>
                    </tr>
                </table>
            </td>
        </tr>
        <tr style="background-color: #fcebeb;">
            <td colspan="2" class="text-center text-bold">Jumlah Belanja</td>
            <td>
                <table class="amount-container">
                    <tr>
                        <td class="amount-currency text-bold">Rp</td>
                        <td class="amount-value text-bold">{{ number_format($sp2b->belanja, 0, ',', '.') }}</td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    <table class="signature-table">
        <tr>
            <td></td>
            <td>
                {{ $sekolah->kabupaten_kota ?? '................' }}, {{ $tanggal_cetak }}<br>
                Kepala Sekolah
                <div class="signature-space"></div>
                <div style="font-weight: bold; text-decoration: underline; text-transform: uppercase;">
                    {{ $kepala_sekolah->nama ?? '.....................................' }}
                </div>
                <div>NIP. {{ $kepala_sekolah->nip ?? '.....................................' }}</div>
            </td>
        </tr>
    </table>

</body>
</html>
