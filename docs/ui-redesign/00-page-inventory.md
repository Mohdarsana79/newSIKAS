# 00 — Inventaris Halaman & Komponen UI SIKAS (Audit Read-Only)

- **Tanggal audit:** 12 November 2026
- **Repo:** `C:\laragon\www\newSIKAS2\newSIKAS` (Laravel 13 + Inertia + React 18 + TypeScript + Tailwind 3 + Vite 7)
- **Ruang lingkup:** `resources/js/Pages` (103 file) + `resources/js/Components` (63 file) + utilitas di `resources/css/app.css`
- **Sifat:** read-only. Tidak ada file source yang diubah, tidak ada `npm build`/`tsc`, tidak ada operasi git. Satu-satunya tulisan adalah dokumen ini.
- **Dokumen desain yang sudah ada (rujukan):**
  - `docs/superpowers/specs/2026-11-12-sikas-neo-bento-dashboard-ui-design.md`
  - `docs/superpowers/specs/2026-11-12-sikas-neo-bento-dashboard-ui-plan.md` (Tahap 1–3 sudah dieksekusi: primitif Bento, App Shell, Dashboard; **Tahap 4 "Unified Bento Surface untuk Halaman Dalam" belum dikerjakan** — itulah isi laporan ini)

---

## 1. Ringkasan Angka

| Metrik | Angka |
|---|---|
| File `resources/js/Pages` | **103 file / 51.487 baris** |
| File `resources/js/Components` | **63 file / 10.450 baris** |
| Peran *screen* (halaman ber-route, ber-layout) | **36** |
| Peran *tab* (konten tab varian) | **39** |
| Peran *partial* (sub-komponen halaman, non-modal) | **18** |
| Peran *modal* (file `Modal*` di Pages) | **10** (total titik modal kustom: 15 file, termasuk 5 modal SkSurat berawalan lain) |
| Layout `AuthenticatedLayout` | **29 halaman** |
| Layout `GuestLayout` | **6 halaman** (semua `Auth/*`) |
| Tanpa layout (dirender induk) | **67 file** |
| Layout `Landing` mandiri | **1 halaman** (`Welcome`) |
| Gaya **neo-bento** (konten) | **1 halaman** (`Dashboard`) + shell `Sidebar`/`Navbar`/`AuthenticatedLayout` |
| Gaya **legacy** (konten) | **95 file** — rincian: 59 legacy-indigo, 18 legacy-blue, 7 legacy-purple, 7 legacy-netral, 4 campuran |
| Gaya **auth-custom** | **6 halaman** (+7 komponen Auth) |
| Gaya **landing-custom** | **1 halaman** (+18 komponen Landing) |
| Duplikasi byte-identik (MD5) | **3 pasang** (148 baris) |
| Fork >94% identik | **12 file tab** (Kwitansi 4, TandaTerima 4, Dokumen 4) |
| Halaman bertabel legacy | **60 halaman**, total **134 elemen `<table>`** |
| Halaman ber-`print:` CSS | **28 file** |
| Halaman memicu PDF via `window.open`/Blade | **19 file** |
| Template PDF Blade (di luar TSX) | **160 file** `*.blade.php` (mayoritas PDF laporan/pelengkap) |

**Kesimpulan satu baris:** shell aplikasi sudah Neo-Bento, tetapi **95 dari 103 file halaman masih legacy** dan memakai 3 palet aksen berbeda (indigo/blue/purple) — kontras shell vs isi adalah masalah visual utama, bukan sekadar "ganti warna".

---

## 2. Definisi Klasifikasi

- **Peran** — `screen`: file halaman ber-route (punya `AuthenticatedLayout`/`GuestLayout`, `<Head>`, dan `header`); `tab`: konten satu tab varian yang dirender oleh shell `Index`; `partial`: sub-komponen halaman (form/edit/detail/builder); `modal`: dialog `Modal*`.
- **Layout** — mengikuti layout yang benar-benar dirender (`<AuthenticatedLayout>` / `GuestLayout`). Tanda `—` berarti file dirender di dalam file induk.
- **Gaya visual konten** — diukur kuantitatif dari jumlah kemunculan token: `brand-`/`#7C5CFF`/`Bento` (neo-bento) vs `bg-white dark:bg-gray-800` + aksen `indigo-`/`blue-`/`purple-` (legacy), lalu diverifikasi dengan pembacaan file.
  - **Penting:** karena `AuthenticatedLayout` sudah Neo-Bento, **semua 29 halaman ber-`AuthenticatedLayout` secara shell sudah campuran** (chrome neo + isi legacy). Kolom "Gaya" di bawah menilai **isi halaman**, bukan shell.
- **Building block** — blok UI yang diulang manual di dalam file (bukan hasil impor komponen bersama), ditulis singkat: `tabel`, `filter`, `paginasi`, `form`, `modal`, `tab bar`, `kartu`, `empty`, `print`, `PDF`, `chart`, `AI`.

Footnote layout:
- 4 file `FiturPelengkap/TandaTerima/Tab*.tsx` meng-`import AuthenticatedLayout` tetapi **tidak merendernya** (import mati). File tetap `—` karena dirender oleh `TandaTerima/Index.tsx`.
- `Auth/*` memakai `GuestLayout` (143 baris, memuat `AuthScene` 1.174 baris), bukan `AuthenticatedLayout`.

---

## 3. Tabel Inventaris `resources/js/Pages` (103 file)

Path di kolom pertama relatif terhadap `resources/js/Pages/`. Urut per modul.

### 3.1 Root, Auth, Profile (15 file)

| Path | Peran | Baris | Layout | Gaya | Building block khas |
|---|---|---:|---|---|---|
| `Dashboard.tsx` | screen | 567 | AuthenticatedLayout | **neo-bento** | Bento grid 12 kolom, 4 `StatCard` (tilt 3D), 2 ApexCharts, `ArkasQuickSyncCard`, `CalendarWidget`, empty-state |
| `Welcome.tsx` | screen | 81 | Landing | landing-custom | 9 section Landing (Hero, Modules, Stats, Why, Steps, TrustStrip, CTA, Footer) |
| `Auth/Login.tsx` | screen | 278 | GuestLayout | auth-custom | form auth, modal 2FA (pakai `Components/Modal` legacy) |
| `Auth/Register.tsx` | screen | 266 | GuestLayout | auth-custom | form auth, `AuthLockedState` |
| `Auth/ForgotPassword.tsx` | screen | 400 | GuestLayout | auth-custom | form auth + state sukses/gagal |
| `Auth/ResetPassword.tsx` | screen | 154 | GuestLayout | auth-custom | form auth |
| `Auth/ConfirmPassword.tsx` | screen | 70 | GuestLayout | auth-custom | form auth |
| `Auth/VerifyEmail.tsx` | screen | 71 | GuestLayout | auth-custom | form auth |
| `Profile/Edit.tsx` | screen | 61 | AuthenticatedLayout | legacy-purple | 4 kartu `sm:rounded-xl` + 4 partial form (UpdateProfile, UpdatePassword, DeepSeek, SecurityCode) |
| `Profile/Partials/UpdateProfileInformationForm.tsx` | partial | 154 | — | campuran(purple+indigo) | form (`PrimaryButton`, `TextInput`, `InputLabel`) |
| `Profile/Partials/UpdatePasswordForm.tsx` | partial | 161 | — | legacy-purple | form |
| `Profile/Partials/DeepSeekApiForm.tsx` | partial | 272 | — | legacy-indigo | form API key + status |
| `Profile/Partials/SecurityCodeForm.tsx` | partial | 180 | — | legacy-indigo | form + modal verifikasi |
| `Profile/Partials/DeleteUserForm.tsx` | partial | 121 | — | legacy-netral | form + modal konfirmasi — **tidak diimpor halaman mana pun** (digantikan `SecurityCodeForm`) |
| `Profile/Partials/UserManagementForm.tsx` | partial | 401 | — | legacy-indigo | tabel user, form, 2 modal |

