# Desain Konversi DOCX ke PDF Wajib LibreOffice Portable (SK & Surat)

**Tanggal:** 2026-11-14  
**Modul:** SK & Surat (`App\Services\SkSuratService`, `App\Http\Controllers\SkSuratController`, `config/services.php`)

## 1. Latar Belakang & Akar Masalah

1. `SkSuratService::convertDocxToPdf()` belum memeriksa LibreOffice portable yang tersedia di dalam project (`storage/app/libreoffice/program/soffice.exe`).
2. Pencarian command di `PATH` menggunakan `file_exists('soffice')` yang selalu `false` untuk nama executable tanpa path.
3. Ketika LibreOffice tidak ditemukan atau gagal, method diam-diam jatuh ke `PhpOffice\PhpWord\Settings::PDF_RENDERER_DOMPDF`, menghasilkan PDF dengan tata letak yang tidak sama dengan file Word yang diunggah.
4. Pada Windows/Laragon, pemanggilan `soffice.exe` tanpa `-env:UserInstallation` memakai `bootstrap.ini` (`$SYSUSERCONFIG/LibreOffice/4`) yang rentan gagal/terkunci oleh izin user service atau instance LibreOffice lain.

## 2. Arsitektur Solusi

### 2.1 Konfigurasi (`config/services.php`)
Tambahkan entri:
```php
'libreoffice' => [
    'path' => env('LIBREOFFICE_PATH'),
],
```

### 2.2 `SkSuratService`
1. **Resolusi Path (`resolveLibreOfficePath(): ?string`)**:
   - Urutan prioritas:
     1. `config('services.libreoffice.path')` (jika diisi & `is_file(...)`)
     2. Portable project di `storage_path('app/libreoffice/program/soffice.com')` lalu `soffice.exe` (Windows) / `soffice` (Unix), sehingga stderr/stdout LibreOffice selalu tertangkap saat terjadi kesalahan.
     3. Alternatif di root project `base_path('libreoffice/program/soffice.com')` / `soffice.exe` / `soffice`
     4. Path instalasi standar Windows & Unix (`C:\Program Files\LibreOffice\program\soffice.com`, `soffice.exe`, `C:\Program Files (x86)\...`, `/usr/bin/soffice`, `/usr/bin/libreoffice`)
     5. Pencarian `PATH` menggunakan `ExecutableFinder` (`Symfony\Component\Process\ExecutableFinder`) untuk `soffice` dan `libreoffice`.
   - Jika tidak ditemukan, lempar `\RuntimeException` yang jelas (tanpa fallback DomPDF).
2. **Eksekusi Konversi (`convertDocxToPdf` + `runLibreOfficeConvert` + `buildLibreOfficeProcessEnv`)**:
   - Hapus seluruh kode dan import `DomPDF` (`IOFactory`, `Settings`) dari `SkSuratService`.
   - Jalankan konversi melalui `Symfony\Component\Process\Process` dengan timeout 60 detik, argumen `--headless --norestore --nofirststartwizard --nodefault -env:UserInstallation=<fileUri> --convert-to pdf <docxPath> --outdir <tempDir>`.
   - Suntikkan variabel environment Windows yang dibutuhkan (`TEMP`, `TMP`, `HOME`, `USERPROFILE`, `APPDATA`, `LOCALAPPDATA` mengarah ke direktori `storage/app/temp` / profil yang writable, serta `WINDIR`, `SystemRoot`, `SystemDrive`, `ProgramData`, `COMSPEC`, `PATH`) ke `Process` agar konversi tetap berhasil saat dijalankan di bawah `php artisan serve` (`ServeCommand::$passthroughVariables` yang memangkas env host) maupun Laragon/Apache.
   - Gunakan *warm profile* persisten `storage_path('app/temp/libreoffice_profile')` agar ekspor cepat (~2.7s). Jika percobaan pertama gagal atau file `.pdf` tidak terbentuk, lakukan satu kali *retry* dengan direktori profil sementara unik (`storage_path('app/temp/lo_profile_' . uniqid())`) yang langsung dibersihkan di blok `finally`.
   - Jika tetap gagal, lempar `\RuntimeException` dengan ringkasan pesan error dari LibreOffice.
3. **Sinkronisasi Font Office CloudFonts (`extractDocxFontFamilies` + `syncDocxFontsToLibreOffice`)**:
   - Isi awal `storage/app/libreoffice/share/fonts/truetype/` dengan font Latin Office modern (`Aptos`, `Aptos Display`, `Aptos Narrow`, `Roboto`, `Open Sans`, `Poppins`, `Nunito`, `Source Sans Pro`, `Raleway`, `Anton`, `Amasis MT Pro`) agar LibreOffice portable mandiri tanpa menyalin font CJK besar (~127 MB+).
   - Sebelum konversi PDF, ekstrak nama keluarga font dari `word/fontTable.xml`, `word/theme/theme*.xml`, `word/styles.xml`, dan `word/document*.xml` pada `.docx`. Jika ada keluarga font yang belum ada di `<libreoffice>/share/fonts/truetype/`, salin otomatis dari cache Office CloudFonts (`AppData\Local\Microsoft\FontCache\4\CloudFonts\<Family>`) atau User Fonts (`AppData\Local\Microsoft\Windows\Fonts`) dengan fallback resolusi direktori user Windows ketika `LOCALAPPDATA` terpotong oleh `php artisan serve`.

### 2.3 `SkSuratController::exportPdf($id)`
- Pindahkan `generateDocx($dokumen)` ke dalam blok `try` dan bersihkan `$tempDocxPath` di blok `finally` sehingga setiap kegagalan generator maupun LibreOffice selalu kembali sebagai `back()->with('error', ...)` untuk ditampilkan oleh `Toast.tsx`.

## 3. Rencana Pengujian
- Tambah test di `tests/Feature/SkSuratTest.php`:
  1. `resolveLibreOfficePath()` memprioritaskan path dari `config('services.libreoffice.path')` dan mendeteksi LibreOffice portable project saat tersedia.
  2. Ketika LibreOffice tidak ditemukan (`resolveLibreOfficePath()` mengembalikan `null`), `convertDocxToPdf()` melempar `\RuntimeException` dan tidak jatuh ke DomPDF.
  3. End-to-end `GET /sk-surat/dokumen/{id}/export-pdf` menggunakan LibreOffice portable menghasilkan response PDF valid (`%PDF-`), selama executable portable tersedia di `storage/app/libreoffice/program/soffice.exe`.
