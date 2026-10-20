# Rencana Implementasi: Rekomendasi Kode Kegiatan & Rekening Belanja Real Master Data pada AI Copilot

- **Tanggal**: 2026-10-20
- **Status**: Siap Dijalankan
- **Dokumen Desain**: `docs/superpowers/specs/2026-10-20-rekomendasi-kode-kegiatan-rekening-belanja-design.md`

---

## Tahapan Pekerjaan

### Langkah 1: Registrasi Tool Baru & Dispatcher di `CopilotService.php`
1. **Daftarkan tool `recommend_activity_and_account` pada `getAvailableTools()`**:
   - Parameter:
     - `query` (string, required): Nama barang/jasa atau jenis belanja yang ingin dikonsultasikan.
     - `estimasi_harga` (number, optional): Perkiraan harga satuan per unit.
     - `kategori_preferensi` (string, enum: ['semua', 'operasi', 'modal'], default 'semua').
2. **Tambahkan mapping di dispatcher `executeTool()`**:
   - Hubungkan `'recommend_activity_and_account'` ke `$this->recommendActivityAndAccount(...)`.

---

### Langkah 2: Implementasi Method Backend `recommendActivityAndAccount()` di `CopilotService.php`
1. **Normalisasi Kata Kunci & Kamus Sinonim Pengadaan Sekolah**:
   - Bangun pemetaan sinonim cerdas untuk belanja umum (kursi/meja -> mebel/perabot, laptop/komputer -> personal komputer/multimedia, buku -> kepustakaan/perpustakaan, ac/kipas -> pendingin/elektronik, cat/kuas/semen -> pemeliharaan gedung/prasarana, konsumsi/makan -> makanan dan minuman rapat, dsb.).
2. **Query Cerdas ke Tabel Master `RekeningBelanja`**:
   - Cari akun dengan kriteria ILIKE pada `rincian_objek` dan `kode_rekening`.
   - Pisahkan menjadi Opsi Modal (`5.2.x`) dan Opsi Operasi (`5.1.x`).
3. **Query Cerdas ke Tabel Master `KodeKegiatan`**:
   - Cari kegiatan SNP yang cocok pada `uraian`, `sub_program`, dan `program`.
   - Klasifikasikan pengadaan aset baru vs pemeliharaan/perawatan.
4. **Cek Riwayat Nyata Penggunaan di RKAS Sekolah**:
   - Cari di tabel `rkas` dan `rkas_perubahans` apakah sekolah pernah menganggarkan uraian serupa, sebutkan pasangan kode kegiatan + rekening belanja dan frekuensinya.
5. **Kemas Output Terstruktur**:
   - Kembalikan data lengkap berisi opsi modal, opsi operasi, opsi pemeliharaan, panduan kapitalisasi, dan riwayat sekolah.

---

### Langkah 3: Tambahkan Aturan Khusus Rekomendasi pada System Prompt (`buildSystemPrompt`)
1. **Instruksi Pemanggilan Tool**:
   - Jika pengguna menanyakan rekomendasi kode kegiatan atau kode rekening untuk belanja barang/jasa (contoh: "saya ingin belanja kursi...", "kode rekening untuk laptop apa?", "cocoknya belanja modal atau operasi?"):
     - AI **WAJIB memanggil `recommend_activity_and_account`**.
     - AI **DILARANG KERAS mengarang kode kegiatan atau rekening sendiri**.
2. **Panduan Format Tampilan Jawaban**:
   - Berikan pembukaan yang ramah dan bersahabat.
   - Sajikan perbandingan jelas antara **Opsi Belanja Modal (Aset Tetap)** vs **Opsi Belanja Operasi (Barang Pakai Habis/Perabot)** dalam tabel HTML terstruktur rapi.
   - Jelaskan kriteria kapan bendahara harus memilih Belanja Modal vs Belanja Operasi (batas kapitalisasi aset daerah dan masa manfaat > 12 bulan).
   - Sertakan catatan riwayat nyata RKAS jika sekolah pernah menggunakannya sebelumnya.

---

### Langkah 4: Pengujian & Validasi
1. **Unit Test Backend**:
   - Uji method `recommendActivityAndAccount("kursi")`:
     - Opsi modal berisi `5.2.02.05.02.0001` (Belanja Modal Mebel) dan kegiatan `05.08.02.`.
     - Opsi operasi berisi `5.1.02.01.01.0030` (Perabot Kantor) dan kegiatan `06.05.10.`.
     - Opsi pemeliharaan berisi `5.1.02.03.02.0118` (Pemeliharaan Mebel) dan kegiatan `05.08.05.`.
   - Uji method `recommendActivityAndAccount("laptop")` dan `recommendActivityAndAccount("cat tembok")`.
2. **Live AI Chat Test**:
   - Uji langsung pertanyaan dari user:
     *"saya ingin belanja kursi kode kegiatan apa dan rekening apa yang cocok ? jadi AI nya akan menjawab dengan real dan apakah cocoknya di belanja modal atau operasi"*
   - Verifikasi respon AI menyajikan rekomendasi real data dari database secara lengkap dan presisi.
3. **Pint Code Formatting & Git Commit**:
   - Jalankan `vendor/bin/pint`.
   - Commit perubahan ke Git.
