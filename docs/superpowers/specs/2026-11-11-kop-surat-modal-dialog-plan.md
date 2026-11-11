# Implementation Plan: Penggantian SweetAlert dengan Modal Konfirmasi & Notifikasi Tailwind pada Kop Surat Builder

**Tanggal Rencana:** 11 November 2026  
**Status:** Siap Dieksekusi  
**Dokumen Desain Referensi:** [`docs/superpowers/specs/2026-11-11-kop-surat-modal-dialog-design.md`](file:///c:/laragon\www\newSIKAS2\newSIKAS\docs\superpowers\specs\2026-11-11-kop-surat-modal-dialog-design.md)

---

## 1. Ringkasan Tugas & Tujuan

Menghapus penggunaan `sweetalert2` pada [`KopSuratBuilder.tsx`](file:///c:/laragon/www/newSIKAS2/newSIKAS/resources/js/Pages/DataMaster/SekolahProfile/Partials/KopSuratBuilder.tsx) dan menggantinya dengan:
1. **Modal Konfirmasi Reset Template**
2. **Modal Konfirmasi Simpan Kop Surat**
3. **Modal Status (Pemberitahuan Sukses / Gagal)**

---

## 2. Rincian Perubahan File & Tahapan Eksekusi

### Tahap 1: Hapus Import SweetAlert & Tambahkan State Modal di `KopSuratBuilder.tsx`
- Hapus `import Swal from 'sweetalert2';`.
- Tambahkan state:
  ```ts
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isConfirmSaveModalOpen, setIsConfirmSaveModalOpen] = useState(false);
  const [statusModal, setStatusModal] = useState<{
      isOpen: boolean;
      type: 'success' | 'error' | 'info';
      title: string;
      message: string;
  }>({
      isOpen: false,
      type: 'success',
      title: '',
      message: '',
  });
  ```

### Tahap 2: Hubungkan Handler Aksi ke Modal
- `handleResetTemplate`: Buka `setIsResetModalOpen(true)`. Saat tombol "Ya, Terapkan Template" ditekan di modal, terapkan template dinas dan tutup modal.
- Tombol "Simpan Kop Surat": Buka `setIsConfirmSaveModalOpen(true)`. Saat dikonfirmasi, panggil `executeSaveKop()`.
- Saat simpan sukses:
  - Buka modal status: `type: 'success'`, title: `'Kop Surat Berhasil Disimpan'`, message: `'...'`.
- Saat simpan gagal atau download gagal:
  - Buka modal status: `type: 'error'`, title: `'Gagal Menyimpan'`, message: `'...'`.
- Saat unduh sukses:
  - Buka modal status: `type: 'success'`, title: `'File Gambar Berhasil Diunduh'`, message: `'...'`.

### Tahap 3: Render Komponen Modal di Bagian Bawah JSX
- Render:
  1. `<Modal show={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} maxWidth="md">`
  2. `<Modal show={isConfirmSaveModalOpen} onClose={() => setIsConfirmSaveModalOpen(false)} maxWidth="md">`
  3. `<Modal show={statusModal.isOpen} onClose={() => setStatusModal(prev => ({ ...prev, isOpen: false }))} maxWidth="md">`

### Tahap 4: Verifikasi & Test Build
- Jalankan `npm run build` untuk memverifikasi kompilasi TypeScript dan Vite build bersih tanpa error.
- Lakukan commit git.
