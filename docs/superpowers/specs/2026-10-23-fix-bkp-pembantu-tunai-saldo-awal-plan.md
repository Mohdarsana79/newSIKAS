# Rencana Implementasi: Perbaikan Saldo Awal & Double Counting Penarikan Tunai BKP Pembantu Tunai

Dokumen ini berisi analisis penyebab masalah, temuan bug, solusi teknis, dan rancangan kode lengkap untuk menyelesaikan isu saldo awal dan penarikan tunai pada Buku Kas Pembantu (BKP) Tunai.

---

## 1. Ringkasan Masalah

Pada modul **Buku Kas Pembantu (BKP) Tunai** (di menu Penatausahaan Rekapan BKU tab *BKP Pembantu*) untuk bulan **Februari 2026**:
- **Gejala yang dialami**:
  1. Pada baris tanggal 01 Februari 2026, *Saldo Kas Tunai* terdeteksi **Rp 14.500.000**.
  2. Pada baris transaksi tanggal 25 Februari 2026, muncul transaksi *Tarik Tunai* sebesar **Rp 14.500.000**.
  3. Akibatnya, saldo kas tunai melonjak menjadi **Rp 29.000.000**.
- **Kondisi yang seharusnya**:
  - Saldo Kas Tunai pada tanggal 01 Februari 2026 seharusnya **Rp 0**, karena pada awal bulan belum ada uang tunai yang ditarik (kas tunai Januari bersisa 0).
  - Kas tunai baru bertambah menjadi **Rp 14.500.000** ketika transaksi *Tarik Tunai* terjadi pada tanggal 25 Februari 2026.

---

## 2. Analisis Akar Masalah (Root Cause Analysis)

Setelah penelusuran menyeluruh pada seluruh komponen terkait:
1. `resources/js/Pages/Penatausahaan/Rekapitulasi.tsx`
2. `app/Http/Controllers/BukuKasPembantuTunaiController.php`
3. `app/Services/BukuKasService.php`
4. `resources/views/laporan/bkp_pembantu_tunai_pdf.blade.php`
5. `resources/views/laporan/bkp_pembantu_tunai_excel.blade.php`

### A. Sumber Masalah Utama: Komponen React `Rekapitulasi.tsx`

