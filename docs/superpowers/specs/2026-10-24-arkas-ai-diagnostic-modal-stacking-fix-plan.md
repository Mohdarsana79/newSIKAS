# Implementation Plan: Perbaikan Modal Diagnosa AI Tertindis oleh Modal Tarik ARKAS

- **Tanggal**: 24 Oktober 2026
- **Dokumen Desain**: [2026-10-24-arkas-ai-diagnostic-modal-stacking-fix-design.md](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-10-24-arkas-ai-diagnostic-modal-stacking-fix-design.md)
- **Target File**:
  - `resources/js/Components/Ai/ArkasDiagnosticModal.tsx`
  - `resources/js/Pages/Penatausahaan/Bku.tsx`
- **Status**: Siap Dieksekusi

---

## 1. Rencana Perubahan Detail

### A. Komponen: `resources/js/Components/Ai/ArkasDiagnosticModal.tsx`

1. **Tambahkan Prop `actionButtonLabel?: string` pada Interface `ArkasDiagnosticModalProps`:**
   ```tsx
   export interface ArkasDiagnosticModalProps {
       isOpen: boolean;
       onClose: () => void;
       tahun?: number | string;
       scope?: 'comprehensive' | 'bku_month' | 'rkas';
       context?: {
           bulan?: string;
           bulan_angka?: number;
           penganggaran_id?: number | string;
           [key: string]: any;
       };
       onProceedWithAction?: () => void;
       actionButtonLabel?: string;
   }
   ```
2. **Terima `actionButtonLabel` pada parameter komponen:**
   ```tsx
   export default function ArkasDiagnosticModal({
       isOpen,
       onClose,
       tahun = 2026,
       scope = 'comprehensive',
       context = {},
       onProceedWithAction,
       actionButtonLabel,
   }: ArkasDiagnosticModalProps)
   ```
3. **Tingkatkan Z-Index pembungkus modal:**
   Ubah dari `z-50` ke `z-[70]`:
   ```tsx
   <div className="fixed inset-0 z-[70] overflow-y-auto bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
   ```
4. **Gunakan Label Tombol Dinamis pada Tombol Aksi Footer:**
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

### B. Halaman: `resources/js/Pages/Penatausahaan/Bku.tsx`

1. **Update Handler Tombol "Analisis Selisih AI (DeepSeek)" di Modal Tarik ARKAS:**
   Di sekitar baris 3684:
   ```tsx
   <button
       type="button"
       onClick={() => {
           setIsArkasMonthlyModalOpen(false);
           setIsArkasAiModalOpen(true);
       }}
       className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900/50 rounded-lg border border-indigo-200 dark:border-indigo-800 transition"
   >
       <Brain className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
       Analisis Selisih AI (DeepSeek)
   </button>
   ```
2. **Update Pemanggilan `ArkasDiagnosticModal`:**
   Di sekitar baris 3727:
   ```tsx
   {/* Modal Diagnosa Selisih AI ARKAS */}
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

---

## 2. Pengujian & Verifikasi

1. **Jalankan TypeScript check:** `npm run build` atau `npx tsc --noEmit` untuk memastikan tidak ada kesalahan tipe data.
2. **Cek Alur Interaksi:**
   - Modal Tarik ARKAS dibuka -> Klik AI Analisis -> Modal Tarik ARKAS tertutup, Modal AI tampil di depan (`z-[70]`).
   - Klik Tutup pada Modal AI -> Modal AI tertutup, Modal Tarik ARKAS kembali terbuka dengan data tetap utuh.
   - Klik "Lanjutkan ke Tarik BKU" -> Modal AI tertutup, Modal Tarik ARKAS kembali terbuka.