### 3.2 DataMaster, Backup, Integrasi, ArkasTools (9 file)

| Path | Peran | Baris | Layout | Gaya | Building block khas |
|---|---|---:|---|---|---|
| `DataMaster/KodeKegiatan/Index.tsx` | screen | 559 | AuthenticatedLayout | legacy-indigo | tabel, filter/cari, paginasi client-side, modal CRUD (3), empty, impor file |
| `DataMaster/RekeningBelanja/Index.tsx` | screen | 603 | AuthenticatedLayout | legacy-indigo | tabel, filter/cari, paginasi, modal CRUD, checkbox pajak inline, impor/ekspor |
| `DataMaster/SekolahProfile/Index.tsx` | screen | 653 | AuthenticatedLayout | legacy-indigo | form profil sekolah, modal, kartu, `KopSuratBuilder` |
| `DataMaster/SekolahProfile/Partials/KopSuratBuilder.tsx` | partial | 1.618 | — | legacy-indigo | editor **Tiptap** rich-text, modal, preview kop surat |
| `Backup/Index.tsx` | screen | 772 | AuthenticatedLayout | legacy-indigo | tabel backup, form upload, modal konfirmasi, kartu status |
| `Integrasi/Api.tsx` | screen | 178 | AuthenticatedLayout | legacy-indigo | form konfigurasi API, kartu |
| `Integrasi/Sync.tsx` | screen | 435 | AuthenticatedLayout | legacy-indigo | tabel status sync, form, modal, empty |
| `ArkasTools/Index.tsx` | screen | 831 | AuthenticatedLayout | legacy-indigo | tabel, form, modal, `ArkasDiagnosticModal` (AI), progress |
| `ArkasTools/ReferensiKode.tsx` | screen | 468 | AuthenticatedLayout | legacy-indigo | 2 tabel, filter/cari, tab bar, modal |

### 3.3 Penganggaran — hub + RKAS Murni (12 file)

| Path | Peran | Baris | Layout | Gaya | Building block khas |
|---|---|---:|---|---|---|
| `Penganggaran/Index.tsx` | screen | 893 | AuthenticatedLayout | legacy-indigo | kartu tahun anggaran, tab varian (5), modal CRUD, form, empty, modal ARKAS |
| `Penganggaran/Rkas/Index.tsx` | screen | 1.578 | AuthenticatedLayout | legacy-indigo | tabel item RKAS, filter bulan, paginasi, 5+ modal (item/detail/copy/ARKAS/hapus), `SearchableSelect`, `Dropdown` |
| `Penganggaran/Rkas/Summary.tsx` | screen | 1.759 | AuthenticatedLayout | legacy-indigo | **9 tab internal**, 13 tabel laporan, **`print:` CSS**, modal pengaturan cetak inline, `DatePicker`, chart |
| `Penganggaran/Rkas/Partials/TabAlurKas.tsx` | tab | 205 | — | legacy-indigo | tabel alur kas, `print:` |
| `Penganggaran/Rkas/Partials/TabGrafik.tsx` | tab | 156 | — | legacy-blue | ApexCharts |
| `Penganggaran/Rkas/Partials/TabLembarKerja221.tsx` | tab | 157 | — | legacy-indigo | tabel lembar kerja, `print:` |
| `Penganggaran/Rkas/Partials/TabRincian.tsx` | tab | 87 | — | legacy-blue | tabel rincian, `print:` |
| `Penganggaran/Rkas/Partials/TabRincianPencairan.tsx` | tab | **2.103** | — | legacy-indigo | tabel pencairan besar, modal form, filter, empty |
| `Penganggaran/Rkas/Partials/TabRkaBulanan.tsx` | tab | 289 | — | legacy-indigo | tabel bulanan, `print:` |
| `Penganggaran/Rkas/Partials/TabRkaRekap.tsx` | tab | 157 | — | legacy-indigo | 4 tabel rekap, `print:` |
| `Penganggaran/Rkas/Partials/TabRkaTahapan.tsx` | tab | 259 | — | legacy-indigo | tabel tahapan, `print:` |
| `Penganggaran/Rkas/Partials/TabRkaTahapanV1.tsx` | tab | 289 | — | legacy-indigo | tabel tahapan V1, `print:` |

### 3.4 Penganggaran — RKAS Perubahan (11 file)

| Path | Peran | Baris | Layout | Gaya | Building block khas |
|---|---|---:|---|---|---|
| `Penganggaran/RkasPerubahan/Index.tsx` | screen | 1.392 | AuthenticatedLayout | campuran(blue+indigo) | tabel, filter/cari, modal (copy/ARKAS/hapus), tab varian |
| `Penganggaran/RkasPerubahan/Summary.tsx` | screen | 1.640 | AuthenticatedLayout | legacy-indigo | tab internal, 11 tabel laporan, **`print:` CSS**, modal cetak inline, chart |
| `Penganggaran/RkasPerubahan/Partials/TabAlurKas.tsx` | tab | 225 | — | legacy-indigo | tabel, `print:` |
| `Penganggaran/RkasPerubahan/Partials/TabGrafik.tsx` | tab | 173 | — | legacy-blue | ApexCharts |
| `Penganggaran/RkasPerubahan/Partials/TabLembarKerja221.tsx` | tab | 164 | — | legacy-indigo | tabel, `print:` |
| `Penganggaran/RkasPerubahan/Partials/TabRincianPerubahan.tsx` | tab | 1.059 | — | legacy-indigo | tabel rincian perubahan, modal form, filter, `print:` |
| `Penganggaran/RkasPerubahan/Partials/TabRkaBulanan.tsx` | tab | 287 | — | legacy-indigo | tabel, `print:` |
| `Penganggaran/RkasPerubahan/Partials/TabRkaRekap.tsx` | tab | 164 | — | legacy-indigo | 4 tabel, `print:` |
| `Penganggaran/RkasPerubahan/Partials/TabRkaTahapan.tsx` | tab | 366 | — | legacy-indigo | tabel, `print:` |
| `Penganggaran/RkasPerubahan/Partials/TabRkaTahapanV1.tsx` | tab | 290 | — | legacy-indigo | tabel, `print:` |
| `Penganggaran/RkasPerubahan/Partials/TabRkaTahapanV2.tsx` | tab | 311 | — | legacy-indigo | tabel (versi V2), `print:` |

### 3.5 Penganggaran — SilpaRkas (10 file)

