# Implementation Plan: Integrasi Diagnosa AI pada Modal Tarik BKU Tahunan ARKAS di Halaman Penatausahaan

- **Tanggal**: 24 Oktober 2026
- **Dokumen Desain**: [2026-10-24-penatausahaan-annual-arkas-ai-diagnostic-design.md](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-10-24-penatausahaan-annual-arkas-ai-diagnostic-design.md)
- **Target File**: `resources/js/Pages/Penatausahaan/Index.tsx`
- **Status**: Siap Dieksekusi

---

## 1. Rencana Perubahan Detail

### `resources/js/Pages/Penatausahaan/Index.tsx`

1. **Tambahkan Import di Bagian Atas File:**
   ```tsx
   import ArkasDiagnosticModal from '@/Components/Ai/ArkasDiagnosticModal';
   import { Brain } from 'lucide-react';
   ```

2. **Tambahkan State untuk Modal AI:**
   Di sekitar baris 42 (di bawah deklarasi `pullingBku`):
   ```tsx
   const [isArkasAiModalOpen, setIsArkasAiModalOpen] = useState(false);
   ```

3. **Perbarui Footer Modal Tarik BKU Tahunan (`isArkasBkuModalOpen`):**
   Di sekitar baris 655:
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
           {arkasBkuData?.exists && arkasBkuData?.has_rkas && (
               <button
                   onClick={handleExecutePullArkasBku}
                   disabled={pullingBku || (arkasBkuData.has_existing_data && !isOverwriteChecked)}
                   className={`inline-flex items-center px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-all duration-150 ${
                       pullingBku || (arkasBkuData.has_existing_data && !isOverwriteChecked)
                           ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed opacity-60'
                           : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2'
                   }`}
               >
                   {pullingBku ? (
                       <>
                           <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                           Menarik BKU...
                       </>
                   ) : (
                       <>
                           <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                           </svg>
                           {arkasBkuData.has_existing_data ? 'Tarik & Timpa Ulang BKU' : 'Tarik BKU Sekarang'}
                       </>
                   )}
               </button>
           )}
       </div>
   </div>
   ```

4. **Render Komponen `ArkasDiagnosticModal` Tepat Setelah Modal BKU:**
   Di sekitar baris 687 (tepat sebelum penutup `</AuthenticatedLayout>`):
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

## 2. Pengujian & Verifikasi

1. **Jalankan Build Frontend:** `npm run build` untuk memverifikasi kompilasi TypeScript dan aset Vite.
2. **Validasi Alur Interaksi:**
   - Buka modal Tarik BKU Tahunan -> Klik "Analisis Selisih AI (DeepSeek)".
   - Modal Tarik BKU menutup dan Modal AI terbuka menampilkan diagnosa tahunan komprehensif.
   - Klik "Tutup" atau "Lanjutkan ke Tarik BKU" -> Modal AI menutup dan modal Tarik BKU Tahunan terbuka kembali dengan data yang sudah di-fetch.
