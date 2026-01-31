<!DOCTYPE html>
<html>
<head>
    <title>SPTJ - Surat Pernyataan Tanggung Jawab Mutlak</title>
    <style>
        body { 
            font-family: "Arial Narrow", Arial, sans-serif; 
            font-size: {{ $fontSize ?? '11pt' }}; 
            margin: 0.5cm 1.5cm 0.5cm 1.5cm;
            line-height: 1.3;
        }
        .text-center { text-align: center; }
        .text-bold { font-weight: bold; }
        .text-right { text-align: right; }
        
        .header { text-align: center; margin-bottom: 20px; }
        .separator { border-top: 3px solid #000; margin-top: 5px; margin-bottom: 5px; border-bottom: 1px solid #000; height: 1px; }
        .letterhead { width: 100%; height: auto; }
        
        .title {
            text-align: center;
            font-weight: bold;
            font-size: 1.1em;
            text-decoration: underline;
            margin-bottom: 5px;
        }
        
        .info-table { width: 100%; border-collapse: collapse; margin-bottom: 5px; }
        .info-table td { padding: 1px; vertical-align: top; border: none;}
        
        /* Financial Table */
        .content-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .content-table td { padding: 2px; vertical-align: top; border: none; }
        .amount-col { text-align: right; }
        
    </style>
</head>
<body>
    <div class="header">
        @if ($sekolah && $sekolah->kop_surat)
            <img src="{{ public_path('storage/' . $sekolah->kop_surat) }}" class="letterhead" alt="Kop Surat">
            <div class="separator"></div>
        @else
            <h3 class="text-bold">PEMERINTAH {{ strtoupper($sekolah->kabupaten_kota ?? 'KABUPATEN') }}</h3>
            <h3 class="text-bold">DINAS PENDIDIKAN DAN KEBUDAYAAN</h3>
            <h2 class="text-bold">{{ $sekolah->nama_sekolah ?? 'NAMA SEKOLAH' }}</h2>
            <p style="font-size: 0.9em;">Alamat : {{ $sekolah->alamat }} {{ $sekolah->kecamatan }} NPSN : {{ $sekolah->npsn }} Kode Pos : {{ $sekolah->kode_pos }}</p>
            <p style="font-size: 0.9em;">Email : {{ $sekolah->email ?? '-' }}</p>
            <div class="separator"></div>
        @endif
        
        <div class="title">SURAT PERTANGGUNG JAWABAN MUTLAK</div>
    </div>
    
    <p style="text-align: justify; margin-top: 10px;">
        Saya yang bertanda tangan dibawah ini menyatakan bahwa bertanggung jawab secara formal dan materil atas kebenaran realisasi penerimaan dan pengeluaran Dana BOS serta kebenaran perhitungan setoran pajak yang telah dipungut atas penggunaan Dana BOS Tahap {{ $sptj->tahap }} tahun anggaran {{ $sptj->penganggaran->tahun_anggaran ?? now()->year }}
    </p>
    <p style="text-align: center;">Nomor : {{ $sptj->nomor_sptj }}</p>

    <!-- Metadata Section -->
    <table class="info-table">
        <tr>
            <td>NPSN</td>
            <td>:</td>
            <td>{{ $sekolah->npsn }}</td>
            <td></td>
        </tr>
         <tr>
            <td>Nama Sekolah</td>
            <td>:</td>
            <td>{{ $sekolah->nama_sekolah }}</td>
            <td></td>
        </tr>
         <tr>
            <td>Kode Sekolah</td>
            <td>:</td>
            <td>....................................................</td>
            <td></td>
        </tr>
         <tr>
            <td>Nomor / Tanggal DPA SKPD</td>
            <td>:</td>
            <td>....................................................</td>
            <td></td>
        </tr>
        <tr>
            <td>Kegiatan Dana BOSP</td>
            <td>:</td>
            <td>Reguler</td>
            <td></td>
        </tr>
    </table>

    <!-- Financial Data Section -->
    <table class="content-table">
        <!-- A -->
        <tr>
            <td style="width: 30px; text-align: center;">A.</td>
            <td colspan="2">Saldo Awal Dana BOSP Reguler</td>
            <td style="width: 10px;">:</td>
            <td style="width: 30px;">Rp</td>
            <td class="amount-col">-</td>
        </tr>

        <!-- B -->
        <tr>
            <td style="text-align: center;">B.</td>
            <td colspan="5">Penerimaan Dana BOSP Reguler</td>
        </tr>
        <tr>
            <td></td>
            <td style="width: 20px; text-align: right;">1</td>
            <td>Tahap I</td>
            <td>:</td>
            <td>Rp</td>
            <td class="amount-col">{{ number_format($sptj->tahap_satu, 0, ',', '.') }}</td>
        </tr>
        <tr>
            <td></td>
            <td style="text-align: right;">2</td>
            <td>Tahap II</td>
            <td>:</td>
            <td>Rp</td>
            <td class="amount-col">{{ $sptj->tahap_dua == 0 ? '-' : number_format($sptj->tahap_dua, 0, ',', '.') }}</td>
        </tr>
         <tr>
            <td></td>
            <td></td>
            <td>Jumlah penerimaan</td>
            <td>:</td>
            <td>Rp</td>
            <td class="amount-col">{{ number_format($sptj->tahap_satu + $sptj->tahap_dua, 0, ',', '.') }}</td>
        </tr>

        <!-- Spacer -->
        <tr><td colspan="6" style="height: 10px;"></td></tr>

        <!-- C -->
        <tr>
            <td style="text-align: center;">C.</td>
            <td colspan="5">Pengeluaran Dana BOSP Reguler</td>
        </tr>
        <tr>
            <td></td>
            <td style="text-align: right;">1</td>
            <td>Jenis Belanja Pegawai</td>
            <td>:</td>
            <td>Rp</td>
            <td class="amount-col">{{ number_format($sptj->jenis_belanja_pegawai, 0, ',', '.') }}</td>
        </tr>
        <tr>
            <td></td>
            <td style="text-align: right;">2</td>
            <td>Jenis Belanja Barang dan Jasa</td>
            <td>:</td>
            <td>Rp</td>
            <td class="amount-col">{{ number_format($sptj->jenis_belanja_barang_jasa, 0, ',', '.') }}</td>
        </tr>
        <tr>
            <td></td>
            <td style="text-align: right;">3</td>
            <td>Jenis Belanja Modal</td>
            <td>:</td>
            <td>Rp</td>
            <td class="amount-col">{{ number_format($sptj->jenis_belanja_modal, 0, ',', '.') }}</td>
        </tr>
        <tr>
            <td></td>
            <td></td>
            <td>Jumlah Pengeluaran</td>
            <td>:</td>
            <td>Rp</td>
            <td class="amount-col">{{ number_format($sptj->jenis_belanja_pegawai + $sptj->jenis_belanja_barang_jasa + $sptj->jenis_belanja_modal, 0, ',', '.') }}</td>
        </tr>

        <!-- Spacer -->
        <tr><td colspan="6" style="height: 10px;"></td></tr>

        <!-- D -->
        <tr>
            <td style="text-align: center;">D.</td>
            <td colspan="5">Sisa Dana BOSP Reguler</td>
        </tr>
        <tr>
            <td></td>
            <td colspan="5">Terdiri Atas :</td>
        </tr>
        <tr>
            <td></td>
            <td style="text-align: right;">1</td>
            <td>Sisa Kas Tunai</td>
            <td>:</td>
            <td>Rp</td>
            <td class="amount-col">{{ $sptj->sisa_kas_tunai == 0 ? '-' : number_format($sptj->sisa_kas_tunai, 0, ',', '.') }}</td>
        </tr>
        <tr>
            <td></td>
            <td style="text-align: right;">2</td>
            <td>Sisa Dana Di Bank</td>
            <td>:</td>
            <td>Rp</td>
            <td class="amount-col">{{ $sptj->sisa_dana_di_bank == 0 ? '-' : number_format($sptj->sisa_dana_di_bank, 0, ',', '.') }}</td>
        </tr>
    </table>

    <p style="text-align: justify; margin-top: 20px;">
        Bukti-bukti atas belanja tersebut pada huruf B disimpan pada Satdikdas Negeri untuk kelengkapan administrasi dan keperluan pemeriksaan sesuai peraturan perundang-undangan. Apabila bukti-bukti tersebut tidak benar yang mengakibatkan kerugian daerah, saya bertanggung jawab sepenuhnya atas kerugian daerah dimaksud sesuai kewenangan saya berdasarkan peraturan perundang-undangan.
    </p>
    <p style="margin-top: 5px;">Demikian Surat Pernyataan ini dibuat dengan sebenarnya.</p>

    <!-- Signature -->
    <table style="width: 100%; margin-top: 30px;">
        <tr>
            <td style="width: 60%;"></td>
            <td style="width: 40%; text-align: center;">
                {{ $sekolah->kecamatan ?? '................' }}, {{ $tanggal_cetak }}<br>
                Kepala Sekolah
                <br><br><br><br><br>
                <div style="font-weight: bold; text-decoration: underline;">{{ $kepala_sekolah->nama ?? '.....................................' }}</div>
                <div>NIP. {{ $kepala_sekolah->nip ?? '.....................................' }}</div>
            </td>
        </tr>
    </table>

</body>
</html>
