# Implementation Plan: Tampilkan Seluruh Baris RKAS, Sembunyikan ID Kegiatan, dan Eliminasi Variabel Teknis

**Tanggal:** 19 Oktober 2026  
**Dokumen Desain Terkait:** [2026-10-19-copilot-hide-id-show-all-rows-design.md](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-10-19-copilot-hide-id-show-all-rows-design.md)  
**Status:** Siap Dieksekusi  

---

## 1. Rencana Eksekusi

### Langkah 1: Backend - Tampilkan Seluruh Baris di `searchRkasActivity`
- Di `CopilotService.php`:
  - Hapus batasan pemotongan `->take(15)` dan ubah menjadi `->take(200)` (atau tanpa limit saat filter bulan aktif) sehingga seluruh kegiatan bulan bersangkutan (seperti 54 baris bulan Maret) terambil lengkap.
  - Hapus kunci teknis `'found_count' => count($results)` pada return array.
  - Ganti dengan informasi naratif bersahabat:
    `'total_kegiatan' => count($results)`
    `'keterangan' => "Menampilkan seluruh " . count($results) . " kegiatan pada alokasi bulan {$targetMonth}"`

### Langkah 2: Backend - Penegasan Larangan ID Kegiatan & Variabel pada System Prompt
- Di `$systemPrompt` `CopilotService.php`:
  - Perbarui pedoman tabel RKAS:
    ```
    c. Format kolom tabel RKAS WAJIB:
       <tr><th>No</th><th>Bulan</th><th>Uraian Kegiatan / Barang</th><th>Rekening Belanja</th><th>Total Anggaran</th><th>Realisasi Belanja</th><th>Sisa Anggaran</th></tr>
    d. DILARANG KERAS membuat kolom "ID Kegiatan" atau menampilkan ID angka database apapun kepada bendahara.
    e. JANGAN PERNAH menyebutkan nama variabel sistem seperti "found_count", "filter_bulan", atau "items".
    ```

### Langkah 3: Backend - Penguatan Sanitasi Post-Processing (`sanitizeResponseText`)
- Di `sanitizeResponseText`:
  - Tambahkan penyaringan otomatis untuk membersihkan kemunculan kata `found_count`, `filter_bulan`, `items`:
    ```php
    $text = preg_replace('/\b(found_count|filter_bulan)\b/i', '', $text);
    ```
  - Bersihkan jika ada kolom `<th>ID Kegiatan</th>` atau `<td>ID: \d+</td>` di tabel HTML jika model tidak sengaja menyertakannya.

### Langkah 4: Pengujian & Validasi
- Jalankan scratch test lokal untuk memastikan:
  - Seluruh 54 baris bulan Maret terambil lengkap.
  - Teks respons tidak lagi memuat `found_count` atau kolom `ID Kegiatan`.
- Lakukan `npm run build` dan komit ke git.
