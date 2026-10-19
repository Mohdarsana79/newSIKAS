import sqlite3
import json
import sys
import os
import glob
import traceback

def find_arkas_db(manual_path=None):
    """
    Mencari file arkas.db secara dinamis.
    Jika manual_path diberikan, gunakan itu dulu.
    """
    if manual_path:
        manual_path = manual_path.strip().strip('"').strip("'")
        if os.path.exists(manual_path):
            return manual_path

    # Strategi 1: Dari APPDATA environment variable
    appdata = os.environ.get('APPDATA', '')
    if appdata:
        path = os.path.join(appdata, 'Arkas', 'arkas.db')
        if os.path.exists(path):
            return path

    # Strategi 2: Dari USERPROFILE + AppData/Roaming
    userprofile = os.environ.get('USERPROFILE', '')
    if userprofile:
        path = os.path.join(userprofile, 'AppData', 'Roaming', 'Arkas', 'arkas.db')
        if os.path.exists(path):
            return path

    # Strategi 3: Glob ke semua folder pengguna
    system_drive = os.environ.get('SystemDrive', 'C:')
    patterns = [
        os.path.join(system_drive, 'Users', '*', 'AppData', 'Roaming', 'Arkas', 'arkas.db'),
        os.path.join(system_drive, 'Users', '*', 'AppData', 'Local', 'Arkas', 'arkas.db'),
    ]
    for pattern in patterns:
        matches = glob.glob(pattern)
        if matches:
            return matches[0]

    return None

def get_arkas_key():
    """Mengambil kunci dekripsi database SQLCipher ARKAS."""
    return bytes([75, 51, 109, 100, 49, 107, 98, 117, 100, 82, 73, 83, 51, 110, 52, 121, 97, 110]).decode('utf-8')

