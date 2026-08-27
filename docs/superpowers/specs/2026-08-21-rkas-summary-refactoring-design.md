# Spesifikasi Desain: Refactor RKAS Summary menjadi Partials

## 1. Ringkasan Tujuan
Memecah file monolith `Summary.tsx` yang sangat besar pada modul **Rkas**, **RkasPerubahan**, dan **SilpaRkas** menjadi komponen-komponen *partial* yang lebih kecil dan fokus (Deep Modules). Hal ini untuk meningkatkan *locality*, kemudahan *maintenance*, dan keterbacaan kode.

## 2. Pendekatan Arsitektur (Partials Per Modul)
Sesuai pilihan Anda, kita akan menggunakan pendekatan **Partials Per Modul**. Artinya, komponen partial tidak akan di-share antar modul. Masing-masing modul akan memiliki foldernya sendiri:
- `resources/js/Pages/Penganggaran/Rkas/Partials/`
- `resources/js/Pages/Penganggaran/RkasPerubahan/Partials/`
- `resources/js/Pages/Penganggaran/SilpaRkas/Partials/`

**Keuntungan:**
- **Isolasi Penuh**: Perubahan pada tampilan "Alur Kas" di RkasPerubahan tidak akan berisiko merusak tampilan "Alur Kas" di Rkas murni.
- **Fleksibilitas Data**: Karena struktur data (seperti adanya nilai "murni" dan "perubahan") bisa berbeda, partials per modul dapat menerima bentuk data yang spesifik tanpa perlu *conditional if* (`if (isPerubahan)`) yang membengkak.

## 3. Komponen yang Akan Diekstrak
Setiap tab akan diekstrak menjadi satu komponen. Contoh untuk modul **Rkas**:
1. `TabRkaTahapan.tsx`
2. `TabRkaTahapanV1.tsx` (Jika ada)
3. `TabRkaRekap.tsx`
4. `TabLembarKerja.tsx`
5. `TabRkaBulanan.tsx`
6. `TabRincian.tsx`
7. `TabGrafik.tsx`
8. `TabAlurKas.tsx`

## 4. Aliran Data & Prop Interface (Data Flow)
`Summary.tsx` akan tetap bertindak sebagai *Smart Component / Container*. Semua *state* utama (`activeTab`, `selectedMonth`, `showPrintModal`, `printTarget`, dll) akan tetap berada di `Summary.tsx`.

Komponen partial akan bertindak sebagai *Dumb/Presentational Component* yang menerima data lewat `props`.
Contoh *interface* untuk salah satu tab:

```tsx
interface TabRkaTahapanProps {
    anggaran: AnggaranType;
    tahapanData: TahapanDataType;
    onPrint: (target: string) => void;
    onExportExcel: (target: string) => void;
}
```

*State* terkait `Print Modal` dan tombol **Pengaturan Cetak** yang saat ini ada di dalam struktur masing-masing tab, akan ditangani dengan mengirimkan fungsi *callback* (seperti `onPrint('tahapan')`) dari `Summary.tsx` ke dalam partial.

## 5. Rencana Pengujian (Testing)
Karena ini adalah *refactoring structural* (tidak mengubah fitur/logic perhitungan), indikator keberhasilannya adalah:
1. Tidak ada tab yang error saat diklik.
2. Fungsi export excel dan modal print (Cetak PDF) masih memunculkan target yang benar dari masing-masing tab.
3. Dropdown pilihan bulan pada `TabRkaBulanan` tetap memicu `router.get` dengan benar.

---
*TBD: Tidak ada bagian yang belum jelas. Scope dibatasi pada refactoring struktural UI per tab.*
