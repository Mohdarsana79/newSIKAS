# Design Spec: Perbaikan Modal Diagnosa AI Tertindis oleh Modal Tarik ARKAS

**Tanggal:** 24 Oktober 2026  
**Status:** Approved  
**Topik:** BKU Penatausahaan, Modal Tarik ARKAS, ArkasDiagnosticModal, Z-Index, Modal Stacking  

---

## 1. Latar Belakang & Masalah
Saat pengguna berada di halaman BKU (`resources/js/Pages/Penatausahaan/Bku.tsx`) dan membuka modal **"Tarik dari ARKAS"**, terdapat tombol:
> `Analisis Selisih AI (DeepSeek)`

Ketika tombol tersebut diklik:
1. Modal Diagnosa AI (`ArkasDiagnosticModal`) terbuka.
2. Namun modal **Tarik BKU dari ARKAS** tetap terbuka dan posisinya berada tepat di depan modal Diagnosa AI, sehingga modal AI **tertindis** dan terhalang dari interaksi pengguna.

### Penyebab Teknis (Root Cause)
1. **Konflik Stacking Context & Portal:**
   - Modal Tarik ARKAS menggunakan komponen `Modal.tsx` berbasis `@headlessui/react` `<Dialog>`. Headless UI secara default merender dialog ke dalam Portal di `document.body` (`#headlessui-portal-root`) dengan class `z-50`.
   - Sementara `ArkasDiagnosticModal.tsx` dirender sebagai elemen `div` biasa di dalam hierarki DOM React `#app` dengan class `z-50`.
   - Elemen portal di `document.body` dilukis di atas elemen anak dari `#app` karena posisinya di hierarki DOM dan stacking context, sehingga modal Tarik ARKAS menutupi modal AI.
2. **State Tidak Ditutup:**
   - Di `Bku.tsx`, saat tombol diklik:
     `onClick={() => setIsArkasAiModalOpen(true)}`
     State `isArkasMonthlyModalOpen` tidak diset `false`, sehingga kedua modal berada dalam kondisi aktif (`show={true}` dan `isOpen={true}`) secara bersamaan.

---

## 2. Solusi & Alur Interaksi (UX Flow)

### 2.1 Alur Transisi Modal
1. **Membuka Diagnosa AI dari Modal Tarik ARKAS:**
   - Ketika pengguna mengklik tombol `"Analisis Selisih AI (DeepSeek)"`:
     - Panggil `setIsArkasMonthlyModalOpen(false)` untuk menutup sementara modal Tarik ARKAS.
     - Panggil `setIsArkasAiModalOpen(true)` untuk membuka modal Diagnosa AI.
     - State hasil cek ARKAS (`arkasMonthlyData`) tetap dipertahankan di memory state komponen agar tidak perlu fetching ulang saat kembali.
2. **Menutup Modal AI (Kembali ke Tarik ARKAS):**
   - Ketika pengguna mengklik tombol `"Tutup"` atau ikon `X` pada `ArkasDiagnosticModal`:
     - Panggil `setIsArkasAiModalOpen(false)`.
     - Panggil `setIsArkasMonthlyModalOpen(true)` untuk membuka kembali modal Tarik ARKAS.
3. **Melanjutkan Tindakan dari Modal AI:**
   - Komponen `ArkasDiagnosticModal` mendukung prop `onProceedWithAction`.
   - Kita berikan handler `onProceedWithAction={() => { setIsArkasAiModalOpen(false); setIsArkasMonthlyModalOpen(true); }}`.
   - Tambahkan prop kustom `actionButtonLabel="Lanjutkan ke Tarik BKU"` agar teks tombol lebih kontekstual dan intuitif.

### 2.2 Peningkatan Z-Index & Ketahanan Visual (Defensive Design)
- Di `ArkasDiagnosticModal.tsx`, naikkan `z-index` pembungkus utama dari `z-50` menjadi `z-[70]`.
- Hal ini mencegah glitch atau flicker visual saat animasi transisi keluar (Headless UI leave transition `duration-200`) berlangsung ketika modal Tarik ARKAS menutup.

---

## 3. Komponen yang Dimodifikasi

### 3.1 `resources/js/Pages/Penatausahaan/Bku.tsx`
1. Modifikasi event click pada tombol AI di dalam modal Tarik ARKAS:
   ```tsx
   <button
       type="button"
       onClick={() => {
           setIsArkasMonthlyModalOpen(false);
           setIsArkasAiModalOpen(true);
       }}
       className="..."
   >
       <Brain className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
       Analisis Selisih AI (DeepSeek)
   </button>
   ```
2. Modifikasi pemanggilan `ArkasDiagnosticModal`:
   ```tsx
   <ArkasDiagnosticModal
       isOpen={isArkasAiModalOpen}
       onClose={() => {
           setIsArkasAiModalOpen(false);
           setIsArkasMonthlyModalOpen(true);
       }}
       onProceedWithAction={() => {
           setIsArkasAiModalOpen(false);
           setIsArkasMonthlyModalOpen(true);
       }}
       actionButtonLabel="Lanjutkan ke Tarik BKU"
       tahun={tahun}
       scope="bku_month"
       context={{
           bulan: bulan,
           bulan_angka: ['januari','februari','maret','april','mei','juni','juli','agustus','september','oktober','november','desember'].indexOf(bulan.toLowerCase()) + 1 || 1,
           penganggaran_id: penganggaran?.id
       }}
   />
   ```

### 3.2 `resources/js/Components/Ai/ArkasDiagnosticModal.tsx`
1. Perbarui interface `ArkasDiagnosticModalProps`:
   ```tsx
   export interface ArkasDiagnosticModalProps {
       // ... existing props
       actionButtonLabel?: string;
   }
   ```
2. Ganti z-index wrapper utama dari `z-50` ke `z-[70]`:
   ```tsx
   <div className="fixed inset-0 z-[70] overflow-y-auto bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
   ```
3. Gunakan `actionButtonLabel || 'Lanjutkan Tindakan'` pada tombol `onProceedWithAction`:
   ```tsx
   {onProceedWithAction && (
       <button
           onClick={() => {
               onClose();
               onProceedWithAction();
           }}
           className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition flex items-center gap-1.5"
       >
           {actionButtonLabel || 'Lanjutkan Tindakan'}
           <ArrowRight className="w-3.5 h-3.5" />
       </button>
   )}
   ```

---

## 4. Rencana Pengujian
1. Buka halaman BKU pada bulan yang memiliki data ARKAS (misal Juni 2026).
2. Klik tombol **"Tarik dari ARKAS"** — pastikan modal Tarik ARKAS muncul.
3. Klik tombol **"Analisis Selisih AI (DeepSeek)"**:
   - Pastikan modal Tarik ARKAS menutup dengan mulus.
   - Pastikan modal Diagnosa AI terbuka penuh di layar tanpa ada modal lain yang menindih.
4. Klik tombol **"Tutup"** atau ikon **`X`** pada modal Diagnosa AI:
   - Pastikan modal Diagnosa AI tertutup dan modal Tarik ARKAS otomatis terbuka kembali.
   - Pastikan data konfirmasi timpa ulang / ringkasan belanja ARKAS tidak hilang.
5. Klik kembali **"Analisis Selisih AI (DeepSeek)"** lalu klik tombol **"Lanjutkan ke Tarik BKU"**:
   - Pastikan kembali ke modal Tarik ARKAS dengan benar.
6. Verifikasi build frontend `npm run build` berhasil tanpa error TypeScript.
