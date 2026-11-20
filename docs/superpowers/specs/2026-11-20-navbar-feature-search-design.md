# Desain Pencarian Fitur Command Palette pada Navbar (`Ctrl+K` / `⌘K`)

**Tanggal:** 2026-11-20  
**Status:** Disetujui untuk peninjauan spec  
**Ruang Lingkup:**
- Modul katalog baru: `resources/js/Utils/featureSearchCatalog.ts`
- Komponen modal baru: `resources/js/Components/FeatureSearchModal.tsx`
- Integrasi:
  - `resources/js/Components/Navbar.tsx`
  - `resources/js/Components/Sidebar.tsx`

---

## 1. Latar Belakang & Masalah

Pada [Navbar.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Components/Navbar.tsx#L63-L80), tombol pil pencarian (`Cari modul, RKAS, atau BKU…` / `⌘K`) saat ini hanya memanggil `setCopilotState('normal')` untuk membuka jendela AI Copilot. Fitur pencarian navigasi modul aplikasi belum tersedia, pintasan `Ctrl+K` / `⌘K` belum aktif, dan tombol pencarian belum tersedia di layar mobile (`< md`).

Pengguna membutuhkan fitur pencarian nyata di Navbar untuk menemukan dan membuka langsung seluruh fitur aplikasi **newSIKAS**, dengan satu batasan keamanan ketat: **fitur maupun shortcut ganti NPSN (`APP_NPSN_CODE` / `Alt+9`) tidak boleh pernah muncul di pencarian ini**.

---

## 2. Keputusan Desain (Hasil Wawancara)

1. **Bentuk UI:** **Command Palette Modal Neo-Bento** (dibuka melalui klik pil pencarian Navbar, tombol ikon cari mobile, atau pintasan keyboard global `Ctrl+K` / `⌘K`), lengkap dengan pengelompokan kategori, navigasi keyboard (`↑`/`↓`, `Enter`, `Esc`), dan filter RBAC sesuai role.
2. **Cakupan Fitur:** **Lengkap** — mencakup seluruh modul Sidebar + pintasan langsung ke **varian BOSP** (Reguler, Kinerja, SiLPA Reguler, SiLPA Kinerja untuk Penganggaran, Penatausahaan, Kwitansi, Tanda Terima, BAST, Surat Pesanan, Dokumen, Laporan) + **Pengaturan Profil / AI DeepSeek / 2FA** + **aksi cepat** (SIKAS AI Copilot & Koneksi/Path Database ARKAS), seluruhnya difilter RBAC dan **mengecualikan sepenuhnya fitur/shortcut ganti NPSN**.
3. **Mobile & Tampilan Awal:** Menambahkan tombol ikon pencarian pada layar `< md` (mobile), serta menampilkan bagian **Terakhir Dibuka** (disimpan di `localStorage` per pengguna, maks. 5 item) + daftar fitur utama ketika input pencarian masih kosong.

---

## 3. Arsitektur & Detail Implementasi

### 3.1 Katalog Fitur & Mesin Pencarian: `resources/js/Utils/featureSearchCatalog.ts`

1. **Tipe Data:**
   - `FeatureSearchCategory`: `'Menu Utama' | 'Varian BOSP' | 'Data Master' | 'Fitur Pelengkap' | 'Sistem & Integrasi' | 'Akun & Aksi Cepat'`
   - `FeatureSearchAction`:
     - `{ type: 'route'; routeName: string }`
     - `{ type: 'copilot' }`
     - `{ type: 'arkas-path-modal' }`
   - `FeatureSearchItem`:
     - `id: string`
     - `title: string`
     - `description: string`
     - `category: FeatureSearchCategory`
     - `iconKey: FeatureIconKey` (dipetakan ke ikon `lucide-react` di komponen modal)
     - `tone: IconTileTone`
     - `keywords: string[]`
     - `moduleKey?: string` (kunci modul RBAC di `PermissionCatalog`)
     - `minLevel?: 'read' | 'write'` (default `'read'`)
     - `variantBadge?: string` (opsional, mis. `'BOSP Kinerja'`, `'SiLPA Reguler'`, `'SiLPA Kinerja'`)
     - `isVariantEntry?: boolean` (default `false`; entri varian BOSP non-reguler ditandai `true` agar tidak memenuhi tampilan awal saat input kosong, dan langsung tampil saat pengguna mengetik)
     - `action: FeatureSearchAction`

2. **Helper Akses Modul (`canAccessFeatureModule`):**
   - Menerima `user` dan `authPermissions` (dengan logika identik `Sidebar.tsx` L77–88: cek `authPermissions.modules[modKey]`; bila tidak ada, fallback aturan Kepala Sekolah menyembunyikan modul sistem `['path_arkas', 'backup', 'network_settings', 'system_update', 'user_management']` dan hanya `read`).
   - Memfilter seluruh `FEATURE_SEARCH_ITEMS` sebelum dicari maupun saat memuat riwayat `localStorage`.

3. **Daftar Fitur & Pengecualian Ketat NPSN:**
   - **Menu Utama:** Dashboard (`dashboard`), Penganggaran & RKAS (`penganggaran.index`), Penatausahaan & BKU (`penatausahaan.index`), Rekapitulasi Penatausahaan (`penatausahaan.rekapitulasi`), Status STS (`sts.index`), Arkas Tools (`arkas-tools.index`), Referensi Kode (`referensi-kode.index`).
   - **Data Master:** Profil Sekolah & Kop Surat (`sekolah-profile.index`), Kode Kegiatan (`kode-kegiatan.index`), Rekening Belanja (`rekening-belanja.index`).
   - **Fitur Pelengkap:** Kwitansi (`kwitansi.index`), Tanda Terima (`tanda-terima.index`), BAST (`bast.index`), Surat Pesanan (`surat-pesanan.index`), Dokumen (`dokumen.index`), SK & Surat (`sk-surat.index`), Laporan SPTJ / SP2B / SPMTH / LPH (`laporan.index`).
   - **Varian BOSP (`isVariantEntry: true`, masing-masing untuk `kinerja-`, `silpa-`, `kinerja-silpa-`):** Penganggaran, Penatausahaan, Kwitansi, Tanda Terima, BAST, Surat Pesanan, Dokumen, dan Laporan.
   - **Sistem & Integrasi:**
     - Backup & Restore Database (`backup.index`, modul `backup`) — deskripsi & kata kunci **hanya** meliputi backup, restore, reset database, `.rsv`, cadangan, pulihkan (**tanpa** kata `npsn`, `ganti npsn`, `app_npsn_code`, atau `alt+9`).
     - Pengaturan Jaringan (`network-settings.index`, modul `network_settings`).
     - Management & Role (`management-role.index`, modul `user_management`).
     - Pembaharuan Aplikasi (`system-update.index`, modul `system_update`).
     - Koneksi & Path Database ARKAS (`action: { type: 'arkas-path-modal' }`, modul `path_arkas`, `minLevel: 'write'`).
   - **Akun & Aksi Cepat:**
     - Pengaturan Profil & Akun (`profile.edit` — keywords: biodata, kata sandi, password, deepseek, api key, ai, 2fa, kode keamanan).
     - SIKAS AI Copilot (`action: { type: 'copilot' }` — keywords: ai, copilot, asisten, chat, tanya, analisis).
   - **Aturan Keras Pengecualian NPSN:** Tidak ada item, deskripsi, keyword, maupun shortcut yang merujuk ke ganti NPSN, `APP_NPSN_CODE`, `backup.update-npsn`, atau `Alt+9`.

4. **Fungsi Pencarian & Skor Relevansi (`searchFeatures`):**
   - Memecah query menjadi token lowercase (`query.trim().toLowerCase().split(/\s+/)`).
   - Setiap token harus cocok minimal di salah satu: `title`, `keywords`, `category`, `variantBadge`, atau `description` (AND antar token, sehingga `"kwitansi silpa"` langsung memunculkan Kwitansi SiLPA).
   - Memberikan skor relevansi: exact/prefix match pada `title` > substring `title` > exact/prefix `keywords` > substring `keywords` > `variantBadge`/`category` > `description`.

5. **Riwayat `localStorage` (`loadRecentFeatureIds`, `recordRecentFeatureId`, `clearRecentFeatureIds`):**
   - Key: `sikas:recent-feature-search:${userId ?? 'guest'}`.
   - Menyimpan maksimal 5 ID unik terbaru (MRU order) dengan `try/catch` aman jika `localStorage` diblokir.

### 3.2 Komponen Modal Command Palette: `resources/js/Components/FeatureSearchModal.tsx`

- **Props:**
  - `open: boolean`
  - `onClose: () => void`
  - `setCopilotState?: (state: CopilotWindowState) => void`
- **Aksesibilitas & Tampilan Neo-Bento:**
  - Menggunakan `<Modal show={open} onClose={onClose} maxWidth="2xl" ariaLabelledBy="feature-search-modal-title">`.
  - Wrapper `relative overflow-hidden rounded-[26px]` dengan *ambient blur glow* lembut (`violet` + `lime`), header input pencarian (`role="combobox"`, `aria-expanded="true"`, `aria-controls`, `aria-activedescendant`) yang otomatis fokus saat modal dibuka, tombol `X` untuk hapus teks / tutup, dan daftar hasil `role="listbox"` dengan `sikas-scroll max-h-[58vh] overflow-y-auto`.
- **Navigasi Keyboard:**
  - `ArrowDown` / `ArrowUp`: memindahkan index item aktif secara melingkar dan menjalankan `scrollIntoView({ block: 'nearest' })`.
  - `Enter`: mengeksekusi item aktif (menyimpan ke riwayat, menutup modal, lalu menjalankan `router.visit(route(action.routeName))`, `setCopilotState?.('normal')`, atau `window.dispatchEvent(new CustomEvent('sikas:open-arkas-path-modal'))`).
  - `Escape`: menutup modal (handled oleh `<Modal>` / handler lokal).
- **Tampilan Awal (Query Kosong):**
  - Jika ada riwayat valid di `localStorage`: tampilkan grup **Terakhir Dibuka** dengan tombol kecil `Bersihkan`.
  - Di bawahnya tampilkan fitur utama (`!item.isVariantEntry`) dikelompokkan per kategori.
- **Tampilan Hasil Pencarian (Query Terisi):**
  - Menampilkan hasil terurut relevansi (termasuk entri varian BOSP yang cocok) lengkap dengan highlight teks cocok pada judul, `IconTile`, badge varian/kategori, serta indikator panah pada item aktif.
  - Jika tidak ada hasil cocok: tampilkan *Empty State* Neo-Bento yang ramah dengan saran contoh kata kunci (`RKAS`, `BKU`, `Kwitansi`, `SPTJ`, `Backup`).
- **Footer Modal:** Menampilkan ringkasan jumlah fitur tersedia dan legenda tombol (`↑↓ Navigasi`, `↵ Buka`, `Esc Tutup`).

### 3.3 Pembaruan `resources/js/Components/Navbar.tsx`

- Menyimpan state `searchOpen` dan mendaftarkan shortcut keyboard global `Ctrl+K` / `⌘K` (`(e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k'`) untuk toggle `searchOpen` (`e.preventDefault()`).
- Mengubah pil pencarian desktop (`L63–L80`):
  - `onClick={() => setSearchOpen(true)}` (tidak lagi membuka Copilot).
  - Placeholder teks: `Cari fitur, RKAS, BKU, Kwitansi…`
  - Label shortcut `<kbd>` adaptif (`⌘K` di macOS, `Ctrl K` di Windows/Linux).
- Menambahkan tombol ikon pencarian di mobile (`md:hidden`) pada klaster aksi di sebelah tombol Copilot, dengan gaya `h-9 w-9 rounded-xl border ...` konsisten dengan tombol aksi lainnya.
- Merender `<FeatureSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} setCopilotState={setCopilotState} />`.

### 3.4 Pembaruan `resources/js/Components/Sidebar.tsx`

- Menambahkan `useEffect` untuk mendengarkan event `sikas:open-arkas-path-modal`: bila `canModule('path_arkas', 'write')` bernilai `true`, langsung memanggil `openPathModal()`.

---

## 4. Cakupan & Keamanan

- Tidak mengubah backend PHP, controller, maupun route Laravel mana pun.
- Seluruh fitur yang ditampilkan tunduk pada RBAC (`auth.permissions.modules`) dan hanya menavigasi ke route `GET` yang valid (tidak memicu mutasi data secara tidak sengaja).
- Shortcut/fitur ganti NPSN (`Alt+9` / `APP_NPSN_CODE`) **dikecualikan 100%** dari katalog, deskripsi, keywords, dan saran pencarian.

---

## 5. Rencana Verifikasi

1. Jalankan `npm run build` (`tsc && vite build`) dan pastikan lulus dengan exit code `0`.
2. Verifikasi tidak ada kata `npsn` / `alt+9` pada `featureSearchCatalog.ts` dan `FeatureSearchModal.tsx`.
3. Jalankan peninjauan dua sumbu (`/code-review`: **Standards** & **Spec**) terhadap seluruh file baru dan diubah.
