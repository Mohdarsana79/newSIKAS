# Implementation Plan: Penggantian Icon SIKAS AI Copilot Navbar Menjadi Icon Chat

- **Tanggal**: 23 Oktober 2026
- **Target File**: [Navbar.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Components/Navbar.tsx)
- **Status**: Menunggu Review & Persetujuan Pengguna

---

## 1. Masalah & Kebutuhan Pengguna
- **Kebutuhan**: Tombol pembuka SIKAS AI Copilot pada Navbar saat ini menggunakan icon AI (`Sparkles` ✨ dari paket `lucide-react`).
- **Permintaan Pengguna**: Mengganti icon tersebut dengan **icon chat** (percakapan/pesan) agar representasi tombol lebih intuitif sebagai asisten obrolan / percakapan interaktif.
- **Aturan**:
  1. Tidak melakukan eksekusi kode sebelum disetujui pengguna.
  2. Menjaga fungsi tombol, animasi ping status aktif, styling warna ungu-indigo dan dark mode yang sudah berjalan dengan baik.

---

## 2. Pilihan Icon Chat dari `lucide-react`

Paket `lucide-react` yang terpasang pada proyek (`^0.562.0`) menyediakan beberapa icon chat berkualitas tinggi:

1. **`MessageSquare` (Rekomendasi)**:
   - Tipe: Kotak percakapan (*chat bubble*) dengan sudut rounded halus dan ekor dialog di kiri bawah.
   - Karakter: Sangat konsisten dengan desain modern admin dashboard / shadcn UI, tegas dan mudah dikenali sebagai menu chat.
2. **`MessageCircle`**:
   - Tipe: Gelembung percakapan bulat (*circular chat bubble*).
   - Karakter: Bergaya ramah, mirip ikon perpesanan mobile / messenger.
3. **`MessagesSquare`**:
   - Tipe: Dua gelembung chat bertumpuk (dialog interaktif).

---

## 3. Rencana Perubahan Kode

### File: `resources/js/Components/Navbar.tsx`

#### A. Pembaruan Import (Baris 6)
**Sebelum:**
```tsx
import { Sparkles } from 'lucide-react';
```
**Sesudah (Opsi Rekomendasi `MessageSquare`):**
```tsx
import { MessageSquare } from 'lucide-react';
```
*(Atau `MessageCircle` sesuai preferensi pengguna)*

#### B. Pembaruan Elemen Icon (Baris 69)
**Sebelum:**
```tsx
<Sparkles className={`w-4.5 h-4.5 ${copilotState !== 'closed' ? 'text-purple-100' : 'text-purple-600 dark:text-purple-400'}`} />
```
**Sesudah:**
```tsx
<MessageSquare className={`w-4.5 h-4.5 ${copilotState !== 'closed' ? 'text-purple-100' : 'text-purple-600 dark:text-purple-400'}`} />
```

Semua properti lainnya (ukuran `w-4.5 h-4.5`, pewarnaan dinamis ketika aktif / tidak aktif, badge dot indikator hijau saat terbuka / ungu saat tertutup, dan logika toggle window `setCopilotState`) **tetap dipertahankan 100% tanpa perubahan**.

---

## 4. Verifikasi Pasca Eksekusi
Setelah disetujui dan diterapkan:
1. Menjalankan `npx tsc --noEmit` untuk memastikan tidak ada kesalahan tipe TypeScript.
2. Menjalankan `npm run build` untuk memvalidasi kompilasi aset frontend.
