# Desain Spesifikasi: Kontrol Jendela (Maximize & Minimize) dan Integrasi Icon Navbar SIKAS AI Copilot

## 1. Konteks & Latar Belakang
Pada sistem SIKAS, asisten cerdas **SIKAS AI Copilot** sebelumnya dibuka melalui sebuah tombol floating bulat (*Floating Action Button / FAB*) yang melayang di pojok kanan bawah layar. Panel chat memiliki ukuran tetap (lebar 440px dan tinggi 620px), dengan tombol minimize sederhana yang hanya mengecilkan tinggi panel.

Terdapat kebutuhan peningkatan pengalaman pengguna (UX):
1. **Layar Penuh (Maximize):** Respon AI untuk tabel pembukuan (seperti BKU, BKP Bank, BKP Tunai, BKP Pajak, dan ROB) memiliki banyak kolom data. Ukuran panel tetap (440px) terasa sempit untuk membaca tabel multi-kolom. Pengguna membutuhkan fitur **Maximize** agar jendela chat dapat mengembang memenuhi layar sehingga pembacaan data keuangan menjadi sangat leluasa.
2. **Minimasi Rapi (Minimize):** Saat pengguna ingin sementara melihat halaman di belakang chat, panel dapat diciutkan menjadi bilah ramping (*mini-bar*) di pojok kanan bawah (seperti chat Gmail/Facebook).
3. **Pembersihan Layar & Tombol Navbar:** Menghilangkan tombol floating bulat di pojok kanan bawah agar tampilan halaman tidak tertutup, dan memindahkan tombol pembuka chat ke **Navbar** di samping icon notifikasi. Saat ditutup, chat kembali bersih ke icon Navbar.

Dokumen ini merumuskan perancangan arsitektur antarmuka pengguna (UI/UX) untuk kontrol jendela (Closed, Normal, Minimized, Maximized) dan integrasi icon chat pada Navbar.

---

## 2. Sasaran & Kriteria Keberhasilan
1. **Integrasi Icon Chat di Navbar:** Menambahkan tombol icon chat modern bernuansa gradient ungu-indigo di [Navbar.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Components/Navbar.tsx) di samping lonceng notifikasi, lengkap dengan indikator aktif ketika jendela chat sedang terbuka.
2. **Pembersihan Tombol Floating:** Menghapus tombol floating bulat di pojok kanan bawah sehingga area kerja halaman utama menjadi lebih bersih dan luas.
3. **Tiga Mode Tampilan Jendela (Window Modes):**
   - **Mode Normal:** Jendela popup proporsional (`w-full sm:w-[480px] h-[640px] max-h-[88vh]`).
   - **Mode Maximized (Layar Penuh):** Jendela mengembang memenuhi layar (`fixed inset-2 md:inset-4 z-50 rounded-2xl shadow-2xl`), membuat tabel-tabel data keuangan mudah dibaca secara utuh.
   - **Mode Minimized (Mini-Bar):** Jendela menciut menjadi bilah ramping di pojok kanan bawah (`w-80 h-14`) dengan judul dan tombol expand/close.
   - **Mode Closed:** Jendela tertutup sepenuhnya dan tombol di Navbar kembali ke status tidak aktif.
4. **State Sinkron:** Status jendela dikelola secara terpusat di [AuthenticatedLayout.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Layouts/AuthenticatedLayout.tsx) agar tombol Navbar dan kontrol jendela popup selalu berada dalam state yang konsisten.
5. **Dukungan Dark Mode & Animasi Mulus:** Mendukung transisi CSS halus dan kompatibel penuh dengan Dark Mode Tailwind CSS.

---

## 3. Arsitektur & Spesifikasi Teknis

### 3.1. Pengelolaan State Terpusat (`AuthenticatedLayout.tsx`)
State jendela didefinisikan dengan tipe:
```typescript
export type CopilotWindowState = 'closed' | 'normal' | 'minimized' | 'maximized';
```
Di [AuthenticatedLayout.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Layouts/AuthenticatedLayout.tsx):
- Menyimpan state `const [copilotState, setCopilotState] = useState<CopilotWindowState>('closed');`.
- Meneruskan `copilotState` dan `setCopilotState` ke `<Navbar />` dan `<CopilotDrawer />`.

