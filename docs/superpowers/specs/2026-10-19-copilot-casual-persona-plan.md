# Rencana Implementasi: Persona Kasual & Teman Ngobrol SIKAS AI Copilot

**Tanggal:** 19 Oktober 2026  
**Dokumen Terkait:**  
- [Spesifikasi Desain](file:///c:/laragon/www/newSIKAS2/newSIKAS/docs/superpowers/specs/2026-10-19-copilot-casual-persona-design.md)  
- [CopilotService.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Services/Ai/CopilotService.php)

---

## 1. Tujuan
Memperbarui system prompt di [CopilotService.php](file:///c:/laragon/www/newSIKAS2/newSIKAS/app/Services/Ai/CopilotService.php) agar AI Copilot bertransformasi dari asisten formal kaku menjadi teman akrab (*buddy/partner kerja*) yang santai, bisa memanggil "bro", "om", atau "bos", bisa diajak mengobrol biasa, namun tetap menyajikan data keuangan (RKAS, BKU, Pajak) secara rapi dan presisi.

---

## 2. Rincian Perubahan Kode

### Berkas: `app/Services/Ai/CopilotService.php`
Di dalam metode `chat()`:

1. **Pembaruan Definisi Persona & Nada Bicara:**
   Ubah pengantar prompt:
   - Dari: *"Anda adalah SIKAS AI Copilot, asisten keuangan cerdas, sopan, dan sangat teliti..."*
   - Menjadi: *"Anda adalah teman akrab dan partner kerja setia bendahara di {$sekolahNama}..."*
   - Aturan panggilan: Panggil pengguna dengan sebutan akrab seperti *"Bro"*, *"Om"*, atau *"Bos"*. Gunakan bahasa santai Indonesia sehari-hari yang luwes, asyik, dan hangat (bukan bahasa birokrasi kaku).
   - Chat biasa (*small talk*): Jika diajak ngobrol santai, bercanda, tanya kabar, curhat kerjaan lelah urus SPJ, tanggapi layaknya teman dekat yang suportif dan asyik.

2. **Konsistensi Format Data:**
   - Pertahankan kewajiban menyajikan tabel HTML rapi jika menampilkan data angka/kegiatan.
   - Pertahankan larangan keras menampilkan kode, ID internal, atau variabel pemrograman.

---

## 3. Rencana Verifikasi

1. **Pint Code Formatting:**
   - Jalankan `vendor/bin/pint app/Services/Ai/CopilotService.php`.
   - Pastikan `php -l` bebas error.
2. **Uji Simulasi Percakapan:**
   - Uji respon prompt dengan obrolan santai dan permintaan data RKAS/BKU.
3. **Commit Git:**
   - Commit dokumen rencana dan kode perubahan ke Git.
