import sqlite3
import json
import sys
import os
import glob
import traceback

BOSP_SUMBER_DANA_IDS = (1, 12, 33, 35)


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


def detect_school_bentuk_pendidikan_id(cursor):
    """Mendeteksi bentuk_pendidikan_id sekolah aktif dari tabel mst_sekolah."""
    try:
        cursor.execute(
            """
            SELECT bentuk_pendidikan_id
            FROM mst_sekolah
            WHERE soft_delete = 0 AND bentuk_pendidikan_id IS NOT NULL
            ORDER BY last_update DESC
            LIMIT 1
            """
        )
        row = cursor.fetchone()
        if row and row[0] is not None:
            return int(row[0])
    except sqlite3.DatabaseError:
        return None
    return None


def query_ref_kode_rows(cursor, tahun, bentuk_pendidikan_id):
    """
    Mengambil baris ref_kode terfilter jenjang (bentuk_pendidikan_id) dan sumber dana BOSP,
    dengan urutan prioritas baris aktif (expired_date IS NULL) lalu BOS Reguler (sumber_dana_id = 1).
    """
    order_clause = """
        ORDER BY
            id_kode ASC,
            CASE WHEN expired_date IS NULL OR TRIM(CAST(expired_date AS TEXT)) = '' THEN 0 ELSE 1 END ASC,
            CASE WHEN sumber_dana_id = 1 THEN 0 ELSE 1 END ASC,
            last_update DESC
    """
    sd_placeholders = ",".join(["?"] * len(BOSP_SUMBER_DANA_IDS))

    active_filter = "AND (expired_date IS NULL OR TRIM(CAST(expired_date AS TEXT)) = '')"

    attempts = []
    if bentuk_pendidikan_id is not None:
        attempts.append((
            f"SELECT id_kode, uraian_kode, sumber_dana_id FROM ref_kode WHERE tahun = ? AND bentuk_pendidikan_id = ? AND sumber_dana_id IN ({sd_placeholders}) {active_filter} {order_clause}",
            (tahun, bentuk_pendidikan_id, *BOSP_SUMBER_DANA_IDS),
        ))
        attempts.append((
            f"SELECT id_kode, uraian_kode, sumber_dana_id FROM ref_kode WHERE tahun = ? AND bentuk_pendidikan_id = ? {active_filter} {order_clause}",
            (tahun, bentuk_pendidikan_id),
        ))

    attempts.append((
        f"SELECT id_kode, uraian_kode, sumber_dana_id FROM ref_kode WHERE tahun = ? AND sumber_dana_id IN ({sd_placeholders}) {active_filter} {order_clause}",
        (tahun, *BOSP_SUMBER_DANA_IDS),
    ))
    attempts.append((
        f"SELECT id_kode, uraian_kode, sumber_dana_id FROM ref_kode WHERE tahun = ? {active_filter} {order_clause}",
        (tahun,),
    ))
    # Fallback terakhir hanya jika seluruh baris pada tahun tsb berstatus expired
    if bentuk_pendidikan_id is not None:
        attempts.append((
            f"SELECT id_kode, uraian_kode, sumber_dana_id FROM ref_kode WHERE tahun = ? AND bentuk_pendidikan_id = ? {order_clause}",
            (tahun, bentuk_pendidikan_id),
        ))
    attempts.append((
        f"SELECT id_kode, uraian_kode, sumber_dana_id FROM ref_kode WHERE tahun = ? {order_clause}",
        (tahun,),
    ))

    for sql, params in attempts:
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        if rows:
            return rows

    return []


