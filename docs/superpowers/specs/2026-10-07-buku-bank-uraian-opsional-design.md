# Perbaikan Uraian pada Buku Bank

## Latar Belakang
Pada tabel Buku Bank di halaman `Rekapitulasi.tsx`, saat ini kolom uraian hanya menampilkan field `uraian` dari data. Kebutuhan barunya adalah memprioritaskan penampilan `uraian_opsional` jika tersedia. Jika tidak ada (null, undefined, atau string kosong), maka akan fallback menggunakan field `uraian`.

## Ruang Lingkup
Perubahan ini hanya dibatasi pada bagian **Buku Bank** di file `c:\laragon\www\newSIKAS2\newSIKAS\resources\js\Pages\Penatausahaan\Rekapitulasi.tsx` (sekitar baris 724). Tabel laporan lain seperti Buku Kas Umum tidak akan diubah sesuai kesepakatan.

## Desain / Pendekatan
Berdasarkan diskusi dengan pengguna, pendekatan yang dipilih adalah **Pendekatan 2**, yaitu menggunakan **Ternary Operator** agar logika kondisi terlihat lebih eksplisit dan mudah dibaca.

```tsx
<td className="border border-gray-600 p-2">
    {item.uraian_opsional ? item.uraian_opsional : item.uraian}
</td>
```

## Kriteria Keberhasilan (Success Criteria)
1. Tampilan kolom uraian di Buku Bank berubah prioritas menjadi `uraian_opsional`.
2. Jika `uraian_opsional` kosong (null/undefined/""), tampilan kembali menggunakan field `uraian`.
3. Fungsi dan tabel lain pada aplikasi tidak terpengaruh (regression-free).