Pada file [Rekapitulasi.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/Penatausahaan/Rekapitulasi.tsx#L2571-L2605):

```tsx
// Baris 2554-2586:
{/* Saldo Kas Tunai Row (Merged with Penarikan Tunai) */}
<tr>
    <td className="border border-gray-600 p-2 text-center">
        01-{monthMap[bulanPembantu.toLowerCase()] || '01'}-{tahun}
    </td>
    <td className="border border-gray-600 p-2"></td>
    <td className="border border-gray-600 p-2"></td>
    <td className="border border-gray-600 p-2 font-medium">
        Saldo Kas Tunai
    </td>
    <td className="border border-gray-600 p-2 text-right">
        {(() => {
            const saldoAwal = Number(bkpPembantuData?.data?.saldoAwalTunai || 0);
            const totalPenarikan = Number(bkpPembantuData?.data?.totalPenarikan || 0);
            return formatCurrency(saldoAwal + totalPenarikan); // <-- BUG 1: Menambahkan totalPenarikan ke Saldo Awal!
        })()}
    </td>
    <td className="border border-gray-600 p-2 text-right">-</td>
    <td className="border border-gray-600 p-2 text-right font-bold">
        {(() => {
            const saldoAwal = Number(bkpPembantuData?.data?.saldoAwalTunai || 0);
            const totalPenarikan = Number(bkpPembantuData?.data?.totalPenarikan || 0);
            return formatCurrency(saldoAwal + totalPenarikan); // <-- BUG 1: Menambahkan totalPenarikan ke Saldo Awal!
        })()}
    </td>
</tr>
...
// Baris 2596-2605:
const saldoAwal = Number(bkpPembantuData?.data?.saldoAwalTunai || 0);
const allItems = bkpPembantuData?.items || [];
const totalPenarikan = Number(bkpPembantuData?.data?.totalPenarikan || 0);

// Items already excluded penarikan in controller  <-- ASUMSI YANG SALAH!
const items = allItems;

let runningBalance = saldoAwal + totalPenarikan; // <-- BUG 2: Running balance dimulai dari saldoAwal + totalPenarikan!
```

### B. Mekanisme Terjadinya Error:
1. **Asumsi yang salah pada komentar kode**: Di baris 2602 tertulis `// Items already excluded penarikan in controller`. Pengembang sebelumnya berasumsi penarikan tunai dikeluarkan dari array transaksi bulanan dan digabung ke baris saldo awal tanggal 1.
2. **Kenyataan di Backend**: Di [BukuKasPembantuTunaiController.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/BukuKasPembantuTunaiController.php#L359-L370), transaksi penarikan tunai **tetap dimasukkan ke array `items`** sebagai transaksi sah dengan tanggal aktual (25-02-2026) dan penerimaan Rp 14.500.000.
3. **Terjadi Penghitungan Ganda (Double Counting)**:
   - Pada baris tanggal 01-02-2026, UI menampilkan `0 + 14.500.000 = 14.500.000` dan mengeset `runningBalance = 14.500.000`.
   - Pada tanggal 25-02-2026, baris transaksi "Tarik Tunai" merender penerimaan Rp 14.500.000, sehingga `runningBalance` bertambah lagi `14.500.000 + 14.500.000 = 29.000.000`!
   - Padahal di baris footer *Jumlah Penutupan*, nilai total penerimaan dari backend adalah Rp 14.500.000 dan saldo penutupan Rp 14.500.000 (sehingga baris tabel dan baris footer tidak klop).

### C. Pembanding: Kondisi PDF dan Excel
Di file cetak PDF ([bkp_pembantu_tunai_pdf.blade.php:L134-138](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/views/laporan/bkp_pembantu_tunai_pdf.blade.php#L134-L138)) dan Excel ([bkp_pembantu_tunai_excel.blade.php:L108-112](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/views/laporan/bkp_pembantu_tunai_excel.blade.php#L108-L112)):
```blade
@php
    $totalPenarikan = $report['data']['totalPenarikan'] ?? 0;
    $saldoAwal = $report['data']['saldoAwalTunai'];
    $saldoWithPenarikan = $saldoAwal; // <-- Di PDF dan Excel sudah benar, HANYA menggunakan $saldoAwal!
    $filteredItems = $report['items'];
@endphp
```
Di PDF dan Excel, perbaikan sebelumnya sudah dilakukan dengan menyamakan `$saldoWithPenarikan = $saldoAwal`. Hanya di tampilan web React (`Rekapitulasi.tsx`) kode `saldoAwal + totalPenarikan` tertinggal dan belum diselaraskan!

---

## 3. Temuan Bug Tambahan (Related Findings)

Selain bug di `Rekapitulasi.tsx`, ditemukan dua hal minor yang berpotensi menjadi bug di masa depan:

1. **Double addition di footer partial Blade**:
   Pada `resources/views/laporan/partials/bkp-pembantu-table.blade.php` baris 57 (serta varian `kinerja` dan `kinerja_silpa`):
   ```blade
   <td style="border: 1px solid #000; padding: 5px; text-align: right;">
       {{ number_format($data['totalPenerimaan'] + $data['saldoAwalTunai'], 0, ',', '.') }}
   </td>
   ```
   Karena `$data['totalPenerimaan']` dari controller sudah menghitung `$saldoAwalTunai + $penarikanTunai`, penambahan `$data['saldoAwalTunai']` lagi di baris ini akan menyebabkan saldo awal terhitung dua kali di footer partial jika saldo awal > 0.
   Harusnya: `{{ number_format($data['totalPenerimaan'], 0, ',', '.') }}` (sama seperti yang ada di `bkp_pembantu_tunai_pdf.blade.php` baris 173).

2. **Duplikasi key di array controller**:
   Pada [BukuKasPembantuTunaiController.php:L480-481](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Http/Controllers/BukuKasPembantuTunaiController.php#L480-L481):
   ```php
   'totalPengeluaran' => $totalPengeluaran,
   'totalPengeluaran' => $totalPengeluaran, // duplikat baris
   ```

---

## 4. Rencana Solusi dan Perubahan Kode

### A. Perubahan Utama: `resources/js/Pages/Penatausahaan/Rekapitulasi.tsx`
Menghilangkan penambahan `+ totalPenarikan` pada baris tanggal 01 dan pada inisialisasi `runningBalance`.

#### Kode Saat Ini:
```tsx
// Baris 2571-2586:
<td className="border border-gray-600 p-2 text-right">
    {(() => {
        const saldoAwal = Number(bkpPembantuData?.data?.saldoAwalTunai || 0);
        const totalPenarikan = Number(bkpPembantuData?.data?.totalPenarikan || 0);
        return formatCurrency(saldoAwal + totalPenarikan);
    })()}
</td>
<td className="border border-gray-600 p-2 text-right">-</td>
<td className="border border-gray-600 p-2 text-right font-bold">
    {(() => {
        const saldoAwal = Number(bkpPembantuData?.data?.saldoAwalTunai || 0);
        const totalPenarikan = Number(bkpPembantuData?.data?.totalPenarikan || 0);
        return formatCurrency(saldoAwal + totalPenarikan);
    })()}
</td>

// Baris 2596-2605:
const saldoAwal = Number(bkpPembantuData?.data?.saldoAwalTunai || 0);
const allItems = bkpPembantuData?.items || [];
const totalPenarikan = Number(bkpPembantuData?.data?.totalPenarikan || 0);
const items = allItems;
let runningBalance = saldoAwal + totalPenarikan;
```

#### Usulan Perubahan:
```tsx
// Baris 2571-2586:
<td className="border border-gray-600 p-2 text-right">
    {(() => {
        const saldoAwal = Number(bkpPembantuData?.data?.saldoAwalTunai || 0);
        return formatCurrency(saldoAwal);
    })()}
</td>
<td className="border border-gray-600 p-2 text-right">-</td>
<td className="border border-gray-600 p-2 text-right font-bold">
    {(() => {
        const saldoAwal = Number(bkpPembantuData?.data?.saldoAwalTunai || 0);
        return formatCurrency(saldoAwal);
    })()}
</td>

// Baris 2596-2605:
const saldoAwal = Number(bkpPembantuData?.data?.saldoAwalTunai || 0);
const items = bkpPembantuData?.items || [];
let runningBalance = saldoAwal;
```

### B. Perbaikan Minor: Partial Blade Table
Pada:
- `resources/views/laporan/partials/bkp-pembantu-table.blade.php` (baris 57)
- `resources/views/laporan/partials/kinerja-bkp-pembantu-table.blade.php` (baris 57)
- `resources/views/laporan/partials/kinerja_silpa_bkp-pembantu-table.blade.php` (baris 57)

Mengubah:
```blade
{{ number_format($data['totalPenerimaan'] + $data['saldoAwalTunai'], 0, ',', '.') }}
```
Menjadi:
```blade
{{ number_format($data['totalPenerimaan'], 0, ',', '.') }}
```

### C. Perbaikan Minor: Controller Clean-up
Pada `app/Http/Controllers/BukuKasPembantuTunaiController.php` (baris 480-481), menghapus 1 baris duplikat `'totalPengeluaran' => $totalPengeluaran,`.

---

## 5. Simulasi Perhitungan Pasca Perbaikan (Kasus Februari 2026)

| Tanggal | Kode Rekening | No. Bukti | Uraian | Penerimaan (Kredit) | Pengeluaran (Debet) | Saldo |
| :--- | :---: | :---: | :--- | :---: | :---: | :---: |
| **01-02-2026** | - | - | **Saldo Kas Tunai** | **0** | - | **0** |
| **25-02-2026** | - | - | **Tarik Tunai** | **14.500.000** | - | **14.500.000** |
| *(opsional belanja)* | *5.1.xx* | *001* | *Belanja ATK (misal)* | - | *500.000* | *14.000.000* |
| **Jumlah Penutupan** | | | | **14.500.000** | **500.000** | **14.000.000** |

**Hasil**:
1. Saldo Kas Tunai awal per 1 Februari adalah Rp 0 (sesuai kenyataan brankas kas fisik sebelum penarikan).
2. Saldo bertambah menjadi Rp 14.500.000 setelah penarikan pada 25 Februari 2026.
3. Tidak terjadi double counting (saldo 29.000.000 hilang).
4. Running balance baris terakhir sinkron 100% dengan total penutupan footer.
5. Tampilan Web Rekapan BKU, Cetak PDF, dan Export Excel konsisten secara harmonis.

---

## 6. Rencana Verifikasi Pengujian

1. **Verifikasi Web UI**:
   - Buka tab `BKP Pembantu`, pilih tahun `2026` dan bulan `Februari`.
   - Pastikan baris tanggal `01-02-2026` menampilkan Penerimaan: `0`, Pengeluaran: `-`, Saldo: `0`.
   - Pastikan baris transaksi `25-02-2026` "Tarik Tunai" menampilkan Penerimaan: `14.500.000`, Saldo: `14.500.000`.
   - Pastikan footer "Jumlah Penutupan" menunjukkan Penerimaan: `14.500.000`.
2. **Verifikasi Bulan Lain (misal Maret jika ada sisa Februari)**:
   - Pastikan jika ada sisa saldo tunai di akhir Februari (misal Rp 1.000.000), maka pada 01 Maret muncul Saldo Kas Tunai: Rp 1.000.000.
3. **Verifikasi Ekspor**:
   - Unduh PDF dan Excel untuk bulan Februari, pastikan angka sama persis dengan yang ditampilkan di antarmuka web.
4. **Verifikasi Regression Test**:
   - Jalankan `composer test` atau PHPUnit test suite untuk memastikan tidak ada fungsionalitas lain yang terganggu.
