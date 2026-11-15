# Desain Perbaikan Select "Pilih Master Template" pada Modal Buat Surat

Tanggal: 2026-11-14  
Ruang lingkup: `resources/js/Pages/SkSurat/Partials/GenerateDokumenModal.tsx`

## Latar Belakang & Akar Masalah

Pada modal `Buat Surat Baru dari Template Word`, field **Pilih Master Template** sebelumnya menggunakan elemen `<select>` HTML bawaan browser di dalam grid 2 kolom bersama `Perihal / Judul Surat`:

1. **Popup native OS tidak serasi**: dropdown menampilkan kotak bersudut siku dengan highlight biru bawaan sistem operasi dan melebar melebihi kolomnya.
2. **Teks terpotong kaku**: gabungan `${t.judul} (${t.file_name_original})` di dalam kolom setengah lebar menyebabkan nama file terpotong mendadak (`...PENCAIRAN.doc`) tepat di tepi ikon panah.
3. **Risiko klip container scroll**: seluruh form berada di dalam container `overflow-y-auto` di dalam `<form className="... overflow-hidden">`, sehingga dropdown kustom di dalamnya berisiko terpotong saat daftar variabel kosong atau area form digulir.

## Keputusan Desain

1. **Komponen `react-select` (`unstyled`) Bergaya Neo-Bento**
   - Mengganti `<select>` dengan `<Select<TemplateOption, false>>` (konsisten dengan `ArkasYearSelect` dan `ModalFormBast`) memakai `unstyled` + `classNames` Tailwind.
   - Bentuk kontrol (`rounded-xl`, `min-h-[41px]`, focus ring `lime-400`) diselaraskan dengan `TextInput` `Perihal / Judul Surat` di sebelahnya.
   - Search input meng-override `@tailwindcss/forms` (`[&_input]:!border-0 [&_input]:!outline-none [&_input]:!ring-0 [&_input]:!shadow-none`) agar tidak muncul double-border saat mengetik.
2. **Hierarki Tampilan Terpilih vs Menu Dropdown**
   - **`context === 'value'` (saat terpilih/tertutup)**: menampilkan hanya `judul` template dengan `truncate` di dalam `min-w-0` container agar rapi dan memiliki jarak aman dari chevron kanan.
   - **`context === 'menu'` (di dalam daftar dropdown)**: menampilkan 2 baris terstruktur per opsi:
     - Baris atas: `judul` template (`font-bold`) + badge jumlah tag variabel (`N tag`).
     - Baris bawah: `file_name_original` berukuran kecil & muted (`truncate`).
   - **Pencarian (`filterOption`)**: mencocokkan kata kunci terhadap `judul` maupun `file_name_original` (case-insensitive).
3. **Bebas Klip di Dalam Modal**
   - Glow dekoratif modal dibungkus elemen terpisah (`overflow-hidden rounded-[26px]`) agar `<form>` dapat memakai `overflow-visible`.
   - Area atas (`Error Banner` + `Pilih Master Template` + `Perihal / Judul Surat`) ditempatkan di luar area scroll `Formulir Isian Surat` (`shrink-0 relative z-20`), sehingga popup dropdown selalu tampil utuh di atas form tanpa terpotong oleh `overflow-y-auto` maupun memicu konflik focus-trap Headless UI `Dialog`.

## Verifikasi

- `npm run build` (`tsc && vite build`) berhasil tanpa error TypeScript maupun Vite.
- `php artisan test --filter=SkSurat` tetap lulus seluruhnya.
