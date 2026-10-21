# Spesifikasi Desain: Koreksi Persona dan Penyajian 27 Dokumen Tanda Terima Tahap 1 pada SIKAS AI Copilot

- **Tanggal**: 21 Oktober 2026
- **Status**: Disetujui
- **Topik**: Koreksi Persona Sapaan Copilot dan Penyajian Lengkap Dokumen Tanda Terima Tahap 1 (2026)

---

## 1. Latar Belakang & Masalah

Pengguna (Om Moh Gian Darsana / Bendahara BOSP) melaporkan bahwa saat meminta dokumen tanda terima pada AI Copilot untuk Tahap 1 tahun 2026, AI keliru memberikan jawaban:
1. AI menyatakan bahwa *"di Tahap 1 (Januari–Juni 2026) belum ada pencairan honor guru sama sekali nih. Jadi tanda terimanya memang belum ada untuk periode itu"*.
2. AI secara keliru memanggil pengguna dengan sebutan *"Tante"*.
3. Padahal di sistem database SIKAS (tabel `tanda_terimas` dan BKU Tahap 1 2026) terdapat **27 dokumen Tanda Terima sah dan berstatus Ada** (antara lain upah tukang semprot rumput, sewa tenda, insentif 8 orang panitia kegiatan LDK, insentif pendampingan TKA, insentif operator komputer/dapodik, insentif pelatih ekskul kepramukaan, insentif proktor & teknisi kegiatan TKA, insentif pengawas ujian, dan biaya transportasi LPJ).

### Akar Masalah (Root Cause)
- **Asumsi Sempit pada Prompt**: Prompt Copilot sebelumnya memiliki aturan anti-halusinasi honor guru: *"Pada Tahap I (Januari s.d. Juni 2026) SAMA SEKALI TIDAK ADA pencairan honor guru"*. Akibatnya, saat pengguna meminta "tanda terima tahap 1", AI mengasumsikan tanda terima hanya untuk guru honorer dan secara prematur menyimpulkan Tahap 1 kosong dari tanda terima.
- **Keterbatasan Tool `get_spj_document_detail`**: Tool ini hanya menerima parameter `bulan` dan tidak memiliki parameter `tahap`. Jika dipanggil tanpa bulan untuk mencari dokumen di Tahap 1, pencarian DB mengambil dokumen terbaru (`latest('id')->first()`) yang berada di Tahap 2 (Oktober 2026).
- **Kekeliruan Asumsi Gender Persona**: AI mendeteksi nama perempuan pada penerima honor (Selpianti) dan berasumsi lawan bicaranya adalah wanita sehingga memanggil "Tante".

---

## 2. Sasaran Desain

1. **Koreksi Persona**: Menegaskan di System Prompt Copilot bahwa lawan bicara adalah **Om Moh Gian Darsana** (Bendahara BOSP pria). Sapaan wajib: `"Om"` atau `"Pak Bendahara"`. Dilarang keras menggunakan sapaan `"Tante"`.
2. **Penyajian Lengkap 27 Tanda Terima Tahap 1**:
   - Jika pengguna meminta *"tanda terima tahap 1"* (atau tanda terima periode tertentu tanpa nama spesifik), Copilot memanggil `get_spj_documents_status(tahun: 2026, tahap: 1)`.
   - Copilot **langsung menyajikan seluruh 27 dokumen Tanda Terima riil** yang berstatus `Ada` dalam 1 tabel HTML lengkap tanpa dipotong.
   - Copilot dilarang menyatakan Tahap 1 kosong.
3. **Pembedaan Honor Guru vs Tanda Terima Umum**:
   - Jika pengguna secara khusus menanyakan *"tanda terima honor guru tahap 1"*, Copilot menjelaskan secara santai bahwa akun Belanja Jasa Tenaga Pendidikan (5.1.02.02.01.0013) baru dicairkan di Tahap 2 atas nama Selpianti, namun di Tahap 1 ada 27 dokumen tanda terima sah untuk insentif kepanitiaan/ekskul/upah tukang/transportasi, lalu langsung menyajikan tabel ke-27 tanda terima tersebut.
4. **Ekspansi Parameter Backend**:
   - Menambahkan parameter `tahap` (integer: 1 atau 2) pada schema tool `get_spj_document_detail` dan method backend `getSpjDocumentDetail()` di `CopilotService.php`.
   - Jika `tahap: 1`, query dibatasi pada transaksi `<= 2026-06-30`. Jika `tahap: 2`, dibatasi `>= 2026-07-01`.

---

## 3. Data Riil 27 Tanda Terima Tahap 1 (2026)