def main():
    try:
        if len(sys.argv) < 4:
            print(json.dumps({
                "status": "error",
                "message": "Argumen tidak lengkap. Format: python dump_rkas_perubahan.py <mode: check|dump> <tahun> <sumber_dana_id> [manual_db_path]"
            }))
            sys.exit(1)

        mode = sys.argv[1].lower().strip('-')
        tahun = int(sys.argv[2])
        sumber_dana_id = int(sys.argv[3])
        manual_db_path = sys.argv[4] if len(sys.argv) > 4 and sys.argv[4] != "" else None

        db_path = find_arkas_db(manual_db_path)
        if not db_path:
            error_msg = "Database ARKAS (arkas.db) tidak ditemukan."
            if manual_db_path:
                error_msg += f" Jalur manual salah: {manual_db_path}"
            print(json.dumps({
                "status": "error",
                "message": error_msg + " Pastikan lokasi database sudah benar di menu Path Arkas."
            }))
            sys.exit(1)

        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("PRAGMA cipher_compatibility = 4;")
        cursor.execute(f"PRAGMA key = '{get_arkas_key()}';")

        # Test decrypt
        try:
            cursor.execute("SELECT count(*) FROM sqlite_master;")
        except sqlite3.DatabaseError:
            print(json.dumps({
                "status": "error",
                "message": "Gagal mendekripsi database ARKAS. Kunci enkripsi mungkin salah atau file corrupt."
            }))
            sys.exit(1)

        # Cari anggaran perubahan resmi (is_revisi >= 100, is_approve = 1, soft_delete = 0)
        query_anggaran = """
            SELECT a.id_anggaran, a.jumlah, a.tahun_anggaran, a.id_ref_sumber_dana, a.is_approve, a.is_revisi
            FROM anggaran a
            WHERE a.tahun_anggaran = ? 
              AND a.id_ref_sumber_dana = ? 
              AND a.is_revisi >= 100 
              AND a.soft_delete = 0
              AND a.is_approve = 1
            ORDER BY a.is_revisi DESC, a.create_date DESC
            LIMIT 1
        """
        cursor.execute(query_anggaran, (tahun, sumber_dana_id))
        anggaran_row = cursor.fetchone()

        if not anggaran_row:
            print(json.dumps({
                "status": "success",
                "exists": False,
                "message": f"Tidak ditemukan data RKAS Perubahan yang disetujui (is_revisi >= 100) di ARKAS untuk Tahun {tahun}."
            }))
            conn.close()
            sys.exit(0)

        id_anggaran, pagu_jumlah, tahun_anggaran, ref_sd_id, is_approve, is_revisi = anggaran_row

        # Ambil nama sumber dana
        cursor.execute("SELECT nama_sumber_dana FROM ref_sumber_dana WHERE id_ref_sumber_dana = ?;", (sumber_dana_id,))
        sd_row = cursor.fetchone()
        nama_sumber_dana = sd_row[0] if sd_row else f"Sumber Dana ID {sumber_dana_id}"

        if mode == 'check':
            # Hitung jumlah kegiatan, alokasi bulanan, dan total nilai
            query_stats = """
                SELECT 
                    count(DISTINCT r.id_rapbs),
                    count(p.id_rapbs_periode),
                    coalesce(sum(p.jumlah), 0)
                FROM rapbs r
                JOIN rapbs_periode p ON r.id_rapbs = p.id_rapbs AND p.soft_delete = 0
                WHERE r.id_anggaran = ? AND r.soft_delete = 0
            """
            cursor.execute(query_stats, (id_anggaran,))
            stats = cursor.fetchone()
            total_kegiatan = stats[0] if stats else 0
            total_alokasi = stats[1] if stats else 0
            total_alokasi_rp = stats[2] if stats else 0

            conn.close()
            print(json.dumps({
                "status": "success",
                "exists": True,
                "id_anggaran": id_anggaran,
                "is_revisi": is_revisi,
                "tahun": tahun,
                "sumber_dana_id": sumber_dana_id,
                "sumber_dana": nama_sumber_dana,
                "pagu": pagu_jumlah,
                "is_approve": is_approve,
                "total_kegiatan": total_kegiatan,
                "total_alokasi": total_alokasi,
                "total_alokasi_rp": total_alokasi_rp,
                "db_path": db_path
            }))
            sys.exit(0)

        elif mode == 'dump':
            # Query seluruh baris alokasi bulanan dengan join aman (menghindari duplikasi)
            query_dump = """
                SELECT 
                    p.id_rapbs_periode,
                    r.id_rapbs,
                    k.id_kode as kode_kegiatan,
                    k.uraian_kode as nama_kegiatan,
                    r.kode_rekening,
                    rec.rekening as nama_rekening,
                    r.uraian,
                    p.volume,
                    p.satuan,
                    p.harga_satuan,
                    p.jumlah,
                    ref_p.periode as bulan
                FROM rapbs_periode p
                JOIN rapbs r ON p.id_rapbs = r.id_rapbs
                LEFT JOIN (
                    SELECT DISTINCT id_ref_kode, id_kode, uraian_kode 
                    FROM ref_kode 
                    WHERE tahun = ? AND sumber_dana_id = ?
                ) k ON r.id_ref_kode = k.id_ref_kode
                LEFT JOIN (
                    SELECT DISTINCT kode_rekening, rekening
                    FROM ref_rekening
                    WHERE tahun = ?
                ) rec ON r.kode_rekening = rec.kode_rekening
                JOIN ref_periode ref_p ON p.id_periode = ref_p.id_periode
                WHERE r.id_anggaran = ? 
                  AND r.soft_delete = 0 
                  AND p.soft_delete = 0
                ORDER BY k.id_kode, r.kode_rekening, r.uraian, p.id_periode
            """
            cursor.execute(query_dump, (tahun, sumber_dana_id, tahun, id_anggaran))
            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()

            results = []
            for row in rows:
                results.append(dict(zip(columns, row)))

            conn.close()
            print(json.dumps({
                "status": "success",
                "id_anggaran": id_anggaran,
                "is_revisi": is_revisi,
                "tahun": tahun,
                "sumber_dana_id": sumber_dana_id,
                "sumber_dana": nama_sumber_dana,
                "pagu": pagu_jumlah,
                "count": len(results),
                "data": results,
                "db_path": db_path
            }))
            sys.exit(0)

        else:
            conn.close()
            print(json.dumps({
                "status": "error",
                "message": f"Mode '{mode}' tidak dikenal. Gunakan 'check' atau 'dump'."
            }))
            sys.exit(1)

    except Exception as e:
        error_msg = f"{str(e)}\n{traceback.format_exc()}"
        print(json.dumps({
            "status": "error",
            "message": f"Terjadi kesalahan internal query ARKAS: {error_msg}"
        }))
        sys.exit(1)


if __name__ == '__main__':
    main()
