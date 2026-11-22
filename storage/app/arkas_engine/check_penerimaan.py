import sqlite3
import json
import sys
import os
import glob
import re
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


def normalize_date(val):
    text = clean_str(val)
    return text[:10] if len(text) >= 10 else text


MULTI_STAGE_SUMBER_DANA_IDS = (1, 12)
SILPA_SUMBER_DANA_IDS = (33, 35)
REF_BKU_TERIMA_DANA = 2
REF_BKU_SALDO_AWAL_REGULER = (8, 9)
REF_BKU_SALDO_AWAL_SILPA = (28, 29)


def detect_tahap(uraian, tanggal_str, sumber_dana_id):
    if sumber_dana_id not in MULTI_STAGE_SUMBER_DANA_IDS:
        return None

    match = re.search(r'tahap\s*([12])', uraian or '', re.IGNORECASE)
    if match:
        return int(match.group(1))

    if tanggal_str and len(tanggal_str) >= 7:
        try:
            bulan = int(tanggal_str[5:7])
            return 1 if bulan <= 6 else 2
        except ValueError:
            pass

    return 1


def fetch_saldo_awal(cursor, id_anggaran_list, tahun, sumber_dana_id):
    if not id_anggaran_list:
        return 0.0, None

    is_silpa = sumber_dana_id in SILPA_SUMBER_DANA_IDS
    ref_ids = REF_BKU_SALDO_AWAL_SILPA if is_silpa else REF_BKU_SALDO_AWAL_REGULER

    # Ambil saldo awal Januari dari id_anggaran terbaru yang memiliki catatan saldo awal
    for id_ang in id_anggaran_list:
        cursor.execute(
            """
                SELECT k.id_ref_bku, k.tanggal_transaksi, COALESCE(k.saldo, 0)
                FROM kas_umum k
                WHERE k.id_anggaran = ?
                  AND k.soft_delete = 0
                  AND k.id_ref_bku IN (?, ?)
                  AND k.tanggal_transaksi LIKE ?
                ORDER BY CASE WHEN k.tanggal_transaksi = ? THEN 0 ELSE 1 END,
                         k.tanggal_transaksi ASC,
                         k.last_update DESC
            """,
            (id_ang, ref_ids[0], ref_ids[1], f"{tahun}-01-%", f"{tahun}-01-01"),
        )
        rows = cursor.fetchall()
        if rows:
            seen_ref = {}
            for ref_bku, _tgl, saldo in rows:
                if ref_bku not in seen_ref:
                    seen_ref[ref_bku] = float(saldo or 0)
            total_saldo = round(sum(seen_ref.values()), 2)
            return (total_saldo, f"{tahun}-01-01") if total_saldo > 0 else (0.0, None)

    return 0.0, None


