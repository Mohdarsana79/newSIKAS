<!DOCTYPE html>
<html>
<head>
    <title>LPH - Laporan Penggunaan Hibah</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            font-size: {{ $fontSize ?? '11pt' }}; 
            margin: 1cm 1.5cm 1cm 1.5cm;
            line-height: 1.3;
        }
        .text-center { text-align: center; }
        .text-bold { font-weight: bold; }
        .text-right { text-align: right; }
        
        .header { text-align: center; margin-bottom: 30px; }
        .title {
            text-align: center;
            font-weight: bold;
            font-size: 1.2em;
            margin-bottom: 5px;
        }
        .subtitle {
            text-align: center;
            font-size: 1em;
            margin-bottom: 20px;
        }
        
        .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        .meta-table td { padding: 2px; vertical-align: top; border: none; }
        
        .content-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 10px; 
            font-size: 0.95em;
        }
        .content-table th, .content-table td { 
            border: 1px solid #000; 
            padding: 4px 6px; 
            vertical-align: top;
        }
        .content-table th {
            text-align: center;
            background-color: #f0f0f0;
            vertical-align: middle;
        }
        
        .amount-col { text-align: right; }
        .bg-grey { background-color: #f0f0f0; }
        
        .footer-text {
            text-align: justify;
            margin-top: 15px;
            margin-bottom: 30px;
        }
        
        .signature-table { width: 100%; margin-top: 30px; }
        .page-number {
             position: fixed;
             bottom: 0px;
             left: 0px; 
             font-style: italic;
             font-size: 10pt;
        }
        .pagination-info {
            position: fixed;
            bottom: 0;
            right: 0;
            font-size: 10pt;
        }

    </style>
</head>
<body>
    <div class="header">
        <div class="title">LAPORAN PENGGUNAAN HIBAH DANA BOSP REGULER</div>
        <div class="subtitle">Semester {{ $lph->semester }} Tahun {{ $lph->penganggaran->tahun_anggaran }}</div>
    </div>
    
    <table class="meta-table">
        <tr>
            <td style="width: 150px; font-weight: bold;">NPSN</td>
            <td style="width: 10px;">:</td>
            <td>{{ $sekolah->npsn }}</td>
        </tr>
        <tr>
            <td style="font-weight: bold;">Nama Sekolah</td>
            <td>:</td>
            <td>{{ $sekolah->nama_sekolah }}</td>
        </tr>
        <tr>
            <td style="font-weight: bold;">Desa/Kelurahan</td>
            <td>:</td>
            <td>{{ $sekolah->desa_kelurahan ?? $sekolah->alamat }}</td> 
        </tr>
         <tr>
            <td style="font-weight: bold;">Kecamatan</td>
            <td>:</td>
            <td>{{ $sekolah->kecamatan }}</td>
        </tr>
         <tr>
            <td style="font-weight: bold;">Kabupaten/Kota</td>
            <td>:</td>
            <td>{{ $sekolah->kabupaten_kota }}</td>
        </tr>
         <tr>
            <td style="font-weight: bold;">Provinsi</td>
            <td>:</td>
            <td>{{ $sekolah->provinsi }}</td>
        </tr>
    </table>
    
    <p style="margin-bottom: 5px;">
        Bersama ini kami laporkan realisasi atas penggunaan Dana BOSP Reguler untuk Semester {{ $lph->semester }} tahun {{ $lph->penganggaran->tahun_anggaran }} sebagai berikut:
    </p>

    <table class="content-table">
        <thead>
            <tr>
                <th style="width: 30px;">No</th>
                <th>Uraian</th>
                <th style="width: 100px;">Jumlah<br>Anggaran<br>(Rp)</th>
                <th style="width: 100px;">Jumlah<br>Realisasi<br>s/d<br>Semester<br>Ini (Rp)</th>
                <th style="width: 100px;">Selisih<br>/Kurang<br>(Rp)</th>
            </tr>
        </thead>
        <tbody>
            <!-- Penerimaan -->
            <tr>
                <td class="text-bold"></td>
                <td class="text-bold">Penerimaan</td>
                <td class="bg-grey"></td>
                <td class="bg-grey"></td>
                <td class="bg-grey"></td>
            </tr>
            <tr>
                <td></td>
                <td>:: BOSP Reguler</td>
                <td class="amount-col">{{ number_format($lph->penerimaan_anggaran, 0, ',', '.') }}</td>
                <td class="amount-col">{{ number_format($lph->penerimaan_realisasi, 0, ',', '.') }}</td>
                <td class="amount-col">{{ number_format($lph->penerimaan_selisih, 0, ',', '.') }}</td>
            </tr>
            <tr>
                <td></td>
                <td class="text-right text-bold">Jumlah</td>
                <td class="amount-col">{{ number_format($lph->penerimaan_anggaran, 0, ',', '.') }}</td>
                <td class="amount-col">{{ number_format($lph->penerimaan_realisasi, 0, ',', '.') }}</td>
                <td class="amount-col">{{ number_format($lph->penerimaan_selisih, 0, ',', '.') }}</td>
            </tr>

            <!-- Spacer Row -->
            <tr><td colspan="5" style="border:none; height:10px;"></td></tr>

             <!-- Pengeluaran -->
            <tr>
                <td class="text-bold"></td>
                <td class="text-bold">Pengeluaran</td>
                <td class="bg-grey"></td>
                <td class="bg-grey"></td>
                <td class="bg-grey"></td>
            </tr>
            
            <!-- Belanja Operasional -->
            <tr>
                <td></td>
                <td>a. Belanja Operasional</td>
                <td class="bg-grey"></td>
                <td class="bg-grey"></td>
                <td class="bg-grey"></td>
            </tr>
            <tr>
                <td></td>
                <td style="padding-left: 20px;">:: BOSP Reguler</td>
                <td class="amount-col">{{ number_format($lph->belanja_operasi_anggaran, 0, ',', '.') }}</td>
                <td class="amount-col">{{ number_format($lph->belanja_operasi_realisasi, 0, ',', '.') }}</td>
                <td class="amount-col">{{ number_format($lph->belanja_operasi_selisih, 0, ',', '.') }}</td>
            </tr>

            <!-- Belanja Modal -->
            <tr>
                <td></td>
                <td>b. Belanja Modal</td>
                <td class="bg-grey"></td>
                <td class="bg-grey"></td>
                <td class="bg-grey"></td>
            </tr>
            
            <!-- Belanja Modal Peralatan -->
            <tr>
                <td></td>
                <td style="padding-left: 10px;">1) Belanja Modal Peralatan dan Mesin</td>
                <td class="bg-grey"></td>
                <td class="bg-grey"></td>
                <td class="bg-grey"></td>
            </tr>
            <tr>
                <td></td>
                <td style="padding-left: 30px;">:: BOSP Reguler</td>
                <td class="amount-col">{{ number_format($lph->belanja_modal_peralatan_anggaran, 0, ',', '.') }}</td>
                <td class="amount-col">{{ number_format($lph->belanja_modal_peralatan_realisasi, 0, ',', '.') }}</td>
                <td class="amount-col">{{ number_format($lph->belanja_modal_peralatan_selisih, 0, ',', '.') }}</td>
            </tr>

            <!-- Belanja Modal Aset Lainnya -->
            <tr>
                <td></td>
                <td style="padding-left: 10px;">2) Belanja Modal Aset Tetap Lainnya</td>
                <td class="bg-grey"></td>
                <td class="bg-grey"></td>
                <td class="bg-grey"></td>
            </tr>
            <tr>
                <td></td>
                <td style="padding-left: 30px;">:: BOSP Reguler</td>
                <td class="amount-col">{{ number_format($lph->belanja_modal_aset_anggaran, 0, ',', '.') }}</td>
                <td class="amount-col">{{ number_format($lph->belanja_modal_aset_realisasi, 0, ',', '.') }}</td>
                <td class="amount-col">{{ number_format($lph->belanja_modal_aset_selisih, 0, ',', '.') }}</td>
            </tr>

            <!-- Total Jumlah -->
             <tr>
                <td></td>
                <td class="text-right text-bold">Jumlah</td>
                <td class="amount-col">{{ number_format($lph->penerimaan_anggaran, 0, ',', '.') }}</td>
                <td class="amount-col">{{ number_format($lph->penerimaan_realisasi, 0, ',', '.') }}</td>
                <td class="amount-col">{{ number_format($lph->penerimaan_selisih, 0, ',', '.') }}</td>
            </tr>
        </tbody>
    </table>

    <div class="footer-text">
        Laporan realisasi yang disampaikan telah sesuai dengan sasaran penggunaan yang ditetapkan dengan peraturan perundang-undangan dan telah didukung oleh kelengkapan dokumen yang sah sesuai ketentuan yang berlaku dan bertanggungjawab atas kebenarannya.<br>
        Demikian laporan realisasi ini dibuat untuk digunakan sebagaimana mestinya.
    </div>

    <!-- Signature -->
    <table class="signature-table">
        <tr>
            <td style="width: 60%;"></td>
            <td style="width: 40%; text-align: center;">
                {{ $sekolah->kecamatan ?? '................' }}, {{ $tanggal_cetak }}<br>
                Kepala Satdik
                <br><br><br><br><br>
                <div style="font-weight: bold;">{{ $kepala_sekolah->nama ?? '.....................................' }}</div>
                <div style="border-top: 1px solid black; display: inline-block; padding-top: 2px;">NIP. {{ $kepala_sekolah->nip ?? '.....................................' }}</div>
            </td>
        </tr>
    </table>
    
    <div class="page-number">Laporan Penggunaan Hibah Dana BOSP Semester {{ $lph->semester }} Tahun {{ $lph->penganggaran->tahun_anggaran }}</div>
    <div class="pagination-info">Halaman 1 dari 1</div>

</body>
</html>
