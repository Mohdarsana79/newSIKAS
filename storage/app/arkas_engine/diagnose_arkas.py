import sqlite3
import json
import sys
import os
import glob
import datetime

MONTH_NAME_MAP = {
    1: 'Januari', 2: 'Februari', 3: 'Maret', 4: 'April',
    5: 'Mei', 6: 'Juni', 7: 'Juli', 8: 'Agustus',
    9: 'September', 10: 'Oktober', 11: 'November', 12: 'Desember'
}

def find_arkas_db(manual_path=None):
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
    return bytes([75, 51, 109, 100, 49, 107, 98, 117, 100, 82, 73, 83, 51, 110, 52, 121, 97, 110]).decode('utf-8')

def main():
    if len(sys.argv) < 3:
        print(json.dumps({
            "status": "error",
            "error_type": "INVALID_ARGUMENTS",
            "message": "Argumen tidak lengkap. Format: python diagnose_arkas.py <tahun> <sumber_dana_id> [manual_db_path]"
        }))
        sys.exit(1)

    try:
        tahun = int(sys.argv[1])
        sumber_dana_id = int(sys.argv[2])
    except ValueError:
        print(json.dumps({
            "status": "error",
            "error_type": "INVALID_ARGUMENTS",
            "message": "Tahun dan Sumber Dana ID harus berupa angka."
        }))
        sys.exit(1)

    manual_db_path = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] != "" else None
    db_path = find_arkas_db(manual_db_path)

    if not db_path:
        print(json.dumps({
            "status": "error",
            "error_type": "FILE_NOT_FOUND",
            "message": "Database ARKAS (arkas.db) tidak ditemukan di sistem. Pastikan ARKAS terinstall atau konfigurasi path diatur dengan benar."
        }))
        sys.exit(0)

    try:
        db_stat = os.stat(db_path)
        db_size_bytes = db_stat.st_size
        db_mtime = datetime.datetime.fromtimestamp(db_stat.st_mtime).strftime('%Y-%m-%d %H:%M:%S')
    except Exception:
        db_size_bytes = 0
        db_mtime = None

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("PRAGMA cipher_compatibility = 4;")
        cursor.execute(f"PRAGMA key = '{get_arkas_key()}';")

        cursor.execute("SELECT count(*) FROM sqlite_master;")
    except sqlite3.DatabaseError as e:
        print(json.dumps({
            "status": "error",
            "error_type": "DECRYPT_FAILED",
            "message": f"Gagal mendekripsi database ARKAS ({db_path}). Kunci SQLCipher tidak valid atau file rusak."
        }))
        sys.exit(0)
    except Exception as e:
        print(json.dumps({
            "status": "error",
            "error_type": "DATABASE_ERROR",
            "message": f"Terjadi kesalahan saat membuka database ARKAS: {str(e)}"
        }))
        sys.exit(0)

    # 1. Info Sekolah
    sekolah_info = {"npsn": None, "nama_sekolah": None}
    try:
        cursor.execute("SELECT npsn, nama_sekolah FROM sekolah LIMIT 1;")
        sek_row = cursor.fetchone()
        if sek_row:
            sekolah_info["npsn"] = sek_row[0]
            sekolah_info["nama_sekolah"] = sek_row[1]
    except Exception:
        pass

    # 2. RKAS Murni & Perubahan
    rkas_murni = {"exists": False, "pagu": 0.0, "is_approve": 0, "total_kegiatan": 0, "total_alokasi_rp": 0.0}
    rkas_perubahan = {"exists": False, "pagu": 0.0, "is_approve": 0, "total_kegiatan": 0, "total_alokasi_rp": 0.0}

    # Query RKAS Murni
    try:
        cursor.execute("""
            SELECT id_anggaran, jumlah, is_approve
            FROM anggaran
            WHERE tahun_anggaran = ? AND id_ref_sumber_dana = ? AND is_revisi = 0 AND soft_delete = 0
            ORDER BY create_date DESC LIMIT 1;
        """, (tahun, sumber_dana_id))
        row_murni = cursor.fetchone()
        if row_murni:
            id_ang_murni, pagu_murni, approve_murni = row_murni
            cursor.execute("""
                SELECT count(DISTINCT id_kegiatan), coalesce(sum(total), 0)
                FROM anggaran_kas
                WHERE id_anggaran = ? AND soft_delete = 0;
            """, (id_ang_murni,))
            keg_murni, alok_murni = cursor.fetchone()
            rkas_murni = {
                "exists": True,
                "id_anggaran": id_ang_murni,
                "pagu": float(pagu_murni or 0),
                "is_approve": int(approve_murni or 0),
                "total_kegiatan": int(keg_murni or 0),
                "total_alokasi_rp": float(alok_murni or 0)
            }
    except Exception:
        pass

    # Query RKAS Perubahan
    try:
        cursor.execute("""
            SELECT id_anggaran, jumlah, is_approve
            FROM anggaran
            WHERE tahun_anggaran = ? AND id_ref_sumber_dana = ? AND is_revisi = 1 AND soft_delete = 0
            ORDER BY create_date DESC LIMIT 1;
        """, (tahun, sumber_dana_id))
        row_perubahan = cursor.fetchone()
        if row_perubahan:
            id_ang_perubahan, pagu_perubahan, approve_perubahan = row_perubahan
            cursor.execute("""
                SELECT count(DISTINCT id_kegiatan), coalesce(sum(total), 0)
                FROM anggaran_kas
                WHERE id_anggaran = ? AND soft_delete = 0;
            """, (id_ang_perubahan,))
            keg_perubahan, alok_perubahan = cursor.fetchone()
            rkas_perubahan = {
                "exists": True,
                "id_anggaran": id_ang_perubahan,
                "pagu": float(pagu_perubahan or 0),
                "is_approve": int(approve_perubahan or 0),
                "total_kegiatan": int(keg_perubahan or 0),
                "total_alokasi_rp": float(alok_perubahan or 0)
            }
    except Exception:
        pass

    # 3. BKU Per-Bulan (1 s.d. 12)
    bku_months = []
    all_anggaran_ids = []
    try:
        cursor.execute("""
            SELECT id_anggaran FROM anggaran
            WHERE tahun_anggaran = ? AND id_ref_sumber_dana = ? AND soft_delete = 0;
        """, (tahun, sumber_dana_id))
        all_anggaran_ids = [r[0] for r in cursor.fetchall()]
    except Exception:
        pass

    closed_periodes = {}
    if all_anggaran_ids:
        placeholders = ",".join(["?"] * len(all_anggaran_ids))
        try:
            cursor.execute(f"""
                SELECT id_periode, tanggal_finish, coalesce(saldo_akhir_bank, 0), coalesce(saldo_akhir_tunai, 0)
                FROM aktivasi_bku
                WHERE id_anggaran IN ({placeholders})
                  AND soft_delete = 0
                  AND tanggal_finish IS NOT NULL;
            """, all_anggaran_ids)
            for r in cursor.fetchall():
                closed_periodes[r[0]] = {
                    "tanggal_finish": r[1],
                    "saldo_akhir_bank": float(r[2] or 0),
                    "saldo_akhir_tunai": float(r[3] or 0)
                }
        except Exception:
            pass

    for m in range(1, 13):
        m_str = f"{m:02d}"
        date_pattern = f"{tahun}-{m_str}-%"
        m_data = {
            "bulan": m,
            "nama_bulan": MONTH_NAME_MAP.get(m, f"Bulan {m}"),
            "belanja_count": 0,
            "belanja_nominal": 0.0,
            "penerimaan_count": 0,
            "penerimaan_nominal": 0.0,
            "penarikan_count": 0,
            "penarikan_nominal": 0.0,
            "setor_count": 0,
            "setor_nominal": 0.0,
            "bunga_nominal": 0.0,
            "pajak_bunga_nominal": 0.0,
            "is_closed": False,
            "tanggal_finish": None,
            "saldo_akhir_bank": 0.0,
            "saldo_akhir_tunai": 0.0
        }

        # Check closed status (periode 81 = Jan ... 92 = Des)
        periode_key = 80 + m
        if periode_key in closed_periodes:
            m_data["is_closed"] = True
            m_data["tanggal_finish"] = closed_periodes[periode_key]["tanggal_finish"]
            m_data["saldo_akhir_bank"] = closed_periodes[periode_key]["saldo_akhir_bank"]
            m_data["saldo_akhir_tunai"] = closed_periodes[periode_key]["saldo_akhir_tunai"]

        if all_anggaran_ids:
            placeholders = ",".join(["?"] * len(all_anggaran_ids))
            try:
                # Belanja (id_ref_bku in 4, 15)
                cursor.execute(f"""
                    SELECT count(DISTINCT id_kas_nota), coalesce(sum(saldo), 0)
                    FROM kas_umum
                    WHERE id_anggaran IN ({placeholders})
                      AND id_ref_bku IN (4, 15)
                      AND soft_delete = 0
                      AND tanggal_transaksi LIKE ?;
                """, all_anggaran_ids + [date_pattern])
                b_cnt, b_nom = cursor.fetchone()
                m_data["belanja_count"] = int(b_cnt or 0)
                m_data["belanja_nominal"] = float(b_nom or 0)

                # Penerimaan (2)
                cursor.execute(f"""
                    SELECT count(*), coalesce(sum(saldo), 0)
                    FROM kas_umum
                    WHERE id_anggaran IN ({placeholders})
                      AND id_ref_bku = 2
                      AND soft_delete = 0
                      AND tanggal_transaksi LIKE ?;
                """, all_anggaran_ids + [date_pattern])
                p_cnt, p_nom = cursor.fetchone()
                m_data["penerimaan_count"] = int(p_cnt or 0)
                m_data["penerimaan_nominal"] = float(p_nom or 0)

                # Penarikan (3)
                cursor.execute(f"""
                    SELECT count(*), coalesce(sum(saldo), 0)
                    FROM kas_umum
                    WHERE id_anggaran IN ({placeholders})
                      AND id_ref_bku = 3
                      AND soft_delete = 0
                      AND tanggal_transaksi LIKE ?;
                """, all_anggaran_ids + [date_pattern])
                t_cnt, t_nom = cursor.fetchone()
                m_data["penarikan_count"] = int(t_cnt or 0)
                m_data["penarikan_nominal"] = float(t_nom or 0)

                # Setor (5)
                cursor.execute(f"""
                    SELECT count(*), coalesce(sum(saldo), 0)
                    FROM kas_umum
                    WHERE id_anggaran IN ({placeholders})
                      AND id_ref_bku = 5
                      AND soft_delete = 0
                      AND tanggal_transaksi LIKE ?;
                """, all_anggaran_ids + [date_pattern])
                s_cnt, s_nom = cursor.fetchone()
                m_data["setor_count"] = int(s_cnt or 0)
                m_data["setor_nominal"] = float(s_nom or 0)

                # Bunga & Pajak Bunga (6, 7)
                cursor.execute(f"""
                    SELECT 
                        coalesce(sum(CASE WHEN id_ref_bku = 6 THEN saldo ELSE 0 END), 0),
                        coalesce(sum(CASE WHEN id_ref_bku = 7 THEN saldo ELSE 0 END), 0)
                    FROM kas_umum
                    WHERE id_anggaran IN ({placeholders})
                      AND id_ref_bku IN (6, 7)
                      AND soft_delete = 0
                      AND tanggal_transaksi LIKE ?;
                """, all_anggaran_ids + [date_pattern])
                bunga_nom, pbunga_nom = cursor.fetchone()
                m_data["bunga_nominal"] = float(bunga_nom or 0)
                m_data["pajak_bunga_nominal"] = float(pbunga_nom or 0)
            except Exception:
                pass

        bku_months.append(m_data)

    # 4. Ref Barang count
    ref_barang_total = 0
    try:
        cursor.execute("SELECT count(*) FROM ref_acuan_barang WHERE tahun = ?;", (tahun,))
        ref_barang_total = cursor.fetchone()[0]
    except Exception:
        try:
            cursor.execute("SELECT count(*) FROM ref_acuan_barang;")
            ref_barang_total = cursor.fetchone()[0]
        except Exception:
            pass

    conn.close()

    print(json.dumps({
        "status": "success",
        "connection": {
            "is_connected": True,
            "db_path": db_path.replace("\\", "/"),
            "db_size_bytes": db_size_bytes,
            "last_modified": db_mtime,
            "sekolah": sekolah_info
        },
        "tahun": tahun,
        "sumber_dana_id": sumber_dana_id,
        "rkas": {
            "murni": rkas_murni,
            "perubahan": rkas_perubahan
        },
        "bku_monthly": bku_months,
        "ref_barang_total": ref_barang_total
    }))

if __name__ == '__main__':
    main()
