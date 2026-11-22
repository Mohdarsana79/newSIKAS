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

    appdata = os.environ.get('APPDATA', '')
    if appdata:
        path = os.path.join(appdata, 'Arkas', 'arkas.db')
        if os.path.exists(path):
            return path

    userprofile = os.environ.get('USERPROFILE', '')
    if userprofile:
        path = os.path.join(userprofile, 'AppData', 'Roaming', 'Arkas', 'arkas.db')
        if os.path.exists(path):
            return path

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


def clean_str(val):
    if val is None:
        return ''
    return str(val).strip()


def fetch_anggaran_row(cursor, tahun, sumber_dana_id):
    queries = [
        """
            SELECT a.id_anggaran, a.jumlah, a.tahun_anggaran, a.id_ref_sumber_dana,
                   a.is_approve, COALESCE(a.is_revisi, 0), a.id_penjab
            FROM anggaran a
            WHERE a.tahun_anggaran = ?
              AND a.id_ref_sumber_dana = ?
              AND COALESCE(a.is_revisi, 0) < 100
              AND a.soft_delete = 0
              AND a.is_approve = 1
            ORDER BY COALESCE(a.is_revisi, 0) DESC, a.create_date DESC
            LIMIT 1
        """,
        """
            SELECT a.id_anggaran, a.jumlah, a.tahun_anggaran, a.id_ref_sumber_dana,
                   a.is_approve, COALESCE(a.is_revisi, 0), a.id_penjab
            FROM anggaran a
            WHERE a.tahun_anggaran = ?
              AND a.id_ref_sumber_dana = ?
              AND COALESCE(a.is_revisi, 0) < 100
              AND a.soft_delete = 0
            ORDER BY COALESCE(a.is_revisi, 0) DESC, a.create_date DESC
            LIMIT 1
        """,
        """
            SELECT a.id_anggaran, a.jumlah, a.tahun_anggaran, a.id_ref_sumber_dana,
                   a.is_approve, COALESCE(a.is_revisi, 0), a.id_penjab
            FROM anggaran a
            WHERE a.tahun_anggaran = ?
              AND a.id_ref_sumber_dana = ?
              AND a.soft_delete = 0
            ORDER BY a.is_approve DESC, COALESCE(a.is_revisi, 0) DESC, a.create_date DESC
            LIMIT 1
        """,
    ]

    for query in queries:
        cursor.execute(query, (tahun, sumber_dana_id))
        row = cursor.fetchone()
        if row:
            return row

    return None


def fetch_penanggung_jawab(cursor, id_penjab, tahun):
    penjab_row = None

    if id_penjab:
        cursor.execute(
            """
                SELECT ks, nip_ks, bendahara, nip_bendahara, komite
                FROM sekolah_penjab
                WHERE id_penjab = ? AND soft_delete = 0
                LIMIT 1
            """,
            (id_penjab,),
        )
        penjab_row = cursor.fetchone()

    if not penjab_row:
        cursor.execute(
            """
                SELECT ks, nip_ks, bendahara, nip_bendahara, komite
                FROM sekolah_penjab
                WHERE tahun = ? AND soft_delete = 0
                ORDER BY last_update DESC, create_date DESC
                LIMIT 1
            """,
            (tahun,),
        )
        penjab_row = cursor.fetchone()

    kepala_sekolah = clean_str(penjab_row[0]) if penjab_row else ''
    nip_kepala_sekolah = clean_str(penjab_row[1]) if penjab_row else ''
    bendahara = clean_str(penjab_row[2]) if penjab_row else ''
    nip_bendahara = clean_str(penjab_row[3]) if penjab_row else ''
    komite = clean_str(penjab_row[4]) if penjab_row else ''

    if not kepala_sekolah or not nip_kepala_sekolah:
        cursor.execute(
            """
                SELECT kepsek, nip_kepsek
                FROM mst_sekolah
                WHERE soft_delete = 0
                ORDER BY last_update DESC
                LIMIT 1
            """
        )
        sekolah_row = cursor.fetchone()
        if sekolah_row:
            if not kepala_sekolah:
                kepala_sekolah = clean_str(sekolah_row[0])
            if not nip_kepala_sekolah:
                nip_kepala_sekolah = clean_str(sekolah_row[1])

    return {
        "kepala_sekolah": kepala_sekolah,
        "nip_kepala_sekolah": nip_kepala_sekolah,
        "bendahara": bendahara,
        "nip_bendahara": nip_bendahara,
        "komite": komite,
    }


