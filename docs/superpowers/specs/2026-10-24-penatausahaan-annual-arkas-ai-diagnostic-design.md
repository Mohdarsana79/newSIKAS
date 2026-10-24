# Design Spec: Integrasi Diagnosa AI pada Modal Tarik BKU Tahunan ARKAS di Halaman Penatausahaan

**Tanggal:** 24 Oktober 2026  
**Status:** Approved  
**Topik:** Penatausahaan, Tarik BKU Tahunan, ArkasDiagnosticModal, DeepSeek AI, UX Stacking  

---

## 1. Latar Belakang & Tujuan
Pada halaman utama Penatausahaan (`resources/js/Pages/Penatausahaan/Index.tsx`), pengguna dapat menarik seluruh BKU dalam satu tahun anggaran melalui tombol **"Tarik BKU dari ARKAS"** yang membuka modal Tarik BKU Tahunan.

Saat ini, modal tersebut baru menyediakan ringkasan nominal penarikan, penerimaan, belanja, status tutup buku bulanan di ARKAS, serta tombol eksekusi tarik / timpa ulang. Pengguna belum memiliki akses langsung ke asisten AI untuk mendiagnosa selisih komprehensif tahunan, risiko penimpaan (overwrite risk), dan checklist remediasi sebelum mengeksekusi penarikan.

Tujuan dari fitur ini adalah menambahkan tombol **"Analisis Selisih AI (DeepSeek)"** pada modal Tarik BKU Tahunan dengan alur transisi mulus dan aman dari masalah modal tumpang-tindih (modal stacking).

---

## 2. Alur Interaksi & Desain UX

1. **Membuka Modal Diagnosa AI dari Modal Tarik BKU Tahunan:**
   - Pengguna mengklik tombol `"Analisis Selisih AI (DeepSeek)"` pada footer modal Tarik BKU Tahunan.
   - Sistem menutup sementara modal Tarik BKU Tahunan (`setIsArkasBkuModalOpen(false)`).
   - Sistem membuka modal Diagnosa AI (`setIsArkasAiModalOpen(true)`).
   - Data ringkasan ARKAS tahunan (`arkasBkuData`) tetap aman tersimpan di dalam memory state komponen sehingga tidak perlu loading ulang saat pengguna kembali.

2. **Cakupan Diagnosa (Scope):**
   - Menggunakan `scope="comprehensive"` dengan parameter tahun aktif `arkasBkuYear || tahun || 2026`.
   - Menampilkan:
     - Ringkasan kesehatan koneksi database desktop ARKAS.
     - Analisis selisih pagu RKAS, belanja kas, penerimaan, dan penarikan tunai setahun penuh (12 bulan).
     - Status tutup buku per bulan (Januari s.d. Desember).
     - Rincian risiko penimpaan data (overwrite risks) dan akar masalah selisih.
     - Checklist langkah aksi perbaikan bertahap.

3. **Menutup & Melanjutkan Tindakan (Kembali ke Tarik BKU):**
   - Ketika pengguna mengklik tombol `"Tutup"` atau ikon `X` pada `ArkasDiagnosticModal`:
     - `isArkasAiModalOpen` diset `false`.
     - `isArkasBkuModalOpen` diset `true` (modal Tarik BKU Tahunan kembali tampil dengan data yang sudah siap).
   - Ketika pengguna mengklik tombol `"Lanjutkan ke Tarik BKU"` (`onProceedWithAction`):
     - `isArkasAiModalOpen` diset `false`.
     - `isArkasBkuModalOpen` diset `true`.

---

## 3. Komponen yang Dimodifikasi

### `resources/js/Pages/Penatausahaan/Index.tsx`

1. **Import:**
   - `import ArkasDiagnosticModal from '@/Components/Ai/ArkasDiagnosticModal';`
   - `import { Brain } from 'lucide-react';`

2. **State:**
   - `const [isArkasAiModalOpen, setIsArkasAiModalOpen] = useState(false);`

3. **Footer Modal Tarik BKU Tahunan:**
   - Ubah container footer menjadi responsive flex:
   ```tsx
   <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-100 dark:border-gray-700 pt-4">
       <button
           type="button"
           onClick={() => {
               setIsArkasBkuModalOpen(false);
               setIsArkasAiModalOpen(true);
           }}
           className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900/50 rounded-lg border border-indigo-200 dark:border-indigo-800 transition"
       >
           <Brain className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
           Analisis Selisih AI (DeepSeek)
       </button>
       <div className="w-full sm:w-auto flex items-center justify-end gap-3">
           <SecondaryButton onClick={() => setIsArkasBkuModalOpen(false)} disabled={pullingBku}>
               Batal
           </SecondaryButton>
           {/* Tombol Eksekusi Tarik / Timpa Ulang BKU */}
       </div>
   </div>
   ```

4. **Render Komponen `ArkasDiagnosticModal`:**
   ```tsx
   {/* Modal Diagnosa & Rekonsiliasi AI ARKAS (Tahunan) */}
   <ArkasDiagnosticModal
       isOpen={isArkasAiModalOpen}
       onClose={() => {
           setIsArkasAiModalOpen(false);
           setIsArkasBkuModalOpen(true);
       }}
       onProceedWithAction={() => {
           setIsArkasAiModalOpen(false);
           setIsArkasBkuModalOpen(true);
       }}
       actionButtonLabel="Lanjutkan ke Tarik BKU"
       tahun={arkasBkuYear || tahun || 2026}
       scope="comprehensive"
   />
   ```

---

## 4. Rencana Pengujian
1. Masuk ke halaman Penatausahaan (`/penatausahaan`).
2. Buka accordion tahun anggaran aktif dan klik tombol **"Tarik BKU dari ARKAS"**.
3. Pastikan modal Tarik BKU Tahunan terbuka dengan ringkasan nominal ARKAS.
4. Klik tombol **"Analisis Selisih AI (DeepSeek)"**:
   - Pastikan modal Tarik BKU tertutup.
   - Pastikan modal Diagnosa AI terbuka penuh dengan cakupan komprehensif tahunan.
5. Klik tombol **"Tutup"** atau ikon **`X`**:
   - Pastikan modal Diagnosa AI tertutup dan modal Tarik BKU Tahunan otomatis terbuka kembali tanpa loading ulang data.
6. Klik kembali tombol AI lalu klik **"Lanjutkan ke Tarik BKU"**:
   - Pastikan alur kembali ke modal Tarik BKU berjalan mulus.
7. Jalankan `npm run build` untuk memverifikasi TypeScript dan bundel aset Vite.
