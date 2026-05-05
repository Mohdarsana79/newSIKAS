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
        # Bersihkan tanda petik dan spasi liar
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

def main():
    try:
        if len(sys.argv) < 3:
            print(json.dumps({"error": "Argumen tidak lengkap (butuh tipe dan tahun)"}))
            sys.exit(1)

        tipe = sys.argv[1]
        tahun = sys.argv[2]
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
        cursor.execute("PRAGMA key = 'K3md1kbudRIS3n4yan';")

        # Test decrypt
        try:
            cursor.execute("SELECT count(*) FROM sqlite_master;")
        except sqlite3.DatabaseError:
            print(json.dumps({"error": "Gagal mendekripsi database ARKAS. Kunci mungkin salah atau file corrupt."}))
            sys.exit(1)

        results = []
        if tipe == 'kegiatan':
            query = """
                SELECT DISTINCT id_kode, uraian_kode 
                FROM ref_kode 
                WHERE tahun = ?
                ORDER BY id_kode
            """
            cursor.execute(query, (tahun,))
            all_codes = {}
            for row in cursor.fetchall():
                all_codes[row[0]] = row[1]
            for id_kode, uraian in all_codes.items():
                parts = id_kode.strip('.').split('.')
                if len(parts) >= 3:
                    program_kode = parts[0] + '.'
                    sub_program_kode = parts[0] + '.' + parts[1] + '.'
                    results.append({
                        "id_kode": id_kode,
                        "program": all_codes.get(program_kode, ''),
                        "sub_program": all_codes.get(sub_program_kode, ''),
                        "uraian_kode": uraian
                    })
        elif tipe == 'rekening':
            query = """
                SELECT DISTINCT kode_rekening, rekening, is_ppn, is_pph21, is_pph22, is_pph23, is_pph4
                FROM ref_rekening 
                WHERE tahun = ?
                ORDER BY kode_rekening
            """
            cursor.execute(query, (tahun,))
            for row in cursor.fetchall():
                kode = row[0]
                parts = kode.strip('.').split('.')
                if len(parts) < 6: continue
                pajak_list = []
                if row[2] == 1: pajak_list.append("PPN")
                if row[3] == 1: pajak_list.append("PPh 21")
                if row[4] == 1: pajak_list.append("PPh 22")
                if row[5] == 1: pajak_list.append("PPh 23")
                if row[6] == 1: pajak_list.append("PPh 4(2)")
                results.append({
                    "kode_rekening": kode,
                    "rekening": row[1],
                    "pajak": ", ".join(pajak_list) if pajak_list else "-",
                    "is_ppn": True if row[2] == 1 else False,
                    "is_pph21": True if row[3] == 1 else False,
                    "is_pph22": True if row[4] == 1 else False,
                    "is_pph23": True if row[5] == 1 else False,
                    "is_pph4": True if row[6] == 1 else False
                })
        else:
            print(json.dumps({"error": "Tipe referensi tidak valid"}))
            sys.exit(1)

        conn.close()
        print(json.dumps({"status": "success", "data": results, "db_path": db_path}))

    except Exception as e:
        error_msg = f"{str(e)}\n{traceback.format_exc()}"
        print(json.dumps({"error": f"Terjadi kesalahan internal: {error_msg}"}))
        sys.exit(1)

if __name__ == "__main__":
    main()