### 3.2. Komponen Tombol Chat Navbar (`Navbar.tsx`)
1. **Posisi:** Di samping `<NotificationDropdown />` pada area aksi kanan navbar.
2. **Desain Visual:**
   - Tombol bulat berukuran serasi (`h-10 w-10 sm:h-10 sm:w-10`).
   - Icon `Sparkles` atau `MessageSquareText` berwarna ungu/indigo.
   - Indikator aktif: Jika `copilotState !== 'closed'`, tombol memiliki border aktif/glow dan badge titik hijau (`animate-ping`).
   - Tooltip dinamis: *"Tutup SIKAS AI Copilot"* (jika terbuka) atau *"Buka SIKAS AI Copilot"* (jika tertutup).
3. **Logika Klik:**
   - Jika `copilotState === 'closed'` $\rightarrow$ set ke `'normal'`.
   - Jika `copilotState === 'minimized'` $\rightarrow$ set ke `'normal'`.
   - Jika `copilotState === 'normal'` atau `'maximized'` $\rightarrow$ set ke `'closed'`.

### 3.3. Penyesuaian Komponen Drawer (`CopilotDrawer.tsx`)
1. **Penghapusan Floating Action Button (FAB):**
   - Menghapus blok FAB melayang di pojok kanan bawah (`!isOpen && (...)`).
2. **Penyesuaian Container Jendela:**
   - **Closed (`copilotState === 'closed'`):** Tidak merender apa-apa (`return null`).
   - **Minimized (`copilotState === 'minimized'`):**
     `fixed bottom-4 right-4 z-50 w-80 h-14 rounded-2xl shadow-xl overflow-hidden`
   - **Normal (`copilotState === 'normal'`):**
     `fixed bottom-4 right-4 z-50 w-full sm:w-[480px] h-[640px] max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden`
   - **Maximized (`copilotState === 'maximized'`):**
     `fixed inset-2 md:inset-4 z-50 w-auto h-auto rounded-2xl shadow-2xl overflow-hidden`
3. **Header Kontrol Jendela:**
   - **Tombol Minimize:** Mengubah state menjadi `'minimized'` (atau jika sedang minimized, mengembalikan ke `'normal'`).
   - **Tombol Maximize / Restore:**
     - Jika sedang normal: icon `Maximize2`, klik $\rightarrow$ mengubah state ke `'maximized'`.
     - Jika sedang maximized: icon `Minimize2`, klik $\rightarrow$ mengubah state ke `'normal'`.
   - **Tombol Close (`X`):** Mengubah state menjadi `'closed'`.
   - **Tombol Clear Chat (`RotateCcw`):** Tetap tersedia untuk mereset riwayat percakapan.

### 3.4. Penyesuaian Responsivitas & Tampilan Tabel
- Pada mode `maximized`, area pesan obrolan (`flex-1 overflow-y-auto`) mengambil tinggi dan lebar penuh jendela.
- Kontainer tabel markdown/HTML otomatis memanfaatkan lebar layar penuh sehingga tabel-tabel seperti ROB (6 kolom), BKU (7 kolom), dan BKP (8 kolom) tidak perlu digulir secara sempit.

---

## 4. Pengujian & Validasi
1. **Uji Fungsional Navigasi:**
   - Klik icon Navbar saat chat tertutup $\rightarrow$ jendela chat terbuka di mode normal.
   - Klik icon Navbar saat chat terbuka $\rightarrow$ jendela chat tertutup.
   - Klik icon Navbar saat chat minimized $\rightarrow$ jendela chat kembali ke mode normal.
2. **Uji Kontrol Jendela Header:**
   - Klik tombol Minimize $\rightarrow$ jendela menciut menjadi mini-bar 56px di pojok kanan bawah.
   - Klik mini-bar $\rightarrow$ jendela kembali ke mode normal.
   - Klik tombol Maximize $\rightarrow$ jendela mengembang memenuhi layar (`inset-2 md:inset-4`).
   - Klik tombol Restore $\rightarrow$ jendela kembali ke ukuran normal (`480px`).
   - Klik tombol Close (`X`) $\rightarrow$ jendela tertutup sepenuhnya dan tombol Navbar kembali tidak aktif.
3. **Uji Tampilan & Data:**
   - Mengetes pembacaan tabel ROB/BKU di mode maximized untuk memastikan tampilan tabel membentang rapi tanpa terpotong.
   - Menjalankan `npm run build` untuk memvalidasi TypeScript dan bundle Vite.