def main():
    try:
        if len(sys.argv) < 3:
            print(json.dumps({
                "status": "error",
                "message": "Argumen tidak lengkap. Format: python check_anggaran.py <tahun> <sumber_dana_id> [manual_db_path]"
            }))
            sys.exit(1)

        tahun = int(sys.argv[1])
        sumber_dana_id = int(sys.argv[2])
        manual_db_path = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] != "" else None

        db_path = find_arkas_db(manual_db_path)
        if not db_path:
            error_msg = "Database ARKAS (arkas.db) tidak ditemukan."
            if manual_db_path:
                error_msg += f" Jalur manual salah: {manual_db_path}"
            print(json.dumps({
                "status": "error",
                "error_type": "DB_NOT_FOUND",
                "message": error_msg + " Pastikan lokasi database sudah benar di menu Path Arkas."
            }))
            sys.exit(1)

        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("PRAGMA cipher_compatibility = 4;")
        cursor.execute(f"PRAGMA key = '{get_arkas_key()}';")

        try:
            cursor.execute("SELECT count(*) FROM sqlite_master;")
        except sqlite3.DatabaseError:
            conn.close()
            print(json.dumps({
                "status": "error",
                "error_type": "DECRYPT_FAILED",
                "message": "Gagal mendekripsi database ARKAS. Kunci enkripsi mungkin salah atau file corrupt."
            }))
            sys.exit(1)

        cursor.execute(
            "SELECT nama_sumber_dana FROM ref_sumber_dana WHERE id_ref_sumber_dana = ?;",
            (sumber_dana_id,),
        )
        sd_row = cursor.fetchone()
        nama_sumber_dana = clean_str(sd_row[0]) if sd_row and sd_row[0] else f"Sumber Dana ID {sumber_dana_id}"

        cursor.execute(
            """
                SELECT DISTINCT tahun_anggaran
                FROM anggaran
                WHERE id_ref_sumber_dana = ?
                  AND soft_delete = 0
                  AND tahun_anggaran IS NOT NULL
                ORDER BY tahun_anggaran DESC
            """,
            (sumber_dana_id,),
        )
        available_years = [int(row[0]) for row in cursor.fetchall() if row[0] is not None]

        anggaran_row = fetch_anggaran_row(cursor, tahun, sumber_dana_id)
        if not anggaran_row:
            conn.close()
            print(json.dumps({
                "status": "success",
                "exists": False,
                "tahun": tahun,
                "sumber_dana_id": sumber_dana_id,
                "sumber_dana": nama_sumber_dana,
                "available_years": available_years,
                "message": f"Tidak ditemukan data anggaran {nama_sumber_dana} di ARKAS untuk Tahun {tahun}."
            }))
            sys.exit(0)

        id_anggaran, pagu_jumlah, tahun_anggaran, ref_sd_id, is_approve, is_revisi, id_penjab = anggaran_row
        penanggung_jawab = fetch_penanggung_jawab(cursor, id_penjab, tahun)

        conn.close()
        print(json.dumps({
            "status": "success",
            "exists": True,
            "id_anggaran": id_anggaran,
            "tahun": int(tahun_anggaran),
            "sumber_dana_id": int(ref_sd_id),
            "sumber_dana": nama_sumber_dana,
            "pagu": float(pagu_jumlah or 0),
            "is_approve": int(is_approve or 0),
            "is_revisi": int(is_revisi or 0),
            "penanggung_jawab": penanggung_jawab,
            "available_years": available_years,
            "db_path": db_path
        }))
        sys.exit(0)

    except Exception as e:
        error_msg = f"{str(e)}\n{traceback.format_exc()}"
        print(json.dumps({
            "status": "error",
            "message": f"Terjadi kesalahan internal query ARKAS: {error_msg}"
        }))
        sys.exit(1)


if __name__ == '__main__':
    main()
