<!DOCTYPE html>
<html>
<head>
    <title>Kwitansi</title>
    <style>
        body { font-family: sans-serif; }
        .header { text-align: center; margin-bottom: 20px; }
        .content { margin: 20px; }
        .row { margin-bottom: 10px; }
        .label { display: inline-block; width: 150px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h2>KWITANSI</h2>
        <p>Nomor: {{ $kwitansi->id }}</p>
    </div>
    <div class="content">
        <div class="row">
            <span class="label">Sudah Terima Dari:</span> BENDAHARA SEKOLAH
        </div>
        <div class="row">
            <span class="label">Banyaknya Uang:</span> {{ $jumlahUangText }}
        </div>
        <div class="row">
            <span class="label">Untuk Pembayaran:</span> {{ $kwitansi->bukuKasUmum->uraian_opsional ?? $kwitansi->bukuKasUmum->uraian }}
        </div>
        <div class="row">
            <span class="label">Jumlah:</span> Rp {{ number_format($totalAmount, 0, ',', '.') }}
        </div>
        <br>
        <div class="row">
            <span class="label">Tanggal Lunas:</span> {{ $tanggalLunas }}
        </div>
    </div>
</body>
</html>
