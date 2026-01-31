<!DOCTYPE html>
<html>
<head>
    <title>Rekap Kwitansi</title>
    <style>
        body { font-family: sans-serif; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid black; padding: 5px; }
    </style>
</head>
<body>
    <h2>Rekap Kwitansi</h2>
    <p>Tanggal Download: {{ $tanggalDownload }}</p>
    
    <table>
        <thead>
            <tr>
                <th>No</th>
                <th>Uraian</th>
                <th>Tanggal</th>
                <th>Jumlah</th>
            </tr>
        </thead>
        <tbody>
            @foreach($kwitansis as $index => $item)
            <tr>
                <td>{{ $index + 1 }}</td>
                <td>{{ $item['kwitansi']->bukuKasUmum->uraian_opsional ?? $item['kwitansi']->bukuKasUmum->uraian }}</td>
                <td>{{ $item['tanggalLunas'] }}</td>
                <td>Rp {{ number_format($item['totalAmount'], 0, ',', '.') }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>
</body>
</html>
