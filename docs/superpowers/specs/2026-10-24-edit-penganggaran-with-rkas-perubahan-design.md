# Design Spec: Edit Penganggaran Saat Sudah Ada RKAS Perubahan

**Tanggal:** 24 Oktober 2026  
**Status:** Approved  
**Topik:** Penganggaran, RKAS Perubahan, UI/UX, Multi-Varian  

---

## 1. Latar Belakang & Masalah
Pada halaman daftar penganggaran (`resources/js/Pages/Penganggaran/Index.tsx`), tombol edit data penganggaran (pagu, pejabat penandatangan, dsb.) saat ini dibatasi oleh kondisi:
```tsx
{item.status === 'regular' && !item.has_perubahan && (
    <button onClick={() => handleEdit(item.id)} ...>
)}
```
Kondisi `!item.has_perubahan` menyebabkan tombol edit hilang ketika anggaran tersebut sudah memiliki RKAS Perubahan. Padahal dalam operasional sekolah, sering terjadi kebutuhan pembaruan data seperti:
- Perubahan/pergantian Kepala Sekolah atau Bendahara (beserta SK & NIP).
- Pembaruan nama Ketua Komite.
- Penyesuaian pagu anggaran.

Dengan dihilangkannya tombol edit, pengguna tidak dapat mengubah data administratif tersebut setelah RKAS Perubahan dibuat.

---

## 2. Tujuan & Ruang Lingkup
1. **Menampilkan Tombol Edit:** Memastikan tombol edit tetap tampil pada kartu RKAS Reguler meskipun sudah terdapat RKAS Perubahan.
2. **Penguncian Field Kritis (Tahun Anggaran & Pagu Anggaran):** Mengunci field `tahun_anggaran` dan `pagu_anggaran` (read-only/disabled) saat mengedit anggaran yang sudah memiliki RKAS Perubahan guna menjaga integritas relasi data RKAS, belanja, dan transaksi BKU.
3. **Pesan Informatif UX:** Menampilkan pesan informatif di bawah input `tahun_anggaran` dan `pagu_anggaran` yang terkunci agar pengguna memahami alasan field tersebut tidak dapat diubah.
4. **Proteksi Backend:** Menjaga agar pembaruan data pada controller backend (`PenganggaranController@update`) tidak mengubah `tahun_anggaran` maupun `pagu_anggaran` jika anggaran terkait sudah memiliki RKAS Perubahan, sekaligus tetap mengizinkan perubahan field data pejabat penandatangan (Kepala Sekolah, Bendahara, SK, komite).
5. **Dukungan Multi-Varian:** Berlaku untuk semua varian anggaran (`reguler`, `kinerja`, `silpa`, `kinerja_silpa`).

---

## 3. Rancangan Teknis

### 3.1 Frontend (`resources/js/Pages/Penganggaran/Index.tsx`)

#### A. Tampilan Tombol Edit
Mengubah kondisi render tombol edit pada kartu anggaran reguler:
- **Sebelum:**
  ```tsx
  {item.status === 'regular' && !item.has_perubahan && (
      <button onClick={() => handleEdit(item.id)} ...>
  ```
- **Sesudah:**
  ```tsx
  {item.status === 'regular' && (
      <button onClick={() => handleEdit(item.id)} ...>
  ```

#### B. State Tracking untuk Penguncian Field
Menambahkan state untuk mengetahui apakah penganggaran yang sedang diedit memiliki RKAS Perubahan:
```tsx
const [isYearLocked, setIsYearLocked] = useState(false);
```
Saat `handleEdit(id: number)` dipanggil:
- Cari item di `items`:
  ```tsx
  const regularItem = items.find(i => i.id === id && i.status === 'regular');
  setIsYearLocked(Boolean(regularItem?.has_perubahan));
  ```
Saat `handleCreate()` atau modal ditutup/reset:
- Reset `setIsYearLocked(false)`.

#### C. Input Form Tahun Anggaran di Modal
Memperbarui input `tahun_anggaran`:
- Jika `editMode && isYearLocked` bernilai `true`:
  - Input diberi properti `disabled`.
  - Class visual: `disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed dark:disabled:bg-gray-700/50 dark:disabled:text-gray-400`.
  - Menampilkan teks bantuan di bawah input:
    ```tsx
    {editMode && isYearLocked && (
        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
            Tahun anggaran tidak dapat diubah karena sudah memiliki RKAS Perubahan.
        </p>
    )}
    ```

---

### 3.2 Backend (`app/Http/Controllers/PenganggaranController.php`)

Pada method `update(Request $request, $id)`:
1. Validasi input tetap mempertahankan aturan yang ada.
2. Cek apakah record penganggaran memiliki RKAS Perubahan:
   ```php
   $hasPerubahan = $this->RkasPerubahan 
       ? ($this->RkasPerubahan)::where(VariantConfig::penganggaranFk($this->variant), $penganggaran->id)->exists() 
       : false;
   ```
3. Jika `$hasPerubahan === true`, gunakan `tahun_anggaran` asli dari database:
   ```php
   $tahunAnggaran = $hasPerubahan ? $penganggaran->tahun_anggaran : $request->tahun_anggaran;
   ```
4. Simpan pembaruan data:
   ```php
   $penganggaran->update([
       'pagu_anggaran' => $pagu,
       'tahun_anggaran' => $tahunAnggaran,
       'kepala_sekolah' => $request->kepala_sekolah,
       'sk_kepala_sekolah' => $request->sk_kepala_sekolah,
       'nip_kepala_sekolah' => $request->nip_kepala_sekolah,
       'bendahara' => $request->bendahara,
       'sk_bendahara' => $request->sk_bendahara,
       'nip_bendahara' => $request->nip_bendahara,
       'komite' => $request->komite,
       'tanggal_sk_kepala_sekolah' => $request->tanggal_sk_kepala_sekolah,
       'tanggal_sk_bendahara' => $request->tanggal_sk_bendahara,
   ]);
   ```

---

## 4. Kriteria Pengujian (Testing & Verification)
1. **Tampilan Tombol:**
   - Pada baris RKAS yang **sudah** memiliki RKAS Perubahan, tombol Edit (ikon pensil) tetap terlihat dan dapat diklik.
   - Pada baris RKAS yang **belum** memiliki RKAS Perubahan, tombol Edit tetap terlihat dan berfungsi normal.
2. **Modal Form Edit:**
   - Ketika membuka modal edit untuk anggaran yang memiliki RKAS Perubahan:
     - Field `Tahun Anggaran` dalam kondisi disabled/read-only.
     - Terdapat pesan bantuan: *"Tahun anggaran tidak dapat diubah karena sudah memiliki RKAS Perubahan."*
     - Field `Pagu Anggaran`, `Kepala Sekolah`, `Bendahara`, `Komite`, nomor SK, tanggal SK, dan NIP tetap dapat diubah.
   - Ketika membuka modal edit untuk anggaran yang belum memiliki RKAS Perubahan:
     - Field `Tahun Anggaran` dapat diedit normal.
     - Pesan bantuan tidak ditampilkan.
3. **Penyimpanan Data:**
   - Menyimpan form berhasil dan data pejabat serta pagu terupdate di database.
   - Integritas data RKAS Perubahan tetap utuh dan tidak terganggu.
4. **Varian Anggaran:**
   - BOSP Reguler, SiLPA Reguler, BOSP Kinerja, dan SiLPA Kinerja berfungsi konsisten.