| Path | Peran | Baris | Layout | Gaya | Building block khas |
|---|---|---:|---|---|---|
| `Penganggaran/SilpaRkas/Index.tsx` | screen | 1.245 | AuthenticatedLayout | campuran(indigo+blue) | tabel, filter/cari, modal (copy/ARKAS/hapus) |
| `Penganggaran/SilpaRkas/Summary.tsx` | screen | 546 | AuthenticatedLayout | legacy-indigo | tab internal, modal, `window.open` PDF, chart |
| `Penganggaran/SilpaRkas/Partials/TabAlurKas.tsx` | tab | 229 | — | legacy-indigo | tabel, `print:` |
| `Penganggaran/SilpaRkas/Partials/TabGrafik.tsx` | tab | 173 | — | legacy-blue | ApexCharts |
| `Penganggaran/SilpaRkas/Partials/TabLembarKerja221.tsx` | tab | 162 | — | legacy-indigo | tabel, `print:` |
| `Penganggaran/SilpaRkas/Partials/TabRincian.tsx` | tab | 104 | — | legacy-blue | tabel, `print:` |
| `Penganggaran/SilpaRkas/Partials/TabRkaBulanan.tsx` | tab | 285 | — | legacy-indigo | tabel, `print:` |
| `Penganggaran/SilpaRkas/Partials/TabRkaRekap.tsx` | tab | 162 | — | legacy-indigo | 4 tabel, `print:` |
| `Penganggaran/SilpaRkas/Partials/TabRkaTahapan.tsx` | tab | 275 | — | legacy-indigo | tabel, `print:` |
| `Penganggaran/SilpaRkas/Partials/TabRkaTahapanV1.tsx` | tab | 295 | — | legacy-indigo | tabel, `print:` |

### 3.6 Penatausahaan (11 file)

| Path | Peran | Baris | Layout | Gaya | Building block khas |
|---|---|---:|---|---|---|
| `Penatausahaan/Index.tsx` | screen | 878 | AuthenticatedLayout | legacy-blue | kartu ringkasan saldo, form, modal, empty |
| `Penatausahaan/Bku.tsx` | screen | **3.752** | AuthenticatedLayout | legacy-blue | 4 tabel BKU, form multi-step besar, filter/search, 6 modal, `ArkasDiagnosticModal`, kartu saldo |
| `Penatausahaan/Rekapitulasi.tsx` | screen | **3.057** | AuthenticatedLayout | legacy-indigo | **12 tabel BKP** (bank/pembantu/umum/pajak/ROB/reg/BA), tab internal 10+, 10+ modal cetak (`PrintSettingsModal`), `BkuAuditModal` (AI) |
| `Penatausahaan/Sts/Index.tsx` | screen | 541 | AuthenticatedLayout | legacy-blue | tabel STS, form, modal, kartu, react-select |
| `Penatausahaan/Dokumen/Index.tsx` | screen | 94 | AuthenticatedLayout | legacy-purple | tab strip varian ungu (4 tab) |
| `Penatausahaan/Dokumen/components/TabReguler.tsx` | tab | 450 | — | legacy-purple | tabel, filter, paginasi, modal, form, `SearchableSelect` |
| `Penatausahaan/Dokumen/components/TabSilpa.tsx` | tab | 452 | — | legacy-purple | idem |
| `Penatausahaan/Dokumen/components/TabKinerja.tsx` | tab | 450 | — | legacy-purple | idem |
| `Penatausahaan/Dokumen/components/TabKinerjaSilpa.tsx` | tab | 451 | — | legacy-purple | idem |
| `Penatausahaan/Partials/CheckStsModal.tsx` | partial | 231 | — | legacy-indigo | tabel cek STS, checkbox, modal |
| `Penatausahaan/Partials/TrkSaldoAwalModal.tsx` | partial | 152 | — | legacy-indigo | modal form saldo awal (`CurrencyInput`, `DatePicker`) |

### 3.7 FiturPelengkap — Kwitansi (5 file)

| Path | Peran | Baris | Layout | Gaya | Building block khas |
|---|---|---:|---|---|---|
| `FiturPelengkap/Kwitansi/Index.tsx` | screen | 91 | AuthenticatedLayout | legacy-blue | tab varian biru (`bg-blue-600` aktif), 4 tombol route |
| `FiturPelengkap/Kwitansi/TabReguler.tsx` | tab | 907 | — | legacy-indigo | tabel besar, filter, paginasi, modal form, `PrintSettingsModal`, `PdfPreviewModal`, react-select, `print:` |
| `FiturPelengkap/Kwitansi/TabSilpa.tsx` | tab | 906 | — | legacy-indigo | idem (95,9% identik) |
| `FiturPelengkap/Kwitansi/TabKinerja.tsx` | tab | 906 | — | legacy-indigo | idem |
| `FiturPelengkap/Kwitansi/TabKinerjaSilpa.tsx` | tab | 906 | — | legacy-indigo | idem |

### 3.8 FiturPelengkap — TandaTerima (5 file)

| Path | Peran | Baris | Layout | Gaya | Building block khas |
|---|---|---:|---|---|---|
| `FiturPelengkap/TandaTerima/Index.tsx` | screen | 82 | AuthenticatedLayout | legacy-blue | tab varian biru |
| `FiturPelengkap/TandaTerima/TabReguler.tsx` | tab | 806 | — (import `AuthenticatedLayout` mati) | legacy-indigo | tabel, filter, paginasi, modal, `PrintSettingsModal`, `PdfPreviewModal`, react-select |
| `FiturPelengkap/TandaTerima/TabSilpa.tsx` | tab | 804 | — (idem) | legacy-indigo | idem (94,8% identik) |
| `FiturPelengkap/TandaTerima/TabKinerja.tsx` | tab | 804 | — (idem) | legacy-indigo | idem |
| `FiturPelengkap/TandaTerima/TabKinerjaSilpa.tsx` | tab | 804 | — (idem) | legacy-indigo | idem |

### 3.9 FiturPelengkap — Laporan (6 file)

| Path | Peran | Baris | Layout | Gaya | Building block khas |
|---|---|---:|---|---|---|
| `FiturPelengkap/Laporan/Index.tsx` | screen | 82 | AuthenticatedLayout | legacy-blue | tab varian biru |
| `FiturPelengkap/Laporan/TabReguler.tsx` | tab | 99 | — | legacy-blue | wrapper 4 tab laporan (Spmth/Sptj/Sp2b/Lph) |
| `FiturPelengkap/Laporan/components/LphTab.tsx` | partial | 843 | — | campuran(blue+indigo+purple) | tabel, filter, paginasi, modal, modal cetak inline, react-select, react-datepicker |
| `FiturPelengkap/Laporan/components/SptjTab.tsx` | partial | 853 | — | legacy-indigo | idem |
| `FiturPelengkap/Laporan/components/SpmthTab.tsx` | partial | 739 | — | legacy-indigo | idem |
| `FiturPelengkap/Laporan/components/Sp2bTab.tsx` | partial | 795 | — | legacy-blue | idem |

### 3.10 FiturPelengkap — BAST (6 file)

