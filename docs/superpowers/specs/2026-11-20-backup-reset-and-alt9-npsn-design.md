# Desain Pemindahan Tombol Reset Database & Perubahan Shortcut Alt+9 (Modal NPSN)

**Tanggal:** 2026-11-20  
**Status:** Disetujui untuk peninjauan spec  
**Ruang Lingkup:**
- `resources/js/Pages/Backup/Index.tsx`

---

## 1. Latar Belakang & Tujuan

Pada halaman **Backup & Restore Database** (`resources/js/Pages/Backup/Index.tsx`), tombol **Reset Database** saat ini tersembunyi di dalam modal pintasan rahasia `Ctrl+8` bersamaan dengan form ubah `APP_NPSN_CODE`. Pengguna ingin:

1. Memindahkan tombol **Reset Database** keluar ke kartu **Tindakan Lain**, tepat di atas tombol **Restore Database**.
2. Mengganti shortcut keyboard pembuka modal dari `Ctrl+8` menjadi `Alt+9`.
3. Menyederhanakan isi modal `Alt+9` agar **hanya berisi form untuk mengganti NPSN** (`APP_NPSN_CODE`), sambil tetap mempertahankan syarat bahwa form NPSN terkunci (`disabled`) sampai Reset Database dilakukan pada sesi halaman tersebut.

---

## 2. Keputusan Desain (Hasil Wawancara)

1. **Syarat penguncian form NPSN di modal `Alt+9`:** Input `npsn_code` dan tombol `Simpan NPSN` tetap terkunci (`disabled={!isDatabaseReset}`) sampai pengguna melakukan Reset Database pada sesi halaman yang sama.
2. **Perilaku pasca Reset Database:** Tetap **tanpa reload halaman** agar state `isDatabaseReset` bertahan untuk membuka form NPSN lewat `Alt+9`; menampilkan status tombol `Database Telah Direset` + banner sukses di halaman, sedangkan full reload (`window.location.reload()`) tetap dilakukan setelah `Simpan NPSN` berhasil.

---

## 3. Detail Perubahan pada `resources/js/Pages/Backup/Index.tsx`

### 3.1 Shortcut Keyboard `Alt+9`
- Ubah handler `keydown` pada `useEffect` dari `e.ctrlKey && e.key === '8'` menjadi:
  ```ts
  if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === '9' || e.code === 'Digit9')) {
      e.preventDefault();
      setShowNpsnModal(true);
  }
  ```
- Perbarui komentar state dari `Secret Ctrl+8` menjadi `Secret Alt+9`.

### 3.2 Kartu `Tindakan Lain` — Reset Database di Atas Restore Database
- Perbarui `subtitle` pada `<Surface title="Tindakan Lain">` menjadi `"Reset atau pulihkan database dari berkas cadangan."`.
- Susun isi kartu dengan `space-y-3`:
  1. **Blok Reset Database (paling atas):**
     - `<DangerButton type="button" onClick={confirmReset} disabled={isDatabaseReset} className="w-full justify-center">` dengan ikon peringatan dan label `{isDatabaseReset ? 'Database Telah Direset' : 'Reset Database'}`.
     - Teks keterangan singkat di bawah tombol: `Hapus semua data (kecuali akun pengguna)`.
  2. **Blok Restore Database (di bawah Reset, dipisahkan `border-t border-slate-100 pt-3 dark:border-white/5`):**
     - Input file tersembunyi + `<SecondaryButton type="button" onClick={() => fileInputRef.current?.click()} className="w-full justify-center">` (**Restore Database**) + keterangan `Upload file .rsv (Maks. 2 GB)` tetap utuh seperti sebelumnya.

### 3.3 Banner Sukses Reset Database (Tanpa Reload)
- Pada blok *Flash Messages*, tambahkan alert sukses lokal ketika `isDatabaseReset === true` (dengan gaya `bg-pastel-mint/60 border-mint/20` seragam dengan `flash.success`):
  - Pesan: `Database berhasil direset. Semua data kecuali akun pengguna telah dibersihkan.`

### 3.4 Modal `Alt+9` — Khusus Form Ganti NPSN
- Hapus seluruh bagian blok tombol `Reset Database` dari dalam modal `showNpsnModal`.
- Perbarui judul modal (`id="npsn-modal-title"`, dihubungkan via `ariaLabelledBy="npsn-modal-title"` pada `<Modal>`) menjadi **`Edit APP_NPSN_CODE`**.
- Perbarui subtitle dinamis:
  - Jika `!isDatabaseReset`: `"Anda harus melakukan Reset Database terlebih dahulu sebelum dapat mengubah NPSN."`
  - Jika `isDatabaseReset`: `"Masukkan kode NPSN baru yang terdaftar dalam lisensi aplikasi."`
- Jika `!isDatabaseReset`, tampilkan kotak informasi amber ringkas di atas form yang mengarahkan pengguna untuk menjalankan **Reset Database** pada kartu *Tindakan Lain* terlebih dahulu.
- Pertahankan form `submitNpsn`:
  - Input `npsn_code` dengan `disabled={!isDatabaseReset}` dan `isFocused={isDatabaseReset}`.
  - Tombol `Batal` (`disabled={processingNpsn}`) dan `PrimaryButton` `Simpan NPSN` (`disabled={processingNpsn || !isDatabaseReset}`).
  - Saat `postNpsn(route('backup.update-npsn'))` sukses: tutup modal dan jalankan `window.location.reload()` bila `isDatabaseReset` aktif.

### 3.5 Perbaikan Kualitas & Guard Handler
- `handleResetDatabase`: pindahkan `setProcessingReset(false)` ke blok `finally` agar state tidak tertinggal `true` setelah reset berhasil.
- `closeResetModal`: tambahkan guard `if (processingReset) return;` serta pass `closeable={!processingReset}` dan `ariaLabelledBy="reset-modal-title"` ke `<Modal>`.
- `closeNpsnModal`: tambahkan guard `if (processingNpsn) return;` serta pass `closeable={!processingNpsn}` ke `<Modal>`.
- Modal Konfirmasi Reset: bungkus isi modal dalam `<form onSubmit={(e) => { e.preventDefault(); handleResetDatabase(); }}>` dan gunakan `id="reset_password"` / `htmlFor="reset_password"` agar submit via tombol `Enter` berfungsi normal.

---

## 4. Cakupan & Keamanan

- Tidak mengubah controller PHP (`DatabaseController.php`), validasi backend, maupun route (`backup.validate-password`, `backup.reset`, `backup.update-npsn`, `backup.create`, `backup.restore`, `backup.download`, `backup.delete`).
- Tidak mengubah mekanisme progress restore maupun konfirmasi hapus file backup.

---

## 5. Rencana Verifikasi

1. Jalankan `npm run build` (`tsc && vite build`) dan pastikan lulus dengan exit code `0`.
2. Jalankan peninjauan dua sumbu (`/code-review`: **Standards** & **Spec**) terhadap perubahan pada `resources/js/Pages/Backup/Index.tsx`.
