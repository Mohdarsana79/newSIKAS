<!DOCTYPE html>
<html>
<head>
    <title>SPMTH</title>
    <style>
        body { 
            font-family: "Arial", Times, serif; 
            font-size: {{ $fontSize ?? '10pt' }}; 
            margin: 0.2cm 1cm 0.2cm 1cm; /* Adjusted as per user preference but could be 2cm */
            line-height: 1.3;
        }
        .text-center { text-align: center; }
        .text-bold { font-weight: bold; }
        .text-right { text-align: right; }
        
        /* Table Styles */
        .table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 10px; 
            margin-bottom: 20px; 
        }
        .table th, .table td { 
            border: 1px solid black; 
            padding: 8px 5px; /* Increased padding for breathing room */
            vertical-align: middle;
        }
        
        /* Info Table Styles */
        .info-table { width: 100%; border: none; margin-bottom: 10px; }
        .info-table td { padding: 2px; vertical-align: top; border: none;}
        
        /* Header Styles */
        .header { text-align: center; margin-bottom: 20px; }
        .letterhead { width: 100%; height: auto; }
        .separator { border-top: 3px solid #000; margin-top: 5px; margin-bottom: 5px; }
        
        /* Signature Styles */
        .signature-table { 
            width: 100%; 
            border: none; 
            margin-top: 30px; 
            page-break-inside: avoid;
        }
        .signature-table td { 
            border: none; 
            text-align: center; 
            vertical-align: top; 
        }
    </style>
</head>
<body>
    @if ($sekolah && $sekolah->kop_surat)
    <div class="header">
        <img src="{{ public_path('storage/' . $sekolah->kop_surat) }}" class="letterhead" alt="Kop Surat">
        <div class="separator"></div>
        <h3 class="text-bold" style="margin-bottom: 5px; text-decoration: underline;">SURAT PERNYATAAN TELAH MENERIMA HIBAH (SPTMH)</h3>
        <p style="margin-top: 0;">NOMOR : {{ $spmth->nomor_surat }}</p>
    </div>
    @else
    <div class="header">
        <h3 class="text-bold" style="margin-bottom: 5px; text-decoration: underline;">SURAT PERNYATAAN TELAH MENERIMA HIBAH (SPTMH)</h3>
        <p style="margin-top: 0;">NOMOR : {{ $spmth->nomor_surat }}</p>
    </div>
    @endif
    
    <p>Menyatakan bahwa saya atas nama :</p>
    <table class="info-table">
        <tr>
            <td style="width: 150px;">Nama Sekolah</td>
            <td style="width: 10px;">:</td>
            <td>{{ $sekolah->nama_sekolah }}</td>
        </tr>
        <tr>
            <td>Alamat</td>
            <td>:</td>
            <td>{{ $sekolah->alamat }}</td>
        </tr>
        <tr>
            <td>Kecamatan</td>
            <td>:</td>
            <td>{{ $sekolah->kecamatan }}</td>
        </tr>
        <tr>
            <td>Kabupaten</td>
            <td>:</td>
            <td>{{ $sekolah->kabupaten_kota }}</td>
        </tr>
        <tr>
            <td>Provinsi</td>
            <td>:</td>
            <td>{{ $sekolah->provinsi }}</td>
        </tr>
        <tr>
            <td>NPSN</td>
            <td>:</td>
            <td>{{ $sekolah->npsn }}</td>
        </tr>
    </table>

    <p style="text-align: justify;">
        Bertanggungjawab penuh atas segala penerima hibah berupa uang yang diterima langsung pada {{ $semester_text }}, Tanpa melalui RKUD dengan rincian sebagai berikut :
    </p>

    <table class="table">
        <thead>
            <tr>
                <th rowspan="2" class="text-center" style="width: 20%;">Kode Rekening</th>
                <th rowspan="2" class="text-center">Pagu</th>
                <th colspan="2" class="text-center">Realisasi</th>
                <th rowspan="2" class="text-center">Sisa</th>
            </tr>
            <tr>
                <th class="text-center">s.d. semester lalu</th>
                <th class="text-center">Semester ini</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td class="text-center">4.3.4.1.1</td>
                <td class="text-right" style="padding-right: 10px;">Rp. {{ number_format($pagu ?? 0, 0, ',', '.') }}</td>
                <td class="text-right" style="padding-right: 10px;">Rp. {{ number_format($spmth->realisasi_lalu, 0, ',', '.') }}</td>
                <td class="text-right" style="padding-right: 10px;">Rp. {{ number_format($spmth->realisasi_ini, 0, ',', '.') }}</td>
                <td class="text-right" style="padding-right: 10px;">Rp. {{ number_format($spmth->sisa, 0, ',', '.') }}</td>
            </tr>
        </tbody>
    </table>

    <p style="text-align: justify;">
        Bukti-bukti terkait hal tersebut diatas sesuai ketentuan yang berlaku pada Satuan Pendidikan Sekolah Dasar, untuk kelengkapan administrasi dan keperluan pemeriksaan aparat pengawas fungsional.
    </p>
    <p>Demikian Surat Pernyataan ini dibuat dengan sebenarnya.</p>

    <table class="signature-table">
        <tr>
            <td style="width: 50%;"></td> <!-- Spacer -->
            <td style="width: 50%;">
                <p>{{ $sekolah->kecamatan ?? '................' }}, {{ $tanggal_cetak }}</p>
                <p>Kepala Sekolah</p>
                <br><br><br><br>
                <p class="text-bold" style="text-decoration: underline;">{{ $kepala_sekolah->nama ?? '..........................' }}</p>
                <p>NIP. {{ $kepala_sekolah->nip ?? '..........................' }}</p>
            </td>
        </tr>
    </table>
</body>
</html>
