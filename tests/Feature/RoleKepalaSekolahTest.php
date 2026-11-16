<?php

namespace Tests\Feature;

use App\Models\BukuKasUmum;
use App\Models\BukuKasUmumUraianDetail;
use App\Models\KodeKegiatan;
use App\Models\Penganggaran;
use App\Models\RekeningBelanja;
use App\Models\Rkas;
use App\Models\RkasItemReview;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoleKepalaSekolahTest extends TestCase
{
    use RefreshDatabase;

    protected User $bendahara;

    protected User $kepsek;

    protected function setUp(): void
    {
        parent::setUp();

        $this->bendahara = User::factory()->create([
            'username' => 'bendahara_utama',
            'role' => 'bendahara',
        ]);

        $this->kepsek = User::factory()->create([
            'username' => 'kepsek_resmi',
            'role' => 'kepala_sekolah',
        ]);
    }

    public function test_bendahara_can_create_kepala_sekolah_user(): void
    {
        $response = $this
            ->actingAs($this->bendahara)
            ->from('/profile')
            ->post('/user-management', [
                'name' => 'Dr. H. Ahmad Sudrajat, M.Pd.',
                'username' => 'kepsek_ahmad',
                'email' => 'ahmad@sekolah.sch.id',
                'password' => 'Password123!',
                'password_confirmation' => 'Password123!',
                'role' => 'kepala_sekolah',
            ]);

        $response->assertRedirect('/profile');
        $this->assertDatabaseHas('users', [
            'username' => 'kepsek_ahmad',
            'role' => 'kepala_sekolah',
        ]);
    }

    public function test_bendahara_can_update_and_delete_kepala_sekolah_user(): void
    {
        $targetUser = User::factory()->create([
            'username' => 'kepsek_lama',
            'role' => 'kepala_sekolah',
            'name' => 'Old Name',
        ]);

        $updateResponse = $this
            ->actingAs($this->bendahara)
            ->from('/profile')
            ->put("/user-management/{$targetUser->id}", [
                'name' => 'Updated Kepsek Name',
                'username' => 'kepsek_baru',
                'email' => 'kepsek_baru@sekolah.sch.id',
                'role' => 'kepala_sekolah',
            ]);

        $updateResponse->assertRedirect('/profile');
        $this->assertDatabaseHas('users', [
            'id' => $targetUser->id,
            'name' => 'Updated Kepsek Name',
            'username' => 'kepsek_baru',
        ]);

        $deleteResponse = $this
            ->actingAs($this->bendahara)
            ->from('/profile')
            ->delete("/user-management/{$targetUser->id}");

        $deleteResponse->assertRedirect('/profile');
        $this->assertDatabaseMissing('users', [
            'id' => $targetUser->id,
        ]);
    }

    public function test_kepala_sekolah_cannot_access_user_management(): void
    {
        // GET /user-management should be blocked (403 Forbidden)
        $responseGet = $this
            ->actingAs($this->kepsek)
            ->get('/user-management');

        $responseGet->assertForbidden();

        // POST /user-management should be blocked (403 Forbidden)
        $responsePost = $this
            ->actingAs($this->kepsek)
            ->post('/user-management', [
                'name' => 'Another User',
                'username' => 'another_user',
                'email' => 'another@example.com',
                'password' => 'password123',
                'password_confirmation' => 'password123',
                'role' => 'kepala_sekolah',
            ]);

        $responsePost->assertForbidden();
    }

    public function test_kepala_sekolah_cannot_mutate_rkas(): void
    {
        // Mutating RKAS via POST /rkas/1 should be blocked by PreventKepalaSekolahMutations
        $response = $this
            ->actingAs($this->kepsek)
            ->post('/rkas/1', [
                'uraian' => 'Mencoba merubah belanja',
            ]);

        $response->assertForbidden();
    }

    public function test_kepala_sekolah_can_review_rkas_item(): void
    {
        $response = $this
            ->actingAs($this->kepsek)
            ->postJson('/rkas-review/item', [
                'reviewable_type' => 'App\Models\Rkas',
                'reviewable_id' => 999,
                'status' => 'perlu_revisi',
                'catatan' => 'Mohon kurangi volume ATK sebanyak 2 rim.',
            ]);

        $response->assertOk();
        $response->assertJson([
            'success' => true,
        ]);

        $this->assertDatabaseHas('rkas_item_reviews', [
            'reviewable_type' => 'App\Models\Rkas',
            'reviewable_id' => 999,
            'user_id' => $this->kepsek->id,
            'status' => 'perlu_revisi',
            'catatan' => 'Mohon kurangi volume ATK sebanyak 2 rim.',
        ]);
    }

    public function test_kepala_sekolah_can_delete_their_review(): void
    {
        $review = RkasItemReview::create([
            'user_id' => $this->kepsek->id,
            'reviewable_type' => 'App\Models\Rkas',
            'reviewable_id' => 888,
            'status' => 'disetujui',
            'catatan' => 'OK disetujui',
        ]);

        $response = $this
            ->actingAs($this->kepsek)
            ->deleteJson("/rkas-review/item/{$review->id}");

        $response->assertOk();
        $response->assertJson([
            'success' => true,
        ]);

        $this->assertDatabaseMissing('rkas_item_reviews', [
            'id' => $review->id,
        ]);
    }

    public function test_kepala_sekolah_can_approve_and_unapprove_penganggaran(): void
    {
        $penganggaran = Penganggaran::create([
            'pagu_anggaran' => 50000000,
            'tahun_anggaran' => 2026,
            'kepala_sekolah' => 'Nama Kepsek',
            'sk_kepala_sekolah' => 'SK-001',
            'bendahara' => 'Nama Bendahara',
            'sk_bendahara' => 'SK-002',
            'komite' => 'Nama Komite',
            'nip_kepala_sekolah' => '198001012005011001',
            'nip_bendahara' => '198501012010012002',
            'tanggal_sk_kepala_sekolah' => '2026-01-02',
            'tanggal_sk_bendahara' => '2026-01-02',
        ]);

        // Approve
        $approveResponse = $this
            ->actingAs($this->kepsek)
            ->post("/penganggaran/{$penganggaran->id}/approve", [
                'catatan_persetujuan' => 'RKAS telah ditelaah dan disetujui untuk dilaksanakan.',
            ]);

        $approveResponse->assertRedirect();

        $penganggaran->refresh();
        $this->assertSame('disetujui', $penganggaran->status_persetujuan);
        $this->assertEquals($this->kepsek->id, $penganggaran->persetujuan_oleh);
        $this->assertNotNull($penganggaran->tanggal_persetujuan);
        $this->assertSame('RKAS telah ditelaah dan disetujui untuk dilaksanakan.', $penganggaran->catatan_persetujuan);

        // Unapprove
        $unapproveResponse = $this
            ->actingAs($this->kepsek)
            ->post("/penganggaran/{$penganggaran->id}/unapprove");

        $unapproveResponse->assertRedirect();

        $penganggaran->refresh();
        $this->assertSame('draft', $penganggaran->status_persetujuan);
        $this->assertNull($penganggaran->persetujuan_oleh);
        $this->assertNull($penganggaran->tanggal_persetujuan);
    }

    public function test_bendahara_cannot_approve_penganggaran(): void
    {
        $penganggaran = Penganggaran::create([
            'pagu_anggaran' => 50000000,
            'tahun_anggaran' => 2026,
            'kepala_sekolah' => 'Nama Kepsek',
            'sk_kepala_sekolah' => 'SK-001',
            'bendahara' => 'Nama Bendahara',
            'sk_bendahara' => 'SK-002',
            'komite' => 'Nama Komite',
            'nip_kepala_sekolah' => '198001012005011001',
            'nip_bendahara' => '198501012010012002',
            'tanggal_sk_kepala_sekolah' => '2026-01-02',
            'tanggal_sk_bendahara' => '2026-01-02',
        ]);

        $response = $this
            ->actingAs($this->bendahara)
            ->post("/penganggaran/{$penganggaran->id}/approve", [
                'catatan_persetujuan' => 'Mencoba approve sebagai bendahara',
            ]);

        $response->assertForbidden();
    }

    public function test_bendahara_can_create_kepala_sekolah_with_nip_containing_spaces(): void
    {
        $response = $this
            ->actingAs($this->bendahara)
            ->from('/profile')
            ->post('/user-management', [
                'name' => 'Drs. H. Mulyadi, M.Pd.',
                'username' => '19750512 200003 1 002',
                'email' => '',
                'password' => 'Password123!',
                'password_confirmation' => 'Password123!',
                'role' => 'kepala_sekolah',
            ]);

        $response->assertRedirect('/profile');
        // Space should be stripped into clean NIP digits
        $this->assertDatabaseHas('users', [
            'username' => '197505122000031002',
            'role' => 'kepala_sekolah',
        ]);
    }

    public function test_bendahara_can_create_kepala_sekolah_with_email_as_username_and_empty_email(): void
    {
        $response = $this
            ->actingAs($this->bendahara)
            ->from('/profile')
            ->post('/user-management', [
                'name' => 'Dra. Hj. Siti Rohmah, M.Si.',
                'username' => 'siti.rohmah@sekolah.sch.id',
                'email' => '',
                'password' => 'Password123!',
                'password_confirmation' => 'Password123!',
                'role' => 'kepala_sekolah',
            ]);

        $response->assertRedirect('/profile');
        // Both username and email should be saved as siti.rohmah@sekolah.sch.id
        $this->assertDatabaseHas('users', [
            'username' => 'siti.rohmah@sekolah.sch.id',
            'email' => 'siti.rohmah@sekolah.sch.id',
            'role' => 'kepala_sekolah',
        ]);
    }

    public function test_user_can_login_using_nip_with_spaces_or_email(): void
    {
        $user = User::factory()->create([
            'username' => '198501012010011005',
            'email' => 'kepsek.digital@sekolah.sch.id',
            'password' => bcrypt('SecretPass123!'),
            'role' => 'kepala_sekolah',
        ]);

        // Login using NIP with spaces
        $responseNip = $this->post('/login', [
            'username' => '19850101 201001 1 005',
            'password' => 'SecretPass123!',
        ]);

        $responseNip->assertRedirect('/dashboard');
        $this->assertAuthenticatedAs($user);

        // Logout
        $this->post('/logout');
        $this->assertGuest();

        // Login using Email
        $responseEmail = $this->post('/login', [
            'username' => 'kepsek.digital@sekolah.sch.id',
            'password' => 'SecretPass123!',
        ]);

        $responseEmail->assertRedirect('/dashboard');
        $this->assertAuthenticatedAs($user);
    }

    public function test_rkas_index_includes_approval_and_item_reviews_props(): void
    {
        $penganggaran = Penganggaran::create([
            'pagu_anggaran' => 50000000,
            'tahun_anggaran' => 2026,
            'kepala_sekolah' => 'Nama Kepsek',
            'sk_kepala_sekolah' => 'SK-001',
            'bendahara' => 'Nama Bendahara',
            'sk_bendahara' => 'SK-002',
            'komite' => 'Nama Komite',
            'nip_kepala_sekolah' => '198001012005011001',
            'nip_bendahara' => '198501012010012002',
            'tanggal_sk_kepala_sekolah' => '2026-01-02',
            'tanggal_sk_bendahara' => '2026-01-02',
            'status_persetujuan' => 'disetujui',
            'persetujuan_oleh' => $this->kepsek->id,
            'tanggal_persetujuan' => now(),
            'catatan_persetujuan' => 'Disahkan untuk tahun anggaran 2026',
        ]);

        $kegiatan = KodeKegiatan::create([
            'kode' => '03.03.19',
            'program' => 'Pengembangan Standar Proses',
            'sub_program' => 'Pelaksanaan Kegiatan Pembelajaran',
            'uraian' => 'Belanja ATK',
        ]);

        $rekening = RekeningBelanja::create([
            'kode_rekening' => '5.1.02.01.01.0024',
            'rincian_objek' => 'Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor',
            'kategori' => 'Barang dan Jasa',
        ]);

        $rkasItem = Rkas::create([
            'penganggaran_id' => $penganggaran->id,
            'kode_id' => $kegiatan->id,
            'kode_rekening_id' => $rekening->id,
            'uraian' => 'Kertas HVS F4 80gr',
            'harga_satuan' => 55000,
            'bulan' => 'Januari',
            'jumlah' => 10,
            'satuan' => 'Rim',
        ]);

        RkasItemReview::create([
            'user_id' => $this->kepsek->id,
            'reviewable_type' => Rkas::class,
            'reviewable_id' => $rkasItem->id,
            'status' => 'perlu_revisi',
            'catatan' => 'Sesuaikan harga satuan dengan SSH terbaru',
        ]);

        $response = $this
            ->actingAs($this->kepsek)
            ->get("/rkas/{$penganggaran->id}");

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Penganggaran/Rkas/Index')
            ->where('anggaran.status_persetujuan', 'disetujui')
            ->where('anggaran.persetujuan_user.name', $this->kepsek->name)
            ->where('anggaran.catatan_persetujuan', 'Disahkan untuk tahun anggaran 2026')
            ->where('items.0.reviewable_type', Rkas::class)
            ->where('items.0.review.status', 'perlu_revisi')
            ->where('items.0.review.catatan', 'Sesuaikan harga satuan dengan SSH terbaru')
        );
    }

    public function test_kepala_sekolah_cannot_review_fully_spent_rkas_item(): void
    {
        $penganggaran = Penganggaran::create([
            'pagu_anggaran' => 50000000,
            'tahun_anggaran' => 2026,
            'kepala_sekolah' => 'Nama Kepsek',
            'sk_kepala_sekolah' => 'SK-001',
            'bendahara' => 'Nama Bendahara',
            'sk_bendahara' => 'SK-002',
            'komite' => 'Nama Komite',
            'nip_kepala_sekolah' => '198001012005011001',
            'nip_bendahara' => '198501012010012002',
            'tanggal_sk_kepala_sekolah' => '2026-01-02',
            'tanggal_sk_bendahara' => '2026-01-02',
        ]);

        $kegiatan = KodeKegiatan::create([
            'kode' => '03.03.19',
            'program' => 'Pengembangan Standar Proses',
            'sub_program' => 'Pelaksanaan Kegiatan Pembelajaran',
            'uraian' => 'Belanja ATK',
        ]);

        $rekening = RekeningBelanja::create([
            'kode_rekening' => '5.1.02.01.01.0024',
            'rincian_objek' => 'Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor',
            'kategori' => 'Barang dan Jasa',
        ]);

        $rkasItem = Rkas::create([
            'penganggaran_id' => $penganggaran->id,
            'kode_id' => $kegiatan->id,
            'kode_rekening_id' => $rekening->id,
            'uraian' => 'Kertas HVS F4 80gr',
            'harga_satuan' => 55000,
            'bulan' => 'Januari',
            'jumlah' => 10,
            'satuan' => 'Rim',
        ]);

        $bku = BukuKasUmum::create([
            'penganggaran_id' => $penganggaran->id,
            'kode_kegiatan_id' => $kegiatan->id,
            'rekening_belanja_id' => $rekening->id,
            'tanggal_transaksi' => '2026-01-15',
            'jenis_transaksi' => 'tunai',
            'uraian' => 'Belanja ATK',
            'total_transaksi_kotor' => 550000,
        ]);

        BukuKasUmumUraianDetail::create([
            'buku_kas_umum_id' => $bku->id,
            'penganggaran_id' => $penganggaran->id,
            'rkas_id' => $rkasItem->id,
            'kode_kegiatan_id' => $kegiatan->id,
            'rekening_belanja_id' => $rekening->id,
            'uraian' => 'Kertas HVS F4 80gr',
            'satuan' => 'Rim',
            'harga_satuan' => 55000,
            'volume' => 10,
            'subtotal' => 550000,
        ]);

        $response = $this
            ->actingAs($this->kepsek)
            ->postJson('/rkas-review/item', [
                'reviewable_type' => Rkas::class,
                'reviewable_id' => $rkasItem->id,
                'status' => 'perlu_revisi',
                'catatan' => 'Mencoba menelaah belanja yang sudah terbelanja penuh',
            ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'message' => 'Belanja ini sudah terealisasi penuh pada BKU sehingga tidak dapat ditelaah.',
            ]);
    }

    public function test_bendahara_can_update_rkas_preserving_review_and_resubmit_to_kepala_sekolah(): void
    {
        $penganggaran = Penganggaran::create([
            'pagu_anggaran' => 50000000,
            'tahun_anggaran' => 2026,
            'kepala_sekolah' => 'Nama Kepsek',
            'sk_kepala_sekolah' => 'SK-001',
            'bendahara' => 'Nama Bendahara',
            'sk_bendahara' => 'SK-002',
            'komite' => 'Nama Komite',
            'nip_kepala_sekolah' => '198001012005011001',
            'nip_bendahara' => '198501012010012002',
            'tanggal_sk_kepala_sekolah' => '2026-01-02',
            'tanggal_sk_bendahara' => '2026-01-02',
        ]);

        $kegiatan = KodeKegiatan::create([
            'kode' => '03.03.19',
            'program' => 'Pengembangan Standar Proses',
            'sub_program' => 'Pelaksanaan Kegiatan Pembelajaran',
            'uraian' => 'Belanja ATK',
        ]);

        $rekening = RekeningBelanja::create([
            'kode_rekening' => '5.1.02.01.01.0024',
            'rincian_objek' => 'Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor',
            'kategori' => 'Barang dan Jasa',
        ]);

        $rkasItem = Rkas::create([
            'penganggaran_id' => $penganggaran->id,
            'kode_id' => $kegiatan->id,
            'kode_rekening_id' => $rekening->id,
            'uraian' => 'Kertas HVS F4 80gr',
            'harga_satuan' => 55000,
            'bulan' => 'Januari',
            'jumlah' => 10,
            'satuan' => 'Rim',
        ]);

        // 1. Kepala Sekolah memberikan telaah perlu_revisi
        $review = RkasItemReview::create([
            'user_id' => $this->kepsek->id,
            'reviewable_type' => Rkas::class,
            'reviewable_id' => $rkasItem->id,
            'status' => 'perlu_revisi',
            'catatan' => 'Kurangi volume menjadi 5 Rim',
        ]);

        // 2. Bendahara mengedit grup RKAS (volume dikurangi menjadi 5 Rim)
        $updateResponse = $this
            ->actingAs($this->bendahara)
            ->post('/rkas/update-group', [
                'original_id' => $rkasItem->id,
                'kegiatan_id' => $kegiatan->id,
                'rekening_id' => $rekening->id,
                'uraian' => 'Kertas HVS F4 80gr',
                'harga_satuan' => 55000,
                'alokasi' => [
                    [
                        'month' => 'Januari',
                        'quantity' => 5,
                        'unit' => 'Rim',
                    ],
                ],
            ]);

        $updateResponse->assertRedirect();

        $newRkasItem = Rkas::where('penganggaran_id', $penganggaran->id)
            ->where('bulan', 'Januari')
            ->firstOrFail();

        // Pastikan review otomatis terhubung ke ID baris RKAS yang baru
        $review->refresh();
        $this->assertEquals($newRkasItem->id, $review->reviewable_id);
        $this->assertSame('perlu_revisi', $review->status);

        // 3. Bendahara mengajukan kembali perbaikan kepada Kepala Sekolah
        $resubmitResponse = $this
            ->actingAs($this->bendahara)
            ->postJson("/rkas-review/item/{$review->id}/resubmit", [
                'tanggapan_bendahara' => 'Volume sudah disesuaikan menjadi 5 Rim sesuai arahan.',
            ]);

        $resubmitResponse->assertOk()
            ->assertJson([
                'success' => true,
            ]);

        $review->refresh();
        $this->assertSame('sudah_diperbaiki', $review->status);
        $this->assertSame('Volume sudah disesuaikan menjadi 5 Rim sesuai arahan.', $review->tanggapan_bendahara);
        $this->assertNotNull($review->revisi_diajukan_at);
    }
}