| Path | Peran | Baris | Layout | Gaya | Building block khas |
|---|---|---:|---|---|---|
| `FiturPelengkap/Bast/Index.tsx` | screen | 273 | AuthenticatedLayout | legacy-blue | tabel, filter, kartu statistik (total/tersedia), 5 modal lokal, tab varian |
| `FiturPelengkap/Bast/ModalFormBast.tsx` | modal | 340 | — | legacy-blue | form + `SearchableSelect` |
| `FiturPelengkap/Bast/ModalDetailBast.tsx` | modal | 97 | — | legacy-blue | tabel detail |
| `FiturPelengkap/Bast/ModalPrintSettings.tsx` | modal | 74 | — | legacy-indigo | modal cetak — **duplikat identik** `SuratPesanan/ModalPrintSettings.tsx` |
| `FiturPelengkap/Bast/ModalPreview.tsx` | modal | 32 | — | legacy-netral | iframe preview PDF — **duplikat identik** `SuratPesanan/ModalPreview.tsx` |
| `FiturPelengkap/Bast/ModalConfirmDelete.tsx` | modal | 42 | — | legacy-netral | modal hapus — **duplikat identik** `SuratPesanan/ModalConfirmDelete.tsx` |

### 3.11 FiturPelengkap — SuratPesanan (6 file)

| Path | Peran | Baris | Layout | Gaya | Building block khas |
|---|---|---:|---|---|---|
| `FiturPelengkap/SuratPesanan/Index.tsx` | screen | 274 | AuthenticatedLayout | legacy-blue | tabel, filter, kartu statistik, 5 modal lokal, tab varian (72,2% identik dengan BAST/Index) |
| `FiturPelengkap/SuratPesanan/ModalFormSuratPesanan.tsx` | modal | 449 | — | legacy-blue | form + `SearchableSelect` |
| `FiturPelengkap/SuratPesanan/ModalDetailSuratPesanan.tsx` | modal | 70 | — | legacy-netral | tabel detail |
| `FiturPelengkap/SuratPesanan/ModalPrintSettings.tsx` | modal | 74 | — | legacy-indigo | duplikat identik |
| `FiturPelengkap/SuratPesanan/ModalPreview.tsx` | modal | 32 | — | legacy-netral | duplikat identik |
| `FiturPelengkap/SuratPesanan/ModalConfirmDelete.tsx` | modal | 42 | — | legacy-netral | duplikat identik |

### 3.12 SkSurat (7 file)

| Path | Peran | Baris | Layout | Gaya | Building block khas |
|---|---|---:|---|---|---|
| `SkSurat/Index.tsx` | screen | 359 | AuthenticatedLayout | legacy-indigo | toolbar folder, grid/list dokumen, modal, filter/search |
| `SkSurat/Show.tsx` | screen | 519 | AuthenticatedLayout | legacy-indigo | tabel dokumen, modal, tombol ekspor PDF/DOCX |
| `SkSurat/Partials/FolderModal.tsx` | partial | 172 | — | legacy-indigo | form folder + modal |
| `SkSurat/Partials/GenerateDokumenModal.tsx` | partial | 383 | — | legacy-indigo | form generate, modal |
| `SkSurat/Partials/ManageTemplatesModal.tsx` | partial | 234 | — | legacy-indigo | form template, modal, empty |
| `SkSurat/Partials/UploadArsipModal.tsx` | partial | 163 | — | legacy-netral | form upload, modal |
| `SkSurat/Partials/ConfirmModal.tsx` | partial | 90 | — | legacy-indigo | modal konfirmasi |

**Total verifikasi modul:** 15 + 9 + 12 + 11 + 10 + 11 + 5 + 5 + 6 + 6 + 6 + 7 = **103 file** (root 2, Auth 6, Profile 7, DataMaster 4, Backup 1, Integrasi 2, ArkasTools 2, Penganggaran 33, Penatausahaan 11, FiturPelengkap 28, SkSurat 7).

---

## 4. Inventaris `resources/js/Components` (63 file)

Path relatif terhadap `resources/js/Components/`. "Dipakai" = jumlah file di `Pages` yang mengimpor komponen tersebut.

| Komponen | Kelompok | Baris | Dipakai | Catatan / dampak restyle |
|---|---|---:|---:|---|
| `Modal.tsx` | primitif legacy | 96 | **54 halaman** | titik paling kritikal; dipakai juga di `Sidebar` (modal path ARKAS) dan `Auth/Login` (2FA) |
| `PrimaryButton.tsx` | tombol legacy | 23 | **46 halaman** | indigo-600 |
| `SecondaryButton.tsx` | tombol legacy | 25 | **43 halaman** | border-gray-300 |
| `TextInput.tsx` | form legacy | 42 | **39 halaman** | border-gray-300 + focus indigo |
| `InputLabel.tsx` | form legacy | 22 | **37 halaman** | — |
| `DangerButton.tsx` | tombol legacy | 23 | **24 halaman** | red-600 |
| `InputError.tsx` | form legacy | 17 | **23 halaman** | text-red-600 |
| `DatePicker.tsx` | form legacy | 80 | **16 halaman** | membungkus `ui/calendar` (react-day-picker) — jalur ganda design system |
| `SearchableSelect.tsx` | form legacy | 164 | **10 halaman** | select custom; paralel dengan `react-select` (13 halaman) |
| `PrintSettingsModal.tsx` | print | 138 | **9 halaman** | Kwitansi 4, TandaTerima 4, Rekapitulasi 1 |
| `PdfPreviewModal.tsx` | print | 103 | **8 halaman** | iframe PDF + header indigo |
| `Dropdown.tsx` | primitif legacy | 131 | **8 halaman** | menu aksi tabel |
| `CurrencyInput.tsx` | form legacy | 123 | **1 halaman** | `Penatausahaan/TrkSaldoAwalModal` |
| `Toast.tsx` | shell | 108 | global (layout) | membaca `flash` + event `toast-notification`; 8 halaman dispatch manual |
| `Sidebar.tsx` | shell neo-bento | 545 | global (29 halaman) | sudah neo (charcoal `#0D0F17`, `brand-500`); **masih memakai `Modal`/`TextInput`/`PrimaryButton` legacy** untuk modal path ARKAS + `alert()` (baris 68/71/74) |
| `Navbar.tsx` | shell neo-bento | 167 | global | sudah neo (greeting, pill search, `brand-*`, `shadow-glow-violet`) |
| `StatCard.tsx` | neo-bento | 87 | 1 (Dashboard) | `rounded-[1.75rem]`, `TiltCard`; belum dipakai halaman dalam |
| `Bento/BentoCard.tsx` | neo-bento | 93 | 1 (Dashboard) | kontainer kartu `rounded-[1.75rem]`, opsi tilt |
| `Bento/ArkasQuickSyncCard.tsx` | neo-bento | 88 | 1 (Dashboard) | kartu promo ARKAS |
| `Bento/CalendarWidget.tsx` | neo-bento | 140 | 1 (Dashboard) | kalender keuangan |
| `DarkModeSwitcher.tsx` | shell | 101 | via Navbar | — |
| `FullscreenSwitcher.tsx` | shell | 94 | via Navbar | — |
| `NotificationDropdown.tsx` | shell | 189 | via Navbar | masih legacy indigo |
| `NotificationModal.tsx` | shell | 160 | via NotificationDropdown | legacy |
| `PajakReminderModal.tsx` | shell | 61 | via NotificationDropdown | legacy |
| `ChangelogModal.tsx` | shell | 89 | global layout | legacy indigo |
| `Ai/ArkasDiagnosticModal.tsx` | AI | 688 | 3 (ArkasTools/Index, Bku, Penatausahaan/Index) | indigo berat |
| `Ai/BkuAuditModal.tsx` | AI | 645 | 1 (Rekapitulasi) | indigo berat |
| `Ai/CopilotDrawer.tsx` | AI | 876 | global layout | indigo 31×, `bg-white dark:bg-gray-800` 18× — **satu-satunya panel AI global yang belum neo** |
| `Auth/AuthScene.tsx` | auth-custom | 1.174 | via GuestLayout | background animasi kustom |
| `Auth/AuthField.tsx` | auth-custom | 113 | 5 | form auth |
| `Auth/AuthHeading.tsx` | auth-custom | 61 | 6 | — |
| `Auth/AuthButton.tsx` | auth-custom | 48 | 6 | — |
| `Auth/AuthCheckbox.tsx` | auth-custom | 34 | 1 (Login) | — |
| `Auth/AuthLockedState.tsx` | auth-custom | 40 | 1 (Register) | — |
| `Auth/AuthWordmark.tsx` | auth-custom | 48 | via GuestLayout/Auth | — |
| `Landing/*` (9 section: Hero, ModulesSection, WhySection, StatsSection, StepsSection, TrustStrip, CtaSection, Footer, Navbar) | landing-custom | 2.076 | 1 (Welcome) | desain mandiri, jangan dipaksa neo-bento |
| `Landing/ui/*` (9 primitif: TiltCard, Reveal, MagneticButton, Counter, GlassCard, GradientText, AuroraBackground, SectionHeading, AccountActions) | landing-custom | 622 | internal Landing + `StatCard`/`BentoCard` memakai `TiltCard` | **primitif animasi yang bisa dipakai ulang**; `useReducedMotion`/`useReveal`/`useCountUp` tersedia di `Hooks/` |
| `Rkas/RkasAiReviewModal.tsx` | tidak terpakai | 334 | **0** | tidak diimpor di `resources/js/**/*.tsx` |
| `Rkas/RkasItemReviewModal.tsx` | tidak terpakai | 255 | **0** | idem |
| `Rkas/RkasApprovalBanner.tsx` | tidak terpakai | 175 | **0** | idem |
| `ui/button.tsx` | shadcn | 57 | via `ui/calendar` | jalur ganda; hanya dipakai DatePicker |
| `ui/calendar.tsx` | shadcn | 217 | via `DatePicker` | idem |
| `Checkbox.tsx` | legacy tak terpakai | 18 | **0** | halaman memakai `<input type="checkbox">` inline (12 file) |
| `NavLink.tsx` | legacy tak terpakai | 24 | **0** | digantikan `NavLink` lokal di Sidebar |
| `ResponsiveNavLink.tsx` | legacy tak terpakai | 22 | **0** | sisa Breeze |
| `ApplicationLogo.tsx` | legacy tak terpakai | 14 | **0** | sisa Breeze |

