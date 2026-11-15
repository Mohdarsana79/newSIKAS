# Design Spec: Perbaikan UI & Layering Notifikasi SIKAS Neo-Bento

**Tanggal**: 12 November 2026  
**Status**: Disetujui (Approved)  
**Terkait**: `Navbar.tsx`, `PageHeader.tsx`, `NotificationDropdown.tsx`, `NotificationModal.tsx`

---

## 1. Konteks & Masalah

### 1.1 Masalah Utama
Pada antarmuka SIKAS (termasuk halaman `Dashboard`), popover menu `NotificationDropdown` tertutup sebagian oleh komponen `PageHeader` (area judul halaman dan tombol aksi seperti `[BOSP Reguler] [Tahun 2026] [Sinkronkan]`). Header dan bagian atas kartu notifikasi berada di bawah lapisan kaca frosted `PageHeader`, sehingga teks "Notifikasi" dan filter terhalang, hanya bagian bawah kartu notifikasi yang terlihat.

### 1.2 Analisis Penyebab (*Root Cause*)
Di dalam `resources/js/Components/Navbar.tsx`:
1. Navigasi utama dibungkus dalam kontainer `sticky top-3 z-30 px-3 pt-3 lg:pr-4`.
2. Di dalam kontainer tersebut terdapat dua elemen saudara kandung (*sibling*):
   - Elemen `<header className="sikas-glass ...">` yang memuat trigger dan popover `NotificationDropdown`.
   - Elemen pembungkus `{header && (<div className="mt-3 rounded-[22px] ... backdrop-blur-xl ...">{header}</div>)}` yang memuat `PageHeader`.
3. Elemen `<header>` tidak memiliki deklarasi posisi `relative` maupun `z-index` eksplisit. Sebaliknya, pembungkus `PageHeader` menggunakan `backdrop-blur-xl` yang memicu terbentuknya *CSS stacking context* baru.
4. Karena pembungkus `PageHeader` muncul setelah `<header>` dalam urutan DOM (DOM order), browser me-render seluruh lapisan pembungkus `PageHeader` di atas `<header>`. Akibatnya, elemen anak dengan posisi `absolute z-50` di dalam `<header>` terpotong/tertutup di bawah pembungkus `PageHeader`.

---

## 2. Sasaran Desain

1. **Layering Tuntas & Alami**:
   Memastikan menu popover dropdown (baik notifikasi maupun menu profil pengguna) selalu melayang bebas di atas `PageHeader` tanpa bug visual atau terpotong efek blur.
2. **Desain Neo-Bento Modern**:
   Memperbarui tampilan `NotificationDropdown` agar sepenuhnya selaras dengan bahasa desain SIKAS Neo-Bento:
   - Header notifikasi yang bersih dengan counter badge.
   - Filter tab mini (*Semua*, *Perlu Disetor*, *Sudah Disetor*).
   - Tombol "Tandai Semua Dibaca" untuk membersihkan notifikasi yang sudah lunas.
   - Kartu item notifikasi dengan ikon pastel, badge status, jumlah transaksi, dan indikator unread.
   - Animasi buka/tutup halus menggunakan `<Transition>` (Headless UI).
   - *Empty state* yang ramah dan estetik.
3. **Penyempurnaan Modal Rincian (`NotificationModal.tsx`)**:
   - Memodernisasi tampilan modal dengan tema Neo-Bento.
   - Menambahkan kartu ringkasan total nilai nominal pajak yang perlu dibayar / disetor.
   - Menambahkan tombol aksi pintas **"Buka BKU [Bulan Tahun]"** dengan `useVariantRoute` untuk langsung mengarahkan bendahara ke transaksi terkait.

---

## 3. Spesifikasi Arsitektur & Komponen

### 3.1 Perbaikan Layering pada `Navbar.tsx`

```tsx
// resources/js/Components/Navbar.tsx
<div className="sticky top-3 z-30 px-3 pt-3 lg:pr-4">
    {/* Navigasi Utama: Beri relative z-20 agar popover berada di atas sub-header */}
    <header className="sikas-glass relative z-20 flex items-center gap-3 rounded-[22px] border border-white/70 px-3 py-2.5 shadow-nav ring-1 ring-slate-900/[0.03] dark:border-white/10 dark:ring-white/5">
        {/* ... child triggers including NotificationDropdown & Profile Dropdown ... */}
    </header>

    {/* Header Halaman (PageHeader): Beri relative z-10 agar berada di bawah popover nav */}
    {header && (
        <div className="relative z-10 mt-3 rounded-[22px] border border-white/70 bg-white/70 px-3 py-2.5 shadow-nav backdrop-blur-xl dark:border-white/10 dark:bg-[#0D0F17]/70">
            {header}
        </div>
    )}
</div>
```

- **Alasan**: Solusi ini murni CSS tanpa runtime overhead portal, tidak bergantung pada tracking posisi scroll/resize, dan langsung memperbaiki seluruh dropdown di dalam `<header>` (notifikasi, profil, dsb).

---

### 3.2 Tampilan & Fungsionalitas `NotificationDropdown.tsx`

#### 3.2.1 State & Interaktivitas
- **State Filter**: `activeTab: 'all' | 'terima' | 'setor'` (default: `'all'`).
- **Data Notifikasi**: Diambil dari `/api/notifications/pajak`.
- **Tandai Semua Dibaca**:
  - Untuk notifikasi tipe `setor_pajak`: menyetel key `localStorage.setItem('read_setor_${year}_${month}', 'true')` untuk semua item setor yang aktif, lalu memperbarui state lokal.
