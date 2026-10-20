# Rencana Implementasi: Kontrol Jendela (Maximize & Minimize) dan Integrasi Icon Navbar SIKAS AI Copilot

Dokumen ini adalah rencana implementasi langkah demi langkah untuk mengintegrasikan kontrol jendela (Maximize & Minimize) dan icon chat pada Navbar SIKAS AI Copilot sesuai spesifikasi pada [2026-10-20-copilot-window-controls-and-navbar-icon-design.md](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-10-20-copilot-window-controls-and-navbar-icon-design.md).

---

## Task 1: Update State Terpusat di `AuthenticatedLayout.tsx`
- **File:** `resources/js/Layouts/AuthenticatedLayout.tsx`
- **Tindakan:**
  1. Definisikan tipe `CopilotWindowState = 'closed' | 'normal' | 'minimized' | 'maximized'`.
  2. Tambahkan state `const [copilotState, setCopilotState] = useState<CopilotWindowState>('closed');`.
  3. Teruskan `copilotState` dan `setCopilotState` ke komponen `<Navbar />` dan `<CopilotDrawer />`.
- **Verifikasi:** Pastikan tidak ada type error saat passing props.

---

## Task 2: Tambahkan Tombol Chat SIKAS AI di `Navbar.tsx`
- **File:** `resources/js/Components/Navbar.tsx`
- **Tindakan:**
  1. Perbarui `interface NavbarProps` untuk menerima:
     - `copilotState?: 'closed' | 'normal' | 'minimized' | 'maximized'`
     - `setCopilotState?: (state: 'closed' | 'normal' | 'minimized' | 'maximized') => void`
  2. Import icon `Sparkles` atau `Bot` dari `lucide-react`.
  3. Tambahkan tombol AI Copilot di jajaran tombol cepat kanan (sebelum atau di samping `NotificationDropdown`):
     - Tampilan tombol: Rounded button dengan aksen gradient ungu-indigo.
     - Indikator aktif: Jika `copilotState !== 'closed'`, tampilkan efek highlight/ring dan titik pulsing hijau.
     - Tooltip dinamis: "Tutup SIKAS AI Copilot" vs "Buka SIKAS AI Copilot".
  4. Handler klik:
     - Jika `closed` atau `minimized` -> ubah ke `'normal'`.
     - Jika `normal` atau `maximized` -> ubah ke `'closed'`.
- **Verifikasi:** Uji klik tombol Navbar untuk membuka dan menutup chat.

---

## Task 3: Modifikasi Tampilan & Kontrol Jendela di `CopilotDrawer.tsx`
- **File:** `resources/js/Components/Ai/CopilotDrawer.tsx`
- **Tindakan:**
  1. Perbarui `CopilotDrawerProps` agar menerima `copilotState` dan `setCopilotState`.
  2. Hapus elemen Floating Action Button (FAB) bulat di pojok kanan bawah (`!isOpen && (...)`).
  3. Sesuaikan pembungkus utama panel berdasarkan `copilotState`:
     - `'closed'`: return `null` (tidak merender panel).
     - `'minimized'`: `fixed bottom-4 right-4 z-50 w-80 h-14 rounded-2xl shadow-xl overflow-hidden`.
     - `'normal'`: `fixed bottom-4 right-4 z-50 w-full sm:w-[480px] h-[640px] max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden`.
     - `'maximized'`: `fixed inset-2 md:inset-4 z-50 w-auto h-auto rounded-2xl shadow-2xl overflow-hidden`.
  4. Perbarui tombol kontrol pada header:
     - **Minimize:** Mengubah state ke `'minimized'` (jika sedang normal/maximized) atau me-restore ke `'normal'` (jika sedang minimized).
     - **Maximize / Restore:**
       - Jika `normal` -> klik maximize mengubah state ke `'maximized'` (icon `Maximize2`).
       - Jika `maximized` -> klik restore mengubah state ke `'normal'` (icon `Minimize2`).
     - **Close (`X`):** Mengubah state ke `'closed'`.
  5. Pastikan area chat, input box, dan tabel di mode `maximized` melebar dengan optimal dan memiliki padding yang proporsional.
- **Verifikasi:** Uji mode normal, minimize, maximize, dan close.

---

## Task 4: Kompilasi TypeScript & Vite Build
- **Tindakan:**
  Jalankan `npm run build` untuk memverifikasi bahwa TypeScript compiler (`tsc`) dan bundling Vite berjalan lancar tanpa error type atau styling.

---

## Task 5: Git Commit
- **Tindakan:**
  Lakukan git commit: `feat(ai-copilot): add maximize minimize window controls and navbar chat icon`.