Catatan: 63 file = 12 primitif Breeze + 13 shell/Bento + 5 form/print lanjutan + 3 AI + 2 shadcn + 7 Auth + 18 Landing + 3 Rkas tak terpakai. 18 komponen Landing diringkas dalam 2 baris tabel di atas (seluruh nama file tercantum di dalam baris).

---

## 5. 10 Building Block Utama (dipakai berulang)

| # | Building block | Sumber/pola | Jumlah pemakai | Catatan pola legacy dominan |
|---|---|---|---:|---|
| 1 | **Modal** | `Components/Modal.tsx` (96) + 15 file modal lokal | 54 halaman | wrapper `bg-white dark:bg-gray-800 sm:rounded-lg overflow-hidden shadow-xl`; semua CRUD memakai ini |
| 2 | **Tombol** | `PrimaryButton`/`SecondaryButton`/`DangerButton` | 46 / 43 / 24 halaman | `inline-flex items-center px-4 py-2 bg-indigo-600 … uppercase tracking-widest` (Breeze); 49 halaman juga menulis `focus:ring-indigo-500` manual |
| 3 | **Input form** | `TextInput`/`InputLabel`/`InputError`/`SearchableSelect`/`DatePicker`/`CurrencyInput` | 39 / 37 / 23 / 10 / 16 / 1 | `border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm`; halaman juga memakai `<select>`/`<input>` mentah |
| 4 | **Tabel legacy** | markup inline `<table>` | **60 halaman, 134 `<table>`** | `min-w-full divide-y divide-gray-200 dark:divide-gray-700`, header `bg-gray-50 dark:bg-gray-700`, sel `px-6 py-4 whitespace-nowrap`; 52 halaman memakai `overflow-x-auto`, 11 memakai kartu `sm:rounded-lg` |
| 5 | **Kartu/surface legacy** | `bg-white dark:bg-gray-800 shadow-sm sm:rounded-lg` | **68 halaman** (340 kemunculan) | belum ada padanan `.bento-surface` yang dipakai di halaman dalam |
| 6 | **Tab bar varian** | inline di `Index` shell + `Summary` | 5 shell dokumen (`Kwitansi/Index` 91, `TandaTerima/Index` 82, `Laporan/Index` 82, `Bast/Index` 273, `SuratPesanan/Index` 274) + `Dokumen/Index` 94 + `Penganggaran/Index` 893 + 3 `Summary` | **3 gaya berbeda:** pil biru `bg-blue-600`/`bg-blue-50`; strip ungu `bg-purple-900/10` + `text-purple-700`; indigo `aria-label="Tabs"`; `Rkas/Summary` punya 9 tab internal sendiri |
| 7 | **Header halaman** | prop `header` pada layout | 29 screen; **11 halaman** memakai string persis `header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">` | tidak ada komponen `PageHeader`; tiap halaman menulis ulang |
| 8 | **Paginasi** | inline Prev/Next | **25 halaman** (terdeteksi `Sebelumnya`/`Berikutnya`/`links.map`/`last_page`) | tombol manual; hanya 4 halaman memakai `links.map` Inertia; beberapa tab memakai paginasi server kustom |
| 9 | **Pipeline print/PDF** | `PrintSettingsModal` + `PdfPreviewModal` + `window.open(route(...))` | `PrintSettingsModal` 9 halaman (+4 modal cetak inline di Laporan), `PdfPreviewModal` 8 halaman, `window.open` 19 halaman, `print:` CSS 28 file | opsi kertas/F4/A4/11pt/12pt dikirim sebagai query `paper_size`, `orientation`, `font_size`, `tahap`, `bulan`; lihat §7 |
| 10 | **Filter bar + empty state** | inline | filter/cari **29 halaman**; empty-state teks `Belum ada` / `Tidak ada data` **39 halaman** | 3 pola filter: toolbar di atas tabel, bar terpisah, dan pencarian debounce axios; tidak ada komponen `FilterBar`/`EmptyState` |

Blok lain yang juga berulang (tidak masuk 10 besar): **Toast** global `Components/Toast.tsx` + 8 halaman mendispatch `window.dispatchEvent(new CustomEvent('toast-notification'))`; **chart ApexCharts** 7 halaman; **react-select** 13 halaman (paralel `SearchableSelect`); **react-datepicker** 4 halaman (paralel `DatePicker`); **Tiptap** 1 halaman (`KopSuratBuilder`).