Berikut adalah data riil transaksi BKU Tahap 1 yang memiliki dokumen Tanda Terima sah:
1. `007/BOSP/THP-I/2026` (11/03/2026): Sapri Hi Sabe — Upah penyemprotan rumput (Rp 100.000)
2. `008/BOSP/THP-I/2026` (12/03/2026): Sapri Hi Sabe — Sewa Tenda Terpal (Rp 400.000)
3. `010/BOSP/THP-I/2026` (13/03/2026): Dwi Ivana Riandini — Insentif panitia LDK (Rp 100.000)
4. `011/BOSP/THP-I/2026` (13/03/2026): Selpianti — Insentif panitia LDK (Rp 100.000)
5. `012/BOSP/THP-I/2026` (13/03/2026): Umul Magfirah — Insentif panitia LDK (Rp 100.000)
6. `013/BOSP/THP-I/2026` (13/03/2026): Muslimah Sam — Insentif panitia LDK (Rp 100.000)
7. `014/BOSP/THP-I/2026` (13/03/2026): Nurmalasari — Insentif panitia LDK (Rp 100.000)
8. `015/BOSP/THP-I/2026` (13/03/2026): Nurainun — Insentif panitia LDK (Rp 100.000)
9. `016/BOSP/THP-I/2026` (13/03/2026): Husni — Insentif panitia LDK (Rp 100.000)
10. `017/BOSP/THP-I/2026` (13/03/2026): Imran — Insentif panitia LDK (Rp 100.000)
11. `020/BOSP/THP-I/2026` (31/03/2026): Dwi Ivana Riandini — Insentif pendampingan TKA (Rp 300.000)
12. `021/BOSP/THP-I/2026` (31/03/2026): Selpianti — Insentif operator dapodik (Rp 500.000)
13. `022/BOSP/THP-I/2026` (31/03/2026): Imran — Insentif pelatih ekskul pramuka (Rp 300.000)
14. `023/BOSP/THP-I/2026` (31/03/2026): Dra. Masitah Abdullah — Transportasi LPJ (Rp 150.000)
15. `024/BOSP/THP-I/2026` (31/03/2026): Moh Gian Darsana — Insentif proktor TKA (Rp 300.000)
16. `025/BOSP/THP-I/2026` (31/03/2026): Selpianti — Insentif teknisi TKA (Rp 300.000)
17. `028/BOSP/THP-I/2026` (09/04/2026): Moh Gian Darsana — Insentif proktor TKA (Rp 300.000)
18. `029/BOSP/THP-I/2026` (09/04/2026): Selpianti — Insentif teknisi TKA (Rp 300.000)
19. `030/BOSP/THP-I/2026` (09/04/2026): Rafiq — Insentif pengawas ujian TKA (Rp 100.000)
20. `035/BOSP/THP-I/2026` (30/04/2026): Imran — Insentif pelatih ekskul pramuka (Rp 100.000)
21. `036/BOSP/THP-I/2026` (30/04/2026): Sapri Hi Sabe — Upah tukang semprot rumput (Rp 100.000)
22. `037/BOSP/THP-I/2026` (30/04/2026): Selpianti — Insentif operator komputer (Rp 500.000)
23. `044/BOSP/THP-I/2026` (30/05/2026): Imran — Insentif pelatih ekskul pramuka (Rp 100.000)
24. `051/BOSP/THP-I/2026` (19/06/2026): Sapri Hi Sabe — Upah tukang semprot rumput (Rp 100.000)
25. `052/BOSP/THP-I/2026` (30/06/2026): Selpianti — Insentif operator dapodik (Rp 500.000)
26. `053/BOSP/THP-I/2026` (19/06/2026): Imran — Insentif pelatih ekskul pramuka (Rp 100.000)
27. `054/BOSP/THP-I/2026` (30/06/2026): Dra. Masitah Abdullah — Transportasi LPJ (Rp 150.000)

---

## 4. Arsitektur Komponen & Alur Data

```
Pengguna (Chat Copilot): "minta tanda terima tahap 1 2026"
   │
   ▼
Copilot System Prompt (Peraturan Persona: "Om", Anti-Klaim Kosong)
   │
   ▼
Function Calling: `get_spj_documents_status(tahun: 2026, tahap: 1)`
   │
   ▼
Backend `CopilotService::getSpjDocumentsStatus()`
   - Ambil transaksi BKU Tahap 1 (tanggal <= 2026-06-30)
   - Evaluasi relasi `tandaTerima`
   - Kembalikan 27 transaksi dengan kelengkapan.tanda_terima.ada = true
   │
   ▼
Copilot Response Generation:
   - Sapaan hangat: "Siap Om, ini daftar lengkap 27 tanda terima Tahap 1..."
   - Render tabel HTML 27 baris tanpa truncated data
   - Penawaran rincian lembar tanda tangan untuk nomor bukti spesifik
```

---

## 5. Rencana Pengujian

1. **Unit Test**:
   - Memastikan `getSpjDocumentsStatus` mengembalikan tepat 27 dokumen tanda terima berstatus ada pada Tahap 1.
   - Memastikan `getSpjDocumentDetail` menerima parameter `tahap: 1` dan memfilter transaksi dengan benar.
2. **Integration Test (Chat Simulation)**:
   - Menjalankan prompt chat simulasi: *"minta tanda terima tahap 1 2026"*.
   - Memvalidasi respons memuat sapaan "Om", tidak memuat sapaan "Tante", tidak memuat kalimat bahwa Tahap 1 kosong, dan merender 27 baris dokumen tanda terima.
