# Desain Redesign UI Neo-Bento Halaman Pengaturan Profil

**Tanggal:** 2026-11-20  
**Status:** Disetujui untuk peninjauan spec  
**Ruang Lingkup:**
- Komponen baru:
  - `resources/js/Pages/Profile/Partials/ProfileHeroCard.tsx`
  - `resources/js/Pages/Profile/Partials/ProfileUiPrimitives.tsx`
- Pembaruan halaman & partials:
  - `resources/js/Pages/Profile/Edit.tsx`
  - `resources/js/Pages/Profile/Partials/UpdateProfileInformationForm.tsx`
  - `resources/js/Pages/Profile/Partials/UpdatePasswordForm.tsx`
  - `resources/js/Pages/Profile/Partials/DeepSeekApiForm.tsx`
  - `resources/js/Pages/Profile/Partials/SecurityCodeForm.tsx`
  - `resources/js/Pages/Profile/Partials/DeleteUserForm.tsx`

---

## 1. Latar Belakang & Masalah

Halaman **Pengaturan Profil** (`Profile/Edit.tsx` dan seluruh partial-nya) sudah memakai beberapa komponen dasar (`Surface`, `IconTile`, `PageHeader`), namun tampilannya belum mencapai kualitas estetika dan konsistensi **SIKAS Neo-Bento Full-Color** (seperti `ManagementRole/Index.tsx` dan `Dashboard.tsx`):

1. **Proporsi layout tidak seimbang:** `Edit.tsx` membatasi isi kartu dengan `max-w-xl`, `max-w-4xl`, dan `max-w-3xl` di dalam kartu `<Surface>` lebar, meninggalkan ruang kosong besar di sisi kanan kartu dan menyebabkan perbedaan tinggi mencolok antara kartu Biodata dan Kata Sandi.
2. **Belum ada Hero Identitas & ringkasan status:** Pengguna tidak langsung melihat identitas akun (avatar inisial bergradien, role, sekolah aktif) maupun ringkasan status kunci AI DeepSeek dan keamanan 2FA secara sekilas.
3. **Interaksi & standar modal belum seragam:**
   - `UpdatePasswordForm.tsx` tidak memiliki tombol toggle lihat/sembunyikan kata sandi maupun indikator kekuatan & kecocokan kata sandi.
   - `DeepSeekApiForm.tsx` masih menggunakan `confirm()` bawaan browser saat menghapus API Key, belum menampilkan badge status ketika kunci belum diatur, dan memakai `<select>` standar untuk masing-masing 2 pilihan model.
   - `SecurityCodeForm.tsx` memiliki import tidak terpakai (`InputLabel`, `useForm`), tidak menampilkan pesan error UI saat request gagal, dan modal generate kode belum memiliki *ambient glow*, tombol tutup `X`, serta tombol **Salin Kode 1-Klik**.
   - `DeleteUserForm.tsx` memakai `id="password"` yang bentrok dengan `UpdatePasswordForm`, dan modalnya belum memiliki *ambient glow* serta tombol tutup `X`.

---

## 2. Keputusan Desain (Hasil Wawancara)

1. **Struktur Tata Letak:** **Hero Profil Bento** di baris teratas + **Grid Bento 12-Kolom Asimetris** (semua bagian langsung terlihat seimbang di satu halaman tanpa tab).
2. **Penanganan `DeleteUserForm.tsx`:** Tetap **tidak dirender** di `Edit.tsx` (mengikuti `ProfileController.php` yang menonaktifkan fitur hapus akun), namun tetap diperbarui desain Neo-Bento dan diperbaiki konflik ID-nya agar konsisten.
3. **Paket UX Neo-Bento (tanpa mengubah backend/route):**
   - Toggle lihat/sembunyikan kata sandi + *password strength meter* 4-segmen & indikator kecocokan pada `UpdatePasswordForm`.
   - Kartu pilihan model visual Neo-Bento (masing-masing 2 kartu opsi untuk Penalaran R1 dan Interaktif V3) + **Modal Konfirmasi Hapus Kunci API Neo-Bento** pengganti `confirm()` pada `DeepSeekApiForm`.
   - Tombol **Salin Kode 1-Klik** (`Tersalin!`), feedback error inline, dan modal Neo-Bento ber-glow dengan tombol tutup `X` pada `SecurityCodeForm`.

