# Desain Perbaikan Deteksi Tag Variabel Template Word & UX Modal SK Surat

**Tanggal:** 2026-11-14  
**Modul:** SK & Surat (`App\Services\SkSuratService`, `App\Http\Controllers\SkSuratController`, `resources/js/Pages/SkSurat/*`)

## 1. Latar Belakang & Akar Masalah

Saat pengguna mengunggah file template Word (`.docx`) melalui **Kelola Master Template** atau mencoba membuat surat dari **Buat Surat dari Word**, tag variabel `${...}` tidak terdeteksi dengan tepat. Dari inspeksi kode dan `storage/logs/laravel.log` ditemukan beberapa akar masalah:

1. **Error runtime `TemplateProcessor` disenyapkan (`SkSuratService::extractVariables`)**: Method menangkap seluruh `\Throwable` dan langsung mengembalikan `[]`. Ketika `phpoffice/phpword` sebelumnya belum terinstal (`Error: Class "PhpOffice\PhpWord\TemplateProcessor" not found`), sistem tetap menyimpan `SkTemplate` dengan `detected_variables = []` dan mengirim flash `success`.
2. **Kerapuhan parsing XML Word**: `TemplateProcessor::getVariables()` tidak selalu menangkap tag `${...}` jika Microsoft Word memecah teks di antara tag XML (`<w:r>`, `<w:proofErr>`, `<w:bookmarkStart>`), menyisipkan spasi (`${ nomor_surat }`), atau menempatkannya di dalam *textbox* (`<w:txbxContent>`), catatan kaki/akhir, maupun header/footer tertentu.
3. **Inkonsistensi disk storage**: `storeTemplate()` dan `uploadArsip()` menyimpan secara eksplisit ke disk `'local'`, sedangkan `SkSuratController` dan `SkSuratService::generateDocx()` memanggil `Storage::path()` / `Storage::exists()` / `Storage::delete()` tanpa menunjuk disk `'local'`.
4. **Celah UX & bug state modal**:
   - Tidak ada tombol **Deteksi Ulang** pada template yang tersimpan dengan variabel kosong.
   - Modal `GenerateDokumenModal` tidak memiliki shortcut untuk membuka upload/kelola template secara langsung, mencampur `dataIsian` template lama saat mengganti template, dan mereset input ketikan user saat `templates` prop diperbarui.
   - `ManageTemplatesModal` tidak menampilkan umpan balik peringatan ketika `.docx` valid memiliki `0` tag, serta input file tidak dibersihkan setelah sukses atau saat modal dibuka ulang.
   - Alias umum pada surat sekolah (seperti `${kepala_sekolah}`, `${nip_kepsek}`, `${bendahara}`, `${tahun}`) belum dipetakan di `getSchoolAutoFillData()`.
   - Blok route `sk-surat` di `routes/web.php` terduplikasi dua kali.

## 2. Arsitektur Solusi

### 2.1 Backend — `SkSuratService`
1. **Validasi & Ekstraksi `.docx` Tahan XML (`extractVariables`)**:
   - Pastikan file ada dan dapat dibuka dengan `ZipArchive` serta mengandung `word/document.xml` (atau main document part yang valid). Jika tidak valid/korup, lempar `\RuntimeException` berbahasa Indonesia agar error tampil jelas ke pengguna.
   - Jalankan `TemplateProcessor::getVariables()` untuk baseline standar, lalu gabungkan dengan pemindaian XML langsung pada seluruh part XML teks Word (`word/document*.xml`, `word/header*.xml`, `word/footer*.xml`, `word/footnotes.xml`, `word/endnotes.xml`).
   - Pada setiap part XML, muat dengan `DOMDocument` (dengan `LIBXML_NONET`) dan iterasi elemen paragraf `<w:p>` (termasuk paragraf bersarang di dalam `<w:txbxContent>` / tabel), gabungkan teks dari elemen `<w:t>` dan `<w:instrText>` dalam urutan dokumen untuk merekonstruksi tag `${...}` meskipun terpotong `<w:rPr>`, `<w:proofErr>`, atau bookmark Word.
   - Ekstrak semua kecocokan `/\$\{([^{}]+)\}/u`, rapikan spasi tepi (`trim`), buang entri kosong, dan kembalikan array unik terurut.
2. **Sinkronisasi Pengisian Nilai (`generateDocx`)**:
   - Gunakan `Storage::disk('local')->path($template->file_path)` secara eksplisit.
   - Saat memanggil `TemplateProcessor::setValue()`, lakukan pula normalisasi XML untuk tag yang terpecah/berspasi pada main document, header, footer, dan textbox sehingga tag yang terdeteksi oleh ekstraktor dipastikan ikut terganti di hasil `.docx`.