def main():
    try:
        if len(sys.argv) < 3:
            print(json.dumps({
                "status": "error",
                "message": "Argumen tidak lengkap. Format: python check_penerimaan.py <tahun> <sumber_dana_id> [manual_db_path]"
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
                SELECT id_anggaran
                FROM anggaran
                WHERE tahun_anggaran = ?
                  AND id_ref_sumber_dana = ?
                  AND soft_delete = 0
                ORDER BY COALESCE(is_aktif, 0) DESC,
                         COALESCE(is_approve, 0) DESC,
                         COALESCE(is_revisi, 0) DESC,
                         create_date DESC
            """,
            (tahun, sumber_dana_id),
        )
        id_anggaran_list = [row[0] for row in cursor.fetchall()]

        items = []
        seen_signatures = set()
        found_tahap_set = set()

        # 1. Baca penerimaan dana dari BKU (kas_umum id_ref_bku = 2)
        if id_anggaran_list:
            placeholders = ",".join(["?"] * len(id_anggaran_list))
            cursor.execute(
                f"""
                    SELECT k.id_kas_umum, k.tanggal_transaksi, k.uraian, COALESCE(k.saldo, 0)
                    FROM kas_umum k
                    WHERE k.id_anggaran IN ({placeholders})
                      AND k.id_ref_bku = ?
                      AND k.soft_delete = 0
                      AND k.tanggal_transaksi LIKE ?
                    ORDER BY k.tanggal_transaksi ASC, k.create_date ASC
                """,
                id_anggaran_list + [REF_BKU_TERIMA_DANA, f"{tahun}-%"],
            )
            for _id_ku, tgl, uraian, saldo in cursor.fetchall():
                nominal = round(float(saldo or 0), 2)
                if nominal <= 0:
                    continue
                tgl_clean = normalize_date(tgl)
                uraian_clean = clean_str(uraian) or f"Terima Dana {nama_sumber_dana} {tahun}"
                tahap = detect_tahap(uraian_clean, tgl_clean, sumber_dana_id)
                sig = (tahap, tgl_clean, nominal)
                if sig in seen_signatures:
                    continue
                seen_signatures.add(sig)
                if tahap is not None:
                    found_tahap_set.add(tahap)
                items.append({
                    "tahap": tahap,
                    "tanggal_terima": tgl_clean,
                    "jumlah_dana": nominal,
                    "uraian": uraian_clean,
                    "source": "bku",
                })

        # 2. Lengkapi dari tabel salur untuk tahap yang belum tercatat di kas_umum
        cursor.execute(
            """
                SELECT tahap, COALESCE(nilai_salur_bersih, 0), tanggal_disetujui
                FROM salur
                WHERE tahun = ?
                  AND id_ref_sumber_dana = ?
                  AND COALESCE(tidak_terima_dana, 0) = 0
                  AND COALESCE(nilai_salur_bersih, 0) > 0
                ORDER BY tahap ASC, gelombang ASC
            """,
            (tahun, sumber_dana_id),
        )
        salur_by_tahap = {}
        for tahap_raw, nilai_bersih, tgl_disetujui in cursor.fetchall():
            tahap_val = int(tahap_raw) if tahap_raw is not None and sumber_dana_id in MULTI_STAGE_SUMBER_DANA_IDS else None
            nominal = round(float(nilai_bersih or 0), 2)
            tgl_clean = normalize_date(tgl_disetujui)
            if tahap_val in found_tahap_set:
                continue
            if tahap_val is None and len(items) > 0:
                continue
            if tahap_val not in salur_by_tahap:
                salur_by_tahap[tahap_val] = {
                    "tahap": tahap_val,
                    "tanggal_terima": tgl_clean,
                    "jumlah_dana": nominal,
                    "uraian": (
                        f"Salur {nama_sumber_dana} Tahap {tahap_val} {tahun}"
                        if tahap_val is not None
                        else f"Salur {nama_sumber_dana} {tahun}"
                    ),
                    "source": "salur",
                }
            else:
                salur_by_tahap[tahap_val]["jumlah_dana"] = round(
                    salur_by_tahap[tahap_val]["jumlah_dana"] + nominal, 2
                )
                if tgl_clean and tgl_clean > (salur_by_tahap[tahap_val]["tanggal_terima"] or ""):
                    salur_by_tahap[tahap_val]["tanggal_terima"] = tgl_clean

        for salur_item in salur_by_tahap.values():
            items.append(salur_item)

        items.sort(key=lambda x: (x["tahap"] if x["tahap"] is not None else 99, x["tanggal_terima"] or ""))

        saldo_awal, tanggal_saldo_awal = fetch_saldo_awal(cursor, id_anggaran_list, tahun, sumber_dana_id)

        conn.close()

        if not items and saldo_awal <= 0:
            print(json.dumps({
                "status": "success",
                "exists": False,
                "tahun": tahun,
                "sumber_dana_id": sumber_dana_id,
                "sumber_dana": nama_sumber_dana,
                "saldo_awal": 0.0,
                "tanggal_saldo_awal": None,
                "items": [],
                "message": f"Tidak ditemukan data penerimaan dana {nama_sumber_dana} di ARKAS untuk Tahun {tahun}."
            }))
            sys.exit(0)

        print(json.dumps({
            "status": "success",
            "exists": True,
            "tahun": tahun,
            "sumber_dana_id": sumber_dana_id,
            "sumber_dana": nama_sumber_dana,
            "saldo_awal": saldo_awal,
            "tanggal_saldo_awal": tanggal_saldo_awal,
            "items": items,
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
