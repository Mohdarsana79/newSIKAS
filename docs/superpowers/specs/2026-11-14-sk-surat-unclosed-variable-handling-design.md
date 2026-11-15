# Desain Penanganan Tag Variabel Word di Dalam Tanda Kurung & Tag Belum Tertutup (`}`)

Tanggal: 2026-11-14  
Ruang lingkup:
- `app/Services/SkSuratService.php`
- `app/Http/Controllers/SkSuratController.php`
- `app/Http/Middleware/HandleInertiaRequests.php`
- `resources/js/Pages/SkSurat/Partials/ManageTemplatesModal.tsx`
- `resources/js/Pages/SkSurat/Partials/GenerateDokumenModal.tsx`
- `tests/Feature/SkSuratTest.php`

## Latar Belakang & Temuan

Dari pemeriksaan XML `word/document.xml` pada master template yang diunggah (`SURAT PENGANTAR DAN PENCAIRAN DANA BOSP.docx`), paragraf isi surat tertulis:

`... Sebesar Rp. ${pagu_tahap} (${terbilang)`

Tag `terbilang` di dalam tanda kurung tidak memiliki kurung kurawal tutup `}` sebelum `)`. Format yang benar `(${terbilang})` (termasuk yang terpecah antar `<w:r>` atau disisipi `<w:proofErr/>`) sudah dapat diekstrak dan diganti oleh `SkSuratService` + `TemplateProcessor`, sedangkan typo `${terbilang)` terlewat baik saat ekstraksi maupun saat generate DOCX/PDF.

## Keputusan Desain

1. **Deteksi Diagnostik (`SkSuratService::extractVariableReport`)**
   - Mengembalikan `['variables' => string[], 'unclosed' => string[]]`.
   - `extractVariables()` tetap dipertahankan dengan memanggil `extractVariableReport()['variables']`.
   - Pemindaian per paragraf (`//w:p` pada `word/document*.xml`, `header*.xml`, `footer*.xml`, `footnotes.xml`, `endnotes.xml`) menggunakan pola gabungan agar tidak tumpang tindih:
     - Tag belum tertutup: `/\$\{([A-Za-z0-9_]+)(?!\s*\})(?=[)\],.;:!?"'\s]|$)|\$\{([^{}]+)\}/u`
     - Group 1 (`unclosed`): dicatat ke `variables` sekaligus `unclosed` sehingga tetap muncul di formulir isian dan bisa diberi peringatan.
     - Group 2 (`valid`): dicatat ke `variables` saja.
2. **Normalisasi XML Non-Destruktif Saat Generate (`SkSuratService::generateDocx`)**
   - Sebelum `new TemplateProcessor(...)`, salinan sementara `.docx` dipindai per `<w:p>` dan menyisipkan `}` tepat setelah `${identifier` pada `<w:t>` / `<w:instrText>` terkait (termasuk bila tag terpecah di beberapa `<w:r>`).
   - File master template asli di storage tidak dimodifikasi, formatting Word asli tetap utuh, dan file salinan sementara selalu dihapus pada blok `finally`.
3. **Peringatan di Controller & Modal UI**
   - `HandleInertiaRequests` membagikan `flash.warning` bersama `flash.success` dan `flash.error`.
   - `SkSuratController::storeTemplate()` dan `rescanTemplate()` mengisi `flash.warning` ketika `unclosed` tidak kosong dengan menyebutkan daftar tag yang lupa `}`.
   - `ManageTemplatesModal` dan `GenerateDokumenModal` menampilkan banner peringatan amber beserta petunjuk perbaikan di Word, sambil tetap mengizinkan pengisian dan pembuatan dokumen.
