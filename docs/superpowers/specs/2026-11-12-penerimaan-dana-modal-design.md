# Design Spec: Revamp Modal Penerimaan Dana & Perbaikan Kalender Terpotong SIKAS Neo-Bento

**Tanggal**: 12 November 2026  
**Status**: Disetujui (Approved)  
**Terkait**: `resources/js/Pages/Penatausahaan/Index.tsx`, `resources/js/Components/DatePicker.tsx`

---

## 1. Konteks & Masalah

### 1.1 Masalah Utama
1. **Kalender DatePicker Terpotong**: Saat bendahara mengklik input "Tanggal Terima" (atau "Tanggal Saldo Awal") pada modal "Catat Penerimaan Dana", popover kalender muncul ke bawah namun terpotong tepat pada batas bawah kartu modal. Tanggal-tanggal di baris bawah kalender (18 hingga 31) hilang dan tidak dapat diklik.
2. **Tampilan Belum Sesuai Neo-Bento**: Form input pada modal masih berupa form tumpuk standar dengan input label dan text field polos tanpa struktur kartu kelompok (*grouped bento panel*), tipografi nominal besar, maupun pemisahan visual antara dana tahap berjalan dan saldo awal.

### 1.2 Analisis Penyebab (*Root Cause*)
1. Kontainer pembungkus modal pada baris 425 [Penatausahaan/Index.tsx](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/Penatausahaan/Index.tsx#L425) menggunakan kelas `relative overflow-hidden bg-white dark:bg-[#15131F]`.
2. Kelas `overflow-hidden` tersebut memotong setiap elemen anak yang memiliki posisi `absolute` dan meluap ke luar batas kontainer (seperti popover kalender `DatePicker` dengan tinggi ~320px).
3. `DialogPanel` pada komponen dasar `Modal.tsx` sebenarnya sudah berstatus `overflow-visible`, namun `overflow-hidden` di kontainer dalam membatalkan keleluasaan tersebut.

---

## 2. Sasaran Desain

1. **Bebas Clipping (Kalender Utuh)**: Mengganti `overflow-hidden` pada modal menjadi `overflow-visible` serta mengisolasi efek dekoratif *glow blur* ke lapisan tersendiri agar kalender melayang bebas tanpa terpotong di bagian bawah.
2. **Struktur Form Neo-Bento**:
   - **Panel 1 (Sumber & Waktu)**: Pilihan Sumber Dana dan Tanggal Terima.
   - **Panel 2 (Nominal Dana)**: Input nominal penerimaan dengan tipografi besar dan instruksi yang jelas.
   - **Panel 3 (Saldo Awal SiLPA - Khusus Tahap 1)**: Panel beraksen lembut untuk memisahkan pencatatan saldo awal pembukuan.
3. **Penyempurnaan Riwayat (*History View*)**: Tampilan riwayat pencatatan dana sebelumnya dalam kartu bento yang bersih dan rapi.

---

## 3. Spesifikasi Arsitektur & Perubahan

### 3.1 Kontainer Modal Bebas Clipping
```tsx
<Modal show={isModalOpen} onClose={closeModal} maxWidth="2xl">
    <div className="relative overflow-visible rounded-[26px] bg-white dark:bg-[#15131F]">
        {/* Layer latar belakang dekoratif yang di-clip terpisah */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]">
            <div className="absolute -right-10 -top-16 h-40 w-40 rounded-full bg-brand-500/10 blur-3xl" />
        </div>

        {/* Header Modal */}
        <div className="relative flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4.5 dark:border-white/5">
            {/* IconTile, Judul, Subtitle, Close Button */}
        </div>

        {/* Body Modal dengan Min-Height Proporsional */}
        <div className="relative px-6 py-5">
            {/* Form atau History List */}
        </div>
    </div>
</Modal>
```

### 3.2 Tampilan Form Neo-Bento Terkelompok
1. **Panel 1: Sumber & Waktu Penerimaan**:
   - Dropdown Sumber Dana (`select` dengan rounded-xl, border presisi, focus ring lime).
   - DatePicker Tanggal Terima dengan ikon kalender dan format tanggal lokal Indonesia.
2. **Panel 2: Jumlah Dana Penerimaan**:
   - Field Jumlah Dana dengan gaya Neo-Bento, font tabular tebal (`text-sikas-num font-extrabold text-[15px] sm:text-[16px]`), dan teks instruksi.
3. **Panel 3: Saldo Awal / SiLPA (Kondisional Tahap 1)**:
   - Kontainer berlatar `bg-slate-50/70 border border-slate-200/60 dark:bg-white/[0.02] dark:border-white/10 rounded-2xl p-4`.
   - DatePicker Tanggal Saldo Awal dan Input Jumlah Saldo Awal.
4. **Footer Aksi**:
   - Tombol "Kembali" (`SecondaryButton`) dan "Simpan Penerimaan" (`PrimaryButton`) dengan feedback loading (`processing ? 'Menyimpan...' : 'Simpan'`).

---

## 4. Rencana Pengujian (*Verification Plan*)

1. **Uji Kalender DatePicker**:
   - Buka modal "Catat Penerimaan Dana" pada halaman Penatausahaan.
   - Klik input "Tanggal Terima" dan pastikan seluruh tanggal (baris 1 sampai akhir tanggal 31) tampil utuh melayang di atas modal tanpa terpotong batas bawah.
   - Jika sumber dana Tahap 1 dipilih, klik "Tanggal Saldo Awal" dan pastikan kalender juga tampil utuh.
2. **Uji Validitas Form & Penyimpanan**:
   - Mengisi data dan menekan tombol simpan: data berhasil diproses ke backend.
3. **Verifikasi Build**:
   - Menjalankan `npm run build` (`tsc && vite build`) untuk memastikan bebas error kompilasi.