---

## 3. Arsitektur & Detail Komponen

### 3.1 Primitive Bersama: `resources/js/Pages/Profile/Partials/ProfileUiPrimitives.tsx`

Mengekspor 3 komponen presentasional ringan untuk mencegah duplikasi antar partial:

1. **`ProfileCardShell`**:
   - Props: `tone: 'violet' | 'sky' | 'mint' | 'rose'`, `icon: ReactNode`, `title: string`, `subtitle: string`, `badge?: ReactNode`, `children: ReactNode`, `className?: string`.
   - Merender `<section>` penuh tinggi (`relative flex h-full flex-col overflow-hidden rounded-[26px] border border-white bg-white shadow-card dark:border-white/10 dark:bg-[#15131F] dark:shadow-card-dark`) dengan *ambient blur glow* lembut di pojok kanan atas sesuai `tone`.
   - Header internal konsisten (`IconTile size="lg"`, judul `14px font-extrabold`, subtitle `10.5px`, dan slot `badge` di kanan) dipisahkan garis halus `border-b border-slate-100 dark:border-white/5`, diikuti body `flex flex-1 flex-col p-5 sm:p-6`.

2. **`ProfilePasswordInput`**:
   - Props: `id: string`, `value: string`, `onChange: (value: string) => void`, `placeholder?: string`, `autoComplete?: string`, `isFocused?: boolean`, `disabled?: boolean`, `name?: string`, `inputRef?: RefObject<HTMLInputElement>`, `icon?: 'lock' | 'key'`.
   - Merender `TextInput` dengan ikon kiri (`pl-10 pr-10`) dan tombol toggle `Eye` / `EyeOff` bertipe `button` dengan `aria-label` dinamis (`"Tampilkan kata sandi"` / `"Sembunyikan kata sandi"`).

3. **`ProfileSavedPill`**:
   - Props: `show: boolean`, `label?: string` (default `'Berhasil Disimpan!'`).
   - Merender `<Transition>` dengan pill `bg-pastel-mint text-emerald-700 dark:bg-mint/10 dark:text-emerald-300` beserta ikon `CheckCircle2`.

### 3.2 Hero Profil Bento: `resources/js/Pages/Profile/Partials/ProfileHeroCard.tsx`

- Props:
  - `user: User`
  - `sekolah?: SharedSekolah | null`
  - `hasDeepSeekKey: boolean`
  - `isSecurityCodeEnabled: boolean`
  - `mustVerifyEmail: boolean`
- Tampilan:
  - Kartu Neo-Bento (`sikas-card relative overflow-hidden p-5 sm:p-6`) dengan dua *ambient aurora glow* lembut (`violet` di kiri atas, `lime` di kanan bawah).
  - **Sisi kiri (Identitas Pengguna):**
    - Avatar inisial 2 huruf (`64×64px`, `rounded-[22px]`) dengan gradien warna kontekstual sesuai role (Bendahara: violet-indigo; Kepala Sekolah: sky-cyan; role lain: lime-emerald) + titik indikator aktif hijau di sudut kanan bawah.
    - Nama lengkap (`text-[18px] sm:text-[20px] font-extrabold`), badge role (`StatusBadge tone="violet"`), daftar meta inline (`@username`, alamat email, dan jika `sekolah?.nama_sekolah` tersedia: badge sekolah + NPSN `text-sikas-num`).
  - **Sisi kanan (3 Mini Bento Status Cards, `grid-cols-1 sm:grid-cols-3 gap-2.5`):**
    1. **Status Akun:** Jika `mustVerifyEmail && !user.email_verified_at` tampil `Perlu Verifikasi` (`amber`), selain itu `Aktif & Terverifikasi` (`mint`).
    2. **AI DeepSeek:** `Terpasang` (`violet`/`mint`) jika `hasDeepSeekKey`, atau `Belum Diatur` (`amber`) jika belum.
    3. **Keamanan 2FA:** `Aktif` (`mint`) jika `isSecurityCodeEnabled`, atau `Nonaktif` (`slate`) jika belum — sinkron real-time dengan toggle di `SecurityCodeForm`.