- **Klik Item**:
  - Jika tipe `setor_pajak`: simpan status baca di `localStorage`.
  - Buka modal rincian `selectedNotification`.
- **Animasi Buka/Tutup**:
  - Menggunakan `<Transition>` Headless UI:
    ```tsx
    enter="transition ease-out duration-200"
    enterFrom="opacity-0 scale-95 -translate-y-1"
    enterTo="opacity-100 scale-100 translate-y-0"
    leave="transition ease-in duration-150"
    leaveFrom="opacity-100 scale-100 translate-y-0"
    leaveTo="opacity-0 scale-95 -translate-y-1"
    ```

#### 3.2.2 Struktur Popover UI
1. **Header Panel**:
   - Judul: "Notifikasi" (`text-[13px] font-extrabold text-slate-900 dark:text-white`).
   - Counter Badge: `[N] Baru` dengan latar `bg-pastel-lavender text-brand-600 dark:bg-brand-500/15 dark:text-brand-300`.
   - Tombol Aksi: *"Tandai semua dibaca"* dengan ikon centang ganda (`CheckCheck` dari `lucide-react`) jika ada item setor yang belum dibaca.
2. **Pill Tabs Filter**:
   - 3 Tab kapsul:
     - **Semua**: Total semua notifikasi.
     - **Perlu Disetor**: Khusus `terima_pajak` (badge amber lembut).
     - **Disetor**: Khusus `setor_pajak` (badge emerald lembut).
3. **Daftar Notifikasi (Scrollable)**:
   - Lebar popover: `w-84 sm:w-96` (maksimal kenyamanan membaca uraian).
   - Maksimum tinggi: `max-h-96 overflow-y-auto sikas-scroll`.
   - Item Card:
     - Avatar icon kotak melengkung (`rounded-xl`):
       - Amber untuk `terima_pajak` (`AlertTriangle`).
       - Emerald untuk `setor_pajak` (`CheckCircle2`).
     - Teks judul: "Terima Pajak (Belum Disetor)" vs "Pajak Disetor".
     - Deskripsi: *"Pajak bulan [Nama Bulan] [Tahun] ..."*.
     - Footer card: `[X] transaksi` + titik indikator unread.
4. **Empty State**:
   - Ikon lonceng berlatar pastel dengan teks ramah saat tidak ada notifikasi di tab aktif.

---

### 3.3 Tampilan & Aksi `NotificationModal.tsx`

1. **Header Modal**:
   - Judul dinamis: *"Rincian Pajak Belum Disetor"* atau *"Rincian Pajak Sudah Disetor"*.
   - Badge bulan & tahun: *"[Bulan] [Tahun]"*.
2. **Ringkasan Nilai Pajak**:
   - Box informasi Neo-Bento dengan highlight total nominal pajak: `Total Pajak: Rp XX.XXX.XXX` (dihitung otomatis dari `sum(details.nominal)`).
3. **Tabel Rincian Transaksi**:
   - Header kolom: No, Tanggal, Uraian Transaksi, NTPN (jika setor pajak), Nilai Nominal Pajak.
   - Format rupiah rapi dengan tipografi tabular.
4. **Aksi Tombol**:
   - Tombol Utama: **"Buka BKU [Bulan]"** — menggunakan `useVariantRoute` yang mengarahkan bendahara ke `route(vRoute('bku'), { tahun: notification.year, bulan: notification.month })`.
   - Tombol Sekunder: **"Tutup"**.

---

## 4. Penanganan Kasus Khusus (*Edge Cases*)

1. **Tidak Ada Notifikasi**: Menampilkan empty state visual yang bersih tanpa scrollbar sempit.
2. **Klik di Luar Popover**: Menutup popover secara otomatis (`handleClickOutside`).
3. **Navigasi ke Halaman BKU**: Saat bendahara mengklik tombol "Buka BKU" dari modal, modal ditutup dan halaman berpindah mulus melalui Inertia Link/router.
4. **Dark Mode**: Seluruh elemen warna (background, border, teks, badge) memiliki padanan `dark:` yang presisi sesuai palet `#0D0F17` dan `#15131F`.

---

## 5. Rencana Pengujian (*Testing Plan*)

1. **Verifikasi Layering**:
   - Buka dropdown notifikasi pada halaman `Dashboard`.
   - Pastikan popover berada di atas `PageHeader` dan tombol `[BOSP Reguler] [Tahun 2026] [Sinkronkan]` tanpa terpotong atau tertutup efek blur.
2. **Verifikasi Interaktivitas Dropdown**:
   - Uji klik tombol filter tab (Semua, Perlu Disetor, Disetor).
   - Uji tombol "Tandai semua dibaca" dan pastikan jumlah badge berkurang/sinkron dengan `localStorage`.
3. **Verifikasi Modal**:
   - Klik salah satu notifikasi untuk memicu modal.
   - Pastikan data rincian termuat via API, ringkasan total nominal terkalkulasi dengan benar.
   - Klik "Buka BKU" dan pastikan navigasi ke halaman BKU bulan terkait berjalan sukses.
4. **Verifikasi Build**:
   - Jalankan `npm run build` untuk memastikan tidak ada error TypeScript maupun Vite.