---

## 6. Cluster Duplikasi & Saran Ekstraksi

### 6.1 Duplikasi byte-identik (MD5 sama)

| File | Baris | Saran |
|---|---:|---|
| `FiturPelengkap/Bast/ModalPreview.tsx` = `SuratPesanan/ModalPreview.tsx` | 32 | hapus salah satu, jadikan `Components/Documents/PdfPreviewFrame` atau langsung pakai `PdfPreviewModal` |
| `FiturPelengkap/Bast/ModalPrintSettings.tsx` = `SuratPesanan/ModalPrintSettings.tsx` | 74 | ganti dengan `Components/PrintSettingsModal` yang sudah ada |
| `FiturPelengkap/Bast/ModalConfirmDelete.tsx` = `SuratPesanan/ModalConfirmDelete.tsx` | 42 | jadikan `Components/ConfirmDeleteModal` generik |

### 6.2 Fork varian yang hampir identik

| Cluster | Kemiripan terukur | Saran ekstraksi |
|---|---|---|
| `Kwitansi/Tab*` (4 file × ±906 baris) | **95,9%** antar-tab | satu `DocumentTable` + satu `useDocumentVariant` (bedakan model/FK/routePrefix via props, bukan copy file). Potensi hemat ±2.700 baris |
| `TandaTerima/Tab*` (4 × ±804 baris) | **94,8%** | idem; sekaligus hapus import mati `AuthenticatedLayout` |
| `Penatausahaan/Dokumen/components/Tab*` (4 × ±450 baris) | **94,2%** | idem; warna ungu harus disamakan ke token brand |
| `Bast/Index` vs `SuratPesanan/Index` (273/274) | **72,2%** | satu `DocumentListPage` (toolbar, kartu statistik, tabel, 4 modal) |
| `Kwitansi/TabReguler` vs `TandaTerima/TabReguler` | **66,8%** | satu `DocumentTable` bersama; beda kolom + aksi cetak |
| `Rkas/Summary` vs `RkasPerubahan/Summary` | **65,8%** | satu `ReportTabs` + renderer tabel laporan; 4 blok dokumen `print:` identik |
| `Rkas/Index` vs `SilpaRkas/Index` | **73,4%** | satu `RkasItemTable` + modal set |
| `Bast/ModalFormBast` vs `SuratPesanan/ModalFormSuratPesanan` | rendah (field beda) | tetap terpisah, tapi pakai primitif form yang sama |

Catatan penting: partial RKAS antar-varian **bukan** copy-paste identik (mis. `TabRincianPencairan` 2.103 baris vs `TabRincianPerubahan` 1.059 baris; `TabRkaTahapan` 259 vs 366 baris). Ekstraksi harus berbasis props/parameter, bukan penggabungan file buta.

### 6.3 Duplikasi pola (bukan file)

- **Modal pengaturan cetak ada di 3 tempat:** `Components/PrintSettingsModal` (dipakai 9 halaman), salinan lokal BAST/SP (74 baris), dan blok inline di `Rkas/Summary` baris 293–420 (`showPrintModal`). Satukan ke satu komponen.
- **Helper toast disalin manual** di 8 halaman (`const showToast = … window.dispatchEvent(new CustomEvent('toast-notification'))`). Ekstrak `useToast()`.
- **Tab bar varian disalin dengan 3 gaya visual** (biru/ungu/indigo). Ekstrak `VariantTabs` yang membaca `routePrefix`.
- **Header halaman** ditulis inline 29×. Ekstrak `PageHeader` (judul + deskripsi + breadcrumb + slot aksi).
- **Kartu statistik ringkasan** dibuat manual di `Penganggaran/Index`, `Bast/Index`, `SuratPesanan/Index`, `Penatausahaan/Index`, `Bku`, `Rekapitulasi`; hanya Dashboard memakai `StatCard`.

---

## 7. Halaman Print/PDF yang Layout Cetaknya Harus Dipertahankan

### 7.1 Print CSS on-screen (28 file — `print:` di TSX)

| Modul | File | Catatan |
|---|---|---|
| RKAS Murni | `Rkas/Summary.tsx` (8× `print:`), `Partials/TabAlurKas`, `TabLembarKerja221`, `TabRincian`, `TabRkaBulanan`, `TabRkaRekap`, `TabRkaTahapan`, `TabRkaTahapanV1` | container dokumen `p-8 bg-white border shadow-sm rounded-lg print:border-none print:shadow-none` (Summary baris 478, 714, 1.102, 1.251) — **jangan diubah saat restyle** |
| RKAS Perubahan | `RkasPerubahan/Summary.tsx` (6×), `Partials/TabAlurKas`, `TabLembarKerja221`, `TabRincianPerubahan`, `TabRkaBulanan`, `TabRkaRekap`, `TabRkaTahapan`, `TabRkaTahapanV1`, `TabRkaTahapanV2` | idem |
| SilpaRkas | `Partials/TabAlurKas`, `TabLembarKerja221`, `TabRincian`, `TabRkaBulanan`, `TabRkaRekap`, `TabRkaTahapan`, `TabRkaTahapanV1` | idem |
| Kwitansi | `TabReguler`, `TabSilpa`, `TabKinerja`, `TabKinerjaSilpa` | `print:` 1× per file |

### 7.2 Pemanggil PDF/Blade

| Titik | File | Mekanisme |
|---|---|---|
| Pengaturan cetak RKAS | `Rkas/Summary.tsx` baris 189–220 (`handlePrint`) | `window.open(route(...export-pdf))` dengan param `paper_size`, `orientation`, `font_size`, `tahap`, `bulan`; ada 9 target route (`rkas.export-pdf`, `export-rekap-pdf`, `export-lembar-kerja-pdf`, `export-tahapan-v1-pdf`, `export-rincian-pdf`, `export-rp-pdf`, `export-alur-kas-pdf`, `export-bulanan-pdf`, + Excel) |
| Pengaturan cetak dokumen | `PrintSettingsModal` (9 halaman) | mengirim `PrintSettings` ke parent → `window.open` |
| Preview PDF | `PdfPreviewModal` (8 halaman: Kwitansi 4, TandaTerima 4) | iframe URL PDF + download |
| Rekapitulasi | `Penatausahaan/Rekapitulasi.tsx` | 10+ state `showPrint*Modal` (BKP Bank/Pembantu/Umum/Pajak/ROB/Reg/BA, Realisasi, BHP, BHM, Rek-Realisasi) |
| Laporan | 4 `components/*Tab.tsx` | modal cetak inline sendiri (bukan shared) |
| BAST/SuratPesanan | `ModalPrintSettings` lokal (duplikat) | parameter kertas + periode |
| SkSurat | `SkSurat/Show.tsx` baris 406 | link `route('sk-surat.dokumen.export-pdf')` + DOCX |
| DataMaster/RekeningBelanja | `RekeningBelanja/Index.tsx` | ekspor/impor template |

### 7.3 Layout PDF sesungguhnya ada di Blade, bukan TSX