### 3.3 Halaman Utama: `resources/js/Pages/Profile/Edit.tsx`

- Menerima `PageProps<{ mustVerifyEmail: boolean; status?: string; hasDeepSeekKey?: boolean }>`.
- Menyimpan state sinkron `securityEnabled` (diinisialisasi dari `Boolean(auth.user.is_security_code_enabled)` dan disinkronkan via `useEffect` bila props berubah) untuk diteruskan ke `ProfileHeroCard` dan callback `onStatusChange` pada `SecurityCodeForm`.
- Susunan grid:
  1. `PageHeader` (breadcrumb `Dashboard › Pengaturan › Profil Pengguna`, ikon `ShieldCheck`, badge `Akun`).
  2. `ProfileHeroCard` (`animate-rise`, delay `40ms`).
  3. **Baris 2 (`grid grid-cols-1 gap-4 xl:grid-cols-12 items-stretch`):**
     - `xl:col-span-7`: `UpdateProfileInformationForm` (delay `90ms`, mengisi penuh lebar & tinggi kartu).
     - `xl:col-span-5`: `UpdatePasswordForm` (delay `130ms`, mengisi penuh lebar & tinggi kartu).
  4. **Baris 3 (`grid grid-cols-1 gap-4 xl:grid-cols-12 items-stretch`):**
     - `xl:col-span-7`: `DeepSeekApiForm` (delay `170ms`, mengisi penuh lebar & tinggi kartu).
     - `xl:col-span-5`: `SecurityCodeForm` (delay `210ms`, mengisi penuh lebar & tinggi kartu).
- `DeleteUserForm` tetap tidak dirender di `Edit.tsx`.

### 3.4 Penyempurnaan Masing-Masing Partial

1. **`UpdateProfileInformationForm.tsx`**:
   - Dibungkus `ProfileCardShell` (`tone="violet"`, `icon={<User />}`).
   - Menghapus pembatasan lebar `max-w-xl`; form memakai `flex flex-1 flex-col justify-between gap-5` sehingga footer tombol simpan sejajar di dasar kartu.
   - Grid 2 kolom (`Nama Lengkap` + `Username`), diikuti `Email` penuh, strip informasi ringkas peran & status verifikasi akun, banner verifikasi email (bila `mustVerifyEmail && user.email_verified_at === null`), serta footer dengan `PrimaryButton` dan `ProfileSavedPill`.
   - Tidak mengubah route `profile.update` maupun `verification.send`.

2. **`UpdatePasswordForm.tsx`**:
   - Dibungkus `ProfileCardShell` (`tone="sky"`, `icon={<Lock />}`).
   - Memakai `ProfilePasswordInput` untuk `current_password` (`icon="key"`), `password` (`icon="lock"`), dan `password_confirmation` (`icon="lock"`).
   - Menambahkan **Password Strength Meter** 4-segmen ketika `data.password.length > 0` (skor berdasarkan panjang `>= 8`, campuran huruf besar/kecil, angka, simbol) dengan label berwarna (`Lemah` rose, `Cukup` amber, `Kuat` sky, `Sangat Kuat` mint).
   - Menambahkan indikator kecocokan inline saat `data.password_confirmation.length > 0` (`Kata sandi cocok` mint / `Konfirmasi belum sesuai` rose).
   - Footer menempel bawah dengan `PrimaryButton` dan `ProfileSavedPill`. Tidak mengubah route `password.update`.