3. **Alias Auto-Fill (`getSchoolAutoFillData`)**:
   - Tambahkan alias umum: `kepala_sekolah`, `nip_kepsek`, `bendahara`, `tahun` di samping key standar yang sudah ada.

### 2.2 Backend — `SkSuratController` & `routes/web.php`
- Gunakan `Storage::disk('local')` secara konsisten di `destroyFolder`, `destroyTemplate`, `destroyDokumen`, `downloadArchive`, dan `storeTemplate`.
- Pada `storeTemplate()`:
  - Bungkus `extractVariables($fullPath)` dalam `try/catch (\RuntimeException | \Throwable)`. Jika gagal membaca `.docx`, hapus file yang baru diupload dari disk `'local'` dan kembalikan `back()->withErrors(['file' => $e->getMessage()])`.
  - Jika `.docx` valid namun `count($variables) === 0`, tetap simpan `SkTemplate` dengan `detected_variables = []` dan beri pesan flash yang informatif.
- Tambah method `rescanTemplate($id)`:
  - Tolak `isKepalaSekolah()` (`403`).
  - Baca file dari `Storage::disk('local')->path($template->file_path)`, jalankan `extractVariables()`, update `detected_variables`, lalu kembalikan `back()` dengan pesan hasil deteksi (atau `withErrors` jika file tidak ditemukan/rusak).
- Hapus duplikasi grup route `sk-surat` di `routes/web.php` dan daftarkan `POST /sk-surat/template/{template}/rescan` (`sk-surat.template.rescan`).

### 2.3 Frontend — Modal & Halaman `SkSurat`
1. **`ManageTemplatesModal.tsx`**:
   - Reset `judul`, `file`, `errorMsg`, `statusNotice`, dan DOM `<input type="file">` (`fileInputRef`) saat modal dibuka (`show`) atau setelah upload berhasil.
   - Tampilkan pesan sukses/peringatan dari proses upload dan deteksi ulang langsung di dalam modal (termasuk peringatan kuning informatif bila `0` tag ditemukan, dengan contoh format `${nomor_surat}`).
   - Tambah tombol **"Deteksi Ulang"** per kartu template (non-Kepala Sekolah) yang memanggil `router.post(route('sk-surat.template.rescan', tpl.id))`.
2. **`GenerateDokumenModal.tsx`**:
   - Tambah prop opsional `onOpenManageTemplates?: () => void` dan `isKepalaSekolah?: boolean`.
   - Sediakan tombol shortcut **"Upload / Kelola Template"** di sebelah pemilih Master Template (serta di blok peringatan ketika `detected_variables` kosong) dan tombol **"Deteksi Ulang Tag"** langsung untuk `activeTemplate`.
   - Perbaiki `handleTemplateChange`: bentuk ulang `dataIsian` hanya berisi variabel milik template yang baru dipilih (pertahankan input yang kebetulan memiliki key sama + isi default `schoolData`), tidak mewarisi key sampah dari template sebelumnya.
   - Pisahkan inisialisasi modal saat `show`/`dokumen` berubah dari sinkronisasi variabel template baru agar mengetik `perihal`/`keterangan`/`dataIsian` tidak terhapus saat `templates` diperbarui.
   - Normalisasi tag saat mencocokkan `schoolData` (`${...}` dibuang, huruf kecil, spasi/tanda hubung menjadi underscore).
3. **`Show.tsx` & `UploadArsipModal.tsx`**:
   - Di `Show.tsx`, kirim `onOpenManageTemplates` dan `isKepalaSekolah` ke `GenerateDokumenModal` sehingga klik shortcut menutup `GenerateDokumenModal` dan membuka `ManageTemplatesModal`.
   - Di `UploadArsipModal.tsx`, reset form state dan DOM file input via `useRef` saat modal dibuka/sukses.

## 3. Rencana Pengujian
- Tambah test di `tests/Feature/SkSuratTest.php`:
  1. Upload `.docx` nyata berisi tag `${...}` normal, tag terpecah XML run + `<w:proofErr>`, tag dalam *textbox* `<w:txbxContent>`, header, dan spasi `${ nama_tag }` → seluruh tag tersimpan di `detected_variables`.
  2. Upload file non-`.docx` valid (file korup ber-ekstensi `.docx`) → ditolak dengan error sesi dan tidak tersimpan ke `sk_templates`.
  3. `POST /sk-surat/template/{id}/rescan` memperbarui `detected_variables`, dan ditolak `403` untuk Kepala Sekolah.
- Jalankan `composer test` dan `npm run build`.