- **160 file** `resources/views/**/*.blade.php` (termasuk `app.blade.php`, email, error). Mayoritas PDF/report: `resources/views/laporan/*` (±84 file, banyak fork varian `kinerja_*`, `silpa_*`, `kinerja_silpa_*`), `resources/views/pelengkap/*` (±35 file kwitansi/tanda-terima/BAST/SP), `resources/views/*_pdf.blade.php` (RKA/RKAS/Perubahan/Rekap), `resources/views/pdf/bku-audit-report.blade.php`.
- Artinya: **restyle TSX tidak mengubah PDF yang dihasilkan**. Yang harus dijaga adalah: (a) class `print:` di TSX, (b) nama route + nama/tipe parameter `paper_size`/`orientation`/`font_size`/`tahap`/`bulan`, (c) URL iframe `PdfPreviewModal`, (d) tombol/trigger tetap memanggil route yang sama.
- Default kertas yang dipakai UI: **F4/11pt (`PrintSettingsModal`)**, **A4/12pt (`Rkas/Summary`)**, **A4/11pt (Laporan)** — jangan diubah diam-diam saat redesign.

---

## 8. Komponen Shared & Dampak Restyle

| Kelompok restyle | Komponen | Halaman terdampak | Dampak / urutan aman |
|---|---|---|---|
| **Modal** | `Modal.tsx` | 54 halaman + Sidebar + Login | Restyle satu file = semua dialog berubah. Lakukan paling awal (Wave 0) dan uji 5 halaman pilot + modal path ARKAS di Sidebar + modal 2FA Login |
| **Tombol** | `PrimaryButton`, `SecondaryButton`, `DangerButton` | 46 / 43 / 24 halaman | perubahan global; pastikan state disabled/processing tetap terbaca |
| **Input** | `TextInput`, `InputLabel`, `InputError`, `SearchableSelect`, `DatePicker`, `CurrencyInput` | 39 / 37 / 23 / 10 / 16 / 1 | `DatePicker` menyeret `ui/button` + `ui/calendar`; `SearchableSelect` harus diselaraskan dengan `react-select` yang dipakai 13 halaman |
| **Print** | `PrintSettingsModal`, `PdfPreviewModal` | 9 / 8 halaman | aman di-restyle **asalkan props & route tetap**; jangan ubah tinggi iframe `h-[90vh]` tanpa uji |
| **Shell** | `Sidebar`, `Navbar`, `Toast`, `ChangelogModal`, `NotificationDropdown`, `CopilotDrawer` | 29 halaman (global) | sudah/menuju neo; **CopilotDrawer (876 baris) masih legacy berat** — perlu gelombang sendiri |
| **Neo primitif** | `StatCard`, `Bento/BentoCard`, `Bento/CalendarWidget`, `Bento/ArkasQuickSyncCard` | 1 halaman (Dashboard) | belum dipakai di halaman dalam → jadikan basis `StatCard`/`SectionCard` baru |
| **Tidak terpakai** | `Checkbox`, `NavLink`, `ResponsiveNavLink`, `ApplicationLogo`, `Rkas/RkasApprovalBanner`, `Rkas/RkasItemReviewModal`, `Rkas/RkasAiReviewModal` (0 halaman) + `Pages/Profile/Partials/DeleteUserForm.tsx` | 0 | ±960 baris dead code; aman dihapus/di-rewrite tanpa risiko regresi |

Prinsip: **jangan restyle 1 komponen shared + 1 halaman sekaligus**. Urutannya: primitif (Wave 0) → pilot (Wave 1) → gelombang per modul.

---

## 9. Rekomendasi Gelombang Pengerjaan (Wave 0–8)

Total target: **95 file halaman legacy** (di luar Dashboard yang sudah neo, 6 Auth, dan 1 Landing). Estimasi baris = baris file saat ini (bukan estimasi usaha).

| Wave | Isi | File | Baris | Risiko | Alasan |
|---|---|---:|---:|---|---|
| **0** | **Fondasi**: restyle **14 komponen shared** (`Modal`, 3 tombol, `TextInput`, `InputLabel`, `InputError`, `SearchableSelect`, `DatePicker`, `CurrencyInput`, `Dropdown`, `PrintSettingsModal`, `PdfPreviewModal`, `Toast`) + tambah primitif baru: `PageHeader`, `PageContainer`, `VariantTabs`, `DataTable`, `FilterBar`, `EmptyState`, `Pagination`, `SectionCard`/`StatCard` varian, `ConfirmDeleteModal`, `useToast` | 0 halaman (+14 Komponen, +±10 baru) | ±1.500 (komponen) | Sedang | Semua halaman memakai primitif ini; mengerjakan per halaman tanpa fondasi akan menggandakan pekerjaan. Uji di 3 halaman pilot sebelum lanjut |
| **1** | **Pilot CRUD & utilitas**: DataMaster (KodeKegiatan, RekeningBelanja, SekolahProfile, KopSuratBuilder), Integrasi (Api, Sync), Backup | **7** | 4.818 | Rendah | tabel+form+modal murni, tanpa print; paling aman untuk memvalidasi `DataTable`/`Modal`/`form` |
| **2** | **Dokumen SPJ** (duplikasi tertinggi): Kwitansi (Index+4 tab), TandaTerima (Index+4 tab), BAST (Index+5 modal), SuratPesanan (Index+5 modal) — sekaligus ekstrak `DocumentTable`, `VariantTabs`, `ConfirmDeleteModal`, `PrintSettingsModal` | **22** | 8.815 | Sedang | 12 file tab 94–96% identik + 2 list 72% identik; leverage terbesar. PDF lewat Blade, risiko visual rendah |
| **3** | **Laporan**: Index, TabReguler, Spmth/Sptj/Sp2b/Lph — sekaligus ekstrak `ReportTab`/`ReportTable` | **6** | 3.411 | Sedang | 4 tab laporan berpola sama; ada modal cetak inline yang harus disatukan |
| **4** | **RKAS Murni**: Penganggaran/Index, Rkas/Index, Rkas/Summary + 9 partial | **12** | 7.932 | **Tinggi** | alur inti + `print:` 8 file + PDF 9 route; kerjakan setelah primitif stabil. Pecah `Summary` (1.759) dan `TabRincianPencairan` (2.103) sebelum restyle |
| **5** | **RKAS Perubahan**: Index, Summary + 9 partial | **11** | 6.071 | **Tinggi** | idem + fork V1/V2; bisa paralel dengan Wave 4 hanya jika file terpisah (tidak ada) — sebaiknya berurutan |
| **6** | **SilpaRkas**: Index, Summary + 8 partial | **10** | 3.476 | Sedang-tinggi | varian ke-3 dengan pola sama; setelah Wave 4/5 berpengalaman |
| **7** | **Penatausahaan (risiko tertinggi)**: Index, Bku, Rekapitulasi, Sts/Index, Dokumen/Index+4 tab, 2 partial | **11** | 10.508 | **Sangat tinggi** | `Bku` 3.752 + `Rekapitulasi` 3.057 = 13% baris Pages; 12 tabel BKP, 10+ modal cetak, transaksi keuangan; butuh pemecahan file sebelum restyle |
| **8** | **Profil, SK Surat, ArkasTools**: Profile/Edit+6 partial, SkSurat Index/Show+5 modal, ArkasTools Index/ReferensiKode | **16** | 4.569 | Rendah-sedang | modul pendukung; bisa dikerjakan di sela-sela |
| **Luar scope** | `Auth/*` (6 halaman, 1.239 baris) + 7 komponen Auth + `Welcome` (81) + 18 komponen Landing + `Dashboard` (567) | 8 file halaman | 1.887 | — | Auth & Landing punya bahasa desain sendiri (`auth-*`, Landing) dan **tidak** perlu dipaksa neo-bento; Dashboard sudah selesai |