def main():
    try:
        if len(sys.argv) < 3:
            print(json.dumps({"error": "Argumen tidak lengkap (butuh tipe dan tahun)"}))
            sys.exit(1)

        tipe = sys.argv[1].strip().lower()
        tahun = sys.argv[2].strip()
        manual_db_path = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] != "" else None

        db_path = find_arkas_db(manual_db_path)
        if not db_path:
            error_msg = "Database ARKAS tidak ditemukan."
            if manual_db_path:
                error_msg += f" Jalur manual salah: {manual_db_path}"

            print(json.dumps({
                "error": error_msg + " Pastikan lokasi database sudah benar di menu Path Arkas."
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
            print(json.dumps({"error": "Gagal mendekripsi database ARKAS. Kunci mungkin salah atau file corrupt."}))
            sys.exit(1)

        if tipe in ('years', '__years__'):
            year_set = set()
            for sql in (
                "SELECT DISTINCT tahun FROM ref_kode WHERE tahun IS NOT NULL",
                "SELECT DISTINCT tahun FROM ref_rekening WHERE tahun IS NOT NULL",
                "SELECT DISTINCT tahun_ajaran_id FROM ptk WHERE tahun_ajaran_id IS NOT NULL",
            ):
                try:
                    cursor.execute(sql)
                    for row in cursor.fetchall():
                        if row[0] is not None:
                            year_set.add(int(row[0]))
                except sqlite3.DatabaseError:
                    continue

            years = [str(y) for y in sorted(year_set, reverse=True)]
            conn.close()
            print(json.dumps({"status": "success", "years": years, "db_path": db_path}))
            return

        results = []
        meta = {}

        if tipe == 'kegiatan':
            bp_id = detect_school_bentuk_pendidikan_id(cursor)
            meta["bentuk_pendidikan_id"] = bp_id
            rows = query_ref_kode_rows(cursor, tahun, bp_id)

            # Simpan entri PERTAMA per id_kode untuk uraian, sambil kumpulkan sumber_dana_id (Reguler=1/33 vs Kinerja=12/35)
            all_codes = {}
            code_sources = {}
            for id_kode, uraian_kode, sd_id in rows:
                if id_kode not in all_codes:
                    all_codes[id_kode] = (uraian_kode or '').strip()
                if id_kode not in code_sources:
                    code_sources[id_kode] = set()
                if sd_id in (12, 35):
                    code_sources[id_kode].add('kinerja')
                elif sd_id in (1, 33):
                    code_sources[id_kode].add('reguler')

            for id_kode, uraian in all_codes.items():
                parts = id_kode.strip('.').split('.')
                if len(parts) >= 3:
                    program_kode = parts[0] + '.'
                    sub_program_kode = parts[0] + '.' + parts[1] + '.'
                    srcs = code_sources.get(id_kode, set())
                    if 'reguler' in srcs and 'kinerja' in srcs:
                        sumber_dana = 'semua'
                    elif 'kinerja' in srcs:
                        sumber_dana = 'kinerja'
                    else:
                        sumber_dana = 'reguler'

                    results.append({
                        "id_kode": id_kode,
                        "program": all_codes.get(program_kode, ''),
                        "sub_program": all_codes.get(sub_program_kode, ''),
                        "uraian_kode": uraian,
                        "sumber_dana": sumber_dana
                    })
        elif tipe == 'rekening':
            query = """
                SELECT DISTINCT kode_rekening, rekening, is_ppn, is_pph21, is_pph22, is_pph23, is_pph4
                FROM ref_rekening
                WHERE tahun = ?
                  AND (expired_date IS NULL OR TRIM(CAST(expired_date AS TEXT)) = '')
                ORDER BY kode_rekening
            """
            cursor.execute(query, (tahun,))
            for row in cursor.fetchall():
                kode = row[0]
                parts = kode.strip('.').split('.')
                if len(parts) < 6:
                    continue
                pajak_list = []
                if row[2] == 1:
                    pajak_list.append("PPN")
                if row[3] == 1:
                    pajak_list.append("PPh 21")
                if row[4] == 1:
                    pajak_list.append("PPh 22")
                if row[5] == 1:
                    pajak_list.append("PPh 23")
                if row[6] == 1:
                    pajak_list.append("PPh 4(2)")
                results.append({
                    "kode_rekening": kode,
                    "rekening": (row[1] or '').strip(),
                    "pajak": ", ".join(pajak_list) if pajak_list else "-",
                    "is_ppn": True if row[2] == 1 else False,
                    "is_pph21": True if row[3] == 1 else False,
                    "is_pph22": True if row[4] == 1 else False,
                    "is_pph23": True if row[5] == 1 else False,
                    "is_pph4": True if row[6] == 1 else False
                })
        elif tipe == 'ptk':
            base_select = """
                SELECT
                    ptk_id,
                    tahun_ajaran_id,
                    nuptk,
                    nama,
                    jenis_kelamin,
                    jenis_ptk_arkas,
                    masa_kerja_tahun,
                    masa_kerja_bulan,
                    pernah_serfikasi,
                    soft_delete
                FROM ptk
            """
            if tahun.upper() == 'ALL':
                cursor.execute(base_select + " ORDER BY tahun_ajaran_id DESC, nama ASC")
            else:
                cursor.execute(base_select + " WHERE tahun_ajaran_id = ? ORDER BY nama ASC", (tahun,))

            for row in cursor.fetchall():
                nuptk_val = (str(row[2]).strip() if row[2] is not None else '')
                results.append({
                    "ptk_id": str(row[0]).strip() if row[0] is not None else '',
                    "tahun": int(row[1]) if row[1] is not None else 0,
                    "nuptk": nuptk_val if nuptk_val != '' else None,
                    "nama": (str(row[3]).strip() if row[3] is not None else ''),
                    "jenis_kelamin": (str(row[4]).strip() if row[4] is not None else None),
                    "jenis_ptk_arkas": int(row[5]) if row[5] is not None else 10,
                    "masa_kerja_tahun": int(row[6]) if row[6] is not None else 0,
                    "masa_kerja_bulan": int(row[7]) if row[7] is not None else 0,
                    "pernah_sertifikasi": bool(int(row[8]) == 1) if row[8] is not None else False,
                    "is_active": bool(int(row[9]) == 0) if row[9] is not None else True,
                })
        elif tipe == 'satuan':
            cursor.execute(
                """
                SELECT ref_satuan_id, satuan, unit, expired_date
                FROM ref_satuan
                ORDER BY satuan ASC
                """
            )
            for row in cursor.fetchall():
                exp = str(row[3]).strip() if row[3] is not None else ''
                results.append({
                    "ref_satuan_id": str(row[0]).strip() if row[0] is not None else '',
                    "satuan": str(row[1]).strip() if row[1] is not None else '',
                    "unit": str(row[2]).strip() if row[2] is not None else '',
                    "is_active": exp == '',
                })
        else:
            print(json.dumps({"error": "Tipe referensi tidak valid"}))
            sys.exit(1)

        conn.close()
        payload = {"status": "success", "data": results, "db_path": db_path}
        payload.update(meta)
        print(json.dumps(payload))

    except Exception as e:
        error_msg = f"{str(e)}\n{traceback.format_exc()}"
        print(json.dumps({"error": f"Terjadi kesalahan internal: {error_msg}"}))
        sys.exit(1)


if __name__ == "__main__":
    main()
