# Spesifikasi Desain: Penyerasian UI Halaman Auth SIKAS dengan Tema Welcome (Midnight Teal & Mint Aqua + Anime.js)

**Tanggal:** 2026-11-17  
**Target File Utama:**
- `resources/css/app.css` (`.auth-shell` tokens & utilities)
- `resources/js/Layouts/GuestLayout.tsx`
- `resources/js/Components/Auth/*` (`AuthWordmark.tsx`, `AuthHeading.tsx`, `AuthField.tsx`, `AuthButton.tsx`, `AuthCheckbox.tsx`, `AuthLockedState.tsx`)
- `resources/js/Pages/Auth/Login.tsx`, `Register.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx`, `ConfirmPassword.tsx`

---

## 1. Tujuan & Konteks

Menyerasikan seluruh halaman autentikasi (`Login`, `Register`, `ForgotPassword`, `ResetPassword`, `ConfirmPassword`) agar memiliki bahasa visual, palet warna, tipografi, dan nuansa animasi yang menyatu dengan halaman `Welcome.tsx` (tema **Deep Midnight Teal & Mint Aqua** bergaya Novara).

Seluruh logika form, validasi, 2FA security modal (`Login.tsx`), state terkunci `isLocked` (`Register.tsx`), alur 4 langkah OTP (`ForgotPassword.tsx`), serta aksesibilitas `aria-*` dan `prefers-reduced-motion` dipertahankan 100%.

---

## 2. Sistem Desain & Token Warna (`.auth-shell` di `resources/css/app.css`)

- **Zona Panel Kiri (Scenic Midnight Teal):**
  - Latar dasar: `#051821` dengan foto pegunungan `/images/landing/hero-mountain.jpg` dan gradasi gelap `#04141C` → `#07222D` + pendar *aurora mint* `rgba(139, 230, 220, 0.18)`.
  - Teks utama: `#FFFFFF`, aksen highlight: `#8BE6DC` (`#9DF0E7`).
  - Kartu Pratinjau Glassmorphism di panel kiri: `bg-white/[0.08]`, `backdrop-blur-2xl`, border `border-white/20` berisi mini grafik kurva SVG BOSP + 3 chip status (`RKAS Terstruktur`, `BKU Seimbang`, `Siap Audit`).
- **Zona Panel Kanan (Ice-White Clean Form Surface):**
  - Latar kanvas kanan: `#F8FBFB` (dengan pola titik tipis teal `#14535E` opacity rendah & pendar mint halus di belakang kartu).
  - Kartu Formulir: `#FFFFFF` dengan border `#D5EAEA` dan bayangan lembut `0 28px 65px -32px rgba(8, 34, 43, 0.18)`.
  - Teks utama: `#08222B`, teks sekunder/label: `#45636D`, teks muted: `#5A7882`.
- **Komponen Input, Link & Tombol:**
  - **Input (`AuthField.tsx`):** Latar `#F8FBFB` (focus: `#FFFFFF`), border normal `#CBE2E2` (hover `#98CBCB`), border focus `#146670` dengan ring fokus `rgba(139, 230, 220, 0.35)`. Autofill diarahkan ke `#F8FBFB` dengan teks `#08222B`.
  - **Tombol Utama (`AuthButton.tsx`):** Gradasi **Mint Aqua** (`from-[#8BE6DC] via-[#9DF0E7] to-[#7CDAD0]`), teks bold `#06222B`, bayangan pendar mint lembut, kilau *shimmer* saat hover, serta efek *spring* halus.
  - **Checkbox (`AuthCheckbox.tsx`):** Saat dicentang berwarna `#0F525C` / `#146670` dengan centang putih/mint.
  - **Tautan & Aksen (`AuthHeading.tsx` & link halaman):** Teks aksen `#146670`, garis bawah gelombang `AuthAccent` berwarna `#5CCAC0` / `#8BE6DC`, link `#0F5C66` (hover `#08222B`).
  - **Logo (`AuthWordmark.tsx`):** Menggunakan aset resmi `/images/landing/large.ico` secara langsung tanpa kotak pembungkus, dilengkapi teks **SIKAS** dan sub-label `SISTEM ANGGARAN SEKOLAH`.

---

## 3. Penyesuaian Per Halaman

1. **`GuestLayout.tsx`**:
   - Membingkai layout 2 kolom (`lg:grid-cols-[1.06fr_0.94fr]`): panel kiri *Dark Midnight Teal* berlatar gunung + kartu kaca ringkasan SIKAS + tautan kembali ke Beranda (`/`), dan panel kanan *Ice-White* `#F8FBFB` dengan kartu formulir putih bersih + logo mobile + footer ringkas.
   - Animasi masuk terkoordinasi dengan `animejs` (`createTimeline`, `stagger`, kurva SVG `svg.createDrawable`) dan menghormati `prefers-reduced-motion`.
2. **`Login.tsx`**:
   - Mengganti seluruh aksen ungu/krem (`#6D4DE0`, `#5B3DF5`, `#F1E9FF`, `#FFFDF8`, `#221C33`) pada toggle password, link *Lupa password?*, banner status, ikon perisai, dan **Modal Verifikasi Keamanan 2FA** ke palet **Deep Teal & Mint Aqua** (`#08222B`, `#146670`, `#EAF4F4`, `#8BE6DC`).
3. **`Register.tsx`**:
   - Menyerasikan indikator kekuatan password (*weak/medium/strong*), toggle password, tautan *Masuk*, dan tampilan `isLocked` (`AuthLockedState.tsx`) ke palet Teal & Mint Aqua.
4. **`ForgotPassword.tsx`**:
   - Menyerasikan stepper 3 langkah (`01 Email` → `02 OTP` → `03 Sandi`), banner pesan OTP, tombol aksi, dan layar sukses langkah 4 ke palet Teal & Mint Aqua.
5. **`ResetPassword.tsx` & `ConfirmPassword.tsx`**:
   - Menyerasikan styling input `readOnly` email, tombol toggle mata, link kembali ke halaman masuk, dan badge keamanan bawah ke palet Teal & Mint Aqua.

---

## 4. Kriteria Keberhasilan

1. `npm run build` (`tsc && vite build`) lulus 100% tanpa error TypeScript maupun warning CSS/Vite.
2. Seluruh kelas warna lama ungu/krem (`#6D4DE0`, `#5B3DF5`, `#4A2FB0`, `#E5DBFF`, `#FBF5E9`, `#FFFDF8`, `#221C33`) tidak lagi tersisa di `Layouts/GuestLayout.tsx`, `Components/Auth/*`, maupun `Pages/Auth/*`.
3. Seluruh pengujian backend/fitur auth (`php artisan test --filter=Auth`) tetap lulus 100%.