**Total Wave 1–8 = 95 file** (7+22+6+12+11+10+11+16). Rekomendasi eksekusi berurutan 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8. Jika tenggat mendesak dan ingin nilai bisnis lebih cepat: tukar Wave 7 (Penatausahaan) ke posisi 4 dan tunda Wave 4–6, karena BKU/Rekapitulasi adalah layar harian bendahara — tetapi risikonya paling besar.

---

## 10. Temuan Paling Mengejutkan / Berisiko

1. **Hanya 1 halaman neo-bento dari 103.** `Dashboard.tsx` (+ shell) selesai, tetapi 95 file isi masih legacy dengan **3 palet aksen berbeda**: indigo (59), blue (18), purple (7). Restyle harus "sapu warna", bukan hanya ganti kelas kartu.
2. **Duplikasi masif tapi divergen.** 4 tab Kwitansi ±906 baris (95,9% identik antar-varian) dan 4 tab TandaTerima ±804 baris (94,8%) — potensi ±5.000 baris duplikat. Namun partial RKAS antar-varian sudah **berbeda logika** (2.103 vs 1.059 baris), jadi refactor harus berbasis props, bukan copy-paste.
3. **±960 baris dead code UI**: `Checkbox`, `NavLink`, `ResponsiveNavLink`, `ApplicationLogo` (78 baris), tiga komponen Rkas (`RkasApprovalBanner`, `RkasItemReviewModal`, `RkasAiReviewModal` — 764 baris), dan `Profile/Partials/DeleteUserForm.tsx` (121 baris) **tidak diimpor halaman mana pun**. Ini kandidat hapus, bukan kandidat restyle.
4. **Tiga pola modal pengaturan cetak** hidup berdampingan: shared `PrintSettingsModal` (9 halaman), salinan identik BAST/SP (74 baris ×2), dan blok inline di `Rkas/Summary` (baris 293–420). Menyeragamkannya wajib masuk Wave 0/2.
5. **`Sidebar` neo masih memakai primitif legacy** (`Modal`, `TextInput`, `PrimaryButton`, `alert()` di baris 68/71/74). Restyle primitif akan otomatis mengubah modal path ARKAS di sidebar — harus diuji manual, jangan diasumsikan "shell sudah aman".
6. **Import mati `AuthenticatedLayout`** di 4 tab TandaTerima (file 804–806 baris) — indikasi copy-paste; layak dibersihkan sebelum restyle.
7. **Dua design system paralel**: shadcn `ui/button` + `ui/calendar` (274 baris) hanya hidup lewat `DatePicker`; sementara 13 halaman memakai `react-select` dan 4 memakai `react-datepicker` — UI select/date tidak konsisten dan akan terlihat jelas setelah reskin.
8. **Risiko cetak**: 28 file memakai `print:` dan 19 file memicu PDF via `window.open`; PDF asli ada di **160 Blade**. Jangan ubah class `print:`, nama route, atau parameter `paper_size`/`orientation`/`font_size`/`tahap`/`bulan` tanpa uji cetak F4 & A4.
9. **Konsentrasi risiko**: `Bku.tsx` (3.752 baris) + `Rekapitulasi.tsx` (3.057 baris) = **13%** dari seluruh baris Pages. Keduanya memuat alur keuangan yang tidak boleh berubah perilaku → pecah file dulu (ekstrak `BkuFormModal`, `BkuTable`, `BkpReportPanel`) baru restyle.
10. **CopilotDrawer (876 baris) masih legacy berat** padahal navbar/sidebar sudah neo — panel AI global ini akan menjadi "pulau lama" paling terlihat setelah halaman dalam di-restyle; butuh slot pengerjaan sendiri.

---

## 11. Lampiran

### 11.1 12 file terbesar (prioritas pemecahan sebelum restyle)

| Baris | File |
|---:|---|
| 3.752 | `Penatausahaan/Bku.tsx` |
| 3.057 | `Penatausahaan/Rekapitulasi.tsx` |
| 2.103 | `Penganggaran/Rkas/Partials/TabRincianPencairan.tsx` |
| 1.759 | `Penganggaran/Rkas/Summary.tsx` |
| 1.640 | `Penganggaran/RkasPerubahan/Summary.tsx` |
| 1.618 | `DataMaster/SekolahProfile/Partials/KopSuratBuilder.tsx` |
| 1.578 | `Penganggaran/Rkas/Index.tsx` |
| 1.392 | `Penganggaran/RkasPerubahan/Index.tsx` |
| 1.245 | `Penganggaran/SilpaRkas/Index.tsx` |
| 1.059 | `Penganggaran/RkasPerubahan/Partials/TabRincianPerubahan.tsx` |
| 907 | `FiturPelengkap/Kwitansi/TabReguler.tsx` |
| 906 | `FiturPelengkap/Kwitansi/TabKinerja.tsx` (dan 4 file tab Kwitansi/TandaTerima lain) |

### 11.2 Catatan teknis untuk pelaksana

- Utilitas neo yang sudah tersedia di `resources/css/app.css` baris 452–551: `.bento-surface`, `.bento-tab`, `.bento-tab-active`, `.bento-tab-inactive`, `.bento-table-wrapper` (+ varian dark). Belum ada `PageHeader`, `DataTable`, `FilterBar`, `EmptyState`, `Pagination` — perlu dibuat di Wave 0.
- Token warna resmi: violet `#7C5CFF` (`brand-500`), kanvas `#F6F8FC` / dark `#0B0A12`, kartu `#151324`, gold `#E8C87D`; radius kartu `1.75rem`; font `Figtree` + `font-display` Fraunces.
- Primitif animasi siap pakai: `Components/Landing/ui/TiltCard`, `Reveal`, `MagneticButton`, `Counter`; hook `Hooks/useReducedMotion.ts`, `useReveal.ts`, `useCountUp.ts` — semua sudah menghormati `prefers-reduced-motion`.
- Pola route varian: selalu lewat `useVariantRoute()` + `usePage().props.routePrefix`; jangan hardcode route varian saat restyle (Kwitansi, TandaTerima, BAST, SP, Laporan, Dokumen, RKAS×3).
- Tidak ada `framer-motion` di `package.json`; animasi memakai CSS transition/keyframes + hook lokal.
- `react-select` (13 halaman) dan `react-datepicker` (4 halaman) adalah dependensi eksternal — restyle harus lewat CSS variable/class pembungkus, bukan mengubah library.

*Laporan dibuat tanpa mengubah source. Verifikasi dilakukan dengan pembacaan file, `grep`-style counting, hash MD5, dan perbandingan baris (`Compare-Object`), bukan `npm build`/`tsc`.*