3. **`DeepSeekApiForm.tsx`**:
   - Dibungkus `ProfileCardShell` (`tone="violet"`, `icon={<Brain />}`), badge header selalu tampil (`Kunci API Terpasang & Aktif` tone `success`, atau `Belum Diatur` tone `warning`).
   - Input API Key dengan ikon `Key`, toggle `Eye`/`EyeOff` aksesibel (`aria-label`), dan tautan pill ke `https://platform.deepseek.com/api_keys`.
   - Mengganti kedua `<select>` model menjadi **Kartu Pilihan Model Visual Neo-Bento** (`role="radiogroup"` dengan tombol `role="radio"` dan `aria-checked`):
     - **Model Penalaran (Pra-Audit / R1):** pilihan `deepseek-reasoner` (*R1 — Audit Forensik & Penalaran Mendalam*) vs `deepseek-chat` (*V3 — Mode Cepat*).
     - **Model Interaktif (Copilot / V3):** pilihan `deepseek-chat` (*V3 — Default Cepat & Hemat*) vs `deepseek-reasoner` (*R1 — Penalaran Mendalam*).
     - Kartu aktif memakai border & latar kontekstual (`border-lime-400 bg-lime-50/70 dark:border-lime-400/50 dark:bg-lime-400/10`) dengan badge centang `CheckCircle2`.
   - Mengganti `confirm()` bawaan browser pada aksi hapus kunci dengan **Modal Konfirmasi Hapus Kunci API Neo-Bento** (`maxWidth="md"`, `rounded-[26px]`, ambient glow `rose`, `IconTile tone="rose"`, tombol tutup `X`, tombol `Batal` & `DangerButton` `Ya, Hapus Kunci`).
   - Tidak mengubah route `profile.deepseek-settings` maupun `profile.deepseek-test`.

4. **`SecurityCodeForm.tsx`**:
   - Menghapus unused imports (`InputLabel`, `useForm`).
   - Menambahkan prop opsional `onStatusChange?: (enabled: boolean) => void` untuk sinkronisasi real-time dengan `ProfileHeroCard`.
   - Dibungkus `ProfileCardShell` (`tone="mint"`, `icon={<Shield />}`), dengan badge status dinamis (`2FA Aktif` tone `success` / `Nonaktif` tone `neutral`).
   - Panel status + sliding toggle switch lime yang bersih, disertai banner error inline jika request `toggle-security` atau `generate-security-code` gagal.
   - Panel ringkas panduan + tombol `Generate Kode Baru` (saat `isEnabled === true`, atau kotak informasi langkah aktivasi singkat saat `isEnabled === false` agar kartu kanan seimbang tingginya dengan kartu DeepSeek di kiri).
   - **Modal Generate Kode Neo-Bento** (`maxWidth="md"`): wrapper `relative overflow-hidden rounded-[26px]`, ambient blur glow `violet`, tombol tutup `X`, tampilan kode 6-digit berbingkai pastel lavender dengan `tracking-[0.22em]`, dan tombol **Salin Kode** 1-klik (`navigator.clipboard.writeText`) dengan feedback sementara `Tersalin!` (2 detik).
   - Tidak mengubah route `profile.toggle-security` maupun `profile.generate-security-code`.

5. **`DeleteUserForm.tsx`**:
   - Tetap tidak dirender di `Edit.tsx`.
   - Diperbarui memakai `ProfileCardShell` (`tone="rose"`, `icon={<AlertTriangle />}`), `ProfilePasswordInput` dengan `id="delete_account_password"` (menghindari bentrok ID dengan `UpdatePasswordForm`), serta modal konfirmasi Neo-Bento dengan *ambient blur glow* `rose` dan tombol tutup `X`.
   - Tidak mengubah route `profile.destroy`.

---

## 4. Cakupan & Keamanan

- Tidak mengubah controller PHP, request validation, migration, maupun route Laravel mana pun.
- Menjaga penuh kontrak props & payload Inertia/Axios untuk seluruh fitur profil (update biodata, resend verifikasi, ganti password, simpan/uji/hapus kunci DeepSeek, toggle & generate security code).

---

## 5. Rencana Verifikasi

1. Jalankan `npm run build` (`tsc && vite build`) dan pastikan lulus dengan exit code `0`.
2. Lakukan peninjauan dua sumbu (`/code-review`: **Standards** & **Spec**) terhadap seluruh file yang dibuat/diubah.
3. Periksa keterbacaan & keserasian visual pada dark mode dan light mode serta responsivitas mobile (`< 1024px`) dan desktop (`>= 1024px`, `zoom: 0.8`).
