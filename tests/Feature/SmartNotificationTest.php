<?php

namespace Tests\Feature;

use App\Config\PermissionCatalog;
use App\Models\KinerjaBukuKasUmum;
use App\Models\KinerjaPenganggaran;
use App\Models\KinerjaRkas;
use App\Models\KodeKegiatan;
use App\Models\NotificationDismissal;
use App\Models\RekeningBelanja;
use App\Models\Role;
use App\Models\SilpaBukuKasUmum;
use App\Models\SilpaPenganggaran;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SmartNotificationTest extends TestCase
{
    use RefreshDatabase;

    private function createKinerjaPenganggaran(int $tahun = 2026): KinerjaPenganggaran
    {
        return KinerjaPenganggaran::create([
            'pagu_anggaran' => 45000000,
            'tahun_anggaran' => $tahun,
            'kepala_sekolah' => 'Drs. Kepala Sekolah',
            'nip_kepala_sekolah' => '197001012000011001',
            'sk_kepala_sekolah' => 'SK-KS-01/2026',
            'tanggal_sk_kepala_sekolah' => '2026-01-02',
            'bendahara' => 'Ibu Bendahara',
            'nip_bendahara' => '198001012005012001',
            'sk_bendahara' => 'SK-BD-01/2026',
            'tanggal_sk_bendahara' => '2026-01-02',
            'komite' => 'Ketua Komite',
            'status_persetujuan' => 'draft',
        ]);
    }

    private function createKinerjaRkasItem(KinerjaPenganggaran $penganggaran, string $uraian = 'Belanja ATK Kinerja'): KinerjaRkas
    {
        $kegiatan = KodeKegiatan::create([
            'kode' => '01.01.01',
            'program' => 'Pengembangan Kompetensi',
            'sub_program' => 'Pelaksanaan',
            'uraian' => 'Kegiatan Uji',
        ]);

        $rekening = RekeningBelanja::create([
            'kode_rekening' => '5.1.02.01.01.0024',
            'rincian_objek' => 'Belanja Alat/Bahan untuk Kegiatan Kantor',
            'kategori' => 'Barang dan Jasa',
        ]);

        return KinerjaRkas::create([
            'kinerja_penganggaran_id' => $penganggaran->id,
            'kode_id' => $kegiatan->id,
            'kode_rekening_id' => $rekening->id,
            'uraian' => $uraian,
            'bulan' => 'Januari',
            'jumlah' => 10,
            'satuan' => 'Paket',
            'harga_satuan' => 100000,
        ]);
    }

    public function test_rkas_review_and_resubmit_notify_bendahara_and_kepala_sekolah_across_variants(): void
    {
        $bendahara = User::factory()->create([
            'name' => 'Bendahara Utama',
            'username' => 'bendahara_notif',
            'role' => 'bendahara',
        ]);

        $kepsek = User::factory()->create([
            'name' => 'Kepala Sekolah',
            'username' => 'kepsek_notif',
            'role' => 'kepala_sekolah',
        ]);

        $penganggaran = $this->createKinerjaPenganggaran(2026);
        $rkasItem = $this->createKinerjaRkasItem($penganggaran, 'Pengadaan Modul Pelatihan');

        // 1. Kepala Sekolah meminta revisi pada item RKAS Kinerja
        $storeRes = $this->actingAs($kepsek)
            ->postJson('/kinerja/rkas-review/item', [
                'reviewable_type' => KinerjaRkas::class,
                'reviewable_id' => $rkasItem->id,
                'status' => 'perlu_revisi',
                'catatan' => 'Sesuaikan volume menjadi 5 paket',
            ]);

        $storeRes->assertOk();
        $reviewId = $storeRes->json('review.id');
        $this->assertNotNull($reviewId);

        // Bendahara menerima notifikasi DB dengan variant = kinerja dan action_url ke RKAS Kinerja
        $notifForBendahara = UserNotification::query()
            ->where('user_id', $bendahara->id)
            ->where('type', 'rkas_revision_requested')
            ->first();

        $this->assertNotNull($notifForBendahara);
        $this->assertSame('kinerja', $notifForBendahara->variant);
        $this->assertSame("/kinerja/rkas/{$penganggaran->id}", $notifForBendahara->action_url);
        $this->assertStringContainsString('Sesuaikan volume menjadi 5 paket', $notifForBendahara->message);

        // Pembaruan catatan revisi pada item yang sama TIDAK menduplikasi baris (dedup_key)
        $this->actingAs($kepsek)
            ->postJson('/kinerja/rkas-review/item', [
                'reviewable_type' => KinerjaRkas::class,
                'reviewable_id' => $rkasItem->id,
                'status' => 'perlu_revisi',
                'catatan' => 'Catatan revisi diperbarui',
            ])
            ->assertOk();

        $this->assertSame(
            1,
            UserNotification::query()
                ->where('user_id', $bendahara->id)
                ->where('type', 'rkas_revision_requested')
                ->count()
        );
        $this->assertStringContainsString(
            'Catatan revisi diperbarui',
            $notifForBendahara->fresh()->message
        );

        // 2. Bendahara mengajukan ulang perbaikan (resubmit)
        $this->actingAs($bendahara)
            ->postJson("/kinerja/rkas-review/item/{$reviewId}/resubmit", [
                'tanggapan_bendahara' => 'Volume sudah disesuaikan',
            ])
            ->assertOk();

        // Kepala Sekolah menerima notifikasi resubmit DB + antrean live
        $notifForKepsek = UserNotification::query()
            ->where('user_id', $kepsek->id)
            ->where('type', 'rkas_revision_resubmitted')
            ->first();

        $this->assertNotNull($notifForKepsek);
        $this->assertSame('kinerja', $notifForKepsek->variant);
        $this->assertStringContainsString('Volume sudah disesuaikan', $notifForKepsek->message);

        $kepsekFeed = $this->actingAs($kepsek)
            ->getJson(route('api.notifications.unified'))
            ->assertOk()
            ->json('data');

        $types = collect($kepsekFeed['items'])->pluck('type')->all();
        $this->assertContains('rkas_revision_resubmitted', $types);
        $this->assertContains('live_rkas_pending_rereview', $types);
        $this->assertContains('live_rkas_pending_approval', $types);
    }

    public function test_penganggaran_approve_and_unapprove_notify_bendahara(): void
    {
        $bendahara = User::factory()->create(['role' => 'bendahara']);
        $kepsek = User::factory()->create(['role' => 'kepala_sekolah']);
        $penganggaran = $this->createKinerjaPenganggaran(2026);

        $this->actingAs($kepsek)
            ->postJson("/kinerja/penganggaran/{$penganggaran->id}/approve", [
                'catatan_persetujuan' => 'Disetujui sesuai hasil rapat',
            ])
            ->assertOk();

        $approvedNotif = UserNotification::query()
            ->where('user_id', $bendahara->id)
            ->latest('id')
            ->first();

        $this->assertNotNull($approvedNotif);
        $this->assertSame('rkas_approved', $approvedNotif->type);
        $this->assertSame('kinerja', $approvedNotif->variant);
        $this->assertStringContainsString('Disetujui sesuai hasil rapat', $approvedNotif->message);

        $this->actingAs($kepsek)
            ->postJson("/kinerja/penganggaran/{$penganggaran->id}/unapprove")
            ->assertOk();

        $unapprovedNotif = UserNotification::query()
            ->where('user_id', $bendahara->id)
            ->latest('id')
            ->first();

        $this->assertNotNull($unapprovedNotif);
        $this->assertSame('rkas_unapproved', $unapprovedNotif->type);
        $this->assertSame('/kinerja/penganggaran', $unapprovedNotif->action_url);
    }

    public function test_pajak_notifications_span_all_variants_and_respect_role_awareness(): void
    {
        $bendahara = User::factory()->create(['role' => 'bendahara']);
        $kepsek = User::factory()->create(['role' => 'kepala_sekolah']);

        Role::create([
            'slug' => 'tanpa_bku',
            'name' => 'Tanpa BKU',
            'is_system' => false,
            'permissions' => PermissionCatalog::defaultPermissionsForRole('tanpa_bku'),
        ]);
        $limitedUser = User::factory()->create(['role' => 'tanpa_bku']);

        $kinerjaPenganggaran = $this->createKinerjaPenganggaran(2026);
        KinerjaBukuKasUmum::create([
            'kinerja_penganggaran_id' => $kinerjaPenganggaran->id,
            'tanggal_transaksi' => '2026-04-15',
            'jenis_transaksi' => 'tunai',
            'uraian' => 'Honor Narasumber Kinerja',
            'pajak' => 'PPh 21',
            'persen_pajak' => 5,
            'total_pajak' => 250000,
            'ntpn' => null,
        ]);

        $silpaPenganggaran = SilpaPenganggaran::create([
            'pagu_anggaran' => 10000000,
            'tahun_anggaran' => 2026,
            'kepala_sekolah' => 'Drs. Kepala Sekolah',
            'nip_kepala_sekolah' => '197001012000011001',
            'sk_kepala_sekolah' => 'SK-KS-02/2026',
            'tanggal_sk_kepala_sekolah' => '2026-01-02',
            'bendahara' => 'Ibu Bendahara',
            'nip_bendahara' => '198001012005012001',
            'sk_bendahara' => 'SK-BD-02/2026',
            'tanggal_sk_bendahara' => '2026-01-02',
            'komite' => 'Ketua Komite',
        ]);

        SilpaBukuKasUmum::create([
            'silpa_penganggaran_id' => $silpaPenganggaran->id,
            'tanggal_transaksi' => '2026-05-10',
            'jenis_transaksi' => 'non-tunai',
            'uraian' => 'Pembelian ATK SiLPA',
            'pajak' => 'PPN',
            'persen_pajak' => 11,
            'total_pajak' => 110000,
            'ntpn' => 'NTPN-SILPA-001',
        ]);

        // Bendahara melihat kedua varian + show_pajak_reminder = true
        $bendaharaFeed = $this->actingAs($bendahara)
            ->getJson(route('api.notifications.unified'))
            ->assertOk()
            ->json('data');

        $this->assertTrue($bendaharaFeed['can_view_pajak']);
        $this->assertTrue($bendaharaFeed['show_pajak_reminder']);
        $this->assertSame(2, $bendaharaFeed['counts']['pajak']);

        $pajakItems = collect($bendaharaFeed['items'])->where('category', 'pajak')->values();
        $kinerjaItem = $pajakItems->firstWhere('variant', 'kinerja');
        $silpaItem = $pajakItems->firstWhere('variant', 'silpa');

        $this->assertNotNull($kinerjaItem);
        $this->assertSame('terima_pajak', $kinerjaItem['type']);
        $this->assertSame('/kinerja/penatausahaan/bku/2026/4', $kinerjaItem['action_url']);

        $this->assertNotNull($silpaItem);
        $this->assertSame('setor_pajak', $silpaItem['type']);
        $this->assertSame('/silpa/penatausahaan/bku/2026/5', $silpaItem['action_url']);

        // Kepala Sekolah melihat tab pajak (read-only), tetapi show_pajak_reminder = false
        $kepsekFeed = $this->actingAs($kepsek)
            ->getJson(route('api.notifications.unified'))
            ->assertOk()
            ->json('data');

        $this->assertTrue($kepsekFeed['can_view_pajak']);
        $this->assertFalse($kepsekFeed['show_pajak_reminder']);

        // Role tanpa akses penatausahaan tidak melihat tab pajak
        $limitedFeed = $this->actingAs($limitedUser)
            ->getJson(route('api.notifications.unified'))
            ->assertOk()
            ->json('data');

        $this->assertFalse($limitedFeed['can_view_pajak']);
        $this->assertFalse($limitedFeed['show_pajak_reminder']);
        $this->assertSame(0, $limitedFeed['counts']['pajak']);
    }

    public function test_mark_read_and_mark_all_read_persist_in_database_and_keep_unpaid_pajak(): void
    {
        $bendahara = User::factory()->create(['role' => 'bendahara']);
        $otherUser = User::factory()->create(['role' => 'bendahara']);

        $ownNotif = UserNotification::create([
            'user_id' => $bendahara->id,
            'actor_name' => 'Kepala Sekolah',
            'category' => 'workflow',
            'type' => 'rkas_approved',
            'variant' => 'reguler',
            'title' => 'Penganggaran RKAS Disahkan',
            'message' => 'RKAS TA 2026 disahkan.',
            'action_url' => '/penganggaran',
        ]);

        $otherNotif = UserNotification::create([
            'user_id' => $otherUser->id,
            'actor_name' => 'Kepala Sekolah',
            'category' => 'workflow',
            'type' => 'rkas_approved',
            'variant' => 'reguler',
            'title' => 'Notif Milik User Lain',
            'message' => 'Tidak boleh ditandai user lain.',
            'action_url' => '/penganggaran',
        ]);

        $kinerjaPenganggaran = $this->createKinerjaPenganggaran(2026);
        KinerjaBukuKasUmum::create([
            'kinerja_penganggaran_id' => $kinerjaPenganggaran->id,
            'tanggal_transaksi' => '2026-06-12',
            'jenis_transaksi' => 'tunai',
            'uraian' => 'Pajak Belum Disetor',
            'pajak' => 'PPh 21',
            'total_pajak' => 50000,
            'ntpn' => null,
        ]);
        KinerjaBukuKasUmum::create([
            'kinerja_penganggaran_id' => $kinerjaPenganggaran->id,
            'tanggal_transaksi' => '2026-07-12',
            'jenis_transaksi' => 'tunai',
            'uraian' => 'Pajak Sudah Disetor',
            'pajak' => 'PPh 21',
            'total_pajak' => 75000,
            'ntpn' => 'NTPN-777',
        ]);

        // Tidak bisa menandai notifikasi milik user lain
        $this->actingAs($bendahara)
            ->postJson(route('api.notifications.read'), ['db_id' => $otherNotif->id])
            ->assertOk()
            ->assertJson(['updated' => false]);
        $this->assertNull($otherNotif->fresh()->read_at);

        // Tandai 1 notifikasi workflow milik sendiri
        $this->actingAs($bendahara)
            ->postJson(route('api.notifications.read'), ['db_id' => $ownNotif->id])
            ->assertOk()
            ->assertJson(['updated' => true]);
        $this->assertNotNull($ownNotif->fresh()->read_at);

        // Mark all as read mendismiss setor_pajak tapi tetap mempertahankan terima_pajak
        $this->actingAs($bendahara)
            ->postJson(route('api.notifications.read-all'), ['category' => 'all'])
            ->assertOk();

        $this->assertTrue(
            NotificationDismissal::query()
                ->where('user_id', $bendahara->id)
                ->where('notification_key', 'setor_pajak:kinerja:2026:7')
                ->exists()
        );

        $afterFeed = $this->actingAs($bendahara)
            ->getJson(route('api.notifications.unified'))
            ->assertOk()
            ->json('data');

        $this->assertSame(1, $afterFeed['counts']['pajak']);
        $this->assertSame('terima_pajak', $afterFeed['items'][0]['type']);
    }

    public function test_pajak_details_supports_variant_parameter_and_enforces_penatausahaan_permission(): void
    {
        $bendahara = User::factory()->create(['role' => 'bendahara']);

        Role::create([
            'slug' => 'tanpa_pajak',
            'name' => 'Tanpa Pajak',
            'is_system' => false,
            'permissions' => PermissionCatalog::defaultPermissionsForRole('tanpa_pajak'),
        ]);
        $limitedUser = User::factory()->create(['role' => 'tanpa_pajak']);

        $kinerjaPenganggaran = $this->createKinerjaPenganggaran(2026);
        KinerjaBukuKasUmum::create([
            'kinerja_penganggaran_id' => $kinerjaPenganggaran->id,
            'tanggal_transaksi' => '2026-08-20',
            'jenis_transaksi' => 'tunai',
            'uraian' => 'Belanja Konsumsi Pelatihan Kinerja',
            'pajak' => 'PPh 23',
            'persen_pajak' => 2,
            'total_pajak' => 80000,
            'ntpn' => null,
        ]);

        // User tanpa akses penatausahaan mendapat 403
        $this->actingAs($limitedUser)
            ->getJson('/api/notifications/pajak/details?type=terima_pajak&month=8&year=2026&variant=kinerja')
            ->assertForbidden();

        // Bendahara mendapat detail dari tabel kinerja_buku_kas_umums
        $res = $this->actingAs($bendahara)
            ->getJson('/api/notifications/pajak/details?type=terima_pajak&month=8&year=2026&variant=kinerja')
            ->assertOk()
            ->json();

        $this->assertTrue($res['success']);
        $this->assertSame('kinerja', $res['variant']);
        $this->assertSame('BOSP Kinerja', $res['variant_label']);
        $this->assertCount(1, $res['data']);
        $this->assertStringContainsString('Belanja Konsumsi Pelatihan Kinerja', $res['data'][0]['uraian']);
    }

    public function test_review_whitelist_transition_dedup_and_single_pajak_dismissal_rbac(): void
    {
        $bendahara = User::factory()->create(['role' => 'bendahara']);
        $kepsek = User::factory()->create(['role' => 'kepala_sekolah']);

        Role::create([
            'slug' => 'tanpa_bku_dismiss',
            'name' => 'Tanpa BKU Dismiss',
            'is_system' => false,
            'permissions' => PermissionCatalog::defaultPermissionsForRole('tanpa_bku_dismiss'),
        ]);
        $limitedUser = User::factory()->create(['role' => 'tanpa_bku_dismiss']);

        // 1. RkasReviewController::store menolak kelas non-RKAS (keamanan whitelist)
        $this->actingAs($kepsek)
            ->postJson('/rkas-review/item', [
                'reviewable_type' => User::class,
                'reviewable_id' => $bendahara->id,
                'status' => 'perlu_revisi',
            ])
            ->assertStatus(422);

        // 2. Transisi perlu_revisi -> disetujui menggantikan notifikasi unread & reset read_at = null
        $penganggaran = $this->createKinerjaPenganggaran(2026);
        $rkasItem = $this->createKinerjaRkasItem($penganggaran, 'Item Uji Transisi');

        $this->actingAs($kepsek)
            ->postJson('/kinerja/rkas-review/item', [
                'reviewable_type' => KinerjaRkas::class,
                'reviewable_id' => $rkasItem->id,
                'status' => 'perlu_revisi',
                'catatan' => 'Revisi awal',
            ])
            ->assertOk();

        // Bendahara melihat live_rkas_needs_revision sebelum disetujui/resubmit
        $bendaharaFeed = $this->actingAs($bendahara)
            ->getJson(route('api.notifications.unified'))
            ->assertOk()
            ->json('data');
        $this->assertContains('live_rkas_needs_revision', collect($bendaharaFeed['items'])->pluck('type')->all());

        $notif = UserNotification::query()->where('user_id', $bendahara->id)->firstOrFail();
        $notif->update(['read_at' => now()]);

        // Kepsek mengubah status menjadi disetujui -> notif yang sama diperbarui & read_at kembali null
        $this->actingAs($kepsek)
            ->postJson('/kinerja/rkas-review/item', [
                'reviewable_type' => KinerjaRkas::class,
                'reviewable_id' => $rkasItem->id,
                'status' => 'disetujui',
                'catatan' => 'Sudah oke',
            ])
            ->assertOk();

        $this->assertSame(1, UserNotification::query()->where('user_id', $bendahara->id)->count());
        $freshNotif = $notif->fresh();
        $this->assertSame('rkas_item_approved', $freshNotif->type);
        $this->assertNull($freshNotif->read_at);

        // 3. Single-item setor_pajak dismissal via POST /api/notifications/read + proteksi RBAC
        $this->actingAs($limitedUser)
            ->postJson(route('api.notifications.read'), [
                'notification_key' => 'setor_pajak:kinerja:2026:7',
            ])
            ->assertForbidden();

        $this->actingAs($bendahara)
            ->postJson(route('api.notifications.read'), [
                'notification_key' => 'setor_pajak:kinerja:2026:7',
            ])
            ->assertOk()
            ->assertJson(['updated' => true]);

        $this->assertTrue(
            NotificationDismissal::query()
                ->where('user_id', $bendahara->id)
                ->where('notification_key', 'setor_pajak:kinerja:2026:7')
                ->exists()
        );
    }
}
